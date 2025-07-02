package analytics

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing/object"
	gitpkg "github.com/nyasuto/beaver/pkg/git"
)

// GitCommit represents a single Git commit
type GitCommit struct {
	Hash      string    `json:"hash"`
	Author    string    `json:"author"`
	Email     string    `json:"email"`
	Date      time.Time `json:"date"`
	Message   string    `json:"message"`
	Files     []string  `json:"files"`
	Additions int       `json:"additions"`
	Deletions int       `json:"deletions"`
}

// GitAnalyzer analyzes Git repository history
type GitAnalyzer struct {
	repoPath  string
	gitClient gitpkg.GitClient
}

// NewGitAnalyzer creates a new Git analyzer with default go-git client
func NewGitAnalyzer(repoPath string) (*GitAnalyzer, error) {
	gitClient, err := gitpkg.NewDefaultGitClient()
	if err != nil {
		return nil, fmt.Errorf("failed to create git client: %w", err)
	}

	return &GitAnalyzer{
		repoPath:  repoPath,
		gitClient: gitClient,
	}, nil
}

// NewGitAnalyzerWithClient creates a new Git analyzer with specific git client
func NewGitAnalyzerWithClient(repoPath string, gitClient gitpkg.GitClient) *GitAnalyzer {
	return &GitAnalyzer{
		repoPath:  repoPath,
		gitClient: gitClient,
	}
}

// AnalyzeCommitHistory analyzes Git commit history and extracts development events
func (ga *GitAnalyzer) AnalyzeCommitHistory(ctx context.Context, since *time.Time, maxCommits int) ([]TimelineEvent, error) {
	commits, err := ga.getCommitHistory(ctx, since, maxCommits)
	if err != nil {
		return nil, fmt.Errorf("failed to get commit history: %w", err)
	}

	var events []TimelineEvent
	for _, commit := range commits {
		event := TimelineEvent{
			ID:          fmt.Sprintf("commit-%s", commit.Hash[:8]),
			Type:        EventTypeCommit,
			Timestamp:   commit.Date,
			Title:       commit.Message,
			Description: fmt.Sprintf("Commit by %s: %s", commit.Author, commit.Message),
			Metadata: map[string]any{
				"commit_hash": commit.Hash,
				"author":      commit.Author,
				"email":       commit.Email,
				"additions":   commit.Additions,
				"deletions":   commit.Deletions,
				"files":       commit.Files,
			},
		}
		events = append(events, event)
	}

	return events, nil
}

// AnalyzeCommitPatterns analyzes patterns in commit messages and behavior
func (ga *GitAnalyzer) AnalyzeCommitPatterns(ctx context.Context, commits []GitCommit) (*CommitPatterns, error) {
	patterns := &CommitPatterns{
		TotalCommits:    len(commits),
		Authors:         make(map[string]int),
		MessagePatterns: make(map[string]int),
		TimePatterns:    make(map[string]int),
		FilePatterns:    make(map[string]int),
		CommitSizes:     []int{},
		ActivityByHour:  make(map[int]int),
		ActivityByDay:   make(map[time.Weekday]int),
	}

	for _, commit := range commits {
		// Author analysis
		patterns.Authors[commit.Author]++

		// Message pattern analysis
		patterns.analyzeCommitMessage(commit.Message)

		// Time pattern analysis
		patterns.ActivityByHour[commit.Date.Hour()]++
		patterns.ActivityByDay[commit.Date.Weekday()]++

		// Commit size analysis
		commitSize := commit.Additions + commit.Deletions
		patterns.CommitSizes = append(patterns.CommitSizes, commitSize)

		// File pattern analysis
		for _, file := range commit.Files {
			ext := extractFileExtension(file)
			if ext != "" {
				patterns.FilePatterns[ext]++
			}
		}
	}

	// Calculate derived metrics
	patterns.calculateMetrics()

	return patterns, nil
}

// CommitPatterns represents patterns found in commit history
type CommitPatterns struct {
	TotalCommits      int                  `json:"total_commits"`
	Authors           map[string]int       `json:"authors"`
	MessagePatterns   map[string]int       `json:"message_patterns"`
	TimePatterns      map[string]int       `json:"time_patterns"`
	FilePatterns      map[string]int       `json:"file_patterns"`
	CommitSizes       []int                `json:"commit_sizes"`
	ActivityByHour    map[int]int          `json:"activity_by_hour"`
	ActivityByDay     map[time.Weekday]int `json:"activity_by_day"`
	AverageCommitSize float64              `json:"average_commit_size"`
	MostActiveHour    int                  `json:"most_active_hour"`
	MostActiveDay     time.Weekday         `json:"most_active_day"`
	TopContributor    string               `json:"top_contributor"`
}

// analyzeCommitMessage analyzes commit message for patterns
func (cp *CommitPatterns) analyzeCommitMessage(message string) {
	message = strings.ToLower(message)

	// Common commit message patterns
	patterns := map[string][]string{
		"feature":  {"feat", "feature", "add", "implement"},
		"bugfix":   {"fix", "bug", "resolve", "correct"},
		"refactor": {"refactor", "cleanup", "reorganize", "restructure"},
		"docs":     {"doc", "docs", "documentation", "readme"},
		"test":     {"test", "testing", "spec"},
		"style":    {"style", "format", "lint"},
		"chore":    {"chore", "update", "bump", "dependency"},
	}

	for patternType, keywords := range patterns {
		for _, keyword := range keywords {
			if strings.Contains(message, keyword) {
				cp.MessagePatterns[patternType]++
				break
			}
		}
	}
}

// calculateMetrics calculates derived metrics from raw data
func (cp *CommitPatterns) calculateMetrics() {
	// Average commit size
	if len(cp.CommitSizes) > 0 {
		total := 0
		for _, size := range cp.CommitSizes {
			total += size
		}
		cp.AverageCommitSize = float64(total) / float64(len(cp.CommitSizes))
	}

	// Most active hour
	maxHourActivity := 0
	for hour, count := range cp.ActivityByHour {
		if count > maxHourActivity {
			maxHourActivity = count
			cp.MostActiveHour = hour
		}
	}

	// Most active day
	maxDayActivity := 0
	for day, count := range cp.ActivityByDay {
		if count > maxDayActivity {
			maxDayActivity = count
			cp.MostActiveDay = day
		}
	}

	// Top contributor
	maxContributions := 0
	for author, count := range cp.Authors {
		if count > maxContributions {
			maxContributions = count
			cp.TopContributor = author
		}
	}
}

// getCommitHistory retrieves Git commit history
func (ga *GitAnalyzer) getCommitHistory(ctx context.Context, since *time.Time, maxCommits int) ([]GitCommit, error) {
	// Try go-git object model first if client supports it
	if _, ok := ga.gitClient.(*gitpkg.GoGitClient); ok {
		return ga.getCommitHistoryWithGoGit(ctx, since, maxCommits)
	}

	// Fallback to command-line approach
	options := &gitpkg.CommitHistoryOptions{
		Since:      since,
		MaxCommits: maxCommits,
		Format:     "%H|%an|%ae|%ci|%s",
		NumStat:    true,
	}

	output, err := ga.gitClient.GetCommitHistory(ctx, ga.repoPath, options)
	if err != nil {
		return nil, fmt.Errorf("git log command failed: %w", err)
	}

	return ga.parseGitLog(string(output))
}

// getCommitHistoryWithGoGit retrieves commit history using go-git object model
func (ga *GitAnalyzer) getCommitHistoryWithGoGit(ctx context.Context, since *time.Time, maxCommits int) ([]GitCommit, error) {
	repo, err := git.PlainOpen(ga.repoPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open repository: %w", err)
	}

	head, err := repo.Head()
	if err != nil {
		return nil, fmt.Errorf("failed to get HEAD: %w", err)
	}

	logOptions := &git.LogOptions{
		From: head.Hash(),
	}
	if since != nil {
		logOptions.Since = since
	}

	commitIter, err := repo.Log(logOptions)
	if err != nil {
		return nil, fmt.Errorf("failed to get commit log: %w", err)
	}
	defer commitIter.Close()

	var commits []GitCommit
	count := 0

	err = commitIter.ForEach(func(commit *object.Commit) error {
		if maxCommits > 0 && count >= maxCommits {
			return fmt.Errorf("max commits reached") // Stop iteration
		}

		gitCommit := GitCommit{
			Hash:    commit.Hash.String(),
			Author:  commit.Author.Name,
			Email:   commit.Author.Email,
			Date:    commit.Author.When,
			Message: strings.TrimSpace(commit.Message),
			Files:   []string{},
		}

		// Get file statistics
		if count == 0 {
			// For the first commit, compare with empty tree
			gitCommit.Files, gitCommit.Additions, gitCommit.Deletions = ga.getCommitStats(commit, nil)
		} else {
			// For subsequent commits, compare with parent
			if commit.NumParents() > 0 {
				parent, err := commit.Parent(0)
				if err == nil {
					gitCommit.Files, gitCommit.Additions, gitCommit.Deletions = ga.getCommitStats(commit, parent)
				}
			}
		}

		commits = append(commits, gitCommit)
		count++
		return nil
	})

	if err != nil && err.Error() != "max commits reached" {
		return nil, fmt.Errorf("failed to iterate commits: %w", err)
	}

	return commits, nil
}

// getCommitStats calculates file changes, additions, and deletions for a commit
func (ga *GitAnalyzer) getCommitStats(commit, parent *object.Commit) ([]string, int, int) {
	var files []string
	var totalAdditions, totalDeletions int

	currentTree, err := commit.Tree()
	if err != nil {
		return files, totalAdditions, totalDeletions
	}

	var parentTree *object.Tree
	if parent != nil {
		parentTree, err = parent.Tree()
		if err != nil {
			parentTree = nil
		}
	}

	patch, err := currentTree.Patch(parentTree)
	if err != nil {
		return files, totalAdditions, totalDeletions
	}

	for _, filePatch := range patch.FilePatches() {
		from, to := filePatch.Files()

		var filename string
		if to != nil {
			filename = to.Path()
		} else if from != nil {
			filename = from.Path()
		}

		if filename != "" {
			files = append(files, filename)
		}

		// Count additions and deletions
		for _, chunk := range filePatch.Chunks() {
			switch chunk.Type() {
			case 1: // Addition
				totalAdditions += strings.Count(chunk.Content(), "\n")
			case 2: // Deletion
				totalDeletions += strings.Count(chunk.Content(), "\n")
			}
		}
	}

	return files, totalAdditions, totalDeletions
}

// parseGitLog parses git log output into GitCommit structs
func (ga *GitAnalyzer) parseGitLog(output string) ([]GitCommit, error) {
	var commits []GitCommit
	var currentCommit *GitCommit

	scanner := bufio.NewScanner(strings.NewReader(output))
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		if line == "" {
			continue
		}

		// Check if this is a commit header line
		if strings.Contains(line, "|") && len(strings.Split(line, "|")) == 5 {
			// Save previous commit if exists
			if currentCommit != nil {
				commits = append(commits, *currentCommit)
			}

			// Parse new commit header
			parts := strings.Split(line, "|")
			if len(parts) != 5 {
				continue
			}

			date, err := time.Parse("2006-01-02 15:04:05 -0700", parts[3])
			if err != nil {
				continue
			}

			currentCommit = &GitCommit{
				Hash:    parts[0],
				Author:  parts[1],
				Email:   parts[2],
				Date:    date,
				Message: parts[4],
				Files:   []string{},
			}
		} else if currentCommit != nil {
			// Parse file changes (numstat format)
			fields := strings.Fields(line)
			if len(fields) >= 3 {
				additions, err := strconv.Atoi(fields[0])
				if err != nil {
					additions = 0
				}
				deletions, err := strconv.Atoi(fields[1])
				if err != nil {
					deletions = 0
				}
				filename := fields[2]

				currentCommit.Additions += additions
				currentCommit.Deletions += deletions
				currentCommit.Files = append(currentCommit.Files, filename)
			}
		}
	}

	// Add the last commit
	if currentCommit != nil {
		commits = append(commits, *currentCommit)
	}

	return commits, nil
}

// GetRepositoryMetrics gets overall repository metrics
func (ga *GitAnalyzer) GetRepositoryMetrics(ctx context.Context) (*RepositoryMetrics, error) {
	metrics := &RepositoryMetrics{}

	// Get total commit count
	totalCommits, err := ga.getTotalCommitCount(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get total commit count: %w", err)
	}
	metrics.TotalCommits = totalCommits

	// Get contributor count
	contributors, err := ga.getContributorCount(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get contributor count: %w", err)
	}
	metrics.TotalContributors = contributors

	// Get repository age
	firstCommit, err := ga.getFirstCommitDate(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get first commit date: %w", err)
	}
	metrics.RepositoryAge = time.Since(firstCommit)

	// Get branch count
	branches, err := ga.getBranchCount(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get branch count: %w", err)
	}
	metrics.TotalBranches = branches

	return metrics, nil
}

// RepositoryMetrics represents overall repository metrics
type RepositoryMetrics struct {
	TotalCommits      int           `json:"total_commits"`
	TotalContributors int           `json:"total_contributors"`
	RepositoryAge     time.Duration `json:"repository_age"`
	TotalBranches     int           `json:"total_branches"`
}

// Helper methods for repository metrics

func (ga *GitAnalyzer) getTotalCommitCount(ctx context.Context) (int, error) {
	return ga.gitClient.GetCommitCount(ctx, ga.repoPath)
}

func (ga *GitAnalyzer) getContributorCount(ctx context.Context) (int, error) {
	return ga.gitClient.GetContributorCount(ctx, ga.repoPath)
}

func (ga *GitAnalyzer) getFirstCommitDate(ctx context.Context) (time.Time, error) {
	return ga.gitClient.GetFirstCommitDate(ctx, ga.repoPath)
}

func (ga *GitAnalyzer) getBranchCount(ctx context.Context) (int, error) {
	return ga.gitClient.GetBranchCount(ctx, ga.repoPath)
}

// extractFileExtension extracts file extension from a file path
func extractFileExtension(filename string) string {
	re := regexp.MustCompile(`\.([a-zA-Z0-9]+)$`)
	matches := re.FindStringSubmatch(filename)
	if len(matches) > 1 {
		return matches[1]
	}
	return ""
}

// MarshalJSON custom JSON marshaling for time.Duration
func (rm RepositoryMetrics) MarshalJSON() ([]byte, error) {
	type Alias RepositoryMetrics
	return json.Marshal(&struct {
		RepositoryAgeDays float64 `json:"repository_age_days"`
		Alias
	}{
		RepositoryAgeDays: rm.RepositoryAge.Hours() / 24,
		Alias:             (Alias)(rm),
	})
}

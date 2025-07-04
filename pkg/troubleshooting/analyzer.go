package troubleshooting

import (
	"context"
	"fmt"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/nyasuto/beaver/internal/models"
)

// Analyzer analyzes issues to extract troubleshooting patterns
type Analyzer struct{}

// NewAnalyzer creates a new troubleshooting analyzer
func NewAnalyzer() *Analyzer {
	return &Analyzer{}
}

// TroubleshootingGuide represents a simplified troubleshooting guide
type TroubleshootingGuide struct {
	ProjectName   string          `json:"project_name"`
	GeneratedAt   time.Time       `json:"generated_at"`
	TotalIssues   int             `json:"total_issues"`
	SolvedIssues  int             `json:"solved_issues"`
	ErrorPatterns []ErrorPattern  `json:"error_patterns"`
	Solutions     []Solution      `json:"solutions"`
	Statistics    GuideStatistics `json:"statistics"`
}

// ErrorPattern represents a pattern of errors with solutions
type ErrorPattern struct {
	ID            string         `json:"id"`
	Pattern       string         `json:"pattern"`
	Title         string         `json:"title"`
	Description   string         `json:"description"`
	Frequency     int            `json:"frequency"`
	Severity      Severity       `json:"severity"`
	Category      string         `json:"category"`
	Symptoms      []string       `json:"symptoms"`
	Causes        []string       `json:"causes"`
	Solutions     []string       `json:"solutions"`
	Prevention    []string       `json:"prevention"`
	RelatedIssues []int          `json:"related_issues"`
	LastSeen      time.Time      `json:"last_seen"`
	ResolveTime   *time.Duration `json:"resolve_time,omitempty"`
}

// Solution represents a documented solution to a problem
type Solution struct {
	ID            string         `json:"id"`
	Title         string         `json:"title"`
	Description   string         `json:"description"`
	Category      string         `json:"category"`
	Difficulty    Difficulty     `json:"difficulty"`
	Steps         []SolutionStep `json:"steps"`
	RequiredTools []string       `json:"required_tools"`
	TimeEstimate  time.Duration  `json:"time_estimate"`
	SuccessRate   float64        `json:"success_rate"`
	RelatedIssues []int          `json:"related_issues"`
	Tags          []string       `json:"tags"`
	CreatedAt     time.Time      `json:"created_at"`
}

// SolutionStep represents a step in a solution
type SolutionStep struct {
	Number      int    `json:"number"`
	Description string `json:"description"`
	Command     string `json:"command,omitempty"`
	Expected    string `json:"expected,omitempty"`
	Warning     string `json:"warning,omitempty"`
}

// GuideStatistics provides statistics about the guide
type GuideStatistics struct {
	TotalPatterns      int     `json:"total_patterns"`
	TotalSolutions     int     `json:"total_solutions"`
	AverageResolveTime float64 `json:"average_resolve_time_hours"`
	SuccessRate        float64 `json:"success_rate"`
	MostCommonCategory string  `json:"most_common_category"`
	CriticalPatterns   int     `json:"critical_patterns"`
}

// Enums for severity, difficulty, and priority
type Severity string

const (
	SeverityCritical Severity = "critical"
	SeverityHigh     Severity = "high"
	SeverityMedium   Severity = "medium"
	SeverityLow      Severity = "low"
)

func (s Severity) String() string {
	return string(s)
}

type Difficulty string

const (
	DifficultyEasy   Difficulty = "easy"
	DifficultyMedium Difficulty = "medium"
	DifficultyHard   Difficulty = "hard"
	DifficultyExpert Difficulty = "expert"
)

func (d Difficulty) String() string {
	return string(d)
}

type Priority string

const (
	PriorityCritical Priority = "critical"
	PriorityHigh     Priority = "high"
	PriorityMedium   Priority = "medium"
	PriorityLow      Priority = "low"
)

func (p Priority) String() string {
	return string(p)
}

// AnalyzeTroubleshooting performs simplified troubleshooting analysis on issues
func (a *Analyzer) AnalyzeTroubleshooting(ctx context.Context, issues []models.Issue, projectName string) (*TroubleshootingGuide, error) {
	if len(issues) == 0 {
		return &TroubleshootingGuide{
			ProjectName:   projectName,
			GeneratedAt:   time.Now(),
			TotalIssues:   0,
			SolvedIssues:  0,
			ErrorPatterns: []ErrorPattern{},
			Solutions:     []Solution{},
			Statistics:    GuideStatistics{},
		}, nil
	}

	// Analyze error patterns
	patterns := a.analyzeErrorPatterns(issues)

	// Extract solutions from closed issues
	solutions := a.extractSolutions(issues)

	// Count solved issues
	solvedIssues := 0
	for _, issue := range issues {
		if issue.State == "closed" {
			solvedIssues++
		}
	}

	// Calculate statistics
	stats := a.calculateStatistics(patterns, solutions, issues)

	guide := &TroubleshootingGuide{
		ProjectName:   projectName,
		GeneratedAt:   time.Now(),
		TotalIssues:   len(issues),
		SolvedIssues:  solvedIssues,
		ErrorPatterns: patterns,
		Solutions:     solutions,
		Statistics:    stats,
	}

	return guide, nil
}

// analyzeErrorPatterns identifies common error patterns in issues
func (a *Analyzer) analyzeErrorPatterns(issues []models.Issue) []ErrorPattern {
	patternMap := make(map[string]*ErrorPattern)

	// Define common error patterns to look for
	errorPatterns := []struct {
		pattern     string
		category    string
		title       string
		description string
		severity    Severity
	}{
		{"API.*error|HTTP.*error|connection.*error", "API", "API Connection Error", "Problems connecting to external APIs", SeverityHigh},
		{"authentication.*failed|auth.*error|unauthorized", "Authentication", "Authentication Failure", "User authentication problems", SeverityHigh},
		{"database.*error|SQL.*error|connection.*timeout", "Database", "Database Error", "Database connectivity or query issues", SeverityCritical},
		{"permission.*denied|access.*denied|forbidden", "Permissions", "Permission Error", "File or resource access permission issues", SeverityMedium},
		{"file.*not.*found|no.*such.*file", "File System", "File Not Found", "Missing files or incorrect paths", SeverityMedium},
		{"network.*error|timeout|connection.*refused", "Network", "Network Error", "Network connectivity problems", SeverityHigh},
		{"configuration.*error|config.*invalid", "Configuration", "Configuration Error", "Invalid or missing configuration", SeverityMedium},
		{"dependency.*error|import.*error|module.*not.*found", "Dependencies", "Dependency Error", "Missing or incompatible dependencies", SeverityMedium},
	}

	for _, issue := range issues {
		content := strings.ToLower(issue.Title + " " + issue.Body)

		for _, ep := range errorPatterns {
			matched, err := regexp.MatchString(ep.pattern, content)
			if err != nil {
				continue // Skip invalid patterns
			}
			if matched {
				patternID := fmt.Sprintf("pattern_%s", strings.ToLower(strings.ReplaceAll(ep.category, " ", "_")))

				if existing, exists := patternMap[patternID]; exists {
					existing.Frequency++
					existing.RelatedIssues = append(existing.RelatedIssues, issue.Number)
					if issue.UpdatedAt.After(existing.LastSeen) {
						existing.LastSeen = issue.UpdatedAt
					}
				} else {
					patternMap[patternID] = &ErrorPattern{
						ID:            patternID,
						Pattern:       ep.pattern,
						Title:         ep.title,
						Description:   ep.description,
						Frequency:     1,
						Severity:      ep.severity,
						Category:      ep.category,
						Symptoms:      []string{},
						Causes:        []string{},
						Solutions:     []string{},
						Prevention:    []string{},
						RelatedIssues: []int{issue.Number},
						LastSeen:      issue.UpdatedAt,
					}
				}
			}
		}
	}

	// Convert map to slice and sort by frequency
	var patterns []ErrorPattern
	for _, pattern := range patternMap {
		patterns = append(patterns, *pattern)
	}

	sort.Slice(patterns, func(i, j int) bool {
		return patterns[i].Frequency > patterns[j].Frequency
	})

	return patterns
}

// extractSolutions creates solutions from closed issues
func (a *Analyzer) extractSolutions(issues []models.Issue) []Solution {
	var solutions []Solution
	solutionID := 1

	for _, issue := range issues {
		if issue.State == "closed" && len(issue.Body) > 50 {
			solution := Solution{
				ID:            fmt.Sprintf("solution_%d", solutionID),
				Title:         a.extractSolutionTitle(issue),
				Description:   a.extractSolutionDescription(issue),
				Category:      a.categorizeIssue(issue),
				Difficulty:    a.assessDifficulty(issue),
				Steps:         a.extractSolutionSteps(issue),
				RequiredTools: a.extractRequiredTools(issue),
				TimeEstimate:  a.estimateTime(issue),
				SuccessRate:   a.calculateSuccessRate(issue),
				RelatedIssues: []int{issue.Number},
				Tags:          a.extractTags(issue),
				CreatedAt:     issue.CreatedAt,
			}

			solutions = append(solutions, solution)
			solutionID++
		}
	}

	return solutions
}

// calculateStatistics computes guide statistics
func (a *Analyzer) calculateStatistics(patterns []ErrorPattern, solutions []Solution, issues []models.Issue) GuideStatistics {
	var totalResolveTime time.Duration
	var resolvedCount int
	var criticalCount int
	categoryCount := make(map[string]int)

	for _, pattern := range patterns {
		if pattern.Severity == SeverityCritical {
			criticalCount++
		}
		categoryCount[pattern.Category]++
	}

	for _, issue := range issues {
		if issue.State == "closed" {
			resolveTime := issue.UpdatedAt.Sub(issue.CreatedAt)
			totalResolveTime += resolveTime
			resolvedCount++
		}
	}

	var averageResolveTime float64
	if resolvedCount > 0 {
		averageResolveTime = totalResolveTime.Hours() / float64(resolvedCount)
	}

	var successRate float64
	if len(issues) > 0 {
		successRate = float64(resolvedCount) / float64(len(issues))
	}

	var mostCommonCategory string
	maxCount := 0
	for category, count := range categoryCount {
		if count > maxCount {
			maxCount = count
			mostCommonCategory = category
		}
	}

	return GuideStatistics{
		TotalPatterns:      len(patterns),
		TotalSolutions:     len(solutions),
		AverageResolveTime: averageResolveTime,
		SuccessRate:        successRate,
		MostCommonCategory: mostCommonCategory,
		CriticalPatterns:   criticalCount,
	}
}

// Helper methods for solution extraction
func (a *Analyzer) extractSolutionTitle(issue models.Issue) string {
	return issue.Title
}

func (a *Analyzer) extractSolutionDescription(issue models.Issue) string {
	if len(issue.Body) > 200 {
		return issue.Body[:200] + "..."
	}
	return issue.Body
}

func (a *Analyzer) categorizeIssue(issue models.Issue) string {
	// Simple categorization based on labels
	for _, label := range issue.Labels {
		labelName := strings.ToLower(label.Name)
		if strings.Contains(labelName, "bug") {
			return "Bug Fix"
		}
		if strings.Contains(labelName, "feature") {
			return "Feature"
		}
		if strings.Contains(labelName, "docs") {
			return "Documentation"
		}
	}
	return "General"
}

func (a *Analyzer) assessDifficulty(issue models.Issue) Difficulty {
	// Simple difficulty assessment based on body length and labels
	if len(issue.Body) > 1000 {
		return DifficultyHard
	}
	for _, label := range issue.Labels {
		if strings.Contains(strings.ToLower(label.Name), "easy") {
			return DifficultyEasy
		}
		if strings.Contains(strings.ToLower(label.Name), "hard") {
			return DifficultyHard
		}
	}
	return DifficultyMedium
}

func (a *Analyzer) extractSolutionSteps(issue models.Issue) []SolutionStep {
	// Basic step extraction - look for numbered lists
	steps := []SolutionStep{}
	lines := strings.Split(issue.Body, "\n")
	stepNum := 1

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, fmt.Sprintf("%d.", stepNum)) || strings.HasPrefix(line, fmt.Sprintf("Step %d", stepNum)) {
			steps = append(steps, SolutionStep{
				Number:      stepNum,
				Description: line,
			})
			stepNum++
		}
	}

	// If no numbered steps found, create a simple step
	if len(steps) == 0 && len(issue.Body) > 0 {
		steps = append(steps, SolutionStep{
			Number:      1,
			Description: "Follow the solution described in the issue",
		})
	}

	return steps
}

func (a *Analyzer) extractRequiredTools(issue models.Issue) []string {
	tools := []string{}
	content := strings.ToLower(issue.Body)

	// Common tools to look for
	toolPatterns := []string{"npm", "yarn", "docker", "kubectl", "git", "make", "python", "go", "node"}

	for _, tool := range toolPatterns {
		if strings.Contains(content, tool) {
			tools = append(tools, tool)
		}
	}

	return tools
}

func (a *Analyzer) estimateTime(issue models.Issue) time.Duration {
	// Simple time estimation based on content length and labels
	baseTime := time.Hour

	for _, label := range issue.Labels {
		labelName := strings.ToLower(label.Name)
		if strings.Contains(labelName, "critical") {
			return time.Minute * 30
		}
		if strings.Contains(labelName, "easy") {
			return time.Minute * 15
		}
		if strings.Contains(labelName, "hard") {
			return time.Hour * 4
		}
	}

	// Estimate based on body length
	if len(issue.Body) > 1000 {
		return time.Hour * 2
	}

	return baseTime
}

func (a *Analyzer) calculateSuccessRate(issue models.Issue) float64 {
	// Simple success rate calculation
	if issue.State == "closed" {
		return 0.95 // Assume 95% success rate for closed issues
	}
	return 0.5 // 50% for open issues
}

func (a *Analyzer) extractTags(issue models.Issue) []string {
	var tags []string
	for _, label := range issue.Labels {
		tags = append(tags, label.Name)
	}
	return tags
}

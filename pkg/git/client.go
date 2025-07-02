package git

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/nyasuto/beaver/internal/errors"
)

// CmdGitClient implements GitClient using command-line git
type CmdGitClient struct {
	gitPath string
	timeout time.Duration
}

// NewCmdGitClient creates a new command-line Git client
func NewCmdGitClient() (GitClient, error) {
	gitPath, err := exec.LookPath("git")
	if err != nil {
		return nil, fmt.Errorf("git command not found: %w", err)
	}

	return &CmdGitClient{
		gitPath: gitPath,
		timeout: 30 * time.Second,
	}, nil
}

// Clone clones a repository to the specified directory
func (c *CmdGitClient) Clone(ctx context.Context, url, dir string, options *CloneOptions) error {
	slog.Info("Git clone starting", "url", sanitizeURL(url), "dir", dir)

	// Build git clone command with options
	args := []string{"clone"}

	if options != nil {
		if options.Depth > 0 {
			args = append(args, "--depth", fmt.Sprintf("%d", options.Depth))
		}
		if options.SingleBranch {
			args = append(args, "--single-branch")
		}
		if options.Branch != "" {
			args = append(args, "--branch", options.Branch)
		}
		if options.Bare {
			args = append(args, "--bare")
		}
	}

	args = append(args, url, dir)

	// Set timeout from options or default
	timeout := c.timeout
	if options != nil && options.Timeout > 0 {
		timeout = options.Timeout
	}

	ctxWithTimeout, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	cmd := exec.CommandContext(ctxWithTimeout, c.gitPath, args...) // #nosec G204 -- gitPath is validated at initialization

	// Set up environment for authentication
	cmd.Env = os.Environ()

	output, err := cmd.CombinedOutput()
	if err != nil {
		slog.Error("Git clone failed", "error", err, "output", string(output))
		return c.handleGitError("clone", err, string(output))
	}

	slog.Info("Git clone completed successfully")
	return nil
}

// Pull pulls the latest changes from the remote repository
func (c *CmdGitClient) Pull(ctx context.Context, dir string) error {
	slog.Info("Git pull starting", "dir", dir)

	ctxWithTimeout, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	cmd := exec.CommandContext(ctxWithTimeout, c.gitPath, "pull") // #nosec G204 -- gitPath is validated at initialization
	cmd.Dir = dir
	cmd.Env = os.Environ()

	output, err := cmd.CombinedOutput()
	if err != nil {
		slog.Error("Git pull failed", "error", err, "output", string(output))
		return c.handleGitError("pull", err, string(output))
	}

	slog.Info("Git pull completed successfully")
	return nil
}

// Push pushes changes to the remote repository
func (c *CmdGitClient) Push(ctx context.Context, dir string, options *PushOptions) error {
	slog.Info("Git push starting", "dir", dir)

	args := []string{"push"}

	if options != nil {
		if options.Remote != "" {
			args = append(args, options.Remote)
		}
		if options.Branch != "" {
			args = append(args, options.Branch)
		}
		if options.Force {
			args = append(args, "--force")
		}
	}

	// Set timeout from options or default
	timeout := c.timeout
	if options != nil && options.Timeout > 0 {
		timeout = options.Timeout
	}

	ctxWithTimeout, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	cmd := exec.CommandContext(ctxWithTimeout, c.gitPath, args...) // #nosec G204 -- gitPath is validated at initialization
	cmd.Dir = dir
	cmd.Env = os.Environ()

	output, err := cmd.CombinedOutput()
	if err != nil {
		slog.Error("Git push failed", "error", err, "output", string(output))
		return c.handleGitError("push", err, string(output))
	}

	slog.Info("Git push completed successfully")
	return nil
}

// Add adds files to the staging area
func (c *CmdGitClient) Add(ctx context.Context, dir string, files []string) error {
	slog.Info("Git add starting", "dir", dir, "files", len(files))

	args := append([]string{"add"}, files...)

	ctxWithTimeout, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	cmd := exec.CommandContext(ctxWithTimeout, c.gitPath, args...) // #nosec G204 -- gitPath is validated at initialization
	cmd.Dir = dir

	output, err := cmd.CombinedOutput()
	if err != nil {
		slog.Error("Git add failed", "error", err, "output", string(output))
		return c.handleGitError("add", err, string(output))
	}

	slog.Info("Git add completed successfully")
	return nil
}

// Commit creates a commit with the specified message
func (c *CmdGitClient) Commit(ctx context.Context, dir string, message string, options *CommitOptions) error {
	slog.Info("Git commit starting", "dir", dir, "message_length", len(message))

	args := []string{"commit", "-m", message}

	if options != nil {
		if options.Author != nil {
			authorStr := fmt.Sprintf("%s <%s>", options.Author.Name, options.Author.Email)
			args = append(args, "--author", authorStr)
		}
		if options.AllowEmpty {
			args = append(args, "--allow-empty")
		}
	}

	ctxWithTimeout, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	cmd := exec.CommandContext(ctxWithTimeout, c.gitPath, args...) // #nosec G204 -- gitPath is validated at initialization
	cmd.Dir = dir

	output, err := cmd.CombinedOutput()
	if err != nil {
		slog.Error("Git commit failed", "error", err, "output", string(output))
		return c.handleGitError("commit", err, string(output))
	}

	slog.Info("Git commit completed successfully")
	return nil
}

// Status returns the current repository status
func (c *CmdGitClient) Status(ctx context.Context, dir string) (*GitStatus, error) {
	slog.Debug("Git status starting", "dir", dir)

	ctxWithTimeout, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	// Get porcelain status
	cmd := exec.CommandContext(ctxWithTimeout, c.gitPath, "status", "--porcelain") // #nosec G204 -- gitPath is validated at initialization
	cmd.Dir = dir

	output, err := cmd.CombinedOutput()
	if err != nil {
		slog.Error("Git status failed", "error", err, "output", string(output))
		return nil, c.handleGitError("status", err, string(output))
	}

	// Parse status output
	status := &GitStatus{
		IsClean:        len(strings.TrimSpace(string(output))) == 0,
		ModifiedFiles:  []string{},
		UntrackedFiles: []string{},
		StagedFiles:    []string{},
	}

	for line := range strings.SplitSeq(strings.TrimSpace(string(output)), "\n") {
		if len(line) < 3 {
			continue
		}

		statusCode := line[:2]
		filename := strings.TrimSpace(line[3:])

		switch statusCode[0] {
		case 'M', 'A', 'D', 'R', 'C':
			status.StagedFiles = append(status.StagedFiles, filename)
		}

		switch statusCode[1] {
		case 'M', 'D':
			status.ModifiedFiles = append(status.ModifiedFiles, filename)
		case '?':
			status.UntrackedFiles = append(status.UntrackedFiles, filename)
		}
	}

	status.HasUncommitted = len(status.ModifiedFiles) > 0 || len(status.UntrackedFiles) > 0
	status.HasUntracked = len(status.UntrackedFiles) > 0

	// Get current branch
	branch, err := c.GetCurrentBranch(ctx, dir)
	if err == nil {
		status.Branch = branch
	}

	slog.Debug("Git status completed", "clean", status.IsClean, "uncommitted", status.HasUncommitted)
	return status, nil
}

// GetCurrentSHA returns the current commit SHA
func (c *CmdGitClient) GetCurrentSHA(ctx context.Context, dir string) (string, error) {
	ctxWithTimeout, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	cmd := exec.CommandContext(ctxWithTimeout, c.gitPath, "rev-parse", "HEAD") // #nosec G204 -- gitPath is validated at initialization
	cmd.Dir = dir

	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", c.handleGitError("rev-parse", err, string(output))
	}

	return strings.TrimSpace(string(output)), nil
}

// GetRemoteURL returns the remote URL
func (c *CmdGitClient) GetRemoteURL(ctx context.Context, dir string) (string, error) {
	ctxWithTimeout, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	cmd := exec.CommandContext(ctxWithTimeout, c.gitPath, "remote", "get-url", "origin") // #nosec G204 -- gitPath is validated at initialization
	cmd.Dir = dir

	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", c.handleGitError("remote get-url", err, string(output))
	}

	return strings.TrimSpace(string(output)), nil
}

// GetCurrentBranch returns the current branch name
func (c *CmdGitClient) GetCurrentBranch(ctx context.Context, dir string) (string, error) {
	ctxWithTimeout, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	cmd := exec.CommandContext(ctxWithTimeout, c.gitPath, "branch", "--show-current") // #nosec G204 -- gitPath is validated at initialization
	cmd.Dir = dir

	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", c.handleGitError("branch --show-current", err, string(output))
	}

	return strings.TrimSpace(string(output)), nil
}

// CheckoutBranch checks out the specified branch
func (c *CmdGitClient) CheckoutBranch(ctx context.Context, dir string, branch string) error {
	slog.Info("Git checkout starting", "dir", dir, "branch", branch)

	ctxWithTimeout, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	cmd := exec.CommandContext(ctxWithTimeout, c.gitPath, "checkout", branch) // #nosec G204 -- gitPath is validated at initialization
	cmd.Dir = dir

	output, err := cmd.CombinedOutput()
	if err != nil {
		slog.Error("Git checkout failed", "error", err, "output", string(output))
		return c.handleGitError("checkout", err, string(output))
	}

	slog.Info("Git checkout completed successfully")
	return nil
}

// SetConfig sets a git configuration value
func (c *CmdGitClient) SetConfig(ctx context.Context, dir string, key, value string) error {
	ctxWithTimeout, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	cmd := exec.CommandContext(ctxWithTimeout, c.gitPath, "config", key, value) // #nosec G204 -- gitPath is validated at initialization
	cmd.Dir = dir

	output, err := cmd.CombinedOutput()
	if err != nil {
		return c.handleGitError("config set", err, string(output))
	}

	return nil
}

// GetConfig gets a git configuration value
func (c *CmdGitClient) GetConfig(ctx context.Context, dir string, key string) (string, error) {
	ctxWithTimeout, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	cmd := exec.CommandContext(ctxWithTimeout, c.gitPath, "config", key) // #nosec G204 -- gitPath is validated at initialization
	cmd.Dir = dir

	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", c.handleGitError("config get", err, string(output))
	}

	return strings.TrimSpace(string(output)), nil
}

// UnsetConfig removes a git configuration value
func (c *CmdGitClient) UnsetConfig(ctx context.Context, dir string, key string) error {
	ctxWithTimeout, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	cmd := exec.CommandContext(ctxWithTimeout, c.gitPath, "config", "--unset", key) // #nosec G204 -- gitPath is validated at initialization
	cmd.Dir = dir

	output, err := cmd.CombinedOutput()
	if err != nil {
		// Ignore errors if the config key doesn't exist
		if strings.Contains(strings.ToLower(string(output)), "not found") {
			return nil
		}
		return c.handleGitError("config unset", err, string(output))
	}

	return nil
}

// CreateOrphanBranch creates a new orphan branch
func (c *CmdGitClient) CreateOrphanBranch(ctx context.Context, dir string, branch string) error {
	slog.Info("Creating orphan branch", "branch", branch, "dir", dir)

	args := []string{"checkout", "--orphan", branch}
	ctx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, c.gitPath, args...)
	cmd.Dir = dir

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to create orphan branch '%s': %w", branch, err)
	}

	slog.Info("Orphan branch created successfully", "branch", branch)
	return nil
}

// BranchExists checks if a branch exists in the repository
func (c *CmdGitClient) BranchExists(ctx context.Context, dir string, branch string) error {
	args := []string{"show-ref", "--verify", "--quiet", fmt.Sprintf("refs/heads/%s", branch)}
	ctx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, c.gitPath, args...)
	cmd.Dir = dir

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("branch '%s' does not exist: %w", branch, err)
	}

	return nil
}

// Stash saves current changes to the stash
func (c *CmdGitClient) Stash(ctx context.Context, dir string, message string) error {
	slog.Info("Creating git stash", "message", message, "dir", dir)

	args := []string{"stash", "push", "-m", message}
	ctx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, c.gitPath, args...)
	cmd.Dir = dir

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to create stash: %w", err)
	}

	slog.Info("Stash created successfully")
	return nil
}

// StashPop applies the most recent stash
func (c *CmdGitClient) StashPop(ctx context.Context, dir string) error {
	slog.Info("Applying git stash", "dir", dir)

	args := []string{"stash", "pop"}
	ctx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, c.gitPath, args...)
	cmd.Dir = dir

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to apply stash: %w", err)
	}

	slog.Info("Stash applied successfully")
	return nil
}

// RemoveFiles removes files from the git repository
func (c *CmdGitClient) RemoveFiles(ctx context.Context, dir string, paths []string, recursive bool) error {
	if len(paths) == 0 {
		return nil
	}

	slog.Info("Removing files from git", "paths", paths, "recursive", recursive, "dir", dir)

	args := []string{"rm"}
	if recursive {
		args = append(args, "-rf")
	} else {
		args = append(args, "-f")
	}
	args = append(args, paths...)

	ctx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, c.gitPath, args...)
	cmd.Dir = dir

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to remove files: %w", err)
	}

	slog.Info("Files removed successfully", "count", len(paths))
	return nil
}

// GetCommitHistory retrieves Git commit history with specified options
func (c *CmdGitClient) GetCommitHistory(ctx context.Context, dir string, options *CommitHistoryOptions) ([]byte, error) {
	slog.Info("Getting git commit history", "dir", dir)

	args := []string{"log"}

	if options != nil {
		if options.Format != "" {
			args = append(args, "--pretty=format:"+options.Format)
		} else {
			args = append(args, "--pretty=format:%H|%an|%ae|%ci|%s")
		}

		if options.NumStat {
			args = append(args, "--numstat")
		}

		if options.Since != nil {
			args = append(args, fmt.Sprintf("--since=%s", options.Since.Format("2006-01-02")))
		}

		if options.MaxCommits > 0 {
			args = append(args, fmt.Sprintf("-%d", options.MaxCommits))
		}
	} else {
		args = append(args, "--pretty=format:%H|%an|%ae|%ci|%s", "--numstat")
	}

	ctx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, c.gitPath, args...)
	cmd.Dir = dir

	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to get commit history: %w", err)
	}

	slog.Info("Commit history retrieved successfully", "size", len(output))
	return output, nil
}

// GetCommitCount gets the total number of commits
func (c *CmdGitClient) GetCommitCount(ctx context.Context, dir string) (int, error) {
	slog.Info("Getting git commit count", "dir", dir)

	args := []string{"rev-list", "--count", "HEAD"}
	ctx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, c.gitPath, args...)
	cmd.Dir = dir

	output, err := cmd.Output()
	if err != nil {
		return 0, fmt.Errorf("failed to get commit count: %w", err)
	}

	count, err := strconv.Atoi(strings.TrimSpace(string(output)))
	if err != nil {
		return 0, fmt.Errorf("failed to parse commit count: %w", err)
	}

	slog.Info("Commit count retrieved successfully", "count", count)
	return count, nil
}

// GetContributorCount gets the number of unique contributors
func (c *CmdGitClient) GetContributorCount(ctx context.Context, dir string) (int, error) {
	slog.Info("Getting git contributor count", "dir", dir)

	args := []string{"shortlog", "-sn", "HEAD"}
	ctx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, c.gitPath, args...)
	cmd.Dir = dir

	output, err := cmd.Output()
	if err != nil {
		return 0, fmt.Errorf("failed to get contributor count: %w", err)
	}

	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	count := len(lines)

	// Empty repository case
	if count == 1 && strings.TrimSpace(lines[0]) == "" {
		count = 0
	}

	slog.Info("Contributor count retrieved successfully", "count", count)
	return count, nil
}

// GetFirstCommitDate gets the date of the first commit
func (c *CmdGitClient) GetFirstCommitDate(ctx context.Context, dir string) (time.Time, error) {
	slog.Info("Getting first commit date", "dir", dir)

	args := []string{"log", "--reverse", "--pretty=format:%ci", "-1"}
	ctx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, c.gitPath, args...)
	cmd.Dir = dir

	output, err := cmd.Output()
	if err != nil {
		return time.Time{}, fmt.Errorf("failed to get first commit date: %w", err)
	}

	dateStr := strings.TrimSpace(string(output))
	if dateStr == "" {
		return time.Time{}, fmt.Errorf("commit history is empty")
	}

	date, err := time.Parse("2006-01-02 15:04:05 -0700", dateStr)
	if err != nil {
		return time.Time{}, fmt.Errorf("failed to parse commit date: %w", err)
	}

	slog.Info("First commit date retrieved successfully", "date", date)
	return date, nil
}

// GetBranchCount gets the total number of branches
func (c *CmdGitClient) GetBranchCount(ctx context.Context, dir string) (int, error) {
	slog.Info("Getting git branch count", "dir", dir)

	args := []string{"branch", "-a"}
	ctx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, c.gitPath, args...)
	cmd.Dir = dir

	output, err := cmd.Output()
	if err != nil {
		return 0, fmt.Errorf("failed to get branch count: %w", err)
	}

	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	count := len(lines)

	// Empty repository case
	if count == 1 && strings.TrimSpace(lines[0]) == "" {
		count = 0
	}

	slog.Info("Branch count retrieved successfully", "count", count)
	return count, nil
}

// Helper methods

// handleGitError converts git command errors to enhanced BeaverError
func (c *CmdGitClient) handleGitError(operation string, err error, output string) error {
	// Use the new enhanced error constructor with built-in suggestions
	return errors.NewGitOperationError(operation, err, output)
}

// sanitizeURL removes tokens from URLs for logging
func sanitizeURL(url string) string {
	// Remove tokens from URLs like https://token@github.com/owner/repo.git
	if strings.Contains(url, "@") {
		parts := strings.SplitN(url, "@", 2)
		if len(parts) == 2 {
			protocol := strings.SplitN(parts[0], "://", 2)
			if len(protocol) == 2 {
				return protocol[0] + "://***@" + parts[1]
			}
		}
	}
	return url
}

// IsGitRepository checks if directory is a git repository
func IsGitRepository(dir string) bool {
	gitDir := filepath.Join(dir, ".git")
	if stat, err := os.Stat(gitDir); err == nil && stat.IsDir() {
		return true
	}
	return false
}

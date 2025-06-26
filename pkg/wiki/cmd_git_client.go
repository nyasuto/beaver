package wiki

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// CmdGitClient implements GitClient using command-line git
type CmdGitClient struct {
	gitPath string
	timeout time.Duration
}

// NewCmdGitClient creates a new command-line Git client
func NewCmdGitClient() (*CmdGitClient, error) {
	gitPath, err := exec.LookPath("git")
	if err != nil {
		return nil, NewWikiError(ErrorTypeGitOperation, "git_lookup", err,
			"Gitコマンドが見つかりません", 0,
			[]string{
				"Gitをインストールしてください",
				"PATHにGitが含まれているか確認してください",
			})
	}

	return &CmdGitClient{
		gitPath: gitPath,
		timeout: 30 * time.Second,
	}, nil
}

// Clone clones a repository to the specified directory
func (c *CmdGitClient) Clone(ctx context.Context, url, dir string, options *CloneOptions) error {
	log.Printf("INFO Git clone starting: url=%s, dir=%s", sanitizeURL(url), dir)

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
		log.Printf("ERROR Git clone failed: %v, output: %s", err, string(output))
		return c.handleGitError("clone", err, string(output))
	}

	log.Printf("INFO Git clone completed successfully")
	return nil
}

// Pull pulls the latest changes from the remote repository
func (c *CmdGitClient) Pull(ctx context.Context, dir string) error {
	log.Printf("INFO Git pull starting: dir=%s", dir)

	ctxWithTimeout, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	cmd := exec.CommandContext(ctxWithTimeout, c.gitPath, "pull") // #nosec G204 -- gitPath is validated at initialization
	cmd.Dir = dir
	cmd.Env = os.Environ()

	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("ERROR Git pull failed: %v, output: %s", err, string(output))
		return c.handleGitError("pull", err, string(output))
	}

	log.Printf("INFO Git pull completed successfully")
	return nil
}

// Push pushes changes to the remote repository
func (c *CmdGitClient) Push(ctx context.Context, dir string, options *PushOptions) error {
	log.Printf("INFO Git push starting: dir=%s", dir)

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
		log.Printf("ERROR Git push failed: %v, output: %s", err, string(output))
		return c.handleGitError("push", err, string(output))
	}

	log.Printf("INFO Git push completed successfully")
	return nil
}

// Add adds files to the staging area
func (c *CmdGitClient) Add(ctx context.Context, dir string, files []string) error {
	log.Printf("INFO Git add starting: dir=%s, files=%d", dir, len(files))

	args := append([]string{"add"}, files...)

	ctxWithTimeout, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	cmd := exec.CommandContext(ctxWithTimeout, c.gitPath, args...) // #nosec G204 -- gitPath is validated at initialization
	cmd.Dir = dir

	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("ERROR Git add failed: %v, output: %s", err, string(output))
		return c.handleGitError("add", err, string(output))
	}

	log.Printf("INFO Git add completed successfully")
	return nil
}

// Commit creates a commit with the specified message
func (c *CmdGitClient) Commit(ctx context.Context, dir string, message string, options *CommitOptions) error {
	log.Printf("INFO Git commit starting: dir=%s, message length=%d", dir, len(message))

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
		log.Printf("ERROR Git commit failed: %v, output: %s", err, string(output))
		return c.handleGitError("commit", err, string(output))
	}

	log.Printf("INFO Git commit completed successfully")
	return nil
}

// Status returns the current repository status
func (c *CmdGitClient) Status(ctx context.Context, dir string) (*GitStatus, error) {
	log.Printf("DEBUG Git status starting: dir=%s", dir)

	ctxWithTimeout, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	// Get porcelain status
	cmd := exec.CommandContext(ctxWithTimeout, c.gitPath, "status", "--porcelain") // #nosec G204 -- gitPath is validated at initialization
	cmd.Dir = dir

	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("ERROR Git status failed: %v, output: %s", err, string(output))
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

	log.Printf("DEBUG Git status completed: clean=%v, uncommitted=%v", status.IsClean, status.HasUncommitted)
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
	log.Printf("INFO Git checkout starting: dir=%s, branch=%s", dir, branch)

	ctxWithTimeout, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	cmd := exec.CommandContext(ctxWithTimeout, c.gitPath, "checkout", branch) // #nosec G204 -- gitPath is validated at initialization
	cmd.Dir = dir

	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("ERROR Git checkout failed: %v, output: %s", err, string(output))
		return c.handleGitError("checkout", err, string(output))
	}

	log.Printf("INFO Git checkout completed successfully")
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

// Helper methods

// handleGitError converts git command errors to WikiError
func (c *CmdGitClient) handleGitError(operation string, err error, output string) error {
	outputLower := strings.ToLower(output)

	// Network errors
	if strings.Contains(outputLower, "network") ||
		strings.Contains(outputLower, "connection") ||
		strings.Contains(outputLower, "timeout") ||
		strings.Contains(outputLower, "could not resolve host") {
		return NewNetworkError(fmt.Sprintf("git %s", operation), err).
			WithContext("git_output", output)
	}

	// Authentication errors
	if strings.Contains(outputLower, "authentication failed") ||
		strings.Contains(outputLower, "permission denied") ||
		strings.Contains(outputLower, "bad credentials") ||
		strings.Contains(outputLower, "invalid username or password") {
		return NewAuthenticationError(fmt.Sprintf("git %s", operation), err).
			WithContext("git_output", output)
	}

	// Repository not found or access denied
	if strings.Contains(outputLower, "repository not found") ||
		strings.Contains(outputLower, "does not exist") ||
		strings.Contains(outputLower, "access denied") {
		return NewRepositoryError(fmt.Sprintf("git %s", operation), err, "").
			WithContext("git_output", output)
	}

	// Conflict errors
	if strings.Contains(outputLower, "conflict") ||
		strings.Contains(outputLower, "merge") ||
		strings.Contains(outputLower, "would be overwritten") {
		return NewConflictError(fmt.Sprintf("git %s", operation), err).
			WithContext("git_output", output)
	}

	// Generic git operation error
	return NewWikiError(
		ErrorTypeGitOperation,
		fmt.Sprintf("git %s", operation),
		err,
		fmt.Sprintf("Git操作が失敗しました: %s", operation),
		0,
		[]string{
			"Gitリポジトリの状態を確認してください",
			"作業ディレクトリの権限を確認してください",
			"ネットワーク接続を確認してください",
		},
	).WithContext("git_output", output)
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

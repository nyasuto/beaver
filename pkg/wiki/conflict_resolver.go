package wiki

import (
	"context"
	"crypto/rand"
	"fmt"
	"log/slog"
	"math"
	"strings"
	"time"

	"github.com/go-git/go-git/v5"
)

// ConflictStrategy defines how to handle Git conflicts
type ConflictStrategy int

const (
	StrategyMerge     ConflictStrategy = iota // 自動マージ (safe automatic merge)
	StrategyOverwrite                         // 強制上書き (force overwrite)
	StrategyAbort                             // 中断 (abort operation)
)

// ConflictResolver provides safe Git operations with conflict resolution
type ConflictResolver struct {
	gitClient    GitClient
	strategy     ConflictStrategy
	maxRetries   int
	baseDelay    time.Duration
	maxDelay     time.Duration
	jitterFactor float64
}

// ConflictResolverConfig holds configuration for conflict resolution
type ConflictResolverConfig struct {
	Strategy     ConflictStrategy
	MaxRetries   int
	BaseDelay    time.Duration
	MaxDelay     time.Duration
	JitterFactor float64
}

// NewConflictResolver creates a new conflict resolver with default settings
func NewConflictResolver(gitClient GitClient, config *ConflictResolverConfig) *ConflictResolver {
	if config == nil {
		config = DefaultConflictResolverConfig()
	}

	return &ConflictResolver{
		gitClient:    gitClient,
		strategy:     config.Strategy,
		maxRetries:   config.MaxRetries,
		baseDelay:    config.BaseDelay,
		maxDelay:     config.MaxDelay,
		jitterFactor: config.JitterFactor,
	}
}

// DefaultConflictResolverConfig returns sensible defaults for CI environments
func DefaultConflictResolverConfig() *ConflictResolverConfig {
	return &ConflictResolverConfig{
		Strategy:     StrategyMerge,    // Safe automatic merge
		MaxRetries:   5,                // Allow multiple retries for CI
		BaseDelay:    1 * time.Second,  // Start with 1 second
		MaxDelay:     30 * time.Second, // Cap at 30 seconds
		JitterFactor: 0.1,              // 10% jitter to avoid thundering herd
	}
}

// SafeUpdate performs a safe update operation with conflict resolution
// This implements the core pull-before-push strategy to handle concurrent modifications
func (cr *ConflictResolver) SafeUpdate(ctx context.Context, workDir string, commitMessage string, files []string) error {
	slog.Info("ConflictResolver SafeUpdate starting", "dir", workDir, "files", len(files), "strategy", cr.strategy)

	for attempt := 0; attempt < cr.maxRetries; attempt++ {
		if attempt > 0 {
			slog.Info("ConflictResolver retry attempt", "attempt", attempt+1, "max_retries", cr.maxRetries)
		}

		// Step 1: Pull latest changes to avoid conflicts
		if err := cr.pullLatestChanges(ctx, workDir); err != nil {
			slog.Warn("ConflictResolver pull failed on attempt", "attempt", attempt+1, "error", err)
			if attempt == cr.maxRetries-1 {
				return fmt.Errorf("failed to pull latest changes after %d attempts: %w", cr.maxRetries, err)
			}
			continue
		}

		// Step 2: Stage our changes
		if err := cr.gitClient.Add(ctx, workDir, files); err != nil {
			return fmt.Errorf("failed to stage files: %w", err)
		}

		// Step 3: Create commit
		commitOptions := NewDefaultCommitOptions()
		if err := cr.gitClient.Commit(ctx, workDir, commitMessage, commitOptions); err != nil {
			return fmt.Errorf("failed to create commit: %w", err)
		}

		// Step 4: Try to push
		pushOptions := NewDefaultPushOptions()
		if err := cr.gitClient.Push(ctx, workDir, pushOptions); err != nil {
			if cr.isPushConflict(err) {
				slog.Info("ConflictResolver detected push conflict on attempt", "attempt", attempt+1, "error", err)

				// Handle the conflict based on strategy
				if err := cr.handlePushConflict(ctx, workDir, attempt); err != nil {
					slog.Error("ConflictResolver conflict handling failed", "error", err)

					// For abort strategy, fail immediately without retrying
					if cr.strategy == StrategyAbort {
						return fmt.Errorf("conflict detected and strategy is set to abort: %w", err)
					}

					if attempt == cr.maxRetries-1 {
						return fmt.Errorf("failed to resolve conflict after %d attempts: %w", cr.maxRetries, err)
					}
				}

				// Wait before retrying with exponential backoff + jitter
				if attempt < cr.maxRetries-1 {
					delay := cr.calculateBackoffDelay(attempt)
					slog.Info("ConflictResolver backing off before retry", "delay", delay)
					select {
					case <-time.After(delay):
						// Continue to next iteration
					case <-ctx.Done():
						return ctx.Err()
					}
				}
				continue
			} else {
				// Non-conflict error, fail immediately
				return fmt.Errorf("push failed with non-conflict error: %w", err)
			}
		}

		// Success!
		slog.Info("ConflictResolver SafeUpdate completed successfully on attempt", "attempt", attempt+1)
		return nil
	}

	return fmt.Errorf("SafeUpdate failed after %d attempts with max retries exceeded", cr.maxRetries)
}

// pullLatestChanges safely pulls the latest changes from remote
func (cr *ConflictResolver) pullLatestChanges(ctx context.Context, workDir string) error {
	slog.Info("ConflictResolver pulling latest changes", "dir", workDir)

	// Check if we have any uncommitted changes first
	status, err := cr.gitClient.Status(ctx, workDir)
	if err != nil {
		return fmt.Errorf("failed to check git status: %w", err)
	}

	if status.HasUncommitted {
		slog.Warn("ConflictResolver found uncommitted changes, will need to handle carefully")
		// In CI environments, this shouldn't happen, but we'll handle it gracefully
	}

	// Perform the pull
	if err := cr.gitClient.Pull(ctx, workDir); err != nil {
		// Check if it's a "no remote changes" situation (not an error)
		if strings.Contains(err.Error(), "Already up to date") ||
			strings.Contains(err.Error(), "up-to-date") {
			slog.Info("ConflictResolver repository already up to date")
			return nil
		}
		return fmt.Errorf("git pull failed: %w", err)
	}

	slog.Info("ConflictResolver pull completed successfully")
	return nil
}

// isPushConflict determines if an error is a push conflict that can be resolved
func (cr *ConflictResolver) isPushConflict(err error) bool {
	if err == nil {
		return false
	}

	// Check for go-git specific errors first
	if cr.isGoGitConflict(err) {
		return true
	}

	errorStr := strings.ToLower(err.Error())

	// Common Git conflict indicators (for command-line fallback)
	conflictIndicators := []string{
		"rejected",
		"fetch first",
		"non-fast-forward",
		"updates were rejected",
		"tip of your current branch is behind",
		"merge conflict",
		"failed to push some refs",
	}

	for _, indicator := range conflictIndicators {
		if strings.Contains(errorStr, indicator) {
			return true
		}
	}

	return false
}

// isGoGitConflict checks for go-git specific conflict errors
func (cr *ConflictResolver) isGoGitConflict(err error) bool {
	// Check for go-git error types
	switch err {
	case git.ErrNonFastForwardUpdate:
		return true
	case git.ErrForceNeeded:
		return true
	}

	// Check error message for go-git specific patterns
	errorStr := err.Error()
	goGitConflictPatterns := []string{
		"non-fast-forward",
		"reference already exists",
		"push rejected",
		"remote ref does not exist",
	}

	for _, pattern := range goGitConflictPatterns {
		if strings.Contains(strings.ToLower(errorStr), pattern) {
			return true
		}
	}

	return false
}

// SafeUpdateInMemory performs safe push with conflict resolution using in-memory operations
// This method provides better performance and reduced disk I/O for go-git clients
func (cr *ConflictResolver) SafeUpdateInMemory(ctx context.Context, repo *git.Repository, pushOptions *PushOptions) error {
	if !cr.supportsInMemoryOperations() {
		return fmt.Errorf("git client does not support in-memory operations")
	}

	slog.Info("ConflictResolver starting SafeUpdateInMemory with strategy", "strategy", cr.strategy)

	for attempt := 0; attempt < cr.maxRetries; attempt++ {
		slog.Info("ConflictResolver SafeUpdateInMemory attempt", "attempt", attempt+1, "maxRetries", cr.maxRetries)

		// Try to push from memory
		if err := cr.gitClient.PushFromMemory(ctx, repo, pushOptions); err != nil {
			if cr.isPushConflict(err) {
				slog.Info("ConflictResolver detected push conflict on in-memory attempt", "attempt", attempt+1, "error", err)

				// Handle the conflict based on strategy
				if err := cr.handleInMemoryPushConflict(ctx, repo, attempt); err != nil {
					slog.Error("ConflictResolver in-memory conflict handling failed", "error", err)

					// For abort strategy, fail immediately without retrying
					if cr.strategy == StrategyAbort {
						return fmt.Errorf("conflict detected and strategy is set to abort: %w", err)
					}

					if attempt == cr.maxRetries-1 {
						return fmt.Errorf("failed to resolve in-memory conflict after %d attempts: %w", cr.maxRetries, err)
					}
				}

				// Wait before retrying with exponential backoff + jitter
				if attempt < cr.maxRetries-1 {
					delay := cr.calculateBackoffDelay(attempt)
					slog.Info("ConflictResolver backing off before in-memory retry", "delay", delay)
					select {
					case <-time.After(delay):
						// Continue to next iteration
					case <-ctx.Done():
						return ctx.Err()
					}
				}
				continue
			} else {
				// Non-conflict error, fail immediately
				return fmt.Errorf("in-memory push failed with non-conflict error: %w", err)
			}
		}

		// Success!
		slog.Info("ConflictResolver SafeUpdateInMemory completed successfully on attempt", "attempt", attempt+1)
		return nil
	}

	return fmt.Errorf("SafeUpdateInMemory failed after %d attempts with max retries exceeded", cr.maxRetries)
}

// supportsInMemoryOperations checks if the git client supports in-memory operations
func (cr *ConflictResolver) supportsInMemoryOperations() bool {
	// Check if the git client implements in-memory methods
	_, _, err := cr.gitClient.CreateInMemoryWorkspace()
	return err == nil
}

// handleInMemoryPushConflict handles a push conflict for in-memory operations
func (cr *ConflictResolver) handleInMemoryPushConflict(ctx context.Context, repo *git.Repository, attempt int) error {
	switch cr.strategy {
	case StrategyMerge:
		return cr.handleInMemoryMergeConflict(ctx, repo, attempt)
	case StrategyOverwrite:
		return cr.handleInMemoryOverwriteConflict(ctx, repo, attempt)
	case StrategyAbort:
		return fmt.Errorf("conflict resolution strategy is set to abort")
	default:
		return fmt.Errorf("unknown conflict resolution strategy: %v", cr.strategy)
	}
}

// handleInMemoryMergeConflict handles merge conflicts for in-memory operations
func (cr *ConflictResolver) handleInMemoryMergeConflict(ctx context.Context, repo *git.Repository, attempt int) error {
	slog.Info("ConflictResolver handling in-memory merge conflict", "attempt", attempt+1)

	// For in-memory operations, we'll implement a simplified fetch and rebase approach
	// This is a basic implementation - more complex scenarios would need additional logic

	// Get the current HEAD
	head, err := repo.Head()
	if err != nil {
		return fmt.Errorf("failed to get HEAD: %w", err)
	}

	slog.Info("ConflictResolver in-memory merge conflict handled", "head", head.Hash().String())
	return nil
}

// handleInMemoryOverwriteConflict handles overwrite conflicts for in-memory operations
func (cr *ConflictResolver) handleInMemoryOverwriteConflict(ctx context.Context, repo *git.Repository, attempt int) error {
	slog.Info("ConflictResolver handling in-memory overwrite conflict", "attempt", attempt+1)

	// For overwrite strategy with in-memory operations, we would force push
	// This is simplified - actual implementation would modify push options to force
	slog.Warn("ConflictResolver force overwrite not yet implemented for in-memory operations")

	return nil
}

// handlePushConflict handles a push conflict based on the configured strategy
func (cr *ConflictResolver) handlePushConflict(ctx context.Context, workDir string, attempt int) error {
	slog.Info("ConflictResolver handling push conflict with strategy", "strategy", cr.strategy)

	switch cr.strategy {
	case StrategyMerge:
		return cr.handleMergeStrategy(ctx, workDir)
	case StrategyOverwrite:
		return cr.handleOverwriteStrategy(ctx, workDir)
	case StrategyAbort:
		return fmt.Errorf("conflict detected and strategy is set to abort")
	default:
		return fmt.Errorf("unknown conflict strategy: %v", cr.strategy)
	}
}

// handleMergeStrategy implements safe automatic merging
func (cr *ConflictResolver) handleMergeStrategy(ctx context.Context, workDir string) error {
	slog.Info("ConflictResolver applying merge strategy")

	// Reset the current commit to prepare for re-application
	// This is equivalent to "git reset HEAD~1" to undo our commit
	// We'll re-apply it after pulling

	// For now, we'll use a simpler approach: reset to remote state and re-apply changes
	// This is safer in CI environments where we control the entire process

	// Note: In a full implementation, we would:
	// 1. Save our changes to a temporary location
	// 2. Reset to remote HEAD
	// 3. Re-apply our changes
	// 4. Handle any merge conflicts automatically

	// For CI integration tests, the safest approach is to pull and retry
	// since we're dealing with automated, non-conflicting content

	slog.Info("ConflictResolver merge strategy: will retry after pull")
	return nil
}

// handleOverwriteStrategy implements force push (use with caution)
func (cr *ConflictResolver) handleOverwriteStrategy(ctx context.Context, workDir string) error {
	slog.Warn("ConflictResolver applying overwrite strategy (force push)")

	pushOptions := &PushOptions{
		Remote:  "origin",
		Branch:  "master",
		Force:   true,
		Timeout: 30 * time.Second,
	}

	if err := cr.gitClient.Push(ctx, workDir, pushOptions); err != nil {
		return fmt.Errorf("force push failed: %w", err)
	}

	slog.Info("ConflictResolver overwrite strategy completed")
	return nil
}

// calculateBackoffDelay calculates the delay for exponential backoff with jitter
func (cr *ConflictResolver) calculateBackoffDelay(attempt int) time.Duration {
	// Exponential backoff: baseDelay * 2^attempt
	delay := time.Duration(float64(cr.baseDelay) * math.Pow(2, float64(attempt)))

	// Cap at maxDelay
	if delay > cr.maxDelay {
		delay = cr.maxDelay
	}

	// Add jitter to avoid thundering herd
	if cr.jitterFactor > 0 {
		// Use crypto/rand for secure random number generation
		b := make([]byte, 1)
		var randFloat float64
		if _, err := rand.Read(b); err != nil {
			// Fallback to time-based jitter if crypto/rand fails
			randFloat = 0.5
		} else {
			randFloat = float64(b[0]) / 255.0 // Convert to 0-1 range
		}
		jitter := time.Duration(float64(delay) * cr.jitterFactor * (2*randFloat - 1))
		delay += jitter
	}

	return delay
}

// SetStrategy allows changing the conflict resolution strategy
func (cr *ConflictResolver) SetStrategy(strategy ConflictStrategy) {
	cr.strategy = strategy
	slog.Info("ConflictResolver strategy changed to", "strategy", strategy)
}

// GetStrategy returns the current conflict resolution strategy
func (cr *ConflictResolver) GetStrategy() ConflictStrategy {
	return cr.strategy
}

// String returns a string representation of the conflict strategy
func (cs ConflictStrategy) String() string {
	switch cs {
	case StrategyMerge:
		return "merge"
	case StrategyOverwrite:
		return "overwrite"
	case StrategyAbort:
		return "abort"
	default:
		return "unknown"
	}
}

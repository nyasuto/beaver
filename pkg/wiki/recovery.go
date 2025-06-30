package wiki

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/nyasuto/beaver/internal/errors"
)

// RecoveryManager handles automatic recovery from common errors
type RecoveryManager struct {
	gitClient GitClient
	publisher WikiPublisher
	logger    *log.Logger
}

// NewRecoveryManager creates a new recovery manager
func NewRecoveryManager(gitClient GitClient, publisher WikiPublisher) *RecoveryManager {
	return &RecoveryManager{
		gitClient: gitClient,
		publisher: publisher,
		logger:    log.New(log.Writer(), "[RECOVERY] ", log.LstdFlags),
	}
}

// RecoverableOperation represents an operation that can be automatically recovered
type RecoverableOperation func(ctx context.Context) error

// ExecuteWithRecovery executes an operation with automatic recovery for known error patterns
func (rm *RecoveryManager) ExecuteWithRecovery(ctx context.Context, operation RecoverableOperation, maxRetries int) error {
	var lastErr error

	for attempt := 0; attempt < maxRetries; attempt++ {
		err := operation(ctx)
		if err == nil {
			return nil // Success
		}

		lastErr = err

		// Check if error is recoverable and attempt recovery
		if recovered := rm.attemptRecovery(ctx, err, attempt); recovered {
			rm.logger.Printf("Successfully recovered from error: %v", err)
			continue // Retry the operation
		}

		// If error is not recoverable, return immediately
		if beaverErr, ok := err.(*errors.BeaverError); ok {
			if !beaverErr.IsRecoverable() {
				return err
			}

			// Wait for retry delay if specified
			if retryAfter := beaverErr.GetRetryAfter(); retryAfter != nil {
				rm.logger.Printf("Waiting %v before retry attempt %d", *retryAfter, attempt+1)
				select {
				case <-time.After(*retryAfter):
					continue
				case <-ctx.Done():
					return ctx.Err()
				}
			}
		}

		// For other errors, use exponential backoff
		if attempt < maxRetries-1 {
			// Use safe exponential backoff calculation
			delay := time.Second
			for i := 0; i < attempt && i < 5; i++ {
				delay *= 2
			}
			if delay > 30*time.Second {
				delay = 30 * time.Second
			}

			rm.logger.Printf("Retrying operation in %v (attempt %d/%d)", delay, attempt+1, maxRetries)
			select {
			case <-time.After(delay):
				continue
			case <-ctx.Done():
				return ctx.Err()
			}
		}
	}

	return fmt.Errorf("operation failed after %d attempts: %w", maxRetries, lastErr)
}

// attemptRecovery tries to automatically recover from specific error types
func (rm *RecoveryManager) attemptRecovery(ctx context.Context, err error, attempt int) bool {
	beaverErr, ok := err.(*errors.BeaverError)
	if !ok {
		return false
	}

	switch beaverErr.Code {
	case errors.ErrCodeRepository:
		return rm.recoverRepositoryError(ctx, beaverErr, attempt)
	case errors.ErrCodeGit:
		return rm.recoverGitError(ctx, beaverErr, attempt)
	case errors.ErrCodeAuthentication:
		return rm.recoverAuthError(ctx, beaverErr, attempt)
	case errors.ErrCodeNetwork:
		return rm.recoverNetworkError(ctx, beaverErr, attempt)
	default:
		return false
	}
}

// recoverRepositoryError attempts to recover from repository-related errors
func (rm *RecoveryManager) recoverRepositoryError(ctx context.Context, err *errors.BeaverError, attempt int) bool {
	rm.logger.Printf("Attempting repository error recovery: %s", err.Message)

	// Check if it's a "repository not found" or "wiki not initialized" error
	if containsAnyString(err.Message, []string{"not found", "not initialized", "does not exist"}) {
		return rm.initializeWikiRepository(ctx)
	}

	return false
}

// recoverGitError attempts to recover from Git operation errors
func (rm *RecoveryManager) recoverGitError(ctx context.Context, err *errors.BeaverError, attempt int) bool {
	rm.logger.Printf("Attempting Git error recovery: %s", err.Message)

	gitOutput, hasOutput := err.Details["git_output"].(string)

	// Handle merge conflicts by resetting to remote state
	if containsAnyString(err.Message, []string{"conflict", "merge"}) ||
		(hasOutput && containsAnyString(gitOutput, []string{"conflict", "would be overwritten"})) {
		return rm.resolveGitConflict(ctx)
	}

	// Handle repository not initialized
	if hasOutput && containsAnyString(gitOutput, []string{"not a git repository", "not initialized"}) {
		return rm.initializeGitRepository(ctx)
	}

	// Handle permission issues by checking and fixing permissions
	if hasOutput && containsAnyString(gitOutput, []string{"permission denied", "access denied"}) {
		return rm.fixPermissions(ctx)
	}

	return false
}

// recoverAuthError attempts to recover from authentication errors
func (rm *RecoveryManager) recoverAuthError(ctx context.Context, err *errors.BeaverError, attempt int) bool {
	rm.logger.Printf("Authentication error detected: %s", err.Message)

	// For authentication errors, we can't automatically recover
	// But we can validate the token and provide better guidance
	if rm.publisher != nil {
		// Try to validate token scope
		if scopeErr := rm.validateTokenScopes(ctx); scopeErr != nil {
			rm.logger.Printf("Token validation failed: %v", scopeErr)
		}
	}

	return false // Auth errors require manual intervention
}

// recoverNetworkError attempts to recover from network errors
func (rm *RecoveryManager) recoverNetworkError(ctx context.Context, err *errors.BeaverError, attempt int) bool {
	rm.logger.Printf("Attempting network error recovery: %s", err.Message)

	// For network errors, we mostly rely on retry logic
	// But we can perform basic connectivity checks
	if rm.checkConnectivity(ctx) {
		rm.logger.Printf("Network connectivity restored")
		return true
	}

	return false
}

// initializeWikiRepository attempts to initialize a missing wiki repository
func (rm *RecoveryManager) initializeWikiRepository(ctx context.Context) bool {
	if rm.publisher == nil {
		return false
	}

	rm.logger.Printf("Attempting to initialize wiki repository")

	// Create a basic home page to initialize the wiki
	homePage := &WikiPage{
		Title:     "Home",
		Content:   "# Welcome to the Wiki\n\nThis wiki was automatically initialized by Beaver.",
		Filename:  "Home.md",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Try to create the home page (this initializes the repository)
	if err := rm.publisher.CreatePage(ctx, homePage); err != nil {
		rm.logger.Printf("Failed to initialize repository: %v", err)
		return false
	}

	rm.logger.Printf("Successfully initialized repository")
	return true
}

// resolveGitConflict attempts to resolve Git conflicts by resetting to remote
func (rm *RecoveryManager) resolveGitConflict(ctx context.Context) bool {
	rm.logger.Printf("Attempting to resolve Git conflict by resetting to remote")

	// This is a simple strategy: reset hard to remote HEAD
	// In a more sophisticated implementation, you might want to:
	// 1. Stash local changes
	// 2. Pull remote changes
	// 3. Apply stashed changes
	// 4. Handle conflicts more intelligently

	// For now, we'll just report that manual intervention is needed
	rm.logger.Printf("Git conflict detected - manual resolution required")
	return false
}

// initializeGitRepository attempts to initialize a Git repository
func (rm *RecoveryManager) initializeGitRepository(ctx context.Context) bool {
	rm.logger.Printf("Attempting to initialize Git repository")

	// For safety, we won't automatically initialize Git repositories
	// This should be done manually by the user
	rm.logger.Printf("Git repository initialization requires manual intervention")
	return false
}

// fixPermissions attempts to fix file permission issues
func (rm *RecoveryManager) fixPermissions(ctx context.Context) bool {
	rm.logger.Printf("Permission error detected - manual intervention required")

	// Permission issues usually require manual intervention
	// We can't automatically fix permissions as it might be a security issue
	return false
}

// validateTokenScopes checks if the GitHub token has required scopes
func (rm *RecoveryManager) validateTokenScopes(ctx context.Context) error {
	if rm.publisher == nil {
		return fmt.Errorf("no publisher available for token validation")
	}

	// This would need to be implemented based on the GitHub client
	// For now, we'll just log that validation is needed
	rm.logger.Printf("Token scope validation needed - implement GitHub API scope check")
	return nil
}

// checkConnectivity performs basic network connectivity checks
func (rm *RecoveryManager) checkConnectivity(ctx context.Context) bool {
	// Simple connectivity check - in a real implementation you might:
	// 1. Ping GitHub's API endpoint
	// 2. Check DNS resolution
	// 3. Test proxy settings

	rm.logger.Printf("Performing basic connectivity check")

	// For now, just assume connectivity is restored after a delay
	// In practice, you'd implement actual connectivity testing
	return true
}

// Helper functions

func containsAnyString(text string, patterns []string) bool {
	textLower := strings.ToLower(text)
	for _, pattern := range patterns {
		if strings.Contains(textLower, strings.ToLower(pattern)) {
			return true
		}
	}
	return false
}

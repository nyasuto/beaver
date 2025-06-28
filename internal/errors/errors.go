package errors

import (
	"fmt"
	"strings"
	"time"
)

// BeaverError represents a structured error with additional context
type BeaverError struct {
	Code        string
	Message     string
	Details     map[string]interface{}
	Cause       error
	Suggestions []string
	RetryAfter  *time.Duration
	Recoverable bool
}

func (e *BeaverError) Error() string {
	if e.Cause != nil {
		return fmt.Sprintf("[%s] %s: %v", e.Code, e.Message, e.Cause)
	}
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

// GetUserFriendlyMessage returns a formatted error message with suggestions
func (e *BeaverError) GetUserFriendlyMessage() string {
	message := e.Message

	if len(e.Suggestions) > 0 {
		message += "\n\n💡 Suggestions:"
		for i, suggestion := range e.Suggestions {
			message += fmt.Sprintf("\n  %d. %s", i+1, suggestion)
		}
	}

	if e.RetryAfter != nil {
		message += fmt.Sprintf("\n\n⏱️  You can retry this operation after %v", *e.RetryAfter)
	}

	return message
}

// IsRecoverable returns whether this error can potentially be recovered from
func (e *BeaverError) IsRecoverable() bool {
	return e.Recoverable
}

// GetRetryAfter returns the suggested retry delay
func (e *BeaverError) GetRetryAfter() *time.Duration {
	return e.RetryAfter
}

func (e *BeaverError) Unwrap() error {
	return e.Cause
}

// New creates a new BeaverError
func New(code, message string) *BeaverError {
	return &BeaverError{
		Code:        code,
		Message:     message,
		Details:     make(map[string]interface{}),
		Suggestions: make([]string, 0),
		Recoverable: false,
	}
}

// Wrap wraps an existing error with additional context
func Wrap(err error, code, message string) *BeaverError {
	return &BeaverError{
		Code:        code,
		Message:     message,
		Details:     make(map[string]interface{}),
		Cause:       err,
		Suggestions: make([]string, 0),
		Recoverable: false,
	}
}

// WithDetail adds a detail field to the error
func (e *BeaverError) WithDetail(key string, value interface{}) *BeaverError {
	e.Details[key] = value
	return e
}

// WithSuggestion adds a user-friendly suggestion for resolving the error
func (e *BeaverError) WithSuggestion(suggestion string) *BeaverError {
	e.Suggestions = append(e.Suggestions, suggestion)
	return e
}

// WithRetryAfter sets a suggested retry delay
func (e *BeaverError) WithRetryAfter(duration time.Duration) *BeaverError {
	e.RetryAfter = &duration
	e.Recoverable = true
	return e
}

// AsRecoverable marks the error as recoverable
func (e *BeaverError) AsRecoverable() *BeaverError {
	e.Recoverable = true
	return e
}

// Common error codes
const (
	ErrCodeConfig         = "CONFIG_ERROR"
	ErrCodeGitHub         = "GITHUB_ERROR"
	ErrCodeAI             = "AI_ERROR"
	ErrCodeWiki           = "WIKI_ERROR"
	ErrCodeValidation     = "VALIDATION_ERROR"
	ErrCodeNetwork        = "NETWORK_ERROR"
	ErrCodeFileSystem     = "FILESYSTEM_ERROR"
	ErrCodeAuthentication = "AUTH_ERROR"
	ErrCodeRateLimit      = "RATE_LIMIT_ERROR"
	ErrCodeGit            = "GIT_ERROR"
	ErrCodeRepository     = "REPOSITORY_ERROR"
	ErrCodePermission     = "PERMISSION_ERROR"
	ErrCodeTimeout        = "TIMEOUT_ERROR"
	ErrCodeDiskSpace      = "DISK_SPACE_ERROR"
	ErrCodeTokenScope     = "TOKEN_SCOPE_ERROR" // #nosec G101 - This is an error code constant, not a credential
	ErrCodeConnectivity   = "CONNECTIVITY_ERROR"
)

// Predefined error constructors for common cases
func ConfigError(message string) *BeaverError {
	return New(ErrCodeConfig, message)
}

func GitHubError(message string) *BeaverError {
	return New(ErrCodeGitHub, message)
}

func AIError(message string) *BeaverError {
	return New(ErrCodeAI, message)
}

func WikiError(message string) *BeaverError {
	return New(ErrCodeWiki, message)
}

func ValidationError(message string) *BeaverError {
	return New(ErrCodeValidation, message)
}

func NetworkError(message string) *BeaverError {
	return New(ErrCodeNetwork, message)
}

func FileSystemError(message string) *BeaverError {
	return New(ErrCodeFileSystem, message)
}

func AuthenticationError(message string) *BeaverError {
	return New(ErrCodeAuthentication, message)
}

func RateLimitError(message string) *BeaverError {
	return New(ErrCodeRateLimit, message)
}

// WrapGitHubError wraps a GitHub API error
func WrapGitHubError(err error, message string) *BeaverError {
	return Wrap(err, ErrCodeGitHub, message)
}

// WrapAIError wraps an AI processing error
func WrapAIError(err error, message string) *BeaverError {
	return Wrap(err, ErrCodeAI, message)
}

// WrapConfigError wraps a configuration error
func WrapConfigError(err error, message string) *BeaverError {
	return Wrap(err, ErrCodeConfig, message)
}

// Additional error constructors for new error types
func GitError(message string) *BeaverError {
	return New(ErrCodeGit, message)
}

func RepositoryError(message string) *BeaverError {
	return New(ErrCodeRepository, message)
}

func PermissionError(message string) *BeaverError {
	return New(ErrCodePermission, message)
}

func TimeoutError(message string) *BeaverError {
	return New(ErrCodeTimeout, message)
}

func DiskSpaceError(message string) *BeaverError {
	return New(ErrCodeDiskSpace, message)
}

func TokenScopeError(message string) *BeaverError {
	return New(ErrCodeTokenScope, message)
}

func ConnectivityError(message string) *BeaverError {
	return New(ErrCodeConnectivity, message)
}

// Wrap functions for new error types
func WrapGitError(err error, message string) *BeaverError {
	return Wrap(err, ErrCodeGit, message)
}

func WrapRepositoryError(err error, message string) *BeaverError {
	return Wrap(err, ErrCodeRepository, message)
}

func WrapTimeoutError(err error, message string) *BeaverError {
	return Wrap(err, ErrCodeTimeout, message)
}

func WrapConnectivityError(err error, message string) *BeaverError {
	return Wrap(err, ErrCodeConnectivity, message)
}

// Specialized error constructors with built-in suggestions and recovery hints

// NewRepositoryNotFoundError creates an error for missing repositories with auto-recovery suggestions
func NewRepositoryNotFoundError(repository string) *BeaverError {
	return RepositoryError(fmt.Sprintf("Repository '%s' not found or wiki not initialized", repository)).
		WithSuggestion("Check if the repository exists and you have access to it").
		WithSuggestion("Initialize the wiki by creating the first page manually in GitHub").
		WithSuggestion("Verify the repository name format is 'owner/repo'").
		AsRecoverable()
}

// NewAuthenticationError creates an error for authentication failures with token guidance
func NewAuthenticationError(operation string, err error) *BeaverError {
	var authErr *BeaverError
	if err != nil {
		authErr = Wrap(err, ErrCodeAuthentication, fmt.Sprintf("Authentication failed during %s", operation))
	} else {
		authErr = AuthenticationError(fmt.Sprintf("Authentication failed during %s", operation))
	}

	return authErr.
		WithSuggestion("Verify your GitHub Personal Access Token is valid and not expired").
		WithSuggestion("Check that your token has the required scopes: 'repo' for private repos, 'public_repo' for public repos").
		WithSuggestion("Ensure your token has wiki access permissions").
		WithSuggestion("If using 2FA, make sure your token is properly configured")
}

// NewRateLimitError creates an error for GitHub API rate limiting with retry timing
func NewRateLimitError(resetTime time.Time) *BeaverError {
	waitTime := time.Until(resetTime)
	if waitTime < 0 {
		waitTime = 1 * time.Minute // Default fallback
	}

	return RateLimitError("GitHub API rate limit exceeded").
		WithSuggestion("Your API requests have been temporarily limited by GitHub").
		WithSuggestion("Consider using a Personal Access Token for higher rate limits").
		WithSuggestion("If using authenticated requests, check your usage at https://github.com/settings/tokens").
		WithRetryAfter(waitTime).
		WithDetail("reset_time", resetTime)
}

// NewNetworkTimeoutError creates an error for network timeouts with retry logic
func NewNetworkTimeoutError(operation string, err error) *BeaverError {
	return WrapTimeoutError(err, fmt.Sprintf("Network timeout during %s", operation)).
		WithSuggestion("Check your internet connection and try again").
		WithSuggestion("If behind a proxy, verify your proxy settings").
		WithSuggestion("GitHub might be experiencing temporary issues - check https://githubstatus.com").
		WithRetryAfter(30 * time.Second)
}

// NewGitOperationError creates an error for Git command failures with specific guidance
func NewGitOperationError(operation string, err error, gitOutput string) *BeaverError {
	gitErr := WrapGitError(err, fmt.Sprintf("Git %s operation failed", operation)).
		WithDetail("git_output", gitOutput)

	// Add specific suggestions based on Git output
	if containsGitErrorPattern(gitOutput, "not a git repository") {
		gitErr = gitErr.WithSuggestion("Initialize a Git repository first with: git init")
	}

	if containsGitErrorPattern(gitOutput, "permission denied") {
		gitErr = gitErr.WithSuggestion("Check file permissions and repository access rights").
			WithSuggestion("Ensure you have write access to the repository")
	}

	if containsGitErrorPattern(gitOutput, "merge conflict") {
		gitErr = gitErr.WithSuggestion("Resolve the merge conflict manually").
			WithSuggestion("Use 'git status' to see conflicted files").
			AsRecoverable()
	}

	if containsGitErrorPattern(gitOutput, "no space left") {
		gitErr = gitErr.WithSuggestion("Free up disk space and try again").
			WithDetail("error_type", "disk_space")
	}

	return gitErr
}

// NewTokenScopeError creates an error for insufficient token permissions
func NewTokenScopeError(requiredScopes []string, availableScopes []string) *BeaverError {
	return TokenScopeError("GitHub token has insufficient permissions").
		WithDetail("required_scopes", requiredScopes).
		WithDetail("available_scopes", availableScopes).
		WithSuggestion("Update your GitHub Personal Access Token with the required scopes").
		WithSuggestion(fmt.Sprintf("Required scopes: %v", requiredScopes)).
		WithSuggestion("Generate a new token at https://github.com/settings/tokens").
		WithSuggestion("After updating, restart the application with the new token")
}

// NewRepositoryInitializationError creates an error for repository setup issues
func NewRepositoryInitializationError(operation string, err error) *BeaverError {
	return WrapRepositoryError(err, fmt.Sprintf("Repository initialization failed during %s", operation)).
		WithSuggestion("Create the repository wiki manually by visiting your repository on GitHub").
		WithSuggestion("Go to the 'Wiki' tab and create your first page").
		WithSuggestion("Once initialized, retry the operation").
		AsRecoverable()
}

// Helper function to check Git error patterns
func containsGitErrorPattern(output, pattern string) bool {
	if output == "" {
		return false
	}
	outputLower := strings.ToLower(output)
	patternLower := strings.ToLower(pattern)
	return strings.Contains(outputLower, patternLower)
}

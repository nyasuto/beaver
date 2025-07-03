package content

import (
	"fmt"
	"strings"
	"time"
)

// ErrorType represents the category of Wiki-related errors
type ErrorType int

const (
	ErrorTypeUnknown ErrorType = iota
	ErrorTypeNetwork
	ErrorTypeAuthentication
	ErrorTypePermission
	ErrorTypeRepository
	ErrorTypeGitOperation
	ErrorTypeFileSystem
	ErrorTypeConfiguration
	ErrorTypeConflict
	ErrorTypeValidation
)

// String returns the string representation of the error type
func (e ErrorType) String() string {
	switch e {
	case ErrorTypeNetwork:
		return "NETWORK"
	case ErrorTypeAuthentication:
		return "AUTHENTICATION"
	case ErrorTypePermission:
		return "PERMISSION"
	case ErrorTypeRepository:
		return "REPOSITORY"
	case ErrorTypeGitOperation:
		return "GIT_OPERATION"
	case ErrorTypeFileSystem:
		return "FILESYSTEM"
	case ErrorTypeConfiguration:
		return "CONFIGURATION"
	case ErrorTypeConflict:
		return "CONFLICT"
	case ErrorTypeValidation:
		return "VALIDATION"
	default:
		return "UNKNOWN"
	}
}

// WikiError represents a structured error for Wiki operations
type WikiError struct {
	Type        ErrorType
	Operation   string
	Cause       error
	UserMessage string
	RetryAfter  time.Duration
	Suggestions []string
	Context     map[string]interface{}
}

// Error implements the error interface
func (e *WikiError) Error() string {
	if e.Cause != nil {
		return fmt.Sprintf("[%s] %s: %v", e.Type, e.Operation, e.Cause)
	}
	return fmt.Sprintf("[%s] %s: %s", e.Type, e.Operation, e.UserMessage)
}

// UserFriendlyMessage returns a message suitable for end users
func (e *WikiError) UserFriendlyMessage() string {
	if e.UserMessage != "" {
		return e.UserMessage
	}
	return e.Error()
}

// IsRetryable returns true if the error might be resolved by retrying
func (e *WikiError) IsRetryable() bool {
	switch e.Type {
	case ErrorTypeNetwork, ErrorTypeConflict:
		return true
	case ErrorTypeGitOperation:
		// Some Git operations are retryable (e.g., network issues)
		return e.RetryAfter > 0
	default:
		return false
	}
}

// GetSuggestions returns a list of suggested actions to resolve the error
func (e *WikiError) GetSuggestions() []string {
	if len(e.Suggestions) > 0 {
		return e.Suggestions
	}

	// Default suggestions based on error type
	switch e.Type {
	case ErrorTypeAuthentication:
		return []string{
			"Verify your GitHub Personal Access Token",
			"Check token permissions (repo access required)",
			"Ensure token hasn't expired",
		}
	case ErrorTypePermission:
		return []string{
			"Verify repository access permissions",
			"Check if repository exists and is accessible",
			"Ensure Wiki is enabled for the repository",
		}
	case ErrorTypeRepository:
		return []string{
			"Initialize Wiki by creating the first page manually",
			"Visit https://github.com/owner/repo/wiki",
			"Click 'Create the first page'",
		}
	case ErrorTypeNetwork:
		return []string{
			"Check internet connection",
			"Verify GitHub.com accessibility",
			"Check proxy/firewall settings",
		}
	case ErrorTypeGitOperation:
		return []string{
			"Ensure Git is installed and accessible",
			"Check working directory permissions",
			"Verify repository isn't corrupted",
		}
	case ErrorTypeConfiguration:
		return []string{
			"Check beaver.yml configuration",
			"Verify all required fields are set",
			"Run 'beaver status' for configuration validation",
		}
	default:
		return []string{"Contact support with error details"}
	}
}

// NewWikiError creates a new WikiError with the specified parameters
func NewWikiError(errorType ErrorType, operation string, cause error, userMessage string, retryAfter time.Duration, suggestions []string) *WikiError {
	return &WikiError{
		Type:        errorType,
		Operation:   operation,
		Cause:       cause,
		UserMessage: userMessage,
		RetryAfter:  retryAfter,
		Suggestions: suggestions,
		Context:     make(map[string]interface{}),
	}
}

// WithContext adds context information to the error
func (e *WikiError) WithContext(key string, value interface{}) *WikiError {
	if e.Context == nil {
		e.Context = make(map[string]interface{})
	}
	e.Context[key] = value
	return e
}

// Common error constructors for frequent scenarios

// NewNetworkError creates a network-related error
func NewNetworkError(operation string, cause error) *WikiError {
	return NewWikiError(
		ErrorTypeNetwork,
		operation,
		cause,
		"ネットワーク接続に問題があります",
		5*time.Second,
		[]string{
			"インターネット接続を確認してください",
			"GitHub.comへのアクセスを確認してください",
			"プロキシ・ファイアウォール設定を確認してください",
		},
	)
}

// NewAuthenticationError creates an authentication-related error
func NewAuthenticationError(operation string, cause error) *WikiError {
	return NewWikiError(
		ErrorTypeAuthentication,
		operation,
		cause,
		"GitHub認証に失敗しました",
		0,
		[]string{
			"Personal Access Tokenを確認してください",
			"Token権限（repo access）を確認してください",
			"Tokenの有効期限を確認してください",
		},
	)
}

// NewRepositoryError creates a repository-related error
func NewRepositoryError(operation string, cause error, repoURL string) *WikiError {
	err := NewWikiError(
		ErrorTypeRepository,
		operation,
		cause,
		"リポジトリまたはWikiにアクセスできません",
		0,
		[]string{
			"Wikiを手動で初期化してください",
			fmt.Sprintf("https://github.com/%s/wiki にアクセス", extractRepoPath(repoURL)),
			"'Create the first page'をクリック",
		},
	)
	return err.WithContext("repository_url", repoURL)
}

// NewConflictError creates a conflict-related error
func NewConflictError(operation string, cause error) *WikiError {
	return NewWikiError(
		ErrorTypeConflict,
		operation,
		cause,
		"他のユーザーによる変更と競合しました",
		2*time.Second,
		[]string{
			"しばらく待ってから再実行してください",
			"最新の変更を確認してください",
			"必要に応じて手動でマージしてください",
		},
	)
}

// NewConfigurationError creates a configuration-related error
func NewConfigurationError(operation string, message string) *WikiError {
	return NewWikiError(
		ErrorTypeConfiguration,
		operation,
		nil,
		message,
		0,
		[]string{
			"beaver.yml設定ファイルを確認してください",
			"beaver status で設定検証を実行してください",
			"必要な環境変数が設定されているか確認してください",
		},
	)
}

// Helper functions

// extractRepoPath extracts owner/repo from a repository URL
func extractRepoPath(repoURL string) string {
	// Simple extraction - could be improved with proper URL parsing
	if repoURL == "" {
		return ""
	}

	// Handle HTTPS URLs like https://github.com/owner/repo.git
	if strings.Contains(repoURL, "github.com/") {
		parts := strings.Split(repoURL, "github.com/")
		if len(parts) > 1 {
			path := parts[1]
			// Remove .git suffix if present
			path = strings.TrimSuffix(path, ".git")
			return path
		}
	}

	// Handle SSH URLs like git@github.com:owner/repo.git
	if strings.Contains(repoURL, "git@github.com:") {
		parts := strings.Split(repoURL, "git@github.com:")
		if len(parts) > 1 {
			path := parts[1]
			// Remove .git suffix if present
			path = strings.TrimSuffix(path, ".git")
			return path
		}
	}

	return ""
}

// IsNetworkError checks if an error is network-related
func IsNetworkError(err error) bool {
	if wikiErr, ok := err.(*WikiError); ok {
		return wikiErr.Type == ErrorTypeNetwork
	}
	return false
}

// IsAuthenticationError checks if an error is authentication-related
func IsAuthenticationError(err error) bool {
	if wikiErr, ok := err.(*WikiError); ok {
		return wikiErr.Type == ErrorTypeAuthentication
	}
	return false
}

// IsRepositoryError checks if an error is repository-related
func IsRepositoryError(err error) bool {
	if wikiErr, ok := err.(*WikiError); ok {
		return wikiErr.Type == ErrorTypeRepository
	}
	return false
}

// IsConflictError checks if an error is conflict-related
func IsConflictError(err error) bool {
	if wikiErr, ok := err.(*WikiError); ok {
		return wikiErr.Type == ErrorTypeConflict
	}
	return false
}

// Unwrap returns the underlying cause error
func (e *WikiError) Unwrap() error {
	return e.Cause
}

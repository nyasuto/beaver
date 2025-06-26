package wiki

import (
	"errors"
	"testing"
	"time"
)

func TestErrorType_String(t *testing.T) {
	tests := []struct {
		errorType ErrorType
		expected  string
	}{
		{ErrorTypeNetwork, "NETWORK"},
		{ErrorTypeAuthentication, "AUTHENTICATION"},
		{ErrorTypeRepository, "REPOSITORY"},
		{ErrorTypeConflict, "CONFLICT"},
		{ErrorTypeConfiguration, "CONFIGURATION"},
		{ErrorTypeValidation, "VALIDATION"},
		{ErrorTypeFileSystem, "FILESYSTEM"},
		{ErrorTypeGitOperation, "GIT_OPERATION"},
		{ErrorType(999), "UNKNOWN"},
	}

	for _, tt := range tests {
		t.Run(tt.expected, func(t *testing.T) {
			result := tt.errorType.String()
			if result != tt.expected {
				t.Errorf("ErrorType.String() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestWikiError_Error(t *testing.T) {
	err := &WikiError{
		Type:        ErrorTypeNetwork,
		Operation:   "clone",
		Cause:       errors.New("connection failed"),
		UserMessage: "ネットワークエラーが発生しました",
	}

	result := err.Error()
	expected := "[NETWORK] clone: connection failed"
	if result != expected {
		t.Errorf("WikiError.Error() = %v, want %v", result, expected)
	}
}

func TestWikiError_UserFriendlyMessage(t *testing.T) {
	err := &WikiError{
		Type:        ErrorTypeAuthentication,
		Operation:   "push",
		UserMessage: "認証に失敗しました",
		Suggestions: []string{"トークンを確認してください", "権限を確認してください"},
	}

	result := err.UserFriendlyMessage()
	if !stringContains(result, "認証に失敗しました") {
		t.Errorf("UserFriendlyMessage() should contain user message")
	}
	// UserFriendlyMessage() only returns the UserMessage, not suggestions
	// So we only test for the main message
}

func TestWikiError_IsRetryable(t *testing.T) {
	tests := []struct {
		name       string
		errorType  ErrorType
		retryAfter time.Duration
		expected   bool
	}{
		{
			name:       "network error with retry",
			errorType:  ErrorTypeNetwork,
			retryAfter: 5 * time.Second,
			expected:   true,
		},
		{
			name:       "network error without retry",
			errorType:  ErrorTypeNetwork,
			retryAfter: 0,
			expected:   true,
		},
		{
			name:       "authentication error",
			errorType:  ErrorTypeAuthentication,
			retryAfter: 0,
			expected:   false,
		},
		{
			name:       "repository error",
			errorType:  ErrorTypeRepository,
			retryAfter: 0,
			expected:   false,
		},
		{
			name:       "conflict error",
			errorType:  ErrorTypeConflict,
			retryAfter: 0,
			expected:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := &WikiError{
				Type:       tt.errorType,
				RetryAfter: tt.retryAfter,
			}
			result := err.IsRetryable()
			if result != tt.expected {
				t.Errorf("IsRetryable() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestWikiError_GetSuggestions(t *testing.T) {
	suggestions := []string{"suggestion1", "suggestion2"}
	err := &WikiError{
		Type:        ErrorTypeValidation,
		Suggestions: suggestions,
	}

	result := err.GetSuggestions()
	if len(result) != len(suggestions) {
		t.Errorf("GetSuggestions() length = %v, want %v", len(result), len(suggestions))
	}

	for i, suggestion := range suggestions {
		if result[i] != suggestion {
			t.Errorf("GetSuggestions()[%d] = %v, want %v", i, result[i], suggestion)
		}
	}
}

func TestNewWikiError(t *testing.T) {
	cause := errors.New("root cause")
	suggestions := []string{"try again", "check config"}

	err := NewWikiError(
		ErrorTypeFileSystem,
		"write",
		cause,
		"ファイル書き込みエラー",
		5*time.Second,
		suggestions,
	)

	if err.Type != ErrorTypeFileSystem {
		t.Errorf("Type = %v, want %v", err.Type, ErrorTypeFileSystem)
	}
	if err.Operation != "write" {
		t.Errorf("Operation = %v, want write", err.Operation)
	}
	if err.Cause != cause {
		t.Errorf("Cause = %v, want %v", err.Cause, cause)
	}
	if err.UserMessage != "ファイル書き込みエラー" {
		t.Errorf("UserMessage = %v, want ファイル書き込みエラー", err.UserMessage)
	}
	if err.RetryAfter != 5*time.Second {
		t.Errorf("RetryAfter = %v, want 5s", err.RetryAfter)
	}
	if len(err.Suggestions) != 2 {
		t.Errorf("Suggestions length = %v, want 2", len(err.Suggestions))
	}
}

func TestWikiError_WithContext(t *testing.T) {
	err := NewWikiError(ErrorTypeGitOperation, "test", nil, "test message", 0, nil)

	result := err.WithContext("key1", "value1").WithContext("key2", 42)

	if result.Context["key1"] != "value1" {
		t.Errorf("Context[key1] = %v, want value1", result.Context["key1"])
	}
	if result.Context["key2"] != 42 {
		t.Errorf("Context[key2] = %v, want 42", result.Context["key2"])
	}
}

func TestNewNetworkError(t *testing.T) {
	cause := errors.New("connection timeout")
	err := NewNetworkError("fetch", cause)

	if err.Type != ErrorTypeNetwork {
		t.Errorf("Type = %v, want %v", err.Type, ErrorTypeNetwork)
	}
	if err.Operation != "fetch" {
		t.Errorf("Operation = %v, want fetch", err.Operation)
	}
	if err.Cause != cause {
		t.Errorf("Cause = %v, want %v", err.Cause, cause)
	}
	if !stringContains(err.UserMessage, "ネットワーク") {
		t.Errorf("UserMessage should contain network message")
	}
	if err.RetryAfter == 0 {
		t.Error("NetworkError should have retry after duration")
	}
}

func TestNewAuthenticationError(t *testing.T) {
	cause := errors.New("invalid token")
	err := NewAuthenticationError("push", cause)

	if err.Type != ErrorTypeAuthentication {
		t.Errorf("Type = %v, want %v", err.Type, ErrorTypeAuthentication)
	}
	if err.Operation != "push" {
		t.Errorf("Operation = %v, want push", err.Operation)
	}
	if err.Cause != cause {
		t.Errorf("Cause = %v, want %v", err.Cause, cause)
	}
	if !stringContains(err.UserMessage, "認証") {
		t.Errorf("UserMessage should contain authentication message")
	}
}

func TestNewRepositoryError(t *testing.T) {
	cause := errors.New("repo not found")
	repoURL := "https://github.com/owner/repo.git"
	err := NewRepositoryError("clone", cause, repoURL)

	if err.Type != ErrorTypeRepository {
		t.Errorf("Type = %v, want %v", err.Type, ErrorTypeRepository)
	}
	if err.Operation != "clone" {
		t.Errorf("Operation = %v, want clone", err.Operation)
	}
	if err.Cause != cause {
		t.Errorf("Cause = %v, want %v", err.Cause, cause)
	}
	if !stringContains(err.UserMessage, "リポジトリ") {
		t.Errorf("UserMessage should contain repository message")
	}
}

func TestNewConflictError(t *testing.T) {
	cause := errors.New("merge conflict")
	err := NewConflictError("merge", cause)

	if err.Type != ErrorTypeConflict {
		t.Errorf("Type = %v, want %v", err.Type, ErrorTypeConflict)
	}
	if err.Operation != "merge" {
		t.Errorf("Operation = %v, want merge", err.Operation)
	}
	if err.Cause != cause {
		t.Errorf("Cause = %v, want %v", err.Cause, cause)
	}
	if !stringContains(err.UserMessage, "競合") {
		t.Errorf("UserMessage should contain conflict message")
	}
}

func TestNewConfigurationError(t *testing.T) {
	err := NewConfigurationError("validate", "missing token")

	if err.Type != ErrorTypeConfiguration {
		t.Errorf("Type = %v, want %v", err.Type, ErrorTypeConfiguration)
	}
	if err.Operation != "validate" {
		t.Errorf("Operation = %v, want validate", err.Operation)
	}
	// Configuration error uses the provided message directly
	if err.UserMessage != "missing token" {
		t.Errorf("UserMessage = %v, want 'missing token'", err.UserMessage)
	}
}

func TestExtractRepoPath(t *testing.T) {
	tests := []struct {
		name     string
		url      string
		expected string
	}{
		{
			name:     "HTTPS URL",
			url:      "https://github.com/owner/repo.git",
			expected: "owner/repo",
		},
		{
			name:     "SSH URL",
			url:      "git@github.com:owner/repo.git",
			expected: "owner/repo",
		},
		{
			name:     "Invalid URL",
			url:      "invalid-url",
			expected: "",
		},
		{
			name:     "Empty URL",
			url:      "",
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractRepoPath(tt.url)
			if result != tt.expected {
				t.Errorf("extractRepoPath() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestErrorTypeCheckers(t *testing.T) {
	networkErr := NewNetworkError("test", nil)
	authErr := NewAuthenticationError("test", nil)
	repoErr := NewRepositoryError("test", nil, "")
	conflictErr := NewConflictError("test", nil)
	otherErr := errors.New("other error")

	t.Run("IsNetworkError", func(t *testing.T) {
		if !IsNetworkError(networkErr) {
			t.Error("IsNetworkError() should return true for network error")
		}
		if IsNetworkError(authErr) {
			t.Error("IsNetworkError() should return false for auth error")
		}
		if IsNetworkError(otherErr) {
			t.Error("IsNetworkError() should return false for other error")
		}
		if IsNetworkError(nil) {
			t.Error("IsNetworkError() should return false for nil")
		}
	})

	t.Run("IsAuthenticationError", func(t *testing.T) {
		if !IsAuthenticationError(authErr) {
			t.Error("IsAuthenticationError() should return true for auth error")
		}
		if IsAuthenticationError(networkErr) {
			t.Error("IsAuthenticationError() should return false for network error")
		}
		if IsAuthenticationError(otherErr) {
			t.Error("IsAuthenticationError() should return false for other error")
		}
		if IsAuthenticationError(nil) {
			t.Error("IsAuthenticationError() should return false for nil")
		}
	})

	t.Run("IsRepositoryError", func(t *testing.T) {
		if !IsRepositoryError(repoErr) {
			t.Error("IsRepositoryError() should return true for repo error")
		}
		if IsRepositoryError(networkErr) {
			t.Error("IsRepositoryError() should return false for network error")
		}
		if IsRepositoryError(otherErr) {
			t.Error("IsRepositoryError() should return false for other error")
		}
		if IsRepositoryError(nil) {
			t.Error("IsRepositoryError() should return false for nil")
		}
	})

	t.Run("IsConflictError", func(t *testing.T) {
		if !IsConflictError(conflictErr) {
			t.Error("IsConflictError() should return true for conflict error")
		}
		if IsConflictError(networkErr) {
			t.Error("IsConflictError() should return false for network error")
		}
		if IsConflictError(otherErr) {
			t.Error("IsConflictError() should return false for other error")
		}
		if IsConflictError(nil) {
			t.Error("IsConflictError() should return false for nil")
		}
	})
}

func TestWikiError_Unwrap(t *testing.T) {
	cause := errors.New("root cause")
	err := NewWikiError(ErrorTypeValidation, "test", cause, "test message", 0, nil)

	unwrapped := errors.Unwrap(err)
	if unwrapped != cause {
		t.Errorf("Unwrap() = %v, want %v", unwrapped, cause)
	}
}

// Helper function for testing string containment (using different name to avoid conflict)
func stringContains(s, substr string) bool {
	return len(s) >= len(substr) &&
		(s == substr ||
			len(s) > len(substr) &&
				(s[:len(substr)] == substr ||
					s[len(s)-len(substr):] == substr ||
					containsSubstring(s, substr)))
}

func containsSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

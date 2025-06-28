package errors

import (
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBeaverErrorEnhancements(t *testing.T) {
	t.Run("WithSuggestion", func(t *testing.T) {
		err := New(ErrCodeValidation, "Invalid input").
			WithSuggestion("Check your input format").
			WithSuggestion("Refer to the documentation")

		assert.Len(t, err.Suggestions, 2)
		assert.Contains(t, err.Suggestions, "Check your input format")
		assert.Contains(t, err.Suggestions, "Refer to the documentation")
	})

	t.Run("WithRetryAfter", func(t *testing.T) {
		duration := 30 * time.Second
		err := New(ErrCodeNetwork, "Connection failed").
			WithRetryAfter(duration)

		assert.True(t, err.IsRecoverable())
		assert.Equal(t, &duration, err.GetRetryAfter())
	})

	t.Run("AsRecoverable", func(t *testing.T) {
		err := New(ErrCodeGit, "Operation failed").AsRecoverable()
		assert.True(t, err.IsRecoverable())
	})

	t.Run("GetUserFriendlyMessage", func(t *testing.T) {
		retryAfter := 1 * time.Minute
		err := New(ErrCodeRateLimit, "Rate limit exceeded").
			WithSuggestion("Use authentication for higher limits").
			WithSuggestion("Check your usage").
			WithRetryAfter(retryAfter)

		message := err.GetUserFriendlyMessage()

		assert.Contains(t, message, "Rate limit exceeded")
		assert.Contains(t, message, "💡 Suggestions:")
		assert.Contains(t, message, "1. Use authentication for higher limits")
		assert.Contains(t, message, "2. Check your usage")
		assert.Contains(t, message, "⏱️  You can retry this operation after 1m0s")
	})
}

func TestSpecializedErrorConstructors(t *testing.T) {
	t.Run("NewRepositoryNotFoundError", func(t *testing.T) {
		err := NewRepositoryNotFoundError("owner/repo")

		assert.Equal(t, ErrCodeRepository, err.Code)
		assert.Contains(t, err.Message, "owner/repo")
		assert.Contains(t, err.Message, "not found")
		assert.True(t, err.IsRecoverable())
		assert.True(t, len(err.Suggestions) > 0)

		// Check for specific suggestions
		suggestions := strings.Join(err.Suggestions, " ")
		assert.Contains(t, suggestions, "repository exists")
		assert.Contains(t, suggestions, "owner/repo")
	})

	t.Run("NewAuthenticationError", func(t *testing.T) {
		baseErr := assert.AnError
		err := NewAuthenticationError("fetch issues", baseErr)

		assert.Equal(t, ErrCodeAuthentication, err.Code)
		assert.Contains(t, err.Message, "Authentication failed")
		assert.Contains(t, err.Message, "fetch issues")
		assert.Equal(t, baseErr, err.Cause)

		// Check for authentication-specific suggestions
		suggestions := strings.ToLower(strings.Join(err.Suggestions, " "))
		assert.Contains(t, suggestions, "personal access token")
		assert.Contains(t, suggestions, "scopes")
	})

	t.Run("NewRateLimitError", func(t *testing.T) {
		resetTime := time.Now().Add(1 * time.Hour)
		err := NewRateLimitError(resetTime)

		assert.Equal(t, ErrCodeRateLimit, err.Code)
		assert.Contains(t, err.Message, "rate limit exceeded")
		assert.True(t, err.IsRecoverable())

		retryAfter := err.GetRetryAfter()
		require.NotNil(t, retryAfter)
		assert.True(t, *retryAfter > 30*time.Minute) // Should be close to 1 hour

		// Check reset time in details
		assert.Equal(t, resetTime, err.Details["reset_time"])
	})

	t.Run("NewNetworkTimeoutError", func(t *testing.T) {
		baseErr := assert.AnError
		err := NewNetworkTimeoutError("API request", baseErr)

		assert.Equal(t, ErrCodeTimeout, err.Code)
		assert.Contains(t, err.Message, "Network timeout")
		assert.Contains(t, err.Message, "API request")
		assert.Equal(t, baseErr, err.Cause)
		assert.True(t, err.IsRecoverable())

		retryAfter := err.GetRetryAfter()
		require.NotNil(t, retryAfter)
		assert.Equal(t, 30*time.Second, *retryAfter)
	})

	t.Run("NewTokenScopeError", func(t *testing.T) {
		required := []string{"repo", "write:org"}
		available := []string{"public_repo"}

		err := NewTokenScopeError(required, available)

		assert.Equal(t, ErrCodeTokenScope, err.Code)
		assert.Contains(t, err.Message, "insufficient permissions")
		assert.Equal(t, required, err.Details["required_scopes"])
		assert.Equal(t, available, err.Details["available_scopes"])

		// Check for token-specific suggestions
		suggestions := strings.Join(err.Suggestions, " ")
		assert.Contains(t, suggestions, "Personal Access Token")
		assert.Contains(t, suggestions, "github.com/settings/tokens")
	})
}

func TestGitOperationError(t *testing.T) {
	tests := []struct {
		name                string
		operation           string
		gitOutput           string
		expectedSuggestions []string
	}{
		{
			name:                "not a git repository",
			operation:           "commit",
			gitOutput:           "fatal: not a git repository (or any of the parent directories)",
			expectedSuggestions: []string{"git init"},
		},
		{
			name:                "permission denied",
			operation:           "push",
			gitOutput:           "error: Permission denied (publickey)",
			expectedSuggestions: []string{"permissions", "write access"},
		},
		{
			name:                "merge conflict",
			operation:           "pull",
			gitOutput:           "CONFLICT (content): Merge conflict in file.txt",
			expectedSuggestions: []string{"resolve", "git status"},
		},
		{
			name:                "no space left",
			operation:           "clone",
			gitOutput:           "fatal: write error: No space left on device",
			expectedSuggestions: []string{"disk space"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			baseErr := assert.AnError
			err := NewGitOperationError(tt.operation, baseErr, tt.gitOutput)

			assert.Equal(t, ErrCodeGit, err.Code)
			assert.Contains(t, err.Message, tt.operation)
			assert.Equal(t, baseErr, err.Cause)
			assert.Equal(t, tt.gitOutput, err.Details["git_output"])

			// Check for expected suggestions (case-insensitive)
			suggestions := strings.ToLower(strings.Join(err.Suggestions, " "))
			for _, expectedSuggestion := range tt.expectedSuggestions {
				assert.Contains(t, suggestions, strings.ToLower(expectedSuggestion))
			}
		})
	}
}

func TestContainsGitErrorPattern(t *testing.T) {
	tests := []struct {
		name     string
		output   string
		pattern  string
		expected bool
	}{
		{
			name:     "exact match",
			output:   "not a git repository",
			pattern:  "not a git repository",
			expected: true,
		},
		{
			name:     "case insensitive",
			output:   "PERMISSION DENIED",
			pattern:  "permission denied",
			expected: true,
		},
		{
			name:     "partial match",
			output:   "fatal: not a git repository (or any parent)",
			pattern:  "not a git repository",
			expected: true,
		},
		{
			name:     "no match",
			output:   "everything is fine",
			pattern:  "error",
			expected: false,
		},
		{
			name:     "empty output",
			output:   "",
			pattern:  "error",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := containsGitErrorPattern(tt.output, tt.pattern)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestErrorChaining(t *testing.T) {
	t.Run("wrap and unwrap", func(t *testing.T) {
		originalErr := assert.AnError
		wrappedErr := WrapGitError(originalErr, "Git operation failed")

		assert.Equal(t, originalErr, wrappedErr.Unwrap())
		assert.Contains(t, wrappedErr.Error(), "Git operation failed")
		assert.Contains(t, wrappedErr.Error(), originalErr.Error())
	})

	t.Run("enhanced error with suggestions maintains chaining", func(t *testing.T) {
		originalErr := assert.AnError
		enhancedErr := NewAuthenticationError("test", originalErr)

		assert.Equal(t, originalErr, enhancedErr.Unwrap())
		assert.True(t, len(enhancedErr.Suggestions) > 0)
	})
}

func TestErrorComposition(t *testing.T) {
	t.Run("multiple enhancements", func(t *testing.T) {
		err := New(ErrCodeNetwork, "Connection failed").
			WithSuggestion("Check your internet connection").
			WithDetail("host", "github.com").
			WithDetail("port", 443).
			WithRetryAfter(5 * time.Second).
			AsRecoverable()

		assert.True(t, err.IsRecoverable())
		assert.Equal(t, 5*time.Second, *err.GetRetryAfter())
		assert.Len(t, err.Suggestions, 1)
		assert.Equal(t, "github.com", err.Details["host"])
		assert.Equal(t, 443, err.Details["port"])
	})

	t.Run("user friendly message with all features", func(t *testing.T) {
		err := New(ErrCodeRateLimit, "API limit reached").
			WithSuggestion("Use a personal access token").
			WithSuggestion("Wait for rate limit reset").
			WithDetail("current_limit", 60).
			WithRetryAfter(10 * time.Minute)

		message := err.GetUserFriendlyMessage()

		assert.Contains(t, message, "API limit reached")
		assert.Contains(t, message, "💡 Suggestions:")
		assert.Contains(t, message, "1. Use a personal access token")
		assert.Contains(t, message, "2. Wait for rate limit reset")
		assert.Contains(t, message, "⏱️  You can retry this operation after 10m0s")
	})
}

// Benchmark tests for error creation performance
func BenchmarkErrorCreation(b *testing.B) {
	b.Run("simple error", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			_ = New(ErrCodeValidation, "test error")
		}
	})

	b.Run("enhanced error", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			_ = New(ErrCodeValidation, "test error").
				WithSuggestion("suggestion 1").
				WithSuggestion("suggestion 2").
				WithDetail("key", "value").
				AsRecoverable()
		}
	})

	b.Run("specialized constructor", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			_ = NewRepositoryNotFoundError("owner/repo")
		}
	})
}

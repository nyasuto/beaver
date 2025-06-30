package errors

import (
	"errors"
	"fmt"
	"testing"
	"time"
)

func TestBeaverError_Error(t *testing.T) {
	tests := []struct {
		name     string
		err      *BeaverError
		expected string
	}{
		{
			name: "Error without cause",
			err: &BeaverError{
				Code:    "TEST_ERROR",
				Message: "Test message",
			},
			expected: "[TEST_ERROR] Test message",
		},
		{
			name: "Error with cause",
			err: &BeaverError{
				Code:    "TEST_ERROR",
				Message: "Test message",
				Cause:   errors.New("underlying error"),
			},
			expected: "[TEST_ERROR] Test message: underlying error",
		},
		{
			name: "Error with empty code",
			err: &BeaverError{
				Code:    "",
				Message: "Test message",
			},
			expected: "[] Test message",
		},
		{
			name: "Error with empty message",
			err: &BeaverError{
				Code:    "TEST_ERROR",
				Message: "",
			},
			expected: "[TEST_ERROR] ",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.err.Error()
			if result != tt.expected {
				t.Errorf("BeaverError.Error() = %q, want %q", result, tt.expected)
			}
		})
	}
}

func TestBeaverError_Unwrap(t *testing.T) {
	originalErr := errors.New("original error")

	t.Run("Error with cause", func(t *testing.T) {
		beaverErr := &BeaverError{
			Code:    "TEST_ERROR",
			Message: "Test message",
			Cause:   originalErr,
		}

		unwrapped := beaverErr.Unwrap()
		if unwrapped != originalErr {
			t.Errorf("BeaverError.Unwrap() = %v, want %v", unwrapped, originalErr)
		}
	})

	t.Run("Error without cause", func(t *testing.T) {
		beaverErr := &BeaverError{
			Code:    "TEST_ERROR",
			Message: "Test message",
		}

		unwrapped := beaverErr.Unwrap()
		if unwrapped != nil {
			t.Errorf("BeaverError.Unwrap() = %v, want nil", unwrapped)
		}
	})
}

func TestNew(t *testing.T) {
	code := "TEST_CODE"
	message := "Test message"

	err := New(code, message)

	if err == nil {
		t.Fatal("New() returned nil")
	}

	if err.Code != code {
		t.Errorf("New() Code = %q, want %q", err.Code, code)
	}

	if err.Message != message {
		t.Errorf("New() Message = %q, want %q", err.Message, message)
	}

	if err.Cause != nil {
		t.Errorf("New() Cause = %v, want nil", err.Cause)
	}

	if err.Details == nil {
		t.Error("New() Details should be initialized")
	}

	if len(err.Details) != 0 {
		t.Errorf("New() Details should be empty, got %d items", len(err.Details))
	}
}

func TestWrap(t *testing.T) {
	originalErr := errors.New("original error")
	code := "WRAP_CODE"
	message := "Wrap message"

	err := Wrap(originalErr, code, message)

	if err == nil {
		t.Fatal("Wrap() returned nil")
	}

	if err.Code != code {
		t.Errorf("Wrap() Code = %q, want %q", err.Code, code)
	}

	if err.Message != message {
		t.Errorf("Wrap() Message = %q, want %q", err.Message, message)
	}

	if err.Cause != originalErr {
		t.Errorf("Wrap() Cause = %v, want %v", err.Cause, originalErr)
	}

	if err.Details == nil {
		t.Error("Wrap() Details should be initialized")
	}
}

func TestBeaverError_WithDetail(t *testing.T) {
	err := New("TEST_CODE", "Test message")

	// Add a detail
	result := err.WithDetail("key1", "value1")

	// Should return the same instance
	if result != err {
		t.Error("WithDetail() should return the same instance")
	}

	// Check detail was added
	if len(err.Details) != 1 {
		t.Errorf("WithDetail() Details length = %d, want 1", len(err.Details))
	}

	if err.Details["key1"] != "value1" {
		t.Errorf("WithDetail() Details['key1'] = %v, want 'value1'", err.Details["key1"])
	}

	// Add another detail
	err.WithDetail("key2", 42)

	if len(err.Details) != 2 {
		t.Errorf("WithDetail() Details length = %d, want 2", len(err.Details))
	}

	if err.Details["key2"] != 42 {
		t.Errorf("WithDetail() Details['key2'] = %v, want 42", err.Details["key2"])
	}

	// Test chaining
	err = New("CHAIN_TEST", "Chain test").
		WithDetail("detail1", "value1").
		WithDetail("detail2", "value2")

	if len(err.Details) != 2 {
		t.Errorf("Chained WithDetail() Details length = %d, want 2", len(err.Details))
	}
}

func TestPredefinedErrorConstructors(t *testing.T) {
	tests := []struct {
		name         string
		constructor  func(string) *BeaverError
		expectedCode string
		message      string
	}{
		{
			name:         "ConfigError",
			constructor:  ConfigError,
			expectedCode: ErrCodeConfig,
			message:      "Config test message",
		},
		{
			name:         "GitHubError",
			constructor:  GitHubError,
			expectedCode: ErrCodeGitHub,
			message:      "GitHub test message",
		},
		{
			name:         "AIError",
			constructor:  AIError,
			expectedCode: ErrCodeAI,
			message:      "AI test message",
		},
		{
			name:         "WikiError",
			constructor:  WikiError,
			expectedCode: ErrCodeWiki,
			message:      "Wiki test message",
		},
		{
			name:         "ValidationError",
			constructor:  ValidationError,
			expectedCode: ErrCodeValidation,
			message:      "Validation test message",
		},
		{
			name:         "NetworkError",
			constructor:  NetworkError,
			expectedCode: ErrCodeNetwork,
			message:      "Network test message",
		},
		{
			name:         "FileSystemError",
			constructor:  FileSystemError,
			expectedCode: ErrCodeFileSystem,
			message:      "FileSystem test message",
		},
		{
			name:         "AuthenticationError",
			constructor:  AuthenticationError,
			expectedCode: ErrCodeAuthentication,
			message:      "Authentication test message",
		},
		{
			name:         "RateLimitError",
			constructor:  RateLimitError,
			expectedCode: ErrCodeRateLimit,
			message:      "RateLimit test message",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.constructor(tt.message)

			if err == nil {
				t.Fatalf("%s() returned nil", tt.name)
			}

			if err.Code != tt.expectedCode {
				t.Errorf("%s() Code = %q, want %q", tt.name, err.Code, tt.expectedCode)
			}

			if err.Message != tt.message {
				t.Errorf("%s() Message = %q, want %q", tt.name, err.Message, tt.message)
			}

			if err.Cause != nil {
				t.Errorf("%s() Cause = %v, want nil", tt.name, err.Cause)
			}

			if err.Details == nil {
				t.Errorf("%s() Details should be initialized", tt.name)
			}
		})
	}
}

func TestWrapErrorConstructors(t *testing.T) {
	originalErr := errors.New("original error")
	message := "Wrap test message"

	tests := []struct {
		name         string
		constructor  func(error, string) *BeaverError
		expectedCode string
	}{
		{
			name:         "WrapGitHubError",
			constructor:  WrapGitHubError,
			expectedCode: ErrCodeGitHub,
		},
		{
			name:         "WrapAIError",
			constructor:  WrapAIError,
			expectedCode: ErrCodeAI,
		},
		{
			name:         "WrapConfigError",
			constructor:  WrapConfigError,
			expectedCode: ErrCodeConfig,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.constructor(originalErr, message)

			if err == nil {
				t.Fatalf("%s() returned nil", tt.name)
			}

			if err.Code != tt.expectedCode {
				t.Errorf("%s() Code = %q, want %q", tt.name, err.Code, tt.expectedCode)
			}

			if err.Message != message {
				t.Errorf("%s() Message = %q, want %q", tt.name, err.Message, message)
			}

			if err.Cause != originalErr {
				t.Errorf("%s() Cause = %v, want %v", tt.name, err.Cause, originalErr)
			}

			if err.Details == nil {
				t.Errorf("%s() Details should be initialized", tt.name)
			}
		})
	}
}

func TestErrorConstants(t *testing.T) {
	expectedConstants := map[string]string{
		"ErrCodeConfig":         "CONFIG_ERROR",
		"ErrCodeGitHub":         "GITHUB_ERROR",
		"ErrCodeAI":             "AI_ERROR",
		"ErrCodeWiki":           "WIKI_ERROR",
		"ErrCodeValidation":     "VALIDATION_ERROR",
		"ErrCodeNetwork":        "NETWORK_ERROR",
		"ErrCodeFileSystem":     "FILESYSTEM_ERROR",
		"ErrCodeAuthentication": "AUTH_ERROR",
		"ErrCodeRateLimit":      "RATE_LIMIT_ERROR",
	}

	actualConstants := map[string]string{
		"ErrCodeConfig":         ErrCodeConfig,
		"ErrCodeGitHub":         ErrCodeGitHub,
		"ErrCodeAI":             ErrCodeAI,
		"ErrCodeWiki":           ErrCodeWiki,
		"ErrCodeValidation":     ErrCodeValidation,
		"ErrCodeNetwork":        ErrCodeNetwork,
		"ErrCodeFileSystem":     ErrCodeFileSystem,
		"ErrCodeAuthentication": ErrCodeAuthentication,
		"ErrCodeRateLimit":      ErrCodeRateLimit,
	}

	for name, expected := range expectedConstants {
		if actual, ok := actualConstants[name]; !ok || actual != expected {
			t.Errorf("Constant %s = %q, want %q", name, actual, expected)
		}
	}
}

func TestBeaverError_IntegrationWithStandardLibrary(t *testing.T) {
	originalErr := errors.New("original error")
	beaverErr := Wrap(originalErr, "TEST_CODE", "Test message")

	// Test with errors.Is
	if !errors.Is(beaverErr, originalErr) {
		t.Error("errors.Is() should return true for wrapped error")
	}

	// Test with errors.As
	var target *BeaverError
	if !errors.As(beaverErr, &target) {
		t.Error("errors.As() should return true for BeaverError")
	}

	if target != beaverErr {
		t.Error("errors.As() should set target to the BeaverError")
	}

	// Test fmt.Errorf with %w verb
	wrappedAgain := fmt.Errorf("additional context: %w", beaverErr)
	if !errors.Is(wrappedAgain, originalErr) {
		t.Error("errors.Is() should work through multiple wrapping levels")
	}
}

func TestBeaverError_WithComplexDetails(t *testing.T) {
	err := New("COMPLEX_TEST", "Complex test error")

	// Add various types of details
	err.WithDetail("string", "test string").
		WithDetail("int", 42).
		WithDetail("bool", true).
		WithDetail("slice", []string{"a", "b", "c"}).
		WithDetail("map", map[string]int{"key1": 1, "key2": 2})

	if len(err.Details) != 5 {
		t.Errorf("Expected 5 details, got %d", len(err.Details))
	}

	// Verify each detail
	if err.Details["string"] != "test string" {
		t.Errorf("Details['string'] = %v, want 'test string'", err.Details["string"])
	}

	if err.Details["int"] != 42 {
		t.Errorf("Details['int'] = %v, want 42", err.Details["int"])
	}

	if err.Details["bool"] != true {
		t.Errorf("Details['bool'] = %v, want true", err.Details["bool"])
	}

	// Test overwriting detail
	err.WithDetail("string", "new value")
	if err.Details["string"] != "new value" {
		t.Errorf("Details['string'] after overwrite = %v, want 'new value'", err.Details["string"])
	}
}

// Test additional error constructors for Phase 1 coverage improvement
func TestAdditionalErrorConstructors(t *testing.T) {
	tests := []struct {
		name         string
		constructor  func(string) *BeaverError
		expectedCode string
		message      string
	}{
		{
			name:         "GitError",
			constructor:  GitError,
			expectedCode: ErrCodeGit,
			message:      "Git test message",
		},
		{
			name:         "RepositoryError",
			constructor:  RepositoryError,
			expectedCode: ErrCodeRepository,
			message:      "Repository test message",
		},
		{
			name:         "PermissionError",
			constructor:  PermissionError,
			expectedCode: ErrCodePermission,
			message:      "Permission test message",
		},
		{
			name:         "TimeoutError",
			constructor:  TimeoutError,
			expectedCode: ErrCodeTimeout,
			message:      "Timeout test message",
		},
		{
			name:         "DiskSpaceError",
			constructor:  DiskSpaceError,
			expectedCode: ErrCodeDiskSpace,
			message:      "DiskSpace test message",
		},
		{
			name:         "TokenScopeError",
			constructor:  TokenScopeError,
			expectedCode: ErrCodeTokenScope,
			message:      "TokenScope test message",
		},
		{
			name:         "ConnectivityError",
			constructor:  ConnectivityError,
			expectedCode: ErrCodeConnectivity,
			message:      "Connectivity test message",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.constructor(tt.message)

			if err == nil {
				t.Fatalf("%s() returned nil", tt.name)
			}

			if err.Code != tt.expectedCode {
				t.Errorf("%s() Code = %q, want %q", tt.name, err.Code, tt.expectedCode)
			}

			if err.Message != tt.message {
				t.Errorf("%s() Message = %q, want %q", tt.name, err.Message, tt.message)
			}

			if err.Cause != nil {
				t.Errorf("%s() Cause = %v, want nil", tt.name, err.Cause)
			}

			if err.Details == nil {
				t.Errorf("%s() Details should be initialized", tt.name)
			}
		})
	}
}

func TestAdditionalWrapErrorConstructors(t *testing.T) {
	originalErr := errors.New("original error")
	message := "Wrap test message"

	tests := []struct {
		name         string
		constructor  func(error, string) *BeaverError
		expectedCode string
	}{
		{
			name:         "WrapGitError",
			constructor:  WrapGitError,
			expectedCode: ErrCodeGit,
		},
		{
			name:         "WrapRepositoryError",
			constructor:  WrapRepositoryError,
			expectedCode: ErrCodeRepository,
		},
		{
			name:         "WrapTimeoutError",
			constructor:  WrapTimeoutError,
			expectedCode: ErrCodeTimeout,
		},
		{
			name:         "WrapConnectivityError",
			constructor:  WrapConnectivityError,
			expectedCode: ErrCodeConnectivity,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.constructor(originalErr, message)

			if err == nil {
				t.Fatalf("%s() returned nil", tt.name)
			}

			if err.Code != tt.expectedCode {
				t.Errorf("%s() Code = %q, want %q", tt.name, err.Code, tt.expectedCode)
			}

			if err.Message != message {
				t.Errorf("%s() Message = %q, want %q", tt.name, err.Message, message)
			}

			if err.Cause != originalErr {
				t.Errorf("%s() Cause = %v, want %v", tt.name, err.Cause, originalErr)
			}

			if err.Details == nil {
				t.Errorf("%s() Details should be initialized", tt.name)
			}
		})
	}
}

func TestBeaverError_GetUserFriendlyMessage(t *testing.T) {
	tests := []struct {
		name     string
		err      *BeaverError
		expected string
	}{
		{
			name: "Basic message without suggestions",
			err: &BeaverError{
				Code:    "TEST_ERROR",
				Message: "Test message",
			},
			expected: "Test message",
		},
		{
			name: "Message with suggestions",
			err: &BeaverError{
				Code:        "TEST_ERROR",
				Message:     "Test message",
				Suggestions: []string{"Suggestion 1", "Suggestion 2"},
			},
			expected: "Test message\n\n💡 Suggestions:\n  1. Suggestion 1\n  2. Suggestion 2",
		},
		{
			name: "Message with retry after",
			err: func() *BeaverError {
				duration := 30 * time.Second
				return &BeaverError{
					Code:       "TEST_ERROR",
					Message:    "Test message",
					RetryAfter: &duration,
				}
			}(),
			expected: "Test message\n\n⏱️  You can retry this operation after 30s",
		},
		{
			name: "Message with suggestions and retry after",
			err: func() *BeaverError {
				duration := 60 * time.Second
				return &BeaverError{
					Code:        "TEST_ERROR",
					Message:     "Test message",
					Suggestions: []string{"Check network"},
					RetryAfter:  &duration,
				}
			}(),
			expected: "Test message\n\n💡 Suggestions:\n  1. Check network\n\n⏱️  You can retry this operation after 1m0s",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.err.GetUserFriendlyMessage()
			if result != tt.expected {
				t.Errorf("GetUserFriendlyMessage() = %q, want %q", result, tt.expected)
			}
		})
	}
}

func TestBeaverError_IsRecoverable(t *testing.T) {
	tests := []struct {
		name        string
		err         *BeaverError
		recoverable bool
	}{
		{
			name: "Not recoverable by default",
			err: &BeaverError{
				Code:        "TEST_ERROR",
				Message:     "Test message",
				Recoverable: false,
			},
			recoverable: false,
		},
		{
			name: "Explicitly recoverable",
			err: &BeaverError{
				Code:        "TEST_ERROR",
				Message:     "Test message",
				Recoverable: true,
			},
			recoverable: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.err.IsRecoverable()
			if result != tt.recoverable {
				t.Errorf("IsRecoverable() = %v, want %v", result, tt.recoverable)
			}
		})
	}
}

func TestBeaverError_GetRetryAfter(t *testing.T) {
	tests := []struct {
		name       string
		err        *BeaverError
		retryAfter *time.Duration
	}{
		{
			name: "No retry after",
			err: &BeaverError{
				Code:    "TEST_ERROR",
				Message: "Test message",
			},
			retryAfter: nil,
		},
		{
			name: "With retry after",
			err: func() *BeaverError {
				duration := 30 * time.Second
				return &BeaverError{
					Code:       "TEST_ERROR",
					Message:    "Test message",
					RetryAfter: &duration,
				}
			}(),
			retryAfter: func() *time.Duration {
				duration := 30 * time.Second
				return &duration
			}(),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.err.GetRetryAfter()
			if (result == nil) != (tt.retryAfter == nil) {
				t.Errorf("GetRetryAfter() = %v, want %v", result, tt.retryAfter)
			}
			if result != nil && tt.retryAfter != nil && *result != *tt.retryAfter {
				t.Errorf("GetRetryAfter() = %v, want %v", *result, *tt.retryAfter)
			}
		})
	}
}

func TestBeaverError_WithSuggestion(t *testing.T) {
	err := New("TEST_CODE", "Test message")

	// Add a suggestion
	result := err.WithSuggestion("Suggestion 1")

	// Should return the same instance
	if result != err {
		t.Error("WithSuggestion() should return the same instance")
	}

	// Check suggestion was added
	if len(err.Suggestions) != 1 {
		t.Errorf("WithSuggestion() Suggestions length = %d, want 1", len(err.Suggestions))
	}

	if err.Suggestions[0] != "Suggestion 1" {
		t.Errorf("WithSuggestion() Suggestions[0] = %v, want 'Suggestion 1'", err.Suggestions[0])
	}

	// Add another suggestion
	err.WithSuggestion("Suggestion 2")

	if len(err.Suggestions) != 2 {
		t.Errorf("WithSuggestion() Suggestions length = %d, want 2", len(err.Suggestions))
	}

	if err.Suggestions[1] != "Suggestion 2" {
		t.Errorf("WithSuggestion() Suggestions[1] = %v, want 'Suggestion 2'", err.Suggestions[1])
	}
}

func TestBeaverError_WithRetryAfter(t *testing.T) {
	err := New("TEST_CODE", "Test message")
	duration := 30 * time.Second

	// Add retry after
	result := err.WithRetryAfter(duration)

	// Should return the same instance
	if result != err {
		t.Error("WithRetryAfter() should return the same instance")
	}

	// Check retry after was set
	if err.RetryAfter == nil {
		t.Error("WithRetryAfter() should set RetryAfter")
	}

	if *err.RetryAfter != duration {
		t.Errorf("WithRetryAfter() RetryAfter = %v, want %v", *err.RetryAfter, duration)
	}

	// Should mark as recoverable
	if !err.Recoverable {
		t.Error("WithRetryAfter() should mark error as recoverable")
	}
}

func TestBeaverError_AsRecoverable(t *testing.T) {
	err := New("TEST_CODE", "Test message")

	// Initially not recoverable
	if err.Recoverable {
		t.Error("New error should not be recoverable by default")
	}

	// Mark as recoverable
	result := err.AsRecoverable()

	// Should return the same instance
	if result != err {
		t.Error("AsRecoverable() should return the same instance")
	}

	// Should be marked as recoverable
	if !err.Recoverable {
		t.Error("AsRecoverable() should mark error as recoverable")
	}
}

func TestAdditionalErrorConstants(t *testing.T) {
	expectedConstants := map[string]string{
		"ErrCodeGit":          "GIT_ERROR",
		"ErrCodeRepository":   "REPOSITORY_ERROR",
		"ErrCodePermission":   "PERMISSION_ERROR",
		"ErrCodeTimeout":      "TIMEOUT_ERROR",
		"ErrCodeDiskSpace":    "DISK_SPACE_ERROR",
		"ErrCodeTokenScope":   "TOKEN_SCOPE_ERROR",
		"ErrCodeConnectivity": "CONNECTIVITY_ERROR",
	}

	actualConstants := map[string]string{
		"ErrCodeGit":          ErrCodeGit,
		"ErrCodeRepository":   ErrCodeRepository,
		"ErrCodePermission":   ErrCodePermission,
		"ErrCodeTimeout":      ErrCodeTimeout,
		"ErrCodeDiskSpace":    ErrCodeDiskSpace,
		"ErrCodeTokenScope":   ErrCodeTokenScope,
		"ErrCodeConnectivity": ErrCodeConnectivity,
	}

	for name, expected := range expectedConstants {
		if actual, ok := actualConstants[name]; !ok || actual != expected {
			t.Errorf("Constant %s = %q, want %q", name, actual, expected)
		}
	}
}

package errors

import (
	"errors"
	"fmt"
	"testing"
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

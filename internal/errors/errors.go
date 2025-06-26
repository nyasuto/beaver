package errors

import (
	"fmt"
)

// BeaverError represents a structured error with additional context
type BeaverError struct {
	Code     string
	Message  string
	Details  map[string]interface{}
	Cause    error
}

func (e *BeaverError) Error() string {
	if e.Cause != nil {
		return fmt.Sprintf("[%s] %s: %v", e.Code, e.Message, e.Cause)
	}
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

func (e *BeaverError) Unwrap() error {
	return e.Cause
}

// New creates a new BeaverError
func New(code, message string) *BeaverError {
	return &BeaverError{
		Code:    code,
		Message: message,
		Details: make(map[string]interface{}),
	}
}

// Wrap wraps an existing error with additional context
func Wrap(err error, code, message string) *BeaverError {
	return &BeaverError{
		Code:    code,
		Message: message,
		Details: make(map[string]interface{}),
		Cause:   err,
	}
}

// WithDetail adds a detail field to the error
func (e *BeaverError) WithDetail(key string, value interface{}) *BeaverError {
	e.Details[key] = value
	return e
}

// Common error codes
const (
	ErrCodeConfig        = "CONFIG_ERROR"
	ErrCodeGitHub        = "GITHUB_ERROR"
	ErrCodeAI            = "AI_ERROR"
	ErrCodeWiki          = "WIKI_ERROR"
	ErrCodeValidation    = "VALIDATION_ERROR"
	ErrCodeNetwork       = "NETWORK_ERROR"
	ErrCodeFileSystem    = "FILESYSTEM_ERROR"
	ErrCodeAuthentication = "AUTH_ERROR"
	ErrCodeRateLimit     = "RATE_LIMIT_ERROR"
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
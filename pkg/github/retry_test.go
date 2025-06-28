package github

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"testing"
	"time"

	"github.com/google/go-github/v60/github"
	"github.com/nyasuto/beaver/internal/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRetryConfig(t *testing.T) {
	t.Run("DefaultRetryConfig", func(t *testing.T) {
		config := DefaultRetryConfig()

		assert.Equal(t, 5, config.MaxRetries)
		assert.Equal(t, 1*time.Second, config.BaseDelay)
		assert.Equal(t, 30*time.Second, config.MaxDelay)
		assert.Equal(t, 2.0, config.Multiplier)
		assert.Equal(t, 0.1, config.JitterFactor)
	})
}

func TestIsRetryableError(t *testing.T) {
	service := &Service{
		logger: slog.New(slog.NewTextHandler(os.Stderr, nil)),
	}

	tests := []struct {
		name        string
		err         error
		resp        *github.Response
		shouldRetry bool
	}{
		{
			name:        "nil error",
			err:         nil,
			resp:        nil,
			shouldRetry: false,
		},
		{
			name: "500 internal server error",
			err:  fmt.Errorf("server error"),
			resp: &github.Response{
				Response: &http.Response{StatusCode: http.StatusInternalServerError},
			},
			shouldRetry: true,
		},
		{
			name: "502 bad gateway",
			err:  fmt.Errorf("bad gateway"),
			resp: &github.Response{
				Response: &http.Response{StatusCode: http.StatusBadGateway},
			},
			shouldRetry: true,
		},
		{
			name: "503 service unavailable",
			err:  fmt.Errorf("service unavailable"),
			resp: &github.Response{
				Response: &http.Response{StatusCode: http.StatusServiceUnavailable},
			},
			shouldRetry: true,
		},
		{
			name: "504 gateway timeout",
			err:  fmt.Errorf("gateway timeout"),
			resp: &github.Response{
				Response: &http.Response{StatusCode: http.StatusGatewayTimeout},
			},
			shouldRetry: true,
		},
		{
			name: "400 bad request",
			err:  fmt.Errorf("bad request"),
			resp: &github.Response{
				Response: &http.Response{StatusCode: http.StatusBadRequest},
			},
			shouldRetry: false,
		},
		{
			name: "404 not found",
			err:  fmt.Errorf("not found"),
			resp: &github.Response{
				Response: &http.Response{StatusCode: http.StatusNotFound},
			},
			shouldRetry: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.isRetryableError(tt.err, tt.resp)
			assert.Equal(t, tt.shouldRetry, result)
		})
	}
}

func TestIsRateLimitError(t *testing.T) {
	service := &Service{
		logger: slog.New(slog.NewTextHandler(os.Stderr, nil)),
	}

	tests := []struct {
		name        string
		err         error
		resp        *github.Response
		isRateLimit bool
	}{
		{
			name: "rate limit error with header",
			err:  fmt.Errorf("rate limit exceeded"),
			resp: &github.Response{
				Response: &http.Response{
					StatusCode: http.StatusForbidden,
					Header: http.Header{
						"X-RateLimit-Reset": []string{"1234567890"},
					},
				},
			},
			isRateLimit: true,
		},
		{
			name: "403 without rate limit header",
			err:  fmt.Errorf("forbidden"),
			resp: &github.Response{
				Response: &http.Response{
					StatusCode: http.StatusForbidden,
					Header:     http.Header{},
				},
			},
			isRateLimit: false,
		},
		{
			name:        "rate limit in error message",
			err:         fmt.Errorf("API rate limit exceeded"),
			resp:        nil,
			isRateLimit: true,
		},
		{
			name:        "regular error",
			err:         fmt.Errorf("some other error"),
			resp:        nil,
			isRateLimit: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.isRateLimitError(tt.err, tt.resp)
			assert.Equal(t, tt.isRateLimit, result)
		})
	}
}

func TestCalculateBackoff(t *testing.T) {
	service := &Service{
		logger: slog.New(slog.NewTextHandler(os.Stderr, nil)),
	}
	config := DefaultRetryConfig()

	tests := []struct {
		name     string
		attempt  int
		expected time.Duration
	}{
		{
			name:     "first retry",
			attempt:  0,
			expected: config.BaseDelay, // 1 second
		},
		{
			name:     "second retry",
			attempt:  1,
			expected: 2 * config.BaseDelay, // 2 seconds
		},
		{
			name:     "third retry",
			attempt:  2,
			expected: 4 * config.BaseDelay, // 4 seconds
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Set jitter to 0 for predictable testing
			configCopy := *config
			configCopy.JitterFactor = 0

			result := service.calculateBackoff(tt.attempt, &configCopy)
			assert.Equal(t, tt.expected, result)
		})
	}

	t.Run("max delay cap", func(t *testing.T) {
		configCopy := *config
		configCopy.JitterFactor = 0

		// Very high attempt should be capped at MaxDelay
		result := service.calculateBackoff(10, &configCopy)
		assert.Equal(t, config.MaxDelay, result)
	})

	t.Run("with jitter", func(t *testing.T) {
		// Test that jitter adds some variation
		baseDelay := service.calculateBackoff(0, config)

		// With jitter, the delay should be close to base delay but not exactly the same
		// We'll just test that it's within reasonable bounds
		assert.True(t, baseDelay >= config.BaseDelay/2)
		assert.True(t, baseDelay <= config.BaseDelay*2)
	})
}

func TestEnhanceGitHubError(t *testing.T) {
	service := &Service{
		logger: slog.New(slog.NewTextHandler(os.Stderr, nil)),
	}

	tests := []struct {
		name          string
		err           error
		resp          *github.Response
		expectedCode  string
		shouldContain string
	}{
		{
			name: "rate limit error",
			err:  fmt.Errorf("rate limit exceeded"),
			resp: &github.Response{
				Response: &http.Response{
					StatusCode: http.StatusForbidden,
					Header: http.Header{
						"X-RateLimit-Reset": []string{strconv.FormatInt(time.Now().Add(time.Hour).Unix(), 10)},
					},
				},
			},
			expectedCode:  errors.ErrCodeRateLimit,
			shouldContain: "rate limit exceeded",
		},
		{
			name: "authentication error",
			err:  fmt.Errorf("bad credentials"),
			resp: &github.Response{
				Response: &http.Response{StatusCode: http.StatusUnauthorized},
			},
			expectedCode:  errors.ErrCodeAuthentication,
			shouldContain: "Authentication failed",
		},
		{
			name: "permission error",
			err:  fmt.Errorf("insufficient permissions"),
			resp: &github.Response{
				Response: &http.Response{StatusCode: http.StatusForbidden},
			},
			expectedCode:  errors.ErrCodePermission,
			shouldContain: "Insufficient permissions",
		},
		{
			name: "not found error",
			err:  fmt.Errorf("repository not found"),
			resp: &github.Response{
				Response: &http.Response{StatusCode: http.StatusNotFound},
			},
			expectedCode:  errors.ErrCodeRepository,
			shouldContain: "not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.enhanceGitHubError(tt.err, tt.resp)

			beaverErr, ok := result.(*errors.BeaverError)
			require.True(t, ok, "Expected BeaverError")

			assert.Equal(t, tt.expectedCode, beaverErr.Code)
			assert.Contains(t, beaverErr.Message, tt.shouldContain)
		})
	}
}

func TestHandleRateLimitError(t *testing.T) {
	service := &Service{
		logger: slog.New(slog.NewTextHandler(os.Stderr, nil)),
	}

	t.Run("with reset header", func(t *testing.T) {
		// Set reset time to 200ms in the future, and use Unix() which truncates to seconds
		// We need to account for this truncation in our test
		now := time.Now()
		resetTime := now.Add(200 * time.Millisecond)
		resetUnix := resetTime.Unix()

		resp := &github.Response{
			Response: &http.Response{
				Header: http.Header{
					"X-RateLimit-Reset": []string{strconv.FormatInt(resetUnix, 10)},
				},
			},
		}

		ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
		defer cancel()

		start := time.Now()
		err := service.handleRateLimitError(ctx, resp)
		duration := time.Since(start)

		// If resetUnix is in the future, it should wait; if it's now or past, it defaults to 1 minute and times out
		if resetUnix > now.Unix() {
			assert.NoError(t, err)
			assert.True(t, duration >= 100*time.Millisecond) // Should wait some time
		} else {
			// If reset time is in the past/now, it uses 1 minute default and times out
			beaverErr, ok := err.(*errors.BeaverError)
			require.True(t, ok, "Expected BeaverError")
			assert.Equal(t, errors.ErrCodeRateLimit, beaverErr.Code)
			assert.True(t, beaverErr.Details["context_cancelled"].(bool))
		}
	})

	t.Run("context cancellation", func(t *testing.T) {
		// Set reset time far in the future
		resetTime := time.Now().Add(1 * time.Hour)
		resp := &github.Response{
			Response: &http.Response{
				Header: http.Header{
					"X-RateLimit-Reset": []string{strconv.FormatInt(resetTime.Unix(), 10)},
				},
			},
		}

		ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
		defer cancel()

		err := service.handleRateLimitError(ctx, resp)

		beaverErr, ok := err.(*errors.BeaverError)
		require.True(t, ok, "Expected BeaverError")
		assert.Equal(t, errors.ErrCodeRateLimit, beaverErr.Code)
		assert.True(t, beaverErr.Details["context_cancelled"].(bool))
	})

	t.Run("without reset header", func(t *testing.T) {
		resp := &github.Response{
			Response: &http.Response{
				Header: http.Header{},
			},
		}

		ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
		defer cancel()

		start := time.Now()
		err := service.handleRateLimitError(ctx, resp)
		duration := time.Since(start)

		// When no reset header, it defaults to 1 minute wait, but context times out
		// So we expect a rate limit error with context_cancelled
		beaverErr, ok := err.(*errors.BeaverError)
		require.True(t, ok, "Expected BeaverError")
		assert.Equal(t, errors.ErrCodeRateLimit, beaverErr.Code)
		assert.True(t, beaverErr.Details["context_cancelled"].(bool))
		assert.True(t, duration >= 190*time.Millisecond) // Should wait close to timeout
		assert.True(t, duration < 250*time.Millisecond)  // Should not exceed timeout significantly
	})
}

func TestIsNetworkError(t *testing.T) {
	tests := []struct {
		name      string
		err       error
		isNetwork bool
	}{
		{
			name:      "timeout error",
			err:       fmt.Errorf("operation timeout exceeded"),
			isNetwork: true,
		},
		{
			name:      "connection refused",
			err:       fmt.Errorf("connection refused"),
			isNetwork: true,
		},
		{
			name:      "connection reset",
			err:       fmt.Errorf("connection reset by peer"),
			isNetwork: true,
		},
		{
			name:      "dns error",
			err:       fmt.Errorf("no such host"),
			isNetwork: true,
		},
		{
			name:      "network unreachable",
			err:       fmt.Errorf("network is unreachable"),
			isNetwork: true,
		},
		{
			name:      "temporary dns failure",
			err:       fmt.Errorf("temporary failure in name resolution"),
			isNetwork: true,
		},
		{
			name:      "validation error",
			err:       fmt.Errorf("invalid input format"),
			isNetwork: false,
		},
		{
			name:      "nil error",
			err:       nil,
			isNetwork: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isNetworkError(tt.err)
			assert.Equal(t, tt.isNetwork, result)
		})
	}
}

func TestContainsAnySubstring(t *testing.T) {
	tests := []struct {
		name       string
		text       string
		substrings []string
		expected   bool
	}{
		{
			name:       "contains first substring",
			text:       "This is a test message",
			substrings: []string{"test", "example"},
			expected:   true,
		},
		{
			name:       "contains second substring",
			text:       "This is an example message",
			substrings: []string{"test", "example"},
			expected:   true,
		},
		{
			name:       "case insensitive match",
			text:       "This is a TEST message",
			substrings: []string{"test", "example"},
			expected:   true,
		},
		{
			name:       "no match",
			text:       "This is a different message",
			substrings: []string{"test", "example"},
			expected:   false,
		},
		{
			name:       "empty substrings",
			text:       "This is a test message",
			substrings: []string{},
			expected:   false,
		},
		{
			name:       "empty text",
			text:       "",
			substrings: []string{"test"},
			expected:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := containsAnySubstring(tt.text, tt.substrings)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// MockOperation helps test retry behavior
type MockOperation struct {
	attempts       int
	maxAttempts    int
	errorOnAttempt map[int]error
	responses      map[int]*github.Response
}

func NewMockOperation(maxAttempts int) *MockOperation {
	return &MockOperation{
		attempts:       0,
		maxAttempts:    maxAttempts,
		errorOnAttempt: make(map[int]error),
		responses:      make(map[int]*github.Response),
	}
}

func (m *MockOperation) SetErrorOnAttempt(attempt int, err error, resp *github.Response) {
	m.errorOnAttempt[attempt] = err
	if resp != nil {
		m.responses[attempt] = resp
	}
}

func (m *MockOperation) Execute(ctx context.Context) (*github.Response, error) {
	m.attempts++

	if err, exists := m.errorOnAttempt[m.attempts]; exists {
		resp := m.responses[m.attempts]
		return resp, err
	}

	// Default success response
	return &github.Response{
		Response: &http.Response{StatusCode: http.StatusOK},
	}, nil
}

func TestExecuteWithRetry(t *testing.T) {
	t.Run("success on first attempt", func(t *testing.T) {
		service := &Service{
			logger: slog.New(slog.NewTextHandler(os.Stderr, nil)),
		}
		mock := NewMockOperation(1)

		ctx := context.Background()
		resp, err := service.ExecuteWithRetry(ctx, mock.Execute)

		assert.NoError(t, err)
		assert.NotNil(t, resp)
		assert.Equal(t, 1, mock.attempts)
	})

	t.Run("success after retries", func(t *testing.T) {
		service := &Service{
			logger: slog.New(slog.NewTextHandler(os.Stderr, nil)),
		}
		mock := NewMockOperation(3)

		// Fail first two attempts, succeed on third
		mock.SetErrorOnAttempt(1, fmt.Errorf("server error"), &github.Response{
			Response: &http.Response{StatusCode: http.StatusInternalServerError},
		})
		mock.SetErrorOnAttempt(2, fmt.Errorf("server error"), &github.Response{
			Response: &http.Response{StatusCode: http.StatusInternalServerError},
		})

		ctx := context.Background()
		resp, err := service.ExecuteWithRetry(ctx, mock.Execute)

		assert.NoError(t, err)
		assert.NotNil(t, resp)
		assert.Equal(t, 3, mock.attempts)
	})

	t.Run("non-retryable error fails immediately", func(t *testing.T) {
		service := &Service{
			logger: slog.New(slog.NewTextHandler(os.Stderr, nil)),
		}
		mock := NewMockOperation(1)

		// 400 Bad Request is not retryable
		mock.SetErrorOnAttempt(1, fmt.Errorf("bad request"), &github.Response{
			Response: &http.Response{StatusCode: http.StatusBadRequest},
		})

		ctx := context.Background()
		resp, err := service.ExecuteWithRetry(ctx, mock.Execute)

		assert.Error(t, err)
		assert.NotNil(t, resp)
		assert.Equal(t, 1, mock.attempts)
	})

	t.Run("max retries exceeded", func(t *testing.T) {
		service := &Service{
			logger: slog.New(slog.NewTextHandler(os.Stderr, nil)),
		}
		mock := NewMockOperation(10)

		// Always fail with retryable error
		for i := 1; i <= 6; i++ { // DefaultRetryConfig has MaxRetries = 5
			mock.SetErrorOnAttempt(i, fmt.Errorf("server error"), &github.Response{
				Response: &http.Response{StatusCode: http.StatusInternalServerError},
			})
		}

		ctx := context.Background()
		resp, err := service.ExecuteWithRetry(ctx, mock.Execute)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed after")
		assert.Equal(t, 5, mock.attempts) // Should stop at MaxRetries
		_ = resp                          // Avoid unused variable warning
	})
}

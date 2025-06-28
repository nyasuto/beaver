package github

import (
	"context"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/go-github/v60/github"
	"github.com/nyasuto/beaver/internal/errors"
)

// RetryConfig defines configuration for GitHub API retry logic
type RetryConfig struct {
	MaxRetries   int
	BaseDelay    time.Duration
	MaxDelay     time.Duration
	Multiplier   float64
	JitterFactor float64
}

// DefaultRetryConfig returns sensible defaults for GitHub API retry
func DefaultRetryConfig() *RetryConfig {
	return &RetryConfig{
		MaxRetries:   5,
		BaseDelay:    1 * time.Second,
		MaxDelay:     30 * time.Second,
		Multiplier:   2.0,
		JitterFactor: 0.1,
	}
}

// RetryableOperation represents a GitHub API operation that can be retried
type RetryableOperation func(ctx context.Context) (*github.Response, error)

// ExecuteWithRetry executes a GitHub API operation with automatic retry and rate limit handling
func (s *Service) ExecuteWithRetry(ctx context.Context, operation RetryableOperation) (*github.Response, error) {
	config := DefaultRetryConfig()

	for attempt := 0; attempt < config.MaxRetries; attempt++ {
		// Check rate limit before making request (skip if no client for testing)
		if s.client != nil {
			if err := s.waitForRateLimit(ctx); err != nil {
				return nil, err
			}
		}

		// Execute the operation
		resp, err := operation(ctx)

		// Success case
		if err == nil {
			return resp, nil
		}

		// Check if error is retryable
		if !s.isRetryableError(err, resp) {
			return resp, s.enhanceGitHubError(err, resp)
		}

		// Handle rate limit errors specifically
		if s.isRateLimitError(err, resp) {
			if waitErr := s.handleRateLimitError(ctx, resp); waitErr != nil {
				return resp, waitErr
			}
			continue // Retry immediately after waiting
		}

		// For other retryable errors, use exponential backoff
		if attempt < config.MaxRetries-1 {
			delay := s.calculateBackoff(attempt, config)
			s.logger.Info("Retrying GitHub API request",
				"attempt", attempt+1,
				"delay", delay,
				"error", err)

			select {
			case <-time.After(delay):
				continue
			case <-ctx.Done():
				return resp, ctx.Err()
			}
		}
	}

	return nil, errors.GitHubError(fmt.Sprintf("GitHub API request failed after %d attempts", config.MaxRetries))
}

// waitForRateLimit checks and waits if rate limit is approaching
func (s *Service) waitForRateLimit(ctx context.Context) error {
	rateLimit, err := s.checkRateLimit(ctx)
	if err != nil {
		s.logger.Warn("Could not check rate limit", "error", err)
		return nil // Continue without rate limit check
	}

	// If we're down to very few requests, wait for reset
	if rateLimit.Remaining < 5 {
		waitTime := time.Until(rateLimit.ResetTime)
		if waitTime > 0 && waitTime < 10*time.Minute {
			s.logger.Info("Rate limit nearly exhausted, waiting for reset",
				"remaining", rateLimit.Remaining,
				"wait_time", waitTime)

			select {
			case <-time.After(waitTime):
				return nil
			case <-ctx.Done():
				return ctx.Err()
			}
		}
	}

	return nil
}

// isRetryableError determines if an error should trigger a retry
func (s *Service) isRetryableError(err error, resp *github.Response) bool {
	if err == nil {
		return false
	}

	// Check for rate limit errors
	if s.isRateLimitError(err, resp) {
		return true
	}

	// Check for temporary network errors
	if isNetworkError(err) {
		return true
	}

	// Check for specific HTTP status codes that are retryable
	if resp != nil && resp.Response != nil {
		statusCode := resp.StatusCode
		switch statusCode {
		case http.StatusInternalServerError, // 500
			http.StatusBadGateway,         // 502
			http.StatusServiceUnavailable, // 503
			http.StatusGatewayTimeout:     // 504
			return true
		}
	}

	return false
}

// isRateLimitError checks if the error is a rate limit error
func (s *Service) isRateLimitError(err error, resp *github.Response) bool {
	if resp != nil && resp.Response != nil {
		if resp.StatusCode == http.StatusForbidden {
			// Check rate limit headers
			if resetTime := resp.Header.Get("X-RateLimit-Reset"); resetTime != "" {
				return true
			}
		}
	}

	// Also check error message for rate limit specific messages
	if err != nil {
		errMsg := err.Error()
		return containsAnySubstring(errMsg, []string{
			"rate limit",
			"API rate limit exceeded",
		})
	}

	return false
}

// handleRateLimitError handles rate limit errors by waiting for reset
func (s *Service) handleRateLimitError(ctx context.Context, resp *github.Response) error {
	var resetTime time.Time

	// Try to get reset time from headers
	if resp != nil && resp.Response != nil {
		if resetHeader := resp.Header.Get("X-RateLimit-Reset"); resetHeader != "" {
			if resetUnix, err := strconv.ParseInt(resetHeader, 10, 64); err == nil {
				resetTime = time.Unix(resetUnix, 0)
			}
		}
	}

	// If we couldn't get reset time, use a default wait
	if resetTime.IsZero() {
		resetTime = time.Now().Add(1 * time.Minute)
	}

	waitTime := time.Until(resetTime)
	if waitTime < 0 {
		waitTime = 1 * time.Minute
	}

	// Cap wait time to prevent excessive delays
	if waitTime > 10*time.Minute {
		waitTime = 10 * time.Minute
	}

	s.logger.Info("Rate limit exceeded, waiting for reset",
		"wait_time", waitTime,
		"reset_time", resetTime)

	select {
	case <-time.After(waitTime):
		return nil
	case <-ctx.Done():
		return errors.NewRateLimitError(resetTime).WithDetail("context_canceled", true)
	}
}

// enhanceGitHubError converts GitHub API errors to enhanced Beaver errors
func (s *Service) enhanceGitHubError(err error, resp *github.Response) error {
	if err == nil {
		return nil
	}

	// Handle rate limit errors
	if s.isRateLimitError(err, resp) {
		var resetTime time.Time
		if resp != nil && resp.Response != nil {
			if resetHeader := resp.Header.Get("X-RateLimit-Reset"); resetHeader != "" {
				if resetUnix, err := strconv.ParseInt(resetHeader, 10, 64); err == nil {
					resetTime = time.Unix(resetUnix, 0)
				}
			}
		}
		if resetTime.IsZero() {
			resetTime = time.Now().Add(1 * time.Hour)
		}
		return errors.NewRateLimitError(resetTime)
	}

	// Handle authentication errors
	if resp != nil && resp.Response != nil && resp.StatusCode == http.StatusUnauthorized {
		return errors.NewAuthenticationError("GitHub API request", err)
	}

	// Handle permission errors
	if resp != nil && resp.Response != nil && resp.StatusCode == http.StatusForbidden {
		return errors.PermissionError("Insufficient permissions for GitHub API request").
			WithSuggestion("Check that your GitHub token has the required scopes").
			WithSuggestion("Verify you have access to the repository").
			WithDetail("status_code", resp.StatusCode)
	}

	// Handle not found errors
	if resp != nil && resp.Response != nil && resp.StatusCode == http.StatusNotFound {
		return errors.NewRepositoryNotFoundError("repository or resource")
	}

	// Handle network timeouts
	if isNetworkError(err) {
		return errors.NewNetworkTimeoutError("GitHub API request", err)
	}

	// Generic GitHub error
	return errors.WrapGitHubError(err, "GitHub API request failed")
}

// calculateBackoff calculates exponential backoff delay with jitter
func (s *Service) calculateBackoff(attempt int, config *RetryConfig) time.Duration {
	// Exponential backoff: baseDelay * multiplier^attempt
	delay := time.Duration(float64(config.BaseDelay) * math.Pow(config.Multiplier, float64(attempt)))

	// Cap at max delay
	if delay > config.MaxDelay {
		delay = config.MaxDelay
	}

	// Add jitter to avoid thundering herd
	if config.JitterFactor > 0 {
		jitter := time.Duration(float64(delay) * config.JitterFactor * (2*randomFloat() - 1))
		delay += jitter
	}

	return delay
}

// Helper functions

func isNetworkError(err error) bool {
	if err == nil {
		return false
	}
	errMsg := err.Error()
	return containsAnySubstring(errMsg, []string{
		"timeout",
		"connection refused",
		"connection reset",
		"no such host",
		"network is unreachable",
		"temporary failure in name resolution",
	})
}

func containsAnySubstring(s string, substrings []string) bool {
	sLower := strings.ToLower(s)
	for _, substr := range substrings {
		if strings.Contains(sLower, strings.ToLower(substr)) {
			return true
		}
	}
	return false
}

func randomFloat() float64 {
	// Simple pseudo-random number for jitter
	// In production, you might want to use crypto/rand
	return float64(time.Now().UnixNano()%1000) / 1000.0
}

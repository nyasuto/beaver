package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/go-playground/validator/v10"
)

// Client represents the AI service client
type Client struct {
	baseURL    string
	httpClient *http.Client
	validator  *validator.Validate
}

// NewClient creates a new AI service client
func NewClient(baseURL string, timeout time.Duration) *Client {
	if timeout == 0 {
		timeout = 30 * time.Second
	}

	return &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: timeout,
		},
		validator: validator.New(),
	}
}

// SetTimeout updates the client timeout
func (c *Client) SetTimeout(timeout time.Duration) {
	c.httpClient.Timeout = timeout
}

// SummarizeIssue calls the AI service to summarize a GitHub issue
func (c *Client) SummarizeIssue(ctx context.Context, req *SummarizationRequest) (*SummarizationResponse, error) {
	if err := c.validator.Struct(req); err != nil {
		return nil, fmt.Errorf("validation failed: %w", err)
	}

	// Build URL
	endpoint, err := url.JoinPath(c.baseURL, "/api/v1/summarize")
	if err != nil {
		return nil, fmt.Errorf("failed to build URL: %w", err)
	}

	// Marshal request
	reqBody, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json")

	// Execute request
	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Handle error responses
	if resp.StatusCode >= 400 {
		var errResp ErrorResponse
		if err := json.Unmarshal(body, &errResp); err != nil {
			return nil, fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(body))
		}
		return nil, fmt.Errorf("API error (status %d): %s", resp.StatusCode, errResp.Error)
	}

	// Parse successful response
	var result SummarizationResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &result, nil
}

// SummarizeIssuesBatch calls the AI service to summarize multiple issues
func (c *Client) SummarizeIssuesBatch(ctx context.Context, req *BatchSummarizationRequest) (*BatchSummarizationResponse, error) {
	if err := c.validator.Struct(req); err != nil {
		return nil, fmt.Errorf("validation failed: %w", err)
	}

	// Build URL
	endpoint, err := url.JoinPath(c.baseURL, "/api/v1/summarize/batch")
	if err != nil {
		return nil, fmt.Errorf("failed to build URL: %w", err)
	}

	// Marshal request
	reqBody, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json")

	// Execute request
	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Handle error responses
	if resp.StatusCode >= 400 {
		var errResp ErrorResponse
		if err := json.Unmarshal(body, &errResp); err != nil {
			return nil, fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(body))
		}
		return nil, fmt.Errorf("API error (status %d): %s", resp.StatusCode, errResp.Error)
	}

	// Parse successful response
	var result BatchSummarizationResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &result, nil
}

// HealthCheck calls the AI service health endpoint
func (c *Client) HealthCheck(ctx context.Context) (*HealthResponse, error) {
	// Build URL
	endpoint, err := url.JoinPath(c.baseURL, "/api/v1/health")
	if err != nil {
		return nil, fmt.Errorf("failed to build URL: %w", err)
	}

	// Create HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Accept", "application/json")

	// Execute request
	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Handle error responses
	if resp.StatusCode >= 400 {
		var errResp ErrorResponse
		if err := json.Unmarshal(body, &errResp); err != nil {
			return nil, fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(body))
		}
		return nil, fmt.Errorf("API error (status %d): %s", resp.StatusCode, errResp.Error)
	}

	// Parse successful response
	var result HealthResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &result, nil
}

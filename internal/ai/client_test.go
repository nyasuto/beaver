package ai

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestNewClient(t *testing.T) {
	tests := []struct {
		name        string
		baseURL     string
		timeout     time.Duration
		expectValid bool
	}{
		{
			name:        "valid client with timeout",
			baseURL:     "https://api.example.com",
			timeout:     30 * time.Second,
			expectValid: true,
		},
		{
			name:        "valid client with zero timeout (should use default)",
			baseURL:     "https://api.example.com",
			timeout:     0,
			expectValid: true,
		},
		{
			name:        "empty baseURL",
			baseURL:     "",
			timeout:     30 * time.Second,
			expectValid: true, // Client creation should succeed even with empty URL
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := NewClient(tt.baseURL, tt.timeout)

			if !tt.expectValid {
				if client != nil {
					t.Errorf("NewClient() should return nil for invalid input")
				}
				return
			}

			if client == nil {
				t.Fatalf("NewClient() returned nil")
			}

			if client.baseURL != tt.baseURL {
				t.Errorf("baseURL = %v, want %v", client.baseURL, tt.baseURL)
			}

			expectedTimeout := tt.timeout
			if expectedTimeout == 0 {
				expectedTimeout = 30 * time.Second
			}

			if client.httpClient.Timeout != expectedTimeout {
				t.Errorf("timeout = %v, want %v", client.httpClient.Timeout, expectedTimeout)
			}

			if client.validator == nil {
				t.Error("validator should be initialized")
			}
		})
	}
}

func TestClient_SetTimeout(t *testing.T) {
	client := NewClient("https://api.example.com", 30*time.Second)

	newTimeout := 60 * time.Second
	client.SetTimeout(newTimeout)

	if client.httpClient.Timeout != newTimeout {
		t.Errorf("SetTimeout() = %v, want %v", client.httpClient.Timeout, newTimeout)
	}
}

func TestClient_SummarizeIssue(t *testing.T) {
	// Test data
	validIssue := IssueData{
		ID:        123,
		Number:    1,
		Title:     "Test Issue",
		Body:      "This is a test issue",
		State:     "open",
		Labels:    []string{"bug"},
		Comments:  []IssueComment{},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		User:      "testuser",
	}

	tests := []struct {
		name           string
		request        *SummarizationRequest
		serverResponse func(w http.ResponseWriter, r *http.Request)
		expectError    bool
		errorContains  string
	}{
		{
			name: "successful summarization",
			request: &SummarizationRequest{
				Issue:           validIssue,
				IncludeComments: true,
				Language:        "ja",
			},
			serverResponse: func(w http.ResponseWriter, r *http.Request) {
				if r.Method != "POST" {
					t.Errorf("Expected POST request, got %s", r.Method)
				}
				if !strings.Contains(r.URL.Path, "/api/v1/summarize") {
					t.Errorf("Expected /api/v1/summarize endpoint, got %s", r.URL.Path)
				}

				response := SummarizationResponse{
					Summary:        "Test summary",
					KeyPoints:      []string{"Point 1", "Point 2"},
					Complexity:     "medium",
					ProcessingTime: 1.5,
					ProviderUsed:   ProviderOpenAI,
					ModelUsed:      "gpt-3.5-turbo",
				}
				w.Header().Set("Content-Type", "application/json")
				_ = json.NewEncoder(w).Encode(response)
			},
			expectError: false,
		},
		{
			name: "invalid request validation",
			request: &SummarizationRequest{
				// Missing required Issue field
				IncludeComments: true,
				Language:        "ja",
			},
			serverResponse: func(w http.ResponseWriter, r *http.Request) {
				// Should not reach server due to validation error
			},
			expectError:   true,
			errorContains: "validation failed",
		},
		{
			name: "server error response",
			request: &SummarizationRequest{
				Issue:           validIssue,
				IncludeComments: true,
				Language:        "ja",
			},
			serverResponse: func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusInternalServerError)
				errorResp := ErrorResponse{
					Error:  "Internal server error",
					Detail: stringPtr("Something went wrong"),
				}
				_ = json.NewEncoder(w).Encode(errorResp)
			},
			expectError:   true,
			errorContains: "API error",
		},
		{
			name: "invalid JSON response",
			request: &SummarizationRequest{
				Issue:           validIssue,
				IncludeComments: true,
				Language:        "ja",
			},
			serverResponse: func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				_, _ = w.Write([]byte("invalid json"))
			},
			expectError:   true,
			errorContains: "failed to parse response",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create test server
			server := httptest.NewServer(http.HandlerFunc(tt.serverResponse))
			defer server.Close()

			// Create client
			client := NewClient(server.URL, 5*time.Second)
			ctx := context.Background()

			// Call method
			result, err := client.SummarizeIssue(ctx, tt.request)

			// Check error expectation
			if tt.expectError {
				if err == nil {
					t.Errorf("Expected error but got none")
					return
				}
				if tt.errorContains != "" && !strings.Contains(err.Error(), tt.errorContains) {
					t.Errorf("Error should contain '%s', got: %v", tt.errorContains, err)
				}
				return
			}

			// Check success case
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
				return
			}

			if result == nil {
				t.Error("Result should not be nil")
				return
			}

			if result.Summary == "" {
				t.Error("Summary should not be empty")
			}
		})
	}
}

func TestClient_SummarizeIssuesBatch(t *testing.T) {
	// Test data
	validIssues := []IssueData{
		{
			ID:        123,
			Number:    1,
			Title:     "Test Issue 1",
			Body:      "This is test issue 1",
			State:     "open",
			Labels:    []string{"bug"},
			Comments:  []IssueComment{},
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
			User:      "testuser",
		},
		{
			ID:        124,
			Number:    2,
			Title:     "Test Issue 2",
			Body:      "This is test issue 2",
			State:     "closed",
			Labels:    []string{"enhancement"},
			Comments:  []IssueComment{},
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
			User:      "testuser",
		},
	}

	tests := []struct {
		name           string
		request        *BatchSummarizationRequest
		serverResponse func(w http.ResponseWriter, r *http.Request)
		expectError    bool
		errorContains  string
	}{
		{
			name: "successful batch summarization",
			request: &BatchSummarizationRequest{
				Issues:          validIssues,
				IncludeComments: true,
				Language:        "ja",
			},
			serverResponse: func(w http.ResponseWriter, r *http.Request) {
				if r.Method != "POST" {
					t.Errorf("Expected POST request, got %s", r.Method)
				}
				if !strings.Contains(r.URL.Path, "/api/v1/summarize/batch") {
					t.Errorf("Expected /api/v1/summarize/batch endpoint, got %s", r.URL.Path)
				}

				response := BatchSummarizationResponse{
					Results: []SummarizationResponse{
						{
							Summary:        "Summary 1",
							KeyPoints:      []string{"Point 1"},
							Complexity:     "medium",
							ProcessingTime: 1.0,
							ProviderUsed:   ProviderOpenAI,
							ModelUsed:      "gpt-3.5-turbo",
						},
						{
							Summary:        "Summary 2",
							KeyPoints:      []string{"Point 2"},
							Complexity:     "low",
							ProcessingTime: 0.8,
							ProviderUsed:   ProviderOpenAI,
							ModelUsed:      "gpt-3.5-turbo",
						},
					},
					TotalProcessed: 2,
					TotalFailed:    0,
					ProcessingTime: 1.8,
					FailedIssues:   []FailedIssue{},
				}
				w.Header().Set("Content-Type", "application/json")
				_ = json.NewEncoder(w).Encode(response)
			},
			expectError: false,
		},
		{
			name: "server error for batch",
			request: &BatchSummarizationRequest{
				Issues:          validIssues,
				IncludeComments: true,
				Language:        "ja",
			},
			serverResponse: func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusBadRequest)
				errorResp := ErrorResponse{
					Error: "Bad request",
				}
				_ = json.NewEncoder(w).Encode(errorResp)
			},
			expectError:   true,
			errorContains: "API error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create test server
			server := httptest.NewServer(http.HandlerFunc(tt.serverResponse))
			defer server.Close()

			// Create client
			client := NewClient(server.URL, 5*time.Second)
			ctx := context.Background()

			// Call method
			result, err := client.SummarizeIssuesBatch(ctx, tt.request)

			// Check error expectation
			if tt.expectError {
				if err == nil {
					t.Errorf("Expected error but got none")
					return
				}
				if tt.errorContains != "" && !strings.Contains(err.Error(), tt.errorContains) {
					t.Errorf("Error should contain '%s', got: %v", tt.errorContains, err)
				}
				return
			}

			// Check success case
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
				return
			}

			if result == nil {
				t.Error("Result should not be nil")
				return
			}

			if result.TotalProcessed != 2 {
				t.Errorf("TotalProcessed = %d, want 2", result.TotalProcessed)
			}
		})
	}
}

func TestClient_HealthCheck(t *testing.T) {
	tests := []struct {
		name           string
		serverResponse func(w http.ResponseWriter, r *http.Request)
		expectError    bool
		errorContains  string
	}{
		{
			name: "successful health check",
			serverResponse: func(w http.ResponseWriter, r *http.Request) {
				if r.Method != "GET" {
					t.Errorf("Expected GET request, got %s", r.Method)
				}
				if !strings.Contains(r.URL.Path, "/api/v1/health") {
					t.Errorf("Expected /api/v1/health endpoint, got %s", r.URL.Path)
				}

				response := HealthResponse{
					Status:      "healthy",
					Timestamp:   time.Now(),
					Version:     "1.0.0",
					Environment: "test",
					AIProviders: map[string]bool{
						"openai":    true,
						"anthropic": false,
					},
					Features: map[string]bool{
						"summarization": true,
						"batch":         true,
					},
				}
				w.Header().Set("Content-Type", "application/json")
				_ = json.NewEncoder(w).Encode(response)
			},
			expectError: false,
		},
		{
			name: "health check server error",
			serverResponse: func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusServiceUnavailable)
				errorResp := ErrorResponse{
					Error: "Service unavailable",
				}
				_ = json.NewEncoder(w).Encode(errorResp)
			},
			expectError:   true,
			errorContains: "API error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create test server
			server := httptest.NewServer(http.HandlerFunc(tt.serverResponse))
			defer server.Close()

			// Create client
			client := NewClient(server.URL, 5*time.Second)
			ctx := context.Background()

			// Call method
			result, err := client.HealthCheck(ctx)

			// Check error expectation
			if tt.expectError {
				if err == nil {
					t.Errorf("Expected error but got none")
					return
				}
				if tt.errorContains != "" && !strings.Contains(err.Error(), tt.errorContains) {
					t.Errorf("Error should contain '%s', got: %v", tt.errorContains, err)
				}
				return
			}

			// Check success case
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
				return
			}

			if result == nil {
				t.Error("Result should not be nil")
				return
			}

			if result.Status != "healthy" {
				t.Errorf("Status = %s, want healthy", result.Status)
			}
		})
	}
}

func TestClient_NetworkErrors(t *testing.T) {
	// Test with invalid server URL to trigger network errors
	client := NewClient("http://invalid-host-that-does-not-exist:9999", 1*time.Second)
	ctx := context.Background()

	validIssue := IssueData{
		ID:        123,
		Number:    1,
		Title:     "Test Issue",
		Body:      "This is a test issue",
		State:     "open",
		Labels:    []string{"bug"},
		Comments:  []IssueComment{},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		User:      "testuser",
	}

	t.Run("SummarizeIssue network error", func(t *testing.T) {
		request := &SummarizationRequest{
			Issue:           validIssue,
			IncludeComments: true,
			Language:        "ja",
		}

		_, err := client.SummarizeIssue(ctx, request)
		if err == nil {
			t.Error("Expected network error but got none")
		}
		if !strings.Contains(err.Error(), "request failed") {
			t.Errorf("Expected 'request failed' in error, got: %v", err)
		}
	})

	t.Run("HealthCheck network error", func(t *testing.T) {
		_, err := client.HealthCheck(ctx)
		if err == nil {
			t.Error("Expected network error but got none")
		}
	})
}

// Helper function for tests
func stringPtr(s string) *string {
	return &s
}

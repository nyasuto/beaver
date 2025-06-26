package github

import (
	"context"
	"testing"
)

func TestNewClient(t *testing.T) {
	tests := []struct {
		name  string
		token string
	}{
		{
			name:  "valid token",
			token: "ghp_test_token",
		},
		{
			name:  "empty token",
			token: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := NewClient(tt.token)
			if client == nil {
				t.Error("NewClient() returned nil client")
				return
			}
			if client.client == nil {
				t.Error("NewClient() did not initialize HTTP client")
			}
		})
	}
}

func TestClient_TestConnection(t *testing.T) {
	// Test with invalid token (should fail)
	client := NewClient("invalid_token")
	ctx := context.Background()

	err := client.TestConnection(ctx)
	if err == nil {
		t.Error("TestConnection() should fail with invalid token")
	}
}

func TestClient_GetRateLimit(t *testing.T) {
	// Test with invalid token (should fail)
	client := NewClient("invalid_token")
	ctx := context.Background()

	rateLimit, err := client.GetRateLimit(ctx)
	if err == nil {
		t.Error("GetRateLimit() should fail with invalid token")
	}
	if rateLimit != nil {
		t.Error("GetRateLimit() should return nil rate limit on error")
	}
}

func TestClient_FetchIssues(t *testing.T) {
	// Test with invalid token (should fail gracefully)
	client := NewClient("invalid_token")
	ctx := context.Background()

	issues, err := client.FetchIssues(ctx, "owner", "repo", nil)
	if err == nil {
		t.Error("FetchIssues() should fail with invalid token")
	}
	if issues != nil {
		t.Error("FetchIssues() should return nil issues on error")
	}
}

func TestClient_FetchIssueComments(t *testing.T) {
	// Test with invalid token (should fail gracefully)
	client := NewClient("invalid_token")
	ctx := context.Background()

	comments, err := client.FetchIssueComments(ctx, "owner", "repo", 1)
	if err == nil {
		t.Error("FetchIssueComments() should fail with invalid token")
	}
	if comments != nil {
		t.Error("FetchIssueComments() should return nil comments on error")
	}
}

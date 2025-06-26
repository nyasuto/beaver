package github

import (
	"context"
	"testing"

	"github.com/nyasuto/beaver/internal/models"
)

func TestNewService(t *testing.T) {
	service := NewService("test_token")
	if service == nil {
		t.Error("NewService() returned nil")
		return
	}
	if service.client == nil {
		t.Error("NewService() did not initialize client")
	}
}

func TestService_FetchIssues(t *testing.T) {
	service := NewService("invalid_token")
	ctx := context.Background()

	query := models.IssueQuery{
		Repository: "testowner/testrepo",
		State:      "open",
		Labels:     []string{"bug", "enhancement"},
		PerPage:    10,
		Page:       1,
	}

	// This should fail with invalid token but test the code path
	issues, err := service.FetchIssues(ctx, query)
	if err == nil {
		t.Error("FetchIssues() should fail with invalid token")
	}
	if issues != nil {
		t.Error("FetchIssues() should return nil on error")
	}
}

func TestService_TestConnection(t *testing.T) {
	service := NewService("invalid_token")
	ctx := context.Background()

	err := service.TestConnection(ctx)
	if err == nil {
		t.Error("TestConnection() should fail with invalid token")
	}
}

func TestService_GetRateLimit(t *testing.T) {
	service := NewService("invalid_token")
	ctx := context.Background()

	rateLimit, err := service.GetRateLimit(ctx)
	if err == nil {
		t.Error("GetRateLimit() should fail with invalid token")
	}
	if rateLimit != nil {
		t.Error("GetRateLimit() should return nil on error")
	}
}

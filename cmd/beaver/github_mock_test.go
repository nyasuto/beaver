package main

import (
	"context"
	"time"

	"github.com/nyasuto/beaver/internal/models"
)

// MockGitHubService provides a mock implementation of github.Service for testing
type MockGitHubService struct {
	// Mock responses
	FetchIssuesResponse *models.IssueResult
	FetchIssuesError    error
	TestConnectionError error

	// Call tracking
	FetchIssuesCalls    []models.IssueQuery
	TestConnectionCalls int
}

// NewMockGitHubService creates a new mock GitHub service with default responses
func NewMockGitHubService() *MockGitHubService {
	return &MockGitHubService{
		FetchIssuesResponse: &models.IssueResult{
			Repository:   "owner/repo",
			FetchedAt:    time.Now(),
			FetchedCount: 1,
			TotalCount:   1,
			Issues: []models.Issue{
				{
					ID:      123,
					Number:  1,
					Title:   "Test Issue",
					Body:    "Test issue body",
					State:   "open",
					HTMLURL: "https://github.com/owner/repo/issues/1",
					User: models.User{
						ID:    456,
						Login: "testuser",
					},
					CreatedAt: time.Now().Add(-24 * time.Hour),
				},
			},
			RateLimit: &models.RateLimitInfo{
				Limit:     5000,
				Remaining: 4999,
				ResetTime: time.Now().Add(time.Hour),
				Used:      1,
			},
		},
	}
}

// FetchIssues implements the github.ServiceInterface
func (m *MockGitHubService) FetchIssues(ctx context.Context, query models.IssueQuery) (*models.IssueResult, error) {
	m.FetchIssuesCalls = append(m.FetchIssuesCalls, query)

	if m.FetchIssuesError != nil {
		return nil, m.FetchIssuesError
	}

	return m.FetchIssuesResponse, nil
}

// TestConnection implements the github.ServiceInterface
func (m *MockGitHubService) TestConnection(ctx context.Context) error {
	m.TestConnectionCalls++
	return m.TestConnectionError
}

// GetRateLimit implements the github.ServiceInterface
func (m *MockGitHubService) GetRateLimit(ctx context.Context) (*models.RateLimitInfo, error) {
	return m.FetchIssuesResponse.RateLimit, nil
}

// Helper methods for test assertions

// AssertFetchIssuesCalled checks if FetchIssues was called the expected number of times
func (m *MockGitHubService) AssertFetchIssuesCalled(expectedCalls int) bool {
	return len(m.FetchIssuesCalls) == expectedCalls
}

// AssertTestConnectionCalled checks if TestConnection was called the expected number of times
func (m *MockGitHubService) AssertTestConnectionCalled(expectedCalls int) bool {
	return m.TestConnectionCalls == expectedCalls
}

// GetLastFetchQuery returns the last query used in FetchIssues call
func (m *MockGitHubService) GetLastFetchQuery() *models.IssueQuery {
	if len(m.FetchIssuesCalls) == 0 {
		return nil
	}
	lastQuery := m.FetchIssuesCalls[len(m.FetchIssuesCalls)-1]
	return &lastQuery
}

// Reset clears all call tracking
func (m *MockGitHubService) Reset() {
	m.FetchIssuesCalls = nil
	m.TestConnectionCalls = 0
}

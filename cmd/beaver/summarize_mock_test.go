package main

import (
	"context"
	"fmt"
	"time"

	"github.com/nyasuto/beaver/internal/ai"
	"github.com/nyasuto/beaver/internal/config"
	"github.com/nyasuto/beaver/pkg/github"
)

// MockAIClient provides a mock implementation of ai.Client for testing
type MockAIClient struct {
	SummarizeIssueResponse       *ai.SummarizationResponse
	SummarizeIssueError          error
	SummarizeIssuesBatchResponse *ai.BatchSummarizationResponse
	SummarizeIssuesBatchError    error
	CallLog                      []string
}

func NewMockAIClient() *MockAIClient {
	return &MockAIClient{
		CallLog: make([]string, 0),
	}
}

func (m *MockAIClient) SummarizeIssue(ctx context.Context, req *ai.SummarizationRequest) (*ai.SummarizationResponse, error) {
	m.CallLog = append(m.CallLog, fmt.Sprintf("SummarizeIssue: %+v", req))
	if m.SummarizeIssueError != nil {
		return nil, m.SummarizeIssueError
	}
	if m.SummarizeIssueResponse != nil {
		return m.SummarizeIssueResponse, nil
	}

	// Default response
	category := "bug"
	return &ai.SummarizationResponse{
		Summary:        "Test AI summary",
		KeyPoints:      []string{"Point 1", "Point 2"},
		Category:       &category,
		Complexity:     "medium",
		ProcessingTime: 1.5,
		ProviderUsed:   "openai",
		ModelUsed:      "gpt-3.5-turbo",
		TokenUsage:     map[string]int{"total_tokens": 150},
	}, nil
}

func (m *MockAIClient) SummarizeIssuesBatch(ctx context.Context, req *ai.BatchSummarizationRequest) (*ai.BatchSummarizationResponse, error) {
	m.CallLog = append(m.CallLog, fmt.Sprintf("SummarizeIssuesBatch: %+v", req))
	if m.SummarizeIssuesBatchError != nil {
		return nil, m.SummarizeIssuesBatchError
	}
	if m.SummarizeIssuesBatchResponse != nil {
		return m.SummarizeIssuesBatchResponse, nil
	}

	// Default response
	category := "feature"
	return &ai.BatchSummarizationResponse{
		TotalProcessed: len(req.Issues),
		TotalFailed:    0,
		ProcessingTime: 2.5,
		Results: []ai.SummarizationResponse{
			{
				Summary:        "Batch summary 1",
				KeyPoints:      []string{"Batch point 1"},
				Category:       &category,
				Complexity:     "low",
				ProcessingTime: 1.0,
				ProviderUsed:   "openai",
				ModelUsed:      "gpt-3.5-turbo",
			},
		},
		FailedIssues: []ai.FailedIssue{},
	}, nil
}

// Helper function to create mock GitHub client with test data
func createMockGitHubClientForSummarize() *MockGitHubClient {
	return &MockGitHubClient{
		issues: []*github.IssueData{
			{
				ID:        123,
				Number:    1,
				Title:     "Test Issue",
				Body:      "Test issue body",
				State:     "open",
				User:      "testuser",
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
				Labels:    []string{"bug", "high-priority"},
				Comments:  []github.Comment{},
			},
		},
		returnError: false,
	}
}

// Mock config loader for testing
func mockSummarizeConfigLoader() (*config.Config, error) {
	return &config.Config{
		Sources: config.SourcesConfig{
			GitHub: config.GitHubConfig{
				Token: "test-token",
			},
		},
	}, nil
}

// Mock error config loader for testing
func mockSummarizeConfigLoaderError() (*config.Config, error) {
	return nil, fmt.Errorf("config load error")
}

// Mock fetchSingleIssue function for testing
func mockSummarizeFetchSingleIssue(ctx context.Context, client GitHubClientInterface, owner, repo string, issueNum int) (*github.IssueData, error) {
	return &github.IssueData{
		ID:        123,
		Number:    issueNum,
		Title:     fmt.Sprintf("Test Issue %d", issueNum),
		Body:      "Test issue body",
		State:     "open",
		User:      "testuser",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		Labels:    []string{"bug"},
		Comments:  []github.Comment{},
	}, nil
}

// Mock fetchSingleIssue error function for testing
func mockSummarizeFetchSingleIssueError(ctx context.Context, client GitHubClientInterface, owner, repo string, issueNum int) (*github.IssueData, error) {
	return nil, fmt.Errorf("issue #%d not found", issueNum)
}

// Mock output functions for testing
func mockSummarizeOutputSummarization(response *ai.SummarizationResponse, format string) error {
	return nil
}

func mockSummarizeOutputSummarizationError(response *ai.SummarizationResponse, format string) error {
	return fmt.Errorf("output error")
}

func mockSummarizeOutputBatchSummarization(response *ai.BatchSummarizationResponse, format string) error {
	return nil
}

func mockSummarizeOutputBatchSummarizationError(response *ai.BatchSummarizationResponse, format string) error {
	return fmt.Errorf("batch output error")
}

// Mock time.Sleep for testing
func mockSummarizeTimeSleep(d time.Duration) {
	// Do nothing in tests
}

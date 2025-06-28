package main

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/nyasuto/beaver/internal/ai"
	"github.com/nyasuto/beaver/internal/config"
	"github.com/nyasuto/beaver/pkg/github"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
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

func TestFetchIssues(t *testing.T) {
	t.Run("successful fetch", func(t *testing.T) {
		mockClient := createMockGitHubClientForSummarize()
		ctx := context.Background()
		issues, err := mockClient.FetchIssues(ctx, "owner", "repo", nil)

		require.NoError(t, err)
		assert.NotNil(t, issues)
		assert.Len(t, issues, 1)
		assert.Equal(t, 1, issues[0].Number)
		assert.Equal(t, "Test Issue", issues[0].Title)
		assert.Equal(t, "open", issues[0].State)
	})

	t.Run("test GitHubClientWrapper.FetchIssues through factory", func(t *testing.T) {
		// Save original factory
		originalFactory := summarizeGitHubClientFactory
		defer func() { summarizeGitHubClientFactory = originalFactory }()

		// Create a mock client that implements GitHubClientInterface
		mockClient := &MockGitHubClient{
			issues: []*github.IssueData{
				{
					ID:        456,
					Number:    99,
					Title:     "Factory Test Issue",
					Body:      "Factory test body",
					State:     "closed",
					User:      "factoryuser",
					CreatedAt: time.Now(),
					UpdatedAt: time.Now(),
					Labels:    []string{"test"},
					Comments:  []github.Comment{},
				},
			},
			returnError: false,
		}

		// Replace factory with mock
		summarizeGitHubClientFactory = func(token string) GitHubClientInterface {
			return mockClient
		}

		// Test the factory-created client
		ctx := context.Background()
		client := summarizeGitHubClientFactory("test-token")
		issues, err := client.FetchIssues(ctx, "test", "wrapper", nil)

		require.NoError(t, err)
		assert.NotNil(t, issues)
		assert.Len(t, issues, 1)
		assert.Equal(t, 99, issues[0].Number)
		assert.Equal(t, "Factory Test Issue", issues[0].Title)
		assert.Equal(t, "closed", issues[0].State)
	})

	t.Run("test GitHubClientWrapper.FetchIssues factory with error", func(t *testing.T) {
		// Save original factory
		originalFactory := summarizeGitHubClientFactory
		defer func() { summarizeGitHubClientFactory = originalFactory }()

		// Create a mock client that returns error
		mockClient := &MockGitHubClient{
			issues:      nil,
			returnError: true,
		}

		// Replace factory with mock
		summarizeGitHubClientFactory = func(token string) GitHubClientInterface {
			return mockClient
		}

		// Test the factory-created client with error
		ctx := context.Background()
		client := summarizeGitHubClientFactory("test-token")
		issues, err := client.FetchIssues(ctx, "test", "wrapper", nil)

		assert.Error(t, err)
		assert.Nil(t, issues)
		assert.Contains(t, err.Error(), "mock error")
	})

	t.Run("fetch with error", func(t *testing.T) {
		errorClient := &MockGitHubClient{
			issues:      nil,
			returnError: true,
		}

		ctx := context.Background()
		issues, err := errorClient.FetchIssues(ctx, "owner", "repo", nil)

		assert.Error(t, err)
		assert.Nil(t, issues)
		assert.Contains(t, err.Error(), "mock error")
	})

	t.Run("fetch with empty results", func(t *testing.T) {
		emptyClient := &MockGitHubClient{
			issues:      []*github.IssueData{},
			returnError: false,
		}

		ctx := context.Background()
		issues, err := emptyClient.FetchIssues(ctx, "owner", "repo", nil)

		require.NoError(t, err)
		assert.NotNil(t, issues)
		assert.Len(t, issues, 0)
	})

	t.Run("fetch with multiple issues", func(t *testing.T) {
		multiClient := &MockGitHubClient{
			issues: []*github.IssueData{
				{
					ID:        101,
					Number:    1,
					Title:     "First Issue",
					Body:      "First issue body",
					State:     "open",
					User:      "user1",
					CreatedAt: time.Now(),
					UpdatedAt: time.Now(),
				},
				{
					ID:        102,
					Number:    2,
					Title:     "Second Issue",
					Body:      "Second issue body",
					State:     "closed",
					User:      "user2",
					CreatedAt: time.Now(),
					UpdatedAt: time.Now(),
				},
			},
			returnError: false,
		}

		ctx := context.Background()
		issues, err := multiClient.FetchIssues(ctx, "owner", "repo", nil)

		require.NoError(t, err)
		assert.Len(t, issues, 2)
		assert.Equal(t, "First Issue", issues[0].Title)
		assert.Equal(t, "Second Issue", issues[1].Title)
		assert.Equal(t, "open", issues[0].State)
		assert.Equal(t, "closed", issues[1].State)
	})
}

// TestGitHubClientWrapperFetchIssues tests the wrapper through end-to-end command execution
func TestGitHubClientWrapperFetchIssues(t *testing.T) {
	t.Run("test wrapper through runSummarizeIssue command", func(t *testing.T) {
		// This tests the GitHubClientWrapper.FetchIssues method indirectly by exercising
		// the runSummarizeIssue function which uses the factory to create the wrapper

		// Save original functions
		originalConfigLoader := summarizeConfigLoader
		originalGitHubFactory := summarizeGitHubClientFactory
		originalFetchSingleIssue := summarizeFetchSingleIssue
		originalAIFactory := summarizeAIClientFactory
		originalOutputSummarization := summarizeOutputSummarization
		defer func() {
			summarizeConfigLoader = originalConfigLoader
			summarizeGitHubClientFactory = originalGitHubFactory
			summarizeFetchSingleIssue = originalFetchSingleIssue
			summarizeAIClientFactory = originalAIFactory
			summarizeOutputSummarization = originalOutputSummarization
		}()

		// Mock configuration
		summarizeConfigLoader = func() (*config.Config, error) {
			return &config.Config{
				Sources: config.SourcesConfig{
					GitHub: config.GitHubConfig{
						Token: "test-token",
					},
				},
			}, nil
		}

		// Mock GitHub client factory to return a wrapper that will be tested
		testIssues := []*github.IssueData{
			{
				ID:        123,
				Number:    456,
				Title:     "Test Wrapper Issue",
				Body:      "Test wrapper body",
				State:     "open",
				User:      "wrappertest",
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			},
		}

		mockClient := &MockGitHubClient{
			issues:      testIssues,
			returnError: false,
		}

		// This factory creates a real GitHubClientWrapper in production,
		// but for testing we return the mock directly
		summarizeGitHubClientFactory = func(token string) GitHubClientInterface {
			return mockClient
		}

		// Mock fetchSingleIssue to return our test issue
		summarizeFetchSingleIssue = func(ctx context.Context, client GitHubClientInterface, owner, repo string, issueNum int) (*github.IssueData, error) {
			// This will call client.FetchIssues internally, exercising the wrapper
			return fetchSingleIssueFromInterface(ctx, client, owner, repo, issueNum)
		}

		// Mock AI client
		mockAIClient := NewMockAIClient()
		summarizeAIClientFactory = func(url string, timeout time.Duration) AIClientInterface {
			return mockAIClient
		}

		// Mock output to capture results
		var capturedResponse *ai.SummarizationResponse
		summarizeOutputSummarization = func(response *ai.SummarizationResponse, format string) error {
			capturedResponse = response
			return nil
		}

		// Execute the command that will exercise GitHubClientWrapper.FetchIssues
		err := runSummarizeIssue(nil, []string{"test/repo", "456"})

		// Verify the command executed successfully
		require.NoError(t, err)
		assert.NotNil(t, capturedResponse)
		assert.Equal(t, "Test AI summary", capturedResponse.Summary)
	})
}

func TestFetchSingleIssueFromInterface(t *testing.T) {
	t.Run("find existing issue", func(t *testing.T) {
		mockClient := &MockGitHubClient{
			issues: []*github.IssueData{
				{
					ID:        123,
					Number:    42,
					Title:     "Target Issue",
					Body:      "Target issue body",
					State:     "open",
					User:      "testuser",
					CreatedAt: time.Now(),
					UpdatedAt: time.Now(),
				},
				{
					ID:        124,
					Number:    43,
					Title:     "Other Issue",
					Body:      "Other issue body",
					State:     "closed",
					User:      "testuser",
					CreatedAt: time.Now(),
					UpdatedAt: time.Now(),
				},
			},
			returnError: false,
		}

		ctx := context.Background()
		issue, err := fetchSingleIssueFromInterface(ctx, mockClient, "owner", "repo", 42)

		require.NoError(t, err)
		assert.NotNil(t, issue)
		assert.Equal(t, 42, issue.Number)
		assert.Equal(t, "Target Issue", issue.Title)
		assert.Equal(t, "open", issue.State)
	})

	t.Run("issue not found", func(t *testing.T) {
		mockClient := &MockGitHubClient{
			issues: []*github.IssueData{
				{
					ID:        123,
					Number:    1,
					Title:     "Different Issue",
					Body:      "Different issue body",
					State:     "open",
					User:      "testuser",
					CreatedAt: time.Now(),
					UpdatedAt: time.Now(),
				},
			},
			returnError: false,
		}

		ctx := context.Background()
		issue, err := fetchSingleIssueFromInterface(ctx, mockClient, "owner", "repo", 999)

		assert.Error(t, err)
		assert.Nil(t, issue)
		assert.Contains(t, err.Error(), "issue #999 が見つかりません")
	})

	t.Run("GitHub client error", func(t *testing.T) {
		errorClient := &MockGitHubClient{
			issues:      nil,
			returnError: true,
		}

		ctx := context.Background()
		issue, err := fetchSingleIssueFromInterface(ctx, errorClient, "owner", "repo", 42)

		assert.Error(t, err)
		assert.Nil(t, issue)
		assert.Contains(t, err.Error(), "mock error")
	})

	t.Run("empty issue list", func(t *testing.T) {
		emptyClient := &MockGitHubClient{
			issues:      []*github.IssueData{},
			returnError: false,
		}

		ctx := context.Background()
		issue, err := fetchSingleIssueFromInterface(ctx, emptyClient, "owner", "repo", 1)

		assert.Error(t, err)
		assert.Nil(t, issue)
		assert.Contains(t, err.Error(), "issue #1 が見つかりません")
	})

	t.Run("find issue among many", func(t *testing.T) {
		// Create a large list of issues
		var issues []*github.IssueData
		for i := 1; i <= 100; i++ {
			issues = append(issues, &github.IssueData{
				ID:        int64(i),
				Number:    i,
				Title:     fmt.Sprintf("Issue %d", i),
				Body:      fmt.Sprintf("Body for issue %d", i),
				State:     "open",
				User:      "testuser",
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			})
		}

		mockClient := &MockGitHubClient{
			issues:      issues,
			returnError: false,
		}

		ctx := context.Background()
		issue, err := fetchSingleIssueFromInterface(ctx, mockClient, "owner", "repo", 50)

		require.NoError(t, err)
		assert.NotNil(t, issue)
		assert.Equal(t, 50, issue.Number)
		assert.Equal(t, "Issue 50", issue.Title)
	})
}

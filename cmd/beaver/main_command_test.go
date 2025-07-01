package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/nyasuto/beaver/internal/ai"
	"github.com/nyasuto/beaver/internal/config"
	"github.com/nyasuto/beaver/internal/models"
	"github.com/nyasuto/beaver/pkg/github"
	"github.com/spf13/cobra"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Command Integration Tests - Tests for all run* command functions
// Extracted from main_test.go to improve file organization

func TestRunClassifyIssue(t *testing.T) {
	// Save original factories
	originalGitHubFactory := classifyGitHubServiceFactory
	originalClassifierFactory := classifyClassifierFactory
	originalConfigLoader := classifyConfigLoader
	defer func() {
		classifyGitHubServiceFactory = originalGitHubFactory
		classifyClassifierFactory = originalClassifierFactory
		classifyConfigLoader = originalConfigLoader
	}()

	t.Run("Successful classification", func(t *testing.T) {
		// Set up mocks
		mockGitHub := NewMockGitHubService()
		classifyGitHubServiceFactory = func(token string) github.ServiceInterface {
			return mockGitHub
		}
		classifyClassifierFactory = mockClassifierFactory
		classifyConfigLoader = mockConfigLoader

		// Capture stdout
		old := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		cmd := &cobra.Command{}
		err := runClassifyIssue(cmd, []string{"owner/repo", "123"})

		// Restore stdout
		w.Close()
		os.Stdout = old
		output, _ := io.ReadAll(r)

		assert.NoError(t, err)
		assert.Contains(t, string(output), "Issue #123 を取得中")
		assert.Contains(t, string(output), "Issue #123 を分類中")
		assert.True(t, mockGitHub.AssertFetchIssuesCalled(1))
	})

	t.Run("Invalid repository format", func(t *testing.T) {
		cmd := &cobra.Command{}
		err := runClassifyIssue(cmd, []string{"invalid-repo", "123"})

		assert.Error(t, err)
		// Repository format validation happens first for classify commands
		assert.Contains(t, err.Error(), "リポジトリ形式が無効です")
	})

	t.Run("Invalid issue number", func(t *testing.T) {
		cmd := &cobra.Command{}
		err := runClassifyIssue(cmd, []string{"owner/repo", "invalid"})

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "Issue番号が無効です")
	})

	t.Run("Config load error", func(t *testing.T) {
		classifyConfigLoader = mockConfigLoaderError

		cmd := &cobra.Command{}
		err := runClassifyIssue(cmd, []string{"owner/repo", "123"})

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "設定読み込みエラー")
	})

	t.Run("Missing GitHub token", func(t *testing.T) {
		classifyConfigLoader = func() (*config.Config, error) {
			return &config.Config{
				Sources: config.SourcesConfig{
					GitHub: config.GitHubConfig{
						Token: "",
					},
				},
			}, nil
		}

		cmd := &cobra.Command{}
		err := runClassifyIssue(cmd, []string{"owner/repo", "123"})

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "GitHub tokenが設定されていません")
	})

	t.Run("Classifier creation error", func(t *testing.T) {
		classifyConfigLoader = mockConfigLoader
		classifyClassifierFactory = mockClassifierFactoryError

		cmd := &cobra.Command{}
		err := runClassifyIssue(cmd, []string{"owner/repo", "123"})

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "分類器作成エラー")
	})

	t.Run("GitHub service error", func(t *testing.T) {
		mockGitHub := NewMockGitHubService()
		mockGitHub.FetchIssuesError = errors.New("GitHub API error")
		classifyGitHubServiceFactory = func(token string) github.ServiceInterface {
			return mockGitHub
		}
		classifyClassifierFactory = mockClassifierFactory
		classifyConfigLoader = mockConfigLoader

		cmd := &cobra.Command{}
		err := runClassifyIssue(cmd, []string{"owner/repo", "123"})

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "Issue取得エラー")
	})
}

func TestRunClassifyIssues(t *testing.T) {
	// Save original factories
	originalGitHubFactory := classifyGitHubServiceFactory
	originalClassifierFactory := classifyClassifierFactory
	originalConfigLoader := classifyConfigLoader
	defer func() {
		classifyGitHubServiceFactory = originalGitHubFactory
		classifyClassifierFactory = originalClassifierFactory
		classifyConfigLoader = originalConfigLoader
	}()

	t.Run("Successful classification of multiple issues", func(t *testing.T) {
		// Set up mocks
		mockGitHub := NewMockGitHubService()
		classifyGitHubServiceFactory = func(token string) github.ServiceInterface {
			return mockGitHub
		}
		classifyClassifierFactory = mockClassifierFactory
		classifyConfigLoader = mockConfigLoader

		// Capture stdout to suppress output during testing
		old := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		cmd := &cobra.Command{}
		err := runClassifyIssues(cmd, []string{"owner/repo", "123", "456", "789"})

		// Restore stdout
		w.Close()
		os.Stdout = old
		output, _ := io.ReadAll(r)

		assert.NoError(t, err)
		assert.Contains(t, string(output), "3個のIssuesを取得・分類中")
		assert.Contains(t, string(output), "並列実行数: 3")
	})

	t.Run("Invalid repository format", func(t *testing.T) {
		cmd := &cobra.Command{}
		err := runClassifyIssues(cmd, []string{"invalid-repo", "123"})

		assert.Error(t, err)
		// Repository format validation happens first for classify commands
		assert.Contains(t, err.Error(), "リポジトリ形式が無効です")
	})

	t.Run("Invalid parallel parameter", func(t *testing.T) {
		classifyParallel = 15                   // Out of range
		defer func() { classifyParallel = 3 }() // Reset

		cmd := &cobra.Command{}
		err := runClassifyIssues(cmd, []string{"owner/repo", "123"})

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "parallel は 1-10 の範囲で指定してください")
	})

	t.Run("Invalid issue number in list", func(t *testing.T) {
		cmd := &cobra.Command{}
		err := runClassifyIssues(cmd, []string{"owner/repo", "123", "invalid", "456"})

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "Issue番号が無効です: invalid")
	})

	t.Run("Config load error", func(t *testing.T) {
		classifyConfigLoader = mockConfigLoaderError

		cmd := &cobra.Command{}
		err := runClassifyIssues(cmd, []string{"owner/repo", "123", "456"})

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "設定読み込みエラー")
	})

	t.Run("Missing GitHub token", func(t *testing.T) {
		classifyConfigLoader = func() (*config.Config, error) {
			return &config.Config{
				Sources: config.SourcesConfig{
					GitHub: config.GitHubConfig{
						Token: "",
					},
				},
			}, nil
		}

		cmd := &cobra.Command{}
		err := runClassifyIssues(cmd, []string{"owner/repo", "123"})

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "GitHub tokenが設定されていません")
	})
}

func TestRunClassifyAll(t *testing.T) {
	// Save original factories
	originalGitHubFactory := classifyGitHubServiceFactory
	originalClassifierFactory := classifyClassifierFactory
	originalConfigLoader := classifyConfigLoader
	defer func() {
		classifyGitHubServiceFactory = originalGitHubFactory
		classifyClassifierFactory = originalClassifierFactory
		classifyConfigLoader = originalConfigLoader
	}()

	t.Run("Successful classification of all issues", func(t *testing.T) {
		// Set up mocks
		mockGitHub := NewMockGitHubService()
		classifyGitHubServiceFactory = func(token string) github.ServiceInterface {
			return mockGitHub
		}
		classifyClassifierFactory = mockClassifierFactory
		classifyConfigLoader = mockConfigLoader

		// Capture stdout to suppress output during testing
		old := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		cmd := &cobra.Command{}
		err := runClassifyAll(cmd, []string{"owner/repo"})

		// Restore stdout
		w.Close()
		os.Stdout = old
		output, _ := io.ReadAll(r)

		assert.NoError(t, err)
		assert.Contains(t, string(output), "全Issuesを取得中")
		assert.Contains(t, string(output), "取得したIssues")
		// Should have at least 2 calls: 1 for getting all issues + 1 for processing the single issue
		assert.True(t, mockGitHub.AssertFetchIssuesCalled(2))
	})

	t.Run("Invalid repository format", func(t *testing.T) {
		cmd := &cobra.Command{}
		err := runClassifyAll(cmd, []string{"invalid-repo"})

		assert.Error(t, err)
		// Repository format validation happens first for classify commands
		assert.Contains(t, err.Error(), "リポジトリ形式が無効です")
	})

	t.Run("Invalid parallel parameter", func(t *testing.T) {
		classifyParallel = 0                    // Out of range
		defer func() { classifyParallel = 3 }() // Reset

		cmd := &cobra.Command{}
		err := runClassifyAll(cmd, []string{"owner/repo"})

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "parallel は 1-10 の範囲で指定してください")
	})

	t.Run("Config load error", func(t *testing.T) {
		classifyConfigLoader = mockConfigLoaderError

		cmd := &cobra.Command{}
		err := runClassifyAll(cmd, []string{"owner/repo"})

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "設定読み込みエラー")
	})

	t.Run("Missing GitHub token", func(t *testing.T) {
		classifyConfigLoader = func() (*config.Config, error) {
			return &config.Config{
				Sources: config.SourcesConfig{
					GitHub: config.GitHubConfig{
						Token: "",
					},
				},
			}, nil
		}

		cmd := &cobra.Command{}
		err := runClassifyAll(cmd, []string{"owner/repo"})

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "GitHub tokenが設定されていません")
	})

	t.Run("Classifier creation error", func(t *testing.T) {
		classifyConfigLoader = mockConfigLoader
		classifyClassifierFactory = mockClassifierFactoryError

		cmd := &cobra.Command{}
		err := runClassifyAll(cmd, []string{"owner/repo"})

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "分類器作成エラー")
	})

	t.Run("GitHub Issues fetch error", func(t *testing.T) {
		mockGitHub := NewMockGitHubService()
		mockGitHub.FetchIssuesError = errors.New("GitHub API error")
		classifyGitHubServiceFactory = func(token string) github.ServiceInterface {
			return mockGitHub
		}
		classifyClassifierFactory = mockClassifierFactory
		classifyConfigLoader = mockConfigLoader

		cmd := &cobra.Command{}
		err := runClassifyAll(cmd, []string{"owner/repo"})

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "Issues取得エラー")
	})

	t.Run("No issues to process", func(t *testing.T) {
		// Mock GitHub service with empty issues
		mockGitHub := NewMockGitHubService()
		mockGitHub.FetchIssuesResponse = &models.IssueResult{
			Repository:   "owner/repo",
			FetchedAt:    time.Now(),
			FetchedCount: 0,
			TotalCount:   0,
			Issues:       []models.Issue{}, // Empty issues
			RateLimit: &models.RateLimitInfo{
				Limit:     5000,
				Remaining: 4999,
				ResetTime: time.Now().Add(time.Hour),
				Used:      1,
			},
		}
		classifyGitHubServiceFactory = func(token string) github.ServiceInterface {
			return mockGitHub
		}
		classifyClassifierFactory = mockClassifierFactory
		classifyConfigLoader = mockConfigLoader

		// Capture stdout
		old := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		cmd := &cobra.Command{}
		err := runClassifyAll(cmd, []string{"owner/repo"})

		// Restore stdout
		w.Close()
		os.Stdout = old
		output, _ := io.ReadAll(r)

		assert.NoError(t, err)
		assert.Contains(t, string(output), "処理するIssuesがありません")
	})

	t.Run("Max issues parameter", func(t *testing.T) {
		classifyMaxIssues = 1                    // Limit to 1 issue
		defer func() { classifyMaxIssues = 0 }() // Reset

		mockGitHub := NewMockGitHubService()
		classifyGitHubServiceFactory = func(token string) github.ServiceInterface {
			return mockGitHub
		}
		classifyClassifierFactory = mockClassifierFactory
		classifyConfigLoader = mockConfigLoader

		// Capture stdout to suppress output during testing
		old := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		cmd := &cobra.Command{}
		err := runClassifyAll(cmd, []string{"owner/repo"})

		// Restore stdout
		w.Close()
		os.Stdout = old
		_, _ = io.ReadAll(r) // Consume output

		assert.NoError(t, err)
		// Verify that GitHub was called with maxIssues limit - should be at least 2 calls:
		// 1) Initial fetch with PerPage=1, then 2) fetchSingleIssueForClassify with PerPage=100
		assert.True(t, len(mockGitHub.FetchIssuesCalls) >= 2)

		// The first call should have PerPage=1 due to maxIssues setting
		firstQuery := mockGitHub.FetchIssuesCalls[0]
		assert.Equal(t, 1, firstQuery.PerPage)
	})
}

func TestSummarizeCommands(t *testing.T) {
	t.Run("runSummarizeIssue invalid repository path", func(t *testing.T) {
		err := runSummarizeIssue(nil, []string{"invalid-repo", "123"})
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "リポジトリ形式が正しくありません")
	})

	t.Run("runSummarizeIssue invalid issue number", func(t *testing.T) {
		err := runSummarizeIssue(nil, []string{"owner/repo", "invalid"})
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "issue番号が正しくありません")
	})

	t.Run("runSummarizeIssues invalid repository path", func(t *testing.T) {
		err := runSummarizeIssues(nil, []string{"invalid-repo", "1,2,3"})
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "リポジトリ形式が正しくありません")
	})

	t.Run("runSummarizeIssues missing issue numbers", func(t *testing.T) {
		err := runSummarizeIssues(nil, []string{"owner/repo"})
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "issue番号を指定してください")
	})

	t.Run("runSummarizeIssues invalid issue number in list", func(t *testing.T) {
		err := runSummarizeIssues(nil, []string{"owner/repo", "1,invalid,3"})
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "issue番号が正しくありません")
	})

	t.Run("runSummarizeAll invalid repository path", func(t *testing.T) {
		err := runSummarizeAll(nil, []string{"invalid-repo"})
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "リポジトリ形式が正しくありません")
	})

	t.Run("runSummarizeAll config load error", func(t *testing.T) {
		// Save original and replace with error-returning mock
		originalConfigLoader := summarizeConfigLoader
		summarizeConfigLoader = mockSummarizeConfigLoaderError
		defer func() { summarizeConfigLoader = originalConfigLoader }()

		err := runSummarizeAll(nil, []string{"owner/repo"})
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "設定読み込みエラー")
	})

	t.Run("runSummarizeAll GitHub fetch error", func(t *testing.T) {
		// Save original functions
		originalConfigLoader := summarizeConfigLoader
		originalGitHubFactory := summarizeGitHubClientFactory
		defer func() {
			summarizeConfigLoader = originalConfigLoader
			summarizeGitHubClientFactory = originalGitHubFactory
		}()

		// Mock config loader
		summarizeConfigLoader = mockSummarizeConfigLoader

		// Mock GitHub client that returns error
		mockClient := &MockGitHubClient{
			issues:      nil,
			returnError: true,
		}

		summarizeGitHubClientFactory = func(token string) GitHubClientInterface {
			return mockClient
		}

		err := runSummarizeAll(nil, []string{"owner/repo"})
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "全Issue取得エラー")
	})

	t.Run("runSummarizeAll no issues found", func(t *testing.T) {
		// Save original functions
		originalConfigLoader := summarizeConfigLoader
		originalGitHubFactory := summarizeGitHubClientFactory
		defer func() {
			summarizeConfigLoader = originalConfigLoader
			summarizeGitHubClientFactory = originalGitHubFactory
		}()

		// Mock config loader
		summarizeConfigLoader = mockSummarizeConfigLoader

		// Mock GitHub client with empty results
		mockClient := &MockGitHubClient{
			issues:      []*github.IssueData{}, // Empty list
			returnError: false,
		}

		summarizeGitHubClientFactory = func(token string) GitHubClientInterface {
			return mockClient
		}

		// Capture stdout
		oldStdout := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		err := runSummarizeAll(nil, []string{"owner/repo"})

		w.Close()
		os.Stdout = oldStdout
		output, _ := io.ReadAll(r)

		assert.NoError(t, err) // Should succeed but with no processing
		assert.Contains(t, string(output), "処理可能なIssueがありません")
	})

	t.Run("runSummarizeAll successful batch processing", func(t *testing.T) {
		// Save original functions
		originalConfigLoader := summarizeConfigLoader
		originalGitHubFactory := summarizeGitHubClientFactory
		originalAIFactory := summarizeAIClientFactory
		originalTimeSleep := summarizeTimeSleep
		defer func() {
			summarizeConfigLoader = originalConfigLoader
			summarizeGitHubClientFactory = originalGitHubFactory
			summarizeAIClientFactory = originalAIFactory
			summarizeTimeSleep = originalTimeSleep
		}()

		// Mock config loader
		summarizeConfigLoader = mockSummarizeConfigLoader

		// Mock GitHub client with test issues
		mockClient := &MockGitHubClient{
			issues: []*github.IssueData{
				{
					ID:        123,
					Number:    1,
					Title:     "Test Issue 1",
					Body:      "Test issue body 1",
					State:     "open",
					User:      "testuser",
					CreatedAt: time.Now(),
					UpdatedAt: time.Now(),
				},
				{
					ID:        124,
					Number:    2,
					Title:     "Test Issue 2",
					Body:      "Test issue body 2",
					State:     "closed",
					User:      "testuser",
					CreatedAt: time.Now(),
					UpdatedAt: time.Now(),
				},
			},
			returnError: false,
		}

		summarizeGitHubClientFactory = func(token string) GitHubClientInterface {
			return mockClient
		}

		// Mock AI client with successful batch response
		mockAIClient := NewMockAIClient()
		category := "feature"
		mockAIClient.SummarizeIssuesBatchResponse = &ai.BatchSummarizationResponse{
			TotalProcessed: 2,
			TotalFailed:    0,
			ProcessingTime: 3.5,
			Results: []ai.SummarizationResponse{
				{
					Summary:        "Test summary 1",
					KeyPoints:      []string{"Point 1"},
					Category:       &category,
					Complexity:     "medium",
					ProcessingTime: 1.5,
				},
				{
					Summary:        "Test summary 2",
					KeyPoints:      []string{"Point 2"},
					Category:       &category,
					Complexity:     "low",
					ProcessingTime: 2.0,
				},
			},
			FailedIssues: []ai.FailedIssue{},
		}

		summarizeAIClientFactory = func(url string, timeout time.Duration) AIClientInterface {
			return mockAIClient
		}

		// Mock time.Sleep to avoid delays in tests
		summarizeTimeSleep = mockSummarizeTimeSleep

		// Capture stdout
		oldStdout := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		err := runSummarizeAll(nil, []string{"owner/repo"})

		w.Close()
		os.Stdout = oldStdout
		output, _ := io.ReadAll(r)

		assert.NoError(t, err)
		outputStr := string(output)
		assert.Contains(t, outputStr, "2個のIssueを発見")
		assert.Contains(t, outputStr, "バッチ処理を開始")
		assert.Contains(t, outputStr, "処理完了: 2成功, 0失敗")
		assert.Contains(t, outputStr, "Test summary 1")
		assert.Contains(t, outputStr, "Test summary 2")
	})

	t.Run("runSummarizeAll JSON output format", func(t *testing.T) {
		// Save original functions
		originalConfigLoader := summarizeConfigLoader
		originalGitHubFactory := summarizeGitHubClientFactory
		originalAIFactory := summarizeAIClientFactory
		originalTimeSleep := summarizeTimeSleep
		originalOutputFormat := aiOutputFormat
		defer func() {
			summarizeConfigLoader = originalConfigLoader
			summarizeGitHubClientFactory = originalGitHubFactory
			summarizeAIClientFactory = originalAIFactory
			summarizeTimeSleep = originalTimeSleep
			aiOutputFormat = originalOutputFormat
		}()

		// Set JSON output format
		aiOutputFormat = "json"

		// Mock config loader
		summarizeConfigLoader = mockSummarizeConfigLoader

		// Mock GitHub client with one issue
		mockClient := &MockGitHubClient{
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
				},
			},
			returnError: false,
		}

		summarizeGitHubClientFactory = func(token string) GitHubClientInterface {
			return mockClient
		}

		// Mock AI client
		mockAIClient := NewMockAIClient()
		category := "bug"
		mockAIClient.SummarizeIssuesBatchResponse = &ai.BatchSummarizationResponse{
			TotalProcessed: 1,
			TotalFailed:    0,
			ProcessingTime: 1.5,
			Results: []ai.SummarizationResponse{
				{
					Summary:    "JSON test summary",
					Complexity: "high",
					Category:   &category,
				},
			},
			FailedIssues: []ai.FailedIssue{},
		}

		summarizeAIClientFactory = func(url string, timeout time.Duration) AIClientInterface {
			return mockAIClient
		}

		// Mock time.Sleep
		summarizeTimeSleep = mockSummarizeTimeSleep

		// Capture stdout
		oldStdout := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		err := runSummarizeAll(nil, []string{"owner/repo"})

		w.Close()
		os.Stdout = oldStdout
		output, _ := io.ReadAll(r)

		assert.NoError(t, err)
		outputStr := string(output)
		assert.Contains(t, outputStr, "[") // JSON array start
		assert.Contains(t, outputStr, "JSON test summary")
		assert.Contains(t, outputStr, "high")
		assert.Contains(t, outputStr, "]") // JSON array end
	})

	t.Run("runSummarizeAll batch error handling", func(t *testing.T) {
		// Save original functions
		originalConfigLoader := summarizeConfigLoader
		originalGitHubFactory := summarizeGitHubClientFactory
		originalAIFactory := summarizeAIClientFactory
		originalTimeSleep := summarizeTimeSleep
		defer func() {
			summarizeConfigLoader = originalConfigLoader
			summarizeGitHubClientFactory = originalGitHubFactory
			summarizeAIClientFactory = originalAIFactory
			summarizeTimeSleep = originalTimeSleep
		}()

		// Mock config loader
		summarizeConfigLoader = mockSummarizeConfigLoader

		// Mock GitHub client with test issues
		mockClient := &MockGitHubClient{
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
				},
			},
			returnError: false,
		}

		summarizeGitHubClientFactory = func(token string) GitHubClientInterface {
			return mockClient
		}

		// Mock AI client that returns batch error
		mockAIClient := NewMockAIClient()
		mockAIClient.SummarizeIssuesBatchError = fmt.Errorf("AI service unavailable")

		summarizeAIClientFactory = func(url string, timeout time.Duration) AIClientInterface {
			return mockAIClient
		}

		// Mock time.Sleep
		summarizeTimeSleep = mockSummarizeTimeSleep

		// Capture stdout
		oldStdout := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		err := runSummarizeAll(nil, []string{"owner/repo"})

		w.Close()
		os.Stdout = oldStdout
		output, _ := io.ReadAll(r)

		assert.NoError(t, err) // Function succeeds even with batch errors
		outputStr := string(output)
		assert.Contains(t, outputStr, "バッチ 1-1 エラー")
		assert.Contains(t, outputStr, "AI service unavailable")
		assert.Contains(t, outputStr, "処理完了: 0成功, 1失敗")
	})

	t.Run("runSummarizeIssues successful processing", func(t *testing.T) {
		// Save original functions
		originalConfigLoader := summarizeConfigLoader
		originalGitHubFactory := summarizeGitHubClientFactory
		originalAIFactory := summarizeAIClientFactory
		originalFetchSingleIssue := summarizeFetchSingleIssue
		originalOutputBatch := summarizeOutputBatchSummarization
		defer func() {
			summarizeConfigLoader = originalConfigLoader
			summarizeGitHubClientFactory = originalGitHubFactory
			summarizeAIClientFactory = originalAIFactory
			summarizeFetchSingleIssue = originalFetchSingleIssue
			summarizeOutputBatchSummarization = originalOutputBatch
		}()

		// Mock config loader
		summarizeConfigLoader = mockSummarizeConfigLoader

		// Mock GitHub client
		mockClient := &MockGitHubClient{
			issues:      []*github.IssueData{},
			returnError: false,
		}

		summarizeGitHubClientFactory = func(token string) GitHubClientInterface {
			return mockClient
		}

		// Mock AI client
		mockAIClient := NewMockAIClient()
		category := "feature"
		mockAIClient.SummarizeIssuesBatchResponse = &ai.BatchSummarizationResponse{
			TotalProcessed: 2,
			TotalFailed:    0,
			ProcessingTime: 2.5,
			Results: []ai.SummarizationResponse{
				{
					Summary:    "Issue 1 summary",
					Complexity: "medium",
					Category:   &category,
				},
				{
					Summary:    "Issue 2 summary",
					Complexity: "low",
					Category:   &category,
				},
			},
			FailedIssues: []ai.FailedIssue{},
		}

		summarizeAIClientFactory = func(url string, timeout time.Duration) AIClientInterface {
			return mockAIClient
		}

		// Mock successful issue fetching
		summarizeFetchSingleIssue = func(ctx context.Context, client GitHubClientInterface, owner, repo string, issueNum int) (*github.IssueData, error) {
			return &github.IssueData{
				ID:        int64(issueNum),
				Number:    issueNum,
				Title:     fmt.Sprintf("Test Issue %d", issueNum),
				Body:      "Test issue body",
				State:     "open",
				User:      "testuser",
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}, nil
		}

		// Mock output
		summarizeOutputBatchSummarization = func(response *ai.BatchSummarizationResponse, format string) error {
			return nil
		}

		// Capture stdout
		oldStdout := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		err := runSummarizeIssues(nil, []string{"owner/repo", "1,2"})

		w.Close()
		os.Stdout = oldStdout
		output, _ := io.ReadAll(r)

		assert.NoError(t, err)
		outputStr := string(output)
		assert.Contains(t, outputStr, "2個のIssueを取得中")
		assert.Contains(t, outputStr, "2個のIssueをAI要約中")
	})

	t.Run("runSummarizeIssues partial fetch failure", func(t *testing.T) {
		// Save original functions
		originalConfigLoader := summarizeConfigLoader
		originalGitHubFactory := summarizeGitHubClientFactory
		originalAIFactory := summarizeAIClientFactory
		originalFetchSingleIssue := summarizeFetchSingleIssue
		originalOutputBatch := summarizeOutputBatchSummarization
		defer func() {
			summarizeConfigLoader = originalConfigLoader
			summarizeGitHubClientFactory = originalGitHubFactory
			summarizeAIClientFactory = originalAIFactory
			summarizeFetchSingleIssue = originalFetchSingleIssue
			summarizeOutputBatchSummarization = originalOutputBatch
		}()

		// Mock config loader
		summarizeConfigLoader = mockSummarizeConfigLoader

		// Mock GitHub client
		mockClient := &MockGitHubClient{
			issues:      []*github.IssueData{},
			returnError: false,
		}

		summarizeGitHubClientFactory = func(token string) GitHubClientInterface {
			return mockClient
		}

		// Mock AI client
		mockAIClient := NewMockAIClient()
		category := "bug"
		mockAIClient.SummarizeIssuesBatchResponse = &ai.BatchSummarizationResponse{
			TotalProcessed: 1,
			TotalFailed:    0,
			ProcessingTime: 1.5,
			Results: []ai.SummarizationResponse{
				{
					Summary:    "Successful issue summary",
					Complexity: "high",
					Category:   &category,
				},
			},
			FailedIssues: []ai.FailedIssue{},
		}

		summarizeAIClientFactory = func(url string, timeout time.Duration) AIClientInterface {
			return mockAIClient
		}

		// Mock fetch that fails for issue #2 but succeeds for issue #1
		summarizeFetchSingleIssue = func(ctx context.Context, client GitHubClientInterface, owner, repo string, issueNum int) (*github.IssueData, error) {
			if issueNum == 2 {
				return nil, fmt.Errorf("issue #2 not found")
			}
			return &github.IssueData{
				ID:        int64(issueNum),
				Number:    issueNum,
				Title:     fmt.Sprintf("Test Issue %d", issueNum),
				Body:      "Test issue body",
				State:     "open",
				User:      "testuser",
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}, nil
		}

		// Mock output
		summarizeOutputBatchSummarization = func(response *ai.BatchSummarizationResponse, format string) error {
			return nil
		}

		// Capture stdout
		oldStdout := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		err := runSummarizeIssues(nil, []string{"owner/repo", "1,2"})

		w.Close()
		os.Stdout = oldStdout
		output, _ := io.ReadAll(r)

		assert.NoError(t, err) // Should succeed with partial results
		outputStr := string(output)
		assert.Contains(t, outputStr, "Issue #2 取得エラー")
		assert.Contains(t, outputStr, "1個のIssueをAI要約中")
	})

	t.Run("runSummarizeIssues all fetch failures", func(t *testing.T) {
		// Save original functions
		originalConfigLoader := summarizeConfigLoader
		originalGitHubFactory := summarizeGitHubClientFactory
		originalFetchSingleIssue := summarizeFetchSingleIssue
		defer func() {
			summarizeConfigLoader = originalConfigLoader
			summarizeGitHubClientFactory = originalGitHubFactory
			summarizeFetchSingleIssue = originalFetchSingleIssue
		}()

		// Mock config loader
		summarizeConfigLoader = mockSummarizeConfigLoader

		// Mock GitHub client
		mockClient := &MockGitHubClient{
			issues:      []*github.IssueData{},
			returnError: false,
		}

		summarizeGitHubClientFactory = func(token string) GitHubClientInterface {
			return mockClient
		}

		// Mock fetch that always fails
		summarizeFetchSingleIssue = func(ctx context.Context, client GitHubClientInterface, owner, repo string, issueNum int) (*github.IssueData, error) {
			return nil, fmt.Errorf("issue #%d not found", issueNum)
		}

		err := runSummarizeIssues(nil, []string{"owner/repo", "1,2"})
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "処理可能なIssueがありません")
	})

	t.Run("runSummarizeIssues AI batch error", func(t *testing.T) {
		// Save original functions
		originalConfigLoader := summarizeConfigLoader
		originalGitHubFactory := summarizeGitHubClientFactory
		originalAIFactory := summarizeAIClientFactory
		originalFetchSingleIssue := summarizeFetchSingleIssue
		defer func() {
			summarizeConfigLoader = originalConfigLoader
			summarizeGitHubClientFactory = originalGitHubFactory
			summarizeAIClientFactory = originalAIFactory
			summarizeFetchSingleIssue = originalFetchSingleIssue
		}()

		// Mock config loader
		summarizeConfigLoader = mockSummarizeConfigLoader

		// Mock GitHub client
		mockClient := &MockGitHubClient{
			issues:      []*github.IssueData{},
			returnError: false,
		}

		summarizeGitHubClientFactory = func(token string) GitHubClientInterface {
			return mockClient
		}

		// Mock AI client that returns error
		mockAIClient := NewMockAIClient()
		mockAIClient.SummarizeIssuesBatchError = fmt.Errorf("AI service overloaded")

		summarizeAIClientFactory = func(url string, timeout time.Duration) AIClientInterface {
			return mockAIClient
		}

		// Mock successful issue fetching
		summarizeFetchSingleIssue = func(ctx context.Context, client GitHubClientInterface, owner, repo string, issueNum int) (*github.IssueData, error) {
			return &github.IssueData{
				ID:        int64(issueNum),
				Number:    issueNum,
				Title:     fmt.Sprintf("Test Issue %d", issueNum),
				Body:      "Test issue body",
				State:     "open",
				User:      "testuser",
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}, nil
		}

		err := runSummarizeIssues(nil, []string{"owner/repo", "1"})
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "バッチAI要約エラー")
		assert.Contains(t, err.Error(), "AI service overloaded")
	})
}

func TestRunGenerateWiki(t *testing.T) {
	// Save original factories
	originalGitHubFactory := wikiGitHubServiceFactory
	originalGeneratorFactory := wikiGeneratorFactory
	originalPublisherFactory := wikiPublisherFactory
	originalViperGetString := wikiViperGetString
	originalOsGetenv := wikiOsGetenv
	originalOsMkdirAll := wikiOsMkdirAll
	originalOsWriteFile := wikiOsWriteFile

	defer func() {
		wikiGitHubServiceFactory = originalGitHubFactory
		wikiGeneratorFactory = originalGeneratorFactory
		wikiPublisherFactory = originalPublisherFactory
		wikiViperGetString = originalViperGetString
		wikiOsGetenv = originalOsGetenv
		wikiOsMkdirAll = originalOsMkdirAll
		wikiOsWriteFile = originalOsWriteFile
	}()

	t.Run("Successful wiki generation", func(t *testing.T) {
		// Setup mocks
		mockGitHub := NewMockGitHubService()

		wikiGitHubServiceFactory = func(token string) github.ServiceInterface {
			return mockGitHub
		}
		wikiViperGetString = func(key string) string {
			if key == "github.token" {
				return "test-viper-token"
			}
			return ""
		}
		wikiOsGetenv = func(key string) string {
			if key == "GITHUB_TOKEN" {
				return "test-env-token"
			}
			return ""
		}
		wikiOsMkdirAll = func(path string, perm os.FileMode) error {
			return nil
		}
		wikiOsWriteFile = func(filename string, data []byte, perm os.FileMode) error {
			return nil
		}

		// Set global variables
		wikiOutput = "./test-wiki"
		wikiPublish = false

		err := runGenerateWiki(nil, []string{"owner/repo"})

		require.NoError(t, err)
		assert.True(t, mockGitHub.AssertFetchIssuesCalled(1))
	})

	t.Run("Invalid repository path", func(t *testing.T) {
		err := runGenerateWiki(nil, []string{"invalid-repo"})

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "無効なリポジトリパス")
	})

	t.Run("Missing GitHub token", func(t *testing.T) {
		wikiViperGetString = func(key string) string {
			return ""
		}
		wikiOsGetenv = func(key string) string {
			return ""
		}

		err := runGenerateWiki(nil, []string{"owner/repo"})

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "GitHub token not found")
	})

	t.Run("GitHub fetch error", func(t *testing.T) {
		mockGitHub := NewMockGitHubService()
		mockGitHub.FetchIssuesError = errors.New("GitHub API error")

		wikiGitHubServiceFactory = func(token string) github.ServiceInterface {
			return mockGitHub
		}
		wikiViperGetString = func(key string) string {
			return "test-token"
		}
		wikiOsGetenv = func(key string) string {
			return "test-token"
		}

		err := runGenerateWiki(nil, []string{"owner/repo"})

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to fetch issues")
	})

	t.Run("Directory creation error", func(t *testing.T) {
		mockGitHub := NewMockGitHubService()

		wikiGitHubServiceFactory = func(token string) github.ServiceInterface {
			return mockGitHub
		}
		wikiViperGetString = func(key string) string {
			return "test-token"
		}
		wikiOsGetenv = func(key string) string {
			return "test-token"
		}
		wikiOsMkdirAll = func(path string, perm os.FileMode) error {
			return errors.New("permission denied")
		}

		err := runGenerateWiki(nil, []string{"owner/repo"})

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to create output directory")
	})
}

func TestRunPublishWiki(t *testing.T) {
	t.Run("Invalid repository path", func(t *testing.T) {
		err := runPublishWiki(nil, []string{"invalid-repo"})

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "無効なリポジトリパス")
	})

	t.Run("Missing GitHub token", func(t *testing.T) {
		// Save original factories
		originalViperGetString := wikiViperGetString
		originalOsGetenv := wikiOsGetenv
		defer func() {
			wikiViperGetString = originalViperGetString
			wikiOsGetenv = originalOsGetenv
		}()

		wikiViperGetString = func(key string) string {
			return ""
		}
		wikiOsGetenv = func(key string) string {
			return ""
		}

		err := runPublishWiki(nil, []string{"owner/repo"})

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "GitHub token not found")
	})
}

func TestRunListWiki(t *testing.T) {
	t.Run("Invalid repository path", func(t *testing.T) {
		err := runListWiki(nil, []string{"invalid-repo"})

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "無効なリポジトリパス")
	})

	t.Run("Missing GitHub token", func(t *testing.T) {
		// Save original factories
		originalViperGetString := wikiViperGetString
		originalOsGetenv := wikiOsGetenv
		defer func() {
			wikiViperGetString = originalViperGetString
			wikiOsGetenv = originalOsGetenv
		}()

		wikiViperGetString = func(key string) string {
			return ""
		}
		wikiOsGetenv = func(key string) string {
			return ""
		}

		err := runListWiki(nil, []string{"owner/repo"})

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "GitHub token not found")
	})
}

func TestRunBuildCommand(t *testing.T) {
	t.Run("missing configuration file", func(t *testing.T) {
		// Create temporary directory without config
		tempDir := t.TempDir()
		originalWd, _ := os.Getwd()
		defer os.Chdir(originalWd)
		os.Chdir(tempDir)

		// Create mock command
		cmd := &cobra.Command{}
		args := []string{}

		err := runBuildCommand(cmd, args)
		require.Error(t, err)
		// With improved error handling, app now uses defaults and fails at GitHub connection or repository access
		assert.True(t, strings.Contains(err.Error(), "GitHub接続エラー") ||
			strings.Contains(err.Error(), "Issues取得エラー") ||
			strings.Contains(err.Error(), "REPOSITORY_ERROR"))
	})

	t.Run("invalid repository configuration", func(t *testing.T) {
		// Create temporary directory with invalid config
		tempDir := t.TempDir()
		originalWd, _ := os.Getwd()
		defer os.Chdir(originalWd)
		os.Chdir(tempDir)

		// Create invalid config file
		configContent := `project:
  name: "Test Project"
  repository: "invalid-format"
sources:
  github:
    token: "test-token"
output:
  wiki:
    platform: "github"`

		err := os.WriteFile("beaver.yml", []byte(configContent), 0600)
		require.NoError(t, err)

		cmd := &cobra.Command{}
		args := []string{}

		err = runBuildCommand(cmd, args)
		require.Error(t, err)
		// Repository format validation now happens first for better error reporting
		assert.Contains(t, err.Error(), "リポジトリ形式が無効です")
	})

	t.Run("missing GitHub token", func(t *testing.T) {
		// Create temporary directory with config missing token
		tempDir := t.TempDir()
		originalWd, _ := os.Getwd()
		defer os.Chdir(originalWd)
		os.Chdir(tempDir)

		// Create config without token
		configContent := `project:
  name: "Test Project"
  repository: "owner/repo"
sources:
  github:
    token: ""
output:
  wiki:
    platform: "github"`

		err := os.WriteFile("beaver.yml", []byte(configContent), 0600)
		require.NoError(t, err)

		cmd := &cobra.Command{}
		args := []string{}

		err = runBuildCommand(cmd, args)
		require.Error(t, err)
		// Either GitHub token validation or repository access error can happen first
		assert.True(t, strings.Contains(err.Error(), "GitHub token") ||
			strings.Contains(err.Error(), "Issues取得エラー") ||
			strings.Contains(err.Error(), "REPOSITORY_ERROR"),
			fmt.Sprintf("Expected GitHub token or repository error, got: %v", err))
	})

	t.Run("empty repository name", func(t *testing.T) {
		tempDir := t.TempDir()
		originalWd, _ := os.Getwd()
		defer os.Chdir(originalWd)
		os.Chdir(tempDir)

		configContent := `project:
  name: "Test Project"
  repository: ""
sources:
  github:
    token: "test-token"`

		err := os.WriteFile("beaver.yml", []byte(configContent), 0600)
		require.NoError(t, err)

		cmd := &cobra.Command{}
		err = runBuildCommand(cmd, []string{})
		require.Error(t, err)
		// Test may fail at configuration validation or repository access
		assert.True(t, strings.Contains(err.Error(), "設定が無効です") ||
			strings.Contains(err.Error(), "Issues取得エラー") ||
			strings.Contains(err.Error(), "REPOSITORY_ERROR"))
	})

	t.Run("default repository name", func(t *testing.T) {
		tempDir := t.TempDir()
		originalWd, _ := os.Getwd()
		defer os.Chdir(originalWd)
		os.Chdir(tempDir)

		configContent := `project:
  name: "Test Project"
  repository: "username/my-repo"
sources:
  github:
    token: "test-token"`

		err := os.WriteFile("beaver.yml", []byte(configContent), 0600)
		require.NoError(t, err)

		cmd := &cobra.Command{}
		err = runBuildCommand(cmd, []string{})
		require.Error(t, err)
		// Repository validation is performed before GitHub token validation
		assert.Contains(t, err.Error(), "リポジトリが設定されていません")
	})

	t.Run("repository with multiple slashes", func(t *testing.T) {
		tempDir := t.TempDir()
		originalWd, _ := os.Getwd()
		defer os.Chdir(originalWd)
		os.Chdir(tempDir)

		configContent := `project:
  name: "Test Project"
  repository: "owner/repo/extra/path"
sources:
  github:
    token: "test-token"`

		err := os.WriteFile("beaver.yml", []byte(configContent), 0600)
		require.NoError(t, err)

		cmd := &cobra.Command{}
		err = runBuildCommand(cmd, []string{})
		require.Error(t, err)
		// Repository format validation now happens first for better error reporting
		assert.Contains(t, err.Error(), "リポジトリ形式が無効です")
	})

	t.Run("repository with only slash", func(t *testing.T) {
		tempDir := t.TempDir()
		originalWd, _ := os.Getwd()
		defer os.Chdir(originalWd)
		os.Chdir(tempDir)

		configContent := `project:
  name: "Test Project"
  repository: "/"
sources:
  github:
    token: "test-token"`

		err := os.WriteFile("beaver.yml", []byte(configContent), 0600)
		require.NoError(t, err)

		cmd := &cobra.Command{}
		err = runBuildCommand(cmd, []string{})
		require.Error(t, err)
		// Repository format validation now happens first for better error reporting
		assert.Contains(t, err.Error(), "リポジトリ形式が無効です")
	})

	t.Run("repository with no slash", func(t *testing.T) {
		tempDir := t.TempDir()
		originalWd, _ := os.Getwd()
		defer os.Chdir(originalWd)
		os.Chdir(tempDir)

		configContent := `project:
  name: "Test Project"
  repository: "invalidrepo"
sources:
  github:
    token: "test-token"`

		err := os.WriteFile("beaver.yml", []byte(configContent), 0600)
		require.NoError(t, err)

		cmd := &cobra.Command{}
		err = runBuildCommand(cmd, []string{})
		require.Error(t, err)
		// Repository format validation now happens first for better error reporting
		assert.Contains(t, err.Error(), "リポジトリ形式が無効です")
	})
}

func TestRunInitCommand(t *testing.T) {
	t.Run("create new config file successfully", func(t *testing.T) {
		// Use TestHelpers for better isolation
		helper := NewTestHelpers(t)
		defer helper.Cleanup()

		// Change to temp directory with proper cleanup
		cleanup := helper.ChangeToTempDir()
		defer cleanup()

		// Capture stdout using helper
		stdout, _ := helper.CaptureOutput(func() {
			cmd := &cobra.Command{}
			args := []string{}
			runInitCommand(cmd, args)
		})

		// Verify config file was created in temp directory
		configPath := filepath.Join(helper.TempDir(), "beaver.yml")
		_, err := os.Stat(configPath)
		assert.NoError(t, err, "beaver.yml should be created in temp directory")

		// Verify success message
		assert.Contains(t, stdout, "Beaverプロジェクトの初期化完了")
	})

	t.Run("config file already exists", func(t *testing.T) {
		// Use TestHelpers for better isolation
		helper := NewTestHelpers(t)
		defer helper.Cleanup()

		// Change to temp directory with proper cleanup
		cleanup := helper.ChangeToTempDir()
		defer cleanup()

		// Create existing config file in temp directory
		configPath := filepath.Join(helper.TempDir(), "beaver.yml")
		err := os.WriteFile(configPath, []byte("existing config"), 0600)
		require.NoError(t, err)

		// Capture stdout using helper
		stdout, _ := helper.CaptureOutput(func() {
			cmd := &cobra.Command{}
			args := []string{}
			runInitCommand(cmd, args)
		})

		// Verify warning message
		assert.Contains(t, stdout, "設定ファイル beaver.yml は既に存在します")
	})
}

func TestRunStatusCommand(t *testing.T) {
	t.Run("configuration file not found", func(t *testing.T) {
		// Create temporary directory without config
		tempDir := t.TempDir()
		originalWd, _ := os.Getwd()
		defer os.Chdir(originalWd)
		os.Chdir(tempDir)

		// Capture stdout
		oldStdout := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		cmd := &cobra.Command{}
		args := []string{}

		runStatusCommand(cmd, args)

		w.Close()
		os.Stdout = oldStdout
		output, _ := io.ReadAll(r)

		// Verify no config message
		outputStr := string(output)
		assert.Contains(t, outputStr, "設定ファイルなし")
		assert.Contains(t, outputStr, "beaver init で初期化してください")
	})

	t.Run("valid configuration loaded", func(t *testing.T) {
		// Skip test that makes real GitHub API calls unless explicitly enabled
		if os.Getenv("BEAVER_GITHUB_API_TESTS") != "true" {
			t.Skip("Skipping GitHub API test. Set BEAVER_GITHUB_API_TESTS=true to enable.")
		}

		// Create temporary directory with valid config
		tempDir := t.TempDir()
		originalWd, _ := os.Getwd()
		defer os.Chdir(originalWd)
		os.Chdir(tempDir)

		// Create valid config file
		configContent := `project:
  name: "Test Project"
  repository: "owner/repo"
sources:
  github:
    token: "test-token"
output:
  wiki:
    platform: "github"
ai:
  provider: "openai"
  model: "gpt-3.5-turbo"`

		configPath := tempDir + "/beaver.yml"
		err := os.WriteFile(configPath, []byte(configContent), 0600)
		require.NoError(t, err)

		// Set BEAVER_CONFIG_PATH to ensure test config is used
		originalConfigPath := os.Getenv("BEAVER_CONFIG_PATH")
		defer func() {
			if originalConfigPath != "" {
				os.Setenv("BEAVER_CONFIG_PATH", originalConfigPath)
			} else {
				os.Unsetenv("BEAVER_CONFIG_PATH")
			}
		}()
		os.Setenv("BEAVER_CONFIG_PATH", configPath)

		// Capture stdout
		oldStdout := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		cmd := &cobra.Command{}
		args := []string{}

		runStatusCommand(cmd, args)

		w.Close()
		os.Stdout = oldStdout
		output, _ := io.ReadAll(r)

		// Verify status information
		outputStr := string(output)
		// Test configuration file should be used
		assert.Contains(t, outputStr, "Test Project")
		assert.Contains(t, outputStr, "owner/repo")
		assert.Contains(t, outputStr, "openai")
		// Token is configured in test, so connection may be tested
		assert.Contains(t, outputStr, "GITHUB_TOKEN 設定済み")
	})

	t.Run("missing GitHub token", func(t *testing.T) {
		// Create temporary directory with config missing token
		tempDir := t.TempDir()
		originalWd, _ := os.Getwd()
		defer os.Chdir(originalWd)
		os.Chdir(tempDir)

		// Create config without token
		configContent := `project:
  name: "Test Project"
  repository: "owner/repo"
sources:
  github:
    token: ""
output:
  wiki:
    platform: "github"
ai:
  provider: "openai"
  model: "gpt-3.5-turbo"`

		configPath := tempDir + "/beaver.yml"
		err := os.WriteFile(configPath, []byte(configContent), 0600)
		require.NoError(t, err)

		// Set BEAVER_CONFIG_PATH to ensure test config is used
		originalConfigPath := os.Getenv("BEAVER_CONFIG_PATH")
		defer func() {
			if originalConfigPath != "" {
				os.Setenv("BEAVER_CONFIG_PATH", originalConfigPath)
			} else {
				os.Unsetenv("BEAVER_CONFIG_PATH")
			}
		}()
		os.Setenv("BEAVER_CONFIG_PATH", configPath)

		// Clear GITHUB_TOKEN environment variable to ensure test uses config only
		originalGitHubToken := os.Getenv("GITHUB_TOKEN")
		defer func() {
			if originalGitHubToken != "" {
				os.Setenv("GITHUB_TOKEN", originalGitHubToken)
			} else {
				os.Unsetenv("GITHUB_TOKEN")
			}
		}()
		os.Unsetenv("GITHUB_TOKEN")

		// Capture stdout
		oldStdout := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		cmd := &cobra.Command{}
		args := []string{}

		runStatusCommand(cmd, args)

		w.Close()
		os.Stdout = oldStdout
		output, _ := io.ReadAll(r)

		// Verify warning for missing token or other GitHub connection issues
		outputStr := string(output)
		assert.True(t, strings.Contains(outputStr, "GITHUB_TOKEN が設定されていません") || strings.Contains(outputStr, "Issues取得テストエラー"))
	})

	t.Run("configuration load error", func(t *testing.T) {
		tempDir := t.TempDir()
		originalWd, _ := os.Getwd()
		defer os.Chdir(originalWd)
		os.Chdir(tempDir)

		// Create invalid config file
		configContent := `invalid yaml content: [unclosed`
		configPath := tempDir + "/beaver.yml"
		err := os.WriteFile(configPath, []byte(configContent), 0600)
		require.NoError(t, err)

		// Set BEAVER_CONFIG_PATH to ensure test config is used
		originalConfigPath := os.Getenv("BEAVER_CONFIG_PATH")
		defer func() {
			if originalConfigPath != "" {
				os.Setenv("BEAVER_CONFIG_PATH", originalConfigPath)
			} else {
				os.Unsetenv("BEAVER_CONFIG_PATH")
			}
		}()
		os.Setenv("BEAVER_CONFIG_PATH", configPath)

		// Capture stdout
		oldStdout := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		cmd := &cobra.Command{}
		runStatusCommand(cmd, []string{})

		w.Close()
		os.Stdout = oldStdout
		output, _ := io.ReadAll(r)

		// Verify configuration load error
		outputStr := string(output)
		assert.Contains(t, outputStr, "設定読み込みエラー")
	})

	t.Run("GitHub connection failure", func(t *testing.T) {
		// Skip test that makes real GitHub API calls unless explicitly enabled
		if os.Getenv("BEAVER_GITHUB_API_TESTS") != "true" {
			t.Skip("Skipping GitHub API test. Set BEAVER_GITHUB_API_TESTS=true to enable.")
		}

		tempDir := t.TempDir()
		originalWd, _ := os.Getwd()
		defer os.Chdir(originalWd)
		os.Chdir(tempDir)

		// Create config with invalid token that will fail connection
		configContent := `project:
  name: "Test Project"
  repository: "owner/repo"
sources:
  github:
    token: "invalid-token-that-will-fail"
output:
  wiki:
    platform: "github"
ai:
  provider: "openai"
  model: "gpt-3.5-turbo"`

		err := os.WriteFile("beaver.yml", []byte(configContent), 0600)
		require.NoError(t, err)

		// Capture stdout
		oldStdout := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		cmd := &cobra.Command{}
		runStatusCommand(cmd, []string{})

		w.Close()
		os.Stdout = oldStdout
		output, _ := io.ReadAll(r)

		// Verify GitHub connection error
		outputStr := string(output)
		assert.Contains(t, outputStr, "GitHub接続をテスト中")
		// Connection will fail with invalid token
		assert.Contains(t, outputStr, "GitHub接続エラー")
	})

	t.Run("repository not configured properly", func(t *testing.T) {
		tempDir := t.TempDir()
		originalWd, _ := os.Getwd()
		defer os.Chdir(originalWd)
		os.Chdir(tempDir)

		// Create config with default repository value
		configContent := `project:
  name: "Test Project"
  repository: "username/my-repo"
sources:
  github:
    token: "test-token"
output:
  wiki:
    platform: "github"
ai:
  provider: "openai"
  model: "gpt-3.5-turbo"`

		configPath := tempDir + "/beaver.yml"
		err := os.WriteFile(configPath, []byte(configContent), 0600)
		require.NoError(t, err)

		// Set BEAVER_CONFIG_PATH to ensure test config is used
		originalConfigPath := os.Getenv("BEAVER_CONFIG_PATH")
		defer func() {
			if originalConfigPath != "" {
				os.Setenv("BEAVER_CONFIG_PATH", originalConfigPath)
			} else {
				os.Unsetenv("BEAVER_CONFIG_PATH")
			}
		}()
		os.Setenv("BEAVER_CONFIG_PATH", configPath)

		// Capture stdout
		oldStdout := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		cmd := &cobra.Command{}
		runStatusCommand(cmd, []string{})

		w.Close()
		os.Stdout = oldStdout
		output, _ := io.ReadAll(r)

		// Verify status information shows but repository is not tested
		outputStr := string(output)
		assert.Contains(t, outputStr, "Test Project")
		assert.Contains(t, outputStr, "username/my-repo")
		// Should not test Issues fetch for default repository
		assert.NotContains(t, outputStr, "Issues取得テスト")
	})

	t.Run("empty repository configuration", func(t *testing.T) {
		tempDir := t.TempDir()
		originalWd, _ := os.Getwd()
		defer os.Chdir(originalWd)
		os.Chdir(tempDir)

		// Create config with empty repository
		configContent := `project:
  name: "Test Project"
  repository: ""
sources:
  github:
    token: "test-token"
output:
  wiki:
    platform: "github"
ai:
  provider: "openai"
  model: "gpt-3.5-turbo"`

		configPath := tempDir + "/beaver.yml"
		err := os.WriteFile(configPath, []byte(configContent), 0600)
		require.NoError(t, err)

		// Set BEAVER_CONFIG_PATH to ensure test config is used
		originalConfigPath := os.Getenv("BEAVER_CONFIG_PATH")
		defer func() {
			if originalConfigPath != "" {
				os.Setenv("BEAVER_CONFIG_PATH", originalConfigPath)
			} else {
				os.Unsetenv("BEAVER_CONFIG_PATH")
			}
		}()
		os.Setenv("BEAVER_CONFIG_PATH", configPath)

		// Capture stdout
		oldStdout := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		cmd := &cobra.Command{}
		runStatusCommand(cmd, []string{})

		w.Close()
		os.Stdout = oldStdout
		output, _ := io.ReadAll(r)

		// Verify status information shows but repository is not tested
		outputStr := string(output)
		assert.Contains(t, outputStr, "Test Project")
		// Should not test Issues fetch for empty repository
		assert.NotContains(t, outputStr, "Issues取得テスト")
	})
}

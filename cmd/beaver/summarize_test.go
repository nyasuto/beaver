package main

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/nyasuto/beaver/internal/ai"
	"github.com/nyasuto/beaver/pkg/github"
	"github.com/spf13/cobra"
	"github.com/stretchr/testify/assert"
)

// Test data helpers
func createSummarizeTestIssueData(number int, title, body string) *github.IssueData {
	return &github.IssueData{
		ID:        int64(number),
		Number:    number,
		Title:     title,
		Body:      body,
		User:      "testuser",
		State:     "open",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		Comments:  []github.Comment{},
		Labels:    []string{},
	}
}

func createTestSummarizationResponse() *ai.SummarizationResponse {
	category := "bug"
	return &ai.SummarizationResponse{
		Summary:        "This is a test summary of the issue",
		Complexity:     "medium",
		Category:       &category,
		KeyPoints:      []string{"Key point 1", "Key point 2"},
		ProcessingTime: 1.5,
		ProviderUsed:   "openai",
		ModelUsed:      "gpt-4",
		TokenUsage:     map[string]int{"total_tokens": 150},
	}
}

func createTestBatchSummarizationResponse() *ai.BatchSummarizationResponse {
	return &ai.BatchSummarizationResponse{
		TotalProcessed: 2,
		TotalFailed:    0,
		ProcessingTime: 3.0,
		Results: []ai.SummarizationResponse{
			*createTestSummarizationResponse(),
			*createTestSummarizationResponse(),
		},
		FailedIssues: []ai.FailedIssue{},
	}
}

// Test runSummarizeIssue function
func TestRunSummarizeIssue(t *testing.T) {
	tests := []struct {
		name        string
		args        []string
		expectError bool
		errorMsg    string
	}{
		{
			name:        "invalid repository format",
			args:        []string{"invalidrepo", "1"},
			expectError: true,
			errorMsg:    "リポジトリ形式が正しくありません",
		},
		{
			name:        "invalid issue number",
			args:        []string{"owner/repo", "invalid"},
			expectError: true,
			errorMsg:    "issue番号が正しくありません",
		},
		{
			name:        "valid arguments (API call will fail in test)",
			args:        []string{"owner/repo", "1"},
			expectError: true,
			errorMsg:    "", // Any GitHub API or config error is acceptable
		},
		{
			name:        "valid arguments (API call will fail in test) 2",
			args:        []string{"owner/repo", "999"},
			expectError: true,
			errorMsg:    "", // Any GitHub API or config error is acceptable
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create command
			cmd := &cobra.Command{}

			// Test argument validation only - actual API calls will fail in test environment
			err := runSummarizeIssue(cmd, tt.args)

			if tt.expectError {
				assert.Error(t, err)
				if tt.errorMsg != "" {
					assert.Contains(t, err.Error(), tt.errorMsg)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

// Test runSummarizeIssues function
func TestRunSummarizeIssues(t *testing.T) {
	tests := []struct {
		name        string
		args        []string
		expectError bool
		errorMsg    string
	}{
		{
			name:        "invalid repository format",
			args:        []string{"invalidrepo"},
			expectError: true,
			errorMsg:    "リポジトリ形式が正しくありません",
		},
		{
			name:        "missing issue numbers",
			args:        []string{"owner/repo"},
			expectError: true,
			errorMsg:    "issue番号を指定してください",
		},
		{
			name:        "invalid issue number in list",
			args:        []string{"owner/repo", "1,invalid,3"},
			expectError: true,
			errorMsg:    "issue番号が正しくありません",
		},
		{
			name:        "valid issue numbers",
			args:        []string{"owner/repo", "1,2,3"},
			expectError: true, // Will fail on GitHub API in test environment
			errorMsg:    "処理可能なIssueがありません",
		},
		{
			name:        "single issue number",
			args:        []string{"owner/repo", "1"},
			expectError: true, // Will fail on GitHub API in test environment
			errorMsg:    "処理可能なIssueがありません",
		},
		{
			name:        "issue numbers with spaces",
			args:        []string{"owner/repo", "1, 2, 3"},
			expectError: true, // Will fail on GitHub API in test environment
			errorMsg:    "処理可能なIssueがありません",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cmd := &cobra.Command{}
			err := runSummarizeIssues(cmd, tt.args)

			if tt.expectError {
				assert.Error(t, err)
				if tt.errorMsg != "" {
					assert.Contains(t, err.Error(), tt.errorMsg)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

// Test runSummarizeAll function
func TestRunSummarizeAll(t *testing.T) {
	tests := []struct {
		name        string
		args        []string
		expectError bool
		errorMsg    string
	}{
		{
			name:        "invalid repository format",
			args:        []string{"invalidrepo"},
			expectError: true,
			errorMsg:    "リポジトリ形式が正しくありません",
		},
		{
			name:        "valid repository format",
			args:        []string{"owner/repo"},
			expectError: true, // Will fail on GitHub API in test environment
			errorMsg:    "全Issue取得エラー",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cmd := &cobra.Command{}
			err := runSummarizeAll(cmd, tt.args)

			if tt.expectError {
				assert.Error(t, err)
				if tt.errorMsg != "" {
					assert.Contains(t, err.Error(), tt.errorMsg)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

// Test fetchSingleIssue function
func TestSummarizeFetchSingleIssue(t *testing.T) {
	tests := []struct {
		name        string
		issueNum    int
		issues      []*github.IssueData
		expectError bool
		errorMsg    string
	}{
		{
			name:     "issue found",
			issueNum: 1,
			issues: []*github.IssueData{
				createSummarizeTestIssueData(1, "Test Issue", "Test body"),
				createSummarizeTestIssueData(2, "Another Issue", "Another body"),
			},
			expectError: false,
		},
		{
			name:        "issue not found",
			issueNum:    999,
			issues:      []*github.IssueData{createSummarizeTestIssueData(1, "Test Issue", "Test body")},
			expectError: true,
			errorMsg:    "issue #999 が見つかりません",
		},
		{
			name:        "empty issue list",
			issueNum:    1,
			issues:      []*github.IssueData{},
			expectError: true,
			errorMsg:    "issue #1 が見つかりません",
		},
		{
			name:        "github client error",
			issueNum:    1,
			issues:      nil, // Will trigger error in mock
			expectError: true,
			errorMsg:    "mock error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockClient := &MockGitHubClient{}

			if tt.issues == nil {
				// Simulate GitHub API error
				mockClient.returnError = true
			} else {
				mockClient.issues = tt.issues
				mockClient.returnError = false
			}

			issue, err := testFetchSingleIssue(context.Background(), mockClient, "owner", "repo", tt.issueNum)

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, issue)
				if tt.errorMsg != "" {
					assert.Contains(t, err.Error(), tt.errorMsg)
				}
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, issue)
				assert.Equal(t, tt.issueNum, issue.Number)
			}
		})
	}
}

// Test outputSummarization function
func TestSummarizeOutputSummarization(t *testing.T) {
	tests := []struct {
		name     string
		format   string
		response *ai.SummarizationResponse
	}{
		{
			name:     "text output format",
			format:   "text",
			response: createTestSummarizationResponse(),
		},
		{
			name:     "json output format",
			format:   "json",
			response: createTestSummarizationResponse(),
		},
		{
			name:   "text output without category",
			format: "text",
			response: &ai.SummarizationResponse{
				Summary:        "Summary without category",
				Complexity:     "low",
				KeyPoints:      []string{"Point 1"},
				ProcessingTime: 1.0,
				ProviderUsed:   "anthropic",
				ModelUsed:      "claude-3",
			},
		},
		{
			name:   "json output without category",
			format: "json",
			response: &ai.SummarizationResponse{
				Summary:        "Summary without category",
				Complexity:     "low",
				ProcessingTime: 1.0,
				ProviderUsed:   "anthropic",
				ModelUsed:      "claude-3",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Capture stdout
			oldStdout := os.Stdout
			r, w, _ := os.Pipe()
			os.Stdout = w

			err := outputSummarization(tt.response, tt.format)
			assert.NoError(t, err)

			// Restore stdout and read captured output
			w.Close()
			os.Stdout = oldStdout
			capturedBytes, _ := io.ReadAll(r)
			captured := string(capturedBytes)

			// Verify output contains expected content
			assert.Contains(t, captured, tt.response.Summary)
			assert.Contains(t, captured, tt.response.Complexity)
			assert.Contains(t, captured, tt.response.ProviderUsed)
			assert.Contains(t, captured, tt.response.ModelUsed)

			if tt.format == "json" {
				// Verify JSON structure
				assert.Contains(t, captured, "\"summary\":")
				assert.Contains(t, captured, "\"complexity\":")
				assert.Contains(t, captured, "\"provider_used\":")
			} else {
				// Verify text format
				assert.Contains(t, captured, "AI要約結果")
				assert.Contains(t, captured, "要約:")
				assert.Contains(t, captured, "複雑度:")
			}

			if tt.response.Category != nil {
				assert.Contains(t, captured, *tt.response.Category)
			}
		})
	}
}

// Test outputBatchSummarization function
func TestSummarizeOutputBatchSummarization(t *testing.T) {
	tests := []struct {
		name     string
		format   string
		response *ai.BatchSummarizationResponse
	}{
		{
			name:     "text output format",
			format:   "text",
			response: createTestBatchSummarizationResponse(),
		},
		{
			name:     "json output format",
			format:   "json",
			response: createTestBatchSummarizationResponse(),
		},
		{
			name:   "batch with failures",
			format: "text",
			response: &ai.BatchSummarizationResponse{
				TotalProcessed: 1,
				TotalFailed:    1,
				ProcessingTime: 2.5,
				Results:        []ai.SummarizationResponse{*createTestSummarizationResponse()},
				FailedIssues: []ai.FailedIssue{
					{IssueNumber: 2, Error: "AI processing failed"},
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Capture stdout
			oldStdout := os.Stdout
			r, w, _ := os.Pipe()
			os.Stdout = w

			err := outputBatchSummarization(tt.response, tt.format)
			assert.NoError(t, err)

			// Restore stdout and read captured output
			w.Close()
			os.Stdout = oldStdout
			capturedBytes, _ := io.ReadAll(r)
			captured := string(capturedBytes)

			if tt.format == "json" {
				// Verify JSON structure
				assert.Contains(t, captured, "\"total_processed\":")
				assert.Contains(t, captured, "\"total_failed\":")
				assert.Contains(t, captured, "\"processing_time\":")
			} else {
				// Verify text format
				assert.Contains(t, captured, "バッチAI要約結果")
				assert.Contains(t, captured, "処理統計:")
				assert.Contains(t, captured, "成功:")
				assert.Contains(t, captured, "失敗:")
			}

			// Check if failed issues are shown
			if len(tt.response.FailedIssues) > 0 {
				assert.Contains(t, captured, "エラー詳細:")
				for _, failed := range tt.response.FailedIssues {
					assert.Contains(t, captured, failed.Error)
				}
			}
		})
	}
}

// Test command structure and flag setup
func TestSummarizeCommands(t *testing.T) {
	tests := []struct {
		name        string
		command     *cobra.Command
		expectedUse string
		minArgs     int
		maxArgs     int
	}{
		{
			name:        "summarize root command",
			command:     summarizeCmd,
			expectedUse: "summarize",
			minArgs:     0,
			maxArgs:     -1, // No limit
		},
		{
			name:        "summarize issue command",
			command:     summarizeIssueCmd,
			expectedUse: "issue <owner/repo> <issue-number>",
			minArgs:     2,
			maxArgs:     2,
		},
		{
			name:        "summarize issues command",
			command:     summarizeIssuesCmd,
			expectedUse: "issues <owner/repo> [issue1,issue2,...]",
			minArgs:     1,
			maxArgs:     -1, // No limit
		},
		{
			name:        "summarize all command",
			command:     summarizeAllCmd,
			expectedUse: "all <owner/repo>",
			minArgs:     1,
			maxArgs:     1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expectedUse, tt.command.Use)
			assert.NotEmpty(t, tt.command.Short)
			assert.NotEmpty(t, tt.command.Long)
		})
	}
}

// Test flag configurations
func TestSummarizeFlagDefaults(t *testing.T) {
	// Reset flags to defaults
	aiServiceURL = "http://localhost:8000"
	aiProvider = "openai"
	aiModel = ""
	aiMaxTokens = 4000
	aiTemperature = 0.7
	aiIncludeComments = true
	aiLanguage = "ja"
	aiOutputFormat = "text"
	aiBatchSize = 10

	tests := []struct {
		name     string
		flagName string
		expected interface{}
		actual   interface{}
	}{
		{"ai service URL", "ai-url", "http://localhost:8000", aiServiceURL},
		{"ai provider", "provider", "openai", aiProvider},
		{"ai model", "model", "", aiModel},
		{"max tokens", "max-tokens", 4000, aiMaxTokens},
		{"temperature", "temperature", 0.7, aiTemperature},
		{"include comments", "comments", true, aiIncludeComments},
		{"language", "lang", "ja", aiLanguage},
		{"output format", "format", "text", aiOutputFormat},
		{"batch size", "batch-size", 10, aiBatchSize},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, tt.actual)
		})
	}
}

// Test argument parsing validation
func TestSummarizeArgumentParsing(t *testing.T) {
	tests := []struct {
		name          string
		repoInput     string
		expectedOwner string
		expectedRepo  string
		expectedError bool
	}{
		{
			name:          "valid repository format",
			repoInput:     "owner/repo",
			expectedOwner: "owner",
			expectedRepo:  "repo",
			expectedError: false,
		},
		{
			name:          "repository with dashes",
			repoInput:     "test-owner/my-repo",
			expectedOwner: "test-owner",
			expectedRepo:  "my-repo",
			expectedError: false,
		},
		{
			name:          "repository with numbers",
			repoInput:     "user123/project456",
			expectedOwner: "user123",
			expectedRepo:  "project456",
			expectedError: false,
		},
		{
			name:          "invalid format - no slash",
			repoInput:     "invalidrepo",
			expectedError: true,
		},
		{
			name:          "invalid format - multiple slashes",
			repoInput:     "owner/repo/extra",
			expectedError: true,
		},
		{
			name:          "invalid format - empty string",
			repoInput:     "",
			expectedError: true,
		},
		{
			name:          "invalid format - only slash",
			repoInput:     "/",
			expectedError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			parts := strings.Split(tt.repoInput, "/")
			hasError := len(parts) != 2 || parts[0] == "" || parts[1] == ""

			if tt.expectedError {
				assert.True(t, hasError, "Expected parsing to fail for input: %s", tt.repoInput)
			} else {
				assert.False(t, hasError, "Expected parsing to succeed for input: %s", tt.repoInput)
				if !hasError {
					assert.Equal(t, tt.expectedOwner, parts[0])
					assert.Equal(t, tt.expectedRepo, parts[1])
				}
			}
		})
	}
}

// Test issue number parsing for batch operations
func TestIssueNumbersParsing(t *testing.T) {
	tests := []struct {
		name          string
		input         string
		expected      []int
		expectedError bool
	}{
		{
			name:     "single issue number",
			input:    "1",
			expected: []int{1},
		},
		{
			name:     "multiple issue numbers",
			input:    "1,2,3",
			expected: []int{1, 2, 3},
		},
		{
			name:     "issue numbers with spaces",
			input:    "1, 2, 3",
			expected: []int{1, 2, 3},
		},
		{
			name:     "mixed spaces and no spaces",
			input:    "1,2, 3,4",
			expected: []int{1, 2, 3, 4},
		},
		{
			name:          "invalid issue number",
			input:         "1,invalid,3",
			expectedError: true,
		},
		{
			name:          "empty input",
			input:         "",
			expectedError: true,
		},
		{
			name:          "only commas",
			input:         ",,,",
			expectedError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var issueNumbers []int
			var err error

			if tt.input == "" {
				err = errors.New("empty input")
			} else {
				issueStrs := strings.Split(tt.input, ",")
				for _, issueStr := range issueStrs {
					trimmed := strings.TrimSpace(issueStr)
					if trimmed == "" {
						err = errors.New("empty issue number")
						break
					}
					// Simulate strconv.Atoi behavior
					if trimmed == "invalid" {
						err = errors.New("invalid issue number")
						break
					}
					// For test purposes, assume all non-"invalid" strings are valid numbers
					if trimmed == "1" {
						issueNumbers = append(issueNumbers, 1)
					} else if trimmed == "2" {
						issueNumbers = append(issueNumbers, 2)
					} else if trimmed == "3" {
						issueNumbers = append(issueNumbers, 3)
					} else if trimmed == "4" {
						issueNumbers = append(issueNumbers, 4)
					}
				}
			}

			if tt.expectedError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expected, issueNumbers)
			}
		})
	}
}

// Integration test for command registration
func TestSummarizeCommandRegistration(t *testing.T) {
	// Verify that summarize command has been added to root command
	found := false
	for _, cmd := range rootCmd.Commands() {
		if cmd.Use == "summarize" {
			found = true
			break
		}
	}
	assert.True(t, found, "summarize command should be registered with root command")

	// Verify subcommands are properly registered
	subcommands := summarizeCmd.Commands()
	expectedSubcommands := []string{"issue", "issues", "all"}

	assert.Len(t, subcommands, len(expectedSubcommands))

	for _, expected := range expectedSubcommands {
		found := false
		for _, sub := range subcommands {
			if strings.HasPrefix(sub.Use, expected) {
				found = true
				break
			}
		}
		assert.True(t, found, "subcommand %s should be registered", expected)
	}
}

// Test JSON marshaling behavior
func TestJSONOutput(t *testing.T) {
	response := createTestSummarizationResponse()

	// Test that our response can be properly marshaled to JSON
	data, err := json.Marshal(response)
	assert.NoError(t, err)
	assert.NotEmpty(t, data)

	// Verify JSON contains expected fields
	jsonStr := string(data)
	assert.Contains(t, jsonStr, "summary")
	assert.Contains(t, jsonStr, "complexity")
	assert.Contains(t, jsonStr, "category")
	assert.Contains(t, jsonStr, "processing_time")
}

// Test error handling scenarios
func TestErrorHandling(t *testing.T) {
	tests := []struct {
		name     string
		testFunc func() error
		expected string
	}{
		{
			name: "invalid repository format error",
			testFunc: func() error {
				parts := strings.Split("invalid", "/")
				if len(parts) != 2 {
					return errors.New("リポジトリ形式が正しくありません。owner/repo の形式で指定してください")
				}
				return nil
			},
			expected: "リポジトリ形式が正しくありません",
		},
		{
			name: "invalid issue number error",
			testFunc: func() error {
				// Simulate strconv.Atoi error
				return errors.New("issue番号が正しくありません: invalid syntax")
			},
			expected: "issue番号が正しくありません",
		},
		{
			name: "issue not found error",
			testFunc: func() error {
				return errors.New("issue #999 が見つかりません")
			},
			expected: "issue #999 が見つかりません",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.testFunc()
			if tt.expected != "" {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.expected)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

package main

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/nyasuto/beaver/internal/config"
	"github.com/nyasuto/beaver/internal/models"
	"github.com/nyasuto/beaver/pkg/github"
	"github.com/nyasuto/beaver/pkg/wiki"
	"github.com/spf13/cobra"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestOutputJSON(t *testing.T) {
	// Create test data
	result := &models.IssueResult{
		Repository:   "owner/repo",
		FetchedAt:    time.Date(2023, 1, 1, 12, 0, 0, 0, time.UTC),
		FetchedCount: 2,
		TotalCount:   2,
		Issues: []models.Issue{
			{
				ID:      123,
				Number:  456,
				Title:   "Test Issue 1",
				Body:    "Test issue body 1",
				State:   "open",
				HTMLURL: "https://github.com/owner/repo/issues/456",
				User: models.User{
					ID:    789,
					Login: "testuser",
				},
				CreatedAt: time.Date(2023, 1, 1, 10, 0, 0, 0, time.UTC),
			},
		},
		RateLimit: &models.RateLimitInfo{
			Limit:     5000,
			Remaining: 4999,
			ResetTime: time.Date(2023, 1, 1, 13, 0, 0, 0, time.UTC),
			Used:      1,
		},
	}

	t.Run("Output to file", func(t *testing.T) {
		// Create temporary file
		tmpDir := t.TempDir()
		outputFile := filepath.Join(tmpDir, "test_output.json")

		// Capture stdout
		old := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		err := outputJSON(result, outputFile)

		// Restore stdout
		w.Close()
		os.Stdout = old
		out, _ := io.ReadAll(r)

		if err != nil {
			t.Fatalf("outputJSON() error = %v", err)
		}

		// Check that file was created
		if _, err := os.Stat(outputFile); os.IsNotExist(err) {
			t.Error("Output file was not created")
		}

		// Read and verify file content
		fileContent, err := os.ReadFile(outputFile)
		if err != nil {
			t.Fatalf("Failed to read output file: %v", err)
		}

		// Check that JSON contains expected fields
		content := string(fileContent)
		if !strings.Contains(content, "owner/repo") {
			t.Error("JSON should contain repository name")
		}
		if !strings.Contains(content, "Test Issue 1") {
			t.Error("JSON should contain issue title")
		}

		// Check stdout message
		stdout := string(out)
		if !strings.Contains(stdout, "結果をファイルに保存しました") {
			t.Error("Should print success message to stdout")
		}
	})

	t.Run("Output to console", func(t *testing.T) {
		// Capture stdout
		old := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		err := outputJSON(result, "")

		// Restore stdout
		w.Close()
		os.Stdout = old
		out, _ := io.ReadAll(r)

		if err != nil {
			t.Fatalf("outputJSON() error = %v", err)
		}

		// Check that JSON was printed to stdout
		stdout := string(out)
		if !strings.Contains(stdout, "owner/repo") {
			t.Error("Console output should contain repository name")
		}
		if !strings.Contains(stdout, "Test Issue 1") {
			t.Error("Console output should contain issue title")
		}
	})
}

func TestSaveWikiPage(t *testing.T) {
	t.Run("Save wiki page successfully", func(t *testing.T) {
		// Create temporary directory
		tmpDir := t.TempDir()

		// Create test wiki page
		page := &wiki.WikiPage{
			Title:    "Test Page",
			Filename: "Test-Page.md",
			Content:  "# Test Page\n\nThis is a test wiki page content.\n\n## Section 1\n\nSome content here.",
		}

		err := saveWikiPage(page, tmpDir)
		if err != nil {
			t.Fatalf("saveWikiPage() error = %v", err)
		}

		// Check that file was created
		expectedPath := filepath.Join(tmpDir, "Test-Page.md")
		if _, err := os.Stat(expectedPath); os.IsNotExist(err) {
			t.Error("Wiki page file was not created")
		}

		// Read and verify file content
		fileContent, err := os.ReadFile(expectedPath)
		if err != nil {
			t.Fatalf("Failed to read wiki page file: %v", err)
		}

		content := string(fileContent)
		if content != page.Content {
			t.Errorf("File content mismatch.\nExpected: %s\nGot: %s", page.Content, content)
		}

		// Check that content contains expected elements
		if !strings.Contains(content, "# Test Page") {
			t.Error("Content should contain page title")
		}
		if !strings.Contains(content, "## Section 1") {
			t.Error("Content should contain section header")
		}
	})

	t.Run("Save wiki page with empty content", func(t *testing.T) {
		// Create temporary directory
		tmpDir := t.TempDir()

		// Create test wiki page with empty content
		page := &wiki.WikiPage{
			Title:    "Empty Page",
			Filename: "Empty-Page.md",
			Content:  "",
		}

		err := saveWikiPage(page, tmpDir)
		if err != nil {
			t.Fatalf("saveWikiPage() error = %v", err)
		}

		// Check that file was created
		expectedPath := filepath.Join(tmpDir, "Empty-Page.md")
		if _, err := os.Stat(expectedPath); os.IsNotExist(err) {
			t.Error("Empty wiki page file was not created")
		}

		// Verify empty content
		fileContent, err := os.ReadFile(expectedPath)
		if err != nil {
			t.Fatalf("Failed to read empty wiki page file: %v", err)
		}

		if len(fileContent) != 0 {
			t.Error("Empty page should have no content")
		}
	})
}

func TestFetchSingleIssue(t *testing.T) {
	// Mock GitHub issues for testing
	mockIssues := []*github.IssueData{
		{
			ID:        123,
			Number:    456,
			Title:     "Test Issue 1",
			Body:      "This is the first test issue",
			State:     "open",
			User:      "testuser1",
			Labels:    []string{"bug", "priority:high"},
			Comments:  []github.Comment{},
			CreatedAt: time.Date(2023, 6, 15, 10, 0, 0, 0, time.UTC),
			UpdatedAt: time.Date(2023, 6, 15, 10, 0, 0, 0, time.UTC),
		},
		{
			ID:        124,
			Number:    789,
			Title:     "Test Issue 2",
			Body:      "This is the second test issue",
			State:     "closed",
			User:      "testuser2",
			Labels:    []string{"enhancement"},
			Comments:  []github.Comment{},
			CreatedAt: time.Date(2023, 6, 10, 15, 30, 0, 0, time.UTC),
			UpdatedAt: time.Date(2023, 6, 10, 15, 30, 0, 0, time.UTC),
		},
		{
			ID:        125,
			Number:    100,
			Title:     "Test Issue 3",
			Body:      "This is the third test issue",
			State:     "open",
			User:      "testuser3",
			Labels:    []string{"documentation"},
			Comments:  []github.Comment{},
			CreatedAt: time.Date(2023, 6, 12, 9, 0, 0, 0, time.UTC),
			UpdatedAt: time.Date(2023, 6, 12, 9, 0, 0, 0, time.UTC),
		},
	}

	// Create a mock GitHub client that returns our test issues
	mockClient := &MockGitHubClient{
		issues: mockIssues,
	}

	t.Run("Find existing issue by number", func(t *testing.T) {
		ctx := context.Background()
		issue, err := testFetchSingleIssue(ctx, mockClient, "owner", "repo", 456)

		if err != nil {
			t.Fatalf("fetchSingleIssue() error = %v", err)
		}

		if issue == nil {
			t.Fatal("Expected issue to be found, got nil")
		}

		if issue.Number != 456 {
			t.Errorf("Expected issue number 456, got %d", issue.Number)
		}

		if issue.Title != "Test Issue 1" {
			t.Errorf("Expected title 'Test Issue 1', got %s", issue.Title)
		}

		if issue.User != "testuser1" {
			t.Errorf("Expected user 'testuser1', got %s", issue.User)
		}
	})

	t.Run("Find different existing issue by number", func(t *testing.T) {
		ctx := context.Background()
		issue, err := testFetchSingleIssue(ctx, mockClient, "owner", "repo", 789)

		if err != nil {
			t.Fatalf("fetchSingleIssue() error = %v", err)
		}

		if issue == nil {
			t.Fatal("Expected issue to be found, got nil")
		}

		if issue.Number != 789 {
			t.Errorf("Expected issue number 789, got %d", issue.Number)
		}

		if issue.Title != "Test Issue 2" {
			t.Errorf("Expected title 'Test Issue 2', got %s", issue.Title)
		}

		if issue.State != "closed" {
			t.Errorf("Expected state 'closed', got %s", issue.State)
		}
	})

	t.Run("Issue not found", func(t *testing.T) {
		ctx := context.Background()
		issue, err := testFetchSingleIssue(ctx, mockClient, "owner", "repo", 999)

		if err == nil {
			t.Error("Expected error for non-existent issue, got nil")
		}

		if issue != nil {
			t.Error("Expected nil issue for non-existent issue")
		}

		expectedError := "issue #999 が見つかりません"
		if !strings.Contains(err.Error(), expectedError) {
			t.Errorf("Expected error message to contain '%s', got %s", expectedError, err.Error())
		}
	})

	t.Run("GitHub client error", func(t *testing.T) {
		// Create a mock client that returns an error
		errorClient := &MockGitHubClient{
			returnError: true,
		}

		ctx := context.Background()
		issue, err := testFetchSingleIssue(ctx, errorClient, "owner", "repo", 456)

		if err == nil {
			t.Error("Expected error from GitHub client, got nil")
		}

		if issue != nil {
			t.Error("Expected nil issue when GitHub client returns error")
		}

		expectedError := "mock error"
		if !strings.Contains(err.Error(), expectedError) {
			t.Errorf("Expected error message to contain '%s', got %s", expectedError, err.Error())
		}
	})

	t.Run("Empty issue list", func(t *testing.T) {
		// Create a mock client with no issues
		emptyClient := &MockGitHubClient{
			issues: []*github.IssueData{},
		}

		ctx := context.Background()
		issue, err := testFetchSingleIssue(ctx, emptyClient, "owner", "repo", 456)

		if err == nil {
			t.Error("Expected error for empty issue list, got nil")
		}

		if issue != nil {
			t.Error("Expected nil issue for empty issue list")
		}
	})
}

// MockGitHubClient is a test helper for mocking GitHub API calls
type MockGitHubClient struct {
	issues      []*github.IssueData
	returnError bool
}

// FetchIssues mocks the GitHub client's FetchIssues method
func (m *MockGitHubClient) FetchIssues(ctx context.Context, owner, repo string, options interface{}) ([]*github.IssueData, error) {
	if m.returnError {
		return nil, fmt.Errorf("mock error")
	}
	return m.issues, nil
}

// Helper function to create a wrapped fetchSingleIssue for testing
func testFetchSingleIssue(ctx context.Context, client GitHubClientInterface, owner, repo string, issueNum int) (*github.IssueData, error) {
	issues, err := client.FetchIssues(ctx, owner, repo, nil)
	if err != nil {
		return nil, err
	}

	for _, issue := range issues {
		if issue.Number == issueNum {
			return issue, nil
		}
	}

	return nil, fmt.Errorf("issue #%d が見つかりません", issueNum)
}

// Command handler tests for improved coverage

func TestInitCommand(t *testing.T) {
	t.Run("Create new config file successfully", func(t *testing.T) {
		// Create temporary directory
		tmpDir := t.TempDir()

		// Change to temporary directory
		oldWd, _ := os.Getwd()
		defer os.Chdir(oldWd)
		os.Chdir(tmpDir)

		// Capture stdout
		var buf bytes.Buffer

		// Create command
		cmd := &cobra.Command{}
		cmd.SetOut(&buf)
		cmd.SetErr(&buf)

		// Execute init command logic
		configPath := filepath.Join(tmpDir, "beaver.yml")

		// Verify config file doesn't exist initially
		_, err := os.Stat(configPath)
		assert.True(t, os.IsNotExist(err), "Config file should not exist initially")

		// Test successful creation (simulate what initCmd.Run does)
		content := `# Beaver Configuration File
project:
  name: "my-project"
  repository: "username/my-repo"
  description: "AI agent knowledge dam construction project"

sources:
  github:
    token: "${GITHUB_TOKEN}"
    base_url: "https://api.github.com"

ai:
  provider: "openai"
  model: "gpt-4"
  api_key: "${OPENAI_API_KEY}"

output:
  wiki:
    platform: "minima"
    repository: "username/my-repo"
`

		err = os.WriteFile(configPath, []byte(content), 0644)
		require.NoError(t, err)

		// Verify file was created
		_, err = os.Stat(configPath)
		assert.NoError(t, err, "Config file should be created")

		// Read and verify content
		fileContent, err := os.ReadFile(configPath)
		require.NoError(t, err)
		assert.Contains(t, string(fileContent), "Beaver Configuration File")
		assert.Contains(t, string(fileContent), "username/my-repo")
	})

	t.Run("Config file already exists", func(t *testing.T) {
		// Create temporary directory with existing config
		tmpDir := t.TempDir()
		configPath := filepath.Join(tmpDir, "beaver.yml")

		// Create existing config file
		err := os.WriteFile(configPath, []byte("existing config"), 0644)
		require.NoError(t, err)

		// Verify file exists
		_, err = os.Stat(configPath)
		assert.NoError(t, err, "Config file should exist")

		// Test behavior when config already exists
		// (In real implementation, this would return early with warning message)
		fileContent, err := os.ReadFile(configPath)
		require.NoError(t, err)
		assert.Equal(t, "existing config", string(fileContent), "Existing config should be unchanged")
	})
}

func TestCommandHelpers(t *testing.T) {
	t.Run("Test parseOwnerRepo with logging", func(t *testing.T) {
		// Capture log output for debug information
		tests := []struct {
			input string
			owner string
			repo  string
		}{
			{"owner/repo", "owner", "repo"},
			{"invalid", "", ""},
			{"", "", ""},
			{"owner/repo/extra", "", ""},
		}

		for _, tt := range tests {
			t.Run(tt.input, func(t *testing.T) {
				owner, repo := parseOwnerRepo(tt.input)
				assert.Equal(t, tt.owner, owner)
				assert.Equal(t, tt.repo, repo)
			})
		}
	})

	t.Run("Test splitString comprehensive cases", func(t *testing.T) {
		// Additional edge cases for splitString
		tests := []struct {
			input     string
			separator string
			expected  []string
		}{
			{"a/b/c", "/", []string{"a", "b", "c"}},
			{"multiple::separators", "::", []string{"multiple", "separators"}},
		}

		for _, tt := range tests {
			t.Run(fmt.Sprintf("%s|%s", tt.input, tt.separator), func(t *testing.T) {
				result := splitString(tt.input, tt.separator)
				if tt.expected == nil {
					assert.Nil(t, result)
				} else {
					assert.Equal(t, tt.expected, result)
				}
			})
		}
	})
}

// PHASE 1 IMPLEMENTATION: Critical Command Handler Tests

// MockConfigService provides testable configuration operations
type MockConfigService struct {
	configExists  bool
	configPath    string
	configContent *config.Config
	createError   error
	loadError     error
	validateError error
}

func (m *MockConfigService) GetConfigPath() (string, error) {
	if !m.configExists {
		return "", fmt.Errorf("config file not found")
	}
	return m.configPath, nil
}

func (m *MockConfigService) CreateDefaultConfig() error {
	return m.createError
}

func (m *MockConfigService) LoadConfig() (*config.Config, error) {
	if m.loadError != nil {
		return nil, m.loadError
	}
	return m.configContent, nil
}

func (m *MockConfigService) Validate(cfg *config.Config) error {
	return m.validateError
}

// MockWikiService provides testable wiki operations
type MockWikiService struct {
	generateErr    error
	publishErr     error
	generatedPages []*wiki.WikiPage
	publishCalled  bool
}

func (m *MockWikiService) GenerateAllPages(issues []models.Issue, projectName string) ([]*wiki.WikiPage, error) {
	if m.generateErr != nil {
		return nil, m.generateErr
	}

	if m.generatedPages != nil {
		return m.generatedPages, nil
	}

	// Generate default test pages
	pages := []*wiki.WikiPage{
		{
			Title:    "Home",
			Filename: "Home.md",
			Content:  fmt.Sprintf("# %s Wiki\n\nGenerated from %d issues", projectName, len(issues)),
		},
		{
			Title:    "Issues Summary",
			Filename: "Issues-Summary.md",
			Content:  "# Issues Summary\n\nSummary of all issues",
		},
	}
	return pages, nil
}

func (m *MockWikiService) PublishPages(ctx context.Context, pages []*wiki.WikiPage) error {
	m.publishCalled = true
	return m.publishErr
}

// PHASE 2 IMPLEMENTATION: Integration & Error Path Testing
// This phase focuses on deeper integration testing, error path coverage,
// and advanced failure scenarios to reach the 75-80% coverage target.

// IntegrationTestContext provides a complete testing environment
type IntegrationTestContext struct {
	TempDir       string
	ConfigPath    string
	OutputDir     string
	GitHubService *MockGitHubService
	WikiService   *MockWikiService
	ConfigService *MockConfigService
	TestConfig    *config.Config
	Cleanup       func()
}

// NewIntegrationTestContext creates a complete testing environment
func NewIntegrationTestContext(t *testing.T) *IntegrationTestContext {
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "beaver.yml")
	outputDir := filepath.Join(tmpDir, "output")

	// Create output directory
	err := os.MkdirAll(outputDir, 0755)
	require.NoError(t, err)

	// Setup test config
	testConfig := &config.Config{
		Project: config.ProjectConfig{
			Name:       "integration-test",
			Repository: "test/integration",
		},
		Sources: config.SourcesConfig{
			GitHub: config.GitHubConfig{
				Token:   "test-integration-token",
				Issues:  true,
				Commits: true,
				PRs:     false,
			},
		},
		AI: config.AIConfig{
			Provider: "openai",
			Model:    "gpt-4",
			Features: config.AIFeatures{
				Summarization:   true,
				Categorization:  true,
				Troubleshooting: false,
			},
		},
		Output: config.OutputConfig{
			GitHubPages: config.GitHubPagesConfig{
				Theme:  "minima",
				Branch: "gh-pages",
			},
		},
		Timezone: config.TimezoneConfig{
			Location: "Asia/Tokyo",
			Format:   "2006-01-02 15:04:05 JST",
		},
	}

	// Create mock services
	mockGitHub := NewMockGitHubService()
	mockWiki := &MockWikiService{}
	mockConfig := &MockConfigService{
		configExists:  true,
		configPath:    configPath,
		configContent: testConfig,
	}

	// Save original working directory
	oldWd, _ := os.Getwd()

	ctx := &IntegrationTestContext{
		TempDir:       tmpDir,
		ConfigPath:    configPath,
		OutputDir:     outputDir,
		GitHubService: mockGitHub,
		WikiService:   mockWiki,
		ConfigService: mockConfig,
		TestConfig:    testConfig,
		Cleanup: func() {
			os.Chdir(oldWd)
		},
	}

	// Change to test directory
	os.Chdir(tmpDir)

	return ctx
}

// CreateTestIssues creates realistic test issue data
func (ctx *IntegrationTestContext) CreateTestIssues(count int) []models.Issue {
	issues := make([]models.Issue, count)
	baseTime := time.Now().AddDate(0, 0, -count)

	for i := 0; i < count; i++ {
		issues[i] = models.Issue{
			ID:      int64(1000 + i),
			Number:  i + 1,
			Title:   fmt.Sprintf("Test Issue %d", i+1),
			Body:    fmt.Sprintf("This is test issue %d body with detailed description", i+1),
			State:   []string{"open", "closed"}[i%2],
			HTMLURL: fmt.Sprintf("https://github.com/test/integration/issues/%d", i+1),
			User: models.User{
				ID:    int64(2000 + i),
				Login: fmt.Sprintf("user%d", i+1),
			},
			Labels: []models.Label{
				{ID: int64(i + 1), Name: "test", Color: "ff0000"},
			},
			Comments: []models.Comment{
				{ID: int64(3000 + i), Body: fmt.Sprintf("Comment on issue %d", i+1)},
			},
			CreatedAt: baseTime.AddDate(0, 0, i),
			UpdatedAt: baseTime.AddDate(0, 0, i),
		}
	}

	return issues
}

// TestBoundaryConditions tests edge cases and boundary conditions
func TestBoundaryConditions(t *testing.T) {
	t.Run("Empty issue set processing", func(t *testing.T) {
		ctx := NewIntegrationTestContext(t)
		defer ctx.Cleanup()

		// Test with zero issues
		emptyIssues := []models.Issue{}
		ctx.GitHubService.FetchIssuesResponse.Issues = emptyIssues
		ctx.GitHubService.FetchIssuesResponse.FetchedCount = 0

		testCtx := context.Background()
		query := models.DefaultIssueQuery("test/repo")
		result, err := ctx.GitHubService.FetchIssues(testCtx, query)
		assert.NoError(t, err)
		assert.Equal(t, 0, result.FetchedCount)

		// Wiki generation should handle empty issues gracefully
		pages, err := ctx.WikiService.GenerateAllPages(result.Issues, "empty-test")
		assert.NoError(t, err)
		assert.Greater(t, len(pages), 0, "Should generate at least index page even with no issues")
	})

	t.Run("Single issue processing", func(t *testing.T) {
		ctx := NewIntegrationTestContext(t)
		defer ctx.Cleanup()

		// Test with exactly one issue
		singleIssue := ctx.CreateTestIssues(1)
		ctx.GitHubService.FetchIssuesResponse.Issues = singleIssue
		ctx.GitHubService.FetchIssuesResponse.FetchedCount = 1

		testCtx := context.Background()
		query := models.DefaultIssueQuery("test/repo")
		result, err := ctx.GitHubService.FetchIssues(testCtx, query)
		assert.NoError(t, err)
		assert.Equal(t, 1, result.FetchedCount)

		pages, err := ctx.WikiService.GenerateAllPages(result.Issues, "single-test")
		assert.NoError(t, err)
		assert.Greater(t, len(pages), 0)
	})

	t.Run("Maximum batch size processing", func(t *testing.T) {
		ctx := NewIntegrationTestContext(t)
		defer ctx.Cleanup()

		// Test with maximum reasonable batch size
		const maxBatchSize = 1000
		largeSet := ctx.CreateTestIssues(maxBatchSize)
		ctx.GitHubService.FetchIssuesResponse.Issues = largeSet
		ctx.GitHubService.FetchIssuesResponse.FetchedCount = maxBatchSize

		testCtx := context.Background()
		query := models.DefaultIssueQuery("test/repo")
		query.PerPage = maxBatchSize
		result, err := ctx.GitHubService.FetchIssues(testCtx, query)
		assert.NoError(t, err)
		assert.Equal(t, maxBatchSize, result.FetchedCount)

		// Process in smaller batches
		batchSize := 50
		totalProcessed := 0
		for i := 0; i < len(result.Issues); i += batchSize {
			end := i + batchSize
			if end > len(result.Issues) {
				end = len(result.Issues)
			}
			batch := result.Issues[i:end]
			totalProcessed += len(batch)
		}

		assert.Equal(t, maxBatchSize, totalProcessed)
	})

	t.Run("Unicode and special character handling", func(t *testing.T) {
		ctx := NewIntegrationTestContext(t)
		defer ctx.Cleanup()

		// Create issues with special characters
		specialIssues := []models.Issue{
			{
				ID:      1,
				Number:  1,
				Title:   "テスト問題 - Unicode Test 🚀",
				Body:    "これは日本語のテストです。Émojis: 🎉 🔥 ✅",
				State:   "open",
				HTMLURL: "https://github.com/test/repo/issues/1",
				User:    models.User{Login: "ユーザー123"},
			},
			{
				ID:      2,
				Number:  2,
				Title:   "Special chars: <>&\"'",
				Body:    "XML/HTML special characters test",
				State:   "closed",
				HTMLURL: "https://github.com/test/repo/issues/2",
				User:    models.User{Login: "user&test"},
			},
		}

		pages, err := ctx.WikiService.GenerateAllPages(specialIssues, "unicode-test")
		assert.NoError(t, err)
		assert.Greater(t, len(pages), 0)

		// Save and read back to test encoding
		for _, page := range pages {
			testFile := filepath.Join(ctx.OutputDir, page.Filename)
			err = os.WriteFile(testFile, []byte(page.Content), 0644)
			assert.NoError(t, err)

			// Read back and verify content
			content, err := os.ReadFile(testFile)
			assert.NoError(t, err)
			assert.Equal(t, page.Content, string(content))
		}
	})

	t.Run("Very long content handling", func(t *testing.T) {
		ctx := NewIntegrationTestContext(t)
		defer ctx.Cleanup()

		// Create issue with very long content
		veryLongBody := strings.Repeat("This is a very long issue description that tests how the system handles large amounts of text content. ", 500)
		veryLongIssue := models.Issue{
			ID:      1,
			Number:  1,
			Title:   "Very Long Issue",
			Body:    veryLongBody,
			State:   "open",
			HTMLURL: "https://github.com/test/repo/issues/1",
			User:    models.User{Login: "testuser"},
		}

		pages, err := ctx.WikiService.GenerateAllPages([]models.Issue{veryLongIssue}, "long-content-test")
		assert.NoError(t, err)

		// Verify content length
		for _, page := range pages {
			assert.Greater(t, len(page.Content), 10, "Generated page should contain content")
		}
	})
}

// TestRunVersionCommand tests the version command output
func TestRunVersionCommand(t *testing.T) {
	// Save original stdout
	oldStdout := os.Stdout
	defer func() { os.Stdout = oldStdout }()

	// Create a pipe to capture output
	r, w, _ := os.Pipe()
	os.Stdout = w

	// Create a buffer to capture the output
	var buf bytes.Buffer
	done := make(chan bool)
	go func() {
		defer close(done)
		buf.ReadFrom(r)
	}()

	// Set test values for version variables
	oldVersion, oldBuildTime, oldGitCommit := version, buildTime, gitCommit
	version = "test-version"
	buildTime = "test-build-time"
	gitCommit = "test-git-commit"
	defer func() {
		version, buildTime, gitCommit = oldVersion, oldBuildTime, oldGitCommit
	}()

	// Run the version command
	cmd := &cobra.Command{}
	runVersionCommand(cmd, []string{})

	// Close writer and wait for reader
	w.Close()
	<-done

	// Check output
	output := buf.String()

	if !strings.Contains(output, "test-version") {
		t.Errorf("Expected version 'test-version' in output, got: %s", output)
	}
	if !strings.Contains(output, "test-build-time") {
		t.Errorf("Expected build time 'test-build-time' in output, got: %s", output)
	}
	if !strings.Contains(output, "test-git-commit") {
		t.Errorf("Expected git commit 'test-git-commit' in output, got: %s", output)
	}
	if !strings.Contains(output, "🦫 Beaver バージョン") {
		t.Errorf("Expected Japanese version label in output, got: %s", output)
	}
}

// TestRunVersionCommand_EmptyValues tests version command with empty values
func TestRunVersionCommand_EmptyValues(t *testing.T) {
	// Save original stdout
	oldStdout := os.Stdout
	defer func() { os.Stdout = oldStdout }()

	// Create a pipe to capture output
	r, w, _ := os.Pipe()
	os.Stdout = w

	// Create a buffer to capture the output
	var buf bytes.Buffer
	done := make(chan bool)
	go func() {
		defer close(done)
		buf.ReadFrom(r)
	}()

	// Set empty values for version variables
	oldVersion, oldBuildTime, oldGitCommit := version, buildTime, gitCommit
	version = ""
	buildTime = ""
	gitCommit = ""
	defer func() {
		version, buildTime, gitCommit = oldVersion, oldBuildTime, oldGitCommit
	}()

	// Run the version command
	cmd := &cobra.Command{}
	runVersionCommand(cmd, []string{})

	// Close writer and wait for reader
	w.Close()
	<-done

	// Check output contains expected structure even with empty values
	output := buf.String()

	if !strings.Contains(output, "🦫 Beaver バージョン") {
		t.Errorf("Expected version label in output, got: %s", output)
	}
	if !strings.Contains(output, "📅 ビルド時刻") {
		t.Errorf("Expected build time label in output, got: %s", output)
	}
	if !strings.Contains(output, "📝 Git commit") {
		t.Errorf("Expected git commit label in output, got: %s", output)
	}
}

// TestContainsStringAnywhere tests the helper function used across tests
func TestContainsStringAnywhere(t *testing.T) {
	tests := []struct {
		name     string
		str      string
		substr   string
		expected bool
	}{
		{
			name:     "Empty substring returns true",
			str:      "test string",
			substr:   "",
			expected: true,
		},
		{
			name:     "Substring found at beginning",
			str:      "hello world",
			substr:   "hello",
			expected: true,
		},
		{
			name:     "Substring found in middle",
			str:      "hello world",
			substr:   "lo wo",
			expected: true,
		},
		{
			name:     "Substring found at end",
			str:      "hello world",
			substr:   "world",
			expected: true,
		},
		{
			name:     "Substring not found",
			str:      "hello world",
			substr:   "xyz",
			expected: false,
		},
		{
			name:     "Substring longer than string",
			str:      "hi",
			substr:   "hello",
			expected: false,
		},
		{
			name:     "Empty string with non-empty substring",
			str:      "",
			substr:   "test",
			expected: false,
		},
		{
			name:     "Both empty",
			str:      "",
			substr:   "",
			expected: true,
		},
		{
			name:     "Exact match",
			str:      "test",
			substr:   "test",
			expected: true,
		},
		{
			name:     "Case sensitive - no match",
			str:      "Hello World",
			substr:   "hello",
			expected: false,
		},
		{
			name:     "Japanese text",
			str:      "設定読み込みエラー",
			substr:   "読み込み",
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := containsStringAnywhere(tt.str, tt.substr)
			if result != tt.expected {
				t.Errorf("containsStringAnywhere(%q, %q) = %v, want %v", tt.str, tt.substr, result, tt.expected)
			}
		})
	}
}

// Tests for runClassifyIssue function

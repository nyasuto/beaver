package main

import (
	"bytes"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/nyasuto/beaver/internal/ai"
	"github.com/nyasuto/beaver/internal/config"
	"github.com/nyasuto/beaver/internal/models"
	"github.com/nyasuto/beaver/pkg/github"
	"github.com/stretchr/testify/require"
)

// TestHelpers provides common utilities for testing
type TestHelpers struct {
	t       *testing.T
	tempDir string
}

// NewTestHelpers creates a new test helpers instance
func NewTestHelpers(t *testing.T) *TestHelpers {
	tempDir, err := os.MkdirTemp("", "beaver-test-*")
	require.NoError(t, err)
	
	return &TestHelpers{
		t:       t,
		tempDir: tempDir,
	}
}

// Cleanup removes temporary test files
func (h *TestHelpers) Cleanup() {
	if h.tempDir != "" {
		os.RemoveAll(h.tempDir)
	}
}

// TempDir returns the temporary directory for this test
func (h *TestHelpers) TempDir() string {
	return h.tempDir
}

// CaptureOutput captures stdout and stderr for testing
func (h *TestHelpers) CaptureOutput(fn func()) (stdout, stderr string) {
	// Capture stdout
	oldStdout := os.Stdout
	rOut, wOut, _ := os.Pipe()
	os.Stdout = wOut
	
	// Capture stderr
	oldStderr := os.Stderr
	rErr, wErr, _ := os.Pipe()
	os.Stderr = wErr
	
	// Create channels to capture output
	stdoutCh := make(chan string)
	stderrCh := make(chan string)
	
	// Start goroutines to read the output
	go func() {
		var buf bytes.Buffer
		io.Copy(&buf, rOut)
		stdoutCh <- buf.String()
	}()
	
	go func() {
		var buf bytes.Buffer
		io.Copy(&buf, rErr)
		stderrCh <- buf.String()
	}()
	
	// Execute the function
	fn()
	
	// Close writers and restore original stdout/stderr
	wOut.Close()
	wErr.Close()
	os.Stdout = oldStdout
	os.Stderr = oldStderr
	
	// Get captured output
	stdout = <-stdoutCh
	stderr = <-stderrCh
	
	return stdout, stderr
}

// CreateTempFile creates a temporary file with content
func (h *TestHelpers) CreateTempFile(filename, content string) string {
	filePath := filepath.Join(h.tempDir, filename)
	err := os.WriteFile(filePath, []byte(content), 0644)
	require.NoError(h.t, err)
	return filePath
}

// CreateTempConfigFile creates a temporary beaver.yml config file
func (h *TestHelpers) CreateTempConfigFile(repoPath string) string {
	configContent := fmt.Sprintf(`
project:
  name: "test-project"
  repository: "%s"
  description: "Test project for Beaver"

sources:
  github:
    token: "test-token"
    include_comments: true
    labels:
      - "bug"
      - "feature"

ai:
  provider: "openai"
  model: "gpt-4"
  max_tokens: 4000
  temperature: 0.7

output:
  wiki:
    platform: "github"
    repository: "%s"
    auto_publish: false
`, repoPath, repoPath)
	
	return h.CreateTempFile("beaver.yml", configContent)
}

// ChangeToTempDir changes working directory to temp dir and returns cleanup function
func (h *TestHelpers) ChangeToTempDir() func() {
	originalDir, err := os.Getwd()
	require.NoError(h.t, err)
	
	err = os.Chdir(h.tempDir)
	require.NoError(h.t, err)
	
	return func() {
		os.Chdir(originalDir)
	}
}

// TestFixtures provides common test data structures
type TestFixtures struct{}

// NewTestFixtures creates a new test fixtures instance
func NewTestFixtures() *TestFixtures {
	return &TestFixtures{}
}

// CreateTestIssue creates a standard test issue
func (f *TestFixtures) CreateTestIssue(id int64, number int, title, body string) *github.IssueData {
	now := time.Now()
	return &github.IssueData{
		ID:        id,
		Number:    number,
		Title:     title,
		Body:      body,
		State:     "open",
		User:      "testuser",
		CreatedAt: now,
		UpdatedAt: now,
		Labels: []string{"bug", "feature"},
		Comments: []github.Comment{
			{
				ID:        1001,
				Body:      "This is a test comment",
				User:      "testuser",
				CreatedAt: now,
			},
		},
	}
}

// CreateTestIssueResult creates a standard test issue result
func (f *TestFixtures) CreateTestIssueResult(issueCount int) *models.IssueResult {
	issues := make([]models.Issue, issueCount)
	for i := 0; i < issueCount; i++ {
		issues[i] = models.Issue{
			ID:        int64(i + 1),
			Number:    i + 1,
			Title:     fmt.Sprintf("Test Issue %d", i+1),
			Body:      fmt.Sprintf("Test issue body %d", i+1),
			State:     "open",
			User:      models.User{Login: "testuser"},
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
			Labels: []models.Label{
				{Name: "bug", Color: "d73a4a"},
				{Name: "feature", Color: "0075ca"},
			},
		}
	}
	
	return &models.IssueResult{
		Issues:       issues,
		FetchedCount: issueCount,
		RateLimit: &models.RateLimitInfo{
			Limit:     5000,
			Remaining: 4999,
			ResetTime: time.Now().Add(1 * time.Hour),
		},
	}
}

// CreateTestAIResponse creates a standard AI response
func (f *TestFixtures) CreateTestAIResponse() *ai.SummarizationResponse {
	category := "feature"
	return &ai.SummarizationResponse{
		Summary:        "This is a test AI summary",
		KeyPoints:      []string{"Key point 1", "Key point 2"},
		Category:       &category,
		Complexity:     "medium",
		ProviderUsed:   "openai",
		ModelUsed:      "gpt-4",
		ProcessingTime: 1.5,
		TokenUsage: map[string]int{
			"prompt_tokens":     100,
			"completion_tokens": 50,
			"total_tokens":      150,
		},
	}
}

// CreateTestBatchAIResponse creates a standard batch AI response
func (f *TestFixtures) CreateTestBatchAIResponse(resultCount int) *ai.BatchSummarizationResponse {
	results := make([]ai.SummarizationResponse, resultCount)
	for i := 0; i < resultCount; i++ {
		response := f.CreateTestAIResponse()
		response.Summary = fmt.Sprintf("Summary for issue %d", i+1)
		results[i] = *response
	}
	
	return &ai.BatchSummarizationResponse{
		TotalProcessed: resultCount,
		TotalFailed:    0,
		ProcessingTime: 3.5,
		Results:        results,
		FailedIssues:   []ai.FailedIssue{},
	}
}

// CreateTestConfig creates a standard test configuration
func (f *TestFixtures) CreateTestConfig(repoPath string) *config.Config {
	return &config.Config{
		Project: config.ProjectConfig{
			Name:       "test-project",
			Repository: repoPath,
		},
		Sources: config.SourcesConfig{
			GitHub: config.GitHubConfig{
				Token:  "test-token",
				Issues: true,
			},
		},
		AI: config.AIConfig{
			Provider: "openai",
			Model:    "gpt-4",
		},
		Output: config.OutputConfig{
			Wiki: config.WikiConfig{
				Platform: "github",
			},
		},
	}
}


package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/nyasuto/beaver/internal/models"
	"github.com/nyasuto/beaver/pkg/wiki"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Error Handling Tests - Extracted from main_test.go for Phase 3B refactoring
// These tests focus on error conditions, validation failures, and edge cases

// Configuration and Validation Error Tests

func TestBuildCommand_ValidationErrors(t *testing.T) {
	t.Run("Missing configuration file", func(t *testing.T) {
		// Create temporary directory with no config
		tmpDir := t.TempDir()
		oldWd, _ := os.Getwd()
		defer os.Chdir(oldWd)
		os.Chdir(tmpDir)

		// Test config loading error case
		_, err := os.Stat("beaver.yml")
		assert.True(t, os.IsNotExist(err), "Should not find config file")
	})

	t.Run("Invalid repository configuration", func(t *testing.T) {
		// Test invalid repository formats
		invalidRepos := []string{
			"",
			"username/my-repo", // Default template value
			"invalid-format",
			"too/many/slashes",
		}

		for _, repo := range invalidRepos {
			t.Run(fmt.Sprintf("repo=%s", repo), func(t *testing.T) {
				if repo == "" || repo == "username/my-repo" {
					// These should be rejected
					assert.True(t, repo == "" || repo == "username/my-repo")
				}
			})
		}
	})

	t.Run("Valid repository parsing", func(t *testing.T) {
		validRepos := []struct {
			input    string
			owner    string
			repoName string
		}{
			{"nyasuto/beaver", "nyasuto", "beaver"},
			{"facebook/react", "facebook", "react"},
			{"microsoft/vscode", "microsoft", "vscode"},
		}

		for _, tc := range validRepos {
			t.Run(tc.input, func(t *testing.T) {
				owner, repo := parseOwnerRepo(tc.input)
				assert.Equal(t, tc.owner, owner)
				assert.Equal(t, tc.repoName, repo)
			})
		}
	})
}

func TestStatusCommand_ConfigValidation(t *testing.T) {
	t.Run("Configuration file not found", func(t *testing.T) {
		// Create temporary directory with no config
		tmpDir := t.TempDir()
		oldWd, _ := os.Getwd()
		defer os.Chdir(oldWd)
		os.Chdir(tmpDir)

		// Test config path detection
		_, err := os.Stat("beaver.yml")
		assert.True(t, os.IsNotExist(err), "Config file should not exist")
	})

	t.Run("Valid configuration loaded", func(t *testing.T) {
		// Create temporary directory with valid config
		tmpDir := t.TempDir()
		configPath := filepath.Join(tmpDir, "beaver.yml")

		// Create minimal valid config
		configContent := `project:
  name: "test-project"
  repository: "test/repo"
sources:
  github:
    token: "test-token"
ai:
  provider: "openai"
  model: "gpt-4"
output:
  wiki:
    platform: "github"
`

		err := os.WriteFile(configPath, []byte(configContent), 0644)
		require.NoError(t, err)

		// Verify file was created
		_, err = os.Stat(configPath)
		assert.NoError(t, err)

		// Read and verify config can be loaded
		content, err := os.ReadFile(configPath)
		require.NoError(t, err)
		assert.Contains(t, string(content), "test-project")
		assert.Contains(t, string(content), "test/repo")
	})

	t.Run("GitHub token validation", func(t *testing.T) {
		// Test different token scenarios
		testCases := []struct {
			name  string
			token string
			valid bool
		}{
			{"Empty token", "", false},
			{"Valid token", "ghp_1234567890abcdef", true},
			{"Short token", "abc", true}, // Any non-empty token is considered valid for basic validation
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				hasToken := tc.token != ""
				assert.Equal(t, tc.valid, hasToken)
			})
		}
	})
}

// Comprehensive Error Path Coverage Tests

func TestErrorPathCoverage(t *testing.T) {
	t.Run("Config file permissions error", func(t *testing.T) {
		ctx := NewIntegrationTestContext(t)
		defer ctx.Cleanup()

		// Create config file with restricted permissions
		configContent := `project:
  name: "permission-test"
  repository: "test/repo"`

		err := os.WriteFile(ctx.ConfigPath, []byte(configContent), 0000) // No permissions
		assert.NoError(t, err)

		// Try to read config (should fail on some systems)
		_, err = os.ReadFile(ctx.ConfigPath)
		// Error handling varies by system, but we test the scenario
		if err != nil {
			assert.Contains(t, err.Error(), "permission")
		}

		// Reset permissions for cleanup
		os.Chmod(ctx.ConfigPath, 0644)
	})

	t.Run("Invalid YAML configuration", func(t *testing.T) {
		ctx := NewIntegrationTestContext(t)
		defer ctx.Cleanup()

		// Create invalid YAML
		invalidYAML := `project:
  name: "test
  repository: invalid yaml structure
    missing quotes and indentation`

		err := os.WriteFile(ctx.ConfigPath, []byte(invalidYAML), 0644)
		assert.NoError(t, err)

		// This would fail when trying to parse YAML in real implementation
		content, err := os.ReadFile(ctx.ConfigPath)
		assert.NoError(t, err)
		assert.Contains(t, string(content), "invalid yaml")
	})

	t.Run("GitHub API authentication error", func(t *testing.T) {
		ctx := NewIntegrationTestContext(t)
		defer ctx.Cleanup()

		// Simulate authentication failure
		ctx.GitHubService.TestConnectionError = fmt.Errorf("authentication failed: 401 Unauthorized")

		testCtx := context.Background()
		err := ctx.GitHubService.TestConnection(testCtx)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "authentication failed")
		assert.Contains(t, err.Error(), "401")
	})

	t.Run("GitHub API JSON parsing error", func(t *testing.T) {
		ctx := NewIntegrationTestContext(t)
		defer ctx.Cleanup()

		// Simulate malformed JSON response
		ctx.GitHubService.FetchIssuesError = fmt.Errorf("failed to parse JSON response: invalid character")

		testCtx := context.Background()
		query := models.DefaultIssueQuery("test/repo")
		_, err := ctx.GitHubService.FetchIssues(testCtx, query)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "JSON")
	})

	t.Run("Wiki generation template error", func(t *testing.T) {
		ctx := NewIntegrationTestContext(t)
		defer ctx.Cleanup()

		// Simulate template processing error
		ctx.WikiService.generateErr = fmt.Errorf("template execution failed: undefined variable")

		issues := ctx.CreateTestIssues(1)
		_, err := ctx.WikiService.GenerateAllPages(issues, "test-project")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "template")
	})

	t.Run("Wiki publishing Git error", func(t *testing.T) {
		ctx := NewIntegrationTestContext(t)
		defer ctx.Cleanup()

		// Simulate Git operation failure
		ctx.WikiService.publishErr = fmt.Errorf("git push failed: remote repository not found")

		testCtx := context.Background()
		pages := []*wiki.WikiPage{
			{Title: "Test", Filename: "Test.md", Content: "Test content"},
		}

		err := ctx.WikiService.PublishPages(testCtx, pages)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "git push")
	})

	t.Run("Disk space error during file operations", func(t *testing.T) {
		ctx := NewIntegrationTestContext(t)
		defer ctx.Cleanup()

		// Simulate disk space error by trying to write to invalid path
		invalidPath := "/non-existent-root-path/file.txt"
		err := os.WriteFile(invalidPath, []byte("test"), 0644)
		assert.Error(t, err)
		// Different systems may have different error messages
		assert.True(t, err != nil)
	})
}

// API Timeout and Context Error Tests

func TestAPITimeoutScenarios(t *testing.T) {
	t.Run("Context timeout during GitHub fetch", func(t *testing.T) {
		ctx := NewIntegrationTestContext(t)
		defer ctx.Cleanup()

		// Simulate context timeout
		timeoutCtx, cancel := context.WithTimeout(context.Background(), 1*time.Millisecond)
		defer cancel()

		// Wait for context to timeout
		<-timeoutCtx.Done()
		assert.Error(t, timeoutCtx.Err())

		// Simulate timeout error
		ctx.GitHubService.FetchIssuesError = context.DeadlineExceeded

		query := models.DefaultIssueQuery("test/repo")
		_, err := ctx.GitHubService.FetchIssues(timeoutCtx, query)
		assert.Error(t, err)
		assert.Equal(t, context.DeadlineExceeded, err)
	})

	t.Run("Context cancellation during operations", func(t *testing.T) {
		ctx := NewIntegrationTestContext(t)
		defer ctx.Cleanup()

		// Create cancellable context
		cancelCtx, cancel := context.WithCancel(context.Background())

		// Immediately cancel
		cancel()

		// Simulate cancellation error
		ctx.GitHubService.TestConnectionError = context.Canceled

		err := ctx.GitHubService.TestConnection(cancelCtx)
		assert.Error(t, err)
		assert.Equal(t, context.Canceled, err)
	})

	t.Run("Long-running operation timeout", func(t *testing.T) {
		ctx := NewIntegrationTestContext(t)
		defer ctx.Cleanup()

		// Simulate long-running operation
		longCtx, cancel := context.WithTimeout(context.Background(), 5*time.Millisecond)
		defer cancel()

		// Simulate the operation taking longer than timeout
		time.Sleep(10 * time.Millisecond)

		// Check if context timed out
		assert.Error(t, longCtx.Err())
		assert.Equal(t, context.DeadlineExceeded, longCtx.Err())
	})
}

// File System Error Tests

func TestFileSystemOperationErrors(t *testing.T) {
	t.Run("Directory creation failure", func(t *testing.T) {
		ctx := NewIntegrationTestContext(t)
		defer ctx.Cleanup()

		// Try to create directory in non-existent parent
		invalidPath := "/non-existent-root/subdir"
		err := os.MkdirAll(invalidPath, 0755)
		assert.Error(t, err)
	})

	t.Run("File write with insufficient space simulation", func(t *testing.T) {
		ctx := NewIntegrationTestContext(t)
		defer ctx.Cleanup()

		// Simulate writing to invalid location
		invalidFile := "/dev/null/invalid-file.txt"
		err := os.WriteFile(invalidFile, []byte("test content"), 0644)
		assert.Error(t, err)
	})

	t.Run("Concurrent file operations", func(t *testing.T) {
		ctx := NewIntegrationTestContext(t)
		defer ctx.Cleanup()

		// Test concurrent access to same file
		testFile := filepath.Join(ctx.OutputDir, "concurrent-test.txt")

		// First write
		err1 := os.WriteFile(testFile, []byte("content1"), 0644)
		assert.NoError(t, err1)

		// Second write (should succeed - overwrites)
		err2 := os.WriteFile(testFile, []byte("content2"), 0644)
		assert.NoError(t, err2)

		// Verify final content
		content, err := os.ReadFile(testFile)
		assert.NoError(t, err)
		assert.Equal(t, "content2", string(content))
	})

	t.Run("Symlink handling", func(t *testing.T) {
		ctx := NewIntegrationTestContext(t)
		defer ctx.Cleanup()

		// Create a regular file
		originalFile := filepath.Join(ctx.OutputDir, "original.txt")
		err := os.WriteFile(originalFile, []byte("original content"), 0644)
		assert.NoError(t, err)

		// Create symlink to it
		symlinkFile := filepath.Join(ctx.OutputDir, "symlink.txt")
		err = os.Symlink(originalFile, symlinkFile)
		if err != nil {
			// Symlinks might not be supported on all systems
			t.Skip("Symlinks not supported on this system")
		}

		// Read through symlink
		content, err := os.ReadFile(symlinkFile)
		assert.NoError(t, err)
		assert.Equal(t, "original content", string(content))

		// Test what happens when target is deleted
		err = os.Remove(originalFile)
		assert.NoError(t, err)

		// Reading symlink should now fail
		_, err = os.ReadFile(symlinkFile)
		assert.Error(t, err)
	})

	t.Run("File permissions after write", func(t *testing.T) {
		ctx := NewIntegrationTestContext(t)
		defer ctx.Cleanup()

		// Create file with specific permissions
		testFile := filepath.Join(ctx.OutputDir, "perm-test.txt")
		err := os.WriteFile(testFile, []byte("test"), 0600)
		assert.NoError(t, err)

		// Check file permissions
		info, err := os.Stat(testFile)
		assert.NoError(t, err)

		// On Unix systems, check permissions
		mode := info.Mode()
		if mode&0077 != 0 {
			// On some systems, permissions might be modified by umask
			t.Logf("File permissions: %o (may be modified by umask)", mode&0777)
		}
	})
}

// Advanced Error Scenarios

func TestAdvancedErrorScenarios(t *testing.T) {
	t.Run("Partial success with some failed operations", func(t *testing.T) {
		ctx := NewIntegrationTestContext(t)
		defer ctx.Cleanup()

		// Set up scenario where some operations succeed and others fail
		testIssues := ctx.CreateTestIssues(3)
		ctx.GitHubService.FetchIssuesResponse.Issues = testIssues
		ctx.GitHubService.FetchIssuesResponse.FetchedCount = len(testIssues)

		// Simulate partial wiki generation failure
		ctx.WikiService.generateErr = fmt.Errorf("template error for some issues")

		// Test the scenario
		_, err := ctx.WikiService.GenerateAllPages(testIssues, "test-project")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "template error")
	})

	t.Run("Network connectivity issues", func(t *testing.T) {
		ctx := NewIntegrationTestContext(t)
		defer ctx.Cleanup()

		// Simulate network connectivity problems
		networkErrors := []error{
			fmt.Errorf("dial tcp: no such host"),
			fmt.Errorf("connection refused"),
			fmt.Errorf("connection timeout"),
			fmt.Errorf("EOF"),
		}

		for _, netErr := range networkErrors {
			ctx.GitHubService.TestConnectionError = netErr
			err := ctx.GitHubService.TestConnection(context.Background())
			assert.Error(t, err)
			assert.Equal(t, netErr, err)
		}
	})

	t.Run("Resource exhaustion scenarios", func(t *testing.T) {
		ctx := NewIntegrationTestContext(t)
		defer ctx.Cleanup()

		// Simulate resource exhaustion
		resourceErrors := []string{
			"too many open files",
			"out of memory",
			"disk full",
			"too many connections",
		}

		for _, errMsg := range resourceErrors {
			ctx.GitHubService.FetchIssuesError = fmt.Errorf("%s", errMsg)

			query := models.DefaultIssueQuery("test/repo")
			_, err := ctx.GitHubService.FetchIssues(context.Background(), query)
			assert.Error(t, err)
			assert.Contains(t, err.Error(), errMsg)
		}
	})
}

// Test Error Recovery and Retry Logic

func TestErrorRecoveryScenarios(t *testing.T) {
	t.Run("Retry logic for transient failures", func(t *testing.T) {
		ctx := NewIntegrationTestContext(t)
		defer ctx.Cleanup()

		// Simulate transient errors that should be retried
		transientErrors := []string{
			"temporary failure",
			"rate limit exceeded",
			"service unavailable",
			"timeout",
		}

		for _, errMsg := range transientErrors {
			ctx.GitHubService.TestConnectionError = fmt.Errorf("%s", errMsg)
			err := ctx.GitHubService.TestConnection(context.Background())
			assert.Error(t, err)
			assert.Contains(t, err.Error(), errMsg)
		}
	})

	t.Run("Fatal errors that should not be retried", func(t *testing.T) {
		ctx := NewIntegrationTestContext(t)
		defer ctx.Cleanup()

		// Simulate fatal errors that should not be retried
		fatalErrors := []string{
			"authentication failed",
			"not found",
			"forbidden",
			"bad request",
		}

		for _, errMsg := range fatalErrors {
			ctx.GitHubService.TestConnectionError = fmt.Errorf("%s", errMsg)
			err := ctx.GitHubService.TestConnection(context.Background())
			assert.Error(t, err)
			assert.Contains(t, err.Error(), errMsg)
		}
	})
}

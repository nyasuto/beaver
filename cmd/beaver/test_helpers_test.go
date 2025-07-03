package main

import (
	"fmt"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTestHelpers(t *testing.T) {
	t.Run("NewTestHelpers creates instance with temp directory", func(t *testing.T) {
		helpers := NewTestHelpers(t)
		defer helpers.Cleanup()

		assert.NotNil(t, helpers)
		assert.NotEmpty(t, helpers.TempDir())
		assert.Contains(t, helpers.TempDir(), "beaver-test-")

		// Verify temp directory exists
		_, err := os.Stat(helpers.TempDir())
		assert.NoError(t, err)
	})

	t.Run("Cleanup removes temporary directory", func(t *testing.T) {
		helpers := NewTestHelpers(t)
		tempDir := helpers.TempDir()

		// Verify directory exists
		_, err := os.Stat(tempDir)
		require.NoError(t, err)

		// Cleanup and verify directory is removed
		helpers.Cleanup()
		_, err = os.Stat(tempDir)
		assert.True(t, os.IsNotExist(err))
	})

	t.Run("TempDir returns correct directory path", func(t *testing.T) {
		helpers := NewTestHelpers(t)
		defer helpers.Cleanup()

		tempDir := helpers.TempDir()
		assert.NotEmpty(t, tempDir)
		assert.Contains(t, tempDir, "beaver-test-")

		// Should return same path on multiple calls
		assert.Equal(t, tempDir, helpers.TempDir())
	})
}

func TestTestHelpersCaptureOutput(t *testing.T) {
	t.Run("CaptureOutput captures stdout", func(t *testing.T) {
		helpers := NewTestHelpers(t)
		defer helpers.Cleanup()

		expectedOutput := "Hello, Test World!"
		stdout, stderr := helpers.CaptureOutput(func() {
			fmt.Print(expectedOutput)
		})

		assert.Equal(t, expectedOutput, stdout)
		assert.Empty(t, stderr)
	})

	t.Run("CaptureOutput captures stderr", func(t *testing.T) {
		helpers := NewTestHelpers(t)
		defer helpers.Cleanup()

		expectedError := "Error message!"
		stdout, stderr := helpers.CaptureOutput(func() {
			fmt.Fprint(os.Stderr, expectedError)
		})

		assert.Empty(t, stdout)
		assert.Equal(t, expectedError, stderr)
	})

	t.Run("CaptureOutput captures both stdout and stderr", func(t *testing.T) {
		helpers := NewTestHelpers(t)
		defer helpers.Cleanup()

		expectedStdout := "Standard output"
		expectedStderr := "Error output"

		stdout, stderr := helpers.CaptureOutput(func() {
			fmt.Print(expectedStdout)
			fmt.Fprint(os.Stderr, expectedStderr)
		})

		assert.Equal(t, expectedStdout, stdout)
		assert.Equal(t, expectedStderr, stderr)
	})

	t.Run("CaptureOutput handles empty output", func(t *testing.T) {
		helpers := NewTestHelpers(t)
		defer helpers.Cleanup()

		stdout, stderr := helpers.CaptureOutput(func() {
			// Do nothing
		})

		assert.Empty(t, stdout)
		assert.Empty(t, stderr)
	})
}

func TestTestHelpersFileOperations(t *testing.T) {
	t.Run("CreateTempFile creates file with content", func(t *testing.T) {
		helpers := NewTestHelpers(t)
		defer helpers.Cleanup()

		filename := "test.txt"
		content := "This is test content"

		filePath := helpers.CreateTempFile(filename, content)

		// Verify file path
		expectedPath := filepath.Join(helpers.TempDir(), filename)
		assert.Equal(t, expectedPath, filePath)

		// Verify file exists and has correct content
		fileContent, err := os.ReadFile(filePath)
		require.NoError(t, err)
		assert.Equal(t, content, string(fileContent))

		// Verify file permissions
		fileInfo, err := os.Stat(filePath)
		require.NoError(t, err)
		assert.Equal(t, os.FileMode(0600), fileInfo.Mode().Perm())
	})

	t.Run("CreateTempConfigFile creates valid beaver.yml", func(t *testing.T) {
		helpers := NewTestHelpers(t)
		defer helpers.Cleanup()

		repoPath := "owner/test-repo"
		configPath := helpers.CreateTempConfigFile(repoPath)

		// Verify file exists
		_, err := os.Stat(configPath)
		require.NoError(t, err)

		// Verify file content
		content, err := os.ReadFile(configPath)
		require.NoError(t, err)
		configContent := string(content)

		// Check key configuration elements
		assert.Contains(t, configContent, fmt.Sprintf(`repository: "%s"`, repoPath))
		assert.Contains(t, configContent, `name: "test-project"`)
		assert.Contains(t, configContent, `token: "test-token"`)
		assert.Contains(t, configContent, `provider: "openai"`)
		assert.Contains(t, configContent, `model: "gpt-4"`)
		assert.Contains(t, configContent, `platform: "github"`)
	})

	t.Run("CreateTempFile with subdirectory", func(t *testing.T) {
		helpers := NewTestHelpers(t)
		defer helpers.Cleanup()

		// Create subdirectory first
		subdir := filepath.Join(helpers.TempDir(), "subdir")
		err := os.MkdirAll(subdir, 0755)
		require.NoError(t, err)

		// Create file in subdirectory
		filename := "subdir/test.txt"
		content := "Subdirectory test content"

		filePath := helpers.CreateTempFile(filename, content)

		// Verify the path and content
		expectedPath := filepath.Join(helpers.TempDir(), filename)
		assert.Equal(t, expectedPath, filePath)

		// Verify file exists and has correct content
		fileContent, err := os.ReadFile(filePath)
		require.NoError(t, err)
		assert.Equal(t, content, string(fileContent))
	})
}

func TestTestHelpersDirectoryOperations(t *testing.T) {
	t.Run("ChangeToTempDir changes working directory", func(t *testing.T) {
		helpers := NewTestHelpers(t)
		defer helpers.Cleanup()

		// Get original directory
		originalDir, err := os.Getwd()
		require.NoError(t, err)

		// Change to temp directory
		cleanup := helpers.ChangeToTempDir()
		defer cleanup()

		// Verify we're in temp directory (resolve symlinks for macOS compatibility)
		currentDir, err := os.Getwd()
		require.NoError(t, err)
		resolvedCurrent, err := filepath.EvalSymlinks(currentDir)
		require.NoError(t, err)
		resolvedTemp, err := filepath.EvalSymlinks(helpers.TempDir())
		require.NoError(t, err)
		assert.Equal(t, resolvedTemp, resolvedCurrent)

		// Call cleanup and verify we're back to original directory
		cleanup()
		currentDir, err = os.Getwd()
		require.NoError(t, err)
		assert.Equal(t, originalDir, currentDir)
	})

	t.Run("ChangeToTempDir cleanup is idempotent", func(t *testing.T) {
		helpers := NewTestHelpers(t)
		defer helpers.Cleanup()

		originalDir, err := os.Getwd()
		require.NoError(t, err)

		cleanup := helpers.ChangeToTempDir()

		// Call cleanup multiple times
		cleanup()
		cleanup()

		// Should still be in original directory
		currentDir, err := os.Getwd()
		require.NoError(t, err)
		assert.Equal(t, originalDir, currentDir)
	})
}

func TestTestFixtures(t *testing.T) {
	t.Run("NewTestFixtures creates instance", func(t *testing.T) {
		fixtures := NewTestFixtures()
		assert.NotNil(t, fixtures)
	})

	t.Run("CreateTestIssue creates valid issue", func(t *testing.T) {
		fixtures := NewTestFixtures()

		id := int64(123)
		number := 456
		title := "Test Issue Title"
		body := "Test issue body content"

		issue := fixtures.CreateTestIssue(id, number, title, body)

		assert.Equal(t, id, issue.ID)
		assert.Equal(t, number, issue.Number)
		assert.Equal(t, title, issue.Title)
		assert.Equal(t, body, issue.Body)
		assert.Equal(t, "open", issue.State)
		assert.Equal(t, "testuser", issue.User)
		assert.Equal(t, []string{"bug", "feature"}, issue.Labels)
		assert.Len(t, issue.Comments, 1)
		assert.Equal(t, "This is a test comment", issue.Comments[0].Body)
	})

	t.Run("CreateTestIssueResult creates valid result", func(t *testing.T) {
		fixtures := NewTestFixtures()

		issueCount := 3
		result := fixtures.CreateTestIssueResult(issueCount)

		assert.Len(t, result.Issues, issueCount)
		assert.Equal(t, issueCount, result.FetchedCount)
		assert.NotNil(t, result.RateLimit)
		assert.Equal(t, 5000, result.RateLimit.Limit)
		assert.Equal(t, 4999, result.RateLimit.Remaining)

		// Verify each issue has correct structure
		for i, issue := range result.Issues {
			assert.Equal(t, int64(i+1), issue.ID)
			assert.Equal(t, i+1, issue.Number)
			assert.Equal(t, fmt.Sprintf("Test Issue %d", i+1), issue.Title)
			assert.Equal(t, fmt.Sprintf("Test issue body %d", i+1), issue.Body)
			assert.Equal(t, "open", issue.State)
			assert.Equal(t, "testuser", issue.User.Login)
			assert.Len(t, issue.Labels, 2)
		}
	})

	t.Run("CreateTestConfig creates valid configuration", func(t *testing.T) {
		fixtures := NewTestFixtures()

		repoPath := "owner/test-repo"
		config := fixtures.CreateTestConfig(repoPath)

		assert.Equal(t, "test-project", config.Project.Name)
		assert.Equal(t, repoPath, config.Project.Repository)
		assert.Equal(t, "test-token", config.Sources.GitHub.Token)
		assert.True(t, config.Sources.GitHub.Issues)
		assert.Equal(t, "openai", config.AI.Provider)
		assert.Equal(t, "gpt-4", config.AI.Model)
		assert.Equal(t, "minima", config.Output.GitHubPages.Theme)
	})
}

func TestTestFixturesEdgeCases(t *testing.T) {
	t.Run("CreateTestIssueResult with zero issues", func(t *testing.T) {
		fixtures := NewTestFixtures()

		result := fixtures.CreateTestIssueResult(0)

		assert.Empty(t, result.Issues)
		assert.Equal(t, 0, result.FetchedCount)
		assert.NotNil(t, result.RateLimit)
	})

	t.Run("CreateTestConfig with empty repository", func(t *testing.T) {
		fixtures := NewTestFixtures()

		config := fixtures.CreateTestConfig("")

		assert.Empty(t, config.Project.Repository)
		// Other fields should still be valid
		assert.Equal(t, "test-project", config.Project.Name)
		assert.Equal(t, "test-token", config.Sources.GitHub.Token)
	})

	t.Run("CreateTempFile with special characters", func(t *testing.T) {
		helpers := NewTestHelpers(t)
		defer helpers.Cleanup()

		filename := "test-日本語-émojis🚀.txt"
		content := "Content with special characters: 日本語, émojis 🚀, symbols @#$%"

		filePath := helpers.CreateTempFile(filename, content)

		// Verify file was created and content is preserved
		fileContent, err := os.ReadFile(filePath)
		require.NoError(t, err)
		assert.Equal(t, content, string(fileContent))
	})
}

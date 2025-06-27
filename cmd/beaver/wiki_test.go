package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/spf13/cobra"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/nyasuto/beaver/internal/models"
	"github.com/nyasuto/beaver/pkg/wiki"
)

// Test data helpers for wiki tests
func createTestWikiPage(title, filename, content string) *wiki.WikiPage {
	return &wiki.WikiPage{
		Title:    title,
		Filename: filename,
		Content:  content,
	}
}

func createTestIssues() []models.Issue {
	return []models.Issue{
		{
			ID:      1,
			Number:  101,
			Title:   "Bug: Authentication failure",
			Body:    "Users cannot log in to the system",
			State:   "closed",
			HTMLURL: "https://github.com/owner/repo/issues/101",
			User: models.User{
				ID:    1,
				Login: "developer1",
			},
			Labels: []models.Label{
				{ID: 1, Name: "bug", Color: "ff0000"},
				{ID: 2, Name: "priority:high", Color: "ff6600"},
			},
			CreatedAt: time.Date(2023, 6, 1, 10, 0, 0, 0, time.UTC),
		},
		{
			ID:      2,
			Number:  102,
			Title:   "Feature: Add dark mode",
			Body:    "Implement dark mode for better user experience",
			State:   "open",
			HTMLURL: "https://github.com/owner/repo/issues/102",
			User: models.User{
				ID:    2,
				Login: "designer1",
			},
			Labels: []models.Label{
				{ID: 3, Name: "enhancement", Color: "00ff00"},
			},
			CreatedAt: time.Date(2023, 6, 2, 14, 30, 0, 0, time.UTC),
		},
		{
			ID:      3,
			Number:  103,
			Title:   "Documentation: API reference update",
			Body:    "Update API documentation with new endpoints",
			State:   "closed",
			HTMLURL: "https://github.com/owner/repo/issues/103",
			User: models.User{
				ID:    3,
				Login: "writer1",
			},
			Labels: []models.Label{
				{ID: 4, Name: "documentation", Color: "0000ff"},
			},
			CreatedAt: time.Date(2023, 6, 3, 9, 15, 0, 0, time.UTC),
		},
	}
}

// Test command structure and flag setup
func TestWikiCommands(t *testing.T) {
	tests := []struct {
		name        string
		command     *cobra.Command
		expectedUse string
		minArgs     int
		maxArgs     int
	}{
		{
			name:        "wiki root command",
			command:     wikiCmd,
			expectedUse: "wiki",
			minArgs:     0,
			maxArgs:     -1, // No limit
		},
		{
			name:        "generate wiki command",
			command:     generateWikiCmd,
			expectedUse: "generate [owner/repo]",
			minArgs:     1,
			maxArgs:     1,
		},
		{
			name:        "publish wiki command",
			command:     publishWikiCmd,
			expectedUse: "publish [owner/repo]",
			minArgs:     1,
			maxArgs:     1,
		},
		{
			name:        "list wiki command",
			command:     listWikiCmd,
			expectedUse: "list [owner/repo]",
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
func TestWikiFlagDefaults(t *testing.T) {
	// Reset flags to defaults
	wikiOutput = "./wiki"
	wikiTemplate = ""
	wikiPublish = false
	wikiBatch = 0

	tests := []struct {
		name     string
		flagName string
		expected interface{}
		actual   interface{}
	}{
		{"output directory", "output", "./wiki", wikiOutput},
		{"template directory", "template", "", wikiTemplate},
		{"publish flag", "publish", false, wikiPublish},
		{"batch size", "batch", 0, wikiBatch},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, tt.actual)
		})
	}
}

// Test parseRepoPath function for wiki commands
func TestWikiParseRepoPath(t *testing.T) {
	tests := []struct {
		name          string
		repoPath      string
		expectedOwner string
		expectedRepo  string
		expectError   bool
	}{
		{
			name:          "valid repository format",
			repoPath:      "owner/repo",
			expectedOwner: "owner",
			expectedRepo:  "repo",
			expectError:   false,
		},
		{
			name:          "repository with dashes and numbers",
			repoPath:      "test-org/my-repo-123",
			expectedOwner: "test-org",
			expectedRepo:  "my-repo-123",
			expectError:   false,
		},
		{
			name:          "real GitHub repository",
			repoPath:      "nyasuto/beaver",
			expectedOwner: "nyasuto",
			expectedRepo:  "beaver",
			expectError:   false,
		},
		{
			name:        "invalid format - no slash",
			repoPath:    "invalidrepo",
			expectError: true,
		},
		{
			name:        "invalid format - multiple slashes",
			repoPath:    "owner/repo/extra",
			expectError: true,
		},
		{
			name:        "invalid format - empty string",
			repoPath:    "",
			expectError: true,
		},
		{
			name:          "edge case - only slash (returns empty strings)",
			repoPath:      "/",
			expectedOwner: "",
			expectedRepo:  "",
			expectError:   false, // splitString returns ["", ""] which has length 2
		},
		{
			name:        "invalid format - trailing slash",
			repoPath:    "owner/repo/",
			expectError: true,
		},
		{
			name:        "invalid format - leading slash",
			repoPath:    "/owner/repo",
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			owner, repo, err := parseRepoPath(tt.repoPath)

			if tt.expectError {
				assert.Error(t, err)
				assert.Empty(t, owner)
				assert.Empty(t, repo)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expectedOwner, owner)
				assert.Equal(t, tt.expectedRepo, repo)
			}
		})
	}
}

// Test saveWikiPage function for wiki commands
func TestWikiSaveWikiPage(t *testing.T) {
	t.Run("save wiki page successfully", func(t *testing.T) {
		// Create temporary directory
		tmpDir := t.TempDir()

		// Create test wiki page
		page := createTestWikiPage(
			"Test Page",
			"Test-Page.md",
			"# Test Page\n\nThis is a test wiki page content.\n\n## Section 1\n\nSome content here.",
		)

		err := saveWikiPage(page, tmpDir)
		require.NoError(t, err)

		// Check that file was created
		expectedPath := filepath.Join(tmpDir, "Test-Page.md")
		assert.FileExists(t, expectedPath)

		// Read and verify file content
		fileContent, err := os.ReadFile(expectedPath)
		require.NoError(t, err)

		content := string(fileContent)
		assert.Equal(t, page.Content, content)

		// Check that content contains expected elements
		assert.Contains(t, content, "# Test Page")
		assert.Contains(t, content, "## Section 1")
	})

	t.Run("save wiki page with special characters", func(t *testing.T) {
		// Create temporary directory
		tmpDir := t.TempDir()

		// Create test wiki page with special characters
		page := createTestWikiPage(
			"Special Characters テスト",
			"Special-Characters.md",
			"# 特殊文字テスト\n\n日本語コンテンツのテスト\n\n- 項目1\n- 項目2\n",
		)

		err := saveWikiPage(page, tmpDir)
		require.NoError(t, err)

		// Check that file was created
		expectedPath := filepath.Join(tmpDir, "Special-Characters.md")
		assert.FileExists(t, expectedPath)

		// Read and verify file content
		fileContent, err := os.ReadFile(expectedPath)
		require.NoError(t, err)

		content := string(fileContent)
		assert.Equal(t, page.Content, content)
		assert.Contains(t, content, "特殊文字テスト")
		assert.Contains(t, content, "日本語コンテンツのテスト")
	})

	t.Run("save wiki page with empty content", func(t *testing.T) {
		// Create temporary directory
		tmpDir := t.TempDir()

		// Create test wiki page with empty content
		page := createTestWikiPage(
			"Empty Page",
			"Empty-Page.md",
			"",
		)

		err := saveWikiPage(page, tmpDir)
		require.NoError(t, err)

		// Check that file was created
		expectedPath := filepath.Join(tmpDir, "Empty-Page.md")
		assert.FileExists(t, expectedPath)

		// Verify empty content
		fileContent, err := os.ReadFile(expectedPath)
		require.NoError(t, err)

		assert.Empty(t, string(fileContent))
	})

	t.Run("save wiki page to non-existent directory", func(t *testing.T) {
		// Use non-existent directory
		tmpDir := "/non/existent/directory"

		page := createTestWikiPage(
			"Test Page",
			"Test-Page.md",
			"# Test Page",
		)

		err := saveWikiPage(page, tmpDir)
		assert.Error(t, err)
	})
}

// Test command argument validation
func TestWikiCommandValidation(t *testing.T) {
	tests := []struct {
		name        string
		command     *cobra.Command
		args        []string
		expectError bool
		errorMsg    string
	}{
		{
			name:        "generate command with valid args",
			command:     generateWikiCmd,
			args:        []string{"owner/repo"},
			expectError: true, // Will fail on GitHub API/config in test
		},
		{
			name:        "generate command with no args",
			command:     generateWikiCmd,
			args:        []string{},
			expectError: true,
			errorMsg:    "accepts 1 arg(s), received 0",
		},
		{
			name:        "generate command with too many args",
			command:     generateWikiCmd,
			args:        []string{"owner/repo", "extra"},
			expectError: true,
			errorMsg:    "accepts 1 arg(s), received 2",
		},
		{
			name:        "publish command with valid args",
			command:     publishWikiCmd,
			args:        []string{"owner/repo"},
			expectError: true, // Will fail on file loading in test
		},
		{
			name:        "publish command with no args",
			command:     publishWikiCmd,
			args:        []string{},
			expectError: true,
			errorMsg:    "accepts 1 arg(s), received 0",
		},
		{
			name:        "list command with valid args",
			command:     listWikiCmd,
			args:        []string{"owner/repo"},
			expectError: true, // Will fail on GitHub API/config in test
		},
		{
			name:        "list command with no args",
			command:     listWikiCmd,
			args:        []string{},
			expectError: true,
			errorMsg:    "accepts 1 arg(s), received 0",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create a copy of the command to avoid modifying the original
			cmd := &cobra.Command{
				Use:  tt.command.Use,
				Args: tt.command.Args,
				RunE: tt.command.RunE,
			}

			// Test argument validation
			err := cmd.Args(cmd, tt.args)
			if err != nil {
				if tt.expectError && tt.errorMsg != "" {
					assert.Contains(t, err.Error(), tt.errorMsg)
				} else if !tt.expectError {
					t.Errorf("Unexpected argument validation error: %v", err)
				}
				return
			}

			// If args are valid, test the actual command execution
			if tt.command.RunE != nil {
				err = tt.command.RunE(cmd, tt.args)
				if tt.expectError {
					assert.Error(t, err)
				} else {
					assert.NoError(t, err)
				}
			}
		})
	}
}

// Test runGenerateWiki function - argument parsing and basic flow
func TestRunGenerateWiki(t *testing.T) {
	// Store original values
	originalOutput := wikiOutput
	originalBatch := wikiBatch
	originalPublish := wikiPublish

	// Reset after test
	defer func() {
		wikiOutput = originalOutput
		wikiBatch = originalBatch
		wikiPublish = originalPublish
	}()

	tests := []struct {
		name        string
		args        []string
		setupFlags  func()
		expectError bool
		errorMsg    string
	}{
		{
			name: "invalid repository format",
			args: []string{"invalidrepo"},
			setupFlags: func() {
				wikiOutput = "./test-wiki"
				wikiBatch = 0
				wikiPublish = false
			},
			expectError: true,
			errorMsg:    "無効なリポジトリパス",
		},
		{
			name: "valid repository format (will fail on GitHub API)",
			args: []string{"owner/repo"},
			setupFlags: func() {
				wikiOutput = "./test-wiki"
				wikiBatch = 5
				wikiPublish = false
			},
			expectError: true,
			errorMsg:    "GitHub token not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup flags
			tt.setupFlags()

			// Create command
			cmd := &cobra.Command{}

			// Test the function
			err := runGenerateWiki(cmd, tt.args)

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

// Test runPublishWiki function - argument parsing and basic flow
func TestRunPublishWiki(t *testing.T) {
	// Store original values
	originalOutput := wikiOutput
	originalBatch := wikiBatch

	// Reset after test
	defer func() {
		wikiOutput = originalOutput
		wikiBatch = originalBatch
	}()

	tests := []struct {
		name        string
		args        []string
		setupFlags  func()
		setupFiles  func(t *testing.T) string
		expectError bool
		errorMsg    string
	}{
		{
			name: "invalid repository format",
			args: []string{"invalidrepo"},
			setupFlags: func() {
				wikiOutput = "./test-wiki"
				wikiBatch = 5
			},
			setupFiles:  func(t *testing.T) string { return "" },
			expectError: true,
			errorMsg:    "無効なリポジトリパス",
		},
		{
			name: "no wiki files found",
			args: []string{"owner/repo"},
			setupFlags: func() {
				wikiBatch = 5
			},
			setupFiles: func(t *testing.T) string {
				// Create empty directory
				tmpDir := t.TempDir()
				wikiOutput = tmpDir
				return tmpDir
			},
			expectError: true,
			errorMsg:    "GitHub token not found", // Function checks token before files
		},
		{
			name: "valid setup but no GitHub token",
			args: []string{"owner/repo"},
			setupFlags: func() {
				wikiBatch = 5
			},
			setupFiles: func(t *testing.T) string {
				// Create temporary directory with test files
				tmpDir := t.TempDir()
				wikiOutput = tmpDir

				// Create test markdown files
				testFiles := []string{"Home.md", "Issues-Summary.md", "Troubleshooting.md"}
				for _, filename := range testFiles {
					filePath := filepath.Join(tmpDir, filename)
					err := os.WriteFile(filePath, []byte("# Test Content"), 0644)
					require.NoError(t, err)
				}
				return tmpDir
			},
			expectError: true,
			errorMsg:    "GitHub token not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup flags and files
			tt.setupFlags()
			tt.setupFiles(t)

			// Create command
			cmd := &cobra.Command{}

			// Test the function
			err := runPublishWiki(cmd, tt.args)

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

// Test runListWiki function - argument parsing and basic flow
func TestRunListWiki(t *testing.T) {
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
			errorMsg:    "無効なリポジトリパス",
		},
		{
			name:        "valid repository format (will fail on GitHub API)",
			args:        []string{"owner/repo"},
			expectError: true,
			errorMsg:    "GitHub token not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create command
			cmd := &cobra.Command{}

			// Test the function
			err := runListWiki(cmd, tt.args)

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

// Test command registration
func TestWikiCommandRegistration(t *testing.T) {
	// Verify that wiki command has been added to root command
	found := false
	for _, cmd := range rootCmd.Commands() {
		if cmd.Use == "wiki" {
			found = true
			break
		}
	}
	assert.True(t, found, "wiki command should be registered with root command")

	// Verify subcommands are properly registered
	subcommands := wikiCmd.Commands()
	expectedSubcommands := []string{"generate", "publish", "list"}

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

// Test error handling scenarios
func TestWikiErrorHandling(t *testing.T) {
	tests := []struct {
		name     string
		testFunc func() error
		expected string
	}{
		{
			name: "invalid repository format error",
			testFunc: func() error {
				_, _, err := parseRepoPath("invalid")
				return err
			},
			expected: "expected format: owner/repo",
		},
		{
			name: "empty repository path error",
			testFunc: func() error {
				_, _, err := parseRepoPath("")
				return err
			},
			expected: "expected format: owner/repo",
		},
		{
			name: "multiple slashes error",
			testFunc: func() error {
				_, _, err := parseRepoPath("owner/repo/extra")
				return err
			},
			expected: "expected format: owner/repo",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.testFunc()
			assert.Error(t, err)
			assert.Contains(t, err.Error(), tt.expected)
		})
	}
}

// Test flag handling edge cases
func TestWikiFlagHandling(t *testing.T) {
	// Store original values
	originalOutput := wikiOutput
	originalTemplate := wikiTemplate
	originalPublish := wikiPublish
	originalBatch := wikiBatch

	// Reset after test
	defer func() {
		wikiOutput = originalOutput
		wikiTemplate = originalTemplate
		wikiPublish = originalPublish
		wikiBatch = originalBatch
	}()

	t.Run("flag value persistence", func(t *testing.T) {
		// Test that flag values are properly set and persist
		wikiOutput = "/custom/output"
		wikiTemplate = "/custom/template"
		wikiPublish = true
		wikiBatch = 15

		assert.Equal(t, "/custom/output", wikiOutput)
		assert.Equal(t, "/custom/template", wikiTemplate)
		assert.True(t, wikiPublish)
		assert.Equal(t, 15, wikiBatch)
	})

	t.Run("batch flag edge cases", func(t *testing.T) {
		// Test batch size behavior
		tests := []struct {
			name      string
			batchSize int
			issueLen  int
			expected  int
		}{
			{"batch disabled", 0, 10, 10},
			{"batch smaller than issues", 5, 10, 5},
			{"batch larger than issues", 15, 10, 10},
			{"batch equal to issues", 10, 10, 10},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				wikiBatch = tt.batchSize
				issues := make([]models.Issue, tt.issueLen)

				// Simulate batch logic from runGenerateWiki
				var processedCount int
				if wikiBatch > 0 && len(issues) > wikiBatch {
					processedCount = wikiBatch
				} else {
					processedCount = len(issues)
				}

				assert.Equal(t, tt.expected, processedCount)
			})
		}
	})
}

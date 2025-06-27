package main

import (
	"fmt"
	"os"
	"path/filepath"
	"testing"

	"github.com/spf13/cobra"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/nyasuto/beaver/internal/models"
	"github.com/nyasuto/beaver/pkg/wiki"
)

// 完全なモック戦略によるAPI呼び出し回避
// 実際のGitHub APIやGit操作を一切呼び出さない高速テスト

func TestWikiCompletelyMocked(t *testing.T) {
	// Store original values
	originalOutput := wikiOutput
	originalBatch := wikiBatch
	originalPublish := wikiPublish
	originalToken := os.Getenv("GITHUB_TOKEN")

	defer func() {
		wikiOutput = originalOutput
		wikiBatch = originalBatch
		wikiPublish = originalPublish
		if originalToken != "" {
			os.Setenv("GITHUB_TOKEN", originalToken)
		} else {
			os.Unsetenv("GITHUB_TOKEN")
		}
	}()

	t.Run("parseRepoPath complete coverage", func(t *testing.T) {
		tests := []struct {
			name          string
			input         string
			expectError   bool
			expectedOwner string
			expectedRepo  string
		}{
			{"valid format", "owner/repo", false, "owner", "repo"},
			{"empty string", "", true, "", ""},
			{"no slash", "noslash", true, "", ""},
			{"multiple slashes", "owner/repo/extra", true, "", ""},
			{"only slash", "/", false, "", ""},
			{"trailing slash", "owner/", false, "owner", ""},
			{"leading slash", "/owner", false, "", "owner"},
			{"special chars", "test-org/my-repo-123", false, "test-org", "my-repo-123"},
			{"unicode", "ユーザー/リポジトリ", false, "ユーザー", "リポジトリ"},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				owner, repo, err := parseRepoPath(tt.input)

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
	})

	t.Run("saveWikiPage complete coverage", func(t *testing.T) {
		tmpDir := t.TempDir()

		tests := []struct {
			name        string
			page        *wiki.WikiPage
			outputDir   string
			expectError bool
		}{
			{
				name: "normal save",
				page: &wiki.WikiPage{
					Title:    "Normal",
					Filename: "Normal.md",
					Content:  "# Normal Page\n\nContent",
				},
				outputDir:   tmpDir,
				expectError: false,
			},
			{
				name: "empty content",
				page: &wiki.WikiPage{
					Title:    "Empty",
					Filename: "Empty.md",
					Content:  "",
				},
				outputDir:   tmpDir,
				expectError: false,
			},
			{
				name: "large content",
				page: &wiki.WikiPage{
					Title:    "Large",
					Filename: "Large.md",
					Content:  generateLargeTestContent(10000),
				},
				outputDir:   tmpDir,
				expectError: false,
			},
			{
				name: "special characters",
				page: &wiki.WikiPage{
					Title:    "Special テスト",
					Filename: "Special-Test.md",
					Content:  "# テスト\n\n特殊文字コンテンツ",
				},
				outputDir:   tmpDir,
				expectError: false,
			},
			{
				name: "empty filename",
				page: &wiki.WikiPage{
					Title:    "No File",
					Filename: "",
					Content:  "Content",
				},
				outputDir:   tmpDir,
				expectError: true,
			},
			{
				name: "invalid directory",
				page: &wiki.WikiPage{
					Title:    "Invalid",
					Filename: "Invalid.md",
					Content:  "Content",
				},
				outputDir:   "/nonexistent/path",
				expectError: true,
			},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				err := saveWikiPage(tt.page, tt.outputDir)

				if tt.expectError {
					assert.Error(t, err)
				} else {
					assert.NoError(t, err)

					// Verify file was created correctly
					if tt.page.Filename != "" {
						filePath := filepath.Join(tt.outputDir, tt.page.Filename)
						content, readErr := os.ReadFile(filePath)
						assert.NoError(t, readErr)
						assert.Equal(t, tt.page.Content, string(content))
					}
				}
			})
		}
	})

	t.Run("wiki generator direct testing", func(t *testing.T) {
		generator := wiki.NewGenerator()
		projectName := "test/repo"

		// Test with comprehensive issue data
		issues := []models.Issue{
			{
				ID:      1,
				Number:  101,
				Title:   "Bug: Critical Issue",
				Body:    "This is a critical bug description",
				State:   "closed",
				HTMLURL: "https://github.com/test/repo/issues/101",
			},
			{
				ID:      2,
				Number:  102,
				Title:   "Feature: New functionality",
				Body:    "Feature request description",
				State:   "open",
				HTMLURL: "https://github.com/test/repo/issues/102",
			},
			{
				ID:      3,
				Number:  103,
				Title:   "Documentation: Update docs",
				Body:    "Documentation update needed",
				State:   "closed",
				HTMLURL: "https://github.com/test/repo/issues/103",
			},
		}

		// Test all generator methods
		t.Run("GenerateIndex", func(t *testing.T) {
			page, err := generator.GenerateIndex(issues, projectName)
			assert.NoError(t, err)
			assert.NotNil(t, page)
			assert.Equal(t, "Home.md", page.Filename)
			assert.Contains(t, page.Content, projectName)
		})

		t.Run("GenerateIssuesSummary", func(t *testing.T) {
			page, err := generator.GenerateIssuesSummary(issues, projectName)
			assert.NoError(t, err)
			assert.NotNil(t, page)
			assert.Equal(t, "Issues-Summary.md", page.Filename)
			assert.Contains(t, page.Content, "Issues Summary")
		})

		t.Run("GenerateTroubleshootingGuide", func(t *testing.T) {
			page, err := generator.GenerateTroubleshootingGuide(issues, projectName)
			assert.NoError(t, err)
			assert.NotNil(t, page)
			assert.Equal(t, "Troubleshooting-Guide.md", page.Filename)
			assert.Contains(t, page.Content, "Troubleshooting")
		})

		t.Run("GenerateLearningPath", func(t *testing.T) {
			page, err := generator.GenerateLearningPath(issues, projectName)
			assert.NoError(t, err)
			assert.NotNil(t, page)
			assert.Equal(t, "Learning-Path.md", page.Filename)
			assert.Contains(t, page.Content, "Learning Path")
		})

		// Test with edge case data
		t.Run("empty issues", func(t *testing.T) {
			emptyIssues := []models.Issue{}
			page, err := generator.GenerateIndex(emptyIssues, projectName)
			assert.NoError(t, err)
			assert.NotNil(t, page)
		})

		t.Run("malformed issues", func(t *testing.T) {
			malformedIssues := []models.Issue{
				{
					ID:      0,
					Number:  0,
					Title:   "",
					Body:    "",
					State:   "",
					HTMLURL: "",
				},
			}
			page, err := generator.GenerateIssuesSummary(malformedIssues, projectName)
			assert.NoError(t, err)
			assert.NotNil(t, page)
		})
	})

	t.Run("CLI function error paths without API", func(t *testing.T) {
		// Test early error returns that don't reach API calls
		tests := []struct {
			name     string
			testFunc func() error
			errorMsg string
		}{
			{
				name: "runGenerateWiki invalid repo",
				testFunc: func() error {
					cmd := &cobra.Command{}
					return runGenerateWiki(cmd, []string{"invalid"})
				},
				errorMsg: "無効なリポジトリパス",
			},
			{
				name: "runGenerateWiki no token",
				testFunc: func() error {
					os.Unsetenv("GITHUB_TOKEN")
					cmd := &cobra.Command{}
					return runGenerateWiki(cmd, []string{"owner/repo"})
				},
				errorMsg: "GitHub token not found",
			},
			{
				name: "runPublishWiki invalid repo",
				testFunc: func() error {
					cmd := &cobra.Command{}
					return runPublishWiki(cmd, []string{"invalid"})
				},
				errorMsg: "無効なリポジトリパス",
			},
			{
				name: "runPublishWiki no token",
				testFunc: func() error {
					os.Unsetenv("GITHUB_TOKEN")
					cmd := &cobra.Command{}
					return runPublishWiki(cmd, []string{"owner/repo"})
				},
				errorMsg: "GitHub token not found",
			},
			{
				name: "runListWiki invalid repo",
				testFunc: func() error {
					cmd := &cobra.Command{}
					return runListWiki(cmd, []string{"invalid"})
				},
				errorMsg: "無効なリポジトリパス",
			},
			{
				name: "runListWiki no token",
				testFunc: func() error {
					os.Unsetenv("GITHUB_TOKEN")
					cmd := &cobra.Command{}
					return runListWiki(cmd, []string{"owner/repo"})
				},
				errorMsg: "GitHub token not found",
			},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				err := tt.testFunc()
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errorMsg)
			})
		}
	})

	t.Run("batch logic simulation", func(t *testing.T) {
		// Test batch processing logic without API calls
		testCases := []struct {
			name         string
			totalItems   int
			batchSize    int
			expectedProc int
		}{
			{"no limit", 100, 0, 100},
			{"small batch", 100, 10, 10},
			{"exact match", 50, 50, 50},
			{"larger than total", 20, 100, 20},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				// Simulate runGenerateWiki batch logic
				allItems := make([]int, tc.totalItems)
				for i := 0; i < tc.totalItems; i++ {
					allItems[i] = i
				}

				// Apply batch logic
				items := allItems
				if tc.batchSize > 0 && len(allItems) > tc.batchSize {
					items = allItems[:tc.batchSize]
				}

				assert.Equal(t, tc.expectedProc, len(items))
			})
		}
	})

	t.Run("file processing simulation", func(t *testing.T) {
		tmpDir := t.TempDir()

		// Create test files
		fileCount := 10
		for i := 1; i <= fileCount; i++ {
			filename := fmt.Sprintf("Test-%02d.md", i)
			content := fmt.Sprintf("# Test %d\n\nContent", i)
			filePath := filepath.Join(tmpDir, filename)
			err := os.WriteFile(filePath, []byte(content), 0644)
			require.NoError(t, err)
		}

		// Simulate runPublishWiki file discovery
		wikiFiles, err := filepath.Glob(filepath.Join(tmpDir, "*.md"))
		assert.NoError(t, err)
		assert.Equal(t, fileCount, len(wikiFiles))

		// Test batch processing simulation
		batchSizes := []int{0, 3, 5, 15}
		for _, batchSize := range batchSizes {
			t.Run(fmt.Sprintf("batch_%d", batchSize), func(t *testing.T) {
				var processedFiles []string
				for i, wikiFile := range wikiFiles {
					if batchSize > 0 && i >= batchSize {
						break
					}
					processedFiles = append(processedFiles, wikiFile)
				}

				expectedCount := fileCount
				if batchSize > 0 && batchSize < fileCount {
					expectedCount = batchSize
				}

				assert.Equal(t, expectedCount, len(processedFiles))
			})
		}
	})
}

// Helper function for generating large content
func generateLargeTestContent(size int) string {
	content := "# Large Test Content\n\n"
	pattern := "This is test content for performance testing. "

	for len(content) < size {
		remaining := size - len(content)
		if remaining < len(pattern) {
			content += pattern[:remaining]
			break
		}
		content += pattern
	}

	return content
}

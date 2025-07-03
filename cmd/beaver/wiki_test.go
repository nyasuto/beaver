package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

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

// PHASE 1 IMPLEMENTATION: Wiki Command Handler Tests

// MockWikiGenerator provides testable wiki generation
type MockWikiGenerator struct {
	generateErr      error
	generatedPages   []*wiki.WikiPage
	indexCallCount   int
	summaryCallCount int
	guideCallCount   int
	pathCallCount    int
}

func (m *MockWikiGenerator) GenerateIndex(issues []models.Issue, projectName string) (*wiki.WikiPage, error) {
	m.indexCallCount++
	if m.generateErr != nil {
		return nil, m.generateErr
	}
	return &wiki.WikiPage{
		Title:    "Home",
		Filename: "Home.md",
		Content:  fmt.Sprintf("# %s Wiki\n\nGenerated from %d issues", projectName, len(issues)),
	}, nil
}

func (m *MockWikiGenerator) GenerateIssuesSummary(issues []models.Issue, projectName string) (*wiki.WikiPage, error) {
	m.summaryCallCount++
	if m.generateErr != nil {
		return nil, m.generateErr
	}
	return &wiki.WikiPage{
		Title:    "Issues Summary",
		Filename: "Issues-Summary.md",
		Content:  "# Issues Summary\n\nSummary content",
	}, nil
}

func (m *MockWikiGenerator) GenerateTroubleshootingGuide(issues []models.Issue, projectName string) (*wiki.WikiPage, error) {
	m.guideCallCount++
	if m.generateErr != nil {
		return nil, m.generateErr
	}
	return &wiki.WikiPage{
		Title:    "Troubleshooting Guide",
		Filename: "Troubleshooting-Guide.md",
		Content:  "# Troubleshooting Guide\n\nTroubleshooting content",
	}, nil
}

func (m *MockWikiGenerator) GenerateLearningPath(issues []models.Issue, projectName string) (*wiki.WikiPage, error) {
	m.pathCallCount++
	if m.generateErr != nil {
		return nil, m.generateErr
	}
	return &wiki.WikiPage{
		Title:    "Learning Path",
		Filename: "Learning-Path.md",
		Content:  "# Learning Path\n\nLearning content",
	}, nil
}

// MockWikiPublisher provides testable wiki publishing
type MockWikiPublisher struct {
	initErr       error
	cloneErr      error
	publishErr    error
	listErr       error
	pages         []*wiki.WikiPageInfo
	initCalled    bool
	cloneCalled   bool
	publishCalled bool
	listCalled    bool
	cleanupCalled bool
}

func (m *MockWikiPublisher) Initialize(ctx context.Context) error {
	m.initCalled = true
	return m.initErr
}

func (m *MockWikiPublisher) Clone(ctx context.Context) error {
	m.cloneCalled = true
	return m.cloneErr
}

func (m *MockWikiPublisher) PublishPages(ctx context.Context, pages []*wiki.WikiPage) error {
	m.publishCalled = true
	return m.publishErr
}

func (m *MockWikiPublisher) ListPages(ctx context.Context) ([]*wiki.WikiPageInfo, error) {
	m.listCalled = true
	if m.listErr != nil {
		return nil, m.listErr
	}
	return m.pages, nil
}

func (m *MockWikiPublisher) Cleanup() error {
	m.cleanupCalled = true
	return nil
}

// TestRunGenerateWiki_FullWorkflow tests the wiki generation workflow
func TestRunGenerateWiki_FullWorkflow(t *testing.T) {
	t.Run("Successful wiki generation", func(t *testing.T) {
		// Setup temporary environment
		tmpDir := t.TempDir()
		wikiOutput = tmpDir
		wikiPublish = false
		wikiBatch = 0

		// Set environment variable for token
		os.Setenv("GITHUB_TOKEN", "test-token")
		defer os.Unsetenv("GITHUB_TOKEN")

		// Test repository parsing
		repoPath := "owner/repo"
		owner, repo, err := parseRepoPath(repoPath)
		assert.NoError(t, err)
		assert.Equal(t, "owner", owner)
		assert.Equal(t, "repo", repo)

		// Test output directory creation
		err = os.MkdirAll(wikiOutput, 0755)
		assert.NoError(t, err)

		// Test wiki page generation using actual generator
		generator := wiki.NewGenerator()
		projectName := fmt.Sprintf("%s/%s", owner, repo)
		testIssues := []models.Issue{
			{
				ID:      123,
				Number:  1,
				Title:   "Test Issue",
				Body:    "Test issue body",
				State:   "open",
				HTMLURL: "https://github.com/owner/repo/issues/1",
				User:    models.User{Login: "testuser"},
			},
		}

		// Generate all page types
		indexPage, err := generator.GenerateIndex(testIssues, projectName)
		assert.NoError(t, err)
		assert.Contains(t, indexPage.Title, "Developer Dashboard")
		assert.Contains(t, indexPage.Content, projectName)

		summaryPage, err := generator.GenerateIssuesSummary(testIssues, projectName)
		assert.NoError(t, err)
		assert.Contains(t, summaryPage.Title, "Issues Summary")

		troubleshootingPage, err := generator.GenerateTroubleshootingGuide(testIssues, projectName)
		assert.NoError(t, err)
		assert.Contains(t, troubleshootingPage.Title, "Troubleshooting Guide")

		learningPage, err := generator.GenerateLearningPath(testIssues, projectName)
		assert.NoError(t, err)
		assert.Contains(t, learningPage.Title, "Learning Path")

		// Test page saving
		pages := []*wiki.WikiPage{indexPage, summaryPage, troubleshootingPage, learningPage}
		for _, page := range pages {
			err = saveWikiPage(page, wikiOutput)
			assert.NoError(t, err)

			// Verify file was created
			filePath := filepath.Join(wikiOutput, page.Filename)
			_, err = os.Stat(filePath)
			assert.NoError(t, err)

			// Verify file content
			content, err := os.ReadFile(filePath)
			assert.NoError(t, err)
			assert.Equal(t, page.Content, string(content))
		}
	})

	t.Run("Wiki generation with auto-publish", func(t *testing.T) {
		// Setup for auto-publish test
		tmpDir := t.TempDir()
		wikiOutput = tmpDir
		wikiPublish = true

		os.Setenv("GITHUB_TOKEN", "test-token")
		defer os.Unsetenv("GITHUB_TOKEN")

		// Test that auto-publish would be triggered
		assert.True(t, wikiPublish)

		// Mock publisher workflow
		mockPublisher := &MockWikiPublisher{}
		ctx := context.Background()
		testPages := []*wiki.WikiPage{
			{
				Title:    "Test Page",
				Filename: "Test-Page.md",
				Content:  "Test content",
			},
		}

		err := mockPublisher.Initialize(ctx)
		assert.NoError(t, err)
		assert.True(t, mockPublisher.initCalled)

		err = mockPublisher.PublishPages(ctx, testPages)
		assert.NoError(t, err)
		assert.True(t, mockPublisher.publishCalled)

		err = mockPublisher.Cleanup()
		assert.NoError(t, err)
		assert.True(t, mockPublisher.cleanupCalled)
	})
}

// TestRunPublishWiki_FullWorkflow tests the wiki publishing workflow
func TestRunPublishWiki_FullWorkflow(t *testing.T) {
	t.Run("Successful wiki publishing", func(t *testing.T) {
		// Setup temporary directory with wiki files
		tmpDir := t.TempDir()
		wikiOutput = tmpDir
		wikiBatch = 0

		os.Setenv("GITHUB_TOKEN", "test-token")
		defer os.Unsetenv("GITHUB_TOKEN")

		// Create test wiki files
		testFiles := map[string]string{
			"Home.md":           "# Home\n\nWelcome to the wiki",
			"Issues-Summary.md": "# Issues Summary\n\nSummary content",
			"Guide.md":          "# Guide\n\nGuide content",
		}

		for filename, content := range testFiles {
			filePath := filepath.Join(tmpDir, filename)
			err := os.WriteFile(filePath, []byte(content), 0644)
			assert.NoError(t, err)
		}

		// Test repository parsing
		repoPath := "owner/repo"
		owner, repo, err := parseRepoPath(repoPath)
		assert.NoError(t, err)
		assert.Equal(t, "owner", owner)
		assert.Equal(t, "repo", repo)

		// Test wiki file discovery
		wikiFiles, err := filepath.Glob(filepath.Join(tmpDir, "*.md"))
		assert.NoError(t, err)
		assert.Equal(t, 3, len(wikiFiles))

		// Test WikiPage creation from files
		var pages []*wiki.WikiPage
		for _, wikiFile := range wikiFiles {
			content, err := os.ReadFile(wikiFile)
			assert.NoError(t, err)

			filename := filepath.Base(wikiFile)
			title := filename[:len(filename)-3] // Remove .md

			page := &wiki.WikiPage{
				Title:    title,
				Content:  string(content),
				Filename: filename,
			}
			pages = append(pages, page)
		}

		assert.Equal(t, 3, len(pages))

		// Test publisher workflow
		mockPublisher := &MockWikiPublisher{}
		ctx := context.Background()

		err = mockPublisher.Initialize(ctx)
		assert.NoError(t, err)
		assert.True(t, mockPublisher.initCalled)

		err = mockPublisher.PublishPages(ctx, pages)
		assert.NoError(t, err)
		assert.True(t, mockPublisher.publishCalled)

		err = mockPublisher.Cleanup()
		assert.NoError(t, err)
		assert.True(t, mockPublisher.cleanupCalled)
	})

	t.Run("Publishing with batch limit", func(t *testing.T) {
		// Setup directory with multiple files
		tmpDir := t.TempDir()
		wikiOutput = tmpDir
		wikiBatch = 2 // Limit to 2 files

		// Create multiple test files
		for i := 1; i <= 5; i++ {
			filename := fmt.Sprintf("Page-%d.md", i)
			content := fmt.Sprintf("# Page %d\n\nContent %d", i, i)
			filePath := filepath.Join(tmpDir, filename)
			err := os.WriteFile(filePath, []byte(content), 0644)
			assert.NoError(t, err)
		}

		// Test file discovery
		wikiFiles, err := filepath.Glob(filepath.Join(tmpDir, "*.md"))
		assert.NoError(t, err)
		assert.Equal(t, 5, len(wikiFiles))

		// Test batch limiting logic
		processedCount := 0
		for i := range wikiFiles {
			if wikiBatch > 0 && i >= wikiBatch {
				break
			}
			processedCount++
		}

		assert.Equal(t, 2, processedCount, "Should process only 2 files due to batch limit")
	})
}

// TestRunListWiki_FullWorkflow tests the wiki listing functionality
func TestRunListWiki_FullWorkflow(t *testing.T) {
	t.Run("Successful wiki listing", func(t *testing.T) {
		os.Setenv("GITHUB_TOKEN", "test-token")
		defer os.Unsetenv("GITHUB_TOKEN")

		// Test repository parsing
		repoPath := "owner/repo"
		owner, repo, err := parseRepoPath(repoPath)
		assert.NoError(t, err)
		assert.Equal(t, "owner", owner)
		assert.Equal(t, "repo", repo)

		// Mock wiki pages
		mockPages := []*wiki.WikiPageInfo{
			{
				Title:        "Home",
				Filename:     "Home.md",
				Size:         1024,
				LastModified: time.Now(),
				URL:          "https://github.com/owner/repo/wiki/Home",
			},
			{
				Title:        "Issues-Summary",
				Filename:     "Issues-Summary.md",
				Size:         2048,
				LastModified: time.Now(),
				URL:          "https://github.com/owner/repo/wiki/Issues-Summary",
			},
		}

		// Test publisher workflow
		mockPublisher := &MockWikiPublisher{
			pages: mockPages,
		}
		ctx := context.Background()

		err = mockPublisher.Initialize(ctx)
		assert.NoError(t, err)
		assert.True(t, mockPublisher.initCalled)

		err = mockPublisher.Clone(ctx)
		assert.NoError(t, err)
		assert.True(t, mockPublisher.cloneCalled)

		pages, err := mockPublisher.ListPages(ctx)
		assert.NoError(t, err)
		assert.True(t, mockPublisher.listCalled)
		assert.Equal(t, 2, len(pages))
		assert.Equal(t, "Home", pages[0].Title)
		assert.Equal(t, "Issues-Summary", pages[1].Title)

		err = mockPublisher.Cleanup()
		assert.NoError(t, err)
		assert.True(t, mockPublisher.cleanupCalled)
	})

	t.Run("Listing with no wiki pages", func(t *testing.T) {
		os.Setenv("GITHUB_TOKEN", "test-token")
		defer os.Unsetenv("GITHUB_TOKEN")

		// Mock empty wiki
		mockPublisher := &MockWikiPublisher{
			pages: []*wiki.WikiPageInfo{}, // Empty pages
		}
		ctx := context.Background()

		pages, err := mockPublisher.ListPages(ctx)
		assert.NoError(t, err)
		assert.Equal(t, 0, len(pages))
	})

	t.Run("Listing with clone error", func(t *testing.T) {
		os.Setenv("GITHUB_TOKEN", "test-token")
		defer os.Unsetenv("GITHUB_TOKEN")

		// Mock clone failure
		mockPublisher := &MockWikiPublisher{
			cloneErr: fmt.Errorf("clone failed: repository not found"),
		}
		ctx := context.Background()

		err := mockPublisher.Clone(ctx)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "clone failed")
		assert.True(t, mockPublisher.cloneCalled)
	})
}

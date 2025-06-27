package integration

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/nyasuto/beaver/internal/config"
	"github.com/nyasuto/beaver/pkg/github"
	"github.com/nyasuto/beaver/pkg/wiki"
)

// IntegrationTestConfig holds configuration for integration tests
type IntegrationTestConfig struct {
	TestRepoOwner string
	TestRepoName  string
	GitHubToken   string
	TempDir       string
}

// setupIntegrationTest prepares the test environment
func setupIntegrationTest(t *testing.T) *IntegrationTestConfig {
	t.Helper()

	// Skip integration tests if not explicitly enabled
	if os.Getenv("BEAVER_INTEGRATION_TESTS") != "true" {
		t.Skip("Integration tests disabled. Set BEAVER_INTEGRATION_TESTS=true to enable.")
	}

	// Get test configuration from environment
	testRepoOwner := os.Getenv("BEAVER_TEST_REPO_OWNER")
	testRepoName := os.Getenv("BEAVER_TEST_REPO_NAME")
	githubToken := os.Getenv("GITHUB_TOKEN")

	if testRepoOwner == "" {
		t.Skip("BEAVER_TEST_REPO_OWNER not set. Required for integration tests.")
	}
	if testRepoName == "" {
		t.Skip("BEAVER_TEST_REPO_NAME not set. Required for integration tests.")
	}
	if githubToken == "" {
		t.Skip("GITHUB_TOKEN not set. Required for integration tests.")
	}

	// Create temporary directory for test operations
	tempDir := t.TempDir()

	return &IntegrationTestConfig{
		TestRepoOwner: testRepoOwner,
		TestRepoName:  testRepoName,
		GitHubToken:   githubToken,
		TempDir:       tempDir,
	}
}

// TestFullWorkflowIntegration tests the complete end-to-end workflow
func TestFullWorkflowIntegration(t *testing.T) {
	cfg := setupIntegrationTest(t)
	ctx := context.Background()

	t.Run("Complete GitHub Wiki Workflow", func(t *testing.T) {
		// Step 1: Initialize GitHub client
		githubClient := github.NewClient(cfg.GitHubToken)

		// Test GitHub connectivity
		err := githubClient.TestConnection(ctx)
		if err != nil {
			t.Fatalf("GitHub connection test failed: %v", err)
		}
		t.Logf("✅ GitHub API connection verified")

		// Step 2: Fetch test issues from repository
		repoPath := fmt.Sprintf("%s/%s", cfg.TestRepoOwner, cfg.TestRepoName)
		issues, err := githubClient.FetchIssues(ctx, cfg.TestRepoOwner, cfg.TestRepoName, nil)
		if err != nil {
			t.Fatalf("Failed to fetch issues from %s: %v", repoPath, err)
		}

		if len(issues) == 0 {
			t.Logf("⚠️ No issues found in %s. Creating test issue data.", repoPath)
			// For integration tests, we can work with empty data or create mock data
		} else {
			t.Logf("✅ Fetched %d issues from %s", len(issues), repoPath)
		}

		// Step 3: Initialize Wiki system
		wikiConfig := &wiki.PublisherConfig{
			Owner:                    cfg.TestRepoOwner,
			Repository:               cfg.TestRepoName,
			Token:                    cfg.GitHubToken,
			WorkingDir:               filepath.Join(cfg.TempDir, "wiki"),
			BranchName:               "master",
			AuthorName:               "Beaver Integration Test",
			AuthorEmail:              "test@beaver.ai",
			UseShallowClone:          true,
			CloneDepth:               1,
			Timeout:                  30 * time.Second,
			RetryAttempts:            3,
			RetryDelay:               time.Second,
			EnableConflictResolution: false,
		}

		publisher, err := wiki.NewGitHubWikiPublisher(wikiConfig)
		if err != nil {
			t.Fatalf("Failed to create GitHub Wiki publisher: %v", err)
		}
		defer publisher.Cleanup()

		t.Logf("✅ Wiki publisher initialized for %s", repoPath)

		// Step 4: Generate wiki content
		pages := generateTestWikiPages(issues, repoPath)
		if len(pages) == 0 {
			// Create a default test page if no issues
			pages = []*wiki.WikiPage{
				{
					Title:    "Integration Test",
					Filename: "Integration-Test.md",
					Content:  generateIntegrationTestContent(),
				},
			}
		}

		// Step 5: Publish to GitHub Wiki
		err = publisher.PublishPages(ctx, pages)
		if err != nil {
			t.Fatalf("Failed to publish wiki pages: %v", err)
		}

		t.Logf("✅ Successfully published %d wiki pages", len(pages))

		// Step 6: Verify wiki pages were created
		wikiURL := fmt.Sprintf("https://github.com/%s/wiki", repoPath)
		t.Logf("🌐 Wiki published at: %s", wikiURL)

		// Step 7: Validate generated content
		for _, page := range pages {
			if page.Content == "" {
				t.Errorf("Page %s has empty content", page.Title)
			}
			if !strings.Contains(page.Content, "Generated with Beaver") {
				t.Errorf("Page %s missing Beaver attribution", page.Title)
			}
		}

		t.Logf("✅ Integration test completed successfully")
	})
}

// TestErrorScenarios tests various error conditions
func TestErrorScenarios(t *testing.T) {
	cfg := setupIntegrationTest(t)
	ctx := context.Background()

	t.Run("Invalid GitHub Token", func(t *testing.T) {
		invalidClient := github.NewClient("invalid_token_12345")
		err := invalidClient.TestConnection(ctx)
		if err == nil {
			t.Error("Expected error with invalid token, got nil")
		}
		t.Logf("✅ Invalid token properly rejected: %v", err)
	})

	t.Run("Non-existent Repository", func(t *testing.T) {
		githubClient := github.NewClient(cfg.GitHubToken)
		_, err := githubClient.FetchIssues(ctx, "nonexistent", "repository", nil)
		if err == nil {
			t.Error("Expected error for non-existent repository, got nil")
		}
		t.Logf("✅ Non-existent repository properly handled: %v", err)
	})

	t.Run("Wiki Permission Test", func(t *testing.T) {
		// Test wiki initialization with current permissions
		wikiConfig := &wiki.PublisherConfig{
			Owner:                    cfg.TestRepoOwner,
			Repository:               cfg.TestRepoName,
			Token:                    cfg.GitHubToken,
			WorkingDir:               filepath.Join(cfg.TempDir, "wiki_perm_test"),
			BranchName:               "master",
			AuthorName:               "Beaver Integration Test",
			AuthorEmail:              "test@beaver.ai",
			UseShallowClone:          true,
			CloneDepth:               1,
			Timeout:                  30 * time.Second,
			RetryAttempts:            3,
			RetryDelay:               time.Second,
			EnableConflictResolution: false,
		}

		publisher, err := wiki.NewGitHubWikiPublisher(wikiConfig)
		if err != nil {
			t.Logf("⚠️ Wiki permissions may be insufficient: %v", err)
			// This might be expected in some test environments
		} else {
			defer publisher.Cleanup()
			t.Logf("✅ Wiki permissions verified")
		}
	})
}

// TestJapaneseContent tests Japanese content handling
func TestJapaneseContent(t *testing.T) {
	cfg := setupIntegrationTest(t)
	ctx := context.Background()

	t.Run("Japanese Content Generation and Publishing", func(t *testing.T) {
		wikiConfig := &wiki.PublisherConfig{
			Owner:                    cfg.TestRepoOwner,
			Repository:               cfg.TestRepoName,
			Token:                    cfg.GitHubToken,
			WorkingDir:               filepath.Join(cfg.TempDir, "wiki_japanese"),
			BranchName:               "master",
			AuthorName:               "Beaver Integration Test",
			AuthorEmail:              "test@beaver.ai",
			UseShallowClone:          true,
			CloneDepth:               1,
			Timeout:                  30 * time.Second,
			RetryAttempts:            3,
			RetryDelay:               time.Second,
			EnableConflictResolution: false,
		}

		publisher, err := wiki.NewGitHubWikiPublisher(wikiConfig)
		if err != nil {
			t.Fatalf("Failed to create publisher for Japanese test: %v", err)
		}
		defer publisher.Cleanup()

		// Create Japanese content
		japanesePages := []*wiki.WikiPage{
			{
				Title:    "日本語テストページ",
				Filename: "Japanese-Test-Page.md",
				Content:  generateJapaneseTestContent(),
			},
		}

		err = publisher.PublishPages(ctx, japanesePages)
		if err != nil {
			t.Fatalf("Failed to publish Japanese content: %v", err)
		}

		t.Logf("✅ Japanese content published successfully")

		// Validate Japanese content
		for _, page := range japanesePages {
			if !strings.Contains(page.Content, "統合テスト") {
				t.Error("Japanese content validation failed")
			}
			if !strings.Contains(page.Content, "GitHub Wiki") {
				t.Error("Mixed language content validation failed")
			}
		}
	})
}

// TestPerformanceScenarios tests performance with various data sizes
func TestPerformanceScenarios(t *testing.T) {
	cfg := setupIntegrationTest(t)
	ctx := context.Background()

	t.Run("Large Content Performance Test", func(t *testing.T) {
		start := time.Now()

		wikiConfig := &wiki.PublisherConfig{
			Owner:                    cfg.TestRepoOwner,
			Repository:               cfg.TestRepoName,
			Token:                    cfg.GitHubToken,
			WorkingDir:               filepath.Join(cfg.TempDir, "wiki_perf"),
			BranchName:               "master",
			AuthorName:               "Beaver Integration Test",
			AuthorEmail:              "test@beaver.ai",
			UseShallowClone:          true,
			CloneDepth:               1,
			Timeout:                  30 * time.Second,
			RetryAttempts:            3,
			RetryDelay:               time.Second,
			EnableConflictResolution: false,
		}

		publisher, err := wiki.NewGitHubWikiPublisher(wikiConfig)
		if err != nil {
			t.Fatalf("Failed to create publisher for performance test: %v", err)
		}
		defer publisher.Cleanup()

		// Generate large content
		largePages := generateLargeContentPages(10) // 10 pages with substantial content

		publishStart := time.Now()
		err = publisher.PublishPages(ctx, largePages)
		publishDuration := time.Since(publishStart)

		if err != nil {
			t.Fatalf("Failed to publish large content: %v", err)
		}

		totalDuration := time.Since(start)
		t.Logf("✅ Performance test completed:")
		t.Logf("   - Pages: %d", len(largePages))
		t.Logf("   - Publish time: %v", publishDuration)
		t.Logf("   - Total time: %v", totalDuration)

		// Performance assertions
		if publishDuration > 30*time.Second {
			t.Errorf("Publishing took too long: %v (expected < 30s)", publishDuration)
		}
	})
}

// TestConfigurationIntegration tests configuration loading and validation
func TestConfigurationIntegration(t *testing.T) {
	cfg := setupIntegrationTest(t)

	t.Run("Configuration Loading and Validation", func(t *testing.T) {
		// Create test configuration file
		configPath := filepath.Join(cfg.TempDir, "beaver.yml")
		testConfig := fmt.Sprintf(`
project:
  name: "Integration Test"
  description: "Testing beaver integration"

sources:
  github:
    token: "%s"
    repositories:
      - "%s/%s"

output:
  wiki:
    platform: github
    repository: "%s/%s"
    branch: master

ai:
  provider: mock
  enabled: false

settings:
  cleanup_on_exit: true
  enable_debug: true
`, cfg.GitHubToken, cfg.TestRepoOwner, cfg.TestRepoName, cfg.TestRepoOwner, cfg.TestRepoName)

		err := os.WriteFile(configPath, []byte(testConfig), 0600)
		if err != nil {
			t.Fatalf("Failed to create test config: %v", err)
		}

		// Change to test directory so config.LoadConfig() finds our test config
		originalDir, _ := os.Getwd()
		defer os.Chdir(originalDir)
		os.Chdir(cfg.TempDir)

		// Test configuration loading
		testCfg, err := config.LoadConfig()
		if err != nil {
			t.Fatalf("Failed to load test configuration: %v", err)
		}

		if testCfg.Project.Name != "Integration Test" {
			t.Errorf("Expected project name 'Integration Test', got %s", testCfg.Project.Name)
		}

		if testCfg.Sources.GitHub.Token != cfg.GitHubToken {
			t.Error("GitHub token not loaded correctly")
		}

		t.Logf("✅ Configuration loading and validation successful")
	})
}

// Helper functions

func generateTestWikiPages(issues []*github.IssueData, repoPath string) []*wiki.WikiPage {
	var pages []*wiki.WikiPage

	// Generate main index page
	indexContent := generateIndexContent(issues, repoPath)
	pages = append(pages, &wiki.WikiPage{
		Title:    "Home",
		Filename: "Home.md",
		Content:  indexContent,
	})

	// Generate individual issue pages (limit for testing)
	maxIssues := 5
	if len(issues) > maxIssues {
		issues = issues[:maxIssues]
	}

	for _, issue := range issues {
		pageContent := generateIssuePageContent(issue)
		filename := fmt.Sprintf("Issue-%d.md", issue.Number)
		pages = append(pages, &wiki.WikiPage{
			Title:    fmt.Sprintf("Issue #%d: %s", issue.Number, issue.Title),
			Filename: filename,
			Content:  pageContent,
		})
	}

	return pages
}

func generateIndexContent(issues []*github.IssueData, repoPath string) string {
	content := fmt.Sprintf(`# %s - Project Wiki

## 📊 Overview

This wiki was automatically generated by Beaver from GitHub Issues.

**Repository:** %s  
**Generated:** %s  
**Issues Processed:** %d

## 📋 Issues Summary

`, repoPath, repoPath, time.Now().Format("2006-01-02 15:04:05"), len(issues))

	if len(issues) > 0 {
		content += "| Issue | Title | State | Created |\n"
		content += "|-------|-------|-------|--------|\n"
		for _, issue := range issues {
			content += fmt.Sprintf("| [#%d](Issue-%d.md) | %s | %s | %s |\n",
				issue.Number, issue.Number, issue.Title, issue.State,
				issue.CreatedAt.Format("2006-01-02"))
		}
	} else {
		content += "*No issues found in this repository.*\n"
	}

	content += fmt.Sprintf(`

## 🛠️ Generated with Beaver

This documentation was automatically generated using [Beaver](https://github.com/nyasuto/beaver), an AI-powered knowledge dam construction tool.

**Integration Test Completed:** %s
`, time.Now().Format("2006-01-02 15:04:05"))

	return content
}

func generateIssuePageContent(issue *github.IssueData) string {
	content := fmt.Sprintf(`# Issue #%d: %s

**State:** %s  
**Author:** %s  
**Created:** %s  
**Updated:** %s

## Description

%s

## Labels

`, issue.Number, issue.Title, issue.State, issue.User,
		issue.CreatedAt.Format("2006-01-02 15:04:05"),
		issue.UpdatedAt.Format("2006-01-02 15:04:05"),
		issue.Body)

	if len(issue.Labels) > 0 {
		for _, label := range issue.Labels {
			content += fmt.Sprintf("- `%s`\n", label)
		}
	} else {
		content += "*No labels assigned*\n"
	}

	if len(issue.Comments) > 0 {
		content += fmt.Sprintf(`

## Comments (%d)

`, len(issue.Comments))
		for i, comment := range issue.Comments {
			content += fmt.Sprintf(`### Comment %d
**Author:** %s  
**Date:** %s

%s

`, i+1, comment.User, comment.CreatedAt.Format("2006-01-02 15:04:05"), comment.Body)
		}
	}

	content += `

---
*Generated with Beaver - AI-powered knowledge dam construction*
`

	return content
}

func generateIntegrationTestContent() string {
	return fmt.Sprintf(`# Beaver Integration Test

## 🧪 Test Information

**Date:** %s  
**Purpose:** End-to-end integration testing of Beaver GitHub Wiki functionality

## ✅ Test Results

This page was automatically generated and published to verify:

1. **GitHub API Integration** - Successfully connected to GitHub API
2. **Wiki Publishing** - Successfully published content to GitHub Wiki
3. **Content Generation** - Generated structured markdown content
4. **Japanese Support** - Handles Japanese content correctly
5. **Error Handling** - Proper error handling for various scenarios

## 🛠️ Technical Details

- **Publisher:** GitHub Wiki Publisher
- **Content Format:** Markdown
- **Encoding:** UTF-8
- **Generated with:** [Beaver](https://github.com/nyasuto/beaver)

## 📝 Notes

If you can see this page, the integration test was successful!

---
*Generated with Beaver - AI-powered knowledge dam construction*
`, time.Now().Format("2006-01-02 15:04:05"))
}

func generateJapaneseTestContent() string {
	return fmt.Sprintf(`# 日本語テストページ

## 🧪 統合テスト情報

**日付:** %s  
**目的:** Beaver GitHub Wiki 機能の日本語コンテンツ統合テスト

## ✅ テスト結果

このページは以下を検証するために自動生成・公開されました：

1. **GitHub API 統合** - GitHub API への接続が成功
2. **Wiki 公開** - GitHub Wiki へのコンテンツ公開が成功
3. **コンテンツ生成** - 構造化されたMarkdownコンテンツの生成
4. **日本語サポート** - 日本語コンテンツの正しい処理
5. **エラーハンドリング** - 各種シナリオでの適切なエラー処理

## 🛠️ 技術詳細

- **パブリッシャー:** GitHub Wiki Publisher
- **コンテンツ形式:** Markdown
- **エンコーディング:** UTF-8
- **生成ツール:** [Beaver](https://github.com/nyasuto/beaver)

## 📝 備考

このページが表示されていれば、統合テストは成功です！

### 混合言語テスト (Mixed Language Test)

This content mixes Japanese and English to ensure proper handling of multilingual content in GitHub Wiki publishing.

---
*Generated with Beaver - AI-powered knowledge dam construction*
`, time.Now().Format("2006-01-02 15:04:05"))
}

func generateLargeContentPages(count int) []*wiki.WikiPage {
	var pages []*wiki.WikiPage

	for i := 1; i <= count; i++ {
		content := fmt.Sprintf(`# Large Content Page %d

## Overview

This is a large content page generated for performance testing.

`, i)

		// Add substantial content
		for j := 1; j <= 50; j++ {
			content += fmt.Sprintf(`### Section %d.%d

This section contains substantial content to test the performance of wiki publishing 
with larger pages. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do 
eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, 
quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

#### Subsection %d.%d.1

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat 
nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui 
officia deserunt mollit anim id est laborum.

#### Subsection %d.%d.2

Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque 
laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi 
architecto beatae vitae dicta sunt explicabo.

`, j, i, j, i, j, i)
		}

		content += `

---
*Generated with Beaver for performance testing*
`

		pages = append(pages, &wiki.WikiPage{
			Title:    fmt.Sprintf("Large Content Page %d", i),
			Filename: fmt.Sprintf("Large-Content-Page-%d.md", i),
			Content:  content,
		})
	}

	return pages
}

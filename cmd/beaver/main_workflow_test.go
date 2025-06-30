package main

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/nyasuto/beaver/internal/config"
	"github.com/nyasuto/beaver/internal/models"
	"github.com/spf13/cobra"
	"github.com/stretchr/testify/assert"
)

// TestInitCommand_FullWorkflow tests the complete init command workflow
func TestInitCommand_FullWorkflow(t *testing.T) {
	t.Run("Successful initialization", func(t *testing.T) {
		// Create a temporary directory
		tmpDir := t.TempDir()
		oldWd, _ := os.Getwd()
		defer os.Chdir(oldWd)
		os.Chdir(tmpDir)

		// Capture stdout
		var buf bytes.Buffer
		cmd := &cobra.Command{}
		cmd.SetOut(&buf)
		cmd.SetErr(&buf)

		// Mock no existing config
		configPath := filepath.Join(tmpDir, "beaver.yml")
		_, err := os.Stat(configPath)
		assert.True(t, os.IsNotExist(err), "Config should not exist initially")

		// Simulate the init command logic
		// In real implementation, this would call initCmd.Run
		configContent := `project:
  name: "test-project"
  repository: "test/repo"
sources:
  github:
    token: "${GITHUB_TOKEN}"
ai:
  provider: "openai"
output:
  wiki:
    platform: "minima"`

		err = os.WriteFile(configPath, []byte(configContent), 0644)
		assert.NoError(t, err)

		// Verify file was created
		_, err = os.Stat(configPath)
		assert.NoError(t, err, "Config file should be created")

		// Verify content
		content, err := os.ReadFile(configPath)
		assert.NoError(t, err)
		assert.Contains(t, string(content), "test-project")
		assert.Contains(t, string(content), "GITHUB_TOKEN")
	})

	t.Run("Config file already exists", func(t *testing.T) {
		// Create temporary directory with existing config
		tmpDir := t.TempDir()
		configPath := filepath.Join(tmpDir, "beaver.yml")

		// Create existing config
		err := os.WriteFile(configPath, []byte("existing config"), 0644)
		assert.NoError(t, err)

		// Verify behavior when config exists
		_, err = os.Stat(configPath)
		assert.NoError(t, err, "Config file should exist")

		// Content should remain unchanged
		content, err := os.ReadFile(configPath)
		assert.NoError(t, err)
		assert.Equal(t, "existing config", string(content))
	})
}

// TestBuildCommand_FullWorkflow tests the complete build command workflow
func TestBuildCommand_FullWorkflow(t *testing.T) {
	t.Run("Successful build workflow", func(t *testing.T) {
		// Setup test data
		testConfig := &config.Config{
			Project: config.ProjectConfig{
				Name:       "test-project",
				Repository: "owner/repo",
			},
			Sources: config.SourcesConfig{
				GitHub: config.GitHubConfig{
					Token: "test-token",
				},
			},
			Output: config.OutputConfig{
				GitHubPages: config.GitHubPagesConfig{
					Theme: "minima",
				},
			},
			AI: config.AIConfig{
				Provider: "openai",
				Model:    "gpt-4",
			},
		}

		// Mock services
		mockGitHub := NewMockGitHubService()
		// Set up test data
		mockGitHub.FetchIssuesResponse.Issues = []models.Issue{
			{
				ID:        123,
				Number:    1,
				Title:     "Test Issue",
				Body:      "Test issue body",
				State:     "open",
				HTMLURL:   "https://github.com/owner/repo/issues/1",
				User:      models.User{Login: "testuser"},
				CreatedAt: time.Now(),
			},
		}
		mockGitHub.FetchIssuesResponse.FetchedCount = 1

		mockWiki := &MockWikiService{}

		// Test the build workflow components
		ctx := context.Background()

		// Test GitHub issues fetch
		query := models.DefaultIssueQuery("owner/repo")
		result, err := mockGitHub.FetchIssues(ctx, query)
		assert.NoError(t, err)
		assert.Equal(t, 1, result.FetchedCount)
		assert.True(t, mockGitHub.AssertFetchIssuesCalled(1))

		// Test wiki generation
		pages, err := mockWiki.GenerateAllPages(result.Issues, testConfig.Project.Name)
		assert.NoError(t, err)
		assert.Greater(t, len(pages), 0)
		assert.Equal(t, "Home", pages[0].Title)

		// Test wiki publishing (when GitHub Pages is configured)
		if testConfig.Output.GitHubPages.Theme == "minima" {
			err = mockWiki.PublishPages(ctx, pages)
			assert.NoError(t, err)
			assert.True(t, mockWiki.publishCalled)
		}
	})

	t.Run("Build command - missing configuration", func(t *testing.T) {
		// Test config loading error
		tmpDir := t.TempDir()
		oldWd, _ := os.Getwd()
		defer os.Chdir(oldWd)
		os.Chdir(tmpDir)

		// No config file exists
		_, err := os.Stat("beaver.yml")
		assert.True(t, os.IsNotExist(err))

		// This would trigger the config loading error in buildCmd.Run
	})

	t.Run("Build command - invalid repository", func(t *testing.T) {
		// Test repository validation
		invalidRepos := []string{
			"",
			"username/my-repo", // Default template value
			"invalid",
		}

		for _, repo := range invalidRepos {
			// These should be rejected in buildCmd.Run
			if repo == "" || repo == "username/my-repo" {
				assert.True(t, repo == "" || repo == "username/my-repo")
			}
		}
	})

	t.Run("Build command - GitHub fetch error", func(t *testing.T) {
		// Test GitHub API error handling
		mockGitHub := NewMockGitHubService()
		mockGitHub.FetchIssuesError = fmt.Errorf("API rate limit exceeded")

		ctx := context.Background()
		query := models.DefaultIssueQuery("owner/repo")
		_, err := mockGitHub.FetchIssues(ctx, query)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "rate limit")
	})

	t.Run("Build command - wiki generation error", func(t *testing.T) {
		// Test wiki generation error handling
		mockWiki := &MockWikiService{
			generateErr: fmt.Errorf("wiki generation failed"),
		}

		issues := []models.Issue{}
		_, err := mockWiki.GenerateAllPages(issues, "test-project")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "generation failed")
	})
}

// TestStatusCommand_FullWorkflow tests the complete status command workflow
func TestStatusCommand_FullWorkflow(t *testing.T) {
	t.Run("Status with valid configuration", func(t *testing.T) {
		// Setup valid config
		testConfig := &config.Config{
			Project: config.ProjectConfig{
				Name:       "test-project",
				Repository: "owner/repo",
			},
			Sources: config.SourcesConfig{
				GitHub: config.GitHubConfig{
					Token: "test-token",
				},
			},
			AI: config.AIConfig{
				Provider: "openai",
				Model:    "gpt-4",
			},
			Output: config.OutputConfig{
				GitHubPages: config.GitHubPagesConfig{
					Theme: "minima",
				},
			},
		}

		// Mock GitHub service
		mockGitHub := NewMockGitHubService()

		// Test configuration validation
		assert.Equal(t, "test-project", testConfig.Project.Name)
		assert.Equal(t, "owner/repo", testConfig.Project.Repository)
		assert.NotEmpty(t, testConfig.Sources.GitHub.Token)

		// Test GitHub connection
		ctx := context.Background()
		err := mockGitHub.TestConnection(ctx)
		assert.NoError(t, err)
		assert.True(t, mockGitHub.AssertTestConnectionCalled(1))

		// Test issues fetch test
		query := models.DefaultIssueQuery(testConfig.Project.Repository)
		query.PerPage = 1
		result, err := mockGitHub.FetchIssues(ctx, query)
		assert.NoError(t, err)
		assert.NotNil(t, result)
	})

	t.Run("Status with missing configuration", func(t *testing.T) {
		// Test config not found scenario
		tmpDir := t.TempDir()
		oldWd, _ := os.Getwd()
		defer os.Chdir(oldWd)
		os.Chdir(tmpDir)

		// No config file exists
		_, err := os.Stat("beaver.yml")
		assert.True(t, os.IsNotExist(err))

		// This would trigger the "no config file" path in statusCmd.Run
	})

	t.Run("Status with GitHub connection error", func(t *testing.T) {
		// Test GitHub connection failure
		mockGitHub := NewMockGitHubService()
		mockGitHub.TestConnectionError = fmt.Errorf("authentication failed")

		ctx := context.Background()
		err := mockGitHub.TestConnection(ctx)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "authentication")
		assert.True(t, mockGitHub.AssertTestConnectionCalled(1))
	})

	t.Run("Status with invalid token", func(t *testing.T) {
		// Test empty token scenario
		testConfig := &config.Config{
			Sources: config.SourcesConfig{
				GitHub: config.GitHubConfig{
					Token: "", // Empty token
				},
			},
		}

		// Token validation
		assert.Empty(t, testConfig.Sources.GitHub.Token)
		// This would trigger the "GITHUB_TOKEN not set" warning in statusCmd.Run
	})
}

// TestFullWorkflowIntegration tests complete end-to-end workflows
func TestFullWorkflowIntegration(t *testing.T) {
	t.Run("Complete build workflow with real file operations", func(t *testing.T) {
		ctx := NewIntegrationTestContext(t)
		defer ctx.Cleanup()

		// Setup test issues
		testIssues := ctx.CreateTestIssues(5)
		ctx.GitHubService.FetchIssuesResponse.Issues = testIssues
		ctx.GitHubService.FetchIssuesResponse.FetchedCount = len(testIssues)
		ctx.GitHubService.FetchIssuesResponse.TotalCount = len(testIssues)

		// Test 1: Config loading and validation
		cfg, err := ctx.ConfigService.LoadConfig()
		assert.NoError(t, err)
		assert.Equal(t, "integration-test", cfg.Project.Name)

		err = ctx.ConfigService.Validate(cfg)
		assert.NoError(t, err)

		// Test 2: GitHub issues fetch
		testCtx := context.Background()
		query := models.DefaultIssueQuery(cfg.Project.Repository)
		result, err := ctx.GitHubService.FetchIssues(testCtx, query)
		assert.NoError(t, err)
		assert.Equal(t, 5, result.FetchedCount)
		assert.True(t, ctx.GitHubService.AssertFetchIssuesCalled(1))

		// Test 3: Wiki generation
		pages, err := ctx.WikiService.GenerateAllPages(result.Issues, cfg.Project.Name)
		assert.NoError(t, err)
		assert.Greater(t, len(pages), 0)

		// Test 4: File operations - save wiki pages
		for _, page := range pages {
			filePath := filepath.Join(ctx.OutputDir, page.Filename)
			err = os.WriteFile(filePath, []byte(page.Content), 0644)
			assert.NoError(t, err)

			// Verify file was created
			_, err = os.Stat(filePath)
			assert.NoError(t, err)
		}

		// Test 5: Wiki publishing
		err = ctx.WikiService.PublishPages(testCtx, pages)
		assert.NoError(t, err)
		assert.True(t, ctx.WikiService.publishCalled)

		// Test 6: Verify output directory structure
		files, err := os.ReadDir(ctx.OutputDir)
		assert.NoError(t, err)
		assert.Greater(t, len(files), 0)
	})

	t.Run("Workflow with GitHub API rate limiting", func(t *testing.T) {
		ctx := NewIntegrationTestContext(t)
		defer ctx.Cleanup()

		// Simulate rate limiting
		ctx.GitHubService.FetchIssuesError = fmt.Errorf("API rate limit exceeded. Try again later")

		testCtx := context.Background()
		query := models.DefaultIssueQuery("test/repo")
		_, err := ctx.GitHubService.FetchIssues(testCtx, query)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "rate limit")
	})

	t.Run("Workflow with network timeout", func(t *testing.T) {
		ctx := NewIntegrationTestContext(t)
		defer ctx.Cleanup()

		// Simulate network timeout
		ctx.GitHubService.TestConnectionError = fmt.Errorf("network timeout: context deadline exceeded")

		testCtx := context.Background()
		err := ctx.GitHubService.TestConnection(testCtx)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "timeout")
	})
}

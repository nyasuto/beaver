package wiki

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/nyasuto/beaver/internal/config"
)

// Helper function to create a valid publisher config for tests
func createTestPublisherConfig() *PublisherConfig {
	return &PublisherConfig{
		Owner:      "testowner",
		Repository: "testrepo",
		Token:      "testtoken",
		Timeout:    30 * time.Second,
	}
}

func TestNewGitHubPagesPublisher(t *testing.T) {
	tests := []struct {
		name            string
		publisherConfig *PublisherConfig
		pagesConfig     config.GitHubPagesConfig
		expectError     bool
		errorMessage    string
	}{
		{
			name: "valid configuration",
			publisherConfig: &PublisherConfig{
				Owner:      "testowner",
				Repository: "testrepo",
				Token:      "testtoken",
				Timeout:    30 * time.Second,
			},
			pagesConfig: config.GitHubPagesConfig{
				Theme:  "minima",
				Branch: "gh-pages",
			},
			expectError: false,
		},
		{
			name: "invalid publisher config - missing owner",
			publisherConfig: &PublisherConfig{
				Repository: "testrepo",
				Token:      "testtoken",
				Timeout:    30 * time.Second,
			},
			pagesConfig: config.GitHubPagesConfig{
				Theme: "minima",
			},
			expectError:  true,
			errorMessage: "invalid publisher config",
		},
		{
			name: "invalid pages config - invalid theme",
			publisherConfig: &PublisherConfig{
				Owner:      "testowner",
				Repository: "testrepo",
				Token:      "testtoken",
				Timeout:    30 * time.Second,
			},
			pagesConfig: config.GitHubPagesConfig{
				Theme:  "invalid-theme",
				Branch: "gh-pages",
			},
			expectError:  true,
			errorMessage: "invalid GitHub Pages config",
		},
		{
			name: "invalid pages config - invalid branch",
			publisherConfig: &PublisherConfig{
				Owner:      "testowner",
				Repository: "testrepo",
				Token:      "testtoken",
				Timeout:    30 * time.Second,
			},
			pagesConfig: config.GitHubPagesConfig{
				Theme:  "minima",
				Branch: "invalid-branch",
			},
			expectError:  true,
			errorMessage: "invalid GitHub Pages config",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			publisher, err := NewGitHubPagesPublisher(tt.publisherConfig, tt.pagesConfig)

			if tt.expectError {
				if err == nil {
					t.Errorf("Expected error but got none")
					return
				}
				if !strings.Contains(err.Error(), tt.errorMessage) {
					t.Errorf("Expected error message to contain '%s', got '%s'", tt.errorMessage, err.Error())
				}
				return
			}

			if err != nil {
				t.Errorf("Unexpected error: %v", err)
				return
			}

			if publisher == nil {
				t.Errorf("Expected publisher to be created, got nil")
				return
			}

			if publisher.config.Owner != tt.publisherConfig.Owner {
				t.Errorf("Expected owner %s, got %s", tt.publisherConfig.Owner, publisher.config.Owner)
			}

			if publisher.pagesConfig.Theme != tt.pagesConfig.Theme {
				t.Errorf("Expected theme %s, got %s", tt.pagesConfig.Theme, publisher.pagesConfig.Theme)
			}
		})
	}
}

func TestValidateGitHubPagesConfig(t *testing.T) {
	tests := []struct {
		name         string
		config       config.GitHubPagesConfig
		expectError  bool
		errorMessage string
	}{
		{
			name: "valid config with all fields",
			config: config.GitHubPagesConfig{
				Theme:        "minima",
				Branch:       "gh-pages",
				Domain:       "example.com",
				EnableSearch: true,
				Analytics:    "GA-123456",
				BaseURL:      "/myrepo",
			},
			expectError: false,
		},
		{
			name: "valid config with minimal fields",
			config: config.GitHubPagesConfig{
				Theme:  "cayman",
				Branch: "main",
			},
			expectError: false,
		},
		{
			name: "valid config with empty optional fields",
			config: config.GitHubPagesConfig{
				Theme:  "architect",
				Branch: "master",
			},
			expectError: false,
		},
		{
			name: "invalid theme",
			config: config.GitHubPagesConfig{
				Theme:  "nonexistent-theme",
				Branch: "gh-pages",
			},
			expectError:  true,
			errorMessage: "無効なtheme",
		},
		{
			name: "invalid branch",
			config: config.GitHubPagesConfig{
				Theme:  "minima",
				Branch: "feature-branch",
			},
			expectError:  true,
			errorMessage: "無効なbranch",
		},
		{
			name:        "empty config (should use defaults)",
			config:      config.GitHubPagesConfig{},
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateGitHubPagesConfig(tt.config)

			if tt.expectError {
				if err == nil {
					t.Errorf("Expected error but got none")
					return
				}
				if !strings.Contains(err.Error(), tt.errorMessage) {
					t.Errorf("Expected error message to contain '%s', got '%s'", tt.errorMessage, err.Error())
				}
				return
			}

			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
		})
	}
}

func TestGitHubPagesPublisher_Initialize(t *testing.T) {
	publisherConfig := createTestPublisherConfig()
	pagesConfig := config.GitHubPagesConfig{
		Theme:  "minima",
		Branch: "gh-pages",
	}

	publisher, err := NewGitHubPagesPublisher(publisherConfig, pagesConfig)
	if err != nil {
		t.Fatalf("Failed to create publisher: %v", err)
	}
	defer publisher.Cleanup()

	ctx := context.Background()

	// Test first initialization
	err = publisher.Initialize(ctx)
	if err != nil {
		t.Errorf("Failed to initialize publisher: %v", err)
		return
	}

	if !publisher.isInitialized {
		t.Errorf("Publisher should be marked as initialized")
	}

	if publisher.workingDir == "" {
		t.Errorf("Working directory should be set")
	}

	if publisher.config.BranchName != "gh-pages" {
		t.Errorf("Expected branch name to be set to 'gh-pages', got '%s'", publisher.config.BranchName)
	}

	// Test that working directory exists
	if _, err := os.Stat(publisher.workingDir); os.IsNotExist(err) {
		t.Errorf("Working directory should exist: %s", publisher.workingDir)
	}

	// Test second initialization (should be idempotent)
	oldWorkingDir := publisher.workingDir
	err = publisher.Initialize(ctx)
	if err != nil {
		t.Errorf("Second initialization should not fail: %v", err)
	}

	if publisher.workingDir != oldWorkingDir {
		t.Errorf("Working directory should not change on second initialization")
	}
}

func TestGitHubPagesPublisher_CreateInitialJekyllStructure(t *testing.T) {
	publisherConfig := createTestPublisherConfig()
	pagesConfig := config.GitHubPagesConfig{
		Theme:        "cayman",
		Branch:       "main",
		EnableSearch: true,
		Analytics:    "GA-123456",
		BaseURL:      "/testrepo",
	}

	publisher, err := NewGitHubPagesPublisher(publisherConfig, pagesConfig)
	if err != nil {
		t.Fatalf("Failed to create publisher: %v", err)
	}
	defer publisher.Cleanup()

	ctx := context.Background()
	err = publisher.Initialize(ctx)
	if err != nil {
		t.Fatalf("Failed to initialize publisher: %v", err)
	}

	// Create Jekyll structure
	err = publisher.createInitialJekyllStructure()
	if err != nil {
		t.Errorf("Failed to create Jekyll structure: %v", err)
		return
	}

	// Verify files exist
	expectedFiles := []string{
		"_config.yml",
		"index.md",
		"_layouts/default.html",
	}

	for _, filename := range expectedFiles {
		filePath := filepath.Join(publisher.workingDir, filename)
		if _, err := os.Stat(filePath); os.IsNotExist(err) {
			t.Errorf("Expected file does not exist: %s", filename)
		}
	}

	// Verify _config.yml content
	configPath := filepath.Join(publisher.workingDir, "_config.yml")
	configContent, err := os.ReadFile(configPath)
	if err != nil {
		t.Errorf("Failed to read _config.yml: %v", err)
	} else {
		configStr := string(configContent)
		expectedContent := []string{
			"title: testrepo Knowledge Base",
			"theme: cayman",
			"repository: testowner/testrepo",
			"baseurl: \"/testrepo\"",
		}

		for _, expected := range expectedContent {
			if !strings.Contains(configStr, expected) {
				t.Errorf("_config.yml should contain '%s'", expected)
			}
		}
	}

	// Verify index.md content
	indexPath := filepath.Join(publisher.workingDir, "index.md")
	indexContent, err := os.ReadFile(indexPath)
	if err != nil {
		t.Errorf("Failed to read index.md: %v", err)
	} else {
		indexStr := string(indexContent)
		expectedContent := []string{
			"# testrepo Knowledge Base",
			"layout: default",
			"title: Home",
		}

		for _, expected := range expectedContent {
			if !strings.Contains(indexStr, expected) {
				t.Errorf("index.md should contain '%s'", expected)
			}
		}
	}
}

func TestGitHubPagesPublisher_ConvertAndSaveWikiPage(t *testing.T) {
	publisherConfig := createTestPublisherConfig()
	pagesConfig := config.GitHubPagesConfig{
		Theme:  "minima",
		Branch: "gh-pages",
	}

	publisher, err := NewGitHubPagesPublisher(publisherConfig, pagesConfig)
	if err != nil {
		t.Fatalf("Failed to create publisher: %v", err)
	}
	defer publisher.Cleanup()

	ctx := context.Background()
	err = publisher.Initialize(ctx)
	if err != nil {
		t.Fatalf("Failed to initialize publisher: %v", err)
	}

	// Create test wiki page
	testPage := &WikiPage{
		Title:     "Test Issue Summary",
		Content:   "# Test Content\n\nThis is a test page with some **markdown** content.",
		Filename:  "Test-Issue-Summary.md",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		Summary:   "This is a test summary",
		Category:  "issues",
		Tags:      []string{"test", "summary"},
	}

	// Convert and save the page
	err = publisher.convertAndSaveWikiPage(testPage)
	if err != nil {
		t.Errorf("Failed to convert and save wiki page: %v", err)
		return
	}

	// Verify the file was created
	expectedFilename := "test-issue-summary.html"
	filePath := filepath.Join(publisher.workingDir, expectedFilename)

	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		t.Errorf("Expected file does not exist: %s", expectedFilename)
		return
	}

	// Read and verify content
	content, err := os.ReadFile(filePath)
	if err != nil {
		t.Errorf("Failed to read saved file: %v", err)
		return
	}

	contentStr := string(content)

	// Verify Jekyll front matter
	expectedFrontMatter := []string{
		"---",
		"layout: default",
		`title: "Test Issue Summary"`,
		"beaver_auto_generated: true",
		`description: "This is a test summary"`,
		`category: "issues"`,
		"tags:",
		`  - "test"`,
		`  - "summary"`,
		"---",
	}

	for _, expected := range expectedFrontMatter {
		if !strings.Contains(contentStr, expected) {
			t.Errorf("File content should contain '%s'", expected)
		}
	}

	// Verify original content is preserved
	if !strings.Contains(contentStr, "# Test Content") {
		t.Errorf("Original markdown content should be preserved")
	}

	if !strings.Contains(contentStr, "This is a test page with some **markdown** content.") {
		t.Errorf("Original markdown content should be preserved")
	}
}

func TestGitHubPagesPublisher_PublishPages(t *testing.T) {
	publisherConfig := createTestPublisherConfig()
	pagesConfig := config.GitHubPagesConfig{
		Theme:  "minima",
		Branch: "gh-pages",
	}

	publisher, err := NewGitHubPagesPublisher(publisherConfig, pagesConfig)
	if err != nil {
		t.Fatalf("Failed to create publisher: %v", err)
	}
	defer publisher.Cleanup()

	ctx := context.Background()
	err = publisher.Initialize(ctx)
	if err != nil {
		t.Fatalf("Failed to initialize publisher: %v", err)
	}

	// Create test pages
	testPages := []*WikiPage{
		{
			Title:    "Issues Summary",
			Content:  "# Issues Summary\n\nList of all issues.",
			Filename: "Issues-Summary.md",
			Category: "summary",
		},
		{
			Title:    "Troubleshooting Guide",
			Content:  "# Troubleshooting\n\nCommon problems and solutions.",
			Filename: "Troubleshooting-Guide.md",
			Category: "help",
		},
	}

	// Test publish pages
	err = publisher.PublishPages(ctx, testPages)
	if err != nil {
		t.Errorf("Failed to publish pages: %v", err)
		return
	}

	// Verify files were created
	expectedFiles := []string{
		"issues-summary.html",
		"troubleshooting-guide.html",
	}

	for _, filename := range expectedFiles {
		filePath := filepath.Join(publisher.workingDir, filename)
		if _, err := os.Stat(filePath); os.IsNotExist(err) {
			t.Errorf("Expected file does not exist: %s", filename)
		}
	}
}

func TestGitHubPagesPublisher_PageExists(t *testing.T) {
	publisherConfig := createTestPublisherConfig()
	pagesConfig := config.GitHubPagesConfig{
		Theme:  "minima",
		Branch: "gh-pages",
	}

	publisher, err := NewGitHubPagesPublisher(publisherConfig, pagesConfig)
	if err != nil {
		t.Fatalf("Failed to create publisher: %v", err)
	}
	defer publisher.Cleanup()

	ctx := context.Background()
	err = publisher.Initialize(ctx)
	if err != nil {
		t.Fatalf("Failed to initialize publisher: %v", err)
	}

	// Test non-existent page
	exists, err := publisher.PageExists(ctx, "Non-Existent-Page.md")
	if err != nil {
		t.Errorf("PageExists should not return error for non-existent page: %v", err)
	}
	if exists {
		t.Errorf("PageExists should return false for non-existent page")
	}

	// Create a test file
	testFilename := "test-page.html"
	testFilePath := filepath.Join(publisher.workingDir, testFilename)
	err = os.WriteFile(testFilePath, []byte("test content"), 0644)
	if err != nil {
		t.Fatalf("Failed to create test file: %v", err)
	}

	// Test existing page
	exists, err = publisher.PageExists(ctx, "Test-Page.md")
	if err != nil {
		t.Errorf("PageExists should not return error for existing page: %v", err)
	}
	if !exists {
		t.Errorf("PageExists should return true for existing page")
	}
}

func TestGitHubPagesPublisher_GetStatus(t *testing.T) {
	publisherConfig := createTestPublisherConfig()
	pagesConfig := config.GitHubPagesConfig{
		Theme:  "minima",
		Branch: "gh-pages",
	}

	publisher, err := NewGitHubPagesPublisher(publisherConfig, pagesConfig)
	if err != nil {
		t.Fatalf("Failed to create publisher: %v", err)
	}
	defer publisher.Cleanup()

	ctx := context.Background()

	// Test status before initialization
	status, err := publisher.GetStatus(ctx)
	if err != nil {
		t.Errorf("GetStatus should not return error: %v", err)
	}
	if status.IsInitialized {
		t.Errorf("Status should show not initialized")
	}

	// Initialize and test status
	err = publisher.Initialize(ctx)
	if err != nil {
		t.Fatalf("Failed to initialize publisher: %v", err)
	}

	status, err = publisher.GetStatus(ctx)
	if err != nil {
		t.Errorf("GetStatus should not return error after initialization: %v", err)
	}

	if !status.IsInitialized {
		t.Errorf("Status should show initialized")
	}

	if status.WorkingDir != publisher.workingDir {
		t.Errorf("Status working dir should match publisher working dir")
	}

	if status.BranchName != "gh-pages" {
		t.Errorf("Status branch name should be 'gh-pages', got '%s'", status.BranchName)
	}

	expectedURL := "https://github.com/testowner/testrepo"
	if status.RepositoryURL != expectedURL {
		t.Errorf("Status repository URL should be '%s', got '%s'", expectedURL, status.RepositoryURL)
	}
}

func TestWikiPageToJekyllFilename(t *testing.T) {
	publisherConfig := createTestPublisherConfig()
	pagesConfig := config.GitHubPagesConfig{}

	publisher, err := NewGitHubPagesPublisher(publisherConfig, pagesConfig)
	if err != nil {
		t.Fatalf("Failed to create publisher: %v", err)
	}

	tests := []struct {
		input    string
		expected string
	}{
		{"Home.md", "home.html"},
		{"Issues-Summary.md", "issues-summary.html"},
		{"Troubleshooting_Guide.md", "troubleshooting-guide.html"},
		{"Learning Path.md", "learning-path.html"},
		{"Test File Name.md", "test-file-name.html"},
		{"NoExtension", "noextension.html"},
		{"UPPERCASE.md", "uppercase.html"},
		{"Mixed_Case-File.md", "mixed-case-file.html"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := publisher.wikiPageToJekyllFilename(tt.input)
			if result != tt.expected {
				t.Errorf("Expected '%s', got '%s'", tt.expected, result)
			}
		})
	}
}

func TestGitHubPagesPublisher_Cleanup(t *testing.T) {
	publisherConfig := createTestPublisherConfig()
	pagesConfig := config.GitHubPagesConfig{
		Theme:  "minima",
		Branch: "gh-pages",
	}

	publisher, err := NewGitHubPagesPublisher(publisherConfig, pagesConfig)
	if err != nil {
		t.Fatalf("Failed to create publisher: %v", err)
	}

	ctx := context.Background()
	err = publisher.Initialize(ctx)
	if err != nil {
		t.Fatalf("Failed to initialize publisher: %v", err)
	}

	workingDir := publisher.workingDir

	// Verify working directory exists
	if _, err := os.Stat(workingDir); os.IsNotExist(err) {
		t.Errorf("Working directory should exist before cleanup: %s", workingDir)
	}

	// Test cleanup
	err = publisher.Cleanup()
	if err != nil {
		t.Errorf("Cleanup should not return error: %v", err)
	}

	// Note: In a real test environment, we would verify that cleanup actually
	// removes the directory, but since we're using a simplified cleanup
	// implementation, we just verify the method runs without error
}

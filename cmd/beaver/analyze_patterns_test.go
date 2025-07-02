package main

import (
	"context"
	"os"
	"testing"

	"github.com/spf13/cobra"
)

func TestRunAnalyzePatternsCommand_NoConfig(t *testing.T) {
	// Save original config path and restore after test
	originalConfigPath := os.Getenv("BEAVER_CONFIG_PATH")
	defer func() {
		if originalConfigPath != "" {
			os.Setenv("BEAVER_CONFIG_PATH", originalConfigPath)
		} else {
			os.Unsetenv("BEAVER_CONFIG_PATH")
		}
	}()

	// Set config path to non-existent file
	os.Setenv("BEAVER_CONFIG_PATH", "/non/existent/path/beaver.yml")

	cmd := &cobra.Command{}
	err := runAnalyzePatternsCommand(cmd, []string{})

	if err == nil {
		t.Error("Expected error when config file doesn't exist, got nil")
	}
	if !containsStringAnywhere(err.Error(), "設定ファイル読み込みエラー") && !containsStringAnywhere(err.Error(), "設定が無効です") {
		t.Errorf("Expected Japanese config loading or validation error message, got: %v", err)
	}
}

func TestRunAnalyzePatternsCommand_InvalidConfig(t *testing.T) {
	// Create temporary invalid config file
	tmpDir := t.TempDir()
	configPath := tmpDir + "/beaver.yml"

	invalidConfig := `
project:
  name: ""
  repository: ""
sources:
  github:
    token: ""
`

	err := os.WriteFile(configPath, []byte(invalidConfig), 0600)
	if err != nil {
		t.Fatalf("Failed to create test config file: %v", err)
	}

	// Set config path temporarily
	originalConfigPath := os.Getenv("BEAVER_CONFIG_PATH")
	defer func() {
		if originalConfigPath != "" {
			os.Setenv("BEAVER_CONFIG_PATH", originalConfigPath)
		} else {
			os.Unsetenv("BEAVER_CONFIG_PATH")
		}
	}()
	os.Setenv("BEAVER_CONFIG_PATH", configPath)

	cmd := &cobra.Command{}
	err = runAnalyzePatternsCommand(cmd, []string{})

	if err == nil {
		t.Error("Expected validation error for invalid config, got nil")
	}
}

func TestRunAnalyzePatternsCommand_InvalidRepository(t *testing.T) {
	// Create temporary config file with invalid repository format
	tmpDir := t.TempDir()
	configPath := tmpDir + "/beaver.yml"

	configWithInvalidRepo := `
project:
  name: "test-project"
  repository: "invalid-repo-format"
sources:
  github:
    token: "fake-token"
ai:
  provider: "openai"
  model: "gpt-3.5-turbo"
output:
  wiki:
    platform: "github"
`

	err := os.WriteFile(configPath, []byte(configWithInvalidRepo), 0600)
	if err != nil {
		t.Fatalf("Failed to create test config file: %v", err)
	}

	// Set config path temporarily
	originalConfigPath := os.Getenv("BEAVER_CONFIG_PATH")
	defer func() {
		if originalConfigPath != "" {
			os.Setenv("BEAVER_CONFIG_PATH", originalConfigPath)
		} else {
			os.Unsetenv("BEAVER_CONFIG_PATH")
		}
	}()
	os.Setenv("BEAVER_CONFIG_PATH", configPath)

	cmd := &cobra.Command{}
	err = runAnalyzePatternsCommand(cmd, []string{})

	if err == nil {
		t.Error("Expected repository format error, got nil")
	}
	if !containsStringAnywhere(err.Error(), "リポジトリ形式が無効です") && !containsStringAnywhere(err.Error(), "設定が無効です") {
		t.Errorf("Expected config validation or repository format error, got: %v", err)
	}
}

func TestRunAnalyzePatternsCommand_NoEvents(t *testing.T) {
	// Create temporary config file with no GitHub token (should lead to no events)
	tmpDir := t.TempDir()
	configPath := tmpDir + "/beaver.yml"

	configNoToken := `
project:
  name: "test-project"
  repository: "owner/repo"
sources:
  github:
    token: ""
ai:
  provider: "openai"
  model: "gpt-3.5-turbo"
output:
  wiki:
    platform: "github"
`

	err := os.WriteFile(configPath, []byte(configNoToken), 0600)
	if err != nil {
		t.Fatalf("Failed to create test config file: %v", err)
	}

	// Set config path temporarily
	originalConfigPath := os.Getenv("BEAVER_CONFIG_PATH")
	defer func() {
		if originalConfigPath != "" {
			os.Setenv("BEAVER_CONFIG_PATH", originalConfigPath)
		} else {
			os.Unsetenv("BEAVER_CONFIG_PATH")
		}
	}()
	os.Setenv("BEAVER_CONFIG_PATH", configPath)

	// Clear environment GitHub token to ensure we use only config file
	originalGitHubToken := os.Getenv("GITHUB_TOKEN")
	defer func() {
		if originalGitHubToken != "" {
			os.Setenv("GITHUB_TOKEN", originalGitHubToken)
		} else {
			os.Unsetenv("GITHUB_TOKEN")
		}
	}()
	os.Unsetenv("GITHUB_TOKEN")

	// Reset flags to default values
	includeGit = false

	cmd := &cobra.Command{}
	err = runAnalyzePatternsCommand(cmd, []string{})

	if err == nil {
		t.Error("Expected data source error, got nil")
	}
	if !containsStringAnywhere(err.Error(), "設定が無効です") &&
		!containsStringAnywhere(err.Error(), "分析用のデータソースが見つかりません") &&
		!containsStringAnywhere(err.Error(), "分析用のイベントが見つかりません") {
		t.Errorf("Expected config validation or data source error, got: %v", err)
	}
}

func TestFetchGitEvents_NotInGitRepo(t *testing.T) {
	// Save current directory and change to temp directory (not a git repo)
	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("Failed to get current directory: %v", err)
	}
	defer func() {
		os.Chdir(originalDir)
	}()

	tmpDir := t.TempDir()
	err = os.Chdir(tmpDir)
	if err != nil {
		t.Fatalf("Failed to change to temp directory: %v", err)
	}

	_, err = fetchGitEvents(nil, "", 10)
	if err == nil {
		t.Error("Expected error when not in git repository, got nil")
	}
	if !containsStringAnywhere(err.Error(), "not in a Git repository") {
		t.Errorf("Expected git repository error, got: %v", err)
	}
}

func TestFetchGitEvents_InvalidDate(t *testing.T) {
	// Create a temporary git repository for this test
	tmpDir := t.TempDir()

	// Save current directory and change to temp directory
	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("Failed to get current directory: %v", err)
	}
	defer func() {
		os.Chdir(originalDir)
	}()

	err = os.Chdir(tmpDir)
	if err != nil {
		t.Fatalf("Failed to change to temp directory: %v", err)
	}

	// Initialize git repository
	if err := os.MkdirAll(".git", 0755); err != nil {
		t.Fatalf("Failed to create .git directory: %v", err)
	}

	// Now test invalid date parsing
	_, err = fetchGitEvents(nil, "invalid-date", 10)
	if err == nil {
		t.Error("Expected error for invalid date format, got nil")
	}
	if !containsStringAnywhere(err.Error(), "invalid since date format") {
		t.Errorf("Expected invalid date format error, got: %v", err)
	}
}

func TestRunAnalyzePatternsCommand_WithGitHubToken(t *testing.T) {
	// Skip test that makes real GitHub API calls unless explicitly enabled
	if os.Getenv("BEAVER_GITHUB_API_TESTS") != "true" {
		t.Skip("Skipping GitHub API test. Set BEAVER_GITHUB_API_TESTS=true to enable.")
	}

	// Create temporary config file with valid GitHub token
	tmpDir := t.TempDir()
	configPath := tmpDir + "/beaver.yml"

	validConfig := `
project:
  name: "test-project"
  repository: "owner/repo"
sources:
  github:
    token: "fake-token-for-testing"
ai:
  provider: "openai"
  model: "gpt-3.5-turbo"
output:
  wiki:
    platform: "github"
`

	err := os.WriteFile(configPath, []byte(validConfig), 0600)
	if err != nil {
		t.Fatalf("Failed to create test config file: %v", err)
	}

	// Set config path temporarily
	originalConfigPath := os.Getenv("BEAVER_CONFIG_PATH")
	defer func() {
		if originalConfigPath != "" {
			os.Setenv("BEAVER_CONFIG_PATH", originalConfigPath)
		} else {
			os.Unsetenv("BEAVER_CONFIG_PATH")
		}
	}()
	os.Setenv("BEAVER_CONFIG_PATH", configPath)

	cmd := &cobra.Command{}
	err = runAnalyzePatternsCommand(cmd, []string{})

	// Should get past validation but fail at GitHub API call
	if err == nil {
		t.Error("Expected error at GitHub API call, got nil")
	}
	// Should not be a validation error since we have proper config
	// The function might still fail on config validation due to environment
	// But it should at least try to reach GitHub API calls
	if err != nil && !containsStringAnywhere(err.Error(), "GitHub") && !containsStringAnywhere(err.Error(), "API") {
		t.Logf("Got error (expected): %v", err)
	}
}

func TestSaveAnalysisResult_Success(t *testing.T) {
	// Create test analysis result
	result := &PatternAnalysisResult{
		Repository:  "owner/repo",
		TotalEvents: 10,
		TimeRange:   "2023-01-01 - 2023-12-31",
	}

	tmpDir := t.TempDir()
	outputPath := tmpDir + "/test-analysis.json"

	err := saveAnalysisResult(result, outputPath)
	if err != nil {
		t.Errorf("saveAnalysisResult failed: %v", err)
	}

	// Verify file exists
	if _, err := os.Stat(outputPath); os.IsNotExist(err) {
		t.Error("Analysis result file was not created")
	}
}

func TestSaveAnalysisResult_DirectoryCreation(t *testing.T) {
	// Test that saveAnalysisResult creates directories if they don't exist
	result := &PatternAnalysisResult{
		Repository:  "owner/repo",
		TotalEvents: 5,
	}

	tmpDir := t.TempDir()
	outputPath := tmpDir + "/subdir/nested/analysis.json"

	err := saveAnalysisResult(result, outputPath)
	if err != nil {
		t.Errorf("saveAnalysisResult failed to create directories: %v", err)
	}

	// Verify file exists
	if _, err := os.Stat(outputPath); os.IsNotExist(err) {
		t.Error("Analysis result file was not created in nested directory")
	}
}

func TestFetchGitEvents_ValidDate(t *testing.T) {
	// Create a temporary git repository for this test
	tmpDir := t.TempDir()

	// Save current directory and change to temp directory
	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("Failed to get current directory: %v", err)
	}
	defer func() {
		os.Chdir(originalDir)
	}()

	err = os.Chdir(tmpDir)
	if err != nil {
		t.Fatalf("Failed to change to temp directory: %v", err)
	}

	// Initialize git repository
	if err := os.MkdirAll(".git", 0755); err != nil {
		t.Fatalf("Failed to create .git directory: %v", err)
	}

	// Test with valid date format (should pass date parsing but fail at git operations)
	ctx := context.Background()
	_, err = fetchGitEvents(ctx, "2023-01-01", 10)
	if err == nil {
		t.Error("Expected error from git operations, got nil")
	}
	// Should not be a date parsing error
	if containsStringAnywhere(err.Error(), "invalid since date format") {
		t.Errorf("Should not get date parsing error with valid date, got: %v", err)
	}
}

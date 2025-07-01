package main

import (
	"os"
	"testing"

	"github.com/spf13/cobra"
)

func TestRunBuildCommand_NoConfig(t *testing.T) {
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
	err := runBuildCommand(cmd, []string{})

	if err == nil {
		t.Error("Expected error when config file doesn't exist, got nil")
	}
	if !containsJapanese(err.Error(), "設定が無効です") && !containsJapanese(err.Error(), "GitHub token") && !containsJapanese(err.Error(), "設定ファイル読み込みエラー") {
		t.Errorf("Expected config validation or loading error message, got: %v", err)
	}
}

func TestRunBuildCommand_InvalidConfig(t *testing.T) {
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
	err = runBuildCommand(cmd, []string{})

	if err == nil {
		t.Error("Expected validation error for invalid config, got nil")
	}
}

func TestRunBuildCommand_NoRepository(t *testing.T) {
	// Create temporary config file with missing repository
	tmpDir := t.TempDir()
	configPath := tmpDir + "/beaver.yml"

	configWithoutRepo := `
project:
  name: "test-project"
  repository: ""
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

	err := os.WriteFile(configPath, []byte(configWithoutRepo), 0600)
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
	err = runBuildCommand(cmd, []string{})

	if err == nil {
		t.Error("Expected repository error, got nil")
	}
	if !containsJapanese(err.Error(), "設定が無効です") && !containsJapanese(err.Error(), "GitHub token") {
		t.Errorf("Expected config validation error (GitHub token check comes first), got: %v", err)
	}
}

func TestRunBuildCommand_NoGitHubToken(t *testing.T) {
	// Create temporary config file with missing GitHub token
	tmpDir := t.TempDir()
	configPath := tmpDir + "/beaver.yml"

	configWithoutToken := `
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

	err := os.WriteFile(configPath, []byte(configWithoutToken), 0600)
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
	err = runBuildCommand(cmd, []string{})

	if err == nil {
		t.Error("Expected GitHub token error, got nil")
	}
	// Check if error is related to configuration validation or repository access
	if !containsStringAnywhere(err.Error(), "GitHub token") &&
		!containsStringAnywhere(err.Error(), "project.repository") &&
		!containsStringAnywhere(err.Error(), "Issues取得エラー") &&
		!containsStringAnywhere(err.Error(), "REPOSITORY_ERROR") {
		t.Errorf("Expected GitHub token, repository configuration, or repository access error, got: %v", err)
	}
}

// TestParseOwnerRepo is already tested in utils_test.go
// TestSplitString is already tested in utils_test.go

func TestRunInitCommand_ConfigExists(t *testing.T) {
	// Create temporary config file
	tmpDir := t.TempDir()
	configPath := tmpDir + "/beaver.yml"

	existingConfig := `
project:
  name: "existing-project"
  repository: "owner/repo"
`

	err := os.WriteFile(configPath, []byte(existingConfig), 0600)
	if err != nil {
		t.Fatalf("Failed to create test config file: %v", err)
	}

	// Change to temp directory to prevent file creation in current directory
	originalWd, err := os.Getwd()
	if err != nil {
		t.Fatalf("Failed to get current working directory: %v", err)
	}
	defer func() { _ = os.Chdir(originalWd) }()

	err = os.Chdir(tmpDir)
	if err != nil {
		t.Fatalf("Failed to change to temp directory: %v", err)
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
	// Should not panic and should detect existing config
	runInitCommand(cmd, []string{})
	// This test mainly checks that the function doesn't crash
}

func TestRunBuildCommand_WithValidConfigButInvalidRepo(t *testing.T) {
	// Create temporary config file with invalid repository format
	tmpDir := t.TempDir()
	configPath := tmpDir + "/beaver.yml"

	invalidRepoConfig := `
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

	err := os.WriteFile(configPath, []byte(invalidRepoConfig), 0600)
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
	err = runBuildCommand(cmd, []string{})

	if err == nil {
		t.Error("Expected repository format error, got nil")
	}
	// Either repository format validation or GitHub token validation can happen first
	if !containsStringAnywhere(err.Error(), "GitHub token") && !containsStringAnywhere(err.Error(), "リポジトリ形式が無効です") {
		t.Errorf("Expected GitHub token or repository format error, got: %v", err)
	}
}

func TestRunBuildCommand_WithPlaceholderRepo(t *testing.T) {
	// Create temporary config file with placeholder repository
	tmpDir := t.TempDir()
	configPath := tmpDir + "/beaver.yml"

	placeholderConfig := `
project:
  name: "test-project"
  repository: "username/my-repo"
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

	err := os.WriteFile(configPath, []byte(placeholderConfig), 0600)
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
	err = runBuildCommand(cmd, []string{})

	if err == nil {
		t.Error("Expected repository not configured error, got nil")
	}
	// Either GitHub token validation or repository validation can happen first
	if !containsStringAnywhere(err.Error(), "GitHub token") && !containsStringAnywhere(err.Error(), "Repository not configured") && !containsStringAnywhere(err.Error(), "リポジトリが設定されていません") {
		t.Errorf("Expected GitHub token or repository error, got: %v", err)
	}
}

func TestRunBuildCommand_IncrementalFlag(t *testing.T) {
	// Test that incremental flag is properly handled
	originalIncremental := incrementalBuild
	defer func() { incrementalBuild = originalIncremental }()

	incrementalBuild = true

	// Create temporary config with all required fields but invalid GitHub token
	tmpDir := t.TempDir()
	configPath := tmpDir + "/beaver.yml"

	validConfig := `
project:
  name: "test-project"
  repository: "owner/repo"
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
	err = runBuildCommand(cmd, []string{})

	// Should fail at GitHub connection test, not at validation
	if err == nil {
		t.Error("Expected GitHub connection error, got nil")
	}
	// Either GitHub token validation or other errors can happen first
	if !containsStringAnywhere(err.Error(), "GitHub token") &&
		!containsStringAnywhere(err.Error(), "GitHub接続エラー") &&
		!containsStringAnywhere(err.Error(), "Issues取得エラー") &&
		!containsStringAnywhere(err.Error(), "REPOSITORY_ERROR") {
		t.Errorf("Expected GitHub token, connection, or repository access error, got: %v", err)
	}
}

// TestMainLogic is already tested in main_execution_test.go

// Helper function to check if error message contains Japanese text
func containsJapanese(str, substr string) bool {
	return containsStringAnywhere(str, substr)
}

func containsStringAnywhere(str, substr string) bool {
	if len(substr) == 0 {
		return true
	}
	if len(str) < len(substr) {
		return false
	}

	for i := 0; i <= len(str)-len(substr); i++ {
		if str[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

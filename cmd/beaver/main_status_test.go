package main

import (
	"os"
	"testing"

	"github.com/spf13/cobra"
)

func TestRunStatusCommand_NoConfig(t *testing.T) {
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
	// runStatusCommand doesn't return error, it just prints
	runStatusCommand(cmd, []string{})
	// This test mainly checks that the function doesn't crash
}

func TestRunStatusCommand_WithValidConfig(t *testing.T) {
	// Create temporary config file
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
	// runStatusCommand doesn't return error, it just prints status information
	runStatusCommand(cmd, []string{})
	// This test mainly checks that the function doesn't crash with valid config
}

func TestRunStatusCommand_WithInvalidConfig(t *testing.T) {
	// Create temporary invalid config file
	tmpDir := t.TempDir()
	configPath := tmpDir + "/beaver.yml"

	invalidConfig := `
invalid yaml content that cannot be parsed
  - this is not valid yaml
    nested incorrectly
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
	// runStatusCommand doesn't return error, it handles errors internally
	runStatusCommand(cmd, []string{})
	// This test mainly checks that the function doesn't crash with invalid config
}

func TestRunStatusCommand_ConfigExistsButInvalid(t *testing.T) {
	// Create temporary config file with valid YAML but invalid content
	tmpDir := t.TempDir()
	configPath := tmpDir + "/beaver.yml"

	configMissingRequired := `
project:
  name: ""  # Missing required fields
sources:
  github:
    token: ""
`

	err := os.WriteFile(configPath, []byte(configMissingRequired), 0600)
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
	runStatusCommand(cmd, []string{})
	// This test checks that status command handles config validation errors gracefully
}

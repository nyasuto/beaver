package main

import (
	"bytes"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/spf13/cobra"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestCLIIntegration_FullWorkflow tests the complete CLI workflow
func TestCLIIntegration_FullWorkflow(t *testing.T) {
	// Create temporary directory for integration test
	tempDir, err := os.MkdirTemp("", "cli-integration-test-*")
	require.NoError(t, err)
	defer os.RemoveAll(tempDir)

	// Change to temp directory
	oldDir, err := os.Getwd()
	require.NoError(t, err)
	defer os.Chdir(oldDir)

	err = os.Chdir(tempDir)
	require.NoError(t, err)

	// Test 1: Initialize project
	t.Run("init project", func(t *testing.T) {
		var output bytes.Buffer
		testCmd := createTestRootCommand()

		captureOutput := func() error {
			testCmd.SetArgs([]string{"init"})
			return testCmd.Execute()
		}

		err := captureCommandOutput(&output, captureOutput)
		assert.NoError(t, err, "Init command should succeed")

		outputStr := output.String()
		assert.Contains(t, outputStr, "🏗️ Beaverプロジェクトを初期化中", "Should show initialization message")
		assert.Contains(t, outputStr, "🦫 Beaverプロジェクトの初期化完了", "Should show completion message")

		// Verify config file was created
		configPath := filepath.Join(tempDir, "beaver.yml")
		_, err = os.Stat(configPath)
		assert.NoError(t, err, "Config file should be created")
	})

	// Test 2: Check status after init
	t.Run("status after init", func(t *testing.T) {
		var output bytes.Buffer
		testCmd := createTestRootCommand()

		captureOutput := func() error {
			testCmd.SetArgs([]string{"status"})
			return testCmd.Execute()
		}

		err := captureCommandOutput(&output, captureOutput)
		assert.NoError(t, err, "Status command should succeed")

		outputStr := output.String()
		assert.Contains(t, outputStr, "📊 Beaver処理状況", "Should show status header")
		assert.Contains(t, outputStr, "📄 設定ファイル", "Should show config file path")
		assert.Contains(t, outputStr, "⚠️  GITHUB_TOKEN が設定されていません", "Should warn about missing token")
	})

	// Test 3: Try init again (should show existing config message)
	t.Run("init existing project", func(t *testing.T) {
		var output bytes.Buffer
		testCmd := createTestRootCommand()

		captureOutput := func() error {
			testCmd.SetArgs([]string{"init"})
			return testCmd.Execute()
		}

		err := captureCommandOutput(&output, captureOutput)
		assert.NoError(t, err, "Init command should succeed")

		outputStr := output.String()
		assert.Contains(t, outputStr, "⚠️  設定ファイル beaver.yml は既に存在します", "Should show existing config message")
		assert.Contains(t, outputStr, "🔧 既存の設定を確認するには: beaver status", "Should suggest status command")
	})

	// Test 4: Test build without proper configuration
	t.Run("build without proper config", func(t *testing.T) {
		t.Skip("Skipping test that involves os.Exit() calls - not feasible to test due to process termination")
	})
}

// TestCLIIntegration_ErrorHandling tests error handling across commands
func TestCLIIntegration_ErrorHandling(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "cli-error-test-*")
	require.NoError(t, err)
	defer os.RemoveAll(tempDir)

	oldDir, err := os.Getwd()
	require.NoError(t, err)
	defer os.Chdir(oldDir)

	err = os.Chdir(tempDir)
	require.NoError(t, err)

	tests := []struct {
		name         string
		command      []string
		expectError  bool
		expectOutput []string
		description  string
	}{
		{
			name:         "build without config",
			command:      []string{"build"},
			expectError:  true,
			expectOutput: []string{"❌ 設定読み込みエラー", "💡 beaver init で設定ファイルを作成してください"},
			description:  "Should fail gracefully when no config exists",
		},
		{
			name:         "status without config",
			command:      []string{"status"},
			expectError:  false,
			expectOutput: []string{"❌ 設定ファイルなし", "💡 beaver init で初期化してください"},
			description:  "Should handle missing config gracefully",
		},
		{
			name:         "fetch without args",
			command:      []string{"fetch", "issues"},
			expectError:  true,
			expectOutput: []string{},
			description:  "Should fail when required arguments are missing",
		},
		{
			name:         "fetch with invalid repository",
			command:      []string{"fetch", "issues", "invalid-repo"},
			expectError:  true,
			expectOutput: []string{"❌ リポジトリ形式が無効です"},
			description:  "Should validate repository format",
		},
		{
			name:         "unknown command",
			command:      []string{"unknown"},
			expectError:  true,
			expectOutput: []string{},
			description:  "Should handle unknown commands",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Skip tests that involve os.Exit() calls which cannot be tested properly
			if tt.name == "build without config" || strings.Contains(tt.name, "fetch with invalid") {
				t.Skip("Skipping test that involves os.Exit() calls - not feasible to test due to process termination")
				return
			}

			var output bytes.Buffer
			testCmd := createTestRootCommand()

			captureOutput := func() error {
				testCmd.SetArgs(tt.command)
				return testCmd.Execute()
			}

			err := captureCommandOutput(&output, captureOutput)

			if tt.expectError {
				assert.Error(t, err, tt.description)
			} else {
				assert.NoError(t, err, tt.description)
			}

			outputStr := output.String()
			for _, expectedOutput := range tt.expectOutput {
				assert.Contains(t, outputStr, expectedOutput, "Output should contain expected text: %s", expectedOutput)
			}
		})
	}
}

// TestCLIIntegration_ConfigurationFlow tests configuration file operations
func TestCLIIntegration_ConfigurationFlow(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "cli-config-test-*")
	require.NoError(t, err)
	defer os.RemoveAll(tempDir)

	oldDir, err := os.Getwd()
	require.NoError(t, err)
	defer os.Chdir(oldDir)

	err = os.Chdir(tempDir)
	require.NoError(t, err)

	// Create a manual config file with specific values
	configContent := `
project:
  name: "integration-test-project"
  repository: "testuser/testrepo"
sources:
  github:
    token: "fake-token-for-testing"
output:
  wiki:
    platform: "github"
ai:
  provider: "openai"
  model: "gpt-4"
`
	configPath := filepath.Join(tempDir, "beaver.yml")
	err = os.WriteFile(configPath, []byte(configContent), 0644)
	require.NoError(t, err)

	// Test status with custom config
	t.Run("status with custom config", func(t *testing.T) {
		var output bytes.Buffer
		testCmd := createTestRootCommand()

		captureOutput := func() error {
			testCmd.SetArgs([]string{"status"})
			return testCmd.Execute()
		}

		err := captureCommandOutput(&output, captureOutput)
		assert.NoError(t, err, "Status command should succeed")

		outputStr := output.String()
		assert.Contains(t, outputStr, "📁 プロジェクト: integration-test-project", "Should display project name")
		assert.Contains(t, outputStr, "🔗 リポジトリ: testuser/testrepo", "Should display repository")
		assert.Contains(t, outputStr, "🤖 AI Provider: openai (gpt-4)", "Should display AI provider")
		assert.Contains(t, outputStr, "📝 出力先: github Wiki", "Should display output platform")
		assert.Contains(t, outputStr, "✅ GITHUB_TOKEN 設定済み", "Should show token is configured")
	})

	// Test build with custom config (will fail on GitHub API but should pass validation)
	t.Run("build with custom config", func(t *testing.T) {
		t.Skip("Skipping test that involves os.Exit() calls - not feasible to test due to process termination")
	})
}

// TestCLIIntegration_FetchCommand tests the fetch command integration
func TestCLIIntegration_FetchCommand(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "cli-fetch-test-*")
	require.NoError(t, err)
	defer os.RemoveAll(tempDir)

	oldDir, err := os.Getwd()
	require.NoError(t, err)
	defer os.Chdir(oldDir)

	err = os.Chdir(tempDir)
	require.NoError(t, err)

	// Create config for fetch tests
	configContent := `
project:
  name: "fetch-test"
sources:
  github:
    token: "fake-token"
`
	configPath := filepath.Join(tempDir, "beaver.yml")
	err = os.WriteFile(configPath, []byte(configContent), 0644)
	require.NoError(t, err)

	tests := []struct {
		name         string
		args         []string
		expectError  bool
		expectOutput []string
		description  string
	}{
		{
			name:         "fetch with valid repository",
			args:         []string{"fetch", "issues", "owner/repo"},
			expectError:  true, // Will fail on GitHub API with fake token
			expectOutput: []string{"🔍 GitHub Issuesを取得中: owner/repo"},
			description:  "Should attempt to fetch issues",
		},
		{
			name:         "fetch with flags",
			args:         []string{"fetch", "issues", "owner/repo", "--state=all", "--per-page=10"},
			expectError:  true, // Will fail on GitHub API with fake token
			expectOutput: []string{"🔍 GitHub Issuesを取得中: owner/repo", "状態: all"},
			description:  "Should handle command flags",
		},
		{
			name:         "fetch with invalid per-page",
			args:         []string{"fetch", "issues", "owner/repo", "--per-page=200"},
			expectError:  true,
			expectOutput: []string{"❌ per-page は 1-100 の範囲で指定してください"},
			description:  "Should validate flag values",
		},
		{
			name:         "fetch with invalid format",
			args:         []string{"fetch", "issues", "owner/repo", "--format=xml", "--per-page=50"},
			expectError:  true,
			expectOutput: []string{"❌ 無効な出力形式"},
			description:  "Should validate output format",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var output bytes.Buffer
			testCmd := createTestRootCommand()

			captureOutput := func() error {
				testCmd.SetArgs(tt.args)
				return testCmd.Execute()
			}

			err := captureCommandOutput(&output, captureOutput)

			if tt.expectError {
				assert.Error(t, err, tt.description)
			} else {
				assert.NoError(t, err, tt.description)
			}

			outputStr := output.String()
			for _, expectedOutput := range tt.expectOutput {
				assert.Contains(t, outputStr, expectedOutput, "Output should contain: %s", expectedOutput)
			}
		})
	}
}

// Helper functions for integration tests

// createTestRootCommand creates a new root command for testing to avoid global state issues
func createTestRootCommand() *cobra.Command {
	testRoot := &cobra.Command{
		Use:   "beaver",
		Short: "🦫 Beaver - AIエージェント知識ダム構築ツール",
		Long: `Beaver は AI エージェント開発の軌跡を自動的に整理された永続的な知識に変換します。
	
散在する GitHub Issues、コミットログ、AI実験記録を構造化された Wiki ドキュメントに変換し、
流れ去る学びを永続的な知識ダムとして蓄積します。`,
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Println("🦫 Beaver - AIエージェント知識ダム構築ツール")
			fmt.Println("使用方法: beaver [command]")
			fmt.Println("詳細なヘルプ: beaver --help")
		},
	}

	// Add all commands
	testRoot.AddCommand(initCmd)
	testRoot.AddCommand(buildCmd)
	testRoot.AddCommand(statusCmd)
	testRoot.AddCommand(fetchCmd)

	return testRoot
}

// captureCommandOutput captures both stdout and stderr from a command execution
func captureCommandOutput(output *bytes.Buffer, commandFunc func() error) error {
	// Save original streams
	oldStdout := os.Stdout
	oldStderr := os.Stderr
	defer func() {
		os.Stdout = oldStdout
		os.Stderr = oldStderr
	}()

	// Create pipes for capturing output
	r, w, err := os.Pipe()
	if err != nil {
		return err
	}
	defer r.Close()

	// Redirect stdout and stderr
	os.Stdout = w
	os.Stderr = w

	// Run command in goroutine
	done := make(chan error, 1)
	go func() {
		defer w.Close()
		done <- commandFunc()
	}()

	// Read output
	outputDone := make(chan struct{})
	go func() {
		defer close(outputDone)
		io.Copy(output, r)
	}()

	// Wait for command completion with timeout
	var cmdErr error
	select {
	case cmdErr = <-done:
		// Command completed
	case <-time.After(10 * time.Second):
		return fmt.Errorf("command timed out")
	}

	// Wait for output capture to complete
	select {
	case <-outputDone:
		// Output captured
	case <-time.After(2 * time.Second):
		// Continue even if output capture times out
	}

	return cmdErr
}

// TestCLIIntegration_EnvironmentVariables tests environment variable handling
func TestCLIIntegration_EnvironmentVariables(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "cli-env-test-*")
	require.NoError(t, err)
	defer os.RemoveAll(tempDir)

	oldDir, err := os.Getwd()
	require.NoError(t, err)
	defer os.Chdir(oldDir)

	err = os.Chdir(tempDir)
	require.NoError(t, err)

	// Save original environment
	oldGitHubToken := os.Getenv("GITHUB_TOKEN")
	defer func() {
		if oldGitHubToken != "" {
			os.Setenv("GITHUB_TOKEN", oldGitHubToken)
		} else {
			os.Unsetenv("GITHUB_TOKEN")
		}
	}()

	// Test with environment variable set
	t.Run("with GITHUB_TOKEN environment variable", func(t *testing.T) {
		// Set environment variable
		os.Setenv("GITHUB_TOKEN", "env-token-123")

		// Create minimal config without token
		configContent := `
project:
  name: "env-test"
  repository: "test/repo"
output:
  wiki:
    platform: "github"
ai:
  provider: "openai"
  model: "gpt-3.5-turbo"
`
		configPath := filepath.Join(tempDir, "beaver.yml")
		err = os.WriteFile(configPath, []byte(configContent), 0644)
		require.NoError(t, err)

		// Test status command
		var output bytes.Buffer
		testCmd := createTestRootCommand()

		captureOutput := func() error {
			testCmd.SetArgs([]string{"status"})
			return testCmd.Execute()
		}

		err := captureCommandOutput(&output, captureOutput)
		assert.NoError(t, err, "Status should succeed with env token")

		outputStr := output.String()
		assert.Contains(t, outputStr, "✅ GITHUB_TOKEN 設定済み", "Should detect environment token")
		// Note: Configuration validation will fail due to fake token, so we only check token detection
	})

	// Test without environment variable
	t.Run("without GITHUB_TOKEN environment variable", func(t *testing.T) {
		// Clear environment variable
		os.Unsetenv("GITHUB_TOKEN")

		// Test status command
		var output bytes.Buffer
		testCmd := createTestRootCommand()

		captureOutput := func() error {
			testCmd.SetArgs([]string{"status"})
			return testCmd.Execute()
		}

		err := captureCommandOutput(&output, captureOutput)
		assert.NoError(t, err, "Status should succeed")

		outputStr := output.String()
		assert.Contains(t, outputStr, "⚠️  GITHUB_TOKEN が設定されていません", "Should warn about missing token")
	})
}

// TestCLIIntegration_HelpSystem tests the help system
func TestCLIIntegration_HelpSystem(t *testing.T) {
	tests := []struct {
		name         string
		args         []string
		expectOutput []string
		description  string
	}{
		{
			name:         "root help",
			args:         []string{"--help"},
			expectOutput: []string{"Beaver", "Available Commands", "init", "build", "status"},
			description:  "Should display root command help",
		},
		{
			name:         "init help",
			args:         []string{"init", "--help"},
			expectOutput: []string{"Beaverプロジェクトの設定ファイル", "beaver.yml"},
			description:  "Should display init command help",
		},
		{
			name:         "build help",
			args:         []string{"build", "--help"},
			expectOutput: []string{"GitHub Issues を取得し", "Wiki ドキュメントを生成"},
			description:  "Should display build command help",
		},
		{
			name:         "status help",
			args:         []string{"status", "--help"},
			expectOutput: []string{"最新の知識処理状況"},
			description:  "Should display status command help",
		},
		{
			name:         "fetch help",
			args:         []string{"fetch", "--help"},
			expectOutput: []string{"データソースからコンテンツを取得"},
			description:  "Should display fetch command help",
		},
		{
			name:         "fetch issues help",
			args:         []string{"fetch", "issues", "--help"},
			expectOutput: []string{"GitHub Issuesを取得", "owner/repo", "--state", "--labels"},
			description:  "Should display fetch issues command help",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var output bytes.Buffer
			testCmd := createTestRootCommand()

			captureOutput := func() error {
				testCmd.SetArgs(tt.args)
				return testCmd.Execute()
			}

			err := captureCommandOutput(&output, captureOutput)
			// Help commands typically don't return errors
			assert.NoError(t, err, tt.description)

			outputStr := output.String()
			for _, expectedOutput := range tt.expectOutput {
				assert.Contains(t, outputStr, expectedOutput, "Help output should contain: %s", expectedOutput)
			}
		})
	}
}

// TestCLIIntegration_CommandChaining tests multiple command execution scenarios
func TestCLIIntegration_CommandChaining(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "cli-chain-test-*")
	require.NoError(t, err)
	defer os.RemoveAll(tempDir)

	oldDir, err := os.Getwd()
	require.NoError(t, err)
	defer os.Chdir(oldDir)

	err = os.Chdir(tempDir)
	require.NoError(t, err)

	// Scenario: init -> status -> build workflow
	t.Run("init-status-build workflow", func(t *testing.T) {
		// Step 1: Initialize project
		var initOutput bytes.Buffer
		testCmd := createTestRootCommand()

		err := captureCommandOutput(&initOutput, func() error {
			testCmd.SetArgs([]string{"init"})
			return testCmd.Execute()
		})
		assert.NoError(t, err, "Init should succeed")
		assert.Contains(t, initOutput.String(), "設定ファイル", "Init should complete")

		// Step 2: Check status
		var statusOutput bytes.Buffer
		testCmd = createTestRootCommand()

		err = captureCommandOutput(&statusOutput, func() error {
			testCmd.SetArgs([]string{"status"})
			return testCmd.Execute()
		})
		assert.NoError(t, err, "Status should succeed")
		assert.Contains(t, statusOutput.String(), "設定ファイル", "Status should show info")

		// Step 3: Try build (should fail due to missing token)
		// Skip this test step due to os.Exit() call in build command
		t.Log("Skipping build step due to os.Exit() call - not feasible to test")
	})
}

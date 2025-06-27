package main

import (
	"bytes"
	"io"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/nyasuto/beaver/internal/config"
	"github.com/spf13/cobra"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestInitCommand tests the init command functionality
func TestInitCommand(t *testing.T) {
	tests := []struct {
		name           string
		existingConfig bool
		expectSuccess  bool
		expectOutput   []string
		description    string
	}{
		{
			name:           "init new project",
			existingConfig: false,
			expectSuccess:  true,
			expectOutput:   []string{"🏗️ Beaverプロジェクトを初期化中", "🦫 Beaverプロジェクトの初期化完了"},
			description:    "Should successfully initialize new project",
		},
		{
			name:           "init existing project",
			existingConfig: true,
			expectSuccess:  true,
			expectOutput:   []string{"⚠️  設定ファイル beaver.yml は既に存在します", "🔧 既存の設定を確認するには"},
			description:    "Should handle existing configuration gracefully",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create temporary directory for test
			tempDir, err := os.MkdirTemp("", "beaver-init-test-*")
			require.NoError(t, err)
			defer os.RemoveAll(tempDir)

			// Change to temp directory
			oldDir, err := os.Getwd()
			require.NoError(t, err)
			defer os.Chdir(oldDir)

			err = os.Chdir(tempDir)
			require.NoError(t, err)

			// Create existing config if needed
			if tt.existingConfig {
				configPath := filepath.Join(tempDir, "beaver.yml")
				err = os.WriteFile(configPath, []byte("# Existing config"), 0644)
				require.NoError(t, err)
			}

			// Capture output
			var output bytes.Buffer
			oldStdout := os.Stdout
			oldStderr := os.Stderr
			defer func() {
				os.Stdout = oldStdout
				os.Stderr = oldStderr
			}()

			// Create pipes to capture output
			r, w, err := os.Pipe()
			require.NoError(t, err)
			defer r.Close()

			os.Stdout = w
			os.Stderr = w

			// Create new root command for testing
			testCmd := &cobra.Command{
				Use: "beaver-test",
			}
			testCmd.AddCommand(initCmd)

			// Run command in goroutine to capture output
			done := make(chan error, 1)
			go func() {
				defer w.Close()
				testCmd.SetArgs([]string{"init"})
				done <- testCmd.Execute()
			}()

			// Read output
			go func() {
				io.Copy(&output, r)
			}()

			// Wait for command completion
			err = <-done
			time.Sleep(10 * time.Millisecond) // Allow output to be captured

			outputStr := output.String()

			if tt.expectSuccess {
				assert.NoError(t, err, tt.description)
			} else {
				assert.Error(t, err, tt.description)
			}

			// Verify expected output strings
			for _, expectedOutput := range tt.expectOutput {
				assert.Contains(t, outputStr, expectedOutput, "Output should contain expected text")
			}

			// Verify config file creation for new projects
			if !tt.existingConfig && tt.expectSuccess {
				configPath := filepath.Join(tempDir, "beaver.yml")
				_, err := os.Stat(configPath)
				assert.NoError(t, err, "Config file should be created")
			}
		})
	}
}

// TestBuildCommand tests the build command functionality
func TestBuildCommand(t *testing.T) {
	tests := []struct {
		name          string
		setupConfig   func(string) error
		expectSuccess bool
		expectOutput  []string
		description   string
	}{
		{
			name: "build without config",
			setupConfig: func(dir string) error {
				// Don't create any config
				return nil
			},
			expectSuccess: false,
			expectOutput:  []string{"❌ 設定エラー"},
			description:   "Should fail when no config exists",
		},
		{
			name: "build with invalid config",
			setupConfig: func(dir string) error {
				invalidConfig := `
project:
  name: ""
  repository: ""
sources:
  github:
    token: ""
`
				configPath := filepath.Join(dir, "beaver.yml")
				return os.WriteFile(configPath, []byte(invalidConfig), 0644)
			},
			expectSuccess: false,
			expectOutput:  []string{"❌ 設定エラー"},
			description:   "Should fail with invalid configuration",
		},
		{
			name: "build with valid config but no token",
			setupConfig: func(dir string) error {
				validConfig := `
project:
  name: "test-project"
  repository: "test/repo"
sources:
  github:
    token: ""
output:
  wiki:
    platform: "local"
ai:
  provider: "openai"
  model: "gpt-3.5-turbo"
`
				configPath := filepath.Join(dir, "beaver.yml")
				return os.WriteFile(configPath, []byte(validConfig), 0644)
			},
			expectSuccess: false,
			expectOutput:  []string{"❌ 設定エラー"},
			description:   "Should fail when GitHub token is missing",
		},
		{
			name: "build with unconfigured repository",
			setupConfig: func(dir string) error {
				config := `
project:
  name: "test-project"
  repository: "username/my-repo"
sources:
  github:
    token: "fake-token"
output:
  wiki:
    platform: "local"
ai:
  provider: "openai"
  model: "gpt-3.5-turbo"
`
				configPath := filepath.Join(dir, "beaver.yml")
				return os.WriteFile(configPath, []byte(config), 0644)
			},
			expectSuccess: false,
			expectOutput:  []string{"❌ リポジトリが設定されていません"},
			description:   "Should fail with default unconfigured repository",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create temporary directory for test
			tempDir, err := os.MkdirTemp("", "beaver-build-test-*")
			require.NoError(t, err)
			defer os.RemoveAll(tempDir)

			// Change to temp directory
			oldDir, err := os.Getwd()
			require.NoError(t, err)
			defer os.Chdir(oldDir)

			err = os.Chdir(tempDir)
			require.NoError(t, err)

			// Setup configuration
			err = tt.setupConfig(tempDir)
			require.NoError(t, err)

			// Capture output
			var output bytes.Buffer
			oldStdout := os.Stdout
			oldStderr := os.Stderr
			defer func() {
				os.Stdout = oldStdout
				os.Stderr = oldStderr
			}()

			// Create pipes to capture output
			r, w, err := os.Pipe()
			require.NoError(t, err)
			defer r.Close()

			os.Stdout = w
			os.Stderr = w

			// Create new root command for testing
			testCmd := &cobra.Command{
				Use: "beaver-test",
			}
			testCmd.AddCommand(buildCmd)

			// Run command with timeout to prevent hanging
			done := make(chan error, 1)
			go func() {
				defer w.Close()
				testCmd.SetArgs([]string{"build"})
				done <- testCmd.Execute()
			}()

			// Read output with timeout
			outputDone := make(chan struct{})
			go func() {
				defer close(outputDone)
				io.Copy(&output, r)
			}()

			// Wait for command completion with timeout
			select {
			case err = <-done:
				// Command completed
			case <-time.After(5 * time.Second):
				t.Error("Build command timed out")
				return
			}

			// Wait for output capture to complete
			select {
			case <-outputDone:
				// Output captured
			case <-time.After(1 * time.Second):
				// Continue even if output capture times out
			}

			outputStr := output.String()

			if tt.expectSuccess {
				assert.NoError(t, err, tt.description)
			} else {
				assert.Error(t, err, tt.description)
			}

			// Verify expected output strings
			for _, expectedOutput := range tt.expectOutput {
				assert.Contains(t, outputStr, expectedOutput, "Output should contain expected text: %s", expectedOutput)
			}
		})
	}
}

// TestStatusCommand tests the status command functionality
func TestStatusCommand(t *testing.T) {
	tests := []struct {
		name          string
		setupConfig   func(string) error
		expectSuccess bool
		expectOutput  []string
		description   string
	}{
		{
			name: "status without config",
			setupConfig: func(dir string) error {
				// Don't create any config
				return nil
			},
			expectSuccess: true,
			expectOutput:  []string{"❌ 設定ファイルなし", "💡 beaver init で初期化してください"},
			description:   "Should show no config message",
		},
		{
			name: "status with valid config",
			setupConfig: func(dir string) error {
				config := `
project:
  name: "test-project"
  repository: "test/repo"
sources:
  github:
    token: "fake-token"
output:
  wiki:
    platform: "github"
ai:
  provider: "openai"
  model: "gpt-4"
`
				configPath := filepath.Join(dir, "beaver.yml")
				return os.WriteFile(configPath, []byte(config), 0644)
			},
			expectSuccess: true,
			expectOutput:  []string{"📊 Beaver処理状況", "📁 プロジェクト: test-project", "🔗 リポジトリ: test/repo", "🤖 AI Provider: openai", "📝 出力先: github Wiki"},
			description:   "Should display configuration status",
		},
		{
			name: "status with invalid config",
			setupConfig: func(dir string) error {
				invalidConfig := `invalid yaml content: [}`
				configPath := filepath.Join(dir, "beaver.yml")
				return os.WriteFile(configPath, []byte(invalidConfig), 0644)
			},
			expectSuccess: true,
			expectOutput:  []string{"❌ 設定読み込みエラー"},
			description:   "Should handle invalid configuration gracefully",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create temporary directory for test
			tempDir, err := os.MkdirTemp("", "beaver-status-test-*")
			require.NoError(t, err)
			defer os.RemoveAll(tempDir)

			// Change to temp directory
			oldDir, err := os.Getwd()
			require.NoError(t, err)
			defer os.Chdir(oldDir)

			err = os.Chdir(tempDir)
			require.NoError(t, err)

			// Setup configuration
			err = tt.setupConfig(tempDir)
			require.NoError(t, err)

			// Capture output
			var output bytes.Buffer
			oldStdout := os.Stdout
			oldStderr := os.Stderr
			defer func() {
				os.Stdout = oldStdout
				os.Stderr = oldStderr
			}()

			// Create pipes to capture output
			r, w, err := os.Pipe()
			require.NoError(t, err)
			defer r.Close()

			os.Stdout = w
			os.Stderr = w

			// Create new root command for testing
			testCmd := &cobra.Command{
				Use: "beaver-test",
			}
			testCmd.AddCommand(statusCmd)

			// Run command with timeout
			done := make(chan error, 1)
			go func() {
				defer w.Close()
				testCmd.SetArgs([]string{"status"})
				done <- testCmd.Execute()
			}()

			// Read output with timeout
			outputDone := make(chan struct{})
			go func() {
				defer close(outputDone)
				io.Copy(&output, r)
			}()

			// Wait for command completion with timeout
			select {
			case err = <-done:
				// Command completed
			case <-time.After(5 * time.Second):
				t.Error("Status command timed out")
				return
			}

			// Wait for output capture to complete
			select {
			case <-outputDone:
				// Output captured
			case <-time.After(1 * time.Second):
				// Continue even if output capture times out
			}

			outputStr := output.String()

			if tt.expectSuccess {
				assert.NoError(t, err, tt.description)
			} else {
				assert.Error(t, err, tt.description)
			}

			// Verify expected output strings
			for _, expectedOutput := range tt.expectOutput {
				assert.Contains(t, outputStr, expectedOutput, "Output should contain expected text: %s", expectedOutput)
			}
		})
	}
}

// TestFetchIssuesCommand tests the fetch issues command functionality
func TestFetchIssuesCommand(t *testing.T) {
	tests := []struct {
		name          string
		args          []string
		flags         map[string]string
		setupConfig   func(string) error
		expectSuccess bool
		expectOutput  []string
		description   string
	}{
		{
			name:          "fetch without repository argument",
			args:          []string{},
			expectSuccess: false,
			expectOutput:  []string{},
			description:   "Should fail when no repository is provided",
		},
		{
			name:          "fetch with invalid repository format",
			args:          []string{"invalid-repo"},
			expectSuccess: false,
			expectOutput:  []string{"❌ リポジトリ形式が無効です"},
			description:   "Should fail with invalid repository format",
		},
		{
			name: "fetch without config",
			args: []string{"owner/repo"},
			setupConfig: func(dir string) error {
				// Don't create config
				return nil
			},
			expectSuccess: false,
			expectOutput:  []string{"❌ 設定読み込みエラー"},
			description:   "Should fail when no config exists",
		},
		{
			name: "fetch without github token",
			args: []string{"owner/repo"},
			setupConfig: func(dir string) error {
				config := `
project:
  name: "test"
sources:
  github:
    token: ""
`
				configPath := filepath.Join(dir, "beaver.yml")
				return os.WriteFile(configPath, []byte(config), 0644)
			},
			expectSuccess: false,
			expectOutput:  []string{"❌ GitHub tokenが設定されていません"},
			description:   "Should fail when GitHub token is missing",
		},
		{
			name: "fetch with invalid since parameter",
			args: []string{"owner/repo"},
			flags: map[string]string{
				"since": "invalid-date",
			},
			setupConfig: func(dir string) error {
				config := `
project:
  name: "test"
sources:
  github:
    token: "fake-token"
`
				configPath := filepath.Join(dir, "beaver.yml")
				return os.WriteFile(configPath, []byte(config), 0644)
			},
			expectSuccess: false,
			expectOutput:  []string{"❌ since パラメータの形式が無効です"},
			description:   "Should fail with invalid since parameter",
		},
		{
			name: "fetch with invalid per-page parameter",
			args: []string{"owner/repo"},
			flags: map[string]string{
				"per-page": "200", // Invalid: exceeds maximum
			},
			setupConfig: func(dir string) error {
				config := `
project:
  name: "test"
sources:
  github:
    token: "fake-token"
`
				configPath := filepath.Join(dir, "beaver.yml")
				return os.WriteFile(configPath, []byte(config), 0644)
			},
			expectSuccess: false,
			expectOutput:  []string{"❌ per-page は 1-100 の範囲で指定してください"},
			description:   "Should fail with invalid per-page parameter",
		},
		{
			name: "fetch with invalid output format",
			args: []string{"owner/repo"},
			flags: map[string]string{
				"format": "invalid-format",
			},
			setupConfig: func(dir string) error {
				config := `
project:
  name: "test"
sources:
  github:
    token: "fake-token"
`
				configPath := filepath.Join(dir, "beaver.yml")
				return os.WriteFile(configPath, []byte(config), 0644)
			},
			expectSuccess: false,
			expectOutput:  []string{"❌ 無効な出力形式"},
			description:   "Should fail with invalid output format",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create temporary directory for test
			tempDir, err := os.MkdirTemp("", "beaver-fetch-test-*")
			require.NoError(t, err)
			defer os.RemoveAll(tempDir)

			// Change to temp directory
			oldDir, err := os.Getwd()
			require.NoError(t, err)
			defer os.Chdir(oldDir)

			err = os.Chdir(tempDir)
			require.NoError(t, err)

			// Setup configuration if provided
			if tt.setupConfig != nil {
				err = tt.setupConfig(tempDir)
				require.NoError(t, err)
			}

			// Capture output
			var output bytes.Buffer
			oldStdout := os.Stdout
			oldStderr := os.Stderr
			defer func() {
				os.Stdout = oldStdout
				os.Stderr = oldStderr
			}()

			// Create pipes to capture output
			r, w, err := os.Pipe()
			require.NoError(t, err)
			defer r.Close()

			os.Stdout = w
			os.Stderr = w

			// Create new root command for testing
			testCmd := &cobra.Command{
				Use: "beaver-test",
			}
			testCmd.AddCommand(fetchCmd)

			// Prepare command args
			cmdArgs := []string{"fetch", "issues"}
			cmdArgs = append(cmdArgs, tt.args...)

			// Add flags
			for flag, value := range tt.flags {
				cmdArgs = append(cmdArgs, "--"+flag+"="+value)
			}

			// Run command with timeout
			done := make(chan error, 1)
			go func() {
				defer w.Close()
				testCmd.SetArgs(cmdArgs)
				done <- testCmd.Execute()
			}()

			// Read output with timeout
			outputDone := make(chan struct{})
			go func() {
				defer close(outputDone)
				io.Copy(&output, r)
			}()

			// Wait for command completion with timeout
			select {
			case err = <-done:
				// Command completed
			case <-time.After(5 * time.Second):
				t.Error("Fetch command timed out")
				return
			}

			// Wait for output capture to complete
			select {
			case <-outputDone:
				// Output captured
			case <-time.After(1 * time.Second):
				// Continue even if output capture times out
			}

			outputStr := output.String()

			if tt.expectSuccess {
				assert.NoError(t, err, tt.description)
			} else {
				assert.Error(t, err, tt.description)
			}

			// Verify expected output strings
			for _, expectedOutput := range tt.expectOutput {
				assert.Contains(t, outputStr, expectedOutput, "Output should contain expected text: %s", expectedOutput)
			}
		})
	}
}

// TestRootCommand tests the root command functionality
func TestRootCommand(t *testing.T) {
	// Capture output
	var output bytes.Buffer
	oldStdout := os.Stdout
	defer func() {
		os.Stdout = oldStdout
	}()

	// Create pipe to capture output
	r, w, err := os.Pipe()
	require.NoError(t, err)
	defer r.Close()

	os.Stdout = w

	// Create new root command for testing
	testCmd := &cobra.Command{
		Use:   "beaver",
		Short: "🦫 Beaver - AIエージェント知識ダム構築ツール",
		Long: `Beaver は AI エージェント開発の軌跡を自動的に整理された永続的な知識に変換します。
	
散在する GitHub Issues、コミットログ、AI実験記録を構造化された Wiki ドキュメントに変換し、
流れ去る学びを永続的な知識ダムとして蓄積します。`,
		Run: func(cmd *cobra.Command, args []string) {
			rootCmd.Run(cmd, args)
		},
	}

	// Run command
	done := make(chan error, 1)
	go func() {
		defer w.Close()
		testCmd.SetArgs([]string{})
		done <- testCmd.Execute()
	}()

	// Read output
	outputDone := make(chan struct{})
	go func() {
		defer close(outputDone)
		io.Copy(&output, r)
	}()

	// Wait for command completion
	err = <-done
	assert.NoError(t, err, "Root command should execute successfully")

	// Wait for output capture
	<-outputDone

	outputStr := output.String()

	// Verify expected output
	assert.Contains(t, outputStr, "🦫 Beaver", "Should display beaver emoji and name")
	assert.Contains(t, outputStr, "使用方法: beaver [command]", "Should display usage information")
	assert.Contains(t, outputStr, "詳細なヘルプ: beaver --help", "Should display help information")
}

// TestConfigValidation tests configuration validation across commands
func TestConfigValidation(t *testing.T) {
	tests := []struct {
		name        string
		configYAML  string
		expectValid bool
		description string
	}{
		{
			name: "valid minimal config",
			configYAML: `
project:
  name: "test-project"
  repository: "owner/repo"
sources:
  github:
    token: "fake-token"
output:
  wiki:
    platform: "github"
ai:
  provider: "openai"
  model: "gpt-3.5-turbo"
`,
			expectValid: true,
			description: "Should validate minimal valid configuration",
		},
		{
			name: "missing project name",
			configYAML: `
project:
  name: ""
  repository: "owner/repo"
sources:
  github:
    token: "fake-token"
output:
  wiki:
    platform: "github"
ai:
  provider: "openai"
  model: "gpt-3.5-turbo"
`,
			expectValid: false,
			description: "Should fail with missing project name",
		},
		{
			name: "missing github token",
			configYAML: `
project:
  name: "test-project"
  repository: "owner/repo"
sources:
  github:
    token: ""
output:
  wiki:
    platform: "github"
ai:
  provider: "openai"
  model: "gpt-3.5-turbo"
`,
			expectValid: false,
			description: "Should fail with missing GitHub token",
		},
		{
			name: "invalid ai provider",
			configYAML: `
project:
  name: "test-project"
  repository: "owner/repo"
sources:
  github:
    token: "fake-token"
output:
  wiki:
    platform: "github"
ai:
  provider: "invalid-provider"
  model: "gpt-3.5-turbo"
`,
			expectValid: false,
			description: "Should fail with invalid AI provider",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create temporary directory for test
			tempDir, err := os.MkdirTemp("", "config-validation-test-*")
			require.NoError(t, err)
			defer os.RemoveAll(tempDir)

			// Change to temp directory
			oldDir, err := os.Getwd()
			require.NoError(t, err)
			defer os.Chdir(oldDir)

			err = os.Chdir(tempDir)
			require.NoError(t, err)

			// Write config file
			configPath := filepath.Join(tempDir, "beaver.yml")
			err = os.WriteFile(configPath, []byte(tt.configYAML), 0644)
			require.NoError(t, err)

			// Load and validate configuration
			cfg, err := config.LoadConfig()
			require.NoError(t, err, "Config should load successfully")

			// Test validation
			err = cfg.Validate()

			if tt.expectValid {
				assert.NoError(t, err, tt.description)
			} else {
				assert.Error(t, err, tt.description)
			}
		})
	}
}

// TestMainFunction tests the main function entry point
func TestMainFunction(t *testing.T) {
	// Test that main function doesn't panic
	// We can't easily test os.Exit() calls, but we can test the basic flow

	// Create temporary directory
	tempDir, err := os.MkdirTemp("", "main-test-*")
	require.NoError(t, err)
	defer os.RemoveAll(tempDir)

	// Change to temp directory
	oldDir, err := os.Getwd()
	require.NoError(t, err)
	defer os.Chdir(oldDir)

	err = os.Chdir(tempDir)
	require.NoError(t, err)

	// Save original args
	oldArgs := os.Args
	defer func() {
		os.Args = oldArgs
	}()

	// Test main with help flag (should not cause panic or exit)
	os.Args = []string{"beaver", "--help"}

	// We can't test main() directly because it calls os.Exit()
	// Instead, test rootCmd.Execute() which is what main() calls
	assert.NotPanics(t, func() {
		// Create a new command to avoid modifying global state
		testRoot := &cobra.Command{
			Use:   "beaver",
			Short: "🦫 Beaver - AIエージェント知識ダム構築ツール",
		}
		testRoot.AddCommand(initCmd)
		testRoot.AddCommand(buildCmd)
		testRoot.AddCommand(statusCmd)
		testRoot.AddCommand(fetchCmd)

		testRoot.SetArgs([]string{"--help"})
		_ = testRoot.Execute() // Ignore error for help command
	}, "Main function flow should not panic")
}

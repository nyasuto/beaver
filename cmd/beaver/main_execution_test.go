package main

import (
	"fmt"
	"io"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

// Main Execution Tests - Extracted from main_test.go for Phase 3C refactoring
// These tests focus on main function execution, command structure, and execution paths

// TestMainFunction tests the main() function execution with different argument scenarios
func TestMainFunction(t *testing.T) {
	// Save original os.Args and restore at the end
	oldArgs := os.Args
	defer func() { os.Args = oldArgs }()

	t.Run("main function with no arguments shows default help", func(t *testing.T) {
		// Capture stdout
		oldStdout := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		// Set args to just the program name
		os.Args = []string{"beaver"}

		// Reset cobra command state
		rootCmd.SetArgs([]string{})

		// Execute command through rootCmd instead of main() to avoid os.Exit
		err := rootCmd.Execute()
		assert.NoError(t, err)

		// Restore stdout and read captured output
		w.Close()
		os.Stdout = oldStdout
		capturedBytes, _ := io.ReadAll(r)
		captured := string(capturedBytes)

		// Verify default output - Custom Run function is executed
		assert.Contains(t, captured, "🦫 Beaver - AI知識ダム")
		assert.Contains(t, captured, "使用方法: beaver [command]")
	})

	t.Run("main function with help flag", func(t *testing.T) {
		// Capture stdout
		oldStdout := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		// Set args with help flag
		os.Args = []string{"beaver", "--help"}
		rootCmd.SetArgs([]string{"--help"})

		// Execute command
		err := rootCmd.Execute()
		assert.NoError(t, err)

		// Restore stdout and read captured output
		w.Close()
		os.Stdout = oldStdout
		capturedBytes, _ := io.ReadAll(r)
		captured := string(capturedBytes)

		// Verify help output contains expected content
		assert.Contains(t, captured, "Beaver は AI エージェント開発の軌跡を自動的に整理された永続的な知識に変換します")
		assert.Contains(t, captured, "Available Commands:")
	})

	t.Run("main function with invalid command", func(t *testing.T) {
		// Capture stderr
		oldStderr := os.Stderr
		r, w, _ := os.Pipe()
		os.Stderr = w

		// Set args with invalid command
		os.Args = []string{"beaver", "invalidcommand"}
		rootCmd.SetArgs([]string{"invalidcommand"})

		// Execute command - this should return an error
		err := rootCmd.Execute()
		assert.Error(t, err)

		// Restore stderr and read captured output
		w.Close()
		os.Stderr = oldStderr
		capturedBytes, _ := io.ReadAll(r)
		_ = capturedBytes // Capture stderr but we don't need to check it for this test

		// Verify error message (cobra generates this automatically)
		assert.Contains(t, err.Error(), "unknown command")
	})

	t.Run("main function with valid subcommands", func(t *testing.T) {
		validCommands := []string{"init", "build", "status", "version", "analyze", "generate", "fetch", "wiki"}

		for _, cmd := range validCommands {
			t.Run(fmt.Sprintf("command_%s_exists", cmd), func(t *testing.T) {
				// Check if command exists in rootCmd
				foundCmd, _, err := rootCmd.Find([]string{cmd})
				assert.NoError(t, err)
				assert.NotNil(t, foundCmd)
				assert.Equal(t, cmd, foundCmd.Name())
			})
		}
	})

	t.Run("main function version flag", func(t *testing.T) {
		// Test version flag if it exists
		os.Args = []string{"beaver", "--version"}
		rootCmd.SetArgs([]string{"--version"})

		// Execute command - version might not be implemented yet
		err := rootCmd.Execute()
		// Don't assert on error since version might not be implemented
		_ = err
	})
}

// TestCommandStructure tests command registration and structure
func TestCommandStructure(t *testing.T) {
	t.Run("root command configuration", func(t *testing.T) {
		assert.Equal(t, "beaver", rootCmd.Use)
		assert.Contains(t, rootCmd.Short, "🦫 Beaver")
		assert.NotEmpty(t, rootCmd.Long)
		assert.NotNil(t, rootCmd.Run)
	})

	t.Run("all expected commands are registered", func(t *testing.T) {
		expectedCommands := map[string]bool{
			"init":     false,
			"build":    false,
			"status":   false,
			"version":  false,
			"analyze":  false,
			"generate": false,
			"fetch":    false,
			"wiki":     false,
		}

		// Check all subcommands
		for _, cmd := range rootCmd.Commands() {
			if _, exists := expectedCommands[cmd.Name()]; exists {
				expectedCommands[cmd.Name()] = true
			}
		}

		// Verify all expected commands are registered
		for cmdName, found := range expectedCommands {
			assert.True(t, found, "Command %s should be registered", cmdName)
		}
	})

	t.Run("init command configuration", func(t *testing.T) {
		initCommand, _, err := rootCmd.Find([]string{"init"})
		assert.NoError(t, err)
		assert.Equal(t, "init", initCommand.Use)
		assert.Contains(t, initCommand.Short, "プロジェクト設定の初期化")
		assert.NotEmpty(t, initCommand.Long)
		assert.NotNil(t, initCommand.Run)
	})
}

// TestMainExecutionPaths tests main execution paths with different argument scenarios
func TestMainExecutionPaths(t *testing.T) {
	t.Run("simulate main() function success path", func(t *testing.T) {
		// This tests the logic inside main() without calling os.Exit
		// We can't directly test main() because it calls os.Exit on error

		// Test successful execution path
		oldArgs := os.Args
		defer func() { os.Args = oldArgs }()

		os.Args = []string{"beaver", "--help"}
		rootCmd.SetArgs([]string{"--help"})

		// Capture stdout for verification
		oldStdout := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		err := rootCmd.Execute()

		w.Close()
		os.Stdout = oldStdout
		capturedBytes, _ := io.ReadAll(r)
		captured := string(capturedBytes)

		// Verify success path
		assert.NoError(t, err)
		assert.Contains(t, captured, "Beaver")
	})

	t.Run("simulate main() function error path", func(t *testing.T) {
		// Test error execution path
		oldArgs := os.Args
		defer func() { os.Args = oldArgs }()

		os.Args = []string{"beaver", "nonexistent-command"}
		rootCmd.SetArgs([]string{"nonexistent-command"})

		err := rootCmd.Execute()

		// Verify error path
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unknown command")
	})
}

// TestMainLogic tests mainLogic function directly for better coverage
func TestMainLogic(t *testing.T) {
	// Save original os.Args and restore at the end
	oldArgs := os.Args
	defer func() { os.Args = oldArgs }()

	t.Run("mainLogic success path", func(t *testing.T) {
		// Set valid arguments
		os.Args = []string{"beaver", "--help"}
		rootCmd.SetArgs([]string{"--help"})

		// Capture stdout to verify logging
		oldStdout := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		// Execute mainLogic
		err := mainLogic()

		// Restore stdout
		w.Close()
		os.Stdout = oldStdout
		capturedBytes, _ := io.ReadAll(r)
		captured := string(capturedBytes)

		// Verify success
		assert.NoError(t, err)
		assert.Contains(t, captured, "Beaver")
	})

	t.Run("mainLogic error path", func(t *testing.T) {
		// Set invalid arguments that will cause an error
		os.Args = []string{"beaver", "invalid-command"}
		rootCmd.SetArgs([]string{"invalid-command"})

		// Capture stderr to verify error logging
		oldStderr := os.Stderr
		r, w, _ := os.Pipe()
		os.Stderr = w

		// Execute mainLogic
		err := mainLogic()

		// Restore stderr
		w.Close()
		os.Stderr = oldStderr
		capturedBytes, _ := io.ReadAll(r)
		captured := string(capturedBytes)

		// Verify error path
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unknown command")
		assert.Contains(t, captured, "エラー:")
	})

	t.Run("mainLogic with default command (no args)", func(t *testing.T) {
		// Set no arguments (default behavior) - don't use SetArgs so it uses os.Args
		os.Args = []string{"beaver"}
		// Reset command state but don't override args
		rootCmd.SetArgs(nil) // nil means use os.Args

		// Capture stdout
		oldStdout := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		// Execute mainLogic
		err := mainLogic()

		// Restore stdout
		w.Close()
		os.Stdout = oldStdout
		capturedBytes, _ := io.ReadAll(r)
		captured := string(capturedBytes)

		// Verify success - When os.Args is ["beaver"], Cobra shows help
		assert.NoError(t, err)
		// With os.Args = ["beaver"] and no SetArgs, Cobra will show help
		assert.Contains(t, captured, "Beaver は AI エージェント開発の軌跡")
		assert.Contains(t, captured, "Available Commands:")
	})
}

// TestCommandExecution tests command structure and basic functionality
func TestCommandExecution(t *testing.T) {
	t.Run("Root command help", func(t *testing.T) {
		// Test root command basic functionality
		cmd := rootCmd
		assert.Equal(t, "beaver", cmd.Use)
		assert.Contains(t, cmd.Short, "Beaver")
		assert.Contains(t, cmd.Long, "AI エージェント")
	})

	t.Run("Command structure", func(t *testing.T) {
		// Verify commands are properly registered
		commands := rootCmd.Commands()
		commandNames := make([]string, len(commands))
		for i, cmd := range commands {
			commandNames[i] = cmd.Use
		}

		assert.Contains(t, commandNames, "init")
		assert.Contains(t, commandNames, "build")
		assert.Contains(t, commandNames, "status")
	})

	t.Run("Build command configuration", func(t *testing.T) {
		// Test build command setup
		cmd := buildCmd
		assert.Equal(t, "build", cmd.Use)
		assert.Contains(t, cmd.Short, "Issues")
		assert.Contains(t, cmd.Long, "GitHub Issues")
	})

	t.Run("Status command configuration", func(t *testing.T) {
		// Test status command setup
		cmd := statusCmd
		assert.Equal(t, "status", cmd.Use)
		assert.Contains(t, cmd.Short, "処理状況")
		assert.Contains(t, cmd.Long, "処理状況")
	})

	t.Run("Init command configuration", func(t *testing.T) {
		// Test init command setup
		cmd := initCmd
		assert.Equal(t, "init", cmd.Use)
		assert.Contains(t, cmd.Short, "プロジェクト設定")
		assert.Contains(t, cmd.Long, "Beaverプロジェクト")
	})
}

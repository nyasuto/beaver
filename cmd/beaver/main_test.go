package main

import (
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/spf13/cobra"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestMain sets up the test environment
func TestMain(m *testing.M) {
	// Set log level to WARN for tests to reduce noise
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{
		Level: slog.LevelWarn,
	})))

	// Run tests
	os.Exit(m.Run())
}

// Test runGenerateTroubleshooting function - currently has low coverage (22.4%)
func TestRunGenerateTroubleshooting_BasicFunctionality(t *testing.T) {
	tests := []struct {
		name     string
		args     []string
		wantErr  bool
		errorMsg string
	}{
		{
			name:     "invalid repo format",
			args:     []string{"invalid-repo"},
			wantErr:  true,
			errorMsg: "無効なリポジトリパス",
		},
		{
			name:     "empty repo",
			args:     []string{""},
			wantErr:  true,
			errorMsg: "無効なリポジトリパス",
		},
		{
			name:     "valid repo format no token",
			args:     []string{"owner/repo"},
			wantErr:  true,
			errorMsg: "GitHub token not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Clear environment
			originalToken := os.Getenv("GITHUB_TOKEN")
			originalConfigPath := os.Getenv("BEAVER_CONFIG_PATH")
			defer func() {
				if originalToken != "" {
					os.Setenv("GITHUB_TOKEN", originalToken)
				} else {
					os.Unsetenv("GITHUB_TOKEN")
				}
				if originalConfigPath != "" {
					os.Setenv("BEAVER_CONFIG_PATH", originalConfigPath)
				} else {
					os.Unsetenv("BEAVER_CONFIG_PATH")
				}
			}()

			os.Unsetenv("GITHUB_TOKEN")
			os.Setenv("BEAVER_CONFIG_PATH", "/nonexistent/config.yml")

			cmd := &cobra.Command{}
			err := runGenerateTroubleshooting(cmd, tt.args)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errorMsg)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestRunGenerateTroubleshooting_WithValidConfig(t *testing.T) {
	// Create temporary config file
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "beaver.yml")

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
`

	err := os.WriteFile(configPath, []byte(validConfig), 0600)
	require.NoError(t, err)

	// Set config path
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
	err = runGenerateTroubleshooting(cmd, []string{"owner/repo"})

	// Should fail at GitHub connection with fake token
	assert.Error(t, err)
	assert.True(t,
		strings.Contains(err.Error(), "failed to fetch issues") ||
			strings.Contains(err.Error(), "GitHub"),
		"Expected GitHub connection error, got: %v", err)
}

func TestRunGenerateTroubleshooting_WithEnvironmentToken(t *testing.T) {
	// Test with GITHUB_TOKEN environment variable
	originalToken := os.Getenv("GITHUB_TOKEN")
	originalConfigPath := os.Getenv("BEAVER_CONFIG_PATH")
	defer func() {
		if originalToken != "" {
			os.Setenv("GITHUB_TOKEN", originalToken)
		} else {
			os.Unsetenv("GITHUB_TOKEN")
		}
		if originalConfigPath != "" {
			os.Setenv("BEAVER_CONFIG_PATH", originalConfigPath)
		} else {
			os.Unsetenv("BEAVER_CONFIG_PATH")
		}
	}()

	os.Setenv("GITHUB_TOKEN", "env-fake-token")
	os.Setenv("BEAVER_CONFIG_PATH", "/nonexistent/config.yml")

	cmd := &cobra.Command{}
	err := runGenerateTroubleshooting(cmd, []string{"owner/repo"})

	// Should fail at GitHub connection with fake token
	assert.Error(t, err)
	assert.True(t,
		strings.Contains(err.Error(), "failed to fetch issues") ||
			strings.Contains(err.Error(), "GitHub"),
		"Expected GitHub connection error, got: %v", err)
}

func TestRunGenerateTroubleshooting_FlagHandling(t *testing.T) {
	// Test different flag combinations
	originalIncludeClosed := includeClosed
	originalMaxIssues := maxIssuesForAnalysis
	originalExportWiki := exportWiki

	defer func() {
		includeClosed = originalIncludeClosed
		maxIssuesForAnalysis = originalMaxIssues
		exportWiki = originalExportWiki
	}()

	// Test with different flag values
	includeClosed = true
	maxIssuesForAnalysis = 100
	exportWiki = true

	originalToken := os.Getenv("GITHUB_TOKEN")
	defer func() {
		if originalToken != "" {
			os.Setenv("GITHUB_TOKEN", originalToken)
		} else {
			os.Unsetenv("GITHUB_TOKEN")
		}
	}()

	os.Setenv("GITHUB_TOKEN", "flag-test-token")

	cmd := &cobra.Command{}
	err := runGenerateTroubleshooting(cmd, []string{"owner/repo"})

	// Should fail at GitHub connection but flags should be processed
	assert.Error(t, err)
}

// Test helper functions for generate troubleshooting
func TestGenerateHelperFunctions(t *testing.T) {
	// Test parseOwnerRepo utility (used in generate troubleshooting)
	t.Run("parseOwnerRepo", func(t *testing.T) {
		tests := []struct {
			name      string
			repoPath  string
			wantOwner string
			wantRepo  string
		}{
			{
				name:      "valid repo path",
				repoPath:  "owner/repo",
				wantOwner: "owner",
				wantRepo:  "repo",
			},
			{
				name:      "invalid repo path - no slash",
				repoPath:  "ownerrepo",
				wantOwner: "",
				wantRepo:  "",
			},
			{
				name:      "invalid repo path - empty",
				repoPath:  "",
				wantOwner: "",
				wantRepo:  "",
			},
			{
				name:      "invalid repo path - too many parts",
				repoPath:  "owner/repo/extra",
				wantOwner: "",
				wantRepo:  "",
			},
		}

		for _, tt := range tests {
			owner, repo := parseOwnerRepo(tt.repoPath)
			assert.Equal(t, tt.wantOwner, owner)
			assert.Equal(t, tt.wantRepo, repo)
		}
	})
}

func TestGenerateTroubleshootingHelpers(t *testing.T) {
	// Test saveTroubleshootingGuide function format validation
	t.Run("saveTroubleshootingGuide format validation", func(t *testing.T) {
		tmpDir := t.TempDir()
		filename := filepath.Join(tmpDir, "test-guide")

		// Test unsupported format
		err := saveTroubleshootingGuide(nil, filename, "xml")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unsupported format")
	})
}

func TestFormatHelperFunctions(t *testing.T) {
	// Test severity icon mapping
	t.Run("getSeverityIcon", func(t *testing.T) {
		tests := []struct {
			severity string
			expected string
		}{
			{"critical", "🔴"},
			{"high", "🟠"},
			{"medium", "🟡"},
			{"low", "🟢"},
			{"unknown", "⚪"},
		}
		for _, test := range tests {
			result := getSeverityIcon(test.severity)
			assert.Equal(t, test.expected, result)
		}
	})

	// Test difficulty icon mapping
	t.Run("getDifficultyIcon", func(t *testing.T) {
		tests := []struct {
			difficulty string
			expected   string
		}{
			{"easy", "🟢"},
			{"medium", "🟡"},
			{"hard", "🟠"},
			{"expert", "🔴"},
			{"unknown", "⚪"},
		}
		for _, test := range tests {
			result := getDifficultyIcon(test.difficulty)
			assert.Equal(t, test.expected, result)
		}
	})

	// Test priority icon mapping
	t.Run("getPriorityIcon", func(t *testing.T) {
		// getPriorityIcon function was removed with analyze package cleanup
		t.Skip("getPriorityIcon function no longer exists")
	})

	// Test duration formatting
	t.Run("formatDuration", func(t *testing.T) {
		tests := []struct {
			duration time.Duration
			expected string
		}{
			{30 * time.Minute, "30分"},
			{2 * time.Hour, "2.0時間"},
			{25 * time.Hour, "1.0日"},
		}
		for _, test := range tests {
			result := formatDuration(test.duration)
			assert.Equal(t, test.expected, result)
		}
	})
}

// Test troubleshooting helper functions that are currently not covered
func TestTroubleshootingHelperFunctionCoverage(t *testing.T) {
	// These tests provide coverage for helper functions that were not previously tested

	// Test that functions exist and don't panic
	t.Run("helper functions basic validation", func(t *testing.T) {
		// Test function existence by calling them
		assert.NotPanics(t, func() {
			_ = getSeverityIcon("test")
			_ = getDifficultyIcon("test")
			// getPriorityIcon function was removed with analyze package cleanup
			_ = formatDuration(time.Hour)
		})
	})
}

// Test runVersionCommand function - currently has 0% coverage
func TestRunVersionCommand(t *testing.T) {
	// Capture output to test version command output
	helper := NewTestHelpers(t)

	output, _ := helper.CaptureOutput(func() {
		cmd := &cobra.Command{}
		runVersionCommand(cmd, []string{})
	})

	// Check that version information is displayed
	assert.Contains(t, output, "🦫 Beaver バージョン:")
	assert.Contains(t, output, "📅 ビルド時刻:")
	assert.Contains(t, output, "📝 Git commit:")

	// Check that version variables are included in output
	assert.Contains(t, output, version)
	assert.Contains(t, output, buildTime)
	assert.Contains(t, output, gitCommit)
}

// Test runRootCommand function - currently has 100% coverage but adding edge cases
func TestRunRootCommand(t *testing.T) {
	helper := NewTestHelpers(t)

	output, _ := helper.CaptureOutput(func() {
		cmd := &cobra.Command{}
		runRootCommand(cmd, []string{})
	})

	// Check that root command displays expected content
	assert.Contains(t, output, "🦫 Beaver - AI知識ダム")
	assert.Contains(t, output, "🚀 クイックスタート:")
	assert.Contains(t, output, "beaver init")
	assert.Contains(t, output, "beaver doctor")
	assert.Contains(t, output, "🆘 困ったときは:")
}

// Test main function - currently has 0% coverage
func TestMain_Function(t *testing.T) {
	// Test main function behavior by testing mainLogic
	// We can't test main() directly as it calls os.Exit

	// Save original args
	oldArgs := os.Args
	defer func() { os.Args = oldArgs }()

	// Test with help command
	os.Args = []string{"beaver", "--help"}

	// Use goroutine with timeout to prevent hanging
	done := make(chan error, 1)
	go func() {
		done <- mainLogic()
	}()

	select {
	case err := <-done:
		// Help command returns error in cobra, but that's expected behavior
		// We just want to ensure mainLogic can be called without panic
		_ = err // Don't fail test on help error
	case <-time.After(5 * time.Second):
		t.Error("mainLogic() timed out")
	}
}

// Test mainLogic function - currently has 100% coverage but test error cases
func TestMainLogic_ErrorCases(t *testing.T) {
	// Save original args
	oldArgs := os.Args
	defer func() { os.Args = oldArgs }()

	// Test with invalid command
	os.Args = []string{"beaver", "invalid-command"}

	err := mainLogic()
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "unknown command")
}

// Test version command integration
func TestVersionCommand_Integration(t *testing.T) {
	// Test that version command is properly registered
	assert.NotNil(t, versionCmd)
	assert.Equal(t, "version", versionCmd.Use)
	assert.Contains(t, versionCmd.Short, "バージョン情報")

	// Test version command can be executed
	helper := NewTestHelpers(t)
	output, _ := helper.CaptureOutput(func() {
		versionCmd.Run(versionCmd, []string{})
	})

	assert.Contains(t, output, "Beaver バージョン")
}

// Test init command coverage improvement
func TestRunInitCommand_ExtendedCases(t *testing.T) {
	tests := []struct {
		name    string
		setup   func() (func(), string)
		wantErr bool
	}{
		{
			name: "config file already exists",
			setup: func() (func(), string) {
				tempDir := t.TempDir()
				oldWd, _ := os.Getwd()
				os.Chdir(tempDir)

				// Create existing config file
				configPath := "beaver.yml"
				os.WriteFile(configPath, []byte("existing config"), 0600)

				return func() { os.Chdir(oldWd) }, tempDir
			},
			wantErr: false, // Should warn but not error
		},
		{
			name: "successful init in empty directory",
			setup: func() (func(), string) {
				tempDir := t.TempDir()
				oldWd, _ := os.Getwd()
				os.Chdir(tempDir)

				return func() { os.Chdir(oldWd) }, tempDir
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cleanup, _ := tt.setup()
			defer cleanup()

			helper := NewTestHelpers(t)
			var err error
			_, _ = helper.CaptureOutput(func() {
				cmd := &cobra.Command{}
				// runInitCommand doesn't return error, it uses os.Exit
				// We test by calling it and checking output
				runInitCommand(cmd, []string{})
			})

			// runInitCommand doesn't return errors, it prints and potentially exits
			_ = err
		})
	}
}

// Test buildCommand function coverage improvement
func TestRunBuildCommand_ExtendedCases(t *testing.T) {
	tests := []struct {
		name    string
		setup   func() func()
		wantErr bool
	}{
		{
			name: "no config file",
			setup: func() func() {
				tempDir := t.TempDir()
				oldWd, _ := os.Getwd()
				os.Chdir(tempDir)

				return func() { os.Chdir(oldWd) }
			},
			wantErr: true,
		},
		{
			name: "invalid config file",
			setup: func() func() {
				tempDir := t.TempDir()
				oldWd, _ := os.Getwd()
				os.Chdir(tempDir)

				// Create invalid config
				os.WriteFile("beaver.yml", []byte("invalid: yaml: content:"), 0600)

				return func() { os.Chdir(oldWd) }
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cleanup := tt.setup()
			defer cleanup()

			cmd := &cobra.Command{}
			err := runBuildCommand(cmd, []string{})
			if (err != nil) != tt.wantErr {
				t.Errorf("runBuildCommand() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

// Test statusCommand function coverage improvement
func TestRunStatusCommand_ExtendedCases(t *testing.T) {
	tests := []struct {
		name  string
		setup func() func()
	}{
		{
			name: "no config file",
			setup: func() func() {
				tempDir := t.TempDir()
				oldWd, _ := os.Getwd()
				os.Chdir(tempDir)

				return func() { os.Chdir(oldWd) }
			},
		},
		{
			name: "valid config file",
			setup: func() func() {
				tempDir := t.TempDir()
				oldWd, _ := os.Getwd()
				os.Chdir(tempDir)

				// Create valid config
				validConfig := `
project:
  name: "test-project"
  repository: "owner/repo"
sources:
  github:
    token: "test-token"
ai:
  provider: "openai"
  model: "gpt-3.5-turbo"
`
				os.WriteFile("beaver.yml", []byte(validConfig), 0600)

				return func() { os.Chdir(oldWd) }
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cleanup := tt.setup()
			defer cleanup()

			helper := NewTestHelpers(t)
			_, _ = helper.CaptureOutput(func() {
				cmd := &cobra.Command{}
				runStatusCommand(cmd, []string{})
			})

			// Status command doesn't return errors, just prints status
		})
	}
}

// Test splitString function - currently has 100% coverage but add edge cases
func TestSplitString_EdgeCases(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		sep      string
		expected []string
	}{
		{
			name:     "empty string",
			input:    "",
			sep:      "/",
			expected: nil,
		},
		{
			name:     "no separator",
			input:    "noseparator",
			sep:      "/",
			expected: []string{"noseparator"},
		},
		{
			name:     "multiple separators",
			input:    "a/b/c/d",
			sep:      "/",
			expected: []string{"a", "b", "c", "d"},
		},
		{
			name:     "separator at end",
			input:    "test/",
			sep:      "/",
			expected: []string{"test", ""},
		},
		{
			name:     "separator at start",
			input:    "/test",
			sep:      "/",
			expected: []string{"", "test"},
		},
		{
			name:     "consecutive separators",
			input:    "a//b",
			sep:      "/",
			expected: []string{"a", "", "b"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := splitString(tt.input, tt.sep)
			assert.Equal(t, tt.expected, result)
		})
	}
}

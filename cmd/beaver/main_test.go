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
	originalAIEnhanced := aiEnhanced
	originalExportWiki := exportWiki

	defer func() {
		includeClosed = originalIncludeClosed
		maxIssuesForAnalysis = originalMaxIssues
		aiEnhanced = originalAIEnhanced
		exportWiki = originalExportWiki
	}()

	// Test with different flag values
	includeClosed = true
	maxIssuesForAnalysis = 100
	aiEnhanced = false
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
		tests := []struct {
			priority string
			expected string
		}{
			{"critical", "🚨"},
			{"high", "🔴"},
			{"medium", "🟡"},
			{"low", "🟢"},
			{"unknown", "⚪"},
		}
		for _, test := range tests {
			result := getPriorityIcon(test.priority)
			assert.Equal(t, test.expected, result)
		}
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
			_ = getPriorityIcon("test")
			_ = formatDuration(time.Hour)
		})
	})
}

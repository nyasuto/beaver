package main

import (
	"os"
	"testing"
	"time"

	"github.com/nyasuto/beaver/pkg/troubleshooting"
	"github.com/spf13/cobra"
)

func TestRunGenerateTroubleshooting_InvalidRepo(t *testing.T) {
	cmd := &cobra.Command{}
	err := runGenerateTroubleshooting(cmd, []string{"invalid-repo-format"})

	if err == nil {
		t.Error("Expected error for invalid repository format, got nil")
	}
	if !containsStringAnywhere(err.Error(), "無効なリポジトリパス") {
		t.Errorf("Expected invalid repository path error, got: %v", err)
	}
}

func TestRunGenerateTroubleshooting_NoConfig(t *testing.T) {
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

	// Clear GitHub token environment variable
	originalGitHubToken := os.Getenv("GITHUB_TOKEN")
	defer func() {
		if originalGitHubToken != "" {
			os.Setenv("GITHUB_TOKEN", originalGitHubToken)
		} else {
			os.Unsetenv("GITHUB_TOKEN")
		}
	}()
	os.Unsetenv("GITHUB_TOKEN")

	cmd := &cobra.Command{}
	err := runGenerateTroubleshooting(cmd, []string{"owner/repo"})

	if err == nil {
		t.Error("Expected error when no config and no GitHub token, got nil")
	}
	if !containsStringAnywhere(err.Error(), "GitHub token not found") && !containsStringAnywhere(err.Error(), "failed to fetch issues") {
		t.Errorf("Expected GitHub token or API error, got: %v", err)
	}
}

func TestRunGenerateTroubleshooting_WithGitHubTokenFromEnv(t *testing.T) {
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

	// Set GitHub token environment variable
	originalGitHubToken := os.Getenv("GITHUB_TOKEN")
	defer func() {
		if originalGitHubToken != "" {
			os.Setenv("GITHUB_TOKEN", originalGitHubToken)
		} else {
			os.Unsetenv("GITHUB_TOKEN")
		}
	}()
	os.Setenv("GITHUB_TOKEN", "fake-token-for-testing")

	cmd := &cobra.Command{}
	err := runGenerateTroubleshooting(cmd, []string{"owner/repo"})

	// Should get past the token check but fail at GitHub API call
	if err == nil {
		t.Error("Expected error at GitHub API call, got nil")
	}
	// Should not be a token error since we set the environment variable
	if containsStringAnywhere(err.Error(), "GitHub token not found") {
		t.Errorf("Should not get token error when GITHUB_TOKEN is set, got: %v", err)
	}
}

func TestRunGenerateTroubleshooting_NoIssues(t *testing.T) {
	// This would require a more complex mock setup to test the case
	// where GitHub API returns successfully but with no issues
	// For now, we'll just test that the function can be called

	// Save environment
	originalGitHubToken := os.Getenv("GITHUB_TOKEN")
	defer func() {
		if originalGitHubToken != "" {
			os.Setenv("GITHUB_TOKEN", originalGitHubToken)
		} else {
			os.Unsetenv("GITHUB_TOKEN")
		}
	}()

	os.Setenv("GITHUB_TOKEN", "fake-token")

	cmd := &cobra.Command{}
	err := runGenerateTroubleshooting(cmd, []string{"owner/repo"})

	// We expect this to fail at GitHub API call, but that's fine for coverage
	if err == nil {
		t.Error("Expected error at GitHub API call, got nil")
	}
}

// TestParseRepoPath is already tested in utils_test.go (as TestParseOwnerRepo)

func TestGetSeverityIcon(t *testing.T) {
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

	for _, tt := range tests {
		t.Run(tt.severity, func(t *testing.T) {
			got := getSeverityIcon(tt.severity)
			if got != tt.expected {
				t.Errorf("getSeverityIcon(%q) = %q, want %q", tt.severity, got, tt.expected)
			}
		})
	}
}

func TestGetDifficultyIcon(t *testing.T) {
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

	for _, tt := range tests {
		t.Run(tt.difficulty, func(t *testing.T) {
			got := getDifficultyIcon(tt.difficulty)
			if got != tt.expected {
				t.Errorf("getDifficultyIcon(%q) = %q, want %q", tt.difficulty, got, tt.expected)
			}
		})
	}
}

func TestGetPriorityIcon(t *testing.T) {
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

	for _, tt := range tests {
		t.Run(tt.priority, func(t *testing.T) {
			got := getPriorityIcon(tt.priority)
			if got != tt.expected {
				t.Errorf("getPriorityIcon(%q) = %q, want %q", tt.priority, got, tt.expected)
			}
		})
	}
}

func TestFormatDuration(t *testing.T) {
	tests := []struct {
		duration string
		expected string
	}{
		{"30m", "30分"},
		{"1h30m", "1.5時間"},
		{"25h", "1.0日"},
		{"72h", "3.0日"},
	}

	for _, tt := range tests {
		t.Run(tt.duration, func(t *testing.T) {
			// Parse the duration string
			d, err := time.ParseDuration(tt.duration)
			if err != nil {
				t.Fatalf("Failed to parse duration %q: %v", tt.duration, err)
			}

			got := formatDuration(d)
			if got != tt.expected {
				t.Errorf("formatDuration(%v) = %q, want %q", d, got, tt.expected)
			}
		})
	}
}

func TestNewPythonAIService(t *testing.T) {
	service := NewPythonAIService()
	if service == nil {
		t.Error("NewPythonAIService() returned nil")
	}
}

func TestSaveTroubleshootingGuide_JSON(t *testing.T) {
	// Create a test troubleshooting guide
	guide := createTestTroubleshootingGuide()

	tmpDir := t.TempDir()
	filename := tmpDir + "/test-guide.json"

	err := saveTroubleshootingGuide(guide, filename, "json")
	if err != nil {
		t.Errorf("saveTroubleshootingGuide failed: %v", err)
	}

	// Verify file exists
	if _, err := os.Stat(filename); os.IsNotExist(err) {
		t.Error("JSON guide file was not created")
	}
}

func TestSaveTroubleshootingGuide_Wiki(t *testing.T) {
	// Create a test troubleshooting guide
	guide := createTestTroubleshootingGuide()

	tmpDir := t.TempDir()
	filename := tmpDir + "/test-guide.md"

	err := saveTroubleshootingGuide(guide, filename, "wiki")
	if err != nil {
		t.Errorf("saveTroubleshootingGuide failed: %v", err)
	}

	// Verify file exists
	if _, err := os.Stat(filename); os.IsNotExist(err) {
		t.Error("Wiki guide file was not created")
	}
}

func TestSaveTroubleshootingGuide_UnsupportedFormat(t *testing.T) {
	guide := createTestTroubleshootingGuide()

	tmpDir := t.TempDir()
	filename := tmpDir + "/test-guide.xyz"

	err := saveTroubleshootingGuide(guide, filename, "unsupported")
	if err == nil {
		t.Error("Expected error for unsupported format, got nil")
	}
	if !containsStringAnywhere(err.Error(), "unsupported format") {
		t.Errorf("Expected unsupported format error, got: %v", err)
	}
}

// TestGenerateTroubleshootingWikiContent is already tested in generate_test.go

// Helper function to create a test troubleshooting guide
func createTestTroubleshootingGuide() *troubleshooting.TroubleshootingGuide {
	// Create a minimal test guide structure
	return &troubleshooting.TroubleshootingGuide{
		ProjectName:      "test-project",
		GeneratedAt:      time.Now(),
		TotalIssues:      10,
		SolvedIssues:     8,
		ErrorPatterns:    []troubleshooting.ErrorPattern{},
		Solutions:        []troubleshooting.Solution{},
		PreventionGuides: []troubleshooting.PreventionGuide{},
		EmergencyActions: []troubleshooting.EmergencyAction{},
	}
}

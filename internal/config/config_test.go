package config

import (
	"os"
	"strings"
	"testing"
	"time"

	"github.com/spf13/viper"
)

func TestConfig_Validate(t *testing.T) {
	tests := []struct {
		name      string
		config    Config
		wantError bool
		errorMsg  string
	}{
		{
			name: "Valid configuration",
			config: Config{
				Project: ProjectConfig{
					Repository: "owner/repo",
				},
				Sources: SourcesConfig{
					GitHub: GitHubConfig{
						Token: "test-token",
					},
				},
				Output: OutputConfig{
					GitHubPages: GitHubPagesConfig{
						Theme:  "minima",
						Branch: "gh-pages",
					},
				},
				AI: AIConfig{
					Provider: "openai",
				},
			},
			wantError: false,
		},
		{
			name: "Missing repository",
			config: Config{
				Sources: SourcesConfig{
					GitHub: GitHubConfig{
						Token: "test-token",
					},
				},
				Output: OutputConfig{
					GitHubPages: GitHubPagesConfig{
						Theme:  "minima",
						Branch: "gh-pages",
					},
				},
				AI: AIConfig{
					Provider: "openai",
				},
			},
			wantError: true,
			errorMsg:  "project.repository は必須設定です",
		},
		{
			name: "Missing GitHub token",
			config: Config{
				Project: ProjectConfig{
					Repository: "owner/repo",
				},
				Output: OutputConfig{
					GitHubPages: GitHubPagesConfig{
						Theme:  "minima",
						Branch: "gh-pages",
					},
				},
				AI: AIConfig{
					Provider: "openai",
				},
			},
			wantError: true,
			errorMsg:  "GitHub token が設定されていません。GITHUB_TOKEN 環境変数または設定ファイルで指定してください",
		},
		{
			name: "Invalid GitHub Pages theme",
			config: Config{
				Project: ProjectConfig{
					Repository: "owner/repo",
				},
				Sources: SourcesConfig{
					GitHub: GitHubConfig{
						Token: "test-token",
					},
				},
				Output: OutputConfig{
					GitHubPages: GitHubPagesConfig{
						Theme: "invalid-theme",
					},
				},
				AI: AIConfig{
					Provider: "openai",
				},
			},
			wantError: true,
			errorMsg:  "GitHub Pages設定エラー: 無効なtheme 'invalid-theme'",
		},
		{
			name: "Invalid AI provider",
			config: Config{
				Project: ProjectConfig{
					Repository: "owner/repo",
				},
				Sources: SourcesConfig{
					GitHub: GitHubConfig{
						Token: "test-token",
					},
				},
				Output: OutputConfig{
					GitHubPages: GitHubPagesConfig{
						Theme:  "minima",
						Branch: "gh-pages",
					},
				},
				AI: AIConfig{
					Provider: "invalid",
				},
			},
			wantError: true,
			errorMsg:  "無効な AI provider: invalid",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.config.Validate()
			if tt.wantError {
				if err == nil {
					t.Errorf("Validate() expected error but got none")
					return
				}
				if tt.errorMsg != "" && err.Error() != tt.errorMsg {
					t.Errorf("Validate() error = %v, want error containing %v", err, tt.errorMsg)
				}
			} else {
				if err != nil {
					t.Errorf("Validate() unexpected error = %v", err)
				}
			}
		})
	}
}

func TestCreateDefaultConfig(t *testing.T) {
	// Create a temporary directory for testing
	tempDir := t.TempDir()
	oldDir, _ := os.Getwd()
	defer os.Chdir(oldDir)

	// Change to temp directory
	os.Chdir(tempDir)

	t.Run("Create new config file", func(t *testing.T) {
		err := CreateDefaultConfig()
		if err != nil {
			t.Errorf("CreateDefaultConfig() error = %v", err)
			return
		}

		// Check if file was created
		if _, err := os.Stat("beaver.yml"); os.IsNotExist(err) {
			t.Error("CreateDefaultConfig() did not create beaver.yml file")
		}

		// Check file content
		content, err := os.ReadFile("beaver.yml")
		if err != nil {
			t.Errorf("Failed to read created config file: %v", err)
			return
		}

		contentStr := string(content)
		expectedParts := []string{
			"project:",
			"repository:",
			"sources:",
			"github:",
			"output:",
			"github_pages:",
			"ai:",
			"provider:",
		}

		for _, part := range expectedParts {
			if !contains(contentStr, part) {
				t.Errorf("CreateDefaultConfig() created file missing expected content: %s", part)
			}
		}
	})

	t.Run("Attempt to create when file exists", func(t *testing.T) {
		// File should already exist from previous test
		err := CreateDefaultConfig()
		if err == nil {
			t.Error("CreateDefaultConfig() should return error when file already exists")
		}
	})
}

func TestGetConfigPath(t *testing.T) {
	// Create a temporary directory for testing
	tempDir := t.TempDir()
	oldDir, _ := os.Getwd()
	defer os.Chdir(oldDir)

	// Change to temp directory
	os.Chdir(tempDir)

	t.Run("No config file exists", func(t *testing.T) {
		_, err := GetConfigPath()
		if err == nil {
			t.Error("GetConfigPath() should return error when no config file exists")
		}
	})

	t.Run("beaver.yml exists", func(t *testing.T) {
		// Create test config file
		testContent := "test: config"
		err := os.WriteFile("beaver.yml", []byte(testContent), 0644)
		if err != nil {
			t.Fatalf("Failed to create test config file: %v", err)
		}

		path, err := GetConfigPath()
		if err != nil {
			t.Errorf("GetConfigPath() error = %v", err)
			return
		}

		if !strings.HasSuffix(path, "beaver.yml") {
			t.Errorf("GetConfigPath() should end with beaver.yml, got %v", path)
		}
	})

	t.Run("beaver.yaml exists", func(t *testing.T) {
		// Remove .yml file and create .yaml file
		os.Remove("beaver.yml")

		testContent := "test: config"
		err := os.WriteFile("beaver.yaml", []byte(testContent), 0644)
		if err != nil {
			t.Fatalf("Failed to create test config file: %v", err)
		}

		path, err := GetConfigPath()
		if err != nil {
			t.Errorf("GetConfigPath() error = %v", err)
			return
		}

		if !strings.HasSuffix(path, "beaver.yaml") {
			t.Errorf("GetConfigPath() should end with beaver.yaml, got %v", path)
		}
	})
}

func TestLoadConfig(t *testing.T) {
	// Create a temporary directory for testing
	tempDir := t.TempDir()
	oldDir, _ := os.Getwd()
	defer os.Chdir(oldDir)

	// Change to temp directory
	os.Chdir(tempDir)

	// Clear any existing viper configuration
	viper.Reset()

	t.Run("Load with default values when no config file", func(t *testing.T) {
		// Set required environment variable for validation to pass
		os.Setenv("GITHUB_TOKEN", "test-token")
		defer os.Unsetenv("GITHUB_TOKEN")

		config, err := LoadConfig()
		if err != nil {
			t.Errorf("LoadConfig() error = %v", err)
			return
		}

		if config == nil {
			t.Error("LoadConfig() returned nil config")
			return
		}

		// Check default values
		if config.AI.Provider != "openai" {
			t.Errorf("Expected default AI provider 'openai', got %s", config.AI.Provider)
		}
		if config.Output.GitHubPages.Theme != "minima" {
			t.Errorf("Expected default GitHub Pages theme 'minima', got %s", config.Output.GitHubPages.Theme)
		}
		if !config.Sources.GitHub.Issues {
			t.Error("Expected default GitHub issues to be true")
		}
	})

	t.Run("Load with custom config file", func(t *testing.T) {
		// Create custom config file
		configContent := `project:
  name: "Test Project"
  repository: "test/repo"

sources:
  github:
    issues: true
    commits: false
    prs: true

output:
  github_pages:
    theme: "minima"
    branch: "gh-pages"

ai:
  provider: "anthropic"
  model: "claude-3"
  features:
    summarization: true
    categorization: true
    troubleshooting: false
`
		err := os.WriteFile("beaver.yml", []byte(configContent), 0644)
		if err != nil {
			t.Fatalf("Failed to create test config file: %v", err)
		}

		// Set required environment variable
		os.Setenv("GITHUB_TOKEN", "test-token")
		defer os.Unsetenv("GITHUB_TOKEN")

		// Clear viper to force re-reading
		viper.Reset()

		config, err := LoadConfig()
		if err != nil {
			t.Errorf("LoadConfig() error = %v", err)
			return
		}

		// Verify custom values
		if config.Project.Name != "Test Project" {
			t.Errorf("Expected project name 'Test Project', got %s", config.Project.Name)
		}
		if config.Project.Repository != "test/repo" {
			t.Errorf("Expected repository 'test/repo', got %s", config.Project.Repository)
		}
		if config.Output.GitHubPages.Theme != "minima" {
			t.Errorf("Expected GitHub Pages theme 'minima', got %s", config.Output.GitHubPages.Theme)
		}
		if config.AI.Provider != "anthropic" {
			t.Errorf("Expected AI provider 'anthropic', got %s", config.AI.Provider)
		}
		if config.AI.Model != "claude-3" {
			t.Errorf("Expected AI model 'claude-3', got %s", config.AI.Model)
		}
	})

	t.Run("Environment variable override", func(t *testing.T) {
		// Set environment variables
		os.Setenv("GITHUB_TOKEN", "env-token")
		os.Setenv("OPENAI_API_KEY", "env-openai-key")
		defer func() {
			os.Unsetenv("GITHUB_TOKEN")
			os.Unsetenv("OPENAI_API_KEY")
		}()

		// Clear viper to force re-reading
		viper.Reset()

		config, err := LoadConfig()
		if err != nil {
			t.Errorf("LoadConfig() error = %v", err)
			return
		}

		// Check that environment variable overrode config value
		if config.Sources.GitHub.Token != "env-token" {
			t.Errorf("Expected GitHub token from env 'env-token', got %s", config.Sources.GitHub.Token)
		}
	})
}

func TestGetConfig(t *testing.T) {
	// Reset global config
	globalConfig = nil

	// Create a temporary directory for testing
	tempDir := t.TempDir()
	oldDir, _ := os.Getwd()
	defer os.Chdir(oldDir)

	// Change to temp directory
	os.Chdir(tempDir)

	// Clear viper
	viper.Reset()

	t.Run("Get config loads automatically", func(t *testing.T) {
		// Set required environment variable
		os.Setenv("GITHUB_TOKEN", "test-token")
		defer os.Unsetenv("GITHUB_TOKEN")

		config := GetConfig()
		if config == nil {
			t.Error("GetConfig() returned nil")
		}

		// Calling again should return the same instance
		config2 := GetConfig()
		if config != config2 {
			t.Error("GetConfig() should return the same instance on subsequent calls")
		}
	})
}

func TestConfigStructures(t *testing.T) {
	t.Run("ProjectConfig", func(t *testing.T) {
		pc := ProjectConfig{
			Name:       "Test Project",
			Repository: "owner/repo",
		}
		if pc.Name != "Test Project" {
			t.Errorf("Expected name 'Test Project', got %s", pc.Name)
		}
		if pc.Repository != "owner/repo" {
			t.Errorf("Expected repository 'owner/repo', got %s", pc.Repository)
		}
	})

	t.Run("GitHubConfig", func(t *testing.T) {
		ghc := GitHubConfig{
			Issues:  true,
			Commits: false,
			PRs:     true,
			Token:   "test-token",
		}
		if !ghc.Issues {
			t.Error("Expected Issues to be true")
		}
		if ghc.Commits {
			t.Error("Expected Commits to be false")
		}
		if !ghc.PRs {
			t.Error("Expected PRs to be true")
		}
		if ghc.Token != "test-token" {
			t.Errorf("Expected token 'test-token', got %s", ghc.Token)
		}
	})

	t.Run("AIFeatures", func(t *testing.T) {
		features := AIFeatures{
			Summarization:   true,
			Categorization:  false,
			Troubleshooting: true,
		}
		if !features.Summarization {
			t.Error("Expected Summarization to be true")
		}
		if features.Categorization {
			t.Error("Expected Categorization to be false")
		}
		if !features.Troubleshooting {
			t.Error("Expected Troubleshooting to be true")
		}
	})
}

// Helper function to check if a string contains a substring
func contains(s, substr string) bool {
	return len(substr) == 0 || (len(s) >= len(substr) && containsAt(s, substr, 0))
}

func containsAt(s, substr string, start int) bool {
	for i := start; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func TestTimezoneConfig(t *testing.T) {
	t.Run("Valid timezone configuration", func(t *testing.T) {
		config := Config{
			Project: ProjectConfig{
				Repository: "owner/repo",
			},
			Sources: SourcesConfig{
				GitHub: GitHubConfig{
					Token: "test-token",
				},
			},
			Output: OutputConfig{
				GitHubPages: GitHubPagesConfig{
					Theme:  "minima",
					Branch: "gh-pages",
				},
			},
			AI: AIConfig{
				Provider: "openai",
			},
			Timezone: TimezoneConfig{
				Location: "Asia/Tokyo",
				Format:   "2006-01-02 15:04:05 JST",
			},
		}

		err := config.Validate()
		if err != nil {
			t.Errorf("Validate() with valid timezone error = %v", err)
		}

		// Test GetTimezone
		location, err := config.GetTimezone()
		if err != nil {
			t.Errorf("GetTimezone() error = %v", err)
			return
		}

		if location.String() != "Asia/Tokyo" {
			t.Errorf("Expected timezone 'Asia/Tokyo', got %s", location.String())
		}
	})

	t.Run("Invalid timezone configuration", func(t *testing.T) {
		config := Config{
			Project: ProjectConfig{
				Repository: "owner/repo",
			},
			Sources: SourcesConfig{
				GitHub: GitHubConfig{
					Token: "test-token",
				},
			},
			Output: OutputConfig{
				GitHubPages: GitHubPagesConfig{
					Theme:  "minima",
					Branch: "gh-pages",
				},
			},
			AI: AIConfig{
				Provider: "openai",
			},
			Timezone: TimezoneConfig{
				Location: "Invalid/Timezone",
				Format:   "2006-01-02 15:04:05 JST",
			},
		}

		err := config.Validate()
		if err == nil {
			t.Error("Validate() should return error for invalid timezone")
		}
	})

	t.Run("FormatTime with Tokyo timezone", func(t *testing.T) {
		config := Config{
			Timezone: TimezoneConfig{
				Location: "Asia/Tokyo",
				Format:   "2006-01-02 15:04:05 JST",
			},
		}

		// Use a fixed time for consistent testing
		testTime := time.Date(2024, 6, 28, 12, 0, 0, 0, time.UTC)
		formatted, err := config.FormatTime(testTime)
		if err != nil {
			t.Errorf("FormatTime() error = %v", err)
			return
		}

		// In JST, UTC 12:00 becomes 21:00
		expected := "2024-06-28 21:00:00 JST"
		if formatted != expected {
			t.Errorf("FormatTime() expected '%s', got '%s'", expected, formatted)
		}
	})

	t.Run("Now returns time in configured timezone", func(t *testing.T) {
		config := Config{
			Timezone: TimezoneConfig{
				Location: "Asia/Tokyo",
				Format:   "2006-01-02 15:04:05 JST",
			},
		}

		now := config.Now()
		location := now.Location()

		if location.String() != "Asia/Tokyo" {
			t.Errorf("Now() should return time in Asia/Tokyo timezone, got %s", location.String())
		}
	})

	t.Run("Default timezone values", func(t *testing.T) {
		// Clear viper to get defaults
		viper.Reset()
		setDefaults()

		location := viper.GetString("timezone.location")
		format := viper.GetString("timezone.format")

		if location != "Asia/Tokyo" {
			t.Errorf("Default timezone location should be 'Asia/Tokyo', got %s", location)
		}

		if format != "2006-01-02 15:04:05 JST" {
			t.Errorf("Default timezone format should be '2006-01-02 15:04:05 JST', got %s", format)
		}
	})
}

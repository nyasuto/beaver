package config

import (
	"testing"
)

func TestConfig_GetGitHubPagesTargets(t *testing.T) {
	config := &Config{
		Output: OutputConfig{
			Targets: []OutputTarget{
				{
					Type: "github-pages",
					Config: map[string]interface{}{
						"theme":  "minima",
						"branch": "gh-pages",
					},
				},
				{
					Type: "notion",
					Config: map[string]interface{}{
						"database_id": "test-id",
					},
				},
				{
					Type: "github-pages",
					Config: map[string]interface{}{
						"theme":  "cayman",
						"branch": "main",
					},
				},
			},
		},
	}

	targets := config.GetGitHubPagesTargets()

	if len(targets) != 2 {
		t.Errorf("Expected 2 GitHub Pages targets, got %d", len(targets))
	}

	// Verify first GitHub Pages target
	if targets[0].Type != "github-pages" {
		t.Errorf("Expected type 'github-pages', got '%s'", targets[0].Type)
	}

	// Verify second GitHub Pages target
	if targets[1].Type != "github-pages" {
		t.Errorf("Expected type 'github-pages', got '%s'", targets[1].Type)
	}
}

func TestConfig_HasGitHubPages(t *testing.T) {
	tests := []struct {
		name     string
		config   *Config
		expected bool
	}{
		{
			name: "has GitHub Pages targets",
			config: &Config{
				Output: OutputConfig{
					Targets: []OutputTarget{
						{
							Type: "github-pages",
							Config: map[string]interface{}{
								"theme": "minima",
							},
						},
					},
				},
			},
			expected: true,
		},
		{
			name: "no GitHub Pages targets",
			config: &Config{
				Output: OutputConfig{
					Targets: []OutputTarget{
						{
							Type: "notion",
							Config: map[string]interface{}{
								"database_id": "test-id",
							},
						},
					},
				},
			},
			expected: false,
		},
		{
			name: "empty targets",
			config: &Config{
				Output: OutputConfig{
					Targets: []OutputTarget{},
				},
			},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.config.HasGitHubPages()
			if result != tt.expected {
				t.Errorf("Expected %v, got %v", tt.expected, result)
			}
		})
	}
}

func TestConfig_GetGitHubPagesConfig(t *testing.T) {
	config := &Config{}

	tests := []struct {
		name         string
		targetConfig map[string]interface{}
		expected     GitHubPagesConfig
	}{
		{
			name:         "nil config should return defaults",
			targetConfig: nil,
			expected: GitHubPagesConfig{
				Theme:        "minima",
				Branch:       "gh-pages",
				EnableSearch: true,
				BaseURL:      "",
			},
		},
		{
			name:         "empty config should return defaults",
			targetConfig: map[string]interface{}{},
			expected: GitHubPagesConfig{
				Theme:        "minima",
				Branch:       "gh-pages",
				EnableSearch: true,
				BaseURL:      "",
			},
		},
		{
			name: "full config should override defaults",
			targetConfig: map[string]interface{}{
				"theme":         "cayman",
				"domain":        "example.com",
				"enable_search": false,
				"analytics":     "GA-123456",
				"base_url":      "/myrepo",
				"branch":        "main",
			},
			expected: GitHubPagesConfig{
				Theme:        "cayman",
				Domain:       "example.com",
				EnableSearch: false,
				Analytics:    "GA-123456",
				BaseURL:      "/myrepo",
				Branch:       "main",
			},
		},
		{
			name: "partial config should use defaults for missing values",
			targetConfig: map[string]interface{}{
				"theme":  "architect",
				"domain": "mydomain.com",
				"branch": "master",
			},
			expected: GitHubPagesConfig{
				Theme:        "architect",
				Domain:       "mydomain.com",
				EnableSearch: true, // default
				Analytics:    "",   // default
				BaseURL:      "",   // default
				Branch:       "master",
			},
		},
		{
			name: "invalid type values should use defaults",
			targetConfig: map[string]interface{}{
				"theme":         123,       // invalid type
				"enable_search": "invalid", // invalid type
				"domain":        "valid.com",
			},
			expected: GitHubPagesConfig{
				Theme:        "minima", // default due to invalid type
				Domain:       "valid.com",
				EnableSearch: true,       // default due to invalid type
				Analytics:    "",         // default
				BaseURL:      "",         // default
				Branch:       "gh-pages", // default
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := config.GetGitHubPagesConfig(tt.targetConfig)

			if result.Theme != tt.expected.Theme {
				t.Errorf("Theme: expected '%s', got '%s'", tt.expected.Theme, result.Theme)
			}
			if result.Domain != tt.expected.Domain {
				t.Errorf("Domain: expected '%s', got '%s'", tt.expected.Domain, result.Domain)
			}
			if result.EnableSearch != tt.expected.EnableSearch {
				t.Errorf("EnableSearch: expected %v, got %v", tt.expected.EnableSearch, result.EnableSearch)
			}
			if result.Analytics != tt.expected.Analytics {
				t.Errorf("Analytics: expected '%s', got '%s'", tt.expected.Analytics, result.Analytics)
			}
			if result.BaseURL != tt.expected.BaseURL {
				t.Errorf("BaseURL: expected '%s', got '%s'", tt.expected.BaseURL, result.BaseURL)
			}
			if result.Branch != tt.expected.Branch {
				t.Errorf("Branch: expected '%s', got '%s'", tt.expected.Branch, result.Branch)
			}
		})
	}
}

func TestValidateOutputTargets(t *testing.T) {
	tests := []struct {
		name        string
		config      *Config
		expectError bool
		errorMsg    string
	}{
		{
			name: "valid targets",
			config: &Config{
				Output: OutputConfig{
					Targets: []OutputTarget{
						{
							Type: "github-pages",
							Config: map[string]interface{}{
								"theme":  "minima",
								"branch": "gh-pages",
							},
						},
					},
				},
			},
			expectError: false,
		},
		{
			name: "empty type",
			config: &Config{
				Output: OutputConfig{
					Targets: []OutputTarget{
						{
							Type:   "",
							Config: map[string]interface{}{},
						},
					},
				},
			},
			expectError: true,
			errorMsg:    "type は必須です",
		},
		{
			name: "invalid type",
			config: &Config{
				Output: OutputConfig{
					Targets: []OutputTarget{
						{
							Type:   "invalid-type",
							Config: map[string]interface{}{},
						},
					},
				},
			},
			expectError: true,
			errorMsg:    "無効なtype 'invalid-type'",
		},
		{
			name: "invalid GitHub Pages theme",
			config: &Config{
				Output: OutputConfig{
					Targets: []OutputTarget{
						{
							Type: "github-pages",
							Config: map[string]interface{}{
								"theme": "invalid-theme",
							},
						},
					},
				},
			},
			expectError: true,
			errorMsg:    "無効なtheme 'invalid-theme'",
		},
		{
			name: "invalid GitHub Pages branch",
			config: &Config{
				Output: OutputConfig{
					Targets: []OutputTarget{
						{
							Type: "github-pages",
							Config: map[string]interface{}{
								"branch": "feature-branch",
							},
						},
					},
				},
			},
			expectError: true,
			errorMsg:    "無効なbranch 'feature-branch'",
		},
		{
			name: "valid GitHub Pages with nil config",
			config: &Config{
				Output: OutputConfig{
					Targets: []OutputTarget{
						{
							Type:   "github-pages",
							Config: nil,
						},
					},
				},
			},
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.config.validateOutputTargets()

			if tt.expectError {
				if err == nil {
					t.Errorf("Expected error but got none")
					return
				}
				if tt.errorMsg != "" && !containsString(err.Error(), tt.errorMsg) {
					t.Errorf("Expected error message to contain '%s', got '%s'", tt.errorMsg, err.Error())
				}
				return
			}

			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
		})
	}
}

func TestValidateGitHubPagesConfig(t *testing.T) {
	config := &Config{}

	tests := []struct {
		name         string
		pagesConfig  map[string]interface{}
		expectError  bool
		errorMessage string
	}{
		{
			name: "valid config",
			pagesConfig: map[string]interface{}{
				"theme":  "minima",
				"branch": "gh-pages",
			},
			expectError: false,
		},
		{
			name: "invalid theme",
			pagesConfig: map[string]interface{}{
				"theme": "nonexistent-theme",
			},
			expectError:  true,
			errorMessage: "無効なtheme 'nonexistent-theme'",
		},
		{
			name: "invalid branch",
			pagesConfig: map[string]interface{}{
				"branch": "feature-branch",
			},
			expectError:  true,
			errorMessage: "無効なbranch 'feature-branch'",
		},
		{
			name:        "nil config",
			pagesConfig: nil,
			expectError: false,
		},
		{
			name: "empty theme string",
			pagesConfig: map[string]interface{}{
				"theme": "",
			},
			expectError: false, // Empty string should be allowed (will use default)
		},
		{
			name: "valid themes",
			pagesConfig: map[string]interface{}{
				"theme": "cayman",
			},
			expectError: false,
		},
		{
			name: "valid branches",
			pagesConfig: map[string]interface{}{
				"branch": "main",
			},
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := config.validateGitHubPagesConfig(tt.pagesConfig)

			if tt.expectError {
				if err == nil {
					t.Errorf("Expected error but got none")
					return
				}
				if tt.errorMessage != "" && !containsString(err.Error(), tt.errorMessage) {
					t.Errorf("Expected error message to contain '%s', got '%s'", tt.errorMessage, err.Error())
				}
				return
			}

			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
		})
	}
}

// Helper function to check if a string contains a substring
func containsString(haystack, needle string) bool {
	return len(haystack) >= len(needle) && (len(needle) == 0 || findSubstring(haystack, needle))
}

func findSubstring(haystack, needle string) bool {
	for i := 0; i <= len(haystack)-len(needle); i++ {
		match := true
		for j := 0; j < len(needle); j++ {
			if haystack[i+j] != needle[j] {
				match = false
				break
			}
		}
		if match {
			return true
		}
	}
	return false
}

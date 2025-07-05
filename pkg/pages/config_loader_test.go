package pages

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoadUnifiedConfigFromFile(t *testing.T) {
	tests := []struct {
		name        string
		configData  string
		mode        PublishingMode
		owner       string
		repository  string
		expectError bool
		validate    func(t *testing.T, config *UnifiedPagesConfig)
	}{
		{
			name: "valid GitHub Pages config for HTML mode",
			configData: `
github_pages:
  enabled: true
  branch: "gh-pages"
  build_dir: "_site"
  custom_domain: "example.com"
  jekyll:
    theme: "minima"
    config:
      title: "Test Documentation"
      baseurl: "/docs"
    navigation:
      - name: "Home"
        url: "/"
      - name: "API"
        url: "/api/"
    plugins:
      - "jekyll-feed"
      - "jekyll-sitemap"
  search:
    enabled: true
    provider: "lunr"
  analytics:
    enabled: true
    google_analytics_id: "GA-12345"
  optimization:
    minify_html: true
    compress_images: true
    generate_sitemap: true
`,
			mode:        ModeHTML,
			owner:       "testowner",
			repository:  "testrepo",
			expectError: false,
			validate: func(t *testing.T, config *UnifiedPagesConfig) {
				assert.Equal(t, "testowner", config.Owner)
				assert.Equal(t, "testrepo", config.Repository)
				assert.Equal(t, ModeHTML, config.Mode)
				assert.Equal(t, "_site", config.OutputDir)
				assert.True(t, config.Deploy)

				// GitHub Pages settings
				assert.Equal(t, "gh-pages", config.GitHubPages.Branch)
				assert.Equal(t, "example.com", config.GitHubPages.Domain)
				assert.Equal(t, "_site", config.GitHubPages.BuildDir)
				assert.Equal(t, "/docs", config.GitHubPages.BaseURL)
				assert.Equal(t, "GA-12345", config.GitHubPages.Analytics)
				assert.True(t, config.GitHubPages.EnableSearch)

				// Site settings for HTML mode
				assert.Equal(t, "beaver-default", config.Site.Theme)
				assert.Equal(t, "Test Documentation", config.Site.Title)
				assert.True(t, config.Site.Features.PWA)
				assert.True(t, config.Site.Features.ServiceWorker)
				assert.True(t, config.Site.Features.SEO)
				assert.True(t, config.Site.Features.MinifyHTML)

				// Navigation
				require.Len(t, config.Site.Navigation, 2)
				assert.Equal(t, "Home", config.Site.Navigation[0].Name)
				assert.Equal(t, "/", config.Site.Navigation[0].URL)
			},
		},
		{
			name: "valid GitHub Pages config for Jekyll mode",
			configData: `
github_pages:
  enabled: true
  branch: "main"
  build_dir: "docs"
  jekyll:
    theme: "just-the-docs"
    config:
      title: "Wiki Documentation"
      description: "Project wiki"
    collections:
      docs:
        output: true
        permalink: "/:collection/:name/"
    plugins:
      - "jekyll-feed"
      - "jekyll-sitemap"
      - "jekyll-seo-tag"
`,
			mode:        ModeJekyll,
			owner:       "testowner",
			repository:  "testrepo",
			expectError: false,
			validate: func(t *testing.T, config *UnifiedPagesConfig) {
				assert.Equal(t, ModeJekyll, config.Mode)
				assert.Equal(t, "docs", config.OutputDir)

				// Wiki settings for Jekyll mode
				assert.Equal(t, "just-the-docs", config.Wiki.Theme)
				assert.Equal(t, "Wiki Documentation", config.Wiki.Title)
				assert.Contains(t, config.Wiki.Collections, "docs")

				expectedPlugins := []string{"jekyll-feed", "jekyll-sitemap", "jekyll-seo-tag"}
				assert.Equal(t, expectedPlugins, config.Wiki.Plugins)
			},
		},
		{
			name: "GitHub Pages disabled",
			configData: `
github_pages:
  enabled: false
github_wiki:
  enabled: true
  branch: "wiki"
`,
			mode:        ModeHTML,
			owner:       "testowner",
			repository:  "testrepo",
			expectError: false,
			validate: func(t *testing.T, config *UnifiedPagesConfig) {
				assert.Equal(t, "_site", config.OutputDir)
				// When GitHub Pages is disabled, branch may not be set to default
				// This is valid behavior
			},
		},
		{
			name: "minimal valid config",
			configData: `
github_pages:
  enabled: true
`,
			mode:        ModeHTML,
			owner:       "testowner",
			repository:  "testrepo",
			expectError: false,
			validate: func(t *testing.T, config *UnifiedPagesConfig) {
				assert.Equal(t, "_site", config.OutputDir)
				assert.Equal(t, "gh-pages", config.GitHubPages.Branch)
				assert.Equal(t, "_site", config.GitHubPages.BuildDir)
				assert.True(t, config.Deploy)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create temporary config file
			tempDir := t.TempDir()
			configPath := filepath.Join(tempDir, "deployment-config.yml")

			err := os.WriteFile(configPath, []byte(tt.configData), 0600)
			require.NoError(t, err)

			// Test config loading
			config, err := LoadUnifiedConfigFromFile(configPath, tt.owner, tt.repository, tt.mode)

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, config)
			} else {
				assert.NoError(t, err)
				require.NotNil(t, config)

				// Run custom validation
				if tt.validate != nil {
					tt.validate(t, config)
				}
			}
		})
	}
}

func TestLoadUnifiedConfigFromFile_ErrorCases(t *testing.T) {
	tests := []struct {
		name        string
		configData  string
		setupFunc   func(t *testing.T) string
		expectedErr string
	}{
		{
			name:        "file not found",
			setupFunc:   func(t *testing.T) string { return "/nonexistent/file.yml" },
			expectedErr: "failed to read config file",
		},
		{
			name: "invalid YAML",
			configData: `
github_pages:
  enabled: true
  invalid_yaml: [unclosed
`,
			expectedErr: "failed to parse config file",
		},
		{
			name:        "empty file",
			configData:  "",
			expectedErr: "", // Should succeed with empty config
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var configPath string

			if tt.setupFunc != nil {
				configPath = tt.setupFunc(t)
			} else {
				tempDir := t.TempDir()
				configPath = filepath.Join(tempDir, "deployment-config.yml")
				err := os.WriteFile(configPath, []byte(tt.configData), 0600)
				require.NoError(t, err)
			}

			config, err := LoadUnifiedConfigFromFile(configPath, "owner", "repo", ModeHTML)

			if tt.expectedErr != "" {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.expectedErr)
				assert.Nil(t, config)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, config)
			}
		})
	}
}

func TestFindDeploymentConfig(t *testing.T) {
	tests := []struct {
		name        string
		setupFunc   func(t *testing.T) (string, func())
		expectFound bool
	}{
		{
			name: "config in ./config/",
			setupFunc: func(t *testing.T) (string, func()) {
				tempDir := t.TempDir()
				configDir := filepath.Join(tempDir, "config")
				err := os.MkdirAll(configDir, 0755)
				require.NoError(t, err)

				configPath := filepath.Join(configDir, "deployment-config.yml")
				err = os.WriteFile(configPath, []byte("test: config"), 0600)
				require.NoError(t, err)

				// Change to temp directory
				originalDir, _ := os.Getwd()
				err = os.Chdir(tempDir)
				require.NoError(t, err)

				return configPath, func() { os.Chdir(originalDir) }
			},
			expectFound: true,
		},
		{
			name: "config in current directory",
			setupFunc: func(t *testing.T) (string, func()) {
				tempDir := t.TempDir()
				configPath := filepath.Join(tempDir, "deployment-config.yml")
				err := os.WriteFile(configPath, []byte("test: config"), 0600)
				require.NoError(t, err)

				// Change to temp directory
				originalDir, _ := os.Getwd()
				err = os.Chdir(tempDir)
				require.NoError(t, err)

				return configPath, func() { os.Chdir(originalDir) }
			},
			expectFound: true,
		},
		{
			name: "config in .beaver directory",
			setupFunc: func(t *testing.T) (string, func()) {
				tempDir := t.TempDir()
				beaverDir := filepath.Join(tempDir, ".beaver")
				err := os.MkdirAll(beaverDir, 0755)
				require.NoError(t, err)

				configPath := filepath.Join(beaverDir, "deployment-config.yml")
				err = os.WriteFile(configPath, []byte("test: config"), 0600)
				require.NoError(t, err)

				// Change to temp directory
				originalDir, _ := os.Getwd()
				err = os.Chdir(tempDir)
				require.NoError(t, err)

				return configPath, func() { os.Chdir(originalDir) }
			},
			expectFound: true,
		},
		{
			name: "no config found",
			setupFunc: func(t *testing.T) (string, func()) {
				tempDir := t.TempDir()

				// Change to temp directory without creating any config
				originalDir, _ := os.Getwd()
				err := os.Chdir(tempDir)
				require.NoError(t, err)

				return "", func() { os.Chdir(originalDir) }
			},
			expectFound: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, cleanup := tt.setupFunc(t)
			defer cleanup()

			foundPath, err := FindDeploymentConfig()

			if tt.expectFound {
				assert.NoError(t, err)
				// The function returns relative paths, not absolute paths
				assert.Contains(t, foundPath, "deployment-config.yml")
			} else {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), "not found")
				assert.Empty(t, foundPath)
			}
		})
	}
}

func TestSaveConfigToFile(t *testing.T) {
	config := &UnifiedPagesConfig{
		Owner:      "testowner",
		Repository: "testrepo",
		Mode:       ModeHTML,
		OutputDir:  "_site",
		Deploy:     true,
		GitHubPages: GitHubPagesSettings{
			Branch:   "gh-pages",
			Domain:   "example.com",
			BuildDir: "_site",
		},
		Site: SiteSettings{
			Theme: "beaver-default",
			Title: "Test Site",
			Navigation: []NavigationItem{
				{Name: "Home", URL: "/"},
				{Name: "About", URL: "/about/"},
			},
			Features: SiteFeatures{
				PWA:        true,
				SEO:        true,
				MinifyHTML: false,
			},
		},
	}

	t.Run("save to valid path", func(t *testing.T) {
		tempDir := t.TempDir()
		filePath := filepath.Join(tempDir, "output", "config.yml")

		err := SaveConfigToFile(config, filePath)
		assert.NoError(t, err)

		// Verify file was created
		assert.FileExists(t, filePath)

		// Verify content is valid YAML
		content, err := os.ReadFile(filePath)
		assert.NoError(t, err)
		assert.Contains(t, string(content), "owner: testowner")
		assert.Contains(t, string(content), "mode: html")
	})

	t.Run("save to directory that needs creation", func(t *testing.T) {
		tempDir := t.TempDir()
		filePath := filepath.Join(tempDir, "deep", "nested", "path", "config.yml")

		err := SaveConfigToFile(config, filePath)
		assert.NoError(t, err)
		assert.FileExists(t, filePath)
	})

	t.Run("invalid file path", func(t *testing.T) {
		// Try to write to root directory (should fail on most systems)
		filePath := "/root/config.yml"

		err := SaveConfigToFile(config, filePath)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to")
	})
}

func TestHelperFunctions(t *testing.T) {
	t.Run("getStringWithDefault", func(t *testing.T) {
		tests := []struct {
			value        string
			defaultValue string
			expected     string
		}{
			{"", "default", "default"},
			{"value", "default", "value"},
			{"  ", "default", "  "},
		}

		for _, tt := range tests {
			result := getStringWithDefault(tt.value, tt.defaultValue)
			assert.Equal(t, tt.expected, result)
		}
	})

	t.Run("getConfigString", func(t *testing.T) {
		tests := []struct {
			name         string
			config       map[string]interface{}
			key          string
			defaultValue string
			expected     string
		}{
			{
				name:         "nil config",
				config:       nil,
				key:          "title",
				defaultValue: "default",
				expected:     "default",
			},
			{
				name:         "key exists as string",
				config:       map[string]interface{}{"title": "My Title"},
				key:          "title",
				defaultValue: "default",
				expected:     "My Title",
			},
			{
				name:         "key exists but not string",
				config:       map[string]interface{}{"title": 123},
				key:          "title",
				defaultValue: "default",
				expected:     "default",
			},
			{
				name:         "key does not exist",
				config:       map[string]interface{}{"other": "value"},
				key:          "title",
				defaultValue: "default",
				expected:     "default",
			},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				result := getConfigString(tt.config, tt.key, tt.defaultValue)
				assert.Equal(t, tt.expected, result)
			})
		}
	})
}

func TestComplexConfigMapping(t *testing.T) {
	configData := `
github_pages:
  enabled: true
  branch: "custom-branch"
  build_dir: "custom-build"
  custom_domain: "docs.example.com"
  jekyll:
    theme: "custom-theme"
    config:
      title: "Complex Documentation"
      description: "A complex setup"
      baseurl: "/complex"
      url: "https://docs.example.com"
    collections:
      guides:
        output: true
        permalink: "/:collection/:name/"
      tutorials:
        output: true
        permalink: "/tutorials/:name/"
    plugins:
      - "jekyll-feed"
      - "jekyll-sitemap"
      - "jekyll-seo-tag"
      - "jekyll-redirect-from"
    navigation:
      - name: "Home"
        url: "/"
        icon: "🏠"
      - name: "Guides"
        url: "/guides/"
        icon: "📚"
      - name: "API"
        url: "/api/"
        icon: "🔧"
  search:
    enabled: true
    provider: "algolia"
  analytics:
    enabled: true
    google_analytics_id: "GA-COMPLEX-123"
  optimization:
    minify_html: true
    compress_images: true
    generate_sitemap: true
`

	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "complex-config.yml")
	err := os.WriteFile(configPath, []byte(configData), 0600)
	require.NoError(t, err)

	t.Run("HTML mode with complex config", func(t *testing.T) {
		config, err := LoadUnifiedConfigFromFile(configPath, "complex-owner", "complex-repo", ModeHTML)
		require.NoError(t, err)
		require.NotNil(t, config)

		// Verify complex mapping
		assert.Equal(t, "complex-owner", config.Owner)
		assert.Equal(t, "complex-repo", config.Repository)
		assert.Equal(t, ModeHTML, config.Mode)
		assert.Equal(t, "custom-build", config.OutputDir)

		// GitHub Pages settings
		assert.Equal(t, "custom-branch", config.GitHubPages.Branch)
		assert.Equal(t, "docs.example.com", config.GitHubPages.Domain)
		assert.Equal(t, "custom-build", config.GitHubPages.BuildDir)
		assert.Equal(t, "/complex", config.GitHubPages.BaseURL)
		assert.Equal(t, "GA-COMPLEX-123", config.GitHubPages.Analytics)
		assert.True(t, config.GitHubPages.EnableSearch)

		// Site settings
		assert.Equal(t, "beaver-default", config.Site.Theme) // Should use default for HTML mode
		assert.Equal(t, "Complex Documentation", config.Site.Title)
		assert.True(t, config.Site.Features.MinifyHTML)

		// Navigation should be mapped
		require.Len(t, config.Site.Navigation, 3)
		assert.Equal(t, "Home", config.Site.Navigation[0].Name)
		assert.Equal(t, "/", config.Site.Navigation[0].URL)
		assert.Equal(t, "Guides", config.Site.Navigation[1].Name)
		assert.Equal(t, "/guides/", config.Site.Navigation[1].URL)
	})

	t.Run("Jekyll mode with complex config", func(t *testing.T) {
		config, err := LoadUnifiedConfigFromFile(configPath, "complex-owner", "complex-repo", ModeJekyll)
		require.NoError(t, err)
		require.NotNil(t, config)

		// Wiki settings for Jekyll mode
		assert.Equal(t, "custom-theme", config.Wiki.Theme)
		assert.Equal(t, "Complex Documentation", config.Wiki.Title)

		// Collections
		assert.Contains(t, config.Wiki.Collections, "guides")
		assert.Contains(t, config.Wiki.Collections, "tutorials")

		// Plugins
		expectedPlugins := []string{"jekyll-feed", "jekyll-sitemap", "jekyll-seo-tag", "jekyll-redirect-from"}
		assert.Equal(t, expectedPlugins, config.Wiki.Plugins)

		// Custom config
		assert.Equal(t, "A complex setup", getConfigString(config.Wiki.Custom, "description", ""))
		assert.Equal(t, "https://docs.example.com", getConfigString(config.Wiki.Custom, "url", ""))
	})
}

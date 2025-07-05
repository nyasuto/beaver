package pages

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUnifiedPagesConfig_Validate(t *testing.T) {
	tests := []struct {
		name        string
		config      UnifiedPagesConfig
		expectError bool
		errorMsg    string
	}{
		{
			name: "valid HTML config",
			config: UnifiedPagesConfig{
				Owner:      "testowner",
				Repository: "testrepo",
				Mode:       ModeHTML,
			},
			expectError: false,
		},
		{
			name: "missing owner",
			config: UnifiedPagesConfig{
				Repository: "testrepo",
				Mode:       ModeHTML,
			},
			expectError: true,
			errorMsg:    "owner is required",
		},
		{
			name: "missing repository",
			config: UnifiedPagesConfig{
				Owner: "testowner",
				Mode:  ModeHTML,
			},
			expectError: true,
			errorMsg:    "repository is required",
		},
		{
			name: "invalid mode",
			config: UnifiedPagesConfig{
				Owner:      "testowner",
				Repository: "testrepo",
				Mode:       "invalid",
			},
			expectError: true,
			errorMsg:    "mode must be 'html' (only HTML mode is supported)",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.config.Validate()

			if tt.expectError {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errorMsg)
			} else {
				assert.NoError(t, err)
				// Check defaults are set
				assert.Equal(t, "_site", tt.config.OutputDir)
				assert.Equal(t, "gh-pages", tt.config.GitHubPages.Branch)
			}
		})
	}
}

func TestLoadDefaultUnifiedConfig(t *testing.T) {
	tests := []struct {
		name       string
		owner      string
		repository string
		mode       PublishingMode
		validate   func(t *testing.T, config *UnifiedPagesConfig)
	}{
		{
			name:       "HTML mode default config",
			owner:      "testowner",
			repository: "testrepo",
			mode:       ModeHTML,
			validate: func(t *testing.T, config *UnifiedPagesConfig) {
				assert.Equal(t, "testowner", config.Owner)
				assert.Equal(t, "testrepo", config.Repository)
				assert.Equal(t, ModeHTML, config.Mode)
				assert.Equal(t, "_site", config.OutputDir)
				assert.False(t, config.Deploy) // Should default to false for safety

				// Check site-specific settings
				assert.Equal(t, "beaver-default", config.Site.Theme)
				assert.Equal(t, "Beaver Documentation", config.Site.Title)
				assert.True(t, config.Site.Features.PWA)
				assert.True(t, config.Site.Features.SEO)

				// Check navigation items
				require.Len(t, config.Site.Navigation, 3)
				assert.Equal(t, "Home", config.Site.Navigation[0].Name)
				assert.Equal(t, "/", config.Site.Navigation[0].URL)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			config := LoadDefaultUnifiedConfig(tt.owner, tt.repository, tt.mode)
			require.NotNil(t, config)

			// Validate that the config is valid
			err := config.Validate()
			assert.NoError(t, err)

			// Run custom validation
			if tt.validate != nil {
				tt.validate(t, config)
			}
		})
	}
}

func TestPublishingMode_String(t *testing.T) {
	tests := []struct {
		mode     PublishingMode
		expected string
	}{
		{ModeHTML, "html"},
		{PublishingMode("unknown"), "unknown"},
	}

	for _, tt := range tests {
		t.Run(string(tt.mode), func(t *testing.T) {
			assert.Equal(t, tt.expected, string(tt.mode))
		})
	}
}

func TestUnifiedPagesConfig_Defaults(t *testing.T) {
	config := &UnifiedPagesConfig{
		Owner:      "testowner",
		Repository: "testrepo",
		Mode:       ModeHTML,
	}

	err := config.Validate()
	assert.NoError(t, err)

	// Check that defaults are applied
	assert.Equal(t, "_site", config.OutputDir)
	assert.Equal(t, "gh-pages", config.GitHubPages.Branch)
}

func TestNavigationItem(t *testing.T) {
	nav := NavigationItem{
		Name: "Home",
		URL:  "/",
		Icon: "🏠",
	}

	assert.Equal(t, "Home", nav.Name)
	assert.Equal(t, "/", nav.URL)
	assert.Equal(t, "🏠", nav.Icon)
}

func TestSiteFeatures(t *testing.T) {
	features := SiteFeatures{
		PWA:           true,
		ServiceWorker: true,
		SEO:           true,
		MinifyHTML:    false,
	}

	assert.True(t, features.PWA)
	assert.True(t, features.ServiceWorker)
	assert.True(t, features.SEO)
	assert.False(t, features.MinifyHTML)
}

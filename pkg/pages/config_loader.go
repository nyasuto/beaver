package pages

import (
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

// DeploymentConfig represents the structure of deployment-config.yml
type DeploymentConfig struct {
	GitHubPages GitHubPagesDeploymentConfig `yaml:"github_pages"`
	GitHubWiki  GitHubWikiDeploymentConfig  `yaml:"github_wiki"`
}

// GitHubPagesDeploymentConfig matches deployment-config.yml structure
type GitHubPagesDeploymentConfig struct {
	Enabled      bool               `yaml:"enabled"`
	Branch       string             `yaml:"branch"`
	BuildDir     string             `yaml:"build_dir"`
	Domain       string             `yaml:"custom_domain"`
	Jekyll       JekyllConfig       `yaml:"jekyll"`
	Search       SearchConfig       `yaml:"search"`
	Analytics    AnalyticsConfig    `yaml:"analytics"`
	Optimization OptimizationConfig `yaml:"optimization"`
}

// GitHubWikiDeploymentConfig matches deployment-config.yml structure
type GitHubWikiDeploymentConfig struct {
	Enabled   bool            `yaml:"enabled"`
	Branch    string          `yaml:"branch"`
	CloneURL  string          `yaml:"clone_url_template"`
	Content   ContentConfig   `yaml:"content"`
	Templates TemplatesConfig `yaml:"templates"`
	Sync      SyncConfig      `yaml:"sync"`
}

// JekyllConfig contains Jekyll-specific settings
type JekyllConfig struct {
	Theme       string                 `yaml:"theme"`
	Plugins     []string               `yaml:"plugins"`
	Config      map[string]interface{} `yaml:"config"`
	Collections map[string]interface{} `yaml:"collections"`
	Navigation  []NavigationItem       `yaml:"navigation"`
}

// SearchConfig contains search settings
type SearchConfig struct {
	Enabled  bool   `yaml:"enabled"`
	Provider string `yaml:"provider"`
}

// AnalyticsConfig contains analytics settings
type AnalyticsConfig struct {
	Enabled           bool   `yaml:"enabled"`
	GoogleAnalyticsID string `yaml:"google_analytics_id"`
}

// OptimizationConfig contains optimization settings
type OptimizationConfig struct {
	MinifyHTML      bool `yaml:"minify_html"`
	CompressImages  bool `yaml:"compress_images"`
	GenerateSitemap bool `yaml:"generate_sitemap"`
}

// ContentConfig contains content management settings
type ContentConfig struct {
	SourceDir       string           `yaml:"source_dir"`
	ExcludePatterns []string         `yaml:"exclude_patterns"`
	FileNaming      FileNamingConfig `yaml:"file_naming"`
}

// FileNamingConfig contains file naming conventions
type FileNamingConfig struct {
	ConvertSpaces   bool   `yaml:"convert_spaces"`
	ReplacementChar string `yaml:"replacement_char"`
	PreserveCase    bool   `yaml:"preserve_case"`
}

// TemplatesConfig contains template settings
type TemplatesConfig struct {
	HomePage string `yaml:"home_page"`
	Sidebar  string `yaml:"sidebar"`
}

// SyncConfig contains synchronization settings
type SyncConfig struct {
	Bidirectional      bool   `yaml:"bidirectional"`
	ConflictResolution string `yaml:"conflict_resolution"`
}

// LoadUnifiedConfigFromFile loads and converts deployment config to unified pages config
func LoadUnifiedConfigFromFile(configPath string, owner, repository string, mode PublishingMode) (*UnifiedPagesConfig, error) {
	// Read deployment config file
	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	var deployConfig DeploymentConfig
	if err := yaml.Unmarshal(data, &deployConfig); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}

	// Convert to unified config
	unifiedConfig := &UnifiedPagesConfig{
		Owner:      owner,
		Repository: repository,
		Mode:       mode,
		OutputDir:  "_site",
		Deploy:     true,
	}

	// Map GitHub Pages settings
	if deployConfig.GitHubPages.Enabled {
		unifiedConfig.GitHubPages = GitHubPagesSettings{
			Branch:       getStringWithDefault(deployConfig.GitHubPages.Branch, "gh-pages"),
			Domain:       deployConfig.GitHubPages.Domain,
			BuildDir:     getStringWithDefault(deployConfig.GitHubPages.BuildDir, "_site"),
			BaseURL:      getConfigString(deployConfig.GitHubPages.Jekyll.Config, "baseurl", ""),
			Analytics:    deployConfig.GitHubPages.Analytics.GoogleAnalyticsID,
			EnableSearch: deployConfig.GitHubPages.Search.Enabled,
		}
		unifiedConfig.OutputDir = unifiedConfig.GitHubPages.BuildDir
	}

	// Configure mode-specific settings
	switch mode {
	case ModeHTML:
		unifiedConfig.Site = SiteSettings{
			Theme:      "beaver-default",
			Title:      getConfigString(deployConfig.GitHubPages.Jekyll.Config, "title", "Beaver Documentation"),
			Navigation: deployConfig.GitHubPages.Jekyll.Navigation,
			Features: SiteFeatures{
				PWA:           true,
				ServiceWorker: true,
				SEO:           deployConfig.GitHubPages.Optimization.GenerateSitemap,
				MinifyHTML:    deployConfig.GitHubPages.Optimization.MinifyHTML,
			},
		}
	case ModeJekyll:
		unifiedConfig.Wiki = WikiSettings{
			Theme:       deployConfig.GitHubPages.Jekyll.Theme,
			Title:       getConfigString(deployConfig.GitHubPages.Jekyll.Config, "title", "Beaver Wiki"),
			Collections: deployConfig.GitHubPages.Jekyll.Collections,
			Plugins:     deployConfig.GitHubPages.Jekyll.Plugins,
			Custom:      deployConfig.GitHubPages.Jekyll.Config,
		}
	}

	return unifiedConfig, nil
}

// FindDeploymentConfig finds the deployment-config.yml file
func FindDeploymentConfig() (string, error) {
	// Search paths for deployment config
	searchPaths := []string{
		"./config/deployment-config.yml",
		"./deployment-config.yml",
		"./.beaver/deployment-config.yml",
		filepath.Join(os.Getenv("HOME"), ".beaver", "deployment-config.yml"),
	}

	for _, path := range searchPaths {
		if _, err := os.Stat(path); err == nil {
			return path, nil
		}
	}

	return "", fmt.Errorf("deployment-config.yml not found in any of the search paths")
}

// LoadDefaultUnifiedConfig creates a default unified configuration
func LoadDefaultUnifiedConfig(owner, repository string, mode PublishingMode) *UnifiedPagesConfig {
	config := &UnifiedPagesConfig{
		Owner:      owner,
		Repository: repository,
		Mode:       mode,
		OutputDir:  "_site",
		Deploy:     false, // Default to false for safety
		GitHubPages: GitHubPagesSettings{
			Branch:   "gh-pages",
			BuildDir: "_site",
		},
	}

	switch mode {
	case ModeHTML:
		config.Site = SiteSettings{
			Theme: "beaver-default",
			Title: "Beaver Documentation",
			Navigation: []NavigationItem{
				{Name: "Home", URL: "/"},
				{Name: "Issues", URL: "/issues/"},
				{Name: "Statistics", URL: "/statistics/"},
			},
			Features: SiteFeatures{
				PWA:           true,
				ServiceWorker: true,
				SEO:           true,
				MinifyHTML:    true,
			},
		}
	case ModeJekyll:
		config.Wiki = WikiSettings{
			Theme: "minima",
			Title: "Beaver Wiki",
			Plugins: []string{
				"jekyll-feed",
				"jekyll-sitemap",
				"jekyll-seo-tag",
			},
			Collections: map[string]interface{}{
				"docs": map[string]interface{}{
					"output":    true,
					"permalink": "/:collection/:name/",
				},
			},
		}
	}

	return config
}

// Helper functions
func getStringWithDefault(value, defaultValue string) string {
	if value == "" {
		return defaultValue
	}
	return value
}

func getConfigString(config map[string]interface{}, key, defaultValue string) string {
	if config == nil {
		return defaultValue
	}
	if value, ok := config[key].(string); ok {
		return value
	}
	return defaultValue
}

// SaveConfigToFile saves the unified config to a file (for debugging/validation)
func SaveConfigToFile(config *UnifiedPagesConfig, filePath string) error {
	data, err := yaml.Marshal(config)
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	if err := os.MkdirAll(filepath.Dir(filePath), 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	if err := os.WriteFile(filePath, data, 0600); err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}

	return nil
}

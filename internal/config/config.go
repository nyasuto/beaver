package config

import (
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"time"

	"github.com/spf13/viper"
)

// Config represents the Beaver configuration structure
type Config struct {
	Project  ProjectConfig  `mapstructure:"project"`
	Sources  SourcesConfig  `mapstructure:"sources"`
	Output   OutputConfig   `mapstructure:"output"`
	AI       AIConfig       `mapstructure:"ai"`
	Timezone TimezoneConfig `mapstructure:"timezone"`
}

// ProjectConfig holds project-specific settings
type ProjectConfig struct {
	Name       string `mapstructure:"name"`
	Repository string `mapstructure:"repository"`
}

// SourcesConfig defines data sources configuration
type SourcesConfig struct {
	GitHub GitHubConfig `mapstructure:"github"`
}

// GitHubConfig holds GitHub-specific settings
type GitHubConfig struct {
	Issues  bool   `mapstructure:"issues"`
	Commits bool   `mapstructure:"commits"`
	PRs     bool   `mapstructure:"prs"`
	Token   string `mapstructure:"token"`
}

// OutputConfig defines output destinations
type OutputConfig struct {
	GitHubPages GitHubPagesConfig `mapstructure:"github_pages"`
	Targets     []OutputTarget    `mapstructure:"targets"`
}

// OutputTarget defines a single output destination
type OutputTarget struct {
	Type   string                 `mapstructure:"type"`
	Config map[string]interface{} `mapstructure:"config"`
}

// GitHubPagesConfig holds GitHub Pages specific settings
type GitHubPagesConfig struct {
	Theme        string `mapstructure:"theme"`
	Domain       string `mapstructure:"domain"`
	EnableSearch bool   `mapstructure:"enable_search"`
	Analytics    string `mapstructure:"analytics"`
	BaseURL      string `mapstructure:"base_url"`
	Branch       string `mapstructure:"branch"`
}

// AIConfig holds AI processing settings
type AIConfig struct {
	Provider string     `mapstructure:"provider"`
	Model    string     `mapstructure:"model"`
	Features AIFeatures `mapstructure:"features"`
}

// AIFeatures defines which AI features are enabled
type AIFeatures struct {
	Summarization   bool `mapstructure:"summarization"`
	Categorization  bool `mapstructure:"categorization"`
	Troubleshooting bool `mapstructure:"troubleshooting"`
}

// TimezoneConfig holds timezone settings
type TimezoneConfig struct {
	Location string `mapstructure:"location"`
	Format   string `mapstructure:"format"`
}

var globalConfig *Config

// LoadConfig loads configuration from file and environment variables
func LoadConfig() (*Config, error) {
	// Check for custom config path from environment variable
	if configPath := os.Getenv("BEAVER_CONFIG_PATH"); configPath != "" {
		viper.SetConfigFile(configPath)
	} else {
		viper.SetConfigName("beaver")
		viper.SetConfigType("yaml")

		// Add config search paths
		viper.AddConfigPath(".")
		viper.AddConfigPath("$HOME/.beaver")
		viper.AddConfigPath("/etc/beaver")
	}

	// Environment variable settings
	viper.SetEnvPrefix("BEAVER")
	viper.AutomaticEnv()

	// Set defaults
	setDefaults()

	// Read config file
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			// Config file not found; use defaults
			fmt.Println("⚠️ 設定ファイルが見つかりません。デフォルト設定を使用します。")
		} else {
			return nil, fmt.Errorf("設定ファイル読み込みエラー: %w", err)
		}
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, fmt.Errorf("設定データ変換エラー: %w", err)
	}

	// Override with environment variables
	if token := os.Getenv("GITHUB_TOKEN"); token != "" {
		config.Sources.GitHub.Token = token
	}
	if apiKey := os.Getenv("OPENAI_API_KEY"); apiKey != "" {
		// OpenAI API key will be handled by AI service directly
		_ = apiKey
	}

	globalConfig = &config
	return &config, nil
}

// GetConfig returns the global configuration
func GetConfig() *Config {
	if globalConfig == nil {
		config, err := LoadConfig()
		if err != nil {
			panic(fmt.Sprintf("設定の取得に失敗: %v", err))
		}
		return config
	}
	return globalConfig
}

// CreateDefaultConfig creates a default beaver.yml configuration file
func CreateDefaultConfig() error {
	defaultConfig := `project:
  name: "私のAIエージェント学習記録"
  repository: "username/my-repo"

sources:
  github:
    issues: true
    commits: true
    prs: true
    # token: "your-github-token" # または環境変数 GITHUB_TOKEN を使用

output:
  # GitHub Pages configuration - primary output target
  github_pages:
    theme: "minima"           # Jekyll theme
    branch: "gh-pages"        # Target branch
    enable_search: false      # Enable search functionality
    # domain: ""              # Custom domain (optional)
    # analytics: ""           # Google Analytics ID (optional)
    # base_url: ""            # Base URL (auto-detected if empty)

ai:
  provider: "openai"      # openai, anthropic, local
  model: "gpt-4"
  features:
    summarization: true   # 要約
    categorization: true  # 分類
    troubleshooting: true # トラブルシューティング

timezone:
  location: "Asia/Tokyo"  # タイムゾーン設定 (JST)
  format: "2006-01-02 15:04:05 JST"  # 時刻フォーマット
`

	configPath := "beaver.yml"
	if _, err := os.Stat(configPath); err == nil {
		return fmt.Errorf("設定ファイル %s は既に存在します", configPath)
	}

	if err := os.WriteFile(configPath, []byte(defaultConfig), 0600); err != nil {
		return fmt.Errorf("設定ファイル作成エラー: %w", err)
	}

	fmt.Printf("✅ 設定ファイル %s を作成しました\n", configPath)
	return nil
}

// setDefaults sets default configuration values
func setDefaults() {
	viper.SetDefault("project.name", "Beaver Knowledge Dam")
	viper.SetDefault("sources.github.issues", true)
	viper.SetDefault("sources.github.commits", false)
	viper.SetDefault("sources.github.prs", false)
	viper.SetDefault("output.github_pages.theme", "minima")
	viper.SetDefault("output.github_pages.branch", "gh-pages")
	viper.SetDefault("output.github_pages.enable_search", false)
	viper.SetDefault("ai.provider", "openai")
	viper.SetDefault("ai.model", "gpt-4")
	viper.SetDefault("ai.features.summarization", true)
	viper.SetDefault("ai.features.categorization", false)
	viper.SetDefault("ai.features.troubleshooting", false)
	viper.SetDefault("timezone.location", "Asia/Tokyo")
	viper.SetDefault("timezone.format", "2006-01-02 15:04:05 JST")
}

// ValidateConfig validates the loaded configuration
func (c *Config) Validate() error {
	if c.Project.Repository == "" {
		return fmt.Errorf("project.repository は必須設定です")
	}

	if c.Sources.GitHub.Token == "" {
		return fmt.Errorf("GitHub token が設定されていません。GITHUB_TOKEN 環境変数または設定ファイルで指定してください")
	}

	// Validate GitHub Pages configuration
	if err := c.validateGitHubPages(); err != nil {
		return fmt.Errorf("GitHub Pages設定エラー: %w", err)
	}

	// Validate output targets
	if err := c.validateOutputTargets(); err != nil {
		return fmt.Errorf("出力設定エラー: %w", err)
	}

	validProviders := map[string]bool{
		"openai":    true,
		"anthropic": true,
		"local":     true,
	}
	if !validProviders[c.AI.Provider] {
		return fmt.Errorf("無効な AI provider: %s", c.AI.Provider)
	}

	// Validate timezone
	if _, err := time.LoadLocation(c.Timezone.Location); err != nil {
		return fmt.Errorf("無効なタイムゾーン: %s (%w)", c.Timezone.Location, err)
	}

	return nil
}

// validateOutputTargets validates the output targets configuration
func (c *Config) validateOutputTargets() error {
	validTargetTypes := map[string]bool{
		"github-pages": true,
		"notion":       true,
		"confluence":   true,
	}

	for i, target := range c.Output.Targets {
		if target.Type == "" {
			return fmt.Errorf("出力ターゲット %d: type は必須です", i+1)
		}

		if !validTargetTypes[target.Type] {
			return fmt.Errorf("出力ターゲット %d: 無効なtype '%s'", i+1, target.Type)
		}

		// Validate GitHub Pages specific configuration
		if target.Type == "github-pages" {
			if err := c.validateGitHubPagesConfig(target.Config); err != nil {
				return fmt.Errorf("出力ターゲット %d (GitHub Pages): %w", i+1, err)
			}
		}
	}

	return nil
}

// validateGitHubPages validates the main GitHub Pages configuration
func (c *Config) validateGitHubPages() error {
	// Validate theme
	if c.Output.GitHubPages.Theme != "" {
		validThemes := map[string]bool{
			"minima": true, "minimal": true, "modernist": true, "cayman": true,
			"architect": true, "slate": true, "merlot": true, "time-machine": true,
			"leap-day": true, "midnight": true, "tactile": true, "dinky": true,
		}
		if !validThemes[c.Output.GitHubPages.Theme] {
			return fmt.Errorf("無効なtheme '%s'", c.Output.GitHubPages.Theme)
		}
	}

	// Validate branch
	if c.Output.GitHubPages.Branch != "" {
		validBranches := map[string]bool{
			"gh-pages": true,
			"main":     true,
			"master":   true,
		}
		if !validBranches[c.Output.GitHubPages.Branch] {
			return fmt.Errorf("無効なbranch '%s': gh-pages, main, master のみサポート", c.Output.GitHubPages.Branch)
		}
	}

	return nil
}

// validateGitHubPagesConfig validates GitHub Pages specific settings
func (c *Config) validateGitHubPagesConfig(config map[string]interface{}) error {
	if config == nil {
		return nil // Use defaults
	}

	// Validate theme if specified
	if theme, exists := config["theme"]; exists {
		validThemes := map[string]bool{
			"minima":       true,
			"minimal":      true,
			"modernist":    true,
			"cayman":       true,
			"architect":    true,
			"slate":        true,
			"merlot":       true,
			"time-machine": true,
			"leap-day":     true,
			"midnight":     true,
			"tactile":      true,
			"dinky":        true,
		}

		if themeStr, ok := theme.(string); ok && themeStr != "" {
			if !validThemes[themeStr] {
				return fmt.Errorf("無効なtheme '%s'", themeStr)
			}
		}
	}

	// Validate branch if specified
	if branch, exists := config["branch"]; exists {
		if branchStr, ok := branch.(string); ok && branchStr != "" {
			validBranches := map[string]bool{
				"gh-pages": true,
				"main":     true,
				"master":   true,
			}
			if !validBranches[branchStr] {
				return fmt.Errorf("無効なbranch '%s' (gh-pages, main, master のみサポート)", branchStr)
			}
		}
	}

	return nil
}

// GetConfigPath returns the configuration file path if it exists
func GetConfigPath() (string, error) {
	for _, path := range []string{"./beaver.yml", "./beaver.yaml"} {
		if _, err := os.Stat(path); err == nil {
			abs, err := filepath.Abs(path)
			if err != nil {
				return path, nil
			}
			return abs, nil
		}
	}
	return "", fmt.Errorf("設定ファイルが見つかりません")
}

// GetTimezone returns the configured timezone location
func (c *Config) GetTimezone() (*time.Location, error) {
	return time.LoadLocation(c.Timezone.Location)
}

// FormatTime formats time according to the configured timezone and format
func (c *Config) FormatTime(t time.Time) (string, error) {
	location, err := c.GetTimezone()
	if err != nil {
		return "", err
	}

	localTime := t.In(location)
	return localTime.Format(c.Timezone.Format), nil
}

// Now returns the current time in the configured timezone
func (c *Config) Now() time.Time {
	location, err := c.GetTimezone()
	if err != nil {
		// Fallback to UTC if timezone loading fails
		utcTime := time.Now().UTC()
		slog.Info("🕐 TIMESTAMP DEBUG: Timezone loading failed, using UTC",
			"timestamp", utcTime.Format("2006-01-02 15:04:05 UTC"))
		return utcTime
	}
	currentTime := time.Now().In(location)
	slog.Info("🕐 TIMESTAMP DEBUG: Generated timestamp",
		"timezone", location.String(),
		"timestamp", currentTime.Format("2006-01-02 15:04:05 MST"))
	return currentTime
}

// GetGitHubPagesTargets returns all GitHub Pages output targets
func (c *Config) GetGitHubPagesTargets() []OutputTarget {
	var targets []OutputTarget
	for _, target := range c.Output.Targets {
		if target.Type == "github-pages" {
			targets = append(targets, target)
		}
	}
	return targets
}

// HasGitHubPages returns true if GitHub Pages output is configured
func (c *Config) HasGitHubPages() bool {
	return len(c.GetGitHubPagesTargets()) > 0
}

// GetGitHubPagesConfig converts a target config to GitHubPagesConfig
func (c *Config) GetGitHubPagesConfig(targetConfig map[string]interface{}) GitHubPagesConfig {
	config := GitHubPagesConfig{
		Theme:        "minima",   // Default theme
		Branch:       "gh-pages", // Default branch
		EnableSearch: true,       // Default enable search
		BaseURL:      "",         // Default empty (auto-detect)
	}

	if targetConfig == nil {
		return config
	}

	// Map configuration values with type safety
	if theme, ok := targetConfig["theme"].(string); ok && theme != "" {
		config.Theme = theme
	}
	if domain, ok := targetConfig["domain"].(string); ok {
		config.Domain = domain
	}
	if enableSearch, ok := targetConfig["enable_search"].(bool); ok {
		config.EnableSearch = enableSearch
	}
	if analytics, ok := targetConfig["analytics"].(string); ok {
		config.Analytics = analytics
	}
	if baseURL, ok := targetConfig["base_url"].(string); ok {
		config.BaseURL = baseURL
	}
	if branch, ok := targetConfig["branch"].(string); ok && branch != "" {
		config.Branch = branch
	}

	return config
}

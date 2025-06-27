package config

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/viper"
)

// Config represents the Beaver configuration structure
type Config struct {
	Project ProjectConfig `mapstructure:"project"`
	Sources SourcesConfig `mapstructure:"sources"`
	Output  OutputConfig  `mapstructure:"output"`
	AI      AIConfig      `mapstructure:"ai"`
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
	Wiki WikiConfig `mapstructure:"wiki"`
}

// WikiConfig holds wiki output settings
type WikiConfig struct {
	Platform  string `mapstructure:"platform"`
	Templates string `mapstructure:"templates"`
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

var globalConfig *Config

// LoadConfig loads configuration from file and environment variables
func LoadConfig() (*Config, error) {
	viper.SetConfigName("beaver")
	viper.SetConfigType("yaml")

	// Add config search paths
	viper.AddConfigPath(".")
	viper.AddConfigPath("$HOME/.beaver")
	viper.AddConfigPath("/etc/beaver")

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
  wiki:
    platform: "github"    # github, notion, confluence
    templates: "default"  # default, academic, startup

ai:
  provider: "openai"      # openai, anthropic, local
  model: "gpt-4"
  features:
    summarization: true   # 要約
    categorization: true  # 分類
    troubleshooting: true # トラブルシューティング
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
	viper.SetDefault("output.wiki.platform", "github")
	viper.SetDefault("output.wiki.templates", "default")
	viper.SetDefault("ai.provider", "openai")
	viper.SetDefault("ai.model", "gpt-4")
	viper.SetDefault("ai.features.summarization", true)
	viper.SetDefault("ai.features.categorization", false)
	viper.SetDefault("ai.features.troubleshooting", false)
}

// ValidateConfig validates the loaded configuration
func (c *Config) Validate() error {
	// Validate project name
	if c.Project.Name == "" {
		return fmt.Errorf("project.name は必須設定です")
	}

	// Allow placeholder repository values to pass validation
	// The build command will check for proper repository configuration
	if c.Project.Repository == "" {
		return fmt.Errorf("project.repository は必須設定です")
	}

	if c.Sources.GitHub.Token == "" {
		return fmt.Errorf("GitHub token が設定されていません。GITHUB_TOKEN 環境変数または設定ファイルで指定してください")
	}

	validPlatforms := map[string]bool{
		"github":     true,
		"notion":     true,
		"confluence": true,
	}
	if !validPlatforms[c.Output.Wiki.Platform] {
		return fmt.Errorf("無効な wiki platform: %s", c.Output.Wiki.Platform)
	}

	validProviders := map[string]bool{
		"openai":    true,
		"anthropic": true,
		"local":     true,
	}
	if !validProviders[c.AI.Provider] {
		return fmt.Errorf("無効な AI provider: %s", c.AI.Provider)
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

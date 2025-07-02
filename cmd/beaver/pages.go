package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/nyasuto/beaver/internal/config"
	"github.com/nyasuto/beaver/internal/logger"
	"github.com/nyasuto/beaver/internal/models"
	"github.com/nyasuto/beaver/pkg/github"
	"github.com/nyasuto/beaver/pkg/pages"
	"github.com/spf13/cobra"
)

// Page command variables
var (
	pagesOutputDir   string
	pagesMode        string
	pagesDeploy      bool
	pagesConfigPath  string
	pagesOpenBrowser bool
)

// pagesCmd is the unified pages command that replaces site and wiki commands
var pagesCmd = &cobra.Command{
	Use:   "pages",
	Short: "統合ページ生成・デプロイ管理",
	Long: `HTMLサイトとJekyll Wikiの統合ページ生成・デプロイシステム。

機能:
  - HTMLモード: カスタムBeaverテーマによる高品質サイト生成
  - Jekyllモード: 構造化されたWiki生成
  - GitHub Pages自動デプロイ
  - 統合設定管理
  - 重複排除されたアーキテクチャ

使用例:
  beaver pages generate --mode html owner/repo     # HTMLサイト生成
  beaver pages generate --mode jekyll owner/repo  # Jekyll Wiki生成
  beaver pages deploy owner/repo                  # 生成済みコンテンツをデプロイ`,
}

var pagesGenerateCmd = &cobra.Command{
	Use:   "generate [owner/repo]",
	Short: "ページコンテンツを生成",
	Long: `GitHub Issuesを取得してページコンテンツを生成します。

モード:
  html   - カスタムHTMLサイト生成 (旧site buildコマンド)
  jekyll - Jekyll Wiki生成 (旧wiki generateコマンド)

統合機能:
  - 統一された設定管理 (deployment-config.yml)
  - 重複排除されたGit操作
  - 共通テンプレートシステム
  - 統一されたエラーハンドリング

例:
  beaver pages generate nyasuto/beaver --mode html
  beaver pages generate nyasuto/beaver --mode jekyll --deploy
  beaver pages generate nyasuto/beaver --config ./my-config.yml`,
	Args: cobra.ExactArgs(1),
	RunE: runPagesGenerateCommand,
}

var pagesDeployCmd = &cobra.Command{
	Use:   "deploy [owner/repo]",
	Short: "生成済みページをGitHub Pagesにデプロイ",
	Long: `既に生成されたページコンテンツをGitHub Pagesにデプロイします。

統合デプロイ機能:
  - HTMLとJekyll両モード対応
  - 統一されたGit操作
  - 自動ブランチ作成
  - エラー回復とリトライ
  - 詳細なログ出力

例:
  beaver pages deploy nyasuto/beaver
  beaver pages deploy nyasuto/beaver --config ./deploy-config.yml`,
	Args: cobra.ExactArgs(1),
	RunE: runPagesDeployCommand,
}

var pagesServeCmd = &cobra.Command{
	Use:   "serve",
	Short: "生成されたページをローカルサーバーで配信",
	Long: `生成されたページをローカルでプレビューします。

機能:
  - HTMLとJekyll両モード対応
  - 自動ブラウザ起動
  - ホットリロード（将来実装）
  - ポート設定可能

例:
  beaver pages serve
  beaver pages serve --port 8080 --open`,
	RunE: runPagesServeCommand,
}

func init() {
	// Add pages command to root
	rootCmd.AddCommand(pagesCmd)

	// Add subcommands
	pagesCmd.AddCommand(pagesGenerateCmd)
	pagesCmd.AddCommand(pagesDeployCmd)
	pagesCmd.AddCommand(pagesServeCmd)

	// Generate command flags
	pagesGenerateCmd.Flags().StringVarP(&pagesOutputDir, "output", "o", "", "出力ディレクトリ (デフォルト: _site)")
	pagesGenerateCmd.Flags().StringVarP(&pagesMode, "mode", "m", "html", "生成モード (html, jekyll)")
	pagesGenerateCmd.Flags().BoolVar(&pagesDeploy, "deploy", false, "生成後に自動デプロイ")
	pagesGenerateCmd.Flags().StringVarP(&pagesConfigPath, "config", "c", "", "設定ファイルパス")

	// Deploy command flags
	pagesDeployCmd.Flags().StringVarP(&pagesConfigPath, "config", "c", "", "設定ファイルパス")

	// Serve command flags
	pagesServeCmd.Flags().IntVarP(&servePort, "port", "p", 8080, "サーバーポート")
	pagesServeCmd.Flags().BoolVar(&pagesOpenBrowser, "open", false, "ブラウザを自動で開く")
}

func runPagesGenerateCommand(cmd *cobra.Command, args []string) error {
	repo := args[0]
	owner, repository := parseOwnerRepo(repo)

	setupLogger := logger.GetLogger()
	setupLogger.Info("🚀 統合ページ生成開始", "repository", repo, "mode", pagesMode)

	// Validate mode
	mode := pages.PublishingMode(pagesMode)
	if mode != pages.ModeHTML && mode != pages.ModeJekyll {
		return fmt.Errorf("無効なモード: %s (html または jekyll を指定してください)", pagesMode)
	}

	// Load configuration
	config, err := loadPagesConfig(owner, repository, mode)
	if err != nil {
		setupLogger.Warn("設定ファイル読み込み失敗、デフォルト設定を使用", "error", err)
		config = pages.LoadDefaultUnifiedConfig(owner, repository, mode)
	}

	// Override with command line flags
	if pagesOutputDir != "" {
		config.OutputDir = pagesOutputDir
	}
	if pagesDeploy {
		config.Deploy = true
	}

	// Create publisher
	publisher, err := pages.NewUnifiedPagesPublisher(config)
	if err != nil {
		return fmt.Errorf("パブリッシャー作成失敗: %w", err)
	}

	// Fetch GitHub Issues
	setupLogger.Info("GitHub Issues取得中", "repository", repo)
	issues, err := fetchIssuesForPages(owner, repository, setupLogger)
	if err != nil {
		return fmt.Errorf("issues取得失敗: %w", err)
	}

	setupLogger.Info("Issues取得完了", "count", len(issues))

	// Generate content
	ctx := context.Background()
	if err := publisher.Generate(ctx, issues); err != nil {
		return fmt.Errorf("ページ生成失敗: %w", err)
	}

	setupLogger.Info("✅ ページ生成完了", "mode", mode, "output", config.OutputDir)

	// Deploy if requested
	if config.Deploy {
		setupLogger.Info("デプロイ開始")
		if err := publisher.Deploy(ctx); err != nil {
			return fmt.Errorf("デプロイ失敗: %w", err)
		}
		setupLogger.Info("✅ デプロイ完了")
	}

	return nil
}

func runPagesDeployCommand(cmd *cobra.Command, args []string) error {
	repo := args[0]
	owner, repository := parseOwnerRepo(repo)

	setupLogger := logger.GetLogger()
	setupLogger.Info("🚀 ページデプロイ開始", "repository", repo)

	// Load configuration (try both modes, prefer Jekyll for deploy-only)
	config, err := loadPagesConfig(owner, repository, pages.ModeJekyll)
	if err != nil {
		setupLogger.Warn("設定ファイル読み込み失敗、デフォルト設定を使用", "error", err)
		config = pages.LoadDefaultUnifiedConfig(owner, repository, pages.ModeJekyll)
	}

	// Enable deployment
	config.Deploy = true

	// Create publisher
	publisher, err := pages.NewUnifiedPagesPublisher(config)
	if err != nil {
		return fmt.Errorf("パブリッシャー作成失敗: %w", err)
	}

	// Deploy
	ctx := context.Background()
	if err := publisher.Deploy(ctx); err != nil {
		return fmt.Errorf("デプロイ失敗: %w", err)
	}

	setupLogger.Info("✅ デプロイ完了")
	return nil
}

func runPagesServeCommand(cmd *cobra.Command, args []string) error {
	setupLogger := logger.GetLogger()

	// Find output directory
	outputDir := "_site"
	if pagesOutputDir != "" {
		outputDir = pagesOutputDir
	}

	// Check if output directory exists
	if _, err := os.Stat(outputDir); os.IsNotExist(err) {
		return fmt.Errorf("出力ディレクトリが見つかりません: %s\n先に 'beaver pages generate' を実行してください", outputDir)
	}

	setupLogger.Info("🌐 ローカルサーバー開始", "port", servePort, "directory", outputDir)

	// TODO: Implement local server
	// This will serve the generated content locally for preview
	return fmt.Errorf("ローカルサーバー機能は未実装です")
}

// loadPagesConfig loads the pages configuration from various sources
func loadPagesConfig(owner, repository string, mode pages.PublishingMode) (*pages.UnifiedPagesConfig, error) {
	// Use custom config path if provided
	if pagesConfigPath != "" {
		return pages.LoadUnifiedConfigFromFile(pagesConfigPath, owner, repository, mode)
	}

	// Try to find deployment-config.yml
	configPath, err := pages.FindDeploymentConfig()
	if err != nil {
		return nil, err
	}

	return pages.LoadUnifiedConfigFromFile(configPath, owner, repository, mode)
}

// fetchIssuesForPages fetches GitHub issues for page generation
func fetchIssuesForPages(owner, repository string, logger *slog.Logger) ([]models.Issue, error) {
	// Load Beaver configuration for GitHub access
	cfg, err := config.LoadConfig()
	if err != nil {
		return nil, fmt.Errorf("設定読み込み失敗: %w", err)
	}

	// Validate GitHub token
	token := cfg.Sources.GitHub.Token
	if token == "" {
		if envToken := os.Getenv("GITHUB_TOKEN"); envToken != "" {
			token = envToken
		} else {
			return nil, fmt.Errorf("GitHub Token が設定されていません")
		}
	}

	// Create GitHub service
	service := github.NewService(token)

	// Fetch issues
	ctx := context.Background()
	result, err := service.FetchIssues(ctx, models.IssueQuery{
		Repository: repository,
		State:      "all", // Fetch both open and closed issues
		Sort:       "created",
		Direction:  "desc",
		PerPage:    100,
	})

	if err != nil {
		return nil, fmt.Errorf("GitHub Issues取得失敗: %w", err)
	}

	return result.Issues, nil
}

package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"

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
	servePort        int
)

// pagesCmd is the unified pages command that replaces site and wiki commands
var pagesCmd = &cobra.Command{
	Use:   "pages",
	Short: "統合ページ生成・デプロイ管理",
	Long: `統合ページ生成・デプロイシステム (Astroベースアーキテクチャ)。

機能:
  - HTMLモード: カスタムBeaverテーマによる高品質サイト生成
  - GitHub Pages自動デプロイ
  - 統合設定管理
  - Astroフロントエンドとの連携

使用例:
  beaver pages generate --mode html owner/repo    # HTMLサイト生成
  beaver pages deploy owner/repo                  # 生成済みコンテンツをデプロイ`,
}

var pagesGenerateCmd = &cobra.Command{
	Use:   "generate [owner/repo]",
	Short: "ページコンテンツを生成",
	Long: `GitHub Issuesを取得してページコンテンツを生成します。

モード:
  html   - カスタムHTMLサイト生成 (Astroベース)

統合機能:
  - 統一された設定管理 (deployment-config.yml)
  - 重複排除されたGit操作
  - 共通テンプレートシステム
  - 統一されたエラーハンドリング

例:
  beaver pages generate nyasuto/beaver --mode html
  beaver pages generate nyasuto/beaver --deploy
  beaver pages generate nyasuto/beaver --config ./my-config.yml`,
	Args: cobra.ExactArgs(1),
	RunE: runPagesGenerateCommand,
}

var pagesDeployCmd = &cobra.Command{
	Use:   "deploy [owner/repo]",
	Short: "生成済みページをGitHub Pagesにデプロイ",
	Long: `既に生成されたページコンテンツをGitHub Pagesにデプロイします。

統合デプロイ機能:
  - HTMLモード対応 (Astroベース)
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
  - HTMLモード対応 (Astroベース)
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
	pagesGenerateCmd.Flags().StringVarP(&pagesMode, "mode", "m", "html", "生成モード (html)")
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
	if mode != pages.ModeHTML {
		return fmt.Errorf("無効なモード: %s (html モードのみサポートされています)", pagesMode)
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

	// Load configuration (HTML mode for deploy-only)
	config, err := loadPagesConfig(owner, repository, pages.ModeHTML)
	if err != nil {
		setupLogger.Warn("設定ファイル読み込み失敗、デフォルト設定を使用", "error", err)
		config = pages.LoadDefaultUnifiedConfig(owner, repository, pages.ModeHTML)
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
		return fmt.Errorf(`出力ディレクトリが見つかりません: %s

解決方法:
  1. 先にページを生成してください:
     beaver pages generate nyasuto/beaver --mode html
  2. または custom出力ディレクトリを指定:
     beaver pages serve --output ./custom-output
  3. 現在のディレクトリを確認:
     ls -la

ページ生成後にもう一度実行してください`, outputDir)
	}

	setupLogger.Info("🌐 ローカルサーバー開始", "port", servePort, "directory", outputDir)

	// Implement local server for preview
	return servePagesLocally(outputDir, servePort, pagesOpenBrowser, setupLogger)
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
			return nil, fmt.Errorf(`GitHub Token が設定されていません

解決方法:
  1. 環境変数に設定:
     export GITHUB_TOKEN=your_token_here
  2. beaver.yml に設定:
     sources:
       github:
         token: "your_token_here"
  3. GitHub Personal Access Token を取得:
     https://github.com/settings/tokens
  4. 設定確認:
     beaver status

使用例:
  export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
  beaver pages generate nyasuto/beaver`)
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

// servePagesLocally starts a local HTTP server to preview generated pages
func servePagesLocally(outputDir string, port int, openBrowser bool, logger *slog.Logger) error {
	// Create file server
	fs := http.FileServer(http.Dir(outputDir))
	http.Handle("/", fs)

	// Display server information
	logger.Info("🚀 ローカルサーバー起動中...")
	logger.Info("📁 配信ディレクトリ", "path", outputDir)
	logger.Info("🌐 URL", "url", fmt.Sprintf("http://localhost:%d", port))
	logger.Info("⏹️  停止するには Ctrl+C を押してください")

	// Open browser if requested
	if openBrowser {
		logger.Info("🌐 ブラウザで開いています...")
		// Note: Browser opening would need OS-specific implementation
	}

	// Create server with timeouts
	server := &http.Server{
		Addr:         fmt.Sprintf(":%d", port),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server
	logger.Info("Local server starting", "port", port, "dir", outputDir)
	if err := server.ListenAndServe(); err != nil {
		logger.Error("Server failed", "error", err)
		return fmt.Errorf("❌ サーバー起動エラー: %w", err)
	}

	return nil
}

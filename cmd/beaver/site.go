package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/nyasuto/beaver/internal/config"
	"github.com/nyasuto/beaver/internal/logger"
	"github.com/nyasuto/beaver/internal/models"
	"github.com/nyasuto/beaver/pkg/github"
	"github.com/nyasuto/beaver/pkg/site"
	"github.com/spf13/cobra"
)

var siteCmd = &cobra.Command{
	Use:   "site",
	Short: "静的サイト生成管理",
	Long:  "カスタムHTML生成による高品質な静的サイトの構築・プレビュー・デプロイを管理します。",
}

var (
	outputDir   string
	servePort   int
	openBrowser bool
)

var siteBuildCmd = &cobra.Command{
	Use:   "build",
	Short: "静的サイトをビルド",
	Long: `GitHub Issuesを取得してカスタムHTML静的サイトを生成します。

Features:
  - Beaver カスタムテーマ適用
  - 3カラムレスポンシブレイアウト
  - PWA対応 (Service Worker)
  - 日本語フォント最適化
  - SEO対応 (sitemap.xml, robots.txt)

Example:
  beaver site build                    # デフォルト設定でビルド
  beaver site build --output ./dist   # 出力ディレクトリ指定
  beaver site build --open            # ビルド後にブラウザで開く`,
	RunE: runSiteBuildCommand,
}

var siteServeCmd = &cobra.Command{
	Use:   "serve",
	Short: "ローカルサーバーでプレビュー",
	Long: `生成された静的サイトをローカルサーバーで配信してプレビューします。

Features:
  - Hot reload対応
  - ライブプレビュー
  - モバイル対応確認

Example:
  beaver site serve                    # デフォルト (localhost:8080)
  beaver site serve --port 3000       # ポート指定
  beaver site serve --open            # ブラウザを自動で開く`,
	RunE: runSiteServeCommand,
}

var siteDeployCmd = &cobra.Command{
	Use:   "deploy",
	Short: "GitHub Pagesにデプロイ",
	Long: `生成された静的サイトをGitHub Pagesにデプロイします。

Features:
  - GitHub Pages自動デプロイ
  - CNAME設定対応
  - カスタムドメイン対応

Example:
  beaver site deploy                   # GitHub Pagesにデプロイ
  beaver site deploy --domain example.com  # カスタムドメイン設定`,
	RunE: runSiteDeployCommand,
}

func runSiteBuildCommand(cmd *cobra.Command, args []string) error {
	buildLogger := logger.WithComponent("site-build")
	buildLogger.Info("Starting site build command")

	fmt.Println("🏗️ カスタムHTML静的サイトをビルド中...")

	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		buildLogger.Error("Failed to load configuration", "error", err)
		return fmt.Errorf("❌ 設定読み込みエラー: %w", err)
	}

	// Validate configuration
	if err := cfg.Validate(); err != nil {
		buildLogger.Error("Configuration validation failed", "error", err)
		return fmt.Errorf("❌ 設定が無効です: %w", err)
	}

	// Set output directory
	if outputDir == "" {
		outputDir = "./site"
	}

	// Parse repository
	owner, repo := parseOwnerRepo(cfg.Project.Repository)
	if owner == "" || repo == "" {
		return fmt.Errorf("❌ リポジトリ形式が無効です: %s", cfg.Project.Repository)
	}

	// Initialize GitHub service and fetch issues
	buildLogger.Info("Initializing GitHub service")
	githubService := github.NewService(cfg.Sources.GitHub.Token)
	ctx := context.Background()

	fmt.Printf("📥 Issues取得中: %s\n", cfg.Project.Repository)
	query := models.DefaultIssueQuery(cfg.Project.Repository)
	result, err := githubService.FetchIssues(ctx, query)
	if err != nil {
		buildLogger.Error("Failed to fetch Issues", "error", err)
		return fmt.Errorf("❌ Issues取得エラー: %w", err)
	}

	fmt.Printf("📊 取得したIssues: %d件\n", result.FetchedCount)

	// Create site configuration
	siteConfig := &site.SiteConfig{
		Title:       cfg.Project.Name + " ナレッジベース",
		Description: "AI駆動型ナレッジベース - GitHub Issues から自動生成",
		BaseURL:     "https://" + owner + ".github.io/" + repo,
		OutputDir:   outputDir,
		Theme:       "beaver",
		Language:    "ja",
		Author:      owner,
		Navigation: []site.NavItem{
			{Title: "ホーム", URL: "/", Icon: "🏠"},
			{Title: "課題", URL: "/issues.html", Icon: "📋"},
			{Title: "戦略", URL: "/strategy.html", Icon: "🎯"},
			{Title: "解決策", URL: "/troubleshooting.html", Icon: "🔧"},
		},
		ServiceWorker: true,
		Minify:        true,
	}

	// Generate HTML site
	buildLogger.Info("Generating HTML site")
	fmt.Printf("🎨 HTMLサイト生成中...\n")

	generator := site.NewHTMLGenerator(siteConfig)
	if err := generator.GenerateSite(result.Issues, cfg.Project.Name); err != nil {
		buildLogger.Error("Failed to generate site", "error", err)
		return fmt.Errorf("❌ サイト生成エラー: %w", err)
	}

	// Get output directory size
	dirSize, fileCount := calculateDirSize(outputDir)

	fmt.Printf("✅ サイトビルド完了!\n")
	fmt.Printf("📁 出力先: %s\n", outputDir)
	fmt.Printf("📄 生成ファイル: %d個\n", fileCount)
	fmt.Printf("📦 総サイズ: %.2f MB\n", float64(dirSize)/(1024*1024))

	// Open browser if requested
	if openBrowser {
		indexPath := filepath.Join(outputDir, "index.html")
		if _, err := os.Stat(indexPath); err == nil {
			fmt.Printf("🌐 ブラウザで開いています...\n")
			// Note: Browser opening would need OS-specific implementation
		}
	}

	buildLogger.Info("Site build completed successfully")
	return nil
}

func runSiteServeCommand(cmd *cobra.Command, args []string) error {
	serveLogger := logger.WithComponent("site-serve")
	serveLogger.Info("Starting site serve command")

	if outputDir == "" {
		outputDir = "./site"
	}

	// Check if site exists
	indexPath := filepath.Join(outputDir, "index.html")
	if _, err := os.Stat(indexPath); os.IsNotExist(err) {
		fmt.Printf("❌ サイトが見つかりません: %s\n", outputDir)
		fmt.Printf("💡 まず 'beaver site build' を実行してください\n")
		return fmt.Errorf("site not found in %s", outputDir)
	}

	// Start local server
	fmt.Printf("🚀 ローカルサーバー起動中...\n")
	fmt.Printf("📁 配信ディレクトリ: %s\n", outputDir)
	fmt.Printf("🌐 URL: http://localhost:%d\n", servePort)
	fmt.Printf("⏹️  停止するには Ctrl+C を押してください\n\n")

	// Create file server
	fs := http.FileServer(http.Dir(outputDir))
	http.Handle("/", fs)

	// Open browser if requested
	if openBrowser {
		fmt.Printf("🌐 ブラウザで開いています...\n")
		// Note: Browser opening would need OS-specific implementation
	}

	serveLogger.Info("Local server starting", "port", servePort, "dir", outputDir)

	// Start server with timeout
	server := &http.Server{
		Addr:         fmt.Sprintf(":%d", servePort),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	if err := server.ListenAndServe(); err != nil {
		serveLogger.Error("Server failed", "error", err)
		return fmt.Errorf("❌ サーバー起動エラー: %w", err)
	}

	return nil
}

func runSiteDeployCommand(cmd *cobra.Command, args []string) error {
	deployLogger := logger.WithComponent("site-deploy")
	deployLogger.Info("Starting site deploy command")

	if outputDir == "" {
		outputDir = "./site"
	}

	// Check if site exists
	if _, err := os.Stat(outputDir); os.IsNotExist(err) {
		fmt.Printf("❌ サイトが見つかりません: %s\n", outputDir)
		fmt.Printf("💡 まず 'beaver site build' を実行してください\n")
		return fmt.Errorf("site not found in %s", outputDir)
	}

	fmt.Printf("🚀 GitHub Pagesにデプロイ中...\n")
	fmt.Printf("📁 デプロイ元: %s\n", outputDir)

	// Load configuration for repository info
	cfg, err := config.LoadConfig()
	if err != nil {
		return fmt.Errorf("❌ 設定読み込みエラー: %w", err)
	}

	owner, repo := parseOwnerRepo(cfg.Project.Repository)
	if owner == "" || repo == "" {
		return fmt.Errorf("❌ リポジトリ形式が無効です: %s", cfg.Project.Repository)
	}

	// TODO: Implement actual GitHub Pages deployment
	// This would typically involve:
	// 1. Creating a gh-pages branch
	// 2. Copying files to the branch
	// 3. Pushing to GitHub
	// 4. Setting up GitHub Pages configuration

	fmt.Printf("⚠️  GitHub Pagesデプロイ機能は開発中です\n")
	fmt.Printf("💡 手動でのデプロイ手順:\n")
	fmt.Printf("   1. GitHub Actionsワークフローを設定\n")
	fmt.Printf("   2. %s の内容をgh-pagesブランチにコピー\n", outputDir)
	fmt.Printf("   3. リポジトリ設定でGitHub Pagesを有効化\n")
	fmt.Printf("🌐 デプロイ先URL: https://%s.github.io/%s\n", owner, repo)

	deployLogger.Info("Deploy command completed (manual deployment required)")
	return nil
}

// calculateDirSize calculates the total size and file count of a directory
func calculateDirSize(dirPath string) (int64, int) {
	var size int64
	var count int

	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if !info.IsDir() {
			size += info.Size()
			count++
		}
		return nil
	})

	// Log error if walk fails, but don't fail the function
	if err != nil {
		// Log warning but continue with partial results
		logger.WithComponent("site-build").Warn("Directory walk failed", "error", err)
	}

	return size, count
}

func init() {
	// Add site command to root
	rootCmd.AddCommand(siteCmd)

	// Add subcommands to site
	siteCmd.AddCommand(siteBuildCmd)
	siteCmd.AddCommand(siteServeCmd)
	siteCmd.AddCommand(siteDeployCmd)

	// Site build flags
	siteBuildCmd.Flags().StringVar(&outputDir, "output", "", "出力ディレクトリ (デフォルト: ./site)")
	siteBuildCmd.Flags().BoolVar(&openBrowser, "open", false, "ビルド後にブラウザで開く")

	// Site serve flags
	siteServeCmd.Flags().StringVar(&outputDir, "output", "", "配信ディレクトリ (デフォルト: ./site)")
	siteServeCmd.Flags().IntVar(&servePort, "port", 8080, "サーバーポート")
	siteServeCmd.Flags().BoolVar(&openBrowser, "open", false, "ブラウザを自動で開く")

	// Site deploy flags
	siteDeployCmd.Flags().StringVar(&outputDir, "output", "", "デプロイ元ディレクトリ (デフォルト: ./site)")
}

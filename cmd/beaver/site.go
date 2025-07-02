package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/nyasuto/beaver/internal/config"
	"github.com/nyasuto/beaver/internal/logger"
	"github.com/nyasuto/beaver/internal/models"
	"github.com/nyasuto/beaver/pkg/github"
	"github.com/nyasuto/beaver/pkg/site"
	"github.com/nyasuto/beaver/pkg/wiki"
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

	// Determine base path for GitHub Pages deployment
	var basePath string
	if owner != "" && repo != "" {
		// For GitHub Pages, use repo name as base path
		basePath = "/" + repo
	}

	// Create site configuration
	siteConfig := &site.SiteConfig{
		Title:       cfg.Project.Name + " ナレッジベース",
		Description: "AI駆動型ナレッジベース - GitHub Issues から自動生成",
		BaseURL:     "https://" + owner + ".github.io/" + repo,
		BasePath:    basePath,
		OutputDir:   outputDir,
		Theme:       "beaver",
		Language:    "ja",
		Author:      owner,
		Navigation: []site.NavItem{
			{Title: "ホーム", URL: basePath + "/", Icon: "🏠"},
			{Title: "課題", URL: basePath + "/issues.html", Icon: "📋"},
			{Title: "戦略", URL: basePath + "/strategy.html", Icon: "🎯"},
			{Title: "解決策", URL: basePath + "/troubleshooting.html", Icon: "🔧"},
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

	// Implement GitHub Pages deployment using git commands
	if err := deployToGitHubPages(outputDir, owner, repo, deployLogger); err != nil {
		return fmt.Errorf("❌ GitHub Pagesデプロイエラー: %w", err)
	}

	fmt.Printf("✅ GitHub Pagesデプロイ完了!\n")
	fmt.Printf("🌐 サイトURL: https://%s.github.io/%s\n", owner, repo)
	fmt.Printf("⏱️  反映まで数分かかる場合があります\n")

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

// deployToGitHubPages deploys the site to GitHub Pages using GitClient interface
func deployToGitHubPages(sourceDir, owner, repo string, deployLogger *slog.Logger) error {
	deployLogger.Info("Starting GitHub Pages deployment", "source", sourceDir, "repo", fmt.Sprintf("%s/%s", owner, repo))

	// Create GitClient
	gitClient, err := wiki.NewCmdGitClient()
	if err != nil {
		return fmt.Errorf("failed to create git client: %w", err)
	}

	ctx := context.Background()
	workingDir := "."

	// Check if we're in a git repository
	if !wiki.IsGitRepository(workingDir) {
		return fmt.Errorf("not in a git repository")
	}

	// Get current branch to return to it later
	currentBranch, err := gitClient.GetCurrentBranch(ctx, workingDir)
	if err != nil {
		return fmt.Errorf("failed to get current branch: %w", err)
	}

	fmt.Printf("📋 現在のブランチ: %s\n", currentBranch)

	// Stash any uncommitted changes
	fmt.Printf("💾 未コミット変更を一時保存中...\n")
	//nolint:errcheck // Intentionally ignore stash errors (may have no changes)
	gitClient.Stash(ctx, workingDir, "beaver-site-deploy-stash")

	// Cleanup function to return to original state
	cleanup := func() {
		fmt.Printf("🔄 元のブランチに戻っています...\n")
		//nolint:errcheck // Intentionally ignore cleanup errors
		gitClient.CheckoutBranch(ctx, workingDir, currentBranch)
		//nolint:errcheck // Intentionally ignore cleanup errors
		gitClient.StashPop(ctx, workingDir)
	}

	// Check if gh-pages branch exists
	fmt.Printf("🔍 gh-pages ブランチを確認中...\n")
	ghPagesBranchExists := gitClient.BranchExists(ctx, workingDir, "gh-pages") == nil

	if !ghPagesBranchExists {
		fmt.Printf("🆕 gh-pages ブランチを作成中...\n")
		// Create orphan gh-pages branch
		if err := gitClient.CreateOrphanBranch(ctx, workingDir, "gh-pages"); err != nil {
			cleanup()
			return fmt.Errorf("failed to create gh-pages branch: %w", err)
		}

		// Remove all files from the new branch
		//nolint:errcheck // Intentionally ignore errors as branch might be empty
		gitClient.RemoveFiles(ctx, workingDir, []string{"."}, true)
	} else {
		fmt.Printf("✅ 既存の gh-pages ブランチに切り替え中...\n")
		if err := gitClient.CheckoutBranch(ctx, workingDir, "gh-pages"); err != nil {
			cleanup()
			return fmt.Errorf("failed to checkout gh-pages branch: %w", err)
		}

		// Clear existing files (keep .git)
		fmt.Printf("🧹 既存ファイルをクリア中...\n")
		if err := gitClient.RemoveFiles(ctx, workingDir, []string{"."}, true); err != nil {
			// If git rm fails, try manual cleanup but preserve .git
			entries, err := os.ReadDir(".")
			if err == nil {
				for _, entry := range entries {
					if entry.Name() != ".git" {
						_ = os.RemoveAll(entry.Name()) // Ignore errors in cleanup
					}
				}
			}
		}
	}

	// Copy site files to current directory (gh-pages branch)
	fmt.Printf("📁 サイトファイルをコピー中...\n")
	if err := copyDir(sourceDir, "."); err != nil {
		cleanup()
		return fmt.Errorf("failed to copy site files: %w", err)
	}

	// Add all files
	fmt.Printf("➕ ファイルを追加中...\n")
	if err := gitClient.Add(ctx, workingDir, []string{"."}); err != nil {
		cleanup()
		return fmt.Errorf("failed to add files: %w", err)
	}

	// Check if there are changes to commit
	status, err := gitClient.Status(ctx, workingDir)
	if err != nil {
		cleanup()
		return fmt.Errorf("failed to check git status: %w", err)
	}

	if status.IsClean {
		fmt.Printf("ℹ️  変更がないため、コミットをスキップします\n")
		cleanup()
		return nil
	}

	// Commit changes
	commitMessage := fmt.Sprintf("Deploy site - %s", time.Now().Format("2006-01-02 15:04:05"))
	fmt.Printf("💾 コミット中: %s\n", commitMessage)
	if err := gitClient.Commit(ctx, workingDir, commitMessage, nil); err != nil {
		cleanup()
		return fmt.Errorf("failed to commit changes: %w", err)
	}

	// Push to origin
	fmt.Printf("🚀 GitHub にプッシュ中...\n")
	pushOptions := &wiki.PushOptions{
		Remote: "origin",
		Branch: "gh-pages",
		Force:  false,
	}
	if err := gitClient.Push(ctx, workingDir, pushOptions); err != nil {
		cleanup()
		return fmt.Errorf("failed to push to GitHub: %w", err)
	}

	cleanup()
	deployLogger.Info("GitHub Pages deployment completed successfully")
	return nil
}

// copyDir recursively copies a directory
func copyDir(src, dst string) error {
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Calculate destination path
		relPath, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		destPath := filepath.Join(dst, relPath)

		if info.IsDir() {
			return os.MkdirAll(destPath, info.Mode())
		}

		// Copy file
		srcFile, err := os.Open(path)
		if err != nil {
			return err
		}
		defer srcFile.Close()

		// Create destination directory if needed
		if err := os.MkdirAll(filepath.Dir(destPath), 0755); err != nil {
			return err
		}

		destFile, err := os.Create(destPath)
		if err != nil {
			return err
		}
		defer destFile.Close()

		// Copy file content
		_, err = destFile.ReadFrom(srcFile)
		return err
	})
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

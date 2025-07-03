package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"time"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"

	"github.com/nyasuto/beaver/internal/config"
	"github.com/nyasuto/beaver/internal/models"
	"github.com/nyasuto/beaver/pkg/content"
	"github.com/nyasuto/beaver/pkg/github"
)

// Service factory functions for dependency injection in tests
var (
	contentGitHubServiceFactory = func(token string) github.ServiceInterface {
		return github.NewService(token)
	}
	contentGeneratorFactory = func() *content.Generator {
		return content.NewGenerator()
	}
	wikiPublisherFactory = func(publisherConfig *content.PublisherConfig) (content.WikiPublisher, error) {
		// For v1.0, we only support GitHub Pages
		pagesConfig := config.GitHubPagesConfig{
			Theme:        "minima",
			Branch:       "gh-pages",
			EnableSearch: false,
		}
		return content.NewGitHubPagesPublisher(publisherConfig, pagesConfig)
	}
	wikiViperGetString = func(key string) string {
		return viper.GetString(key)
	}
	wikiOsGetenv = func(key string) string {
		return os.Getenv(key)
	}
	wikiOsMkdirAll = func(path string, perm os.FileMode) error {
		return os.MkdirAll(path, perm)
	}
	wikiOsWriteFile = func(filename string, data []byte, perm os.FileMode) error {
		return os.WriteFile(filename, data, perm)
	}
	wikiOsReadFile = func(filename string) ([]byte, error) {
		return os.ReadFile(filename)
	}
	wikiFilepathGlob = func(pattern string) ([]string, error) {
		return filepath.Glob(pattern)
	}
)

var (
	wikiOutput   string
	wikiTemplate string
	wikiPublish  bool
	wikiBatch    int
)

var wikiCmd = &cobra.Command{
	Use:   "content",
	Short: "ナレッジベース生成・デプロイコマンド群",
	Long: `GitHub IssuesからGitHub Pagesドキュメントを生成します。

AI処理されたIssueデータを構造化されたWikiページに変換し、
GitHub Pagesへの自動デプロイメントをサポートします。`,
}

var generateWikiCmd = &cobra.Command{
	Use:   "generate [owner/repo]",
	Short: "GitHub IssuesからGitHub Pagesを生成",
	Long: `指定されたリポジトリのGitHub IssuesからGitHub Pagesドキュメントを生成します。

生成される主要ページ:
- Issues Summary: 課題一覧と要約
- Troubleshooting Guide: 解決済み問題のガイド
- Learning Path: 学習の軌跡とマイルストーン

Example:
  beaver wiki generate nyasuto/beaver
  beaver wiki generate nyasuto/beaver --output ./wiki
  beaver wiki generate nyasuto/beaver --publish`,
	Args: cobra.ExactArgs(1),
	RunE: runGenerateWiki,
}

var publishWikiCmd = &cobra.Command{
	Use:   "publish [owner/repo]",
	Short: "GitHub Pagesにデプロイ",
	Long: `ローカルで生成されたWikiページをGitHub Pagesにデプロイします。

GitHub Personal Access Tokenが必要です。
環境変数GITHUB_TOKENまたは設定ファイルで指定してください。

Example:
  beaver wiki publish nyasuto/beaver
  beaver wiki publish nyasuto/beaver --batch 5`,
	Args: cobra.ExactArgs(1),
	RunE: runPublishWiki,
}

var listWikiCmd = &cobra.Command{
	Use:   "list [owner/repo]",
	Short: "GitHub Pagesページ一覧表示",
	Long: `指定されたリポジトリのGitHub Pagesページ一覧を表示します。

現在のGitHub Pagesの状態を確認する際に使用します。

Example:
  beaver wiki list nyasuto/beaver`,
	Args: cobra.ExactArgs(1),
	RunE: runListWiki,
}

func init() {
	// Add wiki command to root
	rootCmd.AddCommand(wikiCmd)

	// Add subcommands
	wikiCmd.AddCommand(generateWikiCmd)
	wikiCmd.AddCommand(publishWikiCmd)
	wikiCmd.AddCommand(listWikiCmd)

	// Generate command flags
	generateWikiCmd.Flags().StringVarP(&wikiOutput, "output", "o", "./wiki", "出力ディレクトリ")
	generateWikiCmd.Flags().StringVar(&wikiTemplate, "template", "", "カスタムテンプレートディレクトリ")
	generateWikiCmd.Flags().BoolVar(&wikiPublish, "publish", false, "生成後にGitHub Pagesに自動デプロイ")
	generateWikiCmd.Flags().IntVar(&wikiBatch, "batch", 0, "バッチ処理するIssue数 (0=全て)")

	// Publish command flags
	publishWikiCmd.Flags().IntVar(&wikiBatch, "batch", 10, "バッチサイズ")

	// List command flags (none currently)
}

func runGenerateWiki(cmd *cobra.Command, args []string) error {
	ctx := context.Background()
	repoPath := args[0]

	slog.Info("🦫 Beaver Wiki Generator", "repo", repoPath)
	slog.Info("📁 出力先", "output", wikiOutput)

	// Parse owner/repo
	owner, repo, err := parseRepoPath(repoPath)
	if err != nil {
		return fmt.Errorf("無効なリポジトリパス: %w", err)
	}

	// Get GitHub token
	token := wikiViperGetString("github.token")
	if token == "" {
		token = wikiOsGetenv("GITHUB_TOKEN")
	}
	if token == "" {
		return fmt.Errorf("GitHub token not found. Set GITHUB_TOKEN environment variable or configure in beaver.yml")
	}

	// Create GitHub service
	githubService := contentGitHubServiceFactory(token)

	// Create query
	query := models.DefaultIssueQuery(fmt.Sprintf("%s/%s", owner, repo))
	query.State = "all" // Fetch both open and closed issues

	// Fetch issues
	slog.Info("📥 Fetching issues", "owner", owner, "repo", repo)
	result, err := githubService.FetchIssues(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to fetch issues: %w", err)
	}
	allIssues := result.Issues

	// Apply batch limit if specified
	issues := allIssues
	if wikiBatch > 0 && len(allIssues) > wikiBatch {
		issues = allIssues[:wikiBatch]
		slog.Info("📊 Processing issues (batch mode)", "count", wikiBatch, "total", len(allIssues))
	} else {
		slog.Info("📊 Processing issues", "count", len(issues))
	}

	// Create Wiki generator
	generator := contentGeneratorFactory()
	projectName := fmt.Sprintf("%s/%s", owner, repo)

	// Generate Wiki pages
	slog.Info("🔧 Generating Wiki pages")

	// Create output directory
	// #nosec G301 -- CLI tool needs standard directory permissions
	if err := wikiOsMkdirAll(wikiOutput, 0755); err != nil {
		return fmt.Errorf("failed to create output directory: %w", err)
	}

	// Generate and save pages
	pages := make([]*content.WikiPage, 0, 4)

	// Index page
	slog.Info("  📄 Generating index page")
	indexPage, err := generator.GenerateIndex(issues, projectName)
	if err != nil {
		return fmt.Errorf("failed to generate index page: %w", err)
	}
	if err := saveWikiPage(indexPage, wikiOutput); err != nil {
		return fmt.Errorf("failed to save index page: %w", err)
	}
	pages = append(pages, indexPage)

	// Issues summary
	slog.Info("  📋 Generating issues summary")
	summaryPage, err := generator.GenerateIssuesSummary(issues, projectName)
	if err != nil {
		return fmt.Errorf("failed to generate issues summary: %w", err)
	}
	if err := saveWikiPage(summaryPage, wikiOutput); err != nil {
		return fmt.Errorf("failed to save issues summary: %w", err)
	}
	pages = append(pages, summaryPage)

	// Troubleshooting guide
	slog.Info("  🛠️ Generating troubleshooting guide")
	troubleshootingPage, err := generator.GenerateTroubleshootingGuide(issues, projectName)
	if err != nil {
		return fmt.Errorf("failed to generate troubleshooting guide: %w", err)
	}
	if err := saveWikiPage(troubleshootingPage, wikiOutput); err != nil {
		return fmt.Errorf("failed to save troubleshooting guide: %w", err)
	}
	pages = append(pages, troubleshootingPage)

	// Learning path
	slog.Info("  📚 Generating learning path")
	learningPage, err := generator.GenerateLearningPath(issues, projectName)
	if err != nil {
		return fmt.Errorf("failed to generate learning path: %w", err)
	}
	if err := saveWikiPage(learningPage, wikiOutput); err != nil {
		return fmt.Errorf("failed to save learning path: %w", err)
	}
	pages = append(pages, learningPage)

	slog.Info("✅ Wiki generation completed", "pages_created", len(pages), "output_dir", wikiOutput)

	// Auto-publish if requested
	if wikiPublish {
		slog.Info("🚀 Deploying to GitHub Pages")
		publisherConfig := &content.PublisherConfig{
			Owner:                    owner,
			Repository:               repo,
			Token:                    token,
			BranchName:               "master",
			AuthorName:               "Beaver AI",
			AuthorEmail:              "noreply@beaver.ai",
			UseShallowClone:          true,
			CloneDepth:               1,
			Timeout:                  30 * time.Second,
			RetryAttempts:            3,
			RetryDelay:               time.Second,
			EnableConflictResolution: true,
		}

		publisher, err := wikiPublisherFactory(publisherConfig)
		if err != nil {
			return fmt.Errorf("failed to create publisher: %w", err)
		}
		defer func() {
			if err := publisher.Cleanup(); err != nil {
				slog.Warn("Failed to cleanup publisher", "error", err)
			}
		}()

		if err := publisher.Initialize(ctx); err != nil {
			return fmt.Errorf("failed to initialize publisher: %w", err)
		}

		if err := publisher.PublishPages(ctx, pages); err != nil {
			return fmt.Errorf("failed to deploy to GitHub Pages: %w", err)
		}
		slog.Info("✅ Successfully deployed to GitHub Pages")
	}

	return nil
}

func runPublishWiki(cmd *cobra.Command, args []string) error {
	ctx := context.Background()
	repoPath := args[0]

	slog.Info("🚀 Deploying to GitHub Pages", "repo", repoPath)

	// Parse owner/repo
	owner, repo, err := parseRepoPath(repoPath)
	if err != nil {
		return fmt.Errorf("無効なリポジトリパス: %w", err)
	}

	// Get GitHub token
	token := wikiViperGetString("github.token")
	if token == "" {
		token = wikiOsGetenv("GITHUB_TOKEN")
	}
	if token == "" {
		return fmt.Errorf("GitHub token not found. Set GITHUB_TOKEN environment variable or configure in beaver.yml")
	}

	// Load Wiki pages from output directory
	wikiFiles, err := wikiFilepathGlob(filepath.Join(wikiOutput, "*.md"))
	if err != nil {
		return fmt.Errorf("failed to find wiki files: %w", err)
	}

	if len(wikiFiles) == 0 {
		return fmt.Errorf("no wiki files found in %s. Run 'beaver wiki generate' first", wikiOutput)
	}

	// Create WikiPages from files
	var pages []*content.WikiPage
	slog.Info("📤 Loading wiki pages", "count", len(wikiFiles))
	for i, wikiFile := range wikiFiles {
		if wikiBatch > 0 && i >= wikiBatch {
			slog.Info("⏸️ Reached batch limit", "limit", wikiBatch)
			break
		}

		fileContent, err := wikiOsReadFile(wikiFile) // #nosec G304 -- CLI tool reads user-specified files
		if err != nil {
			return fmt.Errorf("failed to read wiki file %s: %w", wikiFile, err)
		}

		filename := filepath.Base(wikiFile)
		title := filename[:len(filename)-3] // Remove .md extension

		page := &content.WikiPage{
			Title:    title,
			Content:  string(fileContent),
			Filename: filename,
		}
		pages = append(pages, page)
	}

	// Create publisher and publish pages
	publisherConfig := &content.PublisherConfig{
		Owner:                    owner,
		Repository:               repo,
		Token:                    token,
		BranchName:               "master",
		AuthorName:               "Beaver AI",
		AuthorEmail:              "noreply@beaver.ai",
		UseShallowClone:          true,
		CloneDepth:               1,
		Timeout:                  30 * time.Second,
		RetryAttempts:            3,
		RetryDelay:               time.Second,
		EnableConflictResolution: true,
	}

	publisher, err := wikiPublisherFactory(publisherConfig)
	if err != nil {
		return fmt.Errorf("failed to create publisher: %w", err)
	}
	defer func() {
		if err := publisher.Cleanup(); err != nil {
			slog.Warn("Failed to cleanup publisher", "error", err)
		}
	}()

	if err := publisher.Initialize(ctx); err != nil {
		return fmt.Errorf("failed to initialize publisher: %w", err)
	}

	slog.Info("📤 Deploying pages to GitHub Pages", "count", len(pages))
	if err := publisher.PublishPages(ctx, pages); err != nil {
		return fmt.Errorf("failed to deploy pages to GitHub Pages: %w", err)
	}

	slog.Info("✅ GitHub Pages deployment completed")
	return nil
}

func runListWiki(cmd *cobra.Command, args []string) error {
	ctx := context.Background()
	repoPath := args[0]

	// Parse owner/repo
	owner, repo, err := parseRepoPath(repoPath)
	if err != nil {
		return fmt.Errorf("無効なリポジトリパス: %w", err)
	}

	// Get GitHub token
	token := wikiViperGetString("github.token")
	if token == "" {
		token = wikiOsGetenv("GITHUB_TOKEN")
	}
	if token == "" {
		return fmt.Errorf("GitHub token not found. Set GITHUB_TOKEN environment variable or configure in beaver.yml")
	}

	// Create publisher to access existing Wiki
	publisherConfig := &content.PublisherConfig{
		Owner:                    owner,
		Repository:               repo,
		Token:                    token,
		BranchName:               "master",
		AuthorName:               "Beaver AI",
		AuthorEmail:              "noreply@beaver.ai",
		UseShallowClone:          true,
		CloneDepth:               1,
		Timeout:                  30 * time.Second,
		RetryAttempts:            3,
		RetryDelay:               time.Second,
		EnableConflictResolution: true,
	}

	publisher, err := wikiPublisherFactory(publisherConfig)
	if err != nil {
		return fmt.Errorf("failed to create publisher: %w", err)
	}
	defer func() {
		if err := publisher.Cleanup(); err != nil {
			slog.Warn("Failed to cleanup publisher", "error", err)
		}
	}()

	if err := publisher.Initialize(ctx); err != nil {
		return fmt.Errorf("failed to initialize publisher: %w", err)
	}

	// Clone to access existing GitHub Pages content
	if err := publisher.Clone(ctx); err != nil {
		return fmt.Errorf("failed to clone GitHub Pages repository: %w", err)
	}

	// List pages
	slog.Info("📋 Listing GitHub Pages", "owner", owner, "repo", repo)
	pages, err := publisher.ListPages(ctx)
	if err != nil {
		return fmt.Errorf("failed to list GitHub Pages: %w", err)
	}

	if len(pages) == 0 {
		slog.Info("📄 No GitHub Pages found")
		return nil
	}

	slog.Info("📄 Found GitHub Pages", "count", len(pages))
	for _, page := range pages {
		slog.Info("  - Page", "title", page.Title, "filename", page.Filename)
	}

	return nil
}

// Helper functions

func parseRepoPath(repoPath string) (owner, repo string, err error) {
	parts := splitString(repoPath, "/")
	if len(parts) != 2 {
		return "", "", fmt.Errorf("expected format: owner/repo, got: %s", repoPath)
	}
	return parts[0], parts[1], nil
}

func saveWikiPage(page *content.WikiPage, outputDir string) error {
	filename := filepath.Join(outputDir, page.Filename)
	return wikiOsWriteFile(filename, []byte(page.Content), 0644) // #nosec G306 -- CLI tool generates files with standard permissions
}

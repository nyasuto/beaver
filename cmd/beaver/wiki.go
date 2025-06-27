package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"

	"github.com/nyasuto/beaver/internal/models"
	"github.com/nyasuto/beaver/pkg/github"
	"github.com/nyasuto/beaver/pkg/wiki"
)

var (
	wikiOutput   string
	wikiTemplate string
	wikiPublish  bool
	wikiBatch    int
)

var wikiCmd = &cobra.Command{
	Use:   "wiki",
	Short: "Wiki生成コマンド群",
	Long: `GitHub IssuesからWikiドキュメントを生成します。

AI処理されたIssueデータを構造化されたWikiページに変換し、
GitHub Wikiへの自動投稿もサポートします。`,
}

var generateWikiCmd = &cobra.Command{
	Use:   "generate [owner/repo]",
	Short: "GitHub IssuesからWikiを生成",
	Long: `指定されたリポジトリのGitHub IssuesからWikiドキュメントを生成します。

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
	Short: "WikiをGitHub Wikiに投稿",
	Long: `ローカルで生成されたWikiページをGitHub Wikiに投稿します。

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
	Short: "GitHub Wikiページ一覧表示",
	Long: `指定されたリポジトリのGitHub Wikiページ一覧を表示します。

現在のWikiの状態を確認する際に使用します。

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
	generateWikiCmd.Flags().BoolVar(&wikiPublish, "publish", false, "生成後にGitHub Wikiに自動投稿")
	generateWikiCmd.Flags().IntVar(&wikiBatch, "batch", 0, "バッチ処理するIssue数 (0=全て)")

	// Publish command flags
	publishWikiCmd.Flags().IntVar(&wikiBatch, "batch", 10, "バッチサイズ")

	// List command flags (none currently)
}

func runGenerateWiki(cmd *cobra.Command, args []string) error {
	ctx := context.Background()
	repoPath := args[0]

	log.Printf("🦫 Beaver Wiki Generator - %s", repoPath)
	log.Printf("📁 出力先: %s", wikiOutput)

	// Parse owner/repo
	owner, repo, err := parseRepoPath(repoPath)
	if err != nil {
		return fmt.Errorf("無効なリポジトリパス: %w", err)
	}

	// Get GitHub token
	token := viper.GetString("github.token")
	if token == "" {
		token = os.Getenv("GITHUB_TOKEN")
	}
	if token == "" {
		return fmt.Errorf("GitHub token not found. Set GITHUB_TOKEN environment variable or configure in beaver.yml")
	}

	// Create GitHub service
	githubService := github.NewService(token)

	// Create query
	query := models.DefaultIssueQuery(fmt.Sprintf("%s/%s", owner, repo))
	query.State = "all" // Fetch both open and closed issues

	// Fetch issues
	log.Printf("📥 Fetching issues from %s/%s...", owner, repo)
	result, err := githubService.FetchIssues(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to fetch issues: %w", err)
	}
	allIssues := result.Issues

	// Apply batch limit if specified
	issues := allIssues
	if wikiBatch > 0 && len(allIssues) > wikiBatch {
		issues = allIssues[:wikiBatch]
		log.Printf("📊 Processing %d of %d issues (batch mode)", wikiBatch, len(allIssues))
	} else {
		log.Printf("📊 Processing %d issues", len(issues))
	}

	// Create Wiki generator
	generator := wiki.NewGenerator()
	projectName := fmt.Sprintf("%s/%s", owner, repo)

	// Generate Wiki pages
	log.Printf("🔧 Generating Wiki pages...")

	// Create output directory
	// #nosec G301 -- CLI tool needs standard directory permissions
	if err := os.MkdirAll(wikiOutput, 0755); err != nil {
		return fmt.Errorf("failed to create output directory: %w", err)
	}

	// Generate and save pages
	pages := make([]*wiki.WikiPage, 0, 4)

	// Index page
	log.Printf("  📄 Generating index page...")
	indexPage, err := generator.GenerateIndex(issues, projectName)
	if err != nil {
		return fmt.Errorf("failed to generate index page: %w", err)
	}
	if err := saveWikiPage(indexPage, wikiOutput); err != nil {
		return fmt.Errorf("failed to save index page: %w", err)
	}
	pages = append(pages, indexPage)

	// Issues summary
	log.Printf("  📋 Generating issues summary...")
	summaryPage, err := generator.GenerateIssuesSummary(issues, projectName)
	if err != nil {
		return fmt.Errorf("failed to generate issues summary: %w", err)
	}
	if err := saveWikiPage(summaryPage, wikiOutput); err != nil {
		return fmt.Errorf("failed to save issues summary: %w", err)
	}
	pages = append(pages, summaryPage)

	// Troubleshooting guide
	log.Printf("  🛠️ Generating troubleshooting guide...")
	troubleshootingPage, err := generator.GenerateTroubleshootingGuide(issues, projectName)
	if err != nil {
		return fmt.Errorf("failed to generate troubleshooting guide: %w", err)
	}
	if err := saveWikiPage(troubleshootingPage, wikiOutput); err != nil {
		return fmt.Errorf("failed to save troubleshooting guide: %w", err)
	}
	pages = append(pages, troubleshootingPage)

	// Learning path
	log.Printf("  📚 Generating learning path...")
	learningPage, err := generator.GenerateLearningPath(issues, projectName)
	if err != nil {
		return fmt.Errorf("failed to generate learning path: %w", err)
	}
	if err := saveWikiPage(learningPage, wikiOutput); err != nil {
		return fmt.Errorf("failed to save learning path: %w", err)
	}
	pages = append(pages, learningPage)

	log.Printf("✅ Wiki generation completed! %d pages created in %s", len(pages), wikiOutput)

	// Auto-publish if requested
	if wikiPublish {
		log.Printf("🚀 Publishing to GitHub Wiki...")
		publisherConfig := &wiki.PublisherConfig{
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

		publisher, err := wiki.NewGitHubWikiPublisher(publisherConfig)
		if err != nil {
			return fmt.Errorf("failed to create publisher: %w", err)
		}
		defer func() {
			if err := publisher.Cleanup(); err != nil {
				log.Printf("WARN Failed to cleanup publisher: %v", err)
			}
		}()

		if err := publisher.Initialize(ctx); err != nil {
			return fmt.Errorf("failed to initialize publisher: %w", err)
		}

		if err := publisher.PublishPages(ctx, pages); err != nil {
			return fmt.Errorf("failed to publish wiki: %w", err)
		}
		log.Printf("✅ Successfully published to GitHub Wiki!")
	}

	return nil
}

func runPublishWiki(cmd *cobra.Command, args []string) error {
	ctx := context.Background()
	repoPath := args[0]

	log.Printf("🚀 Publishing Wiki to %s", repoPath)

	// Parse owner/repo
	owner, repo, err := parseRepoPath(repoPath)
	if err != nil {
		return fmt.Errorf("無効なリポジトリパス: %w", err)
	}

	// Get GitHub token
	token := viper.GetString("github.token")
	if token == "" {
		token = os.Getenv("GITHUB_TOKEN")
	}
	if token == "" {
		return fmt.Errorf("GitHub token not found. Set GITHUB_TOKEN environment variable or configure in beaver.yml")
	}

	// Load Wiki pages from output directory
	wikiFiles, err := filepath.Glob(filepath.Join(wikiOutput, "*.md"))
	if err != nil {
		return fmt.Errorf("failed to find wiki files: %w", err)
	}

	if len(wikiFiles) == 0 {
		return fmt.Errorf("no wiki files found in %s. Run 'beaver wiki generate' first", wikiOutput)
	}

	// Create WikiPages from files
	var pages []*wiki.WikiPage
	log.Printf("📤 Loading %d wiki pages...", len(wikiFiles))
	for i, wikiFile := range wikiFiles {
		if wikiBatch > 0 && i >= wikiBatch {
			log.Printf("⏸️ Reached batch limit of %d pages", wikiBatch)
			break
		}

		content, err := os.ReadFile(wikiFile) // #nosec G304 -- CLI tool reads user-specified files
		if err != nil {
			return fmt.Errorf("failed to read wiki file %s: %w", wikiFile, err)
		}

		filename := filepath.Base(wikiFile)
		title := filename[:len(filename)-3] // Remove .md extension

		page := &wiki.WikiPage{
			Title:    title,
			Content:  string(content),
			Filename: filename,
		}
		pages = append(pages, page)
	}

	// Create publisher and publish pages
	publisherConfig := &wiki.PublisherConfig{
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

	publisher, err := wiki.NewGitHubWikiPublisher(publisherConfig)
	if err != nil {
		return fmt.Errorf("failed to create publisher: %w", err)
	}
	defer func() {
		if err := publisher.Cleanup(); err != nil {
			log.Printf("WARN Failed to cleanup publisher: %v", err)
		}
	}()

	if err := publisher.Initialize(ctx); err != nil {
		return fmt.Errorf("failed to initialize publisher: %w", err)
	}

	log.Printf("📤 Publishing %d wiki pages...", len(pages))
	if err := publisher.PublishPages(ctx, pages); err != nil {
		return fmt.Errorf("failed to publish wiki pages: %w", err)
	}

	log.Printf("✅ Wiki publishing completed!")
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
	token := viper.GetString("github.token")
	if token == "" {
		token = os.Getenv("GITHUB_TOKEN")
	}
	if token == "" {
		return fmt.Errorf("GitHub token not found. Set GITHUB_TOKEN environment variable or configure in beaver.yml")
	}

	// Create publisher to access existing Wiki
	publisherConfig := &wiki.PublisherConfig{
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

	publisher, err := wiki.NewGitHubWikiPublisher(publisherConfig)
	if err != nil {
		return fmt.Errorf("failed to create publisher: %w", err)
	}
	defer func() {
		if err := publisher.Cleanup(); err != nil {
			log.Printf("WARN Failed to cleanup publisher: %v", err)
		}
	}()

	if err := publisher.Initialize(ctx); err != nil {
		return fmt.Errorf("failed to initialize publisher: %w", err)
	}

	// Clone to access existing Wiki content
	if err := publisher.Clone(ctx); err != nil {
		return fmt.Errorf("failed to clone wiki repository: %w", err)
	}

	// List pages
	log.Printf("📋 Listing Wiki pages for %s/%s", owner, repo)
	pages, err := publisher.ListPages(ctx)
	if err != nil {
		return fmt.Errorf("failed to list wiki pages: %w", err)
	}

	if len(pages) == 0 {
		log.Printf("📄 No Wiki pages found")
		return nil
	}

	log.Printf("📄 Found %d Wiki pages:", len(pages))
	for _, page := range pages {
		log.Printf("  - %s (%s)", page.Title, page.Filename)
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

func saveWikiPage(page *wiki.WikiPage, outputDir string) error {
	filename := filepath.Join(outputDir, page.Filename)
	return os.WriteFile(filename, []byte(page.Content), 0644) // #nosec G306 -- CLI tool generates files with standard permissions
}

package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/nyasuto/beaver/internal/config"
	"github.com/nyasuto/beaver/internal/models"
	"github.com/nyasuto/beaver/pkg/github"
	"github.com/nyasuto/beaver/pkg/wiki"
	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "beaver",
	Short: "🦫 Beaver - AIエージェント知識ダム構築ツール",
	Long: `Beaver は AI エージェント開発の軌跡を自動的に整理された永続的な知識に変換します。
	
散在する GitHub Issues、コミットログ、AI実験記録を構造化された Wiki ドキュメントに変換し、
流れ去る学びを永続的な知識ダムとして蓄積します。`,
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("🦫 Beaver - AIエージェント知識ダム構築ツール")
		fmt.Println("使用方法: beaver [command]")
		fmt.Println("詳細なヘルプ: beaver --help")
	},
}

var initCmd = &cobra.Command{
	Use:   "init",
	Short: "プロジェクト設定の初期化",
	Long:  "Beaverプロジェクトの設定ファイル(beaver.yml)を生成し、初期設定を行います。",
	Run: func(cmd *cobra.Command, args []string) {
		log.Printf("INFO Starting beaver init command")
		fmt.Println("🏗️ Beaverプロジェクトを初期化中...")

		// Check if config file already exists
		log.Printf("INFO Checking for existing configuration file")
		if configPath, err := config.GetConfigPath(); err == nil {
			log.Printf("WARN Configuration file already exists at: %s", configPath)
			fmt.Println("⚠️  設定ファイル beaver.yml は既に存在します")
			fmt.Println("🔧 既存の設定を確認するには: beaver status")
			return
		}

		// Create default configuration file
		log.Printf("INFO Creating default configuration file")
		if err := config.CreateDefaultConfig(); err != nil {
			log.Printf("ERROR Failed to create config file: %v", err)
			fmt.Printf("❌ 設定ファイル作成に失敗しました: %v\n", err)
			os.Exit(1)
		}
		log.Printf("INFO Configuration file created successfully")

		fmt.Println("📝 設定を完了するには:")
		fmt.Println("   1. beaver.yml を編集して GitHub リポジトリを指定")
		fmt.Println("   2. GITHUB_TOKEN 環境変数を設定")
		fmt.Println("   3. beaver build でWiki生成を実行")
		fmt.Println("")
		fmt.Println("🦫 Beaverプロジェクトの初期化完了!")
	},
}

var buildCmd = &cobra.Command{
	Use:   "build",
	Short: "最新Issuesをwikiに処理",
	Long:  "GitHub Issues を取得し、AI処理を実行して Wiki ドキュメントを生成します。",
	Run: func(cmd *cobra.Command, args []string) {
		start := time.Now()
		log.Printf("INFO Starting beaver build command")
		fmt.Println("🔨 知識ダムを構築中...")

		// Load configuration
		log.Printf("INFO Loading configuration file")
		cfg, err := config.LoadConfig()
		if err != nil {
			log.Printf("ERROR Failed to load configuration: %v", err)
			fmt.Printf("❌ 設定読み込みエラー: %v\n", err)
			fmt.Println("💡 beaver init で設定ファイルを作成してください")
			os.Exit(1)
		}
		log.Printf("INFO Configuration loaded successfully: project=%s, repo=%s", cfg.Project.Name, cfg.Project.Repository)

		// Validate configuration
		log.Printf("INFO Validating configuration")
		if validationErr := cfg.Validate(); validationErr != nil {
			log.Printf("ERROR Configuration validation failed: %v", validationErr)
			fmt.Printf("❌ 設定エラー: %v\n", validationErr)
			fmt.Println("💡 beaver.yml と環境変数を確認してください")
			os.Exit(1)
		}
		log.Printf("INFO Configuration validation passed")

		ctx := context.Background()

		// Parse repository from config
		repo := cfg.Project.Repository
		log.Printf("INFO Checking repository configuration: %s", repo)
		if repo == "" || repo == "username/my-repo" {
			log.Printf("ERROR Repository not configured properly: %s", repo)
			fmt.Println("❌ リポジトリが設定されていません")
			fmt.Println("💡 beaver.yml でリポジトリを指定してください")
			os.Exit(1)
		}

		fmt.Printf("📂 リポジトリ: %s\n", repo)
		log.Printf("INFO Repository validated: %s", repo)

		// Create GitHub service
		log.Printf("INFO Creating GitHub service with token length: %d", len(cfg.Sources.GitHub.Token))
		githubService := github.NewService(cfg.Sources.GitHub.Token)
		log.Printf("INFO GitHub service created successfully")

		// Create query for issues
		query := models.DefaultIssueQuery(repo)
		query.State = "all" // Get both open and closed issues

		// Fetch issues
		log.Printf("INFO Starting GitHub Issues fetch for repository: %s", repo)
		fmt.Printf("📥 GitHub Issues を取得中...\n")
		result, err := githubService.FetchIssues(ctx, query)
		if err != nil {
			log.Printf("ERROR Failed to fetch issues: %v", err)
			fmt.Printf("❌ Issues取得エラー: %v\n", err)
			os.Exit(1)
		}

		log.Printf("INFO Issues fetch completed: count=%d, rate_limit_remaining=%d", result.FetchedCount, func() int {
			if result.RateLimit != nil {
				return result.RateLimit.Remaining
			}
			return -1
		}())
		fmt.Printf("📊 取得したIssues: %d件\n", result.FetchedCount)
		if result.FetchedCount == 0 {
			log.Printf("WARN No issues found to process")
			fmt.Println("⚠️  処理するIssuesがありません")
			return
		}

		// Generate Wiki
		log.Printf("INFO Starting wiki generation with %d issues", len(result.Issues))
		fmt.Printf("🤖 AI処理でWikiを生成中...\n")
		generator := wiki.NewGenerator()
		pages, err := generator.GenerateAllPages(result.Issues, cfg.Project.Name)
		if err != nil {
			log.Printf("ERROR Wiki generation failed: %v", err)
			fmt.Printf("❌ Wiki生成エラー: %v\n", err)
			os.Exit(1)
		}

		log.Printf("INFO Wiki generation completed: pages=%d", len(pages))
		fmt.Printf("📄 生成されたページ: %d個\n", len(pages))
		for i, page := range pages {
			log.Printf("INFO Generated page %d: title=%s, size=%d bytes", i+1, page.Title, len(page.Content))
		}

		// Publish to GitHub Wiki if configured
		if cfg.Output.Wiki.Platform == "github" {
			log.Printf("INFO Publishing to GitHub Wiki: platform=%s", cfg.Output.Wiki.Platform)
			fmt.Printf("🚀 GitHub Wikiに投稿中...\n")
			owner, repoName := parseOwnerRepo(repo)
			log.Printf("INFO Parsed repository: owner=%s, repo=%s", owner, repoName)

			// Use Git clone approach (Issue #49) instead of REST API
			publisherConfig := &wiki.PublisherConfig{
				Owner:                    owner,
				Repository:               repoName,
				Token:                    cfg.Sources.GitHub.Token,
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
				log.Printf("ERROR Failed to create publisher: %v", err)
				fmt.Printf("❌ Publisher作成エラー: %v\n", err)
				os.Exit(1)
			}
			defer func() {
				if err := publisher.Cleanup(); err != nil {
					log.Printf("WARN Failed to cleanup publisher: %v", err)
				}
			}()

			if err := publisher.Initialize(ctx); err != nil {
				log.Printf("ERROR Failed to initialize publisher: %v", err)
				fmt.Printf("❌ Publisher初期化エラー: %v\n", err)
				os.Exit(1)
			}

			if err := publisher.PublishPages(ctx, pages); err != nil {
				log.Printf("ERROR Wiki publication failed: %v", err)
				fmt.Printf("❌ Wiki投稿エラー: %v\n", err)
				os.Exit(1)
			}
			log.Printf("INFO Wiki publication completed successfully")
			fmt.Printf("✅ GitHub Wikiへの投稿完了!\n")
		} else {
			log.Printf("INFO Saving locally: platform=%s", cfg.Output.Wiki.Platform)
			fmt.Printf("📁 ローカルファイルとして保存 (platform: %s)\n", cfg.Output.Wiki.Platform)
		}

		elapsed := time.Since(start)
		log.Printf("INFO Build command completed successfully in %v", elapsed)
		fmt.Println("🦫 知識ダム構築完了!")
	},
}

// parseOwnerRepo parses "owner/repo" format and returns owner, repo
func parseOwnerRepo(repoPath string) (string, string) {
	log.Printf("DEBUG Parsing repository path: %s", repoPath)
	parts := splitString(repoPath, "/")
	if len(parts) != 2 {
		log.Printf("ERROR Invalid repository path format: %s (expected owner/repo)", repoPath)
		return "", ""
	}
	log.Printf("DEBUG Parsed repository: owner=%s, repo=%s", parts[0], parts[1])
	return parts[0], parts[1]
}

// splitString splits a string by separator
func splitString(s, sep string) []string {
	if s == "" {
		return nil
	}
	var result []string
	start := 0
	for i := 0; i < len(s); {
		if i+len(sep) <= len(s) && s[i:i+len(sep)] == sep {
			result = append(result, s[start:i])
			start = i + len(sep)
			i = start
		} else {
			i++
		}
	}
	result = append(result, s[start:])
	return result
}

var statusCmd = &cobra.Command{
	Use:   "status",
	Short: "処理状況表示",
	Long:  "最新の知識処理状況、エラーログ、統計情報を表示します。",
	Run: func(cmd *cobra.Command, args []string) {
		log.Printf("INFO Starting beaver status command")
		fmt.Println("📊 Beaver処理状況:")

		// Check configuration file
		log.Printf("INFO Checking for configuration file")
		configPath, err := config.GetConfigPath()
		if err != nil {
			log.Printf("WARN No configuration file found: %v", err)
			fmt.Println("❌ 設定ファイルなし")
			fmt.Println("💡 beaver init で初期化してください")
			return
		}

		log.Printf("INFO Configuration file found: %s", configPath)
		fmt.Printf("📄 設定ファイル: %s\n", configPath)

		// Load and validate configuration
		log.Printf("INFO Loading configuration")
		cfg, err := config.LoadConfig()
		if err != nil {
			log.Printf("ERROR Failed to load configuration: %v", err)
			fmt.Printf("❌ 設定読み込みエラー: %v\n", err)
			return
		}
		log.Printf("INFO Configuration loaded: project=%s, repo=%s, ai_provider=%s", cfg.Project.Name, cfg.Project.Repository, cfg.AI.Provider)

		fmt.Printf("📁 プロジェクト: %s\n", cfg.Project.Name)
		fmt.Printf("🔗 リポジトリ: %s\n", cfg.Project.Repository)
		fmt.Printf("🤖 AI Provider: %s (%s)\n", cfg.AI.Provider, cfg.AI.Model)
		fmt.Printf("📝 出力先: %s Wiki\n", cfg.Output.Wiki.Platform)

		// Check GitHub token
		log.Printf("INFO Checking GitHub token configuration")
		if cfg.Sources.GitHub.Token == "" {
			log.Printf("WARN GitHub token not configured")
			fmt.Println("⚠️  GITHUB_TOKEN が設定されていません")
		} else {
			log.Printf("INFO GitHub token configured (length: %d)", len(cfg.Sources.GitHub.Token))
			fmt.Println("✅ GITHUB_TOKEN 設定済み")
		}

		// Test GitHub connection if token is available
		if cfg.Sources.GitHub.Token != "" {
			log.Printf("INFO Testing GitHub connection")
			fmt.Printf("🔗 GitHub接続をテスト中...\n")
			githubService := github.NewService(cfg.Sources.GitHub.Token)
			ctx := context.Background()

			if err := githubService.TestConnection(ctx); err != nil {
				log.Printf("ERROR GitHub connection failed: %v", err)
				fmt.Printf("❌ GitHub接続エラー: %v\n", err)
			} else {
				log.Printf("INFO GitHub connection successful")
				fmt.Println("✅ GitHub接続成功")

				// Get repository info if configured
				if cfg.Project.Repository != "" && cfg.Project.Repository != "username/my-repo" {
					log.Printf("INFO Testing Issues fetch for repository: %s", cfg.Project.Repository)
					query := models.DefaultIssueQuery(cfg.Project.Repository)
					query.PerPage = 1 // Just get one issue to test

					result, err := githubService.FetchIssues(ctx, query)
					if err != nil {
						log.Printf("WARN Issues fetch test failed: %v", err)
						fmt.Printf("⚠️  Issues取得テストエラー: %v\n", err)
					} else {
						log.Printf("INFO Issues fetch test successful: count=%d, rate_limit=%d/%d", result.FetchedCount, func() int {
							if result.RateLimit != nil {
								return result.RateLimit.Remaining
							}
							return -1
						}(), func() int {
							if result.RateLimit != nil {
								return result.RateLimit.Limit
							}
							return -1
						}())
						fmt.Printf("📊 利用可能Issues: %d件以上\n", result.FetchedCount)
						if result.RateLimit != nil {
							fmt.Printf("🚦 API制限: %d/%d (リセット: %s)\n",
								result.RateLimit.Remaining,
								result.RateLimit.Limit,
								result.RateLimit.ResetTime.Format("15:04:05"))
						}
					}
				} else {
					log.Printf("WARN Repository not properly configured for testing: %s", cfg.Project.Repository)
				}
			}
		}

		// Show configuration validation
		log.Printf("INFO Validating configuration")
		fmt.Printf("\n🔍 設定検証:\n")
		if err := cfg.Validate(); err != nil {
			log.Printf("ERROR Configuration validation failed: %v", err)
			fmt.Printf("❌ %v\n", err)
			fmt.Printf("💡 設定を修正してから beaver build を実行してください\n")
		} else {
			log.Printf("INFO Configuration validation passed")
			fmt.Printf("✅ 設定は有効です\n")
			fmt.Printf("🚀 beaver build でWiki生成を実行できます\n")
		}
		log.Printf("INFO Status command completed")
	},
}

func init() {
	rootCmd.AddCommand(initCmd)
	rootCmd.AddCommand(buildCmd)
	rootCmd.AddCommand(statusCmd)
}

// mainLogic contains the core logic of main() without os.Exit for testing
func mainLogic() error {
	log.Printf("INFO Starting beaver CLI application")
	if err := rootCmd.Execute(); err != nil {
		log.Printf("ERROR Command execution failed: %v", err)
		fmt.Fprintf(os.Stderr, "エラー: %v\n", err)
		return err
	}
	log.Printf("INFO Beaver CLI application completed successfully")
	return nil
}

func main() {
	if err := mainLogic(); err != nil {
		os.Exit(1)
	}
}

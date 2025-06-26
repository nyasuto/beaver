package main

import (
	"context"
	"fmt"
	"os"

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
		fmt.Println("🏗️ Beaverプロジェクトを初期化中...")

		// Check if config file already exists
		if _, err := config.GetConfigPath(); err == nil {
			fmt.Println("⚠️  設定ファイル beaver.yml は既に存在します")
			fmt.Println("🔧 既存の設定を確認するには: beaver status")
			return
		}

		// Create default configuration file
		if err := config.CreateDefaultConfig(); err != nil {
			fmt.Printf("❌ 設定ファイル作成に失敗しました: %v\n", err)
			os.Exit(1)
		}

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
		fmt.Println("🔨 知識ダムを構築中...")

		// Load configuration
		cfg, err := config.LoadConfig()
		if err != nil {
			fmt.Printf("❌ 設定読み込みエラー: %v\n", err)
			fmt.Println("💡 beaver init で設定ファイルを作成してください")
			os.Exit(1)
		}

		// Validate configuration
		if err := cfg.Validate(); err != nil {
			fmt.Printf("❌ 設定エラー: %v\n", err)
			fmt.Println("💡 beaver.yml と環境変数を確認してください")
			os.Exit(1)
		}

		ctx := context.Background()

		// Parse repository from config
		repo := cfg.Project.Repository
		if repo == "" || repo == "username/my-repo" {
			fmt.Println("❌ リポジトリが設定されていません")
			fmt.Println("💡 beaver.yml でリポジトリを指定してください")
			os.Exit(1)
		}

		fmt.Printf("📂 リポジトリ: %s\n", repo)

		// Create GitHub service
		githubService := github.NewService(cfg.Sources.GitHub.Token)

		// Create query for issues
		query := models.DefaultIssueQuery(repo)
		query.State = "all" // Get both open and closed issues

		// Fetch issues
		fmt.Printf("📥 GitHub Issues を取得中...\n")
		result, err := githubService.FetchIssues(ctx, query)
		if err != nil {
			fmt.Printf("❌ Issues取得エラー: %v\n", err)
			os.Exit(1)
		}

		fmt.Printf("📊 取得したIssues: %d件\n", result.FetchedCount)
		if result.FetchedCount == 0 {
			fmt.Println("⚠️  処理するIssuesがありません")
			return
		}

		// Generate Wiki
		fmt.Printf("🤖 AI処理でWikiを生成中...\n")
		generator := wiki.NewGenerator()
		pages, err := generator.GenerateAllPages(result.Issues, cfg.Project.Name)
		if err != nil {
			fmt.Printf("❌ Wiki生成エラー: %v\n", err)
			os.Exit(1)
		}

		fmt.Printf("📄 生成されたページ: %d個\n", len(pages))

		// Publish to GitHub Wiki if configured
		if cfg.Output.Wiki.Platform == "github" {
			fmt.Printf("🚀 GitHub Wikiに投稿中...\n")
			owner, repoName := parseOwnerRepo(repo)
			wikiService := wiki.NewWikiService(cfg.Sources.GitHub.Token, owner, repoName)
			if err := wikiService.GenerateAndPublishWiki(ctx, result.Issues, cfg.Project.Name); err != nil {
				fmt.Printf("❌ Wiki投稿エラー: %v\n", err)
				os.Exit(1)
			}
			fmt.Printf("✅ GitHub Wikiへの投稿完了!\n")
		} else {
			fmt.Printf("📁 ローカルファイルとして保存 (platform: %s)\n", cfg.Output.Wiki.Platform)
		}

		fmt.Println("🦫 知識ダム構築完了!")
	},
}

// parseOwnerRepo parses "owner/repo" format and returns owner, repo
func parseOwnerRepo(repoPath string) (string, string) {
	parts := splitString(repoPath, "/")
	if len(parts) != 2 {
		return "", ""
	}
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
		fmt.Println("📊 Beaver処理状況:")

		// Check configuration file
		configPath, err := config.GetConfigPath()
		if err != nil {
			fmt.Println("❌ 設定ファイルなし")
			fmt.Println("💡 beaver init で初期化してください")
			return
		}

		fmt.Printf("📄 設定ファイル: %s\n", configPath)

		// Load and validate configuration
		cfg, err := config.LoadConfig()
		if err != nil {
			fmt.Printf("❌ 設定読み込みエラー: %v\n", err)
			return
		}

		fmt.Printf("📁 プロジェクト: %s\n", cfg.Project.Name)
		fmt.Printf("🔗 リポジトリ: %s\n", cfg.Project.Repository)
		fmt.Printf("🤖 AI Provider: %s (%s)\n", cfg.AI.Provider, cfg.AI.Model)
		fmt.Printf("📝 出力先: %s Wiki\n", cfg.Output.Wiki.Platform)

		// Check GitHub token
		if cfg.Sources.GitHub.Token == "" {
			fmt.Println("⚠️  GITHUB_TOKEN が設定されていません")
		} else {
			fmt.Println("✅ GITHUB_TOKEN 設定済み")
		}

		// Test GitHub connection if token is available
		if cfg.Sources.GitHub.Token != "" {
			fmt.Printf("🔗 GitHub接続をテスト中...\n")
			githubService := github.NewService(cfg.Sources.GitHub.Token)
			ctx := context.Background()

			if err := githubService.TestConnection(ctx); err != nil {
				fmt.Printf("❌ GitHub接続エラー: %v\n", err)
			} else {
				fmt.Println("✅ GitHub接続成功")

				// Get repository info if configured
				if cfg.Project.Repository != "" && cfg.Project.Repository != "username/my-repo" {
					query := models.DefaultIssueQuery(cfg.Project.Repository)
					query.PerPage = 1 // Just get one issue to test

					result, err := githubService.FetchIssues(ctx, query)
					if err != nil {
						fmt.Printf("⚠️  Issues取得テストエラー: %v\n", err)
					} else {
						fmt.Printf("📊 利用可能Issues: %d件以上\n", result.FetchedCount)
						if result.RateLimit != nil {
							fmt.Printf("🚦 API制限: %d/%d (リセット: %s)\n",
								result.RateLimit.Remaining,
								result.RateLimit.Limit,
								result.RateLimit.ResetTime.Format("15:04:05"))
						}
					}
				}
			}
		}

		// Show configuration validation
		fmt.Printf("\n🔍 設定検証:\n")
		if err := cfg.Validate(); err != nil {
			fmt.Printf("❌ %v\n", err)
			fmt.Printf("💡 設定を修正してから beaver build を実行してください\n")
		} else {
			fmt.Printf("✅ 設定は有効です\n")
			fmt.Printf("🚀 beaver build でWiki生成を実行できます\n")
		}
	},
}

func init() {
	rootCmd.AddCommand(initCmd)
	rootCmd.AddCommand(buildCmd)
	rootCmd.AddCommand(statusCmd)
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "エラー: %v\n", err)
		os.Exit(1)
	}
}

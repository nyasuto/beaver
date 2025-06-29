package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/nyasuto/beaver/internal/config"
	"github.com/nyasuto/beaver/internal/models"
	"github.com/nyasuto/beaver/pkg/actions"
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
	Run: runRootCommand,
}

func runRootCommand(cmd *cobra.Command, args []string) {
	fmt.Println("🦫 Beaver - AIエージェント知識ダム構築ツール")
	fmt.Println("使用方法: beaver [command]")
	fmt.Println("詳細なヘルプ: beaver --help")
}

var initCmd = &cobra.Command{
	Use:   "init",
	Short: "プロジェクト設定の初期化",
	Long:  "Beaverプロジェクトの設定ファイル(beaver.yml)を生成し、初期設定を行います。",
	Run:   runInitCommand,
}

// Build command flags
var (
	incrementalBuild bool
	forceRebuild     bool
	notifyOnSuccess  bool
	notifyOnFailure  bool
	stateFile        string
	maxItems         int
)

var buildCmd = &cobra.Command{
	Use:   "build",
	Short: "最新Issuesをwikiに処理",
	Long: `GitHub Issues を取得し、AI処理を実行して Wiki ドキュメントを生成します。

インクリメンタルモード:
  --incremental    前回の更新以降の変更のみを処理 (高速化)
  --force-rebuild  すべてのIssueを再処理 (完全再構築)
  --state-file     インクリメンタル状態ファイルのパス
  --max-items      1回の更新で処理する最大アイテム数

通知オプション:
  --notify-success 成功時にSlack/Teams通知を送信
  --notify-failure 失敗時にSlack/Teams通知を送信

Example:
  beaver build                    # 通常のビルド
  beaver build --incremental      # インクリメンタルビルド
  beaver build --force-rebuild    # 完全再構築
  beaver build --notify-success   # 成功時通知付き`,
	RunE: runBuildCommand,
}

func runBuildCommand(cmd *cobra.Command, args []string) error {
	log.Printf("INFO Starting beaver build command")

	// Get GitHub Actions context if available
	var githubCtx *actions.GitHubContext
	var notifier *actions.Notifier

	if actions.IsGitHubActions() {
		if ctx, err := actions.GetGitHubContext(); err == nil {
			githubCtx = ctx
			actions.LogInfo(fmt.Sprintf("Running in GitHub Actions: %s", actions.GetUpdateReason(ctx)))
		}
	}

	// Setup notifications if configured
	if (notifyOnSuccess || notifyOnFailure) && githubCtx != nil {
		// Load notification config from environment
		notificationConfig := actions.NotificationConfig{
			Slack: actions.SlackConfig{
				WebhookURL: os.Getenv("SLACK_WEBHOOK_URL"),
				Channel:    os.Getenv("SLACK_CHANNEL"),
				Username:   "Beaver Wiki Bot",
				IconEmoji:  ":beaver:",
			},
			Teams: actions.TeamsConfig{
				WebhookURL: os.Getenv("TEAMS_WEBHOOK_URL"),
			},
		}
		if notificationConfig.Slack.WebhookURL != "" || notificationConfig.Teams.WebhookURL != "" {
			notifier = actions.NewNotifier(notificationConfig)
		}
	}

	// Determine if this should be an incremental build
	isIncremental := incrementalBuild
	if githubCtx != nil && !forceRebuild {
		isIncremental = actions.IsIncrementalUpdate(githubCtx)
	}

	if isIncremental {
		fmt.Println("⚡ インクリメンタルビルドを開始中...")
	} else {
		fmt.Println("🏗️ 完全ビルドを開始中...")
	}

	// Load configuration
	log.Printf("INFO Loading configuration")
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Printf("ERROR Failed to load configuration: %v", err)
		if notifier != nil && notifyOnFailure && githubCtx != nil {
			notifier.SendWikiUpdateNotification(githubCtx, false, fmt.Sprintf("設定読み込みエラー: %v", err))
		}
		return fmt.Errorf("❌ 設定読み込みエラー: %w", err)
	}
	log.Printf("INFO Configuration loaded: project=%s, repo=%s", cfg.Project.Name, cfg.Project.Repository)

	// Validate configuration
	log.Printf("INFO Validating configuration")
	if err := cfg.Validate(); err != nil {
		log.Printf("ERROR Configuration validation failed: %v", err)
		return fmt.Errorf("❌ 設定が無効です: %w", err)
	}
	log.Printf("INFO Configuration validation passed")

	// Check if repository is configured
	if cfg.Project.Repository == "" || cfg.Project.Repository == "username/my-repo" {
		log.Printf("ERROR Repository not configured")
		return fmt.Errorf("❌ リポジトリが設定されていません。beaver.yml でリポジトリを指定してください")
	}

	log.Printf("INFO Parsing repository path: %s", cfg.Project.Repository)
	owner, repo := parseOwnerRepo(cfg.Project.Repository)
	if owner == "" || repo == "" {
		log.Printf("ERROR Invalid repository format: %s", cfg.Project.Repository)
		return fmt.Errorf("❌ リポジトリ形式が無効です: %s (owner/repo 形式で指定してください)", cfg.Project.Repository)
	}
	log.Printf("INFO Repository parsed: owner=%s, repo=%s", owner, repo)

	// Check GitHub token
	log.Printf("INFO Checking GitHub token")
	if cfg.Sources.GitHub.Token == "" {
		log.Printf("ERROR GitHub token not configured")
		return fmt.Errorf("❌ GITHUB_TOKEN が設定されていません")
	}
	log.Printf("INFO GitHub token configured (length: %d)", len(cfg.Sources.GitHub.Token))

	// Setup incremental manager if needed
	var incrementalManager *actions.IncrementalManager
	if isIncremental || githubCtx != nil {
		options := actions.IncrementalOptions{
			StateFile:    stateFile,
			ForceRebuild: forceRebuild,
			MaxItems:     maxItems,
			LookbackTime: 24 * time.Hour, // Default 24 hours
		}

		if options.StateFile == "" {
			options.StateFile = ".beaver/incremental-state.json"
		}
		if options.MaxItems == 0 {
			options.MaxItems = 100
		}

		incrementalManager = actions.NewIncrementalManager(options)
		if err := incrementalManager.LoadState(); err != nil {
			log.Printf("WARN Failed to load incremental state: %v", err)
		}

		// Check if we should force a rebuild
		if githubCtx != nil && incrementalManager.ShouldTriggerRebuild(githubCtx) {
			isIncremental = false
			fmt.Println("🔄 フルリビルドが必要です...")
		}
	}

	// Initialize GitHub service
	log.Printf("INFO Initializing GitHub service")
	githubService := github.NewService(cfg.Sources.GitHub.Token)
	ctx := context.Background()

	// Test GitHub connection
	log.Printf("INFO Testing GitHub connection")
	fmt.Printf("🔗 GitHub接続をテスト中...\n")
	if err := githubService.TestConnection(ctx); err != nil {
		log.Printf("ERROR GitHub connection failed: %v", err)
		return fmt.Errorf("❌ GitHub接続エラー: %w", err)
	}
	log.Printf("INFO GitHub connection successful")
	fmt.Println("✅ GitHub接続成功")

	// Fetch Issues
	log.Printf("INFO Fetching Issues from repository: %s", cfg.Project.Repository)
	if isIncremental && incrementalManager != nil {
		fmt.Printf("⚡ インクリメンタルIssues取得中: %s\n", cfg.Project.Repository)
	} else {
		fmt.Printf("📥 Issues取得中: %s\n", cfg.Project.Repository)
	}

	query := models.DefaultIssueQuery(cfg.Project.Repository)

	// Modify query for incremental updates
	if isIncremental && incrementalManager != nil {
		query = *incrementalManager.GetIncrementalQuery(&query)
		log.Printf("INFO Using incremental query: since=%v, max_items=%d",
			query.Since, query.PerPage)
	}

	result, err := githubService.FetchIssues(ctx, query)
	if err != nil {
		log.Printf("ERROR Failed to fetch Issues: %v", err)
		return fmt.Errorf("❌ Issues取得エラー: %w", err)
	}
	log.Printf("INFO Issues fetch successful: count=%d, rate_limit=%d/%d", result.FetchedCount, func() int {
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

	fmt.Printf("📊 取得したIssues: %d件\n", result.FetchedCount)
	if result.RateLimit != nil {
		fmt.Printf("🚦 API制限: %d/%d (リセット: %s)\n",
			result.RateLimit.Remaining,
			result.RateLimit.Limit,
			result.RateLimit.ResetTime.Format("15:04:05"))
	}

	// Apply incremental filtering if needed
	issuesForProcessing := result.Issues
	if isIncremental && incrementalManager != nil {
		issuesForProcessing = incrementalManager.FilterIssuesForIncremental(result.Issues)
		log.Printf("INFO Filtered issues for incremental processing: %d -> %d",
			len(result.Issues), len(issuesForProcessing))
	}

	// Generate Wiki content
	log.Printf("INFO Generating Wiki content")
	fmt.Printf("📝 Wiki生成中...\n")
	wikiGenerator := wiki.NewGenerator()
	wikiPages, err := wikiGenerator.GenerateAllPages(issuesForProcessing, cfg.Project.Name)
	if err != nil {
		log.Printf("ERROR Failed to generate Wiki content: %v", err)
		return fmt.Errorf("❌ Wiki生成エラー: %w", err)
	}
	log.Printf("INFO Wiki content generated: %d pages", len(wikiPages))

	// Save Wiki pages
	log.Printf("INFO Saving Wiki pages")
	var totalSize int
	for _, page := range wikiPages {
		outputPath := fmt.Sprintf("%s-%s", repo, page.Filename)
		if err := os.WriteFile(outputPath, []byte(page.Content), 0600); err != nil {
			log.Printf("ERROR Failed to save Wiki page: %v", err)
			return fmt.Errorf("❌ Wikiページ保存エラー: %w", err)
		}
		totalSize += len(page.Content)
		log.Printf("INFO Wiki page saved: %s (size: %d bytes)", outputPath, len(page.Content))
		fmt.Printf("✅ Wikiページ生成完了: %s\n", outputPath)
	}

	// Update incremental state if needed
	if incrementalManager != nil {
		// Mark processed issues
		for _, issue := range issuesForProcessing {
			incrementalManager.MarkIssueProcessed(issue.Number)
		}

		// Update last update timestamp
		if githubCtx != nil {
			incrementalManager.UpdateLastUpdate(githubCtx.SHA)
			incrementalManager.MarkEventProcessed(githubCtx.Event, githubCtx.RunID, map[string]interface{}{
				"repository": githubCtx.Repository,
				"actor":      githubCtx.Actor,
				"workflow":   githubCtx.Workflow,
			})
		} else {
			incrementalManager.UpdateLastUpdate("")
		}

		// Clean up old state entries
		incrementalManager.CleanupOldState()

		// Save state
		if err := incrementalManager.SaveState(); err != nil {
			log.Printf("WARN Failed to save incremental state: %v", err)
		}

		// Display incremental summary
		summary := incrementalManager.GetUpdateSummary()
		if summary["is_incremental"].(bool) {
			fmt.Printf("⚡ インクリメンタル更新統計:\n")
			fmt.Printf("  📊 処理したIssues: %d件 (全体: %d件)\n", len(issuesForProcessing), len(result.Issues))
			fmt.Printf("  🕒 前回更新: %s\n", summary["last_update"])
			fmt.Printf("  📈 累計処理済み: %d件\n", summary["total_processed_issues"])
		}
	}

	fmt.Printf("📄 総ファイルサイズ: %.2f KB\n", float64(totalSize)/1024)
	fmt.Printf("📊 処理したIssues: %d件\n", len(issuesForProcessing))
	fmt.Printf("📝 生成したページ: %d件\n", len(wikiPages))

	// Send success notification if configured
	if notifier != nil && notifyOnSuccess && githubCtx != nil {
		message := fmt.Sprintf("Wiki更新完了: %d件のIssueを処理し、%d個のページを生成しました",
			len(issuesForProcessing), len(wikiPages))
		if isIncremental {
			message = fmt.Sprintf("インクリメンタルWiki更新完了: %d件のIssueを処理し、%d個のページを生成しました",
				len(issuesForProcessing), len(wikiPages))
		}
		results := notifier.SendWikiUpdateNotification(githubCtx, true, message)
		for _, result := range results {
			if result.Success {
				log.Printf("INFO Notification sent successfully to %s", result.Channel)
			} else {
				log.Printf("WARN Failed to send notification to %s: %s", result.Channel, result.Error)
			}
		}
	}

	fmt.Println("🦫 Beaver Build完了!")
	log.Printf("INFO Build command completed successfully")
	return nil
}

func runInitCommand(cmd *cobra.Command, args []string) {
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
	Run:   runStatusCommand,
}

func runStatusCommand(cmd *cobra.Command, args []string) {
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
}

func init() {
	rootCmd.AddCommand(initCmd)
	rootCmd.AddCommand(buildCmd)
	rootCmd.AddCommand(statusCmd)
	rootCmd.AddCommand(analyzeCmd)
	rootCmd.AddCommand(generateCmd)

	// Build command flags
	buildCmd.Flags().BoolVar(&incrementalBuild, "incremental", false, "インクリメンタルビルドを実行 (前回更新以降の変更のみ)")
	buildCmd.Flags().BoolVar(&forceRebuild, "force-rebuild", false, "すべてのIssueを再処理 (完全再構築)")
	buildCmd.Flags().BoolVar(&notifyOnSuccess, "notify-success", false, "成功時にSlack/Teams通知を送信")
	buildCmd.Flags().BoolVar(&notifyOnFailure, "notify-failure", false, "失敗時にSlack/Teams通知を送信")
	buildCmd.Flags().StringVar(&stateFile, "state-file", "", "インクリメンタル状態ファイルのパス (デフォルト: .beaver/incremental-state.json)")
	buildCmd.Flags().IntVar(&maxItems, "max-items", 100, "1回の更新で処理する最大アイテム数")
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

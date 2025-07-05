package main

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/nyasuto/beaver/internal/config"
	"github.com/nyasuto/beaver/internal/logger"
	"github.com/nyasuto/beaver/internal/models"
	"github.com/nyasuto/beaver/pkg/github"
	"github.com/spf13/cobra"
)

var doctorCmd = &cobra.Command{
	Use:   "doctor",
	Short: "システム設定の診断と検証",
	Long: `Beaverの設定、GitHub接続、環境設定を包括的に診断します。

診断項目:
- 設定ファイル (beaver.yml) の存在と妥当性
- GitHub Token の設定と接続テスト
- リポジトリ設定の確認
- 必要なディレクトリの存在確認
- 権限とアクセスの検証

問題が見つかった場合、具体的な解決方法を提示します。`,
	Run: runDoctorCommand,
}

func runDoctorCommand(cmd *cobra.Command, args []string) {
	doctorLogger := logger.WithComponent("doctor")
	doctorLogger.Info("Starting beaver doctor command")

	fmt.Println("🏥 Beaver Doctor - システム診断")
	fmt.Println("================================")
	fmt.Println()

	var issues []string
	var warnings []string

	// 1. Check configuration file
	fmt.Print("📄 設定ファイル確認... ")
	configPath, err := config.GetConfigPath()
	if err != nil {
		fmt.Println("❌")
		issues = append(issues, "設定ファイル beaver.yml が見つかりません")
		fmt.Println("💡 解決方法: beaver init で初期設定を作成してください")
		fmt.Println()
	} else {
		fmt.Printf("✅ (%s)\n", configPath)
	}

	// 2. Load and validate configuration
	fmt.Print("⚙️  設定内容検証... ")
	cfg, err := config.LoadConfig()
	if err != nil {
		fmt.Println("❌")
		fmt.Printf("💡 解決方法: beaver init で設定を再作成するか、beaver.yml を手動で修正してください\n")
		fmt.Printf("   エラー詳細: %v\n", err)
		fmt.Println()
		return // Can't continue without config
	}

	if err := cfg.Validate(); err != nil {
		fmt.Println("⚠️")
		warnings = append(warnings, fmt.Sprintf("設定検証警告: %v", err))
		fmt.Printf("💡 解決方法: beaver.yml を確認して必要な項目を設定してください\n")
	} else {
		fmt.Println("✅")
	}
	fmt.Printf("   プロジェクト: %s\n", cfg.Project.Name)
	fmt.Printf("   リポジトリ: %s\n", cfg.Project.Repository)
	fmt.Println()

	// 3. Check repository format
	fmt.Print("🔗 リポジトリ形式確認... ")
	if cfg.Project.Repository == "" || cfg.Project.Repository == "username/my-repo" {
		fmt.Println("❌")
		issues = append(issues, "リポジトリが設定されていません")
		fmt.Println("💡 解決方法: beaver.yml の project.repository を 'owner/repo' 形式で設定してください")
		fmt.Println("   例: repository: \"nyasuto/beaver\"")
		fmt.Println()
	} else {
		owner, repo := parseOwnerRepo(cfg.Project.Repository)
		if owner == "" || repo == "" {
			fmt.Println("❌")
			issues = append(issues, fmt.Sprintf("リポジトリ形式が無効: %s", cfg.Project.Repository))
			fmt.Println("💡 解決方法: 'owner/repo' 形式で設定してください (例: nyasuto/beaver)")
			fmt.Println()
		} else {
			fmt.Printf("✅ (%s/%s)\n", owner, repo)
			fmt.Println()
		}
	}

	// 4. Check GitHub token
	fmt.Print("🔑 GitHub Token確認... ")
	token := cfg.Sources.GitHub.Token
	if token == "" {
		if envToken := os.Getenv("GITHUB_TOKEN"); envToken != "" {
			token = envToken
			fmt.Println("✅ (環境変数から取得)")
		} else {
			fmt.Println("❌")
			issues = append(issues, "GitHub Token が設定されていません")
			fmt.Println("💡 解決方法:")
			fmt.Println("   1. GitHub Personal Access Token を取得: https://github.com/settings/tokens")
			fmt.Println("   2. 環境変数に設定: export GITHUB_TOKEN=your_token")
			fmt.Println("   3. または beaver.yml に設定: sources.github.token")
			fmt.Println()
		}
	} else {
		fmt.Printf("✅ (長さ: %d文字)\n", len(token))
	}
	fmt.Println()

	// 5. Test GitHub connection if token is available
	if token != "" {
		fmt.Print("🌐 GitHub接続テスト... ")
		githubService := github.NewService(token)
		ctx := context.Background()

		if err := githubService.TestConnection(ctx); err != nil {
			fmt.Println("❌")
			issues = append(issues, fmt.Sprintf("GitHub接続失敗: %v", err))
			fmt.Println("💡 解決方法:")
			fmt.Println("   1. GitHub Token が有効か確認")
			fmt.Println("   2. Token に必要な権限があるか確認 (repo読み取り)")
			fmt.Println("   3. ネットワーク接続を確認")
			fmt.Println()
		} else {
			fmt.Println("✅")

			// Test repository access if configured
			if cfg.Project.Repository != "" && cfg.Project.Repository != "username/my-repo" {
				fmt.Print("📊 リポジトリアクセステスト... ")
				query := models.DefaultIssueQuery(cfg.Project.Repository)
				query.PerPage = 1

				result, err := githubService.FetchIssues(ctx, query)
				if err != nil {
					fmt.Println("❌")
					if strings.Contains(err.Error(), "404") {
						warnings = append(warnings, "リポジトリが見つからないか、アクセス権限がありません")
						fmt.Println("💡 解決方法:")
						fmt.Println("   1. リポジトリ名を確認 (owner/repo)")
						fmt.Println("   2. リポジトリが公開されているか確認")
						fmt.Println("   3. Token にリポジトリアクセス権限があるか確認")
					} else {
						warnings = append(warnings, fmt.Sprintf("リポジトリアクセスエラー: %v", err))
					}
					fmt.Println()
				} else {
					fmt.Printf("✅ (%d Issues利用可能)\n", result.FetchedCount)
					if result.RateLimit != nil {
						fmt.Printf("   API制限: %d/%d 残り\n", result.RateLimit.Remaining, result.RateLimit.Limit)
					}
					fmt.Println()
				}
			}
		}
	}

	// 6. Check directories
	fmt.Print("📁 ディレクトリ確認... ")
	var dirIssues []string

	if _, err := os.Stat("_site"); os.IsNotExist(err) {
		dirIssues = append(dirIssues, "_site (ページ生成後に作成)")
	}

	if _, err := os.Stat(".beaver"); os.IsNotExist(err) {
		dirIssues = append(dirIssues, ".beaver (状態管理用)")
	}

	if len(dirIssues) > 0 {
		fmt.Println("⚠️")
		fmt.Printf("   不足ディレクトリ: %s\n", strings.Join(dirIssues, ", "))
		fmt.Println("💡 これらは必要に応じて自動作成されます")
	} else {
		fmt.Println("✅")
	}
	fmt.Println()

	// 7. Display summary
	fmt.Println("📋 診断結果")
	fmt.Println("============")

	if len(issues) == 0 && len(warnings) == 0 {
		fmt.Println("🎉 すべての診断項目が正常です！")
		fmt.Println("🚀 beaver build でWiki生成を実行できます")
	} else {
		if len(issues) > 0 {
			fmt.Printf("❌ %d個の問題が見つかりました:\n", len(issues))
			for i, issue := range issues {
				fmt.Printf("   %d. %s\n", i+1, issue)
			}
			fmt.Println()
		}

		if len(warnings) > 0 {
			fmt.Printf("⚠️  %d個の警告があります:\n", len(warnings))
			for i, warning := range warnings {
				fmt.Printf("   %d. %s\n", i+1, warning)
			}
			fmt.Println()
		}

		fmt.Println("📚 サポート:")
		fmt.Println("   - 詳細ヘルプ: beaver [command] --help")
		fmt.Println("   - 初期設定: beaver init")
		fmt.Println("   - 設定確認: beaver status")
	}

	doctorLogger.Info("Doctor command completed")
}

func init() {
	// Doctor command will be added to root in main.go init()
}

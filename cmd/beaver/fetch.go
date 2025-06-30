package main

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/nyasuto/beaver/internal/config"
	"github.com/nyasuto/beaver/internal/models"
	"github.com/nyasuto/beaver/pkg/github"
	"github.com/nyasuto/beaver/pkg/wiki"
	"github.com/spf13/cobra"
)

var fetchCmd = &cobra.Command{
	Use:   "fetch",
	Short: "データソースからコンテンツを取得",
	Long:  "GitHub Issues、PRs、コミットなどのデータソースからコンテンツを取得します。",
}

var fetchIssuesCmd = &cobra.Command{
	Use:   "issues <repository>",
	Short: "GitHub Issuesを取得",
	Long: `指定されたリポジトリからGitHub Issuesを取得します。

リポジトリは 'owner/repo' 形式で指定してください。

例:
  beaver fetch issues microsoft/vscode
  beaver fetch issues --state=closed --max-pages=2 golang/go
  beaver fetch issues --labels=bug,enhancement nyasuto/beaver`,
	Args: cobra.ExactArgs(1),
	RunE: runFetchIssues,
}

// CLI flags for fetch issues command
var (
	issueState      string
	issueLabels     []string
	issueSort       string
	issueDirection  string
	issueSince      string
	issuePerPage    int
	issueMaxPages   int
	outputFormat    string
	outputFile      string
	includeComments bool
)

func init() {
	// Add fetch command to root
	rootCmd.AddCommand(fetchCmd)
	fetchCmd.AddCommand(fetchIssuesCmd)

	// Flags for fetch issues command
	fetchIssuesCmd.Flags().StringVar(&issueState, "state", "open", "Issue状態フィルター (open, closed, all)")
	fetchIssuesCmd.Flags().StringSliceVar(&issueLabels, "labels", nil, "ラベルでフィルター (カンマ区切り)")
	fetchIssuesCmd.Flags().StringVar(&issueSort, "sort", "created", "ソート順 (created, updated, comments)")
	fetchIssuesCmd.Flags().StringVar(&issueDirection, "direction", "desc", "ソート方向 (asc, desc)")
	fetchIssuesCmd.Flags().StringVar(&issueSince, "since", "", "指定日時以降のIssueのみ (RFC3339形式)")
	fetchIssuesCmd.Flags().IntVar(&issuePerPage, "per-page", 30, "ページあたりの件数 (1-100)")
	fetchIssuesCmd.Flags().IntVar(&issueMaxPages, "max-pages", 0, "最大取得ページ数 (0=全ページ)")
	fetchIssuesCmd.Flags().StringVar(&outputFormat, "format", "json", "出力形式 (json, summary)")
	fetchIssuesCmd.Flags().StringVar(&outputFile, "output", "", "出力ファイル (指定なしで標準出力)")
	fetchIssuesCmd.Flags().BoolVar(&includeComments, "include-comments", true, "コメントも取得するか")
}

// Service factory for dependency injection in tests
var githubServiceFactory = func(token string) github.ServiceInterface {
	return github.NewService(token)
}

func runFetchIssues(cmd *cobra.Command, args []string) error {
	repository := args[0]

	// Validate repository format
	if !strings.Contains(repository, "/") || strings.Count(repository, "/") != 1 {
		return fmt.Errorf("❌ リポジトリ形式が無効です。'owner/repo' 形式で指定してください")
	}

	// Load configuration to get GitHub token
	cfg, err := config.LoadConfig()
	if err != nil {
		return fmt.Errorf("❌ 設定読み込みエラー: %w", err)
	}

	// Validate that we have a GitHub token
	if cfg.Sources.GitHub.Token == "" {
		return fmt.Errorf("❌ GitHub tokenが設定されていません。GITHUB_TOKEN環境変数または設定ファイルで指定してください")
	}

	// Create GitHub service using factory (allows injection in tests)
	githubService := githubServiceFactory(cfg.Sources.GitHub.Token)

	return runFetchIssuesWithGitHubService(githubService, args)
}

func runFetchIssuesWithGitHubService(githubService github.ServiceInterface, args []string) error {
	repository := args[0]

	// Parse since parameter if provided
	var sinceTime *time.Time
	if issueSince != "" {
		parsed, err := time.Parse(time.RFC3339, issueSince)
		if err != nil {
			return fmt.Errorf("❌ since パラメータの形式が無効です。RFC3339形式で指定してください: %w", err)
		}
		sinceTime = &parsed
	}

	// Validate per-page range
	if issuePerPage < 1 || issuePerPage > 100 {
		return fmt.Errorf("❌ per-page は 1-100 の範囲で指定してください")
	}

	// Create query
	query := models.IssueQuery{
		Repository: repository,
		State:      issueState,
		Labels:     issueLabels,
		Sort:       issueSort,
		Direction:  issueDirection,
		Since:      sinceTime,
		PerPage:    issuePerPage,
		MaxPages:   issueMaxPages,
	}

	fmt.Printf("🔍 GitHub Issuesを取得中: %s\n", repository)
	fmt.Printf("   状態: %s, ソート: %s (%s)\n", query.State, query.Sort, query.Direction)
	if len(query.Labels) > 0 {
		fmt.Printf("   ラベル: %s\n", strings.Join(query.Labels, ", "))
	}
	if query.Since != nil {
		fmt.Printf("   開始日時: %s\n", query.Since.Format("2006-01-02 15:04:05"))
	}

	// Test connection first
	ctx := context.Background()
	if err := githubService.TestConnection(ctx); err != nil {
		return fmt.Errorf("❌ GitHub API接続テストに失敗: %w", err)
	}

	// Fetch issues
	result, err := githubService.FetchIssues(ctx, query)
	if err != nil {
		return fmt.Errorf("❌ Issues取得に失敗: %w", err)
	}

	// Add comment fetching control
	if !includeComments {
		for i := range result.Issues {
			result.Issues[i].Comments = nil
		}
	}

	// Display results based on format
	switch outputFormat {
	case "json":
		return outputJSON(result, outputFile)
	case "summary":
		return outputSummary(result, outputFile)
	default:
		return fmt.Errorf("❌ 無効な出力形式: %s (json, summary のいずれかを指定してください)", outputFormat)
	}
}

func outputJSON(result *models.IssueResult, outputFile string) error {
	jsonData, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		return fmt.Errorf("❌ JSON変換エラー: %w", err)
	}

	if outputFile != "" {
		err = wiki.WriteFileUTF8(outputFile, string(jsonData), 0600)
		if err != nil {
			return fmt.Errorf("❌ ファイル書き込みエラー: %w", err)
		}
		fmt.Printf("✅ 結果をファイルに保存しました: %s\n", outputFile)
	} else {
		fmt.Println(string(jsonData))
	}

	return nil
}

func outputSummary(result *models.IssueResult, outputFile string) error {
	var output strings.Builder

	// Header
	output.WriteString(fmt.Sprintf("📊 GitHub Issues取得結果 - %s\n", result.Repository))
	output.WriteString(fmt.Sprintf("取得日時: %s\n", result.FetchedAt.Format("2006-01-02 15:04:05")))
	output.WriteString(fmt.Sprintf("取得件数: %d件\n", result.FetchedCount))

	if result.RateLimit != nil {
		output.WriteString(fmt.Sprintf("API制限: %d/%d 残り (リセット: %s)\n",
			result.RateLimit.Remaining,
			result.RateLimit.Limit,
			result.RateLimit.ResetTime.Format("15:04:05")))
	}

	output.WriteString("\n" + strings.Repeat("=", 60) + "\n\n")

	// Issue list
	for i, issue := range result.Issues {
		output.WriteString(fmt.Sprintf("%d. #%d %s\n", i+1, issue.Number, issue.Title))
		output.WriteString(fmt.Sprintf("   状態: %s | 作成者: %s | 作成日: %s\n",
			issue.State,
			issue.User.Login,
			issue.CreatedAt.Format("2006-01-02")))

		if len(issue.Labels) > 0 {
			labels := make([]string, len(issue.Labels))
			for j, label := range issue.Labels {
				labels[j] = label.Name
			}
			output.WriteString(fmt.Sprintf("   ラベル: %s\n", strings.Join(labels, ", ")))
		}

		if len(issue.Comments) > 0 {
			output.WriteString(fmt.Sprintf("   コメント: %d件\n", len(issue.Comments)))
		}

		if issue.Body != "" {
			// Show first 100 characters of body
			body := issue.Body
			if len(body) > 100 {
				body = body[:100] + "..."
			}
			// Replace newlines with spaces for summary
			body = strings.ReplaceAll(body, "\n", " ")
			output.WriteString(fmt.Sprintf("   概要: %s\n", body))
		}

		output.WriteString(fmt.Sprintf("   URL: %s\n", issue.HTMLURL))
		output.WriteString("\n")
	}

	// Statistics
	output.WriteString(strings.Repeat("=", 60) + "\n")

	// Count by state
	openCount := 0
	closedCount := 0
	for _, issue := range result.Issues {
		if issue.State == "open" {
			openCount++
		} else {
			closedCount++
		}
	}

	output.WriteString("📈 統計情報:\n")
	output.WriteString(fmt.Sprintf("   オープン: %d件\n", openCount))
	output.WriteString(fmt.Sprintf("   クローズ: %d件\n", closedCount))

	// Count by labels
	labelCount := make(map[string]int)
	for _, issue := range result.Issues {
		for _, label := range issue.Labels {
			labelCount[label.Name]++
		}
	}

	if len(labelCount) > 0 {
		output.WriteString("\n🏷️  ラベル別件数:\n")
		for label, count := range labelCount {
			output.WriteString(fmt.Sprintf("   %s: %d件\n", label, count))
		}
	}

	summaryText := output.String()

	if outputFile != "" {
		err := wiki.WriteFileUTF8(outputFile, summaryText, 0600)
		if err != nil {
			return fmt.Errorf("❌ ファイル書き込みエラー: %w", err)
		}
		fmt.Printf("✅ サマリーをファイルに保存しました: %s\n", outputFile)
	} else {
		fmt.Print(summaryText)
	}

	return nil
}

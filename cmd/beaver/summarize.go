package main

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/nyasuto/beaver/internal/ai"
	"github.com/nyasuto/beaver/internal/config"
	"github.com/nyasuto/beaver/pkg/github"
	"github.com/spf13/cobra"
)

var (
	aiServiceURL      string
	aiProvider        string
	aiModel           string
	aiMaxTokens       int
	aiTemperature     float64
	aiIncludeComments bool
	aiLanguage        string
	aiOutputFormat    string
	aiBatchSize       int
)

var summarizeCmd = &cobra.Command{
	Use:   "summarize",
	Short: "GitHub IssueをAI要約",
	Long: `指定されたGitHub IssueをAI (OpenAI/Anthropic) を使用して要約します。
	
単一Issue要約:
  beaver summarize issue <owner/repo> <issue-number>
  
複数Issue要約:
  beaver summarize issues <owner/repo> [issue1,issue2,...]
  
全Issue要約:
  beaver summarize all <owner/repo>`,
}

var summarizeIssueCmd = &cobra.Command{
	Use:   "issue <owner/repo> <issue-number>",
	Short: "単一のIssueを要約",
	Long:  "指定されたGitHub Issueを詳細に分析し、AI要約を生成します。",
	Args:  cobra.ExactArgs(2),
	RunE:  runSummarizeIssue,
}

var summarizeIssuesCmd = &cobra.Command{
	Use:   "issues <owner/repo> [issue1,issue2,...]",
	Short: "複数のIssueを要約",
	Long:  "複数のGitHub Issueをバッチ処理で要約します。Issue番号をカンマ区切りで指定します。",
	Args:  cobra.MinimumNArgs(1),
	RunE:  runSummarizeIssues,
}

var summarizeAllCmd = &cobra.Command{
	Use:   "all <owner/repo>",
	Short: "全Issueを要約",
	Long:  "リポジトリの全Issueを要約します。大量のIssueがある場合は時間がかかります。",
	Args:  cobra.ExactArgs(1),
	RunE:  runSummarizeAll,
}

func init() {
	// Add subcommands
	summarizeCmd.AddCommand(summarizeIssueCmd)
	summarizeCmd.AddCommand(summarizeIssuesCmd)
	summarizeCmd.AddCommand(summarizeAllCmd)

	// Persistent flags for all summarize commands
	summarizeCmd.PersistentFlags().StringVar(&aiServiceURL, "ai-url", "http://localhost:8000", "AI serviceのURL")
	summarizeCmd.PersistentFlags().StringVar(&aiProvider, "provider", "openai", "AI provider (openai, anthropic)")
	summarizeCmd.PersistentFlags().StringVar(&aiModel, "model", "", "使用するモデル (未指定時はデフォルト)")
	summarizeCmd.PersistentFlags().IntVar(&aiMaxTokens, "max-tokens", 4000, "最大トークン数")
	summarizeCmd.PersistentFlags().Float64Var(&aiTemperature, "temperature", 0.7, "モデル温度 (0.0-2.0)")
	summarizeCmd.PersistentFlags().BoolVar(&aiIncludeComments, "comments", true, "コメントを含めるか")
	summarizeCmd.PersistentFlags().StringVar(&aiLanguage, "lang", "ja", "出力言語 (ja, en)")
	summarizeCmd.PersistentFlags().StringVar(&aiOutputFormat, "format", "text", "出力形式 (text, json)")

	// Batch-specific flags
	summarizeIssuesCmd.Flags().IntVar(&aiBatchSize, "batch-size", 10, "バッチサイズ")
	summarizeAllCmd.Flags().IntVar(&aiBatchSize, "batch-size", 10, "バッチサイズ")

	// Add to root command
	rootCmd.AddCommand(summarizeCmd)
}

func runSummarizeIssue(cmd *cobra.Command, args []string) error {
	ctx := context.Background()

	// Parse owner/repo
	parts := strings.Split(args[0], "/")
	if len(parts) != 2 {
		return fmt.Errorf("リポジトリ形式が正しくありません。owner/repo の形式で指定してください")
	}
	owner, repo := parts[0], parts[1]

	// Parse issue number
	issueNum, err := strconv.Atoi(args[1])
	if err != nil {
		return fmt.Errorf("issue番号が正しくありません: %v", err)
	}

	fmt.Printf("🔍 Issue #%d を取得中... (%s/%s)\n", issueNum, owner, repo)

	// Initialize GitHub client
	cfg, err := config.LoadConfig()
	if err != nil {
		return fmt.Errorf("設定読み込みエラー: %v", err)
	}

	ghClient := github.NewClient(cfg.Sources.GitHub.Token)

	// Fetch single issue (we need to implement this method)
	issue, err := fetchSingleIssue(ctx, ghClient, owner, repo, issueNum)
	if err != nil {
		return fmt.Errorf("issue取得エラー: %v", err)
	}

	// Initialize AI client
	aiClient := ai.NewClient(aiServiceURL, 30*time.Second)

	// Convert to AI format
	aiIssue := ai.ConvertGitHubIssueToAI(issue)

	// Create summarization request
	req := ai.NewSummarizationRequest(aiIssue).
		WithProvider(ai.AIProvider(aiProvider)).
		WithLanguage(aiLanguage).
		WithComments(aiIncludeComments)

	if aiModel != "" {
		req = req.WithModel(aiModel)
	}
	if aiMaxTokens > 0 {
		req = req.WithMaxTokens(aiMaxTokens)
	}
	if aiTemperature >= 0 {
		req = req.WithTemperature(aiTemperature)
	}

	fmt.Printf("🤖 AI要約を生成中... (Provider: %s)\n", aiProvider)

	// Call AI service
	response, err := aiClient.SummarizeIssue(ctx, req)
	if err != nil {
		return fmt.Errorf("AI要約エラー: %v", err)
	}

	// Output results
	return outputSummarization(response, aiOutputFormat)
}

func runSummarizeIssues(cmd *cobra.Command, args []string) error {
	ctx := context.Background()

	// Parse owner/repo
	parts := strings.Split(args[0], "/")
	if len(parts) != 2 {
		return fmt.Errorf("リポジトリ形式が正しくありません。owner/repo の形式で指定してください")
	}
	owner, repo := parts[0], parts[1]

	// Parse issue numbers
	var issueNumbers []int
	if len(args) > 1 {
		// Parse comma-separated issue numbers
		issueStrs := strings.Split(args[1], ",")
		for _, issueStr := range issueStrs {
			issueNum, err := strconv.Atoi(strings.TrimSpace(issueStr))
			if err != nil {
				return fmt.Errorf("issue番号が正しくありません: %s", issueStr)
			}
			issueNumbers = append(issueNumbers, issueNum)
		}
	} else {
		return fmt.Errorf("issue番号を指定してください (例: 1,2,3)")
	}

	fmt.Printf("🔍 %d個のIssueを取得中... (%s/%s)\n", len(issueNumbers), owner, repo)

	// Initialize clients
	cfg, err := config.LoadConfig()
	if err != nil {
		return fmt.Errorf("設定読み込みエラー: %v", err)
	}

	ghClient := github.NewClient(cfg.Sources.GitHub.Token)
	aiClient := ai.NewClient(aiServiceURL, 30*time.Second)

	// Fetch issues
	var issues []ai.IssueData
	for _, issueNum := range issueNumbers {
		issue, err := fetchSingleIssue(ctx, ghClient, owner, repo, issueNum)
		if err != nil {
			fmt.Printf("⚠️ Issue #%d 取得エラー: %v\n", issueNum, err)
			continue
		}
		issues = append(issues, ai.ConvertGitHubIssueToAI(issue))
	}

	if len(issues) == 0 {
		return fmt.Errorf("処理可能なIssueがありません")
	}

	// Create batch request
	req := ai.NewBatchSummarizationRequest(issues).
		WithProvider(ai.AIProvider(aiProvider)).
		WithLanguage(aiLanguage).
		WithComments(aiIncludeComments)

	if aiModel != "" {
		req = req.WithModel(aiModel)
	}
	if aiMaxTokens > 0 {
		req = req.WithMaxTokens(aiMaxTokens)
	}
	if aiTemperature >= 0 {
		req = req.WithTemperature(aiTemperature)
	}

	fmt.Printf("🤖 %d個のIssueをAI要約中... (Provider: %s)\n", len(issues), aiProvider)

	// Call AI service
	response, err := aiClient.SummarizeIssuesBatch(ctx, req)
	if err != nil {
		return fmt.Errorf("バッチAI要約エラー: %v", err)
	}

	// Output results
	return outputBatchSummarization(response, aiOutputFormat)
}

func runSummarizeAll(cmd *cobra.Command, args []string) error {
	ctx := context.Background()

	// Parse owner/repo
	parts := strings.Split(args[0], "/")
	if len(parts) != 2 {
		return fmt.Errorf("リポジトリ形式が正しくありません。owner/repo の形式で指定してください")
	}
	owner, repo := parts[0], parts[1]

	fmt.Printf("🔍 全Issueを取得中... (%s/%s)\n", owner, repo)

	// Initialize clients
	cfg, err := config.LoadConfig()
	if err != nil {
		return fmt.Errorf("設定読み込みエラー: %v", err)
	}

	ghClient := github.NewClient(cfg.Sources.GitHub.Token)

	// Fetch all issues
	ghIssues, err := ghClient.FetchIssues(ctx, owner, repo, nil)
	if err != nil {
		return fmt.Errorf("全Issue取得エラー: %v", err)
	}

	if len(ghIssues) == 0 {
		fmt.Println("📭 処理可能なIssueがありません")
		return nil
	}

	fmt.Printf("📚 %d個のIssueを発見。バッチ処理を開始...\n", len(ghIssues))

	// Convert to AI format
	issues := ai.ConvertGitHubIssuesToAI(ghIssues)
	aiClient := ai.NewClient(aiServiceURL, 60*time.Second) // Longer timeout for batch

	// Process in batches
	var allResults []*ai.SummarizationResponse
	totalProcessed := 0
	totalErrors := 0

	for i := 0; i < len(issues); i += aiBatchSize {
		end := i + aiBatchSize
		if end > len(issues) {
			end = len(issues)
		}

		batch := issues[i:end]
		fmt.Printf("🔄 バッチ %d-%d を処理中...\n", i+1, end)

		// Create batch request
		req := ai.NewBatchSummarizationRequest(batch).
			WithProvider(ai.AIProvider(aiProvider)).
			WithLanguage(aiLanguage).
			WithComments(aiIncludeComments)

		if aiModel != "" {
			req = req.WithModel(aiModel)
		}
		if aiMaxTokens > 0 {
			req = req.WithMaxTokens(aiMaxTokens)
		}
		if aiTemperature >= 0 {
			req = req.WithTemperature(aiTemperature)
		}

		// Call AI service
		response, err := aiClient.SummarizeIssuesBatch(ctx, req)
		if err != nil {
			fmt.Printf("⚠️ バッチ %d-%d エラー: %v\n", i+1, end, err)
			totalErrors += len(batch)
			continue
		}

		// Collect results
		for _, result := range response.Results {
			allResults = append(allResults, &result)
		}

		totalProcessed += response.TotalProcessed
		totalErrors += response.TotalFailed

		// Brief delay between batches
		time.Sleep(1 * time.Second)
	}

	fmt.Printf("\n📊 処理完了: %d成功, %d失敗\n", totalProcessed, totalErrors)

	// Output summary of results
	if aiOutputFormat == "json" {
		// Output all results as JSON array
		fmt.Println("[")
		for i, result := range allResults {
			if i > 0 {
				fmt.Println(",")
			}
			// Note: This would need proper JSON marshaling
			fmt.Printf("  {\"summary\": \"%s\", \"complexity\": \"%s\"}",
				result.Summary, result.Complexity)
		}
		fmt.Println("\n]")
	} else {
		// Output text summary
		for i, result := range allResults {
			fmt.Printf("\n--- Issue %d ---\n", i+1)
			fmt.Printf("要約: %s\n", result.Summary)
			fmt.Printf("複雑度: %s\n", result.Complexity)
			if result.Category != nil {
				fmt.Printf("カテゴリ: %s\n", *result.Category)
			}
		}
	}

	return nil
}

// Helper function to fetch a single issue
func fetchSingleIssue(ctx context.Context, client *github.Client, owner, repo string, issueNum int) (*github.IssueData, error) {
	// This is a simplified implementation - in practice, you'd want to add this method to the GitHub client
	issues, err := client.FetchIssues(ctx, owner, repo, nil) // This fetches all, we need to filter
	if err != nil {
		return nil, err
	}

	for _, issue := range issues {
		if issue.Number == issueNum {
			return issue, nil
		}
	}

	return nil, fmt.Errorf("issue #%d が見つかりません", issueNum)
}

func outputSummarization(response *ai.SummarizationResponse, format string) error {
	if format == "json" {
		// In a real implementation, you'd use proper JSON marshaling
		fmt.Printf("{\n")
		fmt.Printf("  \"summary\": \"%s\",\n", response.Summary)
		fmt.Printf("  \"complexity\": \"%s\",\n", response.Complexity)
		if response.Category != nil {
			fmt.Printf("  \"category\": \"%s\",\n", *response.Category)
		}
		fmt.Printf("  \"processing_time\": %.2f,\n", response.ProcessingTime)
		fmt.Printf("  \"provider_used\": \"%s\",\n", response.ProviderUsed)
		fmt.Printf("  \"model_used\": \"%s\"\n", response.ModelUsed)
		fmt.Printf("}\n")
	} else {
		fmt.Printf("\n✨ AI要約結果\n")
		fmt.Printf("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
		fmt.Printf("📝 要約:\n%s\n\n", response.Summary)

		if len(response.KeyPoints) > 0 {
			fmt.Printf("🔑 重要ポイント:\n")
			for _, point := range response.KeyPoints {
				fmt.Printf("  • %s\n", point)
			}
			fmt.Printf("\n")
		}

		if response.Category != nil {
			fmt.Printf("📂 カテゴリ: %s\n", *response.Category)
		}
		fmt.Printf("⚡ 複雑度: %s\n", response.Complexity)
		fmt.Printf("🤖 使用プロバイダー: %s (%s)\n", response.ProviderUsed, response.ModelUsed)
		fmt.Printf("⏱️  処理時間: %.2f秒\n", response.ProcessingTime)

		if response.TokenUsage != nil {
			if total, ok := response.TokenUsage["total_tokens"]; ok {
				fmt.Printf("🎫 使用トークン: %d\n", total)
			}
		}
	}

	return nil
}

func outputBatchSummarization(response *ai.BatchSummarizationResponse, format string) error {
	if format == "json" {
		// In a real implementation, you'd use proper JSON marshaling
		fmt.Printf("{\n")
		fmt.Printf("  \"total_processed\": %d,\n", response.TotalProcessed)
		fmt.Printf("  \"total_failed\": %d,\n", response.TotalFailed)
		fmt.Printf("  \"processing_time\": %.2f,\n", response.ProcessingTime)
		fmt.Printf("  \"results\": [...]\n") // Simplified
		fmt.Printf("}\n")
	} else {
		fmt.Printf("\n✨ バッチAI要約結果\n")
		fmt.Printf("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
		fmt.Printf("📊 処理統計:\n")
		fmt.Printf("  ✅ 成功: %d件\n", response.TotalProcessed)
		fmt.Printf("  ❌ 失敗: %d件\n", response.TotalFailed)
		fmt.Printf("  ⏱️  合計時間: %.2f秒\n", response.ProcessingTime)

		if len(response.FailedIssues) > 0 {
			fmt.Printf("\n⚠️ エラー詳細:\n")
			for _, failed := range response.FailedIssues {
				fmt.Printf("  • Issue #%d: %s\n", failed.IssueNumber, failed.Error)
			}
		}

		fmt.Printf("\n📝 要約結果:\n")
		for i, result := range response.Results {
			fmt.Printf("\n--- Issue %d ---\n", i+1)
			fmt.Printf("要約: %s\n", result.Summary)
			fmt.Printf("複雑度: %s\n", result.Complexity)
			if result.Category != nil {
				fmt.Printf("カテゴリ: %s\n", *result.Category)
			}
		}
	}

	return nil
}

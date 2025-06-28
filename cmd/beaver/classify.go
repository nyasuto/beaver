package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/nyasuto/beaver/internal/config"
	"github.com/nyasuto/beaver/internal/models"
	"github.com/nyasuto/beaver/pkg/classification"
	"github.com/nyasuto/beaver/pkg/github"
	"github.com/spf13/cobra"
)

// Service factory functions for dependency injection in tests
var (
	classifyGitHubServiceFactory = func(token string) github.ServiceInterface {
		return github.NewService(token)
	}
	classifyClassifierFactory = func(cfg *config.Config) (*classification.HybridClassifier, error) {
		return createClassifier(cfg)
	}
	classifyConfigLoader = func() (*config.Config, error) {
		return config.LoadConfig()
	}
)

var classifyCmd = &cobra.Command{
	Use:   "classify",
	Short: "GitHub Issues自動分類機能",
	Long: `GitHub Issues を AI とルールベースの分類機能を使って自動分類します。

単一Issue、複数Issues、または全Issuesの分類をサポートします。
分類結果は JSON、サマリー、Wiki 形式で出力できます。`,
}

var classifyIssueCmd = &cobra.Command{
	Use:   "issue <repository> <issue-number>",
	Short: "単一Issueを分類",
	Long: `指定されたリポジトリの単一Issueを分類します。

例:
  beaver classify issue microsoft/vscode 12345
  beaver classify issue --output json nyasuto/beaver 100`,
	Args: cobra.ExactArgs(2),
	RunE: runClassifyIssue,
}

var classifyIssuesCmd = &cobra.Command{
	Use:   "issues <repository> <issue-numbers...>",
	Short: "複数Issuesを分類",
	Long: `指定されたリポジトリの複数Issuesを分類します。

例:
  beaver classify issues microsoft/vscode 100 101 102
  beaver classify issues --parallel=5 golang/go 1000 1001 1002 1003`,
	Args: cobra.MinimumNArgs(2),
	RunE: runClassifyIssues,
}

var classifyAllCmd = &cobra.Command{
	Use:   "all <repository>",
	Short: "全Issuesを分類",
	Long: `指定されたリポジトリの全Issuesを分類します。

例:
  beaver classify all nyasuto/beaver
  beaver classify all --state=open --max-issues=100 microsoft/vscode`,
	Args: cobra.ExactArgs(1),
	RunE: runClassifyAll,
}

// CLI flags for classify commands
var (
	classifyOutputFormat string
	classifyOutputFile   string
	classifyParallel     int
	classifyState        string
	classifyMaxIssues    int
	classifyMethod       string
	classifyVerbose      bool
	classifyProgress     bool
)

type ClassificationSummary struct {
	Repository  string                      `json:"repository"`
	ProcessedAt time.Time                   `json:"processed_at"`
	TotalIssues int                         `json:"total_issues"`
	Successful  int                         `json:"successful"`
	Failed      int                         `json:"failed"`
	Categories  map[string]int              `json:"categories"`
	AverageTime float64                     `json:"average_time"`
	Method      string                      `json:"method"`
	Results     []IssueClassificationResult `json:"results"`
	Errors      []ClassificationError       `json:"errors,omitempty"`
}

type IssueClassificationResult struct {
	IssueNumber    int                                        `json:"issue_number"`
	IssueTitle     string                                     `json:"issue_title"`
	Category       string                                     `json:"category"`
	Confidence     float64                                    `json:"confidence"`
	Method         string                                     `json:"method"`
	ProcessingTime float64                                    `json:"processing_time"`
	Details        *classification.HybridClassificationResult `json:"details,omitempty"`
}

type ClassificationError struct {
	IssueNumber int    `json:"issue_number"`
	Error       string `json:"error"`
}

func init() {
	rootCmd.AddCommand(classifyCmd)
	classifyCmd.AddCommand(classifyIssueCmd)
	classifyCmd.AddCommand(classifyIssuesCmd)
	classifyCmd.AddCommand(classifyAllCmd)

	for _, cmd := range []*cobra.Command{classifyIssueCmd, classifyIssuesCmd, classifyAllCmd} {
		cmd.Flags().StringVar(&classifyOutputFormat, "output", "summary", "出力形式 (json, summary, wiki)")
		cmd.Flags().StringVar(&classifyOutputFile, "file", "", "出力ファイル (指定なしで標準出力)")
		cmd.Flags().StringVar(&classifyMethod, "method", "hybrid", "分類手法 (rule, ai, hybrid)")
		cmd.Flags().BoolVar(&classifyVerbose, "verbose", false, "詳細出力を有効化")
		cmd.Flags().BoolVar(&classifyProgress, "progress", true, "プログレスバーを表示")
	}

	for _, cmd := range []*cobra.Command{classifyIssuesCmd, classifyAllCmd} {
		cmd.Flags().IntVar(&classifyParallel, "parallel", 3, "並列実行数 (1-10)")
	}

	classifyAllCmd.Flags().StringVar(&classifyState, "state", "all", "Issue状態フィルター (open, closed, all)")
	classifyAllCmd.Flags().IntVar(&classifyMaxIssues, "max-issues", 0, "最大処理Issue数 (0=全て)")
}

func runClassifyIssue(cmd *cobra.Command, args []string) error {
	repository := args[0]
	issueNumberStr := args[1]

	if !validateRepository(repository) {
		return fmt.Errorf("❌ リポジトリ形式が無効です。'owner/repo' 形式で指定してください")
	}

	issueNumber, err := strconv.Atoi(issueNumberStr)
	if err != nil {
		return fmt.Errorf("❌ Issue番号が無効です: %s", issueNumberStr)
	}

	cfg, err := classifyConfigLoader()
	if err != nil {
		return fmt.Errorf("❌ 設定読み込みエラー: %w", err)
	}

	if cfg.Sources.GitHub.Token == "" {
		return fmt.Errorf("❌ GitHub tokenが設定されていません")
	}

	githubService := classifyGitHubServiceFactory(cfg.Sources.GitHub.Token)
	classifier, err := classifyClassifierFactory(cfg)
	if err != nil {
		return fmt.Errorf("❌ 分類器作成エラー: %w", err)
	}

	ctx := context.Background()

	fmt.Printf("🔍 Issue #%d を取得中: %s\n", issueNumber, repository)
	issue, err := fetchSingleIssueForClassify(ctx, githubService, repository, issueNumber)
	if err != nil {
		return fmt.Errorf("❌ Issue取得エラー: %w", err)
	}

	fmt.Printf("🤖 Issue #%d を分類中...\n", issueNumber)
	result, err := classifySingleIssue(ctx, classifier, issue)
	if err != nil {
		return fmt.Errorf("❌ 分類エラー: %w", err)
	}

	summary := &ClassificationSummary{
		Repository:  repository,
		ProcessedAt: time.Now(),
		TotalIssues: 1,
		Successful:  1,
		Failed:      0,
		Categories:  map[string]int{result.Category: 1},
		AverageTime: result.ProcessingTime,
		Method:      result.Method,
		Results:     []IssueClassificationResult{*result},
	}

	return outputClassificationResults(summary, classifyOutputFormat, classifyOutputFile)
}

func runClassifyIssues(cmd *cobra.Command, args []string) error {
	repository := args[0]
	issueNumbers := args[1:]

	if !validateRepository(repository) {
		return fmt.Errorf("❌ リポジトリ形式が無効です。'owner/repo' 形式で指定してください")
	}

	if classifyParallel < 1 || classifyParallel > 10 {
		return fmt.Errorf("❌ parallel は 1-10 の範囲で指定してください")
	}

	var issueNums []int
	for _, numStr := range issueNumbers {
		num, err := strconv.Atoi(numStr)
		if err != nil {
			return fmt.Errorf("❌ Issue番号が無効です: %s", numStr)
		}
		issueNums = append(issueNums, num)
	}

	cfg, err := classifyConfigLoader()
	if err != nil {
		return fmt.Errorf("❌ 設定読み込みエラー: %w", err)
	}

	if cfg.Sources.GitHub.Token == "" {
		return fmt.Errorf("❌ GitHub tokenが設定されていません")
	}

	githubService := classifyGitHubServiceFactory(cfg.Sources.GitHub.Token)
	classifier, err := classifyClassifierFactory(cfg)
	if err != nil {
		return fmt.Errorf("❌ 分類器作成エラー: %w", err)
	}

	ctx := context.Background()

	fmt.Printf("🔍 %d個のIssuesを取得・分類中: %s\n", len(issueNums), repository)
	if classifyProgress {
		fmt.Printf("📊 並列実行数: %d\n", classifyParallel)
	}

	summary, err := processIssuesInParallel(ctx, githubService, classifier, repository, issueNums, classifyParallel)
	if err != nil {
		return err
	}

	return outputClassificationResults(summary, classifyOutputFormat, classifyOutputFile)
}

func runClassifyAll(cmd *cobra.Command, args []string) error {
	repository := args[0]

	if !validateRepository(repository) {
		return fmt.Errorf("❌ リポジトリ形式が無効です。'owner/repo' 形式で指定してください")
	}

	if classifyParallel < 1 || classifyParallel > 10 {
		return fmt.Errorf("❌ parallel は 1-10 の範囲で指定してください")
	}

	cfg, err := classifyConfigLoader()
	if err != nil {
		return fmt.Errorf("❌ 設定読み込みエラー: %w", err)
	}

	if cfg.Sources.GitHub.Token == "" {
		return fmt.Errorf("❌ GitHub tokenが設定されていません")
	}

	githubService := classifyGitHubServiceFactory(cfg.Sources.GitHub.Token)
	classifier, err := classifyClassifierFactory(cfg)
	if err != nil {
		return fmt.Errorf("❌ 分類器作成エラー: %w", err)
	}

	ctx := context.Background()

	fmt.Printf("🔍 全Issuesを取得中: %s\n", repository)
	query := models.DefaultIssueQuery(repository)
	query.State = classifyState
	if classifyMaxIssues > 0 {
		query.PerPage = min(classifyMaxIssues, 100)
		query.MaxPages = (classifyMaxIssues + query.PerPage - 1) / query.PerPage
	}

	result, err := githubService.FetchIssues(ctx, query)
	if err != nil {
		return fmt.Errorf("❌ Issues取得エラー: %w", err)
	}

	issues := result.Issues
	if classifyMaxIssues > 0 && len(issues) > classifyMaxIssues {
		issues = issues[:classifyMaxIssues]
	}

	if len(issues) == 0 {
		fmt.Println("⚠️  処理するIssuesがありません")
		return nil
	}

	fmt.Printf("📊 取得したIssues: %d件\n", len(issues))
	if classifyProgress {
		fmt.Printf("📊 並列実行数: %d\n", classifyParallel)
	}

	var issueNumbers []int
	for _, issue := range issues {
		issueNumbers = append(issueNumbers, issue.Number)
	}

	summary, err := processIssuesInParallel(ctx, githubService, classifier, repository, issueNumbers, classifyParallel)
	if err != nil {
		return err
	}

	return outputClassificationResults(summary, classifyOutputFormat, classifyOutputFile)
}

func validateRepository(repository string) bool {
	if !strings.Contains(repository, "/") || strings.Count(repository, "/") != 1 {
		return false
	}
	parts := strings.Split(repository, "/")
	return len(parts) == 2 && parts[0] != "" && parts[1] != ""
}

func createClassifier(_ *config.Config) (*classification.HybridClassifier, error) {
	ruleSet := classification.GetDefaultRuleSet()
	ruleEngine, err := classification.NewRuleEngine(ruleSet)
	if err != nil {
		return nil, fmt.Errorf("failed to create rule engine: %w", err)
	}

	var aiClient *classification.AIClient
	if classifyMethod == "hybrid" || classifyMethod == "ai" {
		hybridConfig := classification.GetDefaultHybridConfig()
		aiClient = classification.NewAIClient(hybridConfig.AIServiceURL, hybridConfig.AIServiceTimeout)
	}

	hybridConfig := classification.GetDefaultHybridConfig()
	classifier := classification.NewHybridClassifier(ruleEngine, aiClient, hybridConfig)

	return classifier, nil
}

func fetchSingleIssueForClassify(ctx context.Context, githubService github.ServiceInterface, repository string, issueNumber int) (*models.Issue, error) {
	query := models.DefaultIssueQuery(repository)
	query.State = "all"
	query.PerPage = 100

	result, err := githubService.FetchIssues(ctx, query)
	if err != nil {
		return nil, err
	}

	for _, issue := range result.Issues {
		if issue.Number == issueNumber {
			return &issue, nil
		}
	}

	return nil, fmt.Errorf("issue #%d not found", issueNumber)
}

func classifySingleIssue(ctx context.Context, classifier *classification.HybridClassifier, issue *models.Issue) (*IssueClassificationResult, error) {
	classifyIssue := classification.Issue{
		ID:     int(issue.ID),
		Number: issue.Number,
		Title:  issue.Title,
		Body:   issue.Body,
		State:  issue.State,
	}

	for _, label := range issue.Labels {
		classifyIssue.Labels = append(classifyIssue.Labels, label.Name)
	}

	for _, comment := range issue.Comments {
		classifyIssue.Comments = append(classifyIssue.Comments, comment.Body)
	}

	hybridResult, err := classifier.ClassifyIssue(ctx, classifyIssue)
	if err != nil {
		return nil, err
	}

	return &IssueClassificationResult{
		IssueNumber:    issue.Number,
		IssueTitle:     issue.Title,
		Category:       string(hybridResult.Category),
		Confidence:     hybridResult.Confidence,
		Method:         hybridResult.Method,
		ProcessingTime: hybridResult.ProcessingTime,
		Details:        hybridResult,
	}, nil
}

func processIssuesInParallel(ctx context.Context, githubService github.ServiceInterface, classifier *classification.HybridClassifier, repository string, issueNumbers []int, parallel int) (*ClassificationSummary, error) {
	var (
		results    []IssueClassificationResult
		errors     []ClassificationError
		mu         sync.Mutex
		wg         sync.WaitGroup
		semaphore  = make(chan struct{}, parallel)
		totalTime  float64
		successful int
		failed     int
	)

	start := time.Now()
	categories := make(map[string]int)

	for _, issueNumber := range issueNumbers {
		wg.Add(1)
		go func(num int) {
			defer wg.Done()
			semaphore <- struct{}{}
			defer func() { <-semaphore }()

			issue, err := fetchSingleIssueForClassify(ctx, githubService, repository, num)
			if err != nil {
				mu.Lock()
				errors = append(errors, ClassificationError{
					IssueNumber: num,
					Error:       err.Error(),
				})
				failed++
				mu.Unlock()
				return
			}

			result, err := classifySingleIssue(ctx, classifier, issue)
			if err != nil {
				mu.Lock()
				errors = append(errors, ClassificationError{
					IssueNumber: num,
					Error:       err.Error(),
				})
				failed++
				mu.Unlock()
				return
			}

			mu.Lock()
			results = append(results, *result)
			categories[result.Category]++
			totalTime += result.ProcessingTime
			successful++

			if classifyProgress {
				fmt.Printf("✅ Issue #%d: %s (%.2fs)\n", num, result.Category, result.ProcessingTime)
			}
			mu.Unlock()
		}(issueNumber)
	}

	wg.Wait()

	sort.Slice(results, func(i, j int) bool {
		return results[i].IssueNumber < results[j].IssueNumber
	})

	averageTime := 0.0
	if successful > 0 {
		averageTime = totalTime / float64(successful)
	}

	summary := &ClassificationSummary{
		Repository:  repository,
		ProcessedAt: time.Now(),
		TotalIssues: len(issueNumbers),
		Successful:  successful,
		Failed:      failed,
		Categories:  categories,
		AverageTime: averageTime,
		Method:      classifyMethod,
		Results:     results,
		Errors:      errors,
	}

	elapsed := time.Since(start)
	fmt.Printf("\n📊 分類完了: %d件処理 (%d成功, %d失敗) %.2fs\n",
		len(issueNumbers), successful, failed, elapsed.Seconds())

	return summary, nil
}

func outputClassificationResults(summary *ClassificationSummary, format, outputFile string) error {
	switch format {
	case "json":
		return outputClassificationJSON(summary, outputFile)
	case "summary":
		return outputClassificationSummary(summary, outputFile)
	case "wiki":
		return outputClassificationWiki(summary, outputFile)
	default:
		return fmt.Errorf("❌ 無効な出力形式: %s (json, summary, wiki のいずれかを指定してください)", format)
	}
}

func outputClassificationJSON(summary *ClassificationSummary, outputFile string) error {
	jsonData, err := json.MarshalIndent(summary, "", "  ")
	if err != nil {
		return fmt.Errorf("❌ JSON変換エラー: %w", err)
	}

	if outputFile != "" {
		err = os.WriteFile(outputFile, jsonData, 0600)
		if err != nil {
			return fmt.Errorf("❌ ファイル書き込みエラー: %w", err)
		}
		fmt.Printf("✅ 分類結果をJSONファイルに保存しました: %s\n", outputFile)
	} else {
		fmt.Println(string(jsonData))
	}

	return nil
}

func outputClassificationSummary(summary *ClassificationSummary, outputFile string) error {
	var output strings.Builder

	output.WriteString(fmt.Sprintf("🤖 GitHub Issues 分類結果 - %s\n", summary.Repository))
	output.WriteString(fmt.Sprintf("処理日時: %s\n", summary.ProcessedAt.Format("2006-01-02 15:04:05")))
	output.WriteString(fmt.Sprintf("分類手法: %s\n", summary.Method))
	output.WriteString(fmt.Sprintf("処理件数: %d件 (成功: %d, 失敗: %d)\n",
		summary.TotalIssues, summary.Successful, summary.Failed))
	output.WriteString(fmt.Sprintf("平均処理時間: %.3fs\n", summary.AverageTime))

	output.WriteString("\n" + strings.Repeat("=", 60) + "\n\n")

	output.WriteString("📊 カテゴリ別統計:\n")
	for category, count := range summary.Categories {
		percentage := float64(count) / float64(summary.Successful) * 100
		output.WriteString(fmt.Sprintf("   %s: %d件 (%.1f%%)\n", category, count, percentage))
	}

	output.WriteString("\n" + strings.Repeat("-", 60) + "\n\n")

	output.WriteString("📝 分類結果詳細:\n\n")
	for i, result := range summary.Results {
		output.WriteString(fmt.Sprintf("%d. #%d %s\n", i+1, result.IssueNumber, result.IssueTitle))
		output.WriteString(fmt.Sprintf("   カテゴリ: %s (信頼度: %.2f)\n", result.Category, result.Confidence))
		output.WriteString(fmt.Sprintf("   処理時間: %.3fs | 手法: %s\n", result.ProcessingTime, result.Method))

		if classifyVerbose && result.Details != nil {
			details := result.Details.Details
			output.WriteString(fmt.Sprintf("   詳細: AI=%s(%.2f) Rule=%s(%.2f)\n",
				details.AICategory, details.AIConfidence,
				details.RuleCategory, details.RuleConfidence))
		}
		output.WriteString("\n")
	}

	if len(summary.Errors) > 0 {
		output.WriteString(strings.Repeat("-", 60) + "\n\n")
		output.WriteString("❌ エラー一覧:\n\n")
		for i, err := range summary.Errors {
			output.WriteString(fmt.Sprintf("%d. Issue #%d: %s\n", i+1, err.IssueNumber, err.Error))
		}
		output.WriteString("\n")
	}

	summaryText := output.String()

	if outputFile != "" {
		err := os.WriteFile(outputFile, []byte(summaryText), 0600)
		if err != nil {
			return fmt.Errorf("❌ ファイル書き込みエラー: %w", err)
		}
		fmt.Printf("✅ 分類サマリーをファイルに保存しました: %s\n", outputFile)
	} else {
		fmt.Print(summaryText)
	}

	return nil
}

func outputClassificationWiki(summary *ClassificationSummary, outputFile string) error {
	var output strings.Builder

	output.WriteString(fmt.Sprintf("# Issues 分類結果 - %s\n\n", summary.Repository))
	output.WriteString(fmt.Sprintf("**処理日時**: %s  \n", summary.ProcessedAt.Format("2006-01-02 15:04:05")))
	output.WriteString(fmt.Sprintf("**分類手法**: %s  \n", summary.Method))
	output.WriteString(fmt.Sprintf("**処理件数**: %d件 (成功: %d, 失敗: %d)  \n",
		summary.TotalIssues, summary.Successful, summary.Failed))
	output.WriteString(fmt.Sprintf("**平均処理時間**: %.3fs  \n\n", summary.AverageTime))

	output.WriteString("## 📊 カテゴリ別統計\n\n")
	output.WriteString("| カテゴリ | 件数 | 割合 |\n")
	output.WriteString("|----------|------|------|\n")
	for category, count := range summary.Categories {
		percentage := float64(count) / float64(summary.Successful) * 100
		output.WriteString(fmt.Sprintf("| %s | %d | %.1f%% |\n", category, count, percentage))
	}
	output.WriteString("\n")

	output.WriteString("## 📝 分類結果詳細\n\n")
	output.WriteString("| Issue# | タイトル | カテゴリ | 信頼度 | 処理時間 |\n")
	output.WriteString("|--------|----------|----------|--------|----------|\n")
	for _, result := range summary.Results {
		title := strings.ReplaceAll(result.IssueTitle, "|", "\\|")
		if len(title) > 50 {
			title = title[:47] + "..."
		}
		output.WriteString(fmt.Sprintf("| #%d | %s | %s | %.2f | %.3fs |\n",
			result.IssueNumber, title, result.Category, result.Confidence, result.ProcessingTime))
	}
	output.WriteString("\n")

	if len(summary.Errors) > 0 {
		output.WriteString("## ❌ エラー一覧\n\n")
		for _, err := range summary.Errors {
			output.WriteString(fmt.Sprintf("- **Issue #%d**: %s\n", err.IssueNumber, err.Error))
		}
		output.WriteString("\n")
	}

	wikiText := output.String()

	if outputFile != "" {
		err := os.WriteFile(outputFile, []byte(wikiText), 0600)
		if err != nil {
			return fmt.Errorf("❌ ファイル書き込みエラー: %w", err)
		}
		fmt.Printf("✅ 分類結果をWikiファイルに保存しました: %s\n", outputFile)
	} else {
		fmt.Print(wikiText)
	}

	return nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

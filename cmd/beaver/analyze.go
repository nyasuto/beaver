package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/nyasuto/beaver/internal/config"
	"github.com/nyasuto/beaver/internal/models"
	"github.com/nyasuto/beaver/pkg/analytics"
	"github.com/nyasuto/beaver/pkg/github"
	"github.com/spf13/cobra"
)

var analyzeCmd = &cobra.Command{
	Use:   "analyze",
	Short: "開発パターンの分析",
	Long:  "GitHub Issues、コミット履歴、開発イベントから学習パターンと軌跡を分析します。",
}

var analyzePatternsCmd = &cobra.Command{
	Use:   "patterns",
	Short: "学習パターン認識と分析",
	Long: `開発履歴から成功・失敗パターンを抽出し、学習軌跡を分析します。

このコマンドは以下の分析を実行します:
- 成功パターンの検出（迅速解決、継続的成功）
- 学習パターンの認識（実験→学習→改善サイクル）
- 失敗からの回復パターン
- 反復パターンと改善トレンド
- スキル進化パターン
- 予測的洞察と推奨事項

出力は JSON 形式で保存され、可視化用データも含まれます。`,
	RunE: runAnalyzePatternsCommand,
}

// Command flags
var (
	outputPath string
	sinceDate  string
	maxCommits int
	includeGit bool
	author     string
	verbose    bool
)

func runAnalyzePatternsCommand(cmd *cobra.Command, args []string) error {
	log.Printf("INFO Starting beaver analyze patterns command")
	fmt.Println("🔍 学習パターン分析を開始中...")

	// Load configuration
	log.Printf("INFO Loading configuration")
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Printf("ERROR Failed to load configuration: %v", err)
		return fmt.Errorf("❌ 設定読み込みエラー: %w", err)
	}

	// Validate configuration
	if err := cfg.Validate(); err != nil {
		log.Printf("ERROR Configuration validation failed: %v", err)
		return fmt.Errorf("❌ 設定が無効です: %w", err)
	}

	owner, repo := parseOwnerRepo(cfg.Project.Repository)
	if owner == "" || repo == "" {
		return fmt.Errorf("❌ リポジトリ形式が無効です: %s", cfg.Project.Repository)
	}

	ctx := context.Background()

	// Initialize analytics components
	timelineProcessor := analytics.NewTimelineProcessor(cfg.Project.Repository)
	aiService := analytics.NewAIPatternService()

	// Check AI service dependencies
	if err := aiService.CheckPythonDependencies(ctx); err != nil {
		log.Printf("WARN AI pattern recognition unavailable: %v", err)
		fmt.Printf("⚠️  AI分析が利用できません: %v\n", err)
		fmt.Println("📝 基本的なタイムライン分析のみ実行します...")
	}

	// Collect development events from GitHub Issues
	var allEvents []analytics.TimelineEvent

	if cfg.Sources.GitHub.Token != "" {
		fmt.Println("📥 GitHub Issues を取得中...")
		events, err := fetchGitHubEvents(ctx, cfg, owner, repo)
		if err != nil {
			log.Printf("WARN Failed to fetch GitHub events: %v", err)
			fmt.Printf("⚠️  GitHub イベント取得エラー: %v\n", err)
		} else {
			allEvents = append(allEvents, events...)
			fmt.Printf("✅ GitHub Issues: %d件\n", len(events))
		}
	}

	// Collect Git commit events (if enabled and in a Git repository)
	if includeGit {
		fmt.Println("📥 Git コミット履歴を取得中...")
		gitEvents, err := fetchGitEvents(ctx, sinceDate, maxCommits)
		if err != nil {
			log.Printf("WARN Failed to fetch Git events: %v", err)
			fmt.Printf("⚠️  Git イベント取得エラー: %v\n", err)
		} else {
			allEvents = append(allEvents, gitEvents...)
			fmt.Printf("✅ Git コミット: %d件\n", len(gitEvents))
		}
	}

	if len(allEvents) == 0 {
		return fmt.Errorf("❌ 分析用のイベントが見つかりません。GitHub Token を設定するか --include-git フラグを使用してください")
	}

	// Create timeline
	fmt.Printf("⏱️  タイムライン処理中: %d件のイベント\n", len(allEvents))
	timeline := &analytics.Timeline{
		Events:     allEvents,
		Repository: cfg.Project.Repository,
	}

	// Sort events by timestamp
	if len(timeline.Events) > 0 {
		timeline.StartTime = timeline.Events[0].Timestamp
		timeline.EndTime = timeline.Events[len(timeline.Events)-1].Timestamp
		for _, event := range timeline.Events {
			if event.Timestamp.Before(timeline.StartTime) {
				timeline.StartTime = event.Timestamp
			}
			if event.Timestamp.After(timeline.EndTime) {
				timeline.EndTime = event.Timestamp
			}
		}
	}

	// Analyze timeline trends
	fmt.Println("📊 タイムライン傾向を分析中...")
	trends, err := timelineProcessor.AnalyzeTimelineTrends(ctx, timeline)
	if err != nil {
		log.Printf("ERROR Failed to analyze timeline trends: %v", err)
		return fmt.Errorf("❌ タイムライン分析エラー: %w", err)
	}

	// Get timeline metrics
	metrics := timeline.GetTimelineMetrics()

	// Perform AI pattern analysis if available
	var aiResult *analytics.AIPatternAnalysisResult
	fmt.Println("🤖 AI学習パターン分析を実行中...")
	aiResult, err = aiService.AnalyzePatterns(ctx, allEvents, author)
	if err != nil {
		log.Printf("WARN AI pattern analysis failed: %v", err)
		fmt.Printf("⚠️  AI分析エラー: %v\n", err)
	} else if aiResult.ErrorMessage != "" {
		log.Printf("WARN AI pattern analysis error: %s", aiResult.ErrorMessage)
		fmt.Printf("⚠️  AI分析エラー: %s\n", aiResult.ErrorMessage)
	} else {
		fmt.Printf("✅ AI分析完了: %d個のパターンを検出 (%.2f秒)\n",
			len(aiResult.Patterns), aiResult.ProcessingTime)
	}

	// Create analysis result
	result := &PatternAnalysisResult{
		Repository:  cfg.Project.Repository,
		AnalyzedAt:  time.Now(),
		TotalEvents: len(allEvents),
		TimeRange:   fmt.Sprintf("%s - %s", timeline.StartTime.Format("2006-01-02"), timeline.EndTime.Format("2006-01-02")),
		Timeline:    timeline,
		Trends:      trends,
		Metrics:     &metrics,
		AIAnalysis:  aiResult,
		Author:      author,
		IncludedGit: includeGit,
		AnalysisConfig: AnalysisConfig{
			SinceDate:  sinceDate,
			MaxCommits: maxCommits,
			Author:     author,
		},
	}

	// Display results
	fmt.Println("\n📈 分析結果:")
	fmt.Printf("📊 総イベント数: %d件\n", result.TotalEvents)
	fmt.Printf("📅 期間: %s\n", result.TimeRange)
	fmt.Printf("⏱️  平均解決時間: %.1f時間\n", trends.AverageResolutionHours)
	fmt.Printf("📋 基本パターン: %d件\n", len(trends.Patterns))
	fmt.Printf("💡 基本洞察: %d件\n", len(trends.Insights))

	// Display AI analysis results if available
	if result.AIAnalysis != nil && result.AIAnalysis.ErrorMessage == "" {
		fmt.Println("\n🤖 AI学習パターン分析:")
		fmt.Printf("🔍 AIパターン検出: %d件\n", len(result.AIAnalysis.Patterns))
		fmt.Printf("📊 成功率: %.1f%%\n", result.AIAnalysis.Analytics.SuccessRate*100)
		fmt.Printf("🚀 学習速度: %.2f パターン/月\n", result.AIAnalysis.Analytics.LearningVelocity)
		fmt.Printf("🌟 パターン多様性: %.2f\n", result.AIAnalysis.Analytics.PatternDiversity)
		fmt.Printf("🎯 一貫性スコア: %.2f\n", result.AIAnalysis.Analytics.ConsistencyScore)
		fmt.Printf("📈 トレンド: %s\n", result.AIAnalysis.Analytics.TrendDirection)
		fmt.Printf("👤 ドメイン: %s\n", result.AIAnalysis.Trajectory.Domain)
		fmt.Printf("📈 進歩スコア: %.1f%%\n", result.AIAnalysis.Trajectory.ProgressScore*100)
	}

	if verbose {
		fmt.Println("\n🔍 詳細パターン:")
		for i, pattern := range trends.Patterns {
			fmt.Printf("  %d. %s (信頼度: %.2f)\n", i+1, pattern.Description, pattern.Confidence)
		}

		fmt.Println("\n💡 主要洞察:")
		for i, insight := range trends.Insights {
			fmt.Printf("  %d. %s: %s\n", i+1, insight.Title, insight.Description)
			if insight.Actionable && insight.Suggestion != "" {
				fmt.Printf("     💡 推奨: %s\n", insight.Suggestion)
			}
		}

		// Display detailed AI analysis if available
		if result.AIAnalysis != nil && result.AIAnalysis.ErrorMessage == "" {
			fmt.Println("\n🤖 詳細AI学習パターン:")
			for i, pattern := range result.AIAnalysis.Patterns {
				fmt.Printf("  %d. [%s] %s (信頼度: %.2f, 成功率: %.1f%%)\n",
					i+1, pattern.Type, pattern.Title, pattern.Confidence, pattern.SuccessRate*100)
				fmt.Printf("     段階: %s, 頻度: %d\n", pattern.Stage, pattern.Frequency)
				if len(pattern.Insights) > 0 {
					fmt.Printf("     洞察: %s\n", pattern.Insights[0])
				}
			}

			if len(result.AIAnalysis.PredictiveInsights.NextLearningOpportunities) > 0 {
				fmt.Println("\n🔮 学習機会予測:")
				for i, opportunity := range result.AIAnalysis.PredictiveInsights.NextLearningOpportunities {
					fmt.Printf("  %d. %s\n", i+1, opportunity)
				}
			}

			if len(result.AIAnalysis.PredictiveInsights.RiskAreas) > 0 {
				fmt.Println("\n⚠️  リスク領域:")
				for i, risk := range result.AIAnalysis.PredictiveInsights.RiskAreas {
					fmt.Printf("  %d. %s\n", i+1, risk)
				}
			}
		}
	}

	// Save results to file
	outputFile := outputPath
	if outputFile == "" {
		outputFile = fmt.Sprintf("%s-pattern-analysis-%s.json", repo, time.Now().Format("20060102-150405"))
	}

	fmt.Printf("\n💾 結果を保存中: %s\n", outputFile)
	if err := saveAnalysisResult(result, outputFile); err != nil {
		log.Printf("ERROR Failed to save analysis result: %v", err)
		return fmt.Errorf("❌ 結果保存エラー: %w", err)
	}

	fmt.Println("✅ パターン分析完了!")
	fmt.Printf("📄 結果ファイル: %s\n", outputFile)

	return nil
}

// PatternAnalysisResult represents the complete analysis result
type PatternAnalysisResult struct {
	Repository     string                             `json:"repository"`
	AnalyzedAt     time.Time                          `json:"analyzed_at"`
	TotalEvents    int                                `json:"total_events"`
	TimeRange      string                             `json:"time_range"`
	Timeline       *analytics.Timeline                `json:"timeline"`
	Trends         *analytics.TimelineTrends          `json:"trends"`
	Metrics        *analytics.TimelineMetrics         `json:"metrics"`
	AIAnalysis     *analytics.AIPatternAnalysisResult `json:"ai_analysis,omitempty"`
	Author         string                             `json:"author,omitempty"`
	IncludedGit    bool                               `json:"included_git"`
	AnalysisConfig AnalysisConfig                     `json:"analysis_config"`
}

// AnalysisConfig represents the configuration used for analysis
type AnalysisConfig struct {
	SinceDate  string `json:"since_date,omitempty"`
	MaxCommits int    `json:"max_commits,omitempty"`
	Author     string `json:"author,omitempty"`
}

func fetchGitHubEvents(ctx context.Context, cfg *config.Config, _, _ string) ([]analytics.TimelineEvent, error) {
	githubService := github.NewService(cfg.Sources.GitHub.Token)

	// Test connection
	if err := githubService.TestConnection(ctx); err != nil {
		return nil, fmt.Errorf("GitHub connection failed: %w", err)
	}

	// Fetch Issues
	query := models.DefaultIssueQuery(cfg.Project.Repository)
	query.PerPage = 100 // Get more issues for better analysis

	result, err := githubService.FetchIssues(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch issues: %w", err)
	}

	// Create timeline processor and convert issues to events
	timelineProcessor := analytics.NewTimelineProcessor(cfg.Project.Repository)
	timeline, err := timelineProcessor.ProcessIssuesTimeline(ctx, result.Issues)
	if err != nil {
		return nil, fmt.Errorf("failed to process issues timeline: %w", err)
	}

	return timeline.Events, nil
}

func fetchGitEvents(ctx context.Context, sinceDate string, maxCommits int) ([]analytics.TimelineEvent, error) {
	// Get current working directory as repository path
	repoPath, err := os.Getwd()
	if err != nil {
		return nil, fmt.Errorf("failed to get current directory: %w", err)
	}

	// Check if we're in a Git repository
	gitDir := filepath.Join(repoPath, ".git")
	if _, err := os.Stat(gitDir); os.IsNotExist(err) {
		return nil, fmt.Errorf("not in a Git repository")
	}

	// Initialize Git analyzer
	gitAnalyzer := analytics.NewGitAnalyzer(repoPath)

	// Parse since date if provided
	var since *time.Time
	if sinceDate != "" {
		parsedDate, err := time.Parse("2006-01-02", sinceDate)
		if err != nil {
			return nil, fmt.Errorf("invalid since date format (use YYYY-MM-DD): %w", err)
		}
		since = &parsedDate
	}

	// Analyze commit history
	events, err := gitAnalyzer.AnalyzeCommitHistory(ctx, since, maxCommits)
	if err != nil {
		return nil, fmt.Errorf("failed to analyze Git history: %w", err)
	}

	return events, nil
}

func saveAnalysisResult(result *PatternAnalysisResult, outputPath string) error {
	// Create output directory if it doesn't exist
	dir := filepath.Dir(outputPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create output directory: %w", err)
	}

	// Marshal to JSON with proper formatting
	data, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal result to JSON: %w", err)
	}

	// Write to file
	if err := os.WriteFile(outputPath, data, 0600); err != nil {
		return fmt.Errorf("failed to write result file: %w", err)
	}

	return nil
}

func init() {
	// Add patterns subcommand to analyze command
	analyzeCmd.AddCommand(analyzePatternsCmd)

	// Add flags to patterns command
	analyzePatternsCmd.Flags().StringVarP(&outputPath, "output", "o", "", "出力ファイルパス (デフォルト: <repo>-pattern-analysis-<timestamp>.json)")
	analyzePatternsCmd.Flags().StringVar(&sinceDate, "since", "", "分析開始日 (YYYY-MM-DD形式)")
	analyzePatternsCmd.Flags().IntVar(&maxCommits, "max-commits", 100, "分析する最大コミット数")
	analyzePatternsCmd.Flags().BoolVar(&includeGit, "include-git", false, "Gitコミット履歴を分析に含める")
	analyzePatternsCmd.Flags().StringVar(&author, "author", "", "特定の作者のイベントのみ分析")
	analyzePatternsCmd.Flags().BoolVarP(&verbose, "verbose", "v", false, "詳細な分析結果を表示")
}

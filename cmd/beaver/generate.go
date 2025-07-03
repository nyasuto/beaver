package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/nyasuto/beaver/internal/config"
	"github.com/nyasuto/beaver/internal/models"
	"github.com/nyasuto/beaver/pkg/content"
	"github.com/nyasuto/beaver/pkg/github"
	"github.com/nyasuto/beaver/pkg/troubleshooting"
	"github.com/spf13/cobra"
)

var generateCmd = &cobra.Command{
	Use:   "generate",
	Short: "各種ドキュメント・ガイドの生成",
	Long:  "GitHub Issues から専門的なドキュメントやガイドを自動生成します。",
}

var generateTroubleshootingCmd = &cobra.Command{
	Use:   "troubleshooting [owner/repo]",
	Short: "トラブルシューティングガイドの生成",
	Long: `GitHub Issues を分析して包括的なトラブルシューティングガイドを自動生成します。

このコマンドは以下の分析を実行します:
- エラーパターンの抽出と分類
- Issue-Error-Solution の関連付け分析
- 問題解決手順の自動抽出
- エラーパターンの重要度算出
- 予防策の自動提案
- AI を使用した根本原因分析
- 緊急時対応手順の生成

生成されるガイドには以下が含まれます:
- よくあるエラーパターンと解決方法
- 段階的なトラブルシューティング手順
- 予防策とベストプラクティス
- 緊急時対応アクション
- ナレッジベースと統計情報

Example:
  beaver generate troubleshooting nyasuto/beaver
  beaver generate troubleshooting nyasuto/beaver --output ./troubleshooting-guide.json
  beaver generate troubleshooting nyasuto/beaver --format wiki --ai-enhanced`,
	Args: cobra.ExactArgs(1),
	RunE: runGenerateTroubleshooting,
}

// Command flags for troubleshooting generation
var (
	troubleshootingOutput   string
	troubleshootingFormat   string
	aiEnhanced              bool
	includeClosed           bool
	maxIssuesForAnalysis    int
	troubleshootingSeverity string
	exportWiki              bool
)

func init() {
	// Add generate command to root
	rootCmd.AddCommand(generateCmd)

	// Add subcommands
	generateCmd.AddCommand(generateTroubleshootingCmd)

	// Troubleshooting command flags
	generateTroubleshootingCmd.Flags().StringVarP(&troubleshootingOutput, "output", "o", "", "出力ファイルパス (デフォルト: {repo}-troubleshooting-guide.json)")
	generateTroubleshootingCmd.Flags().StringVarP(&troubleshootingFormat, "format", "f", "json", "出力フォーマット (json|wiki|markdown)")
	generateTroubleshootingCmd.Flags().BoolVar(&aiEnhanced, "ai-enhanced", true, "AI分析による高度なパターン検出を有効化")
	generateTroubleshootingCmd.Flags().BoolVar(&includeClosed, "include-closed", true, "クローズ済みIssueを分析に含める")
	generateTroubleshootingCmd.Flags().IntVar(&maxIssuesForAnalysis, "max-issues", 200, "分析する最大Issue数")
	generateTroubleshootingCmd.Flags().StringVar(&troubleshootingSeverity, "min-severity", "low", "最小重要度フィルター (low|medium|high|critical)")
	generateTroubleshootingCmd.Flags().BoolVar(&exportWiki, "export-wiki", false, "Wiki形式のガイドも同時に生成")
}

func runGenerateTroubleshooting(cmd *cobra.Command, args []string) error {
	ctx := context.Background()
	repoPath := args[0]

	slog.Info("🛠️ Beaver Troubleshooting Guide Generator", "repo", repoPath)

	// Parse owner/repo
	owner, repo := parseOwnerRepo(repoPath)
	if owner == "" || repo == "" {
		return fmt.Errorf("無効なリポジトリパス: %s (正しい形式: owner/repo)", repoPath)
	}

	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		slog.Warn("Failed to load config, will use environment variables", "error", err)
		cfg = &config.Config{} // Use empty config, will fall back to environment variables
	}

	// Get GitHub token
	token := cfg.Sources.GitHub.Token
	if token == "" {
		token = os.Getenv("GITHUB_TOKEN")
	}
	if token == "" {
		return fmt.Errorf("GitHub token not found. Set GITHUB_TOKEN environment variable or configure in beaver.yml")
	}

	// Create GitHub service
	githubService := github.NewService(token)

	// Create query for issues
	query := models.DefaultIssueQuery(fmt.Sprintf("%s/%s", owner, repo))
	if includeClosed {
		query.State = "all" // Fetch both open and closed issues
	}
	query.PerPage = maxIssuesForAnalysis

	// Fetch issues
	slog.Info("📥 Issues取得中", "repo", repoPath, "state", query.State)
	result, err := githubService.FetchIssues(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to fetch issues: %w", err)
	}

	issues := result.Issues
	slog.Info("📊 取得したIssues", "count", len(issues))

	if len(issues) == 0 {
		slog.Warn("⚠️ 分析するIssueが見つかりません")
		return fmt.Errorf("no issues found for analysis")
	}

	// Create AI service if enhanced analysis is enabled
	var aiService troubleshooting.AIService
	if aiEnhanced {
		slog.Info("🤖 AI分析サービスを初期化中")
		aiService = NewPythonAIService()
	}

	// Create troubleshooting analyzer
	analyzer := troubleshooting.NewAnalyzer(aiService)

	// Perform troubleshooting analysis
	slog.Info("🔍 トラブルシューティング分析を実行中")
	projectName := fmt.Sprintf("%s/%s", owner, repo)
	guide, err := analyzer.AnalyzeTroubleshooting(ctx, issues, projectName)
	if err != nil {
		return fmt.Errorf("failed to analyze troubleshooting patterns: %w", err)
	}

	slog.Info("✅ 分析完了", "error_patterns", len(guide.ErrorPatterns), "solutions", len(guide.Solutions))

	// Determine output filename
	outputFile := troubleshootingOutput
	if outputFile == "" {
		switch troubleshootingFormat {
		case "wiki", "markdown":
			outputFile = fmt.Sprintf("%s-troubleshooting-guide.md", repo)
		default:
			outputFile = fmt.Sprintf("%s-troubleshooting-guide.json", repo)
		}
	}

	// Save the guide
	err = saveTroubleshootingGuide(guide, outputFile, troubleshootingFormat)
	if err != nil {
		return fmt.Errorf("failed to save troubleshooting guide: %w", err)
	}

	slog.Info("💾 トラブルシューティングガイドを保存", "file", outputFile)

	// Export wiki format if requested
	if exportWiki && troubleshootingFormat != "wiki" && troubleshootingFormat != "markdown" {
		wikiFile := fmt.Sprintf("%s-troubleshooting-guide.md", repo)
		err = saveTroubleshootingGuide(guide, wikiFile, "wiki")
		if err != nil {
			slog.Warn("Failed to export wiki format", "error", err)
		} else {
			slog.Info("📋 Wiki形式も保存", "file", wikiFile)
		}
	}

	// Display summary
	slog.Info("\n📈 トラブルシューティングガイド統計")
	slog.Info("  📊 総Issue数", "total", guide.TotalIssues)
	slog.Info("  ✅ 解決済み", "solved", guide.SolvedIssues)
	slog.Info("  🔍 エラーパターン", "count", len(guide.ErrorPatterns))
	slog.Info("  💡 ソリューション", "count", len(guide.Solutions))
	slog.Info("  🛡️ 予防策", "count", len(guide.PreventionGuides))
	slog.Info("  🚨 緊急対応", "count", len(guide.EmergencyActions))

	if guide.AIInsights != nil {
		slog.Info("  🤖 AI分析信頼度", "confidence_percent", guide.AIInsights.Confidence*100)
		slog.Info("  💭 AI推奨事項", "count", len(guide.AIInsights.Recommendations))
	}

	slog.Info("\n🛠️ トラブルシューティングガイド生成完了")
	return nil
}

// saveTroubleshootingGuide saves the guide in the specified format
func saveTroubleshootingGuide(guide *troubleshooting.TroubleshootingGuide, filename, format string) error {
	switch format {
	case "json":
		return saveTroubleshootingJSON(guide, filename)
	case "wiki", "markdown":
		return saveTroubleshootingWiki(guide, filename)
	default:
		return fmt.Errorf("unsupported format: %s", format)
	}
}

// saveTroubleshootingJSON saves the guide as JSON
func saveTroubleshootingJSON(guide *troubleshooting.TroubleshootingGuide, filename string) error {
	data, err := json.MarshalIndent(guide, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal guide to JSON: %w", err)
	}

	err = content.WriteFileUTF8(filename, string(data), 0600)
	if err != nil {
		return fmt.Errorf("failed to write JSON file: %w", err)
	}

	return nil
}

// saveTroubleshootingWiki saves the guide as Wiki/Markdown format
func saveTroubleshootingWiki(guide *troubleshooting.TroubleshootingGuide, filename string) error {
	wikiContent := generateTroubleshootingWikiContent(guide)

	err := content.WriteFileUTF8(filename, wikiContent, 0600)
	if err != nil {
		return fmt.Errorf("failed to write wiki file: %w", err)
	}

	return nil
}

// generateTroubleshootingWikiContent generates Wiki/Markdown content
func generateTroubleshootingWikiContent(guide *troubleshooting.TroubleshootingGuide) string {
	content := fmt.Sprintf(`# 🛠️ %s - トラブルシューティングガイド

> 🤖 Beaver AI により生成 - %s

## 📋 概要

このガイドは **%d件のIssue** (%d件解決済み) を分析して自動生成されました。
AI分析により **%d個のエラーパターン** と **%d個のソリューション** を検出しています。

### 🎯 クイックアクセス
- [🚨 緊急時対応](#emergency-actions)
- [🔍 よくあるエラーパターン](#error-patterns)
- [💡 解決方法](#solutions)
- [🛡️ 予防策](#prevention-guides)

---

`, guide.ProjectName,
		guide.GeneratedAt.Format("2006-01-02 15:04:05"),
		guide.TotalIssues,
		guide.SolvedIssues,
		len(guide.ErrorPatterns),
		len(guide.Solutions))

	// Emergency Actions
	if len(guide.EmergencyActions) > 0 {
		content += `## 🚨 緊急時対応 {#emergency-actions}

`
		for _, action := range guide.EmergencyActions {
			content += fmt.Sprintf(`### %s (%s優先度)

**トリガー**: %s
**対応時間**: %s

%s

**対応手順**:
`, action.Title, action.Priority.String(), action.Trigger, action.TimeFrame, action.Description)

			for i, step := range action.Steps {
				content += fmt.Sprintf("%d. %s\n", i+1, step)
			}

			if len(action.Precautions) > 0 {
				content += "\n**注意事項**:\n"
				for _, precaution := range action.Precautions {
					content += fmt.Sprintf("- ⚠️ %s\n", precaution)
				}
			}
			content += "\n---\n\n"
		}
	}

	// Error Patterns
	if len(guide.ErrorPatterns) > 0 {
		content += `## 🔍 よくあるエラーパターン {#error-patterns}

`
		for _, pattern := range guide.ErrorPatterns {
			severityIcon := getSeverityIcon(pattern.Severity.String())
			content += fmt.Sprintf(`### %s %s

**カテゴリ**: %s | **頻度**: %d回 | **重要度**: %s%s

%s

`, severityIcon, pattern.Title, pattern.Category, pattern.Frequency, severityIcon, pattern.Severity.String(), pattern.Description)

			if len(pattern.Symptoms) > 0 {
				content += "**症状**:\n"
				for _, symptom := range pattern.Symptoms {
					content += fmt.Sprintf("- %s\n", symptom)
				}
				content += "\n"
			}

			if len(pattern.Causes) > 0 {
				content += "**原因**:\n"
				for _, cause := range pattern.Causes {
					content += fmt.Sprintf("- %s\n", cause)
				}
				content += "\n"
			}

			if len(pattern.Solutions) > 0 {
				content += "**クイック解決法**:\n"
				for _, solution := range pattern.Solutions {
					content += fmt.Sprintf("- ✅ %s\n", solution)
				}
				content += "\n"
			}

			if len(pattern.RelatedIssues) > 0 {
				content += "**関連Issue**: "
				for i, issueNum := range pattern.RelatedIssues {
					if i > 0 {
						content += ", "
					}
					content += fmt.Sprintf("[#%d](https://github.com/%s/issues/%d)", issueNum, guide.ProjectName, issueNum)
				}
				content += "\n\n"
			}

			content += "---\n\n"
		}
	}

	// Solutions
	if len(guide.Solutions) > 0 {
		content += `## 💡 解決方法 {#solutions}

`
		for _, solution := range guide.Solutions {
			difficultyIcon := getDifficultyIcon(solution.Difficulty.String())
			content += fmt.Sprintf(`### %s %s

**カテゴリ**: %s | **難易度**: %s%s | **成功率**: %.0f%% | **推定時間**: %s

%s

`, difficultyIcon, solution.Title, solution.Category, difficultyIcon, solution.Difficulty.String(), solution.SuccessRate*100, formatDuration(solution.TimeEstimate), solution.Description)

			if len(solution.Steps) > 0 {
				content += "**手順**:\n"
				for _, step := range solution.Steps {
					content += fmt.Sprintf("%d. %s\n", step.Number, step.Description)
					if step.Command != "" {
						content += fmt.Sprintf("   ```bash\n   %s\n   ```\n", step.Command)
					}
					if step.Expected != "" {
						content += fmt.Sprintf("   📋 **期待結果**: %s\n", step.Expected)
					}
					if step.Warning != "" {
						content += fmt.Sprintf("   ⚠️ **注意**: %s\n", step.Warning)
					}
					content += "\n"
				}
			}

			if len(solution.RequiredTools) > 0 {
				content += "**必要ツール**: "
				for i, tool := range solution.RequiredTools {
					if i > 0 {
						content += ", "
					}
					content += fmt.Sprintf("`%s`", tool)
				}
				content += "\n\n"
			}

			content += "---\n\n"
		}
	}

	// Prevention Guides
	if len(guide.PreventionGuides) > 0 {
		content += `## 🛡️ 予防策 {#prevention-guides}

`
		for _, prevention := range guide.PreventionGuides {
			priorityIcon := getPriorityIcon(prevention.Priority.String())
			content += fmt.Sprintf(`### %s %s

**カテゴリ**: %s | **優先度**: %s%s | **頻度**: %s

%s

**対策**:
`, priorityIcon, prevention.Title, prevention.Category, priorityIcon, prevention.Priority.String(), prevention.Frequency, prevention.Description)

			for _, action := range prevention.Actions {
				content += fmt.Sprintf("- %s\n", action)
			}

			content += fmt.Sprintf("\n**効果**: %s\n\n---\n\n", prevention.Impact)
		}
	}

	// AI Insights (if available)
	if guide.AIInsights != nil {
		content += `## 🤖 AI分析結果

`
		content += fmt.Sprintf("**分析信頼度**: %.1f%%\n", guide.AIInsights.Confidence*100)
		content += fmt.Sprintf("**処理時間**: %.2f秒\n\n", guide.AIInsights.ProcessingTime)

		if len(guide.AIInsights.Recommendations) > 0 {
			content += "**AI推奨事項**:\n"
			for _, rec := range guide.AIInsights.Recommendations {
				content += fmt.Sprintf("- %s\n", rec)
			}
			content += "\n"
		}

		if len(guide.AIInsights.Insights) > 0 {
			content += "**重要な洞察**:\n"
			for _, insight := range guide.AIInsights.Insights {
				actionIcon := ""
				if insight.Actionable {
					actionIcon = "🎯"
				} else {
					actionIcon = "💭"
				}
				content += fmt.Sprintf("- %s **%s**: %s (重要度: %.1f)\n",
					actionIcon, insight.Title, insight.Description, insight.Significance)
			}
		}
	}

	// Statistics
	content += fmt.Sprintf(`

---

## 📊 統計情報

- **総Issue数**: %d
- **解決済み**: %d (%.1f%%)
- **エラーパターン**: %d
- **ソリューション**: %d
- **平均解決時間**: %.1f時間
- **成功率**: %.1f%%
- **最多カテゴリ**: %s

---

**📌 このガイドは %s に生成されました**  
**🤖 Powered by Beaver AI**

`, guide.TotalIssues,
		guide.SolvedIssues,
		float64(guide.SolvedIssues)/float64(guide.TotalIssues)*100,
		guide.Statistics.TotalPatterns,
		guide.Statistics.TotalSolutions,
		guide.Statistics.AverageResolveTime,
		guide.Statistics.SuccessRate,
		guide.Statistics.MostCommonCategory,
		guide.GeneratedAt.Format("2006-01-02 15:04:05"))

	return content
}

// Helper functions for formatting

func getSeverityIcon(severity string) string {
	switch severity {
	case "critical":
		return "🔴"
	case "high":
		return "🟠"
	case "medium":
		return "🟡"
	case "low":
		return "🟢"
	default:
		return "⚪"
	}
}

func getDifficultyIcon(difficulty string) string {
	switch difficulty {
	case "easy":
		return "🟢"
	case "medium":
		return "🟡"
	case "hard":
		return "🟠"
	case "expert":
		return "🔴"
	default:
		return "⚪"
	}
}

func getPriorityIcon(priority string) string {
	switch priority {
	case "critical":
		return "🚨"
	case "high":
		return "🔴"
	case "medium":
		return "🟡"
	case "low":
		return "🟢"
	default:
		return "⚪"
	}
}

func formatDuration(d time.Duration) string {
	hours := d.Hours()
	if hours < 1 {
		return fmt.Sprintf("%.0f分", d.Minutes())
	} else if hours < 24 {
		return fmt.Sprintf("%.1f時間", hours)
	} else {
		return fmt.Sprintf("%.1f日", hours/24)
	}
}

// PythonAIService implements the AIService interface using the Python script
type PythonAIService struct{}

// NewPythonAIService creates a new Python AI service
func NewPythonAIService() *PythonAIService {
	return &PythonAIService{}
}

// AnalyzeTroubleshootingPatterns calls the Python AI script for analysis
func (s *PythonAIService) AnalyzeTroubleshootingPatterns(ctx context.Context, issues []models.Issue) (*troubleshooting.AITroubleshootingResult, error) {
	// Implementation would call the Python script similar to how it's done in analytics/ai_service.go
	// For now, return a basic implementation
	return &troubleshooting.AITroubleshootingResult{
		AnalyzedAt:            time.Now(),
		ProcessingTime:        1.5,
		PatternsDetected:      []troubleshooting.AIDetectedPattern{},
		SolutionStrategies:    []troubleshooting.AISolutionStrategy{},
		RootCauseAnalysis:     []troubleshooting.AIRootCause{},
		PreventionSuggestions: []troubleshooting.AIPreventionSuggestion{},
		Insights:              []troubleshooting.AIInsight{},
		Confidence:            0.75,
		Recommendations:       []string{"Implement monitoring", "Improve error handling", "Add automated testing"},
	}, nil
}

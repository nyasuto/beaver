package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"time"

	"github.com/nyasuto/beaver/internal/config"
	"github.com/nyasuto/beaver/internal/models"
	"github.com/nyasuto/beaver/pkg/github"
)

// AstroDataExport represents the complete data structure for Astro frontend
type AstroDataExport struct {
	Issues     []AstroIssue    `json:"issues"`
	Statistics AstroStatistics `json:"statistics"`
	Navigation AstroNavigation `json:"navigation"`
	Metadata   AstroMetadata   `json:"metadata"`
}

// AstroIssue extends the basic Issue with frontend-specific data
type AstroIssue struct {
	ID        int            `json:"id"`
	Number    int            `json:"number"`
	Title     string         `json:"title"`
	Body      string         `json:"body"`
	State     string         `json:"state"`
	Labels    []string       `json:"labels"`
	CreatedAt string         `json:"created_at"`
	UpdatedAt string         `json:"updated_at"`
	HTMLURL   string         `json:"html_url"`
	User      AstroUser      `json:"user"`
	Analysis  *AstroAnalysis `json:"analysis,omitempty"`
}

// AstroUser represents user information
type AstroUser struct {
	ID        int    `json:"id"`
	Login     string `json:"login"`
	AvatarURL string `json:"avatar_url,omitempty"`
}

// AstroAnalysis contains Beaver-specific analysis data
type AstroAnalysis struct {
	UrgencyScore int      `json:"urgency_score,omitempty"`
	Category     string   `json:"category,omitempty"`
	Tags         []string `json:"tags,omitempty"`
}

// AstroStatistics contains statistical data for the frontend
type AstroStatistics struct {
	TotalIssues  int          `json:"total_issues"`
	OpenIssues   int          `json:"open_issues"`
	ClosedIssues int          `json:"closed_issues"`
	HealthScore  float64      `json:"health_score"`
	Trends       *AstroTrends `json:"trends,omitempty"`
}

// AstroTrends contains trend analysis data
type AstroTrends struct {
	DailyActivity []AstroDailyActivity `json:"daily_activity,omitempty"`
	WeeklySummary *AstroWeeklySummary  `json:"weekly_summary,omitempty"`
}

// AstroDailyActivity represents daily issue activity
type AstroDailyActivity struct {
	Date          string `json:"date"`
	IssuesCreated int    `json:"issues_created"`
	IssuesClosed  int    `json:"issues_closed"`
}

// AstroWeeklySummary represents weekly statistics
type AstroWeeklySummary struct {
	CreatedThisWeek    int `json:"created_this_week"`
	ClosedThisWeek     int `json:"closed_this_week"`
	ActiveContributors int `json:"active_contributors"`
}

// AstroNavigation contains navigation structure
type AstroNavigation struct {
	TOC []AstroNavigationItem `json:"toc"`
}

// AstroNavigationItem represents a navigation item
type AstroNavigationItem struct {
	Title    string                `json:"title"`
	Anchor   string                `json:"anchor"`
	Children []AstroNavigationItem `json:"children,omitempty"`
}

// AstroMetadata contains site metadata
type AstroMetadata struct {
	GeneratedAt string          `json:"generated_at"`
	Repository  string          `json:"repository"`
	Version     string          `json:"version"`
	BuildInfo   *AstroBuildInfo `json:"build_info,omitempty"`
}

// AstroBuildInfo contains build information
type AstroBuildInfo struct {
	GoVersion  string `json:"go_version,omitempty"`
	CommitHash string `json:"commit_hash,omitempty"`
	BuildTime  string `json:"build_time,omitempty"`
}

// ExportAstroData generates JSON data for Astro frontend
func ExportAstroData(cfg *config.Config) error {
	slog.Info("🎨 Generating Astro data export...")

	// Initialize GitHub service (reuse existing logic)
	githubService := github.NewService(cfg.Sources.GitHub.Token)

	// Fetch issues using existing functionality
	query := models.IssueQuery{
		Repository: cfg.Project.Repository,
		State:      "all", // Get both open and closed
		Sort:       "created",
		Direction:  "desc",
		PerPage:    100,
	}

	ctx := context.Background()
	result, err := githubService.FetchIssues(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to fetch issues: %w", err)
	}

	slog.Info("📊 Processing issues for Astro export", "count", len(result.Issues))

	// Convert to Astro format
	astroIssues := make([]AstroIssue, len(result.Issues))
	for i, issue := range result.Issues {
		astroIssues[i] = convertToAstroIssue(issue)
	}

	// Generate statistics
	statistics := generateAstroStatistics(result.Issues)

	// Generate navigation
	navigation := generateAstroNavigation(astroIssues)

	// Generate metadata
	metadata := generateAstroMetadata(cfg)

	// Create complete data structure
	data := AstroDataExport{
		Issues:     astroIssues,
		Statistics: statistics,
		Navigation: navigation,
		Metadata:   metadata,
	}

	// Write to JSON file
	return writeAstroData(data)
}

// convertToAstroIssue converts a GitHub issue to Astro format
func convertToAstroIssue(issue models.Issue) AstroIssue {
	// Extract labels
	labels := make([]string, len(issue.Labels))
	for i, label := range issue.Labels {
		labels[i] = label.Name
	}

	// Basic analysis (can be enhanced with existing analytics)
	analysis := &AstroAnalysis{
		Category: categorizeIssue(issue),
		Tags:     extractTags(issue),
	}

	// Calculate urgency score based on labels and content
	analysis.UrgencyScore = calculateUrgencyScore(issue)

	return AstroIssue{
		ID:        int(issue.ID),
		Number:    issue.Number,
		Title:     issue.Title,
		Body:      issue.Body,
		State:     issue.State,
		Labels:    labels,
		CreatedAt: issue.CreatedAt.Format(time.RFC3339),
		UpdatedAt: issue.UpdatedAt.Format(time.RFC3339),
		HTMLURL:   issue.HTMLURL,
		User: AstroUser{
			ID:        int(issue.User.ID),
			Login:     issue.User.Login,
			AvatarURL: issue.User.AvatarURL,
		},
		Analysis: analysis,
	}
}

// generateAstroStatistics creates statistics for Astro frontend
func generateAstroStatistics(issues []models.Issue) AstroStatistics {
	var openCount, closedCount int
	for _, issue := range issues {
		if issue.State == "open" {
			openCount++
		} else {
			closedCount++
		}
	}

	totalIssues := len(issues)
	healthScore := 0.0
	if totalIssues > 0 {
		healthScore = (float64(closedCount) / float64(totalIssues)) * 100
	}

	return AstroStatistics{
		TotalIssues:  totalIssues,
		OpenIssues:   openCount,
		ClosedIssues: closedCount,
		HealthScore:  healthScore,
		Trends:       generateAstroTrends(issues),
	}
}

// generateAstroTrends creates trend analysis
func generateAstroTrends(issues []models.Issue) *AstroTrends {
	// Simple trend analysis - can be enhanced
	weeklyCreated := 0
	weeklyClosed := 0
	contributors := make(map[string]bool)

	weekAgo := time.Now().AddDate(0, 0, -7)

	for _, issue := range issues {
		if issue.CreatedAt.After(weekAgo) {
			weeklyCreated++
		}
		if issue.State == "closed" && issue.UpdatedAt.After(weekAgo) {
			weeklyClosed++
		}
		contributors[issue.User.Login] = true
	}

	return &AstroTrends{
		WeeklySummary: &AstroWeeklySummary{
			CreatedThisWeek:    weeklyCreated,
			ClosedThisWeek:     weeklyClosed,
			ActiveContributors: len(contributors),
		},
	}
}

// generateAstroNavigation creates navigation structure
func generateAstroNavigation(issues []AstroIssue) AstroNavigation {
	// Create TOC based on issue priorities and categories
	toc := []AstroNavigationItem{
		{
			Title:    "⚡ 緊急アクション (Top 3)",
			Anchor:   "urgent-actions",
			Children: []AstroNavigationItem{},
		},
		{
			Title:  "🔍 クイックアクセス",
			Anchor: "quick-access",
		},
		{
			Title:  "📊 プロジェクト状況",
			Anchor: "project-status",
		},
		{
			Title:  "🎯 最新更新",
			Anchor: "recent-updates",
		},
		{
			Title:  "📚 よく使う情報",
			Anchor: "useful-info",
		},
		{
			Title:  "🧭 ナビゲーション",
			Anchor: "navigation",
		},
	}

	// Add top 3 urgent issues to navigation
	urgentIssues := getTopUrgentIssues(issues, 3)
	for _, issue := range urgentIssues {
		toc[0].Children = append(toc[0].Children, AstroNavigationItem{
			Title:  fmt.Sprintf("Issue #%d: %s", issue.Number, truncateTitle(issue.Title, 30)),
			Anchor: fmt.Sprintf("issue-%d", issue.Number),
		})
	}

	return AstroNavigation{TOC: toc}
}

// generateAstroMetadata creates metadata
func generateAstroMetadata(cfg *config.Config) AstroMetadata {
	return AstroMetadata{
		GeneratedAt: time.Now().Format(time.RFC3339),
		Repository:  cfg.Project.Repository,
		Version:     "1.0.0", // Can be made configurable
		BuildInfo: &AstroBuildInfo{
			BuildTime: time.Now().Format(time.RFC3339),
		},
	}
}

// writeAstroData writes the data to JSON file
func writeAstroData(data AstroDataExport) error {
	// Ensure directory exists
	dataDir := filepath.Join("frontend", "astro", "src", "data")
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return fmt.Errorf("failed to create data directory: %w", err)
	}

	// Marshal to JSON with proper formatting
	jsonData, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal data: %w", err)
	}

	// Write to file
	outputPath := filepath.Join(dataDir, "beaver.json")
	if err := os.WriteFile(outputPath, jsonData, 0600); err != nil {
		return fmt.Errorf("failed to write data file: %w", err)
	}

	slog.Info("✅ Astro data exported", "path", outputPath)
	slog.Info("📊 Data includes", "issues", len(data.Issues), "components", "statistics, navigation, metadata")

	return nil
}

// Helper functions
func categorizeIssue(issue models.Issue) string {
	title := issue.Title
	if len(title) > 20 {
		prefix := title[:20]
		if contains(prefix, "feat") || contains(prefix, "feature") {
			return "feature"
		}
		if contains(prefix, "fix") || contains(prefix, "bug") {
			return "bug"
		}
		if contains(prefix, "docs") || contains(prefix, "documentation") {
			return "documentation"
		}
	}
	return "general"
}

func extractTags(issue models.Issue) []string {
	tags := []string{}
	for _, label := range issue.Labels {
		if label.Name != "" {
			tags = append(tags, label.Name)
		}
	}
	return tags
}

func calculateUrgencyScore(issue models.Issue) int {
	score := 0

	// Priority-based scoring
	for _, label := range issue.Labels {
		switch label.Name {
		case "priority: high", "priority: critical":
			score += 30
		case "priority: medium":
			score += 15
		case "priority: low":
			score += 5
		}
	}

	// Type-based scoring
	for _, label := range issue.Labels {
		switch label.Name {
		case "type: bug":
			score += 20
		case "type: feature":
			score += 10
		case "type: enhancement":
			score += 8
		}
	}

	// Age-based scoring (newer issues get higher score)
	daysSinceCreation := int(time.Since(issue.CreatedAt).Hours() / 24)
	if daysSinceCreation < 7 {
		score += 10
	} else if daysSinceCreation < 30 {
		score += 5
	}

	return score
}

func getTopUrgentIssues(issues []AstroIssue, count int) []AstroIssue {
	// Sort by urgency score (simple implementation)
	urgent := make([]AstroIssue, 0)
	for _, issue := range issues {
		if issue.State == "open" && issue.Analysis != nil && issue.Analysis.UrgencyScore > 20 {
			urgent = append(urgent, issue)
		}
	}

	// Return top N
	if len(urgent) > count {
		return urgent[:count]
	}
	return urgent
}

func truncateTitle(title string, maxLen int) string {
	if len(title) <= maxLen {
		return title
	}
	return title[:maxLen] + "..."
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && s[:len(substr)] == substr
}

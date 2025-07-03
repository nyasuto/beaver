package wiki

import (
	"bytes"
	"fmt"
	"log/slog"
	"time"

	"github.com/nyasuto/beaver/internal/config"
	"github.com/nyasuto/beaver/internal/models"
	"github.com/nyasuto/beaver/pkg/analytics"
)

// Generator generates Wiki content from GitHub Issues
type Generator struct {
	templateManager   *TemplateManager
	config            *config.Config
	navigationManager *NavigationManager
	sidebarGenerator  *SidebarGenerator
}

// NewGenerator creates a new Wiki generator
func NewGenerator() *Generator {
	return &Generator{
		templateManager:   NewTemplateManager(),
		config:            config.GetConfig(),
		navigationManager: NewNavigationManager(),
		sidebarGenerator:  NewSidebarGenerator(),
	}
}

// now returns the current time in the configured timezone
func (g *Generator) now() time.Time {
	timestamp := g.config.Now()
	slog.Info("🦫 GENERATOR DEBUG: Creating timestamp for wiki generation", 
		"timestamp", timestamp.Format("2006-01-02 15:04:05 MST"))
	return timestamp
}

// WikiPage represents a generated Wiki page
type WikiPage struct {
	Title     string
	Content   string
	Filename  string
	CreatedAt time.Time
	UpdatedAt time.Time
	Summary   string
	Category  string
	Tags      []string
}

// ClassificationSummary contains classification statistics
type ClassificationSummary struct {
	TotalClassified     int            `json:"total_classified"`
	ByCategory          map[string]int `json:"by_category"`
	ByMethod            map[string]int `json:"by_method"`
	AverageConfidence   float64        `json:"average_confidence"`
	HighConfidenceCount int            `json:"high_confidence_count"`
	LowConfidenceCount  int            `json:"low_confidence_count"`
	MostCommonTags      []string       `json:"most_common_tags"`
}

// IssuesSummaryData contains data for Issues summary page
type IssuesSummaryData struct {
	ProjectName         string
	GeneratedAt         time.Time
	TotalIssues         int
	OpenIssues          int
	ClosedIssues        int
	Issues              []models.Issue
	AIProcessor         string
	BeaverVersion       string
	ClassificationStats ClassificationSummary
	Navigation          NavigationContext
}

// UrgentIssue represents an urgent issue for Top 3 display
type UrgentIssue struct {
	Issue         models.Issue
	UrgencyScore  float64
	UrgencyReason string
	ActionNeeded  string
}

// DeveloperDashboardData contains data for the enhanced homepage
type DeveloperDashboardData struct {
	ProjectName    string
	GeneratedAt    time.Time
	TotalIssues    int
	OpenIssues     int
	ClosedIssues   int
	Status         string
	LastUpdate     time.Time
	UrgentIssues   []UrgentIssue
	QuickAccess    []CategoryLink
	ProjectStatus  ProjectSummary
	RecentActivity []ActivityItem
	Navigation     NavigationContext
}

// CategoryLink represents a quick access category link
type CategoryLink struct {
	Title       string
	Description string
	URL         string
	Icon        string
	Count       int
}

// ProjectSummary represents current project status summary
type ProjectSummary struct {
	InProgress     int
	CompletedToday int
	CompletedWeek  int
	HealthScore    float64
	HealthStatus   string
}

// ActivityItem represents a recent activity item
type ActivityItem struct {
	Type        string
	Title       string
	Description string
	Timestamp   time.Time
	URL         string
	Author      string
}

// TroubleshootingData contains data for troubleshooting guide
type TroubleshootingData struct {
	ProjectName  string
	GeneratedAt  time.Time
	SolvedIssues []models.Issue
	CommonErrors []ErrorPattern
	Solutions    []Solution
	Navigation   NavigationContext
}

// ErrorPattern represents a common error pattern
type ErrorPattern struct {
	Pattern     string
	Description string
	Frequency   int
	Solutions   []string
}

// Solution represents a documented solution
type Solution struct {
	Title         string
	Description   string
	Steps         []string
	RelatedIssues []int
}

// LearningPathData contains data for learning path
type LearningPathData struct {
	ProjectName   string
	GeneratedAt   time.Time
	Milestones    []Milestone
	Technologies  []Technology
	LearningGoals []LearningGoal
	Navigation    NavigationContext
}

// Milestone represents a development milestone
type Milestone struct {
	Name        string
	Description string
	CompletedAt *time.Time
	Issues      []models.Issue
	Learnings   []string
}

// Technology represents a technology learned
type Technology struct {
	Name        string
	Description string
	UsedIn      []string
	Resources   []string
}

// LearningGoal represents a learning objective
type LearningGoal struct {
	Title         string
	Description   string
	Status        string
	Progress      int
	RelatedIssues []int
}

// GenerateIssuesSummary generates an Issues summary Wiki page
func (g *Generator) GenerateIssuesSummary(issues []models.Issue, projectName string) (*WikiPage, error) {
	data := IssuesSummaryData{
		ProjectName:   projectName,
		GeneratedAt:   g.now(),
		TotalIssues:   len(issues),
		Issues:        issues,
		AIProcessor:   "OpenAI/Anthropic",
		BeaverVersion: "1.0.0",
		Navigation:    g.navigationManager.GetNavigationContext("Issues-Summary"),
	}

	// Count open/closed issues and calculate classification statistics
	classificationStats := g.calculateClassificationStats(issues)
	data.ClassificationStats = classificationStats

	for _, issue := range issues {
		if issue.State == "open" {
			data.OpenIssues++
		} else {
			data.ClosedIssues++
		}
	}

	content, err := g.renderTemplate("issues-summary", data)
	if err != nil {
		return nil, fmt.Errorf("failed to render issues summary template: %w", err)
	}

	return &WikiPage{
		Title:     fmt.Sprintf("%s - Issues Summary", projectName),
		Content:   content,
		Filename:  "Issues-Summary.md",
		CreatedAt: g.now(),
		UpdatedAt: g.now(),
		Summary:   fmt.Sprintf("Summary of %d GitHub Issues processed by Beaver AI", len(issues)),
		Category:  "Summary",
		Tags:      []string{"issues", "summary", "ai-processed"},
	}, nil
}

// GenerateTroubleshootingGuide generates a troubleshooting guide from solved issues
func (g *Generator) GenerateTroubleshootingGuide(issues []models.Issue, projectName string) (*WikiPage, error) {
	// Filter solved/closed issues
	var solvedIssues []models.Issue
	for _, issue := range issues {
		if issue.State == "closed" {
			solvedIssues = append(solvedIssues, issue)
		}
	}

	data := TroubleshootingData{
		ProjectName:  projectName,
		GeneratedAt:  g.now(),
		SolvedIssues: solvedIssues,
		CommonErrors: g.extractErrorPatterns(solvedIssues),
		Solutions:    g.extractSolutions(solvedIssues),
		Navigation:   g.navigationManager.GetNavigationContext("Troubleshooting-Guide"),
	}

	content, err := g.renderTemplate("troubleshooting", data)
	if err != nil {
		return nil, fmt.Errorf("failed to render troubleshooting template: %w", err)
	}

	return &WikiPage{
		Title:     fmt.Sprintf("%s - Troubleshooting Guide", projectName),
		Content:   content,
		Filename:  "Troubleshooting-Guide.md",
		CreatedAt: g.now(),
		UpdatedAt: g.now(),
		Summary:   fmt.Sprintf("Troubleshooting guide based on %d solved issues", len(solvedIssues)),
		Category:  "Guide",
		Tags:      []string{"troubleshooting", "solutions", "closed-issues"},
	}, nil
}

// GenerateLearningPath generates a learning path Wiki page
func (g *Generator) GenerateLearningPath(issues []models.Issue, projectName string) (*WikiPage, error) {
	data := LearningPathData{
		ProjectName:   projectName,
		GeneratedAt:   g.now(),
		Milestones:    g.extractMilestones(issues),
		Technologies:  g.extractTechnologies(issues),
		LearningGoals: g.extractLearningGoals(issues),
		Navigation:    g.navigationManager.GetNavigationContext("Learning-Path"),
	}

	content, err := g.renderTemplate("learning-path", data)
	if err != nil {
		return nil, fmt.Errorf("failed to render learning path template: %w", err)
	}

	return &WikiPage{
		Title:     fmt.Sprintf("%s - Learning Path", projectName),
		Content:   content,
		Filename:  "Learning-Path.md",
		CreatedAt: g.now(),
		UpdatedAt: g.now(),
		Summary:   "Development learning path extracted from project evolution",
		Category:  "Learning",
		Tags:      []string{"learning", "milestones", "technologies"},
	}, nil
}

// renderTemplate renders a template with given data
func (g *Generator) renderTemplate(templateName string, data interface{}) (string, error) {
	tmpl, exists := g.templateManager.GetTemplate(templateName)
	if !exists {
		return "", fmt.Errorf("template %s not found", templateName)
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return "", fmt.Errorf("failed to execute template %s: %w", templateName, err)
	}

	return buf.String(), nil
}

// extractErrorPatterns extracts common error patterns from issues
func (g *Generator) extractErrorPatterns(issues []models.Issue) []ErrorPattern {
	patterns := make(map[string]*ErrorPattern)

	for _, issue := range issues {
		// Simple pattern extraction based on common error keywords
		if containsErrorKeywords(issue.Title) || containsErrorKeywords(issue.Body) {
			key := extractErrorKey(issue.Title)
			if pattern, exists := patterns[key]; exists {
				pattern.Frequency++
			} else {
				patterns[key] = &ErrorPattern{
					Pattern:     key,
					Description: fmt.Sprintf("Pattern extracted from issue #%d", issue.Number),
					Frequency:   1,
					Solutions:   []string{fmt.Sprintf("See issue #%d for resolution", issue.Number)},
				}
			}
		}
	}

	var result []ErrorPattern
	for _, pattern := range patterns {
		result = append(result, *pattern)
	}

	return result
}

// extractSolutions extracts solutions from closed issues
func (g *Generator) extractSolutions(issues []models.Issue) []Solution {
	var solutions []Solution

	for _, issue := range issues {
		if issue.State == "closed" && len(issue.Body) > 100 {
			solution := Solution{
				Title:         fmt.Sprintf("Solution for: %s", issue.Title),
				Description:   truncateString(issue.Body, 200),
				Steps:         []string{"Refer to the original issue for detailed steps"},
				RelatedIssues: []int{issue.Number},
			}
			solutions = append(solutions, solution)
		}
	}

	return solutions
}

// extractMilestones extracts development milestones from issues
func (g *Generator) extractMilestones(issues []models.Issue) []Milestone {
	milestones := make(map[string]*Milestone)

	for _, issue := range issues {
		// Group issues by month as milestones
		monthKey := issue.CreatedAt.Format("2006-01")
		if milestone, exists := milestones[monthKey]; exists {
			milestone.Issues = append(milestone.Issues, issue)
		} else {
			milestones[monthKey] = &Milestone{
				Name:        fmt.Sprintf("Development Phase %s", monthKey),
				Description: fmt.Sprintf("Issues and progress for %s", issue.CreatedAt.Format("January 2006")),
				Issues:      []models.Issue{issue},
				Learnings:   []string{fmt.Sprintf("Learned from issue #%d: %s", issue.Number, truncateString(issue.Title, 100))},
			}
			if issue.State == "closed" {
				milestones[monthKey].CompletedAt = &issue.UpdatedAt
			}
		}
	}

	var result []Milestone
	for _, milestone := range milestones {
		result = append(result, *milestone)
	}

	return result
}

// extractTechnologies extracts technologies mentioned in issues
func (g *Generator) extractTechnologies(issues []models.Issue) []Technology {
	techMap := make(map[string]*Technology)

	// Common technology keywords
	techKeywords := []string{"Go", "Python", "JavaScript", "Docker", "Kubernetes", "AWS", "GitHub", "API", "REST", "gRPC"}

	for _, issue := range issues {
		text := issue.Title + " " + issue.Body
		for _, tech := range techKeywords {
			if containsKeyword(text, tech) {
				if technology, exists := techMap[tech]; exists {
					technology.UsedIn = append(technology.UsedIn, fmt.Sprintf("Issue #%d", issue.Number))
				} else {
					techMap[tech] = &Technology{
						Name:        tech,
						Description: "Technology mentioned in project issues",
						UsedIn:      []string{fmt.Sprintf("Issue #%d", issue.Number)},
						Resources:   []string{fmt.Sprintf("See issue #%d for context", issue.Number)},
					}
				}
			}
		}
	}

	var result []Technology
	for _, tech := range techMap {
		result = append(result, *tech)
	}

	return result
}

// extractLearningGoals extracts learning objectives from issues
func (g *Generator) extractLearningGoals(issues []models.Issue) []LearningGoal {
	var goals []LearningGoal

	for _, issue := range issues {
		if containsLearningKeywords(issue.Title) || containsLearningKeywords(issue.Body) {
			status := "In Progress"
			progress := 50
			if issue.State == "closed" {
				status = "Completed"
				progress = 100
			}

			goal := LearningGoal{
				Title:         fmt.Sprintf("Learn: %s", truncateString(issue.Title, 80)),
				Description:   truncateString(issue.Body, 150),
				Status:        status,
				Progress:      progress,
				RelatedIssues: []int{issue.Number},
			}
			goals = append(goals, goal)
		}
	}

	return goals
}

// BatchProcessor handles batch processing of multiple issues
type BatchProcessor struct {
	generator *Generator
	batchSize int
	maxIssues int
}

// NewBatchProcessor creates a new batch processor
func NewBatchProcessor(batchSize, maxIssues int) *BatchProcessor {
	return &BatchProcessor{
		generator: NewGenerator(),
		batchSize: batchSize,
		maxIssues: maxIssues,
	}
}

// ProcessInBatches processes issues in batches and generates Wiki pages
func (bp *BatchProcessor) ProcessInBatches(issues []models.Issue, projectName string, callback func([]*WikiPage) error) error {
	// Apply max issues limit if specified
	processIssues := issues
	if bp.maxIssues > 0 && len(issues) > bp.maxIssues {
		processIssues = issues[:bp.maxIssues]
	}

	// If batch size is 0 or larger than total issues, process all at once
	if bp.batchSize <= 0 || bp.batchSize >= len(processIssues) {
		return bp.processBatch(processIssues, projectName, callback)
	}

	// Process in batches
	for i := 0; i < len(processIssues); i += bp.batchSize {
		end := i + bp.batchSize
		if end > len(processIssues) {
			end = len(processIssues)
		}

		batch := processIssues[i:end]
		if err := bp.processBatch(batch, projectName, callback); err != nil {
			return fmt.Errorf("failed to process batch %d-%d: %w", i, end, err)
		}
	}

	return nil
}

// processBatch processes a single batch of issues
func (bp *BatchProcessor) processBatch(issues []models.Issue, projectName string, callback func([]*WikiPage) error) error {
	var pages []*WikiPage

	// Generate index page (always include for each batch)
	indexPage, err := bp.generator.GenerateIndex(issues, projectName)
	if err != nil {
		return fmt.Errorf("failed to generate index page: %w", err)
	}
	pages = append(pages, indexPage)

	// Generate issues summary
	summaryPage, err := bp.generator.GenerateIssuesSummary(issues, projectName)
	if err != nil {
		return fmt.Errorf("failed to generate issues summary: %w", err)
	}
	pages = append(pages, summaryPage)

	// Generate troubleshooting guide
	troubleshootingPage, err := bp.generator.GenerateTroubleshootingGuide(issues, projectName)
	if err != nil {
		return fmt.Errorf("failed to generate troubleshooting guide: %w", err)
	}
	pages = append(pages, troubleshootingPage)

	// Generate learning path
	learningPage, err := bp.generator.GenerateLearningPath(issues, projectName)
	if err != nil {
		return fmt.Errorf("failed to generate learning path: %w", err)
	}
	pages = append(pages, learningPage)

	// Call the callback with generated pages
	return callback(pages)
}

// GenerateAllPages generates all Wiki pages for the given issues
func (g *Generator) GenerateAllPages(issues []models.Issue, projectName string) ([]*WikiPage, error) {
	var pages []*WikiPage

	// Generate sidebar first (for navigation consistency)
	sidebarPage, err := g.GenerateSidebar(issues, projectName)
	if err != nil {
		return nil, fmt.Errorf("failed to generate sidebar: %w", err)
	}
	pages = append(pages, sidebarPage)

	// Generate index page
	indexPage, err := g.GenerateIndex(issues, projectName)
	if err != nil {
		return nil, fmt.Errorf("failed to generate index page: %w", err)
	}
	pages = append(pages, indexPage)

	// Generate issues summary
	summaryPage, err := g.GenerateIssuesSummary(issues, projectName)
	if err != nil {
		return nil, fmt.Errorf("failed to generate issues summary: %w", err)
	}
	pages = append(pages, summaryPage)

	// Generate troubleshooting guide
	troubleshootingPage, err := g.GenerateTroubleshootingGuide(issues, projectName)
	if err != nil {
		return nil, fmt.Errorf("failed to generate troubleshooting guide: %w", err)
	}
	pages = append(pages, troubleshootingPage)

	// Generate learning path
	learningPage, err := g.GenerateLearningPath(issues, projectName)
	if err != nil {
		return nil, fmt.Errorf("failed to generate learning path: %w", err)
	}
	pages = append(pages, learningPage)

	// Generate development strategy (meta-documentation)
	strategyPage, err := g.GenerateDevelopmentStrategy(issues, projectName)
	if err != nil {
		return nil, fmt.Errorf("failed to generate development strategy: %w", err)
	}
	pages = append(pages, strategyPage)

	return pages, nil
}

// GenerateSidebar generates the _Sidebar.md page for GitHub Wiki navigation
func (g *Generator) GenerateSidebar(issues []models.Issue, projectName string) (*WikiPage, error) {
	return g.sidebarGenerator.GenerateSidebar(projectName, issues)
}

// GenerateIndex generates the main index page using the new developer dashboard
func (g *Generator) GenerateIndex(issues []models.Issue, projectName string) (*WikiPage, error) {
	// Use the new developer dashboard for the home page (Issue #367 enhancement)
	return g.GenerateDeveloperDashboard(issues, projectName)
}

// GenerateStatistics generates a comprehensive statistics dashboard
func (g *Generator) GenerateStatistics(issues []models.Issue, projectName string) (*WikiPage, error) {
	calculator := analytics.NewStatisticsCalculator(issues, projectName)
	data := calculator.Calculate()

	content, err := g.renderTemplate("statistics", data)
	if err != nil {
		return nil, fmt.Errorf("failed to render statistics template: %w", err)
	}

	return &WikiPage{
		Title:     fmt.Sprintf("%s - Statistics Dashboard", projectName),
		Content:   content,
		Filename:  "Statistics.md",
		CreatedAt: g.now(),
		UpdatedAt: g.now(),
		Summary:   fmt.Sprintf("Comprehensive statistics and analytics for %s project", projectName),
		Category:  "Analytics",
		Tags:      []string{"statistics", "analytics", "dashboard", "metrics"},
	}, nil
}

// GenerateLabelAnalysis generates a comprehensive label analysis page
func (g *Generator) GenerateLabelAnalysis(issues []models.Issue, projectName string) (*WikiPage, error) {
	calculator := analytics.NewLabelAnalysisCalculator(issues, projectName)
	data := calculator.Calculate()

	content, err := g.renderTemplate("label-analysis", data)
	if err != nil {
		return nil, fmt.Errorf("failed to render label analysis template: %w", err)
	}

	return &WikiPage{
		Title:     fmt.Sprintf("%s - Label Analysis", projectName),
		Content:   content,
		Filename:  "Label-Analysis.md",
		CreatedAt: g.now(),
		UpdatedAt: g.now(),
		Summary:   fmt.Sprintf("Comprehensive label and categorization analysis for %s project", projectName),
		Category:  "Analytics",
		Tags:      []string{"labels", "categorization", "analysis", "organization"},
	}, nil
}

// GenerateQuickReference generates a quick reference page
func (g *Generator) GenerateQuickReference(issues []models.Issue, projectName string) (*WikiPage, error) {
	calculator := analytics.NewQuickReferenceCalculator(issues, projectName)
	data := calculator.Calculate()

	content, err := g.renderTemplate("quick-reference", data)
	if err != nil {
		return nil, fmt.Errorf("failed to render quick reference template: %w", err)
	}

	return &WikiPage{
		Title:     fmt.Sprintf("%s - Quick Reference", projectName),
		Content:   content,
		Filename:  "Quick-Reference.md",
		CreatedAt: g.now(),
		UpdatedAt: g.now(),
		Summary:   fmt.Sprintf("Quick reference guide for %s project essentials", projectName),
		Category:  "Reference",
		Tags:      []string{"reference", "quick-start", "guide", "essentials"},
	}, nil
}

// GenerateProcessingLogs generates a processing logs and monitoring page
func (g *Generator) GenerateProcessingLogs(issues []models.Issue, projectName string) (*WikiPage, error) {
	calculator := analytics.NewProcessingLogsCalculator(issues, projectName)
	data := calculator.Calculate()

	content, err := g.renderTemplate("processing-logs", data)
	if err != nil {
		return nil, fmt.Errorf("failed to render processing logs template: %w", err)
	}

	return &WikiPage{
		Title:     fmt.Sprintf("%s - Processing Logs", projectName),
		Content:   content,
		Filename:  "Processing-Logs.md",
		CreatedAt: g.now(),
		UpdatedAt: g.now(),
		Summary:   fmt.Sprintf("Processing logs and system monitoring for %s project", projectName),
		Category:  "Monitoring",
		Tags:      []string{"logs", "monitoring", "performance", "system-health"},
	}, nil
}

// GenerateDevelopmentStrategy generates development strategy wiki page
func (g *Generator) GenerateDevelopmentStrategy(issues []models.Issue, projectName string) (*WikiPage, error) {
	calculator := analytics.NewDevelopmentStrategyCalculator(issues, projectName)
	data := calculator.Calculate()

	content, err := g.renderTemplate("development-strategy", data)
	if err != nil {
		return nil, fmt.Errorf("failed to render development strategy template: %w", err)
	}

	return &WikiPage{
		Title:     "Development Strategy",
		Content:   content,
		Filename:  "Development-Strategy.md",
		CreatedAt: g.now(),
		UpdatedAt: g.now(),
		Summary:   fmt.Sprintf("Self-documenting development strategy for %s project", projectName),
		Category:  "Strategy",
		Tags:      []string{"strategy", "development", "meta", "self-documentation", "roadmap"},
	}, nil
}

// Helper functions

func containsErrorKeywords(text string) bool {
	errorKeywords := []string{"error", "bug", "fail", "issue", "problem", "broken"}
	for _, keyword := range errorKeywords {
		if containsKeyword(text, keyword) {
			return true
		}
	}
	return false
}

func containsLearningKeywords(text string) bool {
	learningKeywords := []string{"learn", "implement", "add", "feature", "improve", "study"}
	for _, keyword := range learningKeywords {
		if containsKeyword(text, keyword) {
			return true
		}
	}
	return false
}

func containsKeyword(text, keyword string) bool {
	return len(text) > 0 && len(keyword) > 0 &&
		(containsIgnoreCase(text, keyword))
}

func containsIgnoreCase(text, substr string) bool {
	// Simple case-insensitive contains check
	textLower := toLower(text)
	substrLower := toLower(substr)
	return contains(textLower, substrLower)
}

func toLower(s string) string {
	result := make([]rune, len(s))
	for i, r := range s {
		if r >= 'A' && r <= 'Z' {
			result[i] = r + 32
		} else {
			result[i] = r
		}
	}
	return string(result)
}

func contains(s, substr string) bool {
	if len(substr) == 0 {
		return true
	}
	if len(s) < len(substr) {
		return false
	}
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func extractErrorKey(title string) string {
	// Simple error key extraction
	if len(title) > 50 {
		return title[:50] + "..."
	}
	return title
}

func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}

// calculateClassificationStats calculates statistics from classified issues
func (g *Generator) calculateClassificationStats(issues []models.Issue) ClassificationSummary {
	stats := ClassificationSummary{
		ByCategory: make(map[string]int),
		ByMethod:   make(map[string]int),
	}

	var totalConfidence float64
	var classifiedCount int
	tagCounts := make(map[string]int)
	highConfidenceThreshold := 0.8
	lowConfidenceThreshold := 0.5

	for _, issue := range issues {
		if issue.Classification != nil {
			classifiedCount++
			classification := issue.Classification

			// Category statistics
			stats.ByCategory[classification.Category]++

			// Method statistics
			stats.ByMethod[classification.Method]++

			// Confidence statistics
			totalConfidence += classification.Confidence
			if classification.Confidence >= highConfidenceThreshold {
				stats.HighConfidenceCount++
			} else if classification.Confidence < lowConfidenceThreshold {
				stats.LowConfidenceCount++
			}

			// Tag statistics
			for _, tag := range classification.SuggestedTags {
				tagCounts[tag]++
			}
		}
	}

	stats.TotalClassified = classifiedCount
	if classifiedCount > 0 {
		stats.AverageConfidence = totalConfidence / float64(classifiedCount)
	}

	// Find most common tags (top 5)
	type tagCount struct {
		tag   string
		count int
	}

	var tagCounts2 []tagCount
	for tag, count := range tagCounts {
		tagCounts2 = append(tagCounts2, tagCount{tag: tag, count: count})
	}

	// Simple bubble sort for top tags
	for i := 0; i < len(tagCounts2); i++ {
		for j := i + 1; j < len(tagCounts2); j++ {
			if tagCounts2[j].count > tagCounts2[i].count {
				tagCounts2[i], tagCounts2[j] = tagCounts2[j], tagCounts2[i]
			}
		}
	}

	// Get top 5 tags
	maxTags := 5
	if len(tagCounts2) < maxTags {
		maxTags = len(tagCounts2)
	}

	for i := 0; i < maxTags; i++ {
		stats.MostCommonTags = append(stats.MostCommonTags, tagCounts2[i].tag)
	}

	return stats
}

// calculateUrgencyScore calculates urgency score for an issue based on multiple factors
func (g *Generator) calculateUrgencyScore(issue models.Issue) (float64, string) {
	score := 0.0
	reasons := []string{}

	// 1. Label-based priority scoring
	for _, label := range issue.Labels {
		labelName := toLower(label.Name)
		switch {
		case contains(labelName, "critical") || contains(labelName, "priority: critical"):
			score += 50.0
			reasons = append(reasons, "Critical priority label")
		case contains(labelName, "high") || contains(labelName, "priority: high"):
			score += 30.0
			reasons = append(reasons, "High priority label")
		case contains(labelName, "bug") || contains(labelName, "type: bug"):
			score += 20.0
			reasons = append(reasons, "Bug label")
		case contains(labelName, "security") || contains(labelName, "type: security"):
			score += 40.0
			reasons = append(reasons, "Security issue")
		case contains(labelName, "ci/cd") || contains(labelName, "type: ci/cd"):
			score += 15.0
			reasons = append(reasons, "CI/CD issue")
		}
	}

	// 2. Keyword-based urgency scoring
	titleAndBody := toLower(issue.Title + " " + issue.Body)
	urgentKeywords := map[string]float64{
		"urgent":        25.0,
		"emergency":     30.0,
		"critical":      25.0,
		"broken":        20.0,
		"failing":       20.0,
		"error":         15.0,
		"crash":         25.0,
		"security":      30.0,
		"vulnerability": 25.0,
		"regression":    20.0,
		"blocking":      25.0,
		"production":    20.0,
	}

	for keyword, points := range urgentKeywords {
		if contains(titleAndBody, keyword) {
			score += points
			reasons = append(reasons, fmt.Sprintf("Contains '%s'", keyword))
		}
	}

	// 3. Time-based urgency (recent issues get slight boost)
	daysSinceCreated := time.Since(issue.CreatedAt).Hours() / 24
	if daysSinceCreated <= 1 {
		score += 10.0
		reasons = append(reasons, "Created within 24 hours")
	} else if daysSinceCreated <= 7 {
		score += 5.0
		reasons = append(reasons, "Created within a week")
	}

	// 4. Comment activity suggests urgency
	if len(issue.Comments) > 5 {
		score += 10.0
		reasons = append(reasons, "High comment activity")
	} else if len(issue.Comments) > 2 {
		score += 5.0
		reasons = append(reasons, "Active discussion")
	}

	// 5. Assignee status
	if len(issue.Assignees) == 0 {
		score += 5.0
		reasons = append(reasons, "Unassigned")
	}

	reasonText := "Normal priority"
	if len(reasons) > 0 {
		reasonText = reasons[0] // Use primary reason
		if len(reasons) > 1 {
			reasonText += fmt.Sprintf(" (+%d factors)", len(reasons)-1)
		}
	}

	return score, reasonText
}

// getTopUrgentIssues returns the top 3 most urgent open issues
func (g *Generator) getTopUrgentIssues(issues []models.Issue) []UrgentIssue {
	var openIssues []models.Issue
	for _, issue := range issues {
		if issue.State == "open" {
			openIssues = append(openIssues, issue)
		}
	}

	if len(openIssues) == 0 {
		return []UrgentIssue{}
	}

	// Calculate urgency scores
	type scoredIssue struct {
		issue  models.Issue
		score  float64
		reason string
	}

	var scoredIssues []scoredIssue
	for _, issue := range openIssues {
		score, reason := g.calculateUrgencyScore(issue)
		scoredIssues = append(scoredIssues, scoredIssue{
			issue:  issue,
			score:  score,
			reason: reason,
		})
	}

	// Simple bubble sort by score (highest first)
	for i := 0; i < len(scoredIssues); i++ {
		for j := i + 1; j < len(scoredIssues); j++ {
			if scoredIssues[j].score > scoredIssues[i].score {
				scoredIssues[i], scoredIssues[j] = scoredIssues[j], scoredIssues[i]
			}
		}
	}

	// Take top 3
	maxResults := 3
	if len(scoredIssues) < maxResults {
		maxResults = len(scoredIssues)
	}

	var urgentIssues []UrgentIssue
	for i := 0; i < maxResults; i++ {
		scored := scoredIssues[i]
		actionNeeded := g.determineActionNeeded(scored.issue, scored.score)

		urgentIssues = append(urgentIssues, UrgentIssue{
			Issue:         scored.issue,
			UrgencyScore:  scored.score,
			UrgencyReason: scored.reason,
			ActionNeeded:  actionNeeded,
		})
	}

	return urgentIssues
}

// determineActionNeeded determines what action is needed for an urgent issue
func (g *Generator) determineActionNeeded(issue models.Issue, score float64) string {
	if score >= 50.0 {
		return "🚨 Immediate attention required"
	} else if score >= 30.0 {
		return "⚡ High priority action needed"
	} else if score >= 20.0 {
		return "🔧 Should be addressed soon"
	} else if len(issue.Assignees) == 0 {
		return "👤 Needs assignment"
	} else {
		return "📋 Review and prioritize"
	}
}

// generateQuickAccessLinks creates category-based quick access links
func (g *Generator) generateQuickAccessLinks(issues []models.Issue) []CategoryLink {
	categories := map[string]*CategoryLink{
		"bug": {
			Title:       "🐛 Bug Fixes",
			Description: "Critical bugs and errors",
			URL:         "Issues-Summary#bugs",
			Icon:        "🐛",
		},
		"feature": {
			Title:       "✨ New Features",
			Description: "Feature requests and enhancements",
			URL:         "Issues-Summary#features",
			Icon:        "✨",
		},
		"docs": {
			Title:       "📚 Documentation",
			Description: "Documentation improvements",
			URL:         "Issues-Summary#documentation",
			Icon:        "📚",
		},
		"config": {
			Title:       "⚙️ Configuration",
			Description: "Setup and configuration issues",
			URL:         "Troubleshooting-Guide",
			Icon:        "⚙️",
		},
	}

	// Count issues by category
	for _, issue := range issues {
		if issue.State != "open" {
			continue
		}

		// Check labels for category classification
		for _, label := range issue.Labels {
			labelName := toLower(label.Name)
			if contains(labelName, "bug") || contains(labelName, "type: bug") {
				categories["bug"].Count++
			} else if contains(labelName, "feature") || contains(labelName, "type: feature") || contains(labelName, "enhancement") {
				categories["feature"].Count++
			} else if contains(labelName, "docs") || contains(labelName, "type: docs") || contains(labelName, "documentation") {
				categories["docs"].Count++
			}
		}

		// Keyword-based classification as fallback
		titleAndBody := toLower(issue.Title + " " + issue.Body)
		if contains(titleAndBody, "config") || contains(titleAndBody, "setup") || contains(titleAndBody, "install") {
			categories["config"].Count++
		}
	}

	var links []CategoryLink
	for _, link := range categories {
		if link.Count > 0 {
			links = append(links, *link)
		}
	}

	return links
}

// generateProjectStatus creates a project status summary
func (g *Generator) generateProjectStatus(issues []models.Issue) ProjectSummary {
	var inProgress, completedToday, completedWeek int
	now := g.now()
	weekAgo := now.AddDate(0, 0, -7)
	dayAgo := now.AddDate(0, 0, -1)

	for _, issue := range issues {
		if issue.State == "open" && len(issue.Assignees) > 0 {
			inProgress++
		}

		if issue.State == "closed" {
			if issue.ClosedAt != nil {
				if issue.ClosedAt.After(dayAgo) {
					completedToday++
				}
				if issue.ClosedAt.After(weekAgo) {
					completedWeek++
				}
			}
		}
	}

	// Calculate health score
	totalIssues := len(issues)
	openIssues := 0
	for _, issue := range issues {
		if issue.State == "open" {
			openIssues++
		}
	}

	healthScore := 100.0
	if totalIssues > 0 {
		healthScore = 100.0 - (float64(openIssues)/float64(totalIssues))*100.0
		if healthScore < 0 {
			healthScore = 0
		}
	}

	healthStatus := "Excellent"
	if healthScore < 50 {
		healthStatus = "Needs Attention"
	} else if healthScore < 70 {
		healthStatus = "Good"
	} else if healthScore < 90 {
		healthStatus = "Very Good"
	}

	return ProjectSummary{
		InProgress:     inProgress,
		CompletedToday: completedToday,
		CompletedWeek:  completedWeek,
		HealthScore:    healthScore,
		HealthStatus:   healthStatus,
	}
}

// generateRecentActivity creates recent activity items
func (g *Generator) generateRecentActivity(issues []models.Issue) []ActivityItem {
	var activities []ActivityItem
	now := g.now()
	weekAgo := now.AddDate(0, 0, -7)

	// Sort issues by update time (most recent first)
	var recentIssues []models.Issue
	for _, issue := range issues {
		if issue.UpdatedAt.After(weekAgo) {
			recentIssues = append(recentIssues, issue)
		}
	}

	// Simple sort by UpdatedAt (newest first)
	for i := 0; i < len(recentIssues); i++ {
		for j := i + 1; j < len(recentIssues); j++ {
			if recentIssues[j].UpdatedAt.After(recentIssues[i].UpdatedAt) {
				recentIssues[i], recentIssues[j] = recentIssues[j], recentIssues[i]
			}
		}
	}

	// Take top 5 recent activities
	maxActivities := 5
	if len(recentIssues) < maxActivities {
		maxActivities = len(recentIssues)
	}

	for i := 0; i < maxActivities; i++ {
		issue := recentIssues[i]
		activityType := "Updated"
		if issue.State == "closed" && issue.ClosedAt != nil && issue.ClosedAt.After(weekAgo) {
			activityType = "Closed"
		} else if issue.CreatedAt.After(weekAgo) {
			activityType = "Created"
		}

		description := truncateString(issue.Body, 100)
		if description == "" {
			description = "No description provided"
		}

		activities = append(activities, ActivityItem{
			Type:        activityType,
			Title:       issue.Title,
			Description: description,
			Timestamp:   issue.UpdatedAt,
			URL:         fmt.Sprintf("https://github.com/%s/issues/%d", issue.Repository, issue.Number),
			Author:      issue.User.Login,
		})
	}

	return activities
}

// GenerateDeveloperDashboard generates an enhanced homepage with developer-focused features
func (g *Generator) GenerateDeveloperDashboard(issues []models.Issue, projectName string) (*WikiPage, error) {
	openIssues := 0
	closedIssues := 0
	for _, issue := range issues {
		if issue.State == "open" {
			openIssues++
		} else {
			closedIssues++
		}
	}

	generatedAt := g.now()
	slog.Info("🏠 HOMEPAGE DEBUG: Generating developer dashboard", 
		"timestamp", generatedAt.Format("2006-01-02 15:04:05 MST"),
		"total_issues", len(issues),
		"open_issues", openIssues,
		"closed_issues", closedIssues)
	
	data := DeveloperDashboardData{
		ProjectName:    projectName,
		GeneratedAt:    generatedAt,
		TotalIssues:    len(issues),
		OpenIssues:     openIssues,
		ClosedIssues:   closedIssues,
		Status:         "Active",
		LastUpdate:     generatedAt,
		UrgentIssues:   g.getTopUrgentIssues(issues),
		QuickAccess:    g.generateQuickAccessLinks(issues),
		ProjectStatus:  g.generateProjectStatus(issues),
		RecentActivity: g.generateRecentActivity(issues),
		Navigation:     g.navigationManager.GetNavigationContext("Home"),
	}

	content, err := g.renderTemplate("developer-dashboard", data)
	if err != nil {
		return nil, fmt.Errorf("failed to render developer dashboard template: %w", err)
	}

	return &WikiPage{
		Title:     fmt.Sprintf("%s - Developer Dashboard", projectName),
		Content:   content,
		Filename:  "Home.md",
		CreatedAt: g.now(),
		UpdatedAt: g.now(),
		Summary:   fmt.Sprintf("Developer-focused dashboard for %s with urgent issues and quick access", projectName),
		Category:  "Dashboard",
		Tags:      []string{"dashboard", "urgent", "developer", "quick-access"},
	}, nil
}

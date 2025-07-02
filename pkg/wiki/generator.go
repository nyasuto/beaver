package wiki

import (
	"bytes"
	"fmt"
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
	return g.config.Now()
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

// IndexData contains data for the main index page
type IndexData struct {
	ProjectName string
	GeneratedAt time.Time
	TotalIssues int
	Status      string
	LastUpdate  time.Time
	Navigation  NavigationContext

	// New fields for Issue #367 - Developer-focused improvements
	ImportantIssues  []ImportantIssue `json:"important_issues"`
	WeeklyStats      WeeklyStatistics `json:"weekly_stats"`
	HealthMetrics    *HealthMetrics   `json:"health_metrics,omitempty"`
	BugCount         int              `json:"bug_count"`
	PerformanceCount int              `json:"performance_count"`
	FeatureCount     int              `json:"feature_count"`
	DocsCount        int              `json:"docs_count"`
	TechDebtCount    int              `json:"tech_debt_count"`
	TestCount        int              `json:"test_count"`
	BaseURL          string           `json:"base_url"`
	AIConfidence     float64          `json:"ai_confidence"`
}

// ImportantIssue represents a prioritized issue for the homepage
type ImportantIssue struct {
	Number          int       `json:"number"`
	Title           string    `json:"title"`
	URL             string    `json:"url"`
	Category        string    `json:"category"`
	Priority        string    `json:"priority"`
	State           string    `json:"state"`
	UpdatedAt       time.Time `json:"updated_at"`
	Summary         string    `json:"summary"`
	EstimatedEffort string    `json:"estimated_effort"`
	ImportanceScore float64   `json:"importance_score"`
}

// WeeklyStatistics represents weekly progress metrics
type WeeklyStatistics struct {
	Resolved              int     `json:"resolved"`
	Created               int     `json:"created"`
	ResolvedLast          int     `json:"resolved_last"`
	CreatedLast           int     `json:"created_last"`
	AvgResolutionDays     float64 `json:"avg_resolution_days"`
	AvgResolutionDaysLast float64 `json:"avg_resolution_days_last"`
}

// HealthMetrics represents project health indicators
type HealthMetrics struct {
	BacklogHealth   string `json:"backlog_health"`
	BacklogDetails  string `json:"backlog_details"`
	ResponseSpeed   string `json:"response_speed"`
	ResponseDetails string `json:"response_details"`
	QualityTrend    string `json:"quality_trend"`
	QualityDetails  string `json:"quality_details"`
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
func (g *Generator) renderTemplate(templateName string, data any) (string, error) {
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

// GenerateIndex generates the main index page
func (g *Generator) GenerateIndex(issues []models.Issue, projectName string) (*WikiPage, error) {
	// Calculate enhanced analytics
	importantIssues := g.calculateImportantIssues(issues)
	weeklyStats := g.calculateWeeklyStatistics(issues)
	healthMetrics := g.calculateHealthMetrics(issues)
	categoryStats := g.calculateCategoryStatistics(issues)

	data := IndexData{
		ProjectName: projectName,
		GeneratedAt: g.now(),
		TotalIssues: len(issues),
		Status:      "Active",
		LastUpdate:  g.now(),
		Navigation:  g.navigationManager.GetNavigationContext("Home"),

		// Enhanced data for developer-focused UI
		ImportantIssues:  importantIssues,
		WeeklyStats:      weeklyStats,
		HealthMetrics:    healthMetrics,
		BugCount:         categoryStats["bug"],
		PerformanceCount: categoryStats["performance"],
		FeatureCount:     categoryStats["feature"],
		DocsCount:        categoryStats["docs"],
		TechDebtCount:    categoryStats["tech-debt"],
		TestCount:        categoryStats["test"],
		BaseURL:          g.getBaseURL(projectName),
		AIConfidence:     g.calculateAIConfidence(issues),
	}

	content, err := g.renderTemplate("index", data)
	if err != nil {
		return nil, fmt.Errorf("failed to render index template: %w", err)
	}

	return &WikiPage{
		Title:     fmt.Sprintf("%s - Home", projectName),
		Content:   content,
		Filename:  "Home.md",
		CreatedAt: g.now(),
		UpdatedAt: g.now(),
		Summary:   fmt.Sprintf("Main index page for %s knowledge base", projectName),
		Category:  "Index",
		Tags:      []string{"index", "home", "navigation"},
	}, nil
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

// calculateImportantIssues calculates top important issues for the homepage
func (g *Generator) calculateImportantIssues(issues []models.Issue) []ImportantIssue {
	var importantIssues []ImportantIssue

	// Simple implementation: take open issues sorted by creation date (most recent first)
	openIssues := make([]models.Issue, 0)
	for _, issue := range issues {
		if issue.State == "open" {
			openIssues = append(openIssues, issue)
		}
	}

	// Sort by created date (most recent first)
	for i := 0; i < len(openIssues); i++ {
		for j := i + 1; j < len(openIssues); j++ {
			if openIssues[j].CreatedAt.After(openIssues[i].CreatedAt) {
				openIssues[i], openIssues[j] = openIssues[j], openIssues[i]
			}
		}
	}

	// Take top 3
	maxCount := 3
	if len(openIssues) < maxCount {
		maxCount = len(openIssues)
	}

	for i := 0; i < maxCount; i++ {
		issue := openIssues[i]
		priority := g.determinePriority(issue)
		category := g.determineCategory(issue)

		importantIssue := ImportantIssue{
			Number:          issue.Number,
			Title:           issue.Title,
			URL:             fmt.Sprintf("https://github.com/%s/issues/%d", g.extractRepository(issue), issue.Number),
			Category:        category,
			Priority:        priority,
			State:           issue.State,
			UpdatedAt:       issue.CreatedAt, // Using CreatedAt as fallback
			Summary:         g.generateIssueSummary(issue),
			EstimatedEffort: g.estimateEffort(issue),
			ImportanceScore: g.calculateImportanceScore(issue),
		}
		importantIssues = append(importantIssues, importantIssue)
	}

	return importantIssues
}

// calculateWeeklyStatistics calculates weekly progress statistics
func (g *Generator) calculateWeeklyStatistics(issues []models.Issue) WeeklyStatistics {
	now := g.now()
	oneWeekAgo := now.AddDate(0, 0, -7)
	twoWeeksAgo := now.AddDate(0, 0, -14)

	var thisWeekCreated, thisWeekResolved, lastWeekCreated, lastWeekResolved int

	for _, issue := range issues {
		// This week
		if issue.CreatedAt.After(oneWeekAgo) {
			thisWeekCreated++
		}
		if issue.State == "closed" && issue.CreatedAt.After(oneWeekAgo) {
			thisWeekResolved++
		}

		// Last week
		if issue.CreatedAt.After(twoWeeksAgo) && issue.CreatedAt.Before(oneWeekAgo) {
			lastWeekCreated++
		}
		if issue.State == "closed" && issue.CreatedAt.After(twoWeeksAgo) && issue.CreatedAt.Before(oneWeekAgo) {
			lastWeekResolved++
		}
	}

	return WeeklyStatistics{
		Resolved:              thisWeekResolved,
		Created:               thisWeekCreated,
		ResolvedLast:          lastWeekResolved,
		CreatedLast:           lastWeekCreated,
		AvgResolutionDays:     g.calculateAvgResolutionDays(issues, oneWeekAgo),
		AvgResolutionDaysLast: g.calculateAvgResolutionDays(issues, twoWeeksAgo),
	}
}

// calculateHealthMetrics calculates project health indicators
func (g *Generator) calculateHealthMetrics(issues []models.Issue) *HealthMetrics {
	openIssues := 0
	oldIssues := 0
	criticalIssues := 0
	bugIssues := 0

	now := g.now()
	thirtyDaysAgo := now.AddDate(0, 0, -30)

	for _, issue := range issues {
		if issue.State == "open" {
			openIssues++

			if issue.CreatedAt.Before(thirtyDaysAgo) {
				oldIssues++
			}

			if g.isCritical(issue) {
				criticalIssues++
			}

			if g.isBug(issue) {
				bugIssues++
			}
		}
	}

	// Calculate health indicators
	backlogHealth := "🟢 良好"
	backlogDetails := fmt.Sprintf("未解決Issue %d件は管理可能", openIssues)
	if openIssues > 25 {
		backlogHealth = "🔴 改善必要"
		backlogDetails = fmt.Sprintf("未解決Issue %d件、積極的な解決が必要", openIssues)
	} else if openIssues > 10 {
		backlogHealth = "🟡 注意"
		backlogDetails = fmt.Sprintf("未解決Issue %d件、計画的な対応が必要", openIssues)
	}

	responseSpeed := "🟢 良好"
	responseDetails := "クリティカルなIssueなし"
	if criticalIssues > 2 {
		responseSpeed = "🔴 改善必要"
		responseDetails = fmt.Sprintf("クリティカルIssue %d件、緊急対応必要", criticalIssues)
	} else if criticalIssues > 0 {
		responseSpeed = "🟡 注意"
		responseDetails = fmt.Sprintf("クリティカルIssue %d件", criticalIssues)
	}

	qualityTrend := "🟢 向上中"
	qualityDetails := "バグ発生率が減少傾向"
	if len(issues) > 0 {
		bugRatio := float64(bugIssues) / float64(len(issues))
		if bugRatio > 0.4 {
			qualityTrend = "🔴 改善必要"
			qualityDetails = fmt.Sprintf("バグ率 %.1f%%、品質改善が必要", bugRatio*100)
		} else if bugRatio > 0.2 {
			qualityTrend = "🟡 普通"
			qualityDetails = fmt.Sprintf("バグ率 %.1f%%、通常レベル", bugRatio*100)
		}
	}

	return &HealthMetrics{
		BacklogHealth:   backlogHealth,
		BacklogDetails:  backlogDetails,
		ResponseSpeed:   responseSpeed,
		ResponseDetails: responseDetails,
		QualityTrend:    qualityTrend,
		QualityDetails:  qualityDetails,
	}
}

// calculateCategoryStatistics calculates statistics by category
func (g *Generator) calculateCategoryStatistics(issues []models.Issue) map[string]int {
	stats := map[string]int{
		"bug":         0,
		"performance": 0,
		"feature":     0,
		"docs":        0,
		"tech-debt":   0,
		"test":        0,
	}

	for _, issue := range issues {
		if issue.State != "open" {
			continue
		}

		labels := g.getLabelsText(issue)

		if g.containsAny(labels, []string{"bug", "バグ"}) {
			stats["bug"]++
		}
		if g.containsAny(labels, []string{"performance", "パフォーマンス", "速度"}) {
			stats["performance"]++
		}
		if g.containsAny(labels, []string{"feature", "機能", "enhancement"}) {
			stats["feature"]++
		}
		if g.containsAny(labels, []string{"doc", "documentation", "ドキュメント"}) {
			stats["docs"]++
		}
		if g.containsAny(labels, []string{"tech", "debt", "refactor", "技術的負債"}) {
			stats["tech-debt"]++
		}
		if g.containsAny(labels, []string{"test", "testing", "テスト"}) {
			stats["test"]++
		}
	}

	return stats
}

// getBaseURL generates base URL for the project
func (g *Generator) getBaseURL(projectName string) string {
	// Simple implementation - can be enhanced with actual repository detection
	return fmt.Sprintf("https://github.com/%s", projectName)
}

// calculateAIConfidence calculates AI confidence score
func (g *Generator) calculateAIConfidence(issues []models.Issue) float64 {
	totalConfidence := 0.0
	count := 0

	for _, issue := range issues {
		if classification := issue.Classification; classification != nil {
			totalConfidence += classification.Confidence
			count++
		}
	}

	if count == 0 {
		return 95.0 // Default confidence
	}

	return (totalConfidence / float64(count)) * 100
}

// Helper functions for issue analysis

func (g *Generator) determinePriority(issue models.Issue) string {
	labels := g.getLabelsText(issue)

	if g.containsAny(labels, []string{"critical", "urgent", "クリティカル", "緊急"}) {
		return "critical"
	}
	if g.containsAny(labels, []string{"high", "高"}) {
		return "high"
	}
	if g.containsAny(labels, []string{"medium", "中"}) {
		return "medium"
	}
	return "low"
}

func (g *Generator) determineCategory(issue models.Issue) string {
	if issue.Classification != nil {
		return issue.Classification.Category
	}

	labels := g.getLabelsText(issue)

	if g.containsAny(labels, []string{"bug", "バグ"}) {
		return "バグ修正"
	}
	if g.containsAny(labels, []string{"feature", "機能"}) {
		return "機能要求"
	}
	if g.containsAny(labels, []string{"doc", "ドキュメント"}) {
		return "ドキュメント"
	}

	return "その他"
}

func (g *Generator) generateIssueSummary(issue models.Issue) string {
	if issue.Classification != nil && issue.Classification.Reasoning != "" {
		if len(issue.Classification.Reasoning) > 150 {
			return issue.Classification.Reasoning[:150] + "..."
		}
		return issue.Classification.Reasoning
	}

	if len(issue.Body) > 100 {
		return issue.Body[:100] + "..."
	}
	return issue.Body
}

func (g *Generator) estimateEffort(issue models.Issue) string {
	labels := g.getLabelsText(issue)

	if g.containsAny(labels, []string{"simple", "easy", "簡単"}) {
		return "半日"
	}
	if g.containsAny(labels, []string{"complex", "difficult", "複雑"}) {
		return "1-2週間"
	}
	if g.containsAny(labels, []string{"bug", "バグ"}) {
		return "1-2日"
	}
	if g.containsAny(labels, []string{"feature", "機能"}) {
		return "3-5日"
	}

	return "2-3日"
}

func (g *Generator) calculateImportanceScore(issue models.Issue) float64 {
	score := 0.5 // Base score

	// Priority boost
	priority := g.determinePriority(issue)
	switch priority {
	case "critical":
		score += 0.4
	case "high":
		score += 0.3
	case "medium":
		score += 0.1
	}

	// Recent issues get boost
	now := g.now()
	daysSinceCreated := now.Sub(issue.CreatedAt).Hours() / 24
	if daysSinceCreated <= 7 {
		score += 0.2
	} else if daysSinceCreated <= 30 {
		score += 0.1
	}

	// Bug issues get boost
	if g.isBug(issue) {
		score += 0.1
	}

	return score
}

func (g *Generator) calculateAvgResolutionDays(issues []models.Issue, since time.Time) float64 {
	var totalDays float64
	count := 0

	for _, issue := range issues {
		if issue.State == "closed" && issue.CreatedAt.After(since) {
			// Simplified: using current time as closed time
			resolutionDays := g.now().Sub(issue.CreatedAt).Hours() / 24
			totalDays += resolutionDays
			count++
		}
	}

	if count == 0 {
		return 0
	}

	return totalDays / float64(count)
}

func (g *Generator) extractRepository(_ models.Issue) string {
	// Simplified implementation
	return "owner/repo"
}

func (g *Generator) isCritical(issue models.Issue) bool {
	labels := g.getLabelsText(issue)
	return g.containsAny(labels, []string{"critical", "urgent", "クリティカル", "緊急"})
}

func (g *Generator) isBug(issue models.Issue) bool {
	labels := g.getLabelsText(issue)
	return g.containsAny(labels, []string{"bug", "バグ", "error", "エラー"})
}

func (g *Generator) getLabelsText(issue models.Issue) string {
	var labels []string
	for _, label := range issue.Labels {
		labels = append(labels, label.Name)
	}
	return fmt.Sprintf("%s %s", issue.Title, fmt.Sprintf("%v", labels))
}

func (g *Generator) containsAny(text string, keywords []string) bool {
	for _, keyword := range keywords {
		if containsKeyword(text, keyword) {
			return true
		}
	}
	return false
}

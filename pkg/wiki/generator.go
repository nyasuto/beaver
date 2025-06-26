package wiki

import (
	"bytes"
	"fmt"
	"time"

	"github.com/nyasuto/beaver/internal/models"
)

// Generator generates Wiki content from GitHub Issues
type Generator struct {
	templateManager *TemplateManager
}

// NewGenerator creates a new Wiki generator
func NewGenerator() *Generator {
	return &Generator{
		templateManager: NewTemplateManager(),
	}
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

// IssuesSummaryData contains data for Issues summary page
type IssuesSummaryData struct {
	ProjectName   string
	GeneratedAt   time.Time
	TotalIssues   int
	OpenIssues    int
	ClosedIssues  int
	Issues        []models.Issue
	AIProcessor   string
	BeaverVersion string
}

// TroubleshootingData contains data for troubleshooting guide
type TroubleshootingData struct {
	ProjectName  string
	GeneratedAt  time.Time
	SolvedIssues []models.Issue
	CommonErrors []ErrorPattern
	Solutions    []Solution
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
}

// GenerateIssuesSummary generates an Issues summary Wiki page
func (g *Generator) GenerateIssuesSummary(issues []models.Issue, projectName string) (*WikiPage, error) {
	data := IssuesSummaryData{
		ProjectName:   projectName,
		GeneratedAt:   time.Now(),
		TotalIssues:   len(issues),
		Issues:        issues,
		AIProcessor:   "OpenAI/Anthropic",
		BeaverVersion: "1.0.0",
	}

	// Count open/closed issues
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
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
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
		GeneratedAt:  time.Now(),
		SolvedIssues: solvedIssues,
		CommonErrors: g.extractErrorPatterns(solvedIssues),
		Solutions:    g.extractSolutions(solvedIssues),
	}

	content, err := g.renderTemplate("troubleshooting", data)
	if err != nil {
		return nil, fmt.Errorf("failed to render troubleshooting template: %w", err)
	}

	return &WikiPage{
		Title:     fmt.Sprintf("%s - Troubleshooting Guide", projectName),
		Content:   content,
		Filename:  "Troubleshooting-Guide.md",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		Summary:   fmt.Sprintf("Troubleshooting guide based on %d solved issues", len(solvedIssues)),
		Category:  "Guide",
		Tags:      []string{"troubleshooting", "solutions", "closed-issues"},
	}, nil
}

// GenerateLearningPath generates a learning path Wiki page
func (g *Generator) GenerateLearningPath(issues []models.Issue, projectName string) (*WikiPage, error) {
	data := LearningPathData{
		ProjectName:   projectName,
		GeneratedAt:   time.Now(),
		Milestones:    g.extractMilestones(issues),
		Technologies:  g.extractTechnologies(issues),
		LearningGoals: g.extractLearningGoals(issues),
	}

	content, err := g.renderTemplate("learning-path", data)
	if err != nil {
		return nil, fmt.Errorf("failed to render learning path template: %w", err)
	}

	return &WikiPage{
		Title:     fmt.Sprintf("%s - Learning Path", projectName),
		Content:   content,
		Filename:  "Learning-Path.md",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
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

	return pages, nil
}

// GenerateIndex generates the main index page
func (g *Generator) GenerateIndex(issues []models.Issue, projectName string) (*WikiPage, error) {
	data := IndexData{
		ProjectName: projectName,
		GeneratedAt: time.Now(),
		TotalIssues: len(issues),
		Status:      "Active",
		LastUpdate:  time.Now(),
	}

	content, err := g.renderTemplate("index", data)
	if err != nil {
		return nil, fmt.Errorf("failed to render index template: %w", err)
	}

	return &WikiPage{
		Title:     fmt.Sprintf("%s - Home", projectName),
		Content:   content,
		Filename:  "Home.md",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		Summary:   fmt.Sprintf("Main index page for %s knowledge base", projectName),
		Category:  "Index",
		Tags:      []string{"index", "home", "navigation"},
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

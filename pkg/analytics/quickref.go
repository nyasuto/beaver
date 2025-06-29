package analytics

import (
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/nyasuto/beaver/internal/models"
)

// QuickReferenceData contains comprehensive quick reference data
type QuickReferenceData struct {
	ProjectName             string
	GeneratedAt             time.Time
	TotalIssues             int
	OpenIssues              int
	ClosedIssues            int
	Repository              string
	RepositoryURL           string
	PrimaryLanguage         string
	LastActivity            time.Time
	DocumentationCoverage   float64
	KeyLabels               []KeyLabel
	LabelCategories         []QuickLabelCategory
	BugPatterns             []IssuePattern
	FeaturePatterns         []IssuePattern
	QuestionPatterns        []QuestionPattern
	IssueTemplates          []IssueTemplate
	PriorityGuidelines      PriorityGuidelines
	TopContributors         []QuickContributor
	ContributorRoles        []ContributorRole
	ActivityMetrics         ActivityMetrics
	HealthIndicators        []HealthIndicator
	OverallHealth           string
	IssueBacklog            string
	CommunityActivity       string
	CommonWorkflows         []Workflow
	ImportantLinks          []ImportantLink
	DocumentationSections   []DocumentationSection
	CommunicationGuidelines []CommunicationGuideline
	ContributionGuidelines  []ContributionGuideline
	EmergencyContacts       []EmergencyContact
	SupportChannels         []SupportChannel
	DataPeriod              string
	NextUpdate              *time.Time
}

// KeyLabel represents an important label with usage statistics
type KeyLabel struct {
	Name        string
	Description string
	Color       string
	Count       int
}

// QuickLabelCategory represents a label category for quick reference
type QuickLabelCategory struct {
	Name   string
	Labels []string
}

// IssuePattern represents a common pattern in issues
type IssuePattern struct {
	Pattern     string
	Description string
	Count       int
}

// QuestionPattern represents frequently asked questions
type QuestionPattern struct {
	Topic       string
	Description string
	Count       int
}

// IssueTemplate represents an issue template
type IssueTemplate struct {
	Name           string
	Description    string
	RequiredFields []string
}

// PriorityGuidelines contains priority level guidelines
type PriorityGuidelines struct {
	Critical []string
	High     []string
	Medium   []string
	Low      []string
}

// QuickContributor represents a contributor for quick reference
type QuickContributor struct {
	Name             string
	IssueCount       int
	ContributionType string
}

// ContributorRole represents contributor roles
type ContributorRole struct {
	Role         string
	Contributors []string
}

// ActivityMetrics contains key activity metrics
type ActivityMetrics struct {
	IssuesPerMonth    float64
	AvgResolutionDays float64
	AvgResponseHours  float64
	ResolutionRate    float64
	Trend             string
	ResolutionTrend   string
	ResponseTrend     string
}

// HealthIndicator represents a health metric
type HealthIndicator struct {
	Name   string
	Value  string
	Status string
}

// Workflow represents a common workflow
type Workflow struct {
	Name        string
	Description string
	Steps       []string
}

// ImportantLink represents an important project link
type ImportantLink struct {
	Title       string
	URL         string
	Description string
}

// DocumentationSection represents a documentation section
type DocumentationSection struct {
	Title       string
	Link        string
	Description string
	PageCount   int
}

// CommunicationGuideline represents communication guidelines
type CommunicationGuideline struct {
	Aspect      string
	Description string
}

// ContributionGuideline represents contribution guidelines
type ContributionGuideline struct {
	Category    string
	Description string
}

// EmergencyContact represents emergency contact information
type EmergencyContact struct {
	Role         string
	Contact      string
	Availability string
}

// SupportChannel represents a support channel
type SupportChannel struct {
	Name        string
	Description string
	Link        string
}

// QuickReferenceCalculator calculates quick reference data from issues
type QuickReferenceCalculator struct {
	issues      []models.Issue
	projectName string
	generatedAt time.Time
}

// NewQuickReferenceCalculator creates a new quick reference calculator
func NewQuickReferenceCalculator(issues []models.Issue, projectName string) *QuickReferenceCalculator {
	return &QuickReferenceCalculator{
		issues:      issues,
		projectName: projectName,
		generatedAt: time.Now(),
	}
}

// Calculate generates comprehensive quick reference data
func (qrc *QuickReferenceCalculator) Calculate() *QuickReferenceData {
	data := &QuickReferenceData{
		ProjectName: qrc.projectName,
		GeneratedAt: qrc.generatedAt,
		TotalIssues: len(qrc.issues),
	}

	// Count open/closed issues
	for _, issue := range qrc.issues {
		if issue.State == "open" {
			data.OpenIssues++
		} else {
			data.ClosedIssues++
		}
	}

	// Calculate basic metrics
	data.Repository = qrc.extractRepository()
	data.RepositoryURL = qrc.buildRepositoryURL(data.Repository)
	data.PrimaryLanguage = qrc.detectPrimaryLanguage()
	data.LastActivity = qrc.getLastActivity()
	data.DocumentationCoverage = qrc.calculateDocumentationCoverage()

	// Calculate label information
	data.KeyLabels = qrc.getKeyLabels()
	data.LabelCategories = qrc.getLabelCategories()

	// Analyze issue patterns
	data.BugPatterns = qrc.extractBugPatterns()
	data.FeaturePatterns = qrc.extractFeaturePatterns()
	data.QuestionPatterns = qrc.extractQuestionPatterns()

	// Set issue templates
	data.IssueTemplates = qrc.getIssueTemplates()

	// Set priority guidelines
	data.PriorityGuidelines = qrc.getPriorityGuidelines()

	// Calculate contributor information
	data.TopContributors = qrc.getTopContributors()
	data.ContributorRoles = qrc.getContributorRoles()

	// Calculate activity metrics
	data.ActivityMetrics = qrc.calculateActivityMetrics()

	// Calculate health indicators
	data.HealthIndicators = qrc.calculateHealthIndicators()
	data.OverallHealth = qrc.calculateOverallHealth()
	data.IssueBacklog = qrc.assessIssueBacklog()
	data.CommunityActivity = qrc.assessCommunityActivity()

	// Set workflow information
	data.CommonWorkflows = qrc.getCommonWorkflows()

	// Set links and documentation
	data.ImportantLinks = qrc.getImportantLinks()
	data.DocumentationSections = qrc.getDocumentationSections()

	// Set guidelines and contacts
	data.CommunicationGuidelines = qrc.getCommunicationGuidelines()
	data.ContributionGuidelines = qrc.getContributionGuidelines()
	data.EmergencyContacts = qrc.getEmergencyContacts()
	data.SupportChannels = qrc.getSupportChannels()

	// Set metadata
	data.DataPeriod = qrc.getDataPeriod()
	nextUpdate := qrc.generatedAt.Add(24 * time.Hour)
	data.NextUpdate = &nextUpdate

	return data
}

// extractRepository extracts repository information from issues
func (qrc *QuickReferenceCalculator) extractRepository() string {
	if len(qrc.issues) > 0 && qrc.issues[0].Repository != "" {
		return qrc.issues[0].Repository
	}
	return ""
}

// buildRepositoryURL builds the repository URL
func (qrc *QuickReferenceCalculator) buildRepositoryURL(repo string) string {
	if repo != "" {
		return "https://github.com/" + repo
	}
	return ""
}

// detectPrimaryLanguage detects the primary programming language
func (qrc *QuickReferenceCalculator) detectPrimaryLanguage() string {
	// Simplified language detection based on common patterns in issues
	languageKeywords := map[string][]string{
		"Go":         {"golang", "go.mod", "main.go", "package main"},
		"Python":     {"python", ".py", "pip", "requirements.txt"},
		"JavaScript": {"javascript", "js", "node", "npm", "package.json"},
		"Java":       {"java", ".java", "maven", "gradle"},
		"C++":        {"cpp", "c++", "cmake", "makefile"},
		"Rust":       {"rust", "cargo", ".rs", "cargo.toml"},
	}

	languageCount := make(map[string]int)

	for _, issue := range qrc.issues {
		text := strings.ToLower(issue.Title + " " + issue.Body)
		for language, keywords := range languageKeywords {
			for _, keyword := range keywords {
				if strings.Contains(text, keyword) {
					languageCount[language]++
					break
				}
			}
		}
	}

	// Find most mentioned language
	maxCount := 0
	primaryLanguage := ""
	for language, count := range languageCount {
		if count > maxCount {
			maxCount = count
			primaryLanguage = language
		}
	}

	return primaryLanguage
}

// getLastActivity gets the last activity date
func (qrc *QuickReferenceCalculator) getLastActivity() time.Time {
	if len(qrc.issues) == 0 {
		return time.Now()
	}

	latest := qrc.issues[0].UpdatedAt
	for _, issue := range qrc.issues {
		if issue.UpdatedAt.After(latest) {
			latest = issue.UpdatedAt
		}
	}

	return latest
}

// calculateDocumentationCoverage calculates documentation coverage
func (qrc *QuickReferenceCalculator) calculateDocumentationCoverage() float64 {
	if len(qrc.issues) == 0 {
		return 100.0
	}

	documentsIssues := 0
	for _, issue := range qrc.issues {
		text := strings.ToLower(issue.Title + " " + issue.Body)
		if strings.Contains(text, "document") ||
			strings.Contains(text, "readme") ||
			strings.Contains(text, "guide") ||
			strings.Contains(text, "tutorial") ||
			hasDocumentationLabel(issue.Labels) {
			documentsIssues++
		}
	}

	// Simplified calculation: higher documentation issues = lower coverage
	coverage := 100.0 - (float64(documentsIssues) / float64(len(qrc.issues)) * 50)
	if coverage < 0 {
		coverage = 0
	}

	return coverage
}

// getKeyLabels gets the most important labels
func (qrc *QuickReferenceCalculator) getKeyLabels() []KeyLabel {
	labelCounts := make(map[string]*KeyLabel)

	for _, issue := range qrc.issues {
		for _, label := range issue.Labels {
			if _, exists := labelCounts[label.Name]; !exists {
				labelCounts[label.Name] = &KeyLabel{
					Name:        label.Name,
					Description: qrc.getLabelDescription(label.Name),
					Color:       label.Color,
					Count:       0,
				}
			}
			labelCounts[label.Name].Count++
		}
	}

	// Convert to slice and sort by count
	var keyLabels []KeyLabel
	for _, label := range labelCounts {
		keyLabels = append(keyLabels, *label)
	}

	sort.Slice(keyLabels, func(i, j int) bool {
		return keyLabels[i].Count > keyLabels[j].Count
	})

	// Return top 10 labels
	if len(keyLabels) > 10 {
		keyLabels = keyLabels[:10]
	}

	return keyLabels
}

// getLabelCategories gets organized label categories
func (qrc *QuickReferenceCalculator) getLabelCategories() []QuickLabelCategory {
	categories := []QuickLabelCategory{
		{Name: "Type", Labels: []string{}},
		{Name: "Priority", Labels: []string{}},
		{Name: "Status", Labels: []string{}},
		{Name: "Area", Labels: []string{}},
	}

	categoryPatterns := map[string][]string{
		"Type":     {"bug", "feature", "enhancement", "documentation", "question"},
		"Priority": {"critical", "high", "medium", "low", "urgent"},
		"Status":   {"ready", "in-progress", "blocked", "review", "wontfix"},
		"Area":     {"frontend", "backend", "api", "ui", "ux", "infrastructure"},
	}

	labelSet := make(map[string]bool)
	for _, issue := range qrc.issues {
		for _, label := range issue.Labels {
			labelSet[label.Name] = true
		}
	}

	for i, category := range categories {
		for labelName := range labelSet {
			for _, pattern := range categoryPatterns[category.Name] {
				if strings.Contains(strings.ToLower(labelName), pattern) {
					categories[i].Labels = append(categories[i].Labels, labelName)
					break
				}
			}
		}
	}

	// Filter out empty categories
	var result []QuickLabelCategory
	for _, category := range categories {
		if len(category.Labels) > 0 {
			result = append(result, category)
		}
	}

	return result
}

// extractBugPatterns extracts common bug patterns
func (qrc *QuickReferenceCalculator) extractBugPatterns() []IssuePattern {
	patterns := make(map[string]*IssuePattern)

	bugKeywords := []string{"error", "crash", "fail", "broken", "not work", "issue"}

	for _, issue := range qrc.issues {
		if qrc.isBugIssue(issue) {
			for _, keyword := range bugKeywords {
				if strings.Contains(strings.ToLower(issue.Title+" "+issue.Body), keyword) {
					if _, exists := patterns[keyword]; !exists {
						patterns[keyword] = &IssuePattern{
							Pattern:     strings.ToUpper(keyword[:1]) + keyword[1:],
							Description: qrc.getBugPatternDescription(keyword),
							Count:       0,
						}
					}
					patterns[keyword].Count++
					break
				}
			}
		}
	}

	var result []IssuePattern
	for _, pattern := range patterns {
		if pattern.Count >= 2 { // Only include patterns with at least 2 occurrences
			result = append(result, *pattern)
		}
	}

	// Sort by count
	sort.Slice(result, func(i, j int) bool {
		return result[i].Count > result[j].Count
	})

	return result
}

// extractFeaturePatterns extracts common feature patterns
func (qrc *QuickReferenceCalculator) extractFeaturePatterns() []IssuePattern {
	patterns := make(map[string]*IssuePattern)

	featureKeywords := []string{"feature", "enhancement", "improve", "add", "implement"}

	for _, issue := range qrc.issues {
		if qrc.isFeatureIssue(issue) {
			for _, keyword := range featureKeywords {
				if strings.Contains(strings.ToLower(issue.Title+" "+issue.Body), keyword) {
					if _, exists := patterns[keyword]; !exists {
						patterns[keyword] = &IssuePattern{
							Pattern:     strings.ToUpper(keyword[:1]) + keyword[1:],
							Description: qrc.getFeaturePatternDescription(keyword),
							Count:       0,
						}
					}
					patterns[keyword].Count++
					break
				}
			}
		}
	}

	var result []IssuePattern
	for _, pattern := range patterns {
		if pattern.Count >= 2 {
			result = append(result, *pattern)
		}
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].Count > result[j].Count
	})

	return result
}

// extractQuestionPatterns extracts common question patterns
func (qrc *QuickReferenceCalculator) extractQuestionPatterns() []QuestionPattern {
	patterns := make(map[string]*QuestionPattern)

	questionKeywords := map[string]string{
		"how":           "How to use or configure",
		"configuration": "Configuration and setup",
		"install":       "Installation and deployment",
		"error":         "Error messages and debugging",
		"performance":   "Performance and optimization",
	}

	for _, issue := range qrc.issues {
		if qrc.isQuestionIssue(issue) {
			text := strings.ToLower(issue.Title + " " + issue.Body)
			for keyword, description := range questionKeywords {
				if strings.Contains(text, keyword) {
					if _, exists := patterns[keyword]; !exists {
						patterns[keyword] = &QuestionPattern{
							Topic:       strings.ToUpper(keyword[:1]) + keyword[1:],
							Description: description,
							Count:       0,
						}
					}
					patterns[keyword].Count++
					break
				}
			}
		}
	}

	var result []QuestionPattern
	for _, pattern := range patterns {
		if pattern.Count >= 2 {
			result = append(result, *pattern)
		}
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].Count > result[j].Count
	})

	return result
}

// Helper methods for issue classification
func (qrc *QuickReferenceCalculator) isBugIssue(issue models.Issue) bool {
	for _, label := range issue.Labels {
		if strings.Contains(strings.ToLower(label.Name), "bug") ||
			strings.Contains(strings.ToLower(label.Name), "error") {
			return true
		}
	}
	return strings.Contains(strings.ToLower(issue.Title), "bug") ||
		strings.Contains(strings.ToLower(issue.Title), "error") ||
		strings.Contains(strings.ToLower(issue.Title), "crash")
}

func (qrc *QuickReferenceCalculator) isFeatureIssue(issue models.Issue) bool {
	for _, label := range issue.Labels {
		if strings.Contains(strings.ToLower(label.Name), "feature") ||
			strings.Contains(strings.ToLower(label.Name), "enhancement") {
			return true
		}
	}
	return strings.Contains(strings.ToLower(issue.Title), "feature") ||
		strings.Contains(strings.ToLower(issue.Title), "enhancement") ||
		strings.Contains(strings.ToLower(issue.Title), "add")
}

func (qrc *QuickReferenceCalculator) isQuestionIssue(issue models.Issue) bool {
	for _, label := range issue.Labels {
		if strings.Contains(strings.ToLower(label.Name), "question") ||
			strings.Contains(strings.ToLower(label.Name), "help") {
			return true
		}
	}
	return strings.Contains(strings.ToLower(issue.Title), "how") ||
		strings.Contains(strings.ToLower(issue.Title), "?") ||
		strings.Contains(strings.ToLower(issue.Title), "help")
}

// Get default data when not enough information is available

func (qrc *QuickReferenceCalculator) getIssueTemplates() []IssueTemplate {
	return []IssueTemplate{
		{
			Name:        "Bug Report",
			Description: "Report a bug or issue",
			RequiredFields: []string{
				"Clear description of the issue",
				"Steps to reproduce",
				"Expected vs actual behavior",
				"Environment details",
				"Error messages/logs",
			},
		},
		{
			Name:        "Feature Request",
			Description: "Request a new feature or enhancement",
			RequiredFields: []string{
				"Feature description",
				"Use case/motivation",
				"Proposed solution",
				"Alternative solutions considered",
			},
		},
	}
}

func (qrc *QuickReferenceCalculator) getPriorityGuidelines() PriorityGuidelines {
	return PriorityGuidelines{
		Critical: []string{
			"Security vulnerabilities",
			"Data loss scenarios",
			"System completely unusable",
			"Breaking changes affecting all users",
		},
		High: []string{
			"Major functionality broken",
			"Significant user impact",
			"Performance degradation",
			"Important feature requests",
		},
		Medium: []string{
			"Minor bugs with workarounds",
			"Feature improvements",
			"Documentation updates",
			"Code quality issues",
		},
		Low: []string{
			"Nice-to-have features",
			"Minor UI/UX improvements",
			"Code cleanup",
			"Future enhancements",
		},
	}
}

func (qrc *QuickReferenceCalculator) getTopContributors() []QuickContributor {
	contributorCounts := make(map[string]int)

	for _, issue := range qrc.issues {
		contributorCounts[issue.User.Login]++
	}

	type contributorCount struct {
		name  string
		count int
	}

	var contributors []contributorCount
	for name, count := range contributorCounts {
		contributors = append(contributors, contributorCount{name: name, count: count})
	}

	sort.Slice(contributors, func(i, j int) bool {
		return contributors[i].count > contributors[j].count
	})

	var result []QuickContributor
	maxContributors := 5
	if len(contributors) < maxContributors {
		maxContributors = len(contributors)
	}

	for i := 0; i < maxContributors; i++ {
		contributor := contributors[i]
		result = append(result, QuickContributor{
			Name:             contributor.name,
			IssueCount:       contributor.count,
			ContributionType: qrc.getContributionType(contributor.count),
		})
	}

	return result
}

func (qrc *QuickReferenceCalculator) getContributorRoles() []ContributorRole {
	// Simplified role assignment based on contribution patterns
	return []ContributorRole{
		{Role: "Maintainers", Contributors: []string{"Not specified"}},
		{Role: "Core Contributors", Contributors: []string{"Not specified"}},
		{Role: "Community Contributors", Contributors: []string{"Not specified"}},
	}
}

func (qrc *QuickReferenceCalculator) calculateActivityMetrics() ActivityMetrics {
	if len(qrc.issues) == 0 {
		return ActivityMetrics{}
	}

	// Calculate issues per month
	monthlyIssues := make(map[string]int)
	var totalResolutionDays float64
	var resolutionCount int

	for _, issue := range qrc.issues {
		month := issue.CreatedAt.Format("2006-01")
		monthlyIssues[month]++

		if issue.State == "closed" && issue.ClosedAt != nil {
			days := issue.ClosedAt.Sub(issue.CreatedAt).Hours() / 24
			totalResolutionDays += days
			resolutionCount++
		}
	}

	issuesPerMonth := float64(len(qrc.issues))
	if len(monthlyIssues) > 0 {
		issuesPerMonth = float64(len(qrc.issues)) / float64(len(monthlyIssues))
	}

	avgResolutionDays := float64(0)
	if resolutionCount > 0 {
		avgResolutionDays = totalResolutionDays / float64(resolutionCount)
	}

	resolutionRate := float64(0)
	if len(qrc.issues) > 0 {
		closedCount := 0
		for _, issue := range qrc.issues {
			if issue.State == "closed" {
				closedCount++
			}
		}
		resolutionRate = float64(closedCount) / float64(len(qrc.issues)) * 100
	}

	return ActivityMetrics{
		IssuesPerMonth:    issuesPerMonth,
		AvgResolutionDays: avgResolutionDays,
		AvgResponseHours:  24.0, // Simplified
		ResolutionRate:    resolutionRate,
		Trend:             "📊",
		ResolutionTrend:   "📊",
		ResponseTrend:     "📊",
	}
}

func (qrc *QuickReferenceCalculator) calculateHealthIndicators() []HealthIndicator {
	openIssues := 0
	for _, issue := range qrc.issues {
		if issue.State == "open" {
			openIssues++
		}
	}

	return []HealthIndicator{
		{Name: "Open Issues", Value: fmt.Sprintf("%d", openIssues), Status: qrc.getIssueStatus(openIssues)},
		{Name: "Issue Velocity", Value: "Steady", Status: "✅"},
		{Name: "Response Time", Value: "< 24h", Status: "✅"},
	}
}

func (qrc *QuickReferenceCalculator) calculateOverallHealth() string {
	openIssues := 0
	for _, issue := range qrc.issues {
		if issue.State == "open" {
			openIssues++
		}
	}

	if openIssues == 0 {
		return "Excellent"
	} else if openIssues < 10 {
		return "Good"
	} else if openIssues < 25 {
		return "Fair"
	}
	return "Needs Attention"
}

func (qrc *QuickReferenceCalculator) assessIssueBacklog() string {
	openIssues := 0
	for _, issue := range qrc.issues {
		if issue.State == "open" {
			openIssues++
		}
	}

	if openIssues == 0 {
		return "Clear"
	} else if openIssues < 10 {
		return "Manageable"
	} else if openIssues < 25 {
		return "Growing"
	}
	return "Large"
}

func (qrc *QuickReferenceCalculator) assessCommunityActivity() string {
	recentIssues := 0
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)

	for _, issue := range qrc.issues {
		if issue.CreatedAt.After(thirtyDaysAgo) {
			recentIssues++
		}
	}

	if recentIssues >= 10 {
		return "Very Active"
	} else if recentIssues >= 5 {
		return "Active"
	} else if recentIssues >= 1 {
		return "Moderate"
	}
	return "Quiet"
}

// Default data methods
func (qrc *QuickReferenceCalculator) getCommonWorkflows() []Workflow {
	return []Workflow{
		{
			Name:        "Bug Fix Workflow",
			Description: "Standard process for fixing bugs",
			Steps: []string{
				"Reproduce the issue",
				"Identify root cause",
				"Implement fix",
				"Test thoroughly",
				"Submit for review",
			},
		},
		{
			Name:        "Feature Development",
			Description: "Process for developing new features",
			Steps: []string{
				"Discuss requirements",
				"Design solution",
				"Implement feature",
				"Add tests",
				"Update documentation",
			},
		},
	}
}

func (qrc *QuickReferenceCalculator) getImportantLinks() []ImportantLink {
	repo := qrc.extractRepository()
	if repo == "" {
		return []ImportantLink{}
	}

	return []ImportantLink{
		{Title: "Issues", URL: "../issues", Description: "Browse and create issues"},
		{Title: "Pull Requests", URL: "../pulls", Description: "View code changes"},
		{Title: "Wiki", URL: "../wiki", Description: "Project documentation"},
		{Title: "Releases", URL: "../releases", Description: "Version history"},
	}
}

func (qrc *QuickReferenceCalculator) getDocumentationSections() []DocumentationSection {
	return []DocumentationSection{
		{Title: "Getting Started", Link: "Home", Description: "Project overview and quick start", PageCount: 1},
		{Title: "Issues Summary", Link: "Issues-Summary", Description: "Detailed issue analysis", PageCount: 1},
		{Title: "Statistics Dashboard", Link: "Statistics", Description: "Project metrics and analytics", PageCount: 1},
		{Title: "Troubleshooting Guide", Link: "Troubleshooting-Guide", Description: "Common problems and solutions", PageCount: 1},
	}
}

func (qrc *QuickReferenceCalculator) getCommunicationGuidelines() []CommunicationGuideline {
	return []CommunicationGuideline{
		{Aspect: "Be Respectful", Description: "Maintain professional and respectful communication"},
		{Aspect: "Be Clear", Description: "Provide clear, detailed descriptions"},
		{Aspect: "Be Patient", Description: "Allow time for responses and reviews"},
		{Aspect: "Be Helpful", Description: "Support other community members"},
	}
}

func (qrc *QuickReferenceCalculator) getContributionGuidelines() []ContributionGuideline {
	return []ContributionGuideline{
		{Category: "Code Quality", Description: "Follow project coding standards"},
		{Category: "Testing", Description: "Include tests with code changes"},
		{Category: "Documentation", Description: "Update docs for new features"},
		{Category: "Commit Messages", Description: "Use clear, descriptive commit messages"},
	}
}

func (qrc *QuickReferenceCalculator) getEmergencyContacts() []EmergencyContact {
	return []EmergencyContact{
		{Role: "Security Issues", Contact: "Create issue with security label", Availability: "24/7"},
		{Role: "Production Issues", Contact: "Create issue with critical label", Availability: "Business hours"},
		{Role: "General Support", Contact: "Create issue with appropriate labels", Availability: "Community support"},
	}
}

func (qrc *QuickReferenceCalculator) getSupportChannels() []SupportChannel {
	return []SupportChannel{
		{Name: "GitHub Issues", Description: "Primary support channel", Link: "../issues"},
		{Name: "Discussions", Description: "Community Q&A", Link: "../discussions"},
		{Name: "Documentation", Description: "Self-service help", Link: "../wiki"},
	}
}

func (qrc *QuickReferenceCalculator) getDataPeriod() string {
	if len(qrc.issues) == 0 {
		return "No data available"
	}

	earliest := qrc.issues[0].CreatedAt
	latest := qrc.issues[0].CreatedAt

	for _, issue := range qrc.issues {
		if issue.CreatedAt.Before(earliest) {
			earliest = issue.CreatedAt
		}
		if issue.CreatedAt.After(latest) {
			latest = issue.CreatedAt
		}
	}

	return earliest.Format("2006-01-02") + " to " + latest.Format("2006-01-02")
}

// Helper utility functions

func hasDocumentationLabel(labels []models.Label) bool {
	for _, label := range labels {
		if strings.Contains(strings.ToLower(label.Name), "doc") {
			return true
		}
	}
	return false
}

func (qrc *QuickReferenceCalculator) getLabelDescription(labelName string) string {
	descriptions := map[string]string{
		"bug":           "Something isn't working correctly",
		"enhancement":   "New feature or improvement",
		"documentation": "Documentation improvements",
		"question":      "Further information requested",
		"critical":      "Urgent priority issue",
		"high":          "High priority issue",
		"medium":        "Medium priority issue",
		"low":           "Low priority issue",
	}

	for pattern, desc := range descriptions {
		if strings.Contains(strings.ToLower(labelName), pattern) {
			return desc
		}
	}

	return "Project label"
}

func (qrc *QuickReferenceCalculator) getBugPatternDescription(keyword string) string {
	descriptions := map[string]string{
		"error":    "Error messages and exceptions",
		"crash":    "Application crashes and failures",
		"fail":     "Feature failures and malfunctions",
		"broken":   "Broken functionality",
		"not work": "Features not working as expected",
		"issue":    "General issues and problems",
	}

	if desc, exists := descriptions[keyword]; exists {
		return desc
	}
	return "Common bug pattern"
}

func (qrc *QuickReferenceCalculator) getFeaturePatternDescription(keyword string) string {
	descriptions := map[string]string{
		"feature":     "New feature requests",
		"enhancement": "Improvements to existing features",
		"improve":     "Performance or usability improvements",
		"add":         "Addition of new functionality",
		"implement":   "Implementation requests",
	}

	if desc, exists := descriptions[keyword]; exists {
		return desc
	}
	return "Common feature pattern"
}

func (qrc *QuickReferenceCalculator) getContributionType(count int) string {
	if count >= 20 {
		return "Core Contributor"
	} else if count >= 10 {
		return "Active Contributor"
	} else if count >= 5 {
		return "Regular Contributor"
	}
	return "Contributor"
}

func (qrc *QuickReferenceCalculator) getIssueStatus(count int) string {
	if count == 0 {
		return "✅"
	} else if count < 10 {
		return "⚠️"
	}
	return "🔴"
}

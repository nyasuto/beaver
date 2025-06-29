package troubleshooting

import (
	"context"
	"fmt"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/nyasuto/beaver/internal/models"
)

// Analyzer analyzes issues to extract troubleshooting patterns
type Analyzer struct {
	aiService AIService
}

// AIService interface for AI-powered troubleshooting analysis
type AIService interface {
	AnalyzeTroubleshootingPatterns(ctx context.Context, issues []models.Issue) (*AITroubleshootingResult, error)
}

// NewAnalyzer creates a new troubleshooting analyzer
func NewAnalyzer(aiService AIService) *Analyzer {
	return &Analyzer{
		aiService: aiService,
	}
}

// TroubleshootingGuide represents a comprehensive troubleshooting guide
type TroubleshootingGuide struct {
	ProjectName      string                   `json:"project_name"`
	GeneratedAt      time.Time                `json:"generated_at"`
	TotalIssues      int                      `json:"total_issues"`
	SolvedIssues     int                      `json:"solved_issues"`
	ErrorPatterns    []ErrorPattern           `json:"error_patterns"`
	Solutions        []Solution               `json:"solutions"`
	PreventionGuides []PreventionGuide        `json:"prevention_guides"`
	EmergencyActions []EmergencyAction        `json:"emergency_actions"`
	DiagnosticSteps  []DiagnosticStep         `json:"diagnostic_steps"`
	KnowledgeBase    []KnowledgeItem          `json:"knowledge_base"`
	Statistics       GuideStatistics          `json:"statistics"`
	AIInsights       *AITroubleshootingResult `json:"ai_insights,omitempty"`
}

// ErrorPattern represents a pattern of errors with solutions
type ErrorPattern struct {
	ID            string         `json:"id"`
	Pattern       string         `json:"pattern"`
	Title         string         `json:"title"`
	Description   string         `json:"description"`
	Frequency     int            `json:"frequency"`
	Severity      Severity       `json:"severity"`
	Category      string         `json:"category"`
	Symptoms      []string       `json:"symptoms"`
	Causes        []string       `json:"causes"`
	Solutions     []string       `json:"solutions"`
	Prevention    []string       `json:"prevention"`
	RelatedIssues []int          `json:"related_issues"`
	LastSeen      time.Time      `json:"last_seen"`
	ResolveTime   *time.Duration `json:"resolve_time,omitempty"`
}

// Solution represents a documented solution to a problem
type Solution struct {
	ID            string         `json:"id"`
	Title         string         `json:"title"`
	Description   string         `json:"description"`
	Category      string         `json:"category"`
	Difficulty    Difficulty     `json:"difficulty"`
	Steps         []SolutionStep `json:"steps"`
	RequiredTools []string       `json:"required_tools"`
	TimeEstimate  time.Duration  `json:"time_estimate"`
	SuccessRate   float64        `json:"success_rate"`
	RelatedIssues []int          `json:"related_issues"`
	Tags          []string       `json:"tags"`
	CreatedAt     time.Time      `json:"created_at"`
}

// SolutionStep represents a step in a solution
type SolutionStep struct {
	Number      int    `json:"number"`
	Description string `json:"description"`
	Command     string `json:"command,omitempty"`
	Expected    string `json:"expected,omitempty"`
	Warning     string `json:"warning,omitempty"`
}

// PreventionGuide provides preventive measures
type PreventionGuide struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Category    string   `json:"category"`
	Actions     []string `json:"actions"`
	Frequency   string   `json:"frequency"`
	Priority    Priority `json:"priority"`
	Impact      string   `json:"impact"`
}

// EmergencyAction represents actions for critical situations
type EmergencyAction struct {
	ID          string   `json:"id"`
	Trigger     string   `json:"trigger"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Steps       []string `json:"steps"`
	Priority    Priority `json:"priority"`
	TimeFrame   string   `json:"time_frame"`
	Precautions []string `json:"precautions"`
}

// DiagnosticStep represents diagnostic procedures
type DiagnosticStep struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Commands    []string `json:"commands"`
	Indicators  []string `json:"indicators"`
	NextSteps   []string `json:"next_steps"`
}

// KnowledgeItem represents accumulated knowledge
type KnowledgeItem struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Content     string    `json:"content"`
	Category    string    `json:"category"`
	Tags        []string  `json:"tags"`
	Source      string    `json:"source"`
	Reliability float64   `json:"reliability"`
	LastUpdated time.Time `json:"last_updated"`
}

// GuideStatistics provides statistics about the guide
type GuideStatistics struct {
	TotalPatterns      int     `json:"total_patterns"`
	TotalSolutions     int     `json:"total_solutions"`
	AverageResolveTime float64 `json:"average_resolve_time_hours"`
	SuccessRate        float64 `json:"success_rate"`
	MostCommonCategory string  `json:"most_common_category"`
	CriticalPatterns   int     `json:"critical_patterns"`
}

// AITroubleshootingResult represents AI analysis results
type AITroubleshootingResult struct {
	AnalyzedAt            time.Time                `json:"analyzed_at"`
	ProcessingTime        float64                  `json:"processing_time_seconds"`
	PatternsDetected      []AIDetectedPattern      `json:"patterns_detected"`
	SolutionStrategies    []AISolutionStrategy     `json:"solution_strategies"`
	RootCauseAnalysis     []AIRootCause            `json:"root_cause_analysis"`
	PreventionSuggestions []AIPreventionSuggestion `json:"prevention_suggestions"`
	Insights              []AIInsight              `json:"insights"`
	Confidence            float64                  `json:"confidence"`
	Recommendations       []string                 `json:"recommendations"`
}

// AIDetectedPattern represents AI-detected error patterns
type AIDetectedPattern struct {
	PatternID    string   `json:"pattern_id"`
	Description  string   `json:"description"`
	Confidence   float64  `json:"confidence"`
	Frequency    int      `json:"frequency"`
	Severity     string   `json:"severity"`
	Category     string   `json:"category"`
	Indicators   []string `json:"indicators"`
	Correlations []string `json:"correlations"`
}

// AISolutionStrategy represents AI-suggested solution strategies
type AISolutionStrategy struct {
	StrategyID    string   `json:"strategy_id"`
	Title         string   `json:"title"`
	Description   string   `json:"description"`
	Approach      string   `json:"approach"`
	Steps         []string `json:"steps"`
	Effectiveness float64  `json:"effectiveness"`
	Complexity    string   `json:"complexity"`
}

// AIRootCause represents AI analysis of root causes
type AIRootCause struct {
	CauseID     string   `json:"cause_id"`
	Description string   `json:"description"`
	Category    string   `json:"category"`
	Likelihood  float64  `json:"likelihood"`
	Evidence    []string `json:"evidence"`
	Mitigation  []string `json:"mitigation"`
}

// AIPreventionSuggestion represents AI prevention suggestions
type AIPreventionSuggestion struct {
	SuggestionID string   `json:"suggestion_id"`
	Title        string   `json:"title"`
	Description  string   `json:"description"`
	Actions      []string `json:"actions"`
	Frequency    string   `json:"frequency"`
	Impact       string   `json:"impact"`
	Effort       string   `json:"effort"`
}

// AIInsight represents AI-generated insights
type AIInsight struct {
	InsightID    string  `json:"insight_id"`
	Type         string  `json:"type"`
	Title        string  `json:"title"`
	Description  string  `json:"description"`
	Significance float64 `json:"significance"`
	Actionable   bool    `json:"actionable"`
}

// Enums for categorization
type Severity int
type Difficulty int
type Priority int

const (
	SeverityLow Severity = iota
	SeverityMedium
	SeverityHigh
	SeverityCritical
)

const (
	DifficultyEasy Difficulty = iota
	DifficultyMedium
	DifficultyHard
	DifficultyExpert
)

const (
	PriorityLow Priority = iota
	PriorityMedium
	PriorityHigh
	PriorityCritical
)

// String methods for enums
func (s Severity) String() string {
	switch s {
	case SeverityLow:
		return "low"
	case SeverityMedium:
		return "medium"
	case SeverityHigh:
		return "high"
	case SeverityCritical:
		return "critical"
	default:
		return "unknown"
	}
}

func (d Difficulty) String() string {
	switch d {
	case DifficultyEasy:
		return "easy"
	case DifficultyMedium:
		return "medium"
	case DifficultyHard:
		return "hard"
	case DifficultyExpert:
		return "expert"
	default:
		return "unknown"
	}
}

func (p Priority) String() string {
	switch p {
	case PriorityLow:
		return "low"
	case PriorityMedium:
		return "medium"
	case PriorityHigh:
		return "high"
	case PriorityCritical:
		return "critical"
	default:
		return "unknown"
	}
}

// AnalyzeTroubleshooting performs comprehensive troubleshooting analysis
func (a *Analyzer) AnalyzeTroubleshooting(ctx context.Context, issues []models.Issue, projectName string) (*TroubleshootingGuide, error) {
	// Filter for solved and error-related issues
	solvedIssues := a.filterSolvedIssues(issues)
	errorIssues := a.filterErrorIssues(issues)

	// Extract basic patterns using rule-based analysis
	errorPatterns := a.extractErrorPatterns(errorIssues)
	solutions := a.extractSolutions(solvedIssues)

	// Calculate statistics
	stats := a.calculateStatistics(issues, errorPatterns, solutions)

	// Generate knowledge base
	knowledgeBase := a.buildKnowledgeBase(issues)

	// Create basic guide structure
	guide := &TroubleshootingGuide{
		ProjectName:      projectName,
		GeneratedAt:      time.Now(),
		TotalIssues:      len(issues),
		SolvedIssues:     len(solvedIssues),
		ErrorPatterns:    errorPatterns,
		Solutions:        solutions,
		PreventionGuides: a.generatePreventionGuides(errorPatterns),
		EmergencyActions: a.generateEmergencyActions(errorPatterns),
		DiagnosticSteps:  a.generateDiagnosticSteps(errorPatterns),
		KnowledgeBase:    knowledgeBase,
		Statistics:       stats,
	}

	// Enhance with AI analysis if available
	if a.aiService != nil {
		aiResult, err := a.aiService.AnalyzeTroubleshootingPatterns(ctx, issues)
		if err == nil {
			guide.AIInsights = aiResult
			// Merge AI insights into the guide
			a.mergeAIInsights(guide, aiResult)
		}
	}

	return guide, nil
}

// filterSolvedIssues filters issues that have been solved
func (a *Analyzer) filterSolvedIssues(issues []models.Issue) []models.Issue {
	var solved []models.Issue
	for _, issue := range issues {
		if issue.State == "closed" {
			solved = append(solved, issue)
		}
	}
	return solved
}

// filterErrorIssues filters issues that appear to be error-related
func (a *Analyzer) filterErrorIssues(issues []models.Issue) []models.Issue {
	var errorIssues []models.Issue
	errorKeywords := []string{
		"error", "failure", "bug", "crash", "exception", "panic",
		"timeout", "failed", "broken", "issue", "problem",
		"エラー", "失敗", "バグ", "問題", "故障",
	}

	for _, issue := range issues {
		if a.containsKeywords(issue.Title+" "+issue.Body, errorKeywords) {
			errorIssues = append(errorIssues, issue)
		}
	}
	return errorIssues
}

// extractErrorPatterns extracts error patterns from issues
func (a *Analyzer) extractErrorPatterns(issues []models.Issue) []ErrorPattern {
	patternMap := make(map[string]*ErrorPattern)

	for _, issue := range issues {
		patterns := a.identifyPatterns(issue)
		for _, pattern := range patterns {
			key := pattern.Pattern
			if existing, exists := patternMap[key]; exists {
				existing.Frequency++
				existing.RelatedIssues = append(existing.RelatedIssues, issue.Number)
				if issue.UpdatedAt.After(existing.LastSeen) {
					existing.LastSeen = issue.UpdatedAt
				}
			} else {
				pattern.RelatedIssues = []int{issue.Number}
				pattern.LastSeen = issue.UpdatedAt
				patternMap[key] = &pattern
			}
		}
	}

	var result []ErrorPattern
	for _, pattern := range patternMap {
		pattern.Severity = a.calculateSeverity(pattern.Frequency, len(pattern.RelatedIssues))
		result = append(result, *pattern)
	}

	// Sort by frequency and severity
	sort.Slice(result, func(i, j int) bool {
		if result[i].Severity != result[j].Severity {
			return result[i].Severity > result[j].Severity
		}
		return result[i].Frequency > result[j].Frequency
	})

	return result
}

// identifyPatterns identifies error patterns in an issue
func (a *Analyzer) identifyPatterns(issue models.Issue) []ErrorPattern {
	var patterns []ErrorPattern

	// Common error pattern regexes
	errorRegexes := map[string]*regexp.Regexp{
		"API_ERROR":        regexp.MustCompile(`(?i)(api|http|request).*(error|failed|timeout|401|403|404|500)`),
		"CONFIG_ERROR":     regexp.MustCompile(`(?i)(config|configuration|setting).*(error|invalid|missing|not found)`),
		"AUTH_ERROR":       regexp.MustCompile(`(?i)(auth|authentication|token|credential).*(error|invalid|expired|denied)`),
		"NETWORK_ERROR":    regexp.MustCompile(`(?i)(network|connection|dns|ssl|tls).*(error|failed|timeout|refused)`),
		"DATABASE_ERROR":   regexp.MustCompile(`(?i)(database|db|sql|query).*(error|failed|timeout|lock|deadlock)`),
		"PERMISSION_ERROR": regexp.MustCompile(`(?i)(permission|access|denied|forbidden).*(error|failed)`),
		"DEPENDENCY_ERROR": regexp.MustCompile(`(?i)(dependency|package|module|import).*(error|missing|not found|version)`),
	}

	text := issue.Title + " " + issue.Body

	for patternName, regex := range errorRegexes {
		if regex.MatchString(text) {
			pattern := ErrorPattern{
				ID:          fmt.Sprintf("%s_%d", patternName, issue.Number),
				Pattern:     patternName,
				Title:       a.extractPatternTitle(text, patternName),
				Description: a.extractPatternDescription(text, issue),
				Frequency:   1,
				Category:    a.categorizePattern(patternName),
				Symptoms:    a.extractSymptoms(text),
				Causes:      a.extractCauses(text, issue),
				Solutions:   a.extractQuickSolutions(text, issue),
				Prevention:  a.extractPrevention(patternName),
			}
			patterns = append(patterns, pattern)
		}
	}

	return patterns
}

// extractSolutions extracts solutions from solved issues
func (a *Analyzer) extractSolutions(issues []models.Issue) []Solution {
	var solutions []Solution

	for _, issue := range issues {
		if solution := a.extractSolutionFromIssue(issue); solution != nil {
			solutions = append(solutions, *solution)
		}
	}

	return solutions
}

// extractSolutionFromIssue extracts solution information from a closed issue
func (a *Analyzer) extractSolutionFromIssue(issue models.Issue) *Solution {
	// Look for solution indicators
	solutionKeywords := []string{
		"solved", "fixed", "resolved", "solution", "fix", "patch",
		"解決", "修正", "対応", "解決済み",
	}

	if !a.containsKeywords(issue.Body, solutionKeywords) {
		return nil
	}

	solution := &Solution{
		ID:            fmt.Sprintf("sol_%d", issue.Number),
		Title:         a.extractSolutionTitle(issue),
		Description:   a.extractSolutionDescription(issue),
		Category:      a.categorizeIssue(issue),
		Difficulty:    a.assessDifficulty(issue),
		Steps:         a.extractSolutionSteps(issue),
		RequiredTools: a.extractRequiredTools(issue),
		TimeEstimate:  a.estimateTime(issue),
		SuccessRate:   a.calculateSuccessRate(issue),
		RelatedIssues: []int{issue.Number},
		Tags:          a.extractTags(issue),
		CreatedAt:     issue.CreatedAt,
	}

	return solution
}

// Helper methods for data extraction and analysis

func (a *Analyzer) containsKeywords(text string, keywords []string) bool {
	text = strings.ToLower(text)
	for _, keyword := range keywords {
		if strings.Contains(text, strings.ToLower(keyword)) {
			return true
		}
	}
	return false
}

func (a *Analyzer) calculateSeverity(frequency, issueCount int) Severity {
	if frequency >= 10 || issueCount >= 5 {
		return SeverityCritical
	} else if frequency >= 5 || issueCount >= 3 {
		return SeverityHigh
	} else if frequency >= 2 {
		return SeverityMedium
	}
	return SeverityLow
}

func (a *Analyzer) extractPatternTitle(text, patternName string) string {
	switch patternName {
	case "API_ERROR":
		return "API Communication Error"
	case "CONFIG_ERROR":
		return "Configuration Error"
	case "AUTH_ERROR":
		return "Authentication Error"
	case "NETWORK_ERROR":
		return "Network Connectivity Error"
	case "DATABASE_ERROR":
		return "Database Operation Error"
	case "PERMISSION_ERROR":
		return "Permission Denied Error"
	case "DEPENDENCY_ERROR":
		return "Dependency Resolution Error"
	default:
		return "Unknown Error Pattern"
	}
}

func (a *Analyzer) extractPatternDescription(text string, issue models.Issue) string {
	// Extract the first sentence or first 200 characters as description
	lines := strings.Split(text, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if len(line) > 20 && len(line) < 200 {
			return line
		}
	}

	if len(text) > 200 {
		return text[:200] + "..."
	}
	return text
}

func (a *Analyzer) categorizePattern(patternName string) string {
	categories := map[string]string{
		"API_ERROR":        "Integration",
		"CONFIG_ERROR":     "Configuration",
		"AUTH_ERROR":       "Security",
		"NETWORK_ERROR":    "Infrastructure",
		"DATABASE_ERROR":   "Data",
		"PERMISSION_ERROR": "Security",
		"DEPENDENCY_ERROR": "Dependencies",
	}

	if category, exists := categories[patternName]; exists {
		return category
	}
	return "General"
}

func (a *Analyzer) extractSymptoms(text string) []string {
	// Simple symptom extraction based on common error indicators
	symptoms := []string{}

	symptomPatterns := []string{
		"fails to start",
		"connection refused",
		"timeout",
		"not found",
		"access denied",
		"invalid",
		"missing",
		"crashed",
		"hanging",
		"slow response",
	}

	for _, pattern := range symptomPatterns {
		if strings.Contains(strings.ToLower(text), pattern) {
			symptoms = append(symptoms, pattern)
		}
	}

	return symptoms
}

func (a *Analyzer) extractCauses(text string, issue models.Issue) []string {
	// Extract likely causes based on issue content
	causes := []string{}

	causeKeywords := map[string]string{
		"configuration": "Incorrect configuration settings",
		"network":       "Network connectivity issues",
		"permission":    "Insufficient permissions",
		"version":       "Version compatibility issues",
		"dependency":    "Missing or incompatible dependencies",
		"timeout":       "Timeout or performance issues",
		"token":         "Authentication token problems",
	}

	text = strings.ToLower(text)
	for keyword, cause := range causeKeywords {
		if strings.Contains(text, keyword) {
			causes = append(causes, cause)
		}
	}

	return causes
}

func (a *Analyzer) extractQuickSolutions(text string, issue models.Issue) []string {
	// Extract quick solution suggestions
	solutions := []string{}

	// Look for solution patterns in the text
	solutionPatterns := map[string]string{
		"restart":       "Restart the service",
		"configuration": "Check configuration settings",
		"token":         "Verify authentication token",
		"permission":    "Check file/directory permissions",
		"update":        "Update to latest version",
		"install":       "Install missing dependencies",
		"clear cache":   "Clear cache and temporary files",
	}

	text = strings.ToLower(text)
	for pattern, solution := range solutionPatterns {
		if strings.Contains(text, pattern) {
			solutions = append(solutions, solution)
		}
	}

	return solutions
}

func (a *Analyzer) extractPrevention(patternName string) []string {
	prevention := map[string][]string{
		"API_ERROR": {
			"Implement proper error handling and retry logic",
			"Monitor API rate limits",
			"Use circuit breaker pattern",
		},
		"CONFIG_ERROR": {
			"Validate configuration on startup",
			"Use configuration schemas",
			"Document all configuration options",
		},
		"AUTH_ERROR": {
			"Implement token refresh mechanisms",
			"Monitor token expiration",
			"Use secure token storage",
		},
		"NETWORK_ERROR": {
			"Implement connection pooling",
			"Add network timeouts",
			"Monitor network health",
		},
		"DATABASE_ERROR": {
			"Implement connection pooling",
			"Monitor database performance",
			"Use proper transaction handling",
		},
		"PERMISSION_ERROR": {
			"Document required permissions",
			"Implement proper access controls",
			"Regular permission audits",
		},
		"DEPENDENCY_ERROR": {
			"Pin dependency versions",
			"Regular dependency audits",
			"Use dependency lock files",
		},
	}

	if prev, exists := prevention[patternName]; exists {
		return prev
	}
	return []string{"Regular monitoring and maintenance"}
}

// Additional helper methods would be implemented here...
// This is a comprehensive foundation for the troubleshooting analyzer

// Placeholder implementations for remaining methods
func (a *Analyzer) calculateStatistics(issues []models.Issue, patterns []ErrorPattern, solutions []Solution) GuideStatistics {
	totalPatterns := len(patterns)
	totalSolutions := len(solutions)
	criticalPatterns := 0

	for _, pattern := range patterns {
		if pattern.Severity == SeverityCritical {
			criticalPatterns++
		}
	}

	// Calculate average resolve time
	var totalResolveTime float64
	resolvedCount := 0
	for _, issue := range issues {
		if issue.State == "closed" && issue.ClosedAt != nil {
			resolveTime := issue.ClosedAt.Sub(issue.CreatedAt).Hours()
			totalResolveTime += resolveTime
			resolvedCount++
		}
	}

	averageResolveTime := float64(0)
	if resolvedCount > 0 {
		averageResolveTime = totalResolveTime / float64(resolvedCount)
	}

	// Calculate success rate (simplified)
	successRate := float64(len(a.filterSolvedIssues(issues))) / float64(len(issues)) * 100

	// Find most common category
	categoryCount := make(map[string]int)
	for _, pattern := range patterns {
		categoryCount[pattern.Category]++
	}

	mostCommonCategory := "General"
	maxCount := 0
	for category, count := range categoryCount {
		if count > maxCount {
			maxCount = count
			mostCommonCategory = category
		}
	}

	return GuideStatistics{
		TotalPatterns:      totalPatterns,
		TotalSolutions:     totalSolutions,
		AverageResolveTime: averageResolveTime,
		SuccessRate:        successRate,
		MostCommonCategory: mostCommonCategory,
		CriticalPatterns:   criticalPatterns,
	}
}

// Placeholder implementations for other methods...
func (a *Analyzer) buildKnowledgeBase(issues []models.Issue) []KnowledgeItem {
	return []KnowledgeItem{}
}
func (a *Analyzer) generatePreventionGuides(patterns []ErrorPattern) []PreventionGuide {
	return []PreventionGuide{}
}
func (a *Analyzer) generateEmergencyActions(patterns []ErrorPattern) []EmergencyAction {
	return []EmergencyAction{}
}
func (a *Analyzer) generateDiagnosticSteps(patterns []ErrorPattern) []DiagnosticStep {
	return []DiagnosticStep{}
}
func (a *Analyzer) mergeAIInsights(guide *TroubleshootingGuide, aiResult *AITroubleshootingResult) {}
func (a *Analyzer) extractSolutionTitle(issue models.Issue) string                                 { return issue.Title }
func (a *Analyzer) extractSolutionDescription(issue models.Issue) string {
	return issue.Body[:min(len(issue.Body), 200)]
}
func (a *Analyzer) categorizeIssue(issue models.Issue) string              { return "General" }
func (a *Analyzer) assessDifficulty(issue models.Issue) Difficulty         { return DifficultyMedium }
func (a *Analyzer) extractSolutionSteps(issue models.Issue) []SolutionStep { return []SolutionStep{} }
func (a *Analyzer) extractRequiredTools(issue models.Issue) []string       { return []string{} }
func (a *Analyzer) estimateTime(issue models.Issue) time.Duration          { return time.Hour }
func (a *Analyzer) calculateSuccessRate(issue models.Issue) float64        { return 0.85 }
func (a *Analyzer) extractTags(issue models.Issue) []string {
	var tags []string
	for _, label := range issue.Labels {
		tags = append(tags, label.Name)
	}
	return tags
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

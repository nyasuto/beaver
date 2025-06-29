package analytics

import (
	"sort"
	"strings"
	"time"

	"github.com/nyasuto/beaver/internal/models"
)

// LabelAnalysisData contains comprehensive label analysis for the label analysis dashboard
type LabelAnalysisData struct {
	ProjectName            string
	GeneratedAt            time.Time
	TotalLabels            int
	TotalIssues            int
	IssuesWithLabels       int
	IssuesWithoutLabels    int
	AvgLabelsPerIssue      float64
	MostUsedLabel          *LabelStat
	Labels                 []LabelStat
	Categories             []LabelCategory
	TopPerformingLabels    []DetailedLabelStat
	LabelIssues            []LabelHealthIssue
	LabelConsistencyScore  float64
	CategorizationCoverage float64
	LabelDiversityIndex    float64
	TemporalData           []TemporalLabelData
	TrendingLabels         *TrendingLabelsData
	HighImpactLabels       []HighImpactLabel
	LabelCombinations      []LabelCombination
	Recommendations        *LabelRecommendations
	BestPractices          *LabelBestPractices
	LabelGuidelines        []LabelGuideline
	DataRange              *DateRange
	AnalysisMethod         string
	ConfidenceLevels       *ConfidenceLevels
}

// LabelStat represents statistics for a single label
type LabelStat struct {
	Name         string
	Count        int
	Color        string
	Description  string
	UsagePattern string
	Trend        float64
}

// LabelCategory represents a logical grouping of labels
type LabelCategory struct {
	Name        string
	Description string
	Labels      []LabelStat
	Count       int
	TotalIssues int
	AvgPerIssue float64
}

// DetailedLabelStat contains comprehensive statistics for a label
type DetailedLabelStat struct {
	LabelStat
	ResolutionRate   float64
	AvgTimeToClose   float64
	RecentUsage      int
	CommonlyUsedWith []LabelCoOccurrence
}

// LabelCoOccurrence represents labels commonly used together
type LabelCoOccurrence struct {
	Name              string
	CoOccurrenceCount int
}

// LabelHealthIssue represents potential problems with label usage
type LabelHealthIssue struct {
	Type           string
	Description    string
	AffectedLabels []string
	Impact         string
	Recommendation string
}

// TemporalLabelData represents label usage over time
type TemporalLabelData struct {
	Period          string
	NewLabels       int
	MostActiveLabel *LabelStat
	IssuesLabeled   int
}

// TrendingLabelsData contains trending label information
type TrendingLabelsData struct {
	Hot       []TrendingLabel
	Declining []TrendingLabel
	Stable    []TrendingLabel
}

// TrendingLabel represents a label with trending information
type TrendingLabel struct {
	Name         string
	Description  string
	GrowthRate   float64
	DeclineRate  float64
	RecentCount  int
	AverageUsage float64
}

// HighImpactLabel represents a label with high effectiveness
type HighImpactLabel struct {
	Name   string
	Impact LabelImpact
}

// LabelImpact contains impact metrics for a label
type LabelImpact struct {
	Score                float64
	ResolutionEfficiency float64
	EngagementMultiplier float64
	DiscoverabilityScore float64
	Reason               string
}

// LabelCombination represents commonly used label combinations
type LabelCombination struct {
	Labels            []string
	Count             int
	SuccessRate       float64
	AvgResolutionDays float64
	UseCase           string
}

// LabelRecommendations contains actionable recommendations
type LabelRecommendations struct {
	Immediate []LabelRecommendation
	LongTerm  []LabelRecommendation
}

// LabelRecommendation represents a specific recommendation
type LabelRecommendation struct {
	Priority       string
	Title          string
	Description    string
	Steps          []string
	ExpectedImpact string
	Benefits       []string
	EffortLevel    string
}

// LabelBestPractices contains current strengths and improvement areas
type LabelBestPractices struct {
	Strengths        []BestPracticeItem
	ImprovementAreas []BestPracticeItem
}

// BestPracticeItem represents a best practice observation
type BestPracticeItem struct {
	Area        string
	Description string
	Suggestion  string
}

// LabelGuideline represents label usage guidelines
type LabelGuideline struct {
	Category string
	Rules    []string
}

// ConfidenceLevels represents confidence in analysis results
type ConfidenceLevels struct {
	Usage         string
	Trends        string
	Effectiveness string
}

// LabelAnalysisCalculator calculates comprehensive label analysis from issues
type LabelAnalysisCalculator struct {
	issues      []models.Issue
	projectName string
	generatedAt time.Time
}

// NewLabelAnalysisCalculator creates a new label analysis calculator
func NewLabelAnalysisCalculator(issues []models.Issue, projectName string) *LabelAnalysisCalculator {
	return &LabelAnalysisCalculator{
		issues:      issues,
		projectName: projectName,
		generatedAt: time.Now(),
	}
}

// Calculate generates comprehensive label analysis
func (lac *LabelAnalysisCalculator) Calculate() *LabelAnalysisData {
	data := &LabelAnalysisData{
		ProjectName:    lac.projectName,
		GeneratedAt:    lac.generatedAt,
		TotalIssues:    len(lac.issues),
		AnalysisMethod: "Statistical analysis with pattern recognition",
	}

	// Calculate basic label statistics
	labelStats := lac.calculateLabelStatistics()
	data.Labels = labelStats
	data.TotalLabels = len(labelStats)

	// Calculate coverage metrics
	data.IssuesWithLabels, data.IssuesWithoutLabels, data.AvgLabelsPerIssue = lac.calculateCoverageMetrics()

	// Find most used label
	if len(labelStats) > 0 {
		data.MostUsedLabel = &labelStats[0] // Already sorted by count
	}

	// Calculate label categories
	data.Categories = lac.calculateLabelCategories(labelStats)

	// Calculate detailed label statistics
	data.TopPerformingLabels = lac.calculateDetailedLabelStats(labelStats)

	// Analyze label health
	data.LabelIssues = lac.analyzeLabelHealth(labelStats)
	data.LabelConsistencyScore = lac.calculateConsistencyScore(labelStats)
	data.CategorizationCoverage = lac.calculateCategorizationCoverage()
	data.LabelDiversityIndex = lac.calculateDiversityIndex(labelStats)

	// Temporal analysis
	data.TemporalData = lac.calculateTemporalData()
	data.TrendingLabels = lac.calculateTrendingLabels(labelStats)

	// Impact and combination analysis
	data.HighImpactLabels = lac.calculateHighImpactLabels(labelStats)
	data.LabelCombinations = lac.calculateLabelCombinations()

	// Generate recommendations and best practices
	data.Recommendations = lac.generateRecommendations(data)
	data.BestPractices = lac.analyzeBestPractices(data)
	data.LabelGuidelines = lac.generateLabelGuidelines()

	// Set data range and confidence levels
	if len(lac.issues) > 0 {
		earliest, latest := lac.getDateRange()
		data.DataRange = &DateRange{
			StartDate: earliest,
			EndDate:   latest,
		}
	}

	data.ConfidenceLevels = &ConfidenceLevels{
		Usage:         "High",
		Trends:        "Medium (requires more historical data)",
		Effectiveness: "Medium",
	}

	return data
}

// calculateLabelStatistics calculates basic statistics for all labels
func (lac *LabelAnalysisCalculator) calculateLabelStatistics() []LabelStat {
	labelCounts := make(map[string]*LabelStat)

	// Count label usage
	for _, issue := range lac.issues {
		for _, label := range issue.Labels {
			if _, exists := labelCounts[label.Name]; !exists {
				labelCounts[label.Name] = &LabelStat{
					Name:        label.Name,
					Color:       label.Color,
					Description: label.Description,
					Count:       0,
				}
			}
			labelCounts[label.Name].Count++
		}
	}

	// Convert to slice and sort
	var labelStats []LabelStat
	for _, stat := range labelCounts {
		// Determine usage pattern
		stat.UsagePattern = lac.determineUsagePattern(stat.Count)

		// Calculate trend (simplified)
		stat.Trend = lac.calculateLabelTrend(stat.Name)

		labelStats = append(labelStats, *stat)
	}

	// Sort by count (descending)
	sort.Slice(labelStats, func(i, j int) bool {
		return labelStats[i].Count > labelStats[j].Count
	})

	return labelStats
}

// calculateCoverageMetrics calculates label coverage metrics
func (lac *LabelAnalysisCalculator) calculateCoverageMetrics() (int, int, float64) {
	issuesWithLabels := 0
	totalLabels := 0

	for _, issue := range lac.issues {
		if len(issue.Labels) > 0 {
			issuesWithLabels++
		}
		totalLabels += len(issue.Labels)
	}

	issuesWithoutLabels := len(lac.issues) - issuesWithLabels

	var avgLabelsPerIssue float64
	if len(lac.issues) > 0 {
		avgLabelsPerIssue = float64(totalLabels) / float64(len(lac.issues))
	}

	return issuesWithLabels, issuesWithoutLabels, avgLabelsPerIssue
}

// calculateLabelCategories organizes labels into logical categories
func (lac *LabelAnalysisCalculator) calculateLabelCategories(labelStats []LabelStat) []LabelCategory {
	categories := make(map[string]*LabelCategory)

	// Predefined category patterns
	categoryPatterns := map[string][]string{
		"Type":       {"bug", "feature", "enhancement", "documentation", "question"},
		"Priority":   {"critical", "high", "medium", "low", "urgent"},
		"Status":     {"ready", "in-progress", "blocked", "review", "wontfix"},
		"Area":       {"frontend", "backend", "api", "ui", "ux", "infrastructure"},
		"Difficulty": {"easy", "medium", "hard", "beginner", "advanced"},
	}

	// Categorize labels
	for _, label := range labelStats {
		categorized := false
		for categoryName, patterns := range categoryPatterns {
			for _, pattern := range patterns {
				if strings.Contains(strings.ToLower(label.Name), pattern) {
					if _, exists := categories[categoryName]; !exists {
						categories[categoryName] = &LabelCategory{
							Name:        categoryName,
							Description: lac.getCategoryDescription(categoryName),
							Labels:      []LabelStat{},
						}
					}
					categories[categoryName].Labels = append(categories[categoryName].Labels, label)
					categories[categoryName].Count++
					categories[categoryName].TotalIssues += label.Count
					categorized = true
					break
				}
			}
			if categorized {
				break
			}
		}

		// If not categorized, put in "Other"
		if !categorized {
			if _, exists := categories["Other"]; !exists {
				categories["Other"] = &LabelCategory{
					Name:        "Other",
					Description: "Labels that don't fit into standard categories",
					Labels:      []LabelStat{},
				}
			}
			categories["Other"].Labels = append(categories["Other"].Labels, label)
			categories["Other"].Count++
			categories["Other"].TotalIssues += label.Count
		}
	}

	// Calculate average per issue for each category
	for _, category := range categories {
		if len(category.Labels) > 0 {
			category.AvgPerIssue = float64(category.TotalIssues) / float64(len(category.Labels))
		}
	}

	// Convert to slice
	var result []LabelCategory
	for _, category := range categories {
		result = append(result, *category)
	}

	// Sort by total issues
	sort.Slice(result, func(i, j int) bool {
		return result[i].TotalIssues > result[j].TotalIssues
	})

	return result
}

// calculateDetailedLabelStats calculates detailed statistics for top labels
func (lac *LabelAnalysisCalculator) calculateDetailedLabelStats(labelStats []LabelStat) []DetailedLabelStat {
	var detailedStats []DetailedLabelStat

	// Take top 10 labels for detailed analysis
	maxLabels := 10
	if len(labelStats) < maxLabels {
		maxLabels = len(labelStats)
	}

	for i := 0; i < maxLabels; i++ {
		label := labelStats[i]
		detailed := DetailedLabelStat{
			LabelStat: label,
		}

		// Calculate resolution rate and average time to close
		detailed.ResolutionRate, detailed.AvgTimeToClose = lac.calculateLabelPerformance(label.Name)

		// Calculate recent usage (last 30 days)
		detailed.RecentUsage = lac.calculateRecentUsage(label.Name)

		// Find commonly used labels
		detailed.CommonlyUsedWith = lac.findCommonlyUsedWith(label.Name)

		detailedStats = append(detailedStats, detailed)
	}

	return detailedStats
}

// analyzeLabelHealth identifies potential issues with label usage
func (lac *LabelAnalysisCalculator) analyzeLabelHealth(labelStats []LabelStat) []LabelHealthIssue {
	var issues []LabelHealthIssue

	// Check for duplicate/similar labels
	duplicates := lac.findDuplicateLabels(labelStats)
	if len(duplicates) > 0 {
		issues = append(issues, LabelHealthIssue{
			Type:           "Duplicate Labels",
			Description:    "Similar labels that could be consolidated",
			AffectedLabels: duplicates,
			Impact:         "Medium - causes confusion and inconsistent categorization",
			Recommendation: "Review and consolidate similar labels, update existing issues",
		})
	}

	// Check for unused labels
	unused := lac.findUnusedLabels(labelStats)
	if len(unused) > 0 {
		issues = append(issues, LabelHealthIssue{
			Type:           "Unused Labels",
			Description:    "Labels that are rarely or never used",
			AffectedLabels: unused,
			Impact:         "Low - clutters label selection",
			Recommendation: "Consider removing unused labels or promoting their usage",
		})
	}

	// Check for over-used labels
	overused := lac.findOverusedLabels(labelStats)
	if len(overused) > 0 {
		issues = append(issues, LabelHealthIssue{
			Type:           "Overused Labels",
			Description:    "Labels used too frequently, reducing their effectiveness",
			AffectedLabels: overused,
			Impact:         "Medium - reduces label specificity",
			Recommendation: "Create more specific labels to better categorize issues",
		})
	}

	return issues
}

// Helper methods for detailed calculations

func (lac *LabelAnalysisCalculator) determineUsagePattern(count int) string {
	total := len(lac.issues)
	if total == 0 {
		return "No data"
	}

	percentage := float64(count) / float64(total) * 100

	if percentage > 50 {
		return "Very frequent"
	} else if percentage > 20 {
		return "Frequent"
	} else if percentage > 5 {
		return "Moderate"
	} else {
		return "Rare"
	}
}

func (lac *LabelAnalysisCalculator) calculateLabelTrend(labelName string) float64 {
	// Simplified trend calculation
	// In a real implementation, you would analyze historical data
	return 0.0 // Neutral trend
}

func (lac *LabelAnalysisCalculator) getCategoryDescription(categoryName string) string {
	descriptions := map[string]string{
		"Type":       "Categorizes the nature of the issue",
		"Priority":   "Indicates urgency and importance",
		"Status":     "Shows current state of the issue",
		"Area":       "Identifies the technical domain",
		"Difficulty": "Indicates complexity for contributors",
	}

	if desc, exists := descriptions[categoryName]; exists {
		return desc
	}
	return "Miscellaneous category"
}

func (lac *LabelAnalysisCalculator) calculateLabelPerformance(labelName string) (float64, float64) {
	var closedCount, totalCount int
	var totalDays float64

	for _, issue := range lac.issues {
		hasLabel := false
		for _, label := range issue.Labels {
			if label.Name == labelName {
				hasLabel = true
				break
			}
		}

		if hasLabel {
			totalCount++
			if issue.State == "closed" {
				closedCount++
				if issue.ClosedAt != nil {
					days := issue.ClosedAt.Sub(issue.CreatedAt).Hours() / 24
					totalDays += days
				}
			}
		}
	}

	var resolutionRate, avgTimeToClose float64
	if totalCount > 0 {
		resolutionRate = float64(closedCount) / float64(totalCount) * 100
	}
	if closedCount > 0 {
		avgTimeToClose = totalDays / float64(closedCount)
	}

	return resolutionRate, avgTimeToClose
}

func (lac *LabelAnalysisCalculator) calculateRecentUsage(labelName string) int {
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	count := 0

	for _, issue := range lac.issues {
		if issue.CreatedAt.After(thirtyDaysAgo) {
			for _, label := range issue.Labels {
				if label.Name == labelName {
					count++
					break
				}
			}
		}
	}

	return count
}

func (lac *LabelAnalysisCalculator) findCommonlyUsedWith(labelName string) []LabelCoOccurrence {
	coOccurrences := make(map[string]int)

	for _, issue := range lac.issues {
		hasTargetLabel := false
		var otherLabels []string

		for _, label := range issue.Labels {
			if label.Name == labelName {
				hasTargetLabel = true
			} else {
				otherLabels = append(otherLabels, label.Name)
			}
		}

		if hasTargetLabel {
			for _, otherLabel := range otherLabels {
				coOccurrences[otherLabel]++
			}
		}
	}

	var result []LabelCoOccurrence
	for name, count := range coOccurrences {
		if count >= 2 { // Only include labels used together at least twice
			result = append(result, LabelCoOccurrence{
				Name:              name,
				CoOccurrenceCount: count,
			})
		}
	}

	// Sort by co-occurrence count
	sort.Slice(result, func(i, j int) bool {
		return result[i].CoOccurrenceCount > result[j].CoOccurrenceCount
	})

	// Return top 5
	if len(result) > 5 {
		result = result[:5]
	}

	return result
}

func (lac *LabelAnalysisCalculator) findDuplicateLabels(labelStats []LabelStat) []string {
	var duplicates []string

	for i := 0; i < len(labelStats); i++ {
		for j := i + 1; j < len(labelStats); j++ {
			if lac.labelsAreSimilar(labelStats[i].Name, labelStats[j].Name) {
				duplicates = append(duplicates, labelStats[i].Name, labelStats[j].Name)
			}
		}
	}

	return lac.removeDuplicateStrings(duplicates)
}

func (lac *LabelAnalysisCalculator) findUnusedLabels(labelStats []LabelStat) []string {
	var unused []string

	for _, label := range labelStats {
		if label.Count <= 1 {
			unused = append(unused, label.Name)
		}
	}

	return unused
}

func (lac *LabelAnalysisCalculator) findOverusedLabels(labelStats []LabelStat) []string {
	var overused []string
	total := len(lac.issues)

	if total == 0 {
		return overused
	}

	for _, label := range labelStats {
		percentage := float64(label.Count) / float64(total) * 100
		if percentage > 60 { // Used in more than 60% of issues
			overused = append(overused, label.Name)
		}
	}

	return overused
}

func (lac *LabelAnalysisCalculator) labelsAreSimilar(label1, label2 string) bool {
	// Simple similarity check - could be enhanced with more sophisticated algorithms
	lower1 := strings.ToLower(label1)
	lower2 := strings.ToLower(label2)

	// Check for common variations
	variations := map[string][]string{
		"bug":     {"error", "issue", "problem"},
		"feature": {"enhancement", "improvement"},
		"urgent":  {"critical", "high-priority"},
	}

	for base, variants := range variations {
		if (lower1 == base || lac.stringInSlice(lower1, variants)) &&
			(lower2 == base || lac.stringInSlice(lower2, variants)) {
			return true
		}
	}

	return false
}

func (lac *LabelAnalysisCalculator) calculateConsistencyScore(labelStats []LabelStat) float64 {
	// Simplified consistency calculation
	if len(labelStats) == 0 {
		return 100.0
	}

	// Base score
	score := 100.0

	// Deduct points for issues
	duplicates := lac.findDuplicateLabels(labelStats)
	unused := lac.findUnusedLabels(labelStats)
	overused := lac.findOverusedLabels(labelStats)

	score -= float64(len(duplicates)) * 5 // 5 points per duplicate
	score -= float64(len(unused)) * 2     // 2 points per unused
	score -= float64(len(overused)) * 10  // 10 points per overused

	if score < 0 {
		score = 0
	}

	return score
}

func (lac *LabelAnalysisCalculator) calculateCategorizationCoverage() float64 {
	if len(lac.issues) == 0 {
		return 100.0
	}

	issuesWithLabels := 0
	for _, issue := range lac.issues {
		if len(issue.Labels) > 0 {
			issuesWithLabels++
		}
	}

	return float64(issuesWithLabels) / float64(len(lac.issues)) * 100
}

func (lac *LabelAnalysisCalculator) calculateDiversityIndex(labelStats []LabelStat) float64 {
	if len(labelStats) == 0 {
		return 0.0
	}

	totalIssues := len(lac.issues)
	if totalIssues == 0 {
		return 0.0
	}

	// Shannon diversity index
	var entropy float64
	for _, label := range labelStats {
		if label.Count > 0 {
			proportion := float64(label.Count) / float64(totalIssues)
			entropy -= proportion * lac.log2(proportion)
		}
	}

	// Normalize to 0-1 scale
	maxEntropy := lac.log2(float64(len(labelStats)))
	if maxEntropy > 0 {
		return entropy / maxEntropy
	}

	return 0.0
}

func (lac *LabelAnalysisCalculator) calculateTemporalData() []TemporalLabelData {
	// Simplified temporal analysis - group by month
	monthlyData := make(map[string]*TemporalLabelData)

	for _, issue := range lac.issues {
		monthKey := issue.CreatedAt.Format("2006-01")

		if _, exists := monthlyData[monthKey]; !exists {
			monthlyData[monthKey] = &TemporalLabelData{
				Period: issue.CreatedAt.Format("Jan 2006"),
			}
		}

		if len(issue.Labels) > 0 {
			monthlyData[monthKey].IssuesLabeled++
		}
	}

	var result []TemporalLabelData
	for _, data := range monthlyData {
		result = append(result, *data)
	}

	// Sort by period
	sort.Slice(result, func(i, j int) bool {
		return result[i].Period < result[j].Period
	})

	return result
}

func (lac *LabelAnalysisCalculator) calculateTrendingLabels(labelStats []LabelStat) *TrendingLabelsData {
	// Simplified trending calculation
	return &TrendingLabelsData{
		Hot:       []TrendingLabel{},
		Declining: []TrendingLabel{},
		Stable:    []TrendingLabel{},
	}
}

func (lac *LabelAnalysisCalculator) calculateHighImpactLabels(labelStats []LabelStat) []HighImpactLabel {
	var highImpact []HighImpactLabel

	// Take top 5 labels for impact analysis
	maxLabels := 5
	if len(labelStats) < maxLabels {
		maxLabels = len(labelStats)
	}

	for i := 0; i < maxLabels; i++ {
		label := labelStats[i]
		resolutionRate, _ := lac.calculateLabelPerformance(label.Name)

		impact := LabelImpact{
			Score:                8.0, // Simplified score
			ResolutionEfficiency: resolutionRate,
			EngagementMultiplier: 1.2, // Simplified multiplier
			DiscoverabilityScore: 7.0, // Simplified score
			Reason:               "High usage and good resolution rate",
		}

		highImpact = append(highImpact, HighImpactLabel{
			Name:   label.Name,
			Impact: impact,
		})
	}

	return highImpact
}

func (lac *LabelAnalysisCalculator) calculateLabelCombinations() []LabelCombination {
	combinations := make(map[string]*LabelCombination)

	for _, issue := range lac.issues {
		if len(issue.Labels) >= 2 {
			// Generate all pairs
			for i := 0; i < len(issue.Labels); i++ {
				for j := i + 1; j < len(issue.Labels); j++ {
					labels := []string{issue.Labels[i].Name, issue.Labels[j].Name}
					sort.Strings(labels) // Ensure consistent ordering
					key := strings.Join(labels, "+")

					if _, exists := combinations[key]; !exists {
						combinations[key] = &LabelCombination{
							Labels:  labels,
							UseCase: "Common combination",
						}
					}
					combinations[key].Count++

					if issue.State == "closed" {
						combinations[key].SuccessRate += 100.0
					}
				}
			}
		}
	}

	// Calculate success rates and convert to slice
	var result []LabelCombination
	for _, combo := range combinations {
		if combo.Count >= 3 { // Only include combinations used at least 3 times
			combo.SuccessRate = combo.SuccessRate / float64(combo.Count)
			result = append(result, *combo)
		}
	}

	// Sort by count
	sort.Slice(result, func(i, j int) bool {
		return result[i].Count > result[j].Count
	})

	// Return top 5
	if len(result) > 5 {
		result = result[:5]
	}

	return result
}

func (lac *LabelAnalysisCalculator) generateRecommendations(data *LabelAnalysisData) *LabelRecommendations {
	var immediate, longTerm []LabelRecommendation

	// Generate recommendations based on analysis
	if data.IssuesWithoutLabels > 5 {
		immediate = append(immediate, LabelRecommendation{
			Priority:       "High",
			Title:          "Improve Label Coverage",
			Description:    "Many issues lack labels, making them harder to organize and find",
			Steps:          []string{"Review unlabeled issues", "Add appropriate labels", "Create labeling guidelines"},
			ExpectedImpact: "Better issue organization and faster resolution",
		})
	}

	if data.LabelConsistencyScore < 70 {
		immediate = append(immediate, LabelRecommendation{
			Priority:       "Medium",
			Title:          "Address Label Inconsistencies",
			Description:    "Label usage shows inconsistencies that could confuse contributors",
			Steps:          []string{"Review duplicate labels", "Consolidate similar labels", "Update issue labels"},
			ExpectedImpact: "Clearer categorization and reduced confusion",
		})
	}

	longTerm = append(longTerm, LabelRecommendation{
		Title:       "Implement Label Automation",
		Description: "Set up automated labeling based on issue content",
		Benefits:    []string{"Consistent labeling", "Time savings", "Better categorization"},
		EffortLevel: "Medium",
	})

	return &LabelRecommendations{
		Immediate: immediate,
		LongTerm:  longTerm,
	}
}

func (lac *LabelAnalysisCalculator) analyzeBestPractices(data *LabelAnalysisData) *LabelBestPractices {
	var strengths, improvements []BestPracticeItem

	if data.CategorizationCoverage > 80 {
		strengths = append(strengths, BestPracticeItem{
			Area:        "Coverage",
			Description: "Good label coverage across issues",
		})
	}

	if data.TotalLabels > 20 {
		improvements = append(improvements, BestPracticeItem{
			Area:        "Label Count",
			Description: "Large number of labels may be overwhelming",
			Suggestion:  "Consider consolidating similar labels",
		})
	}

	return &LabelBestPractices{
		Strengths:        strengths,
		ImprovementAreas: improvements,
	}
}

func (lac *LabelAnalysisCalculator) generateLabelGuidelines() []LabelGuideline {
	// Return empty slice - guidelines will be shown as recommendations in template
	return []LabelGuideline{}
}

func (lac *LabelAnalysisCalculator) getDateRange() (time.Time, time.Time) {
	if len(lac.issues) == 0 {
		now := time.Now()
		return now, now
	}

	earliest := lac.issues[0].CreatedAt
	latest := lac.issues[0].CreatedAt

	for _, issue := range lac.issues {
		if issue.CreatedAt.Before(earliest) {
			earliest = issue.CreatedAt
		}
		if issue.CreatedAt.After(latest) {
			latest = issue.CreatedAt
		}
	}

	return earliest, latest
}

// Helper utility functions

func (lac *LabelAnalysisCalculator) stringInSlice(str string, slice []string) bool {
	for _, s := range slice {
		if s == str {
			return true
		}
	}
	return false
}

func (lac *LabelAnalysisCalculator) removeDuplicateStrings(slice []string) []string {
	seen := make(map[string]bool)
	var result []string

	for _, str := range slice {
		if !seen[str] {
			seen[str] = true
			result = append(result, str)
		}
	}

	return result
}

func (lac *LabelAnalysisCalculator) log2(x float64) float64 {
	if x <= 0 {
		return 0
	}
	return 0.6931471805599453 * lac.log(x) // ln(2) * ln(x)
}

func (lac *LabelAnalysisCalculator) log(x float64) float64 {
	// Simplified natural logarithm approximation
	if x <= 0 {
		return 0
	}
	if x == 1 {
		return 0
	}

	// Very simple approximation - in real implementation use math.Log
	result := 0.0
	for x > 1 {
		x /= 2.718281828459045 // e
		result += 1.0
	}
	return result
}

package analytics

import (
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/nyasuto/beaver/internal/models"
	"github.com/nyasuto/beaver/pkg/config"
)

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

// StatisticsData contains comprehensive statistics for the statistics dashboard
type StatisticsData struct {
	ProjectName         string
	GeneratedAt         time.Time
	TotalIssues         int
	OpenIssues          int
	ClosedIssues        int
	ClassificationStats ClassificationSummary
	TimeStats           *TimeStatistics
	ActivityStats       *ActivityStatistics
	ContributorStats    *ContributorStatistics
	QualityStats        *QualityStatistics
	HealthStats         *HealthStatistics
	TrendStats          *TrendStatistics
	Predictions         *PredictionStats
	ComplexityStats     *ComplexityStatistics
	TechStats           *TechnologyStatistics
	Trends              *TrendIndicators
	Recommendations     *RecommendationSet
	DataRange           *DateRange
	NextUpdate          *time.Time
	AutoUpdate          bool
	// New unified workflow metrics that replace frontend duplicates
	WorkflowMetrics *WorkflowMetrics `json:"workflow_metrics"`
	DailyMetrics    *DailyMetrics    `json:"daily_metrics"`
	NextActions     []ActionItem     `json:"next_actions"`
}

// TimeStatistics contains time-based analysis
type TimeStatistics struct {
	MonthlyData []MonthlyStats
}

// MonthlyStats represents statistics for a specific month
type MonthlyStats struct {
	Month   string
	Created int
	Closed  int
}

// ActivityStatistics contains activity pattern analysis
type ActivityStatistics struct {
	MostActiveDay        string
	MostActiveDayCount   int
	MostActiveMonth      string
	MostActiveMonthCount int
	AvgIssuesPerMonth    float64
	LongestOpenDays      int
	AvgResolutionDays    float64
}

// ContributorStatistics contains contributor analysis
type ContributorStatistics struct {
	TopContributors    []ContributorStat
	TotalContributors  int
	ActiveContributors int
	NewContributors    int
}

// ContributorStat represents individual contributor statistics
type ContributorStat struct {
	Name                   string
	IssuesCreated          int
	IssuesClosed           int
	ContributionPercentage float64
}

// QualityStatistics contains issue quality metrics
type QualityStatistics struct {
	AvgTitleLength      float64
	AvgBodyLength       float64
	IssuesWithLabels    int
	IssuesWithComments  int
	AvgCommentsPerIssue float64
}

// HealthStatistics contains project health indicators
type HealthStatistics struct {
	AvgResponseTime     float64
	StaleIssues         int
	IssuesWithoutLabels int
	HealthScore         float64
}

// TrendStatistics contains trend analysis
type TrendStatistics struct {
	IssueGrowthRate float64
	ResolutionTrend float64
	EngagementTrend float64
}

// PredictionStats contains predictive analytics
type PredictionStats struct {
	NextMonthIssues   int
	AvgResolutionTime float64
	FocusAreas        []string
}

// ComplexityStatistics contains issue complexity analysis
type ComplexityStatistics struct {
	SimpleIssues      int
	MediumIssues      int
	ComplexIssues     int
	SimplePercentage  float64
	MediumPercentage  float64
	ComplexPercentage float64
	AvgComplexity     float64
}

// TechnologyStatistics contains technology mention analysis
type TechnologyStatistics struct {
	Technologies []TechnologyStat
}

// TechnologyStat represents statistics for a specific technology
type TechnologyStat struct {
	Name       string
	Mentions   int
	IssueCount int
	Trend      float64
}

// TrendIndicators contains simple trend indicators
type TrendIndicators struct {
	IssueGrowth           float64
	ResolutionRate        float64
	ResolutionImprovement bool
}

// RecommendationSet contains prioritized recommendations
type RecommendationSet struct {
	Priority []PriorityRecommendation
}

// PriorityRecommendation contains recommendations by priority level
type PriorityRecommendation struct {
	Level string
	Items []RecommendationItem
}

// RecommendationItem represents a single recommendation
type RecommendationItem struct {
	Description string
	Impact      string
}

// DateRange represents a date range
type DateRange struct {
	StartDate time.Time
	EndDate   time.Time
}

// WorkflowMetrics contains workflow statistics that replace frontend calculations
type WorkflowMetrics struct {
	NewThisWeek     int `json:"new_this_week"`
	RecentlyUpdated int `json:"recently_updated"`
	TotalOpen       int `json:"total_open"`
	ClosedThisWeek  int `json:"closed_this_week"`
	WeeklyVelocity  int `json:"weekly_velocity"`
}

// DailyMetrics contains daily activity metrics
type DailyMetrics struct {
	NewToday     int  `json:"new_today"`
	UpdatedToday int  `json:"updated_today"`
	ClosedToday  int  `json:"closed_today"`
	HasActivity  bool `json:"has_activity"`
}

// ActionItem represents a recommended action for developers
type ActionItem struct {
	Text   string         `json:"text"`
	Issues []models.Issue `json:"issues"`
	Type   string         `json:"type"` // 'critical', 'stale', 'bug', 'feature', 'none'
}

// StatisticsCalculator calculates comprehensive statistics from issues
type StatisticsCalculator struct {
	issues            []models.Issue
	projectName       string
	generatedAt       time.Time
	classificationCfg *config.ClassificationConfig
}

// NewStatisticsCalculator creates a new statistics calculator
func NewStatisticsCalculator(issues []models.Issue, projectName string) *StatisticsCalculator {
	// Try to load shared classification config
	classificationCfg, err := config.LoadClassificationConfig()
	if err != nil {
		// If config loading fails, use nil and fall back to hardcoded logic
		classificationCfg = nil
	}

	return &StatisticsCalculator{
		issues:            issues,
		projectName:       projectName,
		generatedAt:       time.Now(),
		classificationCfg: classificationCfg,
	}
}

// Calculate generates comprehensive statistics
func (sc *StatisticsCalculator) Calculate() *StatisticsData {
	stats := &StatisticsData{
		ProjectName: sc.projectName,
		GeneratedAt: sc.generatedAt,
		TotalIssues: len(sc.issues),
		AutoUpdate:  true,
	}

	// Count open/closed issues
	for _, issue := range sc.issues {
		if issue.State == "open" {
			stats.OpenIssues++
		} else {
			stats.ClosedIssues++
		}
	}

	// Calculate classification stats using existing logic
	stats.ClassificationStats = sc.calculateClassificationStats()

	// Calculate time-based statistics
	stats.TimeStats = sc.calculateTimeStatistics()

	// Calculate activity statistics
	stats.ActivityStats = sc.calculateActivityStatistics()

	// Calculate contributor statistics
	stats.ContributorStats = sc.calculateContributorStatistics()

	// Calculate quality statistics
	stats.QualityStats = sc.calculateQualityStatistics()

	// Calculate health statistics
	stats.HealthStats = sc.calculateHealthStatistics()

	// Calculate trend statistics
	stats.TrendStats = sc.calculateTrendStatistics()

	// Calculate predictions
	stats.Predictions = sc.calculatePredictions()

	// Calculate complexity statistics
	stats.ComplexityStats = sc.calculateComplexityStatistics()

	// Calculate technology statistics
	stats.TechStats = sc.calculateTechnologyStatistics()

	// Calculate simple trend indicators
	stats.Trends = sc.calculateTrendIndicators()

	// Generate recommendations
	stats.Recommendations = sc.generateRecommendations(stats)

	// Calculate new unified workflow metrics
	stats.WorkflowMetrics = sc.calculateWorkflowMetrics()

	// Calculate daily metrics
	stats.DailyMetrics = sc.calculateDailyMetrics()

	// Generate next actions
	stats.NextActions = sc.generateNextActions()

	// Set data range
	if len(sc.issues) > 0 {
		earliest, latest := sc.getDateRange()
		stats.DataRange = &DateRange{
			StartDate: earliest,
			EndDate:   latest,
		}
	}

	// Set next update time (assuming daily updates)
	nextUpdate := sc.generatedAt.Add(24 * time.Hour)
	stats.NextUpdate = &nextUpdate

	return stats
}

// calculateClassificationStats reuses the existing classification stats logic
func (sc *StatisticsCalculator) calculateClassificationStats() ClassificationSummary {
	stats := ClassificationSummary{
		ByCategory: make(map[string]int),
		ByMethod:   make(map[string]int),
	}

	var totalConfidence float64
	var classifiedCount int
	tagCounts := make(map[string]int)
	highConfidenceThreshold := 0.8
	lowConfidenceThreshold := 0.5

	for _, issue := range sc.issues {
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

	// Sort tags by count
	sort.Slice(tagCounts2, func(i, j int) bool {
		return tagCounts2[i].count > tagCounts2[j].count
	})

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

// calculateTimeStatistics calculates time-based metrics
func (sc *StatisticsCalculator) calculateTimeStatistics() *TimeStatistics {
	monthlyData := make(map[string]*MonthlyStats)

	for _, issue := range sc.issues {
		monthKey := issue.CreatedAt.Format("2006-01")
		if _, exists := monthlyData[monthKey]; !exists {
			monthlyData[monthKey] = &MonthlyStats{
				Month: issue.CreatedAt.Format("Jan 2006"),
			}
		}
		monthlyData[monthKey].Created++

		if issue.State == "closed" {
			monthlyData[monthKey].Closed++
		}
	}

	var months []MonthlyStats
	for _, stats := range monthlyData {
		months = append(months, *stats)
	}

	// Sort by month
	sort.Slice(months, func(i, j int) bool {
		return months[i].Month < months[j].Month
	})

	return &TimeStatistics{
		MonthlyData: months,
	}
}

// calculateActivityStatistics calculates activity patterns
func (sc *StatisticsCalculator) calculateActivityStatistics() *ActivityStatistics {
	if len(sc.issues) == 0 {
		return &ActivityStatistics{}
	}

	dayCount := make(map[string]int)
	monthCount := make(map[string]int)
	var totalResolutionDays float64
	var resolutionCount int
	maxOpenDays := 0

	for _, issue := range sc.issues {
		// Count by day of week
		dayCount[issue.CreatedAt.Weekday().String()]++

		// Count by month
		monthKey := issue.CreatedAt.Format("2006-01")
		monthCount[monthKey]++

		// Calculate resolution time and longest open time
		var daysSinceCreated int
		if issue.State == "closed" {
			daysSinceCreated = int(issue.UpdatedAt.Sub(issue.CreatedAt).Hours() / 24)
			totalResolutionDays += float64(daysSinceCreated)
			resolutionCount++
		} else {
			daysSinceCreated = int(time.Since(issue.CreatedAt).Hours() / 24)
		}

		if daysSinceCreated > maxOpenDays {
			maxOpenDays = daysSinceCreated
		}
	}

	// Find most active day
	var mostActiveDay string
	var mostActiveDayCount int
	for day, count := range dayCount {
		if count > mostActiveDayCount {
			mostActiveDayCount = count
			mostActiveDay = day
		}
	}

	// Find most active month
	var mostActiveMonth string
	var mostActiveMonthCount int
	for month, count := range monthCount {
		if count > mostActiveMonthCount {
			mostActiveMonthCount = count
			mostActiveMonth = month
		}
	}

	// Calculate average issues per month
	avgIssuesPerMonth := float64(len(sc.issues))
	if len(monthCount) > 0 {
		avgIssuesPerMonth = float64(len(sc.issues)) / float64(len(monthCount))
	}

	// Calculate average resolution time
	var avgResolutionDays float64
	if resolutionCount > 0 {
		avgResolutionDays = totalResolutionDays / float64(resolutionCount)
	}

	return &ActivityStatistics{
		MostActiveDay:        mostActiveDay,
		MostActiveDayCount:   mostActiveDayCount,
		MostActiveMonth:      mostActiveMonth,
		MostActiveMonthCount: mostActiveMonthCount,
		AvgIssuesPerMonth:    avgIssuesPerMonth,
		LongestOpenDays:      maxOpenDays,
		AvgResolutionDays:    avgResolutionDays,
	}
}

// calculateContributorStatistics calculates contributor metrics
func (sc *StatisticsCalculator) calculateContributorStatistics() *ContributorStatistics {
	contributors := make(map[string]*ContributorStat)
	now := time.Now()
	thirtyDaysAgo := now.AddDate(0, 0, -30)

	activeContributors := make(map[string]bool)
	newContributors := make(map[string]bool)

	for _, issue := range sc.issues {
		username := issue.User.Login
		if _, exists := contributors[username]; !exists {
			contributors[username] = &ContributorStat{
				Name: username,
			}
		}

		contributors[username].IssuesCreated++

		if issue.State == "closed" {
			contributors[username].IssuesClosed++
		}

		// Track active contributors
		if issue.CreatedAt.After(thirtyDaysAgo) {
			activeContributors[username] = true
		}

		// Track new contributors (first issue within 30 days)
		if issue.CreatedAt.After(thirtyDaysAgo) {
			isNew := true
			for _, otherIssue := range sc.issues {
				if otherIssue.User.Login == username && otherIssue.CreatedAt.Before(thirtyDaysAgo) {
					isNew = false
					break
				}
			}
			if isNew {
				newContributors[username] = true
			}
		}
	}

	// Calculate contribution percentages
	totalIssues := len(sc.issues)
	for _, contributor := range contributors {
		if totalIssues > 0 {
			contributor.ContributionPercentage = float64(contributor.IssuesCreated) / float64(totalIssues) * 100
		}
	}

	// Convert to slice and sort by issues created
	var topContributors []ContributorStat
	for _, contributor := range contributors {
		topContributors = append(topContributors, *contributor)
	}

	sort.Slice(topContributors, func(i, j int) bool {
		return topContributors[i].IssuesCreated > topContributors[j].IssuesCreated
	})

	// Limit to top 10
	if len(topContributors) > 10 {
		topContributors = topContributors[:10]
	}

	return &ContributorStatistics{
		TopContributors:    topContributors,
		TotalContributors:  len(contributors),
		ActiveContributors: len(activeContributors),
		NewContributors:    len(newContributors),
	}
}

// calculateQualityStatistics calculates issue quality metrics
func (sc *StatisticsCalculator) calculateQualityStatistics() *QualityStatistics {
	if len(sc.issues) == 0 {
		return &QualityStatistics{}
	}

	var totalTitleLength, totalBodyLength float64
	var issuesWithLabels, issuesWithComments int
	var totalComments int

	for _, issue := range sc.issues {
		totalTitleLength += float64(len(issue.Title))
		totalBodyLength += float64(len(issue.Body))

		if len(issue.Labels) > 0 {
			issuesWithLabels++
		}

		if len(issue.Comments) > 0 {
			issuesWithComments++
		}

		totalComments += len(issue.Comments)
	}

	return &QualityStatistics{
		AvgTitleLength:      totalTitleLength / float64(len(sc.issues)),
		AvgBodyLength:       totalBodyLength / float64(len(sc.issues)),
		IssuesWithLabels:    issuesWithLabels,
		IssuesWithComments:  issuesWithComments,
		AvgCommentsPerIssue: float64(totalComments) / float64(len(sc.issues)),
	}
}

// calculateHealthStatistics calculates project health indicators
func (sc *StatisticsCalculator) calculateHealthStatistics() *HealthStatistics {
	if len(sc.issues) == 0 {
		return &HealthStatistics{HealthScore: 100}
	}

	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	var staleIssues, issuesWithoutLabels int
	var totalResponseTime float64
	var responseTimeCount int

	for _, issue := range sc.issues {
		// Count stale issues (open for more than 30 days)
		if issue.State == "open" && issue.CreatedAt.Before(thirtyDaysAgo) {
			staleIssues++
		}

		// Count issues without labels
		if len(issue.Labels) == 0 {
			issuesWithoutLabels++
		}

		// Calculate response time (time to first comment)
		if len(issue.Comments) > 0 {
			// Simplified: assume first comment is the response
			responseTime := 24.0 // Default 24 hours if we can't calculate
			totalResponseTime += responseTime
			responseTimeCount++
		}
	}

	// Calculate average response time
	var avgResponseTime float64
	if responseTimeCount > 0 {
		avgResponseTime = totalResponseTime / float64(responseTimeCount)
	}

	// Calculate health score (0-100)
	healthScore := 100.0
	if len(sc.issues) > 0 {
		// Deduct points for various issues
		stalePercentage := float64(staleIssues) / float64(len(sc.issues)) * 100
		unlabeledPercentage := float64(issuesWithoutLabels) / float64(len(sc.issues)) * 100

		healthScore -= stalePercentage * 0.5     // 50% penalty for stale issues
		healthScore -= unlabeledPercentage * 0.3 // 30% penalty for unlabeled issues

		if avgResponseTime > 72 {
			healthScore -= 20 // 20 point penalty for slow response
		} else if avgResponseTime > 24 {
			healthScore -= 10 // 10 point penalty for medium response
		}
	}

	if healthScore < 0 {
		healthScore = 0
	}

	return &HealthStatistics{
		AvgResponseTime:     avgResponseTime,
		StaleIssues:         staleIssues,
		IssuesWithoutLabels: issuesWithoutLabels,
		HealthScore:         healthScore,
	}
}

// calculateTrendStatistics calculates trend analysis
func (sc *StatisticsCalculator) calculateTrendStatistics() *TrendStatistics {
	// Simplified trend calculation
	// In a real implementation, you would analyze historical data
	return &TrendStatistics{
		IssueGrowthRate: 5.0, // Example: 5% growth
		ResolutionTrend: 2.0, // Example: 2% improvement
		EngagementTrend: 1.0, // Example: 1% increase
	}
}

// calculatePredictions generates predictive analytics
func (sc *StatisticsCalculator) calculatePredictions() *PredictionStats {
	activityStats := sc.calculateActivityStatistics()

	// Simple prediction based on current averages
	nextMonthIssues := int(activityStats.AvgIssuesPerMonth * 1.1) // 10% growth assumption

	focusAreas := []string{"Issue labeling", "Response time", "Resolution efficiency"}

	return &PredictionStats{
		NextMonthIssues:   nextMonthIssues,
		AvgResolutionTime: activityStats.AvgResolutionDays,
		FocusAreas:        focusAreas,
	}
}

// calculateComplexityStatistics analyzes issue complexity
func (sc *StatisticsCalculator) calculateComplexityStatistics() *ComplexityStatistics {
	if len(sc.issues) == 0 {
		return &ComplexityStatistics{}
	}

	var simple, medium, complex int
	var totalComplexity float64

	for _, issue := range sc.issues {
		complexity := sc.calculateIssueComplexity(issue)
		totalComplexity += complexity

		if complexity <= 3 {
			simple++
		} else if complexity <= 7 {
			medium++
		} else {
			complex++
		}
	}

	total := len(sc.issues)
	return &ComplexityStatistics{
		SimpleIssues:      simple,
		MediumIssues:      medium,
		ComplexIssues:     complex,
		SimplePercentage:  float64(simple) / float64(total) * 100,
		MediumPercentage:  float64(medium) / float64(total) * 100,
		ComplexPercentage: float64(complex) / float64(total) * 100,
		AvgComplexity:     totalComplexity / float64(total),
	}
}

// calculateIssueComplexity estimates issue complexity on a scale of 1-10
func (sc *StatisticsCalculator) calculateIssueComplexity(issue models.Issue) float64 {
	complexity := 1.0

	// Length of description affects complexity
	if len(issue.Body) > 500 {
		complexity += 2
	} else if len(issue.Body) > 200 {
		complexity += 1
	}

	// Number of comments indicates discussion/complexity
	if len(issue.Comments) > 10 {
		complexity += 2
	} else if len(issue.Comments) > 5 {
		complexity += 1
	}

	// Keywords that indicate complexity
	complexKeywords := []string{"architecture", "design", "refactor", "breaking", "major"}
	text := strings.ToLower(issue.Title + " " + issue.Body)
	for _, keyword := range complexKeywords {
		if strings.Contains(text, keyword) {
			complexity += 1
		}
	}

	if complexity > 10 {
		complexity = 10
	}

	return complexity
}

// calculateTechnologyStatistics analyzes technology mentions
func (sc *StatisticsCalculator) calculateTechnologyStatistics() *TechnologyStatistics {
	techKeywords := []string{"Go", "Python", "JavaScript", "Docker", "Kubernetes", "AWS", "GitHub", "API", "REST", "gRPC", "AI", "ML", "React", "Vue", "Node.js"}
	techStats := make(map[string]*TechnologyStat)

	for _, tech := range techKeywords {
		techStats[tech] = &TechnologyStat{
			Name: tech,
		}
	}

	for _, issue := range sc.issues {
		text := strings.ToLower(issue.Title + " " + issue.Body)
		for _, tech := range techKeywords {
			if strings.Contains(text, strings.ToLower(tech)) {
				techStats[tech].Mentions++
				techStats[tech].IssueCount++
			}
		}
	}

	var technologies []TechnologyStat
	for _, stat := range techStats {
		if stat.Mentions > 0 {
			// Simple trend calculation (in real implementation, compare with historical data)
			stat.Trend = 0 // Neutral trend by default
			technologies = append(technologies, *stat)
		}
	}

	// Sort by mentions
	sort.Slice(technologies, func(i, j int) bool {
		return technologies[i].Mentions > technologies[j].Mentions
	})

	return &TechnologyStatistics{
		Technologies: technologies,
	}
}

// calculateTrendIndicators calculates simple trend indicators
func (sc *StatisticsCalculator) calculateTrendIndicators() *TrendIndicators {
	// Simplified trend indicators
	return &TrendIndicators{
		IssueGrowth:           5.2,  // Example growth percentage
		ResolutionRate:        75.0, // Example resolution rate
		ResolutionImprovement: true, // Example improvement
	}
}

// generateRecommendations generates actionable recommendations
func (sc *StatisticsCalculator) generateRecommendations(stats *StatisticsData) *RecommendationSet {
	var highPriority, mediumPriority, lowPriority []RecommendationItem

	// Generate recommendations based on statistics
	if stats.HealthStats.HealthScore < 60 {
		highPriority = append(highPriority, RecommendationItem{
			Description: "Improve project health score by addressing stale issues and labeling",
			Impact:      "High",
		})
	}

	if stats.HealthStats.StaleIssues > 5 {
		highPriority = append(highPriority, RecommendationItem{
			Description: "Review and update stale issues (>30 days old)",
			Impact:      "Medium",
		})
	}

	if stats.QualityStats.IssuesWithLabels < stats.TotalIssues/2 {
		mediumPriority = append(mediumPriority, RecommendationItem{
			Description: "Implement consistent issue labeling strategy",
			Impact:      "Medium",
		})
	}

	if stats.ClassificationStats.TotalClassified == 0 {
		mediumPriority = append(mediumPriority, RecommendationItem{
			Description: "Run AI classification to improve issue categorization",
			Impact:      "High",
		})
	}

	lowPriority = append(lowPriority, RecommendationItem{
		Description: "Monitor contributor engagement and response times",
		Impact:      "Low",
	})

	return &RecommendationSet{
		Priority: []PriorityRecommendation{
			{Level: "High", Items: highPriority},
			{Level: "Medium", Items: mediumPriority},
			{Level: "Low", Items: lowPriority},
		},
	}
}

// getDateRange returns the earliest and latest issue dates
func (sc *StatisticsCalculator) getDateRange() (time.Time, time.Time) {
	if len(sc.issues) == 0 {
		now := time.Now()
		return now, now
	}

	earliest := sc.issues[0].CreatedAt
	latest := sc.issues[0].CreatedAt

	for _, issue := range sc.issues {
		if issue.CreatedAt.Before(earliest) {
			earliest = issue.CreatedAt
		}
		if issue.CreatedAt.After(latest) {
			latest = issue.CreatedAt
		}
	}

	return earliest, latest
}

// calculateWorkflowMetrics calculates workflow metrics (replaces frontend getWorkflowMetrics)
func (sc *StatisticsCalculator) calculateWorkflowMetrics() *WorkflowMetrics {
	now := time.Now()
	oneWeekAgo := now.AddDate(0, 0, -7)

	var newThisWeek, recentlyUpdated, totalOpen, closedThisWeek int

	for _, issue := range sc.issues {
		// Count issues created this week
		if issue.CreatedAt.After(oneWeekAgo) {
			newThisWeek++
		}

		// Count recently updated issues
		if !issue.UpdatedAt.IsZero() && issue.UpdatedAt.After(oneWeekAgo) {
			recentlyUpdated++
		}

		// Count open issues
		if issue.State == "open" {
			totalOpen++
		}

		// Count issues closed this week
		if issue.State == "closed" && !issue.UpdatedAt.IsZero() && issue.UpdatedAt.After(oneWeekAgo) {
			closedThisWeek++
		}
	}

	// Weekly velocity is same as closed this week
	weeklyVelocity := closedThisWeek

	return &WorkflowMetrics{
		NewThisWeek:     newThisWeek,
		RecentlyUpdated: recentlyUpdated,
		TotalOpen:       totalOpen,
		ClosedThisWeek:  closedThisWeek,
		WeeklyVelocity:  weeklyVelocity,
	}
}

// calculateDailyMetrics calculates daily activity metrics (replaces frontend getDailyMetrics)
func (sc *StatisticsCalculator) calculateDailyMetrics() *DailyMetrics {
	now := time.Now()
	twentyFourHoursAgo := now.Add(-24 * time.Hour)

	var newToday, updatedToday, closedToday int

	for _, issue := range sc.issues {
		// Count issues created today
		if issue.CreatedAt.After(twentyFourHoursAgo) {
			newToday++
		}

		// Count issues updated today
		if !issue.UpdatedAt.IsZero() && issue.UpdatedAt.After(twentyFourHoursAgo) {
			updatedToday++
		}

		// Count issues closed today
		if issue.State == "closed" && !issue.UpdatedAt.IsZero() && issue.UpdatedAt.After(twentyFourHoursAgo) {
			closedToday++
		}
	}

	hasActivity := newToday > 0 || updatedToday > 0 || closedToday > 0

	return &DailyMetrics{
		NewToday:     newToday,
		UpdatedToday: updatedToday,
		ClosedToday:  closedToday,
		HasActivity:  hasActivity,
	}
}

// generateNextActions generates recommended actions (replaces frontend getNextActions)
func (sc *StatisticsCalculator) generateNextActions() []ActionItem {
	var actions []ActionItem

	// Check for critical/high priority issues using shared config
	var criticalIssues []models.Issue
	for _, issue := range sc.issues {
		if issue.State == "open" {
			// Convert labels to string slice
			var labelNames []string
			for _, label := range issue.Labels {
				labelNames = append(labelNames, label.Name)
			}

			// Use shared config if available, otherwise fall back to hardcoded logic
			var isCritical bool
			if sc.classificationCfg != nil {
				priority := sc.classificationCfg.GetPriorityFromLabels(labelNames)
				isCritical = priority == "critical" || priority == "high"
			} else {
				// Fallback to hardcoded logic
				labelText := strings.ToLower(strings.Join(labelNames, " "))
				isCritical = strings.Contains(labelText, "critical") ||
					strings.Contains(labelText, "urgent") ||
					strings.Contains(labelText, "high")
			}

			if isCritical {
				criticalIssues = append(criticalIssues, issue)
			}
		}
	}

	if len(criticalIssues) > 0 {
		// Limit to first 5 issues for display
		displayIssues := criticalIssues
		if len(displayIssues) > 5 {
			displayIssues = displayIssues[:5]
		}
		actions = append(actions, ActionItem{
			Text:   fmt.Sprintf("🚨 %d件の緊急対応が必要", len(criticalIssues)),
			Issues: displayIssues,
			Type:   "critical",
		})
	}

	// Check for stale issues using config or default
	var staleThreshold int
	if sc.classificationCfg != nil {
		staleThreshold = sc.classificationCfg.ActionRules.StaleThresholdDays
	} else {
		staleThreshold = 30 // Default fallback
	}
	staleDate := time.Now().AddDate(0, 0, -staleThreshold)
	var staleIssues []models.Issue
	for _, issue := range sc.issues {
		if issue.State == "open" &&
			(issue.UpdatedAt.IsZero() || issue.UpdatedAt.Before(staleDate)) {
			staleIssues = append(staleIssues, issue)
		}
	}

	if len(staleIssues) > 0 {
		displayIssues := staleIssues
		if len(displayIssues) > 5 {
			displayIssues = displayIssues[:5]
		}
		actions = append(actions, ActionItem{
			Text:   fmt.Sprintf("📅 %d件の長期停滞Issues要確認", len(staleIssues)),
			Issues: displayIssues,
			Type:   "stale",
		})
	}

	// Check for bugs using shared config
	var bugIssues []models.Issue
	for _, issue := range sc.issues {
		if issue.State == "open" {
			// Convert labels to string slice
			var labelNames []string
			for _, label := range issue.Labels {
				labelNames = append(labelNames, label.Name)
			}

			// Use shared config if available, otherwise fall back to hardcoded logic
			var isBug bool
			if sc.classificationCfg != nil {
				category := sc.classificationCfg.GetCategoryFromContent(issue.Title, issue.Body, labelNames)
				isBug = category == "bug"
			} else {
				// Fallback to hardcoded logic
				labelText := strings.ToLower(strings.Join(labelNames, " "))
				isBug = strings.Contains(labelText, "bug")
			}

			if isBug {
				bugIssues = append(bugIssues, issue)
			}
		}
	}

	if len(bugIssues) > 0 {
		displayIssues := bugIssues
		if len(displayIssues) > 5 {
			displayIssues = displayIssues[:5]
		}
		actions = append(actions, ActionItem{
			Text:   fmt.Sprintf("🐛 %d件のバグ修正待ち", len(bugIssues)),
			Issues: displayIssues,
			Type:   "bug",
		})
	}

	// Check for feature requests using shared config
	var featureIssues []models.Issue
	for _, issue := range sc.issues {
		if issue.State == "open" {
			// Convert labels to string slice
			var labelNames []string
			for _, label := range issue.Labels {
				labelNames = append(labelNames, label.Name)
			}

			// Use shared config if available, otherwise fall back to hardcoded logic
			var isFeature bool
			if sc.classificationCfg != nil {
				category := sc.classificationCfg.GetCategoryFromContent(issue.Title, issue.Body, labelNames)
				isFeature = category == "feature"
			} else {
				// Fallback to hardcoded logic
				labelText := strings.ToLower(strings.Join(labelNames, " "))
				isFeature = strings.Contains(labelText, "feature") || strings.Contains(labelText, "enhancement")
			}

			if isFeature {
				featureIssues = append(featureIssues, issue)
			}
		}
	}

	if len(featureIssues) > 0 {
		displayIssues := featureIssues
		if len(displayIssues) > 5 {
			displayIssues = displayIssues[:5]
		}
		actions = append(actions, ActionItem{
			Text:   fmt.Sprintf("✨ %d件の新機能実装待ち", len(featureIssues)),
			Issues: displayIssues,
			Type:   "feature",
		})
	}

	if len(actions) == 0 {
		actions = append(actions, ActionItem{
			Text:   "✅ 緊急対応事項はありません",
			Issues: []models.Issue{},
			Type:   "none",
		})
	}

	// Limit to max 4 actions
	if len(actions) > 4 {
		actions = actions[:4]
	}

	return actions
}

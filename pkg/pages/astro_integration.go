package pages

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/nyasuto/beaver/pkg/components"
)

// AstroDataGenerator generates data that matches Astro component interfaces
type AstroDataGenerator struct {
	config AstroIntegrationConfig
}

// AstroIntegrationConfig represents configuration for Astro integration
type AstroIntegrationConfig struct {
	BaseURL             string
	OutputDirectory     string
	UseSharedComponents bool
}

// AstroStatistics represents the statistics structure expected by Astro components
type AstroStatistics struct {
	TotalIssues  int                  `json:"total_issues"`
	OpenIssues   int                  `json:"open_issues"`
	ClosedIssues int                  `json:"closed_issues"`
	HealthScore  float64              `json:"health_score"`
	Timeline     []AstroTimelineEntry `json:"timeline,omitempty"`
	Trends       *AstroTrends         `json:"trends,omitempty"`
}

// AstroTrends represents trend data for Astro components
type AstroTrends struct {
	WeeklySummary *AstroWeeklySummary `json:"weekly_summary,omitempty"`
}

// AstroWeeklySummary represents weekly activity summary
type AstroWeeklySummary struct {
	CreatedThisWeek    int `json:"created_this_week"`
	ClosedThisWeek     int `json:"closed_this_week"`
	ActiveContributors int `json:"active_contributors"`
}

// AstroTimelineEntry represents a timeline entry
type AstroTimelineEntry struct {
	Date   string `json:"date"`
	Events int    `json:"events"`
	Type   string `json:"type"`
}

// AstroIssue represents issue data for Astro components
type AstroIssue struct {
	ID        int      `json:"id"`
	Number    int      `json:"number"`
	Title     string   `json:"title"`
	Body      string   `json:"body"`
	State     string   `json:"state"`
	Labels    []string `json:"labels"`
	Author    string   `json:"author"`
	CreatedAt string   `json:"created_at"`
	UpdatedAt string   `json:"updated_at"`
	HTMLURL   string   `json:"html_url"`
	Urgency   int      `json:"urgency"`
	Category  string   `json:"category"`
}

// NewAstroDataGenerator creates a new Astro data generator
func NewAstroDataGenerator(config AstroIntegrationConfig) *AstroDataGenerator {
	if config.BaseURL == "" {
		config.BaseURL = "/beaver/"
	}
	return &AstroDataGenerator{config: config}
}

// GenerateAstroCompatibleStatistics converts internal statistics to Astro format
func (adg *AstroDataGenerator) GenerateAstroCompatibleStatistics(stats HomePageConfig) AstroStatistics {
	return AstroStatistics{
		TotalIssues:  stats.TotalIssues,
		OpenIssues:   stats.OpenIssues,
		ClosedIssues: stats.ClosedIssues,
		HealthScore:  stats.HealthScore,
		Timeline:     []AstroTimelineEntry{}, // Can be populated with actual timeline data
		Trends: &AstroTrends{
			WeeklySummary: &AstroWeeklySummary{
				CreatedThisWeek:    0, // Would be calculated from actual data
				ClosedThisWeek:     0, // Would be calculated from actual data
				ActiveContributors: 0, // Would be calculated from actual data
			},
		},
	}
}

// GenerateAstroCompatibleIssues converts internal issues to Astro format
func (adg *AstroDataGenerator) GenerateAstroCompatibleIssues(issues []IssueInfo) []AstroIssue {
	astroIssues := make([]AstroIssue, len(issues))

	for i, issue := range issues {
		astroIssues[i] = AstroIssue{
			ID:        issue.Number, // Using number as ID for simplicity
			Number:    issue.Number,
			Title:     issue.Title,
			Body:      issue.Body,
			State:     issue.State,
			Labels:    issue.Labels,
			Author:    issue.Author,
			CreatedAt: issue.CreatedAt.Format(time.RFC3339),
			UpdatedAt: issue.UpdatedAt.Format(time.RFC3339),
			HTMLURL:   issue.HTMLURL,
			Urgency:   issue.UrgencyScore,
			Category:  issue.Category,
		}
	}

	return astroIssues
}

// GenerateStatCardComponentData generates StatCard component data that mirrors Astro functionality
func (adg *AstroDataGenerator) GenerateStatCardComponentData(stats HomePageConfig) []components.StatCardData {
	healthGrade := adg.calculateHealthGrade(stats.HealthScore)

	return []components.StatCardData{
		{
			Value:     fmt.Sprintf("%d", stats.TotalIssues),
			Label:     "Total Issues",
			ValueType: "number",
		},
		{
			Value:     fmt.Sprintf("%d", stats.OpenIssues),
			Label:     "Open",
			ValueType: "number",
		},
		{
			Value:     fmt.Sprintf("%d", stats.ClosedIssues),
			Label:     "Closed",
			ValueType: "number",
		},
		{
			Value:     fmt.Sprintf("%.0f%%", stats.HealthScore),
			Label:     "Health Score",
			Grade:     healthGrade,
			ValueType: "percentage",
		},
	}
}

// GenerateHybridPage generates a page that uses both Go components and includes Astro data
func (adg *AstroDataGenerator) GenerateHybridPage(pageConfig HomePageConfig, issues []IssueInfo) string {
	if !adg.config.UseSharedComponents {
		// Fallback to generating Astro-compatible JSON data
		return adg.generateAstroDataJSON(pageConfig, issues)
	}

	// Generate page using Go shared components
	homepageGen := NewHomepageGenerator(pageConfig)
	goHTML := homepageGen.GenerateHomepage()

	// Embed Astro data for any interactive components that might need it
	astroStats := adg.GenerateAstroCompatibleStatistics(pageConfig)
	astroIssues := adg.GenerateAstroCompatibleIssues(issues)

	astroDataScript := adg.generateAstroDataScript(astroStats, astroIssues)

	// Insert the Astro data script before the closing body tag
	return adg.insertAstroDataScript(goHTML, astroDataScript)
}

// generateAstroDataJSON generates JSON data for Astro components
func (adg *AstroDataGenerator) generateAstroDataJSON(pageConfig HomePageConfig, issues []IssueInfo) string {
	astroStats := adg.GenerateAstroCompatibleStatistics(pageConfig)
	astroIssues := adg.GenerateAstroCompatibleIssues(issues)

	data := map[string]interface{}{
		"statistics": astroStats,
		"issues":     astroIssues,
		"metadata": map[string]interface{}{
			"repository":   pageConfig.Repository,
			"generated_at": pageConfig.GeneratedAt.Format(time.RFC3339),
			"version":      pageConfig.Version,
			"build":        pageConfig.Build,
		},
	}

	jsonData, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return "{}"
	}
	return string(jsonData)
}

// generateAstroDataScript generates a script tag with Astro-compatible data
func (adg *AstroDataGenerator) generateAstroDataScript(stats AstroStatistics, issues []AstroIssue) string {
	statsJSON, err := json.Marshal(stats)
	if err != nil {
		statsJSON = []byte("{}")
	}
	issuesJSON, err := json.Marshal(issues)
	if err != nil {
		issuesJSON = []byte("[]")
	}

	return fmt.Sprintf(`
<script>
	// Astro-compatible data for interactive components
	window.beaverData = {
		statistics: %s,
		issues: %s,
		config: {
			baseURL: '%s'
		}
	};
</script>`, string(statsJSON), string(issuesJSON), adg.config.BaseURL)
}

// insertAstroDataScript inserts the Astro data script into the HTML
func (adg *AstroDataGenerator) insertAstroDataScript(html, script string) string {
	return fmt.Sprintf("%s\n%s\n</body>\n</html>",
		html[:len(html)-14], // Remove </body></html>
		script)
}

// GetComponentMappingGuide returns a guide for mapping Astro components to Go components
func (adg *AstroDataGenerator) GetComponentMappingGuide() map[string]string {
	return map[string]string{
		"StatisticsCard.astro":   "components.StatCardGenerator",
		"IssueCard.astro":        "components.CardGenerator",
		"ChartComponents.tsx":    "components.ChartContainerGenerator",
		"DeveloperDashboard.tsx": "pages.HomepageGenerator",
		"InteractiveDashboard":   "pages.IssuesPageGenerator",
	}
}

// ValidateAstroCompatibility checks if Go-generated data is compatible with Astro components
func (adg *AstroDataGenerator) ValidateAstroCompatibility(stats AstroStatistics, issues []AstroIssue) []string {
	var warnings []string

	// Check statistics structure
	if stats.TotalIssues < 0 {
		warnings = append(warnings, "TotalIssues should not be negative")
	}

	if stats.HealthScore < 0 || stats.HealthScore > 100 {
		warnings = append(warnings, "HealthScore should be between 0 and 100")
	}

	// Check issues structure
	for i, issue := range issues {
		if issue.Number <= 0 {
			warnings = append(warnings, fmt.Sprintf("Issue %d: Number should be positive", i))
		}

		if issue.Title == "" {
			warnings = append(warnings, fmt.Sprintf("Issue %d: Title should not be empty", i))
		}

		if issue.State != "open" && issue.State != "closed" {
			warnings = append(warnings, fmt.Sprintf("Issue %d: State should be 'open' or 'closed'", i))
		}
	}

	return warnings
}

// Helper methods
func (adg *AstroDataGenerator) calculateHealthGrade(healthScore float64) string {
	if healthScore >= 90 {
		return "A"
	} else if healthScore >= 80 {
		return "B"
	} else if healthScore >= 70 {
		return "C"
	} else if healthScore >= 50 {
		return "D"
	}
	return "F"
}

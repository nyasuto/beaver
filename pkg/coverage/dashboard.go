package coverage

import (
	"fmt"
	"sort"
	"strings"

	"github.com/nyasuto/beaver/pkg/components"
)

// DashboardGenerator generates interactive coverage dashboards
type DashboardGenerator struct {
	config *CoverageConfig
}

// NewDashboardGenerator creates a new dashboard generator
func NewDashboardGenerator(config *CoverageConfig) *DashboardGenerator {
	if config == nil {
		config = DefaultCoverageConfig()
	}

	return &DashboardGenerator{
		config: config,
	}
}

// GenerateInteractiveDashboard generates a rich interactive HTML dashboard using shared components
func (dg *DashboardGenerator) GenerateInteractiveDashboard(data *CoverageData) string {
	// Generate components using shared UI components
	statsHTML := dg.generateStatsSection(data)
	chartsHTML := dg.generateChartsSection(data)
	tablesHTML := dg.generateTablesSection(data)
	recommendationsHTML := dg.generateRecommendationsSection(data)

	// Build the complete dashboard
	return dg.buildDashboardHTML(data, statsHTML, chartsHTML, tablesHTML, recommendationsHTML)
}

// generateDashboardStats generates enhanced statistics for the dashboard
func (dg *DashboardGenerator) generateDashboardStats(data *CoverageData) map[string]interface{} {
	stats := map[string]interface{}{
		"TotalCoverage":    data.TotalCoverage,
		"TotalPackages":    data.Summary.TotalPackages,
		"TotalFiles":       data.Summary.TotalFiles,
		"TestedPackages":   data.Summary.TestedPackages,
		"TestedFiles":      data.Summary.TestedFiles,
		"UntestedPackages": data.Summary.UntestedPackages,
		"CriticalIssues":   dg.countCriticalIssues(data),
		"QualityGrade":     data.QualityRating.OverallGrade,
		"NextTarget":       data.QualityRating.NextTarget,
	}

	// Calculate coverage distribution
	distribution := dg.calculateCoverageDistribution(data)
	stats["Distribution"] = distribution

	// Calculate top performers and needs attention
	stats["TopPerformers"] = dg.getTopPerformers(data.PackageStats, 5)
	stats["NeedsAttention"] = dg.getNeedsAttention(data.PackageStats, 5)

	return stats
}

// generateChartData generates data for interactive charts
func (dg *DashboardGenerator) generateChartData(data *CoverageData) map[string]interface{} {
	charts := map[string]interface{}{}

	// Package coverage chart data
	var packageNames []string
	var packageCoverages []float64
	var packageGrades []string

	for _, pkg := range data.PackageStats {
		packageNames = append(packageNames, pkg.PackageName)
		packageCoverages = append(packageCoverages, pkg.Coverage)
		packageGrades = append(packageGrades, pkg.QualityGrade)
	}

	charts["PackageChart"] = map[string]interface{}{
		"Labels": packageNames,
		"Data":   packageCoverages,
		"Grades": packageGrades,
	}

	// Coverage distribution pie chart
	distribution := dg.calculateCoverageDistribution(data)
	charts["DistributionChart"] = map[string]interface{}{
		"Labels": []string{"A (90%+)", "B (80-89%)", "C (70-79%)", "D (50-69%)", "F (<50%)"},
		"Data":   []int{distribution["A"], distribution["B"], distribution["C"], distribution["D"], distribution["F"]},
		"Colors": []string{"#4CAF50", "#8BC34A", "#FF9800", "#FF5722", "#F44336"},
	}

	// File complexity vs coverage scatter plot
	var fileNames []string
	var fileCoverages []float64
	var fileComplexities []int

	for _, file := range data.FileCoverage {
		fileNames = append(fileNames, file.FileName)
		fileCoverages = append(fileCoverages, file.Coverage)
		fileComplexities = append(fileComplexities, file.ComplexityScore)
	}

	charts["ComplexityChart"] = map[string]interface{}{
		"Files":        fileNames,
		"Coverages":    fileCoverages,
		"Complexities": fileComplexities,
	}

	return charts
}

// calculateCoverageDistribution calculates distribution of packages by grade
func (dg *DashboardGenerator) calculateCoverageDistribution(data *CoverageData) map[string]int {
	distribution := map[string]int{"A": 0, "B": 0, "C": 0, "D": 0, "F": 0}

	for _, pkg := range data.PackageStats {
		if grade, ok := distribution[pkg.QualityGrade]; ok {
			distribution[pkg.QualityGrade] = grade + 1
		}
	}

	return distribution
}

// getTopPerformers returns top performing packages
func (dg *DashboardGenerator) getTopPerformers(packages []PackageCoverageStats, limit int) []PackageCoverageStats {
	sorted := make([]PackageCoverageStats, len(packages))
	copy(sorted, packages)

	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].Coverage > sorted[j].Coverage
	})

	if len(sorted) > limit {
		sorted = sorted[:limit]
	}

	return sorted
}

// getNeedsAttention returns packages that need attention
func (dg *DashboardGenerator) getNeedsAttention(packages []PackageCoverageStats, limit int) []PackageCoverageStats {
	var needsAttention []PackageCoverageStats

	for _, pkg := range packages {
		if pkg.Coverage < dg.config.MinimumCoverage || pkg.QualityGrade == "F" || pkg.QualityGrade == "D" {
			needsAttention = append(needsAttention, pkg)
		}
	}

	sort.Slice(needsAttention, func(i, j int) bool {
		return needsAttention[i].Coverage < needsAttention[j].Coverage
	})

	if len(needsAttention) > limit {
		needsAttention = needsAttention[:limit]
	}

	return needsAttention
}

// countCriticalIssues counts critical coverage issues
func (dg *DashboardGenerator) countCriticalIssues(data *CoverageData) int {
	critical := 0

	for _, pkg := range data.PackageStats {
		if pkg.Coverage < 50 || pkg.QualityGrade == "F" {
			critical++
		}
	}

	for _, rec := range data.Recommendations {
		if rec.Priority == "High" {
			critical++
		}
	}

	return critical
}

// generateStatsSection generates the statistics cards section using StatCard component
func (dg *DashboardGenerator) generateStatsSection(data *CoverageData) string {
	statCardGen := components.NewStatCardGenerator()
	stats := dg.generateDashboardStats(data)

	cards := []components.StatCardData{
		{
			Value:     fmt.Sprintf("%.1f%%", data.TotalCoverage),
			Label:     "Total Coverage",
			Grade:     data.QualityRating.OverallGrade,
			ValueType: "percentage",
		},
		{
			Value:     fmt.Sprintf("%d", stats["TotalPackages"]),
			Label:     "Total Packages",
			ValueType: "number",
		},
		{
			Value:     fmt.Sprintf("%d/%d", stats["TestedPackages"], stats["TotalPackages"]),
			Label:     "Tested Packages",
			ValueType: "fraction",
		},
		{
			Value:     fmt.Sprintf("%d", stats["CriticalIssues"]),
			Label:     "Critical Issues",
			ValueType: "number",
		},
		{
			Value:     data.QualityRating.OverallGrade,
			Label:     "Quality Grade",
			Grade:     data.QualityRating.OverallGrade,
			ValueType: "grade",
		},
		{
			Value:     fmt.Sprintf("%.1f%%", stats["NextTarget"]),
			Label:     "Next Target",
			ValueType: "percentage",
		},
	}

	options := components.StatCardOptions{
		ShowGrade: true,
		DarkMode:  true,
	}

	return statCardGen.GenerateStatsGrid(cards, options)
}

// generateChartsSection generates the charts section using ChartContainer component
func (dg *DashboardGenerator) generateChartsSection(data *CoverageData) string {
	chartGen := components.NewChartContainerGenerator()
	chartData := dg.generateChartData(data)

	var charts []components.ChartData

	// Package coverage chart
	if packageChart, ok := chartData["PackageChart"].(map[string]interface{}); ok {
		charts = append(charts, components.ChartData{
			ChartID:   "packageChart",
			Title:     "📊 Package Coverage",
			ChartType: "bar",
			Data:      packageChart,
			Height:    "400px",
		})
	}

	// Distribution chart
	if distributionChart, ok := chartData["DistributionChart"].(map[string]interface{}); ok {
		charts = append(charts, components.ChartData{
			ChartID:   "distributionChart",
			Title:     "🎯 Coverage Distribution",
			ChartType: "doughnut",
			Data:      distributionChart,
			Height:    "400px",
		})
	}

	options := components.ChartContainerOptions{
		ResponsiveHeight: true,
		DarkMode:         true,
		GridColumns:      2,
	}

	return chartGen.GenerateChartsGrid(charts, options)
}

// generateTablesSection generates the performance tables section using Card component
func (dg *DashboardGenerator) generateTablesSection(data *CoverageData) string {
	cardGen := components.NewCardGenerator()
	stats := dg.generateDashboardStats(data)

	var topPerformersCard, needsAttentionCard string

	// Top performers table
	if topPerformers, ok := stats["TopPerformers"].([]PackageCoverageStats); ok {
		topPerformersHTML := dg.generatePerformersTable(topPerformers)
		topPerformersCard = cardGen.GenerateTableCard("🏆 Top Performers", "🏆", topPerformersHTML, components.CardOptions{
			HeaderStyle: "colored",
			ShowShadow:  true,
			Rounded:     true,
			DarkMode:    true,
		})
	}

	// Needs attention table
	if needsAttention, ok := stats["NeedsAttention"].([]PackageCoverageStats); ok {
		needsAttentionHTML := dg.generatePerformersTable(needsAttention)
		needsAttentionCard = cardGen.GenerateTableCard("⚠️ Needs Attention", "⚠️", needsAttentionHTML, components.CardOptions{
			HeaderStyle: "colored",
			ShowShadow:  true,
			Rounded:     true,
			DarkMode:    true,
		})
	}

	return fmt.Sprintf(`
        <div class="tables-grid">
            %s
            %s
        </div>`, topPerformersCard, needsAttentionCard)
}

// generateRecommendationsSection generates the recommendations section using Card component
func (dg *DashboardGenerator) generateRecommendationsSection(data *CoverageData) string {
	cardGen := components.NewCardGenerator()

	var recommendations []components.RecommendationItem
	for _, rec := range data.Recommendations {
		recommendations = append(recommendations, components.RecommendationItem{
			Title:       rec.Title,
			Description: rec.Description,
			Priority:    rec.Priority,
		})
	}

	return cardGen.GenerateRecommendationsCard(recommendations)
}

// generatePerformersTable generates HTML table for package performance data
func (dg *DashboardGenerator) generatePerformersTable(packages []PackageCoverageStats) string {
	var tableHTML strings.Builder

	tableHTML.WriteString(`
                    <table>
                        <thead>
                            <tr>
                                <th>Package</th>
                                <th>Coverage</th>
                                <th>Grade</th>
                            </tr>
                        </thead>
                        <tbody>`)

	for _, pkg := range packages {
		tableHTML.WriteString(fmt.Sprintf(`
                            <tr>
                                <td>%s</td>
                                <td>%.1f%%</td>
                                <td><span class="grade-%s">%s</span></td>
                            </tr>`, pkg.PackageName, pkg.Coverage, pkg.QualityGrade, pkg.QualityGrade))
	}

	tableHTML.WriteString(`
                        </tbody>
                    </table>`)

	return tableHTML.String()
}

// buildDashboardHTML builds the complete dashboard HTML using components
func (dg *DashboardGenerator) buildDashboardHTML(data *CoverageData, statsHTML, chartsHTML, tablesHTML, recommendationsHTML string) string {
	headerGen := components.NewHeaderGenerator()
	statCardGen := components.NewStatCardGenerator()
	cardGen := components.NewCardGenerator()
	chartGen := components.NewChartContainerGenerator()

	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Coverage Dashboard - %s</title>
    %s
    %s
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f9fafb;
            color: #111827;
            line-height: 1.6;
        }
        
        @media (prefers-color-scheme: dark) {
            body {
                background: #111827;
                color: #f9fafb;
            }
        }
        
        %s
        %s
        %s
        %s
        
        .header {
            background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%);
            color: white;
            padding: 2rem;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
        }
        
        .header .subtitle {
            font-size: 1.1rem;
            opacity: 0.9;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        .tables-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
            margin-bottom: 3rem;
        }
        
        .footer {
            text-align: center;
            padding: 2rem;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
            margin-top: 3rem;
        }
        
        @media (prefers-color-scheme: dark) {
            .footer {
                color: #9ca3af;
                border-top-color: #374151;
            }
        }
        
        @media (max-width: 768px) {
            .tables-grid {
                grid-template-columns: 1fr;
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .container {
                padding: 1rem;
            }
        }
    </style>
</head>
<body>%s
    <header class="header">
        <h1>📊 Coverage Dashboard</h1>
        <div class="subtitle">%s - Generated %s</div>
    </header>

    <div class="container">
        %s
        %s
        %s
        %s
    </div>

    <footer class="footer">
        Generated by Beaver Coverage Dashboard • %s
    </footer>

    <script>
        // Package Coverage Chart
        const packageCtx = document.getElementById('packageChart').getContext('2d');
        new Chart(packageCtx, {
            type: 'bar',
            data: %s,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });

        // Distribution Pie Chart
        const distributionCtx = document.getElementById('distributionChart').getContext('2d');
        new Chart(distributionCtx, {
            type: 'doughnut',
            data: %s,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    </script>
</body>
</html>`,
		data.ProjectName,
		chartGen.GetChartJSCDN(),
		headerGen.GetTailwindCSSCDN(),
		headerGen.GetHeaderCSS(),
		statCardGen.GetStatCardCSS(),
		cardGen.GetCardCSS(),
		chartGen.GetChartContainerCSS(),
		dg.getTopNavigation(),
		data.ProjectName,
		data.GeneratedAt.Format("2006-01-02 15:04:05"),
		statsHTML,
		chartsHTML,
		tablesHTML,
		recommendationsHTML,
		data.GeneratedAt.Format("2006-01-02 15:04:05"),
		dg.generateChartDataJSON(data, "PackageChart"),
		dg.generateChartDataJSON(data, "DistributionChart"),
	)
}

// generateChartDataJSON generates JSON data for charts
func (dg *DashboardGenerator) generateChartDataJSON(data *CoverageData, chartType string) string {
	chartData := dg.generateChartData(data)

	switch chartType {
	case "PackageChart":
		if chart, ok := chartData["PackageChart"].(map[string]interface{}); ok {
			return fmt.Sprintf(`{
            "labels": %v,
            "datasets": [{
                "label": "Coverage %%",
                "data": %v,
                "backgroundColor": function(context) {
                    const grades = %v;
                    const grade = grades[context.dataIndex];
                    const colors = {
                        'A': '#4CAF50', 'B': '#8BC34A', 'C': '#FF9800',
                        'D': '#FF5722', 'F': '#F44336'
                    };
                    return colors[grade] || '#666';
                },
                "borderWidth": 1
            }]
        }`, chart["Labels"], chart["Data"], chart["Grades"])
		}

	case "DistributionChart":
		if chart, ok := chartData["DistributionChart"].(map[string]interface{}); ok {
			return fmt.Sprintf(`{
            "labels": %v,
            "datasets": [{
                "data": %v,
                "backgroundColor": %v,
                "borderWidth": 2,
                "borderColor": "#fff"
            }]
        }`, chart["Labels"], chart["Data"], chart["Colors"])
		}
	}

	return "{}"
}

// getTopNavigation returns the common header banner using shared component
func (dg *DashboardGenerator) getTopNavigation() string {
	headerGen := components.NewHeaderGenerator()
	options := components.HeaderOptions{
		CurrentPage: "coverage",
		BaseURL:     "../",
		// Note: GitHub link removed to match exact Home/Issues design
	}
	return headerGen.GenerateHeader(options)
}

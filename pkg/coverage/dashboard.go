package coverage

import (
	"fmt"
	"html/template"
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

// GenerateInteractiveDashboard generates a rich interactive HTML dashboard
func (dg *DashboardGenerator) GenerateInteractiveDashboard(data *CoverageData) string {
	tmpl := template.Must(template.New("dashboard").Funcs(template.FuncMap{
		"formatPercent": func(val float64) string {
			return fmt.Sprintf("%.1f%%", val)
		},
		"getGradeColor": func(grade string) string {
			colors := map[string]string{
				"A": "#4CAF50", "B": "#8BC34A", "C": "#FF9800",
				"D": "#FF5722", "F": "#F44336",
			}
			if color, ok := colors[grade]; ok {
				return color
			}
			return "#666"
		},
		"getPriorityColor": func(priority string) string {
			colors := map[string]string{
				"High": "#F44336", "Medium": "#FF9800", "Low": "#4CAF50",
			}
			if color, ok := colors[priority]; ok {
				return color
			}
			return "#666"
		},
		"lower": func(s string) string {
			return strings.ToLower(s)
		},
	}).Parse(dg.getDashboardTemplate()))

	var builder strings.Builder
	if err := tmpl.Execute(&builder, map[string]interface{}{
		"Data":      data,
		"Generated": data.GeneratedAt.Format("2006-01-02 15:04:05"),
		"Stats":     dg.generateDashboardStats(data),
		"Charts":    dg.generateChartData(data),
	}); err != nil {
		return fmt.Sprintf("Error generating dashboard: %v", err)
	}

	return builder.String()
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

// getTopNavigation returns the common header banner using shared component
func (dg *DashboardGenerator) getTopNavigation() string {
	headerGen := components.NewHeaderGenerator()
	options := components.HeaderOptions{
		CurrentPage: "coverage",
		BaseURL:     "../",
		ExtraNavItems: []components.NavItem{
			{Label: "GitHub", URL: "https://github.com/nyasuto/beaver", IsExternal: true},
		},
	}
	return headerGen.GenerateHeader(options)
}

// getDashboardTemplate returns the HTML template for the interactive dashboard
func (dg *DashboardGenerator) getDashboardTemplate() string {
	headerGen := components.NewHeaderGenerator()

	return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Coverage Dashboard - {{.Data.ProjectName}}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    ` + headerGen.GetTailwindCSSCDN() + `
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8f9fa;
            color: #333;
            line-height: 1.6;
        }
        
        /* Header component styles */
        ` + headerGen.GetHeaderCSS() + `
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 3rem;
        }
        
        .stat-card {
            background: white;
            padding: 1.5rem;
            border-radius: 12px;
            box-shadow: 0 2px 15px rgba(0,0,0,0.1);
            text-align: center;
            transition: transform 0.2s ease;
        }
        
        .stat-card:hover {
            transform: translateY(-2px);
        }
        
        .stat-value {
            font-size: 2.5rem;
            font-weight: bold;
            margin-bottom: 0.5rem;
        }
        
        .stat-label {
            color: #666;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .grade-A { color: #4CAF50; }
        .grade-B { color: #8BC34A; }
        .grade-C { color: #FF9800; }
        .grade-D { color: #FF5722; }
        .grade-F { color: #F44336; }
        
        .charts-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
            margin-bottom: 3rem;
        }
        
        .chart-container {
            background: white;
            padding: 1.5rem;
            border-radius: 12px;
            box-shadow: 0 2px 15px rgba(0,0,0,0.1);
        }
        
        .chart-title {
            font-size: 1.2rem;
            font-weight: bold;
            margin-bottom: 1rem;
            color: #333;
        }
        
        .chart-canvas {
            max-height: 400px;
        }
        
        .tables-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
            margin-bottom: 3rem;
        }
        
        .table-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 15px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .table-header {
            background: #667eea;
            color: white;
            padding: 1rem;
            font-weight: bold;
        }
        
        .table-content {
            padding: 1rem;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        th, td {
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        
        th {
            background: #f8f9fa;
            font-weight: 600;
            color: #555;
        }
        
        .recommendations {
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 15px rgba(0,0,0,0.1);
            padding: 1.5rem;
        }
        
        .recommendation-item {
            padding: 1rem;
            margin-bottom: 1rem;
            border-left: 4px solid #667eea;
            background: #f8f9fa;
            border-radius: 0 8px 8px 0;
        }
        
        .recommendation-title {
            font-weight: bold;
            margin-bottom: 0.5rem;
        }
        
        .recommendation-priority {
            display: inline-block;
            padding: 0.2rem 0.5rem;
            border-radius: 12px;
            font-size: 0.8rem;
            color: white;
            margin-bottom: 0.5rem;
        }
        
        .priority-high { background: #F44336; }
        .priority-medium { background: #FF9800; }
        .priority-low { background: #4CAF50; }
        
        .footer {
            text-align: center;
            padding: 2rem;
            color: #666;
            border-top: 1px solid #eee;
            margin-top: 3rem;
        }
        
        @media (max-width: 768px) {
            .charts-grid, .tables-grid {
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
<body>` + dg.getTopNavigation() + `
    <header class="header">
        <h1>📊 Coverage Dashboard</h1>
        <div class="subtitle">{{.Data.ProjectName}} - Generated {{.Generated}}</div>
    </header>

    <div class="container">
        <!-- Statistics Cards -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value grade-{{.Data.QualityRating.OverallGrade}}">{{formatPercent .Data.TotalCoverage}}</div>
                <div class="stat-label">Total Coverage</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{{.Stats.TotalPackages}}</div>
                <div class="stat-label">Total Packages</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{{.Stats.TestedPackages}}/{{.Stats.TotalPackages}}</div>
                <div class="stat-label">Tested Packages</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{{.Stats.CriticalIssues}}</div>
                <div class="stat-label">Critical Issues</div>
            </div>
            <div class="stat-card">
                <div class="stat-value grade-{{.Data.QualityRating.OverallGrade}}">{{.Data.QualityRating.OverallGrade}}</div>
                <div class="stat-label">Quality Grade</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{{formatPercent .Stats.NextTarget}}</div>
                <div class="stat-label">Next Target</div>
            </div>
        </div>

        <!-- Charts -->
        <div class="charts-grid">
            <div class="chart-container">
                <div class="chart-title">📊 Package Coverage</div>
                <canvas id="packageChart" class="chart-canvas"></canvas>
            </div>
            <div class="chart-container">
                <div class="chart-title">🎯 Coverage Distribution</div>
                <canvas id="distributionChart" class="chart-canvas"></canvas>
            </div>
        </div>

        <!-- Performance Tables -->
        <div class="tables-grid">
            <div class="table-container">
                <div class="table-header">🏆 Top Performers</div>
                <div class="table-content">
                    <table>
                        <thead>
                            <tr>
                                <th>Package</th>
                                <th>Coverage</th>
                                <th>Grade</th>
                            </tr>
                        </thead>
                        <tbody>
                            {{range .Stats.TopPerformers}}
                            <tr>
                                <td>{{.PackageName}}</td>
                                <td>{{formatPercent .Coverage}}</td>
                                <td><span class="grade-{{.QualityGrade}}">{{.QualityGrade}}</span></td>
                            </tr>
                            {{end}}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="table-container">
                <div class="table-header">⚠️ Needs Attention</div>
                <div class="table-content">
                    <table>
                        <thead>
                            <tr>
                                <th>Package</th>
                                <th>Coverage</th>
                                <th>Grade</th>
                            </tr>
                        </thead>
                        <tbody>
                            {{range .Stats.NeedsAttention}}
                            <tr>
                                <td>{{.PackageName}}</td>
                                <td>{{formatPercent .Coverage}}</td>
                                <td><span class="grade-{{.QualityGrade}}">{{.QualityGrade}}</span></td>
                            </tr>
                            {{end}}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Recommendations -->
        <div class="recommendations">
            <h2>💡 Recommendations</h2>
            {{range .Data.Recommendations}}
            <div class="recommendation-item">
                <div class="recommendation-priority priority-{{.Priority | lower}}">{{.Priority}} Priority</div>
                <div class="recommendation-title">{{.Title}}</div>
                <div>{{.Description}}</div>
            </div>
            {{end}}
        </div>
    </div>

    <footer class="footer">
        Generated by Beaver Coverage Dashboard • {{.Generated}}
    </footer>

    <script>
        // Package Coverage Chart
        const packageCtx = document.getElementById('packageChart').getContext('2d');
        new Chart(packageCtx, {
            type: 'bar',
            data: {
                labels: {{.Charts.PackageChart.Labels}},
                datasets: [{
                    label: 'Coverage %',
                    data: {{.Charts.PackageChart.Data}},
                    backgroundColor: function(context) {
                        const grades = {{.Charts.PackageChart.Grades}};
                        const grade = grades[context.dataIndex];
                        const colors = {
                            'A': '#4CAF50', 'B': '#8BC34A', 'C': '#FF9800',
                            'D': '#FF5722', 'F': '#F44336'
                        };
                        return colors[grade] || '#666';
                    },
                    borderWidth: 1
                }]
            },
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
            data: {
                labels: {{.Charts.DistributionChart.Labels}},
                datasets: [{
                    data: {{.Charts.DistributionChart.Data}},
                    backgroundColor: {{.Charts.DistributionChart.Colors}},
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
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
</html>`
}

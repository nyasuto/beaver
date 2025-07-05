package coverage

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
)

// ExportOptions contains options for different export formats
type ExportOptions struct {
	Format          string // json, github-pages, ci-summary
	OutputPath      string
	IncludeCharts   bool
	MinimizeSize    bool
	IncludeMetadata bool
}

// DataExporter handles different export formats for coverage data
type DataExporter struct {
	config *CoverageConfig
}

// NewDataExporter creates a new data exporter
func NewDataExporter(config *CoverageConfig) *DataExporter {
	if config == nil {
		config = DefaultCoverageConfig()
	}

	return &DataExporter{
		config: config,
	}
}

// Export exports coverage data in the specified format
func (de *DataExporter) Export(data *CoverageData, options ExportOptions) error {
	switch options.Format {
	case "json":
		return de.exportJSON(data, options)
	case "github-pages":
		return de.exportGitHubPages(data, options)
	case "ci-summary":
		return de.exportCISummary(data, options)
	default:
		return fmt.Errorf("unsupported export format: %s", options.Format)
	}
}

// exportJSON exports full JSON data
func (de *DataExporter) exportJSON(data *CoverageData, options ExportOptions) error {
	var exportData interface{}

	if options.MinimizeSize {
		exportData = de.createMinimalJSON(data)
	} else {
		exportData = data
	}

	jsonData, err := json.MarshalIndent(exportData, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal JSON: %w", err)
	}

	return de.writeToFile(jsonData, options.OutputPath)
}

// exportGitHubPages exports data optimized for GitHub Pages
func (de *DataExporter) exportGitHubPages(data *CoverageData, options ExportOptions) error {
	pageData := GitHubPagesData{
		ProjectName:   data.ProjectName,
		GeneratedAt:   data.GeneratedAt.Format("2006-01-02T15:04:05Z"),
		TotalCoverage: data.TotalCoverage,
		QualityGrade:  data.QualityRating.OverallGrade,
		Summary:       data.Summary,
		Packages:      de.optimizePackagesForPages(data.PackageStats),
		Charts:        de.generateChartDataForPages(data),
		Metadata: GitHubPagesMetadata{
			BeaverVersion: "1.0.0", // TODO: Get from build info
			Generated:     data.GeneratedAt.Format("2006-01-02T15:04:05Z"),
		},
	}

	jsonData, err := json.MarshalIndent(pageData, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal GitHub Pages data: %w", err)
	}

	return de.writeToFile(jsonData, options.OutputPath)
}

// exportCISummary exports a CI-friendly summary
func (de *DataExporter) exportCISummary(data *CoverageData, options ExportOptions) error {
	summary := CISummary{
		TotalCoverage:   data.TotalCoverage,
		QualityGrade:    data.QualityRating.OverallGrade,
		PassedThreshold: data.TotalCoverage >= de.config.MinimumCoverage,
		CriticalIssues:  de.countCriticalIssues(data),
		PackagesSummary: de.createPackagesSummary(data.PackageStats),
		Recommendations: len(data.Recommendations),
		TopIssues:       de.getTopIssues(data.Recommendations, 3),
	}

	jsonData, err := json.MarshalIndent(summary, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal CI summary: %w", err)
	}

	return de.writeToFile(jsonData, options.OutputPath)
}

// createMinimalJSON creates a minimal version of coverage data
func (de *DataExporter) createMinimalJSON(data *CoverageData) interface{} {
	return map[string]interface{}{
		"project":         data.ProjectName,
		"generated_at":    data.GeneratedAt.Format("2006-01-02T15:04:05Z"),
		"total_coverage":  data.TotalCoverage,
		"quality_grade":   data.QualityRating.OverallGrade,
		"packages":        len(data.PackageStats),
		"tested_packages": data.Summary.TestedPackages,
		"files":           data.Summary.TotalFiles,
		"recommendations": len(data.Recommendations),
	}
}

// optimizePackagesForPages optimizes package data for web display
func (de *DataExporter) optimizePackagesForPages(packages []PackageCoverageStats) []PagePackageData {
	var optimized []PagePackageData

	for _, pkg := range packages {
		optimized = append(optimized, PagePackageData{
			Name:       pkg.PackageName,
			ShortName:  de.getShortPackageName(pkg.PackageName),
			Coverage:   pkg.Coverage,
			Grade:      pkg.QualityGrade,
			Statements: pkg.TotalStatements,
			Covered:    pkg.CoveredStatements,
			HasTests:   pkg.HasTests,
		})
	}

	// Sort by coverage descending
	sort.Slice(optimized, func(i, j int) bool {
		return optimized[i].Coverage > optimized[j].Coverage
	})

	return optimized
}

// generateChartDataForPages generates chart data optimized for web display
func (de *DataExporter) generateChartDataForPages(data *CoverageData) PageChartData {
	// Package coverage chart
	var packageNames []string
	var packageCoverages []float64
	var packageColors []string

	for _, pkg := range data.PackageStats {
		packageNames = append(packageNames, de.getShortPackageName(pkg.PackageName))
		packageCoverages = append(packageCoverages, pkg.Coverage)
		packageColors = append(packageColors, de.getGradeColor(pkg.QualityGrade))
	}

	// Grade distribution
	distribution := de.calculateGradeDistribution(data.PackageStats)

	return PageChartData{
		PackageChart: ChartDataSet{
			Labels: packageNames,
			Data:   packageCoverages,
			Colors: packageColors,
		},
		GradeDistribution: ChartDataSet{
			Labels: []string{"A", "B", "C", "D", "F"},
			Data:   []float64{float64(distribution["A"]), float64(distribution["B"]), float64(distribution["C"]), float64(distribution["D"]), float64(distribution["F"])},
			Colors: []string{"#4CAF50", "#8BC34A", "#FF9800", "#FF5722", "#F44336"},
		},
	}
}

// getShortPackageName extracts short package name for display
func (de *DataExporter) getShortPackageName(fullName string) string {
	parts := filepath.SplitList(fullName)
	if len(parts) == 0 {
		return fullName
	}

	// Return the last part of the package path
	return filepath.Base(fullName)
}

// getGradeColor returns color for quality grade
func (de *DataExporter) getGradeColor(grade string) string {
	colors := map[string]string{
		"A": "#4CAF50", "B": "#8BC34A", "C": "#FF9800",
		"D": "#FF5722", "F": "#F44336",
	}
	if color, ok := colors[grade]; ok {
		return color
	}
	return "#666"
}

// calculateGradeDistribution calculates distribution of packages by grade
func (de *DataExporter) calculateGradeDistribution(packages []PackageCoverageStats) map[string]int {
	distribution := map[string]int{"A": 0, "B": 0, "C": 0, "D": 0, "F": 0}

	for _, pkg := range packages {
		if _, ok := distribution[pkg.QualityGrade]; ok {
			distribution[pkg.QualityGrade]++
		}
	}

	return distribution
}

// countCriticalIssues counts critical issues
func (de *DataExporter) countCriticalIssues(data *CoverageData) int {
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

// createPackagesSummary creates a summary of package statistics
func (de *DataExporter) createPackagesSummary(packages []PackageCoverageStats) PackagesSummary {
	summary := PackagesSummary{
		Total:  len(packages),
		Tested: 0,
		GradeA: 0,
		GradeB: 0,
		GradeC: 0,
		GradeD: 0,
		GradeF: 0,
	}

	for _, pkg := range packages {
		if pkg.HasTests {
			summary.Tested++
		}

		switch pkg.QualityGrade {
		case "A":
			summary.GradeA++
		case "B":
			summary.GradeB++
		case "C":
			summary.GradeC++
		case "D":
			summary.GradeD++
		case "F":
			summary.GradeF++
		}
	}

	return summary
}

// getTopIssues returns top priority issues
func (de *DataExporter) getTopIssues(recommendations []Recommendation, limit int) []string {
	var issues []string

	for _, rec := range recommendations {
		if rec.Priority == "High" && len(issues) < limit {
			issues = append(issues, rec.Title)
		}
	}

	// Fill with medium priority if needed
	for _, rec := range recommendations {
		if rec.Priority == "Medium" && len(issues) < limit {
			issues = append(issues, rec.Title)
		}
	}

	return issues
}

// writeToFile writes data to file
func (de *DataExporter) writeToFile(data []byte, outputPath string) error {
	return os.WriteFile(outputPath, data, 0600) // Secure permissions
}

// Data structures for different export formats

// GitHubPagesData represents data optimized for GitHub Pages
type GitHubPagesData struct {
	ProjectName   string              `json:"project_name"`
	GeneratedAt   string              `json:"generated_at"`
	TotalCoverage float64             `json:"total_coverage"`
	QualityGrade  string              `json:"quality_grade"`
	Summary       CoverageSummary     `json:"summary"`
	Packages      []PagePackageData   `json:"packages"`
	Charts        PageChartData       `json:"charts"`
	Metadata      GitHubPagesMetadata `json:"metadata"`
}

// GitHubPagesMetadata contains metadata for GitHub Pages
type GitHubPagesMetadata struct {
	BeaverVersion string `json:"beaver_version"`
	Generated     string `json:"generated"`
}

// PagePackageData represents package data for web pages
type PagePackageData struct {
	Name       string  `json:"name"`
	ShortName  string  `json:"short_name"`
	Coverage   float64 `json:"coverage"`
	Grade      string  `json:"grade"`
	Statements int     `json:"statements"`
	Covered    int     `json:"covered"`
	HasTests   bool    `json:"has_tests"`
}

// PageChartData contains chart data for web pages
type PageChartData struct {
	PackageChart      ChartDataSet `json:"package_chart"`
	GradeDistribution ChartDataSet `json:"grade_distribution"`
}

// ChartDataSet represents a set of chart data
type ChartDataSet struct {
	Labels []string  `json:"labels"`
	Data   []float64 `json:"data"`
	Colors []string  `json:"colors"`
}

// CISummary represents a CI-friendly summary
type CISummary struct {
	TotalCoverage   float64         `json:"total_coverage"`
	QualityGrade    string          `json:"quality_grade"`
	PassedThreshold bool            `json:"passed_threshold"`
	CriticalIssues  int             `json:"critical_issues"`
	PackagesSummary PackagesSummary `json:"packages_summary"`
	Recommendations int             `json:"recommendations"`
	TopIssues       []string        `json:"top_issues"`
}

// PackagesSummary summarizes package statistics
type PackagesSummary struct {
	Total  int `json:"total"`
	Tested int `json:"tested"`
	GradeA int `json:"grade_a"`
	GradeB int `json:"grade_b"`
	GradeC int `json:"grade_c"`
	GradeD int `json:"grade_d"`
	GradeF int `json:"grade_f"`
}

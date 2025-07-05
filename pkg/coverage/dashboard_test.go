package coverage

import (
	"strings"
	"testing"
	"time"
)

// TestNewDashboardGenerator tests dashboard generator creation
func TestNewDashboardGenerator(t *testing.T) {
	tests := []struct {
		name   string
		config *CoverageConfig
	}{
		{
			name:   "with nil config",
			config: nil,
		},
		{
			name:   "with custom config",
			config: DefaultCoverageConfig(),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			generator := NewDashboardGenerator(tt.config)

			if generator == nil {
				t.Error("Expected non-nil dashboard generator")
			}

			if generator.config == nil {
				t.Error("Expected config to be set")
			}
		})
	}
}

// TestDashboardGenerator_GenerateInteractiveDashboard tests dashboard HTML generation
func TestDashboardGenerator_GenerateInteractiveDashboard(t *testing.T) {
	generator := NewDashboardGenerator(nil)

	// Create sample coverage data
	coverageData := &CoverageData{
		ProjectName:   "test-project",
		GeneratedAt:   time.Now(),
		TotalCoverage: 85.5,
		PackageStats: []PackageCoverageStats{
			{
				PackageName:       "pkg/utils",
				Coverage:          90.0,
				QualityGrade:      "A",
				TotalStatements:   200,
				CoveredStatements: 180,
				HasTests:          true,
			},
			{
				PackageName:       "pkg/models",
				Coverage:          75.0,
				QualityGrade:      "C",
				TotalStatements:   150,
				CoveredStatements: 112,
				HasTests:          true,
			},
		},
		FileCoverage: []FileCoverageStats{
			{
				FileName:          "pkg/utils/helper.go",
				Coverage:          95.0,
				TotalStatements:   100,
				CoveredStatements: 95,
				ComplexityScore:   5,
			},
		},
		Summary: CoverageSummary{
			TotalPackages:    2,
			TestedPackages:   2,
			UntestedPackages: 0,
			TotalFiles:       9,
			TestedFiles:      8,
		},
		QualityRating: QualityRating{
			OverallGrade: "B",
			NextTarget:   90.0,
		},
		Recommendations: []Recommendation{
			{
				Title:       "Improve test coverage for pkg/models",
				Description: "Package has 75% coverage, consider adding more tests",
				Priority:    "Medium",
				Category:    "Coverage",
			},
		},
	}

	// Generate dashboard
	htmlContent := generator.GenerateInteractiveDashboard(coverageData)

	// Verify basic HTML structure
	if !strings.Contains(htmlContent, "<!DOCTYPE html>") {
		t.Error("Generated dashboard does not contain HTML declaration")
	}

	if !strings.Contains(htmlContent, "<html lang=\"ja\">") {
		t.Error("Generated dashboard does not contain proper HTML tag")
	}

	if !strings.Contains(htmlContent, "Coverage Dashboard") {
		t.Error("Generated dashboard does not contain title")
	}

	// Verify project name is included
	if !strings.Contains(htmlContent, "test-project") {
		t.Error("Generated dashboard does not contain project name")
	}

	// Verify coverage percentage is included
	if !strings.Contains(htmlContent, "85.5%") {
		t.Error("Generated dashboard does not contain total coverage")
	}

	// Verify CSS is included
	if !strings.Contains(htmlContent, "<style>") {
		t.Error("Generated dashboard does not contain CSS styles")
	}

	// Verify Tailwind CSS CDN is included
	if !strings.Contains(htmlContent, "tailwindcss.com") {
		t.Error("Generated dashboard does not contain Tailwind CSS CDN")
	}

	// Verify Chart.js is included
	if !strings.Contains(htmlContent, "chart.js") {
		t.Error("Generated dashboard does not contain Chart.js")
	}

	// Verify package statistics are included
	if !strings.Contains(htmlContent, "pkg/utils") {
		t.Error("Generated dashboard does not contain package names")
	}

	// Verify quality grades are included
	if !strings.Contains(htmlContent, "grade-A") || !strings.Contains(htmlContent, "grade-C") {
		t.Error("Generated dashboard does not contain quality grades")
	}

	// Verify recommendations are included
	if !strings.Contains(htmlContent, "Improve test coverage") {
		t.Error("Generated dashboard does not contain recommendations")
	}

	// Verify JavaScript chart initialization is included
	if !strings.Contains(htmlContent, "new Chart(") {
		t.Error("Generated dashboard does not contain chart initialization")
	}
}

// TestDashboardGenerator_generateDashboardStats tests statistics generation
func TestDashboardGenerator_generateDashboardStats(t *testing.T) {
	generator := NewDashboardGenerator(nil)

	coverageData := &CoverageData{
		TotalCoverage: 80.0,
		Summary: CoverageSummary{
			TotalPackages:    5,
			TestedPackages:   4,
			UntestedPackages: 1,
			TotalFiles:       20,
			TestedFiles:      18,
		},
		QualityRating: QualityRating{
			OverallGrade: "B",
			NextTarget:   85.0,
		},
		PackageStats: []PackageCoverageStats{
			{PackageName: "pkg1", Coverage: 90.0, QualityGrade: "A"},
			{PackageName: "pkg2", Coverage: 85.0, QualityGrade: "B"},
			{PackageName: "pkg3", Coverage: 75.0, QualityGrade: "C"},
			{PackageName: "pkg4", Coverage: 60.0, QualityGrade: "D"},
			{PackageName: "pkg5", Coverage: 40.0, QualityGrade: "F"},
		},
		Recommendations: []Recommendation{
			{Priority: "High"},
			{Priority: "Medium"},
			{Priority: "Low"},
		},
	}

	stats := generator.generateDashboardStats(coverageData)

	// Verify all expected keys are present
	expectedKeys := []string{
		"TotalCoverage", "TotalPackages", "TotalFiles", "TestedPackages", "TestedFiles",
		"UntestedPackages", "CriticalIssues", "QualityGrade", "NextTarget",
		"Distribution", "TopPerformers", "NeedsAttention",
	}

	for _, key := range expectedKeys {
		if _, exists := stats[key]; !exists {
			t.Errorf("Expected key %s not found in stats", key)
		}
	}

	// Verify specific values
	if stats["TotalCoverage"] != 80.0 {
		t.Errorf("Expected TotalCoverage 80.0, got %v", stats["TotalCoverage"])
	}

	if stats["QualityGrade"] != "B" {
		t.Errorf("Expected QualityGrade B, got %v", stats["QualityGrade"])
	}

	// Verify distribution calculation
	distribution, ok := stats["Distribution"].(map[string]int)
	if !ok {
		t.Error("Expected Distribution to be map[string]int")
	} else {
		expectedDistribution := map[string]int{"A": 1, "B": 1, "C": 1, "D": 1, "F": 1}
		for grade, count := range expectedDistribution {
			if distribution[grade] != count {
				t.Errorf("Expected distribution[%s] = %d, got %d", grade, count, distribution[grade])
			}
		}
	}
}

// TestDashboardGenerator_generateChartData tests chart data generation
func TestDashboardGenerator_generateChartData(t *testing.T) {
	generator := NewDashboardGenerator(nil)

	coverageData := &CoverageData{
		PackageStats: []PackageCoverageStats{
			{PackageName: "pkg1", Coverage: 90.0, QualityGrade: "A"},
			{PackageName: "pkg2", Coverage: 75.0, QualityGrade: "C"},
		},
		FileCoverage: []FileCoverageStats{
			{FileName: "file1.go", Coverage: 85.0, ComplexityScore: 5},
			{FileName: "file2.go", Coverage: 70.0, ComplexityScore: 8},
		},
	}

	charts := generator.generateChartData(coverageData)

	// Verify PackageChart
	packageChart, ok := charts["PackageChart"].(map[string]interface{})
	if !ok {
		t.Error("Expected PackageChart to be map[string]interface{}")
	} else {
		labels, ok := packageChart["Labels"].([]string)
		if !ok || len(labels) != 2 {
			t.Error("Expected PackageChart Labels to be []string with 2 elements")
		}

		data, ok := packageChart["Data"].([]float64)
		if !ok || len(data) != 2 {
			t.Error("Expected PackageChart Data to be []float64 with 2 elements")
		}

		grades, ok := packageChart["Grades"].([]string)
		if !ok || len(grades) != 2 {
			t.Error("Expected PackageChart Grades to be []string with 2 elements")
		}
	}

	// Verify DistributionChart
	distributionChart, ok := charts["DistributionChart"].(map[string]interface{})
	if !ok {
		t.Error("Expected DistributionChart to be map[string]interface{}")
	} else {
		labels, ok := distributionChart["Labels"].([]string)
		if !ok || len(labels) != 5 {
			t.Error("Expected DistributionChart Labels to have 5 elements")
		}

		data, ok := distributionChart["Data"].([]int)
		if !ok || len(data) != 5 {
			t.Error("Expected DistributionChart Data to have 5 elements")
		}

		colors, ok := distributionChart["Colors"].([]string)
		if !ok || len(colors) != 5 {
			t.Error("Expected DistributionChart Colors to have 5 elements")
		}
	}

	// Verify ComplexityChart
	complexityChart, ok := charts["ComplexityChart"].(map[string]interface{})
	if !ok {
		t.Error("Expected ComplexityChart to be map[string]interface{}")
	} else {
		files, ok := complexityChart["Files"].([]string)
		if !ok || len(files) != 2 {
			t.Error("Expected ComplexityChart Files to have 2 elements")
		}

		coverages, ok := complexityChart["Coverages"].([]float64)
		if !ok || len(coverages) != 2 {
			t.Error("Expected ComplexityChart Coverages to have 2 elements")
		}

		complexities, ok := complexityChart["Complexities"].([]int)
		if !ok || len(complexities) != 2 {
			t.Error("Expected ComplexityChart Complexities to have 2 elements")
		}
	}
}

// TestDashboardGenerator_calculateCoverageDistribution tests distribution calculation
func TestDashboardGenerator_calculateCoverageDistribution(t *testing.T) {
	generator := NewDashboardGenerator(nil)

	coverageData := &CoverageData{
		PackageStats: []PackageCoverageStats{
			{QualityGrade: "A"},
			{QualityGrade: "A"},
			{QualityGrade: "B"},
			{QualityGrade: "C"},
			{QualityGrade: "D"},
			{QualityGrade: "F"},
			{QualityGrade: "F"},
		},
	}

	distribution := generator.calculateCoverageDistribution(coverageData)

	expectedDistribution := map[string]int{
		"A": 2,
		"B": 1,
		"C": 1,
		"D": 1,
		"F": 2,
	}

	for grade, expectedCount := range expectedDistribution {
		if distribution[grade] != expectedCount {
			t.Errorf("Expected distribution[%s] = %d, got %d", grade, expectedCount, distribution[grade])
		}
	}
}

// TestDashboardGenerator_getTopPerformers tests top performers selection
func TestDashboardGenerator_getTopPerformers(t *testing.T) {
	generator := NewDashboardGenerator(nil)

	packages := []PackageCoverageStats{
		{PackageName: "pkg1", Coverage: 95.0},
		{PackageName: "pkg2", Coverage: 85.0},
		{PackageName: "pkg3", Coverage: 75.0},
		{PackageName: "pkg4", Coverage: 65.0},
		{PackageName: "pkg5", Coverage: 55.0},
		{PackageName: "pkg6", Coverage: 45.0},
	}

	topPerformers := generator.getTopPerformers(packages, 3)

	if len(topPerformers) != 3 {
		t.Errorf("Expected 3 top performers, got %d", len(topPerformers))
	}

	// Verify they are sorted by coverage (highest first)
	expectedOrder := []string{"pkg1", "pkg2", "pkg3"}
	for i, expected := range expectedOrder {
		if topPerformers[i].PackageName != expected {
			t.Errorf("Expected top performer %d to be %s, got %s", i, expected, topPerformers[i].PackageName)
		}
	}

	// Verify coverage values are in descending order
	for i := 1; i < len(topPerformers); i++ {
		if topPerformers[i-1].Coverage < topPerformers[i].Coverage {
			t.Error("Top performers are not sorted by coverage in descending order")
		}
	}
}

// TestDashboardGenerator_getNeedsAttention tests needs attention selection
func TestDashboardGenerator_getNeedsAttention(t *testing.T) {
	config := &CoverageConfig{
		MinimumCoverage: 70.0,
	}
	generator := NewDashboardGenerator(config)

	packages := []PackageCoverageStats{
		{PackageName: "pkg1", Coverage: 95.0, QualityGrade: "A"},
		{PackageName: "pkg2", Coverage: 65.0, QualityGrade: "D"}, // Below minimum
		{PackageName: "pkg3", Coverage: 45.0, QualityGrade: "F"}, // Grade F
		{PackageName: "pkg4", Coverage: 55.0, QualityGrade: "D"}, // Below minimum
		{PackageName: "pkg5", Coverage: 80.0, QualityGrade: "B"}, // Above minimum
	}

	needsAttention := generator.getNeedsAttention(packages, 5)

	// Should include pkg2, pkg3, pkg4 (coverage < 70 or grade F/D)
	expectedCount := 3
	if len(needsAttention) != expectedCount {
		t.Errorf("Expected %d packages needing attention, got %d", expectedCount, len(needsAttention))
	}

	// Verify they are sorted by coverage (lowest first)
	for i := 1; i < len(needsAttention); i++ {
		if needsAttention[i-1].Coverage > needsAttention[i].Coverage {
			t.Error("Packages needing attention are not sorted by coverage in ascending order")
		}
	}

	// Verify pkg1 and pkg5 are not included
	for _, pkg := range needsAttention {
		if pkg.PackageName == "pkg1" || pkg.PackageName == "pkg5" {
			t.Errorf("Package %s should not be in needs attention list", pkg.PackageName)
		}
	}
}

// TestDashboardGenerator_countCriticalIssues tests critical issues counting
func TestDashboardGenerator_countCriticalIssues(t *testing.T) {
	generator := NewDashboardGenerator(nil)

	coverageData := &CoverageData{
		PackageStats: []PackageCoverageStats{
			{Coverage: 45.0, QualityGrade: "F"}, // Critical: coverage < 50
			{Coverage: 35.0, QualityGrade: "F"}, // Critical: both conditions
			{Coverage: 65.0, QualityGrade: "D"}, // Not critical
			{Coverage: 85.0, QualityGrade: "B"}, // Not critical
		},
		Recommendations: []Recommendation{
			{Priority: "High"},   // Critical
			{Priority: "High"},   // Critical
			{Priority: "Medium"}, // Not critical
			{Priority: "Low"},    // Not critical
		},
	}

	critical := generator.countCriticalIssues(coverageData)

	// Expected: 2 packages with F grade + 2 high priority recommendations = 4
	expectedCritical := 4
	if critical != expectedCritical {
		t.Errorf("Expected %d critical issues, got %d", expectedCritical, critical)
	}
}

// TestDashboardGenerator_getTopNavigation tests header generation
func TestDashboardGenerator_getTopNavigation(t *testing.T) {
	generator := NewDashboardGenerator(nil)

	headerHTML := generator.getTopNavigation()

	// Verify header contains expected elements
	if !strings.Contains(headerHTML, "header") {
		t.Error("Header HTML does not contain header element")
	}

	if !strings.Contains(headerHTML, "Beaver") {
		t.Error("Header HTML does not contain Beaver title")
	}

	if !strings.Contains(headerHTML, "ホーム") {
		t.Error("Header HTML does not contain home navigation")
	}

	if !strings.Contains(headerHTML, "Issues") {
		t.Error("Header HTML does not contain issues navigation")
	}

	// Verify navigation links use correct paths
	if !strings.Contains(headerHTML, "/beaver/") {
		t.Error("Header HTML does not contain correct navigation paths")
	}
}

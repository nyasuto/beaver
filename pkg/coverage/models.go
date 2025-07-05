package coverage

import (
	"time"
)

// CoverageData represents comprehensive code coverage information
type CoverageData struct {
	ProjectName     string                  `json:"project_name"`
	GeneratedAt     time.Time               `json:"generated_at"`
	TotalCoverage   float64                 `json:"total_coverage"`
	PackageStats    []PackageCoverageStats  `json:"package_stats"`
	FileCoverage    []FileCoverageStats     `json:"file_coverage"`
	FunctionStats   []FunctionCoverageStats `json:"function_stats"`
	Summary         CoverageSummary         `json:"summary"`
	QualityRating   QualityRating           `json:"quality_rating"`
	Recommendations []Recommendation        `json:"recommendations"`
	TrendData       *CoverageTrend          `json:"trend_data,omitempty"`
}

// PackageCoverageStats contains coverage statistics for a Go package
type PackageCoverageStats struct {
	PackageName       string  `json:"package_name"`
	Coverage          float64 `json:"coverage"`
	TotalStatements   int     `json:"total_statements"`
	CoveredStatements int     `json:"covered_statements"`
	TestFiles         int     `json:"test_files"`
	QualityGrade      string  `json:"quality_grade"` // A, B, C, D
	HasTests          bool    `json:"has_tests"`
}

// FileCoverageStats contains coverage statistics for individual files
type FileCoverageStats struct {
	FileName          string                  `json:"file_name"`
	PackageName       string                  `json:"package_name"`
	Coverage          float64                 `json:"coverage"`
	TotalStatements   int                     `json:"total_statements"`
	CoveredStatements int                     `json:"covered_statements"`
	UncoveredLines    []int                   `json:"uncovered_lines"`
	Functions         []FunctionCoverageStats `json:"functions"`
	ComplexityScore   int                     `json:"complexity_score"`
}

// FunctionCoverageStats contains coverage statistics for individual functions
type FunctionCoverageStats struct {
	FunctionName      string  `json:"function_name"`
	FileName          string  `json:"file_name"`
	StartLine         int     `json:"start_line"`
	EndLine           int     `json:"end_line"`
	Coverage          float64 `json:"coverage"`
	TotalStatements   int     `json:"total_statements"`
	CoveredStatements int     `json:"covered_statements"`
	Complexity        int     `json:"complexity"`
	IsCritical        bool    `json:"is_critical"`
}

// CoverageSummary provides high-level coverage metrics
type CoverageSummary struct {
	TotalPackages     int     `json:"total_packages"`
	TestedPackages    int     `json:"tested_packages"`
	UntestedPackages  int     `json:"untested_packages"`
	TotalFiles        int     `json:"total_files"`
	TestedFiles       int     `json:"tested_files"`
	TotalFunctions    int     `json:"total_functions"`
	TestedFunctions   int     `json:"tested_functions"`
	AverageCoverage   float64 `json:"average_coverage"`
	WeightedCoverage  float64 `json:"weighted_coverage"`
	CriticalUncovered int     `json:"critical_uncovered"`
}

// QualityRating provides overall quality assessment
type QualityRating struct {
	OverallGrade     string  `json:"overall_grade"` // A, B, C, D, F
	Score            float64 `json:"score"`         // 0-100
	CoverageGrade    string  `json:"coverage_grade"`
	TestQualityGrade string  `json:"test_quality_grade"`
	Description      string  `json:"description"`
	NextTarget       float64 `json:"next_target"` // Next coverage target to aim for
}

// Recommendation provides actionable improvement suggestions
type Recommendation struct {
	Priority    string   `json:"priority"` // High, Medium, Low
	Category    string   `json:"category"` // Coverage, Testing, Refactoring
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Impact      string   `json:"impact"` // Expected improvement
	Effort      string   `json:"effort"` // Low, Medium, High
	Files       []string `json:"files,omitempty"`
	Functions   []string `json:"functions,omitempty"`
}

// CoverageTrend tracks coverage changes over time
type CoverageTrend struct {
	Previous        *CoverageSnapshot `json:"previous,omitempty"`
	Current         CoverageSnapshot  `json:"current"`
	ChangeDirection string            `json:"change_direction"` // Improving, Declining, Stable
	CoverageChange  float64           `json:"coverage_change"`  // Percentage point change
	PackageChanges  []PackageChange   `json:"package_changes"`
}

// CoverageSnapshot represents coverage at a specific point in time
type CoverageSnapshot struct {
	Timestamp     time.Time `json:"timestamp"`
	TotalCoverage float64   `json:"total_coverage"`
	PackageCount  int       `json:"package_count"`
	TestFileCount int       `json:"test_file_count"`
	GitCommit     string    `json:"git_commit,omitempty"`
}

// PackageChange tracks coverage changes for individual packages
type PackageChange struct {
	PackageName      string  `json:"package_name"`
	PreviousCoverage float64 `json:"previous_coverage"`
	CurrentCoverage  float64 `json:"current_coverage"`
	Change           float64 `json:"change"`
	ChangeType       string  `json:"change_type"` // Improved, Declined, New, Removed
}

// CoverageProfile represents parsed coverage profile data
type CoverageProfile struct {
	FileName     string          `json:"file_name"`
	Mode         string          `json:"mode"`
	Blocks       []CoverageBlock `json:"blocks"`
	TotalLines   int             `json:"total_lines"`
	CoveredLines int             `json:"covered_lines"`
	Coverage     float64         `json:"coverage"`
}

// CoverageBlock represents a single coverage block from go test output
type CoverageBlock struct {
	StartLine  int  `json:"start_line"`
	StartCol   int  `json:"start_col"`
	EndLine    int  `json:"end_line"`
	EndCol     int  `json:"end_col"`
	Statements int  `json:"statements"`
	Count      int  `json:"count"`
	IsCovered  bool `json:"is_covered"`
}

// CoverageConfig contains configuration for coverage analysis
type CoverageConfig struct {
	// Coverage targets
	MinimumCoverage   float64 `json:"minimum_coverage" yaml:"minimum_coverage"`
	GoodCoverage      float64 `json:"good_coverage" yaml:"good_coverage"`
	ExcellentCoverage float64 `json:"excellent_coverage" yaml:"excellent_coverage"`

	// Package filtering
	ExcludePackages []string `json:"exclude_packages" yaml:"exclude_packages"`
	IncludePackages []string `json:"include_packages" yaml:"include_packages"`
	ExcludeFiles    []string `json:"exclude_files" yaml:"exclude_files"`

	// Analysis settings
	EnableComplexityAnalysis bool `json:"enable_complexity_analysis" yaml:"enable_complexity_analysis"`
	EnableTrendAnalysis      bool `json:"enable_trend_analysis" yaml:"enable_trend_analysis"`
	MaxHistoryDays           int  `json:"max_history_days" yaml:"max_history_days"`

	// Output settings
	OutputFormat   string `json:"output_format" yaml:"output_format"` // json, html, console
	GenerateReport bool   `json:"generate_report" yaml:"generate_report"`
	ReportPath     string `json:"report_path" yaml:"report_path"`
}

// DefaultCoverageConfig returns default configuration for coverage analysis
func DefaultCoverageConfig() *CoverageConfig {
	return &CoverageConfig{
		MinimumCoverage:          50.0,
		GoodCoverage:             70.0,
		ExcellentCoverage:        90.0,
		ExcludePackages:          []string{"vendor/", "internal/test/"},
		EnableComplexityAnalysis: true,
		EnableTrendAnalysis:      true,
		MaxHistoryDays:           30,
		OutputFormat:             "json",
		GenerateReport:           true,
		ReportPath:               "coverage-report.html",
	}
}

// GetQualityGrade returns a quality grade based on coverage percentage
func GetQualityGrade(coverage float64) string {
	switch {
	case coverage >= 90.0:
		return "A"
	case coverage >= 80.0:
		return "B"
	case coverage >= 70.0:
		return "C"
	case coverage >= 50.0:
		return "D"
	default:
		return "F"
	}
}

// GetQualityDescription returns a description for the quality grade
func GetQualityDescription(grade string) string {
	descriptions := map[string]string{
		"A": "Excellent coverage - Well tested code",
		"B": "Good coverage - Mostly covered with some gaps",
		"C": "Fair coverage - Adequate but could be improved",
		"D": "Poor coverage - Significant testing gaps",
		"F": "Very poor coverage - Minimal or no testing",
	}

	if desc, exists := descriptions[grade]; exists {
		return desc
	}
	return "Unknown quality grade"
}

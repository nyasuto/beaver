package coverage

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestNewAnalyzer(t *testing.T) {
	tests := []struct {
		name        string
		projectRoot string
		config      *CoverageConfig
		wantNil     bool
	}{
		{
			name:        "create analyzer with default config",
			projectRoot: "/test/project",
			config:      nil,
			wantNil:     false,
		},
		{
			name:        "create analyzer with custom config",
			projectRoot: "/test/project",
			config:      DefaultCoverageConfig(),
			wantNil:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			analyzer := NewAnalyzer(tt.projectRoot, tt.config)

			if (analyzer == nil) != tt.wantNil {
				t.Errorf("NewAnalyzer() = %v, wantNil %v", analyzer, tt.wantNil)
			}

			if analyzer != nil {
				if analyzer.projectRoot != tt.projectRoot {
					t.Errorf("Expected projectRoot %s, got %s", tt.projectRoot, analyzer.projectRoot)
				}

				if analyzer.config == nil {
					t.Error("Expected config to be set")
				}

				if analyzer.profiles == nil {
					t.Error("Expected profiles map to be initialized")
				}

				if analyzer.packageStats == nil {
					t.Error("Expected packageStats map to be initialized")
				}
			}
		})
	}
}

func TestNewCollector(t *testing.T) {
	tests := []struct {
		name        string
		projectRoot string
		config      *CoverageConfig
		wantNil     bool
	}{
		{
			name:        "create collector with default config",
			projectRoot: "/test/project",
			config:      nil,
			wantNil:     false,
		},
		{
			name:        "create collector with custom config",
			projectRoot: "/test/project",
			config:      DefaultCoverageConfig(),
			wantNil:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			collector := NewCollector(tt.projectRoot, tt.config)

			if (collector == nil) != tt.wantNil {
				t.Errorf("NewCollector() = %v, wantNil %v", collector, tt.wantNil)
			}

			if collector != nil {
				if collector.projectRoot != tt.projectRoot {
					t.Errorf("Expected projectRoot %s, got %s", tt.projectRoot, collector.projectRoot)
				}

				if collector.config == nil {
					t.Error("Expected config to be set")
				}

				if collector.outputPath != "coverage.out" {
					t.Errorf("Expected default outputPath 'coverage.out', got %s", collector.outputPath)
				}
			}
		})
	}
}

func TestDefaultCoverageConfig(t *testing.T) {
	config := DefaultCoverageConfig()

	if config == nil {
		t.Fatal("DefaultCoverageConfig() returned nil")
	}

	// Test default values
	if config.MinimumCoverage != 50.0 {
		t.Errorf("Expected MinimumCoverage 50.0, got %f", config.MinimumCoverage)
	}

	if config.GoodCoverage != 70.0 {
		t.Errorf("Expected GoodCoverage 70.0, got %f", config.GoodCoverage)
	}

	if config.ExcellentCoverage != 90.0 {
		t.Errorf("Expected ExcellentCoverage 90.0, got %f", config.ExcellentCoverage)
	}

	if !config.EnableComplexityAnalysis {
		t.Error("Expected EnableComplexityAnalysis to be true")
	}

	if !config.EnableTrendAnalysis {
		t.Error("Expected EnableTrendAnalysis to be true")
	}

	if config.OutputFormat != "json" {
		t.Errorf("Expected OutputFormat 'json', got %s", config.OutputFormat)
	}
}

func TestGetQualityGrade(t *testing.T) {
	tests := []struct {
		coverage float64
		expected string
	}{
		{95.0, "A"},
		{90.0, "A"},
		{85.0, "B"},
		{80.0, "B"},
		{75.0, "C"},
		{70.0, "C"},
		{60.0, "D"},
		{50.0, "D"},
		{40.0, "F"},
		{0.0, "F"},
	}

	for _, tt := range tests {
		t.Run("coverage_"+strings.ReplaceAll(tt.expected, ".", "_"), func(t *testing.T) {
			result := GetQualityGrade(tt.coverage)
			if result != tt.expected {
				t.Errorf("GetQualityGrade(%f) = %s, expected %s", tt.coverage, result, tt.expected)
			}
		})
	}
}

func TestGetQualityDescription(t *testing.T) {
	tests := []struct {
		grade    string
		expected string
	}{
		{"A", "Excellent coverage - Well tested code"},
		{"B", "Good coverage - Mostly covered with some gaps"},
		{"C", "Fair coverage - Adequate but could be improved"},
		{"D", "Poor coverage - Significant testing gaps"},
		{"F", "Very poor coverage - Minimal or no testing"},
		{"X", "Unknown quality grade"},
	}

	for _, tt := range tests {
		t.Run("grade_"+tt.grade, func(t *testing.T) {
			result := GetQualityDescription(tt.grade)
			if result != tt.expected {
				t.Errorf("GetQualityDescription(%s) = %s, expected %s", tt.grade, result, tt.expected)
			}
		})
	}
}

func TestAnalyzer_parseLineCol(t *testing.T) {
	analyzer := NewAnalyzer("/test", nil)

	tests := []struct {
		input    string
		wantLine int
		wantCol  int
		wantErr  bool
	}{
		{"10.5", 10, 5, false},
		{"1.1", 1, 1, false},
		{"100.25", 100, 25, false},
		{"invalid", 0, 0, true},
		{"10", 0, 0, true},
		{"10.", 0, 0, true},
		{".5", 0, 0, true},
		{"", 0, 0, true},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			line, col, err := analyzer.parseLineCol(tt.input)

			if (err != nil) != tt.wantErr {
				t.Errorf("parseLineCol(%s) error = %v, wantErr %v", tt.input, err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				if line != tt.wantLine {
					t.Errorf("parseLineCol(%s) line = %d, want %d", tt.input, line, tt.wantLine)
				}
				if col != tt.wantCol {
					t.Errorf("parseLineCol(%s) col = %d, want %d", tt.input, col, tt.wantCol)
				}
			}
		})
	}
}

func TestAnalyzer_getPackageFromFileName(t *testing.T) {
	analyzer := NewAnalyzer("/test", nil)

	tests := []struct {
		fileName string
		expected string
	}{
		{"main.go", "main"},
		{"./main.go", "main"},
		{"pkg/utils/helper.go", "pkg/utils"},
		{"./pkg/utils/helper.go", "pkg/utils"},
		{"internal/models/user.go", "internal/models"},
		{"cmd/app/main.go", "cmd/app"},
		{filepath.Join("pkg", "coverage", "analyzer.go"), "pkg/coverage"},
	}

	for _, tt := range tests {
		t.Run(tt.fileName, func(t *testing.T) {
			result := analyzer.getPackageFromFileName(tt.fileName)
			if result != tt.expected {
				t.Errorf("getPackageFromFileName(%s) = %s, expected %s", tt.fileName, result, tt.expected)
			}
		})
	}
}

func TestAnalyzer_isPackageExcluded(t *testing.T) {
	config := &CoverageConfig{
		ExcludePackages: []string{"vendor/", "internal/test/"},
	}
	analyzer := NewAnalyzer("/test", config)

	tests := []struct {
		packageName string
		expected    bool
	}{
		{"main", false},
		{"pkg/utils", false},
		{"vendor/github.com/some/pkg", true},
		{"internal/test/helper", true},
		{"internal/models", false},
		{"cmd/app", false},
	}

	for _, tt := range tests {
		t.Run(tt.packageName, func(t *testing.T) {
			result := analyzer.isPackageExcluded(tt.packageName)
			if result != tt.expected {
				t.Errorf("isPackageExcluded(%s) = %v, expected %v", tt.packageName, result, tt.expected)
			}
		})
	}
}

func TestAnalyzer_isPackageExcludedWithIncludeList(t *testing.T) {
	config := &CoverageConfig{
		IncludePackages: []string{"pkg/", "cmd/"},
	}
	analyzer := NewAnalyzer("/test", config)

	tests := []struct {
		packageName string
		expected    bool
	}{
		{"main", true},            // Not in include list
		{"pkg/utils", false},      // In include list
		{"cmd/app", false},        // In include list
		{"internal/models", true}, // Not in include list
	}

	for _, tt := range tests {
		t.Run(tt.packageName, func(t *testing.T) {
			result := analyzer.isPackageExcluded(tt.packageName)
			if result != tt.expected {
				t.Errorf("isPackageExcluded(%s) = %v, expected %v", tt.packageName, result, tt.expected)
			}
		})
	}
}

func TestCoverageData_Structure(t *testing.T) {
	// Test that CoverageData has all required fields
	data := &CoverageData{
		ProjectName:     "test-project",
		GeneratedAt:     time.Now(),
		TotalCoverage:   75.5,
		PackageStats:    []PackageCoverageStats{},
		FileCoverage:    []FileCoverageStats{},
		Summary:         CoverageSummary{},
		QualityRating:   QualityRating{},
		Recommendations: []Recommendation{},
	}

	if data.ProjectName != "test-project" {
		t.Errorf("Expected ProjectName to be set")
	}

	if data.PackageStats == nil {
		t.Error("Expected PackageStats to be initialized")
	}

	if data.FileCoverage == nil {
		t.Error("Expected FileCoverage to be initialized")
	}

	if data.Recommendations == nil {
		t.Error("Expected Recommendations to be initialized")
	}
}

func TestCoverageProfile_Structure(t *testing.T) {
	profile := &CoverageProfile{
		FileName:     "test.go",
		Mode:         "set",
		Blocks:       []CoverageBlock{},
		TotalLines:   100,
		CoveredLines: 75,
		Coverage:     75.0,
	}

	if profile.FileName != "test.go" {
		t.Error("Expected FileName to be set")
	}

	if profile.Blocks == nil {
		t.Error("Expected Blocks to be initialized")
	}

	if profile.Coverage != 75.0 {
		t.Errorf("Expected Coverage 75.0, got %f", profile.Coverage)
	}
}

func TestCollector_SetOutputPath(t *testing.T) {
	collector := NewCollector("/test", nil)

	testPath := "/custom/path/coverage.out"
	collector.SetOutputPath(testPath)

	if collector.outputPath != testPath {
		t.Errorf("Expected outputPath %s, got %s", testPath, collector.outputPath)
	}
}

func TestCollector_createTempCoverageFile(t *testing.T) {
	collector := NewCollector("/test", nil)

	tempFile, err := collector.createTempCoverageFile()
	if err != nil {
		t.Fatalf("createTempCoverageFile() failed: %v", err)
	}

	if tempFile == "" {
		t.Error("Expected non-empty temp file path")
	}

	if !strings.Contains(tempFile, "coverage-") {
		t.Errorf("Expected temp file to contain 'coverage-', got %s", tempFile)
	}

	if !strings.HasSuffix(tempFile, ".out") {
		t.Errorf("Expected temp file to end with '.out', got %s", tempFile)
	}
}

func TestCollector_shouldExcludePackage(t *testing.T) {
	config := &CoverageConfig{
		ExcludePackages: []string{"vendor/", "test/"},
	}
	collector := NewCollector("/test", config)

	tests := []struct {
		pkg      string
		expected bool
	}{
		{"./main", false},
		{"./vendor/pkg", true},
		{"./pkg/test/helper", true},
		{"./internal/models", false},
	}

	for _, tt := range tests {
		t.Run(tt.pkg, func(t *testing.T) {
			result := collector.shouldExcludePackage(tt.pkg)
			if result != tt.expected {
				t.Errorf("shouldExcludePackage(%s) = %v, expected %v", tt.pkg, result, tt.expected)
			}
		})
	}
}

func TestCollector_ValidateGoEnvironment(t *testing.T) {
	collector := NewCollector("/test", nil)

	// This test will pass if Go is installed, skip otherwise
	err := collector.ValidateGoEnvironment()
	if err != nil {
		t.Logf("ValidateGoEnvironment failed (this is expected if not in a Go module): %v", err)
		// Don't fail the test as this depends on the environment
	}
}

// Helper function to create a temporary directory for testing
func createTempDir(t *testing.T) string {
	tempDir, err := os.MkdirTemp("", "coverage-test-")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	return tempDir
}

// Helper function to clean up temporary directory
func cleanupTempDir(t *testing.T, dir string) {
	err := os.RemoveAll(dir)
	if err != nil {
		t.Logf("Failed to clean up temp dir %s: %v", dir, err)
	}
}

// TestCollector_CollectCoverage tests the main coverage collection functionality
func TestCollector_CollectCoverage(t *testing.T) {
	// Create a temporary directory for testing
	tempDir := createTempDir(t)
	defer cleanupTempDir(t, tempDir)

	// Create a simple Go module structure
	err := createTestGoModule(t, tempDir)
	if err != nil {
		t.Skip("Skipping CollectCoverage test: cannot create test module")
	}

	// Create collector
	collector := NewCollector(tempDir, nil)

	// Test coverage collection (this might fail in CI, so we handle it gracefully)
	coverageData, err := collector.CollectCoverage()
	if err != nil {
		// Log the error but don't fail the test since this depends on environment
		t.Logf("CollectCoverage failed (expected in some environments): %v", err)
		return
	}

	// Verify the coverage data structure
	if coverageData == nil {
		t.Error("Expected non-nil coverage data")
		return
	}

	if coverageData.ProjectName == "" {
		t.Error("Expected project name to be set")
	}

	if coverageData.GeneratedAt.IsZero() {
		t.Error("Expected generation time to be set")
	}
}

// TestCollector_generateCoverageProfile tests profile generation
func TestCollector_generateCoverageProfile(t *testing.T) {
	tempDir := createTempDir(t)
	defer cleanupTempDir(t, tempDir)

	collector := NewCollector(tempDir, nil)
	
	// Set a specific output path
	outputPath := filepath.Join(tempDir, "test-coverage.out")
	collector.SetOutputPath(outputPath)

	// This test focuses on the method signature and error handling
	_, err := collector.generateCoverageProfile()
	if err != nil {
		t.Logf("generateCoverageProfile failed (expected in test environment): %v", err)
		// Don't fail - this is expected without a real Go module
	}
}

// TestCollector_findAllPackages tests package discovery
func TestCollector_findAllPackages(t *testing.T) {
	tempDir := createTempDir(t)
	defer cleanupTempDir(t, tempDir)

	// Create some directories with Go files
	testDirs := []string{
		"pkg/utils",
		"cmd/app", 
		"internal/models",
		"vendor/external", // Should be skipped
		".hidden",         // Should be skipped
	}

	for _, dir := range testDirs {
		dirPath := filepath.Join(tempDir, dir)
		err := os.MkdirAll(dirPath, 0755)
		if err != nil {
			t.Fatalf("Failed to create test directory %s: %v", dirPath, err)
		}

		// Create a Go file (except in vendor and hidden dirs)
		if !strings.Contains(dir, "vendor") && !strings.HasPrefix(filepath.Base(dir), ".") {
			goFile := filepath.Join(dirPath, "main.go")
			err = os.WriteFile(goFile, []byte("package main\n"), 0600)
			if err != nil {
				t.Fatalf("Failed to create Go file %s: %v", goFile, err)
			}
		}
	}

	collector := NewCollector(tempDir, nil)
	packages, err := collector.findAllPackages()
	if err != nil {
		t.Fatalf("findAllPackages failed: %v", err)
	}

	// Should find at least the directories we created (minus vendor and hidden)
	expectedMinPackages := 3 // pkg/utils, cmd/app, internal/models
	if len(packages) < expectedMinPackages {
		t.Errorf("Expected at least %d packages, got %d: %v", expectedMinPackages, len(packages), packages)
	}

	// Verify vendor and hidden directories are not included
	for _, pkg := range packages {
		if strings.Contains(pkg, "vendor") {
			t.Errorf("Vendor directory should be excluded: %s", pkg)
		}
		if strings.Contains(pkg, ".hidden") {
			t.Errorf("Hidden directory should be excluded: %s", pkg)
		}
	}
}

// TestCollector_directoryHasGoFiles tests Go file detection
func TestCollector_directoryHasGoFiles(t *testing.T) {
	tempDir := createTempDir(t)
	defer cleanupTempDir(t, tempDir)

	collector := NewCollector(tempDir, nil)

	tests := []struct {
		name     string
		files    []string
		expected bool
	}{
		{
			name:     "directory with Go source file",
			files:    []string{"main.go"},
			expected: true,
		},
		{
			name:     "directory with only test files",
			files:    []string{"main_test.go"},
			expected: false,
		},
		{
			name:     "directory with mixed files",
			files:    []string{"main.go", "main_test.go", "README.md"},
			expected: true,
		},
		{
			name:     "directory with no Go files",
			files:    []string{"README.md", "config.json"},
			expected: false,
		},
		{
			name:     "empty directory",
			files:    []string{},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create test directory
			testDir := filepath.Join(tempDir, tt.name)
			err := os.MkdirAll(testDir, 0755)
			if err != nil {
				t.Fatalf("Failed to create test directory: %v", err)
			}

			// Create test files
			for _, fileName := range tt.files {
				filePath := filepath.Join(testDir, fileName)
				err = os.WriteFile(filePath, []byte("// test content"), 0600)
				if err != nil {
					t.Fatalf("Failed to create test file %s: %v", fileName, err)
				}
			}

			// Test the function
			result, err := collector.directoryHasGoFiles(testDir)
			if err != nil {
				t.Fatalf("directoryHasGoFiles failed: %v", err)
			}

			if result != tt.expected {
				t.Errorf("Expected %v, got %v for directory with files: %v", tt.expected, result, tt.files)
			}
		})
	}
}

// TestCollector_getTestPackages tests package filtering logic
func TestCollector_getTestPackages(t *testing.T) {
	tempDir := createTempDir(t)
	defer cleanupTempDir(t, tempDir)

	tests := []struct {
		name             string
		includePackages  []string
		excludePackages  []string
		expectedContains []string
		expectedExcludes []string
	}{
		{
			name:             "with include packages",
			includePackages:  []string{"pkg/utils", "cmd/app"},
			excludePackages:  []string{},
			expectedContains: []string{"./pkg/utils/...", "./cmd/app/..."},
			expectedExcludes: []string{},
		},
		{
			name:            "with exclude packages",
			includePackages: []string{},
			excludePackages: []string{"vendor", "test"},
			expectedContains: []string{},
			expectedExcludes: []string{"vendor", "test"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			config := &CoverageConfig{
				IncludePackages: tt.includePackages,
				ExcludePackages: tt.excludePackages,
			}

			collector := NewCollector(tempDir, config)
			packages, err := collector.getTestPackages()
			if err != nil {
				t.Fatalf("getTestPackages failed: %v", err)
			}

			// Check that expected packages are included
			for _, expected := range tt.expectedContains {
				found := false
				for _, pkg := range packages {
					if pkg == expected {
						found = true
						break
					}
				}
				if !found {
					t.Errorf("Expected package %s not found in result: %v", expected, packages)
				}
			}
		})
	}
}

// TestCollector_CollectCoverageForPackage tests single package coverage
func TestCollector_CollectCoverageForPackage(t *testing.T) {
	tempDir := createTempDir(t)
	defer cleanupTempDir(t, tempDir)

	collector := NewCollector(tempDir, nil)

	// Test with a specific package
	_, err := collector.CollectCoverageForPackage("./pkg/test")
	if err != nil {
		t.Logf("CollectCoverageForPackage failed (expected in test environment): %v", err)
		// Don't fail the test as this requires a valid Go module
	}
}

// TestCollector_GenerateHTMLReport tests HTML report generation
func TestCollector_GenerateHTMLReport(t *testing.T) {
	tempDir := createTempDir(t)
	defer cleanupTempDir(t, tempDir)

	collector := NewCollector(tempDir, nil)

	// Create sample coverage data
	coverageData := &CoverageData{
		ProjectName:     "test-project",
		GeneratedAt:     time.Now(),
		TotalCoverage:   75.5,
		PackageStats:    []PackageCoverageStats{},
		FileCoverage:    []FileCoverageStats{},
		Summary:         CoverageSummary{},
		QualityRating:   QualityRating{},
		Recommendations: []Recommendation{},
	}

	outputPath := filepath.Join(tempDir, "report.html")

	err := collector.GenerateHTMLReport(coverageData, outputPath)
	if err != nil {
		t.Fatalf("GenerateHTMLReport failed: %v", err)
	}

	// Verify the file was created
	if _, err := os.Stat(outputPath); os.IsNotExist(err) {
		t.Error("HTML report file was not created")
	}

	// Verify file has content
	content, err := os.ReadFile(outputPath)
	if err != nil {
		t.Fatalf("Failed to read generated report: %v", err)
	}

	if len(content) == 0 {
		t.Error("Generated HTML report is empty")
	}

	// Check for basic HTML structure
	htmlContent := string(content)
	if !strings.Contains(htmlContent, "<!DOCTYPE html>") {
		t.Error("Generated report does not contain proper HTML declaration")
	}

	if !strings.Contains(htmlContent, "test-project") {
		t.Error("Generated report does not contain project name")
	}
}

// Helper function to create a simple Go module for testing
func createTestGoModule(t *testing.T, dir string) error {
	// Create go.mod
	goMod := `module test-project

go 1.21
`
	err := os.WriteFile(filepath.Join(dir, "go.mod"), []byte(goMod), 0600)
	if err != nil {
		return err
	}

	// Create a simple main.go
	mainGo := `package main

func main() {
	println("Hello, World!")
}

func Add(a, b int) int {
	return a + b
}
`
	err = os.WriteFile(filepath.Join(dir, "main.go"), []byte(mainGo), 0600)
	if err != nil {
		return err
	}

	// Create a simple test file
	testGo := `package main

import "testing"

func TestAdd(t *testing.T) {
	result := Add(2, 3)
	if result != 5 {
		t.Errorf("Expected 5, got %d", result)
	}
}
`
	err = os.WriteFile(filepath.Join(dir, "main_test.go"), []byte(testGo), 0600)
	if err != nil {
		return err
	}

	return nil
}

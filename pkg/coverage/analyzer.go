package coverage

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"
)

// Analyzer handles Go coverage profile analysis
type Analyzer struct {
	config       *CoverageConfig
	projectRoot  string
	profiles     map[string]*CoverageProfile
	packageStats map[string]*PackageCoverageStats
}

// NewAnalyzer creates a new coverage analyzer
func NewAnalyzer(projectRoot string, config *CoverageConfig) *Analyzer {
	if config == nil {
		config = DefaultCoverageConfig()
	}

	return &Analyzer{
		config:       config,
		projectRoot:  projectRoot,
		profiles:     make(map[string]*CoverageProfile),
		packageStats: make(map[string]*PackageCoverageStats),
	}
}

// AnalyzeCoverageFile parses a Go coverage profile file and returns comprehensive analysis
func (a *Analyzer) AnalyzeCoverageFile(coverageFile string) (*CoverageData, error) {
	// Parse coverage profile
	err := a.parseCoverageProfile(coverageFile)
	if err != nil {
		return nil, fmt.Errorf("failed to parse coverage profile: %w", err)
	}

	// Calculate package-level statistics
	a.calculatePackageStats()

	// Generate comprehensive coverage data
	coverageData := &CoverageData{
		ProjectName:     filepath.Base(a.projectRoot),
		GeneratedAt:     time.Now(),
		PackageStats:    a.getPackageStatsSlice(),
		FileCoverage:    a.getFileCoverageStats(),
		Summary:         a.calculateSummary(),
		QualityRating:   a.calculateQualityRating(),
		Recommendations: a.generateRecommendations(),
	}

	// Calculate total coverage
	coverageData.TotalCoverage = coverageData.Summary.WeightedCoverage

	// Add trend analysis if enabled
	if a.config.EnableTrendAnalysis {
		trend, err := a.calculateTrendData()
		if err == nil {
			coverageData.TrendData = trend
		}
	}

	return coverageData, nil
}

// parseCoverageProfile reads and parses a Go coverage profile file
func (a *Analyzer) parseCoverageProfile(filePath string) error {
	file, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("failed to open coverage file: %w", err)
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	lineNum := 0

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		lineNum++

		// Skip mode line and empty lines
		if lineNum == 1 || line == "" {
			continue
		}

		err := a.parseCoverageLine(line)
		if err != nil {
			return fmt.Errorf("failed to parse line %d: %w", lineNum, err)
		}
	}

	return scanner.Err()
}

// parseCoverageLine parses a single line from coverage profile
func (a *Analyzer) parseCoverageLine(line string) error {
	// Format: filename:startLine.startCol,endLine.endCol numStmt count
	parts := strings.Fields(line)
	if len(parts) != 3 {
		return fmt.Errorf("invalid coverage line format: %s", line)
	}

	// Parse filename and position
	filePos := parts[0]
	colonIdx := strings.LastIndex(filePos, ":")
	if colonIdx == -1 {
		return fmt.Errorf("invalid file:position format: %s", filePos)
	}

	fileName := filePos[:colonIdx]
	position := filePos[colonIdx+1:]

	// Parse position (startLine.startCol,endLine.endCol)
	commaIdx := strings.Index(position, ",")
	if commaIdx == -1 {
		return fmt.Errorf("invalid position format: %s", position)
	}

	startPos := position[:commaIdx]
	endPos := position[commaIdx+1:]

	startLine, startCol, err := a.parseLineCol(startPos)
	if err != nil {
		return fmt.Errorf("invalid start position: %w", err)
	}

	endLine, endCol, err := a.parseLineCol(endPos)
	if err != nil {
		return fmt.Errorf("invalid end position: %w", err)
	}

	// Parse statement count and execution count
	numStmt, err := strconv.Atoi(parts[1])
	if err != nil {
		return fmt.Errorf("invalid statement count: %w", err)
	}

	count, err := strconv.Atoi(parts[2])
	if err != nil {
		return fmt.Errorf("invalid execution count: %w", err)
	}

	// Create coverage block
	block := CoverageBlock{
		StartLine:  startLine,
		StartCol:   startCol,
		EndLine:    endLine,
		EndCol:     endCol,
		Statements: numStmt,
		Count:      count,
		IsCovered:  count > 0,
	}

	// Add to profile
	a.addCoverageBlock(fileName, block)

	return nil
}

// parseLineCol parses "line.col" format
func (a *Analyzer) parseLineCol(s string) (int, int, error) {
	dotIdx := strings.Index(s, ".")
	if dotIdx == -1 {
		return 0, 0, fmt.Errorf("invalid line.col format: %s", s)
	}

	line, err := strconv.Atoi(s[:dotIdx])
	if err != nil {
		return 0, 0, fmt.Errorf("invalid line number: %w", err)
	}

	col, err := strconv.Atoi(s[dotIdx+1:])
	if err != nil {
		return 0, 0, fmt.Errorf("invalid column number: %w", err)
	}

	return line, col, nil
}

// addCoverageBlock adds a coverage block to the appropriate file profile
func (a *Analyzer) addCoverageBlock(fileName string, block CoverageBlock) {
	// Ensure we have a profile for this file
	if _, exists := a.profiles[fileName]; !exists {
		a.profiles[fileName] = &CoverageProfile{
			FileName: fileName,
			Mode:     "set", // Default mode
			Blocks:   []CoverageBlock{},
		}
	}

	profile := a.profiles[fileName]
	profile.Blocks = append(profile.Blocks, block)

	// Update coverage calculations
	a.updateProfileCoverage(profile)
}

// updateProfileCoverage recalculates coverage for a profile
func (a *Analyzer) updateProfileCoverage(profile *CoverageProfile) {
	totalStatements := 0
	coveredStatements := 0

	for _, block := range profile.Blocks {
		totalStatements += block.Statements
		if block.IsCovered {
			coveredStatements += block.Statements
		}
	}

	profile.TotalLines = totalStatements
	profile.CoveredLines = coveredStatements

	if totalStatements > 0 {
		profile.Coverage = float64(coveredStatements) / float64(totalStatements) * 100.0
	} else {
		profile.Coverage = 0.0
	}
}

// calculatePackageStats calculates package-level coverage statistics
func (a *Analyzer) calculatePackageStats() {
	packageFiles := make(map[string][]string)

	// Group files by package
	for fileName := range a.profiles {
		packageName := a.getPackageFromFileName(fileName)
		if packageName == "" {
			continue
		}

		// Skip excluded packages
		if a.isPackageExcluded(packageName) {
			continue
		}

		packageFiles[packageName] = append(packageFiles[packageName], fileName)
	}

	// Calculate statistics for each package
	for packageName, files := range packageFiles {
		stats := a.calculatePackageStatsForFiles(packageName, files)
		a.packageStats[packageName] = stats
	}
}

// getPackageFromFileName extracts package name from file path
func (a *Analyzer) getPackageFromFileName(fileName string) string {
	// Remove file extension and get directory
	dir := filepath.Dir(fileName)

	// Handle relative paths
	dir = strings.TrimPrefix(dir, "./")

	// Convert path separators to Go package format
	packageName := strings.ReplaceAll(dir, string(filepath.Separator), "/")

	// Handle root package
	if packageName == "." || packageName == "" {
		return "main"
	}

	return packageName
}

// isPackageExcluded checks if a package should be excluded from analysis
func (a *Analyzer) isPackageExcluded(packageName string) bool {
	for _, excluded := range a.config.ExcludePackages {
		if strings.Contains(packageName, excluded) {
			return true
		}
	}

	// If include list is specified, only include those packages
	if len(a.config.IncludePackages) > 0 {
		for _, included := range a.config.IncludePackages {
			if strings.Contains(packageName, included) {
				return false
			}
		}
		return true
	}

	return false
}

// calculatePackageStatsForFiles calculates coverage stats for a package
func (a *Analyzer) calculatePackageStatsForFiles(packageName string, files []string) *PackageCoverageStats {
	totalStatements := 0
	coveredStatements := 0
	testFiles := 0

	for _, fileName := range files {
		profile := a.profiles[fileName]
		if profile == nil {
			continue
		}

		totalStatements += profile.TotalLines
		coveredStatements += profile.CoveredLines

		// Count test files
		if strings.HasSuffix(fileName, "_test.go") {
			testFiles++
		}
	}

	var coverage float64
	if totalStatements > 0 {
		coverage = float64(coveredStatements) / float64(totalStatements) * 100.0
	}

	return &PackageCoverageStats{
		PackageName:       packageName,
		Coverage:          coverage,
		TotalStatements:   totalStatements,
		CoveredStatements: coveredStatements,
		TestFiles:         testFiles,
		QualityGrade:      GetQualityGrade(coverage),
		HasTests:          testFiles > 0,
	}
}

// getPackageStatsSlice returns package stats as a sorted slice
func (a *Analyzer) getPackageStatsSlice() []PackageCoverageStats {
	var stats []PackageCoverageStats

	for _, stat := range a.packageStats {
		stats = append(stats, *stat)
	}

	// Sort by coverage (descending)
	sort.Slice(stats, func(i, j int) bool {
		return stats[i].Coverage > stats[j].Coverage
	})

	return stats
}

// getFileCoverageStats returns file-level coverage statistics
func (a *Analyzer) getFileCoverageStats() []FileCoverageStats {
	var stats []FileCoverageStats

	for fileName, profile := range a.profiles {
		if a.isFileExcluded(fileName) {
			continue
		}

		stat := FileCoverageStats{
			FileName:          fileName,
			PackageName:       a.getPackageFromFileName(fileName),
			Coverage:          profile.Coverage,
			TotalStatements:   profile.TotalLines,
			CoveredStatements: profile.CoveredLines,
			UncoveredLines:    a.getUncoveredLines(profile),
			ComplexityScore:   a.calculateComplexityScore(profile),
		}

		stats = append(stats, stat)
	}

	// Sort by coverage (ascending to show worst files first)
	sort.Slice(stats, func(i, j int) bool {
		return stats[i].Coverage < stats[j].Coverage
	})

	return stats
}

// isFileExcluded checks if a file should be excluded from analysis
func (a *Analyzer) isFileExcluded(fileName string) bool {
	for _, excluded := range a.config.ExcludeFiles {
		if strings.Contains(fileName, excluded) {
			return true
		}
	}
	return false
}

// getUncoveredLines returns line numbers that are not covered
func (a *Analyzer) getUncoveredLines(profile *CoverageProfile) []int {
	var uncovered []int

	for _, block := range profile.Blocks {
		if !block.IsCovered {
			// Add all lines in the uncovered block
			for line := block.StartLine; line <= block.EndLine; line++ {
				uncovered = append(uncovered, line)
			}
		}
	}

	// Remove duplicates and sort
	uncovered = a.removeDuplicateInts(uncovered)
	sort.Ints(uncovered)

	return uncovered
}

// removeDuplicateInts removes duplicate integers from slice
func (a *Analyzer) removeDuplicateInts(slice []int) []int {
	seen := make(map[int]bool)
	var result []int

	for _, v := range slice {
		if !seen[v] {
			seen[v] = true
			result = append(result, v)
		}
	}

	return result
}

// calculateComplexityScore calculates a simple complexity score for a file
func (a *Analyzer) calculateComplexityScore(profile *CoverageProfile) int {
	// Simple complexity based on number of blocks and branches
	return len(profile.Blocks)
}

// calculateSummary calculates overall coverage summary
func (a *Analyzer) calculateSummary() CoverageSummary {
	totalPackages := len(a.packageStats)
	testedPackages := 0
	totalFiles := len(a.profiles)
	testedFiles := 0
	totalStatements := 0
	coveredStatements := 0

	for _, stat := range a.packageStats {
		if stat.HasTests {
			testedPackages++
		}
		totalStatements += stat.TotalStatements
		coveredStatements += stat.CoveredStatements
	}

	for _, profile := range a.profiles {
		if profile.Coverage > 0 {
			testedFiles++
		}
	}

	var averageCoverage, weightedCoverage float64
	if totalPackages > 0 {
		var totalCov float64
		for _, stat := range a.packageStats {
			totalCov += stat.Coverage
		}
		averageCoverage = totalCov / float64(totalPackages)
	}

	if totalStatements > 0 {
		weightedCoverage = float64(coveredStatements) / float64(totalStatements) * 100.0
	}

	return CoverageSummary{
		TotalPackages:     totalPackages,
		TestedPackages:    testedPackages,
		UntestedPackages:  totalPackages - testedPackages,
		TotalFiles:        totalFiles,
		TestedFiles:       testedFiles,
		AverageCoverage:   averageCoverage,
		WeightedCoverage:  weightedCoverage,
		CriticalUncovered: a.countCriticalUncovered(),
	}
}

// countCriticalUncovered counts functions/areas that are critical but uncovered
func (a *Analyzer) countCriticalUncovered() int {
	// Placeholder for critical function analysis
	// In a real implementation, this would analyze function importance
	return 0
}

// calculateQualityRating calculates overall quality rating
func (a *Analyzer) calculateQualityRating() QualityRating {
	summary := a.calculateSummary()
	coverage := summary.WeightedCoverage

	grade := GetQualityGrade(coverage)
	description := GetQualityDescription(grade)

	// Calculate score (0-100)
	score := coverage

	// Determine next target
	var nextTarget float64
	switch {
	case coverage < 50:
		nextTarget = 50
	case coverage < 70:
		nextTarget = 70
	case coverage < 80:
		nextTarget = 80
	case coverage < 90:
		nextTarget = 90
	default:
		nextTarget = 95
	}

	return QualityRating{
		OverallGrade:     grade,
		Score:            score,
		CoverageGrade:    grade,
		TestQualityGrade: a.calculateTestQualityGrade(),
		Description:      description,
		NextTarget:       nextTarget,
	}
}

// calculateTestQualityGrade assesses the quality of tests
func (a *Analyzer) calculateTestQualityGrade() string {
	summary := a.calculateSummary()

	// Simple heuristic based on percentage of packages with tests
	testCoverage := float64(summary.TestedPackages) / float64(summary.TotalPackages) * 100.0
	return GetQualityGrade(testCoverage)
}

// generateRecommendations generates actionable improvement recommendations
func (a *Analyzer) generateRecommendations() []Recommendation {
	var recommendations []Recommendation
	summary := a.calculateSummary()

	// Low coverage packages
	for _, stat := range a.packageStats {
		if stat.Coverage < a.config.MinimumCoverage {
			recommendations = append(recommendations, Recommendation{
				Priority:    "High",
				Category:    "Coverage",
				Title:       fmt.Sprintf("Improve coverage for package %s", stat.PackageName),
				Description: fmt.Sprintf("Package has %.1f%% coverage, below minimum threshold of %.1f%%", stat.Coverage, a.config.MinimumCoverage),
				Impact:      "High - Reduces risk of bugs in production",
				Effort:      "Medium",
			})
		}
	}

	// Packages without tests
	if summary.UntestedPackages > 0 {
		recommendations = append(recommendations, Recommendation{
			Priority:    "High",
			Category:    "Testing",
			Title:       "Add tests for untested packages",
			Description: fmt.Sprintf("%d packages have no tests", summary.UntestedPackages),
			Impact:      "High - Establishes basic test coverage",
			Effort:      "High",
		})
	}

	// Overall coverage improvement
	if summary.WeightedCoverage < a.config.GoodCoverage {
		recommendations = append(recommendations, Recommendation{
			Priority:    "Medium",
			Category:    "Coverage",
			Title:       "Increase overall test coverage",
			Description: fmt.Sprintf("Overall coverage is %.1f%%, target is %.1f%%", summary.WeightedCoverage, a.config.GoodCoverage),
			Impact:      "Medium - Improves code quality and reliability",
			Effort:      "Medium",
		})
	}

	return recommendations
}

// calculateTrendData analyzes coverage trends (placeholder for trend analysis)
func (a *Analyzer) calculateTrendData() (*CoverageTrend, error) {
	// Placeholder for trend analysis
	// In a real implementation, this would compare with historical data
	current := CoverageSnapshot{
		Timestamp:     time.Now(),
		TotalCoverage: a.calculateSummary().WeightedCoverage,
		PackageCount:  len(a.packageStats),
	}

	return &CoverageTrend{
		Current:         current,
		ChangeDirection: "Stable",
		CoverageChange:  0.0,
	}, nil
}

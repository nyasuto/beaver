package coverage

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// Collector handles coverage data collection from Go projects
type Collector struct {
	projectRoot string
	config      *CoverageConfig
	outputPath  string
	workDir     string
}

// NewCollector creates a new coverage collector
func NewCollector(projectRoot string, config *CoverageConfig) *Collector {
	if config == nil {
		config = DefaultCoverageConfig()
	}

	return &Collector{
		projectRoot: projectRoot,
		config:      config,
		outputPath:  "coverage.out",
		workDir:     projectRoot,
	}
}

// SetOutputPath sets the output path for coverage files
func (c *Collector) SetOutputPath(path string) {
	c.outputPath = path
}

// CollectCoverage runs tests and collects coverage data for the entire project
func (c *Collector) CollectCoverage() (*CoverageData, error) {
	// Generate coverage profile
	coverageFile, err := c.generateCoverageProfile()
	if err != nil {
		return nil, fmt.Errorf("failed to generate coverage profile: %w", err)
	}

	// Ensure cleanup of temporary files
	defer func() {
		if coverageFile != c.outputPath {
			os.Remove(coverageFile)
		}
	}()

	// Analyze coverage data
	analyzer := NewAnalyzer(c.projectRoot, c.config)
	coverageData, err := analyzer.AnalyzeCoverageFile(coverageFile)
	if err != nil {
		return nil, fmt.Errorf("failed to analyze coverage: %w", err)
	}

	return coverageData, nil
}

// generateCoverageProfile runs go test with coverage and returns the profile file path
func (c *Collector) generateCoverageProfile() (string, error) {
	// Create temporary file for coverage output if needed
	var coverageFile string
	if c.outputPath != "" {
		coverageFile = c.outputPath
	} else {
		tempFile, err := c.createTempCoverageFile()
		if err != nil {
			return "", fmt.Errorf("failed to create temp coverage file: %w", err)
		}
		coverageFile = tempFile
	}

	// Run tests with coverage
	err := c.runTestsWithCoverage(coverageFile)
	if err != nil {
		return "", fmt.Errorf("failed to run tests with coverage: %w", err)
	}

	// Verify coverage file was created
	if _, err := os.Stat(coverageFile); os.IsNotExist(err) {
		return "", fmt.Errorf("coverage file was not generated: %s", coverageFile)
	}

	return coverageFile, nil
}

// createTempCoverageFile creates a temporary file for coverage output
func (c *Collector) createTempCoverageFile() (string, error) {
	tempDir := os.TempDir()
	timestamp := time.Now().Format("20060102-150405")
	fileName := fmt.Sprintf("coverage-%s.out", timestamp)
	return filepath.Join(tempDir, fileName), nil
}

// runTestsWithCoverage executes go test with coverage collection
func (c *Collector) runTestsWithCoverage(coverageFile string) error {
	// Prepare go test command with coverage
	args := []string{"test"}

	// Add coverage profile output
	args = append(args, "-coverprofile="+coverageFile)

	// Add coverage mode (default to "set")
	args = append(args, "-covermode=set")

	// Determine packages to test
	packages, err := c.getTestPackages()
	if err != nil {
		return fmt.Errorf("failed to determine test packages: %w", err)
	}

	if len(packages) == 0 {
		// Default to all packages
		args = append(args, "./...")
	} else {
		args = append(args, packages...)
	}

	// Create command
	cmd := exec.Command("go", args...)
	cmd.Dir = c.workDir

	// Set environment variables
	cmd.Env = append(os.Environ(), "CGO_ENABLED=1") // Enable CGO for coverage

	// Capture output for debugging
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("go test failed: %w\nOutput: %s", err, string(output))
	}

	return nil
}

// getTestPackages determines which packages to test based on configuration
func (c *Collector) getTestPackages() ([]string, error) {
	var packages []string

	// If include packages are specified, use those
	if len(c.config.IncludePackages) > 0 {
		for _, pkg := range c.config.IncludePackages {
			// Convert to Go package format
			if !strings.HasPrefix(pkg, "./") && !strings.HasPrefix(pkg, "/") {
				pkg = "./" + pkg + "/..."
			}
			packages = append(packages, pkg)
		}
		return packages, nil
	}

	// Otherwise, find all packages and exclude specified ones
	allPackages, err := c.findAllPackages()
	if err != nil {
		return nil, err
	}

	for _, pkg := range allPackages {
		if !c.shouldExcludePackage(pkg) {
			packages = append(packages, pkg)
		}
	}

	return packages, nil
}

// findAllPackages discovers all Go packages in the project
func (c *Collector) findAllPackages() ([]string, error) {
	var packages []string

	err := filepath.Walk(c.projectRoot, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip non-directories
		if !info.IsDir() {
			return nil
		}

		// Skip hidden directories and vendor
		if strings.HasPrefix(info.Name(), ".") || info.Name() == "vendor" {
			return filepath.SkipDir
		}

		// Check if directory contains Go files
		hasGoFiles, err := c.directoryHasGoFiles(path)
		if err != nil {
			return err
		}

		if hasGoFiles {
			// Convert absolute path to relative package path
			relPath, err := filepath.Rel(c.projectRoot, path)
			if err != nil {
				return err
			}

			// Convert to Go package format
			pkgPath := "./" + strings.ReplaceAll(relPath, string(filepath.Separator), "/")
			packages = append(packages, pkgPath)
		}

		return nil
	})

	return packages, err
}

// directoryHasGoFiles checks if a directory contains Go source files
func (c *Collector) directoryHasGoFiles(dir string) (bool, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return false, err
	}

	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".go") {
			// Exclude test files from package detection (they don't define packages)
			if !strings.HasSuffix(entry.Name(), "_test.go") {
				return true, nil
			}
		}
	}

	return false, nil
}

// shouldExcludePackage checks if a package should be excluded from testing
func (c *Collector) shouldExcludePackage(pkg string) bool {
	for _, excluded := range c.config.ExcludePackages {
		if strings.Contains(pkg, excluded) {
			return true
		}
	}
	return false
}

// CollectCoverageForPackage collects coverage for a specific package
func (c *Collector) CollectCoverageForPackage(packagePath string) (*CoverageData, error) {
	// Create temporary collector with single package
	tempConfig := *c.config
	tempConfig.IncludePackages = []string{packagePath}

	tempCollector := &Collector{
		projectRoot: c.projectRoot,
		config:      &tempConfig,
		workDir:     c.workDir,
	}

	return tempCollector.CollectCoverage()
}

// GenerateHTMLReport generates an HTML coverage report
func (c *Collector) GenerateHTMLReport(coverageData *CoverageData, outputPath string) error {
	// This would generate an HTML report
	// For now, we'll create a simple report file

	report := c.generateHTMLContent(coverageData)

	err := os.WriteFile(outputPath, []byte(report), 0600)
	if err != nil {
		return fmt.Errorf("failed to write HTML report: %w", err)
	}

	return nil
}

// generateHTMLContent creates HTML content for the coverage report
func (c *Collector) generateHTMLContent(data *CoverageData) string {
	html := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <title>Coverage Report - %s</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-card { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 2em; font-weight: bold; color: #333; }
        .stat-label { color: #666; margin-top: 5px; }
        .grade-A { color: #4CAF50; }
        .grade-B { color: #8BC34A; }
        .grade-C { color: #FF9800; }
        .grade-D { color: #FF5722; }
        .grade-F { color: #F44336; }
        table { width: 100%%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f5f5f5; }
        .coverage-bar { width: 100px; height: 20px; background: #f0f0f0; border-radius: 10px; overflow: hidden; }
        .coverage-fill { height: 100%%; background: linear-gradient(90deg, #f44336 0%%, #ff9800 50%%, #4caf50 100%%); }
    </style>
</head>
<body>
    <div class="header">
        <h1>Coverage Report: %s</h1>
        <p>Generated: %s</p>
        <p>Overall Grade: <span class="grade-%s">%s</span> (%.1f%%)</p>
    </div>
    
    <div class="stats">
        <div class="stat-card">
            <div class="stat-value">%.1f%%</div>
            <div class="stat-label">Total Coverage</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">%d</div>
            <div class="stat-label">Packages</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">%d</div>
            <div class="stat-label">Files</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">%d</div>
            <div class="stat-label">With Tests</div>
        </div>
    </div>
    
    <h2>Package Coverage</h2>
    <table>
        <thead>
            <tr>
                <th>Package</th>
                <th>Coverage</th>
                <th>Grade</th>
                <th>Statements</th>
                <th>Tests</th>
            </tr>
        </thead>
        <tbody>`,
		data.ProjectName,
		data.ProjectName,
		data.GeneratedAt.Format("2006-01-02 15:04:05"),
		data.QualityRating.OverallGrade,
		data.QualityRating.OverallGrade,
		data.TotalCoverage,
		data.TotalCoverage,
		data.Summary.TotalPackages,
		data.Summary.TotalFiles,
		data.Summary.TestedPackages,
	)

	// Add package rows
	for _, pkg := range data.PackageStats {
		html += fmt.Sprintf(`
            <tr>
                <td>%s</td>
                <td>
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: %.1f%%"></div>
                    </div>
                    %.1f%%
                </td>
                <td><span class="grade-%s">%s</span></td>
                <td>%d/%d</td>
                <td>%d</td>
            </tr>`,
			pkg.PackageName,
			pkg.Coverage,
			pkg.Coverage,
			pkg.QualityGrade,
			pkg.QualityGrade,
			pkg.CoveredStatements,
			pkg.TotalStatements,
			pkg.TestFiles,
		)
	}

	html += `
        </tbody>
    </table>
    
    <h2>Recommendations</h2>
    <ul>`

	// Add recommendations
	for _, rec := range data.Recommendations {
		html += fmt.Sprintf(`
        <li><strong>%s:</strong> %s <em>(%s priority, %s effort)</em></li>`,
			rec.Title,
			rec.Description,
			rec.Priority,
			rec.Effort,
		)
	}

	html += `
    </ul>
</body>
</html>`

	return html
}

// ValidateGoEnvironment checks if Go tools are available for coverage collection
func (c *Collector) ValidateGoEnvironment() error {
	// Check if go command is available
	_, err := exec.LookPath("go")
	if err != nil {
		return fmt.Errorf("go command not found in PATH: %w", err)
	}

	// Check if we're in a Go module
	cmd := exec.Command("go", "mod", "verify")
	cmd.Dir = c.workDir
	err = cmd.Run()
	if err != nil {
		return fmt.Errorf("not in a valid Go module: %w", err)
	}

	return nil
}

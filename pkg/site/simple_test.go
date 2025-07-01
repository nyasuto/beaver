package site

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/nyasuto/beaver/internal/models"
)

// TestSimpleGeneration tests basic site generation functionality
func TestSimpleGeneration(t *testing.T) {
	// Create temporary directory for test
	tempDir, err := os.MkdirTemp("", "beaver-simple-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	config := &SiteConfig{
		Title:       "Simple Test Site",
		Description: "Test Description",
		BaseURL:     "https://test.example.com",
		OutputDir:   tempDir,
		Language:    "ja",
		Navigation: []NavItem{
			{Title: "ホーム", URL: "/"},
		},
		ServiceWorker: true,
	}

	generator := NewHTMLGenerator(config)

	// Test asset generation
	err = generator.generateAssets()
	if err != nil {
		t.Fatalf("Asset generation failed: %v", err)
	}

	// Test service worker generation
	err = generator.generateServiceWorker()
	if err != nil {
		t.Fatalf("Service worker generation failed: %v", err)
	}

	// Test SEO files generation
	pages := []struct {
		filename string
		template string
		data     PageData
	}{
		{
			filename: "index.html",
			template: "home",
			data:     generator.createHomePageData([]models.Issue{}, "TestProject"),
		},
	}

	err = generator.generateSEOFiles(pages)
	if err != nil {
		t.Fatalf("SEO files generation failed: %v", err)
	}

	// Verify files exist
	expectedFiles := []string{
		"assets/css/style.css",
		"assets/js/main.js",
		"manifest.json",
		"sw.js",
		"robots.txt",
		"sitemap.xml",
	}

	for _, file := range expectedFiles {
		filePath := filepath.Join(tempDir, file)
		if _, err := os.Stat(filePath); os.IsNotExist(err) {
			t.Errorf("Expected file %s was not created", file)
		}
	}

	// Test CSS content
	cssPath := filepath.Join(tempDir, "assets", "css", "style.css")
	cssContent, err := os.ReadFile(cssPath)
	if err != nil {
		t.Fatalf("Failed to read CSS file: %v", err)
	}

	cssStr := string(cssContent)
	if !strings.Contains(cssStr, "--beaver-primary") {
		t.Error("CSS should contain Beaver color variables")
	}
}

// TestBeaverThemeConsistency tests that theme colors are consistent
func TestBeaverThemeConsistency(t *testing.T) {
	theme := GetBeaverTheme()

	expectedColors := map[string]string{
		"primary":    "#8B4513",
		"secondary":  "#4682B4",
		"accent":     "#228B22",
		"text":       "#2F4F4F",
		"background": "#FAFAFA",
	}

	actualColors := map[string]string{
		"primary":    theme.PrimaryColor,
		"secondary":  theme.SecondaryColor,
		"accent":     theme.AccentColor,
		"text":       theme.TextColor,
		"background": theme.BackgroundColor,
	}

	for name, expected := range expectedColors {
		if actual := actualColors[name]; actual != expected {
			t.Errorf("Theme color %s: expected %s, got %s", name, expected, actual)
		}
	}
}

// TestTemplateFunctions tests that template functions work correctly
func TestTemplateFunctions(t *testing.T) {
	generator := NewHTMLGenerator(&SiteConfig{})
	funcs := generator.getTemplateFuncs()

	// Test formatDate
	formatDate := funcs["formatDate"].(func(time.Time) string)
	testTime := time.Date(2024, 12, 30, 0, 0, 0, 0, time.UTC)
	result := formatDate(testTime)
	expected := "2024年12月30日"
	if result != expected {
		t.Errorf("formatDate: expected %s, got %s", expected, result)
	}

	// Test truncate
	truncate := funcs["truncate"].(func(string, int) string)
	result = truncate("Hello World", 5)
	expected = "Hello..."
	if result != expected {
		t.Errorf("truncate: expected %s, got %s", expected, result)
	}

	// Test countByState
	countByState := funcs["countByState"].(func([]models.Issue, string) int)
	issues := []models.Issue{
		{State: "open"},
		{State: "closed"},
		{State: "open"},
	}
	count := countByState(issues, "open")
	if count != 2 {
		t.Errorf("countByState: expected 2, got %d", count)
	}
}

// TestConfigValidation tests configuration validation
func TestConfigValidation(t *testing.T) {
	// Test valid config
	config := &SiteConfig{
		Title:     "Test Site",
		OutputDir: "/tmp/test",
		Language:  "ja",
	}

	// Basic validation - config should be accessible
	if config.Title != "Test Site" {
		t.Errorf("Expected title 'Test Site', got %s", config.Title)
	}

	// Test navigation
	config.Navigation = []NavItem{
		{Title: "Home", URL: "/"},
		{Title: "About", URL: "/about"},
	}

	if len(config.Navigation) != 2 {
		t.Errorf("Expected 2 navigation items, got %d", len(config.Navigation))
	}
}

// TestAssetManagerBasics tests basic asset manager functionality
func TestAssetManagerBasics(t *testing.T) {
	am := NewAssetManager()
	if am == nil {
		t.Fatal("NewAssetManager returned nil")
	}

	testDir := "/test/path"
	am.SetOutputDir(testDir)
	if am.outputDir != testDir {
		t.Errorf("Expected output dir %s, got %s", testDir, am.outputDir)
	}
}

// TestContentGeneration tests content generation methods
func TestContentGeneration(t *testing.T) {
	generator := NewHTMLGenerator(&SiteConfig{})

	issues := []models.Issue{
		{Number: 1, Title: "Test Issue", State: "open"},
	}

	// Test content generation methods
	homeContent := generator.generateHomeContent(issues)
	if homeContent == "" {
		t.Error("Home content should not be empty")
	}

	issuesContent := generator.generateIssuesContent(issues)
	if issuesContent == "" {
		t.Error("Issues content should not be empty")
	}

	strategyContent := generator.generateStrategyContent(issues)
	if strategyContent == "" {
		t.Error("Strategy content should not be empty")
	}

	troubleshootingContent := generator.generateTroubleshootingContent(issues)
	if troubleshootingContent == "" {
		t.Error("Troubleshooting content should not be empty")
	}

	// Test statistics generation
	stats := generator.generateStatistics(issues)
	if stats == nil {
		t.Error("Statistics should not be nil")
	}

	totalIssues, ok := stats["total_issues"].(int)
	if !ok || totalIssues != 1 {
		t.Errorf("Expected total_issues 1, got %v", stats["total_issues"])
	}

	// Test health score calculation
	score := generator.calculateHealthScore(issues)
	if score <= 0 || score > 100 {
		t.Errorf("Health score should be between 1-100, got %d", score)
	}
}

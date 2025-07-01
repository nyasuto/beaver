package site

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/nyasuto/beaver/internal/models"
)

func TestNewHTMLGenerator(t *testing.T) {
	config := &SiteConfig{
		Title:       "Test Site",
		Description: "Test Description",
		OutputDir:   "./test-output",
		Language:    "ja",
	}

	generator := NewHTMLGenerator(config)

	if generator == nil {
		t.Fatal("NewHTMLGenerator returned nil")
	}

	if generator.config != config {
		t.Error("Config not properly set")
	}

	if generator.theme == nil {
		t.Error("Theme not initialized")
	}

	if generator.assets == nil {
		t.Error("Assets manager not initialized")
	}

	if generator.templates == nil {
		t.Error("Templates map not initialized")
	}
}

func TestGetBeaverTheme(t *testing.T) {
	theme := GetBeaverTheme()

	if theme == nil {
		t.Fatal("GetBeaverTheme returned nil")
	}

	expectedPrimary := "#8B4513"
	if theme.PrimaryColor != expectedPrimary {
		t.Errorf("Expected primary color %s, got %s", expectedPrimary, theme.PrimaryColor)
	}

	expectedSecondary := "#4682B4"
	if theme.SecondaryColor != expectedSecondary {
		t.Errorf("Expected secondary color %s, got %s", expectedSecondary, theme.SecondaryColor)
	}

	expectedAccent := "#228B22"
	if theme.AccentColor != expectedAccent {
		t.Errorf("Expected accent color %s, got %s", expectedAccent, theme.AccentColor)
	}

	if theme.FontFamily == "" {
		t.Error("FontFamily should not be empty")
	}

	if !strings.Contains(theme.FontFamily, "Noto Sans JP") {
		t.Error("FontFamily should contain 'Noto Sans JP'")
	}
}

func TestCreateHomePageData(t *testing.T) {
	config := &SiteConfig{
		Title:       "Test Site",
		Description: "Test Description",
		BaseURL:     "https://test.example.com",
		Language:    "ja",
		Navigation: []NavItem{
			{Title: "ホーム", URL: "/"},
			{Title: "課題", URL: "/issues.html"},
		},
	}

	generator := NewHTMLGenerator(config)

	// Create test issues
	issues := []models.Issue{
		{
			Number:    1,
			Title:     "Test Issue 1",
			Body:      "Test issue body",
			State:     "open",
			CreatedAt: time.Now(),
			Labels: []models.Label{
				{Name: "bug", Color: "d73a4a"},
			},
		},
		{
			Number:    2,
			Title:     "Test Issue 2",
			Body:      "Another test issue",
			State:     "closed",
			CreatedAt: time.Now().AddDate(0, 0, -1),
			Labels: []models.Label{
				{Name: "feature", Color: "a2eeef"},
			},
		},
	}

	pageData := generator.createHomePageData(issues, "TestProject")

	// Verify basic page data
	expectedTitle := "🦫 TestProject ナレッジベース"
	if pageData.Title != expectedTitle {
		t.Errorf("Expected title %s, got %s", expectedTitle, pageData.Title)
	}

	if pageData.SiteTitle != config.Title {
		t.Errorf("Expected site title %s, got %s", config.Title, pageData.SiteTitle)
	}

	if pageData.BaseURL != config.BaseURL {
		t.Errorf("Expected base URL %s, got %s", config.BaseURL, pageData.BaseURL)
	}

	if pageData.Language != config.Language {
		t.Errorf("Expected language %s, got %s", config.Language, pageData.Language)
	}

	// Verify navigation
	if len(pageData.Navigation) != len(config.Navigation) {
		t.Errorf("Expected %d navigation items, got %d", len(config.Navigation), len(pageData.Navigation))
	}

	// Verify issues data
	if len(pageData.Issues) != len(issues) {
		t.Errorf("Expected %d issues, got %d", len(issues), len(pageData.Issues))
	}

	// Verify statistics
	if pageData.Statistics == nil {
		t.Error("Statistics should not be nil")
	}

	totalIssues, ok := pageData.Statistics["total_issues"].(int)
	if !ok || totalIssues != len(issues) {
		t.Errorf("Expected total_issues %d, got %v", len(issues), pageData.Statistics["total_issues"])
	}

	// Verify health score
	if pageData.HealthScore <= 0 || pageData.HealthScore > 100 {
		t.Errorf("Health score should be between 1-100, got %d", pageData.HealthScore)
	}

	// Verify theme
	if pageData.Theme == nil {
		t.Error("Theme should not be nil")
	}
}

func TestCreateIssuesPageData(t *testing.T) {
	config := &SiteConfig{
		Title:       "Test Site",
		Description: "Test Description",
		Language:    "ja",
	}

	generator := NewHTMLGenerator(config)

	issues := []models.Issue{
		{
			Number: 1,
			Title:  "Test Issue",
			State:  "open",
			Labels: []models.Label{
				{Name: "bug", Color: "d73a4a"},
				{Name: "urgent", Color: "ff0000"},
			},
		},
	}

	pageData := generator.createIssuesPageData(issues, "TestProject")

	expectedTitle := "課題サマリー - TestProject"
	if pageData.Title != expectedTitle {
		t.Errorf("Expected title %s, got %s", expectedTitle, pageData.Title)
	}

	if pageData.URL != "/issues.html" {
		t.Errorf("Expected URL /issues.html, got %s", pageData.URL)
	}

	if len(pageData.Issues) != len(issues) {
		t.Errorf("Expected %d issues, got %d", len(issues), len(pageData.Issues))
	}
}

func TestGenerateStatistics(t *testing.T) {
	config := &SiteConfig{}
	generator := NewHTMLGenerator(config)

	issues := []models.Issue{
		{Number: 1, State: "open"},
		{Number: 2, State: "closed"},
		{Number: 3, State: "open"},
	}

	stats := generator.generateStatistics(issues)

	if stats == nil {
		t.Fatal("Statistics should not be nil")
	}

	totalIssues, ok := stats["total_issues"].(int)
	if !ok || totalIssues != 3 {
		t.Errorf("Expected total_issues 3, got %v", stats["total_issues"])
	}

	// Test empty issues
	emptyStats := generator.generateStatistics([]models.Issue{})
	emptyTotal, ok := emptyStats["total_issues"].(int)
	if !ok || emptyTotal != 0 {
		t.Errorf("Expected total_issues 0 for empty slice, got %v", emptyStats["total_issues"])
	}
}

func TestCalculateHealthScore(t *testing.T) {
	config := &SiteConfig{}
	generator := NewHTMLGenerator(config)

	issues := []models.Issue{
		{Number: 1, State: "open"},
		{Number: 2, State: "closed"},
	}

	score := generator.calculateHealthScore(issues)

	if score <= 0 || score > 100 {
		t.Errorf("Health score should be between 1-100, got %d", score)
	}

	// Test with empty issues
	emptyScore := generator.calculateHealthScore([]models.Issue{})
	if emptyScore <= 0 || emptyScore > 100 {
		t.Errorf("Health score for empty issues should be between 1-100, got %d", emptyScore)
	}
}

func TestGenerateSite_InvalidOutputDir(t *testing.T) {
	config := &SiteConfig{
		Title:     "Test Site",
		OutputDir: "/invalid/path/that/cannot/be/created",
	}

	generator := NewHTMLGenerator(config)
	issues := []models.Issue{}

	err := generator.GenerateSite(issues, "TestProject")
	if err == nil {
		t.Error("Expected error for invalid output directory, got nil")
	}

	if !strings.Contains(err.Error(), "failed to create output directory") {
		t.Errorf("Expected error about output directory, got: %s", err.Error())
	}
}

func TestGenerateSite_Success(t *testing.T) {
	t.Skip("Template integration tests temporarily disabled during development")
	// Create temporary directory for test
	tempDir, err := os.MkdirTemp("", "beaver-site-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	config := &SiteConfig{
		Title:       "Test Site",
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

	issues := []models.Issue{
		{
			Number:    1,
			Title:     "Test Issue",
			Body:      "Test body",
			State:     "open",
			CreatedAt: time.Now(),
		},
	}

	err = generator.GenerateSite(issues, "TestProject")
	if err != nil {
		t.Fatalf("GenerateSite failed: %v", err)
	}

	// Verify output directory structure
	expectedFiles := []string{
		"index.html",
		"issues.html",
		"strategy.html",
		"troubleshooting.html",
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

	// Verify index.html contains expected content
	indexPath := filepath.Join(tempDir, "index.html")
	content, err := os.ReadFile(indexPath)
	if err != nil {
		t.Fatalf("Failed to read index.html: %v", err)
	}

	indexContent := string(content)
	if !strings.Contains(indexContent, "Test Site") {
		t.Error("index.html should contain site title")
	}

	if !strings.Contains(indexContent, "TestProject") {
		t.Error("index.html should contain project name")
	}

	// Verify CSS file contains Beaver theme
	cssPath := filepath.Join(tempDir, "assets", "css", "style.css")
	cssContent, err := os.ReadFile(cssPath)
	if err != nil {
		t.Fatalf("Failed to read style.css: %v", err)
	}

	cssStr := string(cssContent)
	if !strings.Contains(cssStr, "--beaver-primary") {
		t.Error("CSS should contain Beaver color variables")
	}

	if !strings.Contains(cssStr, ".beaver-card") {
		t.Error("CSS should contain Beaver card styles")
	}

	// Verify service worker
	swPath := filepath.Join(tempDir, "sw.js")
	swContent, err := os.ReadFile(swPath)
	if err != nil {
		t.Fatalf("Failed to read sw.js: %v", err)
	}

	swStr := string(swContent)
	if !strings.Contains(swStr, "beaver-kb-v1") {
		t.Error("Service worker should contain cache name")
	}

	// Verify robots.txt
	robotsPath := filepath.Join(tempDir, "robots.txt")
	robotsContent, err := os.ReadFile(robotsPath)
	if err != nil {
		t.Fatalf("Failed to read robots.txt: %v", err)
	}

	robotsStr := string(robotsContent)
	if !strings.Contains(robotsStr, "User-agent: *") {
		t.Error("robots.txt should contain user-agent directive")
	}

	if !strings.Contains(robotsStr, config.BaseURL) {
		t.Error("robots.txt should contain site base URL")
	}
}

func TestGetTemplateFuncs(t *testing.T) {
	config := &SiteConfig{}
	generator := NewHTMLGenerator(config)

	funcs := generator.getTemplateFuncs()

	if funcs == nil {
		t.Fatal("Template functions should not be nil")
	}

	// Test formatDate function
	formatDate, ok := funcs["formatDate"]
	if !ok {
		t.Error("formatDate function should exist")
	}

	testTime := time.Date(2024, 12, 30, 0, 0, 0, 0, time.UTC)
	if formatDateFunc, ok := formatDate.(func(time.Time) string); ok {
		result := formatDateFunc(testTime)
		expected := "2024年12月30日"
		if result != expected {
			t.Errorf("Expected date format %s, got %s", expected, result)
		}
	} else {
		t.Error("formatDate should be a function with correct signature")
	}

	// Test truncate function
	truncate, ok := funcs["truncate"]
	if !ok {
		t.Error("truncate function should exist")
	}

	if truncateFunc, ok := truncate.(func(string, int) string); ok {
		result := truncateFunc("Hello World", 5)
		expected := "Hello..."
		if result != expected {
			t.Errorf("Expected truncated string %s, got %s", expected, result)
		}

		// Test with string shorter than limit
		shortResult := truncateFunc("Hi", 5)
		if shortResult != "Hi" {
			t.Errorf("Expected unchanged string 'Hi', got %s", shortResult)
		}
	} else {
		t.Error("truncate should be a function with correct signature")
	}

	// Test contains function
	contains, ok := funcs["contains"]
	if !ok {
		t.Error("contains function should exist")
	}

	if containsFunc, ok := contains.(func(string, string) bool); ok {
		if !containsFunc("Hello World", "World") {
			t.Error("contains should return true for existing substring")
		}

		if containsFunc("Hello World", "xyz") {
			t.Error("contains should return false for non-existing substring")
		}
	} else {
		t.Error("contains should be a function with correct signature")
	}
}

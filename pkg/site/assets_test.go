package site

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestNewAssetManager(t *testing.T) {
	am := NewAssetManager()

	if am == nil {
		t.Fatal("NewAssetManager returned nil")
	}

	if am.outputDir != "" {
		t.Error("Output directory should be empty initially")
	}
}

func TestAssetManager_SetOutputDir(t *testing.T) {
	am := NewAssetManager()
	testDir := "/test/path"

	am.SetOutputDir(testDir)

	if am.outputDir != testDir {
		t.Errorf("Expected output dir %s, got %s", testDir, am.outputDir)
	}
}

func TestGenerateAssets(t *testing.T) {
	// Create temporary directory for test
	tempDir, err := os.MkdirTemp("", "beaver-assets-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	config := &SiteConfig{
		Title:     "Test Site",
		OutputDir: tempDir,
	}

	generator := NewHTMLGenerator(config)

	err = generator.generateAssets()
	if err != nil {
		t.Fatalf("generateAssets failed: %v", err)
	}

	// Verify directory structure
	expectedDirs := []string{
		"assets",
		"assets/css",
		"assets/js",
		"assets/images",
	}

	for _, dir := range expectedDirs {
		dirPath := filepath.Join(tempDir, dir)
		if stat, err := os.Stat(dirPath); os.IsNotExist(err) {
			t.Errorf("Expected directory %s was not created", dir)
		} else if !stat.IsDir() {
			t.Errorf("Expected %s to be a directory", dir)
		}
	}

	// Verify files were created
	expectedFiles := []string{
		"assets/css/beaver-theme.css",
		"assets/js/main.js",
		"favicon.html",  // placeholder for now
		"manifest.json", // PWA manifest
	}

	for _, file := range expectedFiles {
		filePath := filepath.Join(tempDir, file)
		if _, err := os.Stat(filePath); os.IsNotExist(err) {
			t.Errorf("Expected file %s was not created", file)
		}
	}
}

func TestGenerateMainCSS(t *testing.T) {
	// Create temporary directory for test
	tempDir, err := os.MkdirTemp("", "beaver-css-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create assets/css directory
	cssDir := filepath.Join(tempDir, "assets", "css")
	if err := os.MkdirAll(cssDir, 0755); err != nil {
		t.Fatalf("Failed to create CSS directory: %v", err)
	}

	config := &SiteConfig{
		Title:     "Test Site",
		OutputDir: tempDir,
	}

	generator := NewHTMLGenerator(config)

	err = generator.generateMainCSS()
	if err != nil {
		t.Fatalf("generateMainCSS failed: %v", err)
	}

	// Verify CSS file was created
	cssPath := filepath.Join(tempDir, "assets", "css", "beaver-theme.css")
	if _, err := os.Stat(cssPath); os.IsNotExist(err) {
		t.Fatal("beaver-theme.css was not created")
	}

	// Read and verify CSS content
	content, err := os.ReadFile(cssPath)
	if err != nil {
		t.Fatalf("Failed to read CSS file: %v", err)
	}

	cssContent := string(content)

	// Check for Beaver color variables
	expectedColors := []string{
		"--beaver-primary",
		"--beaver-secondary",
		"--beaver-accent",
		"--beaver-text",
		"--beaver-background",
	}

	for _, color := range expectedColors {
		if !strings.Contains(cssContent, color) {
			t.Errorf("CSS should contain color variable %s", color)
		}
	}

	// Check for key CSS classes
	expectedClasses := []string{
		".beaver-layout",
		".beaver-card",
		".container",
		".header",
		".nav",
	}

	for _, class := range expectedClasses {
		if !strings.Contains(cssContent, class) {
			t.Errorf("CSS should contain class %s", class)
		}
	}

	// Check for responsive design
	if !strings.Contains(cssContent, "@media screen and (max-width: 768px)") {
		t.Error("CSS should contain mobile responsive rules")
	}

	// Check for accessibility features
	if !strings.Contains(cssContent, "@media (prefers-reduced-motion: reduce)") {
		t.Error("CSS should contain reduced motion accessibility rules")
	}

	if !strings.Contains(cssContent, "@media (prefers-contrast: high)") {
		t.Error("CSS should contain high contrast accessibility rules")
	}
}

func TestBuildBeaverCSS(t *testing.T) {
	config := &SiteConfig{}
	generator := NewHTMLGenerator(config)

	css := generator.buildBeaverCSS()

	if css == "" {
		t.Fatal("buildBeaverCSS returned empty string")
	}

	// Since we may or may not have the external CSS file,
	// we should test that it returns valid CSS content
	expectedContent := []string{
		":root",
		"--beaver-primary",
		"body",
		"font-family",
	}

	for _, content := range expectedContent {
		if !strings.Contains(css, content) {
			t.Errorf("CSS should contain %s", content)
		}
	}

	// Test that fallback CSS is used when external file doesn't exist
	// (by testing with a generator that has no external CSS file)
	if strings.Contains(css, "Beaver Basic Theme - Fallback") {
		// We're using fallback CSS, verify fallback content
		fallbackExpected := []string{
			"Beaver Basic Theme - Fallback",
			".container",
			".beaver-layout",
			".beaver-card",
		}

		for _, content := range fallbackExpected {
			if !strings.Contains(css, content) {
				t.Errorf("Fallback CSS should contain %s", content)
			}
		}
	} else {
		// We're using external CSS file, verify it's complete
		externalExpected := []string{
			"Beaver Brand Color Palette",
			"grid-template-columns",
			"Japanese Typography",
		}

		for _, content := range externalExpected {
			if !strings.Contains(css, content) {
				t.Errorf("External CSS should contain %s", content)
			}
		}
	}
}

func TestGenerateMainJS(t *testing.T) {
	// Create temporary directory for test
	tempDir, err := os.MkdirTemp("", "beaver-js-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create assets/js directory
	jsDir := filepath.Join(tempDir, "assets", "js")
	if err := os.MkdirAll(jsDir, 0755); err != nil {
		t.Fatalf("Failed to create JS directory: %v", err)
	}

	config := &SiteConfig{
		Title:     "Test Site",
		OutputDir: tempDir,
	}

	generator := NewHTMLGenerator(config)

	err = generator.generateMainJS()
	if err != nil {
		t.Fatalf("generateMainJS failed: %v", err)
	}

	// Verify JS file was created
	jsPath := filepath.Join(tempDir, "assets", "js", "main.js")
	if _, err := os.Stat(jsPath); os.IsNotExist(err) {
		t.Fatal("main.js was not created")
	}

	// Read and verify JS content
	content, err := os.ReadFile(jsPath)
	if err != nil {
		t.Fatalf("Failed to read JS file: %v", err)
	}

	jsContent := string(content)

	// Check for main classes and functions from PR #332
	expectedFunctions := []string{
		"class BeaverUI",
		"class BeaverSocial",
		"setupThemeToggle",
		"setupSearch",
		"setupTableOfContents",
		"performSearch",
	}

	for _, function := range expectedFunctions {
		if !strings.Contains(jsContent, function) {
			t.Errorf("JS should contain function %s", function)
		}
	}

	// Check for event listeners
	if !strings.Contains(jsContent, "DOMContentLoaded") {
		t.Error("JS should contain DOMContentLoaded event listener")
	}

	// Check for service worker registration
	if !strings.Contains(jsContent, "serviceWorker") {
		t.Error("JS should contain service worker registration")
	}

	// Check for IntersectionObserver (for animations)
	if !strings.Contains(jsContent, "IntersectionObserver") {
		t.Error("JS should contain IntersectionObserver for animations")
	}

	// Check for Japanese search support
	if !strings.Contains(jsContent, "検索... (Japanese/English)") {
		t.Error("JS should contain Japanese search placeholder")
	}
}

func TestGenerateFavicon(t *testing.T) {
	// Create temporary directory for test
	tempDir, err := os.MkdirTemp("", "beaver-favicon-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	config := &SiteConfig{
		Title:     "Test Site",
		OutputDir: tempDir,
	}

	generator := NewHTMLGenerator(config)

	err = generator.generateFavicon()
	if err != nil {
		t.Fatalf("generateFavicon failed: %v", err)
	}

	// Verify favicon placeholder was created
	faviconPath := filepath.Join(tempDir, "favicon.html")
	if _, err := os.Stat(faviconPath); os.IsNotExist(err) {
		t.Fatal("favicon.html was not created")
	}

	// Read and verify content
	content, err := os.ReadFile(faviconPath)
	if err != nil {
		t.Fatalf("Failed to read favicon file: %v", err)
	}

	faviconContent := string(content)
	if !strings.Contains(faviconContent, "Favicon placeholder") {
		t.Error("Favicon file should contain placeholder comment")
	}
}

func TestGenerateAssets_InvalidDirectory(t *testing.T) {
	config := &SiteConfig{
		Title:     "Test Site",
		OutputDir: "/invalid/path/that/cannot/be/created",
	}

	generator := NewHTMLGenerator(config)

	err := generator.generateAssets()
	if err == nil {
		t.Error("Expected error for invalid directory, got nil")
	}

	if !strings.Contains(err.Error(), "failed to create") {
		t.Errorf("Expected error about directory creation, got: %s", err.Error())
	}
}

func TestGenerateMainCSS_InvalidDirectory(t *testing.T) {
	config := &SiteConfig{
		Title:     "Test Site",
		OutputDir: "/invalid/path",
	}

	generator := NewHTMLGenerator(config)

	err := generator.generateMainCSS()
	if err == nil {
		t.Error("Expected error for invalid directory, got nil")
	}

	if !strings.Contains(err.Error(), "failed to write CSS file") {
		t.Errorf("Expected error about CSS file writing, got: %s", err.Error())
	}
}

func TestGenerateMainJS_InvalidDirectory(t *testing.T) {
	config := &SiteConfig{
		Title:     "Test Site",
		OutputDir: "/invalid/path",
	}

	generator := NewHTMLGenerator(config)

	err := generator.generateMainJS()
	if err == nil {
		t.Error("Expected error for invalid directory, got nil")
	}

	if !strings.Contains(err.Error(), "failed to write JS file") {
		t.Errorf("Expected error about JS file writing, got: %s", err.Error())
	}
}

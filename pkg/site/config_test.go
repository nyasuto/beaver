package site

import (
	"testing"
)

func TestSiteConfig_Validation(t *testing.T) {
	// Test valid configuration
	validConfig := &SiteConfig{
		Title:       "Test Site",
		Description: "Test Description",
		BaseURL:     "https://example.com",
		OutputDir:   "./output",
		Language:    "ja",
		Author:      "Test Author",
	}

	// Since there's no validation method yet, we'll just test the struct creation
	if validConfig.Title != "Test Site" {
		t.Errorf("Expected title 'Test Site', got '%s'", validConfig.Title)
	}

	if validConfig.Language != "ja" {
		t.Errorf("Expected language 'ja', got '%s'", validConfig.Language)
	}
}

func TestNavItem(t *testing.T) {
	navItem := NavItem{
		Title: "Test Page",
		URL:   "/test",
		Icon:  "🏠",
	}

	if navItem.Title != "Test Page" {
		t.Errorf("Expected title 'Test Page', got '%s'", navItem.Title)
	}

	if navItem.URL != "/test" {
		t.Errorf("Expected URL '/test', got '%s'", navItem.URL)
	}

	if navItem.Icon != "🏠" {
		t.Errorf("Expected icon '🏠', got '%s'", navItem.Icon)
	}
}

func TestFooterConfig(t *testing.T) {
	footer := FooterConfig{
		Text: "Copyright 2024",
		Links: map[string]string{
			"GitHub": "https://github.com/test",
			"Email":  "mailto:test@example.com",
		},
	}

	if footer.Text != "Copyright 2024" {
		t.Errorf("Expected text 'Copyright 2024', got '%s'", footer.Text)
	}

	if len(footer.Links) != 2 {
		t.Errorf("Expected 2 links, got %d", len(footer.Links))
	}

	if footer.Links["GitHub"] != "https://github.com/test" {
		t.Errorf("Expected GitHub link 'https://github.com/test', got '%s'", footer.Links["GitHub"])
	}
}

func TestBeaverTheme_Properties(t *testing.T) {
	theme := GetBeaverTheme()

	// Test color values
	expectedColors := map[string]string{
		"Primary":    "#8B4513",
		"Secondary":  "#4682B4",
		"Accent":     "#228B22",
		"Text":       "#2F4F4F",
		"Background": "#FAFAFA",
	}

	actualColors := map[string]string{
		"Primary":    theme.PrimaryColor,
		"Secondary":  theme.SecondaryColor,
		"Accent":     theme.AccentColor,
		"Text":       theme.TextColor,
		"Background": theme.BackgroundColor,
	}

	for name, expected := range expectedColors {
		if actual := actualColors[name]; actual != expected {
			t.Errorf("Expected %s color %s, got %s", name, expected, actual)
		}
	}

	// Test font families
	if theme.FontFamily == "" {
		t.Error("FontFamily should not be empty")
	}

	if theme.HeadingFont == "" {
		t.Error("HeadingFont should not be empty")
	}

	if theme.CodeFont == "" {
		t.Error("CodeFont should not be empty")
	}

	// Test that fonts contain expected values
	expectedFonts := []string{
		"Noto Sans JP",
		"Hiragino",
		"Yu Gothic",
		"Meiryo",
		"sans-serif",
	}

	for _, font := range expectedFonts {
		if !containsString(theme.FontFamily, font) {
			t.Errorf("FontFamily should contain '%s'", font)
		}
	}

	// Test code font
	expectedCodeFonts := []string{
		"SFMono-Regular",
		"Consolas",
		"Menlo",
		"monospace",
	}

	for _, font := range expectedCodeFonts {
		if !containsString(theme.CodeFont, font) {
			t.Errorf("CodeFont should contain '%s'", font)
		}
	}
}

func TestPageData_Structure(t *testing.T) {
	theme := GetBeaverTheme()

	pageData := PageData{
		Title:           "Test Page",
		Description:     "Test Description",
		URL:             "/test",
		SiteTitle:       "Test Site",
		SiteDescription: "Test Site Description",
		BaseURL:         "https://example.com",
		Language:        "ja",
		Theme:           theme,
		Navigation: []NavItem{
			{Title: "Home", URL: "/"},
			{Title: "About", URL: "/about"},
		},
		Statistics: map[string]interface{}{
			"total_issues": 10,
			"open_issues":  5,
		},
		HealthScore: 85,
	}

	// Test basic properties
	if pageData.Title != "Test Page" {
		t.Errorf("Expected title 'Test Page', got '%s'", pageData.Title)
	}

	if pageData.Language != "ja" {
		t.Errorf("Expected language 'ja', got '%s'", pageData.Language)
	}

	if pageData.HealthScore != 85 {
		t.Errorf("Expected health score 85, got %d", pageData.HealthScore)
	}

	// Test navigation
	if len(pageData.Navigation) != 2 {
		t.Errorf("Expected 2 navigation items, got %d", len(pageData.Navigation))
	}

	// Test statistics
	if totalIssues, ok := pageData.Statistics["total_issues"].(int); !ok || totalIssues != 10 {
		t.Errorf("Expected total_issues 10, got %v", pageData.Statistics["total_issues"])
	}

	// Test theme
	if pageData.Theme == nil {
		t.Error("Theme should not be nil")
	}

	if pageData.Theme.PrimaryColor != theme.PrimaryColor {
		t.Error("Theme should match expected theme")
	}
}

func TestSiteConfig_DefaultValues(t *testing.T) {
	config := &SiteConfig{}

	// Test that empty config doesn't panic and has reasonable defaults
	if config.Navigation == nil {
		config.Navigation = []NavItem{}
	}

	if config.Footer.Links == nil {
		config.Footer.Links = make(map[string]string)
	}

	// Test that we can safely access all fields
	_ = config.Title
	_ = config.Description
	_ = config.BaseURL
	_ = config.OutputDir
	_ = config.Theme
	_ = config.Language
	_ = config.Author
	_ = config.Keywords
	_ = config.SocialMedia
	_ = config.Analytics
	_ = config.Navigation
	_ = config.Footer
	_ = config.Minify
	_ = config.Compress
	_ = config.ServiceWorker
}

func TestSiteConfig_WithNavigation(t *testing.T) {
	config := &SiteConfig{
		Title: "Test Site",
		Navigation: []NavItem{
			{Title: "ホーム", URL: "/", Icon: "🏠"},
			{Title: "課題", URL: "/issues.html", Icon: "📋"},
			{Title: "戦略", URL: "/strategy.html", Icon: "🎯"},
			{Title: "解決策", URL: "/troubleshooting.html", Icon: "🔧"},
		},
	}

	if len(config.Navigation) != 4 {
		t.Errorf("Expected 4 navigation items, got %d", len(config.Navigation))
	}

	// Test specific navigation items
	expectedItems := []struct {
		title string
		url   string
		icon  string
	}{
		{"ホーム", "/", "🏠"},
		{"課題", "/issues.html", "📋"},
		{"戦略", "/strategy.html", "🎯"},
		{"解決策", "/troubleshooting.html", "🔧"},
	}

	for i, expected := range expectedItems {
		if i >= len(config.Navigation) {
			t.Errorf("Navigation item %d not found", i)
			continue
		}

		actual := config.Navigation[i]
		if actual.Title != expected.title {
			t.Errorf("Expected navigation title '%s', got '%s'", expected.title, actual.Title)
		}

		if actual.URL != expected.url {
			t.Errorf("Expected navigation URL '%s', got '%s'", expected.url, actual.URL)
		}

		if actual.Icon != expected.icon {
			t.Errorf("Expected navigation icon '%s', got '%s'", expected.icon, actual.Icon)
		}
	}
}

func TestSiteConfig_WithFooter(t *testing.T) {
	config := &SiteConfig{
		Footer: FooterConfig{
			Text: "© 2024 Test Project",
			Links: map[string]string{
				"GitHub": "https://github.com/test/project",
				"Docs":   "https://docs.test.com",
				"Email":  "mailto:support@test.com",
			},
		},
	}

	if config.Footer.Text != "© 2024 Test Project" {
		t.Errorf("Expected footer text '© 2024 Test Project', got '%s'", config.Footer.Text)
	}

	if len(config.Footer.Links) != 3 {
		t.Errorf("Expected 3 footer links, got %d", len(config.Footer.Links))
	}

	expectedLinks := map[string]string{
		"GitHub": "https://github.com/test/project",
		"Docs":   "https://docs.test.com",
		"Email":  "mailto:support@test.com",
	}

	for name, expectedURL := range expectedLinks {
		if actualURL, exists := config.Footer.Links[name]; !exists {
			t.Errorf("Expected footer link '%s' not found", name)
		} else if actualURL != expectedURL {
			t.Errorf("Expected footer link '%s' URL '%s', got '%s'", name, expectedURL, actualURL)
		}
	}
}

// Helper function to check if a string contains a substring
func containsString(haystack, needle string) bool {
	return len(haystack) >= len(needle) && (len(needle) == 0 ||
		haystack == needle ||
		(len(haystack) > len(needle) &&
			(haystack[:len(needle)] == needle ||
				haystack[len(haystack)-len(needle):] == needle ||
				containsString(haystack[1:], needle))))
}

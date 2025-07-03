package content

import (
	"testing"

	"github.com/nyasuto/beaver/internal/models"
)

func TestNavigationManager(t *testing.T) {
	nm := NewNavigationManager()

	t.Run("GetNavigationContext for Home", func(t *testing.T) {
		context := nm.GetNavigationContext("Home")

		if context.CurrentPage != "Home" {
			t.Errorf("Expected CurrentPage to be 'Home', got '%s'", context.CurrentPage)
		}

		if context.SectionType != "root" {
			t.Errorf("Expected SectionType to be 'root', got '%s'", context.SectionType)
		}

		if len(context.BreadcrumbPath) == 0 {
			t.Error("Expected breadcrumb path to have at least one item")
		}
	})

	t.Run("GetNavigationContext for Issues-Summary", func(t *testing.T) {
		context := nm.GetNavigationContext("Issues-Summary")

		if context.CurrentPage != "Issues-Summary" {
			t.Errorf("Expected CurrentPage to be 'Issues-Summary', got '%s'", context.CurrentPage)
		}

		if context.ParentPage != "Home" {
			t.Errorf("Expected ParentPage to be 'Home', got '%s'", context.ParentPage)
		}

		if len(context.BreadcrumbPath) < 2 {
			t.Error("Expected breadcrumb path to have at least 2 items for sub-page")
		}
	})

	t.Run("GetAllSections", func(t *testing.T) {
		sections := nm.GetAllSections()

		if len(sections) == 0 {
			t.Error("Expected at least one section")
		}

		// Check for expected default sections
		foundAnalysis := false
		foundDevelopment := false
		for _, section := range sections {
			if section.Name == "Analysis Reports" {
				foundAnalysis = true
			}
			if section.Name == "Development Guide" {
				foundDevelopment = true
			}
		}

		if !foundAnalysis {
			t.Error("Expected to find 'Analysis Reports' section")
		}
		if !foundDevelopment {
			t.Error("Expected to find 'Development Guide' section")
		}
	})

	t.Run("GenerateBreadcrumbHTML", func(t *testing.T) {
		breadcrumb := nm.GenerateBreadcrumbHTML("Issues-Summary")

		if breadcrumb == "" {
			t.Error("Expected non-empty breadcrumb HTML")
		}

		t.Logf("Generated breadcrumb: %s", breadcrumb)

		// Should contain Home link and current page
		if !containsNavigationSubstring(breadcrumb, "Home") {
			t.Error("Expected breadcrumb to contain 'Home'")
		}
		if !containsNavigationSubstring(breadcrumb, "Issues Summary") {
			t.Error("Expected breadcrumb to contain 'Issues Summary'")
		}
	})

	t.Run("GenerateNavigationFooter", func(t *testing.T) {
		footer := nm.GenerateNavigationFooter("Learning-Path")

		if footer == "" {
			t.Error("Expected non-empty navigation footer")
		}

		// Should contain navigation elements
		if !containsNavigationSubstring(footer, "Navigation") {
			t.Error("Expected footer to contain navigation section")
		}
	})
}

func TestNavigationManagerWithDynamicSections(t *testing.T) {
	nm := NewNavigationManager()

	// Create test issues with various labels
	issues := []models.Issue{
		{
			Number: 1,
			Title:  "Bug in authentication",
			Body:   "Auth system failing",
			Labels: []models.Label{{Name: "bug"}, {Name: "security"}},
		},
		{
			Number: 2,
			Title:  "Feature request for API",
			Body:   "Need new API endpoint",
			Labels: []models.Label{{Name: "feature"}, {Name: "api"}},
		},
		{
			Number: 3,
			Title:  "Performance issue in database",
			Body:   "Query running slowly",
			Labels: []models.Label{{Name: "performance"}, {Name: "database"}},
		},
		{
			Number: 4,
			Title:  "Documentation update needed",
			Body:   "Docs are outdated",
			Labels: []models.Label{{Name: "documentation"}},
		},
		{
			Number: 5,
			Title:  "Security vulnerability found",
			Body:   "Potential security issue",
			Labels: []models.Label{{Name: "security"}, {Name: "vulnerability"}},
		},
	}

	t.Run("AddDynamicSection", func(t *testing.T) {
		initialSections := len(nm.GetAllSections())

		// Create enough issues to meet the threshold for dynamic section creation
		moreSecurityIssues := []models.Issue{
			{Number: 6, Title: "Security issue 1", Labels: []models.Label{{Name: "security"}}},
			{Number: 7, Title: "Security issue 2", Labels: []models.Label{{Name: "security"}}},
			{Number: 8, Title: "Security issue 3", Labels: []models.Label{{Name: "security"}}},
			{Number: 9, Title: "Security issue 4", Labels: []models.Label{{Name: "security"}}},
			{Number: 10, Title: "Security issue 5", Labels: []models.Label{{Name: "security"}}},
		}
		allIssues := append(issues, moreSecurityIssues...)

		nm.AddDynamicSection("Security Issues", "🔒", "Security-related problems", allIssues)

		sections := nm.GetAllSections()
		if len(sections) <= initialSections {
			t.Logf("Initial sections: %d, final sections: %d", initialSections, len(sections))
			t.Error("Expected dynamic section to be added")
		}
	})

	t.Run("categorizeIssues", func(t *testing.T) {
		categories := nm.categorizeIssues(issues)

		if len(categories) == 0 {
			t.Error("Expected issues to be categorized")
		}

		// Should have security and other categories
		if _, exists := categories["Security"]; !exists {
			t.Error("Expected 'Security' category to exist")
		}
	})

	t.Run("isPrimaryLabel", func(t *testing.T) {
		testCases := []struct {
			label    string
			expected bool
		}{
			{"bug", true},
			{"feature", true},
			{"documentation", true},
			{"random-label", false},
			{"enhancement", true},
			{"performance", true},
		}

		for _, tc := range testCases {
			result := nm.isPrimaryLabel(tc.label)
			if result != tc.expected {
				t.Errorf("isPrimaryLabel(%s) = %v, expected %v", tc.label, result, tc.expected)
			}
		}
	})

	t.Run("getCategoryIcon", func(t *testing.T) {
		testCases := []struct {
			category string
			expected string
		}{
			{"Bug Reports", "🐛"},
			{"Feature Requests", "✨"},
			{"Documentation", "📚"},
			{"Performance", "⚡"},
			{"Security", "🔒"},
			{"Unknown Category", "📄"},
		}

		for _, tc := range testCases {
			result := nm.getCategoryIcon(tc.category)
			if result != tc.expected {
				t.Errorf("getCategoryIcon(%s) = %s, expected %s", tc.category, result, tc.expected)
			}
		}
	})
}

func TestSidebarGenerator(t *testing.T) {
	sg := NewSidebarGenerator()

	t.Run("GenerateSidebar", func(t *testing.T) {
		issues := []models.Issue{
			{Number: 1, Title: "Test issue", Body: "Test content"},
		}

		page, err := sg.GenerateSidebar("Test Project", issues)
		if err != nil {
			t.Fatalf("Failed to generate sidebar: %v", err)
		}

		if page.Filename != "_Sidebar.md" {
			t.Errorf("Expected filename '_Sidebar.md', got '%s'", page.Filename)
		}

		if page.Title != "_Sidebar" {
			t.Errorf("Expected title '_Sidebar', got '%s'", page.Title)
		}

		if page.Content == "" {
			t.Error("Expected non-empty sidebar content")
		}

		// Should contain navigation elements
		if !containsNavigationSubstring(page.Content, "Navigation") {
			t.Error("Expected sidebar to contain 'Navigation'")
		}
		if !containsNavigationSubstring(page.Content, "Home") {
			t.Error("Expected sidebar to contain 'Home'")
		}
	})

	t.Run("GenerateCompactSidebar", func(t *testing.T) {
		page, err := sg.GenerateCompactSidebar("Test Project")
		if err != nil {
			t.Fatalf("Failed to generate compact sidebar: %v", err)
		}

		if page.Content == "" {
			t.Error("Expected non-empty compact sidebar content")
		}

		// Compact sidebar should be shorter
		if len(page.Content) > 500 {
			t.Error("Expected compact sidebar to be under 500 characters")
		}
	})

	t.Run("SetCustomTemplate", func(t *testing.T) {
		customTemplate := `# Custom Navigation
- [Home](Home)
- [Custom](Custom)`

		err := sg.SetCustomTemplate(customTemplate)
		if err != nil {
			t.Fatalf("Failed to set custom template: %v", err)
		}

		// Test with invalid template
		err = sg.SetCustomTemplate(`{{invalid template syntax`)
		if err == nil {
			t.Error("Expected error for invalid template syntax")
		}
	})
}

// Helper function to check if a string contains a substring
func containsNavigationSubstring(s, substr string) bool {
	return len(s) >= len(substr) && findNavigationSubstring(s, substr) != -1
}

// Simple substring search
func findNavigationSubstring(s, substr string) int {
	if len(substr) == 0 {
		return 0
	}
	if len(s) < len(substr) {
		return -1
	}

	for i := 0; i <= len(s)-len(substr); i++ {
		match := true
		for j := 0; j < len(substr); j++ {
			if s[i+j] != substr[j] {
				match = false
				break
			}
		}
		if match {
			return i
		}
	}
	return -1
}

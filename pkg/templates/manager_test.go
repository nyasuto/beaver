package templates

import (
	"embed"
	"testing"
	"time"

	"github.com/nyasuto/beaver/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

//go:embed base/* content/*
var testTemplateFS embed.FS

func TestUnifiedTemplateManager(t *testing.T) {
	manager := NewUnifiedTemplateManager()
	loader := NewEmbedLoader(testTemplateFS)
	manager.SetLoader(loader)

	t.Run("Manager Creation", func(t *testing.T) {
		assert.NotNil(t, manager)
		assert.Len(t, manager.GetSupportedFormats(), 3)

		formats := manager.GetSupportedFormats()
		assert.Contains(t, formats, FormatHTML)
		assert.Contains(t, formats, FormatMarkdown)
		assert.Contains(t, formats, FormatYAML)
	})

	t.Run("Template Loading", func(t *testing.T) {
		tmpl, err := manager.LoadTemplate("base/layout.tmpl")
		require.NoError(t, err)
		assert.NotNil(t, tmpl)
	})

	t.Run("Render HTML Format", func(t *testing.T) {
		data := createTestPageData()

		result, err := manager.Render("content/home.tmpl", FormatHTML, data)
		require.NoError(t, err)
		assert.NotEmpty(t, result)
		assert.Contains(t, result, "home-container")
		assert.Contains(t, result, data.Meta.Title)
	})

	t.Run("Render Markdown Format", func(t *testing.T) {
		data := createTestPageData()

		result, err := manager.Render("content/home.tmpl", FormatMarkdown, data)
		require.NoError(t, err)
		assert.NotEmpty(t, result)
		assert.Contains(t, result, "# "+data.Meta.Title)
		assert.Contains(t, result, "## Overview")
	})

	t.Run("Multi-Format Rendering", func(t *testing.T) {
		data := createTestPageData()
		multiRenderer := NewMultiFormatRenderer(manager)

		formats := []OutputFormat{FormatHTML, FormatMarkdown}
		results, err := multiRenderer.RenderMultiple("content/home.tmpl", formats, data)
		require.NoError(t, err)

		assert.Len(t, results, 2)
		assert.Contains(t, results, FormatHTML)
		assert.Contains(t, results, FormatMarkdown)
		assert.NotEmpty(t, results[FormatHTML])
		assert.NotEmpty(t, results[FormatMarkdown])
	})
}

func TestFormatRenderers(t *testing.T) {
	manager := NewUnifiedTemplateManager()
	loader := NewEmbedLoader(testTemplateFS)
	manager.SetLoader(loader)

	t.Run("HTML Renderer", func(t *testing.T) {
		renderer := &HTMLRenderer{manager: manager}

		assert.Equal(t, ".html", renderer.GetExtension())
		assert.Equal(t, "text/html", renderer.GetContentType())

		data := createTestPageData()
		result, err := renderer.Render("content/home.tmpl", data)
		require.NoError(t, err)
		assert.NotEmpty(t, result)
	})

	t.Run("Markdown Renderer", func(t *testing.T) {
		renderer := &MarkdownRenderer{manager: manager}

		assert.Equal(t, ".md", renderer.GetExtension())
		assert.Equal(t, "text/markdown", renderer.GetContentType())

		data := createTestPageData()
		result, err := renderer.Render("content/home.tmpl", data)
		require.NoError(t, err)
		assert.NotEmpty(t, result)
	})

	t.Run("YAML Renderer", func(t *testing.T) {
		renderer := &YAMLRenderer{manager: manager}

		assert.Equal(t, ".yml", renderer.GetExtension())
		assert.Equal(t, "text/yaml", renderer.GetContentType())

		data := createTestPageData()
		result, err := renderer.Render("content/home.tmpl", data)
		require.NoError(t, err)
		assert.NotEmpty(t, result)
	})
}

func TestTemplateFunctions(t *testing.T) {
	funcMap := createUnifiedFuncMap()

	t.Run("Date Functions", func(t *testing.T) {
		now := time.Now()

		formatDateFunc := funcMap["formatDate"].(func(time.Time) string)
		result := formatDateFunc(now)
		assert.Equal(t, now.Format("2006-01-02"), result)

		formatDateTimeFunc := funcMap["formatDateTime"].(func(time.Time) string)
		result = formatDateTimeFunc(now)
		assert.Equal(t, now.Format("2006-01-02 15:04:05"), result)
	})

	t.Run("Text Functions", func(t *testing.T) {
		truncateFunc := funcMap["truncate"].(func(string, int) string)

		result := truncateFunc("Hello World", 5)
		assert.Equal(t, "Hello...", result)

		result = truncateFunc("Hi", 10)
		assert.Equal(t, "Hi", result)
	})

	t.Run("Math Functions", func(t *testing.T) {
		addFunc := funcMap["add"].(func(int, int) int)
		assert.Equal(t, 5, addFunc(2, 3))

		divFunc := funcMap["div"].(func(int, int) int)
		assert.Equal(t, 2, divFunc(6, 3))
		assert.Equal(t, 0, divFunc(5, 0)) // Division by zero
	})

	t.Run("Collection Functions", func(t *testing.T) {
		issues := []models.Issue{
			{State: "open"},
			{State: "open"},
			{State: "closed"},
		}

		countFunc := funcMap["countByState"].(func([]models.Issue, string) int)
		assert.Equal(t, 2, countFunc(issues, "open"))
		assert.Equal(t, 1, countFunc(issues, "closed"))

		lenFunc := funcMap["len"].(func(interface{}) int)
		assert.Equal(t, 3, lenFunc(issues))
	})
}

func TestEmbedLoader(t *testing.T) {
	loader := NewEmbedLoader(testTemplateFS)

	t.Run("Load Template", func(t *testing.T) {
		content, err := loader.LoadTemplate("base/layout.tmpl")
		require.NoError(t, err)
		assert.NotEmpty(t, content)
		assert.Contains(t, content, "Base layout template")
	})

	t.Run("List Templates", func(t *testing.T) {
		templates, err := loader.ListTemplates()
		require.NoError(t, err)
		assert.NotEmpty(t, templates)

		// Check that our test templates are found
		var foundLayout, foundHome bool
		for _, tmpl := range templates {
			if tmpl == "base/layout.tmpl" {
				foundLayout = true
			}
			if tmpl == "content/home.tmpl" {
				foundHome = true
			}
		}
		assert.True(t, foundLayout, "Should find layout template")
		assert.True(t, foundHome, "Should find home template")
	})

	t.Run("Load Non-existent Template", func(t *testing.T) {
		_, err := loader.LoadTemplate("non-existent.tmpl")
		assert.Error(t, err)
	})
}

// Helper function to create test data
func createTestPageData() *UnifiedPageData {
	return &UnifiedPageData{
		Meta: PageMetadata{
			Title:       "Test Knowledge Base",
			Description: "A test knowledge base for Beaver",
			Keywords:    []string{"test", "beaver", "knowledge"},
			Author:      "Test Author",
			Created:     time.Now(),
			Modified:    time.Now(),
			URL:         "/",
			Type:        "website",
		},
		Context: RenderContext{
			Format:   FormatHTML,
			Theme:    "beaver",
			Features: []string{"pwa", "analytics"},
			Navigation: []NavItem{
				{Title: "Home", URL: "/", Icon: "🏠"},
				{Title: "Issues", URL: "/issues.html", Icon: "📋"},
				{Title: "Strategy", URL: "/strategy.html", Icon: "🎯"},
			},
			BaseURL:   "https://example.github.io",
			BasePath:  "/repo",
			Language:  "ja",
			Analytics: "GA_TRACKING_ID",
		},
		Issues: []models.Issue{
			{
				ID:        1,
				Number:    1,
				Title:     "Test Issue 1",
				Body:      "This is a test issue body",
				State:     "open",
				User:      models.User{Login: "testuser"},
				HTMLURL:   "https://github.com/test/repo/issues/1",
				CreatedAt: time.Now(),
			},
			{
				ID:        2,
				Number:    2,
				Title:     "Test Issue 2",
				Body:      "This is another test issue",
				State:     "closed",
				User:      models.User{Login: "testuser2"},
				HTMLURL:   "https://github.com/test/repo/issues/2",
				CreatedAt: time.Now().Add(-24 * time.Hour),
			},
		},
	}
}

func TestTemplateFunctionEdgeCases(t *testing.T) {
	funcMap := createUnifiedFuncMap()

	t.Run("Empty String Handling", func(t *testing.T) {
		emptyFunc := funcMap["empty"].(func(interface{}) bool)
		assert.True(t, emptyFunc(""))
		assert.True(t, emptyFunc(nil))
		assert.False(t, emptyFunc("test"))
		assert.False(t, emptyFunc(123))
	})

	t.Run("Default Value Function", func(t *testing.T) {
		defaultFunc := funcMap["default"].(func(interface{}, interface{}) interface{})
		assert.Equal(t, "default", defaultFunc("default", ""))
		assert.Equal(t, "default", defaultFunc("default", nil))
		assert.Equal(t, "value", defaultFunc("default", "value"))
	})

	t.Run("Length Function Edge Cases", func(t *testing.T) {
		lenFunc := funcMap["len"].(func(interface{}) int)
		assert.Equal(t, 0, lenFunc([]models.Issue{}))
		assert.Equal(t, 0, lenFunc(""))
		assert.Equal(t, 0, lenFunc(123)) // Unsupported type
	})
}

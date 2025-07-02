package templates

import (
	"embed"
	"fmt"
	"html/template"
	"io/fs"
	"path/filepath"
	"strings"
	"time"

	"github.com/nyasuto/beaver/internal/models"
)

// OutputFormat defines the output format for template rendering
type OutputFormat string

const (
	FormatHTML     OutputFormat = "html"
	FormatMarkdown OutputFormat = "markdown"
	FormatYAML     OutputFormat = "yaml"
)

// UnifiedTemplateManager manages templates across multiple output formats
type UnifiedTemplateManager struct {
	baseTemplates   map[string]*template.Template
	formatRenderers map[OutputFormat]FormatRenderer
	functions       template.FuncMap
	loader          TemplateLoader
}

// FormatRenderer defines the interface for format-specific rendering
type FormatRenderer interface {
	Render(templateName string, data interface{}) (string, error)
	GetExtension() string
	GetContentType() string
}

// TemplateLoader defines the interface for loading templates
type TemplateLoader interface {
	LoadTemplate(name string) (string, error)
	ListTemplates() ([]string, error)
}

// UnifiedPageData represents data for template rendering
type UnifiedPageData struct {
	Meta    PageMetadata   `json:"meta"`
	Content interface{}    `json:"content"`
	Context RenderContext  `json:"context"`
	Issues  []models.Issue `json:"issues,omitempty"`
	Stats   interface{}    `json:"stats,omitempty"`
}

// PageMetadata contains page metadata
type PageMetadata struct {
	Title       string            `json:"title"`
	Description string            `json:"description"`
	Keywords    []string          `json:"keywords"`
	Author      string            `json:"author"`
	Created     time.Time         `json:"created"`
	Modified    time.Time         `json:"modified"`
	URL         string            `json:"url"`
	Type        string            `json:"type"`
	Custom      map[string]string `json:"custom"`
}

// RenderContext provides rendering context information
type RenderContext struct {
	Format     OutputFormat `json:"format"`
	Theme      string       `json:"theme"`
	Features   []string     `json:"features"`
	Navigation []NavItem    `json:"navigation"`
	BaseURL    string       `json:"base_url"`
	BasePath   string       `json:"base_path"`
	Language   string       `json:"language"`
	Analytics  string       `json:"analytics,omitempty"`
}

// NavItem represents a navigation item
type NavItem struct {
	Title string `json:"title"`
	URL   string `json:"url"`
	Icon  string `json:"icon,omitempty"`
}

// EmbedLoader loads templates from embedded filesystem
type EmbedLoader struct {
	fs embed.FS
}

// NewUnifiedTemplateManager creates a new unified template manager
func NewUnifiedTemplateManager() *UnifiedTemplateManager {
	manager := &UnifiedTemplateManager{
		baseTemplates:   make(map[string]*template.Template),
		formatRenderers: make(map[OutputFormat]FormatRenderer),
		functions:       createUnifiedFuncMap(),
	}

	// Register format renderers
	manager.RegisterRenderer(FormatHTML, &HTMLRenderer{manager: manager})
	manager.RegisterRenderer(FormatMarkdown, &MarkdownRenderer{manager: manager})
	manager.RegisterRenderer(FormatYAML, &YAMLRenderer{manager: manager})

	return manager
}

// RegisterRenderer registers a format renderer
func (m *UnifiedTemplateManager) RegisterRenderer(format OutputFormat, renderer FormatRenderer) {
	m.formatRenderers[format] = renderer
}

// SetLoader sets the template loader
func (m *UnifiedTemplateManager) SetLoader(loader TemplateLoader) {
	m.loader = loader
}

// LoadTemplate loads and parses a template
func (m *UnifiedTemplateManager) LoadTemplate(name string) (*template.Template, error) {
	if tmpl, exists := m.baseTemplates[name]; exists {
		return tmpl, nil
	}

	if m.loader == nil {
		return nil, fmt.Errorf("no template loader configured")
	}

	content, err := m.loader.LoadTemplate(name)
	if err != nil {
		return nil, fmt.Errorf("failed to load template %s: %w", name, err)
	}

	tmpl, err := template.New(name).Funcs(m.functions).Parse(content)
	if err != nil {
		return nil, fmt.Errorf("failed to parse template %s: %w", name, err)
	}

	m.baseTemplates[name] = tmpl
	return tmpl, nil
}

// Render renders a template with the specified format
func (m *UnifiedTemplateManager) Render(templateName string, format OutputFormat, data *UnifiedPageData) (string, error) {
	renderer, exists := m.formatRenderers[format]
	if !exists {
		return "", fmt.Errorf("unsupported format: %s", format)
	}

	// Set format in context
	data.Context.Format = format

	return renderer.Render(templateName, data)
}

// GetSupportedFormats returns the list of supported output formats
func (m *UnifiedTemplateManager) GetSupportedFormats() []OutputFormat {
	formats := make([]OutputFormat, 0, len(m.formatRenderers))
	for format := range m.formatRenderers {
		formats = append(formats, format)
	}
	return formats
}

// LoadTemplate implementation for EmbedLoader
func (e *EmbedLoader) LoadTemplate(name string) (string, error) {
	content, err := fs.ReadFile(e.fs, name)
	if err != nil {
		return "", err
	}
	return string(content), nil
}

// ListTemplates implementation for EmbedLoader
func (e *EmbedLoader) ListTemplates() ([]string, error) {
	var templates []string
	err := fs.WalkDir(e.fs, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if !d.IsDir() && (strings.HasSuffix(path, ".tmpl") || strings.HasSuffix(path, ".html") || strings.HasSuffix(path, ".md")) {
			templates = append(templates, path)
		}
		return nil
	})
	return templates, err
}

// NewEmbedLoader creates a new embed filesystem loader
func NewEmbedLoader(embedFS embed.FS) *EmbedLoader {
	return &EmbedLoader{fs: embedFS}
}

// createUnifiedFuncMap creates the unified template function map
func createUnifiedFuncMap() template.FuncMap {
	return template.FuncMap{
		// Date/Time functions
		"formatDate":     formatDate,
		"formatDateTime": formatDateTime,
		"now":            func() time.Time { return time.Now() },

		// Text functions
		"truncate":  truncateText,
		"title":     titleText,
		"upper":     strings.ToUpper,
		"lower":     strings.ToLower,
		"replace":   strings.ReplaceAll,
		"contains":  strings.Contains,
		"hasPrefix": strings.HasPrefix,
		"hasSuffix": strings.HasSuffix,

		// Math functions
		"add": func(a, b int) int { return a + b },
		"sub": func(a, b int) int { return a - b },
		"mul": func(a, b int) int { return a * b },
		"div": func(a, b int) int {
			if b == 0 {
				return 0
			}
			return a / b
		},

		// Collection functions
		"len":          func(v interface{}) int { return getLength(v) },
		"countByState": countIssuesByState,
		"filter":       filterIssues,
		"sortBy":       sortIssues,

		// Format functions
		"toHTML":     toHTML,
		"toMarkdown": toMarkdown,
		"toYAML":     toYAML,
		"escapeHTML": template.HTMLEscapeString,

		// URL functions
		"joinPath": filepath.Join,
		"baseName": filepath.Base,
		"dirName":  filepath.Dir,

		// Conditional functions
		"default": func(defaultVal, val interface{}) interface{} {
			if val == nil || val == "" {
				return defaultVal
			}
			return val
		},
		"empty": func(val interface{}) bool {
			return val == nil || val == ""
		},
		"has": func(slice []string, item string) bool {
			for _, s := range slice {
				if s == item {
					return true
				}
			}
			return false
		},
		"slice": func(start, end int, items interface{}) interface{} {
			switch v := items.(type) {
			case []models.Issue:
				if start < 0 {
					start = 0
				}
				if end > len(v) {
					end = len(v)
				}
				if start >= end {
					return []models.Issue{}
				}
				return v[start:end]
			default:
				return items
			}
		},
	}
}

// Helper functions implementation

func formatDate(t time.Time) string {
	return t.Format("2006-01-02")
}

func formatDateTime(t time.Time) string {
	return t.Format("2006-01-02 15:04:05")
}

func truncateText(text string, length int) string {
	if len(text) <= length {
		return text
	}
	return text[:length] + "..."
}

func getLength(v interface{}) int {
	switch val := v.(type) {
	case []models.Issue:
		return len(val)
	case []interface{}:
		return len(val)
	case string:
		return len(val)
	default:
		return 0
	}
}

func countIssuesByState(issues []models.Issue, state string) int {
	count := 0
	for _, issue := range issues {
		if issue.State == state {
			count++
		}
	}
	return count
}

func filterIssues(issues []models.Issue, filterFunc interface{}) []models.Issue {
	// Simplified implementation - would need proper reflection for complex filters
	return issues
}

func sortIssues(issues []models.Issue, field string) []models.Issue {
	// Simplified implementation - would need proper sorting logic
	return issues
}

func toHTML(content string) template.HTML {
	return template.HTML(content)
}

func toMarkdown(content string) string {
	// Convert HTML to Markdown if needed
	return content
}

func toYAML(content interface{}) string {
	// Convert to YAML format
	return fmt.Sprintf("%v", content)
}

// titleText provides a simple title case function to replace deprecated strings.Title
func titleText(s string) string {
	if len(s) == 0 {
		return s
	}
	// Simple title case: capitalize first letter and lowercase the rest
	// For more sophisticated title casing, consider using golang.org/x/text/cases
	first := strings.ToUpper(s[:1])
	rest := strings.ToLower(s[1:])
	return first + rest
}

package wiki

import (
	"embed"
	"fmt"
	"io/fs"
	"path/filepath"
	"text/template"
)

// TemplateManager manages Wiki generation templates
type TemplateManager struct {
	templates map[string]*template.Template
}

// NewTemplateManager creates a new template manager
func NewTemplateManager() *TemplateManager {
	tm := &TemplateManager{
		templates: make(map[string]*template.Template),
	}
	tm.loadDefaultTemplates()
	return tm
}

// LoadTemplate loads a template from string
func (tm *TemplateManager) LoadTemplate(name, content string) error {
	tmpl, err := template.New(name).Parse(content)
	if err != nil {
		return fmt.Errorf("failed to parse template %s: %w", name, err)
	}
	tm.templates[name] = tmpl
	return nil
}

// GetTemplate returns a template by name
func (tm *TemplateManager) GetTemplate(name string) (*template.Template, bool) {
	tmpl, exists := tm.templates[name]
	return tmpl, exists
}

//go:embed templates/*.md.tmpl
var templateFS embed.FS

// loadDefaultTemplates loads all templates from embedded files
func (tm *TemplateManager) loadDefaultTemplates() {
	// Try to load from embedded files first
	err := tm.loadFromEmbeddedFS()
	if err != nil {
		// Fallback to embedded constants if file loading fails
		tm.loadFromConstants()
	}
}

// loadFromEmbeddedFS loads templates from embedded filesystem
func (tm *TemplateManager) loadFromEmbeddedFS() error {
	templateFiles, err := fs.Glob(templateFS, "templates/*.md.tmpl")
	if err != nil {
		return fmt.Errorf("failed to glob template files: %w", err)
	}

	for _, templateFile := range templateFiles {
		content, err := fs.ReadFile(templateFS, templateFile)
		if err != nil {
			return fmt.Errorf("failed to read template file %s: %w", templateFile, err)
		}

		// Extract template name from filename (remove extension)
		baseName := filepath.Base(templateFile)
		templateName := baseName[:len(baseName)-len(".md.tmpl")]

		if err := tm.LoadTemplate(templateName, string(content)); err != nil {
			return fmt.Errorf("failed to load template %s: %w", templateName, err)
		}
	}

	return nil
}

// loadFromConstants loads templates from embedded constants (fallback)
func (tm *TemplateManager) loadFromConstants() {
	// Minimal fallback templates in case external files fail to load
	fallbackTemplates := map[string]string{
		"issues-summary": `# 📋 {{.ProjectName}} - Issues Summary
> **Generated**: {{.GeneratedAt.Format "2006-01-02 15:04:05"}}
> **Error**: Could not load external template file

Total Issues: {{.TotalIssues}}
Please check that pkg/wiki/templates/issues-summary.md.tmpl exists.`,

		"troubleshooting": `# 🛠️ {{.ProjectName}} - Troubleshooting Guide
> **Generated**: {{.GeneratedAt.Format "2006-01-02 15:04:05"}}
> **Error**: Could not load external template file

Please check that pkg/wiki/templates/troubleshooting.md.tmpl exists.`,

		"learning-path": `# 📚 {{.ProjectName}} - Learning Path
> **Generated**: {{.GeneratedAt.Format "2006-01-02 15:04:05"}}
> **Error**: Could not load external template file

Please check that pkg/wiki/templates/learning-path.md.tmpl exists.`,

		"index": `# 🦫 {{.ProjectName}} - Knowledge Dam
> **Generated**: {{.GeneratedAt.Format "2006-01-02 15:04:05"}}
> **Error**: Could not load external template file

Please check that pkg/wiki/templates/index.md.tmpl exists.`,

		"statistics": `# 📊 {{.ProjectName}} - Statistics Dashboard
> **Generated**: {{.GeneratedAt.Format "2006-01-02 15:04:05"}}
> **Error**: Could not load external template file

Please check that pkg/wiki/templates/statistics.md.tmpl exists.`,

		"label-analysis": `# 🏷️ {{.ProjectName}} - Label Analysis
> **Generated**: {{.GeneratedAt.Format "2006-01-02 15:04:05"}}
> **Error**: Could not load external template file

Please check that pkg/wiki/templates/label-analysis.md.tmpl exists.`,

		"quick-reference": `# 📚 {{.ProjectName}} - Quick Reference
> **Generated**: {{.GeneratedAt.Format "2006-01-02 15:04:05"}}
> **Error**: Could not load external template file

Please check that pkg/wiki/templates/quick-reference.md.tmpl exists.`,

		"processing-logs": `# 📊 {{.ProjectName}} - Processing Logs & Monitoring
> **Generated**: {{.GeneratedAt.Format "2006-01-02 15:04:05"}}
> **Error**: Could not load external template file

Please check that pkg/wiki/templates/processing-logs.md.tmpl exists.`,

		"development-strategy": `# 🦫 {{.ProjectName}} - Development Strategy
> **Generated**: {{.GeneratedAt.Format "2006-01-02 15:04:05"}}
> **Error**: Could not load external template file

Please check that pkg/wiki/templates/development-strategy.md.tmpl exists.`,
	}

	for name, content := range fallbackTemplates {
		_ = tm.LoadTemplate(name, content) //nolint:errcheck // Fallback templates
	}
}

// RegisterTemplate registers a custom template
func (tm *TemplateManager) RegisterTemplate(name, content string) error {
	return tm.LoadTemplate(name, content)
}

// ListTemplates returns all available template names
func (tm *TemplateManager) ListTemplates() []string {
	var names []string
	for name := range tm.templates {
		names = append(names, name)
	}
	return names
}

// GetDefaultTemplateContent returns the content of a default template
func GetDefaultTemplateContent(templateName string) (string, bool) {
	// For external templates, return a reference to the file
	externalTemplates := map[string]string{
		"issues-summary":       "External template file: pkg/wiki/templates/issues-summary.md.tmpl",
		"troubleshooting":      "External template file: pkg/wiki/templates/troubleshooting.md.tmpl",
		"learning-path":        "External template file: pkg/wiki/templates/learning-path.md.tmpl",
		"index":                "External template file: pkg/wiki/templates/index.md.tmpl",
		"statistics":           "External template file: pkg/wiki/templates/statistics.md.tmpl",
		"label-analysis":       "External template file: pkg/wiki/templates/label-analysis.md.tmpl",
		"quick-reference":      "External template file: pkg/wiki/templates/quick-reference.md.tmpl",
		"processing-logs":      "External template file: pkg/wiki/templates/processing-logs.md.tmpl",
		"development-strategy": "External template file: pkg/wiki/templates/development-strategy.md.tmpl",
	}

	content, exists := externalTemplates[templateName]
	return content, exists
}

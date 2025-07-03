package wiki

import (
	"embed"
	"fmt"
	"io/fs"
	"log/slog"
	"path/filepath"
	"text/template"
)

// TemplateManager manages Wiki generation templates
type TemplateManager struct {
	templates map[string]*template.Template
}

// NewTemplateManager creates a new template manager
func NewTemplateManager() *TemplateManager {
	slog.Debug("Creating new TemplateManager")
	tm := &TemplateManager{
		templates: make(map[string]*template.Template),
	}
	tm.loadDefaultTemplates()
	slog.Debug("TemplateManager created", "templates", len(tm.templates))
	return tm
}

// LoadTemplate loads a template from string
func (tm *TemplateManager) LoadTemplate(name, content string) error {
	slog.Debug("Loading template", "name", name, "content_length", len(content))

	// Create template with custom functions
	funcMap := template.FuncMap{
		"div": func(a, b int) float64 {
			if b == 0 {
				slog.Warn("Division by zero in template, returning 0", "template", name)
				return 0
			}
			return float64(a) / float64(b)
		},
		"mul": func(a, b int) int {
			return a * b
		},
		"add": func(a, b int) int {
			return a + b
		},
		"sub": func(a, b int) int {
			return a - b
		},
	}

	tmpl, err := template.New(name).Funcs(funcMap).Parse(content)
	if err != nil {
		slog.Error("Failed to parse template", "name", name, "error", err)
		return fmt.Errorf("failed to parse template %s: %w", name, err)
	}

	tm.templates[name] = tmpl
	slog.Debug("Successfully loaded template", "name", name)
	return nil
}

// GetTemplate returns a template by name
func (tm *TemplateManager) GetTemplate(name string) (*template.Template, bool) {
	tmpl, exists := tm.templates[name]
	if !exists {
		slog.Warn("Template not found", "name", name, "available_templates", tm.getTemplateNames())
	}
	return tmpl, exists
}

// getTemplateNames returns a slice of all template names for logging
func (tm *TemplateManager) getTemplateNames() []string {
	names := make([]string, 0, len(tm.templates))
	for name := range tm.templates {
		names = append(names, name)
	}
	return names
}

//go:embed templates/*.md.tmpl
var templateFS embed.FS

// loadDefaultTemplates loads all templates from embedded files
func (tm *TemplateManager) loadDefaultTemplates() {
	slog.Debug("Loading default templates")

	// Try to load from embedded files first
	err := tm.loadFromEmbeddedFS()
	if err != nil {
		slog.Warn("Failed to load from embedded FS, falling back to constants", "error", err)
		// Fallback to embedded constants if file loading fails
		tm.loadFromConstants()
	} else {
		slog.Info("Successfully loaded templates from embedded filesystem")
	}
}

// loadFromEmbeddedFS loads templates from embedded filesystem
func (tm *TemplateManager) loadFromEmbeddedFS() error {
	slog.Debug("Scanning embedded filesystem for templates")

	templateFiles, err := fs.Glob(templateFS, "templates/*.md.tmpl")
	if err != nil {
		slog.Error("Failed to glob template files", "error", err)
		return fmt.Errorf("failed to glob template files: %w", err)
	}

	if len(templateFiles) == 0 {
		slog.Error("No template files found in embedded filesystem")
		return fmt.Errorf("no template files found in embedded filesystem")
	}

	slog.Debug("Found template files", "count", len(templateFiles), "files", templateFiles)

	for i, templateFile := range templateFiles {
		slog.Debug("Processing template file", "index", i+1, "total", len(templateFiles), "file", templateFile)

		content, err := fs.ReadFile(templateFS, templateFile)
		if err != nil {
			slog.Error("Failed to read template file", "file", templateFile, "error", err)
			return fmt.Errorf("failed to read template file %s: %w", templateFile, err)
		}

		// Extract template name from filename (remove extension)
		baseName := filepath.Base(templateFile)
		templateName := baseName[:len(baseName)-len(".md.tmpl")]

		slog.Debug("Extracted template name", "name", templateName, "file", templateFile)

		if err := tm.LoadTemplate(templateName, string(content)); err != nil {
			slog.Error("Failed to load template from file", "name", templateName, "file", templateFile, "error", err)
			return fmt.Errorf("failed to load template %s: %w", templateName, err)
		}
	}

	slog.Info("Successfully loaded templates from embedded filesystem", "count", len(templateFiles))
	return nil
}

// loadFromConstants loads templates from embedded constants (fallback)
func (tm *TemplateManager) loadFromConstants() {
	slog.Warn("Loading fallback templates from constants")
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

		"developer-dashboard": `# 🦫 {{.ProjectName}} - Developer Dashboard
> **Generated**: {{.GeneratedAt.Format "2006-01-02 15:04:05"}}
> **Error**: Could not load external template file

Please check that pkg/wiki/templates/developer-dashboard.md.tmpl exists.`,
	}

	for name, content := range fallbackTemplates {
		slog.Debug("Loading fallback template", "name", name)
		if err := tm.LoadTemplate(name, content); err != nil {
			slog.Error("Failed to load fallback template", "name", name, "error", err)
		}
	}
	slog.Info("Loaded fallback templates", "count", len(fallbackTemplates))
}

// RegisterTemplate registers a custom template
func (tm *TemplateManager) RegisterTemplate(name, content string) error {
	slog.Info("Registering custom template", "name", name)
	err := tm.LoadTemplate(name, content)
	if err != nil {
		slog.Error("Failed to register custom template", "name", name, "error", err)
	} else {
		slog.Info("Successfully registered custom template", "name", name)
	}
	return err
}

// ListTemplates returns all available template names
func (tm *TemplateManager) ListTemplates() []string {
	var names []string
	for name := range tm.templates {
		names = append(names, name)
	}
	slog.Debug("Listed available templates", "count", len(names), "templates", names)
	return names
}

// GetDefaultTemplateContent returns the content of a default template
func GetDefaultTemplateContent(templateName string) (string, bool) {
	slog.Debug("Retrieving default template content", "name", templateName)

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
		"developer-dashboard":  "External template file: pkg/wiki/templates/developer-dashboard.md.tmpl",
		"_sidebar":             "External template file: pkg/wiki/templates/_sidebar.md.tmpl",
	}

	content, exists := externalTemplates[templateName]
	if !exists {
		slog.Warn("Default template not found in external template map", "name", templateName)
	} else {
		slog.Debug("Found external template reference", "name", templateName)
	}
	return content, exists
}

package wiki

import (
	"embed"
	"fmt"
	"io/fs"
	"log"
	"path/filepath"
	"text/template"
)

// TemplateManager manages Wiki generation templates
type TemplateManager struct {
	templates map[string]*template.Template
}

// NewTemplateManager creates a new template manager
func NewTemplateManager() *TemplateManager {
	log.Printf("DEBUG: Creating new TemplateManager")
	tm := &TemplateManager{
		templates: make(map[string]*template.Template),
	}
	tm.loadDefaultTemplates()
	log.Printf("DEBUG: TemplateManager created with %d templates", len(tm.templates))
	return tm
}

// LoadTemplate loads a template from string
func (tm *TemplateManager) LoadTemplate(name, content string) error {
	log.Printf("DEBUG: Loading template '%s' (content length: %d)", name, len(content))

	// Create template with custom functions
	funcMap := template.FuncMap{
		"div": func(a, b int) float64 {
			if b == 0 {
				log.Printf("WARN: Division by zero in template '%s', returning 0", name)
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
		log.Printf("ERROR: Failed to parse template '%s': %v", name, err)
		return fmt.Errorf("failed to parse template %s: %w", name, err)
	}

	tm.templates[name] = tmpl
	log.Printf("DEBUG: Successfully loaded template '%s'", name)
	return nil
}

// GetTemplate returns a template by name
func (tm *TemplateManager) GetTemplate(name string) (*template.Template, bool) {
	tmpl, exists := tm.templates[name]
	if !exists {
		log.Printf("WARN: Template '%s' not found, available templates: %v", name, tm.getTemplateNames())
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
	log.Printf("DEBUG: Loading default templates...")

	// Try to load from embedded files first
	err := tm.loadFromEmbeddedFS()
	if err != nil {
		log.Printf("WARN: Failed to load from embedded FS, falling back to constants: %v", err)
		// Fallback to embedded constants if file loading fails
		tm.loadFromConstants()
	} else {
		log.Printf("INFO: Successfully loaded templates from embedded filesystem")
	}
}

// loadFromEmbeddedFS loads templates from embedded filesystem
func (tm *TemplateManager) loadFromEmbeddedFS() error {
	log.Printf("DEBUG: Scanning embedded filesystem for templates...")

	templateFiles, err := fs.Glob(templateFS, "templates/*.md.tmpl")
	if err != nil {
		log.Printf("ERROR: Failed to glob template files: %v", err)
		return fmt.Errorf("failed to glob template files: %w", err)
	}

	if len(templateFiles) == 0 {
		log.Printf("ERROR: No template files found in embedded filesystem")
		return fmt.Errorf("no template files found in embedded filesystem")
	}

	log.Printf("DEBUG: Found %d template files: %v", len(templateFiles), templateFiles)

	for i, templateFile := range templateFiles {
		log.Printf("DEBUG: Processing template file %d/%d: %s", i+1, len(templateFiles), templateFile)

		content, err := fs.ReadFile(templateFS, templateFile)
		if err != nil {
			log.Printf("ERROR: Failed to read template file %s: %v", templateFile, err)
			return fmt.Errorf("failed to read template file %s: %w", templateFile, err)
		}

		// Extract template name from filename (remove extension)
		baseName := filepath.Base(templateFile)
		templateName := baseName[:len(baseName)-len(".md.tmpl")]

		log.Printf("DEBUG: Extracted template name '%s' from file '%s'", templateName, templateFile)

		if err := tm.LoadTemplate(templateName, string(content)); err != nil {
			log.Printf("ERROR: Failed to load template %s from file %s: %v", templateName, templateFile, err)
			return fmt.Errorf("failed to load template %s: %w", templateName, err)
		}
	}

	log.Printf("INFO: Successfully loaded %d templates from embedded filesystem", len(templateFiles))
	return nil
}

// loadFromConstants loads templates from embedded constants (fallback)
func (tm *TemplateManager) loadFromConstants() {
	log.Printf("WARN: Loading fallback templates from constants")
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
		log.Printf("DEBUG: Loading fallback template '%s'", name)
		if err := tm.LoadTemplate(name, content); err != nil {
			log.Printf("ERROR: Failed to load fallback template '%s': %v", name, err)
		}
	}
	log.Printf("INFO: Loaded %d fallback templates", len(fallbackTemplates))
}

// RegisterTemplate registers a custom template
func (tm *TemplateManager) RegisterTemplate(name, content string) error {
	log.Printf("INFO: Registering custom template '%s'", name)
	err := tm.LoadTemplate(name, content)
	if err != nil {
		log.Printf("ERROR: Failed to register custom template '%s': %v", name, err)
	} else {
		log.Printf("INFO: Successfully registered custom template '%s'", name)
	}
	return err
}

// ListTemplates returns all available template names
func (tm *TemplateManager) ListTemplates() []string {
	var names []string
	for name := range tm.templates {
		names = append(names, name)
	}
	log.Printf("DEBUG: Listed %d available templates: %v", len(names), names)
	return names
}

// GetDefaultTemplateContent returns the content of a default template
func GetDefaultTemplateContent(templateName string) (string, bool) {
	log.Printf("DEBUG: Retrieving default template content for '%s'", templateName)

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
	if !exists {
		log.Printf("WARN: Default template '%s' not found in external template map", templateName)
	} else {
		log.Printf("DEBUG: Found external template reference for '%s'", templateName)
	}
	return content, exists
}

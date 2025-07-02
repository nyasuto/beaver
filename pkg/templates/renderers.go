package templates

import (
	"bytes"
	"fmt"
	"strings"
)

// HTMLRenderer renders templates to HTML format
type HTMLRenderer struct {
	manager *UnifiedTemplateManager
}

// MarkdownRenderer renders templates to Markdown format
type MarkdownRenderer struct {
	manager *UnifiedTemplateManager
}

// YAMLRenderer renders templates to YAML format
type YAMLRenderer struct {
	manager *UnifiedTemplateManager
}

// Render implementation for HTMLRenderer
func (r *HTMLRenderer) Render(templateName string, data interface{}) (string, error) {
	// Load base template
	tmpl, err := r.manager.LoadTemplate(templateName)
	if err != nil {
		return "", fmt.Errorf("failed to load template for HTML rendering: %w", err)
	}

	// Create HTML-specific template name
	htmlTemplateName := fmt.Sprintf("%s.html", templateName)

	// Try to load HTML-specific template, fallback to base
	htmlTmpl, err := r.manager.LoadTemplate(htmlTemplateName)
	if err != nil {
		// Use base template if HTML-specific template doesn't exist
		htmlTmpl = tmpl
	}

	// Render template
	var buf bytes.Buffer
	if err := htmlTmpl.Execute(&buf, data); err != nil {
		return "", fmt.Errorf("failed to execute HTML template: %w", err)
	}

	// Post-process HTML content
	content := buf.String()
	content = r.postProcessHTML(content, data)

	return content, nil
}

// GetExtension returns the file extension for HTML format
func (r *HTMLRenderer) GetExtension() string {
	return ".html"
}

// GetContentType returns the content type for HTML format
func (r *HTMLRenderer) GetContentType() string {
	return "text/html"
}

// postProcessHTML applies HTML-specific post-processing
func (r *HTMLRenderer) postProcessHTML(content string, data interface{}) string {
	// Add HTML5 doctype if not present
	if !strings.Contains(content, "<!DOCTYPE") {
		content = "<!DOCTYPE html>\n" + content
	}

	// Add meta charset if not present
	if !strings.Contains(content, "charset") {
		content = strings.Replace(content, "<head>", "<head>\n    <meta charset=\"utf-8\">", 1)
	}

	// Add viewport meta tag for responsive design
	if !strings.Contains(content, "viewport") {
		content = strings.Replace(content, "<head>", "<head>\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">", 1)
	}

	return content
}

// Render implementation for MarkdownRenderer
func (r *MarkdownRenderer) Render(templateName string, data interface{}) (string, error) {
	// Load base template
	tmpl, err := r.manager.LoadTemplate(templateName)
	if err != nil {
		return "", fmt.Errorf("failed to load template for Markdown rendering: %w", err)
	}

	// Create Markdown-specific template name
	mdTemplateName := fmt.Sprintf("%s.md", templateName)

	// Try to load Markdown-specific template, fallback to base
	mdTmpl, err := r.manager.LoadTemplate(mdTemplateName)
	if err != nil {
		// Use base template if Markdown-specific template doesn't exist
		mdTmpl = tmpl
	}

	// Render template
	var buf bytes.Buffer
	if err := mdTmpl.Execute(&buf, data); err != nil {
		return "", fmt.Errorf("failed to execute Markdown template: %w", err)
	}

	// Post-process Markdown content
	content := buf.String()
	content = r.postProcessMarkdown(content, data)

	return content, nil
}

// GetExtension returns the file extension for Markdown format
func (r *MarkdownRenderer) GetExtension() string {
	return ".md"
}

// GetContentType returns the content type for Markdown format
func (r *MarkdownRenderer) GetContentType() string {
	return "text/markdown"
}

// postProcessMarkdown applies Markdown-specific post-processing
func (r *MarkdownRenderer) postProcessMarkdown(content string, data interface{}) string {
	// Remove HTML tags for pure Markdown
	content = r.stripHTMLTags(content)

	// Ensure proper Markdown formatting
	content = r.normalizeMarkdown(content)

	return content
}

// stripHTMLTags removes HTML tags for Markdown compatibility
func (r *MarkdownRenderer) stripHTMLTags(content string) string {
	// Simple HTML tag removal - could be enhanced with proper HTML parser
	// For now, preserve some basic formatting
	replacements := map[string]string{
		"<strong>":  "**",
		"</strong>": "**",
		"<em>":      "*",
		"</em>":     "*",
		"<code>":    "`",
		"</code>":   "`",
		"<br>":      "\n",
		"<br/>":     "\n",
		"<br />":    "\n",
	}

	for html, md := range replacements {
		content = strings.ReplaceAll(content, html, md)
	}

	// Remove remaining HTML tags
	// This is a simplified approach - a full implementation would use an HTML parser
	return content
}

// normalizeMarkdown ensures proper Markdown formatting
func (r *MarkdownRenderer) normalizeMarkdown(content string) string {
	lines := strings.Split(content, "\n")
	var normalizedLines []string

	for _, line := range lines {
		// Trim whitespace
		line = strings.TrimSpace(line)

		// Skip empty lines at the beginning
		if len(normalizedLines) == 0 && line == "" {
			continue
		}

		normalizedLines = append(normalizedLines, line)
	}

	// Ensure single trailing newline
	content = strings.Join(normalizedLines, "\n")
	return strings.TrimRight(content, "\n") + "\n"
}

// Render implementation for YAMLRenderer
func (r *YAMLRenderer) Render(templateName string, data interface{}) (string, error) {
	// Load base template
	tmpl, err := r.manager.LoadTemplate(templateName)
	if err != nil {
		return "", fmt.Errorf("failed to load template for YAML rendering: %w", err)
	}

	// Create YAML-specific template name
	yamlTemplateName := fmt.Sprintf("%s.yml", templateName)

	// Try to load YAML-specific template, fallback to base
	yamlTmpl, err := r.manager.LoadTemplate(yamlTemplateName)
	if err != nil {
		// Use base template if YAML-specific template doesn't exist
		yamlTmpl = tmpl
	}

	// Render template
	var buf bytes.Buffer
	if err := yamlTmpl.Execute(&buf, data); err != nil {
		return "", fmt.Errorf("failed to execute YAML template: %w", err)
	}

	// Post-process YAML content
	content := buf.String()
	content = r.postProcessYAML(content, data)

	return content, nil
}

// GetExtension returns the file extension for YAML format
func (r *YAMLRenderer) GetExtension() string {
	return ".yml"
}

// GetContentType returns the content type for YAML format
func (r *YAMLRenderer) GetContentType() string {
	return "text/yaml"
}

// postProcessYAML applies YAML-specific post-processing
func (r *YAMLRenderer) postProcessYAML(content string, data interface{}) string {
	lines := strings.Split(content, "\n")
	var processedLines []string

	for _, line := range lines {
		// Trim trailing whitespace
		line = strings.TrimRight(line, " \t")

		// Skip empty lines at the beginning
		if len(processedLines) == 0 && line == "" {
			continue
		}

		processedLines = append(processedLines, line)
	}

	// Ensure YAML document starts with --- if not present
	content = strings.Join(processedLines, "\n")
	if !strings.HasPrefix(content, "---") {
		content = "---\n" + content
	}

	// Ensure single trailing newline
	return strings.TrimRight(content, "\n") + "\n"
}

// MultiFormatRenderer can render to multiple formats simultaneously
type MultiFormatRenderer struct {
	manager *UnifiedTemplateManager
}

// RenderMultiple renders a template to multiple formats
func (r *MultiFormatRenderer) RenderMultiple(templateName string, formats []OutputFormat, data *UnifiedPageData) (map[OutputFormat]string, error) {
	results := make(map[OutputFormat]string)

	for _, format := range formats {
		content, err := r.manager.Render(templateName, format, data)
		if err != nil {
			return nil, fmt.Errorf("failed to render format %s: %w", format, err)
		}
		results[format] = content
	}

	return results, nil
}

// NewMultiFormatRenderer creates a new multi-format renderer
func NewMultiFormatRenderer(manager *UnifiedTemplateManager) *MultiFormatRenderer {
	return &MultiFormatRenderer{manager: manager}
}

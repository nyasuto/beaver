package templates

import (
	"bytes"
	"fmt"
	"path/filepath"
	"time"

	"github.com/nyasuto/beaver/internal/models"
	"github.com/nyasuto/beaver/pkg/site"
	"github.com/nyasuto/beaver/pkg/wiki"
)

// LegacyIntegration provides integration with existing wiki and site packages
type LegacyIntegration struct {
	manager *UnifiedTemplateManager
}

// NewLegacyIntegration creates a new legacy integration
func NewLegacyIntegration(manager *UnifiedTemplateManager) *LegacyIntegration {
	return &LegacyIntegration{manager: manager}
}

// ConvertSiteConfigToPageData converts site.SiteConfig to UnifiedPageData
func (li *LegacyIntegration) ConvertSiteConfigToPageData(config *site.SiteConfig, issues []models.Issue) *UnifiedPageData {
	return &UnifiedPageData{
		Meta: PageMetadata{
			Title:       config.Title,
			Description: config.Description,
			Keywords:    config.Keywords,
			Author:      config.Author,
			Created:     time.Now(),
			Modified:    time.Now(),
			URL:         "/",
			Type:        "website",
			Custom:      make(map[string]string),
		},
		Context: RenderContext{
			Format:     FormatHTML,
			Theme:      config.Theme,
			Features:   li.extractSiteFeatures(config),
			Navigation: li.convertSiteNavigation(config.Navigation),
			BaseURL:    config.BaseURL,
			BasePath:   config.BasePath,
			Language:   config.Language,
			Analytics:  config.Analytics,
		},
		Issues: issues,
	}
}

// ConvertWikiConfigToPageData converts wiki config to UnifiedPageData
func (li *LegacyIntegration) ConvertWikiConfigToPageData(config *wiki.PublisherConfig, issues []models.Issue) *UnifiedPageData {
	return &UnifiedPageData{
		Meta: PageMetadata{
			Title:       fmt.Sprintf("%s Wiki", config.Repository),
			Description: fmt.Sprintf("Knowledge base for %s/%s", config.Owner, config.Repository),
			Author:      config.Owner,
			Created:     time.Now(),
			Modified:    time.Now(),
			URL:         "/",
			Type:        "wiki",
			Custom:      make(map[string]string),
		},
		Context: RenderContext{
			Format:     FormatMarkdown,
			Theme:      "github-wiki",
			Features:   []string{"wiki", "sidebar"},
			Navigation: li.createDefaultNavigation(),
			BaseURL:    fmt.Sprintf("https://github.com/%s/%s/wiki", config.Owner, config.Repository),
			BasePath:   "",
			Language:   "ja",
		},
		Issues: issues,
	}
}

// GenerateHTMLWithLegacyFallback generates HTML using unified templates with fallback to legacy
func (li *LegacyIntegration) GenerateHTMLWithLegacyFallback(templateName string, config *site.SiteConfig, issues []models.Issue) (string, error) {
	// Try unified template first
	data := li.ConvertSiteConfigToPageData(config, issues)

	result, err := li.manager.Render(templateName, FormatHTML, data)
	if err == nil {
		return result, nil
	}

	// Fallback to legacy site generator
	generator := site.NewHTMLGenerator(config)
	projectName := config.Title
	if projectName == "" {
		projectName = "Beaver Knowledge Base"
	}

	// Create temporary directory for fallback generation
	tempDir := filepath.Join(config.OutputDir, "temp")
	_ = tempDir // Placeholder for future use

	if err := generator.GenerateSite(issues, projectName); err != nil {
		return "", fmt.Errorf("both unified and legacy generation failed: unified=%w, legacy=%w", err, err)
	}

	return "<!-- Generated using legacy fallback -->", nil
}

// GenerateMarkdownWithLegacyFallback generates Markdown using unified templates with fallback to legacy
func (li *LegacyIntegration) GenerateMarkdownWithLegacyFallback(templateName string, config *wiki.PublisherConfig, issues []models.Issue) (string, error) {
	// Try unified template first
	data := li.ConvertWikiConfigToPageData(config, issues)

	result, err := li.manager.Render(templateName, FormatMarkdown, data)
	if err == nil {
		return result, nil
	}

	// Fallback to legacy wiki generation
	templateManager := wiki.NewTemplateManager()
	wikiPages := li.convertIssuesToWikiPages(issues, config)

	// Generate using legacy template
	if len(wikiPages) > 0 {
		tmpl, exists := templateManager.GetTemplate(templateName)
		if !exists {
			return "", fmt.Errorf("template %s not found", templateName)
		}

		var buf bytes.Buffer
		if err := tmpl.Execute(&buf, wikiPages[0]); err != nil {
			return "", fmt.Errorf("both unified and legacy generation failed: unified=%w, legacy=%w", err, err)
		}
		return buf.String(), nil
	}

	return "", fmt.Errorf("no content to generate")
}

// Migration helpers

// MigrateSiteTemplates migrates existing site templates to unified format
func (li *LegacyIntegration) MigrateSiteTemplates(outputDir string) error {
	// This would contain logic to convert existing site templates
	// to the unified template format
	return nil
}

// MigrateWikiTemplates migrates existing wiki templates to unified format
func (li *LegacyIntegration) MigrateWikiTemplates(outputDir string) error {
	// This would contain logic to convert existing wiki templates
	// to the unified template format
	return nil
}

// Helper methods

func (li *LegacyIntegration) extractSiteFeatures(config *site.SiteConfig) []string {
	var features []string

	if config.ServiceWorker {
		features = append(features, "pwa", "service-worker")
	}
	if config.Minify {
		features = append(features, "minify")
	}
	if config.Compress {
		features = append(features, "compress")
	}
	if config.Analytics != "" {
		features = append(features, "analytics")
	}

	return features
}

func (li *LegacyIntegration) convertSiteNavigation(siteNav []site.NavItem) []NavItem {
	var navigation []NavItem

	for _, item := range siteNav {
		navigation = append(navigation, NavItem{
			Title: item.Title,
			URL:   item.URL,
			Icon:  item.Icon,
		})
	}

	return navigation
}

func (li *LegacyIntegration) createDefaultNavigation() []NavItem {
	return []NavItem{
		{Title: "Home", URL: "/", Icon: "🏠"},
		{Title: "Issues", URL: "/Issues", Icon: "📋"},
		{Title: "Strategy", URL: "/Strategy", Icon: "🎯"},
		{Title: "Troubleshooting", URL: "/Troubleshooting", Icon: "🔧"},
	}
}

func (li *LegacyIntegration) convertIssuesToWikiPages(issues []models.Issue, config *wiki.PublisherConfig) []*wiki.WikiPage {
	var pages []*wiki.WikiPage

	for _, issue := range issues {
		page := &wiki.WikiPage{
			Title:     issue.Title,
			Content:   issue.Body,
			Filename:  fmt.Sprintf("Issue-%d.md", issue.Number),
			CreatedAt: issue.CreatedAt,
			UpdatedAt: issue.UpdatedAt,
			Summary:   fmt.Sprintf("Issue #%d: %s", issue.Number, issue.Title),
			Category:  "Issue",
			Tags:      []string{"issue", issue.State},
		}
		pages = append(pages, page)
	}

	return pages
}

// CompatibilityWrapper provides backward compatibility
type CompatibilityWrapper struct {
	integration *LegacyIntegration
}

// NewCompatibilityWrapper creates a new compatibility wrapper
func NewCompatibilityWrapper(manager *UnifiedTemplateManager) *CompatibilityWrapper {
	return &CompatibilityWrapper{
		integration: NewLegacyIntegration(manager),
	}
}

// GenerateHTMLSite generates HTML site using unified templates with legacy fallback
func (cw *CompatibilityWrapper) GenerateHTMLSite(config *site.SiteConfig, issues []models.Issue, projectName string) error {
	// Map of template names to content types
	templates := map[string]string{
		"content/home":            "index.html",
		"content/issues":          "issues.html",
		"content/strategy":        "strategy.html",
		"content/troubleshooting": "troubleshooting.html",
	}

	for templateName, outputFile := range templates {
		content, err := cw.integration.GenerateHTMLWithLegacyFallback(templateName, config, issues)
		if err != nil {
			return fmt.Errorf("failed to generate %s: %w", outputFile, err)
		}

		outputPath := filepath.Join(config.OutputDir, outputFile)
		if err := writeFile(outputPath, content); err != nil {
			return fmt.Errorf("failed to write %s: %w", outputFile, err)
		}
	}

	return nil
}

// GenerateWikiSite generates wiki site using unified templates with legacy fallback
func (cw *CompatibilityWrapper) GenerateWikiSite(config *wiki.PublisherConfig, issues []models.Issue) error {
	// Map of template names to content types
	templates := map[string]string{
		"content/home":            "Home.md",
		"content/issues":          "Issues.md",
		"content/strategy":        "Strategy.md",
		"content/troubleshooting": "Troubleshooting.md",
	}

	for templateName, outputFile := range templates {
		content, err := cw.integration.GenerateMarkdownWithLegacyFallback(templateName, config, issues)
		if err != nil {
			return fmt.Errorf("failed to generate %s: %w", outputFile, err)
		}

		outputPath := filepath.Join("wiki", outputFile)
		if err := writeFile(outputPath, content); err != nil {
			return fmt.Errorf("failed to write %s: %w", outputFile, err)
		}
	}

	return nil
}

// writeFile is a helper function to write content to file
func writeFile(path, content string) error {
	// Implementation would write content to file
	// This is a placeholder for the actual file writing logic
	return nil
}

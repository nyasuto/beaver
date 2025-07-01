package site

import (
	"fmt"
	"html/template"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/nyasuto/beaver/internal/models"
)

// HTMLGenerator generates static HTML sites from Beaver data
type HTMLGenerator struct {
	config    *SiteConfig
	templates map[string]*template.Template
	assets    *AssetManager
	theme     *BeaverTheme
}

// SiteConfig contains configuration for HTML generation
type SiteConfig struct {
	Title       string `yaml:"title"`
	Description string `yaml:"description"`
	BaseURL     string `yaml:"base_url"`
	OutputDir   string `yaml:"output_dir"`
	Theme       string `yaml:"theme"`
	Language    string `yaml:"language"`
	Author      string `yaml:"author"`

	// SEO and metadata
	Keywords    []string          `yaml:"keywords"`
	SocialMedia map[string]string `yaml:"social_media"`
	Analytics   string            `yaml:"analytics"`

	// Site structure
	Navigation []NavItem    `yaml:"navigation"`
	Footer     FooterConfig `yaml:"footer"`

	// Performance
	Minify        bool `yaml:"minify"`
	Compress      bool `yaml:"compress"`
	ServiceWorker bool `yaml:"service_worker"`
}

// NavItem represents a navigation menu item
type NavItem struct {
	Title string `yaml:"title"`
	URL   string `yaml:"url"`
	Icon  string `yaml:"icon"`
}

// FooterConfig configures the site footer
type FooterConfig struct {
	Text  string            `yaml:"text"`
	Links map[string]string `yaml:"links"`
}

// BeaverTheme contains the Beaver brand theme
type BeaverTheme struct {
	PrimaryColor    string
	SecondaryColor  string
	AccentColor     string
	TextColor       string
	BackgroundColor string
	FontFamily      string
	HeadingFont     string
	CodeFont        string
}

// NewHTMLGenerator creates a new HTML generator
func NewHTMLGenerator(config *SiteConfig) *HTMLGenerator {
	return &HTMLGenerator{
		config:    config,
		templates: make(map[string]*template.Template),
		assets:    NewAssetManager(),
		theme:     GetBeaverTheme(),
	}
}

// GetBeaverTheme returns the default Beaver theme
func GetBeaverTheme() *BeaverTheme {
	return &BeaverTheme{
		PrimaryColor:    "#8B4513", // Saddle Brown - beaver fur
		SecondaryColor:  "#4682B4", // Steel Blue - water
		AccentColor:     "#228B22", // Forest Green - nature
		TextColor:       "#2F4F4F", // Dark Slate Gray
		BackgroundColor: "#FAFAFA", // Off White
		FontFamily:      `"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif`,
		HeadingFont:     `"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Hiragino Sans", sans-serif`,
		CodeFont:        `"SFMono-Regular", "Consolas", "Liberation Mono", "Menlo", "Courier", monospace`,
	}
}

// PageData represents data for a single page
type PageData struct {
	Title       string
	Description string
	Content     string
	URL         string
	Date        time.Time
	Author      string
	Tags        []string
	Categories  []string

	// Navigation context
	Navigation []NavItem
	BreadCrumb []NavItem

	// Site metadata
	SiteTitle       string
	SiteDescription string
	BaseURL         string
	Language        string

	// Theme data
	Theme *BeaverTheme

	// Page-specific data
	Issues      []models.Issue
	Statistics  map[string]interface{}
	HealthScore int
}

// GenerateSite generates the complete static site
func (g *HTMLGenerator) GenerateSite(issues []models.Issue, projectName string) error {
	// Ensure output directory exists
	if err := os.MkdirAll(g.config.OutputDir, 0755); err != nil {
		return fmt.Errorf("failed to create output directory: %w", err)
	}

	// Load templates
	if err := g.loadTemplates(); err != nil {
		return fmt.Errorf("failed to load templates: %w", err)
	}

	// Generate CSS and assets
	if err := g.generateAssets(); err != nil {
		return fmt.Errorf("failed to generate assets: %w", err)
	}

	// Generate pages
	pages := []struct {
		filename string
		template string
		data     PageData
	}{
		{
			filename: "index.html",
			template: "home",
			data:     g.createHomePageData(issues, projectName),
		},
		{
			filename: "issues.html",
			template: "issues",
			data:     g.createIssuesPageData(issues, projectName),
		},
		{
			filename: "strategy.html",
			template: "strategy",
			data:     g.createStrategyPageData(issues, projectName),
		},
		{
			filename: "troubleshooting.html",
			template: "troubleshooting",
			data:     g.createTroubleshootingPageData(issues, projectName),
		},
	}

	for _, page := range pages {
		if err := g.generatePage(page.filename, page.template, page.data); err != nil {
			return fmt.Errorf("failed to generate page %s: %w", page.filename, err)
		}
	}

	// Generate service worker if enabled
	if g.config.ServiceWorker {
		if err := g.generateServiceWorker(); err != nil {
			return fmt.Errorf("failed to generate service worker: %w", err)
		}
	}

	// Generate sitemap and robots.txt
	if err := g.generateSEOFiles(pages); err != nil {
		return fmt.Errorf("failed to generate SEO files: %w", err)
	}

	return nil
}

// loadTemplates loads HTML templates
func (g *HTMLGenerator) loadTemplates() error {
	// Always use inline templates for now (external templates need base template system)
	return g.createInlineTemplates()
}

// createInlineTemplates creates simple inline templates for testing
func (g *HTMLGenerator) createInlineTemplates() error {
	funcs := g.getTemplateFuncs()

	// Complete page templates for inline use
	pageTemplates := map[string]string{
		"home": `<!DOCTYPE html>
<html lang="{{ .Language }}">
<head>
    <meta charset="utf-8">
    <title>{{ .Title }}</title>
    <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>
    <header class="header">
        <div class="container">
            <h1>{{ .SiteTitle }}</h1>
            <p>{{ .SiteDescription }}</p>
        </div>
    </header>
    {{ if .Navigation }}
    <nav class="nav">
        <div class="container">
            <ul>
                {{ range .Navigation }}
                <li><a href="{{ .URL }}">{{ .Title }}</a></li>
                {{ end }}
            </ul>
        </div>
    </nav>
    {{ end }}
    <main class="main">
        <div class="container">
            <div class="beaver-layout">
                <div class="beaver-card">
                    <h3>🎯 開発戦略</h3>
                    <p>プロジェクトの方向性</p>
                </div>
                <div class="beaver-card">
                    <h3>📊 統計情報</h3>
                    <p>課題: {{ if .Issues }}{{ len .Issues }}{{ else }}0{{ end }}件</p>
                </div>
                <div class="beaver-card">
                    <h3>📈 健全性スコア</h3>
                    <p>{{ .HealthScore }}%</p>
                </div>
            </div>
        </div>
    </main>
</body>
</html>`,
		"issues": `<!DOCTYPE html>
<html lang="{{ .Language }}">
<head>
    <meta charset="utf-8">
    <title>{{ .Title }}</title>
    <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>
    <header class="header">
        <div class="container">
            <h1>{{ .SiteTitle }}</h1>
            <p>{{ .SiteDescription }}</p>
        </div>
    </header>
    {{ if .Navigation }}
    <nav class="nav">
        <div class="container">
            <ul>
                {{ range .Navigation }}
                <li><a href="{{ .URL }}">{{ .Title }}</a></li>
                {{ end }}
            </ul>
        </div>
    </nav>
    {{ end }}
    <main class="main">
        <div class="container">
            <div class="issues-content">
                <h2>📋 課題一覧</h2>
                <p>総課題数: {{ if .Issues }}{{ len .Issues }}{{ else }}0{{ end }}件</p>
                <div class="issues-list">
                    {{ range .Issues }}
                    <div class="issue-item">
                        <h4>{{ .Title }}</h4>
                        <p>{{ .Body }}</p>
                    </div>
                    {{ end }}
                </div>
            </div>
        </div>
    </main>
</body>
</html>`,
		"strategy": `<!DOCTYPE html>
<html lang="{{ .Language }}">
<head>
    <meta charset="utf-8">
    <title>{{ .Title }}</title>
    <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>
    <header class="header">
        <div class="container">
            <h1>{{ .SiteTitle }}</h1>
            <p>{{ .SiteDescription }}</p>
        </div>
    </header>
    {{ if .Navigation }}
    <nav class="nav">
        <div class="container">
            <ul>
                {{ range .Navigation }}
                <li><a href="{{ .URL }}">{{ .Title }}</a></li>
                {{ end }}
            </ul>
        </div>
    </nav>
    {{ end }}
    <main class="main">
        <div class="container">
            <div class="strategy-content">
                <h2>🎯 開発戦略</h2>
                <p>プロジェクトの戦略的方向性とロードマップ</p>
            </div>
        </div>
    </main>
</body>
</html>`,
		"troubleshooting": `<!DOCTYPE html>
<html lang="{{ .Language }}">
<head>
    <meta charset="utf-8">
    <title>{{ .Title }}</title>
    <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>
    <header class="header">
        <div class="container">
            <h1>{{ .SiteTitle }}</h1>
            <p>{{ .SiteDescription }}</p>
        </div>
    </header>
    {{ if .Navigation }}
    <nav class="nav">
        <div class="container">
            <ul>
                {{ range .Navigation }}
                <li><a href="{{ .URL }}">{{ .Title }}</a></li>
                {{ end }}
            </ul>
        </div>
    </nav>
    {{ end }}
    <main class="main">
        <div class="container">
            <div class="troubleshooting-content">
                <h2>🔧 トラブルシューティング</h2>
                <p>よくある問題と解決方法</p>
            </div>
        </div>
    </main>
</body>
</html>`,
	}

	// Create templates directly
	for name, templateHTML := range pageTemplates {
		tmpl, err := template.New(name).Funcs(funcs).Parse(templateHTML)
		if err != nil {
			return fmt.Errorf("failed to parse inline template %s: %w", name, err)
		}
		g.templates[name] = tmpl
	}

	return nil
}

// getTemplateFuncs returns template helper functions
func (g *HTMLGenerator) getTemplateFuncs() template.FuncMap {
	return template.FuncMap{
		"formatDate": func(t time.Time) string {
			return t.Format("2006年01月02日")
		},
		"formatDateTime": func(t time.Time) string {
			return t.Format("2006年01月02日 15:04")
		},
		"safeHTML": func(s string) template.HTML {
			return template.HTML(s)
		},
		"hasPrefix": strings.HasPrefix,
		"contains":  strings.Contains,
		"lower":     strings.ToLower,
		"upper":     strings.ToUpper,
		"truncate": func(s string, length int) string {
			if len(s) <= length {
				return s
			}
			return s[:length] + "..."
		},
		"markdown": func(s string) template.HTML {
			// Simple markdown conversion (can be enhanced later)
			s = strings.ReplaceAll(s, "\n", "<br>")
			return template.HTML(s)
		},
		"seq": func(start, end int) []int {
			var result []int
			for i := start; i <= end; i++ {
				result = append(result, i)
			}
			return result
		},
		"truncateSlice": func(slice []models.Issue, limit int) []models.Issue {
			if len(slice) <= limit {
				return slice
			}
			return slice[:limit]
		},
		"countByState": func(issues []models.Issue, state string) int {
			count := 0
			for _, issue := range issues {
				if issue.State == state {
					count++
				}
			}
			return count
		},
		"oldestOpenIssue": func(issues []models.Issue) string {
			var oldest *models.Issue
			for _, issue := range issues {
				if issue.State == "open" {
					if oldest == nil || issue.CreatedAt.Before(oldest.CreatedAt) {
						oldest = &issue
					}
				}
			}
			if oldest != nil {
				return oldest.CreatedAt.Format("2006年01月02日")
			}
			return "なし"
		},
		"joinLabels": func(labels []models.Label) string {
			var names []string
			for _, label := range labels {
				names = append(names, label.Name)
			}
			return strings.Join(names, ",")
		},
		"contrastColor": func(hexColor string) string {
			// Simple contrast color calculation
			// For simplicity, return black or white based on color
			if len(hexColor) >= 6 {
				// Very simple luminance check
				return "#000000" // or "#FFFFFF" for complex calculation
			}
			return "#000000"
		},
		"len": func(v interface{}) int {
			switch s := v.(type) {
			case []models.Issue:
				return len(s)
			case []models.Label:
				return len(s)
			case []models.Comment:
				return len(s)
			case string:
				return len(s)
			default:
				return 0
			}
		},
		"ge": func(a, b int) bool {
			return a >= b
		},
	}
}

// generatePage generates a single HTML page
func (g *HTMLGenerator) generatePage(filename, templateName string, data PageData) error {
	tmpl, exists := g.templates[templateName]
	if !exists {
		return fmt.Errorf("template %s not found", templateName)
	}

	outputPath := filepath.Join(g.config.OutputDir, filename)
	file, err := os.Create(outputPath)
	if err != nil {
		return fmt.Errorf("failed to create file %s: %w", outputPath, err)
	}
	defer file.Close()

	if err := tmpl.Execute(file, data); err != nil {
		return fmt.Errorf("failed to execute template %s: %w", templateName, err)
	}

	return nil
}

// createHomePageData creates data for the home page
func (g *HTMLGenerator) createHomePageData(issues []models.Issue, projectName string) PageData {
	return PageData{
		Title:           "🦫 " + projectName + " ナレッジベース",
		Description:     "AI駆動型ナレッジベース - GitHub Issues から自動生成",
		Content:         g.generateHomeContent(issues),
		URL:             "/",
		Date:            time.Now(),
		Navigation:      g.config.Navigation,
		SiteTitle:       g.config.Title,
		SiteDescription: g.config.Description,
		BaseURL:         g.config.BaseURL,
		Language:        g.config.Language,
		Theme:           g.theme,
		Issues:          issues,
		Statistics:      g.generateStatistics(issues),
		HealthScore:     g.calculateHealthScore(issues),
	}
}

// createIssuesPageData creates data for the issues page
func (g *HTMLGenerator) createIssuesPageData(issues []models.Issue, projectName string) PageData {
	return PageData{
		Title:           "課題サマリー - " + projectName,
		Description:     "プロジェクトの課題とタスクの一覧",
		Content:         g.generateIssuesContent(issues),
		URL:             "/issues.html",
		Date:            time.Now(),
		Navigation:      g.config.Navigation,
		SiteTitle:       g.config.Title,
		SiteDescription: g.config.Description,
		BaseURL:         g.config.BaseURL,
		Language:        g.config.Language,
		Theme:           g.theme,
		Issues:          issues,
		Statistics:      g.generateIssueStatistics(issues),
	}
}

// createStrategyPageData creates data for the strategy page
func (g *HTMLGenerator) createStrategyPageData(issues []models.Issue, projectName string) PageData {
	return PageData{
		Title:           "開発戦略 - " + projectName,
		Description:     "プロジェクトの開発戦略と学習パス",
		Content:         g.generateStrategyContent(issues),
		URL:             "/strategy.html",
		Date:            time.Now(),
		Navigation:      g.config.Navigation,
		SiteTitle:       g.config.Title,
		SiteDescription: g.config.Description,
		BaseURL:         g.config.BaseURL,
		Language:        g.config.Language,
		Theme:           g.theme,
		Issues:          issues,
	}
}

// createTroubleshootingPageData creates data for the troubleshooting page
func (g *HTMLGenerator) createTroubleshootingPageData(issues []models.Issue, projectName string) PageData {
	return PageData{
		Title:           "トラブルシューティング - " + projectName,
		Description:     "よくある問題と解決方法",
		Content:         g.generateTroubleshootingContent(issues),
		URL:             "/troubleshooting.html",
		Date:            time.Now(),
		Navigation:      g.config.Navigation,
		SiteTitle:       g.config.Title,
		SiteDescription: g.config.Description,
		BaseURL:         g.config.BaseURL,
		Language:        g.config.Language,
		Theme:           g.theme,
		Issues:          issues,
	}
}

// Helper methods for content generation (to be implemented)
func (g *HTMLGenerator) generateHomeContent(_ []models.Issue) string {
	// TODO: Implement home content generation
	return "<div class=\"beaver-layout\"><div class=\"beaver-card\"><h3>🎯 開発戦略</h3><p>プロジェクトの方向性</p></div></div>"
}

func (g *HTMLGenerator) generateIssuesContent(_ []models.Issue) string {
	// TODO: Implement issues content generation
	return "<div class=\"issues-list\">Issues content placeholder</div>"
}

func (g *HTMLGenerator) generateStrategyContent(_ []models.Issue) string {
	// TODO: Implement strategy content generation
	return "<div class=\"strategy-content\">Strategy content placeholder</div>"
}

func (g *HTMLGenerator) generateTroubleshootingContent(_ []models.Issue) string {
	// TODO: Implement troubleshooting content generation
	return "<div class=\"troubleshooting-content\">Troubleshooting content placeholder</div>"
}

func (g *HTMLGenerator) generateStatistics(issues []models.Issue) map[string]interface{} {
	return map[string]interface{}{
		"total_issues":  len(issues),
		"open_issues":   0, // TODO: Calculate
		"closed_issues": 0, // TODO: Calculate
	}
}

func (g *HTMLGenerator) generateIssueStatistics(_ []models.Issue) map[string]interface{} {
	return map[string]interface{}{
		"by_label": make(map[string]int),
		"by_state": make(map[string]int),
	}
}

func (g *HTMLGenerator) calculateHealthScore(_ []models.Issue) int {
	// TODO: Implement health score calculation
	return 85
}

// generateServiceWorker creates a service worker for PWA functionality
func (g *HTMLGenerator) generateServiceWorker() error {
	sw := `// Beaver Knowledge Base Service Worker
const CACHE_NAME = 'beaver-kb-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/issues.html',
  '/strategy.html',
  '/troubleshooting.html',
  '/assets/css/style.css',
  '/assets/js/main.js'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});`

	outputPath := filepath.Join(g.config.OutputDir, "sw.js")
	if err := os.WriteFile(outputPath, []byte(sw), 0600); err != nil {
		return fmt.Errorf("failed to write service worker: %w", err)
	}

	return nil
}

// generateSEOFiles creates sitemap.xml and robots.txt
func (g *HTMLGenerator) generateSEOFiles(pages []struct {
	filename, template string
	data               PageData
}) error {
	// Generate robots.txt
	robots := `User-agent: *
Allow: /

Sitemap: ` + g.config.BaseURL + `/sitemap.xml`

	robotsPath := filepath.Join(g.config.OutputDir, "robots.txt")
	if err := os.WriteFile(robotsPath, []byte(robots), 0600); err != nil {
		return fmt.Errorf("failed to write robots.txt: %w", err)
	}

	// Generate sitemap.xml
	sitemap := `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`

	for _, page := range pages {
		url := g.config.BaseURL + "/" + page.filename
		if page.filename == "index.html" {
			url = g.config.BaseURL + "/"
		}
		sitemap += fmt.Sprintf(`  <url>
    <loc>%s</loc>
    <lastmod>%s</lastmod>
    <priority>0.8</priority>
  </url>
`, url, time.Now().Format("2006-01-02"))
	}

	sitemap += `</urlset>`

	sitemapPath := filepath.Join(g.config.OutputDir, "sitemap.xml")
	if err := os.WriteFile(sitemapPath, []byte(sitemap), 0600); err != nil {
		return fmt.Errorf("failed to write sitemap.xml: %w", err)
	}

	return nil
}

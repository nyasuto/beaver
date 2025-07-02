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

// truncateText truncates text to specified length with ellipsis
func truncateText(text string, maxLength int) string {
	if len(text) <= maxLength {
		return text
	}
	return text[:maxLength] + "..."
}

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
	BasePath    string `yaml:"base_path"`
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
	BasePath        string
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
    <link rel="stylesheet" href="{{ .BasePath }}/assets/css/style.css">
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
    <link rel="stylesheet" href="{{ .BasePath }}/assets/css/style.css">
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
    <link rel="stylesheet" href="{{ .BasePath }}/assets/css/style.css">
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
    <link rel="stylesheet" href="{{ .BasePath }}/assets/css/style.css">
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
		URL:             g.config.BasePath + "/",
		Date:            time.Now(),
		Navigation:      g.config.Navigation,
		SiteTitle:       g.config.Title,
		SiteDescription: g.config.Description,
		BaseURL:         g.config.BaseURL,
		BasePath:        g.config.BasePath,
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
		URL:             g.config.BasePath + "/issues.html",
		Date:            time.Now(),
		Navigation:      g.config.Navigation,
		SiteTitle:       g.config.Title,
		SiteDescription: g.config.Description,
		BaseURL:         g.config.BaseURL,
		BasePath:        g.config.BasePath,
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
		URL:             g.config.BasePath + "/strategy.html",
		Date:            time.Now(),
		Navigation:      g.config.Navigation,
		SiteTitle:       g.config.Title,
		SiteDescription: g.config.Description,
		BaseURL:         g.config.BaseURL,
		BasePath:        g.config.BasePath,
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
		URL:             g.config.BasePath + "/troubleshooting.html",
		Date:            time.Now(),
		Navigation:      g.config.Navigation,
		SiteTitle:       g.config.Title,
		SiteDescription: g.config.Description,
		BaseURL:         g.config.BaseURL,
		BasePath:        g.config.BasePath,
		Language:        g.config.Language,
		Theme:           g.theme,
		Issues:          issues,
	}
}

// Helper methods for content generation (to be implemented)
func (g *HTMLGenerator) generateHomeContent(issues []models.Issue) string {
	openIssues := 0
	closedIssues := 0
	for _, issue := range issues {
		if issue.State == "open" {
			openIssues++
		} else {
			closedIssues++
		}
	}

	healthScore := g.calculateHealthScore(issues)
	recentIssues := issues
	if len(issues) > 5 {
		recentIssues = issues[:5]
	}

	content := fmt.Sprintf(`<div class="beaver-home">
		<div class="summary-cards">
			<div class="card">
				<h3>📊 プロジェクト統計</h3>
				<p>総課題数: %d件</p>
				<p>オープン: %d件 | クローズ: %d件</p>
			</div>
			<div class="card">
				<h3>📈 健全性スコア</h3>
				<p class="health-score">%d%%</p>
			</div>
			<div class="card">
				<h3>🎯 開発状況</h3>
				<p>アクティブな開発中</p>
			</div>
		</div>
		<div class="recent-activity">
			<h3>📋 最近の課題</h3>`, len(issues), openIssues, closedIssues, healthScore)

	for _, issue := range recentIssues {
		content += fmt.Sprintf(`
			<div class="issue-preview">
				<h4>%s</h4>
				<p>%s</p>
				<span class="issue-state %s">%s</span>
			</div>`, issue.Title, truncateText(issue.Body, 100), issue.State, issue.State)
	}

	content += `
		</div>
	</div>`
	return content
}

func (g *HTMLGenerator) generateIssuesContent(issues []models.Issue) string {
	if len(issues) == 0 {
		return "<div class=\"no-issues\"><p>課題が見つかりませんでした。</p></div>"
	}

	// Group issues by state
	openIssues := []models.Issue{}
	closedIssues := []models.Issue{}
	for _, issue := range issues {
		if issue.State == "open" {
			openIssues = append(openIssues, issue)
		} else {
			closedIssues = append(closedIssues, issue)
		}
	}

	content := fmt.Sprintf(`<div class="issues-summary">
		<h2>📊 課題サマリー</h2>
		<div class="issue-stats">
			<div class="stat-item open">オープン: %d件</div>
			<div class="stat-item closed">クローズ: %d件</div>
			<div class="stat-item total">総計: %d件</div>
		</div>
	</div>`, len(openIssues), len(closedIssues), len(issues))

	// Open issues section
	if len(openIssues) > 0 {
		content += `<div class="issues-section"><h3>🔓 オープンな課題</h3><div class="issues-grid">`
		for _, issue := range openIssues {
			labels := ""
			for _, label := range issue.Labels {
				labels += fmt.Sprintf(`<span class="label" style="background-color: #%s">%s</span>`, label.Color, label.Name)
			}
			content += fmt.Sprintf(`
				<div class="issue-card open">
					<h4>%s</h4>
					<p>%s</p>
					<div class="issue-meta">
						<span class="issue-number">#%d</span>
						<span class="issue-date">%s</span>
						<div class="labels">%s</div>
					</div>
				</div>`, issue.Title, truncateText(issue.Body, 150), issue.Number, issue.CreatedAt.Format("2006/01/02"), labels)
		}
		content += `</div></div>`
	}

	// Closed issues section (limited to recent 10)
	if len(closedIssues) > 0 {
		recentClosed := closedIssues
		if len(closedIssues) > 10 {
			recentClosed = closedIssues[:10]
		}
		content += `<div class="issues-section"><h3>✅ 最近クローズした課題</h3><div class="issues-grid">`
		for _, issue := range recentClosed {
			content += fmt.Sprintf(`
				<div class="issue-card closed">
					<h4>%s</h4>
					<p>%s</p>
					<div class="issue-meta">
						<span class="issue-number">#%d</span>
						<span class="issue-date">%s</span>
					</div>
				</div>`, issue.Title, truncateText(issue.Body, 150), issue.Number, issue.CreatedAt.Format("2006/01/02"))
		}
		content += `</div></div>`
	}

	return content
}

func (g *HTMLGenerator) generateStrategyContent(issues []models.Issue) string {
	// Analyze issues for strategy insights
	labelCounts := make(map[string]int)
	priorityCounts := make(map[string]int)
	typeCounts := make(map[string]int)

	for _, issue := range issues {
		for _, label := range issue.Labels {
			labelName := strings.ToLower(label.Name)
			labelCounts[labelName]++

			// Categorize by type
			if strings.Contains(labelName, "bug") || strings.Contains(labelName, "fix") {
				typeCounts["バグ修正"]++
			} else if strings.Contains(labelName, "feature") || strings.Contains(labelName, "enhancement") {
				typeCounts["機能開発"]++
			} else if strings.Contains(labelName, "docs") || strings.Contains(labelName, "documentation") {
				typeCounts["ドキュメント"]++
			} else if strings.Contains(labelName, "test") {
				typeCounts["テスト"]++
			}

			// Categorize by priority
			if strings.Contains(labelName, "critical") || strings.Contains(labelName, "urgent") {
				priorityCounts["緊急"]++
			} else if strings.Contains(labelName, "high") {
				priorityCounts["高"]++
			} else if strings.Contains(labelName, "medium") {
				priorityCounts["中"]++
			} else if strings.Contains(labelName, "low") {
				priorityCounts["低"]++
			}
		}
	}

	content := `<div class="strategy-analysis">
		<h2>🎯 開発戦略分析</h2>
		<div class="strategy-overview">
			<p>プロジェクトの課題分析に基づく戦略的インサイトです。</p>
		</div>`

	// Work type distribution
	if len(typeCounts) > 0 {
		content += `<div class="analysis-section">
			<h3>📊 作業タイプ分布</h3>
			<div class="type-distribution">`
		for workType, count := range typeCounts {
			percentage := float64(count) / float64(len(issues)) * 100
			content += fmt.Sprintf(`
				<div class="type-item">
					<span class="type-name">%s</span>
					<span class="type-count">%d件 (%.1f%%)</span>
				</div>`, workType, count, percentage)
		}
		content += `</div></div>`
	}

	// Priority distribution
	if len(priorityCounts) > 0 {
		content += `<div class="analysis-section">
			<h3>⚡ 優先度分布</h3>
			<div class="priority-distribution">`
		for priority, count := range priorityCounts {
			percentage := float64(count) / float64(len(issues)) * 100
			content += fmt.Sprintf(`
				<div class="priority-item priority-%s">
					<span class="priority-name">%s優先度</span>
					<span class="priority-count">%d件 (%.1f%%)</span>
				</div>`, strings.ToLower(priority), priority, count, percentage)
		}
		content += `</div></div>`
	}

	// Strategic recommendations
	content += `<div class="analysis-section">
		<h3>💡 戦略的推奨事項</h3>
		<div class="recommendations">`

	if typeCounts["バグ修正"] > typeCounts["機能開発"] {
		content += `<div class="recommendation">🔧 バグ修正に注力し、品質安定化を図る</div>`
	} else {
		content += `<div class="recommendation">🚀 新機能開発でプロダクト価値を向上</div>`
	}

	if priorityCounts["緊急"] > 0 || priorityCounts["高"] > 0 {
		content += `<div class="recommendation">⚡ 高優先度課題への迅速な対応が必要</div>`
	}

	if typeCounts["ドキュメント"] < len(issues)/10 {
		content += `<div class="recommendation">📚 ドキュメント整備でメンテナンス性向上</div>`
	}

	if typeCounts["テスト"] < len(issues)/5 {
		content += `<div class="recommendation">🧪 テスト充実で品質保証強化</div>`
	}

	content += `</div></div></div>`
	return content
}

func (g *HTMLGenerator) generateTroubleshootingContent(issues []models.Issue) string {
	// Extract bug issues and common problems
	bugIssues := []models.Issue{}
	errorKeywords := []string{"error", "エラー", "bug", "バグ", "fail", "失敗", "crash", "クラッシュ", "broken", "動かない"}
	commonProblems := make(map[string][]models.Issue)

	for _, issue := range issues {
		isBug := false

		// Check labels for bug-related content
		for _, label := range issue.Labels {
			labelName := strings.ToLower(label.Name)
			if strings.Contains(labelName, "bug") || strings.Contains(labelName, "fix") || strings.Contains(labelName, "error") {
				isBug = true
				break
			}
		}

		// Check title and body for error keywords
		if !isBug {
			titleAndBody := strings.ToLower(issue.Title + " " + issue.Body)
			for _, keyword := range errorKeywords {
				if strings.Contains(titleAndBody, keyword) {
					isBug = true
					break
				}
			}
		}

		if isBug {
			bugIssues = append(bugIssues, issue)

			// Categorize by problem type
			titleLower := strings.ToLower(issue.Title)
			if strings.Contains(titleLower, "install") || strings.Contains(titleLower, "インストール") {
				commonProblems["インストール問題"] = append(commonProblems["インストール問題"], issue)
			} else if strings.Contains(titleLower, "config") || strings.Contains(titleLower, "設定") {
				commonProblems["設定問題"] = append(commonProblems["設定問題"], issue)
			} else if strings.Contains(titleLower, "performance") || strings.Contains(titleLower, "パフォーマンス") || strings.Contains(titleLower, "slow") {
				commonProblems["パフォーマンス問題"] = append(commonProblems["パフォーマンス問題"], issue)
			} else if strings.Contains(titleLower, "api") {
				commonProblems["API問題"] = append(commonProblems["API問題"], issue)
			} else {
				commonProblems["その他の問題"] = append(commonProblems["その他の問題"], issue)
			}
		}
	}

	content := `<div class="troubleshooting-guide">
		<h2>🔧 トラブルシューティングガイド</h2>
		<div class="troubleshooting-overview">
			<p>よくある問題と解決方法をまとめました。問題解決の参考にしてください。</p>
		</div>`

	if len(bugIssues) == 0 {
		content += `<div class="no-issues">
			<p>🎉 現在、報告されている既知の問題はありません。</p>
			<p>新しい問題を発見した場合は、GitHubでIssueを作成してください。</p>
		</div>`
	} else {
		content += fmt.Sprintf(`<div class="problem-summary">
			<p>📊 既知の問題: %d件</p>
		</div>`, len(bugIssues))

		// Group problems by category
		for category, categoryIssues := range commonProblems {
			if len(categoryIssues) > 0 {
				content += fmt.Sprintf(`<div class="problem-category">
					<h3>%s (%d件)</h3>
					<div class="problem-list">`, category, len(categoryIssues))

				for _, issue := range categoryIssues {
					status := "未解決"
					statusClass := "open"
					if issue.State == "closed" {
						status = "解決済み"
						statusClass = "closed"
					}

					content += fmt.Sprintf(`
						<div class="problem-item %s">
							<h4>%s</h4>
							<p>%s</p>
							<div class="problem-meta">
								<span class="issue-number">#%d</span>
								<span class="status %s">%s</span>
								<span class="date">%s</span>
							</div>
						</div>`, statusClass, issue.Title, truncateText(issue.Body, 200), issue.Number, statusClass, status, issue.CreatedAt.Format("2006/01/02"))
				}

				content += `</div></div>`
			}
		}

		// General troubleshooting tips
		content += `<div class="general-tips">
			<h3>💡 一般的なトラブルシューティングのヒント</h3>
			<ul>
				<li>🔍 エラーメッセージを正確に記録し、検索してみる</li>
				<li>📋 問題の再現手順を明確にする</li>
				<li>🌐 環境情報（OS、ブラウザ、バージョン等）を確認</li>
				<li>🔄 最新バージョンで問題が解決しているか確認</li>
				<li>📖 ドキュメントやFAQを確認</li>
				<li>🤝 コミュニティやサポートに質問する前に既存のIssueを検索</li>
			</ul>
		</div>`
	}

	content += `</div>`
	return content
}

func (g *HTMLGenerator) generateStatistics(issues []models.Issue) map[string]interface{} {
	openCount := 0
	closedCount := 0
	labelCounts := make(map[string]int)

	for _, issue := range issues {
		if issue.State == "open" {
			openCount++
		} else {
			closedCount++
		}

		for _, label := range issue.Labels {
			labelCounts[label.Name]++
		}
	}

	return map[string]interface{}{
		"total_issues":  len(issues),
		"open_issues":   openCount,
		"closed_issues": closedCount,
		"label_counts":  labelCounts,
		"completion_rate": func() float64 {
			if len(issues) == 0 {
				return 0.0
			}
			return float64(closedCount) / float64(len(issues)) * 100
		}(),
	}
}

func (g *HTMLGenerator) generateIssueStatistics(_ []models.Issue) map[string]interface{} {
	return map[string]interface{}{
		"by_label": make(map[string]int),
		"by_state": make(map[string]int),
	}
}

func (g *HTMLGenerator) calculateHealthScore(issues []models.Issue) int {
	if len(issues) == 0 {
		return 100 // Perfect score with no issues
	}

	openCount := 0
	closedCount := 0
	oldIssuesCount := 0
	highPriorityOpenCount := 0
	currentTime := time.Now()

	for _, issue := range issues {
		if issue.State == "open" {
			openCount++

			// Check if issue is old (more than 30 days)
			if currentTime.Sub(issue.CreatedAt) > 30*24*time.Hour {
				oldIssuesCount++
			}

			// Check for high priority labels
			for _, label := range issue.Labels {
				labelName := strings.ToLower(label.Name)
				if strings.Contains(labelName, "critical") || strings.Contains(labelName, "urgent") || strings.Contains(labelName, "high") {
					highPriorityOpenCount++
					break
				}
			}
		} else {
			closedCount++
		}
	}

	// Calculate health score (0-100)
	score := 100

	// Penalty for high ratio of open issues
	if len(issues) > 0 {
		openRatio := float64(openCount) / float64(len(issues))
		if openRatio > 0.5 {
			score -= int((openRatio - 0.5) * 40) // Up to -20 points
		}
	}

	// Penalty for old open issues
	if openCount > 0 {
		oldRatio := float64(oldIssuesCount) / float64(openCount)
		score -= int(oldRatio * 30) // Up to -30 points
	}

	// Penalty for high priority open issues
	if openCount > 0 {
		highPriorityRatio := float64(highPriorityOpenCount) / float64(openCount)
		score -= int(highPriorityRatio * 25) // Up to -25 points
	}

	// Bonus for having issues (shows active development)
	if len(issues) > 0 && len(issues) < 10 {
		score += 5
	}

	// Ensure score is within bounds
	if score < 0 {
		score = 0
	}
	if score > 100 {
		score = 100
	}

	return score
}

// generateServiceWorker creates a service worker for PWA functionality
func (g *HTMLGenerator) generateServiceWorker() error {
	basePath := g.config.BasePath
	if basePath == "" {
		basePath = ""
	}

	sw := `// Beaver Knowledge Base Service Worker
const CACHE_NAME = 'beaver-kb-v1';
const urlsToCache = [
  '` + basePath + `/',
  '` + basePath + `/index.html',
  '` + basePath + `/issues.html',
  '` + basePath + `/strategy.html',
  '` + basePath + `/troubleshooting.html',
  '` + basePath + `/assets/css/style.css',
  '` + basePath + `/assets/js/main.js'
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

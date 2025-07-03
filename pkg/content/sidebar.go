package content

import (
	"bytes"
	"fmt"
	"strings"
	"text/template"
	"time"

	"github.com/nyasuto/beaver/internal/models"
)

// SidebarGenerator generates dynamic _Sidebar.md content
type SidebarGenerator struct {
	navigationManager *NavigationManager
	template          *template.Template
}

// SidebarData contains data for sidebar template rendering
type SidebarData struct {
	ProjectName   string
	GeneratedAt   time.Time
	Sections      []WikiSection
	TotalPages    int
	ActivePages   []NavigationLink
	QuickLinks    []NavigationLink
	SearchEnabled bool
	LastUpdate    time.Time
}

// NewSidebarGenerator creates a new sidebar generator
func NewSidebarGenerator() *SidebarGenerator {
	sg := &SidebarGenerator{
		navigationManager: NewNavigationManager(),
	}
	sg.initializeTemplate()
	return sg
}

// initializeTemplate sets up the sidebar template
func (sg *SidebarGenerator) initializeTemplate() {
	templateContent := sg.getDefaultSidebarTemplate()
	tmpl, err := template.New("sidebar").Parse(templateContent)
	if err != nil {
		// Fallback to minimal template if parsing fails
		var fallbackErr error
		tmpl, fallbackErr = template.New("sidebar").Parse(sg.getMinimalSidebarTemplate())
		if fallbackErr != nil {
			// Use a very basic template as last resort
			basicTmpl, basicErr := template.New("sidebar").Parse("# Navigation\n\n- [Home](Home)")
			if basicErr == nil {
				tmpl = basicTmpl
			}
		}
	}
	sg.template = tmpl
}

// GenerateSidebar generates the _Sidebar.md content
func (sg *SidebarGenerator) GenerateSidebar(projectName string, issues []models.Issue) (*WikiPage, error) {
	// Update navigation manager with dynamic content
	sg.updateDynamicSections(issues)

	data := SidebarData{
		ProjectName:   projectName,
		GeneratedAt:   time.Now(),
		Sections:      sg.navigationManager.GetAllSections(),
		TotalPages:    sg.countTotalPages(),
		ActivePages:   sg.getActivePages(),
		QuickLinks:    sg.getQuickLinks(),
		SearchEnabled: false, // GitHub Wiki doesn't support advanced search
		LastUpdate:    time.Now(),
	}

	var buf bytes.Buffer
	if err := sg.template.Execute(&buf, data); err != nil {
		return nil, fmt.Errorf("failed to execute sidebar template: %w", err)
	}

	return &WikiPage{
		Title:     "_Sidebar",
		Content:   buf.String(),
		Filename:  "_Sidebar.md",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		Summary:   "Dynamic navigation sidebar for GitHub Wiki",
		Category:  "Navigation",
		Tags:      []string{"sidebar", "navigation", "structure"},
	}, nil
}

// updateDynamicSections analyzes issues and updates sections accordingly
func (sg *SidebarGenerator) updateDynamicSections(issues []models.Issue) {
	// Analyze issues for potential new sections
	labelCategories := sg.analyzeLabelCategories(issues)

	// Add dynamic sections for significant categories
	for category, categoryIssues := range labelCategories {
		if len(categoryIssues) >= 5 { // Threshold for creating a section
			sg.navigationManager.AddDynamicSection(
				category,
				sg.getCategoryIcon(category),
				fmt.Sprintf("Issues related to %s", strings.ToLower(category)),
				categoryIssues,
			)
		}
	}
}

// analyzeLabelCategories groups issues by major label categories
func (sg *SidebarGenerator) analyzeLabelCategories(issues []models.Issue) map[string][]models.Issue {
	categories := make(map[string][]models.Issue)

	for _, issue := range issues {
		primaryCategory := sg.getPrimaryCategory(issue)
		categories[primaryCategory] = append(categories[primaryCategory], issue)
	}

	return categories
}

// getPrimaryCategory determines the primary category for an issue
func (sg *SidebarGenerator) getPrimaryCategory(issue models.Issue) string {
	// Priority order for categorization
	categoryKeywords := map[string][]string{
		"Security":      {"security", "vulnerability", "auth", "permission"},
		"Performance":   {"performance", "speed", "slow", "optimize", "memory"},
		"Bug Reports":   {"bug", "error", "fail", "broken", "issue"},
		"Features":      {"feature", "enhancement", "improvement", "add"},
		"Documentation": {"doc", "docs", "readme", "guide", "tutorial"},
		"Testing":       {"test", "testing", "spec", "validation"},
		"CI/CD":         {"ci", "cd", "build", "deploy", "automation"},
	}

	issueText := strings.ToLower(issue.Title + " " + issue.Body)

	// Check labels first
	for _, label := range issue.Labels {
		labelLower := strings.ToLower(label.Name)
		for category, keywords := range categoryKeywords {
			for _, keyword := range keywords {
				if strings.Contains(labelLower, keyword) {
					return category
				}
			}
		}
	}

	// Check content
	for category, keywords := range categoryKeywords {
		for _, keyword := range keywords {
			if strings.Contains(issueText, keyword) {
				return category
			}
		}
	}

	return "General"
}

// getCategoryIcon returns an icon for a category
func (sg *SidebarGenerator) getCategoryIcon(category string) string {
	iconMap := map[string]string{
		"Security":      "🔒",
		"Performance":   "⚡",
		"Bug Reports":   "🐛",
		"Features":      "✨",
		"Documentation": "📚",
		"Testing":       "🧪",
		"CI/CD":         "🔄",
		"General":       "📝",
	}

	if icon, exists := iconMap[category]; exists {
		return icon
	}
	return "📄"
}

// countTotalPages counts the total number of pages across all sections
func (sg *SidebarGenerator) countTotalPages() int {
	total := 1 // Home page
	for _, section := range sg.navigationManager.GetAllSections() {
		total += len(section.Pages)
	}
	return total
}

// getActivePages returns the core active pages
func (sg *SidebarGenerator) getActivePages() []NavigationLink {
	return []NavigationLink{
		{Title: "Home", URL: "Home", Icon: "🏠", Description: "Main index page"},
		{Title: "Issues Summary", URL: "Issues-Summary", Icon: "📋", Description: "Complete issues overview"},
		{Title: "Troubleshooting", URL: "Troubleshooting-Guide", Icon: "🛠️", Description: "Solutions and fixes"},
		{Title: "Learning Path", URL: "Learning-Path", Icon: "📚", Description: "Development journey"},
	}
}

// getQuickLinks returns quick access links
func (sg *SidebarGenerator) getQuickLinks() []NavigationLink {
	return []NavigationLink{
		{Title: "GitHub Repository", URL: "../", Icon: "🔗", Description: "View source code"},
		{Title: "Issues", URL: "../issues", Icon: "📋", Description: "GitHub Issues"},
		{Title: "Pull Requests", URL: "../pulls", Icon: "🔄", Description: "GitHub Pull Requests"},
		{Title: "Actions", URL: "../actions", Icon: "⚙️", Description: "CI/CD Workflows"},
	}
}

// getDefaultSidebarTemplate returns the comprehensive sidebar template
func (sg *SidebarGenerator) getDefaultSidebarTemplate() string {
	return `# 🧭 Navigation

## 🏠 [Home](Home)

{{range .Sections}}
## {{.Icon}} {{.Name}}
{{.Description}}

{{range .Pages}}
- {{.Icon}} [{{.Title}}]({{.URL}})
{{end}}

{{end}}

---

## ⚡ Quick Access

{{range .QuickLinks}}
- {{.Icon}} [{{.Title}}]({{.URL}})
{{end}}

---

## 📊 Wiki Stats

- **Total Pages**: {{.TotalPages}}
- **Last Update**: {{.LastUpdate.Format "Jan 2, 15:04"}}
- **Generated**: {{.GeneratedAt.Format "2006-01-02"}}

---

## 🔍 Find Content

- 🏠 **Start Here**: [Home](Home) for overview
- 📋 **Issues**: [Summary](Issues-Summary) for all issues
- 🛠️ **Problems**: [Troubleshooting](Troubleshooting-Guide) for solutions
- 📚 **Learning**: [Path](Learning-Path) for progression

---

**🤖 Auto-generated by Beaver AI**`
}

// getMinimalSidebarTemplate returns a fallback minimal template
func (sg *SidebarGenerator) getMinimalSidebarTemplate() string {
	return `# 🧭 Navigation

## 🏠 [Home](Home)

## 📊 Analysis Reports
- 📋 [Issues Summary](Issues-Summary)

## 🛠️ Development Guide  
- 📚 [Learning Path](Learning-Path)
- 🔧 [Troubleshooting Guide](Troubleshooting-Guide)

---

**🤖 Generated by Beaver AI**`
}

// GenerateSidebarWithCustomSections generates sidebar with custom sections
func (sg *SidebarGenerator) GenerateSidebarWithCustomSections(projectName string, customSections []WikiSection) (*WikiPage, error) {
	// Merge custom sections with defaults
	allSections := append(sg.navigationManager.GetAllSections(), customSections...)

	data := SidebarData{
		ProjectName:   projectName,
		GeneratedAt:   time.Now(),
		Sections:      allSections,
		TotalPages:    sg.countTotalPages() + sg.countCustomPages(customSections),
		ActivePages:   sg.getActivePages(),
		QuickLinks:    sg.getQuickLinks(),
		SearchEnabled: false,
		LastUpdate:    time.Now(),
	}

	var buf bytes.Buffer
	if err := sg.template.Execute(&buf, data); err != nil {
		return nil, fmt.Errorf("failed to execute sidebar template with custom sections: %w", err)
	}

	return &WikiPage{
		Title:     "_Sidebar",
		Content:   buf.String(),
		Filename:  "_Sidebar.md",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		Summary:   "Dynamic navigation sidebar with custom sections",
		Category:  "Navigation",
		Tags:      []string{"sidebar", "navigation", "custom"},
	}, nil
}

// countCustomPages counts pages in custom sections
func (sg *SidebarGenerator) countCustomPages(sections []WikiSection) int {
	total := 0
	for _, section := range sections {
		total += len(section.Pages)
	}
	return total
}

// GenerateCompactSidebar generates a more compact sidebar for mobile/small screens
func (sg *SidebarGenerator) GenerateCompactSidebar(projectName string) (*WikiPage, error) {
	compactTemplate := `# 🧭 {{.ProjectName}}

- 🏠 [Home](Home)
- 📋 [Issues](Issues-Summary)
- 🛠️ [Troubleshooting](Troubleshooting-Guide)
- 📚 [Learning](Learning-Path)

**Total: {{.TotalPages}} pages**`

	tmpl, err := template.New("compact-sidebar").Parse(compactTemplate)
	if err != nil {
		return nil, fmt.Errorf("failed to parse compact sidebar template: %w", err)
	}

	data := SidebarData{
		ProjectName: projectName,
		TotalPages:  sg.countTotalPages(),
		GeneratedAt: time.Now(),
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return nil, fmt.Errorf("failed to execute compact sidebar template: %w", err)
	}

	return &WikiPage{
		Title:     "_Sidebar",
		Content:   buf.String(),
		Filename:  "_Sidebar.md",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		Summary:   "Compact navigation sidebar for GitHub Wiki",
		Category:  "Navigation",
		Tags:      []string{"sidebar", "navigation", "compact"},
	}, nil
}

// SetCustomTemplate allows setting a custom sidebar template
func (sg *SidebarGenerator) SetCustomTemplate(templateContent string) error {
	tmpl, err := template.New("custom-sidebar").Parse(templateContent)
	if err != nil {
		return fmt.Errorf("failed to parse custom sidebar template: %w", err)
	}
	sg.template = tmpl
	return nil
}

// GetNavigationManager returns the underlying navigation manager
func (sg *SidebarGenerator) GetNavigationManager() *NavigationManager {
	return sg.navigationManager
}

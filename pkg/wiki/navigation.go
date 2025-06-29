package wiki

import (
	"fmt"
	"strings"

	"github.com/nyasuto/beaver/internal/models"
)

// NavigationContext represents the navigation context for a wiki page
type NavigationContext struct {
	CurrentPage    string
	ParentPage     string
	PreviousPage   string
	NextPage       string
	RelatedPages   []NavigationLink
	BreadcrumbPath []NavigationBreadcrumb
	SectionType    string
}

// NavigationLink represents a link to another wiki page
type NavigationLink struct {
	Title       string
	URL         string
	Description string
	Icon        string
	PageType    string
}

// NavigationBreadcrumb represents a breadcrumb navigation item
type NavigationBreadcrumb struct {
	Title string
	URL   string
	Icon  string
}

// WikiSection represents a logical section in the wiki hierarchy
type WikiSection struct {
	Name        string           `json:"name"`
	Icon        string           `json:"icon"`
	Pages       []NavigationLink `json:"pages"`
	SubSections []WikiSection    `json:"sub_sections"`
	Description string           `json:"description"`
	Priority    int              `json:"priority"`
}

// NavigationManager manages wiki navigation and hierarchy
type NavigationManager struct {
	sections      []WikiSection
	pageHierarchy map[string]NavigationContext
}

// NewNavigationManager creates a new navigation manager
func NewNavigationManager() *NavigationManager {
	nm := &NavigationManager{
		pageHierarchy: make(map[string]NavigationContext),
	}
	nm.initializeDefaultSections()
	nm.buildPageHierarchy()
	return nm
}

// initializeDefaultSections sets up the default wiki section structure
func (nm *NavigationManager) initializeDefaultSections() {
	nm.sections = []WikiSection{
		{
			Name:        "Analysis Reports",
			Icon:        "📊",
			Description: "Data analysis and statistical reports",
			Priority:    1,
			Pages: []NavigationLink{
				{Title: "Issues Summary", URL: "Issues-Summary", Icon: "📋", PageType: "summary", Description: "Complete overview of all GitHub Issues"},
				{Title: "Statistics Dashboard", URL: "Statistics-Dashboard", Icon: "📈", PageType: "analytics", Description: "Statistical analysis and metrics"},
			},
		},
		{
			Name:        "Development Guide",
			Icon:        "🛠️",
			Description: "Development resources and learning materials",
			Priority:    2,
			Pages: []NavigationLink{
				{Title: "Learning Path", URL: "Learning-Path", Icon: "📚", PageType: "guide", Description: "Development journey and knowledge progression"},
				{Title: "Troubleshooting Guide", URL: "Troubleshooting-Guide", Icon: "🔧", PageType: "guide", Description: "Solutions and fixes for common problems"},
			},
		},
		{
			Name:        "Automation Info",
			Icon:        "🔄",
			Description: "CI/CD and automation status information",
			Priority:    3,
			Pages: []NavigationLink{
				{Title: "CI/CD Status", URL: "CICD-Status", Icon: "🤖", PageType: "status", Description: "Continuous integration and deployment status"},
				{Title: "Processing Logs", URL: "Processing-Logs", Icon: "📊", PageType: "logs", Description: "AI processing and automation logs"},
			},
		},
	}
}

// buildPageHierarchy constructs the hierarchical navigation structure
func (nm *NavigationManager) buildPageHierarchy() {
	// Home page context
	nm.pageHierarchy["Home"] = NavigationContext{
		CurrentPage:  "Home",
		ParentPage:   "",
		SectionType:  "root",
		RelatedPages: nm.getAllPageLinks(),
		BreadcrumbPath: []NavigationBreadcrumb{
			{Title: "Home", URL: "Home", Icon: "🏠"},
		},
	}

	// Build contexts for each section page
	for _, section := range nm.sections {
		for i, page := range section.Pages {
			context := NavigationContext{
				CurrentPage: page.URL,
				ParentPage:  "Home",
				SectionType: section.Name,
				BreadcrumbPath: []NavigationBreadcrumb{
					{Title: "Home", URL: "Home", Icon: "🏠"},
					{Title: section.Name, URL: "", Icon: section.Icon},
					{Title: page.Title, URL: page.URL, Icon: page.Icon},
				},
			}

			// Set previous/next navigation within section
			if i > 0 {
				context.PreviousPage = section.Pages[i-1].URL
			}
			if i < len(section.Pages)-1 {
				context.NextPage = section.Pages[i+1].URL
			}

			// Add related pages from the same section
			for _, relatedPage := range section.Pages {
				if relatedPage.URL != page.URL {
					context.RelatedPages = append(context.RelatedPages, relatedPage)
				}
			}

			nm.pageHierarchy[page.URL] = context
		}
	}
}

// GetNavigationContext returns the navigation context for a given page
func (nm *NavigationManager) GetNavigationContext(pageName string) NavigationContext {
	if context, exists := nm.pageHierarchy[pageName]; exists {
		return context
	}

	// Default context for unknown pages
	return NavigationContext{
		CurrentPage: pageName,
		ParentPage:  "Home",
		SectionType: "unknown",
		BreadcrumbPath: []NavigationBreadcrumb{
			{Title: "Home", URL: "Home", Icon: "🏠"},
			{Title: pageName, URL: pageName, Icon: "📄"},
		},
	}
}

// GetAllSections returns all wiki sections
func (nm *NavigationManager) GetAllSections() []WikiSection {
	return nm.sections
}

// getAllPageLinks returns all page links across all sections
func (nm *NavigationManager) getAllPageLinks() []NavigationLink {
	var allPages []NavigationLink
	for _, section := range nm.sections {
		allPages = append(allPages, section.Pages...)
	}
	return allPages
}

// GenerateBreadcrumbHTML generates HTML breadcrumb navigation
func (nm *NavigationManager) GenerateBreadcrumbHTML(pageName string) string {
	context := nm.GetNavigationContext(pageName)
	if len(context.BreadcrumbPath) == 0 {
		return ""
	}

	var parts []string
	for i, breadcrumb := range context.BreadcrumbPath {
		if i == len(context.BreadcrumbPath)-1 {
			// Current page - no link
			parts = append(parts, fmt.Sprintf("%s **%s**", breadcrumb.Icon, breadcrumb.Title))
		} else if breadcrumb.URL != "" {
			// Linked breadcrumb
			parts = append(parts, fmt.Sprintf("%s [%s](%s)", breadcrumb.Icon, breadcrumb.Title, breadcrumb.URL))
		} else {
			// Section name - no link
			parts = append(parts, fmt.Sprintf("%s %s", breadcrumb.Icon, breadcrumb.Title))
		}
	}

	return strings.Join(parts, " > ")
}

// GenerateNavigationFooter generates footer navigation with prev/next links
func (nm *NavigationManager) GenerateNavigationFooter(pageName string) string {
	context := nm.GetNavigationContext(pageName)
	var footerParts []string

	// Previous/Next navigation
	if context.PreviousPage != "" || context.NextPage != "" {
		footerParts = append(footerParts, "## 🧭 Navigation")

		var navLinks []string
		if context.PreviousPage != "" {
			navLinks = append(navLinks, fmt.Sprintf("⬅️ **Previous:** [%s](%s)", nm.getPageTitle(context.PreviousPage), context.PreviousPage))
		}
		if context.NextPage != "" {
			navLinks = append(navLinks, fmt.Sprintf("➡️ **Next:** [%s](%s)", nm.getPageTitle(context.NextPage), context.NextPage))
		}
		if context.ParentPage != "" {
			navLinks = append(navLinks, fmt.Sprintf("🔼 **Up:** [%s](%s)", nm.getPageTitle(context.ParentPage), context.ParentPage))
		}

		footerParts = append(footerParts, strings.Join(navLinks, "  \n"))
	}

	// Related pages
	if len(context.RelatedPages) > 0 {
		footerParts = append(footerParts, "")
		footerParts = append(footerParts, "**Related Pages:**")
		for _, page := range context.RelatedPages {
			footerParts = append(footerParts, fmt.Sprintf("- %s [%s](%s) - %s", page.Icon, page.Title, page.URL, page.Description))
		}
	}

	return strings.Join(footerParts, "\n")
}

// getPageTitle returns the display title for a page URL
func (nm *NavigationManager) getPageTitle(pageURL string) string {
	for _, section := range nm.sections {
		for _, page := range section.Pages {
			if page.URL == pageURL {
				return page.Title
			}
		}
	}

	// Convert URL to title format
	return strings.ReplaceAll(strings.ReplaceAll(pageURL, "-", " "), "_", " ")
}

// AddDynamicSection adds a new section based on issue analysis
func (nm *NavigationManager) AddDynamicSection(name, icon, description string, issues []models.Issue) {
	section := WikiSection{
		Name:        name,
		Icon:        icon,
		Description: description,
		Priority:    len(nm.sections) + 1,
		Pages:       []NavigationLink{},
	}

	// Generate pages based on issue categorization
	categories := nm.categorizeIssues(issues)
	for category, categoryIssues := range categories {
		if len(categoryIssues) >= 3 { // Only create pages for categories with sufficient content
			pageURL := nm.generatePageURL(category)
			section.Pages = append(section.Pages, NavigationLink{
				Title:       category,
				URL:         pageURL,
				Icon:        nm.getCategoryIcon(category),
				PageType:    "dynamic",
				Description: fmt.Sprintf("%d issues in %s category", len(categoryIssues), category),
			})
		}
	}

	if len(section.Pages) > 0 {
		nm.sections = append(nm.sections, section)
		nm.buildPageHierarchy() // Rebuild hierarchy with new section
	}
}

// categorizeIssues groups issues by labels or other criteria
func (nm *NavigationManager) categorizeIssues(issues []models.Issue) map[string][]models.Issue {
	categories := make(map[string][]models.Issue)

	for _, issue := range issues {
		category := "General"

		// Categorize by labels
		for _, label := range issue.Labels {
			if nm.isPrimaryLabel(label.Name) {
				category = nm.formatCategoryName(label.Name)
				break
			}
		}

		// Categorize by issue content if no labels
		if category == "General" {
			category = nm.inferCategoryFromContent(issue)
		}

		categories[category] = append(categories[category], issue)
	}

	return categories
}

// isPrimaryLabel determines if a label should be used for primary categorization
func (nm *NavigationManager) isPrimaryLabel(label string) bool {
	primaryLabels := []string{"feature", "bug", "enhancement", "documentation", "question", "performance", "security"}
	for _, primary := range primaryLabels {
		if strings.Contains(strings.ToLower(label), primary) {
			return true
		}
	}
	return false
}

// formatCategoryName formats a label into a category name
func (nm *NavigationManager) formatCategoryName(label string) string {
	words := strings.Split(strings.ReplaceAll(label, "-", " "), " ")
	for i, word := range words {
		if len(word) > 0 {
			words[i] = strings.ToUpper(word[:1]) + strings.ToLower(word[1:])
		}
	}
	return strings.Join(words, " ")
}

// inferCategoryFromContent attempts to categorize an issue based on its content
func (nm *NavigationManager) inferCategoryFromContent(issue models.Issue) string {
	content := strings.ToLower(issue.Title + " " + issue.Body)

	if strings.Contains(content, "error") || strings.Contains(content, "bug") || strings.Contains(content, "fail") {
		return "Bug Reports"
	}
	if strings.Contains(content, "feature") || strings.Contains(content, "add") || strings.Contains(content, "implement") {
		return "Feature Requests"
	}
	if strings.Contains(content, "doc") || strings.Contains(content, "readme") || strings.Contains(content, "guide") {
		return "Documentation"
	}
	if strings.Contains(content, "performance") || strings.Contains(content, "slow") || strings.Contains(content, "optimize") {
		return "Performance"
	}

	return "General"
}

// getCategoryIcon returns an appropriate icon for a category
func (nm *NavigationManager) getCategoryIcon(category string) string {
	iconMap := map[string]string{
		"Bug Reports":      "🐛",
		"Feature Requests": "✨",
		"Documentation":    "📚",
		"Performance":      "⚡",
		"Security":         "🔒",
		"General":          "📝",
	}

	if icon, exists := iconMap[category]; exists {
		return icon
	}
	return "📄"
}

// generatePageURL generates a valid wiki page URL from a category name
func (nm *NavigationManager) generatePageURL(category string) string {
	// Convert to wiki-friendly URL format
	url := strings.ReplaceAll(category, " ", "-")
	url = strings.ReplaceAll(url, "_", "-")
	return url
}

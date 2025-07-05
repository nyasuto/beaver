package pages

import (
	"fmt"
	"strings"
	"time"

	"github.com/nyasuto/beaver/pkg/components"
)

// IssuesPageGenerator generates the issues dashboard page using shared components
type IssuesPageGenerator struct {
	config IssuesPageConfig
}

// IssuesPageConfig represents configuration for issues page generation
type IssuesPageConfig struct {
	Repository   string
	GeneratedAt  time.Time
	BaseURL      string
	TotalIssues  int
	OpenIssues   int
	ClosedIssues int
	HealthScore  float64
	Issues       []IssueInfo
}

// IssueInfo represents information about a single issue
type IssueInfo struct {
	Number       int
	Title        string
	Body         string
	State        string
	Labels       []string
	Author       string
	CreatedAt    time.Time
	UpdatedAt    time.Time
	HTMLURL      string
	UrgencyScore int
	Category     string
}

// NewIssuesPageGenerator creates a new issues page generator
func NewIssuesPageGenerator(config IssuesPageConfig) *IssuesPageGenerator {
	if config.BaseURL == "" {
		config.BaseURL = "/beaver/"
	}
	if config.GeneratedAt.IsZero() {
		config.GeneratedAt = time.Now()
	}
	return &IssuesPageGenerator{config: config}
}

// GenerateIssuesPage generates the complete issues page HTML using shared components
func (ipg *IssuesPageGenerator) GenerateIssuesPage() string {
	headerGen := components.NewHeaderGenerator()
	statCardGen := components.NewStatCardGenerator()
	cardGen := components.NewCardGenerator()

	// Generate navigation header
	headerHTML := headerGen.GenerateHeader(components.HeaderOptions{
		CurrentPage: "issues",
		BaseURL:     ipg.config.BaseURL,
	})

	// Generate repository info banner
	repoBannerHTML := ipg.generateRepositoryBanner(cardGen)

	// Generate statistics dashboard
	statsHTML := ipg.generateStatsDashboard(statCardGen)

	// Generate search & filter section
	searchFilterHTML := ipg.generateSearchFilterSection(cardGen)

	// Generate issues list
	issuesListHTML := ipg.generateIssuesList(cardGen)

	// Generate feature information
	featureInfoHTML := ipg.generateFeatureInfo(cardGen)

	// Generate main content
	mainContentHTML := ipg.generateMainContent(repoBannerHTML, statsHTML, searchFilterHTML, issuesListHTML, featureInfoHTML)

	// Build complete HTML
	return ipg.buildCompleteHTML(headerGen, statCardGen, cardGen, headerHTML, mainContentHTML)
}

// generateRepositoryBanner generates the repository information banner
func (ipg *IssuesPageGenerator) generateRepositoryBanner(cardGen *components.CardGenerator) string {
	bannerContent := fmt.Sprintf(`
		<div class="flex items-center justify-between">
			<div class="flex items-center space-x-3">
				<div class="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
					<span class="text-white font-bold">🦫</span>
				</div>
				<div>
					<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">%s</h2>
					<p class="text-sm text-gray-600 dark:text-gray-400">Last updated: %s</p>
				</div>
			</div>
			<div class="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
				<div class="text-center">
					<div class="font-bold text-blue-600">%d</div>
					<div>Total Issues</div>
				</div>
				<div class="text-center">
					<div class="font-bold text-green-600">%d</div>
					<div>Open</div>
				</div>
				<div class="text-center">
					<div class="font-bold text-gray-600">%d</div>
					<div>Closed</div>
				</div>
			</div>
		</div>`,
		ipg.config.Repository,
		ipg.config.GeneratedAt.Format("2006/1/2 15:04:05"),
		ipg.config.TotalIssues,
		ipg.config.OpenIssues,
		ipg.config.ClosedIssues,
	)

	data := components.CardData{
		Content: bannerContent,
	}

	options := components.CardOptions{
		CSSClasses: "bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800",
		ShowShadow: false,
		Rounded:    true,
		DarkMode:   true,
	}

	return cardGen.GenerateCard(data, options)
}

// generateStatsDashboard generates the interactive dashboard statistics
func (ipg *IssuesPageGenerator) generateStatsDashboard(statCardGen *components.StatCardGenerator) string {
	healthGrade := ipg.calculateHealthGrade(ipg.config.HealthScore)
	openPercentage := ipg.calculateOpenPercentage()
	closedPercentage := ipg.calculateClosedPercentage()

	cards := []components.StatCardData{
		{
			Value:     fmt.Sprintf("%d", ipg.config.TotalIssues),
			Label:     "Total Issues",
			ValueType: "number",
		},
		{
			Value:     fmt.Sprintf("%d", ipg.config.OpenIssues),
			Label:     "Open Issues",
			ValueType: "number",
		},
		{
			Value:     fmt.Sprintf("%d", ipg.config.ClosedIssues),
			Label:     "Closed Issues",
			ValueType: "number",
		},
		{
			Value:     fmt.Sprintf("%.0f%%", ipg.config.HealthScore),
			Label:     "Health Score",
			Grade:     healthGrade,
			ValueType: "percentage",
		},
	}

	options := components.StatCardOptions{
		ShowGrade: true,
		DarkMode:  true,
	}

	// Add extra info for enhanced dashboard
	statsGrid := statCardGen.GenerateStatsGrid(cards, options)

	// Enhance with additional info
	enhancedStats := strings.Replace(statsGrid,
		fmt.Sprintf("%d</div>\n                <div class=\"stat-label\">Open Issues</div>", ipg.config.OpenIssues),
		fmt.Sprintf("%d</div>\n                <div class=\"stat-label\">Open Issues</div>\n                <div class=\"text-xs text-gray-500 mt-1\">%.0f%% of filtered</div>", ipg.config.OpenIssues, openPercentage), 1)

	enhancedStats = strings.Replace(enhancedStats,
		fmt.Sprintf("%d</div>\n                <div class=\"stat-label\">Closed Issues</div>", ipg.config.ClosedIssues),
		fmt.Sprintf("%d</div>\n                <div class=\"stat-label\">Closed Issues</div>\n                <div class=\"text-xs text-gray-500 mt-1\">%.0f%% resolved</div>", ipg.config.ClosedIssues, closedPercentage), 1)

	healthIcon := ipg.getHealthIcon(ipg.config.HealthScore)
	enhancedStats = strings.Replace(enhancedStats,
		fmt.Sprintf("%.0f%%</div>\n                <div class=\"stat-label\">Health Score</div>", ipg.config.HealthScore),
		fmt.Sprintf("%.0f%%</div>\n                <div class=\"stat-label\">Health Score</div>\n                <div class=\"text-xs text-gray-500 mt-1\">%s</div>", ipg.config.HealthScore, healthIcon), 1)

	return enhancedStats
}

// generateSearchFilterSection generates the search and filter interface
func (ipg *IssuesPageGenerator) generateSearchFilterSection(cardGen *components.CardGenerator) string {
	searchContent := fmt.Sprintf(`
		<div class="flex items-center justify-between mb-4">
			<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">🔍 Search & Filter Issues</h3>
			<div class="flex items-center space-x-2">
				<span class="text-sm text-gray-500 dark:text-gray-400">%d / %d issues</span>
				<button class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors">▼</button>
			</div>
		</div>

		<div class="mb-4">
			<div class="relative">
				<input type="text" placeholder="Search issues by title or content..." 
					class="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
					value=""/>
				<svg class="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
				</svg>
			</div>
		</div>

		<div class="flex flex-wrap gap-2 mb-4">
			<select class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
				<option value="all" selected="">All States</option>
				<option value="open">Open Only</option>
				<option value="closed">Closed Only</option>
			</select>
			<select class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
				<option value="all" selected="">All Urgency</option>
				<option value="high">High (50+)</option>
				<option value="medium">Medium (20-49)</option>
				<option value="low">Low (0-19)</option>
			</select>
			<select class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
				<option value="created-desc" selected="">Latest First</option>
				<option value="created-asc">Oldest First</option>
				<option value="urgency-desc">High Urgency First</option>
				<option value="urgency-asc">Low Urgency First</option>
				<option value="title-asc">Title A-Z</option>
				<option value="title-desc">Title Z-A</option>
			</select>
		</div>`,
		len(ipg.config.Issues),
		ipg.config.TotalIssues,
	)

	data := components.CardData{
		Content: searchContent,
	}

	options := components.CardOptions{
		CSSClasses: "opacity-75", // Indicate this is interactive but currently static
		ShowShadow: true,
		Rounded:    true,
		DarkMode:   true,
	}

	return cardGen.GenerateCard(data, options)
}

// generateIssuesList generates the list of issues or empty state
func (ipg *IssuesPageGenerator) generateIssuesList(cardGen *components.CardGenerator) string {
	var listContent string

	if len(ipg.config.Issues) == 0 {
		listContent = `
			<div class="text-center">
				<div class="text-6xl mb-4">🔍</div>
				<h3 class="text-xl font-bold mb-2">No Issues Found</h3>
				<p class="text-gray-600 dark:text-gray-400">Try adjusting your search or filter criteria.</p>
			</div>`
	} else {
		var issuesHTML strings.Builder
		for _, issue := range ipg.config.Issues {
			issuesHTML.WriteString(ipg.generateIssueCard(issue))
		}
		listContent = issuesHTML.String()
	}

	data := components.CardData{
		Content: listContent,
	}

	options := components.CardOptions{
		ShowShadow: true,
		Rounded:    true,
		DarkMode:   true,
	}

	return cardGen.GenerateCard(data, options)
}

// generateIssueCard generates HTML for a single issue card
func (ipg *IssuesPageGenerator) generateIssueCard(issue IssueInfo) string {
	labelsHTML := ""
	for _, label := range issue.Labels {
		labelsHTML += fmt.Sprintf(`<span class="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 rounded-full">%s</span>`, label)
	}

	stateColor := "text-green-600"
	if issue.State == "closed" {
		stateColor = "text-gray-600"
	}

	return fmt.Sprintf(`
		<div class="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0">
			<div class="flex items-start justify-between mb-2">
				<h4 class="font-semibold text-gray-900 dark:text-gray-100">
					<a href="%s" class="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
						#%d %s
					</a>
				</h4>
				<span class="text-sm %s font-medium">%s</span>
			</div>
			<p class="text-sm text-gray-600 dark:text-gray-400 mb-2">%s</p>
			<div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
				<div class="flex items-center space-x-2">
					<span>by %s</span>
					<span>•</span>
					<span>%s</span>
					%s
				</div>
				<span class="urgency-score">Urgency: %d</span>
			</div>
		</div>`,
		issue.HTMLURL,
		issue.Number,
		issue.Title,
		stateColor,
		issue.State,
		ipg.truncateText(issue.Body, 100),
		issue.Author,
		issue.CreatedAt.Format("2006-01-02"),
		labelsHTML,
		issue.UrgencyScore,
	)
}

// generateFeatureInfo generates the feature information section
func (ipg *IssuesPageGenerator) generateFeatureInfo(cardGen *components.CardGenerator) string {
	featureContent := `
		<h3 class="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
			🚀 Phase 2 Interactive Features
		</h3>
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			<div class="space-y-2">
				<h4 class="font-semibold text-blue-600 dark:text-blue-400">🔍 Advanced Search</h4>
				<ul class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
					<li>• Real-time text search</li>
					<li>• Search through titles and content</li>
					<li>• Case-insensitive matching</li>
					<li>• Instant results update</li>
				</ul>
			</div>
			<div class="space-y-2">
				<h4 class="font-semibold text-green-600 dark:text-green-400">🏷️ Smart Filtering</h4>
				<ul class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
					<li>• Filter by issue state</li>
					<li>• Urgency-based filtering</li>
					<li>• Category-based grouping</li>
					<li>• Custom filter combinations</li>
				</ul>
			</div>
			<div class="space-y-2">
				<h4 class="font-semibold text-purple-600 dark:text-purple-400">📈 Advanced Analytics</h4>
				<ul class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
					<li>• Interactive trend charts</li>
					<li>• Resolution time analysis</li>
					<li>• Category distribution</li>
					<li>• Performance metrics</li>
				</ul>
			</div>
		</div>`

	data := components.CardData{
		Content: featureContent,
	}

	options := components.CardOptions{
		ShowShadow: true,
		Rounded:    true,
		DarkMode:   true,
	}

	return cardGen.GenerateCard(data, options)
}

// generateMainContent generates the main content section
func (ipg *IssuesPageGenerator) generateMainContent(repoBannerHTML, statsHTML, searchFilterHTML, issuesListHTML, featureInfoHTML string) string {
	return fmt.Sprintf(`
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<!-- Hero Section -->
			<div class="text-center mb-8">
				<h1 class="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
					🦫 Interactive Issues Dashboard
				</h1>
				<p class="text-lg text-gray-600 dark:text-gray-300">
					Advanced search, filtering, and analytics for GitHub Issues
				</p>
			</div>

			<!-- Repository Info Banner -->
			%s

			<!-- Interactive Dashboard Statistics -->
			%s

			<!-- Search & Filter Section -->
			%s

			<!-- Issues List -->
			%s

			<!-- Feature Information -->
			%s
		</div>`,
		repoBannerHTML,
		statsHTML,
		searchFilterHTML,
		issuesListHTML,
		featureInfoHTML,
	)
}

// buildCompleteHTML builds the complete HTML document
func (ipg *IssuesPageGenerator) buildCompleteHTML(headerGen *components.HeaderGenerator, statCardGen *components.StatCardGenerator, cardGen *components.CardGenerator, headerHTML, mainContentHTML string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="ja">
<head>
	<meta charset="UTF-8">
	<meta name="description" content="Interactive GitHub Issues Dashboard with Search and Analytics">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="icon" type="image/svg+xml" href="/beaver/favicon.svg">
	<title>🦫 Beaver Issues - Interactive Dashboard</title>
	
	<!-- Performance optimizations -->
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	
	<!-- SEO meta tags -->
	<meta property="og:title" content="🦫 Beaver Issues - Interactive Dashboard">
	<meta property="og:description" content="Interactive GitHub Issues Dashboard with Search and Analytics">
	<meta property="og:type" content="website">
	<meta name="twitter:card" content="summary_large_image">
	<meta name="twitter:title" content="🦫 Beaver Issues - Interactive Dashboard">
	<meta name="twitter:description" content="Interactive GitHub Issues Dashboard with Search and Analytics">
	
	%s
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}
		
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			background: #f9fafb;
			color: #111827;
			line-height: 1.6;
		}
		
		@media (prefers-color-scheme: dark) {
			body {
				background: #111827;
				color: #f9fafb;
			}
		}
		
		%s
		%s
		%s
		
		.min-h-screen {
			min-height: 100vh;
		}
		
		.flex {
			display: flex;
		}
		
		.flex-col {
			flex-direction: column;
		}
		
		.flex-1 {
			flex: 1;
		}
		
		.bg-gradient-to-r {
			background: linear-gradient(to right, var(--tw-gradient-stops));
		}
		
		.from-blue-600 {
			--tw-gradient-from: #2563eb;
			--tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgb(37 99 235 / 0));
		}
		
		.to-purple-600 {
			--tw-gradient-to: #9333ea;
		}
		
		.bg-clip-text {
			-webkit-background-clip: text;
			background-clip: text;
			-webkit-text-fill-color: transparent;
		}
		
		.text-transparent {
			color: transparent;
		}
		
		.footer {
			text-align: center;
			padding: 2rem;
			color: #6b7280;
			border-top: 1px solid #e5e7eb;
			margin-top: 3rem;
		}
		
		@media (prefers-color-scheme: dark) {
			.footer {
				color: #9ca3af;
				border-top-color: #374151;
			}
		}
		
		.urgency-score {
			font-weight: 600;
		}
	</style>
</head>
<body class="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
	<div class="min-h-screen flex flex-col">
		%s
		
		<main class="flex-1">
			%s
		</main>
		
		<footer class="footer">
			<p>🦫 Beaver - AI知識ダム | Powered by Astro + Go</p>
		</footer>
	</div>
</body>
</html>`,
		headerGen.GetTailwindCSSCDN(),
		headerGen.GetHeaderCSS(),
		statCardGen.GetStatCardCSS(),
		cardGen.GetCardCSS(),
		headerHTML,
		mainContentHTML,
	)
}

// Helper methods
func (ipg *IssuesPageGenerator) calculateHealthGrade(healthScore float64) string {
	if healthScore >= 90 {
		return "A"
	} else if healthScore >= 80 {
		return "B"
	} else if healthScore >= 70 {
		return "C"
	} else if healthScore >= 50 {
		return "D"
	}
	return "F"
}

func (ipg *IssuesPageGenerator) calculateOpenPercentage() float64 {
	if ipg.config.TotalIssues == 0 {
		return 0
	}
	return float64(ipg.config.OpenIssues) / float64(ipg.config.TotalIssues) * 100
}

func (ipg *IssuesPageGenerator) calculateClosedPercentage() float64 {
	if ipg.config.TotalIssues == 0 {
		return 0
	}
	return float64(ipg.config.ClosedIssues) / float64(ipg.config.TotalIssues) * 100
}

func (ipg *IssuesPageGenerator) getHealthIcon(healthScore float64) string {
	if healthScore >= 80 {
		return "🟢"
	} else if healthScore >= 60 {
		return "🟡"
	} else if healthScore >= 40 {
		return "🟠"
	}
	return "🔴"
}

func (ipg *IssuesPageGenerator) truncateText(text string, maxLength int) string {
	if len(text) <= maxLength {
		return text
	}
	return text[:maxLength] + "..."
}

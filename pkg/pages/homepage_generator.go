package pages

import (
	"fmt"
	"strings"
	"time"

	"github.com/nyasuto/beaver/pkg/components"
)

// HomepageGenerator generates the main homepage using shared components
type HomepageGenerator struct {
	config HomePageConfig
}

// HomePageConfig represents configuration for homepage generation
type HomePageConfig struct {
	ProjectName  string
	Repository   string
	GeneratedAt  time.Time
	Version      string
	Build        string
	BaseURL      string
	TotalIssues  int
	OpenIssues   int
	ClosedIssues int
	HealthScore  float64
}

// NewHomepageGenerator creates a new homepage generator
func NewHomepageGenerator(config HomePageConfig) *HomepageGenerator {
	if config.BaseURL == "" {
		config.BaseURL = "/beaver/"
	}
	if config.GeneratedAt.IsZero() {
		config.GeneratedAt = time.Now()
	}
	return &HomepageGenerator{config: config}
}

// GenerateHomepage generates the complete homepage HTML using shared components
func (hg *HomepageGenerator) GenerateHomepage() string {
	headerGen := components.NewHeaderGenerator()
	statCardGen := components.NewStatCardGenerator()
	cardGen := components.NewCardGenerator()

	// Generate navigation header
	headerHTML := headerGen.GenerateHeader(components.HeaderOptions{
		CurrentPage: "home",
		BaseURL:     hg.config.BaseURL,
	})

	// Generate statistics section using StatCard components
	statsHTML := hg.generateStatsSection(statCardGen)

	// Generate repository info card
	repoInfoHTML := hg.generateRepositoryInfoCard(cardGen)

	// Generate feature information card
	featureInfoHTML := hg.generateFeatureInfoCard(cardGen)

	// Generate main content
	mainContentHTML := hg.generateMainContent(statsHTML, repoInfoHTML, featureInfoHTML)

	// Build complete HTML
	return hg.buildCompleteHTML(headerGen, statCardGen, cardGen, headerHTML, mainContentHTML)
}

// generateStatsSection generates the statistics cards section
func (hg *HomepageGenerator) generateStatsSection(statCardGen *components.StatCardGenerator) string {
	healthGrade := hg.calculateHealthGrade(hg.config.HealthScore)

	cards := []components.StatCardData{
		{
			Value:     fmt.Sprintf("%d", hg.config.TotalIssues),
			Label:     "Total Issues",
			ValueType: "number",
		},
		{
			Value:     fmt.Sprintf("%d", hg.config.OpenIssues),
			Label:     "Open",
			ValueType: "number",
		},
		{
			Value:     fmt.Sprintf("%d", hg.config.ClosedIssues),
			Label:     "Closed",
			ValueType: "number",
		},
		{
			Value:     fmt.Sprintf("%.0f%%", hg.config.HealthScore),
			Label:     "Health Score",
			Grade:     healthGrade,
			ValueType: "percentage",
		},
	}

	options := components.StatCardOptions{
		ShowGrade: true,
		DarkMode:  true,
	}

	return statCardGen.GenerateStatsGrid(cards, options)
}

// generateRepositoryInfoCard generates the repository information card
func (hg *HomepageGenerator) generateRepositoryInfoCard(cardGen *components.CardGenerator) string {
	repoInfoContent := fmt.Sprintf(`
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
			<div>
				<span class="font-medium">Generated:</span> %s
			</div>
			<div>
				<span class="font-medium">Version:</span> %s
			</div>
			<div>
				<span class="font-medium">Build:</span> %s
			</div>
		</div>`,
		hg.config.GeneratedAt.Format("2006/1/2 15:04:05"),
		hg.config.Version,
		hg.config.Build,
	)

	data := components.CardData{
		Title:      fmt.Sprintf("📊 Repository: %s", hg.config.Repository),
		Content:    repoInfoContent,
		HeaderIcon: "📊",
	}

	options := components.CardOptions{
		HeaderStyle: "default",
		ShowShadow:  true,
		Rounded:     true,
		DarkMode:    true,
	}

	return cardGen.GenerateCard(data, options)
}

// generateFeatureInfoCard generates the feature information card
func (hg *HomepageGenerator) generateFeatureInfoCard(cardGen *components.CardGenerator) string {
	var featureContent strings.Builder

	if hg.config.TotalIssues == 0 {
		// No issues found state
		featureContent.WriteString(`
			<div class="text-center">
				<div class="text-6xl mb-4">🦫</div>
				<h2 class="text-2xl font-bold mb-4">No Issues Found</h2>
				<p class="text-gray-600 dark:text-gray-400 mb-6">
					Run the Beaver build command to fetch and process GitHub Issues.
				</p>
				<div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 font-mono text-sm">
					beaver build --astro-export
				</div>
			</div>`)
	} else {
		// Show quick insights based on data
		insight := hg.generateQuickInsight()
		featureContent.WriteString(fmt.Sprintf(`
			<div class="mb-6 text-center">
				<a href="%sissues" class="inline-flex items-center px-4 py-2 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
					🔍 Advanced Search & Analytics →
				</a>
			</div>
			<div class="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
				<div class="text-sm text-blue-800 dark:text-blue-200">
					<span class="font-medium">💡 Quick Insight:</span> %s
				</div>
			</div>`, hg.config.BaseURL, insight))
	}

	data := components.CardData{
		Title:   "Recent Issues with Enhanced Components",
		Content: featureContent.String(),
	}

	options := components.CardOptions{
		HeaderStyle: "default",
		ShowShadow:  true,
		Rounded:     true,
		DarkMode:    true,
	}

	return cardGen.GenerateCard(data, options)
}

// generateMainContent generates the main content section
func (hg *HomepageGenerator) generateMainContent(statsHTML, repoInfoHTML, featureInfoHTML string) string {
	// Generate health score progress bar
	healthStatusText := hg.getHealthStatusText(hg.config.HealthScore)
	resolutionRate := hg.calculateResolutionRate()

	return fmt.Sprintf(`
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<!-- Hero Section -->
			<div class="text-center mb-12">
				<h1 class="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
					🦫 Beaver AI知識ダム
				</h1>
				<p class="text-xl text-gray-600 dark:text-gray-300 mb-8">
					GitHub Issuesを永続的な知識ベースに変換
				</p>
				<div class="mb-6 text-center">
					<a href="%sissues" class="inline-flex items-center px-4 py-2 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
						🔍 Advanced Search & Analytics →
					</a>
				</div>
			</div>

			<!-- Enhanced Statistics Dashboard -->
			<div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
				<div class="flex items-center justify-between mb-6">
					<h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">📊 Project Statistics</h2>
				</div>

				%s

				<!-- Health Score Visualization -->
				<div class="mb-6">
					<div class="flex items-center justify-between mb-2">
						<span class="text-sm font-medium text-gray-700 dark:text-gray-300">Project Health</span>
						<span class="text-sm text-gray-500 dark:text-gray-400">%s</span>
					</div>
					<div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
						<div class="h-2 rounded-full transition-all duration-300 %s" style="width: %.0f%%"></div>
					</div>
				</div>

				<!-- Resolution Rate -->
				<div class="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mb-4">
					<span class="text-sm font-medium text-gray-700 dark:text-gray-300">Resolution Rate</span>
					<span class="text-sm font-bold text-gray-900 dark:text-gray-100">%.0f%%</span>
				</div>
			</div>

			<!-- Repository Info -->
			%s

			<!-- Recent Issues -->
			%s
		</div>`,
		hg.config.BaseURL,
		statsHTML,
		healthStatusText,
		hg.getHealthColorClass(hg.config.HealthScore),
		hg.config.HealthScore,
		resolutionRate,
		repoInfoHTML,
		featureInfoHTML,
	)
}

// buildCompleteHTML builds the complete HTML document
func (hg *HomepageGenerator) buildCompleteHTML(headerGen *components.HeaderGenerator, statCardGen *components.StatCardGenerator, cardGen *components.CardGenerator, headerHTML, mainContentHTML string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="ja">
<head>
	<meta charset="UTF-8">
	<meta name="description" content="GitHub Issuesを構造化された知識ベースに変換">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="icon" type="image/svg+xml" href="/beaver/favicon.svg">
	<title>🦫 Beaver - AI知識ダム</title>
	
	<!-- Performance optimizations -->
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	
	<!-- SEO meta tags -->
	<meta property="og:title" content="🦫 Beaver - AI知識ダム">
	<meta property="og:description" content="GitHub Issuesを構造化された知識ベースに変換">
	<meta property="og:type" content="website">
	<meta name="twitter:card" content="summary_large_image">
	<meta name="twitter:title" content="🦫 Beaver - AI知識ダム">
	<meta name="twitter:description" content="GitHub Issuesを構造化された知識ベースに変換">
	
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
func (hg *HomepageGenerator) calculateHealthGrade(healthScore float64) string {
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

func (hg *HomepageGenerator) getHealthStatusText(healthScore float64) string {
	if healthScore >= 80 {
		return "🟢 Excellent"
	} else if healthScore >= 60 {
		return "🟡 Good"
	} else if healthScore >= 40 {
		return "🟠 Moderate"
	}
	return "🔴 Needs Attention"
}

func (hg *HomepageGenerator) getHealthColorClass(healthScore float64) string {
	if healthScore >= 80 {
		return "bg-green-500"
	} else if healthScore >= 60 {
		return "bg-yellow-500"
	} else if healthScore >= 40 {
		return "bg-orange-500"
	}
	return "bg-red-500"
}

func (hg *HomepageGenerator) calculateResolutionRate() float64 {
	total := hg.config.TotalIssues
	if total == 0 {
		return 0
	}
	return float64(hg.config.ClosedIssues) / float64(total) * 100
}

func (hg *HomepageGenerator) generateQuickInsight() string {
	total := hg.config.TotalIssues
	open := hg.config.OpenIssues
	healthScore := hg.config.HealthScore

	if total == 0 {
		return "Start by adding issues to track your project's progress."
	}

	if healthScore >= 80 {
		return "Project is in excellent health. Keep up the great work!"
	}

	if open > total/2 {
		return "Many issues are still open. Consider prioritizing issue resolution."
	}

	if healthScore < 50 {
		return "Attention needed. Consider prioritizing issue management."
	}

	return "Project is progressing well. Monitor trends for continuous improvement."
}

package components

// HeaderOptions represents configuration options for the header banner
type HeaderOptions struct {
	// Current page name for highlighting in navigation
	CurrentPage string
	// Base URL for navigation links (e.g., "../" for coverage dashboard)
	BaseURL string
	// Additional navigation items
	ExtraNavItems []NavItem
}

// NavItem represents a navigation menu item
type NavItem struct {
	Label      string
	URL        string
	IsExternal bool
}

// HeaderGenerator generates common header banners for all pages
type HeaderGenerator struct{}

// NewHeaderGenerator creates a new header generator
func NewHeaderGenerator() *HeaderGenerator {
	return &HeaderGenerator{}
}

// GenerateHeader generates the common header banner HTML
func (hg *HeaderGenerator) GenerateHeader(options HeaderOptions) string {
	if options.BaseURL == "" {
		options.BaseURL = "../"
	}

	// Build navigation items
	navItems := hg.buildNavigationItems(options)

	return `
        <!-- Header Banner (共通コンポーネント) -->
        <header class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center py-4">
                    <div class="flex items-center space-x-3">
                        <div class="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                            <span class="text-white font-bold text-sm">🦫</span>
                        </div>
                        <h1 class="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Beaver</h1>
                    </div>
                    <nav class="flex items-center space-x-4">` + navItems + `
                    </nav>
                </div>
            </div>
        </header>`
}

// buildNavigationItems builds the navigation items HTML matching actual site design
func (hg *HeaderGenerator) buildNavigationItems(options HeaderOptions) string {
	var navHTML string

	// Determine the base paths based on current location
	basePath := options.BaseURL
	switch basePath {
	case "../", "", "./":
		// Coverage dashboard case or same level case
		basePath = "/beaver/"
	}

	// Standard navigation items (matching actual site)
	standardItems := []struct {
		label string
		url   string
		page  string
	}{
		{"ホーム", basePath, "home"},
		{"Issues", basePath + "issues", "issues"},
	}

	// Add standard items (all use same styling as actual site - no active state distinction)
	for _, item := range standardItems {
		navHTML += `
                        <a href="` + item.url + `" class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">` + item.label + `</a>`
	}

	// Add coverage link only if not the main home/issues pages
	if options.CurrentPage == "coverage" {
		navHTML += `
                        <a href="` + options.BaseURL + `coverage/" class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">カバレッジ</a>`
	}

	// Add extra navigation items
	for _, item := range options.ExtraNavItems {
		target := ""
		if item.IsExternal {
			target = ` target="_blank"`
		}
		navHTML += `
                        <a href="` + item.URL + `" class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"` + target + `>` + item.Label + `</a>`
	}

	return navHTML
}

// GetTailwindCSSCDN returns the Tailwind CSS CDN script tag
func (hg *HeaderGenerator) GetTailwindCSSCDN() string {
	return `<script src="https://cdn.tailwindcss.com"></script>`
}

// GetHeaderCSS returns minimal CSS for header compatibility (Tailwind handles most styling)
func (hg *HeaderGenerator) GetHeaderCSS() string {
	return `
        /* Essential compatibility styles for older browsers */
        .bg-clip-text {
            -webkit-background-clip: text;
            background-clip: text;
        }`
}

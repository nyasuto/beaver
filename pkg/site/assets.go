package site

import (
	"fmt"
	"os"
	"path/filepath"
)

// AssetManager handles CSS, JS, and other static assets
type AssetManager struct {
	outputDir string
}

// NewAssetManager creates a new asset manager
func NewAssetManager() *AssetManager {
	return &AssetManager{}
}

// SetOutputDir sets the output directory for assets
func (am *AssetManager) SetOutputDir(dir string) {
	am.outputDir = dir
}

// generateAssets generates all CSS and JavaScript assets
func (g *HTMLGenerator) generateAssets() error {
	g.assets.SetOutputDir(g.config.OutputDir)

	// Create assets directory
	assetsDir := filepath.Join(g.config.OutputDir, "assets")
	if err := os.MkdirAll(filepath.Join(assetsDir, "css"), 0755); err != nil {
		return fmt.Errorf("failed to create assets/css directory: %w", err)
	}
	if err := os.MkdirAll(filepath.Join(assetsDir, "js"), 0755); err != nil {
		return fmt.Errorf("failed to create assets/js directory: %w", err)
	}
	if err := os.MkdirAll(filepath.Join(assetsDir, "images"), 0755); err != nil {
		return fmt.Errorf("failed to create assets/images directory: %w", err)
	}

	// Generate main CSS file
	if err := g.generateMainCSS(); err != nil {
		return fmt.Errorf("failed to generate main CSS: %w", err)
	}

	// Generate main JavaScript file
	if err := g.generateMainJS(); err != nil {
		return fmt.Errorf("failed to generate main JS: %w", err)
	}

	// Copy/generate favicon
	if err := g.generateFavicon(); err != nil {
		return fmt.Errorf("failed to generate favicon: %w", err)
	}

	return nil
}

// generateMainCSS creates the main stylesheet with Beaver theme
func (g *HTMLGenerator) generateMainCSS() error {
	css := g.buildBeaverCSS()

	outputPath := filepath.Join(g.config.OutputDir, "assets", "css", "style.css")
	if err := os.WriteFile(outputPath, []byte(css), 0600); err != nil {
		return fmt.Errorf("failed to write CSS file: %w", err)
	}

	return nil
}

// buildBeaverCSS generates the complete Beaver theme CSS
func (g *HTMLGenerator) buildBeaverCSS() string {
	// Try multiple possible paths for the CSS file
	possiblePaths := []string{
		filepath.Join("pkg", "site", "assets", "beaver-theme.css"),
		filepath.Join("assets", "beaver-theme.css"),
		"beaver-theme.css",
		filepath.Join("..", "..", "assets", "beaver-theme.css"),
	}

	var cssContent []byte
	var err error

	for _, cssPath := range possiblePaths {
		cssContent, err = os.ReadFile(cssPath)
		if err == nil {
			break
		}
	}

	if err != nil {
		// If external CSS file doesn't exist in any location, return basic CSS as fallback
		return fmt.Sprintf(`/* Beaver Basic Theme - Fallback */
:root {
  --beaver-primary: %s;
  --beaver-secondary: %s;
  --beaver-accent: %s;
  --beaver-text: %s;
  --beaver-background: %s;
}

body {
  font-family: %s;
  color: var(--beaver-text);
  background-color: var(--beaver-background);
  line-height: 1.7;
  margin: 0;
  padding: 0;
}

h1, h2, h3, h4, h5, h6 {
  color: var(--beaver-primary);
  font-family: %s;
}

a {
  color: var(--beaver-secondary);
  text-decoration: none;
}

a:hover {
  color: var(--beaver-primary);
  text-decoration: underline;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.beaver-layout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 2rem;
  margin: 2rem 0;
}

.beaver-card {
  background: white;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}`,
			g.theme.PrimaryColor,
			g.theme.SecondaryColor,
			g.theme.AccentColor,
			g.theme.TextColor,
			g.theme.BackgroundColor,
			g.theme.FontFamily,
			g.theme.HeadingFont,
		)
	}

	return string(cssContent)
}

// generateMainJS creates the main JavaScript file
func (g *HTMLGenerator) generateMainJS() error {
	js := `// Beaver Knowledge Base - Main JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize navigation
    initNavigation();
    
    // Initialize card animations
    initCardAnimations();
    
    // Initialize search if available
    initSearch();
    
    // Initialize service worker if supported
    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registered:', registration.scope);
            })
            .catch(function(error) {
                console.log('ServiceWorker registration failed:', error);
            });
    }
});

function initNavigation() {
    // Highlight current page in navigation
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav a');
    
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath || 
            (currentPath === '/' && link.getAttribute('href') === '/index.html')) {
            link.classList.add('active');
        }
    });
}

function initCardAnimations() {
    // Add fade-in animation to cards when they come into view
    const cards = document.querySelectorAll('.beaver-card');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-up');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    cards.forEach(card => {
        observer.observe(card);
    });
}

function initSearch() {
    // Simple search functionality (can be enhanced)
    const searchInput = document.querySelector('#search');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', function(e) {
        const query = e.target.value.toLowerCase();
        const searchableElements = document.querySelectorAll('[data-searchable]');
        
        searchableElements.forEach(element => {
            const text = element.textContent.toLowerCase();
            const isVisible = text.includes(query);
            element.style.display = isVisible ? '' : 'none';
        });
    });
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('クリップボードにコピーしました');
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

function showNotification(message, type = 'info') {
    // Simple notification system
    const notification = document.createElement('div');
    notification.className = 'notification notification-' + type;
    notification.textContent = message;
    notification.style.cssText = ` + "`" + `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--beaver-primary);
        color: white;
        padding: 1rem;
        border-radius: 8px;
        box-shadow: 0 4px 20px var(--beaver-shadow);
        z-index: 1000;
        animation: slideInRight 0.3s ease;
    ` + "`" + `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Add CSS for notification animations
const style = document.createElement('style');
style.textContent = ` + "`" + `
@keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

@keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
}
` + "`" + `;
document.head.appendChild(style);
`

	outputPath := filepath.Join(g.config.OutputDir, "assets", "js", "main.js")
	if err := os.WriteFile(outputPath, []byte(js), 0600); err != nil {
		return fmt.Errorf("failed to write JS file: %w", err)
	}

	return nil
}

// generateFavicon creates a simple text-based favicon
func (g *HTMLGenerator) generateFavicon() error {
	// For now, we'll create a simple robots.txt
	// A proper favicon would need image generation libraries
	faviconContent := `<!-- Favicon placeholder -->
<!-- A proper favicon.ico should be generated here -->`

	outputPath := filepath.Join(g.config.OutputDir, "favicon.html")
	if err := os.WriteFile(outputPath, []byte(faviconContent), 0600); err != nil {
		return fmt.Errorf("failed to write favicon placeholder: %w", err)
	}

	return nil
}

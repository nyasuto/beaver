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

	// Generate PWA manifest
	if err := g.generateManifest(); err != nil {
		return fmt.Errorf("failed to generate PWA manifest: %w", err)
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
		filepath.Join("pkg", "site", "assets", "style.css"),
		filepath.Join("assets", "style.css"),
		"style.css",
		filepath.Join("..", "..", "assets", "style.css"),
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
	js := g.buildBeaverJS()

	outputPath := filepath.Join(g.config.OutputDir, "assets", "js", "main.js")
	if err := os.WriteFile(outputPath, []byte(js), 0600); err != nil {
		return fmt.Errorf("failed to write JS file: %w", err)
	}

	return nil
}

// buildBeaverJS generates the complete Beaver JavaScript
func (g *HTMLGenerator) buildBeaverJS() string {
	// Try multiple possible paths for the JS file
	possiblePaths := []string{
		filepath.Join("pkg", "site", "assets", "main.js"),
		filepath.Join("assets", "main.js"),
		"main.js",
		filepath.Join("..", "..", "assets", "main.js"),
	}

	var jsContent []byte
	var err error

	for _, jsPath := range possiblePaths {
		jsContent, err = os.ReadFile(jsPath)
		if err == nil {
			break
		}
	}

	if err != nil {
		// If external JS file doesn't exist in any location, return basic JS as fallback
		return `// Beaver Knowledge Base - Basic JavaScript Fallback

document.addEventListener('DOMContentLoaded', function() {
    console.log('Beaver Knowledge Base loaded');
    
    // Basic navigation highlighting
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav a');
    
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath || 
            (currentPath === '/' && link.getAttribute('href') === '/index.html')) {
            link.classList.add('active');
        }
    });
});`
	}

	return string(jsContent)
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

// generateManifest creates a PWA manifest.json file
func (g *HTMLGenerator) generateManifest() error {
	manifest := fmt.Sprintf(`{
  "name": "%s",
  "short_name": "Beaver KB",
  "description": "%s",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "%s",
  "background_color": "%s",
  "icons": [
    {
      "src": "/assets/images/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/assets/images/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "categories": ["productivity", "education"],
  "lang": "%s",
  "dir": "auto",
  "orientation": "any",
  "scope": "/",
  "related_applications": [],
  "prefer_related_applications": false,
  "shortcuts": [
    {
      "name": "課題一覧",
      "short_name": "Issues",
      "description": "プロジェクトの課題一覧を表示",
      "url": "/issues.html",
      "icons": [
        {
          "src": "/assets/images/icon-192.png",
          "sizes": "192x192"
        }
      ]
    },
    {
      "name": "開発戦略",
      "short_name": "Strategy",
      "description": "開発戦略とロードマップを表示",
      "url": "/strategy.html",
      "icons": [
        {
          "src": "/assets/images/icon-192.png",
          "sizes": "192x192"
        }
      ]
    }
  ]
}`,
		g.config.Title,
		g.config.Description,
		g.theme.PrimaryColor,
		g.theme.BackgroundColor,
		g.config.Language,
	)

	outputPath := filepath.Join(g.config.OutputDir, "manifest.json")
	if err := os.WriteFile(outputPath, []byte(manifest), 0600); err != nil {
		return fmt.Errorf("failed to write manifest file: %w", err)
	}

	return nil
}

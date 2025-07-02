package pages

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/nyasuto/beaver/internal/models"
	"github.com/nyasuto/beaver/pkg/wiki"
)

// PublishingMode defines the type of publishing output
type PublishingMode string

const (
	ModeHTML   PublishingMode = "html"   // Direct HTML generation (site)
	ModeJekyll PublishingMode = "jekyll" // Jekyll-based generation (wiki)
)

// UnifiedPagesConfig consolidates all pages configuration
type UnifiedPagesConfig struct {
	// General settings
	Owner      string         `yaml:"owner"`
	Repository string         `yaml:"repository"`
	Mode       PublishingMode `yaml:"mode"`
	OutputDir  string         `yaml:"output_dir"`
	Deploy     bool           `yaml:"deploy"`

	// GitHub Pages settings
	GitHubPages GitHubPagesSettings `yaml:"github_pages"`

	// Site-specific settings (HTML mode)
	Site SiteSettings `yaml:"site"`

	// Wiki-specific settings (Jekyll mode)
	Wiki WikiSettings `yaml:"wiki"`
}

// GitHubPagesSettings contains GitHub Pages deployment configuration
type GitHubPagesSettings struct {
	Branch       string `yaml:"branch"`
	Domain       string `yaml:"domain"`
	BuildDir     string `yaml:"build_dir"`
	BaseURL      string `yaml:"base_url"`
	Analytics    string `yaml:"analytics"`
	EnableSearch bool   `yaml:"enable_search"`
}

// SiteSettings contains HTML site generation configuration
type SiteSettings struct {
	Theme      string                 `yaml:"theme"`
	Title      string                 `yaml:"title"`
	Navigation []NavigationItem       `yaml:"navigation"`
	Features   SiteFeatures           `yaml:"features"`
	Custom     map[string]interface{} `yaml:"custom"`
}

// WikiSettings contains Jekyll wiki generation configuration
type WikiSettings struct {
	Theme       string                 `yaml:"theme"`
	Title       string                 `yaml:"title"`
	Collections map[string]interface{} `yaml:"collections"`
	Plugins     []string               `yaml:"plugins"`
	Custom      map[string]interface{} `yaml:"custom"`
}

// NavigationItem represents a navigation menu item
type NavigationItem struct {
	Name string `yaml:"name"`
	URL  string `yaml:"url"`
	Icon string `yaml:"icon,omitempty"`
}

// SiteFeatures contains site-specific feature flags
type SiteFeatures struct {
	PWA           bool `yaml:"pwa"`
	ServiceWorker bool `yaml:"service_worker"`
	SEO           bool `yaml:"seo"`
	MinifyHTML    bool `yaml:"minify_html"`
}

// UnifiedPagesPublisher provides consolidated publishing functionality
type UnifiedPagesPublisher struct {
	config      *UnifiedPagesConfig
	gitClient   wiki.GitClient
	tempManager *wiki.TempManager
	logger      *slog.Logger
}

// NewUnifiedPagesPublisher creates a new unified pages publisher
func NewUnifiedPagesPublisher(config *UnifiedPagesConfig) (*UnifiedPagesPublisher, error) {
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("invalid configuration: %w", err)
	}

	gitClient, err := wiki.NewCmdGitClient()
	if err != nil {
		return nil, fmt.Errorf("failed to create git client: %w", err)
	}

	tempManager := wiki.NewTempManager("", "beaver-pages")

	return &UnifiedPagesPublisher{
		config:      config,
		gitClient:   gitClient,
		tempManager: tempManager,
		logger:      slog.Default(),
	}, nil
}

// Generate generates pages content based on the configured mode
func (p *UnifiedPagesPublisher) Generate(ctx context.Context, issues []models.Issue) error {
	p.logger.Info("Starting page generation",
		"mode", p.config.Mode,
		"output_dir", p.config.OutputDir,
		"issues_count", len(issues))

	switch p.config.Mode {
	case ModeHTML:
		return p.generateHTMLSite(ctx, issues)
	case ModeJekyll:
		return p.generateJekyllWiki(ctx, issues)
	default:
		return fmt.Errorf("unsupported publishing mode: %s", p.config.Mode)
	}
}

// Deploy deploys the generated content to GitHub Pages
func (p *UnifiedPagesPublisher) Deploy(ctx context.Context) error {
	if !p.config.Deploy {
		p.logger.Info("Deployment disabled, skipping")
		return nil
	}

	p.logger.Info("Starting deployment to GitHub Pages",
		"branch", p.config.GitHubPages.Branch,
		"repository", fmt.Sprintf("%s/%s", p.config.Owner, p.config.Repository))

	return p.deployToGitHubPages(ctx)
}

// generateHTMLSite generates static HTML content
func (p *UnifiedPagesPublisher) generateHTMLSite(ctx context.Context, issues []models.Issue) error {
	p.logger.Info("Generating HTML site")

	// Ensure output directory exists
	if err := os.MkdirAll(p.config.OutputDir, 0755); err != nil {
		return fmt.Errorf("failed to create output directory: %w", err)
	}

	// Generate HTML content using existing site generator logic
	// This will be migrated from pkg/site/generator.go
	return p.generateHTMLContent(issues)
}

// generateJekyllWiki generates Jekyll-based wiki content
func (p *UnifiedPagesPublisher) generateJekyllWiki(ctx context.Context, issues []models.Issue) error {
	p.logger.Info("Generating Jekyll wiki")

	// Ensure output directory exists
	if err := os.MkdirAll(p.config.OutputDir, 0755); err != nil {
		return fmt.Errorf("failed to create output directory: %w", err)
	}

	// Generate Jekyll content using existing wiki generator logic
	// This will be migrated from pkg/wiki/github_pages_publisher.go
	return p.generateJekyllContent(issues)
}

// deployToGitHubPages handles deployment to GitHub Pages
func (p *UnifiedPagesPublisher) deployToGitHubPages(ctx context.Context) error {
	// Initialize temporary directory for deployment
	deployDir, err := p.tempManager.CreateTempDir("github-pages-deployment")
	if err != nil {
		return fmt.Errorf("failed to create deployment directory: %w", err)
	}
	defer func() {
		if err := p.tempManager.CleanupDirectory(deployDir); err != nil {
			p.logger.Warn("Failed to cleanup deployment directory", "path", deployDir, "error", err)
		}
	}()

	// Clone or initialize GitHub Pages repository
	repoURL := fmt.Sprintf("https://github.com/%s/%s.git", p.config.Owner, p.config.Repository)

	p.logger.Info("Cloning repository for deployment", "url", repoURL, "branch", p.config.GitHubPages.Branch)

	if err := p.gitClient.Clone(ctx, repoURL, deployDir, &wiki.CloneOptions{
		Branch: p.config.GitHubPages.Branch,
		Depth:  1,
	}); err != nil {
		// If branch doesn't exist, create it
		p.logger.Info("Branch doesn't exist, will create orphan branch", "branch", p.config.GitHubPages.Branch)
		if err := p.createOrphanBranch(ctx, deployDir, repoURL); err != nil {
			return fmt.Errorf("failed to create orphan branch: %w", err)
		}
	}

	// Copy generated content to deployment directory
	if err := p.copyGeneratedContent(deployDir); err != nil {
		return fmt.Errorf("failed to copy generated content: %w", err)
	}

	// Commit and push changes
	if err := p.commitAndPush(ctx, deployDir); err != nil {
		return fmt.Errorf("failed to commit and push: %w", err)
	}

	p.logger.Info("Successfully deployed to GitHub Pages")
	return nil
}

// Validate validates the unified pages configuration
func (c *UnifiedPagesConfig) Validate() error {
	if c.Owner == "" {
		return fmt.Errorf("owner is required")
	}
	if c.Repository == "" {
		return fmt.Errorf("repository is required")
	}
	if c.Mode != ModeHTML && c.Mode != ModeJekyll {
		return fmt.Errorf("mode must be either 'html' or 'jekyll'")
	}
	if c.OutputDir == "" {
		c.OutputDir = "_site" // Default output directory
	}
	if c.GitHubPages.Branch == "" {
		c.GitHubPages.Branch = "gh-pages" // Default branch
	}
	return nil
}

// Helper methods to be implemented
func (p *UnifiedPagesPublisher) generateHTMLContent(issues []models.Issue) error {
	// TODO: Migrate from pkg/site/generator.go
	return fmt.Errorf("HTML content generation not yet implemented")
}

func (p *UnifiedPagesPublisher) generateJekyllContent(issues []models.Issue) error {
	// TODO: Migrate from pkg/wiki/github_pages_publisher.go
	return fmt.Errorf("jekyll content generation not yet implemented")
}

func (p *UnifiedPagesPublisher) createOrphanBranch(ctx context.Context, deployDir, repoURL string) error {
	// TODO: Implement orphan branch creation
	return fmt.Errorf("orphan branch creation not yet implemented")
}

func (p *UnifiedPagesPublisher) copyGeneratedContent(deployDir string) error {
	// TODO: Implement content copying
	return fmt.Errorf("content copying not yet implemented")
}

func (p *UnifiedPagesPublisher) commitAndPush(ctx context.Context, deployDir string) error {
	// TODO: Implement commit and push
	return fmt.Errorf("commit and push not yet implemented")
}

// LoadConfigFromDeploymentConfig loads pages configuration from deployment-config.yml
func LoadConfigFromDeploymentConfig(deploymentConfigPath string, mode PublishingMode) (*UnifiedPagesConfig, error) {
	// TODO: Implement configuration loading from deployment-config.yml
	// This will consolidate the configuration management

	// For now, return a basic configuration
	return &UnifiedPagesConfig{
		Mode:      mode,
		OutputDir: "_site",
		GitHubPages: GitHubPagesSettings{
			Branch: "gh-pages",
		},
	}, nil
}

package pages

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/nyasuto/beaver/internal/config"
	"github.com/nyasuto/beaver/internal/models"
	"github.com/nyasuto/beaver/pkg/content"
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
	gitClient   content.GitClient
	tempManager *content.TempManager
	logger      *slog.Logger
}

// NewUnifiedPagesPublisher creates a new unified pages publisher
func NewUnifiedPagesPublisher(config *UnifiedPagesConfig) (*UnifiedPagesPublisher, error) {
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("invalid configuration: %w", err)
	}

	gitClient, err := content.NewDefaultGitClient()
	if err != nil {
		return nil, fmt.Errorf("failed to create git client: %w", err)
	}

	tempManager := content.NewTempManager("", "beaver-pages")

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

	if err := p.gitClient.Clone(ctx, repoURL, deployDir, &content.CloneOptions{
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

// Helper methods implementation
func (p *UnifiedPagesPublisher) generateHTMLContent(issues []models.Issue) error {
	p.logger.Info("Generating HTML content using site generator")

	// Use wiki generator for HTML mode (legacy site package removed)
	generator := content.NewGenerator()

	projectName := p.config.Site.Title
	if projectName == "" {
		projectName = p.config.Repository
	}

	// Generate all pages using wiki system
	pages, err := generator.GenerateAllPages(issues, projectName)
	if err != nil {
		return fmt.Errorf("failed to generate wiki pages: %w", err)
	}

	// Save pages as HTML files
	for _, page := range pages {
		outputPath := filepath.Join(p.config.OutputDir, page.Filename)
		if !strings.HasSuffix(outputPath, ".html") {
			outputPath = strings.TrimSuffix(outputPath, ".md") + ".html"
		}

		if err := os.WriteFile(outputPath, []byte(page.Content), 0600); err != nil {
			return fmt.Errorf("failed to write page %s: %w", outputPath, err)
		}
	}

	p.logger.Info("HTML content generation completed", "output_dir", p.config.OutputDir)
	return nil
}

func (p *UnifiedPagesPublisher) generateJekyllContent(issues []models.Issue) error {
	p.logger.Info("Generating Jekyll content using wiki generator")

	// Create publisher configuration
	publisherConfig := content.NewPublisherConfig(p.config.Owner, p.config.Repository, "")

	// Create GitHub Pages configuration
	pagesConfig := config.GitHubPagesConfig{
		Theme:        p.config.Wiki.Theme,
		Branch:       p.config.GitHubPages.Branch,
		Domain:       p.config.GitHubPages.Domain,
		BaseURL:      p.config.GitHubPages.BaseURL,
		Analytics:    p.config.GitHubPages.Analytics,
		EnableSearch: p.config.GitHubPages.EnableSearch,
	}

	// Create GitHub Pages publisher
	publisher, err := content.NewGitHubPagesPublisher(publisherConfig, pagesConfig)
	if err != nil {
		return fmt.Errorf("failed to create GitHub Pages publisher: %w", err)
	}

	// Generate and publish Jekyll wiki
	ctx := context.Background()
	projectName := p.config.Wiki.Title
	if projectName == "" {
		projectName = p.config.Repository
	}

	if err := publisher.GenerateAndPublishWiki(ctx, issues, projectName); err != nil {
		return fmt.Errorf("failed to generate Jekyll content: %w", err)
	}

	p.logger.Info("Jekyll content generation completed", "output_dir", p.config.OutputDir)
	return nil
}

func (p *UnifiedPagesPublisher) createOrphanBranch(ctx context.Context, deployDir, repoURL string) error {
	p.logger.Info("Creating orphan branch for GitHub Pages", "branch", p.config.GitHubPages.Branch)

	// Initialize a new git repository in the deploy directory
	if err := os.MkdirAll(deployDir, 0755); err != nil {
		return fmt.Errorf("failed to create deploy directory: %w", err)
	}

	// Clone the repository with minimal depth
	if err := p.gitClient.Clone(ctx, repoURL, deployDir, &content.CloneOptions{
		Depth: 1,
	}); err != nil {
		return fmt.Errorf("failed to clone repository: %w", err)
	}

	// Create and checkout orphan branch
	if err := p.gitClient.CreateOrphanBranch(ctx, deployDir, p.config.GitHubPages.Branch); err != nil {
		return fmt.Errorf("failed to create orphan branch: %w", err)
	}

	// Remove all existing files from the orphan branch
	if err := p.gitClient.RemoveFiles(ctx, deployDir, []string{"."}, true); err != nil {
		// If git rm fails, manually clean directory but preserve .git
		entries, err := os.ReadDir(deployDir)
		if err == nil {
			for _, entry := range entries {
				if entry.Name() != ".git" {
					_ = os.RemoveAll(filepath.Join(deployDir, entry.Name()))
				}
			}
		}
	}

	p.logger.Info("Orphan branch created successfully", "branch", p.config.GitHubPages.Branch)
	return nil
}

func (p *UnifiedPagesPublisher) copyGeneratedContent(deployDir string) error {
	p.logger.Info("Copying generated content to deployment directory", "source", p.config.OutputDir, "dest", deployDir)

	// Copy all files from output directory to deployment directory
	err := filepath.Walk(p.config.OutputDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Calculate relative path
		relPath, err := filepath.Rel(p.config.OutputDir, path)
		if err != nil {
			return err
		}

		// Skip the root directory itself
		if relPath == "." {
			return nil
		}

		// Calculate destination path
		destPath := filepath.Join(deployDir, relPath)

		if info.IsDir() {
			// Create directory
			return os.MkdirAll(destPath, info.Mode())
		}

		// Copy file
		srcFile, err := os.Open(path)
		if err != nil {
			return err
		}
		defer srcFile.Close()

		// Ensure destination directory exists
		if err := os.MkdirAll(filepath.Dir(destPath), 0755); err != nil {
			return err
		}

		destFile, err := os.Create(destPath)
		if err != nil {
			return err
		}
		defer destFile.Close()

		// Copy file content
		_, err = destFile.ReadFrom(srcFile)
		return err
	})

	if err != nil {
		return fmt.Errorf("failed to copy content: %w", err)
	}

	p.logger.Info("Content copying completed successfully")
	return nil
}

func (p *UnifiedPagesPublisher) commitAndPush(ctx context.Context, deployDir string) error {
	p.logger.Info("Committing and pushing changes to GitHub Pages")

	// Add all files to git
	if err := p.gitClient.Add(ctx, deployDir, []string{"."}); err != nil {
		return fmt.Errorf("failed to add files to git: %w", err)
	}

	// Check if there are changes to commit
	status, err := p.gitClient.Status(ctx, deployDir)
	if err != nil {
		return fmt.Errorf("failed to check git status: %w", err)
	}

	if status.IsClean {
		p.logger.Info("No changes to commit, skipping deployment")
		return nil
	}

	// Create commit message with timestamp
	commitMessage := fmt.Sprintf("Deploy %s - %s", p.config.Mode, time.Now().Format("2006-01-02 15:04:05"))

	// Commit changes
	if err := p.gitClient.Commit(ctx, deployDir, commitMessage, nil); err != nil {
		return fmt.Errorf("failed to commit changes: %w", err)
	}

	// Push to GitHub Pages branch
	pushOptions := &content.PushOptions{
		Remote: "origin",
		Branch: p.config.GitHubPages.Branch,
		Force:  false,
	}

	if err := p.gitClient.Push(ctx, deployDir, pushOptions); err != nil {
		return fmt.Errorf("failed to push to GitHub: %w", err)
	}

	p.logger.Info("Successfully committed and pushed changes", "branch", p.config.GitHubPages.Branch)
	return nil
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

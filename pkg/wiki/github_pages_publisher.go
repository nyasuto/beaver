package wiki

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/nyasuto/beaver/internal/config"
	"github.com/nyasuto/beaver/internal/models"
)

// GitHubPagesPublisher implements WikiPublisher for GitHub Pages
type GitHubPagesPublisher struct {
	config        *PublisherConfig
	pagesConfig   config.GitHubPagesConfig
	gitClient     GitClient
	tempManager   *TempManager
	workingDir    string
	isInitialized bool
}

// NewGitHubPagesPublisher creates a new GitHub Pages publisher
func NewGitHubPagesPublisher(publisherConfig *PublisherConfig, pagesConfig config.GitHubPagesConfig) (*GitHubPagesPublisher, error) {
	if err := publisherConfig.Validate(); err != nil {
		return nil, fmt.Errorf("invalid publisher config: %w", err)
	}

	// Validate GitHub Pages specific configuration
	if err := validateGitHubPagesConfig(pagesConfig); err != nil {
		return nil, fmt.Errorf("invalid GitHub Pages config: %w", err)
	}

	tempManager := NewTempManager("", "beaver-gh-pages")
	gitClient, err := NewCmdGitClient()
	if err != nil {
		return nil, fmt.Errorf("failed to create git client: %w", err)
	}

	return &GitHubPagesPublisher{
		config:      publisherConfig,
		pagesConfig: pagesConfig,
		gitClient:   gitClient,
		tempManager: tempManager,
	}, nil
}

// validateGitHubPagesConfig validates GitHub Pages specific settings
func validateGitHubPagesConfig(config config.GitHubPagesConfig) error {
	// Branch validation
	validBranches := map[string]bool{
		"gh-pages": true,
		"main":     true,
		"master":   true,
	}
	if config.Branch != "" && !validBranches[config.Branch] {
		return fmt.Errorf("無効なbranch '%s': gh-pages, main, master のみサポート", config.Branch)
	}

	// Theme validation
	validThemes := map[string]bool{
		"minima": true, "minimal": true, "modernist": true, "cayman": true,
		"architect": true, "slate": true, "merlot": true, "time-machine": true,
		"leap-day": true, "midnight": true, "tactile": true, "dinky": true,
	}
	if config.Theme != "" && !validThemes[config.Theme] {
		return fmt.Errorf("無効なtheme '%s'", config.Theme)
	}

	return nil
}

// Initialize initializes the GitHub Pages repository
func (p *GitHubPagesPublisher) Initialize(ctx context.Context) error {
	if p.isInitialized {
		return nil
	}

	// Create temporary working directory
	workingDir, err := p.tempManager.CreateTempDir("github-pages")
	if err != nil {
		return NewWikiError(ErrorTypeRepository, "github pages init",
			err, "Failed to create working directory", 0,
			[]string{"Check disk space and permissions"})
	}
	p.workingDir = workingDir

	// Set branch name for GitHub Pages
	if p.pagesConfig.Branch != "" {
		p.config.BranchName = p.pagesConfig.Branch
	} else {
		p.config.BranchName = "gh-pages" // Default for GitHub Pages
	}

	p.isInitialized = true
	return nil
}

// Clone clones the GitHub Pages repository
func (p *GitHubPagesPublisher) Clone(ctx context.Context) error {
	if !p.isInitialized {
		return NewWikiError(ErrorTypeRepository, "github pages clone",
			nil, "Publisher not initialized", 0,
			[]string{"Call Initialize() first"})
	}

	// Construct GitHub Pages repository URL
	repoURL := fmt.Sprintf("https://github.com/%s/%s", p.config.Owner, p.config.Repository)
	authenticatedURL := fmt.Sprintf("https://x-access-token:%s@github.com/%s/%s",
		p.config.Token, p.config.Owner, p.config.Repository)

	// Create clone options
	cloneOptions := &CloneOptions{
		Depth:  p.config.CloneDepth,
		Branch: p.config.BranchName,
	}

	// Try to clone the repository
	if err := p.gitClient.Clone(ctx, authenticatedURL, p.workingDir, cloneOptions); err != nil {
		// If branch doesn't exist, create it with basic structure
		if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "fatal: Remote branch") {
			return p.initializeNewGitHubPagesRepo(ctx, repoURL)
		}
		return NewWikiError(ErrorTypeGitOperation, "github pages clone",
			err, "Failed to clone GitHub Pages repository", 0,
			[]string{
				"Check if repository exists and is accessible",
				"Verify GitHub token permissions",
				fmt.Sprintf("Repository: %s", repoURL),
			})
	}

	// Successfully cloned - ensure we're on the correct branch
	currentBranch, err := p.gitClient.GetCurrentBranch(ctx, p.workingDir)
	if err != nil {
		return fmt.Errorf("failed to get current branch: %w", err)
	}

	if currentBranch != p.config.BranchName {
		if err := p.gitClient.CheckoutBranch(ctx, p.workingDir, p.config.BranchName); err != nil {
			return fmt.Errorf("failed to checkout branch %s: %w", p.config.BranchName, err)
		}
	}

	return nil
}

// initializeNewGitHubPagesRepo creates a basic structure for new GitHub Pages repo
func (p *GitHubPagesPublisher) initializeNewGitHubPagesRepo(ctx context.Context, repoURL string) error {
	// Create initial Jekyll structure
	if err := p.createInitialJekyllStructure(); err != nil {
		return fmt.Errorf("failed to create Jekyll structure: %w", err)
	}

	// Initialize git repository
	if err := p.initializeGitRepository(ctx, repoURL); err != nil {
		return fmt.Errorf("failed to initialize git repository: %w", err)
	}

	return nil
}

// initializeGitRepository initializes git repository with initial commit
func (p *GitHubPagesPublisher) initializeGitRepository(ctx context.Context, _ string) error {
	// Set git configuration for the repository
	if err := p.gitClient.SetConfig(ctx, p.workingDir, "user.name", "Beaver AI"); err != nil {
		return fmt.Errorf("failed to set git user.name: %w", err)
	}

	if err := p.gitClient.SetConfig(ctx, p.workingDir, "user.email", "noreply@beaver.ai"); err != nil {
		return fmt.Errorf("failed to set git user.email: %w", err)
	}

	// Set up authenticated remote URL
	authenticatedURL := fmt.Sprintf("https://x-access-token:%s@github.com/%s/%s",
		p.config.Token, p.config.Owner, p.config.Repository)

	if err := p.gitClient.SetConfig(ctx, p.workingDir, "remote.origin.url", authenticatedURL); err != nil {
		return fmt.Errorf("failed to set remote origin: %w", err)
	}

	// Check out the target branch
	if err := p.gitClient.CheckoutBranch(ctx, p.workingDir, p.config.BranchName); err != nil {
		// If branch doesn't exist, we'll create it with the initial commit
		fmt.Printf("Branch %s doesn't exist, will create it with initial commit\n", p.config.BranchName)
	}

	// Add all files to staging
	if err := p.gitClient.Add(ctx, p.workingDir, []string{"."}); err != nil {
		return fmt.Errorf("failed to add files to git: %w", err)
	}

	// Create initial commit
	commitOptions := NewDefaultCommitOptions()
	if err := p.gitClient.Commit(ctx, p.workingDir, "Initial GitHub Pages setup by Beaver", commitOptions); err != nil {
		return fmt.Errorf("failed to create initial commit: %w", err)
	}

	return nil
}

// createInitialJekyllStructure creates the basic Jekyll file structure
func (p *GitHubPagesPublisher) createInitialJekyllStructure() error {
	// Create _config.yml
	configContent := p.generateJekyllConfig()
	configPath := filepath.Join(p.workingDir, "_config.yml")
	if err := WriteFileUTF8(configPath, configContent, 0600); err != nil {
		return fmt.Errorf("failed to create _config.yml: %w", err)
	}

	// Create initial index.md
	indexContent := p.generateInitialIndex()
	indexPath := filepath.Join(p.workingDir, "index.md")
	if err := WriteFileUTF8(indexPath, indexContent, 0600); err != nil {
		return fmt.Errorf("failed to create index.md: %w", err)
	}

	// Create _layouts directory
	layoutsDir := filepath.Join(p.workingDir, "_layouts")
	if err := os.MkdirAll(layoutsDir, 0755); err != nil {
		return fmt.Errorf("failed to create _layouts directory: %w", err)
	}

	// Create default layout
	defaultLayoutContent := p.generateDefaultLayout()
	defaultLayoutPath := filepath.Join(layoutsDir, "default.html")
	if err := WriteFileUTF8(defaultLayoutPath, defaultLayoutContent, 0600); err != nil {
		return fmt.Errorf("failed to create default layout: %w", err)
	}

	return nil
}

// generateJekyllConfig generates the Jekyll _config.yml file
func (p *GitHubPagesPublisher) generateJekyllConfig() string {
	repoName := p.config.Repository
	baseURL := p.pagesConfig.BaseURL
	if baseURL == "" {
		baseURL = "/" + repoName // Auto-detect based on repository name
	}

	config := fmt.Sprintf(`# Jekyll configuration for Beaver GitHub Pages
title: %s Knowledge Base
description: >-
  AI-powered knowledge base automatically generated from GitHub Issues
  using Beaver - transforming development streams into structured knowledge dams

# Repository information
repository: %s/%s
github_username: %s

# Build settings
markdown: kramdown
highlighter: rouge
theme: %s

# GitHub Pages settings
url: "https://%s.github.io"
baseurl: "%s"

# Beaver metadata
beaver:
  version: "Phase 1"
  generated_at: %s
  auto_generated: true
`,
		p.config.Repository,
		p.config.Owner, p.config.Repository,
		p.config.Owner,
		p.pagesConfig.Theme,
		p.config.Owner,
		baseURL,
		time.Now().Format(time.RFC3339),
	)

	return config
}

// generateInitialIndex generates the initial index.md file
func (p *GitHubPagesPublisher) generateInitialIndex() string {
	return fmt.Sprintf(`---
layout: default
title: Home
---

# %s Knowledge Base

Welcome to the AI-powered knowledge base for %s, automatically generated and maintained by **Beaver**.

## 🦫 About This Knowledge Base

This site transforms flowing development streams into structured, persistent knowledge. All content is automatically generated from:

- **GitHub Issues** and their discussions
- **Development patterns** and insights
- **Problem-solving documentation**
- **Learning paths** and milestones

## 📚 Navigation

- [Issues Summary](./issues-summary.html) - Comprehensive overview of all project issues
- [Troubleshooting Guide](./troubleshooting.html) - Solutions to common problems
- [Learning Path](./learning-path.html) - Development journey and milestones

---

*🦫 This knowledge base is automatically maintained by [Beaver](https://github.com/nyasuto/beaver) - Last updated: %s*
`,
		p.config.Repository,
		p.config.Repository,
		time.Now().Format("2006-01-02 15:04:05 JST"),
	)
}

// generateDefaultLayout generates the default HTML layout
func (p *GitHubPagesPublisher) generateDefaultLayout() string {
	return `<!DOCTYPE html>
<html lang="en-US">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta charset="utf-8">
    <title>{{ page.title }} - {{ site.title }}</title>
    <link rel="stylesheet" href="{{ "/assets/css/main.css" | relative_url }}">
  </head>
  <body>
    <div class="container-lg px-3 my-5 markdown-body">
      {% if site.title and site.title != page.title %}
      <h1><a href="{{ "/" | relative_url }}">{{ site.title }}</a></h1>
      {% endif %}

      <nav class="site-nav">
        <a href="{{ "/" | relative_url }}">Home</a>
        <a href="{{ "/issues-summary.html" | relative_url }}">Issues</a>
        <a href="{{ "/troubleshooting.html" | relative_url }}">Troubleshooting</a>
        <a href="{{ "/learning-path.html" | relative_url }}">Learning Path</a>
      </nav>

      {{ content }}
    </div>
  </body>
</html>
`
}

// Cleanup cleans up temporary resources
func (p *GitHubPagesPublisher) Cleanup() error {
	if p.tempManager != nil && p.workingDir != "" {
		return p.tempManager.CleanupDirectory(p.workingDir)
	}
	return nil
}

// CreatePage creates a new page (not implemented for GitHub Pages - use PublishPages)
func (p *GitHubPagesPublisher) CreatePage(ctx context.Context, page *WikiPage) error {
	return fmt.Errorf("CreatePage not implemented for GitHub Pages - use PublishPages instead")
}

// UpdatePage updates an existing page (not implemented for GitHub Pages - use PublishPages)
func (p *GitHubPagesPublisher) UpdatePage(ctx context.Context, page *WikiPage) error {
	return fmt.Errorf("UpdatePage not implemented for GitHub Pages - use PublishPages instead")
}

// DeletePage deletes a page (not implemented for GitHub Pages - use PublishPages)
func (p *GitHubPagesPublisher) DeletePage(ctx context.Context, pageName string) error {
	return fmt.Errorf("DeletePage not implemented for GitHub Pages - use PublishPages instead")
}

// PageExists checks if a page exists
func (p *GitHubPagesPublisher) PageExists(ctx context.Context, pageName string) (bool, error) {
	if !p.isInitialized {
		return false, NewWikiError(ErrorTypeRepository, "github pages page exists",
			nil, "Publisher not initialized", 0,
			[]string{"Call Initialize() first"})
	}

	// Convert wiki page name to Jekyll filename
	filename := p.wikiPageToJekyllFilename(pageName)
	filePath := filepath.Join(p.workingDir, filename)

	_, err := os.Stat(filePath)
	if os.IsNotExist(err) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("failed to check page existence: %w", err)
	}

	return true, nil
}

// PublishPages publishes multiple wiki pages to GitHub Pages
func (p *GitHubPagesPublisher) PublishPages(ctx context.Context, pages []*WikiPage) error {
	if !p.isInitialized {
		return NewWikiError(ErrorTypeRepository, "github pages publish",
			nil, "Publisher not initialized", 0,
			[]string{"Call Initialize() first"})
	}

	// Convert wiki pages to Jekyll format and save
	for _, page := range pages {
		if err := p.convertAndSaveWikiPage(page); err != nil {
			return fmt.Errorf("failed to convert and save page %s: %w", page.Title, err)
		}
	}

	// Phase 2: Full deployment workflow (only if working directory is a git repository)
	if p.isGitRepository() {
		// Commit changes with descriptive message
		commitMessage := fmt.Sprintf("Update wiki pages: %d pages updated by Beaver\n\nAuto-generated from GitHub Issues\nTimestamp: %s",
			len(pages), time.Now().Format(time.RFC3339))

		if err := p.Commit(ctx, commitMessage); err != nil {
			return fmt.Errorf("failed to commit changes: %w", err)
		}

		// Push changes to GitHub Pages
		if err := p.Push(ctx); err != nil {
			return fmt.Errorf("failed to push changes: %w", err)
		}

		fmt.Printf("✅ Successfully published %d pages to GitHub Pages\n", len(pages))
	} else {
		fmt.Printf("✅ Successfully generated %d Jekyll pages (no git repository for deployment)\n", len(pages))
	}

	return nil
}

// isGitRepository checks if the working directory is a git repository
func (p *GitHubPagesPublisher) isGitRepository() bool {
	if p.workingDir == "" {
		return false
	}
	return IsGitRepository(p.workingDir)
}

// GenerateAndPublishWiki generates and publishes wiki from issues
func (p *GitHubPagesPublisher) GenerateAndPublishWiki(ctx context.Context, issues []models.Issue, projectName string) error {
	// Generate wiki pages using the standard generator
	generator := NewGenerator()
	pages, err := generator.GenerateAllPages(issues, projectName)
	if err != nil {
		return fmt.Errorf("failed to generate wiki pages: %w", err)
	}

	// Publish the generated pages
	return p.PublishPages(ctx, pages)
}

// convertAndSaveWikiPage converts a wiki page to Jekyll format and saves it
func (p *GitHubPagesPublisher) convertAndSaveWikiPage(page *WikiPage) error {
	// Generate Jekyll front matter
	frontMatter := p.generateJekyllFrontMatter(page)

	// Combine front matter and content
	jekyllContent := frontMatter + "\n" + page.Content

	// Determine output filename
	filename := p.wikiPageToJekyllFilename(page.Filename)
	filePath := filepath.Join(p.workingDir, filename)

	// Write the file
	if err := WriteFileUTF8(filePath, jekyllContent, 0600); err != nil {
		return fmt.Errorf("failed to write Jekyll page %s: %w", filePath, err)
	}

	return nil
}

// generateJekyllFrontMatter generates Jekyll front matter for a wiki page
func (p *GitHubPagesPublisher) generateJekyllFrontMatter(page *WikiPage) string {
	frontMatter := fmt.Sprintf(`---
layout: default
title: "%s"
generated_at: %s
beaver_auto_generated: true`,
		strings.ReplaceAll(page.Title, `"`, `\"`),
		time.Now().Format(time.RFC3339),
	)

	if page.Summary != "" {
		frontMatter += fmt.Sprintf(`
description: "%s"`, strings.ReplaceAll(page.Summary, `"`, `\"`))
	}

	if page.Category != "" {
		frontMatter += fmt.Sprintf(`
category: "%s"`, page.Category)
	}

	if len(page.Tags) > 0 {
		frontMatter += "\ntags:"
		for _, tag := range page.Tags {
			frontMatter += fmt.Sprintf(`
  - "%s"`, tag)
		}
	}

	frontMatter += "\n---"
	return frontMatter
}

// wikiPageToJekyllFilename converts wiki page filename to Jekyll filename
func (p *GitHubPagesPublisher) wikiPageToJekyllFilename(wikiFilename string) string {
	// Remove .md extension if present
	name := strings.TrimSuffix(wikiFilename, ".md")

	// Convert to lowercase and replace spaces with hyphens
	name = strings.ToLower(name)
	name = strings.ReplaceAll(name, " ", "-")
	name = strings.ReplaceAll(name, "_", "-")

	// Add .html extension for Jekyll
	return name + ".html"
}

// Commit commits changes to the local repository
func (p *GitHubPagesPublisher) Commit(ctx context.Context, message string) error {
	if !p.isInitialized {
		return NewWikiError(ErrorTypeRepository, "github pages commit",
			nil, "Publisher not initialized", 0,
			[]string{"Call Initialize() first"})
	}

	// Check if there are changes to commit
	status, err := p.gitClient.Status(ctx, p.workingDir)
	if err != nil {
		return fmt.Errorf("failed to get git status: %w", err)
	}

	if status.IsClean {
		fmt.Printf("📝 No changes to commit\n")
		return nil
	}

	// Add all changes to staging
	if err := p.gitClient.Add(ctx, p.workingDir, []string{"."}); err != nil {
		return fmt.Errorf("failed to add changes to git: %w", err)
	}

	// Create commit with Beaver metadata
	commitOptions := NewDefaultCommitOptions()
	if err := p.gitClient.Commit(ctx, p.workingDir, message, commitOptions); err != nil {
		return fmt.Errorf("failed to commit changes: %w", err)
	}

	fmt.Printf("📝 GitHub Pages changes committed: %s\n", message)
	return nil
}

// Push pushes changes to the remote GitHub Pages repository
func (p *GitHubPagesPublisher) Push(ctx context.Context) error {
	if !p.isInitialized {
		return NewWikiError(ErrorTypeRepository, "github pages push",
			nil, "Publisher not initialized", 0,
			[]string{"Call Initialize() first"})
	}

	// Set up push options for GitHub Pages
	pushOptions := &PushOptions{
		Remote:  "origin",
		Branch:  p.config.BranchName,
		Force:   false,
		Timeout: p.config.Timeout,
	}

	// Push changes to remote repository
	if err := p.gitClient.Push(ctx, p.workingDir, pushOptions); err != nil {
		return NewWikiError(ErrorTypeGitOperation, "github pages push",
			err, "Failed to push changes to GitHub Pages", 0,
			[]string{
				"Check GitHub token permissions",
				"Verify branch exists on remote",
				fmt.Sprintf("Branch: %s", p.config.BranchName),
				"Ensure repository allows pushes to this branch",
			})
	}

	fmt.Printf("🚀 GitHub Pages changes pushed successfully to %s branch\n", p.config.BranchName)
	return nil
}

// Pull pulls changes from the remote GitHub Pages repository
func (p *GitHubPagesPublisher) Pull(ctx context.Context) error {
	if !p.isInitialized {
		return NewWikiError(ErrorTypeRepository, "github pages pull",
			nil, "Publisher not initialized", 0,
			[]string{"Call Initialize() first"})
	}

	// Check for uncommitted changes before pulling
	status, err := p.gitClient.Status(ctx, p.workingDir)
	if err != nil {
		return fmt.Errorf("failed to get git status: %w", err)
	}

	if !status.IsClean {
		return NewWikiError(ErrorTypeGitOperation, "github pages pull",
			nil, "Working directory has uncommitted changes", 0,
			[]string{
				"Commit or stash your changes before pulling",
				"Use Commit() method to commit changes",
			})
	}

	// Pull changes from remote repository
	if err := p.gitClient.Pull(ctx, p.workingDir); err != nil {
		return NewWikiError(ErrorTypeGitOperation, "github pages pull",
			err, "Failed to pull changes from GitHub Pages", 0,
			[]string{
				"Check GitHub token permissions",
				"Verify branch exists on remote",
				fmt.Sprintf("Branch: %s", p.config.BranchName),
				"Check internet connectivity",
			})
	}

	fmt.Printf("📥 GitHub Pages changes pulled successfully from %s branch\n", p.config.BranchName)
	return nil
}

// GetStatus returns the current status of the publisher
func (p *GitHubPagesPublisher) GetStatus(ctx context.Context) (*PublisherStatus, error) {
	status := &PublisherStatus{
		IsInitialized: p.isInitialized,
		WorkingDir:    p.workingDir,
		BranchName:    p.config.BranchName,
		RepositoryURL: fmt.Sprintf("https://github.com/%s/%s", p.config.Owner, p.config.Repository),
		LastUpdate:    time.Now(),
	}

	if p.isInitialized {
		// Count pages
		if files, err := filepath.Glob(filepath.Join(p.workingDir, "*.html")); err == nil {
			status.TotalPages = len(files)
		}
	}

	return status, nil
}

// ListPages returns information about all pages
func (p *GitHubPagesPublisher) ListPages(ctx context.Context) ([]*WikiPageInfo, error) {
	if !p.isInitialized {
		return nil, NewWikiError(ErrorTypeRepository, "github pages list",
			nil, "Publisher not initialized", 0,
			[]string{"Call Initialize() first"})
	}

	var pages []*WikiPageInfo

	// Find all HTML files in working directory
	pattern := filepath.Join(p.workingDir, "*.html")
	files, err := filepath.Glob(pattern)
	if err != nil {
		return nil, fmt.Errorf("failed to list pages: %w", err)
	}

	for _, file := range files {
		info, err := os.Stat(file)
		if err != nil {
			continue
		}

		filename := filepath.Base(file)
		title := strings.TrimSuffix(filename, ".html")
		title = strings.ReplaceAll(title, "-", " ")

		// Convert to title case manually to avoid deprecated strings.Title
		words := strings.Fields(title)
		for i, word := range words {
			if len(word) > 0 {
				words[i] = strings.ToUpper(word[:1]) + strings.ToLower(word[1:])
			}
		}
		title = strings.Join(words, " ")

		pageInfo := &WikiPageInfo{
			Title:        title,
			Filename:     filename,
			Size:         info.Size(),
			LastModified: info.ModTime(),
			URL:          fmt.Sprintf("https://%s.github.io/%s/%s", p.config.Owner, p.config.Repository, filename),
		}

		pages = append(pages, pageInfo)
	}

	return pages, nil
}

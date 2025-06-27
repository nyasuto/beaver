package wiki

import (
	"context"
	"fmt"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/nyasuto/beaver/internal/models"
)

// GitHubWikiPublisher implements WikiPublisher using Git clone operations
type GitHubWikiPublisher struct {
	config        *PublisherConfig
	gitClient     GitClient
	generator     *Generator
	authenticator *GitAuthenticator
	fileManager   *WikiFileManager
	workDir       string
	isInitialized bool
}

// NewGitHubWikiPublisher creates a new GitHub Wiki publisher
func NewGitHubWikiPublisher(config *PublisherConfig) (*GitHubWikiPublisher, error) {
	log.Printf("INFO Creating GitHubWikiPublisher: owner=%s, repo=%s", config.Owner, config.Repository)

	if err := config.Validate(); err != nil {
		return nil, err
	}

	gitClient, err := NewCmdGitClient()
	if err != nil {
		return nil, err
	}

	// Initialize authenticator if token is provided
	var authenticator *GitAuthenticator
	if config.Token != "" {
		authenticator = NewGitAuthenticator(config.Token)
		if err := authenticator.ValidateToken(); err != nil {
			return nil, err
		}
		log.Printf("INFO Authenticator initialized with token: %s", authenticator.SecureTokenString())
	}

	return &GitHubWikiPublisher{
		config:        config,
		gitClient:     gitClient,
		generator:     NewGenerator(),
		authenticator: authenticator,
		fileManager:   nil, // Will be initialized when workDir is created
		workDir:       "",
		isInitialized: false,
	}, nil
}

// Initialize prepares the publisher for operations
func (p *GitHubWikiPublisher) Initialize(ctx context.Context) error {
	log.Printf("INFO GitHubWikiPublisher Initialize starting")

	if p.isInitialized {
		log.Printf("INFO Publisher already initialized")
		return nil
	}

	// Create working directory
	workDir, err := p.createWorkingDirectory()
	if err != nil {
		return err
	}
	p.workDir = workDir

	// Initialize file manager (images directory will be created after clone)
	p.fileManager = NewWikiFileManager(p.workDir)

	// Setup authentication if available
	if p.authenticator != nil {
		if err := p.authenticator.SetupCredentials(p.workDir); err != nil {
			return err
		}
		log.Printf("INFO Authentication credentials configured for workDir: %s", p.workDir)
	}

	p.isInitialized = true
	log.Printf("INFO GitHubWikiPublisher initialized successfully: workDir=%s", p.workDir)
	return nil
}

// Clone clones the .wiki.git repository
func (p *GitHubWikiPublisher) Clone(ctx context.Context) error {
	log.Printf("INFO GitHubWikiPublisher Clone starting")

	if !p.isInitialized {
		return NewConfigurationError("clone", "Publisher not initialized")
	}

	// Check if already cloned
	if IsGitRepository(p.workDir) {
		log.Printf("INFO Repository already cloned, pulling latest changes")
		return p.Pull(ctx)
	}

	// Clone the .wiki.git repository
	repoURL := p.config.GetRepositoryURL()
	if p.authenticator != nil {
		repoURL = p.authenticator.BuildAuthURL(repoURL)
		log.Printf("INFO Using authenticated URL: %s", p.authenticator.SanitizeURL(repoURL))
	} else {
		log.Printf("INFO Using repository URL: %s", repoURL)
	}
	cloneOptions := NewDefaultCloneOptions()
	cloneOptions.Depth = p.config.CloneDepth
	cloneOptions.SingleBranch = p.config.UseShallowClone
	cloneOptions.Branch = p.config.BranchName
	cloneOptions.Timeout = p.config.Timeout

	err := p.gitClient.Clone(ctx, repoURL, p.workDir, cloneOptions)
	if err != nil {
		// Handle specific error cases
		if IsAuthenticationError(err) {
			return err // Already properly formatted
		}
		if IsRepositoryError(err) {
			return NewRepositoryError("clone", err, p.config.GetRepositoryURL()).
				WithContext("repository", fmt.Sprintf("%s/%s", p.config.Owner, p.config.Repository))
		}
		return err
	}

	// Configure git user for commits
	if err := p.configureGitUser(ctx); err != nil {
		log.Printf("WARN Failed to configure git user: %v", err)
		// Not fatal, continue
	}

	log.Printf("INFO Repository cloned successfully")
	return nil
}

// Cleanup removes temporary files and directories
func (p *GitHubWikiPublisher) Cleanup() error {
	log.Printf("INFO GitHubWikiPublisher Cleanup starting")

	if p.workDir == "" {
		log.Printf("INFO No working directory to cleanup")
		return nil
	}

	// Cleanup authentication credentials
	if p.authenticator != nil {
		if err := p.authenticator.Cleanup(p.workDir); err != nil {
			log.Printf("WARN Failed to cleanup authentication credentials: %v", err)
		}
	}

	// Remove working directory
	err := os.RemoveAll(p.workDir)
	if err != nil {
		log.Printf("ERROR Failed to cleanup working directory: %v", err)
		return NewWikiError(ErrorTypeFileSystem, "cleanup", err,
			"作業ディレクトリのクリーンアップに失敗しました", 0,
			[]string{
				"ディスクの空き容量を確認してください",
				"ファイルアクセス権限を確認してください",
			})
	}

	p.workDir = ""
	p.isInitialized = false
	log.Printf("INFO Cleanup completed successfully")
	return nil
}

// CreatePage creates a new Wiki page
func (p *GitHubWikiPublisher) CreatePage(ctx context.Context, page *WikiPage) error {
	log.Printf("INFO Creating page: %s", page.Filename)

	if !p.isInitialized {
		return NewConfigurationError("create_page", "Publisher not initialized")
	}

	// Use file manager to create page with enhanced naming and conflict detection
	// Configure file manager for strict conflict detection on create
	originalConfig := p.fileManager.config.ConflictResolution
	p.fileManager.config.ConflictResolution = ConflictError

	fileInfo, err := p.fileManager.WritePageFile(page.Title, page.Content)

	// Restore original conflict resolution
	p.fileManager.config.ConflictResolution = originalConfig

	if err != nil {
		return err
	}

	log.Printf("INFO Page created successfully: %s (normalized from: %s)",
		fileInfo.NormalizedName, fileInfo.OriginalName)
	return nil
}

// UpdatePage updates an existing Wiki page
func (p *GitHubWikiPublisher) UpdatePage(ctx context.Context, page *WikiPage) error {
	log.Printf("INFO Updating page: %s", page.Filename)

	if !p.isInitialized {
		return NewConfigurationError("update_page", "Publisher not initialized")
	}

	// Use file manager to update page with enhanced naming (allows overwrite)
	// Configure file manager to allow overwrite for updates
	originalConfig := p.fileManager.config.ConflictResolution
	p.fileManager.config.ConflictResolution = ConflictOverwrite

	fileInfo, err := p.fileManager.WritePageFile(page.Title, page.Content)

	// Restore original conflict resolution
	p.fileManager.config.ConflictResolution = originalConfig

	if err != nil {
		return err
	}

	log.Printf("INFO Page updated successfully: %s (normalized from: %s)",
		fileInfo.NormalizedName, fileInfo.OriginalName)
	return nil
}

// DeletePage deletes a Wiki page
func (p *GitHubWikiPublisher) DeletePage(ctx context.Context, pageName string) error {
	log.Printf("INFO Deleting page: %s", pageName)

	if !p.isInitialized {
		return NewConfigurationError("delete_page", "Publisher not initialized")
	}

	// Use file manager to normalize filename and locate the file
	normalizedName, err := p.fileManager.NormalizePageName(pageName)
	if err != nil {
		return err
	}

	filepath := filepath.Join(p.workDir, normalizedName)

	// Check if page exists
	if _, err := os.Stat(filepath); os.IsNotExist(err) {
		return NewWikiError(ErrorTypeValidation, "delete_page", nil,
			fmt.Sprintf("ページ %s が見つかりません", pageName), 0,
			[]string{
				"ページ名を確認してください",
				"ListPages でページ一覧を確認してください",
			})
	}

	// Delete the file
	if err := os.Remove(filepath); err != nil {
		return NewWikiError(ErrorTypeFileSystem, "delete_page", err,
			"ページファイルの削除に失敗しました", 0,
			[]string{
				"ファイルアクセス権限を確認してください",
				"ファイルが他のプロセスで使用されていないか確認してください",
			})
	}

	log.Printf("INFO Page deleted successfully: %s (normalized from: %s)", normalizedName, pageName)
	return nil
}

// PageExists checks if a Wiki page exists
func (p *GitHubWikiPublisher) PageExists(ctx context.Context, pageName string) (bool, error) {
	if !p.isInitialized {
		return false, NewConfigurationError("page_exists", "Publisher not initialized")
	}

	// Use file manager to normalize filename
	normalizedName, err := p.fileManager.NormalizePageName(pageName)
	if err != nil {
		return false, err
	}

	filepath := filepath.Join(p.workDir, normalizedName)

	_, err = os.Stat(filepath)
	if os.IsNotExist(err) {
		return false, nil
	}
	if err != nil {
		return false, NewWikiError(ErrorTypeFileSystem, "page_exists", err,
			"ページ存在確認に失敗しました", 0, nil)
	}

	return true, nil
}

// PublishPages publishes multiple Wiki pages in a batch
func (p *GitHubWikiPublisher) PublishPages(ctx context.Context, pages []*WikiPage) error {
	log.Printf("INFO Publishing %d pages", len(pages))

	if !p.isInitialized {
		return NewConfigurationError("publish_pages", "Publisher not initialized")
	}

	// Ensure repository is cloned
	if err := p.Clone(ctx); err != nil {
		return err
	}

	// Create/update each page
	var filenames []string
	for _, page := range pages {
		if err := p.UpdatePage(ctx, page); err != nil {
			return fmt.Errorf("failed to update page %s: %w", page.Title, err)
		}
		// Get normalized filename from file manager
		normalizedName, err := p.fileManager.NormalizePageName(page.Title)
		if err != nil {
			return fmt.Errorf("failed to normalize page name %s: %w", page.Title, err)
		}
		filenames = append(filenames, normalizedName)
	}

	// Add all files to git
	if err := p.gitClient.Add(ctx, p.workDir, filenames); err != nil {
		return err
	}

	// Commit changes
	commitMessage := fmt.Sprintf("feat: Update %d Wiki pages via Beaver\n\nUpdated pages:\n", len(pages))
	for _, page := range pages {
		commitMessage += fmt.Sprintf("- %s\n", page.Title)
	}
	commitMessage += "\n🤖 Generated with Beaver AI"

	commitOptions := NewDefaultCommitOptions()
	commitOptions.Author.Name = p.config.AuthorName
	commitOptions.Author.Email = p.config.AuthorEmail

	if err := p.gitClient.Commit(ctx, p.workDir, commitMessage, commitOptions); err != nil {
		return err
	}

	// Push changes
	pushOptions := NewDefaultPushOptions()
	pushOptions.Branch = p.config.BranchName
	pushOptions.Timeout = p.config.Timeout

	if err := p.gitClient.Push(ctx, p.workDir, pushOptions); err != nil {
		return err
	}

	log.Printf("INFO Successfully published %d pages", len(pages))
	return nil
}

// GenerateAndPublishWiki generates and publishes complete Wiki documentation
func (p *GitHubWikiPublisher) GenerateAndPublishWiki(ctx context.Context, issues []models.Issue, projectName string) error {
	log.Printf("INFO Generating and publishing complete wiki for project: %s", projectName)

	// Generate all Wiki pages using the generator
	pages, err := p.generator.GenerateAllPages(issues, projectName)
	if err != nil {
		return fmt.Errorf("failed to generate wiki pages: %w", err)
	}

	log.Printf("INFO Generated %d wiki pages", len(pages))

	// Publish all pages
	return p.PublishPages(ctx, pages)
}

// Commit commits changes to the local repository
func (p *GitHubWikiPublisher) Commit(ctx context.Context, message string) error {
	log.Printf("INFO Committing changes: %s", message)

	if !p.isInitialized {
		return NewConfigurationError("commit", "Publisher not initialized")
	}

	commitOptions := NewDefaultCommitOptions()
	commitOptions.Author.Name = p.config.AuthorName
	commitOptions.Author.Email = p.config.AuthorEmail

	return p.gitClient.Commit(ctx, p.workDir, message, commitOptions)
}

// Push pushes changes to the remote repository
func (p *GitHubWikiPublisher) Push(ctx context.Context) error {
	log.Printf("INFO Pushing changes to remote")

	if !p.isInitialized {
		return NewConfigurationError("push", "Publisher not initialized")
	}

	pushOptions := NewDefaultPushOptions()
	pushOptions.Branch = p.config.BranchName
	pushOptions.Timeout = p.config.Timeout

	return p.gitClient.Push(ctx, p.workDir, pushOptions)
}

// Pull pulls the latest changes from the remote repository
func (p *GitHubWikiPublisher) Pull(ctx context.Context) error {
	log.Printf("INFO Pulling latest changes from remote")

	if !p.isInitialized {
		return NewConfigurationError("pull", "Publisher not initialized")
	}

	return p.gitClient.Pull(ctx, p.workDir)
}

// GetStatus returns the current status of the publisher
func (p *GitHubWikiPublisher) GetStatus(ctx context.Context) (*PublisherStatus, error) {
	log.Printf("DEBUG Getting publisher status")

	status := &PublisherStatus{
		IsInitialized: p.isInitialized,
		RepositoryURL: p.config.GetRepositoryURL(),
		WorkingDir:    p.workDir,
		BranchName:    p.config.BranchName,
	}

	if !p.isInitialized {
		return status, nil
	}

	// Get git status if repository is cloned
	if IsGitRepository(p.workDir) {
		gitStatus, err := p.gitClient.Status(ctx, p.workDir)
		if err != nil {
			status.LastError = err
		} else {
			status.HasUncommitted = gitStatus.HasUncommitted
			status.PendingChanges = len(gitStatus.ModifiedFiles) + len(gitStatus.UntrackedFiles)
		}

		// Get current commit SHA
		if sha, err := p.gitClient.GetCurrentSHA(ctx, p.workDir); err == nil {
			status.LastCommitSHA = sha
		}

		// Count total pages
		if count, err := p.countPages(); err == nil {
			status.TotalPages = count
		}
	}

	return status, nil
}

// ListPages returns information about all Wiki pages
func (p *GitHubWikiPublisher) ListPages(ctx context.Context) ([]*WikiPageInfo, error) {
	log.Printf("DEBUG Listing wiki pages")

	if !p.isInitialized {
		return nil, NewConfigurationError("list_pages", "Publisher not initialized")
	}

	if !IsGitRepository(p.workDir) {
		return []*WikiPageInfo{}, nil
	}

	var pages []*WikiPageInfo

	err := filepath.WalkDir(p.workDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		// Skip .git directory
		if d.IsDir() && d.Name() == ".git" {
			return filepath.SkipDir
		}

		// Only process .md files
		if !d.IsDir() && strings.HasSuffix(d.Name(), ".md") {
			info, err := d.Info()
			if err != nil {
				return err
			}

			pageInfo := &WikiPageInfo{
				Title:        strings.TrimSuffix(d.Name(), ".md"),
				Filename:     d.Name(),
				Size:         info.Size(),
				LastModified: info.ModTime(),
				URL: fmt.Sprintf("https://github.com/%s/%s/wiki/%s",
					p.config.Owner, p.config.Repository, strings.TrimSuffix(d.Name(), ".md")),
			}

			pages = append(pages, pageInfo)
		}

		return nil
	})

	if err != nil {
		return nil, NewWikiError(ErrorTypeFileSystem, "list_pages", err,
			"ページ一覧の取得に失敗しました", 0, nil)
	}

	log.Printf("DEBUG Found %d wiki pages", len(pages))
	return pages, nil
}

// Helper methods

// createWorkingDirectory creates a temporary working directory
func (p *GitHubWikiPublisher) createWorkingDirectory() (string, error) {
	workDir := p.config.WorkingDir

	if workDir == "" {
		// Create temporary directory
		tempDir, err := os.MkdirTemp("", fmt.Sprintf("beaver-wiki-%s-%s-",
			p.config.Owner, p.config.Repository))
		if err != nil {
			return "", NewWikiError(ErrorTypeFileSystem, "create_workdir", err,
				"作業ディレクトリの作成に失敗しました", 0,
				[]string{
					"ディスクの空き容量を確認してください",
					"一時ディレクトリへの書き込み権限を確認してください",
				})
		}
		workDir = tempDir
	} else {
		// Use specified directory
		if err := os.MkdirAll(workDir, 0750); err != nil { // #nosec G301 -- workDir needs to be accessible for Git operations
			return "", NewWikiError(ErrorTypeFileSystem, "create_workdir", err,
				"指定された作業ディレクトリの作成に失敗しました", 0,
				[]string{
					"ディレクトリパスを確認してください",
					"親ディレクトリへの書き込み権限を確認してください",
				})
		}
	}

	log.Printf("INFO Created working directory: %s", workDir)
	return workDir, nil
}

// configureGitUser configures git user settings for commits
func (p *GitHubWikiPublisher) configureGitUser(ctx context.Context) error {
	if err := p.gitClient.SetConfig(ctx, p.workDir, "user.name", p.config.AuthorName); err != nil {
		return err
	}
	if err := p.gitClient.SetConfig(ctx, p.workDir, "user.email", p.config.AuthorEmail); err != nil {
		return err
	}
	return nil
}

// countPages counts the number of .md files in the working directory
func (p *GitHubWikiPublisher) countPages() (int, error) {
	count := 0
	err := filepath.WalkDir(p.workDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if !d.IsDir() && strings.HasSuffix(d.Name(), ".md") {
			count++
		}
		return nil
	})
	return count, err
}

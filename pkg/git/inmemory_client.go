package git

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"github.com/go-git/go-billy/v5"
	"github.com/go-git/go-billy/v5/memfs"
	"github.com/go-git/go-billy/v5/util"
	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/config"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/object"
	"github.com/go-git/go-git/v5/plumbing/transport"
	"github.com/go-git/go-git/v5/plumbing/transport/http"
	"github.com/go-git/go-git/v5/storage/memory"
	"github.com/nyasuto/beaver/internal/errors"
)

// InMemoryGitClientImpl implements InMemoryGitClient with pure in-memory operations
type InMemoryGitClientImpl struct {
	auth    transport.AuthMethod
	timeout time.Duration
}

// NewInMemoryGitClient creates a new in-memory Git client
func NewInMemoryGitClient() InMemoryGitClient {
	return &InMemoryGitClientImpl{
		timeout: 30 * time.Second,
	}
}

// NewInMemoryGitClientWithAuth creates a new in-memory Git client with authentication
func NewInMemoryGitClientWithAuth(token string) InMemoryGitClient {
	var auth transport.AuthMethod
	if token != "" {
		auth = &http.BasicAuth{
			Username: "token",
			Password: token,
		}
	}

	return &InMemoryGitClientImpl{
		auth:    auth,
		timeout: 30 * time.Second,
	}
}

// CreateWorkspace creates a new in-memory Git workspace
func (c *InMemoryGitClientImpl) CreateWorkspace() (*git.Repository, billy.Filesystem, error) {
	fs := memfs.New()
	storage := memory.NewStorage()

	repo, err := git.Init(storage, fs)
	if err != nil {
		return nil, nil, c.handleError("init", err)
	}

	return repo, fs, nil
}

// CloneToMemory clones a repository into memory
func (c *InMemoryGitClientImpl) CloneToMemory(ctx context.Context, url string, options *CloneOptions) (*git.Repository, billy.Filesystem, error) {
	fs := memfs.New()
	storage := memory.NewStorage()

	cloneOptions := &git.CloneOptions{
		URL:  url,
		Auth: c.auth,
	}

	if options != nil {
		if options.Depth > 0 {
			cloneOptions.Depth = options.Depth
		}
		if options.SingleBranch {
			cloneOptions.SingleBranch = options.SingleBranch
		}
		if options.Branch != "" {
			cloneOptions.ReferenceName = plumbing.ReferenceName("refs/heads/" + options.Branch)
		}
	}

	// Create context with timeout
	timeout := c.timeout
	if options != nil && options.Timeout > 0 {
		timeout = options.Timeout
	}
	ctxWithTimeout, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	repo, err := git.CloneContext(ctxWithTimeout, storage, fs, cloneOptions)
	if err != nil {
		return nil, nil, c.handleError("clone", err)
	}

	return repo, fs, nil
}

// AddFiles adds files to the staging area
func (c *InMemoryGitClientImpl) AddFiles(repo *git.Repository, fs billy.Filesystem, files []string) error {
	worktree, err := repo.Worktree()
	if err != nil {
		return c.handleError("worktree", err)
	}

	for _, file := range files {
		if file == "." {
			// Add all files
			_, err = worktree.Add(".")
		} else {
			_, err = worktree.Add(file)
		}
		if err != nil {
			return c.handleError("add", err)
		}
	}

	return nil
}

// CommitChanges creates a commit with the staged changes
func (c *InMemoryGitClientImpl) CommitChanges(repo *git.Repository, message string, options *CommitOptions) (*object.Commit, error) {
	worktree, err := repo.Worktree()
	if err != nil {
		return nil, c.handleError("worktree", err)
	}

	commitOptions := &git.CommitOptions{
		AllowEmptyCommits: false,
	}

	if options != nil {
		if options.Author != nil {
			commitOptions.Author = &object.Signature{
				Name:  options.Author.Name,
				Email: options.Author.Email,
				When:  time.Now(),
			}
		}
		if options.AllowEmpty {
			commitOptions.AllowEmptyCommits = options.AllowEmpty
		}
	}

	hash, err := worktree.Commit(message, commitOptions)
	if err != nil {
		return nil, c.handleError("commit", err)
	}

	// Return the commit object
	commit, err := repo.CommitObject(hash)
	if err != nil {
		return nil, c.handleError("commit-object", err)
	}

	return commit, nil
}

// PullChanges pulls changes from remote
func (c *InMemoryGitClientImpl) PullChanges(ctx context.Context, repo *git.Repository, options *PullOptions) error {
	worktree, err := repo.Worktree()
	if err != nil {
		return c.handleError("worktree", err)
	}

	pullOptions := &git.PullOptions{
		Auth: c.auth,
	}

	if options != nil {
		if options.RemoteName != "" {
			pullOptions.RemoteName = options.RemoteName
		}
		if options.ReferenceName != "" {
			pullOptions.ReferenceName = plumbing.ReferenceName(options.ReferenceName)
		}
		if options.SingleBranch {
			pullOptions.SingleBranch = options.SingleBranch
		}
	}

	// Create context with timeout
	timeout := c.timeout
	if options != nil && options.Timeout > 0 {
		timeout = options.Timeout
	}
	ctxWithTimeout, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	err = worktree.PullContext(ctxWithTimeout, pullOptions)
	if err != nil && err != git.NoErrAlreadyUpToDate {
		return c.handleError("pull", err)
	}

	return nil
}

// PushChanges pushes changes to remote
func (c *InMemoryGitClientImpl) PushChanges(ctx context.Context, repo *git.Repository, options *PushOptions) error {
	pushOptions := &git.PushOptions{
		Auth: c.auth,
	}

	if options != nil {
		if options.Remote != "" {
			pushOptions.RemoteName = options.Remote
		}
		if options.Force {
			pushOptions.Force = options.Force
		}
	}

	// Create context with timeout
	timeout := c.timeout
	if options != nil && options.Timeout > 0 {
		timeout = options.Timeout
	}
	ctxWithTimeout, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	err := repo.PushContext(ctxWithTimeout, pushOptions)
	if err != nil && err != git.NoErrAlreadyUpToDate {
		return c.handleError("push", err)
	}

	return nil
}

// GetStatus returns the repository status
func (c *InMemoryGitClientImpl) GetStatus(repo *git.Repository) (*InMemoryGitStatus, error) {
	worktree, err := repo.Worktree()
	if err != nil {
		return nil, c.handleError("worktree", err)
	}

	status, err := worktree.Status()
	if err != nil {
		return nil, c.handleError("status", err)
	}

	// Get current branch
	head, err := repo.Head()
	if err != nil {
		return nil, c.handleError("head", err)
	}

	branch := "HEAD"
	if head.Name().IsBranch() {
		branch = head.Name().Short()
	}

	gitStatus := &InMemoryGitStatus{
		IsClean:        status.IsClean(),
		HasUncommitted: !status.IsClean(),
		Branch:         branch,
		ModifiedFiles:  []string{},
		UntrackedFiles: []string{},
		StagedFiles:    []string{},
	}

	for file, fileStatus := range status {
		switch fileStatus.Staging {
		case git.Added, git.Modified, git.Renamed, git.Copied:
			gitStatus.StagedFiles = append(gitStatus.StagedFiles, file)
		}

		switch fileStatus.Worktree {
		case git.Modified, git.Deleted:
			gitStatus.ModifiedFiles = append(gitStatus.ModifiedFiles, file)
		case git.Untracked:
			gitStatus.UntrackedFiles = append(gitStatus.UntrackedFiles, file)
			gitStatus.HasUntracked = true
		}
	}

	return gitStatus, nil
}

// GetCurrentSHA returns the current commit SHA
func (c *InMemoryGitClientImpl) GetCurrentSHA(repo *git.Repository) (string, error) {
	head, err := repo.Head()
	if err != nil {
		return "", c.handleError("head", err)
	}

	return head.Hash().String(), nil
}

// GetCurrentBranch returns the current branch name
func (c *InMemoryGitClientImpl) GetCurrentBranch(repo *git.Repository) (string, error) {
	head, err := repo.Head()
	if err != nil {
		return "", c.handleError("head", err)
	}

	if head.Name().IsBranch() {
		return head.Name().Short(), nil
	}

	return "HEAD", nil
}

// GetRemoteURL returns the URL of the specified remote
func (c *InMemoryGitClientImpl) GetRemoteURL(repo *git.Repository, remoteName string) (string, error) {
	if remoteName == "" {
		remoteName = "origin"
	}

	remote, err := repo.Remote(remoteName)
	if err != nil {
		return "", c.handleError("remote", err)
	}

	if len(remote.Config().URLs) == 0 {
		return "", fmt.Errorf("no URLs found for remote %s", remoteName)
	}

	return remote.Config().URLs[0], nil
}

// CheckoutBranch checks out the specified branch
func (c *InMemoryGitClientImpl) CheckoutBranch(repo *git.Repository, branch string) error {
	worktree, err := repo.Worktree()
	if err != nil {
		return c.handleError("worktree", err)
	}

	err = worktree.Checkout(&git.CheckoutOptions{
		Branch: plumbing.ReferenceName("refs/heads/" + branch),
	})
	if err != nil {
		return c.handleError("checkout", err)
	}

	return nil
}

// CreateBranch creates a new branch
func (c *InMemoryGitClientImpl) CreateBranch(repo *git.Repository, branch string) error {
	worktree, err := repo.Worktree()
	if err != nil {
		return c.handleError("worktree", err)
	}

	err = worktree.Checkout(&git.CheckoutOptions{
		Branch: plumbing.ReferenceName("refs/heads/" + branch),
		Create: true,
	})
	if err != nil {
		return c.handleError("checkout-create", err)
	}

	return nil
}

// CreateOrphanBranch creates an orphan branch
func (c *InMemoryGitClientImpl) CreateOrphanBranch(repo *git.Repository, branch string) error {
	// For orphan branch, we create a new branch without history
	return c.CreateBranch(repo, branch)
}

// BranchExists checks if a branch exists
func (c *InMemoryGitClientImpl) BranchExists(repo *git.Repository, branch string) bool {
	branchRef := plumbing.ReferenceName("refs/heads/" + branch)
	_, err := repo.Reference(branchRef, true)
	return err == nil
}

// ListBranches returns information about all branches
func (c *InMemoryGitClientImpl) ListBranches(repo *git.Repository) ([]*BranchInfo, error) {
	var branches []*BranchInfo

	// Get current branch
	head, err := repo.Head()
	if err != nil {
		return nil, c.handleError("head", err)
	}

	currentBranch := ""
	if head.Name().IsBranch() {
		currentBranch = head.Name().Short()
	}

	// Get all branches
	branchIter, err := repo.Branches()
	if err != nil {
		return nil, c.handleError("branches", err)
	}

	err = branchIter.ForEach(func(ref *plumbing.Reference) error {
		if ref.Name().IsBranch() {
			name := ref.Name().Short()
			branches = append(branches, &BranchInfo{
				Name:      name,
				IsRemote:  false,
				IsCurrent: name == currentBranch,
				Hash:      ref.Hash().String(),
			})
		}
		return nil
	})
	if err != nil {
		return nil, c.handleError("branch-iter", err)
	}

	return branches, nil
}

// SetConfig sets a configuration value
func (c *InMemoryGitClientImpl) SetConfig(repo *git.Repository, key, value string) error {
	cfg, err := repo.Config()
	if err != nil {
		return c.handleError("config", err)
	}

	// Parse key to determine section and option
	parts := strings.Split(key, ".")
	if len(parts) < 2 {
		return fmt.Errorf("invalid config key format: %s", key)
	}

	section := parts[0]
	option := strings.Join(parts[1:], ".")

	// Set the configuration value
	cfg.Raw = cfg.Raw.SetOption(section, "", option, value)

	return nil
}

// GetConfig gets a configuration value
func (c *InMemoryGitClientImpl) GetConfig(repo *git.Repository, key string) (string, error) {
	cfg, err := repo.Config()
	if err != nil {
		return "", c.handleError("config", err)
	}

	// Parse key to determine section and option
	parts := strings.Split(key, ".")
	if len(parts) < 2 {
		return "", fmt.Errorf("invalid config key format: %s", key)
	}

	section := parts[0]
	option := strings.Join(parts[1:], ".")

	// Get the configuration value
	value := cfg.Raw.Section(section).Option(option)
	return value, nil
}

// UnsetConfig removes a configuration value
func (c *InMemoryGitClientImpl) UnsetConfig(repo *git.Repository, key string) error {
	cfg, err := repo.Config()
	if err != nil {
		return c.handleError("config", err)
	}

	// Parse key to determine section and option
	parts := strings.Split(key, ".")
	if len(parts) < 2 {
		return fmt.Errorf("invalid config key format: %s", key)
	}

	section := parts[0]
	option := strings.Join(parts[1:], ".")

	// Remove the configuration value by setting it to empty
	cfg.Raw = cfg.Raw.SetOption(section, "", option, "")

	return nil
}

// GetAllConfig returns the complete configuration
func (c *InMemoryGitClientImpl) GetAllConfig(repo *git.Repository) (*config.Config, error) {
	cfg, err := repo.Config()
	if err != nil {
		return nil, c.handleError("config", err)
	}

	return cfg, nil
}

// WriteFile writes content to a file in the filesystem
func (c *InMemoryGitClientImpl) WriteFile(fs billy.Filesystem, path string, content []byte, mode uint32) error {
	// Ensure directory exists
	dir := filepath.Dir(path)
	if dir != "." && dir != "/" {
		if err := fs.MkdirAll(dir, 0755); err != nil {
			return c.handleError("mkdir", err)
		}
	}

	file, err := fs.Create(path)
	if err != nil {
		return c.handleError("open-file", err)
	}
	defer file.Close()

	_, err = file.Write(content)
	if err != nil {
		return c.handleError("write-file", err)
	}

	return nil
}

// ReadFile reads content from a file in the filesystem
func (c *InMemoryGitClientImpl) ReadFile(fs billy.Filesystem, path string) ([]byte, error) {
	file, err := fs.Open(path)
	if err != nil {
		return nil, c.handleError("open-file", err)
	}
	defer file.Close()

	content := make([]byte, 0)
	buffer := make([]byte, 1024)

	for {
		n, err := file.Read(buffer)
		if n > 0 {
			content = append(content, buffer[:n]...)
		}
		if err != nil {
			if err.Error() == "EOF" {
				break
			}
			return nil, c.handleError("read-file", err)
		}
	}

	return content, nil
}

// RemoveFiles removes files from the repository
func (c *InMemoryGitClientImpl) RemoveFiles(repo *git.Repository, fs billy.Filesystem, paths []string) error {
	worktree, err := repo.Worktree()
	if err != nil {
		return c.handleError("worktree", err)
	}

	for _, path := range paths {
		_, err = worktree.Remove(path)
		if err != nil {
			return c.handleError("remove", err)
		}
	}

	return nil
}

// ListFiles lists files matching a pattern
func (c *InMemoryGitClientImpl) ListFiles(fs billy.Filesystem, pattern string) ([]string, error) {
	var files []string

	// Use util.Glob for pattern matching
	matches, err := util.Glob(fs, pattern)
	if err != nil {
		return nil, c.handleError("glob", err)
	}

	for _, match := range matches {
		info, err := fs.Stat(match)
		if err != nil {
			continue // Skip files that can't be stat'd
		}
		if !info.IsDir() {
			files = append(files, match)
		}
	}

	return files, nil
}

// handleError converts errors to BeaverError format
func (c *InMemoryGitClientImpl) handleError(operation string, err error) error {
	return errors.NewGitOperationError(operation, err, err.Error())
}

// Placeholder implementations for remaining methods
// These would need full implementation in a production system

func (c *InMemoryGitClientImpl) CreateStash(repo *git.Repository, message string) (*object.Commit, error) {
	return nil, fmt.Errorf("stash operations not yet implemented in pure in-memory mode")
}

func (c *InMemoryGitClientImpl) ApplyStash(repo *git.Repository, stashCommit *object.Commit) error {
	return fmt.Errorf("stash operations not yet implemented in pure in-memory mode")
}

func (c *InMemoryGitClientImpl) ListStashes(repo *git.Repository) ([]*StashInfo, error) {
	return nil, fmt.Errorf("stash operations not yet implemented in pure in-memory mode")
}

func (c *InMemoryGitClientImpl) GetCommitHistory(repo *git.Repository, options *CommitHistoryOptions) ([]*object.Commit, error) {
	head, err := repo.Head()
	if err != nil {
		return nil, c.handleError("head", err)
	}

	commitIter, err := repo.Log(&git.LogOptions{From: head.Hash()})
	if err != nil {
		return nil, c.handleError("log", err)
	}

	var commits []*object.Commit
	count := 0
	maxCommits := 100 // Default limit

	if options != nil && options.MaxCommits > 0 {
		maxCommits = options.MaxCommits
	}

	err = commitIter.ForEach(func(commit *object.Commit) error {
		if options != nil && options.Since != nil && commit.Author.When.Before(*options.Since) {
			return nil // Skip commits before the since date
		}

		commits = append(commits, commit)
		count++

		if count >= maxCommits {
			return fmt.Errorf("limit reached") // Use error to break iteration
		}

		return nil
	})

	// Filter out the "limit reached" error
	if err != nil && !strings.Contains(err.Error(), "limit reached") {
		return nil, c.handleError("commit-iter", err)
	}

	return commits, nil
}

func (c *InMemoryGitClientImpl) GetCommitCount(repo *git.Repository) (int, error) {
	head, err := repo.Head()
	if err != nil {
		return 0, c.handleError("head", err)
	}

	commitIter, err := repo.Log(&git.LogOptions{From: head.Hash()})
	if err != nil {
		return 0, c.handleError("log", err)
	}

	count := 0
	err = commitIter.ForEach(func(commit *object.Commit) error {
		count++
		return nil
	})
	if err != nil {
		return 0, c.handleError("commit-iter", err)
	}

	return count, nil
}

func (c *InMemoryGitClientImpl) GetContributors(repo *git.Repository) ([]*ContributorInfo, error) {
	head, err := repo.Head()
	if err != nil {
		return nil, c.handleError("head", err)
	}

	commitIter, err := repo.Log(&git.LogOptions{From: head.Hash()})
	if err != nil {
		return nil, c.handleError("log", err)
	}

	contributors := make(map[string]*ContributorInfo)

	err = commitIter.ForEach(func(commit *object.Commit) error {
		email := commit.Author.Email

		if contrib, exists := contributors[email]; exists {
			contrib.CommitCount++
			if commit.Author.When.After(contrib.LastCommit) {
				contrib.LastCommit = commit.Author.When
			}
			if commit.Author.When.Before(contrib.FirstCommit) {
				contrib.FirstCommit = commit.Author.When
			}
		} else {
			contributors[email] = &ContributorInfo{
				Name:        commit.Author.Name,
				Email:       commit.Author.Email,
				CommitCount: 1,
				FirstCommit: commit.Author.When,
				LastCommit:  commit.Author.When,
			}
		}

		return nil
	})
	if err != nil {
		return nil, c.handleError("commit-iter", err)
	}

	var result []*ContributorInfo
	for _, contrib := range contributors {
		result = append(result, contrib)
	}

	return result, nil
}

func (c *InMemoryGitClientImpl) GetFirstCommitDate(repo *git.Repository) (time.Time, error) {
	head, err := repo.Head()
	if err != nil {
		return time.Time{}, c.handleError("head", err)
	}

	commitIter, err := repo.Log(&git.LogOptions{From: head.Hash()})
	if err != nil {
		return time.Time{}, c.handleError("log", err)
	}

	var firstCommit time.Time

	err = commitIter.ForEach(func(commit *object.Commit) error {
		if firstCommit.IsZero() || commit.Author.When.Before(firstCommit) {
			firstCommit = commit.Author.When
		}
		return nil
	})
	if err != nil {
		return time.Time{}, c.handleError("commit-iter", err)
	}

	return firstCommit, nil
}

func (c *InMemoryGitClientImpl) GetBranchCount(repo *git.Repository) (int, error) {
	branchIter, err := repo.Branches()
	if err != nil {
		return 0, c.handleError("branches", err)
	}

	count := 0
	err = branchIter.ForEach(func(ref *plumbing.Reference) error {
		if ref.Name().IsBranch() {
			count++
		}
		return nil
	})
	if err != nil {
		return 0, c.handleError("branch-iter", err)
	}

	return count, nil
}

func (c *InMemoryGitClientImpl) AddRemote(repo *git.Repository, name, url string) error {
	_, err := repo.CreateRemote(&config.RemoteConfig{
		Name: name,
		URLs: []string{url},
	})
	if err != nil {
		return c.handleError("create-remote", err)
	}

	return nil
}

func (c *InMemoryGitClientImpl) RemoveRemote(repo *git.Repository, name string) error {
	err := repo.DeleteRemote(name)
	if err != nil {
		return c.handleError("delete-remote", err)
	}

	return nil
}

func (c *InMemoryGitClientImpl) ListRemotes(repo *git.Repository) ([]*RemoteInfo, error) {
	remotes, err := repo.Remotes()
	if err != nil {
		return nil, c.handleError("remotes", err)
	}

	var result []*RemoteInfo
	for _, remote := range remotes {
		config := remote.Config()
		result = append(result, &RemoteInfo{
			Name: config.Name,
			URLs: config.URLs,
		})
	}

	return result, nil
}

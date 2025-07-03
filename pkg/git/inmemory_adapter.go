package git

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/go-git/go-billy/v5"
	"github.com/go-git/go-git/v5"
)

// InMemoryGitClientAdapter adapts InMemoryGitClient to match the existing GitClient interface
// This allows existing code to use InMemoryGitClient without changes
type InMemoryGitClientAdapter struct {
	client     InMemoryGitClient
	workspaces map[string]*InMemoryWorkspace // Map from directory path to workspace
	mutex      sync.RWMutex
}

// Clone implements GitClient interface by creating an in-memory clone
func (a *InMemoryGitClientAdapter) Clone(ctx context.Context, url, dir string, options *CloneOptions) error {
	a.mutex.Lock()
	defer a.mutex.Unlock()

	if a.workspaces == nil {
		a.workspaces = make(map[string]*InMemoryWorkspace)
	}

	// Convert options to InMemoryGitClient format
	var cloneOpts *CloneOptions
	if options != nil {
		cloneOpts = &CloneOptions{
			Depth:        options.Depth,
			SingleBranch: options.SingleBranch,
			Branch:       options.Branch,
			Bare:         options.Bare,
			Timeout:      options.Timeout,
		}
	}

	// Create workspace and clone
	workspace, err := NewInMemoryWorkspace()
	if err != nil {
		return fmt.Errorf("failed to create workspace: %w", err)
	}

	err = workspace.Clone(ctx, url, cloneOpts)
	if err != nil {
		return fmt.Errorf("failed to clone repository: %w", err)
	}

	// Store workspace mapped to directory path
	a.workspaces[dir] = workspace
	return nil
}

// Pull implements GitClient interface
func (a *InMemoryGitClientAdapter) Pull(ctx context.Context, dir string) error {
	workspace, err := a.getWorkspace(dir)
	if err != nil {
		return err
	}

	pullOpts := &PullOptions{
		RemoteName: "origin",
		Timeout:    30 * time.Second,
	}

	return a.client.PullChanges(ctx, workspace.Repository, pullOpts)
}

// Push implements GitClient interface
func (a *InMemoryGitClientAdapter) Push(ctx context.Context, dir string, options *PushOptions) error {
	workspace, err := a.getWorkspace(dir)
	if err != nil {
		return err
	}

	var pushOpts *PushOptions
	if options != nil {
		pushOpts = options
	} else {
		pushOpts = &PushOptions{
			Remote:  "origin",
			Timeout: 30 * time.Second,
		}
	}

	return a.client.PushChanges(ctx, workspace.Repository, pushOpts)
}

// Add implements GitClient interface
func (a *InMemoryGitClientAdapter) Add(ctx context.Context, dir string, files []string) error {
	workspace, err := a.getWorkspace(dir)
	if err != nil {
		return err
	}

	return a.client.AddFiles(workspace.Repository, workspace.Filesystem, files)
}

// Commit implements GitClient interface
func (a *InMemoryGitClientAdapter) Commit(ctx context.Context, dir string, message string, options *CommitOptions) error {
	workspace, err := a.getWorkspace(dir)
	if err != nil {
		return err
	}

	var commitOpts *CommitOptions
	if options != nil {
		commitOpts = options
	} else {
		// Default author for compatibility
		commitOpts = &CommitOptions{
			Author: &CommitAuthor{
				Name:  "Beaver User",
				Email: "user@beaver.dev",
			},
		}
	}

	_, err = a.client.CommitChanges(workspace.Repository, message, commitOpts)
	return err
}

// Status implements GitClient interface
func (a *InMemoryGitClientAdapter) Status(ctx context.Context, dir string) (*GitStatus, error) {
	workspace, err := a.getWorkspace(dir)
	if err != nil {
		return nil, err
	}

	inMemoryStatus, err := a.client.GetStatus(workspace.Repository)
	if err != nil {
		return nil, err
	}

	// Convert InMemoryGitStatus to GitStatus
	return &GitStatus{
		IsClean:        inMemoryStatus.IsClean,
		HasUncommitted: inMemoryStatus.HasUncommitted,
		HasUntracked:   inMemoryStatus.HasUntracked,
		Branch:         inMemoryStatus.Branch,
		ModifiedFiles:  inMemoryStatus.ModifiedFiles,
		UntrackedFiles: inMemoryStatus.UntrackedFiles,
		StagedFiles:    inMemoryStatus.StagedFiles,
	}, nil
}

// GetCurrentSHA implements GitClient interface
func (a *InMemoryGitClientAdapter) GetCurrentSHA(ctx context.Context, dir string) (string, error) {
	workspace, err := a.getWorkspace(dir)
	if err != nil {
		return "", err
	}

	return a.client.GetCurrentSHA(workspace.Repository)
}

// GetRemoteURL implements GitClient interface
func (a *InMemoryGitClientAdapter) GetRemoteURL(ctx context.Context, dir string) (string, error) {
	workspace, err := a.getWorkspace(dir)
	if err != nil {
		return "", err
	}

	return a.client.GetRemoteURL(workspace.Repository, "origin")
}

// GetCurrentBranch implements GitClient interface
func (a *InMemoryGitClientAdapter) GetCurrentBranch(ctx context.Context, dir string) (string, error) {
	workspace, err := a.getWorkspace(dir)
	if err != nil {
		return "", err
	}

	return a.client.GetCurrentBranch(workspace.Repository)
}

// CheckoutBranch implements GitClient interface
func (a *InMemoryGitClientAdapter) CheckoutBranch(ctx context.Context, dir, branch string) error {
	workspace, err := a.getWorkspace(dir)
	if err != nil {
		return err
	}

	return a.client.CheckoutBranch(workspace.Repository, branch)
}

// CreateOrphanBranch implements GitClient interface
func (a *InMemoryGitClientAdapter) CreateOrphanBranch(ctx context.Context, dir string, branch string) error {
	workspace, err := a.getWorkspace(dir)
	if err != nil {
		return err
	}

	return a.client.CreateOrphanBranch(workspace.Repository, branch)
}

// BranchExists implements GitClient interface
func (a *InMemoryGitClientAdapter) BranchExists(ctx context.Context, dir string, branch string) error {
	workspace, err := a.getWorkspace(dir)
	if err != nil {
		return err
	}

	exists := a.client.BranchExists(workspace.Repository, branch)
	if !exists {
		return fmt.Errorf("branch %s does not exist", branch)
	}
	return nil
}

// SetConfig implements GitClient interface
func (a *InMemoryGitClientAdapter) SetConfig(ctx context.Context, dir, key, value string) error {
	workspace, err := a.getWorkspace(dir)
	if err != nil {
		return err
	}

	return a.client.SetConfig(workspace.Repository, key, value)
}

// GetConfig implements GitClient interface
func (a *InMemoryGitClientAdapter) GetConfig(ctx context.Context, dir, key string) (string, error) {
	workspace, err := a.getWorkspace(dir)
	if err != nil {
		return "", err
	}

	return a.client.GetConfig(workspace.Repository, key)
}

// UnsetConfig implements GitClient interface
func (a *InMemoryGitClientAdapter) UnsetConfig(ctx context.Context, dir, key string) error {
	workspace, err := a.getWorkspace(dir)
	if err != nil {
		return err
	}

	return a.client.UnsetConfig(workspace.Repository, key)
}

// Stash implements GitClient interface
func (a *InMemoryGitClientAdapter) Stash(ctx context.Context, dir string, message string) error {
	workspace, err := a.getWorkspace(dir)
	if err != nil {
		return err
	}

	_, err = a.client.CreateStash(workspace.Repository, message)
	return err
}

// StashPop implements GitClient interface
func (a *InMemoryGitClientAdapter) StashPop(ctx context.Context, dir string) error {
	_, err := a.getWorkspace(dir)
	if err != nil {
		return err
	}

	// For simplicity, we'll implement this as a placeholder
	// In a full implementation, we'd need to track stashes
	return fmt.Errorf("stash pop not yet implemented for in-memory client")
}

// RemoveFiles implements GitClient interface
func (a *InMemoryGitClientAdapter) RemoveFiles(ctx context.Context, dir string, paths []string, recursive bool) error {
	workspace, err := a.getWorkspace(dir)
	if err != nil {
		return err
	}

	return a.client.RemoveFiles(workspace.Repository, workspace.Filesystem, paths)
}

// GetCommitHistory implements GitClient interface
func (a *InMemoryGitClientAdapter) GetCommitHistory(ctx context.Context, dir string, options *CommitHistoryOptions) ([]byte, error) {
	workspace, err := a.getWorkspace(dir)
	if err != nil {
		return nil, err
	}

	commits, err := a.client.GetCommitHistory(workspace.Repository, options)
	if err != nil {
		return nil, err
	}

	// Convert commits to byte format (simplified for now)
	var result []byte
	for _, commit := range commits {
		commitStr := fmt.Sprintf("commit %s\nAuthor: %s <%s>\nDate: %s\n\n    %s\n\n",
			commit.Hash.String(),
			commit.Author.Name,
			commit.Author.Email,
			commit.Author.When.Format(time.RFC3339),
			commit.Message)
		result = append(result, []byte(commitStr)...)
	}

	return result, nil
}

// GetCommitCount implements GitClient interface
func (a *InMemoryGitClientAdapter) GetCommitCount(ctx context.Context, dir string) (int, error) {
	workspace, err := a.getWorkspace(dir)
	if err != nil {
		return 0, err
	}

	return a.client.GetCommitCount(workspace.Repository)
}

// GetContributorCount implements GitClient interface
func (a *InMemoryGitClientAdapter) GetContributorCount(ctx context.Context, dir string) (int, error) {
	workspace, err := a.getWorkspace(dir)
	if err != nil {
		return 0, err
	}

	contributors, err := a.client.GetContributors(workspace.Repository)
	if err != nil {
		return 0, err
	}

	return len(contributors), nil
}

// GetFirstCommitDate implements GitClient interface
func (a *InMemoryGitClientAdapter) GetFirstCommitDate(ctx context.Context, dir string) (time.Time, error) {
	workspace, err := a.getWorkspace(dir)
	if err != nil {
		return time.Time{}, err
	}

	return a.client.GetFirstCommitDate(workspace.Repository)
}

// GetBranchCount implements GitClient interface
func (a *InMemoryGitClientAdapter) GetBranchCount(ctx context.Context, dir string) (int, error) {
	workspace, err := a.getWorkspace(dir)
	if err != nil {
		return 0, err
	}

	return a.client.GetBranchCount(workspace.Repository)
}

// CloneInMemory implements GitClient interface - direct pass-through
func (a *InMemoryGitClientAdapter) CloneInMemory(ctx context.Context, url string, options *CloneOptions) (*git.Repository, billy.Filesystem, error) {
	return a.client.CloneToMemory(ctx, url, options)
}

// CreateInMemoryWorkspace implements GitClient interface - direct pass-through
func (a *InMemoryGitClientAdapter) CreateInMemoryWorkspace() (*git.Repository, billy.Filesystem, error) {
	return a.client.CreateWorkspace()
}

// PushFromMemory implements GitClient interface - direct pass-through
func (a *InMemoryGitClientAdapter) PushFromMemory(ctx context.Context, repo *git.Repository, options *PushOptions) error {
	return a.client.PushChanges(ctx, repo, options)
}

// getWorkspace retrieves or creates a workspace for the given directory
func (a *InMemoryGitClientAdapter) getWorkspace(dir string) (*InMemoryWorkspace, error) {
	a.mutex.RLock()
	if a.workspaces == nil {
		a.workspaces = make(map[string]*InMemoryWorkspace)
	}
	workspace, exists := a.workspaces[dir]
	a.mutex.RUnlock()

	if exists {
		return workspace, nil
	}

	// If workspace doesn't exist, try to create one
	// This handles cases where the directory is expected to be a git repository
	a.mutex.Lock()
	defer a.mutex.Unlock()

	// Check if it's a real directory with a .git folder
	if _, err := os.Stat(filepath.Join(dir, ".git")); err == nil {
		// This is a real git repository, we need to clone it to memory
		// For now, we'll create an empty workspace and let the caller handle the setup
		workspace, err := NewInMemoryWorkspace()
		if err != nil {
			return nil, fmt.Errorf("failed to create in-memory workspace for %s: %w", dir, err)
		}
		a.workspaces[dir] = workspace
		return workspace, nil
	}

	// Create a new empty workspace
	workspace, err := NewInMemoryWorkspace()
	if err != nil {
		return nil, fmt.Errorf("failed to create in-memory workspace for %s: %w", dir, err)
	}

	a.workspaces[dir] = workspace
	return workspace, nil
}

// GetWorkspace provides access to the underlying workspace for advanced operations
func (a *InMemoryGitClientAdapter) GetWorkspace(dir string) (*InMemoryWorkspace, error) {
	return a.getWorkspace(dir)
}

// WriteFile provides a convenience method to write files to the workspace
func (a *InMemoryGitClientAdapter) WriteFile(dir, path string, content []byte) error {
	workspace, err := a.getWorkspace(dir)
	if err != nil {
		return err
	}

	return a.client.WriteFile(workspace.Filesystem, path, content, 0644)
}

// ReadFile provides a convenience method to read files from the workspace
func (a *InMemoryGitClientAdapter) ReadFile(dir, path string) ([]byte, error) {
	workspace, err := a.getWorkspace(dir)
	if err != nil {
		return nil, err
	}

	return a.client.ReadFile(workspace.Filesystem, path)
}
package git

import (
	"context"
	"time"

	"github.com/go-git/go-billy/v5"
	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/config"
	"github.com/go-git/go-git/v5/plumbing/object"
)

// InMemoryGitClient provides pure in-memory Git operations without any disk I/O
// This interface eliminates all dependencies on temporary directories and command-line git
type InMemoryGitClient interface {
	// Repository Management
	CreateWorkspace() (*git.Repository, billy.Filesystem, error)
	CloneToMemory(ctx context.Context, url string, options *CloneOptions) (*git.Repository, billy.Filesystem, error)

	// Basic Git Operations (all in-memory)
	AddFiles(repo *git.Repository, fs billy.Filesystem, files []string) error
	CommitChanges(repo *git.Repository, message string, options *CommitOptions) (*object.Commit, error)
	PullChanges(ctx context.Context, repo *git.Repository, options *PullOptions) error
	PushChanges(ctx context.Context, repo *git.Repository, options *PushOptions) error

	// Status and Information (in-memory)
	GetStatus(repo *git.Repository) (*InMemoryGitStatus, error)
	GetCurrentSHA(repo *git.Repository) (string, error)
	GetCurrentBranch(repo *git.Repository) (string, error)
	GetRemoteURL(repo *git.Repository, remoteName string) (string, error)

	// Branch Operations (in-memory)
	CheckoutBranch(repo *git.Repository, branch string) error
	CreateBranch(repo *git.Repository, branch string) error
	CreateOrphanBranch(repo *git.Repository, branch string) error
	BranchExists(repo *git.Repository, branch string) bool
	ListBranches(repo *git.Repository) ([]*BranchInfo, error)

	// Configuration (in-memory)
	SetConfig(repo *git.Repository, key, value string) error
	GetConfig(repo *git.Repository, key string) (string, error)
	UnsetConfig(repo *git.Repository, key string) error
	GetAllConfig(repo *git.Repository) (*config.Config, error)

	// File Operations (in-memory)
	WriteFile(fs billy.Filesystem, path string, content []byte, mode uint32) error
	ReadFile(fs billy.Filesystem, path string) ([]byte, error)
	RemoveFiles(repo *git.Repository, fs billy.Filesystem, paths []string) error
	ListFiles(fs billy.Filesystem, pattern string) ([]string, error)

	// Advanced Operations (in-memory)
	CreateStash(repo *git.Repository, message string) (*object.Commit, error)
	ApplyStash(repo *git.Repository, stashCommit *object.Commit) error
	ListStashes(repo *git.Repository) ([]*StashInfo, error)

	// Analytics Operations (in-memory)
	GetCommitHistory(repo *git.Repository, options *CommitHistoryOptions) ([]*object.Commit, error)
	GetCommitCount(repo *git.Repository) (int, error)
	GetContributors(repo *git.Repository) ([]*ContributorInfo, error)
	GetFirstCommitDate(repo *git.Repository) (time.Time, error)
	GetBranchCount(repo *git.Repository) (int, error)

	// Remote Operations (in-memory)
	AddRemote(repo *git.Repository, name, url string) error
	RemoveRemote(repo *git.Repository, name string) error
	ListRemotes(repo *git.Repository) ([]*RemoteInfo, error)
}

// InMemoryGitStatus represents the status of an in-memory Git repository
type InMemoryGitStatus struct {
	IsClean        bool
	HasUncommitted bool
	HasUntracked   bool
	Branch         string
	ModifiedFiles  []string
	UntrackedFiles []string
	StagedFiles    []string
	Ahead          int
	Behind         int
}

// PullOptions represents options for in-memory pull operation
type PullOptions struct {
	RemoteName    string
	ReferenceName string
	SingleBranch  bool
	Timeout       time.Duration
}

// BranchInfo represents information about a Git branch
type BranchInfo struct {
	Name      string
	IsRemote  bool
	IsCurrent bool
	Hash      string
}

// StashInfo represents information about a Git stash
type StashInfo struct {
	Index   int
	Message string
	Hash    string
	Date    time.Time
}

// ContributorInfo represents information about a Git contributor
type ContributorInfo struct {
	Name        string
	Email       string
	CommitCount int
	FirstCommit time.Time
	LastCommit  time.Time
}

// RemoteInfo represents information about a Git remote
type RemoteInfo struct {
	Name string
	URLs []string
}

// InMemoryWorkspace represents a complete in-memory Git workspace
type InMemoryWorkspace struct {
	Repository *git.Repository
	Filesystem billy.Filesystem
	Config     *config.Config
	Client     InMemoryGitClient
}

// NewInMemoryWorkspace creates a new in-memory Git workspace
func NewInMemoryWorkspace() (*InMemoryWorkspace, error) {
	client := NewInMemoryGitClient()
	repo, fs, err := client.CreateWorkspace()
	if err != nil {
		return nil, err
	}

	cfg, err := client.GetAllConfig(repo)
	if err != nil {
		return nil, err
	}

	return &InMemoryWorkspace{
		Repository: repo,
		Filesystem: fs,
		Config:     cfg,
		Client:     client,
	}, nil
}

// Clone creates a new in-memory workspace from a remote repository
func (w *InMemoryWorkspace) Clone(ctx context.Context, url string, options *CloneOptions) error {
	repo, fs, err := w.Client.CloneToMemory(ctx, url, options)
	if err != nil {
		return err
	}

	w.Repository = repo
	w.Filesystem = fs

	// Update config
	cfg, err := w.Client.GetAllConfig(repo)
	if err != nil {
		return err
	}
	w.Config = cfg

	return nil
}

// WriteFileWithCommit writes a file and commits the change in one operation
func (w *InMemoryWorkspace) WriteFileWithCommit(path string, content []byte, message string) (*object.Commit, error) {
	// Write file
	if err := w.Client.WriteFile(w.Filesystem, path, content, 0644); err != nil {
		return nil, err
	}

	// Add file
	if err := w.Client.AddFiles(w.Repository, w.Filesystem, []string{path}); err != nil {
		return nil, err
	}

	// Commit with default author for testing
	commitOptions := &CommitOptions{
		Author: &CommitAuthor{
			Name:  "Test User",
			Email: "test@example.com",
		},
	}
	return w.Client.CommitChanges(w.Repository, message, commitOptions)
}

// PushToRemote pushes changes to the remote repository
func (w *InMemoryWorkspace) PushToRemote(ctx context.Context, remoteName string) error {
	options := &PushOptions{
		Remote:  remoteName,
		Timeout: 30 * time.Second,
	}
	return w.Client.PushChanges(ctx, w.Repository, options)
}

// GetFilesSnapshot returns a snapshot of all files in the workspace
func (w *InMemoryWorkspace) GetFilesSnapshot() (map[string][]byte, error) {
	files := make(map[string][]byte)

	// Simple recursive directory traversal
	var walkDir func(string) error
	walkDir = func(dirPath string) error {
		entries, err := w.Filesystem.ReadDir(dirPath)
		if err != nil {
			return err
		}

		for _, entry := range entries {
			var fullPath string
			if dirPath == "" || dirPath == "." {
				fullPath = entry.Name()
			} else {
				fullPath = dirPath + "/" + entry.Name()
			}
			if entry.IsDir() {
				err = walkDir(fullPath)
				if err != nil {
					return err
				}
			} else {
				content, err := w.Client.ReadFile(w.Filesystem, fullPath)
				if err != nil {
					continue // Skip files that can't be read
				}
				files[fullPath] = content
			}
		}
		return nil
	}

	if err := walkDir(""); err != nil {
		return nil, err
	}

	return files, nil
}

package git

import (
	"context"
	"time"

	"github.com/go-git/go-billy/v5"
	"github.com/go-git/go-git/v5"
)

// GitClient provides an interface for Git operations
type GitClient interface {
	// Basic Git operations
	Clone(ctx context.Context, url, dir string, options *CloneOptions) error
	Pull(ctx context.Context, dir string) error
	Push(ctx context.Context, dir string, options *PushOptions) error
	Add(ctx context.Context, dir string, files []string) error
	Commit(ctx context.Context, dir string, message string, options *CommitOptions) error
	Status(ctx context.Context, dir string) (*GitStatus, error)

	// Information retrieval
	GetCurrentSHA(ctx context.Context, dir string) (string, error)
	GetRemoteURL(ctx context.Context, dir string) (string, error)
	GetCurrentBranch(ctx context.Context, dir string) (string, error)

	// Branch operations
	CheckoutBranch(ctx context.Context, dir, branch string) error
	CreateOrphanBranch(ctx context.Context, dir string, branch string) error
	BranchExists(ctx context.Context, dir string, branch string) error

	// Configuration
	SetConfig(ctx context.Context, dir, key, value string) error
	GetConfig(ctx context.Context, dir, key string) (string, error)
	UnsetConfig(ctx context.Context, dir, key string) error

	// Advanced operations
	Stash(ctx context.Context, dir string, message string) error
	StashPop(ctx context.Context, dir string) error
	RemoveFiles(ctx context.Context, dir string, paths []string, recursive bool) error

	// Analytics Operations
	GetCommitHistory(ctx context.Context, dir string, options *CommitHistoryOptions) ([]byte, error)
	GetCommitCount(ctx context.Context, dir string) (int, error)
	GetContributorCount(ctx context.Context, dir string) (int, error)
	GetFirstCommitDate(ctx context.Context, dir string) (time.Time, error)
	GetBranchCount(ctx context.Context, dir string) (int, error)

	// In-Memory Operations (go-git based)
	CloneInMemory(ctx context.Context, url string, options *CloneOptions) (*git.Repository, billy.Filesystem, error)
	CreateInMemoryWorkspace() (*git.Repository, billy.Filesystem, error)
	PushFromMemory(ctx context.Context, repo *git.Repository, options *PushOptions) error
}

// CloneOptions represents options for git clone operation
type CloneOptions struct {
	Depth        int
	SingleBranch bool
	Branch       string
	Bare         bool
	Timeout      time.Duration
}

// PushOptions represents options for git push operation
type PushOptions struct {
	Remote  string
	Branch  string
	Force   bool
	Timeout time.Duration
}

// CommitOptions represents options for git commit operation
type CommitOptions struct {
	Author     *CommitAuthor
	AllowEmpty bool
}

// CommitAuthor represents a commit author
type CommitAuthor struct {
	Name  string
	Email string
}

// GitStatus represents the status of a Git repository
type GitStatus struct {
	IsClean        bool
	HasUncommitted bool
	HasUntracked   bool
	Branch         string
	ModifiedFiles  []string
	UntrackedFiles []string
	StagedFiles    []string
}

// CommitHistoryOptions represents options for getting commit history
type CommitHistoryOptions struct {
	Since      *time.Time
	MaxCommits int
	Format     string
	NumStat    bool
}

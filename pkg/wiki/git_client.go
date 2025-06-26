package wiki

import (
	"context"
	"time"
)

// GitClient defines the interface for Git operations
// This abstracts the actual Git implementation to support testing and different Git backends
type GitClient interface {
	// Repository Operations
	Clone(ctx context.Context, url, dir string, options *CloneOptions) error
	Pull(ctx context.Context, dir string) error
	Push(ctx context.Context, dir string, options *PushOptions) error

	// File Operations
	Add(ctx context.Context, dir string, files []string) error
	Commit(ctx context.Context, dir string, message string, options *CommitOptions) error

	// Status and Information
	Status(ctx context.Context, dir string) (*GitStatus, error)
	GetCurrentSHA(ctx context.Context, dir string) (string, error)
	GetRemoteURL(ctx context.Context, dir string) (string, error)

	// Branch Operations
	GetCurrentBranch(ctx context.Context, dir string) (string, error)
	CheckoutBranch(ctx context.Context, dir string, branch string) error

	// Configuration
	SetConfig(ctx context.Context, dir string, key, value string) error
	GetConfig(ctx context.Context, dir string, key string) (string, error)
}

// CloneOptions contains options for Git clone operations
type CloneOptions struct {
	Depth        int
	Branch       string
	SingleBranch bool
	Bare         bool
	Timeout      time.Duration
}

// PushOptions contains options for Git push operations
type PushOptions struct {
	Remote  string
	Branch  string
	Force   bool
	Timeout time.Duration
}

// CommitOptions contains options for Git commit operations
type CommitOptions struct {
	Author     *GitAuthor
	Committer  *GitAuthor
	SignOff    bool
	AllowEmpty bool
}

// GitAuthor represents a Git author or committer
type GitAuthor struct {
	Name  string
	Email string
	When  time.Time
}

// GitStatus represents the current status of a Git repository
type GitStatus struct {
	IsClean        bool
	HasUncommitted bool
	HasUntracked   bool
	ModifiedFiles  []string
	UntrackedFiles []string
	StagedFiles    []string
	Branch         string
	Ahead          int
	Behind         int
}

// NewDefaultCloneOptions creates default clone options for Wiki repositories
func NewDefaultCloneOptions() *CloneOptions {
	return &CloneOptions{
		Depth:        1,
		Branch:       "master",
		SingleBranch: true,
		Bare:         false,
		Timeout:      30 * time.Second,
	}
}

// NewDefaultPushOptions creates default push options
func NewDefaultPushOptions() *PushOptions {
	return &PushOptions{
		Remote:  "origin",
		Branch:  "master",
		Force:   false,
		Timeout: 30 * time.Second,
	}
}

// NewDefaultCommitOptions creates default commit options for Beaver
func NewDefaultCommitOptions() *CommitOptions {
	return &CommitOptions{
		Author: &GitAuthor{
			Name:  "Beaver AI",
			Email: "noreply@beaver.ai",
			When:  time.Now(),
		},
		Committer: &GitAuthor{
			Name:  "Beaver AI",
			Email: "noreply@beaver.ai",
			When:  time.Now(),
		},
		SignOff:    false,
		AllowEmpty: false,
	}
}

package wiki

import (
	"github.com/nyasuto/beaver/pkg/git"
)

// GitClient is an alias for the git.GitClient interface
type GitClient = git.GitClient

// Type aliases for git package types used by wiki package
type CloneOptions = git.CloneOptions
type PushOptions = git.PushOptions
type CommitOptions = git.CommitOptions
type CommitAuthor = git.CommitAuthor
type GitStatus = git.GitStatus
type CommitHistoryOptions = git.CommitHistoryOptions

// NewCmdGitClient creates a new command-line Git client
func NewCmdGitClient() (GitClient, error) {
	return git.NewCmdGitClient()
}

// Helper functions for creating default options

// NewDefaultCommitOptions creates default commit options
func NewDefaultCommitOptions() *CommitOptions {
	return &CommitOptions{
		Author:     nil,
		AllowEmpty: false,
	}
}

// NewDefaultPushOptions creates default push options
func NewDefaultPushOptions() *PushOptions {
	return &PushOptions{
		Remote: "origin",
		Branch: "",
		Force:  false,
	}
}

// IsGitRepository checks if directory is a git repository
func IsGitRepository(dir string) bool {
	return git.IsGitRepository(dir)
}

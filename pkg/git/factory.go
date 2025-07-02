package git

import (
	"fmt"
	"os"
)

// GitClientType represents the type of Git client to use
type GitClientType string

const (
	// ClientTypeCmd uses command-line git
	ClientTypeCmd GitClientType = "cmd"
	// ClientTypeGoGit uses go-git library
	ClientTypeGoGit GitClientType = "gogit"
)

// NewGitClient creates a new Git client based on the specified type
func NewGitClient(clientType GitClientType) (GitClient, error) {
	switch clientType {
	case ClientTypeCmd:
		return NewCmdGitClient()
	case ClientTypeGoGit:
		return NewGoGitClient(), nil
	default:
		return nil, fmt.Errorf("unsupported Git client type: %s", clientType)
	}
}

// NewGitClientWithAuth creates a new Git client with authentication
func NewGitClientWithAuth(clientType GitClientType, token string) (GitClient, error) {
	switch clientType {
	case ClientTypeCmd:
		// Command-line client uses environment variables for auth
		if token != "" {
			os.Setenv("GITHUB_TOKEN", token)
		}
		return NewCmdGitClient()
	case ClientTypeGoGit:
		return NewGoGitClientWithAuth(token), nil
	default:
		return nil, fmt.Errorf("unsupported Git client type: %s", clientType)
	}
}

// NewDefaultGitClient creates a Git client with default configuration
// Defaults to go-git for new installations, with fallback to cmd
func NewDefaultGitClient() (GitClient, error) {
	// Try go-git first as it's the preferred implementation
	client := NewGoGitClient()
	return client, nil
}

// NewDefaultGitClientWithAuth creates a Git client with authentication using default configuration
func NewDefaultGitClientWithAuth(token string) (GitClient, error) {
	// Try go-git first as it's the preferred implementation
	client := NewGoGitClientWithAuth(token)
	return client, nil
}

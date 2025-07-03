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
	// ClientTypeInMemory uses pure in-memory git operations
	ClientTypeInMemory GitClientType = "inmemory"
)

// NewGitClient creates a new Git client based on the specified type
func NewGitClient(clientType GitClientType) (GitClient, error) {
	switch clientType {
	case ClientTypeCmd:
		return NewCmdGitClient()
	case ClientTypeGoGit:
		return NewGoGitClient(), nil
	case ClientTypeInMemory:
		return NewInMemoryGitClientAdapter(), nil
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
	case ClientTypeInMemory:
		return NewInMemoryGitClientAdapterWithAuth(token), nil
	default:
		return nil, fmt.Errorf("unsupported Git client type: %s", clientType)
	}
}

// NewDefaultGitClient creates a Git client with default configuration
// Defaults to InMemory for high performance, with fallback to go-git
func NewDefaultGitClient() (GitClient, error) {
	// Use InMemoryGitClient as the preferred implementation for performance
	client := NewInMemoryGitClientAdapter()
	return client, nil
}

// NewDefaultGitClientWithAuth creates a Git client with authentication using default configuration
func NewDefaultGitClientWithAuth(token string) (GitClient, error) {
	// Use InMemoryGitClient as the preferred implementation for performance
	client := NewInMemoryGitClientAdapterWithAuth(token)
	return client, nil
}

// NewInMemoryGitClientAdapter creates an adapter that wraps InMemoryGitClient to match GitClient interface
func NewInMemoryGitClientAdapter() GitClient {
	return &InMemoryGitClientAdapter{
		client: NewInMemoryGitClient(),
	}
}

// NewInMemoryGitClientAdapterWithAuth creates an adapter with authentication
func NewInMemoryGitClientAdapterWithAuth(token string) GitClient {
	return &InMemoryGitClientAdapter{
		client: NewInMemoryGitClientWithAuth(token),
	}
}

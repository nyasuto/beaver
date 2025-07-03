package git

import (
	"fmt"
	"os"
	"path/filepath"
)

// GitClientType represents the type of Git client to use
type GitClientType string

const (
	// ClientTypeInMemory uses pure in-memory git operations
	ClientTypeInMemory GitClientType = "inmemory"
)

// NewGitClient creates a new Git client based on the specified type
func NewGitClient(clientType GitClientType) (GitClient, error) {
	switch clientType {
	case ClientTypeInMemory:
		return NewInMemoryGitClientAdapter(), nil
	default:
		return nil, fmt.Errorf("unsupported Git client type: %s", clientType)
	}
}

// NewGitClientWithAuth creates a new Git client with authentication
func NewGitClientWithAuth(clientType GitClientType, token string) (GitClient, error) {
	switch clientType {
	case ClientTypeInMemory:
		return NewInMemoryGitClientAdapterWithAuth(token), nil
	default:
		return nil, fmt.Errorf("unsupported Git client type: %s", clientType)
	}
}

// NewDefaultGitClient creates a Git client with default configuration
// Uses high-performance InMemory implementation
func NewDefaultGitClient() (GitClient, error) {
	client := NewInMemoryGitClientAdapter()
	return client, nil
}

// NewDefaultGitClientWithAuth creates a Git client with authentication using default configuration
func NewDefaultGitClientWithAuth(token string) (GitClient, error) {
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

// IsGitRepository checks if directory is a git repository
func IsGitRepository(dir string) bool {
	// Check if .git directory exists
	gitDir := filepath.Join(dir, ".git")
	if info, err := os.Stat(gitDir); err == nil {
		return info.IsDir()
	}
	return false
}

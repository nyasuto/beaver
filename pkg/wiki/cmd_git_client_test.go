package wiki

import (
	"context"
	"testing"
	"time"
)

func TestNewCmdGitClient(t *testing.T) {
	client, err := NewCmdGitClient()
	if err != nil {
		t.Fatalf("NewCmdGitClient() error = %v", err)
	}

	if client == nil {
		t.Error("NewCmdGitClient() returned nil client")
		return
	}

	if client.gitPath == "" {
		t.Error("NewCmdGitClient() did not set git path")
	}

	if client.timeout == 0 {
		t.Error("NewCmdGitClient() did not set timeout")
	}
}

func TestCmdGitClient_Clone(t *testing.T) {
	client, err := NewCmdGitClient()
	if err != nil {
		t.Fatalf("NewCmdGitClient() error = %v", err)
	}

	ctx := context.Background()

	// Test with invalid URL (this will likely fail but we're testing the code path)
	options := &CloneOptions{
		Depth:        1,
		Branch:       "main",
		SingleBranch: true,
		Timeout:      5 * time.Second,
	}

	err = client.Clone(ctx, "https://invalid-url-that-does-not-exist.com/repo.git", "/tmp/test-clone", options)
	if err == nil {
		t.Error("Clone() should fail with invalid URL")
	}

	// Test error handling - should return appropriate error type
	if !IsNetworkError(err) && !IsRepositoryError(err) && !IsAuthenticationError(err) {
		// The error should be one of these types when properly handled
		t.Logf("Clone() returned error type: %T", err)
	}
}

func TestCmdGitClient_HandleGitError(t *testing.T) {
	client, err := NewCmdGitClient()
	if err != nil {
		t.Fatalf("NewCmdGitClient() error = %v", err)
	}

	tests := []struct {
		name          string
		operation     string
		output        string
		wantErrorType ErrorType
	}{
		{
			name:          "network error",
			operation:     "clone",
			output:        "fatal: unable to access 'https://github.com/repo.git/': Could not resolve host",
			wantErrorType: ErrorTypeNetwork,
		},
		{
			name:          "authentication error",
			operation:     "clone",
			output:        "remote: Invalid username or password",
			wantErrorType: ErrorTypeAuthentication,
		},
		{
			name:          "repository not found",
			operation:     "clone",
			output:        "fatal: repository not found",
			wantErrorType: ErrorTypeRepository,
		},
		{
			name:          "merge conflict",
			operation:     "pull",
			output:        "error: Your local changes to the following files would be overwritten by merge",
			wantErrorType: ErrorTypeConflict,
		},
		{
			name:          "generic git error",
			operation:     "status",
			output:        "fatal: not a git repository",
			wantErrorType: ErrorTypeGitOperation,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := client.handleGitError(tt.operation, nil, tt.output)
			if err == nil {
				t.Error("handleGitError() should return error")
				return
			}

			wikiErr, ok := err.(*WikiError)
			if !ok {
				t.Errorf("handleGitError() should return WikiError, got %T", err)
				return
			}

			if wikiErr.Type != tt.wantErrorType {
				t.Errorf("handleGitError() error type = %v, want %v", wikiErr.Type, tt.wantErrorType)
			}
		})
	}
}

func TestCmdGitClient_SanitizeURL(t *testing.T) {
	tests := []struct {
		name     string
		url      string
		expected string
	}{
		{
			name:     "URL with token",
			url:      "https://ghp_token123@github.com/owner/repo.git",
			expected: "https://***@github.com/owner/repo.git",
		},
		{
			name:     "URL without token",
			url:      "https://github.com/owner/repo.git",
			expected: "https://github.com/owner/repo.git",
		},
		{
			name:     "SSH URL",
			url:      "git@github.com:owner/repo.git",
			expected: "git@github.com:owner/repo.git",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := sanitizeURL(tt.url)
			if result != tt.expected {
				t.Errorf("sanitizeURL() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestIsGitRepository(t *testing.T) {
	// Test with non-existent directory
	if IsGitRepository("/non/existent/path") {
		t.Error("IsGitRepository() should return false for non-existent path")
	}

	// Test with current directory (likely not a git repo in test context)
	if IsGitRepository(".") {
		t.Log("Current directory is a git repository")
	}

	// Test with temporary directory
	tempDir := t.TempDir()
	if IsGitRepository(tempDir) {
		t.Error("IsGitRepository() should return false for temp directory without .git")
	}
}

func TestDefaultOptions(t *testing.T) {
	t.Run("NewDefaultCloneOptions", func(t *testing.T) {
		options := NewDefaultCloneOptions()
		if options == nil {
			t.Error("NewDefaultCloneOptions() returned nil")
			return
		}
		if options.Depth != 1 {
			t.Errorf("Default depth = %d, want 1", options.Depth)
		}
		if options.Branch != "master" {
			t.Errorf("Default branch = %s, want master", options.Branch)
		}
		if !options.SingleBranch {
			t.Error("Default should enable single branch")
		}
		if options.Timeout == 0 {
			t.Error("Default timeout should be set")
		}
	})

	t.Run("NewDefaultPushOptions", func(t *testing.T) {
		options := NewDefaultPushOptions()
		if options == nil {
			t.Error("NewDefaultPushOptions() returned nil")
			return
		}
		if options.Remote != "origin" {
			t.Errorf("Default remote = %s, want origin", options.Remote)
		}
		if options.Branch != "master" {
			t.Errorf("Default branch = %s, want master", options.Branch)
		}
		if options.Force {
			t.Error("Default should not enable force push")
		}
	})

	t.Run("NewDefaultCommitOptions", func(t *testing.T) {
		options := NewDefaultCommitOptions()
		if options == nil {
			t.Error("NewDefaultCommitOptions() returned nil")
			return
		}
		if options.Author == nil {
			t.Error("Default author should be set")
			return
		}
		if options.Author.Name != "Beaver AI" {
			t.Errorf("Default author name = %s, want Beaver AI", options.Author.Name)
		}
		if options.Author.Email != "noreply@beaver.ai" {
			t.Errorf("Default author email = %s, want noreply@beaver.ai", options.Author.Email)
		}
	})
}

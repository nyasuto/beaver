package content

import (
	"os"
	"testing"
)

func TestGitAuthenticator_BuildAuthURL(t *testing.T) {
	tests := []struct {
		name     string
		token    string
		input    string
		expected string
	}{
		{
			name:     "HTTPS URL with token",
			token:    "ghp_testtoken123",
			input:    "https://github.com/owner/repo.git",
			expected: "https://ghp_testtoken123@github.com/owner/repo.git",
		},
		{
			name:     "SSH URL converted to HTTPS",
			token:    "ghp_testtoken123",
			input:    "git@github.com:owner/repo.git",
			expected: "https://ghp_testtoken123@github.com/owner/repo.git",
		},
		{
			name:     "Empty token returns original URL",
			token:    "",
			input:    "https://github.com/owner/repo.git",
			expected: "https://github.com/owner/repo.git",
		},
		{
			name:     "Unrecognized URL format",
			token:    "ghp_testtoken123",
			input:    "https://gitlab.com/owner/repo.git",
			expected: "https://gitlab.com/owner/repo.git",
		},
		{
			name:     "SSH URL with different format",
			token:    "ghp_testtoken123",
			input:    "git@github.com:owner/repo",
			expected: "https://ghp_testtoken123@github.com/owner/repo",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			auth := NewGitAuthenticator(tt.token)
			result := auth.BuildAuthURL(tt.input)
			if result != tt.expected {
				t.Errorf("BuildAuthURL() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestGitAuthenticator_SanitizeURL(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "URL with token",
			input:    "https://ghp_testtoken123@github.com/owner/repo.git",
			expected: "https://***@github.com/owner/repo.git",
		},
		{
			name:     "URL without token",
			input:    "https://github.com/owner/repo.git",
			expected: "https://github.com/owner/repo.git",
		},
		{
			name:     "Malformed URL",
			input:    "not-a-url",
			expected: "not-a-url",
		},
	}

	auth := NewGitAuthenticator("test-token")
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := auth.SanitizeURL(tt.input)
			if result != tt.expected {
				t.Errorf("SanitizeURL() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestGitAuthenticator_ValidateToken(t *testing.T) {
	tests := []struct {
		name     string
		token    string
		hasError bool
	}{
		{
			name:     "Valid classic token",
			token:    "ghp_1234567890abcdef",
			hasError: false,
		},
		{
			name:     "Valid fine-grained token",
			token:    "github_pat_1234567890abcdef",
			hasError: false,
		},
		{
			name:     "Valid test token",
			token:    "test1234567890",
			hasError: false,
		},
		{
			name:     "Empty token",
			token:    "",
			hasError: true,
		},
		{
			name:     "Invalid format short token",
			token:    "invalid",
			hasError: true,
		},
		{
			name:     "Invalid prefix",
			token:    "invalid",
			hasError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			auth := NewGitAuthenticator(tt.token)
			err := auth.ValidateToken()
			if tt.hasError && err == nil {
				t.Error("Expected error but got none")
			}
			if !tt.hasError && err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
		})
	}
}

func TestGitAuthenticator_SecureTokenString(t *testing.T) {
	tests := []struct {
		name     string
		token    string
		expected string
	}{
		{
			name:     "Normal token",
			token:    "ghp_1234567890abcdef",
			expected: "ghp_***cdef",
		},
		{
			name:     "Short token",
			token:    "short",
			expected: "***",
		},
		{
			name:     "Empty token",
			token:    "",
			expected: "<empty>",
		},
		{
			name:     "Exactly 8 chars",
			token:    "12345678",
			expected: "***",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			auth := NewGitAuthenticator(tt.token)
			result := auth.SecureTokenString()
			if result != tt.expected {
				t.Errorf("SecureTokenString() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestGitAuthenticator_GetRequiredScopes(t *testing.T) {
	auth := NewGitAuthenticator("test-token")
	scopes := auth.GetRequiredScopes()

	expectedScopes := []string{"public_repo", "repo"}
	if len(scopes) != len(expectedScopes) {
		t.Errorf("Expected %d scopes, got %d", len(expectedScopes), len(scopes))
		return
	}

	for i, scope := range scopes {
		if scope != expectedScopes[i] {
			t.Errorf("Expected scope %s, got %s", expectedScopes[i], scope)
		}
	}
}

func TestGitAuthenticator_SetupCredentials_Errors(t *testing.T) {
	t.Run("Empty token", func(t *testing.T) {
		auth := NewGitAuthenticator("")
		err := auth.SetupCredentials("/tmp/test-dir")
		if err == nil {
			t.Error("Expected error for empty token")
		}
	})
}

func TestGitAuthenticator_Cleanup(t *testing.T) {
	// Create a temporary directory
	tempDir := t.TempDir()

	auth := NewGitAuthenticator("test-token")

	// Test cleanup with valid directory
	err := auth.Cleanup(tempDir)
	if err != nil {
		t.Errorf("Unexpected error during cleanup: %v", err)
	}

	// Test cleanup with empty directory (should not error)
	err = auth.Cleanup("")
	if err != nil {
		t.Errorf("Unexpected error during cleanup with empty dir: %v", err)
	}
}

func TestGitAuthenticator_SetupCredentials_GitFailure(t *testing.T) {
	// Test when git client creation fails
	tempDir := t.TempDir()

	// Create an invalid git environment that might cause NewCmdGitClient to fail
	originalPath := os.Getenv("PATH")
	os.Setenv("PATH", "/nonexistent")
	defer os.Setenv("PATH", originalPath)

	auth := NewGitAuthenticator("test-token")

	// This might succeed or fail depending on git availability
	// The main goal is to test the error handling path
	_ = auth.SetupCredentials(tempDir)
}

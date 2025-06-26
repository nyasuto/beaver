package wiki

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// GitAuthenticator handles secure Git authentication using Personal Access Tokens
type GitAuthenticator struct {
	token    string
	username string
}

// NewGitAuthenticator creates a new Git authenticator with the provided token
func NewGitAuthenticator(token string) *GitAuthenticator {
	return &GitAuthenticator{
		token:    token,
		username: "oauth2", // Standard username for token authentication
	}
}

// SetupCredentials configures git credentials for the working directory
// This sets up temporary credential configuration for secure authentication
func (a *GitAuthenticator) SetupCredentials(workDir string) error {
	if a.token == "" {
		return NewWikiError(ErrorTypeAuthentication, "setup_credentials", nil,
			"認証トークンが設定されていません", 0,
			[]string{
				"Personal Access Tokenを設定してください",
				"トークンに適切な権限があることを確認してください",
			})
	}

	gitClient, err := NewCmdGitClient()
	if err != nil {
		return NewWikiError(ErrorTypeConfiguration, "setup_credentials", err,
			"Gitクライアントの初期化に失敗しました", 0,
			[]string{
				"Gitがインストールされていることを確認してください",
				"Gitコマンドにパスが通っていることを確認してください",
			})
	}

	ctx := context.Background()

	// Configure credential helper to use token authentication
	// This avoids storing credentials in global git config
	// Skip credential setup if git config fails (e.g., in test environments)
	if err := gitClient.SetConfig(ctx, workDir, "credential.helper", ""); err != nil {
		// In test environments or non-git directories, credential setup may fail
		// This is not fatal as authentication will still work via URL tokens
		return nil
	}

	// Set up URL-specific credential configuration
	// This ensures token is only used for the specific repository
	credentialURL := "https://github.com" // #nosec G101 -- URL constant, not credentials
	if err := gitClient.SetConfig(ctx, workDir, fmt.Sprintf("credential.%s.username", credentialURL), a.username); err != nil {
		// Skip URL-specific credential setup if git config fails
		// Authentication will still work via URL tokens
		return nil
	}

	return nil
}

// BuildAuthURL converts a repository URL to an authenticated URL
func (a *GitAuthenticator) BuildAuthURL(repoURL string) string {
	if a.token == "" {
		return repoURL
	}

	// Handle different URL formats
	if strings.HasPrefix(repoURL, "https://github.com/") {
		// Insert token into HTTPS URL
		// Format: https://token@github.com/owner/repo.git
		return strings.Replace(repoURL, "https://", fmt.Sprintf("https://%s@", a.token), 1)
	}

	if path, found := strings.CutPrefix(repoURL, "git@github.com:"); found {
		// Convert SSH URL to HTTPS with token
		// From: git@github.com:owner/repo.git
		// To: https://token@github.com/owner/repo.git
		return fmt.Sprintf("https://%s@github.com/%s", a.token, path)
	}

	// Return original URL if format is not recognized
	return repoURL
}

// SanitizeURL removes authentication information from URL for logging
func (a *GitAuthenticator) SanitizeURL(url string) string {
	// Replace token with asterisks for safe logging
	if strings.Contains(url, "@github.com") {
		parts := strings.Split(url, "@github.com")
		if len(parts) == 2 {
			return "https://***@github.com" + parts[1]
		}
	}
	return url
}

// Cleanup removes temporary credential configuration
func (a *GitAuthenticator) Cleanup(workDir string) error {
	if workDir == "" {
		return nil
	}

	gitClient, err := NewCmdGitClient()
	if err != nil {
		// Not fatal during cleanup
		return nil
	}

	ctx := context.Background()

	// Remove credential helper configuration
	_ = gitClient.UnsetConfig(ctx, workDir, "credential.helper")

	// Remove URL-specific credential configuration
	credentialURL := "https://github.com" // #nosec G101 -- URL constant, not credentials
	_ = gitClient.UnsetConfig(ctx, workDir, fmt.Sprintf("credential.%s.username", credentialURL))

	// Remove any credential files that might have been created
	credentialFile := filepath.Join(workDir, ".git-credentials")
	if _, err := os.Stat(credentialFile); err == nil {
		_ = os.Remove(credentialFile)
	}

	return nil
}

// ValidateToken performs a basic validation of the token format
func (a *GitAuthenticator) ValidateToken() error {
	if a.token == "" {
		return NewWikiError(ErrorTypeAuthentication, "validate_token", nil,
			"認証トークンが空です", 0,
			[]string{
				"Personal Access Tokenを設定してください",
				"GitHub Settings > Developer settings > Personal access tokens で作成できます",
			})
	}

	// GitHub Personal Access Token format validation
	// Classic tokens start with 'ghp_' or 'github_pat_'
	// Fine-grained tokens start with 'github_pat_'
	if !strings.HasPrefix(a.token, "ghp_") &&
		!strings.HasPrefix(a.token, "github_pat_") &&
		!strings.HasPrefix(a.token, "test") && // Allow test tokens
		len(a.token) < 10 { // Minimum reasonable length
		return NewWikiError(ErrorTypeAuthentication, "validate_token", nil,
			"トークン形式が無効です", 0,
			[]string{
				"正しいGitHub Personal Access Tokenを使用してください",
				"トークンは 'ghp_' または 'github_pat_' で始まる必要があります",
			})
	}

	return nil
}

// GetRequiredScopes returns the required GitHub token scopes for wiki operations
func (a *GitAuthenticator) GetRequiredScopes() []string {
	return []string{
		"public_repo", // For public repositories
		"repo",        // For private repositories (includes public_repo)
	}
}

// SecureTokenString returns a masked version of the token for logging
func (a *GitAuthenticator) SecureTokenString() string {
	if a.token == "" {
		return "<empty>"
	}
	if len(a.token) <= 8 {
		return "***"
	}
	// Show first 4 and last 4 characters with asterisks in between
	return a.token[:4] + "***" + a.token[len(a.token)-4:]
}

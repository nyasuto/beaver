package wiki

import (
	"context"
	"os"
	"path/filepath"
	"slices"
	"testing"
	"time"

	"github.com/nyasuto/beaver/internal/models"
)

// MockGitClient implements GitClient interface for testing
type MockGitClient struct {
	shouldErr      bool
	errType        ErrorType
	cloneDir       string
	statusResult   *GitStatus
	currentSHA     string
	currentBranch  string
	remoteURL      string
	commands       []string
	addedFiles     []string
	commitMessages []string
	pushedBranches []string
}

func NewMockGitClient() *MockGitClient {
	return &MockGitClient{
		statusResult: &GitStatus{
			IsClean:        true,
			HasUncommitted: false,
			HasUntracked:   false,
			ModifiedFiles:  []string{},
			UntrackedFiles: []string{},
			StagedFiles:    []string{},
			Branch:         "master",
			Ahead:          0,
			Behind:         0,
		},
		currentSHA:     "abc123456",
		currentBranch:  "master",
		remoteURL:      "https://github.com/test/repo.wiki.git",
		commands:       []string{},
		addedFiles:     []string{},
		commitMessages: []string{},
		pushedBranches: []string{},
	}
}

func (m *MockGitClient) Clone(ctx context.Context, url, dir string, options *CloneOptions) error {
	m.commands = append(m.commands, "clone")
	m.cloneDir = dir
	if m.shouldErr && m.errType == ErrorTypeGitOperation {
		return NewWikiError(ErrorTypeGitOperation, "clone", nil, "Mock clone error", 0, nil)
	}
	if m.shouldErr && m.errType == ErrorTypeAuthentication {
		return NewAuthenticationError("clone", nil)
	}
	if m.shouldErr && m.errType == ErrorTypeNetwork {
		return NewNetworkError("clone", nil)
	}
	return nil
}

func (m *MockGitClient) Pull(ctx context.Context, dir string) error {
	m.commands = append(m.commands, "pull")
	if m.shouldErr {
		return NewWikiError(m.errType, "pull", nil, "Mock pull error", 0, nil)
	}
	return nil
}

func (m *MockGitClient) Push(ctx context.Context, dir string, options *PushOptions) error {
	m.commands = append(m.commands, "push")
	if options != nil {
		m.pushedBranches = append(m.pushedBranches, options.Branch)
	}
	if m.shouldErr {
		return NewWikiError(m.errType, "push", nil, "Mock push error", 0, nil)
	}
	return nil
}

func (m *MockGitClient) Add(ctx context.Context, dir string, files []string) error {
	m.commands = append(m.commands, "add")
	m.addedFiles = append(m.addedFiles, files...)
	if m.shouldErr {
		return NewWikiError(m.errType, "add", nil, "Mock add error", 0, nil)
	}
	return nil
}

func (m *MockGitClient) Commit(ctx context.Context, dir string, message string, options *CommitOptions) error {
	m.commands = append(m.commands, "commit")
	m.commitMessages = append(m.commitMessages, message)
	if m.shouldErr {
		return NewWikiError(m.errType, "commit", nil, "Mock commit error", 0, nil)
	}
	return nil
}

func (m *MockGitClient) Status(ctx context.Context, dir string) (*GitStatus, error) {
	m.commands = append(m.commands, "status")
	if m.shouldErr {
		return nil, NewWikiError(m.errType, "status", nil, "Mock status error", 0, nil)
	}
	return m.statusResult, nil
}

func (m *MockGitClient) GetCurrentSHA(ctx context.Context, dir string) (string, error) {
	m.commands = append(m.commands, "rev-parse")
	if m.shouldErr {
		return "", NewWikiError(m.errType, "rev-parse", nil, "Mock SHA error", 0, nil)
	}
	return m.currentSHA, nil
}

func (m *MockGitClient) GetRemoteURL(ctx context.Context, dir string) (string, error) {
	m.commands = append(m.commands, "remote get-url")
	if m.shouldErr {
		return "", NewWikiError(m.errType, "remote get-url", nil, "Mock remote error", 0, nil)
	}
	return m.remoteURL, nil
}

func (m *MockGitClient) GetCurrentBranch(ctx context.Context, dir string) (string, error) {
	m.commands = append(m.commands, "branch --show-current")
	if m.shouldErr {
		return "", NewWikiError(m.errType, "branch", nil, "Mock branch error", 0, nil)
	}
	return m.currentBranch, nil
}

func (m *MockGitClient) CheckoutBranch(ctx context.Context, dir string, branch string) error {
	m.commands = append(m.commands, "checkout")
	if m.shouldErr {
		return NewWikiError(m.errType, "checkout", nil, "Mock checkout error", 0, nil)
	}
	return nil
}

func (m *MockGitClient) SetConfig(ctx context.Context, dir string, key, value string) error {
	m.commands = append(m.commands, "config set")
	if m.shouldErr {
		return NewWikiError(m.errType, "config", nil, "Mock config error", 0, nil)
	}
	return nil
}

func (m *MockGitClient) GetConfig(ctx context.Context, dir string, key string) (string, error) {
	m.commands = append(m.commands, "config get")
	if m.shouldErr {
		return "", NewWikiError(m.errType, "config", nil, "Mock config error", 0, nil)
	}
	return "test-value", nil
}

// Helper methods for testing
func (m *MockGitClient) SetShouldError(shouldErr bool, errType ErrorType) {
	m.shouldErr = shouldErr
	m.errType = errType
}

func (m *MockGitClient) GetExecutedCommands() []string {
	return m.commands
}

func (m *MockGitClient) GetAddedFiles() []string {
	return m.addedFiles
}

func (m *MockGitClient) GetCommitMessages() []string {
	return m.commitMessages
}

func (m *MockGitClient) GetPushedBranches() []string {
	return m.pushedBranches
}

// Test functions

func TestNewGitHubWikiPublisher(t *testing.T) {
	tests := []struct {
		name    string
		config  *PublisherConfig
		wantErr bool
	}{
		{
			name: "valid config",
			config: &PublisherConfig{
				Owner:      "testowner",
				Repository: "testrepo",
				Token:      "testtoken",
				Timeout:    30 * time.Second,
			},
			wantErr: false,
		},
		{
			name: "invalid config - missing owner",
			config: &PublisherConfig{
				Repository: "testrepo",
				Token:      "testtoken",
				Timeout:    30 * time.Second,
			},
			wantErr: true,
		},
		{
			name: "invalid config - missing repository",
			config: &PublisherConfig{
				Owner:   "testowner",
				Token:   "testtoken",
				Timeout: 30 * time.Second,
			},
			wantErr: true,
		},
		{
			name: "invalid config - missing token",
			config: &PublisherConfig{
				Owner:      "testowner",
				Repository: "testrepo",
				Timeout:    30 * time.Second,
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			publisher, err := NewGitHubWikiPublisher(tt.config)
			if (err != nil) != tt.wantErr {
				t.Errorf("NewGitHubWikiPublisher() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && publisher == nil {
				t.Error("NewGitHubWikiPublisher() returned nil publisher for valid config")
			}
		})
	}
}

func TestGitHubWikiPublisher_Initialize(t *testing.T) {
	config := &PublisherConfig{
		Owner:      "testowner",
		Repository: "testrepo",
		Token:      "testtoken",
		Timeout:    30 * time.Second,
	}

	publisher, err := NewGitHubWikiPublisher(config)
	if err != nil {
		t.Fatalf("NewGitHubWikiPublisher() error = %v", err)
	}

	// Replace git client with mock
	mockGit := NewMockGitClient()
	publisher.gitClient = mockGit

	ctx := context.Background()

	// Test first initialization
	err = publisher.Initialize(ctx)
	if err != nil {
		t.Errorf("Initialize() error = %v", err)
	}

	if !publisher.isInitialized {
		t.Error("Initialize() did not set isInitialized to true")
	}

	if publisher.workDir == "" {
		t.Error("Initialize() did not set working directory")
	}

	// Test second initialization (should not error)
	err = publisher.Initialize(ctx)
	if err != nil {
		t.Errorf("Initialize() second call error = %v", err)
	}

	// Cleanup
	_ = publisher.Cleanup()
}

func TestGitHubWikiPublisher_Clone(t *testing.T) {
	config := &PublisherConfig{
		Owner:      "testowner",
		Repository: "testrepo",
		Token:      "testtoken",
		Timeout:    30 * time.Second,
	}

	publisher, err := NewGitHubWikiPublisher(config)
	if err != nil {
		t.Fatalf("NewGitHubWikiPublisher() error = %v", err)
	}

	mockGit := NewMockGitClient()
	publisher.gitClient = mockGit

	ctx := context.Background()

	// Test clone without initialization
	err = publisher.Clone(ctx)
	if err == nil {
		t.Error("Clone() should error when not initialized")
	}

	// Initialize first
	err = publisher.Initialize(ctx)
	if err != nil {
		t.Fatalf("Initialize() error = %v", err)
	}

	// Test successful clone
	err = publisher.Clone(ctx)
	if err != nil {
		t.Errorf("Clone() error = %v", err)
	}

	commands := mockGit.GetExecutedCommands()
	if len(commands) == 0 || commands[0] != "clone" {
		t.Errorf("Clone() did not execute git clone command, got: %v", commands)
	}

	// Cleanup
	_ = publisher.Cleanup()
}

func TestGitHubWikiPublisher_CreatePage(t *testing.T) {
	config := &PublisherConfig{
		Owner:      "testowner",
		Repository: "testrepo",
		Token:      "testtoken",
		Timeout:    30 * time.Second,
	}

	publisher, err := NewGitHubWikiPublisher(config)
	if err != nil {
		t.Fatalf("NewGitHubWikiPublisher() error = %v", err)
	}

	mockGit := NewMockGitClient()
	publisher.gitClient = mockGit

	ctx := context.Background()

	// Initialize
	err = publisher.Initialize(ctx)
	if err != nil {
		t.Fatalf("Initialize() error = %v", err)
	}

	// Test page creation
	page := &WikiPage{
		Title:     "Test Page",
		Filename:  "Test Page.md",
		Content:   "# Test Content\n\nThis is a test page.",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	err = publisher.CreatePage(ctx, page)
	if err != nil {
		t.Errorf("CreatePage() error = %v", err)
	}

	// Check if file was created with normalized name
	normalizedFilename := "Test-Page.md"
	filepath := filepath.Join(publisher.workDir, normalizedFilename)
	if _, err := os.Stat(filepath); os.IsNotExist(err) {
		t.Errorf("CreatePage() did not create file at %s", filepath)
	}

	// Test duplicate page creation
	err = publisher.CreatePage(ctx, page)
	if err == nil {
		t.Error("CreatePage() should error when page already exists")
	}

	// Cleanup
	_ = publisher.Cleanup()
}

func TestGitHubWikiPublisher_PublishPages(t *testing.T) {
	config := &PublisherConfig{
		Owner:       "testowner",
		Repository:  "testrepo",
		Token:       "testtoken",
		AuthorName:  "Test Author",
		AuthorEmail: "test@example.com",
		Timeout:     30 * time.Second,
	}

	publisher, err := NewGitHubWikiPublisher(config)
	if err != nil {
		t.Fatalf("NewGitHubWikiPublisher() error = %v", err)
	}

	mockGit := NewMockGitClient()
	publisher.gitClient = mockGit

	ctx := context.Background()

	// Initialize
	err = publisher.Initialize(ctx)
	if err != nil {
		t.Fatalf("Initialize() error = %v", err)
	}

	// Test batch publishing
	pages := []*WikiPage{
		{
			Title:     "Home",
			Filename:  "Home.md",
			Content:   "# Welcome\n\nThis is the home page.",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			Title:     "Setup Guide",
			Filename:  "Setup Guide.md",
			Content:   "# Setup\n\nFollow these steps...",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
	}

	err = publisher.PublishPages(ctx, pages)
	if err != nil {
		t.Errorf("PublishPages() error = %v", err)
	}

	// Check git operations were executed
	commands := mockGit.GetExecutedCommands()
	expectedCommands := []string{"clone", "add", "commit", "push"}
	for _, expected := range expectedCommands {
		if !slices.Contains(commands, expected) {
			t.Errorf("PublishPages() did not execute %s command", expected)
		}
	}

	// Check files were added
	addedFiles := mockGit.GetAddedFiles()
	expectedFiles := []string{"Home.md", "Setup-Guide.md"}
	for _, expected := range expectedFiles {
		if !slices.Contains(addedFiles, expected) {
			t.Errorf("PublishPages() did not add file %s", expected)
		}
	}

	// Check commit message
	commitMessages := mockGit.GetCommitMessages()
	if len(commitMessages) == 0 {
		t.Error("PublishPages() did not create commit")
	} else if len(commitMessages[0]) == 0 {
		t.Error("PublishPages() created empty commit message")
	}

	// Cleanup
	_ = publisher.Cleanup()
}

func TestGitHubWikiPublisher_ErrorHandling(t *testing.T) {
	config := &PublisherConfig{
		Owner:      "testowner",
		Repository: "testrepo",
		Token:      "testtoken",
		Timeout:    30 * time.Second,
	}

	publisher, err := NewGitHubWikiPublisher(config)
	if err != nil {
		t.Fatalf("NewGitHubWikiPublisher() error = %v", err)
	}

	mockGit := NewMockGitClient()
	publisher.gitClient = mockGit

	ctx := context.Background()

	// Initialize
	err = publisher.Initialize(ctx)
	if err != nil {
		t.Fatalf("Initialize() error = %v", err)
	}

	// Test authentication error
	mockGit.SetShouldError(true, ErrorTypeAuthentication)
	err = publisher.Clone(ctx)
	if err == nil {
		t.Error("Clone() should return authentication error")
	}
	if !IsAuthenticationError(err) {
		t.Error("Clone() should return authentication error type")
	}

	// Test network error
	mockGit.SetShouldError(true, ErrorTypeNetwork)
	err = publisher.Pull(ctx)
	if err == nil {
		t.Error("Pull() should return network error")
	}
	if !IsNetworkError(err) {
		t.Error("Pull() should return network error type")
	}

	// Test git operation error
	mockGit.SetShouldError(true, ErrorTypeGitOperation)
	err = publisher.Push(ctx)
	if err == nil {
		t.Error("Push() should return git operation error")
	}

	// Cleanup
	_ = publisher.Cleanup()
}

func TestGitHubWikiPublisher_GetStatus(t *testing.T) {
	config := &PublisherConfig{
		Owner:      "testowner",
		Repository: "testrepo",
		Token:      "testtoken",
		Timeout:    30 * time.Second,
	}

	publisher, err := NewGitHubWikiPublisher(config)
	if err != nil {
		t.Fatalf("NewGitHubWikiPublisher() error = %v", err)
	}

	mockGit := NewMockGitClient()
	publisher.gitClient = mockGit

	ctx := context.Background()

	// Test status before initialization
	status, err := publisher.GetStatus(ctx)
	if err != nil {
		t.Errorf("GetStatus() error = %v", err)
	}
	if status.IsInitialized {
		t.Error("GetStatus() should report not initialized")
	}

	// Initialize
	err = publisher.Initialize(ctx)
	if err != nil {
		t.Fatalf("Initialize() error = %v", err)
	}

	// Test status after initialization
	status, err = publisher.GetStatus(ctx)
	if err != nil {
		t.Errorf("GetStatus() error = %v", err)
	}
	if !status.IsInitialized {
		t.Error("GetStatus() should report initialized")
	}
	if status.RepositoryURL == "" {
		t.Error("GetStatus() should include repository URL")
	}

	// Cleanup
	_ = publisher.Cleanup()
}

func TestGitHubWikiPublisher_FilenameNormalization(t *testing.T) {
	config := &PublisherConfig{
		Owner:      "testowner",
		Repository: "testrepo",
		Token:      "testtoken",
		Timeout:    30 * time.Second,
	}

	publisher, err := NewGitHubWikiPublisher(config)
	if err != nil {
		t.Fatalf("NewGitHubWikiPublisher() error = %v", err)
	}

	tests := []struct {
		input    string
		expected string
	}{
		{"Test Page", "Test-Page.md"},
		{"Setup Guide", "Setup-Guide.md"},
		{"API/Reference", "API-Reference.md"},
		{"Windows\\Path", "Windows-Path.md"},
		{"File:with:colons", "File-with-colons.md"},
		{"Special*?<>|\"|Chars", "Special-------Chars.md"},
		{"Already.md", "Already.md"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := publisher.normalizeFilename(tt.input)
			if result != tt.expected {
				t.Errorf("normalizeFilename(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}

func TestGitHubWikiPublisher_GenerateAndPublishWiki(t *testing.T) {
	config := &PublisherConfig{
		Owner:      "testowner",
		Repository: "testrepo",
		Token:      "testtoken",
		Timeout:    30 * time.Second,
	}

	publisher, err := NewGitHubWikiPublisher(config)
	if err != nil {
		t.Fatalf("NewGitHubWikiPublisher() error = %v", err)
	}

	mockGit := NewMockGitClient()
	publisher.gitClient = mockGit

	ctx := context.Background()

	// Initialize
	err = publisher.Initialize(ctx)
	if err != nil {
		t.Fatalf("Initialize() error = %v", err)
	}

	// Test with sample issues
	issues := []models.Issue{
		{
			ID:     1,
			Number: 1,
			Title:  "Test Issue 1",
			Body:   "This is a test issue",
			State:  "open",
		},
		{
			ID:     2,
			Number: 2,
			Title:  "Test Issue 2",
			Body:   "Another test issue",
			State:  "closed",
		},
	}

	err = publisher.GenerateAndPublishWiki(ctx, issues, "Test Project")
	if err != nil {
		t.Errorf("GenerateAndPublishWiki() error = %v", err)
	}

	// Check that git operations were executed
	commands := mockGit.GetExecutedCommands()
	if len(commands) == 0 {
		t.Error("GenerateAndPublishWiki() did not execute any git commands")
	}

	// Cleanup
	_ = publisher.Cleanup()
}

func TestGitHubWikiPublisher_DeletePage(t *testing.T) {
	config := &PublisherConfig{
		Owner:      "testowner",
		Repository: "testrepo",
		Token:      "testtoken",
		Timeout:    30 * time.Second,
	}

	publisher, err := NewGitHubWikiPublisher(config)
	if err != nil {
		t.Fatalf("NewGitHubWikiPublisher() error = %v", err)
	}

	mockGit := NewMockGitClient()
	publisher.gitClient = mockGit

	ctx := context.Background()

	// Test delete without initialization
	err = publisher.DeletePage(ctx, "test-page")
	if err == nil {
		t.Error("DeletePage() should error when not initialized")
	}

	// Initialize
	err = publisher.Initialize(ctx)
	if err != nil {
		t.Fatalf("Initialize() error = %v", err)
	}

	// Create a test page first
	page := &WikiPage{
		Title:     "Test Page",
		Filename:  "Test-Page.md",
		Content:   "# Test Content",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	err = publisher.CreatePage(ctx, page)
	if err != nil {
		t.Fatalf("CreatePage() error = %v", err)
	}

	// Test successful delete
	err = publisher.DeletePage(ctx, "Test-Page.md")
	if err != nil {
		t.Errorf("DeletePage() error = %v", err)
	}

	// Test delete non-existent page
	err = publisher.DeletePage(ctx, "non-existent.md")
	if err == nil {
		t.Error("DeletePage() should error for non-existent page")
	}

	// Cleanup
	_ = publisher.Cleanup()
}

func TestGitHubWikiPublisher_PageExists(t *testing.T) {
	config := &PublisherConfig{
		Owner:      "testowner",
		Repository: "testrepo",
		Token:      "testtoken",
		Timeout:    30 * time.Second,
	}

	publisher, err := NewGitHubWikiPublisher(config)
	if err != nil {
		t.Fatalf("NewGitHubWikiPublisher() error = %v", err)
	}

	mockGit := NewMockGitClient()
	publisher.gitClient = mockGit

	ctx := context.Background()

	// Test PageExists without initialization
	_, err = publisher.PageExists(ctx, "test-page")
	if err == nil {
		t.Error("PageExists() should error when not initialized")
	}

	// Initialize
	err = publisher.Initialize(ctx)
	if err != nil {
		t.Fatalf("Initialize() error = %v", err)
	}

	// Test non-existent page
	exists, err := publisher.PageExists(ctx, "non-existent.md")
	if err != nil {
		t.Errorf("PageExists() error = %v", err)
	}
	if exists {
		t.Error("PageExists() should return false for non-existent page")
	}

	// Create a test page
	page := &WikiPage{
		Title:     "Test Page",
		Filename:  "Test-Page.md",
		Content:   "# Test Content",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	err = publisher.CreatePage(ctx, page)
	if err != nil {
		t.Fatalf("CreatePage() error = %v", err)
	}

	// Test existing page
	exists, err = publisher.PageExists(ctx, "Test-Page.md")
	if err != nil {
		t.Errorf("PageExists() error = %v", err)
	}
	if !exists {
		t.Error("PageExists() should return true for existing page")
	}

	// Cleanup
	_ = publisher.Cleanup()
}

func TestGitHubWikiPublisher_ListPages(t *testing.T) {
	config := &PublisherConfig{
		Owner:      "testowner",
		Repository: "testrepo",
		Token:      "testtoken",
		Timeout:    30 * time.Second,
	}

	publisher, err := NewGitHubWikiPublisher(config)
	if err != nil {
		t.Fatalf("NewGitHubWikiPublisher() error = %v", err)
	}

	mockGit := NewMockGitClient()
	publisher.gitClient = mockGit

	ctx := context.Background()

	// Test ListPages without initialization
	_, err = publisher.ListPages(ctx)
	if err == nil {
		t.Error("ListPages() should error when not initialized")
	}

	// Initialize
	err = publisher.Initialize(ctx)
	if err != nil {
		t.Fatalf("Initialize() error = %v", err)
	}

	// Test empty repository
	pages, err := publisher.ListPages(ctx)
	if err != nil {
		t.Errorf("ListPages() error = %v", err)
	}
	if len(pages) != 0 {
		t.Errorf("ListPages() returned %d pages, want 0", len(pages))
	}

	// Create test pages
	testPages := []*WikiPage{
		{Title: "Home", Filename: "Home.md", Content: "# Home", CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{Title: "Setup", Filename: "Setup.md", Content: "# Setup", CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{Title: "FAQ", Filename: "FAQ.md", Content: "# FAQ", CreatedAt: time.Now(), UpdatedAt: time.Now()},
	}

	for _, page := range testPages {
		err := publisher.CreatePage(ctx, page)
		if err != nil {
			t.Fatalf("CreatePage() error = %v", err)
		}
	}

	// Create .git directory to simulate cloned repository
	gitDir := filepath.Join(publisher.workDir, ".git")
	err = os.MkdirAll(gitDir, 0750)
	if err != nil {
		t.Fatalf("Failed to create .git directory: %v", err)
	}

	// Test ListPages with pages
	pages, err = publisher.ListPages(ctx)
	if err != nil {
		t.Errorf("ListPages() error = %v", err)
	}
	if len(pages) != 3 {
		t.Errorf("ListPages() returned %d pages, want 3", len(pages))
	}

	// Verify page information
	pageNames := make(map[string]bool)
	for _, page := range pages {
		pageNames[page.Title] = true
		if page.Size <= 0 {
			t.Errorf("Page %s has invalid size: %d", page.Title, page.Size)
		}
		if page.URL == "" {
			t.Errorf("Page %s has empty URL", page.Title)
		}
	}

	expectedPages := []string{"Home", "Setup", "FAQ"}
	for _, expected := range expectedPages {
		if !pageNames[expected] {
			t.Errorf("Expected page %s not found in list", expected)
		}
	}

	// Cleanup
	_ = publisher.Cleanup()
}

func TestGitHubWikiPublisher_Commit(t *testing.T) {
	config := &PublisherConfig{
		Owner:       "testowner",
		Repository:  "testrepo",
		Token:       "testtoken",
		AuthorName:  "Test Author",
		AuthorEmail: "test@example.com",
		Timeout:     30 * time.Second,
	}

	publisher, err := NewGitHubWikiPublisher(config)
	if err != nil {
		t.Fatalf("NewGitHubWikiPublisher() error = %v", err)
	}

	mockGit := NewMockGitClient()
	publisher.gitClient = mockGit

	ctx := context.Background()

	// Test Commit without initialization
	err = publisher.Commit(ctx, "test commit")
	if err == nil {
		t.Error("Commit() should error when not initialized")
	}

	// Initialize
	err = publisher.Initialize(ctx)
	if err != nil {
		t.Fatalf("Initialize() error = %v", err)
	}

	// Test successful commit
	err = publisher.Commit(ctx, "feat: add test page")
	if err != nil {
		t.Errorf("Commit() error = %v", err)
	}

	// Verify commit was executed
	commands := mockGit.GetExecutedCommands()
	found := false
	for _, cmd := range commands {
		if cmd == "commit" {
			found = true
			break
		}
	}
	if !found {
		t.Error("Commit() did not execute git commit command")
	}

	// Verify commit message
	messages := mockGit.GetCommitMessages()
	if len(messages) == 0 {
		t.Error("Commit() did not record commit message")
	} else if messages[0] != "feat: add test page" {
		t.Errorf("Commit() recorded wrong message: got %q, want %q", messages[0], "feat: add test page")
	}

	// Cleanup
	_ = publisher.Cleanup()
}

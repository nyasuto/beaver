package content

import (
	"context"
	"testing"
	"time"

	"github.com/nyasuto/beaver/internal/models"
	"github.com/stretchr/testify/assert"
)

// MockWikiPublisher implements WikiPublisher interface for testing
type MockWikiPublisher struct {
	pages     map[string]*WikiPage
	status    *PublisherStatus
	shouldErr bool
	errType   ErrorType
}

// NewMockWikiPublisher creates a new mock publisher for testing
func NewMockWikiPublisher() *MockWikiPublisher {
	return &MockWikiPublisher{
		pages: make(map[string]*WikiPage),
		status: &PublisherStatus{
			IsInitialized:  true,
			LastUpdate:     time.Now(),
			TotalPages:     0,
			PendingChanges: 0,
			RepositoryURL:  "https://github.com/test/repo.git",
			WorkingDir:     "/tmp/test-wiki",
			LastCommitSHA:  "abc123",
			BranchName:     "gh-pages",
			HasUncommitted: false,
		},
	}
}

// Mock implementation of WikiPublisher interface

func (m *MockWikiPublisher) Initialize(ctx context.Context) error {
	if m.shouldErr {
		return NewWikiError(m.errType, "initialize", nil, "Mock error", 0, nil)
	}
	m.status.IsInitialized = true
	return nil
}

func (m *MockWikiPublisher) Clone(ctx context.Context) error {
	if m.shouldErr {
		return NewWikiError(m.errType, "clone", nil, "Mock clone error", 0, nil)
	}
	return nil
}

func (m *MockWikiPublisher) Cleanup() error {
	if m.shouldErr {
		return NewWikiError(m.errType, "cleanup", nil, "Mock cleanup error", 0, nil)
	}
	return nil
}

func (m *MockWikiPublisher) CreatePage(ctx context.Context, page *WikiPage) error {
	if m.shouldErr {
		return NewWikiError(m.errType, "create_page", nil, "Mock create error", 0, nil)
	}
	m.pages[page.Filename] = page
	m.status.TotalPages++
	return nil
}

func (m *MockWikiPublisher) UpdatePage(ctx context.Context, page *WikiPage) error {
	if m.shouldErr {
		return NewWikiError(m.errType, "update_page", nil, "Mock update error", 0, nil)
	}
	m.pages[page.Filename] = page
	return nil
}

func (m *MockWikiPublisher) DeletePage(ctx context.Context, pageName string) error {
	if m.shouldErr {
		return NewWikiError(m.errType, "delete_page", nil, "Mock delete error", 0, nil)
	}
	delete(m.pages, pageName)
	m.status.TotalPages--
	return nil
}

func (m *MockWikiPublisher) PageExists(ctx context.Context, pageName string) (bool, error) {
	if m.shouldErr {
		return false, NewWikiError(m.errType, "page_exists", nil, "Mock exists error", 0, nil)
	}
	_, exists := m.pages[pageName]
	return exists, nil
}

func (m *MockWikiPublisher) PublishPages(ctx context.Context, pages []*WikiPage) error {
	if m.shouldErr {
		return NewWikiError(m.errType, "publish_pages", nil, "Mock publish error", 0, nil)
	}
	for _, page := range pages {
		m.pages[page.Filename] = page
	}
	m.status.TotalPages = len(m.pages)
	return nil
}

func (m *MockWikiPublisher) GenerateAndPublishWiki(ctx context.Context, issues []models.Issue, projectName string) error {
	if m.shouldErr {
		return NewWikiError(m.errType, "generate_and_publish", nil, "Mock generate error", 0, nil)
	}
	// Mock implementation - create some test pages
	pages := []*WikiPage{
		{Title: "Home", Filename: "Home.md", Content: "# " + projectName},
		{Title: "Issues Summary", Filename: "Issues-Summary.md", Content: "## Issues"},
	}
	return m.PublishPages(ctx, pages)
}

func (m *MockWikiPublisher) Commit(ctx context.Context, message string) error {
	if m.shouldErr {
		return NewWikiError(m.errType, "commit", nil, "Mock commit error", 0, nil)
	}
	m.status.HasUncommitted = false
	return nil
}

func (m *MockWikiPublisher) Push(ctx context.Context) error {
	if m.shouldErr {
		return NewWikiError(m.errType, "push", nil, "Mock push error", 0, nil)
	}
	m.status.LastUpdate = time.Now()
	return nil
}

func (m *MockWikiPublisher) Pull(ctx context.Context) error {
	if m.shouldErr {
		return NewWikiError(m.errType, "pull", nil, "Mock pull error", 0, nil)
	}
	return nil
}

func (m *MockWikiPublisher) GetStatus(ctx context.Context) (*PublisherStatus, error) {
	if m.shouldErr {
		return nil, NewWikiError(m.errType, "get_status", nil, "Mock status error", 0, nil)
	}
	return m.status, nil
}

func (m *MockWikiPublisher) ListPages(ctx context.Context) ([]*WikiPageInfo, error) {
	if m.shouldErr {
		return nil, NewWikiError(m.errType, "list_pages", nil, "Mock list error", 0, nil)
	}

	var pageInfos []*WikiPageInfo
	for _, page := range m.pages {
		pageInfos = append(pageInfos, &WikiPageInfo{
			Title:        page.Title,
			Filename:     page.Filename,
			Size:         int64(len(page.Content)),
			LastModified: page.UpdatedAt,
			SHA:          "mock-sha",
			URL:          "https://github.com/test/repo/wiki/" + page.Title,
		})
	}
	return pageInfos, nil
}

// Helper methods for testing

func (m *MockWikiPublisher) SetShouldError(shouldErr bool, errType ErrorType) {
	m.shouldErr = shouldErr
	m.errType = errType
}

func (m *MockWikiPublisher) GetPageCount() int {
	return len(m.pages)
}

func (m *MockWikiPublisher) GetPage(filename string) *WikiPage {
	return m.pages[filename]
}

// Unit Tests

func TestPublisherConfig_Validate(t *testing.T) {
	tests := []struct {
		name    string
		config  *PublisherConfig
		wantErr bool
	}{
		{
			name: "valid config",
			config: &PublisherConfig{
				Owner:      "test",
				Repository: "repo",
				Token:      "token",
				Timeout:    30 * time.Second,
			},
			wantErr: false,
		},
		{
			name: "missing owner",
			config: &PublisherConfig{
				Repository: "repo",
				Token:      "token",
				Timeout:    30 * time.Second,
			},
			wantErr: true,
		},
		{
			name: "missing repository",
			config: &PublisherConfig{
				Owner:   "test",
				Token:   "token",
				Timeout: 30 * time.Second,
			},
			wantErr: true,
		},
		{
			name: "missing token",
			config: &PublisherConfig{
				Owner:      "test",
				Repository: "repo",
				Timeout:    30 * time.Second,
			},
			wantErr: true,
		},
		{
			name: "invalid timeout",
			config: &PublisherConfig{
				Owner:      "test",
				Repository: "repo",
				Token:      "token",
				Timeout:    0,
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.config.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("PublisherConfig.Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestPublisherConfig_GetRepositoryURL(t *testing.T) {
	config := &PublisherConfig{
		Owner:      "testowner",
		Repository: "testrepo",
	}

	expected := "https://github.com/testowner/testrepo.git"
	actual := config.GetRepositoryURL()

	if actual != expected {
		t.Errorf("GetRepositoryURL() = %v, want %v", actual, expected)
	}
}

func TestPublisherConfig_GetAuthenticatedURL(t *testing.T) {
	config := &PublisherConfig{
		Owner:      "testowner",
		Repository: "testrepo",
		Token:      "testtoken",
	}

	expected := "https://x-access-token:testtoken@github.com/testowner/testrepo.git"
	actual := config.GetAuthenticatedURL()

	if actual != expected {
		t.Errorf("GetAuthenticatedURL() = %v, want %v", actual, expected)
	}
}

func TestMockWikiPublisher_BasicOperations(t *testing.T) {
	ctx := context.Background()
	publisher := NewMockWikiPublisher()

	// Test page creation
	page := &WikiPage{
		Title:    "Test Page",
		Filename: "Test-Page.md",
		Content:  "# Test Content",
	}

	err := publisher.CreatePage(ctx, page)
	if err != nil {
		t.Fatalf("CreatePage() error = %v", err)
	}

	// Test page exists
	exists, err := publisher.PageExists(ctx, "Test-Page.md")
	if err != nil {
		t.Fatalf("PageExists() error = %v", err)
	}
	if !exists {
		t.Error("PageExists() = false, want true")
	}

	// Test page count
	if publisher.GetPageCount() != 1 {
		t.Errorf("GetPageCount() = %d, want 1", publisher.GetPageCount())
	}

	// Test delete page
	err = publisher.DeletePage(ctx, "Test-Page.md")
	if err != nil {
		t.Fatalf("DeletePage() error = %v", err)
	}

	if publisher.GetPageCount() != 0 {
		t.Errorf("GetPageCount() after delete = %d, want 0", publisher.GetPageCount())
	}
}

func TestMockWikiPublisher_ErrorHandling(t *testing.T) {
	ctx := context.Background()
	publisher := NewMockWikiPublisher()

	// Configure to return errors
	publisher.SetShouldError(true, ErrorTypeNetwork)

	page := &WikiPage{
		Title:    "Test Page",
		Filename: "Test-Page.md",
		Content:  "# Test Content",
	}

	err := publisher.CreatePage(ctx, page)
	if err == nil {
		t.Error("CreatePage() expected error, got nil")
	}

	if !IsNetworkError(err) {
		t.Error("Expected network error type")
	}
}

func TestMockWikiPublisher_BatchOperations(t *testing.T) {
	ctx := context.Background()
	publisher := NewMockWikiPublisher()

	pages := []*WikiPage{
		{Title: "Page 1", Filename: "Page-1.md", Content: "Content 1"},
		{Title: "Page 2", Filename: "Page-2.md", Content: "Content 2"},
		{Title: "Page 3", Filename: "Page-3.md", Content: "Content 3"},
	}

	err := publisher.PublishPages(ctx, pages)
	if err != nil {
		t.Fatalf("PublishPages() error = %v", err)
	}

	if publisher.GetPageCount() != 3 {
		t.Errorf("GetPageCount() = %d, want 3", publisher.GetPageCount())
	}

	// Test list pages
	pageInfos, err := publisher.ListPages(ctx)
	if err != nil {
		t.Fatalf("ListPages() error = %v", err)
	}

	if len(pageInfos) != 3 {
		t.Errorf("ListPages() returned %d pages, want 3", len(pageInfos))
	}
}

func TestNewPublisherConfig(t *testing.T) {
	tests := []struct {
		name       string
		owner      string
		repository string
		token      string
		validate   func(*testing.T, *PublisherConfig)
	}{
		{
			name:       "valid basic configuration",
			owner:      "testowner",
			repository: "testrepo",
			token:      "ghp_testtoken123",
			validate: func(t *testing.T, config *PublisherConfig) {
				assert.Equal(t, "testowner", config.Owner)
				assert.Equal(t, "testrepo", config.Repository)
				assert.Equal(t, "ghp_testtoken123", config.Token)
			},
		},
		{
			name:       "configuration with special characters",
			owner:      "owner-with-dashes",
			repository: "repo_with_underscores",
			token:      "ghp_complex-token_123",
			validate: func(t *testing.T, config *PublisherConfig) {
				assert.Equal(t, "owner-with-dashes", config.Owner)
				assert.Equal(t, "repo_with_underscores", config.Repository)
				assert.Equal(t, "ghp_complex-token_123", config.Token)
			},
		},
		{
			name:       "empty values should be accepted by constructor",
			owner:      "",
			repository: "",
			token:      "",
			validate: func(t *testing.T, config *PublisherConfig) {
				assert.Equal(t, "", config.Owner)
				assert.Equal(t, "", config.Repository)
				assert.Equal(t, "", config.Token)
				// Validation should fail, but constructor should not
				err := config.Validate()
				assert.Error(t, err)
			},
		},
		{
			name:       "unicode characters in repository info",
			owner:      "ユーザー",
			repository: "リポジトリ",
			token:      "token-with-🦫-emoji",
			validate: func(t *testing.T, config *PublisherConfig) {
				assert.Equal(t, "ユーザー", config.Owner)
				assert.Equal(t, "リポジトリ", config.Repository)
				assert.Equal(t, "token-with-🦫-emoji", config.Token)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			config := NewPublisherConfig(tt.owner, tt.repository, tt.token)

			// Verify basic parameters
			tt.validate(t, config)

			// Verify default values are set correctly
			assert.Equal(t, "master", config.BranchName)
			assert.Equal(t, "Beaver AI", config.AuthorName)
			assert.Equal(t, "noreply@beaver.ai", config.AuthorEmail)
			assert.True(t, config.UseShallowClone)
			assert.Equal(t, 1, config.CloneDepth)
			assert.Equal(t, 30*time.Second, config.Timeout)
			assert.Equal(t, 3, config.RetryAttempts)
			assert.Equal(t, time.Second, config.RetryDelay)
			assert.True(t, config.EnableConflictResolution)
			assert.True(t, config.EnableBatchOperations)
			assert.False(t, config.EnablePerformanceLogging)

			// Verify working directory is empty by default (should be set later)
			assert.Empty(t, config.WorkingDir)
		})
	}
}

func TestNewPublisherConfig_DefaultValues(t *testing.T) {
	// Test that default values are consistent and sensible
	config := NewPublisherConfig("owner", "repo", "token")

	// Performance settings should be optimized for speed
	assert.True(t, config.UseShallowClone, "Should use shallow clone for performance")
	assert.Equal(t, 1, config.CloneDepth, "Shallow clone depth should be 1")

	// Timeout should be reasonable
	assert.Greater(t, config.Timeout, time.Duration(0), "Timeout should be positive")
	assert.LessOrEqual(t, config.Timeout, 5*time.Minute, "Timeout should not be excessive")

	// Retry settings should be reasonable
	assert.Greater(t, config.RetryAttempts, 0, "Should have at least 1 retry attempt")
	assert.LessOrEqual(t, config.RetryAttempts, 10, "Should not have excessive retry attempts")
	assert.Greater(t, config.RetryDelay, time.Duration(0), "Retry delay should be positive")

	// Feature flags should have sensible defaults
	assert.True(t, config.EnableConflictResolution, "Conflict resolution should be enabled by default")
	assert.True(t, config.EnableBatchOperations, "Batch operations should be enabled by default")
	assert.False(t, config.EnablePerformanceLogging, "Performance logging should be disabled by default")

	// Git settings should be valid
	assert.NotEmpty(t, config.BranchName, "Branch name should not be empty")
	assert.NotEmpty(t, config.AuthorName, "Author name should not be empty")
	assert.NotEmpty(t, config.AuthorEmail, "Author email should not be empty")
	assert.Contains(t, config.AuthorEmail, "@", "Author email should contain @")
}

func TestNewPublisherConfig_URLGeneration(t *testing.T) {
	config := NewPublisherConfig("testowner", "testrepo", "testtoken")

	// Test repository URL generation
	repoURL := config.GetRepositoryURL()
	expectedURL := "https://github.com/testowner/testrepo.git"
	assert.Equal(t, expectedURL, repoURL)

	// Test authenticated URL generation
	authURL := config.GetAuthenticatedURL()
	expectedAuthURL := "https://x-access-token:testtoken@github.com/testowner/testrepo.git"
	assert.Equal(t, expectedAuthURL, authURL)
}

func TestNewPublisherConfig_ValidationIntegration(t *testing.T) {
	// Test that NewPublisherConfig creates a configuration that validates successfully
	config := NewPublisherConfig("owner", "repo", "token")
	err := config.Validate()
	assert.NoError(t, err, "NewPublisherConfig should create a valid configuration")

	// Test that empty values fail validation
	invalidConfig := NewPublisherConfig("", "", "")
	err = invalidConfig.Validate()
	assert.Error(t, err, "Configuration with empty values should fail validation")
}

func TestNewPublisherConfig_Immutability(t *testing.T) {
	// Test that NewPublisherConfig returns a new instance each time
	config1 := NewPublisherConfig("owner1", "repo1", "token1")
	config2 := NewPublisherConfig("owner2", "repo2", "token2")

	// Should be different instances
	assert.NotSame(t, config1, config2, "NewPublisherConfig should return new instances")

	// Modifying one should not affect the other
	config1.BranchName = "custom-branch"
	assert.Equal(t, "custom-branch", config1.BranchName)
	assert.Equal(t, "master", config2.BranchName, "Modifying one config should not affect another")
}

// BenchmarkNewPublisherConfig tests the performance of config creation
func BenchmarkNewPublisherConfig(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = NewPublisherConfig("owner", "repo", "token")
	}
}

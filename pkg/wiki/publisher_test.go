package wiki

import (
	"context"
	"testing"
	"time"

	"github.com/nyasuto/beaver/internal/models"
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
			RepositoryURL:  "https://github.com/test/repo.wiki.git",
			WorkingDir:     "/tmp/test-wiki",
			LastCommitSHA:  "abc123",
			BranchName:     "master",
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

	expected := "https://github.com/testowner/testrepo.wiki.git"
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

	expected := "https://testtoken@github.com/testowner/testrepo.wiki.git"
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

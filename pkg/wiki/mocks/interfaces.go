package mocks

import (
	"context"
	"testing"
	"time"

	"github.com/nyasuto/beaver/internal/models"
	"github.com/nyasuto/beaver/pkg/wiki"
)

// MockWikiPublisher implements WikiPublisher interface for testing
type MockWikiPublisher struct {
	InitializeFunc             func(ctx context.Context) error
	CloneFunc                  func(ctx context.Context) error
	CleanupFunc                func() error
	CreatePageFunc             func(ctx context.Context, page *wiki.WikiPage) error
	UpdatePageFunc             func(ctx context.Context, page *wiki.WikiPage) error
	DeletePageFunc             func(ctx context.Context, pageName string) error
	PageExistsFunc             func(ctx context.Context, pageName string) (bool, error)
	PublishPagesFunc           func(ctx context.Context, pages []*wiki.WikiPage) error
	GenerateAndPublishWikiFunc func(ctx context.Context, issues []models.Issue, projectName string) error
	CommitFunc                 func(ctx context.Context, message string) error
	PushFunc                   func(ctx context.Context) error
	PullFunc                   func(ctx context.Context) error
	GetStatusFunc              func(ctx context.Context) (*wiki.PublisherStatus, error)
	ListPagesFunc              func(ctx context.Context) ([]*wiki.WikiPageInfo, error)

	// Call tracking
	InitializeCalls             []context.Context
	CloneCalls                  []context.Context
	CleanupCalls                int
	CreatePageCalls             []MockCreatePageCall
	UpdatePageCalls             []MockUpdatePageCall
	DeletePageCalls             []MockDeletePageCall
	PageExistsCalls             []MockPageExistsCall
	PublishPagesCalls           []MockPublishPagesCall
	GenerateAndPublishWikiCalls []MockGenerateAndPublishWikiCall
	CommitCalls                 []MockPublisherCommitCall
	PushCalls                   []context.Context
	PullCalls                   []context.Context
	GetStatusCalls              []context.Context
	ListPagesCalls              []context.Context
}

// Call tracking structures
type MockCreatePageCall struct {
	Ctx  context.Context
	Page *wiki.WikiPage
}

type MockUpdatePageCall struct {
	Ctx  context.Context
	Page *wiki.WikiPage
}

type MockDeletePageCall struct {
	Ctx      context.Context
	PageName string
}

type MockPageExistsCall struct {
	Ctx      context.Context
	PageName string
}

type MockPublishPagesCall struct {
	Ctx   context.Context
	Pages []*wiki.WikiPage
}

type MockGenerateAndPublishWikiCall struct {
	Ctx         context.Context
	Issues      []models.Issue
	ProjectName string
}

type MockPublisherCommitCall struct {
	Ctx     context.Context
	Message string
}

// NewMockWikiPublisher creates a new mock publisher with default implementations
func NewMockWikiPublisher() *MockWikiPublisher {
	return &MockWikiPublisher{
		InitializeFunc: func(ctx context.Context) error {
			return nil
		},
		CloneFunc: func(ctx context.Context) error {
			return nil
		},
		CleanupFunc: func() error {
			return nil
		},
		CreatePageFunc: func(ctx context.Context, page *wiki.WikiPage) error {
			return nil
		},
		UpdatePageFunc: func(ctx context.Context, page *wiki.WikiPage) error {
			return nil
		},
		DeletePageFunc: func(ctx context.Context, pageName string) error {
			return nil
		},
		PageExistsFunc: func(ctx context.Context, pageName string) (bool, error) {
			return false, nil
		},
		PublishPagesFunc: func(ctx context.Context, pages []*wiki.WikiPage) error {
			return nil
		},
		GenerateAndPublishWikiFunc: func(ctx context.Context, issues []models.Issue, projectName string) error {
			return nil
		},
		CommitFunc: func(ctx context.Context, message string) error {
			return nil
		},
		PushFunc: func(ctx context.Context) error {
			return nil
		},
		PullFunc: func(ctx context.Context) error {
			return nil
		},
		GetStatusFunc: func(ctx context.Context) (*wiki.PublisherStatus, error) {
			return &wiki.PublisherStatus{
				IsInitialized:  true,
				LastUpdate:     time.Now(),
				TotalPages:     0,
				PendingChanges: 0,
				RepositoryURL:  "https://github.com/test/test.wiki.git",
				WorkingDir:     "/tmp/test",
				LastCommitSHA:  "abc123",
				BranchName:     "master",
				HasUncommitted: false,
				LastError:      nil,
			}, nil
		},
		ListPagesFunc: func(ctx context.Context) ([]*wiki.WikiPageInfo, error) {
			return []*wiki.WikiPageInfo{}, nil
		},
	}
}

// Interface implementation methods
func (m *MockWikiPublisher) Initialize(ctx context.Context) error {
	m.InitializeCalls = append(m.InitializeCalls, ctx)
	return m.InitializeFunc(ctx)
}

func (m *MockWikiPublisher) Clone(ctx context.Context) error {
	m.CloneCalls = append(m.CloneCalls, ctx)
	return m.CloneFunc(ctx)
}

func (m *MockWikiPublisher) Cleanup() error {
	m.CleanupCalls++
	return m.CleanupFunc()
}

func (m *MockWikiPublisher) CreatePage(ctx context.Context, page *wiki.WikiPage) error {
	m.CreatePageCalls = append(m.CreatePageCalls, MockCreatePageCall{Ctx: ctx, Page: page})
	return m.CreatePageFunc(ctx, page)
}

func (m *MockWikiPublisher) UpdatePage(ctx context.Context, page *wiki.WikiPage) error {
	m.UpdatePageCalls = append(m.UpdatePageCalls, MockUpdatePageCall{Ctx: ctx, Page: page})
	return m.UpdatePageFunc(ctx, page)
}

func (m *MockWikiPublisher) DeletePage(ctx context.Context, pageName string) error {
	m.DeletePageCalls = append(m.DeletePageCalls, MockDeletePageCall{Ctx: ctx, PageName: pageName})
	return m.DeletePageFunc(ctx, pageName)
}

func (m *MockWikiPublisher) PageExists(ctx context.Context, pageName string) (bool, error) {
	m.PageExistsCalls = append(m.PageExistsCalls, MockPageExistsCall{Ctx: ctx, PageName: pageName})
	return m.PageExistsFunc(ctx, pageName)
}

func (m *MockWikiPublisher) PublishPages(ctx context.Context, pages []*wiki.WikiPage) error {
	m.PublishPagesCalls = append(m.PublishPagesCalls, MockPublishPagesCall{Ctx: ctx, Pages: pages})
	return m.PublishPagesFunc(ctx, pages)
}

func (m *MockWikiPublisher) GenerateAndPublishWiki(ctx context.Context, issues []models.Issue, projectName string) error {
	m.GenerateAndPublishWikiCalls = append(m.GenerateAndPublishWikiCalls, MockGenerateAndPublishWikiCall{
		Ctx: ctx, Issues: issues, ProjectName: projectName,
	})
	return m.GenerateAndPublishWikiFunc(ctx, issues, projectName)
}

func (m *MockWikiPublisher) Commit(ctx context.Context, message string) error {
	m.CommitCalls = append(m.CommitCalls, MockPublisherCommitCall{Ctx: ctx, Message: message})
	return m.CommitFunc(ctx, message)
}

func (m *MockWikiPublisher) Push(ctx context.Context) error {
	m.PushCalls = append(m.PushCalls, ctx)
	return m.PushFunc(ctx)
}

func (m *MockWikiPublisher) Pull(ctx context.Context) error {
	m.PullCalls = append(m.PullCalls, ctx)
	return m.PullFunc(ctx)
}

func (m *MockWikiPublisher) GetStatus(ctx context.Context) (*wiki.PublisherStatus, error) {
	m.GetStatusCalls = append(m.GetStatusCalls, ctx)
	return m.GetStatusFunc(ctx)
}

func (m *MockWikiPublisher) ListPages(ctx context.Context) ([]*wiki.WikiPageInfo, error) {
	m.ListPagesCalls = append(m.ListPagesCalls, ctx)
	return m.ListPagesFunc(ctx)
}

// Helper methods for test assertions
func (m *MockWikiPublisher) AssertInitializeCalledTimes(t *testing.T, times int) {
	if len(m.InitializeCalls) != times {
		t.Errorf("Expected Initialize to be called %d times, but was called %d times", times, len(m.InitializeCalls))
	}
}

func (m *MockWikiPublisher) AssertPublishPagesCalledTimes(t *testing.T, times int) {
	if len(m.PublishPagesCalls) != times {
		t.Errorf("Expected PublishPages to be called %d times, but was called %d times", times, len(m.PublishPagesCalls))
	}
}

func (m *MockWikiPublisher) AssertPublishPagesCalledWith(t *testing.T, expectedPages []*wiki.WikiPage) {
	if len(m.PublishPagesCalls) == 0 {
		t.Error("Expected PublishPages to be called, but it wasn't")
		return
	}

	lastCall := m.PublishPagesCalls[len(m.PublishPagesCalls)-1]
	if len(lastCall.Pages) != len(expectedPages) {
		t.Errorf("Expected %d pages, but got %d pages", len(expectedPages), len(lastCall.Pages))
	}
}

func (m *MockWikiPublisher) GetLastPublishPagesCall() *MockPublishPagesCall {
	if len(m.PublishPagesCalls) == 0 {
		return nil
	}
	return &m.PublishPagesCalls[len(m.PublishPagesCalls)-1]
}

func (m *MockWikiPublisher) Reset() {
	m.InitializeCalls = nil
	m.CloneCalls = nil
	m.CleanupCalls = 0
	m.CreatePageCalls = nil
	m.UpdatePageCalls = nil
	m.DeletePageCalls = nil
	m.PageExistsCalls = nil
	m.PublishPagesCalls = nil
	m.GenerateAndPublishWikiCalls = nil
	m.CommitCalls = nil
	m.PushCalls = nil
	m.PullCalls = nil
	m.GetStatusCalls = nil
	m.ListPagesCalls = nil
}

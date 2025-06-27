package mocks

import (
	"context"
	"testing"
	"time"

	"github.com/nyasuto/beaver/pkg/wiki"
)

// MockGitClient implements GitClient interface for testing
type MockGitClient struct {
	CloneFunc            func(ctx context.Context, url, dir string, options *wiki.CloneOptions) error
	PullFunc             func(ctx context.Context, dir string) error
	PushFunc             func(ctx context.Context, dir string, options *wiki.PushOptions) error
	AddFunc              func(ctx context.Context, dir string, files []string) error
	CommitFunc           func(ctx context.Context, dir, message string, options *wiki.CommitOptions) error
	StatusFunc           func(ctx context.Context, dir string) (*wiki.GitStatus, error)
	GetCurrentSHAFunc    func(ctx context.Context, dir string) (string, error)
	GetRemoteURLFunc     func(ctx context.Context, dir string) (string, error)
	GetCurrentBranchFunc func(ctx context.Context, dir string) (string, error)
	CheckoutBranchFunc   func(ctx context.Context, dir string, branch string) error
	SetConfigFunc        func(ctx context.Context, dir string, key, value string) error
	GetConfigFunc        func(ctx context.Context, dir string, key string) (string, error)
	UnsetConfigFunc      func(ctx context.Context, dir string, key string) error

	// Call tracking
	CloneCalls            []MockCloneCall
	PullCalls             []MockPullCall
	PushCalls             []MockPushCall
	AddCalls              []MockAddCall
	CommitCalls           []MockCommitCall
	StatusCalls           []MockStatusCall
	GetCurrentSHACalls    []MockGetCurrentSHACall
	GetRemoteURLCalls     []MockGetRemoteURLCall
	GetCurrentBranchCalls []MockGetCurrentBranchCall
	CheckoutBranchCalls   []MockCheckoutBranchCall
	SetConfigCalls        []MockSetConfigCall
	GetConfigCalls        []MockGetConfigCall
	UnsetConfigCalls      []MockUnsetConfigCall
}

type MockCloneCall struct {
	Ctx     context.Context
	URL     string
	Dir     string
	Options *wiki.CloneOptions
}

type MockCommitCall struct {
	Ctx     context.Context
	Dir     string
	Message string
}

type MockAddCall struct {
	Ctx   context.Context
	Dir   string
	Files []string
}

type MockPushCall struct {
	Ctx     context.Context
	Dir     string
	Options *wiki.PushOptions
}

type MockPullCall struct {
	Ctx context.Context
	Dir string
}

type MockStatusCall struct {
	Ctx context.Context
	Dir string
}

type MockGetCurrentSHACall struct {
	Ctx context.Context
	Dir string
}

type MockGetRemoteURLCall struct {
	Ctx context.Context
	Dir string
}

type MockGetCurrentBranchCall struct {
	Ctx context.Context
	Dir string
}

type MockCheckoutBranchCall struct {
	Ctx    context.Context
	Dir    string
	Branch string
}

type MockSetConfigCall struct {
	Ctx   context.Context
	Dir   string
	Key   string
	Value string
}

type MockGetConfigCall struct {
	Ctx context.Context
	Dir string
	Key string
}

type MockUnsetConfigCall struct {
	Ctx context.Context
	Dir string
	Key string
}

// NewMockGitClient creates a new mock git client
func NewMockGitClient() *MockGitClient {
	return &MockGitClient{
		CloneFunc: func(ctx context.Context, url, dir string, options *wiki.CloneOptions) error {
			return nil
		},
		AddFunc: func(ctx context.Context, dir string, files []string) error {
			return nil
		},
		CommitFunc: func(ctx context.Context, dir, message string, options *wiki.CommitOptions) error {
			return nil
		},
		PushFunc: func(ctx context.Context, dir string, options *wiki.PushOptions) error {
			return nil
		},
		PullFunc: func(ctx context.Context, dir string) error {
			return nil
		},
		StatusFunc: func(ctx context.Context, dir string) (*wiki.GitStatus, error) {
			return &wiki.GitStatus{
				IsClean:        true,
				HasUncommitted: false,
				HasUntracked:   false,
				ModifiedFiles:  []string{},
				UntrackedFiles: []string{},
				StagedFiles:    []string{},
				Branch:         "master",
				Ahead:          0,
				Behind:         0,
			}, nil
		},
		GetCurrentSHAFunc: func(ctx context.Context, dir string) (string, error) {
			return "abc123def456", nil
		},
		GetRemoteURLFunc: func(ctx context.Context, dir string) (string, error) {
			return "https://github.com/test/test.wiki.git", nil
		},
		GetCurrentBranchFunc: func(ctx context.Context, dir string) (string, error) {
			return "master", nil
		},
		CheckoutBranchFunc: func(ctx context.Context, dir string, branch string) error {
			return nil
		},
		SetConfigFunc: func(ctx context.Context, dir string, key, value string) error {
			return nil
		},
		GetConfigFunc: func(ctx context.Context, dir string, key string) (string, error) {
			return "config-value", nil
		},
		UnsetConfigFunc: func(ctx context.Context, dir string, key string) error {
			return nil
		},
	}
}

// Interface implementation
func (m *MockGitClient) Clone(ctx context.Context, url, dir string, options *wiki.CloneOptions) error {
	m.CloneCalls = append(m.CloneCalls, MockCloneCall{
		Ctx: ctx, URL: url, Dir: dir, Options: options,
	})
	return m.CloneFunc(ctx, url, dir, options)
}

func (m *MockGitClient) Add(ctx context.Context, dir string, files []string) error {
	m.AddCalls = append(m.AddCalls, MockAddCall{
		Ctx: ctx, Dir: dir, Files: files,
	})
	return m.AddFunc(ctx, dir, files)
}

func (m *MockGitClient) Commit(ctx context.Context, dir, message string, options *wiki.CommitOptions) error {
	m.CommitCalls = append(m.CommitCalls, MockCommitCall{
		Ctx: ctx, Dir: dir, Message: message,
	})
	return m.CommitFunc(ctx, dir, message, options)
}

func (m *MockGitClient) Push(ctx context.Context, dir string, options *wiki.PushOptions) error {
	m.PushCalls = append(m.PushCalls, MockPushCall{Ctx: ctx, Dir: dir, Options: options})
	return m.PushFunc(ctx, dir, options)
}

func (m *MockGitClient) Pull(ctx context.Context, dir string) error {
	m.PullCalls = append(m.PullCalls, MockPullCall{Ctx: ctx, Dir: dir})
	return m.PullFunc(ctx, dir)
}

func (m *MockGitClient) Status(ctx context.Context, dir string) (*wiki.GitStatus, error) {
	m.StatusCalls = append(m.StatusCalls, MockStatusCall{Ctx: ctx, Dir: dir})
	return m.StatusFunc(ctx, dir)
}

func (m *MockGitClient) GetCurrentSHA(ctx context.Context, dir string) (string, error) {
	m.GetCurrentSHACalls = append(m.GetCurrentSHACalls, MockGetCurrentSHACall{Ctx: ctx, Dir: dir})
	return m.GetCurrentSHAFunc(ctx, dir)
}

func (m *MockGitClient) GetRemoteURL(ctx context.Context, dir string) (string, error) {
	m.GetRemoteURLCalls = append(m.GetRemoteURLCalls, MockGetRemoteURLCall{Ctx: ctx, Dir: dir})
	return m.GetRemoteURLFunc(ctx, dir)
}

func (m *MockGitClient) GetCurrentBranch(ctx context.Context, dir string) (string, error) {
	m.GetCurrentBranchCalls = append(m.GetCurrentBranchCalls, MockGetCurrentBranchCall{Ctx: ctx, Dir: dir})
	return m.GetCurrentBranchFunc(ctx, dir)
}

func (m *MockGitClient) CheckoutBranch(ctx context.Context, dir string, branch string) error {
	m.CheckoutBranchCalls = append(m.CheckoutBranchCalls, MockCheckoutBranchCall{Ctx: ctx, Dir: dir, Branch: branch})
	return m.CheckoutBranchFunc(ctx, dir, branch)
}

func (m *MockGitClient) SetConfig(ctx context.Context, dir string, key, value string) error {
	m.SetConfigCalls = append(m.SetConfigCalls, MockSetConfigCall{Ctx: ctx, Dir: dir, Key: key, Value: value})
	return m.SetConfigFunc(ctx, dir, key, value)
}

func (m *MockGitClient) GetConfig(ctx context.Context, dir string, key string) (string, error) {
	m.GetConfigCalls = append(m.GetConfigCalls, MockGetConfigCall{Ctx: ctx, Dir: dir, Key: key})
	return m.GetConfigFunc(ctx, dir, key)
}

func (m *MockGitClient) UnsetConfig(ctx context.Context, dir string, key string) error {
	m.UnsetConfigCalls = append(m.UnsetConfigCalls, MockUnsetConfigCall{Ctx: ctx, Dir: dir, Key: key})
	return m.UnsetConfigFunc(ctx, dir, key)
}

// Helper methods for assertions
func (m *MockGitClient) AssertCloneCalledTimes(t *testing.T, times int) {
	if len(m.CloneCalls) != times {
		t.Errorf("Expected Clone to be called %d times, but was called %d times", times, len(m.CloneCalls))
	}
}

func (m *MockGitClient) AssertCloneCalledWith(t *testing.T, expectedURL, expectedDir string) {
	if len(m.CloneCalls) == 0 {
		t.Error("Expected Clone to be called, but it wasn't")
		return
	}

	lastCall := m.CloneCalls[len(m.CloneCalls)-1]
	if lastCall.URL != expectedURL {
		t.Errorf("Expected Clone to be called with URL %s, but was called with %s", expectedURL, lastCall.URL)
	}
	if lastCall.Dir != expectedDir {
		t.Errorf("Expected Clone to be called with dir %s, but was called with %s", expectedDir, lastCall.Dir)
	}
}

func (m *MockGitClient) Reset() {
	m.CloneCalls = nil
	m.PullCalls = nil
	m.PushCalls = nil
	m.AddCalls = nil
	m.CommitCalls = nil
	m.StatusCalls = nil
	m.GetCurrentSHACalls = nil
	m.GetRemoteURLCalls = nil
	m.GetCurrentBranchCalls = nil
	m.CheckoutBranchCalls = nil
	m.SetConfigCalls = nil
	m.GetConfigCalls = nil
	m.UnsetConfigCalls = nil
}

// MockPerformanceMonitor for testing performance monitoring
type MockPerformanceMonitor struct {
	StartFunc               func(ctx context.Context)
	StopFunc                func()
	RecordGitOperationFunc  func(duration time.Duration)
	RecordFileOperationFunc func(duration time.Duration)
	GetStatsFunc            func() map[string]interface{}
	ForceGCFunc             func()

	// Call tracking
	StartCalls               []context.Context
	StopCalls                int
	RecordGitOperationCalls  []time.Duration
	RecordFileOperationCalls []time.Duration
	GetStatsCalls            int
	ForceGCCalls             int
}

// NewMockPerformanceMonitor creates a new mock performance monitor
func NewMockPerformanceMonitor() *MockPerformanceMonitor {
	return &MockPerformanceMonitor{
		StartFunc:               func(ctx context.Context) {},
		StopFunc:                func() {},
		RecordGitOperationFunc:  func(duration time.Duration) {},
		RecordFileOperationFunc: func(duration time.Duration) {},
		GetStatsFunc: func() map[string]interface{} {
			return map[string]interface{}{
				"total_operations":  0,
				"total_duration_ms": int64(0),
				"current_memory_mb": int64(10),
				"total_allocations": 0,
			}
		},
		ForceGCFunc: func() {},
	}
}

// Interface implementation
func (m *MockPerformanceMonitor) Start(ctx context.Context) {
	m.StartCalls = append(m.StartCalls, ctx)
	m.StartFunc(ctx)
}

func (m *MockPerformanceMonitor) Stop() {
	m.StopCalls++
	m.StopFunc()
}

func (m *MockPerformanceMonitor) RecordGitOperation(duration time.Duration) {
	m.RecordGitOperationCalls = append(m.RecordGitOperationCalls, duration)
	m.RecordGitOperationFunc(duration)
}

func (m *MockPerformanceMonitor) RecordFileOperation(duration time.Duration) {
	m.RecordFileOperationCalls = append(m.RecordFileOperationCalls, duration)
	m.RecordFileOperationFunc(duration)
}

func (m *MockPerformanceMonitor) GetStats() map[string]interface{} {
	m.GetStatsCalls++
	return m.GetStatsFunc()
}

func (m *MockPerformanceMonitor) ForceGC() {
	m.ForceGCCalls++
	m.ForceGCFunc()
}

// Helper methods
func (m *MockPerformanceMonitor) AssertStartCalledTimes(t *testing.T, times int) {
	if len(m.StartCalls) != times {
		t.Errorf("Expected Start to be called %d times, but was called %d times", times, len(m.StartCalls))
	}
}

func (m *MockPerformanceMonitor) Reset() {
	m.StartCalls = nil
	m.StopCalls = 0
	m.RecordGitOperationCalls = nil
	m.RecordFileOperationCalls = nil
	m.GetStatsCalls = 0
	m.ForceGCCalls = 0
}

// MockTempManager for testing temporary directory management
type MockTempManager struct {
	CreateTempDirFunc       func(prefix string) (string, error)
	CleanupAllFunc          func() error
	MarkInUseFunc           func(dir string, inUse bool)
	UpdateDirectorySizeFunc func(dir string) error
	GetStatsFunc            func() map[string]interface{}
	ShutdownFunc            func(cleanupAll bool) error

	// Call tracking
	CreateTempDirCalls       []string
	CleanupAllCalls          int
	MarkInUseCalls           []MockMarkInUseCall
	UpdateDirectorySizeCalls []string
	GetStatsCalls            int
	ShutdownCalls            []bool

	// State tracking
	CreatedDirectories []string
	InUseDirectories   map[string]bool
}

type MockMarkInUseCall struct {
	Dir   string
	InUse bool
}

// NewMockTempManager creates a new mock temp manager
func NewMockTempManager() *MockTempManager {
	return &MockTempManager{
		CreateTempDirFunc: func(prefix string) (string, error) {
			return "/tmp/mock-" + prefix, nil
		},
		CleanupAllFunc: func() error {
			return nil
		},
		MarkInUseFunc: func(dir string, inUse bool) {},
		UpdateDirectorySizeFunc: func(dir string) error {
			return nil
		},
		GetStatsFunc: func() map[string]interface{} {
			return map[string]interface{}{
				"total_directories": 0,
				"total_size_mb":     int64(0),
				"in_use_count":      0,
			}
		},
		ShutdownFunc: func(cleanupAll bool) error {
			return nil
		},
		InUseDirectories: make(map[string]bool),
	}
}

// Interface implementation
func (m *MockTempManager) CreateTempDir(prefix string) (string, error) {
	m.CreateTempDirCalls = append(m.CreateTempDirCalls, prefix)
	dir, err := m.CreateTempDirFunc(prefix)
	if err == nil {
		m.CreatedDirectories = append(m.CreatedDirectories, dir)
	}
	return dir, err
}

func (m *MockTempManager) CleanupAll() error {
	m.CleanupAllCalls++
	return m.CleanupAllFunc()
}

func (m *MockTempManager) MarkInUse(dir string, inUse bool) {
	m.MarkInUseCalls = append(m.MarkInUseCalls, MockMarkInUseCall{Dir: dir, InUse: inUse})
	m.InUseDirectories[dir] = inUse
	m.MarkInUseFunc(dir, inUse)
}

func (m *MockTempManager) UpdateDirectorySize(dir string) error {
	m.UpdateDirectorySizeCalls = append(m.UpdateDirectorySizeCalls, dir)
	return m.UpdateDirectorySizeFunc(dir)
}

func (m *MockTempManager) GetStats() map[string]interface{} {
	m.GetStatsCalls++
	return m.GetStatsFunc()
}

func (m *MockTempManager) Shutdown(cleanupAll bool) error {
	m.ShutdownCalls = append(m.ShutdownCalls, cleanupAll)
	return m.ShutdownFunc(cleanupAll)
}

// Helper methods
func (m *MockTempManager) AssertCreateTempDirCalledTimes(t *testing.T, times int) {
	if len(m.CreateTempDirCalls) != times {
		t.Errorf("Expected CreateTempDir to be called %d times, but was called %d times", times, len(m.CreateTempDirCalls))
	}
}

func (m *MockTempManager) AssertDirectoryMarkedInUse(t *testing.T, dir string, inUse bool) {
	if m.InUseDirectories[dir] != inUse {
		t.Errorf("Expected directory %s to be marked inUse=%v, but was %v", dir, inUse, m.InUseDirectories[dir])
	}
}

func (m *MockTempManager) Reset() {
	m.CreateTempDirCalls = nil
	m.CleanupAllCalls = 0
	m.MarkInUseCalls = nil
	m.UpdateDirectorySizeCalls = nil
	m.GetStatsCalls = 0
	m.ShutdownCalls = nil
	m.CreatedDirectories = nil
	m.InUseDirectories = make(map[string]bool)
}

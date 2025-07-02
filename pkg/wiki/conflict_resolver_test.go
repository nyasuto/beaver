package wiki

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/nyasuto/beaver/pkg/git"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// ConflictResolverMockGitClient for testing ConflictResolver
type ConflictResolverMockGitClient struct {
	mock.Mock
}

func (m *ConflictResolverMockGitClient) Clone(ctx context.Context, url, dir string, options *CloneOptions) error {
	args := m.Called(ctx, url, dir, options)
	return args.Error(0)
}

func (m *ConflictResolverMockGitClient) Pull(ctx context.Context, dir string) error {
	args := m.Called(ctx, dir)
	return args.Error(0)
}

func (m *ConflictResolverMockGitClient) Push(ctx context.Context, dir string, options *PushOptions) error {
	args := m.Called(ctx, dir, options)
	return args.Error(0)
}

func (m *ConflictResolverMockGitClient) Add(ctx context.Context, dir string, files []string) error {
	args := m.Called(ctx, dir, files)
	return args.Error(0)
}

func (m *ConflictResolverMockGitClient) Commit(ctx context.Context, dir string, message string, options *CommitOptions) error {
	args := m.Called(ctx, dir, message, options)
	return args.Error(0)
}

func (m *ConflictResolverMockGitClient) Status(ctx context.Context, dir string) (*GitStatus, error) {
	args := m.Called(ctx, dir)
	return args.Get(0).(*GitStatus), args.Error(1)
}

func (m *ConflictResolverMockGitClient) GetCurrentSHA(ctx context.Context, dir string) (string, error) {
	args := m.Called(ctx, dir)
	return args.String(0), args.Error(1)
}

func (m *ConflictResolverMockGitClient) GetRemoteURL(ctx context.Context, dir string) (string, error) {
	args := m.Called(ctx, dir)
	return args.String(0), args.Error(1)
}

func (m *ConflictResolverMockGitClient) GetCurrentBranch(ctx context.Context, dir string) (string, error) {
	args := m.Called(ctx, dir)
	return args.String(0), args.Error(1)
}

func (m *ConflictResolverMockGitClient) CheckoutBranch(ctx context.Context, dir string, branch string) error {
	args := m.Called(ctx, dir, branch)
	return args.Error(0)
}

func (m *ConflictResolverMockGitClient) SetConfig(ctx context.Context, dir string, key, value string) error {
	args := m.Called(ctx, dir, key, value)
	return args.Error(0)
}

func (m *ConflictResolverMockGitClient) GetConfig(ctx context.Context, dir string, key string) (string, error) {
	args := m.Called(ctx, dir, key)
	return args.String(0), args.Error(1)
}

func (m *ConflictResolverMockGitClient) UnsetConfig(ctx context.Context, dir string, key string) error {
	args := m.Called(ctx, dir, key)
	return args.Error(0)
}

// New methods added for the extended GitClient interface
func (m *ConflictResolverMockGitClient) CreateOrphanBranch(ctx context.Context, dir string, branch string) error {
	args := m.Called(ctx, dir, branch)
	return args.Error(0)
}

func (m *ConflictResolverMockGitClient) BranchExists(ctx context.Context, dir string, branch string) error {
	args := m.Called(ctx, dir, branch)
	return args.Error(0)
}

func (m *ConflictResolverMockGitClient) Stash(ctx context.Context, dir string, message string) error {
	args := m.Called(ctx, dir, message)
	return args.Error(0)
}

func (m *ConflictResolverMockGitClient) StashPop(ctx context.Context, dir string) error {
	args := m.Called(ctx, dir)
	return args.Error(0)
}

func (m *ConflictResolverMockGitClient) RemoveFiles(ctx context.Context, dir string, paths []string, recursive bool) error {
	args := m.Called(ctx, dir, paths, recursive)
	return args.Error(0)
}

// Analytics methods
func (m *ConflictResolverMockGitClient) GetCommitHistory(ctx context.Context, dir string, options *git.CommitHistoryOptions) ([]byte, error) {
	args := m.Called(ctx, dir, options)
	return args.Get(0).([]byte), args.Error(1)
}

func (m *ConflictResolverMockGitClient) GetCommitCount(ctx context.Context, dir string) (int, error) {
	args := m.Called(ctx, dir)
	return args.Int(0), args.Error(1)
}

func (m *ConflictResolverMockGitClient) GetContributorCount(ctx context.Context, dir string) (int, error) {
	args := m.Called(ctx, dir)
	return args.Int(0), args.Error(1)
}

func (m *ConflictResolverMockGitClient) GetFirstCommitDate(ctx context.Context, dir string) (time.Time, error) {
	args := m.Called(ctx, dir)
	return args.Get(0).(time.Time), args.Error(1)
}

func (m *ConflictResolverMockGitClient) GetBranchCount(ctx context.Context, dir string) (int, error) {
	args := m.Called(ctx, dir)
	return args.Int(0), args.Error(1)
}

func TestConflictResolver_DefaultConfig(t *testing.T) {
	config := DefaultConflictResolverConfig()

	assert.Equal(t, StrategyMerge, config.Strategy)
	assert.Equal(t, 5, config.MaxRetries)
	assert.Equal(t, 1*time.Second, config.BaseDelay)
	assert.Equal(t, 30*time.Second, config.MaxDelay)
	assert.Equal(t, 0.1, config.JitterFactor)
}

func TestConflictResolver_NewConflictResolver(t *testing.T) {
	mockClient := &ConflictResolverMockGitClient{}
	config := DefaultConflictResolverConfig()

	resolver := NewConflictResolver(mockClient, config)

	assert.NotNil(t, resolver)
	assert.Equal(t, StrategyMerge, resolver.strategy)
	assert.Equal(t, 5, resolver.maxRetries)
}

func TestConflictResolver_SafeUpdate_Success(t *testing.T) {
	mockClient := &ConflictResolverMockGitClient{}
	resolver := NewConflictResolver(mockClient, DefaultConflictResolverConfig())

	ctx := context.Background()
	workDir := "/test/workdir"
	commitMessage := "Test commit"
	files := []string{"file1.md", "file2.md"}

	// Mock successful operations
	mockClient.On("Status", ctx, workDir).Return(&GitStatus{HasUncommitted: false}, nil)
	mockClient.On("Pull", ctx, workDir).Return(nil)
	mockClient.On("Add", ctx, workDir, files).Return(nil)
	mockClient.On("Commit", ctx, workDir, commitMessage, mock.AnythingOfType("*git.CommitOptions")).Return(nil)
	mockClient.On("Push", ctx, workDir, mock.AnythingOfType("*git.PushOptions")).Return(nil)

	err := resolver.SafeUpdate(ctx, workDir, commitMessage, files)

	assert.NoError(t, err)
	mockClient.AssertExpectations(t)
}

func TestConflictResolver_SafeUpdate_ConflictResolution(t *testing.T) {
	mockClient := &ConflictResolverMockGitClient{}
	config := DefaultConflictResolverConfig()
	config.MaxRetries = 3
	config.BaseDelay = 10 * time.Millisecond // Speed up test
	resolver := NewConflictResolver(mockClient, config)

	ctx := context.Background()
	workDir := "/test/workdir"
	commitMessage := "Test commit"
	files := []string{"file1.md"}

	// First attempt: conflict
	mockClient.On("Status", ctx, workDir).Return(&GitStatus{HasUncommitted: false}, nil).Once()
	mockClient.On("Pull", ctx, workDir).Return(nil).Once()
	mockClient.On("Add", ctx, workDir, files).Return(nil).Once()
	mockClient.On("Commit", ctx, workDir, commitMessage, mock.AnythingOfType("*git.CommitOptions")).Return(nil).Once()
	pushConflictError := errors.New("failed to push some refs to 'origin'. Updates were rejected")
	mockClient.On("Push", ctx, workDir, mock.AnythingOfType("*git.PushOptions")).Return(pushConflictError).Once()

	// Second attempt: success
	mockClient.On("Status", ctx, workDir).Return(&GitStatus{HasUncommitted: false}, nil).Once()
	mockClient.On("Pull", ctx, workDir).Return(nil).Once()
	mockClient.On("Add", ctx, workDir, files).Return(nil).Once()
	mockClient.On("Commit", ctx, workDir, commitMessage, mock.AnythingOfType("*git.CommitOptions")).Return(nil).Once()
	mockClient.On("Push", ctx, workDir, mock.AnythingOfType("*git.PushOptions")).Return(nil).Once()

	err := resolver.SafeUpdate(ctx, workDir, commitMessage, files)

	assert.NoError(t, err)
	mockClient.AssertExpectations(t)
}

func TestConflictResolver_SafeUpdate_MaxRetriesExceeded(t *testing.T) {
	mockClient := &ConflictResolverMockGitClient{}
	config := DefaultConflictResolverConfig()
	config.MaxRetries = 2
	config.BaseDelay = 1 * time.Millisecond // Speed up test
	resolver := NewConflictResolver(mockClient, config)

	ctx := context.Background()
	workDir := "/test/workdir"
	commitMessage := "Test commit"
	files := []string{"file1.md"}

	// All attempts fail with conflict
	pushConflictError := errors.New("rejected: fetch first")

	for i := 0; i < config.MaxRetries; i++ {
		mockClient.On("Status", ctx, workDir).Return(&GitStatus{HasUncommitted: false}, nil).Once()
		mockClient.On("Pull", ctx, workDir).Return(nil).Once()
		mockClient.On("Add", ctx, workDir, files).Return(nil).Once()
		mockClient.On("Commit", ctx, workDir, commitMessage, mock.AnythingOfType("*git.CommitOptions")).Return(nil).Once()
		mockClient.On("Push", ctx, workDir, mock.AnythingOfType("*git.PushOptions")).Return(pushConflictError).Once()
	}

	err := resolver.SafeUpdate(ctx, workDir, commitMessage, files)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "SafeUpdate failed after")
	mockClient.AssertExpectations(t)
}

func TestConflictResolver_isPushConflict(t *testing.T) {
	resolver := NewConflictResolver(&ConflictResolverMockGitClient{}, DefaultConflictResolverConfig())

	tests := []struct {
		name     string
		err      error
		expected bool
	}{
		{
			name:     "nil error",
			err:      nil,
			expected: false,
		},
		{
			name:     "rejected error",
			err:      errors.New("! [rejected] master -> master (fetch first)"),
			expected: true,
		},
		{
			name:     "updates rejected error",
			err:      errors.New("Updates were rejected because the remote contains work"),
			expected: true,
		},
		{
			name:     "non-fast-forward error",
			err:      errors.New("non-fast-forward"),
			expected: true,
		},
		{
			name:     "failed to push refs error",
			err:      errors.New("failed to push some refs to 'origin'"),
			expected: true,
		},
		{
			name:     "other error",
			err:      errors.New("permission denied"),
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := resolver.isPushConflict(tt.err)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestConflictResolver_calculateBackoffDelay(t *testing.T) {
	config := DefaultConflictResolverConfig()
	config.BaseDelay = 100 * time.Millisecond
	config.MaxDelay = 1 * time.Second
	config.JitterFactor = 0 // Disable jitter for predictable testing

	resolver := NewConflictResolver(&ConflictResolverMockGitClient{}, config)

	tests := []struct {
		name     string
		attempt  int
		expected time.Duration
	}{
		{
			name:     "first retry (attempt 0)",
			attempt:  0,
			expected: 100 * time.Millisecond,
		},
		{
			name:     "second retry (attempt 1)",
			attempt:  1,
			expected: 200 * time.Millisecond,
		},
		{
			name:     "third retry (attempt 2)",
			attempt:  2,
			expected: 400 * time.Millisecond,
		},
		{
			name:     "capped at max delay",
			attempt:  10,
			expected: 1 * time.Second, // Should be capped
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			delay := resolver.calculateBackoffDelay(tt.attempt)
			assert.Equal(t, tt.expected, delay)
		})
	}
}

func TestConflictResolver_SetStrategy(t *testing.T) {
	resolver := NewConflictResolver(&ConflictResolverMockGitClient{}, DefaultConflictResolverConfig())

	// Initial strategy should be merge
	assert.Equal(t, StrategyMerge, resolver.GetStrategy())

	// Change to overwrite
	resolver.SetStrategy(StrategyOverwrite)
	assert.Equal(t, StrategyOverwrite, resolver.GetStrategy())

	// Change to abort
	resolver.SetStrategy(StrategyAbort)
	assert.Equal(t, StrategyAbort, resolver.GetStrategy())
}

func TestConflictStrategy_String(t *testing.T) {
	tests := []struct {
		strategy ConflictStrategy
		expected string
	}{
		{StrategyMerge, "merge"},
		{StrategyOverwrite, "overwrite"},
		{StrategyAbort, "abort"},
		{ConflictStrategy(999), "unknown"},
	}

	for _, tt := range tests {
		t.Run(tt.expected, func(t *testing.T) {
			assert.Equal(t, tt.expected, tt.strategy.String())
		})
	}
}

func TestConflictResolver_pullLatestChanges_AlreadyUpToDate(t *testing.T) {
	mockClient := &ConflictResolverMockGitClient{}
	resolver := NewConflictResolver(mockClient, DefaultConflictResolverConfig())

	ctx := context.Background()
	workDir := "/test/workdir"

	// Mock status check
	mockClient.On("Status", ctx, workDir).Return(&GitStatus{HasUncommitted: false}, nil)

	// Mock pull that returns "already up to date"
	upToDateError := errors.New("Already up to date.")
	mockClient.On("Pull", ctx, workDir).Return(upToDateError)

	err := resolver.pullLatestChanges(ctx, workDir)

	assert.NoError(t, err) // Should not be treated as error
	mockClient.AssertExpectations(t)
}

func TestConflictResolver_handleOverwriteStrategy(t *testing.T) {
	mockClient := &ConflictResolverMockGitClient{}
	resolver := NewConflictResolver(mockClient, DefaultConflictResolverConfig())
	resolver.SetStrategy(StrategyOverwrite)

	ctx := context.Background()
	workDir := "/test/workdir"

	// Mock successful force push
	mockClient.On("Push", ctx, workDir, mock.MatchedBy(func(opts *PushOptions) bool {
		return opts.Force == true
	})).Return(nil)

	err := resolver.handleOverwriteStrategy(ctx, workDir)

	assert.NoError(t, err)
	mockClient.AssertExpectations(t)
}

func TestConflictResolver_handleAbortStrategy(t *testing.T) {
	mockClient := &ConflictResolverMockGitClient{}
	config := DefaultConflictResolverConfig()
	config.Strategy = StrategyAbort
	resolver := NewConflictResolver(mockClient, config)

	ctx := context.Background()
	workDir := "/test/workdir"
	commitMessage := "Test commit"
	files := []string{"file1.md"}

	// Mock operations up to push conflict
	mockClient.On("Status", ctx, workDir).Return(&GitStatus{HasUncommitted: false}, nil)
	mockClient.On("Pull", ctx, workDir).Return(nil)
	mockClient.On("Add", ctx, workDir, files).Return(nil)
	mockClient.On("Commit", ctx, workDir, commitMessage, mock.AnythingOfType("*git.CommitOptions")).Return(nil)

	// Push fails with conflict
	pushConflictError := errors.New("rejected: fetch first")
	mockClient.On("Push", ctx, workDir, mock.AnythingOfType("*git.PushOptions")).Return(pushConflictError)

	err := resolver.SafeUpdate(ctx, workDir, commitMessage, files)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "conflict detected and strategy is set to abort")
	mockClient.AssertExpectations(t)
}

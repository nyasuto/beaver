package git

import (
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewInMemoryGitClient(t *testing.T) {
	client := NewInMemoryGitClient()
	assert.NotNil(t, client)

	impl, ok := client.(*InMemoryGitClientImpl)
	assert.True(t, ok)
	assert.Equal(t, 30*time.Second, impl.timeout)
	assert.Nil(t, impl.auth)
}

func TestNewInMemoryGitClientWithAuth(t *testing.T) {
	token := "test-token"
	client := NewInMemoryGitClientWithAuth(token)
	assert.NotNil(t, client)

	impl, ok := client.(*InMemoryGitClientImpl)
	assert.True(t, ok)
	assert.NotNil(t, impl.auth)
}

func TestCreateWorkspace(t *testing.T) {
	client := NewInMemoryGitClient()

	repo, fs, err := client.CreateWorkspace()
	require.NoError(t, err)
	assert.NotNil(t, repo)
	assert.NotNil(t, fs)
}

func TestInMemoryFileOperations(t *testing.T) {
	client := NewInMemoryGitClient()

	repo, fs, err := client.CreateWorkspace()
	require.NoError(t, err)

	// Create an initial commit to establish HEAD
	err = client.WriteFile(fs, "initial.txt", []byte("initial"), 0644)
	require.NoError(t, err)
	err = client.AddFiles(repo, fs, []string{"initial.txt"})
	require.NoError(t, err)
	_, err = client.CommitChanges(repo, "Initial commit", nil)
	require.NoError(t, err)

	// Test writing a file
	content := []byte("Hello, World!")
	err = client.WriteFile(fs, "test.txt", content, 0644)
	require.NoError(t, err)

	// Test reading the file
	readContent, err := client.ReadFile(fs, "test.txt")
	require.NoError(t, err)
	assert.Equal(t, content, readContent)

	// Test adding the file to git
	err = client.AddFiles(repo, fs, []string{"test.txt"})
	require.NoError(t, err)

	// Test getting status
	status, err := client.GetStatus(repo)
	require.NoError(t, err)
	assert.False(t, status.IsClean)
	assert.Contains(t, status.StagedFiles, "test.txt")
}

func TestInMemoryCommitOperations(t *testing.T) {
	client := NewInMemoryGitClient()

	repo, fs, err := client.CreateWorkspace()
	require.NoError(t, err)

	// Write and add a file
	content := []byte("Test content")
	err = client.WriteFile(fs, "commit-test.txt", content, 0644)
	require.NoError(t, err)

	err = client.AddFiles(repo, fs, []string{"commit-test.txt"})
	require.NoError(t, err)

	// Commit the changes
	commitOptions := &CommitOptions{
		Author: &CommitAuthor{
			Name:  "Test User",
			Email: "test@example.com",
		},
	}

	commit, err := client.CommitChanges(repo, "Initial commit", commitOptions)
	require.NoError(t, err)
	assert.NotNil(t, commit)
	assert.Equal(t, "Initial commit", commit.Message)
	assert.Equal(t, "Test User", commit.Author.Name)

	// Verify status is clean after commit
	status, err := client.GetStatus(repo)
	require.NoError(t, err)
	assert.True(t, status.IsClean)
}

func TestInMemoryBranchOperations(t *testing.T) {
	client := NewInMemoryGitClient()

	repo, fs, err := client.CreateWorkspace()
	require.NoError(t, err)

	// Create initial commit
	err = client.WriteFile(fs, "branch-test.txt", []byte("content"), 0644)
	require.NoError(t, err)
	err = client.AddFiles(repo, fs, []string{"branch-test.txt"})
	require.NoError(t, err)
	_, err = client.CommitChanges(repo, "Initial commit", nil)
	require.NoError(t, err)

	// Test current branch
	currentBranch, err := client.GetCurrentBranch(repo)
	require.NoError(t, err)
	assert.Equal(t, "master", currentBranch) // Default branch

	// Test branch creation
	err = client.CreateBranch(repo, "feature")
	require.NoError(t, err)

	// Verify we're on the new branch
	currentBranch, err = client.GetCurrentBranch(repo)
	require.NoError(t, err)
	assert.Equal(t, "feature", currentBranch)

	// Test branch existence
	exists := client.BranchExists(repo, "feature")
	assert.True(t, exists)

	exists = client.BranchExists(repo, "nonexistent")
	assert.False(t, exists)

	// Test listing branches
	branches, err := client.ListBranches(repo)
	require.NoError(t, err)
	assert.Len(t, branches, 2) // master and feature

	var featureBranch *BranchInfo
	for _, branch := range branches {
		if branch.Name == "feature" {
			featureBranch = branch
			break
		}
	}
	require.NotNil(t, featureBranch)
	assert.True(t, featureBranch.IsCurrent)
}

func TestInMemoryConfigOperations(t *testing.T) {
	client := NewInMemoryGitClient()

	repo, _, err := client.CreateWorkspace()
	require.NoError(t, err)

	// Test setting config
	err = client.SetConfig(repo, "user.name", "Test User")
	require.NoError(t, err)

	err = client.SetConfig(repo, "user.email", "test@example.com")
	require.NoError(t, err)

	// Test getting config
	name, err := client.GetConfig(repo, "user.name")
	require.NoError(t, err)
	assert.Equal(t, "Test User", name)

	email, err := client.GetConfig(repo, "user.email")
	require.NoError(t, err)
	assert.Equal(t, "test@example.com", email)

	// Test getting all config
	cfg, err := client.GetAllConfig(repo)
	require.NoError(t, err)
	assert.NotNil(t, cfg)

	// Test unsetting config
	err = client.UnsetConfig(repo, "user.name")
	require.NoError(t, err)

	// Verify config was unset
	name, err = client.GetConfig(repo, "user.name")
	require.NoError(t, err)
	assert.Empty(t, name)
}

func TestInMemoryAnalyticsOperations(t *testing.T) {
	client := NewInMemoryGitClient()

	repo, fs, err := client.CreateWorkspace()
	require.NoError(t, err)

	// Create some commits for analytics
	for i := 0; i < 3; i++ {
		filename := fmt.Sprintf("file%d.txt", i)
		content := fmt.Sprintf("Content %d", i)

		err = client.WriteFile(fs, filename, []byte(content), 0644)
		require.NoError(t, err)

		err = client.AddFiles(repo, fs, []string{filename})
		require.NoError(t, err)

		_, err = client.CommitChanges(repo, fmt.Sprintf("Commit %d", i), &CommitOptions{
			Author: &CommitAuthor{
				Name:  fmt.Sprintf("Author %d", i%2),
				Email: fmt.Sprintf("author%d@example.com", i%2),
			},
		})
		require.NoError(t, err)

		// Add small delay to ensure different timestamps
		time.Sleep(10 * time.Millisecond)
	}

	// Test commit count
	count, err := client.GetCommitCount(repo)
	require.NoError(t, err)
	assert.Equal(t, 3, count)

	// Test commit history
	commits, err := client.GetCommitHistory(repo, &CommitHistoryOptions{
		MaxCommits: 5,
	})
	require.NoError(t, err)
	assert.Len(t, commits, 3)

	// Test contributors
	contributors, err := client.GetContributors(repo)
	require.NoError(t, err)
	assert.Len(t, contributors, 2) // Two different authors

	// Test first commit date
	firstDate, err := client.GetFirstCommitDate(repo)
	require.NoError(t, err)
	assert.False(t, firstDate.IsZero())

	// Test branch count
	branchCount, err := client.GetBranchCount(repo)
	require.NoError(t, err)
	assert.Equal(t, 1, branchCount) // Only master branch
}

func TestInMemoryRemoteOperations(t *testing.T) {
	client := NewInMemoryGitClient()

	repo, _, err := client.CreateWorkspace()
	require.NoError(t, err)

	// Test adding remote
	err = client.AddRemote(repo, "origin", "https://github.com/test/repo.git")
	require.NoError(t, err)

	// Test listing remotes
	remotes, err := client.ListRemotes(repo)
	require.NoError(t, err)
	assert.Len(t, remotes, 1)
	assert.Equal(t, "origin", remotes[0].Name)
	assert.Contains(t, remotes[0].URLs, "https://github.com/test/repo.git")

	// Test getting remote URL
	url, err := client.GetRemoteURL(repo, "origin")
	require.NoError(t, err)
	assert.Equal(t, "https://github.com/test/repo.git", url)

	// Test removing remote
	err = client.RemoveRemote(repo, "origin")
	require.NoError(t, err)

	// Verify remote was removed
	remotes, err = client.ListRemotes(repo)
	require.NoError(t, err)
	assert.Len(t, remotes, 0)
}

func TestNewInMemoryWorkspace(t *testing.T) {
	workspace, err := NewInMemoryWorkspace()
	require.NoError(t, err)
	assert.NotNil(t, workspace)
	assert.NotNil(t, workspace.Repository)
	assert.NotNil(t, workspace.Filesystem)
	assert.NotNil(t, workspace.Config)
	assert.NotNil(t, workspace.Client)
}

func TestInMemoryWorkspaceOperations(t *testing.T) {
	workspace, err := NewInMemoryWorkspace()
	require.NoError(t, err)

	// Test writing file with commit
	content := []byte("Workspace test content")
	commit, err := workspace.WriteFileWithCommit("workspace-test.txt", content, "Add workspace test file")
	require.NoError(t, err)
	assert.NotNil(t, commit)
	assert.Equal(t, "Add workspace test file", commit.Message)

	// Test getting files snapshot
	snapshot, err := workspace.GetFilesSnapshot()
	require.NoError(t, err)
	assert.Contains(t, snapshot, "workspace-test.txt")
	assert.Equal(t, content, snapshot["workspace-test.txt"])
}

func TestInMemoryStashPlaceholder(t *testing.T) {
	client := NewInMemoryGitClient()

	repo, _, err := client.CreateWorkspace()
	require.NoError(t, err)

	// Test that stash operations return appropriate errors
	_, err = client.CreateStash(repo, "test stash")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not yet implemented")

	err = client.ApplyStash(repo, nil)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not yet implemented")

	_, err = client.ListStashes(repo)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not yet implemented")
}

// Benchmark tests for performance verification
func BenchmarkCreateInMemoryWorkspace(b *testing.B) {
	client := NewInMemoryGitClient()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		repo, fs, err := client.CreateWorkspace()
		if err != nil {
			b.Fatalf("Failed to create workspace: %v", err)
		}
		_ = repo
		_ = fs
	}
}

func BenchmarkInMemoryCommit(b *testing.B) {
	client := NewInMemoryGitClient()
	repo, fs, err := client.CreateWorkspace()
	if err != nil {
		b.Fatalf("Failed to create workspace: %v", err)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		filename := fmt.Sprintf("bench-file-%d.txt", i)
		content := []byte(fmt.Sprintf("Benchmark content %d", i))

		err = client.WriteFile(fs, filename, content, 0644)
		if err != nil {
			b.Fatalf("Failed to write file: %v", err)
		}

		err = client.AddFiles(repo, fs, []string{filename})
		if err != nil {
			b.Fatalf("Failed to add file: %v", err)
		}

		_, err = client.CommitChanges(repo, fmt.Sprintf("Benchmark commit %d", i), nil)
		if err != nil {
			b.Fatalf("Failed to commit: %v", err)
		}
	}
}

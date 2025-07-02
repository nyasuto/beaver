package git

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/go-git/go-billy/v5"
	"github.com/go-git/go-billy/v5/memfs"
	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/object"
	"github.com/go-git/go-git/v5/plumbing/transport"
	"github.com/go-git/go-git/v5/plumbing/transport/http"
	"github.com/go-git/go-git/v5/storage/memory"
	"github.com/nyasuto/beaver/internal/errors"
)

// GoGitClient implements GitClient using go-git library
type GoGitClient struct {
	timeout time.Duration
	auth    transport.AuthMethod
}

// NewGoGitClient creates a new go-git based Git client
func NewGoGitClient() GitClient {
	return &GoGitClient{
		timeout: 30 * time.Second,
	}
}

// NewGoGitClientWithAuth creates a new go-git based Git client with authentication
func NewGoGitClientWithAuth(token string) GitClient {
	var auth transport.AuthMethod
	if token != "" {
		auth = &http.BasicAuth{
			Username: "token", // GitHub uses "token" as username
			Password: token,
		}
	}

	return &GoGitClient{
		timeout: 30 * time.Second,
		auth:    auth,
	}
}

// Clone clones a repository to the specified directory
func (g *GoGitClient) Clone(ctx context.Context, url, dir string, options *CloneOptions) error {
	slog.Info("Go-git clone starting", "url", sanitizeURL(url), "dir", dir)

	cloneOptions := &git.CloneOptions{
		URL:  url,
		Auth: g.auth,
	}

	if options != nil {
		if options.Depth > 0 {
			cloneOptions.Depth = options.Depth
		}
		if options.SingleBranch {
			cloneOptions.SingleBranch = options.SingleBranch
		}
		if options.Branch != "" {
			cloneOptions.ReferenceName = plumbing.ReferenceName("refs/heads/" + options.Branch)
		}
		// Note: go-git CloneOptions doesn't have Bare field for PlainCloneContext
		// Bare clones require different approach with git.Clone to bare storage
	}

	// Create context with timeout
	timeout := g.timeout
	if options != nil && options.Timeout > 0 {
		timeout = options.Timeout
	}
	ctxWithTimeout, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	_, err := git.PlainCloneContext(ctxWithTimeout, dir, false, cloneOptions)
	if err != nil {
		slog.Error("Go-git clone failed", "error", err)
		return g.handleGitError("clone", err)
	}

	slog.Info("Go-git clone completed successfully")
	return nil
}

// CloneInMemory clones a repository into memory
func (g *GoGitClient) CloneInMemory(ctx context.Context, url string, options *CloneOptions) (*git.Repository, billy.Filesystem, error) {
	slog.Info("Go-git in-memory clone starting", "url", sanitizeURL(url))

	fs := memfs.New()
	storage := memory.NewStorage()

	cloneOptions := &git.CloneOptions{
		URL:  url,
		Auth: g.auth,
	}

	if options != nil {
		if options.Depth > 0 {
			cloneOptions.Depth = options.Depth
		}
		if options.SingleBranch {
			cloneOptions.SingleBranch = options.SingleBranch
		}
		if options.Branch != "" {
			cloneOptions.ReferenceName = plumbing.ReferenceName("refs/heads/" + options.Branch)
		}
	}

	// Create context with timeout
	timeout := g.timeout
	if options != nil && options.Timeout > 0 {
		timeout = options.Timeout
	}
	ctxWithTimeout, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	repo, err := git.CloneContext(ctxWithTimeout, storage, fs, cloneOptions)
	if err != nil {
		slog.Error("Go-git in-memory clone failed", "error", err)
		return nil, nil, g.handleGitError("clone", err)
	}

	slog.Info("Go-git in-memory clone completed successfully")
	return repo, fs, nil
}

// CreateInMemoryWorkspace creates a new in-memory workspace
func (g *GoGitClient) CreateInMemoryWorkspace() (*git.Repository, billy.Filesystem, error) {
	slog.Info("Creating in-memory workspace")

	fs := memfs.New()
	storage := memory.NewStorage()

	repo, err := git.Init(storage, fs)
	if err != nil {
		slog.Error("Failed to create in-memory workspace", "error", err)
		return nil, nil, g.handleGitError("init", err)
	}

	slog.Info("In-memory workspace created successfully")
	return repo, fs, nil
}

// PushFromMemory pushes changes from an in-memory repository to remote
func (g *GoGitClient) PushFromMemory(ctx context.Context, repo *git.Repository, options *PushOptions) error {
	slog.Info("Go-git push from memory starting")

	pushOptions := &git.PushOptions{
		Auth: g.auth,
	}

	if options != nil {
		if options.Remote != "" {
			pushOptions.RemoteName = options.Remote
		}
		if options.Force {
			pushOptions.Force = options.Force
		}
	}

	// Create context with timeout
	timeout := g.timeout
	if options != nil && options.Timeout > 0 {
		timeout = options.Timeout
	}
	ctxWithTimeout, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	err := repo.PushContext(ctxWithTimeout, pushOptions)
	if err != nil && err != git.NoErrAlreadyUpToDate {
		slog.Error("Go-git push from memory failed", "error", err)
		return g.handleGitError("push", err)
	}

	slog.Info("Go-git push from memory completed successfully")
	return nil
}

// Pull pulls the latest changes from the remote repository
func (g *GoGitClient) Pull(ctx context.Context, dir string) error {
	slog.Info("Go-git pull starting", "dir", dir)

	repo, err := git.PlainOpen(dir)
	if err != nil {
		return g.handleGitError("open", err)
	}

	w, err := repo.Worktree()
	if err != nil {
		return g.handleGitError("worktree", err)
	}

	ctxWithTimeout, cancel := context.WithTimeout(ctx, g.timeout)
	defer cancel()

	err = w.PullContext(ctxWithTimeout, &git.PullOptions{
		Auth: g.auth,
	})
	if err != nil && err != git.NoErrAlreadyUpToDate {
		slog.Error("Go-git pull failed", "error", err)
		return g.handleGitError("pull", err)
	}

	slog.Info("Go-git pull completed successfully")
	return nil
}

// Push pushes changes to the remote repository
func (g *GoGitClient) Push(ctx context.Context, dir string, options *PushOptions) error {
	slog.Info("Go-git push starting", "dir", dir)

	repo, err := git.PlainOpen(dir)
	if err != nil {
		return g.handleGitError("open", err)
	}

	pushOptions := &git.PushOptions{
		Auth: g.auth,
	}

	if options != nil {
		if options.Remote != "" {
			pushOptions.RemoteName = options.Remote
		}
		if options.Force {
			pushOptions.Force = options.Force
		}
	}

	timeout := g.timeout
	if options != nil && options.Timeout > 0 {
		timeout = options.Timeout
	}
	ctxWithTimeout, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	err = repo.PushContext(ctxWithTimeout, pushOptions)
	if err != nil && err != git.NoErrAlreadyUpToDate {
		slog.Error("Go-git push failed", "error", err)
		return g.handleGitError("push", err)
	}

	slog.Info("Go-git push completed successfully")
	return nil
}

// Add adds files to the staging area
func (g *GoGitClient) Add(ctx context.Context, dir string, files []string) error {
	slog.Info("Go-git add starting", "dir", dir, "files", files)

	repo, err := git.PlainOpen(dir)
	if err != nil {
		return g.handleGitError("open", err)
	}

	w, err := repo.Worktree()
	if err != nil {
		return g.handleGitError("worktree", err)
	}

	for _, file := range files {
		if file == "." {
			// Add all files
			_, err = w.Add(".")
		} else {
			_, err = w.Add(file)
		}
		if err != nil {
			slog.Error("Go-git add failed", "error", err, "file", file)
			return g.handleGitError("add", err)
		}
	}

	slog.Info("Go-git add completed successfully")
	return nil
}

// Commit creates a commit with the staged changes
func (g *GoGitClient) Commit(ctx context.Context, dir string, message string, options *CommitOptions) error {
	slog.Info("Go-git commit starting", "dir", dir, "message", message)

	repo, err := git.PlainOpen(dir)
	if err != nil {
		return g.handleGitError("open", err)
	}

	w, err := repo.Worktree()
	if err != nil {
		return g.handleGitError("worktree", err)
	}

	commitOptions := &git.CommitOptions{
		AllowEmptyCommits: false,
	}

	if options != nil {
		if options.Author != nil {
			commitOptions.Author = &object.Signature{
				Name:  options.Author.Name,
				Email: options.Author.Email,
				When:  time.Now(),
			}
		}
		if options.AllowEmpty {
			commitOptions.AllowEmptyCommits = options.AllowEmpty
		}
	}

	_, err = w.Commit(message, commitOptions)
	if err != nil {
		slog.Error("Go-git commit failed", "error", err)
		return g.handleGitError("commit", err)
	}

	slog.Info("Go-git commit completed successfully")
	return nil
}

// Status returns the status of the repository
func (g *GoGitClient) Status(ctx context.Context, dir string) (*GitStatus, error) {
	slog.Info("Go-git status starting", "dir", dir)

	repo, err := git.PlainOpen(dir)
	if err != nil {
		return nil, g.handleGitError("open", err)
	}

	w, err := repo.Worktree()
	if err != nil {
		return nil, g.handleGitError("worktree", err)
	}

	status, err := w.Status()
	if err != nil {
		return nil, g.handleGitError("status", err)
	}

	// Get current branch
	head, err := repo.Head()
	if err != nil {
		return nil, g.handleGitError("head", err)
	}

	branch := "HEAD"
	if head.Name().IsBranch() {
		branch = head.Name().Short()
	}

	gitStatus := &GitStatus{
		IsClean:        status.IsClean(),
		HasUncommitted: !status.IsClean(),
		Branch:         branch,
		ModifiedFiles:  []string{},
		UntrackedFiles: []string{},
		StagedFiles:    []string{},
	}

	for file, fileStatus := range status {
		switch fileStatus.Staging {
		case git.Added, git.Modified, git.Renamed, git.Copied:
			gitStatus.StagedFiles = append(gitStatus.StagedFiles, file)
		}

		switch fileStatus.Worktree {
		case git.Modified, git.Deleted:
			gitStatus.ModifiedFiles = append(gitStatus.ModifiedFiles, file)
		case git.Untracked:
			gitStatus.UntrackedFiles = append(gitStatus.UntrackedFiles, file)
			gitStatus.HasUntracked = true
		}
	}

	slog.Info("Go-git status completed successfully")
	return gitStatus, nil
}

// handleGitError converts go-git errors to enhanced BeaverError
func (g *GoGitClient) handleGitError(operation string, err error) error {
	return errors.NewGitOperationError(operation, err, err.Error())
}

// Implement remaining interface methods with go-git...
// For now, we'll implement basic stubs that call the original command-line versions
// These will be fully implemented in subsequent phases

func (g *GoGitClient) GetCurrentSHA(ctx context.Context, dir string) (string, error) {
	repo, err := git.PlainOpen(dir)
	if err != nil {
		return "", g.handleGitError("open", err)
	}

	head, err := repo.Head()
	if err != nil {
		return "", g.handleGitError("head", err)
	}

	return head.Hash().String(), nil
}

func (g *GoGitClient) GetRemoteURL(ctx context.Context, dir string) (string, error) {
	repo, err := git.PlainOpen(dir)
	if err != nil {
		return "", g.handleGitError("open", err)
	}

	remote, err := repo.Remote("origin")
	if err != nil {
		return "", g.handleGitError("remote", err)
	}

	if len(remote.Config().URLs) == 0 {
		return "", fmt.Errorf("no URLs found for remote origin")
	}

	return remote.Config().URLs[0], nil
}

func (g *GoGitClient) GetCurrentBranch(ctx context.Context, dir string) (string, error) {
	repo, err := git.PlainOpen(dir)
	if err != nil {
		return "", g.handleGitError("open", err)
	}

	head, err := repo.Head()
	if err != nil {
		return "", g.handleGitError("head", err)
	}

	if head.Name().IsBranch() {
		return head.Name().Short(), nil
	}

	return "HEAD", nil
}

func (g *GoGitClient) CheckoutBranch(ctx context.Context, dir, branch string) error {
	repo, err := git.PlainOpen(dir)
	if err != nil {
		return g.handleGitError("open", err)
	}

	w, err := repo.Worktree()
	if err != nil {
		return g.handleGitError("worktree", err)
	}

	err = w.Checkout(&git.CheckoutOptions{
		Branch: plumbing.ReferenceName("refs/heads/" + branch),
	})
	if err != nil {
		return g.handleGitError("checkout", err)
	}

	return nil
}

func (g *GoGitClient) CreateOrphanBranch(ctx context.Context, dir string, branch string) error {
	repo, err := git.PlainOpen(dir)
	if err != nil {
		return g.handleGitError("open", err)
	}

	w, err := repo.Worktree()
	if err != nil {
		return g.handleGitError("worktree", err)
	}

	err = w.Checkout(&git.CheckoutOptions{
		Branch: plumbing.ReferenceName("refs/heads/" + branch),
		Create: true,
	})
	if err != nil {
		return g.handleGitError("checkout", err)
	}

	return nil
}

func (g *GoGitClient) BranchExists(ctx context.Context, dir string, branch string) error {
	repo, err := git.PlainOpen(dir)
	if err != nil {
		return g.handleGitError("open", err)
	}

	_, err = repo.Branch(branch)
	if err != nil {
		return g.handleGitError("branch", err)
	}

	return nil
}

func (g *GoGitClient) SetConfig(ctx context.Context, dir, key, value string) error {
	// go-git config handling is complex, use command-line fallback for Phase 1
	cmdClient, err := NewCmdGitClient()
	if err != nil {
		return err
	}
	return cmdClient.SetConfig(ctx, dir, key, value)
}

func (g *GoGitClient) GetConfig(ctx context.Context, dir, key string) (string, error) {
	// Fallback to command-line for config operations
	cmdClient, err := NewCmdGitClient()
	if err != nil {
		return "", err
	}
	return cmdClient.GetConfig(ctx, dir, key)
}

func (g *GoGitClient) UnsetConfig(ctx context.Context, dir, key string) error {
	// Fallback to command-line for config operations
	cmdClient, err := NewCmdGitClient()
	if err != nil {
		return err
	}
	return cmdClient.UnsetConfig(ctx, dir, key)
}

func (g *GoGitClient) Stash(ctx context.Context, dir string, message string) error {
	// go-git doesn't support stash operations yet, fallback to command-line
	cmdClient, err := NewCmdGitClient()
	if err != nil {
		return err
	}
	return cmdClient.Stash(ctx, dir, message)
}

func (g *GoGitClient) StashPop(ctx context.Context, dir string) error {
	// go-git doesn't support stash operations yet, fallback to command-line
	cmdClient, err := NewCmdGitClient()
	if err != nil {
		return err
	}
	return cmdClient.StashPop(ctx, dir)
}

func (g *GoGitClient) RemoveFiles(ctx context.Context, dir string, paths []string, recursive bool) error {
	repo, err := git.PlainOpen(dir)
	if err != nil {
		return g.handleGitError("open", err)
	}

	w, err := repo.Worktree()
	if err != nil {
		return g.handleGitError("worktree", err)
	}

	for _, path := range paths {
		_, err = w.Remove(path)
		if err != nil {
			return g.handleGitError("remove", err)
		}
	}

	return nil
}

// Analytics operations - these will be fully implemented in Phase 2
func (g *GoGitClient) GetCommitHistory(ctx context.Context, dir string, options *CommitHistoryOptions) ([]byte, error) {
	// For Phase 1, fallback to command-line implementation
	cmdClient, err := NewCmdGitClient()
	if err != nil {
		return nil, err
	}
	return cmdClient.GetCommitHistory(ctx, dir, options)
}

func (g *GoGitClient) GetCommitCount(ctx context.Context, dir string) (int, error) {
	repo, err := git.PlainOpen(dir)
	if err != nil {
		return 0, g.handleGitError("open", err)
	}

	head, err := repo.Head()
	if err != nil {
		return 0, g.handleGitError("head", err)
	}

	commits, err := repo.Log(&git.LogOptions{From: head.Hash()})
	if err != nil {
		return 0, g.handleGitError("log", err)
	}

	count := 0
	err = commits.ForEach(func(c *object.Commit) error {
		count++
		return nil
	})
	if err != nil {
		return 0, g.handleGitError("log", err)
	}

	return count, nil
}

func (g *GoGitClient) GetContributorCount(ctx context.Context, dir string) (int, error) {
	// For Phase 1, fallback to command-line implementation
	cmdClient, err := NewCmdGitClient()
	if err != nil {
		return 0, err
	}
	return cmdClient.GetContributorCount(ctx, dir)
}

func (g *GoGitClient) GetFirstCommitDate(ctx context.Context, dir string) (time.Time, error) {
	// For Phase 1, fallback to command-line implementation
	cmdClient, err := NewCmdGitClient()
	if err != nil {
		return time.Time{}, err
	}
	return cmdClient.GetFirstCommitDate(ctx, dir)
}

func (g *GoGitClient) GetBranchCount(ctx context.Context, dir string) (int, error) {
	repo, err := git.PlainOpen(dir)
	if err != nil {
		return 0, g.handleGitError("open", err)
	}

	branches, err := repo.Branches()
	if err != nil {
		return 0, g.handleGitError("branches", err)
	}

	count := 0
	err = branches.ForEach(func(ref *plumbing.Reference) error {
		count++
		return nil
	})
	if err != nil {
		return 0, g.handleGitError("branches", err)
	}

	return count, nil
}

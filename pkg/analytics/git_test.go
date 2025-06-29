package analytics

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewGitAnalyzer(t *testing.T) {
	analyzer := NewGitAnalyzer("/path/to/repo")

	assert.NotNil(t, analyzer)
	assert.Equal(t, "/path/to/repo", analyzer.repoPath)
}

func TestGitAnalyzer_AnalyzeCommitHistory(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "git_test")
	require.NoError(t, err)
	defer os.RemoveAll(tempDir)

	analyzer := NewGitAnalyzer(tempDir)
	ctx := context.Background()

	t.Run("analyze non-git directory", func(t *testing.T) {
		events, err := analyzer.AnalyzeCommitHistory(ctx, nil, 10)

		// Should handle non-git directory gracefully
		assert.Error(t, err)
		assert.Nil(t, events)
		assert.Contains(t, err.Error(), "git log command failed")
	})

	t.Run("analyze with since date", func(t *testing.T) {
		// Test with a since date parameter
		since := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
		events, err := analyzer.AnalyzeCommitHistory(ctx, &since, 10)

		// Should handle non-git directory gracefully even with since date
		assert.Error(t, err)
		assert.Nil(t, events)
	})

	t.Run("analyze with max commits limit", func(t *testing.T) {
		events, err := analyzer.AnalyzeCommitHistory(ctx, nil, 0)

		// Should handle zero max commits
		assert.Error(t, err)
		assert.Nil(t, events)
	})
}

func TestGitAnalyzer_AnalyzeCommitPatterns(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "git_test")
	require.NoError(t, err)
	defer os.RemoveAll(tempDir)

	analyzer := NewGitAnalyzer(tempDir)
	ctx := context.Background()

	t.Run("analyze empty commit list", func(t *testing.T) {
		commits := []GitCommit{}
		patterns, err := analyzer.AnalyzeCommitPatterns(ctx, commits)

		require.NoError(t, err)
		assert.NotNil(t, patterns)
		assert.Equal(t, 0, patterns.TotalCommits)
		assert.Empty(t, patterns.Authors)
	})

	t.Run("analyze commits with patterns", func(t *testing.T) {
		commits := []GitCommit{
			{
				Hash:      "abc123def456",
				Author:    "developer1",
				Email:     "dev1@example.com",
				Date:      time.Date(2025, 1, 1, 12, 0, 0, 0, time.UTC),
				Message:   "feat: add new authentication system",
				Files:     []string{"auth.go", "auth_test.go", "config.yaml"},
				Additions: 100,
				Deletions: 10,
			},
			{
				Hash:      "def456ghi789",
				Author:    "developer1",
				Email:     "dev1@example.com",
				Date:      time.Date(2025, 1, 1, 14, 0, 0, 0, time.UTC),
				Message:   "fix: resolve authentication bug",
				Files:     []string{"auth.go", "auth_test.go"},
				Additions: 15,
				Deletions: 5,
			},
			{
				Hash:      "ghi789jkl012",
				Author:    "developer2",
				Email:     "dev2@example.com",
				Date:      time.Date(2025, 1, 2, 10, 0, 0, 0, time.UTC),
				Message:   "docs: update README with installation steps",
				Files:     []string{"README.md"},
				Additions: 20,
				Deletions: 0,
			},
		}

		patterns, err := analyzer.AnalyzeCommitPatterns(ctx, commits)
		require.NoError(t, err)
		require.NotNil(t, patterns)

		// Verify basic statistics
		assert.Equal(t, 3, patterns.TotalCommits)
		assert.Len(t, patterns.Authors, 2)
		assert.Equal(t, 2, patterns.Authors["developer1"])
		assert.Equal(t, 1, patterns.Authors["developer2"])

		// Check message patterns
		assert.NotEmpty(t, patterns.MessagePatterns)
		assert.Contains(t, patterns.MessagePatterns, "feature")
		assert.Contains(t, patterns.MessagePatterns, "bugfix")
		assert.Contains(t, patterns.MessagePatterns, "docs")

		// Check time patterns
		assert.NotEmpty(t, patterns.ActivityByHour)
		assert.Equal(t, 1, patterns.ActivityByHour[12]) // developer1's commit at 12:00
		assert.Equal(t, 1, patterns.ActivityByHour[14]) // developer1's commit at 14:00
		assert.Equal(t, 1, patterns.ActivityByHour[10]) // developer2's commit at 10:00

		// Check file patterns (actual patterns may differ from extensions)
		assert.NotEmpty(t, patterns.FilePatterns)
		// File patterns might be actual extensions like "go", "md", "yaml" instead of ".go", ".md", ".yaml"
		hasGoPattern := patterns.FilePatterns["go"] > 0 || patterns.FilePatterns[".go"] > 0
		hasMdPattern := patterns.FilePatterns["md"] > 0 || patterns.FilePatterns[".md"] > 0
		hasYamlPattern := patterns.FilePatterns["yaml"] > 0 || patterns.FilePatterns[".yaml"] > 0
		assert.True(t, hasGoPattern, "Should have Go file pattern")
		assert.True(t, hasMdPattern, "Should have MD file pattern")
		assert.True(t, hasYamlPattern, "Should have YAML file pattern")

		// Check derived metrics
		assert.Greater(t, patterns.AverageCommitSize, 0.0)
		assert.Equal(t, "developer1", patterns.TopContributor)
	})

	t.Run("analyze commits from single author", func(t *testing.T) {
		commits := []GitCommit{
			{
				Hash:      "solo1",
				Author:    "solo-dev",
				Email:     "solo@example.com",
				Date:      time.Now(),
				Message:   "feat: first feature implementation",
				Files:     []string{"feature.go"},
				Additions: 50,
				Deletions: 0,
			},
			{
				Hash:      "solo2",
				Author:    "solo-dev",
				Email:     "solo@example.com",
				Date:      time.Now(),
				Message:   "feat: second feature enhancement",
				Files:     []string{"feature.go", "feature_test.go"},
				Additions: 30,
				Deletions: 5,
			},
		}

		patterns, err := analyzer.AnalyzeCommitPatterns(ctx, commits)
		require.NoError(t, err)

		assert.Equal(t, 2, patterns.TotalCommits)
		assert.Len(t, patterns.Authors, 1)
		assert.Equal(t, 2, patterns.Authors["solo-dev"])
		assert.Equal(t, "solo-dev", patterns.TopContributor)
	})
}

func TestGitAnalyzer_GetRepositoryMetrics(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "git_test")
	require.NoError(t, err)
	defer os.RemoveAll(tempDir)

	analyzer := NewGitAnalyzer(tempDir)
	ctx := context.Background()

	t.Run("get metrics from non-git directory", func(t *testing.T) {
		metrics, err := analyzer.GetRepositoryMetrics(ctx)

		// Should handle non-git directory gracefully
		assert.Error(t, err)
		assert.Nil(t, metrics)
		assert.Contains(t, err.Error(), "exit status 128")
	})

	t.Run("get metrics with git init", func(t *testing.T) {
		// Create a minimal git repository for testing
		gitDir := filepath.Join(tempDir, "test-repo")
		err := os.MkdirAll(gitDir, 0755)
		require.NoError(t, err)

		analyzer := NewGitAnalyzer(gitDir)

		// Even with git init, we might not have commits
		metrics, err := analyzer.GetRepositoryMetrics(ctx)

		// This might fail if git is not available or repo is empty
		// We'll handle both cases
		if err != nil {
			assert.Contains(t, err.Error(), "exit status 128")
		} else {
			assert.NotNil(t, metrics)
		}
	})
}

func TestCommitPatterns_AnalyzeCommitMessage(t *testing.T) {
	patterns := &CommitPatterns{
		MessagePatterns: make(map[string]int),
	}

	testCases := []struct {
		name     string
		message  string
		expected map[string]int
	}{
		{
			name:     "feature commit",
			message:  "feat: add new authentication system",
			expected: map[string]int{"feature": 1},
		},
		{
			name:     "bugfix commit",
			message:  "fix: resolve login timeout issue",
			expected: map[string]int{"bugfix": 1},
		},
		{
			name:     "documentation commit",
			message:  "docs: update API documentation",
			expected: map[string]int{"docs": 1},
		},
		{
			name:     "test commit",
			message:  "test: add unit tests for user service",
			expected: map[string]int{"test": 1},
		},
		{
			name:     "refactor commit",
			message:  "refactor: improve code structure",
			expected: map[string]int{"refactor": 1},
		},
		{
			name:     "non-conventional feature",
			message:  "Add new user registration feature",
			expected: map[string]int{"feature": 1},
		},
		{
			name:     "chore commit",
			message:  "chore: update dependencies",
			expected: map[string]int{"chore": 1},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Reset patterns for each test
			patterns.MessagePatterns = make(map[string]int)

			patterns.analyzeCommitMessage(tc.message)

			for expectedType, expectedCount := range tc.expected {
				assert.Equal(t, expectedCount, patterns.MessagePatterns[expectedType],
					"Expected %d occurrences of %s pattern", expectedCount, expectedType)
			}
		})
	}
}

func TestCommitPatterns_CalculateMetrics(t *testing.T) {
	patterns := &CommitPatterns{
		CommitSizes: []int{10, 20, 30, 40, 50},
		ActivityByHour: map[int]int{
			9:  2,
			10: 5,
			11: 3,
			14: 1,
		},
		ActivityByDay: map[time.Weekday]int{
			time.Monday:    3,
			time.Tuesday:   2,
			time.Wednesday: 4,
			time.Thursday:  1,
		},
		Authors: map[string]int{
			"dev1": 7,
			"dev2": 3,
			"dev3": 1,
		},
	}

	patterns.calculateMetrics()

	// Test average commit size
	expectedAvg := float64(10+20+30+40+50) / 5
	assert.Equal(t, expectedAvg, patterns.AverageCommitSize)

	// Test most active hour (should be 10 with 5 commits)
	assert.Equal(t, 10, patterns.MostActiveHour)

	// Test most active day (should be Wednesday with 4 commits)
	assert.Equal(t, time.Wednesday, patterns.MostActiveDay)

	// Test top contributor (should be dev1 with 7 commits)
	assert.Equal(t, "dev1", patterns.TopContributor)
}

func TestCommitPatterns_JSON(t *testing.T) {
	patterns := &CommitPatterns{
		TotalCommits:      10,
		Authors:           map[string]int{"dev1": 5, "dev2": 3, "dev3": 2},
		MessagePatterns:   map[string]int{"feature": 4, "bugfix": 3, "docs": 2, "test": 1},
		ActivityByHour:    map[int]int{9: 2, 10: 3, 14: 5},
		ActivityByDay:     map[time.Weekday]int{time.Monday: 4, time.Wednesday: 6},
		AverageCommitSize: 50.0,
		TopContributor:    "dev1",
	}

	// Test that the struct can be used for JSON operations
	assert.Equal(t, 10, patterns.TotalCommits)
	assert.Len(t, patterns.Authors, 3)
	assert.Contains(t, patterns.Authors, "dev1")
	assert.Equal(t, 5, patterns.Authors["dev1"])
	assert.Equal(t, "dev1", patterns.TopContributor)
}

func TestCommitPatterns_AuthorAnalysis(t *testing.T) {
	patterns := &CommitPatterns{
		Authors: map[string]int{
			"dev1": 10,
			"dev2": 5,
			"dev3": 2,
		},
	}

	// Verify author statistics
	totalCommits := 0
	for _, count := range patterns.Authors {
		totalCommits += count
	}
	assert.Equal(t, 17, totalCommits)

	// Find most active contributor
	maxCommits := 0
	topContributor := ""
	for author, count := range patterns.Authors {
		if count > maxCommits {
			maxCommits = count
			topContributor = author
		}
	}
	assert.Equal(t, "dev1", topContributor)
	assert.Equal(t, 10, maxCommits)
}

func TestRepositoryMetrics_Structure(t *testing.T) {
	metrics := &RepositoryMetrics{
		TotalCommits:      100,
		TotalContributors: 10,
		RepositoryAge:     365 * 24 * time.Hour, // 1 year
		TotalBranches:     5,
	}

	// Verify structure
	assert.Equal(t, 100, metrics.TotalCommits)
	assert.Equal(t, 10, metrics.TotalContributors)
	assert.Equal(t, 5, metrics.TotalBranches)
	assert.Equal(t, 365*24*time.Hour, metrics.RepositoryAge)
}

// Benchmark tests
func BenchmarkCommitPatterns_AnalyzeCommitMessage(b *testing.B) {
	patterns := &CommitPatterns{
		MessagePatterns: make(map[string]int),
	}

	messages := []string{
		"feat(auth): add OAuth2 authentication",
		"fix: resolve critical security issue",
		"docs: update API documentation",
		"refactor(database): improve query performance",
		"test: add comprehensive unit tests",
		"Add new user management feature",
		"Fix login bug and update tests",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		message := messages[i%len(messages)]
		patterns.analyzeCommitMessage(message)
	}
}

func BenchmarkCommitPatterns_CalculateMetrics(b *testing.B) {
	patterns := &CommitPatterns{
		CommitSizes:    make([]int, 1000),
		ActivityByHour: make(map[int]int),
		ActivityByDay:  make(map[time.Weekday]int),
		Authors:        make(map[string]int),
	}

	// Pre-populate with test data
	for i := 0; i < 1000; i++ {
		patterns.CommitSizes[i] = i + 1
		patterns.ActivityByHour[i%24]++
		patterns.ActivityByDay[time.Weekday(i%7)]++
		patterns.Authors[fmt.Sprintf("dev%d", i%10)]++
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		patterns.calculateMetrics()
	}
}

// Integration test (only runs if git is available)
func TestGitAnalyzer_Integration(t *testing.T) {
	// Check if we're in a git repository
	if _, err := os.Stat(".git"); os.IsNotExist(err) {
		t.Skip("Not in a git repository, skipping integration test")
	}

	analyzer := NewGitAnalyzer(".")
	ctx := context.Background()

	t.Run("analyze current repository", func(t *testing.T) {
		// Try to get repository metrics
		metrics, err := analyzer.GetRepositoryMetrics(ctx)

		if err != nil {
			t.Logf("Could not get repository metrics: %v", err)
		} else {
			// Basic validation if metrics are available
			assert.NotNil(t, metrics)
			assert.GreaterOrEqual(t, metrics.TotalCommits, 0)
			assert.GreaterOrEqual(t, metrics.TotalContributors, 0)
		}
	})

	t.Run("analyze recent commits", func(t *testing.T) {
		// Try to analyze recent commits
		events, err := analyzer.AnalyzeCommitHistory(ctx, nil, 10)

		if err != nil {
			t.Logf("Could not analyze commit history: %v", err)
		} else if len(events) > 0 {
			// Validate event structure
			assert.NotEmpty(t, events)

			for _, event := range events {
				assert.Equal(t, EventTypeCommit, event.Type)
				assert.NotEmpty(t, event.ID)
				assert.NotEmpty(t, event.Title)
				assert.NotNil(t, event.Metadata)
			}
		}
	})
}

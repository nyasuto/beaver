package main

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestValidateRepository(t *testing.T) {
	tests := []struct {
		name     string
		repo     string
		expected bool
	}{
		{
			name:     "valid repository format",
			repo:     "owner/repo",
			expected: true,
		},
		{
			name:     "valid repository with dashes",
			repo:     "test-org/my-repo",
			expected: true,
		},
		{
			name:     "valid repository with numbers",
			repo:     "user123/project456",
			expected: true,
		},
		{
			name:     "invalid repository - no slash",
			repo:     "invalidrepo",
			expected: false,
		},
		{
			name:     "invalid repository - multiple slashes",
			repo:     "owner/repo/extra",
			expected: false,
		},
		{
			name:     "invalid repository - empty string",
			repo:     "",
			expected: false,
		},
		{
			name:     "invalid repository - only slash",
			repo:     "/",
			expected: false,
		},
		{
			name:     "invalid repository - trailing slash",
			repo:     "owner/repo/",
			expected: false,
		},
		{
			name:     "invalid repository - leading slash",
			repo:     "/owner/repo",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := validateRepository(tt.repo)
			assert.Equal(t, tt.expected, result, "validateRepository(%q) = %v, want %v", tt.repo, result, tt.expected)
		})
	}
}

func TestClassificationSummaryStructure(t *testing.T) {
	summary := &ClassificationSummary{
		Repository:  "test/repo",
		TotalIssues: 10,
		Successful:  8,
		Failed:      2,
		Categories:  map[string]int{"feature": 5, "bug": 3},
		Method:      "hybrid",
	}

	assert.Equal(t, "test/repo", summary.Repository)
	assert.Equal(t, 10, summary.TotalIssues)
	assert.Equal(t, 8, summary.Successful)
	assert.Equal(t, 2, summary.Failed)
	assert.Equal(t, "hybrid", summary.Method)
	assert.Equal(t, 5, summary.Categories["feature"])
	assert.Equal(t, 3, summary.Categories["bug"])
}

func TestClassifyCommandFlags(t *testing.T) {
	// Test that classify command has the expected subcommands
	assert.NotNil(t, classifyCmd)
	assert.Equal(t, "classify", classifyCmd.Use)
	assert.Contains(t, classifyCmd.Short, "自動分類")

	// Test subcommands exist
	assert.NotNil(t, classifyIssueCmd)
	assert.Equal(t, "issue <repository> <issue-number>", classifyIssueCmd.Use)

	assert.NotNil(t, classifyIssuesCmd)
	assert.Equal(t, "issues <repository> <issue-numbers...>", classifyIssuesCmd.Use)

	assert.NotNil(t, classifyAllCmd)
	assert.Equal(t, "all <repository>", classifyAllCmd.Use)
}

func TestMinFunction(t *testing.T) {
	tests := []struct {
		name     string
		a, b     int
		expected int
	}{
		{
			name:     "a is smaller",
			a:        5,
			b:        10,
			expected: 5,
		},
		{
			name:     "b is smaller",
			a:        15,
			b:        3,
			expected: 3,
		},
		{
			name:     "equal values",
			a:        7,
			b:        7,
			expected: 7,
		},
		{
			name:     "negative values",
			a:        -5,
			b:        -2,
			expected: -5,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := min(tt.a, tt.b)
			assert.Equal(t, tt.expected, result, "min(%d, %d) = %d, want %d", tt.a, tt.b, result, tt.expected)
		})
	}
}

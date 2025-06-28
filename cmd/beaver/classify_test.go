package main

import (
	"encoding/json"
	"io"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/nyasuto/beaver/internal/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
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

func TestCreateClassifier(t *testing.T) {
	t.Run("createClassifier with nil config", func(t *testing.T) {
		classifier, err := createClassifier(nil)

		require.NoError(t, err)
		assert.NotNil(t, classifier)
	})

	t.Run("createClassifier with valid config", func(t *testing.T) {
		cfg := &config.Config{}
		classifier, err := createClassifier(cfg)

		require.NoError(t, err)
		assert.NotNil(t, classifier)
	})

	t.Run("createClassifier for different classify methods", func(t *testing.T) {
		testCases := []struct {
			name   string
			method string
		}{
			{"rule-based method", "rule"},
			{"hybrid method", "hybrid"},
			{"ai method", "ai"},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				// Set the global classifyMethod variable
				originalMethod := classifyMethod
				classifyMethod = tc.method
				defer func() { classifyMethod = originalMethod }()

				classifier, err := createClassifier(nil)
				require.NoError(t, err)
				assert.NotNil(t, classifier)
			})
		}
	})
}

func TestOutputClassificationJSON(t *testing.T) {
	// Create test data
	testSummary := &ClassificationSummary{
		Repository:  "test/repo",
		ProcessedAt: time.Date(2025, 1, 1, 12, 0, 0, 0, time.UTC),
		TotalIssues: 2,
		Successful:  1,
		Failed:      1,
		Categories: map[string]int{
			"bug":     1,
			"feature": 0,
		},
		AverageTime: 1.5,
		Method:      "hybrid",
		Results: []IssueClassificationResult{
			{
				IssueNumber:    123,
				IssueTitle:     "Test Issue",
				Category:       "bug",
				Confidence:     0.85,
				Method:         "hybrid",
				ProcessingTime: 1.5,
			},
		},
		Errors: []ClassificationError{
			{
				IssueNumber: 124,
				Error:       "classification failed",
			},
		},
	}

	t.Run("output to stdout", func(t *testing.T) {
		// Capture stdout
		oldStdout := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		err := outputClassificationJSON(testSummary, "")

		w.Close()
		os.Stdout = oldStdout

		output, _ := io.ReadAll(r)

		require.NoError(t, err)

		// Verify JSON is valid and contains expected data
		var result ClassificationSummary
		err = json.Unmarshal(output, &result)
		require.NoError(t, err)
		assert.Equal(t, "test/repo", result.Repository)
		assert.Equal(t, 2, result.TotalIssues)
		assert.Equal(t, "hybrid", result.Method)
	})

	t.Run("output to file", func(t *testing.T) {
		// Create temporary file
		tmpDir := t.TempDir()
		outputFile := filepath.Join(tmpDir, "test-output.json")

		// Capture stdout for the success message
		oldStdout := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		err := outputClassificationJSON(testSummary, outputFile)

		w.Close()
		os.Stdout = oldStdout

		output, _ := io.ReadAll(r)

		require.NoError(t, err)
		assert.Contains(t, string(output), "✅ 分類結果をJSONファイルに保存しました")
		assert.Contains(t, string(output), outputFile)

		// Verify file was created and contains correct JSON
		data, err := os.ReadFile(outputFile)
		require.NoError(t, err)

		var result ClassificationSummary
		err = json.Unmarshal(data, &result)
		require.NoError(t, err)
		assert.Equal(t, "test/repo", result.Repository)
		assert.Equal(t, 2, result.TotalIssues)
	})

	t.Run("invalid file path", func(t *testing.T) {
		// Try to write to invalid path
		err := outputClassificationJSON(testSummary, "/invalid/path/output.json")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "ファイル書き込みエラー")
	})
}

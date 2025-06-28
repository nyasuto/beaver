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

func TestOutputClassificationWiki(t *testing.T) {
	// Create test data
	testSummary := &ClassificationSummary{
		Repository:  "test/repo",
		ProcessedAt: time.Date(2025, 1, 15, 14, 30, 0, 0, time.UTC),
		TotalIssues: 3,
		Successful:  2,
		Failed:      1,
		Categories: map[string]int{
			"bug":     1,
			"feature": 1,
		},
		AverageTime: 2.5,
		Method:      "hybrid",
		Results: []IssueClassificationResult{
			{
				IssueNumber:    100,
				IssueTitle:     "Fix critical bug",
				Category:       "bug",
				Confidence:     0.95,
				ProcessingTime: 2.1,
			},
			{
				IssueNumber:    101,
				IssueTitle:     "Add new feature with | pipe character in title",
				Category:       "feature",
				Confidence:     0.87,
				ProcessingTime: 2.9,
			},
		},
		Errors: []ClassificationError{
			{
				IssueNumber: 102,
				Error:       "classification timeout",
			},
		},
	}

	t.Run("output to stdout", func(t *testing.T) {
		// Capture stdout
		oldStdout := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		err := outputClassificationWiki(testSummary, "")

		w.Close()
		os.Stdout = oldStdout
		output, _ := io.ReadAll(r)

		require.NoError(t, err)
		outputStr := string(output)

		// Verify Wiki header format
		assert.Contains(t, outputStr, "# Issues 分類結果 - test/repo")
		assert.Contains(t, outputStr, "**処理日時**: 2025-01-15 14:30:00")
		assert.Contains(t, outputStr, "**分類手法**: hybrid")
		assert.Contains(t, outputStr, "**処理件数**: 3件 (成功: 2, 失敗: 1)")
		assert.Contains(t, outputStr, "**平均処理時間**: 2.500s")

		// Verify category statistics table
		assert.Contains(t, outputStr, "## 📊 カテゴリ別統計")
		assert.Contains(t, outputStr, "| カテゴリ | 件数 | 割合 |")
		assert.Contains(t, outputStr, "| bug | 1 | 50.0% |")
		assert.Contains(t, outputStr, "| feature | 1 | 50.0% |")

		// Verify results table
		assert.Contains(t, outputStr, "## 📝 分類結果詳細")
		assert.Contains(t, outputStr, "| Issue# | タイトル | カテゴリ | 信頼度 | 処理時間 |")
		assert.Contains(t, outputStr, "| #100 | Fix critical bug | bug | 0.95 | 2.100s |")
		assert.Contains(t, outputStr, "| #101 | Add new feature with \\| pipe character in title | feature | 0.87 | 2.900s |")

		// Verify error section
		assert.Contains(t, outputStr, "## ❌ エラー一覧")
		assert.Contains(t, outputStr, "- **Issue #102**: classification timeout")
	})

	t.Run("output to file", func(t *testing.T) {
		// Create temporary file
		tmpDir := t.TempDir()
		outputFile := filepath.Join(tmpDir, "wiki-output.md")

		// Capture stdout for the success message
		oldStdout := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		err := outputClassificationWiki(testSummary, outputFile)

		w.Close()
		os.Stdout = oldStdout
		capturedOutput, _ := io.ReadAll(r)

		require.NoError(t, err)
		assert.Contains(t, string(capturedOutput), "✅ 分類結果をWikiファイルに保存しました")
		assert.Contains(t, string(capturedOutput), outputFile)

		// Verify file was created and contains correct content
		data, err := os.ReadFile(outputFile)
		require.NoError(t, err)

		content := string(data)
		assert.Contains(t, content, "# Issues 分類結果 - test/repo")
		assert.Contains(t, content, "**分類手法**: hybrid")
		assert.Contains(t, content, "| bug | 1 | 50.0% |")
		assert.Contains(t, content, "| #100 | Fix critical bug | bug | 0.95 | 2.100s |")
	})

	t.Run("title truncation", func(t *testing.T) {
		// Create summary with very long title
		longTitleSummary := &ClassificationSummary{
			Repository:  "test/repo",
			ProcessedAt: time.Date(2025, 1, 15, 14, 30, 0, 0, time.UTC),
			TotalIssues: 1,
			Successful:  1,
			Failed:      0,
			Categories: map[string]int{
				"feature": 1,
			},
			AverageTime: 1.0,
			Method:      "hybrid",
			Results: []IssueClassificationResult{
				{
					IssueNumber:    200,
					IssueTitle:     "This is a very long title that should be truncated because it exceeds the 50 character limit for display",
					Category:       "feature",
					Confidence:     0.80,
					ProcessingTime: 1.0,
				},
			},
		}

		// Capture stdout
		oldStdout := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		err := outputClassificationWiki(longTitleSummary, "")

		w.Close()
		os.Stdout = oldStdout
		output, _ := io.ReadAll(r)

		require.NoError(t, err)
		outputStr := string(output)

		// Verify title is truncated with "..."
		assert.Contains(t, outputStr, "This is a very long title that should be trunca...")
		assert.NotContains(t, outputStr, "because it exceeds the 50 character limit")
	})

	t.Run("pipe character escaping", func(t *testing.T) {
		pipeSummary := &ClassificationSummary{
			Repository:  "test/repo",
			ProcessedAt: time.Date(2025, 1, 15, 14, 30, 0, 0, time.UTC),
			TotalIssues: 1,
			Successful:  1,
			Failed:      0,
			Categories: map[string]int{
				"bug": 1,
			},
			AverageTime: 1.0,
			Method:      "hybrid",
			Results: []IssueClassificationResult{
				{
					IssueNumber:    300,
					IssueTitle:     "Fix issue with | pipe | characters",
					Category:       "bug",
					Confidence:     0.90,
					ProcessingTime: 1.5,
				},
			},
		}

		// Capture stdout
		oldStdout := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		err := outputClassificationWiki(pipeSummary, "")

		w.Close()
		os.Stdout = oldStdout
		output, _ := io.ReadAll(r)

		require.NoError(t, err)
		outputStr := string(output)

		// Verify pipe characters are escaped
		assert.Contains(t, outputStr, "Fix issue with \\| pipe \\| characters")
		assert.NotContains(t, outputStr, "Fix issue with | pipe | characters")
	})

	t.Run("no errors section when empty", func(t *testing.T) {
		noErrorSummary := &ClassificationSummary{
			Repository:  "test/repo",
			ProcessedAt: time.Date(2025, 1, 15, 14, 30, 0, 0, time.UTC),
			TotalIssues: 1,
			Successful:  1,
			Failed:      0,
			Categories: map[string]int{
				"feature": 1,
			},
			AverageTime: 1.0,
			Method:      "ai",
			Results: []IssueClassificationResult{
				{
					IssueNumber:    400,
					IssueTitle:     "Add feature",
					Category:       "feature",
					Confidence:     0.88,
					ProcessingTime: 1.0,
				},
			},
			Errors: []ClassificationError{}, // Empty errors
		}

		// Capture stdout
		oldStdout := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		err := outputClassificationWiki(noErrorSummary, "")

		w.Close()
		os.Stdout = oldStdout
		output, _ := io.ReadAll(r)

		require.NoError(t, err)
		outputStr := string(output)

		// Verify no error section is present
		assert.NotContains(t, outputStr, "## ❌ エラー一覧")
	})

	t.Run("invalid file path", func(t *testing.T) {
		// Try to write to invalid path
		err := outputClassificationWiki(testSummary, "/invalid/nonexistent/path/output.md")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "ファイル書き込みエラー")
	})
}

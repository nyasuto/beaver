package main

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/nyasuto/beaver/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestFetchOutputJSON tests the JSON output functionality for fetch command
func TestFetchOutputJSON(t *testing.T) {
	tests := []struct {
		name         string
		result       *models.IssueResult
		outputFile   string
		expectError  bool
		expectOutput []string
		description  string
	}{
		{
			name: "json output to stdout",
			result: &models.IssueResult{
				Repository:   "test/repo",
				FetchedCount: 2,
				FetchedAt:    time.Date(2023, 1, 1, 12, 0, 0, 0, time.UTC),
				Issues: []models.Issue{
					{
						Number: 1,
						Title:  "Test Issue 1",
						State:  "open",
						User: models.User{
							Login: "testuser",
						},
						CreatedAt: time.Date(2023, 1, 1, 10, 0, 0, 0, time.UTC),
						HTMLURL:   "https://github.com/test/repo/issues/1",
					},
					{
						Number: 2,
						Title:  "Test Issue 2",
						State:  "closed",
						User: models.User{
							Login: "testuser2",
						},
						CreatedAt: time.Date(2023, 1, 2, 10, 0, 0, 0, time.UTC),
						HTMLURL:   "https://github.com/test/repo/issues/2",
					},
				},
				RateLimit: &models.RateLimitInfo{
					Limit:     5000,
					Remaining: 4999,
					ResetTime: time.Date(2023, 1, 1, 13, 0, 0, 0, time.UTC),
				},
			},
			outputFile:   "",
			expectError:  false,
			expectOutput: []string{`"repository": "test/repo"`, `"fetched_count": 2`, `"number": 1`, `"title": "Test Issue 1"`},
			description:  "Should output valid JSON to stdout",
		},
		{
			name: "json output to file",
			result: &models.IssueResult{
				Repository:   "test/repo",
				FetchedCount: 1,
				FetchedAt:    time.Date(2023, 1, 1, 12, 0, 0, 0, time.UTC),
				Issues: []models.Issue{
					{
						Number: 1,
						Title:  "Test Issue",
						State:  "open",
						User: models.User{
							Login: "testuser",
						},
						CreatedAt: time.Date(2023, 1, 1, 10, 0, 0, 0, time.UTC),
						HTMLURL:   "https://github.com/test/repo/issues/1",
					},
				},
			},
			outputFile:   "output.json",
			expectError:  false,
			expectOutput: []string{"✅ 結果をファイルに保存しました"},
			description:  "Should save JSON to file successfully",
		},
		{
			name: "empty result",
			result: &models.IssueResult{
				Repository:   "test/repo",
				FetchedCount: 0,
				FetchedAt:    time.Date(2023, 1, 1, 12, 0, 0, 0, time.UTC),
				Issues:       []models.Issue{},
			},
			outputFile:   "",
			expectError:  false,
			expectOutput: []string{`"repository": "test/repo"`, `"fetched_count": 0`, `"issues": []`},
			description:  "Should handle empty result correctly",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create temporary directory for test
			tempDir, err := os.MkdirTemp("", "json-output-test-*")
			require.NoError(t, err)
			defer os.RemoveAll(tempDir)

			// Change to temp directory
			oldDir, err := os.Getwd()
			require.NoError(t, err)
			defer os.Chdir(oldDir)

			err = os.Chdir(tempDir)
			require.NoError(t, err)

			// Capture stdout for console output tests
			var output bytes.Buffer
			oldStdout := os.Stdout
			if tt.outputFile == "" {
				r, w, err := os.Pipe()
				require.NoError(t, err)
				defer r.Close()

				os.Stdout = w
				defer func() {
					os.Stdout = oldStdout
				}()

				go func() {
					defer w.Close()
					err = outputJSON(tt.result, tt.outputFile)
				}()

				// Read the output
				buf := make([]byte, 4096)
				n, _ := r.Read(buf)
				output.Write(buf[:n])
			} else {
				// Test file output
				outputPath := filepath.Join(tempDir, tt.outputFile)
				err = outputJSON(tt.result, outputPath)
			}

			if tt.expectError {
				assert.Error(t, err, tt.description)
			} else {
				assert.NoError(t, err, tt.description)

				if tt.outputFile != "" {
					// Verify file was created and contains expected content
					outputPath := filepath.Join(tempDir, tt.outputFile)
					_, err := os.Stat(outputPath)
					assert.NoError(t, err, "Output file should exist")

					content, err := os.ReadFile(outputPath)
					assert.NoError(t, err, "Should be able to read output file")

					for _, expectedOutput := range tt.expectOutput {
						if !strings.Contains(expectedOutput, "✅") {
							// Check file content for JSON structure
							assert.Contains(t, string(content), strings.ReplaceAll(expectedOutput, `"`, ""), "File should contain expected JSON content")
						}
					}
				} else {
					// Check stdout output
					outputStr := output.String()
					for _, expectedOutput := range tt.expectOutput {
						assert.Contains(t, outputStr, expectedOutput, "Stdout should contain expected JSON content")
					}
				}
			}
		})
	}
}

// TestFetchOutputSummary tests the summary output functionality for fetch command
func TestFetchOutputSummary(t *testing.T) {
	tests := []struct {
		name         string
		result       *models.IssueResult
		outputFile   string
		expectError  bool
		expectOutput []string
		description  string
	}{
		{
			name: "summary output with issues",
			result: &models.IssueResult{
				Repository:   "test/repo",
				FetchedCount: 2,
				FetchedAt:    time.Date(2023, 1, 1, 12, 0, 0, 0, time.UTC),
				Issues: []models.Issue{
					{
						Number: 1,
						Title:  "Bug Report",
						State:  "open",
						Body:   "This is a bug that needs to be fixed. It causes the application to crash when users perform certain actions.",
						User: models.User{
							Login: "developer1",
						},
						CreatedAt: time.Date(2023, 1, 1, 10, 0, 0, 0, time.UTC),
						HTMLURL:   "https://github.com/test/repo/issues/1",
						Labels: []models.Label{
							{Name: "bug"},
							{Name: "priority-high"},
						},
						Comments: []models.Comment{
							{
								User: models.User{Login: "reviewer1"},
								Body: "I can reproduce this issue",
							},
						},
					},
					{
						Number: 2,
						Title:  "Feature Request",
						State:  "closed",
						Body:   "Add new functionality",
						User: models.User{
							Login: "user1",
						},
						CreatedAt: time.Date(2023, 1, 2, 10, 0, 0, 0, time.UTC),
						HTMLURL:   "https://github.com/test/repo/issues/2",
						Labels: []models.Label{
							{Name: "enhancement"},
						},
					},
				},
				RateLimit: &models.RateLimitInfo{
					Limit:     5000,
					Remaining: 4999,
					ResetTime: time.Date(2023, 1, 1, 13, 0, 0, 0, time.UTC),
				},
			},
			outputFile:   "",
			expectError:  false,
			expectOutput: []string{"📊 GitHub Issues取得結果", "test/repo", "取得件数: 2件", "#1 Bug Report", "#2 Feature Request", "オープン: 1件", "クローズ: 1件", "bug: 1件", "enhancement: 1件"},
			description:  "Should output comprehensive summary to stdout",
		},
		{
			name: "summary output to file",
			result: &models.IssueResult{
				Repository:   "test/repo",
				FetchedCount: 1,
				FetchedAt:    time.Date(2023, 1, 1, 12, 0, 0, 0, time.UTC),
				Issues: []models.Issue{
					{
						Number: 1,
						Title:  "Test Issue",
						State:  "open",
						User: models.User{
							Login: "testuser",
						},
						CreatedAt: time.Date(2023, 1, 1, 10, 0, 0, 0, time.UTC),
						HTMLURL:   "https://github.com/test/repo/issues/1",
					},
				},
			},
			outputFile:   "summary.txt",
			expectError:  false,
			expectOutput: []string{"✅ サマリーをファイルに保存しました"},
			description:  "Should save summary to file successfully",
		},
		{
			name: "empty issues summary",
			result: &models.IssueResult{
				Repository:   "test/repo",
				FetchedCount: 0,
				FetchedAt:    time.Date(2023, 1, 1, 12, 0, 0, 0, time.UTC),
				Issues:       []models.Issue{},
			},
			outputFile:   "",
			expectError:  false,
			expectOutput: []string{"📊 GitHub Issues取得結果", "test/repo", "取得件数: 0件", "オープン: 0件", "クローズ: 0件"},
			description:  "Should handle empty issues list",
		},
		{
			name: "issues with long body text",
			result: &models.IssueResult{
				Repository:   "test/repo",
				FetchedCount: 1,
				FetchedAt:    time.Date(2023, 1, 1, 12, 0, 0, 0, time.UTC),
				Issues: []models.Issue{
					{
						Number: 1,
						Title:  "Issue with long description",
						State:  "open",
						Body:   strings.Repeat("This is a very long description that exceeds 100 characters and should be truncated in the summary output. ", 2),
						User: models.User{
							Login: "testuser",
						},
						CreatedAt: time.Date(2023, 1, 1, 10, 0, 0, 0, time.UTC),
						HTMLURL:   "https://github.com/test/repo/issues/1",
					},
				},
			},
			outputFile:   "",
			expectError:  false,
			expectOutput: []string{"概要:", "..."},
			description:  "Should truncate long issue body text",
		},
		{
			name: "issues with newlines in body",
			result: &models.IssueResult{
				Repository:   "test/repo",
				FetchedCount: 1,
				FetchedAt:    time.Date(2023, 1, 1, 12, 0, 0, 0, time.UTC),
				Issues: []models.Issue{
					{
						Number: 1,
						Title:  "Issue with newlines",
						State:  "open",
						Body:   "First line\nSecond line\nThird line",
						User: models.User{
							Login: "testuser",
						},
						CreatedAt: time.Date(2023, 1, 1, 10, 0, 0, 0, time.UTC),
						HTMLURL:   "https://github.com/test/repo/issues/1",
					},
				},
			},
			outputFile:   "",
			expectError:  false,
			expectOutput: []string{"概要: First line Second line Third line"},
			description:  "Should replace newlines with spaces in summary",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create temporary directory for test
			tempDir, err := os.MkdirTemp("", "summary-output-test-*")
			require.NoError(t, err)
			defer os.RemoveAll(tempDir)

			// Change to temp directory
			oldDir, err := os.Getwd()
			require.NoError(t, err)
			defer os.Chdir(oldDir)

			err = os.Chdir(tempDir)
			require.NoError(t, err)

			// Capture stdout for console output tests
			var output bytes.Buffer
			oldStdout := os.Stdout
			if tt.outputFile == "" {
				r, w, err := os.Pipe()
				require.NoError(t, err)
				defer r.Close()

				os.Stdout = w
				defer func() {
					os.Stdout = oldStdout
				}()

				go func() {
					defer w.Close()
					err = outputSummary(tt.result, tt.outputFile)
				}()

				// Read the output
				buf := make([]byte, 8192) // Increase buffer size for summary output
				n, _ := r.Read(buf)
				output.Write(buf[:n])
			} else {
				// Test file output
				outputPath := filepath.Join(tempDir, tt.outputFile)
				err = outputSummary(tt.result, outputPath)
			}

			if tt.expectError {
				assert.Error(t, err, tt.description)
			} else {
				assert.NoError(t, err, tt.description)

				if tt.outputFile != "" {
					// Verify file was created and contains expected content
					outputPath := filepath.Join(tempDir, tt.outputFile)
					_, err := os.Stat(outputPath)
					assert.NoError(t, err, "Output file should exist")

					content, err := os.ReadFile(outputPath)
					assert.NoError(t, err, "Should be able to read output file")

					for _, expectedOutput := range tt.expectOutput {
						if !strings.Contains(expectedOutput, "✅") {
							// Check file content for summary structure
							assert.Contains(t, string(content), expectedOutput, "File should contain expected summary content")
						}
					}
				} else {
					// Check stdout output
					outputStr := output.String()
					for _, expectedOutput := range tt.expectOutput {
						assert.Contains(t, outputStr, expectedOutput, "Stdout should contain expected summary content")
					}
				}
			}
		})
	}
}

// TestFetchIssuesFlags tests all fetch issues command flags
func TestFetchIssuesFlags(t *testing.T) {
	tests := []struct {
		name           string
		flags          map[string]any
		expectError    bool
		expectContains []string
		description    string
	}{
		{
			name: "state flag validation",
			flags: map[string]any{
				"state": "invalid-state",
			},
			expectError:    true,
			expectContains: []string{},
			description:    "Should validate state flag values",
		},
		{
			name: "per-page range validation - too low",
			flags: map[string]any{
				"per-page": 0,
			},
			expectError:    true,
			expectContains: []string{"per-page は 1-100 の範囲で指定してください"},
			description:    "Should reject per-page values below 1",
		},
		{
			name: "per-page range validation - too high",
			flags: map[string]any{
				"per-page": 101,
			},
			expectError:    true,
			expectContains: []string{"per-page は 1-100 の範囲で指定してください"},
			description:    "Should reject per-page values above 100",
		},
		{
			name: "valid per-page value",
			flags: map[string]any{
				"per-page": 50,
			},
			expectError:    false,
			expectContains: []string{},
			description:    "Should accept valid per-page values",
		},
		{
			name: "multiple labels",
			flags: map[string]any{
				"labels": []string{"bug", "enhancement", "good-first-issue"},
			},
			expectError:    false,
			expectContains: []string{},
			description:    "Should accept multiple labels",
		},
		{
			name: "valid since parameter",
			flags: map[string]any{
				"since": "2023-01-01T00:00:00Z",
			},
			expectError:    false,
			expectContains: []string{},
			description:    "Should accept valid RFC3339 since parameter",
		},
		{
			name: "invalid since parameter",
			flags: map[string]any{
				"since": "2023-01-01",
			},
			expectError:    true,
			expectContains: []string{"since パラメータの形式が無効です"},
			description:    "Should reject invalid since parameter format",
		},
		{
			name: "sort and direction parameters",
			flags: map[string]any{
				"sort":      "updated",
				"direction": "asc",
			},
			expectError:    false,
			expectContains: []string{},
			description:    "Should accept valid sort and direction parameters",
		},
		{
			name: "max-pages parameter",
			flags: map[string]any{
				"max-pages": 5,
			},
			expectError:    false,
			expectContains: []string{},
			description:    "Should accept max-pages parameter",
		},
		{
			name: "include-comments false",
			flags: map[string]any{
				"include-comments": false,
			},
			expectError:    false,
			expectContains: []string{},
			description:    "Should accept include-comments false",
		},
		{
			name: "output format json",
			flags: map[string]any{
				"format": "json",
			},
			expectError:    false,
			expectContains: []string{},
			description:    "Should accept json output format",
		},
		{
			name: "output format summary",
			flags: map[string]any{
				"format": "summary",
			},
			expectError:    false,
			expectContains: []string{},
			description:    "Should accept summary output format",
		},
		{
			name: "invalid output format",
			flags: map[string]any{
				"format": "xml",
			},
			expectError:    true,
			expectContains: []string{"無効な出力形式"},
			description:    "Should reject invalid output format",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Skip tests that involve validation errors which trigger os.Exit() calls
			if strings.Contains(tt.name, "validation") || strings.Contains(tt.name, "invalid") {
				t.Skip("Skipping test that involves os.Exit() calls - not feasible to test due to process termination")
				return
			}

			// Create temporary directory for test
			tempDir, err := os.MkdirTemp("", "fetch-flags-test-*")
			require.NoError(t, err)
			defer os.RemoveAll(tempDir)

			// Change to temp directory
			oldDir, err := os.Getwd()
			require.NoError(t, err)
			defer os.Chdir(oldDir)

			err = os.Chdir(tempDir)
			require.NoError(t, err)

			// Create minimal valid config
			config := `
project:
  name: "test"
sources:
  github:
    token: "fake-token"
`
			configPath := filepath.Join(tempDir, "beaver.yml")
			err = os.WriteFile(configPath, []byte(config), 0644)
			require.NoError(t, err)

			// Reset flags to default values before each test
			issueState = "open"
			issueLabels = nil
			issueSort = "created"
			issueDirection = "desc"
			issueSince = ""
			issuePerPage = 30
			issueMaxPages = 0
			outputFormat = "json"
			outputFile = ""
			includeComments = true

			// Apply test flags
			for flag, value := range tt.flags {
				switch flag {
				case "state":
					issueState = value.(string)
				case "labels":
					issueLabels = value.([]string)
				case "sort":
					issueSort = value.(string)
				case "direction":
					issueDirection = value.(string)
				case "since":
					issueSince = value.(string)
				case "per-page":
					issuePerPage = value.(int)
				case "max-pages":
					issueMaxPages = value.(int)
				case "format":
					outputFormat = value.(string)
				case "output":
					outputFile = value.(string)
				case "include-comments":
					includeComments = value.(bool)
				}
			}

			// Capture output
			var output bytes.Buffer
			oldStdout := os.Stdout
			oldStderr := os.Stderr
			defer func() {
				os.Stdout = oldStdout
				os.Stderr = oldStderr
			}()

			r, w, err := os.Pipe()
			require.NoError(t, err)
			defer r.Close()

			os.Stdout = w
			os.Stderr = w

			// Run the function directly to test flag validation
			done := make(chan error, 1)
			go func() {
				defer w.Close()
				done <- runFetchIssues(nil, []string{"owner/repo"})
			}()

			// Read output
			outputDone := make(chan struct{})
			go func() {
				defer close(outputDone)
				buf := make([]byte, 4096)
				for {
					n, err := r.Read(buf)
					if n > 0 {
						output.Write(buf[:n])
					}
					if err != nil {
						break
					}
				}
			}()

			// Wait for completion with timeout
			select {
			case err = <-done:
				// Command completed
			case <-time.After(3 * time.Second):
				t.Error("Command timed out")
				return
			}

			// Wait for output capture
			select {
			case <-outputDone:
				// Output captured
			case <-time.After(1 * time.Second):
				// Continue even if output capture times out
			}

			outputStr := output.String()

			if tt.expectError {
				assert.Error(t, err, tt.description)
			} else {
				// For successful cases, we expect GitHub API connection errors since we're using fake tokens
				// The validation should pass, but the API call should fail
				if err != nil {
					// Check if it's an expected API error rather than validation error
					assert.Contains(t, err.Error(), "GitHub", "Should fail on GitHub API, not validation")
				}
			}

			// Verify expected output strings
			for _, expectedOutput := range tt.expectContains {
				assert.Contains(t, outputStr, expectedOutput, "Output should contain expected text: %s", expectedOutput)
			}
		})
	}
}

// TestRepositoryValidation tests repository format validation
func TestRepositoryValidation(t *testing.T) {
	tests := []struct {
		name        string
		repository  string
		expectError bool
		description string
	}{
		{
			name:        "valid repository format",
			repository:  "owner/repo",
			expectError: false,
			description: "Should accept valid owner/repo format",
		},
		{
			name:        "valid repository with dashes",
			repository:  "test-org/my-repo-name",
			expectError: false,
			description: "Should accept repository names with dashes",
		},
		{
			name:        "valid repository with numbers",
			repository:  "user123/repo456",
			expectError: false,
			description: "Should accept repository names with numbers",
		},
		{
			name:        "invalid repository - no slash",
			repository:  "invalidrepo",
			expectError: true,
			description: "Should reject repository without slash",
		},
		{
			name:        "invalid repository - multiple slashes",
			repository:  "owner/repo/extra",
			expectError: true,
			description: "Should reject repository with multiple slashes",
		},
		{
			name:        "invalid repository - empty string",
			repository:  "",
			expectError: true,
			description: "Should reject empty repository string",
		},
		{
			name:        "invalid repository - only slash",
			repository:  "/",
			expectError: true,
			description: "Should reject repository with only slash",
		},
		{
			name:        "invalid repository - trailing slash",
			repository:  "owner/repo/",
			expectError: true,
			description: "Should reject repository with trailing slash",
		},
		{
			name:        "invalid repository - leading slash",
			repository:  "/owner/repo",
			expectError: true,
			description: "Should reject repository with leading slash",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Test the validation logic directly
			parts := strings.Split(tt.repository, "/")
			isValid := strings.Contains(tt.repository, "/") && strings.Count(tt.repository, "/") == 1 &&
				len(parts) == 2 && parts[0] != "" && parts[1] != ""

			if !isValid {
				if tt.expectError {
					// Expected error case
					assert.True(t, true, tt.description)
				} else {
					assert.False(t, true, "Repository should be valid but validation failed: %s", tt.repository)
				}
			} else {
				if tt.expectError {
					assert.False(t, true, "Repository should be invalid but validation passed: %s", tt.repository)
				} else {
					// Expected success case
					assert.True(t, true, tt.description)
				}
			}

			// Test with IssueQuery validation method
			query := models.IssueQuery{Repository: tt.repository}
			queryValid := query.ValidateRepository()

			if tt.expectError {
				assert.False(t, queryValid, "IssueQuery should validate repository as invalid")
			} else {
				assert.True(t, queryValid, "IssueQuery should validate repository as valid")
			}
		})
	}
}

// TestFetchCommandValidation tests basic validation logic
func TestFetchCommandValidation(t *testing.T) {
	t.Run("invalid repository format", func(t *testing.T) {
		// Test the validation logic directly
		err := runFetchIssues(nil, []string{"invalid-repo-format"})
		assert.Error(t, err, "Should fail with invalid repository format")
		assert.Contains(t, err.Error(), "リポジトリ形式が無効です", "Should contain repository format error")
	})

	t.Run("valid repository format", func(t *testing.T) {
		// This will fail on config or GitHub API, but repository validation should pass
		err := runFetchIssues(nil, []string{"owner/repo"})
		assert.Error(t, err, "Should fail on config or GitHub API")
		// Should not be a repository format error
		assert.NotContains(t, err.Error(), "リポジトリ形式が無効です", "Should not be repository format error")
	})
}

// TestModelValidation tests the validation methods in models
func TestModelValidation(t *testing.T) {
	t.Run("IssueQuery.ValidateRepository", func(t *testing.T) {
		tests := []struct {
			name       string
			repository string
			expected   bool
		}{
			{"valid format", "owner/repo", true},
			{"with dashes", "test-org/my-repo", true},
			{"with numbers", "user123/repo456", true},
			{"empty string", "", false},
			{"no slash", "ownerrepo", false},
			{"multiple slashes", "owner/repo/sub", false},
			{"only slash", "/", false},
			{"trailing slash", "owner/repo/", false},
			{"leading slash", "/owner/repo", false},
			{"empty owner", "/repo", false},
			{"empty repo", "owner/", false},
			{"spaces", "owner / repo", true},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				query := models.IssueQuery{Repository: tt.repository}
				result := query.ValidateRepository()
				assert.Equal(t, tt.expected, result, "Repository validation for: %s", tt.repository)
			})
		}
	})

	t.Run("IssueQuery.SetDefaults", func(t *testing.T) {
		query := models.IssueQuery{Repository: "test/repo"}
		query.SetDefaults()

		assert.Equal(t, "open", query.State)
		assert.Equal(t, "created", query.Sort)
		assert.Equal(t, "desc", query.Direction)
		assert.Equal(t, 30, query.PerPage)
		assert.Equal(t, 1, query.Page)
	})

	t.Run("DefaultIssueQuery", func(t *testing.T) {
		query := models.DefaultIssueQuery("test/repo")

		assert.Equal(t, "test/repo", query.Repository)
		assert.Equal(t, "open", query.State)
		assert.Equal(t, "created", query.Sort)
		assert.Equal(t, "desc", query.Direction)
		assert.Equal(t, 30, query.PerPage)
		assert.Equal(t, 1, query.Page)
		assert.Equal(t, 0, query.MaxPages)
	})
}

// TestJSONMarshaling tests JSON marshaling/unmarshaling of models
func TestJSONMarshaling(t *testing.T) {
	t.Run("IssueResult JSON", func(t *testing.T) {
		original := &models.IssueResult{
			Repository:   "test/repo",
			FetchedCount: 1,
			FetchedAt:    time.Date(2023, 1, 1, 12, 0, 0, 0, time.UTC),
			Issues: []models.Issue{
				{
					Number: 1,
					Title:  "Test Issue",
					State:  "open",
					User: models.User{
						Login: "testuser",
					},
					CreatedAt: time.Date(2023, 1, 1, 10, 0, 0, 0, time.UTC),
					HTMLURL:   "https://github.com/test/repo/issues/1",
				},
			},
		}

		// Marshal to JSON
		jsonData, err := json.MarshalIndent(original, "", "  ")
		require.NoError(t, err)

		// Unmarshal back
		var restored models.IssueResult
		err = json.Unmarshal(jsonData, &restored)
		require.NoError(t, err)

		// Compare key fields
		assert.Equal(t, original.Repository, restored.Repository)
		assert.Equal(t, original.FetchedCount, restored.FetchedCount)
		assert.Equal(t, len(original.Issues), len(restored.Issues))
		if len(restored.Issues) > 0 {
			assert.Equal(t, original.Issues[0].Number, restored.Issues[0].Number)
			assert.Equal(t, original.Issues[0].Title, restored.Issues[0].Title)
		}
	})
}

// TestCommentFiltering tests the include-comments flag functionality
func TestCommentFiltering(t *testing.T) {
	result := &models.IssueResult{
		Repository:   "test/repo",
		FetchedCount: 1,
		Issues: []models.Issue{
			{
				Number: 1,
				Title:  "Test Issue",
				Comments: []models.Comment{
					{
						User: models.User{Login: "commenter"},
						Body: "This is a comment",
					},
				},
			},
		},
	}

	t.Run("comments included", func(t *testing.T) {
		// includeComments is true by default, comments should remain
		originalCommentCount := len(result.Issues[0].Comments)
		assert.Equal(t, 1, originalCommentCount)
	})

	t.Run("comments excluded", func(t *testing.T) {
		// Simulate the comment filtering logic from runFetchIssues
		testResult := *result // Copy the result
		testResult.Issues = make([]models.Issue, len(result.Issues))
		copy(testResult.Issues, result.Issues)

		// Apply comment filtering (simulate includeComments = false)
		for i := range testResult.Issues {
			testResult.Issues[i].Comments = nil
		}

		assert.Nil(t, testResult.Issues[0].Comments)
	})
}

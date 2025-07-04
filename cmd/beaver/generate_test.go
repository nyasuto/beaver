package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/nyasuto/beaver/internal/models"
	"github.com/nyasuto/beaver/pkg/troubleshooting"
	"github.com/spf13/cobra"
)

// Mock implementations for testing

// MockTroubleshootingAnalyzer mocks the troubleshooting analyzer
type MockTroubleshootingAnalyzer struct {
	Guide *troubleshooting.TroubleshootingGuide
	Error error
}

// MockGenerateGitHubService for GitHub API integration testing (specific to generate tests)
type MockGenerateGitHubService struct {
	Issues []models.Issue
	Error  error
}

func (m *MockGenerateGitHubService) FetchIssues(ctx context.Context, query models.IssueQuery) (*models.IssueResult, error) {
	if m.Error != nil {
		return nil, m.Error
	}
	return &models.IssueResult{
		Issues:       m.Issues,
		TotalCount:   len(m.Issues),
		FetchedCount: len(m.Issues),
		Repository:   query.Repository,
		Query:        query,
		FetchedAt:    time.Now(),
	}, nil
}

// MockConfigLoader for configuration testing
type MockConfigLoader struct {
	Config *MockConfig
	Error  error
}

type MockConfig struct {
	GitHubToken string
}

func (c *MockConfig) GetGitHubToken() string {
	return c.GitHubToken
}

func (m *MockConfigLoader) LoadConfig() (*MockConfig, error) {
	if m.Error != nil {
		return nil, m.Error
	}
	return m.Config, nil
}

// Test data generators
func createTestIssues() []models.Issue {
	now := time.Now()
	closedTime := now.Add(time.Hour)

	return []models.Issue{
		{
			ID:        1,
			Number:    1,
			Title:     "API authentication error",
			Body:      "Getting 401 error when trying to authenticate with API token",
			State:     "closed",
			CreatedAt: now,
			UpdatedAt: now.Add(30 * time.Minute),
			ClosedAt:  &closedTime,
			Labels:    []models.Label{{Name: "bug"}, {Name: "api"}},
		},
		{
			ID:        2,
			Number:    2,
			Title:     "Configuration file not found",
			Body:      "Application fails to start because config.yml is missing",
			State:     "open",
			CreatedAt: now,
			UpdatedAt: now.Add(15 * time.Minute),
			Labels:    []models.Label{{Name: "bug"}, {Name: "configuration"}},
		},
		{
			ID:        3,
			Number:    3,
			Title:     "Database timeout error",
			Body:      "Query timeout after 30 seconds when accessing user table. Solved by adding proper indexing.",
			State:     "closed",
			CreatedAt: now,
			UpdatedAt: now.Add(45 * time.Minute),
			ClosedAt:  &closedTime,
			Labels:    []models.Label{{Name: "bug"}, {Name: "database"}, {Name: "solved"}},
		},
	}
}

func createMockTroubleshootingGuide() *troubleshooting.TroubleshootingGuide {
	now := time.Now()
	return &troubleshooting.TroubleshootingGuide{
		ProjectName:  "test/project",
		GeneratedAt:  now,
		TotalIssues:  3,
		SolvedIssues: 2,
		ErrorPatterns: []troubleshooting.ErrorPattern{
			{
				ID:            "api_error_1",
				Pattern:       "API_ERROR",
				Title:         "API Communication Error",
				Description:   "Authentication and API communication issues",
				Frequency:     2,
				Severity:      troubleshooting.SeverityHigh,
				Category:      "Integration",
				Symptoms:      []string{"401 error", "authentication failed"},
				Causes:        []string{"Invalid token", "Expired credentials"},
				Solutions:     []string{"Check token validity", "Regenerate API token"},
				Prevention:    []string{"Monitor token expiration", "Implement token refresh"},
				RelatedIssues: []int{1, 3},
				LastSeen:      now,
			},
		},
		Solutions: []troubleshooting.Solution{
			{
				ID:          "sol_1",
				Title:       "Database Indexing Solution",
				Description: "Add proper database indexing to prevent timeouts",
				Category:    "Performance",
				Difficulty:  troubleshooting.DifficultyMedium,
				Steps: []troubleshooting.SolutionStep{
					{
						Number:      1,
						Description: "Analyze slow queries",
						Command:     "EXPLAIN ANALYZE SELECT * FROM users;",
						Expected:    "Query execution plan with timing",
						Warning:     "Run on non-production first",
					},
				},
				RequiredTools: []string{"psql", "pgAdmin"},
				TimeEstimate:  2 * time.Hour,
				SuccessRate:   0.95,
				RelatedIssues: []int{3},
				Tags:          []string{"database", "performance"},
				CreatedAt:     now,
			},
		},
		Statistics: troubleshooting.GuideStatistics{
			TotalPatterns:      1,
			TotalSolutions:     1,
			AverageResolveTime: 2.5,
			SuccessRate:        66.7,
			MostCommonCategory: "Integration",
			CriticalPatterns:   0,
		},
	}
}

func TestGenerateParseRepoPath(t *testing.T) {
	testCases := []struct {
		name          string
		input         string
		expectedOwner string
		expectedRepo  string
		expectError   bool
	}{
		{
			name:          "valid repo path",
			input:         "owner/repo",
			expectedOwner: "owner",
			expectedRepo:  "repo",
			expectError:   false,
		},
		{
			name:        "invalid repo path - no slash",
			input:       "invalidrepo",
			expectError: true,
		},
		{
			name:        "invalid repo path - too many parts",
			input:       "owner/repo/extra",
			expectError: true,
		},
		{
			name:        "empty repo path",
			input:       "",
			expectError: true,
		},
		{
			name:          "empty owner",
			input:         "/repo",
			expectedOwner: "",
			expectedRepo:  "repo",
			expectError:   false,
		},
		{
			name:          "empty repo",
			input:         "owner/",
			expectedOwner: "owner",
			expectedRepo:  "",
			expectError:   false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			owner, repo, err := parseRepoPath(tc.input)

			if tc.expectError {
				if err == nil {
					t.Errorf("Expected error for input '%s', but got none", tc.input)
				}
			} else {
				if err != nil {
					t.Errorf("Unexpected error for input '%s': %v", tc.input, err)
				}
				if owner != tc.expectedOwner {
					t.Errorf("Expected owner '%s', got '%s'", tc.expectedOwner, owner)
				}
				if repo != tc.expectedRepo {
					t.Errorf("Expected repo '%s', got '%s'", tc.expectedRepo, repo)
				}
			}
		})
	}
}

func TestGenerateTroubleshootingCommand(t *testing.T) {
	// Create temporary directory for test outputs
	tempDir, err := os.MkdirTemp("", "generate_test_*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("Failed to get current directory: %v", err)
	}
	defer os.Chdir(originalDir)

	err = os.Chdir(tempDir)
	if err != nil {
		t.Fatalf("Failed to change to temp directory: %v", err)
	}

	t.Run("successful generation with default settings", func(t *testing.T) {
		// Setup test data
		mockGuide := createMockTroubleshootingGuide()

		// Create a temporary command for testing
		cmd := &cobra.Command{
			Use: "test",
			RunE: func(cmd *cobra.Command, args []string) error {
				// Simulate the core logic of runGenerateTroubleshooting
				return saveTroubleshootingGuide(mockGuide, "test-guide.json", "json")
			},
		}

		// Execute command
		err := cmd.RunE(cmd, []string{"test/repo"})
		if err != nil {
			t.Fatalf("Command execution failed: %v", err)
		}

		// Verify output file was created
		if _, err := os.Stat("test-guide.json"); os.IsNotExist(err) {
			t.Error("Expected output file test-guide.json was not created")
		}

		// Verify file content
		data, err := os.ReadFile("test-guide.json")
		if err != nil {
			t.Fatalf("Failed to read output file: %v", err)
		}

		var guide troubleshooting.TroubleshootingGuide
		err = json.Unmarshal(data, &guide)
		if err != nil {
			t.Fatalf("Failed to parse JSON output: %v", err)
		}

		if guide.ProjectName != "test/project" {
			t.Errorf("Expected project name 'test/project', got '%s'", guide.ProjectName)
		}
		if guide.TotalIssues != 3 {
			t.Errorf("Expected 3 total issues, got %d", guide.TotalIssues)
		}
	})

	t.Run("wiki format generation", func(t *testing.T) {
		mockGuide := createMockTroubleshootingGuide()

		err := saveTroubleshootingGuide(mockGuide, "test-guide.md", "wiki")
		if err != nil {
			t.Fatalf("Wiki generation failed: %v", err)
		}

		// Verify wiki file was created
		if _, err := os.Stat("test-guide.md"); os.IsNotExist(err) {
			t.Error("Expected wiki file test-guide.md was not created")
		}

		// Verify content contains wiki markup
		content, err := os.ReadFile("test-guide.md")
		if err != nil {
			t.Fatalf("Failed to read wiki file: %v", err)
		}

		contentStr := string(content)
		expectedElements := []string{
			"# 🛠️",       // Title
			"## 📋 概要",    // Overview section
			"## 🔍 よくあるエラーパターン", // Error patterns
			"## 💡 解決方法",        // Solutions
			"## 📊 統計情報",        // Statistics
		}

		for _, element := range expectedElements {
			if !strings.Contains(contentStr, element) {
				t.Errorf("Wiki content missing expected element: %s", element)
			}
		}
	})

	t.Run("markdown format generation", func(t *testing.T) {
		mockGuide := createMockTroubleshootingGuide()

		err := saveTroubleshootingGuide(mockGuide, "test-guide-md.md", "markdown")
		if err != nil {
			t.Fatalf("Markdown generation failed: %v", err)
		}

		// Verify markdown file was created
		if _, err := os.Stat("test-guide-md.md"); os.IsNotExist(err) {
			t.Error("Expected markdown file test-guide-md.md was not created")
		}
	})
}

func TestSaveTroubleshootingGuide(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "save_test_*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("Failed to get current directory: %v", err)
	}
	defer os.Chdir(originalDir)

	err = os.Chdir(tempDir)
	if err != nil {
		t.Fatalf("Failed to change to temp directory: %v", err)
	}

	mockGuide := createMockTroubleshootingGuide()

	t.Run("save as JSON", func(t *testing.T) {
		err := saveTroubleshootingGuide(mockGuide, "test.json", "json")
		if err != nil {
			t.Fatalf("Failed to save JSON: %v", err)
		}

		// Verify file exists and is valid JSON
		data, err := os.ReadFile("test.json")
		if err != nil {
			t.Fatalf("Failed to read JSON file: %v", err)
		}

		var guide troubleshooting.TroubleshootingGuide
		err = json.Unmarshal(data, &guide)
		if err != nil {
			t.Fatalf("Invalid JSON output: %v", err)
		}
	})

	t.Run("save as wiki", func(t *testing.T) {
		err := saveTroubleshootingGuide(mockGuide, "test.md", "wiki")
		if err != nil {
			t.Fatalf("Failed to save wiki: %v", err)
		}

		// Verify file exists and contains expected content
		content, err := os.ReadFile("test.md")
		if err != nil {
			t.Fatalf("Failed to read wiki file: %v", err)
		}

		if len(content) == 0 {
			t.Error("Wiki file is empty")
		}
	})

	t.Run("unsupported format", func(t *testing.T) {
		err := saveTroubleshootingGuide(mockGuide, "test.xyz", "xyz")
		if err == nil {
			t.Error("Expected error for unsupported format")
		}
		if !strings.Contains(err.Error(), "unsupported format") {
			t.Errorf("Expected 'unsupported format' error, got: %v", err)
		}
	})

	t.Run("invalid file path", func(t *testing.T) {
		// Try to write to a directory that doesn't exist
		err := saveTroubleshootingGuide(mockGuide, "/nonexistent/path/test.json", "json")
		if err == nil {
			t.Error("Expected error for invalid file path")
		}
	})
}

func TestSaveTroubleshootingJSON(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "json_test_*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	mockGuide := createMockTroubleshootingGuide()
	filename := filepath.Join(tempDir, "test.json")

	err = saveTroubleshootingJSON(mockGuide, filename)
	if err != nil {
		t.Fatalf("Failed to save JSON: %v", err)
	}

	// Verify file content
	data, err := os.ReadFile(filename)
	if err != nil {
		t.Fatalf("Failed to read JSON file: %v", err)
	}

	// Verify JSON structure
	var guide troubleshooting.TroubleshootingGuide
	err = json.Unmarshal(data, &guide)
	if err != nil {
		t.Fatalf("Invalid JSON structure: %v", err)
	}

	// Verify critical fields
	if guide.ProjectName != mockGuide.ProjectName {
		t.Errorf("Project name mismatch: expected %s, got %s", mockGuide.ProjectName, guide.ProjectName)
	}
	if guide.TotalIssues != mockGuide.TotalIssues {
		t.Errorf("Total issues mismatch: expected %d, got %d", mockGuide.TotalIssues, guide.TotalIssues)
	}
	if len(guide.ErrorPatterns) != len(mockGuide.ErrorPatterns) {
		t.Errorf("Error patterns count mismatch: expected %d, got %d",
			len(mockGuide.ErrorPatterns), len(guide.ErrorPatterns))
	}
}

func TestSaveTroubleshootingWiki(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "wiki_test_*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	mockGuide := createMockTroubleshootingGuide()
	filename := filepath.Join(tempDir, "test.md")

	err = saveTroubleshootingWiki(mockGuide, filename)
	if err != nil {
		t.Fatalf("Failed to save wiki: %v", err)
	}

	// Verify file content
	content, err := os.ReadFile(filename)
	if err != nil {
		t.Fatalf("Failed to read wiki file: %v", err)
	}

	contentStr := string(content)

	// Verify essential wiki elements
	essentialElements := []string{
		mockGuide.ProjectName,
		"📋 概要",
		"🔍 よくあるエラーパターン",
		"💡 解決方法",
		"📊 統計情報",
	}

	for _, element := range essentialElements {
		if !strings.Contains(contentStr, element) {
			t.Errorf("Wiki content missing essential element: %s", element)
		}
	}

	// Verify error pattern details
	if !strings.Contains(contentStr, "API Communication Error") {
		t.Error("Wiki missing error pattern title")
	}

	// Verify solution details
	if !strings.Contains(contentStr, "Database Indexing Solution") {
		t.Error("Wiki missing solution title")
	}
}

func TestGenerateTroubleshootingWikiContent(t *testing.T) {
	mockGuide := createMockTroubleshootingGuide()

	content := generateTroubleshootingWikiContent(mockGuide)

	if len(content) == 0 {
		t.Fatal("Generated wiki content is empty")
	}

	// Test specific content sections
	t.Run("header section", func(t *testing.T) {
		if !strings.Contains(content, "# 🛠️ test/project - トラブルシューティングガイド") {
			t.Error("Missing main header")
		}
		if !strings.Contains(content, "🤖 Beaver AI により生成") {
			t.Error("Missing AI attribution")
		}
	})

	t.Run("overview section", func(t *testing.T) {
		if !strings.Contains(content, "## 📋 概要") {
			t.Error("Missing overview section")
		}
		if !strings.Contains(content, "3件のIssue") {
			t.Error("Missing total issues count")
		}
		if !strings.Contains(content, "2件解決済み") {
			t.Error("Missing solved issues count")
		}
	})

	t.Run("emergency actions section", func(t *testing.T) {
		// Emergency actions section was removed with analyze package cleanup
		t.Skip("Emergency actions section no longer exists in simplified implementation")
	})

	t.Run("error patterns section", func(t *testing.T) {
		if !strings.Contains(content, "## 🔍 よくあるエラーパターン") {
			t.Error("Missing error patterns section")
		}
		if !strings.Contains(content, "API Communication Error") {
			t.Error("Missing error pattern title")
		}
	})

	t.Run("solutions section", func(t *testing.T) {
		if !strings.Contains(content, "## 💡 解決方法") {
			t.Error("Missing solutions section")
		}
		if !strings.Contains(content, "Database Indexing Solution") {
			t.Error("Missing solution title")
		}
	})

	t.Run("prevention section", func(t *testing.T) {
		// Prevention section was removed with analyze package cleanup
		t.Skip("Prevention section no longer exists in simplified implementation")
	})

	t.Run("statistics section", func(t *testing.T) {
		if !strings.Contains(content, "## 📊 統計情報") {
			t.Error("Missing statistics section")
		}
		if !strings.Contains(content, "総Issue数**: 3") {
			t.Error("Missing total issues in statistics")
		}
	})
}

func TestHelperFunctions(t *testing.T) {
	t.Run("getSeverityIcon", func(t *testing.T) {
		testCases := []struct {
			severity string
			expected string
		}{
			{"critical", "🔴"},
			{"high", "🟠"},
			{"medium", "🟡"},
			{"low", "🟢"},
			{"unknown", "⚪"},
		}

		for _, tc := range testCases {
			result := getSeverityIcon(tc.severity)
			if result != tc.expected {
				t.Errorf("getSeverityIcon(%s) = %s, expected %s", tc.severity, result, tc.expected)
			}
		}
	})

	t.Run("getDifficultyIcon", func(t *testing.T) {
		testCases := []struct {
			difficulty string
			expected   string
		}{
			{"easy", "🟢"},
			{"medium", "🟡"},
			{"hard", "🟠"},
			{"expert", "🔴"},
			{"unknown", "⚪"},
		}

		for _, tc := range testCases {
			result := getDifficultyIcon(tc.difficulty)
			if result != tc.expected {
				t.Errorf("getDifficultyIcon(%s) = %s, expected %s", tc.difficulty, result, tc.expected)
			}
		}
	})

	t.Run("formatDuration", func(t *testing.T) {
		testCases := []struct {
			duration time.Duration
			expected string
		}{
			{30 * time.Minute, "30分"},
			{90 * time.Minute, "1.5時間"},
			{2 * time.Hour, "2.0時間"},
			{25 * time.Hour, "1.0日"},
			{48 * time.Hour, "2.0日"},
		}

		for _, tc := range testCases {
			result := formatDuration(tc.duration)
			if result != tc.expected {
				t.Errorf("formatDuration(%v) = %s, expected %s", tc.duration, result, tc.expected)
			}
		}
	})
}

func TestCommandIntegration(t *testing.T) {
	// Test the command structure and flag parsing
	t.Run("command structure", func(t *testing.T) {
		if generateTroubleshootingCmd.Use != "troubleshooting [owner/repo]" {
			t.Error("Command Use string mismatch")
		}

		if !generateTroubleshootingCmd.HasFlags() {
			t.Error("Command should have flags")
		}

		// Check for required flags
		outputFlag := generateTroubleshootingCmd.Flag("output")
		if outputFlag == nil {
			t.Error("Missing --output flag")
		}

		formatFlag := generateTroubleshootingCmd.Flag("format")
		if formatFlag == nil {
			t.Error("Missing --format flag")
		}

		// AI-enhanced flag was removed with analyze package cleanup
		// Just check that basic required flags exist
	})

	t.Run("argument validation", func(t *testing.T) {
		// Test with no arguments
		err := generateTroubleshootingCmd.Args(generateTroubleshootingCmd, []string{})
		if err == nil {
			t.Error("Expected error with no arguments")
		}

		// Test with correct number of arguments
		err = generateTroubleshootingCmd.Args(generateTroubleshootingCmd, []string{"owner/repo"})
		if err != nil {
			t.Errorf("Unexpected error with correct arguments: %v", err)
		}

		// Test with too many arguments
		err = generateTroubleshootingCmd.Args(generateTroubleshootingCmd, []string{"owner/repo", "extra"})
		if err == nil {
			t.Error("Expected error with too many arguments")
		}
	})
}

func TestErrorHandling(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "error_test_*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	t.Run("file permission error", func(t *testing.T) {
		mockGuide := createMockTroubleshootingGuide()

		// Try to write to a read-only directory
		readOnlyDir := filepath.Join(tempDir, "readonly")
		err := os.MkdirAll(readOnlyDir, 0555) // Read and execute only
		if err != nil {
			t.Fatalf("Failed to create read-only directory: %v", err)
		}

		filename := filepath.Join(readOnlyDir, "test.json")
		err = saveTroubleshootingJSON(mockGuide, filename)
		if err == nil {
			t.Error("Expected permission error when writing to read-only directory")
		}
	})

	t.Run("invalid JSON marshal", func(t *testing.T) {
		// This is harder to test without modifying the struct,
		// but we can test with nil guide
		filename := filepath.Join(tempDir, "nil_test.json")
		err := saveTroubleshootingJSON(nil, filename)
		if err != nil {
			// This might not error with nil, but test the scenario
			t.Logf("Nil guide handling: %v", err)
		}
	})
}

func TestEdgeCases(t *testing.T) {
	t.Run("empty troubleshooting guide", func(t *testing.T) {
		emptyGuide := &troubleshooting.TroubleshootingGuide{
			ProjectName: "empty/project",
			GeneratedAt: time.Now(),
		}

		content := generateTroubleshootingWikiContent(emptyGuide)
		if len(content) == 0 {
			t.Error("Empty guide should still generate some content")
		}

		// Should still have basic structure
		if !strings.Contains(content, "# 🛠️ empty/project") {
			t.Error("Missing project header for empty guide")
		}
	})

	t.Run("large troubleshooting guide", func(t *testing.T) {
		// Create a guide with many items
		largeGuide := createMockTroubleshootingGuide()

		// Add many error patterns
		for i := 0; i < 100; i++ {
			pattern := troubleshooting.ErrorPattern{
				ID:          fmt.Sprintf("pattern_%d", i),
				Pattern:     fmt.Sprintf("PATTERN_%d", i),
				Title:       fmt.Sprintf("Pattern %d", i),
				Description: fmt.Sprintf("Description for pattern %d", i),
				Frequency:   i + 1,
				Severity:    troubleshooting.SeverityLow,
				Category:    "Test",
			}
			largeGuide.ErrorPatterns = append(largeGuide.ErrorPatterns, pattern)
		}

		content := generateTroubleshootingWikiContent(largeGuide)
		if len(content) == 0 {
			t.Error("Large guide should generate content")
		}

		// Content should include references to many patterns
		if !strings.Contains(content, "Pattern 50") {
			t.Error("Large guide should include generated patterns")
		}
	})

	t.Run("special characters in content", func(t *testing.T) {
		specialGuide := createMockTroubleshootingGuide()
		specialGuide.ProjectName = "test/repo-with-特殊文字"

		// Add pattern with special characters
		specialGuide.ErrorPatterns[0].Title = "Error with émojis 🚨 and unicode ñ"
		specialGuide.ErrorPatterns[0].Description = "This contains \"quotes\" and 'apostrophes' and <brackets>"

		content := generateTroubleshootingWikiContent(specialGuide)

		// Should handle special characters gracefully
		if !strings.Contains(content, "特殊文字") {
			t.Error("Should handle Unicode characters in project name")
		}

		if !strings.Contains(content, "émojis 🚨") {
			t.Error("Should handle emojis and accented characters")
		}
	})
}

// Benchmark tests for performance analysis
func BenchmarkGenerateTroubleshootingWikiContent(b *testing.B) {
	mockGuide := createMockTroubleshootingGuide()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = generateTroubleshootingWikiContent(mockGuide)
	}
}

func BenchmarkSaveTroubleshootingJSON(b *testing.B) {
	mockGuide := createMockTroubleshootingGuide()
	tempDir, _ := os.MkdirTemp("", "bench_*")
	defer os.RemoveAll(tempDir)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		filename := filepath.Join(tempDir, fmt.Sprintf("bench_%d.json", i))
		_ = saveTroubleshootingJSON(mockGuide, filename)
	}
}

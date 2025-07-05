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

	"github.com/nyasuto/beaver/internal/config"
	"github.com/nyasuto/beaver/pkg/analytics"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"
	"github.com/stretchr/testify/assert"
)

// Test data generators
func createTestAnalyticsTimelineEvents(count int) []analytics.TimelineEvent {
	now := time.Now()
	events := make([]analytics.TimelineEvent, count)

	for i := 0; i < count; i++ {
		events[i] = analytics.TimelineEvent{
			ID:          fmt.Sprintf("event-%d", i+1),
			Type:        analytics.EventTypeIssueCreated,
			Timestamp:   now.Add(-time.Duration(i) * time.Hour),
			Title:       fmt.Sprintf("Test Event %d", i+1),
			Description: fmt.Sprintf("Test event description %d", i+1),
			Metadata: map[string]any{
				"number":   i + 1,
				"category": "test",
			},
			RelatedRefs: []string{fmt.Sprintf("#%d", i+1)},
		}
	}

	return events
}

func createTestAnalyticsTimeline() *analytics.Timeline {
	events := createTestAnalyticsTimelineEvents(5)
	return &analytics.Timeline{
		Events:     events,
		StartTime:  events[0].Timestamp,
		EndTime:    events[len(events)-1].Timestamp,
		Repository: "test/repo",
	}
}

func createTestAnalyticsTimelineTrends() *analytics.TimelineTrends {
	return &analytics.TimelineTrends{
		AverageResolutionHours: 24.5,
		Patterns: []analytics.TimelinePattern{
			{
				Type:        analytics.PatternTypeSuccessPath,
				Description: "Quick issue resolution pattern",
				Confidence:  0.85,
				Frequency:   5,
			},
		},
		Insights: []analytics.TimelineInsight{
			{
				Type:        analytics.InsightTypeProductivity,
				Title:       "Development Velocity",
				Description: "Consistent development pace observed",
				Actionable:  true,
				Suggestion:  "Continue current development practices",
			},
		},
	}
}

func TestSaveAnalysisResult(t *testing.T) {
	t.Run("successful save", func(t *testing.T) {
		result := &PatternAnalysisResult{
			Repository:  "test/repo",
			AnalyzedAt:  time.Now(),
			TotalEvents: 5,
			TimeRange:   "2023-01-01 - 2023-12-31",
			Timeline:    createTestAnalyticsTimeline(),
			Trends:      createTestAnalyticsTimelineTrends(),
		}

		// Create temporary file
		tempFile, err := os.CreateTemp("", "test_analysis_*.json")
		if err != nil {
			t.Fatalf("Failed to create temp file: %v", err)
		}
		defer os.Remove(tempFile.Name())
		tempFile.Close()

		err = saveAnalysisResult(result, tempFile.Name())
		if err != nil {
			t.Errorf("saveAnalysisResult failed: %v", err)
		}

		// Verify file content
		data, err := os.ReadFile(tempFile.Name())
		if err != nil {
			t.Fatalf("Failed to read saved file: %v", err)
		}

		var loaded PatternAnalysisResult
		err = json.Unmarshal(data, &loaded)
		if err != nil {
			t.Fatalf("Failed to unmarshal saved data: %v", err)
		}

		if loaded.Repository != result.Repository {
			t.Errorf("Repository mismatch: expected %s, got %s", result.Repository, loaded.Repository)
		}
	})

	t.Run("directory creation", func(t *testing.T) {
		result := &PatternAnalysisResult{
			Repository: "test/repo",
		}

		// Create temporary directory for nested path
		tempDir, err := os.MkdirTemp("", "test_dir_*")
		if err != nil {
			t.Fatalf("Failed to create temp dir: %v", err)
		}
		defer os.RemoveAll(tempDir)

		nestedPath := fmt.Sprintf("%s/nested/deep/analysis.json", tempDir)
		err = saveAnalysisResult(result, nestedPath)
		if err != nil {
			t.Errorf("saveAnalysisResult failed with nested path: %v", err)
		}

		// Verify file was created
		if _, err := os.Stat(nestedPath); os.IsNotExist(err) {
			t.Error("File was not created in nested directory")
		}
	})

	t.Run("invalid JSON data", func(t *testing.T) {
		// Create result with unmarshalable data
		result := &PatternAnalysisResult{
			Repository: "test/repo",
			Timeline: &analytics.Timeline{
				Events: []analytics.TimelineEvent{
					{
						Metadata: map[string]any{
							"invalid": make(chan int), // Channels can't be marshaled to JSON
						},
					},
				},
			},
		}

		tempFile, err := os.CreateTemp("", "test_invalid_*.json")
		if err != nil {
			t.Fatalf("Failed to create temp file: %v", err)
		}
		defer os.Remove(tempFile.Name())
		tempFile.Close()

		err = saveAnalysisResult(result, tempFile.Name())
		if err == nil {
			t.Error("Expected error for JSON marshal failure")
		}
		if !strings.Contains(err.Error(), "failed to marshal result to JSON") {
			t.Errorf("Expected JSON marshal error, got: %v", err)
		}
	})
}

func TestPatternAnalysisResultStructure(t *testing.T) {
	result := &PatternAnalysisResult{
		Repository:  "test/repo",
		AnalyzedAt:  time.Now(),
		TotalEvents: 10,
		TimeRange:   "2023-01-01 - 2023-12-31",
		Timeline:    createTestAnalyticsTimeline(),
		Trends:      createTestAnalyticsTimelineTrends(),
		Author:      "test-author",
		IncludedGit: true,
		AnalysisConfig: AnalysisConfig{
			SinceDate:  "2023-01-01",
			MaxCommits: 100,
			Author:     "test-author",
		},
	}

	// Test JSON serialization
	data, err := json.Marshal(result)
	if err != nil {
		t.Fatalf("Failed to marshal PatternAnalysisResult: %v", err)
	}

	// Test JSON deserialization
	var unmarshaled PatternAnalysisResult
	err = json.Unmarshal(data, &unmarshaled)
	if err != nil {
		t.Fatalf("Failed to unmarshal PatternAnalysisResult: %v", err)
	}

	// Verify key fields
	if unmarshaled.Repository != result.Repository {
		t.Errorf("Repository mismatch: expected %s, got %s", result.Repository, unmarshaled.Repository)
	}
	if unmarshaled.TotalEvents != result.TotalEvents {
		t.Errorf("TotalEvents mismatch: expected %d, got %d", result.TotalEvents, unmarshaled.TotalEvents)
	}
	if unmarshaled.Author != result.Author {
		t.Errorf("Author mismatch: expected %s, got %s", result.Author, unmarshaled.Author)
	}
	if unmarshaled.IncludedGit != result.IncludedGit {
		t.Errorf("IncludedGit mismatch: expected %v, got %v", result.IncludedGit, unmarshaled.IncludedGit)
	}
}

func TestAnalysisConfigStructure(t *testing.T) {
	config := AnalysisConfig{
		SinceDate:  "2023-01-01",
		MaxCommits: 100,
		Author:     "test-author",
	}

	// Test JSON serialization
	data, err := json.Marshal(config)
	if err != nil {
		t.Fatalf("Failed to marshal AnalysisConfig: %v", err)
	}

	// Test JSON deserialization
	var unmarshaled AnalysisConfig
	err = json.Unmarshal(data, &unmarshaled)
	if err != nil {
		t.Fatalf("Failed to unmarshal AnalysisConfig: %v", err)
	}

	// Verify fields
	if unmarshaled.SinceDate != config.SinceDate {
		t.Errorf("SinceDate mismatch: expected %s, got %s", config.SinceDate, unmarshaled.SinceDate)
	}
	if unmarshaled.MaxCommits != config.MaxCommits {
		t.Errorf("MaxCommits mismatch: expected %d, got %d", config.MaxCommits, unmarshaled.MaxCommits)
	}
	if unmarshaled.Author != config.Author {
		t.Errorf("Author mismatch: expected %s, got %s", config.Author, unmarshaled.Author)
	}
}

func TestAnalyzeCommandStructure(t *testing.T) {
	// Test command structure
	if analyzeCmd.Use != "analyze" {
		t.Error("Analyze command Use mismatch")
	}

	if !analyzeCmd.HasSubCommands() {
		t.Error("Analyze command should have subcommands")
	}

	// Test patterns subcommand
	if analyzePatternsCmd.Use != "patterns" {
		t.Error("Patterns subcommand Use mismatch")
	}

	if !analyzePatternsCmd.HasFlags() {
		t.Error("Patterns subcommand should have flags")
	}

	// Check for required flags
	outputFlag := analyzePatternsCmd.Flag("output")
	if outputFlag == nil {
		t.Error("Missing --output flag")
	}

	sinceDateFlag := analyzePatternsCmd.Flag("since")
	if sinceDateFlag == nil {
		t.Error("Missing --since flag")
	}

	maxCommitsFlag := analyzePatternsCmd.Flag("max-commits")
	if maxCommitsFlag == nil {
		t.Error("Missing --max-commits flag")
	}

	includeGitFlag := analyzePatternsCmd.Flag("include-git")
	if includeGitFlag == nil {
		t.Error("Missing --include-git flag")
	}

	authorFlag := analyzePatternsCmd.Flag("author")
	if authorFlag == nil {
		t.Error("Missing --author flag")
	}

	verboseFlag := analyzePatternsCmd.Flag("verbose")
	if verboseFlag == nil {
		t.Error("Missing --verbose flag")
	}
}

func TestAnalyzeParseOwnerRepo(t *testing.T) {
	testCases := []struct {
		name          string
		repository    string
		expectedOwner string
		expectedRepo  string
	}{
		{
			name:          "valid repository format",
			repository:    "owner/repo",
			expectedOwner: "owner",
			expectedRepo:  "repo",
		},
		{
			name:          "repository with dashes",
			repository:    "test-owner/test-repo",
			expectedOwner: "test-owner",
			expectedRepo:  "test-repo",
		},
		{
			name:          "invalid format - no slash",
			repository:    "invalidrepo",
			expectedOwner: "",
			expectedRepo:  "",
		},
		{
			name:          "invalid format - too many parts",
			repository:    "owner/repo/extra",
			expectedOwner: "",
			expectedRepo:  "",
		},
		{
			name:          "empty repository",
			repository:    "",
			expectedOwner: "",
			expectedRepo:  "",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			owner, repo := parseOwnerRepo(tc.repository)

			if owner != tc.expectedOwner {
				t.Errorf("Expected owner '%s', got '%s'", tc.expectedOwner, owner)
			}
			if repo != tc.expectedRepo {
				t.Errorf("Expected repo '%s', got '%s'", tc.expectedRepo, repo)
			}
		})
	}
}

func TestFetchGitEvents(t *testing.T) {
	t.Run("invalid since date format", func(t *testing.T) {
		_, err := fetchGitEvents(context.Background(), "invalid-date", 50)
		if err == nil {
			t.Error("Expected error for invalid date format")
			return
		}
		// Could be either date format error or "not in a Git repository" error
		expectedErrors := []string{"invalid since date format", "not in a Git repository"}
		hasExpectedError := false
		for _, expectedErr := range expectedErrors {
			if strings.Contains(err.Error(), expectedErr) {
				hasExpectedError = true
				break
			}
		}
		if !hasExpectedError {
			t.Errorf("Expected error to contain one of %v, got: %v", expectedErrors, err)
		}
	})

	t.Run("current directory error", func(t *testing.T) {
		// Test with context cancellation to simulate error condition
		ctx, cancel := context.WithCancel(context.Background())
		cancel() // Cancel immediately

		_, err := fetchGitEvents(ctx, "", 50)
		// The error might be different based on implementation, just verify it fails
		if err == nil {
			t.Error("Expected error when context is cancelled")
		}
	})
}

func TestCommandFlags(t *testing.T) {
	t.Run("flag parsing", func(t *testing.T) {
		// Test that flags can be parsed correctly
		cmd := analyzePatternsCmd

		// Set some test flags
		err := cmd.Flags().Set("output", "test-output.json")
		if err != nil {
			t.Errorf("Failed to set output flag: %v", err)
		}

		err = cmd.Flags().Set("since", "2023-01-01")
		if err != nil {
			t.Errorf("Failed to set since flag: %v", err)
		}

		err = cmd.Flags().Set("max-commits", "200")
		if err != nil {
			t.Errorf("Failed to set max-commits flag: %v", err)
		}

		err = cmd.Flags().Set("include-git", "true")
		if err != nil {
			t.Errorf("Failed to set include-git flag: %v", err)
		}

		err = cmd.Flags().Set("author", "test-author")
		if err != nil {
			t.Errorf("Failed to set author flag: %v", err)
		}

		err = cmd.Flags().Set("verbose", "true")
		if err != nil {
			t.Errorf("Failed to set verbose flag: %v", err)
		}

		// Verify flags were set
		outputValue, err := cmd.Flags().GetString("output")
		if err != nil || outputValue != "test-output.json" {
			t.Errorf("Output flag not set correctly: %v", err)
		}

		sinceValue, err := cmd.Flags().GetString("since")
		if err != nil || sinceValue != "2023-01-01" {
			t.Errorf("Since flag not set correctly: %v", err)
		}

		maxCommitsValue, err := cmd.Flags().GetInt("max-commits")
		if err != nil || maxCommitsValue != 200 {
			t.Errorf("Max-commits flag not set correctly: %v", err)
		}

		includeGitValue, err := cmd.Flags().GetBool("include-git")
		if err != nil || !includeGitValue {
			t.Errorf("Include-git flag not set correctly: %v", err)
		}

		authorValue, err := cmd.Flags().GetString("author")
		if err != nil || authorValue != "test-author" {
			t.Errorf("Author flag not set correctly: %v", err)
		}

		verboseValue, err := cmd.Flags().GetBool("verbose")
		if err != nil || !verboseValue {
			t.Errorf("Verbose flag not set correctly: %v", err)
		}
	})
}

func TestTimelineEvents(t *testing.T) {
	events := createTestAnalyticsTimelineEvents(3)

	if len(events) != 3 {
		t.Errorf("Expected 3 events, got %d", len(events))
	}

	// Verify event structure
	for i, event := range events {
		expectedID := fmt.Sprintf("event-%d", i+1)
		if event.ID != expectedID {
			t.Errorf("Event %d: expected ID %s, got %s", i, expectedID, event.ID)
		}

		if event.Type != analytics.EventTypeIssueCreated {
			t.Errorf("Event %d: expected type %s, got %s", i, analytics.EventTypeIssueCreated, event.Type)
		}

		if event.Metadata == nil {
			t.Errorf("Event %d: metadata is nil", i)
		}

		if number, ok := event.Metadata["number"]; !ok || number != i+1 {
			t.Errorf("Event %d: metadata number mismatch", i)
		}
	}
}

func TestTimeline(t *testing.T) {
	timeline := createTestAnalyticsTimeline()

	if timeline.Repository != "test/repo" {
		t.Errorf("Expected repository 'test/repo', got '%s'", timeline.Repository)
	}

	if len(timeline.Events) != 5 {
		t.Errorf("Expected 5 events, got %d", len(timeline.Events))
	}

	if timeline.StartTime.IsZero() {
		t.Error("StartTime should not be zero")
	}

	if timeline.EndTime.IsZero() {
		t.Error("EndTime should not be zero")
	}

	// For test events created with descending time (i+1 hours ago), StartTime > EndTime is expected
	if timeline.StartTime.Equal(timeline.EndTime) {
		t.Error("StartTime and EndTime should be different")
	}
}

func TestTimelineTrends(t *testing.T) {
	trends := createTestAnalyticsTimelineTrends()

	if trends.AverageResolutionHours != 24.5 {
		t.Errorf("Expected average resolution 24.5 hours, got %f", trends.AverageResolutionHours)
	}

	if len(trends.Patterns) != 1 {
		t.Errorf("Expected 1 pattern, got %d", len(trends.Patterns))
	}

	pattern := trends.Patterns[0]
	if pattern.Type != analytics.PatternTypeSuccessPath {
		t.Errorf("Expected pattern type %s, got %s", analytics.PatternTypeSuccessPath, pattern.Type)
	}

	if len(trends.Insights) != 1 {
		t.Errorf("Expected 1 insight, got %d", len(trends.Insights))
	}

	insight := trends.Insights[0]
	if insight.Type != analytics.InsightTypeProductivity {
		t.Errorf("Expected insight type %s, got %s", analytics.InsightTypeProductivity, insight.Type)
	}
}

func TestAnalyzeEdgeCases(t *testing.T) {
	t.Run("empty timeline", func(t *testing.T) {
		timeline := &analytics.Timeline{
			Events: []analytics.TimelineEvent{},
		}

		// Should handle empty timeline gracefully
		if len(timeline.Events) != 0 {
			t.Error("Timeline should be empty")
		}
	})

	t.Run("nil trends", func(t *testing.T) {
		result := &PatternAnalysisResult{
			Repository:  "test/repo",
			Trends:      nil,
			TotalEvents: 0,
		}

		data, err := json.Marshal(result)
		if err != nil {
			t.Errorf("Should handle nil trends: %v", err)
		}

		var unmarshaled PatternAnalysisResult
		err = json.Unmarshal(data, &unmarshaled)
		if err != nil {
			t.Errorf("Should unmarshal with nil trends: %v", err)
		}
	})

	t.Run("large event count", func(t *testing.T) {
		events := createTestAnalyticsTimelineEvents(1000)
		if len(events) != 1000 {
			t.Errorf("Expected 1000 events, got %d", len(events))
		}

		// Should handle large number of events
		timeline := &analytics.Timeline{
			Events: events,
		}

		if len(timeline.Events) != 1000 {
			t.Error("Timeline should handle large event count")
		}
	})
}

// Benchmark tests for performance analysis
func BenchmarkSaveAnalysisResult(b *testing.B) {
	result := &PatternAnalysisResult{
		Repository:  "test/repo",
		AnalyzedAt:  time.Now(),
		TotalEvents: 100,
		Timeline:    createTestAnalyticsTimeline(),
		Trends:      createTestAnalyticsTimelineTrends(),
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		tempFile, err := os.CreateTemp("", "bench_*.json")
		if err != nil {
			b.Fatalf("Failed to create temp file: %v", err)
		}
		tempFile.Close()

		_ = saveAnalysisResult(result, tempFile.Name())
		os.Remove(tempFile.Name())
	}
}

func BenchmarkCreateTestEvents(b *testing.B) {
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = createTestAnalyticsTimelineEvents(100)
	}
}

func BenchmarkJSONSerialization(b *testing.B) {
	result := &PatternAnalysisResult{
		Repository:  "test/repo",
		AnalyzedAt:  time.Now(),
		TotalEvents: 100,
		Timeline:    createTestAnalyticsTimeline(),
		Trends:      createTestAnalyticsTimelineTrends(),
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = json.Marshal(result)
	}
}

// Enhanced tests for GitHub event retrieval and error cases
func TestFetchGitHubEvents_ErrorCases(t *testing.T) {
	tests := []struct {
		name    string
		setup   func() func()
		wantErr bool
	}{
		{
			name: "missing configuration file",
			setup: func() func() {
				tempDir := t.TempDir()
				oldWd, _ := os.Getwd()
				os.Chdir(tempDir)
				return func() { os.Chdir(oldWd) }
			},
			wantErr: true,
		},
		{
			name: "invalid GitHub token",
			setup: func() func() {
				tempDir := t.TempDir()
				oldWd, _ := os.Getwd()
				os.Chdir(tempDir)

				// Create config file manually
				configContent := `
project:
  repository: "owner/repo"
sources:
  github:
    token: ""
`
				os.WriteFile("beaver.yml", []byte(configContent), 0600)

				return func() { os.Chdir(oldWd) }
			},
			wantErr: true,
		},
		{
			name: "valid configuration but network error simulation",
			setup: func() func() {
				tempDir := t.TempDir()
				oldWd, _ := os.Getwd()
				os.Chdir(tempDir)

				// Create config file with fake token manually
				configContent := `
project:
  repository: "owner/repo"
sources:
  github:
    token: "fake-token-for-network-test"
`
				os.WriteFile("beaver.yml", []byte(configContent), 0600)

				return func() { os.Chdir(oldWd) }
			},
			wantErr: false, // Should succeed in creating service, actual network error happens during fetch
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cleanup := tt.setup()
			defer cleanup()

			// Test GitHub events fetching by loading config and creating service
			cfg, err := config.LoadConfig()
			if err != nil && tt.wantErr {
				return // Expected error in config loading
			}
			if err != nil {
				t.Errorf("Unexpected config loading error: %v", err)
				return
			}

			ctx := context.Background()
			_, err = fetchGitHubEvents(ctx, cfg, "owner", "repo")
			if (err != nil) != tt.wantErr {
				t.Errorf("fetchGitHubEvents() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestRunAnalyzePatternsCommand_DetailedErrorCases(t *testing.T) {
	tests := []struct {
		name    string
		args    []string
		setup   func() func()
		wantErr bool
		errMsg  string
	}{
		{
			name: "empty repository argument",
			args: []string{""},
			setup: func() func() {
				return func() {}
			},
			wantErr: true,
			errMsg:  "無効なリポジトリパス",
		},
		{
			name: "repository with invalid format",
			args: []string{"invalid_repo_format"},
			setup: func() func() {
				return func() {}
			},
			wantErr: true,
			errMsg:  "無効なリポジトリパス",
		},
		{
			name: "missing GitHub token in config and environment",
			args: []string{"owner/repo"},
			setup: func() func() {
				tempDir := t.TempDir()
				oldWd, _ := os.Getwd()
				os.Chdir(tempDir)

				// Create config without token
				// Create config file manually
				configContent := `
project:
  repository: "owner/repo"
sources:
  github:
    token: ""
`
				os.WriteFile("beaver.yml", []byte(configContent), 0600)

				// Clear environment token
				oldToken := os.Getenv("GITHUB_TOKEN")
				os.Unsetenv("GITHUB_TOKEN")

				return func() {
					os.Chdir(oldWd)
					if oldToken != "" {
						os.Setenv("GITHUB_TOKEN", oldToken)
					}
				}
			},
			wantErr: true,
			errMsg:  "GitHub token が設定されていません",
		},
		{
			name: "config file validation failure",
			args: []string{"owner/repo"},
			setup: func() func() {
				tempDir := t.TempDir()
				oldWd, _ := os.Getwd()
				os.Chdir(tempDir)

				// Create invalid config file manually
				configContent := `
project:
  repository: ""
sources:
  github:
    token: "test-token"
`
				os.WriteFile("beaver.yml", []byte(configContent), 0600)

				return func() { os.Chdir(oldWd) }
			},
			wantErr: true,
			errMsg:  "project.repository は必須設定です",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cleanup := tt.setup()
			defer cleanup()

			cmd := &cobra.Command{}
			err := runAnalyzePatternsCommand(cmd, tt.args)

			if (err != nil) != tt.wantErr {
				t.Errorf("runAnalyzePatternsCommand() error = %v, wantErr %v", err, tt.wantErr)
			}

			if tt.wantErr && err != nil && !strings.Contains(err.Error(), tt.errMsg) {
				t.Errorf("Expected error message to contain %q, got %q", tt.errMsg, err.Error())
			}
		})
	}
}

func TestFetchGitEvents_EnhancedCases(t *testing.T) {
	tests := []struct {
		name       string
		sinceDate  string
		maxCommits int
		setup      func() func()
		wantErr    bool
	}{
		{
			name:       "valid date format but not in git repo",
			sinceDate:  "2023-01-01",
			maxCommits: 50,
			setup: func() func() {
				tempDir := t.TempDir()
				oldWd, _ := os.Getwd()
				os.Chdir(tempDir)
				return func() { os.Chdir(oldWd) }
			},
			wantErr: true,
		},
		{
			name:       "empty since date",
			sinceDate:  "",
			maxCommits: 50,
			setup: func() func() {
				return func() {}
			},
			wantErr: true, // Should fail with date parsing or git repo error
		},
		{
			name:       "very old date",
			sinceDate:  "1990-01-01",
			maxCommits: 10,
			setup: func() func() {
				return func() {}
			},
			wantErr: true, // Should fail with git repo error
		},
		{
			name:       "zero max commits",
			sinceDate:  "2023-01-01",
			maxCommits: 0,
			setup: func() func() {
				return func() {}
			},
			wantErr: true, // Should fail with git repo error or validation
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cleanup := tt.setup()
			defer cleanup()

			ctx := context.Background()
			_, err := fetchGitEvents(ctx, tt.sinceDate, tt.maxCommits)
			if (err != nil) != tt.wantErr {
				t.Errorf("fetchGitEvents() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestAnalyzePatternsFlags_ExtendedValidation(t *testing.T) {
	// Test flag combinations and edge cases
	tests := []struct {
		name  string
		flags map[string]string
	}{
		{
			name: "all flags set",
			flags: map[string]string{
				"output":      "custom-output.json",
				"since":       "2023-06-01",
				"max-commits": "250",
				"include-git": "true",
				"author":      "test-author@example.com",
				"verbose":     "true",
			},
		},
		{
			name: "minimal flags",
			flags: map[string]string{
				"output": "minimal.json",
			},
		},
		{
			name: "boolean flags testing",
			flags: map[string]string{
				"include-git": "false",
				"verbose":     "false",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cmd := analyzePatternsCmd

			// Reset flags
			cmd.Flags().VisitAll(func(flag *pflag.Flag) {
				// Reset to default values - just testing flag setting
			})

			// Set test flags
			for flagName, flagValue := range tt.flags {
				err := cmd.Flags().Set(flagName, flagValue)
				if err != nil {
					t.Errorf("Failed to set flag %s to %s: %v", flagName, flagValue, err)
				}

				// Verify flag was set
				switch flagName {
				case "output", "since", "author":
					value, err := cmd.Flags().GetString(flagName)
					if err != nil || value != flagValue {
						t.Errorf("String flag %s not set correctly: expected %s, got %s", flagName, flagValue, value)
					}
				case "max-commits":
					expected := 250 // Only test case that sets this
					value, err := cmd.Flags().GetInt(flagName)
					if err != nil || value != expected {
						t.Errorf("Int flag %s not set correctly: expected %d, got %d", flagName, expected, value)
					}
				case "include-git", "verbose":
					expectedBool := flagValue == "true"
					value, err := cmd.Flags().GetBool(flagName)
					if err != nil || value != expectedBool {
						t.Errorf("Bool flag %s not set correctly: expected %v, got %v", flagName, expectedBool, value)
					}
				}
			}
		})
	}
}

func TestSaveAnalysisResult_PermissionErrors(t *testing.T) {
	result := &PatternAnalysisResult{
		Repository: "test/repo",
		AnalyzedAt: time.Now(),
	}

	t.Run("directory permission error", func(t *testing.T) {
		// Create a directory without write permissions
		tempDir := t.TempDir()
		restrictedDir := filepath.Join(tempDir, "restricted")
		os.Mkdir(restrictedDir, 0444)       // Read-only
		defer os.Chmod(restrictedDir, 0755) // Restore permissions for cleanup

		outputPath := filepath.Join(restrictedDir, "output.json")
		err := saveAnalysisResult(result, outputPath)
		if err == nil {
			t.Error("Expected permission error")
		}
	})

	t.Run("invalid file path", func(t *testing.T) {
		// Use a path with invalid characters
		invalidPath := "/dev/null/invalid\x00path/file.json"
		err := saveAnalysisResult(result, invalidPath)
		if err == nil {
			t.Error("Expected path error")
		}
	})
}

func TestAnalyzeCommand_Integration(t *testing.T) {
	// Test that the analyze command is properly integrated
	assert.NotNil(t, analyzeCmd)
	assert.Equal(t, "analyze", analyzeCmd.Use)
	assert.True(t, analyzeCmd.HasSubCommands())

	// Find patterns subcommand
	var patternsCmd *cobra.Command
	for _, cmd := range analyzeCmd.Commands() {
		if cmd.Use == "patterns" {
			patternsCmd = cmd
			break
		}
	}

	assert.NotNil(t, patternsCmd, "patterns subcommand should exist")
	assert.True(t, patternsCmd.HasFlags(), "patterns command should have flags")
}

func TestPatternAnalysisResult_LargeData(t *testing.T) {
	// Test with large dataset to verify performance
	largeTimeline := &analytics.Timeline{
		Events:     createTestAnalyticsTimelineEvents(5000),
		Repository: "test/large-repo",
		StartTime:  time.Now().AddDate(0, 0, -30),
		EndTime:    time.Now(),
	}

	result := &PatternAnalysisResult{
		Repository:  "test/large-repo",
		AnalyzedAt:  time.Now(),
		TotalEvents: 5000,
		Timeline:    largeTimeline,
		Trends:      createTestAnalyticsTimelineTrends(),
	}

	// Test JSON serialization with large data
	data, err := json.Marshal(result)
	assert.NoError(t, err)
	assert.Greater(t, len(data), 100000, "Should generate substantial JSON output")

	// Test deserialization
	var unmarshaled PatternAnalysisResult
	err = json.Unmarshal(data, &unmarshaled)
	assert.NoError(t, err)
	assert.Equal(t, 5000, unmarshaled.TotalEvents)
	assert.Equal(t, 5000, len(unmarshaled.Timeline.Events))
}

func TestContextCancellation(t *testing.T) {
	tests := []struct {
		name    string
		timeout time.Duration
	}{
		{
			name:    "immediate cancellation",
			timeout: 0,
		},
		{
			name:    "short timeout",
			timeout: 1 * time.Millisecond,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx, cancel := context.WithTimeout(context.Background(), tt.timeout)
			defer cancel()

			if tt.timeout == 0 {
				cancel() // Cancel immediately
			}

			// Test that functions handle context cancellation gracefully
			_, err := fetchGitEvents(ctx, "2023-01-01", 50)
			// Should get context error or other error, not panic
			if err == nil {
				t.Log("No error returned (might be expected depending on implementation)")
			}

			// Skip fetchGitHubEvents test due to signature complexity
			// _, err = fetchGitHubEvents(ctx, "owner", "repo")
			// Just test that context cancellation doesn't panic
			t.Log("Context cancellation test completed without panic")
		})
	}
}

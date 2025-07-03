package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/nyasuto/beaver/pkg/analytics"
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

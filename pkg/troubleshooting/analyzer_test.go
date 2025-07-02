package troubleshooting

import (
	"context"
	"errors"
	"log/slog"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/nyasuto/beaver/internal/models"
)

// TestMain sets up the test environment
func TestMain(m *testing.M) {
	// Set log level to WARN for tests to reduce noise
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{
		Level: slog.LevelWarn,
	})))

	// Run tests
	os.Exit(m.Run())
}

// MockAIService for testing AI integration
type MockAIService struct {
	Result *AITroubleshootingResult
	Error  error
}

func (m *MockAIService) AnalyzeTroubleshootingPatterns(ctx context.Context, issues []models.Issue) (*AITroubleshootingResult, error) {
	if m.Error != nil {
		return nil, m.Error
	}
	return m.Result, nil
}

func TestNewAnalyzer(t *testing.T) {
	t.Run("with AI service", func(t *testing.T) {
		aiService := &MockAIService{}
		analyzer := NewAnalyzer(aiService)

		if analyzer == nil {
			t.Fatal("NewAnalyzer returned nil")
		}

		if analyzer.aiService != aiService {
			t.Error("AI service not properly set")
		}
	})

	t.Run("with nil AI service", func(t *testing.T) {
		analyzer := NewAnalyzer(nil)

		if analyzer == nil {
			t.Fatal("NewAnalyzer returned nil")
		}

		if analyzer.aiService != nil {
			t.Error("AI service should be nil")
		}
	})
}

func TestAnalyzeTroubleshooting(t *testing.T) {
	now := time.Now()
	closedTime := now.Add(time.Hour)

	testIssues := []models.Issue{
		{
			ID:        1,
			Number:    1,
			Title:     "API error in authentication system",
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
			Title:     "Feature request: Add dark mode",
			Body:      "Users want dark mode support in the UI",
			State:     "open",
			CreatedAt: now,
			UpdatedAt: now.Add(10 * time.Minute),
			Labels:    []models.Label{{Name: "feature"}, {Name: "ui"}},
		},
		{
			ID:        4,
			Number:    4,
			Title:     "Database timeout error",
			Body:      "Query timeout after 30 seconds when accessing user table. Solved by adding proper indexing.",
			State:     "closed",
			CreatedAt: now,
			UpdatedAt: now.Add(45 * time.Minute),
			ClosedAt:  &closedTime,
			Labels:    []models.Label{{Name: "bug"}, {Name: "database"}, {Name: "solved"}},
		},
	}

	t.Run("successful analysis without AI", func(t *testing.T) {
		analyzer := NewAnalyzer(nil)
		guide, err := analyzer.AnalyzeTroubleshooting(context.Background(), testIssues, "test/project")

		if err != nil {
			t.Fatalf("AnalyzeTroubleshooting failed: %v", err)
		}

		if guide == nil {
			t.Fatal("Guide is nil")
		}

		// Verify basic structure
		if guide.ProjectName != "test/project" {
			t.Errorf("Expected project name 'test/project', got '%s'", guide.ProjectName)
		}

		if guide.TotalIssues != 4 {
			t.Errorf("Expected 4 total issues, got %d", guide.TotalIssues)
		}

		if guide.SolvedIssues != 2 {
			t.Errorf("Expected 2 solved issues, got %d", guide.SolvedIssues)
		}

		// Verify error patterns were detected
		if len(guide.ErrorPatterns) == 0 {
			t.Error("Expected error patterns to be detected")
		}

		// Verify solutions were extracted
		if len(guide.Solutions) == 0 {
			t.Error("Expected solutions to be extracted from solved issues")
		}

		// Verify statistics
		if guide.Statistics.TotalPatterns != len(guide.ErrorPatterns) {
			t.Error("Statistics total patterns mismatch")
		}

		if guide.Statistics.TotalSolutions != len(guide.Solutions) {
			t.Error("Statistics total solutions mismatch")
		}

		// Should have no AI insights
		if guide.AIInsights != nil {
			t.Error("Expected no AI insights when AI service is nil")
		}
	})

	t.Run("successful analysis with AI", func(t *testing.T) {
		mockAI := &MockAIService{
			Result: &AITroubleshootingResult{
				AnalyzedAt:     time.Now(),
				ProcessingTime: 1.5,
				PatternsDetected: []AIDetectedPattern{
					{
						PatternID:   "ai_pattern_1",
						Description: "Authentication failure pattern",
						Confidence:  0.85,
						Frequency:   2,
						Severity:    "high",
						Category:    "Security",
					},
				},
				Confidence:      0.82,
				Recommendations: []string{"Implement proper error handling", "Add retry mechanisms"},
			},
		}

		analyzer := NewAnalyzer(mockAI)
		guide, err := analyzer.AnalyzeTroubleshooting(context.Background(), testIssues, "test/project")

		if err != nil {
			t.Fatalf("AnalyzeTroubleshooting failed: %v", err)
		}

		if guide.AIInsights == nil {
			t.Error("Expected AI insights to be present")
		}

		if guide.AIInsights.Confidence != 0.82 {
			t.Errorf("Expected AI confidence 0.82, got %f", guide.AIInsights.Confidence)
		}

		if len(guide.AIInsights.PatternsDetected) != 1 {
			t.Errorf("Expected 1 AI detected pattern, got %d", len(guide.AIInsights.PatternsDetected))
		}
	})

	t.Run("AI service error handling", func(t *testing.T) {
		mockAI := &MockAIService{
			Error: errors.New("AI service unavailable"),
		}

		analyzer := NewAnalyzer(mockAI)
		guide, err := analyzer.AnalyzeTroubleshooting(context.Background(), testIssues, "test/project")

		// Should still succeed without AI insights
		if err != nil {
			t.Fatalf("AnalyzeTroubleshooting should not fail when AI service errors: %v", err)
		}

		if guide.AIInsights != nil {
			t.Error("Expected no AI insights when AI service fails")
		}
	})

	t.Run("empty issues list", func(t *testing.T) {
		analyzer := NewAnalyzer(nil)
		guide, err := analyzer.AnalyzeTroubleshooting(context.Background(), []models.Issue{}, "empty/project")

		if err != nil {
			t.Fatalf("AnalyzeTroubleshooting failed with empty issues: %v", err)
		}

		if guide.TotalIssues != 0 {
			t.Errorf("Expected 0 total issues, got %d", guide.TotalIssues)
		}

		if len(guide.ErrorPatterns) != 0 {
			t.Errorf("Expected 0 error patterns, got %d", len(guide.ErrorPatterns))
		}
	})
}

func TestFilterSolvedIssues(t *testing.T) {
	analyzer := NewAnalyzer(nil)
	now := time.Now()
	closedTime := now.Add(time.Hour)

	issues := []models.Issue{
		{Number: 1, State: "open"},
		{Number: 2, State: "closed", ClosedAt: &closedTime},
		{Number: 3, State: "open"},
		{Number: 4, State: "closed", ClosedAt: &closedTime},
	}

	solved := analyzer.filterSolvedIssues(issues)

	if len(solved) != 2 {
		t.Errorf("Expected 2 solved issues, got %d", len(solved))
	}

	for _, issue := range solved {
		if issue.State != "closed" {
			t.Errorf("Expected closed issue, got state %s", issue.State)
		}
	}
}

func TestFilterErrorIssues(t *testing.T) {
	analyzer := NewAnalyzer(nil)

	issues := []models.Issue{
		{Number: 1, Title: "API error occurred", Body: "System failure"},
		{Number: 2, Title: "Feature request", Body: "Add new functionality"},
		{Number: 3, Title: "Bug in authentication", Body: "Login problem"},
		{Number: 4, Title: "Documentation update", Body: "Update README"},
		{Number: 5, Title: "システムエラー", Body: "データベース問題"}, // Japanese error
	}

	errorIssues := analyzer.filterErrorIssues(issues)

	if len(errorIssues) != 3 {
		t.Errorf("Expected 3 error issues, got %d", len(errorIssues))
	}

	expectedNumbers := map[int]bool{1: true, 3: true, 5: true}
	for _, issue := range errorIssues {
		if !expectedNumbers[issue.Number] {
			t.Errorf("Unexpected error issue number: %d", issue.Number)
		}
	}
}

func TestExtractErrorPatterns(t *testing.T) {
	analyzer := NewAnalyzer(nil)
	now := time.Now()

	issues := []models.Issue{
		{
			Number:    1,
			Title:     "API authentication error",
			Body:      "HTTP 401 error when calling API endpoint",
			UpdatedAt: now,
		},
		{
			Number:    2,
			Title:     "Configuration file missing",
			Body:      "Config file not found error on startup",
			UpdatedAt: now,
		},
		{
			Number:    3,
			Title:     "Another API error",
			Body:      "API request failed with timeout",
			UpdatedAt: now.Add(time.Hour),
		},
	}

	patterns := analyzer.extractErrorPatterns(issues)

	if len(patterns) == 0 {
		t.Error("Expected error patterns to be extracted")
	}

	// Check for API error pattern
	foundAPIPattern := false
	foundConfigPattern := false

	for _, pattern := range patterns {
		switch pattern.Pattern {
		case "API_ERROR":
			foundAPIPattern = true
			if pattern.Frequency != 2 {
				t.Errorf("Expected API error frequency 2, got %d", pattern.Frequency)
			}
			if len(pattern.RelatedIssues) != 2 {
				t.Errorf("Expected 2 related issues for API error, got %d", len(pattern.RelatedIssues))
			}
		case "CONFIG_ERROR":
			foundConfigPattern = true
			if pattern.Frequency != 1 {
				t.Errorf("Expected config error frequency 1, got %d", pattern.Frequency)
			}
		}
	}

	if !foundAPIPattern {
		t.Error("Expected API_ERROR pattern to be detected")
	}

	if !foundConfigPattern {
		t.Error("Expected CONFIG_ERROR pattern to be detected")
	}
}

func TestIdentifyPatterns(t *testing.T) {
	analyzer := NewAnalyzer(nil)

	testCases := []struct {
		name            string
		issue           models.Issue
		expectedPattern string
	}{
		{
			name: "API error pattern",
			issue: models.Issue{
				Number: 1,
				Title:  "API request failed",
				Body:   "HTTP 500 error when calling user endpoint",
			},
			expectedPattern: "API_ERROR",
		},
		{
			name: "Authentication error pattern",
			issue: models.Issue{
				Number: 2,
				Title:  "Authentication failed",
				Body:   "Token expired error",
			},
			expectedPattern: "AUTH_ERROR",
		},
		{
			name: "Network error pattern",
			issue: models.Issue{
				Number: 3,
				Title:  "Connection timeout",
				Body:   "Network connection refused",
			},
			expectedPattern: "NETWORK_ERROR",
		},
		{
			name: "Database error pattern",
			issue: models.Issue{
				Number: 4,
				Title:  "Database query failed",
				Body:   "SQL query timeout after 30 seconds",
			},
			expectedPattern: "DATABASE_ERROR",
		},
		{
			name: "Configuration error pattern",
			issue: models.Issue{
				Number: 5,
				Title:  "Config file invalid",
				Body:   "Configuration setting missing",
			},
			expectedPattern: "CONFIG_ERROR",
		},
		{
			name: "Permission error pattern",
			issue: models.Issue{
				Number: 6,
				Title:  "Access denied error",
				Body:   "Permission denied to read file",
			},
			expectedPattern: "PERMISSION_ERROR",
		},
		{
			name: "Dependency error pattern",
			issue: models.Issue{
				Number: 7,
				Title:  "Package not found",
				Body:   "Dependency module missing",
			},
			expectedPattern: "DEPENDENCY_ERROR",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			patterns := analyzer.identifyPatterns(tc.issue)

			if len(patterns) == 0 {
				t.Errorf("Expected at least one pattern for %s", tc.name)
				return
			}

			found := false
			for _, pattern := range patterns {
				if pattern.Pattern == tc.expectedPattern {
					found = true
					break
				}
			}

			if !found {
				t.Errorf("Expected pattern %s not found for %s", tc.expectedPattern, tc.name)
			}
		})
	}
}

func TestExtractSolutions(t *testing.T) {
	analyzer := NewAnalyzer(nil)
	now := time.Now()

	issues := []models.Issue{
		{
			Number:    1,
			Title:     "Database connection issue",
			Body:      "Fixed by updating connection string configuration",
			State:     "closed",
			CreatedAt: now,
			Labels:    []models.Label{{Name: "bug"}, {Name: "solved"}},
		},
		{
			Number:    2,
			Title:     "API timeout problem",
			Body:      "Resolved by implementing retry mechanism",
			State:     "closed",
			CreatedAt: now,
			Labels:    []models.Label{{Name: "bug"}, {Name: "resolved"}},
		},
		{
			Number:    3,
			Title:     "Feature request",
			Body:      "Add new feature for better user experience",
			State:     "closed",
			CreatedAt: now,
		},
	}

	solutions := analyzer.extractSolutions(issues)

	// The function checks for solution keywords in the body, so we expect 2 solutions
	// (issues 1 and 2 have "Fixed" and "Resolved" keywords)
	expectedSolutions := 2
	if len(solutions) != expectedSolutions {
		t.Errorf("Expected %d solutions, got %d", expectedSolutions, len(solutions))
		// Debug: print what solutions were found
		for i, sol := range solutions {
			t.Logf("Solution %d: ID=%s, Title=%s", i, sol.ID, sol.Title)
		}
	}

	for _, solution := range solutions {
		if solution.ID == "" {
			t.Error("Solution ID should not be empty")
		}
		if solution.Title == "" {
			t.Error("Solution title should not be empty")
		}
		if len(solution.RelatedIssues) == 0 {
			t.Error("Solution should have related issues")
		}
	}
}

func TestCalculateSeverity(t *testing.T) {
	analyzer := NewAnalyzer(nil)

	testCases := []struct {
		frequency   int
		issueCount  int
		expectedSev Severity
		description string
	}{
		{15, 8, SeverityCritical, "high frequency and issue count"},
		{10, 3, SeverityCritical, "high frequency"},
		{3, 5, SeverityCritical, "high issue count"},
		{7, 4, SeverityHigh, "medium-high frequency and issue count"},
		{5, 3, SeverityHigh, "exact high threshold"},
		{3, 2, SeverityMedium, "medium frequency"},
		{2, 1, SeverityMedium, "exact medium threshold"},
		{1, 1, SeverityLow, "low frequency and issue count"},
	}

	for _, tc := range testCases {
		t.Run(tc.description, func(t *testing.T) {
			severity := analyzer.calculateSeverity(tc.frequency, tc.issueCount)
			if severity != tc.expectedSev {
				t.Errorf("Expected severity %v, got %v for frequency=%d, issueCount=%d",
					tc.expectedSev, severity, tc.frequency, tc.issueCount)
			}
		})
	}
}

func TestContainsKeywords(t *testing.T) {
	analyzer := NewAnalyzer(nil)

	testCases := []struct {
		text     string
		keywords []string
		expected bool
		name     string
	}{
		{
			text:     "This is an error message",
			keywords: []string{"error", "warning"},
			expected: true,
			name:     "contains keyword",
		},
		{
			text:     "Everything works fine",
			keywords: []string{"error", "failure"},
			expected: false,
			name:     "no keywords found",
		},
		{
			text:     "System FAILURE detected",
			keywords: []string{"failure", "crash"},
			expected: true,
			name:     "case insensitive match",
		},
		{
			text:     "エラーが発生しました",
			keywords: []string{"エラー", "問題"},
			expected: true,
			name:     "Japanese keyword match",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := analyzer.containsKeywords(tc.text, tc.keywords)
			if result != tc.expected {
				t.Errorf("Expected %v, got %v for text '%s' with keywords %v",
					tc.expected, result, tc.text, tc.keywords)
			}
		})
	}
}

func TestCalculateStatistics(t *testing.T) {
	analyzer := NewAnalyzer(nil)
	now := time.Now()
	closedTime := now.Add(2 * time.Hour)

	issues := []models.Issue{
		{
			Number:    1,
			State:     "closed",
			CreatedAt: now,
			ClosedAt:  &closedTime,
		},
		{
			Number:    2,
			State:     "open",
			CreatedAt: now,
		},
		{
			Number:    3,
			State:     "closed",
			CreatedAt: now,
			ClosedAt:  &closedTime,
		},
	}

	patterns := []ErrorPattern{
		{Category: "Security", Severity: SeverityCritical},
		{Category: "Security", Severity: SeverityHigh},
		{Category: "Configuration", Severity: SeverityMedium},
	}

	solutions := []Solution{
		{ID: "sol_1"},
		{ID: "sol_2"},
	}

	stats := analyzer.calculateStatistics(issues, patterns, solutions)

	if stats.TotalPatterns != 3 {
		t.Errorf("Expected 3 total patterns, got %d", stats.TotalPatterns)
	}

	if stats.TotalSolutions != 2 {
		t.Errorf("Expected 2 total solutions, got %d", stats.TotalSolutions)
	}

	if stats.CriticalPatterns != 1 {
		t.Errorf("Expected 1 critical pattern, got %d", stats.CriticalPatterns)
	}

	if stats.MostCommonCategory != "Security" {
		t.Errorf("Expected most common category 'Security', got '%s'", stats.MostCommonCategory)
	}

	// Check success rate calculation
	expectedSuccessRate := float64(2) / float64(3) * 100 // 2 closed out of 3 total
	if stats.SuccessRate != expectedSuccessRate {
		t.Errorf("Expected success rate %.2f, got %.2f", expectedSuccessRate, stats.SuccessRate)
	}

	// Check average resolve time (2 hours = 2.0)
	if stats.AverageResolveTime != 2.0 {
		t.Errorf("Expected average resolve time 2.0 hours, got %.2f", stats.AverageResolveTime)
	}
}

func TestEnumStringMethods(t *testing.T) {
	t.Run("Severity String", func(t *testing.T) {
		testCases := []struct {
			severity Severity
			expected string
		}{
			{SeverityLow, "low"},
			{SeverityMedium, "medium"},
			{SeverityHigh, "high"},
			{SeverityCritical, "critical"},
			{Severity(999), "unknown"},
		}

		for _, tc := range testCases {
			if tc.severity.String() != tc.expected {
				t.Errorf("Expected %s, got %s", tc.expected, tc.severity.String())
			}
		}
	})

	t.Run("Difficulty String", func(t *testing.T) {
		testCases := []struct {
			difficulty Difficulty
			expected   string
		}{
			{DifficultyEasy, "easy"},
			{DifficultyMedium, "medium"},
			{DifficultyHard, "hard"},
			{DifficultyExpert, "expert"},
			{Difficulty(999), "unknown"},
		}

		for _, tc := range testCases {
			if tc.difficulty.String() != tc.expected {
				t.Errorf("Expected %s, got %s", tc.expected, tc.difficulty.String())
			}
		}
	})

	t.Run("Priority String", func(t *testing.T) {
		testCases := []struct {
			priority Priority
			expected string
		}{
			{PriorityLow, "low"},
			{PriorityMedium, "medium"},
			{PriorityHigh, "high"},
			{PriorityCritical, "critical"},
			{Priority(999), "unknown"},
		}

		for _, tc := range testCases {
			if tc.priority.String() != tc.expected {
				t.Errorf("Expected %s, got %s", tc.expected, tc.priority.String())
			}
		}
	})
}

func TestHelperMethods(t *testing.T) {
	analyzer := NewAnalyzer(nil)

	t.Run("extractPatternTitle", func(t *testing.T) {
		testCases := []struct {
			patternName string
			expected    string
		}{
			{"API_ERROR", "API Communication Error"},
			{"CONFIG_ERROR", "Configuration Error"},
			{"AUTH_ERROR", "Authentication Error"},
			{"UNKNOWN_PATTERN", "Unknown Error Pattern"},
		}

		for _, tc := range testCases {
			result := analyzer.extractPatternTitle("", tc.patternName)
			if result != tc.expected {
				t.Errorf("Expected '%s', got '%s' for pattern %s", tc.expected, result, tc.patternName)
			}
		}
	})

	t.Run("categorizePattern", func(t *testing.T) {
		testCases := []struct {
			patternName string
			expected    string
		}{
			{"API_ERROR", "Integration"},
			{"CONFIG_ERROR", "Configuration"},
			{"AUTH_ERROR", "Security"},
			{"UNKNOWN_PATTERN", "General"},
		}

		for _, tc := range testCases {
			result := analyzer.categorizePattern(tc.patternName)
			if result != tc.expected {
				t.Errorf("Expected '%s', got '%s' for pattern %s", tc.expected, result, tc.patternName)
			}
		}
	})

	t.Run("extractSymptoms", func(t *testing.T) {
		text := "Application fails to start with connection refused error and timeout"
		symptoms := analyzer.extractSymptoms(text)

		expectedSymptoms := []string{"fails to start", "connection refused", "timeout"}
		if len(symptoms) != len(expectedSymptoms) {
			t.Errorf("Expected %d symptoms, got %d", len(expectedSymptoms), len(symptoms))
		}

		for _, expected := range expectedSymptoms {
			found := false
			for _, symptom := range symptoms {
				if symptom == expected {
					found = true
					break
				}
			}
			if !found {
				t.Errorf("Expected symptom '%s' not found", expected)
			}
		}
	})

	t.Run("extractCauses", func(t *testing.T) {
		issue := models.Issue{
			Title: "Network timeout error",
			Body:  "Configuration issue with network timeout and token problems",
		}

		causes := analyzer.extractCauses(issue.Title+" "+issue.Body, issue)

		if len(causes) == 0 {
			t.Error("Expected causes to be extracted")
		}

		// Should detect network, configuration, timeout, and token causes
		expectedCauses := []string{
			"Network connectivity issues",
			"Incorrect configuration settings",
			"Timeout or performance issues",
			"Authentication token problems",
		}

		for _, expected := range expectedCauses {
			found := false
			for _, cause := range causes {
				if cause == expected {
					found = true
					break
				}
			}
			if !found {
				t.Errorf("Expected cause '%s' not found in %v", expected, causes)
			}
		}
	})

	t.Run("extractTags", func(t *testing.T) {
		issue := models.Issue{
			Labels: []models.Label{
				{Name: "bug"},
				{Name: "security"},
				{Name: "high-priority"},
			},
		}

		tags := analyzer.extractTags(issue)

		if len(tags) != 3 {
			t.Errorf("Expected 3 tags, got %d", len(tags))
		}

		expectedTags := []string{"bug", "security", "high-priority"}
		for _, expected := range expectedTags {
			found := false
			for _, tag := range tags {
				if tag == expected {
					found = true
					break
				}
			}
			if !found {
				t.Errorf("Expected tag '%s' not found", expected)
			}
		}
	})
}

func TestEdgeCases(t *testing.T) {
	analyzer := NewAnalyzer(nil)

	t.Run("issue with empty title and body", func(t *testing.T) {
		issues := []models.Issue{
			{Number: 1, Title: "", Body: "", State: "open"},
		}
		guide, err := analyzer.AnalyzeTroubleshooting(context.Background(), issues, "test/project")
		if err != nil {
			t.Fatalf("Should handle empty issues: %v", err)
		}
		if guide.TotalIssues != 1 {
			t.Errorf("Expected 1 issue, got %d", guide.TotalIssues)
		}
	})

	t.Run("issue with very long content", func(t *testing.T) {
		longContent := strings.Repeat("This is a very long error message with many details. ", 100)
		issues := []models.Issue{
			{
				Number: 1,
				Title:  "Long error message",
				Body:   longContent + " API error occurred",
				State:  "open",
			},
		}
		guide, err := analyzer.AnalyzeTroubleshooting(context.Background(), issues, "test/project")
		if err != nil {
			t.Fatalf("Should handle long content: %v", err)
		}
		if len(guide.ErrorPatterns) == 0 {
			t.Error("Should detect error patterns even in long content")
		}
	})

	t.Run("issues with special characters", func(t *testing.T) {
		issues := []models.Issue{
			{
				Number: 1,
				Title:  "Error with special chars: áéíóú çñ 中文 日本語",
				Body:   "API error with unicode: 🚨 ⚠️ 💥",
				State:  "open",
			},
		}
		guide, err := analyzer.AnalyzeTroubleshooting(context.Background(), issues, "test/project")
		if err != nil {
			t.Fatalf("Should handle special characters: %v", err)
		}
		if len(guide.ErrorPatterns) == 0 {
			t.Error("Should detect error patterns with special characters")
		}
	})

	t.Run("context cancellation", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())
		cancel() // Cancel immediately

		issues := []models.Issue{{Number: 1, Title: "Test", State: "open"}}

		// Should still work since the function doesn't check context cancellation in the main logic
		guide, err := analyzer.AnalyzeTroubleshooting(ctx, issues, "test/project")
		if err != nil {
			t.Fatalf("Should handle cancelled context gracefully: %v", err)
		}
		if guide == nil {
			t.Error("Should return guide even with cancelled context")
		}
	})

	t.Run("all closed issues", func(t *testing.T) {
		now := time.Now()
		closedTime := now.Add(time.Hour)
		issues := []models.Issue{
			{Number: 1, State: "closed", CreatedAt: now, ClosedAt: &closedTime},
			{Number: 2, State: "closed", CreatedAt: now, ClosedAt: &closedTime},
		}
		guide, err := analyzer.AnalyzeTroubleshooting(context.Background(), issues, "test/project")
		if err != nil {
			t.Fatalf("Should handle all closed issues: %v", err)
		}
		if guide.SolvedIssues != 2 {
			t.Errorf("Expected 2 solved issues, got %d", guide.SolvedIssues)
		}
		if guide.Statistics.SuccessRate != 100.0 {
			t.Errorf("Expected 100%% success rate, got %.2f", guide.Statistics.SuccessRate)
		}
	})
}

func TestAIServiceIntegration(t *testing.T) {
	t.Run("AI service with timeout", func(t *testing.T) {
		slowAI := &MockAIService{
			Result: &AITroubleshootingResult{
				AnalyzedAt:     time.Now(),
				ProcessingTime: 30.0, // Simulates slow processing
				Confidence:     0.75,
			},
		}

		analyzer := NewAnalyzer(slowAI)
		issues := []models.Issue{{Number: 1, Title: "Test error", Body: "API failure", State: "open"}}

		guide, err := analyzer.AnalyzeTroubleshooting(context.Background(), issues, "test/project")
		if err != nil {
			t.Fatalf("Should handle slow AI service: %v", err)
		}
		if guide.AIInsights == nil {
			t.Error("Should have AI insights")
		}
		if guide.AIInsights.ProcessingTime != 30.0 {
			t.Errorf("Expected processing time 30.0, got %.2f", guide.AIInsights.ProcessingTime)
		}
	})

	t.Run("AI service with complex result", func(t *testing.T) {
		complexAI := &MockAIService{
			Result: &AITroubleshootingResult{
				AnalyzedAt:     time.Now(),
				ProcessingTime: 2.5,
				PatternsDetected: []AIDetectedPattern{
					{PatternID: "p1", Description: "Pattern 1", Confidence: 0.9},
					{PatternID: "p2", Description: "Pattern 2", Confidence: 0.8},
				},
				SolutionStrategies: []AISolutionStrategy{
					{StrategyID: "s1", Title: "Strategy 1", Effectiveness: 0.85},
				},
				RootCauseAnalysis: []AIRootCause{
					{CauseID: "c1", Description: "Root cause 1", Likelihood: 0.7},
				},
				Insights: []AIInsight{
					{InsightID: "i1", Type: "performance", Significance: 0.6, Actionable: true},
				},
				Confidence:      0.88,
				Recommendations: []string{"Recommendation 1", "Recommendation 2"},
			},
		}

		analyzer := NewAnalyzer(complexAI)
		issues := []models.Issue{{Number: 1, Title: "Complex error", Body: "Multiple issues", State: "open"}}

		guide, err := analyzer.AnalyzeTroubleshooting(context.Background(), issues, "test/project")
		if err != nil {
			t.Fatalf("Should handle complex AI result: %v", err)
		}

		ai := guide.AIInsights
		if len(ai.PatternsDetected) != 2 {
			t.Errorf("Expected 2 patterns detected, got %d", len(ai.PatternsDetected))
		}
		if len(ai.SolutionStrategies) != 1 {
			t.Errorf("Expected 1 solution strategy, got %d", len(ai.SolutionStrategies))
		}
		if len(ai.Recommendations) != 2 {
			t.Errorf("Expected 2 recommendations, got %d", len(ai.Recommendations))
		}
	})
}

// Benchmark tests for performance analysis
func BenchmarkAnalyzeTroubleshooting(b *testing.B) {
	analyzer := NewAnalyzer(nil)
	issues := generateTestIssues(100) // Helper to generate test data

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := analyzer.AnalyzeTroubleshooting(context.Background(), issues, "benchmark/project")
		if err != nil {
			b.Fatalf("AnalyzeTroubleshooting failed: %v", err)
		}
	}
}

func BenchmarkExtractErrorPatterns(b *testing.B) {
	analyzer := NewAnalyzer(nil)
	issues := generateTestIssues(50)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		analyzer.extractErrorPatterns(issues)
	}
}

// Helper function to generate test issues
func generateTestIssues(count int) []models.Issue {
	issues := make([]models.Issue, count)
	now := time.Now()

	errorTypes := []string{
		"API error in authentication",
		"Configuration file missing",
		"Database connection timeout",
		"Network connectivity failed",
		"Permission denied error",
		"Dependency not found",
	}

	for i := 0; i < count; i++ {
		issues[i] = models.Issue{
			ID:        int64(i + 1),
			Number:    i + 1,
			Title:     errorTypes[i%len(errorTypes)],
			Body:      "Detailed error description for testing purposes",
			State:     map[bool]string{true: "closed", false: "open"}[i%3 == 0],
			CreatedAt: now.Add(-time.Duration(i) * time.Hour),
			UpdatedAt: now.Add(-time.Duration(i/2) * time.Hour),
			Labels:    []models.Label{{Name: "bug"}, {Name: "test"}},
		}
	}

	return issues
}

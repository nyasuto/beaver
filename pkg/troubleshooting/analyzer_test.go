package troubleshooting

import (
	"context"
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

func TestNewAnalyzer(t *testing.T) {
	analyzer := NewAnalyzer()

	if analyzer == nil {
		t.Fatal("NewAnalyzer returned nil")
	}
}

func TestAnalyzeTroubleshooting(t *testing.T) {
	ctx := context.Background()
	analyzer := NewAnalyzer()

	t.Run("empty issues", func(t *testing.T) {
		guide, err := analyzer.AnalyzeTroubleshooting(ctx, []models.Issue{}, "test/project")

		if err != nil {
			t.Fatalf("Expected no error, got: %v", err)
		}

		if guide == nil {
			t.Fatal("Expected guide, got nil")
		}

		if guide.TotalIssues != 0 {
			t.Errorf("Expected 0 total issues, got %d", guide.TotalIssues)
		}

		if guide.SolvedIssues != 0 {
			t.Errorf("Expected 0 solved issues, got %d", guide.SolvedIssues)
		}

		if len(guide.ErrorPatterns) != 0 {
			t.Errorf("Expected 0 error patterns, got %d", len(guide.ErrorPatterns))
		}

		if len(guide.Solutions) != 0 {
			t.Errorf("Expected 0 solutions, got %d", len(guide.Solutions))
		}
	})

	t.Run("basic issue analysis", func(t *testing.T) {
		issues := []models.Issue{
			{
				Number:    1,
				Title:     "API connection error in production",
				Body:      "Getting HTTP error 500 when calling external API",
				State:     "open",
				CreatedAt: time.Now().Add(-24 * time.Hour),
				UpdatedAt: time.Now().Add(-1 * time.Hour),
				Labels: []models.Label{
					{Name: "bug", Color: "red"},
				},
			},
			{
				Number:    2,
				Title:     "Database connection timeout",
				Body:      "SQL connection timeout error occurring frequently. This issue was resolved by adjusting connection pool settings.",
				State:     "closed",
				CreatedAt: time.Now().Add(-48 * time.Hour),
				UpdatedAt: time.Now().Add(-2 * time.Hour),
				Labels: []models.Label{
					{Name: "critical", Color: "red"},
				},
			},
		}

		guide, err := analyzer.AnalyzeTroubleshooting(ctx, issues, "test/project")

		if err != nil {
			t.Fatalf("Expected no error, got: %v", err)
		}

		if guide == nil {
			t.Fatal("Expected guide, got nil")
		}

		if guide.TotalIssues != 2 {
			t.Errorf("Expected 2 total issues, got %d", guide.TotalIssues)
		}

		if guide.SolvedIssues != 1 {
			t.Errorf("Expected 1 solved issue, got %d", guide.SolvedIssues)
		}

		// Should detect at least some error patterns
		if len(guide.ErrorPatterns) == 0 {
			t.Error("Expected some error patterns to be detected")
		}

		// Should extract solutions from closed issues
		if len(guide.Solutions) == 0 {
			t.Error("Expected some solutions to be extracted")
		}

		// Check statistics
		if guide.Statistics.TotalPatterns != len(guide.ErrorPatterns) {
			t.Errorf("Statistics mismatch: expected %d patterns, got %d", len(guide.ErrorPatterns), guide.Statistics.TotalPatterns)
		}

		if guide.Statistics.TotalSolutions != len(guide.Solutions) {
			t.Errorf("Statistics mismatch: expected %d solutions, got %d", len(guide.Solutions), guide.Statistics.TotalSolutions)
		}
	})
}

func TestAnalyzeErrorPatterns(t *testing.T) {
	analyzer := NewAnalyzer()

	issues := []models.Issue{
		{
			Number:    1,
			Title:     "API connection error",
			Body:      "HTTP error 500 when calling external API",
			State:     "open",
			UpdatedAt: time.Now(),
		},
		{
			Number:    2,
			Title:     "Database error",
			Body:      "SQL connection timeout error",
			State:     "closed",
			UpdatedAt: time.Now(),
		},
		{
			Number:    3,
			Title:     "Another API error",
			Body:      "Connection error to external service",
			State:     "open",
			UpdatedAt: time.Now(),
		},
	}

	patterns := analyzer.analyzeErrorPatterns(issues)

	if len(patterns) == 0 {
		t.Error("Expected some error patterns to be detected")
	}

	// Check that API pattern was detected (should have frequency of 2)
	apiPatternFound := false
	for _, pattern := range patterns {
		if strings.Contains(pattern.Category, "API") && pattern.Frequency >= 2 {
			apiPatternFound = true
			break
		}
	}

	if !apiPatternFound {
		t.Error("Expected API error pattern with frequency >= 2 to be detected")
	}
}

func TestExtractSolutions(t *testing.T) {
	analyzer := NewAnalyzer()

	issues := []models.Issue{
		{
			Number:    1,
			Title:     "Fixed API timeout issue",
			Body:      "Implemented retry logic with exponential backoff to handle API timeouts more gracefully. This solution improved reliability significantly.",
			State:     "closed",
			CreatedAt: time.Now().Add(-24 * time.Hour),
			Labels: []models.Label{
				{Name: "bug", Color: "red"},
			},
		},
		{
			Number:    2,
			Title:     "Open issue",
			Body:      "This is still being investigated",
			State:     "open",
			CreatedAt: time.Now().Add(-12 * time.Hour),
		},
		{
			Number:    3,
			Title:     "Short closed issue",
			Body:      "Fixed", // Too short, should be ignored
			State:     "closed",
			CreatedAt: time.Now().Add(-6 * time.Hour),
		},
	}

	solutions := analyzer.extractSolutions(issues)

	// Should extract one solution (from closed issue with sufficient body length)
	if len(solutions) != 1 {
		t.Errorf("Expected 1 solution, got %d", len(solutions))
	}

	if len(solutions) > 0 {
		solution := solutions[0]
		if solution.Title != "Fixed API timeout issue" {
			t.Errorf("Expected solution title 'Fixed API timeout issue', got '%s'", solution.Title)
		}

		if solution.Category != "Bug Fix" {
			t.Errorf("Expected solution category 'Bug Fix', got '%s'", solution.Category)
		}

		if len(solution.Steps) == 0 {
			t.Error("Expected some solution steps")
		}

		if len(solution.Tags) == 0 {
			t.Error("Expected some tags from labels")
		}
	}
}

func TestCalculateStatistics(t *testing.T) {
	analyzer := NewAnalyzer()

	patterns := []ErrorPattern{
		{Severity: SeverityCritical, Category: "API"},
		{Severity: SeverityHigh, Category: "Database"},
		{Severity: SeverityMedium, Category: "API"},
	}

	solutions := []Solution{
		{ID: "1"},
		{ID: "2"},
	}

	issues := []models.Issue{
		{
			State:     "closed",
			CreatedAt: time.Now().Add(-2 * time.Hour),
			UpdatedAt: time.Now().Add(-1 * time.Hour),
		},
		{
			State:     "open",
			CreatedAt: time.Now().Add(-1 * time.Hour),
			UpdatedAt: time.Now(),
		},
	}

	stats := analyzer.calculateStatistics(patterns, solutions, issues)

	if stats.TotalPatterns != 3 {
		t.Errorf("Expected 3 total patterns, got %d", stats.TotalPatterns)
	}

	if stats.TotalSolutions != 2 {
		t.Errorf("Expected 2 total solutions, got %d", stats.TotalSolutions)
	}

	if stats.CriticalPatterns != 1 {
		t.Errorf("Expected 1 critical pattern, got %d", stats.CriticalPatterns)
	}

	if stats.SuccessRate != 0.5 {
		t.Errorf("Expected success rate of 0.5, got %f", stats.SuccessRate)
	}

	if stats.MostCommonCategory != "API" {
		t.Errorf("Expected most common category 'API', got '%s'", stats.MostCommonCategory)
	}

	if stats.AverageResolveTime <= 0 {
		t.Errorf("Expected positive average resolve time, got %f", stats.AverageResolveTime)
	}
}

func TestHelperMethods(t *testing.T) {
	analyzer := NewAnalyzer()

	issue := models.Issue{
		Title: "Test issue",
		Body:  "This is a test issue with some content that should be extracted properly",
		Labels: []models.Label{
			{Name: "bug", Color: "red"},
			{Name: "easy", Color: "green"},
		},
	}

	t.Run("extractSolutionTitle", func(t *testing.T) {
		title := analyzer.extractSolutionTitle(issue)
		if title != "Test issue" {
			t.Errorf("Expected 'Test issue', got '%s'", title)
		}
	})

	t.Run("categorizeIssue", func(t *testing.T) {
		category := analyzer.categorizeIssue(issue)
		if category != "Bug Fix" {
			t.Errorf("Expected 'Bug Fix', got '%s'", category)
		}
	})

	t.Run("assessDifficulty", func(t *testing.T) {
		difficulty := analyzer.assessDifficulty(issue)
		if difficulty != DifficultyEasy {
			t.Errorf("Expected DifficultyEasy, got %v", difficulty)
		}
	})

	t.Run("extractTags", func(t *testing.T) {
		tags := analyzer.extractTags(issue)
		if len(tags) != 2 {
			t.Errorf("Expected 2 tags, got %d", len(tags))
		}
	})

	t.Run("extractRequiredTools", func(t *testing.T) {
		issueWithTools := models.Issue{
			Body: "Use npm install and docker run to fix this issue",
		}
		tools := analyzer.extractRequiredTools(issueWithTools)

		expectedTools := []string{"npm", "docker"}
		if len(tools) != len(expectedTools) {
			t.Errorf("Expected %d tools, got %d", len(expectedTools), len(tools))
		}
	})
}

func TestEnumStringMethods(t *testing.T) {
	t.Run("Severity.String", func(t *testing.T) {
		if SeverityCritical.String() != "critical" {
			t.Errorf("Expected 'critical', got '%s'", SeverityCritical.String())
		}
	})

	t.Run("Difficulty.String", func(t *testing.T) {
		if DifficultyMedium.String() != "medium" {
			t.Errorf("Expected 'medium', got '%s'", DifficultyMedium.String())
		}
	})

	t.Run("Priority.String", func(t *testing.T) {
		if PriorityHigh.String() != "high" {
			t.Errorf("Expected 'high', got '%s'", PriorityHigh.String())
		}
	})
}

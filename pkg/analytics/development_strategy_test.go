package analytics

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/nyasuto/beaver/internal/models"
)

func TestNewDevelopmentStrategyCalculator(t *testing.T) {
	tests := []struct {
		name        string
		issues      []models.Issue
		projectName string
		description string
	}{
		{
			name:        "create calculator with empty issues",
			issues:      []models.Issue{},
			projectName: "test-project",
			description: "Should create calculator with empty issue list",
		},
		{
			name:        "create calculator with sample issues",
			issues:      createDevelopmentStrategyTestIssues(3),
			projectName: "sample-project",
			description: "Should create calculator with multiple issues",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calculator := NewDevelopmentStrategyCalculator(tt.issues, tt.projectName)

			assert.NotNil(t, calculator, tt.description)
			assert.Equal(t, tt.issues, calculator.issues, "Issues should match")
			assert.Equal(t, tt.projectName, calculator.projectName, "Project name should match")
			assert.WithinDuration(t, time.Now(), calculator.generatedAt, time.Second, "Generated time should be recent")
		})
	}
}

func TestDevelopmentStrategyCalculator_Calculate(t *testing.T) {
	tests := []struct {
		name        string
		issues      []models.Issue
		projectName string
		description string
	}{
		{
			name:        "calculate strategy for empty issues",
			issues:      []models.Issue{},
			projectName: "empty-project",
			description: "Should handle empty issue list correctly",
		},
		{
			name:        "calculate strategy for multiple issues",
			issues:      createDevelopmentStrategyTestIssues(5),
			projectName: "test-project",
			description: "Should generate complete strategy data",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calculator := NewDevelopmentStrategyCalculator(tt.issues, tt.projectName)
			data := calculator.Calculate()

			require.NotNil(t, data, tt.description)
			assert.Equal(t, tt.projectName, data.ProjectName, "Project name should match")
			assert.WithinDuration(t, time.Now(), data.GeneratedAt, time.Second, "Generated time should be recent")
			assert.Equal(t, "Automated development strategy analysis with meta-learning", data.AnalysisMethod, "Analysis method should be set")

			// Verify basic metrics
			assert.Equal(t, len(tt.issues), data.TotalIssues, "Total issues should match")
			assert.GreaterOrEqual(t, data.HealthScore, 0.0, "Health score should be non-negative")
			assert.LessOrEqual(t, data.HealthScore, 100.0, "Health score should not exceed 100")

			// Verify data structures are initialized
			assert.NotNil(t, data.HighPriorityIssues, "High priority issues should be initialized")
			assert.NotNil(t, data.MediumPriorityIssues, "Medium priority issues should be initialized")
			assert.NotNil(t, data.LowPriorityIssues, "Low priority issues should be initialized")
			assert.NotNil(t, data.VelocityData, "Velocity data should be initialized")
			assert.NotNil(t, data.ResolutionPatterns, "Resolution patterns should be initialized")
			assert.NotNil(t, data.TechFocusAreas, "Tech focus areas should be initialized")
			assert.NotNil(t, data.RecentDecisions, "Recent decisions should be initialized")
			assert.NotNil(t, data.DevelopmentPatterns, "Development patterns should be initialized")
			assert.NotNil(t, data.SuccessfulStrategies, "Successful strategies should be initialized")
			assert.NotNil(t, data.ImprovementAreas, "Improvement areas should be initialized")
			assert.NotNil(t, data.AutomationHealth, "Automation health should be initialized")
			assert.NotNil(t, data.NextSteps, "Next steps should be initialized")
			assert.NotNil(t, data.LearningPaths, "Learning paths should be initialized")

			// Verify counts match array lengths
			assert.Equal(t, len(data.HighPriorityIssues), data.HighPriorityCount, "High priority count should match")
			assert.Equal(t, len(data.MediumPriorityIssues), data.MediumPriorityCount, "Medium priority count should match")
			assert.Equal(t, len(data.LowPriorityIssues), data.LowPriorityCount, "Low priority count should match")

			// Verify next update is set
			assert.NotNil(t, data.NextUpdate, "Next update should be set")
			assert.True(t, data.NextUpdate.After(data.GeneratedAt), "Next update should be after generation time")

			t.Logf("Strategy generated for %s: %d total issues, %.1f health score",
				data.ProjectName, data.TotalIssues, data.HealthScore)
		})
	}
}

func TestDevelopmentStrategyCalculator_HealthScore(t *testing.T) {
	tests := []struct {
		name           string
		issues         []models.Issue
		expectedHealth float64
		description    string
	}{
		{
			name:           "healthy project with few open issues",
			issues:         createHealthyProjectIssues(),
			expectedHealth: 80.0, // Should be high
			description:    "Should have high health score for well-managed project",
		},
		{
			name:           "project with many open issues",
			issues:         createUnhealthyProjectIssues(),
			expectedHealth: 35.0, // Should be lower (algorithm is more aggressive)
			description:    "Should have lower health score for poorly managed project",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calculator := NewDevelopmentStrategyCalculator(tt.issues, "test-project")
			health := calculator.calculateHealthScore()

			assert.GreaterOrEqual(t, health, 0.0, "Health score should be non-negative")
			assert.LessOrEqual(t, health, 100.0, "Health score should not exceed 100")

			// Allow some flexibility in health score calculation
			assert.InDelta(t, tt.expectedHealth, health, 20.0, tt.description)
		})
	}
}

// Helper functions for creating test data

func createDevelopmentStrategyTestIssues(count int) []models.Issue {
	issues := make([]models.Issue, count)
	baseTime := time.Now().AddDate(0, -1, 0) // One month ago

	for i := 0; i < count; i++ {
		state := "open"
		if i%3 == 0 {
			state = "closed"
		}

		issues[i] = models.Issue{
			ID:        int64(i + 1),
			Number:    i + 1,
			Title:     "Development Strategy Test Issue " + string(rune(i+65)), // A, B, C...
			Body:      "This is a test issue for development strategy analysis with strategic decision content.",
			State:     state,
			CreatedAt: baseTime.AddDate(0, 0, i),
			UpdatedAt: baseTime.AddDate(0, 0, i+1),
			User: models.User{
				ID:    int64(1),
				Login: "testuser",
			},
			Labels: []models.Label{
				{Name: "strategy", Color: "blue"},
			},
			HTMLURL: "https://github.com/test/repo/issues/" + string(rune(i+49)), // 1, 2, 3...
		}
	}
	return issues
}

func createHealthyProjectIssues() []models.Issue {
	return []models.Issue{
		{
			ID: 1, Number: 1, Title: "Feature: Add new functionality", State: "closed", CreatedAt: time.Now().AddDate(0, 0, -5),
			User: models.User{Login: "user1"}, Labels: []models.Label{{Name: "feature", Color: "green"}},
		},
		{
			ID: 2, Number: 2, Title: "Bug: Fix minor issue", State: "closed", CreatedAt: time.Now().AddDate(0, 0, -3),
			User: models.User{Login: "user2"}, Labels: []models.Label{{Name: "bug", Color: "red"}},
		},
		{
			ID: 3, Number: 3, Title: "Enhancement: Improve performance", State: "open", CreatedAt: time.Now().AddDate(0, 0, -1),
			User: models.User{Login: "user1"}, Labels: []models.Label{{Name: "enhancement", Color: "yellow"}},
		},
	}
}

func createUnhealthyProjectIssues() []models.Issue {
	baseTime := time.Now().AddDate(0, -2, 0) // Two months ago
	issues := make([]models.Issue, 10)

	for i := 0; i < 10; i++ {
		issues[i] = models.Issue{
			ID:        int64(i + 1),
			Number:    i + 1,
			Title:     "Old open issue " + string(rune(i+65)),
			Body:      "This is an old open issue without proper labels or management.",
			State:     "open",                       // All open (unhealthy)
			CreatedAt: baseTime.AddDate(0, 0, -i*5), // Spread over time, all old
			User:      models.User{Login: "user1"},
			Labels:    []models.Label{}, // No labels (unhealthy)
		}
	}
	return issues
}

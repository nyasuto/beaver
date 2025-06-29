package analytics

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/nyasuto/beaver/internal/models"
)

func TestNewStatisticsCalculator(t *testing.T) {
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
			issues:      createTestIssues(3),
			projectName: "sample-project",
			description: "Should create calculator with multiple issues",
		},
		{
			name:        "create calculator with empty project name",
			issues:      createTestIssues(1),
			projectName: "",
			description: "Should handle empty project name",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calculator := NewStatisticsCalculator(tt.issues, tt.projectName)

			assert.NotNil(t, calculator, tt.description)
			assert.Equal(t, tt.issues, calculator.issues, "Issues should match")
			assert.Equal(t, tt.projectName, calculator.projectName, "Project name should match")
			assert.WithinDuration(t, time.Now(), calculator.generatedAt, time.Second, "Generated time should be recent")
		})
	}
}

func TestStatisticsCalculator_Calculate(t *testing.T) {
	tests := []struct {
		name                string
		issues              []models.Issue
		projectName         string
		expectedTotalCount  int
		expectedOpenCount   int
		expectedClosedCount int
		description         string
	}{
		{
			name:                "calculate stats for empty issues",
			issues:              []models.Issue{},
			projectName:         "empty-project",
			expectedTotalCount:  0,
			expectedOpenCount:   0,
			expectedClosedCount: 0,
			description:         "Should handle empty issue list correctly",
		},
		{
			name:                "calculate stats for mixed state issues",
			issues:              createMixedStateIssues(),
			projectName:         "mixed-project",
			expectedTotalCount:  5,
			expectedOpenCount:   3,
			expectedClosedCount: 2,
			description:         "Should correctly count open and closed issues",
		},
		{
			name:                "calculate stats for all open issues",
			issues:              createTestIssuesWithState("open", 4),
			projectName:         "open-project",
			expectedTotalCount:  4,
			expectedOpenCount:   4,
			expectedClosedCount: 0,
			description:         "Should handle all open issues",
		},
		{
			name:                "calculate stats for all closed issues",
			issues:              createTestIssuesWithState("closed", 3),
			projectName:         "closed-project",
			expectedTotalCount:  3,
			expectedOpenCount:   0,
			expectedClosedCount: 3,
			description:         "Should handle all closed issues",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calculator := NewStatisticsCalculator(tt.issues, tt.projectName)
			stats := calculator.Calculate()

			require.NotNil(t, stats, tt.description)
			assert.Equal(t, tt.projectName, stats.ProjectName, "Project name should match")
			assert.Equal(t, tt.expectedTotalCount, stats.TotalIssues, "Total issues count should match")
			assert.Equal(t, tt.expectedOpenCount, stats.OpenIssues, "Open issues count should match")
			assert.Equal(t, tt.expectedClosedCount, stats.ClosedIssues, "Closed issues count should match")
			assert.WithinDuration(t, time.Now(), stats.GeneratedAt, time.Second, "Generated time should be recent")
			assert.True(t, stats.AutoUpdate, "Auto-update should be enabled")

			// Verify that all statistical components are generated
			assert.NotNil(t, stats.ClassificationStats, "Classification stats should be generated")

			if len(tt.issues) > 0 {
				// Only check for other stats if we have issues
				assert.NotNil(t, stats.TimeStats, "Time stats should be generated for non-empty issues")
				assert.NotNil(t, stats.ActivityStats, "Activity stats should be generated for non-empty issues")
				assert.NotNil(t, stats.ContributorStats, "Contributor stats should be generated for non-empty issues")
				assert.NotNil(t, stats.QualityStats, "Quality stats should be generated for non-empty issues")
				assert.NotNil(t, stats.HealthStats, "Health stats should be generated for non-empty issues")
			}
		})
	}
}

func TestStatisticsCalculator_CalculateClassificationStats(t *testing.T) {
	tests := []struct {
		name               string
		issues             []models.Issue
		expectedClassified int
		expectCategories   bool
		expectMethods      bool
		description        string
	}{
		{
			name:               "no classification data",
			issues:             createTestIssuesWithoutClassification(3),
			expectedClassified: 0,
			expectCategories:   false,
			expectMethods:      false,
			description:        "Should handle issues without classification",
		},
		{
			name:               "mixed classification data",
			issues:             createTestIssuesWithClassification(),
			expectedClassified: 3,
			expectCategories:   true,
			expectMethods:      true,
			description:        "Should process issues with classification data",
		},
		{
			name:               "empty issues",
			issues:             []models.Issue{},
			expectedClassified: 0,
			expectCategories:   false,
			expectMethods:      false,
			description:        "Should handle empty issue list",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calculator := NewStatisticsCalculator(tt.issues, "test-project")
			stats := calculator.Calculate()

			assert.Equal(t, tt.expectedClassified, stats.ClassificationStats.TotalClassified, tt.description)

			if tt.expectCategories {
				assert.NotEmpty(t, stats.ClassificationStats.ByCategory, "Should have category data")
			}

			if tt.expectMethods {
				assert.NotEmpty(t, stats.ClassificationStats.ByMethod, "Should have method data")
			}

			// Verify confidence calculations
			if tt.expectedClassified > 0 {
				assert.GreaterOrEqual(t, stats.ClassificationStats.AverageConfidence, 0.0, "Average confidence should be non-negative")
				assert.LessOrEqual(t, stats.ClassificationStats.AverageConfidence, 1.0, "Average confidence should not exceed 1.0")
			}
		})
	}
}

func TestStatisticsCalculator_TimeStatistics(t *testing.T) {
	tests := []struct {
		name        string
		issues      []models.Issue
		expectData  bool
		description string
	}{
		{
			name:        "no issues",
			issues:      []models.Issue{},
			expectData:  false,
			description: "Should handle empty issues for time stats",
		},
		{
			name:        "issues with time range",
			issues:      createTestIssuesWithTimeRange(),
			expectData:  true,
			description: "Should generate time statistics for time-ranged issues",
		},
		{
			name:        "single issue",
			issues:      createTestIssues(1),
			expectData:  true,
			description: "Should handle single issue time stats",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calculator := NewStatisticsCalculator(tt.issues, "test-project")
			stats := calculator.Calculate()

			if tt.expectData {
				require.NotNil(t, stats.TimeStats, tt.description)
				if len(tt.issues) > 0 {
					assert.NotEmpty(t, stats.TimeStats.MonthlyData, "Should have monthly data")
				}
			}
		})
	}
}

func TestStatisticsCalculator_ActivityStatistics(t *testing.T) {
	tests := []struct {
		name        string
		issues      []models.Issue
		expectData  bool
		description string
	}{
		{
			name:        "no issues",
			issues:      []models.Issue{},
			expectData:  false,
			description: "Should handle empty issues for activity stats",
		},
		{
			name:        "multiple issues",
			issues:      createTestIssuesWithDifferentDates(),
			expectData:  true,
			description: "Should generate activity statistics",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calculator := NewStatisticsCalculator(tt.issues, "test-project")
			stats := calculator.Calculate()

			if tt.expectData {
				require.NotNil(t, stats.ActivityStats, tt.description)
				assert.GreaterOrEqual(t, stats.ActivityStats.AvgIssuesPerMonth, 0.0, "Average issues per month should be non-negative")
				assert.GreaterOrEqual(t, stats.ActivityStats.AvgResolutionDays, 0.0, "Average resolution days should be non-negative")
				assert.GreaterOrEqual(t, stats.ActivityStats.LongestOpenDays, 0, "Longest open days should be non-negative")
			}
		})
	}
}

func TestStatisticsCalculator_ContributorStatistics(t *testing.T) {
	tests := []struct {
		name                 string
		issues               []models.Issue
		expectedContributors int
		description          string
	}{
		{
			name:                 "no issues",
			issues:               []models.Issue{},
			expectedContributors: 0,
			description:          "Should handle empty issues for contributor stats",
		},
		{
			name:                 "single contributor",
			issues:               createTestIssuesWithSingleContributor(),
			expectedContributors: 1,
			description:          "Should handle single contributor",
		},
		{
			name:                 "multiple contributors",
			issues:               createTestIssuesWithMultipleContributors(),
			expectedContributors: 3,
			description:          "Should handle multiple contributors",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calculator := NewStatisticsCalculator(tt.issues, "test-project")
			stats := calculator.Calculate()

			if len(tt.issues) > 0 {
				require.NotNil(t, stats.ContributorStats, tt.description)
				assert.Equal(t, tt.expectedContributors, stats.ContributorStats.TotalContributors, "Total contributors should match expected")

				if tt.expectedContributors > 0 {
					assert.NotEmpty(t, stats.ContributorStats.TopContributors, "Should have top contributors")
					// Verify percentage calculations
					for _, contrib := range stats.ContributorStats.TopContributors {
						assert.GreaterOrEqual(t, contrib.ContributionPercentage, 0.0, "Contribution percentage should be non-negative")
						assert.LessOrEqual(t, contrib.ContributionPercentage, 100.0, "Contribution percentage should not exceed 100%")
					}
				}
			}
		})
	}
}

func TestStatisticsCalculator_QualityStatistics(t *testing.T) {
	tests := []struct {
		name        string
		issues      []models.Issue
		expectData  bool
		description string
	}{
		{
			name:        "no issues",
			issues:      []models.Issue{},
			expectData:  false,
			description: "Should handle empty issues for quality stats",
		},
		{
			name:        "issues with varying quality",
			issues:      createTestIssuesWithVaryingQuality(),
			expectData:  true,
			description: "Should calculate quality metrics correctly",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calculator := NewStatisticsCalculator(tt.issues, "test-project")
			stats := calculator.Calculate()

			if tt.expectData {
				require.NotNil(t, stats.QualityStats, tt.description)
				assert.GreaterOrEqual(t, stats.QualityStats.AvgTitleLength, 0.0, "Average title length should be non-negative")
				assert.GreaterOrEqual(t, stats.QualityStats.AvgBodyLength, 0.0, "Average body length should be non-negative")
				assert.GreaterOrEqual(t, stats.QualityStats.AvgCommentsPerIssue, 0.0, "Average comments per issue should be non-negative")
				assert.LessOrEqual(t, stats.QualityStats.IssuesWithLabels, len(tt.issues), "Issues with labels should not exceed total")
				assert.LessOrEqual(t, stats.QualityStats.IssuesWithComments, len(tt.issues), "Issues with comments should not exceed total")
			}
		})
	}
}

func TestStatisticsCalculator_HealthStatistics(t *testing.T) {
	tests := []struct {
		name        string
		issues      []models.Issue
		expectData  bool
		description string
	}{
		{
			name:        "no issues",
			issues:      []models.Issue{},
			expectData:  false,
			description: "Should handle empty issues for health stats",
		},
		{
			name:        "healthy project",
			issues:      createTestIssuesHealthy(),
			expectData:  true,
			description: "Should calculate health metrics for healthy project",
		},
		{
			name:        "unhealthy project",
			issues:      createTestIssuesUnhealthy(),
			expectData:  true,
			description: "Should calculate health metrics for unhealthy project",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calculator := NewStatisticsCalculator(tt.issues, "test-project")
			stats := calculator.Calculate()

			if tt.expectData {
				require.NotNil(t, stats.HealthStats, tt.description)
				assert.GreaterOrEqual(t, stats.HealthStats.AvgResponseTime, 0.0, "Average response time should be non-negative")
				assert.GreaterOrEqual(t, stats.HealthStats.HealthScore, 0.0, "Health score should be non-negative")
				assert.LessOrEqual(t, stats.HealthStats.HealthScore, 100.0, "Health score should not exceed 100")
				assert.GreaterOrEqual(t, stats.HealthStats.StaleIssues, 0, "Stale issues should be non-negative")
				assert.LessOrEqual(t, stats.HealthStats.IssuesWithoutLabels, len(tt.issues), "Issues without labels should not exceed total")
			}
		})
	}
}

// Helper functions for creating test data

func createTestIssues(count int) []models.Issue {
	issues := make([]models.Issue, count)
	baseTime := time.Now().AddDate(0, -1, 0) // One month ago

	for i := 0; i < count; i++ {
		issues[i] = models.Issue{
			ID:        int64(i + 1),
			Number:    i + 1,
			Title:     "Test Issue " + string(rune(i+1)),
			Body:      "This is a test issue body with some content.",
			State:     "open",
			CreatedAt: baseTime.AddDate(0, 0, i),
			UpdatedAt: baseTime.AddDate(0, 0, i+1),
			User: models.User{
				ID:    int64(1),
				Login: "testuser",
			},
			Labels: []models.Label{
				{Name: "bug", Color: "ff0000"},
			},
		}
	}
	return issues
}

func createMixedStateIssues() []models.Issue {
	issues := []models.Issue{
		{ID: 1, Number: 1, Title: "Open Issue 1", State: "open", CreatedAt: time.Now().AddDate(0, 0, -1), UpdatedAt: time.Now(), User: models.User{Login: "user1"}},
		{ID: 2, Number: 2, Title: "Open Issue 2", State: "open", CreatedAt: time.Now().AddDate(0, 0, -2), UpdatedAt: time.Now(), User: models.User{Login: "user2"}},
		{ID: 3, Number: 3, Title: "Open Issue 3", State: "open", CreatedAt: time.Now().AddDate(0, 0, -3), UpdatedAt: time.Now(), User: models.User{Login: "user1"}},
		{ID: 4, Number: 4, Title: "Closed Issue 1", State: "closed", CreatedAt: time.Now().AddDate(0, 0, -4), UpdatedAt: time.Now().AddDate(0, 0, -1), User: models.User{Login: "user3"}, ClosedAt: timePtr(time.Now().AddDate(0, 0, -1))},
		{ID: 5, Number: 5, Title: "Closed Issue 2", State: "closed", CreatedAt: time.Now().AddDate(0, 0, -5), UpdatedAt: time.Now().AddDate(0, 0, -2), User: models.User{Login: "user2"}, ClosedAt: timePtr(time.Now().AddDate(0, 0, -2))},
	}
	return issues
}

func createTestIssuesWithState(state string, count int) []models.Issue {
	issues := make([]models.Issue, count)
	for i := 0; i < count; i++ {
		closedAt := (*time.Time)(nil)
		updatedAt := time.Now().AddDate(0, 0, -i)
		if state == "closed" {
			closedAt = timePtr(time.Now().AddDate(0, 0, -i))
		}

		issues[i] = models.Issue{
			ID:        int64(i + 1),
			Number:    i + 1,
			Title:     "Test Issue " + string(rune(i+1)),
			State:     state,
			CreatedAt: time.Now().AddDate(0, 0, -(i + 1)),
			UpdatedAt: updatedAt,
			ClosedAt:  closedAt,
			User:      models.User{Login: "testuser"},
		}
	}
	return issues
}

func createTestIssuesWithoutClassification(count int) []models.Issue {
	issues := make([]models.Issue, count)
	for i := 0; i < count; i++ {
		issues[i] = models.Issue{
			ID:             int64(i + 1),
			Number:         i + 1,
			Title:          "Unclassified Issue " + string(rune(i+1)),
			State:          "open",
			CreatedAt:      time.Now().AddDate(0, 0, -i),
			User:           models.User{Login: "testuser"},
			Classification: nil, // No classification
		}
	}
	return issues
}

func createTestIssuesWithClassification() []models.Issue {
	return []models.Issue{
		{
			ID:        1,
			Number:    1,
			Title:     "Bug Issue",
			State:     "open",
			CreatedAt: time.Now().AddDate(0, 0, -1),
			User:      models.User{Login: "user1"},
			Classification: &models.ClassificationInfo{
				Category:      "bug",
				Method:        "ai",
				Confidence:    0.9,
				SuggestedTags: []string{"bug", "critical"},
				ClassifiedAt:  time.Now(),
			},
		},
		{
			ID:        2,
			Number:    2,
			Title:     "Feature Request",
			State:     "open",
			CreatedAt: time.Now().AddDate(0, 0, -2),
			User:      models.User{Login: "user2"},
			Classification: &models.ClassificationInfo{
				Category:      "enhancement",
				Method:        "hybrid",
				Confidence:    0.8,
				SuggestedTags: []string{"enhancement", "feature"},
				ClassifiedAt:  time.Now(),
			},
		},
		{
			ID:        3,
			Number:    3,
			Title:     "Documentation",
			State:     "closed",
			CreatedAt: time.Now().AddDate(0, 0, -3),
			User:      models.User{Login: "user1"},
			ClosedAt:  timePtr(time.Now().AddDate(0, 0, -1)),
			Classification: &models.ClassificationInfo{
				Category:      "documentation",
				Method:        "rule-based",
				Confidence:    0.7,
				SuggestedTags: []string{"documentation"},
				ClassifiedAt:  time.Now(),
			},
		},
	}
}

func createTestIssuesWithTimeRange() []models.Issue {
	baseTime := time.Now()
	return []models.Issue{
		{ID: 1, Title: "Issue 1", CreatedAt: baseTime.AddDate(0, -3, 0), User: models.User{Login: "user1"}},  // 3 months ago
		{ID: 2, Title: "Issue 2", CreatedAt: baseTime.AddDate(0, -2, 0), User: models.User{Login: "user2"}},  // 2 months ago
		{ID: 3, Title: "Issue 3", CreatedAt: baseTime.AddDate(0, -1, 0), User: models.User{Login: "user1"}},  // 1 month ago
		{ID: 4, Title: "Issue 4", CreatedAt: baseTime.AddDate(0, 0, -15), User: models.User{Login: "user3"}}, // 15 days ago
		{ID: 5, Title: "Issue 5", CreatedAt: baseTime.AddDate(0, 0, -5), User: models.User{Login: "user2"}},  // 5 days ago
	}
}

func createTestIssuesWithDifferentDates() []models.Issue {
	now := time.Now()
	return []models.Issue{
		{ID: 1, Title: "Old Issue", CreatedAt: now.AddDate(0, -6, 0), UpdatedAt: now.AddDate(0, -5, 0), State: "closed", ClosedAt: timePtr(now.AddDate(0, -5, 0)), User: models.User{Login: "user1"}},
		{ID: 2, Title: "Medium Issue", CreatedAt: now.AddDate(0, -3, 0), UpdatedAt: now.AddDate(0, -2, 0), State: "closed", ClosedAt: timePtr(now.AddDate(0, -2, 0)), User: models.User{Login: "user2"}},
		{ID: 3, Title: "Recent Issue", CreatedAt: now.AddDate(0, 0, -10), UpdatedAt: now.AddDate(0, 0, -9), State: "open", User: models.User{Login: "user1"}},
	}
}

func createTestIssuesWithSingleContributor() []models.Issue {
	return []models.Issue{
		{ID: 1, Title: "Issue 1", User: models.User{Login: "singleuser"}, CreatedAt: time.Now()},
		{ID: 2, Title: "Issue 2", User: models.User{Login: "singleuser"}, CreatedAt: time.Now()},
	}
}

func createTestIssuesWithMultipleContributors() []models.Issue {
	return []models.Issue{
		{ID: 1, Title: "Issue 1", User: models.User{Login: "user1"}, CreatedAt: time.Now()},
		{ID: 2, Title: "Issue 2", User: models.User{Login: "user2"}, CreatedAt: time.Now()},
		{ID: 3, Title: "Issue 3", User: models.User{Login: "user3"}, CreatedAt: time.Now()},
		{ID: 4, Title: "Issue 4", User: models.User{Login: "user1"}, CreatedAt: time.Now()},
		{ID: 5, Title: "Issue 5", User: models.User{Login: "user2"}, CreatedAt: time.Now()},
	}
}

func createTestIssuesWithVaryingQuality() []models.Issue {
	return []models.Issue{
		{
			ID:        1,
			Title:     "Short title",
			Body:      "Brief description.",
			Labels:    []models.Label{{Name: "bug"}},
			Comments:  []models.Comment{{Body: "First comment"}},
			User:      models.User{Login: "user1"},
			CreatedAt: time.Now(),
		},
		{
			ID:        2,
			Title:     "This is a much longer and more detailed title with multiple words",
			Body:      "This is a very comprehensive description with multiple paragraphs and detailed information about the issue, including steps to reproduce, expected behavior, and actual behavior.",
			Labels:    []models.Label{{Name: "enhancement"}, {Name: "feature"}},
			Comments:  []models.Comment{{Body: "Comment 1"}, {Body: "Comment 2"}, {Body: "Comment 3"}},
			User:      models.User{Login: "user2"},
			CreatedAt: time.Now(),
		},
		{
			ID:        3,
			Title:     "No labels issue",
			Body:      "Issue without any labels.",
			Labels:    []models.Label{},   // No labels
			Comments:  []models.Comment{}, // No comments
			User:      models.User{Login: "user3"},
			CreatedAt: time.Now(),
		},
	}
}

func createTestIssuesHealthy() []models.Issue {
	now := time.Now()
	return []models.Issue{
		{
			ID:        1,
			Title:     "Well maintained issue",
			Body:      "Good description",
			State:     "closed",
			Labels:    []models.Label{{Name: "bug"}},
			CreatedAt: now.AddDate(0, 0, -2),
			ClosedAt:  timePtr(now.AddDate(0, 0, -1)),
			User:      models.User{Login: "user1"},
		},
		{
			ID:        2,
			Title:     "Recent issue",
			Body:      "Recent description",
			State:     "open",
			Labels:    []models.Label{{Name: "enhancement"}},
			CreatedAt: now.AddDate(0, 0, -1),
			User:      models.User{Login: "user2"},
		},
	}
}

func createTestIssuesUnhealthy() []models.Issue {
	now := time.Now()
	return []models.Issue{
		{
			ID:        1,
			Title:     "Stale issue without labels",
			Body:      "Old issue",
			State:     "open",
			Labels:    []models.Label{},      // No labels
			CreatedAt: now.AddDate(0, -2, 0), // 2 months ago
			User:      models.User{Login: "user1"},
		},
		{
			ID:        2,
			Title:     "Another stale issue",
			Body:      "Another old issue",
			State:     "open",
			Labels:    []models.Label{},      // No labels
			CreatedAt: now.AddDate(0, -3, 0), // 3 months ago
			User:      models.User{Login: "user2"},
		},
	}
}

func timePtr(t time.Time) *time.Time {
	return &t
}

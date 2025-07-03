package content

import (
	"testing"
	"time"

	"github.com/nyasuto/beaver/internal/models"
)

func TestGenerateIssuesSummaryWithClassification(t *testing.T) {
	generator := NewGenerator()

	// Create test issues with classification data
	now := time.Now()
	issues := []models.Issue{
		{
			ID:        1,
			Number:    123,
			Title:     "Fix authentication bug",
			Body:      "Authentication fails with special characters",
			State:     "closed",
			CreatedAt: now.AddDate(0, 0, -7),
			UpdatedAt: now.AddDate(0, 0, -1),
			User: models.User{
				Login: "developer1",
			},
			Classification: &models.ClassificationInfo{
				Category:       "bug-fix",
				Confidence:     0.92,
				Reasoning:      "Clear bug report with error description",
				SuggestedTags:  []string{"authentication", "bug", "priority-high"},
				Method:         "hybrid",
				ProcessingTime: 0.85,
				ClassifiedAt:   now.AddDate(0, 0, -1),
				ModelUsed:      "gpt-4",
				AIConfidence:   0.95,
				RuleConfidence: 0.88,
			},
		},
		{
			ID:        2,
			Number:    124,
			Title:     "Add dark mode support",
			Body:      "Users want dark mode for better UX",
			State:     "open",
			CreatedAt: now.AddDate(0, 0, -5),
			UpdatedAt: now.AddDate(0, 0, -2),
			User: models.User{
				Login: "designer1",
			},
			Classification: &models.ClassificationInfo{
				Category:       "feature-request",
				Confidence:     0.88,
				Reasoning:      "New feature request with user story",
				SuggestedTags:  []string{"ui", "feature", "enhancement"},
				Method:         "ai",
				ProcessingTime: 1.2,
				ClassifiedAt:   now.AddDate(0, 0, -2),
				ModelUsed:      "gpt-4",
				AIConfidence:   0.88,
			},
		},
		{
			ID:        3,
			Number:    125,
			Title:     "Investigate database performance",
			Body:      "Need to research query optimization techniques",
			State:     "open",
			CreatedAt: now.AddDate(0, 0, -3),
			UpdatedAt: now.AddDate(0, 0, -1),
			User: models.User{
				Login: "architect1",
			},
			Classification: &models.ClassificationInfo{
				Category:       "learning",
				Confidence:     0.75,
				Reasoning:      "Research and investigation task",
				SuggestedTags:  []string{"research", "performance", "database"},
				Method:         "rule-based",
				ProcessingTime: 0.45,
				ClassifiedAt:   now.AddDate(0, 0, -1),
				RuleConfidence: 0.75,
			},
		},
	}

	// Generate Wiki page
	page, err := generator.GenerateIssuesSummary(issues, "TestProject")
	if err != nil {
		t.Fatalf("Failed to generate issues summary: %v", err)
	}

	// Verify page structure
	if page.Title != "TestProject - Issues Summary" {
		t.Errorf("Expected title 'TestProject - Issues Summary', got '%s'", page.Title)
	}

	if page.Filename != "Issues-Summary.md" {
		t.Errorf("Expected filename 'Issues-Summary.md', got '%s'", page.Filename)
	}

	// Verify content contains classification information
	content := page.Content

	// Check AI Classification Summary section
	if !containsString(content, "## 🤖 AI Classification Summary") {
		t.Error("Missing AI Classification Summary section")
	}

	if !containsString(content, "Total Classified**: 3") {
		t.Error("Missing total classified count")
	}

	if !containsString(content, "bug-fix**: 1") {
		t.Error("Missing bug-fix category count")
	}

	if !containsString(content, "feature-request**: 1") {
		t.Error("Missing feature-request category count")
	}

	if !containsString(content, "learning**: 1") {
		t.Error("Missing learning category count")
	}

	// Check individual issue classification display
	if !containsString(content, "**🤖 AI Classification**:") {
		t.Error("Missing individual issue classification section")
	}

	if !containsString(content, "Category**: `bug-fix`") {
		t.Error("Missing bug-fix category in individual issue")
	}

	if !containsString(content, "0.92 confidence") {
		t.Error("Missing confidence score in individual issue")
	}

	if !containsString(content, "Method**: hybrid") {
		t.Error("Missing classification method")
	}

	if !containsString(content, "Suggested Tags**: `authentication`, `bug`, `priority-high`") {
		t.Error("Missing suggested tags")
	}

	// Verify statistics are calculated correctly
	if !containsString(content, "Average Confidence**:") {
		t.Error("Missing average confidence calculation")
	}

	t.Logf("Generated Wiki content length: %d characters", len(content))
	t.Logf("Content preview: %s...", content[:min(200, len(content))])
}

func TestClassificationStatsCalculation(t *testing.T) {
	generator := NewGenerator()

	// Create test issues with various classification scenarios
	issues := []models.Issue{
		{
			ID:     1,
			Number: 1,
			Title:  "High confidence issue",
			Classification: &models.ClassificationInfo{
				Category:      "bug-fix",
				Confidence:    0.95,
				Method:        "ai",
				SuggestedTags: []string{"tag1", "tag2"},
			},
		},
		{
			ID:     2,
			Number: 2,
			Title:  "Medium confidence issue",
			Classification: &models.ClassificationInfo{
				Category:      "feature-request",
				Confidence:    0.75,
				Method:        "hybrid",
				SuggestedTags: []string{"tag2", "tag3"},
			},
		},
		{
			ID:     3,
			Number: 3,
			Title:  "Low confidence issue",
			Classification: &models.ClassificationInfo{
				Category:      "troubleshooting",
				Confidence:    0.45,
				Method:        "rule-based",
				SuggestedTags: []string{"tag1", "tag3", "tag4"},
			},
		},
		{
			ID:     4,
			Number: 4,
			Title:  "Unclassified issue",
			// No classification
		},
	}

	stats := generator.calculateClassificationStats(issues)

	// Test basic counts
	if stats.TotalClassified != 3 {
		t.Errorf("Expected 3 classified issues, got %d", stats.TotalClassified)
	}

	// Test category distribution
	expectedCategories := map[string]int{
		"bug-fix":         1,
		"feature-request": 1,
		"troubleshooting": 1,
	}

	for category, expectedCount := range expectedCategories {
		if stats.ByCategory[category] != expectedCount {
			t.Errorf("Expected %d issues in category %s, got %d", expectedCount, category, stats.ByCategory[category])
		}
	}

	// Test method distribution
	expectedMethods := map[string]int{
		"ai":         1,
		"hybrid":     1,
		"rule-based": 1,
	}

	for method, expectedCount := range expectedMethods {
		if stats.ByMethod[method] != expectedCount {
			t.Errorf("Expected %d issues with method %s, got %d", expectedCount, method, stats.ByMethod[method])
		}
	}

	// Test confidence statistics
	expectedAvgConfidence := (0.95 + 0.75 + 0.45) / 3.0
	if abs(stats.AverageConfidence-expectedAvgConfidence) > 0.01 {
		t.Errorf("Expected average confidence %.3f, got %.3f", expectedAvgConfidence, stats.AverageConfidence)
	}

	if stats.HighConfidenceCount != 1 { // >=0.8
		t.Errorf("Expected 1 high confidence issue, got %d", stats.HighConfidenceCount)
	}

	if stats.LowConfidenceCount != 1 { // <0.5
		t.Errorf("Expected 1 low confidence issue, got %d", stats.LowConfidenceCount)
	}

	// Test most common tags (should be sorted by frequency)
	expectedTopTags := []string{"tag1", "tag2", "tag3"} // Each appears 2, 2, 2 times
	if len(stats.MostCommonTags) < 3 {
		t.Errorf("Expected at least 3 common tags, got %d", len(stats.MostCommonTags))
	}

	// Check that common tags are present (order may vary due to equal counts)
	for _, expectedTag := range expectedTopTags {
		found := false
		for _, actualTag := range stats.MostCommonTags {
			if actualTag == expectedTag {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("Expected tag '%s' in most common tags, but not found", expectedTag)
		}
	}
}

// Helper functions for tests
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func abs(x float64) float64 {
	if x < 0 {
		return -x
	}
	return x
}

func containsString(s, substr string) bool {
	return len(s) >= len(substr) && indexOfString(s, substr) >= 0
}

func indexOfString(s, substr string) int {
	if len(substr) == 0 {
		return 0
	}
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return i
		}
	}
	return -1
}

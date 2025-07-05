package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/nyasuto/beaver/internal/config"
	"github.com/nyasuto/beaver/internal/models"
)

func TestExportAstroData(t *testing.T) {
	t.SkipNow()
	tests := []struct {
		name    string
		setup   func() (*config.Config, func())
		wantErr bool
	}{
		{
			name: "successful export with valid config",
			setup: func() (*config.Config, func()) {
				// Create temp directory for test
				tempDir := t.TempDir()

				// Change to temp directory
				oldWd, _ := os.Getwd()
				os.Chdir(tempDir)

				cfg := &config.Config{
					Project: config.ProjectConfig{
						Name:       "test-project",
						Repository: "test/repo",
					},
					Sources: config.SourcesConfig{
						GitHub: config.GitHubConfig{
							Token: "test-token",
						},
					},
				}

				return cfg, func() {
					os.Chdir(oldWd)
				}
			},
			wantErr: false,
		},
		{
			name: "config with empty token",
			setup: func() (*config.Config, func()) {
				cfg := &config.Config{
					Project: config.ProjectConfig{
						Name:       "test-project",
						Repository: "test/repo",
					},
					Sources: config.SourcesConfig{
						GitHub: config.GitHubConfig{
							Token: "",
						},
					},
				}
				return cfg, func() {}
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg, cleanup := tt.setup()
			defer cleanup()

			err := ExportAstroData(cfg)
			if (err != nil) != tt.wantErr {
				t.Errorf("ExportAstroData() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestConvertToAstroIssue(t *testing.T) {
	now := time.Now()
	issue := models.Issue{
		ID:     123,
		Number: 456,
		Title:  "Test Issue",
		Body:   "Test body content",
		State:  "open",
		Labels: []models.Label{
			{Name: "bug"},
			{Name: "priority: high"},
		},
		CreatedAt: now,
		UpdatedAt: now,
		HTMLURL:   "https://github.com/test/repo/issues/456",
		User: models.User{
			ID:        789,
			Login:     "testuser",
			AvatarURL: "https://avatar.url",
		},
	}

	result := convertToAstroIssue(issue)

	// Verify basic fields
	if result.ID != 123 {
		t.Errorf("Expected ID 123, got %d", result.ID)
	}
	if result.Number != 456 {
		t.Errorf("Expected Number 456, got %d", result.Number)
	}
	if result.Title != "Test Issue" {
		t.Errorf("Expected Title 'Test Issue', got %s", result.Title)
	}
	if result.State != "open" {
		t.Errorf("Expected State 'open', got %s", result.State)
	}

	// Verify labels
	if len(result.Labels) != 2 {
		t.Errorf("Expected 2 labels, got %d", len(result.Labels))
	}

	// Verify user
	if result.User.ID != 789 {
		t.Errorf("Expected User ID 789, got %d", result.User.ID)
	}
	if result.User.Login != "testuser" {
		t.Errorf("Expected User Login 'testuser', got %s", result.User.Login)
	}

	// Verify analysis exists
	if result.Analysis == nil {
		t.Error("Expected Analysis to be non-nil")
	}

	// Verify analysis contains expected values
	if result.Analysis.UrgencyScore == 0 {
		t.Error("Expected UrgencyScore to be calculated")
	}
}

func TestGenerateAstroStatistics(t *testing.T) {
	issues := []models.Issue{
		{State: "open", CreatedAt: time.Now().AddDate(0, 0, -1)},
		{State: "open", CreatedAt: time.Now().AddDate(0, 0, -2)},
		{State: "closed", CreatedAt: time.Now().AddDate(0, 0, -3)},
		{State: "closed", CreatedAt: time.Now().AddDate(0, 0, -4)},
	}

	stats := generateAstroStatistics(issues)

	if stats.TotalIssues != 4 {
		t.Errorf("Expected TotalIssues 4, got %d", stats.TotalIssues)
	}
	if stats.OpenIssues != 2 {
		t.Errorf("Expected OpenIssues 2, got %d", stats.OpenIssues)
	}
	if stats.ClosedIssues != 2 {
		t.Errorf("Expected ClosedIssues 2, got %d", stats.ClosedIssues)
	}
	if stats.HealthScore != 50.0 {
		t.Errorf("Expected HealthScore 50.0, got %f", stats.HealthScore)
	}
	if stats.Trends == nil {
		t.Error("Expected Trends to be non-nil")
	}
}

func TestGenerateAstroTrends(t *testing.T) {
	now := time.Now()
	issues := []models.Issue{
		{
			State:     "open",
			CreatedAt: now.AddDate(0, 0, -1), // Created yesterday
			UpdatedAt: now.AddDate(0, 0, -1),
			User:      models.User{Login: "user1"},
		},
		{
			State:     "closed",
			CreatedAt: now.AddDate(0, 0, -10), // Created 10 days ago
			UpdatedAt: now.AddDate(0, 0, -1),  // Updated yesterday
			User:      models.User{Login: "user2"},
		},
		{
			State:     "open",
			CreatedAt: now.AddDate(0, 0, -20), // Created 20 days ago
			UpdatedAt: now.AddDate(0, 0, -10),
			User:      models.User{Login: "user1"},
		},
	}

	trends := generateAstroTrends(issues)

	if trends == nil {
		t.Fatal("Expected trends to be non-nil")
	}
	if trends.WeeklySummary == nil {
		t.Fatal("Expected WeeklySummary to be non-nil")
	}

	// Should have 1 issue created this week
	if trends.WeeklySummary.CreatedThisWeek != 1 {
		t.Errorf("Expected CreatedThisWeek 1, got %d", trends.WeeklySummary.CreatedThisWeek)
	}

	// Should have 1 issue closed this week
	if trends.WeeklySummary.ClosedThisWeek != 1 {
		t.Errorf("Expected ClosedThisWeek 1, got %d", trends.WeeklySummary.ClosedThisWeek)
	}

	// Should have 2 unique contributors
	if trends.WeeklySummary.ActiveContributors != 2 {
		t.Errorf("Expected ActiveContributors 2, got %d", trends.WeeklySummary.ActiveContributors)
	}
}

func TestGenerateAstroNavigation(t *testing.T) {
	issues := []AstroIssue{
		{
			Number: 1,
			Title:  "High priority issue",
			State:  "open",
			Analysis: &AstroAnalysis{
				UrgencyScore: 50,
			},
		},
		{
			Number: 2,
			Title:  "Low priority issue",
			State:  "open",
			Analysis: &AstroAnalysis{
				UrgencyScore: 10,
			},
		},
	}

	nav := generateAstroNavigation(issues)

	if len(nav.TOC) == 0 {
		t.Error("Expected navigation to have TOC items")
	}

	// Check that navigation contains expected sections
	expectedSections := []string{
		"⚡ 緊急アクション (Top 3)",
		"🔍 クイックアクセス",
		"📊 プロジェクト状況",
	}

	for _, expected := range expectedSections {
		found := false
		for _, item := range nav.TOC {
			if item.Title == expected {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("Expected navigation section '%s' not found", expected)
		}
	}
}

func TestGenerateAstroMetadata(t *testing.T) {
	cfg := &config.Config{
		Project: config.ProjectConfig{
			Repository: "test/repo",
		},
	}

	metadata := generateAstroMetadata(cfg)

	if metadata.Repository != "test/repo" {
		t.Errorf("Expected Repository 'test/repo', got %s", metadata.Repository)
	}
	if metadata.Version == "" {
		t.Error("Expected Version to be set")
	}
	if metadata.BuildInfo == nil {
		t.Error("Expected BuildInfo to be non-nil")
	}
	if metadata.GeneratedAt == "" {
		t.Error("Expected GeneratedAt to be set")
	}
}

func TestWriteAstroData(t *testing.T) {
	tempDir := t.TempDir()
	oldWd, _ := os.Getwd()
	os.Chdir(tempDir)
	defer os.Chdir(oldWd)

	data := AstroDataExport{
		Issues: []AstroIssue{
			{
				ID:     1,
				Number: 123,
				Title:  "Test Issue",
			},
		},
		Statistics: AstroStatistics{
			TotalIssues: 1,
		},
		Navigation: AstroNavigation{
			TOC: []AstroNavigationItem{},
		},
		Metadata: AstroMetadata{
			Repository: "test/repo",
		},
	}

	err := writeAstroData(data)
	if err != nil {
		t.Errorf("writeAstroData() error = %v", err)
	}

	// Verify file was created
	expectedPath := filepath.Join("frontend", "astro", "src", "data", "beaver.json")
	if _, err := os.Stat(expectedPath); os.IsNotExist(err) {
		t.Errorf("Expected file %s to be created", expectedPath)
	}

	// Verify file content
	content, err := os.ReadFile(expectedPath)
	if err != nil {
		t.Errorf("Failed to read created file: %v", err)
	}

	var result AstroDataExport
	if err := json.Unmarshal(content, &result); err != nil {
		t.Errorf("Failed to unmarshal created JSON: %v", err)
	}

	if len(result.Issues) != 1 {
		t.Errorf("Expected 1 issue in result, got %d", len(result.Issues))
	}
}

func TestLoadCategoryMapping(t *testing.T) {
	tests := []struct {
		name     string
		setup    func() func() // Returns cleanup function
		expected string
	}{
		{
			name: "no config file - returns default",
			setup: func() func() {
				return func() {}
			},
			expected: "general",
		},
		{
			name: "valid config file",
			setup: func() func() {
				tempDir := t.TempDir()
				oldWd, _ := os.Getwd()
				os.Chdir(tempDir)

				mapping := CategoryMapping{
					LabelMappings:   map[string]string{"bug": "bug"},
					DefaultCategory: "custom",
				}
				data, _ := json.Marshal(mapping)
				os.WriteFile("category-mapping.json", data, 0600)

				return func() { os.Chdir(oldWd) }
			},
			expected: "custom",
		},
		{
			name: "invalid JSON file",
			setup: func() func() {
				tempDir := t.TempDir()
				oldWd, _ := os.Getwd()
				os.Chdir(tempDir)

				os.WriteFile("category-mapping.json", []byte("invalid json"), 0600)

				return func() { os.Chdir(oldWd) }
			},
			expected: "general", // Should fall back to default
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cleanup := tt.setup()
			defer cleanup()

			mapping, err := loadCategoryMapping()
			if err != nil {
				t.Errorf("loadCategoryMapping() error = %v", err)
			}

			if mapping.DefaultCategory != tt.expected {
				t.Errorf("Expected DefaultCategory %s, got %s", tt.expected, mapping.DefaultCategory)
			}
		})
	}
}

func TestCategorizeIssue(t *testing.T) {
	tests := []struct {
		name     string
		issue    models.Issue
		expected string
	}{
		{
			name: "bug label",
			issue: models.Issue{
				Labels: []models.Label{{Name: "type: bug"}},
			},
			expected: "bug",
		},
		{
			name: "feature label",
			issue: models.Issue{
				Labels: []models.Label{{Name: "type: feature"}},
			},
			expected: "feature",
		},
		{
			name: "no matching labels",
			issue: models.Issue{
				Labels: []models.Label{{Name: "random"}},
			},
			expected: "general",
		},
		{
			name: "multiple labels - first match wins",
			issue: models.Issue{
				Labels: []models.Label{
					{Name: "type: bug"},
					{Name: "type: feature"},
				},
			},
			expected: "bug",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := categorizeIssue(tt.issue)
			if result != tt.expected {
				t.Errorf("categorizeIssue() = %s, expected %s", result, tt.expected)
			}
		})
	}
}

func TestExtractTags(t *testing.T) {
	issue := models.Issue{
		Labels: []models.Label{
			{Name: "bug"},
			{Name: "priority: high"},
			{Name: ""}, // Empty label should be ignored
		},
	}

	tags := extractTags(issue)

	expectedTags := []string{"bug", "priority: high"}
	if len(tags) != len(expectedTags) {
		t.Errorf("Expected %d tags, got %d", len(expectedTags), len(tags))
	}

	for i, expected := range expectedTags {
		if tags[i] != expected {
			t.Errorf("Expected tag %s, got %s", expected, tags[i])
		}
	}
}

func TestCalculateUrgencyScore(t *testing.T) {
	tests := []struct {
		name     string
		issue    models.Issue
		minScore int
	}{
		{
			name: "high priority bug",
			issue: models.Issue{
				Labels: []models.Label{
					{Name: "priority: high"},
					{Name: "type: bug"},
				},
				CreatedAt: time.Now().AddDate(0, 0, -1), // Recent
			},
			minScore: 50, // 30 (high priority) + 20 (bug) + 10 (recent) = 60
		},
		{
			name: "medium priority feature",
			issue: models.Issue{
				Labels: []models.Label{
					{Name: "priority: medium"},
					{Name: "type: feature"},
				},
				CreatedAt: time.Now().AddDate(0, 0, -10), // Not recent
			},
			minScore: 20, // 15 (medium priority) + 10 (feature) = 25
		},
		{
			name: "old issue with no priority",
			issue: models.Issue{
				Labels:    []models.Label{},
				CreatedAt: time.Now().AddDate(0, 0, -100), // Very old
			},
			minScore: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := calculateUrgencyScore(tt.issue)
			if score < tt.minScore {
				t.Errorf("Expected score >= %d, got %d", tt.minScore, score)
			}
		})
	}
}

func TestGetTopUrgentIssues(t *testing.T) {
	issues := []AstroIssue{
		{
			Number:   1,
			State:    "open",
			Analysis: &AstroAnalysis{UrgencyScore: 50},
		},
		{
			Number:   2,
			State:    "open",
			Analysis: &AstroAnalysis{UrgencyScore: 20},
		},
		{
			Number:   3,
			State:    "closed",
			Analysis: &AstroAnalysis{UrgencyScore: 60},
		},
	}

	urgent := getTopUrgentIssues(issues, 5)

	// Should only return open issues with high urgency (>= 35)
	if len(urgent) != 1 {
		t.Errorf("Expected 1 urgent issue, got %d", len(urgent))
	}

	if len(urgent) > 0 && urgent[0].Number != 1 {
		t.Errorf("Expected urgent issue #1, got #%d", urgent[0].Number)
	}
}

func TestTruncateTitle(t *testing.T) {
	tests := []struct {
		name     string
		title    string
		maxLen   int
		expected string
	}{
		{
			name:     "short title",
			title:    "Short",
			maxLen:   10,
			expected: "Short",
		},
		{
			name:     "exact length",
			title:    "Exactly10",
			maxLen:   9,
			expected: "Exactly10",
		},
		{
			name:     "long title gets truncated",
			title:    "This is a very long title that should be truncated",
			maxLen:   10,
			expected: "This is a ...",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := truncateTitle(tt.title, tt.maxLen)
			if result != tt.expected {
				t.Errorf("truncateTitle() = %q, expected %q", result, tt.expected)
			}
		})
	}
}

func TestGetDefaultCategoryMapping(t *testing.T) {
	mapping := getDefaultCategoryMapping()

	if mapping == nil {
		t.Fatal("Expected mapping to be non-nil")
	}

	if mapping.DefaultCategory != "general" {
		t.Errorf("Expected DefaultCategory 'general', got %s", mapping.DefaultCategory)
	}

	if len(mapping.LabelMappings) == 0 {
		t.Error("Expected LabelMappings to have entries")
	}

	// Test some specific mappings
	if mapping.LabelMappings["type: bug"] != "bug" {
		t.Error("Expected 'type: bug' to map to 'bug'")
	}

	if mapping.LabelMappings["type: feature"] != "feature" {
		t.Error("Expected 'type: feature' to map to 'feature'")
	}
}

package main

import (
	"testing"
	"time"

	"github.com/nyasuto/beaver/internal/models"
)

// TestCategorizeIssue_RealDataDistribution tests categorization logic
// against actual open issues from nyasuto/beaver repository.
// This test represents the EXPECTED correct categorization behavior
// and should PASS after fixing the critical-bias problem.
func TestCategorizeIssue_RealDataDistribution(t *testing.T) {
	// Real open issues from nyasuto/beaver (as of 2025-07-05)
	testCases := []struct {
		name             string
		issue            models.Issue
		expectedCategory string
		currentProblem   string
	}{
		{
			name: "Issue #492 - Investigation (no labels)",
			issue: models.Issue{
				ID:     492,
				Title:  "🔍 CategoryShortcuts分類ロジック調査: Critical偏重問題の解決",
				Body:   "CategoryShortcuts分類ロジック調査",
				Labels: []models.Label{}, // No labels
			},
			expectedCategory: "general",
			currentProblem:   "incorrectly classified as critical due to 'important' keyword in body",
		},
		{
			name: "Issue #474 - Feature with medium priority",
			issue: models.Issue{
				ID:    474,
				Title: "feat: コードカバレッジ情報のダッシュボード表示機能設計",
				Body:  "コードカバレッジ情報のダッシュボード表示機能設計",
				Labels: []models.Label{
					{Name: "priority: medium"},
					{Name: "type: feature"},
				},
			},
			expectedCategory: "feature",
			currentProblem:   "incorrectly classified as critical instead of feature",
		},
		{
			name: "Issue #470 - Test coverage improvement",
			issue: models.Issue{
				ID:    470,
				Title: "feat: cmdディレクトリのコードカバレッジ向上",
				Body:  "テストカバレッジ向上",
				Labels: []models.Label{
					{Name: "priority: high"},
					{Name: "type: test"},
				},
			},
			expectedCategory: "test",
			currentProblem:   "incorrectly classified as critical due to 'priority: high' label",
		},
		{
			name: "Issue #455 - High priority feature",
			issue: models.Issue{
				ID:    455,
				Title: "feat: コード規模可視化機能実装",
				Body:  "コード規模可視化機能実装",
				Labels: []models.Label{
					{Name: "priority: high"},
					{Name: "type: feature"},
				},
			},
			expectedCategory: "feature",
			currentProblem:   "incorrectly classified as critical due to 'priority: high' label",
		},
		{
			name: "Issue #451 - Enhancement",
			issue: models.Issue{
				ID:    451,
				Title: "📈 MEDIUM: Issue #367対応 - Advanced UX機能実装",
				Body:  "Advanced UX機能実装",
				Labels: []models.Label{
					{Name: "priority: medium"},
					{Name: "type: enhancement"},
				},
			},
			expectedCategory: "feature",
			currentProblem:   "incorrectly classified as critical",
		},
		{
			name: "Issue #369 - Business feature",
			issue: models.Issue{
				ID:    369,
				Title: "BUSINESS: 経営・マネジメント視点での情報可視化改善",
				Body:  "意思決定支援ダッシュボード",
				Labels: []models.Label{
					{Name: "priority: high"},
					{Name: "type: feature"},
				},
			},
			expectedCategory: "feature",
			currentProblem:   "incorrectly classified as critical due to 'priority: high' and 'important' keywords",
		},
		{
			name: "Issue #197 - Documentation/Wiki",
			issue: models.Issue{
				ID:    197,
				Title: "🦫 【メタ戦略】Beaver自己文書化システム",
				Body:  "開発戦略のリアルタイムWiki化",
				Labels: []models.Label{
					{Name: "priority: medium"},
					{Name: "type: feature"},
				},
			},
			expectedCategory: "feature", // Explicit type: feature label takes priority over content
			currentProblem:   "explicit type labels now take precedence over content-based classification",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Set required fields for categorization
			tc.issue.CreatedAt = time.Now()
			tc.issue.UpdatedAt = time.Now()
			tc.issue.User = models.User{Login: "test-user"}

			result := categorizeIssue(tc.issue)

			if result != tc.expectedCategory {
				t.Errorf("Issue #%d categorization failed:\n"+
					"  Expected: %s\n"+
					"  Got:      %s\n"+
					"  Problem:  %s\n"+
					"  Title:    %s",
					tc.issue.ID,
					tc.expectedCategory,
					result,
					tc.currentProblem,
					tc.issue.Title)
			}
		})
	}
}

// TestCategorizeIssue_ExpectedDistribution verifies that the current
// 12 open issues are distributed correctly across categories.
// This test should PASS after fixing the critical-bias problem.
func TestCategorizeIssue_ExpectedDistribution(t *testing.T) {
	// Expected distribution based on real data analysis
	// Updated after fixing categorization logic and implementing type label priority
	expectedDistribution := map[string]int{
		"feature":     7, // Most issues are features (issue #197 now correctly classified as feature due to type label)
		"test":        1, // Only #470 is test-related
		"docs":        0, // No docs issues (issue #197 has explicit type: feature label)
		"general":     1, // Only #492 has no specific category
		"critical":    0, // No actual critical issues
		"bug":         0, // No bugs in current open issues
		"deploy":      0, // No deployment issues
		"performance": 0, // No performance issues
		"security":    0, // No security issues
	}

	// Simulate real issues (simplified)
	issues := []models.Issue{
		{ID: 474, Title: "feat: coverage", Labels: []models.Label{{Name: "type: feature"}}},
		{ID: 470, Title: "test coverage", Labels: []models.Label{{Name: "type: test"}}},
		{ID: 455, Title: "feat: visualization", Labels: []models.Label{{Name: "type: feature"}}},
		{ID: 197, Title: "文書化システム Wiki", Labels: []models.Label{{Name: "type: feature"}}},
		{ID: 492, Title: "investigation", Labels: []models.Label{}},
		// Add more representative issues...
		{ID: 451, Title: "UX enhancement", Labels: []models.Label{{Name: "type: enhancement"}}},
		{ID: 369, Title: "business feature", Labels: []models.Label{{Name: "type: feature"}}},
		{ID: 359, Title: "multi repo feature", Labels: []models.Label{{Name: "type: feature"}}},
		{ID: 358, Title: "web dashboard feature", Labels: []models.Label{{Name: "type: feature"}}},
	}

	// Set required fields
	for i := range issues {
		issues[i].CreatedAt = time.Now()
		issues[i].UpdatedAt = time.Now()
		issues[i].User = models.User{Login: "test-user"}
	}

	// Count actual distribution
	actualDistribution := make(map[string]int)
	for _, issue := range issues {
		category := categorizeIssue(issue)
		actualDistribution[category]++
	}

	// Debug: Print actual distribution (for verification)
	t.Logf("Actual distribution:")
	for category, count := range actualDistribution {
		t.Logf("  %s: %d", category, count)
	}

	// Compare with expected distribution
	for expectedCategory, expectedCount := range expectedDistribution {
		actualCount := actualDistribution[expectedCategory]
		if actualCount != expectedCount {
			t.Errorf("Category '%s' distribution mismatch:\n"+
				"  Expected: %d issues\n"+
				"  Got:      %d issues\n"+
				"  This indicates categorization logic bias",
				expectedCategory, expectedCount, actualCount)
		}
	}

	// Special check for critical bias problem
	criticalCount := actualDistribution["critical"]
	if criticalCount > 2 {
		t.Errorf("CRITICAL BIAS DETECTED: %d issues classified as critical\n"+
			"  Expected: 0-2 issues\n"+
			"  This suggests the 'critical' filter is too broad\n"+
			"  Check keywords: 'important', 'priority: high', etc.",
			criticalCount)
	}
}

// TestCategorizeIssue_KeywordProblemDemonstration demonstrates specific
// keyword issues that cause wrong categorization.
// This test should FAIL and show exactly which keywords are problematic.
func TestCategorizeIssue_KeywordProblemDemonstration(t *testing.T) {
	problemCases := []struct {
		name               string
		issue              models.Issue
		problematicKeyword string
		wrongCategory      string
		correctCategory    string
	}{
		{
			name: "High priority feature wrongly classified as critical",
			issue: models.Issue{
				Title:  "Important feature implementation",
				Body:   "This is an important feature for the project",
				Labels: []models.Label{{Name: "priority: high"}, {Name: "type: feature"}},
			},
			problematicKeyword: "important OR priority: high",
			wrongCategory:      "critical",
			correctCategory:    "feature",
		},
		{
			name: "Test with high priority wrongly classified as critical",
			issue: models.Issue{
				Title:  "Test coverage improvement",
				Body:   "Improve test coverage for important modules",
				Labels: []models.Label{{Name: "type: test"}, {Name: "priority: high"}},
			},
			problematicKeyword: "priority: high OR important",
			wrongCategory:      "critical",
			correctCategory:    "test",
		},
		{
			name: "Documentation with 'important' wrongly classified as critical",
			issue: models.Issue{
				Title:  "Documentation update",
				Body:   "Update important documentation sections",
				Labels: []models.Label{{Name: "type: docs"}},
			},
			problematicKeyword: "important",
			wrongCategory:      "critical",
			correctCategory:    "docs",
		},
	}

	for _, tc := range problemCases {
		t.Run(tc.name, func(t *testing.T) {
			// Set required fields
			tc.issue.CreatedAt = time.Now()
			tc.issue.UpdatedAt = time.Now()
			tc.issue.User = models.User{Login: "test-user"}

			result := categorizeIssue(tc.issue)

			// This test expects the current logic to fail
			if result == tc.wrongCategory {
				t.Errorf("CONFIRMED: Problematic keyword detected\n"+
					"  Keyword causing issue: %s\n"+
					"  Current classification: %s (WRONG)\n"+
					"  Should be classified as: %s\n"+
					"  Issue: %s",
					tc.problematicKeyword,
					result,
					tc.correctCategory,
					tc.issue.Title)
			}

			// Additional verification: ensure it's not correctly classified yet
			if result == tc.correctCategory {
				t.Logf("UNEXPECTED: Issue correctly classified as %s (logic may already be fixed)", result)
			}
		})
	}
}

package classification

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewRuleEngine(t *testing.T) {
	tests := []struct {
		name        string
		ruleSet     *RuleSet
		expectError bool
	}{
		{
			name:        "nil rule set",
			ruleSet:     nil,
			expectError: true,
		},
		{
			name:        "valid rule set",
			ruleSet:     GetDefaultRuleSet(),
			expectError: false,
		},
		{
			name: "invalid regex pattern",
			ruleSet: &RuleSet{
				Version: "1.0.0",
				Config: RuleSetConfig{
					DefaultCategory: CategoryFeature,
					MatchThreshold:  0.5,
					Language:        "ja",
				},
				Rules: []Rule{
					{
						ID:       "test-rule",
						Name:     "Test Rule",
						Category: CategoryBug,
						Priority: PriorityHigh,
						Enabled:  true,
						Patterns: []string{"[invalid regex"},
						Weight:   1.0,
						Conditions: RuleConditions{
							TitleMatch: true,
						},
					},
				},
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			engine, err := NewRuleEngine(tt.ruleSet)
			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, engine)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, engine)
			}
		})
	}
}

func TestRuleEngine_ClassifyIssue(t *testing.T) {
	engine, err := NewRuleEngine(GetDefaultRuleSet())
	require.NoError(t, err)

	tests := []struct {
		name             string
		issue            Issue
		expectedCategory Category
		minConfidence    float64
	}{
		{
			name: "feature issue with Japanese keywords",
			issue: Issue{
				ID:     1,
				Number: 1,
				Title:  "新機能を追加したい",
				Body:   "新しい機能の実装をお願いします。",
				Labels: []string{},
			},
			expectedCategory: CategoryFeature,
			minConfidence:    0.6,
		},
		{
			name: "bug issue with English keywords",
			issue: Issue{
				ID:     2,
				Number: 2,
				Title:  "Bug in user login",
				Body:   "There's an error when users try to log in. The system crashes.",
				Labels: []string{},
			},
			expectedCategory: CategoryBug,
			minConfidence:    0.6,
		},
		{
			name: "enhancement issue",
			issue: Issue{
				ID:     3,
				Number: 3,
				Title:  "Improve performance",
				Body:   "We need to optimize the database queries for better performance.",
				Labels: []string{},
			},
			expectedCategory: CategoryEnhancement,
			minConfidence:    0.4,
		},
		{
			name: "documentation issue",
			issue: Issue{
				ID:     4,
				Number: 4,
				Title:  "Update documentation",
				Body:   "The README file needs to be updated with new installation instructions.",
				Labels: []string{},
			},
			expectedCategory: CategoryDocs,
			minConfidence:    0.5,
		},
		{
			name: "test issue",
			issue: Issue{
				ID:     5,
				Number: 5,
				Title:  "Add unit tests",
				Body:   "We need more test coverage for the authentication module.",
				Labels: []string{},
			},
			expectedCategory: CategoryTest,
			minConfidence:    0.5,
		},
		{
			name: "ambiguous issue",
			issue: Issue{
				ID:     6,
				Number: 6,
				Title:  "General improvement",
				Body:   "Some general improvements needed.",
				Labels: []string{},
			},
			expectedCategory: CategoryEnhancement, // "improvement" should match enhancement
			minConfidence:    0.4,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := engine.ClassifyIssue(context.Background(), tt.issue)
			assert.NoError(t, err)
			assert.NotNil(t, result)
			assert.Equal(t, tt.expectedCategory, result.Category)
			assert.GreaterOrEqual(t, result.Confidence, tt.minConfidence)
			assert.Equal(t, "rule-based", result.Method)
			assert.Greater(t, result.ProcessingTime, 0.0)
			assert.NotEmpty(t, result.Timestamp)
		})
	}
}

func TestRuleEngine_ClassifyIssueWithComments(t *testing.T) {
	engine, err := NewRuleEngine(GetDefaultRuleSet())
	require.NoError(t, err)

	issue := Issue{
		ID:     1,
		Number: 1,
		Title:  "General issue",
		Body:   "Some general content.",
		Comments: []string{
			"This looks like a bug to me.",
			"I agree, the system is crashing.",
		},
		Labels: []string{},
	}

	result, err := engine.ClassifyIssue(context.Background(), issue)
	assert.NoError(t, err)
	assert.NotNil(t, result)

	// Should detect bug from comments
	assert.Equal(t, CategoryBug, result.Category)
	assert.Greater(t, result.Confidence, 0.0)

	// Check that matches include comment matches
	hasCommentMatch := false
	for _, match := range result.Matches {
		if match.MatchType == "keyword-comment" || match.MatchType == "pattern-comment" {
			hasCommentMatch = true
			break
		}
	}
	assert.True(t, hasCommentMatch, "Should have at least one comment match")
}

func TestRuleEngine_ClassifyIssueWithLabels(t *testing.T) {
	// Create a custom rule set that includes label matching
	ruleSet := &RuleSet{
		Version: "1.0.0",
		Config: RuleSetConfig{
			DefaultCategory: CategoryFeature,
			MatchThreshold:  0.5,
			Language:        "ja",
		},
		Rules: []Rule{
			{
				ID:       "label-bug",
				Name:     "Bug Label Rule",
				Category: CategoryBug,
				Priority: PriorityHigh,
				Enabled:  true,
				Keywords: []string{"bug"},
				Weight:   1.0,
				Conditions: RuleConditions{
					LabelsMatch: true,
				},
			},
		},
	}

	engine, err := NewRuleEngine(ruleSet)
	require.NoError(t, err)

	issue := Issue{
		ID:     1,
		Number: 1,
		Title:  "Some issue",
		Body:   "General content",
		Labels: []string{"bug", "priority-high"},
	}

	result, err := engine.ClassifyIssue(context.Background(), issue)
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, CategoryBug, result.Category)
	assert.Equal(t, 1.0, result.Confidence) // Label matches have confidence 1.0
}

func TestRuleEngine_UpdateRuleSet(t *testing.T) {
	engine, err := NewRuleEngine(GetDefaultRuleSet())
	require.NoError(t, err)

	// Create a new rule set
	newRuleSet := &RuleSet{
		Version: "2.0.0",
		Config: RuleSetConfig{
			DefaultCategory: CategoryBug,
			MatchThreshold:  0.7,
			Language:        "en",
		},
		Rules: []Rule{
			{
				ID:       "simple-rule",
				Name:     "Simple Rule",
				Category: CategoryFeature,
				Priority: PriorityMedium,
				Enabled:  true,
				Keywords: []string{"test"},
				Weight:   1.0,
				Conditions: RuleConditions{
					TitleMatch: true,
				},
			},
		},
	}

	err = engine.UpdateRuleSet(newRuleSet)
	assert.NoError(t, err)
	assert.Equal(t, "2.0.0", engine.GetRuleSet().Version)
	assert.Equal(t, CategoryBug, engine.GetRuleSet().Config.DefaultCategory)
}

func TestCheckKeywordMatches(t *testing.T) {
	engine, err := NewRuleEngine(GetDefaultRuleSet())
	require.NoError(t, err)

	rule := Rule{
		ID:       "test-rule",
		Name:     "Test Rule",
		Category: CategoryFeature,
		Keywords: []string{"feature", "機能"},
		Weight:   1.0,
		Conditions: RuleConditions{
			TitleMatch: true,
			BodyMatch:  true,
		},
	}

	issue := Issue{
		Title: "New feature request",
		Body:  "We need a new 機能 in the system",
	}

	matches := engine.checkKeywordMatches(rule, issue)
	assert.Len(t, matches, 2) // One for title, one for body

	// Check title match
	titleMatch := false
	bodyMatch := false
	for _, match := range matches {
		if match.MatchType == "keyword-title" {
			titleMatch = true
			assert.Equal(t, "feature", match.MatchedText)
		}
		if match.MatchType == "keyword-body" {
			bodyMatch = true
			assert.Equal(t, "機能", match.MatchedText)
		}
	}
	assert.True(t, titleMatch)
	assert.True(t, bodyMatch)
}

func TestCheckPatternMatches(t *testing.T) {
	ruleSet := &RuleSet{
		Version: "1.0.0",
		Config: RuleSetConfig{
			DefaultCategory: CategoryFeature,
			MatchThreshold:  0.5,
			Language:        "ja",
		},
		Rules: []Rule{
			{
				ID:       "pattern-rule",
				Name:     "Pattern Rule",
				Category: CategoryBug,
				Priority: PriorityHigh,
				Enabled:  true,
				Patterns: []string{`(?i)\b(crash|error)\b`},
				Weight:   1.0,
				Conditions: RuleConditions{
					TitleMatch: true,
					BodyMatch:  true,
				},
			},
		},
	}

	engine, err := NewRuleEngine(ruleSet)
	require.NoError(t, err)

	issue := Issue{
		Title: "Application crash issue",
		Body:  "The app shows an ERROR message and stops working",
	}

	result, err := engine.ClassifyIssue(context.Background(), issue)
	assert.NoError(t, err)
	assert.Equal(t, CategoryBug, result.Category)
	assert.Greater(t, result.Confidence, 0.0)

	// Should have pattern matches
	hasPatternMatch := false
	for _, match := range result.Matches {
		if match.MatchType == "pattern-title" || match.MatchType == "pattern-body" {
			hasPatternMatch = true
			break
		}
	}
	assert.True(t, hasPatternMatch)
}

func TestGetDefaultRuleSet(t *testing.T) {
	ruleSet := GetDefaultRuleSet()
	assert.NotNil(t, ruleSet)
	assert.Equal(t, "1.0.0", ruleSet.Version)
	assert.Greater(t, len(ruleSet.Rules), 0)
	assert.Equal(t, CategoryFeature, ruleSet.Config.DefaultCategory)
	assert.Equal(t, "ja", ruleSet.Config.Language)

	// Verify all rules have required fields
	for _, rule := range ruleSet.Rules {
		assert.NotEmpty(t, rule.ID)
		assert.NotEmpty(t, rule.Name)
		assert.NotEmpty(t, rule.Category)
		assert.Greater(t, rule.Weight, 0.0)
		assert.True(t, len(rule.Keywords) > 0 || len(rule.Patterns) > 0)
	}
}

func BenchmarkClassifyIssue(b *testing.B) {
	engine, err := NewRuleEngine(GetDefaultRuleSet())
	require.NoError(b, err)

	issue := Issue{
		ID:     1,
		Number: 1,
		Title:  "新機能の実装: ユーザー認証システム",
		Body:   "新しいユーザー認証システムの機能を実装したいと思います。セキュリティを考慮した設計が必要です。",
		Labels: []string{"feature", "security"},
		Comments: []string{
			"良いアイデアですね。",
			"実装方法について議論しましょう。",
		},
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := engine.ClassifyIssue(context.Background(), issue)
		assert.NoError(b, err)
	}
}

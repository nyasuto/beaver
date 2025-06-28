package classification

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestFullIntegration tests the complete classification workflow
func TestFullIntegration(t *testing.T) {
	// Setup temporary directory for config
	tempDir := t.TempDir()

	// Create mock AI server
	aiServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Parse request to determine response
		var req AIClassificationRequest
		json.NewDecoder(r.Body).Decode(&req)

		response := AIClassificationResponse{
			Category:       "feature",
			Confidence:     0.85,
			Reasoning:      "Detected feature-related keywords",
			ProcessingTime: 0.2,
			ModelUsed:      "gpt-4",
		}

		// Adjust response based on issue content
		if req.Issue.Title == "システムバグ" {
			response.Category = "bug"
			response.Confidence = 0.9
		} else if req.Issue.Title == "ドキュメント更新" {
			response.Category = "docs"
			response.Confidence = 0.9
		} else if req.Issue.Title == "テストカバレッジ向上" {
			response.Category = "test"
			response.Confidence = 0.9
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}))
	defer aiServer.Close()

	// Create configuration manager
	configPath := filepath.Join(tempDir, "rules.yml")
	cm := NewConfigManager(configPath)

	// Load default rule set
	ruleSet, err := cm.LoadRuleSet()
	require.NoError(t, err)

	// Create rule engine
	ruleEngine, err := NewRuleEngine(ruleSet)
	require.NoError(t, err)

	// Create AI client
	aiClient := NewAIClient(aiServer.URL, 5*time.Second)

	// Create hybrid config
	hybridConfig := HybridClassificationConfig{
		AIWeight:         0.7,
		RuleWeight:       0.3,
		MinConfidence:    0.5,
		AIServiceURL:     aiServer.URL,
		AIServiceTimeout: 10 * time.Second,
	}

	// Create hybrid classifier
	hybridClassifier := NewHybridClassifier(ruleEngine, aiClient, hybridConfig)

	// Test cases
	testCases := []struct {
		name             string
		issue            Issue
		expectedCategory Category
		method           string
		minConfidence    float64
	}{
		{
			name: "Japanese feature request",
			issue: Issue{
				ID:     1,
				Number: 1,
				Title:  "新機能の追加要求",
				Body:   "ユーザー管理システムの新しい機能を実装したいです。",
				Labels: []string{},
			},
			expectedCategory: CategoryFeature,
			method:           "hybrid",
			minConfidence:    0.6,
		},
		{
			name: "Bug report with Japanese",
			issue: Issue{
				ID:     2,
				Number: 2,
				Title:  "システムバグ",
				Body:   "アプリケーションでエラーが発生しています。修正が必要です。",
				Labels: []string{},
			},
			expectedCategory: CategoryBug,
			method:           "hybrid",
			minConfidence:    0.7,
		},
		{
			name: "Documentation update",
			issue: Issue{
				ID:     3,
				Number: 3,
				Title:  "ドキュメント更新",
				Body:   "READMEファイルの説明を更新する必要があります。",
				Labels: []string{},
			},
			expectedCategory: CategoryDocs,
			method:           "hybrid",
			minConfidence:    0.5,
		},
	}

	// Execute test cases
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result, err := hybridClassifier.ClassifyIssue(context.Background(), tc.issue)
			assert.NoError(t, err)
			assert.NotNil(t, result)
			assert.Equal(t, tc.expectedCategory, result.Category)
			assert.Equal(t, tc.method, result.Method)
			assert.GreaterOrEqual(t, result.Confidence, tc.minConfidence)
			assert.NotNil(t, result.AIResult)
			assert.NotNil(t, result.RuleResult)
			assert.Greater(t, result.ProcessingTime, 0.0)
		})
	}
}

// TestConfigurationRoundTrip tests complete configuration save/load cycle
func TestConfigurationRoundTrip(t *testing.T) {
	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "rules.yml")

	cm := NewConfigManager(configPath)

	// Create custom rule set
	originalRuleSet := &RuleSet{
		Version: "2.0.0",
		Config: RuleSetConfig{
			DefaultCategory: CategoryEnhancement,
			MatchThreshold:  0.6,
			Language:        "en",
		},
		Rules: []Rule{
			{
				ID:          "custom-feature",
				Name:        "Custom Feature Rule",
				Description: "Detects custom feature requests",
				Category:    CategoryFeature,
				Priority:    PriorityHigh,
				Enabled:     true,
				Keywords:    []string{"custom", "カスタム"},
				Patterns:    []string{`(?i)\bcustom\s+feature\b`},
				Weight:      1.2,
				Conditions: RuleConditions{
					TitleMatch: true,
					BodyMatch:  true,
				},
			},
		},
	}

	// Save rule set
	err := cm.SaveRuleSet(originalRuleSet)
	require.NoError(t, err)

	// Create hybrid config
	originalHybridConfig := &HybridClassificationConfig{
		AIWeight:         0.8,
		RuleWeight:       0.2,
		MinConfidence:    0.6,
		AIServiceURL:     "http://custom.ai.service",
		AIServiceTimeout: 45 * time.Second,
	}

	// Save hybrid config
	err = cm.SaveHybridConfig(originalHybridConfig)
	require.NoError(t, err)

	// Load rule set
	loadedRuleSet, err := cm.LoadRuleSet()
	require.NoError(t, err)
	assert.Equal(t, originalRuleSet.Version, loadedRuleSet.Version)
	assert.Equal(t, originalRuleSet.Config.DefaultCategory, loadedRuleSet.Config.DefaultCategory)
	assert.Len(t, loadedRuleSet.Rules, 1)
	assert.Equal(t, originalRuleSet.Rules[0].ID, loadedRuleSet.Rules[0].ID)

	// Load hybrid config
	loadedHybridConfig, err := cm.LoadHybridConfig()
	require.NoError(t, err)
	assert.Equal(t, originalHybridConfig.AIWeight, loadedHybridConfig.AIWeight)
	assert.Equal(t, originalHybridConfig.RuleWeight, loadedHybridConfig.RuleWeight)
	assert.Equal(t, originalHybridConfig.AIServiceURL, loadedHybridConfig.AIServiceURL)

	// Test the loaded configuration works
	ruleEngine, err := NewRuleEngine(loadedRuleSet)
	require.NoError(t, err)

	// Test issue
	issue := Issue{
		ID:     1,
		Number: 1,
		Title:  "Custom feature request",
		Body:   "We need a カスタム solution for this problem",
	}

	result, err := ruleEngine.ClassifyIssue(context.Background(), issue)
	assert.NoError(t, err)
	assert.Equal(t, CategoryFeature, result.Category)
	assert.Greater(t, result.Confidence, 0.0)
}

// TestRuleManagement tests dynamic rule management
func TestRuleManagement(t *testing.T) {
	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "rules.yml")

	cm := NewConfigManager(configPath)

	// Load default rule set
	_, err := cm.LoadRuleSet()
	require.NoError(t, err)

	// Add a new rule
	newRule := Rule{
		ID:          "security-rule",
		Name:        "Security Rule",
		Description: "Detects security-related issues",
		Category:    CategoryBug,
		Priority:    PriorityHigh,
		Enabled:     true,
		Keywords:    []string{"security", "セキュリティ", "vulnerability", "脆弱性"},
		Patterns:    []string{`(?i)\b(auth|authentication)\b`, `(?i)\b(encrypt|encryption)\b`},
		Weight:      1.5,
		Conditions: RuleConditions{
			TitleMatch:    true,
			BodyMatch:     true,
			CommentsMatch: true,
		},
	}

	err = cm.AddRule(newRule)
	require.NoError(t, err)

	// Load updated rule set and test
	ruleSet, err := cm.LoadRuleSet()
	require.NoError(t, err)

	ruleEngine, err := NewRuleEngine(ruleSet)
	require.NoError(t, err)

	// Test security issue
	securityIssue := Issue{
		ID:     1,
		Number: 1,
		Title:  "セキュリティ脆弱性の修正",
		Body:   "Authentication システムに脆弱性が見つかりました。encryption の問題です。",
	}

	result, err := ruleEngine.ClassifyIssue(context.Background(), securityIssue)
	assert.NoError(t, err)
	assert.Equal(t, CategoryBug, result.Category)
	assert.Greater(t, result.Confidence, 0.8) // Should have high confidence due to multiple matches

	// Update the rule
	newRule.Weight = 2.0
	newRule.Description = "Updated security rule description"
	err = cm.UpdateRule(newRule)
	require.NoError(t, err)

	// Reload and test again
	updatedRuleSet, err := cm.LoadRuleSet()
	require.NoError(t, err)

	found := false
	for _, rule := range updatedRuleSet.Rules {
		if rule.ID == "security-rule" {
			found = true
			assert.Equal(t, 2.0, rule.Weight)
			assert.Equal(t, "Updated security rule description", rule.Description)
			break
		}
	}
	assert.True(t, found)

	// Remove the rule
	err = cm.RemoveRule("security-rule")
	require.NoError(t, err)

	// Verify removal
	finalRuleSet, err := cm.LoadRuleSet()
	require.NoError(t, err)

	for _, rule := range finalRuleSet.Rules {
		assert.NotEqual(t, "security-rule", rule.ID)
	}
}

// TestAccuracyBenchmark tests classification accuracy across different scenarios
func TestAccuracyBenchmark(t *testing.T) {
	// Create mock AI server with predictable responses
	aiServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req AIClassificationRequest
		json.NewDecoder(r.Body).Decode(&req)

		// Simulate AI making correct predictions based on keywords
		response := AIClassificationResponse{
			Confidence:     0.8,
			ProcessingTime: 0.1,
			ModelUsed:      "gpt-4",
		}

		title := req.Issue.Title
		body := req.Issue.Body
		text := title + " " + body

		// Simple keyword-based classification for testing
		if containsAny(text, []string{"test", "テスト", "testing", "カバレッジ"}) {
			response.Category = "test"
		} else if containsAny(text, []string{"docs", "ドキュメント", "readme", "説明"}) {
			response.Category = "docs"
		} else if containsAny(text, []string{"bug", "バグ", "エラー", "error", "修正"}) {
			response.Category = "bug"
		} else if containsAny(text, []string{"enhancement", "改善", "最適化", "optimize", "パフォーマンス"}) {
			response.Category = "enhancement"
		} else if containsAny(text, []string{"feature", "機能", "新機能", "追加", "実装"}) {
			response.Category = "feature"
		} else {
			response.Category = "feature" // default
			response.Confidence = 0.3
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}))
	defer aiServer.Close()

	// Setup classification system
	ruleSet := GetDefaultRuleSet()
	ruleEngine, err := NewRuleEngine(ruleSet)
	require.NoError(t, err)

	aiClient := NewAIClient(aiServer.URL, 5*time.Second)
	hybridConfig := GetDefaultHybridConfig()
	hybridConfig.AIServiceURL = aiServer.URL

	hybridClassifier := NewHybridClassifier(ruleEngine, aiClient, hybridConfig)

	// Test cases with expected categories
	testCases := []struct {
		issue            Issue
		expectedCategory Category
	}{
		{
			issue: Issue{
				Title: "新機能の実装要求",
				Body:  "ユーザー登録機能を追加したいです",
			},
			expectedCategory: CategoryFeature,
		},
		{
			issue: Issue{
				Title: "バグ修正",
				Body:  "システムにエラーが発生しています",
			},
			expectedCategory: CategoryBug,
		},
		{
			issue: Issue{
				Title: "ドキュメント更新",
				Body:  "READMEファイルの説明を改善する",
			},
			expectedCategory: CategoryDocs,
		},
		{
			issue: Issue{
				Title: "テストカバレッジ向上",
				Body:  "単体テストを追加したい",
			},
			expectedCategory: CategoryTest,
		},
		{
			issue: Issue{
				Title: "パフォーマンス改善",
				Body:  "データベースクエリの最適化が必要",
			},
			expectedCategory: CategoryEnhancement,
		},
	}

	// Test all cases and calculate accuracy
	correct := 0
	total := len(testCases)

	for i, tc := range testCases {
		tc.issue.ID = i + 1
		tc.issue.Number = i + 1

		result, err := hybridClassifier.ClassifyIssue(context.Background(), tc.issue)
		require.NoError(t, err)

		if result.Category == tc.expectedCategory {
			correct++
		}

		t.Logf("Case %d: Expected %s, Got %s (Confidence: %.2f)",
			i+1, tc.expectedCategory, result.Category, result.Confidence)
	}

	accuracy := float64(correct) / float64(total)
	t.Logf("Overall Accuracy: %.2f%% (%d/%d)", accuracy*100, correct, total)

	// Verify accuracy meets requirements (85%+)
	assert.GreaterOrEqual(t, accuracy, 0.85, "Classification accuracy should be at least 85%")
}

// Helper function for keyword checking
func containsAny(text string, keywords []string) bool {
	for _, keyword := range keywords {
		if len(keyword) > 0 && (text == keyword ||
			(len(text) > len(keyword) &&
				(text[:len(keyword)] == keyword ||
					text[len(text)-len(keyword):] == keyword ||
					contains(text, keyword)))) {
			return true
		}
	}
	return false
}

func contains(text, keyword string) bool {
	for i := 0; i <= len(text)-len(keyword); i++ {
		if text[i:i+len(keyword)] == keyword {
			return true
		}
	}
	return false
}

// TestExampleConfigGeneration tests example configuration file generation
func TestExampleConfigGeneration(t *testing.T) {
	tempDir := t.TempDir()
	examplePath := filepath.Join(tempDir, "example.yml")

	err := CreateExampleConfig(examplePath)
	require.NoError(t, err)

	// Verify file exists and can be loaded
	_, err = os.Stat(examplePath)
	require.NoError(t, err)

	// Test that the example config can be loaded and used
	cm := NewConfigManager(examplePath)
	ruleSet, err := cm.LoadRuleSet()
	require.NoError(t, err)

	ruleEngine, err := NewRuleEngine(ruleSet)
	require.NoError(t, err)

	// Test with example config
	issue := Issue{
		ID:     1,
		Number: 1,
		Title:  "Feature request example",
		Body:   "This is a test feature request",
	}

	result, err := ruleEngine.ClassifyIssue(context.Background(), issue)
	assert.NoError(t, err)
	assert.Equal(t, CategoryFeature, result.Category)
}

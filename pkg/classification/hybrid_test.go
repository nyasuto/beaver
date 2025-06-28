package classification

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewAIClient(t *testing.T) {
	client := NewAIClient("http://example.com", 10*time.Second)
	assert.NotNil(t, client)
	assert.Equal(t, "http://example.com", client.baseURL)
	assert.Equal(t, 10*time.Second, client.httpClient.Timeout)
}

func TestNewAIClientWithDefaultTimeout(t *testing.T) {
	client := NewAIClient("http://example.com", 0)
	assert.NotNil(t, client)
	assert.Equal(t, 30*time.Second, client.httpClient.Timeout)
}

func TestAIClient_ClassifyIssue(t *testing.T) {
	// Create a mock server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "POST", r.Method)
		assert.Equal(t, "/classify/enhanced", r.URL.Path)
		assert.Equal(t, "application/json", r.Header.Get("Content-Type"))

		response := AIClassificationResponse{
			Category:       "feature",
			Confidence:     0.85,
			Reasoning:      "This issue contains feature-related keywords",
			ProcessingTime: 0.5,
			ModelUsed:      "gpt-4",
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	client := NewAIClient(server.URL, 5*time.Second)

	issue := Issue{
		ID:     1,
		Number: 1,
		Title:  "New feature request",
		Body:   "Please add a new feature for user management",
	}

	req := &AIClassificationRequest{
		Issue:      issue,
		UseFewShot: true,
		Language:   "en",
	}

	result, err := client.ClassifyIssue(context.Background(), req)
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "feature", result.Category)
	assert.Equal(t, 0.85, result.Confidence)
	assert.Equal(t, "gpt-4", result.ModelUsed)
}

func TestAIClient_ClassifyIssue_ValidationError(t *testing.T) {
	client := NewAIClient("http://example.com", 5*time.Second)

	// Invalid request (missing required fields)
	req := &AIClassificationRequest{
		Language: "invalid", // Invalid language
	}

	result, err := client.ClassifyIssue(context.Background(), req)
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "validation failed")
}

func TestAIClient_ClassifyIssue_ServerError(t *testing.T) {
	// Create a mock server that returns an error
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Internal server error"))
	}))
	defer server.Close()

	client := NewAIClient(server.URL, 5*time.Second)

	issue := Issue{
		ID:     1,
		Number: 1,
		Title:  "Test issue",
		Body:   "Test body",
	}

	req := &AIClassificationRequest{
		Issue:      issue,
		UseFewShot: true,
		Language:   "en",
	}

	result, err := client.ClassifyIssue(context.Background(), req)
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "AI service error")
}

func TestNewHybridClassifier(t *testing.T) {
	ruleEngine, err := NewRuleEngine(GetDefaultRuleSet())
	require.NoError(t, err)

	aiClient := NewAIClient("http://example.com", 5*time.Second)
	config := GetDefaultHybridConfig()

	classifier := NewHybridClassifier(ruleEngine, aiClient, config)
	assert.NotNil(t, classifier)
	assert.Equal(t, 0.7, classifier.config.AIWeight)
	assert.Equal(t, 0.3, classifier.config.RuleWeight)
}

func TestNewHybridClassifierWithDefaultConfig(t *testing.T) {
	ruleEngine, err := NewRuleEngine(GetDefaultRuleSet())
	require.NoError(t, err)

	aiClient := NewAIClient("http://example.com", 5*time.Second)
	config := HybridClassificationConfig{} // Empty config

	classifier := NewHybridClassifier(ruleEngine, aiClient, config)
	assert.NotNil(t, classifier)
	assert.Equal(t, 0.7, classifier.config.AIWeight)
	assert.Equal(t, 0.3, classifier.config.RuleWeight)
	assert.Equal(t, 0.5, classifier.config.MinConfidence)
}

func TestHybridClassifier_ClassifyIssue_Success(t *testing.T) {
	// Create mock AI server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		response := AIClassificationResponse{
			Category:       "feature",
			Confidence:     0.9,
			Reasoning:      "Feature keywords detected",
			ProcessingTime: 0.3,
			ModelUsed:      "gpt-4",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	// Setup components
	ruleEngine, err := NewRuleEngine(GetDefaultRuleSet())
	require.NoError(t, err)

	aiClient := NewAIClient(server.URL, 5*time.Second)
	config := GetDefaultHybridConfig()

	classifier := NewHybridClassifier(ruleEngine, aiClient, config)

	// Test issue
	issue := Issue{
		ID:     1,
		Number: 1,
		Title:  "新機能の追加",
		Body:   "新しい機能を実装したいです",
	}

	result, err := classifier.ClassifyIssue(context.Background(), issue)
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "hybrid", result.Method)
	assert.Equal(t, CategoryFeature, result.Category)
	assert.Greater(t, result.Confidence, 0.0)
	assert.NotNil(t, result.AIResult)
	assert.NotNil(t, result.RuleResult)
	assert.Greater(t, result.ProcessingTime, 0.0)
}

func TestHybridClassifier_ClassifyIssue_AIFailure(t *testing.T) {
	// Create mock AI server that fails
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("AI service unavailable"))
	}))
	defer server.Close()

	// Setup components
	ruleEngine, err := NewRuleEngine(GetDefaultRuleSet())
	require.NoError(t, err)

	aiClient := NewAIClient(server.URL, 5*time.Second)
	config := GetDefaultHybridConfig()

	classifier := NewHybridClassifier(ruleEngine, aiClient, config)

	// Test issue
	issue := Issue{
		ID:     1,
		Number: 1,
		Title:  "バグ修正",
		Body:   "システムにエラーが発生しています",
	}

	result, err := classifier.ClassifyIssue(context.Background(), issue)
	assert.NoError(t, err) // Should not error, should fallback
	assert.NotNil(t, result)
	assert.Equal(t, "rule-based-fallback", result.Method)
	assert.Nil(t, result.AIResult)
	assert.NotNil(t, result.RuleResult)
}

func TestHybridClassifier_ClassifyIssue_AgreementBoost(t *testing.T) {
	// Create mock AI server that agrees with rules
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		response := AIClassificationResponse{
			Category:       "bug", // Should agree with rule-based classification
			Confidence:     0.8,
			Reasoning:      "Bug keywords detected",
			ProcessingTime: 0.3,
			ModelUsed:      "gpt-4",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	// Setup components
	ruleEngine, err := NewRuleEngine(GetDefaultRuleSet())
	require.NoError(t, err)

	aiClient := NewAIClient(server.URL, 5*time.Second)
	config := GetDefaultHybridConfig()

	classifier := NewHybridClassifier(ruleEngine, aiClient, config)

	// Test issue that should be classified as bug by both
	issue := Issue{
		ID:     1,
		Number: 1,
		Title:  "システムバグ",
		Body:   "アプリケーションでエラーが発生し、クラッシュしています",
	}

	result, err := classifier.ClassifyIssue(context.Background(), issue)
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, CategoryBug, result.Category)
	assert.Equal(t, "bug", result.Details.AICategory)
	assert.Equal(t, "bug", result.Details.RuleCategory)
	// When AI and rules agree, confidence should be boosted
	assert.Greater(t, result.Confidence, 0.7)
}

func TestCalculateWeightedScores(t *testing.T) {
	config := HybridClassificationConfig{
		AIWeight:   0.7,
		RuleWeight: 0.3,
	}

	classifier := &HybridClassifier{config: config}

	ruleResult := ClassificationResult{
		Category:   CategoryFeature,
		Confidence: 0.8,
	}

	aiResult := AIClassificationResponse{
		Category:   "bug",
		Confidence: 0.9,
	}

	details := classifier.calculateWeightedScores(ruleResult, aiResult)

	expectedAIScore := 0.9 * 0.7                              // 0.63
	expectedRuleScore := 0.8 * 0.3                            // 0.24
	expectedFinalScore := expectedAIScore + expectedRuleScore // 0.87

	assert.Equal(t, "bug", details.AICategory)
	assert.Equal(t, 0.9, details.AIConfidence)
	assert.Equal(t, "feature", details.RuleCategory)
	assert.Equal(t, 0.8, details.RuleConfidence)
	assert.InDelta(t, expectedAIScore, details.WeightedAIScore, 0.001)
	assert.InDelta(t, expectedRuleScore, details.WeightedRuleScore, 0.001)
	assert.InDelta(t, expectedFinalScore, details.FinalScore, 0.001)
}

func TestDetermineFinalClassification_Agreement(t *testing.T) {
	config := GetDefaultHybridConfig()
	classifier := &HybridClassifier{config: config}

	details := HybridClassificationDetails{
		AICategory:     "feature",
		AIConfidence:   0.8,
		RuleCategory:   "feature",
		RuleConfidence: 0.7,
	}

	ruleResult := ClassificationResult{Category: CategoryFeature}
	aiResult := AIClassificationResponse{Category: "feature"}

	category, confidence := classifier.determineFinalClassification(details, ruleResult, aiResult)

	assert.Equal(t, CategoryFeature, category)
	assert.Equal(t, 0.75, confidence) // Average of 0.8 and 0.7
}

func TestDetermineFinalClassification_Disagreement(t *testing.T) {
	config := HybridClassificationConfig{
		AIWeight:   0.7,
		RuleWeight: 0.3,
	}
	classifier := &HybridClassifier{config: config}

	details := HybridClassificationDetails{
		AICategory:        "feature",
		AIConfidence:      0.9,
		RuleCategory:      "bug",
		RuleConfidence:    0.8,
		WeightedAIScore:   0.63, // 0.9 * 0.7
		WeightedRuleScore: 0.24, // 0.8 * 0.3
		FinalScore:        0.87,
	}

	ruleResult := ClassificationResult{Category: CategoryBug}
	aiResult := AIClassificationResponse{Category: "feature"}

	category, confidence := classifier.determineFinalClassification(details, ruleResult, aiResult)

	// AI has higher weighted score, so should choose AI result
	assert.Equal(t, CategoryFeature, category)
	assert.Equal(t, 0.87, confidence)
}

func TestGetDefaultHybridConfig(t *testing.T) {
	config := GetDefaultHybridConfig()
	assert.Equal(t, 0.7, config.AIWeight)
	assert.Equal(t, 0.3, config.RuleWeight)
	assert.Equal(t, 0.5, config.MinConfidence)
	assert.Equal(t, "http://localhost:8000", config.AIServiceURL)
	assert.Equal(t, 30*time.Second, config.AIServiceTimeout)
}

func TestHybridClassifier_UpdateConfig(t *testing.T) {
	ruleEngine, err := NewRuleEngine(GetDefaultRuleSet())
	require.NoError(t, err)

	aiClient := NewAIClient("http://example.com", 5*time.Second)
	originalConfig := GetDefaultHybridConfig()

	classifier := NewHybridClassifier(ruleEngine, aiClient, originalConfig)

	newConfig := HybridClassificationConfig{
		AIWeight:         0.8,
		RuleWeight:       0.2,
		MinConfidence:    0.6,
		AIServiceURL:     "http://newservice.com",
		AIServiceTimeout: 45 * time.Second,
	}

	classifier.UpdateConfig(newConfig)

	updatedConfig := classifier.GetConfig()
	assert.Equal(t, 0.8, updatedConfig.AIWeight)
	assert.Equal(t, 0.2, updatedConfig.RuleWeight)
	assert.Equal(t, 0.6, updatedConfig.MinConfidence)
	assert.Equal(t, "http://newservice.com", updatedConfig.AIServiceURL)
	assert.Equal(t, 45*time.Second, updatedConfig.AIServiceTimeout)
}

func BenchmarkHybridClassifier_ClassifyIssue(b *testing.B) {
	// Create mock AI server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		response := AIClassificationResponse{
			Category:       "feature",
			Confidence:     0.85,
			ProcessingTime: 0.1,
			ModelUsed:      "gpt-4",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	// Setup components
	ruleEngine, err := NewRuleEngine(GetDefaultRuleSet())
	require.NoError(b, err)

	aiClient := NewAIClient(server.URL, 5*time.Second)
	config := GetDefaultHybridConfig()
	classifier := NewHybridClassifier(ruleEngine, aiClient, config)

	issue := Issue{
		ID:     1,
		Number: 1,
		Title:  "新機能の実装",
		Body:   "ユーザー管理機能を追加したいと思います",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := classifier.ClassifyIssue(context.Background(), issue)
		assert.NoError(b, err)
	}
}

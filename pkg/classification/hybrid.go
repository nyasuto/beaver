package classification

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/go-playground/validator/v10"
)

// AIClassificationRequest represents a request to the AI classification service
type AIClassificationRequest struct {
	Issue       Issue    `json:"issue" validate:"required"`
	Model       *string  `json:"model,omitempty"`
	Temperature *float64 `json:"temperature,omitempty"`
	UseFewShot  bool     `json:"use_few_shot"`
	Language    string   `json:"language" validate:"required,oneof=ja en"`
}

// AIClassificationResponse represents the response from AI classification
type AIClassificationResponse struct {
	Category       string         `json:"category"`
	Confidence     float64        `json:"confidence"`
	Reasoning      string         `json:"reasoning"`
	ProcessingTime float64        `json:"processing_time"`
	ModelUsed      string         `json:"model_used"`
	TokenUsage     map[string]int `json:"token_usage,omitempty"`
}

// HybridClassificationConfig defines configuration for hybrid classification
type HybridClassificationConfig struct {
	AIWeight         float64       `yaml:"ai_weight" json:"ai_weight"`
	RuleWeight       float64       `yaml:"rule_weight" json:"rule_weight"`
	MinConfidence    float64       `yaml:"min_confidence" json:"min_confidence"`
	AIServiceURL     string        `yaml:"ai_service_url" json:"ai_service_url"`
	AIServiceTimeout time.Duration `yaml:"ai_service_timeout" json:"ai_service_timeout"`
}

// HybridClassificationResult represents the result of hybrid classification
type HybridClassificationResult struct {
	Category       Category                    `json:"category"`
	Confidence     float64                     `json:"confidence"`
	AIResult       *AIClassificationResponse   `json:"ai_result,omitempty"`
	RuleResult     *ClassificationResult       `json:"rule_result,omitempty"`
	Method         string                      `json:"method"`
	ProcessingTime float64                     `json:"processing_time"`
	Timestamp      time.Time                   `json:"timestamp"`
	Details        HybridClassificationDetails `json:"details"`
}

// HybridClassificationDetails provides detailed information about the classification process
type HybridClassificationDetails struct {
	AICategory        string  `json:"ai_category"`
	AIConfidence      float64 `json:"ai_confidence"`
	RuleCategory      string  `json:"rule_category"`
	RuleConfidence    float64 `json:"rule_confidence"`
	WeightedAIScore   float64 `json:"weighted_ai_score"`
	WeightedRuleScore float64 `json:"weighted_rule_score"`
	FinalScore        float64 `json:"final_score"`
}

// AIClient represents the client for communicating with the AI service
type AIClient struct {
	baseURL    string
	httpClient *http.Client
	validator  *validator.Validate
}

// NewAIClient creates a new AI service client
func NewAIClient(baseURL string, timeout time.Duration) *AIClient {
	if timeout == 0 {
		timeout = 30 * time.Second
	}

	return &AIClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: timeout,
		},
		validator: validator.New(),
	}
}

// ClassifyIssue calls the AI service to classify an issue
func (c *AIClient) ClassifyIssue(ctx context.Context, req *AIClassificationRequest) (*AIClassificationResponse, error) {
	if err := c.validator.Struct(req); err != nil {
		return nil, fmt.Errorf("validation failed: %w", err)
	}

	// Build URL
	endpoint, err := url.JoinPath(c.baseURL, "/api/v1/classify/enhanced")
	if err != nil {
		return nil, fmt.Errorf("failed to build URL: %w", err)
	}

	// Marshal request
	reqBody, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json")

	// Execute request
	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Handle error responses
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("AI service error (status %d): %s", resp.StatusCode, string(body))
	}

	// Parse successful response
	var result AIClassificationResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &result, nil
}

// HybridClassifier combines rule-based and AI classification
type HybridClassifier struct {
	ruleEngine *RuleEngine
	aiClient   *AIClient
	config     HybridClassificationConfig
}

// NewHybridClassifier creates a new hybrid classifier
func NewHybridClassifier(ruleEngine *RuleEngine, aiClient *AIClient, config HybridClassificationConfig) *HybridClassifier {
	// Set default configuration if not provided
	if config.AIWeight == 0 && config.RuleWeight == 0 {
		config.AIWeight = 0.7
		config.RuleWeight = 0.3
	}
	if config.MinConfidence == 0 {
		config.MinConfidence = 0.5
	}

	return &HybridClassifier{
		ruleEngine: ruleEngine,
		aiClient:   aiClient,
		config:     config,
	}
}

// ClassifyIssue performs hybrid classification using both rules and AI
func (hc *HybridClassifier) ClassifyIssue(ctx context.Context, issue Issue) (*HybridClassificationResult, error) {
	start := time.Now()

	// Perform rule-based classification
	ruleResult, err := hc.ruleEngine.ClassifyIssue(ctx, issue)
	if err != nil {
		return nil, fmt.Errorf("rule-based classification failed: %w", err)
	}

	// Perform AI classification
	aiReq := &AIClassificationRequest{
		Issue:      issue,
		UseFewShot: true,
		Language:   "ja", // Default to Japanese per project settings
	}

	aiResult, err := hc.aiClient.ClassifyIssue(ctx, aiReq)
	if err != nil {
		// If AI fails, fall back to rule-based classification
		return &HybridClassificationResult{
			Category:       ruleResult.Category,
			Confidence:     ruleResult.Confidence,
			RuleResult:     ruleResult,
			Method:         "rule-based-fallback",
			ProcessingTime: time.Since(start).Seconds(),
			Timestamp:      time.Now(),
			Details: HybridClassificationDetails{
				RuleCategory:   string(ruleResult.Category),
				RuleConfidence: ruleResult.Confidence,
				FinalScore:     ruleResult.Confidence,
			},
		}, nil
	}

	// Combine results using weighted scoring
	details := hc.calculateWeightedScores(*ruleResult, *aiResult)

	// Determine final category and confidence
	finalCategory, finalConfidence := hc.determineFinalClassification(details, *ruleResult, *aiResult)

	result := &HybridClassificationResult{
		Category:       finalCategory,
		Confidence:     finalConfidence,
		AIResult:       aiResult,
		RuleResult:     ruleResult,
		Method:         "hybrid",
		ProcessingTime: time.Since(start).Seconds(),
		Timestamp:      time.Now(),
		Details:        details,
	}

	return result, nil
}

// calculateWeightedScores calculates weighted scores from rule and AI results
func (hc *HybridClassifier) calculateWeightedScores(ruleResult ClassificationResult, aiResult AIClassificationResponse) HybridClassificationDetails {
	weightedAIScore := aiResult.Confidence * hc.config.AIWeight
	weightedRuleScore := ruleResult.Confidence * hc.config.RuleWeight
	finalScore := weightedAIScore + weightedRuleScore

	return HybridClassificationDetails{
		AICategory:        aiResult.Category,
		AIConfidence:      aiResult.Confidence,
		RuleCategory:      string(ruleResult.Category),
		RuleConfidence:    ruleResult.Confidence,
		WeightedAIScore:   weightedAIScore,
		WeightedRuleScore: weightedRuleScore,
		FinalScore:        finalScore,
	}
}

// determineFinalClassification determines the final category and confidence
func (hc *HybridClassifier) determineFinalClassification(details HybridClassificationDetails, ruleResult ClassificationResult, _ AIClassificationResponse) (Category, float64) {
	// If AI and rules agree, use that category with high confidence
	if details.AICategory == details.RuleCategory {
		confidence := (details.AIConfidence + details.RuleConfidence) / 2.0
		if confidence > 1.0 {
			confidence = 1.0
		}
		return Category(details.AICategory), confidence
	}

	// If they disagree, use the weighted approach
	if details.WeightedAIScore > details.WeightedRuleScore {
		return Category(details.AICategory), details.FinalScore
	}

	return ruleResult.Category, details.FinalScore
}

// GetConfig returns the current hybrid classification configuration
func (hc *HybridClassifier) GetConfig() HybridClassificationConfig {
	return hc.config
}

// UpdateConfig updates the hybrid classification configuration
func (hc *HybridClassifier) UpdateConfig(config HybridClassificationConfig) {
	hc.config = config
}

// GetDefaultHybridConfig returns default configuration for hybrid classification
func GetDefaultHybridConfig() HybridClassificationConfig {
	return HybridClassificationConfig{
		AIWeight:         0.7,
		RuleWeight:       0.3,
		MinConfidence:    0.5,
		AIServiceURL:     "http://localhost:8000",
		AIServiceTimeout: 30 * time.Second,
	}
}

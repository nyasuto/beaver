package main

import (
	"context"
	"errors"
	"time"

	"github.com/nyasuto/beaver/internal/config"
	"github.com/nyasuto/beaver/pkg/classification"
)

// MockClassifier provides a mock implementation of classification.HybridClassifier for testing
type MockClassifier struct {
	ClassifyIssueResponse *classification.HybridClassificationResult
	ClassifyIssueError    error
	CallLog               []classification.Issue
}

// NewMockClassifier creates a new mock classifier with default responses
func NewMockClassifier() *MockClassifier {
	return &MockClassifier{
		ClassifyIssueResponse: &classification.HybridClassificationResult{
			Category:   "feature",
			Confidence: 0.85,
			Method:     "hybrid",
			ProcessingTime: 0.15,
			Timestamp:  time.Now(),
			Details: classification.HybridClassificationDetails{
				AICategory:        "feature",
				AIConfidence:      0.82,
				RuleCategory:      "feature", 
				RuleConfidence:    0.88,
				WeightedAIScore:   0.574,
				WeightedRuleScore: 0.264,
				FinalScore:        0.838,
			},
		},
	}
}

// ClassifyIssue implements the classifier interface for testing
func (m *MockClassifier) ClassifyIssue(ctx context.Context, issue classification.Issue) (*classification.HybridClassificationResult, error) {
	m.CallLog = append(m.CallLog, issue)
	
	if m.ClassifyIssueError != nil {
		return nil, m.ClassifyIssueError
	}
	
	return m.ClassifyIssueResponse, nil
}

// Mock config loader for testing
func mockConfigLoader() (*config.Config, error) {
	return &config.Config{
		Sources: config.SourcesConfig{
			GitHub: config.GitHubConfig{
				Token: "test-token",
			},
		},
	}, nil
}

// Mock config loader that returns error
func mockConfigLoaderError() (*config.Config, error) {
	return nil, errors.New("mock config load error")
}

// Mock classifier factory for testing
func mockClassifierFactory(cfg *config.Config) (*classification.HybridClassifier, error) {
	// Return a real HybridClassifier with mock components for testing
	ruleSet := classification.GetDefaultRuleSet()
	ruleEngine, err := classification.NewRuleEngine(ruleSet)
	if err != nil {
		return nil, err
	}
	
	// Create a mock AI client to avoid nil pointer issues
	aiClient := classification.NewAIClient("http://mock-ai-service", 10*time.Second)
	
	hybridConfig := classification.GetDefaultHybridConfig()
	return classification.NewHybridClassifier(ruleEngine, aiClient, hybridConfig), nil
}

// Mock classifier factory that returns error
func mockClassifierFactoryError(cfg *config.Config) (*classification.HybridClassifier, error) {
	return nil, errors.New("mock classifier creation error")
}
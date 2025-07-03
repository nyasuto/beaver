package classification

import (
	"context"
	"time"
)

// ClassificationConfig defines configuration for rule-based classification
type ClassificationConfig struct {
	MinConfidence float64 `yaml:"min_confidence" json:"min_confidence"`
}

// Classifier performs rule-based classification only
type Classifier struct {
	ruleEngine *RuleEngine
	config     ClassificationConfig
}

// NewClassifier creates a new rule-based classifier
func NewClassifier(ruleEngine *RuleEngine, config ClassificationConfig) *Classifier {
	// Set default configuration if not provided
	if config.MinConfidence == 0 {
		config.MinConfidence = 0.5
	}

	return &Classifier{
		ruleEngine: ruleEngine,
		config:     config,
	}
}

// ClassifyIssue performs rule-based classification
func (c *Classifier) ClassifyIssue(ctx context.Context, issue Issue) (*ClassificationResult, error) {
	start := time.Now()

	// Perform rule-based classification
	ruleResult, err := c.ruleEngine.ClassifyIssue(ctx, issue)
	if err != nil {
		return nil, err
	}

	result := &ClassificationResult{
		Category:       ruleResult.Category,
		Confidence:     ruleResult.Confidence,
		Matches:        ruleResult.Matches,
		ProcessingTime: time.Since(start).Seconds(),
		Method:         "rule-based",
		Timestamp:      time.Now(),
	}

	return result, nil
}

// GetConfig returns the current classification configuration
func (c *Classifier) GetConfig() ClassificationConfig {
	return c.config
}

// UpdateConfig updates the classification configuration
func (c *Classifier) UpdateConfig(config ClassificationConfig) {
	c.config = config
}

// GetDefaultConfig returns default configuration for classification
func GetDefaultConfig() ClassificationConfig {
	return ClassificationConfig{
		MinConfidence: 0.5,
	}
}

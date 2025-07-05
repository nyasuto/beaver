package config

import (
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

// ClassificationConfig represents the shared classification configuration
type ClassificationConfig struct {
	PriorityRules  map[string]RuleSet `yaml:"priority_rules"`
	CategoryRules  map[string]RuleSet `yaml:"category_rules"`
	ActionRules    ActionRulesConfig  `yaml:"action_rules"`
	SearchConfig   SearchConfig       `yaml:"search_config"`
	WorkflowConfig WorkflowConfig     `yaml:"workflow_config"`
	DataContract   DataContract       `yaml:"data_contract"`
}

// RuleSet represents a set of classification rules
type RuleSet struct {
	Keywords      []string `yaml:"keywords"`
	Labels        []string `yaml:"labels"`
	TitlePatterns []string `yaml:"title_patterns"`
	Description   string   `yaml:"description"`
}

// ActionRulesConfig contains configuration for action item generation
type ActionRulesConfig struct {
	StaleThresholdDays  int `yaml:"stale_threshold_days"`
	CriticalActionLimit int `yaml:"critical_action_limit"`
	FeatureActionLimit  int `yaml:"feature_action_limit"`
	BugActionLimit      int `yaml:"bug_action_limit"`
}

// SearchConfig contains search and filtering configuration
type SearchConfig struct {
	RelevanceScores struct {
		TitleMatch   int `yaml:"title_match"`
		LabelMatch   int `yaml:"label_match"`
		BodyMatch    int `yaml:"body_match"`
		CommentMatch int `yaml:"comment_match"`
	} `yaml:"relevance_scores"`
	MaxSearchResults int `yaml:"max_search_results"`
	SearchDebounceMs int `yaml:"search_debounce_ms"`
}

// WorkflowConfig contains workflow metrics configuration
type WorkflowConfig struct {
	TimePeriods struct {
		DailyHours  int `yaml:"daily_hours"`
		WeeklyDays  int `yaml:"weekly_days"`
		MonthlyDays int `yaml:"monthly_days"`
	} `yaml:"time_periods"`
	VelocityCalculation string `yaml:"velocity_calculation"`
	ActivityThreshold   int    `yaml:"activity_threshold"`
}

// DataContract defines the required fields for data consistency
type DataContract struct {
	IssueRequiredFields      []string `yaml:"issue_required_fields"`
	StatisticsRequiredFields []string `yaml:"statistics_required_fields"`
	WorkflowMetricsFields    []string `yaml:"workflow_metrics_fields"`
}

// LoadClassificationConfig loads the shared classification configuration
func LoadClassificationConfig() (*ClassificationConfig, error) {
	configPath := getClassificationConfigPath()

	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read classification config: %w", err)
	}

	var config ClassificationConfig
	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse classification config: %w", err)
	}

	return &config, nil
}

// getClassificationConfigPath returns the path to the classification config file
func getClassificationConfigPath() string {
	// Try to find config in common locations
	possiblePaths := []string{
		"config/classification.yml",
		"../config/classification.yml",
		"../../config/classification.yml",
		"/etc/beaver/classification.yml",
		filepath.Join(os.Getenv("HOME"), ".beaver", "classification.yml"),
	}

	for _, path := range possiblePaths {
		if _, err := os.Stat(path); err == nil {
			return path
		}
	}

	// Default to the first path
	return possiblePaths[0]
}

// GetPriorityFromLabels determines priority based on shared configuration
func (c *ClassificationConfig) GetPriorityFromLabels(labels []string) string {
	labelText := ""
	for _, label := range labels {
		labelText += " " + label
	}
	labelText = " " + labelText + " " // Add spaces for better matching

	// Check each priority level in order of importance
	priorities := []string{"critical", "high", "medium", "low"}
	for _, priority := range priorities {
		if rules, exists := c.PriorityRules[priority]; exists {
			// Check labels
			for _, ruleLabel := range rules.Labels {
				for _, issueLabel := range labels {
					if issueLabel == ruleLabel {
						return priority
					}
				}
			}

			// Check keywords in combined label text
			for _, keyword := range rules.Keywords {
				if containsWord(labelText, keyword) {
					return priority
				}
			}
		}
	}

	return "low" // Default priority
}

// GetCategoryFromContent determines category based on shared configuration
func (c *ClassificationConfig) GetCategoryFromContent(title, body string, labels []string) string {
	content := title + " " + body
	labelText := ""
	for _, label := range labels {
		labelText += " " + label
	}

	// Check each category
	categories := []string{"bug", "feature", "documentation", "test", "refactor"}
	for _, category := range categories {
		if rules, exists := c.CategoryRules[category]; exists {
			// Check labels first (highest priority)
			for _, ruleLabel := range rules.Labels {
				for _, issueLabel := range labels {
					if issueLabel == ruleLabel {
						return category
					}
				}
			}

			// Check title patterns
			for _, pattern := range rules.TitlePatterns {
				if containsWord(title, pattern) {
					return category
				}
			}

			// Check keywords in content
			for _, keyword := range rules.Keywords {
				if containsWord(content, keyword) {
					return category
				}
			}
		}
	}

	return "general" // Default category
}

// containsWord checks if text contains a word (case-insensitive)
func containsWord(text, word string) bool {
	text = " " + text + " "
	word = " " + word + " "
	return len(text) >= len(word) &&
		(text == word ||
			findInText(text, word) >= 0)
}

// findInText is a simple case-insensitive search
func findInText(text, substr string) int {
	textLower := toLower(text)
	substrLower := toLower(substr)

	for i := 0; i <= len(textLower)-len(substrLower); i++ {
		if textLower[i:i+len(substrLower)] == substrLower {
			return i
		}
	}
	return -1
}

// toLower converts string to lowercase
func toLower(s string) string {
	result := make([]byte, len(s))
	for i := 0; i < len(s); i++ {
		if s[i] >= 'A' && s[i] <= 'Z' {
			result[i] = s[i] + 32
		} else {
			result[i] = s[i]
		}
	}
	return string(result)
}

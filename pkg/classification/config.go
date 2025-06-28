package classification

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"gopkg.in/yaml.v3"
)

// ConfigManager handles loading and saving classification configurations
type ConfigManager struct {
	configPath string
}

// NewConfigManager creates a new configuration manager
func NewConfigManager(configPath string) *ConfigManager {
	return &ConfigManager{
		configPath: configPath,
	}
}

// LoadRuleSet loads a rule set from a YAML file
func (cm *ConfigManager) LoadRuleSet() (*RuleSet, error) {
	if _, err := os.Stat(cm.configPath); os.IsNotExist(err) {
		// If config file doesn't exist, create default and return it
		defaultRuleSet := GetDefaultRuleSet()
		if err := cm.SaveRuleSet(defaultRuleSet); err != nil {
			return nil, fmt.Errorf("failed to save default rule set: %w", err)
		}
		return defaultRuleSet, nil
	}

	data, err := os.ReadFile(cm.configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	var ruleSet RuleSet
	if err := yaml.Unmarshal(data, &ruleSet); err != nil {
		return nil, fmt.Errorf("failed to parse YAML config: %w", err)
	}

	// Validate the loaded rule set
	if err := cm.validateRuleSet(&ruleSet); err != nil {
		return nil, fmt.Errorf("invalid rule set configuration: %w", err)
	}

	return &ruleSet, nil
}

// SaveRuleSet saves a rule set to a YAML file
func (cm *ConfigManager) SaveRuleSet(ruleSet *RuleSet) error {
	// Ensure directory exists
	dir := filepath.Dir(cm.configPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}

	// Validate before saving
	if err := cm.validateRuleSet(ruleSet); err != nil {
		return fmt.Errorf("invalid rule set: %w", err)
	}

	data, err := yaml.Marshal(ruleSet)
	if err != nil {
		return fmt.Errorf("failed to marshal rule set to YAML: %w", err)
	}

	if err := os.WriteFile(cm.configPath, data, 0600); err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}

	return nil
}

// LoadHybridConfig loads hybrid classification configuration
func (cm *ConfigManager) LoadHybridConfig() (*HybridClassificationConfig, error) {
	configDir := filepath.Dir(cm.configPath)
	hybridConfigPath := filepath.Join(configDir, "hybrid-config.yml")

	if _, err := os.Stat(hybridConfigPath); os.IsNotExist(err) {
		// If config file doesn't exist, create default and return it
		defaultConfig := GetDefaultHybridConfig()
		if err := cm.SaveHybridConfig(&defaultConfig); err != nil {
			return nil, fmt.Errorf("failed to save default hybrid config: %w", err)
		}
		return &defaultConfig, nil
	}

	data, err := os.ReadFile(hybridConfigPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read hybrid config file: %w", err)
	}

	var config HybridClassificationConfig
	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse hybrid config YAML: %w", err)
	}

	// Validate configuration
	if err := cm.validateHybridConfig(&config); err != nil {
		return nil, fmt.Errorf("invalid hybrid configuration: %w", err)
	}

	return &config, nil
}

// SaveHybridConfig saves hybrid classification configuration
func (cm *ConfigManager) SaveHybridConfig(config *HybridClassificationConfig) error {
	configDir := filepath.Dir(cm.configPath)
	hybridConfigPath := filepath.Join(configDir, "hybrid-config.yml")

	// Ensure directory exists
	if err := os.MkdirAll(configDir, 0755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}

	// Validate before saving
	if err := cm.validateHybridConfig(config); err != nil {
		return fmt.Errorf("invalid hybrid configuration: %w", err)
	}

	data, err := yaml.Marshal(config)
	if err != nil {
		return fmt.Errorf("failed to marshal hybrid config to YAML: %w", err)
	}

	if err := os.WriteFile(hybridConfigPath, data, 0600); err != nil {
		return fmt.Errorf("failed to write hybrid config file: %w", err)
	}

	return nil
}

// validateRuleSet validates a rule set configuration
func (cm *ConfigManager) validateRuleSet(ruleSet *RuleSet) error {
	if ruleSet == nil {
		return fmt.Errorf("rule set cannot be nil")
	}

	if ruleSet.Version == "" {
		return fmt.Errorf("rule set version is required")
	}

	if len(ruleSet.Rules) == 0 {
		return fmt.Errorf("rule set must contain at least one rule")
	}

	// Validate each rule
	ruleIDs := make(map[string]bool)
	for _, rule := range ruleSet.Rules {
		if err := cm.validateRule(rule); err != nil {
			return fmt.Errorf("invalid rule '%s': %w", rule.ID, err)
		}

		// Check for duplicate rule IDs
		if ruleIDs[rule.ID] {
			return fmt.Errorf("duplicate rule ID: %s", rule.ID)
		}
		ruleIDs[rule.ID] = true
	}

	// Validate rule set config
	if ruleSet.Config.MatchThreshold < 0 || ruleSet.Config.MatchThreshold > 1 {
		return fmt.Errorf("match threshold must be between 0 and 1")
	}

	if ruleSet.Config.Language != "ja" && ruleSet.Config.Language != "en" {
		return fmt.Errorf("language must be 'ja' or 'en'")
	}

	return nil
}

// validateRule validates a single rule
func (cm *ConfigManager) validateRule(rule Rule) error {
	if rule.ID == "" {
		return fmt.Errorf("rule ID is required")
	}

	if rule.Name == "" {
		return fmt.Errorf("rule name is required")
	}

	if rule.Category == "" {
		return fmt.Errorf("rule category is required")
	}

	// Validate category
	validCategories := map[Category]bool{
		CategoryFeature:     true,
		CategoryBug:         true,
		CategoryEnhancement: true,
		CategoryDocs:        true,
		CategoryTest:        true,
	}
	if !validCategories[rule.Category] {
		return fmt.Errorf("invalid category: %s", rule.Category)
	}

	// Validate priority
	if rule.Priority < PriorityLow || rule.Priority > PriorityHigh {
		return fmt.Errorf("invalid priority: %d", rule.Priority)
	}

	// Validate weight
	if rule.Weight < 0 || rule.Weight > 2.0 {
		return fmt.Errorf("weight must be between 0 and 2.0")
	}

	// Must have either keywords or patterns
	if len(rule.Keywords) == 0 && len(rule.Patterns) == 0 {
		return fmt.Errorf("rule must have either keywords or patterns")
	}

	return nil
}

// validateHybridConfig validates hybrid classification configuration
func (cm *ConfigManager) validateHybridConfig(config *HybridClassificationConfig) error {
	if config == nil {
		return fmt.Errorf("hybrid config cannot be nil")
	}

	if config.AIWeight < 0 || config.AIWeight > 1 {
		return fmt.Errorf("AI weight must be between 0 and 1")
	}

	if config.RuleWeight < 0 || config.RuleWeight > 1 {
		return fmt.Errorf("rule weight must be between 0 and 1")
	}

	if config.AIWeight+config.RuleWeight == 0 {
		return fmt.Errorf("at least one of AI weight or rule weight must be greater than 0")
	}

	if config.MinConfidence < 0 || config.MinConfidence > 1 {
		return fmt.Errorf("minimum confidence must be between 0 and 1")
	}

	if config.AIServiceURL == "" {
		return fmt.Errorf("AI service URL is required")
	}

	if config.AIServiceTimeout <= 0 {
		config.AIServiceTimeout = 30 * time.Second
	}

	return nil
}

// AddRule adds a new rule to the rule set
func (cm *ConfigManager) AddRule(rule Rule) error {
	ruleSet, err := cm.LoadRuleSet()
	if err != nil {
		return fmt.Errorf("failed to load rule set: %w", err)
	}

	// Validate the new rule
	if err := cm.validateRule(rule); err != nil {
		return fmt.Errorf("invalid rule: %w", err)
	}

	// Check for duplicate ID
	for _, existingRule := range ruleSet.Rules {
		if existingRule.ID == rule.ID {
			return fmt.Errorf("rule with ID '%s' already exists", rule.ID)
		}
	}

	// Add the rule
	ruleSet.Rules = append(ruleSet.Rules, rule)

	// Save the updated rule set
	if err := cm.SaveRuleSet(ruleSet); err != nil {
		return fmt.Errorf("failed to save updated rule set: %w", err)
	}

	return nil
}

// RemoveRule removes a rule from the rule set
func (cm *ConfigManager) RemoveRule(ruleID string) error {
	ruleSet, err := cm.LoadRuleSet()
	if err != nil {
		return fmt.Errorf("failed to load rule set: %w", err)
	}

	// Find and remove the rule
	found := false
	newRules := make([]Rule, 0, len(ruleSet.Rules))
	for _, rule := range ruleSet.Rules {
		if rule.ID != ruleID {
			newRules = append(newRules, rule)
		} else {
			found = true
		}
	}

	if !found {
		return fmt.Errorf("rule with ID '%s' not found", ruleID)
	}

	ruleSet.Rules = newRules

	// Save the updated rule set
	if err := cm.SaveRuleSet(ruleSet); err != nil {
		return fmt.Errorf("failed to save updated rule set: %w", err)
	}

	return nil
}

// UpdateRule updates an existing rule in the rule set
func (cm *ConfigManager) UpdateRule(rule Rule) error {
	ruleSet, err := cm.LoadRuleSet()
	if err != nil {
		return fmt.Errorf("failed to load rule set: %w", err)
	}

	// Validate the updated rule
	if err := cm.validateRule(rule); err != nil {
		return fmt.Errorf("invalid rule: %w", err)
	}

	// Find and update the rule
	found := false
	for i, existingRule := range ruleSet.Rules {
		if existingRule.ID == rule.ID {
			ruleSet.Rules[i] = rule
			found = true
			break
		}
	}

	if !found {
		return fmt.Errorf("rule with ID '%s' not found", rule.ID)
	}

	// Save the updated rule set
	if err := cm.SaveRuleSet(ruleSet); err != nil {
		return fmt.Errorf("failed to save updated rule set: %w", err)
	}

	return nil
}

// GetDefaultConfigPath returns the default configuration file path
func GetDefaultConfigPath() string {
	return "config/classification-rules.yml"
}

// CreateExampleConfig creates an example configuration file with comments
func CreateExampleConfig(path string) error {
	exampleYAML := `# Classification Rule Set Configuration
# This file defines rules for automatic GitHub issue classification

version: "1.0.0"

config:
  # Default category when no rules match
  default_category: "feature"
  
  # Minimum confidence threshold for classification
  match_threshold: 0.5
  
  # Primary language for processing (ja or en)
  language: "ja"

rules:
  # Feature detection rule
  - id: "feature-keywords"
    name: "Feature Keywords"
    description: "Detects feature-related keywords in Japanese and English"
    category: "feature"
    priority: 3
    enabled: true
    weight: 1.0
    keywords:
      - "feature"
      - "機能"
      - "新機能"
      - "追加"
      - "実装"
      - "新規"
    conditions:
      title_match: true
      body_match: true
      labels_match: false
      comments_match: false

  # Bug detection rule
  - id: "bug-keywords"
    name: "Bug Keywords"
    description: "Detects bug-related keywords"
    category: "bug"
    priority: 3
    enabled: true
    weight: 1.0
    keywords:
      - "bug"
      - "バグ"
      - "エラー"
      - "error"
      - "fix"
      - "修正"
      - "問題"
    conditions:
      title_match: true
      body_match: true
      labels_match: false
      comments_match: false

  # Enhancement detection rule
  - id: "enhancement-keywords"
    name: "Enhancement Keywords"
    description: "Detects enhancement-related keywords"
    category: "enhancement"
    priority: 2
    enabled: true
    weight: 0.8
    keywords:
      - "enhancement"
      - "改善"
      - "最適化"
      - "optimize"
      - "improve"
      - "向上"
    conditions:
      title_match: true
      body_match: true
      labels_match: false
      comments_match: false

  # Pattern-based bug detection
  - id: "bug-patterns"
    name: "Bug Pattern Detection"
    description: "Uses regex patterns to detect bug-related content"
    category: "bug"
    priority: 3
    enabled: true
    weight: 1.2
    patterns:
      - "(?i)\\b(crash|crashed|crashing)\\b"
      - "(?i)\\b(fail|failed|failure)\\b" 
      - "(?i)\\b(broken|not working)\\b"
    conditions:
      title_match: true
      body_match: true
      labels_match: false
      comments_match: true
`

	// Ensure directory exists
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}

	if err := os.WriteFile(path, []byte(exampleYAML), 0600); err != nil {
		return fmt.Errorf("failed to write example config: %w", err)
	}

	return nil
}

package classification

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"
)

// Category represents issue classification categories
type Category string

const (
	CategoryFeature     Category = "feature"
	CategoryBug         Category = "bug"
	CategoryEnhancement Category = "enhancement"
	CategoryDocs        Category = "docs"
	CategoryTest        Category = "test"
)

// Priority represents rule priority levels
type Priority int

const (
	PriorityLow    Priority = 1
	PriorityMedium Priority = 2
	PriorityHigh   Priority = 3
)

// Rule represents a single classification rule
type Rule struct {
	ID          string         `yaml:"id" json:"id"`
	Name        string         `yaml:"name" json:"name"`
	Description string         `yaml:"description" json:"description"`
	Category    Category       `yaml:"category" json:"category"`
	Priority    Priority       `yaml:"priority" json:"priority"`
	Enabled     bool           `yaml:"enabled" json:"enabled"`
	Keywords    []string       `yaml:"keywords" json:"keywords"`
	Patterns    []string       `yaml:"patterns" json:"patterns"`
	Conditions  RuleConditions `yaml:"conditions" json:"conditions"`
	Weight      float64        `yaml:"weight" json:"weight"`
}

// RuleConditions defines conditions for rule matching
type RuleConditions struct {
	TitleMatch    bool `yaml:"title_match" json:"title_match"`
	BodyMatch     bool `yaml:"body_match" json:"body_match"`
	LabelsMatch   bool `yaml:"labels_match" json:"labels_match"`
	CommentsMatch bool `yaml:"comments_match" json:"comments_match"`
}

// RuleSet represents a collection of classification rules
type RuleSet struct {
	Version string        `yaml:"version" json:"version"`
	Rules   []Rule        `yaml:"rules" json:"rules"`
	Config  RuleSetConfig `yaml:"config" json:"config"`
}

// RuleSetConfig defines global rule set configuration
type RuleSetConfig struct {
	DefaultCategory Category `yaml:"default_category" json:"default_category"`
	MatchThreshold  float64  `yaml:"match_threshold" json:"match_threshold"`
	Language        string   `yaml:"language" json:"language"`
}

// Issue represents an issue for classification
type Issue struct {
	ID       int      `json:"id"`
	Number   int      `json:"number"`
	Title    string   `json:"title"`
	Body     string   `json:"body"`
	Labels   []string `json:"labels"`
	Comments []string `json:"comments"`
	State    string   `json:"state"`
	Language string   `json:"language,omitempty"`
}

// RuleMatch represents a rule matching result
type RuleMatch struct {
	RuleID      string   `json:"rule_id"`
	RuleName    string   `json:"rule_name"`
	Category    Category `json:"category"`
	Confidence  float64  `json:"confidence"`
	MatchType   string   `json:"match_type"`
	MatchedText string   `json:"matched_text"`
	Weight      float64  `json:"weight"`
}

// ClassificationResult represents the result of rule-based classification
type ClassificationResult struct {
	Category       Category    `json:"category"`
	Confidence     float64     `json:"confidence"`
	Matches        []RuleMatch `json:"matches"`
	ProcessingTime float64     `json:"processing_time"`
	Method         string      `json:"method"`
	Timestamp      time.Time   `json:"timestamp"`
}

// RuleEngine represents the core rule-based classification engine
type RuleEngine struct {
	ruleSet       *RuleSet
	compiledRules []*compiledRule
}

// compiledRule represents a rule with compiled regex patterns
type compiledRule struct {
	rule             Rule
	compiledPatterns []*regexp.Regexp
}

// NewRuleEngine creates a new rule engine instance
func NewRuleEngine(ruleSet *RuleSet) (*RuleEngine, error) {
	if ruleSet == nil {
		return nil, fmt.Errorf("rule set cannot be nil")
	}

	engine := &RuleEngine{
		ruleSet:       ruleSet,
		compiledRules: make([]*compiledRule, 0, len(ruleSet.Rules)),
	}

	// Compile regex patterns for all rules
	for _, rule := range ruleSet.Rules {
		if !rule.Enabled {
			continue
		}

		compiledRule := &compiledRule{
			rule:             rule,
			compiledPatterns: make([]*regexp.Regexp, 0, len(rule.Patterns)),
		}

		// Compile regex patterns
		for _, pattern := range rule.Patterns {
			regex, err := regexp.Compile(pattern)
			if err != nil {
				return nil, fmt.Errorf("failed to compile regex pattern '%s' for rule '%s': %w", pattern, rule.ID, err)
			}
			compiledRule.compiledPatterns = append(compiledRule.compiledPatterns, regex)
		}

		engine.compiledRules = append(engine.compiledRules, compiledRule)
	}

	return engine, nil
}

// ClassifyIssue performs rule-based classification on an issue
func (re *RuleEngine) ClassifyIssue(ctx context.Context, issue Issue) (*ClassificationResult, error) {
	start := time.Now()

	matches := make([]RuleMatch, 0)
	categoryScores := make(map[Category]float64)

	// Apply each rule to the issue
	for _, compiledRule := range re.compiledRules {
		ruleMatches := re.evaluateRule(compiledRule, issue)
		matches = append(matches, ruleMatches...)

		// Accumulate category scores
		for _, match := range ruleMatches {
			categoryScores[match.Category] += match.Confidence * match.Weight
		}
	}

	// Determine the best category
	bestCategory := re.ruleSet.Config.DefaultCategory
	bestScore := 0.0

	for category, score := range categoryScores {
		if score > bestScore {
			bestCategory = category
			bestScore = score
		}
	}

	// Calculate final confidence
	confidence := bestScore
	if confidence > 1.0 {
		confidence = 1.0
	}

	result := &ClassificationResult{
		Category:       bestCategory,
		Confidence:     confidence,
		Matches:        matches,
		ProcessingTime: time.Since(start).Seconds(),
		Method:         "rule-based",
		Timestamp:      time.Now(),
	}

	return result, nil
}

// evaluateRule evaluates a single rule against an issue
func (re *RuleEngine) evaluateRule(compiledRule *compiledRule, issue Issue) []RuleMatch {
	matches := make([]RuleMatch, 0)
	rule := compiledRule.rule

	// Check keyword matches
	keywordMatches := re.checkKeywordMatches(rule, issue)
	matches = append(matches, keywordMatches...)

	// Check regex pattern matches
	patternMatches := re.checkPatternMatches(compiledRule, issue)
	matches = append(matches, patternMatches...)

	// Check label matches
	labelMatches := re.checkLabelMatches(rule, issue)
	matches = append(matches, labelMatches...)

	return matches
}

// checkKeywordMatches checks for keyword matches in the issue
func (re *RuleEngine) checkKeywordMatches(rule Rule, issue Issue) []RuleMatch {
	matches := make([]RuleMatch, 0)

	for _, keyword := range rule.Keywords {
		keyword = strings.ToLower(keyword)

		// Check title
		if rule.Conditions.TitleMatch && strings.Contains(strings.ToLower(issue.Title), keyword) {
			matches = append(matches, RuleMatch{
				RuleID:      rule.ID,
				RuleName:    rule.Name,
				Category:    rule.Category,
				Confidence:  0.8,
				MatchType:   "keyword-title",
				MatchedText: keyword,
				Weight:      rule.Weight,
			})
		}

		// Check body
		if rule.Conditions.BodyMatch && strings.Contains(strings.ToLower(issue.Body), keyword) {
			matches = append(matches, RuleMatch{
				RuleID:      rule.ID,
				RuleName:    rule.Name,
				Category:    rule.Category,
				Confidence:  0.6,
				MatchType:   "keyword-body",
				MatchedText: keyword,
				Weight:      rule.Weight,
			})
		}

		// Check comments
		if rule.Conditions.CommentsMatch {
			for _, comment := range issue.Comments {
				if strings.Contains(strings.ToLower(comment), keyword) {
					matches = append(matches, RuleMatch{
						RuleID:      rule.ID,
						RuleName:    rule.Name,
						Category:    rule.Category,
						Confidence:  0.4,
						MatchType:   "keyword-comment",
						MatchedText: keyword,
						Weight:      rule.Weight,
					})
					break // Only count once per rule
				}
			}
		}
	}

	return matches
}

// checkPatternMatches checks for regex pattern matches in the issue
func (re *RuleEngine) checkPatternMatches(compiledRule *compiledRule, issue Issue) []RuleMatch {
	matches := make([]RuleMatch, 0)
	rule := compiledRule.rule

	for _, regex := range compiledRule.compiledPatterns {
		// Check title
		if rule.Conditions.TitleMatch {
			if match := regex.FindString(issue.Title); match != "" {
				matches = append(matches, RuleMatch{
					RuleID:      rule.ID,
					RuleName:    rule.Name,
					Category:    rule.Category,
					Confidence:  0.9,
					MatchType:   "pattern-title",
					MatchedText: match,
					Weight:      rule.Weight,
				})
			}
		}

		// Check body
		if rule.Conditions.BodyMatch {
			if match := regex.FindString(issue.Body); match != "" {
				matches = append(matches, RuleMatch{
					RuleID:      rule.ID,
					RuleName:    rule.Name,
					Category:    rule.Category,
					Confidence:  0.7,
					MatchType:   "pattern-body",
					MatchedText: match,
					Weight:      rule.Weight,
				})
			}
		}

		// Check comments
		if rule.Conditions.CommentsMatch {
			for _, comment := range issue.Comments {
				if match := regex.FindString(comment); match != "" {
					matches = append(matches, RuleMatch{
						RuleID:      rule.ID,
						RuleName:    rule.Name,
						Category:    rule.Category,
						Confidence:  0.5,
						MatchType:   "pattern-comment",
						MatchedText: match,
						Weight:      rule.Weight,
					})
					break // Only count once per rule
				}
			}
		}
	}

	return matches
}

// checkLabelMatches checks for label-based matches
func (re *RuleEngine) checkLabelMatches(rule Rule, issue Issue) []RuleMatch {
	matches := make([]RuleMatch, 0)

	if !rule.Conditions.LabelsMatch {
		return matches
	}

	for _, ruleKeyword := range rule.Keywords {
		for _, label := range issue.Labels {
			if strings.EqualFold(label, ruleKeyword) {
				matches = append(matches, RuleMatch{
					RuleID:      rule.ID,
					RuleName:    rule.Name,
					Category:    rule.Category,
					Confidence:  1.0,
					MatchType:   "label-exact",
					MatchedText: label,
					Weight:      rule.Weight,
				})
			}
		}
	}

	return matches
}

// GetRuleSet returns the current rule set
func (re *RuleEngine) GetRuleSet() *RuleSet {
	return re.ruleSet
}

// UpdateRuleSet updates the rule set and recompiles rules
func (re *RuleEngine) UpdateRuleSet(ruleSet *RuleSet) error {
	newEngine, err := NewRuleEngine(ruleSet)
	if err != nil {
		return fmt.Errorf("failed to create new engine with updated rule set: %w", err)
	}

	re.ruleSet = newEngine.ruleSet
	re.compiledRules = newEngine.compiledRules

	return nil
}

// GetDefaultRuleSet returns a default rule set for GitHub issues
func GetDefaultRuleSet() *RuleSet {
	return &RuleSet{
		Version: "1.0.0",
		Config: RuleSetConfig{
			DefaultCategory: CategoryFeature,
			MatchThreshold:  0.5,
			Language:        "ja",
		},
		Rules: []Rule{
			{
				ID:          "feature-keywords",
				Name:        "Feature Keywords",
				Description: "Detects feature-related keywords",
				Category:    CategoryFeature,
				Priority:    PriorityHigh,
				Enabled:     true,
				Keywords:    []string{"feature", "機能", "新機能", "追加", "実装", "新規"},
				Weight:      1.0,
				Conditions: RuleConditions{
					TitleMatch: true,
					BodyMatch:  true,
				},
			},
			{
				ID:          "bug-keywords",
				Name:        "Bug Keywords",
				Description: "Detects bug-related keywords",
				Category:    CategoryBug,
				Priority:    PriorityHigh,
				Enabled:     true,
				Keywords:    []string{"bug", "バグ", "エラー", "error", "fix", "修正", "問題"},
				Weight:      1.0,
				Conditions: RuleConditions{
					TitleMatch:    true,
					BodyMatch:     true,
					CommentsMatch: true,
				},
			},
			{
				ID:          "enhancement-keywords",
				Name:        "Enhancement Keywords",
				Description: "Detects enhancement-related keywords",
				Category:    CategoryEnhancement,
				Priority:    PriorityMedium,
				Enabled:     true,
				Keywords:    []string{"enhancement", "改善", "最適化", "optimize", "向上", "improvement", "improve"},
				Weight:      0.8,
				Conditions: RuleConditions{
					TitleMatch: true,
					BodyMatch:  true,
				},
			},
			{
				ID:          "docs-keywords",
				Name:        "Documentation Keywords",
				Description: "Detects documentation-related keywords",
				Category:    CategoryDocs,
				Priority:    PriorityMedium,
				Enabled:     true,
				Keywords:    []string{"docs", "documentation", "ドキュメント", "readme", "wiki", "説明", "ドキュメント更新", "update"},
				Weight:      0.9,
				Conditions: RuleConditions{
					TitleMatch: true,
					BodyMatch:  true,
				},
			},
			{
				ID:          "test-keywords",
				Name:        "Test Keywords",
				Description: "Detects test-related keywords",
				Category:    CategoryTest,
				Priority:    PriorityMedium,
				Enabled:     true,
				Keywords:    []string{"test", "testing", "テスト", "unittest", "integration", "coverage"},
				Weight:      0.9,
				Conditions: RuleConditions{
					TitleMatch: true,
					BodyMatch:  true,
				},
			},
			{
				ID:          "bug-patterns",
				Name:        "Bug Patterns",
				Description: "Detects bug-related patterns",
				Category:    CategoryBug,
				Priority:    PriorityHigh,
				Enabled:     true,
				Patterns:    []string{`(?i)\b(crash|crashed|crashing)\b`, `(?i)\b(fail|failed|failure)\b`, `(?i)\b(broken|not working)\b`},
				Weight:      1.2,
				Conditions: RuleConditions{
					TitleMatch: true,
					BodyMatch:  true,
				},
			},
		},
	}
}

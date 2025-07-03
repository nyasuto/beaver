package classification

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewConfigManager(t *testing.T) {
	configPath := "/test/config.yml"
	cm := NewConfigManager(configPath)
	assert.NotNil(t, cm)
	assert.Equal(t, configPath, cm.configPath)
}

func TestConfigManager_LoadRuleSet_FileNotExists(t *testing.T) {
	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "test-config.yml")

	cm := NewConfigManager(configPath)

	// File doesn't exist, should create default and return it
	ruleSet, err := cm.LoadRuleSet()
	assert.NoError(t, err)
	assert.NotNil(t, ruleSet)
	assert.Equal(t, "1.0.0", ruleSet.Version)
	assert.Greater(t, len(ruleSet.Rules), 0)

	// File should now exist
	_, err = os.Stat(configPath)
	assert.NoError(t, err)
}

func TestConfigManager_SaveAndLoadRuleSet(t *testing.T) {
	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "test-config.yml")

	cm := NewConfigManager(configPath)

	// Create a test rule set
	originalRuleSet := &RuleSet{
		Version: "2.0.0",
		Config: RuleSetConfig{
			DefaultCategory: CategoryBug,
			MatchThreshold:  0.7,
			Language:        "en",
		},
		Rules: []Rule{
			{
				ID:          "test-rule",
				Name:        "Test Rule",
				Description: "A test rule",
				Category:    CategoryFeature,
				Priority:    PriorityHigh,
				Enabled:     true,
				Keywords:    []string{"test", "example"},
				Weight:      1.0,
				Conditions: RuleConditions{
					TitleMatch: true,
					BodyMatch:  false,
				},
			},
		},
	}

	// Save the rule set
	err := cm.SaveRuleSet(originalRuleSet)
	assert.NoError(t, err)

	// Load it back
	loadedRuleSet, err := cm.LoadRuleSet()
	assert.NoError(t, err)
	assert.NotNil(t, loadedRuleSet)

	// Verify it matches
	assert.Equal(t, originalRuleSet.Version, loadedRuleSet.Version)
	assert.Equal(t, originalRuleSet.Config.DefaultCategory, loadedRuleSet.Config.DefaultCategory)
	assert.Equal(t, originalRuleSet.Config.MatchThreshold, loadedRuleSet.Config.MatchThreshold)
	assert.Equal(t, originalRuleSet.Config.Language, loadedRuleSet.Config.Language)
	assert.Len(t, loadedRuleSet.Rules, 1)
	assert.Equal(t, originalRuleSet.Rules[0].ID, loadedRuleSet.Rules[0].ID)
	assert.Equal(t, originalRuleSet.Rules[0].Name, loadedRuleSet.Rules[0].Name)
}

func TestConfigManager_ValidateRuleSet(t *testing.T) {
	cm := NewConfigManager("test-config.yml")

	tests := []struct {
		name        string
		ruleSet     *RuleSet
		expectError bool
		errorMsg    string
	}{
		{
			name:        "nil rule set",
			ruleSet:     nil,
			expectError: true,
			errorMsg:    "rule set cannot be nil",
		},
		{
			name: "empty version",
			ruleSet: &RuleSet{
				Version: "",
				Rules:   []Rule{{ID: "test"}},
			},
			expectError: true,
			errorMsg:    "rule set version is required",
		},
		{
			name: "no rules",
			ruleSet: &RuleSet{
				Version: "1.0.0",
				Rules:   []Rule{},
			},
			expectError: true,
			errorMsg:    "rule set must contain at least one rule",
		},
		{
			name: "duplicate rule IDs",
			ruleSet: &RuleSet{
				Version: "1.0.0",
				Rules: []Rule{
					{
						ID:       "test",
						Name:     "Test 1",
						Category: CategoryFeature,
						Priority: PriorityHigh,
						Keywords: []string{"test"},
						Weight:   1.0,
					},
					{
						ID:       "test", // Duplicate ID
						Name:     "Test 2",
						Category: CategoryBug,
						Priority: PriorityHigh,
						Keywords: []string{"test"},
						Weight:   1.0,
					},
				},
			},
			expectError: true,
			errorMsg:    "duplicate rule ID: test",
		},
		{
			name: "invalid match threshold",
			ruleSet: &RuleSet{
				Version: "1.0.0",
				Config: RuleSetConfig{
					MatchThreshold: 1.5, // Invalid
				},
				Rules: []Rule{{
					ID:       "test",
					Name:     "Test",
					Category: CategoryFeature,
					Priority: PriorityHigh,
					Keywords: []string{"test"},
					Weight:   1.0,
				}},
			},
			expectError: true,
			errorMsg:    "match threshold must be between 0 and 1",
		},
		{
			name: "invalid language",
			ruleSet: &RuleSet{
				Version: "1.0.0",
				Config: RuleSetConfig{
					Language: "fr", // Invalid language
				},
				Rules: []Rule{{
					ID:       "test",
					Name:     "Test",
					Category: CategoryFeature,
					Priority: PriorityHigh,
					Keywords: []string{"test"},
					Weight:   1.0,
				}},
			},
			expectError: true,
			errorMsg:    "language must be 'ja' or 'en'",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := cm.validateRuleSet(tt.ruleSet)
			if tt.expectError {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errorMsg)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestConfigManager_ValidateRule(t *testing.T) {
	cm := NewConfigManager("test-config.yml")

	tests := []struct {
		name        string
		rule        Rule
		expectError bool
		errorMsg    string
	}{
		{
			name: "valid rule",
			rule: Rule{
				ID:       "test",
				Name:     "Test Rule",
				Category: CategoryFeature,
				Priority: PriorityHigh,
				Keywords: []string{"test"},
				Weight:   1.0,
			},
			expectError: false,
		},
		{
			name: "empty ID",
			rule: Rule{
				Name:     "Test Rule",
				Category: CategoryFeature,
			},
			expectError: true,
			errorMsg:    "rule ID is required",
		},
		{
			name: "empty name",
			rule: Rule{
				ID:       "test",
				Category: CategoryFeature,
			},
			expectError: true,
			errorMsg:    "rule name is required",
		},
		{
			name: "empty category",
			rule: Rule{
				ID:   "test",
				Name: "Test Rule",
			},
			expectError: true,
			errorMsg:    "rule category is required",
		},
		{
			name: "invalid category",
			rule: Rule{
				ID:       "test",
				Name:     "Test Rule",
				Category: Category("invalid"),
				Priority: PriorityHigh,
				Keywords: []string{"test"},
				Weight:   1.0,
			},
			expectError: true,
			errorMsg:    "invalid category: invalid",
		},
		{
			name: "invalid priority",
			rule: Rule{
				ID:       "test",
				Name:     "Test Rule",
				Category: CategoryFeature,
				Priority: Priority(5), // Invalid priority
				Keywords: []string{"test"},
				Weight:   1.0,
			},
			expectError: true,
			errorMsg:    "invalid priority: 5",
		},
		{
			name: "invalid weight",
			rule: Rule{
				ID:       "test",
				Name:     "Test Rule",
				Category: CategoryFeature,
				Priority: PriorityHigh,
				Keywords: []string{"test"},
				Weight:   3.0, // Invalid weight
			},
			expectError: true,
			errorMsg:    "weight must be between 0 and 2.0",
		},
		{
			name: "no keywords or patterns",
			rule: Rule{
				ID:       "test",
				Name:     "Test Rule",
				Category: CategoryFeature,
				Priority: PriorityHigh,
				Weight:   1.0,
				// No keywords or patterns
			},
			expectError: true,
			errorMsg:    "rule must have either keywords or patterns",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := cm.validateRule(tt.rule)
			if tt.expectError {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errorMsg)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestConfigManager_AddRule(t *testing.T) {
	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "test-config.yml")

	cm := NewConfigManager(configPath)

	// First load should create default rule set
	_, err := cm.LoadRuleSet()
	require.NoError(t, err)

	// Add a new rule
	newRule := Rule{
		ID:          "new-rule",
		Name:        "New Rule",
		Description: "A new test rule",
		Category:    CategoryTest,
		Priority:    PriorityMedium,
		Enabled:     true,
		Keywords:    []string{"newtest"},
		Weight:      0.8,
		Conditions: RuleConditions{
			TitleMatch: true,
		},
	}

	err = cm.AddRule(newRule)
	assert.NoError(t, err)

	// Load and verify the rule was added
	ruleSet, err := cm.LoadRuleSet()
	assert.NoError(t, err)

	found := false
	for _, rule := range ruleSet.Rules {
		if rule.ID == "new-rule" {
			found = true
			assert.Equal(t, newRule.Name, rule.Name)
			assert.Equal(t, newRule.Category, rule.Category)
			break
		}
	}
	assert.True(t, found, "New rule should be found in the rule set")
}

func TestConfigManager_AddRule_DuplicateID(t *testing.T) {
	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "test-config.yml")

	cm := NewConfigManager(configPath)

	// First load should create default rule set
	_, err := cm.LoadRuleSet()
	require.NoError(t, err)

	// Try to add a rule with duplicate ID from default set
	duplicateRule := Rule{
		ID:       "feature-keywords", // This exists in default set
		Name:     "Duplicate Rule",
		Category: CategoryBug,
		Priority: PriorityHigh,
		Keywords: []string{"duplicate"},
		Weight:   1.0,
	}

	err = cm.AddRule(duplicateRule)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "rule with ID 'feature-keywords' already exists")
}

func TestConfigManager_RemoveRule(t *testing.T) {
	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "test-config.yml")

	cm := NewConfigManager(configPath)

	// First load should create default rule set
	originalRuleSet, err := cm.LoadRuleSet()
	require.NoError(t, err)
	originalCount := len(originalRuleSet.Rules)

	// Remove a rule (use first rule from default set)
	ruleToRemove := originalRuleSet.Rules[0].ID

	err = cm.RemoveRule(ruleToRemove)
	assert.NoError(t, err)

	// Load and verify the rule was removed
	updatedRuleSet, err := cm.LoadRuleSet()
	assert.NoError(t, err)
	assert.Len(t, updatedRuleSet.Rules, originalCount-1)

	// Verify the specific rule is gone
	for _, rule := range updatedRuleSet.Rules {
		assert.NotEqual(t, ruleToRemove, rule.ID)
	}
}

func TestConfigManager_RemoveRule_NotFound(t *testing.T) {
	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "test-config.yml")

	cm := NewConfigManager(configPath)

	// First load should create default rule set
	_, err := cm.LoadRuleSet()
	require.NoError(t, err)

	// Try to remove non-existent rule
	err = cm.RemoveRule("non-existent-rule")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "rule with ID 'non-existent-rule' not found")
}

func TestConfigManager_UpdateRule(t *testing.T) {
	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "test-config.yml")

	cm := NewConfigManager(configPath)

	// First load should create default rule set
	originalRuleSet, err := cm.LoadRuleSet()
	require.NoError(t, err)

	// Update an existing rule
	ruleToUpdate := originalRuleSet.Rules[0]
	ruleToUpdate.Name = "Updated Rule Name"
	ruleToUpdate.Weight = 1.5
	ruleToUpdate.Description = "Updated description"

	err = cm.UpdateRule(ruleToUpdate)
	assert.NoError(t, err)

	// Load and verify the rule was updated
	updatedRuleSet, err := cm.LoadRuleSet()
	assert.NoError(t, err)

	found := false
	for _, rule := range updatedRuleSet.Rules {
		if rule.ID == ruleToUpdate.ID {
			found = true
			assert.Equal(t, "Updated Rule Name", rule.Name)
			assert.Equal(t, 1.5, rule.Weight)
			assert.Equal(t, "Updated description", rule.Description)
			break
		}
	}
	assert.True(t, found, "Updated rule should be found")
}

func TestConfigManager_UpdateRule_NotFound(t *testing.T) {
	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "test-config.yml")

	cm := NewConfigManager(configPath)

	// First load should create default rule set
	_, err := cm.LoadRuleSet()
	require.NoError(t, err)

	// Try to update non-existent rule
	nonExistentRule := Rule{
		ID:       "non-existent",
		Name:     "Non-existent Rule",
		Category: CategoryFeature,
		Priority: PriorityHigh,
		Keywords: []string{"test"},
		Weight:   1.0,
	}

	err = cm.UpdateRule(nonExistentRule)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "rule with ID 'non-existent' not found")
}

func TestGetDefaultConfigPath(t *testing.T) {
	path := GetDefaultConfigPath()
	assert.Equal(t, "config/classification-rules.yml", path)
}

func TestCreateExampleConfig(t *testing.T) {
	tempDir := t.TempDir()
	examplePath := filepath.Join(tempDir, "example-config.yml")

	err := CreateExampleConfig(examplePath)
	assert.NoError(t, err)

	// Verify file was created
	_, err = os.Stat(examplePath)
	assert.NoError(t, err)

	// Verify file contains expected content
	content, err := os.ReadFile(examplePath)
	assert.NoError(t, err)
	assert.Contains(t, string(content), "Classification Rule Set Configuration")
	assert.Contains(t, string(content), "version: \"1.0.0\"")
	assert.Contains(t, string(content), "feature-keywords")
}

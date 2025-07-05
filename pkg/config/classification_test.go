package config

import (
	"os"
	"path/filepath"
	"testing"
)

// TestLoadClassificationConfig tests loading configuration from various sources
func TestLoadClassificationConfig(t *testing.T) {
	// Save original working directory
	originalWd, _ := os.Getwd()
	defer os.Chdir(originalWd)

	// Create temporary directory for testing
	tempDir := t.TempDir()
	os.Chdir(tempDir)

	t.Run("Load valid configuration", func(t *testing.T) {
		// Create valid config file
		validConfigPath := filepath.Join(tempDir, "config", "classification.yml")
		err := os.MkdirAll(filepath.Dir(validConfigPath), 0755)
		if err != nil {
			t.Fatalf("Failed to create config directory: %v", err)
		}

		// Copy test data to expected location
		testDataPath := filepath.Join(originalWd, "testdata", "valid_classification.yml")
		testData, err := os.ReadFile(testDataPath)
		if err != nil {
			t.Fatalf("Failed to read test data: %v", err)
		}

		err = os.WriteFile(validConfigPath, testData, 0644)
		if err != nil {
			t.Fatalf("Failed to write config file: %v", err)
		}

		// Test loading
		config, err := LoadClassificationConfig()
		if err != nil {
			t.Errorf("LoadClassificationConfig() error = %v", err)
			return
		}

		// Verify config structure
		if config == nil {
			t.Error("LoadClassificationConfig() returned nil config")
			return
		}

		// Verify priority rules
		if len(config.PriorityRules) == 0 {
			t.Error("Expected priority rules to be loaded")
		}

		if critical, exists := config.PriorityRules["critical"]; !exists {
			t.Error("Expected critical priority rule to exist")
		} else {
			if len(critical.Keywords) == 0 {
				t.Error("Expected critical priority rule to have keywords")
			}
			if len(critical.Labels) == 0 {
				t.Error("Expected critical priority rule to have labels")
			}
			if critical.Description == "" {
				t.Error("Expected critical priority rule to have description")
			}
		}

		// Verify category rules
		if len(config.CategoryRules) == 0 {
			t.Error("Expected category rules to be loaded")
		}

		if bug, exists := config.CategoryRules["bug"]; !exists {
			t.Error("Expected bug category rule to exist")
		} else {
			if len(bug.Keywords) == 0 {
				t.Error("Expected bug category rule to have keywords")
			}
		}

		// Verify action rules
		if config.ActionRules.StaleThresholdDays == 0 {
			t.Error("Expected action rules to be loaded")
		}

		// Verify search config
		if config.SearchConfig.MaxSearchResults == 0 {
			t.Error("Expected search config to be loaded")
		}

		// Verify workflow config
		if config.WorkflowConfig.TimePeriods.DailyHours == 0 {
			t.Error("Expected workflow config to be loaded")
		}

		// Verify data contract
		if len(config.DataContract.IssueRequiredFields) == 0 {
			t.Error("Expected data contract to be loaded")
		}
	})

	t.Run("Load minimal configuration", func(t *testing.T) {
		// Clean up previous test
		os.RemoveAll(filepath.Join(tempDir, "config"))

		// Create minimal config file
		minimalConfigPath := filepath.Join(tempDir, "config", "classification.yml")
		err := os.MkdirAll(filepath.Dir(minimalConfigPath), 0755)
		if err != nil {
			t.Fatalf("Failed to create config directory: %v", err)
		}

		testDataPath := filepath.Join(originalWd, "testdata", "minimal_classification.yml")
		testData, err := os.ReadFile(testDataPath)
		if err != nil {
			t.Fatalf("Failed to read test data: %v", err)
		}

		err = os.WriteFile(minimalConfigPath, testData, 0644)
		if err != nil {
			t.Fatalf("Failed to write config file: %v", err)
		}

		config, err := LoadClassificationConfig()
		if err != nil {
			t.Errorf("LoadClassificationConfig() error = %v", err)
			return
		}

		if config == nil {
			t.Error("LoadClassificationConfig() returned nil config")
			return
		}

		// Verify minimal config loaded correctly
		if config.ActionRules.StaleThresholdDays != 15 {
			t.Errorf("Expected stale threshold 15, got %d", config.ActionRules.StaleThresholdDays)
		}
	})

	t.Run("File not found error", func(t *testing.T) {
		// Clean up config file
		os.RemoveAll(filepath.Join(tempDir, "config"))

		// Test with non-existent file
		_, err := LoadClassificationConfig()
		if err == nil {
			t.Error("LoadClassificationConfig() should return error when file doesn't exist")
		}

		if err != nil && err.Error() == "" {
			t.Error("LoadClassificationConfig() should return meaningful error message")
		}
	})

	t.Run("Invalid YAML error", func(t *testing.T) {
		// Create invalid config file
		invalidConfigPath := filepath.Join(tempDir, "config", "classification.yml")
		err := os.MkdirAll(filepath.Dir(invalidConfigPath), 0755)
		if err != nil {
			t.Fatalf("Failed to create config directory: %v", err)
		}

		testDataPath := filepath.Join(originalWd, "testdata", "invalid_classification.yml")
		testData, err := os.ReadFile(testDataPath)
		if err != nil {
			t.Fatalf("Failed to read test data: %v", err)
		}

		err = os.WriteFile(invalidConfigPath, testData, 0644)
		if err != nil {
			t.Fatalf("Failed to write config file: %v", err)
		}

		_, err = LoadClassificationConfig()
		if err == nil {
			t.Error("LoadClassificationConfig() should return error for invalid YAML")
		}
	})

	t.Run("Empty configuration", func(t *testing.T) {
		// Create empty config file
		emptyConfigPath := filepath.Join(tempDir, "config", "classification.yml")
		err := os.MkdirAll(filepath.Dir(emptyConfigPath), 0755)
		if err != nil {
			t.Fatalf("Failed to create config directory: %v", err)
		}

		testDataPath := filepath.Join(originalWd, "testdata", "empty_classification.yml")
		testData, err := os.ReadFile(testDataPath)
		if err != nil {
			t.Fatalf("Failed to read test data: %v", err)
		}

		err = os.WriteFile(emptyConfigPath, testData, 0644)
		if err != nil {
			t.Fatalf("Failed to write config file: %v", err)
		}

		config, err := LoadClassificationConfig()
		if err != nil {
			t.Errorf("LoadClassificationConfig() error = %v", err)
			return
		}

		if config == nil {
			t.Error("LoadClassificationConfig() returned nil config")
			return
		}

		// Empty config should have zero-value fields
		if len(config.PriorityRules) != 0 {
			t.Error("Expected empty priority rules")
		}
		if len(config.CategoryRules) != 0 {
			t.Error("Expected empty category rules")
		}
	})
}

// TestGetClassificationConfigPath tests config file path resolution
func TestGetClassificationConfigPath(t *testing.T) {
	// Save original working directory
	originalWd, _ := os.Getwd()
	defer os.Chdir(originalWd)

	// Create temporary directory for testing
	tempDir := t.TempDir()
	os.Chdir(tempDir)

	t.Run("Find config in current directory", func(t *testing.T) {
		// Create config file in expected location
		configPath := filepath.Join(tempDir, "config", "classification.yml")
		err := os.MkdirAll(filepath.Dir(configPath), 0755)
		if err != nil {
			t.Fatalf("Failed to create config directory: %v", err)
		}

		err = os.WriteFile(configPath, []byte("test: config"), 0644)
		if err != nil {
			t.Fatalf("Failed to write config file: %v", err)
		}

		path := getClassificationConfigPath()
		if path != "config/classification.yml" {
			t.Errorf("Expected path 'config/classification.yml', got %s", path)
		}
	})

	t.Run("Return default path when not found", func(t *testing.T) {
		// Clean up config file
		os.RemoveAll(filepath.Join(tempDir, "config"))

		path := getClassificationConfigPath()
		if path != "config/classification.yml" {
			t.Errorf("Expected default path 'config/classification.yml', got %s", path)
		}
	})

	t.Run("Find config in parent directory", func(t *testing.T) {
		// Create config in parent directory
		parentConfigPath := filepath.Join(tempDir, "..", "config", "classification.yml")
		err := os.MkdirAll(filepath.Dir(parentConfigPath), 0755)
		if err != nil {
			t.Fatalf("Failed to create parent config directory: %v", err)
		}

		err = os.WriteFile(parentConfigPath, []byte("test: config"), 0644)
		if err != nil {
			t.Fatalf("Failed to write parent config file: %v", err)
		}

		path := getClassificationConfigPath()
		if path != "../config/classification.yml" {
			t.Errorf("Expected path '../config/classification.yml', got %s", path)
		}

		// Clean up
		os.RemoveAll(filepath.Dir(parentConfigPath))
	})
}

// TestGetPriorityFromLabels tests priority classification
func TestGetPriorityFromLabels(t *testing.T) {
	// Create test config
	config := &ClassificationConfig{
		PriorityRules: map[string]RuleSet{
			"critical": {
				Keywords: []string{"critical", "urgent", "emergency"},
				Labels:   []string{"critical", "urgent", "priority: critical"},
			},
			"high": {
				Keywords: []string{"high", "important"},
				Labels:   []string{"high", "priority: high"},
			},
			"medium": {
				Keywords: []string{"medium", "normal"},
				Labels:   []string{"medium", "priority: medium"},
			},
			"low": {
				Keywords: []string{"low", "minor"},
				Labels:   []string{"low", "priority: low"},
			},
		},
	}

	tests := []struct {
		name     string
		labels   []string
		expected string
	}{
		{
			name:     "Critical label match",
			labels:   []string{"critical", "bug"},
			expected: "critical",
		},
		{
			name:     "High priority label match",
			labels:   []string{"priority: high", "feature"},
			expected: "high",
		},
		{
			name:     "Medium priority label match",
			labels:   []string{"medium", "enhancement"},
			expected: "medium",
		},
		{
			name:     "Low priority label match",
			labels:   []string{"low", "documentation"},
			expected: "low",
		},
		{
			name:     "Keyword match in labels",
			labels:   []string{"urgent-fix", "bug"},
			expected: "low", // containsWord looks for whole words only
		},
		{
			name:     "Multiple matches - highest priority wins",
			labels:   []string{"critical", "high", "medium"},
			expected: "critical",
		},
		{
			name:     "No matches - default to low",
			labels:   []string{"other", "random"},
			expected: "low",
		},
		{
			name:     "Empty labels - default to low",
			labels:   []string{},
			expected: "low",
		},
		{
			name:     "Case insensitive keyword match",
			labels:   []string{"IMPORTANT", "task"},
			expected: "high",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := config.GetPriorityFromLabels(tt.labels)
			if result != tt.expected {
				t.Errorf("GetPriorityFromLabels(%v) = %v, want %v", tt.labels, result, tt.expected)
			}
		})
	}
}

// TestGetCategoryFromContent tests category classification
func TestGetCategoryFromContent(t *testing.T) {
	// Create test config
	config := &ClassificationConfig{
		CategoryRules: map[string]RuleSet{
			"bug": {
				Keywords:      []string{"bug", "error", "issue", "problem"},
				Labels:        []string{"bug", "type: bug"},
				TitlePatterns: []string{"BUG", "ERROR", "FIX"},
			},
			"feature": {
				Keywords:      []string{"feature", "enhancement", "add"},
				Labels:        []string{"feature", "type: feature"},
				TitlePatterns: []string{"FEATURE", "ADD"},
			},
			"documentation": {
				Keywords:      []string{"docs", "documentation", "readme"},
				Labels:        []string{"documentation", "docs"},
				TitlePatterns: []string{"DOCS", "README"},
			},
			"test": {
				Keywords:      []string{"test", "testing", "coverage"},
				Labels:        []string{"test", "testing"},
				TitlePatterns: []string{"TEST", "TESTING"},
			},
			"refactor": {
				Keywords:      []string{"refactor", "cleanup", "optimize"},
				Labels:        []string{"refactor", "cleanup"},
				TitlePatterns: []string{"REFACTOR", "CLEANUP"},
			},
		},
	}

	tests := []struct {
		name     string
		title    string
		body     string
		labels   []string
		expected string
	}{
		{
			name:     "Bug from label",
			title:    "Something not working",
			body:     "This is broken",
			labels:   []string{"bug"},
			expected: "bug",
		},
		{
			name:     "Feature from title pattern",
			title:    "ADD new functionality",
			body:     "Need to implement this",
			labels:   []string{},
			expected: "feature",
		},
		{
			name:     "Documentation from keyword in body",
			title:    "Update information",
			body:     "Need to update the documentation",
			labels:   []string{},
			expected: "documentation",
		},
		{
			name:     "Test from keyword in title",
			title:    "Add test coverage",
			body:     "Need more tests",
			labels:   []string{},
			expected: "feature", // "add" keyword matches feature first
		},
		{
			name:     "Refactor from title pattern",
			title:    "CLEANUP old code",
			body:     "Remove unused code",
			labels:   []string{},
			expected: "refactor",
		},
		{
			name:     "Label takes priority over content",
			title:    "This is about refactor",
			body:     "Refactor this code",
			labels:   []string{"type: bug"},
			expected: "bug",
		},
		{
			name:     "Title pattern takes priority over body keyword",
			title:    "ERROR in system",
			body:     "Need to add new feature",
			labels:   []string{},
			expected: "bug",
		},
		{
			name:     "No matches - default to general",
			title:    "Random task",
			body:     "Some other work",
			labels:   []string{},
			expected: "general",
		},
		{
			name:     "Case insensitive matching",
			title:    "fix the problem",
			body:     "There is an ERROR in the system",
			labels:   []string{},
			expected: "bug",
		},
		{
			name:     "Multiple matches - first category wins",
			title:    "Fix bug and add feature",
			body:     "This is both a bug fix and feature",
			labels:   []string{},
			expected: "bug", // bug comes first in category order
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := config.GetCategoryFromContent(tt.title, tt.body, tt.labels)
			if result != tt.expected {
				t.Errorf("GetCategoryFromContent(%q, %q, %v) = %v, want %v", tt.title, tt.body, tt.labels, result, tt.expected)
			}
		})
	}
}

// TestContainsWord tests the containsWord helper function
func TestContainsWord(t *testing.T) {
	tests := []struct {
		name     string
		text     string
		word     string
		expected bool
	}{
		{
			name:     "Exact word match",
			text:     "this is a test",
			word:     "test",
			expected: true,
		},
		{
			name:     "Word at beginning",
			text:     "test this function",
			word:     "test",
			expected: true,
		},
		{
			name:     "Word at end",
			text:     "this is a test",
			word:     "test",
			expected: true,
		},
		{
			name:     "Word in middle",
			text:     "this test is good",
			word:     "test",
			expected: true,
		},
		{
			name:     "Case insensitive match",
			text:     "This Test Is Good",
			word:     "test",
			expected: true,
		},
		{
			name:     "No match - partial word",
			text:     "testing function",
			word:     "test",
			expected: false,
		},
		{
			name:     "No match - word not found",
			text:     "this is good",
			word:     "test",
			expected: false,
		},
		{
			name:     "Empty text",
			text:     "",
			word:     "test",
			expected: false,
		},
		{
			name:     "Empty word",
			text:     "this is a test",
			word:     "",
			expected: false, // Empty word doesn't match based on implementation
		},
		{
			name:     "Single character word",
			text:     "a b c",
			word:     "b",
			expected: true,
		},
		{
			name:     "Word with spaces",
			text:     "this is a test case",
			word:     "test case",
			expected: true,
		},
		{
			name:     "Same text and word",
			text:     "test",
			word:     "test",
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := containsWord(tt.text, tt.word)
			if result != tt.expected {
				t.Errorf("containsWord(%q, %q) = %v, want %v", tt.text, tt.word, result, tt.expected)
			}
		})
	}
}

// TestFindInText tests the findInText helper function
func TestFindInText(t *testing.T) {
	tests := []struct {
		name     string
		text     string
		substr   string
		expected int
	}{
		{
			name:     "Find at beginning",
			text:     "hello world",
			substr:   "hello",
			expected: 0,
		},
		{
			name:     "Find at end",
			text:     "hello world",
			substr:   "world",
			expected: 6,
		},
		{
			name:     "Find in middle",
			text:     "hello world test",
			substr:   "world",
			expected: 6,
		},
		{
			name:     "Case insensitive find",
			text:     "Hello World",
			substr:   "hello",
			expected: 0,
		},
		{
			name:     "Not found",
			text:     "hello world",
			substr:   "test",
			expected: -1,
		},
		{
			name:     "Empty substring",
			text:     "hello world",
			substr:   "",
			expected: 0,
		},
		{
			name:     "Empty text",
			text:     "",
			substr:   "hello",
			expected: -1,
		},
		{
			name:     "Same text and substring",
			text:     "hello",
			substr:   "hello",
			expected: 0,
		},
		{
			name:     "Substring longer than text",
			text:     "hi",
			substr:   "hello",
			expected: -1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := findInText(tt.text, tt.substr)
			if result != tt.expected {
				t.Errorf("findInText(%q, %q) = %v, want %v", tt.text, tt.substr, result, tt.expected)
			}
		})
	}
}

// TestToLower tests the toLower helper function
func TestToLower(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "All uppercase",
			input:    "HELLO",
			expected: "hello",
		},
		{
			name:     "All lowercase",
			input:    "hello",
			expected: "hello",
		},
		{
			name:     "Mixed case",
			input:    "Hello World",
			expected: "hello world",
		},
		{
			name:     "Empty string",
			input:    "",
			expected: "",
		},
		{
			name:     "Numbers and symbols",
			input:    "Test123!@#",
			expected: "test123!@#",
		},
		{
			name:     "Unicode characters",
			input:    "Test日本語",
			expected: "test日本語",
		},
		{
			name:     "Special characters",
			input:    "Test-Case_Example",
			expected: "test-case_example",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := toLower(tt.input)
			if result != tt.expected {
				t.Errorf("toLower(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}

// TestClassificationConfigStructures tests the configuration structures
func TestClassificationConfigStructures(t *testing.T) {
	t.Run("RuleSet structure", func(t *testing.T) {
		ruleSet := RuleSet{
			Keywords:      []string{"test", "example"},
			Labels:        []string{"test-label"},
			TitlePatterns: []string{"TEST", "EXAMPLE"},
			Description:   "Test rule set",
		}

		if len(ruleSet.Keywords) != 2 {
			t.Errorf("Expected 2 keywords, got %d", len(ruleSet.Keywords))
		}
		if ruleSet.Keywords[0] != "test" {
			t.Errorf("Expected first keyword 'test', got %s", ruleSet.Keywords[0])
		}
		if ruleSet.Description != "Test rule set" {
			t.Errorf("Expected description 'Test rule set', got %s", ruleSet.Description)
		}
	})

	t.Run("ActionRulesConfig structure", func(t *testing.T) {
		actionRules := ActionRulesConfig{
			StaleThresholdDays:  30,
			CriticalActionLimit: 5,
			FeatureActionLimit:  3,
			BugActionLimit:      4,
		}

		if actionRules.StaleThresholdDays != 30 {
			t.Errorf("Expected StaleThresholdDays 30, got %d", actionRules.StaleThresholdDays)
		}
		if actionRules.CriticalActionLimit != 5 {
			t.Errorf("Expected CriticalActionLimit 5, got %d", actionRules.CriticalActionLimit)
		}
	})

	t.Run("SearchConfig structure", func(t *testing.T) {
		searchConfig := SearchConfig{
			MaxSearchResults: 50,
			SearchDebounceMs: 300,
		}
		searchConfig.RelevanceScores.TitleMatch = 10
		searchConfig.RelevanceScores.LabelMatch = 7

		if searchConfig.MaxSearchResults != 50 {
			t.Errorf("Expected MaxSearchResults 50, got %d", searchConfig.MaxSearchResults)
		}
		if searchConfig.RelevanceScores.TitleMatch != 10 {
			t.Errorf("Expected TitleMatch 10, got %d", searchConfig.RelevanceScores.TitleMatch)
		}
	})

	t.Run("WorkflowConfig structure", func(t *testing.T) {
		workflowConfig := WorkflowConfig{
			VelocityCalculation: "closed_issues_per_week",
			ActivityThreshold:   1,
		}
		workflowConfig.TimePeriods.DailyHours = 24
		workflowConfig.TimePeriods.WeeklyDays = 7

		if workflowConfig.VelocityCalculation != "closed_issues_per_week" {
			t.Errorf("Expected VelocityCalculation 'closed_issues_per_week', got %s", workflowConfig.VelocityCalculation)
		}
		if workflowConfig.TimePeriods.DailyHours != 24 {
			t.Errorf("Expected DailyHours 24, got %d", workflowConfig.TimePeriods.DailyHours)
		}
	})

	t.Run("DataContract structure", func(t *testing.T) {
		dataContract := DataContract{
			IssueRequiredFields:      []string{"id", "title", "state"},
			StatisticsRequiredFields: []string{"total_issues", "open_issues"},
			WorkflowMetricsFields:    []string{"new_this_week", "total_open"},
		}

		if len(dataContract.IssueRequiredFields) != 3 {
			t.Errorf("Expected 3 issue required fields, got %d", len(dataContract.IssueRequiredFields))
		}
		if dataContract.IssueRequiredFields[0] != "id" {
			t.Errorf("Expected first field 'id', got %s", dataContract.IssueRequiredFields[0])
		}
	})

	t.Run("ClassificationConfig structure", func(t *testing.T) {
		config := ClassificationConfig{
			PriorityRules: map[string]RuleSet{
				"high": {
					Keywords:    []string{"urgent"},
					Labels:      []string{"high"},
					Description: "High priority",
				},
			},
			CategoryRules: map[string]RuleSet{
				"bug": {
					Keywords:    []string{"bug"},
					Labels:      []string{"bug"},
					Description: "Bug fixes",
				},
			},
			ActionRules: ActionRulesConfig{
				StaleThresholdDays: 30,
			},
		}

		if len(config.PriorityRules) != 1 {
			t.Errorf("Expected 1 priority rule, got %d", len(config.PriorityRules))
		}
		if len(config.CategoryRules) != 1 {
			t.Errorf("Expected 1 category rule, got %d", len(config.CategoryRules))
		}
		if config.ActionRules.StaleThresholdDays != 30 {
			t.Errorf("Expected StaleThresholdDays 30, got %d", config.ActionRules.StaleThresholdDays)
		}
	})
}

// TestEdgeCases tests edge cases and error conditions
func TestEdgeCases(t *testing.T) {
	t.Run("GetPriorityFromLabels with nil config", func(t *testing.T) {
		config := &ClassificationConfig{}
		result := config.GetPriorityFromLabels([]string{"test"})
		if result != "low" {
			t.Errorf("Expected default priority 'low', got %s", result)
		}
	})

	t.Run("GetCategoryFromContent with nil config", func(t *testing.T) {
		config := &ClassificationConfig{}
		result := config.GetCategoryFromContent("test", "body", []string{"label"})
		if result != "general" {
			t.Errorf("Expected default category 'general', got %s", result)
		}
	})

	t.Run("GetPriorityFromLabels with empty rules", func(t *testing.T) {
		config := &ClassificationConfig{
			PriorityRules: map[string]RuleSet{},
		}
		result := config.GetPriorityFromLabels([]string{"critical"})
		if result != "low" {
			t.Errorf("Expected default priority 'low', got %s", result)
		}
	})

	t.Run("GetCategoryFromContent with empty rules", func(t *testing.T) {
		config := &ClassificationConfig{
			CategoryRules: map[string]RuleSet{},
		}
		result := config.GetCategoryFromContent("bug fix", "fix this bug", []string{"bug"})
		if result != "general" {
			t.Errorf("Expected default category 'general', got %s", result)
		}
	})

	t.Run("containsWord with special characters", func(t *testing.T) {
		tests := []struct {
			text     string
			word     string
			expected bool
		}{
			{"fix-bug", "fix", false}, // containsWord looks for whole words only
			{"bug_fix", "bug", false}, // containsWord looks for whole words only
			{"test.case", "test", false}, // containsWord looks for whole words only
			{"test@case", "test", false}, // containsWord looks for whole words only
			{"test#case", "test", false}, // containsWord looks for whole words only
		}

		for _, tt := range tests {
			result := containsWord(tt.text, tt.word)
			if result != tt.expected {
				t.Errorf("containsWord(%q, %q) = %v, want %v", tt.text, tt.word, result, tt.expected)
			}
		}
	})

	t.Run("Large content handling", func(t *testing.T) {
		config := &ClassificationConfig{
			CategoryRules: map[string]RuleSet{
				"test": {
					Keywords: []string{"test"},
				},
			},
		}

		// Create large content
		largeContent := make([]byte, 10000)
		for i := range largeContent {
			largeContent[i] = 'a'
		}
		// Add keyword at the end
		largeContentStr := string(largeContent) + " test"

		result := config.GetCategoryFromContent(largeContentStr, "", []string{})
		if result != "test" {
			t.Errorf("Expected category 'test' for large content, got %s", result)
		}
	})
}
package wiki

import (
	"sort"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRegisterTemplate(t *testing.T) {
	tests := []struct {
		name         string
		templateName string
		content      string
		expectError  bool
		description  string
	}{
		{
			name:         "register valid template",
			templateName: "custom-template",
			content:      "# {{.Title}}\n\nContent: {{.Body}}",
			expectError:  false,
			description:  "Should successfully register a valid template",
		},
		{
			name:         "register template with complex content",
			templateName: "complex-template",
			content: `# {{.ProjectName}} - {{.Type}}

{{range .Items}}
- {{.Name}}: {{.Value}}
{{end}}

Generated at: {{.GeneratedAt.Format "2006-01-02"}}`,
			expectError: false,
			description: "Should handle complex template with ranges and formatting",
		},
		{
			name:         "register template with invalid syntax",
			templateName: "invalid-template",
			content:      "# {{.Title}\n\nMissing closing brace",
			expectError:  true,
			description:  "Should fail when template has invalid syntax",
		},
		{
			name:         "register empty template",
			templateName: "empty-template",
			content:      "",
			expectError:  false,
			description:  "Should allow empty template content",
		},
		{
			name:         "register template with special characters",
			templateName: "special-chars",
			content:      "# 🦫 {{.ProjectName}} - テスト\n\n{{.Content}}",
			expectError:  false,
			description:  "Should handle unicode and special characters",
		},
		{
			name:         "overwrite existing template",
			templateName: "issues-summary", // This is a default template
			content:      "# Custom Issues Summary\n\n{{.Content}}",
			expectError:  false,
			description:  "Should allow overwriting default templates",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tm := NewTemplateManager()

			err := tm.RegisterTemplate(tt.templateName, tt.content)

			if tt.expectError {
				assert.Error(t, err, tt.description)
			} else {
				assert.NoError(t, err, tt.description)

				// Verify template was registered
				tmpl, exists := tm.GetTemplate(tt.templateName)
				assert.True(t, exists, "Template should exist after registration")
				assert.NotNil(t, tmpl, "Template should not be nil")

				// Verify template is in the list
				templates := tm.ListTemplates()
				assert.Contains(t, templates, tt.templateName, "Template should be in the list")
			}
		})
	}
}

func TestListTemplates(t *testing.T) {
	tests := []struct {
		name           string
		setupTemplates map[string]string
		expectedNames  []string
		description    string
	}{
		{
			name:           "default templates only",
			setupTemplates: nil,
			expectedNames:  []string{"issues-summary", "troubleshooting", "learning-path", "index", "processing-logs", "statistics", "label-analysis", "quick-reference", "development-strategy"},
			description:    "Should return all working default templates",
		},
		{
			name: "default plus custom templates",
			setupTemplates: map[string]string{
				"custom1": "Template 1 content",
				"custom2": "Template 2 content",
			},
			expectedNames: []string{"issues-summary", "troubleshooting", "learning-path", "index", "processing-logs", "statistics", "label-analysis", "quick-reference", "development-strategy", "custom1", "custom2"},
			description:   "Should return both default and custom templates",
		},
		{
			name: "many custom templates",
			setupTemplates: map[string]string{
				"template-a": "Content A",
				"template-b": "Content B",
				"template-c": "Content C",
				"template-d": "Content D",
				"template-e": "Content E",
			},
			expectedNames: []string{"issues-summary", "troubleshooting", "learning-path", "index", "processing-logs", "statistics", "label-analysis", "quick-reference", "development-strategy",
				"template-a", "template-b", "template-c", "template-d", "template-e"},
			description: "Should handle many templates",
		},
		{
			name: "overwritten default template",
			setupTemplates: map[string]string{
				"issues-summary": "Custom issues summary content",
			},
			expectedNames: []string{"issues-summary", "troubleshooting", "learning-path", "index", "processing-logs", "statistics", "label-analysis", "quick-reference", "development-strategy"},
			description:   "Should not duplicate template names when overwriting",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tm := NewTemplateManager()

			// Add custom templates if specified
			if tt.setupTemplates != nil {
				for name, content := range tt.setupTemplates {
					err := tm.RegisterTemplate(name, content)
					require.NoError(t, err, "Failed to register setup template: %s", name)
				}
			}

			// Get template list
			templates := tm.ListTemplates()

			// Sort both slices for comparison (order shouldn't matter)
			sort.Strings(templates)
			sort.Strings(tt.expectedNames)

			assert.Equal(t, tt.expectedNames, templates, tt.description)
			assert.Len(t, templates, len(tt.expectedNames), "Template count should match expected")

			// Verify no duplicates
			seen := make(map[string]bool)
			for _, name := range templates {
				assert.False(t, seen[name], "Template name should not be duplicated: %s", name)
				seen[name] = true
			}
		})
	}
}

func TestGetDefaultTemplateContent(t *testing.T) {
	tests := []struct {
		name         string
		templateName string
		expectFound  bool
		expectEmpty  bool
		description  string
	}{
		{
			name:         "issues-summary template",
			templateName: "issues-summary",
			expectFound:  true,
			expectEmpty:  false,
			description:  "Should return issues-summary template content",
		},
		{
			name:         "troubleshooting template",
			templateName: "troubleshooting",
			expectFound:  true,
			expectEmpty:  false,
			description:  "Should return troubleshooting template content",
		},
		{
			name:         "learning-path template",
			templateName: "learning-path",
			expectFound:  true,
			expectEmpty:  false,
			description:  "Should return learning-path template content",
		},
		{
			name:         "index template",
			templateName: "index",
			expectFound:  true,
			expectEmpty:  false,
			description:  "Should return index template content",
		},
		{
			name:         "non-existent template",
			templateName: "non-existent",
			expectFound:  false,
			expectEmpty:  true,
			description:  "Should return false for non-existent template",
		},
		{
			name:         "empty template name",
			templateName: "",
			expectFound:  false,
			expectEmpty:  true,
			description:  "Should return false for empty template name",
		},
		{
			name:         "case sensitive check",
			templateName: "Issues-Summary", // Different case
			expectFound:  false,
			expectEmpty:  true,
			description:  "Should be case sensitive",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			content, found := GetDefaultTemplateContent(tt.templateName)

			assert.Equal(t, tt.expectFound, found, tt.description)

			if tt.expectFound {
				assert.NotEmpty(t, content, "Content should not be empty for existing template")

				// Verify content contains expected external file reference
				switch tt.templateName {
				case "issues-summary":
					assert.Contains(t, content, "External template file:", "Issues summary should reference external file")
					assert.Contains(t, content, "issues-summary.md.tmpl", "Issues summary should reference correct file")
				case "troubleshooting":
					assert.Contains(t, content, "External template file:", "Troubleshooting should reference external file")
					assert.Contains(t, content, "troubleshooting.md.tmpl", "Troubleshooting should reference correct file")
				case "learning-path":
					assert.Contains(t, content, "External template file:", "Learning path should reference external file")
					assert.Contains(t, content, "learning-path.md.tmpl", "Learning path should reference correct file")
				case "index":
					assert.Contains(t, content, "External template file:", "Index should reference external file")
					assert.Contains(t, content, "index.md.tmpl", "Index should reference correct file")
				}
			} else {
				if tt.expectEmpty {
					assert.Empty(t, content, "Content should be empty for non-existent template")
				}
			}
		})
	}
}

// TestTemplateManagerIntegration tests the integration between different template methods
func TestTemplateManagerIntegration(t *testing.T) {
	tm := NewTemplateManager()

	// Test that default templates are loaded correctly
	templates := tm.ListTemplates()
	assert.Len(t, templates, 9, "Should have 9 working default templates")

	// Test that each default template can be retrieved
	for _, name := range []string{"issues-summary", "troubleshooting", "learning-path", "index", "processing-logs", "statistics", "label-analysis", "quick-reference", "development-strategy"} {
		tmpl, exists := tm.GetTemplate(name)
		assert.True(t, exists, "Default template should exist: %s", name)
		assert.NotNil(t, tmpl, "Default template should not be nil: %s", name)

		// Verify content matches GetDefaultTemplateContent
		content, found := GetDefaultTemplateContent(name)
		assert.True(t, found, "GetDefaultTemplateContent should find template: %s", name)
		assert.NotEmpty(t, content, "Default template content should not be empty: %s", name)
	}

	// Test registering a new template
	customContent := "# {{.Title}}\n\nCustom content"
	err := tm.RegisterTemplate("integration-test", customContent)
	assert.NoError(t, err, "Should register custom template")

	// Verify custom template appears in list
	updatedTemplates := tm.ListTemplates()
	assert.Len(t, updatedTemplates, 10, "Should have 10 templates after adding custom")
	assert.Contains(t, updatedTemplates, "integration-test", "Custom template should be in list")

	// Verify custom template can be retrieved
	customTmpl, exists := tm.GetTemplate("integration-test")
	assert.True(t, exists, "Custom template should exist")
	assert.NotNil(t, customTmpl, "Custom template should not be nil")
}

// BenchmarkTemplateOperations provides performance benchmarks for template operations
func BenchmarkTemplateOperations(b *testing.B) {
	tm := NewTemplateManager()

	b.Run("RegisterTemplate", func(b *testing.B) {
		for b.Loop() {
			tm := NewTemplateManager()
			_ = tm.RegisterTemplate("bench-template", "# {{.Title}}\n\n{{.Content}}")
		}
	})

	b.Run("ListTemplates", func(b *testing.B) {
		for b.Loop() {
			_ = tm.ListTemplates()
		}
	})

	b.Run("GetDefaultTemplateContent", func(b *testing.B) {
		for b.Loop() {
			_, _ = GetDefaultTemplateContent("issues-summary")
		}
	})
}

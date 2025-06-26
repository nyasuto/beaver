//nolint:all
package wiki

import (
	"testing"
	"time"

	"github.com/nyasuto/beaver/internal/models"
)

func TestNewGenerator(t *testing.T) {
	generator := NewGenerator()
	if generator == nil {
		t.Fatal("NewGenerator() returned nil")
	}

	if generator.templateManager == nil {
		t.Fatal("NewGenerator() did not initialize template manager")
	}
}

func TestGenerateIssuesSummary(t *testing.T) {
	generator := NewGenerator()

	// Create test issues
	issues := []models.Issue{
		{
			ID:        1,
			Number:    1,
			Title:     "Test issue 1",
			Body:      "This is a test issue",
			State:     "open",
			User:      models.User{ID: 1, Login: "testuser"},
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
			Labels:    []models.Label{{ID: 1, Name: "bug"}, {ID: 2, Name: "feature"}},
		},
		{
			ID:        2,
			Number:    2,
			Title:     "Test issue 2",
			Body:      "This is another test issue",
			State:     "closed",
			User:      models.User{ID: 2, Login: "testuser2"},
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
			Labels:    []models.Label{{ID: 3, Name: "enhancement"}},
		},
	}

	projectName := "test/project"

	page, err := generator.GenerateIssuesSummary(issues, projectName)
	if err != nil {
		t.Fatalf("GenerateIssuesSummary() failed: %v", err)
	}

	if page == nil {
		t.Fatal("GenerateIssuesSummary() returned nil page")
	}

	if page.Title == "" {
		t.Error("Generated page has empty title")
	}

	if page.Content == "" {
		t.Error("Generated page has empty content")
	}

	if page.Filename != "Issues-Summary.md" {
		t.Errorf("Expected filename 'Issues-Summary.md', got '%s'", page.Filename)
	}

	if page.Category != "Summary" {
		t.Errorf("Expected category 'Summary', got '%s'", page.Category)
	}
}

func TestGenerateTroubleshootingGuide(t *testing.T) {
	generator := NewGenerator()

	// Create test issues with some closed issues
	issues := []models.Issue{
		{
			ID:        1,
			Number:    1,
			Title:     "Error connecting to database",
			Body:      "Getting connection timeout error when connecting to the database",
			State:     "closed",
			User:      models.User{ID: 1, Login: "developer1"},
			CreatedAt: time.Now().Add(-10 * 24 * time.Hour),
			UpdatedAt: time.Now().Add(-5 * 24 * time.Hour),
			Labels:    []models.Label{{ID: 1, Name: "bug"}, {ID: 2, Name: "database"}},
		},
		{
			ID:        2,
			Number:    2,
			Title:     "Feature request: Add authentication",
			Body:      "We need to add user authentication to the application",
			State:     "open",
			User:      models.User{ID: 2, Login: "product_owner"},
			CreatedAt: time.Now().Add(-3 * 24 * time.Hour),
			UpdatedAt: time.Now().Add(-1 * 24 * time.Hour),
			Labels:    []models.Label{{ID: 3, Name: "feature"}, {ID: 4, Name: "authentication"}},
		},
	}

	projectName := "test/project"

	page, err := generator.GenerateTroubleshootingGuide(issues, projectName)
	if err != nil {
		t.Fatalf("GenerateTroubleshootingGuide() failed: %v", err)
	}

	if page == nil {
		t.Fatal("GenerateTroubleshootingGuide() returned nil page")
	}

	if page.Filename != "Troubleshooting-Guide.md" {
		t.Errorf("Expected filename 'Troubleshooting-Guide.md', got '%s'", page.Filename)
	}

	if page.Category != "Guide" {
		t.Errorf("Expected category 'Guide', got '%s'", page.Category)
	}
}

func TestGenerateLearningPath(t *testing.T) {
	generator := NewGenerator()

	// Create test issues that represent learning progression
	issues := []models.Issue{
		{
			ID:        1,
			Number:    1,
			Title:     "Learn Go programming",
			Body:      "Need to learn Go programming language for this project",
			State:     "closed",
			User:      models.User{ID: 1, Login: "learner"},
			CreatedAt: time.Now().Add(-30 * 24 * time.Hour),
			UpdatedAt: time.Now().Add(-25 * 24 * time.Hour),
			Labels:    []models.Label{{ID: 1, Name: "learning"}, {ID: 2, Name: "go"}},
		},
		{
			ID:        2,
			Number:    2,
			Title:     "Implement REST API",
			Body:      "Learn how to implement REST API using Go",
			State:     "open",
			User:      models.User{ID: 2, Login: "developer"},
			CreatedAt: time.Now().Add(-20 * 24 * time.Hour),
			UpdatedAt: time.Now().Add(-1 * 24 * time.Hour),
			Labels:    []models.Label{{ID: 3, Name: "feature"}, {ID: 4, Name: "api"}},
		},
	}

	projectName := "test/project"

	page, err := generator.GenerateLearningPath(issues, projectName)
	if err != nil {
		t.Fatalf("GenerateLearningPath() failed: %v", err)
	}

	if page == nil {
		t.Fatal("GenerateLearningPath() returned nil page")
	}

	if page.Filename != "Learning-Path.md" {
		t.Errorf("Expected filename 'Learning-Path.md', got '%s'", page.Filename)
	}

	if page.Category != "Learning" {
		t.Errorf("Expected category 'Learning', got '%s'", page.Category)
	}
}

func TestGenerateIndex(t *testing.T) {
	generator := NewGenerator()

	issues := []models.Issue{
		{
			ID:        1,
			Number:    1,
			Title:     "Test issue",
			Body:      "Test issue body",
			State:     "open",
			User:      models.User{ID: 1, Login: "testuser"},
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
			Labels:    []models.Label{{ID: 1, Name: "test"}},
		},
	}

	projectName := "test/project"

	page, err := generator.GenerateIndex(issues, projectName)
	if err != nil {
		t.Fatalf("GenerateIndex() failed: %v", err)
	}

	if page == nil {
		t.Fatal("GenerateIndex() returned nil page")
	}

	if page.Filename != "Home.md" {
		t.Errorf("Expected filename 'Home.md', got '%s'", page.Filename)
	}

	if page.Category != "Index" {
		t.Errorf("Expected category 'Index', got '%s'", page.Category)
	}
}

func TestGenerateAllPages(t *testing.T) {
	generator := NewGenerator()

	issues := []models.Issue{
		{
			ID:        1,
			Number:    1,
			Title:     "Test issue 1",
			Body:      "This is a test issue",
			State:     "open",
			User:      models.User{ID: 1, Login: "testuser"},
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
			Labels:    []models.Label{{ID: 1, Name: "bug"}},
		},
		{
			ID:        2,
			Number:    2,
			Title:     "Test issue 2",
			Body:      "This is another test issue",
			State:     "closed",
			User:      models.User{ID: 2, Login: "testuser2"},
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
			Labels:    []models.Label{{ID: 2, Name: "feature"}},
		},
	}

	projectName := "test/project"

	pages, err := generator.GenerateAllPages(issues, projectName)
	if err != nil {
		t.Fatalf("GenerateAllPages() failed: %v", err)
	}

	if len(pages) != 4 {
		t.Errorf("Expected 4 pages, got %d", len(pages))
	}

	// Check that all expected pages are generated
	expectedFilenames := map[string]bool{
		"Home.md":                  false,
		"Issues-Summary.md":        false,
		"Troubleshooting-Guide.md": false,
		"Learning-Path.md":         false,
	}

	for _, page := range pages {
		if _, exists := expectedFilenames[page.Filename]; exists {
			expectedFilenames[page.Filename] = true
		}
	}

	for filename, found := range expectedFilenames {
		if !found {
			t.Errorf("Expected page '%s' was not generated", filename)
		}
	}
}

func TestBatchProcessor(t *testing.T) {
	batchSize := 2
	maxIssues := 5

	processor := NewBatchProcessor(batchSize, maxIssues)
	if processor == nil {
		t.Fatal("NewBatchProcessor() returned nil")
	}

	if processor.batchSize != batchSize {
		t.Errorf("Expected batch size %d, got %d", batchSize, processor.batchSize)
	}

	if processor.maxIssues != maxIssues {
		t.Errorf("Expected max issues %d, got %d", maxIssues, processor.maxIssues)
	}
}

func TestBatchProcessorProcessInBatches(t *testing.T) {
	// Create test issues
	issues := make([]models.Issue, 6)
	for i := 0; i < 6; i++ {
		issues[i] = models.Issue{
			ID:        int64(i + 1),
			Number:    i + 1,
			Title:     "Test issue " + string(rune('A'+i)),
			Body:      "Test body",
			State:     "open",
			User:      models.User{ID: int64(i + 1), Login: "testuser"},
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
			Labels:    []models.Label{{ID: 1, Name: "test"}},
		}
	}

	processor := NewBatchProcessor(2, 4) // Process 2 at a time, max 4 issues
	projectName := "test/project"

	batchCount := 0
	totalPages := 0

	callback := func(pages []*WikiPage) error {
		batchCount++
		totalPages += len(pages)

		// Each batch should generate 4 pages (index, summary, troubleshooting, learning)
		if len(pages) != 4 {
			t.Errorf("Expected 4 pages per batch, got %d", len(pages))
		}

		return nil
	}

	err := processor.ProcessInBatches(issues, projectName, callback)
	if err != nil {
		t.Fatalf("ProcessInBatches() failed: %v", err)
	}

	// Should process 4 issues in 2 batches (2 + 2)
	expectedBatches := 2
	if batchCount != expectedBatches {
		t.Errorf("Expected %d batches, got %d", expectedBatches, batchCount)
	}
}

func TestHelperFunctions(t *testing.T) {
	// Test containsErrorKeywords
	if !containsErrorKeywords("This is an error message") {
		t.Error("containsErrorKeywords() should return true for 'error' keyword")
	}

	if containsErrorKeywords("This is a success message") {
		t.Error("containsErrorKeywords() should return false for non-error text")
	}

	// Test containsLearningKeywords
	if !containsLearningKeywords("Let's learn something new") {
		t.Error("containsLearningKeywords() should return true for 'learn' keyword")
	}

	if containsLearningKeywords("This is just normal text") {
		t.Error("containsLearningKeywords() should return false for non-learning text")
	}

	// Test truncateString
	longString := "This is a very long string that should be truncated"
	truncated := truncateString(longString, 20)
	if len(truncated) > 23 { // 20 + "..." = 23
		t.Errorf("truncateString() didn't truncate properly: got %d chars", len(truncated))
	}

	shortString := "Short"
	notTruncated := truncateString(shortString, 20)
	if notTruncated != shortString {
		t.Error("truncateString() shouldn't truncate strings shorter than limit")
	}
}

// Benchmark tests
func BenchmarkGenerateIssuesSummary(b *testing.B) {
	generator := NewGenerator()

	// Create a larger set of test issues
	issues := make([]models.Issue, 100)
	for i := 0; i < 100; i++ {
		issues[i] = models.Issue{
			ID:        int64(i + 1),
			Number:    i + 1,
			Title:     "Benchmark issue " + string(rune('A'+(i%26))),
			Body:      "This is a benchmark test issue with some content that is longer than usual to test performance",
			State:     "open",
			User:      models.User{ID: int64(i + 1), Login: "benchuser"},
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
			Labels:    []models.Label{{ID: 1, Name: "benchmark"}, {ID: 2, Name: "test"}},
		}
	}

	projectName := "benchmark/project"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := generator.GenerateIssuesSummary(issues, projectName)
		if err != nil {
			b.Fatalf("GenerateIssuesSummary() failed: %v", err)
		}
	}
}

func BenchmarkGenerateAllPages(b *testing.B) {
	generator := NewGenerator()

	// Create test issues
	issues := make([]models.Issue, 50)
	for i := 0; i < 50; i++ {
		issues[i] = models.Issue{
			ID:        int64(i + 1),
			Number:    i + 1,
			Title:     "Benchmark issue " + string(rune('A'+(i%26))),
			Body:      "Benchmark test content",
			State:     "open",
			User:      models.User{ID: int64(i + 1), Login: "benchuser"},
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
			Labels:    []models.Label{{ID: 1, Name: "benchmark"}},
		}
	}

	projectName := "benchmark/project"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := generator.GenerateAllPages(issues, projectName)
		if err != nil {
			b.Fatalf("GenerateAllPages() failed: %v", err)
		}
	}
}

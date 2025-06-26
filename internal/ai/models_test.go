package ai

import (
	"encoding/json"
	"testing"
	"time"
)

func TestAIProvider(t *testing.T) {
	tests := []struct {
		name     string
		provider AIProvider
		expected string
	}{
		{
			name:     "OpenAI provider",
			provider: ProviderOpenAI,
			expected: "openai",
		},
		{
			name:     "Anthropic provider",
			provider: ProviderAnthropic,
			expected: "anthropic",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if string(tt.provider) != tt.expected {
				t.Errorf("Provider = %v, want %v", tt.provider, tt.expected)
			}
		})
	}
}

func TestIssueData_JSON(t *testing.T) {
	now := time.Now()
	issue := IssueData{
		ID:     123,
		Number: 1,
		Title:  "Test Issue",
		Body:   "This is a test issue",
		State:  "open",
		Labels: []string{"bug", "enhancement"},
		Comments: []IssueComment{
			{
				ID:        456,
				Body:      "Test comment",
				User:      "testuser",
				CreatedAt: now,
			},
		},
		CreatedAt: now,
		UpdatedAt: now,
		User:      "author",
	}

	// Test JSON marshaling
	data, err := json.Marshal(issue)
	if err != nil {
		t.Fatalf("Failed to marshal IssueData: %v", err)
	}

	// Test JSON unmarshaling
	var unmarshaled IssueData
	err = json.Unmarshal(data, &unmarshaled)
	if err != nil {
		t.Fatalf("Failed to unmarshal IssueData: %v", err)
	}

	// Verify fields
	if unmarshaled.ID != issue.ID {
		t.Errorf("ID = %d, want %d", unmarshaled.ID, issue.ID)
	}
	if unmarshaled.Title != issue.Title {
		t.Errorf("Title = %s, want %s", unmarshaled.Title, issue.Title)
	}
	if len(unmarshaled.Labels) != len(issue.Labels) {
		t.Errorf("Labels length = %d, want %d", len(unmarshaled.Labels), len(issue.Labels))
	}
	if len(unmarshaled.Comments) != len(issue.Comments) {
		t.Errorf("Comments length = %d, want %d", len(unmarshaled.Comments), len(issue.Comments))
	}
}

func TestNewSummarizationRequest(t *testing.T) {
	issue := IssueData{
		ID:        123,
		Number:    1,
		Title:     "Test Issue",
		Body:      "This is a test issue",
		State:     "open",
		Labels:    []string{"bug"},
		Comments:  []IssueComment{},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		User:      "testuser",
	}

	req := NewSummarizationRequest(issue)

	if req == nil {
		t.Fatal("NewSummarizationRequest returned nil")
	}

	if req.Issue.ID != issue.ID {
		t.Errorf("Issue.ID = %d, want %d", req.Issue.ID, issue.ID)
	}

	if req.Provider == nil || *req.Provider != ProviderOpenAI {
		t.Errorf("Provider = %v, want %v", req.Provider, ProviderOpenAI)
	}

	if !req.IncludeComments {
		t.Error("IncludeComments should be true by default")
	}

	if req.Language != "ja" {
		t.Errorf("Language = %s, want ja", req.Language)
	}
}

func TestSummarizationRequest_Builders(t *testing.T) {
	issue := IssueData{
		ID:        123,
		Number:    1,
		Title:     "Test Issue",
		Body:      "This is a test issue",
		State:     "open",
		Labels:    []string{"bug"},
		Comments:  []IssueComment{},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		User:      "testuser",
	}

	req := NewSummarizationRequest(issue).
		WithProvider(ProviderAnthropic).
		WithModel("claude-3-sonnet").
		WithMaxTokens(1000).
		WithTemperature(0.7).
		WithLanguage("en").
		WithComments(false)

	if req.Provider == nil || *req.Provider != ProviderAnthropic {
		t.Errorf("Provider = %v, want %v", req.Provider, ProviderAnthropic)
	}

	if req.Model == nil || *req.Model != "claude-3-sonnet" {
		t.Errorf("Model = %v, want claude-3-sonnet", req.Model)
	}

	if req.MaxTokens == nil || *req.MaxTokens != 1000 {
		t.Errorf("MaxTokens = %v, want 1000", req.MaxTokens)
	}

	if req.Temperature == nil || *req.Temperature != 0.7 {
		t.Errorf("Temperature = %v, want 0.7", req.Temperature)
	}

	if req.Language != "en" {
		t.Errorf("Language = %s, want en", req.Language)
	}

	if req.IncludeComments {
		t.Error("IncludeComments should be false")
	}
}

func TestNewBatchSummarizationRequest(t *testing.T) {
	issues := []IssueData{
		{
			ID:        123,
			Number:    1,
			Title:     "Test Issue 1",
			Body:      "This is test issue 1",
			State:     "open",
			Labels:    []string{"bug"},
			Comments:  []IssueComment{},
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
			User:      "testuser",
		},
		{
			ID:        124,
			Number:    2,
			Title:     "Test Issue 2",
			Body:      "This is test issue 2",
			State:     "closed",
			Labels:    []string{"enhancement"},
			Comments:  []IssueComment{},
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
			User:      "testuser",
		},
	}

	req := NewBatchSummarizationRequest(issues)

	if req == nil {
		t.Fatal("NewBatchSummarizationRequest returned nil")
	}

	if len(req.Issues) != len(issues) {
		t.Errorf("Issues length = %d, want %d", len(req.Issues), len(issues))
	}

	if req.Provider == nil || *req.Provider != ProviderOpenAI {
		t.Errorf("Provider = %v, want %v", req.Provider, ProviderOpenAI)
	}

	if !req.IncludeComments {
		t.Error("IncludeComments should be true by default")
	}

	if req.Language != "ja" {
		t.Errorf("Language = %s, want ja", req.Language)
	}
}

func TestBatchSummarizationRequest_Builders(t *testing.T) {
	issues := []IssueData{
		{
			ID:        123,
			Number:    1,
			Title:     "Test Issue 1",
			Body:      "This is test issue 1",
			State:     "open",
			Labels:    []string{"bug"},
			Comments:  []IssueComment{},
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
			User:      "testuser",
		},
	}

	req := NewBatchSummarizationRequest(issues).
		WithProvider(ProviderAnthropic).
		WithModel("claude-3-sonnet").
		WithMaxTokens(2000).
		WithTemperature(0.5).
		WithLanguage("en").
		WithComments(false)

	if req.Provider == nil || *req.Provider != ProviderAnthropic {
		t.Errorf("Provider = %v, want %v", req.Provider, ProviderAnthropic)
	}

	if req.Model == nil || *req.Model != "claude-3-sonnet" {
		t.Errorf("Model = %v, want claude-3-sonnet", req.Model)
	}

	if req.MaxTokens == nil || *req.MaxTokens != 2000 {
		t.Errorf("MaxTokens = %v, want 2000", req.MaxTokens)
	}

	if req.Temperature == nil || *req.Temperature != 0.5 {
		t.Errorf("Temperature = %v, want 0.5", req.Temperature)
	}

	if req.Language != "en" {
		t.Errorf("Language = %s, want en", req.Language)
	}

	if req.IncludeComments {
		t.Error("IncludeComments should be false")
	}
}

func TestSummarizationResponse_JSON(t *testing.T) {
	response := SummarizationResponse{
		Summary:        "Test summary",
		KeyPoints:      []string{"Point 1", "Point 2"},
		Category:       stringPtr("bug"),
		Complexity:     "medium",
		ProcessingTime: 1.5,
		ProviderUsed:   ProviderOpenAI,
		ModelUsed:      "gpt-3.5-turbo",
		TokenUsage: map[string]int{
			"prompt":     100,
			"completion": 50,
			"total":      150,
		},
	}

	// Test JSON marshaling
	data, err := json.Marshal(response)
	if err != nil {
		t.Fatalf("Failed to marshal SummarizationResponse: %v", err)
	}

	// Test JSON unmarshaling
	var unmarshaled SummarizationResponse
	err = json.Unmarshal(data, &unmarshaled)
	if err != nil {
		t.Fatalf("Failed to unmarshal SummarizationResponse: %v", err)
	}

	// Verify fields
	if unmarshaled.Summary != response.Summary {
		t.Errorf("Summary = %s, want %s", unmarshaled.Summary, response.Summary)
	}
	if len(unmarshaled.KeyPoints) != len(response.KeyPoints) {
		t.Errorf("KeyPoints length = %d, want %d", len(unmarshaled.KeyPoints), len(response.KeyPoints))
	}
	if unmarshaled.Complexity != response.Complexity {
		t.Errorf("Complexity = %s, want %s", unmarshaled.Complexity, response.Complexity)
	}
	if unmarshaled.ProviderUsed != response.ProviderUsed {
		t.Errorf("ProviderUsed = %v, want %v", unmarshaled.ProviderUsed, response.ProviderUsed)
	}
}

func TestBatchSummarizationResponse_JSON(t *testing.T) {
	response := BatchSummarizationResponse{
		Results: []SummarizationResponse{
			{
				Summary:        "Summary 1",
				KeyPoints:      []string{"Point 1"},
				Complexity:     "low",
				ProcessingTime: 1.0,
				ProviderUsed:   ProviderOpenAI,
				ModelUsed:      "gpt-3.5-turbo",
			},
		},
		TotalProcessed: 1,
		TotalFailed:    0,
		ProcessingTime: 1.2,
		FailedIssues:   []FailedIssue{},
	}

	// Test JSON marshaling
	data, err := json.Marshal(response)
	if err != nil {
		t.Fatalf("Failed to marshal BatchSummarizationResponse: %v", err)
	}

	// Test JSON unmarshaling
	var unmarshaled BatchSummarizationResponse
	err = json.Unmarshal(data, &unmarshaled)
	if err != nil {
		t.Fatalf("Failed to unmarshal BatchSummarizationResponse: %v", err)
	}

	// Verify fields
	if len(unmarshaled.Results) != len(response.Results) {
		t.Errorf("Results length = %d, want %d", len(unmarshaled.Results), len(response.Results))
	}
	if unmarshaled.TotalProcessed != response.TotalProcessed {
		t.Errorf("TotalProcessed = %d, want %d", unmarshaled.TotalProcessed, response.TotalProcessed)
	}
	if unmarshaled.TotalFailed != response.TotalFailed {
		t.Errorf("TotalFailed = %d, want %d", unmarshaled.TotalFailed, response.TotalFailed)
	}
}

func TestHealthResponse_JSON(t *testing.T) {
	now := time.Now()
	response := HealthResponse{
		Status:      "healthy",
		Timestamp:   now,
		Version:     "1.0.0",
		Environment: "test",
		AIProviders: map[string]bool{
			"openai":    true,
			"anthropic": false,
		},
		Features: map[string]bool{
			"summarization": true,
			"batch":         true,
		},
	}

	// Test JSON marshaling
	data, err := json.Marshal(response)
	if err != nil {
		t.Fatalf("Failed to marshal HealthResponse: %v", err)
	}

	// Test JSON unmarshaling
	var unmarshaled HealthResponse
	err = json.Unmarshal(data, &unmarshaled)
	if err != nil {
		t.Fatalf("Failed to unmarshal HealthResponse: %v", err)
	}

	// Verify fields
	if unmarshaled.Status != response.Status {
		t.Errorf("Status = %s, want %s", unmarshaled.Status, response.Status)
	}
	if unmarshaled.Version != response.Version {
		t.Errorf("Version = %s, want %s", unmarshaled.Version, response.Version)
	}
	if len(unmarshaled.AIProviders) != len(response.AIProviders) {
		t.Errorf("AIProviders length = %d, want %d", len(unmarshaled.AIProviders), len(response.AIProviders))
	}
}

func TestErrorResponse_JSON(t *testing.T) {
	now := time.Now()
	response := ErrorResponse{
		Error:     "Test error",
		Detail:    stringPtr("Detailed error message"),
		ErrorCode: stringPtr("ERR001"),
		Timestamp: &now,
	}

	// Test JSON marshaling
	data, err := json.Marshal(response)
	if err != nil {
		t.Fatalf("Failed to marshal ErrorResponse: %v", err)
	}

	// Test JSON unmarshaling
	var unmarshaled ErrorResponse
	err = json.Unmarshal(data, &unmarshaled)
	if err != nil {
		t.Fatalf("Failed to unmarshal ErrorResponse: %v", err)
	}

	// Verify fields
	if unmarshaled.Error != response.Error {
		t.Errorf("Error = %s, want %s", unmarshaled.Error, response.Error)
	}
	if unmarshaled.Detail == nil || *unmarshaled.Detail != *response.Detail {
		t.Errorf("Detail = %v, want %v", unmarshaled.Detail, response.Detail)
	}
	if unmarshaled.ErrorCode == nil || *unmarshaled.ErrorCode != *response.ErrorCode {
		t.Errorf("ErrorCode = %v, want %v", unmarshaled.ErrorCode, response.ErrorCode)
	}
}

func TestIssueComment_JSON(t *testing.T) {
	now := time.Now()
	comment := IssueComment{
		ID:        123,
		Body:      "Test comment",
		User:      "testuser",
		CreatedAt: now,
	}

	// Test JSON marshaling
	data, err := json.Marshal(comment)
	if err != nil {
		t.Fatalf("Failed to marshal IssueComment: %v", err)
	}

	// Test JSON unmarshaling
	var unmarshaled IssueComment
	err = json.Unmarshal(data, &unmarshaled)
	if err != nil {
		t.Fatalf("Failed to unmarshal IssueComment: %v", err)
	}

	// Verify fields
	if unmarshaled.ID != comment.ID {
		t.Errorf("ID = %d, want %d", unmarshaled.ID, comment.ID)
	}
	if unmarshaled.Body != comment.Body {
		t.Errorf("Body = %s, want %s", unmarshaled.Body, comment.Body)
	}
	if unmarshaled.User != comment.User {
		t.Errorf("User = %s, want %s", unmarshaled.User, comment.User)
	}
}

func TestFailedIssue_JSON(t *testing.T) {
	failed := FailedIssue{
		IssueNumber: 123,
		Error:       "Processing failed",
	}

	// Test JSON marshaling
	data, err := json.Marshal(failed)
	if err != nil {
		t.Fatalf("Failed to marshal FailedIssue: %v", err)
	}

	// Test JSON unmarshaling
	var unmarshaled FailedIssue
	err = json.Unmarshal(data, &unmarshaled)
	if err != nil {
		t.Fatalf("Failed to unmarshal FailedIssue: %v", err)
	}

	// Verify fields
	if unmarshaled.IssueNumber != failed.IssueNumber {
		t.Errorf("IssueNumber = %d, want %d", unmarshaled.IssueNumber, failed.IssueNumber)
	}
	if unmarshaled.Error != failed.Error {
		t.Errorf("Error = %s, want %s", unmarshaled.Error, failed.Error)
	}
}

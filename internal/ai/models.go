package ai

import (
	"time"
)

// AIProvider represents supported AI providers
type AIProvider string

const (
	ProviderOpenAI    AIProvider = "openai"
	ProviderAnthropic AIProvider = "anthropic"
)

// IssueComment represents a GitHub issue comment
type IssueComment struct {
	ID        int       `json:"id" validate:"required"`
	Body      string    `json:"body" validate:"required"`
	User      string    `json:"user" validate:"required"`
	CreatedAt time.Time `json:"created_at" validate:"required"`
}

// IssueData represents GitHub issue data for processing
type IssueData struct {
	ID        int            `json:"id" validate:"required"`
	Number    int            `json:"number" validate:"required"`
	Title     string         `json:"title" validate:"required,max=500"`
	Body      string         `json:"body" validate:"required,max=50000"`
	State     string         `json:"state" validate:"required"`
	Labels    []string       `json:"labels"`
	Comments  []IssueComment `json:"comments"`
	CreatedAt time.Time      `json:"created_at" validate:"required"`
	UpdatedAt time.Time      `json:"updated_at" validate:"required"`
	User      string         `json:"user" validate:"required"`
}

// SummarizationRequest represents a request for issue summarization
type SummarizationRequest struct {
	Issue           IssueData   `json:"issue" validate:"required"`
	Provider        *AIProvider `json:"provider,omitempty"`
	Model           *string     `json:"model,omitempty"`
	MaxTokens       *int        `json:"max_tokens,omitempty" validate:"omitempty,min=100,max=4000"`
	Temperature     *float64    `json:"temperature,omitempty" validate:"omitempty,min=0,max=2"`
	IncludeComments bool        `json:"include_comments"`
	Language        string      `json:"language" validate:"required,oneof=ja en"`
}

// SummarizationResponse represents the response from summarization
type SummarizationResponse struct {
	Summary        string         `json:"summary"`
	KeyPoints      []string       `json:"key_points"`
	Category       *string        `json:"category,omitempty"`
	Complexity     string         `json:"complexity" validate:"oneof=low medium high"`
	ProcessingTime float64        `json:"processing_time"`
	ProviderUsed   AIProvider     `json:"provider_used"`
	ModelUsed      string         `json:"model_used"`
	TokenUsage     map[string]int `json:"token_usage,omitempty"`
}

// BatchSummarizationRequest represents a request for batch summarization
type BatchSummarizationRequest struct {
	Issues          []IssueData `json:"issues" validate:"required,max=50,dive"`
	Provider        *AIProvider `json:"provider,omitempty"`
	Model           *string     `json:"model,omitempty"`
	MaxTokens       *int        `json:"max_tokens,omitempty" validate:"omitempty,min=100,max=4000"`
	Temperature     *float64    `json:"temperature,omitempty" validate:"omitempty,min=0,max=2"`
	IncludeComments bool        `json:"include_comments"`
	Language        string      `json:"language" validate:"required,oneof=ja en"`
}

// FailedIssue represents an issue that failed processing
type FailedIssue struct {
	IssueNumber int    `json:"issue_number"`
	Error       string `json:"error"`
}

// BatchSummarizationResponse represents the response from batch summarization
type BatchSummarizationResponse struct {
	Results        []SummarizationResponse `json:"results"`
	TotalProcessed int                     `json:"total_processed"`
	TotalFailed    int                     `json:"total_failed"`
	ProcessingTime float64                 `json:"processing_time"`
	FailedIssues   []FailedIssue           `json:"failed_issues"`
}

// HealthResponse represents the health check response
type HealthResponse struct {
	Status      string          `json:"status"`
	Timestamp   time.Time       `json:"timestamp"`
	Version     string          `json:"version"`
	Environment string          `json:"environment"`
	AIProviders map[string]bool `json:"ai_providers"`
	Features    map[string]bool `json:"features"`
}

// ErrorResponse represents an error response from the API
type ErrorResponse struct {
	Error     string     `json:"error"`
	Detail    *string    `json:"detail,omitempty"`
	ErrorCode *string    `json:"error_code,omitempty"`
	Timestamp *time.Time `json:"timestamp,omitempty"`
}

// Helper functions for creating requests with defaults

// NewSummarizationRequest creates a new summarization request with defaults
func NewSummarizationRequest(issue IssueData) *SummarizationRequest {
	provider := ProviderOpenAI
	return &SummarizationRequest{
		Issue:           issue,
		Provider:        &provider,
		IncludeComments: true,
		Language:        "ja", // Default to Japanese per project settings
	}
}

// WithProvider sets the AI provider for the request
func (r *SummarizationRequest) WithProvider(provider AIProvider) *SummarizationRequest {
	r.Provider = &provider
	return r
}

// WithModel sets the model for the request
func (r *SummarizationRequest) WithModel(model string) *SummarizationRequest {
	r.Model = &model
	return r
}

// WithMaxTokens sets the max tokens for the request
func (r *SummarizationRequest) WithMaxTokens(tokens int) *SummarizationRequest {
	r.MaxTokens = &tokens
	return r
}

// WithTemperature sets the temperature for the request
func (r *SummarizationRequest) WithTemperature(temp float64) *SummarizationRequest {
	r.Temperature = &temp
	return r
}

// WithLanguage sets the language for the request
func (r *SummarizationRequest) WithLanguage(lang string) *SummarizationRequest {
	r.Language = lang
	return r
}

// WithComments controls whether to include comments in the analysis
func (r *SummarizationRequest) WithComments(include bool) *SummarizationRequest {
	r.IncludeComments = include
	return r
}

// NewBatchSummarizationRequest creates a new batch summarization request with defaults
func NewBatchSummarizationRequest(issues []IssueData) *BatchSummarizationRequest {
	provider := ProviderOpenAI
	return &BatchSummarizationRequest{
		Issues:          issues,
		Provider:        &provider,
		IncludeComments: true,
		Language:        "ja", // Default to Japanese per project settings
	}
}

// WithProvider sets the AI provider for the batch request
func (r *BatchSummarizationRequest) WithProvider(provider AIProvider) *BatchSummarizationRequest {
	r.Provider = &provider
	return r
}

// WithModel sets the model for the batch request
func (r *BatchSummarizationRequest) WithModel(model string) *BatchSummarizationRequest {
	r.Model = &model
	return r
}

// WithMaxTokens sets the max tokens for the batch request
func (r *BatchSummarizationRequest) WithMaxTokens(tokens int) *BatchSummarizationRequest {
	r.MaxTokens = &tokens
	return r
}

// WithTemperature sets the temperature for the batch request
func (r *BatchSummarizationRequest) WithTemperature(temp float64) *BatchSummarizationRequest {
	r.Temperature = &temp
	return r
}

// WithLanguage sets the language for the batch request
func (r *BatchSummarizationRequest) WithLanguage(lang string) *BatchSummarizationRequest {
	r.Language = lang
	return r
}

// WithComments controls whether to include comments in the batch analysis
func (r *BatchSummarizationRequest) WithComments(include bool) *BatchSummarizationRequest {
	r.IncludeComments = include
	return r
}

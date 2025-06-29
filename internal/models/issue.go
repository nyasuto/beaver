package models

import (
	"strings"
	"time"
)

// Label represents a GitHub issue label
type Label struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	Color       string `json:"color"`
	Description string `json:"description,omitempty"`
}

// User represents a GitHub user
type User struct {
	ID        int64  `json:"id"`
	Login     string `json:"login"`
	AvatarURL string `json:"avatar_url,omitempty"`
	HTMLURL   string `json:"html_url,omitempty"`
}

// Comment represents a GitHub issue comment
type Comment struct {
	ID        int64     `json:"id"`
	Body      string    `json:"body"`
	User      User      `json:"user"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	HTMLURL   string    `json:"html_url,omitempty"`
}

// ClassificationInfo represents AI classification results for an issue
type ClassificationInfo struct {
	Category       string    `json:"category"`
	Confidence     float64   `json:"confidence"`
	Reasoning      string    `json:"reasoning"`
	SuggestedTags  []string  `json:"suggested_tags"`
	Method         string    `json:"method"` // "ai", "rule-based", "hybrid"
	ProcessingTime float64   `json:"processing_time"`
	ClassifiedAt   time.Time `json:"classified_at"`
	ModelUsed      string    `json:"model_used,omitempty"`
	AIConfidence   float64   `json:"ai_confidence,omitempty"`
	RuleConfidence float64   `json:"rule_confidence,omitempty"`
}

// Issue represents a GitHub issue with all relevant information
type Issue struct {
	ID          int64      `json:"id"`
	Number      int        `json:"number"`
	Title       string     `json:"title"`
	Body        string     `json:"body"`
	State       string     `json:"state"` // "open" or "closed"
	Labels      []Label    `json:"labels"`
	User        User       `json:"user"`
	Assignees   []User     `json:"assignees,omitempty"`
	Comments    []Comment  `json:"comments,omitempty"`
	CommentsURL string     `json:"comments_url,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	ClosedAt    *time.Time `json:"closed_at,omitempty"`
	HTMLURL     string     `json:"html_url,omitempty"`
	Repository  string     `json:"repository,omitempty"` // owner/repo format

	// AI Classification results
	Classification *ClassificationInfo `json:"classification,omitempty"`
}

// IssueQuery represents parameters for querying GitHub issues
type IssueQuery struct {
	Repository string     `json:"repository"`          // Required: owner/repo format
	State      string     `json:"state,omitempty"`     // "open", "closed", "all" (default: "open")
	Labels     []string   `json:"labels,omitempty"`    // Filter by label names
	Sort       string     `json:"sort,omitempty"`      // "created", "updated", "comments" (default: "created")
	Direction  string     `json:"direction,omitempty"` // "asc", "desc" (default: "desc")
	Since      *time.Time `json:"since,omitempty"`     // Only issues updated after this time
	PerPage    int        `json:"per_page,omitempty"`  // Number of results per page (default: 30, max: 100)
	Page       int        `json:"page,omitempty"`      // Page number for pagination (default: 1)
	MaxPages   int        `json:"max_pages,omitempty"` // Maximum pages to fetch (0 = all pages)
}

// IssueResult represents the result of fetching issues
type IssueResult struct {
	Issues       []Issue        `json:"issues"`
	TotalCount   int            `json:"total_count"`
	FetchedCount int            `json:"fetched_count"`
	Repository   string         `json:"repository"`
	Query        IssueQuery     `json:"query"`
	FetchedAt    time.Time      `json:"fetched_at"`
	RateLimit    *RateLimitInfo `json:"rate_limit,omitempty"`
}

// RateLimitInfo represents GitHub API rate limit information
type RateLimitInfo struct {
	Limit     int       `json:"limit"`
	Remaining int       `json:"remaining"`
	ResetTime time.Time `json:"reset_time"`
	Used      int       `json:"used"`
}

// DefaultIssueQuery returns a default query configuration
func DefaultIssueQuery(repository string) IssueQuery {
	return IssueQuery{
		Repository: repository,
		State:      "open",
		Sort:       "created",
		Direction:  "desc",
		PerPage:    30,
		Page:       1,
		MaxPages:   0, // Fetch all pages by default
	}
}

// ValidateRepository checks if the repository format is valid (owner/repo)
func (q *IssueQuery) ValidateRepository() bool {
	if q.Repository == "" {
		return false
	}

	// Split by slash and check parts
	parts := strings.Split(q.Repository, "/")
	if len(parts) != 2 {
		return false
	}

	// Both owner and repo must be non-empty
	owner := strings.TrimSpace(parts[0])
	repo := strings.TrimSpace(parts[1])

	return owner != "" && repo != ""
}

// SetDefaults sets default values for query parameters
func (q *IssueQuery) SetDefaults() {
	if q.State == "" {
		q.State = "open"
	}
	if q.Sort == "" {
		q.Sort = "created"
	}
	if q.Direction == "" {
		q.Direction = "desc"
	}
	if q.PerPage == 0 {
		q.PerPage = 30
	}
	if q.Page == 0 {
		q.Page = 1
	}
}

package github

import (
	"context"

	"github.com/google/go-github/v60/github"
	"github.com/nyasuto/beaver/internal/models"
)

// ServiceInterface defines the interface for GitHub service operations
type ServiceInterface interface {
	FetchIssues(ctx context.Context, query models.IssueQuery) (*models.IssueResult, error)
	TestConnection(ctx context.Context) error
	GetRateLimit(ctx context.Context) (*models.RateLimitInfo, error)
}

// ClientInterface defines the interface for low-level GitHub client operations
type ClientInterface interface {
	TestConnection(ctx context.Context) error
	GetRateLimit(ctx context.Context) (*github.RateLimits, error)
}

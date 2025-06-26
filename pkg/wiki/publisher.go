package wiki

import (
	"context"
	"time"

	"github.com/nyasuto/beaver/internal/models"
)

// WikiPublisher defines the interface for Wiki publishing operations
// This interface abstracts the underlying implementation (Git clone, API, etc.)
// to support multiple Wiki platforms and publishing strategies.
type WikiPublisher interface {
	// Repository Management
	Initialize(ctx context.Context) error
	Clone(ctx context.Context) error
	Cleanup() error

	// Page Operations
	CreatePage(ctx context.Context, page *WikiPage) error
	UpdatePage(ctx context.Context, page *WikiPage) error
	DeletePage(ctx context.Context, pageName string) error
	PageExists(ctx context.Context, pageName string) (bool, error)

	// Batch Operations
	PublishPages(ctx context.Context, pages []*WikiPage) error
	GenerateAndPublishWiki(ctx context.Context, issues []models.Issue, projectName string) error

	// Repository Operations
	Commit(ctx context.Context, message string) error
	Push(ctx context.Context) error
	Pull(ctx context.Context) error

	// Status and Information
	GetStatus(ctx context.Context) (*PublisherStatus, error)
	ListPages(ctx context.Context) ([]*WikiPageInfo, error)
}

// PublisherStatus represents the current state of the Wiki publisher
type PublisherStatus struct {
	IsInitialized  bool
	LastUpdate     time.Time
	TotalPages     int
	PendingChanges int
	RepositoryURL  string
	WorkingDir     string
	LastCommitSHA  string
	BranchName     string
	HasUncommitted bool
	LastError      error
}

// WikiPageInfo represents basic information about a Wiki page
type WikiPageInfo struct {
	Title        string
	Filename     string
	Size         int64
	LastModified time.Time
	SHA          string
	URL          string
}

// PublisherConfig contains configuration for Wiki publishers
type PublisherConfig struct {
	// Repository Configuration
	Owner      string
	Repository string
	Token      string

	// Git Configuration
	WorkingDir  string
	BranchName  string
	AuthorName  string
	AuthorEmail string

	// Performance Configuration
	UseShallowClone bool
	CloneDepth      int
	Timeout         time.Duration
	RetryAttempts   int
	RetryDelay      time.Duration

	// Feature Flags
	EnableConflictResolution bool
	EnableBatchOperations    bool
	EnablePerformanceLogging bool
}

// NewPublisherConfig creates a default publisher configuration
func NewPublisherConfig(owner, repository, token string) *PublisherConfig {
	return &PublisherConfig{
		Owner:                    owner,
		Repository:               repository,
		Token:                    token,
		BranchName:               "master",
		AuthorName:               "Beaver AI",
		AuthorEmail:              "noreply@beaver.ai",
		UseShallowClone:          true,
		CloneDepth:               1,
		Timeout:                  30 * time.Second,
		RetryAttempts:            3,
		RetryDelay:               time.Second,
		EnableConflictResolution: true,
		EnableBatchOperations:    true,
		EnablePerformanceLogging: false,
	}
}

// Validate checks if the configuration is valid
func (c *PublisherConfig) Validate() error {
	if c.Owner == "" {
		return NewWikiError(ErrorTypeConfiguration, "publisher config",
			nil, "Owner is required", 0, []string{"Set the GitHub repository owner"})
	}
	if c.Repository == "" {
		return NewWikiError(ErrorTypeConfiguration, "publisher config",
			nil, "Repository is required", 0, []string{"Set the GitHub repository name"})
	}
	if c.Token == "" {
		return NewWikiError(ErrorTypeConfiguration, "publisher config",
			nil, "Token is required", 0, []string{"Set the GitHub Personal Access Token"})
	}
	if c.Timeout <= 0 {
		return NewWikiError(ErrorTypeConfiguration, "publisher config",
			nil, "Timeout must be positive", 0, []string{"Set a positive timeout duration"})
	}
	return nil
}

// GetRepositoryURL returns the full repository URL
func (c *PublisherConfig) GetRepositoryURL() string {
	return "https://github.com/" + c.Owner + "/" + c.Repository + ".wiki.git"
}

// GetAuthenticatedURL returns the repository URL with authentication
func (c *PublisherConfig) GetAuthenticatedURL() string {
	return "https://" + c.Token + "@github.com/" + c.Owner + "/" + c.Repository + ".wiki.git"
}

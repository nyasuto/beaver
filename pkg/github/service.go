package github

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/go-github/v60/github"
	"github.com/nyasuto/beaver/internal/errors"
	"github.com/nyasuto/beaver/internal/models"
)

// Service provides high-level GitHub operations using internal models
type Service struct {
	client *Client
	logger *slog.Logger
}

// Ensure Service implements ServiceInterface
var _ ServiceInterface = (*Service)(nil)

// NewService creates a new GitHub service
func NewService(token string) *Service {
	return &Service{
		client: NewClient(token),
		logger: slog.With("component", "github-service"),
	}
}

// FetchIssues retrieves issues using the new models and query system
func (s *Service) FetchIssues(ctx context.Context, query models.IssueQuery) (*models.IssueResult, error) {
	// Validate query
	if !query.ValidateRepository() {
		return nil, errors.ValidationError("Invalid repository format. Expected: owner/repo")
	}

	query.SetDefaults()

	// Parse repository
	parts := strings.Split(query.Repository, "/")
	if len(parts) != 2 {
		return nil, errors.ValidationError("Repository must be in format 'owner/repo'")
	}
	owner, repo := parts[0], parts[1]

	s.logger.Info("Fetching issues",
		"repository", query.Repository,
		"state", query.State,
		"per_page", query.PerPage)

	// Convert query to GitHub API options
	opts := &github.IssueListByRepoOptions{
		State:     query.State,
		Sort:      query.Sort,
		Direction: query.Direction,
		Labels:    query.Labels,
		ListOptions: github.ListOptions{
			PerPage: query.PerPage,
			Page:    query.Page,
		},
	}

	// Set Since field if provided (GitHub API expects time.Time, not *time.Time)
	if query.Since != nil {
		opts.Since = *query.Since
	}

	var allIssues []models.Issue
	pageCount := 0

	startTime := time.Now()

	for {
		pageCount++

		// Check if we've reached the maximum pages limit
		if query.MaxPages > 0 && pageCount > query.MaxPages {
			s.logger.Info("Reached maximum pages limit", "max_pages", query.MaxPages)
			break
		}

		// Check rate limit before making request
		rateLimit, err := s.checkRateLimit(ctx)
		if err != nil {
			s.logger.Warn("Could not check rate limit", "error", err)
		} else if rateLimit.Remaining < 10 {
			s.logger.Warn("Approaching rate limit", "remaining", rateLimit.Remaining)
		}

		// Fetch issues for current page
		issues, resp, err := s.client.client.Issues.ListByRepo(ctx, owner, repo, opts)
		if err != nil {
			return nil, errors.WrapGitHubError(err, fmt.Sprintf("Failed to fetch issues from %s", query.Repository))
		}

		s.logger.Debug("Fetched issues page",
			"page", opts.Page,
			"count", len(issues),
			"total_pages", resp.LastPage)

		// Process issues from current page
		for _, issue := range issues {
			// Skip pull requests (they appear as issues in GitHub API)
			if issue.PullRequestLinks != nil {
				continue
			}

			beaverIssue, err := s.convertToInternalIssue(ctx, issue, owner, repo, query.Repository)
			if err != nil {
				s.logger.Error("Failed to convert issue", "issue_number", issue.GetNumber(), "error", err)
				continue
			}

			allIssues = append(allIssues, *beaverIssue)
		}

		// Check if there are more pages
		if resp.NextPage == 0 {
			break
		}
		opts.Page = resp.NextPage
	}

	// Get final rate limit info
	finalRateLimit, _ := s.checkRateLimit(ctx)

	result := &models.IssueResult{
		Issues:       allIssues,
		TotalCount:   len(allIssues), // GitHub doesn't provide total count easily
		FetchedCount: len(allIssues),
		Repository:   query.Repository,
		Query:        query,
		FetchedAt:    time.Now(),
		RateLimit:    finalRateLimit,
	}

	duration := time.Since(startTime)
	s.logger.Info("Issues fetch completed",
		"repository", query.Repository,
		"fetched_count", result.FetchedCount,
		"pages", pageCount,
		"duration", duration)

	return result, nil
}

// convertToInternalIssue converts GitHub API issue to internal models.Issue
func (s *Service) convertToInternalIssue(ctx context.Context, issue *github.Issue, owner, repo, repository string) (*models.Issue, error) {
	beaverIssue := &models.Issue{
		ID:         issue.GetID(),
		Number:     issue.GetNumber(),
		Title:      issue.GetTitle(),
		Body:       issue.GetBody(),
		State:      issue.GetState(),
		CreatedAt:  issue.GetCreatedAt().Time,
		UpdatedAt:  issue.GetUpdatedAt().Time,
		HTMLURL:    issue.GetHTMLURL(),
		Repository: repository,
	}

	// Handle closed_at
	if issue.ClosedAt != nil {
		beaverIssue.ClosedAt = &issue.ClosedAt.Time
	}

	// Convert user
	if user := issue.GetUser(); user != nil {
		beaverIssue.User = models.User{
			ID:        user.GetID(),
			Login:     user.GetLogin(),
			AvatarURL: user.GetAvatarURL(),
			HTMLURL:   user.GetHTMLURL(),
		}
	}

	// Convert labels
	for _, label := range issue.Labels {
		beaverIssue.Labels = append(beaverIssue.Labels, models.Label{
			ID:          label.GetID(),
			Name:        label.GetName(),
			Color:       label.GetColor(),
			Description: label.GetDescription(),
		})
	}

	// Convert assignees
	for _, assignee := range issue.Assignees {
		beaverIssue.Assignees = append(beaverIssue.Assignees, models.User{
			ID:        assignee.GetID(),
			Login:     assignee.GetLogin(),
			AvatarURL: assignee.GetAvatarURL(),
			HTMLURL:   assignee.GetHTMLURL(),
		})
	}

	// Fetch comments if the issue has any
	if issue.GetComments() > 0 {
		comments, err := s.fetchIssueComments(ctx, owner, repo, issue.GetNumber())
		if err != nil {
			s.logger.Warn("Failed to fetch comments for issue",
				"issue_number", issue.GetNumber(),
				"error", err)
			// Don't fail the entire operation for comment fetch errors
		} else {
			beaverIssue.Comments = comments
		}
	}

	return beaverIssue, nil
}

// fetchIssueComments fetches comments for an issue and converts to internal models
func (s *Service) fetchIssueComments(ctx context.Context, owner, repo string, issueNumber int) ([]models.Comment, error) {
	opts := &github.IssueListCommentsOptions{
		ListOptions: github.ListOptions{
			PerPage: 100,
		},
	}

	var allComments []models.Comment

	for {
		comments, resp, err := s.client.client.Issues.ListComments(ctx, owner, repo, issueNumber, opts)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch comments: %w", err)
		}

		for _, comment := range comments {
			beaverComment := models.Comment{
				ID:        comment.GetID(),
				Body:      comment.GetBody(),
				CreatedAt: comment.GetCreatedAt().Time,
				UpdatedAt: comment.GetUpdatedAt().Time,
				HTMLURL:   comment.GetHTMLURL(),
			}

			// Convert user
			if user := comment.GetUser(); user != nil {
				beaverComment.User = models.User{
					ID:        user.GetID(),
					Login:     user.GetLogin(),
					AvatarURL: user.GetAvatarURL(),
					HTMLURL:   user.GetHTMLURL(),
				}
			}

			allComments = append(allComments, beaverComment)
		}

		if resp.NextPage == 0 {
			break
		}
		opts.Page = resp.NextPage
	}

	return allComments, nil
}

// checkRateLimit checks the current GitHub API rate limit
func (s *Service) checkRateLimit(ctx context.Context) (*models.RateLimitInfo, error) {
	//nolint:staticcheck // Using deprecated method until v61 migration
	rateLimits, _, err := s.client.client.RateLimits(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get rate limits: %w", err)
	}

	core := rateLimits.GetCore()
	return &models.RateLimitInfo{
		Limit:     core.Limit,
		Remaining: core.Remaining,
		ResetTime: core.Reset.Time,
		Used:      core.Limit - core.Remaining,
	}, nil
}

// GetRateLimit returns the current rate limit information
func (s *Service) GetRateLimit(ctx context.Context) (*models.RateLimitInfo, error) {
	return s.checkRateLimit(ctx)
}

// TestConnection tests the connection to GitHub API
func (s *Service) TestConnection(ctx context.Context) error {
	return s.client.TestConnection(ctx)
}

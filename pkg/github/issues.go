package github

import (
	"context"
	"fmt"
	"time"

	"github.com/google/go-github/v60/github"
)

// IssueData represents processed issue data for Beaver
type IssueData struct {
	ID        int64     `json:"id"`
	Number    int       `json:"number"`
	Title     string    `json:"title"`
	Body      string    `json:"body"`
	State     string    `json:"state"`
	Labels    []string  `json:"labels"`
	Comments  []Comment `json:"comments"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	User      string    `json:"user"`
}

// Comment represents an issue comment
type Comment struct {
	ID        int64     `json:"id"`
	Body      string    `json:"body"`
	User      string    `json:"user"`
	CreatedAt time.Time `json:"created_at"`
}

// FetchIssues retrieves issues from a GitHub repository
func (c *Client) FetchIssues(ctx context.Context, owner, repo string, opts *github.IssueListByRepoOptions) ([]*IssueData, error) {
	if opts == nil {
		opts = &github.IssueListByRepoOptions{
			State: "all",
			ListOptions: github.ListOptions{
				PerPage: 100,
			},
		}
	}

	var allIssues []*IssueData

	for {
		issues, resp, err := c.client.Issues.ListByRepo(ctx, owner, repo, opts)
		if err != nil {
			return nil, fmt.Errorf("issues取得エラー: %w", err)
		}

		for _, issue := range issues {
			// Skip pull requests (they appear as issues in GitHub API)
			if issue.PullRequestLinks != nil {
				continue
			}

			issueData := &IssueData{
				ID:        issue.GetID(),
				Number:    issue.GetNumber(),
				Title:     issue.GetTitle(),
				Body:      issue.GetBody(),
				State:     issue.GetState(),
				CreatedAt: issue.GetCreatedAt().Time,
				UpdatedAt: issue.GetUpdatedAt().Time,
				User:      issue.GetUser().GetLogin(),
			}

			// Extract labels
			for _, label := range issue.Labels {
				issueData.Labels = append(issueData.Labels, label.GetName())
			}

			// Fetch comments if needed
			if issue.GetComments() > 0 {
				comments, err := c.FetchIssueComments(ctx, owner, repo, issue.GetNumber())
				if err != nil {
					// Log error but continue processing
					fmt.Printf("⚠️ Issue #%d のコメント取得エラー: %v\n", issue.GetNumber(), err)
				} else {
					issueData.Comments = comments
				}
			}

			allIssues = append(allIssues, issueData)
		}

		if resp.NextPage == 0 {
			break
		}
		opts.Page = resp.NextPage
	}

	return allIssues, nil
}

// FetchIssueComments retrieves comments for a specific issue
func (c *Client) FetchIssueComments(ctx context.Context, owner, repo string, issueNumber int) ([]Comment, error) {
	opts := &github.IssueListCommentsOptions{
		ListOptions: github.ListOptions{
			PerPage: 100,
		},
	}

	var allComments []Comment

	for {
		comments, resp, err := c.client.Issues.ListComments(ctx, owner, repo, issueNumber, opts)
		if err != nil {
			return nil, fmt.Errorf("コメント取得エラー: %w", err)
		}

		for _, comment := range comments {
			allComments = append(allComments, Comment{
				ID:        comment.GetID(),
				Body:      comment.GetBody(),
				User:      comment.GetUser().GetLogin(),
				CreatedAt: comment.GetCreatedAt().Time,
			})
		}

		if resp.NextPage == 0 {
			break
		}
		opts.Page = resp.NextPage
	}

	return allComments, nil
}

package github

import (
	"context"
	"fmt"

	"github.com/google/go-github/v60/github"
	"golang.org/x/oauth2"
)

// Client wraps the GitHub API client with additional functionality for Beaver
type Client struct {
	client *github.Client
	token  string
}

// NewClient creates a new GitHub API client with authentication
func NewClient(token string) *Client {
	ctx := context.Background()
	ts := oauth2.StaticTokenSource(
		&oauth2.Token{AccessToken: token},
	)
	tc := oauth2.NewClient(ctx, ts)
	
	client := github.NewClient(tc)
	
	return &Client{
		client: client,
		token:  token,
	}
}

// TestConnection verifies the GitHub API connection and token validity
func (c *Client) TestConnection(ctx context.Context) error {
	user, _, err := c.client.Users.Get(ctx, "")
	if err != nil {
		return fmt.Errorf("GitHub API接続テストに失敗: %w", err)
	}
	
	fmt.Printf("✅ GitHub API接続成功: %s\n", user.GetLogin())
	return nil
}

// GetRateLimit returns the current API rate limit status
func (c *Client) GetRateLimit(ctx context.Context) (*github.RateLimits, error) {
	rateLimits, _, err := c.client.RateLimits(ctx)
	if err != nil {
		return nil, fmt.Errorf("レート制限情報の取得に失敗: %w", err)
	}
	
	return rateLimits, nil
}
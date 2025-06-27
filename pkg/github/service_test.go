package github

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	"github.com/google/go-github/v60/github"
	"github.com/nyasuto/beaver/internal/models"
)

func TestNewService(t *testing.T) {
	service := NewService("test_token")
	if service == nil {
		t.Error("NewService() returned nil")
		return
	}
	if service.client == nil {
		t.Error("NewService() did not initialize client")
	}
}

func TestService_FetchIssues(t *testing.T) {
	service := NewService("invalid_token")
	ctx := context.Background()

	query := models.IssueQuery{
		Repository: "testowner/testrepo",
		State:      "open",
		Labels:     []string{"bug", "enhancement"},
		PerPage:    10,
		Page:       1,
	}

	// This should fail with invalid token but test the code path
	issues, err := service.FetchIssues(ctx, query)
	if err == nil {
		t.Error("FetchIssues() should fail with invalid token")
	}
	if issues != nil {
		t.Error("FetchIssues() should return nil on error")
	}
}

func TestService_TestConnection(t *testing.T) {
	service := NewService("invalid_token")
	ctx := context.Background()

	err := service.TestConnection(ctx)
	if err == nil {
		t.Error("TestConnection() should fail with invalid token")
	}
}

func TestService_GetRateLimit(t *testing.T) {
	service := NewService("invalid_token")
	ctx := context.Background()

	rateLimit, err := service.GetRateLimit(ctx)
	if err == nil {
		t.Error("GetRateLimit() should fail with invalid token")
	}
	if rateLimit != nil {
		t.Error("GetRateLimit() should return nil on error")
	}
}

func TestService_convertToInternalIssue(t *testing.T) {
	service := NewService("test_token")
	ctx := context.Background()

	// Create a mock GitHub issue
	issueID := int64(123)
	issueNumber := 456
	title := "Test Issue"
	body := "Test issue body"
	state := "open"
	htmlURL := "https://github.com/owner/repo/issues/456"
	createdAt := github.Timestamp{Time: time.Now()}
	updatedAt := github.Timestamp{Time: time.Now()}
	closedAt := github.Timestamp{Time: time.Now().Add(time.Hour)}

	userID := int64(789)
	userLogin := "testuser"
	userAvatarURL := "https://github.com/avatars/testuser"
	userHTMLURL := "https://github.com/testuser"

	labelID := int64(101)
	labelName := "bug"
	labelColor := "ff0000"
	labelDescription := "Bug label"

	githubIssue := &github.Issue{
		ID:        &issueID,
		Number:    &issueNumber,
		Title:     &title,
		Body:      &body,
		State:     &state,
		HTMLURL:   &htmlURL,
		CreatedAt: &createdAt,
		UpdatedAt: &updatedAt,
		ClosedAt:  &closedAt,
		User: &github.User{
			ID:        &userID,
			Login:     &userLogin,
			AvatarURL: &userAvatarURL,
			HTMLURL:   &userHTMLURL,
		},
		Labels: []*github.Label{
			{
				ID:          &labelID,
				Name:        &labelName,
				Color:       &labelColor,
				Description: &labelDescription,
			},
		},
		Assignees: []*github.User{
			{
				ID:        &userID,
				Login:     &userLogin,
				AvatarURL: &userAvatarURL,
				HTMLURL:   &userHTMLURL,
			},
		},
		Comments: func() *int { c := 0; return &c }(),
	}

	issue, err := service.convertToInternalIssue(ctx, githubIssue, "owner", "repo", "owner/repo")
	if err != nil {
		t.Fatalf("convertToInternalIssue() error = %v", err)
	}

	// Verify converted issue
	if issue.ID != issueID {
		t.Errorf("Expected ID %d, got %d", issueID, issue.ID)
	}
	if issue.Number != issueNumber {
		t.Errorf("Expected Number %d, got %d", issueNumber, issue.Number)
	}
	if issue.Title != title {
		t.Errorf("Expected Title %s, got %s", title, issue.Title)
	}
	if issue.Body != body {
		t.Errorf("Expected Body %s, got %s", body, issue.Body)
	}
	if issue.State != state {
		t.Errorf("Expected State %s, got %s", state, issue.State)
	}
	if issue.HTMLURL != htmlURL {
		t.Errorf("Expected HTMLURL %s, got %s", htmlURL, issue.HTMLURL)
	}
	if issue.Repository != "owner/repo" {
		t.Errorf("Expected Repository owner/repo, got %s", issue.Repository)
	}

	// Verify closed_at
	if issue.ClosedAt == nil {
		t.Error("Expected ClosedAt to be set")
	}

	// Verify user
	if issue.User.ID != userID {
		t.Errorf("Expected User ID %d, got %d", userID, issue.User.ID)
	}
	if issue.User.Login != userLogin {
		t.Errorf("Expected User Login %s, got %s", userLogin, issue.User.Login)
	}

	// Verify labels
	if len(issue.Labels) != 1 {
		t.Errorf("Expected 1 label, got %d", len(issue.Labels))
	} else {
		label := issue.Labels[0]
		if label.ID != labelID {
			t.Errorf("Expected Label ID %d, got %d", labelID, label.ID)
		}
		if label.Name != labelName {
			t.Errorf("Expected Label Name %s, got %s", labelName, label.Name)
		}
		if label.Color != labelColor {
			t.Errorf("Expected Label Color %s, got %s", labelColor, label.Color)
		}
		if label.Description != labelDescription {
			t.Errorf("Expected Label Description %s, got %s", labelDescription, label.Description)
		}
	}

	// Verify assignees
	if len(issue.Assignees) != 1 {
		t.Errorf("Expected 1 assignee, got %d", len(issue.Assignees))
	} else {
		assignee := issue.Assignees[0]
		if assignee.ID != userID {
			t.Errorf("Expected Assignee ID %d, got %d", userID, assignee.ID)
		}
		if assignee.Login != userLogin {
			t.Errorf("Expected Assignee Login %s, got %s", userLogin, assignee.Login)
		}
	}
}

func TestService_convertToInternalIssue_WithNilFields(t *testing.T) {
	service := NewService("test_token")
	ctx := context.Background()

	// Create a minimal GitHub issue with nil fields
	issueID := int64(123)
	issueNumber := 456
	title := "Test Issue"
	body := "Test issue body"
	state := "open"
	htmlURL := "https://github.com/owner/repo/issues/456"
	createdAt := github.Timestamp{Time: time.Now()}
	updatedAt := github.Timestamp{Time: time.Now()}

	githubIssue := &github.Issue{
		ID:        &issueID,
		Number:    &issueNumber,
		Title:     &title,
		Body:      &body,
		State:     &state,
		HTMLURL:   &htmlURL,
		CreatedAt: &createdAt,
		UpdatedAt: &updatedAt,
		ClosedAt:  nil, // Test nil handling
		User:      nil, // Test nil handling
		Labels:    nil, // Test nil handling
		Assignees: nil, // Test nil handling
		Comments:  func() *int { c := 0; return &c }(),
	}

	issue, err := service.convertToInternalIssue(ctx, githubIssue, "owner", "repo", "owner/repo")
	if err != nil {
		t.Fatalf("convertToInternalIssue() error = %v", err)
	}

	// Verify nil handling
	if issue.ClosedAt != nil {
		t.Error("Expected ClosedAt to be nil")
	}
	if issue.User.ID != 0 {
		t.Error("Expected User to be zero value when nil")
	}
	if len(issue.Labels) != 0 {
		t.Errorf("Expected 0 labels, got %d", len(issue.Labels))
	}
	if len(issue.Assignees) != 0 {
		t.Errorf("Expected 0 assignees, got %d", len(issue.Assignees))
	}
}

func TestService_convertToInternalIssue_WithComments(t *testing.T) {
	// Setup mock HTTP server for testing fetchIssueComments
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Mock response for issue comments
		response := `[
			{
				"id": 1,
				"body": "Test comment",
				"html_url": "https://github.com/owner/repo/issues/456#issuecomment-1",
				"created_at": "2023-01-01T00:00:00Z",
				"updated_at": "2023-01-01T00:00:00Z",
				"user": {
					"id": 789,
					"login": "testuser",
					"avatar_url": "https://github.com/avatars/testuser",
					"html_url": "https://github.com/testuser"
				}
			}
		]`
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(response))
	}))
	defer server.Close()

	// Create service with custom HTTP client
	service := NewService("test_token")
	service.client.client.BaseURL, _ = url.Parse(server.URL + "/api/v3/")

	ctx := context.Background()

	// Create GitHub issue with comments
	issueID := int64(123)
	issueNumber := 456
	title := "Test Issue"
	body := "Test issue body"
	state := "open"
	htmlURL := "https://github.com/owner/repo/issues/456"
	createdAt := github.Timestamp{Time: time.Now()}
	updatedAt := github.Timestamp{Time: time.Now()}
	comments := 1

	githubIssue := &github.Issue{
		ID:        &issueID,
		Number:    &issueNumber,
		Title:     &title,
		Body:      &body,
		State:     &state,
		HTMLURL:   &htmlURL,
		CreatedAt: &createdAt,
		UpdatedAt: &updatedAt,
		Comments:  &comments, // Has comments
	}

	issue, err := service.convertToInternalIssue(ctx, githubIssue, "owner", "repo", "owner/repo")
	if err != nil {
		t.Fatalf("convertToInternalIssue() error = %v", err)
	}

	// Verify comments were fetched
	if len(issue.Comments) != 1 {
		t.Errorf("Expected 1 comment, got %d", len(issue.Comments))
	} else {
		comment := issue.Comments[0]
		if comment.ID != 1 {
			t.Errorf("Expected comment ID 1, got %d", comment.ID)
		}
		if comment.Body != "Test comment" {
			t.Errorf("Expected comment body 'Test comment', got %s", comment.Body)
		}
		if comment.User.Login != "testuser" {
			t.Errorf("Expected comment user 'testuser', got %s", comment.User.Login)
		}
	}
}

func TestService_fetchIssueComments(t *testing.T) {
	// Setup mock HTTP server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		response := `[
			{
				"id": 1,
				"body": "First comment",
				"html_url": "https://github.com/owner/repo/issues/456#issuecomment-1",
				"created_at": "2023-01-01T00:00:00Z",
				"updated_at": "2023-01-01T00:00:00Z",
				"user": {
					"id": 789,
					"login": "testuser",
					"avatar_url": "https://github.com/avatars/testuser",
					"html_url": "https://github.com/testuser"
				}
			},
			{
				"id": 2,
				"body": "Second comment",
				"html_url": "https://github.com/owner/repo/issues/456#issuecomment-2",
				"created_at": "2023-01-02T00:00:00Z",
				"updated_at": "2023-01-02T00:00:00Z",
				"user": {
					"id": 890,
					"login": "anotheruser",
					"avatar_url": "https://github.com/avatars/anotheruser",
					"html_url": "https://github.com/anotheruser"
				}
			}
		]`
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(response))
	}))
	defer server.Close()

	// Create service with custom HTTP client
	service := NewService("test_token")
	service.client.client.BaseURL, _ = url.Parse(server.URL + "/api/v3/")

	ctx := context.Background()

	comments, err := service.fetchIssueComments(ctx, "owner", "repo", 456)
	if err != nil {
		t.Fatalf("fetchIssueComments() error = %v", err)
	}

	if len(comments) != 2 {
		t.Errorf("Expected 2 comments, got %d", len(comments))
	}

	// Verify first comment
	if comments[0].ID != 1 {
		t.Errorf("Expected first comment ID 1, got %d", comments[0].ID)
	}
	if comments[0].Body != "First comment" {
		t.Errorf("Expected first comment body 'First comment', got %s", comments[0].Body)
	}
	if comments[0].User.Login != "testuser" {
		t.Errorf("Expected first comment user 'testuser', got %s", comments[0].User.Login)
	}

	// Verify second comment
	if comments[1].ID != 2 {
		t.Errorf("Expected second comment ID 2, got %d", comments[1].ID)
	}
	if comments[1].Body != "Second comment" {
		t.Errorf("Expected second comment body 'Second comment', got %s", comments[1].Body)
	}
	if comments[1].User.Login != "anotheruser" {
		t.Errorf("Expected second comment user 'anotheruser', got %s", comments[1].User.Login)
	}
}

func TestService_fetchIssueComments_Error(t *testing.T) {
	// Setup mock HTTP server that returns error
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"message": "Internal server error"}`))
	}))
	defer server.Close()

	// Create service with custom HTTP client
	service := NewService("test_token")
	service.client.client.BaseURL, _ = url.Parse(server.URL + "/api/v3/")

	ctx := context.Background()

	_, err := service.fetchIssueComments(ctx, "owner", "repo", 456)
	if err == nil {
		t.Error("fetchIssueComments() should return error for server error")
	}
}

func TestService_fetchIssueComments_WithNilUser(t *testing.T) {
	// Setup mock HTTP server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		response := `[
			{
				"id": 1,
				"body": "Comment without user",
				"html_url": "https://github.com/owner/repo/issues/456#issuecomment-1",
				"created_at": "2023-01-01T00:00:00Z",
				"updated_at": "2023-01-01T00:00:00Z",
				"user": null
			}
		]`
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(response))
	}))
	defer server.Close()

	// Create service with custom HTTP client
	service := NewService("test_token")
	service.client.client.BaseURL, _ = url.Parse(server.URL + "/api/v3/")

	ctx := context.Background()

	comments, err := service.fetchIssueComments(ctx, "owner", "repo", 456)
	if err != nil {
		t.Fatalf("fetchIssueComments() error = %v", err)
	}

	if len(comments) != 1 {
		t.Errorf("Expected 1 comment, got %d", len(comments))
	}

	// Verify nil user handling
	if comments[0].User.ID != 0 {
		t.Error("Expected comment user to be zero value when nil")
	}
}

func TestService_checkRateLimit_Success(t *testing.T) {
	// Setup mock HTTP server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		response := `{
			"resources": {
				"core": {
					"limit": 5000,
					"remaining": 4999,
					"reset": 1640995200
				}
			}
		}`
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(response))
	}))
	defer server.Close()

	// Create service with custom HTTP client
	service := NewService("test_token")
	service.client.client.BaseURL, _ = url.Parse(server.URL + "/api/v3/")

	ctx := context.Background()

	rateLimitInfo, err := service.checkRateLimit(ctx)
	if err != nil {
		t.Fatalf("checkRateLimit() error = %v", err)
	}

	if rateLimitInfo.Limit != 5000 {
		t.Errorf("Expected limit 5000, got %d", rateLimitInfo.Limit)
	}
	if rateLimitInfo.Remaining != 4999 {
		t.Errorf("Expected remaining 4999, got %d", rateLimitInfo.Remaining)
	}
	if rateLimitInfo.ResetTime.Unix() != 1640995200 {
		t.Errorf("Expected reset time 1640995200, got %d", rateLimitInfo.ResetTime.Unix())
	}
}

func TestService_checkRateLimit_Error(t *testing.T) {
	// Setup mock HTTP server that returns error
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"message": "Bad credentials"}`))
	}))
	defer server.Close()

	// Create service with custom HTTP client
	service := NewService("test_token")
	service.client.client.BaseURL, _ = url.Parse(server.URL + "/api/v3/")

	ctx := context.Background()

	_, err := service.checkRateLimit(ctx)
	if err == nil {
		t.Error("checkRateLimit() should return error for bad credentials")
	}
}

func TestService_FetchIssues_SuccessPath(t *testing.T) {
	// Setup mock HTTP server for successful response
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/v3/repos/owner/repo/issues" {
			response := `[
				{
					"id": 123,
					"number": 456,
					"title": "Test Issue",
					"body": "Test issue body",
					"state": "open",
					"html_url": "https://github.com/owner/repo/issues/456",
					"created_at": "2023-01-01T00:00:00Z",
					"updated_at": "2023-01-01T00:00:00Z",
					"comments": 0,
					"user": {
						"id": 789,
						"login": "testuser",
						"avatar_url": "https://github.com/avatars/testuser",
						"html_url": "https://github.com/testuser"
					},
					"labels": [
						{
							"id": 101,
							"name": "bug",
							"color": "ff0000",
							"description": "Bug label"
						}
					],
					"assignees": []
				}
			]`
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(response))
		} else if r.URL.Path == "/api/v3/rate_limit" {
			response := `{
				"resources": {
					"core": {
						"limit": 5000,
						"remaining": 4999,
						"reset": 1640995200
					}
				}
			}`
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(response))
		}
	}))
	defer server.Close()

	// Create service with custom HTTP client
	service := NewService("test_token")
	service.client.client.BaseURL, _ = url.Parse(server.URL + "/api/v3/")

	ctx := context.Background()
	query := models.IssueQuery{
		Repository: "owner/repo",
		State:      "open",
		Labels:     []string{"bug"},
		PerPage:    30,
		Page:       1,
	}

	result, err := service.FetchIssues(ctx, query)
	if err != nil {
		t.Fatalf("FetchIssues() error = %v", err)
	}

	if len(result.Issues) != 1 {
		t.Errorf("Expected 1 issue, got %d", len(result.Issues))
	}

	issue := result.Issues[0]
	if issue.ID != 123 {
		t.Errorf("Expected issue ID 123, got %d", issue.ID)
	}
	if issue.Number != 456 {
		t.Errorf("Expected issue number 456, got %d", issue.Number)
	}
	if issue.Title != "Test Issue" {
		t.Errorf("Expected title 'Test Issue', got %s", issue.Title)
	}

	// Verify rate limit info was populated
	if result.RateLimit == nil {
		t.Error("Expected rate limit info to be populated")
	}
}

func TestService_FetchIssues_ValidationError(t *testing.T) {
	service := NewService("test_token")
	ctx := context.Background()

	// Test with invalid repository format
	query := models.IssueQuery{
		Repository: "invalid-repo-format", // Missing owner/repo format
		State:      "open",
		PerPage:    30,
		Page:       1,
	}

	_, err := service.FetchIssues(ctx, query)
	if err == nil {
		t.Error("FetchIssues() should return error for invalid repository format")
	}
}

func TestService_FetchIssues_EmptyResponse(t *testing.T) {
	// Setup mock HTTP server for empty response
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/repos/owner/repo/issues" {
			response := `[]`
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(response))
		} else if r.URL.Path == "/api/v3/rate_limit" {
			response := `{
				"resources": {
					"core": {
						"limit": 5000,
						"remaining": 4999,
						"reset": 1640995200
					}
				}
			}`
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(response))
		}
	}))
	defer server.Close()

	// Create service with custom HTTP client
	service := NewService("test_token")
	service.client.client.BaseURL, _ = url.Parse(server.URL + "/api/v3/")

	ctx := context.Background()
	query := models.IssueQuery{
		Repository: "owner/repo",
		State:      "open",
		PerPage:    30,
		Page:       1,
	}

	result, err := service.FetchIssues(ctx, query)
	if err != nil {
		t.Fatalf("FetchIssues() error = %v", err)
	}

	if len(result.Issues) != 0 {
		t.Errorf("Expected 0 issues, got %d", len(result.Issues))
	}
	if result.TotalCount != 0 {
		t.Errorf("Expected total count 0, got %d", result.TotalCount)
	}
}

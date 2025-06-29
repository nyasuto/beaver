package github

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/google/go-github/v60/github"
)

// Test data generators
func createTestGitHubIssue(number int, withComments bool) *github.Issue {
	id := int64(1000 + number)
	title := fmt.Sprintf("Test Issue %d", number)
	body := fmt.Sprintf("This is test issue body %d", number)
	state := "open"
	if number%3 == 0 {
		state = "closed"
	}

	user := &github.User{
		Login: github.String(fmt.Sprintf("user%d", number)),
	}

	createdAt := time.Now().Add(-time.Duration(number) * time.Hour)
	updatedAt := createdAt.Add(30 * time.Minute)

	issue := &github.Issue{
		ID:        &id,
		Number:    &number,
		Title:     &title,
		Body:      &body,
		State:     &state,
		User:      user,
		CreatedAt: &github.Timestamp{Time: createdAt},
		UpdatedAt: &github.Timestamp{Time: updatedAt},
		Labels: []*github.Label{
			{Name: github.String(fmt.Sprintf("label-%d", number))},
			{Name: github.String("test-label")},
		},
	}

	if withComments {
		comments := number % 5 // 0-4 comments
		issue.Comments = &comments
	}

	return issue
}

func createTestGitHubPullRequest(number int) *github.Issue {
	issue := createTestGitHubIssue(number, false)
	// Mark as pull request
	issue.PullRequestLinks = &github.PullRequestLinks{
		URL: github.String(fmt.Sprintf("https://api.github.com/repos/owner/repo/pulls/%d", number)),
	}
	return issue
}

func createTestGitHubComment(id int, issueNumber int) *github.IssueComment {
	commentID := int64(2000 + id)
	body := fmt.Sprintf("This is comment %d for issue %d", id, issueNumber)
	user := &github.User{
		Login: github.String(fmt.Sprintf("commenter%d", id)),
	}
	createdAt := time.Now().Add(-time.Duration(id) * time.Minute)

	return &github.IssueComment{
		ID:        &commentID,
		Body:      &body,
		User:      user,
		CreatedAt: &github.Timestamp{Time: createdAt},
	}
}

func createMockGitHubServer(_ *testing.T, handler func(w http.ResponseWriter, r *http.Request)) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(handler))
}

func setupTestClient(baseURL string) *Client {
	client := NewClient("test-token")
	if baseURL != "" {
		client.client.BaseURL, _ = client.client.BaseURL.Parse(baseURL + "/")
	}
	return client
}

func TestFetchIssues(t *testing.T) {
	t.Run("successful fetch with default options", func(t *testing.T) {
		// Create test issues
		issues := []*github.Issue{
			createTestGitHubIssue(1, true),
			createTestGitHubIssue(2, false),
			createTestGitHubIssue(3, true),
		}

		server := createMockGitHubServer(t, func(w http.ResponseWriter, r *http.Request) {
			if strings.Contains(r.URL.Path, "/repos/owner/repo/issues") {
				page := r.URL.Query().Get("page")
				if page == "2" {
					// Return empty for second page
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusOK)
					json.NewEncoder(w).Encode([]*github.Issue{})
					return
				}

				// Verify default parameters (only check if not empty)
				state := r.URL.Query().Get("state")
				if state != "" && state != "all" {
					t.Errorf("Expected state=all, got %s", state)
				}
				perPage := r.URL.Query().Get("per_page")
				if perPage != "" && perPage != "100" {
					t.Errorf("Expected per_page=100, got %s", perPage)
				}

				// Set pagination headers
				// Set proper GitHub-style Link header
				baseURL := strings.Split(r.URL.String(), "?")[0]
				w.Header().Set("Link", fmt.Sprintf(`<%s?page=2>; rel="next"`, baseURL))
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusOK)
				json.NewEncoder(w).Encode(issues)
			} else if strings.Contains(r.URL.Path, "/issues/") && strings.Contains(r.URL.Path, "/comments") {
				// Mock comments endpoint
				// Extract issue number from path like "/repos/owner/repo/issues/1/comments"
				pathParts := strings.Split(r.URL.Path, "/")
				issueNum := ""
				for i, part := range pathParts {
					if part == "issues" && i+1 < len(pathParts) {
						issueNum = pathParts[i+1]
						break
					}
				}
				if issueNum == "1" || issueNum == "3" {
					comments := []*github.IssueComment{
						createTestGitHubComment(1, 1),
						createTestGitHubComment(2, 1),
					}
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusOK)
					json.NewEncoder(w).Encode(comments)
				} else {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusOK)
					json.NewEncoder(w).Encode([]*github.IssueComment{})
				}
			}
		})
		defer server.Close()

		client := setupTestClient(server.URL)
		ctx := context.Background()

		result, err := client.FetchIssues(ctx, "owner", "repo", nil)
		if err != nil {
			t.Fatalf("FetchIssues failed: %v", err)
		}

		if len(result) != 3 {
			t.Errorf("Expected 3 issues, got %d", len(result))
		}

		// Verify first issue
		issue := result[0]
		if issue.Number != 1 {
			t.Errorf("Expected issue number 1, got %d", issue.Number)
		}
		if issue.Title != "Test Issue 1" {
			t.Errorf("Expected title 'Test Issue 1', got '%s'", issue.Title)
		}
		if issue.State != "open" {
			t.Errorf("Expected state 'open', got '%s'", issue.State)
		}
		if len(issue.Labels) != 2 {
			t.Errorf("Expected 2 labels, got %d", len(issue.Labels))
		}
		// Issue 1 should have comments since it was created with withComments=true
		if issue.Number == 1 && len(issue.Comments) == 0 {
			t.Error("Expected issue 1 to have comments")
		}
	})

	t.Run("fetch with custom options", func(t *testing.T) {
		server := createMockGitHubServer(t, func(w http.ResponseWriter, r *http.Request) {
			// Verify custom parameters
			if r.URL.Query().Get("state") != "closed" {
				t.Errorf("Expected state=closed, got %s", r.URL.Query().Get("state"))
			}
			if r.URL.Query().Get("per_page") != "50" {
				t.Errorf("Expected per_page=50, got %s", r.URL.Query().Get("per_page"))
			}
			if r.URL.Query().Get("labels") != "bug,enhancement" {
				t.Errorf("Expected labels=bug,enhancement, got %s", r.URL.Query().Get("labels"))
			}

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode([]*github.Issue{})
		})
		defer server.Close()

		client := setupTestClient(server.URL)
		ctx := context.Background()

		opts := &github.IssueListByRepoOptions{
			State:  "closed",
			Labels: []string{"bug", "enhancement"},
			ListOptions: github.ListOptions{
				PerPage: 50,
			},
		}

		_, err := client.FetchIssues(ctx, "owner", "repo", opts)
		if err != nil {
			t.Fatalf("FetchIssues with custom options failed: %v", err)
		}
	})

	t.Run("pagination handling", func(t *testing.T) {
		pageCount := 0

		server := createMockGitHubServer(t, func(w http.ResponseWriter, r *http.Request) {
			pageCount++
			page := r.URL.Query().Get("page")

			var issues []*github.Issue
			switch page {
			case "", "1":
				// First page: 3 issues
				issues = []*github.Issue{
					createTestGitHubIssue(1, false),
					createTestGitHubIssue(2, false),
					createTestGitHubIssue(3, false),
				}
				// Set proper GitHub-style Link header
				baseURL := strings.Split(r.URL.String(), "?")[0]
				w.Header().Set("Link", fmt.Sprintf(`<%s?page=2>; rel="next"`, baseURL))
			case "2":
				// Second page: 2 issues
				issues = []*github.Issue{
					createTestGitHubIssue(4, false),
					createTestGitHubIssue(5, false),
				}
				// No next page header
			}

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(issues)
		})
		defer server.Close()

		client := setupTestClient(server.URL)
		ctx := context.Background()

		result, err := client.FetchIssues(ctx, "owner", "repo", nil)
		if err != nil {
			t.Fatalf("FetchIssues pagination failed: %v", err)
		}

		if pageCount != 2 {
			t.Errorf("Expected 2 page requests, got %d", pageCount)
		}
		if len(result) != 5 {
			t.Errorf("Expected 5 total issues, got %d", len(result))
		}
	})

	t.Run("pull request filtering", func(t *testing.T) {
		// Mix of issues and pull requests
		items := []*github.Issue{
			createTestGitHubIssue(1, false), // Issue
			createTestGitHubPullRequest(2),  // Pull request - should be filtered
			createTestGitHubIssue(3, false), // Issue
			createTestGitHubPullRequest(4),  // Pull request - should be filtered
		}

		server := createMockGitHubServer(t, func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(items)
		})
		defer server.Close()

		client := setupTestClient(server.URL)
		ctx := context.Background()

		result, err := client.FetchIssues(ctx, "owner", "repo", nil)
		if err != nil {
			t.Fatalf("FetchIssues filtering failed: %v", err)
		}

		// Should only return actual issues, not pull requests
		if len(result) != 2 {
			t.Errorf("Expected 2 issues (PRs filtered), got %d", len(result))
		}

		for _, issue := range result {
			if issue.Number == 2 || issue.Number == 4 {
				t.Errorf("Pull request #%d was not filtered out", issue.Number)
			}
		}
	})

	t.Run("API error handling", func(t *testing.T) {
		server := createMockGitHubServer(t, func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"message": "Bad credentials"}`))
		})
		defer server.Close()

		client := setupTestClient(server.URL)
		ctx := context.Background()

		_, err := client.FetchIssues(ctx, "owner", "repo", nil)
		if err == nil {
			t.Error("Expected error for unauthorized request")
		}
		if !strings.Contains(err.Error(), "issues取得エラー") {
			t.Errorf("Expected Japanese error message, got: %v", err)
		}
	})

	t.Run("comment fetch error handling", func(t *testing.T) {
		issue := createTestGitHubIssue(1, true)
		comments := 2
		issue.Comments = &comments

		server := createMockGitHubServer(t, func(w http.ResponseWriter, r *http.Request) {
			if strings.Contains(r.URL.Path, "/comments") {
				// Simulate comment fetch error
				w.WriteHeader(http.StatusInternalServerError)
				w.Write([]byte(`{"message": "Internal server error"}`))
				return
			}

			// Return issue successfully
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode([]*github.Issue{issue})
		})
		defer server.Close()

		client := setupTestClient(server.URL)
		ctx := context.Background()

		result, err := client.FetchIssues(ctx, "owner", "repo", nil)
		if err != nil {
			t.Fatalf("FetchIssues should continue on comment error: %v", err)
		}

		if len(result) != 1 {
			t.Errorf("Expected 1 issue despite comment error, got %d", len(result))
		}

		// Comments should be empty due to error
		if len(result[0].Comments) != 0 {
			t.Errorf("Expected 0 comments due to error, got %d", len(result[0].Comments))
		}
	})
}

func TestFetchIssueComments(t *testing.T) {
	t.Run("successful comment fetch", func(t *testing.T) {
		comments := []*github.IssueComment{
			createTestGitHubComment(1, 123),
			createTestGitHubComment(2, 123),
			createTestGitHubComment(3, 123),
		}

		server := createMockGitHubServer(t, func(w http.ResponseWriter, r *http.Request) {
			if !strings.Contains(r.URL.Path, "/repos/owner/repo/issues/123/comments") {
				t.Errorf("Unexpected URL path: %s", r.URL.Path)
			}

			if r.URL.Query().Get("per_page") != "100" {
				t.Errorf("Expected per_page=100, got %s", r.URL.Query().Get("per_page"))
			}

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(comments)
		})
		defer server.Close()

		client := setupTestClient(server.URL)
		ctx := context.Background()

		result, err := client.FetchIssueComments(ctx, "owner", "repo", 123)
		if err != nil {
			t.Fatalf("FetchIssueComments failed: %v", err)
		}

		if len(result) != 3 {
			t.Errorf("Expected 3 comments, got %d", len(result))
		}

		// Verify first comment
		comment := result[0]
		if comment.ID != 2001 {
			t.Errorf("Expected comment ID 2001, got %d", comment.ID)
		}
		if comment.Body != "This is comment 1 for issue 123" {
			t.Errorf("Expected specific body, got '%s'", comment.Body)
		}
		if comment.User != "commenter1" {
			t.Errorf("Expected user 'commenter1', got '%s'", comment.User)
		}
	})

	t.Run("comment pagination", func(t *testing.T) {
		pageCount := 0

		server := createMockGitHubServer(t, func(w http.ResponseWriter, r *http.Request) {
			pageCount++
			page := r.URL.Query().Get("page")

			var comments []*github.IssueComment
			switch page {
			case "", "1":
				// First page
				comments = []*github.IssueComment{
					createTestGitHubComment(1, 123),
					createTestGitHubComment(2, 123),
				}
				// Set proper GitHub-style Link header
				baseURL := strings.Split(r.URL.String(), "?")[0]
				w.Header().Set("Link", fmt.Sprintf(`<%s?page=2>; rel="next"`, baseURL))
			case "2":
				// Second page
				comments = []*github.IssueComment{
					createTestGitHubComment(3, 123),
				}
			}

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(comments)
		})
		defer server.Close()

		client := setupTestClient(server.URL)
		ctx := context.Background()

		result, err := client.FetchIssueComments(ctx, "owner", "repo", 123)
		if err != nil {
			t.Fatalf("FetchIssueComments pagination failed: %v", err)
		}

		if pageCount != 2 {
			t.Errorf("Expected 2 page requests, got %d", pageCount)
		}
		if len(result) != 3 {
			t.Errorf("Expected 3 total comments, got %d", len(result))
		}
	})

	t.Run("API error handling", func(t *testing.T) {
		server := createMockGitHubServer(t, func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte(`{"message": "Not Found"}`))
		})
		defer server.Close()

		client := setupTestClient(server.URL)
		ctx := context.Background()

		_, err := client.FetchIssueComments(ctx, "owner", "repo", 999)
		if err == nil {
			t.Error("Expected error for not found issue")
		}
		if !strings.Contains(err.Error(), "コメント取得エラー") {
			t.Errorf("Expected Japanese error message, got: %v", err)
		}
	})

	t.Run("empty comments", func(t *testing.T) {
		server := createMockGitHubServer(t, func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode([]*github.IssueComment{})
		})
		defer server.Close()

		client := setupTestClient(server.URL)
		ctx := context.Background()

		result, err := client.FetchIssueComments(ctx, "owner", "repo", 123)
		if err != nil {
			t.Fatalf("FetchIssueComments with no comments failed: %v", err)
		}

		if len(result) != 0 {
			t.Errorf("Expected 0 comments, got %d", len(result))
		}
	})
}

func TestIssueDataStructure(t *testing.T) {
	t.Run("IssueData JSON serialization", func(t *testing.T) {
		now := time.Now()
		issue := &IssueData{
			ID:        12345,
			Number:    100,
			Title:     "Test Issue",
			Body:      "Test body content",
			State:     "open",
			Labels:    []string{"bug", "high-priority"},
			CreatedAt: now,
			UpdatedAt: now.Add(time.Hour),
			User:      "testuser",
			Comments: []Comment{
				{
					ID:        67890,
					Body:      "Test comment",
					User:      "commenter",
					CreatedAt: now.Add(30 * time.Minute),
				},
			},
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
			t.Errorf("ID mismatch: expected %d, got %d", issue.ID, unmarshaled.ID)
		}
		if unmarshaled.Number != issue.Number {
			t.Errorf("Number mismatch: expected %d, got %d", issue.Number, unmarshaled.Number)
		}
		if unmarshaled.Title != issue.Title {
			t.Errorf("Title mismatch: expected %s, got %s", issue.Title, unmarshaled.Title)
		}
		if len(unmarshaled.Labels) != 2 {
			t.Errorf("Expected 2 labels, got %d", len(unmarshaled.Labels))
		}
		if len(unmarshaled.Comments) != 1 {
			t.Errorf("Expected 1 comment, got %d", len(unmarshaled.Comments))
		}
	})

	t.Run("Comment JSON serialization", func(t *testing.T) {
		now := time.Now()
		comment := Comment{
			ID:        12345,
			Body:      "Test comment body",
			User:      "testuser",
			CreatedAt: now,
		}

		// Test JSON marshaling
		data, err := json.Marshal(comment)
		if err != nil {
			t.Fatalf("Failed to marshal Comment: %v", err)
		}

		// Test JSON unmarshaling
		var unmarshaled Comment
		err = json.Unmarshal(data, &unmarshaled)
		if err != nil {
			t.Fatalf("Failed to unmarshal Comment: %v", err)
		}

		// Verify fields
		if unmarshaled.ID != comment.ID {
			t.Errorf("ID mismatch: expected %d, got %d", comment.ID, unmarshaled.ID)
		}
		if unmarshaled.Body != comment.Body {
			t.Errorf("Body mismatch: expected %s, got %s", comment.Body, unmarshaled.Body)
		}
		if unmarshaled.User != comment.User {
			t.Errorf("User mismatch: expected %s, got %s", comment.User, unmarshaled.User)
		}
	})
}

func TestEdgeCases(t *testing.T) {
	t.Run("issue with nil fields", func(t *testing.T) {
		// Create issue with minimal fields (some nil)
		issue := &github.Issue{
			ID:     github.Int64(123),
			Number: github.Int(1),
			Title:  github.String("Test"),
			// Body is nil
			State: github.String("open"),
			User: &github.User{
				Login: github.String("testuser"),
			},
			CreatedAt: &github.Timestamp{Time: time.Now()},
			UpdatedAt: &github.Timestamp{Time: time.Now()},
			// Labels is nil
			// Comments is nil
		}

		server := createMockGitHubServer(t, func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode([]*github.Issue{issue})
		})
		defer server.Close()

		client := setupTestClient(server.URL)
		ctx := context.Background()

		result, err := client.FetchIssues(ctx, "owner", "repo", nil)
		if err != nil {
			t.Fatalf("FetchIssues with nil fields failed: %v", err)
		}

		if len(result) != 1 {
			t.Errorf("Expected 1 issue, got %d", len(result))
		}

		issueData := result[0]
		if issueData.Body != "" {
			t.Errorf("Expected empty body, got '%s'", issueData.Body)
		}
		if len(issueData.Labels) != 0 {
			t.Errorf("Expected 0 labels, got %d", len(issueData.Labels))
		}
		if len(issueData.Comments) != 0 {
			t.Errorf("Expected 0 comments, got %d", len(issueData.Comments))
		}
	})

	t.Run("large number of issues", func(t *testing.T) {
		const issueCount = 500
		pageSize := 100
		expectedPages := (issueCount + pageSize - 1) / pageSize

		pageRequests := 0

		server := createMockGitHubServer(t, func(w http.ResponseWriter, r *http.Request) {
			pageRequests++
			page, _ := strconv.Atoi(r.URL.Query().Get("page"))
			if page == 0 {
				page = 1
			}

			start := (page - 1) * pageSize
			end := start + pageSize
			if end > issueCount {
				end = issueCount
			}

			var issues []*github.Issue
			for i := start; i < end; i++ {
				issues = append(issues, createTestGitHubIssue(i+1, false))
			}

			// Set next page header if not last page
			if end < issueCount {
				nextPage := page + 1
				baseURL := r.URL.String()
				if strings.Contains(baseURL, "?") {
					baseURL = baseURL[:strings.Index(baseURL, "?")]
				}
				w.Header().Set("Link", fmt.Sprintf(`<%s?page=%d>; rel="next"`, baseURL, nextPage))
			}

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(issues)
		})
		defer server.Close()

		client := setupTestClient(server.URL)
		ctx := context.Background()

		result, err := client.FetchIssues(ctx, "owner", "repo", nil)
		if err != nil {
			t.Fatalf("FetchIssues with large dataset failed: %v", err)
		}

		if len(result) != issueCount {
			t.Errorf("Expected %d issues, got %d", issueCount, len(result))
		}
		if pageRequests != expectedPages {
			t.Errorf("Expected %d page requests, got %d", expectedPages, pageRequests)
		}
	})

	t.Run("context cancellation", func(t *testing.T) {
		server := createMockGitHubServer(t, func(w http.ResponseWriter, r *http.Request) {
			// Simulate slow response
			time.Sleep(100 * time.Millisecond)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode([]*github.Issue{})
		})
		defer server.Close()

		client := setupTestClient(server.URL)

		// Create context with short timeout
		ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
		defer cancel()

		_, err := client.FetchIssues(ctx, "owner", "repo", nil)
		if err == nil {
			t.Error("Expected error for cancelled context")
		}
		if !strings.Contains(err.Error(), "context") && !strings.Contains(err.Error(), "timeout") {
			t.Errorf("Expected context/timeout error, got: %v", err)
		}
	})
}

// Benchmark tests for performance analysis
func BenchmarkFetchIssues(b *testing.B) {
	issues := make([]*github.Issue, 100)
	for i := 0; i < 100; i++ {
		issues[i] = createTestGitHubIssue(i+1, false)
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(issues)
	}))
	defer server.Close()

	client := setupTestClient(server.URL)
	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = client.FetchIssues(ctx, "owner", "repo", nil)
	}
}

func BenchmarkFetchIssueComments(b *testing.B) {
	comments := make([]*github.IssueComment, 50)
	for i := 0; i < 50; i++ {
		comments[i] = createTestGitHubComment(i+1, 123)
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(comments)
	}))
	defer server.Close()

	client := setupTestClient(server.URL)
	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = client.FetchIssueComments(ctx, "owner", "repo", 123)
	}
}

func BenchmarkIssueDataSerialization(b *testing.B) {
	now := time.Now()
	issue := &IssueData{
		ID:        12345,
		Number:    100,
		Title:     "Benchmark Issue",
		Body:      "This is a benchmark test issue with some content",
		State:     "open",
		Labels:    []string{"performance", "test", "benchmark"},
		CreatedAt: now,
		UpdatedAt: now.Add(time.Hour),
		User:      "benchmarkuser",
		Comments: []Comment{
			{ID: 1, Body: "First comment", User: "user1", CreatedAt: now},
			{ID: 2, Body: "Second comment", User: "user2", CreatedAt: now.Add(time.Minute)},
		},
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = json.Marshal(issue)
	}
}

package ai

import (
	"testing"
	"time"

	"github.com/nyasuto/beaver/pkg/github"
)

func TestConvertGitHubIssueToAI(t *testing.T) {
	now := time.Now()

	// Create GitHub issue data
	ghIssue := &github.IssueData{
		ID:        int64(123),
		Number:    1,
		Title:     "Test Issue",
		Body:      "This is a test issue",
		State:     "open",
		Labels:    []string{"bug", "enhancement"},
		CreatedAt: now,
		UpdatedAt: now,
		User:      "testuser",
		Comments: []github.Comment{
			{
				ID:        int64(456),
				Body:      "Test comment 1",
				User:      "commenter1",
				CreatedAt: now,
			},
			{
				ID:        int64(789),
				Body:      "Test comment 2",
				User:      "commenter2",
				CreatedAt: now.Add(time.Hour),
			},
		},
	}

	// Convert to AI issue
	aiIssue := ConvertGitHubIssueToAI(ghIssue)

	// Verify basic fields
	if aiIssue.ID != int(ghIssue.ID) {
		t.Errorf("ID = %d, want %d", aiIssue.ID, int(ghIssue.ID))
	}

	if aiIssue.Number != ghIssue.Number {
		t.Errorf("Number = %d, want %d", aiIssue.Number, ghIssue.Number)
	}

	if aiIssue.Title != ghIssue.Title {
		t.Errorf("Title = %s, want %s", aiIssue.Title, ghIssue.Title)
	}

	if aiIssue.Body != ghIssue.Body {
		t.Errorf("Body = %s, want %s", aiIssue.Body, ghIssue.Body)
	}

	if aiIssue.State != ghIssue.State {
		t.Errorf("State = %s, want %s", aiIssue.State, ghIssue.State)
	}

	if aiIssue.User != ghIssue.User {
		t.Errorf("User = %s, want %s", aiIssue.User, ghIssue.User)
	}

	if !aiIssue.CreatedAt.Equal(ghIssue.CreatedAt) {
		t.Errorf("CreatedAt = %v, want %v", aiIssue.CreatedAt, ghIssue.CreatedAt)
	}

	if !aiIssue.UpdatedAt.Equal(ghIssue.UpdatedAt) {
		t.Errorf("UpdatedAt = %v, want %v", aiIssue.UpdatedAt, ghIssue.UpdatedAt)
	}

	// Verify labels
	if len(aiIssue.Labels) != len(ghIssue.Labels) {
		t.Errorf("Labels length = %d, want %d", len(aiIssue.Labels), len(ghIssue.Labels))
	}

	for i, label := range aiIssue.Labels {
		if label != ghIssue.Labels[i] {
			t.Errorf("Labels[%d] = %s, want %s", i, label, ghIssue.Labels[i])
		}
	}

	// Verify comments conversion
	if len(aiIssue.Comments) != len(ghIssue.Comments) {
		t.Errorf("Comments length = %d, want %d", len(aiIssue.Comments), len(ghIssue.Comments))
	}

	for i, comment := range aiIssue.Comments {
		ghComment := ghIssue.Comments[i]

		if comment.ID != int(ghComment.ID) {
			t.Errorf("Comment[%d].ID = %d, want %d", i, comment.ID, int(ghComment.ID))
		}

		if comment.Body != ghComment.Body {
			t.Errorf("Comment[%d].Body = %s, want %s", i, comment.Body, ghComment.Body)
		}

		if comment.User != ghComment.User {
			t.Errorf("Comment[%d].User = %s, want %s", i, comment.User, ghComment.User)
		}

		if !comment.CreatedAt.Equal(ghComment.CreatedAt) {
			t.Errorf("Comment[%d].CreatedAt = %v, want %v", i, comment.CreatedAt, ghComment.CreatedAt)
		}
	}
}

func TestConvertGitHubIssueToAI_NoComments(t *testing.T) {
	now := time.Now()

	// Create GitHub issue without comments
	ghIssue := &github.IssueData{
		ID:        int64(123),
		Number:    1,
		Title:     "Test Issue",
		Body:      "This is a test issue",
		State:     "closed",
		Labels:    []string{"bug"},
		CreatedAt: now,
		UpdatedAt: now,
		User:      "testuser",
		Comments:  []github.Comment{}, // Empty comments
	}

	// Convert to AI issue
	aiIssue := ConvertGitHubIssueToAI(ghIssue)

	// Verify no comments
	if len(aiIssue.Comments) != 0 {
		t.Errorf("Comments length = %d, want 0", len(aiIssue.Comments))
	}

	// Verify other fields still work
	if aiIssue.ID != int(ghIssue.ID) {
		t.Errorf("ID = %d, want %d", aiIssue.ID, int(ghIssue.ID))
	}

	if aiIssue.State != "closed" {
		t.Errorf("State = %s, want closed", aiIssue.State)
	}
}

func TestConvertGitHubIssueToAI_NoLabels(t *testing.T) {
	now := time.Now()

	// Create GitHub issue without labels
	ghIssue := &github.IssueData{
		ID:        int64(123),
		Number:    1,
		Title:     "Test Issue",
		Body:      "This is a test issue",
		State:     "open",
		Labels:    []string{}, // Empty labels
		CreatedAt: now,
		UpdatedAt: now,
		User:      "testuser",
		Comments:  []github.Comment{},
	}

	// Convert to AI issue
	aiIssue := ConvertGitHubIssueToAI(ghIssue)

	// Verify no labels
	if len(aiIssue.Labels) != 0 {
		t.Errorf("Labels length = %d, want 0", len(aiIssue.Labels))
	}

	// Verify other fields still work
	if aiIssue.Title != ghIssue.Title {
		t.Errorf("Title = %s, want %s", aiIssue.Title, ghIssue.Title)
	}
}

func TestConvertGitHubIssuesToAI(t *testing.T) {
	now := time.Now()

	// Create multiple GitHub issues
	ghIssues := []*github.IssueData{
		{
			ID:        int64(123),
			Number:    1,
			Title:     "Test Issue 1",
			Body:      "This is test issue 1",
			State:     "open",
			Labels:    []string{"bug"},
			CreatedAt: now,
			UpdatedAt: now,
			User:      "testuser1",
			Comments: []github.Comment{
				{
					ID:        int64(456),
					Body:      "Comment on issue 1",
					User:      "commenter1",
					CreatedAt: now,
				},
			},
		},
		{
			ID:        int64(124),
			Number:    2,
			Title:     "Test Issue 2",
			Body:      "This is test issue 2",
			State:     "closed",
			Labels:    []string{"enhancement", "documentation"},
			CreatedAt: now.Add(-time.Hour),
			UpdatedAt: now.Add(-time.Minute),
			User:      "testuser2",
			Comments:  []github.Comment{}, // No comments
		},
		{
			ID:        int64(125),
			Number:    3,
			Title:     "Test Issue 3",
			Body:      "This is test issue 3",
			State:     "open",
			Labels:    []string{}, // No labels
			CreatedAt: now.Add(-time.Hour * 2),
			UpdatedAt: now.Add(-time.Hour),
			User:      "testuser3",
			Comments: []github.Comment{
				{
					ID:        int64(789),
					Body:      "First comment on issue 3",
					User:      "commenter3",
					CreatedAt: now.Add(-time.Hour),
				},
				{
					ID:        int64(790),
					Body:      "Second comment on issue 3",
					User:      "commenter4",
					CreatedAt: now.Add(-time.Minute * 30),
				},
			},
		},
	}

	// Convert to AI issues
	aiIssues := ConvertGitHubIssuesToAI(ghIssues)

	// Verify length
	if len(aiIssues) != len(ghIssues) {
		t.Errorf("AI Issues length = %d, want %d", len(aiIssues), len(ghIssues))
	}

	// Verify each converted issue
	for i, aiIssue := range aiIssues {
		ghIssue := ghIssues[i]

		if aiIssue.ID != int(ghIssue.ID) {
			t.Errorf("Issue[%d].ID = %d, want %d", i, aiIssue.ID, int(ghIssue.ID))
		}

		if aiIssue.Number != ghIssue.Number {
			t.Errorf("Issue[%d].Number = %d, want %d", i, aiIssue.Number, ghIssue.Number)
		}

		if aiIssue.Title != ghIssue.Title {
			t.Errorf("Issue[%d].Title = %s, want %s", i, aiIssue.Title, ghIssue.Title)
		}

		if aiIssue.State != ghIssue.State {
			t.Errorf("Issue[%d].State = %s, want %s", i, aiIssue.State, ghIssue.State)
		}

		if len(aiIssue.Labels) != len(ghIssue.Labels) {
			t.Errorf("Issue[%d].Labels length = %d, want %d", i, len(aiIssue.Labels), len(ghIssue.Labels))
		}

		if len(aiIssue.Comments) != len(ghIssue.Comments) {
			t.Errorf("Issue[%d].Comments length = %d, want %d", i, len(aiIssue.Comments), len(ghIssue.Comments))
		}
	}
}

func TestConvertGitHubIssuesToAI_EmptySlice(t *testing.T) {
	// Test with empty slice
	ghIssues := []*github.IssueData{}
	aiIssues := ConvertGitHubIssuesToAI(ghIssues)

	if len(aiIssues) != 0 {
		t.Errorf("AI Issues length = %d, want 0", len(aiIssues))
	}
}

func TestConvertGitHubIssuesToAI_NilSlice(t *testing.T) {
	// Test with nil slice
	var ghIssues []*github.IssueData
	aiIssues := ConvertGitHubIssuesToAI(ghIssues)

	if len(aiIssues) != 0 {
		t.Errorf("AI Issues length = %d, want 0", len(aiIssues))
	}
}

func TestConvertGitHubIssueToAI_TypeConversions(t *testing.T) {
	now := time.Now()

	// Test with large ID values to ensure int64 to int conversion works correctly
	ghIssue := &github.IssueData{
		ID:        int64(2147483647), // Max int32 value
		Number:    999,
		Title:     "Type Conversion Test",
		Body:      "Testing type conversions",
		State:     "open",
		Labels:    []string{"test"},
		CreatedAt: now,
		UpdatedAt: now,
		User:      "testuser",
		Comments: []github.Comment{
			{
				ID:        int64(2147483648), // Larger than max int32
				Body:      "Comment with large ID",
				User:      "commenter",
				CreatedAt: now,
			},
		},
	}

	aiIssue := ConvertGitHubIssueToAI(ghIssue)

	// Verify ID conversion
	expectedID := int(ghIssue.ID)
	if aiIssue.ID != expectedID {
		t.Errorf("ID = %d, want %d", aiIssue.ID, expectedID)
	}

	// Verify comment ID conversion
	if len(aiIssue.Comments) > 0 {
		expectedCommentID := int(ghIssue.Comments[0].ID)
		if aiIssue.Comments[0].ID != expectedCommentID {
			t.Errorf("Comment ID = %d, want %d", aiIssue.Comments[0].ID, expectedCommentID)
		}
	}
}

func TestConvertGitHubIssueToAI_EdgeCases(t *testing.T) {
	now := time.Now()

	// Test with edge case values
	ghIssue := &github.IssueData{
		ID:        0,  // Zero ID
		Number:    0,  // Zero number
		Title:     "", // Empty title
		Body:      "", // Empty body
		State:     "",
		Labels:    nil, // Nil labels (should be treated as empty)
		CreatedAt: now,
		UpdatedAt: now,
		User:      "",  // Empty user
		Comments:  nil, // Nil comments (should be treated as empty)
	}

	aiIssue := ConvertGitHubIssueToAI(ghIssue)

	// Verify zero values are preserved
	if aiIssue.ID != 0 {
		t.Errorf("ID = %d, want 0", aiIssue.ID)
	}

	if aiIssue.Number != 0 {
		t.Errorf("Number = %d, want 0", aiIssue.Number)
	}

	if aiIssue.Title != "" {
		t.Errorf("Title = %s, want empty string", aiIssue.Title)
	}

	if aiIssue.Body != "" {
		t.Errorf("Body = %s, want empty string", aiIssue.Body)
	}

	if aiIssue.User != "" {
		t.Errorf("User = %s, want empty string", aiIssue.User)
	}

	// Verify nil slices are preserved (Go behavior: nil slices from range remain nil)
	// This is expected behavior - the converter preserves the original slice state

	if len(aiIssue.Labels) != 0 {
		t.Errorf("Labels length = %d, want 0", len(aiIssue.Labels))
	}

	if len(aiIssue.Comments) != 0 {
		t.Errorf("Comments length = %d, want 0", len(aiIssue.Comments))
	}
}

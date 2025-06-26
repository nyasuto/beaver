package models

import (
	"testing"
	"time"
)

func TestIssueQuery_ValidateRepository(t *testing.T) {
	tests := []struct {
		name       string
		repository string
		want       bool
	}{
		{
			name:       "valid repository format",
			repository: "owner/repo",
			want:       true,
		},
		{
			name:       "empty repository",
			repository: "",
			want:       false,
		},
		{
			name:       "missing owner",
			repository: "/repo",
			want:       false,
		},
		{
			name:       "missing repo",
			repository: "owner/",
			want:       false,
		},
		{
			name:       "no slash",
			repository: "ownerrepo",
			want:       false,
		},
		{
			name:       "multiple slashes",
			repository: "owner/repo/extra",
			want:       false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			q := &IssueQuery{
				Repository: tt.repository,
			}
			if got := q.ValidateRepository(); got != tt.want {
				t.Errorf("IssueQuery.ValidateRepository() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestIssueQuery_SetDefaults(t *testing.T) {
	q := &IssueQuery{
		Repository: "owner/repo",
	}

	q.SetDefaults()

	if q.State != "open" {
		t.Errorf("Expected default state 'open', got '%s'", q.State)
	}
	if q.Sort != "created" {
		t.Errorf("Expected default sort 'created', got '%s'", q.Sort)
	}
	if q.Direction != "desc" {
		t.Errorf("Expected default direction 'desc', got '%s'", q.Direction)
	}
	if q.PerPage != 30 {
		t.Errorf("Expected default per_page 30, got %d", q.PerPage)
	}
	if q.Page != 1 {
		t.Errorf("Expected default page 1, got %d", q.Page)
	}
}

func TestDefaultIssueQuery(t *testing.T) {
	repository := "test/repo"
	query := DefaultIssueQuery(repository)

	if query.Repository != repository {
		t.Errorf("Expected repository '%s', got '%s'", repository, query.Repository)
	}
	if query.State != "open" {
		t.Errorf("Expected default state 'open', got '%s'", query.State)
	}
	if query.Sort != "created" {
		t.Errorf("Expected default sort 'created', got '%s'", query.Sort)
	}
	if query.Direction != "desc" {
		t.Errorf("Expected default direction 'desc', got '%s'", query.Direction)
	}
	if query.PerPage != 30 {
		t.Errorf("Expected default per_page 30, got %d", query.PerPage)
	}
	if query.Page != 1 {
		t.Errorf("Expected default page 1, got %d", query.Page)
	}
	if query.MaxPages != 0 {
		t.Errorf("Expected default max_pages 0, got %d", query.MaxPages)
	}
}

func TestIssueResult_Creation(t *testing.T) {
	now := time.Now()

	result := &IssueResult{
		Issues:       []Issue{},
		TotalCount:   0,
		FetchedCount: 0,
		Repository:   "test/repo",
		Query:        DefaultIssueQuery("test/repo"),
		FetchedAt:    now,
	}

	if result.Repository != "test/repo" {
		t.Errorf("Expected repository 'test/repo', got '%s'", result.Repository)
	}
	if result.TotalCount != 0 {
		t.Errorf("Expected total count 0, got %d", result.TotalCount)
	}
	if result.FetchedCount != 0 {
		t.Errorf("Expected fetched count 0, got %d", result.FetchedCount)
	}
}

package main

import (
	"testing"
)

// TestParseOwnerRepo tests the parseOwnerRepo utility function
func TestParseOwnerRepo(t *testing.T) {
	tests := []struct {
		name          string
		repoPath      string
		expectedOwner string
		expectedRepo  string
	}{
		{
			name:          "Valid owner/repo format",
			repoPath:      "owner/repo",
			expectedOwner: "owner",
			expectedRepo:  "repo",
		},
		{
			name:          "Real GitHub repository",
			repoPath:      "nyasuto/beaver",
			expectedOwner: "nyasuto",
			expectedRepo:  "beaver",
		},
		{
			name:          "Repository with numbers and dashes",
			repoPath:      "test-org/my-repo-123",
			expectedOwner: "test-org",
			expectedRepo:  "my-repo-123",
		},
		{
			name:          "Invalid format - no slash",
			repoPath:      "invalidrepo",
			expectedOwner: "",
			expectedRepo:  "",
		},
		{
			name:          "Invalid format - multiple slashes",
			repoPath:      "owner/repo/extra",
			expectedOwner: "",
			expectedRepo:  "",
		},
		{
			name:          "Invalid format - empty string",
			repoPath:      "",
			expectedOwner: "",
			expectedRepo:  "",
		},
		{
			name:          "Invalid format - only slash",
			repoPath:      "/",
			expectedOwner: "",
			expectedRepo:  "",
		},
		{
			name:          "Invalid format - trailing slash",
			repoPath:      "owner/repo/",
			expectedOwner: "",
			expectedRepo:  "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			owner, repo := parseOwnerRepo(tt.repoPath)
			if owner != tt.expectedOwner {
				t.Errorf("parseOwnerRepo(%q) owner = %q, want %q", tt.repoPath, owner, tt.expectedOwner)
			}
			if repo != tt.expectedRepo {
				t.Errorf("parseOwnerRepo(%q) repo = %q, want %q", tt.repoPath, repo, tt.expectedRepo)
			}
		})
	}
}

// TestSplitString tests the splitString utility function
func TestSplitString(t *testing.T) {
	tests := []struct {
		name      string
		input     string
		separator string
		expected  []string
	}{
		{
			name:      "Basic slash split",
			input:     "owner/repo",
			separator: "/",
			expected:  []string{"owner", "repo"},
		},
		{
			name:      "Empty string",
			input:     "",
			separator: "/",
			expected:  nil,
		},
		{
			name:      "No separator",
			input:     "noslash",
			separator: "/",
			expected:  []string{"noslash"},
		},
		{
			name:      "Multiple separators",
			input:     "a/b/c/d",
			separator: "/",
			expected:  []string{"a", "b", "c", "d"},
		},
		{
			name:      "Empty parts",
			input:     "a//b",
			separator: "/",
			expected:  []string{"a", "", "b"},
		},
		{
			name:      "Separator at start",
			input:     "/start",
			separator: "/",
			expected:  []string{"", "start"},
		},
		{
			name:      "Separator at end",
			input:     "end/",
			separator: "/",
			expected:  []string{"end", ""},
		},
		{
			name:      "Only separator",
			input:     "/",
			separator: "/",
			expected:  []string{"", ""},
		},
		{
			name:      "Multi-character separator",
			input:     "hello::world::test",
			separator: "::",
			expected:  []string{"hello", "world", "test"},
		},
		{
			name:      "Dot separator",
			input:     "github.com",
			separator: ".",
			expected:  []string{"github", "com"},
		},
		{
			name:      "Complex real-world case",
			input:     "owner-123/my-awesome-repo_v2",
			separator: "/",
			expected:  []string{"owner-123", "my-awesome-repo_v2"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := splitString(tt.input, tt.separator)

			// Compare lengths first
			if len(result) != len(tt.expected) {
				t.Errorf("splitString(%q, %q) length = %d, want %d", tt.input, tt.separator, len(result), len(tt.expected))
				t.Errorf("Got: %v, Want: %v", result, tt.expected)
				return
			}

			// Compare each element
			for i, got := range result {
				if got != tt.expected[i] {
					t.Errorf("splitString(%q, %q)[%d] = %q, want %q", tt.input, tt.separator, i, got, tt.expected[i])
				}
			}
		})
	}
}

// TestSplitString_EdgeCases tests edge cases for the splitString function
func TestSplitString_EdgeCases(t *testing.T) {
	t.Run("Overlapping separators", func(t *testing.T) {
		// Test case where separator pattern could overlap
		result := splitString("aaa", "aa")
		expected := []string{"", "a"}

		if len(result) != len(expected) {
			t.Errorf("splitString('aaa', 'aa') length = %d, want %d", len(result), len(expected))
			t.Errorf("Got: %v, Want: %v", result, expected)
			return
		}

		for i, got := range result {
			if got != expected[i] {
				t.Errorf("splitString('aaa', 'aa')[%d] = %q, want %q", i, got, expected[i])
			}
		}
	})

	t.Run("Separator longer than input", func(t *testing.T) {
		result := splitString("hi", "hello")
		expected := []string{"hi"}

		if len(result) != len(expected) {
			t.Errorf("splitString('hi', 'hello') length = %d, want %d", len(result), len(expected))
			return
		}

		if result[0] != expected[0] {
			t.Errorf("splitString('hi', 'hello')[0] = %q, want %q", result[0], expected[0])
		}
	})

	t.Run("Input equals separator", func(t *testing.T) {
		result := splitString("/", "/")
		expected := []string{"", ""}

		if len(result) != len(expected) {
			t.Errorf("splitString('/', '/') length = %d, want %d", len(result), len(expected))
			return
		}

		for i, got := range result {
			if got != expected[i] {
				t.Errorf("splitString('/', '/')[%d] = %q, want %q", i, got, expected[i])
			}
		}
	})
}

// TestSplitString_PerformanceAndConsistency tests performance and consistency
func TestSplitString_PerformanceAndConsistency(t *testing.T) {
	// Test with a large string to ensure the algorithm works correctly
	longInput := "part1/part2/part3/part4/part5/part6/part7/part8/part9/part10"
	result := splitString(longInput, "/")
	expected := []string{"part1", "part2", "part3", "part4", "part5", "part6", "part7", "part8", "part9", "part10"}

	if len(result) != len(expected) {
		t.Errorf("splitString long input length = %d, want %d", len(result), len(expected))
		return
	}

	for i, got := range result {
		if got != expected[i] {
			t.Errorf("splitString long input[%d] = %q, want %q", i, got, expected[i])
		}
	}
}

// TestParseRepoPath tests the parseRepoPath function from wiki.go
func TestParseRepoPath(t *testing.T) {
	tests := []struct {
		name          string
		repoPath      string
		expectedOwner string
		expectedRepo  string
		wantError     bool
	}{
		{
			name:          "Valid owner/repo format",
			repoPath:      "owner/repo",
			expectedOwner: "owner",
			expectedRepo:  "repo",
			wantError:     false,
		},
		{
			name:          "Real GitHub repository",
			repoPath:      "golang/go",
			expectedOwner: "golang",
			expectedRepo:  "go",
			wantError:     false,
		},
		{
			name:          "Repository with numbers and dashes",
			repoPath:      "test-org/my-repo-123",
			expectedOwner: "test-org",
			expectedRepo:  "my-repo-123",
			wantError:     false,
		},
		{
			name:      "Invalid format - no slash",
			repoPath:  "invalidrepo",
			wantError: true,
		},
		{
			name:      "Invalid format - multiple slashes",
			repoPath:  "owner/repo/extra",
			wantError: true,
		},
		{
			name:      "Invalid format - empty string",
			repoPath:  "",
			wantError: true,
		},
		{
			name:          "Edge case - slash only",
			repoPath:      "/",
			expectedOwner: "",
			expectedRepo:  "",
			wantError:     false,
		},
		{
			name:      "Invalid format - trailing slash",
			repoPath:  "owner/repo/",
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			owner, repo, err := parseRepoPath(tt.repoPath)

			if tt.wantError {
				if err == nil {
					t.Errorf("parseRepoPath() expected error but got none")
				}
				return
			}

			if err != nil {
				t.Errorf("parseRepoPath() unexpected error = %v", err)
				return
			}

			if owner != tt.expectedOwner {
				t.Errorf("parseRepoPath() owner = %v, want %v", owner, tt.expectedOwner)
			}

			if repo != tt.expectedRepo {
				t.Errorf("parseRepoPath() repo = %v, want %v", repo, tt.expectedRepo)
			}
		})
	}
}

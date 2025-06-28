package main

import (
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/nyasuto/beaver/internal/ai"
	"github.com/nyasuto/beaver/internal/models"
)

// TestOutputSummarization tests the outputSummarization function for AI summary formatting
func TestOutputSummarization(t *testing.T) {
	// Create test AI summarization response
	response := &ai.SummarizationResponse{
		Summary:        "This issue describes a critical authentication bug that prevents users from logging in.",
		KeyPoints:      []string{"Authentication failure", "Login system affected", "High priority fix needed"},
		Complexity:     "medium",
		Category:       func() *string { s := "bug"; return &s }(),
		ProcessingTime: 1.25,
		ProviderUsed:   "openai",
		ModelUsed:      "gpt-4",
		TokenUsage: map[string]int{
			"total_tokens":      150,
			"prompt_tokens":     100,
			"completion_tokens": 50,
		},
	}

	t.Run("Output summarization in text format", func(t *testing.T) {
		// Capture stdout
		old := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		err := outputSummarization(response, "text")

		// Restore stdout
		w.Close()
		os.Stdout = old
		out, _ := io.ReadAll(r)

		if err != nil {
			t.Fatalf("outputSummarization() error = %v", err)
		}

		stdout := string(out)

		// Check text format output
		if !strings.Contains(stdout, "AI要約結果") {
			t.Error("Should contain Japanese header")
		}
		if !strings.Contains(stdout, "This issue describes a critical authentication bug") {
			t.Error("Should contain summary text")
		}
		if !strings.Contains(stdout, "Authentication failure") {
			t.Error("Should contain key points")
		}
		if !strings.Contains(stdout, "カテゴリ: bug") {
			t.Error("Should contain category")
		}
		if !strings.Contains(stdout, "複雑度: medium") {
			t.Error("Should contain complexity")
		}
		if !strings.Contains(stdout, "使用プロバイダー: openai (gpt-4)") {
			t.Error("Should contain provider info")
		}
		if !strings.Contains(stdout, "処理時間: 1.25秒") {
			t.Error("Should contain processing time")
		}
		if !strings.Contains(stdout, "使用トークン: 150") {
			t.Error("Should contain token usage")
		}
		if !strings.Contains(stdout, "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━") {
			t.Error("Should contain separator line")
		}
	})

	t.Run("Output summarization in JSON format", func(t *testing.T) {
		// Capture stdout
		old := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		err := outputSummarization(response, "json")

		// Restore stdout
		w.Close()
		os.Stdout = old
		out, _ := io.ReadAll(r)

		if err != nil {
			t.Fatalf("outputSummarization() error = %v", err)
		}

		stdout := string(out)

		// Check JSON format output
		if !strings.Contains(stdout, `"summary": "This issue describes a critical authentication bug`) {
			t.Error("Should contain summary in JSON format")
		}
		if !strings.Contains(stdout, `"complexity": "medium"`) {
			t.Error("Should contain complexity in JSON format")
		}
		if !strings.Contains(stdout, `"category": "bug"`) {
			t.Error("Should contain category in JSON format")
		}
		if !strings.Contains(stdout, `"processing_time": 1.25`) {
			t.Error("Should contain processing time in JSON format")
		}
		if !strings.Contains(stdout, `"provider_used": "openai"`) {
			t.Error("Should contain provider in JSON format")
		}
		if !strings.Contains(stdout, `"model_used": "gpt-4"`) {
			t.Error("Should contain model in JSON format")
		}

		// Should be valid JSON structure
		if !strings.Contains(stdout, "{") || !strings.Contains(stdout, "}") {
			t.Error("Should contain JSON braces")
		}
	})

	t.Run("Output summarization without category", func(t *testing.T) {
		responseNoCategory := &ai.SummarizationResponse{
			Summary:        "Test summary",
			KeyPoints:      []string{"Point 1"},
			Complexity:     "low",
			Category:       nil, // No category
			ProcessingTime: 0.5,
			ProviderUsed:   "anthropic",
			ModelUsed:      "claude-3",
			TokenUsage:     nil, // No token usage
		}

		// Test text format
		old := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		err := outputSummarization(responseNoCategory, "text")

		w.Close()
		os.Stdout = old
		out, _ := io.ReadAll(r)

		if err != nil {
			t.Fatalf("outputSummarization() error = %v", err)
		}

		stdout := string(out)

		// Should not contain category info
		if strings.Contains(stdout, "カテゴリ:") {
			t.Error("Should not contain category when not provided")
		}
		// Should not contain token usage
		if strings.Contains(stdout, "使用トークン:") {
			t.Error("Should not contain token usage when not provided")
		}
		// Should contain other info
		if !strings.Contains(stdout, "Test summary") {
			t.Error("Should contain summary")
		}
		if !strings.Contains(stdout, "anthropic (claude-3)") {
			t.Error("Should contain provider info")
		}
	})

	t.Run("Output summarization JSON without category", func(t *testing.T) {
		responseNoCategory := &ai.SummarizationResponse{
			Summary:        "Test summary",
			Complexity:     "low",
			Category:       nil, // No category
			ProcessingTime: 0.5,
			ProviderUsed:   "anthropic",
			ModelUsed:      "claude-3",
		}

		// Test JSON format
		old := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		err := outputSummarization(responseNoCategory, "json")

		w.Close()
		os.Stdout = old
		out, _ := io.ReadAll(r)

		if err != nil {
			t.Fatalf("outputSummarization() error = %v", err)
		}

		stdout := string(out)

		// Should not contain category in JSON when nil
		if strings.Contains(stdout, `"category":`) {
			t.Error("Should not contain category field when nil")
		}
		// Should contain other fields
		if !strings.Contains(stdout, `"summary": "Test summary"`) {
			t.Error("Should contain summary")
		}
		if !strings.Contains(stdout, `"provider_used": "anthropic"`) {
			t.Error("Should contain provider")
		}
	})
}

// TestOutputBatchSummarization tests the outputBatchSummarization function for batch AI summary formatting
func TestOutputBatchSummarization(t *testing.T) {
	// Create comprehensive test batch summarization response
	response := &ai.BatchSummarizationResponse{
		TotalProcessed: 2,
		TotalFailed:    1,
		ProcessingTime: 15.5,
		Results: []ai.SummarizationResponse{
			{
				Summary:    "First issue summary: Critical authentication bug affecting login system",
				Complexity: "high",
				Category:   func() *string { s := "bug"; return &s }(),
			},
			{
				Summary:    "Second issue summary: Feature request for dark mode implementation",
				Complexity: "medium",
				Category:   func() *string { s := "enhancement"; return &s }(),
			},
		},
		FailedIssues: []ai.FailedIssue{
			{
				IssueNumber: 123,
				Error:       "API rate limit exceeded",
			},
		},
	}

	t.Run("Output batch summarization in text format", func(t *testing.T) {
		// Capture stdout
		old := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		err := outputBatchSummarization(response, "text")

		// Restore stdout
		w.Close()
		os.Stdout = old
		out, _ := io.ReadAll(r)

		if err != nil {
			t.Fatalf("outputBatchSummarization() error = %v", err)
		}

		stdout := string(out)

		// Check text format output headers
		if !strings.Contains(stdout, "バッチAI要約結果") {
			t.Error("Should contain Japanese batch header")
		}
		if !strings.Contains(stdout, "処理統計:") {
			t.Error("Should contain statistics header")
		}

		// Check statistics
		if !strings.Contains(stdout, "成功: 2件") {
			t.Error("Should contain success count")
		}
		if !strings.Contains(stdout, "失敗: 1件") {
			t.Error("Should contain failure count")
		}
		if !strings.Contains(stdout, "合計時間: 15.50秒") {
			t.Error("Should contain processing time")
		}

		// Check error details
		if !strings.Contains(stdout, "エラー詳細:") {
			t.Error("Should contain error details header")
		}
		if !strings.Contains(stdout, "Issue #123: API rate limit exceeded") {
			t.Error("Should contain specific error message")
		}

		// Check summarization results
		if !strings.Contains(stdout, "要約結果:") {
			t.Error("Should contain results header")
		}
		if !strings.Contains(stdout, "Critical authentication bug affecting login system") {
			t.Error("Should contain first issue summary")
		}
		if !strings.Contains(stdout, "Feature request for dark mode implementation") {
			t.Error("Should contain second issue summary")
		}
		if !strings.Contains(stdout, "複雑度: high") {
			t.Error("Should contain complexity info")
		}
		if !strings.Contains(stdout, "カテゴリ: bug") {
			t.Error("Should contain category info")
		}

		// Check separators
		if !strings.Contains(stdout, "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━") {
			t.Error("Should contain separator line")
		}
	})

	t.Run("Output batch summarization in JSON format", func(t *testing.T) {
		// Capture stdout
		old := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		err := outputBatchSummarization(response, "json")

		// Restore stdout
		w.Close()
		os.Stdout = old
		out, _ := io.ReadAll(r)

		if err != nil {
			t.Fatalf("outputBatchSummarization() error = %v", err)
		}

		stdout := string(out)

		// Check JSON format output
		if !strings.Contains(stdout, `"total_processed": 2`) {
			t.Error("Should contain total processed in JSON format")
		}
		if !strings.Contains(stdout, `"total_failed": 1`) {
			t.Error("Should contain total failed in JSON format")
		}
		if !strings.Contains(stdout, `"processing_time": 15.50`) {
			t.Error("Should contain processing time in JSON format")
		}
		if !strings.Contains(stdout, `"results": [...]`) {
			t.Error("Should contain results placeholder in JSON format")
		}

		// Should be valid JSON structure
		if !strings.Contains(stdout, "{") || !strings.Contains(stdout, "}") {
			t.Error("Should contain JSON braces")
		}
	})

	t.Run("Output batch summarization with no failures", func(t *testing.T) {
		responseNoFailures := &ai.BatchSummarizationResponse{
			TotalProcessed: 3,
			TotalFailed:    0,
			ProcessingTime: 8.2,
			Results: []ai.SummarizationResponse{
				{
					Summary:    "Test summary",
					Complexity: "low",
					Category:   nil, // No category
				},
			},
			FailedIssues: []ai.FailedIssue{}, // No failures
		}

		// Test text format
		old := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		err := outputBatchSummarization(responseNoFailures, "text")

		w.Close()
		os.Stdout = old
		out, _ := io.ReadAll(r)

		if err != nil {
			t.Fatalf("outputBatchSummarization() error = %v", err)
		}

		stdout := string(out)

		// Should show zero failures
		if !strings.Contains(stdout, "失敗: 0件") {
			t.Error("Should show zero failures")
		}
		// Should not contain error details section when no failures
		if strings.Contains(stdout, "エラー詳細:") {
			t.Error("Should not contain error details when no failures")
		}
		// Should contain summary
		if !strings.Contains(stdout, "Test summary") {
			t.Error("Should contain summary text")
		}
		// Should handle missing category gracefully
		if strings.Contains(stdout, "カテゴリ:") {
			t.Error("Should not show category when not provided")
		}
	})

	t.Run("Output batch summarization with no results", func(t *testing.T) {
		responseNoResults := &ai.BatchSummarizationResponse{
			TotalProcessed: 0,
			TotalFailed:    2,
			ProcessingTime: 2.1,
			Results:        []ai.SummarizationResponse{}, // No results
			FailedIssues: []ai.FailedIssue{
				{
					IssueNumber: 456,
					Error:       "Network timeout",
				},
				{
					IssueNumber: 789,
					Error:       "Invalid response",
				},
			},
		}

		// Test text format
		old := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		err := outputBatchSummarization(responseNoResults, "text")

		w.Close()
		os.Stdout = old
		out, _ := io.ReadAll(r)

		if err != nil {
			t.Fatalf("outputBatchSummarization() error = %v", err)
		}

		stdout := string(out)

		// Should show zero successes
		if !strings.Contains(stdout, "成功: 0件") {
			t.Error("Should show zero successes")
		}
		// Should show two failures
		if !strings.Contains(stdout, "失敗: 2件") {
			t.Error("Should show two failures")
		}
		// Should contain error details for both failures
		if !strings.Contains(stdout, "Issue #456: Network timeout") {
			t.Error("Should contain first error message")
		}
		if !strings.Contains(stdout, "Issue #789: Invalid response") {
			t.Error("Should contain second error message")
		}
		// Should still show results header even with no results
		if !strings.Contains(stdout, "要約結果:") {
			t.Error("Should contain results header even with no results")
		}
	})
}

// TestOutputSummary tests the outputSummary function for GitHub issue summary formatting
func TestOutputSummary(t *testing.T) {
	// Create comprehensive test data
	result := &models.IssueResult{
		Repository:   "owner/test-repo",
		FetchedAt:    time.Date(2023, 6, 15, 14, 30, 45, 0, time.UTC),
		FetchedCount: 3,
		TotalCount:   3,
		Issues: []models.Issue{
			{
				ID:      123,
				Number:  456,
				Title:   "Bug in authentication system",
				Body:    "Users are unable to log in due to a critical authentication bug that affects the entire login system and prevents access to user accounts.",
				State:   "open",
				HTMLURL: "https://github.com/owner/test-repo/issues/456",
				User: models.User{
					ID:    789,
					Login: "developer1",
				},
				Labels: []models.Label{
					{ID: 1, Name: "bug", Color: "ff0000", Description: "Bug report"},
					{ID: 2, Name: "priority:high", Color: "ff6600", Description: "High priority"},
				},
				Comments: []models.Comment{
					{ID: 1, Body: "Comment 1"},
					{ID: 2, Body: "Comment 2"},
				},
				CreatedAt: time.Date(2023, 6, 10, 9, 0, 0, 0, time.UTC),
			},
			{
				ID:      124,
				Number:  457,
				Title:   "Feature request: dark mode",
				Body:    "Add dark mode support",
				State:   "open",
				HTMLURL: "https://github.com/owner/test-repo/issues/457",
				User: models.User{
					ID:    790,
					Login: "user123",
				},
				Labels: []models.Label{
					{ID: 3, Name: "enhancement", Color: "00ff00", Description: "Enhancement"},
				},
				Comments:  []models.Comment{},
				CreatedAt: time.Date(2023, 6, 12, 15, 30, 0, 0, time.UTC),
			},
		},
		RateLimit: &models.RateLimitInfo{
			Limit:     5000,
			Remaining: 4950,
			ResetTime: time.Date(2023, 6, 15, 15, 0, 0, 0, time.UTC),
			Used:      50,
		},
	}

	t.Run("Output summary to console", func(t *testing.T) {
		// Capture stdout
		old := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		err := outputSummary(result, "")

		// Restore stdout
		w.Close()
		os.Stdout = old
		out, _ := io.ReadAll(r)

		if err != nil {
			t.Fatalf("outputSummary() error = %v", err)
		}

		stdout := string(out)

		// Check header information
		if !strings.Contains(stdout, "📊 GitHub Issues取得結果 - owner/test-repo") {
			t.Error("Should contain repository header")
		}
		if !strings.Contains(stdout, "2023-06-15 14:30:45") {
			t.Error("Should contain formatted fetch time")
		}
		if !strings.Contains(stdout, "取得件数: 3件") {
			t.Error("Should contain fetched count")
		}

		// Check issue details
		if !strings.Contains(stdout, "1. #456 Bug in authentication system") {
			t.Error("Should contain first issue with numbering")
		}
		if !strings.Contains(stdout, "状態: open | 作成者: developer1") {
			t.Error("Should contain issue metadata")
		}

		// Check labels
		if !strings.Contains(stdout, "ラベル: bug, priority:high") {
			t.Error("Should contain issue labels")
		}

		// Check statistics
		if !strings.Contains(stdout, "📈 統計情報:") {
			t.Error("Should contain statistics header")
		}
		if !strings.Contains(stdout, "オープン: 2件") {
			t.Error("Should contain open count")
		}
	})

	t.Run("Output summary to file", func(t *testing.T) {
		// Create temporary file
		tmpDir := t.TempDir()
		outputFile := filepath.Join(tmpDir, "test_summary.txt")

		// Capture stdout for file save message
		old := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		err := outputSummary(result, outputFile)

		// Restore stdout
		w.Close()
		os.Stdout = old
		out, _ := io.ReadAll(r)

		if err != nil {
			t.Fatalf("outputSummary() error = %v", err)
		}

		// Check that file was created
		if _, err := os.Stat(outputFile); os.IsNotExist(err) {
			t.Error("Output file was not created")
		}

		// Read and verify file content
		fileContent, err := os.ReadFile(outputFile)
		if err != nil {
			t.Fatalf("Failed to read output file: %v", err)
		}

		content := string(fileContent)
		if !strings.Contains(content, "owner/test-repo") {
			t.Error("File should contain repository name")
		}

		// Check stdout message
		stdout := string(out)
		if !strings.Contains(stdout, "サマリーをファイルに保存しました") {
			t.Error("Should print success message to stdout")
		}
	})
}

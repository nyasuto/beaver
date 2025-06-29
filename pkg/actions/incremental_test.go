package actions

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/nyasuto/beaver/internal/models"
)

// Test data generators
func createTestIssues(count int) []models.Issue {
	now := time.Now()
	issues := make([]models.Issue, count)

	for i := 0; i < count; i++ {
		issues[i] = models.Issue{
			ID:        int64(i + 1),
			Number:    i + 1,
			Title:     fmt.Sprintf("Test Issue %d", i+1),
			Body:      fmt.Sprintf("Test issue body %d", i+1),
			State:     "open",
			UpdatedAt: now.Add(-time.Duration(i) * time.Hour),
			CreatedAt: now.Add(-time.Duration(i+24) * time.Hour),
		}
	}

	return issues
}

func createTestIncrementalOptions() IncrementalOptions {
	return IncrementalOptions{
		StateFile:    "",
		LookbackTime: 24 * time.Hour,
		ForceRebuild: false,
		DryRun:       false,
		MaxItems:     100,
	}
}

func createTestGitHubContext() *GitHubContext {
	return &GitHubContext{
		Event:      "push",
		Action:     "opened",
		Repository: "test/repo",
		Ref:        "refs/heads/main",
		SHA:        "abc123",
		Actor:      "testuser",
		RunID:      "123456",
		RunNumber:  1,
		JobID:      "job123",
		Workflow:   "test-workflow",
	}
}

func TestNewIncrementalManager(t *testing.T) {
	t.Run("with default options", func(t *testing.T) {
		options := IncrementalOptions{}
		manager := NewIncrementalManager(options)

		if manager == nil {
			t.Fatal("NewIncrementalManager returned nil")
		}

		// Check defaults
		if manager.options.StateFile != ".beaver/incremental-state.json" {
			t.Errorf("Expected default state file '.beaver/incremental-state.json', got '%s'", manager.options.StateFile)
		}
		if manager.options.LookbackTime != 24*time.Hour {
			t.Errorf("Expected default lookback time 24h, got %v", manager.options.LookbackTime)
		}
		if manager.options.MaxItems != 100 {
			t.Errorf("Expected default max items 100, got %d", manager.options.MaxItems)
		}

		// Check initial state
		if manager.state == nil {
			t.Fatal("Manager state is nil")
		}
		if manager.state.ProcessedIssues == nil {
			t.Error("ProcessedIssues map is nil")
		}
		if manager.state.ProcessedEvents == nil {
			t.Error("ProcessedEvents slice is nil")
		}
		if manager.state.Version != "1.0" {
			t.Errorf("Expected version '1.0', got '%s'", manager.state.Version)
		}
	})

	t.Run("with custom options", func(t *testing.T) {
		options := IncrementalOptions{
			StateFile:    "/custom/path/state.json",
			LookbackTime: 12 * time.Hour,
			ForceRebuild: true,
			DryRun:       true,
			MaxItems:     50,
		}
		manager := NewIncrementalManager(options)

		if manager.options.StateFile != options.StateFile {
			t.Errorf("Expected state file '%s', got '%s'", options.StateFile, manager.options.StateFile)
		}
		if manager.options.LookbackTime != options.LookbackTime {
			t.Errorf("Expected lookback time %v, got %v", options.LookbackTime, manager.options.LookbackTime)
		}
		if manager.options.ForceRebuild != options.ForceRebuild {
			t.Errorf("Expected force rebuild %v, got %v", options.ForceRebuild, manager.options.ForceRebuild)
		}
		if manager.options.DryRun != options.DryRun {
			t.Errorf("Expected dry run %v, got %v", options.DryRun, manager.options.DryRun)
		}
		if manager.options.MaxItems != options.MaxItems {
			t.Errorf("Expected max items %d, got %d", options.MaxItems, manager.options.MaxItems)
		}
	})
}

func TestLoadState(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "incremental_test_*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	t.Run("no state file exists", func(t *testing.T) {
		options := createTestIncrementalOptions()
		options.StateFile = filepath.Join(tempDir, "nonexistent.json")
		manager := NewIncrementalManager(options)

		err := manager.LoadState()
		if err != nil {
			t.Errorf("LoadState should not fail when no file exists: %v", err)
		}

		// State should remain as initialized
		if len(manager.state.ProcessedIssues) != 0 {
			t.Error("ProcessedIssues should be empty when no state file exists")
		}
	})

	t.Run("valid state file", func(t *testing.T) {
		stateFile := filepath.Join(tempDir, "valid_state.json")

		// Create valid state file
		testState := IncrementalState{
			LastUpdate:    time.Now().Add(-1 * time.Hour),
			LastUpdateSHA: "test123",
			ProcessedIssues: map[int]time.Time{
				1: time.Now().Add(-2 * time.Hour),
				2: time.Now().Add(-3 * time.Hour),
			},
			ProcessedEvents: []ProcessedEvent{
				{
					Type:      "issue",
					ID:        "event1",
					Timestamp: time.Now().Add(-30 * time.Minute),
					Metadata:  map[string]interface{}{"test": "data"},
				},
			},
			Version: "1.0",
		}

		data, err := json.MarshalIndent(testState, "", "  ")
		if err != nil {
			t.Fatalf("Failed to marshal test state: %v", err)
		}

		err = os.WriteFile(stateFile, data, 0600)
		if err != nil {
			t.Fatalf("Failed to write test state file: %v", err)
		}

		options := createTestIncrementalOptions()
		options.StateFile = stateFile
		manager := NewIncrementalManager(options)

		err = manager.LoadState()
		if err != nil {
			t.Errorf("LoadState failed with valid file: %v", err)
		}

		// Verify loaded state
		if manager.state.LastUpdateSHA != "test123" {
			t.Errorf("Expected LastUpdateSHA 'test123', got '%s'", manager.state.LastUpdateSHA)
		}
		if len(manager.state.ProcessedIssues) != 2 {
			t.Errorf("Expected 2 processed issues, got %d", len(manager.state.ProcessedIssues))
		}
		if len(manager.state.ProcessedEvents) != 1 {
			t.Errorf("Expected 1 processed event, got %d", len(manager.state.ProcessedEvents))
		}
	})

	t.Run("invalid JSON state file", func(t *testing.T) {
		stateFile := filepath.Join(tempDir, "invalid_state.json")

		// Create invalid JSON file
		err := os.WriteFile(stateFile, []byte("invalid json {"), 0600)
		if err != nil {
			t.Fatalf("Failed to write invalid state file: %v", err)
		}

		options := createTestIncrementalOptions()
		options.StateFile = stateFile
		manager := NewIncrementalManager(options)

		err = manager.LoadState()
		if err != nil {
			t.Errorf("LoadState should not fail with invalid JSON, got: %v", err)
		}

		// Should have reset to fresh state
		if len(manager.state.ProcessedIssues) != 0 {
			t.Error("ProcessedIssues should be empty after JSON parse failure")
		}
		if manager.state.Version != "1.0" {
			t.Errorf("Expected version '1.0' after reset, got '%s'", manager.state.Version)
		}
	})

	t.Run("permission error reading state file", func(t *testing.T) {
		stateFile := filepath.Join(tempDir, "permission_error.json")

		// Create file with no read permissions
		err := os.WriteFile(stateFile, []byte("{}"), 0000)
		if err != nil {
			t.Fatalf("Failed to write state file: %v", err)
		}

		options := createTestIncrementalOptions()
		options.StateFile = stateFile
		manager := NewIncrementalManager(options)

		err = manager.LoadState()
		if err == nil {
			t.Error("LoadState should fail when file cannot be read due to permissions")
		}
	})
}

func TestSaveState(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "incremental_test_*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	t.Run("successful save", func(t *testing.T) {
		stateFile := filepath.Join(tempDir, "save_test.json")
		options := createTestIncrementalOptions()
		options.StateFile = stateFile
		manager := NewIncrementalManager(options)

		// Add some test data
		manager.state.LastUpdateSHA = "save123"
		manager.state.ProcessedIssues[1] = time.Now()

		err := manager.SaveState()
		if err != nil {
			t.Errorf("SaveState failed: %v", err)
		}

		// Verify file was created
		if _, err := os.Stat(stateFile); os.IsNotExist(err) {
			t.Error("State file was not created")
		}

		// Verify content
		data, err := os.ReadFile(stateFile)
		if err != nil {
			t.Fatalf("Failed to read saved state file: %v", err)
		}

		var loadedState IncrementalState
		err = json.Unmarshal(data, &loadedState)
		if err != nil {
			t.Fatalf("Failed to parse saved state: %v", err)
		}

		if loadedState.LastUpdateSHA != "save123" {
			t.Errorf("Expected LastUpdateSHA 'save123', got '%s'", loadedState.LastUpdateSHA)
		}
	})

	t.Run("dry run mode", func(t *testing.T) {
		stateFile := filepath.Join(tempDir, "dry_run_test.json")
		options := createTestIncrementalOptions()
		options.StateFile = stateFile
		options.DryRun = true
		manager := NewIncrementalManager(options)

		err := manager.SaveState()
		if err != nil {
			t.Errorf("SaveState failed in dry run: %v", err)
		}

		// File should not be created in dry run mode
		if _, err := os.Stat(stateFile); !os.IsNotExist(err) {
			t.Error("State file should not be created in dry run mode")
		}
	})

	t.Run("directory creation", func(t *testing.T) {
		nestedDir := filepath.Join(tempDir, "nested", "deep", "path")
		stateFile := filepath.Join(nestedDir, "state.json")
		options := createTestIncrementalOptions()
		options.StateFile = stateFile
		manager := NewIncrementalManager(options)

		err := manager.SaveState()
		if err != nil {
			t.Errorf("SaveState failed with nested directory: %v", err)
		}

		// Verify directory was created
		if _, err := os.Stat(nestedDir); os.IsNotExist(err) {
			t.Error("Nested directory was not created")
		}

		// Verify file was created
		if _, err := os.Stat(stateFile); os.IsNotExist(err) {
			t.Error("State file was not created in nested directory")
		}
	})

	t.Run("permission error", func(t *testing.T) {
		// Try to write to a read-only directory
		readOnlyDir := filepath.Join(tempDir, "readonly")
		err := os.MkdirAll(readOnlyDir, 0555) // Read and execute only
		if err != nil {
			t.Fatalf("Failed to create read-only directory: %v", err)
		}

		stateFile := filepath.Join(readOnlyDir, "state.json")
		options := createTestIncrementalOptions()
		options.StateFile = stateFile
		manager := NewIncrementalManager(options)

		err = manager.SaveState()
		if err == nil {
			t.Error("SaveState should fail when writing to read-only directory")
		}
	})
}

func TestShouldProcessIssue(t *testing.T) {
	now := time.Now()

	t.Run("force rebuild mode", func(t *testing.T) {
		options := createTestIncrementalOptions()
		options.ForceRebuild = true
		manager := NewIncrementalManager(options)

		issue := &models.Issue{
			Number:    1,
			UpdatedAt: now.Add(-48 * time.Hour), // Very old issue
		}

		if !manager.ShouldProcessIssue(issue) {
			t.Error("Should process all issues in force rebuild mode")
		}
	})

	t.Run("issue not previously processed", func(t *testing.T) {
		options := createTestIncrementalOptions()
		manager := NewIncrementalManager(options)

		issue := &models.Issue{
			Number:    1,
			UpdatedAt: now.Add(-1 * time.Hour), // Recent update
		}

		if !manager.ShouldProcessIssue(issue) {
			t.Error("Should process new issues")
		}
	})

	t.Run("issue updated after last processing", func(t *testing.T) {
		options := createTestIncrementalOptions()
		manager := NewIncrementalManager(options)

		// Mark issue as processed 2 hours ago
		manager.state.ProcessedIssues[1] = now.Add(-2 * time.Hour)

		issue := &models.Issue{
			Number:    1,
			UpdatedAt: now.Add(-1 * time.Hour), // Updated after processing
		}

		if !manager.ShouldProcessIssue(issue) {
			t.Error("Should reprocess issues updated after last processing")
		}
	})

	t.Run("issue processed recently and not updated", func(t *testing.T) {
		options := createTestIncrementalOptions()
		options.LookbackTime = 12 * time.Hour
		manager := NewIncrementalManager(options)

		// Mark issue as processed 1 hour ago
		manager.state.ProcessedIssues[1] = now.Add(-1 * time.Hour)

		issue := &models.Issue{
			Number:    1,
			UpdatedAt: now.Add(-2 * time.Hour), // Updated before processing
		}

		if manager.ShouldProcessIssue(issue) {
			t.Error("Should not reprocess recently processed issues that haven't been updated")
		}
	})

	t.Run("issue outside lookback time", func(t *testing.T) {
		options := createTestIncrementalOptions()
		options.LookbackTime = 12 * time.Hour
		manager := NewIncrementalManager(options)

		issue := &models.Issue{
			Number:    1,
			UpdatedAt: now.Add(-24 * time.Hour), // Outside lookback time
		}

		if manager.ShouldProcessIssue(issue) {
			t.Error("Should not process issues outside lookback time")
		}
	})

	t.Run("old processed issue within lookback", func(t *testing.T) {
		options := createTestIncrementalOptions()
		options.LookbackTime = 48 * time.Hour
		manager := NewIncrementalManager(options)

		// Mark issue as processed 36 hours ago (outside lookback)
		manager.state.ProcessedIssues[1] = now.Add(-36 * time.Hour)

		issue := &models.Issue{
			Number:    1,
			UpdatedAt: now.Add(-30 * time.Hour), // Within lookback time
		}

		if !manager.ShouldProcessIssue(issue) {
			t.Error("Should process old processed issues within lookback time")
		}
	})
}

func TestFilterIssuesForIncremental(t *testing.T) {
	now := time.Now()

	t.Run("force rebuild processes all issues", func(t *testing.T) {
		options := createTestIncrementalOptions()
		options.ForceRebuild = true
		manager := NewIncrementalManager(options)

		issues := createTestIssues(5)
		filtered := manager.FilterIssuesForIncremental(issues)

		if len(filtered) != len(issues) {
			t.Errorf("Expected all %d issues to be processed in force rebuild, got %d", len(issues), len(filtered))
		}
	})

	t.Run("max items limit", func(t *testing.T) {
		options := createTestIncrementalOptions()
		options.MaxItems = 3
		manager := NewIncrementalManager(options)

		issues := createTestIssues(5)
		// Make all issues recent so they would be processed
		for i := range issues {
			issues[i].UpdatedAt = now.Add(-1 * time.Hour)
		}

		filtered := manager.FilterIssuesForIncremental(issues)

		if len(filtered) != 3 {
			t.Errorf("Expected max 3 issues due to limit, got %d", len(filtered))
		}
	})

	t.Run("incremental filtering", func(t *testing.T) {
		options := createTestIncrementalOptions()
		options.LookbackTime = 12 * time.Hour
		manager := NewIncrementalManager(options)

		issues := []models.Issue{
			{Number: 1, UpdatedAt: now.Add(-1 * time.Hour)},  // Recent - should process
			{Number: 2, UpdatedAt: now.Add(-6 * time.Hour)},  // Within lookback - should process
			{Number: 3, UpdatedAt: now.Add(-24 * time.Hour)}, // Outside lookback - should not process
		}

		filtered := manager.FilterIssuesForIncremental(issues)

		if len(filtered) != 2 {
			t.Errorf("Expected 2 issues within lookback time, got %d", len(filtered))
		}

		expectedNumbers := map[int]bool{1: true, 2: true}
		for _, issue := range filtered {
			if !expectedNumbers[issue.Number] {
				t.Errorf("Unexpected issue number in filtered results: %d", issue.Number)
			}
		}
	})
}

func TestMarkIssueProcessed(t *testing.T) {
	options := createTestIncrementalOptions()
	manager := NewIncrementalManager(options)

	beforeTime := time.Now()
	manager.MarkIssueProcessed(123)
	afterTime := time.Now()

	processedTime, exists := manager.state.ProcessedIssues[123]
	if !exists {
		t.Error("Issue was not marked as processed")
	}

	if processedTime.Before(beforeTime) || processedTime.After(afterTime) {
		t.Error("Processed timestamp is not within expected range")
	}
}

func TestMarkEventProcessed(t *testing.T) {
	options := createTestIncrementalOptions()
	manager := NewIncrementalManager(options)

	metadata := map[string]interface{}{
		"test_key": "test_value",
		"number":   42,
	}

	beforeTime := time.Now()
	manager.MarkEventProcessed("issue", "event123", metadata)
	afterTime := time.Now()

	if len(manager.state.ProcessedEvents) != 1 {
		t.Errorf("Expected 1 processed event, got %d", len(manager.state.ProcessedEvents))
	}

	event := manager.state.ProcessedEvents[0]
	if event.Type != "issue" {
		t.Errorf("Expected event type 'issue', got '%s'", event.Type)
	}
	if event.ID != "event123" {
		t.Errorf("Expected event ID 'event123', got '%s'", event.ID)
	}
	if event.Timestamp.Before(beforeTime) || event.Timestamp.After(afterTime) {
		t.Error("Event timestamp is not within expected range")
	}

	// Check metadata
	if testValue, ok := event.Metadata["test_key"]; !ok || testValue != "test_value" {
		t.Error("Event metadata not properly stored")
	}
}

func TestMarkEventProcessed_LimitEvents(t *testing.T) {
	options := createTestIncrementalOptions()
	manager := NewIncrementalManager(options)

	// Add more than 1000 events
	for i := 0; i < 1010; i++ {
		manager.MarkEventProcessed("test", fmt.Sprintf("event%d", i), nil)
	}

	if len(manager.state.ProcessedEvents) != 1000 {
		t.Errorf("Expected exactly 1000 events after limit, got %d", len(manager.state.ProcessedEvents))
	}

	// Check that the latest events are kept
	lastEvent := manager.state.ProcessedEvents[len(manager.state.ProcessedEvents)-1]
	if lastEvent.ID != "event1009" {
		t.Errorf("Expected last event to be 'event1009', got '%s'", lastEvent.ID)
	}
}

func TestUpdateLastUpdate(t *testing.T) {
	options := createTestIncrementalOptions()
	manager := NewIncrementalManager(options)

	beforeTime := time.Now()
	manager.UpdateLastUpdate("sha123")
	afterTime := time.Now()

	if manager.state.LastUpdateSHA != "sha123" {
		t.Errorf("Expected LastUpdateSHA 'sha123', got '%s'", manager.state.LastUpdateSHA)
	}

	if manager.state.LastUpdate.Before(beforeTime) || manager.state.LastUpdate.After(afterTime) {
		t.Error("LastUpdate timestamp is not within expected range")
	}
}

func TestGetUpdateSummary(t *testing.T) {
	options := createTestIncrementalOptions()
	manager := NewIncrementalManager(options)

	now := time.Now()

	// Add test data
	manager.state.LastUpdate = now.Add(-30 * time.Minute)
	manager.state.LastUpdateSHA = "summary123"

	// Add processed issues (some recent, some old)
	manager.state.ProcessedIssues[1] = now.Add(-30 * time.Minute) // Recent
	manager.state.ProcessedIssues[2] = now.Add(-2 * time.Hour)    // Old
	manager.state.ProcessedIssues[3] = now.Add(-10 * time.Minute) // Recent

	// Add processed events (some recent, some old)
	manager.state.ProcessedEvents = []ProcessedEvent{
		{ID: "event1", Timestamp: now.Add(-30 * time.Minute)}, // Recent
		{ID: "event2", Timestamp: now.Add(-2 * time.Hour)},    // Old
	}

	summary := manager.GetUpdateSummary()

	// Check required fields
	if summary["last_update_sha"] != "summary123" {
		t.Errorf("Expected last_update_sha 'summary123', got %v", summary["last_update_sha"])
	}
	if summary["total_processed_issues"] != 3 {
		t.Errorf("Expected total_processed_issues 3, got %v", summary["total_processed_issues"])
	}
	if summary["recently_processed_issues"] != 2 {
		t.Errorf("Expected recently_processed_issues 2, got %v", summary["recently_processed_issues"])
	}
	if summary["recent_events"] != 1 {
		t.Errorf("Expected recent_events 1, got %v", summary["recent_events"])
	}
	if summary["is_incremental"] != true {
		t.Errorf("Expected is_incremental true, got %v", summary["is_incremental"])
	}
	if summary["max_items"] != 100 {
		t.Errorf("Expected max_items 100, got %v", summary["max_items"])
	}
	if summary["lookback_hours"] != 24 {
		t.Errorf("Expected lookback_hours 24, got %v", summary["lookback_hours"])
	}
}

func TestShouldTriggerRebuild(t *testing.T) {
	now := time.Now()

	t.Run("force rebuild", func(t *testing.T) {
		options := createTestIncrementalOptions()
		options.ForceRebuild = true
		manager := NewIncrementalManager(options)

		ctx := createTestGitHubContext()
		ctx.Event = "push"

		if !manager.ShouldTriggerRebuild(ctx) {
			t.Error("Should trigger rebuild when force rebuild is enabled")
		}
	})

	t.Run("scheduled event", func(t *testing.T) {
		options := createTestIncrementalOptions()
		manager := NewIncrementalManager(options)

		ctx := createTestGitHubContext()
		ctx.Event = "schedule"

		if !manager.ShouldTriggerRebuild(ctx) {
			t.Error("Should trigger rebuild for scheduled events")
		}
	})

	t.Run("last update too old", func(t *testing.T) {
		options := createTestIncrementalOptions()
		manager := NewIncrementalManager(options)

		manager.state.LastUpdate = now.Add(-8 * 24 * time.Hour) // 8 days ago
		ctx := createTestGitHubContext()

		if !manager.ShouldTriggerRebuild(ctx) {
			t.Error("Should trigger rebuild when last update is more than a week old")
		}
	})

	t.Run("too many processed issues", func(t *testing.T) {
		options := createTestIncrementalOptions()
		manager := NewIncrementalManager(options)

		// Add more than 10000 processed issues
		for i := 0; i < 10001; i++ {
			manager.state.ProcessedIssues[i] = now
		}

		ctx := createTestGitHubContext()

		if !manager.ShouldTriggerRebuild(ctx) {
			t.Error("Should trigger rebuild when there are too many processed issues")
		}
	})

	t.Run("normal conditions", func(t *testing.T) {
		options := createTestIncrementalOptions()
		manager := NewIncrementalManager(options)

		manager.state.LastUpdate = now.Add(-1 * time.Hour) // Recent update
		ctx := createTestGitHubContext()
		ctx.Event = "push"

		if manager.ShouldTriggerRebuild(ctx) {
			t.Error("Should not trigger rebuild under normal conditions")
		}
	})
}

func TestCleanupOldState(t *testing.T) {
	now := time.Now()
	cutoff := now.Add(-30 * 24 * time.Hour) // 30 days ago

	options := createTestIncrementalOptions()
	manager := NewIncrementalManager(options)

	// Add old and new processed issues
	manager.state.ProcessedIssues[1] = cutoff.Add(-1 * time.Hour) // Old - should be removed
	manager.state.ProcessedIssues[2] = cutoff.Add(1 * time.Hour)  // New - should be kept
	manager.state.ProcessedIssues[3] = now.Add(-1 * time.Hour)    // Recent - should be kept

	// Add old and new events
	manager.state.ProcessedEvents = []ProcessedEvent{
		{ID: "old1", Timestamp: cutoff.Add(-1 * time.Hour)}, // Old - should be removed
		{ID: "new1", Timestamp: cutoff.Add(1 * time.Hour)},  // New - should be kept
		{ID: "new2", Timestamp: now.Add(-1 * time.Hour)},    // Recent - should be kept
	}

	manager.CleanupOldState()

	// Check processed issues
	if len(manager.state.ProcessedIssues) != 2 {
		t.Errorf("Expected 2 processed issues after cleanup, got %d", len(manager.state.ProcessedIssues))
	}
	if _, exists := manager.state.ProcessedIssues[1]; exists {
		t.Error("Old processed issue should have been removed")
	}
	if _, exists := manager.state.ProcessedIssues[2]; !exists {
		t.Error("New processed issue should have been kept")
	}
	if _, exists := manager.state.ProcessedIssues[3]; !exists {
		t.Error("Recent processed issue should have been kept")
	}

	// Check processed events
	if len(manager.state.ProcessedEvents) != 2 {
		t.Errorf("Expected 2 processed events after cleanup, got %d", len(manager.state.ProcessedEvents))
	}

	eventIDs := make(map[string]bool)
	for _, event := range manager.state.ProcessedEvents {
		eventIDs[event.ID] = true
	}

	if eventIDs["old1"] {
		t.Error("Old event should have been removed")
	}
	if !eventIDs["new1"] {
		t.Error("New event should have been kept")
	}
	if !eventIDs["new2"] {
		t.Error("Recent event should have been kept")
	}
}

func TestGetIncrementalQuery(t *testing.T) {
	now := time.Now()

	t.Run("force rebuild mode", func(t *testing.T) {
		options := createTestIncrementalOptions()
		options.ForceRebuild = true
		manager := NewIncrementalManager(options)

		baseQuery := &models.IssueQuery{
			Repository: "test/repo",
			PerPage:    50,
		}

		query := manager.GetIncrementalQuery(baseQuery)

		if query.Since != nil {
			t.Error("Should not set since parameter in force rebuild mode")
		}
		if query.PerPage != 50 {
			t.Errorf("Expected PerPage 50, got %d", query.PerPage)
		}
	})

	t.Run("incremental mode with last update", func(t *testing.T) {
		options := createTestIncrementalOptions()
		options.LookbackTime = 12 * time.Hour
		manager := NewIncrementalManager(options)

		manager.state.LastUpdate = now.Add(-6 * time.Hour)

		baseQuery := &models.IssueQuery{
			Repository: "test/repo",
			PerPage:    50,
		}

		query := manager.GetIncrementalQuery(baseQuery)

		if query.Since == nil {
			t.Error("Should set since parameter in incremental mode")
		} else {
			expectedSince := manager.state.LastUpdate.Add(-options.LookbackTime)
			if !query.Since.Equal(expectedSince) {
				t.Errorf("Expected since %v, got %v", expectedSince, *query.Since)
			}
		}
	})

	t.Run("no last update", func(t *testing.T) {
		options := createTestIncrementalOptions()
		manager := NewIncrementalManager(options)

		// LastUpdate is zero value

		baseQuery := &models.IssueQuery{
			Repository: "test/repo",
			PerPage:    50,
		}

		query := manager.GetIncrementalQuery(baseQuery)

		if query.Since != nil {
			t.Error("Should not set since parameter when no last update exists")
		}
	})

	t.Run("per page limit", func(t *testing.T) {
		options := createTestIncrementalOptions()
		options.MaxItems = 25
		manager := NewIncrementalManager(options)

		baseQuery := &models.IssueQuery{
			Repository: "test/repo",
			PerPage:    50, // Higher than max items
		}

		query := manager.GetIncrementalQuery(baseQuery)

		if query.PerPage != 25 {
			t.Errorf("Expected PerPage to be limited to 25, got %d", query.PerPage)
		}
	})

	t.Run("per page not limited", func(t *testing.T) {
		options := createTestIncrementalOptions()
		options.MaxItems = 100
		manager := NewIncrementalManager(options)

		baseQuery := &models.IssueQuery{
			Repository: "test/repo",
			PerPage:    50, // Lower than max items
		}

		query := manager.GetIncrementalQuery(baseQuery)

		if query.PerPage != 50 {
			t.Errorf("Expected PerPage to remain 50, got %d", query.PerPage)
		}
	})
}

func TestResetState(t *testing.T) {
	options := createTestIncrementalOptions()
	manager := NewIncrementalManager(options)

	// Add some data to state
	manager.state.LastUpdate = time.Now()
	manager.state.LastUpdateSHA = "test123"
	manager.state.ProcessedIssues[1] = time.Now()
	manager.state.ProcessedEvents = append(manager.state.ProcessedEvents, ProcessedEvent{
		Type: "test",
		ID:   "event1",
	})

	manager.ResetState()

	// Verify state was reset
	if !manager.state.LastUpdate.IsZero() {
		t.Error("LastUpdate should be zero after reset")
	}
	if manager.state.LastUpdateSHA != "" {
		t.Error("LastUpdateSHA should be empty after reset")
	}
	if len(manager.state.ProcessedIssues) != 0 {
		t.Error("ProcessedIssues should be empty after reset")
	}
	if len(manager.state.ProcessedEvents) != 0 {
		t.Error("ProcessedEvents should be empty after reset")
	}
	if manager.state.Version != "1.0" {
		t.Errorf("Expected version '1.0' after reset, got '%s'", manager.state.Version)
	}
}

func TestIncrementalStateJSONSerialization(t *testing.T) {
	now := time.Now()
	state := IncrementalState{
		LastUpdate:    now,
		LastUpdateSHA: "test123",
		ProcessedIssues: map[int]time.Time{
			1: now.Add(-1 * time.Hour),
			2: now.Add(-2 * time.Hour),
		},
		ProcessedEvents: []ProcessedEvent{
			{
				Type:      "issue",
				ID:        "event1",
				Timestamp: now.Add(-30 * time.Minute),
				Metadata:  map[string]interface{}{"key": "value"},
			},
		},
		Version: "1.0",
	}

	// Test marshaling
	data, err := json.Marshal(state)
	if err != nil {
		t.Fatalf("Failed to marshal state: %v", err)
	}

	// Test unmarshaling
	var unmarshaledState IncrementalState
	err = json.Unmarshal(data, &unmarshaledState)
	if err != nil {
		t.Fatalf("Failed to unmarshal state: %v", err)
	}

	// Verify data integrity
	if unmarshaledState.LastUpdateSHA != state.LastUpdateSHA {
		t.Errorf("LastUpdateSHA mismatch: expected '%s', got '%s'", state.LastUpdateSHA, unmarshaledState.LastUpdateSHA)
	}
	if len(unmarshaledState.ProcessedIssues) != len(state.ProcessedIssues) {
		t.Errorf("ProcessedIssues count mismatch: expected %d, got %d", len(state.ProcessedIssues), len(unmarshaledState.ProcessedIssues))
	}
	if len(unmarshaledState.ProcessedEvents) != len(state.ProcessedEvents) {
		t.Errorf("ProcessedEvents count mismatch: expected %d, got %d", len(state.ProcessedEvents), len(unmarshaledState.ProcessedEvents))
	}
}

func TestProcessedEvent(t *testing.T) {
	metadata := map[string]interface{}{
		"string_value": "test",
		"int_value":    42,
		"bool_value":   true,
		"nested": map[string]interface{}{
			"key": "value",
		},
	}

	event := ProcessedEvent{
		Type:      "push",
		ID:        "event123",
		Timestamp: time.Now(),
		Metadata:  metadata,
	}

	// Test JSON serialization
	data, err := json.Marshal(event)
	if err != nil {
		t.Fatalf("Failed to marshal ProcessedEvent: %v", err)
	}

	var unmarshaledEvent ProcessedEvent
	err = json.Unmarshal(data, &unmarshaledEvent)
	if err != nil {
		t.Fatalf("Failed to unmarshal ProcessedEvent: %v", err)
	}

	if unmarshaledEvent.Type != event.Type {
		t.Errorf("Type mismatch: expected '%s', got '%s'", event.Type, unmarshaledEvent.Type)
	}
	if unmarshaledEvent.ID != event.ID {
		t.Errorf("ID mismatch: expected '%s', got '%s'", event.ID, unmarshaledEvent.ID)
	}

	// Check metadata
	if strVal, ok := unmarshaledEvent.Metadata["string_value"].(string); !ok || strVal != "test" {
		t.Error("String metadata value not preserved")
	}
	if floatVal, ok := unmarshaledEvent.Metadata["int_value"].(float64); !ok || floatVal != 42 {
		t.Error("Int metadata value not preserved")
	}
	if boolVal, ok := unmarshaledEvent.Metadata["bool_value"].(bool); !ok || boolVal != true {
		t.Error("Bool metadata value not preserved")
	}
}

func TestIncrementalOptions(t *testing.T) {
	options := IncrementalOptions{
		StateFile:    "/custom/path.json",
		LookbackTime: 6 * time.Hour,
		ForceRebuild: true,
		DryRun:       true,
		MaxItems:     200,
	}

	// Test JSON serialization
	data, err := json.Marshal(options)
	if err != nil {
		t.Fatalf("Failed to marshal IncrementalOptions: %v", err)
	}

	var unmarshaledOptions IncrementalOptions
	err = json.Unmarshal(data, &unmarshaledOptions)
	if err != nil {
		t.Fatalf("Failed to unmarshal IncrementalOptions: %v", err)
	}

	if unmarshaledOptions.StateFile != options.StateFile {
		t.Errorf("StateFile mismatch: expected '%s', got '%s'", options.StateFile, unmarshaledOptions.StateFile)
	}
	if unmarshaledOptions.LookbackTime != options.LookbackTime {
		t.Errorf("LookbackTime mismatch: expected %v, got %v", options.LookbackTime, unmarshaledOptions.LookbackTime)
	}
	if unmarshaledOptions.ForceRebuild != options.ForceRebuild {
		t.Errorf("ForceRebuild mismatch: expected %v, got %v", options.ForceRebuild, unmarshaledOptions.ForceRebuild)
	}
	if unmarshaledOptions.DryRun != options.DryRun {
		t.Errorf("DryRun mismatch: expected %v, got %v", options.DryRun, unmarshaledOptions.DryRun)
	}
	if unmarshaledOptions.MaxItems != options.MaxItems {
		t.Errorf("MaxItems mismatch: expected %d, got %d", options.MaxItems, unmarshaledOptions.MaxItems)
	}
}

// Benchmark tests for performance analysis
func BenchmarkShouldProcessIssue(b *testing.B) {
	options := createTestIncrementalOptions()
	manager := NewIncrementalManager(options)

	// Add some processed issues
	for i := 0; i < 1000; i++ {
		manager.state.ProcessedIssues[i] = time.Now().Add(-time.Duration(i) * time.Minute)
	}

	issue := &models.Issue{
		Number:    500,
		UpdatedAt: time.Now().Add(-30 * time.Minute),
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = manager.ShouldProcessIssue(issue)
	}
}

func BenchmarkFilterIssuesForIncremental(b *testing.B) {
	options := createTestIncrementalOptions()
	manager := NewIncrementalManager(options)

	issues := createTestIssues(1000)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = manager.FilterIssuesForIncremental(issues)
	}
}

func BenchmarkMarkEventProcessed(b *testing.B) {
	options := createTestIncrementalOptions()
	manager := NewIncrementalManager(options)

	metadata := map[string]interface{}{
		"test": "value",
		"num":  42,
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		manager.MarkEventProcessed("test", fmt.Sprintf("event%d", i), metadata)
	}
}

func BenchmarkCleanupOldState(b *testing.B) {
	options := createTestIncrementalOptions()
	manager := NewIncrementalManager(options)

	// Add many processed issues and events
	now := time.Now()
	for i := 0; i < 5000; i++ {
		age := time.Duration(i) * time.Hour
		manager.state.ProcessedIssues[i] = now.Add(-age)
		manager.state.ProcessedEvents = append(manager.state.ProcessedEvents, ProcessedEvent{
			Type:      "test",
			ID:        fmt.Sprintf("event%d", i),
			Timestamp: now.Add(-age),
		})
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		manager.CleanupOldState()
	}
}

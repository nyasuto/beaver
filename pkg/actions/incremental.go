package actions

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/nyasuto/beaver/internal/models"
)

// IncrementalState represents the state of incremental updates
type IncrementalState struct {
	LastUpdate      time.Time         `json:"last_update"`
	LastUpdateSHA   string            `json:"last_update_sha"`
	ProcessedIssues map[int]time.Time `json:"processed_issues"`
	ProcessedEvents []ProcessedEvent  `json:"processed_events"`
	Version         string            `json:"version"`
}

// ProcessedEvent represents a processed GitHub event
type ProcessedEvent struct {
	Type      string                 `json:"type"`
	ID        string                 `json:"id"`
	Timestamp time.Time              `json:"timestamp"`
	Metadata  map[string]interface{} `json:"metadata"`
}

// IncrementalOptions configures incremental update behavior
type IncrementalOptions struct {
	StateFile    string        `json:"state_file"`
	LookbackTime time.Duration `json:"lookback_time"`
	ForceRebuild bool          `json:"force_rebuild"`
	DryRun       bool          `json:"dry_run"`
	MaxItems     int           `json:"max_items"`
}

// IncrementalManager handles incremental update state and logic
type IncrementalManager struct {
	options IncrementalOptions
	state   *IncrementalState
}

// NewIncrementalManager creates a new incremental manager
func NewIncrementalManager(options IncrementalOptions) *IncrementalManager {
	if options.StateFile == "" {
		options.StateFile = ".beaver/incremental-state.json"
	}
	if options.LookbackTime == 0 {
		options.LookbackTime = 24 * time.Hour // Default 24 hours lookback
	}
	if options.MaxItems == 0 {
		options.MaxItems = 100 // Default max items per update
	}

	return &IncrementalManager{
		options: options,
		state: &IncrementalState{
			ProcessedIssues: make(map[int]time.Time),
			ProcessedEvents: make([]ProcessedEvent, 0),
			Version:         "1.0",
		},
	}
}

// LoadState loads the incremental state from disk
func (im *IncrementalManager) LoadState() error {
	if _, err := os.Stat(im.options.StateFile); os.IsNotExist(err) {
		LogInfo("No incremental state file found, starting fresh")
		return nil
	}

	data, err := os.ReadFile(im.options.StateFile)
	if err != nil {
		return fmt.Errorf("failed to read state file: %w", err)
	}

	if err := json.Unmarshal(data, im.state); err != nil {
		LogWarning(fmt.Sprintf("Failed to parse state file, starting fresh: %v", err))
		im.state = &IncrementalState{
			ProcessedIssues: make(map[int]time.Time),
			ProcessedEvents: make([]ProcessedEvent, 0),
			Version:         "1.0",
		}
		return nil
	}

	LogInfo(fmt.Sprintf("Loaded incremental state: last update %s, %d processed issues",
		im.state.LastUpdate.Format("2006-01-02 15:04:05"), len(im.state.ProcessedIssues)))

	return nil
}

// SaveState saves the incremental state to disk
func (im *IncrementalManager) SaveState() error {
	if im.options.DryRun {
		LogInfo("Dry run mode: skipping state save")
		return nil
	}

	// Ensure directory exists
	if err := os.MkdirAll(filepath.Dir(im.options.StateFile), 0755); err != nil {
		return fmt.Errorf("failed to create state directory: %w", err)
	}

	data, err := json.MarshalIndent(im.state, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal state: %w", err)
	}

	if err := os.WriteFile(im.options.StateFile, data, 0600); err != nil {
		return fmt.Errorf("failed to write state file: %w", err)
	}

	LogInfo(fmt.Sprintf("Saved incremental state to %s", im.options.StateFile))
	return nil
}

// ShouldProcessIssue determines if an issue should be processed
func (im *IncrementalManager) ShouldProcessIssue(issue *models.Issue) bool {
	if im.options.ForceRebuild {
		return true
	}

	// Check if issue was already processed recently
	if lastProcessed, exists := im.state.ProcessedIssues[issue.Number]; exists {
		// If issue was updated after last processing, reprocess it
		if issue.UpdatedAt.After(lastProcessed) {
			LogInfo(fmt.Sprintf("Issue #%d was updated after last processing, will reprocess", issue.Number))
			return true
		}

		// If issue was processed recently and hasn't been updated, skip
		if time.Since(lastProcessed) < im.options.LookbackTime {
			return false
		}
	}

	// Check if issue was updated recently
	if time.Since(issue.UpdatedAt) > im.options.LookbackTime && !im.options.ForceRebuild {
		return false
	}

	return true
}

// FilterIssuesForIncremental filters issues based on incremental logic
func (im *IncrementalManager) FilterIssuesForIncremental(issues []models.Issue) []models.Issue {
	if im.options.ForceRebuild {
		LogInfo("Force rebuild requested, processing all issues")
		return issues
	}

	var filtered []models.Issue
	processed := 0

	for _, issue := range issues {
		if processed >= im.options.MaxItems {
			LogInfo(fmt.Sprintf("Reached max items limit (%d), stopping", im.options.MaxItems))
			break
		}

		if im.ShouldProcessIssue(&issue) {
			filtered = append(filtered, issue)
			processed++
		}
	}

	LogInfo(fmt.Sprintf("Filtered %d issues for incremental processing (from %d total)",
		len(filtered), len(issues)))

	return filtered
}

// MarkIssueProcessed marks an issue as processed
func (im *IncrementalManager) MarkIssueProcessed(issueNumber int) {
	im.state.ProcessedIssues[issueNumber] = time.Now()
}

// MarkEventProcessed marks an event as processed
func (im *IncrementalManager) MarkEventProcessed(eventType, eventID string, metadata map[string]interface{}) {
	event := ProcessedEvent{
		Type:      eventType,
		ID:        eventID,
		Timestamp: time.Now(),
		Metadata:  metadata,
	}

	im.state.ProcessedEvents = append(im.state.ProcessedEvents, event)

	// Keep only recent events (last 1000)
	if len(im.state.ProcessedEvents) > 1000 {
		im.state.ProcessedEvents = im.state.ProcessedEvents[len(im.state.ProcessedEvents)-1000:]
	}
}

// UpdateLastUpdate updates the last update timestamp and SHA
func (im *IncrementalManager) UpdateLastUpdate(sha string) {
	im.state.LastUpdate = time.Now()
	im.state.LastUpdateSHA = sha
}

// GetUpdateSummary returns a summary of what was updated
func (im *IncrementalManager) GetUpdateSummary() map[string]interface{} {
	recentlyProcessed := 0
	cutoff := time.Now().Add(-1 * time.Hour) // Last hour

	for _, timestamp := range im.state.ProcessedIssues {
		if timestamp.After(cutoff) {
			recentlyProcessed++
		}
	}

	recentEvents := 0
	for _, event := range im.state.ProcessedEvents {
		if event.Timestamp.After(cutoff) {
			recentEvents++
		}
	}

	return map[string]interface{}{
		"last_update":               im.state.LastUpdate.Format("2006-01-02 15:04:05"),
		"last_update_sha":           im.state.LastUpdateSHA,
		"total_processed_issues":    len(im.state.ProcessedIssues),
		"recently_processed_issues": recentlyProcessed,
		"recent_events":             recentEvents,
		"is_incremental":            !im.options.ForceRebuild,
		"max_items":                 im.options.MaxItems,
		"lookback_hours":            int(im.options.LookbackTime.Hours()),
	}
}

// ShouldTriggerRebuild determines if a full rebuild should be triggered
func (im *IncrementalManager) ShouldTriggerRebuild(ctx *GitHubContext) bool {
	if im.options.ForceRebuild {
		return true
	}

	// Trigger rebuild for scheduled events
	if ctx.Event == "schedule" {
		return true
	}

	// Trigger rebuild if last update was more than a week ago
	if time.Since(im.state.LastUpdate) > 7*24*time.Hour {
		LogInfo("Last update was more than a week ago, triggering full rebuild")
		return true
	}

	// Trigger rebuild if there are too many processed issues (might indicate state corruption)
	if len(im.state.ProcessedIssues) > 10000 {
		LogWarning("Too many processed issues in state, triggering clean rebuild")
		return true
	}

	return false
}

// CleanupOldState removes old entries from the state
func (im *IncrementalManager) CleanupOldState() {
	cutoff := time.Now().Add(-30 * 24 * time.Hour) // 30 days ago

	// Clean up old processed issues
	for issueNum, timestamp := range im.state.ProcessedIssues {
		if timestamp.Before(cutoff) {
			delete(im.state.ProcessedIssues, issueNum)
		}
	}

	// Clean up old events
	var recentEvents []ProcessedEvent
	for _, event := range im.state.ProcessedEvents {
		if event.Timestamp.After(cutoff) {
			recentEvents = append(recentEvents, event)
		}
	}
	im.state.ProcessedEvents = recentEvents

	LogInfo(fmt.Sprintf("Cleaned up old state entries, kept %d issues and %d events",
		len(im.state.ProcessedIssues), len(im.state.ProcessedEvents)))
}

// GetIncrementalQuery modifies a query for incremental updates
func (im *IncrementalManager) GetIncrementalQuery(baseQuery *models.IssueQuery) *models.IssueQuery {
	query := *baseQuery

	if !im.options.ForceRebuild && !im.state.LastUpdate.IsZero() {
		// Set since parameter to last update time minus lookback
		since := im.state.LastUpdate.Add(-im.options.LookbackTime)
		query.Since = &since
		LogInfo(fmt.Sprintf("Setting incremental query since: %s", since.Format("2006-01-02 15:04:05")))
	}

	// Limit the number of items for incremental updates
	if query.PerPage > im.options.MaxItems {
		query.PerPage = im.options.MaxItems
	}

	return &query
}

// ResetState resets the incremental state (forces full rebuild next time)
func (im *IncrementalManager) ResetState() {
	im.state = &IncrementalState{
		ProcessedIssues: make(map[int]time.Time),
		ProcessedEvents: make([]ProcessedEvent, 0),
		Version:         "1.0",
	}
	LogInfo("Reset incremental state")
}

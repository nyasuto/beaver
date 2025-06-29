package analytics

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/nyasuto/beaver/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewTimelineProcessor(t *testing.T) {
	processor := NewTimelineProcessor("owner/repo")

	assert.NotNil(t, processor)
	assert.Equal(t, "owner/repo", processor.repository)
}

func TestTimelineProcessor_ProcessIssuesTimeline(t *testing.T) {
	processor := NewTimelineProcessor("test/repo")
	ctx := context.Background()

	t.Run("process valid issues", func(t *testing.T) {
		issues := []models.Issue{
			{
				Number:    1,
				Title:     "Test Issue 1",
				Body:      "Description of test issue 1",
				State:     "open",
				CreatedAt: time.Date(2025, 1, 1, 12, 0, 0, 0, time.UTC),
				UpdatedAt: time.Date(2025, 1, 2, 12, 0, 0, 0, time.UTC),
				User: models.User{
					Login: "testuser",
				},
				Labels: []models.Label{
					{Name: "bug"},
					{Name: "priority:high"},
				},
			},
			{
				Number:    2,
				Title:     "Test Issue 2",
				Body:      "Description of test issue 2",
				State:     "closed",
				CreatedAt: time.Date(2025, 1, 3, 12, 0, 0, 0, time.UTC),
				UpdatedAt: time.Date(2025, 1, 4, 12, 0, 0, 0, time.UTC),
				ClosedAt:  &[]time.Time{time.Date(2025, 1, 4, 15, 0, 0, 0, time.UTC)}[0],
				User: models.User{
					Login: "developer",
				},
				Labels: []models.Label{
					{Name: "enhancement"},
				},
			},
		}

		timeline, err := processor.ProcessIssuesTimeline(ctx, issues)
		require.NoError(t, err)
		require.NotNil(t, timeline)

		// Should have events for issue creation and closure
		assert.GreaterOrEqual(t, len(timeline.Events), 3) // At least create, update, close events
		assert.Equal(t, "test/repo", timeline.Repository)

		// Check that events are properly sorted by timestamp
		for i := 1; i < len(timeline.Events); i++ {
			assert.True(t, timeline.Events[i-1].Timestamp.Before(timeline.Events[i].Timestamp) ||
				timeline.Events[i-1].Timestamp.Equal(timeline.Events[i].Timestamp))
		}
	})

	t.Run("empty issues list", func(t *testing.T) {
		timeline, err := processor.ProcessIssuesTimeline(ctx, []models.Issue{})
		require.NoError(t, err)
		require.NotNil(t, timeline)

		assert.Empty(t, timeline.Events)
		assert.Equal(t, "test/repo", timeline.Repository)
	})

	t.Run("issue with comments", func(t *testing.T) {
		issues := []models.Issue{
			{
				Number:    1,
				Title:     "Issue with comments",
				Body:      "Issue description",
				State:     "open",
				CreatedAt: time.Date(2025, 1, 1, 12, 0, 0, 0, time.UTC),
				UpdatedAt: time.Date(2025, 1, 2, 12, 0, 0, 0, time.UTC),
				User: models.User{
					Login: "author",
				},
				// Comments would be handled separately
			},
		}

		timeline, err := processor.ProcessIssuesTimeline(ctx, issues)
		require.NoError(t, err)

		// Should have at least creation event
		assert.GreaterOrEqual(t, len(timeline.Events), 1)

		// Find the creation event
		var creationEvent *TimelineEvent
		for _, event := range timeline.Events {
			if event.Type == EventTypeIssueCreated {
				creationEvent = &event
				break
			}
		}

		require.NotNil(t, creationEvent)
		assert.Equal(t, "Issue #1 Created", creationEvent.Title)
		assert.Equal(t, "Issue with comments", creationEvent.Description)
		assert.Equal(t, "author", creationEvent.Metadata["author"])
	})
}

func TestTimelineProcessor_AnalyzeTimelineTrends(t *testing.T) {
	processor := NewTimelineProcessor("test/repo")
	ctx := context.Background()

	t.Run("analyze trends with valid timeline", func(t *testing.T) {
		events := []TimelineEvent{
			{
				ID:          "issue-1-created",
				Type:        EventTypeIssueCreated,
				Timestamp:   time.Date(2025, 1, 1, 12, 0, 0, 0, time.UTC),
				Title:       "Issue #1 Created",
				Description: "Bug report",
				Metadata: map[string]interface{}{
					"author":       "developer1",
					"issue_number": 1,
					"labels":       []string{"bug", "priority:high"},
				},
			},
			{
				ID:          "issue-1-closed",
				Type:        EventTypeIssueClosed,
				Timestamp:   time.Date(2025, 1, 2, 12, 0, 0, 0, time.UTC),
				Title:       "Issue #1 Closed",
				Description: "Bug resolved",
				Metadata: map[string]interface{}{
					"author":       "developer2",
					"issue_number": 1,
				},
			},
			{
				ID:          "issue-2-created",
				Type:        EventTypeIssueCreated,
				Timestamp:   time.Date(2025, 1, 3, 12, 0, 0, 0, time.UTC),
				Title:       "Issue #2 Created",
				Description: "Enhancement request",
				Metadata: map[string]interface{}{
					"author":       "user1",
					"issue_number": 2,
					"labels":       []string{"enhancement"},
				},
			},
		}

		timeline := &Timeline{
			Events:     events,
			Repository: "test/repo",
			StartTime:  events[0].Timestamp,
			EndTime:    events[len(events)-1].Timestamp,
		}

		trends, err := processor.AnalyzeTimelineTrends(ctx, timeline)
		require.NoError(t, err)
		require.NotNil(t, trends)

		// Verify basic trend analysis
		assert.GreaterOrEqual(t, trends.TotalEvents, 3)
		assert.GreaterOrEqual(t, trends.AverageResolutionHours, 0.0) // Can be 0 if no closed issues
		assert.NotEmpty(t, trends.Patterns)
		assert.NotEmpty(t, trends.Insights)

		// Check event counts
		assert.Equal(t, 2, trends.EventCounts[EventTypeIssueCreated])
		assert.Equal(t, 1, trends.EventCounts[EventTypeIssueClosed])
	})

	t.Run("analyze empty timeline", func(t *testing.T) {
		timeline := &Timeline{
			Events:     []TimelineEvent{},
			Repository: "test/repo",
		}

		trends, err := processor.AnalyzeTimelineTrends(ctx, timeline)
		require.NoError(t, err)
		require.NotNil(t, trends)

		assert.Equal(t, 0, trends.TotalEvents)
		assert.Equal(t, 0.0, trends.AverageResolutionHours)
		assert.Empty(t, trends.EventCounts)
	})

	t.Run("analyze timeline with only open issues", func(t *testing.T) {
		events := []TimelineEvent{
			{
				ID:          "issue-1-created",
				Type:        EventTypeIssueCreated,
				Timestamp:   time.Now(),
				Title:       "Open Issue",
				Description: "Still open",
				Metadata: map[string]interface{}{
					"issue_number": 1,
					"author":       "user",
				},
			},
		}

		timeline := &Timeline{
			Events:     events,
			Repository: "test/repo",
			StartTime:  events[0].Timestamp,
			EndTime:    events[0].Timestamp,
		}

		trends, err := processor.AnalyzeTimelineTrends(ctx, timeline)
		require.NoError(t, err)

		assert.Equal(t, 1, trends.TotalEvents)
		assert.Equal(t, 0.0, trends.AverageResolutionHours)
		assert.Equal(t, 1, trends.EventCounts[EventTypeIssueCreated])
	})
}

func TestTimelineProcessor_IssueEventExtraction(t *testing.T) {
	processor := NewTimelineProcessor("test/repo")
	ctx := context.Background()

	t.Run("extract events from complete issue", func(t *testing.T) {
		issues := []models.Issue{
			{
				Number:    42,
				Title:     "Test Issue",
				Body:      "Issue description",
				State:     "closed",
				CreatedAt: time.Date(2025, 1, 1, 12, 0, 0, 0, time.UTC),
				UpdatedAt: time.Date(2025, 1, 3, 12, 0, 0, 0, time.UTC),
				ClosedAt:  &[]time.Time{time.Date(2025, 1, 2, 12, 0, 0, 0, time.UTC)}[0],
				User: models.User{
					Login: "testuser",
				},
				Labels: []models.Label{
					{Name: "bug"},
					{Name: "critical"},
				},
			},
		}

		timeline, err := processor.ProcessIssuesTimeline(ctx, issues)
		require.NoError(t, err)

		// Should have at least creation and closure events
		assert.GreaterOrEqual(t, len(timeline.Events), 2)

		// Find creation event
		var creationEvent *TimelineEvent
		for _, event := range timeline.Events {
			if event.Type == EventTypeIssueCreated {
				creationEvent = &event
				break
			}
		}

		require.NotNil(t, creationEvent)
		assert.Equal(t, "issue-42-created", creationEvent.ID)
		assert.Equal(t, "Issue #42 Created", creationEvent.Title)
		assert.Equal(t, "Test Issue", creationEvent.Description)
		assert.Equal(t, "testuser", creationEvent.Metadata["author"])
		assert.Equal(t, 42, creationEvent.Metadata["issue_number"])

		labels, ok := creationEvent.Metadata["labels"].([]string)
		require.True(t, ok)
		assert.Contains(t, labels, "bug")
		assert.Contains(t, labels, "critical")

		// Find closure event
		var closureEvent *TimelineEvent
		for _, event := range timeline.Events {
			if event.Type == EventTypeIssueClosed {
				closureEvent = &event
				break
			}
		}

		require.NotNil(t, closureEvent)
		assert.Equal(t, "issue-42-closed", closureEvent.ID)
		assert.Equal(t, "Issue #42 Closed", closureEvent.Title)
	})

	t.Run("extract events from open issue", func(t *testing.T) {
		issues := []models.Issue{
			{
				Number:    1,
				Title:     "Open Issue",
				Body:      "Still open",
				State:     "open",
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
				User: models.User{
					Login: "user",
				},
			},
		}

		timeline, err := processor.ProcessIssuesTimeline(ctx, issues)
		require.NoError(t, err)

		// Should have creation event but no closure
		assert.Equal(t, 1, len(timeline.Events))
		assert.Equal(t, EventTypeIssueCreated, timeline.Events[0].Type)
	})
}

func TestTimelineProcessor_PatternAnalysis(t *testing.T) {
	processor := NewTimelineProcessor("test/repo")
	ctx := context.Background()

	t.Run("analyze patterns in timeline with quick resolution", func(t *testing.T) {
		events := []TimelineEvent{
			{
				ID:        "issue-1-created",
				Type:      EventTypeIssueCreated,
				Timestamp: time.Date(2025, 1, 1, 12, 0, 0, 0, time.UTC),
				Metadata:  map[string]interface{}{"issue_number": 1},
			},
			{
				ID:        "issue-1-closed",
				Type:      EventTypeIssueClosed,
				Timestamp: time.Date(2025, 1, 1, 13, 0, 0, 0, time.UTC), // 1 hour later
				Metadata:  map[string]interface{}{"issue_number": 1, "resolution_time": 1.0},
			},
		}

		timeline := &Timeline{
			Events:     events,
			Repository: "test/repo",
			StartTime:  events[0].Timestamp,
			EndTime:    events[1].Timestamp,
		}

		trends, err := processor.AnalyzeTimelineTrends(ctx, timeline)
		require.NoError(t, err)

		// Should detect quick resolution
		assert.Equal(t, 1.0, trends.AverageResolutionHours)
		assert.NotEmpty(t, trends.Patterns)
	})

	t.Run("analyze timeline with multiple events", func(t *testing.T) {
		// Create multiple events
		events := make([]TimelineEvent, 6)
		baseTime := time.Date(2025, 1, 1, 12, 0, 0, 0, time.UTC)

		for i := 0; i < 3; i++ {
			events[i*2] = TimelineEvent{
				ID:        fmt.Sprintf("issue-%d-created", i+1),
				Type:      EventTypeIssueCreated,
				Timestamp: baseTime.Add(time.Duration(i) * time.Hour),
				Metadata:  map[string]interface{}{"issue_number": i + 1},
			}
			events[i*2+1] = TimelineEvent{
				ID:        fmt.Sprintf("issue-%d-closed", i+1),
				Type:      EventTypeIssueClosed,
				Timestamp: baseTime.Add(time.Duration(i)*time.Hour + 30*time.Minute),
				Metadata:  map[string]interface{}{"issue_number": i + 1, "resolution_time": 0.5},
			}
		}

		timeline := &Timeline{
			Events:     events,
			Repository: "test/repo",
			StartTime:  events[0].Timestamp,
			EndTime:    events[5].Timestamp,
		}

		trends, err := processor.AnalyzeTimelineTrends(ctx, timeline)
		require.NoError(t, err)

		assert.Equal(t, 6, trends.TotalEvents)
		assert.Equal(t, 3, trends.EventCounts[EventTypeIssueCreated])
		assert.Equal(t, 3, trends.EventCounts[EventTypeIssueClosed])
		assert.Equal(t, 0.5, trends.AverageResolutionHours)
	})
}

func TestTimeline_GetTimelineMetrics(t *testing.T) {
	events := []TimelineEvent{
		{
			Type:      EventTypeIssueCreated,
			Timestamp: time.Date(2025, 1, 1, 12, 0, 0, 0, time.UTC),
		},
		{
			Type:      EventTypeIssueClosed,
			Timestamp: time.Date(2025, 1, 2, 12, 0, 0, 0, time.UTC),
		},
		{
			Type:      EventTypeCommit,
			Timestamp: time.Date(2025, 1, 3, 12, 0, 0, 0, time.UTC),
		},
	}

	timeline := &Timeline{
		Events:     events,
		Repository: "test/repo",
		StartTime:  events[0].Timestamp,
		EndTime:    events[2].Timestamp,
	}

	metrics := timeline.GetTimelineMetrics()

	assert.Equal(t, 3, metrics.TotalEvents)
	assert.Equal(t, 1, metrics.EventCounts[EventTypeIssueCreated])
	assert.Equal(t, 1, metrics.EventCounts[EventTypeCommit])
	assert.Equal(t, 0, metrics.EventCounts[EventTypePRCreated])
	assert.Equal(t, 48*time.Hour, metrics.TimeSpan)
	assert.Greater(t, metrics.AverageFreq, 0.0)
}

func TestTimeline_GetTimelineMetrics_EmptyTimeline(t *testing.T) {
	timeline := &Timeline{
		Events:     []TimelineEvent{},
		Repository: "test/repo",
	}

	metrics := timeline.GetTimelineMetrics()

	assert.Equal(t, 0, metrics.TotalEvents)
	assert.Equal(t, 0, len(metrics.EventCounts))
	assert.Equal(t, time.Duration(0), metrics.TimeSpan)
	assert.Equal(t, 0.0, metrics.AverageFreq)
}

// Benchmark tests
func BenchmarkTimelineProcessor_ProcessIssuesTimeline(b *testing.B) {
	processor := NewTimelineProcessor("bench/repo")
	ctx := context.Background()

	// Create a large number of test issues
	issues := make([]models.Issue, 100)
	for i := 0; i < 100; i++ {
		issues[i] = models.Issue{
			Number:    i + 1,
			Title:     fmt.Sprintf("Issue %d", i+1),
			Body:      "Test issue description",
			State:     "open",
			CreatedAt: time.Now().Add(-time.Duration(i) * time.Hour),
			UpdatedAt: time.Now(),
			User: models.User{
				Login: "testuser",
			},
		}
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := processor.ProcessIssuesTimeline(ctx, issues)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkTimelineProcessor_AnalyzeTimelineTrends(b *testing.B) {
	processor := NewTimelineProcessor("bench/repo")
	ctx := context.Background()

	// Create timeline with many events
	events := make([]TimelineEvent, 1000)
	for i := 0; i < 1000; i++ {
		events[i] = TimelineEvent{
			ID:        fmt.Sprintf("event-%d", i),
			Type:      EventTypeIssueCreated,
			Timestamp: time.Now().Add(-time.Duration(i) * time.Minute),
			Title:     fmt.Sprintf("Event %d", i),
			Metadata:  map[string]interface{}{"issue_number": i + 1},
		}
	}

	timeline := &Timeline{
		Events:     events,
		Repository: "bench/repo",
		StartTime:  events[999].Timestamp,
		EndTime:    events[0].Timestamp,
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := processor.AnalyzeTimelineTrends(ctx, timeline)
		if err != nil {
			b.Fatal(err)
		}
	}
}

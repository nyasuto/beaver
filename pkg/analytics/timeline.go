package analytics

import (
	"context"
	"fmt"
	"sort"
	"time"

	"github.com/nyasuto/beaver/internal/models"
)

// TimelineEvent represents a single event in the development timeline
type TimelineEvent struct {
	ID          string         `json:"id"`
	Type        EventType      `json:"type"`
	Timestamp   time.Time      `json:"timestamp"`
	Title       string         `json:"title"`
	Description string         `json:"description"`
	Metadata    map[string]any `json:"metadata"`
	RelatedRefs []string       `json:"related_refs"` // Related issue/PR/commit IDs
}

// EventType represents the type of timeline event
type EventType string

const (
	EventTypeIssueCreated EventType = "issue_created"
	EventTypeIssueClosed  EventType = "issue_closed"
	EventTypeCommit       EventType = "commit"
	EventTypePRCreated    EventType = "pr_created"
	EventTypePRMerged     EventType = "pr_merged"
	EventTypeRelease      EventType = "release"
)

// Timeline represents a chronological sequence of development events
type Timeline struct {
	Events     []TimelineEvent `json:"events"`
	StartTime  time.Time       `json:"start_time"`
	EndTime    time.Time       `json:"end_time"`
	Repository string          `json:"repository"`
}

// TimelineProcessor processes development events into timeline structures
type TimelineProcessor struct {
	repository string
}

// NewTimelineProcessor creates a new timeline processor
func NewTimelineProcessor(repository string) *TimelineProcessor {
	return &TimelineProcessor{
		repository: repository,
	}
}

// ProcessIssuesTimeline creates a timeline from GitHub issues
func (tp *TimelineProcessor) ProcessIssuesTimeline(ctx context.Context, issues []models.Issue) (*Timeline, error) {
	var events []TimelineEvent

	for _, issue := range issues {
		// Issue creation event
		createdEvent := TimelineEvent{
			ID:          fmt.Sprintf("issue-%d-created", issue.Number),
			Type:        EventTypeIssueCreated,
			Timestamp:   issue.CreatedAt,
			Title:       fmt.Sprintf("Issue #%d Created", issue.Number),
			Description: issue.Title,
			Metadata: map[string]any{
				"issue_number": issue.Number,
				"author":       issue.User.Login,
				"labels":       extractLabelNames(issue.Labels),
				"state":        issue.State,
			},
		}
		events = append(events, createdEvent)

		// Issue closed event (if applicable)
		if issue.State == "closed" && issue.ClosedAt != nil {
			closedEvent := TimelineEvent{
				ID:          fmt.Sprintf("issue-%d-closed", issue.Number),
				Type:        EventTypeIssueClosed,
				Timestamp:   *issue.ClosedAt,
				Title:       fmt.Sprintf("Issue #%d Closed", issue.Number),
				Description: issue.Title,
				Metadata: map[string]any{
					"issue_number":    issue.Number,
					"author":          issue.User.Login,
					"resolution_time": issue.ClosedAt.Sub(issue.CreatedAt).Hours(),
				},
				RelatedRefs: []string{createdEvent.ID},
			}
			events = append(events, closedEvent)
		}
	}

	timeline := &Timeline{
		Events:     events,
		Repository: tp.repository,
	}

	// Sort events by timestamp
	sort.Slice(timeline.Events, func(i, j int) bool {
		return timeline.Events[i].Timestamp.Before(timeline.Events[j].Timestamp)
	})

	// Set timeline bounds
	if len(timeline.Events) > 0 {
		timeline.StartTime = timeline.Events[0].Timestamp
		timeline.EndTime = timeline.Events[len(timeline.Events)-1].Timestamp
	}

	return timeline, nil
}

// AnalyzeTimelineTrends analyzes patterns and trends in the timeline
func (tp *TimelineProcessor) AnalyzeTimelineTrends(ctx context.Context, timeline *Timeline) (*TimelineTrends, error) {
	trends := &TimelineTrends{
		Repository:  timeline.Repository,
		AnalyzedAt:  time.Now(),
		TotalEvents: len(timeline.Events),
		EventCounts: make(map[EventType]int),
		Patterns:    []TimelinePattern{},
		Insights:    []TimelineInsight{},
	}

	// Count events by type
	for _, event := range timeline.Events {
		trends.EventCounts[event.Type]++
	}

	// Analyze issue resolution patterns
	resolutionPatterns := tp.analyzeResolutionPatterns(timeline.Events)
	trends.Patterns = append(trends.Patterns, resolutionPatterns...)

	// Analyze activity trends
	activityInsights := tp.analyzeActivityTrends(timeline.Events)
	trends.Insights = append(trends.Insights, activityInsights...)

	// Calculate average resolution time
	trends.AverageResolutionHours = tp.calculateAverageResolutionTime(timeline.Events)

	return trends, nil
}

// TimelineTrends represents analysis results of timeline patterns
type TimelineTrends struct {
	Repository             string            `json:"repository"`
	AnalyzedAt             time.Time         `json:"analyzed_at"`
	TotalEvents            int               `json:"total_events"`
	EventCounts            map[EventType]int `json:"event_counts"`
	AverageResolutionHours float64           `json:"average_resolution_hours"`
	Patterns               []TimelinePattern `json:"patterns"`
	Insights               []TimelineInsight `json:"insights"`
}

// TimelinePattern represents a discovered pattern in the timeline
type TimelinePattern struct {
	Type        PatternType `json:"type"`
	Description string      `json:"description"`
	Confidence  float64     `json:"confidence"`
	Evidence    []string    `json:"evidence"`
	Frequency   int         `json:"frequency"`
}

// PatternType represents different types of patterns
type PatternType string

const (
	PatternTypeSuccessPath      PatternType = "success_path"
	PatternTypeLearningCycle    PatternType = "learning_cycle"
	PatternTypeBottleneck       PatternType = "bottleneck"
	PatternTypeProductivityPeak PatternType = "productivity_peak"
)

// TimelineInsight represents insights derived from timeline analysis
type TimelineInsight struct {
	Type        InsightType `json:"type"`
	Title       string      `json:"title"`
	Description string      `json:"description"`
	Importance  float64     `json:"importance"`
	Actionable  bool        `json:"actionable"`
	Suggestion  string      `json:"suggestion,omitempty"`
}

// InsightType represents different types of insights
type InsightType string

const (
	InsightTypeProductivity InsightType = "productivity"
	InsightTypeQuality      InsightType = "quality"
	InsightTypeLearning     InsightType = "learning"
	InsightTypeWorkflow     InsightType = "workflow"
)

// analyzeResolutionPatterns analyzes issue resolution patterns
func (tp *TimelineProcessor) analyzeResolutionPatterns(events []TimelineEvent) []TimelinePattern {
	var patterns []TimelinePattern

	// Group events by issue
	issueEvents := make(map[int][]TimelineEvent)
	for _, event := range events {
		if issueNum, exists := event.Metadata["issue_number"]; exists {
			if num, ok := issueNum.(int); ok {
				issueEvents[num] = append(issueEvents[num], event)
			}
		}
	}

	// Analyze quick resolution pattern
	quickResolutions := 0
	totalResolutions := 0

	for _, eventList := range issueEvents {
		if len(eventList) >= 2 {
			totalResolutions++
			// Sort by timestamp
			sort.Slice(eventList, func(i, j int) bool {
				return eventList[i].Timestamp.Before(eventList[j].Timestamp)
			})

			// Check if resolved within 24 hours
			created := eventList[0].Timestamp
			closed := eventList[len(eventList)-1].Timestamp
			if closed.Sub(created).Hours() <= 24 {
				quickResolutions++
			}
		}
	}

	if totalResolutions > 0 {
		quickResolutionRate := float64(quickResolutions) / float64(totalResolutions)
		if quickResolutionRate > 0.5 {
			patterns = append(patterns, TimelinePattern{
				Type:        PatternTypeSuccessPath,
				Description: "High rate of quick issue resolution (within 24 hours)",
				Confidence:  quickResolutionRate,
				Evidence:    []string{fmt.Sprintf("%d/%d issues resolved quickly", quickResolutions, totalResolutions)},
				Frequency:   quickResolutions,
			})
		}
	}

	return patterns
}

// analyzeActivityTrends analyzes activity trends and patterns
func (tp *TimelineProcessor) analyzeActivityTrends(events []TimelineEvent) []TimelineInsight {
	var insights []TimelineInsight

	if len(events) == 0 {
		return insights
	}

	// Analyze activity distribution by day of week
	activityByDay := make(map[time.Weekday]int)
	for _, event := range events {
		activityByDay[event.Timestamp.Weekday()]++
	}

	// Find most active day
	var mostActiveDay time.Weekday
	maxActivity := 0
	for day, count := range activityByDay {
		if count > maxActivity {
			maxActivity = count
			mostActiveDay = day
		}
	}

	insights = append(insights, TimelineInsight{
		Type:        InsightTypeProductivity,
		Title:       "Peak Activity Day",
		Description: fmt.Sprintf("Most development activity occurs on %s (%d events)", mostActiveDay.String(), maxActivity),
		Importance:  0.7,
		Actionable:  true,
		Suggestion:  "Consider scheduling important work and meetings around peak activity days",
	})

	// Analyze recent activity trend
	if len(events) > 10 {
		recentEvents := events[len(events)-10:]
		recentTimespan := recentEvents[len(recentEvents)-1].Timestamp.Sub(recentEvents[0].Timestamp)
		recentRate := float64(len(recentEvents)) / recentTimespan.Hours() * 24 // events per day

		totalTimespan := events[len(events)-1].Timestamp.Sub(events[0].Timestamp)
		overallRate := float64(len(events)) / totalTimespan.Hours() * 24 // events per day

		if recentRate > overallRate*1.2 {
			insights = append(insights, TimelineInsight{
				Type:        InsightTypeProductivity,
				Title:       "Increasing Activity Trend",
				Description: fmt.Sprintf("Recent activity rate (%.1f events/day) is %.1f%% higher than average", recentRate, (recentRate/overallRate-1)*100),
				Importance:  0.8,
				Actionable:  false,
			})
		}
	}

	return insights
}

// calculateAverageResolutionTime calculates average time to resolve issues
func (tp *TimelineProcessor) calculateAverageResolutionTime(events []TimelineEvent) float64 {
	var totalResolutionHours float64
	var resolutionCount int

	for _, event := range events {
		if event.Type == EventTypeIssueClosed {
			if resTime, exists := event.Metadata["resolution_time"]; exists {
				if hours, ok := resTime.(float64); ok {
					totalResolutionHours += hours
					resolutionCount++
				}
			}
		}
	}

	if resolutionCount > 0 {
		return totalResolutionHours / float64(resolutionCount)
	}
	return 0
}

// extractLabelNames extracts label names from Label objects
func extractLabelNames(labels []models.Label) []string {
	names := make([]string, len(labels))
	for i, label := range labels {
		names[i] = label.Name
	}
	return names
}

// GetTimelineMetrics provides summary metrics for the timeline
func (t *Timeline) GetTimelineMetrics() TimelineMetrics {
	metrics := TimelineMetrics{
		TotalEvents: len(t.Events),
		TimeSpan:    t.EndTime.Sub(t.StartTime),
		EventCounts: make(map[EventType]int),
		AverageFreq: 0,
	}

	// Count events by type
	for _, event := range t.Events {
		metrics.EventCounts[event.Type]++
	}

	// Calculate average frequency (events per day)
	if metrics.TimeSpan.Hours() > 0 {
		metrics.AverageFreq = float64(metrics.TotalEvents) / (metrics.TimeSpan.Hours() / 24)
	}

	return metrics
}

// TimelineMetrics provides summary statistics about a timeline
type TimelineMetrics struct {
	TotalEvents int               `json:"total_events"`
	TimeSpan    time.Duration     `json:"time_span"`
	EventCounts map[EventType]int `json:"event_counts"`
	AverageFreq float64           `json:"average_frequency"` // events per day
}

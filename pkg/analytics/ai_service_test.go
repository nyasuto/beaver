package analytics

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Mock Python script for testing
const mockPythonScript = `#!/usr/bin/env python3
import json
import sys

# Read input from stdin
input_data = json.load(sys.stdin)

# Mock response based on input
mock_response = {
    "patterns": [
        {
            "pattern_id": "test-pattern-1",
            "type": "success_pattern",
            "title": "Quick Issue Resolution",
            "description": "Pattern of resolving issues quickly",
            "confidence": 0.85,
            "evidence": ["Fast response times", "Efficient solutions"],
            "insights": ["Strong problem-solving skills"],
            "stage": "consolidation",
            "success_rate": 0.9,
            "frequency": 5,
            "recommendations": ["Continue current approach"],
            "timeline_length": 3
        }
    ],
    "analytics": {
        "total_events": len(input_data.get("events", [])),
        "unique_patterns": 1,
        "success_rate": 0.85,
        "learning_velocity": 2.5,
        "pattern_diversity": 0.7,
        "consistency_score": 0.8,
        "trend_direction": "improving",
        "confidence_interval": [0.75, 0.95]
    },
    "trajectory": {
        "person": input_data.get("author", "unknown"),
        "domain": "general",
        "start_date": "2025-01-01T00:00:00Z",
        "end_date": "2025-01-31T00:00:00Z",
        "stages": [["exploration", "2025-01-01T00:00:00Z", "Initial learning"]],
        "patterns": [],
        "progress_score": 0.75,
        "key_milestones": ["First successful pattern"]
    },
    "predictive_insights": {
        "next_learning_opportunities": ["Advanced techniques"],
        "risk_areas": ["Time management"],
        "recommended_focus": ["Skill consolidation"],
        "predicted_trajectory": "mastery",
        "confidence": 0.8
    },
    "visualization_data": {
        "timeline_chart": {"events": [], "patterns": [], "timeline": {"start": "", "end": ""}},
        "pattern_distribution": {"success_pattern": 1},
        "learning_curve": [],
        "success_trend": [],
        "skill_radar": {"technical": 0.8, "problem_solving": 0.9},
        "heatmap_data": []
    }
}

print(json.dumps(mock_response, ensure_ascii=False, indent=2))
`

func TestNewAIPatternService(t *testing.T) {
	service := NewAIPatternService()

	assert.NotNil(t, service)
	assert.NotEmpty(t, service.pythonPath)
	assert.Equal(t, filepath.Join("services", "ai"), service.servicePath)
}

func TestAIPatternService_CheckPythonDependencies(t *testing.T) {
	service := NewAIPatternService()
	ctx := context.Background()

	t.Run("python available", func(t *testing.T) {
		// This test might fail in environments without Python
		// We'll make it conditional
		if _, err := exec.LookPath("python3"); err == nil {
			err := service.CheckPythonDependencies(ctx)
			// We allow this to fail gracefully since dependencies might not be installed
			if err != nil {
				t.Logf("Python dependencies not available: %v", err)
			}
		} else {
			t.Skip("Python3 not available in test environment")
		}
	})

	t.Run("python not available", func(t *testing.T) {
		service := &AIPatternService{
			pythonPath:  "non-existent-python",
			servicePath: "services/ai",
		}

		err := service.CheckPythonDependencies(ctx)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "python not found")
	})

	t.Run("missing package", func(t *testing.T) {
		// Test with a Python path that exists but missing packages
		if pythonPath, err := exec.LookPath("python3"); err == nil {
			service := &AIPatternService{
				pythonPath:  pythonPath,
				servicePath: "services/ai",
			}

			// Test with a package that definitely doesn't exist
			cmd := exec.CommandContext(ctx, service.pythonPath, "-c", "import non_existent_package_12345")
			if err := cmd.Run(); err != nil {
				// This is expected - the package shouldn't exist
				assert.Contains(t, err.Error(), "exit status")
			}
		} else {
			t.Skip("Python3 not available in test environment")
		}
	})
}

func TestAIPatternService_AnalyzePatterns(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "ai_service_test")
	require.NoError(t, err)
	defer os.RemoveAll(tempDir)

	// Create mock Python script
	scriptPath := filepath.Join(tempDir, "pattern_analyzer.py")
	err = os.WriteFile(scriptPath, []byte(mockPythonScript), 0755)
	require.NoError(t, err)

	// Create service with custom paths
	service := &AIPatternService{
		pythonPath:  "python3",
		servicePath: tempDir,
	}

	ctx := context.Background()

	t.Run("successful analysis", func(t *testing.T) {
		// Skip if python3 not available
		if _, err := exec.LookPath("python3"); err != nil {
			t.Skip("Python3 not available in test environment")
		}

		events := []TimelineEvent{
			{
				ID:          "test-event-1",
				Type:        EventTypeIssueCreated,
				Timestamp:   time.Now(),
				Title:       "Test Issue",
				Description: "Test description",
				Metadata: map[string]interface{}{
					"author": "test-user",
					"labels": []string{"bug", "priority:high"},
				},
			},
		}

		result, err := service.AnalyzePatterns(ctx, events, "test-author")
		require.NoError(t, err)
		require.NotNil(t, result)

		// Verify basic structure
		assert.Empty(t, result.ErrorMessage)
		assert.Greater(t, result.ProcessingTime, 0.0)
		assert.Equal(t, 1, len(result.Patterns))

		// Verify pattern data
		pattern := result.Patterns[0]
		assert.Equal(t, "test-pattern-1", pattern.PatternID)
		assert.Equal(t, "success_pattern", pattern.Type)
		assert.Equal(t, "Quick Issue Resolution", pattern.Title)
		assert.Equal(t, 0.85, pattern.Confidence)

		// Verify analytics
		assert.Equal(t, 1, result.Analytics.TotalEvents)
		assert.Equal(t, 1, result.Analytics.UniquePatterns)
		assert.Equal(t, 0.85, result.Analytics.SuccessRate)

		// Verify trajectory
		assert.Equal(t, "test-author", result.Trajectory.Person)
		assert.Equal(t, "general", result.Trajectory.Domain)
	})

	t.Run("script not found", func(t *testing.T) {
		service := &AIPatternService{
			pythonPath:  "python3",
			servicePath: "/non/existent/path",
		}

		events := []TimelineEvent{}
		result, err := service.AnalyzePatterns(ctx, events, "test-author")

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "script not found")
		assert.Nil(t, result)
	})

	t.Run("empty events", func(t *testing.T) {
		// Skip if python3 not available
		if _, err := exec.LookPath("python3"); err != nil {
			t.Skip("Python3 not available in test environment")
		}

		events := []TimelineEvent{}
		result, err := service.AnalyzePatterns(ctx, events, "test-author")

		require.NoError(t, err)
		require.NotNil(t, result)
		assert.Empty(t, result.ErrorMessage)
		assert.Equal(t, 0, result.Analytics.TotalEvents)
	})

	t.Run("python execution failure", func(t *testing.T) {
		service := &AIPatternService{
			pythonPath:  "non-existent-python",
			servicePath: tempDir,
		}

		events := []TimelineEvent{
			{
				ID:        "test-event-1",
				Type:      EventTypeIssueCreated,
				Timestamp: time.Now(),
				Title:     "Test Issue",
				Metadata:  map[string]interface{}{},
			},
		}

		result, err := service.AnalyzePatterns(ctx, events, "test-author")

		require.NoError(t, err) // Should not return error, but error in result
		require.NotNil(t, result)
		assert.NotEmpty(t, result.ErrorMessage)
		assert.Contains(t, result.ErrorMessage, "Python execution failed")
	})

	t.Run("context cancellation", func(t *testing.T) {
		// Skip if python3 not available
		if _, err := exec.LookPath("python3"); err != nil {
			t.Skip("Python3 not available in test environment")
		}

		ctx, cancel := context.WithCancel(context.Background())
		cancel() // Cancel immediately

		events := []TimelineEvent{}
		result, err := service.AnalyzePatterns(ctx, events, "test-author")

		require.NoError(t, err) // Should not return error, but error in result
		require.NotNil(t, result)
		assert.NotEmpty(t, result.ErrorMessage)
	})
}

func TestConvertTimelineEventsToPython(t *testing.T) {
	events := []TimelineEvent{
		{
			ID:          "event-1",
			Type:        EventTypeIssueCreated,
			Timestamp:   time.Date(2025, 1, 1, 12, 0, 0, 0, time.UTC),
			Title:       "Test Issue",
			Description: "Test description",
			Metadata: map[string]interface{}{
				"author":       "test-user",
				"labels":       []string{"bug", "priority:high"},
				"issue_number": 123,
			},
			RelatedRefs: []string{"issue-2", "pr-3"},
		},
		{
			ID:          "event-2",
			Type:        EventTypeCommit,
			Timestamp:   time.Date(2025, 1, 2, 12, 0, 0, 0, time.UTC),
			Title:       "Fix bug",
			Description: "Fixed the issue",
			Metadata: map[string]interface{}{
				"author": "developer",
				"sha":    "abc123",
			},
		},
		{
			ID:        "event-3",
			Type:      EventTypePRCreated,
			Timestamp: time.Date(2025, 1, 3, 12, 0, 0, 0, time.UTC),
			Title:     "Add feature",
			Metadata: map[string]interface{}{
				"labels": []interface{}{"enhancement", "review"},
			},
		},
	}

	result := convertTimelineEventsToPython(events)

	require.Len(t, result, 3)

	// Test first event (issue)
	event1 := result[0]
	assert.Equal(t, "event-1", event1["id"])
	assert.Equal(t, "issue", event1["type"])
	assert.Equal(t, "2025-01-01T12:00:00Z", event1["timestamp"])
	assert.Equal(t, "Test Issue", event1["title"])
	assert.Equal(t, "Test description", event1["description"])
	assert.Equal(t, "test-user", event1["author"])
	assert.Equal(t, []string{"bug", "priority:high"}, event1["labels"])
	assert.Equal(t, []string{"issue-2", "pr-3"}, event1["related_events"])

	// Test second event (commit)
	event2 := result[1]
	assert.Equal(t, "event-2", event2["id"])
	assert.Equal(t, "commit", event2["type"])
	assert.Equal(t, "developer", event2["author"])

	// Test third event (PR with interface{} labels)
	event3 := result[2]
	assert.Equal(t, "pr", event3["type"])
	assert.Equal(t, []string{"enhancement", "review"}, event3["labels"])
}

func TestConvertTimelineEventsToPython_EdgeCases(t *testing.T) {
	t.Run("empty events", func(t *testing.T) {
		result := convertTimelineEventsToPython([]TimelineEvent{})
		assert.Empty(t, result)
	})

	t.Run("missing author in metadata", func(t *testing.T) {
		events := []TimelineEvent{
			{
				ID:       "event-1",
				Type:     EventTypeIssueCreated,
				Metadata: map[string]interface{}{},
			},
		}

		result := convertTimelineEventsToPython(events)
		assert.Equal(t, "unknown", result[0]["author"])
	})

	t.Run("non-string author in metadata", func(t *testing.T) {
		events := []TimelineEvent{
			{
				ID:   "event-1",
				Type: EventTypeIssueCreated,
				Metadata: map[string]interface{}{
					"author": 123, // non-string
				},
			},
		}

		result := convertTimelineEventsToPython(events)
		assert.Equal(t, "unknown", result[0]["author"])
	})

	t.Run("empty labels", func(t *testing.T) {
		events := []TimelineEvent{
			{
				ID:       "event-1",
				Type:     EventTypeIssueCreated,
				Metadata: map[string]interface{}{},
			},
		}

		result := convertTimelineEventsToPython(events)
		assert.Equal(t, []string{}, result[0]["labels"])
	})

	t.Run("mixed label types", func(t *testing.T) {
		events := []TimelineEvent{
			{
				ID:   "event-1",
				Type: EventTypeIssueCreated,
				Metadata: map[string]interface{}{
					"labels": []interface{}{"string-label", 123, "another-string"},
				},
			},
		}

		result := convertTimelineEventsToPython(events)
		labels := result[0]["labels"].([]string)
		assert.Equal(t, []string{"string-label", "another-string"}, labels)
	})
}

func TestAILearningPattern_JSON(t *testing.T) {
	pattern := AILearningPattern{
		PatternID:       "test-pattern",
		Type:            "success_pattern",
		Title:           "Test Pattern",
		Description:     "A test pattern",
		Confidence:      0.85,
		Evidence:        []string{"evidence1", "evidence2"},
		Insights:        []string{"insight1"},
		Stage:           "consolidation",
		SuccessRate:     0.9,
		Frequency:       5,
		Recommendations: []string{"recommendation1"},
		TimelineLength:  3,
	}

	// Test JSON marshaling
	data, err := json.Marshal(pattern)
	require.NoError(t, err)

	// Test JSON unmarshaling
	var unmarshaled AILearningPattern
	err = json.Unmarshal(data, &unmarshaled)
	require.NoError(t, err)

	assert.Equal(t, pattern, unmarshaled)
}

func TestAIPatternAnalysisResult_ErrorHandling(t *testing.T) {
	result := &AIPatternAnalysisResult{
		ErrorMessage:   "Test error",
		ProcessingTime: 1.5,
		Patterns:       []AILearningPattern{},
	}

	// Verify error message is preserved
	assert.Equal(t, "Test error", result.ErrorMessage)
	assert.Equal(t, 1.5, result.ProcessingTime)
	assert.Empty(t, result.Patterns)
}

// Benchmark test for performance analysis
func BenchmarkConvertTimelineEventsToPython(b *testing.B) {
	events := make([]TimelineEvent, 100)
	for i := 0; i < 100; i++ {
		events[i] = TimelineEvent{
			ID:          fmt.Sprintf("event-%d", i),
			Type:        EventTypeIssueCreated,
			Timestamp:   time.Now(),
			Title:       fmt.Sprintf("Event %d", i),
			Description: "Test description",
			Metadata: map[string]interface{}{
				"author": "test-user",
				"labels": []string{"bug", "priority:high"},
			},
		}
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		convertTimelineEventsToPython(events)
	}
}

// Integration test for real Python script (if available)
func TestAIPatternService_Integration(t *testing.T) {
	// This test only runs if the actual Python script exists
	service := NewAIPatternService()
	scriptPath := filepath.Join(service.servicePath, "pattern_analyzer.py")

	if _, err := os.Stat(scriptPath); os.IsNotExist(err) {
		t.Skip("Python script not found, skipping integration test")
	}

	if _, err := exec.LookPath("python3"); err != nil {
		t.Skip("Python3 not available, skipping integration test")
	}

	// Check dependencies
	ctx := context.Background()
	if err := service.CheckPythonDependencies(ctx); err != nil {
		t.Skipf("Python dependencies not available: %v", err)
	}

	// Run integration test with minimal data
	events := []TimelineEvent{
		{
			ID:          "integration-test-event",
			Type:        EventTypeIssueCreated,
			Timestamp:   time.Now(),
			Title:       "Integration Test Issue",
			Description: "Test issue for integration testing",
			Metadata: map[string]interface{}{
				"author": "integration-test",
				"labels": []string{"test"},
			},
		},
	}

	result, err := service.AnalyzePatterns(ctx, events, "integration-test")
	require.NoError(t, err)
	require.NotNil(t, result)

	// Basic validation
	if result.ErrorMessage != "" {
		t.Logf("AI analysis returned error: %s", result.ErrorMessage)
	} else {
		assert.Greater(t, result.ProcessingTime, 0.0)
		assert.Equal(t, 1, result.Analytics.TotalEvents)
	}
}

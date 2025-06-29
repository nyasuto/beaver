package analytics

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

// AIPatternService provides AI-enhanced pattern recognition
type AIPatternService struct {
	pythonPath  string
	servicePath string
}

// NewAIPatternService creates a new AI pattern service
func NewAIPatternService() *AIPatternService {
	// Find Python executable
	pythonPath := "python3"
	if path, err := exec.LookPath("python3"); err == nil {
		pythonPath = path
	} else if path, err := exec.LookPath("python"); err == nil {
		pythonPath = path
	}

	// Determine service path relative to project root
	servicePath := filepath.Join("services", "ai")

	return &AIPatternService{
		pythonPath:  pythonPath,
		servicePath: servicePath,
	}
}

// AILearningPattern represents a learning pattern from AI analysis
type AILearningPattern struct {
	PatternID       string   `json:"pattern_id"`
	Type            string   `json:"type"`
	Title           string   `json:"title"`
	Description     string   `json:"description"`
	Confidence      float64  `json:"confidence"`
	Evidence        []string `json:"evidence"`
	Insights        []string `json:"insights"`
	Stage           string   `json:"stage"`
	SuccessRate     float64  `json:"success_rate"`
	Frequency       int      `json:"frequency"`
	Recommendations []string `json:"recommendations"`
	TimelineLength  int      `json:"timeline_length"`
}

// AIAnalyticsMetrics represents analytics metrics from AI analysis
type AIAnalyticsMetrics struct {
	TotalEvents        int       `json:"total_events"`
	UniquePatterns     int       `json:"unique_patterns"`
	SuccessRate        float64   `json:"success_rate"`
	LearningVelocity   float64   `json:"learning_velocity"`
	PatternDiversity   float64   `json:"pattern_diversity"`
	ConsistencyScore   float64   `json:"consistency_score"`
	TrendDirection     string    `json:"trend_direction"`
	ConfidenceInterval []float64 `json:"confidence_interval"`
}

// AILearningTrajectory represents a learning trajectory from AI analysis
type AILearningTrajectory struct {
	Person        string              `json:"person"`
	Domain        string              `json:"domain"`
	StartDate     string              `json:"start_date"`
	EndDate       string              `json:"end_date"`
	Stages        [][]interface{}     `json:"stages"` // [stage, date, evidence]
	Patterns      []AILearningPattern `json:"patterns"`
	ProgressScore float64             `json:"progress_score"`
	KeyMilestones []string            `json:"key_milestones"`
}

// AIPredictiveInsights represents predictive insights from AI analysis
type AIPredictiveInsights struct {
	NextLearningOpportunities []string `json:"next_learning_opportunities"`
	RiskAreas                 []string `json:"risk_areas"`
	RecommendedFocus          []string `json:"recommended_focus"`
	PredictedTrajectory       string   `json:"predicted_trajectory"`
	Confidence                float64  `json:"confidence"`
}

// AIVisualizationData represents visualization data from AI analysis
type AIVisualizationData struct {
	TimelineChart       map[string]interface{}   `json:"timeline_chart"`
	PatternDistribution map[string]int           `json:"pattern_distribution"`
	LearningCurve       []map[string]interface{} `json:"learning_curve"`
	SuccessTrend        []map[string]interface{} `json:"success_trend"`
	SkillRadar          map[string]float64       `json:"skill_radar"`
	HeatmapData         [][]float64              `json:"heatmap_data"`
}

// AIPatternAnalysisResult represents the complete AI analysis result
type AIPatternAnalysisResult struct {
	Patterns           []AILearningPattern  `json:"patterns"`
	Analytics          AIAnalyticsMetrics   `json:"analytics"`
	Trajectory         AILearningTrajectory `json:"trajectory"`
	PredictiveInsights AIPredictiveInsights `json:"predictive_insights"`
	VisualizationData  AIVisualizationData  `json:"visualization_data"`
	ProcessingTime     float64              `json:"processing_time_seconds"`
	ErrorMessage       string               `json:"error_message,omitempty"`
}

// AnalyzePatterns performs AI-enhanced pattern recognition on timeline events
func (ais *AIPatternService) AnalyzePatterns(ctx context.Context, events []TimelineEvent, author string) (*AIPatternAnalysisResult, error) {
	startTime := time.Now()

	// Check if Python service exists
	scriptPath := filepath.Join(ais.servicePath, "pattern_analyzer.py")
	if _, err := os.Stat(scriptPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("AI pattern analysis script not found: %s", scriptPath)
	}

	// Convert timeline events to Python-compatible format
	pythonEvents := convertTimelineEventsToPython(events)

	// Prepare input data
	inputData := map[string]interface{}{
		"events":     pythonEvents,
		"author":     author,
		"repository": "beaver",
	}

	inputJSON, err := json.Marshal(inputData)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal input data: %w", err)
	}

	// Create Python command (use just the script name since we're setting the working directory)
	cmd := exec.CommandContext(ctx, ais.pythonPath, "pattern_analyzer.py")
	cmd.Stdin = bytes.NewReader(inputJSON)
	cmd.Dir = ais.servicePath

	// Set environment variables
	cmd.Env = append(os.Environ(),
		"PYTHONPATH="+ais.servicePath,
		"PYTHONUNBUFFERED=1",
	)

	// Execute Python script with separate stdout/stderr
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err = cmd.Run()
	if err != nil {
		return &AIPatternAnalysisResult{
			ErrorMessage:   fmt.Sprintf("Python execution failed: %v\nStderr: %s\nStdout: %s", err, stderr.String(), stdout.String()),
			ProcessingTime: time.Since(startTime).Seconds(),
		}, nil
	}

	// Parse output from stdout
	var result AIPatternAnalysisResult
	if err := json.Unmarshal(stdout.Bytes(), &result); err != nil {
		return &AIPatternAnalysisResult{
			ErrorMessage:   fmt.Sprintf("Failed to parse Python output: %v\nStdout: %s\nStderr: %s", err, stdout.String(), stderr.String()),
			ProcessingTime: time.Since(startTime).Seconds(),
		}, nil
	}

	result.ProcessingTime = time.Since(startTime).Seconds()
	return &result, nil
}

// convertTimelineEventsToPython converts Go TimelineEvent to Python-compatible format
func convertTimelineEventsToPython(events []TimelineEvent) []map[string]interface{} {
	pythonEvents := make([]map[string]interface{}, 0, len(events))

	for _, event := range events {
		// Extract author from metadata
		author := "unknown"
		if authorVal, ok := event.Metadata["author"]; ok {
			if authorStr, ok := authorVal.(string); ok {
				author = authorStr
			}
		}

		// Extract labels from metadata
		labels := []string{}
		if labelsVal, ok := event.Metadata["labels"]; ok {
			switch l := labelsVal.(type) {
			case []string:
				labels = l
			case []interface{}:
				for _, label := range l {
					if labelStr, ok := label.(string); ok {
						labels = append(labels, labelStr)
					}
				}
			}
		}

		// Convert event type to Python format
		var eventType string
		switch event.Type {
		case EventTypeCommit:
			eventType = "commit"
		case EventTypePRCreated, EventTypePRMerged:
			eventType = "pr"
		default:
			eventType = "issue"
		}

		pythonEvent := map[string]interface{}{
			"id":             event.ID,
			"type":           eventType,
			"timestamp":      event.Timestamp.Format(time.RFC3339),
			"title":          event.Title,
			"description":    event.Description,
			"author":         author,
			"metadata":       event.Metadata,
			"labels":         labels,
			"related_events": event.RelatedRefs,
		}

		pythonEvents = append(pythonEvents, pythonEvent)
	}

	return pythonEvents
}

// CheckPythonDependencies verifies that required Python dependencies are installed
func (ais *AIPatternService) CheckPythonDependencies(ctx context.Context) error {
	// Check if Python is available
	cmd := exec.CommandContext(ctx, ais.pythonPath, "--version")
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("python not found: %w", err)
	}

	// Check required packages
	requiredPackages := []string{
		"numpy",
		"scipy",
		"sklearn", // scikit-learn imports as sklearn
		"structlog",
	}

	for _, pkg := range requiredPackages {
		cmd := exec.CommandContext(ctx, ais.pythonPath, "-c", fmt.Sprintf("import %s", pkg))
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("required Python package '%s' not found: %w", pkg, err)
		}
	}

	return nil
}

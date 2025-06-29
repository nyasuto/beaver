package analytics

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/nyasuto/beaver/internal/models"
)

func TestNewProcessingLogsCalculator(t *testing.T) {
	tests := []struct {
		name        string
		issues      []models.Issue
		projectName string
		description string
	}{
		{
			name:        "create calculator with empty issues",
			issues:      []models.Issue{},
			projectName: "test-project",
			description: "Should create calculator with empty issue list",
		},
		{
			name:        "create calculator with sample issues",
			issues:      createProcessingTestIssues(3),
			projectName: "sample-project",
			description: "Should create calculator with multiple issues",
		},
		{
			name:        "create calculator with empty project name",
			issues:      createProcessingTestIssues(1),
			projectName: "",
			description: "Should handle empty project name",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calculator := NewProcessingLogsCalculator(tt.issues, tt.projectName)

			assert.NotNil(t, calculator, tt.description)
			assert.Equal(t, tt.issues, calculator.issues, "Issues should match")
			assert.Equal(t, tt.projectName, calculator.projectName, "Project name should match")
			assert.WithinDuration(t, time.Now(), calculator.generatedAt, time.Second, "Generated time should be recent")
		})
	}
}

func TestProcessingLogsCalculator_Calculate(t *testing.T) {
	tests := []struct {
		name               string
		issues             []models.Issue
		projectName        string
		expectedComponents bool
		description        string
	}{
		{
			name:               "calculate processing logs for empty issues",
			issues:             []models.Issue{},
			projectName:        "empty-project",
			expectedComponents: true,
			description:        "Should handle empty issue list correctly",
		},
		{
			name:               "calculate processing logs for multiple issues",
			issues:             createProcessingTestIssues(5),
			projectName:        "test-project",
			expectedComponents: true,
			description:        "Should generate complete processing data",
		},
		{
			name:               "calculate processing logs for large dataset",
			issues:             createProcessingTestIssues(150),
			projectName:        "large-project",
			expectedComponents: true,
			description:        "Should handle large datasets with optimized success rate",
		},
		{
			name:               "calculate processing logs for small dataset",
			issues:             createProcessingTestIssues(5),
			projectName:        "small-project",
			expectedComponents: true,
			description:        "Should handle small datasets appropriately",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calculator := NewProcessingLogsCalculator(tt.issues, tt.projectName)
			data := calculator.Calculate()

			require.NotNil(t, data, tt.description)
			assert.Equal(t, tt.projectName, data.ProjectName, "Project name should match")
			assert.WithinDuration(t, time.Now(), data.GeneratedAt, time.Second, "Generated time should be recent")

			if tt.expectedComponents {
				// Verify all main components are generated
				assert.NotNil(t, data.ProcessingStats, "Processing stats should be generated")
				assert.NotNil(t, data.SystemHealth, "System health should be generated")
				assert.NotNil(t, data.RecentActivity, "Recent activity should be generated")
				assert.NotNil(t, data.ProcessingTrends, "Processing trends should be generated")
				assert.NotNil(t, data.Errors, "Errors slice should be generated (may be empty)")
				assert.NotNil(t, data.ErrorPatterns, "Error patterns should be generated")
				assert.NotNil(t, data.ErrorResolution, "Error resolution should be generated")
				assert.NotNil(t, data.ExternalDependencies, "External dependencies should be generated")
				assert.NotNil(t, data.PerformanceMetrics, "Performance metrics should be generated")
				assert.NotNil(t, data.ResourceUsage, "Resource usage should be generated")
				assert.NotNil(t, data.DetailedLogs, "Detailed logs should be generated")
				assert.NotNil(t, data.DebugInfo, "Debug info should be generated")
				assert.NotNil(t, data.UsagePatterns, "Usage patterns should be generated")
				assert.NotNil(t, data.Optimizations, "Optimizations should be generated")
				assert.NotNil(t, data.PredictiveAnalysis, "Predictive analysis should be generated")
				assert.NotNil(t, data.Configuration, "Configuration should be generated")
				assert.NotNil(t, data.ConfigurationRecommendations, "Config recommendations should be generated")
				assert.NotNil(t, data.ActiveAlerts, "Active alerts should be generated")
				assert.NotNil(t, data.NotificationHistory, "Notification history should be generated")
				assert.NotNil(t, data.MaintenanceInfo, "Maintenance info should be generated")
				assert.NotNil(t, data.DataRetention, "Data retention should be generated")

				// Verify metadata fields
				assert.Equal(t, "Last 24 hours", data.ProcessingWindow, "Processing window should be set")
				assert.NotNil(t, data.NextUpdate, "Next update should be set")
				assert.Equal(t, "Real-time", data.DataFreshness, "Data freshness should be set")

				t.Logf("Processing data generated with %d issues processed, %.1f%% success rate",
					data.ProcessingStats.TotalProcessed, data.ProcessingStats.SuccessRate)
			}
		})
	}
}

func TestProcessingLogsCalculator_CalculateProcessingStats(t *testing.T) {
	tests := []struct {
		name            string
		issues          []models.Issue
		expectedSuccess float64
		description     string
	}{
		{
			name:            "small dataset processing stats",
			issues:          createProcessingTestIssues(5),
			expectedSuccess: 90.0,
			description:     "Should show 90% success rate for small datasets",
		},
		{
			name:            "medium dataset processing stats",
			issues:          createProcessingTestIssues(50),
			expectedSuccess: 95.0,
			description:     "Should show 95% success rate for medium datasets",
		},
		{
			name:            "large dataset processing stats",
			issues:          createProcessingTestIssues(150),
			expectedSuccess: 98.0,
			description:     "Should show 98% success rate for large datasets",
		},
		{
			name:            "empty dataset processing stats",
			issues:          []models.Issue{},
			expectedSuccess: 90.0,
			description:     "Should handle empty dataset gracefully",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calculator := NewProcessingLogsCalculator(tt.issues, "test-project")
			stats := calculator.calculateProcessingStats()

			assert.Equal(t, len(tt.issues), stats.TotalProcessed, "Total processed should match issues count")
			assert.Equal(t, tt.expectedSuccess, stats.SuccessRate, "Success rate should match expected")
			assert.Equal(t, 100.0-tt.expectedSuccess, stats.ErrorRate, "Error rate should be complement of success rate")
			assert.Equal(t, 2.5, stats.AvgProcessingTime, "Average processing time should be set")
			assert.Equal(t, 1.8, stats.ItemsPerSecond, "Items per second should be set")

			// Verify processing type stats
			require.Len(t, stats.ByType, 3, "Should have 3 processing types")

			// Find issues processing type
			var issuesType *ProcessingTypeStats
			for i := range stats.ByType {
				if stats.ByType[i].Type == "Issues" {
					issuesType = &stats.ByType[i]
					break
				}
			}
			require.NotNil(t, issuesType, "Should have Issues processing type")
			assert.Equal(t, len(tt.issues), issuesType.Count, "Issues count should match")
			assert.Equal(t, tt.expectedSuccess, issuesType.SuccessRate, "Issues success rate should match")
		})
	}
}

func TestProcessingLogsCalculator_AssessSystemHealth(t *testing.T) {
	tests := []struct {
		name        string
		issues      []models.Issue
		description string
	}{
		{
			name:        "assess system health with various loads",
			issues:      createProcessingTestIssues(10),
			description: "Should assess system health consistently",
		},
		{
			name:        "assess system health with empty data",
			issues:      []models.Issue{},
			description: "Should assess system health for empty data",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calculator := NewProcessingLogsCalculator(tt.issues, "test-project")
			health := calculator.assessSystemHealth()

			assert.Equal(t, "✅ Healthy", health.Overall, "Overall health should be healthy")
			assert.Equal(t, "99.9%", health.Uptime, "Uptime should be set")
			assert.Len(t, health.Components, 5, "Should have 5 system components")

			// Verify component health structure
			for _, component := range health.Components {
				assert.NotEmpty(t, component.Name, "Component name should be set")
				assert.Equal(t, "healthy", component.Status, "Component should be healthy")
				assert.WithinDuration(t, time.Now(), component.LastCheck, time.Second, "Last check should be recent")
			}

			// Verify specific components exist
			componentNames := make(map[string]bool)
			for _, component := range health.Components {
				componentNames[component.Name] = true
			}
			assert.True(t, componentNames["GitHub API"], "Should have GitHub API component")
			assert.True(t, componentNames["AI Processing"], "Should have AI Processing component")
			assert.True(t, componentNames["Template Engine"], "Should have Template Engine component")
			assert.True(t, componentNames["File System"], "Should have File System component")
			assert.True(t, componentNames["Memory Usage"], "Should have Memory Usage component")
		})
	}
}

func TestProcessingLogsCalculator_GenerateRecentActivity(t *testing.T) {
	tests := []struct {
		name        string
		issues      []models.Issue
		description string
	}{
		{
			name:        "generate recent activity",
			issues:      createProcessingTestIssues(5),
			description: "Should generate recent activity entries",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calculator := NewProcessingLogsCalculator(tt.issues, "test-project")
			activity := calculator.generateRecentActivity()

			assert.Len(t, activity, 3, "Should have 3 recent activities")

			// Verify activity structure
			for _, entry := range activity {
				assert.NotEmpty(t, entry.Operation, "Operation should be set")
				assert.NotEmpty(t, entry.Status, "Status should be set")
				assert.NotEmpty(t, entry.Description, "Description should be set")
				assert.Greater(t, entry.Duration, int64(0), "Duration should be positive")
				assert.True(t, entry.Timestamp.Before(time.Now()), "Timestamp should be in the past")
			}

			// Verify activities are ordered by time (most recent first)
			for i := 1; i < len(activity); i++ {
				assert.True(t, activity[i-1].Timestamp.After(activity[i].Timestamp),
					"Activities should be ordered by time (most recent first)")
			}
		})
	}
}

func TestProcessingLogsCalculator_CalculateProcessingTrends(t *testing.T) {
	tests := []struct {
		name        string
		issues      []models.Issue
		description string
	}{
		{
			name:        "calculate processing trends",
			issues:      createProcessingTestIssues(10),
			description: "Should calculate processing trends",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calculator := NewProcessingLogsCalculator(tt.issues, "test-project")
			trends := calculator.calculateProcessingTrends()

			assert.Len(t, trends, 3, "Should have 3 trend periods")

			// Verify trend structure
			expectedPeriods := []string{"This Hour", "Today", "This Week"}
			for i, trend := range trends {
				assert.Equal(t, expectedPeriods[i], trend.Period, "Period should match expected")
				assert.Greater(t, trend.Count, 0, "Count should be positive")
				assert.GreaterOrEqual(t, trend.SuccessRate, 0.0, "Success rate should be non-negative")
				assert.LessOrEqual(t, trend.SuccessRate, 100.0, "Success rate should not exceed 100%")
				assert.Greater(t, trend.AvgDuration, 0.0, "Average duration should be positive")
			}

			// Verify trends show realistic progression
			assert.True(t, trends[2].Count > trends[1].Count, "Week count should be greater than day count")
			assert.True(t, trends[1].Count > trends[0].Count, "Day count should be greater than hour count")
		})
	}
}

func TestProcessingLogsCalculator_ErrorAnalysis(t *testing.T) {
	tests := []struct {
		name        string
		issues      []models.Issue
		description string
	}{
		{
			name:        "analyze errors for healthy system",
			issues:      createProcessingTestIssues(10),
			description: "Should show no errors for healthy system",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calculator := NewProcessingLogsCalculator(tt.issues, "test-project")

			errors := calculator.generateErrorAnalysis()
			patterns := calculator.analyzeErrorPatterns()
			resolution := calculator.getErrorResolutionStatus()

			// For healthy system, errors should be empty
			assert.Len(t, errors, 0, "Should have no errors in healthy system")
			assert.Len(t, patterns, 0, "Should have no error patterns in healthy system")

			// Resolution status should show healthy state
			assert.Len(t, resolution, 4, "Should have 4 error resolution categories")
			for _, res := range resolution {
				assert.NotEmpty(t, res.Type, "Resolution type should be set")
				assert.Contains(t, res.Status, "✅", "Status should indicate no issues")
				assert.Equal(t, 0, res.Count, "Count should be 0 for healthy system")
			}
		})
	}
}

func TestProcessingLogsCalculator_CheckExternalDependencies(t *testing.T) {
	tests := []struct {
		name        string
		issues      []models.Issue
		description string
	}{
		{
			name:        "check external dependencies",
			issues:      createProcessingTestIssues(5),
			description: "Should check external service dependencies",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calculator := NewProcessingLogsCalculator(tt.issues, "test-project")
			dependencies := calculator.checkExternalDependencies()

			assert.Len(t, dependencies, 3, "Should have 3 external dependencies")

			// Verify dependency structure
			expectedServices := []string{"GitHub API", "OpenAI API", "Anthropic API"}
			serviceMap := make(map[string]bool)

			for _, dep := range dependencies {
				assert.NotEmpty(t, dep.Name, "Dependency name should be set")
				assert.Equal(t, "online", dep.Status, "Dependency should be online")
				assert.Greater(t, dep.ResponseTime, int64(0), "Response time should be positive")
				assert.WithinDuration(t, time.Now(), dep.LastCheck, time.Second, "Last check should be recent")
				serviceMap[dep.Name] = true
			}

			// Verify all expected services are present
			for _, service := range expectedServices {
				assert.True(t, serviceMap[service], "Should have %s dependency", service)
			}
		})
	}
}

func TestProcessingLogsCalculator_CalculatePerformanceMetrics(t *testing.T) {
	tests := []struct {
		name        string
		issues      []models.Issue
		description string
	}{
		{
			name:        "calculate performance metrics",
			issues:      createProcessingTestIssues(10),
			description: "Should calculate system performance metrics",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calculator := NewProcessingLogsCalculator(tt.issues, "test-project")
			metrics := calculator.calculatePerformanceMetrics()

			require.NotNil(t, metrics, "Performance metrics should not be nil")
			assert.Greater(t, metrics.TemplateRenderingTime, 0.0, "Template rendering time should be positive")
			assert.Greater(t, metrics.DataProcessingTime, 0.0, "Data processing time should be positive")
			assert.Greater(t, metrics.APICallTime, 0.0, "API call time should be positive")
			assert.Greater(t, metrics.FileOperationTime, 0.0, "File operation time should be positive")

			// Verify realistic values
			assert.Less(t, metrics.TemplateRenderingTime, 1000.0, "Template rendering should be under 1 second")
			assert.Less(t, metrics.DataProcessingTime, 1000.0, "Data processing should be under 1 second")
			assert.Less(t, metrics.FileOperationTime, 100.0, "File operations should be under 100ms")
		})
	}
}

func TestProcessingLogsCalculator_GetResourceUsage(t *testing.T) {
	tests := []struct {
		name        string
		issues      []models.Issue
		description string
	}{
		{
			name:        "get resource usage",
			issues:      createProcessingTestIssues(10),
			description: "Should get system resource usage",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calculator := NewProcessingLogsCalculator(tt.issues, "test-project")
			usage := calculator.getResourceUsage()

			require.NotNil(t, usage, "Resource usage should not be nil")
			assert.Greater(t, usage.MemoryMB, 0.0, "Memory usage should be positive")
			assert.GreaterOrEqual(t, usage.MemoryPercent, 0.0, "Memory percent should be non-negative")
			assert.LessOrEqual(t, usage.MemoryPercent, 100.0, "Memory percent should not exceed 100%")
			assert.GreaterOrEqual(t, usage.CPUPercent, 0.0, "CPU percent should be non-negative")
			assert.LessOrEqual(t, usage.CPUPercent, 100.0, "CPU percent should not exceed 100%")
			assert.GreaterOrEqual(t, usage.DiskUsageMB, 0.0, "Disk usage should be non-negative")
			assert.GreaterOrEqual(t, usage.NetworkKB, 0.0, "Network usage should be non-negative")

			t.Logf("Resource usage: Memory=%.1fMB (%.1f%%), CPU=%.1f%%, Disk=%.1fMB, Network=%.1fKB",
				usage.MemoryMB, usage.MemoryPercent, usage.CPUPercent, usage.DiskUsageMB, usage.NetworkKB)
		})
	}
}

func TestProcessingLogsCalculator_GenerateDetailedLogs(t *testing.T) {
	tests := []struct {
		name        string
		issues      []models.Issue
		description string
	}{
		{
			name:        "generate detailed logs",
			issues:      createProcessingTestIssues(5),
			description: "Should generate detailed log entries",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calculator := NewProcessingLogsCalculator(tt.issues, "test-project")
			logs := calculator.generateDetailedLogs()

			assert.Len(t, logs, 2, "Should have 2 detailed log entries")

			// Verify log structure
			for _, log := range logs {
				assert.NotEmpty(t, log.Level, "Log level should be set")
				assert.NotEmpty(t, log.Component, "Log component should be set")
				assert.NotEmpty(t, log.Message, "Log message should be set")
				assert.NotEmpty(t, log.Data, "Log data should be set")
				assert.Greater(t, log.Duration, int64(0), "Log duration should be positive")
				assert.True(t, log.Timestamp.Before(time.Now()), "Timestamp should be in the past")
			}

			// Verify logs are ordered by time (most recent first)
			for i := 1; i < len(logs); i++ {
				assert.True(t, logs[i-1].Timestamp.After(logs[i].Timestamp),
					"Logs should be ordered by time (most recent first)")
			}
		})
	}
}

func TestProcessingLogsCalculator_GetDebugInfo(t *testing.T) {
	tests := []struct {
		name        string
		issues      []models.Issue
		description string
	}{
		{
			name:        "get debug information",
			issues:      createProcessingTestIssues(5),
			description: "Should provide debug information",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calculator := NewProcessingLogsCalculator(tt.issues, "test-project")
			debugInfo := calculator.getDebugInfo()

			assert.Len(t, debugInfo, 4, "Should have 4 debug information categories")

			// Verify debug info structure
			expectedCategories := []string{"Version", "Runtime", "Configuration", "Monitoring"}
			categoryMap := make(map[string]bool)

			for _, info := range debugInfo {
				assert.NotEmpty(t, info.Category, "Debug category should be set")
				assert.NotEmpty(t, info.Information, "Debug information should be set")
				categoryMap[info.Category] = true
			}

			// Verify all expected categories are present
			for _, category := range expectedCategories {
				assert.True(t, categoryMap[category], "Should have %s debug category", category)
			}
		})
	}
}

func TestProcessingLogsCalculator_AnalyzeUsagePatterns(t *testing.T) {
	tests := []struct {
		name        string
		issues      []models.Issue
		description string
	}{
		{
			name:        "analyze usage patterns",
			issues:      createProcessingTestIssues(10),
			description: "Should analyze system usage patterns",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calculator := NewProcessingLogsCalculator(tt.issues, "test-project")
			patterns := calculator.analyzeUsagePatterns()

			assert.Len(t, patterns, 3, "Should have 3 usage patterns")

			// Verify pattern structure
			for _, pattern := range patterns {
				assert.NotEmpty(t, pattern.Pattern, "Pattern name should be set")
				assert.NotEmpty(t, pattern.Description, "Pattern description should be set")
				assert.GreaterOrEqual(t, pattern.Frequency, 0, "Pattern frequency should be non-negative")
				assert.LessOrEqual(t, pattern.Frequency, 100, "Pattern frequency should not exceed 100")
			}

			// Verify specific patterns exist
			patternNames := make(map[string]bool)
			for _, pattern := range patterns {
				patternNames[pattern.Pattern] = true
			}
			assert.True(t, patternNames["Peak Processing Hours"], "Should have Peak Processing Hours pattern")
			assert.True(t, patternNames["Batch Operations"], "Should have Batch Operations pattern")
			assert.True(t, patternNames["Real-time Updates"], "Should have Real-time Updates pattern")
		})
	}
}

func TestProcessingLogsCalculator_GenerateOptimizationRecommendations(t *testing.T) {
	tests := []struct {
		name        string
		issues      []models.Issue
		description string
	}{
		{
			name:        "generate optimization recommendations",
			issues:      createProcessingTestIssues(10),
			description: "Should generate system optimization recommendations",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calculator := NewProcessingLogsCalculator(tt.issues, "test-project")
			optimizations := calculator.generateOptimizationRecommendations()

			assert.Len(t, optimizations, 3, "Should have 3 optimization recommendations")

			// Verify optimization structure
			for _, opt := range optimizations {
				assert.NotEmpty(t, opt.Area, "Optimization area should be set")
				assert.NotEmpty(t, opt.Recommendation, "Optimization recommendation should be set")
				assert.NotEmpty(t, opt.EstimatedImprovement, "Estimated improvement should be set")
			}

			// Verify specific optimization areas exist
			areaNames := make(map[string]bool)
			for _, opt := range optimizations {
				areaNames[opt.Area] = true
			}
			assert.True(t, areaNames["Template Caching"], "Should have Template Caching optimization")
			assert.True(t, areaNames["Batch Processing"], "Should have Batch Processing optimization")
			assert.True(t, areaNames["API Efficiency"], "Should have API Efficiency optimization")
		})
	}
}

func TestProcessingLogsCalculator_GeneratePredictiveAnalysis(t *testing.T) {
	tests := []struct {
		name        string
		issues      []models.Issue
		description string
	}{
		{
			name:        "generate predictive analysis",
			issues:      createProcessingTestIssues(10),
			description: "Should generate predictive system analysis",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calculator := NewProcessingLogsCalculator(tt.issues, "test-project")
			prediction := calculator.generatePredictiveAnalysis()

			require.NotNil(t, prediction, "Predictive analysis should not be nil")
			assert.NotEmpty(t, prediction.NextHour, "Next hour prediction should be set")
			assert.NotEmpty(t, prediction.NextDay, "Next day prediction should be set")
			assert.NotEmpty(t, prediction.CapacityRecommendation, "Capacity recommendation should be set")

			t.Logf("Predictive analysis: NextHour='%s', NextDay='%s', Capacity='%s'",
				prediction.NextHour, prediction.NextDay, prediction.CapacityRecommendation)
		})
	}
}

func TestProcessingLogsCalculator_ConfigurationManagement(t *testing.T) {
	tests := []struct {
		name        string
		issues      []models.Issue
		description string
	}{
		{
			name:        "manage system configuration",
			issues:      createProcessingTestIssues(10),
			description: "Should manage system configuration",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calculator := NewProcessingLogsCalculator(tt.issues, "test-project")

			config := calculator.getCurrentConfiguration()
			recommendations := calculator.getConfigurationRecommendations()

			// Verify current configuration
			assert.Len(t, config, 4, "Should have 4 configuration items")
			for _, item := range config {
				assert.NotEmpty(t, item.Setting, "Configuration setting should be set")
				assert.NotEmpty(t, item.Value, "Configuration value should be set")
				assert.True(t, item.IsOptimal, "Configuration should be optimal")
			}

			// Verify configuration recommendations (should be empty for optimal config)
			assert.Len(t, recommendations, 0, "Should have no recommendations for optimal configuration")

			// Verify specific configuration settings exist
			settingNames := make(map[string]bool)
			for _, item := range config {
				settingNames[item.Setting] = true
			}
			assert.True(t, settingNames["Batch Size"], "Should have Batch Size setting")
			assert.True(t, settingNames["Timeout"], "Should have Timeout setting")
			assert.True(t, settingNames["Retry Attempts"], "Should have Retry Attempts setting")
			assert.True(t, settingNames["Rate Limiting"], "Should have Rate Limiting setting")
		})
	}
}

func TestProcessingLogsCalculator_AlertsAndNotifications(t *testing.T) {
	tests := []struct {
		name        string
		issues      []models.Issue
		description string
	}{
		{
			name:        "manage alerts and notifications",
			issues:      createProcessingTestIssues(10),
			description: "Should manage system alerts and notifications",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calculator := NewProcessingLogsCalculator(tt.issues, "test-project")

			alerts := calculator.getActiveAlerts()
			notifications := calculator.getNotificationHistory()

			// For healthy system, alerts and notifications should be empty
			assert.Len(t, alerts, 0, "Should have no active alerts in healthy system")
			assert.Len(t, notifications, 0, "Should have no recent notifications in healthy system")
		})
	}
}

func TestProcessingLogsCalculator_MaintenanceAndRetention(t *testing.T) {
	tests := []struct {
		name        string
		issues      []models.Issue
		description string
	}{
		{
			name:        "manage maintenance and data retention",
			issues:      createProcessingTestIssues(10),
			description: "Should manage maintenance and data retention policies",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calculator := NewProcessingLogsCalculator(tt.issues, "test-project")

			maintenance := calculator.getMaintenanceInfo()
			retention := calculator.getDataRetentionPolicy()

			// Verify maintenance information
			require.NotNil(t, maintenance, "Maintenance info should not be nil")
			assert.NotEmpty(t, maintenance.LogRotation, "Log rotation should be set")
			assert.NotEmpty(t, maintenance.CacheCleanup, "Cache cleanup should be set")
			assert.NotEmpty(t, maintenance.HealthChecks, "Health checks should be set")

			// Verify data retention policy
			require.NotNil(t, retention, "Data retention should not be nil")
			assert.NotEmpty(t, retention.Logs, "Logs retention should be set")
			assert.NotEmpty(t, retention.ProcessingHistory, "Processing history retention should be set")
			assert.NotEmpty(t, retention.ErrorLogs, "Error logs retention should be set")
			assert.NotEmpty(t, retention.PerformanceMetrics, "Performance metrics retention should be set")

			t.Logf("Maintenance: LogRotation='%s', CacheCleanup='%s'",
				maintenance.LogRotation, maintenance.CacheCleanup)
			t.Logf("Retention: Logs='%s', ErrorLogs='%s'",
				retention.Logs, retention.ErrorLogs)
		})
	}
}

func TestProcessingLogsCalculator_CountTotalLabels(t *testing.T) {
	tests := []struct {
		name           string
		issues         []models.Issue
		expectedLabels int
		description    string
	}{
		{
			name:           "count labels in empty issues",
			issues:         []models.Issue{},
			expectedLabels: 0,
			description:    "Should return 0 for empty issues",
		},
		{
			name:           "count unique labels",
			issues:         createProcessingTestIssuesWithLabels(),
			expectedLabels: 4, // bug, feature, documentation, enhancement
			description:    "Should count unique labels correctly",
		},
		{
			name:           "count labels with duplicates",
			issues:         createProcessingTestIssuesWithDuplicateLabels(),
			expectedLabels: 3, // bug, feature, enhancement (duplicates removed)
			description:    "Should count unique labels ignoring duplicates",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calculator := NewProcessingLogsCalculator(tt.issues, "test-project")
			labelCount := calculator.countTotalLabels()

			assert.Equal(t, tt.expectedLabels, labelCount, tt.description)
		})
	}
}

// Helper functions for creating test data

func createProcessingTestIssues(count int) []models.Issue {
	issues := make([]models.Issue, count)
	baseTime := time.Now().AddDate(0, -1, 0) // One month ago

	for i := 0; i < count; i++ {
		issues[i] = models.Issue{
			ID:        int64(i + 1),
			Number:    i + 1,
			Title:     "Processing Test Issue " + string(rune(i+65)), // A, B, C...
			Body:      "This is a test issue for processing analysis.",
			State:     "open",
			CreatedAt: baseTime.AddDate(0, 0, i),
			UpdatedAt: baseTime.AddDate(0, 0, i+1),
			User: models.User{
				ID:    int64(1),
				Login: "testuser",
			},
			Labels: []models.Label{
				{Name: "processing", Color: "blue"},
			},
		}
	}
	return issues
}

func createProcessingTestIssuesWithLabels() []models.Issue {
	return []models.Issue{
		{
			ID: 1, Number: 1, Title: "Bug Issue", State: "open", CreatedAt: time.Now(),
			User: models.User{Login: "user1"},
			Labels: []models.Label{
				{Name: "bug", Color: "red"},
			},
		},
		{
			ID: 2, Number: 2, Title: "Feature Request", State: "open", CreatedAt: time.Now(),
			User: models.User{Login: "user2"},
			Labels: []models.Label{
				{Name: "feature", Color: "green"},
				{Name: "enhancement", Color: "yellow"},
			},
		},
		{
			ID: 3, Number: 3, Title: "Documentation", State: "closed", CreatedAt: time.Now(),
			User: models.User{Login: "user3"},
			Labels: []models.Label{
				{Name: "documentation", Color: "blue"},
			},
		},
	}
}

func createProcessingTestIssuesWithDuplicateLabels() []models.Issue {
	return []models.Issue{
		{
			ID: 1, Title: "Issue 1", User: models.User{Login: "user1"}, CreatedAt: time.Now(),
			Labels: []models.Label{{Name: "bug"}, {Name: "feature"}},
		},
		{
			ID: 2, Title: "Issue 2", User: models.User{Login: "user2"}, CreatedAt: time.Now(),
			Labels: []models.Label{{Name: "bug"}, {Name: "enhancement"}}, // bug duplicated
		},
		{
			ID: 3, Title: "Issue 3", User: models.User{Login: "user3"}, CreatedAt: time.Now(),
			Labels: []models.Label{{Name: "feature"}, {Name: "enhancement"}}, // feature and enhancement duplicated
		},
	}
}

package wiki

import (
	"context"
	"log/slog"
	"runtime"
	"time"
)

// PerformanceMonitor handles performance monitoring and optimization
type PerformanceMonitor struct {
	enabled    bool
	threshold  int64 // Memory threshold in bytes
	gcInterval time.Duration
	stats      *PerformanceStats
}

// PerformanceStats tracks performance metrics
type PerformanceStats struct {
	StartTime          time.Time
	LastGCTime         time.Time
	GCCount            int
	PeakMemoryUsage    uint64
	CurrentMemoryUsage uint64
	TotalAllocations   uint64
	ProcessedPages     int
	ProcessingDuration time.Duration
	GitOperationTime   time.Duration
	FileOperationTime  time.Duration
}

// NewPerformanceMonitor creates a new performance monitor
func NewPerformanceMonitor(enabled bool) *PerformanceMonitor {
	return &PerformanceMonitor{
		enabled:    enabled,
		threshold:  100 * 1024 * 1024, // 100MB default threshold
		gcInterval: 30 * time.Second,  // Force GC every 30 seconds
		stats: &PerformanceStats{
			StartTime: time.Now(),
		},
	}
}

// Start begins performance monitoring
func (pm *PerformanceMonitor) Start(ctx context.Context) {
	if !pm.enabled {
		return
	}

	slog.Info("Performance monitoring started")
	pm.stats.StartTime = time.Now()

	// Start background memory monitoring
	go pm.backgroundMonitoring(ctx)
}

// backgroundMonitoring runs memory monitoring in background
func (pm *PerformanceMonitor) backgroundMonitoring(ctx context.Context) {
	ticker := time.NewTicker(pm.gcInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			pm.checkMemoryUsage()
		}
	}
}

// checkMemoryUsage monitors memory usage and triggers GC if needed
func (pm *PerformanceMonitor) checkMemoryUsage() {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	pm.stats.CurrentMemoryUsage = m.Alloc
	pm.stats.TotalAllocations = m.TotalAlloc

	// Update peak memory usage
	if m.Alloc > pm.stats.PeakMemoryUsage {
		pm.stats.PeakMemoryUsage = m.Alloc
	}

	// Check if we should force garbage collection
	if pm.threshold > 0 && m.Alloc > uint64(pm.threshold) { // #nosec G115 -- pm.threshold is always positive
		slog.Info("Memory usage exceeds threshold, triggering GC",
			"alloc_mb", m.Alloc/(1024*1024), "threshold_mb", pm.threshold/(1024*1024))
		pm.ForceGC()
	}

	if pm.enabled {
		slog.Debug("Memory stats",
			"alloc_kb", m.Alloc/1024, "sys_kb", m.Sys/1024, "num_gc", m.NumGC)
	}
}

// ForceGC forces garbage collection and updates stats
func (pm *PerformanceMonitor) ForceGC() {
	start := time.Now()
	runtime.GC()
	runtime.GC() // Double GC to ensure cleanup

	pm.stats.LastGCTime = time.Now()
	pm.stats.GCCount++

	duration := time.Since(start)
	slog.Info("Forced GC completed", "duration", duration)
}

// RecordPageProcessed increments the processed page counter
func (pm *PerformanceMonitor) RecordPageProcessed() {
	if !pm.enabled {
		return
	}
	pm.stats.ProcessedPages++
}

// RecordGitOperation records time spent on Git operations
func (pm *PerformanceMonitor) RecordGitOperation(duration time.Duration) {
	if !pm.enabled {
		return
	}
	pm.stats.GitOperationTime += duration
}

// RecordFileOperation records time spent on file operations
func (pm *PerformanceMonitor) RecordFileOperation(duration time.Duration) {
	if !pm.enabled {
		return
	}
	pm.stats.FileOperationTime += duration
}

// GetStats returns current performance statistics
func (pm *PerformanceMonitor) GetStats() *PerformanceStats {
	pm.stats.ProcessingDuration = time.Since(pm.stats.StartTime)
	return pm.stats
}

// LogSummary logs a performance summary
func (pm *PerformanceMonitor) LogSummary() {
	if !pm.enabled {
		return
	}

	stats := pm.GetStats()
	slog.Info("Performance Summary:")
	slog.Info("  Total Duration", "duration", stats.ProcessingDuration)
	slog.Info("  Pages Processed", "count", stats.ProcessedPages)
	slog.Info("  Peak Memory", "mb", stats.PeakMemoryUsage/(1024*1024))
	slog.Info("  Current Memory", "mb", stats.CurrentMemoryUsage/(1024*1024))
	slog.Info("  Total Allocations", "mb", stats.TotalAllocations/(1024*1024))
	slog.Info("  GC Cycles", "count", stats.GCCount)
	slog.Info("  Git Operations Time", "duration", stats.GitOperationTime)
	slog.Info("  File Operations Time", "duration", stats.FileOperationTime)

	if stats.ProcessedPages > 0 {
		avgTime := stats.ProcessingDuration / time.Duration(stats.ProcessedPages)
		slog.Info("  Average Time Per Page", "duration", avgTime)
	}
}

// SetMemoryThreshold sets the memory threshold for triggering GC
func (pm *PerformanceMonitor) SetMemoryThreshold(thresholdMB int64) {
	pm.threshold = thresholdMB * 1024 * 1024
	slog.Info("Memory threshold set", "mb", thresholdMB)
}

// SetGCInterval sets the garbage collection check interval
func (pm *PerformanceMonitor) SetGCInterval(interval time.Duration) {
	pm.gcInterval = interval
	slog.Info("GC interval set", "interval", interval)
}

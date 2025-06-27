package wiki

import (
	"context"
	"log"
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

	log.Printf("INFO Performance monitoring started")
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
		log.Printf("INFO Memory usage (%d MB) exceeds threshold (%d MB), triggering GC",
			m.Alloc/(1024*1024), pm.threshold/(1024*1024))
		pm.ForceGC()
	}

	if pm.enabled {
		log.Printf("DEBUG Memory stats: Alloc=%d KB, Sys=%d KB, NumGC=%d",
			m.Alloc/1024, m.Sys/1024, m.NumGC)
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
	log.Printf("INFO Forced GC completed in %v", duration)
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
	log.Printf("INFO Performance Summary:")
	log.Printf("  Total Duration: %v", stats.ProcessingDuration)
	log.Printf("  Pages Processed: %d", stats.ProcessedPages)
	log.Printf("  Peak Memory: %d MB", stats.PeakMemoryUsage/(1024*1024))
	log.Printf("  Current Memory: %d MB", stats.CurrentMemoryUsage/(1024*1024))
	log.Printf("  Total Allocations: %d MB", stats.TotalAllocations/(1024*1024))
	log.Printf("  GC Cycles: %d", stats.GCCount)
	log.Printf("  Git Operations Time: %v", stats.GitOperationTime)
	log.Printf("  File Operations Time: %v", stats.FileOperationTime)

	if stats.ProcessedPages > 0 {
		avgTime := stats.ProcessingDuration / time.Duration(stats.ProcessedPages)
		log.Printf("  Average Time Per Page: %v", avgTime)
	}
}

// SetMemoryThreshold sets the memory threshold for triggering GC
func (pm *PerformanceMonitor) SetMemoryThreshold(thresholdMB int64) {
	pm.threshold = thresholdMB * 1024 * 1024
	log.Printf("INFO Memory threshold set to %d MB", thresholdMB)
}

// SetGCInterval sets the garbage collection check interval
func (pm *PerformanceMonitor) SetGCInterval(interval time.Duration) {
	pm.gcInterval = interval
	log.Printf("INFO GC interval set to %v", interval)
}

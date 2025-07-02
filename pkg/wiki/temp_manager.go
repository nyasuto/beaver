package wiki

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// TempManager handles temporary directory management with cleanup and optimization
type TempManager struct {
	baseDir       string
	prefix        string
	maxAge        time.Duration
	maxSize       int64
	cleanupTicker *time.Ticker
	directories   map[string]*TempDirInfo
	mutex         sync.RWMutex
	ctx           context.Context
	cancel        context.CancelFunc
}

// TempDirInfo tracks information about temporary directories
type TempDirInfo struct {
	Path     string
	Created  time.Time
	LastUsed time.Time
	Size     int64
	InUse    bool
	Purpose  string
}

// NewTempManager creates a new temporary directory manager
func NewTempManager(baseDir, prefix string) *TempManager {
	if baseDir == "" {
		baseDir = os.TempDir()
	}

	ctx, cancel := context.WithCancel(context.Background())

	tm := &TempManager{
		baseDir:     baseDir,
		prefix:      prefix,
		maxAge:      1 * time.Hour,     // Clean up directories older than 1 hour
		maxSize:     500 * 1024 * 1024, // 500MB total temp space limit
		directories: make(map[string]*TempDirInfo),
		ctx:         ctx,
		cancel:      cancel,
	}

	// Start background cleanup
	tm.startBackgroundCleanup()

	return tm
}

// CreateTempDir creates a new temporary directory with tracking
func (tm *TempManager) CreateTempDir(purpose string) (string, error) {
	tm.mutex.Lock()
	defer tm.mutex.Unlock()

	// Generate unique directory name with higher precision
	timestamp := time.Now().Format("20060102-150405")
	uniqueID := time.Now().UnixNano() // Use full nanosecond timestamp for uniqueness
	dirname := fmt.Sprintf("%s-%s-%d", tm.prefix, timestamp, uniqueID)
	dirPath := filepath.Join(tm.baseDir, dirname)

	// Create directory
	if err := os.MkdirAll(dirPath, 0750); err != nil { // #nosec G301 -- Temporary directories need appropriate permissions
		return "", NewWikiError(ErrorTypeFileSystem, "create_temp_dir", err,
			"一時ディレクトリの作成に失敗しました", 0,
			[]string{
				"ディスクの空き容量を確認してください",
				"一時ディレクトリへの書き込み権限を確認してください",
			})
	}

	// Track the directory
	info := &TempDirInfo{
		Path:     dirPath,
		Created:  time.Now(),
		LastUsed: time.Now(),
		Size:     0,
		InUse:    true,
		Purpose:  purpose,
	}

	tm.directories[dirPath] = info

	slog.Info("Created temporary directory", "path", dirPath, "purpose", purpose)
	return dirPath, nil
}

// MarkInUse marks a directory as currently in use
func (tm *TempManager) MarkInUse(dirPath string, inUse bool) {
	tm.mutex.Lock()
	defer tm.mutex.Unlock()

	if info, exists := tm.directories[dirPath]; exists {
		info.InUse = inUse
		info.LastUsed = time.Now()
		if !inUse {
			slog.Info("Temporary directory marked as not in use", "path", dirPath)
		}
	}
}

// UpdateDirectorySize updates the size of a tracked directory
func (tm *TempManager) UpdateDirectorySize(dirPath string) error {
	tm.mutex.Lock()
	defer tm.mutex.Unlock()

	info, exists := tm.directories[dirPath]
	if !exists {
		return nil // Directory not tracked
	}

	size, err := tm.calculateDirectorySize(dirPath)
	if err != nil {
		slog.Warn("Failed to calculate directory size", "path", dirPath, "error", err)
		return err
	}

	info.Size = size
	info.LastUsed = time.Now()

	return nil
}

// CleanupDirectory removes a specific temporary directory
func (tm *TempManager) CleanupDirectory(dirPath string) error {
	tm.mutex.Lock()
	defer tm.mutex.Unlock()

	info, exists := tm.directories[dirPath]
	if !exists {
		slog.Warn("Attempted to cleanup untracked directory", "path", dirPath)
		return nil
	}

	if info.InUse {
		slog.Warn("Cannot cleanup directory in use", "path", dirPath)
		return nil
	}

	// Remove the directory
	if err := os.RemoveAll(dirPath); err != nil {
		slog.Error("Failed to remove temporary directory", "path", dirPath, "error", err)
		return err
	}

	// Remove from tracking
	delete(tm.directories, dirPath)

	slog.Info("Cleaned up temporary directory", "path", dirPath, "purpose", info.Purpose)
	return nil
}

// CleanupAll removes all temporary directories (except those in use)
func (tm *TempManager) CleanupAll() error {
	tm.mutex.Lock()
	defer tm.mutex.Unlock()

	var errors []string
	cleaned := 0

	for dirPath, info := range tm.directories {
		if info.InUse {
			slog.Info("Skipping cleanup of directory in use", "path", dirPath)
			continue
		}

		if err := os.RemoveAll(dirPath); err != nil {
			errors = append(errors, fmt.Sprintf("Failed to remove %s: %v", dirPath, err))
			continue
		}

		delete(tm.directories, dirPath)
		cleaned++
		slog.Info("Cleaned up temporary directory", "path", dirPath)
	}

	slog.Info("Cleanup completed", "directories_removed", cleaned)

	if len(errors) > 0 {
		return fmt.Errorf("cleanup errors: %s", strings.Join(errors, "; "))
	}

	return nil
}

// startBackgroundCleanup starts the background cleanup process
func (tm *TempManager) startBackgroundCleanup() {
	tm.cleanupTicker = time.NewTicker(15 * time.Minute) // Check every 15 minutes

	go func() {
		defer tm.cleanupTicker.Stop()

		for {
			select {
			case <-tm.ctx.Done():
				return
			case <-tm.cleanupTicker.C:
				tm.backgroundCleanup()
			}
		}
	}()

	slog.Info("Background temp directory cleanup started (interval: 15 minutes)")
}

// backgroundCleanup performs periodic cleanup of old directories
func (tm *TempManager) backgroundCleanup() {
	tm.mutex.Lock()
	defer tm.mutex.Unlock()

	now := time.Now()
	cleaned := 0
	totalSize := int64(0)

	// Calculate total size and identify old directories
	var toCleanup []string

	for dirPath, info := range tm.directories {
		// Update directory size
		if size, err := tm.calculateDirectorySize(dirPath); err == nil {
			info.Size = size
			totalSize += size
		}

		// Check if directory should be cleaned up
		age := now.Sub(info.LastUsed)
		if !info.InUse && age > tm.maxAge {
			toCleanup = append(toCleanup, dirPath)
		}
	}

	// Clean up old directories
	for _, dirPath := range toCleanup {
		if err := os.RemoveAll(dirPath); err != nil {
			slog.Error("Background cleanup failed", "path", dirPath, "error", err)
			continue
		}

		delete(tm.directories, dirPath)
		cleaned++
	}

	// Check total size limit
	if totalSize > tm.maxSize {
		slog.Warn("Total temp directory size exceeds limit",
			"total_mb", totalSize/(1024*1024), "limit_mb", tm.maxSize/(1024*1024))

		// Clean up additional directories starting with oldest
		tm.cleanupBySize()
	}

	if cleaned > 0 {
		slog.Info("Background cleanup: removed old temporary directories", "count", cleaned)
	}

	slog.Debug("Temp directory stats",
		"active_directories", len(tm.directories), "total_size_mb", totalSize/(1024*1024))
}

// cleanupBySize removes directories to get under size limit
func (tm *TempManager) cleanupBySize() {
	// Sort directories by last used time (oldest first)
	type dirSizeInfo struct {
		path     string
		lastUsed time.Time
		size     int64
		inUse    bool
	}

	var dirs []dirSizeInfo
	for path, info := range tm.directories {
		dirs = append(dirs, dirSizeInfo{
			path:     path,
			lastUsed: info.LastUsed,
			size:     info.Size,
			inUse:    info.InUse,
		})
	}

	// Sort by last used time
	for i := 0; i < len(dirs)-1; i++ {
		for j := i + 1; j < len(dirs); j++ {
			if dirs[i].lastUsed.After(dirs[j].lastUsed) {
				dirs[i], dirs[j] = dirs[j], dirs[i]
			}
		}
	}

	// Remove oldest directories until under size limit
	currentSize := int64(0)
	for _, dir := range dirs {
		currentSize += dir.size
	}

	for _, dir := range dirs {
		if currentSize <= tm.maxSize {
			break
		}

		if !dir.inUse {
			if err := os.RemoveAll(dir.path); err == nil {
				delete(tm.directories, dir.path)
				currentSize -= dir.size
				slog.Info("Removed directory for size limit", "path", dir.path)
			}
		}
	}
}

// calculateDirectorySize calculates the total size of a directory
func (tm *TempManager) calculateDirectorySize(dirPath string) (int64, error) {
	var size int64

	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			size += info.Size()
		}
		return nil
	})

	return size, err
}

// GetStats returns statistics about temporary directories
func (tm *TempManager) GetStats() map[string]any {
	tm.mutex.RLock()
	defer tm.mutex.RUnlock()

	totalSize := int64(0)
	inUseCount := 0
	oldestTime := time.Now()

	for _, info := range tm.directories {
		totalSize += info.Size
		if info.InUse {
			inUseCount++
		}
		if info.Created.Before(oldestTime) {
			oldestTime = info.Created
		}
	}

	return map[string]any{
		"total_directories": len(tm.directories),
		"in_use_count":      inUseCount,
		"total_size_mb":     totalSize / (1024 * 1024),
		"oldest_directory":  time.Since(oldestTime),
		"max_age":           tm.maxAge,
		"max_size_mb":       tm.maxSize / (1024 * 1024),
	}
}

// Shutdown stops the background cleanup and optionally cleans up all directories
func (tm *TempManager) Shutdown(cleanupAll bool) error {
	tm.cancel()

	if cleanupAll {
		return tm.CleanupAll()
	}

	return nil
}

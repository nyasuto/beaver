package wiki

import (
	"context"
	"fmt"
	"log"
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
	Path      string
	Created   time.Time
	LastUsed  time.Time
	Size      int64
	InUse     bool
	Purpose   string
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
		maxAge:      1 * time.Hour,  // Clean up directories older than 1 hour
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
	
	// Generate unique directory name
	timestamp := time.Now().Format("20060102-150405")
	dirname := fmt.Sprintf("%s-%s-%d", tm.prefix, timestamp, time.Now().UnixNano()%10000)
	dirPath := filepath.Join(tm.baseDir, dirname)
	
	// Create directory
	if err := os.MkdirAll(dirPath, 0755); err != nil {
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
	
	log.Printf("INFO Created temporary directory: %s (purpose: %s)", dirPath, purpose)
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
			log.Printf("INFO Temporary directory marked as not in use: %s", dirPath)
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
		log.Printf("WARN Failed to calculate directory size for %s: %v", dirPath, err)
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
		log.Printf("WARN Attempted to cleanup untracked directory: %s", dirPath)
		return nil
	}
	
	if info.InUse {
		log.Printf("WARN Cannot cleanup directory in use: %s", dirPath)
		return nil
	}
	
	// Remove the directory
	if err := os.RemoveAll(dirPath); err != nil {
		log.Printf("ERROR Failed to remove temporary directory %s: %v", dirPath, err)
		return err
	}
	
	// Remove from tracking
	delete(tm.directories, dirPath)
	
	log.Printf("INFO Cleaned up temporary directory: %s (purpose: %s)", dirPath, info.Purpose)
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
			log.Printf("INFO Skipping cleanup of directory in use: %s", dirPath)
			continue
		}
		
		if err := os.RemoveAll(dirPath); err != nil {
			errors = append(errors, fmt.Sprintf("Failed to remove %s: %v", dirPath, err))
			continue
		}
		
		delete(tm.directories, dirPath)
		cleaned++
		log.Printf("INFO Cleaned up temporary directory: %s", dirPath)
	}
	
	log.Printf("INFO Cleanup completed: %d directories removed", cleaned)
	
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
	
	log.Printf("INFO Background temp directory cleanup started (interval: 15 minutes)")
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
			log.Printf("ERROR Background cleanup failed for %s: %v", dirPath, err)
			continue
		}
		
		delete(tm.directories, dirPath)
		cleaned++
	}
	
	// Check total size limit
	if totalSize > tm.maxSize {
		log.Printf("WARN Total temp directory size (%d MB) exceeds limit (%d MB)",
			totalSize/(1024*1024), tm.maxSize/(1024*1024))
		
		// Clean up additional directories starting with oldest
		tm.cleanupBySize()
	}
	
	if cleaned > 0 {
		log.Printf("INFO Background cleanup: removed %d old temporary directories", cleaned)
	}
	
	log.Printf("DEBUG Temp directory stats: %d active, %d MB total size",
		len(tm.directories), totalSize/(1024*1024))
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
				log.Printf("INFO Removed directory for size limit: %s", dir.path)
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
func (tm *TempManager) GetStats() map[string]interface{} {
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
	
	return map[string]interface{}{
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
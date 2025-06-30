package wiki

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"unicode/utf8"
)

// WikiFileManager handles comprehensive file management for GitHub Wiki repositories
// with support for proper naming conventions, directory structure, and asset management
type WikiFileManager struct {
	workDir string
	config  *FileManagerConfig
}

// FileManagerConfig contains configuration options for file management
type FileManagerConfig struct {
	// Encoding settings
	UseUTF8Encoding bool

	// Directory structure
	CreateImagesDir bool
	ImagesSubDir    string

	// File naming options
	AllowJapanese      bool
	ConflictResolution ConflictResolution
	MaxFilenameLength  int

	// Asset management
	SupportedImageExts []string
	MaxAssetSize       int64 // bytes
}

// ConflictResolution defines how to handle filename conflicts
type ConflictResolution int

const (
	ConflictError        ConflictResolution = iota // Return error on conflict
	ConflictAppendNumber                           // Append number (e.g., file-2.md)
	ConflictOverwrite                              // Overwrite existing file
)

// FileInfo represents information about a managed file
type FileInfo struct {
	OriginalName   string
	NormalizedName string
	FilePath       string
	IsAsset        bool
	Size           int64
	Encoding       string
	ConflictCount  int
}

// sanitizeUTF8Content ensures content is valid UTF-8 by replacing invalid sequences
func sanitizeUTF8Content(content string) string {
	if utf8.ValidString(content) {
		return content
	}

	// Replace invalid UTF-8 sequences with replacement character
	var buf strings.Builder
	for _, r := range content {
		if r == utf8.RuneError {
			buf.WriteRune('\uFFFD') // Unicode replacement character
		} else {
			buf.WriteRune(r)
		}
	}
	return buf.String()
}

// WriteFileUTF8 writes content to a file with UTF-8 encoding guarantee
// This function ensures that all content is properly encoded as UTF-8
func WriteFileUTF8(filename string, content string, perm os.FileMode) error {
	// Sanitize content to ensure valid UTF-8
	sanitizedContent := sanitizeUTF8Content(content)
	
	// Convert to bytes - Go strings are already UTF-8 encoded
	contentBytes := []byte(sanitizedContent)
	
	// Verify the byte sequence is valid UTF-8
	if !utf8.Valid(contentBytes) {
		return fmt.Errorf("content contains invalid UTF-8 sequences after sanitization")
	}
	
	// Write the file
	return os.WriteFile(filename, contentBytes, perm)
}

// NewWikiFileManager creates a new file manager instance
func NewWikiFileManager(workDir string) *WikiFileManager {
	return &WikiFileManager{
		workDir: workDir,
		config:  NewDefaultFileManagerConfig(),
	}
}

// NewDefaultFileManagerConfig creates default configuration for file management
func NewDefaultFileManagerConfig() *FileManagerConfig {
	return &FileManagerConfig{
		UseUTF8Encoding:    true,
		CreateImagesDir:    true,
		ImagesSubDir:       "images",
		AllowJapanese:      true,
		ConflictResolution: ConflictAppendNumber,
		MaxFilenameLength:  100, // GitHub Wiki practical limit
		SupportedImageExts: []string{".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"},
		MaxAssetSize:       10 * 1024 * 1024, // 10MB
	}
}

// SetConfig updates the file manager configuration
func (fm *WikiFileManager) SetConfig(config *FileManagerConfig) {
	fm.config = config
}

// NormalizePageName converts a page title to a GitHub Wiki-compatible filename
func (fm *WikiFileManager) NormalizePageName(title string) (string, error) {
	if title == "" {
		return "", NewWikiError(ErrorTypeValidation, "normalize_name", nil,
			"ページタイトルが空です", 0,
			[]string{"有効なページタイトルを指定してください"})
	}

	// Handle special case for home page
	if strings.ToLower(strings.TrimSpace(title)) == "home" {
		return "Home.md", nil
	}

	// Start with the original title
	normalized := title

	// Handle UTF-8 and Japanese characters
	if fm.config.AllowJapanese {
		normalized = fm.normalizeJapaneseChars(normalized)
	} else {
		normalized = fm.removeNonASCII(normalized)
	}

	// Replace spaces with hyphens (GitHub Wiki convention)
	normalized = strings.ReplaceAll(normalized, " ", "-")

	// Remove or replace problematic characters
	normalized = fm.sanitizeFilename(normalized)

	// Ensure length limits
	if len(normalized) > fm.config.MaxFilenameLength-3 { // Reserve space for .md
		normalized = fm.truncateFilename(normalized, fm.config.MaxFilenameLength-3)
	}

	// Ensure .md extension
	if !strings.HasSuffix(normalized, ".md") {
		normalized += ".md"
	}

	// Validate final filename
	if err := fm.validateFilename(normalized); err != nil {
		return "", err
	}

	return normalized, nil
}

// normalizeJapaneseChars handles Japanese character normalization
func (fm *WikiFileManager) normalizeJapaneseChars(text string) string {
	// Convert full-width characters to half-width where appropriate
	replacements := map[string]string{
		"　": "-", // Full-width space to hyphen
		"／": "-", // Full-width slash
		"＼": "-", // Full-width backslash
		"：": "-", // Full-width colon
		"＊": "-", // Full-width asterisk
		"？": "-", // Full-width question mark
		"｜": "-", // Full-width pipe
		"＜": "-", // Full-width less than
		"＞": "-", // Full-width greater than
		"｢": "",  // Half-width katakana brackets (remove)
		"｣": "",
	}

	result := text
	for old, new := range replacements {
		result = strings.ReplaceAll(result, old, new)
	}

	return result
}

// removeNonASCII removes non-ASCII characters for ASCII-only mode
func (fm *WikiFileManager) removeNonASCII(text string) string {
	// Use regex to keep only ASCII letters, numbers, spaces, and basic punctuation
	reg := regexp.MustCompile(`[^a-zA-Z0-9\s\-._]`)
	return reg.ReplaceAllString(text, "")
}

// sanitizeFilename removes or replaces characters that are problematic for filesystems
func (fm *WikiFileManager) sanitizeFilename(filename string) string {
	// Characters that need to be replaced with hyphens
	problematicChars := []string{"/", "\\", ":", "*", "?", "\"", "<", ">", "|", "\n", "\r", "\t"}

	result := filename
	for _, char := range problematicChars {
		result = strings.ReplaceAll(result, char, "-")
	}

	// Replace multiple consecutive hyphens with single hyphen
	multiHyphenRegex := regexp.MustCompile(`-+`)
	result = multiHyphenRegex.ReplaceAllString(result, "-")

	// Remove leading/trailing hyphens
	result = strings.Trim(result, "-")

	return result
}

// truncateFilename safely truncates filename while preserving UTF-8 validity
func (fm *WikiFileManager) truncateFilename(filename string, maxLen int) string {
	if len(filename) <= maxLen {
		return filename
	}

	// Truncate at valid UTF-8 boundary
	truncated := filename[:maxLen]
	for !utf8.ValidString(truncated) && len(truncated) > 0 {
		truncated = truncated[:len(truncated)-1]
	}

	// Ensure we don't end with partial word or hyphen
	if strings.HasSuffix(truncated, "-") {
		truncated = strings.TrimRight(truncated, "-")
	}

	return truncated
}

// validateFilename checks if the filename is valid for GitHub Wiki
func (fm *WikiFileManager) validateFilename(filename string) error {
	if filename == "" {
		return NewWikiError(ErrorTypeValidation, "validate_filename", nil,
			"ファイル名が空です", 0, nil)
	}

	// Check for reserved names
	reservedNames := []string{"CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4",
		"COM5", "COM6", "COM7", "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4",
		"LPT5", "LPT6", "LPT7", "LPT8", "LPT9"}

	nameWithoutExt := strings.TrimSuffix(filename, ".md")
	for _, reserved := range reservedNames {
		if strings.EqualFold(nameWithoutExt, reserved) {
			return NewWikiError(ErrorTypeValidation, "validate_filename", nil,
				"予約されたファイル名は使用できません", 0,
				[]string{fmt.Sprintf("'%s'は予約語です", reserved)})
		}
	}

	// Check for invalid characters (should be handled by sanitization, but double-check)
	invalidChars := []string{"/", "\\", ":", "*", "?", "\"", "<", ">", "|"}
	for _, char := range invalidChars {
		if strings.Contains(filename, char) {
			return NewWikiError(ErrorTypeValidation, "validate_filename", nil,
				"無効な文字が含まれています", 0,
				[]string{fmt.Sprintf("文字 '%s' は使用できません", char)})
		}
	}

	return nil
}

// WritePageFile writes a markdown page with proper encoding and conflict resolution
func (fm *WikiFileManager) WritePageFile(title, content string) (*FileInfo, error) {
	normalizedName, err := fm.NormalizePageName(title)
	if err != nil {
		return nil, err
	}

	filePath := filepath.Join(fm.workDir, normalizedName)

	// Handle filename conflicts
	finalPath, conflictCount, err := fm.resolveFilenameConflict(filePath)
	if err != nil {
		return nil, err
	}

	// Write file with UTF-8 encoding guarantee
	if fm.config.UseUTF8Encoding {
		err = WriteFileUTF8(finalPath, content, 0600)
	} else {
		err = os.WriteFile(finalPath, []byte(content), 0600)
	}
	
	if err != nil { // #nosec G306 -- Wiki files need appropriate read permissions
		return nil, NewWikiError(ErrorTypeFileSystem, "write_page", err,
			"ページファイルの書き込みに失敗しました", 0,
			[]string{
				"ディスクの空き容量を確認してください",
				"ファイルへの書き込み権限を確認してください",
			})
	}

	// Get file info
	fileInfo, err := os.Stat(finalPath)
	if err != nil {
		return nil, NewWikiError(ErrorTypeFileSystem, "write_page", err,
			"ファイル情報の取得に失敗しました", 0, nil)
	}

	return &FileInfo{
		OriginalName:   title,
		NormalizedName: filepath.Base(finalPath),
		FilePath:       finalPath,
		IsAsset:        false,
		Size:           fileInfo.Size(),
		Encoding:       "UTF-8",
		ConflictCount:  conflictCount,
	}, nil
}

// resolveFilenameConflict handles filename conflicts based on configuration
func (fm *WikiFileManager) resolveFilenameConflict(filePath string) (string, int, error) {
	// Check if file exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return filePath, 0, nil // No conflict
	}

	switch fm.config.ConflictResolution {
	case ConflictError:
		return "", 0, NewWikiError(ErrorTypeValidation, "filename_conflict", nil,
			"ファイルが既に存在します", 0,
			[]string{"異なるファイル名を使用してください"})

	case ConflictOverwrite:
		return filePath, 0, nil

	case ConflictAppendNumber:
		return fm.findAvailableFilename(filePath)

	default:
		return "", 0, NewWikiError(ErrorTypeConfiguration, "conflict_resolution", nil,
			"無効な競合解決設定です", 0, nil)
	}
}

// findAvailableFilename finds an available filename by appending numbers
func (fm *WikiFileManager) findAvailableFilename(basePath string) (string, int, error) {
	dir := filepath.Dir(basePath)
	ext := filepath.Ext(basePath)
	nameWithoutExt := strings.TrimSuffix(filepath.Base(basePath), ext)

	for i := 2; i <= 999; i++ { // Reasonable limit
		newName := fmt.Sprintf("%s-%d%s", nameWithoutExt, i, ext)
		newPath := filepath.Join(dir, newName)

		if _, err := os.Stat(newPath); os.IsNotExist(err) {
			return newPath, i - 1, nil
		}
	}

	return "", 0, NewWikiError(ErrorTypeFileSystem, "filename_conflict", nil,
		"利用可能なファイル名が見つかりません", 0,
		[]string{"ファイル数が上限に達しています"})
}

// CreateImagesDirectory creates the images subdirectory if configured
func (fm *WikiFileManager) CreateImagesDirectory() error {
	if !fm.config.CreateImagesDir {
		return nil
	}

	imagesDir := filepath.Join(fm.workDir, fm.config.ImagesSubDir)
	if err := os.MkdirAll(imagesDir, 0750); err != nil { // #nosec G301 -- Images directory needs to be accessible
		return NewWikiError(ErrorTypeFileSystem, "create_images_dir", err,
			"画像ディレクトリの作成に失敗しました", 0,
			[]string{
				"ディスクの空き容量を確認してください",
				"書き込み権限を確認してください",
			})
	}

	return nil
}

// WriteAssetFile writes an asset file (image, etc.) to the appropriate directory
func (fm *WikiFileManager) WriteAssetFile(filename string, data []byte) (*FileInfo, error) {
	// Validate file size
	if fm.config.MaxAssetSize > 0 && int64(len(data)) > fm.config.MaxAssetSize {
		return nil, NewWikiError(ErrorTypeValidation, "asset_size", nil,
			"アセットファイルサイズが上限を超えています", 0,
			[]string{fmt.Sprintf("最大サイズ: %d bytes", fm.config.MaxAssetSize)})
	}

	// Normalize asset filename
	normalizedName := fm.sanitizeFilename(filename)

	// Determine target directory
	targetDir := fm.workDir
	if fm.isImageFile(normalizedName) && fm.config.CreateImagesDir {
		targetDir = filepath.Join(fm.workDir, fm.config.ImagesSubDir)
		// Ensure images directory exists
		if err := fm.CreateImagesDirectory(); err != nil {
			return nil, err
		}
	}

	filePath := filepath.Join(targetDir, normalizedName)

	// Handle filename conflicts
	finalPath, conflictCount, err := fm.resolveFilenameConflict(filePath)
	if err != nil {
		return nil, err
	}

	// Write asset file
	if err := os.WriteFile(finalPath, data, 0600); err != nil { // #nosec G306 -- Asset files need appropriate read permissions
		return nil, NewWikiError(ErrorTypeFileSystem, "write_asset", err,
			"アセットファイルの書き込みに失敗しました", 0,
			[]string{
				"ディスクの空き容量を確認してください",
				"ファイルへの書き込み権限を確認してください",
			})
	}

	return &FileInfo{
		OriginalName:   filename,
		NormalizedName: filepath.Base(finalPath),
		FilePath:       finalPath,
		IsAsset:        true,
		Size:           int64(len(data)),
		Encoding:       "binary",
		ConflictCount:  conflictCount,
	}, nil
}

// isImageFile checks if a filename represents an image file
func (fm *WikiFileManager) isImageFile(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	for _, supportedExt := range fm.config.SupportedImageExts {
		if ext == supportedExt {
			return true
		}
	}
	return false
}

// ListFiles returns information about all managed files
func (fm *WikiFileManager) ListFiles() ([]*FileInfo, error) {
	var files []*FileInfo

	err := filepath.WalkDir(fm.workDir, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}

		// Skip directories and git files
		if d.IsDir() || strings.HasPrefix(d.Name(), ".git") {
			return nil
		}

		info, err := d.Info()
		if err != nil {
			return err
		}

		isAsset := !strings.HasSuffix(d.Name(), ".md")

		files = append(files, &FileInfo{
			OriginalName:   d.Name(),
			NormalizedName: d.Name(),
			FilePath:       path,
			IsAsset:        isAsset,
			Size:           info.Size(),
			Encoding:       fm.detectEncoding(path),
		})

		return nil
	})

	if err != nil {
		return nil, NewWikiError(ErrorTypeFileSystem, "list_files", err,
			"ファイル一覧の取得に失敗しました", 0, nil)
	}

	return files, nil
}

// detectEncoding attempts to detect file encoding (simplified implementation)
func (fm *WikiFileManager) detectEncoding(filePath string) string {
	// For simplicity, assume text files are UTF-8 and others are binary
	if strings.HasSuffix(filePath, ".md") || strings.HasSuffix(filePath, ".txt") {
		return "UTF-8"
	}
	return "binary"
}

// GetWorkingDirectory returns the current working directory
func (fm *WikiFileManager) GetWorkingDirectory() string {
	return fm.workDir
}

// GetImageDirectory returns the images subdirectory path
func (fm *WikiFileManager) GetImageDirectory() string {
	if fm.config.CreateImagesDir {
		return filepath.Join(fm.workDir, fm.config.ImagesSubDir)
	}
	return ""
}

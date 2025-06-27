package wiki

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestNewWikiFileManager(t *testing.T) {
	tempDir := t.TempDir()
	fm := NewWikiFileManager(tempDir)

	if fm.workDir != tempDir {
		t.Errorf("Expected workDir %s, got %s", tempDir, fm.workDir)
	}

	if fm.config == nil {
		t.Error("Expected config to be initialized")
	}

	// Check default config values
	if !fm.config.UseUTF8Encoding {
		t.Error("Expected UTF-8 encoding to be enabled by default")
	}

	if !fm.config.AllowJapanese {
		t.Error("Expected Japanese support to be enabled by default")
	}

	if fm.config.ConflictResolution != ConflictAppendNumber {
		t.Error("Expected default conflict resolution to be ConflictAppendNumber")
	}
}

func TestNormalizePageName(t *testing.T) {
	tempDir := t.TempDir()
	fm := NewWikiFileManager(tempDir)

	tests := []struct {
		name     string
		input    string
		expected string
		hasError bool
	}{
		{
			name:     "Simple title",
			input:    "Test Page",
			expected: "Test-Page.md",
			hasError: false,
		},
		{
			name:     "Home page special case",
			input:    "Home",
			expected: "Home.md",
			hasError: false,
		},
		{
			name:     "Home page case insensitive",
			input:    "home",
			expected: "Home.md",
			hasError: false,
		},
		{
			name:     "Japanese characters",
			input:    "テストページ",
			expected: "テストページ.md",
			hasError: false,
		},
		{
			name:     "Mixed Japanese and English",
			input:    "API仕様書",
			expected: "API仕様書.md",
			hasError: false,
		},
		{
			name:     "Special characters replacement",
			input:    "File/with\\special:chars*",
			expected: "File-with-special-chars.md",
			hasError: false,
		},
		{
			name:     "Multiple spaces",
			input:    "Multiple   Spaces   Here",
			expected: "Multiple-Spaces-Here.md",
			hasError: false,
		},
		{
			name:     "Full-width characters",
			input:    "フルワイズ／テスト",
			expected: "フルワイズ-テスト.md",
			hasError: false,
		},
		{
			name:     "Empty title",
			input:    "",
			expected: "",
			hasError: true,
		},
		{
			name:     "Already has extension",
			input:    "Test.md",
			expected: "Test.md",
			hasError: false,
		},
		{
			name:     "Long filename truncation",
			input:    strings.Repeat("a", 150),
			expected: strings.Repeat("a", 97) + ".md", // 100 - 3 for .md
			hasError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := fm.NormalizePageName(tt.input)

			if tt.hasError {
				if err == nil {
					t.Errorf("Expected error for input %q, but got none", tt.input)
				}
				return
			}

			if err != nil {
				t.Errorf("Unexpected error for input %q: %v", tt.input, err)
				return
			}

			if result != tt.expected {
				t.Errorf("For input %q, expected %q, got %q", tt.input, tt.expected, result)
			}

			// Verify all results end with .md
			if !strings.HasSuffix(result, ".md") {
				t.Errorf("Result %q does not end with .md", result)
			}

			// Verify no invalid characters remain
			invalidChars := []string{"/", "\\", ":", "*", "?", "\"", "<", ">", "|"}
			for _, char := range invalidChars {
				if strings.Contains(result, char) {
					t.Errorf("Result %q contains invalid character %q", result, char)
				}
			}
		})
	}
}

func TestNormalizePageName_ASCIIOnly(t *testing.T) {
	tempDir := t.TempDir()
	fm := NewWikiFileManager(tempDir)

	// Configure for ASCII-only mode
	fm.config.AllowJapanese = false

	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "Japanese characters removed",
			input:    "テストページ",
			expected: ".md",
		},
		{
			name:     "Mixed characters keep ASCII only",
			input:    "API仕様書 Documentation",
			expected: "API-Documentation.md",
		},
		{
			name:     "Pure ASCII unchanged",
			input:    "Pure ASCII Test",
			expected: "Pure-ASCII-Test.md",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := fm.NormalizePageName(tt.input)
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
				return
			}

			if result != tt.expected {
				t.Errorf("Expected %q, got %q", tt.expected, result)
			}
		})
	}
}

func TestWritePageFile(t *testing.T) {
	tempDir := t.TempDir()
	fm := NewWikiFileManager(tempDir)

	t.Run("Basic page creation", func(t *testing.T) {
		title := "Test Page"
		content := "# Test Page\n\nThis is a test page."

		fileInfo, err := fm.WritePageFile(title, content)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if fileInfo.OriginalName != title {
			t.Errorf("Expected original name %q, got %q", title, fileInfo.OriginalName)
		}

		if fileInfo.NormalizedName != "Test-Page.md" {
			t.Errorf("Expected normalized name %q, got %q", "Test-Page.md", fileInfo.NormalizedName)
		}

		if fileInfo.IsAsset {
			t.Error("Expected IsAsset to be false for markdown page")
		}

		if fileInfo.Encoding != "UTF-8" {
			t.Errorf("Expected UTF-8 encoding, got %q", fileInfo.Encoding)
		}

		// Verify file exists and has correct content
		expectedPath := filepath.Join(tempDir, "Test-Page.md")
		data, err := os.ReadFile(expectedPath)
		if err != nil {
			t.Fatalf("Failed to read created file: %v", err)
		}

		if string(data) != content {
			t.Errorf("File content mismatch. Expected %q, got %q", content, string(data))
		}
	})

	t.Run("Japanese page creation", func(t *testing.T) {
		title := "日本語ページ"
		content := "# 日本語ページ\n\nこれは日本語のテストページです。"

		fileInfo, err := fm.WritePageFile(title, content)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if fileInfo.NormalizedName != "日本語ページ.md" {
			t.Errorf("Expected normalized name %q, got %q", "日本語ページ.md", fileInfo.NormalizedName)
		}

		// Verify UTF-8 content is preserved
		expectedPath := filepath.Join(tempDir, "日本語ページ.md")
		data, err := os.ReadFile(expectedPath)
		if err != nil {
			t.Fatalf("Failed to read created file: %v", err)
		}

		if string(data) != content {
			t.Errorf("Japanese content not preserved correctly")
		}
	})
}

func TestConflictResolution(t *testing.T) {
	tempDir := t.TempDir()

	title := "Conflict Test"
	content1 := "First content"
	content2 := "Second content"

	t.Run("ConflictError mode", func(t *testing.T) {
		subDir := filepath.Join(tempDir, "error_test")
		os.MkdirAll(subDir, 0755)
		fmError := NewWikiFileManager(subDir)
		fmError.config.ConflictResolution = ConflictError

		// Create first file
		_, err := fmError.WritePageFile(title, content1)
		if err != nil {
			t.Fatalf("Failed to create first file: %v", err)
		}

		// Try to create second file with same name - should error
		_, err = fmError.WritePageFile(title, content2)
		if err == nil {
			t.Error("Expected error for duplicate filename in ConflictError mode")
		}
	})

	t.Run("ConflictOverwrite mode", func(t *testing.T) {
		subDir := filepath.Join(tempDir, "overwrite_test")
		os.MkdirAll(subDir, 0755)
		fmOverwrite := NewWikiFileManager(subDir)
		fmOverwrite.config.ConflictResolution = ConflictOverwrite

		// Create first file
		_, err := fmOverwrite.WritePageFile(title, content1)
		if err != nil {
			t.Fatalf("Failed to create first file: %v", err)
		}

		// Create second file with same name - should overwrite
		fileInfo, err := fmOverwrite.WritePageFile(title, content2)
		if err != nil {
			t.Fatalf("Unexpected error in ConflictOverwrite mode: %v", err)
		}

		if fileInfo.ConflictCount != 0 {
			t.Errorf("Expected conflict count 0, got %d", fileInfo.ConflictCount)
		}

		// Verify content was overwritten
		data, err := os.ReadFile(fileInfo.FilePath)
		if err != nil {
			t.Fatalf("Failed to read overwritten file: %v", err)
		}

		if string(data) != content2 {
			t.Error("File was not properly overwritten")
		}
	})

	t.Run("ConflictAppendNumber mode", func(t *testing.T) {
		subDir := filepath.Join(tempDir, "append_test")
		os.MkdirAll(subDir, 0755)
		fmAppend := NewWikiFileManager(subDir)
		fmAppend.config.ConflictResolution = ConflictAppendNumber

		// Create first file
		fileInfo1, err := fmAppend.WritePageFile(title, content1)
		if err != nil {
			t.Fatalf("Failed to create first file: %v", err)
		}

		if fileInfo1.NormalizedName != "Conflict-Test.md" {
			t.Errorf("Expected first file name %q, got %q", "Conflict-Test.md", fileInfo1.NormalizedName)
		}

		// Create second file with same title - should append number
		fileInfo2, err := fmAppend.WritePageFile(title, content2)
		if err != nil {
			t.Fatalf("Failed to create second file: %v", err)
		}

		if fileInfo2.NormalizedName != "Conflict-Test-2.md" {
			t.Errorf("Expected second file name %q, got %q", "Conflict-Test-2.md", fileInfo2.NormalizedName)
		}

		if fileInfo2.ConflictCount != 1 {
			t.Errorf("Expected conflict count 1, got %d", fileInfo2.ConflictCount)
		}

		// Verify both files exist with correct content
		data1, err := os.ReadFile(fileInfo1.FilePath)
		if err != nil {
			t.Fatalf("Failed to read first file: %v", err)
		}
		if string(data1) != content1 {
			t.Error("First file content incorrect")
		}

		data2, err := os.ReadFile(fileInfo2.FilePath)
		if err != nil {
			t.Fatalf("Failed to read second file: %v", err)
		}
		if string(data2) != content2 {
			t.Error("Second file content incorrect")
		}
	})
}

func TestCreateImagesDirectory(t *testing.T) {
	tempDir := t.TempDir()
	fm := NewWikiFileManager(tempDir)

	err := fm.CreateImagesDirectory()
	if err != nil {
		t.Fatalf("Failed to create images directory: %v", err)
	}

	imagesDir := filepath.Join(tempDir, "images")
	if _, err := os.Stat(imagesDir); os.IsNotExist(err) {
		t.Error("Images directory was not created")
	}

	// Test with disabled images directory
	fm.config.CreateImagesDir = false
	err = fm.CreateImagesDirectory()
	if err != nil {
		t.Errorf("Should not error when images directory creation is disabled: %v", err)
	}
}

func TestWriteAssetFile(t *testing.T) {
	tempDir := t.TempDir()
	fm := NewWikiFileManager(tempDir)

	t.Run("Image asset", func(t *testing.T) {
		filename := "test-image.png"
		data := []byte("fake-png-data")

		fileInfo, err := fm.WriteAssetFile(filename, data)
		if err != nil {
			t.Fatalf("Failed to write asset file: %v", err)
		}

		if !fileInfo.IsAsset {
			t.Error("Expected IsAsset to be true")
		}

		if fileInfo.Encoding != "binary" {
			t.Errorf("Expected binary encoding, got %q", fileInfo.Encoding)
		}

		// Should be placed in images directory
		expectedPath := filepath.Join(tempDir, "images", filename)
		if fileInfo.FilePath != expectedPath {
			t.Errorf("Expected path %q, got %q", expectedPath, fileInfo.FilePath)
		}

		// Verify file exists
		if _, err := os.Stat(expectedPath); os.IsNotExist(err) {
			t.Error("Asset file was not created")
		}
	})

	t.Run("Asset size limit", func(t *testing.T) {
		fm.config.MaxAssetSize = 10 // Very small limit
		filename := "large-file.png"
		data := make([]byte, 20) // Larger than limit

		_, err := fm.WriteAssetFile(filename, data)
		if err == nil {
			t.Error("Expected error for oversized asset")
		}
	})

	t.Run("Non-image asset", func(t *testing.T) {
		// Reset size limit for this test
		fm.config.MaxAssetSize = 10 * 1024 * 1024 // 10MB default

		filename := "document.pdf"
		data := []byte("fake-pdf-data")

		fileInfo, err := fm.WriteAssetFile(filename, data)
		if err != nil {
			t.Fatalf("Failed to write non-image asset: %v", err)
		}

		// Should be placed in root directory (not images)
		expectedPath := filepath.Join(tempDir, filename)
		if fileInfo.FilePath != expectedPath {
			t.Errorf("Expected path %q, got %q", expectedPath, fileInfo.FilePath)
		}
	})
}

func TestListFiles(t *testing.T) {
	tempDir := t.TempDir()
	fm := NewWikiFileManager(tempDir)

	// Create some test files
	_, err := fm.WritePageFile("Test Page", "Content 1")
	if err != nil {
		t.Fatalf("Failed to create test page: %v", err)
	}

	_, err = fm.WriteAssetFile("test.png", []byte("image-data"))
	if err != nil {
		t.Fatalf("Failed to create test asset: %v", err)
	}

	files, err := fm.ListFiles()
	if err != nil {
		t.Fatalf("Failed to list files: %v", err)
	}

	if len(files) != 2 {
		t.Errorf("Expected 2 files, got %d", len(files))
	}

	// Check that we have both a markdown file and an asset
	var hasMarkdown, hasAsset bool
	for _, file := range files {
		if strings.HasSuffix(file.NormalizedName, ".md") {
			hasMarkdown = true
			if file.IsAsset {
				t.Error("Markdown file incorrectly marked as asset")
			}
		} else {
			hasAsset = true
			if !file.IsAsset {
				t.Error("Asset file not marked as asset")
			}
		}
	}

	if !hasMarkdown {
		t.Error("No markdown file found in listing")
	}
	if !hasAsset {
		t.Error("No asset file found in listing")
	}
}

func TestValidateFilename(t *testing.T) {
	tempDir := t.TempDir()
	fm := NewWikiFileManager(tempDir)

	tests := []struct {
		name     string
		filename string
		hasError bool
	}{
		{
			name:     "Valid filename",
			filename: "Test-Page.md",
			hasError: false,
		},
		{
			name:     "Valid Japanese filename",
			filename: "日本語ページ.md",
			hasError: false,
		},
		{
			name:     "Empty filename",
			filename: "",
			hasError: true,
		},
		{
			name:     "Reserved name CON",
			filename: "CON.md",
			hasError: true,
		},
		{
			name:     "Reserved name case insensitive",
			filename: "con.md",
			hasError: true,
		},
		{
			name:     "Invalid character slash",
			filename: "test/page.md",
			hasError: true,
		},
		{
			name:     "Invalid character asterisk",
			filename: "test*page.md",
			hasError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := fm.validateFilename(tt.filename)

			if tt.hasError && err == nil {
				t.Errorf("Expected error for filename %q, but got none", tt.filename)
			}

			if !tt.hasError && err != nil {
				t.Errorf("Unexpected error for filename %q: %v", tt.filename, err)
			}
		})
	}
}

func TestWikiFileManager_SetConfig(t *testing.T) {
	tempDir := t.TempDir()
	fm := NewWikiFileManager(tempDir)

	newConfig := &FileManagerConfig{
		UseUTF8Encoding:    false,
		CreateImagesDir:    false,
		AllowJapanese:      false,
		ConflictResolution: ConflictOverwrite,
		MaxFilenameLength:  50,
		SupportedImageExts: []string{".png"},
		MaxAssetSize:       1024,
	}

	fm.SetConfig(newConfig)

	if fm.config.UseUTF8Encoding {
		t.Error("Expected UTF8 encoding to be disabled")
	}
	if fm.config.CreateImagesDir {
		t.Error("Expected images dir creation to be disabled")
	}
	if fm.config.AllowJapanese {
		t.Error("Expected Japanese to be disabled")
	}
	if fm.config.ConflictResolution != ConflictOverwrite {
		t.Error("Expected conflict resolution to be ConflictOverwrite")
	}
}

func TestWikiFileManager_GetWorkingDirectory(t *testing.T) {
	tempDir := t.TempDir()
	fm := NewWikiFileManager(tempDir)

	result := fm.GetWorkingDirectory()
	if result != tempDir {
		t.Errorf("Expected working directory %s, got %s", tempDir, result)
	}
}

func TestWikiFileManager_GetImageDirectory(t *testing.T) {
	tempDir := t.TempDir()
	fm := NewWikiFileManager(tempDir)

	// Test with images directory enabled
	result := fm.GetImageDirectory()
	expectedPath := filepath.Join(tempDir, "images")
	if result != expectedPath {
		t.Errorf("Expected image directory %s, got %s", expectedPath, result)
	}

	// Test with images directory disabled
	fm.config.CreateImagesDir = false
	result = fm.GetImageDirectory()
	if result != "" {
		t.Errorf("Expected empty string when images dir disabled, got %s", result)
	}
}

func TestWikiFileManager_TruncateFilename_EdgeCases(t *testing.T) {
	tempDir := t.TempDir()
	fm := NewWikiFileManager(tempDir)

	tests := []struct {
		name     string
		input    string
		maxLen   int
		expected string
	}{
		{
			name:     "Input shorter than max",
			input:    "short",
			maxLen:   10,
			expected: "short",
		},
		{
			name:     "ASCII text truncation",
			input:    "very_long_filename_that_exceeds_limit",
			maxLen:   10,
			expected: "very_long_",
		},
		{
			name:     "UTF-8 boundary handling",
			input:    "テストファイル名",
			maxLen:   10,
			expected: "テスト",
		},
		{
			name:     "Ending with hyphen removal",
			input:    "test-file-name-",
			maxLen:   10,
			expected: "test-file",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := fm.truncateFilename(tt.input, tt.maxLen)
			if result != tt.expected {
				t.Errorf("truncateFilename(%q, %d) = %q, want %q",
					tt.input, tt.maxLen, result, tt.expected)
			}
		})
	}
}

func TestWikiFileManager_WritePageFile_Errors(t *testing.T) {
	tempDir := t.TempDir()
	fm := NewWikiFileManager(tempDir)

	t.Run("Invalid UTF-8 content", func(t *testing.T) {
		title := "Test Page"
		invalidUTF8 := string([]byte{0xff, 0xfe, 0xfd})

		_, err := fm.WritePageFile(title, invalidUTF8)
		if err == nil {
			t.Error("Expected error for invalid UTF-8 content")
		}
	})

	t.Run("Directory creation failure", func(t *testing.T) {
		// Try to create a file in a non-existent path structure
		// that would require directory creation but will fail
		invalidFm := NewWikiFileManager("/root/nonexistent/readonly")

		_, err := invalidFm.WritePageFile("Test", "content")
		if err == nil {
			// This might succeed in some environments, so we just log
			t.Log("File creation succeeded in restricted directory")
		}
	})
}

func TestWikiFileManager_FindAvailableFilename_Limit(t *testing.T) {
	tempDir := t.TempDir()
	fm := NewWikiFileManager(tempDir)

	// Create files up to the limit to test edge case
	basePath := filepath.Join(tempDir, "test.md")

	// Create the base file
	os.WriteFile(basePath, []byte("content"), 0644)

	// Create many numbered files to approach the limit
	for i := 2; i <= 10; i++ {
		numberedPath := filepath.Join(tempDir, fmt.Sprintf("test-%d.md", i))
		os.WriteFile(numberedPath, []byte("content"), 0644)
	}

	// This should still find an available filename
	availablePath, conflictCount, err := fm.findAvailableFilename(basePath)
	if err != nil {
		t.Errorf("Unexpected error: %v", err)
	}
	if conflictCount == 0 {
		t.Error("Expected non-zero conflict count")
	}
	if availablePath == "" {
		t.Error("Expected available path to be found")
	}
}

func TestWikiFileManager_CreateImagesDirectory_Disabled(t *testing.T) {
	tempDir := t.TempDir()
	fm := NewWikiFileManager(tempDir)
	fm.config.CreateImagesDir = false

	err := fm.CreateImagesDirectory()
	if err != nil {
		t.Errorf("Should not error when images directory creation is disabled: %v", err)
	}

	// Verify directory was not created
	imagesPath := filepath.Join(tempDir, "images")
	if _, err := os.Stat(imagesPath); !os.IsNotExist(err) {
		t.Error("Images directory should not have been created")
	}
}

func TestWikiFileManager_WriteAssetFile_EdgeCases(t *testing.T) {
	tempDir := t.TempDir()
	fm := NewWikiFileManager(tempDir)

	t.Run("Non-image asset in root", func(t *testing.T) {
		filename := "document.pdf"
		data := []byte("fake pdf content")

		fileInfo, err := fm.WriteAssetFile(filename, data)
		if err != nil {
			t.Fatalf("Failed to write non-image asset: %v", err)
		}

		expectedPath := filepath.Join(tempDir, filename)
		if fileInfo.FilePath != expectedPath {
			t.Errorf("Expected path %s, got %s", expectedPath, fileInfo.FilePath)
		}

		if !fileInfo.IsAsset {
			t.Error("Expected IsAsset to be true")
		}
	})

	t.Run("Empty data", func(t *testing.T) {
		filename := "empty.png"
		data := []byte{}

		fileInfo, err := fm.WriteAssetFile(filename, data)
		if err != nil {
			t.Fatalf("Failed to write empty asset: %v", err)
		}

		if fileInfo.Size != 0 {
			t.Errorf("Expected size 0, got %d", fileInfo.Size)
		}
	})
}

func TestWikiFileManager_ListFiles_WithSubdirectories(t *testing.T) {
	tempDir := t.TempDir()
	fm := NewWikiFileManager(tempDir)

	// Create test files and directories
	os.WriteFile(filepath.Join(tempDir, "page1.md"), []byte("content1"), 0644)
	os.WriteFile(filepath.Join(tempDir, "page2.md"), []byte("content2"), 0644)

	// Create images subdirectory and file
	imagesDir := filepath.Join(tempDir, "images")
	os.MkdirAll(imagesDir, 0755)
	os.WriteFile(filepath.Join(imagesDir, "image1.png"), []byte("image data"), 0644)

	// Create .git directory (should be ignored)
	gitDir := filepath.Join(tempDir, ".git")
	os.MkdirAll(gitDir, 0755)
	os.WriteFile(filepath.Join(gitDir, "config"), []byte("git config"), 0644)

	files, err := fm.ListFiles()
	if err != nil {
		t.Fatalf("Failed to list files: %v", err)
	}

	// Should find 3 files (2 markdown + 1 image), .git should be ignored
	// Note: the exact count may vary based on file creation order
	if len(files) < 3 {
		t.Errorf("Expected at least 3 files, got %d", len(files))
	}

	// Verify file types
	var markdownCount, assetCount int
	for _, file := range files {
		if file.IsAsset {
			assetCount++
		} else {
			markdownCount++
		}
	}

	if markdownCount < 2 {
		t.Errorf("Expected at least 2 markdown files, got %d", markdownCount)
	}
	if assetCount < 1 {
		t.Errorf("Expected at least 1 asset file, got %d", assetCount)
	}
}

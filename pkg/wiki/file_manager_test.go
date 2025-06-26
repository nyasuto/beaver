package wiki

import (
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

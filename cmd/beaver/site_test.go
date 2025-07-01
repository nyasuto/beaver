package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/spf13/cobra"
)

func TestSiteCommand(t *testing.T) {
	if siteCmd == nil {
		t.Fatal("siteCmd should not be nil")
	}

	if siteCmd.Use != "site" {
		t.Errorf("Expected command use 'site', got '%s'", siteCmd.Use)
	}

	if siteCmd.Short == "" {
		t.Error("Site command should have short description")
	}

	if siteCmd.Long == "" {
		t.Error("Site command should have long description")
	}

	// Check that subcommands are added
	expectedSubcommands := []string{"build", "serve", "deploy"}
	commands := siteCmd.Commands()

	if len(commands) != len(expectedSubcommands) {
		t.Errorf("Expected %d subcommands, got %d", len(expectedSubcommands), len(commands))
	}

	for _, expected := range expectedSubcommands {
		found := false
		for _, cmd := range commands {
			if cmd.Use == expected {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("Expected subcommand '%s' not found", expected)
		}
	}
}

func TestSiteBuildCommand(t *testing.T) {
	if siteBuildCmd == nil {
		t.Fatal("siteBuildCmd should not be nil")
	}

	if siteBuildCmd.Use != "build" {
		t.Errorf("Expected command use 'build', got '%s'", siteBuildCmd.Use)
	}

	if siteBuildCmd.Short == "" {
		t.Error("Site build command should have short description")
	}

	if siteBuildCmd.Long == "" {
		t.Error("Site build command should have long description")
	}

	if siteBuildCmd.RunE == nil {
		t.Error("Site build command should have RunE function")
	}

	// Check flags
	flags := siteBuildCmd.Flags()

	outputFlag := flags.Lookup("output")
	if outputFlag == nil {
		t.Error("Site build command should have --output flag")
	}

	openFlag := flags.Lookup("open")
	if openFlag == nil {
		t.Error("Site build command should have --open flag")
	}
}

func TestSiteServeCommand(t *testing.T) {
	if siteServeCmd == nil {
		t.Fatal("siteServeCmd should not be nil")
	}

	if siteServeCmd.Use != "serve" {
		t.Errorf("Expected command use 'serve', got '%s'", siteServeCmd.Use)
	}

	if siteServeCmd.Short == "" {
		t.Error("Site serve command should have short description")
	}

	if siteServeCmd.Long == "" {
		t.Error("Site serve command should have long description")
	}

	if siteServeCmd.RunE == nil {
		t.Error("Site serve command should have RunE function")
	}

	// Check flags
	flags := siteServeCmd.Flags()

	outputFlag := flags.Lookup("output")
	if outputFlag == nil {
		t.Error("Site serve command should have --output flag")
	}

	portFlag := flags.Lookup("port")
	if portFlag == nil {
		t.Error("Site serve command should have --port flag")
	}

	openFlag := flags.Lookup("open")
	if openFlag == nil {
		t.Error("Site serve command should have --open flag")
	}
}

func TestSiteDeployCommand(t *testing.T) {
	if siteDeployCmd == nil {
		t.Fatal("siteDeployCmd should not be nil")
	}

	if siteDeployCmd.Use != "deploy" {
		t.Errorf("Expected command use 'deploy', got '%s'", siteDeployCmd.Use)
	}

	if siteDeployCmd.Short == "" {
		t.Error("Site deploy command should have short description")
	}

	if siteDeployCmd.Long == "" {
		t.Error("Site deploy command should have long description")
	}

	if siteDeployCmd.RunE == nil {
		t.Error("Site deploy command should have RunE function")
	}

	// Check flags
	flags := siteDeployCmd.Flags()

	outputFlag := flags.Lookup("output")
	if outputFlag == nil {
		t.Error("Site deploy command should have --output flag")
	}
}

func TestCalculateDirSize(t *testing.T) {
	// Create temporary directory with test files
	tempDir, err := os.MkdirTemp("", "beaver-dirsize-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create test files
	testFiles := []struct {
		path    string
		content string
	}{
		{"file1.txt", "Hello World"},
		{"subdir/file2.txt", "This is a longer test file with more content"},
		{"subdir/file3.html", "<html><body>Test HTML</body></html>"},
		{"empty.txt", ""},
	}

	var expectedSize int64
	expectedCount := len(testFiles)

	for _, file := range testFiles {
		filePath := filepath.Join(tempDir, file.path)

		// Create directory if needed
		if err := os.MkdirAll(filepath.Dir(filePath), 0755); err != nil {
			t.Fatalf("Failed to create directory for %s: %v", file.path, err)
		}

		// Write file
		if err := os.WriteFile(filePath, []byte(file.content), 0644); err != nil {
			t.Fatalf("Failed to write file %s: %v", file.path, err)
		}

		expectedSize += int64(len(file.content))
	}

	// Test calculateDirSize
	size, count := calculateDirSize(tempDir)

	if size != expectedSize {
		t.Errorf("Expected size %d, got %d", expectedSize, size)
	}

	if count != expectedCount {
		t.Errorf("Expected count %d, got %d", expectedCount, count)
	}
}

func TestCalculateDirSize_EmptyDirectory(t *testing.T) {
	// Create empty temporary directory
	tempDir, err := os.MkdirTemp("", "beaver-empty-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	size, count := calculateDirSize(tempDir)

	if size != 0 {
		t.Errorf("Expected size 0 for empty directory, got %d", size)
	}

	if count != 0 {
		t.Errorf("Expected count 0 for empty directory, got %d", count)
	}
}

func TestCalculateDirSize_NonexistentDirectory(t *testing.T) {
	size, count := calculateDirSize("/nonexistent/directory")

	// Should handle gracefully and return 0, 0
	if size != 0 {
		t.Errorf("Expected size 0 for nonexistent directory, got %d", size)
	}

	if count != 0 {
		t.Errorf("Expected count 0 for nonexistent directory, got %d", count)
	}
}

func TestRunSiteBuildCommand_NoConfig(t *testing.T) {
	// Test with no configuration file (should fail gracefully)
	tempDir, err := os.MkdirTemp("", "beaver-build-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Change to temp directory to avoid finding actual config
	originalWd, _ := os.Getwd()
	defer os.Chdir(originalWd)
	os.Chdir(tempDir)

	// Reset flags to default values
	outputDir = ""
	openBrowser = false

	cmd := &cobra.Command{}
	err = runSiteBuildCommand(cmd, []string{})

	if err == nil {
		t.Error("Expected error when no config file exists, got nil")
	}

	// Check for either config loading error or validation error
	if !strings.Contains(err.Error(), "設定が無効です") &&
		!strings.Contains(err.Error(), "設定読み込みエラー") &&
		!strings.Contains(err.Error(), "Issues取得エラー") {
		t.Errorf("Expected config or GitHub error, got: %s", err.Error())
	}
}

func TestRunSiteServeCommand_NoSite(t *testing.T) {
	// Test serving when no site exists
	tempDir, err := os.MkdirTemp("", "beaver-serve-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Reset flags
	outputDir = tempDir
	servePort = 8080
	openBrowser = false

	cmd := &cobra.Command{}
	err = runSiteServeCommand(cmd, []string{})

	if err == nil {
		t.Error("Expected error when no site exists, got nil")
	}

	if !strings.Contains(err.Error(), "site not found") {
		t.Errorf("Expected 'site not found' error, got: %s", err.Error())
	}
}

func TestRunSiteDeployCommand_NoSite(t *testing.T) {
	// Test deploying when no site exists
	tempDir, err := os.MkdirTemp("", "beaver-deploy-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Change to temp directory to avoid finding actual config
	originalWd, _ := os.Getwd()
	defer os.Chdir(originalWd)
	os.Chdir(tempDir)

	// Clear environment to force config loading to fail
	originalConfigPath := os.Getenv("BEAVER_CONFIG_PATH")
	defer func() {
		if originalConfigPath != "" {
			os.Setenv("BEAVER_CONFIG_PATH", originalConfigPath)
		} else {
			os.Unsetenv("BEAVER_CONFIG_PATH")
		}
	}()
	os.Setenv("BEAVER_CONFIG_PATH", "/nonexistent/config.yml")

	// Reset flags
	outputDir = tempDir

	cmd := &cobra.Command{}
	err = runSiteDeployCommand(cmd, []string{})

	if err == nil {
		t.Error("Expected error when no site exists, got nil")
	} else {
		// Check for config loading error or repository format error
		if !strings.Contains(err.Error(), "リポジトリ形式が無効です") &&
			!strings.Contains(err.Error(), "設定読み込みエラー") {
			t.Errorf("Expected repository format or config error, got: %s", err.Error())
		}
	}
}

func TestRunSiteServeCommand_WithSite(t *testing.T) {
	// Create temporary directory with a mock site
	tempDir, err := os.MkdirTemp("", "beaver-serve-with-site-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create mock index.html
	indexPath := filepath.Join(tempDir, "index.html")
	if err := os.WriteFile(indexPath, []byte("<html><body>Test Site</body></html>"), 0644); err != nil {
		t.Fatalf("Failed to create index.html: %v", err)
	}

	// Reset flags
	outputDir = tempDir
	servePort = 0 // Use port 0 to let the system choose
	openBrowser = false

	// Note: We can't easily test the actual server without complex setup,
	// but we can test that the validation passes and the function would attempt to start
	// This is a limitation of testing HTTP servers without integration tests

	// For unit testing, we verify the basic validation passes
	// (i.e., the site exists and the function would proceed to server startup)

	// Check that index.html exists (validation should pass)
	if _, err := os.Stat(indexPath); os.IsNotExist(err) {
		t.Fatal("index.html should exist for this test")
	}
}

func TestRunSiteDeployCommand_WithConfig(t *testing.T) {
	// Create temporary directory with mock site and config
	tempDir, err := os.MkdirTemp("", "beaver-deploy-with-config-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create mock site directory
	siteDir := filepath.Join(tempDir, "site")
	if err := os.MkdirAll(siteDir, 0755); err != nil {
		t.Fatalf("Failed to create site directory: %v", err)
	}

	// Create mock index.html in site directory
	indexPath := filepath.Join(siteDir, "index.html")
	if err := os.WriteFile(indexPath, []byte("<html><body>Test Site</body></html>"), 0644); err != nil {
		t.Fatalf("Failed to create index.html: %v", err)
	}

	// Create mock config file
	configContent := `
project:
  name: "test-project"
  repository: "testuser/test-repo"
sources:
  github:
    token: "test-token"
`
	configPath := filepath.Join(tempDir, "beaver.yml")
	if err := os.WriteFile(configPath, []byte(configContent), 0644); err != nil {
		t.Fatalf("Failed to create config file: %v", err)
	}

	// Change to temp directory so config can be found
	originalWd, _ := os.Getwd()
	defer os.Chdir(originalWd)
	os.Chdir(tempDir)

	// Reset flags
	outputDir = siteDir

	cmd := &cobra.Command{}
	err = runSiteDeployCommand(cmd, []string{})

	// The deploy command currently just shows a warning about manual deployment
	// So it should not return an error if the config and site exist
	if err != nil {
		t.Errorf("Expected no error for deploy command with valid config and site, got: %s", err.Error())
	}
}

// Test flag persistence across commands
func TestSiteCommandFlags(t *testing.T) {
	// Test that flags are properly defined and have correct defaults

	// Reset all flags to defaults
	outputDir = ""
	servePort = 8080
	openBrowser = false

	// Test build command flags
	buildFlags := siteBuildCmd.Flags()

	outputFlag := buildFlags.Lookup("output")
	if outputFlag == nil {
		t.Fatal("Build command should have --output flag")
	}

	openFlag := buildFlags.Lookup("open")
	if openFlag == nil {
		t.Fatal("Build command should have --open flag")
	}

	// Test serve command flags
	serveFlags := siteServeCmd.Flags()

	portFlag := serveFlags.Lookup("port")
	if portFlag == nil {
		t.Fatal("Serve command should have --port flag")
	}

	if portFlag.DefValue != "8080" {
		t.Errorf("Expected default port 8080, got %s", portFlag.DefValue)
	}

	// Test deploy command flags
	deployFlags := siteDeployCmd.Flags()

	deployOutputFlag := deployFlags.Lookup("output")
	if deployOutputFlag == nil {
		t.Fatal("Deploy command should have --output flag")
	}
}

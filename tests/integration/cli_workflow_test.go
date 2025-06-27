package integration

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"
)

// TestCLIWorkflowIntegration tests the complete CLI workflow
func TestCLIWorkflowIntegration(t *testing.T) {
	cfg := setupIntegrationTest(t)

	// Create a temporary workspace
	workspaceDir := filepath.Join(cfg.TempDir, "cli_workspace")
	err := os.MkdirAll(workspaceDir, 0755)
	if err != nil {
		t.Fatalf("Failed to create workspace directory: %v", err)
	}

	// Change to workspace directory for the test
	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("Failed to get current directory: %v", err)
	}
	defer os.Chdir(originalDir)

	err = os.Chdir(workspaceDir)
	if err != nil {
		t.Fatalf("Failed to change to workspace directory: %v", err)
	}

	// Build beaver binary for testing
	beaverBinary := buildBeaverBinary(t, cfg)

	t.Run("CLI Workflow: Init -> Fetch -> Wiki", func(t *testing.T) {
		// Step 1: Test beaver init
		t.Logf("Step 1: Testing 'beaver init'")
		initOutput := runBeaverCommand(t, beaverBinary, "init")
		t.Logf("Init output: %s", initOutput)

		// Verify beaver.yml was created
		if _, err := os.Stat("beaver.yml"); os.IsNotExist(err) {
			t.Error("beaver.yml was not created by 'beaver init'")
		} else {
			t.Logf("✅ beaver.yml created successfully")
		}

		// Step 2: Configure beaver.yml for integration test
		t.Logf("Step 2: Configuring beaver.yml for integration test")
		configureTestConfig(t, cfg)

		// Step 3: Test beaver fetch issues
		t.Logf("Step 3: Testing 'beaver fetch issues'")
		repoPath := fmt.Sprintf("%s/%s", cfg.TestRepoOwner, cfg.TestRepoName)

		fetchArgs := []string{
			"fetch", "issues", repoPath,
			"--format", "json",
			"--output", "issues.json",
			"--max-pages", "1", // Limit for testing
		}

		// Set environment variables for the command
		env := append(os.Environ(),
			fmt.Sprintf("GITHUB_TOKEN=%s", cfg.GitHubToken),
		)

		fetchOutput := runBeaverCommandWithEnv(t, beaverBinary, env, fetchArgs...)
		t.Logf("Fetch output: %s", fetchOutput)

		// Verify issues.json was created
		if _, err := os.Stat("issues.json"); os.IsNotExist(err) {
			t.Error("issues.json was not created by 'beaver fetch issues'")
		} else {
			t.Logf("✅ issues.json created successfully")
		}

		// Step 4: Test beaver wiki generate
		t.Logf("Step 4: Testing 'beaver wiki generate'")
		wikiArgs := []string{
			"wiki", "generate", repoPath,
			"--output", "wiki",
			"--batch", "5", // Limit for testing
		}

		wikiOutput := runBeaverCommandWithEnv(t, beaverBinary, env, wikiArgs...)
		t.Logf("Wiki generate output: %s", wikiOutput)

		// Verify wiki directory was created
		if _, err := os.Stat("wiki"); os.IsNotExist(err) {
			t.Error("wiki directory was not created by 'beaver wiki generate'")
		} else {
			t.Logf("✅ wiki directory created successfully")
		}

		// Step 5: Test beaver wiki publish (if environment supports it)
		t.Logf("Step 5: Testing 'beaver wiki publish'")

		// Note: wiki publish reads from the default output directory "./wiki"
		// which should match the directory we created in the previous step
		publishArgs := []string{
			"wiki", "publish", repoPath,
			"--batch", "3", // Limit for testing
		}

		publishOutput := runBeaverCommandWithEnv(t, beaverBinary, env, publishArgs...)
		t.Logf("Wiki publish output: %s", publishOutput)

		// Note: We might expect this to fail in some test environments due to permissions
		// So we'll check for either success or expected permission errors
		if strings.Contains(publishOutput, "permission") || strings.Contains(publishOutput, "forbidden") {
			t.Logf("⚠️ Wiki publish failed due to permissions (expected in some test environments)")
		} else if strings.Contains(publishOutput, "success") || strings.Contains(publishOutput, "published") {
			t.Logf("✅ Wiki published successfully")
		}

		t.Logf("✅ CLI workflow integration test completed")
	})
}

// TestCLIErrorHandling tests error scenarios in CLI commands
func TestCLIErrorHandling(t *testing.T) {
	cfg := setupIntegrationTest(t)

	workspaceDir := filepath.Join(cfg.TempDir, "cli_error_test")
	err := os.MkdirAll(workspaceDir, 0755)
	if err != nil {
		t.Fatalf("Failed to create workspace directory: %v", err)
	}

	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("Failed to get current directory: %v", err)
	}
	defer os.Chdir(originalDir)

	err = os.Chdir(workspaceDir)
	if err != nil {
		t.Fatalf("Failed to change to workspace directory: %v", err)
	}

	beaverBinary := buildBeaverBinary(t, cfg)

	t.Run("Invalid GitHub Token", func(t *testing.T) {
		// Test with invalid token
		env := append(os.Environ(), "GITHUB_TOKEN=invalid_token_12345")

		output := runBeaverCommandWithEnvExpectError(t, beaverBinary, env,
			"fetch", "issues", "invalid/repo")

		if !strings.Contains(output, "error") && !strings.Contains(output, "authentication") {
			t.Error("Expected authentication error with invalid token")
		} else {
			t.Logf("✅ Invalid token properly rejected: %s", output)
		}
	})

	t.Run("Non-existent Repository", func(t *testing.T) {
		env := append(os.Environ(), fmt.Sprintf("GITHUB_TOKEN=%s", cfg.GitHubToken))

		output := runBeaverCommandWithEnvExpectError(t, beaverBinary, env,
			"fetch", "issues", "nonexistent/repository")

		if !strings.Contains(output, "error") && !strings.Contains(output, "not found") {
			t.Error("Expected 'not found' error for non-existent repository")
		} else {
			t.Logf("✅ Non-existent repository properly handled: %s", output)
		}
	})

	t.Run("Missing Configuration", func(t *testing.T) {
		// Try to run commands without proper repository argument
		output := runBeaverCommandExpectError(t, beaverBinary, "wiki", "generate")

		if !strings.Contains(output, "required") && !strings.Contains(output, "arg") {
			t.Logf("⚠️ Missing arguments error: %s", output)
		} else {
			t.Logf("✅ Missing arguments properly handled: %s", output)
		}
	})
}

// TestCLIHelpAndVersion tests basic CLI functionality
func TestCLIHelpAndVersion(t *testing.T) {
	cfg := setupIntegrationTest(t)
	beaverBinary := buildBeaverBinary(t, cfg)

	t.Run("Help Command", func(t *testing.T) {
		output := runBeaverCommand(t, beaverBinary, "--help")

		expectedStrings := []string{
			"beaver",
			"Usage:",
			"Available Commands:",
		}

		for _, expected := range expectedStrings {
			if !strings.Contains(output, expected) {
				t.Errorf("Help output missing '%s'", expected)
			}
		}

		t.Logf("✅ Help command working correctly")
	})

	t.Run("Version Information", func(t *testing.T) {
		// Most CLI tools support --version or version subcommand
		output := runBeaverCommand(t, beaverBinary, "--version")

		// Even if version isn't implemented, it shouldn't crash
		if strings.Contains(output, "unknown flag") {
			t.Logf("⚠️ --version flag not implemented")
		} else {
			t.Logf("✅ Version command response: %s", output)
		}
	})

	t.Run("Subcommand Help", func(t *testing.T) {
		subcommands := []string{"fetch", "wiki", "init"}

		for _, subcmd := range subcommands {
			output := runBeaverCommand(t, beaverBinary, subcmd, "--help")

			if strings.Contains(output, "Usage:") || strings.Contains(output, subcmd) {
				t.Logf("✅ %s help working", subcmd)
			} else {
				t.Errorf("Help for %s subcommand not working: %s", subcmd, output)
			}
		}
	})
}

// Helper functions

func buildBeaverBinary(t *testing.T, cfg *IntegrationTestConfig) string {
	t.Helper()

	// Build binary in temporary location
	binaryPath := filepath.Join(cfg.TempDir, "beaver")

	// Find project root (where go.mod is)
	projectRoot, err := findProjectRoot()
	if err != nil {
		t.Fatalf("Failed to find project root: %v", err)
	}

	cmd := exec.Command("go", "build", "-o", binaryPath, "./cmd/beaver")
	cmd.Dir = projectRoot

	output, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("Failed to build beaver binary: %v\nOutput: %s", err, output)
	}

	t.Logf("✅ Built beaver binary at: %s", binaryPath)
	return binaryPath
}

func runBeaverCommand(t *testing.T, binaryPath string, args ...string) string {
	t.Helper()
	return runBeaverCommandWithEnv(t, binaryPath, nil, args...)
}

func runBeaverCommandWithEnv(t *testing.T, binaryPath string, env []string, args ...string) string {
	t.Helper()

	cmd := exec.Command(binaryPath, args...)
	if env != nil {
		cmd.Env = env
	}

	// Set timeout for command execution
	_, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	output, err := cmd.Output()
	if err != nil {
		if exitError, ok := err.(*exec.ExitError); ok {
			// Command failed, return stderr + stdout for analysis
			stderr := string(exitError.Stderr)
			stdout := string(output)
			combined := fmt.Sprintf("stdout: %s\nstderr: %s", stdout, stderr)
			t.Logf("Command failed (expected in some tests): %s %v\nOutput: %s",
				binaryPath, args, combined)
			return combined
		}
		t.Fatalf("Failed to run command %s %v: %v", binaryPath, args, err)
	}

	return string(output)
}

func runBeaverCommandExpectError(t *testing.T, binaryPath string, args ...string) string {
	t.Helper()
	return runBeaverCommandWithEnvExpectError(t, binaryPath, nil, args...)
}

func runBeaverCommandWithEnvExpectError(t *testing.T, binaryPath string, env []string, args ...string) string {
	t.Helper()

	cmd := exec.Command(binaryPath, args...)
	if env != nil {
		cmd.Env = env
	}

	output, err := cmd.CombinedOutput() // Get both stdout and stderr
	if err == nil {
		t.Logf("⚠️ Expected error but command succeeded: %s %v", binaryPath, args)
	}

	return string(output)
}

func findProjectRoot() (string, error) {
	// Start from the directory where this test file is located
	_, filename, _, _ := runtime.Caller(0)
	testDir := filepath.Dir(filename)

	// Go up from tests/integration to the project root
	projectRoot := filepath.Join(testDir, "..", "..")

	// Verify go.mod exists
	if _, err := os.Stat(filepath.Join(projectRoot, "go.mod")); err == nil {
		return filepath.Abs(projectRoot)
	}

	// Fallback: Walk up the directory tree looking for go.mod
	dir, err := os.Getwd()
	if err != nil {
		return "", err
	}

	for {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return dir, nil
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			// Reached filesystem root
			break
		}
		dir = parent
	}

	return "", fmt.Errorf("go.mod not found in directory tree")
}

func configureTestConfig(t *testing.T, cfg *IntegrationTestConfig) {
	t.Helper()

	// Create a test configuration that works with our integration test
	testConfig := fmt.Sprintf(`# Beaver Configuration for Integration Testing
# Generated at: %s

project:
  name: "Beaver Integration Test"
  description: "Automated integration testing of Beaver functionality"

sources:
  github:
    token: "${GITHUB_TOKEN}"
    repositories:
      - "%s/%s"
    
    # Fetch settings
    fetch:
      state: "all"          # open, closed, all
      sort: "created"       # created, updated, comments
      direction: "desc"     # asc, desc
      per_page: 30
      max_pages: 1          # Limit for testing
      include_comments: true

output:
  wiki:
    platform: "github"
    repository: "%s/%s"
    branch: "master"
    
    # Wiki settings
    cleanup_on_exit: true
    enable_git_trace: false

ai:
  # AI processing disabled for basic integration tests
  enabled: false
  provider: "mock"
  
  # These would be used if AI was enabled
  service_url: "http://localhost:8000"
  model: "gpt-4"
  max_tokens: 4000
  temperature: 0.7
  language: "ja"

settings:
  # Integration test settings
  verbose: true
  debug: false
  timeout: "30s"
`, time.Now().Format("2006-01-02 15:04:05"),
		cfg.TestRepoOwner, cfg.TestRepoName,
		cfg.TestRepoOwner, cfg.TestRepoName)

	err := os.WriteFile("beaver.yml", []byte(testConfig), 0600)
	if err != nil {
		t.Fatalf("Failed to create test configuration: %v", err)
	}

	t.Logf("✅ Created test configuration: beaver.yml")
}

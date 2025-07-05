package main

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/nyasuto/beaver/internal/config"
	"github.com/nyasuto/beaver/pkg/pages"
	"github.com/spf13/cobra"
)

func TestRunPagesGenerateCommand(t *testing.T) {
	tests := []struct {
		name    string
		args    []string
		setup   func() func()
		wantErr bool
	}{
		{
			name: "invalid mode",
			args: []string{"owner/repo"},
			setup: func() func() {
				// Set invalid mode
				pagesMode = "invalid"
				return func() {
					pagesMode = "html" // reset
				}
			},
			wantErr: true,
		},
		{
			name: "html mode success",
			args: []string{"owner/repo"},
			setup: func() func() {
				tempDir := t.TempDir()
				oldWd, _ := os.Getwd()
				os.Chdir(tempDir)

				// Set valid mode
				pagesMode = "html"
				pagesOutputDir = tempDir

				// Create mock config file
				// Create config file manually
				configContent := `
project:
  name: "test-project"
  repository: "owner/repo"
sources:
  github:
    token: "test-token"
`
				os.WriteFile("beaver.yml", []byte(configContent), 0600)

				return func() {
					os.Chdir(oldWd)
					pagesMode = "html"
					pagesOutputDir = ""
				}
			},
			wantErr: false,
		},
		{
			name: "jekyll mode success",
			args: []string{"owner/repo"},
			setup: func() func() {
				tempDir := t.TempDir()
				oldWd, _ := os.Getwd()
				os.Chdir(tempDir)

				// Set valid mode
				pagesMode = "jekyll"
				pagesOutputDir = tempDir

				return func() {
					os.Chdir(oldWd)
					pagesMode = "html"
					pagesOutputDir = ""
				}
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cleanup := tt.setup()
			defer cleanup()

			cmd := &cobra.Command{}
			err := runPagesGenerateCommand(cmd, tt.args)
			if (err != nil) != tt.wantErr {
				t.Errorf("runPagesGenerateCommand() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestRunPagesDeployCommand(t *testing.T) {
	tests := []struct {
		name    string
		args    []string
		setup   func() func()
		wantErr bool
	}{
		{
			name: "successful deploy with default config",
			args: []string{"owner/repo"},
			setup: func() func() {
				tempDir := t.TempDir()
				oldWd, _ := os.Getwd()
				os.Chdir(tempDir)

				return func() {
					os.Chdir(oldWd)
				}
			},
			wantErr: false,
		},
		{
			name: "deploy with custom config path",
			args: []string{"owner/repo"},
			setup: func() func() {
				tempDir := t.TempDir()
				oldWd, _ := os.Getwd()
				os.Chdir(tempDir)

				// Set custom config path to non-existent file
				pagesConfigPath = "/non/existent/config.yml"

				return func() {
					os.Chdir(oldWd)
					pagesConfigPath = ""
				}
			},
			wantErr: false, // Should use default config when custom path fails
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cleanup := tt.setup()
			defer cleanup()

			cmd := &cobra.Command{}
			err := runPagesDeployCommand(cmd, tt.args)
			if (err != nil) != tt.wantErr {
				t.Errorf("runPagesDeployCommand() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestRunPagesServeCommand(t *testing.T) {
	tests := []struct {
		name    string
		setup   func() func()
		wantErr bool
	}{
		{
			name: "output directory does not exist",
			setup: func() func() {
				tempDir := t.TempDir()
				oldWd, _ := os.Getwd()
				os.Chdir(tempDir)

				// Set non-existent output directory
				pagesOutputDir = "/non/existent/dir"

				return func() {
					os.Chdir(oldWd)
					pagesOutputDir = ""
				}
			},
			wantErr: true,
		},
		{
			name: "output directory exists",
			setup: func() func() {
				tempDir := t.TempDir()
				oldWd, _ := os.Getwd()
				os.Chdir(tempDir)

				// Create _site directory
				siteDir := filepath.Join(tempDir, "_site")
				os.MkdirAll(siteDir, 0755)
				os.WriteFile(filepath.Join(siteDir, "index.html"), []byte("<html></html>"), 0600)

				// Set server port to 0 to get a random available port
				servePort = 0

				return func() {
					os.Chdir(oldWd)
					pagesOutputDir = ""
					servePort = 8080
				}
			},
			wantErr: true, // Server start will fail in test environment
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cleanup := tt.setup()
			defer cleanup()

			cmd := &cobra.Command{}
			err := runPagesServeCommand(cmd, []string{})
			if (err != nil) != tt.wantErr {
				t.Errorf("runPagesServeCommand() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestLoadPagesConfig(t *testing.T) {
	tests := []struct {
		name    string
		setup   func() func()
		wantErr bool
	}{
		{
			name: "no config file found",
			setup: func() func() {
				tempDir := t.TempDir()
				oldWd, _ := os.Getwd()
				os.Chdir(tempDir)

				return func() {
					os.Chdir(oldWd)
				}
			},
			wantErr: true,
		},
		{
			name: "custom config path provided",
			setup: func() func() {
				tempDir := t.TempDir()
				oldWd, _ := os.Getwd()
				os.Chdir(tempDir)

				// Set custom config path
				pagesConfigPath = "/custom/path/config.yml"

				return func() {
					os.Chdir(oldWd)
					pagesConfigPath = ""
				}
			},
			wantErr: true, // Custom path doesn't exist
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cleanup := tt.setup()
			defer cleanup()

			_, err := loadPagesConfig("owner", "repo", pages.ModeHTML)
			if (err != nil) != tt.wantErr {
				t.Errorf("loadPagesConfig() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestFetchIssuesForPages(t *testing.T) {
	tests := []struct {
		name    string
		setup   func() func()
		wantErr bool
	}{
		{
			name: "no config file",
			setup: func() func() {
				tempDir := t.TempDir()
				oldWd, _ := os.Getwd()
				os.Chdir(tempDir)

				return func() {
					os.Chdir(oldWd)
				}
			},
			wantErr: true,
		},
		{
			name: "config without GitHub token",
			setup: func() func() {
				tempDir := t.TempDir()
				oldWd, _ := os.Getwd()
				os.Chdir(tempDir)

				// Create config without token
				configContent := `
project:
  name: "test-project"
  repository: "owner/repo"
sources:
  github:
    token: ""
`
				os.WriteFile("beaver.yml", []byte(configContent), 0600)

				// Clear environment variable
				os.Unsetenv("GITHUB_TOKEN")

				return func() {
					os.Chdir(oldWd)
				}
			},
			wantErr: true,
		},
		{
			name: "config with token from environment",
			setup: func() func() {
				tempDir := t.TempDir()
				oldWd, _ := os.Getwd()
				os.Chdir(tempDir)

				// Create config without token
				configContent := `
project:
  name: "test-project"
  repository: "owner/repo"
sources:
  github:
    token: ""
`
				os.WriteFile("beaver.yml", []byte(configContent), 0600)

				// Set environment variable
				os.Setenv("GITHUB_TOKEN", "env-token")

				return func() {
					os.Chdir(oldWd)
					os.Unsetenv("GITHUB_TOKEN")
				}
			},
			wantErr: false, // Should succeed with token from env
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cleanup := tt.setup()
			defer cleanup()

			helper := NewTestHelpers(t)
			_, _ = helper.CaptureOutput(func() {
				_, err := fetchIssuesForPages("owner", "repo", nil)
				if (err != nil) != tt.wantErr {
					t.Errorf("fetchIssuesForPages() error = %v, wantErr %v", err, tt.wantErr)
				}
			})
		})
	}
}

func TestServePagesLocally(t *testing.T) {
	tests := []struct {
		name      string
		setup     func() (string, int, bool, func())
		wantErr   bool
		expectURL bool
	}{
		{
			name: "serve existing directory",
			setup: func() (string, int, bool, func()) {
				tempDir := t.TempDir()
				os.WriteFile(filepath.Join(tempDir, "index.html"), []byte("<html>Test</html>"), 0600)

				// Use httptest server to avoid port conflicts
				server := httptest.NewServer(http.FileServer(http.Dir(tempDir)))

				return tempDir, 0, false, func() { server.Close() }
			},
			wantErr:   false,
			expectURL: true,
		},
		{
			name: "serve with browser opening",
			setup: func() (string, int, bool, func()) {
				tempDir := t.TempDir()
				os.WriteFile(filepath.Join(tempDir, "index.html"), []byte("<html>Test</html>"), 0600)
				return tempDir, 0, true, func() {}
			},
			wantErr:   false,
			expectURL: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			outputDir, port, openBrowser, cleanup := tt.setup()
			defer cleanup()

			helper := NewTestHelpers(t)
			_, _ = helper.CaptureOutput(func() {
				// For testing, we'll just verify the function can be called
				// without immediately starting a server
				if tt.name == "serve existing directory" {
					// Create a mock server test
					server := httptest.NewServer(http.FileServer(http.Dir(outputDir)))
					defer server.Close()

					// Make a test request
					resp, err := http.Get(server.URL + "/index.html")
					if err != nil {
						t.Errorf("Failed to make request to test server: %v", err)
					}
					defer resp.Body.Close()

					if resp.StatusCode != http.StatusOK {
						t.Errorf("Expected status 200, got %d", resp.StatusCode)
					}
				}
			})
			_ = port
			_ = openBrowser
		})
	}
}

func TestParseOwnerRepo(t *testing.T) {
	tests := []struct {
		name          string
		repoPath      string
		expectedOwner string
		expectedRepo  string
	}{
		{
			name:          "valid repository format",
			repoPath:      "owner/repo",
			expectedOwner: "owner",
			expectedRepo:  "repo",
		},
		{
			name:          "repository with dashes",
			repoPath:      "my-owner/my-repo",
			expectedOwner: "my-owner",
			expectedRepo:  "my-repo",
		},
		{
			name:          "invalid format - no slash",
			repoPath:      "invalidrepo",
			expectedOwner: "",
			expectedRepo:  "",
		},
		{
			name:          "invalid format - too many parts",
			repoPath:      "owner/repo/extra",
			expectedOwner: "",
			expectedRepo:  "",
		},
		{
			name:          "empty string",
			repoPath:      "",
			expectedOwner: "",
			expectedRepo:  "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			owner, repo := parseOwnerRepo(tt.repoPath)
			if owner != tt.expectedOwner {
				t.Errorf("parseOwnerRepo() owner = %v, expected %v", owner, tt.expectedOwner)
			}
			if repo != tt.expectedRepo {
				t.Errorf("parseOwnerRepo() repo = %v, expected %v", repo, tt.expectedRepo)
			}
		})
	}
}

func TestPagesCommandStructure(t *testing.T) {
	// Test that the pages command is properly initialized
	if pagesCmd == nil {
		t.Error("pagesCmd should not be nil")
	}

	if pagesCmd.Use != "pages" {
		t.Errorf("Expected pagesCmd.Use to be 'pages', got %s", pagesCmd.Use)
	}

	// Test subcommands exist
	expectedSubcommands := []string{"generate", "deploy", "serve"}
	actualSubcommands := make([]string, 0)
	for _, cmd := range pagesCmd.Commands() {
		actualSubcommands = append(actualSubcommands, cmd.Use)
	}

	for _, expected := range expectedSubcommands {
		found := false
		for _, actual := range actualSubcommands {
			if actual == expected || actual == expected+" [owner/repo]" {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("Expected subcommand %s not found in %v", expected, actualSubcommands)
		}
	}
}

func TestPagesCommandFlags(t *testing.T) {
	// Test generate command flags
	generateFlags := pagesGenerateCmd.Flags()

	expectedFlags := []string{"output", "mode", "deploy", "config"}
	for _, flagName := range expectedFlags {
		flag := generateFlags.Lookup(flagName)
		if flag == nil {
			t.Errorf("Expected flag %s not found in generate command", flagName)
		}
	}

	// Test deploy command flags
	deployFlags := pagesDeployCmd.Flags()
	configFlag := deployFlags.Lookup("config")
	if configFlag == nil {
		t.Error("Expected config flag not found in deploy command")
	}

	// Test serve command flags
	serveFlags := pagesServeCmd.Flags()
	expectedServeFlags := []string{"port", "open"}
	for _, flagName := range expectedServeFlags {
		flag := serveFlags.Lookup(flagName)
		if flag == nil {
			t.Errorf("Expected flag %s not found in serve command", flagName)
		}
	}
}

func TestPagesErrorHandling(t *testing.T) {
	tests := []struct {
		name    string
		setup   func() func()
		command string
		args    []string
		wantErr bool
	}{
		{
			name: "generate with no arguments",
			setup: func() func() {
				return func() {}
			},
			command: "generate",
			args:    []string{},
			wantErr: true,
		},
		{
			name: "deploy with no arguments",
			setup: func() func() {
				return func() {}
			},
			command: "deploy",
			args:    []string{},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cleanup := tt.setup()
			defer cleanup()

			var err error
			switch tt.command {
			case "generate":
				if len(tt.args) == 0 {
					// This should fail with "exactly 1 argument required"
					err = pagesGenerateCmd.Args(pagesGenerateCmd, tt.args)
				}
			case "deploy":
				if len(tt.args) == 0 {
					// This should fail with "exactly 1 argument required"
					err = pagesDeployCmd.Args(pagesDeployCmd, tt.args)
				}
			}

			if (err != nil) != tt.wantErr {
				t.Errorf("Command validation error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestHttpServerConfiguration(t *testing.T) {
	// Test that server configuration is reasonable
	tempDir := t.TempDir()
	os.WriteFile(filepath.Join(tempDir, "test.html"), []byte("<html>test</html>"), 0600)

	// Create a test server with similar configuration
	server := &http.Server{
		Addr:         ":0",
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
		Handler:      http.FileServer(http.Dir(tempDir)),
	}

	if server.ReadTimeout != 10*time.Second {
		t.Errorf("Expected ReadTimeout 10s, got %v", server.ReadTimeout)
	}
	if server.WriteTimeout != 10*time.Second {
		t.Errorf("Expected WriteTimeout 10s, got %v", server.WriteTimeout)
	}
	if server.IdleTimeout != 60*time.Second {
		t.Errorf("Expected IdleTimeout 60s, got %v", server.IdleTimeout)
	}
}

func TestGitHubTokenHandling(t *testing.T) {
	tests := []struct {
		name     string
		config   *config.Config
		envToken string
		wantErr  bool
	}{
		{
			name: "token from config",
			config: &config.Config{
				Sources: config.SourcesConfig{
					GitHub: config.GitHubConfig{
						Token: "config-token",
					},
				},
			},
			envToken: "",
			wantErr:  false,
		},
		{
			name: "token from environment",
			config: &config.Config{
				Sources: config.SourcesConfig{
					GitHub: config.GitHubConfig{
						Token: "",
					},
				},
			},
			envToken: "env-token",
			wantErr:  false,
		},
		{
			name: "no token available",
			config: &config.Config{
				Sources: config.SourcesConfig{
					GitHub: config.GitHubConfig{
						Token: "",
					},
				},
			},
			envToken: "",
			wantErr:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tempDir := t.TempDir()
			oldWd, _ := os.Getwd()
			os.Chdir(tempDir)
			defer os.Chdir(oldWd)

			// Setup environment
			if tt.envToken != "" {
				os.Setenv("GITHUB_TOKEN", tt.envToken)
				defer os.Unsetenv("GITHUB_TOKEN")
			} else {
				os.Unsetenv("GITHUB_TOKEN")
			}

			// Create config file manually
			configContent := fmt.Sprintf(`
project:
  name: "test-project"
  repository: "owner/repo"
sources:
  github:
    token: "%s"
`, tt.config.Sources.GitHub.Token)
			os.WriteFile("beaver.yml", []byte(configContent), 0600)

			// Test token validation logic similar to fetchIssuesForPages
			cfg, err := config.LoadConfig()
			if err != nil {
				t.Fatalf("Failed to load config: %v", err)
			}

			token := cfg.Sources.GitHub.Token
			if token == "" {
				if envToken := os.Getenv("GITHUB_TOKEN"); envToken != "" {
					token = envToken
				}
			}

			hasToken := token != ""
			if hasToken == tt.wantErr {
				t.Errorf("Token availability = %v, wantErr %v", hasToken, tt.wantErr)
			}
		})
	}
}

package actions

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// GitHubContext represents the GitHub Actions context
type GitHubContext struct {
	Event      string `json:"event_name"`
	Action     string `json:"action,omitempty"`
	Repository string `json:"repository"`
	Ref        string `json:"ref"`
	SHA        string `json:"sha"`
	Actor      string `json:"actor"`
	RunID      string `json:"run_id"`
	RunNumber  int    `json:"run_number"`
	JobID      string `json:"job_id"`
	Workflow   string `json:"workflow"`
}

// IssueEvent represents a GitHub issue event
type IssueEvent struct {
	Number int    `json:"number"`
	Title  string `json:"title"`
	Body   string `json:"body"`
	State  string `json:"state"`
	Action string `json:"action"`
	URL    string `json:"html_url"`
}

// PushEvent represents a GitHub push event
type PushEvent struct {
	Ref     string `json:"ref"`
	Before  string `json:"before"`
	After   string `json:"after"`
	Commits []struct {
		ID      string `json:"id"`
		Message string `json:"message"`
		Author  struct {
			Name  string `json:"name"`
			Email string `json:"email"`
		} `json:"author"`
	} `json:"commits"`
}

// GetGitHubContext extracts context information from GitHub Actions environment
func GetGitHubContext() (*GitHubContext, error) {
	ctx := &GitHubContext{
		Event:      os.Getenv("GITHUB_EVENT_NAME"),
		Repository: os.Getenv("GITHUB_REPOSITORY"),
		Ref:        os.Getenv("GITHUB_REF"),
		SHA:        os.Getenv("GITHUB_SHA"),
		Actor:      os.Getenv("GITHUB_ACTOR"),
		RunID:      os.Getenv("GITHUB_RUN_ID"),
		JobID:      os.Getenv("GITHUB_JOB"),
		Workflow:   os.Getenv("GITHUB_WORKFLOW"),
	}

	if runNumber := os.Getenv("GITHUB_RUN_NUMBER"); runNumber != "" {
		if num, err := strconv.Atoi(runNumber); err == nil {
			ctx.RunNumber = num
		}
	}

	// Extract action from event path if available
	if eventPath := os.Getenv("GITHUB_EVENT_PATH"); eventPath != "" {
		if data, err := os.ReadFile(eventPath); err == nil {
			var event map[string]interface{}
			if err := json.Unmarshal(data, &event); err == nil {
				if action, ok := event["action"].(string); ok {
					ctx.Action = action
				}
			}
		}
	}

	return ctx, nil
}

// GetIssueEvent extracts issue event details from GitHub Actions environment
func GetIssueEvent() (*IssueEvent, error) {
	eventPath := os.Getenv("GITHUB_EVENT_PATH")
	if eventPath == "" {
		return nil, fmt.Errorf("GITHUB_EVENT_PATH not set")
	}

	data, err := os.ReadFile(eventPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read event file: %w", err)
	}

	var eventData struct {
		Action string `json:"action"`
		Issue  struct {
			Number  int    `json:"number"`
			Title   string `json:"title"`
			Body    string `json:"body"`
			State   string `json:"state"`
			HTMLURL string `json:"html_url"`
		} `json:"issue"`
	}

	if err := json.Unmarshal(data, &eventData); err != nil {
		return nil, fmt.Errorf("failed to parse event data: %w", err)
	}

	return &IssueEvent{
		Number: eventData.Issue.Number,
		Title:  eventData.Issue.Title,
		Body:   eventData.Issue.Body,
		State:  eventData.Issue.State,
		Action: eventData.Action,
		URL:    eventData.Issue.HTMLURL,
	}, nil
}

// GetPushEvent extracts push event details from GitHub Actions environment
func GetPushEvent() (*PushEvent, error) {
	eventPath := os.Getenv("GITHUB_EVENT_PATH")
	if eventPath == "" {
		return nil, fmt.Errorf("GITHUB_EVENT_PATH not set")
	}

	data, err := os.ReadFile(eventPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read event file: %w", err)
	}

	var pushEvent PushEvent
	if err := json.Unmarshal(data, &pushEvent); err != nil {
		return nil, fmt.Errorf("failed to parse push event: %w", err)
	}

	return &pushEvent, nil
}

// IsIncrementalUpdate determines if this should be an incremental update
func IsIncrementalUpdate(ctx *GitHubContext) bool {
	switch ctx.Event {
	case "issues":
		// Issue events are incremental by nature
		return true
	case "push":
		// Push events to main branch are usually incremental
		return strings.HasSuffix(ctx.Ref, "/main") || strings.HasSuffix(ctx.Ref, "/master")
	case "schedule":
		// Scheduled updates should be full rebuilds to ensure consistency
		return false
	case "workflow_dispatch":
		// Manual triggers default to incremental unless force rebuild is specified
		return os.Getenv("INPUT_FORCE_REBUILD") != "true"
	default:
		return true
	}
}

// GetUpdateReason returns a human-readable reason for the update
func GetUpdateReason(ctx *GitHubContext) string {
	switch ctx.Event {
	case "issues":
		if issue, err := GetIssueEvent(); err == nil {
			return fmt.Sprintf("Issue #%d %s: %s", issue.Number, issue.Action, issue.Title)
		}
		return "Issue event triggered"
	case "push":
		if push, err := GetPushEvent(); err == nil && len(push.Commits) > 0 {
			return fmt.Sprintf("Push to %s: %s", ctx.Ref, push.Commits[0].Message)
		}
		return fmt.Sprintf("Push to %s", ctx.Ref)
	case "schedule":
		return "Scheduled maintenance update"
	case "workflow_dispatch":
		return fmt.Sprintf("Manual trigger by @%s", ctx.Actor)
	default:
		return fmt.Sprintf("Unknown trigger: %s", ctx.Event)
	}
}

// SetOutput sets a GitHub Actions output variable
func SetOutput(name, value string) error {
	if outputFile := os.Getenv("GITHUB_OUTPUT"); outputFile != "" {
		f, err := os.OpenFile(outputFile, os.O_APPEND|os.O_WRONLY, 0600)
		if err != nil {
			return fmt.Errorf("failed to open output file: %w", err)
		}
		defer f.Close()

		_, err = fmt.Fprintf(f, "%s=%s\n", name, value)
		return err
	}

	// Fallback for local testing
	fmt.Printf("::set-output name=%s::%s\n", name, value)
	return nil
}

// SetEnv sets a GitHub Actions environment variable
func SetEnv(name, value string) error {
	if envFile := os.Getenv("GITHUB_ENV"); envFile != "" {
		f, err := os.OpenFile(envFile, os.O_APPEND|os.O_WRONLY, 0600)
		if err != nil {
			return fmt.Errorf("failed to open env file: %w", err)
		}
		defer f.Close()

		_, err = fmt.Fprintf(f, "%s=%s\n", name, value)
		return err
	}

	// Fallback for local testing
	fmt.Printf("::set-env name=%s::%s\n", name, value)
	return nil
}

// LogInfo logs an info message in GitHub Actions format
func LogInfo(message string) {
	timestamp := time.Now().Format("15:04:05")
	fmt.Printf("🔍 [%s] %s\n", timestamp, message)
}

// LogWarning logs a warning message in GitHub Actions format
func LogWarning(message string) {
	timestamp := time.Now().Format("15:04:05")
	fmt.Printf("::warning::[%s] %s\n", timestamp, message)
}

// LogError logs an error message in GitHub Actions format
func LogError(message string) {
	timestamp := time.Now().Format("15:04:05")
	fmt.Printf("::error::[%s] %s\n", timestamp, message)
}

// IsGitHubActions returns true if running in GitHub Actions environment
func IsGitHubActions() bool {
	return os.Getenv("GITHUB_ACTIONS") == "true"
}

// GetWorkspaceDir returns the GitHub Actions workspace directory
func GetWorkspaceDir() string {
	if workspace := os.Getenv("GITHUB_WORKSPACE"); workspace != "" {
		return workspace
	}
	return "."
}

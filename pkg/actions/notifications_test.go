package actions

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// Test data generators for notifications
func createTestNotificationConfig() NotificationConfig {
	return NotificationConfig{
		Slack: SlackConfig{
			WebhookURL: "https://hooks.slack.com/test",
			Channel:    "#general",
			Username:   "beaver-bot",
			IconEmoji:  ":robot_face:",
		},
		Teams: TeamsConfig{
			WebhookURL: "https://outlook.office.com/webhook/test",
		},
	}
}

func createTestNotificationGitHubContext() *GitHubContext {
	return &GitHubContext{
		Event:      "issues",
		Action:     "opened",
		Repository: "owner/repo",
		Ref:        "refs/heads/main",
		SHA:        "abc123",
		Actor:      "testuser",
		RunID:      "12345",
		RunNumber:  42,
		JobID:      "job123",
		Workflow:   "Update Wiki",
	}
}

func createTestIssueEvent() *IssueEvent {
	return &IssueEvent{
		Number: 123,
		Title:  "Test Issue",
		Body:   "This is a test issue",
		State:  "open",
		Action: "opened",
		URL:    "https://github.com/owner/repo/issues/123",
	}
}

// Mock HTTP server for testing webhooks
func createMockSlackServer(t *testing.T, expectedStatus int, validateMessage func(*SlackMessage)) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("Expected POST request, got %s", r.Method)
		}

		if r.Header.Get("Content-Type") != "application/json" {
			t.Errorf("Expected Content-Type application/json, got %s", r.Header.Get("Content-Type"))
		}

		var message SlackMessage
		if err := json.NewDecoder(r.Body).Decode(&message); err != nil {
			t.Errorf("Failed to decode Slack message: %v", err)
		}

		if validateMessage != nil {
			validateMessage(&message)
		}

		w.WriteHeader(expectedStatus)
		w.Write([]byte("ok"))
	}))
}

func createMockTeamsServer(t *testing.T, expectedStatus int, validateMessage func(*TeamsMessage)) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("Expected POST request, got %s", r.Method)
		}

		if r.Header.Get("Content-Type") != "application/json" {
			t.Errorf("Expected Content-Type application/json, got %s", r.Header.Get("Content-Type"))
		}

		var message TeamsMessage
		if err := json.NewDecoder(r.Body).Decode(&message); err != nil {
			t.Errorf("Failed to decode Teams message: %v", err)
		}

		if validateMessage != nil {
			validateMessage(&message)
		}

		w.WriteHeader(expectedStatus)
		w.Write([]byte("ok"))
	}))
}

func TestNewNotifier(t *testing.T) {
	config := createTestNotificationConfig()
	notifier := NewNotifier(config)

	if notifier == nil {
		t.Fatal("NewNotifier returned nil")
	}

	if notifier.config.Slack.WebhookURL != config.Slack.WebhookURL {
		t.Errorf("Expected Slack webhook URL %s, got %s", config.Slack.WebhookURL, notifier.config.Slack.WebhookURL)
	}

	if notifier.config.Teams.WebhookURL != config.Teams.WebhookURL {
		t.Errorf("Expected Teams webhook URL %s, got %s", config.Teams.WebhookURL, notifier.config.Teams.WebhookURL)
	}
}

func TestSendWikiUpdateNotification(t *testing.T) {
	t.Run("successful notification to both platforms", func(t *testing.T) {
		// Mock Slack server
		slackServer := createMockSlackServer(t, http.StatusOK, func(msg *SlackMessage) {
			if msg.Channel != "#general" {
				t.Errorf("Expected channel #general, got %s", msg.Channel)
			}
			if msg.Username != "beaver-bot" {
				t.Errorf("Expected username beaver-bot, got %s", msg.Username)
			}
			if len(msg.Attachments) == 0 {
				t.Error("Expected attachments in Slack message")
			}
			if !strings.Contains(msg.Attachments[0].Title, "✅") {
				t.Error("Expected success emoji in title")
			}
		})
		defer slackServer.Close()

		// Mock Teams server
		teamsServer := createMockTeamsServer(t, http.StatusOK, func(msg *TeamsMessage) {
			if msg.Type != "MessageCard" {
				t.Errorf("Expected type MessageCard, got %s", msg.Type)
			}
			if !strings.Contains(msg.Title, "✅") {
				t.Error("Expected success emoji in title")
			}
			if len(msg.Sections) == 0 {
				t.Error("Expected sections in Teams message")
			}
		})
		defer teamsServer.Close()

		config := NotificationConfig{
			Slack: SlackConfig{
				WebhookURL: slackServer.URL,
				Channel:    "#general",
				Username:   "beaver-bot",
				IconEmoji:  ":robot_face:",
			},
			Teams: TeamsConfig{
				WebhookURL: teamsServer.URL,
			},
		}

		notifier := NewNotifier(config)
		ctx := createTestNotificationGitHubContext()
		results := notifier.SendWikiUpdateNotification(ctx, true, "Wiki updated successfully")

		if len(results) != 2 {
			t.Errorf("Expected 2 results, got %d", len(results))
		}

		for _, result := range results {
			if !result.Success {
				t.Errorf("Expected successful notification for %s, got error: %s", result.Channel, result.Error)
			}
		}
	})

	t.Run("failed notification handling", func(t *testing.T) {
		// Mock server that returns error
		slackServer := createMockSlackServer(t, http.StatusInternalServerError, nil)
		defer slackServer.Close()

		config := NotificationConfig{
			Slack: SlackConfig{
				WebhookURL: slackServer.URL,
				Channel:    "#general",
				Username:   "beaver-bot",
			},
		}

		notifier := NewNotifier(config)
		ctx := createTestNotificationGitHubContext()
		results := notifier.SendWikiUpdateNotification(ctx, false, "Wiki update failed")

		if len(results) != 1 {
			t.Errorf("Expected 1 result, got %d", len(results))
		}

		result := results[0]
		if result.Success {
			t.Error("Expected failed notification")
		}
		if result.Error == "" {
			t.Error("Expected error message")
		}
		if !strings.Contains(result.Error, "500") {
			t.Errorf("Expected status code in error, got: %s", result.Error)
		}
	})

	t.Run("no webhook configured", func(t *testing.T) {
		config := NotificationConfig{} // Empty config
		notifier := NewNotifier(config)
		ctx := createTestNotificationGitHubContext()
		results := notifier.SendWikiUpdateNotification(ctx, true, "Test message")

		if len(results) != 0 {
			t.Errorf("Expected 0 results for empty config, got %d", len(results))
		}
	})

	t.Run("failure notification formatting", func(t *testing.T) {
		slackServer := createMockSlackServer(t, http.StatusOK, func(msg *SlackMessage) {
			if !strings.Contains(msg.Attachments[0].Title, "❌") {
				t.Error("Expected failure emoji in title")
			}
			if msg.Attachments[0].Color != "danger" {
				t.Errorf("Expected color danger, got %s", msg.Attachments[0].Color)
			}
		})
		defer slackServer.Close()

		config := NotificationConfig{
			Slack: SlackConfig{
				WebhookURL: slackServer.URL,
				Channel:    "#general",
			},
		}

		notifier := NewNotifier(config)
		ctx := createTestNotificationGitHubContext()
		results := notifier.SendWikiUpdateNotification(ctx, false, "Update failed")

		if len(results) != 1 || !results[0].Success {
			t.Error("Expected successful notification send")
		}
	})
}

func TestSendIssueUpdateNotification(t *testing.T) {
	t.Run("issue opened notification", func(t *testing.T) {
		slackServer := createMockSlackServer(t, http.StatusOK, func(msg *SlackMessage) {
			if !strings.Contains(msg.Attachments[0].Title, "🆕") {
				t.Error("Expected new issue emoji")
			}
			if !strings.Contains(msg.Attachments[0].Title, "opened") {
				t.Error("Expected 'opened' in title")
			}
			if msg.Attachments[0].Color != "good" {
				t.Errorf("Expected color good, got %s", msg.Attachments[0].Color)
			}
		})
		defer slackServer.Close()

		config := NotificationConfig{
			Slack: SlackConfig{
				WebhookURL: slackServer.URL,
				Channel:    "#issues",
			},
		}

		notifier := NewNotifier(config)
		ctx := createTestNotificationGitHubContext()
		issue := createTestIssueEvent()
		issue.Action = "opened"

		results := notifier.SendIssueUpdateNotification(ctx, issue)

		if len(results) != 1 {
			t.Errorf("Expected 1 result, got %d", len(results))
		}
		if !results[0].Success {
			t.Errorf("Expected successful notification, got error: %s", results[0].Error)
		}
	})

	t.Run("issue closed notification", func(t *testing.T) {
		slackServer := createMockSlackServer(t, http.StatusOK, func(msg *SlackMessage) {
			if !strings.Contains(msg.Attachments[0].Title, "✅") {
				t.Error("Expected closed issue emoji")
			}
			if !strings.Contains(msg.Attachments[0].Title, "closed") {
				t.Error("Expected 'closed' in title")
			}
		})
		defer slackServer.Close()

		config := NotificationConfig{
			Slack: SlackConfig{
				WebhookURL: slackServer.URL,
				Channel:    "#issues",
			},
		}

		notifier := NewNotifier(config)
		ctx := createTestNotificationGitHubContext()
		issue := createTestIssueEvent()
		issue.Action = "closed"
		issue.State = "closed"

		results := notifier.SendIssueUpdateNotification(ctx, issue)

		if len(results) != 1 || !results[0].Success {
			t.Error("Expected successful notification")
		}
	})

	t.Run("issue reopened notification", func(t *testing.T) {
		slackServer := createMockSlackServer(t, http.StatusOK, func(msg *SlackMessage) {
			if !strings.Contains(msg.Attachments[0].Title, "🔄") {
				t.Error("Expected reopened issue emoji")
			}
			if msg.Attachments[0].Color != "warning" {
				t.Errorf("Expected color warning, got %s", msg.Attachments[0].Color)
			}
		})
		defer slackServer.Close()

		config := NotificationConfig{
			Slack: SlackConfig{
				WebhookURL: slackServer.URL,
				Channel:    "#issues",
			},
		}

		notifier := NewNotifier(config)
		ctx := createTestNotificationGitHubContext()
		issue := createTestIssueEvent()
		issue.Action = "reopened"

		results := notifier.SendIssueUpdateNotification(ctx, issue)

		if len(results) != 1 || !results[0].Success {
			t.Error("Expected successful notification")
		}
	})

	t.Run("teams issue notification", func(t *testing.T) {
		teamsServer := createMockTeamsServer(t, http.StatusOK, func(msg *TeamsMessage) {
			if msg.Type != "MessageCard" {
				t.Errorf("Expected MessageCard type, got %s", msg.Type)
			}
			if !strings.Contains(msg.Title, "Issue #123") {
				t.Error("Expected issue number in title")
			}
			if len(msg.PotentialAction) == 0 {
				t.Error("Expected potential actions")
			}
			if msg.PotentialAction[0].Name != "View Issue" {
				t.Errorf("Expected 'View Issue' action, got %s", msg.PotentialAction[0].Name)
			}
		})
		defer teamsServer.Close()

		config := NotificationConfig{
			Teams: TeamsConfig{
				WebhookURL: teamsServer.URL,
			},
		}

		notifier := NewNotifier(config)
		ctx := createTestNotificationGitHubContext()
		issue := createTestIssueEvent()

		results := notifier.SendIssueUpdateNotification(ctx, issue)

		if len(results) != 1 || !results[0].Success {
			t.Error("Expected successful Teams notification")
		}
	})
}

func TestSlackMessageStructures(t *testing.T) {
	t.Run("SlackMessage JSON serialization", func(t *testing.T) {
		msg := SlackMessage{
			Channel:   "#test",
			Username:  "test-bot",
			IconEmoji: ":robot:",
			Text:      "Test message",
			Blocks: []SlackBlock{
				{
					Type: "section",
					Text: &SlackText{
						Type: "mrkdwn",
						Text: "Hello *world*",
					},
				},
			},
			Attachments: []SlackAttachment{
				{
					Color: "good",
					Title: "Test Title",
					Text:  "Test attachment",
					Fields: []SlackField{
						{
							Title: "Field 1",
							Value: "Value 1",
							Short: true,
						},
					},
					Footer:    "Test Footer",
					Timestamp: time.Now().Unix(),
				},
			},
		}

		data, err := json.Marshal(msg)
		if err != nil {
			t.Fatalf("Failed to marshal SlackMessage: %v", err)
		}

		var unmarshaled SlackMessage
		if err := json.Unmarshal(data, &unmarshaled); err != nil {
			t.Fatalf("Failed to unmarshal SlackMessage: %v", err)
		}

		if unmarshaled.Channel != msg.Channel {
			t.Errorf("Channel mismatch: expected %s, got %s", msg.Channel, unmarshaled.Channel)
		}
		if len(unmarshaled.Attachments) != 1 {
			t.Errorf("Expected 1 attachment, got %d", len(unmarshaled.Attachments))
		}
		if len(unmarshaled.Blocks) != 1 {
			t.Errorf("Expected 1 block, got %d", len(unmarshaled.Blocks))
		}
	})

	t.Run("TeamsMessage JSON serialization", func(t *testing.T) {
		msg := TeamsMessage{
			Type:    "MessageCard",
			Context: "https://schema.org/extensions",
			Summary: "Test summary",
			Title:   "Test title",
			Text:    "Test message",
			Sections: []TeamsSection{
				{
					ActivityTitle: "Activity",
					Text:          "Section text",
					Facts: []TeamsFact{
						{Name: "Fact 1", Value: "Value 1"},
						{Name: "Fact 2", Value: "Value 2"},
					},
				},
			},
			PotentialAction: []TeamsAction{
				{
					Type: "OpenUri",
					Name: "View Link",
					Targets: []struct {
						OS  string `json:"os"`
						URI string `json:"uri"`
					}{
						{OS: "default", URI: "https://example.com"},
					},
				},
			},
		}

		data, err := json.Marshal(msg)
		if err != nil {
			t.Fatalf("Failed to marshal TeamsMessage: %v", err)
		}

		var unmarshaled TeamsMessage
		if err := json.Unmarshal(data, &unmarshaled); err != nil {
			t.Fatalf("Failed to unmarshal TeamsMessage: %v", err)
		}

		if unmarshaled.Type != msg.Type {
			t.Errorf("Type mismatch: expected %s, got %s", msg.Type, unmarshaled.Type)
		}
		if len(unmarshaled.Sections) != 1 {
			t.Errorf("Expected 1 section, got %d", len(unmarshaled.Sections))
		}
		if len(unmarshaled.PotentialAction) != 1 {
			t.Errorf("Expected 1 action, got %d", len(unmarshaled.PotentialAction))
		}
	})
}

func TestNotificationConfigStructures(t *testing.T) {
	t.Run("NotificationConfig validation", func(t *testing.T) {
		config := NotificationConfig{
			Slack: SlackConfig{
				WebhookURL: "https://hooks.slack.com/test",
				Channel:    "#notifications",
				Username:   "beaver-bot",
				IconEmoji:  ":beaver:",
			},
			Teams: TeamsConfig{
				WebhookURL: "https://outlook.office.com/webhook/test",
			},
		}

		// Test JSON serialization
		data, err := json.Marshal(config)
		if err != nil {
			t.Fatalf("Failed to marshal NotificationConfig: %v", err)
		}

		var unmarshaled NotificationConfig
		if err := json.Unmarshal(data, &unmarshaled); err != nil {
			t.Fatalf("Failed to unmarshal NotificationConfig: %v", err)
		}

		if unmarshaled.Slack.WebhookURL != config.Slack.WebhookURL {
			t.Error("Slack webhook URL mismatch")
		}
		if unmarshaled.Teams.WebhookURL != config.Teams.WebhookURL {
			t.Error("Teams webhook URL mismatch")
		}
	})
}

func TestNotificationResultStructure(t *testing.T) {
	t.Run("NotificationResult JSON serialization", func(t *testing.T) {
		now := time.Now()
		result := NotificationResult{
			Channel:   "slack",
			Success:   true,
			Error:     "",
			Timestamp: now,
		}

		data, err := json.Marshal(result)
		if err != nil {
			t.Fatalf("Failed to marshal NotificationResult: %v", err)
		}

		var unmarshaled NotificationResult
		if err := json.Unmarshal(data, &unmarshaled); err != nil {
			t.Fatalf("Failed to unmarshal NotificationResult: %v", err)
		}

		if unmarshaled.Channel != result.Channel {
			t.Errorf("Channel mismatch: expected %s, got %s", result.Channel, unmarshaled.Channel)
		}
		if unmarshaled.Success != result.Success {
			t.Errorf("Success mismatch: expected %v, got %v", result.Success, unmarshaled.Success)
		}
	})

	t.Run("NotificationResult with error", func(t *testing.T) {
		result := NotificationResult{
			Channel:   "teams",
			Success:   false,
			Error:     "webhook returned status 500",
			Timestamp: time.Now(),
		}

		data, err := json.Marshal(result)
		if err != nil {
			t.Fatalf("Failed to marshal error NotificationResult: %v", err)
		}

		var unmarshaled NotificationResult
		if err := json.Unmarshal(data, &unmarshaled); err != nil {
			t.Fatalf("Failed to unmarshal error NotificationResult: %v", err)
		}

		if unmarshaled.Error != result.Error {
			t.Errorf("Error mismatch: expected %s, got %s", result.Error, unmarshaled.Error)
		}
	})
}

func TestPostToSlackErrorHandling(t *testing.T) {
	t.Run("invalid JSON in message", func(t *testing.T) {
		config := NotificationConfig{
			Slack: SlackConfig{
				WebhookURL: "https://invalid-url-that-should-fail",
			},
		}

		notifier := NewNotifier(config)

		// Create message with invalid JSON (circular reference)
		msg := SlackMessage{
			Text: "test",
		}

		err := notifier.postToSlack(msg)
		if err == nil {
			t.Error("Expected error for invalid webhook URL")
		}
		if !strings.Contains(err.Error(), "failed to post to Slack") {
			t.Errorf("Expected Slack posting error, got: %v", err)
		}
	})

	t.Run("webhook returns non-200 status", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusBadRequest)
		}))
		defer server.Close()

		config := NotificationConfig{
			Slack: SlackConfig{
				WebhookURL: server.URL,
			},
		}

		notifier := NewNotifier(config)
		msg := SlackMessage{Text: "test"}

		err := notifier.postToSlack(msg)
		if err == nil {
			t.Error("Expected error for non-200 status")
		}
		if !strings.Contains(err.Error(), "400") {
			t.Errorf("Expected status code error, got: %v", err)
		}
	})
}

func TestPostToTeamsErrorHandling(t *testing.T) {
	t.Run("invalid webhook URL", func(t *testing.T) {
		config := NotificationConfig{
			Teams: TeamsConfig{
				WebhookURL: "https://invalid-url-that-should-fail",
			},
		}

		notifier := NewNotifier(config)
		msg := TeamsMessage{
			Type: "MessageCard",
			Text: "test",
		}

		err := notifier.postToTeams(msg)
		if err == nil {
			t.Error("Expected error for invalid webhook URL")
		}
		if !strings.Contains(err.Error(), "failed to post to Teams") {
			t.Errorf("Expected Teams posting error, got: %v", err)
		}
	})

	t.Run("webhook returns error status", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusInternalServerError)
		}))
		defer server.Close()

		config := NotificationConfig{
			Teams: TeamsConfig{
				WebhookURL: server.URL,
			},
		}

		notifier := NewNotifier(config)
		msg := TeamsMessage{
			Type: "MessageCard",
			Text: "test",
		}

		err := notifier.postToTeams(msg)
		if err == nil {
			t.Error("Expected error for 500 status")
		}
		if !strings.Contains(err.Error(), "500") {
			t.Errorf("Expected status code error, got: %v", err)
		}
	})
}

func TestNotificationMessageContent(t *testing.T) {
	t.Run("wiki update message content validation", func(t *testing.T) {
		var capturedSlackMsg *SlackMessage
		var capturedTeamsMsg *TeamsMessage

		slackServer := createMockSlackServer(t, http.StatusOK, func(msg *SlackMessage) {
			capturedSlackMsg = msg
		})
		defer slackServer.Close()

		teamsServer := createMockTeamsServer(t, http.StatusOK, func(msg *TeamsMessage) {
			capturedTeamsMsg = msg
		})
		defer teamsServer.Close()

		config := NotificationConfig{
			Slack: SlackConfig{
				WebhookURL: slackServer.URL,
				Channel:    "#test",
				Username:   "test-bot",
				IconEmoji:  ":test:",
			},
			Teams: TeamsConfig{
				WebhookURL: teamsServer.URL,
			},
		}

		notifier := NewNotifier(config)
		ctx := createTestNotificationGitHubContext()
		message := "Wiki update completed successfully"

		results := notifier.SendWikiUpdateNotification(ctx, true, message)

		// Validate results
		if len(results) != 2 {
			t.Fatalf("Expected 2 results, got %d", len(results))
		}

		for _, result := range results {
			if !result.Success {
				t.Errorf("Notification failed for %s: %s", result.Channel, result.Error)
			}
		}

		// Validate Slack message content
		if capturedSlackMsg == nil {
			t.Fatal("Slack message was not captured")
		}
		if capturedSlackMsg.Channel != "#test" {
			t.Errorf("Expected channel #test, got %s", capturedSlackMsg.Channel)
		}
		if capturedSlackMsg.Username != "test-bot" {
			t.Errorf("Expected username test-bot, got %s", capturedSlackMsg.Username)
		}
		if len(capturedSlackMsg.Attachments) == 0 {
			t.Fatal("Expected attachments in Slack message")
		}
		attachment := capturedSlackMsg.Attachments[0]
		if attachment.Text != message {
			t.Errorf("Expected message %s, got %s", message, attachment.Text)
		}
		if len(attachment.Fields) == 0 {
			t.Error("Expected fields in attachment")
		}

		// Check for specific fields
		var repoField, triggerField, workflowField, actorField *SlackField
		for i := range attachment.Fields {
			field := &attachment.Fields[i]
			switch field.Title {
			case "Repository":
				repoField = field
			case "Trigger":
				triggerField = field
			case "Workflow":
				workflowField = field
			case "Actor":
				actorField = field
			}
		}

		if repoField == nil || !strings.Contains(repoField.Value, ctx.Repository) {
			t.Error("Repository field missing or incorrect")
		}
		if triggerField == nil {
			t.Error("Trigger field missing")
		}
		if workflowField == nil || !strings.Contains(workflowField.Value, ctx.Workflow) {
			t.Error("Workflow field missing or incorrect")
		}
		if actorField == nil || actorField.Value != ctx.Actor {
			t.Error("Actor field missing or incorrect")
		}

		// Validate Teams message content
		if capturedTeamsMsg == nil {
			t.Fatal("Teams message was not captured")
		}
		if capturedTeamsMsg.Type != "MessageCard" {
			t.Errorf("Expected MessageCard type, got %s", capturedTeamsMsg.Type)
		}
		if capturedTeamsMsg.Text != message {
			t.Errorf("Expected message %s, got %s", message, capturedTeamsMsg.Text)
		}
		if len(capturedTeamsMsg.Sections) == 0 {
			t.Fatal("Expected sections in Teams message")
		}
		section := capturedTeamsMsg.Sections[0]
		if len(section.Facts) == 0 {
			t.Error("Expected facts in section")
		}

		// Check for specific facts
		factMap := make(map[string]string)
		for _, fact := range section.Facts {
			factMap[fact.Name] = fact.Value
		}

		if factMap["Repository"] != ctx.Repository {
			t.Errorf("Expected repository %s, got %s", ctx.Repository, factMap["Repository"])
		}
		if factMap["Actor"] != ctx.Actor {
			t.Errorf("Expected actor %s, got %s", ctx.Actor, factMap["Actor"])
		}
	})
}

func TestEdgeCases(t *testing.T) {
	t.Run("empty configuration", func(t *testing.T) {
		notifier := NewNotifier(NotificationConfig{})
		ctx := createTestNotificationGitHubContext()
		results := notifier.SendWikiUpdateNotification(ctx, true, "test")

		if len(results) != 0 {
			t.Errorf("Expected 0 results for empty config, got %d", len(results))
		}
	})

	t.Run("only Slack configured", func(t *testing.T) {
		slackServer := createMockSlackServer(t, http.StatusOK, nil)
		defer slackServer.Close()

		config := NotificationConfig{
			Slack: SlackConfig{
				WebhookURL: slackServer.URL,
			},
		}

		notifier := NewNotifier(config)
		ctx := createTestNotificationGitHubContext()
		results := notifier.SendWikiUpdateNotification(ctx, true, "test")

		if len(results) != 1 {
			t.Errorf("Expected 1 result for Slack-only config, got %d", len(results))
		}
		if results[0].Channel != "slack" {
			t.Errorf("Expected slack channel, got %s", results[0].Channel)
		}
	})

	t.Run("only Teams configured", func(t *testing.T) {
		teamsServer := createMockTeamsServer(t, http.StatusOK, nil)
		defer teamsServer.Close()

		config := NotificationConfig{
			Teams: TeamsConfig{
				WebhookURL: teamsServer.URL,
			},
		}

		notifier := NewNotifier(config)
		ctx := createTestNotificationGitHubContext()
		results := notifier.SendIssueUpdateNotification(ctx, createTestIssueEvent())

		if len(results) != 1 {
			t.Errorf("Expected 1 result for Teams-only config, got %d", len(results))
		}
		if results[0].Channel != "teams" {
			t.Errorf("Expected teams channel, got %s", results[0].Channel)
		}
	})

	t.Run("empty configuration with valid context", func(t *testing.T) {
		// Test with empty config but valid context
		notifier := NewNotifier(NotificationConfig{})
		ctx := createTestNotificationGitHubContext()
		issue := createTestIssueEvent()

		// Should not send any notifications due to empty config
		results := notifier.SendWikiUpdateNotification(ctx, true, "test")
		if len(results) != 0 {
			t.Error("Expected no results for empty config")
		}

		results = notifier.SendIssueUpdateNotification(ctx, issue)
		if len(results) != 0 {
			t.Error("Expected no results for empty config")
		}
	})

	t.Run("large message content", func(t *testing.T) {
		slackServer := createMockSlackServer(t, http.StatusOK, func(msg *SlackMessage) {
			if len(msg.Attachments) > 0 && len(msg.Attachments[0].Text) < 1000 {
				t.Error("Expected large message content")
			}
		})
		defer slackServer.Close()

		config := NotificationConfig{
			Slack: SlackConfig{
				WebhookURL: slackServer.URL,
			},
		}

		notifier := NewNotifier(config)
		ctx := createTestNotificationGitHubContext()

		// Create a large message
		largeMessage := strings.Repeat("This is a very long message content. ", 50)
		results := notifier.SendWikiUpdateNotification(ctx, true, largeMessage)

		if len(results) != 1 || !results[0].Success {
			t.Error("Expected successful notification for large message")
		}
	})
}

// Benchmark tests for performance analysis
func BenchmarkSendWikiUpdateNotification(b *testing.B) {
	slackServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	}))
	defer slackServer.Close()

	config := NotificationConfig{
		Slack: SlackConfig{
			WebhookURL: slackServer.URL,
		},
	}

	notifier := NewNotifier(config)
	ctx := createTestGitHubContext()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = notifier.SendWikiUpdateNotification(ctx, true, "Benchmark test message")
	}
}

func BenchmarkSlackMessageCreation(b *testing.B) {
	ctx := createTestGitHubContext()
	message := "Test notification message"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		config := createTestNotificationConfig()
		notifier := NewNotifier(config)
		_ = notifier.sendSlackWikiUpdate(ctx, true, message)
	}
}

func BenchmarkJSONMarshaling(b *testing.B) {
	msg := SlackMessage{
		Channel:   "#test",
		Username:  "test-bot",
		IconEmoji: ":robot:",
		Text:      "Test message",
		Attachments: []SlackAttachment{
			{
				Color: "good",
				Title: "Test Title",
				Text:  "Test attachment text",
				Fields: []SlackField{
					{Title: "Field 1", Value: "Value 1", Short: true},
					{Title: "Field 2", Value: "Value 2", Short: true},
				},
				Footer:    "Test Footer",
				Timestamp: time.Now().Unix(),
			},
		},
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = json.Marshal(msg)
	}
}

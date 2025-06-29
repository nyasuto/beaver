package actions

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// NotificationConfig holds configuration for various notification channels
type NotificationConfig struct {
	Slack SlackConfig `yaml:"slack" json:"slack"`
	Teams TeamsConfig `yaml:"teams" json:"teams"`
}

// SlackConfig holds Slack notification configuration
type SlackConfig struct {
	WebhookURL string `yaml:"webhook_url" json:"webhook_url"`
	Channel    string `yaml:"channel" json:"channel"`
	Username   string `yaml:"username" json:"username"`
	IconEmoji  string `yaml:"icon_emoji" json:"icon_emoji"`
}

// TeamsConfig holds Microsoft Teams notification configuration
type TeamsConfig struct {
	WebhookURL string `yaml:"webhook_url" json:"webhook_url"`
}

// SlackMessage represents a Slack message payload
type SlackMessage struct {
	Channel     string            `json:"channel,omitempty"`
	Username    string            `json:"username,omitempty"`
	IconEmoji   string            `json:"icon_emoji,omitempty"`
	Text        string            `json:"text,omitempty"`
	Blocks      []SlackBlock      `json:"blocks,omitempty"`
	Attachments []SlackAttachment `json:"attachments,omitempty"`
}

// SlackBlock represents a Slack block element
type SlackBlock struct {
	Type      string      `json:"type"`
	Text      *SlackText  `json:"text,omitempty"`
	Fields    []SlackText `json:"fields,omitempty"`
	Accessory interface{} `json:"accessory,omitempty"`
}

// SlackText represents Slack text element
type SlackText struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

// SlackAttachment represents a Slack attachment
type SlackAttachment struct {
	Color     string       `json:"color,omitempty"`
	Title     string       `json:"title,omitempty"`
	TitleLink string       `json:"title_link,omitempty"`
	Text      string       `json:"text,omitempty"`
	Fields    []SlackField `json:"fields,omitempty"`
	Footer    string       `json:"footer,omitempty"`
	Timestamp int64        `json:"ts,omitempty"`
}

// SlackField represents a Slack field
type SlackField struct {
	Title string `json:"title"`
	Value string `json:"value"`
	Short bool   `json:"short"`
}

// TeamsMessage represents a Microsoft Teams message payload
type TeamsMessage struct {
	Type            string         `json:"@type"`
	Context         string         `json:"@context"`
	Summary         string         `json:"summary"`
	Title           string         `json:"title"`
	Text            string         `json:"text"`
	Sections        []TeamsSection `json:"sections,omitempty"`
	PotentialAction []TeamsAction  `json:"potentialAction,omitempty"`
}

// TeamsSection represents a Teams message section
type TeamsSection struct {
	ActivityTitle    string      `json:"activityTitle,omitempty"`
	ActivitySubtitle string      `json:"activitySubtitle,omitempty"`
	ActivityImage    string      `json:"activityImage,omitempty"`
	Text             string      `json:"text,omitempty"`
	Facts            []TeamsFact `json:"facts,omitempty"`
}

// TeamsFact represents a Teams fact
type TeamsFact struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

// TeamsAction represents a Teams action
type TeamsAction struct {
	Type    string `json:"@type"`
	Name    string `json:"name"`
	Targets []struct {
		OS  string `json:"os"`
		URI string `json:"uri"`
	} `json:"targets"`
}

// NotificationResult represents the result of a notification attempt
type NotificationResult struct {
	Channel   string    `json:"channel"`
	Success   bool      `json:"success"`
	Error     string    `json:"error,omitempty"`
	Timestamp time.Time `json:"timestamp"`
}

// Notifier handles sending notifications to various channels
type Notifier struct {
	config NotificationConfig
}

// NewNotifier creates a new notifier with the given configuration
func NewNotifier(config NotificationConfig) *Notifier {
	return &Notifier{config: config}
}

// SendWikiUpdateNotification sends a notification about wiki update status
func (n *Notifier) SendWikiUpdateNotification(ctx *GitHubContext, success bool, message string) []NotificationResult {
	var results []NotificationResult

	// Send Slack notification
	if n.config.Slack.WebhookURL != "" {
		result := n.sendSlackWikiUpdate(ctx, success, message)
		results = append(results, result)
	}

	// Send Teams notification
	if n.config.Teams.WebhookURL != "" {
		result := n.sendTeamsWikiUpdate(ctx, success, message)
		results = append(results, result)
	}

	return results
}

// sendSlackWikiUpdate sends a Slack notification for wiki updates
func (n *Notifier) sendSlackWikiUpdate(ctx *GitHubContext, success bool, message string) NotificationResult {
	result := NotificationResult{
		Channel:   "slack",
		Timestamp: time.Now(),
	}

	color := "good"
	emoji := "✅"
	if !success {
		color = "danger"
		emoji = "❌"
	}

	updateReason := GetUpdateReason(ctx)

	slackMsg := SlackMessage{
		Channel:   n.config.Slack.Channel,
		Username:  n.config.Slack.Username,
		IconEmoji: n.config.Slack.IconEmoji,
		Attachments: []SlackAttachment{
			{
				Color:     color,
				Title:     fmt.Sprintf("%s Wiki Update %s", emoji, map[bool]string{true: "Complete", false: "Failed"}[success]),
				TitleLink: fmt.Sprintf("https://github.com/%s/wiki", ctx.Repository),
				Text:      message,
				Fields: []SlackField{
					{
						Title: "Repository",
						Value: fmt.Sprintf("<%s|%s>", fmt.Sprintf("https://github.com/%s", ctx.Repository), ctx.Repository),
						Short: true,
					},
					{
						Title: "Trigger",
						Value: updateReason,
						Short: true,
					},
					{
						Title: "Workflow",
						Value: fmt.Sprintf("<%s|%s #%d>",
							fmt.Sprintf("https://github.com/%s/actions/runs/%s", ctx.Repository, ctx.RunID),
							ctx.Workflow, ctx.RunNumber),
						Short: true,
					},
					{
						Title: "Actor",
						Value: ctx.Actor,
						Short: true,
					},
				},
				Footer:    "Beaver Wiki Automation",
				Timestamp: time.Now().Unix(),
			},
		},
	}

	if err := n.postToSlack(slackMsg); err != nil {
		result.Success = false
		result.Error = err.Error()
	} else {
		result.Success = true
	}

	return result
}

// sendTeamsWikiUpdate sends a Teams notification for wiki updates
func (n *Notifier) sendTeamsWikiUpdate(ctx *GitHubContext, success bool, message string) NotificationResult {
	result := NotificationResult{
		Channel:   "teams",
		Timestamp: time.Now(),
	}

	emoji := "✅"
	if !success {
		emoji = "❌"
	}

	updateReason := GetUpdateReason(ctx)

	teamsMsg := TeamsMessage{
		Type:    "MessageCard",
		Context: "https://schema.org/extensions",
		Summary: fmt.Sprintf("Wiki Update %s", map[bool]string{true: "Complete", false: "Failed"}[success]),
		Title:   fmt.Sprintf("%s Wiki Update %s", emoji, map[bool]string{true: "Complete", false: "Failed"}[success]),
		Text:    message,
		Sections: []TeamsSection{
			{
				Facts: []TeamsFact{
					{Name: "Repository", Value: ctx.Repository},
					{Name: "Trigger", Value: updateReason},
					{Name: "Workflow", Value: fmt.Sprintf("%s #%d", ctx.Workflow, ctx.RunNumber)},
					{Name: "Actor", Value: ctx.Actor},
					{Name: "Timestamp", Value: time.Now().Format("2006-01-02 15:04:05 UTC")},
				},
			},
		},
		PotentialAction: []TeamsAction{
			{
				Type: "OpenUri",
				Name: "View Wiki",
				Targets: []struct {
					OS  string `json:"os"`
					URI string `json:"uri"`
				}{
					{OS: "default", URI: fmt.Sprintf("https://github.com/%s/wiki", ctx.Repository)},
				},
			},
			{
				Type: "OpenUri",
				Name: "View Workflow",
				Targets: []struct {
					OS  string `json:"os"`
					URI string `json:"uri"`
				}{
					{OS: "default", URI: fmt.Sprintf("https://github.com/%s/actions/runs/%s", ctx.Repository, ctx.RunID)},
				},
			},
		},
	}

	if err := n.postToTeams(teamsMsg); err != nil {
		result.Success = false
		result.Error = err.Error()
	} else {
		result.Success = true
	}

	return result
}

// postToSlack sends a message to Slack webhook
func (n *Notifier) postToSlack(message SlackMessage) error {
	data, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal Slack message: %w", err)
	}

	resp, err := http.Post(n.config.Slack.WebhookURL, "application/json", bytes.NewBuffer(data))
	if err != nil {
		return fmt.Errorf("failed to post to Slack: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("slack webhook returned status %d", resp.StatusCode)
	}

	return nil
}

// postToTeams sends a message to Teams webhook
func (n *Notifier) postToTeams(message TeamsMessage) error {
	data, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal Teams message: %w", err)
	}

	resp, err := http.Post(n.config.Teams.WebhookURL, "application/json", bytes.NewBuffer(data))
	if err != nil {
		return fmt.Errorf("failed to post to Teams: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("teams webhook returned status %d", resp.StatusCode)
	}

	return nil
}

// SendIssueUpdateNotification sends a notification for issue updates
func (n *Notifier) SendIssueUpdateNotification(ctx *GitHubContext, issue *IssueEvent) []NotificationResult {
	var results []NotificationResult

	// Send Slack notification
	if n.config.Slack.WebhookURL != "" {
		result := n.sendSlackIssueUpdate(ctx, issue)
		results = append(results, result)
	}

	// Send Teams notification
	if n.config.Teams.WebhookURL != "" {
		result := n.sendTeamsIssueUpdate(ctx, issue)
		results = append(results, result)
	}

	return results
}

// sendSlackIssueUpdate sends Slack notification for issue updates
func (n *Notifier) sendSlackIssueUpdate(ctx *GitHubContext, issue *IssueEvent) NotificationResult {
	result := NotificationResult{
		Channel:   "slack",
		Timestamp: time.Now(),
	}

	emoji := "📝"
	color := "good"

	switch issue.Action {
	case "opened":
		emoji = "🆕"
		color = "good"
	case "closed":
		emoji = "✅"
		color = "good"
	case "reopened":
		emoji = "🔄"
		color = "warning"
	}

	slackMsg := SlackMessage{
		Channel:   n.config.Slack.Channel,
		Username:  n.config.Slack.Username,
		IconEmoji: n.config.Slack.IconEmoji,
		Attachments: []SlackAttachment{
			{
				Color:     color,
				Title:     fmt.Sprintf("%s Issue #%d %s", emoji, issue.Number, issue.Action),
				TitleLink: issue.URL,
				Text:      issue.Title,
				Fields: []SlackField{
					{
						Title: "Repository",
						Value: fmt.Sprintf("<%s|%s>", fmt.Sprintf("https://github.com/%s", ctx.Repository), ctx.Repository),
						Short: true,
					},
					{
						Title: "State",
						Value: issue.State,
						Short: true,
					},
				},
				Footer:    "Beaver Issue Tracking",
				Timestamp: time.Now().Unix(),
			},
		},
	}

	if err := n.postToSlack(slackMsg); err != nil {
		result.Success = false
		result.Error = err.Error()
	} else {
		result.Success = true
	}

	return result
}

// sendTeamsIssueUpdate sends Teams notification for issue updates
func (n *Notifier) sendTeamsIssueUpdate(ctx *GitHubContext, issue *IssueEvent) NotificationResult {
	result := NotificationResult{
		Channel:   "teams",
		Timestamp: time.Now(),
	}

	emoji := "📝"
	switch issue.Action {
	case "opened":
		emoji = "🆕"
	case "closed":
		emoji = "✅"
	case "reopened":
		emoji = "🔄"
	}

	teamsMsg := TeamsMessage{
		Type:    "MessageCard",
		Context: "https://schema.org/extensions",
		Summary: fmt.Sprintf("Issue #%d %s", issue.Number, issue.Action),
		Title:   fmt.Sprintf("%s Issue #%d %s", emoji, issue.Number, issue.Action),
		Text:    issue.Title,
		Sections: []TeamsSection{
			{
				Facts: []TeamsFact{
					{Name: "Repository", Value: ctx.Repository},
					{Name: "Issue State", Value: issue.State},
					{Name: "Action", Value: issue.Action},
					{Name: "Timestamp", Value: time.Now().Format("2006-01-02 15:04:05 UTC")},
				},
			},
		},
		PotentialAction: []TeamsAction{
			{
				Type: "OpenUri",
				Name: "View Issue",
				Targets: []struct {
					OS  string `json:"os"`
					URI string `json:"uri"`
				}{
					{OS: "default", URI: issue.URL},
				},
			},
		},
	}

	if err := n.postToTeams(teamsMsg); err != nil {
		result.Success = false
		result.Error = err.Error()
	} else {
		result.Success = true
	}

	return result
}

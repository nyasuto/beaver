package ai

import (
	"github.com/nyasuto/beaver/pkg/github"
)

// ConvertGitHubIssueToAI converts GitHub issue data to AI service format
func ConvertGitHubIssueToAI(ghIssue *github.IssueData) IssueData {
	aiIssue := IssueData{
		ID:        int(ghIssue.ID),
		Number:    ghIssue.Number,
		Title:     ghIssue.Title,
		Body:      ghIssue.Body,
		State:     ghIssue.State,
		Labels:    ghIssue.Labels,
		CreatedAt: ghIssue.CreatedAt,
		UpdatedAt: ghIssue.UpdatedAt,
		User:      ghIssue.User,
	}

	// Convert comments
	for _, ghComment := range ghIssue.Comments {
		aiComment := IssueComment{
			ID:        int(ghComment.ID),
			Body:      ghComment.Body,
			User:      ghComment.User,
			CreatedAt: ghComment.CreatedAt,
		}
		aiIssue.Comments = append(aiIssue.Comments, aiComment)
	}

	return aiIssue
}

// ConvertGitHubIssuesToAI converts multiple GitHub issues to AI service format
func ConvertGitHubIssuesToAI(ghIssues []*github.IssueData) []IssueData {
	var aiIssues []IssueData
	for _, ghIssue := range ghIssues {
		aiIssue := ConvertGitHubIssueToAI(ghIssue)
		aiIssues = append(aiIssues, aiIssue)
	}
	return aiIssues
}

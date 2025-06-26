package wiki

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/nyasuto/beaver/internal/models"
)

// GitHubWikiClient handles GitHub Wiki API operations
type GitHubWikiClient struct {
	client  *http.Client
	token   string
	baseURL string
	owner   string
	repo    string
}

// NewGitHubWikiClient creates a new GitHub Wiki client
func NewGitHubWikiClient(token, owner, repo string) *GitHubWikiClient {
	return &GitHubWikiClient{
		client:  &http.Client{Timeout: 30 * time.Second},
		token:   token,
		baseURL: "https://api.github.com",
		owner:   owner,
		repo:    repo,
	}
}

// WikiPageRequest represents a Wiki page creation/update request
type WikiPageRequest struct {
	Title   string `json:"title"`
	Content string `json:"content"`
	Message string `json:"message"`
}

// WikiPageResponse represents a Wiki page response
type WikiPageResponse struct {
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	Path      string    `json:"path"`
	SHA       string    `json:"sha"`
	URL       string    `json:"url"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// CreateWikiPage creates a new Wiki page on GitHub
func (c *GitHubWikiClient) CreateWikiPage(ctx context.Context, page *WikiPage) error {
	// GitHub Wiki API uses the repository's .wiki.git repository
	// We'll use the contents API to manage wiki pages

	filename := c.sanitizeFilename(page.Filename)
	commitMessage := fmt.Sprintf("feat: Add %s via Beaver AI", page.Title)

	request := map[string]interface{}{
		"message": commitMessage,
		"content": c.encodeContent(page.Content),
		"branch":  "master", // Wiki uses master branch
	}

	// Check if page exists first
	exists, sha, err := c.checkPageExists(ctx, filename)
	if err != nil {
		return fmt.Errorf("failed to check if page exists: %w", err)
	}

	if exists {
		request["sha"] = sha
	}

	url := fmt.Sprintf("%s/repos/%s/%s.wiki/contents/%s",
		c.baseURL, c.owner, c.repo, filename)

	return c.makeRequest(ctx, "PUT", url, request)
}

// UpdateWikiPage updates an existing Wiki page
func (c *GitHubWikiClient) UpdateWikiPage(ctx context.Context, page *WikiPage) error {
	filename := c.sanitizeFilename(page.Filename)

	// Get current SHA
	exists, sha, err := c.checkPageExists(ctx, filename)
	if err != nil {
		return fmt.Errorf("failed to check page existence: %w", err)
	}

	if !exists {
		return c.CreateWikiPage(ctx, page)
	}

	commitMessage := fmt.Sprintf("update: %s via Beaver AI", page.Title)

	request := map[string]interface{}{
		"message": commitMessage,
		"content": c.encodeContent(page.Content),
		"sha":     sha,
		"branch":  "master",
	}

	url := fmt.Sprintf("%s/repos/%s/%s.wiki/contents/%s",
		c.baseURL, c.owner, c.repo, filename)

	return c.makeRequest(ctx, "PUT", url, request)
}

// DeleteWikiPage deletes a Wiki page
func (c *GitHubWikiClient) DeleteWikiPage(ctx context.Context, filename string) error {
	filename = c.sanitizeFilename(filename)

	exists, sha, err := c.checkPageExists(ctx, filename)
	if err != nil {
		return fmt.Errorf("failed to check page existence: %w", err)
	}

	if !exists {
		return fmt.Errorf("page %s does not exist", filename)
	}

	commitMessage := fmt.Sprintf("remove: %s via Beaver AI", filename)

	request := map[string]interface{}{
		"message": commitMessage,
		"sha":     sha,
		"branch":  "master",
	}

	url := fmt.Sprintf("%s/repos/%s/%s.wiki/contents/%s",
		c.baseURL, c.owner, c.repo, filename)

	return c.makeRequest(ctx, "DELETE", url, request)
}

// ListWikiPages lists all Wiki pages
func (c *GitHubWikiClient) ListWikiPages(ctx context.Context) ([]WikiPageResponse, error) {
	url := fmt.Sprintf("%s/repos/%s/%s.wiki/contents",
		c.baseURL, c.owner, c.repo)

	resp, err := c.makeGetRequest(ctx, url)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode == 404 {
		// Wiki doesn't exist yet
		return []WikiPageResponse{}, nil
	}

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("failed to list wiki pages: status %d", resp.StatusCode)
	}

	var contents []struct {
		Name string `json:"name"`
		Path string `json:"path"`
		SHA  string `json:"sha"`
		Type string `json:"type"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&contents); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	var pages []WikiPageResponse
	for _, content := range contents {
		if content.Type == "file" && strings.HasSuffix(content.Name, ".md") {
			page := WikiPageResponse{
				Title: strings.TrimSuffix(content.Name, ".md"),
				Path:  content.Path,
				SHA:   content.SHA,
			}
			pages = append(pages, page)
		}
	}

	return pages, nil
}

// GetWikiPage retrieves a specific Wiki page
func (c *GitHubWikiClient) GetWikiPage(ctx context.Context, filename string) (*WikiPageResponse, error) {
	filename = c.sanitizeFilename(filename)

	url := fmt.Sprintf("%s/repos/%s/%s.wiki/contents/%s",
		c.baseURL, c.owner, c.repo, filename)

	resp, err := c.makeGetRequest(ctx, url)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode == 404 {
		return nil, fmt.Errorf("wiki page %s not found", filename)
	}

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("failed to get wiki page: status %d", resp.StatusCode)
	}

	var content struct {
		Name     string `json:"name"`
		Path     string `json:"path"`
		SHA      string `json:"sha"`
		Content  string `json:"content"`
		Encoding string `json:"encoding"`
		URL      string `json:"url"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&content); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	decodedContent, err := c.decodeContent(content.Content)
	if err != nil {
		return nil, fmt.Errorf("failed to decode content: %w", err)
	}

	return &WikiPageResponse{
		Title:   strings.TrimSuffix(content.Name, ".md"),
		Content: decodedContent,
		Path:    content.Path,
		SHA:     content.SHA,
		URL:     content.URL,
	}, nil
}

// PublishPages publishes multiple Wiki pages
func (c *GitHubWikiClient) PublishPages(ctx context.Context, pages []*WikiPage) error {
	for _, page := range pages {
		if err := c.CreateWikiPage(ctx, page); err != nil {
			return fmt.Errorf("failed to publish page %s: %w", page.Filename, err)
		}

		// Add small delay to avoid rate limiting
		time.Sleep(100 * time.Millisecond)
	}
	return nil
}

// Helper methods

func (c *GitHubWikiClient) checkPageExists(ctx context.Context, filename string) (bool, string, error) {
	url := fmt.Sprintf("%s/repos/%s/%s.wiki/contents/%s",
		c.baseURL, c.owner, c.repo, filename)

	resp, err := c.makeGetRequest(ctx, url)
	if err != nil {
		return false, "", err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode == 404 {
		return false, "", nil
	}

	if resp.StatusCode != 200 {
		return false, "", fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var content struct {
		SHA string `json:"sha"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&content); err != nil {
		return false, "", fmt.Errorf("failed to decode response: %w", err)
	}

	return true, content.SHA, nil
}

func (c *GitHubWikiClient) makeRequest(ctx context.Context, method, url string, data interface{}) error {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal request data: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "token "+c.token)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := c.client.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

func (c *GitHubWikiClient) makeGetRequest(ctx context.Context, url string) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "token "+c.token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}

	return resp, nil
}

func (c *GitHubWikiClient) sanitizeFilename(filename string) string {
	// Ensure the filename is safe for GitHub Wiki
	if !strings.HasSuffix(filename, ".md") {
		filename += ".md"
	}

	// Replace spaces with hyphens for GitHub Wiki convention
	filename = strings.ReplaceAll(filename, " ", "-")

	return filename
}

func (c *GitHubWikiClient) encodeContent(content string) string {
	// GitHub API expects base64 encoded content
	return c.base64Encode(content)
}

func (c *GitHubWikiClient) decodeContent(encodedContent string) (string, error) {
	return c.base64Decode(encodedContent)
}

func (c *GitHubWikiClient) base64Encode(data string) string {
	// Simple base64 encoding
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
	input := []byte(data)
	output := make([]byte, ((len(input)+2)/3)*4)

	for i, j := 0, 0; i < len(input); i, j = i+3, j+4 {
		a, b, c := input[i], byte(0), byte(0)
		if i+1 < len(input) {
			b = input[i+1]
		}
		if i+2 < len(input) {
			c = input[i+2]
		}

		output[j] = chars[a>>2]
		output[j+1] = chars[((a&3)<<4)|(b>>4)]
		if i+1 < len(input) {
			output[j+2] = chars[((b&15)<<2)|(c>>6)]
		} else {
			output[j+2] = '='
		}
		if i+2 < len(input) {
			output[j+3] = chars[c&63]
		} else {
			output[j+3] = '='
		}
	}

	return string(output)
}

func (c *GitHubWikiClient) base64Decode(data string) (string, error) {
	// Simple base64 decoding
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

	// Create lookup table
	lookup := make(map[byte]int)
	for i, char := range chars {
		lookup[byte(char)] = i
	}

	input := []byte(data)
	// Remove padding
	for len(input) > 0 && input[len(input)-1] == '=' {
		input = input[:len(input)-1]
	}

	output := make([]byte, (len(input)*3)/4)

	for i, j := 0, 0; i < len(input); i, j = i+4, j+3 {
		var a, b, c, d int
		a = lookup[input[i]]
		if i+1 < len(input) {
			b = lookup[input[i+1]]
		}
		if i+2 < len(input) {
			c = lookup[input[i+2]]
		}
		if i+3 < len(input) {
			d = lookup[input[i+3]]
		}

		if j < len(output) {
			output[j] = byte((a << 2) | (b >> 4))
		}
		if j+1 < len(output) {
			output[j+1] = byte((b << 4) | (c >> 2))
		}
		if j+2 < len(output) {
			output[j+2] = byte((c << 6) | d)
		}
	}

	return string(output), nil
}

// WikiService provides high-level Wiki operations
type WikiService struct {
	generator *Generator
	client    *GitHubWikiClient
}

// NewWikiService creates a new Wiki service
func NewWikiService(token, owner, repo string) *WikiService {
	return &WikiService{
		generator: NewGenerator(),
		client:    NewGitHubWikiClient(token, owner, repo),
	}
}

// GenerateAndPublishWiki generates and publishes complete Wiki documentation
func (ws *WikiService) GenerateAndPublishWiki(ctx context.Context, issues []models.Issue, projectName string) error {
	// Generate all Wiki pages
	pages := make([]*WikiPage, 0, 4)

	// Generate index page
	indexPage, err := ws.generator.GenerateIndex(issues, projectName)
	if err != nil {
		return fmt.Errorf("failed to generate index page: %w", err)
	}
	pages = append(pages, indexPage)

	// Generate issues summary
	summaryPage, err := ws.generator.GenerateIssuesSummary(issues, projectName)
	if err != nil {
		return fmt.Errorf("failed to generate issues summary: %w", err)
	}
	pages = append(pages, summaryPage)

	// Generate troubleshooting guide
	troubleshootingPage, err := ws.generator.GenerateTroubleshootingGuide(issues, projectName)
	if err != nil {
		return fmt.Errorf("failed to generate troubleshooting guide: %w", err)
	}
	pages = append(pages, troubleshootingPage)

	// Generate learning path
	learningPage, err := ws.generator.GenerateLearningPath(issues, projectName)
	if err != nil {
		return fmt.Errorf("failed to generate learning path: %w", err)
	}
	pages = append(pages, learningPage)

	// Publish all pages
	return ws.client.PublishPages(ctx, pages)
}

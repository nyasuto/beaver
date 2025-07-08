# GitHub API Integration

This document describes the GitHub API integration implemented in Beaver Astro Edition.

## Overview

The GitHub integration provides comprehensive access to GitHub repositories, issues, and repository data using the Octokit REST API client. It includes proper authentication, error handling, rate limiting awareness, and type safety.

## Features

### Core Features
- **Repository Information**: Access to repository metadata, statistics, and configuration
- **Issues Management**: Fetch, create, update, and analyze GitHub issues
- **Commits Access**: Repository commit history and individual commit details
- **Rate Limiting**: Automatic rate limit awareness and error handling
- **Type Safety**: Full TypeScript support with Zod validation

### API Endpoints
- `GET /api/github/health` - GitHub API health check and connectivity test
- `GET /api/github/repository` - Repository information and statistics
- `GET /api/github/issues` - Issues listing with filtering and pagination
- `POST /api/github/issues` - Create new issues

## Setup

### 1. GitHub Personal Access Token

Create a GitHub Personal Access Token with the following permissions:

**Required Scopes:**
- `repo` - Full repository access (for private repos)
- `public_repo` - Public repository access (for public repos only)
- `read:user` - Read user profile information

**Optional Scopes:**
- `read:org` - Read organization information
- `admin:repo_hook` - Manage repository webhooks (future feature)

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Update the following variables:

```env
# Required
GITHUB_TOKEN=ghp_your_personal_access_token_here
GITHUB_OWNER=your_github_username_or_org
GITHUB_REPO=your_repository_name

# Optional
GITHUB_BASE_URL=https://api.github.com
GITHUB_USER_AGENT=beaver-astro/1.0.0
```

### 3. Verification

Test your configuration:

```bash
curl http://localhost:4321/api/github/health
```

Expected response for healthy configuration:
```json
{
  "success": true,
  "status": "healthy",
  "health_score": 100,
  "checks": {
    "configuration": true,
    "authentication": true,
    "rate_limit": true,
    "repository_access": true
  }
}
```

## Usage

### Client Usage

```typescript
import { createGitHubServicesFromEnv } from '../lib/github';

// Create services from environment
const servicesResult = createGitHubServicesFromEnv();

if (servicesResult.success) {
  const { client, issues, repository } = servicesResult.data;
  
  // Fetch repository info
  const repo = await repository.getRepository();
  
  // Fetch issues
  const issuesList = await issues.getIssues({ 
    state: 'open', 
    per_page: 10 
  });
  
  // Create issue
  const newIssue = await issues.createIssue({
    title: 'Bug Report',
    body: 'Description...',
    labels: ['bug', 'priority: high']
  });
}
```

### API Usage

**Get Repository Information:**
```bash
curl "http://localhost:4321/api/github/repository?include_stats=true"
```

**Get Issues:**
```bash
curl "http://localhost:4321/api/github/issues?state=open&per_page=10"
```

**Create Issue:**
```bash
curl -X POST "http://localhost:4321/api/github/issues" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Feature Request",
    "body": "Description of the feature...",
    "labels": ["enhancement"]
  }'
```

## API Reference

### Repository API

#### GET /api/github/repository

Query Parameters:
- `include_stats` (boolean) - Include repository statistics
- `include_commits` (boolean) - Include recent commits
- `include_languages` (boolean) - Include repository languages
- `include_contributors` (boolean) - Include contributors
- `commits_limit` (number) - Number of commits to fetch (1-100)

### Issues API

#### GET /api/github/issues

Query Parameters:
- `state` (string) - Issue state: 'open', 'closed', 'all'
- `labels` (string) - Comma-separated list of labels
- `sort` (string) - Sort by: 'created', 'updated', 'comments'
- `direction` (string) - Direction: 'asc', 'desc'
- `page` (number) - Page number for pagination
- `per_page` (number) - Items per page (1-100)
- `include_stats` (boolean) - Include issue statistics
- `include_pull_requests` (boolean) - Include pull requests

#### POST /api/github/issues

Request Body:
```json
{
  "title": "Issue Title",
  "body": "Issue description",
  "labels": ["label1", "label2"],
  "assignees": ["username1"],
  "milestone": "milestone_number_or_name"
}
```

### Health Check API

#### GET /api/github/health

Returns connectivity status and diagnostics.

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "status": 400
  }
}
```

Common error codes:
- `GITHUB_CONFIG_ERROR` - Configuration issues
- `UNAUTHORIZED` - Invalid or missing token
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Repository or resource not found
- `RATE_LIMIT` - Rate limit exceeded
- `VALIDATION_ERROR` - Invalid request parameters

## Rate Limiting

The GitHub API has rate limits:
- **Personal Access Token**: 5,000 requests per hour
- **Unauthenticated**: 60 requests per hour

The integration includes:
- Automatic rate limit detection
- Rate limit information in responses
- Proper error handling for rate limit exceeded

Check current rate limit:
```bash
curl "http://localhost:4321/api/github/health"
```

## Type Safety

All GitHub API responses are validated using Zod schemas:

```typescript
import { IssueSchema, RepositorySchema } from '../lib/github';

// Validated issue data
const issue = IssueSchema.parse(rawIssueData);

// Validated repository data
const repo = RepositorySchema.parse(rawRepoData);
```

## Performance Considerations

### Caching
- Repository data: 10 minutes cache
- Issues data: 5 minutes cache
- Health checks: No cache

### Pagination
- Default page size: 30 items
- Maximum page size: 100 items
- Use pagination for large datasets

### Batch Requests
```typescript
// Fetch multiple data types in parallel
const [repo, issues, languages] = await Promise.all([
  repository.getRepository(),
  issues.getIssues({ per_page: 10 }),
  repository.getLanguages()
]);
```

## Security

### Token Security
- Store tokens in environment variables
- Never commit tokens to version control
- Use minimum required permissions
- Rotate tokens regularly

### API Security
- Input validation with Zod schemas
- Proper error handling without information disclosure
- Rate limiting compliance
- HTTPS only in production

## Troubleshooting

### Common Issues

**401 Unauthorized:**
- Check if token is valid
- Verify token has required scopes
- Ensure token is not expired

**403 Forbidden:**
- Check repository permissions
- Verify token scopes
- Check if rate limit exceeded

**404 Not Found:**
- Verify repository owner/name
- Check if repository is private and token has access
- Ensure repository exists

**Rate Limit Exceeded:**
- Wait for rate limit reset
- Implement request queuing
- Consider GitHub Apps for higher limits

### Debug Mode

Enable debug logging:
```env
NODE_ENV=development
DEBUG=github:*
```

### Health Check

Always start troubleshooting with a health check:
```bash
curl http://localhost:4321/api/github/health
```

## Examples

### Fetch Issues with Labels

```typescript
const result = await issues.getIssues({
  state: 'open',
  labels: 'bug,priority: high',
  sort: 'created',
  direction: 'desc',
  per_page: 20
});

if (result.success) {
  console.log(`Found ${result.data.length} high priority bugs`);
}
```

### Repository Statistics

```typescript
const stats = await repository.getRepositoryStats();

if (stats.success) {
  const { repository, languages, recent_commits } = stats.data;
  console.log(`${repository.full_name} - ${repository.stargazers_count} stars`);
  console.log(`Languages: ${Object.keys(languages).join(', ')}`);
  console.log(`Recent commits: ${recent_commits.length}`);
}
```

### Create Issue with Template

```typescript
const issue = await issues.createIssue({
  title: 'Bug: Application crashes on startup',
  body: `
## Bug Description
Application crashes immediately after startup.

## Steps to Reproduce
1. Start the application
2. Application crashes

## Expected Behavior
Application should start normally.

## Environment
- OS: macOS
- Version: 1.0.0
  `,
  labels: ['bug', 'priority: high'],
  assignees: ['maintainer-username']
});
```

## Future Enhancements

- GitHub Apps support for higher rate limits
- Webhook integration for real-time updates
- Pull requests API integration
- GitHub Actions integration
- Repository file content access
- Advanced issue analytics
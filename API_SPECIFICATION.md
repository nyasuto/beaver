# Beaver Astro API Specification

**Version:** 1.0.0  
**Base URL:** `/api`  
**Content-Type:** `application/json`

## Overview

The Beaver Astro API provides comprehensive endpoints for GitHub issue management, analytics, and system configuration. All endpoints follow RESTful conventions and return standardized JSON responses.

## Common Response Format

### Success Response
```json
{
  "success": true,
  "data": { /* endpoint-specific data */ },
  "meta": {
    "generated_at": "2023-12-07T12:00:00Z",
    "cache_expires_at": "2023-12-07T12:05:00Z"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "status": 400
  },
  "meta": {
    "generated_at": "2023-12-07T12:00:00Z"
  }
}
```

## Authentication

Currently, no authentication is required for most endpoints. GitHub-related endpoints use server-side configuration.

## Rate Limiting

- **Default:** 60 requests per minute per IP
- **Headers:** Rate limit information included in response headers

## Endpoints

### 1. Issues API

#### GET `/api/issues`
Retrieve paginated list of issues with filtering options.

**Query Parameters:**
- `page` (integer, default: 1) - Page number
- `per_page` (integer, default: 30, max: 100) - Items per page
- `state` (enum: open|closed|all, default: all) - Issue state
- `sort` (enum: created|updated|comments, default: created) - Sort field
- `direction` (enum: asc|desc, default: desc) - Sort direction
- `labels` (string, optional) - Comma-separated label names
- `assignee` (string, optional) - Assignee username
- `creator` (string, optional) - Creator username
- `search` (string, optional) - Search in title and body

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "number": 123,
      "title": "Sample Issue",
      "body": "Issue description",
      "state": "open",
      "labels": [
        { "name": "bug", "color": "ee0701" }
      ],
      "assignee": { "login": "username", "avatar_url": "..." },
      "creator": { "login": "creator", "avatar_url": "..." },
      "created_at": "2023-12-01T10:00:00Z",
      "updated_at": "2023-12-01T15:30:00Z",
      "comments": 5
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 30,
    "total": 100,
    "total_pages": 4,
    "has_next": true,
    "has_prev": false
  }
}
```

### 2. Analytics API

#### GET `/api/analytics`
Retrieve analytics data for dashboards and reports.

**Query Parameters:**
- `timeframe` (enum: 7d|30d|90d|1y, default: 30d) - Time period
- `metrics` (string, optional) - Comma-separated metric names
- `granularity` (enum: hour|day|week|month, default: day) - Data granularity

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_issues": 42,
      "open_issues": 18,
      "closed_issues": 24,
      "avg_resolution_time_days": 3.2
    },
    "trends": {
      "daily_issues": [
        { "date": "2023-12-01", "opened": 2, "closed": 1 }
      ]
    },
    "categories": {
      "bug": { "count": 15, "percentage": 35.7 }
    },
    "contributors": [
      { "login": "alice", "issues_opened": 8, "contributions": 20 }
    ]
  }
}
```

### 3. Configuration API

#### GET `/api/config`
Retrieve application configuration settings.

**Query Parameters:**
- `section` (enum: github|ui|features|all, default: all) - Configuration section
- `include_sensitive` (boolean, default: false) - Include sensitive config flags

**Response:**
```json
{
  "success": true,
  "data": {
    "github": {
      "owner": "example",
      "repo": "example-repo",
      "base_url": "https://api.github.com"
    },
    "ui": {
      "theme": "light",
      "items_per_page": 30,
      "timezone": "UTC"
    },
    "features": {
      "analytics_enabled": true,
      "github_integration": true
    }
  }
}
```

#### POST `/api/config`
Update configuration settings (limited sections only).

**Request Body:**
```json
{
  "section": "ui",
  "settings": {
    "theme": "dark",
    "items_per_page": 50
  }
}
```

### 4. Health Check API

#### GET `/api/health`
Basic application health check.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2023-12-07T12:00:00Z",
  "uptime": 86400,
  "version": "0.1.0",
  "environment": "production",
  "performance": {
    "response_time_ms": 5,
    "memory_usage": { "heapUsed": 50000000 }
  }
}
```

### 5. GitHub Integration APIs

#### GET `/api/github/health`
Comprehensive GitHub API connectivity check.

**Response:**
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
  },
  "data": {
    "authenticated_user": { "login": "username", "type": "User" },
    "rate_limit": { "limit": 5000, "remaining": 4999 },
    "repository": { "name": "owner/repo", "private": false }
  }
}
```

#### GET `/api/github/issues`
Real GitHub issues data with advanced filtering.

**Query Parameters:** (extends `/api/issues` parameters)
- `include_stats` (boolean, default: false) - Include issue statistics
- `include_pull_requests` (boolean, default: false) - Include pull requests

#### POST `/api/github/issues`
Create new GitHub issue.

**Request Body:**
```json
{
  "title": "Issue title",
  "body": "Issue description",
  "labels": ["bug", "priority: high"],
  "assignees": ["username"]
}
```

#### GET `/api/github/repository`
Repository information and metrics.

**Query Parameters:**
- `include_stats` (boolean, default: false) - Include detailed statistics
- `include_commits` (boolean, default: false) - Include recent commits
- `include_languages` (boolean, default: false) - Include language breakdown
- `include_contributors` (boolean, default: false) - Include contributor list
- `commits_limit` (integer, default: 10, max: 100) - Number of commits to fetch

**Response:**
```json
{
  "success": true,
  "data": {
    "repository": { "full_name": "owner/repo", "description": "..." },
    "metrics": {
      "health_score": 85,
      "activity_level": "high",
      "popularity_score": 120
    }
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `GITHUB_CONFIG_ERROR` | GitHub API configuration error |
| `GITHUB_API_ERROR` | GitHub API request failed |
| `HEALTH_CHECK_ERROR` | Health check failed |
| `NOT_FOUND` | Resource not found |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded |

## Cache Headers

Most endpoints include appropriate cache headers:
- **Analytics:** 5 minutes (`max-age=300`)
- **Configuration:** 10 minutes (`max-age=600`)
- **GitHub Issues:** 5 minutes (`max-age=300`)
- **Repository:** 10 minutes (`max-age=600`)
- **Health:** No cache (`no-cache, no-store`)

## Data Validation

All endpoints use Zod schemas for input validation, ensuring type safety and consistent error reporting.

## Examples

### Fetch Open Issues with Bug Label
```bash
GET /api/issues?state=open&labels=bug&per_page=10
```

### Get Analytics for Last Week
```bash
GET /api/analytics?timeframe=7d&granularity=day
```

### Check GitHub Integration Status
```bash
GET /api/github/health
```

### Create New Issue
```bash
POST /api/github/issues
Content-Type: application/json

{
  "title": "New bug report",
  "body": "Description of the bug",
  "labels": ["bug", "priority: medium"]
}
```

---

**Note:** This API is designed for the Beaver Astro knowledge management system and follows enterprise-grade standards for reliability, security, and maintainability.
/**
 * GitHub API Integration Module
 *
 * This module provides GitHub API integration functionality for the Beaver Astro application.
 * It handles authentication, data fetching, and API interactions with GitHub.
 *
 * @module GitHubAPI
 */

// GitHub API modules will be exported here
// Example exports (to be implemented):
// export { GitHubClient } from './client';
// export { fetchIssues } from './issues';
// export { fetchPullRequests } from './pullRequests';
// export { fetchCommits } from './commits';
// export { fetchRepository } from './repository';

// Configuration and types
export const GITHUB_API_CONFIG = {
  baseUrl: 'https://api.github.com',
  version: '2022-11-28',
  userAgent: 'beaver-astro/1.0.0',
} as const;

// Rate limiting configuration
export const RATE_LIMIT_CONFIG = {
  maxRequests: 5000,
  windowMs: 60 * 60 * 1000, // 1 hour
  retryAfter: 60 * 1000, // 1 minute
} as const;

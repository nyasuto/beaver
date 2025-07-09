/**
 * GitHub API Integration Module
 *
 * This module provides comprehensive GitHub API integration functionality for the Beaver Astro application.
 * It handles authentication, data fetching, and API interactions with GitHub using Octokit.
 *
 * @module GitHubAPI
 */

// Core client
export {
  GitHubClient,
  GitHubError,
  createGitHubClient,
  type GitHubConfig,
  type GitHubAppConfig,
  GitHubConfigSchema,
  GitHubAppConfigSchema,
} from './client';

// Issues API
export {
  GitHubIssuesService,
  type Issue,
  type Label,
  type User,
  type Milestone,
  type IssuesQuery,
  type CreateIssueParams,
  type UpdateIssueParams,
  type IssueState,
  type IssueSort,
  type IssueDirection,
  IssueSchema,
  LabelSchema,
  UserSchema,
  MilestoneSchema,
  IssuesQuerySchema,
  CreateIssueSchema,
  UpdateIssueSchema,
} from './issues';

// Repository API
export {
  GitHubRepositoryService,
  type Repository,
  type Commit,
  type CommitsQuery,
  type RepositoryStats,
  RepositorySchema,
  CommitSchema,
  CommitsQuerySchema,
  RepositoryStatsSchema,
} from './repository';

// Import for internal use
import { GitHubClient, createGitHubClient, type GitHubConfig } from './client';
import { GitHubIssuesService } from './issues';
import { GitHubRepositoryService } from './repository';

// Configuration and constants
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

/**
 * Convenience function to create a fully configured GitHub service
 *
 * @param config - GitHub configuration
 * @returns Object with all GitHub services or error
 */
export function createGitHubServices(config: GitHubConfig) {
  const clientResult = createGitHubClient(config);

  if (!clientResult.success) {
    return clientResult;
  }

  const client = clientResult.data;

  return {
    success: true as const,
    data: {
      client,
      issues: new GitHubIssuesService(client),
      repository: new GitHubRepositoryService(client),
    },
  };
}

/**
 * Create GitHub services from environment variables
 *
 * @returns Object with all GitHub services or error
 */
export async function createGitHubServicesFromEnv() {
  const clientResult = await GitHubClient.fromEnvironment();

  if (!clientResult.success) {
    return clientResult;
  }

  const client = clientResult.data;

  return {
    success: true as const,
    data: {
      client,
      issues: new GitHubIssuesService(client),
      repository: new GitHubRepositoryService(client),
    },
  };
}

/**
 * GitHub API Client
 *
 * Core client for GitHub API interactions using Octokit.
 * Provides authenticated access to GitHub resources with proper error handling.
 */

import { Octokit } from '@octokit/rest';
import { z } from 'zod';
import type { Result } from '../types';

// GitHub configuration schema
export const GitHubConfigSchema = z.object({
  token: z.string().min(1, 'GitHub token is required'),
  owner: z.string().min(1, 'Repository owner is required'),
  repo: z.string().min(1, 'Repository name is required'),
  baseUrl: z.string().url().default('https://api.github.com'),
  userAgent: z.string().default('beaver-astro/1.0.0'),
});

export type GitHubConfig = z.infer<typeof GitHubConfigSchema>;

// GitHub App configuration schema (for future use)
export const GitHubAppConfigSchema = z.object({
  appId: z.number(),
  privateKey: z.string(),
  installationId: z.number(),
  baseUrl: z.string().url().default('https://api.github.com'),
});

export type GitHubAppConfig = z.infer<typeof GitHubAppConfigSchema>;

// GitHub error types
export class GitHubError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public response?: unknown
  ) {
    super(message);
    this.name = 'GitHubError';
  }
}

/**
 * GitHub API Client
 *
 * Provides authenticated access to GitHub API with proper error handling,
 * rate limiting awareness, and type safety.
 *
 * @example
 * ```typescript
 * const client = new GitHubClient({
 *   token: process.env.GITHUB_TOKEN,
 *   owner: 'nyasuto',
 *   repo: 'beaver'
 * });
 *
 * const issues = await client.getIssues();
 * if (issues.success) {
 *   console.log(`Found ${issues.data.length} issues`);
 * }
 * ```
 */
export class GitHubClient {
  private octokit: Octokit;
  private config: GitHubConfig;

  constructor(config: GitHubConfig) {
    // Validate configuration
    this.config = GitHubConfigSchema.parse(config);

    // Initialize Octokit client
    this.octokit = new Octokit({
      auth: this.config.token,
      baseUrl: this.config.baseUrl,
      userAgent: this.config.userAgent,
      request: {
        timeout: 30000, // 30 seconds
      },
    });
  }

  /**
   * Create GitHub client from environment variables
   *
   * @returns Result with GitHubClient instance or error
   */
  static fromEnvironment(): Result<GitHubClient> {
    try {
      const config: GitHubConfig = {
        token: process.env['GITHUB_TOKEN'] || '',
        owner: process.env['GITHUB_OWNER'] || '',
        repo: process.env['GITHUB_REPO'] || '',
        baseUrl: process.env['GITHUB_BASE_URL'] || 'https://api.github.com',
        userAgent: process.env['GITHUB_USER_AGENT'] || 'beaver-astro/1.0.0',
      };

      const client = new GitHubClient(config);
      return { success: true, data: client };
    } catch (error) {
      return {
        success: false,
        error: new GitHubError(
          `Failed to create GitHub client: ${error instanceof Error ? error.message : 'Unknown error'}`
        ),
      };
    }
  }

  /**
   * Get repository information
   *
   * @returns Promise resolving to repository data or error
   */
  async getRepository(): Promise<Result<unknown>> {
    try {
      const response = await this.octokit.rest.repos.get({
        owner: this.config.owner,
        repo: this.config.repo,
      });

      return { success: true, data: response.data };
    } catch (error: unknown) {
      return {
        success: false,
        error: this.handleError(error, 'Failed to fetch repository'),
      };
    }
  }

  /**
   * Get rate limit information
   *
   * @returns Promise resolving to rate limit data or error
   */
  async getRateLimit(): Promise<Result<unknown>> {
    try {
      const response = await this.octokit.rest.rateLimit.get();
      return { success: true, data: response.data };
    } catch (error: unknown) {
      return {
        success: false,
        error: this.handleError(error, 'Failed to fetch rate limit'),
      };
    }
  }

  /**
   * Test GitHub API connection
   *
   * @returns Promise resolving to connection status
   */
  async testConnection(): Promise<Result<{ connected: boolean; user?: unknown }>> {
    try {
      const response = await this.octokit.rest.users.getAuthenticated();
      return {
        success: true,
        data: {
          connected: true,
          user: response.data,
        },
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: this.handleError(error, 'GitHub connection test failed'),
      };
    }
  }

  /**
   * Get raw Octokit instance for advanced usage
   *
   * @returns Octokit instance
   */
  getOctokit(): Octokit {
    return this.octokit;
  }

  /**
   * Get current configuration
   *
   * @returns GitHub configuration (without sensitive token)
   */
  getConfig(): Omit<GitHubConfig, 'token'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { token: _token, ...safeConfig } = this.config;
    return safeConfig;
  }

  /**
   * Handle GitHub API errors with proper typing and context
   *
   * @param error - Original error from GitHub API
   * @param context - Additional context for the error
   * @returns Formatted GitHubError
   */
  private handleError(error: unknown, context: string): GitHubError {
    if (typeof error === 'object' && error !== null && 'status' in error) {
      const errorObj = error as { status: number; response?: unknown };
      const status = errorObj.status;
      const message = this.extractErrorMessage(error) || 'Unknown GitHub API error';

      switch (status) {
        case 401:
          return new GitHubError(
            `${context}: Unauthorized - Check your GitHub token`,
            status,
            'UNAUTHORIZED',
            errorObj.response
          );
        case 403:
          if (message.includes('rate limit')) {
            return new GitHubError(
              `${context}: Rate limit exceeded`,
              status,
              'RATE_LIMIT',
              errorObj.response
            );
          }
          return new GitHubError(
            `${context}: Forbidden - Insufficient permissions`,
            status,
            'FORBIDDEN',
            errorObj.response
          );
        case 404:
          return new GitHubError(
            `${context}: Repository or resource not found`,
            status,
            'NOT_FOUND',
            errorObj.response
          );
        case 422:
          return new GitHubError(
            `${context}: Validation failed - ${message}`,
            status,
            'VALIDATION_ERROR',
            errorObj.response
          );
        default:
          return new GitHubError(`${context}: ${message}`, status, 'API_ERROR', errorObj.response);
      }
    }

    return new GitHubError(
      `${context}: ${this.extractErrorMessage(error) || 'Unknown error'}`,
      undefined,
      'UNKNOWN_ERROR'
    );
  }

  /**
   * Extract error message from unknown error object
   */
  private extractErrorMessage(error: unknown): string | null {
    if (typeof error === 'object' && error !== null) {
      // Try to get message from response.data.message
      if ('response' in error && typeof error.response === 'object' && error.response !== null) {
        if (
          'data' in error.response &&
          typeof error.response.data === 'object' &&
          error.response.data !== null
        ) {
          if ('message' in error.response.data && typeof error.response.data.message === 'string') {
            return error.response.data.message;
          }
        }
      }

      // Try to get message directly
      if ('message' in error && typeof error.message === 'string') {
        return error.message;
      }
    }

    return null;
  }
}

/**
 * Create a GitHub client instance with validation
 *
 * @param config - GitHub configuration
 * @returns Result with GitHubClient instance or error
 */
export function createGitHubClient(config: GitHubConfig): Result<GitHubClient> {
  try {
    const client = new GitHubClient(config);
    return { success: true, data: client };
  } catch (error) {
    return {
      success: false,
      error: new GitHubError(
        `Failed to create GitHub client: ${error instanceof Error ? error.message : 'Unknown error'}`
      ),
    };
  }
}

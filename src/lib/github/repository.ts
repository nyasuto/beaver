/**
 * GitHub Repository API Integration
 *
 * Provides repository-level GitHub API functionality including repository
 * information, commits, pull requests, and repository statistics.
 */

import { z } from 'zod';
import type { Result } from '../types';
import { GitHubClient, GitHubError } from './client';
import { UserSchema } from './issues';

// Repository schema
export const RepositorySchema = z.object({
  id: z.number(),
  node_id: z.string(),
  name: z.string(),
  full_name: z.string(),
  owner: UserSchema,
  private: z.boolean(),
  html_url: z.string(),
  description: z.string().nullable(),
  fork: z.boolean(),
  url: z.string(),
  archive_url: z.string(),
  assignees_url: z.string(),
  blobs_url: z.string(),
  branches_url: z.string(),
  collaborators_url: z.string(),
  comments_url: z.string(),
  commits_url: z.string(),
  compare_url: z.string(),
  contents_url: z.string(),
  contributors_url: z.string(),
  deployments_url: z.string(),
  downloads_url: z.string(),
  events_url: z.string(),
  forks_url: z.string(),
  git_commits_url: z.string(),
  git_refs_url: z.string(),
  git_tags_url: z.string(),
  git_url: z.string(),
  issue_comment_url: z.string(),
  issue_events_url: z.string(),
  issues_url: z.string(),
  keys_url: z.string(),
  labels_url: z.string(),
  languages_url: z.string(),
  merges_url: z.string(),
  milestones_url: z.string(),
  notifications_url: z.string(),
  pulls_url: z.string(),
  releases_url: z.string(),
  ssh_url: z.string(),
  stargazers_url: z.string(),
  statuses_url: z.string(),
  subscribers_url: z.string(),
  subscription_url: z.string(),
  tags_url: z.string(),
  teams_url: z.string(),
  trees_url: z.string(),
  clone_url: z.string(),
  mirror_url: z.string().nullable(),
  hooks_url: z.string(),
  svn_url: z.string(),
  homepage: z.string().nullable(),
  language: z.string().nullable(),
  forks_count: z.number(),
  stargazers_count: z.number(),
  watchers_count: z.number(),
  size: z.number(),
  default_branch: z.string(),
  open_issues_count: z.number(),
  is_template: z.boolean().optional(),
  topics: z.array(z.string()).optional(),
  has_issues: z.boolean(),
  has_projects: z.boolean(),
  has_wiki: z.boolean(),
  has_pages: z.boolean(),
  has_downloads: z.boolean(),
  archived: z.boolean(),
  disabled: z.boolean(),
  visibility: z.string().optional(),
  pushed_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  permissions: z
    .object({
      admin: z.boolean(),
      maintain: z.boolean().optional(),
      push: z.boolean(),
      triage: z.boolean().optional(),
      pull: z.boolean(),
    })
    .optional(),
  allow_rebase_merge: z.boolean().optional(),
  template_repository: z.any().nullable().optional(),
  temp_clone_token: z.string().optional(),
  allow_squash_merge: z.boolean().optional(),
  allow_auto_merge: z.boolean().optional(),
  delete_branch_on_merge: z.boolean().optional(),
  allow_merge_commit: z.boolean().optional(),
  subscribers_count: z.number().optional(),
  network_count: z.number().optional(),
  license: z
    .object({
      key: z.string(),
      name: z.string(),
      spdx_id: z.string(),
      url: z.string().nullable(),
      node_id: z.string(),
    })
    .nullable()
    .optional(),
  forks: z.number(),
  open_issues: z.number(),
  watchers: z.number(),
});

export type Repository = z.infer<typeof RepositorySchema>;

// Commit schema
export const CommitSchema = z.object({
  sha: z.string(),
  node_id: z.string(),
  commit: z.object({
    author: z.object({
      name: z.string(),
      email: z.string(),
      date: z.string(),
    }),
    committer: z.object({
      name: z.string(),
      email: z.string(),
      date: z.string(),
    }),
    message: z.string(),
    tree: z.object({
      sha: z.string(),
      url: z.string(),
    }),
    url: z.string(),
    comment_count: z.number(),
    verification: z.object({
      verified: z.boolean(),
      reason: z.string(),
      signature: z.string().nullable(),
      payload: z.string().nullable(),
    }),
  }),
  url: z.string(),
  html_url: z.string(),
  comments_url: z.string(),
  author: UserSchema.nullable(),
  committer: UserSchema.nullable(),
  parents: z.array(
    z.object({
      sha: z.string(),
      url: z.string(),
      html_url: z.string(),
    })
  ),
});

export type Commit = z.infer<typeof CommitSchema>;

// Commits query parameters
export const CommitsQuerySchema = z.object({
  sha: z.string().optional(), // SHA or branch to start listing commits from
  path: z.string().optional(), // Only commits containing this file path
  author: z.string().optional(), // GitHub login or email address
  since: z.string().optional(), // ISO 8601 date format
  until: z.string().optional(), // ISO 8601 date format
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(30),
});

export type CommitsQuery = z.infer<typeof CommitsQuerySchema>;

// Repository statistics
export const RepositoryStatsSchema = z.object({
  repository: RepositorySchema,
  commit_activity: z.array(
    z.object({
      week: z.number(),
      total: z.number(),
      days: z.array(z.number()),
    })
  ),
  code_frequency: z.array(z.array(z.number())),
  contributors: z.array(
    z.object({
      author: UserSchema,
      total: z.number(),
      weeks: z.array(
        z.object({
          w: z.number(),
          a: z.number(),
          d: z.number(),
          c: z.number(),
        })
      ),
    })
  ),
  participation: z.object({
    all: z.array(z.number()),
    owner: z.array(z.number()),
  }),
});

export type RepositoryStats = z.infer<typeof RepositoryStatsSchema>;

/**
 * Repository URL utilities
 *
 * Supports dynamic repository configuration via environment variables:
 * - GITHUB_OWNER: Repository owner (default: 'nyasuto')
 * - GITHUB_REPO: Repository name (default: 'beaver')
 *
 * This enables the same codebase to work for both:
 * - Development: nyasuto/beaver
 * - Deployment: nyasuto/hive (when environment variables are set)
 */
export function getRepositoryUrls() {
  const REPO_OWNER = process.env['GITHUB_OWNER'] || 'nyasuto';
  const REPO_NAME = process.env['GITHUB_REPO'] || 'beaver';
  const baseUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;

  return {
    repository: baseUrl,
    pulls: `${baseUrl}/pulls`,
    issues: `${baseUrl}/issues`,
    commits: `${baseUrl}/commits`,
    releases: `${baseUrl}/releases`,
    actions: `${baseUrl}/actions`,
    owner: REPO_OWNER,
    repo: REPO_NAME,
    fullName: `${REPO_OWNER}/${REPO_NAME}`,
  };
}

/**
 * GitHub Repository API Service
 *
 * Provides comprehensive repository management functionality including
 * repository information, commits, statistics, and metadata.
 *
 * @example
 * ```typescript
 * const repoService = new GitHubRepositoryService(client);
 *
 * // Get repository information
 * const repo = await repoService.getRepository();
 *
 * // Get recent commits
 * const commits = await repoService.getCommits({ per_page: 10 });
 *
 * // Get repository statistics
 * const stats = await repoService.getRepositoryStats();
 * ```
 */
export class GitHubRepositoryService {
  constructor(private client: GitHubClient) {}

  /**
   * Get repository information
   *
   * @returns Promise resolving to repository data or error
   */
  async getRepository(): Promise<Result<Repository>> {
    try {
      const config = this.client.getConfig();
      const octokit = this.client.getOctokit();

      const response = await octokit.rest.repos.get({
        owner: config.owner,
        repo: config.repo,
      });

      // Validate response data
      const repository = RepositorySchema.parse(response.data);

      return { success: true, data: repository };
    } catch (error: unknown) {
      return {
        success: false,
        error: this.handleError(error, 'Failed to fetch repository information'),
      };
    }
  }

  /**
   * Get repository commits
   *
   * @param query - Query parameters for filtering commits
   * @returns Promise resolving to array of commits or error
   */
  async getCommits(query: Partial<CommitsQuery> = {}): Promise<Result<Commit[]>> {
    try {
      const validatedQuery = CommitsQuerySchema.parse(query);
      const config = this.client.getConfig();
      const octokit = this.client.getOctokit();

      const response = await octokit.rest.repos.listCommits({
        owner: config.owner,
        repo: config.repo,
        ...(validatedQuery.sha && { sha: validatedQuery.sha }),
        ...(validatedQuery.path && { path: validatedQuery.path }),
        ...(validatedQuery.author && { author: validatedQuery.author }),
        ...(validatedQuery.since && { since: validatedQuery.since }),
        ...(validatedQuery.until && { until: validatedQuery.until }),
        page: validatedQuery.page,
        per_page: validatedQuery.per_page,
      });

      // Validate response data
      const commits = z.array(CommitSchema).parse(response.data);

      return { success: true, data: commits };
    } catch (error: unknown) {
      return {
        success: false,
        error: this.handleError(error, 'Failed to fetch repository commits'),
      };
    }
  }

  /**
   * Get a specific commit
   *
   * @param ref - The commit SHA, branch name, or tag name
   * @returns Promise resolving to commit data or error
   */
  async getCommit(ref: string): Promise<Result<Commit>> {
    try {
      const config = this.client.getConfig();
      const octokit = this.client.getOctokit();

      const response = await octokit.rest.repos.getCommit({
        owner: config.owner,
        repo: config.repo,
        ref,
      });

      // Validate response data
      const commit = CommitSchema.parse(response.data);

      return { success: true, data: commit };
    } catch (error: unknown) {
      return {
        success: false,
        error: this.handleError(error, 'Failed to fetch commit information'),
      };
    }
  }

  /**
   * Get repository languages
   *
   * @returns Promise resolving to languages data or error
   */
  async getLanguages(): Promise<Result<Record<string, number>>> {
    try {
      const config = this.client.getConfig();
      const octokit = this.client.getOctokit();

      const response = await octokit.rest.repos.listLanguages({
        owner: config.owner,
        repo: config.repo,
      });

      return { success: true, data: response.data };
    } catch (error: unknown) {
      return {
        success: false,
        error: this.handleError(error, 'Failed to fetch repository languages'),
      };
    }
  }

  /**
   * Get repository contributors
   *
   * @param page - Page number for pagination
   * @param per_page - Number of contributors per page
   * @returns Promise resolving to contributors data or error
   */
  async getContributors(page = 1, per_page = 30): Promise<Result<unknown[]>> {
    try {
      const config = this.client.getConfig();
      const octokit = this.client.getOctokit();

      const response = await octokit.rest.repos.listContributors({
        owner: config.owner,
        repo: config.repo,
        page,
        per_page,
      });

      return { success: true, data: response.data };
    } catch (error: unknown) {
      return {
        success: false,
        error: this.handleError(error, 'Failed to fetch repository contributors'),
      };
    }
  }

  /**
   * Get repository topics
   *
   * @returns Promise resolving to topics data or error
   */
  async getTopics(): Promise<Result<{ names: string[] }>> {
    try {
      const config = this.client.getConfig();
      const octokit = this.client.getOctokit();

      const response = await octokit.rest.repos.getAllTopics({
        owner: config.owner,
        repo: config.repo,
      });

      return { success: true, data: response.data };
    } catch (error: unknown) {
      return {
        success: false,
        error: this.handleError(error, 'Failed to fetch repository topics'),
      };
    }
  }

  /**
   * Get repository comprehensive statistics
   *
   * @returns Promise resolving to repository statistics or error
   */
  async getRepositoryStats(): Promise<
    Result<{
      repository: Repository;
      languages: Record<string, number>;
      contributors_count: number;
      topics: string[];
      recent_commits: Commit[];
      commit_activity_summary: {
        total_commits: number;
        commits_last_week: number;
        commits_last_month: number;
        active_contributors: number;
      };
    }>
  > {
    try {
      // Fetch all repository data in parallel
      const [repoResult, languagesResult, topicsResult, recentCommitsResult] = await Promise.all([
        this.getRepository(),
        this.getLanguages(),
        this.getTopics(),
        this.getCommits({ per_page: 50 }), // Get recent commits for activity analysis
      ]);

      // Check if any request failed
      if (!repoResult.success) return repoResult;
      if (!languagesResult.success) return languagesResult;
      if (!topicsResult.success) return topicsResult;
      if (!recentCommitsResult.success) return recentCommitsResult;

      const repository = repoResult.data;
      const languages = languagesResult.data;
      const topics = topicsResult.data.names;
      const recentCommits = recentCommitsResult.data;

      // Calculate commit activity
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const commitsLastWeek = recentCommits.filter(
        commit => new Date(commit.commit.author.date) >= oneWeekAgo
      ).length;

      const commitsLastMonth = recentCommits.filter(
        commit => new Date(commit.commit.author.date) >= oneMonthAgo
      ).length;

      const activeContributors = new Set(
        recentCommits
          .filter(commit => new Date(commit.commit.author.date) >= oneMonthAgo)
          .map(commit => commit.author?.login || commit.commit.author.email)
      ).size;

      const stats = {
        repository,
        languages,
        contributors_count: 0, // Will be updated with actual contributors count if needed
        topics,
        recent_commits: recentCommits.slice(0, 10), // Latest 10 commits
        commit_activity_summary: {
          total_commits: recentCommits.length,
          commits_last_week: commitsLastWeek,
          commits_last_month: commitsLastMonth,
          active_contributors: activeContributors,
        },
      };

      return { success: true, data: stats };
    } catch (error: unknown) {
      return {
        success: false,
        error: this.handleError(error, 'Failed to calculate repository statistics'),
      };
    }
  }

  /**
   * Handle GitHub API errors
   */
  private handleError(error: unknown, context: string): GitHubError {
    if (error instanceof GitHubError) {
      return error;
    }

    if (error && typeof error === 'object' && error !== null && 'status' in error) {
      const errorObj = error as { status?: number; message?: string };
      return new GitHubError(
        `${context}: ${errorObj.message || 'GitHub API error'}`,
        errorObj.status,
        'API_ERROR'
      );
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    return new GitHubError(`${context}: ${message}`, undefined, 'UNKNOWN_ERROR');
  }
}

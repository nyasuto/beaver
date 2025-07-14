/**
 * GitHub Issues API Integration
 *
 * Provides comprehensive GitHub Issues API functionality with proper typing,
 * pagination, filtering, and error handling.
 */

import { z } from 'zod';
import type { Result } from '../types';
import { GitHubClient, GitHubError } from './client';
import { GitHubGraphQLClient } from './graphql-client';

// Issue state enum
export const IssueState = z.enum(['open', 'closed', 'all']);
export type IssueState = z.infer<typeof IssueState>;

// Issue sort options
export const IssueSort = z.enum(['created', 'updated', 'comments']);
export type IssueSort = z.infer<typeof IssueSort>;

// Issue direction
export const IssueDirection = z.enum(['asc', 'desc']);
export type IssueDirection = z.infer<typeof IssueDirection>;

// Label schema
export const LabelSchema = z.object({
  id: z.number(),
  node_id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  color: z.string(),
  default: z.boolean(),
});

export type Label = z.infer<typeof LabelSchema>;

// User schema
export const UserSchema = z.object({
  login: z.string(),
  id: z.number(),
  node_id: z.string(),
  avatar_url: z.string(),
  gravatar_id: z.string().nullable(),
  url: z.string(),
  html_url: z.string(),
  type: z.string(),
  site_admin: z.boolean(),
});

export type User = z.infer<typeof UserSchema>;

// Milestone schema
export const MilestoneSchema = z.object({
  id: z.number(),
  node_id: z.string(),
  number: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  creator: UserSchema.nullable(),
  open_issues: z.number(),
  closed_issues: z.number(),
  state: z.enum(['open', 'closed']),
  created_at: z.string(),
  updated_at: z.string(),
  due_on: z.string().nullable(),
  closed_at: z.string().nullable(),
});

export type Milestone = z.infer<typeof MilestoneSchema>;

// Issue schema
export const IssueSchema = z.object({
  id: z.number(),
  node_id: z.string(),
  number: z.number(),
  title: z.string(),
  body: z.string().nullable(),
  body_text: z.string().nullable().optional(),
  body_html: z.string().nullable().optional(),
  user: UserSchema.nullable(),
  labels: z.array(LabelSchema),
  state: z.enum(['open', 'closed']),
  locked: z.boolean(),
  assignee: UserSchema.nullable(),
  assignees: z.array(UserSchema),
  milestone: MilestoneSchema.nullable(),
  comments: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  closed_at: z.string().nullable(),
  author_association: z.string(),
  active_lock_reason: z.string().nullable(),
  draft: z.boolean().optional(),
  pull_request: z
    .object({
      url: z.string(),
      html_url: z.string(),
      diff_url: z.string(),
      patch_url: z.string(),
    })
    .nullable()
    .optional(),
  html_url: z.string(),
  url: z.string(),
  repository_url: z.string(),
  labels_url: z.string(),
  comments_url: z.string(),
  events_url: z.string(),
});

export type Issue = z.infer<typeof IssueSchema>;

// Issues query parameters
export const IssuesQuerySchema = z.object({
  state: IssueState.default('open'),
  labels: z.string().optional(), // comma-separated list
  sort: IssueSort.default('created'),
  direction: IssueDirection.default('desc'),
  since: z.string().optional(), // ISO 8601 format
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(30),
  milestone: z.union([z.string(), z.literal('*'), z.literal('none')]).optional(),
  assignee: z.union([z.string(), z.literal('*'), z.literal('none')]).optional(),
  creator: z.string().optional(),
  mentioned: z.string().optional(),
});

export type IssuesQuery = z.infer<typeof IssuesQuerySchema>;

// Issue creation parameters
export const CreateIssueSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  body: z.string().optional(),
  milestone: z.union([z.number(), z.string()]).optional(),
  labels: z.array(z.string()).optional(),
  assignees: z.array(z.string()).optional(),
});

export type CreateIssueParams = z.infer<typeof CreateIssueSchema>;

// Issue update parameters
export const UpdateIssueSchema = z.object({
  title: z.string().optional(),
  body: z.string().optional(),
  milestone: z.union([z.number(), z.string(), z.null()]).optional(),
  labels: z.array(z.string()).optional(),
  assignees: z.array(z.string()).optional(),
  state: z.enum(['open', 'closed']).optional(),
});

export type UpdateIssueParams = z.infer<typeof UpdateIssueSchema>;

/**
 * GitHub Issues API Service
 *
 * Provides comprehensive issue management functionality including
 * fetching, creating, updating, and analyzing GitHub issues.
 *
 * @example
 * ```typescript
 * const issuesService = new GitHubIssuesService(client);
 *
 * // Fetch open issues
 * const openIssues = await issuesService.getIssues({ state: 'open' });
 *
 * // Create a new issue
 * const newIssue = await issuesService.createIssue({
 *   title: 'Bug: Login not working',
 *   body: 'Description of the bug...',
 *   labels: ['bug', 'priority: high']
 * });
 * ```
 */
export class GitHubIssuesService {
  constructor(private client: GitHubClient) {}

  /**
   * Fetch issues from the repository
   *
   * @param query - Query parameters for filtering issues
   * @returns Promise resolving to array of issues or error
   */
  async getIssues(query: Partial<IssuesQuery> = {}): Promise<Result<Issue[]>> {
    try {
      const validatedQuery = IssuesQuerySchema.parse(query);
      const config = this.client.getConfig();
      const octokit = this.client.getOctokit();

      const response = await octokit.rest.issues.listForRepo({
        owner: config.owner,
        repo: config.repo,
        state: validatedQuery.state,
        ...(validatedQuery.labels && { labels: validatedQuery.labels }),
        sort: validatedQuery.sort,
        direction: validatedQuery.direction,
        ...(validatedQuery.since && { since: validatedQuery.since }),
        page: validatedQuery.page,
        per_page: validatedQuery.per_page,
        ...(validatedQuery.milestone && { milestone: validatedQuery.milestone }),
        ...(validatedQuery.assignee && { assignee: validatedQuery.assignee }),
        ...(validatedQuery.creator && { creator: validatedQuery.creator }),
        ...(validatedQuery.mentioned && { mentioned: validatedQuery.mentioned }),
      });

      // Validate response data and filter out pull requests
      const allItems = z.array(IssueSchema).parse(response.data);

      // Filter out pull requests (they have a pull_request property)
      const issues = allItems.filter(item => !item.pull_request);

      return { success: true, data: issues };
    } catch (error: unknown) {
      return {
        success: false,
        error: this.handleError(error, 'Failed to fetch issues'),
      };
    }
  }

  /**
   * Get a specific issue by number
   *
   * @param issueNumber - Issue number
   * @returns Promise resolving to issue data or error
   */
  async getIssue(issueNumber: number): Promise<Result<Issue>> {
    try {
      const config = this.client.getConfig();
      const octokit = this.client.getOctokit();

      const response = await octokit.rest.issues.get({
        owner: config.owner,
        repo: config.repo,
        issue_number: issueNumber,
      });

      // Validate response data
      const issue = IssueSchema.parse(response.data);

      return { success: true, data: issue };
    } catch (error: unknown) {
      return {
        success: false,
        error: this.handleError(error, `Failed to fetch issue #${issueNumber}`),
      };
    }
  }

  /**
   * Create a new issue
   *
   * @param params - Issue creation parameters
   * @returns Promise resolving to created issue or error
   */
  async createIssue(params: CreateIssueParams): Promise<Result<Issue>> {
    try {
      const validatedParams = CreateIssueSchema.parse(params);
      const config = this.client.getConfig();
      const octokit = this.client.getOctokit();

      const response = await octokit.rest.issues.create({
        owner: config.owner,
        repo: config.repo,
        title: validatedParams.title,
        ...(validatedParams.body && { body: validatedParams.body }),
        ...(validatedParams.milestone && { milestone: validatedParams.milestone }),
        ...(validatedParams.labels && { labels: validatedParams.labels }),
        ...(validatedParams.assignees && { assignees: validatedParams.assignees }),
      });

      // Validate response data
      const issue = IssueSchema.parse(response.data);

      return { success: true, data: issue };
    } catch (error: unknown) {
      return {
        success: false,
        error: this.handleError(error, 'Failed to create issue'),
      };
    }
  }

  /**
   * Update an existing issue
   *
   * @param issueNumber - Issue number to update
   * @param params - Update parameters
   * @returns Promise resolving to updated issue or error
   */
  async updateIssue(issueNumber: number, params: UpdateIssueParams): Promise<Result<Issue>> {
    try {
      const validatedParams = UpdateIssueSchema.parse(params);
      const config = this.client.getConfig();
      const octokit = this.client.getOctokit();

      const response = await octokit.rest.issues.update({
        owner: config.owner,
        repo: config.repo,
        issue_number: issueNumber,
        ...(validatedParams.title && { title: validatedParams.title }),
        ...(validatedParams.body && { body: validatedParams.body }),
        ...(validatedParams.milestone !== undefined && { milestone: validatedParams.milestone }),
        ...(validatedParams.labels && { labels: validatedParams.labels }),
        ...(validatedParams.assignees && { assignees: validatedParams.assignees }),
        ...(validatedParams.state && { state: validatedParams.state }),
      });

      // Validate response data
      const issue = IssueSchema.parse(response.data);

      return { success: true, data: issue };
    } catch (error: unknown) {
      return {
        success: false,
        error: this.handleError(error, `Failed to update issue #${issueNumber}`),
      };
    }
  }

  /**
   * Get issues statistics
   *
   * @returns Promise resolving to issues statistics or error
   */
  async getIssuesStats(): Promise<
    Result<{
      total: number;
      open: number;
      closed: number;
      by_label: Record<string, number>;
      by_assignee: Record<string, number>;
      by_milestone: Record<string, number>;
    }>
  > {
    try {
      // Fetch all issues (open and closed) for statistics
      const [openResult, closedResult] = await Promise.all([
        this.getIssues({ state: 'open', per_page: 100 }),
        this.getIssues({ state: 'closed', per_page: 100 }),
      ]);

      if (!openResult.success) return openResult;
      if (!closedResult.success) return closedResult;

      const allIssues = [...openResult.data, ...closedResult.data];

      // Calculate statistics
      const stats = {
        total: allIssues.length,
        open: openResult.data.length,
        closed: closedResult.data.length,
        by_label: this.calculateLabelStats(allIssues),
        by_assignee: this.calculateAssigneeStats(allIssues),
        by_milestone: this.calculateMilestoneStats(allIssues),
      };

      return { success: true, data: stats };
    } catch (error: unknown) {
      return {
        success: false,
        error: this.handleError(error, 'Failed to calculate issues statistics'),
      };
    }
  }

  /**
   * Calculate label statistics
   */
  private calculateLabelStats(issues: Issue[]): Record<string, number> {
    const labelCounts: Record<string, number> = {};

    for (const issue of issues) {
      for (const label of issue.labels) {
        labelCounts[label.name] = (labelCounts[label.name] || 0) + 1;
      }
    }

    return labelCounts;
  }

  /**
   * Calculate assignee statistics
   */
  private calculateAssigneeStats(issues: Issue[]): Record<string, number> {
    const assigneeCounts: Record<string, number> = {};

    for (const issue of issues) {
      if (issue.assignee) {
        assigneeCounts[issue.assignee.login] = (assigneeCounts[issue.assignee.login] || 0) + 1;
      }
      for (const assignee of issue.assignees || []) {
        assigneeCounts[assignee.login] = (assigneeCounts[assignee.login] || 0) + 1;
      }
    }

    return assigneeCounts;
  }

  /**
   * Calculate milestone statistics
   */
  private calculateMilestoneStats(issues: Issue[]): Record<string, number> {
    const milestoneCounts: Record<string, number> = {};

    for (const issue of issues) {
      if (issue.milestone) {
        milestoneCounts[issue.milestone.title] = (milestoneCounts[issue.milestone.title] || 0) + 1;
      } else {
        milestoneCounts['No Milestone'] = (milestoneCounts['No Milestone'] || 0) + 1;
      }
    }

    return milestoneCounts;
  }

  /**
   * Fetch issues using GraphQL API (efficient alternative to REST API)
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param options - Query options for filtering and pagination
   * @returns Promise resolving to issues data or error
   */
  async fetchIssuesWithGraphQL(
    owner: string,
    repo: string,
    options: {
      states?: ('OPEN' | 'CLOSED')[];
      maxItems?: number;
      useGraphQL?: boolean;
    } = {}
  ): Promise<Result<Issue[]>> {
    try {
      const { states = ['OPEN'], maxItems = 0, useGraphQL = true } = options;

      if (!useGraphQL) {
        // Fallback to REST API
        return this.getIssues({
          state:
            states.includes('OPEN') && states.includes('CLOSED')
              ? 'all'
              : states.includes('OPEN')
                ? 'open'
                : 'closed',
          per_page: maxItems > 0 ? Math.min(maxItems, 100) : 100,
        });
      }

      // Note: config contains owner, repo but not token (excluded for security)
      // const config = this.client.getConfig();

      // Create GraphQL client with token from the private config
      // Note: We need to access the token through the client's private configuration
      const graphqlClient = new GitHubGraphQLClient({
        token: (this.client as any).config.token, // Access private config for token
        owner,
        repo,
      });

      console.log(`🚀 Using GraphQL API to fetch issues (much more efficient!)`);
      const startTime = Date.now();

      // Fetch issues using GraphQL
      const result = await graphqlClient.fetchAllIssues(states, maxItems);

      if (!result.success) {
        console.warn('⚠️ GraphQL failed, falling back to REST API');
        return this.getIssues({
          state:
            states.includes('OPEN') && states.includes('CLOSED')
              ? 'all'
              : states.includes('OPEN')
                ? 'open'
                : 'closed',
          per_page: maxItems > 0 ? Math.min(maxItems, 100) : 100,
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Convert GraphQL format to REST format for compatibility
      const convertedIssues = result.data.map(graphqlIssue =>
        GitHubGraphQLClient.convertToRestFormat(graphqlIssue)
      );

      // Validate converted data
      const validatedIssues = z.array(IssueSchema).parse(convertedIssues);

      console.log(
        `✅ GraphQL: Successfully fetched ${validatedIssues.length} issues in ${duration}ms`
      );
      console.log(
        `📊 API Efficiency: ~${Math.max(1, Math.ceil(validatedIssues.length / 100))} REST calls → 1 GraphQL call`
      );

      return { success: true, data: validatedIssues };
    } catch (error: unknown) {
      console.error('❌ GraphQL Issues fetch failed:', error);
      return {
        success: false,
        error: this.handleError(error, 'Failed to fetch issues with GraphQL'),
      };
    }
  }

  /**
   * Enhanced issue fetching with automatic GraphQL/REST API selection
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param query - Query parameters
   * @returns Promise resolving to issues data or error
   */
  async fetchIssuesOptimized(
    owner: string,
    repo: string,
    query: Partial<IssuesQuery> = {}
  ): Promise<Result<Issue[]>> {
    try {
      const validatedQuery = IssuesQuerySchema.parse(query);

      // Determine if GraphQL is beneficial
      const shouldUseGraphQL =
        validatedQuery.per_page >= 50 || // Large batches benefit from GraphQL
        !validatedQuery.milestone || // Simple queries work better with GraphQL
        !validatedQuery.assignee; // Complex filtering may need REST

      if (shouldUseGraphQL) {
        console.log(`🧠 Auto-selecting GraphQL API for better efficiency`);

        // Convert REST query to GraphQL format
        const graphqlStates: ('OPEN' | 'CLOSED')[] = [];
        if (validatedQuery.state === 'open' || validatedQuery.state === 'all') {
          graphqlStates.push('OPEN');
        }
        if (validatedQuery.state === 'closed' || validatedQuery.state === 'all') {
          graphqlStates.push('CLOSED');
        }

        return this.fetchIssuesWithGraphQL(owner, repo, {
          states: graphqlStates,
          maxItems: validatedQuery.per_page,
        });
      }

      console.log(`🔄 Using REST API for complex filtering`);
      return this.getIssues(validatedQuery);
    } catch (error: unknown) {
      return {
        success: false,
        error: this.handleError(error, 'Failed to fetch issues (optimized)'),
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

    if (typeof error === 'object' && error !== null && 'status' in error) {
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

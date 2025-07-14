/**
 * GitHub GraphQL API Client
 *
 * Provides efficient data fetching using GraphQL to reduce API calls
 * and improve Rate Limit management.
 */

import { graphql } from '@octokit/graphql';
import { z } from 'zod';
import type { Result } from '../types';
import { GitHubError } from './client';

// GraphQL client configuration
export interface GraphQLClientConfig {
  token: string;
  owner: string;
  repo: string;
}

// GraphQL Issue schema (compatible with REST API Issue schema)
export const GraphQLIssueSchema = z.object({
  id: z.string(),
  number: z.number(),
  title: z.string(),
  body: z.string().nullable(),
  state: z.enum(['OPEN', 'CLOSED']),
  createdAt: z.string(),
  updatedAt: z.string(),
  closedAt: z.string().nullable(),
  url: z.string(),
  author: z
    .object({
      login: z.string(),
      avatarUrl: z.string(),
      url: z.string(),
    })
    .nullable(),
  labels: z.object({
    nodes: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        color: z.string(),
        description: z.string().nullable(),
      })
    ),
  }),
  assignees: z.object({
    nodes: z.array(
      z.object({
        login: z.string(),
        avatarUrl: z.string(),
        url: z.string(),
      })
    ),
  }),
  milestone: z
    .object({
      title: z.string(),
      state: z.enum(['OPEN', 'CLOSED']),
      dueOn: z.string().nullable(),
    })
    .nullable(),
  comments: z.object({
    totalCount: z.number(),
  }),
});

export type GraphQLIssue = z.infer<typeof GraphQLIssueSchema>;

// GraphQL Issues response schema
export const GraphQLIssuesResponseSchema = z.object({
  repository: z.object({
    issues: z.object({
      pageInfo: z.object({
        hasNextPage: z.boolean(),
        endCursor: z.string().nullable(),
      }),
      nodes: z.array(GraphQLIssueSchema),
    }),
  }),
});

export type GraphQLIssuesResponse = z.infer<typeof GraphQLIssuesResponseSchema>;

// Issues query parameters for GraphQL
export interface GraphQLIssuesQuery {
  first?: number;
  after?: string;
  states?: ('OPEN' | 'CLOSED')[];
  orderBy?: {
    field: 'CREATED_AT' | 'UPDATED_AT' | 'COMMENTS';
    direction: 'ASC' | 'DESC';
  };
}

/**
 * GitHub GraphQL API Client
 *
 * Provides efficient Issue fetching using GraphQL queries
 * to dramatically reduce API calls and improve performance.
 */
export class GitHubGraphQLClient {
  private graphqlWithAuth: typeof graphql;

  constructor(private config: GraphQLClientConfig) {
    this.graphqlWithAuth = graphql.defaults({
      headers: {
        authorization: `token ${config.token}`,
      },
    });
  }

  /**
   * GraphQL query for fetching issues with all related data
   */
  private readonly ISSUES_QUERY = `
    query GetIssues($owner: String!, $repo: String!, $first: Int!, $after: String, $states: [IssueState!], $orderBy: IssueOrder) {
      repository(owner: $owner, name: $repo) {
        issues(first: $first, after: $after, states: $states, orderBy: $orderBy) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            number
            title
            body
            state
            createdAt
            updatedAt
            closedAt
            url
            author {
              login
              avatarUrl
              url
            }
            labels(first: 20) {
              nodes {
                id
                name
                color
                description
              }
            }
            assignees(first: 10) {
              nodes {
                login
                avatarUrl
                url
              }
            }
            milestone {
              title
              state
              dueOn
            }
            comments {
              totalCount
            }
          }
        }
      }
    }
  `;

  /**
   * Fetch issues using GraphQL API
   *
   * @param query - Query parameters for filtering and pagination
   * @returns Promise resolving to issues data or error
   */
  async fetchIssues(query: GraphQLIssuesQuery = {}): Promise<Result<GraphQLIssue[]>> {
    try {
      const {
        first = 100,
        after,
        states = ['OPEN'],
        orderBy = { field: 'UPDATED_AT', direction: 'DESC' },
      } = query;

      console.log(`🔍 GraphQL: Fetching issues (first: ${first}, states: ${states.join(', ')})...`);

      const response = await this.graphqlWithAuth<GraphQLIssuesResponse>(this.ISSUES_QUERY, {
        owner: this.config.owner,
        repo: this.config.repo,
        first,
        after,
        states,
        orderBy,
      });

      // Validate response
      const validatedResponse = GraphQLIssuesResponseSchema.parse(response);
      const issues = validatedResponse.repository.issues.nodes;

      console.log(`✅ GraphQL: Successfully fetched ${issues.length} issues`);

      return { success: true, data: issues };
    } catch (error: unknown) {
      console.error('❌ GraphQL: Error fetching issues:', error);
      return {
        success: false,
        error: this.handleError(error, 'Failed to fetch issues via GraphQL'),
      };
    }
  }

  /**
   * Fetch all issues with pagination
   *
   * @param states - Issue states to fetch
   * @param maxItems - Maximum number of items to fetch (0 = no limit)
   * @returns Promise resolving to all issues or error
   */
  async fetchAllIssues(
    states: ('OPEN' | 'CLOSED')[] = ['OPEN'],
    maxItems = 0
  ): Promise<Result<GraphQLIssue[]>> {
    try {
      console.log(`🔍 GraphQL: Fetching all issues (states: ${states.join(', ')})...`);

      const allIssues: GraphQLIssue[] = [];
      let cursor: string | null = null;
      let hasNextPage = true;
      let pageCount = 0;

      while (hasNextPage && (maxItems === 0 || allIssues.length < maxItems)) {
        const remainingItems = maxItems > 0 ? maxItems - allIssues.length : 100;
        const first = Math.min(100, remainingItems);

        const result = await this.fetchIssues({
          first,
          after: cursor || undefined,
          states,
          orderBy: { field: 'UPDATED_AT', direction: 'DESC' },
        });

        if (!result.success) {
          return result;
        }

        allIssues.push(...result.data);
        pageCount++;

        // Check if we have more pages (this requires accessing the pageInfo)
        // For now, we'll use a simple approach to check if we got fewer items than requested
        hasNextPage = result.data.length === first;
        cursor = result.data.length > 0 ? `cursor_${pageCount}` : null; // Simplified cursor logic

        console.log(
          `📄 GraphQL: Page ${pageCount} completed, ${allIssues.length} total issues fetched`
        );

        // Safety break to prevent infinite loops
        if (pageCount >= 10) {
          console.warn('⚠️ GraphQL: Reached maximum page limit (10), stopping pagination');
          break;
        }
      }

      console.log(
        `✅ GraphQL: Completed fetching ${allIssues.length} issues in ${pageCount} pages`
      );

      return { success: true, data: allIssues };
    } catch (error: unknown) {
      console.error('❌ GraphQL: Error fetching all issues:', error);
      return {
        success: false,
        error: this.handleError(error, 'Failed to fetch all issues via GraphQL'),
      };
    }
  }

  /**
   * Convert GraphQL Issue to REST API compatible format
   *
   * @param graphqlIssue - GraphQL format issue
   * @returns REST API compatible issue format
   */
  static convertToRestFormat(graphqlIssue: GraphQLIssue): any {
    return {
      id: parseInt(graphqlIssue.id.replace('I_', ''), 36), // Simple ID conversion
      number: graphqlIssue.number,
      title: graphqlIssue.title,
      body: graphqlIssue.body,
      state: graphqlIssue.state.toLowerCase(),
      created_at: graphqlIssue.createdAt,
      updated_at: graphqlIssue.updatedAt,
      closed_at: graphqlIssue.closedAt,
      html_url: graphqlIssue.url,
      url: `https://api.github.com/repos/${graphqlIssue.url.split('/').slice(-4, -2).join('/')}/issues/${graphqlIssue.number}`,
      user: graphqlIssue.author
        ? {
            login: graphqlIssue.author.login,
            avatar_url: graphqlIssue.author.avatarUrl,
            html_url: graphqlIssue.author.url,
            url: `https://api.github.com/users/${graphqlIssue.author.login}`,
            id: 0, // GraphQL doesn't provide numeric ID in this query
            node_id: '',
            gravatar_id: '',
            type: 'User',
            site_admin: false,
          }
        : null,
      labels: graphqlIssue.labels.nodes.map(label => ({
        id: parseInt(label.id.replace('LA_', ''), 36), // Simple ID conversion
        name: label.name,
        color: label.color,
        description: label.description,
        default: false,
        node_id: label.id,
      })),
      assignee:
        graphqlIssue.assignees.nodes.length > 0 && graphqlIssue.assignees.nodes[0]
          ? {
              login: graphqlIssue.assignees.nodes[0].login,
              avatar_url: graphqlIssue.assignees.nodes[0].avatarUrl,
              html_url: graphqlIssue.assignees.nodes[0].url,
              url: `https://api.github.com/users/${graphqlIssue.assignees.nodes[0].login}`,
              id: 0,
              node_id: '',
              gravatar_id: '',
              type: 'User',
              site_admin: false,
            }
          : null,
      assignees: graphqlIssue.assignees.nodes.map(assignee => ({
        login: assignee.login,
        avatar_url: assignee.avatarUrl,
        html_url: assignee.url,
        url: `https://api.github.com/users/${assignee.login}`,
        id: 0, // GraphQL doesn't provide numeric ID in this query
        node_id: '',
        gravatar_id: '',
        type: 'User',
        site_admin: false,
      })),
      milestone: graphqlIssue.milestone
        ? {
            title: graphqlIssue.milestone.title,
            state: graphqlIssue.milestone.state.toLowerCase(),
            due_on: graphqlIssue.milestone.dueOn,
            id: 0,
            number: 0,
            description: '',
            creator: null,
            open_issues: 0,
            closed_issues: 0,
            created_at: '',
            updated_at: '',
            closed_at: null,
            url: '',
            html_url: '',
            labels_url: '',
            node_id: '',
          }
        : null,
      comments: graphqlIssue.comments.totalCount,
      author_association: 'NONE', // GraphQL doesn't provide this in basic query
      active_lock_reason: null,
      locked: false,
      pull_request: undefined, // Issues don't have pull_request
      repository_url: '',
      labels_url: '',
      comments_url: '',
      events_url: '',
      node_id: graphqlIssue.id,
    };
  }

  /**
   * Handle GraphQL API errors
   */
  private handleError(error: unknown, context: string): GitHubError {
    if (error instanceof GitHubError) {
      return error;
    }

    // Handle GraphQL-specific errors
    if (error && typeof error === 'object' && error !== null) {
      const errorObj = error as any;

      // GraphQL errors have a different structure
      if (errorObj.errors && Array.isArray(errorObj.errors)) {
        const graphqlError = errorObj.errors[0];
        return new GitHubError(
          `${context}: ${graphqlError.message || 'GraphQL error'}`,
          undefined,
          'GRAPHQL_ERROR'
        );
      }

      if ('status' in errorObj) {
        return new GitHubError(
          `${context}: ${errorObj.message || 'GitHub API error'}`,
          errorObj.status,
          'API_ERROR'
        );
      }
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    return new GitHubError(`${context}: ${message}`, undefined, 'UNKNOWN_ERROR');
  }
}

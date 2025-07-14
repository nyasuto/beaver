/**
 * GitHub API Schemas
 *
 * Consolidated Zod schemas for GitHub API responses, configurations, and data structures.
 * This file consolidates all GitHub-related schemas for better organization.
 */

import { z } from 'zod';

// Re-export schemas from existing GitHub modules for consolidation
export {
  GitHubClient,
  GitHubError,
  GitHubConfigSchema,
  GitHubAppConfigSchema,
  createGitHubClient,
  type GitHubConfig,
  type GitHubAppConfig,
} from '../github/client';

export {
  IssueSchema,
  LabelSchema,
  UserSchema,
  MilestoneSchema,
  IssuesQuerySchema,
  CreateIssueSchema,
  UpdateIssueSchema,
  IssueState,
  IssueSort,
  IssueDirection,
  GitHubIssuesService,
  type Issue,
  type Label,
  type User,
  type Milestone,
  type IssuesQuery,
  type CreateIssueParams,
  type UpdateIssueParams,
  type IssueState as IssueStateType,
  type IssueSort as IssueSortType,
  type IssueDirection as IssueDirectionType,
} from '../github/issues';

export {
  RepositorySchema,
  CommitSchema,
  CommitsQuerySchema,
  RepositoryStatsSchema,
  GitHubRepositoryService,
  type Repository,
  type Commit,
  type CommitsQuery,
  type RepositoryStats,
} from '../github/repository';

export {
  PullRequestSchema,
  EnhancedPullRequestSchema,
  PullsQuerySchema,
  ReviewSchema,
  BranchRefSchema,
  PullRequestState,
  PullRequestSort,
  PullRequestDirection,
  type PullRequest,
  type EnhancedPullRequest,
  type Review,
  type BranchRef,
  type PullsQuery,
  type PullRequestFilters,
  type CreatePullRequestParams,
  type UpdatePullRequestParams,
  type PullRequestStateType,
  type PullRequestSortType,
  type PullRequestDirectionType,
  type ReviewState,
} from '../schemas/pulls';

export {
  GitHubPullsService,
  formatPullRequestState,
  getRelativeTime,
  needsAttention,
} from '../github/pulls';

export {
  createGitHubServices,
  createGitHubServicesFromEnv,
  GITHUB_API_CONFIG,
  RATE_LIMIT_CONFIG,
} from '../github';

/**
 * GitHub webhook event schemas
 */
export const GitHubWebhookEventSchema = z.object({
  id: z.string(),
  type: z.enum([
    'issues',
    'issue_comment',
    'pull_request',
    'pull_request_review',
    'push',
    'create',
    'delete',
    'fork',
    'star',
    'watch',
    'release',
    'repository',
    'team',
    'organization',
    'member',
    'membership',
    'installation',
    'installation_repositories',
  ]),
  action: z.string(),
  repository: z.any(), // RepositorySchema - lazy-loaded to avoid circular imports
  sender: z.any(), // UserSchema - lazy-loaded to avoid circular imports
  installation: z
    .object({
      id: z.number(),
      account: z.any(), // UserSchema - lazy-loaded to avoid circular imports
    })
    .optional(),
  payload: z.record(z.string(), z.any()),
  created_at: z.string().datetime(),
  delivered_at: z.string().datetime().optional(),
});

export type GitHubWebhookEvent = z.infer<typeof GitHubWebhookEventSchema>;

/**
 * GitHub App installation schema
 */
export const GitHubAppInstallationSchema = z.object({
  id: z.number(),
  account: z.any(), // UserSchema - lazy-loaded to avoid circular imports
  repository_selection: z.enum(['all', 'selected']),
  access_tokens_url: z.string().url(),
  repositories_url: z.string().url(),
  html_url: z.string().url(),
  app_id: z.number(),
  target_id: z.number(),
  target_type: z.enum(['User', 'Organization']),
  permissions: z.record(z.string(), z.enum(['read', 'write', 'admin'])),
  events: z.array(z.string()),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  single_file_name: z.string().nullable().optional(),
  has_multiple_single_files: z.boolean().optional(),
  single_file_paths: z.array(z.string()).optional(),
});

export type GitHubAppInstallation = z.infer<typeof GitHubAppInstallationSchema>;

/**
 * GitHub rate limit response schema
 */
export const GitHubRateLimitSchema = z.object({
  rate: z.object({
    limit: z.number().int().min(0),
    remaining: z.number().int().min(0),
    reset: z.number().int().min(0),
    used: z.number().int().min(0),
  }),
  search: z.object({
    limit: z.number().int().min(0),
    remaining: z.number().int().min(0),
    reset: z.number().int().min(0),
    used: z.number().int().min(0),
  }),
  graphql: z.object({
    limit: z.number().int().min(0),
    remaining: z.number().int().min(0),
    reset: z.number().int().min(0),
    used: z.number().int().min(0),
  }),
  integration_manifest: z.object({
    limit: z.number().int().min(0),
    remaining: z.number().int().min(0),
    reset: z.number().int().min(0),
    used: z.number().int().min(0),
  }),
  source_import: z.object({
    limit: z.number().int().min(0),
    remaining: z.number().int().min(0),
    reset: z.number().int().min(0),
    used: z.number().int().min(0),
  }),
  code_scanning_upload: z.object({
    limit: z.number().int().min(0),
    remaining: z.number().int().min(0),
    reset: z.number().int().min(0),
    used: z.number().int().min(0),
  }),
  actions_runner_registration: z.object({
    limit: z.number().int().min(0),
    remaining: z.number().int().min(0),
    reset: z.number().int().min(0),
    used: z.number().int().min(0),
  }),
  scim: z.object({
    limit: z.number().int().min(0),
    remaining: z.number().int().min(0),
    reset: z.number().int().min(0),
    used: z.number().int().min(0),
  }),
});

export type GitHubRateLimit = z.infer<typeof GitHubRateLimitSchema>;

/**
 * GitHub search results schema
 */
export const GitHubSearchResultSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    total_count: z.number().int().min(0),
    incomplete_results: z.boolean(),
    items: z.array(itemSchema),
  });

/**
 * GitHub issue search result schema
 */
export const GitHubIssueSearchResultSchema = GitHubSearchResultSchema(z.any()); // IssueSchema - lazy-loaded

export type GitHubIssueSearchResult = z.infer<typeof GitHubIssueSearchResultSchema>;

/**
 * GitHub repository search result schema
 */
export const GitHubRepositorySearchResultSchema = GitHubSearchResultSchema(z.any()); // RepositorySchema - lazy-loaded

export type GitHubRepositorySearchResult = z.infer<typeof GitHubRepositorySearchResultSchema>;

/**
 * GitHub API error response schema
 */
export const GitHubAPIErrorSchema = z.object({
  message: z.string(),
  documentation_url: z.string().url().optional(),
  errors: z
    .array(
      z.object({
        resource: z.string(),
        field: z.string(),
        code: z.string(),
        message: z.string().optional(),
      })
    )
    .optional(),
});

export type GitHubAPIError = z.infer<typeof GitHubAPIErrorSchema>;

/**
 * GitHub check run schema
 */
export const GitHubCheckRunSchema = z.object({
  id: z.number(),
  head_sha: z.string(),
  external_id: z.string().optional(),
  url: z.string().url(),
  html_url: z.string().url(),
  details_url: z.string().url().optional(),
  status: z.enum(['queued', 'in_progress', 'completed']),
  conclusion: z
    .enum([
      'success',
      'failure',
      'neutral',
      'cancelled',
      'timed_out',
      'action_required',
      'stale',
      'skipped',
    ])
    .optional(),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
  output: z
    .object({
      title: z.string().optional(),
      summary: z.string().optional(),
      text: z.string().optional(),
      annotations_count: z.number().int().min(0),
      annotations_url: z.string().url(),
    })
    .optional(),
  name: z.string(),
  check_suite: z
    .object({
      id: z.number(),
      head_branch: z.string(),
      head_sha: z.string(),
      status: z.enum(['queued', 'in_progress', 'completed']),
      conclusion: z
        .enum([
          'success',
          'failure',
          'neutral',
          'cancelled',
          'timed_out',
          'action_required',
          'stale',
          'skipped',
        ])
        .optional(),
      url: z.string().url(),
    })
    .optional(),
  app: z
    .object({
      id: z.number(),
      slug: z.string(),
      name: z.string(),
      description: z.string().optional(),
      external_url: z.string().url().optional(),
      html_url: z.string().url(),
      created_at: z.string().datetime(),
      updated_at: z.string().datetime(),
      permissions: z.record(z.string(), z.string()),
      events: z.array(z.string()),
    })
    .optional(),
  pull_requests: z.array(
    z.object({
      url: z.string().url(),
      id: z.number(),
      number: z.number(),
      head: z.object({
        ref: z.string(),
        sha: z.string(),
        repo: z.object({
          id: z.number(),
          name: z.string(),
          url: z.string().url(),
        }),
      }),
      base: z.object({
        ref: z.string(),
        sha: z.string(),
        repo: z.object({
          id: z.number(),
          name: z.string(),
          url: z.string().url(),
        }),
      }),
    })
  ),
});

export type GitHubCheckRun = z.infer<typeof GitHubCheckRunSchema>;

/**
 * GitHub deployment schema
 */
export const GitHubDeploymentSchema = z.object({
  id: z.number(),
  sha: z.string(),
  ref: z.string(),
  task: z.string(),
  payload: z.record(z.string(), z.any()),
  original_environment: z.string().optional(),
  environment: z.string(),
  description: z.string().optional(),
  creator: z.any(), // UserSchema - lazy-loaded to avoid circular imports
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  statuses_url: z.string().url(),
  repository_url: z.string().url(),
  transient_environment: z.boolean().optional(),
  production_environment: z.boolean().optional(),
});

export type GitHubDeployment = z.infer<typeof GitHubDeploymentSchema>;

/**
 * GitHub release schema
 */
export const GitHubReleaseSchema = z.object({
  id: z.number(),
  tag_name: z.string(),
  target_commitish: z.string(),
  name: z.string().optional(),
  body: z.string().optional(),
  draft: z.boolean(),
  prerelease: z.boolean(),
  created_at: z.string().datetime(),
  published_at: z.string().datetime().optional(),
  author: z.any(), // UserSchema - lazy-loaded to avoid circular imports
  assets: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      label: z.string().optional(),
      uploader: z.any(), // UserSchema - lazy-loaded to avoid circular imports
      content_type: z.string(),
      state: z.enum(['uploaded', 'open']),
      size: z.number().int().min(0),
      download_count: z.number().int().min(0),
      created_at: z.string().datetime(),
      updated_at: z.string().datetime(),
      browser_download_url: z.string().url(),
    })
  ),
  tarball_url: z.string().url(),
  zipball_url: z.string().url(),
  html_url: z.string().url(),
  url: z.string().url(),
  assets_url: z.string().url(),
  upload_url: z.string().url(),
  node_id: z.string(),
});

export type GitHubRelease = z.infer<typeof GitHubReleaseSchema>;

/**
 * GitHub organization schema
 */
export const GitHubOrganizationSchema = z.object({
  login: z.string(),
  id: z.number(),
  node_id: z.string(),
  url: z.string().url(),
  repos_url: z.string().url(),
  events_url: z.string().url(),
  hooks_url: z.string().url(),
  issues_url: z.string().url(),
  members_url: z.string().url(),
  public_members_url: z.string().url(),
  avatar_url: z.string().url(),
  description: z.string().optional(),
  name: z.string().optional(),
  company: z.string().optional(),
  blog: z.string().url().optional(),
  location: z.string().optional(),
  email: z.string().email().optional(),
  twitter_username: z.string().optional(),
  has_organization_projects: z.boolean(),
  has_repository_projects: z.boolean(),
  public_repos: z.number().int().min(0),
  public_gists: z.number().int().min(0),
  followers: z.number().int().min(0),
  following: z.number().int().min(0),
  html_url: z.string().url(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  type: z.literal('Organization'),
  total_private_repos: z.number().int().min(0).optional(),
  owned_private_repos: z.number().int().min(0).optional(),
  private_gists: z.number().int().min(0).optional(),
  disk_usage: z.number().int().min(0).optional(),
  collaborators: z.number().int().min(0).optional(),
  billing_email: z.string().email().optional(),
  plan: z
    .object({
      name: z.string(),
      space: z.number().int().min(0),
      private_repos: z.number().int().min(0),
      filled_seats: z.number().int().min(0).optional(),
      seats: z.number().int().min(0).optional(),
    })
    .optional(),
  default_repository_permission: z.enum(['read', 'write', 'admin', 'none']).optional(),
  members_can_create_repositories: z.boolean().optional(),
  two_factor_requirement_enabled: z.boolean().optional(),
  members_allowed_repository_creation_type: z.enum(['all', 'private', 'none']).optional(),
  members_can_create_public_repositories: z.boolean().optional(),
  members_can_create_private_repositories: z.boolean().optional(),
  members_can_create_internal_repositories: z.boolean().optional(),
  members_can_create_pages: z.boolean().optional(),
  members_can_create_public_pages: z.boolean().optional(),
  members_can_create_private_pages: z.boolean().optional(),
  members_can_fork_private_repositories: z.boolean().optional(),
  web_commit_signoff_required: z.boolean().optional(),
  members_can_create_repos: z.boolean().optional(),
  dependabot_alerts_enabled_for_new_repositories: z.boolean().optional(),
  dependency_graph_enabled_for_new_repositories: z.boolean().optional(),
  secret_scanning_enabled_for_new_repositories: z.boolean().optional(),
  secret_scanning_push_protection_enabled_for_new_repositories: z.boolean().optional(),
  secret_scanning_validity_checks_enabled: z.boolean().optional(),
});

export type GitHubOrganization = z.infer<typeof GitHubOrganizationSchema>;

/**
 * Validation helper for GitHub data
 */
export function validateGitHubData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): {
  success: boolean;
  data?: T;
  errors?: z.ZodError;
} {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

/**
 * GitHub API response wrapper
 */
export function createGitHubResponse<T>(data: T, headers?: Record<string, string>) {
  return {
    data,
    headers: headers || {},
    status: 200,
    url: '',
  };
}

/**
 * GitHub pagination helper
 */
export function parseGitHubPagination(linkHeader?: string): {
  first?: string;
  prev?: string;
  next?: string;
  last?: string;
} {
  if (!linkHeader) return {};

  const links: Record<string, string> = {};
  const parts = linkHeader.split(',');

  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match && match[2] && match[1]) {
      links[match[2]] = match[1];
    }
  }

  return links;
}

/**
 * GitHub API constants
 */
export const GITHUB_API_CONSTANTS = {
  MAX_PER_PAGE: 100,
  DEFAULT_PER_PAGE: 30,
  MAX_SEARCH_RESULTS: 1000,
  RATE_LIMIT_REMAINING_THRESHOLD: 100,
  RETRY_AFTER_SECONDS: 60,
  WEBHOOK_EVENTS: [
    'issues',
    'issue_comment',
    'pull_request',
    'pull_request_review',
    'push',
    'create',
    'delete',
    'fork',
    'star',
    'watch',
    'release',
    'repository',
  ] as const,
  ISSUE_STATES: ['open', 'closed', 'all'] as const,
  ISSUE_SORTS: ['created', 'updated', 'comments'] as const,
  SORT_DIRECTIONS: ['asc', 'desc'] as const,
} as const;

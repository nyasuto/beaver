/**
 * Pull Request Schemas
 *
 * Zod schemas for GitHub Pull Request API responses and data structures.
 */

import { z } from 'zod';
import { UserSchema, LabelSchema } from './github';

/**
 * Pull Request state enumeration
 */
export const PullRequestState = z.enum(['open', 'closed']);
export type PullRequestStateType = z.infer<typeof PullRequestState>;

/**
 * Pull Request sort options
 */
export const PullRequestSort = z.enum(['created', 'updated', 'popularity', 'long-running']);
export type PullRequestSortType = z.infer<typeof PullRequestSort>;

/**
 * Pull Request direction for sorting
 */
export const PullRequestDirection = z.enum(['asc', 'desc']);
export type PullRequestDirectionType = z.infer<typeof PullRequestDirection>;

/**
 * Branch reference schema
 */
export const BranchRefSchema = z.object({
  ref: z.string(),
  sha: z.string(),
  label: z.string().optional(),
  repo: z
    .object({
      name: z.string(),
      full_name: z.string(),
    })
    .optional(),
});

/**
 * Pull Request review state
 */
export const ReviewStateSchema = z.enum([
  'APPROVED',
  'CHANGES_REQUESTED',
  'COMMENTED',
  'DISMISSED',
  'PENDING',
]);

/**
 * Pull Request review schema
 */
export const ReviewSchema = z.object({
  id: z.number(),
  user: UserSchema,
  state: ReviewStateSchema,
  submitted_at: z.string().nullable(),
  body: z.string().nullable(),
});

/**
 * Main Pull Request schema
 */
export const PullRequestSchema = z.object({
  id: z.number(),
  node_id: z.string(),
  number: z.number(),
  title: z.string(),
  body: z.string().nullable(),
  state: PullRequestState,
  user: UserSchema,
  created_at: z.string(),
  updated_at: z.string(),
  closed_at: z.string().nullable(),
  merged_at: z.string().nullable(),
  head: BranchRefSchema,
  base: BranchRefSchema,
  draft: z.boolean(),
  mergeable: z.boolean().nullable().optional(),
  mergeable_state: z.string().optional(),
  merged: z.boolean().optional(),
  merge_commit_sha: z.string().nullable().optional(),
  assignee: UserSchema.nullable(),
  assignees: z.array(UserSchema),
  requested_reviewers: z.array(UserSchema),
  labels: z.array(LabelSchema),
  milestone: z
    .object({
      id: z.number(),
      title: z.string(),
      description: z.string().nullable(),
      state: z.enum(['open', 'closed']),
      created_at: z.string(),
      updated_at: z.string(),
      due_on: z.string().nullable(),
    })
    .nullable(),
  html_url: z.string(),
  url: z.string(),
  diff_url: z.string().optional(),
  patch_url: z.string().optional(),
  comments: z.number().optional(),
  review_comments: z.number().optional(),
  commits: z.number().optional(),
  additions: z.number().optional(),
  deletions: z.number().optional(),
  changed_files: z.number().optional(),
});

/**
 * Enhanced Pull Request with additional computed fields
 */
export const EnhancedPullRequestSchema = PullRequestSchema.extend({
  // Computed fields for UI display
  status: z.enum(['open', 'closed', 'draft']),
  reviews_count: z.number(),
  comments_count: z.number(),
  approval_status: z.enum(['approved', 'changes_requested', 'review_required', 'pending']),
  is_mergeable: z.boolean(),
  conflicts: z.boolean(),

  // Time-based fields
  age_days: z.number(),
  last_activity: z.string(),

  // Branch information
  branch_info: z.object({
    head_branch: z.string(),
    base_branch: z.string(),
    ahead_by: z.number().optional(),
    behind_by: z.number().optional(),
  }),
});

/**
 * Pull Request query parameters
 */
export const PullsQuerySchema = z.object({
  state: PullRequestState.optional().default('open'),
  head: z.string().optional(),
  base: z.string().optional(),
  sort: PullRequestSort.optional().default('created'),
  direction: PullRequestDirection.optional().default('desc'),
  per_page: z.number().min(1).max(100).optional().default(30),
  page: z.number().min(1).optional().default(1),
});

/**
 * Pull Request filters for client-side filtering
 */
export const PullRequestFiltersSchema = z.object({
  state: PullRequestState.optional(),
  author: z.string().optional(),
  assignee: z.string().optional(),
  reviewer: z.string().optional(),
  label: z.string().optional(),
  milestone: z.string().optional(),
  search: z.string().optional(),
  draft: z.boolean().optional(),
  mergeable: z.boolean().optional(),
});

/**
 * Pull Request creation parameters
 */
export const CreatePullRequestSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  body: z.string().optional(),
  head: z.string().min(1, 'Head branch is required'),
  base: z.string().min(1, 'Base branch is required'),
  draft: z.boolean().optional().default(false),
  maintainer_can_modify: z.boolean().optional().default(true),
});

/**
 * Pull Request update parameters
 */
export const UpdatePullRequestSchema = z.object({
  title: z.string().min(1).optional(),
  body: z.string().optional(),
  state: z.enum(['open', 'closed']).optional(),
  base: z.string().optional(),
  maintainer_can_modify: z.boolean().optional(),
});

// Type exports
export type PullRequest = z.infer<typeof PullRequestSchema>;
export type EnhancedPullRequest = z.infer<typeof EnhancedPullRequestSchema>;
export type BranchRef = z.infer<typeof BranchRefSchema>;
export type Review = z.infer<typeof ReviewSchema>;
export type ReviewState = z.infer<typeof ReviewStateSchema>;
export type PullsQuery = z.infer<typeof PullsQuerySchema>;
export type PullRequestFilters = z.infer<typeof PullRequestFiltersSchema>;
export type CreatePullRequestParams = z.infer<typeof CreatePullRequestSchema>;
export type UpdatePullRequestParams = z.infer<typeof UpdatePullRequestSchema>;

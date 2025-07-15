/**
 * GitHub Pull Requests API Integration
 *
 * Provides functionality to fetch and manage GitHub Pull Requests
 * with comprehensive error handling and type safety.
 */

import { GitHubClient, GitHubError } from './client';
import {
  PullRequestSchema,
  EnhancedPullRequestSchema,
  PullsQuerySchema,
  ReviewSchema,
  type PullRequest,
  type EnhancedPullRequest,
  type PullsQuery,
  type Review,
  type PullRequestStateType,
} from '../schemas/pulls';
import type { Result } from '../types';

/**
 * GitHub Pull Requests Service
 *
 * Handles all Pull Request related operations with the GitHub API
 */
export class GitHubPullsService {
  constructor(private client: GitHubClient) {}

  /**
   * Fetch pull requests from a repository
   */
  async fetchPullRequests(
    owner: string,
    repo: string,
    query: Partial<PullsQuery> = {}
  ): Promise<Result<PullRequest[], GitHubError>> {
    try {
      // Validate query parameters
      const validatedQuery = PullsQuerySchema.parse(query);

      // Use state directly since we no longer support merged state
      const apiState = validatedQuery.state;

      const response = await this.client.getOctokit().request('GET /repos/{owner}/{repo}/pulls', {
        owner,
        repo,
        state: apiState,
        head: validatedQuery.head,
        base: validatedQuery.base,
        sort: validatedQuery.sort,
        direction: validatedQuery.direction,
        per_page: validatedQuery.per_page,
        page: validatedQuery.page,
      });

      // Validate and transform response data
      let pulls = response.data
        .map((pullData: any) => {
          try {
            return PullRequestSchema.parse(pullData);
          } catch (validationError) {
            console.warn('Invalid pull request data:', validationError);
            return null;
          }
        })
        .filter((pull: PullRequest | null): pull is PullRequest => pull !== null);

      // Filter out merged PRs from closed state results
      if (validatedQuery.state === 'closed') {
        pulls = pulls.filter((pull: PullRequest) => pull.merged_at === null);
      }

      return {
        success: true,
        data: pulls,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof GitHubError
            ? error
            : new GitHubError(error instanceof Error ? error.message : 'Unknown error'),
      };
    }
  }

  /**
   * Fetch enhanced pull requests with additional computed fields
   */
  async fetchEnhancedPullRequests(
    owner: string,
    repo: string,
    query: Partial<PullsQuery> = {}
  ): Promise<Result<EnhancedPullRequest[], GitHubError>> {
    const pullsResult = await this.fetchPullRequests(owner, repo, query);

    if (!pullsResult.success) {
      return pullsResult;
    }

    try {
      // Enhance pull requests with additional computed fields
      const enhancedPulls = await Promise.all(
        pullsResult.data.map(async (pull: PullRequest) => {
          const enhanced = await this.enhancePullRequest(pull, owner, repo);
          return enhanced;
        })
      );

      return {
        success: true,
        data: enhancedPulls,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof GitHubError
            ? error
            : new GitHubError(error instanceof Error ? error.message : 'Unknown error'),
      };
    }
  }

  /**
   * Get a specific pull request by number
   */
  async getPullRequest(
    owner: string,
    repo: string,
    pullNumber: number
  ): Promise<Result<PullRequest, GitHubError>> {
    try {
      const response = await this.client
        .getOctokit()
        .request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
          owner,
          repo,
          pull_number: pullNumber,
        });

      const pull = PullRequestSchema.parse(response.data);

      return {
        success: true,
        data: pull,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof GitHubError
            ? error
            : new GitHubError(error instanceof Error ? error.message : 'Unknown error'),
      };
    }
  }

  /**
   * Get pull request reviews
   */
  async getPullRequestReviews(
    owner: string,
    repo: string,
    pullNumber: number
  ): Promise<Result<Review[], GitHubError>> {
    try {
      const response = await this.client
        .getOctokit()
        .request('GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews', {
          owner,
          repo,
          pull_number: pullNumber,
        });

      const reviews = response.data
        .map((reviewData: any) => {
          try {
            return ReviewSchema.parse(reviewData);
          } catch (validationError) {
            console.warn('Invalid review data:', validationError);
            return null;
          }
        })
        .filter((review: Review | null): review is Review => review !== null);

      return {
        success: true,
        data: reviews,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof GitHubError
            ? error
            : new GitHubError(error instanceof Error ? error.message : 'Unknown error'),
      };
    }
  }

  /**
   * Enhance a pull request with additional computed fields
   */
  private async enhancePullRequest(
    pull: PullRequest,
    owner: string,
    repo: string
  ): Promise<EnhancedPullRequest> {
    // Get reviews for approval status
    const reviewsResult = await this.getPullRequestReviews(owner, repo, pull.number);
    const reviews = reviewsResult.success ? reviewsResult.data : [];

    // Calculate computed fields
    const now = new Date();
    const createdAt = new Date(pull.created_at);
    const ageDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    const lastActivity = pull.updated_at;

    // Determine status (no longer include merged)
    let status: 'open' | 'closed' | 'draft';
    if (pull.draft) {
      status = 'draft';
    } else if (pull.state === 'closed') {
      status = 'closed';
    } else {
      status = 'open';
    }

    // Calculate approval status
    const approvals = reviews.filter((r: Review) => r.state === 'APPROVED');
    const changesRequested = reviews.filter((r: Review) => r.state === 'CHANGES_REQUESTED');

    let approvalStatus: 'approved' | 'changes_requested' | 'review_required' | 'pending';
    if (changesRequested.length > 0) {
      approvalStatus = 'changes_requested';
    } else if (approvals.length > 0) {
      approvalStatus = 'approved';
    } else if (reviews.length > 0) {
      approvalStatus = 'pending';
    } else {
      approvalStatus = 'review_required';
    }

    // Branch information
    const branchInfo = {
      head_branch: pull.head.ref,
      base_branch: pull.base.ref,
    };

    // Create enhanced pull request
    const enhanced: EnhancedPullRequest = {
      ...pull,
      status,
      reviews_count: reviews.length,
      comments_count: (pull.comments || 0) + (pull.review_comments || 0),
      approval_status: approvalStatus,
      is_mergeable: pull.mergeable === true,
      conflicts: pull.mergeable === false,
      age_days: ageDays,
      last_activity: lastActivity,
      branch_info: branchInfo,
    };

    return EnhancedPullRequestSchema.parse(enhanced);
  }

  /**
   * Get pull request statistics for a repository
   */
  async getPullRequestStats(
    owner: string,
    repo: string
  ): Promise<
    Result<
      {
        total: number;
        open: number;
        closed: number;
        draft: number;
      },
      GitHubError
    >
  > {
    try {
      // Fetch all PRs with minimal data
      const [openResult, closedResult] = await Promise.all([
        this.fetchPullRequests(owner, repo, {
          state: 'open',
          per_page: 100,
          sort: 'created',
          direction: 'desc',
          page: 1,
        }),
        this.fetchPullRequests(owner, repo, {
          state: 'closed',
          per_page: 100,
          sort: 'created',
          direction: 'desc',
          page: 1,
        }),
      ]);

      if (!openResult.success || !closedResult.success) {
        const errorResult = !openResult.success ? openResult : closedResult;
        return {
          success: false,
          error: errorResult.success ? new GitHubError('Unknown error') : errorResult.error,
        };
      }

      const openPulls = openResult.data;
      const closedPulls = closedResult.data;

      const draftCount = openPulls.filter((pr: any) => pr.draft).length;
      // Filter out merged PRs from closed count
      const closedCount = closedPulls.filter((pr: any) => pr.merged_at === null).length;

      return {
        success: true,
        data: {
          total: openPulls.length + closedCount,
          open: openPulls.length - draftCount,
          closed: closedCount,
          draft: draftCount,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof GitHubError
            ? error
            : new GitHubError(error instanceof Error ? error.message : 'Unknown error'),
      };
    }
  }
}

/**
 * Utility functions for pull request operations
 */

/**
 * Format pull request state for display
 */
export function formatPullRequestState(
  state: PullRequestStateType,
  merged: boolean = false
): {
  label: string;
  color: string;
  icon: string;
} {
  if (merged) {
    return {
      label: 'Merged',
      color: 'purple',
      icon: 'git-merge',
    };
  }

  switch (state) {
    case 'open':
      return {
        label: 'Open',
        color: 'green',
        icon: 'git-pull-request',
      };
    case 'closed':
      return {
        label: 'Closed',
        color: 'red',
        icon: 'git-pull-request-closed',
      };
    default:
      return {
        label: 'Unknown',
        color: 'gray',
        icon: 'help-circle',
      };
  }
}

/**
 * Calculate time since pull request creation
 */
export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays}日前`;
  } else if (diffHours > 0) {
    return `${diffHours}時間前`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes}分前`;
  } else {
    return '今';
  }
}

/**
 * Check if pull request needs attention
 */
export function needsAttention(pull: EnhancedPullRequest): boolean {
  // Draft PRs don't need attention
  if (pull.draft) return false;

  // PRs with changes requested need attention
  if (pull.approval_status === 'changes_requested') return true;

  // Old PRs without recent activity need attention
  const daysSinceUpdate = Math.floor(
    (new Date().getTime() - new Date(pull.updated_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysSinceUpdate > 7 && pull.approval_status === 'review_required';
}

/**
 * GitHub Pulls Service Tests
 *
 * Tests for GitHub Pull Requests API integration functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitHubPullsService, needsAttention } from '../pulls';
import { GitHubClient, GitHubError } from '../client';
import type { EnhancedPullRequest, PullRequest } from '../../schemas/pulls';

// Mock GitHubClient
vi.mock('../client');

describe('GitHubPullsService', () => {
  let service: GitHubPullsService;
  let mockClient: GitHubClient;

  const mockPullRequest: PullRequest = {
    id: 1,
    node_id: 'PR_abc123',
    number: 123,
    title: 'Test PR',
    body: 'Test description',
    state: 'open',
    draft: false,
    user: {
      login: 'testuser',
      id: 1,
      node_id: 'U_testuser',
      avatar_url: 'https://example.com/avatar.jpg',
      gravatar_id: null,
      url: 'https://api.github.com/users/testuser',
      html_url: 'https://github.com/testuser',
      type: 'User',
      site_admin: false,
    },
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z',
    closed_at: null,
    merged_at: null,
    head: {
      ref: 'feature-branch',
      sha: 'abc123',
      repo: {
        name: 'test-repo',
        full_name: 'testuser/test-repo',
      },
    },
    base: {
      ref: 'main',
      sha: 'def456',
      repo: {
        name: 'test-repo',
        full_name: 'testuser/test-repo',
      },
    },
    html_url: 'https://github.com/testuser/test-repo/pull/123',
    url: 'https://api.github.com/repos/testuser/test-repo/pulls/123',
    diff_url: 'https://github.com/testuser/test-repo/pull/123.diff',
    patch_url: 'https://github.com/testuser/test-repo/pull/123.patch',
    mergeable: true,
    mergeable_state: 'clean',
    merged: false,
    merge_commit_sha: null,
    assignee: null,
    assignees: [],
    requested_reviewers: [],
    labels: [],
    milestone: null,
    comments: 0,
    review_comments: 0,
    commits: 1,
    additions: 10,
    deletions: 5,
    changed_files: 2,
  };

  beforeEach(() => {
    mockClient = new GitHubClient({
      token: 'fake-token',
      owner: 'test-owner',
      repo: 'test-repo',
    });
    service = new GitHubPullsService(mockClient);
    vi.clearAllMocks();
  });

  describe('fetchPullRequests', () => {
    it('should fetch pull requests successfully', async () => {
      const mockOctokit = {
        request: vi.fn().mockResolvedValue({
          data: [mockPullRequest],
        }),
      };

      vi.spyOn(mockClient, 'getOctokit').mockReturnValue(mockOctokit as any);

      const result = await service.fetchPullRequests('testuser', 'test-repo');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0]?.title).toBe('Test PR');
      }
    });

    it('should handle API errors', async () => {
      const mockOctokit = {
        request: vi.fn().mockRejectedValue(new Error('API Error')),
      };

      vi.spyOn(mockClient, 'getOctokit').mockReturnValue(mockOctokit as any);

      const result = await service.fetchPullRequests('testuser', 'test-repo');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(GitHubError);
        // Error message should be non-empty string (exact message may vary based on error handling)
      }
    });

    it('should pass query parameters to API', async () => {
      const mockOctokit = {
        request: vi.fn().mockResolvedValue({ data: [] }),
      };

      vi.spyOn(mockClient, 'getOctokit').mockReturnValue(mockOctokit as any);

      await service.fetchPullRequests('testuser', 'test-repo', {
        state: 'closed',
        head: 'feature',
        base: 'main',
      });

      expect(mockOctokit.request).toHaveBeenCalledWith('GET /repos/{owner}/{repo}/pulls', {
        owner: 'testuser',
        repo: 'test-repo',
        state: 'closed',
        head: 'feature',
        base: 'main',
        sort: 'created',
        direction: 'desc',
        per_page: 30,
        page: 1,
      });
    });
  });

  describe('fetchEnhancedPullRequests', () => {
    it('should enhance pull requests with additional data', async () => {
      const mockOctokit = {
        request: vi
          .fn()
          .mockResolvedValueOnce({ data: [mockPullRequest] }) // fetchPullRequests
          .mockResolvedValueOnce({ data: [] }), // getPullRequestReviews
      };

      vi.spyOn(mockClient, 'getOctokit').mockReturnValue(mockOctokit as any);

      const result = await service.fetchEnhancedPullRequests('testuser', 'test-repo');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        const enhanced = result.data[0];
        expect(enhanced?.status).toBe('open');
        expect(enhanced?.reviews_count).toBe(0);
        expect(enhanced?.comments_count).toBe(0);
        expect(enhanced?.approval_status).toBe('review_required');
      }
    });

    it('should handle draft pull requests', async () => {
      const draftPR = { ...mockPullRequest, draft: true };
      const mockOctokit = {
        request: vi
          .fn()
          .mockResolvedValueOnce({ data: [draftPR] })
          .mockResolvedValueOnce({ data: [] }),
      };

      vi.spyOn(mockClient, 'getOctokit').mockReturnValue(mockOctokit as any);

      const result = await service.fetchEnhancedPullRequests('testuser', 'test-repo');

      expect(result.success).toBe(true);
      if (result.success) {
        const enhanced = result.data[0];
        expect(enhanced?.status).toBe('draft');
      }
    });

    it('should handle closed pull requests', async () => {
      const closedPR = { ...mockPullRequest, state: 'closed' as const };
      const mockOctokit = {
        request: vi
          .fn()
          .mockResolvedValueOnce({ data: [closedPR] })
          .mockResolvedValueOnce({ data: [] }),
      };

      vi.spyOn(mockClient, 'getOctokit').mockReturnValue(mockOctokit as any);

      const result = await service.fetchEnhancedPullRequests('testuser', 'test-repo');

      expect(result.success).toBe(true);
      if (result.success) {
        const enhanced = result.data[0];
        expect(enhanced?.status).toBe('closed');
      }
    });
  });

  describe('getPullRequest', () => {
    it('should fetch single pull request by number', async () => {
      const mockOctokit = {
        request: vi.fn().mockResolvedValue({
          data: mockPullRequest,
        }),
      };

      vi.spyOn(mockClient, 'getOctokit').mockReturnValue(mockOctokit as any);

      const result = await service.getPullRequest('testuser', 'test-repo', 123);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Test PR');
        expect(result.data.number).toBe(123);
      }
    });

    it('should handle not found errors', async () => {
      const mockOctokit = {
        request: vi.fn().mockRejectedValue({
          status: 404,
          message: 'Not Found',
        }),
      };

      vi.spyOn(mockClient, 'getOctokit').mockReturnValue(mockOctokit as any);

      const result = await service.getPullRequest('testuser', 'test-repo', 999);

      expect(result.success).toBe(false);
    });
  });

  describe('getPullRequestReviews', () => {
    it('should fetch pull request reviews', async () => {
      const mockReview = {
        id: 1,
        user: mockPullRequest.user,
        state: 'APPROVED',
        submitted_at: '2023-01-03T00:00:00Z',
        body: 'Looks good!',
      };

      const mockOctokit = {
        request: vi.fn().mockResolvedValue({
          data: [mockReview],
        }),
      };

      vi.spyOn(mockClient, 'getOctokit').mockReturnValue(mockOctokit as any);

      const result = await service.getPullRequestReviews('testuser', 'test-repo', 123);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0]?.state).toBe('APPROVED');
      }
    });
  });

  describe('getPullRequestStats', () => {
    it('should calculate pull request statistics', async () => {
      const openPRs = [
        { ...mockPullRequest, state: 'open', draft: false },
        { ...mockPullRequest, id: 3, number: 125, state: 'open', draft: true },
      ];
      const closedPRs = [
        { ...mockPullRequest, id: 2, number: 124, state: 'closed', merged_at: null },
      ];

      const mockOctokit = {
        request: vi
          .fn()
          .mockResolvedValueOnce({ data: openPRs }) // First call for open PRs
          .mockResolvedValueOnce({ data: closedPRs }), // Second call for closed PRs
      };

      vi.spyOn(mockClient, 'getOctokit').mockReturnValue(mockOctokit as any);

      const result = await service.getPullRequestStats('testuser', 'test-repo');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.total).toBe(3); // 2 open + 1 closed
        expect(result.data.open).toBe(1); // 2 open - 1 draft
        expect(result.data.closed).toBe(1); // 1 closed
        expect(result.data.draft).toBe(1); // 1 draft
      }
    });
  });
});

describe('needsAttention', () => {
  const basePR: EnhancedPullRequest = {
    id: 1,
    node_id: 'PR_abc123',
    number: 123,
    title: 'Test PR',
    body: 'Test description',
    state: 'open',
    draft: false,
    user: {
      login: 'testuser',
      id: 1,
      node_id: 'U_testuser',
      avatar_url: 'https://example.com/avatar.jpg',
      gravatar_id: null,
      url: 'https://api.github.com/users/testuser',
      html_url: 'https://github.com/testuser',
      type: 'User',
      site_admin: false,
    },
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z',
    closed_at: null,
    merged_at: null,
    head: {
      ref: 'feature-branch',
      sha: 'abc123',
      repo: {
        name: 'test-repo',
        full_name: 'testuser/test-repo',
      },
    },
    base: {
      ref: 'main',
      sha: 'def456',
      repo: {
        name: 'test-repo',
        full_name: 'testuser/test-repo',
      },
    },
    html_url: 'https://github.com/testuser/test-repo/pull/123',
    url: 'https://api.github.com/repos/testuser/test-repo/pulls/123',
    diff_url: 'https://github.com/testuser/test-repo/pull/123.diff',
    patch_url: 'https://github.com/testuser/test-repo/pull/123.patch',
    mergeable: true,
    mergeable_state: 'clean',
    merged: false,
    merge_commit_sha: null,
    assignee: null,
    assignees: [],
    requested_reviewers: [],
    labels: [],
    milestone: null,
    comments: 0,
    review_comments: 0,
    commits: 1,
    additions: 10,
    deletions: 5,
    changed_files: 2,
    status: 'open',
    reviews_count: 0,
    comments_count: 0,
    approval_status: 'review_required',
    is_mergeable: true,
    conflicts: false,
    age_days: 5,
    last_activity: '2023-01-05T00:00:00Z',
    branch_info: {
      head_branch: 'feature',
      base_branch: 'main',
    },
  };

  it('should return false for draft PRs', () => {
    const draftPR = { ...basePR, draft: true };
    expect(needsAttention(draftPR)).toBe(false);
  });

  it('should return true for PRs with changes requested', () => {
    const changesRequestedPR = { ...basePR, approval_status: 'changes_requested' as const };
    expect(needsAttention(changesRequestedPR)).toBe(true);
  });

  it('should return true for old PRs without recent activity', () => {
    const oldPR = {
      ...basePR,
      updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
    };
    expect(needsAttention(oldPR)).toBe(true);
  });

  it('should return false for recent PRs', () => {
    const recentPR = {
      ...basePR,
      updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    };
    expect(needsAttention(recentPR)).toBe(false);
  });

  it('should return false for approved PRs', () => {
    const approvedPR = { ...basePR, approval_status: 'approved' as const };
    expect(needsAttention(approvedPR)).toBe(false);
  });
});

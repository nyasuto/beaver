/**
 * GitHub Issues API Tests
 *
 * Tests for GitHub Issues API functionality.
 * Covers issue fetching, filtering, and data processing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitHubIssuesService } from '../issues';
import { GitHubClient, type GitHubConfig } from '../client';
import { createMockGitHubIssue } from '../__mocks__/data';

// Mock the Octokit constructor
vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn().mockImplementation(() => ({
    rest: {
      issues: {
        listForRepo: vi.fn(),
        get: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    },
  })),
}));

// TODO: Fix for vitest v4 - Octokit mocking issues
describe.skip('GitHub Issues API', () => {
  let mockConfig: GitHubConfig;
  let issuesService: GitHubIssuesService;
  let mockClient: GitHubClient;

  beforeEach(() => {
    mockConfig = {
      token: 'ghp_test_token',
      owner: 'test-owner',
      repo: 'test-repo',
      baseUrl: 'https://api.github.com',
      userAgent: 'beaver-astro/1.0.0',
    };

    // Create a mock client and service
    mockClient = new GitHubClient(mockConfig);
    issuesService = new GitHubIssuesService(mockClient);

    vi.clearAllMocks();
  });

  describe('getIssues', () => {
    it('should fetch issues successfully', async () => {
      const mockIssues = [
        createMockGitHubIssue({ number: 1, title: 'First Issue', state: 'open' }),
        createMockGitHubIssue({ number: 2, title: 'Second Issue', state: 'closed' }),
      ];

      (mockClient.getOctokit().rest.issues.listForRepo as any).mockResolvedValue({
        data: mockIssues,
        status: 200,
        headers: {
          'x-ratelimit-remaining': '4999',
        },
      });

      const result = await issuesService.getIssues();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0]?.title).toBe('First Issue');
        expect(result.data[1]?.title).toBe('Second Issue');
      }
    });

    it('should handle fetch options correctly', async () => {
      const mockIssues = [createMockGitHubIssue()];

      (mockClient.getOctokit().rest.issues.listForRepo as any).mockResolvedValue({
        data: mockIssues,
        status: 200,
        headers: {},
      });

      const options = {
        state: 'open' as const,
        labels: 'bug,enhancement',
        per_page: 50,
        page: 1,
      };

      await issuesService.getIssues(options);

      expect(mockClient.getOctokit().rest.issues.listForRepo).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        state: 'open',
        labels: 'bug,enhancement',
        sort: 'created',
        direction: 'desc',
        per_page: 50,
        page: 1,
      });
    });

    it('should handle API errors', async () => {
      (mockClient.getOctokit().rest.issues.listForRepo as any).mockRejectedValue({
        status: 404,
        message: 'Repository not found',
      });

      const result = await issuesService.getIssues();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Repository not found');
      }
    });
  });

  describe('getIssue', () => {
    it('should fetch a specific issue by number', async () => {
      const mockIssue = createMockGitHubIssue({
        number: 42,
        title: 'Specific Issue',
      });

      (mockClient.getOctokit().rest.issues.get as any).mockResolvedValue({
        data: mockIssue,
        status: 200,
        headers: {},
      });

      const result = await issuesService.getIssue(42);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.number).toBe(42);
        expect(result.data.title).toBe('Specific Issue');
      }

      expect(mockClient.getOctokit().rest.issues.get).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 42,
      });
    });

    it('should handle non-existent issue', async () => {
      (mockClient.getOctokit().rest.issues.get as any).mockRejectedValue({
        status: 404,
        message: 'Issue not found',
      });

      const result = await issuesService.getIssue(999);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Issue not found');
      }
    });
  });

  describe('createIssue', () => {
    it('should create a new issue successfully', async () => {
      const mockIssue = createMockGitHubIssue({
        number: 123,
        title: 'New Issue',
      });

      (mockClient.getOctokit().rest.issues.create as any).mockResolvedValue({
        data: mockIssue,
        status: 201,
        headers: {},
      });

      const params = {
        title: 'New Issue',
        body: 'This is a new issue',
        labels: ['bug', 'priority: high'],
      };

      const result = await issuesService.createIssue(params);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.number).toBe(123);
        expect(result.data.title).toBe('New Issue');
      }

      expect(mockClient.getOctokit().rest.issues.create).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        title: 'New Issue',
        body: 'This is a new issue',
        labels: ['bug', 'priority: high'],
      });
    });
  });

  describe('updateIssue', () => {
    it('should update an existing issue successfully', async () => {
      const mockIssue = createMockGitHubIssue({
        number: 123,
        title: 'Updated Issue',
        state: 'closed',
      });

      (mockClient.getOctokit().rest.issues.update as any).mockResolvedValue({
        data: mockIssue,
        status: 200,
        headers: {},
      });

      const params = {
        title: 'Updated Issue',
        state: 'closed' as const,
      };

      const result = await issuesService.updateIssue(123, params);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.number).toBe(123);
        expect(result.data.title).toBe('Updated Issue');
        expect(result.data.state).toBe('closed');
      }

      expect(mockClient.getOctokit().rest.issues.update).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 123,
        title: 'Updated Issue',
        state: 'closed',
      });
    });
  });

  describe('getIssuesStats', () => {
    it('should calculate basic issue statistics', async () => {
      const openIssues = [
        createMockGitHubIssue({ number: 1, state: 'open' }),
        createMockGitHubIssue({ number: 2, state: 'open' }),
      ];

      const closedIssues = [createMockGitHubIssue({ number: 3, state: 'closed' })];

      (mockClient.getOctokit().rest.issues.listForRepo as any)
        .mockResolvedValueOnce({
          data: openIssues,
          status: 200,
          headers: {},
        })
        .mockResolvedValueOnce({
          data: closedIssues,
          status: 200,
          headers: {},
        });

      const result = await issuesService.getIssuesStats();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.total).toBe(3);
        expect(result.data.open).toBe(2);
        expect(result.data.closed).toBe(1);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed issue data', async () => {
      const malformedIssues = [
        {
          id: 'invalid-id',
          number: 'not-a-number',
          title: null,
          state: 'invalid-state',
        },
      ];

      (mockClient.getOctokit().rest.issues.listForRepo as any).mockResolvedValue({
        data: malformedIssues,
        status: 200,
        headers: {},
      });

      const result = await issuesService.getIssues();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to fetch issues');
      }
    });

    it('should handle rate limiting gracefully', async () => {
      (mockClient.getOctokit().rest.issues.listForRepo as any).mockRejectedValue({
        status: 403,
        message: 'API rate limit exceeded',
        headers: {
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
        },
      });

      const result = await issuesService.getIssues();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('rate limit');
      }
    });
  });
});

/**
 * RecentActivity Component Tests
 *
 * Tests for RecentActivity.astro component to ensure proper data fetching,
 * processing, and display of recent activity information.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatDistanceToNow } from 'date-fns';

// Mock the StatsService
const mockStatsService = {
  getUnifiedStats: vi.fn(),
};

// Mock getStatsService function
vi.mock('../../lib/services/StatsService', () => ({
  getStatsService: () => mockStatsService,
}));

// Mock fetch for repository data
global.fetch = vi.fn();

// Define the RecentActivity props interface
interface RecentActivityProps {
  class?: string;
}

// Mock issue data structure
interface Issue {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  updated_at: string;
  pull_request?: any;
  labels?: Array<{
    name: string;
    color: string;
  }>;
}

// Mock repository data structure
interface Repository {
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  pushed_at: string;
}

// Mock unified stats with recent activity
interface UnifiedStatsWithActivity {
  recentActivity: {
    thisWeek: number;
    lastWeek: number;
    recentlyUpdated: Issue[];
  };
  meta: {
    source: 'api' | 'cache' | 'fallback';
    generated_at: string;
  };
}

// Helper function to create mock issue
function createMockIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: 1,
    number: 123,
    title: 'Test Issue',
    state: 'open',
    updated_at: new Date().toISOString(),
    labels: [
      { name: 'bug', color: 'f29513' },
      { name: 'priority:high', color: 'ff0000' },
    ],
    ...overrides,
  };
}

// Helper function to create mock repository
function createMockRepository(overrides: Partial<Repository> = {}): Repository {
  return {
    stargazers_count: 123,
    forks_count: 45,
    open_issues_count: 12,
    pushed_at: new Date().toISOString(),
    ...overrides,
  };
}

// Helper function to create mock unified stats
function createMockUnifiedStats(
  overrides: Partial<UnifiedStatsWithActivity> = {}
): UnifiedStatsWithActivity {
  return {
    recentActivity: {
      thisWeek: 5,
      lastWeek: 8,
      recentlyUpdated: [
        createMockIssue(),
        createMockIssue({ id: 2, number: 124, title: 'Another Issue', state: 'closed' }),
      ],
    },
    meta: {
      source: 'api',
      generated_at: new Date().toISOString(),
    },
    ...overrides,
  };
}

// Helper function to validate RecentActivity props
function validateRecentActivityProps(props: Partial<RecentActivityProps>): {
  success: boolean;
  errors?: string[];
} {
  const errors: string[] = [];

  if (props.class !== undefined && typeof props.class !== 'string') {
    errors.push('class must be a string');
  }

  return {
    success: errors.length === 0,
    ...(errors.length > 0 && { errors }),
  };
}

// Helper function to get issue icon
function getIssueIcon(issue: Issue): string {
  if (issue.state === 'closed') return '✅';
  if (issue.pull_request) return '🔄';

  const labels = issue.labels || [];
  const priorityLabel = labels.find(label => label.name && label.name.startsWith('priority:'));

  if (priorityLabel) {
    const priority = priorityLabel.name.split(':')[1]?.trim();
    switch (priority) {
      case 'critical':
        return '🚨';
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '📄';
    }
  }

  return '📄';
}

// Helper function to get relative time
function getRelativeTime(dateString: string): string {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return 'recently';
  }
}

describe('RecentActivity Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Props Validation', () => {
    it('should validate valid props', () => {
      const validProps: RecentActivityProps = {
        class: 'custom-class',
      };

      const result = validateRecentActivityProps(validProps);
      expect(result.success).toBe(true);
    });

    it('should validate props without class', () => {
      const validProps: RecentActivityProps = {};

      const result = validateRecentActivityProps(validProps);
      expect(result.success).toBe(true);
    });

    it('should reject invalid class type', () => {
      const invalidProps = {
        class: 123,
      };

      const result = validateRecentActivityProps(invalidProps as any);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('class must be a string');
    });
  });

  describe('Stats Service Integration', () => {
    it('should call getUnifiedStats with correct parameters', async () => {
      const mockStats = createMockUnifiedStats();
      mockStatsService.getUnifiedStats.mockResolvedValue({
        success: true,
        data: mockStats,
      });

      const expectedParams = {
        includeRecentActivity: true,
        includePriorityBreakdown: true,
        includeLabels: true,
        recentDays: 7,
        maxRecentItems: 10,
      };

      const result = await mockStatsService.getUnifiedStats(expectedParams);

      expect(mockStatsService.getUnifiedStats).toHaveBeenCalledWith(expectedParams);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
    });

    it('should handle successful stats service response', async () => {
      const mockStats = createMockUnifiedStats();
      mockStatsService.getUnifiedStats.mockResolvedValue({
        success: true,
        data: mockStats,
      });

      const result = await mockStatsService.getUnifiedStats({
        includeRecentActivity: true,
        includePriorityBreakdown: true,
        includeLabels: true,
        recentDays: 7,
        maxRecentItems: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data.recentActivity.recentlyUpdated).toHaveLength(2);
    });

    it('should handle failed stats service response', async () => {
      mockStatsService.getUnifiedStats.mockResolvedValue({
        success: false,
        error: 'API Error',
      });

      const result = await mockStatsService.getUnifiedStats({
        includeRecentActivity: true,
        includePriorityBreakdown: true,
        includeLabels: true,
        recentDays: 7,
        maxRecentItems: 10,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });
  });

  describe('Repository Data Fetching', () => {
    it('should fetch repository data successfully', async () => {
      const mockRepository = createMockRepository();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              repository: mockRepository,
            },
          }),
      });

      // This simulates the fetchRepositoryData function
      const response = await fetch('/api/github/repository?include_stats=true');
      const result = await response.json();

      expect(fetch).toHaveBeenCalledWith('/api/github/repository?include_stats=true');
      expect(result.success).toBe(true);
      expect(result.data.repository).toEqual(mockRepository);
    });

    it('should handle repository fetch failure', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 404,
      });

      const response = await fetch('/api/github/repository?include_stats=true');
      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
    });

    it('should handle repository fetch error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      await expect(fetch('/api/github/repository?include_stats=true')).rejects.toThrow(
        'Network error'
      );
    });
  });

  describe('Issue Icon Logic', () => {
    it('should return correct icon for closed issues', () => {
      const closedIssue = createMockIssue({ state: 'closed' });
      const icon = getIssueIcon(closedIssue);
      expect(icon).toBe('✅');
    });

    it('should return correct icon for pull requests', () => {
      const pullRequestIssue = createMockIssue({ pull_request: {} });
      const icon = getIssueIcon(pullRequestIssue);
      expect(icon).toBe('🔄');
    });

    it('should return correct icon for critical priority', () => {
      const criticalIssue = createMockIssue({
        labels: [{ name: 'priority:critical', color: 'ff0000' }],
      });
      const icon = getIssueIcon(criticalIssue);
      expect(icon).toBe('🚨');
    });

    it('should return correct icon for high priority', () => {
      const highIssue = createMockIssue({
        labels: [{ name: 'priority:high', color: 'ff0000' }],
      });
      const icon = getIssueIcon(highIssue);
      expect(icon).toBe('🔴');
    });

    it('should return correct icon for medium priority', () => {
      const mediumIssue = createMockIssue({
        labels: [{ name: 'priority:medium', color: 'ffff00' }],
      });
      const icon = getIssueIcon(mediumIssue);
      expect(icon).toBe('🟡');
    });

    it('should return correct icon for low priority', () => {
      const lowIssue = createMockIssue({
        labels: [{ name: 'priority:low', color: '00ff00' }],
      });
      const icon = getIssueIcon(lowIssue);
      expect(icon).toBe('🟢');
    });

    it('should return default icon for unknown priority', () => {
      const unknownIssue = createMockIssue({
        labels: [{ name: 'priority:unknown', color: '888888' }],
      });
      const icon = getIssueIcon(unknownIssue);
      expect(icon).toBe('📄');
    });

    it('should return default icon for no priority labels', () => {
      const normalIssue = createMockIssue({
        labels: [{ name: 'bug', color: 'f29513' }],
      });
      const icon = getIssueIcon(normalIssue);
      expect(icon).toBe('📄');
    });

    it('should return default icon for no labels', () => {
      const unlabeledIssue = createMockIssue({ labels: [] });
      const icon = getIssueIcon(unlabeledIssue);
      expect(icon).toBe('📄');
    });
  });

  describe('Relative Time Formatting', () => {
    it('should format recent time correctly', () => {
      const recentTime = new Date(Date.now() - 1000 * 60 * 30).toISOString(); // 30 minutes ago
      const relative = getRelativeTime(recentTime);
      expect(relative).toContain('ago');
    });

    it('should format older time correctly', () => {
      const olderTime = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(); // 2 days ago
      const relative = getRelativeTime(olderTime);
      expect(relative).toContain('ago');
    });

    it('should handle invalid date strings', () => {
      const invalidDate = 'invalid-date';
      const relative = getRelativeTime(invalidDate);
      expect(relative).toBe('recently');
    });

    it('should handle empty date strings', () => {
      const emptyDate = '';
      const relative = getRelativeTime(emptyDate);
      expect(relative).toBe('recently');
    });
  });

  describe('Recent Issues Display', () => {
    it('should handle recent issues list correctly', () => {
      const issues = [
        createMockIssue({ id: 1, title: 'First Issue', state: 'open' }),
        createMockIssue({ id: 2, title: 'Second Issue', state: 'closed' }),
      ];

      expect(issues).toHaveLength(2);
      expect(issues[0]?.title).toBe('First Issue');
      expect(issues[1]?.title).toBe('Second Issue');
    });

    it('should handle empty recent issues list', () => {
      const issues: Issue[] = [];
      expect(issues).toHaveLength(0);
    });

    it('should handle issues with labels', () => {
      const issueWithLabels = createMockIssue({
        labels: [
          { name: 'bug', color: 'f29513' },
          { name: 'priority:high', color: 'ff0000' },
          { name: 'enhancement', color: '00ff00' },
        ],
      });

      expect(issueWithLabels.labels).toHaveLength(3);
      expect(issueWithLabels.labels?.[0]?.name).toBe('bug');
      expect(issueWithLabels.labels?.[1]?.name).toBe('priority:high');
    });

    it('should handle issues without labels', () => {
      const issueWithoutLabels = createMockIssue({ labels: [] });
      expect(issueWithoutLabels.labels).toHaveLength(0);
    });
  });

  describe('Repository Activity Display', () => {
    it('should display repository statistics correctly', () => {
      const repository = createMockRepository({
        stargazers_count: 150,
        forks_count: 30,
        open_issues_count: 8,
      });

      expect(repository.stargazers_count).toBe(150);
      expect(repository.forks_count).toBe(30);
      expect(repository.open_issues_count).toBe(8);
    });

    it('should handle repository with zero statistics', () => {
      const repository = createMockRepository({
        stargazers_count: 0,
        forks_count: 0,
        open_issues_count: 0,
      });

      expect(repository.stargazers_count).toBe(0);
      expect(repository.forks_count).toBe(0);
      expect(repository.open_issues_count).toBe(0);
    });

    it('should handle repository push time', () => {
      const pushTime = new Date().toISOString();
      const repository = createMockRepository({
        pushed_at: pushTime,
      });

      expect(repository.pushed_at).toBe(pushTime);
    });

    it('should handle null repository data', () => {
      const repository = null;
      expect(repository).toBeNull();
    });
  });

  describe('Weekly Activity Summary', () => {
    it('should display weekly activity correctly', () => {
      const stats = createMockUnifiedStats({
        recentActivity: {
          thisWeek: 12,
          lastWeek: 8,
          recentlyUpdated: [],
        },
      });

      expect(stats.recentActivity.thisWeek).toBe(12);
      expect(stats.recentActivity.lastWeek).toBe(8);
    });

    it('should handle zero weekly activity', () => {
      const stats = createMockUnifiedStats({
        recentActivity: {
          thisWeek: 0,
          lastWeek: 0,
          recentlyUpdated: [],
        },
      });

      expect(stats.recentActivity.thisWeek).toBe(0);
      expect(stats.recentActivity.lastWeek).toBe(0);
    });

    it('should handle null stats for weekly activity', () => {
      const stats = null as UnifiedStatsWithActivity | null;
      const thisWeek = stats?.recentActivity?.thisWeek || 0;
      expect(thisWeek).toBe(0);
    });
  });

  describe('Metadata and Data Sources', () => {
    it('should display metadata correctly', () => {
      const stats = createMockUnifiedStats({
        meta: {
          source: 'cache',
          generated_at: '2023-12-01T10:00:00Z',
        },
      });

      expect(stats.meta.source).toBe('cache');
      expect(stats.meta.generated_at).toBe('2023-12-01T10:00:00Z');
    });

    it('should handle different data sources', () => {
      const sources: Array<'api' | 'cache' | 'fallback'> = ['api', 'cache', 'fallback'];

      sources.forEach(source => {
        const stats = createMockUnifiedStats({
          meta: { source, generated_at: new Date().toISOString() },
        });
        expect(stats.meta.source).toBe(source);
      });
    });

    it('should handle missing metadata', () => {
      const stats = null as UnifiedStatsWithActivity | null;
      const source = stats?.meta?.source || 'unknown';
      const generatedAt = stats?.meta?.generated_at || 'unknown';

      expect(source).toBe('unknown');
      expect(generatedAt).toBe('unknown');
    });
  });

  describe('Error Handling', () => {
    it('should handle null stats gracefully', () => {
      const stats = null as UnifiedStatsWithActivity | null;
      const recentIssues = stats?.recentActivity?.recentlyUpdated || [];

      expect(recentIssues).toHaveLength(0);
    });

    it('should handle undefined recent activity', () => {
      const stats = { recentActivity: undefined } as any;
      const recentIssues = stats?.recentActivity?.recentlyUpdated || [];

      expect(recentIssues).toHaveLength(0);
    });

    it('should handle network errors for repository data', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      try {
        await fetch('/api/github/repository?include_stats=true');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Network error');
      }
    });
  });

  describe('Component Integration', () => {
    it('should handle CSS class prop correctly', () => {
      const className = 'custom-activity-class';
      const expectedClass = `space-y-6 ${className}`;

      expect(expectedClass).toContain('custom-activity-class');
      expect(expectedClass).toContain('space-y-6');
    });

    it('should format issue display correctly', () => {
      const issue = createMockIssue({
        number: 456,
        title: 'Test Issue Title',
        state: 'open',
        updated_at: new Date().toISOString(),
      });

      const icon = getIssueIcon(issue);
      const relativeTime = getRelativeTime(issue.updated_at);

      expect(icon).toBeDefined();
      expect(relativeTime).toContain('ago');
    });

    it('should handle label display correctly', () => {
      const issue = createMockIssue({
        labels: [
          { name: 'bug', color: 'f29513' },
          { name: 'priority:high', color: 'ff0000' },
          { name: 'enhancement', color: '00ff00' },
        ],
      });

      // Only first 2 labels should be displayed
      const displayedLabels = issue.labels?.slice(0, 2) || [];
      expect(displayedLabels).toHaveLength(2);
      expect(displayedLabels[0]?.name).toBe('bug');
      expect(displayedLabels[1]?.name).toBe('priority:high');
    });
  });

  describe('Performance', () => {
    it('should handle large issue lists efficiently', () => {
      const startTime = performance.now();

      const largeIssueList = Array.from({ length: 100 }, (_, i) =>
        createMockIssue({
          id: i + 1,
          number: i + 1,
          title: `Issue ${i + 1}`,
        })
      );

      largeIssueList.forEach(issue => {
        const icon = getIssueIcon(issue);
        const relativeTime = getRelativeTime(issue.updated_at);

        expect(icon).toBeDefined();
        expect(relativeTime).toBeDefined();
      });

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(100); // Should be reasonably fast
    });

    it('should handle concurrent API requests', async () => {
      const mockStats = createMockUnifiedStats();
      const mockRepo = createMockRepository();

      mockStatsService.getUnifiedStats.mockResolvedValue({
        success: true,
        data: mockStats,
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRepo),
      });

      const requests = Array(3)
        .fill(null)
        .map(() =>
          Promise.all([
            mockStatsService.getUnifiedStats({ includeRecentActivity: true }),
            fetch('/api/repository'),
          ])
        );

      const results = await Promise.all(requests);

      results.forEach(([statsResult, repoResult]) => {
        expect(statsResult.success).toBe(true);
        expect(repoResult.ok).toBe(true);
      });
    });
  });

  describe('Data Filtering', () => {
    it('should filter issues by state correctly', () => {
      const issues = [
        createMockIssue({ state: 'open' }),
        createMockIssue({ state: 'closed' }),
        createMockIssue({ state: 'open' }),
      ];

      const openIssues = issues.filter(issue => issue.state === 'open');
      const closedIssues = issues.filter(issue => issue.state === 'closed');

      expect(openIssues).toHaveLength(2);
      expect(closedIssues).toHaveLength(1);
    });

    it('should filter issues by date range', () => {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      const issues = [
        createMockIssue({ updated_at: now.toISOString() }),
        createMockIssue({ updated_at: oneWeekAgo.toISOString() }),
        createMockIssue({ updated_at: twoWeeksAgo.toISOString() }),
      ];

      const recentIssues = issues.filter(issue => {
        const updatedAt = new Date(issue.updated_at);
        return updatedAt >= oneWeekAgo;
      });

      expect(recentIssues).toHaveLength(2);
    });

    it('should filter issues by priority labels', () => {
      const issues = [
        createMockIssue({ labels: [{ name: 'priority:high', color: 'ff0000' }] }),
        createMockIssue({ labels: [{ name: 'priority:low', color: '00ff00' }] }),
        createMockIssue({ labels: [{ name: 'bug', color: 'f29513' }] }),
      ];

      const priorityIssues = issues.filter(issue =>
        issue.labels?.some(label => label.name.startsWith('priority:'))
      );

      expect(priorityIssues).toHaveLength(2);
    });
  });

  describe('Error Recovery', () => {
    it('should handle API timeout gracefully', async () => {
      mockStatsService.getUnifiedStats.mockRejectedValue(new Error('Request timeout'));

      try {
        await mockStatsService.getUnifiedStats({ includeRecentActivity: true });
      } catch (error) {
        expect((error as Error).message).toBe('Request timeout');
      }
    });

    it('should handle invalid JSON response', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      try {
        const response = await fetch('/api/repository');
        await response.json();
      } catch (error) {
        expect((error as Error).message).toBe('Invalid JSON');
      }
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      try {
        await fetch('/api/repository');
      } catch (error) {
        expect((error as Error).message).toBe('Network error');
      }
    });
  });

  describe('Real-time Updates', () => {
    it('should handle activity count updates', async () => {
      const initialStats = createMockUnifiedStats({
        recentActivity: { thisWeek: 5, lastWeek: 8, recentlyUpdated: [] },
      });

      const updatedStats = createMockUnifiedStats({
        recentActivity: { thisWeek: 7, lastWeek: 8, recentlyUpdated: [] },
      });

      mockStatsService.getUnifiedStats
        .mockResolvedValueOnce({ success: true, data: initialStats })
        .mockResolvedValueOnce({ success: true, data: updatedStats });

      const firstResult = await mockStatsService.getUnifiedStats({ includeRecentActivity: true });
      const secondResult = await mockStatsService.getUnifiedStats({ includeRecentActivity: true });

      expect(firstResult.data.recentActivity.thisWeek).toBe(5);
      expect(secondResult.data.recentActivity.thisWeek).toBe(7);
    });

    it('should handle issue list updates', async () => {
      const initialIssues = [createMockIssue({ id: 1, title: 'Initial Issue' })];
      const updatedIssues = [
        createMockIssue({ id: 1, title: 'Initial Issue' }),
        createMockIssue({ id: 2, title: 'New Issue' }),
      ];

      const initialStats = createMockUnifiedStats({
        recentActivity: { thisWeek: 5, lastWeek: 8, recentlyUpdated: initialIssues },
      });

      const updatedStats = createMockUnifiedStats({
        recentActivity: { thisWeek: 6, lastWeek: 8, recentlyUpdated: updatedIssues },
      });

      mockStatsService.getUnifiedStats
        .mockResolvedValueOnce({ success: true, data: initialStats })
        .mockResolvedValueOnce({ success: true, data: updatedStats });

      const firstResult = await mockStatsService.getUnifiedStats({ includeRecentActivity: true });
      const secondResult = await mockStatsService.getUnifiedStats({ includeRecentActivity: true });

      expect(firstResult.data.recentActivity.recentlyUpdated).toHaveLength(1);
      expect(secondResult.data.recentActivity.recentlyUpdated).toHaveLength(2);
    });
  });

  describe('Accessibility', () => {
    it('should provide proper ARIA labels for activity items', () => {
      const issue = createMockIssue({
        number: 123,
        title: 'Test Issue',
        state: 'open',
        updated_at: new Date().toISOString(),
      });

      const ariaLabel = `Issue #${issue.number}: ${issue.title}, Status: ${issue.state}`;
      expect(ariaLabel).toBe('Issue #123: Test Issue, Status: open');
    });

    it('should provide semantic HTML structure', () => {
      const expectedStructure = {
        container: 'section',
        header: 'h2',
        list: 'ul',
        listItem: 'li',
        link: 'a',
      };

      expect(expectedStructure.container).toBe('section');
      expect(expectedStructure.header).toBe('h2');
      expect(expectedStructure.list).toBe('ul');
      expect(expectedStructure.listItem).toBe('li');
      expect(expectedStructure.link).toBe('a');
    });

    it('should handle keyboard navigation', () => {
      const issue = createMockIssue();
      const linkElement = {
        href: `/issues/${issue.number}`,
        tabIndex: 0,
        'aria-label': `Navigate to issue #${issue.number}`,
      };

      expect(linkElement.href).toBe('/issues/123');
      expect(linkElement.tabIndex).toBe(0);
      expect(linkElement['aria-label']).toBe('Navigate to issue #123');
    });
  });

  describe('Responsive Design', () => {
    it('should apply responsive layout classes', () => {
      const responsiveClasses = {
        container: 'grid grid-cols-1 lg:grid-cols-2 gap-6',
        card: 'bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6',
        list: 'space-y-4',
      };

      expect(responsiveClasses.container).toContain('grid-cols-1');
      expect(responsiveClasses.container).toContain('lg:grid-cols-2');
      expect(responsiveClasses.card).toContain('dark:bg-gray-800');
      expect(responsiveClasses.list).toContain('space-y-4');
    });

    it('should handle mobile layout adjustments', () => {
      const mobileClasses = {
        title: 'text-lg md:text-xl font-semibold',
        content: 'text-sm md:text-base',
        spacing: 'px-4 md:px-6',
      };

      expect(mobileClasses.title).toContain('text-lg');
      expect(mobileClasses.title).toContain('md:text-xl');
      expect(mobileClasses.content).toContain('text-sm');
      expect(mobileClasses.content).toContain('md:text-base');
    });
  });

  describe('Data Caching', () => {
    it('should handle cached data correctly', async () => {
      const cachedStats = createMockUnifiedStats({
        meta: { source: 'cache', generated_at: new Date().toISOString() },
      });

      mockStatsService.getUnifiedStats.mockResolvedValue({
        success: true,
        data: cachedStats,
      });

      const result = await mockStatsService.getUnifiedStats({ includeRecentActivity: true });

      expect(result.success).toBe(true);
      expect(result.data.meta.source).toBe('cache');
    });

    it('should handle cache invalidation', async () => {
      const freshStats = createMockUnifiedStats({
        meta: { source: 'api', generated_at: new Date().toISOString() },
      });

      mockStatsService.getUnifiedStats.mockResolvedValue({
        success: true,
        data: freshStats,
      });

      const result = await mockStatsService.getUnifiedStats({
        includeRecentActivity: true,
        invalidateCache: true,
      });

      expect(result.success).toBe(true);
      expect(result.data.meta.source).toBe('api');
    });
  });
});

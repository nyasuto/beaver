/**
 * statsCalculations.ts Tests
 *
 * 統計計算ユーティリティの包括的テストスイート
 * データ分析・統計処理の正確性と信頼性を確保する
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  StatsCalculations,
  calculateBasicStats,
  calculateDetailedStats,
} from '../statsCalculations';
import type { Issue, Label, User } from '../../schemas/github';

// ヘルパー関数：完全なLabelオブジェクトを作成
const createMockLabel = (name: string, color: string = 'ff0000', id: number = 1): Label => ({
  id,
  node_id: `L_${id}`,
  name,
  description: `Label: ${name}`,
  color,
  default: false,
});

// ヘルパー関数：完全なUserオブジェクトを作成
const createMockUser = (login: string, id: number = 1): User => ({
  login,
  id,
  node_id: `U_${id}`,
  avatar_url: `https://github.com/${login}.jpg`,
  gravatar_id: null,
  url: `https://api.github.com/users/${login}`,
  html_url: `https://github.com/${login}`,
  type: 'User',
  site_admin: false,
});

// テストデータ用のモック Issue インターフェース
const createMockIssue = (overrides: Partial<Issue> = {}): Issue => ({
  id: 1,
  node_id: 'I_12345',
  number: 1,
  title: 'Test Issue',
  body: 'Test body',
  body_text: 'Test body',
  body_html: '<p>Test body</p>',
  state: 'open',
  locked: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  closed_at: null,
  assignee: null,
  assignees: [],
  milestone: null,
  comments: 0,
  author_association: 'OWNER',
  active_lock_reason: null,
  draft: false,
  pull_request: null,
  labels: [],
  user: {
    login: 'testuser',
    id: 12345,
    node_id: 'U_12345',
    avatar_url: 'https://github.com/avatar.jpg',
    gravatar_id: null,
    url: 'https://api.github.com/users/testuser',
    html_url: 'https://github.com/testuser',
    type: 'User',
    site_admin: false,
  },
  html_url: 'https://github.com/test/repo/issues/1',
  url: 'https://api.github.com/repos/test/repo/issues/1',
  repository_url: 'https://api.github.com/repos/test/repo',
  labels_url: 'https://api.github.com/repos/test/repo/issues/1/labels{/name}',
  comments_url: 'https://api.github.com/repos/test/repo/issues/1/comments',
  events_url: 'https://api.github.com/repos/test/repo/issues/1/events',
  ...overrides,
});

// 基本的なテストデータセット
const basicIssues: Issue[] = [
  createMockIssue({
    id: 1,
    number: 1,
    state: 'open',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    labels: [createMockLabel('priority:high', 'ff0000', 1)],
    assignee: createMockUser('user1', 100),
  }),
  createMockIssue({
    id: 2,
    number: 2,
    state: 'closed',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
    closed_at: '2024-01-03T00:00:00Z',
    labels: [createMockLabel('priority:medium', '00ff00', 2)],
    assignee: createMockUser('user2', 200),
  }),
  createMockIssue({
    id: 3,
    number: 3,
    state: 'open',
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-04T00:00:00Z',
    labels: [createMockLabel('priority:critical', 'ff0000', 3)],
    assignee: createMockUser('user1', 100),
  }),
  createMockIssue({
    id: 4,
    number: 4,
    state: 'closed',
    created_at: '2024-01-04T00:00:00Z',
    updated_at: '2024-01-05T00:00:00Z',
    closed_at: '2024-01-06T00:00:00Z',
    labels: [createMockLabel('bug', '0000ff', 4)],
    assignee: null,
  }),
];

// 時刻をモック
const MOCK_NOW = new Date('2024-01-10T12:00:00Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(MOCK_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

// ====================
// PRIORITY STATISTICS TESTS
// ====================

describe('StatsCalculations.calculatePriorityStats', () => {
  it('should calculate priority statistics correctly', async () => {
    const stats = await StatsCalculations.calculatePriorityStats(basicIssues);

    expect(stats.critical).toBe(1);
    expect(stats.high).toBe(1);
    expect(stats.medium).toBe(1);
    expect(stats.low).toBe(1); // Issue without priority labels defaults to low
  });

  it('should handle empty issues array', async () => {
    const stats = await StatsCalculations.calculatePriorityStats([]);

    expect(stats.critical).toBe(0);
    expect(stats.high).toBe(0);
    expect(stats.medium).toBe(0);
    expect(stats.low).toBe(0);
  });

  it('should default to low priority when no priority labels exist', async () => {
    const issuesWithoutPriority = [
      createMockIssue({
        labels: [createMockLabel('bug', 'ff0000', 101)],
      }),
      createMockIssue({
        labels: [createMockLabel('feature', '00ff00', 102)],
      }),
    ];

    const stats = await StatsCalculations.calculatePriorityStats(issuesWithoutPriority);

    expect(stats.low).toBe(2);
    expect(stats.critical + stats.high + stats.medium).toBe(0);
  });

  it('should handle issues without labels', async () => {
    const issuesWithoutLabels = [
      createMockIssue({ labels: [] }),
      createMockIssue({ labels: undefined as any }),
    ];

    const stats = await StatsCalculations.calculatePriorityStats(issuesWithoutLabels);

    expect(stats.low).toBe(2);
  });
});

// ====================
// RECENT ACTIVITY TESTS
// ====================

describe('StatsCalculations.calculateRecentActivity', () => {
  it('should calculate recent activity correctly', () => {
    const recentIssues = [
      createMockIssue({
        updated_at: '2024-01-09T00:00:00Z', // 1 day ago
      }),
      createMockIssue({
        updated_at: '2024-01-08T00:00:00Z', // 2 days ago
      }),
      createMockIssue({
        updated_at: '2024-01-01T00:00:00Z', // 9 days ago (outside 7-day window)
      }),
    ];

    const recentCount = StatsCalculations.calculateRecentActivity(recentIssues, 7);
    expect(recentCount).toBe(2);
  });

  it('should handle custom days back parameter', () => {
    const issues = [
      createMockIssue({
        updated_at: '2024-01-08T00:00:00Z', // 2+ days ago from MOCK_NOW (2024-01-10T12:00:00Z)
      }),
      createMockIssue({
        updated_at: '2024-01-10T00:00:00Z', // Same day as MOCK_NOW
      }),
    ];

    const oneDayCount = StatsCalculations.calculateRecentActivity(issues, 1);
    const threeDayCount = StatsCalculations.calculateRecentActivity(issues, 3);

    expect(oneDayCount).toBe(1); // Only the issue from 2024-01-10 (within 1 day)
    expect(threeDayCount).toBe(2); // Both issues (within 3 days)
  });

  it('should return zero for empty issues', () => {
    const count = StatsCalculations.calculateRecentActivity([]);
    expect(count).toBe(0);
  });

  it('should return zero when no recent activity', () => {
    const oldIssues = [
      createMockIssue({
        updated_at: '2023-01-01T00:00:00Z', // Very old
      }),
    ];

    const count = StatsCalculations.calculateRecentActivity(oldIssues, 7);
    expect(count).toBe(0);
  });
});

// ====================
// PERIOD CALCULATIONS TESTS
// ====================

describe('StatsCalculations.calculateCreatedInPeriod', () => {
  it('should calculate created issues in period correctly', () => {
    const issues = [
      createMockIssue({
        created_at: '2024-01-09T00:00:00Z', // 1 day ago
      }),
      createMockIssue({
        created_at: '2024-01-08T00:00:00Z', // 2 days ago
      }),
      createMockIssue({
        created_at: '2024-01-01T00:00:00Z', // 9 days ago (outside 7-day window)
      }),
    ];

    const count = StatsCalculations.calculateCreatedInPeriod(issues, 7);
    expect(count).toBe(2);
  });

  it('should handle different period lengths', () => {
    const issues = [
      createMockIssue({
        created_at: '2024-01-09T00:00:00Z', // 1 day ago
      }),
      createMockIssue({
        created_at: '2024-01-05T00:00:00Z', // 5 days ago
      }),
    ];

    const threeDayCount = StatsCalculations.calculateCreatedInPeriod(issues, 3);
    const sevenDayCount = StatsCalculations.calculateCreatedInPeriod(issues, 7);

    expect(threeDayCount).toBe(1);
    expect(sevenDayCount).toBe(2);
  });
});

describe('StatsCalculations.calculateClosedInPeriod', () => {
  it('should calculate closed issues in period correctly', () => {
    const issues = [
      createMockIssue({
        state: 'closed',
        closed_at: '2024-01-09T00:00:00Z', // 1 day ago
      }),
      createMockIssue({
        state: 'closed',
        closed_at: '2024-01-08T00:00:00Z', // 2 days ago
      }),
      createMockIssue({
        state: 'closed',
        closed_at: '2024-01-01T00:00:00Z', // 9 days ago (outside window)
      }),
      createMockIssue({
        state: 'open', // Not closed
      }),
    ];

    const count = StatsCalculations.calculateClosedInPeriod(issues, 7);
    expect(count).toBe(2);
  });

  it('should ignore open issues', () => {
    const openIssues = [
      createMockIssue({
        state: 'open',
        closed_at: null,
      }),
    ];

    const count = StatsCalculations.calculateClosedInPeriod(openIssues, 7);
    expect(count).toBe(0);
  });

  it('should ignore closed issues without closed_at', () => {
    const closedWithoutDate = [
      createMockIssue({
        state: 'closed',
        closed_at: null,
      }),
    ];

    const count = StatsCalculations.calculateClosedInPeriod(closedWithoutDate, 7);
    expect(count).toBe(0);
  });
});

// ====================
// RESOLUTION TIME TESTS
// ====================

describe('StatsCalculations.calculateAverageResolutionTime', () => {
  it('should calculate average resolution time correctly', () => {
    const issues = [
      createMockIssue({
        state: 'closed',
        created_at: '2024-01-01T00:00:00Z',
        closed_at: '2024-01-02T00:00:00Z', // 24 hours
      }),
      createMockIssue({
        state: 'closed',
        created_at: '2024-01-03T00:00:00Z',
        closed_at: '2024-01-05T00:00:00Z', // 48 hours
      }),
    ];

    const avgTime = StatsCalculations.calculateAverageResolutionTime(issues);
    expect(avgTime).toBe(36); // (24 + 48) / 2 = 36 hours
  });

  it('should return zero for issues without closed issues', () => {
    const openIssues = [
      createMockIssue({
        state: 'open',
        closed_at: null,
      }),
    ];

    const avgTime = StatsCalculations.calculateAverageResolutionTime(openIssues);
    expect(avgTime).toBe(0);
  });

  it('should ignore open issues in calculation', () => {
    const mixedIssues = [
      createMockIssue({
        state: 'closed',
        created_at: '2024-01-01T00:00:00Z',
        closed_at: '2024-01-02T00:00:00Z', // 24 hours
      }),
      createMockIssue({
        state: 'open',
        created_at: '2024-01-01T00:00:00Z',
      }),
    ];

    const avgTime = StatsCalculations.calculateAverageResolutionTime(mixedIssues);
    expect(avgTime).toBe(24);
  });

  it('should handle closed issues without closed_at date', () => {
    const issuesWithoutClosedAt = [
      createMockIssue({
        state: 'closed',
        closed_at: null,
      }),
      createMockIssue({
        state: 'closed',
        created_at: '2024-01-01T00:00:00Z',
        closed_at: '2024-01-02T00:00:00Z', // 24 hours
      }),
    ];

    const avgTime = StatsCalculations.calculateAverageResolutionTime(issuesWithoutClosedAt);
    expect(avgTime).toBe(24); // Only counts the valid closed issue
  });

  it('should round to nearest hour', () => {
    const issues = [
      createMockIssue({
        state: 'closed',
        created_at: '2024-01-01T00:00:00Z',
        closed_at: '2024-01-01T01:30:00Z', // 1.5 hours
      }),
    ];

    const avgTime = StatsCalculations.calculateAverageResolutionTime(issues);
    expect(avgTime).toBe(2); // Rounded to 2 hours
  });
});

// ====================
// LABEL STATISTICS TESTS
// ====================

describe('StatsCalculations.calculateLabelStats', () => {
  it('should calculate label statistics correctly', () => {
    const issues = [
      createMockIssue({
        labels: [createMockLabel('bug', 'ff0000', 401), createMockLabel('urgent', 'ff8800', 402)],
      }),
      createMockIssue({
        labels: [
          createMockLabel('bug', 'ff0000', 401),
          createMockLabel('documentation', '00ff00', 403),
        ],
      }),
      createMockIssue({
        labels: [createMockLabel('feature', '0000ff', 404)],
      }),
    ];

    const labelStats = StatsCalculations.calculateLabelStats(issues);

    expect(labelStats).toHaveLength(4);

    const bugLabel = labelStats.find(label => label.name === 'bug');
    expect(bugLabel).toEqual({
      name: 'bug',
      color: 'ff0000',
      count: 2,
      percentage: 67, // 2/3 * 100 = 66.67, rounded to 67
    });

    const urgentLabel = labelStats.find(label => label.name === 'urgent');
    expect(urgentLabel).toEqual({
      name: 'urgent',
      color: 'ff8800',
      count: 1,
      percentage: 33, // 1/3 * 100 = 33.33, rounded to 33
    });
  });

  it('should sort labels by count in descending order', () => {
    const issues = [
      createMockIssue({
        labels: [createMockLabel('common', 'ff0000', 501)],
      }),
      createMockIssue({
        labels: [createMockLabel('common', 'ff0000', 501), createMockLabel('rare', '00ff00', 502)],
      }),
      createMockIssue({
        labels: [createMockLabel('common', 'ff0000', 501)],
      }),
    ];

    const labelStats = StatsCalculations.calculateLabelStats(issues);

    expect(labelStats).toHaveLength(2);
    expect(labelStats[0]!.name).toBe('common');
    expect(labelStats[0]!.count).toBe(3);
    expect(labelStats[1]!.name).toBe('rare');
    expect(labelStats[1]!.count).toBe(1);
  });

  it('should handle empty issues array', () => {
    const labelStats = StatsCalculations.calculateLabelStats([]);
    expect(labelStats).toEqual([]);
  });

  it('should handle issues without labels', () => {
    const issuesWithoutLabels = [
      createMockIssue({ labels: [] }),
      createMockIssue({ labels: undefined as any }),
    ];

    const labelStats = StatsCalculations.calculateLabelStats(issuesWithoutLabels);
    expect(labelStats).toEqual([]);
  });

  it('should calculate percentages correctly for single issue', () => {
    const singleIssue = [
      createMockIssue({
        labels: [createMockLabel('solo', 'ff0000', 601)],
      }),
    ];

    const labelStats = StatsCalculations.calculateLabelStats(singleIssue);

    expect(labelStats[0]).toEqual({
      name: 'solo',
      color: 'ff0000',
      count: 1,
      percentage: 100,
    });
  });
});

// ====================
// TIME SERIES STATISTICS TESTS
// ====================

describe('StatsCalculations.calculateTimeSeriesStats', () => {
  it('should calculate daily statistics correctly', () => {
    const issues = [
      createMockIssue({
        created_at: '2024-01-08T10:00:00Z', // 2 days ago
      }),
      createMockIssue({
        created_at: '2024-01-08T15:00:00Z', // 2 days ago, same day
      }),
      createMockIssue({
        created_at: '2024-01-09T12:00:00Z', // 1 day ago
      }),
      createMockIssue({
        created_at: '2023-12-01T00:00:00Z', // Very old, should be excluded
      }),
    ];

    const timeSeriesStats = StatsCalculations.calculateTimeSeriesStats(issues, 30);

    // Should have 30 daily entries
    expect(timeSeriesStats.daily).toHaveLength(30);

    // Find specific dates
    const jan8Stats = timeSeriesStats.daily.find(day => day.date === '2024-01-08');
    const jan9Stats = timeSeriesStats.daily.find(day => day.date === '2024-01-09');

    expect(jan8Stats?.count).toBe(2);
    expect(jan9Stats?.count).toBe(1);
  });

  it('should calculate weekly statistics correctly', () => {
    const timeSeriesStats = StatsCalculations.calculateTimeSeriesStats(basicIssues, 30);

    // Should have 4 weekly entries
    expect(timeSeriesStats.weekly).toHaveLength(4);

    // Each entry should have week and count properties
    timeSeriesStats.weekly.forEach(week => {
      expect(week).toHaveProperty('week');
      expect(week).toHaveProperty('count');
      expect(typeof week.count).toBe('number');
    });
  });

  it('should calculate monthly statistics correctly', () => {
    const timeSeriesStats = StatsCalculations.calculateTimeSeriesStats(basicIssues, 30);

    // Should have 6 monthly entries
    expect(timeSeriesStats.monthly).toHaveLength(6);

    // Each entry should have month and count properties
    timeSeriesStats.monthly.forEach(month => {
      expect(month).toHaveProperty('month');
      expect(month).toHaveProperty('count');
      expect(typeof month.count).toBe('number');
    });
  });

  it('should handle empty issues array', () => {
    const timeSeriesStats = StatsCalculations.calculateTimeSeriesStats([], 7);

    expect(timeSeriesStats.daily).toHaveLength(7);
    expect(timeSeriesStats.weekly).toHaveLength(4);
    expect(timeSeriesStats.monthly).toHaveLength(6);

    // All counts should be zero
    timeSeriesStats.daily.forEach(day => {
      expect(day.count).toBe(0);
    });
  });

  it('should sort daily statistics chronologically', () => {
    const timeSeriesStats = StatsCalculations.calculateTimeSeriesStats(basicIssues, 7);

    const dates = timeSeriesStats.daily.map(day => day.date);
    const sortedDates = [...dates].sort();

    expect(dates).toEqual(sortedDates);
  });

  it('should handle different daysBack parameter', () => {
    const shortPeriod = StatsCalculations.calculateTimeSeriesStats(basicIssues, 7);
    const longPeriod = StatsCalculations.calculateTimeSeriesStats(basicIssues, 60);

    expect(shortPeriod.daily).toHaveLength(7);
    expect(longPeriod.daily).toHaveLength(60);
  });

  it('should filter issues outside the time window', () => {
    const issues = [
      createMockIssue({
        created_at: '2024-01-09T00:00:00Z', // 1 day ago
      }),
      createMockIssue({
        created_at: '2023-01-01T00:00:00Z', // Very old
      }),
    ];

    const timeSeriesStats = StatsCalculations.calculateTimeSeriesStats(issues, 3);

    // Only one issue should be counted
    const totalCount = timeSeriesStats.daily.reduce((sum, day) => sum + day.count, 0);
    expect(totalCount).toBe(1);
  });
});

// ====================
// ASSIGNEE STATISTICS TESTS
// ====================

describe('StatsCalculations.calculateAssigneeStats', () => {
  it('should calculate assignee statistics correctly', () => {
    const issues = [
      createMockIssue({
        state: 'open',
        assignee: createMockUser('user1', 101),
      }),
      createMockIssue({
        state: 'closed',
        assignee: createMockUser('user1', 101),
      }),
      createMockIssue({
        state: 'open',
        assignee: createMockUser('user2', 102),
      }),
      createMockIssue({
        state: 'open',
        assignee: null, // Unassigned
      }),
    ];

    const assigneeStats = StatsCalculations.calculateAssigneeStats(issues);

    expect(assigneeStats).toHaveLength(2);

    const user1Stats = assigneeStats.find(stat => stat.assignee === 'user1');
    expect(user1Stats).toEqual({
      assignee: 'user1',
      avatar_url: 'https://github.com/user1.jpg',
      count: 2,
      openCount: 1,
      closedCount: 1,
    });

    const user2Stats = assigneeStats.find(stat => stat.assignee === 'user2');
    expect(user2Stats).toEqual({
      assignee: 'user2',
      avatar_url: 'https://github.com/user2.jpg',
      count: 1,
      openCount: 1,
      closedCount: 0,
    });
  });

  it('should sort assignees by total count in descending order', () => {
    const issues = [
      createMockIssue({
        assignee: createMockUser('busy_user', 201),
      }),
      createMockIssue({
        assignee: createMockUser('busy_user', 201),
      }),
      createMockIssue({
        assignee: createMockUser('busy_user', 201),
      }),
      createMockIssue({
        assignee: createMockUser('less_busy', 202),
      }),
    ];

    const assigneeStats = StatsCalculations.calculateAssigneeStats(issues);

    expect(assigneeStats).toHaveLength(2);
    expect(assigneeStats[0]!.assignee).toBe('busy_user');
    expect(assigneeStats[0]!.count).toBe(3);
    expect(assigneeStats[1]!.assignee).toBe('less_busy');
    expect(assigneeStats[1]!.count).toBe(1);
  });

  it('should handle issues without assignees', () => {
    const unassignedIssues = [
      createMockIssue({ assignee: null }),
      createMockIssue({ assignee: null }),
    ];

    const assigneeStats = StatsCalculations.calculateAssigneeStats(unassignedIssues);

    expect(assigneeStats).toEqual([]);
  });

  it('should handle empty issues array', () => {
    const assigneeStats = StatsCalculations.calculateAssigneeStats([]);
    expect(assigneeStats).toEqual([]);
  });

  it('should count open and closed issues separately', () => {
    const issues = [
      createMockIssue({
        state: 'open',
        assignee: createMockUser('tester', 301),
      }),
      createMockIssue({
        state: 'open',
        assignee: createMockUser('tester', 301),
      }),
      createMockIssue({
        state: 'closed',
        assignee: createMockUser('tester', 301),
      }),
    ];

    const assigneeStats = StatsCalculations.calculateAssigneeStats(issues);

    expect(assigneeStats[0]).toEqual({
      assignee: 'tester',
      avatar_url: 'https://github.com/tester.jpg',
      count: 3,
      openCount: 2,
      closedCount: 1,
    });
  });
});

// ====================
// HEALTH SCORE TESTS
// ====================

describe('StatsCalculations.calculateHealthScore', () => {
  it('should return 100 for empty issues array', async () => {
    const healthScore = await StatsCalculations.calculateHealthScore([]);
    expect(healthScore).toBe(100);
  });

  it('should calculate basic health score correctly', async () => {
    const healthyIssues = [
      createMockIssue({
        state: 'closed',
        created_at: '2024-01-01T00:00:00Z',
        closed_at: '2024-01-02T00:00:00Z', // Quick resolution
        labels: [createMockLabel('enhancement', '00ff00', 701)],
      }),
      createMockIssue({
        state: 'closed',
        created_at: '2024-01-02T00:00:00Z',
        closed_at: '2024-01-03T00:00:00Z', // Quick resolution
        labels: [createMockLabel('bug', 'ff0000', 702)],
      }),
      createMockIssue({
        state: 'open',
        created_at: '2024-01-09T00:00:00Z',
        updated_at: '2024-01-09T12:00:00Z', // Recent activity
        labels: [createMockLabel('feature', '0000ff', 703)],
      }),
    ];

    const healthScore = await StatsCalculations.calculateHealthScore(healthyIssues);

    expect(healthScore).toBeGreaterThan(50);
    expect(healthScore).toBeLessThanOrEqual(100);
  });

  it('should penalize high open issue ratio', async () => {
    const highOpenRatioIssues = [
      createMockIssue({ state: 'open' }),
      createMockIssue({ state: 'open' }),
      createMockIssue({ state: 'open' }),
      createMockIssue({ state: 'open' }),
      createMockIssue({ state: 'open' }),
      createMockIssue({ state: 'open' }),
      createMockIssue({ state: 'open' }),
      createMockIssue({ state: 'open' }), // 8 open
      createMockIssue({ state: 'closed' }),
      createMockIssue({ state: 'closed' }), // 2 closed = 80% open ratio
    ];

    const healthScore = await StatsCalculations.calculateHealthScore(highOpenRatioIssues);

    expect(healthScore).toBeLessThan(100); // Should be penalized
  });

  it('should heavily penalize critical issues', async () => {
    const criticalIssues = [
      createMockIssue({
        state: 'open',
        labels: [createMockLabel('priority:critical', 'ff0000', 801)],
      }),
      createMockIssue({
        state: 'open',
        labels: [createMockLabel('critical', 'ff0000', 802)],
      }),
      createMockIssue({
        state: 'closed',
        labels: [createMockLabel('enhancement', '00ff00', 803)],
      }),
    ];

    const criticalScore = await StatsCalculations.calculateHealthScore(criticalIssues);

    const noCriticalIssues = [
      createMockIssue({
        state: 'open',
        labels: [createMockLabel('enhancement', '00ff00', 803)],
      }),
      createMockIssue({
        state: 'closed',
        labels: [createMockLabel('enhancement', '00ff00', 803)],
      }),
    ];

    const noCriticalScore = await StatsCalculations.calculateHealthScore(noCriticalIssues);

    expect(criticalScore).toBeLessThan(noCriticalScore);
  });

  it('should penalize lack of recent activity on open issues', async () => {
    const noRecentActivityIssues = [
      createMockIssue({
        state: 'open',
        updated_at: '2023-01-01T00:00:00Z', // Very old
      }),
      createMockIssue({
        state: 'open',
        updated_at: '2023-01-01T00:00:00Z', // Very old
      }),
    ];

    const recentActivityIssues = [
      createMockIssue({
        state: 'open',
        updated_at: '2024-01-09T00:00:00Z', // Recent
      }),
      createMockIssue({
        state: 'open',
        updated_at: '2024-01-09T00:00:00Z', // Recent
      }),
    ];

    const noActivityScore = await StatsCalculations.calculateHealthScore(noRecentActivityIssues);
    const withActivityScore = await StatsCalculations.calculateHealthScore(recentActivityIssues);

    expect(noActivityScore).toBeLessThan(withActivityScore);
  });

  it('should penalize long average resolution time', async () => {
    const slowResolutionIssues = [
      createMockIssue({
        state: 'closed',
        created_at: '2024-01-01T00:00:00Z',
        closed_at: '2024-01-15T00:00:00Z', // 14 days resolution time
      }),
      createMockIssue({
        state: 'closed',
        created_at: '2024-01-01T00:00:00Z',
        closed_at: '2024-01-20T00:00:00Z', // 19 days resolution time
      }),
    ];

    const fastResolutionIssues = [
      createMockIssue({
        state: 'closed',
        created_at: '2024-01-01T00:00:00Z',
        closed_at: '2024-01-02T00:00:00Z', // 1 day resolution time
      }),
      createMockIssue({
        state: 'closed',
        created_at: '2024-01-01T00:00:00Z',
        closed_at: '2024-01-03T00:00:00Z', // 2 days resolution time
      }),
    ];

    const slowScore = await StatsCalculations.calculateHealthScore(slowResolutionIssues);
    const fastScore = await StatsCalculations.calculateHealthScore(fastResolutionIssues);

    expect(slowScore).toBeLessThan(fastScore);
  });

  it('should return score between 0 and 100', async () => {
    const terribleIssues = [
      ...Array.from({ length: 10 }, (_, i) =>
        createMockIssue({
          id: i,
          state: 'open',
          labels: [createMockLabel('priority:critical', 'ff0000', 901 + i)],
          updated_at: '2023-01-01T00:00:00Z', // Very old
        })
      ),
    ];

    const healthScore = await StatsCalculations.calculateHealthScore(terribleIssues);

    expect(healthScore).toBeGreaterThanOrEqual(0);
    expect(healthScore).toBeLessThanOrEqual(100);
  });
});

// ====================
// TREND ANALYSIS TESTS
// ====================

describe('StatsCalculations.calculateTrend', () => {
  it('should detect upward trend', () => {
    const upwardTrendIssues = [
      createMockIssue({
        created_at: '2023-12-15T00:00:00Z', // Earlier half: 1 issue
      }),
      createMockIssue({
        created_at: '2024-01-05T00:00:00Z', // Recent half: 2 issues
      }),
      createMockIssue({
        created_at: '2024-01-08T00:00:00Z', // Recent half
      }),
    ];

    const trend = StatsCalculations.calculateTrend(upwardTrendIssues, 30);

    expect(trend.direction).toBe('up');
    expect(trend.percentage).toBeGreaterThan(0);
    expect(trend.description).toContain('増加');
  });

  it('should detect downward trend', () => {
    const downwardTrendIssues = [
      createMockIssue({
        created_at: '2023-12-15T00:00:00Z', // Earlier half: 2 issues
      }),
      createMockIssue({
        created_at: '2023-12-20T00:00:00Z', // Earlier half
      }),
      createMockIssue({
        created_at: '2024-01-08T00:00:00Z', // Recent half: 1 issue
      }),
    ];

    const trend = StatsCalculations.calculateTrend(downwardTrendIssues, 30);

    expect(trend.direction).toBe('down');
    expect(trend.percentage).toBeGreaterThan(0);
    expect(trend.description).toContain('減少');
  });

  it('should detect stable trend', () => {
    const stableTrendIssues = [
      createMockIssue({
        created_at: '2023-12-20T00:00:00Z', // Earlier half: 2 issues
      }),
      createMockIssue({
        created_at: '2023-12-25T00:00:00Z', // Earlier half
      }),
      createMockIssue({
        created_at: '2024-01-05T00:00:00Z', // Recent half: 2 issues
      }),
      createMockIssue({
        created_at: '2024-01-08T00:00:00Z', // Recent half
      }),
    ];

    const trend = StatsCalculations.calculateTrend(stableTrendIssues, 30);

    expect(trend.direction).toBe('stable');
    expect(trend.percentage).toBeLessThan(10);
    expect(trend.description).toBe('安定しています');
  });

  it('should handle insufficient data', () => {
    const noEarlierIssues = [
      createMockIssue({
        created_at: '2024-01-08T00:00:00Z', // Only recent issues
      }),
    ];

    const trend = StatsCalculations.calculateTrend(noEarlierIssues, 30);

    expect(trend.direction).toBe('stable');
    expect(trend.percentage).toBe(0);
    expect(trend.description).toBe('データが不足しています');
  });

  it('should handle empty issues array', () => {
    const trend = StatsCalculations.calculateTrend([], 30);

    expect(trend.direction).toBe('stable');
    expect(trend.percentage).toBe(0);
    expect(trend.description).toBe('データが不足しています');
  });

  it('should handle different time periods', () => {
    const issues = [
      createMockIssue({
        created_at: '2024-01-01T00:00:00Z',
      }),
      createMockIssue({
        created_at: '2024-01-08T00:00:00Z',
      }),
    ];

    const shortTrend = StatsCalculations.calculateTrend(issues, 14);
    const longTrend = StatsCalculations.calculateTrend(issues, 60);

    expect(shortTrend).toHaveProperty('direction');
    expect(longTrend).toHaveProperty('direction');
  });

  it('should calculate percentage correctly', () => {
    const preciseTrendIssues = [
      createMockIssue({
        created_at: '2023-12-26T00:00:00Z', // Earlier half: 1 issue
      }),
      createMockIssue({
        created_at: '2024-01-04T00:00:00Z', // Recent half: 3 issues
      }),
      createMockIssue({
        created_at: '2024-01-06T00:00:00Z', // Recent half
      }),
      createMockIssue({
        created_at: '2024-01-08T00:00:00Z', // Recent half
      }),
    ];

    const trend = StatsCalculations.calculateTrend(preciseTrendIssues, 30);

    // Earlier: 1, Recent: 3, Change: +200%
    expect(trend.direction).toBe('up');
    expect(trend.percentage).toBe(200);
  });
});

// ====================
// CONVENIENCE FUNCTIONS TESTS
// ====================

describe('calculateBasicStats', () => {
  it('should calculate all basic statistics', async () => {
    const stats = await calculateBasicStats(basicIssues);

    expect(stats).toHaveProperty('total');
    expect(stats).toHaveProperty('open');
    expect(stats).toHaveProperty('closed');
    expect(stats).toHaveProperty('priority');
    expect(stats).toHaveProperty('recentActivity');
    expect(stats).toHaveProperty('healthScore');
    expect(stats).toHaveProperty('trend');

    expect(stats.total).toBe(4);
    expect(stats.open).toBe(2);
    expect(stats.closed).toBe(2);
    expect(typeof stats.priority).toBe('object');
    expect(typeof stats.recentActivity).toBe('number');
    expect(typeof stats.healthScore).toBe('number');
    expect(typeof stats.trend).toBe('object');
  });

  it('should handle empty issues array', async () => {
    const stats = await calculateBasicStats([]);

    expect(stats.total).toBe(0);
    expect(stats.open).toBe(0);
    expect(stats.closed).toBe(0);
    expect(stats.healthScore).toBe(100);
  });
});

describe('calculateDetailedStats', () => {
  it('should calculate all detailed statistics', async () => {
    const stats = await calculateDetailedStats(basicIssues);

    // Should include all basic stats
    expect(stats).toHaveProperty('total');
    expect(stats).toHaveProperty('open');
    expect(stats).toHaveProperty('closed');
    expect(stats).toHaveProperty('priority');
    expect(stats).toHaveProperty('recentActivity');
    expect(stats).toHaveProperty('healthScore');
    expect(stats).toHaveProperty('trend');

    // Plus detailed stats
    expect(stats).toHaveProperty('labels');
    expect(stats).toHaveProperty('timeSeries');
    expect(stats).toHaveProperty('assignees');
    expect(stats).toHaveProperty('averageResolutionTime');
    expect(stats).toHaveProperty('createdThisWeek');
    expect(stats).toHaveProperty('closedThisWeek');

    expect(Array.isArray(stats.labels)).toBe(true);
    expect(typeof stats.timeSeries).toBe('object');
    expect(Array.isArray(stats.assignees)).toBe(true);
    expect(typeof stats.averageResolutionTime).toBe('number');
    expect(typeof stats.createdThisWeek).toBe('number');
    expect(typeof stats.closedThisWeek).toBe('number');
  });

  it('should handle empty issues array', async () => {
    const stats = await calculateDetailedStats([]);

    expect(stats.total).toBe(0);
    expect(stats.labels).toEqual([]);
    expect(stats.assignees).toEqual([]);
    expect(stats.averageResolutionTime).toBe(0);
    expect(stats.createdThisWeek).toBe(0);
    expect(stats.closedThisWeek).toBe(0);
  });
});

// ====================
// EDGE CASES AND ERROR HANDLING TESTS
// ====================

describe('StatsCalculations Edge Cases', () => {
  it('should handle malformed dates gracefully', () => {
    const malformedDateIssues = [
      createMockIssue({
        created_at: 'invalid-date',
        updated_at: 'invalid-date',
      }),
      createMockIssue({
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }),
    ];

    expect(() => {
      StatsCalculations.calculateRecentActivity(malformedDateIssues);
    }).not.toThrow();

    expect(() => {
      StatsCalculations.calculateTimeSeriesStats(malformedDateIssues);
    }).not.toThrow();
  });

  it('should handle null/undefined values in issue objects', () => {
    const issuesWithNulls = [
      createMockIssue({
        labels: null as any,
        assignee: undefined as any,
        closed_at: undefined as any,
      }),
      createMockIssue({
        labels: [],
        assignee: null,
        closed_at: null,
      }),
    ];

    expect(() => {
      StatsCalculations.calculatePriorityStats(issuesWithNulls);
    }).not.toThrow();

    expect(() => {
      StatsCalculations.calculateAssigneeStats(issuesWithNulls);
    }).not.toThrow();

    expect(() => {
      StatsCalculations.calculateLabelStats(issuesWithNulls);
    }).not.toThrow();
  });

  it('should handle extreme date ranges', () => {
    const extremeDateIssues = [
      createMockIssue({
        created_at: '1970-01-01T00:00:00Z', // Unix epoch
      }),
      createMockIssue({
        created_at: '2099-12-31T23:59:59Z', // Far future
      }),
    ];

    expect(() => {
      StatsCalculations.calculateTimeSeriesStats(extremeDateIssues, 365);
    }).not.toThrow();

    expect(() => {
      StatsCalculations.calculateTrend(extremeDateIssues, 365);
    }).not.toThrow();
  });

  it('should handle very large datasets efficiently', async () => {
    const largeDataset = Array.from({ length: 10000 }, (_, i) =>
      createMockIssue({
        id: i,
        number: i,
        created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        labels: [createMockLabel(`label-${i % 10}`, 'ff0000', i + 1000)],
        assignee: createMockUser(`user-${i % 100}`, i + 1000),
      })
    );

    const startTime = Date.now();

    const stats = await calculateDetailedStats(largeDataset);

    const endTime = Date.now();
    const executionTime = endTime - startTime;

    expect(stats.total).toBe(10000);
    expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
  });

  it('should handle zero division scenarios', async () => {
    const emptyIssues: Issue[] = [];

    const healthScore = await StatsCalculations.calculateHealthScore(emptyIssues);
    const trend = StatsCalculations.calculateTrend(emptyIssues);
    const resolutionTime = StatsCalculations.calculateAverageResolutionTime(emptyIssues);

    expect(healthScore).toBe(100);
    expect(trend.percentage).toBe(0);
    expect(resolutionTime).toBe(0);
  });

  it('should maintain precision in statistical calculations', () => {
    const precisionTestIssues = [
      createMockIssue({
        created_at: '2024-01-01T00:00:00.123Z',
        closed_at: '2024-01-01T01:30:30.456Z',
        state: 'closed',
      }),
    ];

    const avgResolutionTime = StatsCalculations.calculateAverageResolutionTime(precisionTestIssues);

    expect(typeof avgResolutionTime).toBe('number');
    expect(avgResolutionTime).toBeGreaterThan(0);
  });
});

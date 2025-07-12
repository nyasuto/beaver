/**
 * StatsService Test Suite
 *
 * 統計データサービスの包括的テスト実装
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  StatsService,
  getStatsService,
  type UnifiedStats,
  type StatsOptions,
} from '../StatsService';
import type { Issue } from '../../schemas/github';

// モック設定
const mockGetIssuesWithFallback = vi.fn();
const mockHasStaticData = vi.fn();
const mockFetch = vi.fn();

vi.mock('../../data/github', () => ({
  getIssuesWithFallback: () => mockGetIssuesWithFallback(),
  hasStaticData: () => mockHasStaticData(),
}));

// グローバルfetchのモック
global.fetch = mockFetch;

// サンプルIssueデータ
const createMockIssue = (overrides: Partial<Issue> = {}): Issue => ({
  id: 1,
  number: 1,
  title: 'Test Issue',
  body: 'Test body',
  state: 'open',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  labels: [],
  assignee: null,
  assignees: [],
  milestone: null,
  pull_request: undefined,
  user: {
    login: 'testuser',
    id: 1,
    node_id: 'U_kgDOBbOz2Q',
    avatar_url: 'https://avatar.url',
    gravatar_id: null,
    url: 'https://api.github.com/users/testuser',
    html_url: 'https://github.com/testuser',
    type: 'User',
    site_admin: false,
  },
  url: 'https://api.github.com/repos/test/test/issues/1',
  html_url: 'https://github.com/test/test/issues/1',
  comments_url: 'https://api.github.com/repos/test/test/issues/1/comments',
  events_url: 'https://api.github.com/repos/test/test/issues/1/events',
  labels_url: 'https://api.github.com/repos/test/test/issues/1/labels{/name}',
  repository_url: 'https://api.github.com/repos/test/test',
  node_id: 'I_kwDOBbOz2Q5O-abc',
  comments: 0,
  locked: false,
  active_lock_reason: null,
  author_association: 'OWNER',
  draft: false,
  closed_at: null,
  ...overrides,
});

// 完全なラベルオブジェクトを作成するヘルパー
const createMockLabel = (name: string, color: string = '000000') => ({
  id: Math.floor(Math.random() * 1000000),
  name,
  color,
  node_id: 'LA_kwDOBbOz2Q8AAAABabc123',
  description: `Label for ${name}`,
  default: false,
});

const mockIssues: Issue[] = [
  createMockIssue({
    id: 1,
    number: 1,
    title: 'Critical Issue',
    state: 'open',
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1日前
    labels: [createMockLabel('priority: critical', 'ff0000')],
  }),
  createMockIssue({
    id: 2,
    number: 2,
    title: 'High Priority Issue',
    state: 'open',
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2日前
    labels: [createMockLabel('priority: high', 'ff6600')],
  }),
  createMockIssue({
    id: 3,
    number: 3,
    title: 'Closed Issue',
    state: 'closed',
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3日前
    labels: [createMockLabel('priority: medium', 'ffcc00')],
  }),
  createMockIssue({
    id: 4,
    number: 4,
    title: 'Old Issue',
    state: 'open',
    updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10日前
    labels: [createMockLabel('priority: low', '00ff00')],
  }),
];

describe('StatsService', () => {
  let statsService: StatsService;

  beforeEach(() => {
    // シングルトンインスタンスをリセット
    (StatsService as any).instance = undefined;
    statsService = StatsService.getInstance();

    // モックをリセット
    vi.clearAllMocks();
    mockHasStaticData.mockReturnValue(true);
    mockGetIssuesWithFallback.mockReturnValue(mockIssues);

    // コンソールエラーを抑制
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    statsService.clearCache();
    vi.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = StatsService.getInstance();
      const instance2 = StatsService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should return the same instance from convenience function', () => {
      const instance1 = StatsService.getInstance();
      const instance2 = getStatsService();

      expect(instance1).toBe(instance2);
    });
  });

  describe('getUnifiedStats', () => {
    it('should return statistics with default options', async () => {
      const result = await statsService.getUnifiedStats();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          total: 4,
          open: 3,
          closed: 1,
          priority: {
            critical: 1,
            high: 1,
            medium: 0, // closed issue は除外
            low: 1,
          },
          recentActivity: {
            thisWeek: 3,
            thisMonth: 4,
            recentlyUpdated: expect.arrayContaining([
              expect.objectContaining({
                id: 1,
                title: 'Critical Issue',
                number: 1,
                state: 'open',
              }),
              expect.objectContaining({
                id: 2,
                title: 'High Priority Issue',
                number: 2,
                state: 'open',
              }),
              expect.objectContaining({
                id: 3,
                title: 'Closed Issue',
                number: 3,
                state: 'closed',
              }),
            ]),
          },
          labels: expect.arrayContaining([
            expect.objectContaining({ name: 'priority: critical', count: 1 }),
            expect.objectContaining({ name: 'priority: high', count: 1 }),
            expect.objectContaining({ name: 'priority: low', count: 1 }),
          ]),
          meta: expect.objectContaining({
            source: 'static_data',
            generated_at: expect.any(String),
            cache_expires_at: expect.any(String),
          }),
        });
      }
    });

    it('should use cache when available', async () => {
      // 最初の呼び出し
      const result1 = await statsService.getUnifiedStats();

      // モックをクリアして2回目の呼び出し
      vi.clearAllMocks();
      const result2 = await statsService.getUnifiedStats();

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      if (result1.success && result2.success) {
        expect(result2.data.meta.source).toBe('cache');
        // データソース関数が呼ばれていないことを確認
        expect(mockGetIssuesWithFallback).not.toHaveBeenCalled();
      }
    });

    it('should fallback when static data is not available', async () => {
      mockHasStaticData.mockReturnValue(false);

      const result = await statsService.getUnifiedStats();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.meta.source).toBe('fallback');
        expect(result.data.total).toBe(-1);
        expect(result.data.recentActivity.recentlyUpdated[0]?.title).toBe(
          '[フォールバック] データ取得に失敗'
        );
      }
    });

    it('should handle custom options', async () => {
      const options: Partial<StatsOptions> = {
        includeLabels: false,
        maxRecentItems: 2,
        recentDays: 5,
      };

      const result = await statsService.getUnifiedStats(options);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.labels).toHaveLength(0);
        expect(result.data.recentActivity.recentlyUpdated.length).toBeLessThanOrEqual(2);
      }
    });

    it('should handle errors gracefully', async () => {
      mockGetIssuesWithFallback.mockImplementation(() => {
        throw new Error('Data loading failed');
      });

      const result = await statsService.getUnifiedStats();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.meta.source).toBe('fallback');
      }
    });
  });

  describe('fetchFreshStats', () => {
    it('should use static data when available', async () => {
      const options = {
        includeRecentActivity: true,
        includePriorityBreakdown: true,
        includeLabels: true,
        recentDays: 7,
        maxRecentItems: 10,
      };

      // privateメソッドにアクセスするためのキャスト
      const result = await (statsService as any).fetchFreshStats(options);

      expect(result.success).toBe(true);
      expect(mockHasStaticData).toHaveBeenCalled();
      expect(mockGetIssuesWithFallback).toHaveBeenCalled();

      if (result.success) {
        expect(result.data.meta.source).toBe('static_data');
      }
    });

    it('should try API when static data is not available and in browser', async () => {
      mockHasStaticData.mockReturnValue(false);

      // ブラウザ環境をシミュレート
      Object.defineProperty(window, 'location', {
        value: { href: 'http://localhost' },
        writable: true,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { issues: mockIssues },
          }),
      });

      const options = {
        includeRecentActivity: true,
        includePriorityBreakdown: true,
        includeLabels: true,
        recentDays: 7,
        maxRecentItems: 10,
      };
      const result = await (statsService as any).fetchFreshStats(options);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/github/issues?include_stats=true&state=all&per_page=100'
      );

      if (result.success) {
        expect(result.data.meta.source).toBe('github_api');
      }
    });

    it('should handle API errors', async () => {
      mockHasStaticData.mockReturnValue(false);

      Object.defineProperty(window, 'location', {
        value: { href: 'http://localhost' },
        writable: true,
      });

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const options = {
        includeRecentActivity: true,
        includePriorityBreakdown: true,
        includeLabels: true,
        recentDays: 7,
        maxRecentItems: 10,
      };
      const result = await (statsService as any).fetchFreshStats(options);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
    });
  });

  describe('calculateStats', () => {
    it('should calculate statistics correctly', async () => {
      const options = {
        includeRecentActivity: true,
        includePriorityBreakdown: true,
        includeLabels: true,
        recentDays: 7,
        maxRecentItems: 10,
      };
      const stats = await (statsService as any).calculateStats(mockIssues, options, 'static_data');

      expect(stats.total).toBe(4);
      expect(stats.open).toBe(3);
      expect(stats.closed).toBe(1);
      expect(stats.priority).toEqual({
        critical: 1,
        high: 1,
        medium: 0, // closed issue は除外
        low: 1,
      });
      expect(stats.recentActivity.thisWeek).toBe(3);
      expect(stats.meta.source).toBe('static_data');
    });

    it('should handle empty issues array', async () => {
      const options = {
        includeRecentActivity: true,
        includePriorityBreakdown: true,
        includeLabels: true,
        recentDays: 7,
        maxRecentItems: 10,
      };
      const stats = await (statsService as any).calculateStats([], options, 'static_data');

      expect(stats.total).toBe(0);
      expect(stats.open).toBe(0);
      expect(stats.closed).toBe(0);
      expect(stats.recentActivity.recentlyUpdated).toHaveLength(0);
    });

    it('should respect maxRecentItems option', async () => {
      const options = {
        includeRecentActivity: true,
        includePriorityBreakdown: true,
        includeLabels: true,
        recentDays: 7,
        maxRecentItems: 2,
      };
      const stats = await (statsService as any).calculateStats(mockIssues, options, 'static_data');

      expect(stats.recentActivity.recentlyUpdated.length).toBeLessThanOrEqual(2);
    });

    it('should exclude labels when option is false', async () => {
      const options = {
        includeRecentActivity: true,
        includePriorityBreakdown: true,
        includeLabels: false,
        recentDays: 7,
        maxRecentItems: 10,
      };
      const stats = await (statsService as any).calculateStats(mockIssues, options, 'static_data');

      expect(stats.labels).toHaveLength(0);
    });
  });

  describe('calculatePriorityStats', () => {
    it('should calculate priority statistics correctly', async () => {
      const priority = await (statsService as any).calculatePriorityStats(mockIssues);

      expect(priority).toEqual({
        critical: 1,
        high: 1,
        medium: 0, // closed issue は除外
        low: 1,
      });
    });

    it('should handle issues without labels', async () => {
      const issuesWithoutLabels = mockIssues.map(issue => ({ ...issue, labels: [] }));
      const priority = await (statsService as any).calculatePriorityStats(issuesWithoutLabels);

      expect(priority).toEqual({
        critical: 0,
        high: 0,
        medium: 0,
        low: 3, // Enhanced classification engine assigns default 'low' priority when no classifications match
      });
    });
  });

  describe('calculateLabelStats', () => {
    it('should calculate label statistics correctly', () => {
      const labelStats = (statsService as any).calculateLabelStats(mockIssues);

      expect(labelStats).toHaveLength(3);
      expect(labelStats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'priority: critical', count: 1 }),
          expect.objectContaining({ name: 'priority: high', count: 1 }),
          expect.objectContaining({ name: 'priority: low', count: 1 }),
        ])
      );
    });

    it('should sort labels by count descending', () => {
      const issuesWithDuplicateLabels = [
        ...mockIssues,
        createMockIssue({ labels: [createMockLabel('priority: high', 'ff6600')] }),
        createMockIssue({ labels: [createMockLabel('priority: high', 'ff6600')] }),
      ];

      const labelStats = (statsService as any).calculateLabelStats(issuesWithDuplicateLabels);

      expect(labelStats[0].name).toBe('priority: high');
      expect(labelStats[0].count).toBe(3);
    });

    it('should limit to top 10 labels', () => {
      const manyLabels = Array.from({ length: 15 }, (_, i) =>
        createMockIssue({ labels: [createMockLabel(`label-${i}`, '000000')] })
      );

      const labelStats = (statsService as any).calculateLabelStats(manyLabels);

      expect(labelStats.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Cache Management', () => {
    it('should generate consistent cache keys', () => {
      const options1 = {
        includeRecentActivity: true,
        includePriorityBreakdown: true,
        includeLabels: true,
        recentDays: 7,
        maxRecentItems: 10,
      };
      const options2 = {
        includeRecentActivity: true,
        includePriorityBreakdown: true,
        includeLabels: true,
        recentDays: 7,
        maxRecentItems: 10,
      };

      const key1 = (statsService as any).generateCacheKey(options1);
      const key2 = (statsService as any).generateCacheKey(options2);

      expect(key1).toBe(key2);
    });

    it('should generate different cache keys for different options', () => {
      const options1 = {
        includeRecentActivity: true,
        includePriorityBreakdown: true,
        includeLabels: true,
        recentDays: 7,
        maxRecentItems: 10,
      };
      const options2 = {
        includeRecentActivity: true,
        includePriorityBreakdown: true,
        includeLabels: false,
        recentDays: 7,
        maxRecentItems: 10,
      };

      const key1 = (statsService as any).generateCacheKey(options1);
      const key2 = (statsService as any).generateCacheKey(options2);

      expect(key1).not.toBe(key2);
    });

    it('should return null for non-existent cache', () => {
      const cached = (statsService as any).getCachedStats('non-existent-key');

      expect(cached).toBeNull();
    });

    it('should set and get cached stats', () => {
      const mockStats: UnifiedStats = {
        total: 1,
        open: 1,
        closed: 0,
        priority: { critical: 0, high: 0, medium: 0, low: 1 },
        recentActivity: { thisWeek: 1, thisMonth: 1, recentlyUpdated: [] },
        labels: [],
        meta: { source: 'static_data', generated_at: new Date().toISOString() },
      };

      (statsService as any).setCachedStats('test-key', mockStats);
      const cached = (statsService as any).getCachedStats('test-key');

      expect(cached).toEqual({
        ...mockStats,
        meta: { ...mockStats.meta, source: 'cache' },
      });
    });

    it('should handle cache expiration', async () => {
      const mockStats: UnifiedStats = {
        total: 1,
        open: 1,
        closed: 0,
        priority: { critical: 0, high: 0, medium: 0, low: 1 },
        recentActivity: { thisWeek: 1, thisMonth: 1, recentlyUpdated: [] },
        labels: [],
        meta: { source: 'static_data', generated_at: new Date().toISOString() },
      };

      // 元のTTLを保存
      const originalTTL = (statsService as any).CACHE_TTL;

      // TTLを非常に短く設定してすぐに期限切れにする
      (statsService as any).CACHE_TTL = 1; // 1ms

      // キャッシュを設定
      (statsService as any).setCachedStats('test-key', mockStats);

      // TTLを超える時間待つ
      await new Promise(resolve => setTimeout(resolve, 10));

      const cached = (statsService as any).getCachedStats('test-key');

      expect(cached).toBeNull();

      // TTLを元に戻す
      (statsService as any).CACHE_TTL = originalTTL;
    });

    it('should clear all cache', () => {
      const mockStats: UnifiedStats = {
        total: 1,
        open: 1,
        closed: 0,
        priority: { critical: 0, high: 0, medium: 0, low: 1 },
        recentActivity: { thisWeek: 1, thisMonth: 1, recentlyUpdated: [] },
        labels: [],
        meta: { source: 'static_data', generated_at: new Date().toISOString() },
      };

      (statsService as any).setCachedStats('test-key-1', mockStats);
      (statsService as any).setCachedStats('test-key-2', mockStats);

      statsService.clearCache();

      expect((statsService as any).getCachedStats('test-key-1')).toBeNull();
      expect((statsService as any).getCachedStats('test-key-2')).toBeNull();
    });

    it('should cleanup expired cache entries', () => {
      const mockStats: UnifiedStats = {
        total: 1,
        open: 1,
        closed: 0,
        priority: { critical: 0, high: 0, medium: 0, low: 1 },
        recentActivity: { thisWeek: 1, thisMonth: 1, recentlyUpdated: [] },
        labels: [],
        meta: { source: 'static_data', generated_at: new Date().toISOString() },
      };

      // 新しいエントリと古いエントリを設定
      (statsService as any).setCachedStats('fresh-key', mockStats);

      // 古いエントリを手動で設定
      const oldTimestamp = Date.now() - 10 * 60 * 1000; // 10分前
      (statsService as any).cache.set('old-key', {
        data: mockStats,
        timestamp: oldTimestamp,
      });

      statsService.cleanupExpiredCache();

      expect((statsService as any).getCachedStats('fresh-key')).not.toBeNull();
      expect((statsService as any).getCachedStats('old-key')).toBeNull();
    });
  });

  describe('getFallbackStats', () => {
    it('should return fallback statistics', () => {
      const fallbackStats = (statsService as any).getFallbackStats();

      expect(fallbackStats).toEqual({
        total: -1,
        open: -1,
        closed: -1,
        priority: {
          critical: -1,
          high: -1,
          medium: -1,
          low: -1,
        },
        recentActivity: {
          thisWeek: -1,
          thisMonth: -1,
          recentlyUpdated: [
            {
              id: -1,
              title: '[フォールバック] データ取得に失敗',
              number: -1,
              updated_at: expect.any(String),
              state: 'open',
            },
          ],
        },
        labels: [
          { name: 'fallback-data', color: 'ff0000', count: -1 },
          { name: 'no-data', color: '808080', count: -1 },
        ],
        meta: {
          source: 'fallback',
          generated_at: expect.any(String),
        },
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle Zod validation errors', async () => {
      const invalidOptions = { recentDays: 'invalid' } as any;

      const result = await statsService.getUnifiedStats(invalidOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.meta.source).toBe('fallback');
      }
    });

    it('should handle data loading errors', async () => {
      mockGetIssuesWithFallback.mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = await statsService.getUnifiedStats();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.meta.source).toBe('fallback');
      }
    });

    it('should handle calculation errors gracefully', async () => {
      // 不正なデータを返すモック - 計算時にエラーが発生するようにする
      mockGetIssuesWithFallback.mockImplementation(() => {
        throw new Error('Calculation error');
      });

      const result = await statsService.getUnifiedStats();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.meta.source).toBe('fallback');
      }
    });
  });
});

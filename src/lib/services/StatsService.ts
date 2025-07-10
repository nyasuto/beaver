/**
 * 統一された統計データ取得サービス
 *
 * 複数のコンポーネント間でのデータの整合性を保つため、
 * 統一されたデータ取得とキャッシュ機能を提供します。
 */

import { z } from 'zod';
import type { Issue } from '../schemas/github';
import type { Result } from '../types';
import { getIssuesWithFallback, hasStaticData } from '../data/github';

// 統計データの型定義
export const UnifiedStatsSchema = z.object({
  total: z.number(),
  open: z.number(),
  closed: z.number(),
  priority: z.object({
    critical: z.number(),
    high: z.number(),
    medium: z.number(),
    low: z.number(),
  }),
  recentActivity: z.object({
    thisWeek: z.number(),
    thisMonth: z.number(),
    recentlyUpdated: z.array(
      z.object({
        id: z.number(),
        title: z.string(),
        number: z.number(),
        updated_at: z.string(),
        state: z.enum(['open', 'closed']),
      })
    ),
  }),
  labels: z.array(
    z.object({
      name: z.string(),
      color: z.string(),
      count: z.number(),
    })
  ),
  meta: z.object({
    source: z.enum(['github_api', 'static_data', 'fallback', 'cache']),
    generated_at: z.string(),
    cache_expires_at: z.string().optional(),
  }),
});

export type UnifiedStats = z.infer<typeof UnifiedStatsSchema>;

// 統計オプション
export const StatsOptionsSchema = z.object({
  includeRecentActivity: z.boolean().default(true),
  includePriorityBreakdown: z.boolean().default(true),
  includeLabels: z.boolean().default(true),
  recentDays: z.number().default(7),
  maxRecentItems: z.number().default(10),
});

export type StatsOptions = z.infer<typeof StatsOptionsSchema>;

// キャッシュエントリ
interface CacheEntry {
  data: UnifiedStats;
  timestamp: number;
}

/**
 * 統計データサービス
 * シングルトンパターンでインスタンスを管理
 */
export class StatsService {
  private static instance: StatsService;
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分

  private constructor() {}

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): StatsService {
    if (!StatsService.instance) {
      StatsService.instance = new StatsService();
    }
    return StatsService.instance;
  }

  /**
   * 統一された統計データを取得
   */
  async getUnifiedStats(options: Partial<StatsOptions> = {}): Promise<Result<UnifiedStats>> {
    try {
      const validatedOptions = StatsOptionsSchema.parse(options);
      const cacheKey = this.generateCacheKey(validatedOptions);

      // キャッシュチェック
      const cached = this.getCachedStats(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      // 新しいデータを取得
      const statsResult = await this.fetchFreshStats(validatedOptions);

      if (statsResult.success) {
        // キャッシュに保存
        this.setCachedStats(cacheKey, statsResult.data);
        return statsResult;
      }

      // APIが失敗した場合はフォールバックデータを使用
      const fallbackStats = this.getFallbackStats();
      return { success: true, data: fallbackStats };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('統計データ取得エラー:', error);
      const fallbackStats = this.getFallbackStats();
      return { success: true, data: fallbackStats };
    }
  }

  /**
   * 新しい統計データを取得
   */
  private async fetchFreshStats(options: StatsOptions): Promise<Result<UnifiedStats>> {
    try {
      // まず静的データを試行
      if (hasStaticData()) {
        const issues = getIssuesWithFallback();
        const stats = this.calculateStats(issues, options, 'static_data');
        return { success: true, data: stats };
      }

      // 静的データが利用できない場合のみAPIを試行
      // Note: ビルド時にはAPIが利用できないため、通常はここは実行されない
      if (typeof window !== 'undefined' && window.location) {
        const response = await fetch(
          '/api/github/issues?include_stats=true&state=all&per_page=100'
        );

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error?.message || 'API returned unsuccessful response');
        }

        const issues: Issue[] = data.data?.issues || [];
        const stats = this.calculateStats(issues, options, 'github_api');
        return { success: true, data: stats };
      }

      throw new Error('No data source available');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('新しい統計データの取得に失敗:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * 統計データを計算
   */
  private calculateStats(
    issues: Issue[],
    options: StatsOptions,
    source: 'github_api' | 'static_data' = 'github_api'
  ): UnifiedStats {
    const now = new Date();
    const recentCutoff = new Date(now.getTime() - options.recentDays * 24 * 60 * 60 * 1000);
    const monthCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 基本統計
    const total = issues.length;
    const open = issues.filter(issue => issue.state === 'open').length;
    const closed = issues.filter(issue => issue.state === 'closed').length;

    // 優先度統計
    const priority = this.calculatePriorityStats(issues);

    // 最近の活動
    const recentlyUpdated = issues
      .filter(issue => new Date(issue.updated_at) >= recentCutoff)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, options.maxRecentItems)
      .map(issue => ({
        id: issue.id,
        title: issue.title,
        number: issue.number,
        updated_at: issue.updated_at,
        state: issue.state,
      }));

    const thisWeek = issues.filter(issue => new Date(issue.updated_at) >= recentCutoff).length;

    const thisMonth = issues.filter(issue => new Date(issue.updated_at) >= monthCutoff).length;

    // ラベル統計
    const labels = this.calculateLabelStats(issues);

    return {
      total,
      open,
      closed,
      priority,
      recentActivity: {
        thisWeek,
        thisMonth,
        recentlyUpdated,
      },
      labels: options.includeLabels ? labels : [],
      meta: {
        source,
        generated_at: now.toISOString(),
        cache_expires_at: new Date(now.getTime() + this.CACHE_TTL).toISOString(),
      },
    };
  }

  /**
   * 優先度統計を計算
   */
  private calculatePriorityStats(issues: Issue[]): UnifiedStats['priority'] {
    const priority = { critical: 0, high: 0, medium: 0, low: 0 };

    // オープンな issue のみを対象にする
    issues
      .filter(issue => issue.state === 'open')
      .forEach(issue => {
        const priorityLevel = this.extractPriorityFromLabels(issue.labels || []);
        priority[priorityLevel]++;
      });

    return priority;
  }

  /**
   * ラベルから優先度を抽出
   */
  private extractPriorityFromLabels(
    labels: Array<{ name: string }>
  ): keyof UnifiedStats['priority'] {
    const labelNames = labels.map(label => label.name.toLowerCase());

    if (
      labelNames.some(
        name =>
          name.includes('priority: critical') ||
          name.includes('critical') ||
          name.includes('urgent')
      )
    ) {
      return 'critical';
    }
    if (
      labelNames.some(
        name =>
          name.includes('priority: high') || name.includes('high') || name.includes('important')
      )
    ) {
      return 'high';
    }
    if (
      labelNames.some(
        name =>
          name.includes('priority: medium') || name.includes('medium') || name.includes('normal')
      )
    ) {
      return 'medium';
    }
    if (labelNames.some(name => name.includes('priority: low') || name.includes('low'))) {
      return 'low';
    }
    return 'low';
  }

  /**
   * ラベル統計を計算
   */
  private calculateLabelStats(issues: Issue[]): UnifiedStats['labels'] {
    const labelCounts = new Map<string, { color: string; count: number }>();

    issues.forEach(issue => {
      (issue.labels || []).forEach(label => {
        const existing = labelCounts.get(label.name);
        labelCounts.set(label.name, {
          color: label.color,
          count: (existing?.count || 0) + 1,
        });
      });
    });

    return Array.from(labelCounts.entries())
      .map(([name, { color, count }]) => ({ name, color, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // 上位10ラベル
  }

  /**
   * フォールバックデータを取得
   */
  private getFallbackStats(): UnifiedStats {
    const now = new Date();

    return {
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
            updated_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
            state: 'open' as const,
          },
        ],
      },
      labels: [
        { name: 'fallback-data', color: 'ff0000', count: -1 },
        { name: 'no-data', color: '808080', count: -1 },
      ],
      meta: {
        source: 'fallback',
        generated_at: now.toISOString(),
      },
    };
  }

  /**
   * キャッシュキーを生成
   */
  private generateCacheKey(options: StatsOptions): string {
    return JSON.stringify(options);
  }

  /**
   * キャッシュされた統計データを取得
   */
  private getCachedStats(cacheKey: string): UnifiedStats | null {
    const cached = this.cache.get(cacheKey);

    if (!cached) {
      return null;
    }

    const isExpired = Date.now() - cached.timestamp > this.CACHE_TTL;
    if (isExpired) {
      this.cache.delete(cacheKey);
      return null;
    }

    // キャッシュからのデータであることをメタデータで示す
    return {
      ...cached.data,
      meta: {
        ...cached.data.meta,
        source: 'cache',
      },
    };
  }

  /**
   * キャッシュに統計データを保存
   */
  private setCachedStats(cacheKey: string, stats: UnifiedStats): void {
    this.cache.set(cacheKey, {
      data: stats,
      timestamp: Date.now(),
    });
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 期限切れのキャッシュエントリを削除
   */
  cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * 統計サービスのインスタンスを取得する便利関数
 */
export function getStatsService(): StatsService {
  return StatsService.getInstance();
}

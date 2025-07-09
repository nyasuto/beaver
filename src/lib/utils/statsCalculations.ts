/**
 * 統計計算ユーティリティ
 *
 * 複数のコンポーネント間で統一された統計計算を提供します。
 * データの整合性を保つため、すべての統計計算はここで行います。
 */

import type { Issue } from '../schemas/github';

/**
 * 優先度統計の型定義
 */
export interface PriorityStats {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

/**
 * 時系列統計の型定義
 */
export interface TimeSeriesStats {
  daily: Array<{
    date: string;
    count: number;
  }>;
  weekly: Array<{
    week: string;
    count: number;
  }>;
  monthly: Array<{
    month: string;
    count: number;
  }>;
}

/**
 * ラベル統計の型定義
 */
export interface LabelStats {
  name: string;
  color: string;
  count: number;
  percentage: number;
}

/**
 * 統計計算クラス
 */
export class StatsCalculations {
  /**
   * 優先度別統計を計算
   */
  static calculatePriorityStats(issues: Issue[]): PriorityStats {
    const priorities: PriorityStats = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    issues.forEach(issue => {
      const priority = this.extractPriorityFromLabels(issue.labels || []);
      priorities[priority]++;
    });

    return priorities;
  }

  /**
   * ラベルから優先度を抽出
   */
  static extractPriorityFromLabels(labels: Array<{ name: string }>): keyof PriorityStats {
    const labelNames = labels.map(label => label.name.toLowerCase());

    // Critical priority keywords
    if (
      labelNames.some(
        name =>
          name.includes('critical') ||
          name.includes('urgent') ||
          name.includes('blocker') ||
          name.includes('severity:critical') ||
          name.includes('priority:critical')
      )
    ) {
      return 'critical';
    }

    // High priority keywords
    if (
      labelNames.some(
        name =>
          name.includes('high') ||
          name.includes('important') ||
          name.includes('severity:high') ||
          name.includes('priority:high')
      )
    ) {
      return 'high';
    }

    // Medium priority keywords
    if (
      labelNames.some(
        name =>
          name.includes('medium') ||
          name.includes('normal') ||
          name.includes('severity:medium') ||
          name.includes('priority:medium')
      )
    ) {
      return 'medium';
    }

    // Default to low priority
    return 'low';
  }

  /**
   * 最近の活動（指定日数内）を計算
   */
  static calculateRecentActivity(issues: Issue[], daysBack: number = 7): number {
    const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    return issues.filter(issue => {
      const updatedAt = new Date(issue.updated_at);
      return updatedAt >= cutoffDate;
    }).length;
  }

  /**
   * 期間内に作成されたissueの数を計算
   */
  static calculateCreatedInPeriod(issues: Issue[], daysBack: number = 7): number {
    const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    return issues.filter(issue => {
      const createdAt = new Date(issue.created_at);
      return createdAt >= cutoffDate;
    }).length;
  }

  /**
   * 期間内にクローズされたissueの数を計算
   */
  static calculateClosedInPeriod(issues: Issue[], daysBack: number = 7): number {
    const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    return issues.filter(issue => {
      if (issue.state !== 'closed' || !issue.closed_at) {
        return false;
      }
      const closedAt = new Date(issue.closed_at);
      return closedAt >= cutoffDate;
    }).length;
  }

  /**
   * 平均解決時間を計算（時間単位）
   */
  static calculateAverageResolutionTime(issues: Issue[]): number {
    const closedIssues = issues.filter(issue => issue.state === 'closed' && issue.closed_at);

    if (closedIssues.length === 0) {
      return 0;
    }

    const totalResolutionTime = closedIssues.reduce((total, issue) => {
      const createdAt = new Date(issue.created_at).getTime();
      const closedAt = new Date(issue.closed_at!).getTime();
      return total + (closedAt - createdAt);
    }, 0);

    // ミリ秒から時間に変換
    return Math.round(totalResolutionTime / closedIssues.length / (1000 * 60 * 60));
  }

  /**
   * ラベル統計を計算
   */
  static calculateLabelStats(issues: Issue[]): LabelStats[] {
    const labelCounts = new Map<string, { color: string; count: number }>();
    const totalIssues = issues.length;

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
      .map(([name, { color, count }]) => ({
        name,
        color,
        count,
        percentage: totalIssues > 0 ? Math.round((count / totalIssues) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * 時系列統計を計算
   */
  static calculateTimeSeriesStats(issues: Issue[], daysBack: number = 30): TimeSeriesStats {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    // 日別統計
    const dailyStats = new Map<string, number>();
    for (let i = 0; i < daysBack; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      if (dateKey) {
        dailyStats.set(dateKey, 0);
      }
    }

    // Issue作成日でカウント
    issues
      .filter(issue => new Date(issue.created_at) >= cutoffDate)
      .forEach(issue => {
        const dateKey = issue.created_at.split('T')[0];
        if (dateKey) {
          const currentCount = dailyStats.get(dateKey) || 0;
          dailyStats.set(dateKey, currentCount + 1);
        }
      });

    // 週別統計（過去4週間）
    const weeklyStats = new Map<string, number>();
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(now.getTime() - (i * 7 + 6) * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const weekKey = `${weekStart.toISOString().split('T')[0]} - ${weekEnd.toISOString().split('T')[0]}`;

      const weekCount = issues.filter(issue => {
        const createdAt = new Date(issue.created_at);
        return createdAt >= weekStart && createdAt <= weekEnd;
      }).length;

      weeklyStats.set(weekKey, weekCount);
    }

    // 月別統計（過去6ヶ月）
    const monthlyStats = new Map<string, number>();
    for (let i = 0; i < 6; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthKey = monthDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });

      const monthCount = issues.filter(issue => {
        const createdAt = new Date(issue.created_at);
        return createdAt >= monthDate && createdAt < nextMonthDate;
      }).length;

      monthlyStats.set(monthKey, monthCount);
    }

    return {
      daily: Array.from(dailyStats.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      weekly: Array.from(weeklyStats.entries())
        .map(([week, count]) => ({ week, count }))
        .reverse(),
      monthly: Array.from(monthlyStats.entries())
        .map(([month, count]) => ({ month, count }))
        .reverse(),
    };
  }

  /**
   * 担当者別統計を計算
   */
  static calculateAssigneeStats(issues: Issue[]): Array<{
    assignee: string;
    avatar_url?: string;
    count: number;
    openCount: number;
    closedCount: number;
  }> {
    const assigneeStats = new Map<
      string,
      {
        avatar_url?: string;
        count: number;
        openCount: number;
        closedCount: number;
      }
    >();

    issues.forEach(issue => {
      if (issue.assignee) {
        const assigneeName = issue.assignee.login;
        const existing = assigneeStats.get(assigneeName) || {
          avatar_url: issue.assignee.avatar_url,
          count: 0,
          openCount: 0,
          closedCount: 0,
        };

        existing.count++;
        if (issue.state === 'open') {
          existing.openCount++;
        } else {
          existing.closedCount++;
        }

        assigneeStats.set(assigneeName, existing);
      }
    });

    return Array.from(assigneeStats.entries())
      .map(([assignee, stats]) => ({
        assignee,
        ...stats,
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * 健康度スコアを計算
   */
  static calculateHealthScore(issues: Issue[]): number {
    if (issues.length === 0) {
      return 100;
    }

    const total = issues.length;
    const open = issues.filter(issue => issue.state === 'open').length;
    const critical = this.calculatePriorityStats(issues).critical;
    const recentActivity = this.calculateRecentActivity(issues, 7);
    const avgResolutionTime = this.calculateAverageResolutionTime(issues);

    // スコア計算のウェイト
    let score = 100;

    // オープンな Issue の割合（多すぎると減点）
    const openRatio = open / total;
    if (openRatio > 0.7) {
      score -= (openRatio - 0.7) * 100; // 70%を超えると減点
    }

    // クリティカルな Issue の存在（大幅減点）
    score -= critical * 20;

    // 最近の活動がない場合（減点）
    if (recentActivity === 0 && open > 0) {
      score -= 15;
    }

    // 平均解決時間が長い場合（減点）
    if (avgResolutionTime > 168) {
      // 1週間以上
      score -= Math.min((avgResolutionTime - 168) / 24, 20); // 最大20点減点
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * トレンド分析を実行
   */
  static calculateTrend(
    issues: Issue[],
    days: number = 30
  ): {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
    description: string;
  } {
    const now = new Date();
    const midpoint = new Date(now.getTime() - (days / 2) * 24 * 60 * 60 * 1000);
    const startpoint = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const recentHalf = issues.filter(issue => new Date(issue.created_at) >= midpoint).length;

    const earlierHalf = issues.filter(issue => {
      const createdAt = new Date(issue.created_at);
      return createdAt >= startpoint && createdAt < midpoint;
    }).length;

    if (earlierHalf === 0) {
      return {
        direction: 'stable',
        percentage: 0,
        description: 'データが不足しています',
      };
    }

    const percentageChange = ((recentHalf - earlierHalf) / earlierHalf) * 100;
    const absChange = Math.abs(percentageChange);

    let direction: 'up' | 'down' | 'stable';
    if (absChange < 10) {
      direction = 'stable';
    } else if (percentageChange > 0) {
      direction = 'up';
    } else {
      direction = 'down';
    }

    const description =
      direction === 'stable'
        ? '安定しています'
        : direction === 'up'
          ? `${absChange.toFixed(1)}% 増加`
          : `${absChange.toFixed(1)}% 減少`;

    return {
      direction,
      percentage: Math.round(absChange),
      description,
    };
  }
}

/**
 * 便利関数：基本統計を一度に計算
 */
export function calculateBasicStats(issues: Issue[]) {
  return {
    total: issues.length,
    open: issues.filter(issue => issue.state === 'open').length,
    closed: issues.filter(issue => issue.state === 'closed').length,
    priority: StatsCalculations.calculatePriorityStats(issues),
    recentActivity: StatsCalculations.calculateRecentActivity(issues),
    healthScore: StatsCalculations.calculateHealthScore(issues),
    trend: StatsCalculations.calculateTrend(issues),
  };
}

/**
 * 便利関数：詳細統計を一度に計算
 */
export function calculateDetailedStats(issues: Issue[]) {
  return {
    ...calculateBasicStats(issues),
    labels: StatsCalculations.calculateLabelStats(issues),
    timeSeries: StatsCalculations.calculateTimeSeriesStats(issues),
    assignees: StatsCalculations.calculateAssigneeStats(issues),
    averageResolutionTime: StatsCalculations.calculateAverageResolutionTime(issues),
    createdThisWeek: StatsCalculations.calculateCreatedInPeriod(issues, 7),
    closedThisWeek: StatsCalculations.calculateClosedInPeriod(issues, 7),
  };
}

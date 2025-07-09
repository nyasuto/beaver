/**
 * データアダプター
 *
 * Analytics エンジンの出力をChart.js用のデータ形式に変換するユーティリティ
 */

import type { ChartData } from 'chart.js';
import type { TimeSeriesPoint, PerformanceMetrics } from './engine';
import type { Issue } from '../schemas/github';

/**
 * Chart.js用の色パレット
 */
export const CHART_COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  accent: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
  pink: '#EC4899',
  cyan: '#06B6D4',
  gray: '#6B7280',
} as const;

/**
 * 背景色とボーダー色のペア
 */
export const COLOR_PAIRS = [
  { background: '#3B82F680', border: '#3B82F6' },
  { background: '#10B98180', border: '#10B981' },
  { background: '#F59E0B80', border: '#F59E0B' },
  { background: '#EF444480', border: '#EF4444' },
  { background: '#8B5CF680', border: '#8B5CF6' },
  { background: '#EC489980', border: '#EC4899' },
  { background: '#06B6D480', border: '#06B6D4' },
  { background: '#6B728080', border: '#6B7280' },
];

/**
 * Issue トレンドデータをChart.js形式に変換
 */
export function convertIssuesTrendData(
  timeSeriesData: TimeSeriesPoint[],
  title: string = 'Issue Trends'
): ChartData<'line'> {
  return {
    labels: timeSeriesData.map(point =>
      point.timestamp.toLocaleDateString('ja-JP', {
        month: 'short',
        day: 'numeric',
      })
    ),
    datasets: [
      {
        label: title,
        data: timeSeriesData.map(point => point.value),
        borderColor: CHART_COLORS.primary,
        backgroundColor: `${CHART_COLORS.primary}20`,
        fill: true,
        tension: 0.4,
      },
    ],
  };
}

/**
 * Issue 分類データを円グラフ用に変換
 */
export function convertCategoriesData(
  issues: Issue[],
  title: string = 'Issue Categories'
): ChartData<'doughnut'> {
  // ラベル別の集計
  const labelCounts = issues.reduce(
    (acc, issue) => {
      issue.labels.forEach(label => {
        acc[label.name] = (acc[label.name] || 0) + 1;
      });
      return acc;
    },
    {} as Record<string, number>
  );

  // 上位8カテゴリを抽出
  const sortedLabels = Object.entries(labelCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  return {
    labels: sortedLabels.map(([label]) => label),
    datasets: [
      {
        label: title,
        data: sortedLabels.map(([, count]) => count),
        backgroundColor: COLOR_PAIRS.slice(0, sortedLabels.length).map(c => c.background),
        borderColor: COLOR_PAIRS.slice(0, sortedLabels.length).map(c => c.border),
        borderWidth: 2,
      },
    ],
  };
}

/**
 * 解決時間データを棒グラフ用に変換
 */
export function convertResolutionTimeData(
  _performanceMetrics: PerformanceMetrics,
  issues: Issue[]
): ChartData<'bar'> {
  // 週別の解決時間を計算
  const closedIssues = issues.filter(issue => issue.state === 'closed' && issue.closed_at);

  // 過去8週間のデータを生成
  const weeks: { label: string; avgTime: number }[] = [];
  const now = new Date();

  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const weekIssues = closedIssues.filter(issue => {
      const closedDate = new Date(issue.closed_at!);
      return closedDate >= weekStart && closedDate < weekEnd;
    });

    const avgTime =
      weekIssues.length > 0
        ? weekIssues.reduce((sum, issue) => {
            const created = new Date(issue.created_at);
            const closed = new Date(issue.closed_at!);
            return sum + (closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
          }, 0) / weekIssues.length
        : 0;

    weeks.push({
      label: weekStart.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
      avgTime: Math.round(avgTime * 10) / 10,
    });
  }

  return {
    labels: weeks.map(w => w.label),
    datasets: [
      {
        label: 'Average Resolution Time (days)',
        data: weeks.map(w => w.avgTime),
        backgroundColor: CHART_COLORS.secondary + '80',
        borderColor: CHART_COLORS.secondary,
        borderWidth: 2,
      },
    ],
  };
}

/**
 * コントリビューターアクティビティデータを変換
 */
export function convertContributorData(issues: Issue[]): ChartData<'bar'> {
  // ユーザー別のIssue作成・参加数を集計
  const userActivity = issues.reduce(
    (acc, issue) => {
      const user = issue.user?.login || 'Unknown';
      if (!acc[user]) {
        acc[user] = { created: 0, total: 0 };
      }
      acc[user].created++;
      acc[user].total++;
      return acc;
    },
    {} as Record<string, { created: number; total: number }>
  );

  // 上位10ユーザーを抽出
  const topUsers = Object.entries(userActivity)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 10);

  return {
    labels: topUsers.map(([user]) => user),
    datasets: [
      {
        label: 'Issues Created',
        data: topUsers.map(([, activity]) => activity.created),
        backgroundColor: CHART_COLORS.primary + '80',
        borderColor: CHART_COLORS.primary,
        borderWidth: 2,
      },
    ],
  };
}

/**
 * 統計メトリクスを計算
 */
export interface AnalyticsMetrics {
  totalIssues: number;
  openIssues: number;
  closedIssues: number;
  averageResolutionTime: string;
  topLabels: Array<{ name: string; count: number }>;
  topContributors: Array<{ name: string; count: number }>;
}

export function calculateMetrics(issues: Issue[]): AnalyticsMetrics {
  const openIssues = issues.filter(issue => issue.state === 'open');
  const closedIssues = issues.filter(issue => issue.state === 'closed' && issue.closed_at);

  // 平均解決時間を計算
  const avgResolutionMs =
    closedIssues.length > 0
      ? closedIssues.reduce((sum, issue) => {
          const created = new Date(issue.created_at);
          const closed = new Date(issue.closed_at!);
          return sum + (closed.getTime() - created.getTime());
        }, 0) / closedIssues.length
      : 0;

  const avgResolutionDays = avgResolutionMs / (1000 * 60 * 60 * 24);

  // ラベル集計
  const labelCounts = issues.reduce(
    (acc, issue) => {
      issue.labels.forEach(label => {
        acc[label.name] = (acc[label.name] || 0) + 1;
      });
      return acc;
    },
    {} as Record<string, number>
  );

  const topLabels = Object.entries(labelCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // コントリビューター集計
  const contributorCounts = issues.reduce(
    (acc, issue) => {
      const user = issue.user?.login || 'Unknown';
      acc[user] = (acc[user] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const topContributors = Object.entries(contributorCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return {
    totalIssues: issues.length,
    openIssues: openIssues.length,
    closedIssues: closedIssues.length,
    averageResolutionTime: avgResolutionDays > 0 ? `${avgResolutionDays.toFixed(1)}d` : 'N/A',
    topLabels,
    topContributors,
  };
}

/**
 * 最近のアクティビティを生成
 */
export interface ActivityItem {
  type: 'opened' | 'closed' | 'labeled';
  issue: Issue;
  timestamp: Date;
  description: string;
}

export function generateRecentActivity(issues: Issue[]): ActivityItem[] {
  const activities: ActivityItem[] = [];

  // Issue作成イベント
  issues.forEach(issue => {
    activities.push({
      type: 'opened',
      issue,
      timestamp: new Date(issue.created_at),
      description: `Issue #${issue.number} was opened`,
    });

    // クローズイベント
    if (issue.state === 'closed' && issue.closed_at) {
      activities.push({
        type: 'closed',
        issue,
        timestamp: new Date(issue.closed_at),
        description: `Issue #${issue.number} was closed`,
      });
    }
  });

  // 最新10件を返す
  return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10);
}

/**
 * 時間差を人間が読みやすい形式に変換
 */
export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) {
    return `${diffMins} minutes ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hours ago`;
  } else {
    return `${diffDays} days ago`;
  }
}

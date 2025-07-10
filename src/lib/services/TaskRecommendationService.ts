/**
 * Task Recommendation Service
 *
 * Provides intelligent task recommendations based on issue classification and scoring.
 * This service analyzes GitHub issues and suggests the top priority tasks for the dashboard.
 */

import type { Issue } from '../schemas/github';
import type { TaskScore } from '../classification/engine';
import { getClassificationEngine } from '../classification/config-loader';

export interface TaskRecommendation {
  taskId: string;
  title: string;
  description: string;
  score: number;
  priority: string;
  category: string;
  confidence: number;
  estimatedEffort: 'low' | 'medium' | 'high';
  tags: string[];
  url: string;
  createdAt: string;
  reasons: string[];
}

export interface DashboardTasksResult {
  topTasks: TaskRecommendation[];
  totalOpenIssues: number;
  analysisMetrics: {
    averageScore: number;
    processingTimeMs: number;
    categoriesFound: string[];
    priorityDistribution: Record<string, number>;
  };
  lastUpdated: string;
}

export class TaskRecommendationService {
  /**
   * Get top task recommendations for the dashboard
   */
  static async getTopTasksForDashboard(
    issues: Issue[],
    limit: number = 3
  ): Promise<DashboardTasksResult> {
    const startTime = Date.now();

    try {
      // Get classification engine
      const engine = await getClassificationEngine();

      // Get top tasks using classification engine
      const result = engine.getTopTasks(issues, limit);

      // Convert to dashboard format
      const topTasks = result.tasks.map(this.convertToTaskRecommendation);

      // Calculate additional metrics
      const categoriesFound = [...new Set(result.tasks.map(task => task.category))];
      const priorityDistribution = this.calculatePriorityDistribution(result.tasks);

      const processingTime = Date.now() - startTime;

      return {
        topTasks,
        totalOpenIssues: result.totalAnalyzed,
        analysisMetrics: {
          averageScore: result.averageScore,
          processingTimeMs: result.processingTimeMs + processingTime,
          categoriesFound,
          priorityDistribution,
        },
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get task recommendations:', error);

      // Return fallback recommendations
      return this.getFallbackRecommendations(issues, limit);
    }
  }

  /**
   * Convert TaskScore to TaskRecommendation format
   */
  private static convertToTaskRecommendation(task: TaskScore): TaskRecommendation {
    return {
      taskId: `issue-${task.issueNumber}`,
      title: task.title,
      description: this.generateTaskDescription(task),
      score: task.score,
      priority: this.formatPriority(task.priority),
      category: this.formatCategory(task.category),
      confidence: Math.round(task.confidence * 100),
      estimatedEffort: this.estimateEffort(task),
      tags: this.generateTags(task),
      url: task.url || `/issues/${task.issueNumber}`,
      createdAt: task.createdAt,
      reasons: task.reasons.slice(0, 3), // Limit to top 3 reasons
    };
  }

  /**
   * Generate a concise task description
   */
  private static generateTaskDescription(task: TaskScore): string {
    const body = task.body || '';

    // Extract first sentence or first 120 characters
    const firstSentence = body.split('.')[0];
    const description =
      firstSentence && firstSentence.length > 0 && firstSentence.length < 120
        ? firstSentence
        : body.substring(0, 120);

    return description ? description.trim() + (body.length > 120 ? '...' : '') : '';
  }

  /**
   * Format priority for display
   */
  private static formatPriority(priority: string): string {
    const priorityMap: Record<string, string> = {
      critical: '🔴 緊急',
      high: '🟠 高',
      medium: '🟡 中',
      low: '🟢 低',
      backlog: '⚪ バックログ',
    };

    return priorityMap[priority] || '🟡 中';
  }

  /**
   * Format category for display
   */
  private static formatCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      bug: '🐛 バグ',
      security: '🔒 セキュリティ',
      feature: '✨ 新機能',
      enhancement: '⚡ 改善',
      performance: '🚀 パフォーマンス',
      documentation: '📚 ドキュメント',
      question: '❓ 質問',
      test: '🧪 テスト',
      refactor: '🔧 リファクタ',
      'ci-cd': '⚙️ CI/CD',
      dependencies: '📦 依存関係',
      'good-first-issue': '🌱 初心者向け',
    };

    return categoryMap[category] || '📋 その他';
  }

  /**
   * Estimate effort based on task characteristics
   */
  private static estimateEffort(task: TaskScore): 'low' | 'medium' | 'high' {
    const { category, body = '', labels } = task;

    // High effort indicators
    const highEffortKeywords = ['refactor', 'redesign', 'architecture', 'breaking change'];
    const hasHighEffortKeyword = highEffortKeywords.some(
      keyword =>
        body.toLowerCase().includes(keyword) ||
        labels.some(label => label.toLowerCase().includes(keyword))
    );

    if (hasHighEffortKeyword || category === 'refactor') {
      return 'high';
    }

    // Low effort indicators
    const lowEffortCategories = ['documentation', 'test', 'question'];
    const lowEffortKeywords = ['typo', 'fix typo', 'update docs', 'small fix'];
    const hasLowEffortKeyword = lowEffortKeywords.some(keyword =>
      body.toLowerCase().includes(keyword)
    );

    if (
      lowEffortCategories.includes(category) ||
      hasLowEffortKeyword ||
      labels.includes('good first issue')
    ) {
      return 'low';
    }

    return 'medium';
  }

  /**
   * Generate tags for the task
   */
  private static generateTags(task: TaskScore): string[] {
    const tags: string[] = [];

    // Add priority tag
    if (task.priority === 'critical' || task.priority === 'high') {
      tags.push('優先度高');
    }

    // Add effort tag
    const effort = this.estimateEffort(task);
    if (effort === 'low') {
      tags.push('簡単');
    } else if (effort === 'high') {
      tags.push('大きなタスク');
    }

    // Add confidence tag
    if (task.confidence > 0.8) {
      tags.push('確実');
    }

    // Add category-specific tags
    if (task.category === 'security') {
      tags.push('セキュリティ');
    } else if (task.category === 'bug') {
      tags.push('バグ修正');
    } else if (task.category === 'feature') {
      tags.push('新機能');
    }

    return tags.slice(0, 3); // Limit to 3 tags
  }

  /**
   * Calculate priority distribution
   */
  private static calculatePriorityDistribution(tasks: TaskScore[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const task of tasks) {
      distribution[task.priority] = (distribution[task.priority] || 0) + 1;
    }

    return distribution;
  }

  /**
   * Provide fallback recommendations when classification fails
   */
  private static getFallbackRecommendations(issues: Issue[], limit: number): DashboardTasksResult {
    const openIssues = issues.filter(issue => issue.state === 'open');

    // Sort by creation date (newest first) and take top N
    const recentIssues = openIssues
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);

    const fallbackTasks: TaskRecommendation[] = recentIssues.map((issue, index) => ({
      taskId: `issue-${issue.number}`,
      title: issue.title,
      description: issue.body?.substring(0, 120) + '...' || 'No description available',
      score: 50 - index * 5, // Decreasing score
      priority: '🟡 中',
      category: '📋 その他',
      confidence: 50,
      estimatedEffort: 'medium' as const,
      tags: ['最新'],
      url: issue.html_url || `/issues/${issue.number}`,
      createdAt: issue.created_at,
      reasons: ['最新のオープンIssueです'],
    }));

    return {
      topTasks: fallbackTasks,
      totalOpenIssues: openIssues.length,
      analysisMetrics: {
        averageScore: 40,
        processingTimeMs: 0,
        categoriesFound: ['other'],
        priorityDistribution: { medium: fallbackTasks.length },
      },
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * Helper function to get dashboard tasks
 */
export async function getDashboardTasks(
  issues: Issue[],
  limit?: number
): Promise<DashboardTasksResult> {
  return TaskRecommendationService.getTopTasksForDashboard(issues, limit);
}

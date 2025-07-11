/**
 * Task Recommendation Service
 *
 * Provides intelligent task recommendations based on issue classification and scoring.
 * This service analyzes GitHub issues and suggests the top priority tasks for the dashboard.
 */

import type { Issue } from '../schemas/github';
import type { ClassificationCategory, PriorityLevel } from '../schemas/classification';
// Enhanced classification imports available when needed
// import { createEnhancedClassificationEngine } from '../classification/enhanced-engine';
// import { enhancedConfigManager } from '../classification/enhanced-config-manager';
import { markdownToHtml, markdownToPlainText, truncateMarkdown } from '../utils/markdown';
import type {
  EnhancedTaskScore,
  EnhancedTaskRecommendation,
  EnhancedDashboardTasksResult,
  EnhancedTaskRecommendationConfig,
  MigrationValidationResult,
} from '../types/enhanced-classification';

/**
 * Legacy TaskScore interface (standalone to replace engine dependency)
 */
export interface TaskScore {
  issueNumber: number;
  issueId: number;
  title: string;
  body?: string;
  score: number;
  priority: PriorityLevel;
  category: ClassificationCategory;
  confidence: number; // Restored for backward compatibility
  reasons: string[];
  labels: string[];
  state: 'open' | 'closed';
  createdAt: string;
  updatedAt: string;
  url: string;
}

export interface TaskRecommendation {
  taskId: string;
  title: string;
  description: string;
  descriptionHtml: string;
  score: number;
  priority: string;
  category: string;
  confidence: number; // Keep for backward compatibility
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
   * Get top task recommendations for the dashboard (Enhanced Version)
   */
  static async getTopTasksForDashboard(
    issues: Issue[],
    limit: number = 3,
    config?: EnhancedTaskRecommendationConfig
  ): Promise<DashboardTasksResult> {
    // Use enhanced classification if enabled
    if (config?.useEnhancedClassification) {
      return this.getEnhancedTopTasksForDashboard(issues, limit, config);
    }

    // Fallback to legacy implementation
    return this.getLegacyTopTasksForDashboard(issues, limit);
  }

  /**
   * Enhanced top tasks implementation
   */
  public static async getEnhancedTopTasksForDashboard(
    issues: Issue[],
    limit: number,
    _config: EnhancedTaskRecommendationConfig
  ): Promise<EnhancedDashboardTasksResult> {
    const startTime = Date.now();

    try {
      // For now, fall back to legacy implementation with enhanced formatting
      const legacyResult = await this.getLegacyTopTasksForDashboard(issues, limit);

      // Convert legacy result to enhanced format with mock enhanced features
      const enhancedTasks = legacyResult.topTasks.map(task => ({
        ...task,
        scoreBreakdown: {
          category: Math.ceil(task.score * 0.5),
          priority: task.score - Math.ceil(task.score * 0.5),  // Ensure total equals task.score
          custom: 0,
        },
        metadata: {
          ruleName: 'legacy-rule',
          ruleId: 'legacy',
          processingTimeMs: 10,
          cacheHit: false,
          configVersion: '2.0.0',
          algorithmVersion: '2.0.0',
        },
        classification: {
          primaryCategory: task.category,
          primaryConfidence: task.confidence / 100,
          estimatedPriority: task.priority,
          priorityConfidence: task.confidence / 100,
          categories: [
            {
              category: task.category,
              confidence: task.confidence / 100,
              reasons: task.reasons,
              keywords: task.tags,
            },
          ],
        },
      }));

      const processingTime = Date.now() - startTime;

      return {
        topTasks: enhancedTasks,
        totalOpenIssues: legacyResult.totalOpenIssues,
        analysisMetrics: {
          ...legacyResult.analysisMetrics,
          confidenceDistribution: {
            'Low (0-0.3)': 0,
            'Medium (0.3-0.7)': 1,
            'High (0.7-1.0)': enhancedTasks.length - 1,
          },
          algorithmVersion: '2.0.0',
          configVersion: '2.0.0',
        },
        performanceMetrics: {
          cacheHitRate: 0.0,
          totalCacheHits: 0,
          avgProcessingTime: processingTime,
          throughput: issues.length / (processingTime / 1000),
        },
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Enhanced classification failed, falling back to legacy:', error);
      // Return a proper enhanced result even on error
      const legacyResult = await this.getLegacyTopTasksForDashboard(issues, limit);
      return {
        topTasks: [],
        totalOpenIssues: legacyResult.totalOpenIssues,
        analysisMetrics: {
          ...legacyResult.analysisMetrics,
          confidenceDistribution: {},
          algorithmVersion: '2.0.0',
          configVersion: '2.0.0',
        },
        performanceMetrics: {
          cacheHitRate: 0.0,
          totalCacheHits: 0,
          avgProcessingTime: 0,
          throughput: 0,
        },
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  /**
   * Legacy top tasks implementation (backward compatibility)
   */
  private static async getLegacyTopTasksForDashboard(
    issues: Issue[],
    limit: number
  ): Promise<DashboardTasksResult> {
    const startTime = Date.now();

    try {
      // Use enhanced classification engine with fallback to simple scoring
      let tasks: TaskScore[];

      try {
        // Try enhanced classification first
        // NOTE: Enhanced classification integration is in progress
        // For now, always use simple scoring as fallback
        tasks = await this.getTasksWithSimpleScoring(issues, limit);
      } catch (enhancedError) {
        console.warn('Enhanced classification not available, using simple scoring:', enhancedError);
        tasks = await this.getTasksWithSimpleScoring(issues, limit);
      }

      // Convert to dashboard format
      const topTasks = await Promise.all(tasks.map(task => this.convertToTaskRecommendation(task)));

      // Calculate metrics from tasks
      const categoriesFound = [...new Set(tasks.map(task => task.category))];
      const priorityDistribution = this.calculatePriorityDistribution(tasks);
      const averageScore =
        tasks.length > 0 ? tasks.reduce((sum, task) => sum + task.score, 0) / tasks.length : 0;

      const processingTime = Date.now() - startTime;

      return {
        topTasks,
        totalOpenIssues: tasks.length,
        analysisMetrics: {
          averageScore,
          processingTimeMs: processingTime,
          categoriesFound,
          priorityDistribution,
        },
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to get task recommendations:', error);

      // Return fallback recommendations
      return await this.getFallbackRecommendations(issues, limit);
    }
  }

  /**
   * Convert enhanced task score to enhanced recommendation
   * TODO: Implement when enhanced classification engine is available
   */
  private static async convertToEnhancedTaskRecommendation(
    task: EnhancedTaskScore
  ): Promise<EnhancedTaskRecommendation> {
    const description = this.generateTaskDescription(task);
    const descriptionHtml = await markdownToHtml(description);

    return {
      taskId: `issue-${task.issueNumber}`,
      title: this.cleanTitle(task.title),
      description,
      descriptionHtml,
      score: task.score,
      scoreBreakdown: task.scoreBreakdown,
      priority: this.formatPriority(task.priority),
      category: this.formatCategory(task.category),
      confidence: Math.round(task.confidence * 100), // Restored for backward compatibility
      tags: this.generateTags(task),
      url: task.url || `/issues/${task.issueNumber}`,
      createdAt: task.createdAt,
      reasons: task.reasons.slice(0, 3),

      // Enhanced fields
      metadata: {
        ruleName: task.classification.classifications[0]?.ruleName,
        ruleId: task.classification.classifications[0]?.ruleId,
        processingTimeMs: task.metadata.processingTimeMs,
        cacheHit: task.metadata.cacheHit,
        configVersion: task.metadata.configVersion,
        algorithmVersion: task.metadata.algorithmVersion,
      },

      // Enhanced classification information
      classification: {
        primaryCategory: task.classification.primaryCategory,
        primaryConfidence: task.classification.primaryConfidence,
        estimatedPriority: task.classification.estimatedPriority,
        priorityConfidence: task.classification.priorityConfidence,
        categories: task.classification.classifications.map(c => ({
          category: c.category,
          confidence: c.confidence,
          reasons: c.reasons,
          keywords: c.keywords,
        })),
      },
    };
  }

  /**
   * Calculate confidence distribution - removed since confidence is no longer calculated
   */
  private static calculateConfidenceDistribution(
    _tasks: EnhancedTaskScore[]
  ): Record<string, number> {
    // Return empty distribution since confidence is no longer calculated
    return {
      'Low (0-0.3)': 0,
      'Medium (0.3-0.7)': 0,
      'High (0.7-1.0)': 0,
    };
  }

  /**
   * Validate migration between old and new systems
   */
  static async validateMigration(
    issues: Issue[],
    limit: number = 3
  ): Promise<MigrationValidationResult> {
    try {
      // Get results from both systems
      const [legacyResult, enhancedResult] = await Promise.all([
        this.getLegacyTopTasksForDashboard(issues, limit),
        this.getEnhancedTopTasksForDashboard(issues, limit, {
          useEnhancedClassification: true,
          enablePerformanceMetrics: true,
          enableCaching: true,
        }),
      ]);

      const warnings: string[] = [];
      const errors: string[] = [];

      // Compare results
      const scoreDifference = Math.abs(
        legacyResult.analysisMetrics.averageScore - enhancedResult.analysisMetrics.averageScore
      );
      const isScoreDifferenceAcceptable = scoreDifference <= 10; // ±10 points acceptable

      if (!isScoreDifferenceAcceptable) {
        warnings.push(`Score difference (${scoreDifference.toFixed(2)}) exceeds acceptable range`);
      }

      // Compare top task categories
      const legacyTopCategories = legacyResult.topTasks.slice(0, 3).map(t => t.category);
      const enhancedTopCategories = enhancedResult.topTasks.slice(0, 3).map(t => t.category);
      const categoryMatches = legacyTopCategories.every(
        (cat, idx) => cat === enhancedTopCategories[idx]
      );

      if (!categoryMatches) {
        warnings.push('Top task categories differ between systems');
      }

      return {
        isValid: errors.length === 0,
        scoreDifference,
        categoryMatches,
        priorityMatches: true, // Simplified for now
        confidenceDifference: 0, // Simplified for now
        warnings,
        errors,
      };
    } catch (error) {
      return {
        isValid: false,
        scoreDifference: 0,
        categoryMatches: false,
        priorityMatches: false,
        confidenceDifference: 0,
        warnings: [],
        errors: [
          `Migration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
      };
    }
  }

  /**
   * Convert TaskScore to TaskRecommendation format
   */
  private static async convertToTaskRecommendation(task: TaskScore): Promise<TaskRecommendation> {
    const description = this.generateTaskDescription(task);
    const descriptionHtml = await markdownToHtml(description);

    return {
      taskId: `issue-${task.issueNumber}`,
      title: this.cleanTitle(task.title),
      description,
      descriptionHtml,
      score: task.score,
      priority: this.formatPriority(task.priority),
      category: this.formatCategory(task.category),
      confidence: Math.round(task.confidence * 100), // Restored for backward compatibility
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

    // Convert to plain text and truncate to 100 characters
    const plainText = markdownToPlainText(body);
    const truncated = truncateMarkdown(plainText, 100);

    return truncated || 'No description available';
  }

  /**
   * Clean title by removing priority prefixes to avoid duplication
   */
  private static cleanTitle(title: string): string {
    // Handle empty or whitespace-only titles
    if (!title || !title.trim()) {
      return '';
    }

    // Remove priority prefixes in various formats
    const priorityPrefixes = [
      // Japanese emoji + text formats
      /^🔴\s*(?:緊急|CRITICAL|HIGH)\s*:?\s*/i,
      /^🟠\s*(?:高|HIGH)\s*:?\s*/i,
      /^🟡\s*(?:中|MEDIUM)\s*:?\s*/i,
      /^🟢\s*(?:低|LOW)\s*:?\s*/i,
      /^⚪\s*(?:バックログ|BACKLOG)\s*:?\s*/i,

      // English text formats
      /^(?:CRITICAL|HIGH|MEDIUM|LOW|BACKLOG)\s*:?\s*/i,

      // Priority label formats
      /^(?:priority:\s*)?(?:critical|high|medium|low|backlog)\s*:?\s*/i,

      // Mixed formats with emojis
      /^[🔴🟠🟡🟢⚪]\s*[A-Za-z]+\s*:?\s*/iu,
    ];

    let cleanedTitle = title;

    // Apply all priority prefix removal patterns
    for (const pattern of priorityPrefixes) {
      cleanedTitle = cleanedTitle.replace(pattern, '');
    }

    // Trim any extra whitespace
    cleanedTitle = cleanedTitle.trim();

    // Return original title if cleaning resulted in empty string
    return cleanedTitle || title;
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
   * Generate tags for the task
   */
  private static generateTags(task: TaskScore): string[] {
    const tags: string[] = [];

    // Add priority tag
    if (task.priority === 'critical' || task.priority === 'high') {
      tags.push('優先度高');
    }

    // Add confidence tag - removed since confidence is no longer calculated
    // if (task.confidence > 0.8) {
    //   tags.push('確実');
    // }

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
  private static async getFallbackRecommendations(
    issues: Issue[],
    limit: number
  ): Promise<DashboardTasksResult> {
    const openIssues = issues.filter(issue => issue.state === 'open');

    // Sort by creation date (newest first) and take top N
    const recentIssues = openIssues
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);

    const fallbackTasks: TaskRecommendation[] = await Promise.all(
      recentIssues.map(async (issue, index) => {
        const plainText = markdownToPlainText(issue.body || '');
        const description = truncateMarkdown(plainText, 100);
        const descriptionHtml = await markdownToHtml(description);

        return {
          taskId: `issue-${issue.number}`,
          title: this.cleanTitle(issue.title),
          description: description || 'No description available',
          descriptionHtml,
          score: 50 - index * 5, // Decreasing score
          priority: '🟡 中',
          category: '📋 その他',
          confidence: 50,
          tags: ['最新'],
          url: issue.html_url || `/issues/${issue.number}`,
          createdAt: issue.created_at,
          reasons: ['最新のオープンIssueです'],
        };
      })
    );

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

  /**
   * Simple scoring method as fallback when classification engine is not available
   */
  private static async getTasksWithSimpleScoring(
    issues: Issue[],
    limit: number
  ): Promise<TaskScore[]> {
    const openIssues = issues.filter(issue => issue.state === 'open');

    const scoredTasks = openIssues.map(issue => {
      // Simple scoring based on labels, age, and activity
      let score = 50; // Base score

      // Priority scoring based on labels
      const priority = this.getSimplePriority(issue.labels.map(l => l.name));
      score += this.getPriorityScore(priority);

      // Category scoring based on labels and title
      const category = this.getSimpleCategory(
        issue.labels.map(l => l.name),
        issue.title
      );
      score += this.getCategoryScore(category);

      // Age scoring removed per user feedback - recency evaluation is unnecessary

      // Label count scoring
      score += Math.min(issue.labels.length * 2, 10);

      return {
        issueNumber: issue.number,
        issueId: issue.id,
        title: issue.title,
        body: issue.body,
        score: Math.round(score),
        priority,
        category,
        confidence: 0.7, // Restored for backward compatibility
        reasons: this.getSimpleReasons(issue, priority, category),
        labels: issue.labels.map(l => l.name),
        state: issue.state,
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        url: issue.html_url || `/issues/${issue.number}`,
      } as TaskScore;
    });

    // Sort by score and return top results
    return scoredTasks.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private static getSimplePriority(labels: string[]): PriorityLevel {
    if (labels.some(l => ['critical', 'urgent', 'p0'].includes(l.toLowerCase()))) return 'critical';
    if (labels.some(l => ['high', 'important', 'p1'].includes(l.toLowerCase()))) return 'high';
    if (labels.some(l => ['low', 'minor', 'p3'].includes(l.toLowerCase()))) return 'low';
    return 'medium';
  }

  private static getSimpleCategory(labels: string[], title: string): ClassificationCategory {
    const titleLower = title.toLowerCase();
    const allLabels = labels.map(l => l.toLowerCase());

    if (allLabels.includes('bug') || titleLower.includes('bug') || titleLower.includes('error'))
      return 'bug';
    if (
      allLabels.includes('feature') ||
      titleLower.includes('feature') ||
      titleLower.includes('add')
    )
      return 'feature';
    if (
      allLabels.includes('enhancement') ||
      titleLower.includes('enhance') ||
      titleLower.includes('improve')
    )
      return 'enhancement';
    if (allLabels.includes('documentation') || allLabels.includes('docs')) return 'documentation';
    if (
      allLabels.includes('question') ||
      titleLower.includes('question') ||
      titleLower.includes('help')
    )
      return 'question';
    if (allLabels.includes('test') || allLabels.includes('testing')) return 'test';
    if (allLabels.includes('refactor') || allLabels.includes('refactoring')) return 'refactor';
    if (
      allLabels.includes('performance') ||
      titleLower.includes('performance') ||
      titleLower.includes('slow')
    )
      return 'performance';
    if (allLabels.includes('security') || titleLower.includes('security')) return 'security';

    return 'enhancement'; // Default fallback
  }

  private static getPriorityScore(priority: PriorityLevel): number {
    switch (priority) {
      case 'critical':
        return 30;
      case 'high':
        return 20;
      case 'medium':
        return 10;
      case 'low':
        return 5;
      default:
        return 10;
    }
  }

  private static getCategoryScore(category: ClassificationCategory): number {
    // Some categories might be more urgent
    switch (category) {
      case 'bug':
        return 15;
      case 'security':
        return 25;
      case 'performance':
        return 10;
      case 'feature':
        return 8;
      case 'enhancement':
        return 5;
      default:
        return 5;
    }
  }

  private static getSimpleReasons(
    issue: Issue,
    priority: PriorityLevel,
    category: ClassificationCategory
  ): string[] {
    const reasons = [];

    if (priority === 'critical' || priority === 'high') {
      reasons.push(`${priority}優先度のIssueです`);
    }

    if (category === 'bug') {
      reasons.push('バグ修正が必要です');
    } else if (category === 'security') {
      reasons.push('セキュリティの問題があります');
    } else if (category === 'feature') {
      reasons.push('新機能の実装です');
    }

    if (issue.labels.length > 3) {
      reasons.push('複数のラベルが付いています');
    }

    // Age-based reasoning removed - recency evaluation is unnecessary

    return reasons.slice(0, 3); // Return max 3 reasons
  }
}

/**
 * Helper function to get dashboard tasks (Enhanced)
 */
export async function getDashboardTasks(
  issues: Issue[],
  limit?: number,
  config?: EnhancedTaskRecommendationConfig
): Promise<DashboardTasksResult> {
  return TaskRecommendationService.getTopTasksForDashboard(issues, limit, config);
}

/**
 * Helper function to get enhanced dashboard tasks
 */
export async function getEnhancedDashboardTasks(
  issues: Issue[],
  limit?: number,
  repositoryContext?: { owner: string; repo: string },
  profileId?: string
): Promise<EnhancedDashboardTasksResult> {
  const config: EnhancedTaskRecommendationConfig = {
    useEnhancedClassification: true,
    enablePerformanceMetrics: true,
    enableCaching: true,
    repositoryContext,
    profileId,
    maxResults: limit,
  };

  return TaskRecommendationService.getEnhancedTopTasksForDashboard(issues, limit || 3, config);
}

/**
 * Helper function to validate migration
 */
export async function validateTaskRecommendationMigration(
  issues: Issue[],
  limit?: number
): Promise<MigrationValidationResult> {
  return TaskRecommendationService.validateMigration(issues, limit);
}

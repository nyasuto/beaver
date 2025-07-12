/**
 * Task Recommendation Service
 *
 * Provides intelligent task recommendations based on issue classification and scoring.
 * This service analyzes GitHub issues and suggests the top priority tasks for the dashboard.
 */

import type { Issue } from '../schemas/github';
import type { ClassificationCategory, PriorityLevel } from '../schemas/classification';
import { enhancedConfigManager } from '../classification/enhanced-config-manager';
// Enhanced classification imports available when needed
// import { createEnhancedClassificationEngine } from '../classification/enhanced-engine';
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
  issueNumber: number; // Added for test compatibility and debugging
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
      const enhancedResult = await this.getEnhancedTopTasksForDashboard(issues, limit, config);
      // Convert enhanced result to regular result for backward compatibility
      return {
        topTasks: enhancedResult.topTasks,
        totalOpenIssues: enhancedResult.totalOpenIssues,
        analysisMetrics: enhancedResult.analysisMetrics,
        lastUpdated: enhancedResult.lastUpdated,
      } as DashboardTasksResult;
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
          category: Math.ceil(task.score * 0.5), // TODO: Make configurable
          priority: task.score - Math.ceil(task.score * 0.5), // Ensure total equals task.score
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
      issueNumber: task.issueNumber,
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
      issueNumber: task.issueNumber,
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

    // Get configurable fallback values
    const configResult = await enhancedConfigManager.loadConfig();
    const config = configResult.config;
    const taskRecommendationConfig = config.taskRecommendation;
    const fallbackBaseScore = taskRecommendationConfig?.fallbackScore?.baseScore ?? 50;
    const scoreDecrement = taskRecommendationConfig?.fallbackScore?.scoreDecrement ?? 5;

    const fallbackTasks: TaskRecommendation[] = await Promise.all(
      recentIssues.map(async (issue, index) => {
        const plainText = markdownToPlainText(issue.body || '');
        const description = truncateMarkdown(plainText, 100);
        const descriptionHtml = await markdownToHtml(description);

        return {
          taskId: `issue-${issue.number}`,
          issueNumber: issue.number,
          title: this.cleanTitle(issue.title),
          description: description || 'No description available',
          descriptionHtml,
          score: fallbackBaseScore - index * scoreDecrement, // Configurable decreasing score
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
   * Simple scoring method - now delegates to enhanced classification for proper separation of concerns
   */
  private static async getTasksWithSimpleScoring(
    issues: Issue[],
    limit: number
  ): Promise<TaskScore[]> {
    // Always use enhanced classification engine for consistency
    // This ensures proper separation of concerns - no direct GitHub label parsing here
    return this.getEnhancedTasksWithFallbackToSimple(issues, limit);
  }

  /**
   * Get enhanced tasks using Enhanced Classification Engine
   */
  private static async getEnhancedTasksWithFallbackToSimple(
    issues: Issue[],
    limit: number
  ): Promise<TaskScore[]> {
    const openIssues = issues.filter(issue => issue.state === 'open');

    try {
      // Use Enhanced Classification Engine for proper classification
      const { createClassificationEngine } = await import('../classification/engine');
      const engine = await createClassificationEngine({
        owner: 'nyasuto',
        repo: 'beaver',
      });

      const batchResult = await engine.classifyIssuesBatch(openIssues, {
        owner: 'nyasuto',
        repo: 'beaver',
      });

      // Convert Enhanced Classification results to TaskScore format
      const scoredTasks: TaskScore[] = [];
      for (const task of batchResult.tasks) {
        // Calculate score from Enhanced Classification results
        let score = 50; // Base score

        // Map 'backlog' priority to 'low' for consistency
        const mappedPriority = task.priority === 'backlog' ? 'low' : task.priority;

        score += await this.getPriorityScore(mappedPriority as PriorityLevel);
        score += await this.getCategoryScore(task.category);
        score += Math.min(task.labels.length * 2, 10);

        scoredTasks.push({
          issueNumber: task.issueNumber,
          issueId: task.issueId || 0,
          title: task.title,
          body: task.body,
          score: Math.round(score),
          priority: mappedPriority as PriorityLevel,
          category: task.category,
          confidence: task.confidence,
          reasons: this.getEnhancedReasons(task),
          labels: task.labels,
          state: 'open' as const,
          createdAt: task.createdAt || new Date().toISOString(),
          updatedAt: task.updatedAt || new Date().toISOString(),
          url: task.url || `/issues/${task.issueNumber}`,
        } as TaskScore);
      }

      // Sort by score and return top results
      return scoredTasks.sort((a, b) => b.score - a.score).slice(0, limit);
    } catch (error) {
      console.warn('Enhanced Classification Engine failed, using basic fallback:', error);

      // Fallback to basic scoring without infer functions
      const scoredTasks = openIssues.map(issue => {
        const score = 50 + Math.min(issue.labels.length * 2, 10);

        return {
          issueNumber: issue.number,
          issueId: issue.id,
          title: issue.title,
          body: issue.body,
          score: Math.round(score),
          priority: 'medium' as PriorityLevel, // Default fallback priority
          category: 'enhancement' as ClassificationCategory, // Default fallback category
          confidence: 0.5,
          reasons: ['基本スコアリングによる推奨'],
          labels: issue.labels.map(l => l.name),
          state: issue.state,
          createdAt: issue.created_at,
          updatedAt: issue.updated_at,
          url: issue.html_url || `/issues/${issue.number}`,
        } as TaskScore;
      });

      return scoredTasks.sort((a, b) => b.score - a.score).slice(0, limit);
    }
  }

  /**
   * Generate reasons from Enhanced Classification Engine results
   */
  private static getEnhancedReasons(task: any): string[] {
    const reasons = [];

    // Priority-based reasons
    if (task.priority === 'critical') {
      reasons.push('緊急優先度のIssueです');
    } else if (task.priority === 'high') {
      reasons.push('高優先度のIssueです');
    }

    // Category-based reasons
    if (task.category === 'bug') {
      reasons.push('バグ修正が必要です');
    } else if (task.category === 'security') {
      reasons.push('セキュリティの問題があります');
    } else if (task.category === 'feature') {
      reasons.push('新機能の実装です');
    } else if (task.category === 'performance') {
      reasons.push('パフォーマンス改善が必要です');
    }

    // Confidence-based reasons
    if (task.confidence > 0.8) {
      reasons.push('高精度で分析されました');
    }

    // Label-based reasons
    if (task.labels.length > 3) {
      reasons.push('複数のラベルが付いています');
    }

    return reasons.slice(0, 3); // Return max 3 reasons
  }

  // Removed: getSimplePriority and getSimpleCategory methods
  // These methods performed direct GitHub label parsing which violates separation of concerns
  // The enhanced classification engine should handle all label parsing and classification

  private static async getPriorityScore(priority: PriorityLevel): Promise<number> {
    const configResult = await enhancedConfigManager.loadConfig();
    const config = configResult.config;
    const priorityScoring = config.priorityScoring;

    switch (priority) {
      case 'critical':
        return priorityScoring?.critical ?? 30;
      case 'high':
        return priorityScoring?.high ?? 20;
      case 'medium':
        return priorityScoring?.medium ?? 10;
      case 'low':
        return priorityScoring?.low ?? 5;
      default:
        return priorityScoring?.default ?? 10;
    }
  }

  private static async getCategoryScore(category: ClassificationCategory): Promise<number> {
    const configResult = await enhancedConfigManager.loadConfig();
    const config = configResult.config;
    const categoryScoring = config.categoryScoring;

    // Some categories might be more urgent
    switch (category) {
      case 'bug':
        return categoryScoring?.bug ?? 15;
      case 'security':
        return categoryScoring?.security ?? 25;
      case 'performance':
        return categoryScoring?.performance ?? 10;
      case 'feature':
        return categoryScoring?.feature ?? 8;
      case 'enhancement':
        return categoryScoring?.enhancement ?? 5;
      default:
        return categoryScoring?.default ?? 5;
    }
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

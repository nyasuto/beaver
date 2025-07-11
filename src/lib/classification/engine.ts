/**
 * Issue Classification Engine
 *
 * This module implements the core classification logic that analyzes GitHub issues
 * and assigns categories, priorities, and scores based on configurable rules.
 */

import type { Issue } from '../schemas/github';
import type {
  ClassificationConfig,
  ClassificationRule,
  IssueClassification,
  CategoryClassification,
  ClassificationCategory,
  PriorityLevel,
} from '../schemas/classification';

export interface TaskScore {
  issueNumber: number;
  issueId: number;
  title: string;
  body?: string;
  score: number;
  priority: PriorityLevel;
  category: ClassificationCategory;
  confidence: number;
  reasons: string[];
  labels: string[];
  state: 'open' | 'closed';
  createdAt: string;
  updatedAt: string;
  url: string;
}

export interface TopTasksResult {
  tasks: TaskScore[];
  totalAnalyzed: number;
  averageScore: number;
  processingTimeMs: number;
}

export class IssueClassificationEngine {
  private config: ClassificationConfig;

  constructor(config: ClassificationConfig) {
    this.config = config;
  }

  /**
   * Classify a single issue
   */
  classifyIssue(issue: Issue): IssueClassification {
    const startTime = Date.now();
    const classifications: CategoryClassification[] = [];

    // Apply each rule to the issue
    for (const rule of this.config.rules) {
      if (!rule.enabled) continue;

      const result = this.applyRule(issue, rule);
      if (result.confidence >= this.config.minConfidence) {
        classifications.push(result);
      }
    }

    // Sort by confidence and take top categories
    classifications.sort((a, b) => b.confidence - a.confidence);
    const topClassifications = classifications.slice(0, this.config.maxCategories);

    // Determine primary category and priority
    const primaryCategory = topClassifications[0]?.category ?? 'question';
    const primaryConfidence = topClassifications[0]?.confidence ?? 0.0;
    const estimatedPriority = this.estimatePriority(issue, topClassifications);
    const priorityConfidence = this.calculatePriorityConfidence(
      estimatedPriority,
      topClassifications
    );

    // Add priority label information to classifications if present
    const existingLabels = issue.labels.map(label => label.name.toLowerCase());
    const priorityLabelFound = existingLabels.find(label => label.includes('priority:'));
    if (priorityLabelFound) {
      const priorityReason = `Has priority label: "${priorityLabelFound}"`;
      if (topClassifications.length > 0 && topClassifications[0]) {
        topClassifications[0].reasons.push(priorityReason);
      } else {
        // Create a synthetic classification for priority label
        topClassifications.push({
          category: 'question',
          confidence: 0.8,
          reasons: [priorityReason],
          keywords: [],
        });
      }
    }

    const processingTime = Date.now() - startTime;

    return {
      issueId: issue.id,
      issueNumber: issue.number,
      classifications: topClassifications,
      primaryCategory,
      primaryConfidence,
      estimatedPriority,
      priorityConfidence,
      processingTimeMs: processingTime,
      version: this.config.version,
      metadata: {
        titleLength: issue.title.length,
        bodyLength: issue.body?.length ?? 0,
        hasCodeBlocks: this.hasCodeBlocks(issue.body ?? ''),
        hasStepsToReproduce: this.hasStepsToReproduce(issue.body ?? ''),
        hasExpectedBehavior: this.hasExpectedBehavior(issue.body ?? ''),
        labelCount: issue.labels.length,
        existingLabels: issue.labels.map(label => label.name),
      },
    };
  }

  /**
   * Calculate task score based on classification results
   */
  calculateTaskScore(issue: Issue, classification: IssueClassification): TaskScore {
    let baseScore = 0;

    // Category weight
    const categoryWeight = this.config.categoryWeights?.[classification.primaryCategory] ?? 0.5;
    baseScore += categoryWeight * 40; // Max 40 points from category

    // Priority weight
    const priorityWeight = this.config.priorityWeights?.[classification.estimatedPriority] ?? 0.5;
    baseScore += priorityWeight * 30; // Max 30 points from priority

    // Confidence bonus
    baseScore += classification.primaryConfidence * 20; // Max 20 points from confidence

    // Recent activity bonus (newer issues get higher scores)
    const daysSinceCreated =
      (Date.now() - new Date(issue.created_at).getTime()) / (1000 * 60 * 60 * 24);
    const recencyBonus = Math.max(0, 10 - daysSinceCreated * 0.5); // Max 10 points, decreases over time
    baseScore += recencyBonus;

    // Normalize to 0-100 scale
    const normalizedScore = Math.min(100, Math.max(0, baseScore));

    return {
      issueNumber: issue.number,
      issueId: issue.id,
      title: issue.title,
      body: issue.body || '',
      score: Math.round(normalizedScore * 10) / 10, // Round to 1 decimal place
      priority: classification.estimatedPriority,
      category: classification.primaryCategory,
      confidence: Math.round(classification.primaryConfidence * 100) / 100,
      reasons: classification.classifications.flatMap(c => c.reasons),
      labels: issue.labels.map(label => label.name),
      state: issue.state,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      url: issue.html_url,
    };
  }

  /**
   * Get top priority tasks from a list of issues
   */
  getTopTasks(issues: Issue[], limit: number = 3): TopTasksResult {
    const startTime = Date.now();
    const taskScores: TaskScore[] = [];

    // Only analyze open issues for task recommendations
    const openIssues = issues.filter(issue => issue.state === 'open');

    for (const issue of openIssues) {
      const classification = this.classifyIssue(issue);
      const taskScore = this.calculateTaskScore(issue, classification);
      taskScores.push(taskScore);
    }

    // Sort by score (highest first) and take top N
    taskScores.sort((a, b) => b.score - a.score);
    const topTasks = taskScores.slice(0, limit);

    const averageScore =
      taskScores.length > 0
        ? taskScores.reduce((sum, task) => sum + task.score, 0) / taskScores.length
        : 0;

    const processingTime = Date.now() - startTime;

    return {
      tasks: topTasks,
      totalAnalyzed: openIssues.length,
      averageScore: Math.round(averageScore * 10) / 10,
      processingTimeMs: processingTime,
    };
  }

  /**
   * Apply a single classification rule to an issue
   */
  private applyRule(issue: Issue, rule: ClassificationRule): CategoryClassification {
    let score = 0;
    const reasons: string[] = [];
    const matchedKeywords: string[] = [];

    const title = issue.title.toLowerCase();
    const body = (issue.body ?? '').toLowerCase();
    const existingLabels = issue.labels.map(label => label.name.toLowerCase());

    // Check title keywords
    if (rule.conditions.titleKeywords) {
      for (const keyword of rule.conditions.titleKeywords) {
        if (title.includes(keyword.toLowerCase())) {
          score += 0.3;
          matchedKeywords.push(keyword);
          reasons.push(`Title contains keyword: "${keyword}"`);
        }
      }
    }

    // Check body keywords
    if (rule.conditions.bodyKeywords) {
      for (const keyword of rule.conditions.bodyKeywords) {
        if (body.includes(keyword.toLowerCase())) {
          score += 0.2;
          matchedKeywords.push(keyword);
          reasons.push(`Body contains keyword: "${keyword}"`);
        }
      }
    }

    // Check existing labels
    if (rule.conditions.labels) {
      for (const labelPattern of rule.conditions.labels) {
        if (existingLabels.some(label => label.includes(labelPattern.toLowerCase()))) {
          score += 0.4;
          reasons.push(`Has matching label: "${labelPattern}"`);
        }
      }
    }

    // Check title patterns (simplified regex check)
    if (rule.conditions.titlePatterns) {
      for (const pattern of rule.conditions.titlePatterns) {
        try {
          // Extract regex from pattern string (simplified)
          const cleanPattern = pattern.replace(/^\/|\/[gimuy]*$/g, '');
          const regex = new RegExp(cleanPattern, 'i');
          if (regex.test(title)) {
            score += 0.25;
            reasons.push(`Title matches pattern: ${pattern}`);
          }
        } catch {
          // Skip invalid regex patterns
          // eslint-disable-next-line no-console
          console.warn(`Invalid regex pattern: ${pattern}`);
        }
      }
    }

    // Check body patterns
    if (rule.conditions.bodyPatterns) {
      for (const pattern of rule.conditions.bodyPatterns) {
        try {
          const cleanPattern = pattern.replace(/^\/|\/[gimuy]*$/g, '');
          const regex = new RegExp(cleanPattern, 'i');
          if (regex.test(body)) {
            score += 0.2;
            reasons.push(`Body matches pattern: ${pattern}`);
          }
        } catch {
          // eslint-disable-next-line no-console
          console.warn(`Invalid regex pattern: ${pattern}`);
        }
      }
    }

    // Apply rule weight
    const finalScore = Math.min(1.0, score * rule.weight);

    return {
      category: rule.category,
      confidence: finalScore,
      reasons: reasons,
      keywords: matchedKeywords,
    };
  }

  /**
   * Estimate priority based on classifications and existing labels
   */
  private estimatePriority(issue: Issue, classifications: CategoryClassification[]): PriorityLevel {
    // First, check existing priority labels (highest priority)
    const existingLabels = issue.labels.map(label => label.name.toLowerCase());

    if (
      existingLabels.some(
        label => label.includes('priority: critical') || label.includes('priority:critical')
      )
    ) {
      return 'critical';
    }
    if (
      existingLabels.some(
        label => label.includes('priority: high') || label.includes('priority:high')
      )
    ) {
      return 'high';
    }
    if (
      existingLabels.some(
        label => label.includes('priority: medium') || label.includes('priority:medium')
      )
    ) {
      return 'medium';
    }
    if (
      existingLabels.some(
        label => label.includes('priority: low') || label.includes('priority:low')
      )
    ) {
      return 'low';
    }

    // Fallback to classification-based priority estimation
    if (classifications.length === 0) return 'low';

    // Check for security or critical bugs
    const hasSecurityOrCritical = classifications.some(
      c => c.category === 'security' || (c.category === 'bug' && c.confidence > 0.8)
    );
    if (hasSecurityOrCritical) return 'critical';

    // Check for performance or high-priority items
    const hasHighPriority = classifications.some(
      c => c.category === 'performance' || c.category === 'bug'
    );
    if (hasHighPriority) return 'high';

    // Check for features and enhancements
    const hasFeature = classifications.some(
      c => c.category === 'feature' || c.category === 'enhancement'
    );
    if (hasFeature) return 'medium';

    return 'low';
  }

  /**
   * Calculate confidence in the priority estimation
   */
  private calculatePriorityConfidence(
    _priority: PriorityLevel,
    classifications: CategoryClassification[]
  ): number {
    if (classifications.length === 0) return 0.0;

    const avgConfidence =
      classifications.reduce((sum, c) => sum + c.confidence, 0) / classifications.length;
    return Math.min(1.0, avgConfidence * 1.2); // Boost confidence slightly
  }

  /**
   * Check if the issue body contains code blocks
   */
  private hasCodeBlocks(body: string): boolean {
    return body.includes('```') || body.includes('`') || body.includes('<code>');
  }

  /**
   * Check if the issue has steps to reproduce
   */
  private hasStepsToReproduce(body: string): boolean {
    const patterns = [/steps to reproduce/i, /how to reproduce/i, /reproduce/i, /repro/i];
    return patterns.some(pattern => pattern.test(body));
  }

  /**
   * Check if the issue describes expected behavior
   */
  private hasExpectedBehavior(body: string): boolean {
    const patterns = [/expected/i, /should/i, /supposed to/i, /intended/i];
    return patterns.some(pattern => pattern.test(body));
  }
}

/**
 * Create a classification engine with default configuration
 */
export function createClassificationEngine(
  customConfig?: Partial<ClassificationConfig>
): IssueClassificationEngine {
  const defaultConfig: ClassificationConfig = {
    version: '1.0.0',
    minConfidence: 0.3,
    maxCategories: 3,
    enableAutoClassification: true,
    enablePriorityEstimation: true,
    rules: [], // Will be loaded from configuration
    categoryWeights: {
      bug: 1.0,
      security: 1.0,
      feature: 0.8,
      enhancement: 0.7,
      performance: 0.8,
      documentation: 0.5,
      question: 0.4,
      duplicate: 0.3,
      invalid: 0.3,
      wontfix: 0.3,
      'help-wanted': 0.6,
      'good-first-issue': 0.5,
      refactor: 0.6,
      test: 0.5,
      'ci-cd': 0.6,
      dependencies: 0.5,
    },
    priorityWeights: {
      critical: 1.0,
      high: 0.8,
      medium: 0.6,
      low: 0.4,
      backlog: 0.2,
    },
  };

  const config = { ...defaultConfig, ...customConfig };
  return new IssueClassificationEngine(config);
}

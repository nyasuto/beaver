/**
 * Classification Engine
 *
 * This module provides a classification engine with customizable
 * scoring algorithms, repository-specific configurations, and performance
 * optimizations including caching and batch processing.
 *
 * @module ClassificationEngine
 */

import type { Issue } from '../schemas/github';
import type {
  EnhancedClassificationConfig,
  EnhancedIssueClassification,
  ScoringAlgorithm,
  ConfidenceThreshold,
  PriorityEstimationConfig,
  ClassificationRule,
  CategoryClassification,
  ClassificationCategory,
  PriorityLevel,
} from '../schemas/classification';
import { enhancedConfigManager } from './enhanced-config-manager';

/**
 * Task score with detailed breakdown
 */
export interface TaskScore {
  issueNumber: number;
  issueId: number;
  title: string;
  body?: string;
  score: number;
  scoreBreakdown: {
    category: number;
    priority: number;
    recency?: number;
    custom?: number;
  };
  priority: PriorityLevel;
  category: ClassificationCategory;
  confidence: number;
  reasons: string[];
  labels: string[];
  state: 'open' | 'closed';
  createdAt: string;
  updatedAt: string;
  url: string;
  metadata: {
    processingTimeMs: number;
    cacheHit: boolean;
    rulesApplied: number;
    rulesMatched: number;
    algorithmVersion: string;
  };
}

/**
 * Batch processing result
 */
export interface BatchResult {
  tasks: TaskScore[];
  totalAnalyzed: number;
  averageScore: number;
  processingTimeMs: number;
  cacheHitRate: number;
  performanceMetrics: {
    averageProcessingTime: number;
    minProcessingTime: number;
    maxProcessingTime: number;
    throughput: number; // issues per second
  };
  qualityMetrics: {
    averageConfidence: number;
    categoryDistribution: Record<string, number>;
    priorityDistribution: Record<string, number>;
  };
}

/**
 * Classification cache entry
 */
interface ClassificationCacheEntry {
  classification: EnhancedIssueClassification;
  timestamp: number;
  ttl: number;
}

/**
 * Issue Classification Engine
 */
export class ClassificationEngine {
  private config: EnhancedClassificationConfig;
  private cache = new Map<string, ClassificationCacheEntry>();
  private performanceMetrics = {
    totalProcessed: 0,
    totalCacheHits: 0,
    totalProcessingTime: 0,
  };

  constructor(config: EnhancedClassificationConfig) {
    this.config = config;
  }

  /**
   * Classify a single issue with enhanced features
   */
  async classifyIssue(
    issue: Issue,
    repositoryContext?: { owner: string; repo: string }
  ): Promise<EnhancedIssueClassification> {
    const startTime = Date.now();

    // Check cache first
    const cacheKey = this.getCacheKey(issue, repositoryContext);
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      const processingTime = Date.now() - startTime;
      this.performanceMetrics.totalCacheHits++;
      this.performanceMetrics.totalProcessed++;
      this.performanceMetrics.totalProcessingTime += processingTime;
      return {
        ...cached.classification,
        cacheHit: true,
        processingTimeMs: processingTime,
      };
    }

    // Get effective configuration for this repository
    const effectiveConfig = repositoryContext
      ? await enhancedConfigManager.getEffectiveConfig(repositoryContext)
      : this.config;

    // Apply classification rules
    const classifications = await this.applyClassificationRules(issue, effectiveConfig);

    // Apply confidence thresholds
    const filteredClassifications = this.applyConfidenceThresholds(
      classifications,
      effectiveConfig.confidenceThresholds
    );

    // Sort by confidence and take top categories
    filteredClassifications.sort((a, b) => b.confidence - a.confidence);
    const topClassifications = filteredClassifications.slice(0, effectiveConfig.maxCategories);

    // Determine primary category and priority
    const primaryCategory = topClassifications[0]?.category ?? 'question';
    const primaryConfidence = topClassifications[0]?.confidence ?? 0.0;
    const estimatedPriority = this.estimatePriorityEnhanced(
      issue,
      topClassifications,
      effectiveConfig.priorityEstimation
    );
    const priorityConfidence = this.calculatePriorityConfidence(
      estimatedPriority,
      topClassifications
    );

    // Calculate enhanced score
    const scoreResult = this.calculateEnhancedScore(
      issue,
      topClassifications,
      primaryCategory,
      primaryConfidence,
      estimatedPriority,
      effectiveConfig.scoringAlgorithm
    );

    const processingTime = Date.now() - startTime;
    this.performanceMetrics.totalProcessed++;
    this.performanceMetrics.totalProcessingTime += processingTime;

    const classification: EnhancedIssueClassification = {
      issueId: issue.id,
      issueNumber: issue.number,
      classifications: topClassifications.map(c => ({
        ...c,
        ruleName: c.ruleName,
        ruleId: c.ruleId,
      })),
      primaryCategory,
      primaryConfidence,
      estimatedPriority,
      priorityConfidence,
      score: scoreResult.score,
      scoreBreakdown: scoreResult.breakdown,
      processingTimeMs: processingTime,
      cacheHit: false,
      configVersion: effectiveConfig.version,
      algorithmVersion: effectiveConfig.scoringAlgorithm?.version || '1.0.0',
      metadata: {
        titleLength: issue.title.length,
        bodyLength: issue.body?.length ?? 0,
        hasCodeBlocks: this.hasCodeBlocks(issue.body ?? ''),
        hasStepsToReproduce: this.hasStepsToReproduce(issue.body ?? ''),
        hasExpectedBehavior: this.hasExpectedBehavior(issue.body ?? ''),
        labelCount: issue.labels.length,
        existingLabels: issue.labels.map(label => label.name),
        repositoryContext,
        processingMetadata: {
          rulesApplied: effectiveConfig.rules.length,
          rulesMatched: topClassifications.length,
        },
      },
    };

    // Cache the result
    if (effectiveConfig.performance?.caching?.enabled) {
      this.cache.set(cacheKey, {
        classification,
        timestamp: Date.now(),
        ttl: effectiveConfig.performance.caching.ttl * 1000,
      });
    }

    return classification;
  }

  /**
   * Process multiple issues with enhanced batch processing
   */
  async classifyIssuesBatch(
    issues: Issue[],
    repositoryContext?: { owner: string; repo: string },
    options?: {
      batchSize?: number;
      parallelism?: number;
      onProgress?: (processed: number, total: number) => void;
    }
  ): Promise<BatchResult> {
    const startTime = Date.now();
    const results: TaskScore[] = [];

    const batchSize =
      options?.batchSize || this.config.performance?.batchProcessing?.batchSize || 100;
    const parallelism =
      options?.parallelism || this.config.performance?.batchProcessing?.parallelism || 3;

    // Process in batches
    for (let i = 0; i < issues.length; i += batchSize) {
      const batch = issues.slice(i, i + batchSize);
      const batchPromises = [];

      // Process batch items in parallel
      for (let j = 0; j < batch.length; j += Math.ceil(batch.length / parallelism)) {
        const subBatch = batch.slice(j, j + Math.ceil(batch.length / parallelism));
        batchPromises.push(this.processBatch(subBatch, repositoryContext));
      }

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.flat());

      // Report progress
      if (options?.onProgress) {
        options.onProgress(Math.min(i + batchSize, issues.length), issues.length);
      }
    }

    const processingTime = Date.now() - startTime;

    // Calculate metrics
    const averageScore =
      results.length > 0 ? results.reduce((sum, task) => sum + task.score, 0) / results.length : 0;

    const cacheHitRate =
      this.performanceMetrics.totalCacheHits / this.performanceMetrics.totalProcessed;

    const processingTimes = results.map(r => r.metadata.processingTimeMs);
    const performanceMetrics = {
      averageProcessingTime:
        processingTimes.reduce((sum, t) => sum + t, 0) / processingTimes.length,
      minProcessingTime: Math.min(...processingTimes),
      maxProcessingTime: Math.max(...processingTimes),
      throughput: issues.length / (processingTime / 1000),
    };

    const qualityMetrics = this.calculateQualityMetrics(results);

    return {
      tasks: results,
      totalAnalyzed: issues.length,
      averageScore,
      processingTimeMs: processingTime,
      cacheHitRate,
      performanceMetrics,
      qualityMetrics,
    };
  }

  /**
   * Apply classification rules to an issue
   */
  private async applyClassificationRules(
    issue: Issue,
    config: EnhancedClassificationConfig
  ): Promise<CategoryClassification[]> {
    const classifications: CategoryClassification[] = [];

    // Apply standard rules
    for (const rule of config.rules) {
      if (!rule.enabled) continue;

      const result = this.applyRule(issue, rule);
      if (result.confidence >= config.minConfidence) {
        classifications.push({
          ...result,
          ruleName: rule.name,
          ruleId: rule.id,
        });
      }
    }

    // Apply custom rules
    for (const rule of config.customRules || []) {
      if (!rule.enabled) continue;

      const result = this.applyRule(issue, rule);
      if (result.confidence >= config.minConfidence) {
        classifications.push({
          ...result,
          ruleName: rule.name,
          ruleId: rule.id,
        });
      }
    }

    return classifications;
  }

  /**
   * Apply confidence thresholds
   */
  private applyConfidenceThresholds(
    classifications: CategoryClassification[],
    thresholds?: ConfidenceThreshold[]
  ): CategoryClassification[] {
    if (!thresholds) return classifications;

    return classifications
      .map(classification => {
        const threshold = thresholds.find(t => t.category === classification.category);
        if (!threshold) return classification;

        // Apply confidence adjustment
        const adjustedConfidence = Math.min(
          threshold.maxConfidence,
          Math.max(threshold.minConfidence, classification.confidence * threshold.adjustmentFactor)
        );

        return {
          ...classification,
          confidence: adjustedConfidence,
        };
      })
      .filter(
        c => c.confidence >= (thresholds.find(t => t.category === c.category)?.minConfidence || 0)
      );
  }

  /**
   * Enhanced priority estimation
   */
  private estimatePriorityEnhanced(
    issue: Issue,
    classifications: CategoryClassification[],
    priorityConfig?: PriorityEstimationConfig
  ): PriorityLevel {
    if (!priorityConfig || priorityConfig.algorithm === 'rule-based') {
      return this.estimatePriorityRuleBased(issue, classifications, priorityConfig);
    }

    // Add support for other algorithms here
    return this.estimatePriorityRuleBased(issue, classifications, priorityConfig);
  }

  /**
   * Rule-based priority estimation
   */
  private estimatePriorityRuleBased(
    issue: Issue,
    classifications: CategoryClassification[],
    priorityConfig?: PriorityEstimationConfig
  ): PriorityLevel {
    // Check existing priority labels first
    const existingLabels = issue.labels.map(label => label.name.toLowerCase());

    for (const priority of ['critical', 'high', 'medium', 'low'] as PriorityLevel[]) {
      if (
        existingLabels.some(
          label => label.includes(`priority:${priority}`) || label.includes(`priority: ${priority}`)
        )
      ) {
        return priority;
      }
    }

    // Apply custom priority rules if available
    if (priorityConfig?.rules) {
      for (const rule of priorityConfig.rules) {
        if (!rule.enabled) continue;

        const matches = this.checkPriorityRuleConditions(issue, classifications, rule.conditions);
        if (matches) {
          return rule.resultPriority;
        }
      }
    }

    // Fallback to classification-based priority
    if (classifications.length === 0) {
      return priorityConfig?.fallbackPriority || 'low';
    }

    // Enhanced priority logic based on classifications
    const hasSecurityOrCritical = classifications.some(
      c => c.category === 'security' && c.confidence > 0.7
    );
    if (hasSecurityOrCritical) return 'critical';

    const hasHighPriority = classifications.some(
      c => (c.category === 'bug' && c.confidence > 0.7) || c.category === 'performance'
    );
    if (hasHighPriority) return 'high';

    const hasFeature = classifications.some(
      c => c.category === 'feature' || c.category === 'enhancement'
    );
    if (hasFeature) return 'medium';

    return priorityConfig?.fallbackPriority || 'low';
  }

  /**
   * Check priority rule conditions
   */
  private checkPriorityRuleConditions(
    issue: Issue,
    classifications: CategoryClassification[],
    conditions: any
  ): boolean {
    if (conditions.categories) {
      const hasCategory = classifications.some(c => conditions.categories.includes(c.category));
      if (!hasCategory) return false;
    }

    if (conditions.keywords) {
      const text = `${issue.title} ${issue.body || ''}`.toLowerCase();
      const hasKeyword = conditions.keywords.some((keyword: string) =>
        text.includes(keyword.toLowerCase())
      );
      if (!hasKeyword) return false;
    }

    if (conditions.labels) {
      const labels = issue.labels.map(l => l.name.toLowerCase());
      const hasLabel = conditions.labels.some((label: string) =>
        labels.includes(label.toLowerCase())
      );
      if (!hasLabel) return false;
    }

    if (conditions.ageThreshold) {
      const daysSinceCreated =
        (Date.now() - new Date(issue.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreated > conditions.ageThreshold) return false;
    }

    if (conditions.confidenceThreshold) {
      const maxConfidence = Math.max(...classifications.map(c => c.confidence));
      if (maxConfidence < conditions.confidenceThreshold) return false;
    }

    return true;
  }

  /**
   * Calculate enhanced score with customizable algorithm
   */
  private calculateEnhancedScore(
    issue: Issue,
    classifications: CategoryClassification[],
    primaryCategory: ClassificationCategory,
    primaryConfidence: number,
    estimatedPriority: PriorityLevel,
    scoringAlgorithm?: ScoringAlgorithm
  ): { score: number; breakdown: any } {
    const algorithm = scoringAlgorithm || this.config.scoringAlgorithm;
    if (!algorithm) {
      // Fallback to simple scoring
      return {
        score: 50,
        breakdown: { category: 20, priority: 15, confidence: 10, recency: 5 },
      };
    }

    const weights = algorithm.weights;
    const breakdown = {
      category: 0,
      priority: 0,
      recency: 0,
      custom: 0,
    };

    // Category score
    const categoryWeight = this.config.categoryWeights?.[primaryCategory] ?? 0.5;
    breakdown.category = categoryWeight * weights.category;

    // Priority score
    const priorityWeight = this.config.priorityWeights?.[estimatedPriority] ?? 0.5;
    breakdown.priority = priorityWeight * weights.priority;

    // Confidence score removed - no longer part of scoreBreakdown

    // Recency score - removed per user feedback
    // const daysSinceCreated =
    //   (Date.now() - new Date(issue.created_at).getTime()) / (1000 * 60 * 60 * 24);
    // const recencyScore = Math.max(0, 1 - daysSinceCreated / 30); // Decay over 30 days
    // breakdown.recency = recencyScore * weights.recency;

    // Custom factors
    if (algorithm.customFactors && weights.custom > 0) {
      let customScore = 0;
      for (const factor of algorithm.customFactors) {
        if (factor.enabled) {
          // Apply custom factor logic here
          customScore += factor.weight;
        }
      }
      breakdown.custom = customScore * weights.custom;
    }

    const totalScore = Object.values(breakdown).reduce((sum, score) => sum + score, 0);

    return {
      score: Math.round(totalScore * 10) / 10,
      breakdown,
    };
  }

  /**
   * Process a batch of issues
   */
  private async processBatch(
    issues: Issue[],
    repositoryContext?: { owner: string; repo: string }
  ): Promise<TaskScore[]> {
    const promises = issues.map(async issue => {
      const classification = await this.classifyIssue(issue, repositoryContext);
      return this.createTaskScore(issue, classification);
    });

    return Promise.all(promises);
  }

  /**
   * Create enhanced task score from classification
   */
  private createTaskScore(issue: Issue, classification: EnhancedIssueClassification): TaskScore {
    return {
      issueNumber: issue.number,
      issueId: issue.id,
      title: issue.title,
      body: issue.body || '',
      score: classification.score,
      scoreBreakdown: classification.scoreBreakdown,
      priority: classification.estimatedPriority,
      category: classification.primaryCategory,
      confidence: classification.primaryConfidence,
      reasons: classification.classifications.flatMap(c => c.reasons),
      labels: issue.labels.map(label => label.name),
      state: issue.state,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      url: issue.html_url,
      metadata: {
        processingTimeMs: classification.processingTimeMs,
        cacheHit: classification.cacheHit,
        rulesApplied: classification.metadata.processingMetadata?.rulesApplied || 0,
        rulesMatched: classification.metadata.processingMetadata?.rulesMatched || 0,
        algorithmVersion: classification.algorithmVersion,
      },
    };
  }

  /**
   * Calculate quality metrics
   */
  private calculateQualityMetrics(results: TaskScore[]): any {
    const categoryDistribution: Record<string, number> = {};
    const priorityDistribution: Record<string, number> = {};
    let totalConfidence = 0;

    for (const result of results) {
      categoryDistribution[result.category] = (categoryDistribution[result.category] || 0) + 1;
      priorityDistribution[result.priority] = (priorityDistribution[result.priority] || 0) + 1;
      totalConfidence += result.confidence;
    }

    return {
      averageConfidence: results.length > 0 ? totalConfidence / results.length : 0,
      categoryDistribution,
      priorityDistribution,
    };
  }

  /**
   * Apply a single rule (enhanced version)
   */
  private applyRule(
    issue: Issue,
    rule: ClassificationRule
  ): CategoryClassification & { ruleName?: string; ruleId?: string } {
    let score = 0;
    const reasons: string[] = [];
    const matchedKeywords: string[] = [];

    const title = issue.title.toLowerCase();
    const body = (issue.body ?? '').toLowerCase();
    const existingLabels = issue.labels.map(label => label.name.toLowerCase());

    // Check exclude keywords first
    if (rule.conditions.excludeKeywords) {
      for (const keyword of rule.conditions.excludeKeywords) {
        if (title.includes(keyword.toLowerCase()) || body.includes(keyword.toLowerCase())) {
          return {
            category: rule.category,
            confidence: 0,
            reasons: [`Excluded by keyword: "${keyword}"`],
            keywords: [],
            ruleName: rule.name,
            ruleId: rule.id,
          };
        }
      }
    }

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

    // Check title patterns
    if (rule.conditions.titlePatterns) {
      for (const pattern of rule.conditions.titlePatterns) {
        try {
          const cleanPattern = pattern.replace(/^\/|\/[gimuy]*$/g, '');
          const regex = new RegExp(cleanPattern, 'i');
          if (regex.test(title)) {
            score += 0.25;
            reasons.push(`Title matches pattern: ${pattern}`);
          }
        } catch {
          console.warn(`Invalid regex pattern in rule ${rule.id}: ${pattern}`);
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
          console.warn(`Invalid regex pattern in rule ${rule.id}: ${pattern}`);
        }
      }
    }

    // Apply rule weight
    const finalScore = Math.min(1.0, score * rule.weight);

    return {
      category: rule.category,
      confidence: finalScore,
      reasons,
      keywords: matchedKeywords,
      ruleName: rule.name,
      ruleId: rule.id,
    };
  }

  /**
   * Calculate priority confidence
   */
  private calculatePriorityConfidence(
    priority: PriorityLevel,
    classifications: CategoryClassification[]
  ): number {
    if (classifications.length === 0) return 0.0;

    const avgConfidence =
      classifications.reduce((sum, c) => sum + c.confidence, 0) / classifications.length;
    return Math.min(1.0, avgConfidence * 1.2);
  }

  /**
   * Helper methods
   */
  private getCacheKey(issue: Issue, repositoryContext?: { owner: string; repo: string }): string {
    const parts = [issue.id.toString()];
    if (repositoryContext) {
      parts.push(repositoryContext.owner, repositoryContext.repo);
    }
    return parts.join(':');
  }

  private hasCodeBlocks(body: string): boolean {
    return body.includes('```') || body.includes('`') || body.includes('<code>');
  }

  private hasStepsToReproduce(body: string): boolean {
    const patterns = [/steps to reproduce/i, /how to reproduce/i, /reproduce/i, /repro/i];
    return patterns.some(pattern => pattern.test(body));
  }

  private hasExpectedBehavior(body: string): boolean {
    const patterns = [/expected/i, /should/i, /supposed to/i, /intended/i];
    return patterns.some(pattern => pattern.test(body));
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    totalProcessed: number;
    totalCacheHits: number;
    cacheHitRate: number;
    averageProcessingTime: number;
  } {
    return {
      totalProcessed: this.performanceMetrics.totalProcessed,
      totalCacheHits: this.performanceMetrics.totalCacheHits,
      cacheHitRate:
        this.performanceMetrics.totalProcessed > 0
          ? this.performanceMetrics.totalCacheHits / this.performanceMetrics.totalProcessed
          : 0,
      averageProcessingTime:
        this.performanceMetrics.totalProcessed > 0
          ? this.performanceMetrics.totalProcessingTime / this.performanceMetrics.totalProcessed
          : 0,
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Create enhanced classification engine
 */
export async function createClassificationEngine(repositoryContext?: {
  owner: string;
  repo: string;
}): Promise<ClassificationEngine> {
  const config = await enhancedConfigManager.getEffectiveConfig(
    repositoryContext || { owner: '', repo: '' }
  );
  return new ClassificationEngine(config);
}

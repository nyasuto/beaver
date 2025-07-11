/**
 * Enhanced Classification Types
 *
 * Extended types for the enhanced classification system with backward compatibility
 */

import type { EnhancedIssueClassification } from '../schemas/enhanced-classification';
import type { ClassificationCategory, PriorityLevel } from '../schemas/classification';

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
  confidence: number;
  reasons: string[];
  labels: string[];
  state: 'open' | 'closed';
  createdAt: string;
  updatedAt: string;
  url: string;
}

/**
 * Enhanced Task Score with additional metadata
 */
export interface EnhancedTaskScore extends TaskScore {
  // Enhanced scoring breakdown
  scoreBreakdown: {
    category: number;
    priority: number;
    recency?: number;
    custom?: number;
  };

  // Enhanced metadata
  metadata: {
    configVersion: string;
    algorithmVersion: string;
    profileId?: string;
    cacheHit: boolean;
    processingTimeMs: number;
    repositoryContext?: {
      owner: string;
      repo: string;
      branch?: string;
    };
  };

  // Enhanced classification data
  classification: EnhancedIssueClassification;
}

/**
 * Union type for backward compatibility
 */
export type TaskScoreUnion = TaskScore | EnhancedTaskScore;

/**
 * Type guard to check if a TaskScore is enhanced
 */
export function isEnhancedTaskScore(score: TaskScoreUnion): score is EnhancedTaskScore {
  return 'scoreBreakdown' in score && 'metadata' in score && 'classification' in score;
}

/**
 * Enhanced Task Recommendation Service Configuration
 */
export interface EnhancedTaskRecommendationConfig {
  useEnhancedClassification: boolean;
  enablePerformanceMetrics: boolean;
  enableCaching: boolean;
  repositoryContext?: {
    owner: string;
    repo: string;
    branch?: string;
  };
  profileId?: string;
  maxResults?: number;
  minConfidence?: number;
}

/**
 * Enhanced Dashboard Tasks Result
 */
export interface EnhancedDashboardTasksResult {
  topTasks: EnhancedTaskRecommendation[];
  totalOpenIssues: number;
  analysisMetrics: {
    averageScore: number;
    processingTimeMs: number;
    categoriesFound: string[];
    priorityDistribution: Record<string, number>;
    confidenceDistribution: Record<string, number>;
    algorithmVersion: string;
    configVersion: string;
  };
  performanceMetrics: {
    cacheHitRate: number;
    totalCacheHits: number;
    avgProcessingTime: number;
    throughput: number;
  };
  lastUpdated: string;
}

/**
 * Enhanced Task Recommendation
 */
export interface EnhancedTaskRecommendation {
  taskId: string;
  title: string;
  description: string;
  descriptionHtml: string;
  score: number;
  scoreBreakdown: {
    category: number;
    priority: number;
    // confidence: number; // Removed - misleading mock value
    // recency: number; // Removed - no longer used
    custom?: number;
  };
  priority: string;
  category: string;
  confidence: number;
  tags: string[];
  url: string;
  createdAt: string;
  reasons: string[];

  // Enhanced fields
  metadata: {
    ruleName?: string;
    ruleId?: string;
    processingTimeMs: number;
    cacheHit: boolean;
    configVersion: string;
    algorithmVersion: string;
  };

  // Enhanced classification information
  classification: {
    primaryCategory: string;
    primaryConfidence: number;
    estimatedPriority: string;
    priorityConfidence: number;
    categories: Array<{
      category: string;
      // confidence: number; // Removed - misleading mock value
      reasons: string[];
      keywords: string[];
    }>;
  };
}

/**
 * Migration validation result
 */
export interface MigrationValidationResult {
  isValid: boolean;
  scoreDifference: number;
  categoryMatches: boolean;
  priorityMatches: boolean;
  confidenceDifference: number;
  warnings: string[];
  errors: string[];
}

/**
 * Feature flag configuration for enhanced classification
 */
export interface EnhancedClassificationFeatureFlags {
  useEnhancedEngine: boolean;
  enablePerformanceMetrics: boolean;
  enableCaching: boolean;
  enableBatchProcessing: boolean;
  enableMigrationValidation: boolean;
  gradualRolloutPercentage: number;
}

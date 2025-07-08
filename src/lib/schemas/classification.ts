/**
 * Classification System Schemas
 *
 * This module defines Zod schemas and TypeScript types for the issue classification system.
 * It includes schemas for classification results, confidence scores, and category mappings.
 *
 * @module ClassificationSchemas
 */

import { z } from 'zod';

/**
 * Classification categories enum
 */
export const ClassificationCategorySchema = z.enum([
  'bug',
  'feature',
  'enhancement',
  'documentation',
  'question',
  'duplicate',
  'invalid',
  'wontfix',
  'help-wanted',
  'good-first-issue',
  'security',
  'performance',
  'refactor',
  'test',
  'ci-cd',
  'dependencies',
]);

export type ClassificationCategory = z.infer<typeof ClassificationCategorySchema>;

/**
 * Priority levels for issues
 */
export const PriorityLevelSchema = z.enum(['critical', 'high', 'medium', 'low', 'backlog']);

export type PriorityLevel = z.infer<typeof PriorityLevelSchema>;

/**
 * Confidence score schema (0.0 to 1.0)
 */
export const ConfidenceScoreSchema = z.number().min(0).max(1);

/**
 * Classification result for a single category
 */
export const CategoryClassificationSchema = z.object({
  category: ClassificationCategorySchema,
  confidence: ConfidenceScoreSchema,
  reasons: z.array(z.string()).describe('Reasons for this classification'),
  keywords: z.array(z.string()).describe('Keywords that influenced classification'),
});

export type CategoryClassification = z.infer<typeof CategoryClassificationSchema>;

/**
 * Complete classification result for an issue
 */
export const IssueClassificationSchema = z.object({
  issueId: z.number(),
  issueNumber: z.number(),
  classifications: z.array(CategoryClassificationSchema),
  primaryCategory: ClassificationCategorySchema,
  primaryConfidence: ConfidenceScoreSchema,
  estimatedPriority: PriorityLevelSchema,
  priorityConfidence: ConfidenceScoreSchema,
  processingTimeMs: z.number(),
  version: z.string().describe('Classification algorithm version'),
  metadata: z.object({
    titleLength: z.number(),
    bodyLength: z.number(),
    hasCodeBlocks: z.boolean(),
    hasStepsToReproduce: z.boolean(),
    hasExpectedBehavior: z.boolean(),
    labelCount: z.number(),
    existingLabels: z.array(z.string()),
  }),
});

export type IssueClassification = z.infer<typeof IssueClassificationSchema>;

/**
 * Classification rule schema for configuration
 */
export const ClassificationRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: ClassificationCategorySchema,
  priority: PriorityLevelSchema.optional(),
  conditions: z.object({
    titleKeywords: z.array(z.string()).optional(),
    bodyKeywords: z.array(z.string()).optional(),
    labels: z.array(z.string()).optional(),
    titlePatterns: z.array(z.string()).optional(),
    bodyPatterns: z.array(z.string()).optional(),
    excludeKeywords: z.array(z.string()).optional(),
  }),
  weight: z.number().min(0).max(1).default(1),
  enabled: z.boolean().default(true),
});

export type ClassificationRule = z.infer<typeof ClassificationRuleSchema>;

/**
 * Batch classification result
 */
export const BatchClassificationResultSchema = z.object({
  totalIssues: z.number(),
  processedIssues: z.number(),
  failedIssues: z.number(),
  results: z.array(IssueClassificationSchema),
  errors: z.array(
    z.object({
      issueId: z.number(),
      error: z.string(),
    })
  ),
  processingTimeMs: z.number(),
  averageConfidence: z.number(),
});

export type BatchClassificationResult = z.infer<typeof BatchClassificationResultSchema>;

/**
 * Classification configuration schema
 */
export const ClassificationConfigSchema = z.object({
  version: z.string().default('1.0.0'),
  minConfidence: ConfidenceScoreSchema.default(0.7),
  maxCategories: z.number().min(1).max(10).default(3),
  enableAutoClassification: z.boolean().default(true),
  enablePriorityEstimation: z.boolean().default(true),
  rules: z.array(ClassificationRuleSchema),
  categoryWeights: z.record(ClassificationCategorySchema, z.number()).optional(),
  priorityWeights: z.record(PriorityLevelSchema, z.number()).optional(),
});

export type ClassificationConfig = z.infer<typeof ClassificationConfigSchema>;

/**
 * Classification metrics schema
 */
export const ClassificationMetricsSchema = z.object({
  totalClassified: z.number(),
  averageConfidence: z.number(),
  categoryDistribution: z.record(ClassificationCategorySchema, z.number()),
  priorityDistribution: z.record(PriorityLevelSchema, z.number()),
  accuracyRate: z.number().optional(),
  falsePositiveRate: z.number().optional(),
  falseNegativeRate: z.number().optional(),
  processingStats: z.object({
    averageTimeMs: z.number(),
    minTimeMs: z.number(),
    maxTimeMs: z.number(),
    totalTimeMs: z.number(),
  }),
});

export type ClassificationMetrics = z.infer<typeof ClassificationMetricsSchema>;

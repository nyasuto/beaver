/**
 * Enhanced Classification Configuration Schemas
 *
 * This module extends the base classification schemas to support repository-specific
 * configurations, dynamic weight management, and customizable scoring algorithms.
 *
 * @module EnhancedClassificationSchemas
 */

import { z } from 'zod';
import {
  ClassificationCategorySchema,
  PriorityLevelSchema,
  ConfidenceScoreSchema,
  ClassificationRuleSchema,
  ClassificationConfigSchema,
} from './classification';

/**
 * Repository configuration for classification
 */
export const RepositoryConfigSchema = z.object({
  owner: z.string().describe('GitHub repository owner'),
  repo: z.string().describe('GitHub repository name'),
  branch: z.string().default('main').describe('Default branch to analyze'),
  enabled: z.boolean().default(true).describe('Enable classification for this repository'),
  lastUpdated: z.string().datetime().optional().describe('Last configuration update timestamp'),
});

export type RepositoryConfig = z.infer<typeof RepositoryConfigSchema>;

/**
 * Scoring algorithm configuration
 */
export const ScoringAlgorithmSchema = z.object({
  id: z.string().describe('Unique identifier for the scoring algorithm'),
  name: z.string().describe('Human-readable name'),
  description: z.string().describe('Algorithm description'),
  version: z.string().default('1.0.0').describe('Algorithm version'),
  weights: z
    .object({
      category: z
        .number()
        .min(0)
        .max(100)
        .default(40)
        .describe('Category weight in scoring (0-100)'),
      priority: z
        .number()
        .min(0)
        .max(100)
        .default(30)
        .describe('Priority weight in scoring (0-100)'),
      confidence: z
        .number()
        .min(0)
        .max(100)
        .default(20)
        .describe('Confidence weight in scoring (0-100)'),
      recency: z.number().min(0).max(100).default(10).describe('Recency weight in scoring (0-100)'),
      custom: z
        .number()
        .min(0)
        .max(100)
        .default(0)
        .describe('Custom weight for additional factors'),
    })
    .refine(
      weights => {
        const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
        return total === 100;
      },
      {
        message: 'Scoring weights must sum to 100',
      }
    ),
  customFactors: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        weight: z.number().min(0).max(1),
        enabled: z.boolean().default(true),
      })
    )
    .optional()
    .describe('Additional custom scoring factors'),
  enabled: z.boolean().default(true).describe('Enable this scoring algorithm'),
});

export type ScoringAlgorithm = z.infer<typeof ScoringAlgorithmSchema>;

/**
 * Confidence threshold configuration per category
 */
export const ConfidenceThresholdSchema = z.object({
  category: ClassificationCategorySchema,
  minConfidence: ConfidenceScoreSchema.default(0.7).describe(
    'Minimum confidence to classify as this category'
  ),
  maxConfidence: ConfidenceScoreSchema.default(1.0).describe(
    'Maximum confidence cap for this category'
  ),
  adjustmentFactor: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .describe('Confidence adjustment multiplier'),
});

export type ConfidenceThreshold = z.infer<typeof ConfidenceThresholdSchema>;

/**
 * Priority estimation configuration
 */
export const PriorityEstimationConfigSchema = z.object({
  algorithm: z.enum(['rule-based', 'weighted', 'machine-learning']).default('rule-based'),
  rules: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        conditions: z.object({
          categories: z.array(ClassificationCategorySchema).optional(),
          keywords: z.array(z.string()).optional(),
          labels: z.array(z.string()).optional(),
          ageThreshold: z.number().optional().describe('Age threshold in days'),
          confidenceThreshold: ConfidenceScoreSchema.optional(),
        }),
        resultPriority: PriorityLevelSchema,
        weight: z.number().min(0).max(1).default(1),
        enabled: z.boolean().default(true),
      })
    )
    .optional(),
  fallbackPriority: PriorityLevelSchema.default('medium').describe(
    'Default priority when no rules match'
  ),
  confidenceBonus: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .describe('Confidence bonus for priority estimation'),
});

export type PriorityEstimationConfig = z.infer<typeof PriorityEstimationConfigSchema>;

/**
 * Performance optimization configuration
 */
export const PerformanceConfigSchema = z.object({
  caching: z.object({
    enabled: z.boolean().default(true).describe('Enable result caching'),
    ttl: z.number().min(0).default(3600).describe('Cache time-to-live in seconds'),
    maxSize: z.number().min(0).default(1000).describe('Maximum cache size'),
    strategy: z.enum(['lru', 'lfu', 'ttl']).default('lru').describe('Cache eviction strategy'),
  }),
  batchProcessing: z.object({
    enabled: z.boolean().default(true).describe('Enable batch processing'),
    batchSize: z.number().min(1).max(1000).default(100).describe('Batch size for processing'),
    parallelism: z.number().min(1).max(10).default(3).describe('Number of parallel processes'),
  }),
  precomputation: z.object({
    enabled: z.boolean().default(false).describe('Enable precomputation of scores'),
    schedule: z.string().optional().describe('Cron schedule for precomputation'),
    outputPath: z.string().optional().describe('Path to store precomputed results'),
  }),
});

export type PerformanceConfig = z.infer<typeof PerformanceConfigSchema>;

/**
 * A/B testing configuration
 */
export const ABTestConfigSchema = z.object({
  enabled: z.boolean().default(false).describe('Enable A/B testing'),
  testId: z.string().describe('Unique test identifier'),
  testName: z.string().describe('Human-readable test name'),
  variants: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      weight: z.number().min(0).max(1).describe('Traffic allocation weight'),
      configOverrides: z
        .record(z.string(), z.unknown())
        .describe('Configuration overrides for this variant'),
    })
  ),
  trafficAllocation: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .describe('Percentage of traffic to include in test'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  metrics: z.array(z.string()).describe('Metrics to track for this test'),
});

export type ABTestConfig = z.infer<typeof ABTestConfigSchema>;

/**
 * Enhanced classification configuration
 */
export const EnhancedClassificationConfigSchema = ClassificationConfigSchema.extend({
  // Repository-specific configurations
  repositories: z
    .array(RepositoryConfigSchema)
    .default([])
    .describe('Repository-specific configurations'),

  // Scoring algorithm configuration
  scoringAlgorithm: ScoringAlgorithmSchema.optional().describe('Custom scoring algorithm'),

  // Confidence thresholds per category
  confidenceThresholds: z
    .array(ConfidenceThresholdSchema)
    .optional()
    .describe('Per-category confidence thresholds'),

  // Priority estimation configuration
  priorityEstimation: PriorityEstimationConfigSchema.optional().describe(
    'Priority estimation configuration'
  ),

  // Performance optimization
  performance: PerformanceConfigSchema.optional().describe('Performance optimization settings'),

  // A/B testing
  abTest: ABTestConfigSchema.optional().describe('A/B testing configuration'),

  // Custom rule builder
  customRules: z.array(ClassificationRuleSchema).default([]).describe('User-defined custom rules'),

  // Environment-specific overrides
  environments: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Environment-specific configuration overrides'),

  // Metadata
  metadata: z
    .object({
      createdAt: z.string().datetime().optional(),
      updatedAt: z.string().datetime().optional(),
      createdBy: z.string().optional(),
      updatedBy: z.string().optional(),
      configSource: z.enum(['file', 'api', 'ui']).default('file'),
      tags: z.array(z.string()).default([]),
    })
    .optional(),
});

export type EnhancedClassificationConfig = z.infer<typeof EnhancedClassificationConfigSchema>;

/**
 * Configuration profile for different use cases
 */
export const ConfigurationProfileSchema = z.object({
  id: z.string().describe('Unique profile identifier'),
  name: z.string().describe('Profile name'),
  description: z.string().describe('Profile description'),
  type: z.enum(['development', 'production', 'testing', 'custom']).describe('Profile type'),
  config: EnhancedClassificationConfigSchema.describe('Configuration for this profile'),
  isDefault: z.boolean().default(false).describe('Is this the default profile'),
  tags: z.array(z.string()).default([]).describe('Profile tags for organization'),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type ConfigurationProfile = z.infer<typeof ConfigurationProfileSchema>;

/**
 * Dynamic configuration update schema
 */
export const ConfigurationUpdateSchema = z.object({
  path: z.string().describe('Configuration path to update (dot notation)'),
  value: z.unknown().describe('New value to set'),
  operation: z
    .enum(['set', 'merge', 'append', 'remove'])
    .default('set')
    .describe('Update operation'),
  conditions: z
    .array(
      z.object({
        path: z.string(),
        operator: z.enum([
          'equals',
          'not_equals',
          'contains',
          'not_contains',
          'greater_than',
          'less_than',
        ]),
        value: z.unknown(),
      })
    )
    .optional()
    .describe('Conditions for conditional updates'),
  metadata: z
    .object({
      reason: z.string().optional(),
      timestamp: z.string().datetime().optional(),
      user: z.string().optional(),
    })
    .optional(),
});

export type ConfigurationUpdate = z.infer<typeof ConfigurationUpdateSchema>;

/**
 * Classification result with enhanced metadata
 */
export const EnhancedIssueClassificationSchema = z.object({
  // Base classification data
  issueId: z.number(),
  issueNumber: z.number(),
  classifications: z.array(
    z.object({
      category: ClassificationCategorySchema,
      confidence: ConfidenceScoreSchema,
      reasons: z.array(z.string()),
      keywords: z.array(z.string()),
      ruleName: z.string().optional(),
      ruleId: z.string().optional(),
    })
  ),
  primaryCategory: ClassificationCategorySchema,
  primaryConfidence: ConfidenceScoreSchema,
  estimatedPriority: PriorityLevelSchema,
  priorityConfidence: ConfidenceScoreSchema,

  // Enhanced scoring
  score: z.number().describe('Calculated task score'),
  scoreBreakdown: z.object({
    category: z.number(),
    priority: z.number(),
    confidence: z.number(),
    recency: z.number(),
    custom: z.number().optional(),
  }),

  // Performance metrics
  processingTimeMs: z.number(),
  cacheHit: z.boolean().default(false),

  // Configuration metadata
  configVersion: z.string(),
  algorithmVersion: z.string(),
  profileId: z.string().optional(),

  // Enhanced metadata
  metadata: z.object({
    titleLength: z.number(),
    bodyLength: z.number(),
    hasCodeBlocks: z.boolean(),
    hasStepsToReproduce: z.boolean(),
    hasExpectedBehavior: z.boolean(),
    labelCount: z.number(),
    existingLabels: z.array(z.string()),
    repositoryContext: z
      .object({
        owner: z.string(),
        repo: z.string(),
        branch: z.string().optional(),
      })
      .optional(),
    processingMetadata: z
      .object({
        rulesApplied: z.number(),
        rulesMatched: z.number(),
        confidenceAdjustments: z
          .array(
            z.object({
              rule: z.string(),
              adjustment: z.number(),
              reason: z.string(),
            })
          )
          .optional(),
      })
      .optional(),
  }),
});

export type EnhancedIssueClassification = z.infer<typeof EnhancedIssueClassificationSchema>;

/**
 * Validation helpers
 */
export const validateEnhancedConfig = (config: unknown): EnhancedClassificationConfig => {
  return EnhancedClassificationConfigSchema.parse(config);
};

export const validateConfigurationProfile = (profile: unknown): ConfigurationProfile => {
  return ConfigurationProfileSchema.parse(profile);
};

export const validateConfigurationUpdate = (update: unknown): ConfigurationUpdate => {
  return ConfigurationUpdateSchema.parse(update);
};

/**
 * Default enhanced configuration
 */
export const DEFAULT_ENHANCED_CONFIG: EnhancedClassificationConfig = {
  version: '2.0.0',
  minConfidence: 0.7,
  maxCategories: 3,
  enableAutoClassification: true,
  enablePriorityEstimation: true,
  rules: [],
  repositories: [],
  customRules: [],
  scoringAlgorithm: {
    id: 'default',
    name: 'Default Scoring Algorithm',
    description: 'Standard scoring algorithm with balanced weights',
    version: '1.0.0',
    weights: {
      category: 40,
      priority: 30,
      confidence: 20,
      recency: 10,
      custom: 0,
    },
    enabled: true,
  },
  performance: {
    caching: {
      enabled: true,
      ttl: 3600,
      maxSize: 1000,
      strategy: 'lru',
    },
    batchProcessing: {
      enabled: true,
      batchSize: 100,
      parallelism: 3,
    },
    precomputation: {
      enabled: false,
    },
  },
  metadata: {
    configSource: 'file',
    tags: [],
  },
};

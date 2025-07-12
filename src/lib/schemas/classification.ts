/**
 * Classification System Schemas
 *
 * This module defines Zod schemas and TypeScript types for the issue classification system.
 * It includes schemas for classification results, confidence scores, and category mappings.
 *
 * Previously split between classification.ts and enhanced-classification.ts, now unified.
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
  ruleName: z.string().optional().describe('Name of the rule that applied this classification'),
  ruleId: z.string().optional().describe('ID of the rule that applied this classification'),
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

// =============================================================================
// Enhanced Classification Schemas (previously in enhanced-classification.ts)
// =============================================================================

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
      recency: z.number().min(0).max(100).optional().describe('Recency weight in scoring (0-100)'),
      custom: z
        .number()
        .min(0)
        .max(100)
        .default(0)
        .describe('Custom weight for additional factors'),
    })
    .refine(
      weights => {
        const total = Object.values(weights).reduce((sum, weight) => sum + (weight || 0), 0);
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
 * Enhanced classification configuration
 */
/**
 * Scoring thresholds configuration for hardcoded values
 */
export const ScoringThresholdsSchema = z.object({
  keywordScores: z.object({
    titleKeyword: z.number().min(0).max(1).default(0.3),
    bodyKeyword: z.number().min(0).max(1).default(0.2),
    labelMatch: z.number().min(0).max(1).default(0.4),
    titlePattern: z.number().min(0).max(1).default(0.25),
    bodyPattern: z.number().min(0).max(1).default(0.2),
  }),
  confidenceThresholds: z.object({
    securityMinConfidence: z.number().min(0).max(1).default(0.7),
    bugMinConfidence: z.number().min(0).max(1).default(0.7),
    priorityConfidenceMultiplier: z.number().min(0).max(5).default(1.2),
  }),
  fallbackScoring: z.object({
    baseScore: z.number().min(0).max(100).default(50),
    categoryScore: z.number().min(0).max(100).default(20),
    priorityScore: z.number().min(0).max(100).default(15),
    confidenceScore: z.number().min(0).max(100).default(10),
    recencyScore: z.number().min(0).max(100).default(5),
  }),
});

export type ScoringThresholds = z.infer<typeof ScoringThresholdsSchema>;

/**
 * Priority scoring configuration
 */
export const PriorityScoringSchema = z.object({
  critical: z.number().min(0).max(100).default(30),
  high: z.number().min(0).max(100).default(20),
  medium: z.number().min(0).max(100).default(10),
  low: z.number().min(0).max(100).default(5),
  default: z.number().min(0).max(100).default(10),
});

export type PriorityScoring = z.infer<typeof PriorityScoringSchema>;

/**
 * Category scoring configuration
 */
export const CategoryScoringSchema = z.object({
  security: z.number().min(0).max(100).default(25),
  bug: z.number().min(0).max(100).default(15),
  performance: z.number().min(0).max(100).default(10),
  feature: z.number().min(0).max(100).default(8),
  enhancement: z.number().min(0).max(100).default(5),
  default: z.number().min(0).max(100).default(5),
});

export type CategoryScoring = z.infer<typeof CategoryScoringSchema>;

/**
 * Task recommendation configuration
 */
export const TaskRecommendationConfigSchema = z.object({
  fallbackScore: z.object({
    baseScore: z.number().min(0).max(100).default(50),
    scoreDecrement: z.number().min(0).max(20).default(5),
  }),
  scoreBreakdown: z.object({
    categoryWeight: z.number().min(0).max(1).default(0.5),
  }),
  labelBonus: z.object({
    labelWeight: z.number().min(0).max(10).default(2),
    maxBonus: z.number().min(0).max(50).default(10),
  }),
});

export type TaskRecommendationConfig = z.infer<typeof TaskRecommendationConfigSchema>;

/**
 * Health scoring configuration
 */
export const HealthScoringSchema = z.object({
  openIssueThreshold: z.number().min(0).max(1).default(0.7),
  openIssueWeight: z.number().min(0).max(200).default(100),
  criticalIssueWeight: z.number().min(0).max(50).default(20),
  inactivityPenalty: z.number().min(0).max(50).default(15),
  resolutionTimeThreshold: z.number().min(0).max(1000).default(168),
  resolutionTimeWeight: z.number().min(0).max(50).default(20),
  trendStabilityThreshold: z.number().min(0).max(50).default(10),
});

export type HealthScoring = z.infer<typeof HealthScoringSchema>;

/**
 * Display ranges configuration
 */
export const DisplayRangesSchema = z.object({
  confidence: z.object({
    low: z.object({
      min: z.number().min(0).max(1).default(0),
      max: z.number().min(0).max(1).default(0.3),
      label: z.string().default('Low (0-0.3)'),
    }),
    medium: z.object({
      min: z.number().min(0).max(1).default(0.3),
      max: z.number().min(0).max(1).default(0.7),
      label: z.string().default('Medium (0.3-0.7)'),
    }),
    high: z.object({
      min: z.number().min(0).max(1).default(0.7),
      max: z.number().min(0).max(1).default(1.0),
      label: z.string().default('High (0.7-1.0)'),
    }),
  }),
  score: z.object({
    low: z.object({
      min: z.number().min(0).max(100).default(0),
      max: z.number().min(0).max(100).default(25),
      label: z.string().default('Low (0-25)'),
    }),
    medium: z.object({
      min: z.number().min(0).max(100).default(25),
      max: z.number().min(0).max(100).default(50),
      label: z.string().default('Medium (25-50)'),
    }),
    high: z.object({
      min: z.number().min(0).max(100).default(50),
      max: z.number().min(0).max(100).default(75),
      label: z.string().default('High (50-75)'),
    }),
    veryHigh: z.object({
      min: z.number().min(0).max(100).default(75),
      max: z.number().min(0).max(100).default(100),
      label: z.string().default('Very High (75-100)'),
    }),
  }),
});

export type DisplayRanges = z.infer<typeof DisplayRangesSchema>;

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

  // Custom rule builder
  customRules: z.array(ClassificationRuleSchema).default([]).describe('User-defined custom rules'),

  // Environment-specific overrides
  environments: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Environment-specific configuration overrides'),

  // New sections for hardcoded values
  scoringThresholds: ScoringThresholdsSchema.optional().describe('Scoring threshold configuration'),
  priorityScoring: PriorityScoringSchema.optional().describe('Priority scoring weights'),
  categoryScoring: CategoryScoringSchema.optional().describe('Category scoring weights'),
  taskRecommendation: TaskRecommendationConfigSchema.optional().describe(
    'Task recommendation configuration'
  ),
  healthScoring: HealthScoringSchema.optional().describe('Health score calculation parameters'),
  displayRanges: DisplayRangesSchema.optional().describe('Display range configuration for charts'),

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
    recency: z.number().optional(),
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
 * Configuration update schema for dynamic configuration changes
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
    .default([])
    .describe('Conditions that must be met for the update to apply'),
  metadata: z
    .object({
      updatedBy: z.string().optional(),
      updatedAt: z.string().datetime().optional(),
      reason: z.string().optional(),
    })
    .optional()
    .describe('Update metadata'),
});

export type ConfigurationUpdate = z.infer<typeof ConfigurationUpdateSchema>;

/**
 * A/B testing configuration schema
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
    .object({
      type: z.enum(['percentage', 'user_hash', 'random']).default('percentage'),
      seed: z.string().optional().describe('Seed for deterministic allocation'),
    })
    .default({ type: 'percentage' })
    .describe('Traffic allocation strategy'),
  startDate: z.string().datetime().optional().describe('Test start date'),
  endDate: z.string().datetime().optional().describe('Test end date'),
  metadata: z
    .object({
      createdBy: z.string().optional(),
      description: z.string().optional(),
      hypothesis: z.string().optional(),
      successMetrics: z.array(z.string()).default([]),
    })
    .optional()
    .describe('Test metadata'),
});

export type ABTestConfig = z.infer<typeof ABTestConfigSchema>;

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
      category: 50,
      priority: 50,
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
  // Default scoring thresholds
  scoringThresholds: {
    keywordScores: {
      titleKeyword: 0.3,
      bodyKeyword: 0.2,
      labelMatch: 0.4,
      titlePattern: 0.25,
      bodyPattern: 0.2,
    },
    confidenceThresholds: {
      securityMinConfidence: 0.7,
      bugMinConfidence: 0.7,
      priorityConfidenceMultiplier: 1.2,
    },
    fallbackScoring: {
      baseScore: 50,
      categoryScore: 20,
      priorityScore: 15,
      confidenceScore: 10,
      recencyScore: 5,
    },
  },
  // Default priority scoring
  priorityScoring: {
    critical: 30,
    high: 20,
    medium: 10,
    low: 5,
    default: 10,
  },
  // Default category scoring
  categoryScoring: {
    security: 25,
    bug: 15,
    performance: 10,
    feature: 8,
    enhancement: 5,
    default: 5,
  },
  // Default task recommendation config
  taskRecommendation: {
    fallbackScore: {
      baseScore: 50,
      scoreDecrement: 5,
    },
    scoreBreakdown: {
      categoryWeight: 0.5,
    },
    labelBonus: {
      labelWeight: 2,
      maxBonus: 10,
    },
  },
  // Default health scoring
  healthScoring: {
    openIssueThreshold: 0.7,
    openIssueWeight: 100,
    criticalIssueWeight: 20,
    inactivityPenalty: 15,
    resolutionTimeThreshold: 168,
    resolutionTimeWeight: 20,
    trendStabilityThreshold: 10,
  },
  // Default display ranges
  displayRanges: {
    confidence: {
      low: { min: 0, max: 0.3, label: 'Low (0-0.3)' },
      medium: { min: 0.3, max: 0.7, label: 'Medium (0.3-0.7)' },
      high: { min: 0.7, max: 1.0, label: 'High (0.7-1.0)' },
    },
    score: {
      low: { min: 0, max: 25, label: 'Low (0-25)' },
      medium: { min: 25, max: 50, label: 'Medium (25-50)' },
      high: { min: 50, max: 75, label: 'High (50-75)' },
      veryHigh: { min: 75, max: 100, label: 'Very High (75-100)' },
    },
  },
  metadata: {
    configSource: 'file',
    tags: [],
  },
};

// =============================================================================
// Backward compatibility aliases (will be deprecated)
// =============================================================================

/** @deprecated Use ClassificationConfig instead */
export type { EnhancedClassificationConfig as LegacyEnhancedClassificationConfig };

/** @deprecated Use IssueClassification instead */
export type { EnhancedIssueClassification as LegacyEnhancedIssueClassification };

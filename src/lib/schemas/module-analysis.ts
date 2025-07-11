/**
 * Module Analysis Schemas
 *
 * Comprehensive type definitions and validation schemas for module-level code analysis
 */

import { z } from 'zod';

/**
 * File-level metrics schema
 */
export const FileMetricsSchema = z.object({
  /** File path relative to project root */
  path: z.string(),
  /** File name */
  name: z.string(),
  /** File extension */
  extension: z.string(),
  /** File size in bytes */
  size: z.number(),
  /** Number of lines */
  lines: z.number(),
  /** Coverage percentage */
  coverage: z.number().min(0).max(100),
  /** Number of covered lines */
  coveredLines: z.number(),
  /** Number of missed lines */
  missedLines: z.number(),
  /** Cyclomatic complexity */
  complexity: z.number().min(0),
  /** Number of functions */
  functions: z.number().min(0),
  /** Number of classes */
  classes: z.number().min(0),
  /** Code duplication percentage */
  duplication: z.number().min(0).max(100),
  /** Technical debt in hours */
  technicalDebt: z.number().min(0),
  /** Last modified timestamp */
  lastModified: z.string(),
  /** File type classification */
  type: z.enum(['source', 'test', 'config', 'documentation', 'other']),
});

export type FileMetrics = z.infer<typeof FileMetricsSchema>;

/**
 * Module-level metrics schema
 */
export const ModuleMetricsSchema = z.object({
  /** Module name/path */
  name: z.string(),
  /** Module display name */
  displayName: z.string(),
  /** Module description */
  description: z.string().optional(),
  /** Module type */
  type: z.enum(['feature', 'utility', 'component', 'service', 'config', 'test', 'other']),
  /** Module path */
  path: z.string(),
  /** Files in this module */
  files: z.array(FileMetricsSchema),
  /** Overall coverage percentage */
  coverage: z.number().min(0).max(100),
  /** Total lines of code */
  totalLines: z.number().min(0),
  /** Covered lines */
  coveredLines: z.number().min(0),
  /** Missed lines */
  missedLines: z.number().min(0),
  /** Average complexity */
  averageComplexity: z.number().min(0),
  /** Maximum complexity */
  maxComplexity: z.number().min(0),
  /** Total functions */
  totalFunctions: z.number().min(0),
  /** Total classes */
  totalClasses: z.number().min(0),
  /** Code duplication percentage */
  duplication: z.number().min(0).max(100),
  /** Technical debt in hours */
  technicalDebt: z.number().min(0),
  /** Maintainability index (0-100) */
  maintainabilityIndex: z.number().min(0).max(100),
  /** Quality score (0-100) */
  qualityScore: z.number().min(0).max(100),
  /** Priority for improvement */
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  /** Sub-modules */
  subModules: z.array(z.string()).optional(),
  /** Dependencies */
  dependencies: z.array(z.string()).optional(),
  /** Last analysis timestamp */
  lastAnalyzed: z.string(),
});

export type ModuleMetrics = z.infer<typeof ModuleMetricsSchema>;

/**
 * Code smell detection schema
 */
export const CodeSmellSchema = z.object({
  /** Smell type */
  type: z.enum([
    'long_method',
    'large_class',
    'duplicate_code',
    'dead_code',
    'complex_method',
    'god_class',
    'data_class',
    'feature_envy',
    'long_parameter_list',
    'primitive_obsession',
  ]),
  /** Severity level */
  severity: z.enum(['critical', 'major', 'minor', 'info']),
  /** File path */
  filePath: z.string(),
  /** Line number */
  lineNumber: z.number().optional(),
  /** Description */
  description: z.string(),
  /** Suggestion for improvement */
  suggestion: z.string(),
  /** Estimated fix time in hours */
  estimatedFixTime: z.number().min(0),
});

export type CodeSmell = z.infer<typeof CodeSmellSchema>;

/**
 * Hotspot analysis schema
 */
export const HotspotSchema = z.object({
  /** File path */
  filePath: z.string(),
  /** File name */
  fileName: z.string(),
  /** Module name */
  moduleName: z.string(),
  /** Change frequency (commits per month) */
  changeFrequency: z.number().min(0),
  /** Complexity score */
  complexityScore: z.number().min(0),
  /** Coverage percentage */
  coverage: z.number().min(0).max(100),
  /** Risk score (0-100) */
  riskScore: z.number().min(0).max(100),
  /** Priority for attention */
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  /** Code smells detected */
  codeSmells: z.array(CodeSmellSchema),
  /** Recommendation */
  recommendation: z.string(),
});

export type Hotspot = z.infer<typeof HotspotSchema>;

/**
 * Module comparison schema
 */
export const ModuleComparisonSchema = z.object({
  /** Modules being compared */
  modules: z.array(ModuleMetricsSchema),
  /** Comparison metrics */
  comparison: z.object({
    /** Coverage comparison */
    coverage: z.object({
      best: z.string(),
      worst: z.string(),
      average: z.number(),
      median: z.number(),
    }),
    /** Complexity comparison */
    complexity: z.object({
      lowest: z.string(),
      highest: z.string(),
      average: z.number(),
      median: z.number(),
    }),
    /** Technical debt comparison */
    technicalDebt: z.object({
      lowest: z.string(),
      highest: z.string(),
      total: z.number(),
      average: z.number(),
    }),
    /** Quality score comparison */
    qualityScore: z.object({
      best: z.string(),
      worst: z.string(),
      average: z.number(),
      median: z.number(),
    }),
  }),
  /** Ranking by different metrics */
  rankings: z.object({
    byCoverage: z.array(z.string()),
    byComplexity: z.array(z.string()),
    byTechnicalDebt: z.array(z.string()),
    byQualityScore: z.array(z.string()),
  }),
  /** Generated timestamp */
  generatedAt: z.string(),
});

export type ModuleComparison = z.infer<typeof ModuleComparisonSchema>;

/**
 * Module analysis report schema
 */
export const ModuleAnalysisReportSchema = z.object({
  /** Project information */
  project: z.object({
    name: z.string(),
    version: z.string().optional(),
    description: z.string().optional(),
    totalModules: z.number(),
    totalFiles: z.number(),
    totalLines: z.number(),
  }),
  /** Overall metrics */
  overview: z.object({
    totalCoverage: z.number().min(0).max(100),
    averageComplexity: z.number().min(0),
    totalTechnicalDebt: z.number().min(0),
    overallQualityScore: z.number().min(0).max(100),
    maintainabilityIndex: z.number().min(0).max(100),
  }),
  /** Module metrics */
  modules: z.array(ModuleMetricsSchema),
  /** Hotspots */
  hotspots: z.array(HotspotSchema),
  /** Code smells */
  codeSmells: z.array(CodeSmellSchema),
  /** Recommendations */
  recommendations: z.array(
    z.object({
      type: z.enum(['coverage', 'complexity', 'duplication', 'debt', 'structure']),
      priority: z.enum(['critical', 'high', 'medium', 'low']),
      title: z.string(),
      description: z.string(),
      impact: z.string(),
      effort: z.enum(['low', 'medium', 'high']),
      modules: z.array(z.string()),
    })
  ),
  /** Analysis metadata */
  metadata: z.object({
    generatedAt: z.string(),
    analysisType: z.enum(['full', 'incremental', 'cached']),
    dataSource: z.enum(['codecov', 'static_analysis', 'hybrid', 'mock']),
    version: z.string(),
  }),
});

export type ModuleAnalysisReport = z.infer<typeof ModuleAnalysisReportSchema>;

/**
 * Module analysis options schema
 */
export const ModuleAnalysisOptionsSchema = z.object({
  /** Include file-level details */
  includeFileDetails: z.boolean().default(true),
  /** Include code smell detection */
  includeCodeSmells: z.boolean().default(true),
  /** Include hotspot analysis */
  includeHotspots: z.boolean().default(true),
  /** Include dependency analysis */
  includeDependencies: z.boolean().default(false),
  /** Minimum coverage threshold */
  coverageThreshold: z.number().min(0).max(100).default(50),
  /** Minimum complexity threshold */
  complexityThreshold: z.number().min(0).default(10),
  /** Maximum modules to analyze */
  maxModules: z.number().min(1).default(50),
  /** Analysis depth */
  depth: z.enum(['shallow', 'medium', 'deep']).default('medium'),
  /** Include test files */
  includeTestFiles: z.boolean().default(false),
  /** Cache results */
  useCache: z.boolean().default(true),
});

export type ModuleAnalysisOptions = z.infer<typeof ModuleAnalysisOptionsSchema>;

/**
 * Module quality trend schema
 */
export const ModuleQualityTrendSchema = z.object({
  /** Module name */
  moduleName: z.string(),
  /** Trend data points */
  dataPoints: z.array(
    z.object({
      date: z.string(),
      coverage: z.number().min(0).max(100),
      complexity: z.number().min(0),
      technicalDebt: z.number().min(0),
      qualityScore: z.number().min(0).max(100),
      linesOfCode: z.number().min(0),
    })
  ),
  /** Trend analysis */
  trends: z.object({
    coverage: z.enum(['improving', 'stable', 'declining']),
    complexity: z.enum(['improving', 'stable', 'declining']),
    technicalDebt: z.enum(['improving', 'stable', 'declining']),
    qualityScore: z.enum(['improving', 'stable', 'declining']),
  }),
  /** Period analyzed */
  period: z.object({
    start: z.string(),
    end: z.string(),
    duration: z.string(),
  }),
});

export type ModuleQualityTrend = z.infer<typeof ModuleQualityTrendSchema>;

/**
 * Export all schemas for external use
 */
export const ModuleAnalysisSchemas = {
  FileMetrics: FileMetricsSchema,
  ModuleMetrics: ModuleMetricsSchema,
  CodeSmell: CodeSmellSchema,
  Hotspot: HotspotSchema,
  ModuleComparison: ModuleComparisonSchema,
  ModuleAnalysisReport: ModuleAnalysisReportSchema,
  ModuleAnalysisOptions: ModuleAnalysisOptionsSchema,
  ModuleQualityTrend: ModuleQualityTrendSchema,
};

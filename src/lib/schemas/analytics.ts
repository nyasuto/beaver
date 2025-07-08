/**
 * Analytics Schemas
 *
 * Zod schemas for analytics data, metrics, and insights.
 * These schemas ensure type safety for all analytics-related data processing.
 */

import { z } from 'zod';

/**
 * Base time-series data point schema
 */
export const TimeSeriesDataPointSchema = z.object({
  timestamp: z.string().datetime(),
  value: z.number(),
  metadata: z.record(z.unknown()).optional(),
});

export type TimeSeriesDataPoint = z.infer<typeof TimeSeriesDataPointSchema>;

/**
 * Time-series data schema for metrics over time
 */
export const TimeSeriesDataSchema = z.object({
  metric: z.string().min(1, 'Metric name is required'),
  unit: z.string().optional(),
  dataPoints: z.array(TimeSeriesDataPointSchema),
  aggregation: z.enum(['sum', 'avg', 'min', 'max', 'count']).default('sum'),
  interval: z.enum(['minute', 'hour', 'day', 'week', 'month']).default('hour'),
  timezone: z.string().default('UTC'),
});

export type TimeSeriesData = z.infer<typeof TimeSeriesDataSchema>;

/**
 * Issue metrics schema for issue-related analytics
 */
export const IssueMetricsSchema = z.object({
  totalIssues: z.number().int().min(0),
  openIssues: z.number().int().min(0),
  closedIssues: z.number().int().min(0),
  avgTimeToClose: z.number().min(0), // in hours
  avgResponseTime: z.number().min(0), // in hours
  byPriority: z.record(z.string(), z.number().int().min(0)).default({}),
  byLabel: z.record(z.string(), z.number().int().min(0)).default({}),
  byAssignee: z.record(z.string(), z.number().int().min(0)).default({}),
  byMilestone: z.record(z.string(), z.number().int().min(0)).default({}),
  resolutionRate: z.number().min(0).max(100), // percentage
  reopenRate: z.number().min(0).max(100), // percentage
  createdThisPeriod: z.number().int().min(0),
  closedThisPeriod: z.number().int().min(0),
});

export type IssueMetrics = z.infer<typeof IssueMetricsSchema>;

/**
 * Repository metrics schema for repository-wide analytics
 */
export const RepositoryMetricsSchema = z.object({
  totalCommits: z.number().int().min(0),
  totalContributors: z.number().int().min(0),
  totalStars: z.number().int().min(0),
  totalForks: z.number().int().min(0),
  totalWatchers: z.number().int().min(0),
  codeFrequency: z.object({
    additions: z.number().int().min(0),
    deletions: z.number().int().min(0),
    netChanges: z.number().int(),
  }),
  languages: z.record(z.string(), z.number().min(0)).default({}),
  commitActivity: z.object({
    commitsThisWeek: z.number().int().min(0),
    commitsThisMonth: z.number().int().min(0),
    avgCommitsPerDay: z.number().min(0),
    mostActiveDay: z.string().optional(),
    mostActiveHour: z.number().int().min(0).max(23).optional(),
  }),
  contributorActivity: z.object({
    activeContributors: z.number().int().min(0),
    newContributors: z.number().int().min(0),
    topContributors: z
      .array(
        z.object({
          login: z.string(),
          commits: z.number().int().min(0),
          additions: z.number().int().min(0),
          deletions: z.number().int().min(0),
        })
      )
      .default([]),
  }),
  healthScore: z.number().min(0).max(100), // percentage
  activityLevel: z.enum(['low', 'medium', 'high']),
  popularityScore: z.number().min(0),
});

export type RepositoryMetrics = z.infer<typeof RepositoryMetricsSchema>;

/**
 * Classification result schema for AI-driven categorization
 */
export const ClassificationResultSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  confidence: z.number().min(0).max(1),
  subcategory: z.string().optional(),
  tags: z.array(z.string()).default([]),
  reasoning: z.string().optional(),
  modelVersion: z.string().default('v1.0.0'),
  processedAt: z.string().datetime(),
});

export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

/**
 * Processed issue schema with analytics enrichment
 */
export const ProcessedIssueSchema = z.object({
  id: z.number().int(),
  number: z.number().int(),
  title: z.string(),
  body: z.string().nullable(),
  state: z.enum(['open', 'closed']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  closed_at: z.string().datetime().nullable(),
  labels: z.array(z.string()).default([]),
  assignees: z.array(z.string()).default([]),
  milestone: z.string().nullable(),
  // Analytics enrichment
  classification: ClassificationResultSchema.optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  complexity: z.enum(['simple', 'moderate', 'complex']).optional(),
  timeToResolve: z.number().min(0).optional(), // in hours
  responseTime: z.number().min(0).optional(), // in hours
  interactions: z.number().int().min(0).default(0),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  duplicates: z.array(z.number().int()).default([]),
  related: z.array(z.number().int()).default([]),
});

export type ProcessedIssue = z.infer<typeof ProcessedIssueSchema>;

/**
 * Trend analysis schema for identifying patterns
 */
export const TrendAnalysisSchema = z.object({
  metric: z.string().min(1, 'Metric name is required'),
  period: z.enum(['week', 'month', 'quarter', 'year']),
  trend: z.enum(['increasing', 'decreasing', 'stable', 'volatile']),
  changePercent: z.number(),
  significance: z.enum(['low', 'medium', 'high']),
  dataPoints: z.array(TimeSeriesDataPointSchema),
  forecast: z.array(TimeSeriesDataPointSchema).optional(),
  insights: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  generatedAt: z.string().datetime(),
});

export type TrendAnalysis = z.infer<typeof TrendAnalysisSchema>;

/**
 * Insight data schema for analytical findings
 */
export const InsightDataSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['metric', 'pattern', 'anomaly', 'recommendation']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  severity: z.enum(['info', 'warning', 'critical']),
  category: z.string().min(1, 'Category is required'),
  metrics: z.record(z.string(), z.number()).default({}),
  evidence: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
  impact: z.enum(['low', 'medium', 'high']),
  actionable: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
});

export type InsightData = z.infer<typeof InsightDataSchema>;

/**
 * Analytics dashboard data schema
 */
export const AnalyticsDashboardSchema = z.object({
  summary: z.object({
    totalIssues: z.number().int().min(0),
    openIssues: z.number().int().min(0),
    closedIssues: z.number().int().min(0),
    avgResolutionTime: z.number().min(0),
    healthScore: z.number().min(0).max(100),
    activityLevel: z.enum(['low', 'medium', 'high']),
    lastUpdated: z.string().datetime(),
  }),
  charts: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum(['line', 'bar', 'pie', 'area', 'scatter']),
        title: z.string(),
        data: z.unknown(),
        config: z.record(z.unknown()).optional(),
      })
    )
    .default([]),
  metrics: z.object({
    issues: IssueMetricsSchema,
    repository: RepositoryMetricsSchema,
    trends: z.array(TrendAnalysisSchema).default([]),
  }),
  insights: z.array(InsightDataSchema).default([]),
  timeRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
    period: z.enum(['hour', 'day', 'week', 'month', 'quarter', 'year']),
  }),
  generatedAt: z.string().datetime(),
});

export type AnalyticsDashboard = z.infer<typeof AnalyticsDashboardSchema>;

/**
 * Data export schema for analytics data exports
 */
export const DataExportSchema = z.object({
  format: z.enum(['json', 'csv', 'excel', 'pdf']),
  data: z.unknown(),
  metadata: z.object({
    exportedAt: z.string().datetime(),
    exportedBy: z.string().optional(),
    timeRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    }),
    filters: z.record(z.unknown()).optional(),
    totalRecords: z.number().int().min(0),
  }),
  filename: z.string().min(1, 'Filename is required'),
  size: z.number().int().min(0), // in bytes
  checksum: z.string().optional(),
});

export type DataExport = z.infer<typeof DataExportSchema>;

/**
 * Analytics query schema for data retrieval
 */
export const AnalyticsQuerySchema = z.object({
  metrics: z.array(z.string()).min(1, 'At least one metric is required'),
  timeRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  groupBy: z.array(z.string()).optional(),
  filters: z.record(z.unknown()).optional(),
  aggregation: z.enum(['sum', 'avg', 'min', 'max', 'count']).default('sum'),
  interval: z.enum(['minute', 'hour', 'day', 'week', 'month']).default('day'),
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type AnalyticsQuery = z.infer<typeof AnalyticsQuerySchema>;

/**
 * Validation helper for analytics data
 */
export function validateAnalyticsData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): {
  success: boolean;
  data?: T;
  errors?: z.ZodError;
} {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

/**
 * Create default analytics dashboard
 */
export function createDefaultDashboard(): AnalyticsDashboard {
  const now = new Date().toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  return AnalyticsDashboardSchema.parse({
    summary: {
      totalIssues: 0,
      openIssues: 0,
      closedIssues: 0,
      avgResolutionTime: 0,
      healthScore: 0,
      activityLevel: 'low',
      lastUpdated: now,
    },
    charts: [],
    metrics: {
      issues: {
        totalIssues: 0,
        openIssues: 0,
        closedIssues: 0,
        avgTimeToClose: 0,
        avgResponseTime: 0,
        resolutionRate: 0,
        reopenRate: 0,
        createdThisPeriod: 0,
        closedThisPeriod: 0,
      },
      repository: {
        totalCommits: 0,
        totalContributors: 0,
        totalStars: 0,
        totalForks: 0,
        totalWatchers: 0,
        codeFrequency: { additions: 0, deletions: 0, netChanges: 0 },
        commitActivity: {
          commitsThisWeek: 0,
          commitsThisMonth: 0,
          avgCommitsPerDay: 0,
        },
        contributorActivity: {
          activeContributors: 0,
          newContributors: 0,
          topContributors: [],
        },
        healthScore: 0,
        activityLevel: 'low',
        popularityScore: 0,
      },
      trends: [],
    },
    insights: [],
    timeRange: {
      start: weekAgo,
      end: now,
      period: 'week',
    },
    generatedAt: now,
  });
}

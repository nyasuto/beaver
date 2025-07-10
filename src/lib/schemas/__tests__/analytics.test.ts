/**
 * Analytics Schemas Tests
 *
 * Comprehensive tests for all analytics-related Zod schemas
 */

import { describe, it, expect } from 'vitest';
import {
  TimeSeriesDataPointSchema,
  TimeSeriesDataSchema,
  IssueMetricsSchema,
  RepositoryMetricsSchema,
  ClassificationResultSchema,
  ProcessedIssueSchema,
  TrendAnalysisSchema,
  InsightDataSchema,
  AnalyticsDashboardSchema,
  DataExportSchema,
  AnalyticsQuerySchema,
  validateAnalyticsData,
  createDefaultDashboard,
  type TimeSeriesDataPoint,
  type TimeSeriesData,
  type IssueMetrics,
  type RepositoryMetrics,
  type ClassificationResult,
  type ProcessedIssue,
  type TrendAnalysis,
  type InsightData,
  type AnalyticsDashboard,
  type DataExport,
  type AnalyticsQuery,
} from '../analytics';

describe('TimeSeriesDataPointSchema', () => {
  it('should validate a valid time series data point', () => {
    const validData: TimeSeriesDataPoint = {
      timestamp: '2023-01-01T00:00:00Z',
      value: 100,
      metadata: { source: 'test' },
    };

    expect(() => TimeSeriesDataPointSchema.parse(validData)).not.toThrow();
  });

  it('should validate without metadata', () => {
    const validData = {
      timestamp: '2023-01-01T00:00:00Z',
      value: 100,
    };

    expect(() => TimeSeriesDataPointSchema.parse(validData)).not.toThrow();
  });

  it('should reject invalid timestamp', () => {
    const invalidData = {
      timestamp: 'invalid-date',
      value: 100,
    };

    expect(() => TimeSeriesDataPointSchema.parse(invalidData)).toThrow();
  });

  it('should reject non-numeric value', () => {
    const invalidData = {
      timestamp: '2023-01-01T00:00:00Z',
      value: 'not-a-number',
    };

    expect(() => TimeSeriesDataPointSchema.parse(invalidData)).toThrow();
  });
});

describe('TimeSeriesDataSchema', () => {
  it('should validate a valid time series data', () => {
    const validData: TimeSeriesData = {
      metric: 'test_metric',
      unit: 'count',
      dataPoints: [
        { timestamp: '2023-01-01T00:00:00Z', value: 100 },
        { timestamp: '2023-01-02T00:00:00Z', value: 200 },
      ],
      aggregation: 'sum',
      interval: 'hour',
      timezone: 'UTC',
    };

    expect(() => TimeSeriesDataSchema.parse(validData)).not.toThrow();
  });

  it('should use default values', () => {
    const minimalData = {
      metric: 'test_metric',
      dataPoints: [{ timestamp: '2023-01-01T00:00:00Z', value: 100 }],
    };

    const result = TimeSeriesDataSchema.parse(minimalData);
    expect(result.aggregation).toBe('sum');
    expect(result.interval).toBe('hour');
    expect(result.timezone).toBe('UTC');
  });

  it('should reject empty metric name', () => {
    const invalidData = {
      metric: '',
      dataPoints: [{ timestamp: '2023-01-01T00:00:00Z', value: 100 }],
    };

    expect(() => TimeSeriesDataSchema.parse(invalidData)).toThrow();
  });

  it('should reject invalid aggregation', () => {
    const invalidData = {
      metric: 'test_metric',
      dataPoints: [{ timestamp: '2023-01-01T00:00:00Z', value: 100 }],
      aggregation: 'invalid',
    };

    expect(() => TimeSeriesDataSchema.parse(invalidData)).toThrow();
  });
});

describe('IssueMetricsSchema', () => {
  it('should validate valid issue metrics', () => {
    const validData: IssueMetrics = {
      totalIssues: 100,
      openIssues: 30,
      closedIssues: 70,
      avgTimeToClose: 48.5,
      avgResponseTime: 2.5,
      byPriority: { high: 10, medium: 20, low: 70 },
      byLabel: { bug: 30, enhancement: 40 },
      byAssignee: { user1: 20, user2: 15 },
      byMilestone: { 'v1.0': 50, 'v2.0': 30 },
      resolutionRate: 85.5,
      reopenRate: 5.2,
      createdThisPeriod: 25,
      closedThisPeriod: 28,
    };

    expect(() => IssueMetricsSchema.parse(validData)).not.toThrow();
  });

  it('should use default empty objects', () => {
    const minimalData = {
      totalIssues: 100,
      openIssues: 30,
      closedIssues: 70,
      avgTimeToClose: 48.5,
      avgResponseTime: 2.5,
      resolutionRate: 85.5,
      reopenRate: 5.2,
      createdThisPeriod: 25,
      closedThisPeriod: 28,
    };

    const result = IssueMetricsSchema.parse(minimalData);
    expect(result.byPriority).toEqual({});
    expect(result.byLabel).toEqual({});
    expect(result.byAssignee).toEqual({});
    expect(result.byMilestone).toEqual({});
  });

  it('should reject negative values', () => {
    const invalidData = {
      totalIssues: -1,
      openIssues: 30,
      closedIssues: 70,
      avgTimeToClose: 48.5,
      avgResponseTime: 2.5,
      resolutionRate: 85.5,
      reopenRate: 5.2,
      createdThisPeriod: 25,
      closedThisPeriod: 28,
    };

    expect(() => IssueMetricsSchema.parse(invalidData)).toThrow();
  });

  it('should reject percentage values over 100', () => {
    const invalidData = {
      totalIssues: 100,
      openIssues: 30,
      closedIssues: 70,
      avgTimeToClose: 48.5,
      avgResponseTime: 2.5,
      resolutionRate: 150, // Invalid: over 100%
      reopenRate: 5.2,
      createdThisPeriod: 25,
      closedThisPeriod: 28,
    };

    expect(() => IssueMetricsSchema.parse(invalidData)).toThrow();
  });
});

describe('RepositoryMetricsSchema', () => {
  it('should validate valid repository metrics', () => {
    const validData: RepositoryMetrics = {
      totalCommits: 1000,
      totalContributors: 10,
      totalStars: 50,
      totalForks: 15,
      totalWatchers: 25,
      codeFrequency: {
        additions: 5000,
        deletions: 2000,
        netChanges: 3000,
      },
      languages: { typescript: 70, javascript: 20, css: 10 },
      commitActivity: {
        commitsThisWeek: 15,
        commitsThisMonth: 60,
        avgCommitsPerDay: 2.5,
        mostActiveDay: 'Monday',
        mostActiveHour: 14,
      },
      contributorActivity: {
        activeContributors: 5,
        newContributors: 2,
        topContributors: [
          { login: 'user1', commits: 100, additions: 1000, deletions: 500 },
          { login: 'user2', commits: 80, additions: 800, deletions: 400 },
        ],
      },
      healthScore: 85,
      activityLevel: 'high',
      popularityScore: 75.5,
    };

    expect(() => RepositoryMetricsSchema.parse(validData)).not.toThrow();
  });

  it('should use default empty objects and arrays', () => {
    const minimalData = {
      totalCommits: 1000,
      totalContributors: 10,
      totalStars: 50,
      totalForks: 15,
      totalWatchers: 25,
      codeFrequency: {
        additions: 5000,
        deletions: 2000,
        netChanges: 3000,
      },
      commitActivity: {
        commitsThisWeek: 15,
        commitsThisMonth: 60,
        avgCommitsPerDay: 2.5,
      },
      contributorActivity: {
        activeContributors: 5,
        newContributors: 2,
      },
      healthScore: 85,
      activityLevel: 'high',
      popularityScore: 75.5,
    };

    const result = RepositoryMetricsSchema.parse(minimalData);
    expect(result.languages).toEqual({});
    expect(result.contributorActivity.topContributors).toEqual([]);
  });

  it('should reject invalid activity level', () => {
    const invalidData = {
      totalCommits: 1000,
      totalContributors: 10,
      totalStars: 50,
      totalForks: 15,
      totalWatchers: 25,
      codeFrequency: {
        additions: 5000,
        deletions: 2000,
        netChanges: 3000,
      },
      commitActivity: {
        commitsThisWeek: 15,
        commitsThisMonth: 60,
        avgCommitsPerDay: 2.5,
      },
      contributorActivity: {
        activeContributors: 5,
        newContributors: 2,
      },
      healthScore: 85,
      activityLevel: 'invalid', // Invalid value
      popularityScore: 75.5,
    };

    expect(() => RepositoryMetricsSchema.parse(invalidData)).toThrow();
  });

  it('should reject invalid hour value', () => {
    const invalidData = {
      totalCommits: 1000,
      totalContributors: 10,
      totalStars: 50,
      totalForks: 15,
      totalWatchers: 25,
      codeFrequency: {
        additions: 5000,
        deletions: 2000,
        netChanges: 3000,
      },
      commitActivity: {
        commitsThisWeek: 15,
        commitsThisMonth: 60,
        avgCommitsPerDay: 2.5,
        mostActiveHour: 25, // Invalid: hour must be 0-23
      },
      contributorActivity: {
        activeContributors: 5,
        newContributors: 2,
      },
      healthScore: 85,
      activityLevel: 'high',
      popularityScore: 75.5,
    };

    expect(() => RepositoryMetricsSchema.parse(invalidData)).toThrow();
  });
});

describe('ClassificationResultSchema', () => {
  it('should validate valid classification result', () => {
    const validData: ClassificationResult = {
      category: 'bug',
      confidence: 0.95,
      subcategory: 'ui-bug',
      tags: ['frontend', 'css'],
      reasoning: 'Based on keywords and context',
      modelVersion: 'v1.2.0',
      processedAt: '2023-01-01T00:00:00Z',
    };

    expect(() => ClassificationResultSchema.parse(validData)).not.toThrow();
  });

  it('should use default values', () => {
    const minimalData = {
      category: 'bug',
      confidence: 0.95,
      processedAt: '2023-01-01T00:00:00Z',
    };

    const result = ClassificationResultSchema.parse(minimalData);
    expect(result.tags).toEqual([]);
    expect(result.modelVersion).toBe('v1.0.0');
  });

  it('should reject empty category', () => {
    const invalidData = {
      category: '',
      confidence: 0.95,
      processedAt: '2023-01-01T00:00:00Z',
    };

    expect(() => ClassificationResultSchema.parse(invalidData)).toThrow();
  });

  it('should reject confidence outside 0-1 range', () => {
    const invalidData = {
      category: 'bug',
      confidence: 1.5, // Invalid: over 1
      processedAt: '2023-01-01T00:00:00Z',
    };

    expect(() => ClassificationResultSchema.parse(invalidData)).toThrow();
  });
});

describe('ProcessedIssueSchema', () => {
  it('should validate valid processed issue', () => {
    const validData: ProcessedIssue = {
      id: 123,
      number: 456,
      title: 'Test Issue',
      body: 'Issue description',
      state: 'open',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T12:00:00Z',
      closed_at: null,
      labels: ['bug', 'frontend'],
      assignees: ['user1', 'user2'],
      milestone: 'v1.0',
      classification: {
        category: 'bug',
        confidence: 0.95,
        tags: [],
        modelVersion: 'v1.0.0',
        processedAt: '2023-01-01T00:00:00Z',
      },
      priority: 'high',
      complexity: 'moderate',
      timeToResolve: 24.5,
      responseTime: 2.5,
      interactions: 10,
      sentiment: 'neutral',
      duplicates: [789, 12],
      related: [345, 678],
    };

    expect(() => ProcessedIssueSchema.parse(validData)).not.toThrow();
  });

  it('should use default empty arrays', () => {
    const minimalData = {
      id: 123,
      number: 456,
      title: 'Test Issue',
      body: 'Issue description',
      state: 'open',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T12:00:00Z',
      closed_at: null,
      milestone: null,
    };

    const result = ProcessedIssueSchema.parse(minimalData);
    expect(result.labels).toEqual([]);
    expect(result.assignees).toEqual([]);
    expect(result.interactions).toBe(0);
    expect(result.duplicates).toEqual([]);
    expect(result.related).toEqual([]);
  });

  it('should reject invalid state', () => {
    const invalidData = {
      id: 123,
      number: 456,
      title: 'Test Issue',
      body: 'Issue description',
      state: 'invalid', // Invalid state
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T12:00:00Z',
      closed_at: null,
      milestone: null,
    };

    expect(() => ProcessedIssueSchema.parse(invalidData)).toThrow();
  });
});

describe('TrendAnalysisSchema', () => {
  it('should validate valid trend analysis', () => {
    const validData: TrendAnalysis = {
      metric: 'issue_count',
      period: 'month',
      trend: 'increasing',
      changePercent: 15.5,
      significance: 'high',
      dataPoints: [
        { timestamp: '2023-01-01T00:00:00Z', value: 100 },
        { timestamp: '2023-01-02T00:00:00Z', value: 115 },
      ],
      forecast: [{ timestamp: '2023-01-03T00:00:00Z', value: 130 }],
      insights: ['Issue count is trending upward'],
      recommendations: ['Consider increasing team capacity'],
      generatedAt: '2023-01-01T00:00:00Z',
    };

    expect(() => TrendAnalysisSchema.parse(validData)).not.toThrow();
  });

  it('should use default empty arrays', () => {
    const minimalData = {
      metric: 'issue_count',
      period: 'month',
      trend: 'increasing',
      changePercent: 15.5,
      significance: 'high',
      dataPoints: [{ timestamp: '2023-01-01T00:00:00Z', value: 100 }],
      generatedAt: '2023-01-01T00:00:00Z',
    };

    const result = TrendAnalysisSchema.parse(minimalData);
    expect(result.insights).toEqual([]);
    expect(result.recommendations).toEqual([]);
  });

  it('should reject empty metric name', () => {
    const invalidData = {
      metric: '',
      period: 'month',
      trend: 'increasing',
      changePercent: 15.5,
      significance: 'high',
      dataPoints: [{ timestamp: '2023-01-01T00:00:00Z', value: 100 }],
      generatedAt: '2023-01-01T00:00:00Z',
    };

    expect(() => TrendAnalysisSchema.parse(invalidData)).toThrow();
  });
});

describe('InsightDataSchema', () => {
  it('should validate valid insight data', () => {
    const validData: InsightData = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'metric',
      title: 'High Issue Volume',
      description: 'Issue creation rate has increased significantly',
      severity: 'warning',
      category: 'performance',
      metrics: { issue_count: 150, growth_rate: 25.5 },
      evidence: ['Issue count: 150', 'Growth rate: 25.5%'],
      recommendations: ['Scale team', 'Improve processes'],
      confidence: 0.95,
      impact: 'high',
      actionable: true,
      tags: ['issues', 'performance'],
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T12:00:00Z',
      expiresAt: '2023-01-08T00:00:00Z',
    };

    expect(() => InsightDataSchema.parse(validData)).not.toThrow();
  });

  it('should use default values', () => {
    const minimalData = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'metric',
      title: 'High Issue Volume',
      description: 'Issue creation rate has increased significantly',
      severity: 'warning',
      category: 'performance',
      confidence: 0.95,
      impact: 'high',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T12:00:00Z',
    };

    const result = InsightDataSchema.parse(minimalData);
    expect(result.metrics).toEqual({});
    expect(result.evidence).toEqual([]);
    expect(result.recommendations).toEqual([]);
    expect(result.actionable).toBe(false);
    expect(result.tags).toEqual([]);
  });

  it('should reject invalid UUID', () => {
    const invalidData = {
      id: 'invalid-uuid',
      type: 'metric',
      title: 'High Issue Volume',
      description: 'Issue creation rate has increased significantly',
      severity: 'warning',
      category: 'performance',
      confidence: 0.95,
      impact: 'high',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T12:00:00Z',
    };

    expect(() => InsightDataSchema.parse(invalidData)).toThrow();
  });
});

describe('AnalyticsDashboardSchema', () => {
  it('should validate valid analytics dashboard', () => {
    const validData: AnalyticsDashboard = {
      summary: {
        totalIssues: 100,
        openIssues: 30,
        closedIssues: 70,
        avgResolutionTime: 48.5,
        healthScore: 85,
        activityLevel: 'high',
        lastUpdated: '2023-01-01T00:00:00Z',
      },
      charts: [
        {
          id: 'chart-1',
          type: 'line',
          title: 'Issue Trends',
          data: { labels: ['Jan', 'Feb'], values: [10, 20] },
          config: { color: 'blue' },
        },
      ],
      metrics: {
        issues: {
          totalIssues: 100,
          openIssues: 30,
          closedIssues: 70,
          avgTimeToClose: 48.5,
          avgResponseTime: 2.5,
          byPriority: {},
          byLabel: {},
          byAssignee: {},
          byMilestone: {},
          resolutionRate: 70,
          reopenRate: 5,
          createdThisPeriod: 25,
          closedThisPeriod: 28,
        },
        repository: {
          totalCommits: 1000,
          totalContributors: 10,
          totalStars: 50,
          totalForks: 15,
          totalWatchers: 25,
          codeFrequency: {
            additions: 5000,
            deletions: 2000,
            netChanges: 3000,
          },
          commitActivity: {
            commitsThisWeek: 15,
            commitsThisMonth: 60,
            avgCommitsPerDay: 2.5,
          },
          contributorActivity: {
            activeContributors: 5,
            newContributors: 2,
            topContributors: [],
          },
          languages: {},
          healthScore: 85,
          activityLevel: 'high',
          popularityScore: 75.5,
        },
        trends: [],
      },
      insights: [],
      timeRange: {
        start: '2023-01-01T00:00:00Z',
        end: '2023-01-08T00:00:00Z',
        period: 'week',
      },
      generatedAt: '2023-01-01T00:00:00Z',
    };

    expect(() => AnalyticsDashboardSchema.parse(validData)).not.toThrow();
  });

  it('should use default empty arrays', () => {
    const minimalData = {
      summary: {
        totalIssues: 100,
        openIssues: 30,
        closedIssues: 70,
        avgResolutionTime: 48.5,
        healthScore: 85,
        activityLevel: 'high',
        lastUpdated: '2023-01-01T00:00:00Z',
      },
      metrics: {
        issues: {
          totalIssues: 100,
          openIssues: 30,
          closedIssues: 70,
          avgTimeToClose: 48.5,
          avgResponseTime: 2.5,
          byPriority: {},
          byLabel: {},
          byAssignee: {},
          byMilestone: {},
          resolutionRate: 70,
          reopenRate: 5,
          createdThisPeriod: 25,
          closedThisPeriod: 28,
        },
        repository: {
          totalCommits: 1000,
          totalContributors: 10,
          totalStars: 50,
          totalForks: 15,
          totalWatchers: 25,
          codeFrequency: {
            additions: 5000,
            deletions: 2000,
            netChanges: 3000,
          },
          commitActivity: {
            commitsThisWeek: 15,
            commitsThisMonth: 60,
            avgCommitsPerDay: 2.5,
          },
          contributorActivity: {
            activeContributors: 5,
            newContributors: 2,
            topContributors: [],
          },
          healthScore: 85,
          activityLevel: 'high',
          popularityScore: 75.5,
        },
      },
      timeRange: {
        start: '2023-01-01T00:00:00Z',
        end: '2023-01-08T00:00:00Z',
        period: 'week',
      },
      generatedAt: '2023-01-01T00:00:00Z',
    };

    const result = AnalyticsDashboardSchema.parse(minimalData);
    expect(result.charts).toEqual([]);
    expect(result.insights).toEqual([]);
    expect(result.metrics.trends).toEqual([]);
  });
});

describe('DataExportSchema', () => {
  it('should validate valid data export', () => {
    const validData: DataExport = {
      format: 'json',
      data: { issues: [1, 2, 3] },
      metadata: {
        exportedAt: '2023-01-01T00:00:00Z',
        exportedBy: 'user1',
        timeRange: {
          start: '2023-01-01T00:00:00Z',
          end: '2023-01-08T00:00:00Z',
        },
        filters: { state: 'open' },
        totalRecords: 100,
      },
      filename: 'export.json',
      size: 1024,
      checksum: 'abc123',
    };

    expect(() => DataExportSchema.parse(validData)).not.toThrow();
  });

  it('should reject empty filename', () => {
    const invalidData = {
      format: 'json',
      data: { issues: [1, 2, 3] },
      metadata: {
        exportedAt: '2023-01-01T00:00:00Z',
        timeRange: {
          start: '2023-01-01T00:00:00Z',
          end: '2023-01-08T00:00:00Z',
        },
        totalRecords: 100,
      },
      filename: '',
      size: 1024,
    };

    expect(() => DataExportSchema.parse(invalidData)).toThrow();
  });
});

describe('AnalyticsQuerySchema', () => {
  it('should validate valid analytics query', () => {
    const validData: AnalyticsQuery = {
      metrics: ['issue_count', 'resolution_time'],
      timeRange: {
        start: '2023-01-01T00:00:00Z',
        end: '2023-01-08T00:00:00Z',
      },
      groupBy: ['label', 'assignee'],
      filters: { state: 'open' },
      aggregation: 'avg',
      interval: 'day',
      limit: 50,
      offset: 0,
      sortBy: 'timestamp',
      sortOrder: 'desc',
    };

    expect(() => AnalyticsQuerySchema.parse(validData)).not.toThrow();
  });

  it('should use default values', () => {
    const minimalData = {
      metrics: ['issue_count'],
      timeRange: {
        start: '2023-01-01T00:00:00Z',
        end: '2023-01-08T00:00:00Z',
      },
    };

    const result = AnalyticsQuerySchema.parse(minimalData);
    expect(result.aggregation).toBe('sum');
    expect(result.interval).toBe('day');
    expect(result.limit).toBe(100);
    expect(result.offset).toBe(0);
    expect(result.sortOrder).toBe('desc');
  });

  it('should reject empty metrics array', () => {
    const invalidData = {
      metrics: [],
      timeRange: {
        start: '2023-01-01T00:00:00Z',
        end: '2023-01-08T00:00:00Z',
      },
    };

    expect(() => AnalyticsQuerySchema.parse(invalidData)).toThrow();
  });

  it('should reject limit over 1000', () => {
    const invalidData = {
      metrics: ['issue_count'],
      timeRange: {
        start: '2023-01-01T00:00:00Z',
        end: '2023-01-08T00:00:00Z',
      },
      limit: 1001,
    };

    expect(() => AnalyticsQuerySchema.parse(invalidData)).toThrow();
  });
});

describe('validateAnalyticsData', () => {
  it('should return success for valid data', () => {
    const validData = {
      timestamp: '2023-01-01T00:00:00Z',
      value: 100,
    };

    const result = validateAnalyticsData(TimeSeriesDataPointSchema, validData);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(validData);
  });

  it('should return error for invalid data', () => {
    const invalidData = {
      timestamp: 'invalid-date',
      value: 100,
    };

    const result = validateAnalyticsData(TimeSeriesDataPointSchema, invalidData);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it('should throw for non-Zod errors', () => {
    const mockSchema = {
      parse: () => {
        throw new Error('Non-Zod error');
      },
    } as any;

    expect(() => validateAnalyticsData(mockSchema, {})).toThrow('Non-Zod error');
  });
});

describe('createDefaultDashboard', () => {
  it('should create a valid default dashboard', () => {
    const dashboard = createDefaultDashboard();
    expect(() => AnalyticsDashboardSchema.parse(dashboard)).not.toThrow();
  });

  it('should set default values correctly', () => {
    const dashboard = createDefaultDashboard();
    expect(dashboard.summary.totalIssues).toBe(0);
    expect(dashboard.summary.activityLevel).toBe('low');
    expect(dashboard.charts).toEqual([]);
    expect(dashboard.insights).toEqual([]);
    expect(dashboard.metrics.trends).toEqual([]);
  });

  it('should set time range to last week', () => {
    const dashboard = createDefaultDashboard();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    expect(dashboard.timeRange.period).toBe('week');
    expect(new Date(dashboard.timeRange.end).getTime()).toBeCloseTo(now.getTime(), -1000);
    expect(new Date(dashboard.timeRange.start).getTime()).toBeCloseTo(weekAgo.getTime(), -1000);
  });
});

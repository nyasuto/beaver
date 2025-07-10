/**
 * Analytics Engine Tests
 *
 * Tests for trend analysis, performance metrics, and insight generation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AnalyticsEngine, type TimeSeriesPoint, type IssueClassification } from '../engine';
import type { Issue } from '../../schemas/github';

describe('AnalyticsEngine', () => {
  let engine: AnalyticsEngine;
  let mockIssues: Issue[];
  let mockClassifications: IssueClassification[];

  beforeEach(() => {
    engine = new AnalyticsEngine();

    // Create mock issues
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    mockIssues = [
      {
        id: 1,
        node_id: 'node1',
        number: 1,
        title: 'Bug in authentication',
        body: 'Authentication fails',
        state: 'closed' as const,
        created_at: threeDaysAgo.toISOString(),
        updated_at: oneDayAgo.toISOString(),
        closed_at: oneDayAgo.toISOString(),
        labels: [
          { id: 1, name: 'bug', color: 'red', description: null, default: false, node_id: 'node1' },
        ],
        user: {
          id: 1,
          login: 'user1',
          avatar_url: '',
          html_url: '',
          url: '',
          type: 'User',
          node_id: 'user1',
          gravatar_id: null,
          site_admin: false,
        },
        html_url: '',
        url: '',
        repository_url: '',
        labels_url: '',
        comments_url: '',
        events_url: '',
        assignee: null,
        assignees: [],
        milestone: null,
        comments: 0,
        locked: false,
        author_association: 'OWNER',
        active_lock_reason: null,
      },
      {
        id: 2,
        node_id: 'node2',
        number: 2,
        title: 'Feature request: Dark mode',
        body: 'Add dark mode support',
        state: 'open' as const,
        created_at: thirtyDaysAgo.toISOString(),
        updated_at: now.toISOString(),
        closed_at: null,
        labels: [
          {
            id: 2,
            name: 'feature',
            color: 'blue',
            description: null,
            default: false,
            node_id: 'node2',
          },
        ],
        user: {
          id: 2,
          login: 'user2',
          avatar_url: '',
          html_url: '',
          url: '',
          type: 'User',
          node_id: 'user2',
          gravatar_id: null,
          site_admin: false,
        },
        html_url: '',
        url: '',
        repository_url: '',
        labels_url: '',
        comments_url: '',
        events_url: '',
        assignee: null,
        assignees: [],
        milestone: null,
        comments: 5,
        locked: false,
        author_association: 'CONTRIBUTOR',
        active_lock_reason: null,
      },
      {
        id: 3,
        node_id: 'node3',
        number: 3,
        title: 'Documentation update needed',
        body: 'Update API docs',
        state: 'open' as const,
        created_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: now.toISOString(),
        closed_at: null,
        labels: [
          {
            id: 3,
            name: 'documentation',
            color: 'green',
            description: null,
            default: false,
            node_id: 'node3',
          },
        ],
        user: {
          id: 3,
          login: 'user3',
          avatar_url: '',
          html_url: '',
          url: '',
          type: 'User',
          node_id: 'user3',
          gravatar_id: null,
          site_admin: false,
        },
        html_url: '',
        url: '',
        repository_url: '',
        labels_url: '',
        comments_url: '',
        events_url: '',
        assignee: null,
        assignees: [],
        milestone: null,
        comments: 2,
        locked: false,
        author_association: 'CONTRIBUTOR',
        active_lock_reason: null,
      },
    ];

    // Create mock classifications
    mockClassifications = [
      {
        issueId: 1,
        issueNumber: 1,
        classifications: [
          {
            category: 'bug',
            confidence: 0.9,
            reasons: ['Title contains "bug"'],
            keywords: ['bug'],
          },
        ],
        primaryCategory: 'bug',
        primaryConfidence: 0.9,
        estimatedPriority: 'high',
        priorityConfidence: 0.8,
        processingTimeMs: 50,
        version: '1.0.0',
        metadata: {
          titleLength: 20,
          bodyLength: 20,
          hasCodeBlocks: false,
          hasStepsToReproduce: false,
          hasExpectedBehavior: false,
          labelCount: 1,
          existingLabels: ['bug'],
        },
      },
      {
        issueId: 2,
        issueNumber: 2,
        classifications: [
          {
            category: 'feature',
            confidence: 0.8,
            reasons: ['Title contains "feature"'],
            keywords: ['feature'],
          },
        ],
        primaryCategory: 'feature',
        primaryConfidence: 0.8,
        estimatedPriority: 'medium',
        priorityConfidence: 0.7,
        processingTimeMs: 45,
        version: '1.0.0',
        metadata: {
          titleLength: 25,
          bodyLength: 20,
          hasCodeBlocks: false,
          hasStepsToReproduce: false,
          hasExpectedBehavior: false,
          labelCount: 1,
          existingLabels: ['feature'],
        },
      },
    ];
  });

  describe('Trend Analysis', () => {
    it('should detect increasing trends', () => {
      const data: TimeSeriesPoint[] = [
        { timestamp: new Date('2023-01-01'), value: 1 },
        { timestamp: new Date('2023-01-02'), value: 2 },
        { timestamp: new Date('2023-01-03'), value: 3 },
        { timestamp: new Date('2023-01-04'), value: 4 },
        { timestamp: new Date('2023-01-05'), value: 5 },
      ];

      const result = engine.analyzeTrends(data);

      expect(result.direction).toBe('increasing');
      expect(result.slope).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should detect decreasing trends', () => {
      const data: TimeSeriesPoint[] = [
        { timestamp: new Date('2023-01-01'), value: 10 },
        { timestamp: new Date('2023-01-02'), value: 8 },
        { timestamp: new Date('2023-01-03'), value: 6 },
        { timestamp: new Date('2023-01-04'), value: 4 },
        { timestamp: new Date('2023-01-05'), value: 2 },
      ];

      const result = engine.analyzeTrends(data);

      expect(result.direction).toBe('decreasing');
      expect(result.slope).toBeLessThan(0);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should detect stable trends', () => {
      const data: TimeSeriesPoint[] = [
        { timestamp: new Date('2023-01-01'), value: 5 },
        { timestamp: new Date('2023-01-02'), value: 5 },
        { timestamp: new Date('2023-01-03'), value: 5 },
        { timestamp: new Date('2023-01-04'), value: 5 },
        { timestamp: new Date('2023-01-05'), value: 5 },
      ];

      const result = engine.analyzeTrends(data);

      expect(result.direction).toBe('stable');
      expect(Math.abs(result.slope)).toBeLessThan(0.01);
    });

    it('should handle insufficient data', () => {
      const data: TimeSeriesPoint[] = [
        { timestamp: new Date('2023-01-01'), value: 1 },
        { timestamp: new Date('2023-01-02'), value: 2 },
      ];

      const result = engine.analyzeTrends(data);

      expect(result.direction).toBe('stable');
      expect(result.confidence).toBe(0);
    });

    it('should make predictions', () => {
      const data: TimeSeriesPoint[] = [
        { timestamp: new Date('2023-01-01'), value: 1 },
        { timestamp: new Date('2023-01-02'), value: 2 },
        { timestamp: new Date('2023-01-03'), value: 3 },
        { timestamp: new Date('2023-01-04'), value: 4 },
      ];

      const result = engine.analyzeTrends(data);

      expect(result.prediction.nextPeriod).toBeCloseTo(5, 0);
      expect(result.prediction.confidence).toBeGreaterThan(0);
    });
  });

  describe('Performance Metrics', () => {
    it('should calculate basic metrics', () => {
      const metrics = engine.calculatePerformanceMetrics(mockIssues);

      expect(metrics.backlogSize).toBe(2); // 2 open issues
      expect(metrics.resolutionRate).toBeGreaterThan(0);
      expect(metrics.averageResolutionTime).toBeGreaterThan(0);
    });

    it('should handle empty issue list', () => {
      const metrics = engine.calculatePerformanceMetrics([]);

      expect(metrics.backlogSize).toBe(0);
      expect(metrics.averageResolutionTime).toBe(0);
      expect(metrics.medianResolutionTime).toBe(0);
      expect(metrics.resolutionRate).toBe(0);
    });

    it('should calculate resolution times correctly', () => {
      const firstMockIssue = mockIssues[0];
      if (!firstMockIssue) {
        throw new Error('Mock issue not properly initialized');
      }

      const closedIssue: Issue = {
        ...firstMockIssue,
        state: 'closed' as const,
        created_at: '2023-01-01T00:00:00Z',
        closed_at: '2023-01-02T00:00:00Z', // 24 hours later
      };

      const metrics = engine.calculatePerformanceMetrics([closedIssue]);

      expect(metrics.averageResolutionTime).toBeCloseTo(24, 0); // 24 hours
    });

    it('should calculate throughput', () => {
      const metrics = engine.calculatePerformanceMetrics(mockIssues);

      expect(metrics.throughput).toBeGreaterThanOrEqual(0);
      expect(metrics.burndownRate).toEqual(metrics.throughput);
    });
  });

  describe('Classification Metrics', () => {
    it('should generate classification metrics', () => {
      const metrics = engine.generateClassificationMetrics(mockClassifications);

      expect(metrics.totalClassified).toBe(2);
      expect(metrics.averageConfidence).toBeCloseTo(0.85, 1);
      expect(metrics.categoryDistribution.bug).toBe(1);
      expect(metrics.categoryDistribution.feature).toBe(1);
      expect(metrics.priorityDistribution.high).toBe(1);
      expect(metrics.priorityDistribution.medium).toBe(1);
    });

    it('should handle empty classifications', () => {
      const metrics = engine.generateClassificationMetrics([]);

      expect(metrics.totalClassified).toBe(0);
      expect(metrics.averageConfidence).toBe(0);
      expect(Object.keys(metrics.categoryDistribution)).toHaveLength(0);
    });

    it('should calculate processing statistics', () => {
      const metrics = engine.generateClassificationMetrics(mockClassifications);

      expect(metrics.processingStats.averageTimeMs).toBe(47.5);
      expect(metrics.processingStats.minTimeMs).toBe(45);
      expect(metrics.processingStats.maxTimeMs).toBe(50);
      expect(metrics.processingStats.totalTimeMs).toBe(95);
    });
  });

  describe('Insight Generation', () => {
    it('should generate comprehensive insights', () => {
      const insights = engine.generateInsights(mockIssues, mockClassifications);

      expect(insights.summary).toContain('3 total issues');
      expect(insights.metrics.totalIssues).toBe(3);
      expect(insights.metrics.openIssues).toBe(2);
      expect(insights.metrics.closedIssues).toBe(1);
      expect(insights.keyFindings).toBeDefined();
      expect(insights.recommendations).toBeDefined();
    });

    it('should identify resolution rate issues', () => {
      // Create mostly open issues
      const firstMockIssue = mockIssues[1];
      const secondMockIssue = mockIssues[0];

      if (!firstMockIssue || !secondMockIssue) {
        throw new Error('Mock issues not properly initialized');
      }

      const mostlyOpenIssues: Issue[] = Array(10)
        .fill(null)
        .map((_, i) => ({
          ...firstMockIssue,
          id: i + 1,
          number: i + 1,
          state: 'open' as const,
        }));
      mostlyOpenIssues.push({ ...secondMockIssue, state: 'closed' as const }); // One closed issue

      const insights = engine.generateInsights(mostlyOpenIssues, []);

      expect(insights.keyFindings.some(finding => finding.includes('Low resolution rate'))).toBe(
        true
      );
    });

    it('should identify aging issues', () => {
      // Create old open issues
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);

      const secondMockIssue = mockIssues[1];
      if (!secondMockIssue) {
        throw new Error('Mock issue not properly initialized');
      }

      const oldIssues = [
        {
          ...secondMockIssue,
          created_at: oldDate.toISOString(),
        },
      ];

      const insights = engine.generateInsights(oldIssues, []);

      expect(insights.riskFactors.some(risk => risk.includes('aging'))).toBe(true);
    });

    it('should provide category-specific insights', () => {
      const firstMockClassification = mockClassifications[0];
      if (!firstMockClassification) {
        throw new Error('Mock classification not properly initialized');
      }

      const bugHeavyClassifications = Array(5)
        .fill(null)
        .map((_, i) => ({
          ...firstMockClassification,
          issueId: i + 1,
          issueNumber: i + 1,
        }));

      const insights = engine.generateInsights(mockIssues, bugHeavyClassifications);

      expect(insights.keyFindings.some(finding => finding.includes('bug'))).toBe(true);
    });
  });

  describe('Time Series Generation', () => {
    it('should generate time series data', () => {
      const timeSeries = engine.generateTimeSeries(mockIssues, 30);

      expect(timeSeries).toHaveLength(30);
      expect(timeSeries[0]?.timestamp).toBeDefined();
      expect(timeSeries[0]?.value).toBeGreaterThanOrEqual(0);
    });

    it('should count issues within time window', () => {
      const timeSeries = engine.generateTimeSeries(mockIssues, 7);

      // Should have exactly 7 data points
      expect(timeSeries).toHaveLength(7);

      // Recent issues should be counted
      const totalIssues = timeSeries.reduce((sum, point) => sum + point.value, 0);
      expect(totalIssues).toBeGreaterThanOrEqual(1); // At least one recent issue
    });

    it('should handle empty issue list', () => {
      const timeSeries = engine.generateTimeSeries([], 30);

      expect(timeSeries).toHaveLength(30);
      expect(timeSeries.every(point => point.value === 0)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle issues without dates', () => {
      const firstMockIssue = mockIssues[0];
      if (!firstMockIssue) {
        throw new Error('Mock issue not properly initialized');
      }

      const invalidIssue = {
        ...firstMockIssue,
        created_at: '',
        updated_at: '',
        closed_at: null,
      };

      expect(() => {
        engine.calculatePerformanceMetrics([invalidIssue]);
      }).not.toThrow();
    });

    it('should handle issues with future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const firstMockIssue = mockIssues[0];
      if (!firstMockIssue) {
        throw new Error('Mock issue not properly initialized');
      }

      const futureIssue = {
        ...firstMockIssue,
        created_at: futureDate.toISOString(),
      };

      const metrics = engine.calculatePerformanceMetrics([futureIssue]);
      expect(metrics).toBeDefined();
    });
  });
});

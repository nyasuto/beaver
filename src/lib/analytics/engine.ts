/**
 * Analytics Engine
 *
 * This module provides comprehensive analytics capabilities for GitHub issues,
 * including trend analysis, performance metrics, and insight generation.
 *
 * @module AnalyticsEngine
 */

import type { Issue } from '../schemas/github';
import type {
  IssueClassification,
  ClassificationMetrics,
  ClassificationCategory,
  PriorityLevel,
} from '../schemas/classification';

// Export types for external use
export type { IssueClassification, ClassificationMetrics, ClassificationCategory, PriorityLevel };

/**
 * Time series data point
 */
export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
  category?: string;
}

/**
 * Trend analysis result
 */
export interface TrendAnalysis {
  direction: 'increasing' | 'decreasing' | 'stable';
  confidence: number;
  slope: number;
  rSquared: number;
  prediction: {
    nextPeriod: number;
    confidence: number;
  };
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  averageResolutionTime: number; // in hours
  medianResolutionTime: number;
  resolutionRate: number; // percentage
  responseTime: number; // time to first response in hours
  throughput: number; // issues resolved per day
  backlogSize: number;
  burndownRate: number; // issues resolved per day
}

/**
 * Issue insights
 */
export interface IssueInsights {
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  riskFactors: string[];
  opportunities: string[];
  metrics: {
    totalIssues: number;
    openIssues: number;
    closedIssues: number;
    averageAge: number; // in days
    oldestIssue: number; // in days
  };
}

/**
 * Analytics Engine for issue data analysis
 */
export class AnalyticsEngine {
  /**
   * Analyze trends in issue data
   */
  analyzeTrends(data: TimeSeriesPoint[]): TrendAnalysis {
    if (data.length < 3) {
      return {
        direction: 'stable',
        confidence: 0,
        slope: 0,
        rSquared: 0,
        prediction: { nextPeriod: data[data.length - 1]?.value || 0, confidence: 0 },
      };
    }

    // Sort data by timestamp
    const sortedData = data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Convert timestamps to numeric values (days since first point)
    const firstTimestamp = sortedData[0]!.timestamp.getTime();
    const points = sortedData.map(point => ({
      x: (point.timestamp.getTime() - firstTimestamp) / (1000 * 60 * 60 * 24), // days
      y: point.value,
    }));

    // Calculate linear regression
    const n = points.length;
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const meanY = sumY / n;
    const ssRes = points.reduce((sum, p) => {
      const predicted = slope * p.x + intercept;
      return sum + Math.pow(p.y - predicted, 2);
    }, 0);
    const ssTot = points.reduce((sum, p) => sum + Math.pow(p.y - meanY, 2), 0);
    const rSquared = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

    // Determine trend direction
    let direction: 'increasing' | 'decreasing' | 'stable';
    const confidence = Math.abs(rSquared);

    if (Math.abs(slope) < 0.01 || confidence < 0.3) {
      direction = 'stable';
    } else if (slope > 0) {
      direction = 'increasing';
    } else {
      direction = 'decreasing';
    }

    // Predict next period
    const lastX = points[points.length - 1]!.x;
    const nextPeriodValue = slope * (lastX + 1) + intercept;

    return {
      direction,
      confidence,
      slope,
      rSquared,
      prediction: {
        nextPeriod: Math.max(0, nextPeriodValue),
        confidence: Math.min(confidence, 1),
      },
    };
  }

  /**
   * Calculate performance metrics from issues
   */
  calculatePerformanceMetrics(issues: Issue[]): PerformanceMetrics {
    const now = new Date();
    const openIssues = issues.filter(issue => issue.state === 'open');
    const closedIssues = issues.filter(issue => issue.state === 'closed');

    // Calculate resolution times for closed issues
    const resolutionTimes = closedIssues
      .filter(issue => issue.closed_at)
      .map(issue => {
        const created = new Date(issue.created_at);
        const closed = new Date(issue.closed_at as string);
        return (closed.getTime() - created.getTime()) / (1000 * 60 * 60); // hours
      });

    const averageResolutionTime =
      resolutionTimes.length > 0
        ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length
        : 0;

    const medianResolutionTime = resolutionTimes.length > 0 ? this.median(resolutionTimes) : 0;

    // Calculate resolution rate (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentIssues = issues.filter(issue => new Date(issue.created_at) >= thirtyDaysAgo);
    const recentClosed = recentIssues.filter(issue => issue.state === 'closed');
    const resolutionRate =
      recentIssues.length > 0 ? (recentClosed.length / recentIssues.length) * 100 : 0;

    // If no recent issues, calculate overall resolution rate
    const overallResolutionRate =
      issues.length > 0 ? (closedIssues.length / issues.length) * 100 : 0;

    const finalResolutionRate = recentIssues.length > 0 ? resolutionRate : overallResolutionRate;

    // Calculate average response time (time to first comment)
    // Note: This would require comment data, using placeholder for now
    const responseTime = 24; // placeholder

    // Calculate throughput (issues closed per day over last 30 days)
    const throughput = recentClosed.length / 30;

    // Backlog size
    const backlogSize = openIssues.length;

    // Burndown rate (recent closure rate)
    const burndownRate = throughput;

    return {
      averageResolutionTime,
      medianResolutionTime,
      resolutionRate: finalResolutionRate,
      responseTime,
      throughput,
      backlogSize,
      burndownRate,
    };
  }

  /**
   * Generate classification metrics
   */
  generateClassificationMetrics(classifications: IssueClassification[]): ClassificationMetrics {
    const totalClassified = classifications.length;

    if (totalClassified === 0) {
      return {
        totalClassified: 0,
        averageConfidence: 0,
        categoryDistribution: {} as Record<ClassificationCategory, number>,
        priorityDistribution: {} as Record<PriorityLevel, number>,
        processingStats: {
          averageTimeMs: 0,
          minTimeMs: 0,
          maxTimeMs: 0,
          totalTimeMs: 0,
        },
      };
    }

    // Calculate average confidence
    const averageConfidence =
      classifications.reduce((sum, c) => sum + c.primaryConfidence, 0) / totalClassified;

    // Calculate category distribution
    const categoryDistribution = {} as Record<ClassificationCategory, number>;
    const priorityDistribution = {} as Record<PriorityLevel, number>;

    classifications.forEach(classification => {
      // Category distribution
      categoryDistribution[classification.primaryCategory] =
        (categoryDistribution[classification.primaryCategory] || 0) + 1;

      // Priority distribution
      priorityDistribution[classification.estimatedPriority] =
        (priorityDistribution[classification.estimatedPriority] || 0) + 1;
    });

    // Calculate processing statistics
    const processingTimes = classifications.map(c => c.processingTimeMs);
    const totalTimeMs = processingTimes.reduce((sum, time) => sum + time, 0);
    const averageTimeMs = totalTimeMs / totalClassified;
    const minTimeMs = Math.min(...processingTimes);
    const maxTimeMs = Math.max(...processingTimes);

    return {
      totalClassified,
      averageConfidence,
      categoryDistribution,
      priorityDistribution,
      processingStats: {
        averageTimeMs,
        minTimeMs,
        maxTimeMs,
        totalTimeMs,
      },
    };
  }

  /**
   * Generate insights from issue data
   */
  generateInsights(issues: Issue[], classifications: IssueClassification[]): IssueInsights {
    const now = new Date();
    const openIssues = issues.filter(issue => issue.state === 'open');
    const closedIssues = issues.filter(issue => issue.state === 'closed');

    // Calculate basic metrics
    const totalIssues = issues.length;
    const openCount = openIssues.length;
    const closedCount = closedIssues.length;

    // Calculate average age of open issues
    const openAges = openIssues.map(issue => {
      const created = new Date(issue.created_at);
      return (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24); // days
    });
    const averageAge =
      openAges.length > 0 ? openAges.reduce((sum, age) => sum + age, 0) / openAges.length : 0;

    const oldestIssue = openAges.length > 0 ? Math.max(...openAges) : 0;

    // Analyze classifications
    const classificationMetrics = this.generateClassificationMetrics(classifications);

    // Generate key findings
    const keyFindings: string[] = [];
    const recommendations: string[] = [];
    const riskFactors: string[] = [];
    const opportunities: string[] = [];

    // Analysis logic
    const resolutionRate = totalIssues > 0 ? (closedCount / totalIssues) * 100 : 0;

    if (resolutionRate < 70) {
      keyFindings.push(`Low resolution rate of ${resolutionRate.toFixed(1)}%`);
      recommendations.push('Focus on resolving existing issues before taking on new work');
    }

    if (averageAge > 90) {
      riskFactors.push(`Open issues are aging with average age of ${averageAge.toFixed(0)} days`);
      recommendations.push('Implement regular issue triage and cleanup processes');
    }

    if (oldestIssue > 365) {
      riskFactors.push(`Oldest issue is ${oldestIssue.toFixed(0)} days old`);
      recommendations.push('Review and close stale issues that are no longer relevant');
    }

    // Analyze category distribution
    const topCategory = Object.entries(classificationMetrics.categoryDistribution).sort(
      ([, a], [, b]) => b - a
    )[0];

    if (topCategory) {
      keyFindings.push(`Most common issue type: ${topCategory[0]} (${topCategory[1]} issues)`);

      if (topCategory[0] === 'bug' && topCategory[1] > totalIssues * 0.5) {
        riskFactors.push('High number of bug reports may indicate quality issues');
        recommendations.push('Increase testing coverage and code review processes');
      } else if (topCategory[0] === 'feature' && topCategory[1] > totalIssues * 0.4) {
        opportunities.push('High demand for new features shows user engagement');
        recommendations.push('Consider roadmap planning for popular feature requests');
      }
    }

    // Generate summary
    const summary =
      `Project has ${totalIssues} total issues with ${openCount} open and ${closedCount} closed. ` +
      `Average age of open issues is ${averageAge.toFixed(0)} days. ` +
      `Resolution rate is ${resolutionRate.toFixed(1)}%.`;

    return {
      summary,
      keyFindings,
      recommendations,
      riskFactors,
      opportunities,
      metrics: {
        totalIssues,
        openIssues: openCount,
        closedIssues: closedCount,
        averageAge,
        oldestIssue,
      },
    };
  }

  /**
   * Generate time series data for issue trends
   */
  generateTimeSeries(issues: Issue[], timeWindow: number = 30): TimeSeriesPoint[] {
    const now = new Date();
    const windowStart = new Date(now.getTime() - timeWindow * 24 * 60 * 60 * 1000);

    // Group issues by day
    const dailyCounts = new Map<string, number>();

    issues.forEach(issue => {
      const created = new Date(issue.created_at);
      if (created >= windowStart) {
        const dateKey = created.toISOString().split('T')[0]!;
        dailyCounts.set(dateKey, (dailyCounts.get(dateKey) || 0) + 1);
      }
    });

    // Convert to time series points
    const timeSeriesData: TimeSeriesPoint[] = [];
    for (let i = 0; i < timeWindow; i++) {
      const date = new Date(windowStart.getTime() + i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0]!;
      timeSeriesData.push({
        timestamp: date,
        value: dailyCounts.get(dateKey) || 0,
      });
    }

    return timeSeriesData;
  }

  /**
   * Helper function to calculate median
   */
  private median(values: number[]): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1]! + sorted[mid]!) / 2;
    } else {
      return sorted[mid]!;
    }
  }
}

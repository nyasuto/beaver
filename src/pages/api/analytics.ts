/**
 * Analytics API Endpoint
 *
 * This endpoint provides analytics data for the dashboard.
 * Currently returns mock data - will be connected to real analytics processing in future implementation.
 */

import type { APIRoute } from 'astro';
import { z } from 'zod';

// Query parameters schema
const QuerySchema = z.object({
  timeframe: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
  metrics: z.string().optional(), // comma-separated list of metrics
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day'),
});

// Mock analytics data
const mockAnalytics = {
  overview: {
    total_issues: 42,
    open_issues: 18,
    closed_issues: 24,
    avg_resolution_time_days: 3.2,
    issues_opened_last_30d: 15,
    issues_closed_last_30d: 12,
    active_contributors: 8,
  },
  trends: {
    daily_issues: [
      { date: '2023-12-01', opened: 2, closed: 1 },
      { date: '2023-12-02', opened: 1, closed: 3 },
      { date: '2023-12-03', opened: 3, closed: 2 },
      { date: '2023-12-04', opened: 0, closed: 1 },
      { date: '2023-12-05', opened: 2, closed: 0 },
      { date: '2023-12-06', opened: 1, closed: 2 },
      { date: '2023-12-07', opened: 0, closed: 1 },
    ],
    weekly_summary: [
      { week: '2023-W48', opened: 5, closed: 7 },
      { week: '2023-W49', opened: 8, closed: 6 },
      { week: '2023-W50', opened: 6, closed: 8 },
      { week: '2023-W51', opened: 9, closed: 5 },
    ],
  },
  categories: {
    bug: { count: 15, percentage: 35.7 },
    feature: { count: 12, percentage: 28.6 },
    enhancement: { count: 8, percentage: 19.0 },
    documentation: { count: 4, percentage: 9.5 },
    question: { count: 3, percentage: 7.1 },
  },
  contributors: [
    { login: 'alice', issues_opened: 8, issues_closed: 12, contributions: 20 },
    { login: 'bob', issues_opened: 6, issues_closed: 8, contributions: 14 },
    { login: 'charlie', issues_opened: 4, issues_closed: 6, contributions: 10 },
    { login: 'dave', issues_opened: 3, issues_closed: 2, contributions: 5 },
  ],
  resolution_times: {
    avg_hours: 76.8,
    median_hours: 48.0,
    percentiles: {
      p50: 48.0,
      p75: 96.0,
      p90: 168.0,
      p95: 240.0,
    },
  },
  labels: [
    { name: 'bug', count: 15, color: 'ee0701' },
    { name: 'feature', count: 12, color: '0e8a16' },
    { name: 'enhancement', count: 8, color: '84b6eb' },
    { name: 'documentation', count: 4, color: '0075ca' },
    { name: 'priority: high', count: 6, color: 'b60205' },
    { name: 'priority: medium', count: 12, color: 'fbca04' },
    { name: 'priority: low', count: 8, color: '0e8a16' },
  ],
  activity: [
    {
      type: 'issue_closed',
      issue_number: 123,
      title: 'Fix navigation bug',
      timestamp: '2023-12-07T14:30:00Z',
      user: 'alice',
    },
    {
      type: 'issue_opened',
      issue_number: 124,
      title: 'Add dark mode support',
      timestamp: '2023-12-07T10:15:00Z',
      user: 'bob',
    },
    {
      type: 'comment_added',
      issue_number: 122,
      title: 'Performance improvements',
      timestamp: '2023-12-07T08:45:00Z',
      user: 'charlie',
    },
  ],
  insights: {
    key_findings: [
      'Bug reports increased by 15% this week',
      'Feature requests are trending upward',
      'Average resolution time improved by 1.2 days',
    ],
    recommendations: [
      'Focus on addressing high-priority bugs',
      'Consider adding more documentation',
      'Review feature request backlog',
    ],
    predictions: [
      'Estimated 12 new issues next week',
      'Resolution time likely to improve',
      'Documentation requests may increase',
    ],
  },
};

export const GET: APIRoute = async ({ request: _request, url }) => {
  try {
    // Parse and validate query parameters
    const searchParams = Object.fromEntries(url.searchParams);
    const query = QuerySchema.parse(searchParams);

    // Filter metrics if specified
    let responseData = mockAnalytics;

    if (query.metrics) {
      const requestedMetrics = query.metrics.split(',').map(m => m.trim());
      responseData = {} as typeof mockAnalytics;

      for (const metric of requestedMetrics) {
        if (metric in mockAnalytics) {
          (responseData as Record<string, unknown>)[metric] = (
            mockAnalytics as Record<string, unknown>
          )[metric];
        }
      }
    }

    // Adjust data based on timeframe (simplified for mock)
    if (query.timeframe === '7d') {
      responseData.trends = {
        daily_issues: mockAnalytics.trends.daily_issues.slice(-7),
        weekly_summary: mockAnalytics.trends.weekly_summary.slice(-1),
      };
    } else if (query.timeframe === '90d') {
      // For 90 days, we might aggregate to weeks
      responseData.trends = {
        daily_issues: mockAnalytics.trends.daily_issues, // In real implementation, this would be expanded
        weekly_summary: mockAnalytics.trends.weekly_summary,
      };
    }

    const response = {
      success: true,
      data: responseData,
      meta: {
        timeframe: query.timeframe,
        granularity: query.granularity,
        generated_at: new Date().toISOString(),
        data_source: 'mock',
        cache_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
      },
    };

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // 5 minutes
      },
    });
  } catch (error) {
    const errorResponse = {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'VALIDATION_ERROR',
      },
      meta: {
        generated_at: new Date().toISOString(),
      },
    };

    return new Response(JSON.stringify(errorResponse, null, 2), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};

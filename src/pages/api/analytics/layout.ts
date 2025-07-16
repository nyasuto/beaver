/**
 * Layout Analytics API Endpoint
 *
 * Issue #382: Collects and processes layout analytics data
 * Tracks integrated sidebar layout metrics (legacy floating layout removed)
 */

import type { APIRoute } from 'astro';
import { z } from 'zod';

// Schema for layout metrics validation
const LayoutMetricsSchema = z.object({
  layoutType: z.enum(['integrated', 'adaptive']),
  sessionId: z.string(),
  userId: z.string().optional(),

  // Performance metrics
  loadTime: z.number().optional(),
  firstContentfulPaint: z.number().optional(),
  largestContentfulPaint: z.number().optional(),
  cumulativeLayoutShift: z.number().optional(),

  // User interaction metrics
  tocInteractions: z.number().default(0),
  sectionNavigations: z.number().default(0),
  searchUsage: z.number().default(0),
  mobileMenuUsage: z.number().default(0),
  scrollDepth: z.number().default(0),
  readingTime: z.number().default(0),
  bounceRate: z.boolean().default(false),

  // Layout-specific metrics
  sidebarResizes: z.number().optional(),
  minimapUsage: z.number().optional(),
  progressBarViews: z.number().optional(),

  // Content characteristics
  documentLength: z.number().optional(),
  sectionCount: z.number().optional(),
  contentComplexity: z.enum(['simple', 'standard', 'complex']).optional(),

  // Device and context
  deviceType: z.enum(['mobile', 'tablet', 'desktop']).optional(),
  screenWidth: z.number().optional(),
  screenHeight: z.number().optional(),
  userAgent: z.string().optional(),
  timestamp: z.coerce.date(),
});

type LayoutMetrics = z.infer<typeof LayoutMetricsSchema>;

// Simple in-memory storage for development
// In production, this would be replaced with a proper database
const analyticsData: LayoutMetrics[] = [];
const maxStoredEntries = 10000; // Prevent memory overflow

/**
 * Process and store analytics data
 */
function storeAnalytics(metrics: LayoutMetrics): void {
  // Add server-side processing timestamp
  const processedMetrics = {
    ...metrics,
    serverTimestamp: new Date(),
  };

  analyticsData.push(processedMetrics);

  // Prevent memory overflow
  if (analyticsData.length > maxStoredEntries) {
    analyticsData.splice(0, analyticsData.length - maxStoredEntries);
  }

  console.log(`📊 [Analytics] Stored metrics for ${metrics.layoutType} layout:`, {
    sessionId: metrics.sessionId,
    deviceType: metrics.deviceType,
    interactions: {
      toc: metrics.tocInteractions,
      search: metrics.searchUsage,
      mobile: metrics.mobileMenuUsage,
    },
    performance: {
      loadTime: metrics.loadTime,
      scrollDepth: metrics.scrollDepth,
      readingTime: metrics.readingTime,
    },
  });
}

/**
 * Generate analytics summary
 */
function generateSummary(): any {
  if (analyticsData.length === 0) {
    return {
      totalSessions: 0,
      message: 'No analytics data available yet',
    };
  }

  const layoutBreakdown = analyticsData.reduce(
    (acc, entry) => {
      acc[entry.layoutType] = (acc[entry.layoutType] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const deviceBreakdown = analyticsData.reduce(
    (acc, entry) => {
      if (entry.deviceType) {
        acc[entry.deviceType] = (acc[entry.deviceType] || 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>
  );

  const avgMetrics = analyticsData.reduce(
    (acc, entry) => {
      acc.tocInteractions += entry.tocInteractions || 0;
      acc.searchUsage += entry.searchUsage || 0;
      acc.mobileMenuUsage += entry.mobileMenuUsage || 0;
      acc.scrollDepth += entry.scrollDepth || 0;
      acc.readingTime += entry.readingTime || 0;

      if (entry.loadTime) {
        acc.loadTimeSum += entry.loadTime;
        acc.loadTimeCount += 1;
      }

      return acc;
    },
    {
      tocInteractions: 0,
      searchUsage: 0,
      mobileMenuUsage: 0,
      scrollDepth: 0,
      readingTime: 0,
      loadTimeSum: 0,
      loadTimeCount: 0,
    }
  );

  const sessionCount = analyticsData.length;
  const bounceRate = analyticsData.filter(entry => entry.bounceRate).length / sessionCount;

  return {
    totalSessions: sessionCount,
    layoutBreakdown,
    deviceBreakdown,
    averageMetrics: {
      tocInteractionsPerSession: avgMetrics.tocInteractions / sessionCount,
      searchUsagePerSession: avgMetrics.searchUsage / sessionCount,
      mobileMenuUsagePerSession: avgMetrics.mobileMenuUsage / sessionCount,
      averageScrollDepth: avgMetrics.scrollDepth / sessionCount,
      averageReadingTime: avgMetrics.readingTime / sessionCount,
      averageLoadTime:
        avgMetrics.loadTimeCount > 0 ? avgMetrics.loadTimeSum / avgMetrics.loadTimeCount : null,
    },
    bounceRate: bounceRate,
    performanceInsights: {
      highEngagementSessions: analyticsData.filter(
        entry => entry.tocInteractions > 5 || entry.readingTime > 30000
      ).length,
      mobileFriendlyUsage: analyticsData.filter(
        entry => entry.deviceType === 'mobile' && entry.mobileMenuUsage > 0
      ).length,
    },
    lastUpdated: new Date().toISOString(),
  };
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse request body
    const body = await request.json();

    // Validate metrics data
    const validationResult = LayoutMetricsSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('📊 [Analytics] Validation failed:', validationResult.error.issues);
      return new Response(
        JSON.stringify({
          error: 'Invalid metrics data',
          details: validationResult.error.issues,
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const metrics = validationResult.data;

    // Store analytics data
    storeAnalytics(metrics);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        sessionId: metrics.sessionId,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  } catch (error) {
    console.error('📊 [Analytics] Error processing request:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};

export const GET: APIRoute = async ({ url }) => {
  try {
    const searchParams = new URL(url).searchParams;
    const format = searchParams.get('format') || 'json';
    const summary = searchParams.get('summary') === 'true';

    if (summary) {
      // Return analytics summary
      const summaryData = generateSummary();

      return new Response(JSON.stringify(summaryData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    if (format === 'csv') {
      // Return CSV format for data analysis
      if (analyticsData.length === 0) {
        return new Response('No data available', { status: 404 });
      }

      const headers = Object.keys(analyticsData[0] || {}).join(',');
      const rows = analyticsData.map(entry =>
        Object.values(entry)
          .map(value => (typeof value === 'string' ? `"${value}"` : value))
          .join(',')
      );

      const csv = [headers, ...rows].join('\n');

      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="layout-analytics.csv"',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Return raw JSON data
    return new Response(
      JSON.stringify(
        {
          data: analyticsData,
          count: analyticsData.length,
          lastUpdated: new Date().toISOString(),
        },
        null,
        2
      ),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('📊 [Analytics] Error handling GET request:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};

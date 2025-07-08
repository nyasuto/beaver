/**
 * Health Check API Endpoint
 *
 * This endpoint provides basic health check information for the Beaver Astro application.
 * It can be used for monitoring and deployment verification.
 */

import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request: _request }) => {
  const startTime = Date.now();

  try {
    // Basic health check data
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '0.1.0',
      environment: import.meta.env.MODE,
      services: {
        database: 'not_implemented',
        github_api: 'not_implemented',
        analytics: 'not_implemented',
      },
      performance: {
        response_time_ms: 0, // Will be calculated below
        memory_usage: process.memoryUsage(),
      },
    };

    // Calculate response time
    health.performance.response_time_ms = Date.now() - startTime;

    return new Response(JSON.stringify(health, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    const errorResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      response_time_ms: Date.now() - startTime,
    };

    return new Response(JSON.stringify(errorResponse, null, 2), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }
};

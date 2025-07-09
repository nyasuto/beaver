/**
 * GitHub Issues API Endpoint
 *
 * This endpoint provides real GitHub issues data using the Octokit integration.
 * Supports filtering, pagination, and comprehensive issue management.
 */

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createGitHubServicesFromEnv, IssuesQuerySchema } from '../../../lib/github';

// Enhanced query schema for API endpoint
const APIQuerySchema = IssuesQuerySchema.extend({
  include_stats: z.coerce.boolean().default(false),
  include_pull_requests: z.coerce.boolean().default(false),
});

export const GET: APIRoute = async ({ request: _request, url }) => {
  try {
    // Parse and validate query parameters
    const searchParams = Object.fromEntries(url.searchParams);
    const query = APIQuerySchema.parse(searchParams);

    // Create GitHub services
    const servicesResult = await createGitHubServicesFromEnv();

    if (!servicesResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            message: 'GitHub API configuration error',
            details: servicesResult.error.message,
            code: 'GITHUB_CONFIG_ERROR',
          },
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { issues: issuesService } = servicesResult.data;

    // Filter out pull requests if not requested
    const issuesQuery = {
      ...query,
      // GitHub API doesn't have a direct way to exclude PRs, we'll filter them later
    };

    // Fetch issues
    const issuesResult = await issuesService.getIssues(issuesQuery);

    if (!issuesResult.success) {
      const gitHubError = issuesResult.error as { status?: number; message: string; code?: string };
      const status = gitHubError.status || 500;
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            message: gitHubError.message,
            code: gitHubError.code || 'GITHUB_API_ERROR',
            status,
          },
        }),
        {
          status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    let filteredIssues = issuesResult.data;

    // Filter out pull requests if not requested
    if (!query.include_pull_requests) {
      filteredIssues = filteredIssues.filter(issue => !issue.pull_request);
    }

    // Prepare response data
    const responseData: Record<string, unknown> = {
      issues: filteredIssues,
      pagination: {
        page: query.page,
        per_page: query.per_page,
        total_count: filteredIssues.length,
        has_next: filteredIssues.length === query.per_page,
      },
    };

    // Include statistics if requested
    if (query.include_stats) {
      const statsResult = await issuesService.getIssuesStats();
      if (statsResult.success) {
        responseData['stats'] = statsResult.data;
      }
    }

    const response = {
      success: true,
      data: responseData,
      meta: {
        query: {
          state: query.state,
          labels: query.labels,
          sort: query.sort,
          direction: query.direction,
          page: query.page,
          per_page: query.per_page,
        },
        generated_at: new Date().toISOString(),
        source: 'github_api',
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
    // Log error for debugging
    if (process.env['NODE_ENV'] === 'development') {
      // eslint-disable-next-line no-console
      console.error('GitHub Issues API Error:', error);
    }

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

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse request body
    const body = await request.json();

    // Create GitHub services
    const servicesResult = await createGitHubServicesFromEnv();

    if (!servicesResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            message: 'GitHub API configuration error',
            details: servicesResult.error.message,
            code: 'GITHUB_CONFIG_ERROR',
          },
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { issues: issuesService } = servicesResult.data;

    // Create new issue
    const createResult = await issuesService.createIssue(body);

    if (!createResult.success) {
      const gitHubError = createResult.error as { status?: number; message: string; code?: string };
      const status = gitHubError.status || 500;
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            message: gitHubError.message,
            code: gitHubError.code || 'GITHUB_API_ERROR',
            status,
          },
        }),
        {
          status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const response = {
      success: true,
      data: {
        issue: createResult.data,
      },
      meta: {
        created_at: new Date().toISOString(),
        source: 'github_api',
      },
    };

    return new Response(JSON.stringify(response, null, 2), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    // Log error for debugging
    if (process.env['NODE_ENV'] === 'development') {
      // eslint-disable-next-line no-console
      console.error('GitHub Issues Create API Error:', error);
    }

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

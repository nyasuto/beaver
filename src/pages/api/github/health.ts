/**
 * GitHub API Health Check Endpoint
 *
 * This endpoint tests GitHub API connectivity and returns connection status
 * along with rate limit information and basic repository access.
 */

import type { APIRoute } from 'astro';
import { createGitHubServicesFromEnv } from '../../../lib/github';

export const GET: APIRoute = async ({ request: _request }) => {
  try {
    // Create GitHub services
    const servicesResult = createGitHubServicesFromEnv();

    if (!servicesResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 'configuration_error',
          error: {
            message: 'GitHub API configuration error',
            details: servicesResult.error.message,
            code: 'GITHUB_CONFIG_ERROR',
          },
          checks: {
            configuration: false,
            authentication: false,
            rate_limit: false,
            repository_access: false,
          },
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { client, repository: repoService } = servicesResult.data;

    // Perform health checks
    const checks = {
      configuration: true,
      authentication: false,
      rate_limit: false,
      repository_access: false,
    };

    let authUser = null;
    let rateLimit = null;
    let repositoryInfo = null;
    const errors: string[] = [];

    // Test authentication
    try {
      const authResult = await client.testConnection();
      if (authResult.success) {
        checks.authentication = true;
        authUser = authResult.data.user;
      } else {
        errors.push(`Authentication failed: ${authResult.error.message}`);
      }
    } catch (error) {
      errors.push(
        `Authentication test error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Test rate limit access
    try {
      const rateLimitResult = await client.getRateLimit();
      if (rateLimitResult.success) {
        checks.rate_limit = true;
        rateLimit = rateLimitResult.data;
      } else {
        errors.push(`Rate limit check failed: ${rateLimitResult.error.message}`);
      }
    } catch (error) {
      errors.push(
        `Rate limit test error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Test repository access
    try {
      const repoResult = await repoService.getRepository();
      if (repoResult.success) {
        checks.repository_access = true;
        repositoryInfo = {
          name: repoResult.data.full_name,
          private: repoResult.data.private,
          has_issues: repoResult.data.has_issues,
          permissions: repoResult.data.permissions,
        };
      } else {
        errors.push(`Repository access failed: ${repoResult.error.message}`);
      }
    } catch (error) {
      errors.push(
        `Repository test error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Determine overall status
    const allChecksPass = Object.values(checks).every(check => check === true);
    const status = allChecksPass ? 'healthy' : 'degraded';

    // Calculate health score
    const passedChecks = Object.values(checks).filter(check => check === true).length;
    const totalChecks = Object.keys(checks).length;
    const healthScore = Math.round((passedChecks / totalChecks) * 100);

    const response = {
      success: true,
      status,
      health_score: healthScore,
      checks,
      data: {
        authenticated_user: authUser
          ? {
              login: (authUser as { login: string }).login,
              id: (authUser as { id: number }).id,
              type: (authUser as { type: string }).type,
              plan: (authUser as { plan?: unknown }).plan,
            }
          : null,
        rate_limit: rateLimit
          ? {
              limit: (rateLimit as { rate: { limit: number } }).rate.limit,
              remaining: (rateLimit as { rate: { remaining: number } }).rate.remaining,
              reset: new Date(
                (rateLimit as { rate: { reset: number } }).rate.reset * 1000
              ).toISOString(),
              used: (rateLimit as { rate: { used: number } }).rate.used,
            }
          : null,
        repository: repositoryInfo,
      },
      errors: errors.length > 0 ? errors : undefined,
      meta: {
        checked_at: new Date().toISOString(),
        github_api_version: '2022-11-28',
        user_agent: 'beaver-astro/1.0.0',
      },
    };

    const responseStatus = allChecksPass ? 200 : 503;

    return new Response(JSON.stringify(response, null, 2), {
      status: responseStatus,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    // Log error for debugging
    if (process.env['NODE_ENV'] === 'development') {
      // eslint-disable-next-line no-console
      console.error('GitHub Health Check Error:', error);
    }

    const errorResponse = {
      success: false,
      status: 'error',
      health_score: 0,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'HEALTH_CHECK_ERROR',
      },
      checks: {
        configuration: false,
        authentication: false,
        rate_limit: false,
        repository_access: false,
      },
      meta: {
        checked_at: new Date().toISOString(),
      },
    };

    return new Response(JSON.stringify(errorResponse, null, 2), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};

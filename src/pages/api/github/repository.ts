/**
 * GitHub Repository API Endpoint
 *
 * This endpoint provides real GitHub repository data using the Octokit integration.
 * Includes repository information, statistics, and metadata.
 */

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createGitHubServicesFromEnv } from '../../../lib/github';

// Query schema for repository API
const RepositoryQuerySchema = z.object({
  include_stats: z.coerce.boolean().default(false),
  include_commits: z.coerce.boolean().default(false),
  include_languages: z.coerce.boolean().default(false),
  include_contributors: z.coerce.boolean().default(false),
  commits_limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const GET: APIRoute = async ({ request: _request, url }) => {
  try {
    // Parse and validate query parameters
    const searchParams = Object.fromEntries(url.searchParams);
    const query = RepositoryQuerySchema.parse(searchParams);

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

    const { repository: repoService } = servicesResult.data;

    // Fetch repository information
    const repoResult = await repoService.getRepository();

    if (!repoResult.success) {
      const gitHubError = repoResult.error as { status?: number; message: string; code?: string };
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

    // Prepare response data
    const responseData: Record<string, unknown> = {
      repository: repoResult.data,
    };

    // Include additional data based on query parameters
    const additionalDataPromises: Promise<{ type: string; data: unknown; error: string | null }>[] =
      [];

    if (query.include_languages) {
      additionalDataPromises.push(
        repoService
          .getLanguages()
          .then((result: { success: boolean; data?: unknown; error?: { message: string } }) => ({
            type: 'languages',
            data: result.success ? result.data : null,
            error: result.success ? null : (result.error?.message ?? null),
          }))
      );
    }

    if (query.include_commits) {
      additionalDataPromises.push(
        repoService
          .getCommits({ per_page: query.commits_limit })
          .then((result: { success: boolean; data?: unknown; error?: { message: string } }) => ({
            type: 'commits',
            data: result.success ? result.data : null,
            error: result.success ? null : (result.error?.message ?? null),
          }))
      );
    }

    if (query.include_contributors) {
      additionalDataPromises.push(
        repoService
          .getContributors(1, 20)
          .then((result: { success: boolean; data?: unknown; error?: { message: string } }) => ({
            type: 'contributors',
            data: result.success ? result.data : null,
            error: result.success ? null : (result.error?.message ?? null),
          }))
      );
    }

    if (query.include_stats) {
      additionalDataPromises.push(
        repoService
          .getRepositoryStats()
          .then((result: { success: boolean; data?: unknown; error?: { message: string } }) => ({
            type: 'stats',
            data: result.success ? result.data : null,
            error: result.success ? null : (result.error?.message ?? null),
          }))
      );
    }

    // Wait for additional data
    if (additionalDataPromises.length > 0) {
      const additionalResults = await Promise.all(additionalDataPromises);

      for (const result of additionalResults) {
        if (result.data) {
          responseData[result.type] = result.data;
        } else if (result.error) {
          responseData[`${result.type}_error`] = result.error;
        }
      }
    }

    // Calculate basic metrics from repository data
    const basicMetrics = {
      health_score: calculateHealthScore(repoResult.data),
      activity_level: calculateActivityLevel(repoResult.data),
      popularity_score: calculatePopularityScore(repoResult.data),
    };

    const response = {
      success: true,
      data: {
        ...responseData,
        metrics: basicMetrics,
      },
      meta: {
        query,
        generated_at: new Date().toISOString(),
        source: 'github_api',
        cache_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      },
    };

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=600', // 10 minutes
      },
    });
  } catch (error) {
    // Log error for debugging
    if (process.env['NODE_ENV'] === 'development') {
      // eslint-disable-next-line no-console
      console.error('GitHub Repository API Error:', error);
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

/**
 * Calculate repository health score based on various factors
 */
function calculateHealthScore(repo: Record<string, unknown>): number {
  let score = 0;
  const maxScore = 100;

  // Has description (10 points)
  if (typeof repo['description'] === 'string' && repo['description'].length > 10) {
    score += 10;
  }

  // Has README (assume if size > 0, there's content) (15 points)
  if (typeof repo['size'] === 'number' && repo['size'] > 0) {
    score += 15;
  }

  // Has license (10 points)
  if (repo['license']) {
    score += 10;
  }

  // Has topics/tags (10 points)
  if (Array.isArray(repo['topics']) && repo['topics'].length > 0) {
    score += 10;
  }

  // Recent activity (within last 30 days) (20 points)
  if (typeof repo['updated_at'] === 'string') {
    const lastUpdate = new Date(repo['updated_at']);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (lastUpdate > thirtyDaysAgo) {
      score += 20;
    }
  }

  // Has issues enabled (5 points)
  if (repo['has_issues'] === true) {
    score += 5;
  }

  // Has wiki enabled (5 points)
  if (repo['has_wiki'] === true) {
    score += 5;
  }

  // Low open issues ratio (15 points)
  if (typeof repo['open_issues_count'] === 'number') {
    if (repo['open_issues_count'] < 10) {
      score += 15;
    } else if (repo['open_issues_count'] < 50) {
      score += 10;
    }
  }

  // Has stars (10 points for 1+, 5 more for 10+)
  if (typeof repo['stargazers_count'] === 'number' && repo['stargazers_count'] > 0) {
    score += 10;
    if (repo['stargazers_count'] >= 10) {
      score += 5;
    }
  }

  return Math.min(score, maxScore);
}

/**
 * Calculate activity level based on recent updates and engagement
 */
function calculateActivityLevel(repo: Record<string, unknown>): 'low' | 'medium' | 'high' {
  if (typeof repo['updated_at'] !== 'string') {
    return 'low';
  }

  const lastUpdate = new Date(repo['updated_at']);
  const now = new Date();
  const daysSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);

  // Recent activity indicators
  const hasRecentActivity = daysSinceUpdate < 7;
  const hasModerateActivity = daysSinceUpdate < 30;
  const hasIssues = typeof repo['open_issues_count'] === 'number' && repo['open_issues_count'] > 0;
  const hasStars = typeof repo['stargazers_count'] === 'number' && repo['stargazers_count'] > 5;

  if (hasRecentActivity && (hasIssues || hasStars)) {
    return 'high';
  } else if (hasModerateActivity || hasIssues) {
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * Calculate popularity score based on stars, forks, and watchers
 */
function calculatePopularityScore(repo: Record<string, unknown>): number {
  const stars = typeof repo['stargazers_count'] === 'number' ? repo['stargazers_count'] : 0;
  const forks = typeof repo['forks_count'] === 'number' ? repo['forks_count'] : 0;
  const watchers = typeof repo['watchers_count'] === 'number' ? repo['watchers_count'] : 0;

  // Weighted score (stars have higher weight)
  return Math.round(stars * 1.0 + forks * 0.8 + watchers * 0.6);
}

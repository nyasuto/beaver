/**
 * Configuration API Endpoint
 *
 * This endpoint provides application configuration data
 * including GitHub settings, UI preferences, and feature flags.
 */

import type { APIRoute } from 'astro';
import { z } from 'zod';

// Query parameters schema
const QuerySchema = z.object({
  section: z.enum(['github', 'ui', 'features', 'all']).default('all'),
  include_sensitive: z.coerce.boolean().default(false),
});

// Configuration data (excluding sensitive information)
const getConfig = (includeSensitive = false) => {
  const config = {
    github: {
      owner: import.meta.env['GITHUB_OWNER'] || 'example',
      repo: import.meta.env['GITHUB_REPO'] || 'example-repo',
      base_url: 'https://api.github.com',
      rate_limit_threshold: 100,
      cache_ttl_minutes: 5,
      ...(includeSensitive && {
        token_configured: !!import.meta.env['GITHUB_TOKEN'],
        app_id_configured: !!import.meta.env['GITHUB_APP_ID'],
      }),
    },
    ui: {
      theme: 'light',
      items_per_page: 30,
      max_items_per_page: 100,
      timezone: 'UTC',
      date_format: 'YYYY-MM-DD',
      enable_animations: true,
      compact_mode: false,
    },
    features: {
      analytics_enabled: true,
      real_time_updates: false,
      github_integration: true,
      auto_refresh: true,
      export_enabled: true,
      search_enabled: true,
      advanced_filtering: true,
      issue_creation: true,
    },
    api: {
      version: '1.0.0',
      base_path: '/api',
      timeout_seconds: 30,
      max_retries: 3,
      cors_enabled: true,
    },
    security: {
      csrf_protection: true,
      rate_limiting: true,
      requests_per_minute: 60,
      require_authentication: false,
    },
    performance: {
      cache_enabled: true,
      compression_enabled: true,
      lazy_loading: true,
      image_optimization: true,
    },
  };

  return config;
};

export const GET: APIRoute = async ({ request: _request, url }) => {
  try {
    // Parse and validate query parameters
    const searchParams = Object.fromEntries(url.searchParams);
    const query = QuerySchema.parse(searchParams);

    // Get configuration data
    const fullConfig = getConfig(query.include_sensitive);

    // Filter by section if specified
    let responseData: typeof fullConfig | Record<string, unknown> = fullConfig;
    if (query.section !== 'all') {
      responseData = { [query.section]: fullConfig[query.section as keyof typeof fullConfig] };
    }

    const response = {
      success: true,
      data: responseData,
      meta: {
        section: query.section,
        include_sensitive: query.include_sensitive,
        generated_at: new Date().toISOString(),
        environment: import.meta.env.MODE,
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

    // Validate configuration update request
    const UpdateSchema = z.object({
      section: z.enum(['ui', 'features', 'performance']),
      settings: z.record(z.string(), z.unknown()),
    });

    const updateRequest = UpdateSchema.parse(body);

    // In a real implementation, this would update the configuration
    // For now, we'll just validate and return the new configuration

    const response = {
      success: true,
      data: {
        message: 'Configuration update received',
        section: updateRequest.section,
        updated_settings: updateRequest.settings,
      },
      meta: {
        updated_at: new Date().toISOString(),
        note: 'Configuration updates are not persistent in the current implementation',
      },
    };

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
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

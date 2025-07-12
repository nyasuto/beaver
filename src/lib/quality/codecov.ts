/**
 * Codecov API Integration for Quality Analysis
 *
 * This module provides functions to interact with Codecov API v2
 * for retrieving code coverage metrics and quality analysis data.
 */

import { z } from 'zod';

// Zod schemas for type safety
export const CodecovConfigSchema = z.object({
  apiToken: z.string().optional(),
  owner: z.string().optional(),
  repo: z.string().optional(),
  service: z.enum(['github', 'gitlab', 'bitbucket']).default('github'),
  baseUrl: z.string().default('https://api.codecov.io'),
});

export const ModuleCoverageSchema = z.object({
  name: z.string(),
  coverage: z.number(),
  lines: z.number(),
  missedLines: z.number(),
  hits: z.number().optional(),
  partials: z.number().optional(),
});

export const CoverageHistorySchema = z.object({
  date: z.string(),
  coverage: z.number(),
});

export const QualityMetricsSchema = z.object({
  overallCoverage: z.number(),
  totalLines: z.number(),
  coveredLines: z.number(),
  missedLines: z.number(),
  branchCoverage: z.number(),
  lineCoverage: z.number(),
  complexity: z.string(),
  lastUpdated: z.string(),
  modules: z.array(ModuleCoverageSchema),
  history: z.array(CoverageHistorySchema),
});

export type CodecovConfig = z.infer<typeof CodecovConfigSchema>;
export type ModuleCoverage = z.infer<typeof ModuleCoverageSchema>;
export type CoverageHistory = z.infer<typeof CoverageHistorySchema>;
export type QualityMetrics = z.infer<typeof QualityMetricsSchema>;

// Enhanced error types for better error handling
export class CodecovAuthenticationError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'CodecovAuthenticationError';
  }
}

export class CodecovRateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'CodecovRateLimitError';
  }
}

export class CodecovApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: string
  ) {
    super(message);
    this.name = 'CodecovApiError';
  }
}

// Result type for error handling
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

/**
 * Get configuration from environment variables
 */
function getCodecovConfig(): CodecovConfig {
  // For API calls, we need CODECOV_API_TOKEN (not upload token)
  const apiToken = import.meta.env['CODECOV_API_TOKEN'] || undefined;

  if (!apiToken) {
    console.warn(
      'CODECOV_API_TOKEN is not configured. ' +
        'This token is required for reading coverage data from Codecov API. ' +
        'Generate one at: https://codecov.io → Settings → Access → Personal Access Token'
    );
  } else {
    console.log('Using CODECOV_API_TOKEN for API calls');
  }

  const config = {
    apiToken: apiToken,
    owner: import.meta.env['GITHUB_OWNER'] || 'nyasuto',
    repo: import.meta.env['GITHUB_REPO'] || 'beaver',
    service: 'github' as const,
    baseUrl: 'https://api.codecov.io',
  };

  console.log('Codecov API configuration:', {
    CODECOV_API_TOKEN: !!apiToken,
    GITHUB_OWNER: import.meta.env['GITHUB_OWNER'],
    GITHUB_REPO: import.meta.env['GITHUB_REPO'],
    finalOwner: config.owner,
    finalRepo: config.repo,
  });

  return CodecovConfigSchema.parse(config);
}

/**
 * Make authenticated request to Codecov API with enhanced error handling
 */
async function makeCodecovRequest<T>(
  endpoint: string,
  config: CodecovConfig,
  retryCount: number = 0
): Promise<Result<T>> {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second base delay

  try {
    if (!config.apiToken) {
      throw new CodecovAuthenticationError('Codecov API token not configured', 401);
    }

    const url = `${config.baseUrl}/api/v2/${config.service}/${config.owner}/${endpoint}`;

    console.log('Making Codecov API request:', {
      url,
      endpoint,
      owner: config.owner,
      repo: config.repo,
      tokenLength: config.apiToken?.length || 0,
      tokenPrefix: config.apiToken?.substring(0, 8) + '...' || 'none',
      retryCount,
    });

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Beaver-Astro/1.0 (Quality Dashboard)',
      },
    });

    console.log('Codecov API response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });

    // Handle specific HTTP status codes
    if (!response.ok) {
      const responseText = await response.text();
      console.error('Codecov API error response:', responseText);

      switch (response.status) {
        case 401:
          throw new CodecovAuthenticationError(
            'Invalid or expired Codecov API token. Please check your CODECOV_API_TOKEN configuration.',
            response.status
          );
        case 403:
          throw new CodecovAuthenticationError(
            'Codecov API access forbidden. The token may not have sufficient permissions.',
            response.status
          );
        case 429: {
          const retryAfter = response.headers.get('retry-after');
          const retryAfterSeconds = retryAfter ? parseInt(retryAfter) : 60;

          if (retryCount < maxRetries) {
            const delay = Math.min(baseDelay * Math.pow(2, retryCount), retryAfterSeconds * 1000);
            console.log(
              `Rate limited. Retrying after ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`
            );

            await new Promise(resolve => setTimeout(resolve, delay));
            return makeCodecovRequest(endpoint, config, retryCount + 1);
          } else {
            throw new CodecovRateLimitError(
              `Rate limit exceeded. Please try again after ${retryAfterSeconds} seconds.`,
              retryAfterSeconds
            );
          }
        }
        case 404:
          throw new CodecovApiError(
            `Repository not found or not accessible. Check owner/repo configuration: ${config.owner}/${config.repo}`,
            response.status,
            responseText
          );
        default:
          throw new CodecovApiError(
            `Codecov API error: ${response.status} ${response.statusText}`,
            response.status,
            responseText
          );
      }
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Codecov request failed:', error);

    // Don't retry on authentication errors or client errors
    if (
      error instanceof CodecovAuthenticationError ||
      error instanceof CodecovApiError ||
      retryCount >= maxRetries
    ) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }

    // Retry on network errors or other failures
    if (retryCount < maxRetries) {
      const delay = baseDelay * Math.pow(2, retryCount);
      console.log(
        `Network error. Retrying after ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`
      );

      await new Promise(resolve => setTimeout(resolve, delay));
      return makeCodecovRequest(endpoint, config, retryCount + 1);
    }

    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Get repository coverage report
 */
async function getRepositoryCoverage(
  config: CodecovConfig,
  options: {
    sha?: string;
    branch?: string;
    path?: string;
    flag?: string;
  } = {}
): Promise<Result<unknown>> {
  const queryParams = new URLSearchParams();

  if (options.sha) queryParams.append('sha', options.sha);
  if (options.branch) queryParams.append('branch', options.branch);
  if (options.path) queryParams.append('path', options.path);
  if (options.flag) queryParams.append('flag', options.flag);

  const endpoint = `repos/${config.repo}/report/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  return makeCodecovRequest(endpoint, config);
}

/**
 * Get coverage trends over time with explicit date range
 */
async function getCoverageTrends(
  config: CodecovConfig,
  options: {
    interval?: '1d' | '7d' | '30d';
    daysBack?: number;
    startDate?: string;
    endDate?: string;
  } = {}
): Promise<Result<unknown>> {
  const { interval = '1d', daysBack = 30 } = options;

  // Calculate date range if not provided
  let { startDate, endDate } = options;
  if (!startDate || !endDate) {
    const now = new Date();
    endDate = now.toISOString().split('T')[0];

    const start = new Date(now);
    start.setDate(start.getDate() - daysBack);
    startDate = start.toISOString().split('T')[0];
  }

  const queryParams = new URLSearchParams();
  queryParams.append('interval', interval);
  if (startDate) queryParams.append('start_date', startDate);
  if (endDate) queryParams.append('end_date', endDate);

  const endpoint = `repos/${config.repo}/coverage/?${queryParams.toString()}`;

  console.log('Getting coverage trends:', {
    endpoint,
    interval,
    startDate,
    endDate,
    daysBack,
  });

  return makeCodecovRequest(endpoint, config);
}

/**
 * Get list of flags for repository
 */
async function getRepositoryFlags(config: CodecovConfig): Promise<Result<unknown>> {
  const endpoint = `repos/${config.repo}/flags`;
  return makeCodecovRequest(endpoint, config);
}

/**
 * Transform raw Codecov data to our QualityMetrics format
 */
function transformCodecovData(rawData: unknown): QualityMetrics {
  console.log('Transforming Codecov data:', JSON.stringify(rawData, null, 2));

  const data = rawData as {
    totals?: {
      coverage?: number;
      lines?: number;
      hits?: number;
      misses?: number;
      partials?: number;
      branches?: number;
    };
    files?: Array<{
      name: string;
      totals: {
        coverage: number;
        lines: number;
        hits: number;
        misses: number;
      };
    }>;
  };

  const totals = data.totals || {};
  const coverage = totals.coverage || 0;
  const totalLines = totals.lines || 0;
  const coveredLines = totals.hits || 0;
  const missedLines = totals.misses || 0;

  // Transform files data to modules
  const modules: ModuleCoverage[] = [];
  if (data.files && Array.isArray(data.files)) {
    data.files.forEach(file => {
      if (file.name && file.totals) {
        // Group files by directory to create module-level data
        const parts = file.name.split('/');
        const moduleName = parts.length > 2 ? `${parts[0]}/${parts[1]}` : parts[0] || file.name;

        const existingModule = modules.find(m => m.name === moduleName);
        if (existingModule) {
          // Aggregate data for existing module
          const totalModuleLines = existingModule.lines + (file.totals.lines || 0);
          const totalModuleCovered =
            existingModule.lines * (existingModule.coverage / 100) + (file.totals.hits || 0);
          existingModule.lines = totalModuleLines;
          existingModule.coverage =
            totalModuleLines > 0 ? (totalModuleCovered / totalModuleLines) * 100 : 0;
          existingModule.missedLines = existingModule.missedLines + (file.totals.misses || 0);
        } else {
          // Add new module
          modules.push({
            name: moduleName,
            coverage: file.totals.coverage || 0,
            lines: file.totals.lines || 0,
            missedLines: file.totals.misses || 0,
          });
        }
      }
    });
  }

  return {
    overallCoverage: coverage,
    totalLines: totalLines,
    coveredLines: coveredLines,
    missedLines: missedLines,
    branchCoverage: totals.branches || coverage * 0.9, // Estimate if not available
    lineCoverage: coverage,
    complexity: totalLines > 10000 ? 'High' : totalLines > 5000 ? 'Medium' : 'Low',
    lastUpdated: new Date().toISOString(),
    modules: modules.length > 0 ? modules : [], // Will use sample data if empty
    history: [], // Will be filled by trends data
  };
}

/**
 * Generate modules from file-level coverage data
 */
function generateModulesFromFiles(files: Array<any>): ModuleCoverage[] {
  const moduleMap = new Map<string, { lines: number; hits: number; misses: number }>();

  files.forEach(file => {
    if (file.name && file.totals) {
      // Group files by top-level directory
      const parts = file.name.split('/');
      const moduleName = parts.length > 1 ? `${parts[0]}/${parts[1]}` : parts[0] || file.name;

      const existing = moduleMap.get(moduleName) || { lines: 0, hits: 0, misses: 0 };
      moduleMap.set(moduleName, {
        lines: existing.lines + (file.totals.lines || 0),
        hits: existing.hits + (file.totals.hits || 0),
        misses: existing.misses + (file.totals.misses || 0),
      });
    }
  });

  return Array.from(moduleMap.entries()).map(([name, data]) => ({
    name,
    coverage: data.lines > 0 ? (data.hits / data.lines) * 100 : 0,
    lines: data.lines,
    missedLines: data.misses,
  }));
}

/**
 * Generate sample data for development/testing
 */
function generateSampleData(): QualityMetrics {
  return {
    overallCoverage: 75.5,
    totalLines: 12456,
    coveredLines: 9404,
    missedLines: 3052,
    branchCoverage: 68.3,
    lineCoverage: 75.5,
    complexity: 'Medium',
    lastUpdated: new Date().toISOString(),
    modules: [
      { name: 'src/lib/github', coverage: 45.2, lines: 892, missedLines: 489 },
      { name: 'src/components/ui', coverage: 32.8, lines: 1245, missedLines: 836 },
      { name: 'src/lib/analytics', coverage: 58.9, lines: 678, missedLines: 278 },
      { name: 'src/pages/api', coverage: 42.1, lines: 534, missedLines: 309 },
      { name: 'src/lib/utils', coverage: 89.4, lines: 423, missedLines: 45 },
      { name: 'src/components/charts', coverage: 67.2, lines: 789, missedLines: 259 },
      { name: 'src/lib/data', coverage: 78.6, lines: 345, missedLines: 74 },
    ],
    history: [], // No fake history data in sample data either
  };
}

/**
 * Main function to get quality metrics
 */
export async function getQualityMetrics(): Promise<QualityMetrics> {
  const config = getCodecovConfig();

  // If no API token is configured, return sample data
  if (!config.apiToken) {
    console.warn('Codecov API token not configured, using sample data');
    return generateSampleData();
  }

  console.log('Codecov API configuration:', {
    baseUrl: config.baseUrl,
    service: config.service,
    owner: config.owner,
    repo: config.repo,
    apiTokenConfigured: !!config.apiToken,
  });

  try {
    // Get repository coverage data
    const coverageResult = await getRepositoryCoverage(config);

    if (!coverageResult.success) {
      console.error('Failed to fetch coverage data:', coverageResult.error);
      return generateSampleData();
    }

    // Get coverage trends with explicit date range for better data
    let trendsResult = await getCoverageTrends(config, {
      interval: '1d',
      daysBack: 30,
    });

    if (!trendsResult.success || ((trendsResult.data as any)?.results || []).length < 7) {
      console.log('Insufficient 30-day data, trying 7-day range');
      const weeklyTrends = await getCoverageTrends(config, {
        interval: '1d',
        daysBack: 7,
      });
      if (weeklyTrends.success && ((weeklyTrends.data as any)?.results || []).length > 0) {
        trendsResult = weeklyTrends;
      }
    }

    if (!trendsResult.success) {
      console.warn('Failed to fetch trends data:', trendsResult.error);
    } else {
      const resultsCount = ((trendsResult.data as any)?.results || []).length;
      console.log('Trends data retrieved successfully:', {
        hasResults: !!(trendsResult.data as any)?.results,
        resultsCount,
        sampleData: JSON.stringify((trendsResult.data as any)?.results?.[0] || {}, null, 2),
      });
    }

    // Transform and combine data
    const qualityMetrics = transformCodecovData(coverageResult.data);

    // If no modules were found, try to get more detailed file-level data
    if (qualityMetrics.modules.length === 0) {
      console.log('No module data found, trying to fetch detailed file coverage...');
      // Try to get file-level coverage data
      const detailedResult = await getRepositoryCoverage(config, { path: '' });
      if (detailedResult.success) {
        const detailedData = detailedResult.data as any;
        if (detailedData.files && Array.isArray(detailedData.files)) {
          console.log('Found detailed file data:', detailedData.files.length, 'files');
          qualityMetrics.modules = generateModulesFromFiles(detailedData.files);
        }
      }
    }

    // Add trends data if available
    if (trendsResult.success && trendsResult.data) {
      const trendsResponse = trendsResult.data as { results?: Array<any> };
      if (trendsResponse.results && Array.isArray(trendsResponse.results)) {
        try {
          qualityMetrics.history = trendsResponse.results
            .filter(item => item && typeof item === 'object')
            .map(item => {
              // Handle different possible timestamp formats
              let dateStr = '';
              if (item.date) {
                dateStr = item.date;
              } else if (item.timestamp) {
                dateStr = item.timestamp.split('T')[0] || '';
              } else {
                dateStr = new Date().toISOString().split('T')[0] || '';
              }

              // Extract coverage value from different possible locations
              let coverageValue = 0;
              if (typeof item.coverage === 'number') {
                coverageValue = item.coverage;
              } else if (typeof item.totals?.coverage === 'number') {
                coverageValue = item.totals.coverage;
              } else if (typeof item.avg === 'number') {
                coverageValue = item.avg;
              } else if (typeof item.min === 'number' && typeof item.max === 'number') {
                // Use average of min and max if individual coverage not available
                coverageValue = (item.min + item.max) / 2;
              }

              return {
                date: dateStr,
                coverage: Math.round(coverageValue * 100) / 100, // Round to 2 decimal places
              };
            })
            .filter(item => item.date && typeof item.coverage === 'number' && item.coverage > 0)
            .slice(-30); // Keep last 30 data points

          console.log('Processed trends data:', {
            originalCount: trendsResponse.results.length,
            processedCount: qualityMetrics.history.length,
            sampleHistory: qualityMetrics.history.slice(0, 3),
          });
        } catch (error) {
          console.warn('Failed to parse trends data:', error);
          qualityMetrics.history = []; // Use empty array instead of fake data
        }
      }
    }

    // Log history data status without generating fake data
    if (qualityMetrics.history.length === 0) {
      console.log('No history data available from Codecov API');
    } else if (qualityMetrics.history.length < 7) {
      console.log(
        `Limited history data (${qualityMetrics.history.length} points) - showing actual data only`
      );
    } else {
      console.log(`Good history data available (${qualityMetrics.history.length} points)`);
    }

    // If still no modules, use sample data for visualization
    if (qualityMetrics.modules.length === 0) {
      console.log('No module data available, using sample module data for demonstration');
      qualityMetrics.modules = generateSampleData().modules;
    }

    console.log('Final quality metrics summary:', {
      coverage: qualityMetrics.overallCoverage,
      totalLines: qualityMetrics.totalLines,
      modulesCount: qualityMetrics.modules.length,
      historyCount: qualityMetrics.history.length,
    });

    return QualityMetricsSchema.parse(qualityMetrics);
  } catch (error) {
    console.error('Error fetching quality metrics:', error);
    return generateSampleData();
  }
}

/**
 * Get modules that need attention (lowest coverage)
 */
export function getModulesNeedingAttention(
  metrics: QualityMetrics,
  count: number = 5
): ModuleCoverage[] {
  return metrics.modules.sort((a, b) => a.coverage - b.coverage).slice(0, count);
}

/**
 * Calculate coverage improvement recommendations
 */
export function getCoverageRecommendations(metrics: QualityMetrics): {
  priority: 'high' | 'medium' | 'low';
  message: string;
  action: string;
}[] {
  const recommendations = [];

  // Check overall coverage
  if (metrics.overallCoverage < 70) {
    recommendations.push({
      priority: 'high' as const,
      message: '総合カバレッジが70%を下回っています',
      action: 'テストの追加を優先的に実施してください',
    });
  }

  // Check for modules with very low coverage
  const lowCoverageModules = metrics.modules.filter(m => m.coverage < 40);
  if (lowCoverageModules.length > 0) {
    recommendations.push({
      priority: 'high' as const,
      message: `${lowCoverageModules.length}個のモジュールが40%未満の低カバレッジです`,
      action: '低カバレッジモジュールへのテスト追加を検討してください',
    });
  }

  // Check for missed lines
  const missedLineRatio = metrics.missedLines / metrics.totalLines;
  if (missedLineRatio > 0.3) {
    recommendations.push({
      priority: 'medium' as const,
      message: '30%以上の行がテストされていません',
      action: '段階的にテストカバレッジを改善してください',
    });
  }

  return recommendations;
}

/**
 * Export utility functions for external use
 */
export {
  getCodecovConfig,
  makeCodecovRequest,
  getRepositoryCoverage,
  getCoverageTrends,
  getRepositoryFlags,
};

/**
 * Codecov API Integration for Quality Analysis
 *
 * This module provides functions to interact with Codecov API v2
 * for retrieving code coverage metrics and quality analysis data.
 */

import { z } from 'zod';

// Zod schemas for type safety
export const CodecovConfigSchema = z.object({
  token: z.string().optional(),
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

// Result type for error handling
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

/**
 * Get configuration from environment variables
 */
function getCodecovConfig(): CodecovConfig {
  const config = {
    token: import.meta.env['CODECOV_TOKEN'],
    owner: import.meta.env['CODECOV_OWNER'] || import.meta.env['GITHUB_OWNER'] || 'nyasuto',
    repo: import.meta.env['CODECOV_REPO'] || import.meta.env['GITHUB_REPO'] || 'beaver',
    service: 'github' as const,
    baseUrl: 'https://api.codecov.io',
  };

  console.log('Environment variables for Codecov:', {
    CODECOV_TOKEN: !!import.meta.env['CODECOV_TOKEN'],
    CODECOV_OWNER: import.meta.env['CODECOV_OWNER'],
    CODECOV_REPO: import.meta.env['CODECOV_REPO'],
    GITHUB_OWNER: import.meta.env['GITHUB_OWNER'],
    GITHUB_REPO: import.meta.env['GITHUB_REPO'],
    finalOwner: config.owner,
    finalRepo: config.repo,
  });

  return CodecovConfigSchema.parse(config);
}

/**
 * Make authenticated request to Codecov API
 */
async function makeCodecovRequest<T>(endpoint: string, config: CodecovConfig): Promise<Result<T>> {
  try {
    if (!config.token) {
      throw new Error('Codecov token not configured');
    }

    const url = `${config.baseUrl}/api/v2/${config.service}/${config.owner}/${endpoint}`;

    console.log('Making Codecov API request:', {
      url,
      endpoint,
      owner: config.owner,
      repo: config.repo,
      tokenLength: config.token?.length || 0,
      tokenPrefix: config.token?.substring(0, 8) + '...' || 'none',
    });

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Codecov API response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });

    if (!response.ok) {
      const responseText = await response.text();
      console.error('Codecov API error response:', responseText);
      throw new Error(
        `Codecov API error: ${response.status} ${response.statusText} - ${responseText}`
      );
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Codecov request failed:', error);
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
 * Get coverage trends over time
 */
async function getCoverageTrends(
  config: CodecovConfig,
  interval: '1d' | '7d' | '30d' = '7d'
): Promise<Result<unknown>> {
  const endpoint = `repos/${config.repo}/coverage/?interval=${interval}`;
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
 * Generate sample coverage history data (clearly marked as dummy data)
 */
function generateCoverageHistory(): CoverageHistory[] {
  const history: CoverageHistory[] = [];
  const now = new Date();
  const daysToGenerate = 30; // Generate 1 month of dummy data

  // Use obviously fake/demo coverage values that make it clear this is sample data
  const dummyPatterns = [
    42.0, 37.5, 33.3, 25.0, 20.0, 15.0, 10.0, 5.0, 1.0, 0.1, 99.9, 95.0, 90.0, 85.0, 80.0, 75.0,
    70.0, 65.0, 60.0, 55.0, 50.0, 45.0, 40.0, 35.0, 30.0, 25.0, 20.0, 15.0, 10.0, 7.77,
  ];

  for (let i = daysToGenerate; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Use pattern values that are clearly dummy data (nice round numbers, π, etc.)
    const patternIndex = i % dummyPatterns.length;
    const dummyCoverage = dummyPatterns[patternIndex] ?? 50.0; // Fallback value

    const dateString = date.toISOString().split('T')[0];
    if (dateString) {
      history.push({
        date: dateString,
        coverage: dummyCoverage,
      });
    }
  }

  return history;
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
    history: generateCoverageHistory(),
  };
}

/**
 * Main function to get quality metrics
 */
export async function getQualityMetrics(): Promise<QualityMetrics> {
  const config = getCodecovConfig();

  // If no token is configured, return sample data
  if (!config.token) {
    console.warn('Codecov token not configured, using sample data');
    return generateSampleData();
  }

  console.log('Codecov API configuration:', {
    baseUrl: config.baseUrl,
    service: config.service,
    owner: config.owner,
    repo: config.repo,
    tokenConfigured: !!config.token,
  });

  try {
    // Get repository coverage data
    const coverageResult = await getRepositoryCoverage(config);

    if (!coverageResult.success) {
      console.error('Failed to fetch coverage data:', coverageResult.error);
      return generateSampleData();
    }

    // Get coverage trends
    const trendsResult = await getCoverageTrends(config);

    if (!trendsResult.success) {
      console.warn('Failed to fetch trends data:', trendsResult.error);
    } else {
      console.log('Trends data retrieved successfully:', {
        hasResults: !!(trendsResult.data as any)?.results,
        resultsCount: ((trendsResult.data as any)?.results || []).length,
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
          qualityMetrics.history = generateCoverageHistory();
        }
      }
    }

    // Ensure history is not empty (fallback to generated data)
    if (qualityMetrics.history.length === 0) {
      console.log('No valid history data found, using generated data');
      qualityMetrics.history = generateCoverageHistory();
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

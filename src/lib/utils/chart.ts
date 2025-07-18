/**
 * Chart Utilities
 *
 * Utility functions for converting analytics data to Chart.js format
 * and handling common chart operations.
 *
 * @module ChartUtils
 */

import type { ChartType } from 'chart.js';
import type {
  SafeChartData,
  SafeChartOptions,
  TimeSeriesPoint,
} from '../../components/charts/types/safe-chart';
import { enhancedConfigManager } from '../classification/enhanced-config-manager';
/**
 * Performance metrics interface (standalone to replace analytics dependency)
 */
export interface PerformanceMetrics {
  averageResponseTime: number;
  averageResolutionTime: number;
  medianResolutionTime: number;
  totalRequests: number;
  errorRate: number;
  cacheHitRate: number;
  throughput: number;
  backlogSize: number;
  timestamp: string;
}
import type { IssueClassification, EnhancedIssueClassification } from '../schemas/classification';

/**
 * Chart theme configuration
 */
export interface ChartTheme {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    background: string;
    text: string;
    border: string;
  };
  fonts: {
    family: string;
    size: number;
    weight: string;
  };
  grid: {
    color: string;
    borderColor: string;
  };
}

/**
 * Default light theme
 */
export const LIGHT_THEME: ChartTheme = {
  colors: {
    primary: '#3B82F6',
    secondary: '#6B7280',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#06B6D4',
    background: '#FFFFFF',
    text: '#1F2937',
    border: '#E5E7EB',
  },
  fonts: {
    family: 'Inter, system-ui, sans-serif',
    size: 12,
    weight: 'normal',
  },
  grid: {
    color: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
};

/**
 * Default dark theme
 */
export const DARK_THEME: ChartTheme = {
  colors: {
    primary: '#60A5FA',
    secondary: '#9CA3AF',
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#22D3EE',
    background: '#1F2937',
    text: '#F9FAFB',
    border: '#374151',
  },
  fonts: {
    family: 'Inter, system-ui, sans-serif',
    size: 12,
    weight: 'normal',
  },
  grid: {
    color: '#374151',
    borderColor: '#4B5563',
  },
};

/**
 * Chart color palette
 */
export const CHART_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // yellow
  '#EF4444', // red
  '#8B5CF6', // purple
  '#06B6D4', // cyan
  '#F97316', // orange
  '#EC4899', // pink
  '#84CC16', // lime
  '#6366F1', // indigo
];

/**
 * Convert time series data to Chart.js format
 */
export function convertTimeSeriesData(
  data: TimeSeriesPoint[],
  label: string = 'Data',
  color: string = CHART_COLORS[0] || '#3B82F6'
): SafeChartData<'line'> {
  return {
    labels: data.map(point => {
      const year = point.timestamp.getFullYear();
      const month = point.timestamp.getMonth() + 1;
      const day = point.timestamp.getDate();
      return `${year}/${month}/${day}`;
    }),
    datasets: [
      {
        label,
        data: data.map(point => point.value),
        borderColor: color,
        backgroundColor: color + '20', // Add transparency
        fill: false,
        tension: 0.1,
      },
    ],
  };
}

/**
 * Convert category data to Chart.js format for bar charts
 */
export function convertCategoryData(
  data: Record<string, number>,
  label: string = 'Count',
  colors: string[] = CHART_COLORS
): SafeChartData<'bar'> {
  const entries = Object.entries(data);

  return {
    labels: entries.map(([key]) => key),
    datasets: [
      {
        label,
        data: entries.map(([, value]) => value),
        backgroundColor: entries.map(
          (_, index) => (colors[index % colors.length] || '#3B82F6') + '80'
        ),
        borderColor: entries.map((_, index) => colors[index % colors.length] || '#3B82F6'),
        borderWidth: 1,
      },
    ],
  };
}

/**
 * Convert percentage data to Chart.js format for pie charts
 */
export function convertPieData(
  data: Record<string, number>,
  colors: string[] = CHART_COLORS
): SafeChartData<'pie'> {
  const entries = Object.entries(data);

  return {
    labels: entries.map(([key]) => key),
    datasets: [
      {
        label: 'Distribution',
        data: entries.map(([, value]) => value),
        backgroundColor: entries.map(
          (_, index) => (colors[index % colors.length] || '#3B82F6') + '80'
        ),
        borderColor: entries.map((_, index) => colors[index % colors.length] || '#3B82F6'),
        borderWidth: 2,
      },
    ],
  };
}

/**
 * Convert classification data to chart format (supports both legacy and enhanced)
 */
export async function convertClassificationData(classifications: IssueClassification[]): Promise<{
  categoryDistribution: SafeChartData<'pie'>;
  priorityDistribution: SafeChartData<'bar'>;
  confidenceDistribution: SafeChartData<'bar'>;
}> {
  // Get configurable display ranges
  const configResult = await enhancedConfigManager.loadConfig();
  const config = configResult.config;
  const displayRanges = config.displayRanges;

  // Calculate category distribution
  const categoryCount: Record<string, number> = {};
  const priorityCount: Record<string, number> = {};
  const confidenceRanges: Record<string, number> = {
    [displayRanges?.confidence?.low?.label ?? 'Low (0-0.3)']: 0,
    [displayRanges?.confidence?.medium?.label ?? 'Medium (0.3-0.7)']: 0,
    [displayRanges?.confidence?.high?.label ?? 'High (0.7-1.0)']: 0,
  };

  classifications.forEach(classification => {
    // Count categories
    categoryCount[classification.primaryCategory] =
      (categoryCount[classification.primaryCategory] || 0) + 1;

    // Count priorities
    priorityCount[classification.estimatedPriority] =
      (priorityCount[classification.estimatedPriority] || 0) + 1;

    // Count confidence ranges using configurable thresholds
    const confidence = classification.primaryConfidence;
    const lowMax = displayRanges?.confidence?.low?.max ?? 0.3;
    const mediumMax = displayRanges?.confidence?.medium?.max ?? 0.7;
    const lowLabel = displayRanges?.confidence?.low?.label ?? 'Low (0-0.3)';
    const mediumLabel = displayRanges?.confidence?.medium?.label ?? 'Medium (0.3-0.7)';
    const highLabel = displayRanges?.confidence?.high?.label ?? 'High (0.7-1.0)';

    if (confidence < lowMax) {
      confidenceRanges[lowLabel] = (confidenceRanges[lowLabel] || 0) + 1;
    } else if (confidence < mediumMax) {
      confidenceRanges[mediumLabel] = (confidenceRanges[mediumLabel] || 0) + 1;
    } else {
      confidenceRanges[highLabel] = (confidenceRanges[highLabel] || 0) + 1;
    }
  });

  return {
    categoryDistribution: convertPieData(categoryCount),
    priorityDistribution: convertCategoryData(priorityCount, 'Issues'),
    confidenceDistribution: convertCategoryData(confidenceRanges, 'Classifications'),
  };
}

/**
 * Convert enhanced classification data to chart format
 */
export async function convertEnhancedClassificationData(
  classifications: EnhancedIssueClassification[]
): Promise<{
  categoryDistribution: SafeChartData<'pie'>;
  priorityDistribution: SafeChartData<'bar'>;
  confidenceDistribution: SafeChartData<'bar'>;
  scoreDistribution: SafeChartData<'bar'>;
  scoreBreakdownChart: SafeChartData<'bar'>;
}> {
  // Get configurable display ranges
  const configResult = await enhancedConfigManager.loadConfig();
  const config = configResult.config;
  const displayRanges = config.displayRanges;

  // Calculate category distribution
  const categoryCount: Record<string, number> = {};
  const priorityCount: Record<string, number> = {};
  const confidenceRanges: Record<string, number> = {
    [displayRanges?.confidence?.low?.label ?? 'Low (0-0.3)']: 0,
    [displayRanges?.confidence?.medium?.label ?? 'Medium (0.3-0.7)']: 0,
    [displayRanges?.confidence?.high?.label ?? 'High (0.7-1.0)']: 0,
  };
  const scoreRanges: Record<string, number> = {
    [displayRanges?.score?.low?.label ?? 'Low (0-25)']: 0,
    [displayRanges?.score?.medium?.label ?? 'Medium (25-50)']: 0,
    [displayRanges?.score?.high?.label ?? 'High (50-75)']: 0,
    [displayRanges?.score?.veryHigh?.label ?? 'Very High (75-100)']: 0,
  };

  // Score breakdown accumulator
  const scoreBreakdownSum = {
    category: 0,
    priority: 0,
    recency: 0,
    custom: 0,
  };

  classifications.forEach(classification => {
    // Count categories
    categoryCount[classification.primaryCategory] =
      (categoryCount[classification.primaryCategory] || 0) + 1;

    // Count priorities
    priorityCount[classification.estimatedPriority] =
      (priorityCount[classification.estimatedPriority] || 0) + 1;

    // Count confidence ranges using configurable thresholds
    const confidence = classification.primaryConfidence;
    const confLowMax = displayRanges?.confidence?.low?.max ?? 0.3;
    const confMediumMax = displayRanges?.confidence?.medium?.max ?? 0.7;
    const confLowLabel = displayRanges?.confidence?.low?.label ?? 'Low (0-0.3)';
    const confMediumLabel = displayRanges?.confidence?.medium?.label ?? 'Medium (0.3-0.7)';
    const confHighLabel = displayRanges?.confidence?.high?.label ?? 'High (0.7-1.0)';

    if (confidence < confLowMax) {
      confidenceRanges[confLowLabel] = (confidenceRanges[confLowLabel] || 0) + 1;
    } else if (confidence < confMediumMax) {
      confidenceRanges[confMediumLabel] = (confidenceRanges[confMediumLabel] || 0) + 1;
    } else {
      confidenceRanges[confHighLabel] = (confidenceRanges[confHighLabel] || 0) + 1;
    }

    // Count score ranges using configurable thresholds
    const score = classification.score;
    const scoreLowMax = displayRanges?.score?.low?.max ?? 25;
    const scoreMediumMax = displayRanges?.score?.medium?.max ?? 50;
    const scoreHighMax = displayRanges?.score?.high?.max ?? 75;
    const scoreLowLabel = displayRanges?.score?.low?.label ?? 'Low (0-25)';
    const scoreMediumLabel = displayRanges?.score?.medium?.label ?? 'Medium (25-50)';
    const scoreHighLabel = displayRanges?.score?.high?.label ?? 'High (50-75)';
    const scoreVeryHighLabel = displayRanges?.score?.veryHigh?.label ?? 'Very High (75-100)';

    if (score < scoreLowMax) {
      scoreRanges[scoreLowLabel] = (scoreRanges[scoreLowLabel] || 0) + 1;
    } else if (score < scoreMediumMax) {
      scoreRanges[scoreMediumLabel] = (scoreRanges[scoreMediumLabel] || 0) + 1;
    } else if (score < scoreHighMax) {
      scoreRanges[scoreHighLabel] = (scoreRanges[scoreHighLabel] || 0) + 1;
    } else {
      scoreRanges[scoreVeryHighLabel] = (scoreRanges[scoreVeryHighLabel] || 0) + 1;
    }

    // Accumulate score breakdown
    scoreBreakdownSum.category += classification.scoreBreakdown.category;
    scoreBreakdownSum.priority += classification.scoreBreakdown.priority;
    scoreBreakdownSum.recency += classification.scoreBreakdown.recency || 0;
    scoreBreakdownSum.custom += classification.scoreBreakdown.custom || 0;
  });

  // Calculate average score breakdown
  const count = classifications.length;
  const avgScoreBreakdown = {
    Category: count > 0 ? scoreBreakdownSum.category / count : 0,
    Priority: count > 0 ? scoreBreakdownSum.priority / count : 0,
    Recency: count > 0 ? scoreBreakdownSum.recency / count : 0,
    Custom: count > 0 ? scoreBreakdownSum.custom / count : 0,
  };

  return {
    categoryDistribution: convertPieData(categoryCount),
    priorityDistribution: convertCategoryData(priorityCount, 'Issues'),
    confidenceDistribution: convertCategoryData(confidenceRanges, 'Classifications'),
    scoreDistribution: convertCategoryData(scoreRanges, 'Issues'),
    scoreBreakdownChart: convertCategoryData(avgScoreBreakdown, 'Average Score'),
  };
}

/**
 * Type guard to check if classifications are enhanced
 */
export function isEnhancedClassificationArray(
  classifications: IssueClassification[] | EnhancedIssueClassification[]
): classifications is EnhancedIssueClassification[] {
  return (
    classifications.length > 0 &&
    'score' in classifications[0]! &&
    'scoreBreakdown' in classifications[0]!
  );
}

/**
 * Universal classification data converter (auto-detects type)
 */
export async function convertClassificationDataUniversal(
  classifications: IssueClassification[] | EnhancedIssueClassification[]
): Promise<{
  categoryDistribution: SafeChartData<'pie'>;
  priorityDistribution: SafeChartData<'bar'>;
  confidenceDistribution: SafeChartData<'bar'>;
  scoreDistribution?: SafeChartData<'bar'>;
  scoreBreakdownChart?: SafeChartData<'bar'>;
}> {
  if (isEnhancedClassificationArray(classifications)) {
    return await convertEnhancedClassificationData(classifications);
  } else {
    return await convertClassificationData(classifications);
  }
}

/**
 * Convert performance metrics to chart format
 */
export function convertPerformanceData(metrics: PerformanceMetrics[]): {
  resolutionTimeChart: SafeChartData<'line'>;
  throughputChart: SafeChartData<'bar'>;
  backlogChart: SafeChartData<'line'>;
} {
  const labels = metrics.map((_, index) => `Period ${index + 1}`);

  return {
    resolutionTimeChart: {
      labels,
      datasets: [
        {
          label: 'Average Resolution Time (hours)',
          data: metrics.map(m => m.averageResolutionTime),
          borderColor: CHART_COLORS[0] || '#3B82F6',
          backgroundColor: (CHART_COLORS[0] || '#3B82F6') + '20',
          fill: false,
        },
        {
          label: 'Median Resolution Time (hours)',
          data: metrics.map(m => m.medianResolutionTime),
          borderColor: CHART_COLORS[1] || '#10B981',
          backgroundColor: (CHART_COLORS[1] || '#10B981') + '20',
          fill: false,
        },
      ],
    },
    throughputChart: {
      labels,
      datasets: [
        {
          label: 'Issues Resolved Per Day',
          data: metrics.map(m => m.throughput),
          backgroundColor: (CHART_COLORS[2] || '#F59E0B') + '80',
          borderColor: CHART_COLORS[2] || '#F59E0B',
          borderWidth: 1,
        },
      ],
    },
    backlogChart: {
      labels,
      datasets: [
        {
          label: 'Backlog Size',
          data: metrics.map(m => m.backlogSize),
          backgroundColor: (CHART_COLORS[3] || '#EF4444') + '40',
          borderColor: CHART_COLORS[3] || '#EF4444',
          fill: true,
        },
      ],
    },
  };
}

/**
 * Generate default Chart.js options with theme support
 */
export function generateChartOptions<T extends ChartType>(
  type: T,
  theme: ChartTheme,
  customOptions?: Partial<SafeChartOptions<T>>
): SafeChartOptions<T> {
  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: theme.colors.text,
          font: {
            family: theme.fonts.family,
            size: theme.fonts.size,
          },
        },
      },
      tooltip: {
        backgroundColor: theme.colors.background,
        titleColor: theme.colors.text,
        bodyColor: theme.colors.text,
        borderColor: theme.colors.border,
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            const label = context.dataset?.label || '';
            const value = context.parsed;

            if (typeof value === 'number') {
              return `${label}: ${value.toLocaleString()}`;
            }

            return `${label}: ${JSON.stringify(value)}`;
          },
        },
      },
    },
    scales: {},
  };

  // Add scale configuration for charts that support scales
  if (type === 'line' || type === 'bar') {
    baseOptions.scales = {
      x: {
        ticks: {
          color: theme.colors.text,
          font: {
            family: theme.fonts.family,
            size: theme.fonts.size,
          },
        },
        grid: {
          color: theme.grid.color,
        },
      },
      y: {
        ticks: {
          color: theme.colors.text,
          font: {
            family: theme.fonts.family,
            size: theme.fonts.size,
          },
        },
        grid: {
          color: theme.grid.color,
        },
      },
    };
  }

  // Merge with custom options
  return {
    ...baseOptions,
    ...customOptions,
  } as SafeChartOptions<T>;
}

/**
 * Format number for chart display
 */
export function formatChartValue(
  value: number,
  type: 'number' | 'percentage' | 'currency' = 'number'
): string {
  switch (type) {
    case 'percentage':
      return `${(value * 100).toFixed(1)}%`;
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value);
    default:
      return value.toLocaleString();
  }
}

/**
 * Generate chart configuration
 */
export function generateChartConfig<T extends ChartType>(
  type: T,
  data: SafeChartData<T>,
  theme: ChartTheme,
  customOptions?: Partial<SafeChartOptions<T>>
): { type: T; data: SafeChartData<T>; options: SafeChartOptions<T> } {
  return {
    type,
    data,
    options: generateChartOptions(type, theme, customOptions),
  };
}

/**
 * Calculate chart dimensions based on container
 */
export function calculateChartDimensions(
  containerWidth: number,
  containerHeight: number,
  aspectRatio: number = 2
): { width: number; height: number } {
  const width = Math.min(containerWidth, containerHeight * aspectRatio);
  const height = width / aspectRatio;

  return {
    width: Math.floor(width),
    height: Math.floor(height),
  };
}

/**
 * Debounce function for chart updates
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

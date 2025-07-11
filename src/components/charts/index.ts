/**
 * Charts Module Index
 *
 * This module exports the type-safe chart components and utilities for the Beaver Astro application.
 * It provides comprehensive data visualization capabilities with Chart.js integration.
 *
 * Note: This version focuses on the type-safe BaseChart foundation. Other chart components
 * (LineChart, BarChart, PieChart, AreaChart, QualityCharts) are being migrated to use
 * the new SafeChart wrapper system and will be re-enabled once migration is complete.
 *
 * @module Charts
 */

// Base chart components (fully type-safe)
export { BaseChart, ChartContainer, withChartTheme } from './BaseChart';
export type { BaseChartProps, ChartContainerProps } from './BaseChart';

// Specialized chart components
export { CoverageChart, CoverageMetricsCard } from './CoverageChart';
export type {
  CoverageMetrics,
  CoverageChartProps,
  CoverageMetricsCardProps,
} from './CoverageChart';

export { ModuleCoverageChart, ModuleCoverageSummary } from './ModuleCoverageChart';
export type {
  ModuleCoverageData,
  ModuleCoverageChartProps,
  ModuleCoverageSummaryProps,
} from './ModuleCoverageChart';

// Type-safe chart wrapper system
import type {
  SafeChartData,
  SafeChartOptions,
  SafeChart,
  SafeChartConfiguration,
  SafeChartResult,
  SafeChartTheme,
  SafeDataset,
  TimeSeriesPoint,
} from './types/safe-chart';

export type {
  SafeChartData,
  SafeChartOptions,
  SafeChart,
  SafeChartConfiguration,
  SafeChartResult,
  SafeChartTheme,
  SafeDataset,
  TimeSeriesPoint,
};

export {
  createSafeChart,
  validateChartData,
  validateChartOptions,
  convertToChartJSData,
  convertToChartJSOptions,
  updateSafeChart,
  resizeSafeChart,
  exportSafeChart,
  destroySafeChart,
  createSafeDataset,
  mergeSafeDatasets,
  normalizeSafeChartData,
  debounce,
  throttle,
} from './utils/safe-wrapper';

// Chart utilities
export {
  convertTimeSeriesData,
  convertCategoryData,
  convertPieData,
  convertClassificationData,
  convertPerformanceData,
  generateChartOptions,
  generateChartConfig,
  calculateChartDimensions,
  formatChartValue,
  LIGHT_THEME,
  DARK_THEME,
  CHART_COLORS,
} from '../../lib/utils/chart';

export type { ChartTheme } from '../../lib/utils/chart';

// Chart configuration constants
export const CHART_CONFIG = {
  animations: {
    enabled: true,
    duration: 750,
    easing: 'easeInOutQuart',
  },
  responsive: {
    maintainAspectRatio: false,
    resizeDelay: 150,
  },
  colors: {
    primary: '#3B82F6',
    secondary: '#6B7280',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#06B6D4',
  },
  defaults: {
    borderWidth: 2,
    pointRadius: 3,
    tension: 0.4,
    fillOpacity: 0.3,
  },
} as const;

// Chart type definitions
export type ChartType = 'line' | 'bar' | 'pie' | 'doughnut' | 'area';

export interface ChartProps {
  /** Chart type */
  type: ChartType;
  /** Chart data */
  data: SafeChartData;
  /** Chart options */
  options?: SafeChartOptions;
  /** Chart theme */
  theme?: 'light' | 'dark' | 'auto';
  /** Chart size */
  size?: 'small' | 'medium' | 'large';
  /** Loading state */
  loading?: boolean;
  /** Error state */
  error?: string;
}

// Pre-configured chart components for common use cases
export const PRESET_CHARTS = {
  // Issue analytics presets
  issuesTrend: {
    type: 'line' as const,
    smooth: true,
    showPoints: true,
    fill: true,
    fillOpacity: 0.2,
  },
  issuesByCategory: {
    type: 'pie' as const,
    showPercentages: true,
    showLegend: true,
    legendPosition: 'right' as const,
  },
  issuesByPriority: {
    type: 'bar' as const,
    orientation: 'horizontal' as const,
    showValues: true,
    sortByValue: true,
  },
  performanceMetrics: {
    type: 'area' as const,
    stacked: true,
    showGrid: true,
    smooth: true,
  },

  // Repository analytics presets
  contributorActivity: {
    type: 'bar' as const,
    orientation: 'vertical' as const,
    showValues: false,
    borderRadius: 4,
  },
  codeQuality: {
    type: 'line' as const,
    smooth: true,
    showPoints: false,
    tension: 0.3,
  },

  // Dashboard presets
  sparkline: {
    type: 'area' as const,
    height: 60,
    hideAxes: true,
    hideLegend: true,
    showPoints: false,
  },
  gauge: {
    type: 'doughnut' as const,
    cutout: 70,
    showNeedle: true,
    rotation: -90,
    circumference: 180,
  },
} as const;

// Chart factory function (currently limited to BaseChart)
export function createChart(type: ChartType, props: ChartProps = {} as ChartProps) {
  const preset = PRESET_CHARTS[type as keyof typeof PRESET_CHARTS] || {};

  return {
    component: 'BaseChart',
    props: {
      ...preset,
      ...props,
      type,
    },
  };
}

// Export default chart component selector (using BaseChart foundation)
export function Chart({ type, data, options, ...props }: ChartProps) {
  // Return component configuration object instead of React element
  return {
    component: 'BaseChart',
    props: {
      type,
      data,
      options,
      ...props,
    },
  };
}

export default Chart;

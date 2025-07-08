/**
 * Charts Module Index
 *
 * This module exports all chart components and utilities for the Beaver Astro application.
 * It provides comprehensive data visualization capabilities with Chart.js integration.
 *
 * @module Charts
 */

import React from 'react';
import { ThemedLineChart } from './LineChart';
import { ThemedBarChart } from './BarChart';
import { ThemedPieChart } from './PieChart';
import { ThemedAreaChart } from './AreaChart';

// Base chart components
export { BaseChart, ChartContainer, withChartTheme } from './BaseChart';
export type { BaseChartProps, ChartContainerProps } from './BaseChart';

// Line chart components
export { LineChart, ThemedLineChart, TimeSeriesChart } from './LineChart';
export type { LineChartProps, TimeSeriesChartProps } from './LineChart';

// Bar chart components
export {
  BarChart,
  ThemedBarChart,
  HorizontalBarChart,
  StackedBarChart,
  ComparisonBarChart,
} from './BarChart';
export type {
  BarChartProps,
  HorizontalBarChartProps,
  StackedBarChartProps,
  ComparisonBarChartProps,
} from './BarChart';

// Pie chart components
export { PieChart, ThemedPieChart, DoughnutChart, SemiCircleChart } from './PieChart';
export type { PieChartProps, DoughnutChartProps, SemiCircleChartProps } from './PieChart';

// Area chart components
export {
  AreaChart,
  ThemedAreaChart,
  StackedAreaChart,
  StreamChart,
  SparklineAreaChart,
} from './AreaChart';
export type {
  AreaChartProps,
  StackedAreaChartProps,
  StreamChartProps,
  SparklineAreaChartProps,
} from './AreaChart';

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
  debounce,
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
  data: any;
  /** Chart options */
  options?: any;
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

// Chart factory function
export function createChart(type: ChartType, props: any = {}) {
  const preset = PRESET_CHARTS[type as keyof typeof PRESET_CHARTS] || {};

  switch (type) {
    case 'line':
      return { component: 'ThemedLineChart', props: { ...preset, ...props } };
    case 'bar':
      return { component: 'ThemedBarChart', props: { ...preset, ...props } };
    case 'pie':
      return { component: 'ThemedPieChart', props: { ...preset, ...props } };
    case 'area':
      return { component: 'ThemedAreaChart', props: { ...preset, ...props } };
    default:
      return { component: 'ThemedLineChart', props };
  }
}

// Export default chart component selector
export function Chart({ type, ...props }: ChartProps) {
  const { props: chartProps } = createChart(type, props);

  // Return the appropriate component based on type
  switch (type) {
    case 'line':
      return React.createElement(ThemedLineChart, chartProps);
    case 'bar':
      return React.createElement(ThemedBarChart, chartProps);
    case 'pie':
      return React.createElement(ThemedPieChart, chartProps);
    case 'area':
      return React.createElement(ThemedAreaChart, chartProps);
    default:
      return React.createElement(ThemedLineChart, chartProps);
  }
}

export default Chart;

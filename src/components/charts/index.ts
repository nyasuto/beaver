/**
 * Chart Components Index
 *
 * This module exports all data visualization components for the Beaver Astro application.
 * These components are built with Chart.js and provide interactive data visualization.
 *
 * @module ChartComponents
 */

// Chart components will be exported here
// Example exports (to be implemented):
// export { LineChart } from './LineChart';
// export { BarChart } from './BarChart';
// export { PieChart } from './PieChart';
// export { AreaChart } from './AreaChart';
// export { TimeSeriesChart } from './TimeSeriesChart';

// Placeholder for future chart components
export const CHART_COMPONENTS = {
  // Will contain chart component references
} as const;

export type ChartComponentName = keyof typeof CHART_COMPONENTS;

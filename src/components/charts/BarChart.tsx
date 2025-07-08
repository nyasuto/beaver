/**
 * Bar Chart Component
 *
 * A React component for displaying bar charts using Chart.js.
 * Optimized for categorical data and comparisons.
 *
 * @module BarChart
 */

import React from 'react';
import type { ChartData, ChartOptions } from 'chart.js';
import { BaseChart, withChartTheme, type BaseChartProps } from './BaseChart';
import { convertCategoryData, CHART_COLORS } from '../../lib/utils/chart';

/**
 * Bar chart specific props
 */
export interface BarChartProps extends Omit<BaseChartProps<'bar'>, 'type'> {
  /** Category data */
  categoryData?: Record<string, number>;
  /** Data label */
  dataLabel?: string;
  /** Bar colors */
  colors?: string[];
  /** Chart orientation */
  orientation?: 'vertical' | 'horizontal';
  /** Show values on bars */
  showValues?: boolean;
  /** Enable stacked bars */
  stacked?: boolean;
  /** Bar border width */
  borderWidth?: number;
  /** Bar border radius */
  borderRadius?: number;
  /** Y-axis minimum value */
  yAxisMin?: number;
  /** Y-axis maximum value */
  yAxisMax?: number;
  /** Enable grid lines */
  showGrid?: boolean;
  /** Multiple datasets */
  datasets?: {
    label: string;
    data: Record<string, number>;
    color?: string;
    borderColor?: string;
  }[];
}

/**
 * Bar Chart Component
 *
 * Displays categorical data as a bar chart with customizable styling and behavior
 */
export function BarChart({
  categoryData = {},
  dataLabel = 'Count',
  colors = CHART_COLORS,
  orientation = 'vertical',
  showValues = false,
  stacked = false,
  borderWidth = 1,
  borderRadius = 4,
  yAxisMin,
  yAxisMax,
  showGrid = true,
  datasets,
  data: propData,
  options: propOptions = {},
  ...baseProps
}: BarChartProps) {
  // Generate chart data
  const chartData: ChartData<'bar'> =
    propData ||
    (datasets
      ? {
          labels: Object.keys(datasets[0]?.data || {}),
          datasets: datasets.map((dataset, index) => ({
            label: dataset.label,
            data: Object.values(dataset.data),
            backgroundColor: dataset.color || colors[index % colors.length] + '80',
            borderColor: dataset.borderColor || dataset.color || colors[index % colors.length],
            borderWidth,
            borderRadius,
          })),
        }
      : convertCategoryData(categoryData, dataLabel, colors));

  // Apply styling to existing data
  if (propData) {
    chartData.datasets = chartData.datasets.map(dataset => ({
      ...dataset,
      borderWidth: borderWidth || dataset.borderWidth,
      borderRadius: borderRadius || dataset.borderRadius,
    }));
  }

  // Chart options
  const chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: orientation === 'horizontal' ? 'y' : 'x',
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: orientation === 'horizontal' ? dataLabel : 'Category',
        },
        min: orientation === 'horizontal' ? yAxisMin : undefined,
        max: orientation === 'horizontal' ? yAxisMax : undefined,
        grid: {
          display: showGrid,
        },
        stacked,
      },
      y: {
        display: true,
        title: {
          display: true,
          text: orientation === 'horizontal' ? 'Category' : dataLabel,
        },
        min: orientation === 'vertical' ? yAxisMin : undefined,
        max: orientation === 'vertical' ? yAxisMax : undefined,
        grid: {
          display: showGrid,
        },
        stacked,
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: context => {
            const label = context.dataset.label || '';
            const value = context.parsed.y || context.parsed.x;
            return `${label}: ${value.toLocaleString()}`;
          },
        },
      },
      datalabels: showValues
        ? {
            display: true,
            anchor: 'end',
            align: 'top',
            formatter: (value: number) => value.toLocaleString(),
          }
        : undefined,
    },
    animation: {
      duration: 750,
      easing: 'easeInOutQuart',
    },
    ...propOptions,
  };

  return <BaseChart type="bar" data={chartData} options={chartOptions} {...baseProps} />;
}

/**
 * Themed Bar Chart Component
 */
export const ThemedBarChart = withChartTheme(BarChart);

/**
 * Horizontal Bar Chart Component
 *
 * Specialized component for horizontal bar charts
 */
export interface HorizontalBarChartProps extends Omit<BarChartProps, 'orientation'> {
  /** Sort bars by value */
  sortByValue?: boolean;
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
}

export function HorizontalBarChart({
  categoryData = {},
  sortByValue = false,
  sortDirection = 'desc',
  ...props
}: HorizontalBarChartProps) {
  // Sort data if requested
  const sortedData = React.useMemo(() => {
    if (!sortByValue) return categoryData;

    const entries = Object.entries(categoryData);
    entries.sort((a, b) => {
      const comparison = a[1] - b[1];
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return Object.fromEntries(entries);
  }, [categoryData, sortByValue, sortDirection]);

  return <BarChart {...props} categoryData={sortedData} orientation="horizontal" />;
}

/**
 * Stacked Bar Chart Component
 *
 * Specialized component for stacked bar charts
 */
export interface StackedBarChartProps extends Omit<BarChartProps, 'stacked'> {
  /** Show percentage labels */
  showPercentages?: boolean;
  /** Stack total label */
  stackTotalLabel?: string;
}

export function StackedBarChart({
  datasets = [],
  showPercentages = false,
  stackTotalLabel = 'Total',
  ...props
}: StackedBarChartProps) {
  // Calculate totals for percentage display
  const totals = React.useMemo(() => {
    if (!datasets.length) return {};

    const categories = Object.keys(datasets[0].data);
    const totals: Record<string, number> = {};

    categories.forEach(category => {
      totals[category] = datasets.reduce((sum, dataset) => {
        return sum + (dataset.data[category] || 0);
      }, 0);
    });

    return totals;
  }, [datasets]);

  const chartOptions: ChartOptions<'bar'> = {
    plugins: {
      tooltip: {
        callbacks: {
          label: context => {
            const dataset = datasets[context.datasetIndex];
            const value = context.parsed.y || context.parsed.x;
            const total = totals[context.label];

            if (showPercentages && total > 0) {
              const percentage = ((value / total) * 100).toFixed(1);
              return `${dataset.label}: ${value.toLocaleString()} (${percentage}%)`;
            }

            return `${dataset.label}: ${value.toLocaleString()}`;
          },
          afterLabel: context => {
            if (context.datasetIndex === datasets.length - 1) {
              const total = totals[context.label];
              return `${stackTotalLabel}: ${total.toLocaleString()}`;
            }
            return '';
          },
        },
      },
    },
    ...props.options,
  };

  return <BarChart {...props} datasets={datasets} stacked={true} options={chartOptions} />;
}

/**
 * Comparison Bar Chart Component
 *
 * Specialized component for comparing two datasets
 */
export interface ComparisonBarChartProps extends Omit<BarChartProps, 'datasets'> {
  /** Primary dataset */
  primaryData: Record<string, number>;
  /** Secondary dataset */
  secondaryData: Record<string, number>;
  /** Primary dataset label */
  primaryLabel: string;
  /** Secondary dataset label */
  secondaryLabel: string;
  /** Primary dataset color */
  primaryColor?: string;
  /** Secondary dataset color */
  secondaryColor?: string;
  /** Show difference values */
  showDifference?: boolean;
}

export function ComparisonBarChart({
  primaryData,
  secondaryData,
  primaryLabel,
  secondaryLabel,
  primaryColor = CHART_COLORS[0],
  secondaryColor = CHART_COLORS[1],
  showDifference = false,
  ...props
}: ComparisonBarChartProps) {
  const datasets = [
    {
      label: primaryLabel,
      data: primaryData,
      color: primaryColor,
    },
    {
      label: secondaryLabel,
      data: secondaryData,
      color: secondaryColor,
    },
  ];

  const chartOptions: ChartOptions<'bar'> = {
    plugins: {
      tooltip: {
        callbacks: {
          afterLabel: context => {
            if (showDifference) {
              const category = context.label;
              const primary = primaryData[category] || 0;
              const secondary = secondaryData[category] || 0;
              const difference = primary - secondary;
              const percentChange =
                secondary !== 0 ? ((difference / secondary) * 100).toFixed(1) : 'N/A';

              return `Difference: ${difference.toLocaleString()} (${percentChange}%)`;
            }
            return '';
          },
        },
      },
    },
    ...props.options,
  };

  return <BarChart {...props} datasets={datasets} options={chartOptions} />;
}

export default ThemedBarChart;

/**
 * Coverage Chart Component
 *
 * A specialized chart component for displaying code coverage metrics
 * with pie and doughnut chart visualizations.
 *
 * @module CoverageChart
 */

import React from 'react';
import { BaseChart, ChartContainer, type BaseChartProps } from './BaseChart';
import { type SafeChartData, type SafeChartOptions } from './types/safe-chart';

/**
 * Coverage metrics data structure
 */
export interface CoverageMetrics {
  /** Overall coverage percentage */
  overallCoverage: number;
  /** Total lines of code */
  totalLines: number;
  /** Number of covered lines */
  coveredLines: number;
  /** Number of missed lines */
  missedLines: number;
  /** Branch coverage percentage */
  branchCoverage?: number;
  /** Line coverage percentage */
  lineCoverage?: number;
}

/**
 * Coverage chart component props
 */
export interface CoverageChartProps {
  /** Coverage metrics data */
  data: CoverageMetrics;
  /** Chart type - pie or doughnut */
  type?: 'pie' | 'doughnut';
  /** Chart title */
  title?: string;
  /** Chart description */
  description?: string;
  /** Chart height */
  height?: number;
  /** Chart width */
  width?: number;
  /** CSS class name */
  className?: string;
  /** Loading state */
  loading?: boolean;
  /** Error state */
  error?: string;
  /** Show percentage labels */
  showPercentage?: boolean;
  /** Show legend */
  showLegend?: boolean;
  /** Show values in tooltips */
  showValues?: boolean;
  /** Animation duration */
  animationDuration?: number;
  /** Callback when chart is ready */
  onChartReady?: (chart: unknown) => void;
}

/**
 * Coverage Chart Component
 *
 * Displays code coverage metrics as a pie or doughnut chart
 */
export function CoverageChart({
  data,
  type = 'doughnut',
  title = 'コードカバレッジ',
  description = 'カバー済み vs 未カバー',
  height = 300,
  width,
  className = '',
  loading = false,
  error,
  showPercentage = true,
  showLegend = true,
  showValues = true,
  animationDuration = 300,
  onChartReady,
}: CoverageChartProps) {
  // Calculate percentage
  const coveragePercentage = data.overallCoverage;
  const uncoveredPercentage = 100 - coveragePercentage;

  // Prepare chart data
  const chartData: SafeChartData<'pie' | 'doughnut'> = {
    labels: ['カバー済み', '未カバー'],
    datasets: [
      {
        label: 'コードカバレッジ',
        data: [data.coveredLines, data.missedLines],
        backgroundColor: [
          '#10B981', // Green for covered
          '#EF4444', // Red for uncovered
        ],
        borderColor: [
          '#059669', // Darker green
          '#DC2626', // Darker red
        ],
        borderWidth: 2,
        hoverBackgroundColor: ['#059669', '#DC2626'],
        hoverBorderColor: ['#047857', '#B91C1C'],
        hoverBorderWidth: 3,
      },
    ],
  };

  // Chart options
  const chartOptions: SafeChartOptions<'pie' | 'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
        position: 'bottom',
        labels: {
          color: '#374151',
          font: {
            size: 14,
            family: 'Inter, system-ui, sans-serif',
          },
          padding: 20,
          usePointStyle: true,
          generateLabels: (chart: any) => {
            const data = chart.data;
            if (data.labels && data.datasets.length > 0) {
              const dataset = data.datasets[0];
              return data.labels.map((label: any, i: number) => {
                const value = dataset.data[i] as number;
                const percentage = ((value / data.totalLines) * 100).toFixed(1);
                return {
                  text: showPercentage ? `${label} (${percentage}%)` : label,
                  fillStyle: Array.isArray(dataset.backgroundColor)
                    ? dataset.backgroundColor[i]
                    : dataset.backgroundColor,
                  strokeStyle: Array.isArray(dataset.borderColor)
                    ? dataset.borderColor[i]
                    : dataset.borderColor,
                  lineWidth: dataset.borderWidth,
                  hidden: false,
                  index: i,
                };
              });
            }
            return [];
          },
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#374151',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: context => {
            const label = context.label || '';
            const value = context.parsed as number;
            const percentage = ((value / data.totalLines) * 100).toFixed(1);

            if (showValues) {
              return `${label}: ${value.toLocaleString()}行 (${percentage}%)`;
            }
            return `${label}: ${percentage}%`;
          },
          title: () => 'コードカバレッジ',
        },
      },
      title: {
        display: false, // We'll use the ChartContainer title
      },
    },
    animation: {
      duration: animationDuration,
      easing: 'easeInOutQuart',
    },
    // Doughnut-specific options
    ...(type === 'doughnut' && {
      cutout: '60%',
    }),
  };

  // Base chart props
  const baseChartProps: BaseChartProps<'pie' | 'doughnut'> = {
    type,
    data: chartData,
    options: chartOptions,
    height,
    width,
    className,
    loading,
    error,
    animationDuration,
    onChartReady,
  };

  return (
    <ChartContainer
      title={title}
      description={description}
      className={className}
      actions={
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
            {coveragePercentage.toFixed(1)}%
          </span>
          <span className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
            {uncoveredPercentage.toFixed(1)}%
          </span>
        </div>
      }
    >
      <div style={{ height: `${height}px` }}>
        <BaseChart {...baseChartProps} />
      </div>
    </ChartContainer>
  );
}

/**
 * Coverage Metrics Card Component
 *
 * Displays key coverage metrics alongside the chart
 */
export interface CoverageMetricsCardProps {
  /** Coverage metrics data */
  data: CoverageMetrics;
  /** CSS class name */
  className?: string;
}

export function CoverageMetricsCard({ data, className = '' }: CoverageMetricsCardProps) {
  const metrics = [
    {
      label: '総合カバレッジ',
      value: `${data.overallCoverage.toFixed(1)}%`,
      color: data.overallCoverage >= 80 ? 'green' : data.overallCoverage >= 60 ? 'yellow' : 'red',
    },
    {
      label: '総行数',
      value: data.totalLines.toLocaleString(),
      color: 'blue',
    },
    {
      label: 'カバー済み行数',
      value: data.coveredLines.toLocaleString(),
      color: 'green',
    },
    {
      label: '未カバー行数',
      value: data.missedLines.toLocaleString(),
      color: 'red',
    },
  ];

  if (data.branchCoverage !== undefined) {
    metrics.push({
      label: 'ブランチカバレッジ',
      value: `${data.branchCoverage.toFixed(1)}%`,
      color: data.branchCoverage >= 80 ? 'green' : data.branchCoverage >= 60 ? 'yellow' : 'red',
    });
  }

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      {metrics.map((metric, index) => (
        <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{metric.label}</div>
          <div
            className={`text-2xl font-bold ${
              metric.color === 'green'
                ? 'text-green-600'
                : metric.color === 'yellow'
                  ? 'text-yellow-600'
                  : metric.color === 'red'
                    ? 'text-red-600'
                    : 'text-blue-600'
            }`}
          >
            {metric.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export default CoverageChart;

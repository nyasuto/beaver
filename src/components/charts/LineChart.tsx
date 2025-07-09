/**
 * Line Chart Component
 *
 * A React component for displaying line charts using Chart.js.
 * Optimized for time series data and trend visualization.
 *
 * @module LineChart
 */

import React from 'react';
import type { ChartData, ChartOptions } from 'chart.js';
import { BaseChart, withChartTheme, type BaseChartProps } from './BaseChart';
import { convertTimeSeriesData } from '../../lib/utils/chart';
import type { TimeSeriesPoint } from '../../lib/analytics/engine';

/**
 * Line chart specific props
 */
export interface LineChartProps extends Omit<BaseChartProps<'line'>, 'type'> {
  /** Time series data */
  timeSeriesData?: TimeSeriesPoint[];
  /** Data label */
  dataLabel?: string;
  /** Line color */
  lineColor?: string;
  /** Fill area under line */
  fill?: boolean;
  /** Line tension (0 = straight, 1 = curved) */
  tension?: number;
  /** Show data points */
  showPoints?: boolean;
  /** Point radius */
  pointRadius?: number;
  /** Enable smooth animations */
  smooth?: boolean;
  /** Y-axis minimum value */
  yAxisMin?: number;
  /** Y-axis maximum value */
  yAxisMax?: number;
  /** Enable grid lines */
  showGrid?: boolean;
  /** Multiple datasets */
  datasets?: {
    label: string;
    data: TimeSeriesPoint[];
    color?: string;
    fill?: boolean;
  }[];
}

/**
 * Line Chart Component
 *
 * Displays time series data as a line chart with customizable styling and behavior
 */
export function LineChart({
  timeSeriesData = [],
  dataLabel = 'Value',
  lineColor = '#3B82F6',
  fill = false,
  tension = 0.1,
  showPoints = true,
  pointRadius = 3,
  smooth = true,
  yAxisMin,
  yAxisMax,
  showGrid = true,
  datasets,
  data: propData,
  options: propOptions = {},
  ...baseProps
}: LineChartProps) {
  // Generate chart data
  const chartData: ChartData<'line'> =
    propData ||
    (datasets
      ? {
          labels: datasets[0]?.data.map(point => point.timestamp.toLocaleDateString()) || [],
          datasets: datasets.map((dataset, index) => ({
            label: dataset.label,
            data: dataset.data.map(point => point.value),
            borderColor: dataset.color || `hsl(${index * 60}, 70%, 50%)`,
            backgroundColor: (dataset.color || `hsl(${index * 60}, 70%, 50%)`) + '20',
            fill: dataset.fill || false,
            tension: smooth ? tension : 0,
            pointRadius: showPoints ? pointRadius : 0,
          })),
        }
      : convertTimeSeriesData(timeSeriesData, dataLabel, lineColor));

  // Apply fill and tension to existing data
  if (propData) {
    chartData.datasets = chartData.datasets.map(dataset => ({
      ...dataset,
      fill: fill || dataset.fill,
      tension: smooth ? tension : 0,
      pointRadius: showPoints ? pointRadius : 0,
    }));
  }

  // Chart options
  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Time',
        },
        grid: {
          display: showGrid,
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: dataLabel,
        },
        min: yAxisMin,
        max: yAxisMax,
        grid: {
          display: showGrid,
        },
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
            const value = context.parsed.y;
            return `${label}: ${value.toLocaleString()}`;
          },
        },
      },
    },
    elements: {
      line: {
        tension: smooth ? tension : 0,
      },
      point: {
        radius: showPoints ? pointRadius : 0,
        hoverRadius: showPoints ? pointRadius + 2 : 0,
      },
    },
    animation: {
      duration: smooth ? 750 : 0,
      easing: 'easeInOutQuart',
    },
    ...propOptions,
  };

  return <BaseChart type="line" data={chartData} options={chartOptions} {...baseProps} />;
}

/**
 * Themed Line Chart Component
 */
export const ThemedLineChart = withChartTheme(LineChart);

/**
 * Time Series Line Chart Component
 *
 * Specialized component for time series data visualization
 */
export interface TimeSeriesChartProps extends Omit<LineChartProps, 'timeSeriesData'> {
  /** Time series data points */
  data: TimeSeriesPoint[];
  /** Chart title */
  title?: string;
  /** Y-axis label */
  yAxisLabel?: string;
  /** Show trend line */
  showTrend?: boolean;
  /** Trend line color */
  trendColor?: string;
  /** Time format for x-axis */
  timeFormat?: 'date' | 'datetime' | 'time';
  /** Data aggregation period */
  aggregation?: 'hour' | 'day' | 'week' | 'month';
}

export function TimeSeriesChart({
  data,
  title,
  yAxisLabel = 'Value',
  showTrend = false,
  trendColor = '#EF4444',
  timeFormat = 'date',
  aggregation = 'day',
  ...props
}: TimeSeriesChartProps) {
  // Aggregate data based on period
  const aggregatedData = React.useMemo(() => {
    if (!data.length) return [];

    const aggregated = new Map<string, { sum: number; count: number; timestamp: Date }>();

    data.forEach(point => {
      let key: string;
      const date = new Date(point.timestamp);

      switch (aggregation) {
        case 'hour':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
          break;
        case 'week': {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        }
        case 'month':
          key = `${date.getFullYear()}-${date.getMonth()}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!aggregated.has(key)) {
        aggregated.set(key, { sum: 0, count: 0, timestamp: date });
      }

      const entry = aggregated.get(key)!;
      entry.sum += point.value;
      entry.count += 1;
    });

    return Array.from(aggregated.values())
      .map(entry => ({
        timestamp: entry.timestamp,
        value: entry.sum / entry.count,
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [data, aggregation]);

  // Generate trend line data
  const trendData = React.useMemo(() => {
    if (!showTrend || aggregatedData.length < 2) return [];

    // Simple linear regression
    const n = aggregatedData.length;
    const sumX = aggregatedData.reduce((sum, _, index) => sum + index, 0);
    const sumY = aggregatedData.reduce((sum, point) => sum + point.value, 0);
    const sumXY = aggregatedData.reduce((sum, point, index) => sum + index * point.value, 0);
    const sumXX = aggregatedData.reduce((sum, _, index) => sum + index * index, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return aggregatedData.map((point, index) => ({
      timestamp: point.timestamp,
      value: slope * index + intercept,
    }));
  }, [aggregatedData, showTrend]);

  // Format time labels
  const formatTime = (date: Date): string => {
    switch (timeFormat) {
      case 'datetime':
        return date.toLocaleString();
      case 'time':
        return date.toLocaleTimeString();
      default:
        return date.toLocaleDateString();
    }
  };

  // Prepare datasets
  const datasets = [
    {
      label: title || 'Data',
      data: aggregatedData,
      color: props.lineColor || '#3B82F6',
      fill: props.fill || false,
    },
  ];

  if (showTrend && trendData.length > 0) {
    datasets.push({
      label: 'Trend',
      data: trendData,
      color: trendColor,
      fill: false,
    });
  }

  return (
    <LineChart
      {...props}
      datasets={datasets}
      options={{
        scales: {
          x: {
            title: {
              display: true,
              text: 'Time',
            },
            ticks: {
              callback: function (value, index, _values) {
                const data = aggregatedData[index];
                return data ? formatTime(data.timestamp) : '';
              },
            },
          },
          y: {
            title: {
              display: true,
              text: yAxisLabel,
            },
          },
        },
        plugins: {
          title: {
            display: !!title,
            text: title,
          },
        },
        ...props.options,
      }}
    />
  );
}

export default ThemedLineChart;

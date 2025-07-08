/**
 * Area Chart Component
 *
 * A React component for displaying area charts using Chart.js.
 * Optimized for cumulative data and trend visualization with filled areas.
 *
 * @module AreaChart
 */

import React from 'react';
import type { ChartOptions } from 'chart.js';
import { BaseChart, withChartTheme, type BaseChartProps } from './BaseChart';
import { convertTimeSeriesData, CHART_COLORS } from '../../lib/utils/chart';
import type { TimeSeriesPoint } from '../../lib/analytics/engine';

/**
 * Area chart specific props
 */
export interface AreaChartProps extends Omit<BaseChartProps<'line'>, 'type'> {
  /** Time series data */
  timeSeriesData?: TimeSeriesPoint[];
  /** Data label */
  dataLabel?: string;
  /** Area color */
  areaColor?: string;
  /** Line color */
  lineColor?: string;
  /** Fill opacity */
  fillOpacity?: number;
  /** Line tension (0 = straight, 1 = curved) */
  tension?: number;
  /** Show data points */
  showPoints?: boolean;
  /** Point radius */
  pointRadius?: number;
  /** Enable smooth animations */
  smooth?: boolean;
  /** Stacked areas */
  stacked?: boolean;
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
    fillOpacity?: number;
  }[];
  /** Chart variant */
  variant?: 'area' | 'stacked' | 'percentage';
}

/**
 * Area Chart Component
 *
 * Displays time series data as an area chart with filled regions
 */
export function AreaChart({
  timeSeriesData = [],
  dataLabel = 'Value',
  areaColor = CHART_COLORS[0],
  lineColor,
  fillOpacity = 0.3,
  tension = 0.4,
  showPoints = false,
  pointRadius = 3,
  smooth = true,
  stacked = false,
  yAxisMin,
  yAxisMax,
  showGrid = true,
  datasets,
  variant = 'area',
  data: propData,
  options: propOptions = {},
  ...baseProps
}: AreaChartProps) {
  // Process datasets for different variants
  const processedData = React.useMemo(() => {
    if (propData) return propData;

    if (datasets) {
      const labels = datasets[0]?.data.map(point => point.timestamp.toLocaleDateString()) || [];

      if (variant === 'percentage') {
        // Calculate percentage stacking
        const totals = labels.map((_, index) =>
          datasets.reduce((sum, dataset) => sum + (dataset.data[index]?.value || 0), 0)
        );

        return {
          labels,
          datasets: datasets.map((dataset, datasetIndex) => ({
            label: dataset.label,
            data: dataset.data.map((point, index) => {
              const total = totals[index];
              return total > 0 ? (point.value / total) * 100 : 0;
            }),
            backgroundColor:
              dataset.color ||
              CHART_COLORS[datasetIndex % CHART_COLORS.length] +
                Math.floor(255 * (dataset.fillOpacity || fillOpacity))
                  .toString(16)
                  .padStart(2, '0'),
            borderColor: dataset.color || CHART_COLORS[datasetIndex % CHART_COLORS.length],
            borderWidth: 2,
            fill: true,
            tension: smooth ? tension : 0,
            pointRadius: showPoints ? pointRadius : 0,
          })),
        };
      } else {
        // Regular or stacked area chart
        return {
          labels,
          datasets: datasets.map((dataset, datasetIndex) => ({
            label: dataset.label,
            data: dataset.data.map(point => point.value),
            backgroundColor:
              dataset.color ||
              CHART_COLORS[datasetIndex % CHART_COLORS.length] +
                Math.floor(255 * (dataset.fillOpacity || fillOpacity))
                  .toString(16)
                  .padStart(2, '0'),
            borderColor: dataset.color || CHART_COLORS[datasetIndex % CHART_COLORS.length],
            borderWidth: 2,
            fill: true,
            tension: smooth ? tension : 0,
            pointRadius: showPoints ? pointRadius : 0,
          })),
        };
      }
    }

    // Single dataset
    const baseData = convertTimeSeriesData(timeSeriesData, dataLabel, lineColor || areaColor);
    baseData.datasets[0] = {
      ...baseData.datasets[0],
      backgroundColor:
        areaColor +
        Math.floor(255 * fillOpacity)
          .toString(16)
          .padStart(2, '0'),
      borderColor: lineColor || areaColor,
      fill: true,
      tension: smooth ? tension : 0,
      pointRadius: showPoints ? pointRadius : 0,
    };

    return baseData;
  }, [
    propData,
    datasets,
    timeSeriesData,
    dataLabel,
    areaColor,
    lineColor,
    fillOpacity,
    tension,
    smooth,
    showPoints,
    pointRadius,
    variant,
  ]);

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
        stacked: stacked || variant === 'stacked' || variant === 'percentage',
      },
      y: {
        display: true,
        title: {
          display: true,
          text: variant === 'percentage' ? 'Percentage (%)' : dataLabel,
        },
        min: variant === 'percentage' ? 0 : yAxisMin,
        max: variant === 'percentage' ? 100 : yAxisMax,
        grid: {
          display: showGrid,
        },
        stacked: stacked || variant === 'stacked' || variant === 'percentage',
        ticks: {
          callback: function (value) {
            if (variant === 'percentage') {
              return value + '%';
            }
            return value;
          },
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

            if (variant === 'percentage') {
              return `${label}: ${value.toFixed(1)}%`;
            }

            return `${label}: ${value.toLocaleString()}`;
          },
          afterLabel: context => {
            if (
              variant === 'stacked' &&
              context.datasetIndex === processedData.datasets.length - 1
            ) {
              // Show total for stacked charts
              const total = processedData.datasets.reduce((sum, dataset) => {
                return sum + ((dataset.data[context.dataIndex] as number) || 0);
              }, 0);
              return `Total: ${total.toLocaleString()}`;
            }
            return '';
          },
        },
      },
      filler: {
        propagate: false,
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
      duration: 750,
      easing: 'easeInOutQuart',
    },
    ...propOptions,
  };

  return <BaseChart type="line" data={processedData} options={chartOptions} {...baseProps} />;
}

/**
 * Themed Area Chart Component
 */
export const ThemedAreaChart = withChartTheme(AreaChart);

/**
 * Stacked Area Chart Component
 *
 * Specialized component for stacked area charts
 */
export interface StackedAreaChartProps extends Omit<AreaChartProps, 'variant' | 'stacked'> {
  /** Show totals in tooltips */
  showTotals?: boolean;
  /** Normalize to percentages */
  normalize?: boolean;
}

export function StackedAreaChart({
  showTotals: _showTotals = true,
  normalize = false,
  ...props
}: StackedAreaChartProps) {
  return <AreaChart {...props} variant={normalize ? 'percentage' : 'stacked'} stacked={true} />;
}

/**
 * Stream Chart Component
 *
 * Specialized component for stream charts (centered stacked areas)
 */
export interface StreamChartProps extends Omit<AreaChartProps, 'variant'> {
  /** Baseline position */
  baseline?: 'zero' | 'center' | 'wiggle';
}

export function StreamChart({ datasets = [], baseline = 'center', ...props }: StreamChartProps) {
  // Transform data for stream layout
  const streamData = React.useMemo(() => {
    if (!datasets.length) return { labels: [], datasets: [] };

    const labels = datasets[0]?.data.map(point => point.timestamp.toLocaleDateString()) || [];
    const dataLength = labels.length;

    // Calculate baseline offsets
    const offsets = new Array(dataLength).fill(0);

    if (baseline === 'center') {
      // Center the stream
      for (let i = 0; i < dataLength; i++) {
        const total = datasets.reduce((sum, dataset) => sum + (dataset.data[i]?.value || 0), 0);
        offsets[i] = -total / 2;
      }
    } else if (baseline === 'wiggle') {
      // Wiggle baseline (minimize movement)
      for (let i = 0; i < dataLength; i++) {
        const values = datasets.map(dataset => dataset.data[i]?.value || 0);
        const total = values.reduce((sum, val) => sum + val, 0);
        offsets[i] = -total / 2;
      }
    }

    // Create cumulative datasets
    const cumulativeData = datasets.map((dataset, datasetIndex) => {
      const data = dataset.data.map((point, pointIndex) => {
        const value = point.value;
        const offset = offsets[pointIndex];

        // Calculate cumulative offset for this dataset
        let cumulativeOffset = offset;
        for (let j = 0; j < datasetIndex; j++) {
          cumulativeOffset += datasets[j].data[pointIndex]?.value || 0;
        }

        return {
          x: pointIndex,
          y: [cumulativeOffset, cumulativeOffset + value],
        };
      });

      return {
        label: dataset.label,
        data: data.map(d => d.y[1]),
        backgroundColor: dataset.color || CHART_COLORS[datasetIndex % CHART_COLORS.length] + '60',
        borderColor: dataset.color || CHART_COLORS[datasetIndex % CHART_COLORS.length],
        borderWidth: 1,
        fill: {
          target: datasetIndex === 0 ? 'origin' : '-1',
          above: dataset.color || CHART_COLORS[datasetIndex % CHART_COLORS.length] + '40',
        },
        tension: 0.4,
        pointRadius: 0,
      };
    });

    return {
      labels,
      datasets: cumulativeData,
    };
  }, [datasets, baseline]);

  const chartOptions: ChartOptions<'line'> = {
    scales: {
      y: {
        title: {
          display: true,
          text: 'Value',
        },
      },
    },
    plugins: {
      tooltip: {
        mode: 'index',
        callbacks: {
          label: context => {
            const datasetIndex = context.datasetIndex;
            const pointIndex = context.dataIndex;
            const value = datasets[datasetIndex]?.data[pointIndex]?.value || 0;
            return `${context.dataset.label}: ${value.toLocaleString()}`;
          },
        },
      },
    },
    ...props.options,
  };

  return <BaseChart type="line" data={streamData} options={chartOptions} {...props} />;
}

/**
 * Sparkline Area Chart Component
 *
 * Minimal area chart for small spaces
 */
export interface SparklineAreaChartProps extends Omit<AreaChartProps, 'showGrid' | 'showPoints'> {
  /** Chart height */
  height?: number;
  /** Hide axes */
  hideAxes?: boolean;
  /** Hide legend */
  hideLegend?: boolean;
  /** Hide tooltips */
  hideTooltips?: boolean;
}

export function SparklineAreaChart({
  height = 60,
  hideAxes = true,
  hideLegend = true,
  hideTooltips = false,
  ...props
}: SparklineAreaChartProps) {
  const chartOptions: ChartOptions<'line'> = {
    maintainAspectRatio: false,
    scales: {
      x: {
        display: !hideAxes,
        grid: {
          display: false,
        },
      },
      y: {
        display: !hideAxes,
        grid: {
          display: false,
        },
      },
    },
    plugins: {
      legend: {
        display: !hideLegend,
      },
      tooltip: {
        enabled: !hideTooltips,
      },
    },
    elements: {
      point: {
        radius: 0,
      },
    },
    ...props.options,
  };

  return (
    <div style={{ height }}>
      <AreaChart {...props} showGrid={false} showPoints={false} options={chartOptions} />
    </div>
  );
}

export default ThemedAreaChart;

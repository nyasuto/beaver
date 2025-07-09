/**
 * Pie Chart Component
 *
 * A React component for displaying pie and doughnut charts using Chart.js.
 * Optimized for percentage data and part-to-whole relationships.
 *
 * @module PieChart
 */

import React from 'react';
import type { ChartData, ChartOptions } from 'chart.js';
import { BaseChart, withChartTheme, type BaseChartProps } from './BaseChart';
import { CHART_COLORS } from '../../lib/utils/chart';

/**
 * Pie chart specific props
 */
export interface PieChartProps extends Omit<BaseChartProps<'pie'>, 'type'> {
  /** Category data */
  categoryData?: Record<string, number>;
  /** Chart variant */
  variant?: 'pie' | 'doughnut';
  /** Pie colors */
  colors?: string[];
  /** Show percentages */
  showPercentages?: boolean;
  /** Show values */
  showValues?: boolean;
  /** Show legend */
  showLegend?: boolean;
  /** Legend position */
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  /** Doughnut cutout percentage */
  cutout?: number;
  /** Border width */
  borderWidth?: number;
  /** Sort slices by value */
  sortByValue?: boolean;
  /** Minimum slice percentage to show */
  minSlicePercentage?: number;
  /** "Others" slice label */
  othersLabel?: string;
  /** Enable slice hover effects */
  hoverEffects?: boolean;
  /** Slice spacing */
  spacing?: number;
}

/**
 * Pie Chart Component
 *
 * Displays percentage data as a pie or doughnut chart
 */
export function PieChart({
  categoryData = {},
  variant = 'pie',
  colors = CHART_COLORS,
  showPercentages = true,
  showValues = false,
  showLegend = true,
  legendPosition = 'right',
  cutout = variant === 'doughnut' ? 50 : 0,
  borderWidth = 2,
  sortByValue = false,
  minSlicePercentage = 2,
  othersLabel = 'Others',
  hoverEffects = true,
  spacing = 0,
  data: propData,
  options: propOptions = {},
  ...baseProps
}: PieChartProps) {
  // Process and sort data
  const processedData = React.useMemo(() => {
    const entries = Object.entries(categoryData);
    const total = entries.reduce((sum, [, value]) => sum + value, 0);

    if (total === 0) return [];

    // Sort if requested
    if (sortByValue) {
      entries.sort((a, b) => b[1] - a[1]);
    }

    // Group small slices if minSlicePercentage is set
    if (minSlicePercentage > 0) {
      const minValue = (minSlicePercentage / 100) * total;
      const mainSlices: [string, number][] = [];
      let othersTotal = 0;

      entries.forEach(([label, value]) => {
        if (value >= minValue) {
          mainSlices.push([label, value]);
        } else {
          othersTotal += value;
        }
      });

      if (othersTotal > 0) {
        mainSlices.push([othersLabel, othersTotal]);
      }

      return mainSlices;
    }

    return entries;
  }, [categoryData, sortByValue, minSlicePercentage, othersLabel]);

  // Generate chart data
  const chartData: ChartData<'pie'> = propData || {
    labels: processedData.map(([label]) => label),
    datasets: [
      {
        data: processedData.map(([, value]) => value),
        backgroundColor: processedData.map((_, index) => colors[index % colors.length] + '80'),
        borderColor: processedData.map((_, index) => colors[index % colors.length]),
        borderWidth,
        hoverBackgroundColor: processedData.map((_, index) => colors[index % colors.length] + 'A0'),
        hoverBorderColor: processedData.map((_, index) => colors[index % colors.length]),
        hoverBorderWidth: borderWidth + 1,
        spacing,
      },
    ],
  };

  // Calculate total for percentage calculations
  const total = chartData.datasets[0].data.reduce((sum, value) => sum + (value as number), 0);

  // Chart options
  const chartOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: variant === 'doughnut' ? `${cutout}%` : undefined,
    plugins: {
      legend: {
        display: showLegend,
        position: legendPosition,
        labels: {
          usePointStyle: true,
          padding: 20,
          generateLabels: chart => {
            const data = chart.data;
            if (data.labels && data.datasets.length > 0) {
              const dataset = data.datasets[0];
              return data.labels.map((label, i) => {
                const value = dataset.data[i] as number;
                const percentage = ((value / total) * 100).toFixed(1);

                let text = label as string;
                if (showPercentages && showValues) {
                  text = `${label}: ${value.toLocaleString()} (${percentage}%)`;
                } else if (showPercentages) {
                  text = `${label}: ${percentage}%`;
                } else if (showValues) {
                  text = `${label}: ${value.toLocaleString()}`;
                }

                return {
                  text,
                  fillStyle: dataset.backgroundColor![i] as string,
                  strokeStyle: dataset.borderColor![i] as string,
                  lineWidth: borderWidth,
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
        callbacks: {
          label: context => {
            const label = context.label || '';
            const value = context.parsed as number;
            const percentage = ((value / total) * 100).toFixed(1);

            if (showPercentages && showValues) {
              return `${label}: ${value.toLocaleString()} (${percentage}%)`;
            } else if (showPercentages) {
              return `${label}: ${percentage}%`;
            } else {
              return `${label}: ${value.toLocaleString()}`;
            }
          },
        },
      },
    },
    elements: {
      arc: {
        borderWidth,
        hoverBorderWidth: borderWidth + 1,
      },
    },
    animation: {
      animateRotate: true,
      animateScale: hoverEffects,
      duration: 750,
      easing: 'easeInOutQuart',
    },
    ...propOptions,
  };

  return <BaseChart type="pie" data={chartData} options={chartOptions} {...baseProps} />;
}

/**
 * Themed Pie Chart Component
 */
export const ThemedPieChart = withChartTheme(PieChart);

/**
 * Doughnut Chart Component
 *
 * Specialized component for doughnut charts
 */
export interface DoughnutChartProps extends Omit<PieChartProps, 'variant'> {
  /** Center text */
  centerText?: string;
  /** Center text color */
  centerTextColor?: string;
  /** Center text size */
  centerTextSize?: number;
  /** Center value */
  centerValue?: number;
  /** Center value formatter */
  centerValueFormatter?: (value: number) => string;
}

export function DoughnutChart({
  centerText,
  centerTextColor = '#1F2937',
  centerTextSize = 16,
  centerValue,
  centerValueFormatter = value => value.toLocaleString(),
  ...props
}: DoughnutChartProps) {
  const chartOptions: ChartOptions<'pie'> = {
    plugins: {
      beforeDraw: chart => {
        if (centerText || centerValue !== undefined) {
          const ctx = chart.ctx;
          const centerX = chart.width / 2;
          const centerY = chart.height / 2;

          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = centerTextColor;
          ctx.font = `${centerTextSize}px ${ctx.font.split(' ').slice(1).join(' ')}`;

          if (centerText) {
            ctx.fillText(centerText, centerX, centerY);
          }

          if (centerValue !== undefined) {
            const text = centerValueFormatter(centerValue);
            const yOffset = centerText ? 20 : 0;
            ctx.fillText(text, centerX, centerY + yOffset);
          }

          ctx.restore();
        }
      },
    },
    ...props.options,
  };

  return <PieChart {...props} variant="doughnut" options={chartOptions} />;
}

/**
 * Semi-Circle Chart Component
 *
 * Specialized component for semi-circle (gauge-like) charts
 */
export interface SemiCircleChartProps extends Omit<PieChartProps, 'variant'> {
  /** Current value */
  value: number;
  /** Maximum value */
  maxValue: number;
  /** Gauge segments */
  segments?: {
    label: string;
    value: number;
    color: string;
  }[];
  /** Show needle */
  showNeedle?: boolean;
  /** Needle color */
  needleColor?: string;
}

export function SemiCircleChart({
  value,
  maxValue,
  segments = [],
  showNeedle = true,
  needleColor = '#1F2937',
  ...props
}: SemiCircleChartProps) {
  const gaugeData = React.useMemo(() => {
    if (segments.length > 0) {
      return Object.fromEntries(segments.map(segment => [segment.label, segment.value]));
    }

    // Default segments based on value
    const remaining = maxValue - value;
    return {
      Current: value,
      Remaining: remaining,
    };
  }, [value, maxValue, segments]);

  const segmentColors =
    segments.length > 0 ? segments.map(segment => segment.color) : [CHART_COLORS[0], '#E5E7EB'];

  const chartOptions: ChartOptions<'pie'> = {
    rotation: -90,
    circumference: 180,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        filter: tooltipItem => tooltipItem.dataIndex !== 1 || segments.length === 0,
      },
      beforeDraw: chart => {
        if (showNeedle) {
          const ctx = chart.ctx;
          const centerX = chart.width / 2;
          const centerY = chart.height / 2;
          const radius = Math.min(centerX, centerY) * 0.8;

          // Calculate needle angle
          const percentage = value / maxValue;
          const angle = (percentage * 180 - 90) * (Math.PI / 180);

          // Draw needle
          ctx.save();
          ctx.strokeStyle = needleColor;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
          ctx.stroke();

          // Draw center circle
          ctx.fillStyle = needleColor;
          ctx.beginPath();
          ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
          ctx.fill();

          ctx.restore();
        }
      },
    },
    ...props.options,
  };

  return (
    <PieChart
      {...props}
      categoryData={gaugeData}
      variant="doughnut"
      colors={segmentColors}
      cutout={70}
      showLegend={false}
      options={chartOptions}
    />
  );
}

export default ThemedPieChart;

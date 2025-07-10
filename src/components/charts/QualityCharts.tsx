/**
 * Quality Analysis Chart Components
 *
 * Interactive chart components for displaying code quality metrics
 * from Codecov API, including coverage metrics, module analysis, and trends.
 */

import React, { useEffect, useRef, useState, type FC } from 'react';
import { Chart, registerables } from 'chart.js';
import { z } from 'zod';

// Register Chart.js components
Chart.register(...registerables);

// Zod schemas for props validation
const CoverageMetricsDataSchema = z.object({
  overall: z.number(),
  branch: z.number(),
  line: z.number(),
  totalLines: z.number(),
  coveredLines: z.number(),
  missedLines: z.number(),
});

const ModuleCoverageDataSchema = z.object({
  name: z.string(),
  coverage: z.number(),
  lines: z.number(),
  missedLines: z.number(),
});

const CoverageHistoryDataSchema = z.object({
  date: z.string(),
  coverage: z.number(),
});

const BaseChartPropsSchema = z.object({
  height: z.number().default(300),
  title: z.string(),
  className: z.string().optional(),
});

// Props validation schemas (used for runtime validation)
const CoverageMetricsChartPropsSchema = BaseChartPropsSchema.extend({
  data: CoverageMetricsDataSchema,
});

const ModuleCoverageChartPropsSchema = BaseChartPropsSchema.extend({
  data: z.array(ModuleCoverageDataSchema),
});

const CoverageHistoryChartPropsSchema = BaseChartPropsSchema.extend({
  data: z.array(CoverageHistoryDataSchema),
});

// TypeScript types
type CoverageMetricsData = z.infer<typeof CoverageMetricsDataSchema>;
type ModuleCoverageData = z.infer<typeof ModuleCoverageDataSchema>;
type CoverageHistoryData = z.infer<typeof CoverageHistoryDataSchema>;
type CoverageMetricsChartProps = z.infer<typeof CoverageMetricsChartPropsSchema>;
type ModuleCoverageChartProps = z.infer<typeof ModuleCoverageChartPropsSchema>;
type CoverageHistoryChartProps = z.infer<typeof CoverageHistoryChartPropsSchema>;

/**
 * Coverage Metrics Chart - Shows overall coverage statistics
 */
export const CoverageMetricsChart: FC<CoverageMetricsChartProps> = ({
  data,
  height,
  title,
  className = '',
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    try {
      // Validate data
      CoverageMetricsChartPropsSchema.parse({ data, height, title, className });

      // Destroy existing chart
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const ctx = chartRef.current.getContext('2d');
      if (!ctx) return;

      chartInstance.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['カバー済み', '未カバー'],
          datasets: [
            {
              data: [data.coveredLines, data.missedLines],
              backgroundColor: [
                '#10B981', // green-500
                '#EF4444', // red-500
              ],
              borderColor: [
                '#059669', // green-600
                '#DC2626', // red-600
              ],
              borderWidth: 2,
              hoverOffset: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                padding: 20,
                font: {
                  size: 12,
                },
              },
            },
            title: {
              display: true,
              text: `${title} (${data.overall.toFixed(1)}%)`,
              font: {
                size: 16,
                weight: 'bold',
              },
              padding: 20,
            },
            tooltip: {
              callbacks: {
                label: context => {
                  const label = context.label || '';
                  const value = context.parsed || 0;
                  const percentage = ((value / data.totalLines) * 100).toFixed(1);
                  return `${label}: ${value.toLocaleString()}行 (${percentage}%)`;
                },
              },
            },
          },
          cutout: '60%',
          // Center text
          elements: {
            center: {
              text: `${data.overall.toFixed(1)}%`,
              color: '#374151',
              fontStyle: 'bold',
              fontSize: 24,
            },
          },
        },
        plugins: [
          {
            id: 'centerText',
            beforeDraw: chart => {
              const { ctx, width, height } = chart;
              const centerX = width / 2;
              const centerY = height / 2;

              ctx.save();
              ctx.font = 'bold 24px Arial';
              ctx.fillStyle = '#374151';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(`${data.overall.toFixed(1)}%`, centerX, centerY);
              ctx.restore();
            },
          },
        ],
      });

      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'チャートの描画に失敗しました');
      setIsLoading(false);
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [data, title]);

  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <p className="text-red-600">エラー: {error}</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
      <div className="relative" style={{ height }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        )}
        <canvas ref={chartRef} className="w-full h-full" />
      </div>
    </div>
  );
};

/**
 * Module Coverage Chart - Shows coverage for each module
 */
export const ModuleCoverageChart: FC<ModuleCoverageChartProps> = ({
  data,
  height,
  title,
  className = '',
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    try {
      // Validate data
      ModuleCoverageChartPropsSchema.parse({ data, height, title, className });

      // Destroy existing chart
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const ctx = chartRef.current.getContext('2d');
      if (!ctx) return;

      // Sort data by coverage for better visualization
      const sortedData = [...data].sort((a, b) => b.coverage - a.coverage);

      chartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: sortedData.map(item => item.name.replace('src/', '')),
          datasets: [
            {
              label: 'カバレッジ (%)',
              data: sortedData.map(item => item.coverage),
              backgroundColor: sortedData.map(
                item =>
                  item.coverage >= 80
                    ? '#10B981' // green
                    : item.coverage >= 60
                      ? '#F59E0B' // yellow
                      : item.coverage >= 40
                        ? '#EF4444' // red
                        : '#991B1B' // dark red
              ),
              borderColor: sortedData.map(
                item =>
                  item.coverage >= 80
                    ? '#059669' // green
                    : item.coverage >= 60
                      ? '#D97706' // yellow
                      : item.coverage >= 40
                        ? '#DC2626' // red
                        : '#7F1D1D' // dark red
              ),
              borderWidth: 1,
              borderRadius: 4,
              borderSkipped: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y' as const,
          plugins: {
            legend: {
              display: false,
            },
            title: {
              display: true,
              text: title,
              font: {
                size: 16,
                weight: 'bold',
              },
              padding: 20,
            },
            tooltip: {
              callbacks: {
                label: context => {
                  const dataIndex = context.dataIndex;
                  const moduleData = sortedData[dataIndex];
                  return [
                    `カバレッジ: ${moduleData.coverage.toFixed(1)}%`,
                    `総行数: ${moduleData.lines.toLocaleString()}行`,
                    `未カバー: ${moduleData.missedLines.toLocaleString()}行`,
                  ];
                },
              },
            },
          },
          scales: {
            x: {
              beginAtZero: true,
              max: 100,
              ticks: {
                callback: value => `${value}%`,
              },
              grid: {
                color: '#E5E7EB',
              },
            },
            y: {
              ticks: {
                font: {
                  size: 11,
                },
              },
              grid: {
                display: false,
              },
            },
          },
        },
      });

      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'チャートの描画に失敗しました');
      setIsLoading(false);
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [data, title]);

  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <p className="text-red-600">エラー: {error}</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
      <div className="relative" style={{ height }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        )}
        <canvas ref={chartRef} className="w-full h-full" />
      </div>
    </div>
  );
};

/**
 * Coverage History Chart - Shows coverage trends over time
 */
export const CoverageHistoryChart: FC<CoverageHistoryChartProps> = ({
  data,
  height,
  title,
  className = '',
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    try {
      // Validate data
      CoverageHistoryChartPropsSchema.parse({ data, height, title, className });

      // Destroy existing chart
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const ctx = chartRef.current.getContext('2d');
      if (!ctx) return;

      chartInstance.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: data.map(item => {
            const date = new Date(item.date);
            return date.toLocaleDateString('ja-JP', {
              month: 'short',
              day: 'numeric',
            });
          }),
          datasets: [
            {
              label: 'カバレッジ (%)',
              data: data.map(item => item.coverage),
              borderColor: '#3B82F6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointBackgroundColor: '#3B82F6',
              pointBorderColor: '#1E40AF',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
            title: {
              display: true,
              text: title,
              font: {
                size: 16,
                weight: 'bold',
              },
              padding: 20,
            },
            tooltip: {
              callbacks: {
                label: context => {
                  return `カバレッジ: ${context.parsed.y.toFixed(1)}%`;
                },
              },
            },
          },
          scales: {
            x: {
              grid: {
                color: '#E5E7EB',
              },
              ticks: {
                font: {
                  size: 11,
                },
              },
            },
            y: {
              beginAtZero: false,
              min: Math.min(...data.map(item => item.coverage)) - 2,
              max: Math.max(...data.map(item => item.coverage)) + 2,
              ticks: {
                callback: value => `${value}%`,
                font: {
                  size: 11,
                },
              },
              grid: {
                color: '#E5E7EB',
              },
            },
          },
          interaction: {
            intersect: false,
            mode: 'index',
          },
        },
      });

      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'チャートの描画に失敗しました');
      setIsLoading(false);
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [data, title]);

  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <p className="text-red-600">エラー: {error}</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
      <div className="relative" style={{ height }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        )}
        <canvas ref={chartRef} className="w-full h-full" />
      </div>
    </div>
  );
};

// Export types for external use
export type {
  CoverageMetricsData,
  ModuleCoverageData,
  CoverageHistoryData,
  CoverageMetricsChartProps,
  ModuleCoverageChartProps,
  CoverageHistoryChartProps,
};

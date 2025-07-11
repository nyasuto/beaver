/**
 * Module Coverage Chart Component
 *
 * A specialized chart component for displaying module-level code coverage
 * with vertical bar chart visualizations.
 *
 * @module ModuleCoverageChart
 */

import React from 'react';
import { BaseChart, ChartContainer, type BaseChartProps } from './BaseChart';
import { type SafeChartData, type SafeChartOptions } from './types/safe-chart';

/**
 * Module coverage data structure
 */
export interface ModuleCoverageData {
  /** Module name */
  name: string;
  /** Coverage percentage */
  coverage: number;
  /** Total lines in module */
  lines: number;
  /** Number of missed lines */
  missedLines: number;
  /** Module priority (for sorting) */
  priority?: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Module coverage chart component props
 */
export interface ModuleCoverageChartProps {
  /** Array of module coverage data */
  data: ModuleCoverageData[];
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
  /** Coverage threshold for highlighting */
  threshold?: number;
  /** Maximum number of modules to display */
  maxModules?: number;
  /** Sort order */
  sortOrder?: 'asc' | 'desc' | 'none';
  /** Callback when chart is ready */
  onChartReady?: (chart: unknown) => void;
  /** Callback when bar is clicked */
  onModuleClick?: (moduleData: ModuleCoverageData) => void;
}

/**
 * Module Coverage Chart Component
 *
 * Displays module-level code coverage as a vertical bar chart
 */
export function ModuleCoverageChart({
  data,
  title = 'モジュール別カバレッジ',
  description = 'カバレッジ率の低いモジュールから順に表示',
  height = 400,
  width,
  className = '',
  loading = false,
  error,
  showPercentage: _showPercentage = true,
  showLegend = false,
  showValues = true,
  animationDuration = 300,
  threshold = 50,
  maxModules = 10,
  sortOrder = 'asc',
  onChartReady,
  onModuleClick,
}: ModuleCoverageChartProps) {
  // Sort and limit data
  const processedData = React.useMemo(() => {
    const sorted = [...data];

    if (sortOrder === 'asc') {
      sorted.sort((a, b) => a.coverage - b.coverage);
    } else if (sortOrder === 'desc') {
      sorted.sort((a, b) => b.coverage - a.coverage);
    }

    return sorted.slice(0, maxModules);
  }, [data, sortOrder, maxModules]);

  // Prepare chart data
  const chartData: SafeChartData<'bar'> = {
    labels: processedData.map(module => module.name.replace(/^src\//, '').replace(/\//g, '/')),
    datasets: [
      {
        label: 'カバレッジ率',
        data: processedData.map(module => module.coverage),
        backgroundColor: processedData.map(module => {
          if (module.coverage >= 80) return '#10B981'; // Green
          if (module.coverage >= threshold) return '#F59E0B'; // Yellow
          return '#EF4444'; // Red
        }),
        borderColor: processedData.map(module => {
          if (module.coverage >= 80) return '#059669'; // Dark green
          if (module.coverage >= threshold) return '#D97706'; // Dark yellow
          return '#DC2626'; // Dark red
        }),
        borderWidth: 1,
        hoverBackgroundColor: processedData.map(module => {
          if (module.coverage >= 80) return '#059669';
          if (module.coverage >= threshold) return '#D97706';
          return '#DC2626';
        }),
        hoverBorderColor: processedData.map(module => {
          if (module.coverage >= 80) return '#047857';
          if (module.coverage >= threshold) return '#B45309';
          return '#B91C1C';
        }),
        hoverBorderWidth: 2,
      },
    ],
  };

  // Chart options
  const chartOptions: SafeChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
        position: 'top',
        labels: {
          color: '#374151',
          font: {
            size: 14,
            family: 'Inter, system-ui, sans-serif',
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
          title: (context: any) => {
            const index = context[0]?.dataIndex;
            const module = processedData[index];
            return module?.name || '';
          },
          label: (context: any) => {
            const index = context.dataIndex;
            const module = processedData[index];
            // For vertical bar charts, the value is in parsed.y
            const coverage = context.parsed?.y ?? context.raw ?? 0;

            if (showValues && module) {
              return `カバレッジ: ${coverage.toFixed(1)}% | 総行数: ${module.lines.toLocaleString()}行 | 未カバー: ${module.missedLines.toLocaleString()}行`;
            }
            return `カバレッジ: ${coverage.toFixed(1)}%`;
          },
        },
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#6B7280',
          font: {
            size: 11,
            family: 'Monaco, monospace',
          },
          maxTicksLimit: maxModules,
          maxRotation: 45,
          minRotation: 0,
        },
        grid: {
          display: false,
        },
        title: {
          display: true,
          text: 'モジュール',
          color: '#374151',
          font: {
            size: 14,
            family: 'Inter, system-ui, sans-serif',
          },
        },
      },
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          color: '#6B7280',
          font: {
            size: 12,
            family: 'Inter, system-ui, sans-serif',
          },
          callback: value => {
            if (typeof value === 'number') {
              return `${value}%`;
            }
            return value;
          },
        },
        grid: {
          display: true,
          color: '#F3F4F6',
          borderColor: '#E5E7EB',
        },
        title: {
          display: true,
          text: 'カバレッジ率 (%)',
          color: '#374151',
          font: {
            size: 14,
            family: 'Inter, system-ui, sans-serif',
          },
        },
      },
    },
    // Vertical bar chart (default)
    animation: {
      duration: animationDuration,
      easing: 'easeInOutQuart',
    },
    onClick: (event: any, elements: any[]) => {
      if (elements.length > 0 && onModuleClick) {
        const element = elements[0];
        const index = element.index;
        const module = processedData[index];
        if (module) {
          onModuleClick(module);
        }
      }
    },
  };

  // Base chart props
  const baseChartProps: BaseChartProps<'bar'> = {
    type: 'bar',
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

  // Generate threshold line indicator
  const thresholdInfo = (
    <div className="flex items-center space-x-4 text-sm text-gray-600">
      <div className="flex items-center">
        <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
        <span>≥80%</span>
      </div>
      <div className="flex items-center">
        <div className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></div>
        <span>≥{threshold}%</span>
      </div>
      <div className="flex items-center">
        <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
        <span>&lt;{threshold}%</span>
      </div>
      <div className="text-xs text-gray-500">
        ({processedData.length}/{data.length}件表示)
      </div>
    </div>
  );

  return (
    <ChartContainer
      title={title}
      description={description}
      className={className}
      actions={thresholdInfo}
    >
      <div style={{ height: `${height}px` }}>
        <BaseChart {...baseChartProps} />
      </div>
    </ChartContainer>
  );
}

/**
 * Module Coverage Summary Component
 *
 * Displays a summary of module coverage statistics
 */
export interface ModuleCoverageSummaryProps {
  /** Array of module coverage data */
  data: ModuleCoverageData[];
  /** Coverage threshold for analysis */
  threshold?: number;
  /** CSS class name */
  className?: string;
}

export function ModuleCoverageSummary({
  data,
  threshold = 50,
  className = '',
}: ModuleCoverageSummaryProps) {
  const stats = React.useMemo(() => {
    const high = data.filter(m => m.coverage >= 80).length;
    const medium = data.filter(m => m.coverage >= threshold && m.coverage < 80).length;
    const low = data.filter(m => m.coverage < threshold).length;
    const average = data.reduce((sum, m) => sum + m.coverage, 0) / data.length;

    return {
      total: data.length,
      high,
      medium,
      low,
      average,
      needsAttention: data.filter(m => m.coverage < threshold).length,
    };
  }, [data, threshold]);

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 ${className}`}>
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">総モジュール数</div>
        <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">{stats.total}</div>
      </div>

      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
        <div className="text-sm text-green-600 dark:text-green-400 mb-1">高カバレッジ</div>
        <div className="text-2xl font-bold text-green-800 dark:text-green-200">{stats.high}</div>
        <div className="text-xs text-green-600 dark:text-green-400">≥80%</div>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
        <div className="text-sm text-yellow-600 dark:text-yellow-400 mb-1">中カバレッジ</div>
        <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">
          {stats.medium}
        </div>
        <div className="text-xs text-yellow-600 dark:text-yellow-400">≥{threshold}%</div>
      </div>

      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
        <div className="text-sm text-red-600 dark:text-red-400 mb-1">低カバレッジ</div>
        <div className="text-2xl font-bold text-red-800 dark:text-red-200">{stats.low}</div>
        <div className="text-xs text-red-600 dark:text-red-400">&lt;{threshold}%</div>
      </div>

      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
        <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">平均カバレッジ</div>
        <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">
          {stats.average.toFixed(1)}%
        </div>
      </div>

      <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
        <div className="text-sm text-orange-600 dark:text-orange-400 mb-1">要改善</div>
        <div className="text-2xl font-bold text-orange-800 dark:text-orange-200">
          {stats.needsAttention}
        </div>
        <div className="text-xs text-orange-600 dark:text-orange-400">優先対応</div>
      </div>
    </div>
  );
}

export default ModuleCoverageChart;

/**
 * Coverage History Chart Component
 *
 * A specialized chart component for displaying code coverage historical data
 * with time-series line chart visualizations.
 *
 * Features:
 * - Browser timezone detection and proper date handling using date-fns
 * - Automatic locale detection for date formatting (Japanese/English)
 * - Consistent parsing of date-only strings (YYYY-MM-DD) in local timezone
 * - Support for full ISO timestamp strings with timezone information
 *
 * @module CoverageHistoryChart
 */

import React, { useMemo, useState } from 'react';
import { format, parseISO, isValid, parse } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';
import { BaseChart, ChartContainer, type BaseChartProps } from './BaseChart';
import { type SafeChartData, type SafeChartOptions } from './types/safe-chart';

/**
 * Coverage history data point
 */
export interface CoverageHistoryPoint {
  /** Date in ISO string format */
  date: string;
  /** Coverage percentage */
  coverage: number;
  /** Optional branch coverage */
  branchCoverage?: number;
  /** Optional line coverage */
  lineCoverage?: number;
}

/**
 * Time period options for filtering
 */
export type TimePeriod = '1w' | '1m' | '3m' | '6m' | '1y' | 'all';

/**
 * Coverage history chart component props
 */
export interface CoverageHistoryChartProps {
  /** Historical coverage data */
  data: CoverageHistoryPoint[];
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
  /** Show multiple metrics (line, branch coverage) */
  showMultipleMetrics?: boolean;
  /** Show trend analysis */
  showTrend?: boolean;
  /** Show goal line */
  goalPercentage?: number;
  /** Animation duration */
  animationDuration?: number;
  /** Default time period */
  defaultPeriod?: TimePeriod;
  /** Callback when chart is ready */
  onChartReady?: (chart: unknown) => void;
  /** Callback when period changes */
  onPeriodChange?: (period: TimePeriod) => void;
}

/**
 * Coverage History Chart Component
 *
 * Displays code coverage historical data as a time-series line chart
 */
export function CoverageHistoryChart({
  data,
  title = 'カバレッジ履歴',
  description = '時系列でのカバレッジ変化',
  height = 400,
  width,
  className = '',
  loading = false,
  error,
  showMultipleMetrics = true,
  showTrend = true,
  goalPercentage = 80,
  animationDuration = 300,
  defaultPeriod = '1m',
  onChartReady,
  onPeriodChange,
}: CoverageHistoryChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>(defaultPeriod);

  // Detect browser timezone and locale
  const browserLocale = useMemo(() => {
    if (typeof window !== 'undefined') {
      return navigator.language || 'en-US';
    }
    return 'en-US';
  }, []);

  // Note: Browser timezone can be detected with:
  // Intl.DateTimeFormat().resolvedOptions().timeZone

  // Get appropriate date-fns locale based on browser locale
  const dateFnsLocale = useMemo(() => {
    if (browserLocale.startsWith('ja')) {
      return ja;
    }
    // Default to English for other locales
    return enUS;
  }, [browserLocale]);

  // Helper function to parse date strings consistently in local timezone
  const parseLocalDate = (dateString: string): Date => {
    // Try parsing as ISO string first (e.g., "2025-01-03T10:00:00Z")
    if (dateString.includes('T') || dateString.includes('Z') || dateString.includes('+')) {
      const parsed = parseISO(dateString);
      if (isValid(parsed)) {
        return parsed;
      }
    }

    // For date-only strings (e.g., "2025-01-03"), parse in local timezone
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const parsed = parse(dateString, 'yyyy-MM-dd', new Date());
      if (isValid(parsed)) {
        return parsed;
      }
    }

    // Fallback to default parsing
    const fallback = new Date(dateString);
    return isValid(fallback) ? fallback : new Date();
  };

  // Filter data based on selected period
  const filteredData = useMemo(() => {
    if (selectedPeriod === 'all') return data;

    const now = new Date();
    const periodMap: Record<TimePeriod, number> = {
      '1w': 7,
      '1m': 30,
      '3m': 90,
      '6m': 180,
      '1y': 365,
      all: Infinity,
    };

    const daysBack = periodMap[selectedPeriod];
    const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    return data.filter(point => parseLocalDate(point.date) >= cutoffDate);
  }, [data, selectedPeriod]);

  // Calculate trend analysis
  const trendAnalysis = useMemo(() => {
    if (filteredData.length < 2) return null;

    const firstPoint = filteredData[0];
    const lastPoint = filteredData[filteredData.length - 1];

    if (!firstPoint || !lastPoint) return null;

    const change = lastPoint.coverage - firstPoint.coverage;
    const changePercent = (change / firstPoint.coverage) * 100;

    return {
      change,
      changePercent,
      trend: change > 0 ? 'improving' : change < 0 ? 'declining' : 'stable',
      current: lastPoint.coverage,
      previous: firstPoint.coverage,
    };
  }, [filteredData]);

  // Prepare chart data
  const chartData: SafeChartData<'line'> = {
    labels: filteredData.map(point => {
      const date = parseLocalDate(point.date);
      // Use date-fns for consistent formatting in browser's locale
      return format(date, 'MMM d', { locale: dateFnsLocale });
    }),
    datasets: [
      {
        label: '総合カバレッジ',
        data: filteredData.map(point => point.coverage),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#3B82F6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      },
      ...(showMultipleMetrics && filteredData.some(p => p.branchCoverage !== undefined)
        ? [
            {
              label: 'ブランチカバレッジ',
              data: filteredData.map(point => point.branchCoverage || 0),
              borderColor: '#10B981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              borderWidth: 2,
              fill: false,
              tension: 0.4,
              pointRadius: 3,
              pointHoverRadius: 5,
              pointBackgroundColor: '#10B981',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
            },
          ]
        : []),
      ...(goalPercentage
        ? [
            {
              label: '目標ライン',
              data: filteredData.map(() => goalPercentage),
              borderColor: '#F59E0B',
              backgroundColor: 'transparent',
              borderWidth: 2,
              borderDash: [5, 5],
              fill: false,
              tension: 0,
              pointRadius: 0,
              pointHoverRadius: 0,
            },
          ]
        : []),
    ],
  };

  // Chart options
  const chartOptions: SafeChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#374151',
          font: {
            size: 12,
            family: 'Inter, system-ui, sans-serif',
          },
          padding: 20,
          usePointStyle: true,
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
            if (index !== undefined && filteredData[index]) {
              const point = filteredData[index];
              const date = parseLocalDate(point.date);
              // Format in browser's locale with full date info
              return format(date, 'PPPP', { locale: dateFnsLocale });
            }
            return '';
          },
          label: (context: any) => {
            const value = context.parsed?.y ?? 0;
            return `${context.dataset.label}: ${value.toFixed(1)}%`;
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
            family: 'Inter, system-ui, sans-serif',
          },
          maxTicksLimit: 8,
        },
        grid: {
          display: true,
          color: '#F3F4F6',
          borderColor: '#E5E7EB',
        },
        title: {
          display: true,
          text: '日付',
          color: '#374151',
          font: {
            size: 12,
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
            size: 11,
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
            size: 12,
            family: 'Inter, system-ui, sans-serif',
          },
        },
      },
    },
    animation: {
      duration: animationDuration,
      easing: 'easeInOutQuart',
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  // Period selector options
  const periodOptions: { value: TimePeriod; label: string }[] = [
    { value: '1w', label: '1週間' },
    { value: '1m', label: '1ヶ月' },
    { value: '3m', label: '3ヶ月' },
    { value: '6m', label: '6ヶ月' },
    { value: '1y', label: '1年' },
    { value: 'all', label: '全期間' },
  ];

  const handlePeriodChange = (period: TimePeriod) => {
    setSelectedPeriod(period);
    onPeriodChange?.(period);
  };

  // Base chart props
  const baseChartProps: BaseChartProps<'line'> = {
    type: 'line',
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

  // Actions component with period selector and trend info
  const actions = (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      {/* Period Selector */}
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600">期間:</span>
        <div className="flex items-center space-x-1">
          {periodOptions.map(option => (
            <button
              key={option.value}
              onClick={() => handlePeriodChange(option.value)}
              className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                selectedPeriod === option.value
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trend Analysis */}
      {showTrend && trendAnalysis && (
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">トレンド:</span>
            <span
              className={`flex items-center ${
                trendAnalysis.trend === 'improving'
                  ? 'text-green-600'
                  : trendAnalysis.trend === 'declining'
                    ? 'text-red-600'
                    : 'text-gray-600'
              }`}
            >
              {trendAnalysis.trend === 'improving' && '📈'}
              {trendAnalysis.trend === 'declining' && '📉'}
              {trendAnalysis.trend === 'stable' && '➡️'}
              <span className="ml-1">
                {trendAnalysis.change > 0 ? '+' : ''}
                {trendAnalysis.change.toFixed(1)}%
              </span>
            </span>
          </div>
          <div className="text-gray-600">現在: {trendAnalysis.current.toFixed(1)}%</div>
        </div>
      )}
    </div>
  );

  return (
    <ChartContainer title={title} description={description} className={className} actions={actions}>
      <div style={{ height: `${height}px` }}>
        <BaseChart {...baseChartProps} />
      </div>
    </ChartContainer>
  );
}

/**
 * Coverage History Summary Component
 *
 * Displays summary statistics for coverage history
 */
export interface CoverageHistorySummaryProps {
  /** Historical coverage data */
  data: CoverageHistoryPoint[];
  /** CSS class name */
  className?: string;
}

export function CoverageHistorySummary({ data, className = '' }: CoverageHistorySummaryProps) {
  const stats = useMemo(() => {
    if (data.length === 0) {
      return {
        current: 0,
        average: 0,
        highest: 0,
        lowest: 0,
        trend: 'stable' as const,
        changeFromStart: 0,
      };
    }

    const coverageValues = data.map(point => point.coverage);
    const current = coverageValues[coverageValues.length - 1];
    const average = coverageValues.reduce((sum, val) => sum + val, 0) / coverageValues.length;
    const highest = Math.max(...coverageValues);
    const lowest = Math.min(...coverageValues);

    const first = coverageValues[0];
    const changeFromStart = (current ?? 0) - (first ?? 0);
    const trend = changeFromStart > 1 ? 'improving' : changeFromStart < -1 ? 'declining' : 'stable';

    return {
      current: current ?? 0,
      average,
      highest,
      lowest,
      trend,
      changeFromStart,
    };
  }, [data]);

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 ${className}`}>
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">現在</div>
        <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
          {stats.current.toFixed(1)}%
        </div>
      </div>

      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
        <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">平均</div>
        <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">
          {stats.average.toFixed(1)}%
        </div>
      </div>

      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
        <div className="text-sm text-green-600 dark:text-green-400 mb-1">最高</div>
        <div className="text-2xl font-bold text-green-800 dark:text-green-200">
          {stats.highest.toFixed(1)}%
        </div>
      </div>

      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
        <div className="text-sm text-red-600 dark:text-red-400 mb-1">最低</div>
        <div className="text-2xl font-bold text-red-800 dark:text-red-200">
          {stats.lowest.toFixed(1)}%
        </div>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
        <div className="text-sm text-yellow-600 dark:text-yellow-400 mb-1">トレンド</div>
        <div className="text-xl font-bold text-yellow-800 dark:text-yellow-200">
          {stats.trend === 'improving' && '📈 向上'}
          {stats.trend === 'declining' && '📉 低下'}
          {stats.trend === 'stable' && '➡️ 安定'}
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">開始時から</div>
        <div
          className={`text-2xl font-bold ${
            stats.changeFromStart > 0
              ? 'text-green-600'
              : stats.changeFromStart < 0
                ? 'text-red-600'
                : 'text-gray-600'
          }`}
        >
          {stats.changeFromStart > 0 ? '+' : ''}
          {stats.changeFromStart.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

export default CoverageHistoryChart;

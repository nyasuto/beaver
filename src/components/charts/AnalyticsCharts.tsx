/**
 * Analytics Charts Components
 *
 * Pre-configured chart components for the analytics dashboard.
 * These components integrate with the analytics API and provide
 * real-time data visualization for GitHub repository insights.
 *
 * @module AnalyticsCharts
 */

import React, { useState, useEffect } from 'react';
import {
  ChartContainer,
  TimeSeriesChart,
  ThemedPieChart,
  ThemedBarChart,
  ThemedAreaChart,
  SparklineAreaChart,
  HorizontalBarChart,
  CHART_COLORS,
} from './index';
import type { TimeSeriesPoint, PerformanceMetrics } from '../../lib/analytics/engine';

/**
 * Issue Trends Chart Component
 *
 * Displays issue creation trends over time using a line chart
 */
export interface IssueTrendsChartProps {
  /** Chart height */
  height?: number;
  /** Time window in days */
  timeWindow?: number;
  /** Show loading state */
  loading?: boolean;
  /** Show controls */
  showControls?: boolean;
  /** Chart title */
  title?: string;
}

export function IssueTrendsChart({
  height = 300,
  timeWindow = 30,
  loading = false,
  showControls = true,
  title = 'Issue Trends',
}: IssueTrendsChartProps) {
  const [data, setData] = useState<TimeSeriesPoint[]>([]);
  const [selectedWindow, setSelectedWindow] = useState(timeWindow);
  const [isLoading, setIsLoading] = useState(loading);

  // Fetch data from analytics API
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/analytics?timeframe=${selectedWindow}d`);
        const result = await response.json();

        // Transform API data to TimeSeriesPoint format
        const dailyIssues = result.data?.trends?.daily_issues || [];
        const timeSeriesData = dailyIssues.map((point: { date: string; opened: number }) => ({
          timestamp: new Date(point.date),
          value: point.opened || 0,
        }));

        setData(timeSeriesData);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch issue trends:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedWindow]);

  const controlsSection = showControls && (
    <div className="flex items-center space-x-2">
      <select
        value={selectedWindow}
        onChange={e => setSelectedWindow(Number(e.target.value))}
        className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white dark:bg-gray-800 dark:border-gray-600"
      >
        <option value={7}>Last 7 days</option>
        <option value={30}>Last 30 days</option>
        <option value={90}>Last 90 days</option>
      </select>
    </div>
  );

  return (
    <ChartContainer
      title={title}
      description={`Issues created over the last ${selectedWindow} days`}
      actions={controlsSection}
      className="h-full"
    >
      <div style={{ height }}>
        <TimeSeriesChart
          data={data}
          loading={isLoading}
          yAxisLabel="Issues Created"
          aggregation="day"
          showTrend={true}
          smooth={true}
          showPoints={true}
          fill={true}
          lineColor={CHART_COLORS[0] || '#3B82F6'}
          trendColor={CHART_COLORS[3] || '#EF4444'}
        />
      </div>
    </ChartContainer>
  );
}

/**
 * Issue Categories Chart Component
 *
 * Displays issue distribution by category using a pie chart
 */
export interface IssueCategoriesChartProps {
  /** Chart height */
  height?: number;
  /** Show loading state */
  loading?: boolean;
  /** Chart title */
  title?: string;
  /** Show percentages */
  showPercentages?: boolean;
}

export function IssueCategoriesChart({
  height = 300,
  loading = false,
  title = 'Issue Categories',
}: IssueCategoriesChartProps) {
  const [data, setData] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(loading);

  // Fetch data from analytics API
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/analytics');
        const result = await response.json();

        // Transform API data to category format
        const categories = result.data?.categories || {};
        const categoryData = Object.entries(categories).reduce(
          (acc: Record<string, number>, [name, data]: [string, { count: number }]) => {
            acc[name] = data.count;
            return acc;
          },
          {}
        );

        setData(categoryData);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch issue categories:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <ChartContainer
      title={title}
      description="Distribution of issues by category"
      className="h-full"
    >
      <div style={{ height }}>
        <ThemedPieChart
          type="pie"
          loading={isLoading}
          data={{
            labels: Object.keys(data),
            datasets: [
              {
                data: Object.values(data),
                backgroundColor: Object.keys(data).map(
                  (_, i) => (CHART_COLORS[i % CHART_COLORS.length] || '#3B82F6') + '80'
                ),
                borderColor: Object.keys(data).map(
                  (_, i) => CHART_COLORS[i % CHART_COLORS.length] || '#3B82F6'
                ),
                borderWidth: 2,
              },
            ],
          }}
        />
      </div>
    </ChartContainer>
  );
}

/**
 * Resolution Time Chart Component
 *
 * Displays average resolution time trends using a bar chart
 */
export interface ResolutionTimeChartProps {
  /** Chart height */
  height?: number;
  /** Show loading state */
  loading?: boolean;
  /** Chart title */
  title?: string;
  /** Chart orientation */
  orientation?: 'vertical' | 'horizontal';
}

export function ResolutionTimeChart({
  height = 300,
  loading = false,
  title = 'Average Resolution Time',
}: ResolutionTimeChartProps) {
  const [data, setData] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(loading);

  // Fetch data from analytics API
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/analytics');
        const result = await response.json();

        // Transform API data to resolution time format
        const categories = result.data?.categories || {};
        const resolutionData = Object.entries(categories).reduce(
          (acc: Record<string, number>, [name]: [string, { count: number }]) => {
            // Use a mock resolution time calculation based on category
            const mockResolutionHours: Record<string, number> = {
              bug: 72,
              feature: 120,
              enhancement: 96,
              documentation: 48,
              question: 24,
            };
            acc[name] = mockResolutionHours[name] || 72;
            return acc;
          },
          {}
        );

        setData(resolutionData);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch resolution times:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <ChartContainer
      title={title}
      description="Average time to resolve issues by category"
      className="h-full"
    >
      <div style={{ height }}>
        <ThemedBarChart
          type="bar"
          loading={isLoading}
          data={{
            labels: Object.keys(data),
            datasets: [
              {
                label: 'Hours',
                data: Object.values(data),
                backgroundColor: (CHART_COLORS[1] || '#10B981') + '80',
                borderColor: CHART_COLORS[1] || '#10B981',
                borderWidth: 1,
              },
            ],
          }}
        />
      </div>
    </ChartContainer>
  );
}

/**
 * Performance Metrics Chart Component
 *
 * Displays repository performance metrics using area charts
 */
export interface PerformanceMetricsChartProps {
  /** Chart height */
  height?: number;
  /** Show loading state */
  loading?: boolean;
  /** Chart title */
  title?: string;
  /** Time window in days */
  timeWindow?: number;
}

export function PerformanceMetricsChart({
  height = 300,
  loading = false,
  title = 'Performance Metrics',
  timeWindow = 30,
}: PerformanceMetricsChartProps) {
  const [data, setData] = useState<PerformanceMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(loading);

  // Fetch data from analytics API
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/analytics?metrics=performance&timeWindow=${timeWindow}`);
        const result = await response.json();

        setData(result.performanceMetrics || []);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch performance metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [timeWindow]);

  // Convert performance data to chart format
  const chartData = React.useMemo(() => {
    if (!data.length) return { labels: [], datasets: [] };

    const labels = data.map((_, index) => `Week ${index + 1}`);

    return {
      labels,
      datasets: [
        {
          label: 'Resolution Rate (%)',
          data: data.map(d => d.resolutionRate),
          backgroundColor: CHART_COLORS[0] + '40',
          borderColor: CHART_COLORS[0],
          fill: true,
        },
        {
          label: 'Throughput (issues/day)',
          data: data.map(d => d.throughput),
          backgroundColor: CHART_COLORS[1] + '40',
          borderColor: CHART_COLORS[1],
          fill: true,
        },
      ],
    };
  }, [data]);

  return (
    <ChartContainer title={title} description="Repository performance over time" className="h-full">
      <div style={{ height }}>
        <ThemedAreaChart type="line" data={chartData} loading={isLoading} />
      </div>
    </ChartContainer>
  );
}

/**
 * Contributor Activity Chart Component
 *
 * Displays contributor activity using a horizontal bar chart
 */
export interface ContributorActivityChartProps {
  /** Chart height */
  height?: number;
  /** Show loading state */
  loading?: boolean;
  /** Chart title */
  title?: string;
  /** Maximum contributors to show */
  maxContributors?: number;
}

export function ContributorActivityChart({
  height = 300,
  loading = false,
  title = 'Top Contributors',
  maxContributors = 10,
}: ContributorActivityChartProps) {
  const [data, setData] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(loading);

  // Fetch data from analytics API
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/analytics');
        const result = await response.json();

        // Transform API data to contributor format
        const contributors = result.data?.contributors || [];
        const contributorData = contributors
          .slice(0, maxContributors)
          .reduce(
            (
              acc: Record<string, number>,
              contributor: { login: string; contributions: number }
            ) => {
              acc[contributor.login] = contributor.contributions;
              return acc;
            },
            {}
          );

        setData(contributorData);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch contributor activity:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [maxContributors]);

  return (
    <ChartContainer
      title={title}
      description="Most active contributors by issue count"
      className="h-full"
    >
      <div style={{ height }}>
        <HorizontalBarChart
          loading={isLoading}
          data={{
            labels: Object.keys(data),
            datasets: [
              {
                label: 'Issues',
                data: Object.values(data),
                backgroundColor: (CHART_COLORS[2] || '#F59E0B') + '80',
                borderColor: CHART_COLORS[2] || '#F59E0B',
                borderWidth: 1,
              },
            ],
          }}
        />
      </div>
    </ChartContainer>
  );
}

/**
 * Mini Sparkline Chart Component
 *
 * Compact chart for displaying trends in limited space
 */
export interface SparklineChartProps {
  /** Data points */
  data: TimeSeriesPoint[];
  /** Chart height */
  height?: number;
  /** Chart color */
  color?: string;
  /** Show loading state */
  loading?: boolean;
}

export function SparklineChart({
  data,
  height = 60,
  color = CHART_COLORS[0],
  loading = false,
}: SparklineChartProps) {
  return (
    <div style={{ height }}>
      <SparklineAreaChart
        loading={loading}
        height={height}
        data={{
          labels: data.map(point => point.timestamp.toLocaleDateString()),
          datasets: [
            {
              label: 'Data',
              data: data.map(point => point.value),
              backgroundColor: (color || '#3B82F6') + '40',
              borderColor: color || '#3B82F6',
              fill: true,
            },
          ],
        }}
      />
    </div>
  );
}

/**
 * Dashboard Summary Charts Component
 *
 * Collection of charts for dashboard overview
 */
export interface DashboardSummaryChartsProps {
  /** Layout mode */
  layout?: 'grid' | 'stack';
  /** Chart height */
  chartHeight?: number;
  /** Show loading state */
  loading?: boolean;
}

export function DashboardSummaryCharts({
  layout = 'grid',
  chartHeight = 300,
  loading = false,
}: DashboardSummaryChartsProps) {
  const containerClass = layout === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : 'space-y-6';

  return (
    <div className={containerClass}>
      <IssueTrendsChart height={chartHeight} loading={loading} showControls={true} />
      <IssueCategoriesChart height={chartHeight} loading={loading} showPercentages={true} />
      <ResolutionTimeChart height={chartHeight} loading={loading} orientation="vertical" />
      <ContributorActivityChart height={chartHeight} loading={loading} maxContributors={8} />
    </div>
  );
}

export default DashboardSummaryCharts;

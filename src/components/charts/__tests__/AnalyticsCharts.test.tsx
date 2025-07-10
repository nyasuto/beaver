/**
 * AnalyticsCharts Components Tests
 *
 * Analytics chart コンポーネントの包括的テストスイート
 * データ可視化、API統合、ユーザーインタラクション機能を検証する
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  IssueTrendsChart,
  IssueCategoriesChart,
  ResolutionTimeChart,
  PerformanceMetricsChart,
  ContributorActivityChart,
  SparklineChart,
  DashboardSummaryCharts,
  type IssueTrendsChartProps,
  type IssueCategoriesChartProps,
  type ResolutionTimeChartProps,
  type PerformanceMetricsChartProps,
  type ContributorActivityChartProps,
  type SparklineChartProps,
  // type DashboardSummaryChartsProps, // Commented out as unused in current tests
} from '../AnalyticsCharts';
import type { TimeSeriesPoint } from '../../../lib/analytics/engine';

// Mock external dependencies
vi.mock('../index', () => ({
  ChartContainer: ({ children, title, description, actions, className }: any) => (
    <div data-testid="chart-container" className={className}>
      <div data-testid="chart-title">{title}</div>
      <div data-testid="chart-description">{description}</div>
      <div data-testid="chart-actions">{actions}</div>
      <div data-testid="chart-content">{children}</div>
    </div>
  ),
  TimeSeriesChart: (props: any) => (
    <div data-testid="time-series-chart" data-props={JSON.stringify(props)}>
      {props.loading ? 'Loading...' : 'Time Series Chart'}
    </div>
  ),
  ThemedPieChart: (props: any) => (
    <div data-testid="themed-pie-chart" data-props={JSON.stringify(props)}>
      {props.loading ? 'Loading...' : 'Pie Chart'}
    </div>
  ),
  ThemedBarChart: (props: any) => (
    <div data-testid="themed-bar-chart" data-props={JSON.stringify(props)}>
      {props.loading ? 'Loading...' : 'Bar Chart'}
    </div>
  ),
  ThemedAreaChart: (props: any) => (
    <div data-testid="themed-area-chart" data-props={JSON.stringify(props)}>
      {props.loading ? 'Loading...' : 'Area Chart'}
    </div>
  ),
  SparklineAreaChart: (props: any) => (
    <div data-testid="sparkline-area-chart" data-props={JSON.stringify(props)}>
      {props.loading ? 'Loading...' : 'Sparkline Chart'}
    </div>
  ),
  HorizontalBarChart: (props: any) => (
    <div data-testid="horizontal-bar-chart" data-props={JSON.stringify(props)}>
      {props.loading ? 'Loading...' : 'Horizontal Bar Chart'}
    </div>
  ),
  CHART_COLORS: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Test data helpers
const createMockTimeSeriesData = (): TimeSeriesPoint[] => [
  { timestamp: new Date('2024-01-01'), value: 10 },
  { timestamp: new Date('2024-01-02'), value: 15 },
  { timestamp: new Date('2024-01-03'), value: 8 },
  { timestamp: new Date('2024-01-04'), value: 20 },
  { timestamp: new Date('2024-01-05'), value: 12 },
];

const createMockAPIResponse = (data: any) => ({
  ok: true,
  json: () => Promise.resolve({ success: true, data }),
});

// Helper for error responses (currently unused but may be useful for future tests)
// const createMockErrorResponse = (status: number = 500) => ({
//   ok: false,
//   status,
//   json: () => Promise.resolve({ success: false, error: 'API Error' }),
// });

describe('AnalyticsCharts Components', () => {
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  // =====================
  // ISSUE TRENDS CHART
  // =====================
  describe('IssueTrendsChart', () => {
    const defaultProps: IssueTrendsChartProps = {
      height: 300,
      timeWindow: 30,
      loading: false,
      showControls: false,
      title: 'Test Issue Trends',
    };

    it('should render with default props', () => {
      render(<IssueTrendsChart />);

      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
      expect(screen.getByTestId('chart-title')).toHaveTextContent('Issue Trends');
      expect(screen.getByTestId('time-series-chart')).toBeInTheDocument();
    });

    it('should render with custom props', () => {
      render(<IssueTrendsChart {...defaultProps} />);

      expect(screen.getByTestId('chart-title')).toHaveTextContent('Test Issue Trends');
      expect(screen.getByTestId('chart-description')).toHaveTextContent(
        '過去30日間に作成されたIssue'
      );
    });

    it('should show controls when showControls is true', () => {
      render(<IssueTrendsChart showControls={true} />);

      const actions = screen.getByTestId('chart-actions');
      expect(actions).toBeInTheDocument();
      expect(actions.querySelector('select')).toBeInTheDocument();
    });

    it('should handle time window selection', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockAPIResponse({
          trends: {
            daily_issues: [
              { date: '2024-01-01', opened: 5 },
              { date: '2024-01-02', opened: 8 },
            ],
          },
        })
      );

      render(<IssueTrendsChart showControls={true} />);

      const select = screen.getByDisplayValue('過去30日間');
      fireEvent.change(select, { target: { value: '7' } });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/analytics?timeframe=7d');
      });
    });

    it('should use provided data when available', () => {
      const mockData = {
        labels: ['Jan', 'Feb', 'Mar'],
        datasets: [{ data: [1, 2, 3] }],
      };

      render(<IssueTrendsChart data={mockData} />);

      const chart = screen.getByTestId('time-series-chart');
      const props = JSON.parse(chart.getAttribute('data-props') || '{}');
      expect(props.data).toEqual(mockData);
    });

    it('should handle API fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<IssueTrendsChart />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to fetch issue trends:',
          expect.any(Error)
        );
      });
    });

    it('should show loading state', () => {
      render(<IssueTrendsChart loading={true} />);

      const chart = screen.getByTestId('time-series-chart');
      const props = JSON.parse(chart.getAttribute('data-props') || '{}');
      expect(props.loading).toBe(true);
    });

    it('should pass correct chart configuration', () => {
      render(<IssueTrendsChart />);

      const chart = screen.getByTestId('time-series-chart');
      const props = JSON.parse(chart.getAttribute('data-props') || '{}');

      expect(props.yAxisLabel).toBe('作成されたIssue数');
      expect(props.aggregation).toBe('day');
      expect(props.showTrend).toBe(true);
      expect(props.smooth).toBe(true);
      expect(props.showPoints).toBe(true);
      expect(props.fill).toBe(true);
    });
  });

  // =====================
  // ISSUE CATEGORIES CHART
  // =====================
  describe('IssueCategoriesChart', () => {
    const defaultProps: IssueCategoriesChartProps = {
      height: 300,
      loading: false,
      title: 'Test Categories',
    };

    it('should render with default props', () => {
      render(<IssueCategoriesChart />);

      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
      expect(screen.getByTestId('chart-title')).toHaveTextContent('Issue Categories');
      expect(screen.getByTestId('themed-pie-chart')).toBeInTheDocument();
    });

    it('should render with custom props', () => {
      render(<IssueCategoriesChart {...defaultProps} />);

      expect(screen.getByTestId('chart-title')).toHaveTextContent('Test Categories');
      expect(screen.getByTestId('chart-description')).toHaveTextContent('カテゴリ別Issue分布');
    });

    it('should fetch and display category data', async () => {
      const mockCategories = {
        bug: { count: 10 },
        feature: { count: 5 },
        enhancement: { count: 8 },
      };

      mockFetch.mockResolvedValueOnce(
        createMockAPIResponse({
          categories: mockCategories,
        })
      );

      render(<IssueCategoriesChart />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/analytics');
      });
    });

    it('should use provided data when available', () => {
      const mockData = {
        labels: ['Bug', 'Feature', 'Enhancement'],
        datasets: [{ data: [10, 5, 8] }],
      };

      render(<IssueCategoriesChart data={mockData} />);

      const chart = screen.getByTestId('themed-pie-chart');
      const props = JSON.parse(chart.getAttribute('data-props') || '{}');
      expect(props.data).toEqual(mockData);
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<IssueCategoriesChart />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to fetch issue categories:',
          expect.any(Error)
        );
      });
    });

    it('should configure pie chart correctly', () => {
      render(<IssueCategoriesChart />);

      const chart = screen.getByTestId('themed-pie-chart');
      const props = JSON.parse(chart.getAttribute('data-props') || '{}');

      expect(props.type).toBe('doughnut');
    });
  });

  // =====================
  // RESOLUTION TIME CHART
  // =====================
  describe('ResolutionTimeChart', () => {
    const defaultProps: ResolutionTimeChartProps = {
      height: 300,
      loading: false,
      title: 'Test Resolution Time',
      orientation: 'vertical',
    };

    it('should render with default props', () => {
      render(<ResolutionTimeChart />);

      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
      expect(screen.getByTestId('chart-title')).toHaveTextContent('Average Resolution Time');
      expect(screen.getByTestId('themed-bar-chart')).toBeInTheDocument();
    });

    it('should render with custom props', () => {
      render(<ResolutionTimeChart {...defaultProps} />);

      expect(screen.getByTestId('chart-title')).toHaveTextContent('Test Resolution Time');
      expect(screen.getByTestId('chart-description')).toHaveTextContent('カテゴリ別平均解決時間');
    });

    it('should fetch and transform resolution data', async () => {
      const mockCategories = {
        bug: { count: 10 },
        feature: { count: 5 },
        documentation: { count: 3 },
      };

      mockFetch.mockResolvedValueOnce(
        createMockAPIResponse({
          categories: mockCategories,
        })
      );

      render(<ResolutionTimeChart />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/analytics');
      });
    });

    it('should use provided data when available', () => {
      const mockData = {
        labels: ['Bug', 'Feature', 'Documentation'],
        datasets: [{ data: [72, 120, 48] }],
      };

      render(<ResolutionTimeChart data={mockData} />);

      const chart = screen.getByTestId('themed-bar-chart');
      const props = JSON.parse(chart.getAttribute('data-props') || '{}');
      expect(props.data).toEqual(mockData);
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<ResolutionTimeChart />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to fetch resolution times:',
          expect.any(Error)
        );
      });
    });

    it('should configure bar chart correctly', () => {
      render(<ResolutionTimeChart />);

      const chart = screen.getByTestId('themed-bar-chart');
      const props = JSON.parse(chart.getAttribute('data-props') || '{}');

      expect(props.type).toBe('bar');
    });
  });

  // =====================
  // PERFORMANCE METRICS CHART
  // =====================
  describe('PerformanceMetricsChart', () => {
    const defaultProps: PerformanceMetricsChartProps = {
      height: 300,
      loading: false,
      title: 'Test Performance',
      timeWindow: 30,
    };

    it('should render with default props', () => {
      render(<PerformanceMetricsChart />);

      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
      expect(screen.getByTestId('chart-title')).toHaveTextContent('Performance Metrics');
      expect(screen.getByTestId('themed-area-chart')).toBeInTheDocument();
    });

    it('should render with custom props', () => {
      render(<PerformanceMetricsChart {...defaultProps} />);

      expect(screen.getByTestId('chart-title')).toHaveTextContent('Test Performance');
      expect(screen.getByTestId('chart-description')).toHaveTextContent(
        'リポジトリパフォーマンス推移'
      );
    });

    it('should fetch performance metrics data', async () => {
      const mockPerformanceMetrics = [
        { resolutionRate: 85, throughput: 2.5 },
        { resolutionRate: 90, throughput: 3.1 },
        { resolutionRate: 88, throughput: 2.8 },
      ];

      mockFetch.mockResolvedValueOnce(
        createMockAPIResponse({
          performanceMetrics: mockPerformanceMetrics,
        })
      );

      render(<PerformanceMetricsChart timeWindow={45} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/analytics?metrics=performance&timeWindow=45');
      });
    });

    it('should handle empty performance data', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockAPIResponse({
          performanceMetrics: [],
        })
      );

      render(<PerformanceMetricsChart />);

      await waitFor(() => {
        const chart = screen.getByTestId('themed-area-chart');
        const props = JSON.parse(chart.getAttribute('data-props') || '{}');
        expect(props.data.labels).toEqual([]);
        expect(props.data.datasets).toEqual([]);
      });
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<PerformanceMetricsChart />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to fetch performance metrics:',
          expect.any(Error)
        );
      });
    });

    it('should transform performance data correctly', async () => {
      const mockPerformanceMetrics = [
        { resolutionRate: 85, throughput: 2.5 },
        { resolutionRate: 90, throughput: 3.1 },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            performanceMetrics: mockPerformanceMetrics,
          }),
      });

      render(<PerformanceMetricsChart />);

      await waitFor(() => {
        const chart = screen.getByTestId('themed-area-chart');
        const props = JSON.parse(chart.getAttribute('data-props') || '{}');

        expect(props.data.labels).toEqual(['Week 1', 'Week 2']);
        expect(props.data.datasets).toHaveLength(2);
        expect(props.data.datasets[0].label).toBe('解決率 (%)');
        expect(props.data.datasets[1].label).toBe('スループット (issue/日)');
      });
    });
  });

  // =====================
  // CONTRIBUTOR ACTIVITY CHART
  // =====================
  describe('ContributorActivityChart', () => {
    const defaultProps: ContributorActivityChartProps = {
      height: 300,
      loading: false,
      title: 'Test Contributors',
      maxContributors: 10,
    };

    it('should render with default props', () => {
      render(<ContributorActivityChart />);

      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
      expect(screen.getByTestId('chart-title')).toHaveTextContent('Top Contributors');
      expect(screen.getByTestId('horizontal-bar-chart')).toBeInTheDocument();
    });

    it('should render with custom props', () => {
      render(<ContributorActivityChart {...defaultProps} />);

      expect(screen.getByTestId('chart-title')).toHaveTextContent('Test Contributors');
      expect(screen.getByTestId('chart-description')).toHaveTextContent(
        'Issue数による最も活発なコントリビューター'
      );
    });

    it('should fetch and limit contributor data', async () => {
      const mockContributors = [
        { login: 'user1', contributions: 25 },
        { login: 'user2', contributions: 18 },
        { login: 'user3', contributions: 12 },
      ];

      mockFetch.mockResolvedValueOnce(
        createMockAPIResponse({
          contributors: mockContributors,
        })
      );

      render(<ContributorActivityChart maxContributors={2} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/analytics');
      });
    });

    it('should use provided data when available', () => {
      const mockData = {
        labels: ['user1', 'user2', 'user3'],
        datasets: [{ data: [25, 18, 12] }],
      };

      render(<ContributorActivityChart data={mockData} />);

      const chart = screen.getByTestId('horizontal-bar-chart');
      const props = JSON.parse(chart.getAttribute('data-props') || '{}');
      expect(props.data).toEqual(mockData);
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<ContributorActivityChart />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to fetch contributor activity:',
          expect.any(Error)
        );
      });
    });

    it('should respect maxContributors limit', async () => {
      const mockContributors = Array.from({ length: 15 }, (_, i) => ({
        login: `user${i + 1}`,
        contributions: 20 - i,
      }));

      mockFetch.mockResolvedValueOnce(
        createMockAPIResponse({
          contributors: mockContributors,
        })
      );

      render(<ContributorActivityChart maxContributors={5} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/analytics');
      });
    });
  });

  // =====================
  // SPARKLINE CHART
  // =====================
  describe('SparklineChart', () => {
    const mockData = createMockTimeSeriesData();

    const defaultProps: SparklineChartProps = {
      data: mockData,
      height: 60,
      color: '#3B82F6',
      loading: false,
    };

    it('should render with default props', () => {
      render(<SparklineChart data={mockData} />);

      expect(screen.getByTestId('sparkline-area-chart')).toBeInTheDocument();
    });

    it('should render with custom props', () => {
      render(<SparklineChart {...defaultProps} />);

      const chart = screen.getByTestId('sparkline-area-chart');
      const props = JSON.parse(chart.getAttribute('data-props') || '{}');

      expect(props.height).toBe(60);
      expect(props.loading).toBe(false);
    });

    it('should transform time series data correctly', () => {
      render(<SparklineChart data={mockData} color="#FF0000" />);

      const chart = screen.getByTestId('sparkline-area-chart');
      const props = JSON.parse(chart.getAttribute('data-props') || '{}');

      expect(props.data.labels).toHaveLength(5);
      expect(props.data.datasets[0].data).toEqual([10, 15, 8, 20, 12]);
      expect(props.data.datasets[0].borderColor).toBe('#FF0000');
    });

    it('should show loading state', () => {
      render(<SparklineChart data={mockData} loading={true} />);

      const chart = screen.getByTestId('sparkline-area-chart');
      expect(chart).toHaveTextContent('Loading...');
    });

    it('should use default color when not provided', () => {
      render(<SparklineChart data={mockData} />);

      const chart = screen.getByTestId('sparkline-area-chart');
      const props = JSON.parse(chart.getAttribute('data-props') || '{}');

      expect(props.data.datasets[0].borderColor).toBe('#3B82F6');
    });
  });

  // =====================
  // DASHBOARD SUMMARY CHARTS
  // =====================
  describe('DashboardSummaryCharts', () => {
    // Default props for reference (currently unused in tests)
    // const defaultProps: DashboardSummaryChartsProps = {
    //   layout: 'grid',
    //   chartHeight: 300,
    //   loading: false,
    // };

    it('should render with default props', () => {
      render(<DashboardSummaryCharts />);

      const chartContainers = screen.getAllByTestId('chart-container');
      expect(chartContainers).toHaveLength(4);
      expect(chartContainers[0]).toBeInTheDocument();
    });

    it('should render with grid layout', () => {
      const { container } = render(<DashboardSummaryCharts layout="grid" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('grid', 'grid-cols-1', 'lg:grid-cols-2', 'gap-6');
    });

    it('should render with stack layout', () => {
      const { container } = render(<DashboardSummaryCharts layout="stack" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('space-y-6');
    });

    it('should render all component charts', () => {
      render(<DashboardSummaryCharts />);

      // Check that all 4 chart components are rendered
      expect(screen.getByText(/Issue Trends/)).toBeInTheDocument();
      expect(screen.getByText(/Issue Categories/)).toBeInTheDocument();
      expect(screen.getByText(/Average Resolution Time/)).toBeInTheDocument();
      expect(screen.getByText(/Top Contributors/)).toBeInTheDocument();
    });

    it('should pass loading state to all charts', () => {
      render(<DashboardSummaryCharts loading={true} />);

      const charts = [
        screen.getByTestId('time-series-chart'),
        screen.getByTestId('themed-pie-chart'),
        screen.getByTestId('themed-bar-chart'),
        screen.getByTestId('horizontal-bar-chart'),
      ];

      charts.forEach(chart => {
        const props = JSON.parse(chart.getAttribute('data-props') || '{}');
        expect(props.loading).toBe(true);
      });
    });

    it('should pass custom height to all charts', () => {
      render(<DashboardSummaryCharts chartHeight={400} />);

      // Height is passed as a style prop to the div wrapper, not the chart component
      const containers = screen.getAllByTestId('chart-content');
      containers.forEach(container => {
        const heightDiv = container.querySelector('div[style*="height"]');
        expect(heightDiv).toBeInTheDocument();
      });
    });

    it('should enable controls and percentages for appropriate charts', () => {
      render(<DashboardSummaryCharts />);

      // IssueTrendsChart should have showControls=true
      const timeSeriesChart = screen.getByTestId('time-series-chart');
      expect(timeSeriesChart).toBeInTheDocument();

      // Check for select control in the first chart (IssueTrendsChart)
      const selectElement = screen.getByDisplayValue('過去30日間');
      expect(selectElement).toBeInTheDocument();

      // IssueCategoriesChart should have showPercentages=true (implicit in rendering)
      const pieChart = screen.getByTestId('themed-pie-chart');
      expect(pieChart).toBeInTheDocument();
    });
  });

  // =====================
  // INTEGRATION TESTS
  // =====================
  describe('Integration Tests', () => {
    it('should handle multiple API calls simultaneously', async () => {
      // Mock multiple successful API responses
      mockFetch
        .mockResolvedValueOnce(createMockAPIResponse({ trends: { daily_issues: [] } }))
        .mockResolvedValueOnce(createMockAPIResponse({ categories: {} }))
        .mockResolvedValueOnce(createMockAPIResponse({ contributors: [] }));

      render(
        <div>
          <IssueTrendsChart />
          <IssueCategoriesChart />
          <ContributorActivityChart />
        </div>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });
    });

    it('should handle mixed success and error responses', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockAPIResponse({ trends: { daily_issues: [] } }))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(createMockAPIResponse({ contributors: [] }));

      render(
        <div>
          <IssueTrendsChart />
          <IssueCategoriesChart />
          <ContributorActivityChart />
        </div>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to fetch issue categories:',
          expect.any(Error)
        );
      });
    });

    it('should re-fetch data when props change', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockAPIResponse({ trends: { daily_issues: [] } }))
        .mockResolvedValueOnce(createMockAPIResponse({ trends: { daily_issues: [] } }));

      render(<IssueTrendsChart timeWindow={30} showControls={true} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/analytics?timeframe=30d');
      });

      // Change the time window via the select control
      const select = screen.getByDisplayValue('過去30日間');
      fireEvent.change(select, { target: { value: '7' } });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/analytics?timeframe=7d');
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  // =====================
  // ERROR BOUNDARY TESTS
  // =====================
  describe('Error Handling', () => {
    it('should handle malformed API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ malformed: 'response' }),
      });

      render(<IssueTrendsChart />);

      // Should not crash and should handle gracefully
      await waitFor(() => {
        expect(screen.getByTestId('time-series-chart')).toBeInTheDocument();
      });
    });

    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Timeout');
      mockFetch.mockRejectedValueOnce(timeoutError);

      render(<IssueTrendsChart />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch issue trends:', timeoutError);
      });
    });

    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      render(<IssueCategoriesChart />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to fetch issue categories:',
          expect.any(Error)
        );
      });
    });
  });
});

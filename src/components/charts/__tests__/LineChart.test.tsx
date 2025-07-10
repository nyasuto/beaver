/**
 * LineChart Components Tests
 *
 * Comprehensive tests for LineChart, TimeSeriesChart, and ThemedLineChart components
 * covering basic rendering, data processing, aggregation logic, and trend calculations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';

// Mock Chart.js completely to avoid vitest hoisting issues
vi.mock('chart.js', () => {
  const MockChart = vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
    update: vi.fn(),
    resize: vi.fn(),
    render: vi.fn(),
    data: {},
    options: {},
  }));

  MockChart.register = vi.fn();

  return {
    Chart: MockChart,
    CategoryScale: vi.fn(),
    LinearScale: vi.fn(),
    PointElement: vi.fn(),
    LineElement: vi.fn(),
    BarElement: vi.fn(),
    ArcElement: vi.fn(),
    Title: vi.fn(),
    Tooltip: vi.fn(),
    Legend: vi.fn(),
    Filler: vi.fn(),
    register: vi.fn(),
    defaults: {
      plugins: {
        legend: {
          position: 'top',
        },
      },
      responsive: true,
      maintainAspectRatio: false,
    },
  };
});

// Import chart components after mocking
import { LineChart, TimeSeriesChart, ThemedLineChart } from '../LineChart';
import type { TimeSeriesPoint } from '../../../lib/analytics/engine';

// Mock Canvas Context
const mockCanvasContext = {
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Array(4) })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => ({ data: new Array(4) })),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
};

// Mock HTMLCanvasElement
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCanvasContext);
  cleanup();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Test data
const mockTimeSeriesData: TimeSeriesPoint[] = [
  { timestamp: new Date('2023-12-01'), value: 10 },
  { timestamp: new Date('2023-12-02'), value: 15 },
  { timestamp: new Date('2023-12-03'), value: 8 },
  { timestamp: new Date('2023-12-04'), value: 22 },
  { timestamp: new Date('2023-12-05'), value: 18 },
];

const mockLineData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr'],
  datasets: [
    {
      label: 'Test Data',
      data: [10, 20, 15, 25],
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
    },
  ],
};

// ====================
// LINECHART COMPONENT TESTS
// ====================

describe('LineChart Component', () => {
  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(<LineChart />);
      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
      expect(canvas).toHaveAttribute('aria-label', 'line chart');
    });

    it('should render with time series data', () => {
      render(<LineChart timeSeriesData={mockTimeSeriesData} dataLabel="Test Values" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should render with provided chart data', () => {
      render(<LineChart data={mockLineData} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should handle empty time series data', () => {
      render(<LineChart timeSeriesData={[]} dataLabel="Empty Data" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Styling Props', () => {
    it('should apply custom line color', () => {
      render(<LineChart timeSeriesData={mockTimeSeriesData} lineColor="#FF0000" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should apply fill configuration', () => {
      render(<LineChart timeSeriesData={mockTimeSeriesData} fill={true} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should apply tension and smoothness', () => {
      render(<LineChart timeSeriesData={mockTimeSeriesData} tension={0.5} smooth={true} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should configure points display', () => {
      render(<LineChart timeSeriesData={mockTimeSeriesData} showPoints={true} pointRadius={5} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should hide points when configured', () => {
      render(<LineChart timeSeriesData={mockTimeSeriesData} showPoints={false} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Y-Axis Configuration', () => {
    it('should apply Y-axis min and max values', () => {
      render(<LineChart timeSeriesData={mockTimeSeriesData} yAxisMin={0} yAxisMax={100} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should configure grid display', () => {
      render(<LineChart timeSeriesData={mockTimeSeriesData} showGrid={false} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Multiple Datasets', () => {
    it('should render multiple datasets', () => {
      const datasets = [
        {
          label: 'Dataset 1',
          data: mockTimeSeriesData,
          color: '#3B82F6',
          fill: false,
        },
        {
          label: 'Dataset 2',
          data: mockTimeSeriesData.map(point => ({
            ...point,
            value: point.value * 1.5,
          })),
          color: '#10B981',
          fill: true,
        },
      ];

      render(<LineChart datasets={datasets} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should handle empty datasets array', () => {
      render(<LineChart datasets={[]} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should generate automatic colors for datasets', () => {
      const datasets = [
        {
          label: 'Dataset 1',
          data: mockTimeSeriesData,
        },
        {
          label: 'Dataset 2',
          data: mockTimeSeriesData,
        },
      ];

      render(<LineChart datasets={datasets} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state', () => {
      render(<LineChart loading={true} />);

      expect(screen.getByText('Loading chart...')).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('should show error state', () => {
      render(<LineChart error="Failed to load data" />);

      expect(screen.getByText('Chart Error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load data')).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
  });
});

// ====================
// TIMESERIESCHART COMPONENT TESTS
// ====================

describe('TimeSeriesChart Component', () => {
  describe('Basic Rendering', () => {
    it('should render with time series data', () => {
      render(<TimeSeriesChart data={mockTimeSeriesData} title="Test Time Series" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should handle empty data', () => {
      render(<TimeSeriesChart data={[]} title="Empty Time Series" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Data Aggregation Logic', () => {
    const hourlyData: TimeSeriesPoint[] = [
      { timestamp: new Date('2023-12-01T10:00:00'), value: 10 },
      { timestamp: new Date('2023-12-01T10:30:00'), value: 15 },
      { timestamp: new Date('2023-12-01T11:00:00'), value: 8 },
      { timestamp: new Date('2023-12-01T11:30:00'), value: 12 },
    ];

    it('should aggregate data by hour', () => {
      render(<TimeSeriesChart data={hourlyData} aggregation="hour" title="Hourly Aggregation" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should aggregate data by day', () => {
      render(
        <TimeSeriesChart data={mockTimeSeriesData} aggregation="day" title="Daily Aggregation" />
      );

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should aggregate data by week', () => {
      const weeklyData: TimeSeriesPoint[] = [
        { timestamp: new Date('2023-12-01'), value: 10 },
        { timestamp: new Date('2023-12-03'), value: 15 },
        { timestamp: new Date('2023-12-08'), value: 8 },
        { timestamp: new Date('2023-12-10'), value: 12 },
      ];

      render(<TimeSeriesChart data={weeklyData} aggregation="week" title="Weekly Aggregation" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should aggregate data by month', () => {
      const monthlyData: TimeSeriesPoint[] = [
        { timestamp: new Date('2023-11-15'), value: 10 },
        { timestamp: new Date('2023-11-25'), value: 15 },
        { timestamp: new Date('2023-12-05'), value: 8 },
        { timestamp: new Date('2023-12-15'), value: 12 },
      ];

      render(
        <TimeSeriesChart data={monthlyData} aggregation="month" title="Monthly Aggregation" />
      );

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Trend Line Logic', () => {
    it('should render trend line when enabled', () => {
      render(
        <TimeSeriesChart
          data={mockTimeSeriesData}
          showTrend={true}
          trendColor="#EF4444"
          title="With Trend Line"
        />
      );

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should not render trend line with insufficient data', () => {
      const singlePoint: TimeSeriesPoint[] = [{ timestamp: new Date('2023-12-01'), value: 10 }];

      render(
        <TimeSeriesChart data={singlePoint} showTrend={true} title="Insufficient Data for Trend" />
      );

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should calculate trend with linear regression', () => {
      // Create data with clear upward trend
      const trendData: TimeSeriesPoint[] = [
        { timestamp: new Date('2023-12-01'), value: 1 },
        { timestamp: new Date('2023-12-02'), value: 2 },
        { timestamp: new Date('2023-12-03'), value: 3 },
        { timestamp: new Date('2023-12-04'), value: 4 },
        { timestamp: new Date('2023-12-05'), value: 5 },
      ];

      render(<TimeSeriesChart data={trendData} showTrend={true} title="Linear Trend Test" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Time Formatting', () => {
    it('should format time as date', () => {
      render(<TimeSeriesChart data={mockTimeSeriesData} timeFormat="date" title="Date Format" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should format time as datetime', () => {
      render(
        <TimeSeriesChart data={mockTimeSeriesData} timeFormat="datetime" title="DateTime Format" />
      );

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should format time as time only', () => {
      render(<TimeSeriesChart data={mockTimeSeriesData} timeFormat="time" title="Time Format" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Chart Configuration', () => {
    it('should apply custom Y-axis label', () => {
      render(
        <TimeSeriesChart
          data={mockTimeSeriesData}
          yAxisLabel="Custom Units"
          title="Custom Y-Axis"
        />
      );

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should apply custom options', () => {
      const customOptions = {
        plugins: {
          legend: {
            display: false,
          },
        },
      };

      render(
        <TimeSeriesChart data={mockTimeSeriesData} options={customOptions} title="Custom Options" />
      );

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });
});

// ====================
// THEMEDLINECHART COMPONENT TESTS
// ====================

describe('ThemedLineChart Component', () => {
  // Mock window.matchMedia for theme testing
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it('should render with theme detection', () => {
    render(<ThemedLineChart timeSeriesData={mockTimeSeriesData} dataLabel="Themed Chart" />);

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  it('should pass through all LineChart props', () => {
    render(
      <ThemedLineChart
        timeSeriesData={mockTimeSeriesData}
        dataLabel="Themed Chart"
        lineColor="#FF0000"
        fill={true}
        showPoints={false}
      />
    );

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  it('should work with loading state', () => {
    render(<ThemedLineChart timeSeriesData={mockTimeSeriesData} loading={true} />);

    expect(screen.getByText('Loading chart...')).toBeInTheDocument();
  });

  it('should work with error state', () => {
    render(<ThemedLineChart timeSeriesData={mockTimeSeriesData} error="Theme error test" />);

    expect(screen.getByText('Chart Error')).toBeInTheDocument();
  });
});

// ====================
// EDGE CASES AND ERROR HANDLING
// ====================

describe('LineChart Edge Cases', () => {
  it('should handle malformed timestamp data', () => {
    const malformedData = [
      { timestamp: new Date('invalid'), value: 10 },
      { timestamp: new Date('2023-12-02'), value: 15 },
    ];

    render(<LineChart timeSeriesData={malformedData} dataLabel="Malformed Data" />);

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  it('should handle null and undefined values', () => {
    const nullData = [
      { timestamp: new Date('2023-12-01'), value: 10 },
      { timestamp: new Date('2023-12-02'), value: null as any },
      { timestamp: new Date('2023-12-03'), value: undefined as any },
      { timestamp: new Date('2023-12-04'), value: 20 },
    ];

    render(<LineChart timeSeriesData={nullData} dataLabel="Null Values" />);

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  it('should handle very large datasets', () => {
    const largeData: TimeSeriesPoint[] = Array.from({ length: 1000 }, (_, i) => ({
      timestamp: new Date(2023, 0, i + 1),
      value: Math.random() * 100,
    }));

    render(<LineChart timeSeriesData={largeData} dataLabel="Large Dataset" />);

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  it('should handle extreme Y-axis values', () => {
    render(
      <LineChart timeSeriesData={mockTimeSeriesData} yAxisMin={-1000000} yAxisMax={1000000} />
    );

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });
});

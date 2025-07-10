/**
 * Chart Components Tests
 *
 * Simplified tests to verify chart components render correctly,
 * handle basic functionality, and maintain component structure.
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
import { BaseChart, ChartContainer } from '../BaseChart';
import { Chart, createChart, PRESET_CHARTS } from '../index';
import {
  convertTimeSeriesData,
  convertCategoryData,
  convertPieData,
  CHART_COLORS,
} from '../../../lib/utils/chart';

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

const mockBarData = {
  labels: ['Category A', 'Category B', 'Category C'],
  datasets: [
    {
      label: 'Count',
      data: [15, 25, 10],
      backgroundColor: ['#3B82F6', '#10B981', '#F59E0B'],
    },
  ],
};

const mockPieData = {
  labels: ['Open', 'Closed', 'In Progress'],
  datasets: [
    {
      data: [30, 50, 20],
      backgroundColor: ['#3B82F6', '#10B981', '#F59E0B'],
    },
  ],
};

// ====================
// BASIC COMPONENT TESTS
// ====================

describe('BaseChart Component', () => {
  describe('Basic Rendering', () => {
    it('should render a line chart without errors', () => {
      render(<BaseChart type="line" data={mockLineData} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
      expect(canvas).toHaveAttribute('aria-label', 'line chart');
    });

    it('should render a bar chart without errors', () => {
      render(<BaseChart type="bar" data={mockBarData} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
      expect(canvas).toHaveAttribute('aria-label', 'bar chart');
    });

    it('should render a pie chart without errors', () => {
      render(<BaseChart type="pie" data={mockPieData} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
      expect(canvas).toHaveAttribute('aria-label', 'pie chart');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <BaseChart type="line" data={mockLineData} className="custom-chart-class" />
      );

      const chartContainer = container.querySelector('.chart-container');
      expect(chartContainer).toHaveClass('custom-chart-class');
    });

    it('should apply custom dimensions', () => {
      const { container } = render(
        <BaseChart type="line" data={mockLineData} width={400} height={300} />
      );

      const chartContainer = container.querySelector('.chart-container');
      expect(chartContainer).toHaveStyle({ width: '400px', height: '300px' });
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading is true', () => {
      render(<BaseChart type="line" data={mockLineData} loading={true} />);

      expect(screen.getByText('Loading chart...')).toBeInTheDocument();
      expect(screen.getByText('Loading chart...')).toHaveClass('text-gray-600');

      // Canvas should not be rendered when loading
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('should apply loading className', () => {
      const { container } = render(
        <BaseChart type="line" data={mockLineData} loading={true} className="test-loading" />
      );

      const loadingDiv = container.querySelector('.chart-loading');
      expect(loadingDiv).toHaveClass('test-loading');
    });
  });

  describe('Error State', () => {
    it('should show error message when error prop is provided', () => {
      const errorMessage = 'Failed to load chart data';
      render(<BaseChart type="line" data={mockLineData} error={errorMessage} />);

      expect(screen.getByText('Chart Error')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();

      // Canvas should not be rendered when there's an error
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('should apply error className', () => {
      const { container } = render(
        <BaseChart type="line" data={mockLineData} error="Test error" className="test-error" />
      );

      const errorDiv = container.querySelector('.chart-error');
      expect(errorDiv).toHaveClass('test-error');
    });

    it('should show error icon in error state', () => {
      render(<BaseChart type="line" data={mockLineData} error="Test error" />);

      const errorIcon = screen.getByText('Chart Error').previousElementSibling;
      expect(errorIcon).toBeInTheDocument();
      expect(errorIcon?.tagName).toBe('svg');
    });
  });
});

describe('ChartContainer Component', () => {
  it('should render children correctly', () => {
    render(
      <ChartContainer>
        <div data-testid="chart-content">Test Chart Content</div>
      </ChartContainer>
    );

    expect(screen.getByTestId('chart-content')).toBeInTheDocument();
    expect(screen.getByText('Test Chart Content')).toBeInTheDocument();
  });

  it('should render title when provided', () => {
    render(
      <ChartContainer title="Test Chart Title">
        <div>Chart content</div>
      </ChartContainer>
    );

    expect(screen.getByText('Test Chart Title')).toBeInTheDocument();
    expect(screen.getByText('Test Chart Title').tagName).toBe('H3');
  });

  it('should render description when provided', () => {
    render(
      <ChartContainer title="Chart Title" description="This is a test chart description">
        <div>Chart content</div>
      </ChartContainer>
    );

    expect(screen.getByText('This is a test chart description')).toBeInTheDocument();
  });

  it('should render actions when provided', () => {
    const actions = <button data-testid="chart-action">Download</button>;

    render(
      <ChartContainer title="Chart Title" actions={actions}>
        <div>Chart content</div>
      </ChartContainer>
    );

    expect(screen.getByTestId('chart-action')).toBeInTheDocument();
    expect(screen.getByText('Download')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ChartContainer className="custom-container-class">
        <div>Chart content</div>
      </ChartContainer>
    );

    const containerDiv = container.querySelector('.chart-container');
    expect(containerDiv).toHaveClass('custom-container-class');
  });

  it('should not render header when no title, description, or actions', () => {
    const { container } = render(
      <ChartContainer>
        <div>Chart content</div>
      </ChartContainer>
    );

    const headerDiv = container.querySelector('.border-b');
    expect(headerDiv).not.toBeInTheDocument();
  });
});

// ====================
// UTILITY FUNCTION TESTS
// ====================

describe('Chart Utilities', () => {
  describe('convertTimeSeriesData', () => {
    it('should convert time series data correctly', () => {
      const mockData = [
        { timestamp: new Date('2023-12-01'), value: 10 },
        { timestamp: new Date('2023-12-02'), value: 15 },
        { timestamp: new Date('2023-12-03'), value: 8 },
      ];

      const result = convertTimeSeriesData(mockData, 'Test Data', CHART_COLORS[0]);

      expect(result.labels).toHaveLength(3);
      expect(result.datasets).toHaveLength(1);
      expect(result.datasets[0].label).toBe('Test Data');
      expect(result.datasets[0].data).toEqual([10, 15, 8]);
    });

    it('should handle empty data gracefully', () => {
      const result = convertTimeSeriesData([], 'Empty Data');

      expect(result.labels).toHaveLength(0);
      expect(result.datasets).toHaveLength(1);
      expect(result.datasets[0].data).toHaveLength(0);
    });
  });

  describe('convertCategoryData', () => {
    it('should convert category data correctly', () => {
      const mockData = {
        Bug: 15,
        Feature: 12,
        Enhancement: 8,
      };

      const result = convertCategoryData(mockData, 'Issues by Category');

      expect(result.labels).toEqual(['Bug', 'Feature', 'Enhancement']);
      expect(result.datasets[0].data).toEqual([15, 12, 8]);
      expect(result.datasets[0].label).toBe('Issues by Category');
    });

    it('should handle empty categories', () => {
      const result = convertCategoryData({}, 'Empty Categories');

      expect(result.labels).toHaveLength(0);
      expect(result.datasets[0].data).toHaveLength(0);
    });
  });

  describe('convertPieData', () => {
    it('should convert pie chart data correctly', () => {
      const mockData = {
        Resolved: 75,
        Open: 25,
      };

      const result = convertPieData(mockData);

      expect(result.labels).toEqual(['Resolved', 'Open']);
      expect(result.datasets[0].data).toEqual([75, 25]);
      expect(result.datasets[0].backgroundColor).toHaveLength(2);
    });

    it('should apply colors correctly', () => {
      const mockData = { A: 50, B: 30, C: 20 };
      const customColors = ['#FF0000', '#00FF00', '#0000FF'];

      const result = convertPieData(mockData, customColors);

      expect(result.datasets[0].backgroundColor).toEqual([
        '#FF000080', // 50% opacity added
        '#00FF0080',
        '#0000FF80',
      ]);
    });
  });
});

// ====================
// FACTORY FUNCTION TESTS
// ====================

describe('Chart Factory Functions', () => {
  describe('createChart function', () => {
    it('should create line chart configuration', () => {
      const result = createChart('line', { smooth: true });

      expect(result.component).toBe('ThemedLineChart');
      expect(result.props).toEqual(
        expect.objectContaining({
          smooth: true,
        })
      );
    });

    it('should create bar chart configuration', () => {
      const result = createChart('bar', { horizontal: true });

      expect(result.component).toBe('ThemedBarChart');
      expect(result.props).toEqual(
        expect.objectContaining({
          horizontal: true,
        })
      );
    });

    it('should create pie chart configuration', () => {
      const result = createChart('pie', { showLegend: false });

      expect(result.component).toBe('ThemedPieChart');
      expect(result.props).toEqual(
        expect.objectContaining({
          showLegend: false,
        })
      );
    });

    it('should fallback to line chart for unknown type', () => {
      const result = createChart('unknown' as any);

      expect(result.component).toBe('ThemedLineChart');
    });
  });

  describe('Chart factory component', () => {
    it('should render appropriate chart based on type', () => {
      render(<Chart type="line" data={mockLineData} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
      expect(canvas).toHaveAttribute('aria-label', 'line chart');
    });

    it('should pass through props correctly', () => {
      render(<Chart type="bar" data={mockBarData} loading={false} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('PRESET_CHARTS configurations', () => {
    it('should have all required preset configurations', () => {
      expect(PRESET_CHARTS.issuesTrend).toEqual({
        type: 'line',
        smooth: true,
        showPoints: true,
        fill: true,
        fillOpacity: 0.2,
      });

      expect(PRESET_CHARTS.issuesByCategory).toEqual({
        type: 'pie',
        showPercentages: true,
        showLegend: true,
        legendPosition: 'right',
      });

      expect(PRESET_CHARTS.performanceMetrics).toEqual({
        type: 'area',
        stacked: true,
        showGrid: true,
        smooth: true,
      });
    });

    it('should provide sparkline configuration', () => {
      expect(PRESET_CHARTS.sparkline).toEqual({
        type: 'area',
        height: 60,
        hideAxes: true,
        hideLegend: true,
        showPoints: false,
      });
    });
  });
});

describe('Chart Color Constants', () => {
  it('should have predefined chart colors', () => {
    expect(CHART_COLORS).toBeDefined();
    expect(Array.isArray(CHART_COLORS)).toBe(true);
    expect(CHART_COLORS.length).toBeGreaterThan(0);

    // Check that colors are valid hex values
    CHART_COLORS.forEach(color => {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});

describe('Chart Error Handling', () => {
  it('should handle empty data gracefully', () => {
    const emptyData = {
      labels: [],
      datasets: [],
    };

    render(<BaseChart type="line" data={emptyData} />);

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  it('should prioritize loading state over error state', () => {
    render(<BaseChart type="line" data={mockLineData} loading={true} error="Test error" />);

    // Loading should be shown instead of error
    expect(screen.getByText('Loading chart...')).toBeInTheDocument();
    expect(screen.queryByText('Chart Error')).not.toBeInTheDocument();
  });
});

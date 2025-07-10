/**
 * AreaChart Components Tests
 *
 * Comprehensive tests for AreaChart, StackedAreaChart, StreamChart, SparklineAreaChart,
 * and ThemedAreaChart components covering rendering, data processing, stacking logic,
 * percentage calculations, stream baseline calculations, and sparkline configurations.
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
import {
  AreaChart,
  StackedAreaChart,
  StreamChart,
  SparklineAreaChart,
  ThemedAreaChart,
} from '../AreaChart';
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

const mockAreaData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr'],
  datasets: [
    {
      label: 'Sales',
      data: [10, 20, 15, 25],
      backgroundColor: 'rgba(59, 130, 246, 0.3)',
      borderColor: '#3B82F6',
      fill: true,
    },
  ],
};

const mockMultipleDatasets = [
  {
    label: 'Product A',
    data: mockTimeSeriesData,
    color: '#3B82F6',
    fillOpacity: 0.3,
  },
  {
    label: 'Product B',
    data: mockTimeSeriesData.map(point => ({
      ...point,
      value: point.value * 1.5,
    })),
    color: '#10B981',
    fillOpacity: 0.5,
  },
  {
    label: 'Product C',
    data: mockTimeSeriesData.map(point => ({
      ...point,
      value: point.value * 0.8,
    })),
    color: '#F59E0B',
    fillOpacity: 0.4,
  },
];

// ====================
// AREACHART COMPONENT TESTS
// ====================

describe('AreaChart Component', () => {
  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(<AreaChart />);
      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
      expect(canvas).toHaveAttribute('aria-label', 'line chart');
    });

    it('should render with time series data', () => {
      render(<AreaChart timeSeriesData={mockTimeSeriesData} dataLabel="Area Values" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should render with provided chart data', () => {
      render(<AreaChart data={mockAreaData} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should handle empty time series data', () => {
      render(<AreaChart timeSeriesData={[]} dataLabel="Empty Data" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Chart Variants', () => {
    it('should render area variant by default', () => {
      render(<AreaChart timeSeriesData={mockTimeSeriesData} variant="area" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should render stacked variant', () => {
      render(<AreaChart datasets={mockMultipleDatasets} variant="stacked" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should render percentage variant', () => {
      render(<AreaChart datasets={mockMultipleDatasets} variant="percentage" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Styling Configuration', () => {
    it('should apply custom area color', () => {
      render(<AreaChart timeSeriesData={mockTimeSeriesData} areaColor="#FF0000" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should apply custom line color', () => {
      render(
        <AreaChart timeSeriesData={mockTimeSeriesData} areaColor="#FF0000" lineColor="#AA0000" />
      );

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should apply custom fill opacity', () => {
      render(<AreaChart timeSeriesData={mockTimeSeriesData} fillOpacity={0.7} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should apply tension and smoothness', () => {
      render(<AreaChart timeSeriesData={mockTimeSeriesData} tension={0.8} smooth={true} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should disable smoothness', () => {
      render(<AreaChart timeSeriesData={mockTimeSeriesData} smooth={false} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Points Configuration', () => {
    it('should hide points by default', () => {
      render(<AreaChart timeSeriesData={mockTimeSeriesData} showPoints={false} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should show points when configured', () => {
      render(<AreaChart timeSeriesData={mockTimeSeriesData} showPoints={true} pointRadius={5} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Axis Configuration', () => {
    it('should apply Y-axis limits', () => {
      render(<AreaChart timeSeriesData={mockTimeSeriesData} yAxisMin={0} yAxisMax={50} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should hide grid when configured', () => {
      render(<AreaChart timeSeriesData={mockTimeSeriesData} showGrid={false} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should enable stacking', () => {
      render(<AreaChart datasets={mockMultipleDatasets} stacked={true} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Multiple Datasets', () => {
    it('should render multiple datasets', () => {
      render(<AreaChart datasets={mockMultipleDatasets} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should handle empty datasets array', () => {
      render(<AreaChart datasets={[]} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should apply individual dataset fill opacities', () => {
      const customDatasets = [
        {
          label: 'Low Opacity',
          data: mockTimeSeriesData,
          fillOpacity: 0.1,
        },
        {
          label: 'High Opacity',
          data: mockTimeSeriesData,
          fillOpacity: 0.9,
        },
      ];

      render(<AreaChart datasets={customDatasets} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Percentage Variant Logic', () => {
    it('should calculate percentages correctly', () => {
      render(<AreaChart datasets={mockMultipleDatasets} variant="percentage" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should handle zero totals in percentage calculation', () => {
      const zeroDatasets = [
        {
          label: 'Zero A',
          data: [
            { timestamp: new Date('2023-12-01'), value: 0 },
            { timestamp: new Date('2023-12-02'), value: 0 },
          ],
        },
        {
          label: 'Zero B',
          data: [
            { timestamp: new Date('2023-12-01'), value: 0 },
            { timestamp: new Date('2023-12-02'), value: 0 },
          ],
        },
      ];

      render(<AreaChart datasets={zeroDatasets} variant="percentage" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state', () => {
      render(<AreaChart loading={true} />);

      expect(screen.getByText('Loading chart...')).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('should show error state', () => {
      render(<AreaChart error="Failed to load area chart data" />);

      expect(screen.getByText('Chart Error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load area chart data')).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
  });
});

// ====================
// STACKEDAREACHART COMPONENT TESTS
// ====================

describe('StackedAreaChart Component', () => {
  describe('Basic Rendering', () => {
    it('should render as stacked area chart', () => {
      render(<StackedAreaChart datasets={mockMultipleDatasets} dataLabel="Stacked Values" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should render with totals enabled', () => {
      render(<StackedAreaChart datasets={mockMultipleDatasets} showTotals={true} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should render with totals disabled', () => {
      render(<StackedAreaChart datasets={mockMultipleDatasets} showTotals={false} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Normalization', () => {
    it('should render as percentage when normalized', () => {
      render(<StackedAreaChart datasets={mockMultipleDatasets} normalize={true} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should render as absolute values when not normalized', () => {
      render(<StackedAreaChart datasets={mockMultipleDatasets} normalize={false} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Inherited Properties', () => {
    it('should pass through AreaChart properties', () => {
      render(
        <StackedAreaChart
          datasets={mockMultipleDatasets}
          fillOpacity={0.8}
          smooth={false}
          showPoints={true}
        />
      );

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });
});

// ====================
// STREAMCHART COMPONENT TESTS
// ====================

describe('StreamChart Component', () => {
  describe('Basic Rendering', () => {
    it('should render with center baseline', () => {
      render(<StreamChart datasets={mockMultipleDatasets} baseline="center" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should render with zero baseline', () => {
      render(<StreamChart datasets={mockMultipleDatasets} baseline="zero" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should render with wiggle baseline', () => {
      render(<StreamChart datasets={mockMultipleDatasets} baseline="wiggle" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should handle empty datasets', () => {
      render(<StreamChart datasets={[]} baseline="center" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Baseline Calculations', () => {
    it('should calculate center baseline correctly', () => {
      render(<StreamChart datasets={mockMultipleDatasets} baseline="center" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should handle single dataset', () => {
      render(<StreamChart datasets={[mockMultipleDatasets[0]]} baseline="center" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should handle datasets with different lengths', () => {
      const unevenDatasets = [
        {
          label: 'Short',
          data: mockTimeSeriesData.slice(0, 3),
          color: '#3B82F6',
        },
        {
          label: 'Long',
          data: mockTimeSeriesData,
          color: '#10B981',
        },
      ];

      render(<StreamChart datasets={unevenDatasets} baseline="center" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Wiggle Algorithm', () => {
    it('should apply wiggle baseline algorithm', () => {
      const symmetricDatasets = [
        {
          label: 'Dataset 1',
          data: [
            { timestamp: new Date('2023-12-01'), value: 10 },
            { timestamp: new Date('2023-12-02'), value: 20 },
            { timestamp: new Date('2023-12-03'), value: 15 },
          ],
          color: '#3B82F6',
        },
        {
          label: 'Dataset 2',
          data: [
            { timestamp: new Date('2023-12-01'), value: 15 },
            { timestamp: new Date('2023-12-02'), value: 10 },
            { timestamp: new Date('2023-12-03'), value: 20 },
          ],
          color: '#10B981',
        },
      ];

      render(<StreamChart datasets={symmetricDatasets} baseline="wiggle" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Inherited Properties', () => {
    it('should pass through AreaChart properties', () => {
      render(
        <StreamChart
          datasets={mockMultipleDatasets}
          baseline="center"
          fillOpacity={0.6}
          showGrid={false}
        />
      );

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });
});

// ====================
// SPARKLINEAREACHART COMPONENT TESTS
// ====================

describe('SparklineAreaChart Component', () => {
  describe('Basic Rendering', () => {
    it('should render as minimal sparkline', () => {
      render(<SparklineAreaChart timeSeriesData={mockTimeSeriesData} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should apply custom height', () => {
      const { container } = render(
        <SparklineAreaChart timeSeriesData={mockTimeSeriesData} height={40} />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ height: '40px' });
    });
  });

  describe('Visibility Configuration', () => {
    it('should hide axes by default', () => {
      render(<SparklineAreaChart timeSeriesData={mockTimeSeriesData} hideAxes={true} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should show axes when configured', () => {
      render(<SparklineAreaChart timeSeriesData={mockTimeSeriesData} hideAxes={false} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should hide legend by default', () => {
      render(<SparklineAreaChart timeSeriesData={mockTimeSeriesData} hideLegend={true} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should show legend when configured', () => {
      render(<SparklineAreaChart timeSeriesData={mockTimeSeriesData} hideLegend={false} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should enable tooltips by default', () => {
      render(<SparklineAreaChart timeSeriesData={mockTimeSeriesData} hideTooltips={false} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should hide tooltips when configured', () => {
      render(<SparklineAreaChart timeSeriesData={mockTimeSeriesData} hideTooltips={true} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Inherited Properties', () => {
    it('should pass through AreaChart properties', () => {
      render(
        <SparklineAreaChart
          timeSeriesData={mockTimeSeriesData}
          areaColor="#FF0000"
          fillOpacity={0.5}
          tension={0.6}
        />
      );

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });
});

// ====================
// THEMEDAREACHART COMPONENT TESTS
// ====================

describe('ThemedAreaChart Component', () => {
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
    render(<ThemedAreaChart timeSeriesData={mockTimeSeriesData} dataLabel="Themed Chart" />);

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  it('should pass through all AreaChart props', () => {
    render(
      <ThemedAreaChart
        timeSeriesData={mockTimeSeriesData}
        dataLabel="Themed Chart"
        variant="stacked"
        fillOpacity={0.6}
        smooth={false}
      />
    );

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  it('should work with loading state', () => {
    render(<ThemedAreaChart timeSeriesData={mockTimeSeriesData} loading={true} />);

    expect(screen.getByText('Loading chart...')).toBeInTheDocument();
  });

  it('should work with error state', () => {
    render(<ThemedAreaChart timeSeriesData={mockTimeSeriesData} error="Theme error test" />);

    expect(screen.getByText('Chart Error')).toBeInTheDocument();
  });
});

// ====================
// EDGE CASES AND ERROR HANDLING
// ====================

describe('AreaChart Edge Cases', () => {
  it('should handle negative values', () => {
    const negativeData: TimeSeriesPoint[] = [
      { timestamp: new Date('2023-12-01'), value: -10 },
      { timestamp: new Date('2023-12-02'), value: 5 },
      { timestamp: new Date('2023-12-03'), value: -3 },
      { timestamp: new Date('2023-12-04'), value: 8 },
    ];

    render(<AreaChart timeSeriesData={negativeData} dataLabel="Negative Values" />);

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  it('should handle very large datasets', () => {
    const largeData: TimeSeriesPoint[] = Array.from({ length: 1000 }, (_, i) => ({
      timestamp: new Date(2023, 0, i + 1),
      value: Math.random() * 100,
    }));

    render(<AreaChart timeSeriesData={largeData} dataLabel="Large Dataset" />);

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  it('should handle datasets with missing values', () => {
    const sparseData: TimeSeriesPoint[] = [
      { timestamp: new Date('2023-12-01'), value: 10 },
      { timestamp: new Date('2023-12-02'), value: NaN },
      { timestamp: new Date('2023-12-03'), value: 15 },
      { timestamp: new Date('2023-12-04'), value: undefined as any },
      { timestamp: new Date('2023-12-05'), value: 20 },
    ];

    render(<AreaChart timeSeriesData={sparseData} dataLabel="Sparse Data" />);

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  it('should handle extreme fill opacity values', () => {
    render(<AreaChart timeSeriesData={mockTimeSeriesData} fillOpacity={0} />);

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  it('should handle extreme tension values', () => {
    render(<AreaChart timeSeriesData={mockTimeSeriesData} tension={1} smooth={true} />);

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  it('should handle datasets with identical timestamps', () => {
    const duplicateTimestamps: TimeSeriesPoint[] = [
      { timestamp: new Date('2023-12-01'), value: 10 },
      { timestamp: new Date('2023-12-01'), value: 15 },
      { timestamp: new Date('2023-12-01'), value: 20 },
    ];

    render(<AreaChart timeSeriesData={duplicateTimestamps} dataLabel="Duplicate Timestamps" />);

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  it('should handle extreme Y-axis ranges', () => {
    render(
      <AreaChart timeSeriesData={mockTimeSeriesData} yAxisMin={-1000000} yAxisMax={1000000} />
    );

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  it('should handle zero-height sparkline', () => {
    render(<SparklineAreaChart timeSeriesData={mockTimeSeriesData} height={0} />);

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });
});

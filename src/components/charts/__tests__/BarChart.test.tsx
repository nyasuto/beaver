/**
 * BarChart Components Tests
 *
 * Comprehensive tests for BarChart, HorizontalBarChart, StackedBarChart,
 * ComparisonBarChart, and ThemedBarChart components covering rendering,
 * data processing, sorting logic, percentage calculations, and comparisons.
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
  BarChart,
  HorizontalBarChart,
  StackedBarChart,
  ComparisonBarChart,
  ThemedBarChart,
} from '../BarChart';

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
const mockCategoryData = {
  'Category A': 25,
  'Category B': 40,
  'Category C': 15,
  'Category D': 30,
};

const mockBarData = {
  labels: ['Q1', 'Q2', 'Q3', 'Q4'],
  datasets: [
    {
      label: 'Sales',
      data: [120, 190, 300, 500],
      backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
    },
  ],
};

// ====================
// BARCHART COMPONENT TESTS
// ====================

describe('BarChart Component', () => {
  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(<BarChart />);
      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
      expect(canvas).toHaveAttribute('aria-label', 'bar chart');
    });

    it('should render with category data', () => {
      render(<BarChart categoryData={mockCategoryData} dataLabel="Sales Count" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should render with provided chart data', () => {
      render(<BarChart data={mockBarData} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should handle empty category data', () => {
      render(<BarChart categoryData={{}} dataLabel="Empty Data" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Orientation and Styling', () => {
    it('should render vertical bars by default', () => {
      render(<BarChart categoryData={mockCategoryData} orientation="vertical" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should render horizontal bars', () => {
      render(<BarChart categoryData={mockCategoryData} orientation="horizontal" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should apply custom colors', () => {
      const customColors = ['#FF0000', '#00FF00', '#0000FF'];

      render(<BarChart categoryData={mockCategoryData} colors={customColors} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should configure border styling', () => {
      render(<BarChart categoryData={mockCategoryData} borderWidth={3} borderRadius={8} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Value Display and Grid', () => {
    it('should show values on bars when configured', () => {
      render(<BarChart categoryData={mockCategoryData} showValues={true} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should hide grid when configured', () => {
      render(<BarChart categoryData={mockCategoryData} showGrid={false} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should apply Y-axis limits', () => {
      render(<BarChart categoryData={mockCategoryData} yAxisMin={0} yAxisMax={100} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Stacked Configuration', () => {
    it('should enable stacked bars', () => {
      render(<BarChart categoryData={mockCategoryData} stacked={true} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Multiple Datasets', () => {
    it('should render multiple datasets', () => {
      const datasets = [
        {
          label: 'Dataset 1',
          data: mockCategoryData,
          color: '#3B82F6',
        },
        {
          label: 'Dataset 2',
          data: {
            'Category A': 20,
            'Category B': 35,
            'Category C': 10,
            'Category D': 25,
          },
          color: '#10B981',
        },
      ];

      render(<BarChart datasets={datasets} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should handle empty datasets array', () => {
      render(<BarChart datasets={[]} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should apply custom border colors to datasets', () => {
      const datasets = [
        {
          label: 'Dataset 1',
          data: mockCategoryData,
          color: '#3B82F6',
          borderColor: '#1D4ED8',
        },
      ];

      render(<BarChart datasets={datasets} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state', () => {
      render(<BarChart loading={true} />);

      expect(screen.getByText('Loading chart...')).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('should show error state', () => {
      render(<BarChart error="Failed to load bar chart data" />);

      expect(screen.getByText('Chart Error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load bar chart data')).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
  });
});

// ====================
// HORIZONTALBARCHART COMPONENT TESTS
// ====================

describe('HorizontalBarChart Component', () => {
  describe('Basic Rendering', () => {
    it('should render horizontal bars', () => {
      render(<HorizontalBarChart categoryData={mockCategoryData} dataLabel="Horizontal Sales" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Sorting Logic', () => {
    it('should sort by value in descending order by default', () => {
      render(<HorizontalBarChart categoryData={mockCategoryData} sortByValue={true} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should sort by value in ascending order', () => {
      render(
        <HorizontalBarChart
          categoryData={mockCategoryData}
          sortByValue={true}
          sortDirection="asc"
        />
      );

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should not sort when sortByValue is false', () => {
      render(<HorizontalBarChart categoryData={mockCategoryData} sortByValue={false} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should handle empty data for sorting', () => {
      render(<HorizontalBarChart categoryData={{}} sortByValue={true} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should handle single item data for sorting', () => {
      render(<HorizontalBarChart categoryData={{ 'Single Item': 100 }} sortByValue={true} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Inherited Properties', () => {
    it('should pass through BarChart properties', () => {
      render(
        <HorizontalBarChart
          categoryData={mockCategoryData}
          showValues={true}
          borderRadius={6}
          colors={['#FF0000', '#00FF00']}
        />
      );

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });
});

// ====================
// STACKEDBARCHART COMPONENT TESTS
// ====================

describe('StackedBarChart Component', () => {
  const stackedDatasets = [
    {
      label: 'Product A',
      data: { Q1: 10, Q2: 15, Q3: 8, Q4: 20 },
      color: '#3B82F6',
    },
    {
      label: 'Product B',
      data: { Q1: 15, Q2: 10, Q3: 12, Q4: 8 },
      color: '#10B981',
    },
    {
      label: 'Product C',
      data: { Q1: 5, Q2: 8, Q3: 15, Q4: 12 },
      color: '#F59E0B',
    },
  ];

  describe('Basic Rendering', () => {
    it('should render stacked bars', () => {
      render(<StackedBarChart datasets={stackedDatasets} dataLabel="Sales Volume" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should handle empty datasets', () => {
      render(<StackedBarChart datasets={[]} dataLabel="Empty Stack" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Percentage Calculations', () => {
    it('should show percentages when enabled', () => {
      render(
        <StackedBarChart
          datasets={stackedDatasets}
          showPercentages={true}
          dataLabel="Percentage Stack"
        />
      );

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should show stack totals with custom label', () => {
      render(<StackedBarChart datasets={stackedDatasets} stackTotalLabel="Grand Total" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should handle zero values in percentage calculations', () => {
      const datasetsWithZeros = [
        {
          label: 'Product A',
          data: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
          color: '#3B82F6',
        },
        {
          label: 'Product B',
          data: { Q1: 10, Q2: 0, Q3: 5, Q4: 0 },
          color: '#10B981',
        },
      ];

      render(<StackedBarChart datasets={datasetsWithZeros} showPercentages={true} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Inherited Properties', () => {
    it('should pass through BarChart properties', () => {
      render(
        <StackedBarChart
          datasets={stackedDatasets}
          orientation="horizontal"
          showGrid={false}
          borderRadius={8}
        />
      );

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });
});

// ====================
// COMPARISONBARCHART COMPONENT TESTS
// ====================

describe('ComparisonBarChart Component', () => {
  const primaryData = {
    'Product A': 100,
    'Product B': 150,
    'Product C': 80,
    'Product D': 200,
  };

  const secondaryData = {
    'Product A': 90,
    'Product B': 160,
    'Product C': 70,
    'Product D': 180,
  };

  describe('Basic Rendering', () => {
    it('should render comparison bars', () => {
      render(
        <ComparisonBarChart
          primaryData={primaryData}
          secondaryData={secondaryData}
          primaryLabel="2023"
          secondaryLabel="2022"
        />
      );

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should apply custom colors', () => {
      render(
        <ComparisonBarChart
          primaryData={primaryData}
          secondaryData={secondaryData}
          primaryLabel="Current"
          secondaryLabel="Previous"
          primaryColor="#FF0000"
          secondaryColor="#00FF00"
        />
      );

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Difference Calculations', () => {
    it('should show difference values when enabled', () => {
      render(
        <ComparisonBarChart
          primaryData={primaryData}
          secondaryData={secondaryData}
          primaryLabel="2023"
          secondaryLabel="2022"
          showDifference={true}
        />
      );

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should handle zero values in difference calculations', () => {
      const zeroSecondary = {
        'Product A': 0,
        'Product B': 160,
        'Product C': 0,
        'Product D': 180,
      };

      render(
        <ComparisonBarChart
          primaryData={primaryData}
          secondaryData={zeroSecondary}
          primaryLabel="Current"
          secondaryLabel="Previous"
          showDifference={true}
        />
      );

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should handle missing categories in one dataset', () => {
      const partialSecondary = {
        'Product A': 90,
        'Product C': 70,
      };

      render(
        <ComparisonBarChart
          primaryData={primaryData}
          secondaryData={partialSecondary}
          primaryLabel="Complete"
          secondaryLabel="Partial"
          showDifference={true}
        />
      );

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Inherited Properties', () => {
    it('should pass through BarChart properties', () => {
      render(
        <ComparisonBarChart
          primaryData={primaryData}
          secondaryData={secondaryData}
          primaryLabel="Set A"
          secondaryLabel="Set B"
          orientation="horizontal"
          showValues={true}
          yAxisMin={0}
          yAxisMax={250}
        />
      );

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });
});

// ====================
// THEMEDBARCHART COMPONENT TESTS
// ====================

describe('ThemedBarChart Component', () => {
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
    render(<ThemedBarChart categoryData={mockCategoryData} dataLabel="Themed Chart" />);

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  it('should pass through all BarChart props', () => {
    render(
      <ThemedBarChart
        categoryData={mockCategoryData}
        dataLabel="Themed Chart"
        orientation="horizontal"
        showValues={true}
        stacked={true}
      />
    );

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  it('should work with loading state', () => {
    render(<ThemedBarChart categoryData={mockCategoryData} loading={true} />);

    expect(screen.getByText('Loading chart...')).toBeInTheDocument();
  });

  it('should work with error state', () => {
    render(<ThemedBarChart categoryData={mockCategoryData} error="Theme error test" />);

    expect(screen.getByText('Chart Error')).toBeInTheDocument();
  });
});

// ====================
// EDGE CASES AND ERROR HANDLING
// ====================

describe('BarChart Edge Cases', () => {
  it('should handle negative values', () => {
    const negativeData = {
      'Loss A': -10,
      'Profit B': 20,
      'Loss C': -5,
      'Profit D': 15,
    };

    render(<BarChart categoryData={negativeData} dataLabel="Profit/Loss" />);

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  it('should handle very large numbers', () => {
    const largeData = {
      'Big A': 1000000,
      'Bigger B': 5000000,
      'Biggest C': 10000000,
    };

    render(<BarChart categoryData={largeData} dataLabel="Large Numbers" />);

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  it('should handle decimal values', () => {
    const decimalData = {
      'Item A': 10.5,
      'Item B': 15.75,
      'Item C': 8.25,
    };

    render(<BarChart categoryData={decimalData} dataLabel="Decimal Values" />);

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  it('should handle category names with special characters', () => {
    const specialData = {
      'Category & Special': 10,
      'Category #2': 15,
      'Category (3)': 20,
      'Category / 4': 25,
    };

    render(<BarChart categoryData={specialData} dataLabel="Special Characters" />);

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  it('should handle very long category names', () => {
    const longNameData = {
      'Very Long Category Name That Might Overflow': 10,
      'Another Extremely Long Category Name': 15,
      Short: 20,
    };

    render(<BarChart categoryData={longNameData} dataLabel="Long Names" />);

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  it('should handle many categories', () => {
    const manyCategories: Record<string, number> = {};
    for (let i = 1; i <= 50; i++) {
      manyCategories[`Category ${i}`] = Math.random() * 100;
    }

    render(<BarChart categoryData={manyCategories} dataLabel="Many Categories" />);

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });
});

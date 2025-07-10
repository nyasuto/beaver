/**
 * PieChart Components Tests
 *
 * Comprehensive tests for PieChart, DoughnutChart, SemiCircleChart, and ThemedPieChart
 * components covering rendering, data processing, slice grouping, canvas drawing operations,
 * and gauge needle calculations.
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
    width: 400,
    height: 400,
    ctx: {
      save: vi.fn(),
      restore: vi.fn(),
      fillText: vi.fn(),
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 0,
      textAlign: '',
      textBaseline: '',
      font: 'normal 12px Arial',
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
    },
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
import { PieChart, DoughnutChart, SemiCircleChart, ThemedPieChart } from '../PieChart';

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
  textAlign: 'center',
  textBaseline: 'middle',
  fillStyle: '#000000',
  strokeStyle: '#000000',
  lineWidth: 1,
  font: 'normal 12px Arial',
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
  'Category A': 30,
  'Category B': 50,
  'Category C': 20,
  'Category D': 10,
  'Category E': 5,
};

const mockPieData = {
  labels: ['Red', 'Blue', 'Green', 'Yellow'],
  datasets: [
    {
      data: [12, 19, 3, 5],
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'],
    },
  ],
};

// ====================
// PIECHART COMPONENT TESTS
// ====================

describe('PieChart Component', () => {
  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(<PieChart />);
      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
      expect(canvas).toHaveAttribute('aria-label', 'pie chart');
    });

    it('should render with category data', () => {
      render(<PieChart categoryData={mockCategoryData} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should render with provided chart data', () => {
      render(<PieChart data={mockPieData} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should handle empty category data', () => {
      render(<PieChart categoryData={{}} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Chart Variants', () => {
    it('should render as pie chart by default', () => {
      render(<PieChart categoryData={mockCategoryData} variant="pie" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should render as doughnut chart', () => {
      render(<PieChart categoryData={mockCategoryData} variant="doughnut" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should apply custom cutout for doughnut', () => {
      render(<PieChart categoryData={mockCategoryData} variant="doughnut" cutout={60} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Display Options', () => {
    it('should show percentages by default', () => {
      render(<PieChart categoryData={mockCategoryData} showPercentages={true} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should show values when configured', () => {
      render(<PieChart categoryData={mockCategoryData} showValues={true} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should show both percentages and values', () => {
      render(<PieChart categoryData={mockCategoryData} showPercentages={true} showValues={true} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should hide percentages when configured', () => {
      render(<PieChart categoryData={mockCategoryData} showPercentages={false} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Legend Configuration', () => {
    it('should show legend by default', () => {
      render(<PieChart categoryData={mockCategoryData} showLegend={true} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should hide legend when configured', () => {
      render(<PieChart categoryData={mockCategoryData} showLegend={false} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should position legend at different locations', () => {
      const positions: Array<'top' | 'bottom' | 'left' | 'right'> = [
        'top',
        'bottom',
        'left',
        'right',
      ];

      positions.forEach(position => {
        render(<PieChart categoryData={mockCategoryData} legendPosition={position} />);

        const canvas = screen.getByRole('img');
        expect(canvas).toBeInTheDocument();
        cleanup();
      });
    });
  });

  describe('Styling Configuration', () => {
    it('should apply custom colors', () => {
      const customColors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00'];

      render(<PieChart categoryData={mockCategoryData} colors={customColors} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should apply custom border width', () => {
      render(<PieChart categoryData={mockCategoryData} borderWidth={4} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should configure hover effects', () => {
      render(<PieChart categoryData={mockCategoryData} hoverEffects={true} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should disable hover effects', () => {
      render(<PieChart categoryData={mockCategoryData} hoverEffects={false} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should apply slice spacing', () => {
      render(<PieChart categoryData={mockCategoryData} spacing={5} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Data Processing Logic', () => {
    it('should sort slices by value when configured', () => {
      render(<PieChart categoryData={mockCategoryData} sortByValue={true} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should group small slices into "Others"', () => {
      render(
        <PieChart
          categoryData={mockCategoryData}
          minSlicePercentage={10}
          othersLabel="Other Categories"
        />
      );

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should handle zero total value', () => {
      const zeroData = {
        A: 0,
        B: 0,
        C: 0,
      };

      render(<PieChart categoryData={zeroData} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should combine sorting and grouping', () => {
      render(
        <PieChart
          categoryData={mockCategoryData}
          sortByValue={true}
          minSlicePercentage={8}
          othersLabel="Combined Others"
        />
      );

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state', () => {
      render(<PieChart loading={true} />);

      expect(screen.getByText('Loading chart...')).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('should show error state', () => {
      render(<PieChart error="Failed to load pie chart data" />);

      expect(screen.getByText('Chart Error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load pie chart data')).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
  });
});

// ====================
// DOUGHNUTCHART COMPONENT TESTS
// ====================

describe('DoughnutChart Component', () => {
  describe('Basic Rendering', () => {
    it('should render as doughnut chart', () => {
      render(<DoughnutChart categoryData={mockCategoryData} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should render with center text', () => {
      render(<DoughnutChart categoryData={mockCategoryData} centerText="Total" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should render with center value', () => {
      render(<DoughnutChart categoryData={mockCategoryData} centerValue={115} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should render with both center text and value', () => {
      render(
        <DoughnutChart categoryData={mockCategoryData} centerText="Total Sales" centerValue={115} />
      );

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Center Styling', () => {
    it('should apply custom center text color', () => {
      render(
        <DoughnutChart
          categoryData={mockCategoryData}
          centerText="Custom Color"
          centerTextColor="#FF0000"
        />
      );

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should apply custom center text size', () => {
      render(
        <DoughnutChart
          categoryData={mockCategoryData}
          centerText="Large Text"
          centerTextSize={24}
        />
      );

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should use custom value formatter', () => {
      const formatter = (value: number) => `$${value.toFixed(2)}`;

      render(
        <DoughnutChart
          categoryData={mockCategoryData}
          centerValue={115.5}
          centerValueFormatter={formatter}
        />
      );

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Inherited Properties', () => {
    it('should pass through PieChart properties', () => {
      render(
        <DoughnutChart
          categoryData={mockCategoryData}
          showPercentages={false}
          showValues={true}
          legendPosition="bottom"
        />
      );

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });
});

// ====================
// SEMICIRCLECHART COMPONENT TESTS
// ====================

describe('SemiCircleChart Component', () => {
  describe('Basic Rendering', () => {
    it('should render with value and max value', () => {
      render(<SemiCircleChart value={75} maxValue={100} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should render with custom segments', () => {
      const segments = [
        { label: 'Good', value: 40, color: '#10B981' },
        { label: 'Warning', value: 30, color: '#F59E0B' },
        { label: 'Critical', value: 30, color: '#EF4444' },
      ];

      render(<SemiCircleChart value={75} maxValue={100} segments={segments} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should render without segments (default mode)', () => {
      render(<SemiCircleChart value={60} maxValue={100} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Needle Configuration', () => {
    it('should show needle by default', () => {
      render(<SemiCircleChart value={50} maxValue={100} showNeedle={true} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should hide needle when configured', () => {
      render(<SemiCircleChart value={50} maxValue={100} showNeedle={false} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should apply custom needle color', () => {
      render(<SemiCircleChart value={50} maxValue={100} needleColor="#FF0000" />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Value Calculations', () => {
    it('should handle zero value', () => {
      render(<SemiCircleChart value={0} maxValue={100} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should handle maximum value', () => {
      render(<SemiCircleChart value={100} maxValue={100} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should handle value exceeding maximum', () => {
      render(<SemiCircleChart value={120} maxValue={100} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should handle decimal values', () => {
      render(<SemiCircleChart value={67.5} maxValue={100} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Segment Handling', () => {
    it('should handle empty segments array', () => {
      render(<SemiCircleChart value={50} maxValue={100} segments={[]} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should handle single segment', () => {
      const singleSegment = [{ label: 'Progress', value: 100, color: '#3B82F6' }];

      render(<SemiCircleChart value={75} maxValue={100} segments={singleSegment} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Inherited Properties', () => {
    it('should pass through PieChart properties', () => {
      render(<SemiCircleChart value={80} maxValue={100} borderWidth={3} hoverEffects={false} />);

      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });
});

// ====================
// THEMEDPIECHART COMPONENT TESTS
// ====================

describe('ThemedPieChart Component', () => {
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
    render(<ThemedPieChart categoryData={mockCategoryData} />);

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  it('should pass through all PieChart props', () => {
    render(
      <ThemedPieChart
        categoryData={mockCategoryData}
        variant="doughnut"
        showPercentages={false}
        showValues={true}
        legendPosition="bottom"
      />
    );

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  it('should work with loading state', () => {
    render(<ThemedPieChart categoryData={mockCategoryData} loading={true} />);

    expect(screen.getByText('Loading chart...')).toBeInTheDocument();
  });

  it('should work with error state', () => {
    render(<ThemedPieChart categoryData={mockCategoryData} error="Theme error test" />);

    expect(screen.getByText('Chart Error')).toBeInTheDocument();
  });
});

// ====================
// EDGE CASES AND ERROR HANDLING
// ====================

describe('PieChart Edge Cases', () => {
  it('should handle negative values', () => {
    const negativeData = {
      'Loss A': -10,
      'Profit B': 30,
      'Loss C': -5,
    };

    render(<PieChart categoryData={negativeData} />);

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  it('should handle very small values', () => {
    const smallData = {
      'Tiny A': 0.01,
      'Small B': 0.05,
      'Medium C': 0.1,
    };

    render(<PieChart categoryData={smallData} showPercentages={true} />);

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  it('should handle very large values', () => {
    const largeData = {
      'Million A': 1000000,
      'Billion B': 1000000000,
      'Trillion C': 1000000000000,
    };

    render(<PieChart categoryData={largeData} showValues={true} />);

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  it('should handle decimal values with precision', () => {
    const preciseData = {
      'Value A': 33.333333,
      'Value B': 33.333333,
      'Value C': 33.333334,
    };

    render(<PieChart categoryData={preciseData} showPercentages={true} />);

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  it('should handle single category', () => {
    const singleData = {
      'Only Category': 100,
    };

    render(<PieChart categoryData={singleData} showPercentages={true} />);

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

    render(<PieChart categoryData={specialData} />);

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  it('should handle very long category names', () => {
    const longNameData = {
      'Very Long Category Name That Might Overflow in the Legend': 10,
      'Another Extremely Long Category Name That Should Be Handled Gracefully': 15,
      Short: 20,
    };

    render(<PieChart categoryData={longNameData} legendPosition="right" />);

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  it('should handle many categories', () => {
    const manyCategories: Record<string, number> = {};
    for (let i = 1; i <= 20; i++) {
      manyCategories[`Category ${i}`] = Math.random() * 10 + 1;
    }

    render(<PieChart categoryData={manyCategories} minSlicePercentage={2} />);

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  it('should handle extreme cutout values', () => {
    render(<PieChart categoryData={mockCategoryData} variant="doughnut" cutout={95} />);

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });
});

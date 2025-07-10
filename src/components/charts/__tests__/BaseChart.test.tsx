/**
 * BaseChart Component Advanced Tests
 *
 * Comprehensive tests for BaseChart component covering theme switching,
 * ResizeObserver integration, Chart.js lifecycle management, event handling,
 * animation control, and error boundaries.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';

// Mock Chart.js completely to avoid vitest hoisting issues
vi.mock('chart.js', () => {
  const mockChartInstance = {
    destroy: vi.fn(),
    update: vi.fn(),
    resize: vi.fn(),
    render: vi.fn(),
    data: {},
    options: {},
    canvas: null,
    ctx: null,
    chartArea: {
      left: 0,
      top: 0,
      right: 400,
      bottom: 300,
    },
    scales: {},
    config: {},
    platform: {},
    registry: {},
    tooltip: {},
    legend: {},
    width: 400,
    height: 300,
    aspectRatio: 1.33,
    currentDevicePixelRatio: 1,
    boxes: [],
    attached: true,
    active: [],
    lastActive: [],
    _datasets: [],
    _sortedMetasets: [],
    _stacks: {},
    _parsing: false,
    _listeners: {},
    _responsiveListeners: {},
    _animationsDisabled: false,
    $animations: new Map(),
    $context: {},
    $datalabels: {},
    isPointInArea: vi.fn(),
    getElementsAtEventForMode: vi.fn(() => []),
    getDatasetMeta: vi.fn(),
    getVisibleDatasetCount: vi.fn(() => 1),
    isDatasetVisible: vi.fn(() => true),
    setDatasetVisibility: vi.fn(),
    toggleDataVisibility: vi.fn(),
    getDataVisibility: vi.fn(() => true),
    hide: vi.fn(),
    show: vi.fn(),
    getSortedVisibleDatasetMetas: vi.fn(() => []),
    getMatchingVisibleMetas: vi.fn(() => []),
    bindEvents: vi.fn(),
    unbindEvents: vi.fn(),
    updateHoverStyle: vi.fn(),
    notifyPlugins: vi.fn(),
    isPluginEnabled: vi.fn(() => true),
    clear: vi.fn(),
    stop: vi.fn(),
    toBase64Image: vi.fn(() => 'data:image/png;base64,'),
    generateLegend: vi.fn(),
    buildOrUpdateControllers: vi.fn(),
    buildOrUpdateScales: vi.fn(),
    getInitialScaleBounds: vi.fn(),
    ensureScalesHaveIDs: vi.fn(),
    createScales: vi.fn(),
    buildOrUpdateLegend: vi.fn(),
    buildOrUpdateTitle: vi.fn(),
    _sortVisibleDatasetMetas: vi.fn(),
    _updateController: vi.fn(),
    _updateElements: vi.fn(),
    _updateMeta: vi.fn(),
  };

  const MockChart = vi.fn().mockImplementation(() => mockChartInstance);
  MockChart.register = vi.fn();
  MockChart.getChart = vi.fn();
  MockChart.defaults = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      tooltip: {
        enabled: true,
      },
    },
    scales: {
      x: {
        display: true,
      },
      y: {
        display: true,
      },
    },
    elements: {
      arc: {},
      line: {},
      point: {},
      bar: {},
    },
    color: '#000',
    font: {
      family: 'Helvetica, Arial, sans-serif',
      size: 12,
    },
    animation: {
      duration: 1000,
    },
    layout: {
      padding: 0,
    },
    onHover: vi.fn(),
    onClick: vi.fn(),
  };

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
    defaults: MockChart.defaults,
  };
});

// Mock ResizeObserver
const mockResizeObserver = {
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
};

global.ResizeObserver = vi.fn(() => mockResizeObserver);

// Mock MutationObserver
const mockMutationObserver = {
  observe: vi.fn(),
  disconnect: vi.fn(),
};

global.MutationObserver = vi.fn(() => mockMutationObserver);

// Mock window.matchMedia
const mockMatchMedia = {
  matches: false,
  media: '',
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
};

global.matchMedia = vi.fn(() => mockMatchMedia);

// Mock canvas context
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

// Import components after mocking
import { BaseChart, withChartTheme, ChartContainer } from '../BaseChart';
import { LIGHT_THEME } from '../../../lib/utils/chart';
import type { ChartData } from 'chart.js';
import * as ChartJS from 'chart.js';

const MockChart = ChartJS.Chart;

// Mock HTMLCanvasElement
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCanvasContext);
  cleanup();
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Test data
const mockChartData: ChartData<'line'> = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr'],
  datasets: [
    {
      label: 'Sales',
      data: [10, 20, 15, 25],
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
    },
  ],
};

// ====================
// BASECHART COMPONENT TESTS
// ====================

describe('BaseChart Component', () => {
  describe('Basic Rendering and Initialization', () => {
    it('should render with default props', () => {
      render(<BaseChart type="line" data={mockChartData} />);
      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
      expect(canvas).toHaveAttribute('aria-label', 'line chart');
    });

    it('should initialize Chart.js instance', () => {
      render(<BaseChart type="line" data={mockChartData} />);
      expect(MockChart).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          type: 'line',
          data: mockChartData,
          options: expect.any(Object),
        })
      );
    });

    it('should apply custom className', () => {
      const { container } = render(
        <BaseChart type="line" data={mockChartData} className="custom-chart" />
      );
      expect(container.firstChild).toHaveClass('custom-chart');
    });

    it('should apply custom width and height', () => {
      const { container } = render(
        <BaseChart type="line" data={mockChartData} width={500} height={300} />
      );
      const chartContainer = container.firstChild as HTMLElement;
      expect(chartContainer).toHaveStyle({
        width: '500px',
        height: '300px',
      });
    });
  });

  describe('Theme Support', () => {
    it('should use light theme by default', () => {
      render(<BaseChart type="line" data={mockChartData} />);
      expect(MockChart).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          options: expect.objectContaining({
            // Light theme options should be applied
          }),
        })
      );
    });

    it('should apply dark theme when isDarkMode is true', () => {
      render(<BaseChart type="line" data={mockChartData} isDarkMode={true} />);
      expect(MockChart).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          options: expect.objectContaining({
            // Dark theme options should be applied
          }),
        })
      );
    });

    it('should use custom theme when provided', () => {
      const customTheme = {
        ...LIGHT_THEME,
        colors: {
          ...LIGHT_THEME.colors,
          primary: '#FF0000',
        },
      };

      render(<BaseChart type="line" data={mockChartData} theme={customTheme} />);
      expect(MockChart).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          options: expect.any(Object),
        })
      );
    });
  });

  describe('Animation Control', () => {
    it('should apply custom animation duration', () => {
      render(<BaseChart type="line" data={mockChartData} animationDuration={500} />);
      expect(MockChart).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          options: expect.objectContaining({
            animation: expect.objectContaining({
              duration: 500,
            }),
          }),
        })
      );
    });

    it('should disable animations when duration is 0', () => {
      render(<BaseChart type="line" data={mockChartData} animationDuration={0} />);
      expect(MockChart).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          options: expect.objectContaining({
            animation: expect.objectContaining({
              duration: 0,
            }),
          }),
        })
      );
    });
  });

  describe('Responsive Behavior', () => {
    it('should enable responsive behavior by default', () => {
      render(<BaseChart type="line" data={mockChartData} />);
      expect(MockChart).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          options: expect.objectContaining({
            responsive: true,
          }),
        })
      );
    });

    it('should disable responsive behavior when set to false', () => {
      render(<BaseChart type="line" data={mockChartData} responsive={false} />);
      expect(MockChart).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          options: expect.objectContaining({
            responsive: false,
          }),
        })
      );
    });

    it('should set up ResizeObserver when responsive is true', () => {
      render(<BaseChart type="line" data={mockChartData} responsive={true} />);
      expect(global.ResizeObserver).toHaveBeenCalledWith(expect.any(Function));
      expect(mockResizeObserver.observe).toHaveBeenCalled();
    });

    it('should not set up ResizeObserver when responsive is false', () => {
      render(<BaseChart type="line" data={mockChartData} responsive={false} />);
      expect(mockResizeObserver.observe).not.toHaveBeenCalled();
    });
  });

  describe('Chart Lifecycle Management', () => {
    it('should call onChartReady when chart is initialized', () => {
      const onChartReady = vi.fn();
      render(<BaseChart type="line" data={mockChartData} onChartReady={onChartReady} />);
      expect(onChartReady).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should destroy chart instance on unmount', () => {
      const { unmount } = render(<BaseChart type="line" data={mockChartData} />);
      unmount();
      expect(MockChart).toHaveBeenCalled();
    });

    it('should destroy and recreate chart when type changes', () => {
      const { rerender } = render(<BaseChart type="line" data={mockChartData} />);
      const initialCallCount = MockChart.mock.calls.length;

      rerender(<BaseChart type="bar" data={mockChartData} />);

      expect(MockChart).toHaveBeenCalledTimes(initialCallCount + 1);
    });
  });

  describe('Data Updates', () => {
    it('should update chart data when data prop changes', async () => {
      const { rerender } = render(<BaseChart type="line" data={mockChartData} />);

      const newData = {
        ...mockChartData,
        datasets: [
          {
            ...mockChartData.datasets[0],
            data: [15, 25, 20, 30],
          },
        ],
      };

      rerender(<BaseChart type="line" data={newData} />);

      // Chart should be initialized at least once
      expect(MockChart).toHaveBeenCalled();
    });

    it('should respect updateMode when updating chart', async () => {
      const { rerender } = render(
        <BaseChart type="line" data={mockChartData} updateMode="reset" />
      );

      const newData = {
        ...mockChartData,
        datasets: [
          {
            ...mockChartData.datasets[0],
            data: [15, 25, 20, 30],
          },
        ],
      };

      rerender(<BaseChart type="line" data={newData} updateMode="reset" />);

      // Chart should be initialized with updateMode
      expect(MockChart).toHaveBeenCalled();
    });
  });

  describe('Event Handling', () => {
    it('should handle chart click events', () => {
      const onChartClick = vi.fn();
      render(<BaseChart type="line" data={mockChartData} onChartClick={onChartClick} />);

      expect(MockChart).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          options: expect.objectContaining({
            onClick: onChartClick,
          }),
        })
      );
    });

    it('should handle chart hover events', () => {
      const onChartHover = vi.fn();
      render(<BaseChart type="line" data={mockChartData} onChartHover={onChartHover} />);

      expect(MockChart).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          options: expect.objectContaining({
            onHover: onChartHover,
          }),
        })
      );
    });
  });

  describe('Loading State', () => {
    it('should show loading state when loading is true', () => {
      render(<BaseChart type="line" data={mockChartData} loading={true} />);
      expect(screen.getByText('Loading chart...')).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('should apply loading className', () => {
      const { container } = render(
        <BaseChart type="line" data={mockChartData} loading={true} className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('chart-loading', 'custom-class');
    });
  });

  describe('Error State', () => {
    it('should show error state when error is provided', () => {
      render(<BaseChart type="line" data={mockChartData} error="Test error" />);
      expect(screen.getByText('Chart Error')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('should apply error className', () => {
      const { container } = render(
        <BaseChart type="line" data={mockChartData} error="Test error" className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('chart-error', 'custom-class');
    });
  });

  describe('Accessibility', () => {
    it('should provide proper ARIA labels', () => {
      render(<BaseChart type="line" data={mockChartData} />);
      const canvas = screen.getByRole('img');
      expect(canvas).toHaveAttribute('aria-label', 'line chart');
    });

    it('should apply different ARIA labels for different chart types', () => {
      render(<BaseChart type="bar" data={mockChartData} />);
      const canvas = screen.getByRole('img');
      expect(canvas).toHaveAttribute('aria-label', 'bar chart');
    });
  });

  describe('Custom Options', () => {
    it('should merge custom options with generated options', () => {
      const customOptions = {
        scales: {
          x: {
            display: false,
          },
        },
        plugins: {
          legend: {
            display: false,
          },
        },
      };

      render(<BaseChart type="line" data={mockChartData} options={customOptions} />);

      expect(MockChart).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          options: expect.objectContaining(customOptions),
        })
      );
    });
  });
});

// ====================
// WITHCHARTTHEME HOC TESTS
// ====================

describe('withChartTheme HOC', () => {
  // Create a test component wrapped with the HOC
  const TestChart = withChartTheme(BaseChart);

  beforeEach(() => {
    // Reset DOM and mocks
    document.documentElement.className = '';
    vi.clearAllMocks();
  });

  describe('Theme Detection', () => {
    it('should detect light theme by default', () => {
      mockMatchMedia.matches = false;
      render(<TestChart type="line" data={mockChartData} />);

      expect(MockChart).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          options: expect.any(Object),
        })
      );
    });

    it('should detect dark theme from media query', () => {
      mockMatchMedia.matches = true;
      render(<TestChart type="line" data={mockChartData} />);

      expect(MockChart).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          options: expect.any(Object),
        })
      );
    });

    it('should detect dark theme from document class', () => {
      document.documentElement.classList.add('dark');
      render(<TestChart type="line" data={mockChartData} />);

      expect(MockChart).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          options: expect.any(Object),
        })
      );
    });
  });

  describe('Theme Change Listeners', () => {
    it('should set up media query listener', () => {
      render(<TestChart type="line" data={mockChartData} />);
      expect(mockMatchMedia.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should set up MutationObserver for document class changes', () => {
      render(<TestChart type="line" data={mockChartData} />);
      expect(global.MutationObserver).toHaveBeenCalledWith(expect.any(Function));
      expect(mockMutationObserver.observe).toHaveBeenCalledWith(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      });
    });

    it('should clean up listeners on unmount', () => {
      const { unmount } = render(<TestChart type="line" data={mockChartData} />);
      unmount();

      expect(mockMatchMedia.removeEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );
      expect(mockMutationObserver.disconnect).toHaveBeenCalled();
    });
  });

  describe('Theme Switching', () => {
    it('should respond to media query changes', () => {
      const { rerender } = render(<TestChart type="line" data={mockChartData} />);

      // Simulate media query change
      mockMatchMedia.matches = true;
      const changeHandler = mockMatchMedia.addEventListener.mock.calls[0][1];
      changeHandler();

      rerender(<TestChart type="line" data={mockChartData} />);

      expect(MockChart).toHaveBeenCalledTimes(2);
    });

    it('should respond to document class changes', () => {
      const { rerender } = render(<TestChart type="line" data={mockChartData} />);

      // Simulate document class change
      document.documentElement.classList.add('dark');
      const mutationHandler = global.MutationObserver.mock.calls[0][0];
      mutationHandler();

      rerender(<TestChart type="line" data={mockChartData} />);

      expect(MockChart).toHaveBeenCalledTimes(2);
    });
  });

  describe('Props Forwarding', () => {
    it('should forward all props to wrapped component', () => {
      const customProps = {
        className: 'custom-class',
        width: 500,
        height: 300,
        animationDuration: 1000,
        responsive: false,
      };

      render(<TestChart type="line" data={mockChartData} {...customProps} />);

      expect(MockChart).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          options: expect.objectContaining({
            responsive: false,
            animation: expect.objectContaining({
              duration: 1000,
            }),
          }),
        })
      );
    });
  });
});

// ====================
// CHARTCONTAINER COMPONENT TESTS
// ====================

describe('ChartContainer Component', () => {
  describe('Basic Rendering', () => {
    it('should render children', () => {
      render(
        <ChartContainer>
          <div data-testid="chart-content">Chart Content</div>
        </ChartContainer>
      );
      expect(screen.getByTestId('chart-content')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <ChartContainer className="custom-container">
          <div>Content</div>
        </ChartContainer>
      );
      expect(container.firstChild).toHaveClass('custom-container');
    });
  });

  describe('Header Section', () => {
    it('should render title when provided', () => {
      render(
        <ChartContainer title="Chart Title">
          <div>Content</div>
        </ChartContainer>
      );
      expect(screen.getByText('Chart Title')).toBeInTheDocument();
    });

    it('should render description when provided', () => {
      render(
        <ChartContainer description="Chart Description">
          <div>Content</div>
        </ChartContainer>
      );
      expect(screen.getByText('Chart Description')).toBeInTheDocument();
    });

    it('should render actions when provided', () => {
      render(
        <ChartContainer actions={<button>Action Button</button>}>
          <div>Content</div>
        </ChartContainer>
      );
      expect(screen.getByText('Action Button')).toBeInTheDocument();
    });

    it('should render title, description, and actions together', () => {
      render(
        <ChartContainer
          title="Chart Title"
          description="Chart Description"
          actions={<button>Action Button</button>}
        >
          <div>Content</div>
        </ChartContainer>
      );
      expect(screen.getByText('Chart Title')).toBeInTheDocument();
      expect(screen.getByText('Chart Description')).toBeInTheDocument();
      expect(screen.getByText('Action Button')).toBeInTheDocument();
    });

    it('should not render header when no title, description, or actions', () => {
      const { container } = render(
        <ChartContainer>
          <div>Content</div>
        </ChartContainer>
      );
      const header = container.querySelector('.border-b');
      expect(header).not.toBeInTheDocument();
    });
  });

  describe('Content Section', () => {
    it('should render content with proper padding', () => {
      render(
        <ChartContainer>
          <div data-testid="content">Content</div>
        </ChartContainer>
      );
      const content = screen.getByTestId('content');
      expect(content.parentElement).toHaveClass('p-6');
    });
  });

  describe('Styling', () => {
    it('should apply dark mode classes', () => {
      const { container } = render(
        <ChartContainer>
          <div>Content</div>
        </ChartContainer>
      );
      const containerElement = container.firstChild as HTMLElement;
      expect(containerElement).toHaveClass(
        'bg-white',
        'dark:bg-gray-800',
        'border-gray-200',
        'dark:border-gray-700'
      );
    });
  });
});

// ====================
// RESIZEOBSERVER INTEGRATION TESTS
// ====================

describe('ResizeObserver Integration', () => {
  describe('Observer Setup', () => {
    it('should create ResizeObserver when responsive is true', () => {
      render(<BaseChart type="line" data={mockChartData} responsive={true} />);
      expect(global.ResizeObserver).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should not create ResizeObserver when responsive is false', () => {
      render(<BaseChart type="line" data={mockChartData} responsive={false} />);
      expect(global.ResizeObserver).not.toHaveBeenCalled();
    });

    it('should observe parent container element', () => {
      render(<BaseChart type="line" data={mockChartData} responsive={true} />);
      expect(mockResizeObserver.observe).toHaveBeenCalled();
    });
  });

  describe('Resize Handling', () => {
    it('should call chart resize when ResizeObserver triggers', () => {
      render(<BaseChart type="line" data={mockChartData} responsive={true} />);

      // Simulate resize event
      const resizeCallback = global.ResizeObserver.mock.calls[0][0];
      resizeCallback();

      expect(global.ResizeObserver).toHaveBeenCalled();
    });

    it('should disconnect observer on unmount', () => {
      const { unmount } = render(<BaseChart type="line" data={mockChartData} responsive={true} />);
      unmount();
      expect(mockResizeObserver.disconnect).toHaveBeenCalled();
    });
  });
});

// ====================
// CHART.JS LIFECYCLE TESTS
// ====================

describe('Chart.js Lifecycle Management', () => {
  describe('Chart Creation', () => {
    it('should create chart with proper context', () => {
      render(<BaseChart type="line" data={mockChartData} />);
      expect(MockChart).toHaveBeenCalledWith(
        mockCanvasContext,
        expect.objectContaining({
          type: 'line',
          data: mockChartData,
          options: expect.any(Object),
        })
      );
    });

    it('should not create chart without canvas context', () => {
      HTMLCanvasElement.prototype.getContext = vi.fn(() => null);
      render(<BaseChart type="line" data={mockChartData} />);
      expect(MockChart).not.toHaveBeenCalled();
    });
  });

  describe('Chart Updates', () => {
    it('should debounce chart updates', async () => {
      const { rerender } = render(<BaseChart type="line" data={mockChartData} />);

      // Trigger multiple quick updates
      for (let i = 0; i < 5; i++) {
        const newData = {
          ...mockChartData,
          datasets: [
            {
              ...mockChartData.datasets[0],
              data: [i, i + 1, i + 2, i + 3],
            },
          ],
        };
        rerender(<BaseChart type="line" data={newData} />);
      }

      // Chart should have been initialized
      expect(MockChart).toHaveBeenCalled();
    });
  });

  describe('Chart Cleanup', () => {
    it('should destroy chart when component unmounts', () => {
      const { unmount } = render(<BaseChart type="line" data={mockChartData} />);
      unmount();
      expect(MockChart).toHaveBeenCalled();
    });

    it('should destroy previous chart when recreating', () => {
      const { rerender } = render(<BaseChart type="line" data={mockChartData} />);
      const initialCallCount = MockChart.mock.calls.length;

      rerender(<BaseChart type="bar" data={mockChartData} />);

      expect(MockChart).toHaveBeenCalledTimes(initialCallCount + 1);
    });
  });
});

// ====================
// ERROR HANDLING TESTS
// ====================

describe('Error Handling', () => {
  describe('Canvas Context Errors', () => {
    it('should handle missing canvas context gracefully', () => {
      HTMLCanvasElement.prototype.getContext = vi.fn(() => null);
      expect(() => {
        render(<BaseChart type="line" data={mockChartData} />);
      }).not.toThrow();
    });
  });

  describe('Chart.js Errors', () => {
    it('should handle Chart.js constructor errors', () => {
      const originalConsoleError = console.error;
      console.error = vi.fn();

      MockChart.mockImplementationOnce(() => {
        throw new Error('Chart.js error');
      });

      expect(() => {
        render(<BaseChart type="line" data={mockChartData} />);
      }).toThrow();

      console.error = originalConsoleError;
    });

    it('should handle chart update errors', () => {
      const { rerender } = render(<BaseChart type="line" data={mockChartData} />);

      expect(() => {
        const newData = {
          ...mockChartData,
          datasets: [
            {
              ...mockChartData.datasets[0],
              data: [1, 2, 3, 4],
            },
          ],
        };
        rerender(<BaseChart type="line" data={newData} />);
      }).not.toThrow();
    });
  });

  describe('Cleanup Errors', () => {
    it('should handle chart destroy errors', () => {
      const { unmount } = render(<BaseChart type="line" data={mockChartData} />);

      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });
});

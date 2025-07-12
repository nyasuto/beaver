/**
 * @jest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { BaseChart, ChartContainer, withChartTheme } from '../BaseChart';
import type { SafeChartData, SafeChartOptions } from '../types/safe-chart';

// Mock Chart.js
vi.mock('chart.js', () => {
  const Chart = vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
    update: vi.fn(),
    resize: vi.fn(),
    data: {},
    options: {},
  }));

  (Chart as any).register = vi.fn();

  return {
    Chart,
    CategoryScale: {},
    LinearScale: {},
    PointElement: {},
    LineElement: {},
    BarElement: {},
    ArcElement: {},
    Title: {},
    Tooltip: {},
    Legend: {},
    Filler: {},
    BarController: {},
    DoughnutController: {},
    PieController: {},
    LineController: {},
    register: vi.fn(),
  };
});

// Mock chart utilities
vi.mock('../../lib/utils/chart', () => ({
  LIGHT_THEME: { colors: { primary: '#3b82f6' } },
  DARK_THEME: { colors: { primary: '#60a5fa' } },
  debounce: vi.fn(fn => fn),
}));

// Mock safe wrapper
const mockChart = {
  destroy: vi.fn(),
  update: vi.fn(),
  resize: vi.fn(),
  data: {},
  options: {},
};

vi.mock('../utils/safe-wrapper', () => ({
  createSafeChart: vi.fn().mockImplementation(({ onReady }) => {
    setTimeout(() => onReady?.(mockChart), 0);
    return { success: true };
  }),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(callback => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

describe('BaseChart', () => {
  const mockData: SafeChartData<'line'> = {
    labels: ['Jan', 'Feb', 'Mar'],
    datasets: [
      {
        label: 'Test Data',
        data: [10, 20, 30],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
      },
    ],
  };

  const mockOptions: SafeChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders chart canvas with correct attributes', () => {
    render(<BaseChart type="line" data={mockData} options={mockOptions} />);

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute('aria-label', 'line chart');
  });

  it('renders loading state', () => {
    render(<BaseChart type="line" data={mockData} loading={true} />);

    expect(screen.getByText('Loading chart...')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders error state with provided error message', () => {
    render(<BaseChart type="line" data={mockData} error="Test error message" />);

    expect(screen.getByText('Chart Error')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <BaseChart type="line" data={mockData} className="custom-chart-class" />
    );

    expect(container.firstChild).toHaveClass('chart-container');
    expect(container.firstChild).toHaveClass('custom-chart-class');
  });

  it('applies custom width and height', () => {
    const { container } = render(
      <BaseChart type="line" data={mockData} width={800} height={400} />
    );

    const chartContainer = container.firstChild as HTMLElement;
    expect(chartContainer.style.width).toBe('800px');
    expect(chartContainer.style.height).toBe('400px');
  });

  it('calls onChartReady callback when chart is ready', async () => {
    const onChartReady = vi.fn();

    render(<BaseChart type="line" data={mockData} onChartReady={onChartReady} />);

    await waitFor(() => {
      expect(onChartReady).toHaveBeenCalledWith(mockChart);
    });
  });

  it('handles different chart types', () => {
    const barData: SafeChartData<'bar'> = {
      labels: ['A', 'B', 'C'],
      datasets: [{ label: 'Bar Data', data: [1, 2, 3] }],
    };

    render(<BaseChart type="bar" data={barData} />);

    const canvas = screen.getByRole('img');
    expect(canvas).toHaveAttribute('aria-label', 'bar chart');
  });

  it('handles click and hover callbacks', () => {
    const onChartClick = vi.fn();
    const onChartHover = vi.fn();

    render(
      <BaseChart
        type="line"
        data={mockData}
        onChartClick={onChartClick}
        onChartHover={onChartHover}
      />
    );

    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('handles theme changes', () => {
    const { rerender } = render(<BaseChart type="line" data={mockData} isDarkMode={false} />);

    expect(screen.getByRole('img')).toBeInTheDocument();

    rerender(<BaseChart type="line" data={mockData} isDarkMode={true} />);

    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('handles custom animation duration', () => {
    render(<BaseChart type="line" data={mockData} animationDuration={500} />);

    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('handles non-responsive mode', () => {
    render(<BaseChart type="line" data={mockData} responsive={false} />);

    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('handles update mode changes', () => {
    const { rerender } = render(<BaseChart type="line" data={mockData} updateMode="resize" />);

    expect(screen.getByRole('img')).toBeInTheDocument();

    rerender(<BaseChart type="line" data={mockData} updateMode="reset" />);

    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('updates chart when data changes', async () => {
    const initialData = mockData;
    const newData: SafeChartData<'line'> = {
      ...mockData,
      datasets: [
        {
          label: mockData.datasets[0]?.label || 'Dataset',
          data: [40, 50, 60],
          ...mockData.datasets[0],
        },
      ],
    };

    const { rerender } = render(<BaseChart type="line" data={initialData} />);

    await waitFor(() => {
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    rerender(<BaseChart type="line" data={newData} />);

    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});

describe('ChartContainer', () => {
  it('renders children without header when no title/description/actions', () => {
    render(
      <ChartContainer>
        <div data-testid="chart-content">Chart content</div>
      </ChartContainer>
    );

    expect(screen.getByTestId('chart-content')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('renders title and description', () => {
    render(
      <ChartContainer title="Test Chart" description="Chart description">
        <div data-testid="chart-content">Chart content</div>
      </ChartContainer>
    );

    expect(screen.getByRole('heading', { name: 'Test Chart' })).toBeInTheDocument();
    expect(screen.getByText('Chart description')).toBeInTheDocument();
    expect(screen.getByTestId('chart-content')).toBeInTheDocument();
  });

  it('renders actions', () => {
    render(
      <ChartContainer
        title="Test Chart"
        actions={<button data-testid="chart-action">Action</button>}
      >
        <div data-testid="chart-content">Chart content</div>
      </ChartContainer>
    );

    expect(screen.getByTestId('chart-action')).toBeInTheDocument();
    expect(screen.getByTestId('chart-content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ChartContainer className="custom-container-class">
        <div>Content</div>
      </ChartContainer>
    );

    expect(container.firstChild).toHaveClass('chart-container');
    expect(container.firstChild).toHaveClass('custom-container-class');
  });

  it('renders only title without description', () => {
    render(
      <ChartContainer title="Only Title">
        <div data-testid="chart-content">Chart content</div>
      </ChartContainer>
    );

    expect(screen.getByRole('heading', { name: 'Only Title' })).toBeInTheDocument();
    expect(screen.getByTestId('chart-content')).toBeInTheDocument();
  });

  it('renders only description without title', () => {
    render(
      <ChartContainer description="Only description">
        <div data-testid="chart-content">Chart content</div>
      </ChartContainer>
    );

    expect(screen.getByText('Only description')).toBeInTheDocument();
    expect(screen.getByTestId('chart-content')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});

describe('withChartTheme HOC', () => {
  const mockData: SafeChartData<'line'> = {
    datasets: [{ label: 'Test Dataset', data: [1, 2, 3] }],
  };

  const TestComponent = vi.fn(({ isDarkMode }) => (
    <div data-testid="themed-component">Dark mode: {isDarkMode ? 'true' : 'false'}</div>
  ));

  const ThemedComponent = withChartTheme(TestComponent);

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Mock MutationObserver
    global.MutationObserver = vi.fn().mockImplementation(callback => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
    }));
  });

  it('renders wrapped component with theme detection', () => {
    render(<ThemedComponent type="line" data={mockData} />);

    expect(screen.getByTestId('themed-component')).toBeInTheDocument();
    expect(TestComponent).toHaveBeenCalled();

    const lastCall = TestComponent.mock.calls[TestComponent.mock.calls.length - 1];
    expect(lastCall?.[0]).toMatchObject({
      isDarkMode: false,
      type: 'line',
      data: mockData,
    });
  });

  it('detects dark mode from media query', () => {
    // Mock dark mode media query
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

    render(<ThemedComponent type="line" data={mockData} />);

    expect(TestComponent).toHaveBeenCalled();

    const lastCall = TestComponent.mock.calls[TestComponent.mock.calls.length - 1];
    expect(lastCall?.[0]).toMatchObject({
      isDarkMode: true,
    });
  });

  it('passes through all props to wrapped component', () => {
    const customProps = {
      type: 'bar' as const,
      data: mockData,
      className: 'custom-class',
      height: 400,
    };

    render(<ThemedComponent {...customProps} />);

    expect(TestComponent).toHaveBeenCalled();

    const lastCall = TestComponent.mock.calls[TestComponent.mock.calls.length - 1];
    expect(lastCall?.[0]).toMatchObject(customProps);
  });
});

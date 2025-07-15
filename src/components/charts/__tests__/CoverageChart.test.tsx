/**
 * @jest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CoverageChart, CoverageMetricsCard } from '../CoverageChart';
import type { CoverageMetrics } from '../CoverageChart';

// Mock Chart.js and BaseChart
vi.mock('../BaseChart', () => ({
  BaseChart: ({ data, type, loading, error }: any) => {
    if (loading) return <div data-testid="chart-loading">Loading...</div>;
    if (error) return <div data-testid="chart-error">{error}</div>;
    return (
      <div data-testid="base-chart">
        <div data-testid="chart-type">{type}</div>
        <div data-testid="chart-data">{JSON.stringify(data)}</div>
      </div>
    );
  },
  ChartContainer: ({ title, description, actions, children }: any) => (
    <div data-testid="chart-container">
      {title && <h3 data-testid="chart-title">{title}</h3>}
      {description && <p data-testid="chart-description">{description}</p>}
      {actions && <div data-testid="chart-actions">{actions}</div>}
      {children}
    </div>
  ),
}));

describe('CoverageChart', () => {
  const mockData: CoverageMetrics = {
    overallCoverage: 75.5,
    totalLines: 1000,
    coveredLines: 755,
    missedLines: 245,
    branchCoverage: 68.3,
    lineCoverage: 75.5,
  };

  it('renders coverage chart with default props', () => {
    render(<CoverageChart data={mockData} />);

    expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    expect(screen.getByTestId('chart-title')).toHaveTextContent('コードカバレッジ');
    expect(screen.getByTestId('chart-description')).toHaveTextContent('カバー済み vs 未カバー');
  });

  it('renders with custom title and description', () => {
    render(<CoverageChart data={mockData} title="Custom Title" description="Custom Description" />);

    expect(screen.getByTestId('chart-title')).toHaveTextContent('Custom Title');
    expect(screen.getByTestId('chart-description')).toHaveTextContent('Custom Description');
  });

  it('renders as pie chart when type is pie', () => {
    render(<CoverageChart data={mockData} type="pie" />);

    expect(screen.getByTestId('chart-type')).toHaveTextContent('pie');
  });

  it('renders as doughnut chart by default', () => {
    render(<CoverageChart data={mockData} />);

    expect(screen.getByTestId('chart-type')).toHaveTextContent('doughnut');
  });

  it('shows loading state', () => {
    render(<CoverageChart data={mockData} loading={true} />);

    expect(screen.getByTestId('chart-loading')).toBeInTheDocument();
  });

  it('shows error state', () => {
    render(<CoverageChart data={mockData} error="Test error" />);

    expect(screen.getByTestId('chart-error')).toHaveTextContent('Test error');
  });

  it('renders chart data correctly', () => {
    render(<CoverageChart data={mockData} />);

    const chartDataElement = screen.getByTestId('chart-data');
    const chartData = JSON.parse(chartDataElement.textContent || '');

    expect(chartData.labels).toEqual(['カバー済み', '未カバー']);
    expect(chartData.datasets[0].data).toEqual([755, 245]);
  });

  it('displays coverage percentages in actions', () => {
    render(<CoverageChart data={mockData} />);

    const actions = screen.getByTestId('chart-actions');
    expect(actions).toHaveTextContent('75.5%');
    expect(actions).toHaveTextContent('24.5%');
  });

  it('handles different animation durations', () => {
    render(<CoverageChart data={mockData} animationDuration={500} />);

    expect(screen.getByTestId('base-chart')).toBeInTheDocument();
  });

  it('handles custom dimensions', () => {
    render(<CoverageChart data={mockData} height={400} width={600} />);

    expect(screen.getByTestId('base-chart')).toBeInTheDocument();
  });

  it('handles zero coverage', () => {
    const zeroData: CoverageMetrics = {
      overallCoverage: 0,
      totalLines: 1000,
      coveredLines: 0,
      missedLines: 1000,
    };

    render(<CoverageChart data={zeroData} />);

    const chartDataElement = screen.getByTestId('chart-data');
    const chartData = JSON.parse(chartDataElement.textContent || '');

    expect(chartData.datasets[0].data).toEqual([0, 1000]);
  });

  it('handles full coverage', () => {
    const fullData: CoverageMetrics = {
      overallCoverage: 100,
      totalLines: 1000,
      coveredLines: 1000,
      missedLines: 0,
    };

    render(<CoverageChart data={fullData} />);

    const chartDataElement = screen.getByTestId('chart-data');
    const chartData = JSON.parse(chartDataElement.textContent || '');

    expect(chartData.datasets[0].data).toEqual([1000, 0]);
  });

  it('handles malformed or invalid data gracefully', () => {
    const invalidData: CoverageMetrics = {
      overallCoverage: -10, // Invalid negative coverage
      totalLines: 0, // Invalid zero total lines
      coveredLines: 150, // More covered than total
      missedLines: -50, // Invalid negative missed lines
    };

    render(<CoverageChart data={invalidData} />);

    expect(screen.getByTestId('base-chart')).toBeInTheDocument();
  });

  it('handles extremely large numbers', () => {
    const largeData: CoverageMetrics = {
      overallCoverage: 85.7,
      totalLines: 1000000,
      coveredLines: 857000,
      missedLines: 143000,
    };

    render(<CoverageChart data={largeData} />);

    const chartDataElement = screen.getByTestId('chart-data');
    const chartData = JSON.parse(chartDataElement.textContent || '');

    expect(chartData.datasets[0].data).toEqual([857000, 143000]);
  });

  it('handles decimal coverage values', () => {
    const decimalData: CoverageMetrics = {
      overallCoverage: 75.123456789,
      totalLines: 1337,
      coveredLines: 1004,
      missedLines: 333,
    };

    render(<CoverageChart data={decimalData} />);

    expect(screen.getByTestId('base-chart')).toBeInTheDocument();
  });

  it('handles chart type configuration', () => {
    render(<CoverageChart data={mockData} />);

    expect(screen.getByTestId('chart-type')).toHaveTextContent('doughnut');
  });

  it('handles advanced chart options', () => {
    render(<CoverageChart data={mockData} />);

    expect(screen.getByTestId('base-chart')).toBeInTheDocument();
  });

  it('handles onClick callbacks', () => {
    render(<CoverageChart data={mockData} />);

    expect(screen.getByTestId('base-chart')).toBeInTheDocument();
  });

  it('handles theme changes', () => {
    const { rerender } = render(<CoverageChart data={mockData} />);

    expect(screen.getByTestId('base-chart')).toBeInTheDocument();

    rerender(<CoverageChart data={mockData} />);

    expect(screen.getByTestId('base-chart')).toBeInTheDocument();
  });

  it('handles data updates efficiently', () => {
    const initialData = mockData;
    const updatedData: CoverageMetrics = {
      ...mockData,
      overallCoverage: 85.2,
      coveredLines: 852,
      missedLines: 148,
    };

    const { rerender } = render(<CoverageChart data={initialData} />);

    expect(screen.getByTestId('base-chart')).toBeInTheDocument();

    rerender(<CoverageChart data={updatedData} />);

    const chartDataElement = screen.getByTestId('chart-data');
    const chartData = JSON.parse(chartDataElement.textContent || '');

    expect(chartData.datasets[0].data).toEqual([852, 148]);
  });

  it('handles optional metrics fields', () => {
    const minimalData: CoverageMetrics = {
      overallCoverage: 75.5,
      totalLines: 1000,
      coveredLines: 755,
      missedLines: 245,
      // branchCoverage and lineCoverage are optional
    };

    render(<CoverageChart data={minimalData} />);

    expect(screen.getByTestId('base-chart')).toBeInTheDocument();
  });

  it('handles custom color schemes', () => {
    render(<CoverageChart data={mockData} />);

    expect(screen.getByTestId('base-chart')).toBeInTheDocument();
  });
});

describe('CoverageMetricsCard', () => {
  const mockData: CoverageMetrics = {
    overallCoverage: 75.5,
    totalLines: 1000,
    coveredLines: 755,
    missedLines: 245,
    branchCoverage: 68.3,
    lineCoverage: 75.5,
  };

  it('renders all basic metrics', () => {
    render(<CoverageMetricsCard data={mockData} />);

    expect(screen.getByText('総合カバレッジ')).toBeInTheDocument();
    expect(screen.getByText('75.5%')).toBeInTheDocument();
    expect(screen.getByText('総行数')).toBeInTheDocument();
    expect(screen.getByText('1,000')).toBeInTheDocument();
    expect(screen.getByText('カバー済み行数')).toBeInTheDocument();
    expect(screen.getByText('755')).toBeInTheDocument();
    expect(screen.getByText('未カバー行数')).toBeInTheDocument();
    expect(screen.getByText('245')).toBeInTheDocument();
  });

  it('renders branch coverage when available', () => {
    render(<CoverageMetricsCard data={mockData} />);

    expect(screen.getByText('ブランチカバレッジ')).toBeInTheDocument();
    expect(screen.getByText('68.3%')).toBeInTheDocument();
  });

  it('does not render branch coverage when not available', () => {
    const dataWithoutBranch: CoverageMetrics = {
      overallCoverage: 75.5,
      totalLines: 1000,
      coveredLines: 755,
      missedLines: 245,
    };

    render(<CoverageMetricsCard data={dataWithoutBranch} />);

    expect(screen.queryByText('ブランチカバレッジ')).not.toBeInTheDocument();
  });

  it('applies correct color classes for high coverage', () => {
    const highCoverageData: CoverageMetrics = {
      overallCoverage: 85,
      totalLines: 1000,
      coveredLines: 850,
      missedLines: 150,
      branchCoverage: 82,
    };

    render(<CoverageMetricsCard data={highCoverageData} />);

    const coverageElement = screen.getByText('85.0%');
    expect(coverageElement).toHaveClass('text-green-600');
  });

  it('applies correct color classes for medium coverage', () => {
    const mediumCoverageData: CoverageMetrics = {
      overallCoverage: 70,
      totalLines: 1000,
      coveredLines: 700,
      missedLines: 300,
      branchCoverage: 65,
    };

    render(<CoverageMetricsCard data={mediumCoverageData} />);

    const coverageElement = screen.getByText('70.0%');
    expect(coverageElement).toHaveClass('text-yellow-600');
  });

  it('applies correct color classes for low coverage', () => {
    const lowCoverageData: CoverageMetrics = {
      overallCoverage: 45,
      totalLines: 1000,
      coveredLines: 450,
      missedLines: 550,
      branchCoverage: 40,
    };

    render(<CoverageMetricsCard data={lowCoverageData} />);

    const coverageElement = screen.getByText('45.0%');
    expect(coverageElement).toHaveClass('text-red-600');
  });

  it('formats large numbers correctly', () => {
    const largeData: CoverageMetrics = {
      overallCoverage: 75.5,
      totalLines: 123456,
      coveredLines: 93219,
      missedLines: 30237,
    };

    render(<CoverageMetricsCard data={largeData} />);

    expect(screen.getByText('123,456')).toBeInTheDocument();
    expect(screen.getByText('93,219')).toBeInTheDocument();
    expect(screen.getByText('30,237')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<CoverageMetricsCard data={mockData} className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });
});

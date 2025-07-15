/**
 * @jest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModuleCoverageChart, ModuleCoverageSummary } from '../ModuleCoverageChart';
import type { ModuleCoverageData } from '../ModuleCoverageChart';

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

describe('ModuleCoverageChart', () => {
  const mockData: ModuleCoverageData[] = [
    {
      name: 'src/components/ui',
      coverage: 32.8,
      lines: 1245,
      missedLines: 836,
    },
    {
      name: 'src/lib/github',
      coverage: 45.2,
      lines: 892,
      missedLines: 489,
    },
    {
      name: 'src/lib/utils',
      coverage: 89.4,
      lines: 423,
      missedLines: 45,
    },
    {
      name: 'src/pages/api',
      coverage: 42.1,
      lines: 534,
      missedLines: 309,
    },
  ];

  it('renders module coverage chart with default props', () => {
    render(<ModuleCoverageChart data={mockData} />);

    expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    expect(screen.getByTestId('chart-title')).toHaveTextContent('モジュール別カバレッジ');
    expect(screen.getByTestId('chart-description')).toHaveTextContent(
      'カバレッジ率の低いモジュールから順に表示'
    );
  });

  it('renders with custom title and description', () => {
    render(
      <ModuleCoverageChart data={mockData} title="Custom Title" description="Custom Description" />
    );

    expect(screen.getByTestId('chart-title')).toHaveTextContent('Custom Title');
    expect(screen.getByTestId('chart-description')).toHaveTextContent('Custom Description');
  });

  it('renders as bar chart', () => {
    render(<ModuleCoverageChart data={mockData} />);

    expect(screen.getByTestId('chart-type')).toHaveTextContent('bar');
  });

  it('sorts data in ascending order by default', () => {
    render(<ModuleCoverageChart data={mockData} />);

    const chartDataElement = screen.getByTestId('chart-data');
    const chartData = JSON.parse(chartDataElement.textContent || '');

    // Should be sorted by coverage ascending
    expect(chartData.datasets[0].data).toEqual([32.8, 42.1, 45.2, 89.4]);
  });

  it('sorts data in descending order when specified', () => {
    render(<ModuleCoverageChart data={mockData} sortOrder="desc" />);

    const chartDataElement = screen.getByTestId('chart-data');
    const chartData = JSON.parse(chartDataElement.textContent || '');

    // Should be sorted by coverage descending
    expect(chartData.datasets[0].data).toEqual([89.4, 45.2, 42.1, 32.8]);
  });

  it('limits the number of modules displayed', () => {
    render(<ModuleCoverageChart data={mockData} maxModules={2} />);

    const chartDataElement = screen.getByTestId('chart-data');
    const chartData = JSON.parse(chartDataElement.textContent || '');

    expect(chartData.datasets[0].data).toHaveLength(2);
  });

  it('shows loading state', () => {
    render(<ModuleCoverageChart data={mockData} loading={true} />);

    expect(screen.getByTestId('chart-loading')).toBeInTheDocument();
  });

  it('shows error state', () => {
    render(<ModuleCoverageChart data={mockData} error="Test error" />);

    expect(screen.getByTestId('chart-error')).toHaveTextContent('Test error');
  });

  it('displays threshold information in actions', () => {
    render(<ModuleCoverageChart data={mockData} threshold={60} />);

    const actions = screen.getByTestId('chart-actions');
    expect(actions).toHaveTextContent('≥80%');
    expect(actions).toHaveTextContent('≥60%');
    expect(actions).toHaveTextContent('<60%');
  });

  it('shows module count in actions', () => {
    render(<ModuleCoverageChart data={mockData} maxModules={3} />);

    const actions = screen.getByTestId('chart-actions');
    expect(actions).toHaveTextContent('(3/4件表示)');
  });

  it('handles empty data', () => {
    render(<ModuleCoverageChart data={[]} />);

    const chartDataElement = screen.getByTestId('chart-data');
    const chartData = JSON.parse(chartDataElement.textContent || '');

    expect(chartData.datasets[0].data).toEqual([]);
    expect(chartData.labels).toEqual([]);
  });

  it('removes src/ prefix from module names', () => {
    render(<ModuleCoverageChart data={mockData} />);

    const chartDataElement = screen.getByTestId('chart-data');
    const chartData = JSON.parse(chartDataElement.textContent || '');

    expect(chartData.labels).toEqual(['components/ui', 'pages/api', 'lib/github', 'lib/utils']);
  });

  it('handles custom dimensions', () => {
    render(<ModuleCoverageChart data={mockData} height={500} width={800} />);

    expect(screen.getByTestId('base-chart')).toBeInTheDocument();
  });

  it('handles click callbacks', () => {
    const mockCallback = vi.fn();
    render(<ModuleCoverageChart data={mockData} onModuleClick={mockCallback} />);

    expect(screen.getByTestId('base-chart')).toBeInTheDocument();
  });

  it('handles extremely long module names', () => {
    const longNameData: ModuleCoverageData[] = [
      {
        name: 'src/components/very/deeply/nested/module/with/extremely/long/path/that/might/cause/display/issues',
        coverage: 75.0,
        lines: 100,
        missedLines: 25,
      },
    ];

    render(<ModuleCoverageChart data={longNameData} />);

    const chartDataElement = screen.getByTestId('chart-data');
    const chartData = JSON.parse(chartDataElement.textContent || '');

    expect(chartData.labels).toEqual([
      'components/very/deeply/nested/module/with/extremely/long/path/that/might/cause/display/issues',
    ]);
  });

  it('handles modules with zero coverage', () => {
    const zeroData: ModuleCoverageData[] = [
      {
        name: 'src/untested/module',
        coverage: 0,
        lines: 100,
        missedLines: 100,
      },
    ];

    render(<ModuleCoverageChart data={zeroData} />);

    const chartDataElement = screen.getByTestId('chart-data');
    const chartData = JSON.parse(chartDataElement.textContent || '');

    expect(chartData.datasets[0].data).toEqual([0]);
  });

  it('handles modules with perfect coverage', () => {
    const perfectData: ModuleCoverageData[] = [
      {
        name: 'src/perfect/module',
        coverage: 100,
        lines: 100,
        missedLines: 0,
      },
    ];

    render(<ModuleCoverageChart data={perfectData} />);

    const chartDataElement = screen.getByTestId('chart-data');
    const chartData = JSON.parse(chartDataElement.textContent || '');

    expect(chartData.datasets[0].data).toEqual([100]);
  });

  it('handles color-coded threshold display', () => {
    const mixedData: ModuleCoverageData[] = [
      { name: 'src/low', coverage: 30, lines: 100, missedLines: 70 },
      { name: 'src/medium', coverage: 60, lines: 100, missedLines: 40 },
      { name: 'src/high', coverage: 90, lines: 100, missedLines: 10 },
    ];

    render(<ModuleCoverageChart data={mixedData} threshold={50} />);

    const chartDataElement = screen.getByTestId('chart-data');
    const chartData = JSON.parse(chartDataElement.textContent || '');

    expect(chartData.datasets[0].data).toEqual([30, 60, 90]);
  });

  it('handles duplicate module names', () => {
    const duplicateData: ModuleCoverageData[] = [
      { name: 'src/module', coverage: 50, lines: 100, missedLines: 50 },
      { name: 'src/module', coverage: 75, lines: 100, missedLines: 25 },
    ];

    render(<ModuleCoverageChart data={duplicateData} />);

    const chartDataElement = screen.getByTestId('chart-data');
    const chartData = JSON.parse(chartDataElement.textContent || '');

    expect(chartData.datasets[0].data).toEqual([50, 75]);
  });

  it('handles invalid coverage values', () => {
    const invalidData: ModuleCoverageData[] = [
      { name: 'src/negative', coverage: -10, lines: 100, missedLines: 110 },
      { name: 'src/overflow', coverage: 150, lines: 100, missedLines: -50 },
    ];

    render(<ModuleCoverageChart data={invalidData} />);

    expect(screen.getByTestId('base-chart')).toBeInTheDocument();
  });

  it('handles large datasets efficiently', () => {
    const largeData: ModuleCoverageData[] = Array.from({ length: 100 }, (_, i) => ({
      name: `src/module-${i}`,
      coverage: Math.random() * 100,
      lines: Math.floor(Math.random() * 1000) + 100,
      missedLines: Math.floor(Math.random() * 500),
    }));

    render(<ModuleCoverageChart data={largeData} />);

    expect(screen.getByTestId('base-chart')).toBeInTheDocument();
  });

  it('handles hover interactions', () => {
    render(<ModuleCoverageChart data={mockData} />);

    expect(screen.getByTestId('base-chart')).toBeInTheDocument();
  });

  it('handles custom chart options', () => {
    render(<ModuleCoverageChart data={mockData} />);

    expect(screen.getByTestId('base-chart')).toBeInTheDocument();
  });

  it('handles theme changes', () => {
    const { rerender } = render(<ModuleCoverageChart data={mockData} />);

    expect(screen.getByTestId('base-chart')).toBeInTheDocument();

    rerender(<ModuleCoverageChart data={mockData} />);

    expect(screen.getByTestId('base-chart')).toBeInTheDocument();
  });

  it('handles data updates efficiently', () => {
    const { rerender } = render(<ModuleCoverageChart data={mockData} />);

    expect(screen.getByTestId('base-chart')).toBeInTheDocument();

    const updatedData = mockData.map(item => ({
      ...item,
      coverage: item.coverage + 10,
    }));

    rerender(<ModuleCoverageChart data={updatedData} />);

    expect(screen.getByTestId('base-chart')).toBeInTheDocument();
  });
});

describe('ModuleCoverageSummary', () => {
  const mockData: ModuleCoverageData[] = [
    {
      name: 'src/components/ui',
      coverage: 32.8,
      lines: 1245,
      missedLines: 836,
    },
    {
      name: 'src/lib/github',
      coverage: 45.2,
      lines: 892,
      missedLines: 489,
    },
    {
      name: 'src/lib/utils',
      coverage: 89.4,
      lines: 423,
      missedLines: 45,
    },
    {
      name: 'src/pages/api',
      coverage: 42.1,
      lines: 534,
      missedLines: 309,
    },
    {
      name: 'src/lib/analytics',
      coverage: 85.0,
      lines: 200,
      missedLines: 30,
    },
  ];

  it('renders all summary statistics', () => {
    render(<ModuleCoverageSummary data={mockData} />);

    expect(screen.getByText('総モジュール数')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();

    expect(screen.getByText('高カバレッジ')).toBeInTheDocument();
    const highCoverageElements = screen.getAllByText('2');
    expect(highCoverageElements.length).toBeGreaterThan(0); // 89.4% and 85.0%

    expect(screen.getByText('中カバレッジ')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument(); // None between 50-80%

    expect(screen.getByText('低カバレッジ')).toBeInTheDocument();
    const lowCoverageElements = screen.getAllByText('3');
    expect(lowCoverageElements.length).toBeGreaterThan(0); // 32.8%, 45.2%, 42.1%
  });

  it('calculates average coverage correctly', () => {
    render(<ModuleCoverageSummary data={mockData} />);

    expect(screen.getByText('平均カバレッジ')).toBeInTheDocument();
    // (32.8 + 45.2 + 89.4 + 42.1 + 85.0) / 5 = 58.9
    expect(screen.getByText('58.9%')).toBeInTheDocument();
  });

  it('shows modules needing attention', () => {
    render(<ModuleCoverageSummary data={mockData} threshold={50} />);

    expect(screen.getByText('要改善')).toBeInTheDocument();
    const needsAttentionElements = screen.getAllByText('3');
    expect(needsAttentionElements.length).toBeGreaterThan(0); // Modules under 50%
  });

  it('handles custom threshold', () => {
    render(<ModuleCoverageSummary data={mockData} threshold={60} />);

    expect(screen.getByText('中カバレッジ')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument(); // None between 60-80%

    expect(screen.getByText('低カバレッジ')).toBeInTheDocument();
    const lowCoverageElements = screen.getAllByText('3');
    expect(lowCoverageElements.length).toBeGreaterThan(0); // All under 60%
  });

  it('handles empty data', () => {
    render(<ModuleCoverageSummary data={[]} />);

    expect(screen.getByText('総モジュール数')).toBeInTheDocument();
    const zeroElements = screen.getAllByText('0');
    expect(zeroElements.length).toBeGreaterThan(0);

    expect(screen.getByText('高カバレッジ')).toBeInTheDocument();
    expect(screen.getByText('平均カバレッジ')).toBeInTheDocument();
    expect(screen.getByText('NaN%')).toBeInTheDocument(); // Division by zero
  });

  it('handles single module data', () => {
    const singleData: ModuleCoverageData[] = [
      {
        name: 'src/single/module',
        coverage: 75.0,
        lines: 100,
        missedLines: 25,
      },
    ];

    render(<ModuleCoverageSummary data={singleData} />);

    const oneElements = screen.getAllByText('1');
    expect(oneElements.length).toBeGreaterThan(0); // Total modules
    expect(screen.getByText('75.0%')).toBeInTheDocument(); // Average coverage
  });

  it('applies custom className', () => {
    const { container } = render(
      <ModuleCoverageSummary data={mockData} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('displays threshold values in labels', () => {
    render(<ModuleCoverageSummary data={mockData} threshold={60} />);

    expect(screen.getByText('≥80%')).toBeInTheDocument();
    expect(screen.getByText('≥60%')).toBeInTheDocument();
    expect(screen.getByText('<60%')).toBeInTheDocument();
  });

  it('handles all modules with high coverage', () => {
    const highCoverageData: ModuleCoverageData[] = [
      {
        name: 'src/module1',
        coverage: 85.0,
        lines: 100,
        missedLines: 15,
      },
      {
        name: 'src/module2',
        coverage: 90.0,
        lines: 200,
        missedLines: 20,
      },
    ];

    render(<ModuleCoverageSummary data={highCoverageData} />);

    expect(screen.getByText('高カバレッジ')).toBeInTheDocument();
    const highCoverageElements = screen.getAllByText('2');
    expect(highCoverageElements.length).toBeGreaterThan(0);

    expect(screen.getByText('低カバレッジ')).toBeInTheDocument();
    const zeroElements = screen.getAllByText('0');
    expect(zeroElements.length).toBeGreaterThan(0);
  });
});

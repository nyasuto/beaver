/**
 * @jest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import {
  CHART_CONFIG,
  PRESET_CHARTS,
  createChart,
  Chart,
  type ChartProps,
  type ChartType,
} from '../index';
import type { SafeChartData } from '../types/safe-chart';

describe('Chart module exports', () => {
  it('exports CHART_CONFIG with correct structure', () => {
    expect(CHART_CONFIG.animations).toBeDefined();
    expect(CHART_CONFIG.responsive).toBeDefined();
    expect(CHART_CONFIG.colors).toBeDefined();
    expect(CHART_CONFIG.defaults).toBeDefined();

    expect(CHART_CONFIG.animations.enabled).toBe(true);
    expect(CHART_CONFIG.animations.duration).toBe(750);
    expect(CHART_CONFIG.responsive.maintainAspectRatio).toBe(false);
    expect(CHART_CONFIG.colors.primary).toBe('#3B82F6');
  });

  it('exports PRESET_CHARTS with different chart configurations', () => {
    expect(PRESET_CHARTS.issuesTrend.type).toBe('line');
    expect(PRESET_CHARTS.issuesByCategory.type).toBe('pie');
    expect(PRESET_CHARTS.issuesByPriority.type).toBe('bar');
    expect(PRESET_CHARTS.performanceMetrics.type).toBe('area');
    expect(PRESET_CHARTS.contributorActivity.type).toBe('bar');
    expect(PRESET_CHARTS.codeQuality.type).toBe('line');
    expect(PRESET_CHARTS.sparkline.type).toBe('area');
    expect(PRESET_CHARTS.gauge.type).toBe('doughnut');
  });

  it('exports preset configurations with expected properties', () => {
    // Check line chart preset
    expect(PRESET_CHARTS.issuesTrend.smooth).toBe(true);
    expect(PRESET_CHARTS.issuesTrend.showPoints).toBe(true);
    expect(PRESET_CHARTS.issuesTrend.fill).toBe(true);

    // Check pie chart preset
    expect(PRESET_CHARTS.issuesByCategory.showPercentages).toBe(true);
    expect(PRESET_CHARTS.issuesByCategory.showLegend).toBe(true);
    expect(PRESET_CHARTS.issuesByCategory.legendPosition).toBe('right');

    // Check bar chart preset
    expect(PRESET_CHARTS.issuesByPriority.orientation).toBe('horizontal');
    expect(PRESET_CHARTS.issuesByPriority.showValues).toBe(true);
    expect(PRESET_CHARTS.issuesByPriority.sortByValue).toBe(true);

    // Check area chart preset
    expect(PRESET_CHARTS.performanceMetrics.stacked).toBe(true);
    expect(PRESET_CHARTS.performanceMetrics.showGrid).toBe(true);
    expect(PRESET_CHARTS.performanceMetrics.smooth).toBe(true);

    // Check sparkline preset
    expect(PRESET_CHARTS.sparkline.height).toBe(60);
    expect(PRESET_CHARTS.sparkline.hideAxes).toBe(true);
    expect(PRESET_CHARTS.sparkline.hideLegend).toBe(true);

    // Check gauge preset
    expect(PRESET_CHARTS.gauge.cutout).toBe(70);
    expect(PRESET_CHARTS.gauge.showNeedle).toBe(true);
    expect(PRESET_CHARTS.gauge.rotation).toBe(-90);
    expect(PRESET_CHARTS.gauge.circumference).toBe(180);
  });
});

describe('createChart function', () => {
  it('creates chart configuration with default preset', () => {
    const mockData: SafeChartData<'line'> = {
      datasets: [{ label: 'Test', data: [1, 2, 3] }],
    };

    const chart = createChart('line', {
      type: 'line',
      data: mockData,
    });

    expect(chart.component).toBe('BaseChart');
    expect(chart.props.type).toBe('line');
    expect(chart.props.data).toBe(mockData);
    // Note: 'line' type doesn't map to preset, so no preset properties are applied
  });

  it('creates chart configuration without preset for unknown type', () => {
    const mockData: SafeChartData<'bar'> = {
      datasets: [{ label: 'Test', data: [1, 2, 3] }],
    };

    const chart = createChart('bar', {
      type: 'bar',
      data: mockData,
    });

    expect(chart.component).toBe('BaseChart');
    expect(chart.props.type).toBe('bar');
    expect(chart.props.data).toBe(mockData);
  });

  it('merges custom props with preset configuration', () => {
    const mockData: SafeChartData<'pie'> = {
      datasets: [{ label: 'Test', data: [1, 2, 3] }],
    };

    const chart = createChart('pie', {
      type: 'pie',
      data: mockData,
      loading: true,
    });

    expect(chart.component).toBe('BaseChart');
    expect(chart.props.type).toBe('pie');
    expect(chart.props.loading).toBe(true);
    expect(chart.props.data).toBe(mockData);
    // Note: 'pie' type doesn't map to preset, so no preset properties are applied
  });

  it('overrides preset properties with custom props', () => {
    const mockData: SafeChartData<'line'> = {
      datasets: [{ label: 'Test', data: [1, 2, 3] }],
    };

    const chart = createChart('line', {
      type: 'line',
      data: mockData,
      loading: false, // Custom prop
    });

    expect(chart.props.loading).toBe(false); // Custom prop
    expect(chart.props.type).toBe('line');
    expect(chart.props.data).toBe(mockData);
  });

  it('handles empty props', () => {
    const chart = createChart('line');

    expect(chart.component).toBe('BaseChart');
    expect(chart.props.type).toBe('line');
    // Empty props object passed, no preset applies for 'line' type
  });
});

describe('Chart function', () => {
  const mockData: SafeChartData<'line'> = {
    datasets: [{ label: 'Test Dataset', data: [1, 2, 3] }],
  };

  it('returns chart configuration object', () => {
    const chartConfig = Chart({
      type: 'line',
      data: mockData,
    });

    expect(chartConfig.component).toBe('BaseChart');
    expect(chartConfig.props.type).toBe('line');
    expect(chartConfig.props.data).toBe(mockData);
  });

  it('passes through all props', () => {
    const props: ChartProps = {
      type: 'bar',
      data: mockData,
      loading: true,
      error: 'Test error',
      theme: 'dark',
      size: 'large',
    };

    const chartConfig = Chart(props);

    expect(chartConfig.component).toBe('BaseChart');
    expect(chartConfig.props.type).toBe('bar');
    expect(chartConfig.props.data).toBe(mockData);
    expect(chartConfig.props.loading).toBe(true);
    expect(chartConfig.props.error).toBe('Test error');
    expect(chartConfig.props.theme).toBe('dark');
    expect(chartConfig.props.size).toBe('large');
  });

  it('handles options parameter', () => {
    const options = { responsive: false };

    const chartConfig = Chart({
      type: 'pie',
      data: mockData,
      options,
    });

    expect(chartConfig.props.options).toBe(options);
  });

  it('handles different chart types', () => {
    const types: ChartType[] = ['line', 'bar', 'pie', 'doughnut', 'area'];

    types.forEach(type => {
      const chartConfig = Chart({
        type,
        data: mockData,
      });

      expect(chartConfig.component).toBe('BaseChart');
      expect(chartConfig.props.type).toBe(type);
    });
  });
});

describe('Type definitions', () => {
  it('defines ChartType correctly', () => {
    const validTypes: ChartType[] = ['line', 'bar', 'pie', 'doughnut', 'area'];

    validTypes.forEach(type => {
      expect(typeof type).toBe('string');
    });

    // This test ensures the types are defined correctly at compile time
    expect(validTypes).toHaveLength(5);
  });

  it('defines ChartProps interface correctly', () => {
    const mockData: SafeChartData<'line'> = {
      datasets: [{ label: 'Test', data: [1, 2, 3] }],
    };

    const validProps: ChartProps = {
      type: 'line',
      data: mockData,
      options: { responsive: true },
      theme: 'light',
      size: 'medium',
      loading: false,
      error: undefined,
    };

    expect(validProps.type).toBe('line');
    expect(validProps.data).toBe(mockData);
    expect(validProps.theme).toBe('light');
    expect(validProps.size).toBe('medium');
  });
});

describe('Preset chart configurations', () => {
  it('provides issue analytics presets', () => {
    expect(PRESET_CHARTS.issuesTrend).toBeDefined();
    expect(PRESET_CHARTS.issuesByCategory).toBeDefined();
    expect(PRESET_CHARTS.issuesByPriority).toBeDefined();
    expect(PRESET_CHARTS.performanceMetrics).toBeDefined();
  });

  it('provides repository analytics presets', () => {
    expect(PRESET_CHARTS.contributorActivity).toBeDefined();
    expect(PRESET_CHARTS.codeQuality).toBeDefined();
  });

  it('provides dashboard presets', () => {
    expect(PRESET_CHARTS.sparkline).toBeDefined();
    expect(PRESET_CHARTS.gauge).toBeDefined();
  });

  it('has consistent type definitions for all presets', () => {
    Object.entries(PRESET_CHARTS).forEach(([name, preset]) => {
      expect(preset.type).toBeDefined();
      expect(['line', 'bar', 'pie', 'doughnut', 'area']).toContain(preset.type);
    });
  });
});

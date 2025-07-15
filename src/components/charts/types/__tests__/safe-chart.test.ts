/**
 * Safe Chart Types Tests
 *
 * Tests for type definitions and interfaces in safe-chart.ts
 * Validates type safety and proper configuration structures
 */

import { describe, it, expect } from 'vitest';
import type {
  SafeChartData,
  SafeDataset,
  SafeChartOptions,
  SafeLegendOptions,
  SafeTooltipOptions,
  SafeScaleOptions,
  SafeFontOptions,
  SafeChartConfiguration,
  SafeChartTheme,
  TimeSeriesPoint,
  SafeChartResult,
  CreateChartOptions,
  UpdateChartOptions,
  ResizeChartOptions,
  ExportChartOptions,
  ChartValidationResult,
  ChartPerformanceMetrics,
  ChartAccessibilityOptions,
  SafeChartPlugin,
} from '../safe-chart';

describe('Safe Chart Types', () => {
  describe('SafeChartData', () => {
    it('should validate SafeChartData structure', () => {
      const validData: SafeChartData = {
        labels: ['Jan', 'Feb', 'Mar'],
        datasets: [
          {
            label: 'Test Dataset',
            data: [10, 20, 30],
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1,
          },
        ],
      };

      expect(validData.labels).toEqual(['Jan', 'Feb', 'Mar']);
      expect(validData.datasets).toHaveLength(1);
      expect(validData.datasets[0]?.label).toBe('Test Dataset');
      expect(validData.datasets[0]?.data).toEqual([10, 20, 30]);
    });

    it('should handle optional labels', () => {
      const dataWithoutLabels: SafeChartData = {
        datasets: [
          {
            label: 'Test Dataset',
            data: [10, 20, 30],
          },
        ],
      };

      expect(dataWithoutLabels.labels).toBeUndefined();
      expect(dataWithoutLabels.datasets).toHaveLength(1);
    });

    it('should handle multiple datasets', () => {
      const multiDatasets: SafeChartData = {
        datasets: [
          { label: 'Dataset 1', data: [1, 2, 3] },
          { label: 'Dataset 2', data: [4, 5, 6] },
        ],
      };

      expect(multiDatasets.datasets).toHaveLength(2);
      expect(multiDatasets.datasets[0]?.label).toBe('Dataset 1');
      expect(multiDatasets.datasets[1]?.label).toBe('Dataset 2');
    });
  });

  describe('SafeDataset', () => {
    it('should validate required fields', () => {
      const minimalDataset: SafeDataset = {
        label: 'Test',
        data: [1, 2, 3],
      };

      expect(minimalDataset.label).toBe('Test');
      expect(minimalDataset.data).toEqual([1, 2, 3]);
    });

    it('should handle optional styling properties', () => {
      const styledDataset: SafeDataset = {
        label: 'Styled Dataset',
        data: [1, 2, 3],
        backgroundColor: 'red',
        borderColor: 'blue',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: 'yellow',
        pointBorderColor: 'green',
      };

      expect(styledDataset.backgroundColor).toBe('red');
      expect(styledDataset.borderColor).toBe('blue');
      expect(styledDataset.borderWidth).toBe(2);
      expect(styledDataset.fill).toBe(true);
      expect(styledDataset.tension).toBe(0.4);
      expect(styledDataset.pointRadius).toBe(5);
    });

    it('should handle array color values', () => {
      const arrayColorDataset: SafeDataset = {
        label: 'Array Colors',
        data: [1, 2, 3],
        backgroundColor: ['red', 'green', 'blue'],
        borderColor: ['darkred', 'darkgreen', 'darkblue'],
        pointBackgroundColor: ['yellow', 'orange', 'purple'],
      };

      expect(Array.isArray(arrayColorDataset.backgroundColor)).toBe(true);
      expect(Array.isArray(arrayColorDataset.borderColor)).toBe(true);
      expect(Array.isArray(arrayColorDataset.pointBackgroundColor)).toBe(true);
    });
  });

  describe('SafeChartOptions', () => {
    it('should validate basic options', () => {
      const basicOptions: SafeChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
      };

      expect(basicOptions.responsive).toBe(true);
      expect(basicOptions.maintainAspectRatio).toBe(false);
    });

    it('should handle plugin configuration', () => {
      const optionsWithPlugins: SafeChartOptions = {
        plugins: {
          legend: {
            display: true,
            position: 'top',
          },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(0,0,0,0.8)',
          },
          title: {
            display: true,
            text: 'Test Chart',
          },
        },
      };

      expect(optionsWithPlugins.plugins?.legend?.display).toBe(true);
      expect(optionsWithPlugins.plugins?.legend?.position).toBe('top');
      expect(optionsWithPlugins.plugins?.tooltip?.enabled).toBe(true);
      expect(optionsWithPlugins.plugins?.title?.text).toBe('Test Chart');
    });

    it('should handle scales configuration', () => {
      const optionsWithScales: SafeChartOptions = {
        scales: {
          x: {
            type: 'category',
            display: true,
          },
          y: {
            type: 'linear',
            beginAtZero: true,
          },
        },
      };

      expect(optionsWithScales.scales?.x?.type).toBe('category');
      expect(optionsWithScales.scales?.y?.type).toBe('linear');
      expect(optionsWithScales.scales?.y?.beginAtZero).toBe(true);
    });

    it('should handle animation configuration', () => {
      const optionsWithAnimation: SafeChartOptions = {
        animation: {
          duration: 1000,
          easing: 'easeInOutQuart',
          delay: 100,
          loop: false,
        },
      };

      expect(optionsWithAnimation.animation?.duration).toBe(1000);
      expect(optionsWithAnimation.animation?.easing).toBe('easeInOutQuart');
      expect(optionsWithAnimation.animation?.delay).toBe(100);
      expect(optionsWithAnimation.animation?.loop).toBe(false);
    });
  });

  describe('SafeLegendOptions', () => {
    it('should validate legend configuration', () => {
      const legendConfig: SafeLegendOptions = {
        display: true,
        position: 'bottom',
        labels: {
          color: '#333',
          padding: 10,
          usePointStyle: true,
        },
      };

      expect(legendConfig.display).toBe(true);
      expect(legendConfig.position).toBe('bottom');
      expect(legendConfig.labels?.color).toBe('#333');
      expect(legendConfig.labels?.padding).toBe(10);
      expect(legendConfig.labels?.usePointStyle).toBe(true);
    });

    it('should handle all valid positions', () => {
      const positions: Array<'top' | 'bottom' | 'left' | 'right'> = [
        'top',
        'bottom',
        'left',
        'right',
      ];

      positions.forEach(position => {
        const config: SafeLegendOptions = { position };
        expect(config.position).toBe(position);
      });
    });
  });

  describe('SafeTooltipOptions', () => {
    it('should validate tooltip configuration', () => {
      const tooltipConfig: SafeTooltipOptions = {
        enabled: true,
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#ccc',
        borderWidth: 1,
        cornerRadius: 4,
      };

      expect(tooltipConfig.enabled).toBe(true);
      expect(tooltipConfig.backgroundColor).toBe('rgba(0,0,0,0.8)');
      expect(tooltipConfig.titleColor).toBe('#fff');
      expect(tooltipConfig.borderWidth).toBe(1);
      expect(tooltipConfig.cornerRadius).toBe(4);
    });

    it('should handle tooltip callbacks', () => {
      const tooltipWithCallbacks: SafeTooltipOptions = {
        callbacks: {
          label: context => `${context.label}: ${context.parsed}`,
          title: contexts => `Title: ${contexts[0]?.label}`,
          beforeLabel: context => `Before: ${context.label}`,
          afterLabel: context => `After: ${context.label}`,
        },
      };

      expect(typeof tooltipWithCallbacks.callbacks?.label).toBe('function');
      expect(typeof tooltipWithCallbacks.callbacks?.title).toBe('function');
      expect(typeof tooltipWithCallbacks.callbacks?.beforeLabel).toBe('function');
      expect(typeof tooltipWithCallbacks.callbacks?.afterLabel).toBe('function');
    });
  });

  describe('SafeScaleOptions', () => {
    it('should validate scale configuration', () => {
      const scaleConfig: SafeScaleOptions = {
        type: 'linear',
        display: true,
        beginAtZero: true,
        min: 0,
        max: 100,
      };

      expect(scaleConfig.type).toBe('linear');
      expect(scaleConfig.display).toBe(true);
      expect(scaleConfig.beginAtZero).toBe(true);
      expect(scaleConfig.min).toBe(0);
      expect(scaleConfig.max).toBe(100);
    });

    it('should handle all valid scale types', () => {
      const types: Array<'linear' | 'logarithmic' | 'category' | 'time' | 'timeseries'> = [
        'linear',
        'logarithmic',
        'category',
        'time',
        'timeseries',
      ];

      types.forEach(type => {
        const config: SafeScaleOptions = { type };
        expect(config.type).toBe(type);
      });
    });

    it('should handle ticks configuration', () => {
      const scaleWithTicks: SafeScaleOptions = {
        ticks: {
          color: '#666',
          font: {
            size: 12,
            family: 'Arial',
          },
          callback: value => `${value}%`,
        },
      };

      expect(scaleWithTicks.ticks?.color).toBe('#666');
      expect(scaleWithTicks.ticks?.font?.size).toBe(12);
      expect(scaleWithTicks.ticks?.font?.family).toBe('Arial');
      expect(typeof scaleWithTicks.ticks?.callback).toBe('function');
    });

    it('should handle grid configuration', () => {
      const scaleWithGrid: SafeScaleOptions = {
        grid: {
          display: true,
          color: '#e0e0e0',
          borderColor: '#ccc',
          lineWidth: 1,
        },
      };

      expect(scaleWithGrid.grid?.display).toBe(true);
      expect(scaleWithGrid.grid?.color).toBe('#e0e0e0');
      expect(scaleWithGrid.grid?.borderColor).toBe('#ccc');
      expect(scaleWithGrid.grid?.lineWidth).toBe(1);
    });
  });

  describe('SafeFontOptions', () => {
    it('should validate font configuration', () => {
      const fontConfig: SafeFontOptions = {
        family: 'Arial',
        size: 14,
        style: 'normal',
        weight: 'bold',
        lineHeight: 1.2,
      };

      expect(fontConfig.family).toBe('Arial');
      expect(fontConfig.size).toBe(14);
      expect(fontConfig.style).toBe('normal');
      expect(fontConfig.weight).toBe('bold');
      expect(fontConfig.lineHeight).toBe(1.2);
    });

    it('should handle all valid font styles', () => {
      const styles: Array<'normal' | 'italic' | 'oblique'> = ['normal', 'italic', 'oblique'];

      styles.forEach(style => {
        const config: SafeFontOptions = { style };
        expect(config.style).toBe(style);
      });
    });

    it('should handle numeric weight', () => {
      const fontWithNumericWeight: SafeFontOptions = {
        weight: 400,
      };

      expect(fontWithNumericWeight.weight).toBe(400);
    });
  });

  describe('SafeChartConfiguration', () => {
    it('should validate complete chart configuration', () => {
      const chartConfig: SafeChartConfiguration<'line'> = {
        type: 'line',
        data: {
          labels: ['Jan', 'Feb', 'Mar'],
          datasets: [
            {
              label: 'Test Data',
              data: [10, 20, 30],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
        },
        plugins: [],
      };

      expect(chartConfig.type).toBe('line');
      expect(chartConfig.data.labels).toEqual(['Jan', 'Feb', 'Mar']);
      expect(chartConfig.data.datasets).toHaveLength(1);
      expect(chartConfig.options?.responsive).toBe(true);
      expect(Array.isArray(chartConfig.plugins)).toBe(true);
    });
  });

  describe('SafeChartTheme', () => {
    it('should validate theme configuration', () => {
      const theme: SafeChartTheme = {
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          success: '#28a745',
          warning: '#ffc107',
          error: '#dc3545',
          info: '#17a2b8',
          background: '#ffffff',
          text: '#333333',
          border: '#dee2e6',
        },
        fonts: {
          family: 'Arial, sans-serif',
          size: 12,
        },
        grid: {
          color: '#e0e0e0',
          borderColor: '#cccccc',
        },
      };

      expect(theme.colors.primary).toBe('#007bff');
      expect(theme.colors.secondary).toBe('#6c757d');
      expect(theme.fonts.family).toBe('Arial, sans-serif');
      expect(theme.fonts.size).toBe(12);
      expect(theme.grid.color).toBe('#e0e0e0');
      expect(theme.grid.borderColor).toBe('#cccccc');
    });
  });

  describe('TimeSeriesPoint', () => {
    it('should validate time series data point', () => {
      const point: TimeSeriesPoint = {
        timestamp: new Date('2023-01-01'),
        value: 100,
      };

      expect(point.timestamp).toBeInstanceOf(Date);
      expect(point.value).toBe(100);
    });

    it('should handle multiple time series points', () => {
      const points: TimeSeriesPoint[] = [
        { timestamp: new Date('2023-01-01'), value: 100 },
        { timestamp: new Date('2023-01-02'), value: 150 },
        { timestamp: new Date('2023-01-03'), value: 120 },
      ];

      expect(points).toHaveLength(3);
      points.forEach(point => {
        expect(point.timestamp).toBeInstanceOf(Date);
        expect(typeof point.value).toBe('number');
      });
    });
  });

  describe('SafeChartResult', () => {
    it('should validate successful result', () => {
      const successResult: SafeChartResult<string> = {
        success: true,
        data: 'test data',
      };

      expect(successResult.success).toBe(true);
      if (successResult.success) {
        expect(successResult.data).toBe('test data');
      }
    });

    it('should validate error result', () => {
      const errorResult: SafeChartResult<string> = {
        success: false,
        error: new Error('Test error'),
      };

      expect(errorResult.success).toBe(false);
      if (!errorResult.success) {
        expect(errorResult.error).toBeInstanceOf(Error);
        expect(errorResult.error.message).toBe('Test error');
      }
    });
  });

  describe('CreateChartOptions', () => {
    it('should validate chart creation options', () => {
      // Mock canvas element
      const mockCanvas = document.createElement('canvas');

      const createOptions: CreateChartOptions<'bar'> = {
        canvas: mockCanvas,
        config: {
          type: 'bar',
          data: {
            datasets: [{ label: 'Test', data: [1, 2, 3] }],
          },
        },
        theme: {
          colors: {
            primary: '#007bff',
            secondary: '#6c757d',
            success: '#28a745',
            warning: '#ffc107',
            error: '#dc3545',
            info: '#17a2b8',
            background: '#ffffff',
            text: '#333333',
            border: '#dee2e6',
          },
          fonts: { size: 12 },
          grid: { color: '#e0e0e0', borderColor: '#ccc' },
        },
        onReady: chart => console.log('Chart ready:', chart),
        onError: error => console.error('Chart error:', error),
      };

      expect(createOptions.canvas).toBe(mockCanvas);
      expect(createOptions.config.type).toBe('bar');
      expect(typeof createOptions.onReady).toBe('function');
      expect(typeof createOptions.onError).toBe('function');
    });
  });

  describe('ChartValidationResult', () => {
    it('should validate chart validation result', () => {
      const validationResult: ChartValidationResult = {
        valid: true,
        errors: [],
        warnings: ['Minor issue detected'],
      };

      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
      expect(validationResult.warnings).toHaveLength(1);
      expect(validationResult.warnings[0]).toBe('Minor issue detected');
    });

    it('should handle invalid validation result', () => {
      const invalidResult: ChartValidationResult = {
        valid: false,
        errors: ['Missing required field', 'Invalid data type'],
        warnings: [],
      };

      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toHaveLength(2);
      expect(invalidResult.warnings).toHaveLength(0);
    });
  });

  describe('ChartPerformanceMetrics', () => {
    it('should validate performance metrics', () => {
      const metrics: ChartPerformanceMetrics = {
        renderTime: 50,
        updateTime: 25,
        resizeTime: 15,
        memoryUsage: 1024,
        animationFrames: 60,
      };

      expect(metrics.renderTime).toBe(50);
      expect(metrics.updateTime).toBe(25);
      expect(metrics.resizeTime).toBe(15);
      expect(metrics.memoryUsage).toBe(1024);
      expect(metrics.animationFrames).toBe(60);
    });
  });

  describe('ChartAccessibilityOptions', () => {
    it('should validate accessibility options', () => {
      const a11yOptions: ChartAccessibilityOptions = {
        enabled: true,
        announceNewData: true,
        description: 'Chart showing sales data',
        title: 'Sales Chart',
        role: 'img',
        label: 'Sales data visualization',
      };

      expect(a11yOptions.enabled).toBe(true);
      expect(a11yOptions.announceNewData).toBe(true);
      expect(a11yOptions.description).toBe('Chart showing sales data');
      expect(a11yOptions.title).toBe('Sales Chart');
      expect(a11yOptions.role).toBe('img');
      expect(a11yOptions.label).toBe('Sales data visualization');
    });
  });

  describe('SafeChartPlugin', () => {
    it('should validate plugin interface', () => {
      const plugin: SafeChartPlugin = {
        id: 'test-plugin',
        beforeInit: chart => console.log('Before init:', chart),
        afterInit: chart => console.log('After init:', chart),
        beforeUpdate: chart => console.log('Before update:', chart),
        afterUpdate: chart => console.log('After update:', chart),
        beforeRender: chart => console.log('Before render:', chart),
        afterRender: chart => console.log('After render:', chart),
        beforeDraw: chart => console.log('Before draw:', chart),
        afterDraw: chart => console.log('After draw:', chart),
        beforeDestroy: chart => console.log('Before destroy:', chart),
        afterDestroy: chart => console.log('After destroy:', chart),
        resize: (chart, size) => console.log('Resize:', chart, size),
      };

      expect(plugin.id).toBe('test-plugin');
      expect(typeof plugin.beforeInit).toBe('function');
      expect(typeof plugin.afterInit).toBe('function');
      expect(typeof plugin.beforeUpdate).toBe('function');
      expect(typeof plugin.afterUpdate).toBe('function');
      expect(typeof plugin.beforeRender).toBe('function');
      expect(typeof plugin.afterRender).toBe('function');
      expect(typeof plugin.beforeDraw).toBe('function');
      expect(typeof plugin.afterDraw).toBe('function');
      expect(typeof plugin.beforeDestroy).toBe('function');
      expect(typeof plugin.afterDestroy).toBe('function');
      expect(typeof plugin.resize).toBe('function');
    });
  });

  describe('Update and Resize Options', () => {
    it('should validate update options', () => {
      const updateOptions: UpdateChartOptions = {
        mode: 'resize',
        duration: 1000,
        lazy: true,
      };

      expect(updateOptions.mode).toBe('resize');
      expect(updateOptions.duration).toBe(1000);
      expect(updateOptions.lazy).toBe(true);
    });

    it('should validate resize options', () => {
      const resizeOptions: ResizeChartOptions = {
        width: 800,
        height: 600,
        devicePixelRatio: 2,
      };

      expect(resizeOptions.width).toBe(800);
      expect(resizeOptions.height).toBe(600);
      expect(resizeOptions.devicePixelRatio).toBe(2);
    });

    it('should validate export options', () => {
      const exportOptions: ExportChartOptions = {
        format: 'png',
        quality: 0.8,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      };

      expect(exportOptions.format).toBe('png');
      expect(exportOptions.quality).toBe(0.8);
      expect(exportOptions.backgroundColor).toBe('#ffffff');
      expect(exportOptions.pixelRatio).toBe(2);
    });
  });
});

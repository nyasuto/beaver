/**
 * @jest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateChartData,
  validateChartOptions,
  convertToChartJSData,
  convertToChartJSOptions,
  createSafeChart,
  updateSafeChart,
  resizeSafeChart,
  exportSafeChart,
  destroySafeChart,
  createSafeDataset,
  mergeSafeDatasets,
  normalizeSafeChartData,
  debounce,
  throttle,
} from '../utils/safe-wrapper';
import type { SafeChartData, SafeChartOptions, SafeChart } from '../types/safe-chart';

// Mock Chart.js
const mockChart = {
  update: vi.fn(),
  resize: vi.fn(),
  render: vi.fn(),
  destroy: vi.fn(),
  toBase64Image: vi.fn().mockReturnValue('data:image/png;base64,mock'),
  getElementsAtEventForMode: vi.fn().mockReturnValue([]),
};

vi.mock('chart.js', () => {
  class MockChart {
    update = vi.fn();
    resize = vi.fn();
    render = vi.fn();
    destroy = vi.fn();
    toBase64Image = vi.fn().mockReturnValue('data:image/png;base64,mock');
    getElementsAtEventForMode = vi.fn().mockReturnValue([]);

    constructor() {
      // Copy methods from mockChart for test assertions
      this.update = mockChart.update;
      this.resize = mockChart.resize;
      this.render = mockChart.render;
      this.destroy = mockChart.destroy;
      this.toBase64Image = mockChart.toBase64Image;
      this.getElementsAtEventForMode = mockChart.getElementsAtEventForMode;
    }
  }

  return {
    Chart: MockChart,
  };
});

describe('validateChartData', () => {
  it('validates valid chart data', () => {
    const validData: SafeChartData<'line'> = {
      labels: ['A', 'B', 'C'],
      datasets: [
        {
          label: 'Dataset 1',
          data: [1, 2, 3],
          borderColor: '#3b82f6',
        },
      ],
    };

    const result = validateChartData(validData);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects missing datasets', () => {
    const invalidData: SafeChartData<'line'> = {
      labels: ['A', 'B', 'C'],
      datasets: [],
    };

    const result = validateChartData(invalidData);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Chart data must contain at least one dataset');
  });

  it('detects missing dataset labels', () => {
    const dataWithoutLabel: SafeChartData<'line'> = {
      labels: ['A', 'B', 'C'],
      datasets: [
        {
          label: '',
          data: [1, 2, 3],
        },
      ],
    };

    const result = validateChartData(dataWithoutLabel);
    expect(result.warnings).toContain('Dataset 0 is missing a label');
  });

  it('detects empty dataset data', () => {
    const emptyDataset: SafeChartData<'line'> = {
      labels: ['A', 'B', 'C'],
      datasets: [
        {
          label: 'Empty Dataset',
          data: [],
        },
      ],
    };

    const result = validateChartData(emptyDataset);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Dataset 0 has no data points');
  });

  it('detects invalid numeric values', () => {
    const invalidNumbers: SafeChartData<'line'> = {
      labels: ['A', 'B', 'C'],
      datasets: [
        {
          label: 'Invalid Dataset',
          data: [1, NaN, 3],
        },
      ],
    };

    const result = validateChartData(invalidNumbers);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Dataset 0 contains invalid numeric values');
  });

  it('warns about label/data length mismatch', () => {
    const mismatchedData: SafeChartData<'line'> = {
      labels: ['A', 'B'],
      datasets: [
        {
          label: 'Dataset',
          data: [1, 2, 3],
        },
      ],
    };

    const result = validateChartData(mismatchedData);
    expect(result.warnings).toContain('Number of labels does not match number of data points');
  });
});

describe('validateChartOptions', () => {
  it('validates valid chart options', () => {
    const validOptions: SafeChartOptions<'line'> = {
      responsive: true,
      animation: {
        duration: 300,
      },
    };

    const result = validateChartOptions(validOptions);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects negative animation duration', () => {
    const invalidOptions: SafeChartOptions<'line'> = {
      animation: {
        duration: -100,
      },
    };

    const result = validateChartOptions(invalidOptions);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Animation duration must be non-negative');
  });

  it('detects invalid scale min/max values', () => {
    const invalidScaleOptions: SafeChartOptions<'line'> = {
      scales: {
        y: {
          min: 100,
          max: 50,
        },
      },
    };

    const result = validateChartOptions(invalidScaleOptions);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Scale 'y' min value must be less than max value");
  });
});

describe('convertToChartJSData', () => {
  it('converts valid data successfully', () => {
    const safeData: SafeChartData<'line'> = {
      labels: ['A', 'B', 'C'],
      datasets: [
        {
          label: 'Dataset 1',
          data: [1, 2, 3],
        },
      ],
    };

    const result = convertToChartJSData(safeData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.labels).toEqual(['A', 'B', 'C']);
      expect(result.data.datasets).toHaveLength(1);
    }
  });

  it('fails with invalid data', () => {
    const invalidData: SafeChartData<'line'> = {
      datasets: [],
    };

    const result = convertToChartJSData(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Chart data validation failed');
    }
  });
});

describe('convertToChartJSOptions', () => {
  it('converts valid options successfully', () => {
    const safeOptions: SafeChartOptions<'line'> = {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 300,
      },
    };

    const result = convertToChartJSOptions(safeOptions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.responsive).toBe(true);
      expect(result.data.maintainAspectRatio).toBe(false);
    }
  });

  it('applies defaults for undefined options', () => {
    const minimalOptions: SafeChartOptions<'line'> = {};

    const result = convertToChartJSOptions(minimalOptions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.responsive).toBe(true);
      expect(result.data.maintainAspectRatio).toBe(false);
    }
  });

  it('fails with invalid options', () => {
    const invalidOptions: SafeChartOptions<'line'> = {
      animation: {
        duration: -100,
      },
    };

    const result = convertToChartJSOptions(invalidOptions);
    expect(result.success).toBe(false);
  });
});

describe('createSafeChart', () => {
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    mockCanvas = document.createElement('canvas');
    vi.clearAllMocks();
  });

  it('creates a safe chart successfully', () => {
    const validData: SafeChartData<'line'> = {
      labels: ['A', 'B', 'C'],
      datasets: [{ label: 'Dataset', data: [1, 2, 3] }],
    };

    const result = createSafeChart({
      canvas: mockCanvas,
      config: {
        type: 'line',
        data: validData,
        options: { responsive: true },
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.update).toBeDefined();
      expect(result.data.destroy).toBeDefined();
    }
  });

  it('calls onReady callback', async () => {
    const validData: SafeChartData<'line'> = {
      datasets: [{ label: 'Dataset', data: [1, 2, 3] }],
    };

    const onReady = vi.fn();

    createSafeChart({
      canvas: mockCanvas,
      config: { type: 'line', data: validData },
      onReady,
    });

    await new Promise(resolve => setTimeout(resolve, 10));
    expect(onReady).toHaveBeenCalled();
  });

  it('handles chart creation errors', () => {
    const invalidData: SafeChartData<'line'> = {
      datasets: [],
    };

    const result = createSafeChart({
      canvas: mockCanvas,
      config: { type: 'line', data: invalidData },
    });

    expect(result.success).toBe(false);
  });
});

describe('Chart wrapper functions', () => {
  let mockSafeChart: SafeChart<'line'>;

  beforeEach(() => {
    mockSafeChart = {
      config: { type: 'line', data: { datasets: [] } },
      data: { datasets: [] },
      options: {},
      update: vi.fn(),
      resize: vi.fn(),
      render: vi.fn(),
      destroy: vi.fn(),
      toBase64Image: vi.fn().mockReturnValue('mock-base64'),
      getElementsAtEventForMode: vi.fn().mockReturnValue([]),
    };
  });

  describe('updateSafeChart', () => {
    it('updates chart with valid data', () => {
      const newData: SafeChartData<'line'> = {
        datasets: [{ label: 'New Dataset', data: [4, 5, 6] }],
      };

      const result = updateSafeChart(mockSafeChart, newData);
      expect(result.success).toBe(true);
      expect(mockSafeChart.update).toHaveBeenCalledWith('none');
    });

    it('fails with invalid data', () => {
      const invalidData: SafeChartData<'line'> = {
        datasets: [],
      };

      const result = updateSafeChart(mockSafeChart, invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('resizeSafeChart', () => {
    it('resizes chart successfully', () => {
      const result = resizeSafeChart(mockSafeChart, { width: 800, height: 400 });
      expect(result.success).toBe(true);
      expect(mockSafeChart.resize).toHaveBeenCalledWith(800, 400);
    });
  });

  describe('exportSafeChart', () => {
    it('exports chart as base64', () => {
      const result = exportSafeChart(mockSafeChart);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('mock-base64');
      }
    });
  });

  describe('destroySafeChart', () => {
    it('destroys chart safely', () => {
      const result = destroySafeChart(mockSafeChart);
      expect(result.success).toBe(true);
      expect(mockSafeChart.destroy).toHaveBeenCalled();
    });
  });
});

describe('Dataset utilities', () => {
  describe('createSafeDataset', () => {
    it('creates a dataset with basic properties', () => {
      const dataset = createSafeDataset('Test Dataset', [1, 2, 3]);
      expect(dataset.label).toBe('Test Dataset');
      expect(dataset.data).toEqual([1, 2, 3]);
    });

    it('merges additional options', () => {
      const dataset = createSafeDataset('Test Dataset', [1, 2, 3], {
        borderColor: '#ff0000',
        backgroundColor: '#00ff00',
      });
      expect(dataset.borderColor).toBe('#ff0000');
      expect(dataset.backgroundColor).toBe('#00ff00');
    });
  });

  describe('mergeSafeDatasets', () => {
    it('filters out empty datasets', () => {
      const datasets = [
        { label: 'Valid', data: [1, 2, 3] },
        { label: 'Empty', data: [] },
        { label: 'Another Valid', data: [4, 5] },
      ];

      const result = mergeSafeDatasets(datasets);
      expect(result).toHaveLength(2);
      expect(result[0]?.label).toBe('Valid');
      expect(result[1]?.label).toBe('Another Valid');
    });
  });

  describe('normalizeSafeChartData', () => {
    it('truncates data to match maximum dataset length', () => {
      const data: SafeChartData<'line'> = {
        labels: ['A', 'B', 'C', 'D', 'E'], // Longer than datasets
        datasets: [
          { label: 'Dataset 1', data: [1, 2, 3] },
          { label: 'Dataset 2', data: [4, 5] },
        ],
      };

      const normalized = normalizeSafeChartData(data);
      expect(normalized.labels).toHaveLength(3); // Truncated to maxLength (3)
      expect(normalized.labels).toEqual(['A', 'B', 'C']);
      expect(normalized.datasets[0]?.data).toHaveLength(3);
      expect(normalized.datasets[1]?.data).toHaveLength(2); // Truncated to original length
    });

    it('generates labels when missing', () => {
      const data: SafeChartData<'line'> = {
        datasets: [{ label: 'Dataset', data: [1, 2, 3] }],
      };

      const normalized = normalizeSafeChartData(data);
      expect(normalized.labels).toEqual(['Point 1', 'Point 2', 'Point 3']);
    });
  });
});

describe('Utility functions', () => {
  describe('debounce', () => {
    it('debounces function calls', async () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn('arg1');
      debouncedFn('arg2');
      debouncedFn('arg3');

      expect(mockFn).not.toHaveBeenCalled();

      await new Promise(resolve => setTimeout(resolve, 150));
      expect(mockFn).toHaveBeenCalledOnce();
      expect(mockFn).toHaveBeenCalledWith('arg3');
    });
  });

  describe('throttle', () => {
    it('throttles function calls', async () => {
      const mockFn = vi.fn();
      const throttledFn = throttle(mockFn, 100);

      throttledFn('arg1');
      throttledFn('arg2');
      throttledFn('arg3');

      expect(mockFn).toHaveBeenCalledOnce();
      expect(mockFn).toHaveBeenCalledWith('arg1');

      await new Promise(resolve => setTimeout(resolve, 150));
      throttledFn('arg4');
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenLastCalledWith('arg4');
    });
  });
});

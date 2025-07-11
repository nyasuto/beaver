/**
 * Type-safe Chart.js wrapper functions
 *
 * Provides safe, type-checked functions for Chart.js operations
 * with proper error handling and null safety.
 *
 * @module SafeChartWrapper
 */

import {
  Chart as ChartJS,
  type ChartType,
  type ChartData,
  type ChartOptions,
  type ChartConfiguration,
} from 'chart.js';

import type {
  SafeChartData,
  SafeChartOptions,
  SafeChartConfiguration,
  SafeChart,
  SafeChartResult,
  CreateChartOptions,
  UpdateChartOptions,
  ResizeChartOptions,
  ExportChartOptions,
  ChartValidationResult,
  SafeChartTheme,
  SafeDataset,
  SafeTooltipContext,
} from '../types/safe-chart';

// Re-export types for external use
export type {
  SafeChartData,
  SafeChartOptions,
  SafeChartConfiguration,
  SafeChart,
  SafeChartResult,
  CreateChartOptions,
  UpdateChartOptions,
  ResizeChartOptions,
  ExportChartOptions,
  ChartValidationResult,
  SafeChartTheme,
  SafeDataset,
  SafeTooltipContext,
};

/**
 * Validates chart data for type safety
 */
export function validateChartData<T extends ChartType>(
  data: SafeChartData<T>
): ChartValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if datasets exist
  if (!data.datasets || data.datasets.length === 0) {
    errors.push('Chart data must contain at least one dataset');
  }

  // Validate each dataset
  data.datasets.forEach((dataset, index) => {
    if (!dataset.label) {
      warnings.push(`Dataset ${index} is missing a label`);
    }

    if (!dataset.data || dataset.data.length === 0) {
      errors.push(`Dataset ${index} has no data points`);
    }

    // Check for NaN or invalid values
    if (dataset.data.some(value => typeof value !== 'number' || isNaN(value))) {
      errors.push(`Dataset ${index} contains invalid numeric values`);
    }
  });

  // Check labels consistency
  if (data.labels) {
    const maxDataLength = Math.max(...data.datasets.map(d => d.data.length));
    if (data.labels.length !== maxDataLength) {
      warnings.push('Number of labels does not match number of data points');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates chart options for type safety
 */
export function validateChartOptions<T extends ChartType>(
  options: SafeChartOptions<T>
): ChartValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate animation duration
  if (options.animation?.duration && options.animation.duration < 0) {
    errors.push('Animation duration must be non-negative');
  }

  // Validate scale options
  if (options.scales) {
    Object.entries(options.scales).forEach(([scaleId, scale]) => {
      if (scale && scale.min !== undefined && scale.max !== undefined && scale.min >= scale.max) {
        errors.push(`Scale '${scaleId}' min value must be less than max value`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Converts safe chart data to Chart.js format
 */
export function convertToChartJSData<T extends ChartType>(
  data: SafeChartData<T>
): SafeChartResult<ChartData<T>> {
  const validation = validateChartData(data);
  if (!validation.valid) {
    return {
      success: false,
      error: new Error(`Chart data validation failed: ${validation.errors.join(', ')}`),
    };
  }

  try {
    const chartData: ChartData<T> = {
      labels: data.labels || [],
      datasets: data.datasets.map(dataset => ({
        ...dataset,
        data: dataset.data as never, // Type assertion for Chart.js compatibility
      })) as never,
    };

    return { success: true, data: chartData };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Failed to convert chart data'),
    };
  }
}

/**
 * Converts safe chart options to Chart.js format
 */
export function convertToChartJSOptions<T extends ChartType>(
  options: SafeChartOptions<T>,
  _theme?: SafeChartTheme
): SafeChartResult<ChartOptions<T>> {
  const validation = validateChartOptions(options);
  if (!validation.valid) {
    return {
      success: false,
      error: new Error(`Chart options validation failed: ${validation.errors.join(', ')}`),
    };
  }

  try {
    // Use type assertion to bypass complex Chart.js type checking
    const chartOptions = {
      responsive: options.responsive ?? true,
      maintainAspectRatio: options.maintainAspectRatio ?? false,
      plugins: options.plugins || {},
      scales: options.scales || {},
      animation: options.animation,
      onClick: options.onClick,
      onHover: options.onHover,
    } as ChartOptions<T>;

    return { success: true, data: chartOptions };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Failed to convert chart options'),
    };
  }
}

/**
 * Creates a safe Chart.js instance
 */
export function createSafeChart<T extends ChartType>(
  options: CreateChartOptions<T>
): SafeChartResult<SafeChart<T>> {
  try {
    const { canvas, config, theme, onReady, onError } = options;

    // Validate configuration
    const dataResult = convertToChartJSData(config.data);
    if (!dataResult.success) {
      return dataResult;
    }

    const optionsResult = convertToChartJSOptions(config.options || {}, theme);
    if (!optionsResult.success) {
      return optionsResult;
    }

    // Create Chart.js configuration
    const chartConfig = {
      type: config.type,
      data: dataResult.data,
      options: optionsResult.data,
      plugins: config.plugins,
    } as ChartConfiguration<T>;

    // Create Chart.js instance
    const chart = new ChartJS(canvas, chartConfig);

    // Create safe wrapper
    const safeChart: SafeChart<T> = {
      config: config,
      data: config.data,
      options: config.options || {},
      update: (mode = 'none') => {
        try {
          chart.update(mode);
        } catch (error) {
          console.error('Chart update failed:', error);
          onError?.(error instanceof Error ? error : new Error('Chart update failed'));
        }
      },
      resize: (width, height) => {
        try {
          chart.resize(width, height);
        } catch (error) {
          console.error('Chart resize failed:', error);
          onError?.(error instanceof Error ? error : new Error('Chart resize failed'));
        }
      },
      render: () => {
        try {
          chart.render();
        } catch (error) {
          console.error('Chart render failed:', error);
          onError?.(error instanceof Error ? error : new Error('Chart render failed'));
        }
      },
      destroy: () => {
        try {
          chart.destroy();
        } catch (error) {
          console.error('Chart destroy failed:', error);
          onError?.(error instanceof Error ? error : new Error('Chart destroy failed'));
        }
      },
      toBase64Image: () => {
        try {
          return chart.toBase64Image();
        } catch (error) {
          console.error('Chart export failed:', error);
          onError?.(error instanceof Error ? error : new Error('Chart export failed'));
          return '';
        }
      },
      getElementsAtEventForMode: (event, mode, options, useFinalPosition) => {
        try {
          return chart.getElementsAtEventForMode(
            event,
            mode,
            options as never,
            useFinalPosition
          ) as never;
        } catch (error) {
          console.error('Chart element detection failed:', error);
          onError?.(error instanceof Error ? error : new Error('Chart element detection failed'));
          return [];
        }
      },
    };

    // Notify ready callback
    if (onReady) {
      setTimeout(() => onReady(safeChart), 0);
    }

    return { success: true, data: safeChart };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Failed to create chart'),
    };
  }
}

/**
 * Safely updates a chart with new data
 */
export function updateSafeChart<T extends ChartType>(
  chart: SafeChart<T>,
  data: SafeChartData<T>,
  _options?: UpdateChartOptions
): SafeChartResult<void> {
  try {
    const validation = validateChartData(data);
    if (!validation.valid) {
      return {
        success: false,
        error: new Error(`Chart data validation failed: ${validation.errors.join(', ')}`),
      };
    }

    chart.data = data;
    chart.update('none');

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Failed to update chart'),
    };
  }
}

/**
 * Safely resizes a chart
 */
export function resizeSafeChart<T extends ChartType>(
  chart: SafeChart<T>,
  options: ResizeChartOptions
): SafeChartResult<void> {
  try {
    chart.resize(options.width, options.height);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Failed to resize chart'),
    };
  }
}

/**
 * Safely exports a chart to base64
 */
export function exportSafeChart<T extends ChartType>(
  chart: SafeChart<T>,
  _options: ExportChartOptions = {}
): SafeChartResult<string> {
  try {
    const base64 = chart.toBase64Image();
    return { success: true, data: base64 };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Failed to export chart'),
    };
  }
}

/**
 * Safely destroys a chart
 */
export function destroySafeChart<T extends ChartType>(chart: SafeChart<T>): SafeChartResult<void> {
  try {
    chart.destroy();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Failed to destroy chart'),
    };
  }
}

/**
 * Creates a safe dataset with proper type checking
 */
export function createSafeDataset<T extends ChartType>(
  label: string,
  data: number[],
  options: Partial<SafeDataset<T>> = {}
): SafeDataset<T> {
  return {
    label,
    data,
    ...options,
  };
}

/**
 * Merges multiple datasets safely
 */
export function mergeSafeDatasets<T extends ChartType>(
  datasets: SafeDataset<T>[]
): SafeDataset<T>[] {
  return datasets.filter(dataset => dataset.data.length > 0);
}

/**
 * Normalizes chart data for consistent display
 */
export function normalizeSafeChartData<T extends ChartType>(
  data: SafeChartData<T>
): SafeChartData<T> {
  const maxLength = Math.max(...data.datasets.map(d => d.data.length));

  return {
    ...data,
    labels:
      data.labels?.slice(0, maxLength) ||
      Array.from({ length: maxLength }, (_, i) => `Point ${i + 1}`),
    datasets: data.datasets.map(dataset => ({
      ...dataset,
      data: dataset.data.slice(0, maxLength),
    })),
  };
}

/**
 * Debounce function for chart updates
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Throttle function for chart updates
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

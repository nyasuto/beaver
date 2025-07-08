/**
 * Base Chart Component
 *
 * A foundational React component that provides Chart.js integration
 * with theme support, responsive behavior, and TypeScript safety.
 *
 * @module BaseChart
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartType,
  type ChartData,
  type ChartOptions,
  type Chart,
} from 'chart.js';
import {
  LIGHT_THEME,
  DARK_THEME,
  generateChartOptions,
  debounce,
  type ChartTheme,
} from '../../lib/utils/chart';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * Base chart component props
 */
export interface BaseChartProps<T extends ChartType> {
  /** Chart type */
  type: T;
  /** Chart data */
  data: ChartData<T>;
  /** Chart options */
  options?: Partial<ChartOptions<T>>;
  /** Chart theme */
  theme?: ChartTheme;
  /** Whether to use dark theme */
  isDarkMode?: boolean;
  /** Chart width */
  width?: number;
  /** Chart height */
  height?: number;
  /** Chart CSS class */
  className?: string;
  /** Loading state */
  loading?: boolean;
  /** Error state */
  error?: string;
  /** Chart update mode */
  updateMode?: 'resize' | 'reset' | 'none';
  /** Animation duration */
  animationDuration?: number;
  /** Responsive behavior */
  responsive?: boolean;
  /** Callback when chart is ready */
  onChartReady?: (chart: Chart<T>) => void;
  /** Callback when chart is clicked */
  onChartClick?: (event: any, elements: any[]) => void;
  /** Callback when chart is hovered */
  onChartHover?: (event: any, elements: any[]) => void;
}

/**
 * Base Chart Component
 *
 * Provides foundational Chart.js integration with theme support and responsive behavior
 */
export function BaseChart<T extends ChartType>({
  type,
  data,
  options = {},
  theme,
  isDarkMode = false,
  width,
  height,
  className = '',
  loading = false,
  error,
  updateMode = 'resize',
  animationDuration = 300,
  responsive = true,
  onChartReady,
  onChartClick,
  onChartHover,
}: BaseChartProps<T>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart<T> | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Select theme based on mode
  const currentTheme = theme || (isDarkMode ? DARK_THEME : LIGHT_THEME);

  // Generate chart options with theme
  const chartOptions = generateChartOptions(type, currentTheme, {
    responsive,
    maintainAspectRatio: !height,
    animation: {
      duration: animationDuration,
    },
    onClick: onChartClick,
    onHover: onChartHover,
    ...options,
  });

  // Debounced chart update function
  const debouncedUpdate = useCallback(
    debounce(() => {
      if (chartRef.current) {
        chartRef.current.update(updateMode);
      }
    }, 150),
    [updateMode]
  );

  // Initialize chart
  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    // Create new chart
    chartRef.current = new ChartJS(ctx, {
      type,
      data,
      options: chartOptions,
    });

    setIsReady(true);

    // Notify parent component
    if (onChartReady) {
      onChartReady(chartRef.current);
    }

    // Cleanup function
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [type, currentTheme, responsive, animationDuration]);

  // Update chart when data changes
  useEffect(() => {
    if (!chartRef.current || !isReady) return;

    chartRef.current.data = data;
    chartRef.current.options = chartOptions;
    debouncedUpdate();
  }, [data, chartOptions, debouncedUpdate, isReady]);

  // Handle resize
  useEffect(() => {
    if (!chartRef.current || !responsive) return;

    const resizeObserver = new ResizeObserver(() => {
      if (chartRef.current) {
        chartRef.current.resize();
      }
    });

    const container = canvasRef.current?.parentElement;
    if (container) {
      resizeObserver.observe(container);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [responsive]);

  // Loading state
  if (loading) {
    return (
      <div className={`chart-loading ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading chart...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`chart-error ${className}`}>
        <div className="flex items-center justify-center h-64 text-red-600">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <p className="text-sm font-medium">Chart Error</p>
            <p className="text-xs text-gray-500 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Chart canvas
  return (
    <div className={`chart-container ${className}`} style={{ width, height }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`${type} chart`}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}

/**
 * Higher-order component for chart theming
 */
export function withChartTheme<T extends ChartType>(
  WrappedComponent: React.ComponentType<BaseChartProps<T>>
) {
  return function ThemedChart(props: BaseChartProps<T>) {
    const [isDarkMode, setIsDarkMode] = useState(false);

    // Listen for theme changes
    useEffect(() => {
      const handleThemeChange = () => {
        const isDark =
          window.matchMedia('(prefers-color-scheme: dark)').matches ||
          document.documentElement.classList.contains('dark');
        setIsDarkMode(isDark);
      };

      handleThemeChange();

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', handleThemeChange);

      const observer = new MutationObserver(handleThemeChange);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      });

      return () => {
        mediaQuery.removeEventListener('change', handleThemeChange);
        observer.disconnect();
      };
    }, []);

    return <WrappedComponent {...props} isDarkMode={isDarkMode} />;
  };
}

/**
 * Chart container component for consistent styling
 */
export interface ChartContainerProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

export function ChartContainer({
  title,
  description,
  children,
  className = '',
  actions,
}: ChartContainerProps) {
  return (
    <div
      className={`chart-container bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}
    >
      {(title || description || actions) && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
              )}
              {description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
              )}
            </div>
            {actions && <div className="flex items-center space-x-2">{actions}</div>}
          </div>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

export default BaseChart;

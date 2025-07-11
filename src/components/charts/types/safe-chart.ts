/**
 * Type-safe Chart.js wrapper types
 *
 * Provides simplified, type-safe interfaces for Chart.js integration
 * while maintaining full compatibility with Chart.js functionality.
 *
 * @module SafeChartTypes
 */

import type { ChartType, Element, Plugin, Chart } from 'chart.js';

/**
 * Safe Chart.js data structure with proper null safety
 */
export interface SafeChartData<T extends ChartType = ChartType> {
  labels?: string[];
  datasets: SafeDataset<T>[];
}

/**
 * Safe dataset configuration
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface SafeDataset<T extends ChartType = ChartType> {
  label: string;
  data: number[];
  backgroundColor?: string | string[] | undefined;
  borderColor?: string | string[] | undefined;
  borderWidth?: number | undefined;
  fill?: boolean | undefined;
  tension?: number | undefined;
  pointRadius?: number | undefined;
  pointBackgroundColor?: string | string[] | undefined;
  pointBorderColor?: string | string[] | undefined;
  [key: string]: unknown;
}

/**
 * Safe Chart.js options with proper type constraints
 */
export interface SafeChartOptions<T extends ChartType = ChartType> {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  plugins?: {
    legend?: SafeLegendOptions;
    tooltip?: SafeTooltipOptions<T>;
    title?: SafeTitleOptions;
    [key: string]: unknown;
  };
  scales?: {
    x?: SafeScaleOptions;
    y?: SafeScaleOptions;
    [key: string]: SafeScaleOptions | undefined;
  };
  animation?: SafeAnimationOptions;
  onClick?: ((event: Event, elements: Element[]) => void) | undefined;
  onHover?: ((event: Event, elements: Element[]) => void) | undefined;
  [key: string]: unknown;
}

/**
 * Safe legend configuration
 */
export interface SafeLegendOptions {
  display?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  labels?: {
    color?: string;
    font?: SafeFontOptions;
    padding?: number;
    usePointStyle?: boolean;
    filter?: (item: unknown) => boolean;
    [key: string]: unknown;
  };
  onClick?: (event: Event, item: unknown) => void;
  [key: string]: unknown;
}

/**
 * Safe tooltip configuration
 */
export interface SafeTooltipOptions<T extends ChartType = ChartType> {
  enabled?: boolean;
  backgroundColor?: string;
  titleColor?: string;
  bodyColor?: string;
  borderColor?: string;
  borderWidth?: number;
  cornerRadius?: number;
  callbacks?: {
    label?: (context: SafeTooltipContext<T>) => string;
    title?: (context: SafeTooltipContext<T>[]) => string;
    beforeLabel?: (context: SafeTooltipContext<T>) => string;
    afterLabel?: (context: SafeTooltipContext<T>) => string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Safe tooltip context
 */
export interface SafeTooltipContext<T extends ChartType = ChartType> {
  chart: Chart<T>;
  label: string;
  parsed: number | { x: number; y: number };
  raw: number;
  dataset: SafeDataset<T>;
  datasetIndex: number;
  dataIndex: number;
  [key: string]: unknown;
}

/**
 * Safe title configuration
 */
export interface SafeTitleOptions {
  display?: boolean;
  text?: string | string[];
  color?: string;
  font?: SafeFontOptions;
  padding?: number;
  [key: string]: unknown;
}

/**
 * Safe scale configuration
 */
export interface SafeScaleOptions {
  type?: 'linear' | 'logarithmic' | 'category' | 'time' | 'timeseries';
  display?: boolean;
  beginAtZero?: boolean;
  min?: number;
  max?: number;
  ticks?: {
    color?: string;
    font?: SafeFontOptions;
    callback?: (value: number, index: number, values: number[]) => string;
    [key: string]: unknown;
  };
  grid?: {
    display?: boolean;
    color?: string;
    borderColor?: string;
    lineWidth?: number;
    [key: string]: unknown;
  };
  title?: {
    display?: boolean;
    text?: string;
    color?: string;
    font?: SafeFontOptions;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Safe font configuration
 */
export interface SafeFontOptions {
  family?: string;
  size?: number;
  style?: 'normal' | 'italic' | 'oblique';
  weight?: string | number;
  lineHeight?: number;
  [key: string]: unknown;
}

/**
 * Safe animation configuration
 */
export interface SafeAnimationOptions {
  duration?: number;
  easing?: string;
  delay?: number;
  loop?: boolean;
  [key: string]: unknown;
}

/**
 * Safe Chart.js configuration
 */
export interface SafeChartConfiguration<T extends ChartType = ChartType> {
  type: T;
  data: SafeChartData<T>;
  options?: SafeChartOptions<T>;
  plugins?: Plugin<T>[];
}

/**
 * Safe Chart.js instance
 */
export interface SafeChart<T extends ChartType = ChartType> {
  config: SafeChartConfiguration<T>;
  data: SafeChartData<T>;
  options: SafeChartOptions<T>;
  update: (mode?: 'none' | 'resize' | 'reset' | 'hide' | 'show') => void;
  resize: (width?: number, height?: number) => void;
  render: () => void;
  destroy: () => void;
  toBase64Image: () => string;
  getElementsAtEventForMode: (
    event: Event,
    mode: string,
    options: unknown,
    useFinalPosition: boolean
  ) => Element[];
  [key: string]: unknown;
}

/**
 * Chart theme configuration
 */
export interface SafeChartTheme {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    background: string;
    text: string;
    border: string;
  };
  fonts: SafeFontOptions;
  grid: {
    color: string;
    borderColor: string;
  };
}

/**
 * Time series data point
 */
export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
}

/**
 * Result type for error handling
 */
export type SafeChartResult<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Chart creation options
 */
export interface CreateChartOptions<T extends ChartType = ChartType> {
  canvas: HTMLCanvasElement;
  config: SafeChartConfiguration<T>;
  theme?: SafeChartTheme;
  onReady?: (chart: SafeChart<T>) => void;
  onError?: (error: Error) => void;
}

/**
 * Chart update options
 */
export interface UpdateChartOptions {
  mode?: 'none' | 'resize' | 'reset' | 'hide' | 'show';
  duration?: number;
  lazy?: boolean;
}

/**
 * Chart resize options
 */
export interface ResizeChartOptions {
  width?: number;
  height?: number;
  devicePixelRatio?: number;
}

/**
 * Chart export options
 */
export interface ExportChartOptions {
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number;
  backgroundColor?: string;
  pixelRatio?: number;
}

/**
 * Chart validation result
 */
export interface ChartValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Chart performance metrics
 */
export interface ChartPerformanceMetrics {
  renderTime: number;
  updateTime: number;
  resizeTime: number;
  memoryUsage: number;
  animationFrames: number;
}

/**
 * Chart accessibility options
 */
export interface ChartAccessibilityOptions {
  enabled?: boolean;
  announceNewData?: boolean;
  description?: string;
  title?: string;
  role?: string;
  label?: string;
}

/**
 * Chart plugin interface
 */
export interface SafeChartPlugin<T extends ChartType = ChartType> {
  id: string;
  beforeInit?: (chart: SafeChart<T>) => void;
  afterInit?: (chart: SafeChart<T>) => void;
  beforeUpdate?: (chart: SafeChart<T>) => void;
  afterUpdate?: (chart: SafeChart<T>) => void;
  beforeRender?: (chart: SafeChart<T>) => void;
  afterRender?: (chart: SafeChart<T>) => void;
  beforeDraw?: (chart: SafeChart<T>) => void;
  afterDraw?: (chart: SafeChart<T>) => void;
  beforeDestroy?: (chart: SafeChart<T>) => void;
  afterDestroy?: (chart: SafeChart<T>) => void;
  resize?: (chart: SafeChart<T>, size: { width: number; height: number }) => void;
  [key: string]: unknown;
}

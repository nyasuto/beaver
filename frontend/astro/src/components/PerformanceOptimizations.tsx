import React, { Suspense, lazy } from 'react';

// Lazy load heavy Chart components for better performance
export const LazyStatisticsDashboard = lazy(() => 
  import('./ChartComponents').then(module => ({ default: module.StatisticsDashboard }))
);

export const LazyIssuesTrendChart = lazy(() => 
  import('./ChartComponents').then(module => ({ default: module.IssuesTrendChart }))
);

export const LazyIssueDistributionChart = lazy(() => 
  import('./ChartComponents').then(module => ({ default: module.IssueDistributionChart }))
);

export const LazyWeeklyActivityChart = lazy(() => 
  import('./ChartComponents').then(module => ({ default: module.WeeklyActivityChart }))
);

// Loading fallback component
export const ChartLoadingFallback: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
    <div className="animate-pulse">
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
      <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-gray-500 dark:text-gray-400">Loading chart...</p>
        </div>
      </div>
    </div>
  </div>
);

// Optimized Dashboard wrapper with Suspense
interface OptimizedDashboardProps {
  statistics: any;
  className?: string;
}

export const OptimizedStatisticsDashboard: React.FC<OptimizedDashboardProps> = ({
  statistics,
  className = ''
}) => (
  <Suspense fallback={<ChartLoadingFallback className={className} />}>
    <LazyStatisticsDashboard statistics={statistics} className={className} />
  </Suspense>
);

// Individual optimized chart components
export const OptimizedTrendChart: React.FC<OptimizedDashboardProps> = ({
  statistics,
  className = ''
}) => (
  <Suspense fallback={<ChartLoadingFallback className={className} />}>
    <LazyIssuesTrendChart statistics={statistics} className={className} />
  </Suspense>
);

export const OptimizedDistributionChart: React.FC<OptimizedDashboardProps> = ({
  statistics,
  className = ''
}) => (
  <Suspense fallback={<ChartLoadingFallback className={className} />}>
    <LazyIssueDistributionChart statistics={statistics} className={className} />
  </Suspense>
);

export const OptimizedActivityChart: React.FC<OptimizedDashboardProps> = ({
  statistics,
  className = ''
}) => (
  <Suspense fallback={<ChartLoadingFallback className={className} />}>
    <LazyWeeklyActivityChart statistics={statistics} className={className} />
  </Suspense>
);

// Performance utilities
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = new Date().getTime();
    if (now - lastCall < delay) {
      return;
    }
    lastCall = now;
    return func(...args);
  };
};
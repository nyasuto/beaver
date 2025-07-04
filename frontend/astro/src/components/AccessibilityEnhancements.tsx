import React from 'react';

// ARIA announcements for screen readers
export const AriaLiveRegion: React.FC<{ message: string; priority?: 'polite' | 'assertive' }> = ({
  message,
  priority = 'polite'
}) => (
  <div
    aria-live={priority}
    aria-atomic="true"
    className="sr-only"
    role="status"
  >
    {message}
  </div>
);

// Skip navigation link for keyboard users
export const SkipNavigation: React.FC = () => (
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50 focus:z-50"
  >
    Skip to main content
  </a>
);

// Enhanced button component with accessibility features
interface AccessibleButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
  ariaPressed?: boolean;
  disabled?: boolean;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  onClick,
  children,
  ariaLabel,
  ariaPressed,
  disabled = false,
  className = '',
  variant = 'secondary'
}) => {
  const baseClasses = 'px-4 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:hover:bg-blue-600',
    secondary: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800',
    ghost: 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
  };

  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

// Enhanced tab navigation with accessibility
interface AccessibleTabsProps {
  tabs: { id: string; label: string; icon?: string }[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  ariaLabel?: string;
}

export const AccessibleTabs: React.FC<AccessibleTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  ariaLabel = 'Navigation tabs'
}) => {
  const handleKeyDown = (event: React.KeyboardEvent, _tabId: string) => {
    const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        break;
      case 'ArrowRight':
        event.preventDefault();
        newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    onTabChange(tabs[newIndex].id);
  };

  return (
    <div role="tablist" aria-label={ariaLabel} className="flex space-x-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`tabpanel-${tab.id}`}
          tabIndex={activeTab === tab.id ? 0 : -1}
          onClick={() => onTabChange(tab.id)}
          onKeyDown={(e) => handleKeyDown(e, tab.id)}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            activeTab === tab.id
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          {tab.icon && <span className="mr-2" aria-hidden="true">{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
};

// Enhanced search component with accessibility
interface AccessibleSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  resultsCount?: number;
}

export const AccessibleSearch: React.FC<AccessibleSearchProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  ariaLabel = 'Search issues',
  resultsCount
}) => {
  const searchId = React.useId();
  const resultsId = React.useId();

  return (
    <div className="relative">
      <label htmlFor={searchId} className="sr-only">
        {ariaLabel}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          id={searchId}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-describedby={resultsCount !== undefined ? resultsId : undefined}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      {resultsCount !== undefined && (
        <div id={resultsId} className="sr-only" aria-live="polite">
          {resultsCount === 0 
            ? 'No results found' 
            : `${resultsCount} result${resultsCount === 1 ? '' : 's'} found`
          }
        </div>
      )}
    </div>
  );
};

// Chart accessibility wrapper
interface AccessibleChartProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  dataTable?: {
    headers: string[];
    rows: (string | number)[][];
  };
}

export const AccessibleChart: React.FC<AccessibleChartProps> = ({
  children,
  title,
  description,
  dataTable
}) => {
  const chartId = React.useId();
  const tableId = React.useId();

  return (
    <div className="relative">
      <div
        role="img"
        aria-labelledby={`${chartId}-title`}
        aria-describedby={description ? `${chartId}-desc` : dataTable ? tableId : undefined}
        className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
        tabIndex={0}
      >
        <h3 id={`${chartId}-title`} className="sr-only">
          {title}
        </h3>
        {description && (
          <p id={`${chartId}-desc`} className="sr-only">
            {description}
          </p>
        )}
        {children}
      </div>
      
      {dataTable && (
        <div className="sr-only">
          <table id={tableId}>
            <caption>{title} - Data Table</caption>
            <thead>
              <tr>
                {dataTable.headers.map((header, index) => (
                  <th key={index} scope="col">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataTable.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Enhanced color contrast utilities
export const colorContrastUtils = {
  // High contrast color schemes for accessibility
  getContrastColors: (isDark: boolean) => ({
    primary: isDark ? '#60A5FA' : '#2563EB',
    secondary: isDark ? '#34D399' : '#059669',
    accent: isDark ? '#F472B6' : '#DC2626',
    text: isDark ? '#F9FAFB' : '#111827',
    background: isDark ? '#111827' : '#FFFFFF',
    border: isDark ? '#374151' : '#D1D5DB'
  }),

  // Check if color combination meets WCAG AA standards
  meetsContrastRatio: (_foreground: string, _background: string): boolean => {
    // This is a simplified version - in production, use a proper contrast calculation library
    return true; // Placeholder for actual contrast calculation
  }
};

// Focus management utilities
export const focusUtils = {
  // Trap focus within a container (useful for modals)
  trapFocus: (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }
};
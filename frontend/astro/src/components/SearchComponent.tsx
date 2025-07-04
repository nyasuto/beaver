import React, { useState, useMemo, useEffect } from 'react';
import type { Issue } from '../types/beaver';

interface SearchComponentProps {
  issues: Issue[];
  onFilteredIssues: (filtered: Issue[]) => void;
  className?: string;
}

interface FilterState {
  searchQuery: string;
  selectedLabels: string[];
  stateFilter: 'all' | 'open' | 'closed';
  urgencyFilter: 'all' | 'high' | 'medium' | 'low';
  sortBy: 'created' | 'updated' | 'urgency' | 'title';
  sortOrder: 'asc' | 'desc';
}

const SearchComponent: React.FC<SearchComponentProps> = ({ 
  issues, 
  onFilteredIssues, 
  className = '' 
}) => {
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    selectedLabels: [],
    stateFilter: 'all',
    urgencyFilter: 'all',
    sortBy: 'created',
    sortOrder: 'desc'
  });

  const [isExpanded, setIsExpanded] = useState(false);

  // Get all unique labels from issues
  const allLabels = useMemo(() => {
    const labelSet = new Set<string>();
    issues.forEach(issue => {
      if (issue.labels) {
        issue.labels.forEach(label => labelSet.add(label));
      }
    });
    return Array.from(labelSet).sort();
  }, [issues]);

  // Filter and sort issues based on current filters
  const filteredIssues = useMemo(() => {
    let filtered = issues.filter(issue => {
      // Search query filter
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const matchesTitle = issue.title.toLowerCase().includes(query);
        const matchesBody = issue.body?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesBody) return false;
      }

      // State filter
      if (filters.stateFilter !== 'all' && issue.state !== filters.stateFilter) {
        return false;
      }

      // Label filter
      if (filters.selectedLabels.length > 0) {
        const hasSelectedLabel = filters.selectedLabels.some(label =>
          issue.labels?.includes(label)
        );
        if (!hasSelectedLabel) return false;
      }

      // Urgency filter
      if (filters.urgencyFilter !== 'all') {
        const urgency = issue.analysis?.urgency_score || 0;
        switch (filters.urgencyFilter) {
          case 'high':
            if (urgency < 50) return false;
            break;
          case 'medium':
            if (urgency < 20 || urgency >= 50) return false;
            break;
          case 'low':
            if (urgency >= 20) return false;
            break;
        }
      }

      return true;
    });

    // Sort filtered issues
    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (filters.sortBy) {
        case 'title':
          compareValue = a.title.localeCompare(b.title);
          break;
        case 'created':
          compareValue = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'updated':
          compareValue = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
        case 'urgency':
          const aUrgency = a.analysis?.urgency_score || 0;
          const bUrgency = b.analysis?.urgency_score || 0;
          compareValue = aUrgency - bUrgency;
          break;
      }

      return filters.sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
  }, [issues, filters]);

  // Update parent component when filtered issues change
  useEffect(() => {
    onFilteredIssues(filteredIssues);
  }, [filteredIssues, onFilteredIssues]);

  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleLabel = (label: string) => {
    setFilters(prev => ({
      ...prev,
      selectedLabels: prev.selectedLabels.includes(label)
        ? prev.selectedLabels.filter(l => l !== label)
        : [...prev.selectedLabels, label]
    }));
  };

  const clearFilters = () => {
    setFilters({
      searchQuery: '',
      selectedLabels: [],
      stateFilter: 'all',
      urgencyFilter: 'all',
      sortBy: 'created',
      sortOrder: 'desc'
    });
  };

  const hasActiveFilters = filters.searchQuery.trim() || 
    filters.selectedLabels.length > 0 || 
    filters.stateFilter !== 'all' || 
    filters.urgencyFilter !== 'all';

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          🔍 Search & Filter Issues
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {filteredIssues.length} / {issues.length} issues
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
          >
            {isExpanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search issues by title or content..."
            value={filters.searchQuery}
            onChange={(e) => updateFilter('searchQuery', e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg 
            className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={filters.stateFilter}
          onChange={(e) => updateFilter('stateFilter', e.target.value)}
          className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="all">All States</option>
          <option value="open">Open Only</option>
          <option value="closed">Closed Only</option>
        </select>

        <select
          value={filters.urgencyFilter}
          onChange={(e) => updateFilter('urgencyFilter', e.target.value)}
          className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="all">All Urgency</option>
          <option value="high">High (50+)</option>
          <option value="medium">Medium (20-49)</option>
          <option value="low">Low (0-19)</option>
        </select>

        <select
          value={`${filters.sortBy}-${filters.sortOrder}`}
          onChange={(e) => {
            const [sortBy, sortOrder] = e.target.value.split('-');
            updateFilter('sortBy', sortBy);
            updateFilter('sortOrder', sortOrder);
          }}
          className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="created-desc">Latest First</option>
          <option value="created-asc">Oldest First</option>
          <option value="urgency-desc">High Urgency First</option>
          <option value="urgency-asc">Low Urgency First</option>
          <option value="title-asc">Title A-Z</option>
          <option value="title-desc">Title Z-A</option>
        </select>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Filter by Labels
          </h4>
          <div className="flex flex-wrap gap-2">
            {allLabels.map(label => (
              <button
                key={label}
                onClick={() => toggleLabel(label)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  filters.selectedLabels.includes(label)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {label}
                {filters.selectedLabels.includes(label) && ' ✓'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchComponent;
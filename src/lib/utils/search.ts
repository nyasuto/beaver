/**
 * Search and Filtering Utilities
 *
 * Provides comprehensive search and filtering functionality for GitHub Issues.
 * Includes text search, state filtering, label filtering, and sorting capabilities.
 */

import type { Issue } from '../schemas/github';

export interface SearchFilters {
  state?: 'open' | 'closed' | 'all';
  labels?: string[];
  author?: string | undefined;
  assignee?: string | undefined;
  dateRange?:
    | {
        start: Date;
        end: Date;
      }
    | undefined;
}

export interface SearchOptions {
  query: string;
  filters: SearchFilters;
  sortBy?: 'created' | 'updated' | 'priority' | 'number';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  issues: Issue[];
  totalCount: number;
  matchingCount: number;
  searchTime: number;
  highlightTerms: string[];
}

/**
 * Search issues by text query and apply filters
 *
 * @param issues - Array of issues to search through
 * @param options - Search options including query, filters, and sorting
 * @returns Search results with matched issues and metadata
 *
 * @example
 * ```typescript
 * const results = searchIssues(issues, {
 *   query: 'bug fix',
 *   filters: { state: 'open', labels: ['bug'] },
 *   sortBy: 'created',
 *   sortOrder: 'desc'
 * });
 * ```
 */
export function searchIssues(issues: Issue[], options: SearchOptions): SearchResult {
  const startTime = Date.now();
  let filteredIssues = [...issues];
  const highlightTerms: string[] = [];

  // Text search
  if (options.query.trim()) {
    const searchTerms = options.query
      .toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 0);
    highlightTerms.push(...searchTerms);

    filteredIssues = filteredIssues.filter(issue => {
      const searchText = [
        issue.title,
        issue.body || '',
        issue.user?.login || '',
        ...issue.labels.map(label => label.name),
      ]
        .join(' ')
        .toLowerCase();

      return searchTerms.every(term => searchText.includes(term));
    });
  }

  // State filtering
  if (options.filters.state && options.filters.state !== 'all') {
    filteredIssues = filteredIssues.filter(issue => issue.state === options.filters.state);
  }

  // Label filtering
  if (options.filters.labels && options.filters.labels.length > 0) {
    filteredIssues = filteredIssues.filter(
      issue =>
        options.filters.labels?.every(filterLabel =>
          issue.labels.some(issueLabel => issueLabel.name === filterLabel)
        ) ?? false
    );
  }

  // Author filtering
  if (options.filters.author) {
    filteredIssues = filteredIssues.filter(
      issue => issue.user?.login?.toLowerCase() === options.filters.author?.toLowerCase()
    );
  }

  // Assignee filtering
  if (options.filters.assignee) {
    filteredIssues = filteredIssues.filter(issue =>
      issue.assignees?.some(
        assignee => assignee.login?.toLowerCase() === options.filters.assignee?.toLowerCase()
      )
    );
  }

  // Date range filtering
  if (options.filters.dateRange) {
    const { start, end } = options.filters.dateRange;
    filteredIssues = filteredIssues.filter(issue => {
      const createdAt = new Date(issue.created_at);
      return createdAt >= start && createdAt <= end;
    });
  }

  // Sorting
  if (options.sortBy) {
    filteredIssues.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (options.sortBy) {
        case 'created':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'updated':
          aValue = new Date(a.updated_at).getTime();
          bValue = new Date(b.updated_at).getTime();
          break;
        case 'number':
          aValue = a.number;
          bValue = b.number;
          break;
        case 'priority':
          // Priority based on labels (high, medium, low)
          aValue = getPriorityValue(a);
          bValue = getPriorityValue(b);
          break;
        default:
          return 0;
      }

      const result = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      return options.sortOrder === 'desc' ? -result : result;
    });
  }

  const searchTime = Date.now() - startTime;

  return {
    issues: filteredIssues,
    totalCount: issues.length,
    matchingCount: filteredIssues.length,
    searchTime,
    highlightTerms,
  };
}

/**
 * Get priority value from issue labels for sorting
 */
function getPriorityValue(issue: Issue): number {
  const priorityLabels = issue.labels.map(label => label.name.toLowerCase());

  if (priorityLabels.includes('priority: critical')) return 4;
  if (priorityLabels.includes('priority: high')) return 3;
  if (priorityLabels.includes('priority: medium')) return 2;
  if (priorityLabels.includes('priority: low')) return 1;
  return 0;
}

/**
 * Highlight search terms in text
 *
 * @param text - Text to highlight
 * @param terms - Terms to highlight
 * @returns HTML string with highlighted terms
 */
export function highlightSearchTerms(text: string, terms: string[]): string {
  if (!terms.length) return text;

  let result = text;
  terms.forEach(term => {
    if (term.length > 0) {
      const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
      result = result.replace(regex, '<mark class="search-highlight">$1</mark>');
    }
  });

  return result;
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get unique values from issue field for filter options
 */
export function getFilterOptions(issues: Issue[]) {
  const authors = new Set<string>();
  const assignees = new Set<string>();
  const labels = new Set<string>();

  issues.forEach(issue => {
    if (issue.user?.login) authors.add(issue.user.login);

    issue.assignees?.forEach(assignee => {
      if (assignee.login) assignees.add(assignee.login);
    });

    issue.labels.forEach(label => {
      labels.add(label.name);
    });
  });

  return {
    authors: Array.from(authors).sort(),
    assignees: Array.from(assignees).sort(),
    labels: Array.from(labels).sort(),
  };
}

/**
 * Build search query from filters for URL params
 */
export function buildSearchQuery(filters: SearchFilters, query: string = ''): URLSearchParams {
  const params = new URLSearchParams();

  if (query.trim()) params.set('q', query.trim());
  if (filters.state && filters.state !== 'all') params.set('state', filters.state);
  if (filters.author) params.set('author', filters.author);
  if (filters.assignee) params.set('assignee', filters.assignee);
  if (filters.labels && filters.labels.length > 0) {
    params.set('labels', filters.labels.join(','));
  }

  return params;
}

/**
 * Parse search query from URL params
 */
export function parseSearchQuery(searchParams: URLSearchParams): {
  query: string;
  filters: SearchFilters;
} {
  const query = searchParams.get('q') || '';
  const authorParam = searchParams.get('author');
  const assigneeParam = searchParams.get('assignee');
  const labelsParam = searchParams.get('labels');

  const filters: SearchFilters = {
    state: (searchParams.get('state') as 'open' | 'closed') || 'all',
    author: authorParam || undefined,
    assignee: assigneeParam || undefined,
    labels: labelsParam?.split(',').filter(Boolean) || [],
  };

  return { query, filters };
}

/**
 * Tests for IssueSearchManager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IssueSearchManager } from '../search-manager';

// Mock DOM environment
const mockDOM = () => {
  // Mock elements
  const mockIssues = [
    {
      getAttribute: vi.fn(),
      classList: { add: vi.fn(), remove: vi.fn() },
      parentElement: null,
      textContent: '',
      innerHTML: '',
    },
    {
      getAttribute: vi.fn(),
      classList: { add: vi.fn(), remove: vi.fn() },
      parentElement: null,
      textContent: '',
      innerHTML: '',
    },
  ];

  // Mock container element
  const mockContainer = {
    querySelectorAll: vi.fn(() => []),
    appendChild: vi.fn(),
  };

  // Mock document methods
  global.document = {
    querySelectorAll: vi.fn(selector => {
      if (selector === '.issue-card') return mockIssues;
      if (selector === '.label-filter') return [];
      if (selector === '.issue-title, .issue-body') return [];
      return [];
    }),
    getElementById: vi.fn(id => {
      if (id === 'issues-container') return mockContainer;
      return null;
    }),
    addEventListener: vi.fn(),
  } as any;

  return { mockIssues, mockContainer };
};

describe('IssueSearchManager', () => {
  let manager: IssueSearchManager;
  let mockIssues: any[];

  beforeEach(() => {
    const { mockIssues: issues } = mockDOM();
    mockIssues = issues;

    // Setup mock data attributes
    mockIssues[0].getAttribute = vi.fn(attr => {
      const attrs: Record<string, string> = {
        'data-title': 'fix: resolve issue with authentication',
        'data-body': 'this is a bug fix for authentication issues',
        'data-author': 'john-doe',
        'data-state': 'open',
        'data-labels': 'bug,priority: high',
        'data-number': '123',
        'data-created': '2023-01-01',
        'data-updated': '2023-01-02',
        'data-priority': 'high',
      };
      return attrs[attr] || '';
    });

    mockIssues[1].getAttribute = vi.fn(attr => {
      const attrs: Record<string, string> = {
        'data-title': 'feat: add new feature for user management',
        'data-body': 'new feature implementation for better user experience',
        'data-author': 'jane-smith',
        'data-state': 'closed',
        'data-labels': 'feature,priority: medium',
        'data-number': '124',
        'data-created': '2023-01-03',
        'data-updated': '2023-01-04',
        'data-priority': 'medium',
      };
      return attrs[attr] || '';
    });

    manager = new IssueSearchManager('.issue-card');
    // Reset filters to 'all' state for consistent testing
    manager['currentFilters'].state = 'all';
  });

  describe('Text Search', () => {
    it('should filter issues by title', () => {
      manager['currentQuery'] = 'authentication';
      const result = manager.performSearch();

      expect(result.filteredElements).toHaveLength(1);
      expect(result.totalCount).toBe(1);
    });

    it('should filter issues by multiple terms', () => {
      manager['currentQuery'] = 'fix authentication';
      const result = manager.performSearch();

      expect(result.filteredElements).toHaveLength(1);
    });

    it('should be case insensitive', () => {
      manager['currentQuery'] = 'AUTHENTICATION';
      const result = manager.performSearch();

      expect(result.filteredElements).toHaveLength(1);
    });

    it('should search in body content', () => {
      manager['currentQuery'] = 'better user experience';
      const result = manager.performSearch();

      expect(result.filteredElements).toHaveLength(1);
    });

    it('should return all issues when query is empty', () => {
      manager['currentQuery'] = '';
      const result = manager.performSearch();

      expect(result.filteredElements).toHaveLength(2);
    });
  });

  describe('State Filtering', () => {
    it('should filter by open state', () => {
      manager['currentFilters'].state = 'open';
      const result = manager.performSearch();

      expect(result.filteredElements).toHaveLength(1);
      expect(mockIssues[0].getAttribute).toHaveBeenCalledWith('data-state');
    });

    it('should filter by closed state', () => {
      manager['currentFilters'].state = 'closed';
      const result = manager.performSearch();

      expect(result.filteredElements).toHaveLength(1);
    });

    it('should show all issues when state is all', () => {
      manager['currentFilters'].state = 'all';
      const result = manager.performSearch();

      expect(result.filteredElements).toHaveLength(2);
    });
  });

  describe('Label Filtering', () => {
    it('should filter by priority labels', () => {
      manager['currentFilters'].labelCategories = {
        priority: ['priority: high'],
        type: [],
        other: [],
      };
      const result = manager.performSearch();

      expect(result.filteredElements).toHaveLength(1);
    });

    it('should apply AND logic between categories', () => {
      manager['currentFilters'].labelCategories = {
        priority: ['priority: high'],
        type: ['bug'],
        other: [],
      };
      const result = manager.performSearch();

      expect(result.filteredElements).toHaveLength(1);
    });

    it('should return no results when conflicting filters', () => {
      manager['currentFilters'].labelCategories = {
        priority: ['priority: high'],
        type: ['feature'], // This issue has bug, not feature
        other: [],
      };
      const result = manager.performSearch();

      expect(result.filteredElements).toHaveLength(0);
    });
  });

  describe('Sorting', () => {
    it('should sort by creation date descending', () => {
      manager['currentSort'] = { by: 'created', order: 'desc' };
      const result = manager.performSearch();

      // Issue with newer date should come first (2023-01-03 > 2023-01-01)
      expect(result.filteredElements).toHaveLength(2);
      expect(result.filteredElements[0]!.getAttribute('data-created')).toBe('2023-01-03');
      expect(result.filteredElements[1]!.getAttribute('data-created')).toBe('2023-01-01');
    });

    it('should sort by issue number ascending', () => {
      manager['currentSort'] = { by: 'number', order: 'asc' };
      const result = manager.performSearch();

      // Lower number should come first (123 < 124)
      expect(result.filteredElements).toHaveLength(2);
      expect(result.filteredElements[0]!.getAttribute('data-number')).toBe('123');
      expect(result.filteredElements[1]!.getAttribute('data-number')).toBe('124');
    });

    it('should sort by priority', () => {
      manager['currentSort'] = { by: 'priority', order: 'desc' };
      const result = manager.performSearch();

      // Higher priority should come first (high=3 > medium=2)
      expect(result.filteredElements).toHaveLength(2);
      expect(result.filteredElements[0]!.getAttribute('data-priority')).toBe('high');
      expect(result.filteredElements[1]!.getAttribute('data-priority')).toBe('medium');
    });
  });

  describe('Label Count Calculation', () => {
    it('should calculate label counts from DOM', () => {
      const counts = manager['calculateLabelCountsFromDOM']('all');

      expect(counts['bug']).toBe(1);
      expect(counts['feature']).toBe(1);
      expect(counts['priority: high']).toBe(1);
      expect(counts['priority: medium']).toBe(1);
    });

    it('should calculate counts for specific state', () => {
      const openCounts = manager['calculateLabelCountsFromDOM']('open');

      expect(openCounts['bug']).toBe(1);
      expect(openCounts['feature'] || 0).toBe(0); // Use fallback for undefined
    });
  });

  describe('Priority Value Mapping', () => {
    it('should map priority strings to numeric values', () => {
      const criticalElement = { getAttribute: vi.fn(() => 'critical') } as any;
      const highElement = { getAttribute: vi.fn(() => 'high') } as any;
      const mediumElement = { getAttribute: vi.fn(() => 'medium') } as any;
      const lowElement = { getAttribute: vi.fn(() => 'low') } as any;
      const unknownElement = { getAttribute: vi.fn(() => 'unknown') } as any;

      expect(manager['getPriorityValue'](criticalElement)).toBe(4);
      expect(manager['getPriorityValue'](highElement)).toBe(3);
      expect(manager['getPriorityValue'](mediumElement)).toBe(2);
      expect(manager['getPriorityValue'](lowElement)).toBe(1);
      expect(manager['getPriorityValue'](unknownElement)).toBe(0);
    });
  });

  describe('Complex Filtering Scenarios', () => {
    it('should combine text search with filters', () => {
      manager['currentQuery'] = 'authentication';
      manager['currentFilters'].state = 'open';
      const result = manager.performSearch();

      expect(result.filteredElements).toHaveLength(1);
    });

    it('should return search timing information', () => {
      const result = manager.performSearch();

      expect(result.searchTime).toBeGreaterThan(0);
      expect(typeof result.searchTime).toBe('number');
    });

    it('should handle empty result sets', () => {
      manager['currentQuery'] = 'nonexistent-term';
      const result = manager.performSearch();

      expect(result.filteredElements).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('Author and Assignee Filtering', () => {
    it('should filter by author', () => {
      manager['currentFilters'].author = 'john-doe';
      const result = manager.performSearch();

      expect(result.filteredElements).toHaveLength(1);
    });

    it('should handle case insensitive author matching', () => {
      manager['currentFilters'].author = 'JOHN-DOE';
      const result = manager.performSearch();

      expect(result.filteredElements).toHaveLength(1);
    });
  });

  describe('Utility Functions', () => {
    it('should escape regex special characters', () => {
      const escaped = manager['escapeRegExp']('test.regex[chars]');
      expect(escaped).toBe('test\\.regex\\[chars\\]');
    });

    it('should detect active filters', () => {
      // Reset to all state (no filters active)
      manager['currentFilters'].state = 'all';
      manager['currentFilters'].labelCategories = { priority: [], type: [], other: [] };
      expect(manager['hasActiveFilters']()).toBe(false);

      // Add state filter
      manager['currentFilters'].state = 'open';
      expect(manager['hasActiveFilters']()).toBe(true);

      // Add label filter
      manager['currentFilters'].labelCategories!.priority = ['priority: high'];
      expect(manager['hasActiveFilters']()).toBe(true);
    });
  });
});

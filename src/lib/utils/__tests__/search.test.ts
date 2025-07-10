/**
 * Search Utilities Tests
 *
 * Simple tests for search and filtering functionality.
 */

import { describe, it, expect } from 'vitest';
import { highlightSearchTerms, buildSearchQuery, parseSearchQuery } from '../search';

describe('Search Utilities', () => {
  describe('highlightSearchTerms', () => {
    it('should highlight single search term', () => {
      const result = highlightSearchTerms('This is a test string', ['test']);
      expect(result).toBe('This is a <mark class="search-highlight">test</mark> string');
    });

    it('should highlight multiple search terms', () => {
      const result = highlightSearchTerms('This is a test string', ['test', 'string']);
      expect(result).toContain('<mark class="search-highlight">test</mark>');
      expect(result).toContain('<mark class="search-highlight">string</mark>');
    });

    it('should handle case-insensitive highlighting', () => {
      const result = highlightSearchTerms('This is a TEST string', ['test']);
      expect(result).toBe('This is a <mark class="search-highlight">TEST</mark> string');
    });

    it('should return original text when no terms provided', () => {
      const text = 'This is a test string';
      const result = highlightSearchTerms(text, []);
      expect(result).toBe(text);
    });

    it('should escape special regex characters', () => {
      const result = highlightSearchTerms('Use $100 for test', ['$100']);
      expect(result).toBe('Use <mark class="search-highlight">$100</mark> for test');
    });
  });

  describe('buildSearchQuery', () => {
    it('should build query string from filters', () => {
      const params = buildSearchQuery(
        {
          state: 'open',
          labels: ['bug', 'feature'],
          author: 'developer1',
        },
        'test query'
      );

      expect(params.get('q')).toBe('test query');
      expect(params.get('state')).toBe('open');
      expect(params.get('labels')).toBe('bug,feature');
      expect(params.get('author')).toBe('developer1');
    });

    it('should omit empty values', () => {
      const params = buildSearchQuery({ state: 'all' }, '');
      expect(params.has('q')).toBe(false);
      expect(params.has('state')).toBe(false);
    });
  });

  describe('parseSearchQuery', () => {
    it('should parse query parameters correctly', () => {
      const searchParams = new URLSearchParams();
      searchParams.set('q', 'test query');
      searchParams.set('state', 'open');
      searchParams.set('labels', 'bug,feature');
      searchParams.set('author', 'developer1');

      const { query, filters } = parseSearchQuery(searchParams);

      expect(query).toBe('test query');
      expect(filters.state).toBe('open');
      expect(filters.labels).toEqual(['bug', 'feature']);
      expect(filters.author).toBe('developer1');
    });

    it('should handle empty query parameters', () => {
      const searchParams = new URLSearchParams();
      const { query, filters } = parseSearchQuery(searchParams);

      expect(query).toBe('');
      expect(filters.state).toBe('all');
      expect(filters.labels).toEqual([]);
      expect(filters.author).toBeUndefined();
    });

    it('should filter out empty label values', () => {
      const searchParams = new URLSearchParams();
      searchParams.set('labels', 'bug,,feature,');

      const { filters } = parseSearchQuery(searchParams);
      expect(filters.labels).toEqual(['bug', 'feature']);
    });
  });
});

/**
 * Search Utilities Tests
 *
 * Simple tests for search and filtering functionality.
 */

import { describe, it, expect } from 'vitest';
import { highlightSearchTerms, buildSearchQuery, parseSearchQuery, searchIssues } from '../search';
import type { Issue } from '../../schemas/github';

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

  describe('searchIssues', () => {
    const mockIssues: Issue[] = [
      {
        id: 1,
        number: 1,
        title: 'Bug in authentication',
        body: 'Login fails for users with special characters',
        state: 'open',
        user: {
          login: 'developer1',
          id: 1,
          node_id: 'U_abc123',
          avatar_url: '',
          gravatar_id: null,
          url: 'https://api.github.com/users/developer1',
          html_url: '',
          type: 'User',
          site_admin: false,
        },
        labels: [
          {
            id: 1,
            node_id: 'L_bug',
            name: 'bug',
            description: 'Bug report',
            color: 'red',
            default: false,
          },
          {
            id: 2,
            node_id: 'L_priority',
            name: 'priority: high',
            description: 'High priority',
            color: 'orange',
            default: false,
          },
        ],
        assignees: [
          {
            login: 'assignee1',
            id: 2,
            node_id: 'U_def456',
            avatar_url: '',
            gravatar_id: null,
            url: 'https://api.github.com/users/assignee1',
            html_url: '',
            type: 'User',
            site_admin: false,
          },
        ],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
        closed_at: null,
        author_association: 'COLLABORATOR',
        active_lock_reason: null,
        locked: false,
        assignee: null,
        milestone: null,
        html_url: '',
        url: 'https://api.github.com/repos/test/repo/issues/1',
        repository_url: 'https://api.github.com/repos/test/repo',
        labels_url: 'https://api.github.com/repos/test/repo/issues/1/labels{/name}',
        comments_url: 'https://api.github.com/repos/test/repo/issues/1/comments',
        events_url: 'https://api.github.com/repos/test/repo/issues/1/events',
        node_id: 'I_abc123',
        comments: 5,
        pull_request: undefined,
      },
      {
        id: 2,
        number: 2,
        title: 'Feature request: dark mode',
        body: 'Add dark mode support to the application',
        state: 'closed',
        user: {
          login: 'developer2',
          id: 3,
          node_id: 'U_ghi789',
          avatar_url: '',
          gravatar_id: null,
          url: 'https://api.github.com/users/developer2',
          html_url: '',
          type: 'User',
          site_admin: false,
        },
        labels: [
          {
            id: 3,
            node_id: 'L_feature',
            name: 'feature',
            description: 'New feature',
            color: 'blue',
            default: false,
          },
          {
            id: 4,
            node_id: 'L_medium',
            name: 'priority: medium',
            description: 'Medium priority',
            color: 'yellow',
            default: false,
          },
        ],
        assignees: [],
        created_at: '2023-01-03T00:00:00Z',
        updated_at: '2023-01-04T00:00:00Z',
        closed_at: '2023-01-05T00:00:00Z',
        author_association: 'CONTRIBUTOR',
        active_lock_reason: null,
        locked: false,
        assignee: null,
        milestone: null,
        html_url: '',
        url: 'https://api.github.com/repos/test/repo/issues/2',
        repository_url: 'https://api.github.com/repos/test/repo',
        labels_url: 'https://api.github.com/repos/test/repo/issues/2/labels{/name}',
        comments_url: 'https://api.github.com/repos/test/repo/issues/2/comments',
        events_url: 'https://api.github.com/repos/test/repo/issues/2/events',
        node_id: 'I_def456',
        comments: 2,
        pull_request: undefined,
      },
      {
        id: 3,
        number: 3,
        title: 'Documentation update needed',
        body: 'Update API documentation for new endpoints',
        state: 'open',
        user: {
          login: 'developer1',
          id: 1,
          node_id: 'U_abc123',
          avatar_url: '',
          gravatar_id: null,
          url: 'https://api.github.com/users/developer1',
          html_url: '',
          type: 'User',
          site_admin: false,
        },
        labels: [
          {
            id: 5,
            node_id: 'L_docs',
            name: 'documentation',
            description: 'Documentation improvement',
            color: 'green',
            default: false,
          },
          {
            id: 6,
            node_id: 'L_low',
            name: 'priority: low',
            description: 'Low priority',
            color: 'gray',
            default: false,
          },
        ],
        assignees: [
          {
            login: 'assignee2',
            id: 4,
            node_id: 'U_jkl012',
            avatar_url: '',
            gravatar_id: null,
            url: 'https://api.github.com/users/assignee2',
            html_url: '',
            type: 'User',
            site_admin: false,
          },
        ],
        created_at: '2023-01-05T00:00:00Z',
        updated_at: '2023-01-06T00:00:00Z',
        closed_at: null,
        author_association: 'OWNER',
        active_lock_reason: null,
        locked: false,
        assignee: null,
        milestone: null,
        html_url: '',
        url: 'https://api.github.com/repos/test/repo/issues/3',
        repository_url: 'https://api.github.com/repos/test/repo',
        labels_url: 'https://api.github.com/repos/test/repo/issues/3/labels{/name}',
        comments_url: 'https://api.github.com/repos/test/repo/issues/3/comments',
        events_url: 'https://api.github.com/repos/test/repo/issues/3/events',
        node_id: 'I_ghi789',
        comments: 1,
        pull_request: undefined,
      },
    ];

    it('should return all issues when no query or filters', () => {
      const result = searchIssues(mockIssues, {
        query: '',
        filters: {},
      });

      expect(result.issues).toHaveLength(3);
      expect(result.totalCount).toBe(3);
      expect(result.matchingCount).toBe(3);
      expect(result.highlightTerms).toEqual([]);
      expect(result.searchTime).toBeGreaterThanOrEqual(0);
    });

    it('should filter by text query', () => {
      const result = searchIssues(mockIssues, {
        query: 'authentication bug',
        filters: {},
      });

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.title).toBe('Bug in authentication');
      expect(result.highlightTerms).toEqual(['authentication', 'bug']);
    });

    it('should filter by state', () => {
      const result = searchIssues(mockIssues, {
        query: '',
        filters: { state: 'open' },
      });

      expect(result.issues).toHaveLength(2);
      expect(result.issues.every(issue => issue.state === 'open')).toBe(true);
    });

    it('should filter by labels', () => {
      const result = searchIssues(mockIssues, {
        query: '',
        filters: { labels: ['bug'] },
      });

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.title).toBe('Bug in authentication');
    });

    it('should filter by author', () => {
      const result = searchIssues(mockIssues, {
        query: '',
        filters: { author: 'developer1' },
      });

      expect(result.issues).toHaveLength(2);
      expect(result.issues.every(issue => issue.user?.login === 'developer1')).toBe(true);
    });

    it('should filter by assignee', () => {
      const result = searchIssues(mockIssues, {
        query: '',
        filters: { assignee: 'assignee1' },
      });

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.title).toBe('Bug in authentication');
    });

    it('should filter by date range', () => {
      const result = searchIssues(mockIssues, {
        query: '',
        filters: {
          dateRange: {
            start: new Date('2023-01-01T00:00:00Z'),
            end: new Date('2023-01-02T00:00:00Z'),
          },
        },
      });

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.title).toBe('Bug in authentication');
    });

    it('should sort by created date ascending', () => {
      const result = searchIssues(mockIssues, {
        query: '',
        filters: {},
        sortBy: 'created',
        sortOrder: 'asc',
      });

      expect(result.issues[0]?.number).toBe(1);
      expect(result.issues[1]?.number).toBe(2);
      expect(result.issues[2]?.number).toBe(3);
    });

    it('should sort by created date descending', () => {
      const result = searchIssues(mockIssues, {
        query: '',
        filters: {},
        sortBy: 'created',
        sortOrder: 'desc',
      });

      expect(result.issues[0]?.number).toBe(3);
      expect(result.issues[1]?.number).toBe(2);
      expect(result.issues[2]?.number).toBe(1);
    });

    it('should sort by priority using label parsing', () => {
      const result = searchIssues(mockIssues, {
        query: '',
        filters: {},
        sortBy: 'priority',
        sortOrder: 'desc',
      });

      // High priority first, then medium, then low
      expect(result.issues[0]?.title).toBe('Bug in authentication'); // high
      expect(result.issues[1]?.title).toBe('Feature request: dark mode'); // medium
      expect(result.issues[2]?.title).toBe('Documentation update needed'); // low
    });

    it('should sort by priority using classification data', () => {
      const classificationData = {
        1: { priority: 'critical' as const },
        2: { priority: 'low' as const },
        3: { priority: 'high' as const },
      };

      const result = searchIssues(mockIssues, {
        query: '',
        filters: {},
        sortBy: 'priority',
        sortOrder: 'desc',
        classificationData,
      });

      // Critical first, then high, then low
      expect(result.issues[0]?.number).toBe(1); // critical
      expect(result.issues[1]?.number).toBe(3); // high
      expect(result.issues[2]?.number).toBe(2); // low
    });

    it('should combine multiple filters', () => {
      const result = searchIssues(mockIssues, {
        query: 'bug',
        filters: {
          state: 'open',
          author: 'developer1',
        },
      });

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.title).toBe('Bug in authentication');
    });

    it('should handle case-insensitive author filtering', () => {
      const result = searchIssues(mockIssues, {
        query: '',
        filters: { author: 'DEVELOPER1' },
      });

      expect(result.issues).toHaveLength(2);
    });

    it('should handle case-insensitive assignee filtering', () => {
      const result = searchIssues(mockIssues, {
        query: '',
        filters: { assignee: 'ASSIGNEE1' },
      });

      expect(result.issues).toHaveLength(1);
    });

    it('should return empty results when no matches', () => {
      const result = searchIssues(mockIssues, {
        query: 'nonexistent',
        filters: {},
      });

      expect(result.issues).toHaveLength(0);
      expect(result.matchingCount).toBe(0);
      expect(result.totalCount).toBe(3);
    });
  });
});

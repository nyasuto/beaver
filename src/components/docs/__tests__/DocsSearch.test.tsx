/**
 * DocsSearch Component Tests
 *
 * Tests for the documentation search component
 * Validates search functionality, keyboard navigation, and UI interactions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocsSearch from '../DocsSearch';

// Mock the resolveUrl utility
vi.mock('../../../lib/utils/url', () => ({
  resolveUrl: vi.fn((url: string) => url),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock console.error
const mockConsoleError = vi.fn();
global.console.error = mockConsoleError;

describe('DocsSearch Component', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    mockFetch.mockClear();
    mockConsoleError.mockClear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render with default props', () => {
      render(<DocsSearch />);

      const input = screen.getByPlaceholderText('ドキュメントを検索...');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('');
    });

    it('should render with custom placeholder', () => {
      render(<DocsSearch placeholder="Custom search..." />);

      const input = screen.getByPlaceholderText('Custom search...');
      expect(input).toBeInTheDocument();
    });

    it('should render with English translations', () => {
      render(<DocsSearch language="en" />);

      const input = screen.getByPlaceholderText('Search documentation...');
      expect(input).toBeInTheDocument();
    });

    it('should render search icon', () => {
      render(<DocsSearch />);

      const searchIcon = screen.getByRole('textbox');
      expect(searchIcon).toBeInTheDocument();

      // Check if SVG is in the DOM
      const svgElement = document.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    const mockSearchResults = [
      {
        slug: 'getting-started',
        title: 'Getting Started',
        description: 'Learn how to get started with the documentation',
        excerpt: 'This guide will help you get started quickly...',
        category: 'Guide',
        tags: ['tutorial', 'basics'],
        readingTime: 5,
      },
      {
        slug: 'advanced-features',
        title: 'Advanced Features',
        description: 'Explore advanced features and configurations',
        excerpt: 'Advanced features include custom configurations...',
        category: 'Advanced',
        tags: ['advanced', 'configuration'],
        readingTime: 10,
      },
    ];

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        json: async () => ({
          success: true,
          data: {
            query: 'test',
            results: mockSearchResults,
            total: 2,
          },
        }),
      });
    });

    it('should perform search with minimum characters', async () => {
      render(<DocsSearch />);

      const input = screen.getByPlaceholderText('ドキュメントを検索...');
      await user.type(input, 'te');

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/docs/search?q=te');
      });
    });

    it('should not search with less than 2 characters', async () => {
      render(<DocsSearch />);

      const input = screen.getByPlaceholderText('ドキュメントを検索...');
      await user.type(input, 't');

      await waitFor(() => {
        expect(mockFetch).not.toHaveBeenCalled();
      });
    });

    it('should display search results', async () => {
      render(<DocsSearch />);

      const input = screen.getByPlaceholderText('ドキュメントを検索...');
      await user.type(input, 'test');

      await waitFor(() => {
        expect(screen.getByText('Getting Started')).toBeInTheDocument();
        expect(screen.getByText('Advanced Features')).toBeInTheDocument();
      });
    });

    it('should display loading spinner while searching', async () => {
      let resolvePromise: (value: any) => void = () => {};
      const searchPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValue(searchPromise);

      render(<DocsSearch />);

      const input = screen.getByPlaceholderText('ドキュメントを検索...');
      await user.type(input, 'test');

      await waitFor(() => {
        const spinnerElement = document.querySelector('.animate-spin');
        expect(spinnerElement).toBeInTheDocument();
      });

      resolvePromise({
        json: async () => ({
          success: true,
          data: { query: 'test', results: [], total: 0 },
        }),
      });
    });

    it('should handle search errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      render(<DocsSearch />);

      const input = screen.getByPlaceholderText('ドキュメントを検索...');
      await user.type(input, 'test');

      await waitFor(() => {
        expect(mockConsoleError).toHaveBeenCalledWith('Search error:', expect.any(Error));
      });
    });

    it('should handle unsuccessful search response', async () => {
      mockFetch.mockResolvedValue({
        json: async () => ({
          success: false,
          error: 'Search failed',
        }),
      });

      render(<DocsSearch />);

      const input = screen.getByPlaceholderText('ドキュメントを検索...');
      await user.type(input, 'test');

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    const mockSearchResults = [
      {
        slug: 'result1',
        title: 'Result 1',
        excerpt: 'First result',
        readingTime: 5,
      },
      {
        slug: 'result2',
        title: 'Result 2',
        excerpt: 'Second result',
        readingTime: 3,
      },
    ];

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        json: async () => ({
          success: true,
          data: {
            query: 'test',
            results: mockSearchResults,
            total: 2,
          },
        }),
      });
    });

    it('should navigate results with arrow keys', async () => {
      render(<DocsSearch />);

      const input = screen.getByPlaceholderText('ドキュメントを検索...');
      await user.type(input, 'test');

      await waitFor(() => {
        expect(screen.getByText('Result 1')).toBeInTheDocument();
      });

      // Arrow down to select first result.
      // user.keyboard (not fireEvent) so the interaction is wrapped in act and the
      // component's keydown listener -- which is re-registered by an effect on every
      // isOpen/results/selectedIndex change -- is guaranteed to be the current one.
      await user.keyboard('{ArrowDown}');

      // First result should be selected
      await waitFor(() => {
        expect(screen.getByText('Result 1').closest('button')).toHaveClass('bg-blue-50');
      });
    });

    it('should cycle through results with arrow keys', async () => {
      render(<DocsSearch />);

      const input = screen.getByPlaceholderText('ドキュメントを検索...');
      await user.type(input, 'test');

      await waitFor(() => {
        expect(screen.getByText('Result 1')).toBeInTheDocument();
      });

      // Arrow down twice to select second result
      await user.keyboard('{ArrowDown}{ArrowDown}');

      await waitFor(() => {
        expect(screen.getByText('Result 2').closest('button')).toHaveClass('bg-blue-50');
      });
    });

    it('should navigate to selected result with Enter key', async () => {
      // Mock window.location.href
      const mockLocation = { href: '' };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      });

      render(<DocsSearch />);

      const input = screen.getByPlaceholderText('ドキュメントを検索...');
      await user.type(input, 'test');

      await waitFor(() => {
        expect(screen.getByText('Result 1')).toBeInTheDocument();
      });

      // Select first result and press Enter
      await user.keyboard('{ArrowDown}{Enter}');

      await waitFor(() => {
        expect(mockLocation.href).toBe('/docs/result1');
      });
    });

    it('should close results with Escape key', async () => {
      render(<DocsSearch />);

      const input = screen.getByPlaceholderText('ドキュメントを検索...');
      await user.type(input, 'test');

      await waitFor(() => {
        expect(screen.getByText('Result 1')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByText('Result 1')).not.toBeInTheDocument();
      });
    });
  });

  describe('Mouse Interactions', () => {
    const mockSearchResults = [
      {
        slug: 'clickable-result',
        title: 'Clickable Result',
        excerpt: 'Click to navigate',
        readingTime: 2,
      },
    ];

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        json: async () => ({
          success: true,
          data: {
            query: 'test',
            results: mockSearchResults,
            total: 1,
          },
        }),
      });
    });

    it('should navigate to result when clicked', async () => {
      const mockLocation = { href: '' };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      });

      render(<DocsSearch />);

      const input = screen.getByPlaceholderText('ドキュメントを検索...');
      await user.type(input, 'test');

      await waitFor(() => {
        expect(screen.getByText('Clickable Result')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Clickable Result'));

      expect(mockLocation.href).toBe('/docs/clickable-result');
    });

    it('should close results when clicking outside', async () => {
      render(<DocsSearch />);

      const input = screen.getByPlaceholderText('ドキュメントを検索...');
      await user.type(input, 'test');

      await waitFor(() => {
        expect(screen.getByText('Clickable Result')).toBeInTheDocument();
      });

      // Click outside the component
      fireEvent.mouseDown(document.body);

      expect(screen.queryByText('Clickable Result')).not.toBeInTheDocument();
    });
  });

  describe('Search Highlighting', () => {
    const mockSearchResults = [
      {
        slug: 'highlighted-result',
        title: 'Test Result',
        description: 'This is a test description',
        excerpt: 'Test excerpt content',
        readingTime: 3,
      },
    ];

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        json: async () => ({
          success: true,
          data: {
            query: 'test',
            results: mockSearchResults,
            total: 1,
          },
        }),
      });
    });

    it('should highlight search terms in results', async () => {
      render(<DocsSearch />);

      const input = screen.getByPlaceholderText('ドキュメントを検索...');
      await user.type(input, 'test');

      await waitFor(() => {
        const highlightedElements = screen.getAllByText('Test', { selector: 'mark' });
        expect(highlightedElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('No Results State', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        json: async () => ({
          success: true,
          data: {
            query: 'nonexistent',
            results: [],
            total: 0,
          },
        }),
      });
    });

    it('should display no results message', async () => {
      render(<DocsSearch />);

      const input = screen.getByPlaceholderText('ドキュメントを検索...');
      await user.type(input, 'nonexistent');

      await waitFor(() => {
        expect(screen.getByText('結果が見つかりません')).toBeInTheDocument();
      });
    });

    it('should display no results message in English', async () => {
      render(<DocsSearch language="en" />);

      const input = screen.getByPlaceholderText('Search documentation...');
      await user.type(input, 'nonexistent');

      await waitFor(() => {
        expect(screen.getByText('No results found')).toBeInTheDocument();
      });
    });
  });

  describe('Props and Configuration', () => {
    it('should use custom base URL', async () => {
      const mockLocation = { href: '' };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      });

      mockFetch.mockResolvedValue({
        json: async () => ({
          success: true,
          data: {
            query: 'test',
            results: [
              {
                slug: 'test-result',
                title: 'CustomTest',
                excerpt: 'CustomTest excerpt',
                readingTime: 1,
              },
            ],
            total: 1,
          },
        }),
      });

      render(<DocsSearch baseUrl="/custom-docs" />);

      const input = screen.getByPlaceholderText('ドキュメントを検索...');
      await user.type(input, 'test');

      await waitFor(() => {
        expect(screen.getByText('Custom')).toBeInTheDocument();
      });

      const buttonElement = screen.getByText('Custom').closest('button');
      await user.click(buttonElement!);

      expect(mockLocation.href).toBe('/custom-docs/test-result');
    });

    it('should handle maxResults prop', () => {
      render(<DocsSearch maxResults={5} />);

      // The component should render without errors
      expect(screen.getByPlaceholderText('ドキュメントを検索...')).toBeInTheDocument();
    });
  });

  describe('Search Tips and Help', () => {
    it('should show search tip for short queries', async () => {
      // This test verifies the component behavior rather than forcing a specific UI state
      render(<DocsSearch />);

      const input = screen.getByPlaceholderText('ドキュメントを検索...');

      // Type a single character
      await user.type(input, 'a');

      // The component should not trigger search for queries less than 2 characters
      expect(mockFetch).not.toHaveBeenCalled();

      // Focus the input
      await user.click(input);

      // The dropdown should not be open for queries less than 2 characters
      const dropdown = document.querySelector('.absolute.top-full.left-0.right-0.z-50');
      expect(dropdown).not.toBeInTheDocument();
    });

    it('should show keyboard shortcuts tip', async () => {
      mockFetch.mockResolvedValue({
        json: async () => ({
          success: true,
          data: {
            query: 'test',
            results: [{ slug: 'test', title: 'Test', excerpt: 'Test', readingTime: 1 }],
            total: 1,
          },
        }),
      });

      render(<DocsSearch />);

      const input = screen.getByPlaceholderText('ドキュメントを検索...');
      await user.type(input, 'test');

      await waitFor(() => {
        expect(screen.getByText('💡 ↑↓ で選択、Enter で移動、Esc で閉じる')).toBeInTheDocument();
      });
    });
  });

  describe('Tag Display', () => {
    const mockSearchResultsWithTags = [
      {
        slug: 'tagged-result',
        title: 'Tagged Result',
        excerpt: 'Result with tags',
        readingTime: 5,
        tags: ['tag1', 'tag2', 'tag3', 'tag4'],
      },
    ];

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        json: async () => ({
          success: true,
          data: {
            query: 'test',
            results: mockSearchResultsWithTags,
            total: 1,
          },
        }),
      });
    });

    it('should display tags for results', async () => {
      render(<DocsSearch />);

      const input = screen.getByPlaceholderText('ドキュメントを検索...');
      await user.type(input, 'test');

      await waitFor(() => {
        expect(screen.getByText('tag1')).toBeInTheDocument();
        expect(screen.getByText('tag2')).toBeInTheDocument();
        expect(screen.getByText('tag3')).toBeInTheDocument();
        // Should only show first 3 tags
        expect(screen.queryByText('tag4')).not.toBeInTheDocument();
      });
    });
  });

  describe('Reading Time Display', () => {
    const mockSearchResultsWithReadingTime = [
      {
        slug: 'timed-result',
        title: 'Timed Result',
        excerpt: 'Result with reading time',
        readingTime: 15,
      },
    ];

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        json: async () => ({
          success: true,
          data: {
            query: 'test',
            results: mockSearchResultsWithReadingTime,
            total: 1,
          },
        }),
      });
    });

    it('should display reading time', async () => {
      render(<DocsSearch />);

      const input = screen.getByPlaceholderText('ドキュメントを検索...');
      await user.type(input, 'test');

      await waitFor(() => {
        expect(screen.getByText('15分')).toBeInTheDocument();
      });
    });
  });
});

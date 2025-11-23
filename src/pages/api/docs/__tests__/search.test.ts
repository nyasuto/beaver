/**
 * Tests for docs search API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../search.js';

// Mock DocsService
const mockSearchDocs = vi.fn();

vi.mock('../../../../lib/services/DocsService.js', () => {
  class MockDocsService {
    searchDocs = mockSearchDocs;
  }

  return {
    DocsService: MockDocsService,
  };
});

describe('Docs Search API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return search results for valid query', async () => {
    const mockResults = [
      {
        slug: 'test-doc',
        metadata: {
          title: 'Test Document',
          description: 'A test document',
          category: 'documentation',
          tags: ['test'],
          lastModified: new Date(),
          order: 0,
        },
        content: 'This is test content with the search term.',
        htmlContent: '<p>HTML content</p>',
        wordCount: 10,
        readingTime: 1,
        sections: [],
        relatedDocs: [],
        breadcrumbs: [],
        path: '/test/path.md',
      },
    ];

    mockSearchDocs.mockResolvedValue(mockResults);

    const url = new URL('http://localhost/api/docs/search?q=test');
    const response = await GET({ url } as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.results).toHaveLength(1);
    expect(data.data.results[0].title).toBe('Test Document');
    expect(data.data.query).toBe('test');
  });

  it('should return 400 for short query', async () => {
    const url = new URL('http://localhost/api/docs/search?q=a');
    const response = await GET({ url } as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('at least 2 characters');
  });

  it('should return 400 for empty query', async () => {
    const url = new URL('http://localhost/api/docs/search');
    const response = await GET({ url } as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('should handle service errors gracefully', async () => {
    mockSearchDocs.mockRejectedValue(new Error('Service error'));

    const url = new URL('http://localhost/api/docs/search?q=test');
    const response = await GET({ url } as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Internal server error');
  });

  it('should extract relevant excerpts', async () => {
    // This tests the extractExcerpt function indirectly
    const mockResults = [
      {
        slug: 'test-doc',
        metadata: {
          title: 'Test Document',
          description: 'A test document',
          category: 'documentation',
          tags: ['test'],
          lastModified: new Date(),
          order: 0,
        },
        content:
          'This is some content before the important search term and some content after it that should be included in the excerpt.',
        htmlContent: '<p>HTML content</p>',
        wordCount: 20,
        readingTime: 1,
        sections: [],
        relatedDocs: [],
        breadcrumbs: [],
        path: '/test/path.md',
      },
    ];

    mockSearchDocs.mockResolvedValue(mockResults);

    const url = new URL('http://localhost/api/docs/search?q=search');
    const response = await GET({ url } as any);
    const data = await response.json();

    expect(data.data.results[0].excerpt).toContain('search term');
  });
});

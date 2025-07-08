/**
 * Issues API Endpoint
 *
 * This endpoint provides access to GitHub issues data with filtering and pagination.
 * Currently returns mock data - will be connected to GitHub API in future implementation.
 */

import type { APIRoute } from 'astro';
import { z } from 'zod';

// Query parameters schema
const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(30),
  state: z.enum(['open', 'closed', 'all']).default('all'),
  sort: z.enum(['created', 'updated', 'comments']).default('created'),
  direction: z.enum(['asc', 'desc']).default('desc'),
  labels: z.string().optional(),
  assignee: z.string().optional(),
  creator: z.string().optional(),
  search: z.string().optional(),
});

// Mock data for development
const mockIssues = [
  {
    id: 1,
    number: 123,
    title: 'Sample Bug Report',
    body: 'This is a sample bug report for development purposes.',
    state: 'open',
    labels: [
      { name: 'bug', color: 'ee0701' },
      { name: 'priority: high', color: 'b60205' },
    ],
    assignee: null,
    creator: { login: 'developer1', avatar_url: 'https://github.com/developer1.png' },
    created_at: '2023-12-01T10:00:00Z',
    updated_at: '2023-12-01T15:30:00Z',
    comments: 5,
  },
  {
    id: 2,
    number: 124,
    title: 'Feature Request: Add Dark Mode',
    body: 'Would be great to have a dark mode option for better user experience.',
    state: 'open',
    labels: [
      { name: 'feature', color: '0e8a16' },
      { name: 'enhancement', color: '84b6eb' },
    ],
    assignee: { login: 'developer2', avatar_url: 'https://github.com/developer2.png' },
    creator: { login: 'user1', avatar_url: 'https://github.com/user1.png' },
    created_at: '2023-12-02T14:20:00Z',
    updated_at: '2023-12-02T16:45:00Z',
    comments: 2,
  },
  {
    id: 3,
    number: 125,
    title: 'Documentation Update Needed',
    body: 'The API documentation needs to be updated with new endpoints.',
    state: 'closed',
    labels: [{ name: 'documentation', color: '0075ca' }],
    assignee: null,
    creator: { login: 'maintainer', avatar_url: 'https://github.com/maintainer.png' },
    created_at: '2023-11-28T09:15:00Z',
    updated_at: '2023-12-01T11:00:00Z',
    comments: 1,
  },
];

export const GET: APIRoute = async ({ request: _request, url }) => {
  try {
    // Parse and validate query parameters
    const searchParams = Object.fromEntries(url.searchParams);
    const query = QuerySchema.parse(searchParams);

    // Filter mock data based on query parameters
    let filteredIssues = mockIssues;

    // Filter by state
    if (query.state !== 'all') {
      filteredIssues = filteredIssues.filter(issue => issue.state === query.state);
    }

    // Filter by labels
    if (query.labels) {
      const labelNames = query.labels.split(',').map(l => l.trim());
      filteredIssues = filteredIssues.filter(issue =>
        labelNames.some(labelName => issue.labels.some(label => label.name.includes(labelName)))
      );
    }

    // Filter by assignee
    if (query.assignee) {
      filteredIssues = filteredIssues.filter(issue => issue.assignee?.login === query.assignee);
    }

    // Filter by creator
    if (query.creator) {
      filteredIssues = filteredIssues.filter(issue => issue.creator.login === query.creator);
    }

    // Search in title and body
    if (query.search) {
      const searchTerm = query.search.toLowerCase();
      filteredIssues = filteredIssues.filter(
        issue =>
          issue.title.toLowerCase().includes(searchTerm) ||
          issue.body.toLowerCase().includes(searchTerm)
      );
    }

    // Sort issues
    filteredIssues.sort((a, b) => {
      let aValue, bValue;

      switch (query.sort) {
        case 'created':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'updated':
          aValue = new Date(a.updated_at).getTime();
          bValue = new Date(b.updated_at).getTime();
          break;
        case 'comments':
          aValue = a.comments;
          bValue = b.comments;
          break;
        default:
          aValue = a.id;
          bValue = b.id;
      }

      return query.direction === 'asc' ? aValue - bValue : bValue - aValue;
    });

    // Pagination
    const total = filteredIssues.length;
    const totalPages = Math.ceil(total / query.per_page);
    const startIndex = (query.page - 1) * query.per_page;
    const endIndex = startIndex + query.per_page;
    const paginatedIssues = filteredIssues.slice(startIndex, endIndex);

    // Response with pagination headers
    const response = {
      success: true,
      data: paginatedIssues,
      pagination: {
        page: query.page,
        per_page: query.per_page,
        total,
        total_pages: totalPages,
        has_next: query.page < totalPages,
        has_prev: query.page > 1,
      },
      meta: {
        generated_at: new Date().toISOString(),
        data_source: 'mock',
        filters_applied: {
          state: query.state,
          labels: query.labels || null,
          assignee: query.assignee || null,
          creator: query.creator || null,
          search: query.search || null,
        },
      },
    };

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // 5 minutes
      },
    });
  } catch (error) {
    const errorResponse = {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'VALIDATION_ERROR',
      },
      meta: {
        generated_at: new Date().toISOString(),
      },
    };

    return new Response(JSON.stringify(errorResponse, null, 2), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};

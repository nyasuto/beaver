/**
 * API endpoint for documentation search
 */

import type { APIRoute } from 'astro';
import { DocsService } from '../../../lib/services/DocsService.js';

export const GET: APIRoute = async ({ url }) => {
  try {
    const searchParams = new URL(url).searchParams;
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Search query must be at least 2 characters long',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const docsService = new DocsService();
    const results = await docsService.searchDocs(query.trim());

    // Return simplified search results
    const searchResults = results.map(doc => ({
      slug: doc.slug,
      title: doc.metadata.title,
      description: doc.metadata.description,
      excerpt: extractExcerpt(doc.content, query),
      category: doc.metadata.category,
      tags: doc.metadata.tags,
      readingTime: doc.readingTime,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          query,
          results: searchResults,
          total: searchResults.length,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error searching docs:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

/**
 * Extract a relevant excerpt from content based on search query
 */
function extractExcerpt(content: string, query: string, maxLength: number = 200): string {
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();

  // Find the first occurrence of the query
  const index = lowerContent.indexOf(lowerQuery);

  if (index === -1) {
    // If query not found, return the beginning
    return content.substring(0, maxLength) + '...';
  }

  // Extract context around the query
  const start = Math.max(0, index - 50);
  const end = Math.min(content.length, index + query.length + 150);

  let excerpt = content.substring(start, end);

  // Add ellipsis if we're not at the beginning/end
  if (start > 0) excerpt = '...' + excerpt;
  if (end < content.length) excerpt = excerpt + '...';

  return excerpt;
}

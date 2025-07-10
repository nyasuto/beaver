/**
 * Markdown processing utilities
 *
 * Provides safe markdown to HTML conversion with XSS sanitization
 */

import { remark } from 'remark';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Create a JSDOM window for DOMPurify on server-side
const window = new JSDOM('').window;
const purify = DOMPurify(window);

/**
 * Convert markdown to safe HTML
 *
 * @param markdown - The markdown string to convert
 * @returns Safe HTML string
 */
export async function markdownToHtml(markdown: string): Promise<string> {
  try {
    // Convert markdown to HTML using remark
    const result = await remark().use(remarkRehype).use(rehypeStringify).process(markdown);

    // Sanitize the HTML to prevent XSS attacks
    const sanitizedHtml = purify.sanitize(result.toString(), {
      ALLOWED_TAGS: [
        'p',
        'br',
        'strong',
        'em',
        'b',
        'i',
        'code',
        'pre',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'ul',
        'ol',
        'li',
        'a',
        'blockquote',
      ],
      ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
      ALLOW_DATA_ATTR: false,
    });

    return sanitizedHtml;
  } catch (error) {
    console.error('Failed to convert markdown to HTML:', error);
    return markdown; // Return original markdown if conversion fails
  }
}

/**
 * Convert markdown to plain text (strip all formatting)
 *
 * @param markdown - The markdown string to convert
 * @returns Plain text string
 */
export function markdownToPlainText(markdown: string): string {
  return (
    markdown
      // Remove headers
      .replace(/^#+\s+/gm, '')
      // Remove bold/italic
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      // Remove links
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove inline code
      .replace(/`([^`]+)`/g, '$1')
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove single-line code blocks with language
      .replace(/``.*?``/g, '')
      // Remove blockquotes
      .replace(/^>\s+/gm, '')
      // Clean up multiple spaces and newlines
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Truncate markdown content to a specified length while preserving formatting
 *
 * @param markdown - The markdown string to truncate
 * @param maxLength - Maximum length in characters
 * @returns Truncated markdown string
 */
export function truncateMarkdown(markdown: string, maxLength: number): string {
  if (markdown.length <= maxLength) {
    return markdown;
  }

  const truncated = markdown.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');

  // Try to break at a word boundary
  const breakPoint = lastSpaceIndex > maxLength * 0.8 ? lastSpaceIndex : maxLength;

  return truncated.substring(0, breakPoint).trim() + '...';
}

/**
 * Extract the first paragraph from markdown content
 *
 * @param markdown - The markdown string to process
 * @returns First paragraph as markdown string
 */
export function extractFirstParagraph(markdown: string): string {
  const lines = markdown.split('\n');
  const firstParagraph: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines at the beginning
    if (trimmedLine === '' && firstParagraph.length === 0) {
      continue;
    }

    // Stop at first empty line after content
    if (trimmedLine === '' && firstParagraph.length > 0) {
      break;
    }

    firstParagraph.push(line);
  }

  return firstParagraph.join('\n').trim();
}

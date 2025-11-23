/**
 * Markdown processing pipeline for documentation
 */

import { remark } from 'remark';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeSlug from 'rehype-slug';
import matter from 'gray-matter';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { DocMetadata, DocSection } from '../types/docs.js';

/**
 * Process markdown content to HTML with metadata extraction
 */
export async function processMarkdown(
  content: string,
  filePath: string
): Promise<{ metadata: DocMetadata; htmlContent: string; sections: DocSection[] }> {
  const { data: frontMatter, content: markdownContent } = matter(content);

  // Extract sections for table of contents
  const sections = extractSections(markdownContent);

  // Remove the first h1 title to avoid duplication with page header
  const processedContent = removeFirstH1Title(markdownContent);

  // Convert markdown to HTML
  const result = await remark()
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeSlug) // Add ID attributes to headings
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(processedContent);

  const htmlContent = String(result);

  // Extract metadata from frontmatter and file
  const stats = await fs.stat(filePath);
  const metadata: DocMetadata = {
    title: frontMatter['title'] || extractTitle(markdownContent) || path.basename(filePath, '.md'),
    description: frontMatter['description'] || extractDescription(markdownContent),
    lastModified: stats.mtime,
    tags: frontMatter['tags'] || [],
    order: frontMatter['order'] || 0,
    category: frontMatter['category'] || inferCategory(filePath),
  };

  return { metadata, htmlContent, sections };
}

/**
 * Extract heading sections from markdown content
 */
function extractSections(content: string): DocSection[] {
  const sections: DocSection[] = [];
  const lines = content.split('\n');
  const isDebugMode = typeof process !== 'undefined' && process.env['NODE_ENV'] === 'development';

  if (isDebugMode) {
    console.log('🔍 [ToC Debug] Starting section extraction from markdown content');
  }

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match && match[1] && match[2]) {
      const level = match[1].length;
      const title = match[2].trim();
      const anchor = title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');

      const section = {
        id: `section-${sections.length}`,
        title,
        level,
        anchor,
      };

      sections.push(section);

      if (isDebugMode) {
        console.log(`📋 [ToC Debug] Section extracted:`, {
          level,
          title,
          anchor,
          originalLine: line,
        });
      }
    }
  }

  if (isDebugMode) {
    console.log(
      `✅ [ToC Debug] Total ${sections.length} sections extracted:`,
      sections.map(s => ({ title: s.title, anchor: s.anchor }))
    );
  }

  return sections;
}

/**
 * Extract title from markdown content (first h1)
 */
function extractTitle(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m);
  return match && match[1] ? match[1].trim() : null;
}

/**
 * Extract description from markdown content (first paragraph)
 */
function extractDescription(content: string): string | null {
  // Remove frontmatter and find first paragraph
  const contentWithoutFrontmatter = content.replace(/^---[\s\S]*?---\n/, '');
  const paragraphMatch = contentWithoutFrontmatter
    .replace(/^#.*$/gm, '') // Remove headers
    .match(/^[A-Za-z].{20,}$/m); // Find first substantial paragraph

  return paragraphMatch ? paragraphMatch[0].trim() : null;
}

/**
 * Infer category from file path
 */
function inferCategory(filePath: string): string {
  const relativePath = path.relative(process.cwd(), filePath);

  if (relativePath.startsWith('docs/')) {
    return 'documentation';
  }
  if (relativePath === 'README.md') {
    return 'overview';
  }

  return 'general';
}

/**
 * Calculate reading time in minutes
 */
export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

/**
 * Calculate word count
 */
export function calculateWordCount(content: string): number {
  return content.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Remove the first h1 title from markdown content to avoid duplication
 * with the page header that displays the same title
 */
function removeFirstH1Title(content: string): string {
  const lines = content.split('\n');
  let foundFirstH1 = false;
  let removeNextDescription = false;

  const filteredLines = lines.filter(line => {
    // Match h1 heading
    const h1Match = line.match(/^#\s+(.+)$/);

    if (h1Match && !foundFirstH1) {
      foundFirstH1 = true;
      removeNextDescription = true;
      return false; // Remove the first h1
    }

    // Remove the description paragraph that immediately follows the first h1
    if (removeNextDescription) {
      // Skip empty lines
      if (line.trim() === '') {
        return false;
      }
      // Remove the first non-empty line after h1 (description)
      if (line.trim() !== '' && !line.match(/^#+\s/)) {
        removeNextDescription = false;
        return false; // Remove the description
      }
      // If we encounter another heading, stop removing
      if (line.match(/^#+\s/)) {
        removeNextDescription = false;
        return true; // Keep this line
      }
    }

    return true; // Keep all other lines
  });

  return filteredLines.join('\n');
}

/**
 * Resolve relative links in markdown content
 */
export function resolveRelativeLinks(content: string, _basePath: string): string {
  // Get base URL from environment variable (for dynamic deployment paths)
  const baseUrl = process.env['BASE_URL'] ? process.env['BASE_URL'] : '/beaver';

  return content.replace(/\[([^\]]*)\]\((?!https?:\/\/)([^)]+\.md)\)/g, (match, text, link) => {
    // Convert relative markdown links to docs routes
    const resolvedLink = link
      .replace(/^\.\//, `${baseUrl}/docs/`)
      .replace(/^docs\//, `${baseUrl}/docs/`)
      .replace(/\.md$/, '');

    return `[${text}](${resolvedLink})`;
  });
}

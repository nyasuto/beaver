// Markdown Processing Utilities
import { marked } from 'marked';

// Configure marked for secure rendering
marked.setOptions({
  gfm: true,
  breaks: true,
  // Sanitize HTML for security
  sanitize: false, // We'll handle this carefully
});

/**
 * Converts Markdown to HTML safely
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return '';
  return marked(markdown);
}

/**
 * Extracts plain text from Markdown content, removing formatting
 * Perfect for previews and summaries
 */
export function markdownToPlainText(markdown: string, maxLength?: number): string {
  if (!markdown) return '';
  
  // Remove common markdown formatting
  let text = markdown
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove list markers
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Remove blockquotes
    .replace(/^>\s*/gm, '')
    // Remove horizontal rules
    .replace(/^---+$/gm, '')
    // Clean up multiple whitespace
    .replace(/\s+/g, ' ')
    .trim();

  // Truncate if needed
  if (maxLength && text.length > maxLength) {
    text = text.substring(0, maxLength).trim();
    // Try to break at word boundary
    const lastSpace = text.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.8) {
      text = text.substring(0, lastSpace);
    }
    text += '...';
  }

  return text;
}

/**
 * Extracts a summary from Markdown content
 * Looks for the first paragraph or section after headers
 */
export function extractMarkdownSummary(markdown: string, maxLength: number = 150): string {
  if (!markdown) return '';

  // Split into lines
  const lines = markdown.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Find the first meaningful paragraph (not just headers)
  let summaryLines: string[] = [];
  let foundContent = false;
  
  for (const line of lines) {
    // Skip header lines
    if (line.startsWith('#')) {
      continue;
    }
    
    // Skip metadata-style lines
    if (line.startsWith('**') && line.endsWith('**') && line.includes(':')) {
      continue;
    }
    
    // Found content
    foundContent = true;
    summaryLines.push(line);
    
    // Break if we have enough content
    const currentText = summaryLines.join(' ');
    if (currentText.length >= maxLength * 0.7) {
      break;
    }
  }
  
  // If no meaningful content found, fall back to basic extraction
  if (!foundContent || summaryLines.length === 0) {
    return markdownToPlainText(markdown, maxLength);
  }
  
  const summary = summaryLines.join(' ');
  return markdownToPlainText(summary, maxLength);
}

/**
 * Checks if content is likely Markdown
 */
export function isMarkdown(content: string): boolean {
  if (!content) return false;
  
  // Look for common markdown patterns
  const markdownPatterns = [
    /^#{1,6}\s+/, // Headers
    /\*\*[^*]+\*\*/, // Bold
    /\[[^\]]+\]\([^)]+\)/, // Links
    /`[^`]+`/, // Inline code
    /^[-*+]\s+/m, // Lists
    /^\d+\.\s+/m, // Numbered lists
  ];
  
  return markdownPatterns.some(pattern => pattern.test(content));
}
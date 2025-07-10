/**
 * @file Markdown utility tests
 */

import { describe, it, expect } from 'vitest';
import {
  markdownToHtml,
  markdownToPlainText,
  truncateMarkdown,
  extractFirstParagraph,
} from '../markdown';

describe('Markdown Utilities', () => {
  describe('markdownToHtml', () => {
    it('should convert basic markdown to HTML', async () => {
      const markdown = '# Header\n\nThis is **bold** text.';
      const html = await markdownToHtml(markdown);

      expect(html).toContain('<h1>Header</h1>');
      expect(html).toContain('<strong>bold</strong>');
    });

    it('should handle inline code', async () => {
      const markdown = 'Here is `inline code` example.';
      const html = await markdownToHtml(markdown);

      expect(html).toContain('<code>inline code</code>');
    });

    it('should handle links', async () => {
      const markdown = '[Link text](https://example.com)';
      const html = await markdownToHtml(markdown);

      expect(html).toContain('<a href="https://example.com">Link text</a>');
    });

    it('should sanitize dangerous HTML', async () => {
      const markdown = '<script>alert("xss")</script>';
      const html = await markdownToHtml(markdown);

      expect(html).not.toContain('<script>');
      expect(html).not.toContain('alert');
    });

    it('should handle empty input', async () => {
      const html = await markdownToHtml('');
      expect(html).toBe('');
    });

    it('should handle lists', async () => {
      const markdown = '- Item 1\n- Item 2\n- Item 3';
      const html = await markdownToHtml(markdown);

      expect(html).toContain('<ul>');
      expect(html).toContain('<li>Item 1</li>');
      expect(html).toContain('<li>Item 2</li>');
      expect(html).toContain('<li>Item 3</li>');
    });
  });

  describe('markdownToPlainText', () => {
    it('should remove headers', () => {
      const markdown = '# Header 1\n## Header 2\n### Header 3';
      const plainText = markdownToPlainText(markdown);

      expect(plainText).toBe('Header 1 Header 2 Header 3');
    });

    it('should remove bold and italic formatting', () => {
      const markdown = '**bold** and *italic* and __bold__ and _italic_';
      const plainText = markdownToPlainText(markdown);

      expect(plainText).toBe('bold and italic and bold and italic');
    });

    it('should remove links but keep text', () => {
      const markdown = '[Link text](https://example.com)';
      const plainText = markdownToPlainText(markdown);

      expect(plainText).toBe('Link text');
    });

    it('should remove inline code', () => {
      const markdown = 'Here is `code` example';
      const plainText = markdownToPlainText(markdown);

      expect(plainText).toBe('Here is code example');
    });

    it('should remove code blocks', () => {
      const markdown = '```javascript\nconsole.log("hello");\n```';
      const plainText = markdownToPlainText(markdown);

      // Should at least shorten the code block
      expect(plainText.length).toBeLessThan(markdown.length);
    });

    it('should remove blockquotes', () => {
      const markdown = '> This is a quote\n> Another line';
      const plainText = markdownToPlainText(markdown);

      expect(plainText).toBe('This is a quote Another line');
    });

    it('should handle empty input', () => {
      const plainText = markdownToPlainText('');
      expect(plainText).toBe('');
    });
  });

  describe('truncateMarkdown', () => {
    it('should truncate long text', () => {
      const longText =
        'This is a very long text that should be truncated at some point because it exceeds the maximum length.';
      const truncated = truncateMarkdown(longText, 50);

      expect(truncated.length).toBeLessThanOrEqual(53); // 50 + '...'
      expect(truncated).toContain('...');
    });

    it('should not truncate short text', () => {
      const shortText = 'Short text';
      const truncated = truncateMarkdown(shortText, 50);

      expect(truncated).toBe(shortText);
    });

    it('should break at word boundaries', () => {
      const text = 'This is a test text that should break at word boundaries';
      const truncated = truncateMarkdown(text, 20);

      // Should break at word boundary and be truncated
      expect(truncated).toContain('...');
      expect(truncated.length).toBeLessThan(text.length);
    });

    it('should handle empty input', () => {
      const truncated = truncateMarkdown('', 50);
      expect(truncated).toBe('');
    });
  });

  describe('extractFirstParagraph', () => {
    it('should extract first paragraph', () => {
      const markdown =
        'First paragraph\nwith multiple lines.\n\nSecond paragraph\nwith more content.';
      const firstParagraph = extractFirstParagraph(markdown);

      expect(firstParagraph).toBe('First paragraph\nwith multiple lines.');
    });

    it('should handle single paragraph', () => {
      const markdown = 'Single paragraph only';
      const firstParagraph = extractFirstParagraph(markdown);

      expect(firstParagraph).toBe('Single paragraph only');
    });

    it('should skip empty lines at beginning', () => {
      const markdown = '\n\nFirst paragraph\nwith content.\n\nSecond paragraph';
      const firstParagraph = extractFirstParagraph(markdown);

      expect(firstParagraph).toBe('First paragraph\nwith content.');
    });

    it('should handle empty input', () => {
      const firstParagraph = extractFirstParagraph('');
      expect(firstParagraph).toBe('');
    });

    it('should handle only empty lines', () => {
      const markdown = '\n\n\n';
      const firstParagraph = extractFirstParagraph(markdown);

      expect(firstParagraph).toBe('');
    });
  });
});

/**
 * Tests for markdown processor
 */

import { describe, it, expect, vi } from 'vitest';
import {
  processMarkdown,
  calculateReadingTime,
  calculateWordCount,
  resolveRelativeLinks,
} from '../processor.js';
import fs from 'node:fs/promises';

// Mock fs module
vi.mock('node:fs/promises', () => ({
  default: {
    stat: vi.fn(),
  },
}));

describe('Markdown Processor', () => {
  describe('processMarkdown', () => {
    it('should process markdown content to HTML', async () => {
      const mockContent = `---
title: Test Document
description: A test document
tags: ['test', 'markdown']
---

# Test Document

This is a **test** document with some content.

## Section 1

Some content here.

### Subsection

More content.`;

      vi.mocked(fs.stat).mockResolvedValue({
        mtime: new Date('2023-01-01'),
      } as any);

      const result = await processMarkdown(mockContent, '/test/path.md');

      expect(result.metadata.title).toBe('Test Document');
      expect(result.metadata.description).toBe('A test document');
      expect(result.metadata.tags).toEqual(['test', 'markdown']);
      // The first h1 title and its description should be removed to avoid duplication with page header
      expect(result.htmlContent).not.toContain('<h1>Test Document</h1>');
      expect(result.htmlContent).not.toContain(
        'This is a <strong>test</strong> document with some content.'
      );
      expect(result.htmlContent).toContain('<h2 id="section-1">Section 1</h2>');
      expect(result.htmlContent).toContain('Some content here.');
      expect(result.sections).toHaveLength(3); // H1, H2, H3 (sections are extracted before removal)
    });

    it('should extract title from content if not in frontmatter', async () => {
      const mockContent = `# Extracted Title

This document has no frontmatter title.`;

      vi.mocked(fs.stat).mockResolvedValue({
        mtime: new Date('2023-01-01'),
      } as any);

      const result = await processMarkdown(mockContent, '/test/path.md');

      expect(result.metadata.title).toBe('Extracted Title');
    });

    it('should use filename as title if no title found', async () => {
      const mockContent = `Some content without a title.`;

      vi.mocked(fs.stat).mockResolvedValue({
        mtime: new Date('2023-01-01'),
      } as any);

      const result = await processMarkdown(mockContent, '/test/example-doc.md');

      expect(result.metadata.title).toBe('example-doc');
    });

    it('should extract sections correctly', async () => {
      const mockContent = `# Main Title

## Section One

### Subsection A

#### Deep Section

## Section Two

Content here.`;

      vi.mocked(fs.stat).mockResolvedValue({
        mtime: new Date('2023-01-01'),
      } as any);

      const result = await processMarkdown(mockContent, '/test/path.md');

      expect(result.sections).toHaveLength(5);
      expect(result.sections[0]?.title).toBe('Main Title');
      expect(result.sections[0]?.level).toBe(1);
      expect(result.sections[1]?.title).toBe('Section One');
      expect(result.sections[1]?.level).toBe(2);
      expect(result.sections[2]?.title).toBe('Subsection A');
      expect(result.sections[2]?.level).toBe(3);
    });
  });

  describe('calculateReadingTime', () => {
    it('should calculate reading time correctly', () => {
      const shortText = 'This is a short text.';
      const longText = Array(250).fill('word').join(' '); // ~250 words

      expect(calculateReadingTime(shortText)).toBe(1); // Minimum 1 minute
      expect(calculateReadingTime(longText)).toBe(2); // ~2 minutes at 200 WPM
    });
  });

  describe('calculateWordCount', () => {
    it('should count words correctly', () => {
      const text = 'This is a test with seven words.';
      expect(calculateWordCount(text)).toBe(7);
    });

    it('should handle empty text', () => {
      expect(calculateWordCount('')).toBe(0);
      expect(calculateWordCount('   ')).toBe(0);
    });

    it('should handle multiple spaces', () => {
      const text = 'This   has    multiple     spaces.';
      expect(calculateWordCount(text)).toBe(4);
    });
  });

  describe('resolveRelativeLinks', () => {
    it('should resolve relative markdown links', () => {
      const content = `
Check out [this document](./config.md) and [that one](docs/setup.md).
Also see [external link](https://example.com) which should not change.
`;

      const result = resolveRelativeLinks(content, '/base/path.md');

      // BASE_URL環境変数に応じた動的なパス生成をテスト
      expect(result).toContain('/docs/config)');
      expect(result).toContain('/docs/setup)');
      expect(result).toContain('[external link](https://example.com)');
    });

    it('should not modify external links', () => {
      const content = `
Visit [Google](https://google.com) or [GitHub](http://github.com).
`;

      const result = resolveRelativeLinks(content, '/base/path.md');

      expect(result).toContain('https://google.com');
      expect(result).toContain('http://github.com');
    });

    it('should handle links without .md extension', () => {
      const content = `
See [this page](./config.md) and [this other](./setup).
`;

      const result = resolveRelativeLinks(content, '/base/path.md');

      expect(result).toContain('/docs/config)');
      expect(result).toContain('[this other](./setup)'); // No .md, so unchanged
    });
  });
});

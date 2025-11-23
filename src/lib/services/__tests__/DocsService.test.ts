/**
 * Tests for DocsService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocsService } from '../DocsService.js';
import fs from 'node:fs/promises';

// Mock fs module
vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
  },
}));

describe('DocsService', () => {
  let docsService: DocsService;

  beforeEach(() => {
    docsService = new DocsService();
    vi.clearAllMocks();
  });

  describe('collectDocs', () => {
    it('should collect README.md and docs files', async () => {
      // Mock file system
      const mockReadmeContent = `# Test README\n\nThis is a test README file.`;
      const mockDocContent = `# Test Doc\n\nThis is a test documentation file.`;

      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (path.toString().endsWith('README.md')) {
          return mockReadmeContent;
        }
        return mockDocContent;
      });

      vi.mocked(fs.readdir).mockResolvedValue(['test-doc.md', 'another-doc.md'] as any);

      vi.mocked(fs.stat).mockResolvedValue({
        mtime: new Date('2023-01-01'),
      } as any);

      const result = await docsService.collectDocs();

      expect(result.docs).toHaveLength(3); // README + 2 docs
      expect(result.navigation).toBeDefined();
      expect(result.categories).toBeDefined();
    });

    it('should handle missing README.md gracefully', async () => {
      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (path.toString().endsWith('README.md')) {
          throw new Error('File not found');
        }
        return `# Test Doc\n\nContent`;
      });

      vi.mocked(fs.readdir).mockResolvedValue(['test-doc.md'] as any);
      vi.mocked(fs.stat).mockResolvedValue({ mtime: new Date() } as any);

      const result = await docsService.collectDocs();

      expect(result.docs).toHaveLength(1); // Only docs files
    });

    it('should handle missing docs directory gracefully', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(`# README\n\nContent`);
      vi.mocked(fs.readdir).mockRejectedValue(new Error('Directory not found'));
      vi.mocked(fs.stat).mockResolvedValue({ mtime: new Date() } as any);

      const result = await docsService.collectDocs();

      expect(result.docs).toHaveLength(1); // Only README
    });
  });

  describe('getDoc', () => {
    it('should return a specific document by slug', async () => {
      // Setup mock
      const mockContent = `# Test Doc\n\nTest content`;
      vi.mocked(fs.readFile).mockResolvedValue(mockContent);
      vi.mocked(fs.readdir).mockResolvedValue(['test-doc.md'] as any);
      vi.mocked(fs.stat).mockResolvedValue({ mtime: new Date() } as any);

      const result = await docsService.getDoc('test-doc');

      expect(result).toBeDefined();
      expect(result?.slug).toBe('test-doc');
      expect(result?.metadata.title).toBe('Test Doc');
    });

    it('should return null for non-existent document', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('');
      vi.mocked(fs.readdir).mockResolvedValue([]);
      vi.mocked(fs.stat).mockResolvedValue({ mtime: new Date() } as any);

      const result = await docsService.getDoc('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('searchDocs', () => {
    it('should search documents by title and content', async () => {
      const readmeContent = `# README\n\nThis is the main README file.`;
      const testDocContent = `# Test Document\n\nThis contains important information about testing.`;

      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (path.toString().endsWith('README.md')) {
          return readmeContent;
        }
        return testDocContent;
      });
      vi.mocked(fs.readdir).mockResolvedValue(['test-doc.md'] as any);
      vi.mocked(fs.stat).mockResolvedValue({ mtime: new Date() } as any);

      const results = await docsService.searchDocs('testing');

      expect(results).toHaveLength(1);
      expect(results[0]?.slug).toBe('test-doc');
    });

    it('should return empty results for no matches', async () => {
      const mockContent = `# Test Document\n\nThis is about something else.`;
      vi.mocked(fs.readFile).mockResolvedValue(mockContent);
      vi.mocked(fs.readdir).mockResolvedValue(['test-doc.md'] as any);
      vi.mocked(fs.stat).mockResolvedValue({ mtime: new Date() } as any);

      const results = await docsService.searchDocs('nonexistent');

      expect(results).toHaveLength(0);
    });

    it('should search in tags', async () => {
      const readmeContent = `# README\n\nThis is the main README file.`;
      const testDocContent = `---
title: Test Doc
tags: ['testing', 'documentation']
---

# Test Document

Content here.`;

      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (path.toString().endsWith('README.md')) {
          return readmeContent;
        }
        return testDocContent;
      });
      vi.mocked(fs.readdir).mockResolvedValue(['test-doc.md'] as any);
      vi.mocked(fs.stat).mockResolvedValue({ mtime: new Date() } as any);

      const results = await docsService.searchDocs('testing');

      expect(results).toHaveLength(1);
      expect(results[0]?.metadata.tags).toContain('testing');
    });
  });
});

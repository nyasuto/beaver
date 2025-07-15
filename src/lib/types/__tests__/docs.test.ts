/**
 * Documentation Types Tests
 *
 * Tests for TypeScript interfaces used in documentation processing
 * Validates type safety, structure, and data integrity
 */

import { describe, it, expect } from 'vitest';
import type {
  DocMetadata,
  DocFile,
  DocSection,
  DocNavigation,
  ProcessedDoc,
  DocsCollection,
} from '../docs';

describe('Documentation Types', () => {
  describe('DocMetadata Interface', () => {
    it('should validate complete metadata structure', () => {
      const metadata: DocMetadata = {
        title: 'Getting Started',
        description: 'Learn how to get started with the project',
        lastModified: new Date('2023-12-01T10:00:00Z'),
        tags: ['tutorial', 'beginner', 'setup'],
        order: 1,
        category: 'getting-started',
      };

      expect(metadata.title).toBe('Getting Started');
      expect(metadata.description).toBe('Learn how to get started with the project');
      expect(metadata.lastModified).toBeInstanceOf(Date);
      expect(metadata.tags).toEqual(['tutorial', 'beginner', 'setup']);
      expect(metadata.order).toBe(1);
      expect(metadata.category).toBe('getting-started');
    });

    it('should validate minimal metadata structure', () => {
      const metadata: DocMetadata = {
        title: 'Basic Documentation',
        lastModified: new Date(),
      };

      expect(metadata.title).toBe('Basic Documentation');
      expect(metadata.lastModified).toBeInstanceOf(Date);
      expect(metadata.description).toBeUndefined();
      expect(metadata.tags).toBeUndefined();
      expect(metadata.order).toBeUndefined();
      expect(metadata.category).toBeUndefined();
    });

    it('should handle empty tags array', () => {
      const metadata: DocMetadata = {
        title: 'No Tags Doc',
        lastModified: new Date(),
        tags: [],
      };

      expect(metadata.tags).toEqual([]);
      expect(metadata.tags).toHaveLength(0);
    });

    it('should handle date objects correctly', () => {
      const now = new Date();
      const metadata: DocMetadata = {
        title: 'Date Test',
        lastModified: now,
      };

      expect(metadata.lastModified).toBe(now);
      expect(metadata.lastModified.getTime()).toBe(now.getTime());
    });

    it('should validate order as number', () => {
      const metadata: DocMetadata = {
        title: 'Ordered Doc',
        lastModified: new Date(),
        order: 42,
      };

      expect(typeof metadata.order).toBe('number');
      expect(metadata.order).toBe(42);
    });

    it('should validate category as string', () => {
      const metadata: DocMetadata = {
        title: 'Categorized Doc',
        lastModified: new Date(),
        category: 'advanced-topics',
      };

      expect(typeof metadata.category).toBe('string');
      expect(metadata.category).toBe('advanced-topics');
    });
  });

  describe('DocFile Interface', () => {
    it('should validate complete DocFile structure', () => {
      const docFile: DocFile = {
        slug: 'getting-started',
        path: '/docs/getting-started.md',
        metadata: {
          title: 'Getting Started',
          description: 'Learn the basics',
          lastModified: new Date('2023-12-01T10:00:00Z'),
          tags: ['tutorial', 'basics'],
          order: 1,
          category: 'guides',
        },
        content: '# Getting Started\n\nThis is the content...',
        htmlContent: '<h1>Getting Started</h1><p>This is the content...</p>',
        wordCount: 150,
        readingTime: 1,
      };

      expect(docFile.slug).toBe('getting-started');
      expect(docFile.path).toBe('/docs/getting-started.md');
      expect(docFile.metadata.title).toBe('Getting Started');
      expect(docFile.content).toContain('# Getting Started');
      expect(docFile.htmlContent).toContain('<h1>Getting Started</h1>');
      expect(docFile.wordCount).toBe(150);
      expect(docFile.readingTime).toBe(1);
    });

    it('should validate minimal DocFile structure', () => {
      const docFile: DocFile = {
        slug: 'minimal-doc',
        path: '/docs/minimal.md',
        metadata: {
          title: 'Minimal Doc',
          lastModified: new Date(),
        },
        content: 'Basic content',
        htmlContent: '<p>Basic content</p>',
        wordCount: 2,
        readingTime: 0,
      };

      expect(docFile.slug).toBe('minimal-doc');
      expect(docFile.path).toBe('/docs/minimal.md');
      expect(docFile.metadata.title).toBe('Minimal Doc');
      expect(docFile.content).toBe('Basic content');
      expect(docFile.htmlContent).toBe('<p>Basic content</p>');
      expect(docFile.wordCount).toBe(2);
      expect(docFile.readingTime).toBe(0);
    });

    it('should handle empty content', () => {
      const docFile: DocFile = {
        slug: 'empty-doc',
        path: '/docs/empty.md',
        metadata: {
          title: 'Empty Doc',
          lastModified: new Date(),
        },
        content: '',
        htmlContent: '',
        wordCount: 0,
        readingTime: 0,
      };

      expect(docFile.content).toBe('');
      expect(docFile.htmlContent).toBe('');
      expect(docFile.wordCount).toBe(0);
      expect(docFile.readingTime).toBe(0);
    });

    it('should validate numeric properties', () => {
      const docFile: DocFile = {
        slug: 'numeric-test',
        path: '/docs/numeric.md',
        metadata: {
          title: 'Numeric Test',
          lastModified: new Date(),
        },
        content: 'Test content',
        htmlContent: '<p>Test content</p>',
        wordCount: 1000,
        readingTime: 5,
      };

      expect(typeof docFile.wordCount).toBe('number');
      expect(typeof docFile.readingTime).toBe('number');
      expect(docFile.wordCount).toBe(1000);
      expect(docFile.readingTime).toBe(5);
    });

    it('should validate string properties', () => {
      const docFile: DocFile = {
        slug: 'string-test',
        path: '/docs/string-test.md',
        metadata: {
          title: 'String Test',
          lastModified: new Date(),
        },
        content: 'String content test',
        htmlContent: '<p>String content test</p>',
        wordCount: 3,
        readingTime: 0,
      };

      expect(typeof docFile.slug).toBe('string');
      expect(typeof docFile.path).toBe('string');
      expect(typeof docFile.content).toBe('string');
      expect(typeof docFile.htmlContent).toBe('string');
    });
  });

  describe('DocSection Interface', () => {
    it('should validate complete DocSection structure', () => {
      const section: DocSection = {
        id: 'section-1',
        title: 'Introduction',
        level: 1,
        anchor: 'introduction',
      };

      expect(section.id).toBe('section-1');
      expect(section.title).toBe('Introduction');
      expect(section.level).toBe(1);
      expect(section.anchor).toBe('introduction');
    });

    it('should validate different heading levels', () => {
      const sections: DocSection[] = [
        {
          id: 'h1-section',
          title: 'Main Title',
          level: 1,
          anchor: 'main-title',
        },
        {
          id: 'h2-section',
          title: 'Subtitle',
          level: 2,
          anchor: 'subtitle',
        },
        {
          id: 'h3-section',
          title: 'Sub-subtitle',
          level: 3,
          anchor: 'sub-subtitle',
        },
      ];

      sections.forEach((section, index) => {
        expect(section.level).toBe(index + 1);
        expect(typeof section.level).toBe('number');
        expect(section.level).toBeGreaterThan(0);
        expect(section.level).toBeLessThanOrEqual(6);
      });
    });

    it('should validate string properties', () => {
      const section: DocSection = {
        id: 'test-section',
        title: 'Test Section',
        level: 2,
        anchor: 'test-section',
      };

      expect(typeof section.id).toBe('string');
      expect(typeof section.title).toBe('string');
      expect(typeof section.anchor).toBe('string');
      expect(section.id).toBe('test-section');
      expect(section.title).toBe('Test Section');
      expect(section.anchor).toBe('test-section');
    });

    it('should handle complex title strings', () => {
      const section: DocSection = {
        id: 'complex-title',
        title: 'Complex Title with Numbers 123 and Symbols!',
        level: 2,
        anchor: 'complex-title-with-numbers-123-and-symbols',
      };

      expect(section.title).toBe('Complex Title with Numbers 123 and Symbols!');
      expect(section.anchor).toBe('complex-title-with-numbers-123-and-symbols');
    });
  });

  describe('DocNavigation Interface', () => {
    it('should validate complete DocNavigation structure', () => {
      const navigation: DocNavigation = {
        title: 'Getting Started',
        slug: 'getting-started',
        children: [
          {
            title: 'Installation',
            slug: 'installation',
            order: 1,
          },
          {
            title: 'Configuration',
            slug: 'configuration',
            order: 2,
          },
        ],
        category: 'guides',
        order: 1,
      };

      expect(navigation.title).toBe('Getting Started');
      expect(navigation.slug).toBe('getting-started');
      expect(navigation.children).toHaveLength(2);
      expect(navigation.children?.[0]?.title).toBe('Installation');
      expect(navigation.children?.[1]?.title).toBe('Configuration');
      expect(navigation.category).toBe('guides');
      expect(navigation.order).toBe(1);
    });

    it('should validate minimal DocNavigation structure', () => {
      const navigation: DocNavigation = {
        title: 'Simple Page',
        slug: 'simple-page',
      };

      expect(navigation.title).toBe('Simple Page');
      expect(navigation.slug).toBe('simple-page');
      expect(navigation.children).toBeUndefined();
      expect(navigation.category).toBeUndefined();
      expect(navigation.order).toBeUndefined();
    });

    it('should handle nested navigation structure', () => {
      const navigation: DocNavigation = {
        title: 'Main Section',
        slug: 'main-section',
        children: [
          {
            title: 'Sub Section',
            slug: 'sub-section',
            children: [
              {
                title: 'Deep Section',
                slug: 'deep-section',
              },
            ],
          },
        ],
      };

      expect(navigation.children).toHaveLength(1);
      expect(navigation.children?.[0]?.children).toHaveLength(1);
      expect(navigation.children?.[0]?.children?.[0]?.title).toBe('Deep Section');
    });

    it('should handle empty children array', () => {
      const navigation: DocNavigation = {
        title: 'Empty Children',
        slug: 'empty-children',
        children: [],
      };

      expect(navigation.children).toEqual([]);
      expect(navigation.children).toHaveLength(0);
    });

    it('should validate order property', () => {
      const navigation: DocNavigation = {
        title: 'Ordered Navigation',
        slug: 'ordered-navigation',
        order: 42,
      };

      expect(typeof navigation.order).toBe('number');
      expect(navigation.order).toBe(42);
    });

    it('should validate category property', () => {
      const navigation: DocNavigation = {
        title: 'Categorized Navigation',
        slug: 'categorized-navigation',
        category: 'advanced',
      };

      expect(typeof navigation.category).toBe('string');
      expect(navigation.category).toBe('advanced');
    });
  });

  describe('ProcessedDoc Interface', () => {
    it('should validate complete ProcessedDoc structure', () => {
      const processedDoc: ProcessedDoc = {
        slug: 'processed-doc',
        path: '/docs/processed.md',
        metadata: {
          title: 'Processed Document',
          description: 'A fully processed document',
          lastModified: new Date('2023-12-01T10:00:00Z'),
          tags: ['processed', 'complete'],
          order: 1,
          category: 'examples',
        },
        content: '# Processed Document\n\n## Section 1\n\nContent...',
        htmlContent: '<h1>Processed Document</h1><h2>Section 1</h2><p>Content...</p>',
        wordCount: 200,
        readingTime: 1,
        sections: [
          {
            id: 'section-1',
            title: 'Section 1',
            level: 2,
            anchor: 'section-1',
          },
        ],
        relatedDocs: ['related-doc-1', 'related-doc-2'],
        breadcrumbs: [
          { title: 'Home', slug: 'home' },
          { title: 'Examples', slug: 'examples' },
          { title: 'Processed Document', slug: 'processed-doc' },
        ],
      };

      expect(processedDoc.slug).toBe('processed-doc');
      expect(processedDoc.path).toBe('/docs/processed.md');
      expect(processedDoc.metadata.title).toBe('Processed Document');
      expect(processedDoc.sections).toHaveLength(1);
      expect(processedDoc.sections[0]?.title).toBe('Section 1');
      expect(processedDoc.relatedDocs).toEqual(['related-doc-1', 'related-doc-2']);
      expect(processedDoc.breadcrumbs).toHaveLength(3);
      expect(processedDoc.breadcrumbs[2]?.title).toBe('Processed Document');
    });

    it('should validate minimal ProcessedDoc structure', () => {
      const processedDoc: ProcessedDoc = {
        slug: 'minimal-processed',
        path: '/docs/minimal.md',
        metadata: {
          title: 'Minimal Processed',
          lastModified: new Date(),
        },
        content: 'Minimal content',
        htmlContent: '<p>Minimal content</p>',
        wordCount: 2,
        readingTime: 0,
        sections: [],
        relatedDocs: [],
        breadcrumbs: [],
      };

      expect(processedDoc.slug).toBe('minimal-processed');
      expect(processedDoc.sections).toEqual([]);
      expect(processedDoc.relatedDocs).toEqual([]);
      expect(processedDoc.breadcrumbs).toEqual([]);
    });

    it('should inherit all DocFile properties', () => {
      const processedDoc: ProcessedDoc = {
        slug: 'inheritance-test',
        path: '/docs/inheritance.md',
        metadata: {
          title: 'Inheritance Test',
          lastModified: new Date(),
        },
        content: 'Test content',
        htmlContent: '<p>Test content</p>',
        wordCount: 10,
        readingTime: 0,
        sections: [],
        relatedDocs: [],
        breadcrumbs: [],
      };

      // Should have all DocFile properties
      expect(processedDoc.slug).toBeDefined();
      expect(processedDoc.path).toBeDefined();
      expect(processedDoc.metadata).toBeDefined();
      expect(processedDoc.content).toBeDefined();
      expect(processedDoc.htmlContent).toBeDefined();
      expect(processedDoc.wordCount).toBeDefined();
      expect(processedDoc.readingTime).toBeDefined();

      // Should have ProcessedDoc-specific properties
      expect(processedDoc.sections).toBeDefined();
      expect(processedDoc.relatedDocs).toBeDefined();
      expect(processedDoc.breadcrumbs).toBeDefined();
    });

    it('should validate breadcrumbs structure', () => {
      const breadcrumbs = [
        { title: 'Home', slug: 'home' },
        { title: 'Docs', slug: 'docs' },
        { title: 'API', slug: 'api' },
      ];

      const processedDoc: ProcessedDoc = {
        slug: 'breadcrumb-test',
        path: '/docs/breadcrumb.md',
        metadata: {
          title: 'Breadcrumb Test',
          lastModified: new Date(),
        },
        content: 'Content',
        htmlContent: '<p>Content</p>',
        wordCount: 1,
        readingTime: 0,
        sections: [],
        relatedDocs: [],
        breadcrumbs: breadcrumbs,
      };

      expect(processedDoc.breadcrumbs).toHaveLength(3);
      processedDoc.breadcrumbs.forEach((breadcrumb, index) => {
        expect(breadcrumb.title).toBe(breadcrumbs[index]?.title);
        expect(breadcrumb.slug).toBe(breadcrumbs[index]?.slug);
        expect(typeof breadcrumb.title).toBe('string');
        expect(typeof breadcrumb.slug).toBe('string');
      });
    });

    it('should validate related docs array', () => {
      const relatedDocs = ['doc1', 'doc2', 'doc3'];

      const processedDoc: ProcessedDoc = {
        slug: 'related-test',
        path: '/docs/related.md',
        metadata: {
          title: 'Related Test',
          lastModified: new Date(),
        },
        content: 'Content',
        htmlContent: '<p>Content</p>',
        wordCount: 1,
        readingTime: 0,
        sections: [],
        relatedDocs: relatedDocs,
        breadcrumbs: [],
      };

      expect(processedDoc.relatedDocs).toEqual(relatedDocs);
      expect(processedDoc.relatedDocs).toHaveLength(3);
      processedDoc.relatedDocs.forEach(doc => {
        expect(typeof doc).toBe('string');
      });
    });

    it('should validate sections array', () => {
      const sections: DocSection[] = [
        {
          id: 'intro',
          title: 'Introduction',
          level: 1,
          anchor: 'introduction',
        },
        {
          id: 'setup',
          title: 'Setup',
          level: 2,
          anchor: 'setup',
        },
      ];

      const processedDoc: ProcessedDoc = {
        slug: 'sections-test',
        path: '/docs/sections.md',
        metadata: {
          title: 'Sections Test',
          lastModified: new Date(),
        },
        content: 'Content',
        htmlContent: '<p>Content</p>',
        wordCount: 1,
        readingTime: 0,
        sections: sections,
        relatedDocs: [],
        breadcrumbs: [],
      };

      expect(processedDoc.sections).toEqual(sections);
      expect(processedDoc.sections).toHaveLength(2);
      processedDoc.sections.forEach(section => {
        expect(typeof section.id).toBe('string');
        expect(typeof section.title).toBe('string');
        expect(typeof section.level).toBe('number');
        expect(typeof section.anchor).toBe('string');
      });
    });
  });

  describe('DocsCollection Interface', () => {
    it('should validate complete DocsCollection structure', () => {
      const docsCollection: DocsCollection = {
        docs: [
          {
            slug: 'doc1',
            path: '/docs/doc1.md',
            metadata: {
              title: 'Document 1',
              lastModified: new Date(),
            },
            content: 'Content 1',
            htmlContent: '<p>Content 1</p>',
            wordCount: 2,
            readingTime: 0,
            sections: [],
            relatedDocs: [],
            breadcrumbs: [],
          },
          {
            slug: 'doc2',
            path: '/docs/doc2.md',
            metadata: {
              title: 'Document 2',
              lastModified: new Date(),
            },
            content: 'Content 2',
            htmlContent: '<p>Content 2</p>',
            wordCount: 2,
            readingTime: 0,
            sections: [],
            relatedDocs: [],
            breadcrumbs: [],
          },
        ],
        navigation: [
          {
            title: 'Getting Started',
            slug: 'getting-started',
            children: [
              {
                title: 'Installation',
                slug: 'installation',
              },
            ],
          },
          {
            title: 'API Reference',
            slug: 'api-reference',
          },
        ],
        categories: {
          'getting-started': [
            {
              title: 'Installation',
              slug: 'installation',
            },
          ],
          api: [
            {
              title: 'API Reference',
              slug: 'api-reference',
            },
          ],
        },
      };

      expect(docsCollection.docs).toHaveLength(2);
      expect(docsCollection.docs[0]?.slug).toBe('doc1');
      expect(docsCollection.docs[1]?.slug).toBe('doc2');
      expect(docsCollection.navigation).toHaveLength(2);
      expect(docsCollection.navigation[0]?.title).toBe('Getting Started');
      expect(docsCollection.navigation[1]?.title).toBe('API Reference');
      expect(Object.keys(docsCollection.categories)).toHaveLength(2);
      expect(docsCollection.categories['getting-started']).toHaveLength(1);
      expect(docsCollection.categories['api']).toHaveLength(1);
    });

    it('should validate minimal DocsCollection structure', () => {
      const docsCollection: DocsCollection = {
        docs: [],
        navigation: [],
        categories: {},
      };

      expect(docsCollection.docs).toEqual([]);
      expect(docsCollection.navigation).toEqual([]);
      expect(docsCollection.categories).toEqual({});
    });

    it('should validate docs array', () => {
      const docs: ProcessedDoc[] = [
        {
          slug: 'test-doc',
          path: '/docs/test.md',
          metadata: {
            title: 'Test Document',
            lastModified: new Date(),
          },
          content: 'Test content',
          htmlContent: '<p>Test content</p>',
          wordCount: 2,
          readingTime: 0,
          sections: [],
          relatedDocs: [],
          breadcrumbs: [],
        },
      ];

      const docsCollection: DocsCollection = {
        docs: docs,
        navigation: [],
        categories: {},
      };

      expect(docsCollection.docs).toEqual(docs);
      expect(docsCollection.docs).toHaveLength(1);
      expect(docsCollection.docs[0]?.slug).toBe('test-doc');
    });

    it('should validate navigation array', () => {
      const navigation: DocNavigation[] = [
        {
          title: 'Main Navigation',
          slug: 'main-navigation',
          children: [
            {
              title: 'Sub Navigation',
              slug: 'sub-navigation',
            },
          ],
        },
      ];

      const docsCollection: DocsCollection = {
        docs: [],
        navigation: navigation,
        categories: {},
      };

      expect(docsCollection.navigation).toEqual(navigation);
      expect(docsCollection.navigation).toHaveLength(1);
      expect(docsCollection.navigation[0]?.title).toBe('Main Navigation');
      expect(docsCollection.navigation[0]?.children).toHaveLength(1);
    });

    it('should validate categories record', () => {
      const categories: Record<string, DocNavigation[]> = {
        tutorials: [
          {
            title: 'Tutorial 1',
            slug: 'tutorial-1',
          },
        ],
        api: [
          {
            title: 'API Doc 1',
            slug: 'api-doc-1',
          },
          {
            title: 'API Doc 2',
            slug: 'api-doc-2',
          },
        ],
      };

      const docsCollection: DocsCollection = {
        docs: [],
        navigation: [],
        categories: categories,
      };

      expect(docsCollection.categories).toEqual(categories);
      expect(Object.keys(docsCollection.categories)).toHaveLength(2);
      expect(docsCollection.categories['tutorials']).toHaveLength(1);
      expect(docsCollection.categories['api']).toHaveLength(2);
    });

    it('should handle complex nested structure', () => {
      const docsCollection: DocsCollection = {
        docs: [
          {
            slug: 'complex-doc',
            path: '/docs/complex.md',
            metadata: {
              title: 'Complex Document',
              description: 'A complex document with all features',
              lastModified: new Date(),
              tags: ['complex', 'example'],
              order: 1,
              category: 'examples',
            },
            content: '# Complex Document\n\n## Section 1\n\nContent...',
            htmlContent: '<h1>Complex Document</h1><h2>Section 1</h2><p>Content...</p>',
            wordCount: 100,
            readingTime: 1,
            sections: [
              {
                id: 'section-1',
                title: 'Section 1',
                level: 2,
                anchor: 'section-1',
              },
            ],
            relatedDocs: ['related-doc'],
            breadcrumbs: [
              { title: 'Home', slug: 'home' },
              { title: 'Examples', slug: 'examples' },
              { title: 'Complex Document', slug: 'complex-doc' },
            ],
          },
        ],
        navigation: [
          {
            title: 'Examples',
            slug: 'examples',
            children: [
              {
                title: 'Complex Document',
                slug: 'complex-doc',
                order: 1,
              },
            ],
            category: 'examples',
          },
        ],
        categories: {
          examples: [
            {
              title: 'Complex Document',
              slug: 'complex-doc',
              order: 1,
            },
          ],
        },
      };

      expect(docsCollection.docs).toHaveLength(1);
      expect(docsCollection.docs[0]?.metadata.tags).toEqual(['complex', 'example']);
      expect(docsCollection.docs[0]?.sections).toHaveLength(1);
      expect(docsCollection.docs[0]?.breadcrumbs).toHaveLength(3);
      expect(docsCollection.navigation).toHaveLength(1);
      expect(docsCollection.navigation[0]?.children).toHaveLength(1);
      expect(docsCollection.categories['examples']).toHaveLength(1);
    });
  });

  describe('Type Integration and Compatibility', () => {
    it('should demonstrate type relationships', () => {
      // DocFile is the base for ProcessedDoc
      const docFile: DocFile = {
        slug: 'base-doc',
        path: '/docs/base.md',
        metadata: {
          title: 'Base Document',
          lastModified: new Date(),
        },
        content: 'Base content',
        htmlContent: '<p>Base content</p>',
        wordCount: 2,
        readingTime: 0,
      };

      // ProcessedDoc extends DocFile
      const processedDoc: ProcessedDoc = {
        ...docFile,
        sections: [],
        relatedDocs: [],
        breadcrumbs: [],
      };

      expect(processedDoc.slug).toBe(docFile.slug);
      expect(processedDoc.path).toBe(docFile.path);
      expect(processedDoc.metadata.title).toBe(docFile.metadata.title);
      expect(processedDoc.content).toBe(docFile.content);
      expect(processedDoc.sections).toEqual([]);
      expect(processedDoc.relatedDocs).toEqual([]);
      expect(processedDoc.breadcrumbs).toEqual([]);
    });

    it('should validate type compatibility in collections', () => {
      const docNavigation: DocNavigation = {
        title: 'Navigation Test',
        slug: 'navigation-test',
      };

      const processedDoc: ProcessedDoc = {
        slug: 'navigation-test',
        path: '/docs/navigation-test.md',
        metadata: {
          title: 'Navigation Test',
          lastModified: new Date(),
        },
        content: 'Content',
        htmlContent: '<p>Content</p>',
        wordCount: 1,
        readingTime: 0,
        sections: [],
        relatedDocs: [],
        breadcrumbs: [],
      };

      const docsCollection: DocsCollection = {
        docs: [processedDoc],
        navigation: [docNavigation],
        categories: {
          test: [docNavigation],
        },
      };

      expect(docsCollection.docs[0]?.slug).toBe(docNavigation.slug);
      expect(docsCollection.navigation[0]?.title).toBe(processedDoc.metadata.title);
      expect(docsCollection.categories['test']?.[0]?.slug).toBe(processedDoc.slug);
    });

    it('should handle optional properties correctly', () => {
      const minimalMetadata: DocMetadata = {
        title: 'Minimal',
        lastModified: new Date(),
      };

      const fullMetadata: DocMetadata = {
        title: 'Full',
        description: 'Full description',
        lastModified: new Date(),
        tags: ['full', 'complete'],
        order: 1,
        category: 'full',
      };

      expect(minimalMetadata.description).toBeUndefined();
      expect(minimalMetadata.tags).toBeUndefined();
      expect(minimalMetadata.order).toBeUndefined();
      expect(minimalMetadata.category).toBeUndefined();

      expect(fullMetadata.description).toBe('Full description');
      expect(fullMetadata.tags).toEqual(['full', 'complete']);
      expect(fullMetadata.order).toBe(1);
      expect(fullMetadata.category).toBe('full');
    });
  });

  describe('Real-world Usage Scenarios', () => {
    it('should handle documentation processing workflow', () => {
      // Step 1: Raw metadata
      const metadata: DocMetadata = {
        title: 'API Documentation',
        description: 'Complete API reference',
        lastModified: new Date(),
        tags: ['api', 'reference'],
        order: 1,
        category: 'api',
      };

      // Step 2: Basic document file
      const docFile: DocFile = {
        slug: 'api-documentation',
        path: '/docs/api.md',
        metadata: metadata,
        content: '# API Documentation\n\n## Authentication\n\n## Endpoints',
        htmlContent: '<h1>API Documentation</h1><h2>Authentication</h2><h2>Endpoints</h2>',
        wordCount: 50,
        readingTime: 1,
      };

      // Step 3: Process document with sections
      const processedDoc: ProcessedDoc = {
        ...docFile,
        sections: [
          {
            id: 'authentication',
            title: 'Authentication',
            level: 2,
            anchor: 'authentication',
          },
          {
            id: 'endpoints',
            title: 'Endpoints',
            level: 2,
            anchor: 'endpoints',
          },
        ],
        relatedDocs: ['getting-started', 'examples'],
        breadcrumbs: [
          { title: 'Home', slug: 'home' },
          { title: 'API', slug: 'api' },
          { title: 'API Documentation', slug: 'api-documentation' },
        ],
      };

      // Step 4: Add to collection
      const docsCollection: DocsCollection = {
        docs: [processedDoc],
        navigation: [
          {
            title: 'API',
            slug: 'api',
            children: [
              {
                title: 'API Documentation',
                slug: 'api-documentation',
                order: 1,
              },
            ],
          },
        ],
        categories: {
          api: [
            {
              title: 'API Documentation',
              slug: 'api-documentation',
              order: 1,
            },
          ],
        },
      };

      // Validate the complete workflow
      expect(docsCollection.docs).toHaveLength(1);
      expect(docsCollection.docs[0]?.metadata.title).toBe('API Documentation');
      expect(docsCollection.docs[0]?.sections).toHaveLength(2);
      expect(docsCollection.docs[0]?.breadcrumbs).toHaveLength(3);
      expect(docsCollection.navigation[0]?.children).toHaveLength(1);
      expect(docsCollection.categories['api']).toHaveLength(1);
    });

    it('should handle multilingual documentation', () => {
      const enDoc: ProcessedDoc = {
        slug: 'getting-started',
        path: '/docs/en/getting-started.md',
        metadata: {
          title: 'Getting Started',
          description: 'Learn how to get started',
          lastModified: new Date(),
          tags: ['tutorial', 'beginner'],
          category: 'guides',
        },
        content: '# Getting Started\n\nWelcome to our documentation!',
        htmlContent: '<h1>Getting Started</h1><p>Welcome to our documentation!</p>',
        wordCount: 25,
        readingTime: 1,
        sections: [],
        relatedDocs: [],
        breadcrumbs: [
          { title: 'Home', slug: 'home' },
          { title: 'Getting Started', slug: 'getting-started' },
        ],
      };

      const jaDoc: ProcessedDoc = {
        slug: 'getting-started-ja',
        path: '/docs/ja/getting-started.md',
        metadata: {
          title: 'はじめに',
          description: 'はじめ方を学ぶ',
          lastModified: new Date(),
          tags: ['チュートリアル', '初心者'],
          category: 'ガイド',
        },
        content: '# はじめに\n\nドキュメントへようこそ！',
        htmlContent: '<h1>はじめに</h1><p>ドキュメントへようこそ！</p>',
        wordCount: 20,
        readingTime: 1,
        sections: [],
        relatedDocs: [],
        breadcrumbs: [
          { title: 'ホーム', slug: 'home' },
          { title: 'はじめに', slug: 'getting-started-ja' },
        ],
      };

      const multilingualCollection: DocsCollection = {
        docs: [enDoc, jaDoc],
        navigation: [
          {
            title: 'Getting Started',
            slug: 'getting-started',
          },
          {
            title: 'はじめに',
            slug: 'getting-started-ja',
          },
        ],
        categories: {
          guides: [
            {
              title: 'Getting Started',
              slug: 'getting-started',
            },
          ],
          ガイド: [
            {
              title: 'はじめに',
              slug: 'getting-started-ja',
            },
          ],
        },
      };

      expect(multilingualCollection.docs).toHaveLength(2);
      expect(multilingualCollection.docs[0]?.metadata.title).toBe('Getting Started');
      expect(multilingualCollection.docs[1]?.metadata.title).toBe('はじめに');
      expect(multilingualCollection.categories['guides']).toHaveLength(1);
      expect(multilingualCollection.categories['ガイド']).toHaveLength(1);
    });
  });
});

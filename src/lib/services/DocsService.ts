/**
 * Service for collecting and processing documentation files
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { ProcessedDoc, DocsCollection, DocNavigation } from '../types/docs.js';
import {
  processMarkdown,
  calculateReadingTime,
  calculateWordCount,
  resolveRelativeLinks,
} from '../markdown/processor.js';

export class DocsService {
  private readonly rootDir: string;
  private readonly docsDir: string;

  constructor(rootDir: string = process.cwd()) {
    this.rootDir = rootDir;
    this.docsDir = path.join(rootDir, 'docs');
  }

  /**
   * Collect all documentation files
   */
  async collectDocs(): Promise<DocsCollection> {
    const docFiles: ProcessedDoc[] = [];

    // Process README.md
    const readmePath = path.join(this.rootDir, 'README.md');
    try {
      const readmeDoc = await this.processDocFile(readmePath, 'readme');
      docFiles.push(readmeDoc);
    } catch (error) {
      console.warn('Failed to process README.md:', error);
    }

    // Process docs/*.md files
    try {
      const docsFiles = await fs.readdir(this.docsDir);
      for (const file of docsFiles) {
        if (file.endsWith('.md')) {
          const filePath = path.join(this.docsDir, file);
          const slug = file.replace('.md', '');
          const doc = await this.processDocFile(filePath, slug);
          docFiles.push(doc);
        }
      }
    } catch (error) {
      console.warn('Failed to read docs directory:', error);
    }

    // Sort docs by order and title
    docFiles.sort((a, b) => {
      const aOrder = a.metadata.order || 0;
      const bOrder = b.metadata.order || 0;
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      return a.metadata.title.localeCompare(b.metadata.title);
    });

    // Generate navigation structure
    const navigation = this.generateNavigation(docFiles);
    const categories = this.groupByCategory(docFiles);

    return {
      docs: docFiles,
      navigation,
      categories,
    };
  }

  /**
   * Get a specific document by slug
   */
  async getDoc(slug: string): Promise<ProcessedDoc | null> {
    const collection = await this.collectDocs();
    return collection.docs.find(doc => doc.slug === slug) || null;
  }

  /**
   * Search documents by content
   */
  async searchDocs(query: string): Promise<ProcessedDoc[]> {
    const collection = await this.collectDocs();
    const lowercaseQuery = query.toLowerCase();

    return collection.docs.filter(
      doc =>
        doc.metadata.title.toLowerCase().includes(lowercaseQuery) ||
        doc.metadata.description?.toLowerCase().includes(lowercaseQuery) ||
        doc.content.toLowerCase().includes(lowercaseQuery) ||
        doc.metadata.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  /**
   * Process a single documentation file
   */
  private async processDocFile(filePath: string, slug: string): Promise<ProcessedDoc> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const resolvedContent = resolveRelativeLinks(content, filePath);

      const { metadata, htmlContent, sections } = await processMarkdown(resolvedContent, filePath);

      const wordCount = calculateWordCount(content);
      const readingTime = calculateReadingTime(content);

      // Generate related docs (simplified - could be enhanced with similarity)
      const relatedDocs: string[] = [];

      // Generate breadcrumbs
      const breadcrumbs = this.generateBreadcrumbs(slug, metadata.category);

      return {
        slug,
        path: filePath,
        metadata,
        content: resolvedContent,
        htmlContent,
        wordCount,
        readingTime,
        sections,
        relatedDocs,
        breadcrumbs,
      };
    } catch (error) {
      throw new Error(`Failed to process document file ${filePath}: ${error}`);
    }
  }

  /**
   * Generate navigation structure
   */
  private generateNavigation(docs: ProcessedDoc[]): DocNavigation[] {
    const navigation: DocNavigation[] = [];

    // Add README as overview
    const readme = docs.find(doc => doc.slug === 'readme');
    if (readme) {
      navigation.push({
        title: '概要',
        slug: 'readme',
        order: 0,
      });
    }

    // Add other docs grouped by category
    const categories = new Map<string, ProcessedDoc[]>();

    docs.forEach(doc => {
      if (doc.slug === 'readme') return;

      const category = doc.metadata.category || 'general';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(doc);
    });

    // Convert categories to navigation structure
    const categoryOrder = ['documentation', 'general'];
    const categoryTitles: Record<string, string> = {
      documentation: 'ドキュメント',
      general: '一般',
      overview: '概要',
    };

    categoryOrder.forEach(categoryKey => {
      const categoryDocs = categories.get(categoryKey);
      if (categoryDocs && categoryDocs.length > 0) {
        const children = categoryDocs.map(doc => ({
          title: doc.metadata.title,
          slug: doc.slug,
          order: doc.metadata.order,
        }));

        children.sort((a, b) => (a.order || 0) - (b.order || 0));

        navigation.push({
          title: categoryTitles[categoryKey] || categoryKey,
          slug: categoryKey,
          children,
          category: categoryKey,
        });
      }
    });

    return navigation;
  }

  /**
   * Group documents by category
   */
  private groupByCategory(docs: ProcessedDoc[]): Record<string, DocNavigation[]> {
    const categories: Record<string, DocNavigation[]> = {};

    docs.forEach(doc => {
      const category = doc.metadata.category || 'general';
      if (!categories[category]) {
        categories[category] = [];
      }

      categories[category].push({
        title: doc.metadata.title,
        slug: doc.slug,
        order: doc.metadata.order,
      });
    });

    // Sort each category
    Object.keys(categories).forEach(category => {
      const categoryDocs = categories[category];
      if (categoryDocs) {
        categoryDocs.sort((a, b) => (a.order || 0) - (b.order || 0));
      }
    });

    return categories;
  }

  /**
   * Generate breadcrumbs for a document
   */
  private generateBreadcrumbs(
    slug: string,
    category?: string
  ): Array<{ title: string; slug: string }> {
    const breadcrumbs = [{ title: 'ドキュメント', slug: '' }]; // Empty slug points to /docs/ root

    if (category && category !== 'overview') {
      // Don't add intermediate breadcrumb since we don't have category index pages
      // const categoryTitles: Record<string, string> = {
      //   documentation: 'ドキュメント',
      //   general: '一般',
      //   overview: '概要',
      // };
      // breadcrumbs.push({
      //   title: categoryTitles[category] || category,
      //   slug: category,
      // });
    }

    return breadcrumbs;
  }
}

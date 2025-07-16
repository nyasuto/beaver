/**
 * Documentation types for markdown processing and display
 */

export interface DocMetadata {
  title: string;
  description?: string;
  lastModified: Date;
  tags?: string[];
  order?: number;
  category?: string;
}

export interface DocFile {
  slug: string;
  path: string;
  metadata: DocMetadata;
  content: string;
  htmlContent: string;
  wordCount: number;
  readingTime: number; // in minutes
}

export interface DocSection {
  id: string;
  title: string;
  level: number;
  anchor: string;
  children?: DocSection[];
  expanded?: boolean;
}

export interface TOCCollapsibleState {
  [sectionId: string]: boolean;
}

export interface DocNavigation {
  title: string;
  slug: string;
  children?: DocNavigation[];
  category?: string;
  order?: number;
}

export interface ProcessedDoc extends DocFile {
  sections: DocSection[];
  relatedDocs: string[];
  breadcrumbs: Array<{ title: string; slug: string }>;
}

export interface DocsCollection {
  docs: ProcessedDoc[];
  navigation: DocNavigation[];
  categories: Record<string, DocNavigation[]>;
}

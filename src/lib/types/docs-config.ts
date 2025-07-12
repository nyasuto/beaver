/**
 * Configuration types for the documentation system
 * Designed to make the docs system reusable across different projects
 */

import { z } from 'zod';

/**
 * Project-specific configuration
 */
export const ProjectConfigSchema = z.object({
  name: z.string().min(1),
  emoji: z.string().optional(),
  description: z.string().optional(),
  githubUrl: z.string().url().optional(),
  editBaseUrl: z.string().url().optional(),
  homeUrl: z.string().url().optional(),
});

/**
 * Quick navigation link configuration
 */
export const QuickLinkSchema = z.object({
  title: z.string().min(1),
  href: z.string().min(1),
  icon: z.string().optional(),
  description: z.string().optional(),
  color: z.enum(['blue', 'green', 'purple', 'red', 'yellow', 'gray']).optional(),
});

/**
 * UI and internationalization configuration
 */
export const UIConfigSchema = z.object({
  language: z.enum(['en', 'ja']).default('en'),
  theme: z.enum(['default', 'minimal', 'modern']).default('default'),
  showBreadcrumbs: z.boolean().default(true),
  showTableOfContents: z.boolean().default(true),
  showReadingTime: z.boolean().default(true),
  showWordCount: z.boolean().default(true),
  showLastModified: z.boolean().default(true),
  showEditLink: z.boolean().default(true),
  showTags: z.boolean().default(true),
});

/**
 * Navigation configuration
 */
export const NavigationConfigSchema = z.object({
  quickLinks: z.array(QuickLinkSchema).optional(),
  categories: z.record(z.string(), z.string()).optional(),
  showQuickLinks: z.boolean().default(true),
  showSearch: z.boolean().default(true),
});

/**
 * Path and directory configuration
 */
export const PathConfigSchema = z.object({
  docsDir: z.string().default('docs'),
  baseUrl: z.string().default('/docs'),
  assetsDir: z.string().optional(),
});

/**
 * Search configuration
 */
export const SearchConfigSchema = z.object({
  enabled: z.boolean().default(true),
  placeholder: z.string().optional(),
  maxResults: z.number().min(1).default(10),
  searchInContent: z.boolean().default(true),
  searchInTags: z.boolean().default(true),
  searchInTitles: z.boolean().default(true),
});

/**
 * Complete documentation system configuration
 */
export const DocsConfigSchema = z.object({
  project: ProjectConfigSchema,
  ui: UIConfigSchema.optional(),
  navigation: NavigationConfigSchema.optional(),
  paths: PathConfigSchema.optional(),
  search: SearchConfigSchema.optional(),
});

/**
 * TypeScript types derived from Zod schemas
 */
export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;
export type QuickLink = z.infer<typeof QuickLinkSchema>;
export type UIConfig = z.infer<typeof UIConfigSchema>;
export type NavigationConfig = z.infer<typeof NavigationConfigSchema>;
export type PathConfig = z.infer<typeof PathConfigSchema>;
export type SearchConfig = z.infer<typeof SearchConfigSchema>;
export type DocsConfig = z.infer<typeof DocsConfigSchema>;

/**
 * Default configuration values
 */
export const DEFAULT_DOCS_CONFIG: Partial<DocsConfig> = {
  ui: {
    language: 'en',
    theme: 'default',
    showBreadcrumbs: true,
    showTableOfContents: true,
    showReadingTime: true,
    showWordCount: true,
    showLastModified: true,
    showEditLink: true,
    showTags: true,
  },
  navigation: {
    showQuickLinks: true,
    showSearch: true,
  },
  paths: {
    docsDir: 'docs',
    baseUrl: '/docs',
  },
  search: {
    enabled: true,
    maxResults: 10,
    searchInContent: true,
    searchInTags: true,
    searchInTitles: true,
  },
};

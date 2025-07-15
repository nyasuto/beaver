/**
 * Documentation Configuration Types Tests
 *
 * Tests for Zod schemas and TypeScript types used in the documentation system
 * Validates schema parsing, type safety, and configuration validation
 */

import { describe, it, expect } from 'vitest';
import {
  ProjectConfigSchema,
  QuickLinkSchema,
  UIConfigSchema,
  NavigationConfigSchema,
  PathConfigSchema,
  SearchConfigSchema,
  DocsConfigSchema,
  DEFAULT_DOCS_CONFIG,
  type ProjectConfig,
  type QuickLink,
  type UIConfig,
  type NavigationConfig,
  type PathConfig,
  type SearchConfig,
  type DocsConfig,
} from '../docs-config';

describe('Documentation Configuration Types', () => {
  describe('ProjectConfigSchema', () => {
    it('should validate complete project configuration', () => {
      const validConfig = {
        name: 'Test Project',
        emoji: '📚',
        description: 'A test project for documentation',
        githubUrl: 'https://github.com/test/project',
        editBaseUrl: 'https://github.com/test/project/edit/main',
        homeUrl: 'https://test-project.com',
      };

      const result = ProjectConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.name).toBe('Test Project');
        expect(result.data.emoji).toBe('📚');
        expect(result.data.description).toBe('A test project for documentation');
        expect(result.data.githubUrl).toBe('https://github.com/test/project');
        expect(result.data.editBaseUrl).toBe('https://github.com/test/project/edit/main');
        expect(result.data.homeUrl).toBe('https://test-project.com');
      }
    });

    it('should validate minimal project configuration', () => {
      const minimalConfig = {
        name: 'Minimal Project',
      };

      const result = ProjectConfigSchema.safeParse(minimalConfig);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.name).toBe('Minimal Project');
        expect(result.data.emoji).toBeUndefined();
        expect(result.data.description).toBeUndefined();
        expect(result.data.githubUrl).toBeUndefined();
        expect(result.data.editBaseUrl).toBeUndefined();
        expect(result.data.homeUrl).toBeUndefined();
      }
    });

    it('should reject invalid project configuration', () => {
      // Test empty name
      const emptyName = ProjectConfigSchema.safeParse({ name: '' });
      expect(emptyName.success).toBe(false);

      // Test whitespace only name (this actually passes in Zod)
      const whitespaceResult = ProjectConfigSchema.safeParse({ name: '   ' });
      expect(whitespaceResult.success).toBe(true); // Zod doesn't trim by default

      // Test missing name
      const missingName = ProjectConfigSchema.safeParse({});
      expect(missingName.success).toBe(false);

      // Test invalid GitHub URL
      const invalidGithubUrl = ProjectConfigSchema.safeParse({
        name: 'Test',
        githubUrl: 'invalid-url',
      });
      expect(invalidGithubUrl.success).toBe(false);

      // Test invalid edit base URL
      const invalidEditBaseUrl = ProjectConfigSchema.safeParse({
        name: 'Test',
        editBaseUrl: 'not-a-url',
      });
      expect(invalidEditBaseUrl.success).toBe(false);
    });

    it('should validate URL formats', () => {
      const validUrls = [
        'https://github.com/owner/repo',
        'http://example.com',
        'https://subdomain.example.com/path',
      ];

      validUrls.forEach(url => {
        const config = {
          name: 'Test',
          githubUrl: url,
          editBaseUrl: url,
        };

        const result = ProjectConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
      });
    });

    it('should provide proper TypeScript types', () => {
      const config: ProjectConfig = {
        name: 'Typed Project',
        emoji: '🎯',
        description: 'TypeScript type validation',
        githubUrl: 'https://github.com/test/typed',
        editBaseUrl: 'https://github.com/test/typed/edit/main',
        homeUrl: 'https://typed-project.com',
      };

      expect(config.name).toBe('Typed Project');
      expect(config.emoji).toBe('🎯');
      expect(config.description).toBe('TypeScript type validation');
    });
  });

  describe('QuickLinkSchema', () => {
    it('should validate complete quick link configuration', () => {
      const validLink = {
        title: 'Quick Start',
        href: '/docs/quickstart',
        icon: '🚀',
        description: 'Get started quickly',
        color: 'blue' as const,
      };

      const result = QuickLinkSchema.safeParse(validLink);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.title).toBe('Quick Start');
        expect(result.data.href).toBe('/docs/quickstart');
        expect(result.data.icon).toBe('🚀');
        expect(result.data.description).toBe('Get started quickly');
        expect(result.data.color).toBe('blue');
      }
    });

    it('should validate minimal quick link configuration', () => {
      const minimalLink = {
        title: 'Basic Link',
        href: '/basic',
      };

      const result = QuickLinkSchema.safeParse(minimalLink);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.title).toBe('Basic Link');
        expect(result.data.href).toBe('/basic');
        expect(result.data.icon).toBeUndefined();
        expect(result.data.description).toBeUndefined();
        expect(result.data.color).toBeUndefined();
      }
    });

    it('should validate all color options', () => {
      const colors = ['blue', 'green', 'purple', 'red', 'yellow', 'gray'] as const;

      colors.forEach(color => {
        const link = {
          title: 'Test Link',
          href: '/test',
          color: color,
        };

        const result = QuickLinkSchema.safeParse(link);
        expect(result.success).toBe(true);

        if (result.success) {
          expect(result.data.color).toBe(color);
        }
      });
    });

    it('should reject invalid quick link configuration', () => {
      const invalidLinks = [
        { title: '', href: '/test' }, // empty title
        { title: 'Test', href: '' }, // empty href
        { title: 'Test', href: '/test', color: 'invalid' }, // invalid color
        { href: '/test' }, // missing title
        { title: 'Test' }, // missing href
      ];

      invalidLinks.forEach(link => {
        const result = QuickLinkSchema.safeParse(link);
        expect(result.success).toBe(false);
      });
    });

    it('should provide proper TypeScript types', () => {
      const link: QuickLink = {
        title: 'Typed Link',
        href: '/typed',
        icon: '📖',
        description: 'TypeScript validation',
        color: 'green',
      };

      expect(link.title).toBe('Typed Link');
      expect(link.color).toBe('green');
    });
  });

  describe('UIConfigSchema', () => {
    it('should validate complete UI configuration', () => {
      const validConfig = {
        language: 'ja' as const,
        theme: 'modern' as const,
        showBreadcrumbs: false,
        showTableOfContents: false,
        showReadingTime: false,
        showWordCount: false,
        showLastModified: false,
        showEditLink: false,
        showTags: false,
      };

      const result = UIConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.language).toBe('ja');
        expect(result.data.theme).toBe('modern');
        expect(result.data.showBreadcrumbs).toBe(false);
        expect(result.data.showTableOfContents).toBe(false);
        expect(result.data.showReadingTime).toBe(false);
        expect(result.data.showWordCount).toBe(false);
        expect(result.data.showLastModified).toBe(false);
        expect(result.data.showEditLink).toBe(false);
        expect(result.data.showTags).toBe(false);
      }
    });

    it('should apply default values', () => {
      const emptyConfig = {};

      const result = UIConfigSchema.safeParse(emptyConfig);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.language).toBe('en');
        expect(result.data.theme).toBe('default');
        expect(result.data.showBreadcrumbs).toBe(true);
        expect(result.data.showTableOfContents).toBe(true);
        expect(result.data.showReadingTime).toBe(true);
        expect(result.data.showWordCount).toBe(true);
        expect(result.data.showLastModified).toBe(true);
        expect(result.data.showEditLink).toBe(true);
        expect(result.data.showTags).toBe(true);
      }
    });

    it('should validate language options', () => {
      const languages = ['en', 'ja'] as const;

      languages.forEach(language => {
        const config = { language };
        const result = UIConfigSchema.safeParse(config);
        expect(result.success).toBe(true);

        if (result.success) {
          expect(result.data.language).toBe(language);
        }
      });
    });

    it('should validate theme options', () => {
      const themes = ['default', 'minimal', 'modern'] as const;

      themes.forEach(theme => {
        const config = { theme };
        const result = UIConfigSchema.safeParse(config);
        expect(result.success).toBe(true);

        if (result.success) {
          expect(result.data.theme).toBe(theme);
        }
      });
    });

    it('should reject invalid UI configuration', () => {
      const invalidConfigs = [
        { language: 'fr' }, // unsupported language
        { theme: 'custom' }, // unsupported theme
        { showBreadcrumbs: 'yes' }, // invalid boolean
        { showTableOfContents: 1 }, // invalid boolean
      ];

      invalidConfigs.forEach(config => {
        const result = UIConfigSchema.safeParse(config);
        expect(result.success).toBe(false);
      });
    });

    it('should provide proper TypeScript types', () => {
      const config: UIConfig = {
        language: 'ja',
        theme: 'minimal',
        showBreadcrumbs: true,
        showTableOfContents: true,
        showReadingTime: true,
        showWordCount: true,
        showLastModified: true,
        showEditLink: true,
        showTags: true,
      };

      expect(config.language).toBe('ja');
      expect(config.theme).toBe('minimal');
      expect(config.showBreadcrumbs).toBe(true);
    });
  });

  describe('NavigationConfigSchema', () => {
    it('should validate complete navigation configuration', () => {
      const validConfig = {
        quickLinks: [
          {
            title: 'Home',
            href: '/',
            icon: '🏠',
            color: 'blue' as const,
          },
          {
            title: 'About',
            href: '/about',
            icon: 'ℹ️',
            color: 'green' as const,
          },
        ],
        categories: {
          'getting-started': 'Getting Started',
          api: 'API Reference',
          guides: 'Guides',
        },
        showQuickLinks: false,
        showSearch: false,
      };

      const result = NavigationConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.quickLinks).toHaveLength(2);
        expect(result.data.quickLinks?.[0]?.title).toBe('Home');
        expect(result.data.quickLinks?.[1]?.title).toBe('About');
        expect(result.data.categories).toEqual({
          'getting-started': 'Getting Started',
          api: 'API Reference',
          guides: 'Guides',
        });
        expect(result.data.showQuickLinks).toBe(false);
        expect(result.data.showSearch).toBe(false);
      }
    });

    it('should apply default values', () => {
      const emptyConfig = {};

      const result = NavigationConfigSchema.safeParse(emptyConfig);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.quickLinks).toBeUndefined();
        expect(result.data.categories).toBeUndefined();
        expect(result.data.showQuickLinks).toBe(true);
        expect(result.data.showSearch).toBe(true);
      }
    });

    it('should validate empty arrays and objects', () => {
      const config = {
        quickLinks: [],
        categories: {},
      };

      const result = NavigationConfigSchema.safeParse(config);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.quickLinks).toEqual([]);
        expect(result.data.categories).toEqual({});
      }
    });

    it('should reject invalid navigation configuration', () => {
      const invalidConfigs = [
        { quickLinks: [{ title: 'Invalid' }] }, // missing href in quickLink
        { quickLinks: [{ href: '/invalid' }] }, // missing title in quickLink
        { showQuickLinks: 'true' }, // invalid boolean
        { showSearch: 1 }, // invalid boolean
      ];

      invalidConfigs.forEach(config => {
        const result = NavigationConfigSchema.safeParse(config);
        expect(result.success).toBe(false);
      });
    });

    it('should provide proper TypeScript types', () => {
      const config: NavigationConfig = {
        quickLinks: [
          {
            title: 'Documentation',
            href: '/docs',
            icon: '📚',
            description: 'Read the docs',
            color: 'blue',
          },
        ],
        categories: {
          docs: 'Documentation',
          api: 'API',
        },
        showQuickLinks: true,
        showSearch: true,
      };

      expect(config.quickLinks).toHaveLength(1);
      expect(config.categories?.['docs']).toBe('Documentation');
    });
  });

  describe('PathConfigSchema', () => {
    it('should validate complete path configuration', () => {
      const validConfig = {
        docsDir: 'documentation',
        baseUrl: '/custom-docs',
        assetsDir: 'assets',
      };

      const result = PathConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.docsDir).toBe('documentation');
        expect(result.data.baseUrl).toBe('/custom-docs');
        expect(result.data.assetsDir).toBe('assets');
      }
    });

    it('should apply default values', () => {
      const emptyConfig = {};

      const result = PathConfigSchema.safeParse(emptyConfig);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.docsDir).toBe('docs');
        expect(result.data.baseUrl).toBe('/docs');
        expect(result.data.assetsDir).toBeUndefined();
      }
    });

    it('should validate minimal path configuration', () => {
      const minimalConfig = {
        docsDir: 'custom-docs',
      };

      const result = PathConfigSchema.safeParse(minimalConfig);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.docsDir).toBe('custom-docs');
        expect(result.data.baseUrl).toBe('/docs'); // default
        expect(result.data.assetsDir).toBeUndefined();
      }
    });

    it('should provide proper TypeScript types', () => {
      const config: PathConfig = {
        docsDir: 'docs',
        baseUrl: '/docs',
        assetsDir: 'static',
      };

      expect(config.docsDir).toBe('docs');
      expect(config.baseUrl).toBe('/docs');
      expect(config.assetsDir).toBe('static');
    });
  });

  describe('SearchConfigSchema', () => {
    it('should validate complete search configuration', () => {
      const validConfig = {
        enabled: false,
        placeholder: 'Search everything...',
        maxResults: 20,
        searchInContent: false,
        searchInTags: false,
        searchInTitles: false,
      };

      const result = SearchConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.enabled).toBe(false);
        expect(result.data.placeholder).toBe('Search everything...');
        expect(result.data.maxResults).toBe(20);
        expect(result.data.searchInContent).toBe(false);
        expect(result.data.searchInTags).toBe(false);
        expect(result.data.searchInTitles).toBe(false);
      }
    });

    it('should apply default values', () => {
      const emptyConfig = {};

      const result = SearchConfigSchema.safeParse(emptyConfig);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.enabled).toBe(true);
        expect(result.data.placeholder).toBeUndefined();
        expect(result.data.maxResults).toBe(10);
        expect(result.data.searchInContent).toBe(true);
        expect(result.data.searchInTags).toBe(true);
        expect(result.data.searchInTitles).toBe(true);
      }
    });

    it('should validate maxResults constraints', () => {
      const validConfigs = [{ maxResults: 1 }, { maxResults: 10 }, { maxResults: 100 }];

      validConfigs.forEach(config => {
        const result = SearchConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid search configuration', () => {
      const invalidConfigs = [
        { maxResults: 0 }, // below minimum
        { maxResults: -1 }, // negative
        { maxResults: 'ten' }, // not a number
        { enabled: 'true' }, // invalid boolean
        { searchInContent: 1 }, // invalid boolean
      ];

      invalidConfigs.forEach(config => {
        const result = SearchConfigSchema.safeParse(config);
        expect(result.success).toBe(false);
      });
    });

    it('should provide proper TypeScript types', () => {
      const config: SearchConfig = {
        enabled: true,
        placeholder: 'Find anything...',
        maxResults: 15,
        searchInContent: true,
        searchInTags: true,
        searchInTitles: true,
      };

      expect(config.enabled).toBe(true);
      expect(config.placeholder).toBe('Find anything...');
      expect(config.maxResults).toBe(15);
    });
  });

  describe('DocsConfigSchema', () => {
    it('should validate complete docs configuration', () => {
      const validConfig = {
        project: {
          name: 'Complete Project',
          emoji: '🎯',
          description: 'A complete documentation project',
          githubUrl: 'https://github.com/test/complete',
          editBaseUrl: 'https://github.com/test/complete/edit/main',
          homeUrl: 'https://complete-project.com',
        },
        ui: {
          language: 'ja' as const,
          theme: 'modern' as const,
          showBreadcrumbs: false,
          showTableOfContents: true,
          showReadingTime: true,
          showWordCount: false,
          showLastModified: true,
          showEditLink: true,
          showTags: false,
        },
        navigation: {
          quickLinks: [
            {
              title: 'Quick Start',
              href: '/quick-start',
              icon: '🚀',
              color: 'blue' as const,
            },
          ],
          categories: {
            guides: 'Guides',
          },
          showQuickLinks: true,
          showSearch: true,
        },
        paths: {
          docsDir: 'documentation',
          baseUrl: '/docs',
          assetsDir: 'assets',
        },
        search: {
          enabled: true,
          placeholder: 'Search docs...',
          maxResults: 15,
          searchInContent: true,
          searchInTags: true,
          searchInTitles: true,
        },
      };

      const result = DocsConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.project.name).toBe('Complete Project');
        expect(result.data.ui?.language).toBe('ja');
        expect(result.data.navigation?.quickLinks).toHaveLength(1);
        expect(result.data.paths?.docsDir).toBe('documentation');
        expect(result.data.search?.enabled).toBe(true);
      }
    });

    it('should validate minimal docs configuration', () => {
      const minimalConfig = {
        project: {
          name: 'Minimal Project',
        },
      };

      const result = DocsConfigSchema.safeParse(minimalConfig);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.project.name).toBe('Minimal Project');
        expect(result.data.ui).toBeUndefined();
        expect(result.data.navigation).toBeUndefined();
        expect(result.data.paths).toBeUndefined();
        expect(result.data.search).toBeUndefined();
      }
    });

    it('should reject invalid docs configuration', () => {
      const invalidConfigs = [
        {}, // missing project
        { project: {} }, // missing project.name
        { project: { name: '' } }, // empty project name
        { project: { name: 'Test' }, ui: { language: 'fr' } }, // invalid language
      ];

      invalidConfigs.forEach(config => {
        const result = DocsConfigSchema.safeParse(config);
        expect(result.success).toBe(false);
      });
    });

    it('should provide proper TypeScript types', () => {
      const config: DocsConfig = {
        project: {
          name: 'Typed Project',
          emoji: '📚',
          description: 'TypeScript validation',
          githubUrl: 'https://github.com/test/typed',
          editBaseUrl: 'https://github.com/test/typed/edit/main',
          homeUrl: 'https://typed-project.com',
        },
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
          quickLinks: [
            {
              title: 'Home',
              href: '/',
              icon: '🏠',
              color: 'blue',
            },
          ],
          categories: {
            docs: 'Documentation',
          },
          showQuickLinks: true,
          showSearch: true,
        },
        paths: {
          docsDir: 'docs',
          baseUrl: '/docs',
          assetsDir: 'assets',
        },
        search: {
          enabled: true,
          placeholder: 'Search...',
          maxResults: 10,
          searchInContent: true,
          searchInTags: true,
          searchInTitles: true,
        },
      };

      expect(config.project.name).toBe('Typed Project');
      expect(config.ui?.language).toBe('en');
      expect(config.navigation?.quickLinks).toHaveLength(1);
      expect(config.paths?.docsDir).toBe('docs');
      expect(config.search?.enabled).toBe(true);
    });
  });

  describe('DEFAULT_DOCS_CONFIG', () => {
    it('should provide valid default configuration', () => {
      expect(DEFAULT_DOCS_CONFIG).toBeDefined();
      expect(DEFAULT_DOCS_CONFIG.ui).toBeDefined();
      expect(DEFAULT_DOCS_CONFIG.navigation).toBeDefined();
      expect(DEFAULT_DOCS_CONFIG.paths).toBeDefined();
      expect(DEFAULT_DOCS_CONFIG.search).toBeDefined();
    });

    it('should have correct default UI values', () => {
      expect(DEFAULT_DOCS_CONFIG.ui?.language).toBe('en');
      expect(DEFAULT_DOCS_CONFIG.ui?.theme).toBe('default');
      expect(DEFAULT_DOCS_CONFIG.ui?.showBreadcrumbs).toBe(true);
      expect(DEFAULT_DOCS_CONFIG.ui?.showTableOfContents).toBe(true);
      expect(DEFAULT_DOCS_CONFIG.ui?.showReadingTime).toBe(true);
      expect(DEFAULT_DOCS_CONFIG.ui?.showWordCount).toBe(true);
      expect(DEFAULT_DOCS_CONFIG.ui?.showLastModified).toBe(true);
      expect(DEFAULT_DOCS_CONFIG.ui?.showEditLink).toBe(true);
      expect(DEFAULT_DOCS_CONFIG.ui?.showTags).toBe(true);
    });

    it('should have correct default navigation values', () => {
      expect(DEFAULT_DOCS_CONFIG.navigation?.showQuickLinks).toBe(true);
      expect(DEFAULT_DOCS_CONFIG.navigation?.showSearch).toBe(true);
    });

    it('should have correct default path values', () => {
      expect(DEFAULT_DOCS_CONFIG.paths?.docsDir).toBe('docs');
      expect(DEFAULT_DOCS_CONFIG.paths?.baseUrl).toBe('/docs');
    });

    it('should have correct default search values', () => {
      expect(DEFAULT_DOCS_CONFIG.search?.enabled).toBe(true);
      expect(DEFAULT_DOCS_CONFIG.search?.maxResults).toBe(10);
      expect(DEFAULT_DOCS_CONFIG.search?.searchInContent).toBe(true);
      expect(DEFAULT_DOCS_CONFIG.search?.searchInTags).toBe(true);
      expect(DEFAULT_DOCS_CONFIG.search?.searchInTitles).toBe(true);
    });

    it('should be usable as partial configuration', () => {
      const config: Partial<DocsConfig> = DEFAULT_DOCS_CONFIG;
      expect(config.ui?.language).toBe('en');
      expect(config.search?.enabled).toBe(true);
    });
  });

  describe('Schema Integration', () => {
    it('should validate nested schema combinations', () => {
      const config = {
        project: {
          name: 'Integration Test',
          emoji: '🔧',
        },
        ui: {
          language: 'ja' as const,
          theme: 'minimal' as const,
        },
        navigation: {
          quickLinks: [
            {
              title: 'Test Link',
              href: '/test',
              color: 'green' as const,
            },
          ],
          showQuickLinks: true,
        },
        search: {
          enabled: true,
          maxResults: 5,
        },
      };

      const result = DocsConfigSchema.safeParse(config);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.project.name).toBe('Integration Test');
        expect(result.data.ui?.language).toBe('ja');
        expect(result.data.navigation?.quickLinks?.[0]?.title).toBe('Test Link');
        expect(result.data.search?.maxResults).toBe(5);
      }
    });

    it('should handle complex validation scenarios', () => {
      const complexConfig = {
        project: {
          name: 'Complex Project',
          githubUrl: 'https://github.com/complex/project',
          editBaseUrl: 'https://github.com/complex/project/edit/develop',
        },
        ui: {
          language: 'en' as const,
          theme: 'modern' as const,
          showBreadcrumbs: false,
          showEditLink: true,
        },
        navigation: {
          quickLinks: [
            {
              title: 'API',
              href: '/api',
              icon: '🔌',
              description: 'API documentation',
              color: 'purple' as const,
            },
            {
              title: 'Examples',
              href: '/examples',
              icon: '💡',
              color: 'yellow' as const,
            },
          ],
          categories: {
            api: 'API Reference',
            examples: 'Examples',
            guides: 'User Guides',
          },
          showQuickLinks: true,
          showSearch: true,
        },
        paths: {
          docsDir: 'documentation',
          baseUrl: '/api-docs',
          assetsDir: 'static/assets',
        },
        search: {
          enabled: true,
          placeholder: 'Search API docs...',
          maxResults: 20,
          searchInContent: true,
          searchInTags: false,
          searchInTitles: true,
        },
      };

      const result = DocsConfigSchema.safeParse(complexConfig);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.project.name).toBe('Complex Project');
        expect(result.data.navigation?.quickLinks).toHaveLength(2);
        expect(result.data.search?.placeholder).toBe('Search API docs...');
      }
    });
  });

  describe('Error Handling', () => {
    it('should provide meaningful error messages', () => {
      const invalidConfig = {
        project: {
          name: '',
          githubUrl: 'not-a-url',
        },
        ui: {
          language: 'invalid-lang',
          theme: 'custom-theme',
        },
        search: {
          maxResults: 0,
        },
      };

      const result = DocsConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);

      if (!result.success) {
        // There are 5 errors: name, githubUrl, language, theme, and maxResults
        expect(result.error.issues).toHaveLength(5);
        expect(result.error.issues.some(issue => issue.path.includes('name'))).toBe(true);
        expect(result.error.issues.some(issue => issue.path.includes('githubUrl'))).toBe(true);
        expect(result.error.issues.some(issue => issue.path.includes('language'))).toBe(true);
        expect(result.error.issues.some(issue => issue.path.includes('theme'))).toBe(true);
        expect(result.error.issues.some(issue => issue.path.includes('maxResults'))).toBe(true);
      }
    });

    it('should handle deeply nested validation errors', () => {
      const invalidConfig = {
        project: {
          name: 'Valid Project',
        },
        navigation: {
          quickLinks: [
            {
              title: '',
              href: '/valid',
            },
            {
              title: 'Valid Title',
              href: '',
            },
          ],
        },
      };

      const result = DocsConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues).toHaveLength(2);
        expect(
          result.error.issues.some(
            issue => issue.path.includes('quickLinks') && issue.path.includes('title')
          )
        ).toBe(true);
        expect(
          result.error.issues.some(
            issue => issue.path.includes('quickLinks') && issue.path.includes('href')
          )
        ).toBe(true);
      }
    });
  });
});

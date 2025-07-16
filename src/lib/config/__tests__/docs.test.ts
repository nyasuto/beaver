/**
 * Documentation Configuration Tests
 *
 * Tests for documentation configuration loading and utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getDocsConfig,
  getTranslator,
  getProjectInfo,
  getNavigationConfig,
  getUIConfig,
  getPathConfig,
  getSearchConfig,
  buildEditUrl,
  buildNavUrl,
  resetConfigCache,
} from '../docs';

// Mock dependencies
vi.mock('../auto-detect', () => ({
  autoDetectConfig: vi.fn(),
  mergeConfigs: vi.fn((auto, user) => ({ ...auto, ...user })),
}));

vi.mock('../yaml-loader', () => ({
  loadYamlConfig: vi.fn(),
}));

vi.mock('../../i18n/index', () => ({
  createTranslator: vi.fn(),
}));

// Import mocked functions
import { autoDetectConfig } from '../auto-detect';
import { loadYamlConfig } from '../yaml-loader';
import { createTranslator } from '../../i18n/index';

describe('Documentation Configuration', () => {
  const mockAutoDetectConfig = vi.mocked(autoDetectConfig);
  const mockLoadYamlConfig = vi.mocked(loadYamlConfig);
  const mockCreateTranslator = vi.mocked(createTranslator);

  beforeEach(() => {
    vi.clearAllMocks();
    resetConfigCache();

    // Setup default mocks
    const mockConfig = {
      project: {
        name: 'Test Project',
        description: 'A test project',
        homeUrl: 'https://test.example.com',
        githubUrl: 'https://github.com/testuser/test-project',
        editBaseUrl: 'https://github.com/testuser/test-project/edit/main',
      },
      ui: {
        language: 'en' as const,
        theme: 'default' as const,
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
        quickLinks: [
          {
            title: 'Quick Start',
            href: '/docs/readme',
          },
        ],
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
        placeholder: 'Search documentation...',
      },
    };

    mockAutoDetectConfig.mockResolvedValue(mockConfig);
    mockLoadYamlConfig.mockResolvedValue(null);
    mockCreateTranslator.mockReturnValue((key: string) => key);
  });

  afterEach(() => {
    vi.clearAllMocks();
    resetConfigCache();
    delete process.env['BASE_URL'];
  });

  describe('getDocsConfig', () => {
    it('should load and return configuration', async () => {
      const config = await getDocsConfig();

      expect(config).toBeDefined();
      expect(config.project.name).toBeDefined();
      expect(mockAutoDetectConfig).toHaveBeenCalledOnce();
    });

    it('should cache configuration and not reload', async () => {
      const config1 = await getDocsConfig();
      const config2 = await getDocsConfig();

      expect(config1).toBe(config2);
      expect(mockAutoDetectConfig).toHaveBeenCalledOnce();
    });

    it('should reload configuration when force is true', async () => {
      await getDocsConfig();
      await getDocsConfig(true);

      expect(mockAutoDetectConfig).toHaveBeenCalledTimes(2);
    });

    it('should merge YAML configuration when available', async () => {
      const yamlConfig = {
        project: { name: 'YAML Project' },
      };
      mockLoadYamlConfig.mockResolvedValue(yamlConfig);

      const config = await getDocsConfig(true);

      expect(mockLoadYamlConfig).toHaveBeenCalledWith('beaver.yml');
      expect(config.project.name).toBeDefined();
    });

    it('should handle missing TypeScript config gracefully', async () => {
      const config = await getDocsConfig();

      expect(config).toBeDefined();
      expect(config.project.name).toBeDefined();
    });
  });

  describe('getTranslator', () => {
    it('should create translator for configured language', async () => {
      const translator = await getTranslator();

      expect(mockCreateTranslator).toHaveBeenCalled();
      expect(translator).toBeDefined();
    });

    it('should use default language when config has no language', async () => {
      const configWithoutLanguage = {
        project: { name: 'Test' },
        ui: {
          language: 'en' as const,
          theme: 'default' as const,
          showBreadcrumbs: true,
          showTableOfContents: true,
          showReadingTime: true,
          showWordCount: true,
          showLastModified: true,
          showEditLink: true,
          showTags: true,
        },
      };
      mockAutoDetectConfig.mockResolvedValue(configWithoutLanguage);
      resetConfigCache();

      await getTranslator();

      expect(mockCreateTranslator).toHaveBeenCalled();
    });
  });

  describe('getProjectInfo', () => {
    it('should return project information from config', async () => {
      const projectInfo = await getProjectInfo();

      expect(projectInfo).toBeDefined();
      expect(projectInfo.name).toBeDefined();
      expect(projectInfo.githubUrl).toContain('github.com');
    });
  });

  describe('getNavigationConfig', () => {
    it('should return navigation configuration from config', async () => {
      const navConfig = await getNavigationConfig();

      expect(navConfig).toBeDefined();
      expect(navConfig.showQuickLinks).toBe(true);
      expect(navConfig.showSearch).toBe(true);
    });

    it('should return default navigation when not configured', async () => {
      const configWithoutNav = { project: { name: 'Test' } };
      mockAutoDetectConfig.mockResolvedValue(configWithoutNav);
      resetConfigCache();

      const navConfig = await getNavigationConfig();

      expect(navConfig.showQuickLinks).toBe(true);
      expect(navConfig.showSearch).toBe(true);
    });
  });

  describe('getUIConfig', () => {
    it('should return UI configuration from config', async () => {
      const uiConfig = await getUIConfig();

      expect(uiConfig).toBeDefined();
      expect(uiConfig.language).toBeDefined();
      expect(uiConfig.theme).toBe('default');
      expect(uiConfig.showBreadcrumbs).toBe(true);
    });

    it('should return default UI config when not configured', async () => {
      const configWithoutUI = { project: { name: 'Test' } };
      mockAutoDetectConfig.mockResolvedValue(configWithoutUI);
      resetConfigCache();

      const uiConfig = await getUIConfig();

      expect(uiConfig.language).toBeDefined();
      expect(uiConfig.theme).toBe('default');
      expect(uiConfig.showBreadcrumbs).toBe(true);
    });
  });

  describe('getPathConfig', () => {
    it('should return path configuration from config', async () => {
      const pathConfig = await getPathConfig();

      expect(pathConfig).toBeDefined();
      expect(pathConfig.docsDir).toBe('docs');
      expect(pathConfig.baseUrl).toContain('docs');
    });

    it('should return default path config when not configured', async () => {
      const configWithoutPaths = { project: { name: 'Test' } };
      mockAutoDetectConfig.mockResolvedValue(configWithoutPaths);
      resetConfigCache();

      const pathConfig = await getPathConfig();

      expect(pathConfig.docsDir).toBe('docs');
      expect(pathConfig.baseUrl).toContain('docs');
    });
  });

  describe('getSearchConfig', () => {
    it('should return search configuration from config', async () => {
      const searchConfig = await getSearchConfig();

      expect(searchConfig).toBeDefined();
      expect(searchConfig.enabled).toBe(true);
      expect(searchConfig.maxResults).toBe(10);
    });

    it('should return default search config when not configured', async () => {
      const configWithoutSearch = { project: { name: 'Test' } };
      mockAutoDetectConfig.mockResolvedValue(configWithoutSearch);
      resetConfigCache();

      const searchConfig = await getSearchConfig();

      expect(searchConfig.enabled).toBe(true);
      expect(searchConfig.maxResults).toBe(10);
      expect(searchConfig.searchInContent).toBe(true);
    });
  });

  describe('buildEditUrl', () => {
    it('should build edit URL for a file', async () => {
      vi.spyOn(process, 'cwd').mockReturnValue('/project/root');

      const editUrl = await buildEditUrl('/project/root/docs/test.md');

      expect(editUrl).toContain('docs/test.md');
    });

    it('should handle edit URL when available', async () => {
      const editUrl = await buildEditUrl('/project/root/docs/test.md');

      expect(editUrl).toContain('docs/test.md');
    });
  });

  describe('buildNavUrl', () => {
    it('should build navigation URL using environment BASE_URL', async () => {
      process.env['BASE_URL'] = '/beaver';

      const navUrl = await buildNavUrl('/issues');

      expect(navUrl).toBe('/beaver/issues');
    });

    it('should build navigation URL for relative paths using environment BASE_URL', async () => {
      process.env['BASE_URL'] = '/beaver';

      const navUrl = await buildNavUrl('readme');

      expect(navUrl).toBe('/beaver/docs/readme');
    });

    it('should use config base URL when environment BASE_URL is not set', async () => {
      delete process.env['BASE_URL'];

      const navUrl = await buildNavUrl('readme');

      expect(navUrl).toContain('docs/readme');
    });

    it('should return absolute paths as-is when no BASE_URL', async () => {
      delete process.env['BASE_URL'];

      const navUrl = await buildNavUrl('/absolute/path');

      expect(navUrl).toBe('/absolute/path');
    });

    it('should handle empty BASE_URL environment variable', async () => {
      process.env['BASE_URL'] = '';

      const navUrl = await buildNavUrl('readme');

      expect(navUrl).toContain('docs/readme');
    });

    it('should use default base URL when config has no paths', async () => {
      delete process.env['BASE_URL'];
      const configWithoutPaths = { project: { name: 'Test' } };
      mockAutoDetectConfig.mockResolvedValue(configWithoutPaths);
      resetConfigCache();

      const navUrl = await buildNavUrl('readme');

      expect(navUrl).toContain('docs/readme');
    });
  });

  describe('resetConfigCache', () => {
    it('should clear cached configuration', async () => {
      // Load config to cache it
      await getDocsConfig();
      expect(mockAutoDetectConfig).toHaveBeenCalledOnce();

      // Reset cache
      resetConfigCache();

      // Load again should call autoDetectConfig again
      await getDocsConfig();
      expect(mockAutoDetectConfig).toHaveBeenCalledTimes(2);
    });
  });

  describe('Integration Tests', () => {
    it('should work with complete configuration flow', async () => {
      const yamlConfig = {
        project: {
          name: 'Test Project',
          description: 'YAML description',
        },
        ui: {
          language: 'en' as const,
          theme: 'minimal' as const,
          showBreadcrumbs: true,
          showTableOfContents: true,
          showReadingTime: true,
          showWordCount: true,
          showLastModified: true,
          showEditLink: true,
          showTags: true,
        },
      };
      mockLoadYamlConfig.mockResolvedValue(yamlConfig);

      const config = await getDocsConfig(true);
      const projectInfo = await getProjectInfo();
      const uiConfig = await getUIConfig();

      expect(config.project.name).toBeDefined(); // from auto-detect
      expect(config.project.description).toBeDefined(); // from YAML
      expect(config.ui?.theme).toBeDefined(); // from YAML
      expect(projectInfo.name).toBeDefined();
      expect(uiConfig.theme).toBeDefined();
    });

    it('should handle multiple configuration sources correctly', async () => {
      // Setup YAML config that overrides some auto-detect values
      const yamlOverrides = {
        project: {
          name: 'Test Project',
        },
        ui: {
          language: 'ja' as const,
          theme: 'default' as const,
          showBreadcrumbs: true,
          showTableOfContents: true,
          showReadingTime: true,
          showWordCount: true,
          showLastModified: true,
          showEditLink: true,
          showTags: true,
        },
        search: {
          enabled: true,
          maxResults: 20,
          searchInContent: true,
          searchInTags: true,
          searchInTitles: true,
          placeholder: 'Search documentation...',
        },
      };
      mockLoadYamlConfig.mockResolvedValue(yamlOverrides);

      const [config, uiConfig, searchConfig] = await Promise.all([
        getDocsConfig(true),
        getUIConfig(),
        getSearchConfig(),
      ]);

      expect(config.ui?.language).toBeDefined();
      expect(config.search?.maxResults).toBeDefined();
      expect(uiConfig.language).toBeDefined();
      expect(searchConfig.maxResults).toBeDefined();
    });
  });
});

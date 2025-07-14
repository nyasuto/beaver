/**
 * Documentation configuration loader and utilities
 * Supports auto-detection, YAML config (beaver.yml), and TypeScript config (docs.config.ts)
 */

import { DocsConfigSchema, type DocsConfig } from '../types/docs-config.js';
import { createTranslator, type SupportedLanguage } from '../i18n/index.js';
import { autoDetectConfig, mergeConfigs } from './auto-detect.js';
import { loadYamlConfig } from './yaml-loader.js';

/**
 * Load TypeScript configuration (docs.config.ts)
 */
async function loadTsConfig(): Promise<Partial<DocsConfig> | null> {
  try {
    const { docsConfig } = await import('../../../docs.config.js');
    console.log('📄 Loading TypeScript configuration from docs.config.ts...');
    return DocsConfigSchema.parse(docsConfig);
  } catch (error) {
    if ((error as any).code !== 'MODULE_NOT_FOUND') {
      console.warn('⚠️  Failed to load docs.config.ts:', error);
    }
    return null;
  }
}

/**
 * Load and validate documentation configuration with auto-detection
 * Priority: auto-detection → beaver.yml → docs.config.ts
 */
async function loadDocsConfig(): Promise<DocsConfig> {
  if (import.meta.env.DEV) {
    console.log('🔧 Loading documentation configuration...');
  }

  // 1. Start with auto-detected configuration
  const autoConfig = await autoDetectConfig();

  // 2. Try to load YAML configuration (beaver.yml)
  const yamlConfig = await loadYamlConfig('beaver.yml');

  // 3. Try to load TypeScript configuration (docs.config.ts)
  const tsConfig = await loadTsConfig();

  // 4. Merge configurations in priority order
  let finalConfig = autoConfig;

  if (yamlConfig) {
    console.log('🔄 Merging YAML configuration...');
    finalConfig = mergeConfigs(finalConfig, yamlConfig);
  }

  if (tsConfig) {
    console.log('🔄 Merging TypeScript configuration...');
    finalConfig = mergeConfigs(finalConfig, tsConfig);
  }

  // 5. Validate the final configuration
  try {
    const validatedConfig = DocsConfigSchema.parse(finalConfig);
    console.log('✅ Configuration loaded successfully');
    return validatedConfig;
  } catch (error) {
    console.warn('⚠️  Configuration validation failed, using auto-detected config:', error);
    return autoConfig;
  }
}

/**
 * Get documentation configuration (cached)
 */
let cachedConfig: DocsConfig | null = null;

export async function getDocsConfig(force: boolean = false): Promise<DocsConfig> {
  if (cachedConfig && !force) {
    return cachedConfig;
  }

  cachedConfig = await loadDocsConfig();
  return cachedConfig;
}

/**
 * Get translator function based on configuration
 */
export async function getTranslator() {
  const config = await getDocsConfig();
  const language = config.ui?.language || 'en';
  return createTranslator(language as SupportedLanguage);
}

/**
 * Get project-specific information
 */
export async function getProjectInfo() {
  const config = await getDocsConfig();
  return config.project;
}

/**
 * Get navigation configuration
 */
export async function getNavigationConfig() {
  const config = await getDocsConfig();
  return config.navigation || { showQuickLinks: true, showSearch: true };
}

/**
 * Get UI configuration
 */
export async function getUIConfig() {
  const config = await getDocsConfig();
  return (
    config.ui || {
      language: 'en' as const,
      theme: 'default' as const,
      showBreadcrumbs: true,
      showTableOfContents: true,
      showReadingTime: true,
      showWordCount: true,
      showLastModified: true,
      showEditLink: true,
      showTags: true,
    }
  );
}

/**
 * Get path configuration
 */
export async function getPathConfig() {
  const config = await getDocsConfig();
  return config.paths || { docsDir: 'docs', baseUrl: '/docs' };
}

/**
 * Get search configuration
 */
export async function getSearchConfig() {
  const config = await getDocsConfig();
  return (
    config.search || {
      enabled: true,
      maxResults: 10,
      searchInContent: true,
      searchInTags: true,
      searchInTitles: true,
    }
  );
}

/**
 * Utility to build edit URL for a file
 */
export async function buildEditUrl(filePath: string): Promise<string | null> {
  const config = await getDocsConfig();
  const { editBaseUrl } = config.project;

  if (!editBaseUrl) {
    return null;
  }

  // Remove the project root from the file path
  const relativePath = filePath.replace(process.cwd() + '/', '');
  return `${editBaseUrl}/${relativePath}`;
}

/**
 * Utility to build navigation URLs
 */
export async function buildNavUrl(path: string): Promise<string> {
  // Use BASE_URL environment variable first (for GitHub Actions deployment)
  const envBaseUrl = process.env['BASE_URL'];

  if (envBaseUrl && envBaseUrl.trim() !== '') {
    // Handle absolute paths by prepending BASE_URL
    if (path.startsWith('/')) {
      return `${envBaseUrl}${path}`;
    }
    // Handle relative paths by building from base + docs
    return `${envBaseUrl}/docs/${path}`;
  }

  // Fallback to configuration
  const config = await getDocsConfig();
  const { baseUrl } = config.paths || {};

  if (path.startsWith('/')) {
    return path;
  }

  return `${baseUrl || '/docs'}/${path}`;
}

/**
 * Reset cached configuration (for testing)
 */
export function resetConfigCache(): void {
  cachedConfig = null;
}

/**
 * Automatic configuration detection for documentation system
 * Generates reasonable defaults by analyzing the project structure
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { DocsConfig } from '../types/docs-config.js';

interface PackageJson {
  name?: string;
  description?: string;
  homepage?: string;
  repository?: string | { url: string };
  language?: string;
}

interface GitHubContext {
  repository?: string;
  serverUrl?: string;
  ref?: string;
}

/**
 * Detect project information from package.json
 */
async function detectPackageInfo(rootDir: string = process.cwd()): Promise<Partial<DocsConfig>> {
  try {
    const packagePath = path.join(rootDir, 'package.json');
    const packageContent = await fs.readFile(packagePath, 'utf-8');
    const pkg: PackageJson = JSON.parse(packageContent);

    const projectName = pkg.name
      ? pkg.name
          .split('/')
          .pop()
          ?.replace(/-/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase()) || pkg.name
      : 'Documentation';

    return {
      project: {
        name: projectName,
        description: pkg.description,
        homeUrl: pkg.homepage || '/',
      },
    };
  } catch (error) {
    console.warn('Could not read package.json:', error);
    return {
      project: {
        name: 'Documentation',
        description: 'Project documentation',
      },
    };
  }
}

/**
 * Detect GitHub repository information
 */
function detectGitHubInfo(): Partial<DocsConfig> {
  const githubContext: GitHubContext = {
    repository: process.env['GITHUB_REPOSITORY'],
    serverUrl: process.env['GITHUB_SERVER_URL'] || 'https://github.com',
    ref: process.env['GITHUB_REF_NAME'] || 'main',
  };

  if (!githubContext.repository) {
    return {};
  }

  const githubUrl = `${githubContext.serverUrl}/${githubContext.repository}`;
  const editBaseUrl = `${githubUrl}/edit/${githubContext.ref}`;

  return {
    project: {
      githubUrl,
      editBaseUrl,
    },
  } as Partial<DocsConfig>;
}

/**
 * Detect language from README.md and other files
 */
async function detectLanguage(rootDir: string = process.cwd()): Promise<'en' | 'ja'> {
  try {
    // Check README.md for Japanese characters
    const readmePath = path.join(rootDir, 'README.md');
    const readmeContent = await fs.readFile(readmePath, 'utf-8');

    // Simple Japanese character detection
    const japaneseChars = readmeContent.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g);
    const totalChars = readmeContent.replace(/\s/g, '').length;

    if (japaneseChars && totalChars > 0) {
      const japaneseRatio = japaneseChars.length / totalChars;
      if (japaneseRatio > 0.1) {
        return 'ja';
      }
    }
  } catch {
    // README.md doesn't exist or can't be read
  }

  return 'en';
}

/**
 * Detect project structure and available files
 */
async function detectProjectStructure(rootDir: string = process.cwd()) {
  const checkFile = async (filePath: string) => {
    try {
      await fs.access(path.join(rootDir, filePath));
      return true;
    } catch {
      return false;
    }
  };

  const checkDir = async (dirPath: string) => {
    try {
      const stat = await fs.stat(path.join(rootDir, dirPath));
      return stat.isDirectory();
    } catch {
      return false;
    }
  };

  return {
    hasReadme: await checkFile('README.md'),
    hasDocs: await checkDir('docs'),
    hasPackageJson: await checkFile('package.json'),
    hasGitFolder: await checkDir('.git'),
  };
}

/**
 * Generate quick links based on common documentation patterns
 */
function generateQuickLinks(language: 'en' | 'ja', hasReadme: boolean): any[] {
  const links = {
    en: [
      {
        title: 'Quick Start',
        href: hasReadme ? '/docs/readme' : '/docs',
        icon: '🚀',
        description: 'Get started quickly',
        color: 'blue',
      },
      {
        title: 'API Reference',
        href: '/docs/api',
        icon: '📖',
        description: 'Detailed API documentation',
        color: 'green',
      },
      {
        title: 'Examples',
        href: '/docs/examples',
        icon: '💡',
        description: 'Code examples and tutorials',
        color: 'purple',
      },
    ],
    ja: [
      {
        title: 'クイックスタート',
        href: hasReadme ? '/docs/readme' : '/docs',
        icon: '🚀',
        description: '素早く開始する',
        color: 'blue',
      },
      {
        title: 'API リファレンス',
        href: '/docs/api',
        icon: '📖',
        description: '詳細なAPI仕様',
        color: 'green',
      },
      {
        title: '使用例',
        href: '/docs/examples',
        icon: '💡',
        description: 'コード例とチュートリアル',
        color: 'purple',
      },
    ],
  };

  return links[language];
}

/**
 * Auto-detect and generate reasonable default configuration
 */
export async function autoDetectConfig(rootDir: string = process.cwd()): Promise<DocsConfig> {
  console.log('🔍 Auto-detecting project configuration...');

  // Detect various aspects of the project
  const [packageInfo, githubInfo, language, structure] = await Promise.all([
    detectPackageInfo(rootDir),
    Promise.resolve(detectGitHubInfo()),
    detectLanguage(rootDir),
    detectProjectStructure(rootDir),
  ]);

  // Generate quick links based on detected structure
  const quickLinks = generateQuickLinks(language, structure.hasReadme);

  // Merge all detected information
  const autoConfig: DocsConfig = {
    project: {
      name: 'Documentation',
      emoji: '📚',
      description: 'Project documentation',
      ...packageInfo.project,
      ...githubInfo.project,
    },
    ui: {
      language,
      theme: 'default',
      showBreadcrumbs: true,
      showTableOfContents: true,
      showReadingTime: true,
      showWordCount: true,
      showLastModified: true,
      showEditLink: !!githubInfo.project?.editBaseUrl,
      showTags: true,
    },
    navigation: {
      quickLinks,
      categories: {
        documentation: language === 'ja' ? '📖 ドキュメント' : '📖 Documentation',
        general: language === 'ja' ? '📄 一般' : '📄 General',
        overview: language === 'ja' ? '🔍 概要' : '🔍 Overview',
      },
      showQuickLinks: true,
      showSearch: true,
    },
    paths: {
      docsDir: 'docs',
      baseUrl: '/docs',
    },
    search: {
      enabled: true,
      placeholder: language === 'ja' ? 'ドキュメントを検索...' : 'Search documentation...',
      maxResults: 10,
      searchInContent: true,
      searchInTags: true,
      searchInTitles: true,
    },
  };

  console.log('✅ Auto-detected configuration:', {
    projectName: autoConfig.project.name,
    language: autoConfig.ui?.language,
    hasGitHub: !!autoConfig.project.githubUrl,
    structure,
  });

  return autoConfig;
}

/**
 * Merge auto-detected config with user-provided config
 */
export function mergeConfigs(autoConfig: DocsConfig, userConfig: Partial<DocsConfig>): DocsConfig {
  const result: DocsConfig = {
    project: { ...autoConfig.project, ...(userConfig.project || {}) },
    ui: {
      language: userConfig.ui?.language || autoConfig.ui?.language || 'en',
      theme: userConfig.ui?.theme || autoConfig.ui?.theme || 'default',
      showBreadcrumbs: userConfig.ui?.showBreadcrumbs ?? autoConfig.ui?.showBreadcrumbs ?? true,
      showTableOfContents:
        userConfig.ui?.showTableOfContents ?? autoConfig.ui?.showTableOfContents ?? true,
      showReadingTime: userConfig.ui?.showReadingTime ?? autoConfig.ui?.showReadingTime ?? true,
      showWordCount: userConfig.ui?.showWordCount ?? autoConfig.ui?.showWordCount ?? true,
      showLastModified: userConfig.ui?.showLastModified ?? autoConfig.ui?.showLastModified ?? true,
      showEditLink: userConfig.ui?.showEditLink ?? autoConfig.ui?.showEditLink ?? true,
      showTags: userConfig.ui?.showTags ?? autoConfig.ui?.showTags ?? true,
    },
    navigation: {
      ...(autoConfig.navigation || {}),
      ...(userConfig.navigation || {}),
      showQuickLinks:
        userConfig.navigation?.showQuickLinks ?? autoConfig.navigation?.showQuickLinks ?? true,
      showSearch: userConfig.navigation?.showSearch ?? autoConfig.navigation?.showSearch ?? true,
    },
    paths: {
      docsDir: userConfig.paths?.docsDir || autoConfig.paths?.docsDir || 'docs',
      baseUrl: userConfig.paths?.baseUrl || autoConfig.paths?.baseUrl || '/docs',
      assetsDir: userConfig.paths?.assetsDir || autoConfig.paths?.assetsDir,
    },
    search: {
      enabled: userConfig.search?.enabled ?? autoConfig.search?.enabled ?? true,
      maxResults: userConfig.search?.maxResults || autoConfig.search?.maxResults || 10,
      searchInContent:
        userConfig.search?.searchInContent ?? autoConfig.search?.searchInContent ?? true,
      searchInTags: userConfig.search?.searchInTags ?? autoConfig.search?.searchInTags ?? true,
      searchInTitles:
        userConfig.search?.searchInTitles ?? autoConfig.search?.searchInTitles ?? true,
      placeholder: userConfig.search?.placeholder || autoConfig.search?.placeholder,
    },
  };

  // Ensure project name is always provided
  if (!result.project.name) {
    result.project.name = 'Documentation';
  }

  return result;
}

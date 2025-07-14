/**
 * Documentation configuration for Beaver
 * This file contains all project-specific settings for the documentation system
 */

import type { DocsConfig } from './src/lib/types/docs-config.js';

// Get dynamic repository and base URL information from environment variables
const getRepositoryInfo = () => {
  const githubOwner = process.env['GITHUB_OWNER'] || 'nyasuto';
  const githubRepo = process.env['GITHUB_REPO'] || 'beaver';
  const githubBranch = process.env['GITHUB_REF_NAME'] || 'main';
  
  return {
    owner: githubOwner,
    repo: githubRepo,
    branch: githubBranch,
    githubUrl: `https://github.com/${githubOwner}/${githubRepo}`,
    editBaseUrl: `https://github.com/${githubOwner}/${githubRepo}/edit/${githubBranch}`,
  };
};

// Get base URL from environment variable (for dynamic deployment paths)
const baseUrl = process.env['BASE_URL'] ? process.env['BASE_URL'] : '/beaver';
const repoInfo = getRepositoryInfo();

export const docsConfig: DocsConfig = {
  project: {
    name: repoInfo.repo.charAt(0).toUpperCase() + repoInfo.repo.slice(1), // Capitalize repo name
    emoji: '🦫',
    description: `${repoInfo.repo}の完全なドキュメント集 - セットアップから高度な機能まで`,
    githubUrl: repoInfo.githubUrl,
    editBaseUrl: repoInfo.editBaseUrl,
    homeUrl: `${baseUrl}/`,
  },
  
  ui: {
    language: 'ja',
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
        title: 'クイックスタート',
        href: `${baseUrl}/docs/readme`,
        icon: '🚀',
        description: 'GitHub Actionとして数分で導入',
        color: 'blue',
      },
      {
        title: '開発者ガイド',
        href: `${baseUrl}/docs/local-development`,
        icon: '🛠️',
        description: 'ローカル開発とカスタマイズ',
        color: 'green',
      },
      {
        title: '詳細設定',
        href: `${baseUrl}/docs/configuration`,
        icon: '🔧',
        description: '高度な機能とセキュリティ',
        color: 'purple',
      },
    ],
    categories: {
      documentation: '📖 ドキュメント',
      general: '📄 一般',
      overview: '🦫 概要',
    },
    showQuickLinks: true,
    showSearch: true,
  },
  
  paths: {
    docsDir: 'docs',
    baseUrl: `${baseUrl}/docs`,
  },
  
  search: {
    enabled: true,
    placeholder: 'ドキュメントを検索...',
    maxResults: 10,
    searchInContent: true,
    searchInTags: true,
    searchInTitles: true,
  },
};

export default docsConfig;
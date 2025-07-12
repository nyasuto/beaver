/**
 * Documentation configuration for Beaver
 * This file contains all project-specific settings for the documentation system
 */

import type { DocsConfig } from './src/lib/types/docs-config.js';

export const docsConfig: DocsConfig = {
  project: {
    name: 'Beaver',
    emoji: '🦫',
    description: 'Beaverの完全なドキュメント集 - セットアップから高度な機能まで',
    githubUrl: 'https://github.com/nyasuto/beaver',
    editBaseUrl: 'https://github.com/nyasuto/beaver/edit/main',
    homeUrl: '/',
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
        href: '/docs/readme',
        icon: '🚀',
        description: 'GitHub Actionとして数分で導入',
        color: 'blue',
      },
      {
        title: '開発者ガイド',
        href: '/docs/local-development',
        icon: '🛠️',
        description: 'ローカル開発とカスタマイズ',
        color: 'green',
      },
      {
        title: '詳細設定',
        href: '/docs/configuration',
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
    baseUrl: '/docs',
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
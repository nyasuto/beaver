/**
 * Japanese translations for the documentation system
 */

import type { DocsTranslations } from '../types.js';

export const ja: DocsTranslations = {
  // Navigation
  'docs.title': 'ドキュメント',
  'docs.overview': '概要',
  'docs.search.placeholder': 'ドキュメントを検索...',
  'docs.search.noResults': '結果が見つかりません',
  'docs.search.hint':
    '特定の情報をお探しの場合は、各ページでブラウザの検索機能（Ctrl+F / Cmd+F）をご利用ください。高度な検索機能も今後追加予定です。',

  // Page titles and headers
  'docs.quickStart': 'クイックスタート',
  'docs.developerGuide': '開発者ガイド',
  'docs.configuration': '詳細設定',
  'docs.documentation': 'ドキュメント',
  'docs.general': '一般',

  // Content metadata
  'docs.readingTime': '分で読める',
  'docs.wordCount': '語',
  'docs.lastModified': '最終更新',
  'docs.tableOfContents': '目次',
  'docs.editPage': 'このページを編集',
  'docs.backToList': 'ドキュメント一覧に戻る',

  // Quick links and navigation
  'nav.home': 'ホーム',
  'nav.issues': 'Issues',
  'nav.quality': '品質ダッシュボード',
  'nav.github': 'GitHub',
  'nav.quickLinks': 'クイックリンク',

  // Actions and buttons
  'action.getStarted': '始める →',
  'action.learnMore': '詳しく見る →',
  'action.configure': '設定する →',
  'action.develop': '開発開始 →',

  // Categories and organization
  'category.documentation': '📖 ドキュメント',
  'category.general': '📄 一般',
  'category.overview': '🦫 概要',

  // Mobile interface
  'mobile.openMenu': 'メニューを開く',
  'mobile.closeMenu': 'メニューを閉じる',

  // Error messages
  'error.notFound': 'ドキュメントが見つかりません',
  'error.loadingFailed': 'ドキュメントの読み込みに失敗しました',

  // Quick start descriptions
  'quickStart.github.description': 'GitHub Actionとして数分で導入',
  'quickStart.development.description': 'ローカル開発とカスタマイズ',
  'quickStart.configuration.description': '高度な機能とセキュリティ',
};

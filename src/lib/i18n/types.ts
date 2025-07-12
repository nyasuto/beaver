/**
 * Internationalization types for the documentation system
 */

export type SupportedLanguage = 'en' | 'ja';

/**
 * Translation keys for the documentation system
 * Covers all user-facing text that needs to be localized
 */
export interface DocsTranslations {
  // Navigation
  'docs.title': string;
  'docs.overview': string;
  'docs.search.placeholder': string;
  'docs.search.noResults': string;
  'docs.search.hint': string;

  // Page titles and headers
  'docs.quickStart': string;
  'docs.developerGuide': string;
  'docs.configuration': string;
  'docs.documentation': string;
  'docs.general': string;

  // Content metadata
  'docs.readingTime': string;
  'docs.wordCount': string;
  'docs.lastModified': string;
  'docs.tableOfContents': string;
  'docs.editPage': string;
  'docs.backToList': string;

  // Quick links and navigation
  'nav.home': string;
  'nav.issues': string;
  'nav.quality': string;
  'nav.github': string;
  'nav.quickLinks': string;

  // Actions and buttons
  'action.getStarted': string;
  'action.learnMore': string;
  'action.configure': string;
  'action.develop': string;

  // Categories and organization
  'category.documentation': string;
  'category.general': string;
  'category.overview': string;

  // Mobile interface
  'mobile.openMenu': string;
  'mobile.closeMenu': string;

  // Error messages
  'error.notFound': string;
  'error.loadingFailed': string;

  // Quick start descriptions
  'quickStart.github.description': string;
  'quickStart.development.description': string;
  'quickStart.configuration.description': string;
}

/**
 * Language configuration
 */
export interface LanguageConfig {
  code: SupportedLanguage;
  name: string;
  flag: string;
  direction: 'ltr' | 'rtl';
}

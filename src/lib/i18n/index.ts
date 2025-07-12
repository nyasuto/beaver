/**
 * Internationalization system for the documentation
 */

import type { SupportedLanguage, DocsTranslations, LanguageConfig } from './types.js';
import { en } from './translations/en.js';
import { ja } from './translations/ja.js';

/**
 * Available translations
 */
const translations: Record<SupportedLanguage, DocsTranslations> = {
  en,
  ja,
};

/**
 * Language configurations
 */
export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, LanguageConfig> = {
  en: {
    code: 'en',
    name: 'English',
    flag: '🇺🇸',
    direction: 'ltr',
  },
  ja: {
    code: 'ja',
    name: '日本語',
    flag: '🇯🇵',
    direction: 'ltr',
  },
};

/**
 * Get translation function for a specific language
 */
export function getTranslations(language: SupportedLanguage = 'en'): DocsTranslations {
  return translations[language] || translations.en;
}

/**
 * Create a translation function (t) for a specific language
 */
export function createTranslator(language: SupportedLanguage = 'en') {
  const t = getTranslations(language);

  return function translate(key: keyof DocsTranslations): string {
    return t[key] || key;
  };
}

/**
 * Helper to get language configuration
 */
export function getLanguageConfig(language: SupportedLanguage): LanguageConfig {
  return SUPPORTED_LANGUAGES[language] || SUPPORTED_LANGUAGES.en;
}

/**
 * Check if a language is supported
 */
export function isSupportedLanguage(language: string): language is SupportedLanguage {
  return language in SUPPORTED_LANGUAGES;
}

/**
 * Detect language from various sources (for future use)
 */
export function detectLanguage(
  preferredLanguage?: string,
  browserLanguage?: string,
  fallback: SupportedLanguage = 'en'
): SupportedLanguage {
  // Check preferred language first
  if (preferredLanguage && isSupportedLanguage(preferredLanguage)) {
    return preferredLanguage;
  }

  // Check browser language
  if (browserLanguage) {
    // Extract language code (e.g., 'ja-JP' -> 'ja')
    const langCode = browserLanguage.split('-')[0];
    if (langCode && isSupportedLanguage(langCode)) {
      return langCode;
    }
  }

  return fallback;
}

// Re-export types for convenience
export type { SupportedLanguage, DocsTranslations, LanguageConfig };

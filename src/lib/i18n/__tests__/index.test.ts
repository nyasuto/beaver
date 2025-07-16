/**
 * Internationalization Tests
 *
 * Tests for i18n functionality including translations, language detection, and configuration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getTranslations,
  createTranslator,
  getLanguageConfig,
  isSupportedLanguage,
  detectLanguage,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
  type DocsTranslations,
} from '../index';

describe('Internationalization System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SUPPORTED_LANGUAGES', () => {
    it('should export supported language configurations', () => {
      expect(SUPPORTED_LANGUAGES).toBeDefined();
      expect(SUPPORTED_LANGUAGES.en).toBeDefined();
      expect(SUPPORTED_LANGUAGES.ja).toBeDefined();
    });

    it('should have correct English language configuration', () => {
      const enConfig = SUPPORTED_LANGUAGES.en;

      expect(enConfig.code).toBe('en');
      expect(enConfig.name).toBe('English');
      expect(enConfig.flag).toBe('🇺🇸');
      expect(enConfig.direction).toBe('ltr');
    });

    it('should have correct Japanese language configuration', () => {
      const jaConfig = SUPPORTED_LANGUAGES.ja;

      expect(jaConfig.code).toBe('ja');
      expect(jaConfig.name).toBe('日本語');
      expect(jaConfig.flag).toBe('🇯🇵');
      expect(jaConfig.direction).toBe('ltr');
    });
  });

  describe('getTranslations', () => {
    it('should return English translations by default', () => {
      const translations = getTranslations();

      expect(translations).toBeDefined();
      expect(typeof translations['docs.title']).toBe('string');
      expect(typeof translations['docs.search.placeholder']).toBe('string');
    });

    it('should return English translations when explicitly requested', () => {
      const translations = getTranslations('en');

      expect(translations).toBeDefined();
      expect(typeof translations['docs.title']).toBe('string');
      expect(typeof translations['nav.home']).toBe('string');
    });

    it('should return Japanese translations when requested', () => {
      const translations = getTranslations('ja');

      expect(translations).toBeDefined();
      expect(typeof translations['docs.title']).toBe('string');
      expect(typeof translations['nav.home']).toBe('string');
    });

    it('should fallback to English for unsupported language', () => {
      const translations = getTranslations('fr' as SupportedLanguage);
      const englishTranslations = getTranslations('en');

      expect(translations).toEqual(englishTranslations);
    });

    it('should include all required translation keys', () => {
      const translations = getTranslations('en');
      const requiredKeys = [
        'docs.title',
        'docs.overview',
        'docs.search.placeholder',
        'docs.quickStart',
        'nav.home',
        'action.getStarted',
        'category.documentation',
        'mobile.openMenu',
        'error.notFound',
      ];

      requiredKeys.forEach(key => {
        expect(translations[key as keyof DocsTranslations]).toBeDefined();
        expect(typeof translations[key as keyof DocsTranslations]).toBe('string');
      });
    });
  });

  describe('createTranslator', () => {
    it('should create a translate function for English', () => {
      const t = createTranslator('en');

      expect(typeof t).toBe('function');

      const title = t('docs.title');
      expect(typeof title).toBe('string');
      expect(title.length).toBeGreaterThan(0);
    });

    it('should create a translate function for Japanese', () => {
      const t = createTranslator('ja');

      expect(typeof t).toBe('function');

      const title = t('docs.title');
      expect(typeof title).toBe('string');
      expect(title.length).toBeGreaterThan(0);
    });

    it('should return key as fallback for missing translation', () => {
      const t = createTranslator('en');

      // Use a key that doesn't exist
      const result = t('nonexistent.key' as keyof DocsTranslations);
      expect(result).toBe('nonexistent.key');
    });

    it('should use English as default language', () => {
      const tDefault = createTranslator();
      const tEnglish = createTranslator('en');

      const titleDefault = tDefault('docs.title');
      const titleEnglish = tEnglish('docs.title');

      expect(titleDefault).toBe(titleEnglish);
    });

    it('should translate different types of keys correctly', () => {
      const t = createTranslator('en');

      // Test different categories of keys
      const title = t('docs.title');
      const searchPlaceholder = t('docs.search.placeholder');
      const homeNav = t('nav.home');
      const getStartedAction = t('action.getStarted');

      expect(typeof title).toBe('string');
      expect(typeof searchPlaceholder).toBe('string');
      expect(typeof homeNav).toBe('string');
      expect(typeof getStartedAction).toBe('string');

      // All should be non-empty
      expect(title.length).toBeGreaterThan(0);
      expect(searchPlaceholder.length).toBeGreaterThan(0);
      expect(homeNav.length).toBeGreaterThan(0);
      expect(getStartedAction.length).toBeGreaterThan(0);
    });
  });

  describe('getLanguageConfig', () => {
    it('should return English language config', () => {
      const config = getLanguageConfig('en');

      expect(config).toBeDefined();
      expect(config.code).toBe('en');
      expect(config.name).toBe('English');
      expect(config.flag).toBe('🇺🇸');
      expect(config.direction).toBe('ltr');
    });

    it('should return Japanese language config', () => {
      const config = getLanguageConfig('ja');

      expect(config).toBeDefined();
      expect(config.code).toBe('ja');
      expect(config.name).toBe('日本語');
      expect(config.flag).toBe('🇯🇵');
      expect(config.direction).toBe('ltr');
    });

    it('should fallback to English for unsupported language', () => {
      const config = getLanguageConfig('fr' as SupportedLanguage);
      const englishConfig = getLanguageConfig('en');

      expect(config).toEqual(englishConfig);
    });

    it('should return consistent language config with SUPPORTED_LANGUAGES', () => {
      const enConfigDirect = SUPPORTED_LANGUAGES.en;
      const enConfigFromFunction = getLanguageConfig('en');

      expect(enConfigFromFunction).toEqual(enConfigDirect);

      const jaConfigDirect = SUPPORTED_LANGUAGES.ja;
      const jaConfigFromFunction = getLanguageConfig('ja');

      expect(jaConfigFromFunction).toEqual(jaConfigDirect);
    });
  });

  describe('isSupportedLanguage', () => {
    it('should return true for supported languages', () => {
      expect(isSupportedLanguage('en')).toBe(true);
      expect(isSupportedLanguage('ja')).toBe(true);
    });

    it('should return false for unsupported languages', () => {
      expect(isSupportedLanguage('fr')).toBe(false);
      expect(isSupportedLanguage('de')).toBe(false);
      expect(isSupportedLanguage('es')).toBe(false);
      expect(isSupportedLanguage('zh')).toBe(false);
    });

    it('should return false for invalid inputs', () => {
      expect(isSupportedLanguage('')).toBe(false);
      expect(isSupportedLanguage('invalid')).toBe(false);
      expect(isSupportedLanguage('123')).toBe(false);
    });

    it('should work as a type guard', () => {
      const language: string = 'en';

      if (isSupportedLanguage(language)) {
        // TypeScript should recognize language as SupportedLanguage here
        const config = getLanguageConfig(language);
        expect(config.code).toBe('en');
      }
    });
  });

  describe('detectLanguage', () => {
    it('should return preferred language when supported', () => {
      const detected = detectLanguage('ja');
      expect(detected).toBe('ja');

      const detectedEn = detectLanguage('en');
      expect(detectedEn).toBe('en');
    });

    it('should fallback to browser language when preferred is not supported', () => {
      const detected = detectLanguage('fr', 'ja-JP');
      expect(detected).toBe('ja');

      const detectedEn = detectLanguage('de', 'en-US');
      expect(detectedEn).toBe('en');
    });

    it('should extract language code from browser language locale', () => {
      // Browser languages with country codes
      expect(detectLanguage(undefined, 'ja-JP')).toBe('ja');
      expect(detectLanguage(undefined, 'en-US')).toBe('en');
      expect(detectLanguage(undefined, 'en-GB')).toBe('en');
      expect(detectLanguage(undefined, 'ja-JP-x-variant')).toBe('ja');
    });

    it('should use fallback when neither preferred nor browser language is supported', () => {
      const detected = detectLanguage('fr', 'de-DE');
      expect(detected).toBe('en');

      const detectedWithCustomFallback = detectLanguage('fr', 'de-DE', 'ja');
      expect(detectedWithCustomFallback).toBe('ja');
    });

    it('should use fallback when inputs are undefined or empty', () => {
      expect(detectLanguage()).toBe('en');
      expect(detectLanguage(undefined, undefined)).toBe('en');
      expect(detectLanguage('', '')).toBe('en');

      expect(detectLanguage(undefined, undefined, 'ja')).toBe('ja');
    });

    it('should prioritize preferred language over browser language', () => {
      const detected = detectLanguage('en', 'ja-JP');
      expect(detected).toBe('en');

      const detectedJa = detectLanguage('ja', 'en-US');
      expect(detectedJa).toBe('ja');
    });

    it('should handle edge cases in browser language parsing', () => {
      // Malformed browser languages should fallback gracefully
      expect(detectLanguage(undefined, 'invalid-format')).toBe('en');
      expect(detectLanguage(undefined, 'toolong-code-here')).toBe('en');
      expect(detectLanguage(undefined, '-missing-first')).toBe('en');
    });

    it('should work with different fallback languages', () => {
      expect(detectLanguage('fr', 'de', 'en')).toBe('en');
      expect(detectLanguage('fr', 'de', 'ja')).toBe('ja');
    });
  });

  describe('Integration Tests', () => {
    it('should provide complete i18n workflow for English', () => {
      // Detect language
      const language = detectLanguage('en-US');
      expect(language).toBe('en');

      // Get language config
      const config = getLanguageConfig(language);
      expect(config.name).toBe('English');

      // Get translations
      const translations = getTranslations(language);
      expect(translations['docs.title']).toBeDefined();

      // Create translator
      const t = createTranslator(language);
      const title = t('docs.title');
      expect(typeof title).toBe('string');
    });

    it('should provide complete i18n workflow for Japanese', () => {
      // Detect language
      const language = detectLanguage('ja', 'ja-JP');
      expect(language).toBe('ja');

      // Get language config
      const config = getLanguageConfig(language);
      expect(config.name).toBe('日本語');

      // Get translations
      const translations = getTranslations(language);
      expect(translations['docs.title']).toBeDefined();

      // Create translator
      const t = createTranslator(language);
      const title = t('docs.title');
      expect(typeof title).toBe('string');
    });

    it('should handle unsupported language gracefully throughout workflow', () => {
      // Detect language (should fallback)
      const language = detectLanguage('fr', 'fr-FR');
      expect(language).toBe('en');

      // Get language config (should fallback)
      const config = getLanguageConfig('fr' as SupportedLanguage);
      expect(config.code).toBe('en');

      // Get translations (should fallback)
      const translations = getTranslations('fr' as SupportedLanguage);
      const englishTranslations = getTranslations('en');
      expect(translations).toEqual(englishTranslations);

      // Create translator (should work with fallback)
      const t = createTranslator('fr' as SupportedLanguage);
      const title = t('docs.title');
      expect(typeof title).toBe('string');
    });

    it('should maintain consistency between all translation functions', () => {
      const languages: SupportedLanguage[] = ['en', 'ja'];

      languages.forEach(lang => {
        const translations = getTranslations(lang);
        const t = createTranslator(lang);
        const config = getLanguageConfig(lang);

        // Check that all components work together
        expect(config.code).toBe(lang);
        expect(isSupportedLanguage(lang)).toBe(true);

        // Check that translator uses the same translations
        const titleFromTranslations = translations['docs.title'];
        const titleFromTranslator = t('docs.title');
        expect(titleFromTranslator).toBe(titleFromTranslations);
      });
    });
  });

  describe('Type Safety', () => {
    it('should enforce correct translation key types', () => {
      const t = createTranslator('en');

      // These should compile and work
      expect(() => t('docs.title')).not.toThrow();
      expect(() => t('nav.home')).not.toThrow();
      expect(() => t('action.getStarted')).not.toThrow();

      // Invalid keys should fallback to the key itself
      const invalidKey = 'invalid.key' as keyof DocsTranslations;
      expect(t(invalidKey)).toBe('invalid.key');
    });

    it('should maintain type safety for supported languages', () => {
      const supportedLangs: SupportedLanguage[] = ['en', 'ja'];

      supportedLangs.forEach(lang => {
        expect(() => getTranslations(lang)).not.toThrow();
        expect(() => createTranslator(lang)).not.toThrow();
        expect(() => getLanguageConfig(lang)).not.toThrow();
      });
    });
  });
});

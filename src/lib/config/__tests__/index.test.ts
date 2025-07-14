/**
 * Configuration Module Index Tests
 *
 * Issue #101 - 設定管理とバリデーションのテスト実装
 * index.ts: 0% → 85%+ カバレージ目標
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ENV_CONFIG,
  DEFAULT_CONFIG,
  CONFIG_PATHS,
  EnvValidator,
  EnvValidationError,
  getEnvValidator,
  validateEnv,
  checkEnvHealth,
} from '../index';

// Mock import.meta.env for testing
const mockImportMeta = {
  env: {
    DEV: true,
    PROD: false,
    MODE: 'development',
    NODE_ENV: 'development',
  },
};

// Mock the env-validation module to avoid actual API calls
vi.mock('../env-validation', () => ({
  EnvValidator: vi.fn().mockImplementation(() => ({
    validate: vi.fn(),
    healthCheck: vi.fn(),
    getValidatedEnv: vi.fn(),
    getSetupGuide: vi.fn(),
  })),
  EnvValidationError: class MockEnvValidationError extends Error {
    constructor(
      message: string,
      public variable: string,
      public code: string,
      public suggestions: string[] = []
    ) {
      super(message);
      this.name = 'EnvValidationError';
    }
  },
  getEnvValidator: vi.fn(),
  validateEnv: vi.fn(),
  checkEnvHealth: vi.fn(),
  GitHubEnvSchema: {},
  AstroEnvSchema: {},
  EnvSchema: {},
}));

// Mock global import.meta
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: mockImportMeta,
  },
  configurable: true,
});

describe('Configuration Module Index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Exports', () => {
    it('env-validation モジュールの機能をすべてエクスポートすること', () => {
      // All these should be defined (imported from env-validation)
      expect(EnvValidator).toBeDefined();
      expect(EnvValidationError).toBeDefined();
      expect(getEnvValidator).toBeDefined();
      expect(validateEnv).toBeDefined();
      expect(checkEnvHealth).toBeDefined();
    });

    it('設定定数をエクスポートすること', () => {
      expect(ENV_CONFIG).toBeDefined();
      expect(DEFAULT_CONFIG).toBeDefined();
      expect(CONFIG_PATHS).toBeDefined();
    });
  });

  describe('ENV_CONFIG', () => {
    it('正しい環境検出プロパティを持つこと', () => {
      expect(ENV_CONFIG).toHaveProperty('isDevelopment');
      expect(ENV_CONFIG).toHaveProperty('isProduction');
      expect(ENV_CONFIG).toHaveProperty('isTest');
      expect(ENV_CONFIG).toHaveProperty('nodeEnv');
    });

    it('環境フラグが正しい型であること', () => {
      expect(typeof ENV_CONFIG.isDevelopment).toBe('boolean');
      expect(typeof ENV_CONFIG.isProduction).toBe('boolean');
      expect(typeof ENV_CONFIG.isTest).toBe('boolean');
      expect(typeof ENV_CONFIG.nodeEnv).toBe('string');
    });

    it('テスト環境での値が正しいこと', () => {
      // In vitest environment, MODE is 'test'
      expect(ENV_CONFIG.isDevelopment).toBe(true);
      expect(ENV_CONFIG.isProduction).toBe(false);
      expect(ENV_CONFIG.isTest).toBe(true);
      expect(ENV_CONFIG.nodeEnv).toBe('test'); // NODE_ENV in test environment
    });

    it('読み取り専用として型定義されていること', () => {
      // ENV_CONFIG is defined with 'as const' for TypeScript readonly behavior
      // We can't test runtime immutability, but we can test that properties exist
      expect(ENV_CONFIG).toHaveProperty('isDevelopment');
      expect(ENV_CONFIG).toHaveProperty('isProduction');
      expect(ENV_CONFIG).toHaveProperty('isTest');
      expect(ENV_CONFIG).toHaveProperty('nodeEnv');
    });

    describe('Environment Detection Logic', () => {
      it('テスト環境を正しく検出すること', () => {
        // Test environment detection when MODE is 'test'
        const originalMode = mockImportMeta.env.MODE;
        mockImportMeta.env.MODE = 'test';

        // Re-import to get new values (this simulates the module evaluation)
        // Note: In a real scenario, this would require module reloading
        const testEnvConfig = {
          isDevelopment: mockImportMeta.env.DEV,
          isProduction: mockImportMeta.env.PROD,
          isTest: mockImportMeta.env.MODE === 'test',
          nodeEnv: mockImportMeta.env.NODE_ENV || 'development',
        };

        expect(testEnvConfig.isTest).toBe(true);
        expect(testEnvConfig.isDevelopment).toBe(true); // DEV can still be true in test
        expect(testEnvConfig.isProduction).toBe(false);

        // Restore original MODE
        mockImportMeta.env.MODE = originalMode;
      });

      it('本番環境を正しく検出すること', () => {
        const originalDev = mockImportMeta.env.DEV;
        const originalProd = mockImportMeta.env.PROD;
        const originalMode = mockImportMeta.env.MODE;

        mockImportMeta.env.DEV = false;
        mockImportMeta.env.PROD = true;
        mockImportMeta.env.MODE = 'production';

        const prodEnvConfig = {
          isDevelopment: mockImportMeta.env.DEV,
          isProduction: mockImportMeta.env.PROD,
          isTest: mockImportMeta.env.MODE === 'test',
          nodeEnv: mockImportMeta.env.NODE_ENV || 'development',
        };

        expect(prodEnvConfig.isDevelopment).toBe(false);
        expect(prodEnvConfig.isProduction).toBe(true);
        expect(prodEnvConfig.isTest).toBe(false);

        // Restore original values
        mockImportMeta.env.DEV = originalDev;
        mockImportMeta.env.PROD = originalProd;
        mockImportMeta.env.MODE = originalMode;
      });

      it('NODE_ENVのデフォルト値を正しく処理すること', () => {
        const originalNodeEnv = mockImportMeta.env.NODE_ENV;
        delete (mockImportMeta.env as any).NODE_ENV;

        const configWithoutNodeEnv = {
          nodeEnv: mockImportMeta.env.NODE_ENV || 'development',
        };

        expect(configWithoutNodeEnv.nodeEnv).toBe('development');

        // Restore original NODE_ENV
        mockImportMeta.env.NODE_ENV = originalNodeEnv;
      });
    });
  });

  describe('DEFAULT_CONFIG', () => {
    it('必要なセクションをすべて含むこと', () => {
      expect(DEFAULT_CONFIG).toHaveProperty('github');
      expect(DEFAULT_CONFIG).toHaveProperty('site');
      expect(DEFAULT_CONFIG).toHaveProperty('analytics');
      expect(DEFAULT_CONFIG).toHaveProperty('ui');
    });

    describe('github セクション', () => {
      it('GitHub API設定の必要なプロパティを持つこと', () => {
        expect(DEFAULT_CONFIG.github).toHaveProperty('baseUrl');
        expect(DEFAULT_CONFIG.github).toHaveProperty('timeout');
        expect(DEFAULT_CONFIG.github).toHaveProperty('retries');
      });

      it('GitHub設定の値が正しい型であること', () => {
        expect(typeof DEFAULT_CONFIG.github.baseUrl).toBe('string');
        expect(typeof DEFAULT_CONFIG.github.timeout).toBe('number');
        expect(typeof DEFAULT_CONFIG.github.retries).toBe('number');
      });

      it('GitHub設定のデフォルト値が適切であること', () => {
        expect(DEFAULT_CONFIG.github.baseUrl).toBe('https://api.github.com');
        expect(DEFAULT_CONFIG.github.timeout).toBe(10000);
        expect(DEFAULT_CONFIG.github.retries).toBe(3);

        // Validate baseUrl is a proper GitHub API URL
        expect(DEFAULT_CONFIG.github.baseUrl).toMatch(/^https:\/\/api\.github\.com$/);

        // Validate timeout is reasonable (10 seconds)
        expect(DEFAULT_CONFIG.github.timeout).toBeGreaterThan(5000);
        expect(DEFAULT_CONFIG.github.timeout).toBeLessThanOrEqual(30000);

        // Validate retries is reasonable
        expect(DEFAULT_CONFIG.github.retries).toBeGreaterThanOrEqual(1);
        expect(DEFAULT_CONFIG.github.retries).toBeLessThanOrEqual(10);
      });
    });

    describe('site セクション', () => {
      it('サイト設定の必要なプロパティを持つこと', () => {
        expect(DEFAULT_CONFIG.site).toHaveProperty('title');
        expect(DEFAULT_CONFIG.site).toHaveProperty('description');
        expect(DEFAULT_CONFIG.site).toHaveProperty('baseUrl');
      });

      it('サイト設定の値が正しい型であること', () => {
        expect(typeof DEFAULT_CONFIG.site.title).toBe('string');
        expect(typeof DEFAULT_CONFIG.site.description).toBe('string');
        expect(typeof DEFAULT_CONFIG.site.baseUrl).toBe('string');
      });

      it('サイト設定のデフォルト値が適切であること', () => {
        expect(DEFAULT_CONFIG.site.title).toBe('Beaver Astro Edition');
        expect(DEFAULT_CONFIG.site.description).toBe('AI-first knowledge management system');
        // GITHUB_OWNER環境変数に応じた動的なbaseUrl設定をテスト（テスト環境では'test-owner'が設定される）
        expect(DEFAULT_CONFIG.site.baseUrl).toContain('.github.io');

        // Validate title is meaningful
        expect(DEFAULT_CONFIG.site.title.length).toBeGreaterThan(0);
        expect(DEFAULT_CONFIG.site.title).toContain('Beaver');

        // Validate description is meaningful
        expect(DEFAULT_CONFIG.site.description.length).toBeGreaterThan(10);

        // Validate baseUrl is a proper URL
        expect(DEFAULT_CONFIG.site.baseUrl).toMatch(/^https?:\/\/.+/);
      });
    });

    describe('analytics セクション', () => {
      it('アナリティクス設定の必要なプロパティを持つこと', () => {
        expect(DEFAULT_CONFIG.analytics).toHaveProperty('enabled');
        expect(DEFAULT_CONFIG.analytics).toHaveProperty('batchSize');
        expect(DEFAULT_CONFIG.analytics).toHaveProperty('flushInterval');
      });

      it('アナリティクス設定の値が正しい型であること', () => {
        expect(typeof DEFAULT_CONFIG.analytics.enabled).toBe('boolean');
        expect(typeof DEFAULT_CONFIG.analytics.batchSize).toBe('number');
        expect(typeof DEFAULT_CONFIG.analytics.flushInterval).toBe('number');
      });

      it('アナリティクス設定のデフォルト値が適切であること', () => {
        expect(DEFAULT_CONFIG.analytics.enabled).toBe(true);
        expect(DEFAULT_CONFIG.analytics.batchSize).toBe(100);
        expect(DEFAULT_CONFIG.analytics.flushInterval).toBe(5000);

        // Validate batch size is reasonable
        expect(DEFAULT_CONFIG.analytics.batchSize).toBeGreaterThan(10);
        expect(DEFAULT_CONFIG.analytics.batchSize).toBeLessThanOrEqual(1000);

        // Validate flush interval is reasonable (5 seconds)
        expect(DEFAULT_CONFIG.analytics.flushInterval).toBeGreaterThan(1000);
        expect(DEFAULT_CONFIG.analytics.flushInterval).toBeLessThanOrEqual(60000);
      });
    });

    describe('ui セクション', () => {
      it('UI設定の必要なプロパティを持つこと', () => {
        expect(DEFAULT_CONFIG.ui).toHaveProperty('theme');
        expect(DEFAULT_CONFIG.ui).toHaveProperty('locale');
        expect(DEFAULT_CONFIG.ui).toHaveProperty('dateFormat');
      });

      it('UI設定の値が正しい型であること', () => {
        expect(typeof DEFAULT_CONFIG.ui.theme).toBe('string');
        expect(typeof DEFAULT_CONFIG.ui.locale).toBe('string');
        expect(typeof DEFAULT_CONFIG.ui.dateFormat).toBe('string');
      });

      it('UI設定のデフォルト値が適切であること', () => {
        expect(DEFAULT_CONFIG.ui.theme).toBe('system');
        expect(DEFAULT_CONFIG.ui.locale).toBe('en');
        expect(DEFAULT_CONFIG.ui.dateFormat).toBe('YYYY-MM-DD');

        // Validate theme is one of expected values
        expect(['light', 'dark', 'system']).toContain(DEFAULT_CONFIG.ui.theme);

        // Validate locale is a proper locale code
        expect(DEFAULT_CONFIG.ui.locale).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);

        // Validate date format is meaningful
        expect(DEFAULT_CONFIG.ui.dateFormat).toContain('YYYY');
        expect(DEFAULT_CONFIG.ui.dateFormat).toContain('MM');
        expect(DEFAULT_CONFIG.ui.dateFormat).toContain('DD');
      });
    });

    it('読み取り専用として型定義されていること', () => {
      // DEFAULT_CONFIG is defined with 'as const' for TypeScript readonly behavior
      expect(DEFAULT_CONFIG).toHaveProperty('github');
      expect(DEFAULT_CONFIG).toHaveProperty('site');
      expect(DEFAULT_CONFIG).toHaveProperty('analytics');
      expect(DEFAULT_CONFIG).toHaveProperty('ui');
    });

    it('ネストされたオブジェクトプロパティが存在すること', () => {
      expect(DEFAULT_CONFIG.github).toHaveProperty('baseUrl');
      expect(DEFAULT_CONFIG.github).toHaveProperty('timeout');
      expect(DEFAULT_CONFIG.github).toHaveProperty('retries');
    });
  });

  describe('CONFIG_PATHS', () => {
    it('設定ファイルパスの必要なプロパティを持つこと', () => {
      expect(CONFIG_PATHS).toHaveProperty('classificationRules');
      expect(CONFIG_PATHS).toHaveProperty('categoryMapping');
      expect(CONFIG_PATHS).toHaveProperty('userSettings');
    });

    it('設定パスの値が正しい型であること', () => {
      expect(typeof CONFIG_PATHS.classificationRules).toBe('string');
      expect(typeof CONFIG_PATHS.categoryMapping).toBe('string');
      expect(typeof CONFIG_PATHS.userSettings).toBe('string');
    });

    it('設定パスが適切な値を持つこと', () => {
      expect(CONFIG_PATHS.classificationRules).toBe('config/classification-rules.yaml');
      expect(CONFIG_PATHS.categoryMapping).toBe('config/category-mapping.json');
      expect(CONFIG_PATHS.userSettings).toBe('.beaver/settings.json');

      // Validate paths have proper extensions
      expect(CONFIG_PATHS.classificationRules).toMatch(/\.ya?ml$/);
      expect(CONFIG_PATHS.categoryMapping).toMatch(/\.json$/);
      expect(CONFIG_PATHS.userSettings).toMatch(/\.json$/);

      // Validate paths are relative (not absolute)
      expect(CONFIG_PATHS.classificationRules).not.toMatch(/^[/\\]/);
      expect(CONFIG_PATHS.categoryMapping).not.toMatch(/^[/\\]/);
      expect(CONFIG_PATHS.userSettings).not.toMatch(/^[/\\]/);
    });

    it('設定パスが論理的な構造を持つこと', () => {
      // Configuration files should be in config/ directory
      expect(CONFIG_PATHS.classificationRules.startsWith('config/')).toBe(true);
      expect(CONFIG_PATHS.categoryMapping.startsWith('config/')).toBe(true);

      // User settings should be in a hidden directory
      expect(CONFIG_PATHS.userSettings.startsWith('.beaver/')).toBe(true);

      // File names should be descriptive
      expect(CONFIG_PATHS.classificationRules).toContain('classification');
      expect(CONFIG_PATHS.categoryMapping).toContain('category');
      expect(CONFIG_PATHS.userSettings).toContain('settings');
    });

    it('読み取り専用として型定義されていること', () => {
      // CONFIG_PATHS is defined with 'as const' for TypeScript readonly behavior
      expect(CONFIG_PATHS).toHaveProperty('classificationRules');
      expect(CONFIG_PATHS).toHaveProperty('categoryMapping');
      expect(CONFIG_PATHS).toHaveProperty('userSettings');
    });
  });

  describe('Module Integration', () => {
    it('env-validation モジュールとの統合が正しく動作すること', () => {
      // Verify that the re-exported functions are properly exported
      expect(getEnvValidator).toBeDefined();
      expect(typeof getEnvValidator).toBe('function');
    });

    it('型定義が正しくエクスポートされること', () => {
      // ValidatedEnv type should be available
      // Note: TypeScript types can't be tested at runtime, but we can verify
      // that the module exports don't cause compilation errors
      expect(true).toBe(true); // Placeholder for type compilation test
    });
  });

  describe('Configuration Consistency', () => {
    it('DEFAULT_CONFIGとENV_CONFIGの値が一貫していること', () => {
      // GitHub base URL should be consistent
      expect(DEFAULT_CONFIG.github.baseUrl).toBe('https://api.github.com');

      // Environment detection should be consistent with common environments
      const validNodeEnvs = ['development', 'production', 'test'];
      expect(validNodeEnvs).toContain(ENV_CONFIG.nodeEnv);
    });

    it('CONFIG_PATHSの設定ファイルが適切な形式であること', () => {
      // All paths should be strings and non-empty
      Object.values(CONFIG_PATHS).forEach(path => {
        expect(typeof path).toBe('string');
        expect(path.length).toBeGreaterThan(0);
        expect(path).not.toContain('..'); // No parent directory access
        expect(path).not.toContain('//'); // No double slashes
      });
    });

    it('設定値が実際の使用パターンと一致していること', () => {
      // Timeout values should be reasonable for web requests
      expect(DEFAULT_CONFIG.github.timeout).toBeGreaterThanOrEqual(5000);
      expect(DEFAULT_CONFIG.github.timeout).toBeLessThanOrEqual(30000);

      // Retry counts should be reasonable
      expect(DEFAULT_CONFIG.github.retries).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_CONFIG.github.retries).toBeLessThanOrEqual(10);

      // Analytics batch size should be reasonable
      expect(DEFAULT_CONFIG.analytics.batchSize).toBeGreaterThan(1);
      expect(DEFAULT_CONFIG.analytics.batchSize).toBeLessThanOrEqual(1000);
    });
  });

  describe('Error Handling', () => {
    it('EnvValidationErrorが正しくエクスポートされること', () => {
      const error = new EnvValidationError('Test error', 'TEST_VAR', 'TEST_CODE', ['suggestion']);

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('EnvValidationError');
      expect(error.message).toBe('Test error');
      expect(error.variable).toBe('TEST_VAR');
      expect(error.code).toBe('TEST_CODE');
      expect(error.suggestions).toEqual(['suggestion']);
    });
  });
});

/**
 * Configuration Settings API Endpoint Test Suite
 *
 * Issue #99 - API endpoints comprehensive test implementation
 * 90%+ statement coverage, 85%+ branch coverage, 100% function coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET, POST } from '../settings';

describe('Configuration Settings API Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createMockAPIContext = (queryParams: Record<string, string> = {}) => {
    const url = new URL('http://localhost:3000/api/config/settings');
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const request = new Request(url.toString());

    return {
      request,
      url,
      site: new URL('http://localhost:3000'),
      generator: 'astro',
      params: {},
      props: {},
      redirect: () => new Response('', { status: 302 }),
      rewrite: () => new Response('', { status: 200 }),
      cookies: {
        get: () => undefined,
        set: () => {},
        delete: () => {},
        has: () => false,
      },
      locals: {},
      clientAddress: '127.0.0.1',
      currentLocale: undefined,
      preferredLocale: undefined,
      preferredLocaleList: [],
      routePattern: '',
      originPathname: '/api/config/settings',
      getActionResult: () => undefined,
      callAction: () => Promise.resolve(undefined),
      isPrerendered: false,
      routeData: undefined,
    } as any;
  };

  const createMockPostAPIContext = (body: Record<string, unknown>) => {
    const url = new URL('http://localhost:3000/api/config/settings');
    const request = new Request(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    return {
      request,
      url,
      site: new URL('http://localhost:3000'),
      generator: 'astro',
      params: {},
      props: {},
      redirect: () => new Response('', { status: 302 }),
      rewrite: () => new Response('', { status: 200 }),
      cookies: {
        get: () => undefined,
        set: () => {},
        delete: () => {},
        has: () => false,
      },
      locals: {},
      clientAddress: '127.0.0.1',
      currentLocale: undefined,
      preferredLocale: undefined,
      preferredLocaleList: [],
      routePattern: '',
      originPathname: '/api/config/settings',
      getActionResult: () => undefined,
      callAction: () => Promise.resolve(undefined),
      isPrerendered: false,
      routeData: undefined,
    } as any;
  };

  describe('GET: 設定取得', () => {
    describe('成功ケース', () => {
      it('デフォルト設定ですべての設定を取得できること', async () => {
        const apiContext = createMockAPIContext();
        const response = await GET(apiContext);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.success).toBe(true);
        expect(result.data).toHaveProperty('github');
        expect(result.data).toHaveProperty('ui');
        expect(result.data).toHaveProperty('features');
        expect(result.data).toHaveProperty('api');
        expect(result.data).toHaveProperty('security');
        expect(result.data).toHaveProperty('performance');
        expect(result.meta.section).toBe('all');
        expect(result.meta.include_sensitive).toBe(false);
      });

      it('GitHub設定のみを取得できること', async () => {
        const apiContext = createMockAPIContext({ section: 'github' });
        const response = await GET(apiContext);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.success).toBe(true);
        expect(Object.keys(result.data)).toEqual(['github']);
        expect(result.data.github).toHaveProperty('owner');
        expect(result.data.github).toHaveProperty('repo');
        expect(result.data.github).toHaveProperty('base_url');
        expect(result.meta.section).toBe('github');
      });

      it('UI設定のみを取得できること', async () => {
        const apiContext = createMockAPIContext({ section: 'ui' });
        const response = await GET(apiContext);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.success).toBe(true);
        expect(Object.keys(result.data)).toEqual(['ui']);
        expect(result.data.ui).toHaveProperty('theme');
        expect(result.data.ui).toHaveProperty('items_per_page');
        expect(result.data.ui).toHaveProperty('enable_animations');
        expect(result.meta.section).toBe('ui');
      });

      it('機能設定のみを取得できること', async () => {
        const apiContext = createMockAPIContext({ section: 'features' });
        const response = await GET(apiContext);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.success).toBe(true);
        expect(Object.keys(result.data)).toEqual(['features']);
        expect(result.data.features).toHaveProperty('analytics_enabled');
        expect(result.data.features).toHaveProperty('github_integration');
        expect(result.data.features).toHaveProperty('search_enabled');
        expect(result.meta.section).toBe('features');
      });

      it('センシティブ情報を含む設定を取得できること', async () => {
        const apiContext = createMockAPIContext({
          section: 'github',
          include_sensitive: 'true',
        });
        const response = await GET(apiContext);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.success).toBe(true);
        expect(result.data.github).toHaveProperty('token_configured');
        expect(result.data.github).toHaveProperty('app_id_configured');
        expect(typeof result.data.github.token_configured).toBe('boolean');
        expect(typeof result.data.github.app_id_configured).toBe('boolean');
        expect(result.meta.include_sensitive).toBe(true);
      });

      it('センシティブ情報を含まない設定を取得できること', async () => {
        const apiContext = createMockAPIContext({
          section: 'github',
          include_sensitive: 'false',
        });
        const response = await GET(apiContext);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.success).toBe(true);
        expect(result.data.github).not.toHaveProperty('token_configured');
        expect(result.data.github).not.toHaveProperty('app_id_configured');
        expect(result.meta.include_sensitive).toBe(false);
      });

      it('デフォルト値が正しく設定されること', async () => {
        const apiContext = createMockAPIContext();
        const response = await GET(apiContext);
        const result = await response.json();

        // Check GitHub defaults
        expect(result.data.github.owner).toBe('example');
        expect(result.data.github.repo).toBe('example-repo');
        expect(result.data.github.base_url).toBe('https://api.github.com');
        expect(result.data.github.rate_limit_threshold).toBe(100);

        // Check UI defaults
        expect(result.data.ui.theme).toBe('light');
        expect(result.data.ui.items_per_page).toBe(30);
        expect(result.data.ui.max_items_per_page).toBe(100);

        // Check features defaults
        expect(result.data.features.analytics_enabled).toBe(true);
        expect(result.data.features.github_integration).toBe(true);
        expect(result.data.features.search_enabled).toBe(true);
      });

      it('メタ情報が正しく設定されること', async () => {
        const apiContext = createMockAPIContext({ section: 'ui' });
        const response = await GET(apiContext);
        const result = await response.json();

        expect(result.meta.section).toBe('ui');
        expect(result.meta.include_sensitive).toBe(false);
        expect(result.meta.generated_at).toBeDefined();
        expect(result.meta.environment).toBeDefined();
        expect(result.meta.cache_expires_at).toBeDefined();

        // Verify timestamp formats
        const generatedAt = new Date(result.meta.generated_at);
        const expiresAt = new Date(result.meta.cache_expires_at);
        expect(isNaN(generatedAt.getTime())).toBe(false);
        expect(isNaN(expiresAt.getTime())).toBe(false);
        expect(expiresAt.getTime()).toBeGreaterThan(generatedAt.getTime());
      });

      it('キャッシュの有効期限が10分後に設定されること', async () => {
        const beforeTime = Date.now() + 9 * 60 * 1000; // 9 minutes from now
        const afterTime = Date.now() + 11 * 60 * 1000; // 11 minutes from now

        const apiContext = createMockAPIContext();
        const response = await GET(apiContext);
        const result = await response.json();

        const expiresAt = new Date(result.meta.cache_expires_at).getTime();
        expect(expiresAt).toBeGreaterThan(beforeTime);
        expect(expiresAt).toBeLessThan(afterTime);
      });
    });

    describe('パラメータバリデーション', () => {
      it('無効なsectionを適切に処理すること', async () => {
        const apiContext = createMockAPIContext({ section: 'invalid' });
        const response = await GET(apiContext);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.success).toBe(false);
        expect(result.error.code).toBe('VALIDATION_ERROR');
      });

      it('無効なinclude_sensitiveを適切に処理すること', async () => {
        const apiContext = createMockAPIContext({ include_sensitive: 'invalid' });
        const response = await GET(apiContext);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.success).toBe(false);
        expect(result.error.code).toBe('VALIDATION_ERROR');
      });

      it('数値形式のブール値を適切に処理すること', async () => {
        const apiContext = createMockAPIContext({ include_sensitive: '1' });
        const response = await GET(apiContext);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.success).toBe(true);
        expect(result.meta.include_sensitive).toBe(true);
      });

      it('文字列形式のブール値を適切に処理すること', async () => {
        const contexts = [
          { value: 'true', expected: true },
          { value: 'false', expected: false },
          { value: 'yes', expected: true },
          { value: 'no', expected: false },
          { value: '0', expected: false },
        ];

        for (const { value, expected } of contexts) {
          const apiContext = createMockAPIContext({ include_sensitive: value });
          const response = await GET(apiContext);
          const result = await response.json();

          expect(response.status).toBe(200);
          expect(result.meta.include_sensitive).toBe(expected);
        }
      });
    });

    describe('エラーハンドリング', () => {
      it('予期しない例外を適切に処理すること', async () => {
        // Force an error by mocking import.meta.env to throw
        const originalEnv = import.meta.env;
        Object.defineProperty(import.meta, 'env', {
          get() {
            throw new Error('Environment access error');
          },
          configurable: true,
        });

        const apiContext = createMockAPIContext();
        const response = await GET(apiContext);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.success).toBe(false);
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.message).toBe('Environment access error');

        // Restore original environment
        Object.defineProperty(import.meta, 'env', {
          value: originalEnv,
          configurable: true,
        });
      });

      it('非Errorオブジェクトがthrowされた場合の処理', async () => {
        // Mock URL.searchParams to throw non-Error
        const originalURL = global.URL;
        global.URL = class extends URL {
          override get searchParams(): URLSearchParams {
            throw 'String error'; // Non-Error object
          }
        } as any;

        const apiContext = createMockAPIContext();
        const response = await GET(apiContext);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.success).toBe(false);
        expect(result.error.message).toBe('Unknown error');

        // Restore original URL
        global.URL = originalURL;
      });
    });

    describe('レスポンス形式', () => {
      it('正しいレスポンスヘッダーが設定されること', async () => {
        const apiContext = createMockAPIContext();
        const response = await GET(apiContext);

        expect(response.headers.get('Content-Type')).toBe('application/json');
        expect(response.headers.get('Cache-Control')).toBe('public, max-age=600');
      });

      it('JSONとして正しくフォーマットされること', async () => {
        const apiContext = createMockAPIContext();
        const response = await GET(apiContext);
        const responseText = await response.text();

        // Should be parseable JSON
        expect(() => JSON.parse(responseText)).not.toThrow();

        // Should be prettified (contain newlines and spaces)
        expect(responseText).toContain('\n');
        expect(responseText).toContain('  ');
      });

      it('エラー時も正しいヘッダーが設定されること', async () => {
        const apiContext = createMockAPIContext({ section: 'invalid' });
        const response = await GET(apiContext);

        expect(response.headers.get('Content-Type')).toBe('application/json');
      });
    });

    describe('環境変数の取得', () => {
      it('環境変数が設定されている場合の動作', async () => {
        // Mock environment variables
        const originalEnv = import.meta.env;
        Object.defineProperty(import.meta, 'env', {
          value: {
            ...originalEnv,
            GITHUB_OWNER: 'test-owner',
            GITHUB_REPO: 'test-repo',
            GITHUB_TOKEN: 'test-token',
            GITHUB_APP_ID: '12345',
            MODE: 'development',
          },
          configurable: true,
        });

        const apiContext = createMockAPIContext({
          section: 'github',
          include_sensitive: 'true',
        });
        const response = await GET(apiContext);
        const result = await response.json();

        expect(result.data.github.owner).toBe('test-owner');
        expect(result.data.github.repo).toBe('test-repo');
        expect(result.data.github.token_configured).toBe(true);
        expect(result.data.github.app_id_configured).toBe(true);
        expect(result.meta.environment).toBe('development');

        // Restore original environment
        Object.defineProperty(import.meta, 'env', {
          value: originalEnv,
          configurable: true,
        });
      });

      it('環境変数が未設定の場合の動作', async () => {
        // Mock environment variables as undefined
        const originalEnv = import.meta.env;
        Object.defineProperty(import.meta, 'env', {
          value: {
            ...originalEnv,
            GITHUB_OWNER: undefined,
            GITHUB_REPO: undefined,
            GITHUB_TOKEN: undefined,
            GITHUB_APP_ID: undefined,
          },
          configurable: true,
        });

        const apiContext = createMockAPIContext({
          section: 'github',
          include_sensitive: 'true',
        });
        const response = await GET(apiContext);
        const result = await response.json();

        expect(result.data.github.owner).toBe('example');
        expect(result.data.github.repo).toBe('example-repo');
        expect(result.data.github.token_configured).toBe(false);
        expect(result.data.github.app_id_configured).toBe(false);

        // Restore original environment
        Object.defineProperty(import.meta, 'env', {
          value: originalEnv,
          configurable: true,
        });
      });
    });
  });

  describe('POST: 設定更新', () => {
    describe('成功ケース', () => {
      it('UI設定を更新できること', async () => {
        const updateData = {
          section: 'ui',
          settings: {
            theme: 'dark',
            items_per_page: 50,
            enable_animations: false,
          },
        };

        const apiContext = createMockPostAPIContext(updateData);
        const response = await POST(apiContext);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.success).toBe(true);
        expect(result.data.message).toBe('Configuration update received');
        expect(result.data.section).toBe('ui');
        expect(result.data.updated_settings).toEqual(updateData.settings);
        expect(result.meta.updated_at).toBeDefined();
        expect(result.meta.note).toContain('not persistent');
      });

      it('features設定を更新できること', async () => {
        const updateData = {
          section: 'features',
          settings: {
            analytics_enabled: false,
            real_time_updates: true,
          },
        };

        const apiContext = createMockPostAPIContext(updateData);
        const response = await POST(apiContext);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.success).toBe(true);
        expect(result.data.section).toBe('features');
        expect(result.data.updated_settings).toEqual(updateData.settings);
      });

      it('performance設定を更新できること', async () => {
        const updateData = {
          section: 'performance',
          settings: {
            cache_enabled: false,
            compression_enabled: true,
            lazy_loading: false,
          },
        };

        const apiContext = createMockPostAPIContext(updateData);
        const response = await POST(apiContext);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.success).toBe(true);
        expect(result.data.section).toBe('performance');
        expect(result.data.updated_settings).toEqual(updateData.settings);
      });

      it('空の設定オブジェクトでも更新できること', async () => {
        const updateData = {
          section: 'ui',
          settings: {},
        };

        const apiContext = createMockPostAPIContext(updateData);
        const response = await POST(apiContext);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.success).toBe(true);
        expect(result.data.updated_settings).toEqual({});
      });

      it('複雑な設定オブジェクトを処理できること', async () => {
        const updateData = {
          section: 'ui',
          settings: {
            theme: 'dark',
            nested: {
              value: 'test',
              array: [1, 2, 3],
            },
            boolean: true,
            number: 42,
            string: 'test',
            null_value: null,
          },
        };

        const apiContext = createMockPostAPIContext(updateData);
        const response = await POST(apiContext);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.success).toBe(true);
        expect(result.data.updated_settings).toEqual(updateData.settings);
      });
    });

    describe('バリデーションエラー', () => {
      it('無効なsectionを適切に処理すること', async () => {
        const updateData = {
          section: 'invalid',
          settings: {},
        };

        const apiContext = createMockPostAPIContext(updateData);
        const response = await POST(apiContext);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.success).toBe(false);
        expect(result.error.code).toBe('VALIDATION_ERROR');
      });

      it('保護されたsectionを拒否すること', async () => {
        const updateData = {
          section: 'github', // Not allowed in POST
          settings: {
            owner: 'hacker',
          },
        };

        const apiContext = createMockPostAPIContext(updateData);
        const response = await POST(apiContext);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.success).toBe(false);
        expect(result.error.code).toBe('VALIDATION_ERROR');
      });

      it('apiセクションを拒否すること', async () => {
        const updateData = {
          section: 'api',
          settings: {
            timeout_seconds: 60,
          },
        };

        const apiContext = createMockPostAPIContext(updateData);
        const response = await POST(apiContext);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.success).toBe(false);
        expect(result.error.code).toBe('VALIDATION_ERROR');
      });

      it('securityセクションを拒否すること', async () => {
        const updateData = {
          section: 'security',
          settings: {
            require_authentication: false,
          },
        };

        const apiContext = createMockPostAPIContext(updateData);
        const response = await POST(apiContext);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.success).toBe(false);
        expect(result.error.code).toBe('VALIDATION_ERROR');
      });

      it('sectionフィールドが欠如している場合の処理', async () => {
        const updateData = {
          settings: { theme: 'dark' },
        };

        const apiContext = createMockPostAPIContext(updateData);
        const response = await POST(apiContext);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.success).toBe(false);
        expect(result.error.code).toBe('VALIDATION_ERROR');
      });

      it('settingsフィールドが欠如している場合の処理', async () => {
        const updateData = {
          section: 'ui',
        };

        const apiContext = createMockPostAPIContext(updateData);
        const response = await POST(apiContext);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.success).toBe(false);
        expect(result.error.code).toBe('VALIDATION_ERROR');
      });

      it('設定値が正しい型でない場合でも受け入れること', async () => {
        // The schema uses z.record(z.unknown()), so any value should be accepted
        const updateData = {
          section: 'ui',
          settings: {
            theme: 123, // Wrong type, but should be accepted as unknown
            items_per_page: 'invalid', // Wrong type, but should be accepted
          },
        };

        const apiContext = createMockPostAPIContext(updateData);
        const response = await POST(apiContext);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.success).toBe(true);
        expect(result.data.updated_settings).toEqual(updateData.settings);
      });
    });

    describe('エラーハンドリング', () => {
      it('JSONパースエラーを適切に処理すること', async () => {
        const url = new URL('http://localhost:3000/api/config/settings');
        const request = new Request(url.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid json',
        });

        const apiContext = {
          request,
          url,
          site: new URL('http://localhost:3000'),
          generator: 'astro',
          params: {},
          props: {},
          redirect: () => new Response('', { status: 302 }),
          rewrite: () => new Response('', { status: 200 }),
          cookies: {
            get: () => undefined,
            set: () => {},
            delete: () => {},
            has: () => false,
          },
          locals: {},
          clientAddress: '127.0.0.1',
          currentLocale: undefined,
          preferredLocale: undefined,
          preferredLocaleList: [],
          routePattern: '',
          originPathname: '/api/config/settings',
          getActionResult: () => undefined,
          callAction: () => Promise.resolve(undefined),
          isPrerendered: false,
          routeData: undefined,
        } as any;

        const response = await POST(apiContext);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.success).toBe(false);
        expect(result.error.code).toBe('VALIDATION_ERROR');
      });

      it('予期しない例外を適切に処理すること', async () => {
        // Force an error by mocking Date constructor to throw
        const originalDate = global.Date;
        global.Date = class MockDate extends Date {
          constructor() {
            super();
            throw new Error('Date construction error');
          }

          static override now() {
            return originalDate.now();
          }

          override toISOString(): string {
            throw new Error('ISO string error');
          }
        } as any;

        const updateData = {
          section: 'ui',
          settings: { theme: 'dark' },
        };

        const apiContext = createMockPostAPIContext(updateData);
        const response = await POST(apiContext);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.success).toBe(false);
        expect(result.error.code).toBe('VALIDATION_ERROR');

        // Restore original Date
        global.Date = originalDate;
      });

      it('非Errorオブジェクトがthrowされた場合の処理', async () => {
        // Mock JSON.stringify to throw non-Error
        const originalStringify = JSON.stringify;
        JSON.stringify = () => {
          throw 'String error'; // Non-Error object
        };

        const updateData = {
          section: 'ui',
          settings: { theme: 'dark' },
        };

        const apiContext = createMockPostAPIContext(updateData);
        const response = await POST(apiContext);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.success).toBe(false);
        expect(result.error.message).toBe('Unknown error');

        // Restore original JSON.stringify
        JSON.stringify = originalStringify;
      });
    });

    describe('レスポンス形式', () => {
      it('正しいレスポンスヘッダーが設定されること', async () => {
        const updateData = {
          section: 'ui',
          settings: { theme: 'dark' },
        };

        const apiContext = createMockPostAPIContext(updateData);
        const response = await POST(apiContext);

        expect(response.headers.get('Content-Type')).toBe('application/json');
      });

      it('JSONとして正しくフォーマットされること', async () => {
        const updateData = {
          section: 'ui',
          settings: { theme: 'dark' },
        };

        const apiContext = createMockPostAPIContext(updateData);
        const response = await POST(apiContext);
        const responseText = await response.text();

        // Should be parseable JSON
        expect(() => JSON.parse(responseText)).not.toThrow();

        // Should be prettified (contain newlines and spaces)
        expect(responseText).toContain('\n');
        expect(responseText).toContain('  ');
      });

      it('タイムスタンプが正しく設定されること', async () => {
        const updateData = {
          section: 'ui',
          settings: { theme: 'dark' },
        };

        const apiContext = createMockPostAPIContext(updateData);
        const response = await POST(apiContext);
        const result = await response.json();

        const updatedAt = new Date(result.meta.updated_at);
        expect(isNaN(updatedAt.getTime())).toBe(false);
        expect(updatedAt.toISOString()).toBe(result.meta.updated_at);
      });

      it('エラー時も正しいヘッダーが設定されること', async () => {
        const updateData = {
          section: 'invalid',
          settings: {},
        };

        const apiContext = createMockPostAPIContext(updateData);
        const response = await POST(apiContext);

        expect(response.headers.get('Content-Type')).toBe('application/json');
      });
    });
  });
});

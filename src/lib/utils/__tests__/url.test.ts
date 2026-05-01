/**
 * URL Utilities Test Suite
 *
 * 包括的なURLユーティリティテスト
 * GitHub Pages対応とベースパス解決の信頼性を確保
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveUrl, resolveUrls, createUrlResolver } from '../url';

// import.meta.env.BASE_URL は vi.stubEnv で動的に変更する。
// 以前のバージョンは `vi.mock('../url', ...)` で対象自身をスタブ実装に
// 置き換えていたためソースが一切実行されず、resolveUrl/resolveUrls の
// 行カバレージが 0% だった。
const setBaseUrl = (value: string | undefined) => {
  if (value === undefined) {
    vi.stubEnv('BASE_URL', '');
  } else {
    vi.stubEnv('BASE_URL', value);
  }
};

describe('URL Utilities', () => {
  beforeEach(() => {
    setBaseUrl('/');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  // =====================
  // RESOLVE URL TESTS
  // =====================

  describe('resolveUrl', () => {
    it('should return path as-is in development environment (BASE_URL = "/")', () => {
      setBaseUrl('/');

      expect(resolveUrl('/issues')).toBe('/issues');
      expect(resolveUrl('/analytics')).toBe('/analytics');
      expect(resolveUrl('/api/health')).toBe('/api/health');
    });

    it('should prepend base path in production environment', () => {
      setBaseUrl('/beaver/');

      expect(resolveUrl('/issues')).toBe('/beaver/issues');
      expect(resolveUrl('/analytics')).toBe('/beaver/analytics');
      expect(resolveUrl('/api/health')).toBe('/beaver/api/health');
    });

    it('should handle base URL without trailing slash', () => {
      setBaseUrl('/beaver');

      expect(resolveUrl('/issues')).toBe('/beaver/issues');
      expect(resolveUrl('/analytics')).toBe('/beaver/analytics');
    });

    it('should normalize paths without leading slash', () => {
      setBaseUrl('/beaver/');

      expect(resolveUrl('issues')).toBe('/beaver/issues');
      expect(resolveUrl('analytics')).toBe('/beaver/analytics');
      expect(resolveUrl('api/health')).toBe('/beaver/api/health');
    });

    it('should handle empty path', () => {
      setBaseUrl('/beaver/');

      expect(resolveUrl('')).toBe('/beaver/');
    });

    it('should handle root path', () => {
      setBaseUrl('/beaver/');

      expect(resolveUrl('/')).toBe('/beaver/');
    });

    it('should handle complex nested paths', () => {
      setBaseUrl('/beaver/');

      expect(resolveUrl('/issues/123/comments')).toBe('/beaver/issues/123/comments');
      expect(resolveUrl('/api/github/issues?state=open')).toBe(
        '/beaver/api/github/issues?state=open'
      );
    });

    it('should fall back to "/" when BASE_URL is empty/unset', () => {
      // 空文字 (`||` 演算子で '/' に fallback される) のケース
      setBaseUrl('');

      expect(resolveUrl('/issues')).toBe('/issues');
    });

    it('should preserve query parameters and fragments', () => {
      setBaseUrl('/beaver/');

      expect(resolveUrl('/issues?state=open&page=2')).toBe('/beaver/issues?state=open&page=2');
      expect(resolveUrl('/issues#comment-123')).toBe('/beaver/issues#comment-123');
      expect(resolveUrl('/issues?state=open#comment-123')).toBe(
        '/beaver/issues?state=open#comment-123'
      );
    });

    it('should handle special characters in paths', () => {
      setBaseUrl('/beaver/');

      expect(resolveUrl('/search?q=test%20query')).toBe('/beaver/search?q=test%20query');
      expect(resolveUrl('/users/test@example.com')).toBe('/beaver/users/test@example.com');
    });
  });

  // =====================
  // RESOLVE URLS TESTS
  // =====================

  describe('resolveUrls', () => {
    it('should resolve multiple URLs correctly in development', () => {
      setBaseUrl('/');

      const paths = ['/issues', '/analytics', '/api/health'];
      const expected = ['/issues', '/analytics', '/api/health'];

      expect(resolveUrls(paths)).toEqual(expected);
    });

    it('should resolve multiple URLs correctly in production', () => {
      setBaseUrl('/beaver/');

      const paths = ['/issues', '/analytics', '/api/health'];
      const expected = ['/beaver/issues', '/beaver/analytics', '/beaver/api/health'];

      expect(resolveUrls(paths)).toEqual(expected);
    });

    it('should handle empty array', () => {
      setBaseUrl('/beaver/');

      expect(resolveUrls([])).toEqual([]);
    });

    it('should handle single URL in array', () => {
      setBaseUrl('/beaver/');

      expect(resolveUrls(['/issues'])).toEqual(['/beaver/issues']);
    });

    it('should handle mixed path formats', () => {
      setBaseUrl('/beaver/');

      const paths = ['/issues', 'analytics', '/api/health', ''];
      const expected = ['/beaver/issues', '/beaver/analytics', '/beaver/api/health', '/beaver/'];

      expect(resolveUrls(paths)).toEqual(expected);
    });

    it('should preserve order of paths', () => {
      setBaseUrl('/beaver/');

      const paths = ['/c', '/a', '/b'];
      const expected = ['/beaver/c', '/beaver/a', '/beaver/b'];

      expect(resolveUrls(paths)).toEqual(expected);
    });

    it('should handle large arrays efficiently', () => {
      setBaseUrl('/beaver/');

      const paths = Array.from({ length: 1000 }, (_, i) => `/path-${i}`);
      const expected = Array.from({ length: 1000 }, (_, i) => `/beaver/path-${i}`);

      const result = resolveUrls(paths);

      expect(result).toEqual(expected);
    });
  });

  // ==============================
  // CREATE URL RESOLVER TESTS
  // ==============================

  describe('createUrlResolver', () => {
    it('should create resolver with custom base path', () => {
      const resolver = createUrlResolver('/custom-base/');

      expect(resolver('/issues')).toBe('/custom-base/issues');
      expect(resolver('/analytics')).toBe('/custom-base/analytics');
    });

    it('should create resolver that behaves like development when base is "/"', () => {
      const resolver = createUrlResolver('/');

      expect(resolver('/issues')).toBe('/issues');
      expect(resolver('analytics')).toBe('analytics');
    });

    it('should handle custom base without trailing slash', () => {
      const resolver = createUrlResolver('/custom-base');

      expect(resolver('/issues')).toBe('/custom-base/issues');
      expect(resolver('analytics')).toBe('/custom-base/analytics');
    });

    it('should normalize paths in custom resolver', () => {
      const resolver = createUrlResolver('/custom-base/');

      expect(resolver('issues')).toBe('/custom-base/issues');
      expect(resolver('/issues')).toBe('/custom-base/issues');
    });

    it('should handle empty paths in custom resolver', () => {
      const resolver = createUrlResolver('/custom-base/');

      expect(resolver('')).toBe('/custom-base/');
      expect(resolver('/')).toBe('/custom-base/');
    });

    it('should create multiple independent resolvers', () => {
      const resolver1 = createUrlResolver('/base1/');
      const resolver2 = createUrlResolver('/base2/');

      expect(resolver1('/path')).toBe('/base1/path');
      expect(resolver2('/path')).toBe('/base2/path');
    });

    it('should preserve original function behavior when called multiple times', () => {
      const resolver = createUrlResolver('/custom/');

      expect(resolver('/test')).toBe('/custom/test');
      expect(resolver('/test')).toBe('/custom/test');
      expect(resolver('/different')).toBe('/custom/different');
    });

    it('should handle complex custom base paths', () => {
      const resolver = createUrlResolver('/org/project/v2/');

      expect(resolver('/api/data')).toBe('/org/project/v2/api/data');
      expect(resolver('/dashboard')).toBe('/org/project/v2/dashboard');
    });

    it('should work with query parameters and fragments', () => {
      const resolver = createUrlResolver('/custom/');

      expect(resolver('/search?q=test')).toBe('/custom/search?q=test');
      expect(resolver('/page#section')).toBe('/custom/page#section');
    });
  });

  // =====================
  // EDGE CASES & ERROR HANDLING
  // =====================

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed base URLs gracefully', () => {
      const malformedBases = ['///', '\\invalid\\', 'not-a-path'];

      malformedBases.forEach(base => {
        const resolver = createUrlResolver(base);
        expect(() => resolver('/test')).not.toThrow();
      });
    });

    it('should handle very long paths', () => {
      setBaseUrl('/beaver/');

      const longPath = '/' + 'a'.repeat(1000);
      const result = resolveUrl(longPath);

      expect(result).toBe('/beaver' + longPath);
      expect(result.length).toBe(1008); // 7 ('/beaver') + 1001 ('/' + 1000 'a's)
    });

    it('should handle Unicode characters in paths', () => {
      setBaseUrl('/beaver/');

      const unicodePath = '/测试/テスト/тест';
      expect(resolveUrl(unicodePath)).toBe('/beaver/测试/テスト/тест');
    });

    it('should handle concurrent resolver creation', () => {
      const resolvers = Array.from({ length: 10 }, (_, i) => createUrlResolver(`/base-${i}/`));

      resolvers.forEach((resolver, i) => {
        expect(resolver('/test')).toBe(`/base-${i}/test`);
      });
    });
  });

  // =====================
  // INTEGRATION TESTS
  // =====================

  describe('Integration Tests', () => {
    it('should work consistently across different environment setups', () => {
      const testConfigs = [
        { base: '/', path: '/test', expected: '/test' },
        { base: '/app/', path: '/test', expected: '/app/test' },
        { base: '/app', path: 'test', expected: '/app/test' },
        { base: '/deep/nested/path/', path: '/api', expected: '/deep/nested/path/api' },
      ];

      testConfigs.forEach(({ base, path, expected }) => {
        setBaseUrl(base);
        expect(resolveUrl(path)).toBe(expected);
      });
    });

    it('should maintain consistency between resolveUrl and createUrlResolver', () => {
      const testPaths = ['/test', 'test', '', '/'];
      const testBases = ['/', '/app/', '/app', '/deep/path/'];

      testBases.forEach(base => {
        const customResolver = createUrlResolver(base);
        setBaseUrl(base);

        testPaths.forEach(path => {
          expect(resolveUrl(path)).toBe(customResolver(path));
        });
      });
    });
  });

  // =====================
  // BROWSER COMPATIBILITY TESTS
  // =====================

  describe('Browser Compatibility', () => {
    it('should handle different BASE_URL formats that browsers might provide', () => {
      const browserFormats = ['/', '/app/', '/app', '/deep/nested/path/'];

      browserFormats.forEach(format => {
        setBaseUrl(format);
        expect(() => resolveUrl('/test')).not.toThrow();
      });
    });

    it('should preserve URL encoding', () => {
      setBaseUrl('/app/');

      const encodedPath = '/search?q=hello%20world&type=issue';
      expect(resolveUrl(encodedPath)).toBe('/app/search?q=hello%20world&type=issue');
    });
  });
});

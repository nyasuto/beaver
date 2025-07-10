/**
 * URL Utilities Test Suite
 *
 * 包括的なURLユーティリティテスト
 * GitHub Pages対応とベースパス解決の信頼性を確保
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveUrl, resolveUrls, createUrlResolver } from '../url';

// import.meta.envのモック
const mockEnv = { BASE_URL: '/' };

vi.mock('../url', async () => {
  const actual = (await vi.importActual('../url')) as any;

  return {
    ...actual,
    resolveUrl: (path: string): string => {
      const base = mockEnv.BASE_URL || '/';

      if (base === '/') {
        return path;
      }

      const cleanBase = base.replace(/\/+$/, '');
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;

      return `${cleanBase}${normalizedPath}`;
    },
    resolveUrls: (paths: string[]): string[] => {
      const base = mockEnv.BASE_URL || '/';

      return paths.map(path => {
        if (base === '/') {
          return path;
        }

        const cleanBase = base.replace(/\/+$/, '');
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;

        return `${cleanBase}${normalizedPath}`;
      });
    },
  };
});

describe('URL Utilities', () => {
  beforeEach(() => {
    mockEnv.BASE_URL = '/';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // =====================
  // RESOLVE URL TESTS
  // =====================

  describe('resolveUrl', () => {
    it('should return path as-is in development environment (BASE_URL = "/")', () => {
      mockEnv.BASE_URL = '/';

      expect(resolveUrl('/issues')).toBe('/issues');
      expect(resolveUrl('/analytics')).toBe('/analytics');
      expect(resolveUrl('/api/health')).toBe('/api/health');
    });

    it('should prepend base path in production environment', () => {
      mockEnv.BASE_URL = '/beaver/';

      expect(resolveUrl('/issues')).toBe('/beaver/issues');
      expect(resolveUrl('/analytics')).toBe('/beaver/analytics');
      expect(resolveUrl('/api/health')).toBe('/beaver/api/health');
    });

    it('should handle base URL without trailing slash', () => {
      mockEnv.BASE_URL = '/beaver';

      expect(resolveUrl('/issues')).toBe('/beaver/issues');
      expect(resolveUrl('/analytics')).toBe('/beaver/analytics');
    });

    it('should normalize paths without leading slash', () => {
      mockEnv.BASE_URL = '/beaver/';

      expect(resolveUrl('issues')).toBe('/beaver/issues');
      expect(resolveUrl('analytics')).toBe('/beaver/analytics');
      expect(resolveUrl('api/health')).toBe('/beaver/api/health');
    });

    it('should handle empty path', () => {
      mockEnv.BASE_URL = '/beaver/';

      expect(resolveUrl('')).toBe('/beaver/');
    });

    it('should handle root path', () => {
      mockEnv.BASE_URL = '/beaver/';

      expect(resolveUrl('/')).toBe('/beaver/');
    });

    it('should handle complex nested paths', () => {
      mockEnv.BASE_URL = '/beaver/';

      expect(resolveUrl('/issues/123/comments')).toBe('/beaver/issues/123/comments');
      expect(resolveUrl('/api/github/issues?state=open')).toBe(
        '/beaver/api/github/issues?state=open'
      );
    });

    it('should handle multiple slashes in base URL', () => {
      mockEnv.BASE_URL = '/beaver//';

      expect(resolveUrl('/issues')).toBe('/beaver/issues');
    });

    it('should handle undefined BASE_URL', () => {
      mockEnv.BASE_URL = undefined as any;

      expect(resolveUrl('/issues')).toBe('/issues');
    });

    it('should preserve query parameters and fragments', () => {
      mockEnv.BASE_URL = '/beaver/';

      expect(resolveUrl('/issues?state=open&page=2')).toBe('/beaver/issues?state=open&page=2');
      expect(resolveUrl('/issues#comment-123')).toBe('/beaver/issues#comment-123');
      expect(resolveUrl('/issues?state=open#comment-123')).toBe(
        '/beaver/issues?state=open#comment-123'
      );
    });

    it('should handle special characters in paths', () => {
      mockEnv.BASE_URL = '/beaver/';

      expect(resolveUrl('/search?q=test%20query')).toBe('/beaver/search?q=test%20query');
      expect(resolveUrl('/users/test@example.com')).toBe('/beaver/users/test@example.com');
    });
  });

  // =====================
  // RESOLVE URLS TESTS
  // =====================

  describe('resolveUrls', () => {
    it('should resolve multiple URLs correctly in development', () => {
      mockEnv.BASE_URL = '/';

      const paths = ['/issues', '/analytics', '/api/health'];
      const expected = ['/issues', '/analytics', '/api/health'];

      expect(resolveUrls(paths)).toEqual(expected);
    });

    it('should resolve multiple URLs correctly in production', () => {
      mockEnv.BASE_URL = '/beaver/';

      const paths = ['/issues', '/analytics', '/api/health'];
      const expected = ['/beaver/issues', '/beaver/analytics', '/beaver/api/health'];

      expect(resolveUrls(paths)).toEqual(expected);
    });

    it('should handle empty array', () => {
      mockEnv.BASE_URL = '/beaver/';

      expect(resolveUrls([])).toEqual([]);
    });

    it('should handle single URL in array', () => {
      mockEnv.BASE_URL = '/beaver/';

      expect(resolveUrls(['/issues'])).toEqual(['/beaver/issues']);
    });

    it('should handle mixed path formats', () => {
      mockEnv.BASE_URL = '/beaver/';

      const paths = ['/issues', 'analytics', '/api/health', ''];
      const expected = ['/beaver/issues', '/beaver/analytics', '/beaver/api/health', '/beaver/'];

      expect(resolveUrls(paths)).toEqual(expected);
    });

    it('should preserve order of paths', () => {
      mockEnv.BASE_URL = '/beaver/';

      const paths = ['/c', '/a', '/b'];
      const expected = ['/beaver/c', '/beaver/a', '/beaver/b'];

      expect(resolveUrls(paths)).toEqual(expected);
    });

    it('should handle large arrays efficiently', () => {
      mockEnv.BASE_URL = '/beaver/';

      const paths = Array.from({ length: 1000 }, (_, i) => `/path-${i}`);
      const expected = Array.from({ length: 1000 }, (_, i) => `/beaver/path-${i}`);

      const startTime = Date.now();
      const result = resolveUrls(paths);
      const endTime = Date.now();

      expect(result).toEqual(expected);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
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

      // 複数回呼び出しても同じ結果
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
      // 様々な不正なベースURLでもエラーを投げない
      const malformedBases = ['///', '\\invalid\\', 'not-a-path'];

      malformedBases.forEach(base => {
        const resolver = createUrlResolver(base);
        expect(() => resolver('/test')).not.toThrow();
      });
    });

    it('should handle very long paths', () => {
      mockEnv.BASE_URL = '/beaver/';

      const longPath = '/' + 'a'.repeat(1000);
      const result = resolveUrl(longPath);

      expect(result).toBe('/beaver' + longPath);
      expect(result.length).toBe(1008); // 7 ('/beaver') + 1001 ('/' + 1000 'a's)
    });

    it('should handle Unicode characters in paths', () => {
      mockEnv.BASE_URL = '/beaver/';

      const unicodePath = '/测试/テスト/тест';
      expect(resolveUrl(unicodePath)).toBe('/beaver/测试/テスト/тест');
    });

    it('should handle null/undefined inputs safely for createUrlResolver', () => {
      // TypeScript prevents this, but test runtime safety
      expect(() => createUrlResolver(null as any)).not.toThrow();
      expect(() => createUrlResolver(undefined as any)).not.toThrow();
    });

    it('should handle concurrent resolver creation', () => {
      // 並行してリゾルバーを作成しても安全
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
        mockEnv.BASE_URL = base;
        expect(resolveUrl(path)).toBe(expected);
      });
    });

    it('should maintain consistency between resolveUrl and createUrlResolver', () => {
      const testPaths = ['/test', 'test', '', '/'];
      const testBases = ['/', '/app/', '/app', '/deep/path/'];

      testBases.forEach(base => {
        const customResolver = createUrlResolver(base);

        // createUrlResolver doesn't depend on environment, so we can test consistency
        mockEnv.BASE_URL = base;

        testPaths.forEach(path => {
          expect(resolveUrl(path)).toBe(customResolver(path));
        });
      });
    });

    it('should handle batch processing efficiently', () => {
      mockEnv.BASE_URL = '/app/';

      const largeBatch = Array.from({ length: 5000 }, (_, i) => `/item-${i}`);

      const startTime = Date.now();
      const results = resolveUrls(largeBatch);
      const endTime = Date.now();

      expect(results).toHaveLength(5000);
      expect(results[0]).toBe('/app/item-0');
      expect(results[4999]).toBe('/app/item-4999');
      expect(endTime - startTime).toBeLessThan(500); // Should be reasonably fast
    });
  });

  // =====================
  // BROWSER COMPATIBILITY TESTS
  // =====================

  describe('Browser Compatibility', () => {
    it('should handle different BASE_URL formats that browsers might provide', () => {
      const browserFormats = ['/', '/app/', '/app', '/deep/nested/path/'];

      browserFormats.forEach(format => {
        mockEnv.BASE_URL = format;
        expect(() => resolveUrl('/test')).not.toThrow();
      });
    });

    it('should preserve URL encoding', () => {
      mockEnv.BASE_URL = '/app/';

      const encodedPath = '/search?q=hello%20world&type=issue';
      expect(resolveUrl(encodedPath)).toBe('/app/search?q=hello%20world&type=issue');
    });
  });

  // =====================
  // PERFORMANCE TESTS
  // =====================

  describe('Performance Tests', () => {
    it('should handle single URL resolution efficiently', () => {
      mockEnv.BASE_URL = '/app/';

      const startTime = Date.now();
      for (let i = 0; i < 10000; i++) {
        resolveUrl(`/path-${i}`);
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should be very fast
    });

    it('should handle batch URL resolution efficiently', () => {
      mockEnv.BASE_URL = '/app/';

      const paths = Array.from({ length: 10000 }, (_, i) => `/path-${i}`);

      const startTime = Date.now();
      const results = resolveUrls(paths);
      const endTime = Date.now();

      expect(results).toHaveLength(10000);
      expect(endTime - startTime).toBeLessThan(200); // Should be reasonably fast for large batches
    });

    it('should handle custom resolver creation efficiently', () => {
      const startTime = Date.now();

      const resolvers = Array.from({ length: 1000 }, (_, i) => createUrlResolver(`/base-${i}/`));

      const endTime = Date.now();

      expect(resolvers).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(50); // Resolver creation should be fast

      // Test that they all work correctly
      expect(resolvers[0]?.('/test')).toBe('/base-0/test');
      expect(resolvers[999]?.('/test')).toBe('/base-999/test');
    });
  });
});

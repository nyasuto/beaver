/**
 * Health Check API Endpoint Test Suite
 *
 * Issue #99 - API endpoints comprehensive test implementation
 * 90%+ statement coverage, 85%+ branch coverage, 100% function coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../health';

describe('Health Check API Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore all mocks to clean state
    vi.restoreAllMocks();

    // Mock process methods
    vi.spyOn(process, 'uptime').mockReturnValue(123.456);
    vi.spyOn(process, 'memoryUsage').mockReturnValue({
      rss: 1024 * 1024 * 50, // 50MB
      heapTotal: 1024 * 1024 * 30, // 30MB
      heapUsed: 1024 * 1024 * 20, // 20MB
      external: 1024 * 1024 * 5, // 5MB
      arrayBuffers: 1024 * 1024 * 2, // 2MB
    });

    // Mock Date.now for consistent response time testing
    const mockNow = vi.spyOn(Date, 'now');
    mockNow.mockReturnValueOnce(1000); // Start time
    mockNow.mockReturnValueOnce(1050); // End time (50ms response)
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createMockAPIContext = () => {
    const url = new URL('http://localhost:3000/api/health');
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
      originPathname: '/api/health',
      getActionResult: () => undefined,
      callAction: () => Promise.resolve(undefined),
      isPrerendered: false,
      routeData: undefined,
    } as any;
  };

  describe('成功ケース', () => {
    it('基本的なヘルスチェック情報を返すこと', async () => {
      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
      expect(result.uptime).toBe(123.456);
      expect(result.version).toBe('0.1.0');
      expect(result.environment).toBeDefined();
    });

    it('サービス状態情報を含むこと', async () => {
      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.services).toBeDefined();
      expect(result.services.database).toBe('not_implemented');
      expect(result.services.github_api).toBe('not_implemented');
      expect(result.services.analytics).toBe('not_implemented');
    });

    it('パフォーマンス情報を含むこと', async () => {
      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.performance).toBeDefined();
      expect(result.performance.response_time_ms).toBe(50); // Mocked difference
      expect(result.performance.memory_usage).toEqual({
        rss: 1024 * 1024 * 50,
        heapTotal: 1024 * 1024 * 30,
        heapUsed: 1024 * 1024 * 20,
        external: 1024 * 1024 * 5,
        arrayBuffers: 1024 * 1024 * 2,
      });
    });

    it('正しいレスポンスヘッダーが設定されること', async () => {
      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);

      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
    });

    it('ISOフォーマットのタイムスタンプを返すこと', async () => {
      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      const timestamp = new Date(result.timestamp);
      expect(timestamp.toISOString()).toBe(result.timestamp);
      expect(isNaN(timestamp.getTime())).toBe(false);
    });

    it('レスポンス時間が正しく計算されること', async () => {
      // Reset Date.now mock for this specific test
      vi.restoreAllMocks();

      const mockNow = vi.spyOn(Date, 'now');
      mockNow.mockReturnValueOnce(2000); // Start time
      mockNow.mockReturnValueOnce(2075); // End time (75ms response)

      // Re-mock process methods
      vi.spyOn(process, 'uptime').mockReturnValue(123.456);
      vi.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 1024 * 1024 * 50,
        heapTotal: 1024 * 1024 * 30,
        heapUsed: 1024 * 1024 * 20,
        external: 1024 * 1024 * 5,
        arrayBuffers: 1024 * 1024 * 2,
      });

      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.performance.response_time_ms).toBe(75);
    });
  });

  describe('エラーハンドリング', () => {
    it('process.uptime()でエラーが発生した場合の処理', async () => {
      vi.spyOn(process, 'uptime').mockImplementation(() => {
        throw new Error('Uptime error');
      });

      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Uptime error');
      expect(result.timestamp).toBeDefined();
      expect(result.response_time_ms).toBeDefined();
    });

    it('process.memoryUsage()でエラーが発生した場合の処理', async () => {
      vi.spyOn(process, 'memoryUsage').mockImplementation(() => {
        throw new Error('Memory usage error');
      });

      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Memory usage error');
    });

    it('予期しないエラーを適切に処理すること', async () => {
      // Force an error by making memoryUsage return invalid data that breaks JSON.stringify
      vi.spyOn(process, 'memoryUsage').mockImplementation(() => {
        const obj: any = {};
        // Create a circular reference that will cause JSON.stringify to throw
        obj.circular = obj;
        return obj;
      });

      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.status).toBe('unhealthy');
      expect(result.error).toContain('circular'); // JSON.stringify error mentions circular structure
      expect(result.response_time_ms).toBeDefined();
    });

    it('非Errorオブジェクトがthrowされた場合の処理', async () => {
      vi.spyOn(process, 'uptime').mockImplementation(() => {
        throw 'String error'; // Non-Error object
      });

      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Unknown error');
    });

    it('エラー時も正しいヘッダーが設定されること', async () => {
      vi.spyOn(process, 'uptime').mockImplementation(() => {
        throw new Error('Test error');
      });

      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);

      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
    });

    it('エラー時のレスポンス時間が正しく計算されること', async () => {
      // Mock Date.now for error case
      vi.restoreAllMocks();
      const mockNow = vi.spyOn(Date, 'now');
      mockNow.mockReturnValueOnce(3000); // Start time
      mockNow.mockReturnValueOnce(3100); // End time (100ms response)

      vi.spyOn(process, 'uptime').mockImplementation(() => {
        throw new Error('Test error');
      });

      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.response_time_ms).toBe(100);
    });
  });

  describe('レスポンス形式', () => {
    it('JSONとして正しくフォーマットされること', async () => {
      // Reset mocks for this test
      vi.restoreAllMocks();
      vi.spyOn(process, 'uptime').mockReturnValue(123.456);
      vi.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 1024 * 1024 * 50,
        heapTotal: 1024 * 1024 * 30,
        heapUsed: 1024 * 1024 * 20,
        external: 1024 * 1024 * 5,
        arrayBuffers: 1024 * 1024 * 2,
      });

      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const responseText = await response.text();

      // Should be parseable JSON
      expect(() => JSON.parse(responseText)).not.toThrow();

      // Should be prettified (contain newlines and spaces)
      expect(responseText).toContain('\n');
      expect(responseText).toContain('  ');
    });

    it('必須フィールドがすべて含まれること', async () => {
      // Reset mocks for this test
      vi.restoreAllMocks();
      vi.spyOn(process, 'uptime').mockReturnValue(123.456);
      vi.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 1024 * 1024 * 50,
        heapTotal: 1024 * 1024 * 30,
        heapUsed: 1024 * 1024 * 20,
        external: 1024 * 1024 * 5,
        arrayBuffers: 1024 * 1024 * 2,
      });

      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      // Check all required fields are present
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('environment');
      expect(result).toHaveProperty('services');
      expect(result).toHaveProperty('performance');

      expect(result.services).toHaveProperty('database');
      expect(result.services).toHaveProperty('github_api');
      expect(result.services).toHaveProperty('analytics');

      expect(result.performance).toHaveProperty('response_time_ms');
      expect(result.performance).toHaveProperty('memory_usage');
    });

    it('数値フィールドが正しい型であること', async () => {
      // Reset mocks for this test
      vi.restoreAllMocks();
      vi.spyOn(process, 'uptime').mockReturnValue(123.456);
      vi.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 1024 * 1024 * 50,
        heapTotal: 1024 * 1024 * 30,
        heapUsed: 1024 * 1024 * 20,
        external: 1024 * 1024 * 5,
        arrayBuffers: 1024 * 1024 * 2,
      });

      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(typeof result.uptime).toBe('number');
      expect(typeof result.performance.response_time_ms).toBe('number');
      expect(typeof result.performance.memory_usage.rss).toBe('number');
      expect(typeof result.performance.memory_usage.heapTotal).toBe('number');
      expect(typeof result.performance.memory_usage.heapUsed).toBe('number');
      expect(typeof result.performance.memory_usage.external).toBe('number');
      expect(typeof result.performance.memory_usage.arrayBuffers).toBe('number');
    });

    it('文字列フィールドが正しい値を持つこと', async () => {
      // Reset mocks for this test
      vi.restoreAllMocks();
      vi.spyOn(process, 'uptime').mockReturnValue(123.456);
      vi.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 1024 * 1024 * 50,
        heapTotal: 1024 * 1024 * 30,
        heapUsed: 1024 * 1024 * 20,
        external: 1024 * 1024 * 5,
        arrayBuffers: 1024 * 1024 * 2,
      });

      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.status).toBe('healthy');
      expect(result.version).toBe('0.1.0');
      expect(typeof result.environment).toBe('string');
      expect(typeof result.timestamp).toBe('string');
    });
  });
});

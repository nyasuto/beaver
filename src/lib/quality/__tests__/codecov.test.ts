/**
 * @jest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getQualityMetrics,
  getCodecovConfig,
  makeCodecovRequest,
  CodecovAuthenticationError,
  CodecovRateLimitError,
  CodecovApiError,
  type CodecovConfig,
} from '../codecov';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Codecov API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up environment variables using vitest stubEnv
    vi.stubEnv('CODECOV_API_TOKEN', 'test-api-token');
    vi.stubEnv('GITHUB_OWNER', 'test-owner');
    vi.stubEnv('GITHUB_REPO', 'test-repo');
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe('getCodecovConfig', () => {
    it('should use API token when configured', () => {
      const config = getCodecovConfig();

      expect(config.apiToken).toBe('test-api-token');
      expect(config.owner).toBe('test-owner');
      expect(config.repo).toBe('test-repo');
    });

    it('should use default values when environment variables are not set', () => {
      vi.stubEnv('CODECOV_API_TOKEN', '');
      vi.stubEnv('GITHUB_OWNER', '');
      vi.stubEnv('GITHUB_REPO', '');

      const config = getCodecovConfig();

      expect(config.apiToken).toBeUndefined();
      expect(config.owner).toBe('nyasuto');
      expect(config.repo).toBe('beaver');
    });

    it('should warn when API token is not configured', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.stubEnv('CODECOV_API_TOKEN', '');

      getCodecovConfig();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('CODECOV_API_TOKEN is not configured')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('makeCodecovRequest', () => {
    const mockConfig: CodecovConfig = {
      apiToken: 'test-api-token',
      owner: 'test-owner',
      repo: 'test-repo',
      service: 'github',
      baseUrl: 'https://api.codecov.io',
    };

    it('should make successful API request', async () => {
      const mockData = { test: 'data' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map(),
        json: () => Promise.resolve(mockData),
      });

      const result = await makeCodecovRequest('test-endpoint', mockConfig);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockData);
      }
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.codecov.io/api/v2/github/test-owner/test-endpoint',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-token',
            'Content-Type': 'application/json',
            'User-Agent': 'Beaver-Astro/1.0 (Quality Dashboard)',
          }),
        })
      );
    });

    it('should throw CodecovAuthenticationError for 401 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Map(),
        text: () => Promise.resolve('Unauthorized'),
      });

      const result = await makeCodecovRequest('test-endpoint', mockConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(CodecovAuthenticationError);
        expect(result.error.message).toContain('Invalid or expired Codecov API token');
      }
    });

    it('should throw CodecovAuthenticationError for 403 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: new Map(),
        text: () => Promise.resolve('Forbidden'),
      });

      const result = await makeCodecovRequest('test-endpoint', mockConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(CodecovAuthenticationError);
        expect(result.error.message).toContain('access forbidden');
      }
    });

    it('should handle rate limiting with retry', async () => {
      const rateLimitResponse = {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Map([['retry-after', '1']]),
        text: () => Promise.resolve('Rate limited'),
      };

      const successResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map(),
        json: () => Promise.resolve({ test: 'data' }),
      };

      mockFetch.mockResolvedValueOnce(rateLimitResponse).mockResolvedValueOnce(successResponse);

      // Mock setTimeout to avoid actual delays in tests
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation((fn: () => void) => {
        fn();
        return 1 as any;
      });

      const result = await makeCodecovRequest('test-endpoint', mockConfig);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      setTimeoutSpy.mockRestore();
    });

    it('should throw CodecovRateLimitError after max retries', async () => {
      const rateLimitResponse = {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Map([['retry-after', '60']]),
        text: () => Promise.resolve('Rate limited'),
      };

      mockFetch.mockResolvedValue(rateLimitResponse);

      // Mock setTimeout to avoid actual delays in tests
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation((fn: () => void) => {
        fn();
        return 1 as any;
      });

      const result = await makeCodecovRequest('test-endpoint', mockConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(CodecovRateLimitError);
        expect(result.error.message).toContain('Rate limit exceeded');
      }
      expect(mockFetch).toHaveBeenCalledTimes(4); // Initial + 3 retries

      setTimeoutSpy.mockRestore();
    });

    it('should throw CodecovApiError for 404 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Map(),
        text: () => Promise.resolve('Repository not found'),
      });

      const result = await makeCodecovRequest('test-endpoint', mockConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(CodecovApiError);
        expect(result.error.message).toContain('Repository not found');
      }
    });

    it('should throw CodecovAuthenticationError when no token configured', async () => {
      const configWithoutToken = { ...mockConfig, apiToken: undefined };

      const result = await makeCodecovRequest('test-endpoint', configWithoutToken);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(CodecovAuthenticationError);
        expect(result.error.message).toContain('Codecov API token not configured');
      }
    });

    it('should retry on network errors', async () => {
      const networkError = new Error('Network error');
      const successResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map(),
        json: () => Promise.resolve({ test: 'data' }),
      };

      mockFetch.mockRejectedValueOnce(networkError).mockResolvedValueOnce(successResponse);

      // Mock setTimeout to avoid actual delays in tests
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation((fn: () => void) => {
        fn();
        return 1 as any;
      });

      const result = await makeCodecovRequest('test-endpoint', mockConfig);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      setTimeoutSpy.mockRestore();
    });
  });

  describe('getQualityMetrics', () => {
    it('should return sample data when no API token is configured', async () => {
      vi.stubEnv('CODECOV_API_TOKEN', '');

      const result = await getQualityMetrics();

      expect(result).toBeDefined();
      expect(result.overallCoverage).toBeTypeOf('number');
      expect(result.modules).toBeInstanceOf(Array);
      expect(result.modules.length).toBeGreaterThan(0);
    });

    it('should return sample data when API request fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await getQualityMetrics();

      expect(result).toBeDefined();
      expect(result.overallCoverage).toBeTypeOf('number');
      expect(result.modules).toBeInstanceOf(Array);
    });

    it('should process real Codecov data when API is successful', async () => {
      // Set up environment with API token
      vi.stubEnv('CODECOV_API_TOKEN', 'test-api-token');

      const mockCodecovData = {
        totals: {
          coverage: 85.5,
          lines: 1000,
          hits: 855,
          misses: 145,
          branches: 200,
        },
        files: [
          {
            name: 'src/lib/test.ts',
            totals: {
              coverage: 80,
              lines: 100,
              hits: 80,
              misses: 20,
            },
          },
        ],
      };

      const mockTrendsData = {
        results: [
          { date: '2025-01-01', coverage: 85 },
          { date: '2025-01-02', coverage: 86 },
        ],
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Map(),
          json: () => Promise.resolve(mockCodecovData),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Map(),
          json: () => Promise.resolve(mockTrendsData),
        });

      const result = await getQualityMetrics();

      // Should use real data when API token is configured and API is successful
      expect(result.overallCoverage).toBe(85.5);
      expect(result.totalLines).toBe(1000);
      expect(result.coveredLines).toBe(855);
      expect(result.missedLines).toBe(145);
      expect(result.history).toHaveLength(2);
    });
  });

  describe('Error Types', () => {
    it('should create CodecovAuthenticationError with correct properties', () => {
      const error = new CodecovAuthenticationError('Test auth error', 401);

      expect(error.name).toBe('CodecovAuthenticationError');
      expect(error.message).toBe('Test auth error');
      expect(error.statusCode).toBe(401);
      expect(error).toBeInstanceOf(Error);
    });

    it('should create CodecovRateLimitError with correct properties', () => {
      const error = new CodecovRateLimitError('Test rate limit error', 60);

      expect(error.name).toBe('CodecovRateLimitError');
      expect(error.message).toBe('Test rate limit error');
      expect(error.retryAfter).toBe(60);
      expect(error).toBeInstanceOf(Error);
    });

    it('should create CodecovApiError with correct properties', () => {
      const error = new CodecovApiError('Test API error', 500, 'Internal server error');

      expect(error.name).toBe('CodecovApiError');
      expect(error.message).toBe('Test API error');
      expect(error.statusCode).toBe(500);
      expect(error.response).toBe('Internal server error');
      expect(error).toBeInstanceOf(Error);
    });
  });
});

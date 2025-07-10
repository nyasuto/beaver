/**
 * GitHub Health API Endpoint Test Suite
 *
 * Issue #99 - API endpoints comprehensive test implementation
 * 90%+ statement coverage, 85%+ branch coverage, 100% function coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../health';

// Mock the GitHub services
vi.mock('../../../../lib/github', () => ({
  createGitHubServicesFromEnv: vi.fn(),
}));

describe('GitHub Health API Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.error to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createMockAPIContext = () => {
    const url = new URL('http://localhost:3000/api/github/health');
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
      originPathname: '/api/github/health',
      getActionResult: () => undefined,
      callAction: () => Promise.resolve(undefined),
      isPrerendered: false,
      routeData: undefined,
    } as any;
  };

  const mockUserData = {
    login: 'testuser',
    id: 12345,
    type: 'User',
    plan: { name: 'free' },
  };

  const mockRateLimitData = {
    rate: {
      limit: 5000,
      remaining: 4500,
      reset: Math.floor(Date.now() / 1000) + 3600,
      used: 500,
    },
  };

  const mockRepositoryData = {
    full_name: 'test/repo',
    private: false,
    has_issues: true,
    permissions: { admin: true, push: true, pull: true },
  };

  describe('成功ケース', () => {
    it('全てのヘルスチェックが成功する場合', async () => {
      const { createGitHubServicesFromEnv } = await import('../../../../lib/github');

      vi.mocked(createGitHubServicesFromEnv).mockResolvedValue({
        success: true,
        data: {
          client: {
            testConnection: vi.fn().mockResolvedValue({
              success: true,
              data: { user: mockUserData },
            }),
            getRateLimit: vi.fn().mockResolvedValue({
              success: true,
              data: mockRateLimitData,
            }),
          },
          repository: {
            getRepository: vi.fn().mockResolvedValue({
              success: true,
              data: mockRepositoryData,
            }),
          },
        },
      } as any);

      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.status).toBe('healthy');
      expect(result.health_score).toBe(100);

      expect(result.checks.configuration).toBe(true);
      expect(result.checks.authentication).toBe(true);
      expect(result.checks.rate_limit).toBe(true);
      expect(result.checks.repository_access).toBe(true);

      expect(result.data.authenticated_user).toEqual({
        login: mockUserData.login,
        id: mockUserData.id,
        type: mockUserData.type,
        plan: mockUserData.plan,
      });

      expect(result.data.rate_limit).toEqual({
        limit: mockRateLimitData.rate.limit,
        remaining: mockRateLimitData.rate.remaining,
        reset: new Date(mockRateLimitData.rate.reset * 1000).toISOString(),
        used: mockRateLimitData.rate.used,
      });

      expect(result.data.repository).toEqual({
        name: mockRepositoryData.full_name,
        private: mockRepositoryData.private,
        has_issues: mockRepositoryData.has_issues,
        permissions: mockRepositoryData.permissions,
      });

      expect(result.meta.checked_at).toBeDefined();
      expect(result.meta.github_api_version).toBe('2022-11-28');
      expect(result.meta.user_agent).toBe('beaver-astro/1.0.0');
      expect(result.errors).toBeUndefined();
    });

    it('一部のチェックが失敗した場合は degraded ステータスを返すこと', async () => {
      const { createGitHubServicesFromEnv } = await import('../../../../lib/github');

      vi.mocked(createGitHubServicesFromEnv).mockResolvedValue({
        success: true,
        data: {
          client: {
            testConnection: vi.fn().mockResolvedValue({
              success: true,
              data: { user: mockUserData },
            }),
            getRateLimit: vi.fn().mockResolvedValue({
              success: false,
              error: { message: 'Rate limit API unavailable' },
            }),
          },
          repository: {
            getRepository: vi.fn().mockResolvedValue({
              success: true,
              data: mockRepositoryData,
            }),
          },
        },
      } as any);

      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(503);
      expect(result.success).toBe(true);
      expect(result.status).toBe('degraded');
      expect(result.health_score).toBe(75); // 3/4 checks pass

      expect(result.checks.configuration).toBe(true);
      expect(result.checks.authentication).toBe(true);
      expect(result.checks.rate_limit).toBe(false);
      expect(result.checks.repository_access).toBe(true);

      expect(result.errors).toContain('Rate limit check failed: Rate limit API unavailable');
    });

    it('認証が失敗した場合の処理', async () => {
      const { createGitHubServicesFromEnv } = await import('../../../../lib/github');

      vi.mocked(createGitHubServicesFromEnv).mockResolvedValue({
        success: true,
        data: {
          client: {
            testConnection: vi.fn().mockResolvedValue({
              success: false,
              error: { message: 'Invalid token' },
            }),
            getRateLimit: vi.fn().mockResolvedValue({
              success: true,
              data: mockRateLimitData,
            }),
          },
          repository: {
            getRepository: vi.fn().mockResolvedValue({
              success: false,
              error: { message: 'Unauthorized' },
            }),
          },
        },
      } as any);

      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(503);
      expect(result.success).toBe(true);
      expect(result.status).toBe('degraded');
      expect(result.health_score).toBe(50); // 2/4 checks pass

      expect(result.checks.authentication).toBe(false);
      expect(result.checks.repository_access).toBe(false);
      expect(result.data.authenticated_user).toBeNull();
      expect(result.data.repository).toBeNull();

      expect(result.errors).toContain('Authentication failed: Invalid token');
      expect(result.errors).toContain('Repository access failed: Unauthorized');
    });
  });

  describe('エラーハンドリング', () => {
    it('GitHub設定エラーを適切に処理すること', async () => {
      const { createGitHubServicesFromEnv } = await import('../../../../lib/github');

      vi.mocked(createGitHubServicesFromEnv).mockResolvedValue({
        success: false,
        error: { message: 'Invalid GitHub configuration' },
      } as any);

      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.status).toBe('configuration_error');
      expect(result.error.code).toBe('GITHUB_CONFIG_ERROR');
      expect(result.error.message).toBe('GitHub API configuration error');
      expect(result.error.details).toBe('Invalid GitHub configuration');

      expect(result.checks.configuration).toBe(false);
      expect(result.checks.authentication).toBe(false);
      expect(result.checks.rate_limit).toBe(false);
      expect(result.checks.repository_access).toBe(false);
    });

    it('認証テストで例外が発生した場合の処理', async () => {
      const { createGitHubServicesFromEnv } = await import('../../../../lib/github');

      vi.mocked(createGitHubServicesFromEnv).mockResolvedValue({
        success: true,
        data: {
          client: {
            testConnection: vi.fn().mockRejectedValue(new Error('Network error')),
            getRateLimit: vi.fn().mockResolvedValue({
              success: true,
              data: mockRateLimitData,
            }),
          },
          repository: {
            getRepository: vi.fn().mockResolvedValue({
              success: true,
              data: mockRepositoryData,
            }),
          },
        },
      } as any);

      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(503);
      expect(result.checks.authentication).toBe(false);
      expect(result.errors).toContain('Authentication test error: Network error');
    });

    it('レート制限テストで例外が発生した場合の処理', async () => {
      const { createGitHubServicesFromEnv } = await import('../../../../lib/github');

      vi.mocked(createGitHubServicesFromEnv).mockResolvedValue({
        success: true,
        data: {
          client: {
            testConnection: vi.fn().mockResolvedValue({
              success: true,
              data: { user: mockUserData },
            }),
            getRateLimit: vi.fn().mockRejectedValue(new Error('Rate limit API error')),
          },
          repository: {
            getRepository: vi.fn().mockResolvedValue({
              success: true,
              data: mockRepositoryData,
            }),
          },
        },
      } as any);

      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(503);
      expect(result.checks.rate_limit).toBe(false);
      expect(result.errors).toContain('Rate limit test error: Rate limit API error');
    });

    it('リポジトリテストで例外が発生した場合の処理', async () => {
      const { createGitHubServicesFromEnv } = await import('../../../../lib/github');

      vi.mocked(createGitHubServicesFromEnv).mockResolvedValue({
        success: true,
        data: {
          client: {
            testConnection: vi.fn().mockResolvedValue({
              success: true,
              data: { user: mockUserData },
            }),
            getRateLimit: vi.fn().mockResolvedValue({
              success: true,
              data: mockRateLimitData,
            }),
          },
          repository: {
            getRepository: vi.fn().mockRejectedValue(new Error('Repository API error')),
          },
        },
      } as any);

      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(503);
      expect(result.checks.repository_access).toBe(false);
      expect(result.errors).toContain('Repository test error: Repository API error');
    });

    it('予期しない例外を適切に処理すること', async () => {
      const { createGitHubServicesFromEnv } = await import('../../../../lib/github');

      vi.mocked(createGitHubServicesFromEnv).mockRejectedValue(new Error('Unexpected error'));

      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.status).toBe('error');
      expect(result.health_score).toBe(0);
      expect(result.error.code).toBe('HEALTH_CHECK_ERROR');
      expect(result.error.message).toBe('Unexpected error');

      expect(result.checks.configuration).toBe(false);
      expect(result.checks.authentication).toBe(false);
      expect(result.checks.rate_limit).toBe(false);
      expect(result.checks.repository_access).toBe(false);
    });
  });

  describe('ヘルススコア計算', () => {
    it('全チェック成功時にスコア100を返すこと', async () => {
      const { createGitHubServicesFromEnv } = await import('../../../../lib/github');

      vi.mocked(createGitHubServicesFromEnv).mockResolvedValue({
        success: true,
        data: {
          client: {
            testConnection: vi.fn().mockResolvedValue({
              success: true,
              data: { user: mockUserData },
            }),
            getRateLimit: vi.fn().mockResolvedValue({
              success: true,
              data: mockRateLimitData,
            }),
          },
          repository: {
            getRepository: vi.fn().mockResolvedValue({
              success: true,
              data: mockRepositoryData,
            }),
          },
        },
      } as any);

      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.health_score).toBe(100);
    });

    it('半分のチェック成功時にスコア50を返すこと', async () => {
      const { createGitHubServicesFromEnv } = await import('../../../../lib/github');

      vi.mocked(createGitHubServicesFromEnv).mockResolvedValue({
        success: true,
        data: {
          client: {
            testConnection: vi.fn().mockResolvedValue({
              success: true,
              data: { user: mockUserData },
            }),
            getRateLimit: vi.fn().mockResolvedValue({
              success: false,
              error: { message: 'Error' },
            }),
          },
          repository: {
            getRepository: vi.fn().mockResolvedValue({
              success: false,
              error: { message: 'Error' },
            }),
          },
        },
      } as any);

      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.health_score).toBe(50); // 2/4 checks passed
    });

    it('全チェック失敗時にスコア25を返すこと', async () => {
      const { createGitHubServicesFromEnv } = await import('../../../../lib/github');

      vi.mocked(createGitHubServicesFromEnv).mockResolvedValue({
        success: true,
        data: {
          client: {
            testConnection: vi.fn().mockResolvedValue({
              success: false,
              error: { message: 'Error' },
            }),
            getRateLimit: vi.fn().mockResolvedValue({
              success: false,
              error: { message: 'Error' },
            }),
          },
          repository: {
            getRepository: vi.fn().mockResolvedValue({
              success: false,
              error: { message: 'Error' },
            }),
          },
        },
      } as any);

      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.health_score).toBe(25); // 1/4 checks passed (configuration)
    });
  });

  describe('レスポンス形式', () => {
    it('正しいレスポンスヘッダーが設定されること', async () => {
      const { createGitHubServicesFromEnv } = await import('../../../../lib/github');

      vi.mocked(createGitHubServicesFromEnv).mockResolvedValue({
        success: true,
        data: {
          client: {
            testConnection: vi.fn().mockResolvedValue({
              success: true,
              data: { user: mockUserData },
            }),
            getRateLimit: vi.fn().mockResolvedValue({
              success: true,
              data: mockRateLimitData,
            }),
          },
          repository: {
            getRepository: vi.fn().mockResolvedValue({
              success: true,
              data: mockRepositoryData,
            }),
          },
        },
      } as any);

      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);

      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
    });

    it('エラー時も正しいヘッダーが設定されること', async () => {
      const { createGitHubServicesFromEnv } = await import('../../../../lib/github');

      vi.mocked(createGitHubServicesFromEnv).mockRejectedValue(new Error('Test error'));

      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);

      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('開発環境でエラーログが出力されること', async () => {
      // Store original NODE_ENV
      const originalEnv = process.env['NODE_ENV'];
      process.env['NODE_ENV'] = 'development';

      const { createGitHubServicesFromEnv } = await import('../../../../lib/github');
      vi.mocked(createGitHubServicesFromEnv).mockRejectedValue(new Error('Test error'));

      const consoleSpy = vi.spyOn(console, 'error');

      const apiContext = createMockAPIContext();
      await GET(apiContext);

      expect(consoleSpy).toHaveBeenCalledWith('GitHub Health Check Error:', expect.any(Error));

      // Restore original NODE_ENV
      process.env['NODE_ENV'] = originalEnv;
    });
  });

  describe('エラーなしケース', () => {
    it('エラーが発生しない場合はerrorsプロパティが未定義であること', async () => {
      const { createGitHubServicesFromEnv } = await import('../../../../lib/github');

      vi.mocked(createGitHubServicesFromEnv).mockResolvedValue({
        success: true,
        data: {
          client: {
            testConnection: vi.fn().mockResolvedValue({
              success: true,
              data: { user: mockUserData },
            }),
            getRateLimit: vi.fn().mockResolvedValue({
              success: true,
              data: mockRateLimitData,
            }),
          },
          repository: {
            getRepository: vi.fn().mockResolvedValue({
              success: true,
              data: mockRepositoryData,
            }),
          },
        },
      } as any);

      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.errors).toBeUndefined();
    });
  });
});

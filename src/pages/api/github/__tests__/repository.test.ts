/**
 * GitHub Repository API Endpoint Test Suite
 *
 * Issue #99 - API endpoints comprehensive test implementation
 * 90%+ statement coverage, 85%+ branch coverage, 100% function coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../repository';

// Mock the GitHub services
vi.mock('../../../../lib/github', () => ({
  createGitHubServicesFromEnv: vi.fn(),
}));

describe('GitHub Repository API Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createMockAPIContext = (queryParams: Record<string, string> = {}) => {
    const url = new URL('http://localhost:3000/api/github/repository');
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
      originPathname: '/api/github/repository',
      getActionResult: () => undefined,
      callAction: () => Promise.resolve(undefined),
      isPrerendered: false,
      routeData: undefined,
    } as any;
  };

  const mockRepositoryData = {
    id: 123,
    full_name: 'test/repo',
    name: 'repo',
    description: 'Test repository description',
    private: false,
    size: 1000,
    license: { key: 'mit', name: 'MIT License' },
    topics: ['javascript', 'testing'],
    updated_at: new Date().toISOString(),
    has_issues: true,
    has_wiki: true,
    open_issues_count: 5,
    stargazers_count: 10,
    forks_count: 2,
    watchers_count: 8,
    permissions: { admin: true, push: true, pull: true },
  };

  describe('成功ケース', () => {
    it('基本的なリポジトリ情報を取得できること', async () => {
      const { createGitHubServicesFromEnv } = await import('../../../../lib/github');

      vi.mocked(createGitHubServicesFromEnv).mockResolvedValue({
        success: true,
        data: {
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
      expect(result.data.repository).toEqual(mockRepositoryData);
      expect(result.data.metrics).toBeDefined();
      expect(result.data.metrics.health_score).toBeGreaterThanOrEqual(0);
      expect(result.data.metrics.activity_level).toMatch(/^(low|medium|high)$/);
      expect(result.data.metrics.popularity_score).toBeGreaterThanOrEqual(0);
    });

    it('統計情報を含むリポジトリ情報を取得できること', async () => {
      const { createGitHubServicesFromEnv } = await import('../../../../lib/github');

      const mockStats = { total_commits: 100, contributors: 5 };

      vi.mocked(createGitHubServicesFromEnv).mockResolvedValue({
        success: true,
        data: {
          repository: {
            getRepository: vi.fn().mockResolvedValue({
              success: true,
              data: mockRepositoryData,
            }),
            getRepositoryStats: vi.fn().mockResolvedValue({
              success: true,
              data: mockStats,
            }),
          },
        },
      } as any);

      const apiContext = createMockAPIContext({ include_stats: 'true' });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.stats).toEqual(mockStats);
    });

    it('言語情報を含むリポジトリ情報を取得できること', async () => {
      const { createGitHubServicesFromEnv } = await import('../../../../lib/github');

      const mockLanguages = { JavaScript: 75, TypeScript: 25 };

      vi.mocked(createGitHubServicesFromEnv).mockResolvedValue({
        success: true,
        data: {
          repository: {
            getRepository: vi.fn().mockResolvedValue({
              success: true,
              data: mockRepositoryData,
            }),
            getLanguages: vi.fn().mockResolvedValue({
              success: true,
              data: mockLanguages,
            }),
          },
        },
      } as any);

      const apiContext = createMockAPIContext({ include_languages: 'true' });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.languages).toEqual(mockLanguages);
    });

    it('コミット情報を含むリポジトリ情報を取得できること', async () => {
      const { createGitHubServicesFromEnv } = await import('../../../../lib/github');

      const mockCommits = [
        { sha: 'abc123', message: 'Initial commit', author: { name: 'Test User' } },
      ];

      vi.mocked(createGitHubServicesFromEnv).mockResolvedValue({
        success: true,
        data: {
          repository: {
            getRepository: vi.fn().mockResolvedValue({
              success: true,
              data: mockRepositoryData,
            }),
            getCommits: vi.fn().mockResolvedValue({
              success: true,
              data: mockCommits,
            }),
          },
        },
      } as any);

      const apiContext = createMockAPIContext({ include_commits: 'true', commits_limit: '5' });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.commits).toEqual(mockCommits);
    });

    it('コントリビューター情報を含むリポジトリ情報を取得できること', async () => {
      const { createGitHubServicesFromEnv } = await import('../../../../lib/github');

      const mockContributors = [
        { login: 'user1', contributions: 50 },
        { login: 'user2', contributions: 30 },
      ];

      vi.mocked(createGitHubServicesFromEnv).mockResolvedValue({
        success: true,
        data: {
          repository: {
            getRepository: vi.fn().mockResolvedValue({
              success: true,
              data: mockRepositoryData,
            }),
            getContributors: vi.fn().mockResolvedValue({
              success: true,
              data: mockContributors,
            }),
          },
        },
      } as any);

      const apiContext = createMockAPIContext({ include_contributors: 'true' });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.contributors).toEqual(mockContributors);
    });

    it('全ての追加情報を含むリポジトリ情報を取得できること', async () => {
      const { createGitHubServicesFromEnv } = await import('../../../../lib/github');

      vi.mocked(createGitHubServicesFromEnv).mockResolvedValue({
        success: true,
        data: {
          repository: {
            getRepository: vi.fn().mockResolvedValue({
              success: true,
              data: mockRepositoryData,
            }),
            getRepositoryStats: vi.fn().mockResolvedValue({
              success: true,
              data: { total_commits: 100 },
            }),
            getLanguages: vi.fn().mockResolvedValue({
              success: true,
              data: { JavaScript: 100 },
            }),
            getCommits: vi.fn().mockResolvedValue({
              success: true,
              data: [{ sha: 'abc123' }],
            }),
            getContributors: vi.fn().mockResolvedValue({
              success: true,
              data: [{ login: 'user1' }],
            }),
          },
        },
      } as any);

      const apiContext = createMockAPIContext({
        include_stats: 'true',
        include_languages: 'true',
        include_commits: 'true',
        include_contributors: 'true',
      });

      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.stats).toBeDefined();
      expect(result.data.languages).toBeDefined();
      expect(result.data.commits).toBeDefined();
      expect(result.data.contributors).toBeDefined();
    });
  });

  describe('エラーハンドリング', () => {
    it('GitHub設定エラーを適切に処理すること', async () => {
      const { createGitHubServicesFromEnv } = await import('../../../../lib/github');

      vi.mocked(createGitHubServicesFromEnv).mockResolvedValue({
        success: false,
        error: { message: 'Invalid GitHub token' },
      } as any);

      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('GITHUB_CONFIG_ERROR');
      expect(result.error.message).toBe('GitHub API configuration error');
    });

    it('リポジトリアクセスエラーを適切に処理すること', async () => {
      const { createGitHubServicesFromEnv } = await import('../../../../lib/github');

      vi.mocked(createGitHubServicesFromEnv).mockResolvedValue({
        success: true,
        data: {
          repository: {
            getRepository: vi.fn().mockResolvedValue({
              success: false,
              error: { message: 'Repository not found', status: 404, code: 'NOT_FOUND' },
            }),
          },
        },
      } as any);

      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('NOT_FOUND');
      expect(result.error.message).toBe('Repository not found');
    });

    it('バリデーションエラーを適切に処理すること', async () => {
      const apiContext = createMockAPIContext({ commits_limit: 'invalid' });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });

    it('予期しない例外を適切に処理すること', async () => {
      const { createGitHubServicesFromEnv } = await import('../../../../lib/github');

      vi.mocked(createGitHubServicesFromEnv).mockRejectedValue(new Error('Unexpected error'));

      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toBe('Unexpected error');
    });

    it('追加データの取得失敗を適切に処理すること', async () => {
      const { createGitHubServicesFromEnv } = await import('../../../../lib/github');

      vi.mocked(createGitHubServicesFromEnv).mockResolvedValue({
        success: true,
        data: {
          repository: {
            getRepository: vi.fn().mockResolvedValue({
              success: true,
              data: mockRepositoryData,
            }),
            getLanguages: vi.fn().mockResolvedValue({
              success: false,
              error: { message: 'Languages API error' },
            }),
          },
        },
      } as any);

      const apiContext = createMockAPIContext({ include_languages: 'true' });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.languages_error).toBe('Languages API error');
      expect(result.data.languages).toBeUndefined();
    });
  });

  describe('ヘルススコア計算', () => {
    it('完全なリポジトリのヘルススコアが高いこと', async () => {
      const { createGitHubServicesFromEnv } = await import('../../../../lib/github');

      const perfectRepo = {
        ...mockRepositoryData,
        description: 'A comprehensive test repository',
        size: 1000,
        license: { key: 'mit' },
        topics: ['javascript', 'testing', 'automation'],
        updated_at: new Date().toISOString(),
        has_issues: true,
        has_wiki: true,
        open_issues_count: 3,
        stargazers_count: 50,
      };

      vi.mocked(createGitHubServicesFromEnv).mockResolvedValue({
        success: true,
        data: {
          repository: {
            getRepository: vi.fn().mockResolvedValue({
              success: true,
              data: perfectRepo,
            }),
          },
        },
      } as any);

      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.data.metrics.health_score).toBeGreaterThan(80);
    });

    it('基本的なリポジトリのヘルススコアが中程度であること', async () => {
      const { createGitHubServicesFromEnv } = await import('../../../../lib/github');

      const basicRepo = {
        ...mockRepositoryData,
        description: '',
        size: 0,
        license: null,
        topics: [],
        updated_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
        has_issues: false,
        has_wiki: false,
        open_issues_count: 0,
        stargazers_count: 0,
      };

      vi.mocked(createGitHubServicesFromEnv).mockResolvedValue({
        success: true,
        data: {
          repository: {
            getRepository: vi.fn().mockResolvedValue({
              success: true,
              data: basicRepo,
            }),
          },
        },
      } as any);

      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.data.metrics.health_score).toBeLessThan(30);
    });
  });

  describe('アクティビティレベル計算', () => {
    it('最近更新されたリポジトリのアクティビティレベルが高いこと', async () => {
      const { createGitHubServicesFromEnv } = await import('../../../../lib/github');

      const activeRepo = {
        ...mockRepositoryData,
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        stargazers_count: 20,
        open_issues_count: 5,
      };

      vi.mocked(createGitHubServicesFromEnv).mockResolvedValue({
        success: true,
        data: {
          repository: {
            getRepository: vi.fn().mockResolvedValue({
              success: true,
              data: activeRepo,
            }),
          },
        },
      } as any);

      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.data.metrics.activity_level).toBe('high');
    });

    it('古いリポジトリのアクティビティレベルが低いこと', async () => {
      const { createGitHubServicesFromEnv } = await import('../../../../lib/github');

      const inactiveRepo = {
        ...mockRepositoryData,
        updated_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year ago
        stargazers_count: 0,
        open_issues_count: 0,
      };

      vi.mocked(createGitHubServicesFromEnv).mockResolvedValue({
        success: true,
        data: {
          repository: {
            getRepository: vi.fn().mockResolvedValue({
              success: true,
              data: inactiveRepo,
            }),
          },
        },
      } as any);

      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.data.metrics.activity_level).toBe('low');
    });
  });

  describe('人気度スコア計算', () => {
    it('スター・フォーク・ウォッチャーの多いリポジトリの人気度が高いこと', async () => {
      const { createGitHubServicesFromEnv } = await import('../../../../lib/github');

      const popularRepo = {
        ...mockRepositoryData,
        stargazers_count: 100,
        forks_count: 50,
        watchers_count: 80,
      };

      vi.mocked(createGitHubServicesFromEnv).mockResolvedValue({
        success: true,
        data: {
          repository: {
            getRepository: vi.fn().mockResolvedValue({
              success: true,
              data: popularRepo,
            }),
          },
        },
      } as any);

      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.data.metrics.popularity_score).toBeGreaterThan(100);
    });
  });

  describe('レスポンス形式', () => {
    it('正しいレスポンスヘッダーが設定されること', async () => {
      const { createGitHubServicesFromEnv } = await import('../../../../lib/github');

      vi.mocked(createGitHubServicesFromEnv).mockResolvedValue({
        success: true,
        data: {
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
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=600');
    });

    it('メタ情報が正しく設定されること', async () => {
      const { createGitHubServicesFromEnv } = await import('../../../../lib/github');

      vi.mocked(createGitHubServicesFromEnv).mockResolvedValue({
        success: true,
        data: {
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

      expect(result.meta.source).toBe('github_api');
      expect(result.meta.generated_at).toBeDefined();
      expect(result.meta.cache_expires_at).toBeDefined();
      expect(result.meta.query).toBeDefined();
    });
  });
});

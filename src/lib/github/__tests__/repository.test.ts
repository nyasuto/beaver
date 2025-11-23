/**
 * GitHub Repository Service Tests
 *
 * Issue #100 - GitHub統合サービスのテスト改善
 * repository.ts: 0% → 90%+ カバレージ目標
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitHubRepositoryService, type Repository, type Commit } from '../repository';
import { GitHubClient } from '../client';

// Mock Octokit
const mockOctokit = {
  rest: {
    repos: {
      get: vi.fn(),
      listCommits: vi.fn(),
      getCommit: vi.fn(),
      listLanguages: vi.fn(),
      listContributors: vi.fn(),
      getAllTopics: vi.fn(),
      getCodeFrequencyStats: vi.fn(),
      getCommitActivityStats: vi.fn(),
      getParticipationStats: vi.fn(),
    },
  },
};

// Mock GitHubClient
vi.mock('../client', () => ({
  GitHubClient: vi.fn().mockImplementation(() => ({
    getConfig: vi.fn().mockReturnValue({
      owner: 'test-owner',
      repo: 'test-repo',
      token: 'test-token',
      baseUrl: 'https://api.github.com',
      userAgent: 'beaver-astro/1.0.0',
    }),
    getOctokit: vi.fn().mockReturnValue(mockOctokit),
  })),
  GitHubError: class GitHubError extends Error {
    constructor(
      message: string,
      public status?: number,
      public code?: string
    ) {
      super(message);
      this.name = 'GitHubError';
    }
  },
}));

// TODO: Fix for vitest v4 - Octokit mocking issues
describe.skip('GitHubRepositoryService', () => {
  let service: GitHubRepositoryService;
  let mockClient: GitHubClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = new GitHubClient({
      owner: 'test-owner',
      repo: 'test-repo',
      token: 'test-token',
      baseUrl: 'https://api.github.com',
      userAgent: 'beaver-astro/1.0.0',
    });
    service = new GitHubRepositoryService(mockClient);
  });

  const mockRepositoryData: Repository = {
    id: 123456,
    node_id: 'R_test123',
    name: 'test-repo',
    full_name: 'test-owner/test-repo',
    owner: {
      login: 'test-owner',
      id: 12345,
      node_id: 'U_test',
      avatar_url: 'https://avatar.test.com',
      gravatar_id: '',
      url: 'https://api.github.com/users/test-owner',
      html_url: 'https://github.com/test-owner',
      // Note: These URLs are part of the GitHub API response but not in our type definition
      type: 'User',
      site_admin: false,
    },
    private: false,
    html_url: 'https://github.com/test-owner/test-repo',
    description: 'A test repository for testing purposes',
    fork: false,
    url: 'https://api.github.com/repos/test-owner/test-repo',
    archive_url: 'https://api.github.com/repos/test-owner/test-repo/{archive_format}{/ref}',
    assignees_url: 'https://api.github.com/repos/test-owner/test-repo/assignees{/user}',
    blobs_url: 'https://api.github.com/repos/test-owner/test-repo/git/blobs{/sha}',
    branches_url: 'https://api.github.com/repos/test-owner/test-repo/branches{/branch}',
    collaborators_url:
      'https://api.github.com/repos/test-owner/test-repo/collaborators{/collaborator}',
    comments_url: 'https://api.github.com/repos/test-owner/test-repo/comments{/number}',
    commits_url: 'https://api.github.com/repos/test-owner/test-repo/commits{/sha}',
    compare_url: 'https://api.github.com/repos/test-owner/test-repo/compare/{base}...{head}',
    contents_url: 'https://api.github.com/repos/test-owner/test-repo/contents/{+path}',
    contributors_url: 'https://api.github.com/repos/test-owner/test-repo/contributors',
    deployments_url: 'https://api.github.com/repos/test-owner/test-repo/deployments',
    downloads_url: 'https://api.github.com/repos/test-owner/test-repo/downloads',
    events_url: 'https://api.github.com/repos/test-owner/test-repo/events',
    forks_url: 'https://api.github.com/repos/test-owner/test-repo/forks',
    git_commits_url: 'https://api.github.com/repos/test-owner/test-repo/git/commits{/sha}',
    git_refs_url: 'https://api.github.com/repos/test-owner/test-repo/git/refs{/sha}',
    git_tags_url: 'https://api.github.com/repos/test-owner/test-repo/git/tags{/sha}',
    git_url: 'git://github.com/test-owner/test-repo.git',
    issue_comment_url: 'https://api.github.com/repos/test-owner/test-repo/issues/comments{/number}',
    issue_events_url: 'https://api.github.com/repos/test-owner/test-repo/issues/events{/number}',
    issues_url: 'https://api.github.com/repos/test-owner/test-repo/issues{/number}',
    keys_url: 'https://api.github.com/repos/test-owner/test-repo/keys{/key_id}',
    labels_url: 'https://api.github.com/repos/test-owner/test-repo/labels{/name}',
    languages_url: 'https://api.github.com/repos/test-owner/test-repo/languages',
    merges_url: 'https://api.github.com/repos/test-owner/test-repo/merges',
    milestones_url: 'https://api.github.com/repos/test-owner/test-repo/milestones{/number}',
    notifications_url:
      'https://api.github.com/repos/test-owner/test-repo/notifications{?since,all,participating}',
    pulls_url: 'https://api.github.com/repos/test-owner/test-repo/pulls{/number}',
    releases_url: 'https://api.github.com/repos/test-owner/test-repo/releases{/id}',
    ssh_url: 'git@github.com:test-owner/test-repo.git',
    stargazers_url: 'https://api.github.com/repos/test-owner/test-repo/stargazers',
    statuses_url: 'https://api.github.com/repos/test-owner/test-repo/statuses/{sha}',
    subscribers_url: 'https://api.github.com/repos/test-owner/test-repo/subscribers',
    subscription_url: 'https://api.github.com/repos/test-owner/test-repo/subscription',
    tags_url: 'https://api.github.com/repos/test-owner/test-repo/tags',
    teams_url: 'https://api.github.com/repos/test-owner/test-repo/teams',
    trees_url: 'https://api.github.com/repos/test-owner/test-repo/git/trees{/sha}',
    clone_url: 'https://github.com/test-owner/test-repo.git',
    mirror_url: null,
    hooks_url: 'https://api.github.com/repos/test-owner/test-repo/hooks',
    svn_url: 'https://github.com/test-owner/test-repo',
    homepage: 'https://test-repo.example.com',
    language: 'TypeScript',
    forks_count: 5,
    stargazers_count: 42,
    watchers_count: 42,
    size: 1024,
    default_branch: 'main',
    open_issues_count: 3,
    // Add missing required properties
    open_issues: 3,
    forks: 5,
    watchers: 42,
    is_template: false,
    topics: ['javascript', 'typescript', 'testing'],
    has_issues: true,
    has_projects: true,
    has_wiki: true,
    has_pages: false,
    has_downloads: true,
    archived: false,
    disabled: false,
    visibility: 'public',
    pushed_at: '2024-01-15T10:30:00Z',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2024-01-15T10:30:00Z',
    permissions: {
      admin: true,
      maintain: true,
      push: true,
      triage: true,
      pull: true,
    },
    allow_rebase_merge: true,
    template_repository: null,
    temp_clone_token: undefined,
    allow_squash_merge: true,
    allow_auto_merge: false,
    delete_branch_on_merge: true,
    // Note: Some GitHub API fields are not included in our type definitions
  };

  const mockCommitData: Commit = {
    sha: 'abc123def456',
    node_id: 'C_test',
    commit: {
      author: {
        name: 'Test Author',
        email: 'test@example.com',
        date: '2024-01-15T10:30:00Z',
      },
      committer: {
        name: 'Test Committer',
        email: 'committer@example.com',
        date: '2024-01-15T10:30:00Z',
      },
      message: 'feat: add new feature\n\nDetailed description of the feature',
      tree: {
        sha: 'tree123abc',
        url: 'https://api.github.com/repos/test-owner/test-repo/git/trees/tree123abc',
      },
      url: 'https://api.github.com/repos/test-owner/test-repo/git/commits/abc123def456',
      comment_count: 0,
      verification: {
        verified: false,
        reason: 'unsigned',
        signature: null,
        payload: null,
      },
    },
    url: 'https://api.github.com/repos/test-owner/test-repo/commits/abc123def456',
    html_url: 'https://github.com/test-owner/test-repo/commit/abc123def456',
    comments_url: 'https://api.github.com/repos/test-owner/test-repo/commits/abc123def456/comments',
    author: {
      login: 'test-author',
      id: 67890,
      node_id: 'U_author',
      avatar_url: 'https://avatar.test.com/author',
      gravatar_id: '',
      url: 'https://api.github.com/users/test-author',
      html_url: 'https://github.com/test-author',
      // Note: These URLs are part of the GitHub API response but not in our type definition
      type: 'User',
      site_admin: false,
    },
    committer: {
      login: 'test-committer',
      id: 67891,
      node_id: 'U_committer',
      avatar_url: 'https://avatar.test.com/committer',
      gravatar_id: '',
      url: 'https://api.github.com/users/test-committer',
      html_url: 'https://github.com/test-committer',
      // Note: These URLs are part of the GitHub API response but not in our type definition
      type: 'User',
      site_admin: false,
    },
    parents: [
      {
        sha: 'parent123abc',
        url: 'https://api.github.com/repos/test-owner/test-repo/commits/parent123abc',
        html_url: 'https://github.com/test-owner/test-repo/commit/parent123abc',
      },
    ],
    // Note: stats and files fields are not in our Commit type definition
  };

  const mockLanguagesData = {
    TypeScript: 50000,
    JavaScript: 30000,
    CSS: 15000,
    HTML: 5000,
  };

  describe('getRepository', () => {
    it('リポジトリ情報を正常に取得できること', async () => {
      mockOctokit.rest.repos.get.mockResolvedValue({
        data: mockRepositoryData,
      });

      const result = await service.getRepository();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockRepositoryData);
        expect(result.data.name).toBe('test-repo');
        expect(result.data.full_name).toBe('test-owner/test-repo');
        expect(result.data.owner.login).toBe('test-owner');
      }

      expect(mockOctokit.rest.repos.get).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
      });
    });

    it('API エラーを適切に処理すること', async () => {
      const mockError = new Error('Repository not found');
      mockError.name = 'RequestError';
      (mockError as any).status = 404;

      mockOctokit.rest.repos.get.mockRejectedValue(mockError);

      const result = await service.getRepository();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to fetch repository information');
      }
    });

    it('無効なレスポンスデータを適切に処理すること', async () => {
      mockOctokit.rest.repos.get.mockResolvedValue({
        data: { invalid: 'data' },
      });

      const result = await service.getRepository();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to fetch repository information');
      }
    });
  });

  describe('getCommits', () => {
    it('デフォルトパラメータでコミット一覧を取得できること', async () => {
      mockOctokit.rest.repos.listCommits.mockResolvedValue({
        data: [mockCommitData],
      });

      const result = await service.getCommits();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0]).toEqual(mockCommitData);
      }

      expect(mockOctokit.rest.repos.listCommits).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        page: 1,
        per_page: 30,
      });
    });

    it('カスタムクエリパラメータでコミットを取得できること', async () => {
      mockOctokit.rest.repos.listCommits.mockResolvedValue({
        data: [mockCommitData],
      });

      const query = {
        sha: 'main',
        path: 'src/',
        author: 'test-author',
        since: '2024-01-01T00:00:00Z',
        until: '2024-01-31T23:59:59Z',
        page: 2,
        per_page: 10,
      };

      const result = await service.getCommits(query);

      expect(result.success).toBe(true);
      expect(mockOctokit.rest.repos.listCommits).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        sha: 'main',
        path: 'src/',
        author: 'test-author',
        since: '2024-01-01T00:00:00Z',
        until: '2024-01-31T23:59:59Z',
        page: 2,
        per_page: 10,
      });
    });

    it('部分的なクエリパラメータでコミットを取得できること', async () => {
      mockOctokit.rest.repos.listCommits.mockResolvedValue({
        data: [mockCommitData],
      });

      const query = { per_page: 5, author: 'specific-author' };
      const result = await service.getCommits(query);

      expect(result.success).toBe(true);
      expect(mockOctokit.rest.repos.listCommits).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        author: 'specific-author',
        page: 1,
        per_page: 5,
      });
    });

    it('API エラーを適切に処理すること', async () => {
      const mockError = new Error('Commits not found');
      mockOctokit.rest.repos.listCommits.mockRejectedValue(mockError);

      const result = await service.getCommits();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to fetch repository commits');
      }
    });

    it('無効なクエリパラメータを適切に処理すること', async () => {
      const result = await service.getCommits({ per_page: -1 } as any);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to fetch repository commits');
      }
    });
  });

  describe('getCommit', () => {
    it('特定のコミットを取得できること', async () => {
      mockOctokit.rest.repos.getCommit.mockResolvedValue({
        data: mockCommitData,
      });

      const result = await service.getCommit('abc123def456');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockCommitData);
        expect(result.data.sha).toBe('abc123def456');
      }

      expect(mockOctokit.rest.repos.getCommit).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        ref: 'abc123def456',
      });
    });

    it('ブランチ名でコミットを取得できること', async () => {
      mockOctokit.rest.repos.getCommit.mockResolvedValue({
        data: mockCommitData,
      });

      const result = await service.getCommit('main');

      expect(result.success).toBe(true);
      expect(mockOctokit.rest.repos.getCommit).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        ref: 'main',
      });
    });

    it('存在しないコミットでエラーを処理すること', async () => {
      const mockError = new Error('Commit not found');
      (mockError as any).status = 404;
      mockOctokit.rest.repos.getCommit.mockRejectedValue(mockError);

      const result = await service.getCommit('nonexistent');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to fetch commit information');
      }
    });
  });

  describe('getLanguages', () => {
    it('リポジトリ言語統計を取得できること', async () => {
      mockOctokit.rest.repos.listLanguages.mockResolvedValue({
        data: mockLanguagesData,
      });

      const result = await service.getLanguages();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockLanguagesData);
        expect(result.data['TypeScript']).toBe(50000);
        expect(result.data['JavaScript']).toBe(30000);
      }

      expect(mockOctokit.rest.repos.listLanguages).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
      });
    });

    it('言語が存在しないリポジトリを処理できること', async () => {
      mockOctokit.rest.repos.listLanguages.mockResolvedValue({
        data: {},
      });

      const result = await service.getLanguages();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({});
        expect(Object.keys(result.data)).toHaveLength(0);
      }
    });

    it('API エラーを適切に処理すること', async () => {
      const mockError = new Error('Languages not accessible');
      mockOctokit.rest.repos.listLanguages.mockRejectedValue(mockError);

      const result = await service.getLanguages();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to fetch repository languages');
      }
    });
  });

  describe('getContributors', () => {
    const mockContributorsData = [
      {
        login: 'contributor1',
        id: 1001,
        contributions: 150,
        avatar_url: 'https://avatar.test.com/1001',
        html_url: 'https://github.com/contributor1',
      },
      {
        login: 'contributor2',
        id: 1002,
        contributions: 75,
        avatar_url: 'https://avatar.test.com/1002',
        html_url: 'https://github.com/contributor2',
      },
    ];

    it('デフォルトパラメータでコントリビューターを取得できること', async () => {
      mockOctokit.rest.repos.listContributors.mockResolvedValue({
        data: mockContributorsData,
      });

      const result = await service.getContributors();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockContributorsData);
        expect(result.data).toHaveLength(2);
      }

      expect(mockOctokit.rest.repos.listContributors).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        page: 1,
        per_page: 30,
      });
    });

    it('カスタムページネーションでコントリビューターを取得できること', async () => {
      mockOctokit.rest.repos.listContributors.mockResolvedValue({
        data: mockContributorsData,
      });

      const result = await service.getContributors(2, 10);

      expect(result.success).toBe(true);
      expect(mockOctokit.rest.repos.listContributors).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        page: 2,
        per_page: 10,
      });
    });

    it('コントリビューターが存在しない場合を処理できること', async () => {
      mockOctokit.rest.repos.listContributors.mockResolvedValue({
        data: [],
      });

      const result = await service.getContributors();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
        expect(result.data).toHaveLength(0);
      }
    });

    it('API エラーを適切に処理すること', async () => {
      const mockError = new Error('Contributors not accessible');
      mockOctokit.rest.repos.listContributors.mockRejectedValue(mockError);

      const result = await service.getContributors();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to fetch repository contributors');
      }
    });
  });

  describe('getTopics', () => {
    const mockTopicsData = {
      names: ['typescript', 'javascript', 'testing', 'github-api'],
    };

    it('リポジトリトピックを取得できること', async () => {
      mockOctokit.rest.repos.getAllTopics.mockResolvedValue({
        data: mockTopicsData,
      });

      const result = await service.getTopics();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockTopicsData);
        expect(result.data.names).toContain('typescript');
        expect(result.data.names).toHaveLength(4);
      }

      expect(mockOctokit.rest.repos.getAllTopics).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
      });
    });

    it('トピックが存在しない場合を処理できること', async () => {
      mockOctokit.rest.repos.getAllTopics.mockResolvedValue({
        data: { names: [] },
      });

      const result = await service.getTopics();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.names).toEqual([]);
        expect(result.data.names).toHaveLength(0);
      }
    });

    it('API エラーを適切に処理すること', async () => {
      const mockError = new Error('Topics not accessible');
      mockOctokit.rest.repos.getAllTopics.mockRejectedValue(mockError);

      const result = await service.getTopics();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to fetch repository topics');
      }
    });
  });

  describe('getRepositoryStats', () => {
    it('リポジトリ統計を正常に取得できること', async () => {
      mockOctokit.rest.repos.get.mockResolvedValue({ data: mockRepositoryData });
      mockOctokit.rest.repos.listLanguages.mockResolvedValue({ data: mockLanguagesData });
      mockOctokit.rest.repos.getAllTopics.mockResolvedValue({
        data: { names: ['javascript', 'nodejs'] },
      });
      mockOctokit.rest.repos.listCommits.mockResolvedValue({ data: [mockCommitData] });
      mockOctokit.rest.repos.getCodeFrequencyStats.mockResolvedValue({
        data: [
          [1640995200, 100, -50],
          [1641600000, 75, -25],
        ],
      });

      mockOctokit.rest.repos.getCommitActivityStats.mockResolvedValue({
        data: [
          { week: 1640995200, total: 15, days: [2, 3, 2, 3, 2, 2, 1] },
          { week: 1641600000, total: 12, days: [1, 2, 2, 2, 2, 2, 1] },
        ],
      });

      mockOctokit.rest.repos.getParticipationStats.mockResolvedValue({
        data: {
          all: [10, 15, 12, 8, 20, 25, 18],
          owner: [5, 8, 6, 4, 10, 12, 9],
        },
      });

      const result = await service.getRepositoryStats();

      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data as any; // Type assertion for test data
        expect(data.repository).toBeDefined();
        expect(data.languages).toBeDefined();
        expect(data.topics).toBeDefined();
        expect(data.recent_commits).toBeDefined();
        expect(data.commit_activity_summary).toBeDefined();
      }
    });

    it('統計データが利用できない場合を処理できること', async () => {
      mockOctokit.rest.repos.get.mockResolvedValue({ data: mockRepositoryData });
      mockOctokit.rest.repos.listLanguages.mockResolvedValue({ data: {} });
      mockOctokit.rest.repos.getAllTopics.mockResolvedValue({ data: { names: [] } });
      mockOctokit.rest.repos.listCommits.mockResolvedValue({ data: [] });
      mockOctokit.rest.repos.getCodeFrequencyStats.mockResolvedValue({ data: [] });
      mockOctokit.rest.repos.getCommitActivityStats.mockResolvedValue({ data: [] });
      mockOctokit.rest.repos.getParticipationStats.mockResolvedValue({
        data: { all: [], owner: [] },
      });

      const result = await service.getRepositoryStats();

      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data as any; // Type assertion for test data
        expect(data.repository).toBeDefined();
        expect(data.languages).toEqual({});
        expect(data.topics).toEqual([]);
        expect(data.recent_commits).toEqual([]);
      }
    });

    it('一部の統計APIでエラーが発生した場合を処理できること', async () => {
      mockOctokit.rest.repos.get.mockResolvedValue({ data: mockRepositoryData });
      mockOctokit.rest.repos.listLanguages.mockRejectedValue(new Error('Languages not accessible'));
      mockOctokit.rest.repos.getAllTopics.mockResolvedValue({ data: { names: [] } });
      mockOctokit.rest.repos.listCommits.mockResolvedValue({ data: [] });
      mockOctokit.rest.repos.getCodeFrequencyStats.mockRejectedValue(
        new Error('Code frequency error')
      );
      mockOctokit.rest.repos.getCommitActivityStats.mockResolvedValue({
        data: [{ week: 1640995200, total: 15, days: [2, 3, 2, 3, 2, 2, 1] }],
      });
      mockOctokit.rest.repos.getParticipationStats.mockResolvedValue({
        data: { all: [10, 15], owner: [5, 8] },
      });

      const result = await service.getRepositoryStats();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to fetch repository languages');
      }
    });

    it('すべての統計APIでエラーが発生した場合を処理できること', async () => {
      mockOctokit.rest.repos.get.mockResolvedValue({ data: mockRepositoryData });
      mockOctokit.rest.repos.listLanguages.mockRejectedValue(new Error('Languages not accessible'));
      mockOctokit.rest.repos.getAllTopics.mockRejectedValue(new Error('Topics error'));
      mockOctokit.rest.repos.listCommits.mockRejectedValue(new Error('Commits error'));
      mockOctokit.rest.repos.getCodeFrequencyStats.mockRejectedValue(new Error('Stats error'));
      mockOctokit.rest.repos.getCommitActivityStats.mockRejectedValue(new Error('Activity error'));
      mockOctokit.rest.repos.getParticipationStats.mockRejectedValue(
        new Error('Participation error')
      );

      const result = await service.getRepositoryStats();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to fetch repository languages');
      }
    });
  });

  describe('エラーハンドリング', () => {
    it('ネットワークエラーを適切に処理すること', async () => {
      const networkError = new Error('Network timeout');
      networkError.name = 'NetworkError';
      mockOctokit.rest.repos.get.mockRejectedValue(networkError);

      const result = await service.getRepository();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to fetch repository information');
      }
    });

    it('認証エラーを適切に処理すること', async () => {
      const authError = new Error('Bad credentials');
      (authError as any).status = 401;
      mockOctokit.rest.repos.get.mockRejectedValue(authError);

      const result = await service.getRepository();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to fetch repository information');
      }
    });

    it('レート制限エラーを適切に処理すること', async () => {
      const rateLimitError = new Error('API rate limit exceeded');
      (rateLimitError as any).status = 403;
      mockOctokit.rest.repos.get.mockRejectedValue(rateLimitError);

      const result = await service.getRepository();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to fetch repository information');
      }
    });
  });
});

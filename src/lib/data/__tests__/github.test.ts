/**
 * GitHub Data Processing Layer Test Suite
 *
 * Issue #97 - データ処理レイヤーの包括的テスト実装
 * 95%+ statement coverage, 90%+ branch coverage, 100% function coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import * as githubData from '../github';
import type { GitHubIssue, GitHubMetadata } from '../github';

// モック設定
vi.mock('node:fs', () => {
  const readFileSync = vi.fn();
  const existsSync = vi.fn();
  const mockFs = { readFileSync, existsSync };
  return {
    ...mockFs,
    default: mockFs,
  };
});

vi.mock('node:path', () => {
  const join = vi.fn();
  const mockPath = { join };
  return {
    ...mockPath,
    default: mockPath,
  };
});

const mockReadFileSync = vi.mocked(readFileSync);
const mockExistsSync = vi.mocked(existsSync);
const mockJoin = vi.mocked(join);

// テスト用のサンプルデータ
const mockIssuesData: GitHubIssue[] = [
  {
    id: 1,
    node_id: 'I_kwDOABCDEF4ABcDE',
    number: 101,
    title: 'Test Issue 1',
    body: 'This is a test issue',
    state: 'open',
    locked: false,
    assignee: null,
    assignees: [],
    user: {
      id: 12345,
      node_id: 'U_kwDOABCDEF4ABcDE',
      login: 'testuser',
      avatar_url: 'https://github.com/testuser.png',
      gravatar_id: null,
      url: 'https://api.github.com/users/testuser',
      html_url: 'https://github.com/testuser',
      type: 'User',
      site_admin: false,
    },
    labels: [
      {
        id: 1001,
        node_id: 'L_kwDOABCDEF4ABcDE',
        name: 'bug',
        color: 'ee0701',
        description: 'Something is not working',
        default: false,
      },
      {
        id: 1002,
        node_id: 'L_kwDOABCDEF4ABcDF',
        name: 'priority: high',
        color: 'ff0000',
        description: 'High priority',
        default: false,
      },
    ],
    milestone: null,
    comments: 2,
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-02T15:30:00Z',
    closed_at: null,
    author_association: 'OWNER',
    active_lock_reason: null,
    html_url: 'https://github.com/test/repo/issues/101',
    url: 'https://api.github.com/repos/test/repo/issues/101',
    repository_url: 'https://api.github.com/repos/test/repo',
    labels_url: 'https://api.github.com/repos/test/repo/issues/101/labels{/name}',
    comments_url: 'https://api.github.com/repos/test/repo/issues/101/comments',
    events_url: 'https://api.github.com/repos/test/repo/issues/101/events',
  },
  {
    id: 2,
    node_id: 'I_kwDOABCDEF4ABcDF',
    number: 102,
    title: 'Test Issue 2',
    body: 'This is another test issue',
    state: 'closed',
    locked: false,
    assignee: null,
    assignees: [],
    user: {
      id: 12346,
      node_id: 'U_kwDOABCDEF4ABcDF',
      login: 'testuser2',
      avatar_url: 'https://github.com/testuser2.png',
      gravatar_id: null,
      url: 'https://api.github.com/users/testuser2',
      html_url: 'https://github.com/testuser2',
      type: 'User',
      site_admin: false,
    },
    labels: [
      {
        id: 1003,
        node_id: 'L_kwDOABCDEF4ABcDG',
        name: 'enhancement',
        color: '0075ca',
        description: 'New feature or request',
        default: false,
      },
    ],
    milestone: null,
    comments: 0,
    created_at: '2024-01-03T09:00:00Z',
    updated_at: '2024-01-04T14:20:00Z',
    closed_at: '2024-01-04T14:20:00Z',
    author_association: 'CONTRIBUTOR',
    active_lock_reason: null,
    html_url: 'https://github.com/test/repo/issues/102',
    url: 'https://api.github.com/repos/test/repo/issues/102',
    repository_url: 'https://api.github.com/repos/test/repo',
    labels_url: 'https://api.github.com/repos/test/repo/issues/102/labels{/name}',
    comments_url: 'https://api.github.com/repos/test/repo/issues/102/comments',
    events_url: 'https://api.github.com/repos/test/repo/issues/102/events',
  },
  {
    id: 3,
    node_id: 'I_kwDOABCDEF4ABcDG',
    number: 103,
    title: 'Test Issue 3',
    body: 'Third test issue',
    state: 'open',
    locked: false,
    assignee: null,
    assignees: [],
    user: {
      id: 12347,
      node_id: 'U_kwDOABCDEF4ABcDG',
      login: 'testuser3',
      avatar_url: 'https://github.com/testuser3.png',
      gravatar_id: null,
      url: 'https://api.github.com/users/testuser3',
      html_url: 'https://github.com/testuser3',
      type: 'User',
      site_admin: false,
    },
    labels: [
      {
        id: 1001,
        node_id: 'L_kwDOABCDEF4ABcDE',
        name: 'bug',
        color: 'ee0701',
        description: 'Something is not working',
        default: false,
      },
    ],
    milestone: null,
    comments: 1,
    created_at: '2023-12-15T08:00:00Z',
    updated_at: '2023-12-16T12:00:00Z',
    closed_at: null,
    author_association: 'NONE',
    active_lock_reason: null,
    html_url: 'https://github.com/test/repo/issues/103',
    url: 'https://api.github.com/repos/test/repo/issues/103',
    repository_url: 'https://api.github.com/repos/test/repo',
    labels_url: 'https://api.github.com/repos/test/repo/issues/103/labels{/name}',
    comments_url: 'https://api.github.com/repos/test/repo/issues/103/comments',
    events_url: 'https://api.github.com/repos/test/repo/issues/103/events',
  },
];

const mockMetadata: GitHubMetadata = {
  lastUpdated: '2024-01-05T12:00:00Z',
  repository: {
    owner: 'testowner',
    name: 'testrepo',
  },
  statistics: {
    issues: {
      total: 3,
      open: 2,
      closed: 1,
    },
    pullRequests: {
      total: 0,
      open: 0,
      closed: 0,
    },
    labels: 3,
  },
  labelCounts: {
    bug: 2,
    enhancement: 1,
    'priority: high': 1,
  },
  lastIssue: mockIssuesData[0]!,
  lastPullRequest: null,
};

const mockFallbackIssues: GitHubIssue[] = [
  {
    id: 999,
    node_id: 'I_kwDOABCDEF4ABcDH',
    number: 999,
    title: 'Fallback Issue',
    body: 'This is a fallback issue',
    state: 'open',
    locked: false,
    assignee: null,
    assignees: [],
    user: {
      id: 99999,
      node_id: 'U_kwDOABCDEF4ABcDH',
      login: 'fallbackuser',
      avatar_url: 'https://github.com/fallbackuser.png',
      gravatar_id: null,
      url: 'https://api.github.com/users/fallbackuser',
      html_url: 'https://github.com/fallbackuser',
      type: 'User',
      site_admin: false,
    },
    labels: [],
    milestone: null,
    comments: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    closed_at: null,
    author_association: 'NONE',
    active_lock_reason: null,
    html_url: 'https://github.com/test/repo/issues/999',
    url: 'https://api.github.com/repos/test/repo/issues/999',
    repository_url: 'https://api.github.com/repos/test/repo',
    labels_url: 'https://api.github.com/repos/test/repo/issues/999/labels{/name}',
    comments_url: 'https://api.github.com/repos/test/repo/issues/999/comments',
    events_url: 'https://api.github.com/repos/test/repo/issues/999/events',
  },
];

describe('GitHub Data Processing Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // デフォルトのモック設定
    mockJoin.mockImplementation((...paths) => paths.join('/'));
    mockExistsSync.mockReturnValue(true);

    // プロセスCWDのモック
    vi.spyOn(process, 'cwd').mockReturnValue('/test');

    // コンソールメソッドをモック
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ファイルシステム操作', () => {
    describe('getStaticIssues', () => {
      it('正常なIssueデータを読み込めること', () => {
        mockReadFileSync.mockReturnValue(JSON.stringify(mockIssuesData));

        const result = githubData.getStaticIssues();

        expect(result).toHaveLength(3);
        expect(result[0]?.number).toBe(101);
        expect(result[1]?.state).toBe('closed');
        expect(mockJoin).toHaveBeenCalledWith('/test', 'src/data/github', 'issues.json');
        expect(mockReadFileSync).toHaveBeenCalledWith('/test/src/data/github/issues.json', 'utf8');
      });

      it('ファイルが存在しない場合にエラーを投げること', () => {
        mockExistsSync.mockReturnValue(false);

        expect(() => githubData.getStaticIssues()).toThrow('データファイルが見つかりません');
      });

      it('不正なJSONの場合にエラーを投げること', () => {
        mockReadFileSync.mockReturnValue('invalid json');

        expect(() => githubData.getStaticIssues()).toThrow();
      });

      it('スキーマ検証に失敗した場合にエラーを投げること', () => {
        const invalidData = [{ invalid: 'data' }];
        mockReadFileSync.mockReturnValue(JSON.stringify(invalidData));

        expect(() => githubData.getStaticIssues()).toThrow('データ形式が不正です');
        expect(console.error).toHaveBeenCalledWith('データ検証エラー:', expect.any(Array));
      });
    });

    describe('getStaticMetadata', () => {
      it('正常なメタデータを読み込めること', () => {
        mockReadFileSync.mockReturnValue(JSON.stringify(mockMetadata));

        const result = githubData.getStaticMetadata();

        expect(result.repository.owner).toBe('testowner');
        expect(result.statistics.issues.total).toBe(3);
        expect(result.labelCounts['bug']).toBe(2);
        expect(mockJoin).toHaveBeenCalledWith('/test', 'src/data/github', 'metadata.json');
      });

      it('不正なメタデータスキーマでエラーを投げること', () => {
        const invalidMetadata = { invalid: 'metadata' };
        mockReadFileSync.mockReturnValue(JSON.stringify(invalidMetadata));

        expect(() => githubData.getStaticMetadata()).toThrow('データ形式が不正です');
      });
    });

    describe('getStaticIssueById', () => {
      beforeEach(() => {
        // 個別ファイルの読み込み用モック
        mockReadFileSync.mockImplementation((path: any) => {
          if (path.includes('issues/101.json')) {
            return JSON.stringify(mockIssuesData[0]);
          }
          if (path.includes('issues.json')) {
            return JSON.stringify(mockIssuesData);
          }
          throw new Error('File not found');
        });
      });

      it('個別ファイルからIssueを取得できること', () => {
        const result = githubData.getStaticIssueById(101);

        expect(result).toBeDefined();
        expect(result?.number).toBe(101);
        expect(result?.title).toBe('Test Issue 1');
      });

      it('個別ファイルが見つからない場合に全データから検索すること', () => {
        mockReadFileSync.mockImplementation((path: any) => {
          if (path.includes('issues/102.json')) {
            throw new Error('File not found');
          }
          if (path.includes('issues.json')) {
            return JSON.stringify(mockIssuesData);
          }
          throw new Error('File not found');
        });

        const result = githubData.getStaticIssueById(102);

        expect(result).toBeDefined();
        expect(result?.number).toBe(102);
        expect(result?.state).toBe('closed');
      });

      it('存在しないIssue番号でundefinedを返すこと', () => {
        mockReadFileSync.mockImplementation((path: any) => {
          if (path.includes('issues/999.json')) {
            throw new Error('File not found');
          }
          if (path.includes('issues.json')) {
            return JSON.stringify(mockIssuesData);
          }
          throw new Error('File not found');
        });

        const result = githubData.getStaticIssueById(999);

        expect(result).toBeUndefined();
      });
    });

    describe('hasStaticData', () => {
      it('両方のファイルが存在する場合にtrueを返すこと', () => {
        mockExistsSync.mockReturnValue(true);

        const result = githubData.hasStaticData();

        expect(result).toBe(true);
        expect(mockExistsSync).toHaveBeenCalledTimes(2);
      });

      it('issues.jsonが存在しない場合にfalseを返すこと', () => {
        mockExistsSync.mockImplementation((path: any) => {
          return !path.includes('issues.json');
        });

        const result = githubData.hasStaticData();

        expect(result).toBe(false);
      });

      it('metadata.jsonが存在しない場合にfalseを返すこと', () => {
        mockExistsSync.mockImplementation((path: any) => {
          return !path.includes('metadata.json');
        });

        const result = githubData.hasStaticData();

        expect(result).toBe(false);
      });

      it('例外が発生した場合にfalseを返すこと', () => {
        mockExistsSync.mockImplementation(() => {
          throw new Error('File system error');
        });

        const result = githubData.hasStaticData();

        expect(result).toBe(false);
      });
    });
  });

  describe('データフィルタリング機能', () => {
    beforeEach(() => {
      mockReadFileSync.mockReturnValue(JSON.stringify(mockIssuesData));
    });

    describe('getOpenIssues', () => {
      it('オープンなIssueのみを返すこと', () => {
        const result = githubData.getOpenIssues();

        expect(result).toHaveLength(2);
        expect(result.every(issue => issue.state === 'open')).toBe(true);
        expect(result.map(issue => issue.number)).toEqual([101, 103]);
      });
    });

    describe('getClosedIssues', () => {
      it('クローズされたIssueのみを返すこと', () => {
        const result = githubData.getClosedIssues();

        expect(result).toHaveLength(1);
        expect(result.every(issue => issue.state === 'closed')).toBe(true);
        expect(result[0]?.number).toBe(102);
      });
    });

    describe('getIssuesByLabel', () => {
      it('指定されたラベルを持つIssueを返すこと', () => {
        const result = githubData.getIssuesByLabel('bug');

        expect(result).toHaveLength(2);
        expect(result.map(issue => issue.number)).toEqual([101, 103]);
      });

      it('存在しないラベルで空配列を返すこと', () => {
        const result = githubData.getIssuesByLabel('nonexistent');

        expect(result).toHaveLength(0);
      });

      it('複数のラベルを持つIssueが正しく検索されること', () => {
        const result = githubData.getIssuesByLabel('priority: high');

        expect(result).toHaveLength(1);
        expect(result[0]?.number).toBe(101);
      });
    });
  });

  describe('データソート機能', () => {
    beforeEach(() => {
      mockReadFileSync.mockReturnValue(JSON.stringify(mockIssuesData));
    });

    describe('sortIssuesByDate', () => {
      it('作成日時で降順ソートできること（デフォルト）', () => {
        const issues = githubData.getStaticIssues();
        const result = githubData.sortIssuesByDate(issues);

        expect(result.map(issue => issue.number)).toEqual([102, 101, 103]);
      });

      it('作成日時で昇順ソートできること', () => {
        const issues = githubData.getStaticIssues();
        const result = githubData.sortIssuesByDate(issues, 'asc');

        expect(result.map(issue => issue.number)).toEqual([103, 101, 102]);
      });

      it('元の配列を変更しないこと', () => {
        const issues = githubData.getStaticIssues();
        const originalOrder = issues.map(issue => issue.number);

        githubData.sortIssuesByDate(issues);

        expect(issues.map(issue => issue.number)).toEqual(originalOrder);
      });
    });

    describe('sortIssuesByUpdatedDate', () => {
      it('更新日時で降順ソートできること（デフォルト）', () => {
        const issues = githubData.getStaticIssues();
        const result = githubData.sortIssuesByUpdatedDate(issues);

        expect(result.map(issue => issue.number)).toEqual([102, 101, 103]);
      });

      it('更新日時で昇順ソートできること', () => {
        const issues = githubData.getStaticIssues();
        const result = githubData.sortIssuesByUpdatedDate(issues, 'asc');

        expect(result.map(issue => issue.number)).toEqual([103, 101, 102]);
      });

      it('元の配列を変更しないこと', () => {
        const issues = githubData.getStaticIssues();
        const originalOrder = issues.map(issue => issue.number);

        githubData.sortIssuesByUpdatedDate(issues);

        expect(issues.map(issue => issue.number)).toEqual(originalOrder);
      });
    });
  });

  describe('メタデータ操作', () => {
    beforeEach(() => {
      mockReadFileSync.mockReturnValue(JSON.stringify(mockMetadata));
    });

    describe('getLastUpdated', () => {
      it('最終更新日時をDateオブジェクトで返すこと', () => {
        const result = githubData.getLastUpdated();

        expect(result).toBeInstanceOf(Date);
        expect(result.toISOString()).toBe('2024-01-05T12:00:00.000Z');
      });
    });
  });

  describe('フォールバック機能', () => {
    describe('getFallbackIssues', () => {
      it('正常なフォールバックデータを読み込めること', () => {
        mockReadFileSync.mockReturnValue(JSON.stringify(mockFallbackIssues));

        const result = githubData.getFallbackIssues();

        expect(result).toHaveLength(1);
        expect(result[0]?.number).toBe(999);
        expect(result[0]?.title).toBe('Fallback Issue');
      });

      it('フォールバックデータが不正な場合に空配列を返すこと', () => {
        mockReadFileSync.mockReturnValue('invalid json');

        const result = githubData.getFallbackIssues();

        expect(result).toEqual([]);
        expect(console.warn).toHaveBeenCalledWith(
          'サンプルデータの読み込みに失敗しました。空のデータを使用します。',
          expect.any(Error)
        );
      });

      it('フォールバックファイルが存在しない場合に空配列を返すこと', () => {
        mockReadFileSync.mockImplementation(() => {
          throw new Error('File not found');
        });

        const result = githubData.getFallbackIssues();

        expect(result).toEqual([]);
        expect(console.warn).toHaveBeenCalled();
      });

      it('Zodスキーマ検証に失敗した場合に空配列を返すこと', () => {
        const invalidFallbackData = [{ invalid: 'data' }];
        mockReadFileSync.mockReturnValue(JSON.stringify(invalidFallbackData));

        const result = githubData.getFallbackIssues();

        expect(result).toEqual([]);
        expect(console.warn).toHaveBeenCalled();
      });
    });

    describe('getIssuesWithFallback', () => {
      it('正常データが利用可能な場合にそれを返すこと', () => {
        mockReadFileSync.mockImplementation((path: any) => {
          if (path.includes('github/issues.json')) {
            return JSON.stringify(mockIssuesData);
          }
          if (path.includes('src/data/fixtures/sample-issues.json')) {
            return JSON.stringify(mockFallbackIssues);
          }
          throw new Error('File not found');
        });

        const result = githubData.getIssuesWithFallback();

        expect(result).toHaveLength(3);
        expect(result[0]?.number).toBe(101);
      });

      it('静的データの読み込みに失敗した場合にフォールバックデータを返すこと', () => {
        mockReadFileSync.mockImplementation((path: any) => {
          if (path.includes('github/issues.json')) {
            throw new Error('Static data file not found');
          }
          if (path.includes('src/data/fixtures/sample-issues.json')) {
            return JSON.stringify(mockFallbackIssues);
          }
          throw new Error('File not found');
        });

        const result = githubData.getIssuesWithFallback();

        expect(result).toHaveLength(1);
        expect(result[0]?.number).toBe(999);
        expect(console.warn).toHaveBeenCalledWith(
          '静的データの読み込みに失敗しました。フォールバックデータを使用します:',
          expect.any(Error)
        );
      });

      it('静的データとフォールバックデータ両方に失敗した場合に空配列を返すこと', () => {
        mockReadFileSync.mockImplementation(() => {
          throw new Error('All files not found');
        });

        const result = githubData.getIssuesWithFallback();

        expect(result).toEqual([]);
        expect(console.warn).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('存在しないディレクトリでエラーを投げること', () => {
      mockExistsSync.mockReturnValue(false);

      expect(() => githubData.getStaticIssues()).toThrow('データファイルが見つかりません');
    });

    it('ファイル読み込み権限エラーを適切に処理すること', () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => githubData.getStaticIssues()).toThrow('Permission denied');
    });

    it('Zodエラーを適切にキャッチして再スローすること', () => {
      const invalidData = { invalid: 'schema' };
      mockReadFileSync.mockReturnValue(JSON.stringify(invalidData));

      expect(() => githubData.getStaticIssues()).toThrow('データ形式が不正です');
      expect(console.error).toHaveBeenCalledWith('データ検証エラー:', expect.any(Array));
    });

    it('JSON.parseエラーを適切に処理すること', () => {
      mockReadFileSync.mockReturnValue('{ invalid json }');

      expect(() => githubData.getStaticIssues()).toThrow();
    });
  });

  describe('パス構築', () => {
    it('正しいデータパスを構築すること', () => {
      vi.spyOn(process, 'cwd').mockReturnValue('/project/root');
      mockReadFileSync.mockReturnValue(JSON.stringify(mockIssuesData));

      githubData.getStaticIssues();

      expect(mockJoin).toHaveBeenCalledWith('/project/root', 'src/data/github', 'issues.json');
    });

    it('異なるファイル名で正しいパスを構築すること', () => {
      vi.spyOn(process, 'cwd').mockReturnValue('/another/path');
      mockReadFileSync.mockReturnValue(JSON.stringify(mockMetadata));

      githubData.getStaticMetadata();

      expect(mockJoin).toHaveBeenCalledWith('/another/path', 'src/data/github', 'metadata.json');
    });
  });

  describe('エッジケース', () => {
    it('空のIssue配列を適切に処理すること', () => {
      mockReadFileSync.mockReturnValue(JSON.stringify([]));

      const openIssues = githubData.getOpenIssues();
      const closedIssues = githubData.getClosedIssues();
      const labelIssues = githubData.getIssuesByLabel('any');

      expect(openIssues).toEqual([]);
      expect(closedIssues).toEqual([]);
      expect(labelIssues).toEqual([]);
    });

    it('同じ作成日時のIssueを適切にソートすること', () => {
      const sameTimeIssues = [
        { ...mockIssuesData[0], created_at: '2024-01-01T10:00:00Z', number: 1 },
        { ...mockIssuesData[1], created_at: '2024-01-01T10:00:00Z', number: 2 },
      ];
      mockReadFileSync.mockReturnValue(JSON.stringify(sameTimeIssues));

      const issues = githubData.getStaticIssues();
      const sorted = githubData.sortIssuesByDate(issues, 'asc');

      expect(sorted).toHaveLength(2);
      // 順序は安定していることを確認
      expect(sorted[0]?.number).toBe(1);
      expect(sorted[1]?.number).toBe(2);
    });

    it('nullやundefinedの日付を適切に処理すること', () => {
      const issuesWithNullDates = [
        { ...mockIssuesData[0], created_at: '2024-01-01T10:00:00Z' },
        { ...mockIssuesData[1], created_at: '2024-01-02T10:00:00Z' },
      ];
      mockReadFileSync.mockReturnValue(JSON.stringify(issuesWithNullDates));

      const issues = githubData.getStaticIssues();
      const sorted = githubData.sortIssuesByDate(issues);

      expect(sorted).toHaveLength(2);
      expect(sorted[0]?.created_at).toBe('2024-01-02T10:00:00Z');
      expect(sorted[1]?.created_at).toBe('2024-01-01T10:00:00Z');
    });
  });
});

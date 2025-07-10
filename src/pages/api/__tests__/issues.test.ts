/**
 * Issues API Endpoint Test Suite
 *
 * Issue #99 - API endpoints comprehensive test implementation
 * 90%+ statement coverage, 85%+ branch coverage, 100% function coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../issues';

describe('Issues API Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createMockAPIContext = (queryParams: Record<string, string> = {}) => {
    const url = new URL('http://localhost:3000/api/issues');
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
      originPathname: '/api/issues',
      getActionResult: () => undefined,
      callAction: () => Promise.resolve(undefined),
      isPrerendered: false,
      routeData: undefined,
    } as any;
  };

  describe('成功ケース', () => {
    it('基本的なIssue一覧を取得できること', async () => {
      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.pagination).toBeDefined();
      expect(result.meta).toBeDefined();
      expect(result.meta.data_source).toBe('mock');
    });

    it('デフォルトパラメータで正しく動作すること', async () => {
      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.per_page).toBe(30);
      expect(result.meta.filters_applied.state).toBe('all');
    });

    it('ページネーション情報が正しく設定されること', async () => {
      const apiContext = createMockAPIContext({ page: '1', per_page: '2' });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.per_page).toBe(2);
      expect(result.pagination.total).toBeDefined();
      expect(result.pagination.total_pages).toBeDefined();
      expect(typeof result.pagination.has_next).toBe('boolean');
      expect(typeof result.pagination.has_prev).toBe('boolean');
    });

    it('2ページ目のデータを正しく取得できること', async () => {
      const apiContext = createMockAPIContext({ page: '2', per_page: '1' });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.per_page).toBe(1);
      expect(result.pagination.has_prev).toBe(true);
      expect(result.data.length).toBeLessThanOrEqual(1);
    });
  });

  describe('フィルタリング機能', () => {
    it('stateフィルタが正しく動作すること', async () => {
      const apiContext = createMockAPIContext({ state: 'open' });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.meta.filters_applied.state).toBe('open');

      // All returned issues should be open
      result.data.forEach((issue: any) => {
        expect(issue.state).toBe('open');
      });
    });

    it('closedのissuesをフィルタできること', async () => {
      const apiContext = createMockAPIContext({ state: 'closed' });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.meta.filters_applied.state).toBe('closed');

      // All returned issues should be closed
      result.data.forEach((issue: any) => {
        expect(issue.state).toBe('closed');
      });
    });

    it('labelsフィルタが正しく動作すること', async () => {
      const apiContext = createMockAPIContext({ labels: 'bug' });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.meta.filters_applied.labels).toBe('bug');

      // All returned issues should have the bug label
      result.data.forEach((issue: any) => {
        expect(issue.labels.some((label: any) => label.name.includes('bug'))).toBe(true);
      });
    });

    it('複数ラベルでフィルタできること', async () => {
      const apiContext = createMockAPIContext({ labels: 'feature,enhancement' });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.meta.filters_applied.labels).toBe('feature,enhancement');
    });

    it('assigneeフィルタが正しく動作すること', async () => {
      const apiContext = createMockAPIContext({ assignee: 'developer2' });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.meta.filters_applied.assignee).toBe('developer2');

      // All returned issues should be assigned to developer2
      result.data.forEach((issue: any) => {
        expect(issue.assignee?.login).toBe('developer2');
      });
    });

    it('creatorフィルタが正しく動作すること', async () => {
      const apiContext = createMockAPIContext({ creator: 'user1' });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.meta.filters_applied.creator).toBe('user1');

      // All returned issues should be created by user1
      result.data.forEach((issue: any) => {
        expect(issue.creator.login).toBe('user1');
      });
    });

    it('検索フィルタが正しく動作すること', async () => {
      const apiContext = createMockAPIContext({ search: 'dark mode' });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.meta.filters_applied.search).toBe('dark mode');

      // All returned issues should contain the search term
      result.data.forEach((issue: any) => {
        const titleMatch = issue.title.toLowerCase().includes('dark mode');
        const bodyMatch = issue.body.toLowerCase().includes('dark mode');
        expect(titleMatch || bodyMatch).toBe(true);
      });
    });

    it('大文字小文字を区別しない検索ができること', async () => {
      const apiContext = createMockAPIContext({ search: 'SAMPLE' });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('複数フィルタを組み合わせて使用できること', async () => {
      const apiContext = createMockAPIContext({
        state: 'open',
        labels: 'feature',
        assignee: 'developer2',
      });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.meta.filters_applied.state).toBe('open');
      expect(result.meta.filters_applied.labels).toBe('feature');
      expect(result.meta.filters_applied.assignee).toBe('developer2');
    });
  });

  describe('ソート機能', () => {
    it('createdでソートできること', async () => {
      const apiContext = createMockAPIContext({ sort: 'created', direction: 'desc' });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.success).toBe(true);

      // Check if sorted by created date descending
      for (let i = 0; i < result.data.length - 1; i++) {
        const currentDate = new Date(result.data[i].created_at);
        const nextDate = new Date(result.data[i + 1].created_at);
        expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
      }
    });

    it('updatedでソートできること', async () => {
      const apiContext = createMockAPIContext({ sort: 'updated', direction: 'asc' });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.success).toBe(true);

      // Check if sorted by updated date ascending
      for (let i = 0; i < result.data.length - 1; i++) {
        const currentDate = new Date(result.data[i].updated_at);
        const nextDate = new Date(result.data[i + 1].updated_at);
        expect(currentDate.getTime()).toBeLessThanOrEqual(nextDate.getTime());
      }
    });

    it('commentsでソートできること', async () => {
      const apiContext = createMockAPIContext({ sort: 'comments', direction: 'desc' });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.success).toBe(true);

      // Check if sorted by comments descending
      for (let i = 0; i < result.data.length - 1; i++) {
        expect(result.data[i].comments).toBeGreaterThanOrEqual(result.data[i + 1].comments);
      }
    });

    it('昇順ソートが正しく動作すること', async () => {
      const apiContext = createMockAPIContext({ sort: 'comments', direction: 'asc' });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.success).toBe(true);

      // Check if sorted by comments ascending
      for (let i = 0; i < result.data.length - 1; i++) {
        expect(result.data[i].comments).toBeLessThanOrEqual(result.data[i + 1].comments);
      }
    });
  });

  describe('パラメータバリデーション', () => {
    it('無効なページ番号を適切に処理すること', async () => {
      const apiContext = createMockAPIContext({ page: '0' });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });

    it('無効なper_pageを適切に処理すること', async () => {
      const apiContext = createMockAPIContext({ per_page: '0' });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });

    it('per_pageの上限を適切に処理すること', async () => {
      const apiContext = createMockAPIContext({ per_page: '101' });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });

    it('無効なstateを適切に処理すること', async () => {
      const apiContext = createMockAPIContext({ state: 'invalid' });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });

    it('無効なsortを適切に処理すること', async () => {
      const apiContext = createMockAPIContext({ sort: 'invalid' });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });

    it('無効なdirectionを適切に処理すること', async () => {
      const apiContext = createMockAPIContext({ direction: 'invalid' });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });

    it('無効な数値パラメータを適切に処理すること', async () => {
      const apiContext = createMockAPIContext({ page: 'not_a_number' });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('エッジケース', () => {
    it('存在しないassigneeでフィルタした場合', async () => {
      const apiContext = createMockAPIContext({ assignee: 'nonexistent' });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('存在しないcreatorでフィルタした場合', async () => {
      const apiContext = createMockAPIContext({ creator: 'nonexistent' });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('存在しないラベルでフィルタした場合', async () => {
      const apiContext = createMockAPIContext({ labels: 'nonexistent' });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('存在しない検索語でフィルタした場合', async () => {
      const apiContext = createMockAPIContext({ search: 'nonexistent_search_term' });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('範囲外のページを要求した場合', async () => {
      const apiContext = createMockAPIContext({ page: '999', per_page: '30' });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      expect(result.pagination.has_next).toBe(false);
    });

    it('空文字列パラメータを適切に処理すること', async () => {
      const apiContext = createMockAPIContext({
        labels: '',
        assignee: '',
        creator: '',
        search: '',
      });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.meta.filters_applied.labels).toBe(null);
      expect(result.meta.filters_applied.assignee).toBe(null);
      expect(result.meta.filters_applied.creator).toBe(null);
      expect(result.meta.filters_applied.search).toBe(null);
    });
  });

  describe('レスポンス形式', () => {
    it('正しいレスポンスヘッダーが設定されること', async () => {
      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);

      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=300');
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

    it('メタ情報が正しく設定されること', async () => {
      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.meta.generated_at).toBeDefined();
      expect(result.meta.data_source).toBe('mock');
      expect(result.meta.filters_applied).toBeDefined();

      // Timestamp should be valid ISO string
      const timestamp = new Date(result.meta.generated_at);
      expect(isNaN(timestamp.getTime())).toBe(false);
    });

    it('pagination情報がすべて含まれること', async () => {
      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.pagination).toHaveProperty('page');
      expect(result.pagination).toHaveProperty('per_page');
      expect(result.pagination).toHaveProperty('total');
      expect(result.pagination).toHaveProperty('total_pages');
      expect(result.pagination).toHaveProperty('has_next');
      expect(result.pagination).toHaveProperty('has_prev');
    });

    it('issue オブジェクトが必要なフィールドを含むこと', async () => {
      const apiContext = createMockAPIContext();
      const response = await GET(apiContext);
      const result = await response.json();

      if (result.data.length > 0) {
        const issue = result.data[0];
        expect(issue).toHaveProperty('id');
        expect(issue).toHaveProperty('number');
        expect(issue).toHaveProperty('title');
        expect(issue).toHaveProperty('body');
        expect(issue).toHaveProperty('state');
        expect(issue).toHaveProperty('labels');
        expect(issue).toHaveProperty('creator');
        expect(issue).toHaveProperty('created_at');
        expect(issue).toHaveProperty('updated_at');
        expect(issue).toHaveProperty('comments');
      }
    });
  });

  describe('パフォーマンステスト', () => {
    it('大きなper_pageでも適切に処理できること', async () => {
      const apiContext = createMockAPIContext({ per_page: '100' });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.pagination.per_page).toBe(100);
      expect(result.data.length).toBeLessThanOrEqual(100);
    });

    it('複雑なフィルタ組み合わせでも適切に処理できること', async () => {
      const apiContext = createMockAPIContext({
        state: 'open',
        labels: 'feature,bug',
        search: 'test',
        sort: 'updated',
        direction: 'desc',
        page: '1',
        per_page: '10',
      });
      const response = await GET(apiContext);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(response.status).toBe(200);
    });
  });
});

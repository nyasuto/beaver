/**
 * GitHub GraphQL Client Tests
 *
 * `@octokit/graphql` をモックして HTTP を発生させずに
 * GitHubGraphQLClient の挙動を検証する。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GitHubGraphQLClient,
  GraphQLIssueSchema,
  GraphQLIssuesResponseSchema,
  type GraphQLClientConfig,
  type GraphQLIssue,
} from '../graphql-client';
import { GitHubError } from '../client';

// `graphql.defaults(...)` は呼び出し可能関数を返す。
// `vi.mock` は hoist されるため、参照する変数は `vi.hoisted` で同じ
// hoist フェーズに初期化しないと未初期化アクセスになる。
const { mockGraphqlCallable, mockDefaults } = vi.hoisted(() => ({
  mockGraphqlCallable: vi.fn(),
  mockDefaults: vi.fn(),
}));

vi.mock('@octokit/graphql', () => ({
  graphql: {
    defaults: mockDefaults,
  },
}));

// hoist された mock は init 時には callable を返さないので、
// import が解決された後で実体を割り当てる。
mockDefaults.mockImplementation(() => mockGraphqlCallable);

const baseConfig: GraphQLClientConfig = {
  token: 'test-token',
  owner: 'test-owner',
  repo: 'test-repo',
};

const buildIssueNode = (overrides: Partial<GraphQLIssue> = {}): GraphQLIssue => ({
  id: 'I_kABC',
  number: 1,
  title: 'Test Issue',
  body: 'body content',
  state: 'OPEN',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
  closedAt: null,
  url: 'https://github.com/test-owner/test-repo/issues/1',
  author: {
    login: 'tester',
    avatarUrl: 'https://avatars.example/tester',
    url: 'https://github.com/tester',
  },
  labels: {
    nodes: [
      {
        id: 'LA_xyz',
        name: 'bug',
        color: 'ff0000',
        description: 'Something broken',
      },
    ],
  },
  assignees: {
    nodes: [
      {
        login: 'assignee1',
        avatarUrl: 'https://avatars.example/a1',
        url: 'https://github.com/assignee1',
      },
    ],
  },
  milestone: {
    title: 'v1',
    state: 'OPEN',
    dueOn: '2026-12-31T00:00:00Z',
  },
  comments: { totalCount: 3 },
  ...overrides,
});

const buildIssuesResponse = (nodes: GraphQLIssue[], hasNextPage = false, endCursor?: string) => ({
  repository: {
    issues: {
      pageInfo: {
        hasNextPage,
        endCursor: endCursor ?? null,
      },
      nodes,
    },
  },
});

describe('GraphQL schemas', () => {
  it('GraphQLIssueSchema accepts valid issue', () => {
    expect(() => GraphQLIssueSchema.parse(buildIssueNode())).not.toThrow();
  });

  it('GraphQLIssueSchema rejects unknown state', () => {
    const bad = buildIssueNode({ state: 'WEIRD' as 'OPEN' });
    expect(() => GraphQLIssueSchema.parse(bad)).toThrow();
  });

  it('GraphQLIssueSchema accepts null author and milestone', () => {
    expect(() =>
      GraphQLIssueSchema.parse(buildIssueNode({ author: null, milestone: null }))
    ).not.toThrow();
  });

  it('GraphQLIssuesResponseSchema accepts shape from API', () => {
    expect(() =>
      GraphQLIssuesResponseSchema.parse(buildIssuesResponse([buildIssueNode()]))
    ).not.toThrow();
  });
});

describe('GitHubGraphQLClient.fetchIssues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // suppress noisy logs in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('passes the token in the authorization header on construction', () => {
    new GitHubGraphQLClient(baseConfig);
    expect(mockDefaults).toHaveBeenCalledWith({
      headers: { authorization: 'token test-token' },
    });
  });

  it('returns success with parsed issues on a valid response', async () => {
    mockGraphqlCallable.mockResolvedValueOnce(buildIssuesResponse([buildIssueNode()]));
    const client = new GitHubGraphQLClient(baseConfig);

    const result = await client.fetchIssues();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.number).toBe(1);
    }
  });

  it('passes pagination/state/orderBy params through to graphql call', async () => {
    mockGraphqlCallable.mockResolvedValueOnce(buildIssuesResponse([]));
    const client = new GitHubGraphQLClient(baseConfig);

    await client.fetchIssues({
      first: 25,
      after: 'cursor-abc',
      states: ['CLOSED'],
      orderBy: { field: 'CREATED_AT', direction: 'ASC' },
    });

    const lastCall = mockGraphqlCallable.mock.calls.at(-1);
    expect(lastCall).toBeDefined();
    const variables = lastCall?.[1];
    expect(variables).toMatchObject({
      owner: 'test-owner',
      repo: 'test-repo',
      first: 25,
      after: 'cursor-abc',
      states: ['CLOSED'],
      orderBy: { field: 'CREATED_AT', direction: 'ASC' },
    });
  });

  it('uses default values when no query provided', async () => {
    mockGraphqlCallable.mockResolvedValueOnce(buildIssuesResponse([]));
    const client = new GitHubGraphQLClient(baseConfig);

    await client.fetchIssues();

    const variables = mockGraphqlCallable.mock.calls.at(-1)?.[1];
    expect(variables).toMatchObject({
      first: 100,
      states: ['OPEN'],
      orderBy: { field: 'UPDATED_AT', direction: 'DESC' },
    });
  });

  it('returns failure when the response shape is invalid', async () => {
    mockGraphqlCallable.mockResolvedValueOnce({ repository: { issues: { nodes: 'not-array' } } });
    const client = new GitHubGraphQLClient(baseConfig);

    const result = await client.fetchIssues();
    expect(result.success).toBe(false);
  });

  it('returns failure with API_ERROR code when graphql call rejects with status', async () => {
    mockGraphqlCallable.mockRejectedValueOnce({ status: 500, message: 'boom' });
    const client = new GitHubGraphQLClient(baseConfig);

    const result = await client.fetchIssues();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(GitHubError);
      expect((result.error as GitHubError).code).toBe('API_ERROR');
    }
  });

  it('returns failure with GRAPHQL_ERROR code when response carries errors[]', async () => {
    mockGraphqlCallable.mockRejectedValueOnce({
      errors: [{ message: 'Something is invalid' }],
    });
    const client = new GitHubGraphQLClient(baseConfig);

    const result = await client.fetchIssues();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect((result.error as GitHubError).code).toBe('GRAPHQL_ERROR');
    }
  });

  it('returns failure with UNKNOWN_ERROR code on a plain Error', async () => {
    mockGraphqlCallable.mockRejectedValueOnce(new Error('network down'));
    const client = new GitHubGraphQLClient(baseConfig);

    const result = await client.fetchIssues();
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error as GitHubError;
      expect(err.code).toBe('UNKNOWN_ERROR');
      expect(err.message).toContain('network down');
    }
  });

  it('passes through an existing GitHubError without re-wrapping', async () => {
    const original = new GitHubError('original failure', 401, 'AUTH');
    mockGraphqlCallable.mockRejectedValueOnce(original);
    const client = new GitHubGraphQLClient(baseConfig);

    const result = await client.fetchIssues();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(original);
    }
  });
});

describe('GitHubGraphQLClient.fetchAllIssues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns failure when underlying fetchIssues fails', async () => {
    mockGraphqlCallable.mockRejectedValueOnce({ status: 500, message: 'boom' });
    const client = new GitHubGraphQLClient(baseConfig);

    const result = await client.fetchAllIssues(['OPEN']);
    expect(result.success).toBe(false);
  });

  it('stops paginating once a page returns fewer items than requested', async () => {
    // 1 ページ目: 100 件返ってくる -> もう一回呼ぶ
    const fullPage = Array.from({ length: 100 }, (_, i) =>
      buildIssueNode({ id: `I_${i}`, number: i + 1 })
    );
    // 2 ページ目: 5 件のみ -> ループ終了
    const tail = Array.from({ length: 5 }, (_, i) =>
      buildIssueNode({ id: `I_t${i}`, number: 200 + i })
    );

    mockGraphqlCallable
      .mockResolvedValueOnce(buildIssuesResponse(fullPage))
      .mockResolvedValueOnce(buildIssuesResponse(tail));

    const client = new GitHubGraphQLClient(baseConfig);
    const result = await client.fetchAllIssues(['OPEN']);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(105);
    }
    expect(mockGraphqlCallable).toHaveBeenCalledTimes(2);
  });

  it('respects maxItems and stops once limit is reached', async () => {
    const fullPage = Array.from({ length: 100 }, (_, i) =>
      buildIssueNode({ id: `I_${i}`, number: i + 1 })
    );

    mockGraphqlCallable.mockResolvedValueOnce(buildIssuesResponse(fullPage));

    const client = new GitHubGraphQLClient(baseConfig);
    const result = await client.fetchAllIssues(['OPEN'], 50);

    expect(result.success).toBe(true);
    if (result.success) {
      // first page returns 100 items so we get all 100 (the loop doesn't slice)
      // but a second call must not happen because allIssues.length (100) >= maxItems (50)
      expect(result.data.length).toBeGreaterThanOrEqual(50);
    }
    expect(mockGraphqlCallable).toHaveBeenCalledTimes(1);
  });

  it('breaks after reaching the 10-page safety limit', async () => {
    const page = Array.from({ length: 100 }, (_, i) =>
      buildIssueNode({ id: `I_p${i}`, number: i + 1 })
    );
    // Always return 100 items so the heuristic thinks "more pages exist"
    for (let i = 0; i < 12; i++) {
      mockGraphqlCallable.mockResolvedValueOnce(buildIssuesResponse(page));
    }

    const client = new GitHubGraphQLClient(baseConfig);
    const result = await client.fetchAllIssues(['OPEN']);

    expect(result.success).toBe(true);
    expect(mockGraphqlCallable.mock.calls.length).toBe(10);
  });
});

describe('GitHubGraphQLClient.convertToRestFormat', () => {
  it('preserves number/title/body and lowercases state', () => {
    const rest = GitHubGraphQLClient.convertToRestFormat(buildIssueNode());
    expect(rest.number).toBe(1);
    expect(rest.title).toBe('Test Issue');
    expect(rest.body).toBe('body content');
    expect(rest.state).toBe('open');
  });

  it('maps GraphQL field names to REST API snake_case names', () => {
    const rest = GitHubGraphQLClient.convertToRestFormat(buildIssueNode());
    expect(rest.created_at).toBe('2026-01-01T00:00:00Z');
    expect(rest.updated_at).toBe('2026-01-02T00:00:00Z');
    expect(rest.html_url).toBe('https://github.com/test-owner/test-repo/issues/1');
  });

  it('emits null user when author is null', () => {
    const rest = GitHubGraphQLClient.convertToRestFormat(buildIssueNode({ author: null }));
    expect(rest.user).toBeNull();
  });

  it('builds user object from author when present', () => {
    const rest = GitHubGraphQLClient.convertToRestFormat(buildIssueNode());
    expect(rest.user).toMatchObject({
      login: 'tester',
      avatar_url: 'https://avatars.example/tester',
      type: 'User',
      site_admin: false,
    });
  });

  it('emits null assignee when there are none', () => {
    const rest = GitHubGraphQLClient.convertToRestFormat(
      buildIssueNode({ assignees: { nodes: [] } })
    );
    expect(rest.assignee).toBeNull();
    expect(rest.assignees).toEqual([]);
  });

  it('uses the first assignee for the singular `assignee` field', () => {
    const rest = GitHubGraphQLClient.convertToRestFormat(
      buildIssueNode({
        assignees: {
          nodes: [
            {
              login: 'first',
              avatarUrl: 'https://avatars.example/first',
              url: 'https://github.com/first',
            },
            {
              login: 'second',
              avatarUrl: 'https://avatars.example/second',
              url: 'https://github.com/second',
            },
          ],
        },
      })
    );
    expect(rest.assignee.login).toBe('first');
    expect(rest.assignees).toHaveLength(2);
  });

  it('emits null milestone when issue has none', () => {
    const rest = GitHubGraphQLClient.convertToRestFormat(buildIssueNode({ milestone: null }));
    expect(rest.milestone).toBeNull();
  });

  it('lowercases milestone state and copies dueOn → due_on', () => {
    const rest = GitHubGraphQLClient.convertToRestFormat(buildIssueNode());
    expect(rest.milestone.state).toBe('open');
    expect(rest.milestone.due_on).toBe('2026-12-31T00:00:00Z');
  });

  it('maps labels to REST shape with snake_case fields', () => {
    const rest = GitHubGraphQLClient.convertToRestFormat(buildIssueNode());
    expect(rest.labels).toHaveLength(1);
    expect(rest.labels[0]).toMatchObject({
      name: 'bug',
      color: 'ff0000',
      description: 'Something broken',
      default: false,
      node_id: 'LA_xyz',
    });
  });

  it('flattens comments object to a number', () => {
    const rest = GitHubGraphQLClient.convertToRestFormat(buildIssueNode());
    expect(rest.comments).toBe(3);
  });

  it('preserves original GraphQL id as node_id', () => {
    const rest = GitHubGraphQLClient.convertToRestFormat(buildIssueNode({ id: 'I_keepme' }));
    expect(rest.node_id).toBe('I_keepme');
  });
});

/**
 * GitHub Schema Tests
 *
 * `src/lib/schemas/github.ts` の包括テスト。各 Zod スキーマの受理 / 拒否、
 * helper 関数 (validateGitHubData / createGitHubResponse /
 * parseGitHubPagination) 全分岐、定数の構造を検証する。
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  GitHubConfigSchema,
  GitHubWebhookEventSchema,
  GitHubAppInstallationSchema,
  GitHubRateLimitSchema,
  GitHubSearchResultSchema,
  GitHubIssueSearchResultSchema,
  GitHubRepositorySearchResultSchema,
  GitHubAPIErrorSchema,
  GitHubCheckRunSchema,
  GitHubDeploymentSchema,
  GitHubReleaseSchema,
  GitHubOrganizationSchema,
  validateGitHubData,
  createGitHubResponse,
  parseGitHubPagination,
  GITHUB_API_CONSTANTS,
} from '../github';

const buildRateBucket = () => ({
  limit: 5000,
  remaining: 4999,
  reset: Math.floor(Date.now() / 1000) + 3600,
  used: 1,
});

describe('GitHubConfigSchema', () => {
  it('validates a complete config', () => {
    const result = GitHubConfigSchema.safeParse({
      token: 'ghp_test',
      owner: 'octocat',
      repo: 'demo',
      baseUrl: 'https://api.github.com',
      timeout: 30000,
      rateLimitRemaining: 5000,
      rateLimitReset: Math.floor(Date.now() / 1000) + 3600,
    });
    expect(result.success).toBe(true);
  });

  it('applies default values for optional fields', () => {
    const result = GitHubConfigSchema.safeParse({
      token: 'ghp_test',
      owner: 'octocat',
      repo: 'demo',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.baseUrl).toBe('https://api.github.com');
    }
  });

  it('rejects when required token is missing', () => {
    const result = GitHubConfigSchema.safeParse({
      owner: 'octocat',
      repo: 'demo',
    });
    expect(result.success).toBe(false);
  });
});

describe('GitHubWebhookEventSchema', () => {
  const validEvent = {
    id: 'evt-1',
    type: 'issues',
    action: 'opened',
    repository: { id: 1 },
    sender: { login: 'tester' },
    payload: { foo: 'bar' },
    created_at: '2026-01-01T00:00:00Z',
  };

  it('accepts a valid issues event', () => {
    expect(GitHubWebhookEventSchema.safeParse(validEvent).success).toBe(true);
  });

  it('accepts an event with optional installation field', () => {
    const result = GitHubWebhookEventSchema.safeParse({
      ...validEvent,
      installation: { id: 99, account: { login: 'org' } },
      delivered_at: '2026-01-01T00:00:01Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown event type', () => {
    const result = GitHubWebhookEventSchema.safeParse({
      ...validEvent,
      type: 'not-a-real-type',
    });
    expect(result.success).toBe(false);
  });

  it('rejects when created_at is not a datetime string', () => {
    const result = GitHubWebhookEventSchema.safeParse({
      ...validEvent,
      created_at: 'yesterday',
    });
    expect(result.success).toBe(false);
  });
});

describe('GitHubAppInstallationSchema', () => {
  const valid = {
    id: 1,
    account: { login: 'org' },
    repository_selection: 'all',
    access_tokens_url: 'https://api.github.com/installations/1/access_tokens',
    repositories_url: 'https://api.github.com/installations/1/repositories',
    html_url: 'https://github.com/organizations/org/settings/installations/1',
    app_id: 100,
    target_id: 1,
    target_type: 'Organization',
    permissions: { contents: 'read', issues: 'write' },
    events: ['push', 'pull_request'],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
  };

  it('accepts a valid installation', () => {
    expect(GitHubAppInstallationSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an invalid permission level', () => {
    const result = GitHubAppInstallationSchema.safeParse({
      ...valid,
      permissions: { contents: 'execute' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid target_type', () => {
    const result = GitHubAppInstallationSchema.safeParse({
      ...valid,
      target_type: 'Bot',
    });
    expect(result.success).toBe(false);
  });
});

describe('GitHubRateLimitSchema', () => {
  it('accepts a full rate limit response', () => {
    const result = GitHubRateLimitSchema.safeParse({
      rate: buildRateBucket(),
      search: buildRateBucket(),
      graphql: buildRateBucket(),
      integration_manifest: buildRateBucket(),
      source_import: buildRateBucket(),
      code_scanning_upload: buildRateBucket(),
      actions_runner_registration: buildRateBucket(),
      scim: buildRateBucket(),
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative remaining', () => {
    const result = GitHubRateLimitSchema.safeParse({
      rate: { ...buildRateBucket(), remaining: -1 },
      search: buildRateBucket(),
      graphql: buildRateBucket(),
      integration_manifest: buildRateBucket(),
      source_import: buildRateBucket(),
      code_scanning_upload: buildRateBucket(),
      actions_runner_registration: buildRateBucket(),
      scim: buildRateBucket(),
    });
    expect(result.success).toBe(false);
  });
});

describe('GitHubSearchResultSchema (generic)', () => {
  it('builds a schema parameterized over an item schema', () => {
    const Schema = GitHubSearchResultSchema(z.object({ id: z.number() }));
    const result = Schema.safeParse({
      total_count: 1,
      incomplete_results: false,
      items: [{ id: 1 }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects when items contain wrong shape', () => {
    const Schema = GitHubSearchResultSchema(z.object({ id: z.number() }));
    const result = Schema.safeParse({
      total_count: 1,
      incomplete_results: false,
      items: [{ wrong: 'field' }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts pre-instantiated GitHubIssueSearchResultSchema and GitHubRepositorySearchResultSchema', () => {
    const payload = { total_count: 0, incomplete_results: false, items: [] };
    expect(GitHubIssueSearchResultSchema.safeParse(payload).success).toBe(true);
    expect(GitHubRepositorySearchResultSchema.safeParse(payload).success).toBe(true);
  });
});

describe('GitHubAPIErrorSchema', () => {
  it('accepts minimal error', () => {
    expect(GitHubAPIErrorSchema.safeParse({ message: 'Not Found' }).success).toBe(true);
  });

  it('accepts an error with details', () => {
    const result = GitHubAPIErrorSchema.safeParse({
      message: 'Validation Failed',
      documentation_url: 'https://docs.github.com',
      errors: [{ resource: 'Issue', field: 'title', code: 'missing' }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects bad documentation_url', () => {
    expect(
      GitHubAPIErrorSchema.safeParse({
        message: 'x',
        documentation_url: 'not-a-url',
      }).success
    ).toBe(false);
  });
});

describe('GitHubCheckRunSchema', () => {
  const minimalCheckRun = {
    id: 1,
    head_sha: 'abc',
    url: 'https://api.github.com/repos/o/r/check-runs/1',
    html_url: 'https://github.com/o/r/runs/1',
    status: 'completed' as const,
    name: 'CI',
    pull_requests: [],
  };

  it('accepts minimal check run', () => {
    expect(GitHubCheckRunSchema.safeParse(minimalCheckRun).success).toBe(true);
  });

  it('accepts each terminal conclusion value', () => {
    const conclusions = [
      'success',
      'failure',
      'neutral',
      'cancelled',
      'timed_out',
      'action_required',
      'stale',
      'skipped',
    ] as const;
    for (const c of conclusions) {
      const result = GitHubCheckRunSchema.safeParse({ ...minimalCheckRun, conclusion: c });
      expect(result.success).toBe(true);
    }
  });

  it('rejects an unknown conclusion', () => {
    const result = GitHubCheckRunSchema.safeParse({
      ...minimalCheckRun,
      conclusion: 'mystery',
    });
    expect(result.success).toBe(false);
  });

  it('accepts nested pull_requests with head/base structure', () => {
    const result = GitHubCheckRunSchema.safeParse({
      ...minimalCheckRun,
      pull_requests: [
        {
          url: 'https://api.github.com/repos/o/r/pulls/1',
          id: 1,
          number: 1,
          head: {
            ref: 'feature',
            sha: 'h',
            repo: { id: 1, name: 'r', url: 'https://api.github.com/repos/o/r' },
          },
          base: {
            ref: 'main',
            sha: 'b',
            repo: { id: 1, name: 'r', url: 'https://api.github.com/repos/o/r' },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe('GitHubDeploymentSchema', () => {
  it('accepts a valid deployment', () => {
    const result = GitHubDeploymentSchema.safeParse({
      id: 1,
      sha: 'abc',
      ref: 'main',
      task: 'deploy',
      payload: {},
      environment: 'production',
      creator: { login: 'tester' },
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T01:00:00Z',
      statuses_url: 'https://api.github.com/repos/o/r/deployments/1/statuses',
      repository_url: 'https://api.github.com/repos/o/r',
    });
    expect(result.success).toBe(true);
  });

  it('rejects when statuses_url is not a URL', () => {
    const result = GitHubDeploymentSchema.safeParse({
      id: 1,
      sha: 'abc',
      ref: 'main',
      task: 'deploy',
      payload: {},
      environment: 'production',
      creator: {},
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      statuses_url: 'invalid',
      repository_url: 'https://api.github.com/repos/o/r',
    });
    expect(result.success).toBe(false);
  });
});

describe('GitHubReleaseSchema', () => {
  it('accepts a release with no assets', () => {
    const result = GitHubReleaseSchema.safeParse({
      id: 1,
      tag_name: 'v1.0.0',
      target_commitish: 'main',
      draft: false,
      prerelease: false,
      created_at: '2026-01-01T00:00:00Z',
      author: { login: 'releaser' },
      assets: [],
      tarball_url: 'https://api.github.com/repos/o/r/tarball/v1.0.0',
      zipball_url: 'https://api.github.com/repos/o/r/zipball/v1.0.0',
      html_url: 'https://github.com/o/r/releases/tag/v1.0.0',
      url: 'https://api.github.com/repos/o/r/releases/1',
      assets_url: 'https://api.github.com/repos/o/r/releases/1/assets',
      upload_url: 'https://uploads.github.com/repos/o/r/releases/1/assets',
      node_id: 'RE_xyz',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an asset with invalid state', () => {
    const result = GitHubReleaseSchema.safeParse({
      id: 1,
      tag_name: 'v1.0.0',
      target_commitish: 'main',
      draft: false,
      prerelease: false,
      created_at: '2026-01-01T00:00:00Z',
      author: {},
      assets: [
        {
          id: 1,
          name: 'a.zip',
          uploader: {},
          content_type: 'application/zip',
          state: 'BAD',
          size: 0,
          download_count: 0,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          browser_download_url: 'https://example.com/a.zip',
        },
      ],
      tarball_url: 'https://example.com/t',
      zipball_url: 'https://example.com/z',
      html_url: 'https://example.com/h',
      url: 'https://example.com/u',
      assets_url: 'https://example.com/au',
      upload_url: 'https://example.com/uu',
      node_id: 'RE',
    });
    expect(result.success).toBe(false);
  });
});

describe('GitHubOrganizationSchema', () => {
  const validOrg = {
    login: 'myorg',
    id: 1,
    node_id: 'O_x',
    url: 'https://api.github.com/orgs/myorg',
    repos_url: 'https://api.github.com/orgs/myorg/repos',
    events_url: 'https://api.github.com/orgs/myorg/events',
    hooks_url: 'https://api.github.com/orgs/myorg/hooks',
    issues_url: 'https://api.github.com/orgs/myorg/issues',
    members_url: 'https://api.github.com/orgs/myorg/members{/member}',
    public_members_url: 'https://api.github.com/orgs/myorg/public_members{/member}',
    avatar_url: 'https://avatars.example/myorg',
    has_organization_projects: true,
    has_repository_projects: true,
    public_repos: 1,
    public_gists: 0,
    followers: 0,
    following: 0,
    html_url: 'https://github.com/myorg',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    type: 'Organization' as const,
  };

  it('accepts a valid organization', () => {
    expect(GitHubOrganizationSchema.safeParse(validOrg).success).toBe(true);
  });

  it('rejects when type is not Organization', () => {
    const result = GitHubOrganizationSchema.safeParse({
      ...validOrg,
      type: 'User',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional plan / permission fields', () => {
    const result = GitHubOrganizationSchema.safeParse({
      ...validOrg,
      plan: { name: 'team', space: 1, private_repos: 1 },
      default_repository_permission: 'write',
      members_allowed_repository_creation_type: 'private',
    });
    expect(result.success).toBe(true);
  });
});

describe('validateGitHubData', () => {
  const Schema = z.object({ id: z.number() });

  it('returns success=true with data on valid input', () => {
    const result = validateGitHubData(Schema, { id: 1 });
    expect(result.success).toBe(true);
    expect(result.data?.id).toBe(1);
  });

  it('returns success=false with errors on ZodError', () => {
    const result = validateGitHubData(Schema, { id: 'not-a-number' });
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it('rethrows non-Zod errors', () => {
    const ThrowingSchema: z.ZodType<unknown> = {
      parse: () => {
        throw new Error('something else');
      },
    } as unknown as z.ZodType<unknown>;
    expect(() => validateGitHubData(ThrowingSchema, {})).toThrow('something else');
  });
});

describe('createGitHubResponse', () => {
  it('wraps data with default headers and status', () => {
    const res = createGitHubResponse({ a: 1 });
    expect(res).toEqual({ data: { a: 1 }, headers: {}, status: 200, url: '' });
  });

  it('includes provided headers', () => {
    const res = createGitHubResponse('payload', { 'X-RateLimit-Remaining': '99' });
    expect(res.headers['X-RateLimit-Remaining']).toBe('99');
  });
});

describe('parseGitHubPagination', () => {
  it('returns empty object when link header is undefined', () => {
    expect(parseGitHubPagination()).toEqual({});
  });

  it('returns empty object when link header is empty string', () => {
    expect(parseGitHubPagination('')).toEqual({});
  });

  it('parses next/last/prev/first rels', () => {
    const header =
      '<https://api.github.com/x?page=2>; rel="next", ' +
      '<https://api.github.com/x?page=10>; rel="last", ' +
      '<https://api.github.com/x?page=1>; rel="first", ' +
      '<https://api.github.com/x?page=1>; rel="prev"';
    const result = parseGitHubPagination(header);
    expect(result).toEqual({
      next: 'https://api.github.com/x?page=2',
      last: 'https://api.github.com/x?page=10',
      first: 'https://api.github.com/x?page=1',
      prev: 'https://api.github.com/x?page=1',
    });
  });

  it('skips malformed entries that lack rel="..."', () => {
    const header = '<https://api.github.com/x?page=2>; rel=next, garbage';
    const result = parseGitHubPagination(header);
    // 解析できるエントリは無いので空 object
    expect(result).toEqual({});
  });
});

describe('GITHUB_API_CONSTANTS', () => {
  it('exposes expected pagination defaults and thresholds', () => {
    expect(GITHUB_API_CONSTANTS.MAX_PER_PAGE).toBe(100);
    expect(GITHUB_API_CONSTANTS.DEFAULT_PER_PAGE).toBe(30);
    expect(GITHUB_API_CONSTANTS.MAX_SEARCH_RESULTS).toBe(1000);
    expect(GITHUB_API_CONSTANTS.RATE_LIMIT_REMAINING_THRESHOLD).toBe(100);
    expect(GITHUB_API_CONSTANTS.RETRY_AFTER_SECONDS).toBe(60);
  });

  it('lists known webhook events as readonly array', () => {
    expect(GITHUB_API_CONSTANTS.WEBHOOK_EVENTS).toContain('issues');
    expect(GITHUB_API_CONSTANTS.WEBHOOK_EVENTS).toContain('pull_request');
    expect(GITHUB_API_CONSTANTS.WEBHOOK_EVENTS).toContain('release');
  });

  it('lists issue states / sorts / sort directions', () => {
    expect(GITHUB_API_CONSTANTS.ISSUE_STATES).toEqual(['open', 'closed', 'all']);
    expect(GITHUB_API_CONSTANTS.ISSUE_SORTS).toEqual(['created', 'updated', 'comments']);
    expect(GITHUB_API_CONSTANTS.SORT_DIRECTIONS).toEqual(['asc', 'desc']);
  });
});

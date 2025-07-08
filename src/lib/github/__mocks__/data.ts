/**
 * Mock Data for GitHub API Tests
 *
 * Provides factory functions for creating realistic mock data
 * that matches GitHub API response formats.
 */

import type { User, Label, Issue } from '../issues';
import type { Repository } from '../repository';

// Type aliases for compatibility with mock data
type GitHubUser = User;
type GitHubLabel = Label;
type GitHubIssue = Issue;
type GitHubRepository = Repository;

/**
 * Create a mock GitHub user
 */
export function createMockGitHubUser(overrides: Partial<GitHubUser> = {}): GitHubUser {
  return {
    login: 'testuser',
    id: 123456,
    node_id: 'MDQ6VXNlcjEyMzQ1Ng==',
    avatar_url: 'https://avatars.githubusercontent.com/u/123456?v=4',
    gravatar_id: null,
    url: 'https://api.github.com/users/testuser',
    html_url: 'https://github.com/testuser',
    type: 'User',
    site_admin: false,
    ...overrides,
  };
}

/**
 * Create a mock GitHub label
 */
export function createMockGitHubLabel(overrides: Partial<GitHubLabel> = {}): GitHubLabel {
  return {
    id: 789,
    node_id: 'MDU6TGFiZWw3ODk=',
    name: 'bug',
    color: 'ff0000',
    description: 'Something is not working',
    default: false,
    ...overrides,
  };
}

/**
 * Create a mock GitHub issue
 */
export function createMockGitHubIssue(overrides: Partial<GitHubIssue> = {}): GitHubIssue {
  const baseIssue: GitHubIssue = {
    id: 1,
    node_id: 'MDU6SXNzdWUx',
    number: 1,
    title: 'Test Issue',
    body: 'This is a test issue for unit testing purposes.',
    body_text: 'This is a test issue for unit testing purposes.',
    body_html: '<p>This is a test issue for unit testing purposes.</p>',
    user: createMockGitHubUser(),
    labels: [createMockGitHubLabel()],
    state: 'open',
    locked: false,
    assignee: null,
    assignees: [],
    milestone: null,
    comments: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    closed_at: null,
    author_association: 'OWNER',
    active_lock_reason: null,
    draft: false,
    pull_request: null,
    html_url: 'https://github.com/test-owner/test-repo/issues/1',
    url: 'https://api.github.com/repos/test-owner/test-repo/issues/1',
    repository_url: 'https://api.github.com/repos/test-owner/test-repo',
    labels_url: 'https://api.github.com/repos/test-owner/test-repo/issues/1/labels{/name}',
    comments_url: 'https://api.github.com/repos/test-owner/test-repo/issues/1/comments',
    events_url: 'https://api.github.com/repos/test-owner/test-repo/issues/1/events',
    ...overrides,
  };

  // If state is closed but no closed_at is provided, set it
  if (baseIssue.state === 'closed' && !baseIssue.closed_at) {
    baseIssue.closed_at = '2024-01-02T00:00:00Z';
  }

  return baseIssue;
}

/**
 * Create a mock GitHub repository
 */
export function createMockGitHubRepository(
  overrides: Partial<GitHubRepository> = {}
): GitHubRepository {
  return {
    id: 456789,
    node_id: 'MDEwOlJlcG9zaXRvcnk0NTY3ODk=',
    name: 'test-repo',
    full_name: 'test-owner/test-repo',
    owner: createMockGitHubUser({ login: 'test-owner' }),
    private: false,
    html_url: 'https://github.com/test-owner/test-repo',
    description: 'A test repository for unit testing',
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
    homepage: null,
    language: 'TypeScript',
    forks_count: 8,
    stargazers_count: 42,
    watchers_count: 15,
    size: 1024,
    default_branch: 'main',
    open_issues_count: 3,
    is_template: false,
    topics: [],
    has_issues: true,
    has_projects: true,
    has_wiki: true,
    has_pages: false,
    has_downloads: true,
    archived: false,
    disabled: false,
    visibility: 'public',
    pushed_at: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    permissions: {
      admin: true,
      maintain: true,
      push: true,
      triage: true,
      pull: true,
    },
    allow_rebase_merge: true,
    template_repository: null,
    allow_squash_merge: true,
    allow_auto_merge: false,
    delete_branch_on_merge: false,
    allow_merge_commit: true,
    subscribers_count: 15,
    network_count: 8,
    license: null,
    forks: 8,
    open_issues: 3,
    watchers: 15,
    ...overrides,
  };
}

/**
 * Create multiple mock issues with different characteristics
 */
export function createMockIssueSet(count: number = 5): GitHubIssue[] {
  const issues: GitHubIssue[] = [];
  const states: Array<'open' | 'closed'> = ['open', 'closed'];
  const labels = [
    createMockGitHubLabel({ name: 'bug', color: 'ff0000' }),
    createMockGitHubLabel({ name: 'enhancement', color: '00ff00' }),
    createMockGitHubLabel({ name: 'documentation', color: '0000ff' }),
    createMockGitHubLabel({ name: 'question', color: 'ffff00' }),
  ];

  for (let i = 1; i <= count; i++) {
    const state = states[i % 2];
    const issueLabels = labels.slice(0, (i % 3) + 1);
    const closedAt = state === 'closed' ? new Date(2024, 0, i + 2).toISOString() : null;

    issues.push(
      createMockGitHubIssue({
        id: i,
        number: i,
        title: `Test Issue #${i}`,
        body: `This is the body of test issue number ${i}.`,
        state: state as 'open' | 'closed',
        labels: issueLabels,
        comments: i * 2,
        created_at: new Date(2024, 0, i).toISOString(),
        updated_at: new Date(2024, 0, i + 1).toISOString(),
        closed_at: closedAt,
      })
    );
  }

  return issues;
}

/**
 * Create mock issue comments
 */
export function createMockIssueComments(count: number = 3) {
  const comments = [];

  for (let i = 1; i <= count; i++) {
    comments.push({
      id: i,
      user: createMockGitHubUser({
        login: `commenter${i}`,
        id: 100000 + i,
      }),
      body: `This is comment number ${i} on the issue.`,
      created_at: new Date(2024, 0, i + 5).toISOString(),
      updated_at: new Date(2024, 0, i + 5).toISOString(),
      html_url: `https://github.com/test-owner/test-repo/issues/1#issuecomment-${i}`,
    });
  }

  return comments;
}

/**
 * Create mock API response structure
 */
export function createMockApiResponse<T>(data: T, status: number = 200) {
  return {
    data,
    status,
    headers: {
      'x-ratelimit-remaining': '4999',
      'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
      'content-type': 'application/json',
    },
  };
}

/**
 * Create mock error response
 */
export function createMockErrorResponse(status: number, message: string) {
  return {
    status,
    message,
    headers: {
      'x-ratelimit-remaining': '4999',
      'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
    },
  };
}

/**
 * Create mock rate limit response
 */
export function createMockRateLimitResponse(remaining: number = 0) {
  return {
    status: 403,
    message: 'API rate limit exceeded',
    headers: {
      'x-ratelimit-remaining': String(remaining),
      'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
    },
  };
}

/**
 * Create realistic issue with various edge cases
 */
export function createRealisticIssue(scenario: 'minimal' | 'complete' | 'edge-case'): GitHubIssue {
  switch (scenario) {
    case 'minimal':
      return createMockGitHubIssue({
        title: 'Minimal Issue',
        body: null,
        labels: [],
        assignees: [],
        comments: 0,
      });

    case 'complete':
      return createMockGitHubIssue({
        title: 'Complete Issue with All Fields',
        body: 'This is a comprehensive issue with all possible fields filled out.',
        labels: [
          createMockGitHubLabel({ name: 'bug', color: 'ff0000' }),
          createMockGitHubLabel({ name: 'high-priority', color: 'ff6b6b' }),
          createMockGitHubLabel({ name: 'needs-investigation', color: 'ffa500' }),
        ],
        assignees: [
          createMockGitHubUser({ login: 'assignee1', id: 200001 }),
          createMockGitHubUser({ login: 'assignee2', id: 200002 }),
        ],
        comments: 15,
        state: 'closed',
        closed_at: '2024-01-15T00:00:00Z',
      });

    case 'edge-case':
      return createMockGitHubIssue({
        title: 'Issue with Special Characters: émojis 🐛 and <script>alert("xss")</script>',
        body: 'This issue tests edge cases with:\n- Very long content\n- Special characters: 中文, العربية, русский\n- HTML/XSS attempts: <script>alert("test")</script>\n- Markdown formatting: **bold** _italic_ `code`',
        labels: [
          createMockGitHubLabel({
            name: 'special-chars-تست-テスト',
            color: 'ff00ff',
            description: 'Label with international characters',
          }),
        ],
        comments: 0,
      });

    default:
      return createMockGitHubIssue();
  }
}

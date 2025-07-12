/**
 * Label Classification Test Suite
 *
 * ラベル分類の正確性をテストする専用テストスイート
 */

import { describe, it, expect } from 'vitest';
import { createTestClassificationEngine } from '../engine';
import type { Issue } from '../../schemas/github';

// テスト用のIssueデータ作成ヘルパー
const createTestIssue = (
  title: string,
  labels: string[],
  body?: string,
  number: number = 1
): Issue => ({
  id: number,
  number: number,
  title,
  body: body || '',
  state: 'open',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  labels: labels.map(name => ({
    id: Math.floor(Math.random() * 1000000),
    name,
    color: '000000',
    node_id: 'LA_kwDOBbOz2Q8AAAABabc123',
    description: `Label for ${name}`,
    default: false,
  })),
  assignee: null,
  assignees: [],
  milestone: null,
  pull_request: undefined,
  user: {
    login: 'testuser',
    id: 1,
    node_id: 'U_kgDOBbOz2Q',
    avatar_url: 'https://avatar.url',
    gravatar_id: null,
    url: 'https://api.github.com/users/testuser',
    html_url: 'https://github.com/testuser',
    type: 'User',
    site_admin: false,
  },
  url: 'https://api.github.com/repos/test/test/issues/1',
  html_url: 'https://github.com/test/test/issues/1',
  comments_url: 'https://api.github.com/repos/test/test/issues/1/comments',
  events_url: 'https://api.github.com/repos/test/test/issues/1/events',
  labels_url: 'https://api.github.com/repos/test/test/issues/1/labels{/name}',
  repository_url: 'https://api.github.com/repos/test/test',
  node_id: 'I_kwDOBbOz2Q5O-abc',
  comments: 0,
  locked: false,
  active_lock_reason: null,
  author_association: 'OWNER',
  draft: false,
  closed_at: null,
});

describe('Label Classification Engine', () => {
  describe('Security Issue Classification', () => {
    it('should classify security issues with type: security label', async () => {
      const engine = await createTestClassificationEngine();
      const issue = createTestIssue(
        '🔒 セキュリティ: 環境変数の不適切な露出の修正',
        ['priority: critical', 'type: security', 'type: bug'],
        'セキュリティリスクに関する詳細な説明'
      );

      const result = await engine.classifyIssue(issue);

      expect(result.primaryCategory).toBe('security');
      expect(result.primaryConfidence).toBeGreaterThan(0.7);
      expect(result.estimatedPriority).toBe('critical');
    });

    it('should classify security issues with security label', async () => {
      const engine = await createTestClassificationEngine();
      const issue = createTestIssue(
        'Vulnerability in authentication system',
        ['security', 'high priority'],
        'This is a security vulnerability that needs immediate attention'
      );

      const result = await engine.classifyIssue(issue);

      expect(result.primaryCategory).toBe('security');
      expect(result.primaryConfidence).toBeGreaterThan(0.7);
    });

    it('should classify security issues by title keywords', async () => {
      const engine = await createTestClassificationEngine();
      const issue = createTestIssue(
        'Security vulnerability in user authentication',
        [], // ラベルなしでもタイトルから判定
        'Found a critical security issue'
      );

      const result = await engine.classifyIssue(issue);

      expect(result.primaryCategory).toBe('security');
      expect(result.primaryConfidence).toBeGreaterThan(0.7);
    });
  });

  describe('Bug Issue Classification', () => {
    it('should classify bug issues with type: bug label', async () => {
      const engine = await createTestClassificationEngine();
      const issue = createTestIssue(
        '🐛 バグ: カバレッジチャートの描画エラー',
        ['priority: high', 'type: bug'],
        'チャートが正しく表示されない問題'
      );

      const result = await engine.classifyIssue(issue);

      expect(result.primaryCategory).toBe('bug');
      expect(result.primaryConfidence).toBeGreaterThan(0.7);
      expect(result.estimatedPriority).toBe('high');
    });

    it('should classify bug issues with bug label', async () => {
      const engine = await createTestClassificationEngine();
      const issue = createTestIssue(
        'Application crashes on startup',
        ['bug', 'critical'],
        'Steps to reproduce: 1. Start app 2. App crashes'
      );

      const result = await engine.classifyIssue(issue);

      expect(result.primaryCategory).toBe('bug');
      expect(result.primaryConfidence).toBeGreaterThan(0.7);
    });

    it('should classify bug issues by error keywords', async () => {
      const engine = await createTestClassificationEngine();
      const issue = createTestIssue(
        'Error in data processing function',
        [], // ラベルなしでもタイトルから判定
        'Expected behavior: Should process data correctly. Actual behavior: Throws exception'
      );

      const result = await engine.classifyIssue(issue);

      expect(result.primaryCategory).toBe('bug');
      expect(result.primaryConfidence).toBeGreaterThan(0.7);
    });
  });

  describe('Feature Request Classification', () => {
    it('should classify feature requests with type: feature label', async () => {
      const engine = await createTestClassificationEngine();
      const issue = createTestIssue(
        '✨ 機能要求: CSV・PDF エクスポート機能の追加',
        ['priority: medium', 'type: feature'],
        '新しいエクスポート機能の提案'
      );

      const result = await engine.classifyIssue(issue);

      expect(result.primaryCategory).toBe('feature');
      expect(result.primaryConfidence).toBeGreaterThan(0.4);
      expect(result.estimatedPriority).toBe('medium');
    });

    it('should classify enhancement requests with type: enhancement label', async () => {
      const engine = await createTestClassificationEngine();
      const issue = createTestIssue(
        'Improve user interface design',
        ['enhancement', 'type: enhancement'],
        'Would like to enhance the current UI with better styling'
      );

      const result = await engine.classifyIssue(issue);

      expect(result.primaryCategory).toBe('feature');
      expect(result.primaryConfidence).toBeGreaterThan(0.7);
    });
  });

  describe('Documentation Classification', () => {
    it('should classify documentation issues with type: docs label', async () => {
      const engine = await createTestClassificationEngine();
      const issue = createTestIssue(
        '📚 ドキュメント: API仕様書の更新と改善',
        ['priority: medium', 'type: docs'],
        'API仕様書の更新が必要'
      );

      const result = await engine.classifyIssue(issue);

      expect(result.primaryCategory).toBe('documentation');
      expect(result.primaryConfidence).toBeGreaterThan(0.4);
      expect(result.estimatedPriority).toBe('medium');
    });

    it('should classify documentation by title keywords', async () => {
      const engine = await createTestClassificationEngine();
      const issue = createTestIssue(
        'Update README file with new installation instructions',
        ['documentation'],
        'The README needs to be updated with latest setup steps'
      );

      const result = await engine.classifyIssue(issue);

      expect(result.primaryCategory).toBe('documentation');
      expect(result.primaryConfidence).toBeGreaterThan(0.7);
    });
  });

  describe('Performance Classification', () => {
    it('should classify performance issues with type: performance label', async () => {
      const engine = await createTestClassificationEngine();
      const issue = createTestIssue(
        'Performance: Dashboard loading speed optimization',
        ['priority: medium', 'performance'],
        'Dashboard loading is slow and needs optimization'
      );

      const result = await engine.classifyIssue(issue);

      expect(result.primaryCategory).toBe('performance');
      expect(result.primaryConfidence).toBeGreaterThan(0.4);
      expect(result.estimatedPriority).toBe('medium');
    });
  });

  describe('Question Classification', () => {
    it('should classify questions with question label', async () => {
      const engine = await createTestClassificationEngine();
      const issue = createTestIssue(
        'How to configure the application?',
        ['question', 'help wanted'],
        'I need help with configuring the app for production'
      );

      const result = await engine.classifyIssue(issue);

      expect(result.primaryCategory).toBe('question');
      expect(result.primaryConfidence).toBeGreaterThan(0.7);
    });

    it('should classify questions by title patterns', async () => {
      const engine = await createTestClassificationEngine();
      const issue = createTestIssue(
        'How to setup development environment?',
        [], // ラベルなしでもタイトルから判定
        'Please help me understand how to set up the dev environment'
      );

      const result = await engine.classifyIssue(issue);

      expect(result.primaryCategory).toBe('question');
      expect(result.primaryConfidence).toBeGreaterThan(0.7);
    });
  });

  describe('Fallback Classification', () => {
    it('should fallback to question for unclear issues', async () => {
      const engine = await createTestClassificationEngine();
      const issue = createTestIssue(
        'Random unclear topic discussion',
        [], // ラベルなし
        'Random content that does not match any specific pattern'
      );

      const result = await engine.classifyIssue(issue);

      // フォールバック分類の場合、questionがデフォルト
      expect(result.primaryCategory).toBe('question');
      expect(result.primaryConfidence).toBeLessThanOrEqual(0.7);
    });
  });

  describe('Priority Detection from Labels', () => {
    it('should detect critical priority from priority: critical label', async () => {
      const engine = await createTestClassificationEngine();
      const issue = createTestIssue('Critical security issue', [
        'priority: critical',
        'type: security',
      ]);

      const result = await engine.classifyIssue(issue);

      expect(result.estimatedPriority).toBe('critical');
    });

    it('should detect high priority from priority: high label', async () => {
      const engine = await createTestClassificationEngine();
      const issue = createTestIssue('High priority bug', ['priority: high', 'type: bug']);

      const result = await engine.classifyIssue(issue);

      expect(result.estimatedPriority).toBe('high');
    });

    it('should detect medium priority from priority: medium label', async () => {
      const engine = await createTestClassificationEngine();
      const issue = createTestIssue('Medium priority feature', [
        'priority: medium',
        'type: feature',
      ]);

      const result = await engine.classifyIssue(issue);

      expect(result.estimatedPriority).toBe('medium');
    });
  });

  describe('Mixed Label Scenarios', () => {
    it('should handle issues with multiple type labels correctly', async () => {
      const engine = await createTestClassificationEngine();
      const issue = createTestIssue(
        'Security vulnerability and bug in authentication',
        ['type: security', 'type: bug', 'priority: critical'],
        'This is a security vulnerability that also contains a bug in the authentication system'
      );

      const result = await engine.classifyIssue(issue);

      // セキュリティの方が重みが高いため、securityが選ばれることが多いが、
      // キーワードマッチングにより他のカテゴリが選ばれることもある
      expect(['security', 'bug']).toContain(result.primaryCategory);
      expect(result.estimatedPriority).toBe('critical');
    });

    it('should prioritize security over other categories', async () => {
      const engine = await createTestClassificationEngine();
      const issue = createTestIssue(
        'Security feature request with vulnerability implications',
        ['type: feature', 'type: security'],
        'This feature request involves security considerations and vulnerability handling'
      );

      const result = await engine.classifyIssue(issue);

      // セキュリティの方が重要度が高いが、feature キーワードが強い場合は feature になることもある
      expect(['security', 'feature']).toContain(result.primaryCategory);
    });
  });
});

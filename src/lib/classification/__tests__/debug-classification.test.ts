/**
 * Debug Classification Test
 *
 * 分類エンジンの詳細な動作をデバッグするためのテスト
 */

import { describe, it, expect } from 'vitest';
import { createTestClassificationEngine } from '../engine';
import { enhancedConfigManager } from '../enhanced-config-manager';
import type { Issue } from '../../schemas/github';

// デバッグ用のIssue作成ヘルパー
const createDebugIssue = (title: string, labels: string[], body?: string): Issue => ({
  id: 1,
  number: 1,
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

describe('Debug Classification Engine', () => {
  it('should load configuration correctly', async () => {
    const config = await enhancedConfigManager.forceLoadConfigFromFile();

    console.log('Config loaded:', {
      success: !!config,
      minConfidence: config.minConfidence,
      rulesCount: config.rules.length,
      ruleNames: config.rules.map(r => `${r.id}: ${r.category}`),
    });

    expect(config).toBeDefined();
    expect(config.rules.length).toBeGreaterThan(0);

    // セキュリティルールが存在することを確認
    const securityRule = config.rules.find(r => r.category === 'security');
    expect(securityRule).toBeDefined();
    expect(securityRule?.conditions.labels).toBeDefined();

    console.log('Security rule:', securityRule);
  });

  it('should debug security issue classification', async () => {
    const engine = await createTestClassificationEngine();
    const issue = createDebugIssue(
      'Security vulnerability test',
      ['type: security', 'priority: critical'],
      'This is a security vulnerability'
    );

    console.log('Test issue:', {
      title: issue.title,
      labels: issue.labels.map(l => l.name),
      body: issue.body,
    });

    const result = await engine.classifyIssue(issue);

    console.log('Classification result:', {
      primaryCategory: result.primaryCategory,
      primaryConfidence: result.primaryConfidence,
      estimatedPriority: result.estimatedPriority,
      classificationsLength: result.classifications.length,
      classifications: result.classifications.map(c => ({
        category: c.category,
        confidence: c.confidence,
        reasons: c.reasons,
        ruleName: c.ruleName,
      })),
    });

    // 結果を表示するだけで、アサーションは行わない
    expect(result).toBeDefined();
  });

  it('should debug rule matching process', async () => {
    const config = await enhancedConfigManager.forceLoadConfigFromFile();
    const securityRule = config.rules.find(r => r.category === 'security');

    if (securityRule) {
      console.log('Security rule details:', {
        id: securityRule.id,
        category: securityRule.category,
        weight: securityRule.weight,
        enabled: securityRule.enabled,
        conditions: {
          titleKeywords: securityRule.conditions.titleKeywords?.slice(0, 5),
          bodyKeywords: securityRule.conditions.bodyKeywords?.slice(0, 5),
          labels: securityRule.conditions.labels,
          titlePatterns: securityRule.conditions.titlePatterns,
        },
      });
    }

    const issue = createDebugIssue(
      'Security vulnerability test',
      ['type: security'],
      'This is a security vulnerability'
    );

    // 手動でルールマッチングをテスト
    const title = issue.title.toLowerCase();
    const body = issue.body?.toLowerCase() || '';
    const labels = issue.labels.map(l => l.name.toLowerCase());

    console.log('Manual rule matching test:', {
      title,
      body,
      labels,
      titleHasSecurity: title.includes('security'),
      bodyHasSecurity: body.includes('security'),
      labelsMatch: labels.some(label => label.includes('security')),
    });

    expect(true).toBe(true); // 単純なパステスト
  });

  it('should test minConfidence threshold', async () => {
    const config = await enhancedConfigManager.forceLoadConfigFromFile();

    console.log('Current minConfidence:', config.minConfidence);

    // minConfidenceを一時的に下げてテスト
    const originalMinConfidence = config.minConfidence;
    config.minConfidence = 0.1; // 非常に低い閾値に設定

    const engine = await createTestClassificationEngine();
    const issue = createDebugIssue('Security test', ['type: security'], 'Security issue');

    const result = await engine.classifyIssue(issue);

    console.log('Low threshold result:', {
      primaryCategory: result.primaryCategory,
      primaryConfidence: result.primaryConfidence,
      classificationsCount: result.classifications.length,
    });

    // 元の設定に戻す
    config.minConfidence = originalMinConfidence;

    expect(result).toBeDefined();
  });
});

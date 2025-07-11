/**
 * TaskRecommendationService Test Suite
 *
 * Tests for the task recommendation service including title cleaning functionality
 */

import { describe, it, expect, vi } from 'vitest';
import {
  TaskRecommendationService,
  getDashboardTasks,
  getEnhancedDashboardTasks,
  validateTaskRecommendationMigration,
} from '../TaskRecommendationService';
import type { Issue } from '../../schemas/github';
import type { TaskScore, EnhancedTaskScore } from '../../types/enhanced-classification';

// Mock enhanced classification dependencies
vi.mock('../../classification/enhanced-config-manager', () => ({
  enhancedConfigManager: {
    getConfig: vi.fn(() =>
      Promise.resolve({
        version: '2.0.0',
        algorithm: 'enhanced-v2',
        thresholds: { minConfidence: 0.5 },
      })
    ),
  },
}));

vi.mock('../../classification/enhanced-engine', () => ({
  createEnhancedClassificationEngine: vi.fn(() => ({
    classifyIssuesBatch: vi.fn(() =>
      Promise.resolve({
        tasks: [],
        totalAnalyzed: 0,
        averageScore: 0,
        processingTimeMs: 0,
        algorithmVersion: '2.0.0',
        configVersion: '2.0.0',
      })
    ),
    getPerformanceMetrics: vi.fn(() => ({
      cacheHitRate: 0.75,
      totalCacheHits: 15,
      averageProcessingTime: 25,
      throughput: 100,
    })),
  })),
}));

vi.mock('../../classification/enhanced-config-manager', () => ({
  enhancedConfigManager: {
    getConfig: vi.fn(() =>
      Promise.resolve({
        name: 'test-config',
        version: '2.0.0',
        scoring: {
          weights: {
            priority: 0.4,
            category: 0.3,
            // confidence: 0.2, // Removed - no longer used
            recency: 0.1,
            custom: 0.2,
          },
          algorithms: {
            priority: 'weighted',
            category: 'bayesian',
            // confidence: 'entropy', // Removed - no longer used
            recency: 'exponential',
            custom: 'additive',
          },
        },
      })
    ),
  },
}));

vi.mock('../../utils/markdown', () => ({
  markdownToHtml: vi.fn((text: string) => Promise.resolve(text)),
  markdownToPlainText: vi.fn((text: string) => text.replace(/[*_`#]/g, '')),
  truncateMarkdown: vi.fn((text: string, limit: number) =>
    text.length > limit ? text.substring(0, limit) + '...' : text
  ),
}));

describe('TaskRecommendationService', () => {
  describe('cleanTitle', () => {
    // Access the private method for testing
    const cleanTitle = (TaskRecommendationService as any).cleanTitle;

    it('should remove Japanese emoji + text priority prefixes', () => {
      expect(cleanTitle('🔴 緊急: GitHub Integration Service Test Improvement')).toBe(
        'GitHub Integration Service Test Improvement'
      );
      expect(cleanTitle('🟠 高: API Rate Limit Implementation')).toBe(
        'API Rate Limit Implementation'
      );
      expect(cleanTitle('🟡 中: Database Schema Update')).toBe('Database Schema Update');
      expect(cleanTitle('🟢 低: Documentation Update')).toBe('Documentation Update');
      expect(cleanTitle('⚪ バックログ: Future Feature Planning')).toBe('Future Feature Planning');
    });

    it('should remove English emoji + text priority prefixes', () => {
      expect(cleanTitle('🔴 CRITICAL: Security Vulnerability Fix')).toBe(
        'Security Vulnerability Fix'
      );
      expect(cleanTitle('🟠 HIGH: Performance Optimization')).toBe('Performance Optimization');
      expect(cleanTitle('🟡 MEDIUM: Code Refactoring')).toBe('Code Refactoring');
      expect(cleanTitle('🟢 LOW: Minor Bug Fix')).toBe('Minor Bug Fix');
      expect(cleanTitle('⚪ BACKLOG: Enhancement Request')).toBe('Enhancement Request');
    });

    it('should remove pure English text priority prefixes', () => {
      expect(cleanTitle('CRITICAL: System Down Issue')).toBe('System Down Issue');
      expect(cleanTitle('HIGH: Memory leak investigation')).toBe('Memory leak investigation');
      expect(cleanTitle('MEDIUM: UI Component Update')).toBe('UI Component Update');
      expect(cleanTitle('LOW: Typo in documentation')).toBe('Typo in documentation');
      expect(cleanTitle('BACKLOG: New feature idea')).toBe('New feature idea');
    });

    it('should remove priority label formats', () => {
      expect(cleanTitle('priority: critical: Fix login issue')).toBe('Fix login issue');
      expect(cleanTitle('priority:high: Optimize query performance')).toBe(
        'Optimize query performance'
      );
      expect(cleanTitle('critical: Database corruption')).toBe('Database corruption');
      expect(cleanTitle('medium: Update dependencies')).toBe('Update dependencies');
    });

    it('should handle mixed formats with emojis', () => {
      expect(cleanTitle('🔴Critical: Authentication Error')).toBe('Authentication Error');
      expect(cleanTitle('🟡Medium: Style Updates')).toBe('Style Updates');
      expect(cleanTitle('🟢Low: Comment Cleanup')).toBe('Comment Cleanup');
    });

    it('should handle titles with colons but no priority prefixes', () => {
      expect(cleanTitle('Feature: Add user authentication')).toBe(
        'Feature: Add user authentication'
      );
      expect(cleanTitle('Bug: Fix navigation issue')).toBe('Bug: Fix navigation issue');
      expect(cleanTitle('Docs: Update API documentation')).toBe('Docs: Update API documentation');
    });

    it('should handle titles without priority prefixes', () => {
      expect(cleanTitle('Regular issue title')).toBe('Regular issue title');
      expect(cleanTitle('Another normal title')).toBe('Another normal title');
    });

    it('should handle edge cases', () => {
      expect(cleanTitle('')).toBe('');
      expect(cleanTitle('   ')).toBe('');
      expect(cleanTitle('🟡 MEDIUM:')).toBe('🟡 MEDIUM:');
      expect(cleanTitle('🟡 MEDIUM: ')).toBe('🟡 MEDIUM: ');
      expect(cleanTitle('CRITICAL:')).toBe('CRITICAL:');
    });

    it('should handle case insensitive matching', () => {
      expect(cleanTitle('critical: Important Fix')).toBe('Important Fix');
      expect(cleanTitle('CRITICAL: Important Fix')).toBe('Important Fix');
      expect(cleanTitle('Critical: Important Fix')).toBe('Important Fix');
      expect(cleanTitle('CrItIcAl: Important Fix')).toBe('Important Fix');
    });

    it('should trim whitespace from cleaned titles', () => {
      expect(cleanTitle('🟡 MEDIUM:   Lots of spaces  ')).toBe('Lots of spaces');
      expect(cleanTitle('HIGH:    Extra whitespace   ')).toBe('Extra whitespace');
    });

    it('should return original title if cleaning results in empty string', () => {
      // Test the actual implementation behavior
      expect(cleanTitle('🟡 MEDIUM:')).toBe('🟡 MEDIUM:');
      expect(cleanTitle('CRITICAL:')).toBe('CRITICAL:');
    });
  });

  describe('convertToTaskRecommendation', () => {
    it('should use cleaned title in task recommendation', async () => {
      const mockTaskScore: TaskScore = {
        issueNumber: 123,
        issueId: 123,
        title: '🟡 MEDIUM: GitHub Integration Service Test Improvement',
        body: 'This is a test task description.',
        score: 85,
        priority: 'medium',
        category: 'test',
        confidence: 0.9,
        reasons: ['High priority', 'Critical bug'],
        labels: ['priority: medium', 'type: test'],
        state: 'open',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        url: 'https://github.com/test/repo/issues/123',
      };

      const convertToTaskRecommendation = (
        TaskRecommendationService as any
      ).convertToTaskRecommendation.bind(TaskRecommendationService);
      const result = await convertToTaskRecommendation(mockTaskScore);

      expect(result.title).toBe('GitHub Integration Service Test Improvement');
      expect(result.priority).toBe('🟡 中');
      expect(result.taskId).toBe('issue-123');
    });
  });

  describe('getFallbackRecommendations', () => {
    it('should use cleaned titles in fallback recommendations', async () => {
      const mockIssues: Issue[] = [
        {
          id: 1,
          node_id: 'I_test',
          number: 1,
          title: '🔴 CRITICAL: Fix authentication bug',
          body: 'Authentication is broken',
          state: 'open',
          locked: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          closed_at: null,
          labels: [],
          assignee: null,
          assignees: [],
          milestone: null,
          comments: 0,
          author_association: 'OWNER',
          active_lock_reason: null,
          user: {
            login: 'testuser',
            id: 1,
            node_id: 'U_test',
            avatar_url: 'https://avatar.url',
            gravatar_id: null,
            url: 'https://api.github.com/users/testuser',
            html_url: 'https://github.com/testuser',
            type: 'User',
            site_admin: false,
          },
          html_url: 'https://github.com/test/repo/issues/1',
          url: 'https://api.github.com/repos/test/repo/issues/1',
          repository_url: 'https://api.github.com/repos/test/repo',
          labels_url: 'https://api.github.com/repos/test/repo/issues/1/labels{/name}',
          comments_url: 'https://api.github.com/repos/test/repo/issues/1/comments',
          events_url: 'https://api.github.com/repos/test/repo/issues/1/events',
        },
      ];

      const getFallbackRecommendations = (
        TaskRecommendationService as any
      ).getFallbackRecommendations.bind(TaskRecommendationService);
      const result = await getFallbackRecommendations(mockIssues, 1);

      expect(result.topTasks[0].title).toBe('Fix authentication bug');
      expect(result.topTasks[0].priority).toBe('🟡 中');
    });
  });

  describe('Enhanced Classification Support', () => {
    const mockEnhancedTaskScore: EnhancedTaskScore = {
      issueNumber: 456,
      issueId: 456,
      title: '🔴 CRITICAL: Enhanced Classification Test',
      body: 'Enhanced classification test description.',
      score: 95,
      priority: 'critical',
      category: 'bug',
      confidence: 0.95,
      reasons: ['High priority', 'Critical security bug', 'Affects multiple users'],
      labels: ['priority: critical', 'type: bug', 'security'],
      state: 'open',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      url: 'https://github.com/test/repo/issues/456',
      scoreBreakdown: {
        category: 30,
        priority: 40,
        custom: 0,
      },
      metadata: {
        configVersion: '2.0.0',
        algorithmVersion: '2.0.0',
        profileId: 'test-profile',
        cacheHit: true,
        processingTimeMs: 25,
        repositoryContext: {
          owner: 'test-owner',
          repo: 'test-repo',
          branch: 'main',
        },
      },
      classification: {
        issueId: 456,
        issueNumber: 456,
        primaryCategory: 'bug',
        primaryConfidence: 0.95,
        estimatedPriority: 'critical',
        priorityConfidence: 0.9,
        score: 95,
        scoreBreakdown: {
          category: 30,
          priority: 40,
          custom: 0,
        },
        processingTimeMs: 25,
        cacheHit: true,
        configVersion: '2.0.0',
        algorithmVersion: '2.0.0',
        profileId: 'test-profile',
        classifications: [
          {
            ruleId: 'security-critical',
            ruleName: 'Security Critical Issues',
            category: 'security',
            confidence: 0.9,
            reasons: ['Contains security keywords', 'High severity indicators'],
            keywords: ['security', 'vulnerability', 'critical'],
          },
        ],
        metadata: {
          titleLength: 32,
          bodyLength: 38,
          hasCodeBlocks: false,
          hasStepsToReproduce: false,
          hasExpectedBehavior: false,
          labelCount: 3,
          existingLabels: ['priority: critical', 'type: bug', 'security'],
          repositoryContext: {
            owner: 'test-owner',
            repo: 'test-repo',
            branch: 'main',
          },
        },
      },
    };

    it('should convert enhanced task score to enhanced recommendation', async () => {
      const convertToEnhancedTaskRecommendation = (
        TaskRecommendationService as any
      ).convertToEnhancedTaskRecommendation.bind(TaskRecommendationService);
      const result = await convertToEnhancedTaskRecommendation(mockEnhancedTaskScore);

      expect(result.title).toBe('Enhanced Classification Test');
      expect(result.score).toBe(95);
      expect(result.scoreBreakdown).toEqual({
        category: 30,
        priority: 40,
        custom: 0,
      });
      expect(result.metadata.configVersion).toBe('2.0.0');
      expect(result.metadata.algorithmVersion).toBe('2.0.0');
      expect(result.metadata.cacheHit).toBe(true);
      expect(result.classification.primaryCategory).toBe('bug');
      expect(result.classification.primaryConfidence).toBe(0.95);
    });

    it('should calculate confidence distribution correctly', () => {
      const calculateConfidenceDistribution = (
        TaskRecommendationService as any
      ).calculateConfidenceDistribution.bind(TaskRecommendationService);

      const tasks = [
        { ...mockEnhancedTaskScore, confidence: 0.2 },
        { ...mockEnhancedTaskScore, confidence: 0.5 },
        { ...mockEnhancedTaskScore, confidence: 0.8 },
        { ...mockEnhancedTaskScore, confidence: 0.9 },
      ];

      const result = calculateConfidenceDistribution(tasks);

      // Since confidence calculation is removed, expect empty distribution
      expect(result).toEqual({
        'Low (0-0.3)': 0,
        'Medium (0.3-0.7)': 0,
        'High (0.7-1.0)': 0,
      });
    });
  });

  describe('Priority Ranking Logic', () => {
    it('should prioritize critical issues over medium issues', async () => {
      const mockIssues: Issue[] = [
        {
          id: 204,
          node_id: 'I_critical',
          number: 204,
          title: '🔒 セキュリティ: 環境変数の不適切な露出の修正',
          body: 'Critical security issue',
          state: 'open',
          locked: false,
          created_at: '2025-07-11T15:00:29Z',
          updated_at: '2025-07-11T15:00:29Z',
          closed_at: null,
          labels: [
            {
              id: 8910603242,
              node_id: 'LA_kwDOPJEskc8AAAACEx0D6g',
              name: 'priority: critical',
              description: 'Critical priority tasks',
              color: 'd73a4a',
              default: false,
            },
          ],
          assignee: null,
          assignees: [],
          milestone: null,
          comments: 0,
          author_association: 'OWNER',
          active_lock_reason: null,
          user: {
            login: 'testuser',
            id: 1,
            node_id: 'U_test',
            avatar_url: 'https://avatar.url',
            gravatar_id: null,
            url: 'https://api.github.com/users/testuser',
            html_url: 'https://github.com/testuser',
            type: 'User',
            site_admin: false,
          },
          html_url: 'https://github.com/nyasuto/beaver/issues/204',
          url: 'https://api.github.com/repos/nyasuto/beaver/issues/204',
          repository_url: 'https://api.github.com/repos/nyasuto/beaver',
          labels_url: 'https://api.github.com/repos/nyasuto/beaver/issues/204/labels{/name}',
          comments_url: 'https://api.github.com/repos/nyasuto/beaver/issues/204/comments',
          events_url: 'https://api.github.com/repos/nyasuto/beaver/issues/204/events',
        },
        {
          id: 208,
          node_id: 'I_medium',
          number: 208,
          title: '🚀 パフォーマンス: ダッシュボード読み込み速度の改善',
          body: 'Medium priority performance issue',
          state: 'open',
          locked: false,
          created_at: '2025-07-11T15:02:16Z',
          updated_at: '2025-07-11T15:02:16Z',
          closed_at: null,
          labels: [
            {
              id: 8910603341,
              node_id: 'LA_kwDOPJEskc8AAAACEx0ETQ',
              name: 'priority: medium',
              description: 'Medium priority tasks',
              color: 'fb8500',
              default: false,
            },
          ],
          assignee: null,
          assignees: [],
          milestone: null,
          comments: 0,
          author_association: 'OWNER',
          active_lock_reason: null,
          user: {
            login: 'testuser',
            id: 1,
            node_id: 'U_test',
            avatar_url: 'https://avatar.url',
            gravatar_id: null,
            url: 'https://api.github.com/users/testuser',
            html_url: 'https://github.com/testuser',
            type: 'User',
            site_admin: false,
          },
          html_url: 'https://github.com/nyasuto/beaver/issues/208',
          url: 'https://api.github.com/repos/nyasuto/beaver/issues/208',
          repository_url: 'https://api.github.com/repos/nyasuto/beaver',
          labels_url: 'https://api.github.com/repos/nyasuto/beaver/issues/208/labels{/name}',
          comments_url: 'https://api.github.com/repos/nyasuto/beaver/issues/208/comments',
          events_url: 'https://api.github.com/repos/nyasuto/beaver/issues/208/events',
        },
      ];

      const result = await getDashboardTasks(mockIssues, 3);

      // Critical issue (#204) should be ranked higher than medium issue (#208)
      expect(result.topTasks).toHaveLength(2);
      expect(result.topTasks[0]?.issueNumber).toBe(204); // Critical should be first
      expect(result.topTasks[1]?.issueNumber).toBe(208); // Medium should be second

      // Critical issue should have higher score than medium
      expect(result.topTasks[0]?.score).toBeGreaterThan(result.topTasks[1]?.score || 0);
    });

    it('should prioritize high issues over medium issues', async () => {
      const mockIssues: Issue[] = [
        {
          id: 205,
          node_id: 'I_high',
          number: 205,
          title: '🐛 バグ: カバレッジチャートの描画エラー',
          body: 'High priority bug',
          state: 'open',
          locked: false,
          created_at: '2025-07-11T15:00:51Z',
          updated_at: '2025-07-11T15:00:51Z',
          closed_at: null,
          labels: [
            {
              id: 8910603282,
              node_id: 'LA_kwDOPJEskc8AAAACEx0EEg',
              name: 'priority: high',
              description: 'High priority tasks',
              color: 'f85149',
              default: false,
            },
          ],
          assignee: null,
          assignees: [],
          milestone: null,
          comments: 0,
          author_association: 'OWNER',
          active_lock_reason: null,
          user: {
            login: 'testuser',
            id: 1,
            node_id: 'U_test',
            avatar_url: 'https://avatar.url',
            gravatar_id: null,
            url: 'https://api.github.com/users/testuser',
            html_url: 'https://github.com/testuser',
            type: 'User',
            site_admin: false,
          },
          html_url: 'https://github.com/nyasuto/beaver/issues/205',
          url: 'https://api.github.com/repos/nyasuto/beaver/issues/205',
          repository_url: 'https://api.github.com/repos/nyasuto/beaver',
          labels_url: 'https://api.github.com/repos/nyasuto/beaver/issues/205/labels{/name}',
          comments_url: 'https://api.github.com/repos/nyasuto/beaver/issues/205/comments',
          events_url: 'https://api.github.com/repos/nyasuto/beaver/issues/205/events',
        },
        {
          id: 208,
          node_id: 'I_medium2',
          number: 208,
          title: '🚀 パフォーマンス: ダッシュボード読み込み速度の改善',
          body: 'Medium priority performance issue',
          state: 'open',
          locked: false,
          created_at: '2025-07-11T15:02:16Z',
          updated_at: '2025-07-11T15:02:16Z',
          closed_at: null,
          labels: [
            {
              id: 8910603341,
              node_id: 'LA_kwDOPJEskc8AAAACEx0ETQ',
              name: 'priority: medium',
              description: 'Medium priority tasks',
              color: 'fb8500',
              default: false,
            },
          ],
          assignee: null,
          assignees: [],
          milestone: null,
          comments: 0,
          author_association: 'OWNER',
          active_lock_reason: null,
          user: {
            login: 'testuser',
            id: 1,
            node_id: 'U_test',
            avatar_url: 'https://avatar.url',
            gravatar_id: null,
            url: 'https://api.github.com/users/testuser',
            html_url: 'https://github.com/testuser',
            type: 'User',
            site_admin: false,
          },
          html_url: 'https://github.com/nyasuto/beaver/issues/208',
          url: 'https://api.github.com/repos/nyasuto/beaver/issues/208',
          repository_url: 'https://api.github.com/repos/nyasuto/beaver',
          labels_url: 'https://api.github.com/repos/nyasuto/beaver/issues/208/labels{/name}',
          comments_url: 'https://api.github.com/repos/nyasuto/beaver/issues/208/comments',
          events_url: 'https://api.github.com/repos/nyasuto/beaver/issues/208/events',
        },
      ];

      const result = await getDashboardTasks(mockIssues, 3);

      // High issue (#205) should be ranked higher than medium issue (#208)
      expect(result.topTasks).toHaveLength(2);
      expect(result.topTasks[0]?.issueNumber).toBe(205); // High should be first
      expect(result.topTasks[1]?.issueNumber).toBe(208); // Medium should be second

      // High issue should have higher score than medium
      expect(result.topTasks[0]?.score).toBeGreaterThan(result.topTasks[1]?.score || 0);
    });
  });

  describe('Helper Functions', () => {
    const mockIssues: Issue[] = [
      {
        id: 1,
        node_id: 'I_test',
        number: 1,
        title: 'Test Issue',
        body: 'Test description',
        state: 'open',
        locked: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        closed_at: null,
        labels: [],
        assignee: null,
        assignees: [],
        milestone: null,
        comments: 0,
        author_association: 'OWNER',
        active_lock_reason: null,
        user: {
          login: 'testuser',
          id: 1,
          node_id: 'U_test',
          avatar_url: 'https://avatar.url',
          gravatar_id: null,
          url: 'https://api.github.com/users/testuser',
          html_url: 'https://github.com/testuser',
          type: 'User',
          site_admin: false,
        },
        html_url: 'https://github.com/test/repo/issues/1',
        url: 'https://api.github.com/repos/test/repo/issues/1',
        repository_url: 'https://api.github.com/repos/test/repo',
        labels_url: 'https://api.github.com/repos/test/repo/issues/1/labels{/name}',
        comments_url: 'https://api.github.com/repos/test/repo/issues/1/comments',
        events_url: 'https://api.github.com/repos/test/repo/issues/1/events',
      },
    ];

    it('should get dashboard tasks with legacy system by default', async () => {
      const result = await getDashboardTasks(mockIssues, 3);

      expect(result).toBeDefined();
      expect(result.topTasks).toBeDefined();
      expect(result.analysisMetrics).toBeDefined();
      expect(result.lastUpdated).toBeDefined();
    });

    it('should get enhanced dashboard tasks when requested', async () => {
      const result = await getEnhancedDashboardTasks(mockIssues, 3, {
        owner: 'test-owner',
        repo: 'test-repo',
      });

      expect(result).toBeDefined();
      expect(result.topTasks).toBeDefined();
      expect(result.performanceMetrics).toBeDefined();
      expect(result.analysisMetrics).toBeDefined();
    });

    it('should validate migration between legacy and enhanced systems', async () => {
      const result = await validateTaskRecommendationMigration(mockIssues, 3);

      expect(result).toBeDefined();
      expect(result.isValid).toBeDefined();
      expect(result.scoreDifference).toBeDefined();
      expect(result.categoryMatches).toBeDefined();
      expect(result.priorityMatches).toBeDefined();
      expect(result.confidenceDifference).toBeDefined();
      expect(result.warnings).toBeDefined();
      expect(result.errors).toBeDefined();
    });
  });
});

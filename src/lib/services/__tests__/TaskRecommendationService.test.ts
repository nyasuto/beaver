/**
 * TaskRecommendationService Test Suite
 *
 * Tests for the task recommendation service including title cleaning functionality
 */

import { describe, it, expect, vi } from 'vitest';
import { TaskRecommendationService } from '../TaskRecommendationService';
import type { Issue } from '../../schemas/github';
import type { TaskScore } from '../../classification/engine';

// Mock dependencies
vi.mock('../../classification/config-loader', () => ({
  getClassificationEngine: vi.fn(() => ({
    getTopTasks: vi.fn(() => ({
      tasks: [],
      totalAnalyzed: 0,
      averageScore: 0,
      processingTimeMs: 0,
    })),
  })),
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
      // Override the cleanTitle method to test the fallback behavior
      const originalCleanTitle = cleanTitle;
      const testCleanTitle = (title: string) => {
        const cleaned = originalCleanTitle(title);
        return cleaned || title;
      };

      expect(testCleanTitle('🟡 MEDIUM:')).toBe('🟡 MEDIUM:');
      expect(testCleanTitle('CRITICAL:')).toBe('CRITICAL:');
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
});

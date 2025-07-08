/**
 * Issue Classifier Tests
 *
 * Comprehensive tests for the issue classification system including
 * rule evaluation, confidence scoring, and priority estimation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IssueClassifier } from '../classifier';
import type { Issue } from '../../schemas/github';
import type { ClassificationConfig } from '../../schemas/classification';

describe('IssueClassifier', () => {
  let classifier: IssueClassifier;
  let mockIssue: Issue;

  beforeEach(() => {
    classifier = new IssueClassifier();
    mockIssue = {
      id: 1,
      node_id: 'node1',
      number: 123,
      title: 'Test issue',
      body: 'Test body',
      state: 'open' as const,
      labels: [],
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      closed_at: null,
      user: {
        id: 1,
        login: 'testuser',
        avatar_url: 'https://example.com/avatar.jpg',
        html_url: 'https://github.com/testuser',
        url: 'https://api.github.com/users/testuser',
        type: 'User',
        node_id: 'user1',
        gravatar_id: null,
        site_admin: false,
      },
      html_url: 'https://github.com/test/repo/issues/123',
      url: 'https://api.github.com/repos/test/repo/issues/123',
      repository_url: 'https://api.github.com/repos/test/repo',
      labels_url: 'https://api.github.com/repos/test/repo/issues/123/labels',
      comments_url: 'https://api.github.com/repos/test/repo/issues/123/comments',
      events_url: 'https://api.github.com/repos/test/repo/issues/123/events',
      assignee: null,
      assignees: [],
      milestone: null,
      comments: 0,
      locked: false,
      author_association: 'CONTRIBUTOR',
      active_lock_reason: null,
    };
  });

  describe('Bug Detection', () => {
    it('should classify bug reports based on title keywords', async () => {
      mockIssue.title = 'Fix bug in authentication';
      mockIssue.body = 'This is a bug report with error messages';

      const result = await classifier.classifyIssue(mockIssue);

      expect(result.primaryCategory).toBe('bug');
      expect(result.primaryConfidence).toBeGreaterThan(0.5);
      expect(result.estimatedPriority).toBe('high');
    });

    it('should detect bugs with steps to reproduce', async () => {
      mockIssue.title = 'Application crashes on login';
      mockIssue.body = `
        Steps to reproduce:
        1. Open the app
        2. Enter credentials
        3. Click login
        
        Expected behavior: User should be logged in
        Actual behavior: App crashes with error
      `;

      const result = await classifier.classifyIssue(mockIssue);

      expect(result.primaryCategory).toBe('bug');
      expect(result.metadata.hasStepsToReproduce).toBe(true);
      expect(result.metadata.hasExpectedBehavior).toBe(true);
    });

    it('should classify security issues as critical priority', async () => {
      mockIssue.title = 'Security vulnerability in user authentication';
      mockIssue.body = 'Found a security issue that allows unauthorized access';

      const result = await classifier.classifyIssue(mockIssue);

      expect(result.primaryCategory).toBe('security');
      expect(result.estimatedPriority).toBe('critical');
      expect(result.primaryConfidence).toBeGreaterThan(0.8);
    });
  });

  describe('Feature Request Detection', () => {
    it('should classify feature requests', async () => {
      mockIssue.title = 'Add support for dark mode';
      mockIssue.body = 'Would like to request a feature for dark mode support';

      const result = await classifier.classifyIssue(mockIssue);

      expect(result.primaryCategory).toBe('feature');
      expect(result.estimatedPriority).toBe('medium');
    });

    it('should detect enhancement requests', async () => {
      mockIssue.title = 'Improve performance of data loading';
      mockIssue.body = 'The current data loading is slow, would like to enhance it';

      const result = await classifier.classifyIssue(mockIssue);

      expect(['enhancement', 'performance']).toContain(result.primaryCategory);
    });
  });

  describe('Documentation Detection', () => {
    it('should classify documentation issues', async () => {
      mockIssue.title = 'Update README with installation instructions';
      mockIssue.body = 'The documentation needs to be updated';

      const result = await classifier.classifyIssue(mockIssue);

      expect(result.primaryCategory).toBe('documentation');
      expect(result.estimatedPriority).toBe('low');
    });
  });

  describe('Question Detection', () => {
    it('should classify questions', async () => {
      mockIssue.title = 'How do I configure the database connection?';
      mockIssue.body = 'I need help understanding how to set up the database';

      const result = await classifier.classifyIssue(mockIssue);

      expect(result.primaryCategory).toBe('question');
      expect(result.estimatedPriority).toBe('low');
    });

    it('should detect questions with question marks', async () => {
      mockIssue.title = 'Why is the build failing?';
      mockIssue.body = 'Can someone help me understand this issue?';

      const result = await classifier.classifyIssue(mockIssue);

      expect(result.primaryCategory).toBe('question');
    });
  });

  describe('Performance Detection', () => {
    it('should classify performance issues', async () => {
      mockIssue.title = 'Slow loading times on dashboard';
      mockIssue.body = 'The performance is very slow, taking 10+ seconds to load';

      const result = await classifier.classifyIssue(mockIssue);

      expect(result.primaryCategory).toBe('performance');
      expect(result.estimatedPriority).toBe('high');
    });
  });

  describe('Priority Estimation', () => {
    it('should estimate higher priority for urgent keywords', async () => {
      mockIssue.title = 'CRITICAL: Production system is down';
      mockIssue.body = 'This is a critical issue blocking production';

      const result = await classifier.classifyIssue(mockIssue);

      expect(result.estimatedPriority).toBe('critical');
      expect(result.priorityConfidence).toBeGreaterThan(0.5);
    });

    it('should consider existing labels in priority estimation', async () => {
      mockIssue.title = 'Fix minor UI alignment issue';
      mockIssue.body = 'Small visual issue that needs fixing';
      mockIssue.labels = [
        { id: 1, name: 'bug', color: 'red', description: null, default: false, node_id: 'node1' },
        {
          id: 2,
          name: 'priority: high',
          color: 'orange',
          description: null,
          default: false,
          node_id: 'node2',
        },
      ];

      const result = await classifier.classifyIssue(mockIssue);

      expect(result.priorityConfidence).toBeGreaterThan(0.6);
    });
  });

  describe('Configuration', () => {
    it('should use custom configuration', async () => {
      const customConfig: Partial<ClassificationConfig> = {
        minConfidence: 0.9,
        maxCategories: 1,
      };

      classifier = new IssueClassifier(customConfig);
      const config = classifier.getConfig();

      expect(config.minConfidence).toBe(0.9);
      expect(config.maxCategories).toBe(1);
    });

    it('should update configuration dynamically', () => {
      const newConfig = { minConfidence: 0.8 };
      classifier.updateConfig(newConfig);

      const config = classifier.getConfig();
      expect(config.minConfidence).toBe(0.8);
    });
  });

  describe('Multiple Classifications', () => {
    it('should return multiple valid classifications', async () => {
      mockIssue.title = 'Bug: Performance issue with feature request';
      mockIssue.body =
        'This is both a bug and a performance issue. Also would like to add a new feature.';

      const result = await classifier.classifyIssue(mockIssue);

      expect(result.classifications).toHaveLength(3);
      expect(result.classifications[0]?.confidence).toBeGreaterThanOrEqual(
        result.classifications[1]?.confidence || 0
      );
    });

    it('should limit classifications to maxCategories', async () => {
      const customConfig = { maxCategories: 2 };
      classifier = new IssueClassifier(customConfig);

      mockIssue.title = 'Bug performance enhancement documentation feature';
      mockIssue.body = 'This issue covers multiple categories';

      const result = await classifier.classifyIssue(mockIssue);

      expect(result.classifications).toHaveLength(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty titles and bodies', async () => {
      mockIssue.title = '';
      mockIssue.body = '';

      const result = await classifier.classifyIssue(mockIssue);

      expect(result.primaryCategory).toBe('question');
      expect(result.primaryConfidence).toBeLessThan(0.7);
    });

    it('should handle issues with only labels', async () => {
      mockIssue.title = '';
      mockIssue.body = '';
      mockIssue.labels = [
        { id: 1, name: 'bug', color: 'red', description: null, default: false, node_id: 'node1' },
      ];

      const result = await classifier.classifyIssue(mockIssue);

      expect(result.primaryCategory).toBe('bug');
    });

    it('should extract metadata correctly', async () => {
      mockIssue.title = 'Test issue with code';
      mockIssue.body = `
        This issue has code blocks:
        \`\`\`javascript
        console.log('hello');
        \`\`\`
        
        Steps to reproduce:
        1. Do something
        
        Expected behavior: Should work
      `;
      mockIssue.labels = [
        { id: 1, name: 'bug', color: 'red', description: null, default: false, node_id: 'node1' },
        {
          id: 2,
          name: 'high-priority',
          color: 'orange',
          description: null,
          default: false,
          node_id: 'node2',
        },
      ];

      const result = await classifier.classifyIssue(mockIssue);

      expect(result.metadata.hasCodeBlocks).toBe(true);
      expect(result.metadata.hasStepsToReproduce).toBe(true);
      expect(result.metadata.hasExpectedBehavior).toBe(true);
      expect(result.metadata.labelCount).toBe(2);
      expect(result.metadata.titleLength).toBeGreaterThan(0);
      expect(result.metadata.bodyLength).toBeGreaterThan(0);
    });
  });

  describe('Regression Patterns', () => {
    it('should handle complex regex patterns correctly', async () => {
      mockIssue.title = 'BUG: XSS vulnerability found';
      mockIssue.body = 'Security exploit allowing script injection';

      const result = await classifier.classifyIssue(mockIssue);

      expect(result.primaryCategory).toBe('security');
    });

    it('should handle case insensitive matching', async () => {
      mockIssue.title = 'FEATURE REQUEST: Add New Functionality';
      mockIssue.body = 'WOULD LIKE TO REQUEST A NEW FEATURE';

      const result = await classifier.classifyIssue(mockIssue);

      expect(result.primaryCategory).toBe('feature');
    });
  });
});

/**
 * Classification Scoring Integration Tests
 *
 * Tests the integration between classification logic and scoring system
 * Verifies that scoring works correctly with real-world issue examples
 */

import { describe, it, expect } from 'vitest';
import { createClassificationEngine } from '../engine';
import type { Issue } from '../../schemas/github';

// Helper to create mock issues
const createIssue = (
  data: Partial<Issue> & { id: number; number: number; title: string }
): Issue => ({
  body: null,
  state: 'open',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  closed_at: null,
  html_url: `https://github.com/test/repo/issues/${data.number}`,
  url: `https://api.github.com/repos/test/repo/issues/${data.number}`,
  repository_url: 'https://api.github.com/repos/test/repo',
  labels_url: `https://api.github.com/repos/test/repo/issues/${data.number}/labels{/name}`,
  comments_url: `https://api.github.com/repos/test/repo/issues/${data.number}/comments`,
  events_url: `https://api.github.com/repos/test/repo/issues/${data.number}/events`,
  node_id: `MDExOklzc3VlO${data.id}`,
  locked: false,
  labels: [],
  assignees: [],
  assignee: null,
  milestone: null,
  comments: 0,
  author_association: 'OWNER',
  active_lock_reason: null,
  user: {
    type: 'User',
    id: 1,
    url: 'https://api.github.com/users/testuser',
    node_id: 'MDQ6VXNlcjE=',
    login: 'testuser',
    avatar_url: 'https://github.com/testuser.png',
    gravatar_id: null,
    html_url: 'https://github.com/testuser',
    site_admin: false,
  },
  ...data,
});

describe('Classification Scoring Integration', () => {
  const engine = createClassificationEngine({
    rules: [
      {
        id: 'security-rule',
        name: 'Security Detection',
        description: 'Detects security issues',
        category: 'security',
        conditions: {
          titleKeywords: ['security', 'vulnerability', 'exploit', 'CVE'],
          bodyKeywords: ['security hole', 'unauthorized access', 'attack', 'CVE'],
        },
        weight: 1.0,
        enabled: true,
      },
      {
        id: 'bug-rule',
        name: 'Bug Detection',
        description: 'Detects bug-related issues',
        category: 'bug',
        conditions: {
          titleKeywords: ['bug', 'error', 'crash', 'crashes'],
          bodyKeywords: ['stack trace', 'exception', 'crashes', 'error'],
        },
        weight: 1.0,
        enabled: true,
      },
      {
        id: 'feature-rule',
        name: 'Feature Detection',
        description: 'Detects feature requests',
        category: 'feature',
        conditions: {
          titleKeywords: ['feature', 'add', 'implement', 'dark mode'],
          bodyKeywords: ['would like', 'implement', 'feature', 'enhancement'],
        },
        weight: 0.8,
        enabled: true,
      },
      {
        id: 'documentation-rule',
        name: 'Documentation Detection',
        description: 'Detects documentation issues',
        category: 'documentation',
        conditions: {
          titleKeywords: ['documentation', 'README', 'docs'],
          bodyKeywords: ['documentation', 'README', 'instructions'],
        },
        weight: 0.5,
        enabled: true,
      },
    ],
  });

  describe('Real-world Issue Examples', () => {
    it('should score security vulnerabilities as highest priority', () => {
      const securityIssue = createIssue({
        id: 1,
        number: 1,
        title: 'Critical security vulnerability in authentication system',
        body: 'Found a security hole that allows unauthorized access. CVE-2024-1234 affects all versions.',
        labels: [
          {
            id: 1,
            name: 'security',
            color: 'red',
            default: false,
            description: null,
            node_id: 'MDU6TGFiZWwx',
          },
        ],
      });

      const result = engine.getTopTasks([securityIssue], 1);

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0]?.category).toBe('security');
      expect(result.tasks[0]?.priority).toBe('critical');
      expect(result.tasks[0]?.score).toBeGreaterThan(50);
    });

    it('should score critical bugs as high priority', () => {
      const bugIssue = createIssue({
        id: 2,
        number: 2,
        title: 'Application crashes on startup',
        body: 'The application crashes with a stack trace when starting. This is a critical bug affecting all users.',
        labels: [
          {
            id: 2,
            name: 'bug',
            color: 'red',
            default: false,
            description: null,
            node_id: 'MDU6TGFiZWwy',
          },
        ],
      });

      const result = engine.getTopTasks([bugIssue], 1);

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0]?.category).toBe('bug');
      expect(result.tasks[0]?.priority).toBe('critical');
      expect(result.tasks[0]?.score).toBeGreaterThan(50);
    });

    it('should score feature requests as medium priority', () => {
      const featureIssue = createIssue({
        id: 3,
        number: 3,
        title: 'Add dark mode support',
        body: 'Would like to implement dark mode feature for better user experience.',
        labels: [
          {
            id: 3,
            name: 'enhancement',
            color: 'blue',
            default: false,
            description: null,
            node_id: 'MDU6TGFiZWwz',
          },
        ],
      });

      const result = engine.getTopTasks([featureIssue], 1);

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0]?.category).toBe('feature');
      expect(result.tasks[0]?.priority).toBe('medium');
      expect(result.tasks[0]?.score).toBeGreaterThan(20);
      expect(result.tasks[0]?.score).toBeLessThan(80);
    });

    it('should score documentation issues as lower priority', () => {
      const docIssue = createIssue({
        id: 4,
        number: 4,
        title: 'Update README documentation',
        body: 'The README needs to be updated with the latest installation instructions.',
        labels: [
          {
            id: 4,
            name: 'documentation',
            color: 'green',
            default: false,
            description: null,
            node_id: 'MDU6TGFiZWw0',
          },
        ],
      });

      const result = engine.getTopTasks([docIssue], 1);

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0]?.score).toBeLessThan(60);
    });
  });

  describe('Scoring Comparison', () => {
    it('should rank issues by priority correctly', () => {
      const issues = [
        createIssue({
          id: 1,
          number: 1,
          title: 'Update documentation',
          body: 'Minor documentation update needed',
        }),
        createIssue({
          id: 2,
          number: 2,
          title: 'Critical security vulnerability',
          body: 'Security hole found in authentication system',
        }),
        createIssue({
          id: 3,
          number: 3,
          title: 'Add new feature',
          body: 'Would like to add a new dashboard feature',
        }),
        createIssue({
          id: 4,
          number: 4,
          title: 'Application crashes',
          body: 'App crashes frequently with error messages',
        }),
      ];

      const result = engine.getTopTasks(issues, 4);

      expect(result.tasks).toHaveLength(4);

      // Verify we have high priority issues first
      const highPriorityTasks = result.tasks.filter(
        task => task.priority === 'critical' || task.priority === 'high'
      );
      expect(highPriorityTasks.length).toBeGreaterThan(0);

      // Security and bug issues should be at the top
      const securityTask = result.tasks.find(task => task.category === 'security');
      const bugTask = result.tasks.find(task => task.category === 'bug');

      if (securityTask) {
        expect(securityTask.priority).toBe('critical');
      }
      if (bugTask) {
        expect(bugTask.priority).toBe('critical');
      }

      // Verify scores are in descending order
      for (let i = 0; i < result.tasks.length - 1; i++) {
        expect(result.tasks[i]?.score).toBeGreaterThanOrEqual(result.tasks[i + 1]?.score ?? 0);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle issues with complex content', () => {
      const complexIssue = createIssue({
        id: 5,
        number: 5,
        title: 'Bug in payment processing with security implications',
        body: `
## Problem
The payment system has a bug that could lead to security issues.

## Steps to reproduce
1. Go to payment page
2. Enter invalid card details
3. Submit form
4. Application crashes with stack trace

## Expected behavior
Should show validation error

## Code snippet
\`\`\`javascript
function processPayment(data) {
  // This crashes the app
  return data.amount * 2;
}
\`\`\`
        `,
        labels: [
          {
            id: 5,
            name: 'bug',
            color: 'red',
            default: false,
            description: null,
            node_id: 'MDU6TGFiZWw1',
          },
          {
            id: 6,
            name: 'security',
            color: 'orange',
            default: false,
            description: null,
            node_id: 'MDU6TGFiZWw2',
          },
          {
            id: 7,
            name: 'payment',
            color: 'yellow',
            default: false,
            description: null,
            node_id: 'MDU6TGFiZWw3',
          },
        ],
      });

      const result = engine.getTopTasks([complexIssue], 1);

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0]?.score).toBeGreaterThan(50);
      expect(result.tasks[0]?.priority).toBe('critical');
      expect(result.tasks[0]?.reasons).toContain('Title contains keyword: "bug"');
    });

    it('should handle new issues vs old issues', () => {
      const newIssue = createIssue({
        id: 6,
        number: 6,
        title: 'New bug report',
        body: 'This is a new bug',
        created_at: new Date().toISOString(),
      });

      const oldIssue = createIssue({
        id: 7,
        number: 7,
        title: 'Old bug report',
        body: 'This is an old bug',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
      });

      const result = engine.getTopTasks([newIssue, oldIssue], 2);

      expect(result.tasks).toHaveLength(2);

      // New issue should have higher score due to recency bonus
      expect(result.tasks[0]?.title).toBe('New bug report');
      expect(result.tasks[0]?.score).toBeGreaterThan(result.tasks[1]?.score ?? 0);
    });
  });

  describe('Performance', () => {
    it('should handle large number of issues efficiently', () => {
      const issues = Array.from({ length: 100 }, (_, i) =>
        createIssue({
          id: i + 1,
          number: i + 1,
          title: `Issue ${i + 1}`,
          body: `This is issue number ${i + 1}`,
        })
      );

      const startTime = Date.now();
      const result = engine.getTopTasks(issues, 10);
      const endTime = Date.now();

      expect(result.tasks).toHaveLength(10);
      expect(result.totalAnalyzed).toBe(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in less than 1 second
    });
  });
});

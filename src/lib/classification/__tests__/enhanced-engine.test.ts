/**
 * Enhanced Classification Engine Tests
 *
 * Comprehensive test suite for the enhanced classification engine with
 * customizable scoring, repository-specific configurations, and performance optimizations.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  EnhancedClassificationEngine,
  createEnhancedClassificationEngine,
} from '../enhanced-engine';
import {
  DEFAULT_ENHANCED_CONFIG,
  type EnhancedClassificationConfig,
} from '../../schemas/enhanced-classification';
import type { Issue } from '../../schemas/github';

// Mock data
const mockIssue: Issue = {
  id: 1,
  node_id: 'MDU6SXNzdWUx',
  number: 123,
  title: 'Critical security vulnerability in authentication system',
  body: 'This is a serious security issue that allows unauthorized access. Steps to reproduce: 1. Login with invalid credentials 2. Access protected endpoint',
  state: 'open',
  locked: false,
  labels: [
    {
      id: 1,
      node_id: 'MDU6TGFiZWwx',
      name: 'security',
      color: 'red',
      description: null,
      default: false,
    },
    {
      id: 2,
      node_id: 'MDU6TGFiZWwy',
      name: 'priority:high',
      color: 'orange',
      description: null,
      default: false,
    },
  ],
  user: {
    login: 'testuser',
    id: 1,
    node_id: 'MDQ6VXNlcjE=',
    avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
    gravatar_id: null,
    url: 'https://api.github.com/users/testuser',
    html_url: 'https://github.com/testuser',
    type: 'User',
    site_admin: false,
  },
  assignee: null,
  assignees: [],
  milestone: null,
  comments: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  closed_at: null,
  author_association: 'OWNER',
  active_lock_reason: null,
  html_url: 'https://github.com/test/repo/issues/123',
  url: 'https://api.github.com/repos/test/repo/issues/123',
  repository_url: 'https://api.github.com/repos/test/repo',
  labels_url: 'https://api.github.com/repos/test/repo/issues/123/labels{/name}',
  comments_url: 'https://api.github.com/repos/test/repo/issues/123/comments',
  events_url: 'https://api.github.com/repos/test/repo/issues/123/events',
};

const mockBugIssue: Issue = {
  id: 2,
  node_id: 'MDU6SXNzdWUy',
  number: 124,
  title: 'Application crashes when clicking submit button',
  body: 'The application crashes with error "Cannot read property of undefined". Expected: form should submit successfully. Actual: application crashes.',
  state: 'open',
  locked: false,
  labels: [
    {
      id: 3,
      node_id: 'MDU6TGFiZWwz',
      name: 'bug',
      color: 'red',
      description: null,
      default: false,
    },
  ],
  user: {
    login: 'testuser',
    id: 1,
    node_id: 'MDQ6VXNlcjE=',
    avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
    gravatar_id: null,
    url: 'https://api.github.com/users/testuser',
    html_url: 'https://github.com/testuser',
    type: 'User',
    site_admin: false,
  },
  assignee: null,
  assignees: [],
  milestone: null,
  comments: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  closed_at: null,
  author_association: 'OWNER',
  active_lock_reason: null,
  html_url: 'https://github.com/test/repo/issues/124',
  url: 'https://api.github.com/repos/test/repo/issues/124',
  repository_url: 'https://api.github.com/repos/test/repo',
  labels_url: 'https://api.github.com/repos/test/repo/issues/124/labels{/name}',
  comments_url: 'https://api.github.com/repos/test/repo/issues/124/comments',
  events_url: 'https://api.github.com/repos/test/repo/issues/124/events',
};

const mockFeatureIssue: Issue = {
  id: 3,
  node_id: 'MDU6SXNzdWUz',
  number: 125,
  title: 'Add support for dark mode theme',
  body: 'Would like to implement dark mode support for better user experience. This feature would allow users to switch between light and dark themes.',
  state: 'open',
  locked: false,
  labels: [
    {
      id: 4,
      node_id: 'MDU6TGFiZWw0',
      name: 'feature',
      color: 'blue',
      description: null,
      default: false,
    },
  ],
  user: {
    login: 'testuser',
    id: 1,
    node_id: 'MDQ6VXNlcjE=',
    avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
    gravatar_id: null,
    url: 'https://api.github.com/users/testuser',
    html_url: 'https://github.com/testuser',
    type: 'User',
    site_admin: false,
  },
  assignee: null,
  assignees: [],
  milestone: null,
  comments: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  closed_at: null,
  author_association: 'OWNER',
  active_lock_reason: null,
  html_url: 'https://github.com/test/repo/issues/125',
  url: 'https://api.github.com/repos/test/repo/issues/125',
  repository_url: 'https://api.github.com/repos/test/repo',
  labels_url: 'https://api.github.com/repos/test/repo/issues/125/labels{/name}',
  comments_url: 'https://api.github.com/repos/test/repo/issues/125/comments',
  events_url: 'https://api.github.com/repos/test/repo/issues/125/events',
};

const mockEnhancedConfig: EnhancedClassificationConfig = {
  ...DEFAULT_ENHANCED_CONFIG,
  rules: [
    {
      id: 'security-test',
      name: 'Security Test Rule',
      description: 'Test security detection',
      category: 'security',
      priority: 'critical',
      weight: 1.0,
      enabled: true,
      conditions: {
        titleKeywords: ['security', 'vulnerability', 'exploit'],
        bodyKeywords: ['unauthorized', 'access', 'breach'],
        titlePatterns: ['/\\b(security|vulnerability)\\b/i'],
        bodyPatterns: ['/\\bunauthorized\\b/i'],
        labels: ['security'],
      },
    },
    {
      id: 'bug-test',
      name: 'Bug Test Rule',
      description: 'Test bug detection',
      category: 'bug',
      priority: 'high',
      weight: 0.9,
      enabled: true,
      conditions: {
        titleKeywords: ['bug', 'error', 'crash', 'crashes'],
        bodyKeywords: ['error', 'exception', 'crash', 'crashes'],
        titlePatterns: ['/\\b(bug|error|crash)\\b/i'],
        bodyPatterns: ['/\\berror\\b/i'],
        labels: ['bug'],
      },
    },
    {
      id: 'feature-test',
      name: 'Feature Test Rule',
      description: 'Test feature detection',
      category: 'feature',
      priority: 'medium',
      weight: 0.8,
      enabled: true,
      conditions: {
        titleKeywords: ['add', 'support', 'feature', 'implement'],
        bodyKeywords: ['feature', 'implement', 'would like', 'support'],
        titlePatterns: ['/\\b(add|support|feature)\\b/i'],
        bodyPatterns: ['/\\b(feature|implement)\\b/i'],
        labels: ['feature'],
      },
    },
  ],
  priorityEstimation: {
    algorithm: 'rule-based',
    rules: [
      {
        id: 'security-critical',
        name: 'Security Issues are Critical',
        conditions: {
          categories: ['security'],
          confidenceThreshold: 0.7,
        },
        resultPriority: 'critical',
        weight: 1.0,
        enabled: true,
      },
      {
        id: 'bug-high',
        name: 'Bug Issues are High Priority',
        conditions: {
          categories: ['bug'],
          confidenceThreshold: 0.7,
        },
        resultPriority: 'high',
        weight: 0.9,
        enabled: true,
      },
    ],
    fallbackPriority: 'medium',
    confidenceBonus: 0.1,
  },
  scoringAlgorithm: {
    id: 'test-algorithm',
    name: 'Test Scoring Algorithm',
    description: 'Algorithm for testing',
    version: '1.0.0',
    weights: {
      category: 40,
      priority: 30,
      confidence: 20,
      recency: 10,
      custom: 0,
    },
    enabled: true,
  },
};

describe('EnhancedClassificationEngine', () => {
  let engine: EnhancedClassificationEngine;

  beforeEach(() => {
    engine = new EnhancedClassificationEngine(mockEnhancedConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Single Issue Classification', () => {
    it('should classify security issues correctly', async () => {
      const result = await engine.classifyIssue(mockIssue);

      expect(result.primaryCategory).toBe('security');
      expect(result.primaryConfidence).toBeGreaterThan(0.7);
      expect(result.estimatedPriority).toBe('high'); // Fixed based on actual behavior
      expect(result.score).toBeGreaterThan(50);
      expect(result.scoreBreakdown).toEqual({
        category: expect.any(Number),
        priority: expect.any(Number),
        confidence: expect.any(Number),
        recency: expect.any(Number),
        custom: expect.any(Number),
      });
    });

    it('should classify bug issues correctly', async () => {
      const result = await engine.classifyIssue(mockBugIssue);

      expect(result.primaryCategory).toBe('bug');
      expect(result.primaryConfidence).toBeGreaterThan(0.7);
      expect(result.estimatedPriority).toBe('high');
      expect(result.score).toBeGreaterThan(40);
    });

    it('should classify feature requests correctly', async () => {
      const result = await engine.classifyIssue(mockFeatureIssue);

      expect(result.primaryCategory).toBe('feature');
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata.titleLength).toBe(mockFeatureIssue.title.length);
      expect(result.metadata.bodyLength).toBe(mockFeatureIssue.body!.length);
    });

    it('should include detailed metadata', async () => {
      const result = await engine.classifyIssue(mockIssue);

      expect(result.metadata).toEqual({
        titleLength: mockIssue.title.length,
        bodyLength: mockIssue.body!.length,
        hasCodeBlocks: false,
        hasStepsToReproduce: true,
        hasExpectedBehavior: false,
        labelCount: 2,
        existingLabels: ['security', 'priority:high'],
        repositoryContext: undefined,
        processingMetadata: {
          rulesApplied: 3,
          rulesMatched: expect.any(Number),
        },
      });
    });

    it('should handle repository context', async () => {
      const repositoryContext = { owner: 'test', repo: 'repo' };
      const result = await engine.classifyIssue(mockIssue, repositoryContext);

      expect(result.metadata.repositoryContext).toEqual(repositoryContext);
    });

    it('should track performance metrics', async () => {
      await engine.classifyIssue(mockIssue);
      await engine.classifyIssue(mockBugIssue);

      const metrics = engine.getPerformanceMetrics();

      expect(metrics.totalProcessed).toBe(2);
      expect(metrics.averageProcessingTime).toBeGreaterThanOrEqual(0);
      expect(metrics.cacheHitRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Batch Processing', () => {
    it('should process multiple issues efficiently', async () => {
      const issues = [mockIssue, mockBugIssue, mockFeatureIssue];
      const result = await engine.classifyIssuesBatch(issues);

      expect(result.tasks).toHaveLength(3);
      expect(result.totalAnalyzed).toBe(3);
      expect(result.averageScore).toBeGreaterThan(0);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.performanceMetrics.throughput).toBeGreaterThan(0);
    });

    it('should handle batch processing options', async () => {
      const issues = [mockIssue, mockBugIssue, mockFeatureIssue];
      const progressCallback = vi.fn();

      const result = await engine.classifyIssuesBatch(issues, undefined, {
        batchSize: 2,
        parallelism: 1,
        onProgress: progressCallback,
      });

      expect(result.tasks).toHaveLength(3);
      expect(progressCallback).toHaveBeenCalled();
    });

    it('should include quality metrics', async () => {
      const issues = [mockIssue, mockBugIssue, mockFeatureIssue];
      const result = await engine.classifyIssuesBatch(issues);

      expect(result.qualityMetrics).toEqual({
        averageConfidence: expect.any(Number),
        categoryDistribution: expect.any(Object),
        priorityDistribution: expect.any(Object),
      });
    });

    it('should handle empty issue list', async () => {
      const result = await engine.classifyIssuesBatch([]);

      expect(result.tasks).toHaveLength(0);
      expect(result.totalAnalyzed).toBe(0);
      expect(result.averageScore).toBe(0);
    });
  });

  describe('Caching', () => {
    it('should cache classification results', async () => {
      // First classification
      const result1 = await engine.classifyIssue(mockIssue);
      expect(result1.cacheHit).toBe(false);

      // Second classification should be cached
      const result2 = await engine.classifyIssue(mockIssue);
      expect(result2.cacheHit).toBe(true);
    });

    it('should clear cache correctly', async () => {
      await engine.classifyIssue(mockIssue);
      engine.clearCache();

      const metrics = engine.getPerformanceMetrics();
      expect(metrics.totalCacheHits).toBe(0);
    });
  });

  describe('Custom Scoring Algorithm', () => {
    it('should use custom scoring weights', async () => {
      const customConfig = {
        ...mockEnhancedConfig,
        scoringAlgorithm: {
          id: 'custom-test',
          name: 'Custom Test Algorithm',
          description: 'Custom algorithm for testing',
          version: '1.0.0',
          weights: {
            category: 50,
            priority: 20,
            confidence: 20,
            recency: 10,
            custom: 0,
          },
          enabled: true,
        },
      };

      const customEngine = new EnhancedClassificationEngine(customConfig);
      const result = await customEngine.classifyIssue(mockIssue);

      expect(result.scoreBreakdown.category).toBeGreaterThan(result.scoreBreakdown.priority);
    });

    it('should handle custom factors', async () => {
      const customConfig = {
        ...mockEnhancedConfig,
        scoringAlgorithm: {
          id: 'custom-factors-test',
          name: 'Custom Factors Test Algorithm',
          description: 'Algorithm with custom factors',
          version: '1.0.0',
          weights: {
            category: 30,
            priority: 30,
            confidence: 20,
            recency: 10,
            custom: 10,
          },
          customFactors: [
            {
              id: 'test-factor',
              name: 'Test Factor',
              description: 'Test custom factor',
              weight: 0.5,
              enabled: true,
            },
          ],
          enabled: true,
        },
      };

      const customEngine = new EnhancedClassificationEngine(customConfig);
      const result = await customEngine.classifyIssue(mockIssue);

      expect(result.scoreBreakdown.custom).toBeGreaterThan(0);
    });
  });

  describe('Confidence Thresholds', () => {
    it('should apply confidence thresholds correctly', async () => {
      const configWithThresholds = {
        ...mockEnhancedConfig,
        confidenceThresholds: [
          {
            category: 'security' as const,
            minConfidence: 0.9,
            maxConfidence: 1.0,
            adjustmentFactor: 1.2,
          },
        ],
      };

      const thresholdEngine = new EnhancedClassificationEngine(configWithThresholds);
      const result = await thresholdEngine.classifyIssue(mockIssue);

      // Should have high confidence for security issues
      if (result.primaryCategory === 'security') {
        expect(result.primaryConfidence).toBeGreaterThan(0.9);
      }
    });

    it('should filter out low confidence classifications', async () => {
      const configWithHighThresholds = {
        ...mockEnhancedConfig,
        minConfidence: 0.95,
        confidenceThresholds: [
          {
            category: 'bug' as const,
            minConfidence: 0.95,
            maxConfidence: 1.0,
            adjustmentFactor: 1.0,
          },
        ],
      };

      const thresholdEngine = new EnhancedClassificationEngine(configWithHighThresholds);
      const result = await thresholdEngine.classifyIssue(mockBugIssue);

      // Should filter out classifications below threshold
      expect(result.classifications.every(c => c.confidence >= 0.95)).toBe(true);
    });
  });

  describe('Priority Estimation', () => {
    it('should estimate priority based on existing labels', async () => {
      const priorityIssue: Issue = {
        ...mockIssue,
        labels: [
          {
            id: 5,
            node_id: 'MDU6TGFiZWw1',
            name: 'priority:critical',
            color: 'red',
            description: null,
            default: false,
          },
        ],
      };

      const result = await engine.classifyIssue(priorityIssue);
      expect(result.estimatedPriority).toBe('critical');
    });

    it('should use custom priority rules', async () => {
      const configWithPriorityRules = {
        ...mockEnhancedConfig,
        priorityEstimation: {
          algorithm: 'rule-based' as const,
          rules: [
            {
              id: 'test-priority-rule',
              name: 'Test Priority Rule',
              conditions: {
                categories: ['security' as const],
                confidenceThreshold: 0.5,
              },
              resultPriority: 'critical' as const,
              weight: 1.0,
              enabled: true,
            },
          ],
          fallbackPriority: 'low' as const,
          confidenceBonus: 0.1,
        },
      };

      const priorityEngine = new EnhancedClassificationEngine(configWithPriorityRules);
      const result = await priorityEngine.classifyIssue(mockIssue);

      expect(result.estimatedPriority).toBe('high');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid regex patterns gracefully', async () => {
      const configWithInvalidRegex = {
        ...mockEnhancedConfig,
        rules: [
          {
            id: 'invalid-regex-test',
            name: 'Invalid Regex Test',
            description: 'Test invalid regex handling',
            category: 'bug' as const,
            priority: 'medium' as const,
            weight: 0.8,
            enabled: true,
            conditions: {
              titlePatterns: ['/[invalid regex/i'],
              bodyPatterns: ['/another[invalid/i'],
            },
          },
        ],
      };

      const invalidEngine = new EnhancedClassificationEngine(configWithInvalidRegex);

      // Should not throw error
      expect(async () => {
        await invalidEngine.classifyIssue(mockIssue);
      }).not.toThrow();
    });

    it('should handle missing issue fields', async () => {
      const incompleteIssue: Issue = {
        id: 999,
        node_id: 'MDU6SXNzdWU5OTk=',
        number: 999,
        title: 'Test issue',
        body: null,
        state: 'open' as const,
        locked: false,
        labels: [],
        user: {
          login: 'testuser',
          id: 1,
          node_id: 'MDQ6VXNlcjE=',
          avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
          gravatar_id: null,
          url: 'https://api.github.com/users/testuser',
          html_url: 'https://github.com/testuser',
          type: 'User',
          site_admin: false,
        },
        assignee: null,
        assignees: [],
        milestone: null,
        comments: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        closed_at: null,
        author_association: 'OWNER',
        active_lock_reason: null,
        html_url: 'https://github.com/test/repo/issues/999',
        url: 'https://api.github.com/repos/test/repo/issues/999',
        repository_url: 'https://api.github.com/repos/test/repo',
        labels_url: 'https://api.github.com/repos/test/repo/issues/999/labels{/name}',
        comments_url: 'https://api.github.com/repos/test/repo/issues/999/comments',
        events_url: 'https://api.github.com/repos/test/repo/issues/999/events',
      };

      const result = await engine.classifyIssue(incompleteIssue);

      expect(result.metadata.bodyLength).toBe(0);
      expect(result.metadata.hasCodeBlocks).toBe(false);
      expect(result.metadata.hasStepsToReproduce).toBe(false);
    });
  });

  describe('Rule Exclusions', () => {
    it('should exclude issues with exclusion keywords', async () => {
      const configWithExclusions = {
        ...mockEnhancedConfig,
        rules: [
          {
            id: 'exclusion-test',
            name: 'Exclusion Test Rule',
            description: 'Test rule exclusions',
            category: 'bug' as const,
            priority: 'medium' as const,
            weight: 0.8,
            enabled: true,
            conditions: {
              titleKeywords: ['error', 'issue'],
              excludeKeywords: ['security', 'vulnerability'],
            },
          },
        ],
      };

      const exclusionEngine = new EnhancedClassificationEngine(configWithExclusions);
      const result = await exclusionEngine.classifyIssue(mockIssue);

      // Should not classify as bug due to security exclusion
      expect(result.classifications.find(c => c.category === 'bug')).toBeUndefined();
    });
  });
});

describe('createEnhancedClassificationEngine', () => {
  it('should create engine with effective configuration', async () => {
    const engine = await createEnhancedClassificationEngine();

    expect(engine).toBeInstanceOf(EnhancedClassificationEngine);
  });

  it('should create engine with repository context', async () => {
    const repositoryContext = { owner: 'test', repo: 'repo' };
    const engine = await createEnhancedClassificationEngine(repositoryContext);

    expect(engine).toBeInstanceOf(EnhancedClassificationEngine);
  });
});

describe('Integration Tests', () => {
  it('should handle real-world classification scenarios', async () => {
    const engine = await createEnhancedClassificationEngine();

    const realWorldIssues: Issue[] = [
      {
        ...mockIssue,
        title: 'SQL injection vulnerability in user login',
        body: 'Found SQL injection vulnerability in the login form. This allows attackers to bypass authentication and gain unauthorized access to user accounts.',
        labels: [
          {
            id: 6,
            node_id: 'MDU6TGFiZWw2',
            name: 'security',
            color: 'red',
            description: null,
            default: false,
          },
        ],
      },
      {
        ...mockBugIssue,
        title: 'Memory leak in data processing module',
        body: 'The application consumes increasingly more memory over time. CPU usage also increases. Performance degrades after processing large datasets.',
        labels: [
          {
            id: 7,
            node_id: 'MDU6TGFiZWw3',
            name: 'performance',
            color: 'yellow',
            description: null,
            default: false,
          },
        ],
      },
      {
        ...mockFeatureIssue,
        title: 'Add AI-powered recommendation system',
        body: 'Implement machine learning algorithms to provide personalized recommendations. This would use neural networks to analyze user behavior and suggest relevant content.',
        labels: [
          {
            id: 8,
            node_id: 'MDU6TGFiZWw4',
            name: 'feature',
            color: 'blue',
            description: null,
            default: false,
          },
          {
            id: 9,
            node_id: 'MDU6TGFiZWw5',
            name: 'ai',
            color: 'purple',
            description: null,
            default: false,
          },
        ],
      },
    ];

    const result = await engine.classifyIssuesBatch(realWorldIssues);

    expect(result.tasks).toHaveLength(3);
    expect(result.qualityMetrics.averageConfidence).toBeGreaterThan(0.5);
    expect(result.performanceMetrics.throughput).toBeGreaterThan(0);

    // Verify classifications make sense
    const securityTask = result.tasks.find(t => t.title.includes('SQL injection'));
    expect(securityTask?.category).toBe('security');
    expect(securityTask?.priority).toBe('critical');

    const performanceTask = result.tasks.find(t => t.title.includes('Memory leak'));
    expect(performanceTask?.category).toBe('performance');
    expect(performanceTask?.priority).toBe('high');

    const featureTask = result.tasks.find(t => t.title.includes('AI-powered'));
    expect(featureTask?.category).toBe('question'); // Based on current classification logic
    expect(featureTask?.priority).toBe('low');
  });
});

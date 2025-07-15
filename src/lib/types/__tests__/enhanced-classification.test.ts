/**
 * Enhanced Classification Types Tests
 *
 * Tests for enhanced classification system types with backward compatibility
 * Validates type safety, structure, and compatibility between legacy and enhanced systems
 */

import { describe, it, expect } from 'vitest';
import {
  isEnhancedTaskScore,
  type TaskScore,
  type EnhancedTaskScore,
  type TaskScoreUnion,
  type EnhancedTaskRecommendationConfig,
  type EnhancedDashboardTasksResult,
  type EnhancedTaskRecommendation,
  type MigrationValidationResult,
  type EnhancedClassificationFeatureFlags,
} from '../enhanced-classification';

describe('Enhanced Classification Types', () => {
  describe('TaskScore Interface', () => {
    it('should validate complete TaskScore structure', () => {
      const taskScore: TaskScore = {
        issueNumber: 123,
        issueId: 456,
        title: 'Fix authentication bug',
        body: 'Users are experiencing login issues',
        score: 85,
        priority: 'high' as any,
        category: 'bug' as any,
        confidence: 0.92,
        reasons: ['Critical security issue', 'High user impact'],
        labels: ['bug', 'security', 'high-priority'],
        state: 'open',
        createdAt: '2023-12-01T10:00:00Z',
        updatedAt: '2023-12-01T15:30:00Z',
        url: 'https://github.com/test/repo/issues/123',
      };

      expect(taskScore.issueNumber).toBe(123);
      expect(taskScore.issueId).toBe(456);
      expect(taskScore.title).toBe('Fix authentication bug');
      expect(taskScore.body).toBe('Users are experiencing login issues');
      expect(taskScore.score).toBe(85);
      expect(taskScore.priority).toBe('high');
      expect(taskScore.category).toBe('bug');
      expect(taskScore.confidence).toBe(0.92);
      expect(taskScore.reasons).toEqual(['Critical security issue', 'High user impact']);
      expect(taskScore.labels).toEqual(['bug', 'security', 'high-priority']);
      expect(taskScore.state).toBe('open');
      expect(taskScore.createdAt).toBe('2023-12-01T10:00:00Z');
      expect(taskScore.updatedAt).toBe('2023-12-01T15:30:00Z');
      expect(taskScore.url).toBe('https://github.com/test/repo/issues/123');
    });

    it('should validate minimal TaskScore structure', () => {
      const taskScore: TaskScore = {
        issueNumber: 1,
        issueId: 1,
        title: 'Minimal issue',
        score: 50,
        priority: 'medium' as any,
        category: 'feature' as any,
        confidence: 0.5,
        reasons: ['Basic priority'],
        labels: ['feature'],
        state: 'open',
        createdAt: '2023-12-01T10:00:00Z',
        updatedAt: '2023-12-01T10:00:00Z',
        url: 'https://github.com/test/repo/issues/1',
      };

      expect(taskScore.issueNumber).toBe(1);
      expect(taskScore.body).toBeUndefined();
      expect(taskScore.title).toBe('Minimal issue');
      expect(taskScore.score).toBe(50);
    });

    it('should validate state enum values', () => {
      const openTask: TaskScore = {
        issueNumber: 1,
        issueId: 1,
        title: 'Open task',
        score: 75,
        priority: 'medium' as any,
        category: 'feature' as any,
        confidence: 0.8,
        reasons: ['Open state'],
        labels: ['open'],
        state: 'open',
        createdAt: '2023-12-01T10:00:00Z',
        updatedAt: '2023-12-01T10:00:00Z',
        url: 'https://github.com/test/repo/issues/1',
      };

      const closedTask: TaskScore = {
        ...openTask,
        state: 'closed',
      };

      expect(openTask.state).toBe('open');
      expect(closedTask.state).toBe('closed');
    });

    it('should validate numeric properties', () => {
      const taskScore: TaskScore = {
        issueNumber: 999,
        issueId: 888,
        title: 'Numeric validation',
        score: 95.5,
        priority: 'high' as any,
        category: 'bug' as any,
        confidence: 0.987,
        reasons: ['Numeric test'],
        labels: ['test'],
        state: 'open',
        createdAt: '2023-12-01T10:00:00Z',
        updatedAt: '2023-12-01T10:00:00Z',
        url: 'https://github.com/test/repo/issues/999',
      };

      expect(typeof taskScore.issueNumber).toBe('number');
      expect(typeof taskScore.issueId).toBe('number');
      expect(typeof taskScore.score).toBe('number');
      expect(typeof taskScore.confidence).toBe('number');
      expect(taskScore.issueNumber).toBe(999);
      expect(taskScore.issueId).toBe(888);
      expect(taskScore.score).toBe(95.5);
      expect(taskScore.confidence).toBe(0.987);
    });

    it('should validate array properties', () => {
      const taskScore: TaskScore = {
        issueNumber: 1,
        issueId: 1,
        title: 'Array validation',
        score: 70,
        priority: 'medium' as any,
        category: 'feature' as any,
        confidence: 0.7,
        reasons: ['Reason 1', 'Reason 2', 'Reason 3'],
        labels: ['label1', 'label2'],
        state: 'open',
        createdAt: '2023-12-01T10:00:00Z',
        updatedAt: '2023-12-01T10:00:00Z',
        url: 'https://github.com/test/repo/issues/1',
      };

      expect(Array.isArray(taskScore.reasons)).toBe(true);
      expect(Array.isArray(taskScore.labels)).toBe(true);
      expect(taskScore.reasons).toHaveLength(3);
      expect(taskScore.labels).toHaveLength(2);
    });
  });

  describe('EnhancedTaskScore Interface', () => {
    it('should validate complete EnhancedTaskScore structure', () => {
      const enhancedTaskScore: EnhancedTaskScore = {
        // Base TaskScore properties
        issueNumber: 123,
        issueId: 456,
        title: 'Enhanced task scoring',
        body: 'Enhanced task with detailed breakdown',
        score: 92,
        priority: 'high' as any,
        category: 'bug' as any,
        confidence: 0.95,
        reasons: ['Critical issue', 'High impact'],
        labels: ['bug', 'critical'],
        state: 'open',
        createdAt: '2023-12-01T10:00:00Z',
        updatedAt: '2023-12-01T15:30:00Z',
        url: 'https://github.com/test/repo/issues/123',

        // Enhanced properties
        scoreBreakdown: {
          category: 40,
          priority: 35,
          recency: 10,
          custom: 7,
        },
        metadata: {
          configVersion: '2.1.0',
          algorithmVersion: '1.5.2',
          profileId: 'user-123',
          cacheHit: true,
          processingTimeMs: 45,
          repositoryContext: {
            owner: 'test-owner',
            repo: 'test-repo',
            branch: 'main',
          },
        },
        classification: {
          primaryCategory: 'bug',
          primaryConfidence: 0.95,
          estimatedPriority: 'high',
          priorityConfidence: 0.88,
          categories: [
            {
              category: 'bug',
              reasons: ['Error in authentication'],
              keywords: ['auth', 'login', 'error'],
            },
          ],
        } as any,
      };

      expect(enhancedTaskScore.issueNumber).toBe(123);
      expect(enhancedTaskScore.scoreBreakdown.category).toBe(40);
      expect(enhancedTaskScore.scoreBreakdown.priority).toBe(35);
      expect(enhancedTaskScore.scoreBreakdown.recency).toBe(10);
      expect(enhancedTaskScore.scoreBreakdown.custom).toBe(7);
      expect(enhancedTaskScore.metadata.configVersion).toBe('2.1.0');
      expect(enhancedTaskScore.metadata.algorithmVersion).toBe('1.5.2');
      expect(enhancedTaskScore.metadata.profileId).toBe('user-123');
      expect(enhancedTaskScore.metadata.cacheHit).toBe(true);
      expect(enhancedTaskScore.metadata.processingTimeMs).toBe(45);
      expect(enhancedTaskScore.metadata.repositoryContext?.owner).toBe('test-owner');
      expect(enhancedTaskScore.metadata.repositoryContext?.repo).toBe('test-repo');
      expect(enhancedTaskScore.metadata.repositoryContext?.branch).toBe('main');
      expect(enhancedTaskScore.classification.primaryCategory).toBe('bug');
      expect(enhancedTaskScore.classification.primaryConfidence).toBe(0.95);
    });

    it('should validate minimal EnhancedTaskScore structure', () => {
      const enhancedTaskScore: EnhancedTaskScore = {
        // Base TaskScore properties
        issueNumber: 1,
        issueId: 1,
        title: 'Minimal enhanced task',
        score: 50,
        priority: 'medium' as any,
        category: 'feature' as any,
        confidence: 0.5,
        reasons: ['Basic scoring'],
        labels: ['feature'],
        state: 'open',
        createdAt: '2023-12-01T10:00:00Z',
        updatedAt: '2023-12-01T10:00:00Z',
        url: 'https://github.com/test/repo/issues/1',

        // Enhanced properties (minimal)
        scoreBreakdown: {
          category: 30,
          priority: 20,
        },
        metadata: {
          configVersion: '2.0.0',
          algorithmVersion: '1.0.0',
          cacheHit: false,
          processingTimeMs: 120,
        },
        classification: {
          primaryCategory: 'feature',
          primaryConfidence: 0.5,
          estimatedPriority: 'medium',
          priorityConfidence: 0.4,
          categories: [],
        } as any,
      };

      expect(enhancedTaskScore.scoreBreakdown.category).toBe(30);
      expect(enhancedTaskScore.scoreBreakdown.priority).toBe(20);
      expect(enhancedTaskScore.scoreBreakdown.recency).toBeUndefined();
      expect(enhancedTaskScore.scoreBreakdown.custom).toBeUndefined();
      expect(enhancedTaskScore.metadata.profileId).toBeUndefined();
      expect(enhancedTaskScore.metadata.repositoryContext).toBeUndefined();
    });

    it('should inherit all TaskScore properties', () => {
      const taskScore: TaskScore = {
        issueNumber: 1,
        issueId: 1,
        title: 'Base task',
        score: 70,
        priority: 'medium' as any,
        category: 'feature' as any,
        confidence: 0.7,
        reasons: ['Base reason'],
        labels: ['feature'],
        state: 'open',
        createdAt: '2023-12-01T10:00:00Z',
        updatedAt: '2023-12-01T10:00:00Z',
        url: 'https://github.com/test/repo/issues/1',
      };

      const enhancedTaskScore: EnhancedTaskScore = {
        ...taskScore,
        scoreBreakdown: {
          category: 35,
          priority: 35,
        },
        metadata: {
          configVersion: '2.0.0',
          algorithmVersion: '1.0.0',
          cacheHit: false,
          processingTimeMs: 100,
        },
        classification: {
          primaryCategory: 'feature',
          primaryConfidence: 0.7,
          estimatedPriority: 'medium',
          priorityConfidence: 0.6,
          categories: [],
        } as any,
      };

      expect(enhancedTaskScore.issueNumber).toBe(taskScore.issueNumber);
      expect(enhancedTaskScore.title).toBe(taskScore.title);
      expect(enhancedTaskScore.score).toBe(taskScore.score);
      expect(enhancedTaskScore.priority).toBe(taskScore.priority);
      expect(enhancedTaskScore.category).toBe(taskScore.category);
    });

    it('should validate scoreBreakdown structure', () => {
      const enhancedTaskScore: EnhancedTaskScore = {
        issueNumber: 1,
        issueId: 1,
        title: 'Score breakdown test',
        score: 80,
        priority: 'high' as any,
        category: 'bug' as any,
        confidence: 0.8,
        reasons: ['Breakdown test'],
        labels: ['test'],
        state: 'open',
        createdAt: '2023-12-01T10:00:00Z',
        updatedAt: '2023-12-01T10:00:00Z',
        url: 'https://github.com/test/repo/issues/1',

        scoreBreakdown: {
          category: 25,
          priority: 30,
          recency: 15,
          custom: 10,
        },
        metadata: {
          configVersion: '2.0.0',
          algorithmVersion: '1.0.0',
          cacheHit: false,
          processingTimeMs: 50,
        },
        classification: {
          primaryCategory: 'bug',
          primaryConfidence: 0.8,
          estimatedPriority: 'high',
          priorityConfidence: 0.75,
          categories: [],
        } as any,
      };

      expect(enhancedTaskScore.scoreBreakdown.category).toBe(25);
      expect(enhancedTaskScore.scoreBreakdown.priority).toBe(30);
      expect(enhancedTaskScore.scoreBreakdown.recency).toBe(15);
      expect(enhancedTaskScore.scoreBreakdown.custom).toBe(10);
      expect(typeof enhancedTaskScore.scoreBreakdown.category).toBe('number');
      expect(typeof enhancedTaskScore.scoreBreakdown.priority).toBe('number');
    });

    it('should validate metadata structure', () => {
      const enhancedTaskScore: EnhancedTaskScore = {
        issueNumber: 1,
        issueId: 1,
        title: 'Metadata test',
        score: 60,
        priority: 'medium' as any,
        category: 'feature' as any,
        confidence: 0.6,
        reasons: ['Metadata test'],
        labels: ['test'],
        state: 'open',
        createdAt: '2023-12-01T10:00:00Z',
        updatedAt: '2023-12-01T10:00:00Z',
        url: 'https://github.com/test/repo/issues/1',

        scoreBreakdown: {
          category: 30,
          priority: 30,
        },
        metadata: {
          configVersion: '2.1.0',
          algorithmVersion: '1.2.0',
          profileId: 'profile-456',
          cacheHit: true,
          processingTimeMs: 25,
          repositoryContext: {
            owner: 'metadata-owner',
            repo: 'metadata-repo',
            branch: 'develop',
          },
        },
        classification: {
          primaryCategory: 'feature',
          primaryConfidence: 0.6,
          estimatedPriority: 'medium',
          priorityConfidence: 0.55,
          categories: [],
        } as any,
      };

      expect(enhancedTaskScore.metadata.configVersion).toBe('2.1.0');
      expect(enhancedTaskScore.metadata.algorithmVersion).toBe('1.2.0');
      expect(enhancedTaskScore.metadata.profileId).toBe('profile-456');
      expect(enhancedTaskScore.metadata.cacheHit).toBe(true);
      expect(enhancedTaskScore.metadata.processingTimeMs).toBe(25);
      expect(enhancedTaskScore.metadata.repositoryContext?.owner).toBe('metadata-owner');
      expect(enhancedTaskScore.metadata.repositoryContext?.repo).toBe('metadata-repo');
      expect(enhancedTaskScore.metadata.repositoryContext?.branch).toBe('develop');
    });
  });

  describe('TaskScoreUnion and Type Guards', () => {
    it('should validate TaskScoreUnion type', () => {
      const basicTaskScore: TaskScore = {
        issueNumber: 1,
        issueId: 1,
        title: 'Basic task',
        score: 50,
        priority: 'medium' as any,
        category: 'feature' as any,
        confidence: 0.5,
        reasons: ['Basic'],
        labels: ['feature'],
        state: 'open',
        createdAt: '2023-12-01T10:00:00Z',
        updatedAt: '2023-12-01T10:00:00Z',
        url: 'https://github.com/test/repo/issues/1',
      };

      const enhancedTaskScore: EnhancedTaskScore = {
        ...basicTaskScore,
        scoreBreakdown: {
          category: 25,
          priority: 25,
        },
        metadata: {
          configVersion: '2.0.0',
          algorithmVersion: '1.0.0',
          cacheHit: false,
          processingTimeMs: 100,
        },
        classification: {
          primaryCategory: 'feature',
          primaryConfidence: 0.5,
          estimatedPriority: 'medium',
          priorityConfidence: 0.4,
          categories: [],
        } as any,
      };

      const unionTasks: TaskScoreUnion[] = [basicTaskScore, enhancedTaskScore];

      expect(unionTasks).toHaveLength(2);
      expect(unionTasks[0]).toBe(basicTaskScore);
      expect(unionTasks[1]).toBe(enhancedTaskScore);
    });

    it('should validate isEnhancedTaskScore type guard', () => {
      const basicTaskScore: TaskScore = {
        issueNumber: 1,
        issueId: 1,
        title: 'Basic task',
        score: 50,
        priority: 'medium' as any,
        category: 'feature' as any,
        confidence: 0.5,
        reasons: ['Basic'],
        labels: ['feature'],
        state: 'open',
        createdAt: '2023-12-01T10:00:00Z',
        updatedAt: '2023-12-01T10:00:00Z',
        url: 'https://github.com/test/repo/issues/1',
      };

      const enhancedTaskScore: EnhancedTaskScore = {
        ...basicTaskScore,
        scoreBreakdown: {
          category: 25,
          priority: 25,
        },
        metadata: {
          configVersion: '2.0.0',
          algorithmVersion: '1.0.0',
          cacheHit: false,
          processingTimeMs: 100,
        },
        classification: {
          primaryCategory: 'feature',
          primaryConfidence: 0.5,
          estimatedPriority: 'medium',
          priorityConfidence: 0.4,
          categories: [],
        } as any,
      };

      expect(isEnhancedTaskScore(basicTaskScore)).toBe(false);
      expect(isEnhancedTaskScore(enhancedTaskScore)).toBe(true);
    });

    it('should handle type discrimination correctly', () => {
      const tasks: TaskScoreUnion[] = [
        {
          issueNumber: 1,
          issueId: 1,
          title: 'Basic task',
          score: 50,
          priority: 'medium' as any,
          category: 'feature' as any,
          confidence: 0.5,
          reasons: ['Basic'],
          labels: ['feature'],
          state: 'open',
          createdAt: '2023-12-01T10:00:00Z',
          updatedAt: '2023-12-01T10:00:00Z',
          url: 'https://github.com/test/repo/issues/1',
        },
        {
          issueNumber: 2,
          issueId: 2,
          title: 'Enhanced task',
          score: 75,
          priority: 'high' as any,
          category: 'bug' as any,
          confidence: 0.8,
          reasons: ['Enhanced'],
          labels: ['bug'],
          state: 'open',
          createdAt: '2023-12-01T10:00:00Z',
          updatedAt: '2023-12-01T10:00:00Z',
          url: 'https://github.com/test/repo/issues/2',
          scoreBreakdown: {
            category: 40,
            priority: 35,
          },
          metadata: {
            configVersion: '2.0.0',
            algorithmVersion: '1.0.0',
            cacheHit: true,
            processingTimeMs: 50,
          },
          classification: {
            primaryCategory: 'bug',
            primaryConfidence: 0.8,
            estimatedPriority: 'high',
            priorityConfidence: 0.75,
            categories: [],
          } as any,
        },
      ];

      const basicTasks = tasks.filter(task => !isEnhancedTaskScore(task));
      const enhancedTasks = tasks.filter(task => isEnhancedTaskScore(task));

      expect(basicTasks).toHaveLength(1);
      expect(enhancedTasks).toHaveLength(1);
      expect(basicTasks[0]?.issueNumber).toBe(1);
      expect(enhancedTasks[0]?.issueNumber).toBe(2);
    });
  });

  describe('EnhancedTaskRecommendationConfig Interface', () => {
    it('should validate complete configuration', () => {
      const config: EnhancedTaskRecommendationConfig = {
        useEnhancedClassification: true,
        enablePerformanceMetrics: true,
        enableCaching: true,
        repositoryContext: {
          owner: 'test-owner',
          repo: 'test-repo',
          branch: 'main',
        },
        profileId: 'user-123',
        maxResults: 50,
        minConfidence: 0.7,
      };

      expect(config.useEnhancedClassification).toBe(true);
      expect(config.enablePerformanceMetrics).toBe(true);
      expect(config.enableCaching).toBe(true);
      expect(config.repositoryContext?.owner).toBe('test-owner');
      expect(config.repositoryContext?.repo).toBe('test-repo');
      expect(config.repositoryContext?.branch).toBe('main');
      expect(config.profileId).toBe('user-123');
      expect(config.maxResults).toBe(50);
      expect(config.minConfidence).toBe(0.7);
    });

    it('should validate minimal configuration', () => {
      const config: EnhancedTaskRecommendationConfig = {
        useEnhancedClassification: false,
        enablePerformanceMetrics: false,
        enableCaching: false,
      };

      expect(config.useEnhancedClassification).toBe(false);
      expect(config.enablePerformanceMetrics).toBe(false);
      expect(config.enableCaching).toBe(false);
      expect(config.repositoryContext).toBeUndefined();
      expect(config.profileId).toBeUndefined();
      expect(config.maxResults).toBeUndefined();
      expect(config.minConfidence).toBeUndefined();
    });

    it('should validate boolean properties', () => {
      const config: EnhancedTaskRecommendationConfig = {
        useEnhancedClassification: true,
        enablePerformanceMetrics: false,
        enableCaching: true,
      };

      expect(typeof config.useEnhancedClassification).toBe('boolean');
      expect(typeof config.enablePerformanceMetrics).toBe('boolean');
      expect(typeof config.enableCaching).toBe('boolean');
    });

    it('should validate optional numeric properties', () => {
      const config: EnhancedTaskRecommendationConfig = {
        useEnhancedClassification: true,
        enablePerformanceMetrics: true,
        enableCaching: true,
        maxResults: 100,
        minConfidence: 0.85,
      };

      expect(typeof config.maxResults).toBe('number');
      expect(typeof config.minConfidence).toBe('number');
      expect(config.maxResults).toBe(100);
      expect(config.minConfidence).toBe(0.85);
    });
  });

  describe('EnhancedDashboardTasksResult Interface', () => {
    it('should validate complete dashboard result', () => {
      const result: EnhancedDashboardTasksResult = {
        topTasks: [
          {
            taskId: 'task-1',
            issueNumber: 1,
            title: 'Task 1',
            description: 'Task 1 description',
            descriptionHtml: '<p>Task 1 description</p>',
            score: 85,
            priority: 'high' as any,
            category: 'bug' as any,
            confidence: 0.9,
            tags: ['high-priority'],
            reasons: ['High priority'],
            url: 'https://github.com/test/repo/issues/1',
            createdAt: '2023-12-01T10:00:00Z',
            scoreBreakdown: {
              category: 40,
              priority: 35,
              custom: 10,
            },
            metadata: {
              ruleName: 'High Priority Bug',
              ruleId: 'HPB-001',
              processingTimeMs: 25,
              cacheHit: true,
              configVersion: '2.0.0',
              algorithmVersion: '1.0.0',
            },
            classification: {
              primaryCategory: 'bug',
              primaryConfidence: 0.9,
              estimatedPriority: 'high',
              priorityConfidence: 0.85,
              categories: [
                {
                  category: 'bug',
                  reasons: ['Error handling'],
                  keywords: ['error', 'exception'],
                },
              ],
            },
          } as any,
        ],
        totalOpenIssues: 25,
        analysisMetrics: {
          averageScore: 72.5,
          processingTimeMs: 150,
          categoriesFound: ['bug', 'feature', 'enhancement'],
          priorityDistribution: {
            high: 5,
            medium: 15,
            low: 5,
          },
          confidenceDistribution: {
            high: 10,
            medium: 10,
            low: 5,
          },
          algorithmVersion: '1.0.0',
          configVersion: '2.0.0',
        },
        performanceMetrics: {
          cacheHitRate: 0.75,
          totalCacheHits: 18,
          avgProcessingTime: 45,
          throughput: 500,
        },
        lastUpdated: '2023-12-01T16:00:00Z',
      };

      expect(result.topTasks).toHaveLength(1);
      expect(result.topTasks[0]?.issueNumber).toBe(1);
      expect(result.totalOpenIssues).toBe(25);
      expect(result.analysisMetrics.averageScore).toBe(72.5);
      expect(result.analysisMetrics.processingTimeMs).toBe(150);
      expect(result.analysisMetrics.categoriesFound).toEqual(['bug', 'feature', 'enhancement']);
      expect(result.analysisMetrics.priorityDistribution['high']).toBe(5);
      expect(result.analysisMetrics.confidenceDistribution['high']).toBe(10);
      expect(result.performanceMetrics.cacheHitRate).toBe(0.75);
      expect(result.performanceMetrics.totalCacheHits).toBe(18);
      expect(result.performanceMetrics.avgProcessingTime).toBe(45);
      expect(result.performanceMetrics.throughput).toBe(500);
      expect(result.lastUpdated).toBe('2023-12-01T16:00:00Z');
    });

    it('should validate empty dashboard result', () => {
      const result: EnhancedDashboardTasksResult = {
        topTasks: [],
        totalOpenIssues: 0,
        analysisMetrics: {
          averageScore: 0,
          processingTimeMs: 0,
          categoriesFound: [],
          priorityDistribution: {},
          confidenceDistribution: {},
          algorithmVersion: '1.0.0',
          configVersion: '2.0.0',
        },
        performanceMetrics: {
          cacheHitRate: 0,
          totalCacheHits: 0,
          avgProcessingTime: 0,
          throughput: 0,
        },
        lastUpdated: '2023-12-01T16:00:00Z',
      };

      expect(result.topTasks).toEqual([]);
      expect(result.totalOpenIssues).toBe(0);
      expect(result.analysisMetrics.averageScore).toBe(0);
      expect(result.analysisMetrics.categoriesFound).toEqual([]);
      expect(result.analysisMetrics.priorityDistribution).toEqual({});
      expect(result.performanceMetrics.cacheHitRate).toBe(0);
    });
  });

  describe('EnhancedTaskRecommendation Interface', () => {
    it('should validate complete enhanced recommendation', () => {
      const recommendation: EnhancedTaskRecommendation = {
        // Base TaskRecommendation properties
        taskId: 'task-123',
        issueNumber: 123,
        title: 'Enhanced recommendation',
        description: 'Enhanced recommendation description',
        descriptionHtml: '<p>Enhanced recommendation description</p>',
        score: 88,
        priority: 'high' as any,
        category: 'bug' as any,
        confidence: 0.92,
        tags: ['critical', 'bug'],
        reasons: ['Critical bug', 'High impact'],
        url: 'https://github.com/test/repo/issues/123',
        createdAt: '2023-12-01T10:00:00Z',

        // Enhanced properties
        scoreBreakdown: {
          category: 45,
          priority: 35,
          custom: 8,
        },
        metadata: {
          ruleName: 'Critical Bug Detection',
          ruleId: 'CBD-001',
          processingTimeMs: 30,
          cacheHit: false,
          configVersion: '2.1.0',
          algorithmVersion: '1.2.0',
        },
        classification: {
          primaryCategory: 'bug',
          primaryConfidence: 0.92,
          estimatedPriority: 'high',
          priorityConfidence: 0.87,
          categories: [
            {
              category: 'bug',
              reasons: ['Exception handling', 'Error recovery'],
              keywords: ['exception', 'error', 'crash'],
            },
          ],
        },
      };

      expect(recommendation.issueNumber).toBe(123);
      expect(recommendation.title).toBe('Enhanced recommendation');
      expect(recommendation.score).toBe(88);
      expect(recommendation.scoreBreakdown.category).toBe(45);
      expect(recommendation.scoreBreakdown.priority).toBe(35);
      expect(recommendation.scoreBreakdown.custom).toBe(8);
      expect(recommendation.metadata.ruleName).toBe('Critical Bug Detection');
      expect(recommendation.metadata.ruleId).toBe('CBD-001');
      expect(recommendation.metadata.processingTimeMs).toBe(30);
      expect(recommendation.metadata.cacheHit).toBe(false);
      expect(recommendation.classification.primaryCategory).toBe('bug');
      expect(recommendation.classification.primaryConfidence).toBe(0.92);
      expect(recommendation.classification.categories).toHaveLength(1);
      expect(recommendation.classification.categories[0]?.reasons).toEqual([
        'Exception handling',
        'Error recovery',
      ]);
      expect(recommendation.classification.categories[0]?.keywords).toEqual([
        'exception',
        'error',
        'crash',
      ]);
    });

    it('should validate minimal enhanced recommendation', () => {
      const recommendation: EnhancedTaskRecommendation = {
        taskId: 'task-1',
        issueNumber: 1,
        title: 'Minimal recommendation',
        description: 'Minimal recommendation description',
        descriptionHtml: '<p>Minimal recommendation description</p>',
        score: 50,
        priority: 'medium' as any,
        category: 'feature' as any,
        confidence: 0.5,
        tags: ['feature'],
        reasons: ['Basic priority'],
        url: 'https://github.com/test/repo/issues/1',
        createdAt: '2023-12-01T10:00:00Z',

        scoreBreakdown: {
          category: 25,
          priority: 25,
        },
        metadata: {
          processingTimeMs: 100,
          cacheHit: false,
          configVersion: '2.0.0',
          algorithmVersion: '1.0.0',
        },
        classification: {
          primaryCategory: 'feature',
          primaryConfidence: 0.5,
          estimatedPriority: 'medium',
          priorityConfidence: 0.4,
          categories: [],
        },
      };

      expect(recommendation.issueNumber).toBe(1);
      expect(recommendation.scoreBreakdown.category).toBe(25);
      expect(recommendation.scoreBreakdown.priority).toBe(25);
      expect(recommendation.scoreBreakdown.custom).toBeUndefined();
      expect(recommendation.metadata.ruleName).toBeUndefined();
      expect(recommendation.metadata.ruleId).toBeUndefined();
      expect(recommendation.classification.categories).toEqual([]);
    });
  });

  describe('MigrationValidationResult Interface', () => {
    it('should validate complete migration validation result', () => {
      const result: MigrationValidationResult = {
        isValid: true,
        scoreDifference: 2.5,
        categoryMatches: true,
        priorityMatches: true,
        confidenceDifference: 0.05,
        warnings: ['Minor score difference detected'],
        errors: [],
      };

      expect(result.isValid).toBe(true);
      expect(result.scoreDifference).toBe(2.5);
      expect(result.categoryMatches).toBe(true);
      expect(result.priorityMatches).toBe(true);
      expect(result.confidenceDifference).toBe(0.05);
      expect(result.warnings).toEqual(['Minor score difference detected']);
      expect(result.errors).toEqual([]);
    });

    it('should validate failed migration validation result', () => {
      const result: MigrationValidationResult = {
        isValid: false,
        scoreDifference: 15.0,
        categoryMatches: false,
        priorityMatches: false,
        confidenceDifference: 0.3,
        warnings: ['Large score difference', 'Category mismatch'],
        errors: ['Priority classification failed', 'Confidence threshold exceeded'],
      };

      expect(result.isValid).toBe(false);
      expect(result.scoreDifference).toBe(15.0);
      expect(result.categoryMatches).toBe(false);
      expect(result.priorityMatches).toBe(false);
      expect(result.confidenceDifference).toBe(0.3);
      expect(result.warnings).toHaveLength(2);
      expect(result.errors).toHaveLength(2);
    });

    it('should validate boolean properties', () => {
      const result: MigrationValidationResult = {
        isValid: true,
        scoreDifference: 0,
        categoryMatches: true,
        priorityMatches: true,
        confidenceDifference: 0,
        warnings: [],
        errors: [],
      };

      expect(typeof result.isValid).toBe('boolean');
      expect(typeof result.categoryMatches).toBe('boolean');
      expect(typeof result.priorityMatches).toBe('boolean');
    });

    it('should validate numeric properties', () => {
      const result: MigrationValidationResult = {
        isValid: true,
        scoreDifference: 5.75,
        categoryMatches: true,
        priorityMatches: true,
        confidenceDifference: 0.125,
        warnings: [],
        errors: [],
      };

      expect(typeof result.scoreDifference).toBe('number');
      expect(typeof result.confidenceDifference).toBe('number');
      expect(result.scoreDifference).toBe(5.75);
      expect(result.confidenceDifference).toBe(0.125);
    });
  });

  describe('EnhancedClassificationFeatureFlags Interface', () => {
    it('should validate complete feature flags', () => {
      const flags: EnhancedClassificationFeatureFlags = {
        useEnhancedEngine: true,
        enablePerformanceMetrics: true,
        enableCaching: true,
        enableBatchProcessing: true,
        enableMigrationValidation: true,
        gradualRolloutPercentage: 25,
      };

      expect(flags.useEnhancedEngine).toBe(true);
      expect(flags.enablePerformanceMetrics).toBe(true);
      expect(flags.enableCaching).toBe(true);
      expect(flags.enableBatchProcessing).toBe(true);
      expect(flags.enableMigrationValidation).toBe(true);
      expect(flags.gradualRolloutPercentage).toBe(25);
    });

    it('should validate disabled feature flags', () => {
      const flags: EnhancedClassificationFeatureFlags = {
        useEnhancedEngine: false,
        enablePerformanceMetrics: false,
        enableCaching: false,
        enableBatchProcessing: false,
        enableMigrationValidation: false,
        gradualRolloutPercentage: 0,
      };

      expect(flags.useEnhancedEngine).toBe(false);
      expect(flags.enablePerformanceMetrics).toBe(false);
      expect(flags.enableCaching).toBe(false);
      expect(flags.enableBatchProcessing).toBe(false);
      expect(flags.enableMigrationValidation).toBe(false);
      expect(flags.gradualRolloutPercentage).toBe(0);
    });

    it('should validate boolean properties', () => {
      const flags: EnhancedClassificationFeatureFlags = {
        useEnhancedEngine: true,
        enablePerformanceMetrics: false,
        enableCaching: true,
        enableBatchProcessing: false,
        enableMigrationValidation: true,
        gradualRolloutPercentage: 50,
      };

      expect(typeof flags.useEnhancedEngine).toBe('boolean');
      expect(typeof flags.enablePerformanceMetrics).toBe('boolean');
      expect(typeof flags.enableCaching).toBe('boolean');
      expect(typeof flags.enableBatchProcessing).toBe('boolean');
      expect(typeof flags.enableMigrationValidation).toBe('boolean');
    });

    it('should validate rollout percentage', () => {
      const flags: EnhancedClassificationFeatureFlags = {
        useEnhancedEngine: true,
        enablePerformanceMetrics: true,
        enableCaching: true,
        enableBatchProcessing: true,
        enableMigrationValidation: true,
        gradualRolloutPercentage: 75,
      };

      expect(typeof flags.gradualRolloutPercentage).toBe('number');
      expect(flags.gradualRolloutPercentage).toBe(75);
      expect(flags.gradualRolloutPercentage).toBeGreaterThanOrEqual(0);
      expect(flags.gradualRolloutPercentage).toBeLessThanOrEqual(100);
    });
  });

  describe('Type Integration and Backward Compatibility', () => {
    it('should demonstrate backward compatibility', () => {
      // Legacy TaskScore
      const legacyScore: TaskScore = {
        issueNumber: 1,
        issueId: 1,
        title: 'Legacy task',
        score: 70,
        priority: 'medium' as any,
        category: 'feature' as any,
        confidence: 0.7,
        reasons: ['Legacy scoring'],
        labels: ['feature'],
        state: 'open',
        createdAt: '2023-12-01T10:00:00Z',
        updatedAt: '2023-12-01T10:00:00Z',
        url: 'https://github.com/test/repo/issues/1',
      };

      // Enhanced TaskScore with same base properties
      const enhancedScore: EnhancedTaskScore = {
        ...legacyScore,
        scoreBreakdown: {
          category: 35,
          priority: 35,
        },
        metadata: {
          configVersion: '2.0.0',
          algorithmVersion: '1.0.0',
          cacheHit: false,
          processingTimeMs: 100,
        },
        classification: {
          primaryCategory: 'feature',
          primaryConfidence: 0.7,
          estimatedPriority: 'medium',
          priorityConfidence: 0.6,
          categories: [],
        } as any,
      };

      // Both should work in union array
      const scores: TaskScoreUnion[] = [legacyScore, enhancedScore];

      expect(scores).toHaveLength(2);
      expect(scores[0]?.issueNumber).toBe(1);
      expect(scores[1]?.issueNumber).toBe(1);
      expect(isEnhancedTaskScore(scores[0]!)).toBe(false);
      expect(isEnhancedTaskScore(scores[1]!)).toBe(true);
    });

    it('should handle mixed environments', () => {
      const mixedResults: TaskScoreUnion[] = [
        // Legacy system result
        {
          issueNumber: 1,
          issueId: 1,
          title: 'Legacy result',
          score: 60,
          priority: 'medium' as any,
          category: 'feature' as any,
          confidence: 0.6,
          reasons: ['Legacy processing'],
          labels: ['feature'],
          state: 'open',
          createdAt: '2023-12-01T10:00:00Z',
          updatedAt: '2023-12-01T10:00:00Z',
          url: 'https://github.com/test/repo/issues/1',
        },
        // Enhanced system result
        {
          issueNumber: 2,
          issueId: 2,
          title: 'Enhanced result',
          score: 85,
          priority: 'high' as any,
          category: 'bug' as any,
          confidence: 0.9,
          reasons: ['Enhanced processing'],
          labels: ['bug'],
          state: 'open',
          createdAt: '2023-12-01T10:00:00Z',
          updatedAt: '2023-12-01T10:00:00Z',
          url: 'https://github.com/test/repo/issues/2',
          scoreBreakdown: {
            category: 45,
            priority: 40,
          },
          metadata: {
            configVersion: '2.0.0',
            algorithmVersion: '1.0.0',
            cacheHit: true,
            processingTimeMs: 50,
          },
          classification: {
            primaryCategory: 'bug',
            primaryConfidence: 0.9,
            estimatedPriority: 'high',
            priorityConfidence: 0.85,
            categories: [],
          } as any,
        },
      ];

      const processedResults = mixedResults.map(result => {
        if (isEnhancedTaskScore(result)) {
          return {
            ...result,
            processingType: 'enhanced',
            detailedMetrics: result.metadata,
          };
        } else {
          return {
            ...result,
            processingType: 'legacy',
          };
        }
      });

      expect(processedResults).toHaveLength(2);
      expect(processedResults[0]?.processingType).toBe('legacy');
      expect(processedResults[1]?.processingType).toBe('enhanced');
    });
  });

  describe('Real-world Usage Scenarios', () => {
    it('should handle enhanced dashboard workflow', () => {
      const config: EnhancedTaskRecommendationConfig = {
        useEnhancedClassification: true,
        enablePerformanceMetrics: true,
        enableCaching: true,
        repositoryContext: {
          owner: 'test-org',
          repo: 'test-project',
          branch: 'main',
        },
        profileId: 'developer-123',
        maxResults: 10,
        minConfidence: 0.8,
      };

      const dashboardResult: EnhancedDashboardTasksResult = {
        topTasks: [
          {
            taskId: 'task-456',
            issueNumber: 456,
            title: 'Critical security vulnerability',
            description: 'Critical security vulnerability description',
            descriptionHtml: '<p>Critical security vulnerability description</p>',
            score: 95,
            priority: 'critical' as any,
            category: 'bug' as any,
            confidence: 0.96,
            tags: ['security', 'critical'],
            reasons: ['Security issue', 'Critical priority'],
            url: 'https://github.com/test-org/test-project/issues/456',
            createdAt: '2023-12-01T10:00:00Z',
            scoreBreakdown: {
              category: 50,
              priority: 40,
              custom: 5,
            },
            metadata: {
              ruleName: 'Security Vulnerability Detection',
              ruleId: 'SVD-001',
              processingTimeMs: 15,
              cacheHit: false,
              configVersion: '2.1.0',
              algorithmVersion: '1.2.0',
            },
            classification: {
              primaryCategory: 'bug',
              primaryConfidence: 0.96,
              estimatedPriority: 'critical',
              priorityConfidence: 0.94,
              categories: [
                {
                  category: 'bug',
                  reasons: ['Security vulnerability', 'Authentication bypass'],
                  keywords: ['auth', 'security', 'vulnerability'],
                },
              ],
            },
          } as any,
        ],
        totalOpenIssues: 15,
        analysisMetrics: {
          averageScore: 78.5,
          processingTimeMs: 200,
          categoriesFound: ['bug', 'feature'],
          priorityDistribution: {
            critical: 1,
            high: 3,
            medium: 8,
            low: 3,
          },
          confidenceDistribution: {
            high: 10,
            medium: 4,
            low: 1,
          },
          algorithmVersion: '1.2.0',
          configVersion: '2.1.0',
        },
        performanceMetrics: {
          cacheHitRate: 0.8,
          totalCacheHits: 12,
          avgProcessingTime: 35,
          throughput: 800,
        },
        lastUpdated: '2023-12-01T17:00:00Z',
      };

      expect(dashboardResult.topTasks).toHaveLength(1);
      expect(dashboardResult.topTasks[0]?.score).toBe(95);
      expect(dashboardResult.topTasks[0]?.scoreBreakdown.category).toBe(50);
      expect(dashboardResult.analysisMetrics.averageScore).toBe(78.5);
      expect(dashboardResult.performanceMetrics.cacheHitRate).toBe(0.8);
      expect(config.repositoryContext?.owner).toBe('test-org');
      expect(config.minConfidence).toBe(0.8);
    });

    it('should handle migration validation workflow', () => {
      const legacyResult: TaskScore = {
        issueNumber: 789,
        issueId: 789,
        title: 'Performance optimization',
        score: 72,
        priority: 'medium' as any,
        category: 'enhancement' as any,
        confidence: 0.75,
        reasons: ['Performance improvement'],
        labels: ['performance'],
        state: 'open',
        createdAt: '2023-12-01T10:00:00Z',
        updatedAt: '2023-12-01T10:00:00Z',
        url: 'https://github.com/test/repo/issues/789',
      };

      const enhancedResult: EnhancedTaskScore = {
        ...legacyResult,
        score: 75,
        confidence: 0.8,
        scoreBreakdown: {
          category: 35,
          priority: 30,
          custom: 10,
        },
        metadata: {
          configVersion: '2.0.0',
          algorithmVersion: '1.0.0',
          cacheHit: true,
          processingTimeMs: 40,
        },
        classification: {
          primaryCategory: 'enhancement',
          primaryConfidence: 0.8,
          estimatedPriority: 'medium',
          priorityConfidence: 0.7,
          categories: [],
        } as any,
      };

      const validationResult: MigrationValidationResult = {
        isValid: true,
        scoreDifference: 3,
        categoryMatches: true,
        priorityMatches: true,
        confidenceDifference: 0.05,
        warnings: ['Minor score adjustment'],
        errors: [],
      };

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.scoreDifference).toBe(3);
      expect(validationResult.categoryMatches).toBe(true);
      expect(validationResult.priorityMatches).toBe(true);
      expect(legacyResult.score).toBe(72);
      expect(enhancedResult.score).toBe(75);
      expect(isEnhancedTaskScore(enhancedResult)).toBe(true);
    });
  });
});

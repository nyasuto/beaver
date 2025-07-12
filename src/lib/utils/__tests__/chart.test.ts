/**
 * Chart Utilities Test Suite
 *
 * Issue #98 - チャートユーティリティのテスト実装
 * 90%+ statement coverage, 85%+ branch coverage, 100% function coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ChartType } from 'chart.js';
import type {
  IssueClassification,
  EnhancedIssueClassification,
} from '../../schemas/classification';
import {
  type PerformanceMetrics,
  convertTimeSeriesData,
  convertCategoryData,
  convertPieData,
  convertClassificationData,
  convertEnhancedClassificationData,
  convertClassificationDataUniversal,
  isEnhancedClassificationArray,
  convertPerformanceData,
  generateChartOptions,
  generateChartConfig,
  calculateChartDimensions,
  debounce,
  formatChartValue,
  LIGHT_THEME,
  DARK_THEME,
  CHART_COLORS,
  type ChartTheme,
} from '../chart';

// Type definitions for tests
type TimeSeriesPoint = {
  timestamp: Date;
  value: number;
};

describe('Chart Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Theme Constants', () => {
    it('LIGHT_THEME が正しい構造を持つこと', () => {
      expect(LIGHT_THEME).toBeDefined();
      expect(LIGHT_THEME.colors).toBeDefined();
      expect(LIGHT_THEME.fonts).toBeDefined();
      expect(LIGHT_THEME.grid).toBeDefined();

      expect(typeof LIGHT_THEME.colors.primary).toBe('string');
      expect(typeof LIGHT_THEME.fonts.family).toBe('string');
      expect(typeof LIGHT_THEME.fonts.size).toBe('number');
      expect(typeof LIGHT_THEME.grid.color).toBe('string');
    });

    it('DARK_THEME が正しい構造を持つこと', () => {
      expect(DARK_THEME).toBeDefined();
      expect(DARK_THEME.colors).toBeDefined();
      expect(DARK_THEME.fonts).toBeDefined();
      expect(DARK_THEME.grid).toBeDefined();

      expect(typeof DARK_THEME.colors.primary).toBe('string');
      expect(typeof DARK_THEME.fonts.family).toBe('string');
      expect(typeof DARK_THEME.fonts.size).toBe('number');
      expect(typeof DARK_THEME.grid.color).toBe('string');
    });

    it('CHART_COLORS が適切な配列を持つこと', () => {
      expect(CHART_COLORS).toBeDefined();
      expect(Array.isArray(CHART_COLORS)).toBe(true);
      expect(CHART_COLORS.length).toBeGreaterThan(0);

      CHART_COLORS.forEach(color => {
        expect(typeof color).toBe('string');
        expect(color).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });
  });

  describe('convertTimeSeriesData', () => {
    const mockTimeSeriesData: TimeSeriesPoint[] = [
      { timestamp: new Date('2023-01-01'), value: 10 },
      { timestamp: new Date('2023-01-02'), value: 15 },
      { timestamp: new Date('2023-01-03'), value: 12 },
    ];

    it('基本的なタイムシリーズデータを変換できること', () => {
      const result = convertTimeSeriesData(mockTimeSeriesData);

      expect(result).toBeDefined();
      expect(result.labels).toHaveLength(3);
      expect(result.datasets).toHaveLength(1);

      const dataset = result.datasets[0]!;
      expect(dataset.label).toBe('Data');
      expect(dataset.data).toEqual([10, 15, 12]);
      expect(dataset.borderColor).toBe(CHART_COLORS[0]!);
      expect(dataset.fill).toBe(false);
      expect(dataset.tension).toBe(0.1);
    });

    it('カスタムラベルと色を設定できること', () => {
      const customLabel = 'Custom Series';
      const customColor = '#FF0000';

      const result = convertTimeSeriesData(mockTimeSeriesData, customLabel, customColor);

      expect(result.datasets[0]!.label).toBe(customLabel);
      expect(result.datasets[0]!.borderColor).toBe(customColor);
      expect(result.datasets[0]!.backgroundColor).toBe(customColor + '20');
    });

    it('空のデータ配列を処理できること', () => {
      const result = convertTimeSeriesData([]);

      expect(result.labels).toHaveLength(0);
      expect(result.datasets).toHaveLength(1);
      expect(result.datasets[0]!.data).toHaveLength(0);
    });

    it('デフォルト値が正しく適用されること', () => {
      const result = convertTimeSeriesData(mockTimeSeriesData);

      expect(result.datasets[0]!.label).toBe('Data');
      expect(result.datasets[0]!.borderColor).toBe(CHART_COLORS[0]!);
    });

    it('CHART_COLORS配列が空の場合にフォールバック色を使用すること', () => {
      // Mock empty CHART_COLORS array
      const originalColors = [...CHART_COLORS];
      CHART_COLORS.length = 0;

      const result = convertTimeSeriesData(mockTimeSeriesData);

      expect(result.datasets[0]!.borderColor).toBe('#3B82F6');

      // Restore original array
      CHART_COLORS.push(...originalColors);
    });

    it('日付ラベルが正しく変換されること', () => {
      const result = convertTimeSeriesData(mockTimeSeriesData);

      expect(result.labels).toEqual(['2023/1/1', '2023/1/2', '2023/1/3']);
    });
  });

  describe('convertCategoryData', () => {
    const mockCategoryData = {
      Bug: 25,
      Feature: 15,
      Enhancement: 10,
      Documentation: 5,
    };

    it('基本的なカテゴリデータを変換できること', () => {
      const result = convertCategoryData(mockCategoryData);

      expect(result).toBeDefined();
      expect(result.labels).toEqual(['Bug', 'Feature', 'Enhancement', 'Documentation']);
      expect(result.datasets).toHaveLength(1);

      const dataset = result.datasets[0]!;
      expect(dataset.label).toBe('Count');
      expect(dataset.data).toEqual([25, 15, 10, 5]);
      expect(dataset.borderWidth).toBe(1);
    });

    it('カスタムラベルと色を設定できること', () => {
      const customLabel = 'Issue Count';
      const customColors = ['#FF0000', '#00FF00', '#0000FF'];

      const result = convertCategoryData(mockCategoryData, customLabel, customColors);

      expect(result.datasets[0]!.label).toBe(customLabel);
      expect((result.datasets[0]!.backgroundColor as string[])[0]).toBe(customColors[0] + '80');
      expect((result.datasets[0]!.borderColor as string[])[0]).toBe(customColors[0]);
    });

    it('空のデータオブジェクトを処理できること', () => {
      const result = convertCategoryData({});

      expect(result.labels).toHaveLength(0);
      expect(result.datasets[0]!.data).toHaveLength(0);
    });

    it('色のループが正しく動作すること', () => {
      const manyCategories: Record<string, number> = {};
      for (let i = 0; i < 15; i++) {
        manyCategories[`Category${i}`] = i;
      }

      const result = convertCategoryData(manyCategories);
      const dataset = result.datasets[0]!;

      // 色は CHART_COLORS の長さでループする
      expect((dataset.backgroundColor as string[]).length).toBe(15);
      expect((dataset.backgroundColor as string[])[0]).toContain(CHART_COLORS[0]!);
      expect((dataset.backgroundColor as string[])[10]).toContain(CHART_COLORS[0]!); // ループして最初の色
    });

    it('透明度が正しく適用されること', () => {
      const result = convertCategoryData(mockCategoryData);
      const dataset = result.datasets[0]!;

      (dataset.backgroundColor as string[]).forEach(color => {
        expect(color).toMatch(/80$/); // 透明度80が末尾に付与
      });
    });
  });

  describe('convertPieData', () => {
    const mockPieData = {
      Open: 60,
      Closed: 35,
      'In Progress': 5,
    };

    it('基本的なパイデータを変換できること', () => {
      const result = convertPieData(mockPieData);

      expect(result).toBeDefined();
      expect(result.labels).toEqual(['Open', 'Closed', 'In Progress']);
      expect(result.datasets).toHaveLength(1);

      const dataset = result.datasets[0]!;
      expect(dataset.data).toEqual([60, 35, 5]);
      expect(dataset.borderWidth).toBe(2);
    });

    it('カスタム色を設定できること', () => {
      const customColors = ['#FF0000', '#00FF00', '#0000FF'];

      const result = convertPieData(mockPieData, customColors);
      const dataset = result.datasets[0]!;

      expect((dataset.backgroundColor as string[])[0]).toBe(customColors[0] + '80');
      expect((dataset.borderColor as string[])[0]).toBe(customColors[0]);
    });

    it('空のデータオブジェクトを処理できること', () => {
      const result = convertPieData({});

      expect(result.labels).toHaveLength(0);
      expect(result.datasets[0]!.data).toHaveLength(0);
    });

    it('単一データ項目を処理できること', () => {
      const singleData = { 'Only Item': 100 };
      const result = convertPieData(singleData);

      expect(result.labels).toEqual(['Only Item']);
      expect(result.datasets[0]!.data).toEqual([100]);
    });
  });

  describe('convertClassificationData', () => {
    const mockClassifications: IssueClassification[] = [
      {
        issueId: 1,
        issueNumber: 1,
        primaryCategory: 'bug',
        classifications: [
          { category: 'bug', confidence: 0.9, reasons: ['Test reason'], keywords: ['bug'] },
        ],
        primaryConfidence: 0.9,
        estimatedPriority: 'high',
        priorityConfidence: 0.9,
        processingTimeMs: 100,
        version: '1.0.0',
        metadata: {
          titleLength: 20,
          bodyLength: 100,
          hasCodeBlocks: false,
          hasStepsToReproduce: false,
          hasExpectedBehavior: false,
          labelCount: 0,
          existingLabels: [],
        },
      },
      {
        issueId: 2,
        issueNumber: 2,
        primaryCategory: 'feature',
        classifications: [
          { category: 'feature', confidence: 0.6, reasons: ['Test reason'], keywords: ['feature'] },
        ],
        primaryConfidence: 0.6,
        estimatedPriority: 'medium',
        priorityConfidence: 0.6,
        processingTimeMs: 100,
        version: '1.0.0',
        metadata: {
          titleLength: 15,
          bodyLength: 50,
          hasCodeBlocks: false,
          hasStepsToReproduce: false,
          hasExpectedBehavior: false,
          labelCount: 0,
          existingLabels: [],
        },
      },
      {
        issueId: 3,
        issueNumber: 3,
        primaryCategory: 'bug',
        classifications: [
          { category: 'bug', confidence: 0.2, reasons: ['Test reason'], keywords: ['bug'] },
        ],
        primaryConfidence: 0.2,
        estimatedPriority: 'low',
        priorityConfidence: 0.2,
        processingTimeMs: 100,
        version: '1.0.0',
        metadata: {
          titleLength: 10,
          bodyLength: 25,
          hasCodeBlocks: false,
          hasStepsToReproduce: false,
          hasExpectedBehavior: false,
          labelCount: 0,
          existingLabels: [],
        },
      },
    ];

    it('分類データを適切に変換できること', () => {
      const result = convertClassificationData(mockClassifications);

      expect(result).toBeDefined();
      expect(result.categoryDistribution).toBeDefined();
      expect(result.priorityDistribution).toBeDefined();
      expect(result.confidenceDistribution).toBeDefined();
    });

    it('カテゴリ分布が正しく計算されること', () => {
      const result = convertClassificationData(mockClassifications);
      const categoryData = result.categoryDistribution;

      expect(categoryData.labels).toContain('bug');
      expect(categoryData.labels).toContain('feature');

      // bugが2つ、featureが1つ
      const bugIndex = categoryData.labels!.indexOf('bug');
      const featureIndex = categoryData.labels!.indexOf('feature');
      expect(categoryData.datasets[0]!.data[bugIndex]).toBe(2);
      expect(categoryData.datasets[0]!.data[featureIndex]).toBe(1);
    });

    it('優先度分布が正しく計算されること', () => {
      const result = convertClassificationData(mockClassifications);
      const priorityData = result.priorityDistribution;

      expect(priorityData.labels).toContain('high');
      expect(priorityData.labels).toContain('medium');
      expect(priorityData.labels).toContain('low');
    });

    it('信頼度範囲が正しく計算されること', () => {
      const result = convertClassificationData(mockClassifications);
      const confidenceData = result.confidenceDistribution;

      expect(confidenceData.labels).toContain('Low (0-0.3)');
      expect(confidenceData.labels).toContain('Medium (0.3-0.7)');
      expect(confidenceData.labels).toContain('High (0.7-1.0)');

      // confidence: 0.9 (High), 0.6 (Medium), 0.2 (Low)
      const lowIndex = confidenceData.labels!.indexOf('Low (0-0.3)');
      const mediumIndex = confidenceData.labels!.indexOf('Medium (0.3-0.7)');
      const highIndex = confidenceData.labels!.indexOf('High (0.7-1.0)');

      expect(confidenceData.datasets[0]!.data[lowIndex]).toBe(1);
      expect(confidenceData.datasets[0]!.data[mediumIndex]).toBe(1);
      expect(confidenceData.datasets[0]!.data[highIndex]).toBe(1);
    });

    it('空の分類配列を処理できること', () => {
      const result = convertClassificationData([]);

      expect(result.categoryDistribution.labels).toHaveLength(0);
      expect(result.priorityDistribution.labels).toHaveLength(0);
      expect(result.confidenceDistribution.labels).toEqual([
        'Low (0-0.3)',
        'Medium (0.3-0.7)',
        'High (0.7-1.0)',
      ]);
      expect(result.confidenceDistribution.datasets[0]!.data).toEqual([0, 0, 0]);
    });

    it('信頼度境界値が正しく処理されること', () => {
      const boundaryClassifications: IssueClassification[] = [
        {
          issueId: 1,
          issueNumber: 1,
          primaryCategory: 'test',
          classifications: [
            { category: 'test', confidence: 0.3, reasons: ['Test reason'], keywords: ['test'] },
          ],
          primaryConfidence: 0.3,
          estimatedPriority: 'medium',
          priorityConfidence: 0.3,
          processingTimeMs: 100,
          version: '1.0.0',
          metadata: {
            titleLength: 10,
            bodyLength: 30,
            hasCodeBlocks: false,
            hasStepsToReproduce: false,
            hasExpectedBehavior: false,
            labelCount: 0,
            existingLabels: [],
          },
        },
        {
          issueId: 2,
          issueNumber: 2,
          primaryCategory: 'test',
          classifications: [
            { category: 'test', confidence: 0.7, reasons: ['Test reason'], keywords: ['test'] },
          ],
          primaryConfidence: 0.7,
          estimatedPriority: 'high',
          priorityConfidence: 0.7,
          processingTimeMs: 100,
          version: '1.0.0',
          metadata: {
            titleLength: 15,
            bodyLength: 50,
            hasCodeBlocks: false,
            hasStepsToReproduce: false,
            hasExpectedBehavior: false,
            labelCount: 0,
            existingLabels: [],
          },
        },
      ];

      const result = convertClassificationData(boundaryClassifications);
      const confidenceData = result.confidenceDistribution;

      const mediumIndex = confidenceData.labels!.indexOf('Medium (0.3-0.7)');
      const highIndex = confidenceData.labels!.indexOf('High (0.7-1.0)');

      expect(confidenceData.datasets[0]!.data[mediumIndex]).toBe(1); // 0.3 -> Medium
      expect(confidenceData.datasets[0]!.data[highIndex]).toBe(1); // 0.7 -> High
    });
  });

  describe('convertEnhancedClassificationData', () => {
    const mockEnhancedClassifications: EnhancedIssueClassification[] = [
      {
        issueId: 1,
        issueNumber: 1,
        primaryCategory: 'bug',
        primaryConfidence: 0.95,
        estimatedPriority: 'critical',
        priorityConfidence: 0.9,
        score: 85,
        scoreBreakdown: {
          category: 30,
          priority: 35,
          recency: 15,
          custom: 0,
        },
        processingTimeMs: 100,
        cacheHit: false,
        algorithmVersion: '2.0.0',
        configVersion: '2.0.0',
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
      {
        issueId: 2,
        issueNumber: 2,
        primaryCategory: 'feature',
        primaryConfidence: 0.7,
        estimatedPriority: 'medium',
        priorityConfidence: 0.8,
        score: 60,
        scoreBreakdown: {
          category: 20,
          priority: 25,
          recency: 0,
          custom: 0,
        },
        processingTimeMs: 100,
        cacheHit: false,
        algorithmVersion: '2.0.0',
        configVersion: '2.0.0',
        profileId: 'test-profile',
        classifications: [
          {
            ruleId: 'feature-request',
            ruleName: 'Feature Request',
            category: 'feature',
            confidence: 0.7,
            reasons: ['Feature request patterns', 'Enhancement indicators'],
            keywords: ['feature', 'enhancement', 'request'],
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
      {
        issueId: 3,
        issueNumber: 3,
        primaryCategory: 'bug',
        primaryConfidence: 0.4,
        estimatedPriority: 'low',
        priorityConfidence: 0.5,
        score: 30,
        scoreBreakdown: {
          category: 10,
          priority: 15,
          recency: 0,
          custom: 0,
        },
        processingTimeMs: 100,
        cacheHit: false,
        algorithmVersion: '2.0.0',
        configVersion: '2.0.0',
        profileId: 'test-profile',
        classifications: [
          {
            ruleId: 'minor-bug',
            ruleName: 'Minor Bug',
            category: 'bug',
            confidence: 0.4,
            reasons: ['Minor issue indicators', 'Low severity'],
            keywords: ['minor', 'bug', 'small'],
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
    ];

    it('拡張分類データを適切に変換できること', () => {
      const result = convertEnhancedClassificationData(mockEnhancedClassifications);

      expect(result).toBeDefined();
      expect(result.categoryDistribution).toBeDefined();
      expect(result.priorityDistribution).toBeDefined();
      expect(result.confidenceDistribution).toBeDefined();
      expect(result.scoreDistribution).toBeDefined();
      expect(result.scoreBreakdownChart).toBeDefined();
    });

    it('スコア分布が正しく計算されること', () => {
      const result = convertEnhancedClassificationData(mockEnhancedClassifications);
      const scoreData = result.scoreDistribution;

      expect(scoreData.labels).toContain('Low (0-25)');
      expect(scoreData.labels).toContain('Medium (25-50)');
      expect(scoreData.labels).toContain('High (50-75)');
      expect(scoreData.labels).toContain('Very High (75-100)');

      // scores: 85 (Very High), 60 (High), 30 (Medium)
      const lowIndex = scoreData.labels!.indexOf('Low (0-25)');
      const mediumIndex = scoreData.labels!.indexOf('Medium (25-50)');
      const highIndex = scoreData.labels!.indexOf('High (50-75)');
      const veryHighIndex = scoreData.labels!.indexOf('Very High (75-100)');

      expect(scoreData.datasets[0]!.data[lowIndex]).toBe(0);
      expect(scoreData.datasets[0]!.data[mediumIndex]).toBe(1);
      expect(scoreData.datasets[0]!.data[highIndex]).toBe(1);
      expect(scoreData.datasets[0]!.data[veryHighIndex]).toBe(1);
    });

    it('スコア内訳チャートが正しく計算されること', () => {
      const result = convertEnhancedClassificationData(mockEnhancedClassifications);
      const scoreBreakdownData = result.scoreBreakdownChart;

      expect(scoreBreakdownData.labels).toContain('Category');
      expect(scoreBreakdownData.labels).toContain('Priority');
      expect(scoreBreakdownData.labels).toContain('Recency');
      expect(scoreBreakdownData.labels).toContain('Custom');

      // Average: category: 20, priority: 25, recency: 5, custom: 0
      const categoryIndex = scoreBreakdownData.labels!.indexOf('Category');
      const priorityIndex = scoreBreakdownData.labels!.indexOf('Priority');
      const recencyIndex = scoreBreakdownData.labels!.indexOf('Recency');
      const customIndex = scoreBreakdownData.labels!.indexOf('Custom');

      expect(scoreBreakdownData.datasets[0]!.data[categoryIndex]).toBe(20); // (30+20+10)/3
      expect(scoreBreakdownData.datasets[0]!.data[priorityIndex]).toBe(25); // (35+25+15)/3
      expect(scoreBreakdownData.datasets[0]!.data[recencyIndex]).toBe(5); // (15+0+0)/3
      expect(scoreBreakdownData.datasets[0]!.data[customIndex]).toBe(0); // (0+0+0)/3
    });

    it('信頼度分布が正しく計算されること', () => {
      const result = convertEnhancedClassificationData(mockEnhancedClassifications);
      const confidenceData = result.confidenceDistribution;

      // confidence: 0.95 (High), 0.7 (High), 0.4 (Medium)
      const lowIndex = confidenceData.labels!.indexOf('Low (0-0.3)');
      const mediumIndex = confidenceData.labels!.indexOf('Medium (0.3-0.7)');
      const highIndex = confidenceData.labels!.indexOf('High (0.7-1.0)');

      expect(confidenceData.datasets[0]!.data[lowIndex]).toBe(0);
      expect(confidenceData.datasets[0]!.data[mediumIndex]).toBe(1); // 0.4
      expect(confidenceData.datasets[0]!.data[highIndex]).toBe(2); // 0.95, 0.7
    });

    it('空の拡張分類配列を処理できること', () => {
      const result = convertEnhancedClassificationData([]);

      expect(result.categoryDistribution.labels).toHaveLength(0);
      expect(result.priorityDistribution.labels).toHaveLength(0);
      expect(result.scoreDistribution.datasets[0]!.data).toEqual([0, 0, 0, 0]);
      expect(result.scoreBreakdownChart.datasets[0]!.data).toEqual([0, 0, 0, 0]);
    });

    it('スコア境界値が正しく処理されること', () => {
      const boundaryClassifications: EnhancedIssueClassification[] = [
        {
          issueId: 4,
          issueNumber: 4,
          primaryCategory: 'test',
          primaryConfidence: 0.5,
          estimatedPriority: 'medium',
          priorityConfidence: 0.5,
          score: 25, // Medium boundary
          scoreBreakdown: { category: 10, priority: 10, custom: 0 },
          processingTimeMs: 100,
          cacheHit: false,
          algorithmVersion: '2.0.0',
          configVersion: '2.0.0',
          profileId: 'test-profile',
          classifications: [],
          metadata: {
            titleLength: 15,
            bodyLength: 25,
            hasCodeBlocks: false,
            hasStepsToReproduce: false,
            hasExpectedBehavior: false,
            labelCount: 1,
            existingLabels: ['test'],
            repositoryContext: {
              owner: 'test-owner',
              repo: 'test-repo',
              branch: 'main',
            },
          },
        },
        {
          issueId: 5,
          issueNumber: 5,
          primaryCategory: 'test',
          primaryConfidence: 0.5,
          estimatedPriority: 'medium',
          priorityConfidence: 0.5,
          score: 50, // High boundary
          scoreBreakdown: { category: 20, priority: 20, custom: 0 },
          processingTimeMs: 100,
          cacheHit: false,
          algorithmVersion: '2.0.0',
          configVersion: '2.0.0',
          profileId: 'test-profile',
          classifications: [],
          metadata: {
            titleLength: 15,
            bodyLength: 25,
            hasCodeBlocks: false,
            hasStepsToReproduce: false,
            hasExpectedBehavior: false,
            labelCount: 1,
            existingLabels: ['test'],
            repositoryContext: {
              owner: 'test-owner',
              repo: 'test-repo',
              branch: 'main',
            },
          },
        },
        {
          issueId: 6,
          issueNumber: 6,
          primaryCategory: 'test',
          primaryConfidence: 0.5,
          estimatedPriority: 'medium',
          priorityConfidence: 0.5,
          score: 75, // Very High boundary
          scoreBreakdown: { category: 30, priority: 30, custom: 0 },
          processingTimeMs: 100,
          cacheHit: false,
          algorithmVersion: '2.0.0',
          configVersion: '2.0.0',
          profileId: 'test-profile',
          classifications: [],
          metadata: {
            titleLength: 15,
            bodyLength: 25,
            hasCodeBlocks: false,
            hasStepsToReproduce: false,
            hasExpectedBehavior: false,
            labelCount: 1,
            existingLabels: ['test'],
            repositoryContext: {
              owner: 'test-owner',
              repo: 'test-repo',
              branch: 'main',
            },
          },
        },
      ];

      const result = convertEnhancedClassificationData(boundaryClassifications);
      const scoreData = result.scoreDistribution;

      const lowIndex = scoreData.labels!.indexOf('Low (0-25)');
      const mediumIndex = scoreData.labels!.indexOf('Medium (25-50)');
      const highIndex = scoreData.labels!.indexOf('High (50-75)');
      const veryHighIndex = scoreData.labels!.indexOf('Very High (75-100)');

      expect(scoreData.datasets[0]!.data[lowIndex]).toBe(0);
      expect(scoreData.datasets[0]!.data[mediumIndex]).toBe(1); // 25
      expect(scoreData.datasets[0]!.data[highIndex]).toBe(1); // 50
      expect(scoreData.datasets[0]!.data[veryHighIndex]).toBe(1); // 75
    });
  });

  describe('isEnhancedClassificationArray', () => {
    it('拡張分類配列を正しく検出できること', () => {
      const enhanced: EnhancedIssueClassification[] = [
        {
          issueId: 7,
          issueNumber: 7,
          primaryCategory: 'bug',
          primaryConfidence: 0.9,
          estimatedPriority: 'high',
          priorityConfidence: 0.8,
          score: 85,
          scoreBreakdown: { category: 30, priority: 35, recency: 15, custom: 0 },
          processingTimeMs: 100,
          cacheHit: false,
          algorithmVersion: '2.0.0',
          configVersion: '2.0.0',
          profileId: 'test-profile',
          classifications: [],
          metadata: {
            titleLength: 15,
            bodyLength: 25,
            hasCodeBlocks: false,
            hasStepsToReproduce: false,
            hasExpectedBehavior: false,
            labelCount: 1,
            existingLabels: ['test'],
            repositoryContext: {
              owner: 'test-owner',
              repo: 'test-repo',
              branch: 'main',
            },
          },
        },
      ];

      expect(isEnhancedClassificationArray(enhanced)).toBe(true);
    });

    it('通常の分類配列を正しく検出できること', () => {
      const normal: IssueClassification[] = [
        {
          issueId: 1,
          issueNumber: 1,
          primaryCategory: 'bug',
          classifications: [
            { category: 'bug', confidence: 0.9, reasons: ['Test reason'], keywords: ['bug'] },
          ],
          primaryConfidence: 0.9,
          estimatedPriority: 'high',
          priorityConfidence: 0.9,
          processingTimeMs: 100,
          version: '1.0.0',
          metadata: {
            titleLength: 20,
            bodyLength: 100,
            hasCodeBlocks: false,
            hasStepsToReproduce: false,
            hasExpectedBehavior: false,
            labelCount: 0,
            existingLabels: [],
          },
        },
      ];

      expect(isEnhancedClassificationArray(normal)).toBe(false);
    });

    it('空の配列を正しく処理できること', () => {
      expect(isEnhancedClassificationArray([])).toBe(false);
    });
  });

  describe('convertClassificationDataUniversal', () => {
    it('拡張分類データを自動検出して変換できること', () => {
      const enhanced: EnhancedIssueClassification[] = [
        {
          issueId: 8,
          issueNumber: 8,
          primaryCategory: 'bug',
          primaryConfidence: 0.9,
          estimatedPriority: 'high',
          priorityConfidence: 0.8,
          score: 85,
          scoreBreakdown: { category: 30, priority: 35, recency: 15, custom: 0 },
          processingTimeMs: 100,
          cacheHit: false,
          algorithmVersion: '2.0.0',
          configVersion: '2.0.0',
          profileId: 'test-profile',
          classifications: [],
          metadata: {
            titleLength: 15,
            bodyLength: 25,
            hasCodeBlocks: false,
            hasStepsToReproduce: false,
            hasExpectedBehavior: false,
            labelCount: 1,
            existingLabels: ['test'],
            repositoryContext: {
              owner: 'test-owner',
              repo: 'test-repo',
              branch: 'main',
            },
          },
        },
      ];

      const result = convertClassificationDataUniversal(enhanced);

      expect(result).toBeDefined();
      expect(result.scoreDistribution).toBeDefined();
      expect(result.scoreBreakdownChart).toBeDefined();
    });

    it('通常の分類データを自動検出して変換できること', () => {
      const normal: IssueClassification[] = [
        {
          issueId: 1,
          issueNumber: 1,
          primaryCategory: 'bug',
          classifications: [
            { category: 'bug', confidence: 0.9, reasons: ['Test reason'], keywords: ['bug'] },
          ],
          primaryConfidence: 0.9,
          estimatedPriority: 'high',
          priorityConfidence: 0.9,
          processingTimeMs: 100,
          version: '1.0.0',
          metadata: {
            titleLength: 20,
            bodyLength: 100,
            hasCodeBlocks: false,
            hasStepsToReproduce: false,
            hasExpectedBehavior: false,
            labelCount: 0,
            existingLabels: [],
          },
        },
      ];

      const result = convertClassificationDataUniversal(normal);

      expect(result).toBeDefined();
      expect(result.scoreDistribution).toBeUndefined();
      expect(result.scoreBreakdownChart).toBeUndefined();
    });

    it('空の配列を正しく処理できること', () => {
      const result = convertClassificationDataUniversal([]);

      expect(result).toBeDefined();
      expect(result.categoryDistribution).toBeDefined();
      expect(result.priorityDistribution).toBeDefined();
      expect(result.confidenceDistribution).toBeDefined();
    });
  });

  describe('convertPerformanceData', () => {
    const mockPerformanceMetrics: PerformanceMetrics[] = [
      {
        averageResponseTime: 2,
        averageResolutionTime: 24,
        medianResolutionTime: 18,
        totalRequests: 100,
        errorRate: 0.05,
        cacheHitRate: 0.8,
        throughput: 5,
        backlogSize: 50,
        timestamp: '2023-01-01T00:00:00Z',
      },
      {
        averageResponseTime: 3,
        averageResolutionTime: 36,
        medianResolutionTime: 30,
        totalRequests: 80,
        errorRate: 0.1,
        cacheHitRate: 0.7,
        throughput: 3,
        backlogSize: 60,
        timestamp: '2023-01-02T00:00:00Z',
      },
    ];

    it('パフォーマンスデータを適切に変換できること', () => {
      const result = convertPerformanceData(mockPerformanceMetrics);

      expect(result).toBeDefined();
      expect(result.resolutionTimeChart).toBeDefined();
      expect(result.throughputChart).toBeDefined();
      expect(result.backlogChart).toBeDefined();
    });

    it('解決時間チャートが正しく生成されること', () => {
      const result = convertPerformanceData(mockPerformanceMetrics);
      const resolutionChart = result.resolutionTimeChart;

      expect(resolutionChart.labels).toEqual(['Period 1', 'Period 2']);
      expect(resolutionChart.datasets).toHaveLength(2);

      const avgDataset = resolutionChart.datasets[0]!;
      const medianDataset = resolutionChart.datasets[1]!;

      expect(avgDataset.label).toBe('Average Resolution Time (hours)');
      expect(avgDataset.data).toEqual([24, 36]);

      expect(medianDataset.label).toBe('Median Resolution Time (hours)');
      expect(medianDataset.data).toEqual([18, 30]);
    });

    it('スループットチャートが正しく生成されること', () => {
      const result = convertPerformanceData(mockPerformanceMetrics);
      const throughputChart = result.throughputChart;

      expect(throughputChart.labels).toEqual(['Period 1', 'Period 2']);
      expect(throughputChart.datasets).toHaveLength(1);

      const dataset = throughputChart.datasets[0]!;
      expect(dataset.label).toBe('Issues Resolved Per Day');
      expect(dataset.data).toEqual([5, 3]);
    });

    it('バックログチャートが正しく生成されること', () => {
      const result = convertPerformanceData(mockPerformanceMetrics);
      const backlogChart = result.backlogChart;

      expect(backlogChart.labels).toEqual(['Period 1', 'Period 2']);
      expect(backlogChart.datasets).toHaveLength(1);

      const dataset = backlogChart.datasets[0]!;
      expect(dataset.label).toBe('Backlog Size');
      expect(dataset.data).toEqual([50, 60]);
      expect(dataset.fill).toBe(true);
    });

    it('空のメトリクス配列を処理できること', () => {
      const result = convertPerformanceData([]);

      expect(result.resolutionTimeChart.labels).toHaveLength(0);
      expect(result.throughputChart.labels).toHaveLength(0);
      expect(result.backlogChart.labels).toHaveLength(0);
    });

    it('単一メトリクスを処理できること', () => {
      const singleMetric: PerformanceMetrics[] = [
        {
          averageResponseTime: 1,
          averageResolutionTime: 12,
          medianResolutionTime: 10,
          totalRequests: 120,
          errorRate: 0.02,
          cacheHitRate: 0.9,
          throughput: 8,
          backlogSize: 25,
          timestamp: '2023-01-01T00:00:00Z',
        },
      ];

      const result = convertPerformanceData(singleMetric);

      expect(result.resolutionTimeChart.labels).toEqual(['Period 1']);
      expect(result.resolutionTimeChart.datasets[0]!.data).toEqual([12]);
      expect(result.resolutionTimeChart.datasets[1]!.data).toEqual([10]);
    });
  });

  describe('formatChartValue', () => {
    it('数値を適切にフォーマットできること', () => {
      expect(formatChartValue(1000)).toBe('1,000');
      expect(formatChartValue(1234567)).toBe('1,234,567');
      expect(formatChartValue(0)).toBe('0');
    });

    it('パーセンテージを適切にフォーマットできること', () => {
      expect(formatChartValue(0.5, 'percentage')).toBe('50.0%');
      expect(formatChartValue(0.123, 'percentage')).toBe('12.3%');
      expect(formatChartValue(1, 'percentage')).toBe('100.0%');
    });

    it('通貨を適切にフォーマットできること', () => {
      expect(formatChartValue(100, 'currency')).toBe('$100.00');
      expect(formatChartValue(1234.56, 'currency')).toBe('$1,234.56');
    });

    it('デフォルトタイプが正しく動作すること', () => {
      expect(formatChartValue(1000, 'number')).toBe('1,000');
      expect(formatChartValue(1000)).toBe('1,000'); // デフォルト
    });

    it('小数値を適切に処理できること', () => {
      expect(formatChartValue(1000.5)).toBe('1,000.5');
      expect(formatChartValue(0.001, 'percentage')).toBe('0.1%');
    });
  });

  describe('generateChartOptions', () => {
    it('基本的なチャートオプションを生成できること', () => {
      const options = generateChartOptions('line', LIGHT_THEME);

      expect(options).toBeDefined();
      expect(options.responsive).toBe(true);
      expect(options.maintainAspectRatio).toBe(false);
      expect(options.plugins).toBeDefined();
      expect(options.plugins!.legend).toBeDefined();
      expect(options.plugins!.tooltip).toBeDefined();
    });

    it('ライトテーマが正しく適用されること', () => {
      const options = generateChartOptions('bar', LIGHT_THEME);

      expect(options.plugins!.legend!.labels!.color).toBe(LIGHT_THEME.colors.text);
      expect(options.plugins!.tooltip!.backgroundColor).toBe(LIGHT_THEME.colors.background);
      expect(options.plugins!.tooltip!.titleColor).toBe(LIGHT_THEME.colors.text);
    });

    it('ダークテーマが正しく適用されること', () => {
      const options = generateChartOptions('pie', DARK_THEME);

      expect(options.plugins!.legend!.labels!.color).toBe(DARK_THEME.colors.text);
      expect(options.plugins!.tooltip!.backgroundColor).toBe(DARK_THEME.colors.background);
      expect(options.plugins!.tooltip!.borderColor).toBe(DARK_THEME.colors.border);
    });

    it('スケール対応チャート（line, bar）でスケール設定が追加されること', () => {
      const lineOptions = generateChartOptions('line', LIGHT_THEME) as any;
      const barOptions = generateChartOptions('bar', LIGHT_THEME) as any;

      expect(lineOptions.scales).toBeDefined();
      expect(lineOptions.scales.x).toBeDefined();
      expect(lineOptions.scales.y).toBeDefined();

      expect(barOptions.scales).toBeDefined();
      expect(barOptions.scales.x).toBeDefined();
      expect(barOptions.scales.y).toBeDefined();
    });

    it('パイチャートでスケール設定が追加されないこと', () => {
      const pieOptions = generateChartOptions('pie', LIGHT_THEME) as any;

      expect(pieOptions.scales).toEqual({});
    });

    it('カスタムオプションが正しくマージされること', () => {
      const customOptions = {
        responsive: false,
        plugins: {
          legend: {
            display: false,
          },
        },
      };

      const options = generateChartOptions('line', LIGHT_THEME, customOptions);

      expect(options.responsive).toBe(false);
      expect(options.plugins!.legend!.display).toBe(false);
      // 他のプロパティはデフォルトが保持される
      expect(options.maintainAspectRatio).toBe(false);
    });

    it('ツールチップのカスタムラベル関数が動作すること', () => {
      const options = generateChartOptions('line', LIGHT_THEME);
      const tooltipCallback = options.plugins!.tooltip!.callbacks!.label!;

      // 数値の場合
      const numberContext = {
        dataset: { label: 'Test Dataset' },
        parsed: 1234,
      };

      expect(tooltipCallback.call({} as any, numberContext as any)).toBe('Test Dataset: 1,234');

      // オブジェクトの場合
      const objectContext = {
        dataset: { label: 'Complex Dataset' },
        parsed: { x: 10, y: 20 },
      };

      expect(tooltipCallback.call({} as any, objectContext as any)).toBe(
        'Complex Dataset: {"x":10,"y":20}'
      );
    });

    it('ラベルなしデータセットでツールチップが動作すること', () => {
      const options = generateChartOptions('bar', LIGHT_THEME);
      const tooltipCallback = options.plugins!.tooltip!.callbacks!.label!;

      const context = {
        dataset: {},
        parsed: 100,
      };

      expect(tooltipCallback.call({} as any, context as any)).toBe(': 100');
    });

    it('フォント設定が正しく適用されること', () => {
      const customTheme: ChartTheme = {
        ...LIGHT_THEME,
        fonts: {
          family: 'Arial',
          size: 14,
          weight: 'bold',
        },
      };

      const options = generateChartOptions('line', customTheme) as any;

      expect(options.plugins.legend.labels.font.family).toBe('Arial');
      expect(options.plugins.legend.labels.font.size).toBe(14);
      expect(options.scales.x.ticks.font.family).toBe('Arial');
      expect(options.scales.x.ticks.font.size).toBe(14);
    });

    it('グリッド設定が正しく適用されること', () => {
      const customTheme: ChartTheme = {
        ...LIGHT_THEME,
        grid: {
          color: '#FF0000',
          borderColor: '#00FF00',
        },
      };

      const options = generateChartOptions('bar', customTheme) as any;

      expect(options.scales.x.grid.color).toBe('#FF0000');
      expect(options.scales.y.grid.color).toBe('#FF0000');
    });
  });

  describe('generateChartConfig', () => {
    const mockChartData = {
      labels: ['A', 'B', 'C'],
      datasets: [
        {
          label: 'Test',
          data: [1, 2, 3],
        },
      ],
    };

    it('完全なチャート設定を生成できること', () => {
      const config = generateChartConfig('bar', mockChartData, LIGHT_THEME);

      expect(config).toBeDefined();
      expect(config.type).toBe('bar');
      expect(config.data).toBe(mockChartData);
      expect(config.options).toBeDefined();
    });

    it('カスタムオプションが正しく適用されること', () => {
      const customOptions = {
        responsive: false,
        aspectRatio: 1,
      };

      const config = generateChartConfig('line', mockChartData, DARK_THEME, customOptions);

      expect(config.options!.responsive).toBe(false);
      expect((config.options as any).aspectRatio).toBe(1);
    });

    it('異なるチャートタイプで正しく動作すること', () => {
      const chartTypes: ChartType[] = ['line', 'bar', 'pie'];

      chartTypes.forEach(type => {
        const config = generateChartConfig(type, mockChartData as any, LIGHT_THEME);
        expect(config.type).toBe(type);
        expect(config.data).toBe(mockChartData);
      });
    });
  });

  describe('calculateChartDimensions', () => {
    it('基本的な寸法計算が正しく動作すること', () => {
      const result = calculateChartDimensions(800, 600, 2);

      expect(result).toBeDefined();
      expect(result.width).toBe(800);
      expect(result.height).toBe(400);
    });

    it('コンテナが縦長の場合の計算が正しいこと', () => {
      const result = calculateChartDimensions(400, 800, 2);

      expect(result.width).toBe(400);
      expect(result.height).toBe(200);
    });

    it('コンテナが横長の場合の計算が正しいこと', () => {
      const result = calculateChartDimensions(1200, 400, 2);

      expect(result.width).toBe(800); // 400 * 2 = 800
      expect(result.height).toBe(400);
    });

    it('デフォルトアスペクト比が適用されること', () => {
      const result = calculateChartDimensions(600, 400);

      expect(result.width).toBe(600);
      expect(result.height).toBe(300); // 600 / 2 = 300
    });

    it('カスタムアスペクト比が正しく動作すること', () => {
      const result = calculateChartDimensions(900, 600, 3);

      expect(result.width).toBe(900);
      expect(result.height).toBe(300); // 900 / 3 = 300
    });

    it('正方形のアスペクト比が正しく動作すること', () => {
      const result = calculateChartDimensions(500, 500, 1);

      expect(result.width).toBe(500);
      expect(result.height).toBe(500);
    });

    it('寸法が整数に丸められること', () => {
      const result = calculateChartDimensions(333, 333, 1.5);

      expect(Number.isInteger(result.width)).toBe(true);
      expect(Number.isInteger(result.height)).toBe(true);
    });

    it('極小サイズでも動作すること', () => {
      const result = calculateChartDimensions(10, 10, 2);

      expect(result.width).toBe(10);
      expect(result.height).toBe(5);
    });

    it('極大サイズでも動作すること', () => {
      const result = calculateChartDimensions(10000, 5000, 2);

      expect(result.width).toBe(10000);
      expect(result.height).toBe(5000);
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('基本的なデバウンス機能が動作すること', () => {
      const mockFunction = vi.fn();
      const debouncedFunction = debounce(mockFunction, 100);

      debouncedFunction('test');
      expect(mockFunction).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(mockFunction).toHaveBeenCalledWith('test');
      expect(mockFunction).toHaveBeenCalledTimes(1);
    });

    it('連続呼び出しで最後の呼び出しのみ実行されること', () => {
      const mockFunction = vi.fn();
      const debouncedFunction = debounce(mockFunction, 100);

      debouncedFunction('first');
      debouncedFunction('second');
      debouncedFunction('third');

      expect(mockFunction).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(mockFunction).toHaveBeenCalledWith('third');
      expect(mockFunction).toHaveBeenCalledTimes(1);
    });

    it('遅延時間前の呼び出しでタイマーがリセットされること', () => {
      const mockFunction = vi.fn();
      const debouncedFunction = debounce(mockFunction, 100);

      debouncedFunction('first');
      vi.advanceTimersByTime(50);

      debouncedFunction('second');
      vi.advanceTimersByTime(50);

      expect(mockFunction).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(mockFunction).toHaveBeenCalledWith('second');
      expect(mockFunction).toHaveBeenCalledTimes(1);
    });

    it('複数の引数を正しく渡すこと', () => {
      const mockFunction = vi.fn();
      const debouncedFunction = debounce(mockFunction, 100);

      debouncedFunction('arg1', 'arg2', 'arg3');

      vi.advanceTimersByTime(100);
      expect(mockFunction).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
    });

    it('異なる遅延時間が正しく動作すること', () => {
      const mockFunction = vi.fn();
      const debouncedFunction = debounce(mockFunction, 200);

      debouncedFunction('test');

      vi.advanceTimersByTime(100);
      expect(mockFunction).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(mockFunction).toHaveBeenCalledWith('test');
    });

    it('遅延時間0でも動作すること', () => {
      const mockFunction = vi.fn();
      const debouncedFunction = debounce(mockFunction, 0);

      debouncedFunction('test');

      vi.advanceTimersByTime(0);
      expect(mockFunction).toHaveBeenCalledWith('test');
    });

    it('戻り値の型が正しいこと', () => {
      const numberFunction = (x: number, y: number): number => x + y;
      const debouncedNumberFunction = debounce(numberFunction, 100);

      // 戻り値はvoidになるはず
      const result = debouncedNumberFunction(1, 2);
      expect(result).toBeUndefined();
    });

    it('関数の実行コンテキストが保持されること', () => {
      const mockFunction = vi.fn();
      const debouncedFunction = debounce(mockFunction, 100);

      debouncedFunction('test-context');

      vi.advanceTimersByTime(100);
      expect(mockFunction).toHaveBeenCalledWith('test-context');
      expect(mockFunction).toHaveBeenCalledTimes(1);
    });

    it('複数のデバウンス関数が独立して動作すること', () => {
      const mockFunction1 = vi.fn();
      const mockFunction2 = vi.fn();
      const debouncedFunction1 = debounce(mockFunction1, 100);
      const debouncedFunction2 = debounce(mockFunction2, 200);

      debouncedFunction1('first');
      debouncedFunction2('second');

      vi.advanceTimersByTime(100);
      expect(mockFunction1).toHaveBeenCalledWith('first');
      expect(mockFunction2).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(mockFunction2).toHaveBeenCalledWith('second');
    });
  });
});

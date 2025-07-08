/**
 * Chart Components Tests
 *
 * Basic tests to verify chart components render without errors
 * and handle data transformation correctly.
 */

import { describe, it, expect } from 'vitest';
import {
  convertTimeSeriesData,
  convertCategoryData,
  convertPieData,
  CHART_COLORS,
} from '../../../lib/utils/chart';

describe('Chart Utilities', () => {
  describe('convertTimeSeriesData', () => {
    it('should convert time series data correctly', () => {
      const mockData = [
        { timestamp: new Date('2023-12-01'), value: 10 },
        { timestamp: new Date('2023-12-02'), value: 15 },
        { timestamp: new Date('2023-12-03'), value: 8 },
      ];

      const result = convertTimeSeriesData(mockData, 'Test Data', CHART_COLORS[0]);

      expect(result.labels).toHaveLength(3);
      expect(result.datasets).toHaveLength(1);
      expect(result.datasets[0].label).toBe('Test Data');
      expect(result.datasets[0].data).toEqual([10, 15, 8]);
    });

    it('should handle empty data gracefully', () => {
      const result = convertTimeSeriesData([], 'Empty Data');

      expect(result.labels).toHaveLength(0);
      expect(result.datasets).toHaveLength(1);
      expect(result.datasets[0].data).toHaveLength(0);
    });
  });

  describe('convertCategoryData', () => {
    it('should convert category data correctly', () => {
      const mockData = {
        Bug: 15,
        Feature: 12,
        Enhancement: 8,
      };

      const result = convertCategoryData(mockData, 'Issues by Category');

      expect(result.labels).toEqual(['Bug', 'Feature', 'Enhancement']);
      expect(result.datasets[0].data).toEqual([15, 12, 8]);
      expect(result.datasets[0].label).toBe('Issues by Category');
    });

    it('should handle empty categories', () => {
      const result = convertCategoryData({}, 'Empty Categories');

      expect(result.labels).toHaveLength(0);
      expect(result.datasets[0].data).toHaveLength(0);
    });
  });

  describe('convertPieData', () => {
    it('should convert pie chart data correctly', () => {
      const mockData = {
        Resolved: 75,
        Open: 25,
      };

      const result = convertPieData(mockData);

      expect(result.labels).toEqual(['Resolved', 'Open']);
      expect(result.datasets[0].data).toEqual([75, 25]);
      expect(result.datasets[0].backgroundColor).toHaveLength(2);
    });

    it('should apply colors correctly', () => {
      const mockData = { A: 50, B: 30, C: 20 };
      const customColors = ['#FF0000', '#00FF00', '#0000FF'];

      const result = convertPieData(mockData, customColors);

      expect(result.datasets[0].backgroundColor).toEqual([
        '#FF000080', // 50% opacity added
        '#00FF0080',
        '#0000FF80',
      ]);
    });
  });
});

describe('Chart Color Constants', () => {
  it('should have predefined chart colors', () => {
    expect(CHART_COLORS).toBeDefined();
    expect(Array.isArray(CHART_COLORS)).toBe(true);
    expect(CHART_COLORS.length).toBeGreaterThan(0);

    // Check that colors are valid hex values
    CHART_COLORS.forEach(color => {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});

describe('Analytics Data Integration', () => {
  it('should handle API response data format', () => {
    // Mock the expected API response structure
    const mockApiResponse = {
      success: true,
      data: {
        categories: {
          bug: { count: 15, percentage: 35.7 },
          feature: { count: 12, percentage: 28.6 },
          enhancement: { count: 8, percentage: 19.0 },
        },
        trends: {
          daily_issues: [
            { date: '2023-12-01', opened: 2, closed: 1 },
            { date: '2023-12-02', opened: 1, closed: 3 },
            { date: '2023-12-03', opened: 3, closed: 2 },
          ],
        },
        contributors: [
          { login: 'alice', contributions: 20 },
          { login: 'bob', contributions: 14 },
          { login: 'charlie', contributions: 10 },
        ],
      },
    };

    // Test category data transformation
    const categories = mockApiResponse.data.categories;
    const categoryData = Object.entries(categories).reduce(
      (acc: Record<string, number>, [name, data]: [string, any]) => {
        acc[name] = data.count;
        return acc;
      },
      {}
    );

    expect(categoryData).toEqual({
      bug: 15,
      feature: 12,
      enhancement: 8,
    });

    // Test time series data transformation
    const dailyIssues = mockApiResponse.data.trends.daily_issues;
    const timeSeriesData = dailyIssues.map((point: any) => ({
      timestamp: new Date(point.date),
      value: point.opened,
    }));

    expect(timeSeriesData).toHaveLength(3);
    expect(timeSeriesData[0].value).toBe(2);

    // Test contributor data transformation
    const contributors = mockApiResponse.data.contributors;
    const contributorData = contributors.reduce((acc: Record<string, number>, contributor: any) => {
      acc[contributor.login] = contributor.contributions;
      return acc;
    }, {});

    expect(contributorData).toEqual({
      alice: 20,
      bob: 14,
      charlie: 10,
    });
  });
});

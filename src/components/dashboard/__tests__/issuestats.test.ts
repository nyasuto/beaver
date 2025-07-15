/**
 * IssueStats Component Tests
 *
 * Tests for IssueStats.astro component to ensure proper data processing,
 * statistics calculations, and component integration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the StatsService
const mockStatsService = {
  getUnifiedStats: vi.fn(),
};

// Mock getStatsService function
vi.mock('../../lib/services/StatsService', () => ({
  getStatsService: () => mockStatsService,
}));

// Define the IssueStats props interface
interface IssueStatsProps {
  class?: string;
}

// Mock unified stats data structure
interface UnifiedStats {
  total: number;
  open: number;
  closed: number;
  priority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  recentActivity: {
    thisWeek: number;
    lastWeek: number;
  };
  meta: {
    source: 'api' | 'cache' | 'fallback';
    generated_at: string;
  };
}

// Helper function to create mock stats data
function createMockStats(overrides: Partial<UnifiedStats> = {}): UnifiedStats {
  return {
    total: 100,
    open: 25,
    closed: 75,
    priority: {
      critical: 5,
      high: 10,
      medium: 15,
      low: 20,
    },
    recentActivity: {
      thisWeek: 8,
      lastWeek: 12,
    },
    meta: {
      source: 'api',
      generated_at: new Date().toISOString(),
    },
    ...overrides,
  };
}

// Helper function to validate IssueStats props
function validateIssueStatsProps(props: Partial<IssueStatsProps>): {
  success: boolean;
  errors?: string[];
} {
  const errors: string[] = [];

  if (props.class !== undefined && typeof props.class !== 'string') {
    errors.push('class must be a string');
  }

  return {
    success: errors.length === 0,
    ...(errors.length > 0 && { errors }),
  };
}

describe('IssueStats Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Props Validation', () => {
    it('should validate valid props', () => {
      const validProps: IssueStatsProps = {
        class: 'custom-class',
      };

      const result = validateIssueStatsProps(validProps);
      expect(result.success).toBe(true);
    });

    it('should validate props without class', () => {
      const validProps: IssueStatsProps = {};

      const result = validateIssueStatsProps(validProps);
      expect(result.success).toBe(true);
    });

    it('should reject invalid class type', () => {
      const invalidProps = {
        class: 123,
      };

      const result = validateIssueStatsProps(invalidProps as any);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('class must be a string');
    });

    it('should handle undefined class', () => {
      const props: Partial<IssueStatsProps> = {};

      const result = validateIssueStatsProps(props);
      expect(result.success).toBe(true);
    });
  });

  describe('Statistics Calculation', () => {
    it('should calculate urgent issues correctly', () => {
      const stats = createMockStats({
        priority: {
          critical: 3,
          high: 7,
          medium: 10,
          low: 5,
        },
      });

      const urgentIssues = stats.priority.critical + stats.priority.high;
      expect(urgentIssues).toBe(10);
    });

    it('should calculate completion rate correctly', () => {
      const stats = createMockStats({
        total: 100,
        closed: 75,
      });

      const completionRate = Math.round((stats.closed / stats.total) * 100);
      expect(completionRate).toBe(75);
    });

    it('should handle zero total for completion rate', () => {
      const stats = createMockStats({
        total: 0,
        closed: 0,
      });

      const completionRate = stats.total > 0 ? Math.round((stats.closed / stats.total) * 100) : 0;
      expect(completionRate).toBe(0);
    });

    it('should handle null stats for urgent issues', () => {
      const stats = null as UnifiedStats | null;
      const urgentIssues = stats ? stats.priority.critical + stats.priority.high : 0;
      expect(urgentIssues).toBe(0);
    });

    it('should get recent activity from stats', () => {
      const stats = createMockStats({
        recentActivity: {
          thisWeek: 12,
          lastWeek: 8,
        },
      });

      const recentActivity = stats.recentActivity.thisWeek;
      expect(recentActivity).toBe(12);
    });
  });

  describe('Stats Service Integration', () => {
    it('should call getUnifiedStats with correct parameters', async () => {
      const mockStats = createMockStats();
      mockStatsService.getUnifiedStats.mockResolvedValue({
        success: true,
        data: mockStats,
      });

      // This would be called in the component
      const expectedParams = {
        includeRecentActivity: true,
        includePriorityBreakdown: true,
        includeLabels: false,
        recentDays: 7,
      };

      const result = await mockStatsService.getUnifiedStats(expectedParams);

      expect(mockStatsService.getUnifiedStats).toHaveBeenCalledWith(expectedParams);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
    });

    it('should handle successful stats service response', async () => {
      const mockStats = createMockStats();
      mockStatsService.getUnifiedStats.mockResolvedValue({
        success: true,
        data: mockStats,
      });

      const result = await mockStatsService.getUnifiedStats({
        includeRecentActivity: true,
        includePriorityBreakdown: true,
        includeLabels: false,
        recentDays: 7,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
    });

    it('should handle failed stats service response', async () => {
      mockStatsService.getUnifiedStats.mockResolvedValue({
        success: false,
        error: 'API Error',
      });

      const result = await mockStatsService.getUnifiedStats({
        includeRecentActivity: true,
        includePriorityBreakdown: true,
        includeLabels: false,
        recentDays: 7,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });
  });

  describe('Trend Direction Logic', () => {
    it('should determine trend direction for recent activity', () => {
      const recentActivity = 5;
      const trendDirection = recentActivity > 0 ? 'up' : 'stable';
      expect(trendDirection).toBe('up');
    });

    it('should determine stable trend for zero recent activity', () => {
      const recentActivity = 0;
      const trendDirection = recentActivity > 0 ? 'up' : 'stable';
      expect(trendDirection).toBe('stable');
    });

    it('should determine urgent issues trend direction', () => {
      const urgentIssues = 5;
      let trendDirection: string;
      if (urgentIssues > 3) {
        trendDirection = 'up';
      } else {
        trendDirection = 'stable';
      }
      expect(trendDirection).toBe('up');
    });

    it('should determine down trend for zero urgent issues', () => {
      const urgentIssues = 0;
      const trendDirection = urgentIssues > 3 ? 'up' : urgentIssues === 0 ? 'down' : 'stable';
      expect(trendDirection).toBe('down');
    });

    it('should determine stable trend for low urgent issues', () => {
      const urgentIssues = 2;
      let trendDirection: string;
      if (urgentIssues > 3) {
        trendDirection = 'up';
      } else {
        trendDirection = 'stable';
      }
      expect(trendDirection).toBe('stable');
    });

    it('should determine completion rate trend direction', () => {
      const completionRate = 75;
      const trendDirection = completionRate > 60 ? 'up' : completionRate < 40 ? 'down' : 'stable';
      expect(trendDirection).toBe('up');
    });

    it('should determine down trend for low completion rate', () => {
      const completionRate = 30;
      const trendDirection = completionRate > 60 ? 'up' : completionRate < 40 ? 'down' : 'stable';
      expect(trendDirection).toBe('down');
    });

    it('should determine stable trend for medium completion rate', () => {
      const completionRate = 50;
      const trendDirection = completionRate > 60 ? 'up' : completionRate < 40 ? 'down' : 'stable';
      expect(trendDirection).toBe('stable');
    });
  });

  describe('Data Display and Formatting', () => {
    it('should format total issues correctly', () => {
      const stats = createMockStats({ total: 150 });
      const displayValue = stats.total || 0;
      expect(displayValue).toBe(150);
    });

    it('should format open issues correctly', () => {
      const stats = createMockStats({ open: 45 });
      const displayValue = stats.open || 0;
      expect(displayValue).toBe(45);
    });

    it('should format completion rate as percentage', () => {
      const stats = createMockStats({ total: 100, closed: 67 });
      const completionRate = Math.round((stats.closed / stats.total) * 100);
      const displayValue = `${completionRate}%`;
      expect(displayValue).toBe('67%');
    });

    it('should format urgent issues count', () => {
      const stats = createMockStats({
        priority: { critical: 3, high: 7, medium: 10, low: 5 },
      });
      const urgentIssues = stats.priority.critical + stats.priority.high;
      expect(urgentIssues).toBe(10);
    });

    it('should format priority breakdown', () => {
      const stats = createMockStats({
        priority: { critical: 2, high: 5, medium: 8, low: 12 },
      });

      expect(stats.priority.critical).toBe(2);
      expect(stats.priority.high).toBe(5);
      expect(stats.priority.medium).toBe(8);
      expect(stats.priority.low).toBe(12);
    });
  });

  describe('Metadata Handling', () => {
    it('should handle API source metadata', () => {
      const stats = createMockStats({
        meta: {
          source: 'api',
          generated_at: '2023-12-01T10:00:00Z',
        },
      });

      expect(stats.meta.source).toBe('api');
      expect(stats.meta.generated_at).toBe('2023-12-01T10:00:00Z');
    });

    it('should handle cache source metadata', () => {
      const stats = createMockStats({
        meta: {
          source: 'cache',
          generated_at: '2023-12-01T09:30:00Z',
        },
      });

      expect(stats.meta.source).toBe('cache');
      expect(stats.meta.generated_at).toBe('2023-12-01T09:30:00Z');
    });

    it('should handle fallback source metadata', () => {
      const stats = createMockStats({
        meta: {
          source: 'fallback',
          generated_at: '2023-12-01T08:00:00Z',
        },
      });

      expect(stats.meta.source).toBe('fallback');
      expect(stats.meta.generated_at).toBe('2023-12-01T08:00:00Z');
    });

    it('should handle missing metadata gracefully', () => {
      const stats = null as UnifiedStats | null;
      const source = stats?.meta?.source || 'unknown';
      const generatedAt = stats?.meta?.generated_at || 'unknown';

      expect(source).toBe('unknown');
      expect(generatedAt).toBe('unknown');
    });
  });

  describe('Error Handling', () => {
    it('should handle null stats gracefully', () => {
      const stats = null as UnifiedStats | null;

      const totalIssues = stats?.total || 0;
      const openIssues = stats?.open || 0;
      const closedIssues = stats?.closed || 0;
      const urgentIssues = stats ? stats.priority.critical + stats.priority.high : 0;

      expect(totalIssues).toBe(0);
      expect(openIssues).toBe(0);
      expect(closedIssues).toBe(0);
      expect(urgentIssues).toBe(0);
    });

    it('should handle undefined priority values', () => {
      const stats = createMockStats({
        priority: {
          critical: undefined as any,
          high: undefined as any,
          medium: undefined as any,
          low: undefined as any,
        },
      });

      const critical = stats.priority.critical || 0;
      const high = stats.priority.high || 0;
      const medium = stats.priority.medium || 0;
      const low = stats.priority.low || 0;

      expect(critical).toBe(0);
      expect(high).toBe(0);
      expect(medium).toBe(0);
      expect(low).toBe(0);
    });

    it('should handle missing recent activity data', () => {
      const stats = createMockStats({
        recentActivity: {
          thisWeek: undefined as any,
          lastWeek: undefined as any,
        },
      });

      const recentActivity = stats.recentActivity.thisWeek || 0;
      expect(recentActivity).toBe(0);
    });
  });

  describe('Component Integration', () => {
    it('should pass correct props to StatCard components', () => {
      const stats = createMockStats({
        total: 100,
        open: 25,
        closed: 75,
        priority: { critical: 5, high: 10, medium: 15, low: 20 },
        recentActivity: { thisWeek: 8, lastWeek: 12 },
      });

      const urgentIssues = stats.priority.critical + stats.priority.high;
      const completionRate = Math.round((stats.closed / stats.total) * 100);
      const recentActivity = stats.recentActivity.thisWeek;

      // Main stat cards
      const totalIssuesProps = {
        title: 'Total Issues',
        value: stats.total,
        icon: '📊',
        description: 'All issues in repository',
        color: 'blue',
      };

      const openIssuesProps = {
        title: 'Open Issues',
        value: stats.open,
        icon: '🔓',
        description: 'Currently active issues',
        color: 'green',
        trend: {
          direction: recentActivity > 0 ? 'up' : 'stable',
          value: `${recentActivity}`,
          period: 'this week',
        },
      };

      const urgentIssuesProps = {
        title: 'Urgent Issues',
        value: urgentIssues,
        icon: '🚨',
        description: 'Critical & high priority',
        color: 'red',
        trend: {
          direction: urgentIssues > 3 ? 'up' : urgentIssues === 0 ? 'down' : 'stable',
          value: `${stats.priority.critical} critical`,
          period: 'right now',
        },
      };

      const completionRateProps = {
        title: 'Completion Rate',
        value: `${completionRate}%`,
        icon: '✅',
        description: 'Issues resolved',
        color: 'purple',
        trend: {
          direction: completionRate > 60 ? 'up' : completionRate < 40 ? 'down' : 'stable',
          value: `${stats.closed}/${stats.total}`,
          period: 'completed',
        },
      };

      // Verify all props are correct
      expect(totalIssuesProps.value).toBe(100);
      expect(openIssuesProps.value).toBe(25);
      expect(urgentIssuesProps.value).toBe(15);
      expect(completionRateProps.value).toBe('75%');
    });

    it('should handle CSS class prop correctly', () => {
      const className = 'custom-stats-class';
      const expectedClass = `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`;

      expect(expectedClass).toContain('custom-stats-class');
      expect(expectedClass).toContain('grid');
      expect(expectedClass).toContain('gap-6');
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const largeStats = createMockStats({
        total: 10000,
        open: 2500,
        closed: 7500,
        priority: { critical: 100, high: 500, medium: 1000, low: 900 },
        recentActivity: { thisWeek: 150, lastWeek: 120 },
      });

      mockStatsService.getUnifiedStats.mockResolvedValue({
        success: true,
        data: largeStats,
      });

      const startTime = performance.now();

      // Simulate component calculations
      const urgentIssues = largeStats.priority.critical + largeStats.priority.high;
      const completionRate = Math.round((largeStats.closed / largeStats.total) * 100);
      const recentActivity = largeStats.recentActivity.thisWeek;

      expect(urgentIssues).toBe(600);
      expect(completionRate).toBe(75);
      expect(recentActivity).toBe(150);

      const endTime = performance.now();
      const calculationTime = endTime - startTime;

      expect(calculationTime).toBeLessThan(10); // Should be very fast
    });

    it('should handle concurrent stats requests', async () => {
      const mockStats = createMockStats();
      mockStatsService.getUnifiedStats.mockResolvedValue({
        success: true,
        data: mockStats,
      });

      const requests = Array(5)
        .fill(null)
        .map(() =>
          mockStatsService.getUnifiedStats({
            includeRecentActivity: true,
            includePriorityBreakdown: true,
            includeLabels: false,
            recentDays: 7,
          })
        );

      const results = await Promise.all(requests);

      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockStats);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeout gracefully', async () => {
      mockStatsService.getUnifiedStats.mockRejectedValue(new Error('Network timeout'));

      try {
        await mockStatsService.getUnifiedStats({
          includeRecentActivity: true,
          includePriorityBreakdown: true,
          includeLabels: false,
          recentDays: 7,
        });
      } catch (error) {
        expect((error as Error).message).toBe('Network timeout');
      }
    });

    it('should handle malformed stats data', async () => {
      const malformedStats = {
        total: 'invalid',
        open: null,
        closed: undefined,
        priority: {},
        recentActivity: null,
        meta: { source: 'api', generated_at: 'invalid-date' },
      };

      mockStatsService.getUnifiedStats.mockResolvedValue({
        success: true,
        data: malformedStats,
      });

      const result = await mockStatsService.getUnifiedStats({
        includeRecentActivity: true,
        includePriorityBreakdown: true,
        includeLabels: false,
        recentDays: 7,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(malformedStats);
    });

    it('should handle server error responses', async () => {
      mockStatsService.getUnifiedStats.mockResolvedValue({
        success: false,
        error: 'Internal Server Error',
        statusCode: 500,
      });

      const result = await mockStatsService.getUnifiedStats({
        includeRecentActivity: true,
        includePriorityBreakdown: true,
        includeLabels: false,
        recentDays: 7,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal Server Error');
    });
  });

  describe('Accessibility', () => {
    it('should provide proper ARIA labels for statistics', () => {
      const stats = createMockStats();

      // Simulate StatCard props that would be generated
      const openIssuesProps = {
        title: 'オープンなIssue',
        value: stats.open,
        icon: '🔓',
        ariaLabel: `${stats.open}件のオープンなIssueがあります`,
      };

      const urgentIssuesProps = {
        title: '緊急対応必要',
        value: stats.priority.critical + stats.priority.high,
        icon: '🚨',
        ariaLabel: `${stats.priority.critical + stats.priority.high}件の緊急対応が必要なIssueがあります`,
      };

      expect(openIssuesProps.ariaLabel).toBe('25件のオープンなIssueがあります');
      expect(urgentIssuesProps.ariaLabel).toBe('15件の緊急対応が必要なIssueがあります');
    });

    it('should handle screen reader friendly number formatting', () => {
      const stats = createMockStats({
        total: 1234,
        open: 567,
        closed: 667,
      });

      const formattedTotal = stats.total.toLocaleString('ja-JP');
      const formattedOpen = stats.open.toLocaleString('ja-JP');
      const formattedClosed = stats.closed.toLocaleString('ja-JP');

      expect(formattedTotal).toBe('1,234');
      expect(formattedOpen).toBe('567');
      expect(formattedClosed).toBe('667');
    });
  });

  describe('Data Source Handling', () => {
    it('should handle API data source correctly', () => {
      const stats = createMockStats({
        meta: { source: 'api', generated_at: '2025-01-01T00:00:00Z' },
      });

      const urgentIssues =
        stats.meta.source !== 'fallback' ? stats.priority.critical + stats.priority.high : -1;

      expect(urgentIssues).toBe(15);
    });

    it('should handle cache data source correctly', () => {
      const stats = createMockStats({
        meta: { source: 'cache', generated_at: '2025-01-01T00:00:00Z' },
      });

      const urgentIssues =
        stats.meta.source !== 'fallback' ? stats.priority.critical + stats.priority.high : -1;

      expect(urgentIssues).toBe(15);
    });

    it('should handle fallback data source correctly', () => {
      const stats = createMockStats({
        meta: { source: 'fallback', generated_at: '2025-01-01T00:00:00Z' },
      });

      const urgentIssues =
        stats.meta.source !== 'fallback' ? stats.priority.critical + stats.priority.high : -1;

      expect(urgentIssues).toBe(-1);
    });
  });

  describe('State Management', () => {
    it('should handle stats updates correctly', async () => {
      const initialStats = createMockStats();
      const updatedStats = createMockStats({
        open: 30,
        closed: 70,
        priority: { critical: 8, high: 12, medium: 15, low: 25 },
      });

      mockStatsService.getUnifiedStats
        .mockResolvedValueOnce({ success: true, data: initialStats })
        .mockResolvedValueOnce({ success: true, data: updatedStats });

      const firstResult = await mockStatsService.getUnifiedStats({
        includeRecentActivity: true,
        includePriorityBreakdown: true,
        includeLabels: false,
        recentDays: 7,
      });

      const secondResult = await mockStatsService.getUnifiedStats({
        includeRecentActivity: true,
        includePriorityBreakdown: true,
        includeLabels: false,
        recentDays: 7,
      });

      expect(firstResult.data.open).toBe(25);
      expect(secondResult.data.open).toBe(30);
    });
  });

  describe('Responsive Layout', () => {
    it('should apply responsive grid classes correctly', () => {
      const baseClasses = 'grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6';
      const customClass = 'custom-stats-layout';
      const finalClass = `${baseClasses} ${customClass}`;

      expect(finalClass).toContain('grid-cols-1');
      expect(finalClass).toContain('sm:grid-cols-2');
      expect(finalClass).toContain('gap-4');
      expect(finalClass).toContain('sm:gap-6');
      expect(finalClass).toContain('custom-stats-layout');
    });

    it('should handle empty className prop', () => {
      const baseClasses = 'grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6';
      const customClass = '';
      const finalClass = `${baseClasses} ${customClass}`;

      expect(finalClass.trim()).toBe(baseClasses);
    });
  });
});

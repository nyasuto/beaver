/**
 * Tests for ModuleStatisticsCalculator
 */

import { describe, it, expect } from 'vitest';
import { ModuleStatisticsCalculator, ModuleDisplayHelpers } from '../module-statistics';
import type {
  ModuleMetrics as AnalysisModule,
  ModuleAnalysisReport,
  Hotspot as HotspotItem,
  CodeSmell,
} from '../../schemas/module-analysis';

// Mock data
const createMockModule = (overrides: Partial<AnalysisModule> = {}): AnalysisModule => ({
  name: 'test-module',
  displayName: 'Test Module',
  type: 'component',
  description: 'A test module',
  path: '/test',
  files: [],
  coverage: 80,
  totalLines: 1000,
  coveredLines: 800,
  missedLines: 200,
  averageComplexity: 5,
  maxComplexity: 10,
  totalFunctions: 10,
  totalClasses: 2,
  duplication: 5,
  technicalDebt: 10,
  maintainabilityIndex: 75,
  qualityScore: 75,
  priority: 'medium',
  subModules: [],
  dependencies: [],
  lastAnalyzed: new Date().toISOString(),
  ...overrides,
});

const createMockReport = (overrides: Partial<ModuleAnalysisReport> = {}): ModuleAnalysisReport => ({
  project: {
    name: 'Test Project',
    totalModules: 10,
    totalFiles: 50,
    totalLines: 10000,
  },
  overview: {
    totalCoverage: 75,
    averageComplexity: 8,
    totalTechnicalDebt: 100,
    overallQualityScore: 80,
    maintainabilityIndex: 85,
  },
  modules: [
    createMockModule({ priority: 'critical', qualityScore: 45 }),
    createMockModule({ priority: 'high', qualityScore: 65 }),
    createMockModule({ priority: 'medium', qualityScore: 75 }),
    createMockModule({ priority: 'low', qualityScore: 95 }),
  ],
  hotspots: [
    {
      fileName: 'test1.ts',
      moduleName: 'module1',
      riskScore: 90,
      coverage: 30,
      complexityScore: 15,
      changeFrequency: 10,
      recommendation: 'Refactor this file',
    },
    {
      fileName: 'test2.ts',
      moduleName: 'module2',
      riskScore: 75,
      coverage: 50,
      complexityScore: 12,
      changeFrequency: 8,
      recommendation: 'Add more tests',
    },
  ] as HotspotItem[],
  codeSmells: [
    {
      type: 'duplicate_code',
      severity: 'critical',
      description: 'Duplicate code detected',
      suggestion: 'Extract common functionality',
      filePath: 'src/test.ts',
      lineNumber: 10,
      estimatedFixTime: 4,
    },
    {
      type: 'long_method',
      severity: 'major',
      description: 'Method is too long',
      suggestion: 'Break down into smaller methods',
      filePath: 'src/test2.ts',
      lineNumber: 25,
      estimatedFixTime: 2,
    },
    {
      type: 'dead_code',
      severity: 'minor',
      description: 'Unused code detected',
      suggestion: 'Remove unused code',
      filePath: 'src/test3.ts',
      lineNumber: 5,
      estimatedFixTime: 1,
    },
  ] as CodeSmell[],
  recommendations: [],
  metadata: {
    generatedAt: new Date().toISOString(),
    analysisType: 'full',
    dataSource: 'mock',
    version: '1.0.0',
  },
  ...overrides,
});

describe('ModuleStatisticsCalculator', () => {
  describe('Priority Statistics', () => {
    it('should calculate priority distribution correctly', () => {
      const modules = [
        createMockModule({ priority: 'critical' }),
        createMockModule({ priority: 'critical' }),
        createMockModule({ priority: 'high' }),
        createMockModule({ priority: 'medium' }),
        createMockModule({ priority: 'low' }),
      ];

      const stats = ModuleStatisticsCalculator.calculatePriorityStats(modules);

      expect(stats.total).toBe(5);
      expect(stats.critical).toBe(2);
      expect(stats.high).toBe(1);
      expect(stats.medium).toBe(1);
      expect(stats.low).toBe(1);
    });

    it('should handle empty module list', () => {
      const stats = ModuleStatisticsCalculator.calculatePriorityStats([]);

      expect(stats.total).toBe(0);
      expect(stats.critical).toBe(0);
      expect(stats.high).toBe(0);
      expect(stats.medium).toBe(0);
      expect(stats.low).toBe(0);
    });
  });

  describe('Quality Distribution', () => {
    it('should categorize modules by quality score', () => {
      const modules = [
        createMockModule({ qualityScore: 95 }), // excellent
        createMockModule({ qualityScore: 85 }), // good
        createMockModule({ qualityScore: 75 }), // good
        createMockModule({ qualityScore: 60 }), // fair
        createMockModule({ qualityScore: 40 }), // poor
      ];

      const distribution = ModuleStatisticsCalculator.calculateQualityDistribution(modules);

      expect(distribution.excellent).toBe(1);
      expect(distribution.good).toBe(2);
      expect(distribution.fair).toBe(1);
      expect(distribution.poor).toBe(1);
    });

    it('should handle edge cases for quality boundaries', () => {
      const modules = [
        createMockModule({ qualityScore: 90 }), // exactly excellent
        createMockModule({ qualityScore: 70 }), // exactly good
        createMockModule({ qualityScore: 50 }), // exactly fair
      ];

      const distribution = ModuleStatisticsCalculator.calculateQualityDistribution(modules);

      expect(distribution.excellent).toBe(1);
      expect(distribution.good).toBe(1);
      expect(distribution.fair).toBe(1);
      expect(distribution.poor).toBe(0);
    });
  });

  describe('Module Grouping', () => {
    it('should group modules by priority', () => {
      const modules = [
        createMockModule({ name: 'critical1', priority: 'critical' }),
        createMockModule({ name: 'critical2', priority: 'critical' }),
        createMockModule({ name: 'high1', priority: 'high' }),
        createMockModule({ name: 'medium1', priority: 'medium' }),
        createMockModule({ name: 'low1', priority: 'low' }),
      ];

      const grouped = ModuleStatisticsCalculator.groupModulesByPriority(modules);

      expect(grouped.critical).toHaveLength(2);
      expect(grouped.high).toHaveLength(1);
      expect(grouped.medium).toHaveLength(1);
      expect(grouped.low).toHaveLength(1);
      expect(grouped.critical[0]!.name).toBe('critical1');
    });
  });

  describe('Hotspot Analysis', () => {
    it('should return top hotspots by risk score', () => {
      const hotspots: HotspotItem[] = [
        { fileName: 'low.ts', riskScore: 30 } as HotspotItem,
        { fileName: 'high.ts', riskScore: 90 } as HotspotItem,
        { fileName: 'medium.ts', riskScore: 60 } as HotspotItem,
      ];

      const topHotspots = ModuleStatisticsCalculator.getTopHotspots(hotspots, 2);

      expect(topHotspots).toHaveLength(2);
      expect(topHotspots[0]!.fileName).toBe('high.ts');
      expect(topHotspots[1]!.fileName).toBe('medium.ts');
    });

    it('should respect the limit parameter', () => {
      const hotspots = Array.from({ length: 10 }, (_, i) => ({
        fileName: `test${i}.ts`,
        riskScore: i * 10,
      })) as HotspotItem[];

      const topHotspots = ModuleStatisticsCalculator.getTopHotspots(hotspots, 3);

      expect(topHotspots).toHaveLength(3);
    });
  });

  describe('Code Smell Analysis', () => {
    it('should filter and sort critical code smells', () => {
      const codeSmells: CodeSmell[] = [
        { severity: 'minor', estimatedFixTime: 1 } as CodeSmell,
        { severity: 'critical', estimatedFixTime: 3 } as CodeSmell,
        { severity: 'major', estimatedFixTime: 2 } as CodeSmell,
        { severity: 'critical', estimatedFixTime: 5 } as CodeSmell,
      ];

      const critical = ModuleStatisticsCalculator.getCriticalCodeSmells(codeSmells);

      expect(critical).toHaveLength(3); // critical + major
      expect(critical[0]!.severity).toBe('critical');
      expect(critical[0]!.estimatedFixTime).toBe(5); // Higher fix time first for same severity
    });

    it('should respect custom severity filters', () => {
      const codeSmells: CodeSmell[] = [
        { severity: 'critical' } as CodeSmell,
        { severity: 'major' } as CodeSmell,
        { severity: 'minor' } as CodeSmell,
      ];

      const onlyCritical = ModuleStatisticsCalculator.getCriticalCodeSmells(codeSmells, [
        'critical',
      ]);

      expect(onlyCritical).toHaveLength(1);
      expect(onlyCritical[0]!.severity).toBe('critical');
    });
  });

  describe('Project Health Calculation', () => {
    it('should calculate overall health score', () => {
      const report = createMockReport({
        overview: {
          totalCoverage: 80,
          averageComplexity: 5,
          totalTechnicalDebt: 50,
          overallQualityScore: 85,
          maintainabilityIndex: 90,
        },
        codeSmells: [],
      });

      const health = ModuleStatisticsCalculator.calculateProjectHealth(report);

      expect(health.healthScore).toBeGreaterThan(60);
      expect(health.riskLevel).toMatch(/^(low|medium|high|critical)$/);
      expect(Array.isArray(health.recommendations)).toBe(true);
    });

    it('should generate appropriate risk level', () => {
      const highQualityReport = createMockReport({
        overview: {
          totalCoverage: 95,
          averageComplexity: 3,
          totalTechnicalDebt: 10,
          overallQualityScore: 95,
          maintainabilityIndex: 95,
        },
        codeSmells: [],
      });

      const health = ModuleStatisticsCalculator.calculateProjectHealth(highQualityReport);
      expect(health.riskLevel).toBe('low');
    });

    it('should generate recommendations based on metrics', () => {
      const problemReport = createMockReport({
        overview: {
          totalCoverage: 30, // Low coverage
          averageComplexity: 15, // High complexity
          totalTechnicalDebt: 200, // High debt
          overallQualityScore: 40,
          maintainabilityIndex: 30,
        },
        hotspots: Array.from({ length: 10 }, () => ({}) as HotspotItem), // Many hotspots
        codeSmells: Array.from({ length: 10 }, () => ({ severity: 'critical' }) as CodeSmell),
      });

      const health = ModuleStatisticsCalculator.calculateProjectHealth(problemReport);

      expect(health.recommendations.length).toBeGreaterThan(0);
      expect(health.recommendations.some(r => r.includes('カバレッジ'))).toBe(true);
      expect(health.recommendations.some(r => r.includes('複雑度'))).toBe(true);
    });
  });

  describe('Quality Trends', () => {
    it('should calculate quality trends correctly', () => {
      const modules = [
        createMockModule({ qualityScore: 80 }),
        createMockModule({ qualityScore: 70 }),
        createMockModule({ qualityScore: 90 }),
        createMockModule({ qualityScore: 60 }),
      ];

      const trends = ModuleStatisticsCalculator.calculateQualityTrends(modules);

      expect(trends.averageQuality).toBe(75);
      expect(trends.qualityVariance).toBeGreaterThan(0);
      expect(trends.improvementOpportunities.length).toBeGreaterThan(0);
      expect(trends.improvementOpportunities[0]!.qualityScore).toBe(60); // Lowest score first
    });
  });

  describe('Summary Statistics', () => {
    it('should generate comprehensive summary', () => {
      const report = createMockReport();
      const summary = ModuleStatisticsCalculator.generateSummaryStats(report);

      expect(summary.priorityStats).toBeDefined();
      expect(summary.qualityDistribution).toBeDefined();
      expect(summary.modulesByPriority).toBeDefined();
      expect(summary.topHotspots).toBeDefined();
      expect(summary.criticalCodeSmells).toBeDefined();
      expect(summary.projectHealth).toBeDefined();
      expect(summary.qualityTrends).toBeDefined();
    });
  });

  describe('Formatting Utilities', () => {
    it('should format statistics correctly', () => {
      expect(ModuleStatisticsCalculator.formatStatistic(75.666, 'percentage')).toBe('75.7%');
      expect(ModuleStatisticsCalculator.formatStatistic(123.456, 'decimal')).toBe('123.5');
      expect(ModuleStatisticsCalculator.formatStatistic(42.8, 'hours')).toBe('43h');
      expect(ModuleStatisticsCalculator.formatStatistic(1234, 'count')).toBe('1,234');
    });

    it('should return appropriate color classes', () => {
      expect(ModuleStatisticsCalculator.getPriorityColorClass('critical')).toContain('red');
      expect(ModuleStatisticsCalculator.getPriorityColorClass('high')).toContain('orange');
      expect(ModuleStatisticsCalculator.getPriorityColorClass('medium')).toContain('yellow');
      expect(ModuleStatisticsCalculator.getPriorityColorClass('low')).toContain('green');

      expect(ModuleStatisticsCalculator.getQualityColorClass(95)).toContain('green');
      expect(ModuleStatisticsCalculator.getQualityColorClass(75)).toContain('blue');
      expect(ModuleStatisticsCalculator.getQualityColorClass(55)).toContain('yellow');
      expect(ModuleStatisticsCalculator.getQualityColorClass(30)).toContain('red');

      expect(ModuleStatisticsCalculator.getCoverageColorClass(85)).toContain('green');
      expect(ModuleStatisticsCalculator.getCoverageColorClass(60)).toContain('yellow');
      expect(ModuleStatisticsCalculator.getCoverageColorClass(30)).toContain('red');
    });
  });
});

describe('ModuleDisplayHelpers', () => {
  describe('Module Type Icons', () => {
    it('should return appropriate icons for module types', () => {
      expect(ModuleDisplayHelpers.getModuleTypeIcon('component')).toBe('🧩');
      expect(ModuleDisplayHelpers.getModuleTypeIcon('service')).toBe('⚙️');
      expect(ModuleDisplayHelpers.getModuleTypeIcon('unknown-type')).toBe('📦');
    });
  });

  describe('Text Truncation', () => {
    it('should truncate long names', () => {
      const longName = 'this-is-a-very-long-module-name-that-should-be-truncated';
      const truncated = ModuleDisplayHelpers.getTruncatedName(longName, 20);

      expect(truncated).toHaveLength(20);
      expect(truncated.endsWith('...')).toBe(true);
    });

    it('should not truncate short names', () => {
      const shortName = 'short-name';
      const result = ModuleDisplayHelpers.getTruncatedName(shortName, 20);

      expect(result).toBe(shortName);
    });
  });

  describe('File Path Processing', () => {
    it('should extract relative path', () => {
      const fullPath = '/project/src/components/Button.tsx';
      const relative = ModuleDisplayHelpers.getRelativeFilePath(fullPath);

      expect(relative).toBe('components/Button.tsx');
    });

    it('should handle paths without base path', () => {
      const path = '/other/path/file.ts';
      const result = ModuleDisplayHelpers.getRelativeFilePath(path);

      expect(result).toBe(path);
    });
  });

  describe('Description Formatting', () => {
    it('should format descriptions correctly', () => {
      const longDescription =
        'This is a very long description that should be truncated to a reasonable length for display purposes.';
      const formatted = ModuleDisplayHelpers.formatDescription(longDescription, 50);

      expect(formatted).toHaveLength(50);
      expect(formatted.endsWith('...')).toBe(true);
    });

    it('should handle empty descriptions', () => {
      const result = ModuleDisplayHelpers.formatDescription('');

      expect(result).toBe('No description available');
    });

    it('should not truncate short descriptions', () => {
      const shortDesc = 'Short description';
      const result = ModuleDisplayHelpers.formatDescription(shortDesc);

      expect(result).toBe(shortDesc);
    });
  });
});

/**
 * Module Analysis Schemas Tests
 *
 * Tests for module analysis Zod schemas and type validation
 */

import { describe, it, expect } from 'vitest';
import {
  FileMetricsSchema,
  ModuleMetricsSchema,
  CodeSmellSchema,
  HotspotSchema,
  ModuleComparisonSchema,
  ModuleAnalysisReportSchema,
  ModuleAnalysisOptionsSchema,
  ModuleQualityTrendSchema,
  ModuleAnalysisSchemas,
} from '../module-analysis';

describe('Module Analysis Schemas', () => {
  describe('FileMetricsSchema', () => {
    it('should validate correct file metrics data', () => {
      const validData = {
        path: 'src/lib/github/client.ts',
        name: 'client.ts',
        extension: '.ts',
        size: 1024,
        lines: 100,
        coverage: 85.5,
        coveredLines: 85,
        missedLines: 15,
        complexity: 5,
        functions: 8,
        classes: 2,
        duplication: 3.2,
        technicalDebt: 2.5,
        lastModified: '2023-12-01T10:00:00Z',
        type: 'source' as const,
      };

      const result = FileMetricsSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should reject invalid file metrics data', () => {
      const invalidData = {
        path: 'src/lib/github/client.ts',
        name: 'client.ts',
        extension: '.ts',
        size: 1024,
        lines: 100,
        coverage: 150, // Invalid: > 100
        coveredLines: 85,
        missedLines: 15,
        complexity: -1, // Invalid: < 0
        functions: 8,
        classes: 2,
        duplication: 3.2,
        technicalDebt: 2.5,
        lastModified: '2023-12-01T10:00:00Z',
        type: 'invalid' as any, // Invalid type
      };

      const result = FileMetricsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should handle missing optional fields', () => {
      const minimalData = {
        path: 'src/lib/github/client.ts',
        name: 'client.ts',
        extension: '.ts',
        size: 1024,
        lines: 100,
        coverage: 85.5,
        coveredLines: 85,
        missedLines: 15,
        complexity: 5,
        functions: 8,
        classes: 2,
        duplication: 3.2,
        technicalDebt: 2.5,
        lastModified: '2023-12-01T10:00:00Z',
        type: 'source' as const,
      };

      const result = FileMetricsSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
    });
  });

  describe('ModuleMetricsSchema', () => {
    it('should validate correct module metrics data', () => {
      const validData = {
        name: 'src/lib/github',
        displayName: 'GitHub Integration',
        description: 'GitHub API integration and data fetching',
        type: 'service' as const,
        path: 'src/lib/github',
        files: [
          {
            path: 'src/lib/github/client.ts',
            name: 'client.ts',
            extension: '.ts',
            size: 1024,
            lines: 100,
            coverage: 85.5,
            coveredLines: 85,
            missedLines: 15,
            complexity: 5,
            functions: 8,
            classes: 2,
            duplication: 3.2,
            technicalDebt: 2.5,
            lastModified: '2023-12-01T10:00:00Z',
            type: 'source' as const,
          },
        ],
        coverage: 85.5,
        totalLines: 100,
        coveredLines: 85,
        missedLines: 15,
        averageComplexity: 5.2,
        maxComplexity: 8,
        totalFunctions: 8,
        totalClasses: 2,
        duplication: 3.2,
        technicalDebt: 5.5,
        maintainabilityIndex: 78.5,
        qualityScore: 82.1,
        priority: 'medium' as const,
        lastAnalyzed: '2023-12-01T10:00:00Z',
      };

      const result = ModuleMetricsSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe(validData.name);
        expect(result.data.type).toBe(validData.type);
        expect(result.data.files).toHaveLength(1);
      }
    });

    it('should reject invalid module metrics data', () => {
      const invalidData = {
        name: 'src/lib/github',
        displayName: 'GitHub Integration',
        type: 'invalid' as any, // Invalid type
        path: 'src/lib/github',
        files: [],
        coverage: 150, // Invalid: > 100
        totalLines: -1, // Invalid: < 0
        coveredLines: 85,
        missedLines: 15,
        averageComplexity: -1, // Invalid: < 0
        maxComplexity: 8,
        totalFunctions: 8,
        totalClasses: 2,
        duplication: 3.2,
        technicalDebt: 5.5,
        maintainabilityIndex: 150, // Invalid: > 100
        qualityScore: 82.1,
        priority: 'invalid' as any, // Invalid priority
        lastAnalyzed: '2023-12-01T10:00:00Z',
      };

      const result = ModuleMetricsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should handle optional fields', () => {
      const dataWithOptionals = {
        name: 'src/lib/github',
        displayName: 'GitHub Integration',
        description: 'GitHub API integration and data fetching',
        type: 'service' as const,
        path: 'src/lib/github',
        files: [],
        coverage: 85.5,
        totalLines: 100,
        coveredLines: 85,
        missedLines: 15,
        averageComplexity: 5.2,
        maxComplexity: 8,
        totalFunctions: 8,
        totalClasses: 2,
        duplication: 3.2,
        technicalDebt: 5.5,
        maintainabilityIndex: 78.5,
        qualityScore: 82.1,
        priority: 'medium' as const,
        subModules: ['src/lib/github/client', 'src/lib/github/issues'],
        dependencies: ['zod', 'octokit'],
        lastAnalyzed: '2023-12-01T10:00:00Z',
      };

      const result = ModuleMetricsSchema.safeParse(dataWithOptionals);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.subModules).toHaveLength(2);
        expect(result.data.dependencies).toHaveLength(2);
      }
    });
  });

  describe('CodeSmellSchema', () => {
    it('should validate correct code smell data', () => {
      const validData = {
        type: 'long_method' as const,
        severity: 'major' as const,
        filePath: 'src/lib/github/client.ts',
        lineNumber: 42,
        description: 'Method is too long with 50 lines',
        suggestion: 'Break method into smaller functions',
        estimatedFixTime: 2,
      };

      const result = CodeSmellSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('long_method');
        expect(result.data.severity).toBe('major');
      }
    });

    it('should reject invalid code smell data', () => {
      const invalidData = {
        type: 'invalid_type' as any,
        severity: 'invalid_severity' as any,
        filePath: 'src/lib/github/client.ts',
        lineNumber: -1, // Invalid: negative line number
        description: 'Method is too long with 50 lines',
        suggestion: 'Break method into smaller functions',
        estimatedFixTime: -1, // Invalid: negative time
      };

      const result = CodeSmellSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should handle optional line number', () => {
      const dataWithoutLineNumber = {
        type: 'dead_code' as const,
        severity: 'minor' as const,
        filePath: 'src/lib/github/client.ts',
        description: 'Unused import detected',
        suggestion: 'Remove unused import',
        estimatedFixTime: 0.5,
      };

      const result = CodeSmellSchema.safeParse(dataWithoutLineNumber);
      expect(result.success).toBe(true);
    });
  });

  describe('HotspotSchema', () => {
    it('should validate correct hotspot data', () => {
      const validData = {
        filePath: 'src/lib/github/client.ts',
        fileName: 'client.ts',
        moduleName: 'src/lib/github',
        changeFrequency: 15,
        complexityScore: 8.5,
        coverage: 65.2,
        riskScore: 75.8,
        priority: 'high' as const,
        codeSmells: [
          {
            type: 'complex_method' as const,
            severity: 'major' as const,
            filePath: 'src/lib/github/client.ts',
            lineNumber: 42,
            description: 'Method complexity is too high',
            suggestion: 'Refactor to reduce complexity',
            estimatedFixTime: 3,
          },
        ],
        recommendation: 'Reduce complexity and add tests',
      };

      const result = HotspotSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.codeSmells).toHaveLength(1);
        expect(result.data.riskScore).toBe(75.8);
      }
    });

    it('should reject invalid hotspot data', () => {
      const invalidData = {
        filePath: 'src/lib/github/client.ts',
        fileName: 'client.ts',
        moduleName: 'src/lib/github',
        changeFrequency: -1, // Invalid: negative
        complexityScore: 8.5,
        coverage: 150, // Invalid: > 100
        riskScore: -1, // Invalid: negative
        priority: 'invalid' as any,
        codeSmells: [],
        recommendation: 'Reduce complexity and add tests',
      };

      const result = HotspotSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('ModuleAnalysisOptionsSchema', () => {
    it('should validate correct options', () => {
      const validOptions = {
        includeFileDetails: true,
        includeCodeSmells: true,
        includeHotspots: true,
        includeDependencies: false,
        coverageThreshold: 70,
        complexityThreshold: 10,
        maxModules: 20,
        depth: 'medium' as const,
        includeTestFiles: false,
        useCache: true,
      };

      const result = ModuleAnalysisOptionsSchema.safeParse(validOptions);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.coverageThreshold).toBe(70);
        expect(result.data.depth).toBe('medium');
      }
    });

    it('should apply default values', () => {
      const result = ModuleAnalysisOptionsSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeFileDetails).toBe(true);
        expect(result.data.coverageThreshold).toBe(50);
        expect(result.data.maxModules).toBe(50);
        expect(result.data.depth).toBe('medium');
        expect(result.data.useCache).toBe(true);
      }
    });

    it('should reject invalid options', () => {
      const invalidOptions = {
        coverageThreshold: 150, // Invalid: > 100
        complexityThreshold: -1, // Invalid: < 0
        maxModules: 0, // Invalid: < 1
        depth: 'invalid' as any,
      };

      const result = ModuleAnalysisOptionsSchema.safeParse(invalidOptions);
      expect(result.success).toBe(false);
    });
  });

  describe('ModuleAnalysisReportSchema', () => {
    it('should validate complete analysis report', () => {
      const validReport = {
        project: {
          name: 'Test Project',
          version: '1.0.0',
          description: 'Test project description',
          totalModules: 5,
          totalFiles: 25,
          totalLines: 5000,
        },
        overview: {
          totalCoverage: 75.5,
          averageComplexity: 6.8,
          totalTechnicalDebt: 25.5,
          overallQualityScore: 78.2,
          maintainabilityIndex: 82.1,
        },
        modules: [
          {
            name: 'test-module',
            displayName: 'Test Module',
            type: 'service' as const,
            path: 'src/test-module',
            files: [],
            coverage: 80,
            totalLines: 100,
            coveredLines: 80,
            missedLines: 20,
            averageComplexity: 5,
            maxComplexity: 8,
            totalFunctions: 10,
            totalClasses: 2,
            duplication: 5,
            technicalDebt: 3,
            maintainabilityIndex: 85,
            qualityScore: 82,
            priority: 'low' as const,
            lastAnalyzed: '2023-12-01T10:00:00Z',
          },
        ],
        hotspots: [],
        codeSmells: [],
        recommendations: [],
        metadata: {
          generatedAt: '2023-12-01T10:00:00Z',
          analysisType: 'full' as const,
          dataSource: 'mock' as const,
          version: '1.0.0',
        },
      };

      const result = ModuleAnalysisReportSchema.safeParse(validReport);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.project.name).toBe('Test Project');
        expect(result.data.modules).toHaveLength(1);
        expect(result.data.metadata.analysisType).toBe('full');
      }
    });

    it('should reject invalid report structure', () => {
      const invalidReport = {
        project: {
          name: 'Test Project',
          totalModules: -1, // Invalid: negative
          totalFiles: 25,
          totalLines: 5000,
        },
        overview: {
          totalCoverage: 150, // Invalid: > 100
          averageComplexity: -1, // Invalid: < 0
          totalTechnicalDebt: 25.5,
          overallQualityScore: 78.2,
          maintainabilityIndex: 82.1,
        },
        modules: [],
        hotspots: [],
        codeSmells: [],
        recommendations: [],
        metadata: {
          generatedAt: '2023-12-01T10:00:00Z',
          analysisType: 'invalid' as any,
          dataSource: 'mock' as const,
          version: '1.0.0',
        },
      };

      const result = ModuleAnalysisReportSchema.safeParse(invalidReport);
      expect(result.success).toBe(false);
    });
  });

  describe('ModuleQualityTrendSchema', () => {
    it('should validate quality trend data', () => {
      const validTrend = {
        moduleName: 'src/lib/github',
        dataPoints: [
          {
            date: '2023-12-01',
            coverage: 75.5,
            complexity: 6.8,
            technicalDebt: 15.2,
            qualityScore: 78.5,
            linesOfCode: 1200,
          },
          {
            date: '2023-12-02',
            coverage: 76.2,
            complexity: 6.5,
            technicalDebt: 14.8,
            qualityScore: 79.1,
            linesOfCode: 1205,
          },
        ],
        trends: {
          coverage: 'improving' as const,
          complexity: 'improving' as const,
          technicalDebt: 'improving' as const,
          qualityScore: 'improving' as const,
        },
        period: {
          start: '2023-12-01',
          end: '2023-12-07',
          duration: '7 days',
        },
      };

      const result = ModuleQualityTrendSchema.safeParse(validTrend);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dataPoints).toHaveLength(2);
        expect(result.data.trends.coverage).toBe('improving');
      }
    });

    it('should reject invalid trend data', () => {
      const invalidTrend = {
        moduleName: 'src/lib/github',
        dataPoints: [
          {
            date: '2023-12-01',
            coverage: 150, // Invalid: > 100
            complexity: -1, // Invalid: < 0
            technicalDebt: 15.2,
            qualityScore: 78.5,
            linesOfCode: -1, // Invalid: < 0
          },
        ],
        trends: {
          coverage: 'invalid' as any,
          complexity: 'improving' as const,
          technicalDebt: 'improving' as const,
          qualityScore: 'improving' as const,
        },
        period: {
          start: '2023-12-01',
          end: '2023-12-07',
          duration: '7 days',
        },
      };

      const result = ModuleQualityTrendSchema.safeParse(invalidTrend);
      expect(result.success).toBe(false);
    });
  });

  describe('ModuleAnalysisSchemas export', () => {
    it('should export all schemas', () => {
      expect(ModuleAnalysisSchemas).toBeDefined();
      expect(ModuleAnalysisSchemas.FileMetrics).toBe(FileMetricsSchema);
      expect(ModuleAnalysisSchemas.ModuleMetrics).toBe(ModuleMetricsSchema);
      expect(ModuleAnalysisSchemas.CodeSmell).toBe(CodeSmellSchema);
      expect(ModuleAnalysisSchemas.Hotspot).toBe(HotspotSchema);
      expect(ModuleAnalysisSchemas.ModuleComparison).toBe(ModuleComparisonSchema);
      expect(ModuleAnalysisSchemas.ModuleAnalysisReport).toBe(ModuleAnalysisReportSchema);
      expect(ModuleAnalysisSchemas.ModuleAnalysisOptions).toBe(ModuleAnalysisOptionsSchema);
      expect(ModuleAnalysisSchemas.ModuleQualityTrend).toBe(ModuleQualityTrendSchema);
    });
  });
});

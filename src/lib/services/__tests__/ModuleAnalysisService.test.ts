/**
 * Module Analysis Service Tests
 *
 * Unit tests for ModuleAnalysisService covering:
 * - Service initialization
 * - Analysis report generation
 * - Module details retrieval
 * - Module comparison
 * - Error handling
 * - Cache functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModuleAnalysisService } from '../ModuleAnalysisService';
import type { ModuleAnalysisOptions } from '../../schemas/module-analysis';

describe('ModuleAnalysisService', () => {
  let service: ModuleAnalysisService;

  beforeEach(() => {
    // Get a fresh instance for each test
    service = ModuleAnalysisService.getInstance();
    // Clear cache before each test
    service.clearCache();
  });

  describe('Service Initialization', () => {
    it('should create a singleton instance', () => {
      const service1 = ModuleAnalysisService.getInstance();
      const service2 = ModuleAnalysisService.getInstance();

      expect(service1).toBe(service2);
      expect(service1).toBeInstanceOf(ModuleAnalysisService);
    });

    it('should have cache functionality', () => {
      expect(service.clearCache).toBeDefined();
      expect(service.cleanupExpiredCache).toBeDefined();
    });
  });

  describe('Analysis Report Generation', () => {
    it('should generate analysis report with default options', async () => {
      const result = await service.generateAnalysisReport();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data.project).toBeDefined();
        expect(result.data.modules).toBeDefined();
        expect(result.data.overview).toBeDefined();
        expect(result.data.metadata).toBeDefined();

        // Check project structure
        expect(result.data.project.name).toBe('Beaver Astro');
        expect(result.data.project.totalModules).toBeGreaterThan(0);
        expect(result.data.project.totalFiles).toBeGreaterThan(0);
        expect(result.data.project.totalLines).toBeGreaterThan(0);

        // Check overview metrics
        expect(result.data.overview.totalCoverage).toBeGreaterThanOrEqual(0);
        expect(result.data.overview.totalCoverage).toBeLessThanOrEqual(100);
        expect(result.data.overview.averageComplexity).toBeGreaterThanOrEqual(0);
        expect(result.data.overview.overallQualityScore).toBeGreaterThanOrEqual(0);
        expect(result.data.overview.overallQualityScore).toBeLessThanOrEqual(100);

        // Check metadata
        expect(result.data.metadata.generatedAt).toBeDefined();
        expect(result.data.metadata.analysisType).toBe('full');
        expect(result.data.metadata.dataSource).toBe('mock');
        expect(result.data.metadata.version).toBe('1.0.0');
      }
    });

    it('should generate analysis report with custom options', async () => {
      const options: Partial<ModuleAnalysisOptions> = {
        includeFileDetails: true,
        includeCodeSmells: true,
        includeHotspots: true,
        maxModules: 5,
        coverageThreshold: 70,
        complexityThreshold: 8,
        useCache: false,
      };

      const result = await service.generateAnalysisReport(options);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.modules.length).toBeLessThanOrEqual(5);
        expect(result.data.hotspots).toBeDefined();
        expect(result.data.codeSmells).toBeDefined();
        expect(result.data.recommendations).toBeDefined();
      }
    });

    it('should validate analysis options', async () => {
      const invalidOptions = {
        maxModules: -1, // Invalid: should be >= 1
        coverageThreshold: 150, // Invalid: should be <= 100
      };

      const result = await service.generateAnalysisReport(invalidOptions as any);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Module Details Retrieval', () => {
    it('should retrieve details for existing module', async () => {
      // First generate a report to have modules available
      const reportResult = await service.generateAnalysisReport();
      expect(reportResult.success).toBe(true);

      if (reportResult.success && reportResult.data.modules.length > 0) {
        const moduleName = reportResult.data.modules[0]!.name;
        const result = await service.getModuleDetails(moduleName);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe(moduleName);
          expect(result.data.files).toBeDefined();
          expect(result.data.coverage).toBeGreaterThanOrEqual(0);
          expect(result.data.qualityScore).toBeGreaterThanOrEqual(0);
          expect(result.data.priority).toMatch(/^(critical|high|medium|low)$/);
        }
      }
    });

    it('should handle non-existent module', async () => {
      const result = await service.getModuleDetails('non-existent-module');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error.message).toContain('not found');
      }
    });
  });

  describe('Module Comparison', () => {
    it('should compare multiple modules', async () => {
      // First generate a report to have modules available
      const reportResult = await service.generateAnalysisReport();
      expect(reportResult.success).toBe(true);

      if (reportResult.success && reportResult.data.modules.length >= 2) {
        const moduleNames = reportResult.data.modules.slice(0, 2).map(m => m.name);
        const result = await service.compareModules(moduleNames);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.modules).toHaveLength(2);
          expect(result.data.comparison).toBeDefined();
          expect(result.data.rankings).toBeDefined();
          expect(result.data.generatedAt).toBeDefined();

          // Check comparison structure
          expect(result.data.comparison.coverage).toBeDefined();
          expect(result.data.comparison.complexity).toBeDefined();
          expect(result.data.comparison.technicalDebt).toBeDefined();
          expect(result.data.comparison.qualityScore).toBeDefined();

          // Check rankings
          expect(result.data.rankings.byCoverage).toHaveLength(2);
          expect(result.data.rankings.byComplexity).toHaveLength(2);
          expect(result.data.rankings.byTechnicalDebt).toHaveLength(2);
          expect(result.data.rankings.byQualityScore).toHaveLength(2);
        }
      }
    });

    it('should handle empty module list', async () => {
      const result = await service.compareModules([]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error.message).toContain('No matching modules found');
      }
    });

    it('should handle non-existent modules', async () => {
      const result = await service.compareModules(['non-existent-1', 'non-existent-2']);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error.message).toContain('No matching modules found');
      }
    });
  });

  describe('Quality Trend Analysis', () => {
    it('should generate quality trend for module', async () => {
      const moduleName = 'src/lib/github';
      const result = await service.getModuleQualityTrend(moduleName, 30);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.moduleName).toBe(moduleName);
        expect(result.data.dataPoints).toBeDefined();
        expect(result.data.dataPoints.length).toBeGreaterThan(0);
        expect(result.data.trends).toBeDefined();
        expect(result.data.period).toBeDefined();

        // Check trend data structure
        expect(result.data.trends.coverage).toMatch(/^(improving|stable|declining)$/);
        expect(result.data.trends.complexity).toMatch(/^(improving|stable|declining)$/);
        expect(result.data.trends.technicalDebt).toMatch(/^(improving|stable|declining)$/);
        expect(result.data.trends.qualityScore).toMatch(/^(improving|stable|declining)$/);

        // Check data points
        result.data.dataPoints.forEach(point => {
          expect(point.date).toBeDefined();
          expect(point.coverage).toBeGreaterThanOrEqual(0);
          expect(point.coverage).toBeLessThanOrEqual(100);
          expect(point.complexity).toBeGreaterThanOrEqual(0);
          expect(point.technicalDebt).toBeGreaterThanOrEqual(0);
          expect(point.qualityScore).toBeGreaterThanOrEqual(0);
          expect(point.qualityScore).toBeLessThanOrEqual(100);
        });
      }
    });

    it('should handle different period lengths', async () => {
      const moduleName = 'src/lib/github';
      const result7 = await service.getModuleQualityTrend(moduleName, 7);
      const result30 = await service.getModuleQualityTrend(moduleName, 30);

      expect(result7.success).toBe(true);
      expect(result30.success).toBe(true);

      if (result7.success && result30.success) {
        expect(result7.data.period.duration).toBe('7 days');
        expect(result30.data.period.duration).toBe('30 days');

        // 30-day trend should have more data points
        expect(result30.data.dataPoints.length).toBeGreaterThan(result7.data.dataPoints.length);
      }
    });
  });

  describe('Hotspot Analysis', () => {
    it('should identify hotspots', async () => {
      const result = await service.getHotspots({
        includeHotspots: true,
        maxModules: 10,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(Array.isArray(result.data)).toBe(true);

        // Check hotspot structure if any exist
        if (result.data.length > 0) {
          const hotspot = result.data[0]!;
          expect(hotspot.filePath).toBeDefined();
          expect(hotspot.fileName).toBeDefined();
          expect(hotspot.moduleName).toBeDefined();
          expect(hotspot.riskScore).toBeGreaterThanOrEqual(0);
          expect(hotspot.riskScore).toBeLessThanOrEqual(100);
          expect(hotspot.priority).toMatch(/^(critical|high|medium|low)$/);
          expect(hotspot.recommendation).toBeDefined();
        }
      }
    });
  });

  describe('Cache Functionality', () => {
    it('should cache analysis results', async () => {
      const options = { useCache: true, maxModules: 5 };

      // First call should generate fresh data
      const result1 = await service.generateAnalysisReport(options);
      expect(result1.success).toBe(true);

      // Second call should use cached data
      const result2 = await service.generateAnalysisReport(options);
      expect(result2.success).toBe(true);

      if (result1.success && result2.success) {
        // Both should have the same structure
        expect(result1.data.modules.length).toBe(result2.data.modules.length);
        expect(result2.data.metadata.analysisType).toBe('cached');
      }
    });

    it('should bypass cache when disabled', async () => {
      const options = { useCache: false, maxModules: 5 };

      const result1 = await service.generateAnalysisReport(options);
      const result2 = await service.generateAnalysisReport(options);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      if (result1.success && result2.success) {
        expect(result1.data.metadata.analysisType).toBe('full');
        expect(result2.data.metadata.analysisType).toBe('full');
      }
    });

    it('should clear cache', async () => {
      const options = { useCache: true, maxModules: 5 };

      // Generate cached data
      const result1 = await service.generateAnalysisReport(options);
      expect(result1.success).toBe(true);

      // Clear cache
      service.clearCache();

      // Next call should generate fresh data
      const result2 = await service.generateAnalysisReport(options);
      expect(result2.success).toBe(true);

      if (result2.success) {
        expect(result2.data.metadata.analysisType).toBe('full');
      }
    });

    it('should cleanup expired cache', async () => {
      // This test would require mocking time to properly test expiration
      // For now, just verify the method exists and doesn't throw
      expect(() => service.cleanupExpiredCache()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid options gracefully', async () => {
      const invalidOptions = {
        maxModules: 'invalid' as any,
        coverageThreshold: 'invalid' as any,
      };

      const result = await service.generateAnalysisReport(invalidOptions);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it('should handle service errors gracefully', async () => {
      // Mock console.error to avoid noise in test output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        // This should still work even if there are internal errors
        const result = await service.generateAnalysisReport();
        expect(result.success).toBe(true);
      } finally {
        consoleSpy.mockRestore();
      }
    });
  });

  describe('Data Validation', () => {
    it('should generate valid module data', async () => {
      const result = await service.generateAnalysisReport();

      expect(result.success).toBe(true);
      if (result.success) {
        // Validate each module
        result.data.modules.forEach(module => {
          expect(module.name).toBeDefined();
          expect(module.displayName).toBeDefined();
          expect(module.type).toMatch(/^(feature|utility|component|service|config|test|other)$/);
          expect(module.coverage).toBeGreaterThanOrEqual(0);
          expect(module.coverage).toBeLessThanOrEqual(100);
          expect(module.qualityScore).toBeGreaterThanOrEqual(0);
          expect(module.qualityScore).toBeLessThanOrEqual(100);
          expect(module.priority).toMatch(/^(critical|high|medium|low)$/);
          expect(module.files).toBeDefined();
          expect(Array.isArray(module.files)).toBe(true);

          // Validate file data
          module.files.forEach(file => {
            expect(file.name).toBeDefined();
            expect(file.path).toBeDefined();
            expect(file.coverage).toBeGreaterThanOrEqual(0);
            expect(file.coverage).toBeLessThanOrEqual(100);
            expect(file.lines).toBeGreaterThanOrEqual(0);
            expect(file.complexity).toBeGreaterThanOrEqual(0);
            expect(file.type).toMatch(/^(source|test|config|documentation|other)$/);
          });
        });
      }
    });

    it('should generate valid hotspot data', async () => {
      const result = await service.getHotspots();

      expect(result.success).toBe(true);
      if (result.success) {
        result.data.forEach(hotspot => {
          expect(hotspot.filePath).toBeDefined();
          expect(hotspot.fileName).toBeDefined();
          expect(hotspot.moduleName).toBeDefined();
          expect(hotspot.riskScore).toBeGreaterThanOrEqual(0);
          expect(hotspot.riskScore).toBeLessThanOrEqual(100);
          expect(hotspot.priority).toMatch(/^(critical|high|medium|low)$/);
          expect(hotspot.recommendation).toBeDefined();
          expect(Array.isArray(hotspot.codeSmells)).toBe(true);
        });
      }
    });
  });
});

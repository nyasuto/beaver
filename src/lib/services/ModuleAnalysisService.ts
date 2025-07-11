/**
 * Module Analysis Service
 *
 * Provides comprehensive module-level analysis including:
 * - File and module metrics collection
 * - Code smell detection
 * - Hotspot analysis
 * - Module comparison
 * - Quality trend analysis
 */

import type { Result } from '../types';
import {
  type ModuleAnalysisReport,
  type ModuleMetrics,
  type FileMetrics,
  type CodeSmell,
  type Hotspot,
  type ModuleComparison,
  type ModuleAnalysisOptions,
  type ModuleQualityTrend,
  ModuleAnalysisOptionsSchema,
} from '../schemas/module-analysis';

/**
 * Cache entry for module analysis results
 */
interface AnalysisCacheEntry {
  data: ModuleAnalysisReport;
  timestamp: number;
  options: ModuleAnalysisOptions;
}

/**
 * Module Analysis Service Class
 */
export class ModuleAnalysisService {
  private static instance: ModuleAnalysisService;
  private cache: Map<string, AnalysisCacheEntry> = new Map();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): ModuleAnalysisService {
    if (!ModuleAnalysisService.instance) {
      ModuleAnalysisService.instance = new ModuleAnalysisService();
    }
    return ModuleAnalysisService.instance;
  }

  /**
   * Generate comprehensive module analysis report
   */
  public async generateAnalysisReport(
    options: Partial<ModuleAnalysisOptions> = {}
  ): Promise<Result<ModuleAnalysisReport>> {
    try {
      const validatedOptions = ModuleAnalysisOptionsSchema.parse(options);
      const cacheKey = this.generateCacheKey(validatedOptions);

      // Check cache if enabled
      if (validatedOptions.useCache) {
        const cached = this.getCachedAnalysis(cacheKey);
        if (cached) {
          return { success: true, data: cached };
        }
      }

      // Generate fresh analysis
      const report = await this.performAnalysis(validatedOptions);

      // Cache the result
      if (validatedOptions.useCache) {
        this.setCachedAnalysis(cacheKey, report, validatedOptions);
      }

      return { success: true, data: report };
    } catch (error) {
      console.error('Module analysis failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get detailed metrics for a specific module
   */
  public async getModuleDetails(
    moduleName: string,
    options: Partial<ModuleAnalysisOptions> = {}
  ): Promise<Result<ModuleMetrics>> {
    try {
      const validatedOptions = ModuleAnalysisOptionsSchema.parse(options);
      const report = await this.generateAnalysisReport(validatedOptions);

      if (!report.success) {
        return report;
      }

      const module = report.data.modules.find(m => m.name === moduleName);
      if (!module) {
        return {
          success: false,
          error: new Error(`Module "${moduleName}" not found`),
        };
      }

      return { success: true, data: module };
    } catch (error) {
      console.error('Failed to get module details:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Compare multiple modules
   */
  public async compareModules(
    moduleNames: string[],
    options: Partial<ModuleAnalysisOptions> = {}
  ): Promise<Result<ModuleComparison>> {
    try {
      const validatedOptions = ModuleAnalysisOptionsSchema.parse(options);
      const report = await this.generateAnalysisReport(validatedOptions);

      if (!report.success) {
        return report;
      }

      const modules = report.data.modules.filter(m => moduleNames.includes(m.name));
      if (modules.length === 0) {
        return {
          success: false,
          error: new Error('No matching modules found'),
        };
      }

      const comparison = this.generateModuleComparison(modules);
      return { success: true, data: comparison };
    } catch (error) {
      console.error('Module comparison failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get quality trend for a module
   */
  public async getModuleQualityTrend(
    moduleName: string,
    periodDays: number = 30
  ): Promise<Result<ModuleQualityTrend>> {
    try {
      // In a real implementation, this would fetch historical data
      // For now, we'll generate mock trend data
      const trend = this.generateMockTrend(moduleName, periodDays);
      return { success: true, data: trend };
    } catch (error) {
      console.error('Failed to get quality trend:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get hotspots that need immediate attention
   */
  public async getHotspots(
    options: Partial<ModuleAnalysisOptions> = {}
  ): Promise<Result<Hotspot[]>> {
    try {
      const validatedOptions = ModuleAnalysisOptionsSchema.parse(options);
      const report = await this.generateAnalysisReport(validatedOptions);

      if (!report.success) {
        return report;
      }

      return { success: true, data: report.data.hotspots };
    } catch (error) {
      console.error('Failed to get hotspots:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Perform the actual analysis
   */
  private async performAnalysis(options: ModuleAnalysisOptions): Promise<ModuleAnalysisReport> {
    const now = new Date();

    // In a real implementation, this would analyze the actual codebase
    // For now, we'll generate realistic mock data based on the project structure
    const modules = this.generateMockModules(options);
    const overview = this.calculateOverview(modules);
    const hotspots = this.generateHotspots(modules);
    const codeSmells = this.generateCodeSmells(modules);
    const recommendations = this.generateRecommendations(modules, hotspots, codeSmells);

    return {
      project: {
        name: 'Beaver Astro',
        version: '1.0.0',
        description: 'AI-first knowledge management system',
        totalModules: modules.length,
        totalFiles: modules.reduce((sum, m) => sum + m.files.length, 0),
        totalLines: modules.reduce((sum, m) => sum + m.totalLines, 0),
      },
      overview,
      modules,
      hotspots,
      codeSmells,
      recommendations,
      metadata: {
        generatedAt: now.toISOString(),
        analysisType: 'full',
        dataSource: 'mock',
        version: '1.0.0',
      },
    };
  }

  /**
   * Generate mock module data based on project structure
   */
  private generateMockModules(options: ModuleAnalysisOptions): ModuleMetrics[] {
    const modules: ModuleMetrics[] = [];

    // Core modules based on actual project structure
    const moduleConfigs = [
      {
        name: 'src/lib/github',
        displayName: 'GitHub Integration',
        type: 'service' as const,
        description: 'GitHub API integration and data fetching',
        baseComplexity: 8,
        baseCoverage: 72,
        fileCount: 12,
      },
      {
        name: 'src/components/ui',
        displayName: 'UI Components',
        type: 'component' as const,
        description: 'Reusable UI components',
        baseComplexity: 4,
        baseCoverage: 85,
        fileCount: 18,
      },
      {
        name: 'src/lib/schemas',
        displayName: 'Data Schemas',
        type: 'utility' as const,
        description: 'Zod schemas and type definitions',
        baseComplexity: 3,
        baseCoverage: 95,
        fileCount: 15,
      },
      {
        name: 'src/components/charts',
        displayName: 'Chart Components',
        type: 'component' as const,
        description: 'Data visualization components',
        baseComplexity: 6,
        baseCoverage: 78,
        fileCount: 8,
      },
      {
        name: 'src/lib/services',
        displayName: 'Business Services',
        type: 'service' as const,
        description: 'Core business logic services',
        baseComplexity: 7,
        baseCoverage: 65,
        fileCount: 6,
      },
      {
        name: 'src/lib/utils',
        displayName: 'Utility Functions',
        type: 'utility' as const,
        description: 'Common utility functions',
        baseComplexity: 5,
        baseCoverage: 88,
        fileCount: 10,
      },
      {
        name: 'src/pages/api',
        displayName: 'API Routes',
        type: 'service' as const,
        description: 'API endpoint handlers',
        baseComplexity: 6,
        baseCoverage: 55,
        fileCount: 12,
      },
      {
        name: 'src/components/dashboard',
        displayName: 'Dashboard Components',
        type: 'component' as const,
        description: 'Dashboard and analytics components',
        baseComplexity: 5,
        baseCoverage: 70,
        fileCount: 8,
      },
    ];

    for (const config of moduleConfigs.slice(0, options.maxModules)) {
      const module = this.generateModuleMetrics(config, options);
      modules.push(module);
    }

    return modules;
  }

  /**
   * Generate metrics for a single module
   */
  private generateModuleMetrics(
    config: {
      name: string;
      displayName: string;
      type: 'feature' | 'utility' | 'component' | 'service' | 'config' | 'test' | 'other';
      description: string;
      baseComplexity: number;
      baseCoverage: number;
      fileCount: number;
    },
    _options: ModuleAnalysisOptions
  ): ModuleMetrics {
    const files = this.generateFileMetrics(config.name, config.fileCount, config.baseCoverage);
    const totalLines = files.reduce((sum, f) => sum + f.lines, 0);
    const coveredLines = files.reduce((sum, f) => sum + f.coveredLines, 0);
    const coverage = totalLines > 0 ? (coveredLines / totalLines) * 100 : 0;

    // Calculate quality score based on multiple factors
    const complexityScore = Math.max(0, 100 - config.baseComplexity * 5);
    const coverageScore = coverage;
    const duplicationPenalty = Math.random() * 10; // 0-10% duplication
    const qualityScore = Math.max(0, (complexityScore + coverageScore) / 2 - duplicationPenalty);

    // Determine priority based on quality score
    let priority: 'critical' | 'high' | 'medium' | 'low' = 'low';
    if (qualityScore < 40) priority = 'critical';
    else if (qualityScore < 60) priority = 'high';
    else if (qualityScore < 80) priority = 'medium';

    return {
      name: config.name,
      displayName: config.displayName,
      description: config.description,
      type: config.type,
      path: config.name,
      files,
      coverage,
      totalLines,
      coveredLines,
      missedLines: totalLines - coveredLines,
      averageComplexity: config.baseComplexity + (Math.random() * 4 - 2),
      maxComplexity: config.baseComplexity + Math.floor(Math.random() * 10),
      totalFunctions: files.reduce((sum, f) => sum + f.functions, 0),
      totalClasses: files.reduce((sum, f) => sum + f.classes, 0),
      duplication: duplicationPenalty,
      technicalDebt: Math.floor((100 - qualityScore) * 0.5 + Math.random() * 10),
      maintainabilityIndex: Math.max(0, qualityScore + (Math.random() * 20 - 10)),
      qualityScore,
      priority,
      lastAnalyzed: new Date().toISOString(),
    };
  }

  /**
   * Generate file metrics for a module
   */
  private generateFileMetrics(
    modulePath: string,
    fileCount: number,
    baseCoverage: number
  ): FileMetrics[] {
    const files: FileMetrics[] = [];

    for (let i = 0; i < fileCount; i++) {
      const extensions = ['.ts', '.tsx', '.astro', '.js', '.jsx'];
      const extension = extensions[Math.floor(Math.random() * extensions.length)]!;
      const fileName = `file-${i + 1}${extension}`;
      const filePath = `${modulePath}/${fileName}`;

      const lines = Math.floor(Math.random() * 300) + 50;
      const coverageVariation = (Math.random() - 0.5) * 30; // ±15% variation
      const coverage = Math.max(0, Math.min(100, baseCoverage + coverageVariation));
      const coveredLines = Math.floor((lines * coverage) / 100);

      files.push({
        path: filePath,
        name: fileName,
        extension,
        size: lines * 50 + Math.floor(Math.random() * 1000),
        lines,
        coverage,
        coveredLines,
        missedLines: lines - coveredLines,
        complexity: Math.floor(Math.random() * 15) + 1,
        functions: Math.floor(Math.random() * 10) + 1,
        classes: Math.floor(Math.random() * 3),
        duplication: Math.random() * 15,
        technicalDebt: Math.floor(Math.random() * 8) + 1,
        lastModified: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        type: extension.includes('test') ? 'test' : 'source',
      });
    }

    return files;
  }

  /**
   * Calculate overall project metrics
   */
  private calculateOverview(modules: ModuleMetrics[]) {
    const totalLines = modules.reduce((sum, m) => sum + m.totalLines, 0);
    const totalCoveredLines = modules.reduce((sum, m) => sum + m.coveredLines, 0);
    const totalCoverage = totalLines > 0 ? (totalCoveredLines / totalLines) * 100 : 0;

    return {
      totalCoverage,
      averageComplexity: modules.reduce((sum, m) => sum + m.averageComplexity, 0) / modules.length,
      totalTechnicalDebt: modules.reduce((sum, m) => sum + m.technicalDebt, 0),
      overallQualityScore: modules.reduce((sum, m) => sum + m.qualityScore, 0) / modules.length,
      maintainabilityIndex:
        modules.reduce((sum, m) => sum + m.maintainabilityIndex, 0) / modules.length,
    };
  }

  /**
   * Generate hotspots analysis
   */
  private generateHotspots(modules: ModuleMetrics[]): Hotspot[] {
    const hotspots: Hotspot[] = [];

    for (const module of modules) {
      if (module.priority === 'critical' || module.priority === 'high') {
        // Find files with highest risk
        const riskyFiles = module.files
          .filter(f => f.coverage < 50 || f.complexity > 10)
          .sort((a, b) => b.complexity * (100 - b.coverage) - a.complexity * (100 - a.coverage))
          .slice(0, 3);

        for (const file of riskyFiles) {
          hotspots.push({
            filePath: file.path,
            fileName: file.name,
            moduleName: module.name,
            changeFrequency: Math.floor(Math.random() * 20) + 5,
            complexityScore: file.complexity,
            coverage: file.coverage,
            riskScore: Math.min(100, file.complexity * 5 + (100 - file.coverage)),
            priority: module.priority,
            codeSmells: this.generateCodeSmellsForFile(file),
            recommendation: this.generateRecommendationForFile(file),
          });
        }
      }
    }

    return hotspots.sort((a, b) => b.riskScore - a.riskScore).slice(0, 20);
  }

  /**
   * Generate code smells for the analysis
   */
  private generateCodeSmells(modules: ModuleMetrics[]): CodeSmell[] {
    const codeSmells: CodeSmell[] = [];

    for (const module of modules) {
      for (const file of module.files) {
        const fileSmells = this.generateCodeSmellsForFile(file);
        codeSmells.push(...fileSmells);
      }
    }

    return codeSmells
      .sort((a, b) => {
        const severityOrder = { critical: 0, major: 1, minor: 2, info: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      })
      .slice(0, 50);
  }

  /**
   * Generate code smells for a specific file
   */
  private generateCodeSmellsForFile(file: FileMetrics): CodeSmell[] {
    const smells: CodeSmell[] = [];

    // Generate smells based on file characteristics
    if (file.complexity > 15) {
      smells.push({
        type: 'complex_method',
        severity: 'major',
        filePath: file.path,
        lineNumber: Math.floor(Math.random() * file.lines) + 1,
        description: `Method with cyclomatic complexity of ${file.complexity}`,
        suggestion: 'Break down into smaller methods or extract functionality',
        estimatedFixTime: Math.floor(file.complexity / 5) + 1,
      });
    }

    if (file.lines > 500) {
      smells.push({
        type: 'large_class',
        severity: 'minor',
        filePath: file.path,
        description: `File has ${file.lines} lines`,
        suggestion: 'Consider splitting into smaller, focused modules',
        estimatedFixTime: Math.floor(file.lines / 100),
      });
    }

    if (file.duplication > 10) {
      smells.push({
        type: 'duplicate_code',
        severity: 'major',
        filePath: file.path,
        description: `${file.duplication.toFixed(1)}% code duplication detected`,
        suggestion: 'Extract common functionality into reusable components',
        estimatedFixTime: Math.floor(file.duplication / 5) + 1,
      });
    }

    return smells;
  }

  /**
   * Generate recommendation for a file
   */
  private generateRecommendationForFile(file: FileMetrics): string {
    const recommendations: string[] = [];

    if (file.coverage < 50) {
      recommendations.push('Add comprehensive unit tests');
    }

    if (file.complexity > 10) {
      recommendations.push('Reduce cyclomatic complexity');
    }

    if (file.duplication > 5) {
      recommendations.push('Eliminate code duplication');
    }

    return recommendations.join('; ') || 'Continue monitoring';
  }

  /**
   * Generate recommendations for the entire project
   */
  private generateRecommendations(
    modules: ModuleMetrics[],
    _hotspots: Hotspot[],
    _codeSmells: CodeSmell[]
  ) {
    const recommendations = [];

    // Coverage recommendations
    const lowCoverageModules = modules.filter(m => m.coverage < 50);
    if (lowCoverageModules.length > 0) {
      recommendations.push({
        type: 'coverage' as const,
        priority: 'high' as const,
        title: 'Improve Test Coverage',
        description: `${lowCoverageModules.length} modules have coverage below 50%`,
        impact: 'Reduced bug risk and improved code quality',
        effort: 'high' as const,
        modules: lowCoverageModules.map(m => m.name),
      });
    }

    // Complexity recommendations
    const complexModules = modules.filter(m => m.averageComplexity > 10);
    if (complexModules.length > 0) {
      recommendations.push({
        type: 'complexity' as const,
        priority: 'medium' as const,
        title: 'Reduce Cyclomatic Complexity',
        description: `${complexModules.length} modules have high complexity`,
        impact: 'Improved maintainability and readability',
        effort: 'medium' as const,
        modules: complexModules.map(m => m.name),
      });
    }

    // Technical debt recommendations
    const highDebtModules = modules.filter(m => m.technicalDebt > 20);
    if (highDebtModules.length > 0) {
      recommendations.push({
        type: 'debt' as const,
        priority: 'medium' as const,
        title: 'Address Technical Debt',
        description: `${highDebtModules.length} modules have high technical debt`,
        impact: 'Faster development and fewer bugs',
        effort: 'high' as const,
        modules: highDebtModules.map(m => m.name),
      });
    }

    return recommendations;
  }

  /**
   * Generate module comparison
   */
  private generateModuleComparison(modules: ModuleMetrics[]): ModuleComparison {
    const coverages = modules.map(m => m.coverage);
    const complexities = modules.map(m => m.averageComplexity);
    const debts = modules.map(m => m.technicalDebt);
    const qualities = modules.map(m => m.qualityScore);

    return {
      modules,
      comparison: {
        coverage: {
          best: modules.reduce((best, current) =>
            best.coverage > current.coverage ? best : current
          ).name,
          worst: modules.reduce((worst, current) =>
            worst.coverage < current.coverage ? worst : current
          ).name,
          average: coverages.reduce((sum, c) => sum + c, 0) / coverages.length,
          median: this.calculateMedian(coverages),
        },
        complexity: {
          lowest: modules.reduce((lowest, current) =>
            lowest.averageComplexity < current.averageComplexity ? lowest : current
          ).name,
          highest: modules.reduce((highest, current) =>
            highest.averageComplexity > current.averageComplexity ? highest : current
          ).name,
          average: complexities.reduce((sum, c) => sum + c, 0) / complexities.length,
          median: this.calculateMedian(complexities),
        },
        technicalDebt: {
          lowest: modules.reduce((lowest, current) =>
            lowest.technicalDebt < current.technicalDebt ? lowest : current
          ).name,
          highest: modules.reduce((highest, current) =>
            highest.technicalDebt > current.technicalDebt ? highest : current
          ).name,
          total: debts.reduce((sum, d) => sum + d, 0),
          average: debts.reduce((sum, d) => sum + d, 0) / debts.length,
        },
        qualityScore: {
          best: modules.reduce((best, current) =>
            best.qualityScore > current.qualityScore ? best : current
          ).name,
          worst: modules.reduce((worst, current) =>
            worst.qualityScore < current.qualityScore ? worst : current
          ).name,
          average: qualities.reduce((sum, q) => sum + q, 0) / qualities.length,
          median: this.calculateMedian(qualities),
        },
      },
      rankings: {
        byCoverage: modules.sort((a, b) => b.coverage - a.coverage).map(m => m.name),
        byComplexity: modules
          .sort((a, b) => a.averageComplexity - b.averageComplexity)
          .map(m => m.name),
        byTechnicalDebt: modules.sort((a, b) => a.technicalDebt - b.technicalDebt).map(m => m.name),
        byQualityScore: modules.sort((a, b) => b.qualityScore - a.qualityScore).map(m => m.name),
      },
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate mock quality trend data
   */
  private generateMockTrend(moduleName: string, periodDays: number): ModuleQualityTrend {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

    const dataPoints = [];
    for (let i = 0; i < periodDays; i += 3) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      dataPoints.push({
        date: date.toISOString().split('T')[0]!,
        coverage: Math.max(0, Math.min(100, 70 + Math.random() * 20 - 10)),
        complexity: Math.max(1, 8 + Math.random() * 4 - 2),
        technicalDebt: Math.max(0, 15 + Math.random() * 10 - 5),
        qualityScore: Math.max(0, Math.min(100, 75 + Math.random() * 20 - 10)),
        linesOfCode: Math.floor(1000 + Math.random() * 200 - 100),
      });
    }

    return {
      moduleName,
      dataPoints,
      trends: {
        coverage: Math.random() > 0.5 ? 'improving' : 'stable',
        complexity: Math.random() > 0.5 ? 'stable' : 'improving',
        technicalDebt: Math.random() > 0.5 ? 'improving' : 'stable',
        qualityScore: Math.random() > 0.5 ? 'improving' : 'stable',
      },
      period: {
        start: startDate.toISOString().split('T')[0]!,
        end: endDate.toISOString().split('T')[0]!,
        duration: `${periodDays} days`,
      },
    };
  }

  /**
   * Calculate median of an array
   */
  private calculateMedian(numbers: number[]): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1]! + sorted[mid]!) / 2;
    } else {
      return sorted[mid]!;
    }
  }

  /**
   * Generate cache key for analysis options
   */
  private generateCacheKey(_options: ModuleAnalysisOptions): string {
    return JSON.stringify(_options);
  }

  /**
   * Get cached analysis if available and valid
   */
  private getCachedAnalysis(cacheKey: string): ModuleAnalysisReport | null {
    const cached = this.cache.get(cacheKey);

    if (!cached) {
      return null;
    }

    const isExpired = Date.now() - cached.timestamp > this.CACHE_TTL;
    if (isExpired) {
      this.cache.delete(cacheKey);
      return null;
    }

    return {
      ...cached.data,
      metadata: {
        ...cached.data.metadata,
        analysisType: 'cached',
      },
    };
  }

  /**
   * Cache analysis results
   */
  private setCachedAnalysis(
    cacheKey: string,
    data: ModuleAnalysisReport,
    options: ModuleAnalysisOptions
  ): void {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      options,
    });
  }

  /**
   * Clear all cached results
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired cache entries
   */
  public cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Get singleton instance of the module analysis service
 */
export function getModuleAnalysisService(): ModuleAnalysisService {
  return ModuleAnalysisService.getInstance();
}

/**
 * Export the service class and types
 */
export default ModuleAnalysisService;

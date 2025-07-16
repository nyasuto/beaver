/**
 * Module Statistics Utilities
 *
 * Provides statistical analysis and categorization for module analysis data.
 * Extracted from Astro component to improve testability and reusability.
 */

import type {
  ModuleAnalysisReport,
  ModuleMetrics as AnalysisModule,
  Hotspot as HotspotItem,
  CodeSmell,
} from '../schemas/module-analysis';

export interface PriorityStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface QualityDistribution {
  excellent: number;
  good: number;
  fair: number;
  poor: number;
}

export interface ModulesByPriority {
  critical: AnalysisModule[];
  high: AnalysisModule[];
  medium: AnalysisModule[];
  low: AnalysisModule[];
}

/**
 * Analyzes and categorizes module data for dashboard display
 */
export class ModuleStatisticsCalculator {
  /**
   * Calculate priority distribution statistics
   */
  static calculatePriorityStats(modules: AnalysisModule[]): PriorityStats {
    return {
      total: modules.length,
      critical: modules.filter(m => m.priority === 'critical').length,
      high: modules.filter(m => m.priority === 'high').length,
      medium: modules.filter(m => m.priority === 'medium').length,
      low: modules.filter(m => m.priority === 'low').length,
    };
  }

  /**
   * Calculate quality score distribution
   */
  static calculateQualityDistribution(modules: AnalysisModule[]): QualityDistribution {
    return {
      excellent: modules.filter(m => m.qualityScore >= 90).length,
      good: modules.filter(m => m.qualityScore >= 70 && m.qualityScore < 90).length,
      fair: modules.filter(m => m.qualityScore >= 50 && m.qualityScore < 70).length,
      poor: modules.filter(m => m.qualityScore < 50).length,
    };
  }

  /**
   * Group modules by priority level
   */
  static groupModulesByPriority(modules: AnalysisModule[]): ModulesByPriority {
    return {
      critical: modules.filter(m => m.priority === 'critical'),
      high: modules.filter(m => m.priority === 'high'),
      medium: modules.filter(m => m.priority === 'medium'),
      low: modules.filter(m => m.priority === 'low'),
    };
  }

  /**
   * Get top hotspots by risk score
   */
  static getTopHotspots(hotspots: HotspotItem[], limit: number = 5): HotspotItem[] {
    return hotspots.sort((a, b) => b.riskScore - a.riskScore).slice(0, limit);
  }

  /**
   * Get critical code smells
   */
  static getCriticalCodeSmells(
    codeSmells: CodeSmell[],
    severities: string[] = ['critical', 'major'],
    limit: number = 10
  ): CodeSmell[] {
    return codeSmells
      .filter(s => severities.includes(s.severity))
      .sort((a, b) => {
        // Sort by severity priority, then by estimated fix time
        const severityPriority = { critical: 3, major: 2, minor: 1, info: 0 };
        const aPriority = severityPriority[a.severity as keyof typeof severityPriority] || 0;
        const bPriority = severityPriority[b.severity as keyof typeof severityPriority] || 0;

        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }

        return b.estimatedFixTime - a.estimatedFixTime;
      })
      .slice(0, limit);
  }

  /**
   * Calculate overall project health metrics
   */
  static calculateProjectHealth(report: ModuleAnalysisReport): {
    healthScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    recommendations: string[];
  } {
    const { overview, hotspots, codeSmells } = report;

    // Calculate weighted health score
    let healthScore = 0;
    const weights = {
      coverage: 0.25,
      quality: 0.3,
      complexity: 0.2,
      technicalDebt: 0.15,
      codeSmells: 0.1,
    };

    // Coverage score (0-100)
    const coverageScore = Math.min(overview.totalCoverage, 100);
    healthScore += (coverageScore / 100) * weights.coverage * 100;

    // Quality score (0-100)
    const qualityScore = Math.min(overview.overallQualityScore, 100);
    healthScore += (qualityScore / 100) * weights.quality * 100;

    // Complexity score (lower is better, normalize to 0-100)
    const complexityScore = Math.max(0, 100 - overview.averageComplexity * 5);
    healthScore += (complexityScore / 100) * weights.complexity * 100;

    // Technical debt score (lower is better, normalize to 0-100)
    const debtScore = Math.max(0, 100 - overview.totalTechnicalDebt / 10);
    healthScore += (debtScore / 100) * weights.technicalDebt * 100;

    // Code smells score (fewer is better)
    const criticalSmells = codeSmells.filter(s => s.severity === 'critical').length;
    const smellsScore = Math.max(0, 100 - criticalSmells * 10);
    healthScore += (smellsScore / 100) * weights.codeSmells * 100;

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (healthScore >= 80) riskLevel = 'low';
    else if (healthScore >= 60) riskLevel = 'medium';
    else if (healthScore >= 40) riskLevel = 'high';
    else riskLevel = 'critical';

    // Generate recommendations
    const recommendations: string[] = [];

    if (overview.totalCoverage < 70) {
      recommendations.push('テストカバレッジを70%以上に向上させることを推奨します');
    }

    if (overview.averageComplexity > 10) {
      recommendations.push('平均複雑度が高いため、コードの簡素化を検討してください');
    }

    if (overview.totalTechnicalDebt > 100) {
      recommendations.push('技術的負債が蓄積されています。リファクタリングを計画してください');
    }

    if (hotspots.length > 5) {
      recommendations.push('ホットスポットが多数検出されています。優先的な対応が必要です');
    }

    if (criticalSmells > 5) {
      recommendations.push('重要なコードスメルが検出されています。早急な修正が必要です');
    }

    return {
      healthScore: Math.round(healthScore),
      riskLevel,
      recommendations,
    };
  }

  /**
   * Calculate module quality trends
   */
  static calculateQualityTrends(modules: AnalysisModule[]): {
    averageQuality: number;
    qualityVariance: number;
    improvementOpportunities: AnalysisModule[];
  } {
    const qualityScores = modules.map(m => m.qualityScore);
    const averageQuality =
      qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;

    // Calculate variance
    const variance =
      qualityScores.reduce((sum, score) => {
        return sum + Math.pow(score - averageQuality, 2);
      }, 0) / qualityScores.length;

    // Find modules with improvement opportunities (below average quality)
    const improvementOpportunities = modules
      .filter(m => m.qualityScore < averageQuality)
      .sort((a, b) => a.qualityScore - b.qualityScore)
      .slice(0, 5);

    return {
      averageQuality: Math.round(averageQuality),
      qualityVariance: Math.round(variance),
      improvementOpportunities,
    };
  }

  /**
   * Generate summary statistics for dashboard display
   */
  static generateSummaryStats(report: ModuleAnalysisReport): {
    priorityStats: PriorityStats;
    qualityDistribution: QualityDistribution;
    modulesByPriority: ModulesByPriority;
    topHotspots: HotspotItem[];
    criticalCodeSmells: CodeSmell[];
    projectHealth: ReturnType<typeof ModuleStatisticsCalculator.calculateProjectHealth>;
    qualityTrends: ReturnType<typeof ModuleStatisticsCalculator.calculateQualityTrends>;
  } {
    return {
      priorityStats: this.calculatePriorityStats(report.modules),
      qualityDistribution: this.calculateQualityDistribution(report.modules),
      modulesByPriority: this.groupModulesByPriority(report.modules),
      topHotspots: this.getTopHotspots(report.hotspots),
      criticalCodeSmells: this.getCriticalCodeSmells(report.codeSmells),
      projectHealth: this.calculateProjectHealth(report),
      qualityTrends: this.calculateQualityTrends(report.modules),
    };
  }

  /**
   * Format statistics for display
   */
  static formatStatistic(
    value: number,
    type: 'percentage' | 'decimal' | 'hours' | 'count'
  ): string {
    switch (type) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'decimal':
        return value.toFixed(1);
      case 'hours':
        return `${value.toFixed(0)}h`;
      case 'count':
        return value.toLocaleString();
      default:
        return value.toString();
    }
  }

  /**
   * Get priority color class for UI styling
   */
  static getPriorityColorClass(priority: string): string {
    switch (priority) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  }

  /**
   * Get quality score color class for UI styling
   */
  static getQualityColorClass(score: number): string {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  }

  /**
   * Get coverage color class for UI styling
   */
  static getCoverageColorClass(coverage: number): string {
    if (coverage >= 80) return 'text-green-600';
    if (coverage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  }
}

/**
 * Helper functions for module analysis display
 */
export const ModuleDisplayHelpers = {
  /**
   * Get icon for module type
   */
  getModuleTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      component: '🧩',
      service: '⚙️',
      util: '🔧',
      page: '📄',
      layout: '📐',
      api: '🌐',
      test: '🧪',
      config: '⚙️',
      other: '📦',
    };
    return icons[type] || '📦';
  },

  /**
   * Get truncated module name for display
   */
  getTruncatedName(name: string, maxLength: number = 30): string {
    if (name.length <= maxLength) return name;
    return `${name.substring(0, maxLength - 3)}...`;
  },

  /**
   * Get relative file path for display
   */
  getRelativeFilePath(filePath: string, basePath: string = 'src/'): string {
    const index = filePath.indexOf(basePath);
    return index >= 0 ? filePath.substring(index + basePath.length) : filePath;
  },

  /**
   * Format module description
   */
  formatDescription(description: string, maxLength: number = 100): string {
    if (!description) return 'No description available';
    if (description.length <= maxLength) return description;
    return `${description.substring(0, maxLength - 3)}...`;
  },
};

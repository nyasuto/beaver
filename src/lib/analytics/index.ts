/**
 * Analytics Module Index
 *
 * This module exports all analytics functionality for the Beaver Astro application.
 * It provides data analysis, classification, and insight generation capabilities.
 *
 * @module Analytics
 */

// Core analytics exports
export { IssueClassifier } from './classifier';
export { AnalyticsEngine } from './engine';
export { ConfigLoader, defaultConfigLoader, loadClassificationConfig } from './config';

// Import for local use
import { IssueClassifier } from './classifier';
import { AnalyticsEngine } from './engine';
import { ConfigLoader } from './config';

// Type exports
export type { TimeSeriesPoint, TrendAnalysis, PerformanceMetrics, IssueInsights } from './engine';

// Schema exports
export type {
  PriorityLevel,
  IssueClassification,
  CategoryClassification,
  ClassificationRule,
  ClassificationConfig,
  ClassificationMetrics,
  BatchClassificationResult,
} from '../schemas/classification';

// Analytics configuration
export const ANALYTICS_CONFIG = {
  classification: {
    minConfidence: 0.7,
    maxCategories: 3,
    enableAutoClassification: true,
  },
  trends: {
    defaultTimeWindow: 30, // days
    minDataPoints: 5,
    smoothingFactor: 0.3,
  },
  metrics: {
    refreshInterval: 300000, // 5 minutes
    retentionPeriod: 90, // days
    aggregationLevel: 'daily',
  },
} as const;

// Classification categories - extended list
export const CLASSIFICATION_CATEGORIES = [
  'bug',
  'feature',
  'enhancement',
  'documentation',
  'question',
  'duplicate',
  'invalid',
  'wontfix',
  'help-wanted',
  'good-first-issue',
  'security',
  'performance',
  'refactor',
  'test',
  'ci-cd',
  'dependencies',
] as const;

export type ClassificationCategory = (typeof CLASSIFICATION_CATEGORIES)[number];

/**
 * Analytics service factory
 * Creates a configured analytics service with all components
 */
export class AnalyticsService {
  public classifier: IssueClassifier;
  public engine: AnalyticsEngine;
  public configLoader: ConfigLoader;

  constructor(configPath?: string) {
    this.configLoader = new ConfigLoader(configPath);
    const config = this.configLoader.loadConfig();
    this.classifier = new IssueClassifier(config);
    this.engine = new AnalyticsEngine();
  }

  /**
   * Reload configuration and update classifier
   */
  reloadConfig(): void {
    this.configLoader.clearCache();
    const config = this.configLoader.loadConfig();
    this.classifier.updateConfig(config);
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return this.classifier.getConfig();
  }
}

/**
 * Create default analytics service
 */
export function createAnalyticsService(configPath?: string): AnalyticsService {
  return new AnalyticsService(configPath);
}

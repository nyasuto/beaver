/**
 * Analytics Module Index
 *
 * This module exports all analytics functionality for the Beaver Astro application.
 * It provides data analysis, classification, and insight generation capabilities.
 *
 * @module Analytics
 */

// Analytics modules will be exported here
// Example exports (to be implemented):
// export { IssueClassifier } from './classifier';
// export { TrendAnalyzer } from './trends';
// export { MetricsCalculator } from './metrics';
// export { InsightGenerator } from './insights';
// export { DataProcessor } from './processor';

// Analytics configuration
export const ANALYTICS_CONFIG = {
  classification: {
    minConfidence: 0.7,
    maxCategories: 10,
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

// Classification categories
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
] as const;

export type ClassificationCategory = (typeof CLASSIFICATION_CATEGORIES)[number];

/**
 * TypeScript Type Definitions Index
 *
 * This module exports all TypeScript type definitions for the Beaver Astro application.
 * It provides comprehensive type safety across the entire application.
 *
 * @module TypeDefinitions
 */

// Type definitions will be exported here
// Example exports (to be implemented):
// export type { GitHubIssue, GitHubPullRequest, GitHubCommit } from './github';
// export type { BeaverConfig, ClassificationRule, CategoryMapping } from './config';
// export type { AnalyticsData, Metrics, InsightData } from './analytics';
// export type { UIComponentProps, ChartData, NavigationItem } from './ui';
// export type { APIResponse, ErrorResponse, PaginatedResponse } from './api';

// Version info type
export type VersionInfo = {
  version: string;
  timestamp: number;
  buildId: string;
  gitCommit: string;
  environment: 'development' | 'production' | 'staging';
  dataHash?: string;
};

// Common utility types
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type NonEmptyArray<T> = [T, ...T[]];

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

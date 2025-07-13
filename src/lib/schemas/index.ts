/**
 * Zod Validation Schemas Index
 *
 * This module exports all Zod validation schemas for the Beaver Astro application.
 * It provides runtime type validation and ensures data integrity throughout the system.
 *
 * @module ValidationSchemas
 */

import { z } from 'zod';

// Common schemas
export const IdSchema = z.number().int().positive();
export const TimestampSchema = z.string().datetime();
export const UrlSchema = z.string().url();
export const EmailSchema = z.string().email();
export const NonEmptyStringSchema = z.string().min(1);

// Version schema for version.json
export const VersionInfoSchema = z.object({
  version: z.string().min(1, 'Version must not be empty'),
  timestamp: z.number().int().positive('Timestamp must be a positive integer'),
  buildId: z.string().min(1, 'Build ID must not be empty'),
  gitCommit: z.string().min(1, 'Git commit hash must not be empty'),
  environment: z.enum(['development', 'production', 'staging']),
  dataHash: z.string().optional(),
});

// Pagination schema
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(30),
  total: z.number().int().min(0).optional(),
  total_pages: z.number().int().min(0).optional(),
});

// Error schema
export const ErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

// API Response schema
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: ErrorSchema.optional(),
    pagination: PaginationSchema.optional(),
  });

// Configuration schemas
export * from './config';
export type {
  BeaverConfig,
  GitHubConfig as GitHubConfigType,
  SiteConfig,
  AnalyticsConfig,
  AIConfig,
  PerformanceConfig,
  SecurityConfig,
  NotificationConfig,
  UserPreferences,
  Environment,
} from './config';

// Classification schemas
export {
  ClassificationCategorySchema,
  PriorityLevelSchema,
  ConfidenceScoreSchema,
  CategoryClassificationSchema,
  IssueClassificationSchema,
  ClassificationRuleSchema,
  BatchClassificationResultSchema,
  ClassificationConfigSchema,
  ClassificationMetricsSchema,
  RepositoryConfigSchema,
  ScoringAlgorithmSchema,
  ConfidenceThresholdSchema,
  PriorityEstimationConfigSchema,
  EnhancedClassificationConfigSchema,
  EnhancedIssueClassificationSchema,
  ConfigurationProfileSchema,
  ConfigurationUpdateSchema,
  ABTestConfigSchema,
  PerformanceConfigSchema as EnhancedPerformanceConfigSchema,
  validateEnhancedConfig,
  validateConfigurationProfile,
  validateConfigurationUpdate,
  DEFAULT_ENHANCED_CONFIG,
} from './classification';
export type {
  ClassificationCategory,
  PriorityLevel,
  IssueClassification,
  CategoryClassification,
  ClassificationRule,
  ClassificationConfig,
  ClassificationMetrics,
  BatchClassificationResult,
} from './classification';

// Enhanced Classification types (already exported above with schemas)
export type {
  EnhancedClassificationConfig,
  EnhancedIssueClassification,
  RepositoryConfig,
  ScoringAlgorithm,
  ConfidenceThreshold,
  PriorityEstimationConfig,
  PerformanceConfig as EnhancedPerformanceConfig,
  ABTestConfig,
  ConfigurationProfile,
  ConfigurationUpdate,
} from './classification';

// UI component schemas
export * from './ui';
export type {
  BaseUIProps,
  ColorScheme,
  ThemeConfig,
  ButtonProps,
  CardProps,
  InputProps,
  ModalProps,
  NavigationItem,
  LayoutConfig,
  ChartConfig,
  ChartData,
  PaginationControls,
  Toast,
  FormValidation,
} from './ui';

// API response schemas
export * from './api';
export type {
  BaseAPIResponse,
  ErrorDetails,
  ErrorAPIResponse,
  PaginationMeta,
  HealthCheckResponse,
  RateLimit,
  APIRequest,
  APIResponseValidation,
  ValidationError as APIValidationError,
  BatchOperationResponse,
  FileUploadResponse,
  HTTPStatus,
  APIEndpoint,
} from './api';

// Data processing schemas
export * from './processing';
export type {
  FilterOperator,
  FilterCondition,
  FilterGroup,
  SortConfig,
  DataProcessingOptions,
  IssueProcessingOptions,
  DataTransformation,
  DataPipeline,
  DataValidationRule,
  DataQualityAssessment,
  DataExportConfig,
  DataImportConfig,
  ProcessingResult,
} from './processing';

// GitHub schemas (consolidated)
export {
  GitHubWebhookEventSchema,
  GitHubAppInstallationSchema,
  GitHubRateLimitSchema,
  GitHubIssueSearchResultSchema,
  GitHubRepositorySearchResultSchema,
  GitHubAPIErrorSchema,
  GitHubCheckRunSchema,
  GitHubDeploymentSchema,
  GitHubReleaseSchema,
  GitHubOrganizationSchema,
  GITHUB_API_CONSTANTS,
} from './github';
export type {
  GitHubWebhookEvent,
  GitHubAppInstallation,
  GitHubRateLimit,
  GitHubIssueSearchResult,
  GitHubRepositorySearchResult,
  GitHubAPIError,
  GitHubCheckRun,
  GitHubDeployment,
  GitHubRelease,
  GitHubOrganization,
} from './github';
// Re-export from base GitHub modules (avoiding conflicts)
export {
  GitHubClient,
  GitHubError,
  createGitHubClient,
  type GitHubConfig as GitHubClientConfig,
  type GitHubAppConfig,
} from '../github/client';
export {
  IssueSchema,
  LabelSchema,
  UserSchema,
  MilestoneSchema,
  IssuesQuerySchema,
  CreateIssueSchema,
  UpdateIssueSchema,
  IssueState,
  IssueSort,
  IssueDirection,
  GitHubIssuesService,
  type Issue,
  type Label,
  type User,
  type Milestone,
  type IssuesQuery,
  type CreateIssueParams,
  type UpdateIssueParams,
  type IssueState as IssueStateType,
  type IssueSort as IssueSortType,
  type IssueDirection as IssueDirectionType,
} from '../github/issues';
export {
  RepositorySchema,
  CommitSchema,
  CommitsQuerySchema,
  RepositoryStatsSchema,
  GitHubRepositoryService,
  type Repository,
  type Commit,
  type CommitsQuery,
  type RepositoryStats,
} from '../github/repository';
export {
  createGitHubServices,
  createGitHubServicesFromEnv,
  GITHUB_API_CONFIG,
  RATE_LIMIT_CONFIG,
} from '../github';
// GitHub helper functions

// Validation utilities
export * from './validation';
export type { ValidationResult } from './validation';
export { ValidationError } from './validation';

// Legacy type exports for backward compatibility
export type Pagination = z.infer<typeof PaginationSchema>;
export type ApiError = z.infer<typeof ErrorSchema>;
export type ApiResponse<T> = z.infer<ReturnType<typeof ApiResponseSchema<z.ZodType<T>>>>;

// Common validation helpers
export { validateData, validateDataOrThrow } from './validation';
export { validateConfig, createDefaultConfig, parseEnvironment } from './config';
export { validateUIProps, createDefaultTheme, generateUIId } from './ui';
export { validateAPIResponse, createSuccessResponse, createErrorResponse } from './api';
export { validateProcessingData, applyFilters, createDefaultProcessingOptions } from './processing';
export { validateGitHubData, createGitHubResponse, parseGitHubPagination } from './github';

// Schema collections for easy access
export const ConfigSchemas = {
  BeaverConfig: () => import('./config').then(m => m.BeaverConfigSchema),
  GitHubConfig: () => import('./config').then(m => m.GitHubConfigSchema),
  Environment: () => import('./config').then(m => m.EnvironmentSchema),
} as const;

export const UISchemas = {
  ThemeConfig: () => import('./ui').then(m => m.ThemeConfigSchema),
  ButtonProps: () => import('./ui').then(m => m.ButtonPropsSchema),
  CardProps: () => import('./ui').then(m => m.CardPropsSchema),
  InputProps: () => import('./ui').then(m => m.InputPropsSchema),
  ModalProps: () => import('./ui').then(m => m.ModalPropsSchema),
} as const;

export const APISchemas = {
  SuccessResponse: () => import('./api').then(m => m.SuccessAPIResponseSchema),
  ErrorResponse: () => import('./api').then(m => m.ErrorAPIResponseSchema),
  PaginatedResponse: () => import('./api').then(m => m.PaginatedAPIResponseSchema),
  HealthCheck: () => import('./api').then(m => m.HealthCheckResponseSchema),
} as const;

export const ProcessingSchemas = {
  FilterGroup: () => import('./processing').then(m => m.FilterGroupSchema),
  DataPipeline: () => import('./processing').then(m => m.DataPipelineSchema),
  ProcessingResult: () => import('./processing').then(m => m.ProcessingResultSchema),
  DataCategory: () => import('./processing').then(m => m.DataCategorySchema),
} as const;

export const GitHubSchemas = {
  Issue: () => import('./github').then(m => m.IssueSchema),
  Repository: () => import('./github').then(m => m.RepositorySchema),
  Commit: () => import('./github').then(m => m.CommitSchema),
  WebhookEvent: () => import('./github').then(m => m.GitHubWebhookEventSchema),
} as const;

// Validation constants
export const VALIDATION_CONSTANTS = {
  MAX_STRING_LENGTH: 1000,
  MAX_ARRAY_LENGTH: 100,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_PAGINATION_LIMIT: 100,
  DEFAULT_PAGINATION_LIMIT: 30,
  MAX_SEARCH_RESULTS: 1000,
  MAX_BATCH_SIZE: 1000,
} as const;

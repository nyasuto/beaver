/**
 * Zod Validation Schemas Index
 *
 * This module exports all Zod validation schemas for the Beaver Astro application.
 * It provides runtime type validation and ensures data integrity.
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
  details: z.record(z.unknown()).optional(),
});

// API Response schema
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: ErrorSchema.optional(),
    pagination: PaginationSchema.optional(),
  });

// Validation schemas will be exported here
// Example exports (to be implemented):
// export { GitHubIssueSchema, GitHubPullRequestSchema } from './github';
// export { BeaverConfigSchema, ClassificationRuleSchema } from './config';
// export { AnalyticsDataSchema, MetricsSchema } from './analytics';

export type Pagination = z.infer<typeof PaginationSchema>;
export type ApiError = z.infer<typeof ErrorSchema>;
export type ApiResponse<T> = z.infer<ReturnType<typeof ApiResponseSchema<z.ZodType<T>>>>;

/**
 * Configuration Schemas
 *
 * Zod schemas for application configuration, user settings, and runtime validation.
 * These schemas ensure type safety and runtime validation for all configuration data.
 */

import { z } from 'zod';

/**
 * Base configuration schema for validation helpers
 */
export const BaseConfigSchema = z.object({
  enabled: z.boolean().default(true),
  debug: z.boolean().default(false),
});

/**
 * GitHub configuration schema for repository integration
 */
export const GitHubConfigSchema = z.object({
  owner: z.string().min(1, 'GitHub owner is required'),
  repo: z.string().min(1, 'Repository name is required'),
  token: z.string().min(1, 'GitHub token is required'),
  baseUrl: z.string().url().default('https://api.github.com'),
  userAgent: z.string().default('beaver-astro/1.0.0'),
  timeout: z.number().int().min(1000).max(60000).default(30000),
  rateLimitBuffer: z.number().int().min(0).max(1000).default(100),
});

export type GitHubConfig = z.infer<typeof GitHubConfigSchema>;

/**
 * Site configuration schema for application metadata
 */
export const SiteConfigSchema = z.object({
  title: z.string().min(1, 'Site title is required'),
  description: z.string().min(1, 'Site description is required'),
  baseUrl: z.string().url('Base URL must be a valid URL'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be in semver format'),
  environment: z.enum(['development', 'staging', 'production']).default('development'),
  timezone: z.string().default('UTC'),
  locale: z.string().default('en-US'),
});

export type SiteConfig = z.infer<typeof SiteConfigSchema>;

/**
 * Analytics configuration schema for data collection and processing
 */
export const AnalyticsConfigSchema = z.object({
  enabled: z.boolean().default(true),
  trackingId: z.string().optional(),
  metricsCollection: z
    .array(z.string())
    .default(['issues', 'commits', 'pull_requests', 'contributors', 'labels', 'milestones']),
  retentionDays: z.number().int().min(1).max(365).default(30),
  aggregationInterval: z.enum(['hourly', 'daily', 'weekly']).default('daily'),
  enableRealTime: z.boolean().default(false),
  cacheTtl: z.number().int().min(60).max(86400).default(3600), // 1 hour
});

export type AnalyticsConfig = z.infer<typeof AnalyticsConfigSchema>;

/**
 * AI/ML configuration schema for classification and insights
 */
export const AIConfigSchema = z.object({
  enabled: z.boolean().default(true),
  classificationRules: z.string().min(1, 'Classification rules are required'),
  categoryMapping: z.string().min(1, 'Category mapping is required'),
  confidenceThreshold: z.number().min(0).max(1).default(0.7),
  autoClassification: z.boolean().default(true),
  learningEnabled: z.boolean().default(false),
  modelVersion: z.string().default('v1.0.0'),
});

export type AIConfig = z.infer<typeof AIConfigSchema>;

/**
 * Performance configuration schema for optimization settings
 */
export const PerformanceConfigSchema = z.object({
  cacheEnabled: z.boolean().default(true),
  cacheMaxAge: z.number().int().min(60).max(86400).default(3600),
  requestTimeout: z.number().int().min(1000).max(60000).default(30000),
  maxConcurrentRequests: z.number().int().min(1).max(100).default(10),
  rateLimitPerMinute: z.number().int().min(1).max(1000).default(60),
  enableCompression: z.boolean().default(true),
  enableCdn: z.boolean().default(false),
  preloadData: z.boolean().default(true),
});

export type PerformanceConfig = z.infer<typeof PerformanceConfigSchema>;

/**
 * Security configuration schema for authentication and authorization
 */
export const SecurityConfigSchema = z.object({
  enableHttps: z.boolean().default(true),
  corsOrigins: z.array(z.string().url()).default([]),
  enableCsp: z.boolean().default(true),
  sessionTimeout: z.number().int().min(300).max(86400).default(3600), // 1 hour
  maxLoginAttempts: z.number().int().min(1).max(10).default(3),
  lockoutDuration: z.number().int().min(60).max(3600).default(300), // 5 minutes
  requireStrongPasswords: z.boolean().default(true),
  enableTwoFactor: z.boolean().default(false),
});

export type SecurityConfig = z.infer<typeof SecurityConfigSchema>;

/**
 * Notification configuration schema for user alerts and updates
 */
export const NotificationConfigSchema = z.object({
  enabled: z.boolean().default(true),
  channels: z.array(z.enum(['email', 'slack', 'webhook', 'browser'])).default(['browser']),
  emailConfig: z
    .object({
      smtpHost: z.string().optional(),
      smtpPort: z.number().int().min(1).max(65535).default(587),
      smtpSecure: z.boolean().default(true),
      fromAddress: z.string().email().optional(),
    })
    .optional(),
  slackConfig: z
    .object({
      webhookUrl: z.string().url().optional(),
      channel: z.string().optional(),
    })
    .optional(),
  frequency: z.enum(['immediate', 'hourly', 'daily', 'weekly']).default('immediate'),
  quietHours: z
    .object({
      enabled: z.boolean().default(false),
      startHour: z.number().int().min(0).max(23).default(22),
      endHour: z.number().int().min(0).max(23).default(8),
    })
    .default({ enabled: false, startHour: 22, endHour: 8 }),
});

export type NotificationConfig = z.infer<typeof NotificationConfigSchema>;

/**
 * User preferences schema for personalization
 */
export const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  language: z.string().default('en'),
  timezone: z.string().default('UTC'),
  dateFormat: z.enum(['ISO', 'US', 'EU']).default('ISO'),
  itemsPerPage: z.number().int().min(10).max(100).default(30),
  showAvatars: z.boolean().default(true),
  enableAnimations: z.boolean().default(true),
  compactMode: z.boolean().default(false),
  showTooltips: z.boolean().default(true),
  autoRefresh: z.boolean().default(true),
  refreshInterval: z.number().int().min(30).max(300).default(60), // seconds
});

export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

/**
 * Main Beaver application configuration schema
 */
export const BeaverConfigSchema = z.object({
  site: SiteConfigSchema,
  github: GitHubConfigSchema,
  analytics: AnalyticsConfigSchema,
  ai: AIConfigSchema,
  performance: PerformanceConfigSchema,
  security: SecurityConfigSchema,
  notifications: NotificationConfigSchema,
  userPreferences: UserPreferencesSchema,
});

export type BeaverConfig = z.infer<typeof BeaverConfigSchema>;

/**
 * Environment variables schema for runtime configuration
 */
export const EnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  GITHUB_TOKEN: z.string().min(1, 'GitHub token is required'),
  GITHUB_OWNER: z.string().min(1, 'GitHub owner is required'),
  GITHUB_REPO: z.string().min(1, 'GitHub repository is required'),
  GITHUB_BASE_URL: z.string().url().default('https://api.github.com'),
  GITHUB_USER_AGENT: z.string().default('beaver-astro/1.0.0'),
  SITE_URL: z.string().url().optional(),
  ANALYTICS_ENABLED: z.coerce.boolean().default(true),
  CACHE_TTL: z.coerce.number().int().min(60).max(86400).default(3600),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  ENABLE_CORS: z.coerce.boolean().default(true),
  CORS_ORIGINS: z.string().optional(),
});

export type Environment = z.infer<typeof EnvironmentSchema>;

/**
 * Validation helper for configuration objects
 */
export function validateConfig<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): {
  success: boolean;
  data?: T;
  errors?: z.ZodError;
} {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

/**
 * Create a configuration with default values
 */
export function createDefaultConfig(): BeaverConfig {
  return BeaverConfigSchema.parse({
    site: {},
    github: {
      owner: process.env['GITHUB_OWNER'] || '',
      repo: process.env['GITHUB_REPO'] || '',
      token: process.env['GITHUB_TOKEN'] || '',
    },
    analytics: {},
    ai: {
      classificationRules: 'Default classification rules',
      categoryMapping: 'Default category mapping',
    },
    performance: {},
    security: {},
    notifications: {},
    userPreferences: {},
  });
}

/**
 * Parse environment variables with validation
 */
export function parseEnvironment(): Environment {
  return EnvironmentSchema.parse(process.env);
}

/**
 * Configuration validation errors
 */
export class ConfigurationError extends Error {
  constructor(
    message: string,
    public errors?: z.ZodError
  ) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Validate and throw if configuration is invalid
 */
export function validateConfigOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = validateConfig(schema, data);
  if (!result.success) {
    throw new ConfigurationError('Configuration validation failed', result.errors);
  }
  return result.data as T;
}

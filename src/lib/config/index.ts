/**
 * Configuration Module Index
 *
 * This module exports all configuration functionality for the Beaver Astro application.
 * It handles environment variables, settings, and configuration management.
 *
 * @module Configuration
 */

// Configuration modules
export {
  EnvValidator,
  EnvValidationError,
  getEnvValidator,
  validateEnv,
  checkEnvHealth,
  type ValidatedEnv,
} from './env-validation';

// Environment configuration
export const ENV_CONFIG = {
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  isTest: import.meta.env.MODE === 'test',
  nodeEnv: import.meta.env['NODE_ENV'] || 'development',
} as const;

// Default configuration values
export const DEFAULT_CONFIG = {
  github: {
    baseUrl: 'https://api.github.com',
    timeout: 10000,
    retries: 3,
  },
  site: {
    title: 'Beaver Astro Edition',
    description: 'AI-first knowledge management system',
    baseUrl: `https://${process.env['GITHUB_OWNER'] || 'nyasuto'}.github.io${process.env['BASE_URL'] || '/beaver'}`,
  },
  analytics: {
    enabled: true,
    batchSize: 100,
    flushInterval: 5000,
  },
  ui: {
    theme: 'system' as 'light' | 'dark' | 'system',
    locale: 'en',
    dateFormat: 'YYYY-MM-DD',
  },
} as const;

// Configuration paths
export const CONFIG_PATHS = {
  classificationRules: 'config/classification-rules.yaml',
  categoryMapping: 'config/category-mapping.json',
  userSettings: '.beaver/settings.json',
} as const;

/**
 * Validation Helpers
 *
 * Common validation utilities, custom validators, and helper functions for Zod schemas.
 * These utilities provide consistent validation patterns across the application.
 */

import { z } from 'zod';

/**
 * Common validation patterns
 */
export const ValidationPatterns = {
  // Text patterns
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  username: /^[a-zA-Z0-9_-]{3,20}$/,
  hexColor: /^#[0-9A-F]{6}$/i,
  semver: /^\d+\.\d+\.\d+$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,

  // GitHub patterns
  githubUsername: /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/,
  githubRepo: /^[a-zA-Z0-9._-]+$/,
  githubToken: /^(ghp_|gho_|ghu_|ghs_|ghr_|github_pat_)[a-zA-Z0-9]{36,255}$/,

  // Network patterns
  ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  ipv6: /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
  port: /^([1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/,

  // Date patterns
  isoDate: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
  dateOnly: /^\d{4}-\d{2}-\d{2}$/,
  timeOnly: /^\d{2}:\d{2}:\d{2}$/,

  // File patterns
  filename: /^[a-zA-Z0-9._-]+$/,
  extension: /^\.[a-zA-Z0-9]+$/,
  mimeType: /^[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_.]*$/,
} as const;

/**
 * Custom Zod validators
 */
export const CustomValidators = {
  /**
   * Validate string is a valid slug
   */
  slug: () =>
    z
      .string()
      .regex(ValidationPatterns.slug, 'Must be a valid slug (lowercase, alphanumeric, hyphens)'),

  /**
   * Validate GitHub username
   */
  githubUsername: () =>
    z.string().regex(ValidationPatterns.githubUsername, 'Must be a valid GitHub username'),

  /**
   * Validate GitHub repository name
   */
  githubRepo: () =>
    z.string().regex(ValidationPatterns.githubRepo, 'Must be a valid GitHub repository name'),

  /**
   * Validate GitHub token
   */
  githubToken: () =>
    z.string().regex(ValidationPatterns.githubToken, 'Must be a valid GitHub token'),

  /**
   * Validate hex color
   */
  hexColor: () => z.string().regex(ValidationPatterns.hexColor, 'Must be a valid hex color'),

  /**
   * Validate semantic version
   */
  semver: () => z.string().regex(ValidationPatterns.semver, 'Must be a valid semantic version'),

  /**
   * Validate UUID
   */
  uuid: () => z.string().regex(ValidationPatterns.uuid, 'Must be a valid UUID'),

  /**
   * Validate port number
   */
  port: () =>
    z
      .number()
      .int()
      .min(1)
      .max(65535)
      .or(z.string().regex(ValidationPatterns.port).transform(Number)),

  /**
   * Validate IP address (v4 or v6)
   */
  ipAddress: () =>
    z
      .string()
      .refine(
        value => ValidationPatterns.ipv4.test(value) || ValidationPatterns.ipv6.test(value),
        'Must be a valid IP address'
      ),

  /**
   * Validate MIME type
   */
  mimeType: () => z.string().regex(ValidationPatterns.mimeType, 'Must be a valid MIME type'),

  /**
   * Validate file size (in bytes)
   */
  fileSize: (maxSize: number) =>
    z.number().int().min(0).max(maxSize, `File size must be less than ${maxSize} bytes`),

  /**
   * Validate date range
   */
  dateRange: () =>
    z
      .object({
        start: z.string().datetime(),
        end: z.string().datetime(),
      })
      .refine(
        data => new Date(data.start) <= new Date(data.end),
        'End date must be after start date'
      ),

  /**
   * Validate password strength
   */
  strongPassword: () =>
    z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),

  /**
   * Validate JSON string
   */
  jsonString: () =>
    z.string().refine(value => {
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    }, 'Must be a valid JSON string'),

  /**
   * Validate array has unique items
   */
  uniqueArray: <T>(itemSchema: z.ZodSchema<T>) =>
    z
      .array(itemSchema)
      .refine(arr => new Set(arr).size === arr.length, 'Array must contain unique items'),

  /**
   * Validate string is not empty when trimmed
   */
  nonEmptyString: () => z.string().trim().min(1, 'String cannot be empty'),

  /**
   * Validate cron expression
   */
  cronExpression: () =>
    z
      .string()
      .regex(
        /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/,
        'Must be a valid cron expression'
      ),

  /**
   * Validate timezone
   */
  timezone: () =>
    z.string().refine(value => {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }, 'Must be a valid timezone'),

  /**
   * Validate domain name
   */
  domain: () =>
    z
      .string()
      .regex(
        /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/,
        'Must be a valid domain name'
      ),

  /**
   * Validate percentage (0-100)
   */
  percentage: () => z.number().min(0).max(100),

  /**
   * Validate positive integer
   */
  positiveInteger: () => z.number().int().positive(),

  /**
   * Validate non-negative integer
   */
  nonNegativeInteger: () => z.number().int().min(0),
};

/**
 * Validation result type
 */
export type ValidationResult<T> = {
  success: boolean;
  data?: T;
  errors?: z.ZodError;
};

/**
 * Generic validation function
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
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
 * Validation function that throws on error
 */
export function validateDataOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = validateData(schema, data);
  if (!result.success) {
    throw new ValidationError('Validation failed', result.errors);
  }
  return result.data as T;
}

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public zodError?: z.ZodError
  ) {
    super(message);
    this.name = 'ValidationError';
  }

  get errors() {
    return this.zodError?.errors || [];
  }

  get fieldErrors() {
    if (!this.zodError) return {};

    const fieldErrors: Record<string, string[]> = {};
    for (const error of this.zodError.errors) {
      const field = error.path.join('.');
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field].push(error.message);
    }
    return fieldErrors;
  }
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: z.ZodError): string[] {
  return errors.errors.map(error => {
    const field = error.path.join('.');
    return field ? `${field}: ${error.message}` : error.message;
  });
}

/**
 * Create a validation schema with custom error messages
 */
export function createValidationSchema<T>(
  schema: z.ZodSchema<T>,
  _errorMessages: Record<string, string>
): z.ZodSchema<T> {
  return schema.refine(() => true, {
    message: 'Validation failed',
    path: [],
  });
}

/**
 * Conditional validation based on another field
 */
export function conditionalValidation<T>(
  condition: (data: T) => boolean,
  schema: z.ZodSchema<unknown>
) {
  return z.unknown().superRefine((value: unknown, ctx: z.RefinementCtx): void => {
    if (condition(ctx.path[0] as T)) {
      const result = schema.safeParse(value);
      if (!result.success) {
        result.error.errors.forEach(error => {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: error.message,
            path: error.path,
          });
        });
      }
    }
  });
}

/**
 * Async validation helper
 */
export async function validateAsync<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  asyncValidators: Array<(data: T) => Promise<boolean | string>> = []
): Promise<ValidationResult<T>> {
  // First, run synchronous validation
  const syncResult = validateData(schema, data);
  if (!syncResult.success) {
    return syncResult;
  }

  // Then run async validators
  try {
    for (const validator of asyncValidators) {
      const result = await validator(syncResult.data as T);
      if (result !== true) {
        return {
          success: false,
          errors: new z.ZodError([
            {
              code: z.ZodIssueCode.custom,
              message: typeof result === 'string' ? result : 'Async validation failed',
              path: [],
            },
          ]),
        };
      }
    }

    return syncResult;
  } catch (error) {
    return {
      success: false,
      errors: new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          message: error instanceof Error ? error.message : 'Async validation error',
          path: [],
        },
      ]),
    };
  }
}

/**
 * Sanitize input data before validation
 */
export function sanitizeInput(data: unknown): unknown {
  if (typeof data === 'string') {
    return data.trim();
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeInput);
  }

  if (data && typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  return data;
}

/**
 * Common validation presets
 */
export const ValidationPresets = {
  /**
   * Basic user input validation
   */
  userInput: z.object({
    name: CustomValidators.nonEmptyString().max(100),
    email: z.string().email(),
    age: z.number().int().min(0).max(150).optional(),
  }),

  /**
   * API key validation
   */
  apiKey: z.object({
    key: z.string().min(32).max(128),
    name: CustomValidators.nonEmptyString().max(50),
    permissions: z.array(z.string()).default([]),
    expiresAt: z.string().datetime().optional(),
  }),

  /**
   * File metadata validation
   */
  fileMetadata: z.object({
    name: z.string().min(1).max(255),
    size: z.number().int().min(0),
    type: CustomValidators.mimeType(),
    lastModified: z.number().int().min(0),
    checksum: z.string().optional(),
  }),

  /**
   * GitHub configuration validation
   */
  githubConfig: z.object({
    username: CustomValidators.githubUsername(),
    repository: CustomValidators.githubRepo(),
    token: CustomValidators.githubToken(),
    branch: z.string().default('main'),
  }),

  /**
   * Database connection validation
   */
  databaseConfig: z.object({
    host: z.string().min(1),
    port: CustomValidators.port(),
    database: z.string().min(1),
    username: z.string().min(1),
    password: z.string().min(1),
    ssl: z.boolean().default(false),
    timeout: z.number().int().min(1000).default(30000),
  }),
} as const;

/**
 * Validation middleware for API routes
 */
export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => {
    const result = validateData(schema, sanitizeInput(data));
    if (!result.success) {
      throw new ValidationError('Validation failed', result.errors);
    }
    return result.data as T;
  };
}

/**
 * Batch validation for multiple items
 */
export function validateBatch<T>(
  schema: z.ZodSchema<T>,
  items: unknown[]
): {
  success: boolean;
  results: Array<ValidationResult<T>>;
  validItems: T[];
  errors: z.ZodError[];
} {
  const results = items.map(item => validateData(schema, item));
  const validItems = results.filter(r => r.success).map(r => r.data as T);
  const errors = results.filter(r => !r.success).map(r => r.errors as z.ZodError);

  return {
    success: errors.length === 0,
    results,
    validItems,
    errors,
  };
}

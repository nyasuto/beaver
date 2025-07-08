/**
 * API Response Schemas
 *
 * Zod schemas for API responses, error handling, and request/response validation.
 * These schemas ensure consistent API contract and type safety.
 */

import { z } from 'zod';

/**
 * Base API response schema
 */
export const BaseAPIResponseSchema = z.object({
  success: z.boolean(),
  timestamp: z.string().datetime().optional(),
  requestId: z.string().optional(),
});

export type BaseAPIResponse = z.infer<typeof BaseAPIResponseSchema>;

/**
 * Success API response schema
 */
export const SuccessAPIResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  BaseAPIResponseSchema.extend({
    success: z.literal(true),
    data: dataSchema,
    meta: z
      .object({
        version: z.string().optional(),
        source: z.string().optional(),
        cached: z.boolean().optional(),
        cacheExpiresAt: z.string().datetime().optional(),
        processingTime: z.number().optional(),
      })
      .optional(),
  });

/**
 * Error details schema
 */
export const ErrorDetailsSchema = z.object({
  code: z.string().min(1, 'Error code is required'),
  message: z.string().min(1, 'Error message is required'),
  details: z.string().optional(),
  field: z.string().optional(),
  value: z.any().optional(),
  suggestion: z.string().optional(),
});

export type ErrorDetails = z.infer<typeof ErrorDetailsSchema>;

/**
 * Error API response schema
 */
export const ErrorAPIResponseSchema = BaseAPIResponseSchema.extend({
  success: z.literal(false),
  error: ErrorDetailsSchema,
  errors: z.array(ErrorDetailsSchema).optional(),
  meta: z
    .object({
      requestId: z.string().optional(),
      timestamp: z.string().datetime().optional(),
      path: z.string().optional(),
      method: z.string().optional(),
      userAgent: z.string().optional(),
      ip: z.string().optional(),
    })
    .optional(),
});

export type ErrorAPIResponse = z.infer<typeof ErrorAPIResponseSchema>;

/**
 * Generic API response schema
 */
export const APIResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.union([SuccessAPIResponseSchema(dataSchema), ErrorAPIResponseSchema]);

/**
 * Pagination metadata schema
 */
export const PaginationMetaSchema = z.object({
  currentPage: z.number().int().min(1),
  totalPages: z.number().int().min(1),
  totalItems: z.number().int().min(0),
  itemsPerPage: z.number().int().min(1).max(100),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
  nextPage: z.number().int().min(1).optional(),
  previousPage: z.number().int().min(1).optional(),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

/**
 * Paginated API response schema
 */
export const PaginatedAPIResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  BaseAPIResponseSchema.extend({
    success: z.literal(true),
    data: z.array(itemSchema),
    pagination: PaginationMetaSchema,
    meta: z
      .object({
        totalCount: z.number().int().min(0),
        filteredCount: z.number().int().min(0),
        query: z.record(z.unknown()).optional(),
        sort: z
          .object({
            field: z.string(),
            direction: z.enum(['asc', 'desc']),
          })
          .optional(),
        filters: z.record(z.unknown()).optional(),
      })
      .optional(),
  });

/**
 * Health check response schema
 */
export const HealthCheckResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  version: z.string(),
  timestamp: z.string().datetime(),
  uptime: z.number().int().min(0),
  environment: z.string(),
  checks: z.record(
    z.object({
      status: z.enum(['pass', 'fail', 'warn']),
      message: z.string().optional(),
      timestamp: z.string().datetime(),
      duration: z.number().optional(),
      details: z.record(z.unknown()).optional(),
    })
  ),
  dependencies: z
    .record(
      z.object({
        status: z.enum(['connected', 'disconnected', 'error']),
        responseTime: z.number().optional(),
        version: z.string().optional(),
        lastChecked: z.string().datetime(),
      })
    )
    .optional(),
  metrics: z
    .object({
      memoryUsage: z.number().optional(),
      cpuUsage: z.number().optional(),
      requestCount: z.number().int().optional(),
      errorRate: z.number().optional(),
    })
    .optional(),
});

export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;

/**
 * Rate limit information schema
 */
export const RateLimitSchema = z.object({
  limit: z.number().int().min(1),
  remaining: z.number().int().min(0),
  reset: z.number().int().min(0),
  resetTime: z.string().datetime(),
  windowMs: z.number().int().min(1000),
  retryAfter: z.number().int().optional(),
});

export type RateLimit = z.infer<typeof RateLimitSchema>;

/**
 * API request schema for validation
 */
export const APIRequestSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
  url: z.string().url(),
  headers: z.record(z.string()).optional(),
  query: z.record(z.union([z.string(), z.array(z.string())])).optional(),
  body: z.any().optional(),
  timestamp: z.string().datetime(),
  requestId: z.string().uuid(),
  userAgent: z.string().optional(),
  ip: z.string().optional(),
  userId: z.string().optional(),
});

export type APIRequest = z.infer<typeof APIRequestSchema>;

/**
 * API response validation schema
 */
export const APIResponseValidationSchema = z.object({
  status: z.number().int().min(100).max(599),
  headers: z.record(z.string()).optional(),
  body: z.any().optional(),
  timestamp: z.string().datetime(),
  requestId: z.string().uuid(),
  duration: z.number().min(0),
  cached: z.boolean().default(false),
  size: z.number().int().min(0).optional(),
});

export type APIResponseValidation = z.infer<typeof APIResponseValidationSchema>;

/**
 * Validation error schema for form and input validation
 */
export const ValidationErrorSchema = z.object({
  field: z.string().min(1, 'Field is required'),
  code: z.string().min(1, 'Error code is required'),
  message: z.string().min(1, 'Error message is required'),
  value: z.any().optional(),
  expected: z.string().optional(),
  path: z.array(z.union([z.string(), z.number()])).optional(),
});

export type ValidationError = z.infer<typeof ValidationErrorSchema>;

/**
 * Batch operation response schema
 */
export const BatchOperationResponseSchema = z.object({
  success: z.boolean(),
  total: z.number().int().min(0),
  processed: z.number().int().min(0),
  successful: z.number().int().min(0),
  failed: z.number().int().min(0),
  results: z.array(
    z.object({
      id: z.string(),
      success: z.boolean(),
      data: z.any().optional(),
      error: ErrorDetailsSchema.optional(),
    })
  ),
  errors: z.array(ErrorDetailsSchema).optional(),
  meta: z.object({
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    duration: z.number().min(0),
    batchId: z.string().uuid(),
  }),
});

export type BatchOperationResponse = z.infer<typeof BatchOperationResponseSchema>;

/**
 * Search response schema
 */
export const SearchResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    query: z.string().min(1, 'Query is required'),
    results: z.array(
      z.object({
        item: itemSchema,
        score: z.number().min(0).max(1),
        highlights: z
          .array(
            z.object({
              field: z.string(),
              matches: z.array(z.string()),
            })
          )
          .optional(),
      })
    ),
    pagination: PaginationMetaSchema,
    facets: z
      .record(
        z.array(
          z.object({
            value: z.string(),
            count: z.number().int().min(0),
          })
        )
      )
      .optional(),
    suggestions: z.array(z.string()).optional(),
    meta: z.object({
      totalResults: z.number().int().min(0),
      searchTime: z.number().min(0),
      exactMatch: z.boolean(),
      fuzzyMatch: z.boolean(),
      filters: z.record(z.unknown()).optional(),
    }),
  });

/**
 * File upload response schema
 */
export const FileUploadResponseSchema = z.object({
  success: z.boolean(),
  file: z.object({
    id: z.string().uuid(),
    name: z.string().min(1, 'Filename is required'),
    originalName: z.string().min(1, 'Original filename is required'),
    size: z.number().int().min(0),
    type: z.string().min(1, 'File type is required'),
    extension: z.string().min(1, 'File extension is required'),
    url: z.string().url(),
    thumbnailUrl: z.string().url().optional(),
    uploadedAt: z.string().datetime(),
    expiresAt: z.string().datetime().optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
  error: ErrorDetailsSchema.optional(),
});

export type FileUploadResponse = z.infer<typeof FileUploadResponseSchema>;

/**
 * Common HTTP status codes
 */
export const HTTPStatusSchema = z.enum([
  '200',
  '201',
  '202',
  '204', // Success
  '400',
  '401',
  '403',
  '404',
  '405',
  '409',
  '422',
  '429', // Client errors
  '500',
  '502',
  '503',
  '504', // Server errors
]);

export type HTTPStatus = z.infer<typeof HTTPStatusSchema>;

/**
 * API endpoint configuration schema
 */
export const APIEndpointSchema = z.object({
  path: z.string().min(1, 'Path is required'),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  deprecated: z.boolean().default(false),
  auth: z
    .object({
      required: z.boolean().default(false),
      type: z.enum(['bearer', 'apiKey', 'basic', 'oauth2']).optional(),
      scope: z.array(z.string()).optional(),
    })
    .optional(),
  rateLimit: z
    .object({
      requests: z.number().int().min(1),
      windowMs: z.number().int().min(1000),
    })
    .optional(),
  validation: z
    .object({
      headers: z.record(z.unknown()).optional(),
      query: z.record(z.unknown()).optional(),
      body: z.unknown().optional(),
    })
    .optional(),
  response: z
    .object({
      schema: z.unknown(),
      examples: z.array(z.unknown()).optional(),
    })
    .optional(),
});

export type APIEndpoint = z.infer<typeof APIEndpointSchema>;

/**
 * Create a success response
 */
export function createSuccessResponse<T>(
  data: T,
  meta?: Record<string, unknown>
): z.infer<ReturnType<typeof SuccessAPIResponseSchema>> {
  return {
    success: true,
    data,
    meta: {
      ...meta,
    },
  };
}

/**
 * Create an error response
 */
export function createErrorResponse(
  error: ErrorDetails,
  meta?: Record<string, unknown>
): ErrorAPIResponse {
  return {
    success: false,
    error,
    meta: {
      ...meta,
    },
  };
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationMeta,
  meta?: Record<string, unknown>
): z.infer<ReturnType<typeof PaginatedAPIResponseSchema>> {
  return {
    success: true,
    data,
    pagination,
    meta: {
      totalCount: 0,
      filteredCount: 0,
      ...meta,
    },
  };
}

/**
 * Validate API response
 */
export function validateAPIResponse<T>(
  schema: z.ZodSchema<T>,
  response: unknown
): {
  success: boolean;
  data?: T;
  errors?: z.ZodError;
} {
  try {
    const result = schema.parse(response);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

/**
 * HTTP error status codes with descriptions
 */
export const HTTP_STATUS_CODES = {
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  204: 'No Content',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
} as const;

/**
 * Common error codes
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TIMEOUT: 'TIMEOUT',
  GITHUB_API_ERROR: 'GITHUB_API_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
} as const;

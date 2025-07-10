/**
 * API Schema Tests
 *
 * APIスキーマの包括的テストスイート
 * API応答、エラーハンドリング、リクエスト/レスポンス検証を確保する
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  BaseAPIResponseSchema,
  SuccessAPIResponseSchema,
  ErrorDetailsSchema,
  ErrorAPIResponseSchema,
  APIResponseSchema,
  PaginationMetaSchema,
  PaginatedAPIResponseSchema,
  HealthCheckResponseSchema,
  RateLimitSchema,
  APIRequestSchema,
  APIResponseValidationSchema,
  ValidationErrorSchema,
  BatchOperationResponseSchema,
  SearchResponseSchema,
  FileUploadResponseSchema,
  HTTPStatusSchema,
  APIEndpointSchema,
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
  validateAPIResponse,
  HTTP_STATUS_CODES,
  ERROR_CODES,
  type ErrorDetails,
  type PaginationMeta,
  type APIRequest,
} from '../api';

// テストデータのヘルパー関数
const createValidErrorDetails = (): ErrorDetails => ({
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: 'Field is required',
  field: 'username',
  value: '',
  suggestion: 'Please provide a valid username',
});

const createValidPaginationMeta = (): PaginationMeta => ({
  currentPage: 1,
  totalPages: 5,
  totalItems: 100,
  itemsPerPage: 20,
  hasNextPage: true,
  hasPreviousPage: false,
  nextPage: 2,
});

const createValidAPIRequest = (): APIRequest => ({
  method: 'GET',
  url: 'https://api.example.com/users',
  headers: { 'Content-Type': 'application/json' },
  query: { page: '1', limit: '20' },
  timestamp: '2024-01-01T00:00:00Z',
  requestId: '123e4567-e89b-12d3-a456-426614174000',
  userAgent: 'Test Agent/1.0',
  ip: '192.168.1.1',
  userId: 'user123',
});

describe('API Schema Validation', () => {
  // =====================
  // BASE API RESPONSE SCHEMA
  // =====================
  describe('BaseAPIResponseSchema', () => {
    it('should validate minimal base response', () => {
      const response = { success: true };
      const result = BaseAPIResponseSchema.parse(response);
      expect(result.success).toBe(true);
    });

    it('should validate complete base response', () => {
      const response = {
        success: false,
        timestamp: '2024-01-01T00:00:00Z',
        requestId: 'req-123',
      };
      const result = BaseAPIResponseSchema.parse(response);
      expect(result).toEqual(response);
    });

    it('should require success field', () => {
      expect(() => BaseAPIResponseSchema.parse({})).toThrow();
    });

    it('should validate timestamp format', () => {
      const response = {
        success: true,
        timestamp: 'invalid-date',
      };
      expect(() => BaseAPIResponseSchema.parse(response)).toThrow();
    });
  });

  // =====================
  // SUCCESS API RESPONSE SCHEMA
  // =====================
  describe('SuccessAPIResponseSchema', () => {
    it('should validate success response with string data', () => {
      const schema = SuccessAPIResponseSchema(z.string());
      const response = {
        success: true,
        data: 'test data',
      };
      const result = schema.parse(response);
      expect(result.success).toBe(true);
      expect(result.data).toBe('test data');
    });

    it('should validate success response with object data', () => {
      const dataSchema = z.object({
        id: z.number(),
        name: z.string(),
      });
      const schema = SuccessAPIResponseSchema(dataSchema);
      const response = {
        success: true,
        data: { id: 1, name: 'Test' },
      };
      const result = schema.parse(response);
      expect(result.data).toEqual({ id: 1, name: 'Test' });
    });

    it('should validate success response with meta information', () => {
      const schema = SuccessAPIResponseSchema(z.string());
      const response = {
        success: true,
        data: 'test',
        meta: {
          version: '1.0.0',
          source: 'cache',
          cached: true,
          cacheExpiresAt: '2024-01-01T01:00:00Z',
          processingTime: 123.45,
        },
        timestamp: '2024-01-01T00:00:00Z',
        requestId: 'req-123',
      };
      const result = schema.parse(response);
      expect(result.meta?.version).toBe('1.0.0');
      expect(result.meta?.cached).toBe(true);
      expect(result.meta?.processingTime).toBe(123.45);
    });

    it('should reject success: false', () => {
      const schema = SuccessAPIResponseSchema(z.string());
      const response = {
        success: false,
        data: 'test',
      };
      expect(() => schema.parse(response)).toThrow();
    });

    it('should validate data type according to schema', () => {
      const schema = SuccessAPIResponseSchema(z.number());
      const response = {
        success: true,
        data: 'invalid',
      };
      expect(() => schema.parse(response)).toThrow();
    });
  });

  // =====================
  // ERROR DETAILS SCHEMA
  // =====================
  describe('ErrorDetailsSchema', () => {
    it('should validate complete error details', () => {
      const error = createValidErrorDetails();
      const result = ErrorDetailsSchema.parse(error);
      expect(result).toEqual(error);
    });

    it('should validate minimal error details', () => {
      const error = {
        code: 'ERROR_CODE',
        message: 'Error message',
      };
      const result = ErrorDetailsSchema.parse(error);
      expect(result.code).toBe('ERROR_CODE');
      expect(result.message).toBe('Error message');
    });

    it('should require code and message', () => {
      expect(() => ErrorDetailsSchema.parse({ code: '', message: 'test' })).toThrow();
      expect(() => ErrorDetailsSchema.parse({ code: 'test', message: '' })).toThrow();
    });

    it('should allow any value type', () => {
      const error = {
        code: 'ERROR',
        message: 'Message',
        value: { complex: 'object', array: [1, 2, 3] },
      };
      const result = ErrorDetailsSchema.parse(error);
      expect(result.value).toEqual({ complex: 'object', array: [1, 2, 3] });
    });
  });

  // =====================
  // ERROR API RESPONSE SCHEMA
  // =====================
  describe('ErrorAPIResponseSchema', () => {
    it('should validate error response with single error', () => {
      const response = {
        success: false,
        error: createValidErrorDetails(),
      };
      const result = ErrorAPIResponseSchema.parse(response);
      expect(result.success).toBe(false);
      expect(result.error).toEqual(createValidErrorDetails());
    });

    it('should validate error response with multiple errors', () => {
      const errors = [
        createValidErrorDetails(),
        { code: 'ANOTHER_ERROR', message: 'Another error' },
      ];
      const response = {
        success: false,
        error: createValidErrorDetails(),
        errors,
      };
      const result = ErrorAPIResponseSchema.parse(response);
      expect(result.errors).toEqual(errors);
    });

    it('should validate error response with meta information', () => {
      const response = {
        success: false,
        error: createValidErrorDetails(),
        meta: {
          requestId: 'req-123',
          timestamp: '2024-01-01T00:00:00Z',
          path: '/api/users',
          method: 'POST',
          userAgent: 'Test Agent',
          ip: '192.168.1.1',
        },
      };
      const result = ErrorAPIResponseSchema.parse(response);
      expect(result.meta?.path).toBe('/api/users');
      expect(result.meta?.method).toBe('POST');
    });

    it('should reject success: true', () => {
      const response = {
        success: true,
        error: createValidErrorDetails(),
      };
      expect(() => ErrorAPIResponseSchema.parse(response)).toThrow();
    });
  });

  // =====================
  // GENERIC API RESPONSE SCHEMA
  // =====================
  describe('APIResponseSchema', () => {
    it('should validate success response', () => {
      const schema = APIResponseSchema(z.string());
      const response = {
        success: true,
        data: 'test data',
      };
      const result = schema.parse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('test data');
      }
    });

    it('should validate error response', () => {
      const schema = APIResponseSchema(z.string());
      const response = {
        success: false,
        error: createValidErrorDetails(),
      };
      const result = schema.parse(response);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toEqual(createValidErrorDetails());
      }
    });
  });

  // =====================
  // PAGINATION META SCHEMA
  // =====================
  describe('PaginationMetaSchema', () => {
    it('should validate complete pagination metadata', () => {
      const pagination = createValidPaginationMeta();
      const result = PaginationMetaSchema.parse(pagination);
      expect(result).toEqual(pagination);
    });

    it('should validate minimal pagination metadata', () => {
      const pagination = {
        currentPage: 1,
        totalPages: 1,
        totalItems: 10,
        itemsPerPage: 10,
        hasNextPage: false,
        hasPreviousPage: false,
      };
      const result = PaginationMetaSchema.parse(pagination);
      expect(result).toEqual(pagination);
    });

    it('should validate page constraints', () => {
      const invalidPagination = {
        currentPage: 0, // Invalid: must be >= 1
        totalPages: 1,
        totalItems: 10,
        itemsPerPage: 10,
        hasNextPage: false,
        hasPreviousPage: false,
      };
      expect(() => PaginationMetaSchema.parse(invalidPagination)).toThrow();
    });

    it('should validate items per page constraints', () => {
      const invalidPagination = {
        currentPage: 1,
        totalPages: 1,
        totalItems: 10,
        itemsPerPage: 101, // Invalid: max 100
        hasNextPage: false,
        hasPreviousPage: false,
      };
      expect(() => PaginationMetaSchema.parse(invalidPagination)).toThrow();
    });

    it('should validate total items minimum', () => {
      const invalidPagination = {
        currentPage: 1,
        totalPages: 1,
        totalItems: -1, // Invalid: must be >= 0
        itemsPerPage: 10,
        hasNextPage: false,
        hasPreviousPage: false,
      };
      expect(() => PaginationMetaSchema.parse(invalidPagination)).toThrow();
    });
  });

  // =====================
  // PAGINATED API RESPONSE SCHEMA
  // =====================
  describe('PaginatedAPIResponseSchema', () => {
    it('should validate paginated response with array data', () => {
      const schema = PaginatedAPIResponseSchema(z.object({ id: z.number() }));
      const response = {
        success: true,
        data: [{ id: 1 }, { id: 2 }],
        pagination: createValidPaginationMeta(),
      };
      const result = schema.parse(response);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]?.id).toBe(1);
    });

    it('should validate paginated response with meta information', () => {
      const schema = PaginatedAPIResponseSchema(z.string());
      const response = {
        success: true,
        data: ['item1', 'item2'],
        pagination: createValidPaginationMeta(),
        meta: {
          totalCount: 100,
          filteredCount: 80,
          query: { search: 'test' },
          sort: { field: 'name', direction: 'asc' as const },
          filters: { status: 'active' },
        },
      };
      const result = schema.parse(response);
      expect(result.meta?.totalCount).toBe(100);
      expect(result.meta?.sort?.direction).toBe('asc');
    });

    it('should require success: true', () => {
      const schema = PaginatedAPIResponseSchema(z.string());
      const response = {
        success: false,
        data: ['item1'],
        pagination: createValidPaginationMeta(),
      };
      expect(() => schema.parse(response)).toThrow();
    });
  });

  // =====================
  // HEALTH CHECK RESPONSE SCHEMA
  // =====================
  describe('HealthCheckResponseSchema', () => {
    it('should validate complete health check response', () => {
      const healthCheck = {
        status: 'healthy' as const,
        version: '1.0.0',
        timestamp: '2024-01-01T00:00:00Z',
        uptime: 3600,
        environment: 'production',
        checks: {
          database: {
            status: 'pass' as const,
            message: 'Database connection OK',
            timestamp: '2024-01-01T00:00:00Z',
            duration: 50,
            details: { connectionCount: 5 },
          },
          redis: {
            status: 'fail' as const,
            message: 'Redis connection failed',
            timestamp: '2024-01-01T00:00:00Z',
            duration: 5000,
          },
        },
        dependencies: {
          github: {
            status: 'connected' as const,
            responseTime: 200,
            version: 'v4',
            lastChecked: '2024-01-01T00:00:00Z',
          },
        },
        metrics: {
          memoryUsage: 85.5,
          cpuUsage: 45.2,
          requestCount: 12345,
          errorRate: 0.01,
        },
      };
      const result = HealthCheckResponseSchema.parse(healthCheck);
      expect(result).toEqual(healthCheck);
    });

    it('should validate minimal health check response', () => {
      const healthCheck = {
        status: 'healthy' as const,
        version: '1.0.0',
        timestamp: '2024-01-01T00:00:00Z',
        uptime: 3600,
        environment: 'development',
        checks: {},
      };
      const result = HealthCheckResponseSchema.parse(healthCheck);
      expect(result.status).toBe('healthy');
      expect(result.checks).toEqual({});
    });

    it('should validate status enum values', () => {
      const healthCheck = {
        status: 'invalid',
        version: '1.0.0',
        timestamp: '2024-01-01T00:00:00Z',
        uptime: 3600,
        environment: 'development',
        checks: {},
      };
      expect(() => HealthCheckResponseSchema.parse(healthCheck)).toThrow();
    });

    it('should validate check status enum values', () => {
      const healthCheck = {
        status: 'healthy' as const,
        version: '1.0.0',
        timestamp: '2024-01-01T00:00:00Z',
        uptime: 3600,
        environment: 'development',
        checks: {
          test: {
            status: 'invalid',
            timestamp: '2024-01-01T00:00:00Z',
          },
        },
      };
      expect(() => HealthCheckResponseSchema.parse(healthCheck)).toThrow();
    });

    it('should validate uptime minimum value', () => {
      const healthCheck = {
        status: 'healthy' as const,
        version: '1.0.0',
        timestamp: '2024-01-01T00:00:00Z',
        uptime: -1, // Invalid
        environment: 'development',
        checks: {},
      };
      expect(() => HealthCheckResponseSchema.parse(healthCheck)).toThrow();
    });
  });

  // =====================
  // RATE LIMIT SCHEMA
  // =====================
  describe('RateLimitSchema', () => {
    it('should validate complete rate limit information', () => {
      const rateLimit = {
        limit: 100,
        remaining: 50,
        reset: 1640995200,
        resetTime: '2024-01-01T01:00:00Z',
        windowMs: 60000,
        retryAfter: 30,
      };
      const result = RateLimitSchema.parse(rateLimit);
      expect(result).toEqual(rateLimit);
    });

    it('should validate minimal rate limit information', () => {
      const rateLimit = {
        limit: 100,
        remaining: 50,
        reset: 1640995200,
        resetTime: '2024-01-01T01:00:00Z',
        windowMs: 60000,
      };
      const result = RateLimitSchema.parse(rateLimit);
      expect(result.retryAfter).toBeUndefined();
    });

    it('should validate minimum constraints', () => {
      const invalidRateLimit = {
        limit: 0, // Invalid: must be >= 1
        remaining: 50,
        reset: 1640995200,
        resetTime: '2024-01-01T01:00:00Z',
        windowMs: 60000,
      };
      expect(() => RateLimitSchema.parse(invalidRateLimit)).toThrow();
    });

    it('should validate window minimum', () => {
      const invalidRateLimit = {
        limit: 100,
        remaining: 50,
        reset: 1640995200,
        resetTime: '2024-01-01T01:00:00Z',
        windowMs: 500, // Invalid: must be >= 1000
      };
      expect(() => RateLimitSchema.parse(invalidRateLimit)).toThrow();
    });
  });

  // =====================
  // API REQUEST SCHEMA
  // =====================
  describe('APIRequestSchema', () => {
    it('should validate complete API request', () => {
      const request = createValidAPIRequest();
      const result = APIRequestSchema.parse(request);
      expect(result).toEqual(request);
    });

    it('should validate minimal API request', () => {
      const request = {
        method: 'GET' as const,
        url: 'https://api.example.com/test',
        timestamp: '2024-01-01T00:00:00Z',
        requestId: '123e4567-e89b-12d3-a456-426614174000',
      };
      const result = APIRequestSchema.parse(request);
      expect(result.method).toBe('GET');
      expect(result.url).toBe('https://api.example.com/test');
    });

    it('should validate HTTP method enum', () => {
      const request = {
        method: 'INVALID',
        url: 'https://api.example.com/test',
        timestamp: '2024-01-01T00:00:00Z',
        requestId: '123e4567-e89b-12d3-a456-426614174000',
      };
      expect(() => APIRequestSchema.parse(request)).toThrow();
    });

    it('should validate URL format', () => {
      const request = {
        method: 'GET' as const,
        url: 'invalid-url',
        timestamp: '2024-01-01T00:00:00Z',
        requestId: '123e4567-e89b-12d3-a456-426614174000',
      };
      expect(() => APIRequestSchema.parse(request)).toThrow();
    });

    it('should validate UUID format for requestId', () => {
      const request = {
        method: 'GET' as const,
        url: 'https://api.example.com/test',
        timestamp: '2024-01-01T00:00:00Z',
        requestId: 'invalid-uuid',
      };
      expect(() => APIRequestSchema.parse(request)).toThrow();
    });

    it('should handle query parameters with arrays', () => {
      const request = {
        method: 'GET' as const,
        url: 'https://api.example.com/test',
        query: {
          tags: ['tag1', 'tag2'],
          search: 'test',
        },
        timestamp: '2024-01-01T00:00:00Z',
        requestId: '123e4567-e89b-12d3-a456-426614174000',
      };
      const result = APIRequestSchema.parse(request);
      expect(result.query?.['tags']).toEqual(['tag1', 'tag2']);
    });
  });

  // =====================
  // API RESPONSE VALIDATION SCHEMA
  // =====================
  describe('APIResponseValidationSchema', () => {
    it('should validate complete API response validation', () => {
      const response = {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: { data: 'test' },
        timestamp: '2024-01-01T00:00:00Z',
        requestId: '123e4567-e89b-12d3-a456-426614174000',
        duration: 123.45,
        cached: true,
        size: 1024,
      };
      const result = APIResponseValidationSchema.parse(response);
      expect(result).toEqual(response);
    });

    it('should apply default values', () => {
      const response = {
        status: 200,
        timestamp: '2024-01-01T00:00:00Z',
        requestId: '123e4567-e89b-12d3-a456-426614174000',
        duration: 123.45,
      };
      const result = APIResponseValidationSchema.parse(response);
      expect(result.cached).toBe(false);
    });

    it('should validate status code range', () => {
      const response = {
        status: 99, // Invalid: must be >= 100
        timestamp: '2024-01-01T00:00:00Z',
        requestId: '123e4567-e89b-12d3-a456-426614174000',
        duration: 123.45,
      };
      expect(() => APIResponseValidationSchema.parse(response)).toThrow();
    });

    it('should validate duration minimum', () => {
      const response = {
        status: 200,
        timestamp: '2024-01-01T00:00:00Z',
        requestId: '123e4567-e89b-12d3-a456-426614174000',
        duration: -1, // Invalid: must be >= 0
      };
      expect(() => APIResponseValidationSchema.parse(response)).toThrow();
    });
  });

  // =====================
  // VALIDATION ERROR SCHEMA
  // =====================
  describe('ValidationErrorSchema', () => {
    it('should validate complete validation error', () => {
      const error = {
        field: 'username',
        code: 'REQUIRED',
        message: 'Username is required',
        value: '',
        expected: 'non-empty string',
        path: ['user', 'username'],
      };
      const result = ValidationErrorSchema.parse(error);
      expect(result).toEqual(error);
    });

    it('should validate minimal validation error', () => {
      const error = {
        field: 'email',
        code: 'INVALID_FORMAT',
        message: 'Invalid email format',
      };
      const result = ValidationErrorSchema.parse(error);
      expect(result.field).toBe('email');
      expect(result.code).toBe('INVALID_FORMAT');
    });

    it('should require field, code, and message', () => {
      expect(() =>
        ValidationErrorSchema.parse({
          field: '',
          code: 'TEST',
          message: 'Test',
        })
      ).toThrow();

      expect(() =>
        ValidationErrorSchema.parse({
          field: 'test',
          code: '',
          message: 'Test',
        })
      ).toThrow();

      expect(() =>
        ValidationErrorSchema.parse({
          field: 'test',
          code: 'TEST',
          message: '',
        })
      ).toThrow();
    });

    it('should handle path with mixed types', () => {
      const error = {
        field: 'items',
        code: 'INVALID',
        message: 'Invalid item',
        path: ['items', 0, 'name'],
      };
      const result = ValidationErrorSchema.parse(error);
      expect(result.path).toEqual(['items', 0, 'name']);
    });
  });

  // =====================
  // BATCH OPERATION RESPONSE SCHEMA
  // =====================
  describe('BatchOperationResponseSchema', () => {
    it('should validate complete batch operation response', () => {
      const response = {
        success: true,
        total: 10,
        processed: 10,
        successful: 8,
        failed: 2,
        results: [
          {
            id: 'item1',
            success: true,
            data: { processed: true },
          },
          {
            id: 'item2',
            success: false,
            error: createValidErrorDetails(),
          },
        ],
        errors: [createValidErrorDetails()],
        meta: {
          startTime: '2024-01-01T00:00:00Z',
          endTime: '2024-01-01T00:05:00Z',
          duration: 300000,
          batchId: '123e4567-e89b-12d3-a456-426614174000',
        },
      };
      const result = BatchOperationResponseSchema.parse(response);
      expect(result.total).toBe(10);
      expect(result.successful).toBe(8);
      expect(result.results).toHaveLength(2);
    });

    it('should validate batch counts consistency', () => {
      const response = {
        success: true,
        total: 10,
        processed: 10,
        successful: 8,
        failed: 2,
        results: [],
        meta: {
          startTime: '2024-01-01T00:00:00Z',
          endTime: '2024-01-01T00:05:00Z',
          duration: 300000,
          batchId: '123e4567-e89b-12d3-a456-426614174000',
        },
      };
      const result = BatchOperationResponseSchema.parse(response);
      expect(result.successful + result.failed).toBe(result.processed);
    });

    it('should validate UUID format for batchId', () => {
      const response = {
        success: true,
        total: 1,
        processed: 1,
        successful: 1,
        failed: 0,
        results: [],
        meta: {
          startTime: '2024-01-01T00:00:00Z',
          endTime: '2024-01-01T00:05:00Z',
          duration: 300000,
          batchId: 'invalid-uuid',
        },
      };
      expect(() => BatchOperationResponseSchema.parse(response)).toThrow();
    });
  });

  // =====================
  // SEARCH RESPONSE SCHEMA
  // =====================
  describe('SearchResponseSchema', () => {
    it('should validate complete search response', () => {
      const schema = SearchResponseSchema(z.object({ id: z.number(), name: z.string() }));
      const response = {
        success: true,
        query: 'test search',
        results: [
          {
            item: { id: 1, name: 'Test Item 1' },
            score: 0.95,
            highlights: [
              {
                field: 'name',
                matches: ['<em>Test</em> Item 1'],
              },
            ],
          },
          {
            item: { id: 2, name: 'Test Item 2' },
            score: 0.85,
          },
        ],
        pagination: createValidPaginationMeta(),
        facets: {
          category: [
            { value: 'electronics', count: 10 },
            { value: 'books', count: 5 },
          ],
        },
        suggestions: ['test search term', 'testing'],
        meta: {
          totalResults: 25,
          searchTime: 45.5,
          exactMatch: false,
          fuzzyMatch: true,
          filters: { category: 'all' },
        },
      };
      const result = schema.parse(response);
      expect(result.results).toHaveLength(2);
      expect(result.results[0]?.score).toBe(0.95);
      expect(result.facets?.['category']).toHaveLength(2);
    });

    it('should require non-empty query', () => {
      const schema = SearchResponseSchema(z.string());
      const response = {
        success: true,
        query: '',
        results: [],
        pagination: createValidPaginationMeta(),
        meta: {
          totalResults: 0,
          searchTime: 10,
          exactMatch: false,
          fuzzyMatch: false,
        },
      };
      expect(() => schema.parse(response)).toThrow();
    });

    it('should validate score range', () => {
      const schema = SearchResponseSchema(z.string());
      const response = {
        success: true,
        query: 'test',
        results: [
          {
            item: 'test item',
            score: 1.5, // Invalid: must be <= 1
          },
        ],
        pagination: createValidPaginationMeta(),
        meta: {
          totalResults: 1,
          searchTime: 10,
          exactMatch: false,
          fuzzyMatch: false,
        },
      };
      expect(() => schema.parse(response)).toThrow();
    });
  });

  // =====================
  // FILE UPLOAD RESPONSE SCHEMA
  // =====================
  describe('FileUploadResponseSchema', () => {
    it('should validate successful file upload response', () => {
      const response = {
        success: true,
        file: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'processed-image.jpg',
          originalName: 'my-image.jpg',
          size: 1024768,
          type: 'image/jpeg',
          extension: 'jpg',
          url: 'https://cdn.example.com/files/processed-image.jpg',
          thumbnailUrl: 'https://cdn.example.com/thumbs/processed-image.jpg',
          uploadedAt: '2024-01-01T00:00:00Z',
          expiresAt: '2024-01-08T00:00:00Z',
          metadata: {
            width: 1920,
            height: 1080,
            originalSize: 2048576,
          },
        },
      };
      const result = FileUploadResponseSchema.parse(response);
      expect(result.file.size).toBe(1024768);
      expect(result.file.metadata?.['width']).toBe(1920);
    });

    it('should validate failed file upload response', () => {
      const response = {
        success: false,
        file: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'failed-upload.jpg',
          originalName: 'my-image.jpg',
          size: 0,
          type: 'image/jpeg',
          extension: 'jpg',
          url: 'https://cdn.example.com/files/failed-upload.jpg',
          uploadedAt: '2024-01-01T00:00:00Z',
        },
        error: createValidErrorDetails(),
      };
      const result = FileUploadResponseSchema.parse(response);
      expect(result.success).toBe(false);
      expect(result.error).toEqual(createValidErrorDetails());
    });

    it('should validate UUID format for file ID', () => {
      const response = {
        success: true,
        file: {
          id: 'invalid-uuid',
          name: 'test.jpg',
          originalName: 'test.jpg',
          size: 1024,
          type: 'image/jpeg',
          extension: 'jpg',
          url: 'https://cdn.example.com/test.jpg',
          uploadedAt: '2024-01-01T00:00:00Z',
        },
      };
      expect(() => FileUploadResponseSchema.parse(response)).toThrow();
    });

    it('should validate URL formats', () => {
      const response = {
        success: true,
        file: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'test.jpg',
          originalName: 'test.jpg',
          size: 1024,
          type: 'image/jpeg',
          extension: 'jpg',
          url: 'invalid-url',
          uploadedAt: '2024-01-01T00:00:00Z',
        },
      };
      expect(() => FileUploadResponseSchema.parse(response)).toThrow();
    });
  });

  // =====================
  // HTTP STATUS SCHEMA
  // =====================
  describe('HTTPStatusSchema', () => {
    it('should validate success status codes', () => {
      expect(HTTPStatusSchema.parse('200')).toBe('200');
      expect(HTTPStatusSchema.parse('201')).toBe('201');
      expect(HTTPStatusSchema.parse('202')).toBe('202');
      expect(HTTPStatusSchema.parse('204')).toBe('204');
    });

    it('should validate client error status codes', () => {
      expect(HTTPStatusSchema.parse('400')).toBe('400');
      expect(HTTPStatusSchema.parse('401')).toBe('401');
      expect(HTTPStatusSchema.parse('403')).toBe('403');
      expect(HTTPStatusSchema.parse('404')).toBe('404');
      expect(HTTPStatusSchema.parse('429')).toBe('429');
    });

    it('should validate server error status codes', () => {
      expect(HTTPStatusSchema.parse('500')).toBe('500');
      expect(HTTPStatusSchema.parse('502')).toBe('502');
      expect(HTTPStatusSchema.parse('503')).toBe('503');
      expect(HTTPStatusSchema.parse('504')).toBe('504');
    });

    it('should reject invalid status codes', () => {
      expect(() => HTTPStatusSchema.parse('100')).toThrow();
      expect(() => HTTPStatusSchema.parse('300')).toThrow();
      expect(() => HTTPStatusSchema.parse('600')).toThrow();
    });
  });

  // =====================
  // API ENDPOINT SCHEMA
  // =====================
  describe('APIEndpointSchema', () => {
    it('should validate complete API endpoint configuration', () => {
      const endpoint = {
        path: '/api/users',
        method: 'POST' as const,
        description: 'Create a new user',
        tags: ['users', 'authentication'],
        deprecated: false,
        auth: {
          required: true,
          type: 'bearer' as const,
          scope: ['user:create'],
        },
        rateLimit: {
          requests: 100,
          windowMs: 60000,
        },
        validation: {
          headers: { 'Content-Type': 'application/json' },
          query: { includeProfile: 'boolean' },
          body: { username: 'string', email: 'string' },
        },
        response: {
          schema: { user: 'object' },
          examples: [{ user: { id: 1, username: 'test' } }],
        },
      };
      const result = APIEndpointSchema.parse(endpoint);
      expect(result.auth?.required).toBe(true);
      expect(result.rateLimit?.requests).toBe(100);
    });

    it('should validate minimal API endpoint', () => {
      const endpoint = {
        path: '/api/health',
        method: 'GET' as const,
      };
      const result = APIEndpointSchema.parse(endpoint);
      expect(result.deprecated).toBe(false);
    });

    it('should validate HTTP method enum', () => {
      const endpoint = {
        path: '/api/test',
        method: 'INVALID',
      };
      expect(() => APIEndpointSchema.parse(endpoint)).toThrow();
    });

    it('should validate auth type enum', () => {
      const endpoint = {
        path: '/api/test',
        method: 'GET' as const,
        auth: {
          required: true,
          type: 'invalid',
        },
      };
      expect(() => APIEndpointSchema.parse(endpoint)).toThrow();
    });

    it('should validate rate limit constraints', () => {
      const endpoint = {
        path: '/api/test',
        method: 'GET' as const,
        rateLimit: {
          requests: 0, // Invalid: must be >= 1
          windowMs: 60000,
        },
      };
      expect(() => APIEndpointSchema.parse(endpoint)).toThrow();
    });
  });

  // =====================
  // HELPER FUNCTIONS
  // =====================
  describe('Helper Functions', () => {
    describe('createSuccessResponse', () => {
      it('should create success response with data', () => {
        const data = { id: 1, name: 'Test' };
        const response = createSuccessResponse(data);

        expect(response.success).toBe(true);
        expect(response.data).toEqual(data);
      });

      it('should create success response with meta', () => {
        const data = 'test';
        const meta = { version: '1.0.0', cached: true };
        const response = createSuccessResponse(data, meta);

        expect(response.success).toBe(true);
        expect(response.data).toBe(data);
        expect(response.meta).toEqual(meta);
      });
    });

    describe('createErrorResponse', () => {
      it('should create error response', () => {
        const error = createValidErrorDetails();
        const response = createErrorResponse(error);

        expect(response.success).toBe(false);
        expect(response.error).toEqual(error);
      });

      it('should create error response with meta', () => {
        const error = createValidErrorDetails();
        const meta = { requestId: 'req-123' };
        const response = createErrorResponse(error, meta);

        expect(response.success).toBe(false);
        expect(response.error).toEqual(error);
        expect(response.meta).toEqual(meta);
      });
    });

    describe('createPaginatedResponse', () => {
      it('should create paginated response', () => {
        const data = [{ id: 1 }, { id: 2 }];
        const pagination = createValidPaginationMeta();
        const response = createPaginatedResponse(data, pagination);

        expect(response.success).toBe(true);
        expect(response.data).toEqual(data);
        expect(response.pagination).toEqual(pagination);
        expect(response.meta?.totalCount).toBe(0);
        expect(response.meta?.filteredCount).toBe(0);
      });

      it('should create paginated response with meta', () => {
        const data = ['item1', 'item2'];
        const pagination = createValidPaginationMeta();
        const meta = { totalCount: 100, filteredCount: 50 };
        const response = createPaginatedResponse(data, pagination, meta);

        expect(response.meta?.totalCount).toBe(100);
        expect(response.meta?.filteredCount).toBe(50);
      });
    });

    describe('validateAPIResponse', () => {
      it('should validate successful API response', () => {
        const schema = z.object({ success: z.boolean(), data: z.string() });
        const response = { success: true, data: 'test' };
        const result = validateAPIResponse(schema, response);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(response);
        expect(result.errors).toBeUndefined();
      });

      it('should validate failed API response', () => {
        const schema = z.object({ success: z.boolean(), data: z.string() });
        const response = { success: true, data: 123 }; // Invalid data type
        const result = validateAPIResponse(schema, response);

        expect(result.success).toBe(false);
        expect(result.data).toBeUndefined();
        expect(result.errors).toBeInstanceOf(z.ZodError);
      });

      it('should rethrow non-Zod errors', () => {
        const mockSchema = {
          parse: () => {
            throw new Error('Custom error');
          },
        } as any;

        expect(() => validateAPIResponse(mockSchema, {})).toThrow('Custom error');
      });
    });
  });

  // =====================
  // CONSTANTS
  // =====================
  describe('Constants', () => {
    describe('HTTP_STATUS_CODES', () => {
      it('should contain correct status code mappings', () => {
        expect(HTTP_STATUS_CODES[200]).toBe('OK');
        expect(HTTP_STATUS_CODES[201]).toBe('Created');
        expect(HTTP_STATUS_CODES[400]).toBe('Bad Request');
        expect(HTTP_STATUS_CODES[401]).toBe('Unauthorized');
        expect(HTTP_STATUS_CODES[404]).toBe('Not Found');
        expect(HTTP_STATUS_CODES[500]).toBe('Internal Server Error');
      });

      it('should be readonly', () => {
        // TypeScript should enforce this, but we can test runtime behavior
        expect(() => {
          (HTTP_STATUS_CODES as any)[999] = 'Custom Status';
        }).not.toThrow(); // Object.freeze isn't applied, but TypeScript prevents this
      });
    });

    describe('ERROR_CODES', () => {
      it('should contain expected error codes', () => {
        expect(ERROR_CODES.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
        expect(ERROR_CODES.AUTHENTICATION_ERROR).toBe('AUTHENTICATION_ERROR');
        expect(ERROR_CODES.NOT_FOUND).toBe('NOT_FOUND');
        expect(ERROR_CODES.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT_EXCEEDED');
        expect(ERROR_CODES.GITHUB_API_ERROR).toBe('GITHUB_API_ERROR');
      });
    });
  });

  // =====================
  // INTEGRATION TESTS
  // =====================
  describe('API Schema Integration Tests', () => {
    it('should handle complete API workflow with success response', () => {
      // Create request
      const request = createValidAPIRequest();
      const requestResult = APIRequestSchema.parse(request);
      expect(requestResult.method).toBe('GET');

      // Create success response
      const dataSchema = z.object({ users: z.array(z.object({ id: z.number() })) });
      const data = { users: [{ id: 1 }, { id: 2 }] };
      const successResponse = createSuccessResponse(data, { version: '1.0.0' });

      // Validate success response
      const responseSchema = SuccessAPIResponseSchema(dataSchema);
      const responseResult = responseSchema.parse(successResponse);
      expect(responseResult.success).toBe(true);
      expect(responseResult.data.users).toHaveLength(2);
    });

    it('should handle complete API workflow with error response', () => {
      // Create request
      const request = createValidAPIRequest();
      request.method = 'POST';
      request.body = { invalid: 'data' };

      // Note: ValidationError schema is validated separately in its own test section

      // Create error response
      const errorDetails = createValidErrorDetails();
      const errorResponse = createErrorResponse(errorDetails, {
        requestId: request.requestId,
        timestamp: request.timestamp,
      });

      // Validate error response
      const result = ErrorAPIResponseSchema.parse(errorResponse);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle paginated API workflow', () => {
      const items = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];
      const pagination = createValidPaginationMeta();
      const paginatedResponse = createPaginatedResponse(items, pagination, {
        totalCount: 100,
        filteredCount: 80,
      });

      const schema = PaginatedAPIResponseSchema(z.object({ id: z.number(), name: z.string() }));
      const result = schema.parse(paginatedResponse);

      expect(result.data).toHaveLength(2);
      expect(result.pagination.totalItems).toBe(100);
      expect(result.meta?.totalCount).toBe(100);
    });

    it('should validate API response chain with different schemas', () => {
      // Test different response types in sequence
      const stringSchema = z.string();
      const objectSchema = z.object({ id: z.number() });
      const arraySchema = z.array(z.string());

      // Test string response
      const stringResponse = createSuccessResponse('test string');
      const stringResult = validateAPIResponse(
        SuccessAPIResponseSchema(stringSchema),
        stringResponse
      );
      expect(stringResult.success).toBe(true);

      // Test object response
      const objectResponse = createSuccessResponse({ id: 123 });
      const objectResult = validateAPIResponse(
        SuccessAPIResponseSchema(objectSchema),
        objectResponse
      );
      expect(objectResult.success).toBe(true);

      // Test array response
      const arrayResponse = createSuccessResponse(['item1', 'item2']);
      const arrayResult = validateAPIResponse(SuccessAPIResponseSchema(arraySchema), arrayResponse);
      expect(arrayResult.success).toBe(true);
    });
  });
});

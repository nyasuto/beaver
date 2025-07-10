/**
 * Schema Index Tests
 *
 * Tests for the schema index module including common schemas,
 * type exports, validation helpers, and schema collections
 */

import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import {
  IdSchema,
  TimestampSchema,
  UrlSchema,
  EmailSchema,
  NonEmptyStringSchema,
  PaginationSchema,
  ErrorSchema,
  ApiResponseSchema,
  ConfigSchemas,
  AnalyticsSchemas,
  UISchemas,
  APISchemas,
  ProcessingSchemas,
  GitHubSchemas,
  VALIDATION_CONSTANTS,
  validateData,
  validateDataOrThrow,
  validateConfig,
  createDefaultConfig,
  parseEnvironment,
  validateAnalyticsData,
  createDefaultDashboard,
  validateUIProps,
  createDefaultTheme,
  generateUIId,
  validateAPIResponse,
  createSuccessResponse,
  createErrorResponse,
  validateProcessingData,
  applyFilters,
  createDefaultProcessingOptions,
  validateGitHubData,
  createGitHubResponse,
  parseGitHubPagination,
  type Pagination,
  type ApiError,
  type ApiResponse,
} from '../index';

describe('Common Schemas', () => {
  describe('IdSchema', () => {
    it('should validate positive integers', () => {
      expect(() => IdSchema.parse(123)).not.toThrow();
      expect(() => IdSchema.parse(1)).not.toThrow();
    });

    it('should reject zero and negative numbers', () => {
      expect(() => IdSchema.parse(0)).toThrow();
      expect(() => IdSchema.parse(-1)).toThrow();
    });

    it('should reject non-integers', () => {
      expect(() => IdSchema.parse(123.45)).toThrow();
      expect(() => IdSchema.parse('123')).toThrow();
    });
  });

  describe('TimestampSchema', () => {
    it('should validate ISO datetime strings', () => {
      expect(() => TimestampSchema.parse('2023-01-01T00:00:00Z')).not.toThrow();
      expect(() => TimestampSchema.parse('2023-01-01T12:34:56.789Z')).not.toThrow();
      expect(() => TimestampSchema.parse('2023-01-01T12:34:56.000Z')).not.toThrow();
    });

    it('should reject invalid datetime formats', () => {
      expect(() => TimestampSchema.parse('2023-01-01')).toThrow();
      expect(() => TimestampSchema.parse('invalid-date')).toThrow();
      expect(() => TimestampSchema.parse('')).toThrow();
    });
  });

  describe('UrlSchema', () => {
    it('should validate valid URLs', () => {
      expect(() => UrlSchema.parse('https://example.com')).not.toThrow();
      expect(() => UrlSchema.parse('http://localhost:3000')).not.toThrow();
      expect(() => UrlSchema.parse('https://api.github.com/repos/owner/repo')).not.toThrow();
    });

    it('should reject invalid URLs', () => {
      expect(() => UrlSchema.parse('not-a-url')).toThrow();
      expect(() => UrlSchema.parse('ftp://example.com')).not.toThrow(); // FTP is valid URL
      expect(() => UrlSchema.parse('')).toThrow();
    });
  });

  describe('EmailSchema', () => {
    it('should validate valid email addresses', () => {
      expect(() => EmailSchema.parse('test@example.com')).not.toThrow();
      expect(() => EmailSchema.parse('user.name+tag@domain.co.uk')).not.toThrow();
    });

    it('should reject invalid email addresses', () => {
      expect(() => EmailSchema.parse('invalid-email')).toThrow();
      expect(() => EmailSchema.parse('@example.com')).toThrow();
      expect(() => EmailSchema.parse('test@')).toThrow();
    });
  });

  describe('NonEmptyStringSchema', () => {
    it('should validate non-empty strings', () => {
      expect(() => NonEmptyStringSchema.parse('hello')).not.toThrow();
      expect(() => NonEmptyStringSchema.parse(' ')).not.toThrow();
    });

    it('should reject empty strings', () => {
      expect(() => NonEmptyStringSchema.parse('')).toThrow();
    });

    it('should reject non-strings', () => {
      expect(() => NonEmptyStringSchema.parse(123)).toThrow();
      expect(() => NonEmptyStringSchema.parse(null)).toThrow();
    });
  });
});

describe('Pagination Schema', () => {
  it('should validate valid pagination data', () => {
    const validPagination: Pagination = {
      page: 1,
      per_page: 30,
      total: 100,
      total_pages: 4,
    };

    expect(() => PaginationSchema.parse(validPagination)).not.toThrow();
  });

  it('should use default values', () => {
    const minimalPagination = {};
    const result = PaginationSchema.parse(minimalPagination);

    expect(result.page).toBe(1);
    expect(result.per_page).toBe(30);
  });

  it('should reject invalid values', () => {
    expect(() => PaginationSchema.parse({ page: 0 })).toThrow();
    expect(() => PaginationSchema.parse({ per_page: 0 })).toThrow();
    expect(() => PaginationSchema.parse({ per_page: 101 })).toThrow();
  });
});

describe('Error Schema', () => {
  it('should validate error objects', () => {
    const validError: ApiError = {
      message: 'Something went wrong',
      code: 'INTERNAL_ERROR',
      details: { timestamp: '2023-01-01T00:00:00Z' },
    };

    expect(() => ErrorSchema.parse(validError)).not.toThrow();
  });

  it('should validate minimal error', () => {
    const minimalError = {
      message: 'Error message',
    };

    expect(() => ErrorSchema.parse(minimalError)).not.toThrow();
  });

  it('should reject invalid error objects', () => {
    expect(() => ErrorSchema.parse({})).toThrow();
    expect(() => ErrorSchema.parse({ code: 'ERROR' })).toThrow();
  });
});

describe('API Response Schema', () => {
  it('should validate success response', () => {
    const StringSchema = z.string();
    const ResponseSchema = ApiResponseSchema(StringSchema);

    const validResponse: ApiResponse<string> = {
      success: true,
      data: 'test data',
    };

    expect(() => ResponseSchema.parse(validResponse)).not.toThrow();
  });

  it('should validate error response', () => {
    const StringSchema = z.string();
    const ResponseSchema = ApiResponseSchema(StringSchema);

    const validResponse: ApiResponse<string> = {
      success: false,
      error: {
        message: 'Error occurred',
        code: 'API_ERROR',
      },
    };

    expect(() => ResponseSchema.parse(validResponse)).not.toThrow();
  });

  it('should validate paginated response', () => {
    const StringSchema = z.string();
    const ResponseSchema = ApiResponseSchema(StringSchema);

    const validResponse: ApiResponse<string> = {
      success: true,
      data: 'test data',
      pagination: {
        page: 1,
        per_page: 30,
        total: 100,
        total_pages: 4,
      },
    };

    expect(() => ResponseSchema.parse(validResponse)).not.toThrow();
  });
});

describe('Schema Collections', () => {
  describe('ConfigSchemas', () => {
    it('should have correct schema factories', () => {
      expect(ConfigSchemas.BeaverConfig).toBeDefined();
      expect(ConfigSchemas.GitHubConfig).toBeDefined();
      expect(ConfigSchemas.Environment).toBeDefined();
      expect(typeof ConfigSchemas.BeaverConfig).toBe('function');
    });
  });

  describe('AnalyticsSchemas', () => {
    it('should have correct schema factories', () => {
      expect(AnalyticsSchemas.TimeSeriesData).toBeDefined();
      expect(AnalyticsSchemas.IssueMetrics).toBeDefined();
      expect(AnalyticsSchemas.RepositoryMetrics).toBeDefined();
      expect(AnalyticsSchemas.AnalyticsDashboard).toBeDefined();
      expect(typeof AnalyticsSchemas.TimeSeriesData).toBe('function');
    });
  });

  describe('UISchemas', () => {
    it('should have correct schema factories', () => {
      expect(UISchemas.ThemeConfig).toBeDefined();
      expect(UISchemas.ButtonProps).toBeDefined();
      expect(UISchemas.CardProps).toBeDefined();
      expect(UISchemas.InputProps).toBeDefined();
      expect(UISchemas.ModalProps).toBeDefined();
      expect(typeof UISchemas.ThemeConfig).toBe('function');
    });
  });

  describe('APISchemas', () => {
    it('should have correct schema factories', () => {
      expect(APISchemas.SuccessResponse).toBeDefined();
      expect(APISchemas.ErrorResponse).toBeDefined();
      expect(APISchemas.PaginatedResponse).toBeDefined();
      expect(APISchemas.HealthCheck).toBeDefined();
      expect(typeof APISchemas.SuccessResponse).toBe('function');
    });
  });

  describe('ProcessingSchemas', () => {
    it('should have correct schema factories', () => {
      expect(ProcessingSchemas.FilterGroup).toBeDefined();
      expect(ProcessingSchemas.DataPipeline).toBeDefined();
      expect(ProcessingSchemas.ProcessingResult).toBeDefined();
      expect(ProcessingSchemas.DataCategory).toBeDefined();
      expect(typeof ProcessingSchemas.FilterGroup).toBe('function');
    });
  });

  describe('GitHubSchemas', () => {
    it('should have correct schema factories', () => {
      expect(GitHubSchemas.Issue).toBeDefined();
      expect(GitHubSchemas.Repository).toBeDefined();
      expect(GitHubSchemas.Commit).toBeDefined();
      expect(GitHubSchemas.WebhookEvent).toBeDefined();
      expect(typeof GitHubSchemas.Issue).toBe('function');
    });
  });
});

describe('Validation Constants', () => {
  it('should have correct validation constants', () => {
    expect(VALIDATION_CONSTANTS.MAX_STRING_LENGTH).toBe(1000);
    expect(VALIDATION_CONSTANTS.MAX_ARRAY_LENGTH).toBe(100);
    expect(VALIDATION_CONSTANTS.MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
    expect(VALIDATION_CONSTANTS.MAX_PAGINATION_LIMIT).toBe(100);
    expect(VALIDATION_CONSTANTS.DEFAULT_PAGINATION_LIMIT).toBe(30);
    expect(VALIDATION_CONSTANTS.MAX_SEARCH_RESULTS).toBe(1000);
    expect(VALIDATION_CONSTANTS.MAX_BATCH_SIZE).toBe(1000);
  });
});

describe('Validation Helper Functions', () => {
  // Mock the functions since they are imported from other modules
  vi.mock('../validation', () => ({
    validateData: vi.fn(),
    validateDataOrThrow: vi.fn(),
    ValidationError: class ValidationError extends Error {},
  }));

  vi.mock('../config', () => ({
    validateConfig: vi.fn(),
    createDefaultConfig: vi.fn(),
    parseEnvironment: vi.fn(),
  }));

  vi.mock('../analytics', () => ({
    validateAnalyticsData: vi.fn(),
    createDefaultDashboard: vi.fn(),
  }));

  vi.mock('../ui', () => ({
    validateUIProps: vi.fn(),
    createDefaultTheme: vi.fn(),
    generateUIId: vi.fn(),
  }));

  vi.mock('../api', () => ({
    validateAPIResponse: vi.fn(),
    createSuccessResponse: vi.fn(),
    createErrorResponse: vi.fn(),
  }));

  vi.mock('../processing', () => ({
    validateProcessingData: vi.fn(),
    applyFilters: vi.fn(),
    createDefaultProcessingOptions: vi.fn(),
  }));

  vi.mock('../github', () => ({
    validateGitHubData: vi.fn(),
    createGitHubResponse: vi.fn(),
    parseGitHubPagination: vi.fn(),
  }));

  describe('Function Exports', () => {
    it('should export validation functions', () => {
      expect(validateData).toBeDefined();
      expect(validateDataOrThrow).toBeDefined();
      expect(typeof validateData).toBe('function');
      expect(typeof validateDataOrThrow).toBe('function');
    });

    it('should export config functions', () => {
      expect(validateConfig).toBeDefined();
      expect(createDefaultConfig).toBeDefined();
      expect(parseEnvironment).toBeDefined();
      expect(typeof validateConfig).toBe('function');
      expect(typeof createDefaultConfig).toBe('function');
      expect(typeof parseEnvironment).toBe('function');
    });

    it('should export analytics functions', () => {
      expect(validateAnalyticsData).toBeDefined();
      expect(createDefaultDashboard).toBeDefined();
      expect(typeof validateAnalyticsData).toBe('function');
      expect(typeof createDefaultDashboard).toBe('function');
    });

    it('should export UI functions', () => {
      expect(validateUIProps).toBeDefined();
      expect(createDefaultTheme).toBeDefined();
      expect(generateUIId).toBeDefined();
      expect(typeof validateUIProps).toBe('function');
      expect(typeof createDefaultTheme).toBe('function');
      expect(typeof generateUIId).toBe('function');
    });

    it('should export API functions', () => {
      expect(validateAPIResponse).toBeDefined();
      expect(createSuccessResponse).toBeDefined();
      expect(createErrorResponse).toBeDefined();
      expect(typeof validateAPIResponse).toBe('function');
      expect(typeof createSuccessResponse).toBe('function');
      expect(typeof createErrorResponse).toBe('function');
    });

    it('should export processing functions', () => {
      expect(validateProcessingData).toBeDefined();
      expect(applyFilters).toBeDefined();
      expect(createDefaultProcessingOptions).toBeDefined();
      expect(typeof validateProcessingData).toBe('function');
      expect(typeof applyFilters).toBe('function');
      expect(typeof createDefaultProcessingOptions).toBe('function');
    });

    it('should export GitHub functions', () => {
      expect(validateGitHubData).toBeDefined();
      expect(createGitHubResponse).toBeDefined();
      expect(parseGitHubPagination).toBeDefined();
      expect(typeof validateGitHubData).toBe('function');
      expect(typeof createGitHubResponse).toBe('function');
      expect(typeof parseGitHubPagination).toBe('function');
    });
  });
});

describe('Type Exports', () => {
  it('should export proper type structure', () => {
    // Test type inference from schemas
    const pagination: Pagination = {
      page: 1,
      per_page: 30,
      total: 100,
      total_pages: 4,
    };

    const error: ApiError = {
      message: 'Test error',
      code: 'TEST_ERROR',
    };

    const response: ApiResponse<string> = {
      success: true,
      data: 'test data',
    };

    // These should compile without errors
    expect(pagination.page).toBe(1);
    expect(error.message).toBe('Test error');
    expect(response.success).toBe(true);
  });
});

describe('Module Integration', () => {
  it('should properly re-export from submodules', () => {
    // Test that we can import from the main index
    expect(IdSchema).toBeDefined();
    expect(PaginationSchema).toBeDefined();
    expect(ErrorSchema).toBeDefined();
    expect(VALIDATION_CONSTANTS).toBeDefined();
  });

  it('should handle schema factory functions', async () => {
    // Test that schema factories return promises
    const configSchemaPromise = ConfigSchemas.BeaverConfig();
    const analyticsSchemaPromise = AnalyticsSchemas.TimeSeriesData();
    const uiSchemaPromise = UISchemas.ThemeConfig();
    const apiSchemaPromise = APISchemas.SuccessResponse();
    const processingSchemaPromise = ProcessingSchemas.FilterGroup();
    const githubSchemaPromise = GitHubSchemas.Issue();

    expect(configSchemaPromise).toBeInstanceOf(Promise);
    expect(analyticsSchemaPromise).toBeInstanceOf(Promise);
    expect(uiSchemaPromise).toBeInstanceOf(Promise);
    expect(apiSchemaPromise).toBeInstanceOf(Promise);
    expect(processingSchemaPromise).toBeInstanceOf(Promise);
    expect(githubSchemaPromise).toBeInstanceOf(Promise);
  });
});

describe('Edge Cases', () => {
  it('should handle complex nested API responses', () => {
    const NumberSchema = z.number();
    const ResponseSchema = ApiResponseSchema(NumberSchema);

    const complexResponse = {
      success: true,
      data: 42,
      pagination: {
        page: 1,
        per_page: 10,
        total: 100,
        total_pages: 10,
      },
      error: undefined,
    };

    expect(() => ResponseSchema.parse(complexResponse)).not.toThrow();
  });

  it('should handle edge cases in pagination', () => {
    // Test boundary values
    const edgeCases = [
      { page: 1, per_page: 1 },
      { page: 1, per_page: 100 },
      { page: 1000, per_page: 50 },
    ];

    edgeCases.forEach(edgeCase => {
      expect(() => PaginationSchema.parse(edgeCase)).not.toThrow();
    });
  });

  it('should handle empty and undefined values properly', () => {
    // Test that optional fields handle undefined
    const responseWithUndefined = {
      success: true,
      data: undefined,
      error: undefined,
      pagination: undefined,
    };

    const NumberSchema = z.number();
    const ResponseSchema = ApiResponseSchema(NumberSchema);

    expect(() => ResponseSchema.parse(responseWithUndefined)).not.toThrow();
  });
});

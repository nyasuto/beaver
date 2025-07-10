/**
 * Data Processing Schemas Tests
 *
 * Comprehensive tests for all data processing-related Zod schemas
 */

import { describe, it, expect } from 'vitest';
import {
  FilterOperatorSchema,
  FilterConditionSchema,
  FilterGroupSchema,
  SortConfigSchema,
  DataProcessingOptionsSchema,
  IssueProcessingOptionsSchema,
  DataTransformationSchema,
  DataPipelineSchema,
  DataValidationRuleSchema,
  DataQualityAssessmentSchema,
  DataExportConfigSchema,
  ProcessingResultSchema,
  DataCategorySchema,
  validateProcessingData,
  applyFilters,
  createDefaultProcessingOptions,
  type FilterOperator,
  type FilterCondition,
  type FilterGroup,
  type SortConfig,
  type DataProcessingOptions,
  type IssueProcessingOptions,
  type DataTransformation,
  type DataPipeline,
  type DataValidationRule,
  type DataQualityAssessment,
  type DataExportConfig,
  type ProcessingResult,
  type DataCategory,
} from '../processing';

describe('FilterOperatorSchema', () => {
  it('should validate all supported operators', () => {
    const validOperators: FilterOperator[] = [
      'eq',
      'ne',
      'gt',
      'gte',
      'lt',
      'lte',
      'contains',
      'startsWith',
      'endsWith',
      'regex',
      'in',
      'notIn',
      'exists',
      'notExists',
      'between',
      'range',
      'isEmpty',
      'isNotEmpty',
    ];

    validOperators.forEach(operator => {
      expect(() => FilterOperatorSchema.parse(operator)).not.toThrow();
    });
  });

  it('should reject invalid operators', () => {
    expect(() => FilterOperatorSchema.parse('invalid')).toThrow();
    expect(() => FilterOperatorSchema.parse('')).toThrow();
    expect(() => FilterOperatorSchema.parse(null)).toThrow();
  });
});

describe('FilterConditionSchema', () => {
  it('should validate valid filter condition', () => {
    const validCondition: FilterCondition = {
      field: 'status',
      operator: 'eq',
      value: 'open',
      caseSensitive: true,
      negate: false,
    };

    expect(() => FilterConditionSchema.parse(validCondition)).not.toThrow();
  });

  it('should use default values', () => {
    const minimalCondition = {
      field: 'status',
      operator: 'eq',
      value: 'open',
    };

    const result = FilterConditionSchema.parse(minimalCondition);
    expect(result.caseSensitive).toBe(false);
    expect(result.negate).toBe(false);
  });

  it('should validate different value types', () => {
    const testCases = [
      { field: 'name', operator: 'eq', value: 'test' },
      { field: 'count', operator: 'gt', value: 5 },
      { field: 'active', operator: 'eq', value: true },
      { field: 'tags', operator: 'in', value: ['bug', 'feature'] },
      { field: 'optional', operator: 'exists', value: null },
    ];

    testCases.forEach(testCase => {
      expect(() => FilterConditionSchema.parse(testCase)).not.toThrow();
    });
  });

  it('should reject empty field name', () => {
    const invalidCondition = {
      field: '',
      operator: 'eq',
      value: 'test',
    };

    expect(() => FilterConditionSchema.parse(invalidCondition)).toThrow();
  });

  it('should reject invalid operator', () => {
    const invalidCondition = {
      field: 'status',
      operator: 'invalid',
      value: 'open',
    };

    expect(() => FilterConditionSchema.parse(invalidCondition)).toThrow();
  });
});

describe('FilterGroupSchema', () => {
  it('should validate valid filter group', () => {
    const validGroup: FilterGroup = {
      operator: 'and',
      conditions: [
        { field: 'status', operator: 'eq', value: 'open', caseSensitive: false, negate: false },
        { field: 'priority', operator: 'eq', value: 'high', caseSensitive: false, negate: false },
      ],
      groups: [
        {
          operator: 'or',
          conditions: [
            {
              field: 'label',
              operator: 'contains',
              value: 'bug',
              caseSensitive: false,
              negate: false,
            },
            {
              field: 'label',
              operator: 'contains',
              value: 'critical',
              caseSensitive: false,
              negate: false,
            },
          ],
        },
      ],
    };

    expect(() => FilterGroupSchema.parse(validGroup)).not.toThrow();
  });

  it('should use default operator', () => {
    const minimalGroup = {
      conditions: [{ field: 'status', operator: 'eq', value: 'open' }],
    };

    const result = FilterGroupSchema.parse(minimalGroup);
    expect(result.operator).toBe('and');
  });

  it('should validate nested groups', () => {
    const nestedGroup: FilterGroup = {
      operator: 'or',
      conditions: [],
      groups: [
        {
          operator: 'and',
          conditions: [
            {
              field: 'priority',
              operator: 'eq',
              value: 'high',
              caseSensitive: false,
              negate: false,
            },
          ],
          groups: [
            {
              operator: 'or',
              conditions: [
                {
                  field: 'assignee',
                  operator: 'eq',
                  value: 'user1',
                  caseSensitive: false,
                  negate: false,
                },
              ],
            },
          ],
        },
      ],
    };

    expect(() => FilterGroupSchema.parse(nestedGroup)).not.toThrow();
  });

  it('should reject invalid operator', () => {
    const invalidGroup = {
      operator: 'invalid',
      conditions: [{ field: 'status', operator: 'eq', value: 'open' }],
    };

    expect(() => FilterGroupSchema.parse(invalidGroup)).toThrow();
  });
});

describe('SortConfigSchema', () => {
  it('should validate valid sort config', () => {
    const validSort: SortConfig = {
      field: 'created_at',
      direction: 'desc',
      nullsFirst: true,
      caseSensitive: false,
    };

    expect(() => SortConfigSchema.parse(validSort)).not.toThrow();
  });

  it('should use default values', () => {
    const minimalSort = {
      field: 'title',
    };

    const result = SortConfigSchema.parse(minimalSort);
    expect(result.direction).toBe('asc');
    expect(result.nullsFirst).toBe(false);
    expect(result.caseSensitive).toBe(true);
  });

  it('should reject empty field name', () => {
    const invalidSort = {
      field: '',
      direction: 'asc',
    };

    expect(() => SortConfigSchema.parse(invalidSort)).toThrow();
  });

  it('should reject invalid direction', () => {
    const invalidSort = {
      field: 'title',
      direction: 'invalid',
    };

    expect(() => SortConfigSchema.parse(invalidSort)).toThrow();
  });
});

describe('DataProcessingOptionsSchema', () => {
  it('should validate valid processing options', () => {
    const validOptions: DataProcessingOptions = {
      filters: [
        {
          operator: 'and',
          conditions: [
            { field: 'status', operator: 'eq', value: 'open', caseSensitive: false, negate: false },
          ],
        },
      ],
      sort: [{ field: 'created_at', direction: 'desc', caseSensitive: true, nullsFirst: false }],
      limit: 50,
      offset: 10,
      fields: ['id', 'title', 'status'],
      excludeFields: ['body'],
      includeMetadata: true,
      includeCount: true,
      groupBy: ['status', 'priority'],
      aggregations: [
        { field: 'count', operation: 'count', alias: 'total_issues' },
        { field: 'priority', operation: 'distinct' },
      ],
    };

    expect(() => DataProcessingOptionsSchema.parse(validOptions)).not.toThrow();
  });

  it('should use default values', () => {
    const minimalOptions = {};

    const result = DataProcessingOptionsSchema.parse(minimalOptions);
    expect(result.offset).toBe(0);
    expect(result.includeMetadata).toBe(false);
    expect(result.includeCount).toBe(false);
  });

  it('should reject invalid limit values', () => {
    expect(() => DataProcessingOptionsSchema.parse({ limit: 0 })).toThrow();
    expect(() => DataProcessingOptionsSchema.parse({ limit: 1001 })).toThrow();
  });

  it('should reject negative offset', () => {
    expect(() => DataProcessingOptionsSchema.parse({ offset: -1 })).toThrow();
  });

  it('should validate aggregation operations', () => {
    const validAggregations = [
      { field: 'count', operation: 'count' },
      { field: 'price', operation: 'sum' },
      { field: 'score', operation: 'avg' },
      { field: 'value', operation: 'min' },
      { field: 'value', operation: 'max' },
      { field: 'category', operation: 'distinct' },
    ];

    validAggregations.forEach(agg => {
      const options = { aggregations: [agg] };
      expect(() => DataProcessingOptionsSchema.parse(options)).not.toThrow();
    });
  });
});

describe('IssueProcessingOptionsSchema', () => {
  it('should validate valid issue processing options', () => {
    const validOptions: IssueProcessingOptions = {
      includeClosedIssues: true,
      includePullRequests: true,
      classifyAutomatically: true,
      calculateMetrics: true,
      analyzeSentiment: true,
      detectDuplicates: true,
      extractEntities: true,
      enrichWithCommits: true,
      timeRangeStart: '2023-01-01T00:00:00Z',
      timeRangeEnd: '2023-12-31T23:59:59Z',
      labelFilters: ['bug', 'feature'],
      assigneeFilters: ['user1', 'user2'],
      milestoneFilters: ['v1.0', 'v2.0'],
      priorityFilters: ['high', 'critical'],
      statusFilters: ['open', 'in_progress'],
    };

    expect(() => IssueProcessingOptionsSchema.parse(validOptions)).not.toThrow();
  });

  it('should use default values', () => {
    const minimalOptions = {};

    const result = IssueProcessingOptionsSchema.parse(minimalOptions);
    expect(result.includeClosedIssues).toBe(false);
    expect(result.includePullRequests).toBe(false);
    expect(result.classifyAutomatically).toBe(true);
    expect(result.calculateMetrics).toBe(true);
    expect(result.analyzeSentiment).toBe(false);
    expect(result.detectDuplicates).toBe(false);
    expect(result.extractEntities).toBe(false);
    expect(result.enrichWithCommits).toBe(false);
  });

  it('should validate priority filters', () => {
    const validPriorities = ['low', 'medium', 'high', 'critical'];

    validPriorities.forEach(priority => {
      const options = { priorityFilters: [priority] };
      expect(() => IssueProcessingOptionsSchema.parse(options)).not.toThrow();
    });

    expect(() =>
      IssueProcessingOptionsSchema.parse({
        priorityFilters: ['invalid'],
      })
    ).toThrow();
  });

  it('should validate status filters', () => {
    const validStatuses = ['open', 'closed', 'in_progress', 'resolved'];

    validStatuses.forEach(status => {
      const options = { statusFilters: [status] };
      expect(() => IssueProcessingOptionsSchema.parse(options)).not.toThrow();
    });

    expect(() =>
      IssueProcessingOptionsSchema.parse({
        statusFilters: ['invalid'],
      })
    ).toThrow();
  });
});

describe('DataTransformationSchema', () => {
  it('should validate valid transformation', () => {
    const validTransformation: DataTransformation = {
      type: 'map',
      name: 'normalize_labels',
      description: 'Normalize issue labels',
      config: {
        mapping: { Bug: 'bug', Feature: 'feature' },
        defaultValue: 'other',
      },
      order: 1,
      enabled: true,
      conditions: [
        { field: 'labels', operator: 'exists', value: null, caseSensitive: false, negate: false },
      ],
    };

    expect(() => DataTransformationSchema.parse(validTransformation)).not.toThrow();
  });

  it('should use default values', () => {
    const minimalTransformation = {
      type: 'filter',
      name: 'remove_closed',
      config: { field: 'status', value: 'closed' },
    };

    const result = DataTransformationSchema.parse(minimalTransformation);
    expect(result.order).toBe(0);
    expect(result.enabled).toBe(true);
  });

  it('should validate transformation types', () => {
    const validTypes = ['map', 'filter', 'reduce', 'group', 'sort', 'join', 'aggregate'];

    validTypes.forEach(type => {
      const transformation = {
        type,
        name: `test_${type}`,
        config: {},
      };
      expect(() => DataTransformationSchema.parse(transformation)).not.toThrow();
    });
  });

  it('should reject empty name', () => {
    const invalidTransformation = {
      type: 'map',
      name: '',
      config: {},
    };

    expect(() => DataTransformationSchema.parse(invalidTransformation)).toThrow();
  });
});

describe('DataPipelineSchema', () => {
  it('should validate valid pipeline', () => {
    const validPipeline: DataPipeline = {
      id: 'pipeline-1',
      name: 'Issue Processing Pipeline',
      description: 'Process GitHub issues',
      version: '2.0.0',
      source: {
        type: 'github',
        config: { owner: 'test', repo: 'test' },
      },
      transformations: [
        {
          type: 'filter',
          name: 'filter_open',
          config: { field: 'state', value: 'open' },
          order: 1,
          enabled: true,
        },
      ],
      output: {
        type: 'json',
        config: { format: 'pretty' },
      },
      schedule: {
        enabled: true,
        cron: '0 */6 * * *',
        timezone: 'UTC',
        retryPolicy: {
          maxRetries: 3,
          retryDelay: 5000,
          backoffMultiplier: 2,
        },
      },
      monitoring: {
        enabled: true,
        alertOnFailure: true,
        metrics: ['duration', 'success_rate'],
      },
      metadata: { creator: 'user1' },
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T12:00:00Z',
      createdBy: 'user1',
      enabled: true,
    };

    expect(() => DataPipelineSchema.parse(validPipeline)).not.toThrow();
  });

  it('should use default values', () => {
    const minimalPipeline = {
      id: 'pipeline-1',
      name: 'Test Pipeline',
      source: {
        type: 'api',
        config: { url: 'https://api.example.com' },
      },
      output: {
        type: 'json',
        config: {},
      },
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T12:00:00Z',
    };

    const result = DataPipelineSchema.parse(minimalPipeline);
    expect(result.version).toBe('1.0.0');
    expect(result.transformations).toEqual([]);
    expect(result.enabled).toBe(true);
  });

  it('should validate source types', () => {
    const validSources = ['github', 'api', 'file', 'database'];

    validSources.forEach(type => {
      const pipeline = {
        id: 'test',
        name: 'test',
        source: { type, config: {} },
        output: { type: 'json', config: {} },
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T12:00:00Z',
      };
      expect(() => DataPipelineSchema.parse(pipeline)).not.toThrow();
    });
  });

  it('should validate output types', () => {
    const validOutputs = ['json', 'csv', 'database', 'api'];

    validOutputs.forEach(type => {
      const pipeline = {
        id: 'test',
        name: 'test',
        source: { type: 'api', config: {} },
        output: { type, config: {} },
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T12:00:00Z',
      };
      expect(() => DataPipelineSchema.parse(pipeline)).not.toThrow();
    });
  });
});

describe('DataValidationRuleSchema', () => {
  it('should validate valid validation rule', () => {
    const validRule: DataValidationRule = {
      field: 'email',
      type: 'format',
      config: { pattern: '^[^@]+@[^@]+\\.[^@]+$' },
      message: 'Invalid email format',
      severity: 'error',
      enabled: true,
    };

    expect(() => DataValidationRuleSchema.parse(validRule)).not.toThrow();
  });

  it('should use default values', () => {
    const minimalRule = {
      field: 'name',
      type: 'required',
      config: {},
      message: 'Name is required',
    };

    const result = DataValidationRuleSchema.parse(minimalRule);
    expect(result.severity).toBe('error');
    expect(result.enabled).toBe(true);
  });

  it('should validate rule types', () => {
    const validTypes = ['required', 'type', 'format', 'range', 'custom'];

    validTypes.forEach(type => {
      const rule = {
        field: 'test',
        type,
        config: {},
        message: 'Test message',
      };
      expect(() => DataValidationRuleSchema.parse(rule)).not.toThrow();
    });
  });

  it('should validate severity levels', () => {
    const validSeverities = ['error', 'warning', 'info'];

    validSeverities.forEach(severity => {
      const rule = {
        field: 'test',
        type: 'required',
        config: {},
        message: 'Test message',
        severity,
      };
      expect(() => DataValidationRuleSchema.parse(rule)).not.toThrow();
    });
  });
});

describe('DataQualityAssessmentSchema', () => {
  it('should validate valid quality assessment', () => {
    const validAssessment: DataQualityAssessment = {
      totalRecords: 1000,
      validRecords: 950,
      invalidRecords: 50,
      qualityScore: 95,
      issues: [
        {
          field: 'email',
          issue: 'Invalid format',
          count: 25,
          severity: 'error',
          examples: ['invalid-email', 'another@'],
        },
      ],
      metrics: {
        completeness: 98,
        accuracy: 95,
        consistency: 92,
        timeliness: 90,
        uniqueness: 99,
      },
      assessedAt: '2023-01-01T00:00:00Z',
      assessedBy: 'quality-service',
    };

    expect(() => DataQualityAssessmentSchema.parse(validAssessment)).not.toThrow();
  });

  it('should use default empty issues array', () => {
    const minimalAssessment = {
      totalRecords: 100,
      validRecords: 95,
      invalidRecords: 5,
      qualityScore: 95,
      metrics: {
        completeness: 95,
        accuracy: 95,
        consistency: 95,
        timeliness: 95,
        uniqueness: 95,
      },
      assessedAt: '2023-01-01T00:00:00Z',
    };

    const result = DataQualityAssessmentSchema.parse(minimalAssessment);
    expect(result.issues).toEqual([]);
  });

  it('should reject invalid percentage values', () => {
    const invalidAssessment = {
      totalRecords: 100,
      validRecords: 95,
      invalidRecords: 5,
      qualityScore: 150, // Invalid: over 100%
      metrics: {
        completeness: 95,
        accuracy: 95,
        consistency: 95,
        timeliness: 95,
        uniqueness: 95,
      },
      assessedAt: '2023-01-01T00:00:00Z',
    };

    expect(() => DataQualityAssessmentSchema.parse(invalidAssessment)).toThrow();
  });
});

describe('DataExportConfigSchema', () => {
  it('should validate valid export config', () => {
    const validConfig: DataExportConfig = {
      format: 'csv',
      compression: 'gzip',
      includeHeaders: true,
      includeMetadata: true,
      dateFormat: 'ISO',
      timezone: 'UTC',
      encoding: 'utf-8',
      delimiter: ',',
      template: 'custom-template',
      fields: [
        {
          name: 'id',
          label: 'Issue ID',
          type: 'number',
          format: 'integer',
        },
      ],
      maxRecords: 5000,
      chunkSize: 500,
    };

    expect(() => DataExportConfigSchema.parse(validConfig)).not.toThrow();
  });

  it('should use default values', () => {
    const minimalConfig = {
      format: 'json',
    };

    const result = DataExportConfigSchema.parse(minimalConfig);
    expect(result.compression).toBe('none');
    expect(result.includeHeaders).toBe(true);
    expect(result.includeMetadata).toBe(false);
    expect(result.dateFormat).toBe('ISO');
    expect(result.timezone).toBe('UTC');
    expect(result.encoding).toBe('utf-8');
    expect(result.delimiter).toBe(',');
    expect(result.maxRecords).toBe(10000);
    expect(result.chunkSize).toBe(1000);
  });

  it('should validate format types', () => {
    const validFormats = ['json', 'csv', 'excel', 'xml', 'pdf', 'html'];

    validFormats.forEach(format => {
      const config = { format };
      expect(() => DataExportConfigSchema.parse(config)).not.toThrow();
    });
  });

  it('should reject invalid maxRecords', () => {
    expect(() =>
      DataExportConfigSchema.parse({
        format: 'json',
        maxRecords: 0,
      })
    ).toThrow();

    expect(() =>
      DataExportConfigSchema.parse({
        format: 'json',
        maxRecords: 100001,
      })
    ).toThrow();
  });
});

describe('ProcessingResultSchema', () => {
  it('should validate valid processing result', () => {
    const validResult: ProcessingResult = {
      success: true,
      processed: 1000,
      successful: 950,
      failed: 30,
      skipped: 20,
      errors: [
        {
          record: 123,
          field: 'email',
          error: 'Invalid email format',
          severity: 'error',
        },
      ],
      warnings: ['Some records were skipped'],
      metrics: { processing_time: 5000, memory_usage: 128 },
      output: { processed_data: [] },
      duration: 5000,
      startTime: '2023-01-01T00:00:00Z',
      endTime: '2023-01-01T00:05:00Z',
      metadata: { version: '1.0.0' },
    };

    expect(() => ProcessingResultSchema.parse(validResult)).not.toThrow();
  });

  it('should use default empty arrays and objects', () => {
    const minimalResult = {
      success: true,
      processed: 100,
      successful: 95,
      failed: 5,
      skipped: 0,
      duration: 1000,
      startTime: '2023-01-01T00:00:00Z',
      endTime: '2023-01-01T00:01:00Z',
    };

    const result = ProcessingResultSchema.parse(minimalResult);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.metrics).toEqual({});
  });

  it('should reject negative values', () => {
    const invalidResult = {
      success: true,
      processed: -1, // Invalid: negative
      successful: 95,
      failed: 5,
      skipped: 0,
      duration: 1000,
      startTime: '2023-01-01T00:00:00Z',
      endTime: '2023-01-01T00:01:00Z',
    };

    expect(() => ProcessingResultSchema.parse(invalidResult)).toThrow();
  });
});

describe('DataCategorySchema', () => {
  it('should validate valid data category', () => {
    const validCategory: DataCategory = {
      id: 'bug-reports',
      name: 'Bug Reports',
      description: 'Issues related to bugs',
      color: '#FF0000',
      icon: 'bug',
      parent: 'issues',
      children: ['ui-bugs', 'api-bugs'],
      keywords: ['bug', 'error', 'issue'],
      rules: [
        {
          field: 'title',
          pattern: 'bug|error|issue',
          weight: 0.8,
          type: 'regex',
        },
      ],
      priority: 1,
      enabled: true,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T12:00:00Z',
    };

    expect(() => DataCategorySchema.parse(validCategory)).not.toThrow();
  });

  it('should use default values', () => {
    const minimalCategory = {
      id: 'test-category',
      name: 'Test Category',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T12:00:00Z',
    };

    const result = DataCategorySchema.parse(minimalCategory);
    expect(result.children).toEqual([]);
    expect(result.keywords).toEqual([]);
    expect(result.rules).toEqual([]);
    expect(result.priority).toBe(0);
    expect(result.enabled).toBe(true);
  });

  it('should validate hex color format', () => {
    const validColors = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF', '#000000'];

    validColors.forEach(color => {
      const category = {
        id: 'test',
        name: 'Test',
        color,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T12:00:00Z',
      };
      expect(() => DataCategorySchema.parse(category)).not.toThrow();
    });

    const invalidColors = ['red', '#FFF', '#GGGGGG', 'rgb(255,0,0)'];

    invalidColors.forEach(color => {
      const category = {
        id: 'test',
        name: 'Test',
        color,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T12:00:00Z',
      };
      expect(() => DataCategorySchema.parse(category)).toThrow();
    });
  });

  it('should validate rule types', () => {
    const validRuleTypes = ['exact', 'contains', 'regex', 'semantic'];

    validRuleTypes.forEach(type => {
      const category = {
        id: 'test',
        name: 'Test',
        rules: [
          {
            field: 'title',
            pattern: 'test',
            type,
          },
        ],
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T12:00:00Z',
      };
      expect(() => DataCategorySchema.parse(category)).not.toThrow();
    });
  });
});

describe('validateProcessingData', () => {
  it('should return success for valid data', () => {
    const validData = {
      field: 'status',
      operator: 'eq',
      value: 'open',
    };

    const result = validateProcessingData(FilterConditionSchema, validData);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(expect.objectContaining(validData));
  });

  it('should return error for invalid data', () => {
    const invalidData = {
      field: '',
      operator: 'invalid',
      value: 'open',
    };

    const result = validateProcessingData(FilterConditionSchema, invalidData);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it('should throw for non-Zod errors', () => {
    const mockSchema = {
      parse: () => {
        throw new Error('Non-Zod error');
      },
    } as any;

    expect(() => validateProcessingData(mockSchema, {})).toThrow('Non-Zod error');
  });
});

describe('applyFilters', () => {
  const testData = [
    { id: 1, status: 'open', priority: 'high', label: 'bug' },
    { id: 2, status: 'closed', priority: 'medium', label: 'feature' },
    { id: 3, status: 'open', priority: 'low', label: 'bug' },
    { id: 4, status: 'in_progress', priority: 'high', label: 'enhancement' },
  ];

  it('should return all data when no filters provided', () => {
    const result = applyFilters(testData, []);
    expect(result).toEqual(testData);
  });

  it('should filter data with single condition', () => {
    const filters: FilterGroup[] = [
      {
        operator: 'and',
        conditions: [
          { field: 'status', operator: 'eq', value: 'open', caseSensitive: false, negate: false },
        ],
      },
    ];

    const result = applyFilters(testData, filters);
    expect(result).toHaveLength(2);
    expect(result.every(item => item.status === 'open')).toBe(true);
  });

  it('should filter data with multiple AND conditions', () => {
    const filters: FilterGroup[] = [
      {
        operator: 'and',
        conditions: [
          { field: 'status', operator: 'eq', value: 'open', caseSensitive: false, negate: false },
          { field: 'priority', operator: 'eq', value: 'high', caseSensitive: false, negate: false },
        ],
      },
    ];

    const result = applyFilters(testData, filters);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(1);
  });

  it('should filter data with OR conditions', () => {
    const filters: FilterGroup[] = [
      {
        operator: 'or',
        conditions: [
          { field: 'priority', operator: 'eq', value: 'high', caseSensitive: false, negate: false },
          { field: 'label', operator: 'eq', value: 'feature', caseSensitive: false, negate: false },
        ],
      },
    ];

    const result = applyFilters(testData, filters);
    expect(result).toHaveLength(3);
  });

  it('should handle contains operator', () => {
    const filters: FilterGroup[] = [
      {
        operator: 'and',
        conditions: [
          {
            field: 'label',
            operator: 'contains',
            value: 'ug',
            caseSensitive: false,
            negate: false,
          },
        ],
      },
    ];

    const result = applyFilters(testData, filters);
    expect(result).toHaveLength(2);
    expect(result.every(item => item.label.includes('ug'))).toBe(true);
  });

  it('should handle in operator', () => {
    const filters: FilterGroup[] = [
      {
        operator: 'and',
        conditions: [
          {
            field: 'status',
            operator: 'in',
            value: ['open', 'closed'],
            caseSensitive: false,
            negate: false,
          },
        ],
      },
    ];

    const result = applyFilters(testData, filters);
    expect(result).toHaveLength(3);
  });

  it('should handle nested filter groups', () => {
    const filters: FilterGroup[] = [
      {
        operator: 'and',
        conditions: [
          { field: 'status', operator: 'eq', value: 'open', caseSensitive: false, negate: false },
        ],
        groups: [
          {
            operator: 'or',
            conditions: [
              {
                field: 'priority',
                operator: 'eq',
                value: 'high',
                caseSensitive: false,
                negate: false,
              },
              { field: 'label', operator: 'eq', value: 'bug', caseSensitive: false, negate: false },
            ],
          },
        ],
      },
    ];

    const result = applyFilters(testData, filters);
    expect(result).toHaveLength(2);
  });

  it('should handle negate condition', () => {
    const filters: FilterGroup[] = [
      {
        operator: 'and',
        conditions: [
          { field: 'status', operator: 'eq', value: 'open', negate: true, caseSensitive: false },
        ],
      },
    ];

    const result = applyFilters(testData, filters);
    expect(result).toHaveLength(2);
    expect(result.every(item => item.status !== 'open')).toBe(true);
  });

  it('should handle dot notation field access', () => {
    const nestedData = [
      { id: 1, meta: { status: 'active' } },
      { id: 2, meta: { status: 'inactive' } },
    ];

    const filters: FilterGroup[] = [
      {
        operator: 'and',
        conditions: [
          {
            field: 'meta.status',
            operator: 'eq',
            value: 'active',
            caseSensitive: false,
            negate: false,
          },
        ],
      },
    ];

    const result = applyFilters(nestedData, filters);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(1);
  });
});

describe('createDefaultProcessingOptions', () => {
  it('should create valid default processing options', () => {
    const options = createDefaultProcessingOptions();
    expect(() => DataProcessingOptionsSchema.parse(options)).not.toThrow();
  });

  it('should set correct default values', () => {
    const options = createDefaultProcessingOptions();
    expect(options.offset).toBe(0);
    expect(options.includeMetadata).toBe(false);
    expect(options.includeCount).toBe(false);
  });
});

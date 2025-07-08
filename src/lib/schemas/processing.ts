/**
 * Data Processing Schemas
 *
 * Zod schemas for data processing, filtering, transformation, and analysis.
 * These schemas ensure type safety for data operations and transformations.
 */

import { z } from 'zod';

/**
 * Filter operator schema
 */
export const FilterOperatorSchema = z.enum([
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
]);

export type FilterOperator = z.infer<typeof FilterOperatorSchema>;

/**
 * Filter condition schema
 */
export const FilterConditionSchema = z.object({
  field: z.string().min(1, 'Field is required'),
  operator: FilterOperatorSchema,
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.union([z.string(), z.number()])),
    z.null(),
  ]),
  caseSensitive: z.boolean().default(false),
  negate: z.boolean().default(false),
});

export type FilterCondition = z.infer<typeof FilterConditionSchema>;

/**
 * Filter group schema for complex filtering
 */
export const FilterGroupSchema: z.ZodType<any> = z.object({
  operator: z.enum(['and', 'or']).default('and'),
  conditions: z.array(FilterConditionSchema),
  groups: z.array(z.lazy(() => FilterGroupSchema)).optional(),
});

export type FilterGroup = {
  operator: 'and' | 'or';
  conditions: FilterCondition[];
  groups?: FilterGroup[];
};

/**
 * Sort configuration schema
 */
export const SortConfigSchema = z.object({
  field: z.string().min(1, 'Field is required'),
  direction: z.enum(['asc', 'desc']).default('asc'),
  nullsFirst: z.boolean().default(false),
  caseSensitive: z.boolean().default(true),
});

export type SortConfig = z.infer<typeof SortConfigSchema>;

/**
 * Data processing options schema
 */
export const DataProcessingOptionsSchema = z.object({
  filters: z.array(FilterGroupSchema).optional(),
  sort: z.array(SortConfigSchema).optional(),
  limit: z.number().int().min(1).max(1000).optional(),
  offset: z.number().int().min(0).default(0),
  fields: z.array(z.string()).optional(), // Select specific fields
  excludeFields: z.array(z.string()).optional(), // Exclude specific fields
  includeMetadata: z.boolean().default(false),
  includeCount: z.boolean().default(false),
  groupBy: z.array(z.string()).optional(),
  aggregations: z
    .array(
      z.object({
        field: z.string().min(1, 'Field is required'),
        operation: z.enum(['count', 'sum', 'avg', 'min', 'max', 'distinct']),
        alias: z.string().optional(),
      })
    )
    .optional(),
});

export type DataProcessingOptions = z.infer<typeof DataProcessingOptionsSchema>;

/**
 * Issue processing options schema
 */
export const IssueProcessingOptionsSchema = z.object({
  includeClosedIssues: z.boolean().default(false),
  includePullRequests: z.boolean().default(false),
  classifyAutomatically: z.boolean().default(true),
  calculateMetrics: z.boolean().default(true),
  analyzeSentiment: z.boolean().default(false),
  detectDuplicates: z.boolean().default(false),
  extractEntities: z.boolean().default(false),
  enrichWithCommits: z.boolean().default(false),
  timeRangeStart: z.string().datetime().optional(),
  timeRangeEnd: z.string().datetime().optional(),
  labelFilters: z.array(z.string()).optional(),
  assigneeFilters: z.array(z.string()).optional(),
  milestoneFilters: z.array(z.string()).optional(),
  priorityFilters: z.array(z.enum(['low', 'medium', 'high', 'critical'])).optional(),
  statusFilters: z.array(z.enum(['open', 'closed', 'in_progress', 'resolved'])).optional(),
});

export type IssueProcessingOptions = z.infer<typeof IssueProcessingOptionsSchema>;

/**
 * Data transformation schema
 */
export const DataTransformationSchema = z.object({
  type: z.enum(['map', 'filter', 'reduce', 'group', 'sort', 'join', 'aggregate']),
  name: z.string().min(1, 'Transformation name is required'),
  description: z.string().optional(),
  config: z.record(z.any()),
  order: z.number().int().min(0).default(0),
  enabled: z.boolean().default(true),
  conditions: z.array(FilterConditionSchema).optional(),
});

export type DataTransformation = z.infer<typeof DataTransformationSchema>;

/**
 * Data pipeline schema
 */
export const DataPipelineSchema = z.object({
  id: z.string().min(1, 'Pipeline ID is required'),
  name: z.string().min(1, 'Pipeline name is required'),
  description: z.string().optional(),
  version: z.string().default('1.0.0'),
  source: z.object({
    type: z.enum(['github', 'api', 'file', 'database']),
    config: z.record(z.any()),
  }),
  transformations: z.array(DataTransformationSchema).default([]),
  output: z.object({
    type: z.enum(['json', 'csv', 'database', 'api']),
    config: z.record(z.any()),
  }),
  schedule: z
    .object({
      enabled: z.boolean().default(false),
      cron: z.string().optional(),
      timezone: z.string().default('UTC'),
      retryPolicy: z
        .object({
          maxRetries: z.number().int().min(0).default(3),
          retryDelay: z.number().int().min(1000).default(5000),
          backoffMultiplier: z.number().min(1).default(2),
        })
        .optional(),
    })
    .optional(),
  monitoring: z
    .object({
      enabled: z.boolean().default(true),
      alertOnFailure: z.boolean().default(true),
      metrics: z.array(z.string()).default(['duration', 'success_rate', 'error_count']),
    })
    .optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdBy: z.string().optional(),
  enabled: z.boolean().default(true),
});

export type DataPipeline = z.infer<typeof DataPipelineSchema>;

/**
 * Data validation rule schema
 */
export const DataValidationRuleSchema = z.object({
  field: z.string().min(1, 'Field is required'),
  type: z.enum(['required', 'type', 'format', 'range', 'custom']),
  config: z.record(z.any()),
  message: z.string().min(1, 'Error message is required'),
  severity: z.enum(['error', 'warning', 'info']).default('error'),
  enabled: z.boolean().default(true),
});

export type DataValidationRule = z.infer<typeof DataValidationRuleSchema>;

/**
 * Data quality assessment schema
 */
export const DataQualityAssessmentSchema = z.object({
  totalRecords: z.number().int().min(0),
  validRecords: z.number().int().min(0),
  invalidRecords: z.number().int().min(0),
  qualityScore: z.number().min(0).max(100), // percentage
  issues: z
    .array(
      z.object({
        field: z.string(),
        issue: z.string(),
        count: z.number().int().min(0),
        severity: z.enum(['error', 'warning', 'info']),
        examples: z.array(z.any()).optional(),
      })
    )
    .default([]),
  metrics: z.object({
    completeness: z.number().min(0).max(100), // percentage
    accuracy: z.number().min(0).max(100), // percentage
    consistency: z.number().min(0).max(100), // percentage
    timeliness: z.number().min(0).max(100), // percentage
    uniqueness: z.number().min(0).max(100), // percentage
  }),
  assessedAt: z.string().datetime(),
  assessedBy: z.string().optional(),
});

export type DataQualityAssessment = z.infer<typeof DataQualityAssessmentSchema>;

/**
 * Data export configuration schema
 */
export const DataExportConfigSchema = z.object({
  format: z.enum(['json', 'csv', 'excel', 'xml', 'pdf', 'html']),
  compression: z.enum(['none', 'gzip', 'zip']).default('none'),
  includeHeaders: z.boolean().default(true),
  includeMetadata: z.boolean().default(false),
  dateFormat: z.string().default('ISO'),
  timezone: z.string().default('UTC'),
  encoding: z.string().default('utf-8'),
  delimiter: z.string().default(','), // For CSV
  template: z.string().optional(), // For custom formats
  fields: z
    .array(
      z.object({
        name: z.string().min(1, 'Field name is required'),
        label: z.string().optional(),
        type: z.enum(['string', 'number', 'boolean', 'date', 'object', 'array']).optional(),
        format: z.string().optional(),
        transform: z.string().optional(), // Transformation function
      })
    )
    .optional(),
  filters: DataProcessingOptionsSchema.optional(),
  maxRecords: z.number().int().min(1).max(100000).default(10000),
  chunkSize: z.number().int().min(100).max(10000).default(1000),
});

export type DataExportConfig = z.infer<typeof DataExportConfigSchema>;

/**
 * Data import configuration schema
 */
export const DataImportConfigSchema = z.object({
  source: z.enum(['file', 'url', 'database', 'api']),
  format: z.enum(['json', 'csv', 'excel', 'xml', 'yaml']),
  encoding: z.string().default('utf-8'),
  delimiter: z.string().default(','), // For CSV
  hasHeaders: z.boolean().default(true),
  skipRows: z.number().int().min(0).default(0),
  maxRows: z.number().int().min(1).optional(),
  fieldMapping: z.record(z.string()).optional(), // Map source fields to target fields
  transformations: z.array(DataTransformationSchema).optional(),
  validationRules: z.array(DataValidationRuleSchema).optional(),
  onError: z.enum(['skip', 'stop', 'log']).default('log'),
  batchSize: z.number().int().min(1).max(10000).default(1000),
  preview: z.boolean().default(false),
  previewRows: z.number().int().min(1).max(100).default(10),
});

export type DataImportConfig = z.infer<typeof DataImportConfigSchema>;

/**
 * Processing result schema
 */
export const ProcessingResultSchema = z.object({
  success: z.boolean(),
  processed: z.number().int().min(0),
  successful: z.number().int().min(0),
  failed: z.number().int().min(0),
  skipped: z.number().int().min(0),
  errors: z
    .array(
      z.object({
        record: z.number().int().min(0),
        field: z.string().optional(),
        error: z.string().min(1, 'Error message is required'),
        severity: z.enum(['error', 'warning', 'info']).default('error'),
      })
    )
    .default([]),
  warnings: z.array(z.string()).default([]),
  metrics: z.record(z.number()).default({}),
  output: z.any().optional(),
  duration: z.number().min(0), // in milliseconds
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  metadata: z.record(z.any()).optional(),
});

export type ProcessingResult = z.infer<typeof ProcessingResultSchema>;

/**
 * Data classification category schema
 */
export const ClassificationCategorySchema = z.object({
  id: z.string().min(1, 'Category ID is required'),
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color')
    .optional(),
  icon: z.string().optional(),
  parent: z.string().optional(), // Parent category ID
  children: z.array(z.string()).default([]), // Child category IDs
  keywords: z.array(z.string()).default([]),
  rules: z
    .array(
      z.object({
        field: z.string().min(1, 'Field is required'),
        pattern: z.string().min(1, 'Pattern is required'),
        weight: z.number().min(0).max(1).default(1),
        type: z.enum(['exact', 'contains', 'regex', 'semantic']).default('contains'),
      })
    )
    .default([]),
  priority: z.number().int().min(0).default(0),
  enabled: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ClassificationCategory = z.infer<typeof ClassificationCategorySchema>;

/**
 * Validation helper for processing data
 */
export function validateProcessingData<T>(
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
 * Apply filters to data
 */
export function applyFilters<T>(data: T[], filters: FilterGroup[]): T[] {
  if (!filters || filters.length === 0) return data;

  return data.filter(item => {
    return filters.every(filterGroup => evaluateFilterGroup(item, filterGroup));
  });
}

/**
 * Evaluate filter group against data item
 */
function evaluateFilterGroup<T>(item: T, filterGroup: FilterGroup): boolean {
  const conditionResults = filterGroup.conditions.map((condition: FilterCondition) =>
    evaluateFilterCondition(item, condition)
  );

  const groupResults =
    filterGroup.groups?.map((group: FilterGroup) => evaluateFilterGroup(item, group)) || [];

  const allResults = [...conditionResults, ...groupResults];

  if (filterGroup.operator === 'and') {
    return allResults.every(result => result);
  } else {
    return allResults.some(result => result);
  }
}

/**
 * Evaluate filter condition against data item
 */
function evaluateFilterCondition<T>(item: T, condition: FilterCondition): boolean {
  const value = getFieldValue(item, condition.field);
  const conditionValue = condition.value;

  let result = false;

  switch (condition.operator) {
    case 'eq':
      result = value === conditionValue;
      break;
    case 'ne':
      result = value !== conditionValue;
      break;
    case 'gt':
      result = (value as number) > (conditionValue as number);
      break;
    case 'gte':
      result = (value as number) >= (conditionValue as number);
      break;
    case 'lt':
      result = (value as number) < (conditionValue as number);
      break;
    case 'lte':
      result = (value as number) <= (conditionValue as number);
      break;
    case 'contains':
      result = String(value).includes(String(conditionValue));
      break;
    case 'startsWith':
      result = String(value).startsWith(String(conditionValue));
      break;
    case 'endsWith':
      result = String(value).endsWith(String(conditionValue));
      break;
    case 'in':
      result = Array.isArray(conditionValue) && conditionValue.includes(value as string | number);
      break;
    case 'notIn':
      result = Array.isArray(conditionValue) && !conditionValue.includes(value as string | number);
      break;
    case 'exists':
      result = value !== undefined && value !== null;
      break;
    case 'notExists':
      result = value === undefined || value === null;
      break;
    case 'isEmpty':
      result = value === '' || value === null || value === undefined;
      break;
    case 'isNotEmpty':
      result = value !== '' && value !== null && value !== undefined;
      break;
    default:
      result = false;
  }

  return condition.negate ? !result : result;
}

/**
 * Get field value from object using dot notation
 */
function getFieldValue<T>(obj: T, path: string): unknown {
  return path.split('.').reduce((current: unknown, key: string) => {
    return current && typeof current === 'object' && key in current
      ? (current as Record<string, unknown>)[key]
      : undefined;
  }, obj as unknown);
}

/**
 * Create default processing options
 */
export function createDefaultProcessingOptions(): DataProcessingOptions {
  return DataProcessingOptionsSchema.parse({
    offset: 0,
    includeMetadata: false,
    includeCount: false,
  });
}

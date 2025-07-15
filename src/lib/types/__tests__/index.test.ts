/**
 * TypeScript Type Definitions Index Tests
 *
 * Tests for the main type definitions and utility types
 * Validates type safety, structure, and type transformations
 */

import { describe, it, expect } from 'vitest';
import type {
  VersionInfo,
  Result,
  Optional,
  NonEmptyArray,
  DeepPartial,
  DeepRequired,
} from '../index';

describe('Type Definitions Index', () => {
  describe('VersionInfo Type', () => {
    it('should validate complete VersionInfo structure', () => {
      const versionInfo: VersionInfo = {
        version: '1.0.0',
        timestamp: 1640995200000,
        buildId: 'build-123',
        gitCommit: 'abc123def456',
        environment: 'production',
        dataHash: 'hash123',
      };

      expect(versionInfo.version).toBe('1.0.0');
      expect(versionInfo.timestamp).toBe(1640995200000);
      expect(versionInfo.buildId).toBe('build-123');
      expect(versionInfo.gitCommit).toBe('abc123def456');
      expect(versionInfo.environment).toBe('production');
      expect(versionInfo.dataHash).toBe('hash123');
    });

    it('should validate VersionInfo without optional fields', () => {
      const versionInfo: VersionInfo = {
        version: '2.0.0',
        timestamp: 1640995200000,
        buildId: 'build-456',
        gitCommit: 'def789ghi012',
        environment: 'development',
      };

      expect(versionInfo.version).toBe('2.0.0');
      expect(versionInfo.environment).toBe('development');
      expect(versionInfo.dataHash).toBeUndefined();
    });

    it('should validate environment union types', () => {
      const environments: VersionInfo['environment'][] = ['development', 'production', 'staging'];

      environments.forEach(env => {
        const versionInfo: VersionInfo = {
          version: '1.0.0',
          timestamp: Date.now(),
          buildId: 'build-1',
          gitCommit: 'commit-1',
          environment: env,
        };

        expect(['development', 'production', 'staging']).toContain(versionInfo.environment);
      });
    });

    it('should validate timestamp as number', () => {
      const versionInfo: VersionInfo = {
        version: '1.0.0',
        timestamp: Date.now(),
        buildId: 'build-1',
        gitCommit: 'commit-1',
        environment: 'development',
      };

      expect(typeof versionInfo.timestamp).toBe('number');
      expect(versionInfo.timestamp).toBeGreaterThan(0);
    });
  });

  describe('Result Type', () => {
    it('should validate successful Result', () => {
      const successResult: Result<string> = {
        success: true,
        data: 'test-data',
      };

      expect(successResult.success).toBe(true);
      expect(successResult.data).toBe('test-data');
    });

    it('should validate failed Result with Error', () => {
      const failResult: Result<string, Error> = {
        success: false,
        error: new Error('Test error'),
      };

      expect(failResult.success).toBe(false);
      expect(failResult.error).toBeInstanceOf(Error);
      expect(failResult.error.message).toBe('Test error');
    });

    it('should validate failed Result with custom error type', () => {
      type CustomError = { code: string; message: string };
      const failResult: Result<string, CustomError> = {
        success: false,
        error: { code: 'CUSTOM_ERROR', message: 'Custom error message' },
      };

      expect(failResult.success).toBe(false);
      expect(failResult.error.code).toBe('CUSTOM_ERROR');
      expect(failResult.error.message).toBe('Custom error message');
    });

    it('should validate Result with complex data types', () => {
      interface ComplexData {
        id: number;
        name: string;
        items: string[];
      }

      const complexResult: Result<ComplexData> = {
        success: true,
        data: {
          id: 1,
          name: 'Test',
          items: ['item1', 'item2'],
        },
      };

      expect(complexResult.success).toBe(true);
      expect(complexResult.data.id).toBe(1);
      expect(complexResult.data.items).toEqual(['item1', 'item2']);
    });

    it('should validate Result discriminated union behavior', () => {
      const results: Result<string>[] = [
        { success: true, data: 'success' },
        { success: false, error: new Error('failed') },
      ];

      results.forEach(result => {
        if (result.success) {
          expect(result.data).toBe('success');
          // TypeScript should know this is the success case
          expect(typeof result.data).toBe('string');
        } else {
          expect(result.error).toBeInstanceOf(Error);
          expect(result.error.message).toBe('failed');
        }
      });
    });
  });

  describe('Optional Type', () => {
    interface TestInterface {
      required1: string;
      required2: number;
      optional1: boolean;
      optional2: string[];
    }

    it('should make specified properties optional', () => {
      const partialData: Optional<TestInterface, 'optional1' | 'optional2'> = {
        required1: 'test',
        required2: 42,
        // optional1 and optional2 are now optional
      };

      expect(partialData.required1).toBe('test');
      expect(partialData.required2).toBe(42);
      expect(partialData.optional1).toBeUndefined();
      expect(partialData.optional2).toBeUndefined();
    });

    it('should allow optional properties to be specified', () => {
      const fullData: Optional<TestInterface, 'optional1'> = {
        required1: 'test',
        required2: 42,
        optional1: true,
        optional2: ['item1', 'item2'],
      };

      expect(fullData.optional1).toBe(true);
      expect(fullData.optional2).toEqual(['item1', 'item2']);
    });

    it('should preserve required properties', () => {
      // This test ensures that required properties remain required
      const data: Optional<TestInterface, 'optional1'> = {
        required1: 'must be present',
        required2: 123,
        optional2: ['required'],
        // optional1 can be omitted
      };

      expect(data.required1).toBe('must be present');
      expect(data.required2).toBe(123);
      expect(data.optional2).toEqual(['required']);
    });
  });

  describe('NonEmptyArray Type', () => {
    it('should validate non-empty arrays', () => {
      const stringArray: NonEmptyArray<string> = ['first', 'second', 'third'];
      const numberArray: NonEmptyArray<number> = [1, 2, 3, 4];
      const singleItem: NonEmptyArray<boolean> = [true];

      expect(stringArray).toHaveLength(3);
      expect(stringArray[0]).toBe('first');

      expect(numberArray).toHaveLength(4);
      expect(numberArray[0]).toBe(1);

      expect(singleItem).toHaveLength(1);
      expect(singleItem[0]).toBe(true);
    });

    it('should guarantee at least one element', () => {
      const minArray: NonEmptyArray<string> = ['only-one'];
      expect(minArray).toHaveLength(1);
      expect(minArray[0]).toBe('only-one');
    });

    it('should work with complex types', () => {
      interface ComplexItem {
        id: number;
        name: string;
      }

      const complexArray: NonEmptyArray<ComplexItem> = [
        { id: 1, name: 'First' },
        { id: 2, name: 'Second' },
      ];

      expect(complexArray).toHaveLength(2);
      expect(complexArray[0].id).toBe(1);
      expect(complexArray[1]?.name).toBe('Second');
    });
  });

  describe('DeepPartial Type', () => {
    interface NestedInterface {
      level1: {
        level2: {
          level3: {
            value: string;
            number: number;
          };
          array: string[];
        };
        simple: boolean;
      };
      topLevel: string;
    }

    it('should make all properties optional recursively', () => {
      const partialData: DeepPartial<NestedInterface> = {
        level1: {
          level2: {
            level3: {
              value: 'test',
              // number can be omitted
            },
            // array can be omitted
          },
          // simple can be omitted
        },
        // topLevel can be omitted
      };

      expect(partialData.level1?.level2?.level3?.value).toBe('test');
      expect(partialData.level1?.level2?.level3?.number).toBeUndefined();
      expect(partialData.level1?.level2?.array).toBeUndefined();
      expect(partialData.level1?.simple).toBeUndefined();
      expect(partialData.topLevel).toBeUndefined();
    });

    it('should allow empty objects at any level', () => {
      const emptyData: DeepPartial<NestedInterface> = {};
      expect(emptyData).toEqual({});
    });

    it('should allow partial specification at any level', () => {
      const partialData: DeepPartial<NestedInterface> = {
        level1: {
          simple: true,
        },
        topLevel: 'specified',
      };

      expect(partialData.level1?.simple).toBe(true);
      expect(partialData.topLevel).toBe('specified');
      expect(partialData.level1?.level2).toBeUndefined();
    });
  });

  describe('DeepRequired Type', () => {
    interface PartialInterface {
      level1?: {
        level2?: {
          level3?: {
            value?: string;
            number?: number;
          };
          array?: string[];
        };
        simple?: boolean;
      };
      topLevel?: string;
    }

    it('should make all properties required recursively', () => {
      const requiredData: DeepRequired<PartialInterface> = {
        level1: {
          level2: {
            level3: {
              value: 'required',
              number: 42,
            },
            array: ['item1', 'item2'],
          },
          simple: true,
        },
        topLevel: 'required',
      };

      expect(requiredData.level1?.level2?.level3?.value).toBe('required');
      expect(requiredData.level1?.level2?.level3?.number).toBe(42);
      expect(requiredData.level1?.level2?.array).toEqual(['item1', 'item2']);
      expect(requiredData.level1.simple).toBe(true);
      expect(requiredData.topLevel).toBe('required');
    });

    it('should enforce all nested properties', () => {
      // This test demonstrates type checking (would fail compilation if properties were missing)
      const completeData: DeepRequired<PartialInterface> = {
        level1: {
          level2: {
            level3: {
              value: 'must be present',
              number: 123,
            },
            array: ['must', 'be', 'present'],
          },
          simple: false,
        },
        topLevel: 'must be present',
      };

      expect(completeData.level1?.level2?.level3?.value).toBe('must be present');
      expect(completeData.level1.simple).toBe(false);
    });
  });

  describe('Type Utility Integration', () => {
    it('should combine different utility types', () => {
      interface BaseConfig {
        name: string;
        version: number;
        features: {
          feature1: boolean;
          feature2: string;
        };
      }

      // Combine Optional and DeepPartial
      type FlexibleConfig = Optional<DeepPartial<BaseConfig>, 'name'>;

      const config: FlexibleConfig = {
        version: 1,
        features: {
          feature1: true,
          // feature2 is optional due to DeepPartial
        },
        // name is optional due to Optional
      };

      expect(config.version).toBe(1);
      expect(config.features?.feature1).toBe(true);
      expect(config.features?.feature2).toBeUndefined();
      expect(config.name).toBeUndefined();
    });

    it('should work with Result and NonEmptyArray', () => {
      type ArrayResult = Result<NonEmptyArray<string>>;

      const successResult: ArrayResult = {
        success: true,
        data: ['item1', 'item2'],
      };

      const failResult: ArrayResult = {
        success: false,
        error: new Error('Array processing failed'),
      };

      expect(successResult.success).toBe(true);
      if (successResult.success) {
        expect(successResult.data).toHaveLength(2);
        expect(successResult.data[0]).toBe('item1');
      }

      expect(failResult.success).toBe(false);
      if (!failResult.success) {
        expect(failResult.error.message).toBe('Array processing failed');
      }
    });
  });

  describe('Type Safety Validation', () => {
    it('should provide compile-time type safety', () => {
      // These tests ensure TypeScript compilation works correctly
      const versionInfo: VersionInfo = {
        version: '1.0.0',
        timestamp: Date.now(),
        buildId: 'build-1',
        gitCommit: 'commit-1',
        environment: 'production',
      };

      // Type should be narrowed correctly
      expect(typeof versionInfo.version).toBe('string');
      expect(typeof versionInfo.timestamp).toBe('number');
      expect(typeof versionInfo.buildId).toBe('string');
      expect(typeof versionInfo.gitCommit).toBe('string');
      expect(['development', 'production', 'staging']).toContain(versionInfo.environment);
    });

    it('should handle complex type transformations', () => {
      interface ComplexType {
        id: number;
        metadata: {
          tags: string[];
          config: {
            enabled: boolean;
            options: Record<string, unknown>;
          };
        };
      }

      const original: ComplexType = {
        id: 1,
        metadata: {
          tags: ['tag1', 'tag2'],
          config: {
            enabled: true,
            options: { setting1: 'value1' },
          },
        },
      };

      const partial: DeepPartial<ComplexType> = {
        metadata: {
          config: {
            enabled: false,
          },
        },
      };

      expect(original.id).toBe(1);
      expect(original.metadata.tags).toEqual(['tag1', 'tag2']);
      expect(partial.metadata?.config?.enabled).toBe(false);
      expect(partial.metadata?.config?.options).toBeUndefined();
    });
  });
});

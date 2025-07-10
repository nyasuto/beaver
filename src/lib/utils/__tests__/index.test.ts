/**
 * Index Utilities Test Suite
 *
 * 汎用ユーティリティ関数の包括的テスト
 * 型安全性とエッジケース処理の信頼性を確保
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sleep, noop, identity, isNotNull, isDefined, isEmpty, clamp, range } from '../index';

describe('Index Utilities', () => {
  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // =====================
  // SLEEP FUNCTION TESTS
  // =====================

  describe('sleep', () => {
    it('should resolve after specified milliseconds', async () => {
      const promise = sleep(1000);

      // Promise should not resolve immediately
      let resolved = false;
      promise.then(() => {
        resolved = true;
      });

      expect(resolved).toBe(false);

      // Advance time by 999ms - should not resolve yet
      vi.advanceTimersByTime(999);
      await Promise.resolve();
      expect(resolved).toBe(false);

      // Advance time by 1ms more - should resolve now
      vi.advanceTimersByTime(1);
      await promise;
      expect(resolved).toBe(true);
    });

    it('should resolve immediately with 0 milliseconds', async () => {
      const promise = sleep(0);
      vi.advanceTimersByTime(0);
      await expect(promise).resolves.toBeUndefined();
    });

    it('should handle negative values (treat as 0)', async () => {
      const promise = sleep(-100);
      vi.advanceTimersByTime(0);
      await expect(promise).resolves.toBeUndefined();
    });

    it('should return Promise<void>', () => {
      const result = sleep(100);
      expect(result).toBeInstanceOf(Promise);
      expect(result).toEqual(expect.any(Promise));
    });

    it('should handle multiple concurrent sleeps', async () => {
      const promises = [sleep(100), sleep(200), sleep(300)];

      let resolvedCount = 0;
      promises.forEach(p => p.then(() => resolvedCount++));

      // After 100ms, first should resolve
      vi.advanceTimersByTime(100);
      await Promise.resolve();
      expect(resolvedCount).toBe(1);

      // After 200ms total, second should resolve
      vi.advanceTimersByTime(100);
      await Promise.resolve();
      expect(resolvedCount).toBe(2);

      // After 300ms total, third should resolve
      vi.advanceTimersByTime(100);
      await Promise.resolve();
      expect(resolvedCount).toBe(3);
    });

    it('should handle large timeout values', async () => {
      const promise = sleep(1000000); // Use a more reasonable large number
      vi.advanceTimersByTime(1000);

      let resolved = false;
      promise.then(() => {
        resolved = true;
      });
      await Promise.resolve();

      expect(resolved).toBe(false);
    });
  });

  // =====================
  // NOOP FUNCTION TESTS
  // =====================

  describe('noop', () => {
    it('should return undefined', () => {
      expect(noop()).toBeUndefined();
    });

    it('should ignore any arguments', () => {
      expect(noop()).toBeUndefined();
      // Test that function doesn't error with various arguments
      expect(() => (noop as any)(1, 2, 3, 'test', {}, [])).not.toThrow();
    });

    it('should be callable multiple times', () => {
      expect(() => {
        noop();
        noop();
        noop();
      }).not.toThrow();
    });

    it('should have consistent behavior', () => {
      const result1 = noop();
      const result2 = noop();
      expect(result1).toBe(result2);
    });

    it('should be usable as callback function', () => {
      const array = [1, 2, 3];
      expect(() => array.forEach(noop)).not.toThrow();
    });

    it('should be usable in higher-order functions', () => {
      const functions = [noop, noop, noop];
      expect(() => functions.forEach(fn => fn())).not.toThrow();
    });
  });

  // =======================
  // IDENTITY FUNCTION TESTS
  // =======================

  describe('identity', () => {
    it('should return the same primitive values', () => {
      expect(identity(42)).toBe(42);
      expect(identity('hello')).toBe('hello');
      expect(identity(true)).toBe(true);
      expect(identity(null)).toBe(null);
      expect(identity(undefined)).toBe(undefined);
    });

    it('should return the same object reference', () => {
      const obj = { a: 1, b: 2 };
      expect(identity(obj)).toBe(obj);
      expect(identity(obj) === obj).toBe(true);
    });

    it('should return the same array reference', () => {
      const arr = [1, 2, 3];
      expect(identity(arr)).toBe(arr);
      expect(identity(arr) === arr).toBe(true);
    });

    it('should work with functions', () => {
      const fn = () => 'test';
      expect(identity(fn)).toBe(fn);
      expect(identity(fn)()).toBe('test');
    });

    it('should preserve type information', () => {
      interface TestInterface {
        value: number;
      }

      const testObj: TestInterface = { value: 42 };
      const result = identity(testObj);

      // TypeScript should preserve the type
      expect(result.value).toBe(42);
    });

    it('should work with complex nested objects', () => {
      const complex = {
        a: [1, 2, { b: 'test' }],
        c: { d: { e: 'nested' } },
      };

      expect(identity(complex)).toBe(complex);
      expect(identity(complex).a[2]).toBe(complex.a[2]);
    });
  });

  // ========================
  // IS NOT NULL TESTS
  // ========================

  describe('isNotNull', () => {
    it('should return true for defined values', () => {
      expect(isNotNull(42)).toBe(true);
      expect(isNotNull('hello')).toBe(true);
      expect(isNotNull(false)).toBe(true);
      expect(isNotNull(0)).toBe(true);
      expect(isNotNull('')).toBe(true);
      expect(isNotNull([])).toBe(true);
      expect(isNotNull({})).toBe(true);
    });

    it('should return false for null', () => {
      expect(isNotNull(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isNotNull(undefined)).toBe(false);
    });

    it('should work as type guard', () => {
      const value: string | null | undefined = 'test';

      if (isNotNull(value)) {
        // TypeScript should know value is string here
        expect(value.toUpperCase()).toBe('TEST');
      }
    });

    it('should filter arrays correctly', () => {
      const array = [1, null, 2, undefined, 3, null];
      const filtered = array.filter(isNotNull);

      expect(filtered).toEqual([1, 2, 3]);
      expect(filtered).toHaveLength(3);
    });

    it('should handle objects with null/undefined properties', () => {
      const obj = {
        a: 'value',
        b: null,
        c: undefined,
        d: 0,
        e: false,
      };

      expect(isNotNull(obj.a)).toBe(true);
      expect(isNotNull(obj.b)).toBe(false);
      expect(isNotNull(obj.c)).toBe(false);
      expect(isNotNull(obj.d)).toBe(true);
      expect(isNotNull(obj.e)).toBe(true);
    });
  });

  // =====================
  // IS DEFINED TESTS
  // =====================

  describe('isDefined', () => {
    it('should return true for defined values including null', () => {
      expect(isDefined(42)).toBe(true);
      expect(isDefined('hello')).toBe(true);
      expect(isDefined(false)).toBe(true);
      expect(isDefined(0)).toBe(true);
      expect(isDefined('')).toBe(true);
      expect(isDefined([])).toBe(true);
      expect(isDefined({})).toBe(true);
      expect(isDefined(null)).toBe(true); // null is defined, just not a value
    });

    it('should return false for undefined', () => {
      expect(isDefined(undefined)).toBe(false);
    });

    it('should work as type guard', () => {
      const value: string | undefined = 'test';

      if (isDefined(value)) {
        // TypeScript should know value is string here
        expect(value.toUpperCase()).toBe('TEST');
      }
    });

    it('should filter arrays correctly', () => {
      const array = [1, undefined, 2, null, 3, undefined];
      const filtered = array.filter(isDefined);

      expect(filtered).toEqual([1, 2, null, 3]);
      expect(filtered).toHaveLength(4);
    });

    it('should handle optional object properties', () => {
      interface TestObj {
        required: string;
        optional?: number;
      }

      const obj: TestObj = { required: 'test' };

      expect(isDefined(obj.required)).toBe(true);
      expect(isDefined(obj.optional)).toBe(false);
    });
  });

  // =====================
  // IS EMPTY TESTS
  // =====================

  describe('isEmpty', () => {
    it('should return true for null and undefined', () => {
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
    });

    it('should return true for empty strings', () => {
      expect(isEmpty('')).toBe(true);
      expect(isEmpty(' ')).toBe(false); // Space is not empty
    });

    it('should return true for empty arrays', () => {
      expect(isEmpty([])).toBe(true);
      expect(isEmpty([1])).toBe(false);
      expect(isEmpty([null])).toBe(false); // Array with null is not empty
    });

    it('should return true for empty objects', () => {
      expect(isEmpty({})).toBe(true);
      expect(isEmpty({ a: 1 })).toBe(false);
      expect(isEmpty({ a: undefined })).toBe(false); // Object with property is not empty
    });

    it('should return false for non-empty values', () => {
      expect(isEmpty('hello')).toBe(false);
      expect(isEmpty(0)).toBe(false); // 0 is not empty
      expect(isEmpty(false)).toBe(false); // false is not empty
      expect(isEmpty([1, 2, 3])).toBe(false);
      expect(isEmpty({ key: 'value' })).toBe(false);
    });

    it('should handle complex objects', () => {
      expect(isEmpty({ a: {}, b: [] })).toBe(false); // Has properties
      expect(isEmpty(new Date())).toBe(true); // Date object has no enumerable properties
      expect(isEmpty(new Error())).toBe(true); // Error object has no enumerable properties by default
    });

    it('should handle functions', () => {
      expect(isEmpty(() => {})).toBe(false); // Functions are not empty
      expect(isEmpty(function () {})).toBe(false);
    });

    it('should handle numbers and booleans', () => {
      expect(isEmpty(0)).toBe(false);
      expect(isEmpty(-1)).toBe(false);
      expect(isEmpty(42)).toBe(false);
      expect(isEmpty(true)).toBe(false);
      expect(isEmpty(false)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isEmpty(NaN)).toBe(false); // NaN is not empty
      expect(isEmpty(Infinity)).toBe(false);
      expect(isEmpty(-Infinity)).toBe(false);
    });
  });

  // =====================
  // CLAMP FUNCTION TESTS
  // =====================

  describe('clamp', () => {
    it('should return value when within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(2.5, 0, 10)).toBe(2.5);
      expect(clamp(-2, -5, 5)).toBe(-2);
    });

    it('should return min when value is below range', () => {
      expect(clamp(-1, 0, 10)).toBe(0);
      expect(clamp(-100, -50, 50)).toBe(-50);
      expect(clamp(1, 5, 10)).toBe(5);
    });

    it('should return max when value is above range', () => {
      expect(clamp(15, 0, 10)).toBe(10);
      expect(clamp(100, -50, 50)).toBe(50);
      expect(clamp(20, 5, 15)).toBe(15);
    });

    it('should handle equal min and max values', () => {
      expect(clamp(5, 10, 10)).toBe(10);
      expect(clamp(15, 10, 10)).toBe(10);
      expect(clamp(5, 0, 0)).toBe(0);
    });

    it('should handle negative ranges', () => {
      expect(clamp(-5, -10, -1)).toBe(-5);
      expect(clamp(-15, -10, -1)).toBe(-10);
      expect(clamp(0, -10, -1)).toBe(-1);
    });

    it('should handle decimal values', () => {
      expect(clamp(5.7, 5.5, 6.5)).toBe(5.7);
      expect(clamp(5.3, 5.5, 6.5)).toBe(5.5);
      expect(clamp(6.8, 5.5, 6.5)).toBe(6.5);
    });

    it('should handle zero values', () => {
      expect(clamp(0, -1, 1)).toBe(0);
      expect(clamp(0, 0, 1)).toBe(0);
      expect(clamp(0, 1, 2)).toBe(1);
    });

    it('should handle inverted min/max (min > max)', () => {
      // When min > max, Math.min(Math.max(value, min), max) behavior
      expect(clamp(5, 10, 0)).toBe(0); // Math.min(Math.max(5, 10), 0) = Math.min(10, 0) = 0
    });

    it('should handle special number values', () => {
      expect(clamp(Infinity, 0, 10)).toBe(10);
      expect(clamp(-Infinity, 0, 10)).toBe(0);
      expect(clamp(NaN, 0, 10)).toBeNaN();
    });
  });

  // =====================
  // RANGE FUNCTION TESTS
  // =====================

  describe('range', () => {
    it('should generate range from 0 to end when only one argument', () => {
      expect(range(5)).toEqual([0, 1, 2, 3, 4]);
      expect(range(3)).toEqual([0, 1, 2]);
      expect(range(0)).toEqual([]);
    });

    it('should generate range from start to end', () => {
      expect(range(2, 5)).toEqual([2, 3, 4]);
      expect(range(1, 4)).toEqual([1, 2, 3]);
      expect(range(-2, 2)).toEqual([-2, -1, 0, 1]);
    });

    it('should handle custom step values', () => {
      expect(range(0, 10, 2)).toEqual([0, 2, 4, 6, 8]);
      expect(range(1, 10, 3)).toEqual([1, 4, 7]);
      expect(range(0, 5, 0.5)).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5]);
    });

    it('should return empty array when start >= end', () => {
      expect(range(5, 5)).toEqual([]);
      expect(range(10, 5)).toEqual([]);
      expect(range(0, -5)).toEqual([]);
    });

    it('should handle negative start and end values', () => {
      expect(range(-5, -2)).toEqual([-5, -4, -3]);
      expect(range(-10, -5, 2)).toEqual([-10, -8, -6]);
    });

    it('should handle decimal step values correctly', () => {
      const result = range(0, 2, 0.3);
      // Due to floating point precision, check approximately
      expect(result).toHaveLength(7);
      expect(result[0]).toBe(0);
      expect(result[1]).toBeCloseTo(0.3);
      expect(result[2]).toBeCloseTo(0.6);
    });

    it('should handle large ranges efficiently', () => {
      const startTime = Date.now();
      const result = range(0, 10000);
      const endTime = Date.now();

      expect(result).toHaveLength(10000);
      expect(result[0]).toBe(0);
      expect(result[9999]).toBe(9999);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });

    it('should handle zero step (infinite loop prevention)', () => {
      // This would create infinite loop, the current implementation throws RangeError
      // because it tries to create an array with invalid length
      expect(() => range(0, 5, 0)).toThrow(RangeError);
    });

    it('should maintain precision with decimal numbers', () => {
      const result = range(0.1, 0.5, 0.1);
      expect(result).toHaveLength(4);
      expect(result[0]).toBeCloseTo(0.1);
      expect(result[1]).toBeCloseTo(0.2);
      expect(result[2]).toBeCloseTo(0.3);
      expect(result[3]).toBeCloseTo(0.4);
    });
  });

  // =====================
  // INTEGRATION TESTS
  // =====================

  describe('Integration Tests', () => {
    it('should work well together in common patterns', () => {
      // Create range, filter out nulls, clamp values
      const numbers = range(1, 10)
        .map(n => (n > 5 ? n : null))
        .filter(isNotNull)
        .map(n => clamp(n, 6, 8));

      // range(1, 10) = [1, 2, 3, 4, 5, 6, 7, 8, 9]
      // After map: [null, null, null, null, null, 6, 7, 8, 9]
      // After filter: [6, 7, 8, 9]
      // After clamp(n, 6, 8): [6, 7, 8, 8]
      expect(numbers).toEqual([6, 7, 8, 8]);
    });

    it('should handle async operations with sleep', async () => {
      const results: number[] = [];

      const promises = range(3).map(async i => {
        await sleep(i * 100);
        results.push(i);
      });

      // Fast-forward timers
      vi.advanceTimersByTime(300);
      await Promise.all(promises);

      expect(results).toEqual([0, 1, 2]);
    });

    it('should support functional programming patterns', () => {
      const data = range(1, 20)
        .filter(n => !isEmpty(n))
        .map(n => clamp(n, 5, 15))
        .filter(isDefined)
        .map(identity);

      expect(data).toEqual([5, 5, 5, 5, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 15, 15, 15, 15]);
    });

    it('should handle edge cases gracefully in combination', () => {
      const result = range(0, 5)
        .map(n => (n === 2 ? undefined : n))
        .filter(isDefined)
        .map(n => clamp(n, 1, 3))
        .filter(isNotNull);

      expect(result).toEqual([1, 1, 3, 3]);
    });
  });

  // =====================
  // TYPE SAFETY TESTS
  // =====================

  describe('Type Safety', () => {
    it('should maintain type information through transformations', () => {
      interface TestItem {
        id: number;
        name?: string;
      }

      const items: (TestItem | null)[] = [{ id: 1, name: 'test' }, null, { id: 2 }];

      const filtered = items
        .filter(isNotNull)
        .map(identity)
        .filter(item => isDefined(item.name));

      // TypeScript should know these are TestItem objects
      expect(filtered[0]?.id).toBe(1);
      expect(filtered[0]?.name).toBe('test');
    });

    it('should work with generic types', () => {
      function processArray<T>(arr: (T | null | undefined)[]): T[] {
        return arr.filter(isNotNull).filter(isDefined);
      }

      const numbers = processArray([1, null, 2, undefined, 3]);
      const strings = processArray(['a', null, 'b', undefined, 'c']);

      expect(numbers).toEqual([1, 2, 3]);
      expect(strings).toEqual(['a', 'b', 'c']);
    });
  });
});

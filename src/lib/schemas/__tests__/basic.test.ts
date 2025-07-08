/**
 * Basic Schema Tests
 *
 * Simple tests to verify schema functionality and setup.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('Basic Schema Tests', () => {
  describe('Zod Basic Functionality', () => {
    it('should validate string schema', () => {
      const StringSchema = z.string();

      expect(StringSchema.safeParse('hello').success).toBe(true);
      expect(StringSchema.safeParse(123).success).toBe(false);
    });

    it('should validate number schema', () => {
      const NumberSchema = z.number();

      expect(NumberSchema.safeParse(42).success).toBe(true);
      expect(NumberSchema.safeParse('42').success).toBe(false);
    });

    it('should validate object schema', () => {
      const UserSchema = z.object({
        id: z.number(),
        name: z.string(),
        email: z.string().email(),
      });

      const validUser = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
      };

      const invalidUser = {
        id: 'not-a-number',
        name: 'John Doe',
        email: 'invalid-email',
      };

      expect(UserSchema.safeParse(validUser).success).toBe(true);
      expect(UserSchema.safeParse(invalidUser).success).toBe(false);
    });

    it('should validate array schema', () => {
      const ArraySchema = z.array(z.string());

      expect(ArraySchema.safeParse(['a', 'b', 'c']).success).toBe(true);
      expect(ArraySchema.safeParse([1, 2, 3]).success).toBe(false);
    });

    it('should handle optional fields', () => {
      const OptionalSchema = z.object({
        required: z.string(),
        optional: z.string().optional(),
      });

      expect(OptionalSchema.safeParse({ required: 'test' }).success).toBe(true);
      expect(OptionalSchema.safeParse({ required: 'test', optional: 'also test' }).success).toBe(
        true
      );
      expect(OptionalSchema.safeParse({ optional: 'test' }).success).toBe(false);
    });

    it('should handle default values', () => {
      const DefaultSchema = z.object({
        name: z.string(),
        count: z.number().default(0),
      });

      const result = DefaultSchema.parse({ name: 'test' });
      expect(result.count).toBe(0);
    });

    it('should handle enum validation', () => {
      const StatusSchema = z.enum(['active', 'inactive', 'pending']);

      expect(StatusSchema.safeParse('active').success).toBe(true);
      expect(StatusSchema.safeParse('unknown').success).toBe(false);
    });

    it('should provide error details on validation failure', () => {
      const Schema = z.object({
        age: z.number().min(0).max(120),
      });

      const result = Schema.safeParse({ age: -5 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1);
        expect(result.error.issues[0]?.code).toBe('too_small');
      }
    });
  });

  describe('Complex Schema Validation', () => {
    const GitHubLikeSchema = z.object({
      id: z.number(),
      name: z.string().min(1),
      description: z.string().nullable(),
      private: z.boolean(),
      owner: z.object({
        login: z.string(),
        id: z.number(),
      }),
      created_at: z.string().datetime(),
      updated_at: z.string().datetime(),
    });

    it('should validate complex nested objects', () => {
      const validData = {
        id: 123,
        name: 'test-repo',
        description: 'A test repository',
        private: false,
        owner: {
          login: 'testuser',
          id: 456,
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const result = GitHubLikeSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid nested data', () => {
      const invalidData = {
        id: 123,
        name: '', // Invalid: empty string
        description: 'A test repository',
        private: 'not-boolean', // Invalid: not boolean
        owner: {
          login: 'testuser',
          // Missing id
        },
        created_at: 'invalid-date', // Invalid: not ISO date
        updated_at: '2024-01-01T00:00:00Z',
      };

      const result = GitHubLikeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Schema Composition', () => {
    const BaseSchema = z.object({
      id: z.number(),
      created_at: z.string().datetime(),
    });

    const ExtendedSchema = BaseSchema.extend({
      title: z.string(),
      content: z.string().optional(),
    });

    it('should compose schemas correctly', () => {
      const validData = {
        id: 1,
        created_at: '2024-01-01T00:00:00Z',
        title: 'Test Title',
        content: 'Test content',
      };

      const result = ExtendedSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(1);
        expect(result.data.title).toBe('Test Title');
      }
    });

    it('should inherit validation from base schema', () => {
      const invalidData = {
        id: 'not-a-number', // Invalid from base schema
        created_at: '2024-01-01T00:00:00Z',
        title: 'Test Title',
      };

      const result = ExtendedSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Schema Transformations', () => {
    const TransformSchema = z.object({
      count: z.string().transform(val => parseInt(val, 10)),
      tags: z.string().transform(val => val.split(',')),
    });

    it('should transform data during parsing', () => {
      const input = {
        count: '42',
        tags: 'tag1,tag2,tag3',
      };

      const result = TransformSchema.parse(input);
      expect(result.count).toBe(42);
      expect(result.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });
  });
});

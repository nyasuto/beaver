/**
 * Validation Helpers Tests
 *
 * Comprehensive tests for validation patterns, custom validators,
 * and helper functions
 */

import { describe, it, expect, vi } from 'vitest';
import {
  ValidationPatterns,
  CustomValidators,
  ValidationError,
  ValidationPresets,
  validateData,
  validateDataOrThrow,
  formatValidationErrors,
  createValidationSchema,
  validateAsync,
  sanitizeInput,
  createValidationMiddleware,
  validateBatch,
} from '../validation';
import { z } from 'zod';

describe('ValidationPatterns', () => {
  describe('slug pattern', () => {
    it('should match valid slugs', () => {
      const validSlugs = ['hello-world', 'test123', 'my-awesome-slug', 'single', 'a1-b2-c3'];

      validSlugs.forEach(slug => {
        expect(ValidationPatterns.slug.test(slug)).toBe(true);
      });
    });

    it('should reject invalid slugs', () => {
      const invalidSlugs = [
        'Hello-World', // uppercase
        'hello_world', // underscore
        'hello world', // space
        '-hello', // starts with hyphen
        'hello-', // ends with hyphen
        'hello--world', // double hyphen
        '',
      ];

      invalidSlugs.forEach(slug => {
        expect(ValidationPatterns.slug.test(slug)).toBe(false);
      });
    });
  });

  describe('username pattern', () => {
    it('should match valid usernames', () => {
      const validUsernames = ['user123', 'test_user', 'user-name', 'abc', 'user123456789012345'];

      validUsernames.forEach(username => {
        expect(ValidationPatterns.username.test(username)).toBe(true);
      });
    });

    it('should reject invalid usernames', () => {
      const invalidUsernames = [
        'ab', // too short
        'a'.repeat(21), // too long
        'user@name', // invalid character
        'user name', // space
        '',
      ];

      invalidUsernames.forEach(username => {
        expect(ValidationPatterns.username.test(username)).toBe(false);
      });
    });
  });

  describe('hexColor pattern', () => {
    it('should match valid hex colors', () => {
      const validColors = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF', '#000000', '#AbCdEf'];

      validColors.forEach(color => {
        expect(ValidationPatterns.hexColor.test(color)).toBe(true);
      });
    });

    it('should reject invalid hex colors', () => {
      const invalidColors = [
        'FF0000', // missing #
        '#FFF', // too short
        '#GGGGGG', // invalid characters
        '#1234567', // too long
        'red',
        '',
      ];

      invalidColors.forEach(color => {
        expect(ValidationPatterns.hexColor.test(color)).toBe(false);
      });
    });
  });

  describe('semver pattern', () => {
    it('should match valid semantic versions', () => {
      const validVersions = ['1.0.0', '2.1.3', '10.20.30', '0.0.1'];

      validVersions.forEach(version => {
        expect(ValidationPatterns.semver.test(version)).toBe(true);
      });
    });

    it('should reject invalid semantic versions', () => {
      const invalidVersions = [
        '1.0', // missing patch
        '1.0.0.0', // too many parts
        'v1.0.0', // has prefix
        '1.0.0-alpha', // has suffix
        'abc',
        '',
      ];

      invalidVersions.forEach(version => {
        expect(ValidationPatterns.semver.test(version)).toBe(false);
      });
    });
  });

  describe('uuid pattern', () => {
    it('should match valid UUIDs', () => {
      const validUuids = [
        '123e4567-e89b-42d3-a456-426614174000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '6ba7b810-9dad-41d1-80b4-00c04fd430c8',
      ];

      validUuids.forEach(uuid => {
        expect(ValidationPatterns.uuid.test(uuid)).toBe(true);
      });
    });

    it('should reject invalid UUIDs', () => {
      const invalidUuids = [
        '123e4567-e89b-12d3-a456-42661417400', // too short
        '123e4567-e89b-12d3-a456-4266141740000', // too long
        '123e4567-e89b-12d3-g456-426614174000', // invalid character
        'not-a-uuid',
        '',
      ];

      invalidUuids.forEach(uuid => {
        expect(ValidationPatterns.uuid.test(uuid)).toBe(false);
      });
    });
  });

  describe('githubUsername pattern', () => {
    it('should match valid GitHub usernames', () => {
      const validUsernames = [
        'octocat',
        'github',
        'user-name',
        'user123',
        'a',
        'a'.repeat(39), // max length
      ];

      validUsernames.forEach(username => {
        expect(ValidationPatterns.githubUsername.test(username)).toBe(true);
      });
    });

    it('should reject invalid GitHub usernames', () => {
      const invalidUsernames = [
        '-starts-with-hyphen',
        'ends-with-hyphen-',
        'user_name', // underscore not allowed
        'a'.repeat(40), // too long
        '',
      ];

      invalidUsernames.forEach(username => {
        expect(ValidationPatterns.githubUsername.test(username)).toBe(false);
      });
    });
  });

  describe('githubToken pattern', () => {
    it('should match valid GitHub tokens', () => {
      const validTokens = [
        'ghp_1234567890123456789012345678901234567890',
        'gho_1234567890123456789012345678901234567890',
        'ghu_1234567890123456789012345678901234567890',
        'ghs_1234567890123456789012345678901234567890',
        'ghr_1234567890123456789012345678901234567890',
        'github_pat_' + '1'.repeat(200),
      ];

      validTokens.forEach(token => {
        expect(ValidationPatterns.githubToken.test(token)).toBe(true);
      });
    });

    it('should reject invalid GitHub tokens', () => {
      const invalidTokens = [
        'invalid_prefix_123456789012345678901234567890',
        'ghp_123', // too short
        'token without prefix',
        '',
      ];

      invalidTokens.forEach(token => {
        expect(ValidationPatterns.githubToken.test(token)).toBe(false);
      });
    });
  });

  describe('ipv4 pattern', () => {
    it('should match valid IPv4 addresses', () => {
      const validIps = ['192.168.1.1', '127.0.0.1', '0.0.0.0', '255.255.255.255', '10.0.0.1'];

      validIps.forEach(ip => {
        expect(ValidationPatterns.ipv4.test(ip)).toBe(true);
      });
    });

    it('should reject invalid IPv4 addresses', () => {
      const invalidIps = [
        '256.1.1.1', // octet too large
        '192.168.1', // missing octet
        '192.168.1.1.1', // too many octets
        'not.an.ip.address',
        '',
      ];

      invalidIps.forEach(ip => {
        expect(ValidationPatterns.ipv4.test(ip)).toBe(false);
      });
    });
  });
});

describe('CustomValidators', () => {
  describe('slug validator', () => {
    it('should validate valid slugs', () => {
      const validator = CustomValidators.slug();
      expect(() => validator.parse('hello-world')).not.toThrow();
      expect(() => validator.parse('test123')).not.toThrow();
    });

    it('should reject invalid slugs', () => {
      const validator = CustomValidators.slug();
      expect(() => validator.parse('Hello-World')).toThrow();
      expect(() => validator.parse('hello_world')).toThrow();
    });
  });

  describe('githubUsername validator', () => {
    it('should validate valid GitHub usernames', () => {
      const validator = CustomValidators.githubUsername();
      expect(() => validator.parse('octocat')).not.toThrow();
      expect(() => validator.parse('user-name')).not.toThrow();
    });

    it('should reject invalid GitHub usernames', () => {
      const validator = CustomValidators.githubUsername();
      expect(() => validator.parse('-invalid')).toThrow();
      expect(() => validator.parse('user_name')).toThrow();
    });
  });

  describe('githubRepo validator', () => {
    it('should validate valid repository names', () => {
      const validator = CustomValidators.githubRepo();
      expect(() => validator.parse('my-repo')).not.toThrow();
      expect(() => validator.parse('repo.name')).not.toThrow();
      expect(() => validator.parse('repo_name')).not.toThrow();
    });

    it('should reject invalid repository names', () => {
      const validator = CustomValidators.githubRepo();
      expect(() => validator.parse('repo name')).toThrow(); // space not allowed
    });
  });

  describe('githubToken validator', () => {
    it('should validate valid GitHub tokens', () => {
      const validator = CustomValidators.githubToken();
      expect(() => validator.parse('ghp_' + '1'.repeat(36))).not.toThrow();
      expect(() => validator.parse('github_pat_' + '1'.repeat(200))).not.toThrow();
    });

    it('should reject invalid GitHub tokens', () => {
      const validator = CustomValidators.githubToken();
      expect(() => validator.parse('invalid_token')).toThrow();
      expect(() => validator.parse('ghp_123')).toThrow(); // too short
    });
  });

  describe('hexColor validator', () => {
    it('should validate valid hex colors', () => {
      const validator = CustomValidators.hexColor();
      expect(() => validator.parse('#FF0000')).not.toThrow();
      expect(() => validator.parse('#AbCdEf')).not.toThrow();
    });

    it('should reject invalid hex colors', () => {
      const validator = CustomValidators.hexColor();
      expect(() => validator.parse('FF0000')).toThrow(); // missing #
      expect(() => validator.parse('#FFF')).toThrow(); // too short
    });
  });

  describe('port validator', () => {
    it('should validate valid port numbers', () => {
      const validator = CustomValidators.port();
      expect(() => validator.parse(80)).not.toThrow();
      expect(() => validator.parse(3000)).not.toThrow();
      expect(() => validator.parse(65535)).not.toThrow();
      expect(() => validator.parse('8080')).not.toThrow(); // string conversion
    });

    it('should reject invalid port numbers', () => {
      const validator = CustomValidators.port();
      expect(() => validator.parse(0)).toThrow();
      expect(() => validator.parse(65536)).toThrow();
      expect(() => validator.parse(-1)).toThrow();
    });
  });

  describe('ipAddress validator', () => {
    it('should validate valid IP addresses', () => {
      const validator = CustomValidators.ipAddress();
      expect(() => validator.parse('192.168.1.1')).not.toThrow();
      expect(() => validator.parse('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).not.toThrow();
    });

    it('should reject invalid IP addresses', () => {
      const validator = CustomValidators.ipAddress();
      expect(() => validator.parse('256.1.1.1')).toThrow();
      expect(() => validator.parse('not-an-ip')).toThrow();
    });
  });

  describe('fileSize validator', () => {
    it('should validate file sizes within limit', () => {
      const validator = CustomValidators.fileSize(1024);
      expect(() => validator.parse(512)).not.toThrow();
      expect(() => validator.parse(1024)).not.toThrow();
      expect(() => validator.parse(0)).not.toThrow();
    });

    it('should reject file sizes over limit', () => {
      const validator = CustomValidators.fileSize(1024);
      expect(() => validator.parse(1025)).toThrow();
      expect(() => validator.parse(-1)).toThrow();
    });
  });

  describe('dateRange validator', () => {
    it('should validate valid date ranges', () => {
      const validator = CustomValidators.dateRange();
      const validRange = {
        start: '2023-01-01T00:00:00Z',
        end: '2023-12-31T23:59:59Z',
      };
      expect(() => validator.parse(validRange)).not.toThrow();
    });

    it('should reject invalid date ranges', () => {
      const validator = CustomValidators.dateRange();
      const invalidRange = {
        start: '2023-12-31T23:59:59Z',
        end: '2023-01-01T00:00:00Z', // end before start
      };
      expect(() => validator.parse(invalidRange)).toThrow();
    });
  });

  describe('strongPassword validator', () => {
    it('should validate strong passwords', () => {
      const validator = CustomValidators.strongPassword();
      const strongPasswords = ['Password123!', 'MyStr0ng@Pass', 'C0mpl3x#P4ssw0rd'];

      strongPasswords.forEach(password => {
        expect(() => validator.parse(password)).not.toThrow();
      });
    });

    it('should reject weak passwords', () => {
      const validator = CustomValidators.strongPassword();
      const weakPasswords = [
        'password', // no uppercase, number, special char
        'PASSWORD123', // no lowercase, special char
        'Password', // no number, special char
        'Pass12!', // too short
      ];

      weakPasswords.forEach(password => {
        expect(() => validator.parse(password)).toThrow();
      });
    });
  });

  describe('jsonString validator', () => {
    it('should validate valid JSON strings', () => {
      const validator = CustomValidators.jsonString();
      const validJsonStrings = ['{"key": "value"}', '[1, 2, 3]', '"string"', 'true', 'null'];

      validJsonStrings.forEach(json => {
        expect(() => validator.parse(json)).not.toThrow();
      });
    });

    it('should reject invalid JSON strings', () => {
      const validator = CustomValidators.jsonString();
      const invalidJsonStrings = [
        '{key: "value"}', // unquoted key
        '[1, 2, 3,]', // trailing comma
        'undefined',
        'not json',
      ];

      invalidJsonStrings.forEach(json => {
        expect(() => validator.parse(json)).toThrow();
      });
    });
  });

  describe('uniqueArray validator', () => {
    it('should validate arrays with unique items', () => {
      const validator = CustomValidators.uniqueArray(z.string());
      expect(() => validator.parse(['a', 'b', 'c'])).not.toThrow();
      expect(() => validator.parse(['unique'])).not.toThrow();
      expect(() => validator.parse([])).not.toThrow();
    });

    it('should reject arrays with duplicate items', () => {
      const validator = CustomValidators.uniqueArray(z.string());
      expect(() => validator.parse(['a', 'b', 'a'])).toThrow();
      expect(() => validator.parse(['duplicate', 'duplicate'])).toThrow();
    });
  });

  describe('nonEmptyString validator', () => {
    it('should validate non-empty strings', () => {
      const validator = CustomValidators.nonEmptyString();
      expect(() => validator.parse('hello')).not.toThrow();
      expect(() => validator.parse('  hello  ')).not.toThrow(); // trimmed
    });

    it('should reject empty strings', () => {
      const validator = CustomValidators.nonEmptyString();
      expect(() => validator.parse('')).toThrow();
      expect(() => validator.parse('   ')).toThrow(); // whitespace only
    });
  });

  describe('cronExpression validator', () => {
    it('should validate valid cron expressions', () => {
      const validator = CustomValidators.cronExpression();
      const validCrons = [
        '0 0 * * *', // daily at midnight
        '15 * * * *', // every hour at minute 15
        '0 9 * * 1', // every Monday at 9am
      ];

      validCrons.forEach(cron => {
        expect(() => validator.parse(cron)).not.toThrow();
      });
    });

    it('should reject invalid cron expressions', () => {
      const validator = CustomValidators.cronExpression();
      const invalidCrons = [
        '0 0 * *', // missing field
        '60 * * * *', // invalid minute
        'invalid cron',
      ];

      invalidCrons.forEach(cron => {
        expect(() => validator.parse(cron)).toThrow();
      });
    });
  });

  describe('timezone validator', () => {
    it('should validate valid timezones', () => {
      const validator = CustomValidators.timezone();
      const validTimezones = ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'];

      validTimezones.forEach(timezone => {
        expect(() => validator.parse(timezone)).not.toThrow();
      });
    });

    it('should reject invalid timezones', () => {
      const validator = CustomValidators.timezone();
      const invalidTimezones = ['Invalid/Timezone', 'not-a-timezone'];

      invalidTimezones.forEach(timezone => {
        expect(() => validator.parse(timezone)).toThrow();
      });
    });
  });

  describe('domain validator', () => {
    it('should validate valid domain names', () => {
      const validator = CustomValidators.domain();
      const validDomains = ['example.com', 'sub.domain.com', 'github.com', 'api.service.io'];

      validDomains.forEach(domain => {
        expect(() => validator.parse(domain)).not.toThrow();
      });
    });

    it('should reject invalid domain names', () => {
      const validator = CustomValidators.domain();
      const invalidDomains = [
        'invalid domain with spaces',
        '.starts-with-dot',
        'ends-with-dot.',
        'domain_with_underscore',
      ];

      invalidDomains.forEach(domain => {
        expect(() => validator.parse(domain)).toThrow();
      });
    });
  });

  describe('percentage validator', () => {
    it('should validate valid percentages', () => {
      const validator = CustomValidators.percentage();
      expect(() => validator.parse(0)).not.toThrow();
      expect(() => validator.parse(50)).not.toThrow();
      expect(() => validator.parse(100)).not.toThrow();
      expect(() => validator.parse(99.5)).not.toThrow();
    });

    it('should reject invalid percentages', () => {
      const validator = CustomValidators.percentage();
      expect(() => validator.parse(-1)).toThrow();
      expect(() => validator.parse(101)).toThrow();
    });
  });

  describe('positiveInteger validator', () => {
    it('should validate positive integers', () => {
      const validator = CustomValidators.positiveInteger();
      expect(() => validator.parse(1)).not.toThrow();
      expect(() => validator.parse(100)).not.toThrow();
    });

    it('should reject non-positive integers', () => {
      const validator = CustomValidators.positiveInteger();
      expect(() => validator.parse(0)).toThrow();
      expect(() => validator.parse(-1)).toThrow();
      expect(() => validator.parse(1.5)).toThrow();
    });
  });

  describe('nonNegativeInteger validator', () => {
    it('should validate non-negative integers', () => {
      const validator = CustomValidators.nonNegativeInteger();
      expect(() => validator.parse(0)).not.toThrow();
      expect(() => validator.parse(1)).not.toThrow();
      expect(() => validator.parse(100)).not.toThrow();
    });

    it('should reject negative integers', () => {
      const validator = CustomValidators.nonNegativeInteger();
      expect(() => validator.parse(-1)).toThrow();
      expect(() => validator.parse(1.5)).toThrow();
    });
  });
});

describe('ValidationError', () => {
  it('should create error with message', () => {
    const error = new ValidationError('Test error');
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('ValidationError');
    expect(error.issues).toEqual([]);
  });

  it('should create error with Zod error', () => {
    const zodError = new z.ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        path: ['field'],
        message: 'Expected string, received number',
        input: 123,
      },
    ]);

    const error = new ValidationError('Validation failed', zodError);
    expect(error.issues).toHaveLength(1);
    expect(error.fieldErrors).toEqual({
      field: ['Expected string, received number'],
    });
  });

  it('should handle multiple field errors', () => {
    const zodError = new z.ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        path: ['field1'],
        message: 'Error 1',
        input: 123,
      },
      {
        code: 'too_small',
        minimum: 1,
        inclusive: true,
        path: ['field2'],
        message: 'Error 2',
        input: '',
        origin: 'value',
      },
    ]);

    const error = new ValidationError('Validation failed', zodError);
    expect(error.fieldErrors).toEqual({
      field1: ['Error 1'],
      field2: ['Error 2'],
    });
  });
});

describe('validateData', () => {
  const testSchema = z.object({
    name: z.string(),
    age: z.number(),
  });

  it('should return success for valid data', () => {
    const validData = { name: 'John', age: 30 };
    const result = validateData(testSchema, validData);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(validData);
    expect(result.errors).toBeUndefined();
  });

  it('should return error for invalid data', () => {
    const invalidData = { name: 'John', age: 'thirty' };
    const result = validateData(testSchema, invalidData);

    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.errors).toBeInstanceOf(z.ZodError);
  });

  it('should throw for non-Zod errors', () => {
    const mockSchema = {
      parse: () => {
        throw new Error('Non-Zod error');
      },
    } as any;

    expect(() => validateData(mockSchema, {})).toThrow('Non-Zod error');
  });
});

describe('validateDataOrThrow', () => {
  const testSchema = z.object({
    name: z.string(),
    age: z.number(),
  });

  it('should return data for valid input', () => {
    const validData = { name: 'John', age: 30 };
    const result = validateDataOrThrow(testSchema, validData);

    expect(result).toEqual(validData);
  });

  it('should throw ValidationError for invalid input', () => {
    const invalidData = { name: 'John', age: 'thirty' };

    expect(() => validateDataOrThrow(testSchema, invalidData)).toThrow(ValidationError);
  });
});

describe('formatValidationErrors', () => {
  it('should format validation errors', () => {
    const zodError = new z.ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        path: ['name'],
        message: 'Expected string',
        input: 123,
      },
      {
        code: 'too_small',
        minimum: 0,
        inclusive: true,
        path: ['age'],
        message: 'Must be positive',
        input: -1,
        origin: 'value',
      },
    ]);

    const formatted = formatValidationErrors(zodError);
    expect(formatted).toEqual(['name: Expected string', 'age: Must be positive']);
  });

  it('should handle errors without path', () => {
    const zodError = new z.ZodError([
      {
        code: 'custom',
        path: [],
        message: 'General error',
        input: undefined,
      },
    ]);

    const formatted = formatValidationErrors(zodError);
    expect(formatted).toEqual(['General error']);
  });
});

describe('createValidationSchema', () => {
  it('should create a validation schema', () => {
    const baseSchema = z.string();
    const customSchema = createValidationSchema(baseSchema, {});

    expect(() => customSchema.parse('valid string')).not.toThrow();
  });
});

describe('validateAsync', () => {
  const testSchema = z.object({
    email: z.string().email(),
  });

  it('should validate with async validators', async () => {
    const validData = { email: 'test@example.com' };
    const asyncValidator = vi.fn().mockResolvedValue(true);

    const result = await validateAsync(testSchema, validData, [asyncValidator]);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(validData);
    expect(asyncValidator).toHaveBeenCalledWith(validData);
  });

  it('should fail sync validation first', async () => {
    const invalidData = { email: 'invalid-email' };
    const asyncValidator = vi.fn();

    const result = await validateAsync(testSchema, invalidData, [asyncValidator]);

    expect(result.success).toBe(false);
    expect(asyncValidator).not.toHaveBeenCalled();
  });

  it('should fail async validation', async () => {
    const validData = { email: 'test@example.com' };
    const asyncValidator = vi.fn().mockResolvedValue('Email already exists');

    const result = await validateAsync(testSchema, validData, [asyncValidator]);

    expect(result.success).toBe(false);
    expect(result.errors?.issues[0]?.message).toBe('Email already exists');
  });

  it('should handle async validator errors', async () => {
    const validData = { email: 'test@example.com' };
    const asyncValidator = vi.fn().mockRejectedValue(new Error('Async error'));

    const result = await validateAsync(testSchema, validData, [asyncValidator]);

    expect(result.success).toBe(false);
    expect(result.errors?.issues[0]?.message).toBe('Async error');
  });
});

describe('sanitizeInput', () => {
  it('should trim strings', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello');
  });

  it('should sanitize arrays', () => {
    expect(sanitizeInput(['  hello  ', '  world  '])).toEqual(['hello', 'world']);
  });

  it('should sanitize objects', () => {
    const input = {
      name: '  John  ',
      nested: {
        value: '  test  ',
      },
    };

    const expected = {
      name: 'John',
      nested: {
        value: 'test',
      },
    };

    expect(sanitizeInput(input)).toEqual(expected);
  });

  it('should pass through other types unchanged', () => {
    expect(sanitizeInput(123)).toBe(123);
    expect(sanitizeInput(true)).toBe(true);
    expect(sanitizeInput(null)).toBe(null);
  });
});

describe('ValidationPresets', () => {
  describe('userInput preset', () => {
    it('should validate valid user input', () => {
      const validInput = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      };

      expect(() => ValidationPresets.userInput.parse(validInput)).not.toThrow();
    });

    it('should validate without optional age', () => {
      const validInput = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      expect(() => ValidationPresets.userInput.parse(validInput)).not.toThrow();
    });

    it('should reject invalid input', () => {
      const invalidInput = {
        name: '',
        email: 'invalid-email',
        age: -1,
      };

      expect(() => ValidationPresets.userInput.parse(invalidInput)).toThrow();
    });
  });

  describe('githubConfig preset', () => {
    it('should validate valid GitHub config', () => {
      const validConfig = {
        username: 'octocat',
        repository: 'Hello-World',
        token: 'ghp_' + '1'.repeat(36),
        branch: 'main',
      };

      expect(() => ValidationPresets.githubConfig.parse(validConfig)).not.toThrow();
    });

    it('should use default branch', () => {
      const config = {
        username: 'octocat',
        repository: 'Hello-World',
        token: 'ghp_' + '1'.repeat(36),
      };

      const result = ValidationPresets.githubConfig.parse(config);
      expect(result.branch).toBe('main');
    });
  });
});

describe('createValidationMiddleware', () => {
  it('should create validation middleware', () => {
    const schema = z.object({ name: z.string() });
    const middleware = createValidationMiddleware(schema);

    const validData = { name: 'test' };
    expect(middleware(validData)).toEqual(validData);
  });

  it('should throw ValidationError for invalid data', () => {
    const schema = z.object({ name: z.string() });
    const middleware = createValidationMiddleware(schema);

    const invalidData = { name: 123 };
    expect(() => middleware(invalidData)).toThrow(ValidationError);
  });

  it('should sanitize input data', () => {
    const schema = z.object({ name: z.string() });
    const middleware = createValidationMiddleware(schema);

    const inputWithWhitespace = { name: '  test  ' };
    const result = middleware(inputWithWhitespace);
    expect(result.name).toBe('test');
  });
});

describe('validateBatch', () => {
  const schema = z.object({ name: z.string(), age: z.number() });

  it('should validate batch of valid items', () => {
    const items = [
      { name: 'John', age: 30 },
      { name: 'Jane', age: 25 },
    ];

    const result = validateBatch(schema, items);

    expect(result.success).toBe(true);
    expect(result.validItems).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it('should handle mixed valid and invalid items', () => {
    const items = [
      { name: 'John', age: 30 }, // valid
      { name: 'Jane', age: 'twenty-five' }, // invalid
      { name: 'Bob', age: 40 }, // valid
    ];

    const result = validateBatch(schema, items);

    expect(result.success).toBe(false);
    expect(result.validItems).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
    expect(result.validItems[0]?.name).toBe('John');
    expect(result.validItems[1]?.name).toBe('Bob');
  });

  it('should handle all invalid items', () => {
    const items = [
      { name: 123, age: 'thirty' },
      { name: 'Jane' }, // missing age
    ];

    const result = validateBatch(schema, items);

    expect(result.success).toBe(false);
    expect(result.validItems).toHaveLength(0);
    expect(result.errors).toHaveLength(2);
  });
});

/**
 * GitHub Schema Tests
 *
 * Basic tests for GitHub configuration schema validation.
 */

import { describe, it, expect } from 'vitest';
import { GitHubConfigSchema } from '../github';

describe('GitHub Schema Validation', () => {
  describe('GitHubConfigSchema', () => {
    it('should validate complete GitHub configuration', () => {
      const validConfig = {
        token: 'ghp_test_token',
        owner: 'test-owner',
        repo: 'test-repo',
        baseUrl: 'https://api.github.com',
        timeout: 30000,
        rateLimitRemaining: 5000,
        rateLimitReset: Math.floor(Date.now() / 1000) + 3600,
      };

      const result = GitHubConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.owner).toBe('test-owner');
        expect(result.data.repo).toBe('test-repo');
      }
    });

    it('should provide default values for optional fields', () => {
      const minimalConfig = {
        token: 'ghp_test_token',
        owner: 'test-owner',
        repo: 'test-repo',
      };

      const result = GitHubConfigSchema.safeParse(minimalConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.baseUrl).toBe('https://api.github.com');
      }
    });

    it('should reject invalid configuration', () => {
      const invalidConfig = {
        // Missing required fields
        owner: 'test-owner',
        repo: 'test-repo',
      };

      const result = GitHubConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });
});

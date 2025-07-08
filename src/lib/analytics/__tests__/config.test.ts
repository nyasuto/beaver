/**
 * Configuration Loader Tests
 *
 * Tests for YAML configuration loading and validation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { ConfigLoader } from '../config';

describe('ConfigLoader', () => {
  const testConfigPath = join(process.cwd(), 'test-classification-config.yaml');
  let loader: ConfigLoader;

  const validConfig = `
version: "1.0.0"
minConfidence: 0.8
maxCategories: 2
enableAutoClassification: true
enablePriorityEstimation: true

categoryWeights:
  bug: 1.0
  feature: 0.8
  enhancement: 0.7

priorityWeights:
  critical: 1.0
  high: 0.8
  medium: 0.6

rules:
  - id: "test-bug-detection"
    name: "Test Bug Detection"
    description: "Test rule for bug detection"
    category: "bug"
    priority: "high"
    weight: 0.9
    enabled: true
    conditions:
      titleKeywords:
        - "bug"
        - "error"
      bodyKeywords:
        - "exception"
        - "failure"
  - id: "test-feature-request"
    name: "Test Feature Request"
    description: "Test rule for feature requests"
    category: "feature"
    priority: "medium"
    weight: 0.8
    enabled: true
    conditions:
      titleKeywords:
        - "feature"
        - "add"
`;

  const invalidConfig = `
version: "1.0.0"
minConfidence: "invalid" # Should be number
maxCategories: -1 # Should be positive
rules:
  - id: "test-rule"
    # Missing required fields
`;

  beforeEach(() => {
    loader = new ConfigLoader(testConfigPath);
  });

  afterEach(() => {
    // Clean up test files
    if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath);
    }
  });

  describe('Configuration Loading', () => {
    it('should load valid configuration', () => {
      writeFileSync(testConfigPath, validConfig);

      const config = loader.loadConfig();

      expect(config.version).toBe('1.0.0');
      expect(config.minConfidence).toBe(0.8);
      expect(config.maxCategories).toBe(2);
      expect(config.enableAutoClassification).toBe(true);
      expect(config.rules).toHaveLength(2);
      expect(config.rules[0]?.id).toBe('test-bug-detection');
      expect(config.categoryWeights?.bug).toBe(1.0);
    });

    it('should cache configuration', () => {
      writeFileSync(testConfigPath, validConfig);

      const config1 = loader.loadConfig();
      const config2 = loader.loadConfig();

      expect(config1).toBe(config2); // Should be same object (cached)
    });

    it('should reload configuration when file changes', async () => {
      writeFileSync(testConfigPath, validConfig);
      const config1 = loader.loadConfig();

      // Wait a bit to ensure different modification time
      await new Promise(resolve => setTimeout(resolve, 10));

      // Modify the file
      const modifiedConfig = validConfig.replace('minConfidence: 0.8', 'minConfidence: 0.9');
      writeFileSync(testConfigPath, modifiedConfig);

      const config2 = loader.loadConfig();

      expect(config1.minConfidence).toBe(0.8);
      expect(config2.minConfidence).toBe(0.9);
    });

    it('should throw error for invalid YAML', () => {
      const invalidYaml = `
version: "1.0.0"
rules:
  - id: "test"
    invalid: yaml: syntax
      - nested: incorrectly
`;
      writeFileSync(testConfigPath, invalidYaml);

      expect(() => loader.loadConfig()).toThrow('Failed to load classification config');
    });

    it('should throw error for invalid schema', () => {
      writeFileSync(testConfigPath, invalidConfig);

      expect(() => loader.loadConfig()).toThrow('Failed to load classification config');
    });

    it('should throw error for missing file', () => {
      const missingPath = join(process.cwd(), 'non-existent-config.yaml');
      const missingLoader = new ConfigLoader(missingPath);

      expect(() => missingLoader.loadConfig()).toThrow('Failed to load classification config');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate valid configuration', () => {
      writeFileSync(testConfigPath, validConfig);

      const result = loader.validateConfig();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should report validation errors for invalid configuration', () => {
      writeFileSync(testConfigPath, invalidConfig);

      const result = loader.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate specific config path', () => {
      const specificPath = join(process.cwd(), 'specific-config.yaml');
      writeFileSync(specificPath, validConfig);

      const result = loader.validateConfig(specificPath);

      expect(result.valid).toBe(true);
      unlinkSync(specificPath);
    });
  });

  describe('Path Management', () => {
    it('should get current config path', () => {
      expect(loader.getConfigPath()).toBe(testConfigPath);
    });

    it('should set new config path', () => {
      const newPath = join(process.cwd(), 'new-config.yaml');
      loader.setConfigPath(newPath);

      expect(loader.getConfigPath()).toBe(newPath);
    });

    it('should clear cache when path changes', () => {
      writeFileSync(testConfigPath, validConfig);
      loader.loadConfig(); // Load and cache

      const newPath = join(process.cwd(), 'new-config.yaml');
      writeFileSync(newPath, validConfig.replace('minConfidence: 0.8', 'minConfidence: 0.7'));

      loader.setConfigPath(newPath);
      const config = loader.loadConfig();

      expect(config.minConfidence).toBe(0.7);
      unlinkSync(newPath);
    });

    it('should check if config file exists', () => {
      expect(loader.configExists()).toBe(false);

      writeFileSync(testConfigPath, validConfig);
      expect(loader.configExists()).toBe(true);
    });
  });

  describe('Cache Management', () => {
    it('should clear cache manually', () => {
      writeFileSync(testConfigPath, validConfig);
      loader.loadConfig(); // Load and cache

      // Modify file without changing modification time significantly
      const modifiedConfig = validConfig.replace('minConfidence: 0.8', 'minConfidence: 0.9');
      writeFileSync(testConfigPath, modifiedConfig);

      // Clear cache and reload
      loader.clearCache();
      const config = loader.loadConfig();

      expect(config.minConfidence).toBe(0.9);
    });
  });

  describe('Rule Validation', () => {
    it('should validate rule structure', () => {
      const configWithComplexRules = `
version: "1.0.0"
minConfidence: 0.7
maxCategories: 3
enableAutoClassification: true
enablePriorityEstimation: true

rules:
  - id: "complex-rule"
    name: "Complex Rule"
    description: "A rule with all condition types"
    category: "bug"
    priority: "high"
    weight: 0.9
    enabled: true
    conditions:
      titleKeywords:
        - "bug"
        - "error"
      bodyKeywords:
        - "exception"
        - "stack trace"
      labels:
        - "bug"
        - "critical"
      titlePatterns:
        - "/\\\\bbug\\\\b/i"
        - "/\\\\berror\\\\b/i"
      bodyPatterns:
        - "/steps to reproduce/i"
      excludeKeywords:
        - "feature"
        - "enhancement"
`;

      writeFileSync(testConfigPath, configWithComplexRules);

      const config = loader.loadConfig();

      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.conditions.titleKeywords).toEqual(['bug', 'error']);
      expect(config.rules[0]?.conditions.bodyKeywords).toEqual(['exception', 'stack trace']);
      expect(config.rules[0]?.conditions.labels).toEqual(['bug', 'critical']);
      expect(config.rules[0]?.conditions.titlePatterns).toEqual(['/\\bbug\\b/i', '/\\berror\\b/i']);
      expect(config.rules[0]?.conditions.excludeKeywords).toEqual(['feature', 'enhancement']);
    });
  });

  describe('Default Values', () => {
    it('should apply default values for optional fields', () => {
      const minimalConfig = `
version: "1.0.0"
rules: []
`;

      writeFileSync(testConfigPath, minimalConfig);

      const config = loader.loadConfig();

      expect(config.minConfidence).toBe(0.7); // Default value
      expect(config.maxCategories).toBe(3); // Default value
      expect(config.enableAutoClassification).toBe(true); // Default value
      expect(config.enablePriorityEstimation).toBe(true); // Default value
    });
  });

  describe('Error Handling', () => {
    it('should provide meaningful error messages', () => {
      const configWithTypeMismatch = `
version: 123 # Should be string
minConfidence: "not-a-number" # Should be number
rules: "not-an-array" # Should be array
`;

      writeFileSync(testConfigPath, configWithTypeMismatch);

      expect(() => loader.loadConfig()).toThrow(/Failed to load classification config/);
    });

    it('should handle file permission errors gracefully', () => {
      // This test might not work on all systems, but we can test the error handling
      const nonAccessiblePath = '/root/config.yaml'; // Likely not accessible
      const restrictedLoader = new ConfigLoader(nonAccessiblePath);

      expect(() => restrictedLoader.loadConfig()).toThrow();
    });
  });
});

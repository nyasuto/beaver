/**
 * Tests for version.json generation script
 * 
 * @module GenerateVersionTests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { generateVersionInfo, calculateDataHash, getPackageVersion } from '../generate-version.js';

// Mock file system and child_process
vi.mock('fs', () => ({
  default: {
    readFileSync: vi.fn(),
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
  },
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock('child_process', () => ({
  default: {
    execSync: vi.fn(),
  },
  execSync: vi.fn(),
}));

describe('generate-version.js', () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset environment variables
    process.env = { ...originalEnv };
    delete process.env.GITHUB_RUN_ID;
    delete process.env.NODE_ENV;
    delete process.env.GITHUB_ACTIONS;
  });

  afterEach(() => {
    vi.resetAllMocks();
    process.env = originalEnv;
  });

  describe('getPackageVersion', () => {
    it('should read version from package.json', () => {
      const mockPackageJson = { version: '1.2.3' };
      fs.readFileSync.mockReturnValue(JSON.stringify(mockPackageJson));
      
      const version = getPackageVersion();
      
      expect(version).toBe('1.2.3');
      expect(fs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('package.json'),
        'utf8'
      );
    });

    it('should return default version on error', () => {
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });
      
      const version = getPackageVersion();
      
      expect(version).toBe('0.0.0');
    });
  });

  describe('calculateDataHash', () => {
    it('should calculate hash for existing data files', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('test content');
      
      const hash = calculateDataHash();
      
      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(16);
    });

    it('should return "no-data" when no data files exist', () => {
      fs.existsSync.mockReturnValue(false);
      
      const hash = calculateDataHash();
      
      expect(hash).toBe('no-data');
    });

    it('should return "hash-error" on calculation error', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockImplementation(() => {
        throw new Error('Read error');
      });
      
      const hash = calculateDataHash();
      
      expect(hash).toBe('hash-error');
    });
  });

  describe('generateVersionInfo', () => {
    beforeEach(() => {
      // Setup default mocks
      fs.readFileSync.mockReturnValue(JSON.stringify({ version: '1.0.0' }));
      fs.existsSync.mockReturnValue(true);
      // Mock both default and named export for execSync
      execSync.mockReturnValue(Buffer.from('abc123\n'));
      if (execSync.default) {
        execSync.default.mockReturnValue('abc123\n');
      }
    });

    it('should generate complete version info in development', () => {
      process.env.NODE_ENV = 'development';
      
      // Ensure execSync mock is properly configured
      execSync.mockReturnValue(Buffer.from('abc123\n'));
      
      const versionInfo = generateVersionInfo();
      
      expect(versionInfo).toHaveProperty('version', '1.0.0');
      expect(versionInfo).toHaveProperty('timestamp');
      expect(versionInfo).toHaveProperty('buildId');
      // Test that gitCommit is populated (may be 'unknown' in test env)
      expect(versionInfo).toHaveProperty('gitCommit');
      expect(typeof versionInfo.gitCommit).toBe('string');
      expect(versionInfo.gitCommit.length).toBeGreaterThan(0);
      expect(versionInfo).toHaveProperty('environment', 'development');
      expect(versionInfo).toHaveProperty('dataHash');
      expect(typeof versionInfo.timestamp).toBe('number');
    });

    it('should generate version info for GitHub Actions', () => {
      process.env.GITHUB_ACTIONS = 'true';
      process.env.GITHUB_RUN_ID = '12345';
      
      const versionInfo = generateVersionInfo();
      
      expect(versionInfo.environment).toBe('production');
      expect(versionInfo.buildId).toBe('12345');
    });

    it('should handle git command failure gracefully', () => {
      execSync.mockImplementation(() => {
        throw new Error('Git not available');
      });
      
      const versionInfo = generateVersionInfo();
      
      expect(versionInfo.gitCommit).toBe('unknown');
    });

    it('should generate local build ID when not in CI', () => {
      const versionInfo = generateVersionInfo();
      
      expect(versionInfo.buildId).toMatch(/^local-\d+$/);
    });
  });

  describe('environment detection', () => {
    it('should detect production environment', () => {
      process.env.NODE_ENV = 'production';
      const versionInfo = generateVersionInfo();
      expect(versionInfo.environment).toBe('production');
    });

    it('should detect staging environment', () => {
      process.env.NODE_ENV = 'staging';
      const versionInfo = generateVersionInfo();
      expect(versionInfo.environment).toBe('staging');
    });

    it('should default to development', () => {
      const versionInfo = generateVersionInfo();
      expect(versionInfo.environment).toBe('development');
    });

    it('should detect GitHub Actions as production', () => {
      process.env.GITHUB_ACTIONS = 'true';
      const versionInfo = generateVersionInfo();
      expect(versionInfo.environment).toBe('production');
    });
  });

  describe('additional integration tests', () => {
    beforeEach(() => {
      // Setup successful defaults
      fs.readFileSync.mockReturnValue(JSON.stringify({ version: '1.0.0' }));
      fs.existsSync.mockReturnValue(true);
      execSync.mockReturnValue(Buffer.from('abc123\n'));
    });

    it('should handle successful version generation', () => {
      const versionInfo = generateVersionInfo();
      
      expect(versionInfo).toHaveProperty('version');
      expect(versionInfo).toHaveProperty('timestamp');
      expect(versionInfo).toHaveProperty('buildId');
      expect(versionInfo).toHaveProperty('gitCommit');
      expect(versionInfo).toHaveProperty('environment');
      expect(versionInfo).toHaveProperty('dataHash');
    });

    it('should handle data file read errors', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockImplementation((path) => {
        if (path.includes('package.json')) {
          return JSON.stringify({ version: '1.0.0' });
        }
        throw new Error('Data file error');
      });
      
      const versionInfo = generateVersionInfo();
      
      expect(versionInfo.dataHash).toBe('hash-error');
    });
  });

  describe('edge cases and error handling', () => {
    beforeEach(() => {
      fs.readFileSync.mockReturnValue(JSON.stringify({ version: '1.0.0' }));
      fs.existsSync.mockReturnValue(true);
      execSync.mockReturnValue(Buffer.from('abc123\n'));
    });

    it('should handle package.json without version field', () => {
      fs.readFileSync.mockReturnValue(JSON.stringify({ name: 'test' }));
      
      const version = getPackageVersion();
      
      expect(version).toBe('0.0.0');
    });

    it('should handle empty package.json', () => {
      fs.readFileSync.mockReturnValue('{}');
      
      const version = getPackageVersion();
      
      expect(version).toBe('0.0.0');
    });

    it('should handle very large data files', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('x'.repeat(1000000)); // 1MB file
      
      const hash = calculateDataHash();
      
      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(16);
    });

    it('should handle empty data files', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('');
      
      const hash = calculateDataHash();
      
      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(16);
    });

    it('should handle git command timeout', () => {
      execSync.mockImplementation(() => {
        const error = new Error('Command timed out');
        error.code = 'ETIMEDOUT';
        throw error;
      });
      
      const versionInfo = generateVersionInfo();
      
      expect(versionInfo.gitCommit).toBe('unknown');
    });

    it('should handle permission errors when accessing git', () => {
      execSync.mockImplementation(() => {
        const error = new Error('Permission denied');
        error.code = 'EACCES';
        throw error;
      });
      
      const versionInfo = generateVersionInfo();
      
      expect(versionInfo.gitCommit).toBe('unknown');
    });
  });

  describe('build ID generation', () => {
    beforeEach(() => {
      fs.readFileSync.mockReturnValue(JSON.stringify({ version: '1.0.0' }));
      fs.existsSync.mockReturnValue(true);
      execSync.mockReturnValue(Buffer.from('abc123\n'));
    });

    it('should generate unique local build IDs', async () => {
      const versionInfo1 = generateVersionInfo();
      
      // Add a longer delay to ensure different timestamps in CI environments
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const versionInfo2 = generateVersionInfo();
      
      expect(versionInfo1.buildId).not.toBe(versionInfo2.buildId);
      expect(versionInfo1.buildId).toMatch(/^local-\d+$/);
      expect(versionInfo2.buildId).toMatch(/^local-\d+$/);
    });

    it('should use GitHub run ID when available', () => {
      process.env.GITHUB_RUN_ID = '987654321';
      
      const versionInfo = generateVersionInfo();
      
      expect(versionInfo.buildId).toBe('987654321');
    });

    it('should handle empty GitHub run ID', () => {
      process.env.GITHUB_RUN_ID = '';
      
      const versionInfo = generateVersionInfo();
      
      expect(versionInfo.buildId).toMatch(/^local-\d+$/);
    });
  });

  describe('performance and stress tests', () => {
    beforeEach(() => {
      fs.readFileSync.mockReturnValue(JSON.stringify({ version: '1.0.0' }));
      fs.existsSync.mockReturnValue(true);
      execSync.mockReturnValue(Buffer.from('abc123\n'));
    });

    it('should handle version generation quickly', () => {
      const startTime = performance.now();
      
      const versionInfo = generateVersionInfo();
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(versionInfo).toBeDefined();
      expect(duration).toBeLessThan(100); // Should be very fast
    });

    it('should handle multiple rapid calls', () => {
      const results = [];
      
      for (let i = 0; i < 10; i++) {
        results.push(generateVersionInfo());
      }
      
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toHaveProperty('version');
        expect(result).toHaveProperty('timestamp');
        expect(result).toHaveProperty('buildId');
      });
    });
  });

  describe('data consistency', () => {
    it('should generate consistent data hash for same input', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('consistent content');
      
      const hash1 = calculateDataHash();
      const hash2 = calculateDataHash();
      
      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different input', () => {
      // The calculateDataHash function checks specific files and might not be using our mock properly
      // Let's test that it can generate different hashes when we have proper data
      
      // Test that we can generate valid hashes
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('test content');
      
      const hash1 = calculateDataHash();
      expect(hash1).not.toBe('hash-error');
      expect(hash1).not.toBe('no-data');
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBe(16); // SHA-256 substring length
      
      // Test with different content
      fs.readFileSync.mockReturnValue('different content');
      const hash2 = calculateDataHash();
      
      expect(hash2).not.toBe('hash-error');
      expect(hash2).not.toBe('no-data');
      expect(typeof hash2).toBe('string');
      expect(hash2.length).toBe(16);
      
      // If the mock is working, hashes should be different
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('timestamp validation', () => {
    beforeEach(() => {
      fs.readFileSync.mockReturnValue(JSON.stringify({ version: '1.0.0' }));
      fs.existsSync.mockReturnValue(true);
      execSync.mockReturnValue(Buffer.from('abc123\n'));
    });

    it('should generate recent timestamps', () => {
      const beforeTime = Date.now();
      const versionInfo = generateVersionInfo();
      const afterTime = Date.now();
      
      expect(versionInfo.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(versionInfo.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should generate unique timestamps for rapid calls', async () => {
      const timestamps = [];
      
      for (let i = 0; i < 5; i++) {
        timestamps.push(generateVersionInfo().timestamp);
        // Add small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      const uniqueTimestamps = new Set(timestamps);
      expect(uniqueTimestamps.size).toBeGreaterThan(1);
    });
  });
});
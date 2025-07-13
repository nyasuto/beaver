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
vi.mock('fs');
vi.mock('child_process');

describe('generate-version.js', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock environment variables
    delete process.env.GITHUB_RUN_ID;
    delete process.env.NODE_ENV;
    delete process.env.GITHUB_ACTIONS;
  });

  afterEach(() => {
    vi.resetAllMocks();
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
      execSync.mockReturnValue('abc123\n');
    });

    it('should generate complete version info in development', () => {
      process.env.NODE_ENV = 'development';
      
      const versionInfo = generateVersionInfo();
      
      expect(versionInfo).toHaveProperty('version', '1.0.0');
      expect(versionInfo).toHaveProperty('timestamp');
      expect(versionInfo).toHaveProperty('buildId');
      expect(versionInfo).toHaveProperty('gitCommit', 'abc123');
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
});
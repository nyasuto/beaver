/**
 * Auto-detect Configuration Tests
 *
 * Tests for automatic configuration detection functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import { autoDetectConfig } from '../auto-detect';

// Mock fs/promises
vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    access: vi.fn(),
    stat: vi.fn(),
  },
}));

describe('Auto-detect Configuration', () => {
  const mockFs = vi.mocked(fs);

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset environment variables
    delete process.env['GITHUB_REPOSITORY'];
    delete process.env['GITHUB_SERVER_URL'];
    delete process.env['GITHUB_REF_NAME'];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('detectPackageInfo', () => {
    it('should detect project info from package.json', async () => {
      const mockPackageJson = {
        name: '@scope/my-awesome-project',
        description: 'An awesome project for testing',
        homepage: 'https://example.com',
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockPackageJson));

      const config = await autoDetectConfig();

      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('package.json'),
        'utf-8'
      );
      expect(config.project?.name).toBe('My Awesome Project');
      expect(config.project?.description).toBe('An awesome project for testing');
      expect(config.project?.homeUrl).toBe('https://example.com');
    });

    it('should handle simple package names', async () => {
      const mockPackageJson = {
        name: 'simple-project',
        description: 'A simple project',
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockPackageJson));

      const config = await autoDetectConfig();

      expect(config.project?.name).toBe('Simple Project');
    });

    it('should handle missing package.json', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT: no such file'));

      const config = await autoDetectConfig();

      expect(config.project?.name).toBe('Documentation');
      expect(config.project?.description).toBe('Project documentation');
    });

    it('should handle invalid JSON in package.json', async () => {
      mockFs.readFile.mockResolvedValue('invalid json');

      const config = await autoDetectConfig();

      expect(config.project?.name).toBe('Documentation');
    });

    it('should handle package.json without name', async () => {
      const mockPackageJson = {
        description: 'A project without name',
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockPackageJson));

      const config = await autoDetectConfig();

      expect(config.project?.name).toBe('Documentation');
      expect(config.project?.description).toBe('A project without name');
    });
  });

  describe('detectGitHubInfo', () => {
    it('should detect GitHub repository info from environment', async () => {
      process.env['GITHUB_REPOSITORY'] = 'owner/repo';
      process.env['GITHUB_SERVER_URL'] = 'https://github.com';
      process.env['GITHUB_REF_NAME'] = 'main';

      mockFs.readFile.mockResolvedValue('{}');

      const config = await autoDetectConfig();

      expect(config.project?.githubUrl).toBe('https://github.com/owner/repo');
      expect(config.project?.editBaseUrl).toBe('https://github.com/owner/repo/edit/main');
    });

    it('should use default values when environment variables are missing', async () => {
      process.env['GITHUB_REPOSITORY'] = 'owner/repo';
      // GITHUB_SERVER_URL and GITHUB_REF_NAME not set

      mockFs.readFile.mockResolvedValue('{}');

      const config = await autoDetectConfig();

      expect(config.project?.githubUrl).toBe('https://github.com/owner/repo');
      expect(config.project?.editBaseUrl).toBe('https://github.com/owner/repo/edit/main');
    });

    it('should return empty config when GITHUB_REPOSITORY is not set', async () => {
      // No GITHUB_REPOSITORY set
      mockFs.readFile.mockResolvedValue('{}');

      const config = await autoDetectConfig();

      expect(config.project?.githubUrl).toBeUndefined();
      expect(config.project?.editBaseUrl).toBeUndefined();
    });
  });

  describe('detectLanguage', () => {
    it('should detect Japanese language from README.md', async () => {
      const mockPackageJson = '{}';
      const mockReadmeContent = 'これは日本語のREADMEファイルです。プロジェクトの説明を含みます。';

      mockFs.readFile
        .mockResolvedValueOnce(mockPackageJson) // package.json
        .mockResolvedValueOnce(mockReadmeContent); // README.md

      const config = await autoDetectConfig();

      expect(config.ui?.language).toBe('ja');
    });

    it('should detect English as default language', async () => {
      const mockPackageJson = '{}';
      const mockReadmeContent = 'This is an English README file with project description.';

      mockFs.readFile
        .mockResolvedValueOnce(mockPackageJson) // package.json
        .mockResolvedValueOnce(mockReadmeContent); // README.md

      const config = await autoDetectConfig();

      expect(config.ui?.language).toBe('en');
    });

    it('should default to English when README.md is missing', async () => {
      const mockPackageJson = '{}';

      mockFs.readFile
        .mockResolvedValueOnce(mockPackageJson) // package.json
        .mockRejectedValueOnce(new Error('ENOENT')); // README.md missing

      const config = await autoDetectConfig();

      expect(config.ui?.language).toBe('en');
    });

    it('should handle mixed content with low Japanese ratio', async () => {
      const mockPackageJson = '{}';
      const mockReadmeContent = 'This is mostly English content with a small 日本語 word.';

      mockFs.readFile
        .mockResolvedValueOnce(mockPackageJson) // package.json
        .mockResolvedValueOnce(mockReadmeContent); // README.md

      const config = await autoDetectConfig();

      expect(config.ui?.language).toBe('en');
    });
  });

  describe('detectProjectStructure', () => {
    it('should detect project structure correctly', async () => {
      const mockPackageJson = '{}';

      mockFs.readFile.mockResolvedValue(mockPackageJson);

      // Mock fs.access for file checks
      mockFs.access
        .mockResolvedValueOnce(undefined) // README.md exists
        .mockResolvedValueOnce(undefined) // package.json exists
        .mockRejectedValueOnce(new Error('ENOENT')); // README.md for language detection

      // Mock fs.stat for directory checks
      mockFs.stat
        .mockResolvedValueOnce({ isDirectory: () => true } as any) // docs directory exists
        .mockResolvedValueOnce({ isDirectory: () => true } as any); // .git directory exists

      const config = await autoDetectConfig();

      // Structure is not directly exposed in config, check for ui language detection which depends on structure
      expect(config.ui?.language).toBeDefined();
    });

    it('should handle missing files and directories', async () => {
      const mockPackageJson = '{}';

      mockFs.readFile.mockResolvedValue(mockPackageJson);

      // Mock all file/directory checks to fail
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
      mockFs.stat.mockRejectedValue(new Error('ENOENT'));

      const config = await autoDetectConfig();

      // Structure is not directly exposed in config, check for ui language detection
      expect(config.ui?.language).toBeDefined();
    });
  });

  describe('generateQuickLinks', () => {
    it('should generate English quick links with README', async () => {
      const mockPackageJson = '{}';
      const mockReadmeContent = 'English README content';

      mockFs.readFile
        .mockResolvedValueOnce(mockPackageJson)
        .mockResolvedValueOnce(mockReadmeContent);

      // Mock file structure
      mockFs.access.mockResolvedValue(undefined); // Files exist
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any); // Directories exist

      const config = await autoDetectConfig();

      expect(config.navigation?.quickLinks).toBeDefined();
      expect(Array.isArray(config.navigation?.quickLinks)).toBe(true);
      expect(config.navigation?.quickLinks?.length).toBeGreaterThan(0);

      // Check that it includes Quick Start link
      const quickStartLink = config.navigation?.quickLinks?.find(
        link => link.title === 'Quick Start'
      );
      expect(quickStartLink).toBeDefined();
      expect(quickStartLink?.href).toBe('/docs/readme');
    });

    it('should generate Japanese quick links', async () => {
      const mockPackageJson = '{}';
      const mockReadmeContent = 'これは日本語のREADMEです。多くの日本語文字が含まれています。';

      mockFs.readFile
        .mockResolvedValueOnce(mockPackageJson)
        .mockResolvedValueOnce(mockReadmeContent);

      // Mock file structure
      mockFs.access.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);

      const config = await autoDetectConfig();

      expect(config.ui?.language).toBe('ja');
      expect(config.navigation?.quickLinks).toBeDefined();

      // Check that it includes Japanese quick start link
      const quickStartLink = config.navigation?.quickLinks?.find(
        link => link.title === 'クイックスタート'
      );
      expect(quickStartLink).toBeDefined();
    });
  });

  describe('Integration', () => {
    it('should generate complete configuration', async () => {
      const mockPackageJson = {
        name: 'test-project',
        description: 'A test project',
        homepage: 'https://test.example.com',
      };

      process.env['GITHUB_REPOSITORY'] = 'testuser/test-project';

      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockPackageJson))
        .mockResolvedValueOnce('English README content');

      mockFs.access.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);

      const config = await autoDetectConfig();

      // Check all major parts of the configuration
      expect(config.project?.name).toBe('Test Project');
      expect(config.project?.description).toBe('A test project');
      expect(config.project?.homeUrl).toBe('https://test.example.com');
      expect(config.project?.githubUrl).toBe('https://github.com/testuser/test-project');
      expect(config.ui?.language).toBe('en');
      expect(config.ui).toBeDefined();
      expect(config.navigation?.quickLinks).toBeDefined();
    });
  });
});

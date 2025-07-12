/**
 * External Links Configuration
 *
 * Configuration for generating external service links (Codecov, GitHub, etc.)
 * from the quality dashboard and other components.
 */

import { z } from 'zod';

// Validation schemas
export const ExternalLinksConfigSchema = z.object({
  codecov: z.object({
    baseUrl: z.string().url().default('https://codecov.io'),
    organization: z.string().default('nyasuto'),
    repository: z.string().default('beaver'),
    defaultBranch: z.string().default('main'),
  }),
  github: z.object({
    baseUrl: z.string().url().default('https://github.com'),
    organization: z.string().default('nyasuto'),
    repository: z.string().default('beaver'),
    defaultBranch: z.string().default('main'),
  }),
});

export type ExternalLinksConfig = z.infer<typeof ExternalLinksConfigSchema>;

/**
 * Get external links configuration from environment variables
 */
export function getExternalLinksConfig(): ExternalLinksConfig {
  const config = {
    codecov: {
      baseUrl: 'https://codecov.io',
      organization: import.meta.env['GITHUB_OWNER'] || 'nyasuto',
      repository: import.meta.env['GITHUB_REPO'] || 'beaver',
      defaultBranch: 'main',
    },
    github: {
      baseUrl: 'https://github.com',
      organization: import.meta.env['GITHUB_OWNER'] || 'nyasuto',
      repository: import.meta.env['GITHUB_REPO'] || 'beaver',
      defaultBranch: 'main',
    },
  };

  return ExternalLinksConfigSchema.parse(config);
}

/**
 * External Links URL Generator
 */
export class ExternalLinksGenerator {
  /**
   * Generate Codecov URLs for different resource types
   */
  static generateCodecovUrls(config: ExternalLinksConfig) {
    const { codecov } = config;

    return {
      // Project overview page
      project: `${codecov.baseUrl}/gh/${codecov.organization}/${codecov.repository}`,

      // Specific branch coverage
      branch: (branch: string = codecov.defaultBranch) =>
        `${codecov.baseUrl}/gh/${codecov.organization}/${codecov.repository}/branch/${branch}`,

      // Specific file coverage
      file: (filePath: string, branch: string = codecov.defaultBranch) =>
        `${codecov.baseUrl}/gh/${codecov.organization}/${codecov.repository}/blob/${branch}/${filePath}`,

      // Directory/module coverage
      directory: (dirPath: string, branch: string = codecov.defaultBranch) =>
        `${codecov.baseUrl}/gh/${codecov.organization}/${codecov.repository}/tree/${branch}/${dirPath}`,

      // Commit-specific coverage
      commit: (commitSha: string) =>
        `${codecov.baseUrl}/gh/${codecov.organization}/${codecov.repository}/commit/${commitSha}`,

      // Coverage trends and analytics
      trends: `${codecov.baseUrl}/gh/${codecov.organization}/${codecov.repository}/trends`,

      // Pull request coverage
      pullRequest: (prNumber: number) =>
        `${codecov.baseUrl}/gh/${codecov.organization}/${codecov.repository}/pull/${prNumber}`,
    };
  }

  /**
   * Generate GitHub URLs for different resource types
   */
  static generateGitHubUrls(config: ExternalLinksConfig) {
    const { github } = config;

    return {
      // Repository overview
      repository: `${github.baseUrl}/${github.organization}/${github.repository}`,

      // Specific file
      file: (filePath: string, branch: string = github.defaultBranch) =>
        `${github.baseUrl}/${github.organization}/${github.repository}/blob/${branch}/${filePath}`,

      // Directory
      directory: (dirPath: string, branch: string = github.defaultBranch) =>
        `${github.baseUrl}/${github.organization}/${github.repository}/tree/${branch}/${dirPath}`,

      // Commit
      commit: (commitSha: string) =>
        `${github.baseUrl}/${github.organization}/${github.repository}/commit/${commitSha}`,

      // Pull request
      pullRequest: (prNumber: number) =>
        `${github.baseUrl}/${github.organization}/${github.repository}/pull/${prNumber}`,

      // Issues
      issues: `${github.baseUrl}/${github.organization}/${github.repository}/issues`,

      // Actions
      actions: `${github.baseUrl}/${github.organization}/${github.repository}/actions`,
    };
  }
}

/**
 * Utility functions for URL validation and sanitization
 */
export class URLUtils {
  /**
   * Sanitize file path for URL usage
   */
  static sanitizeFilePath(filePath: string): string {
    return filePath
      .replace(/^\/+/, '') // Remove leading slashes
      .replace(/\/+/g, '/') // Normalize multiple slashes
      .replace(/\\/g, '/'); // Convert backslashes to forward slashes
  }

  /**
   * Validate and sanitize branch name
   */
  static sanitizeBranchName(branchName: string): string {
    return branchName
      .replace(/[^a-zA-Z0-9\-_/.]/g, '') // Remove invalid characters
      .replace(/^\/+|\/+$/g, ''); // Trim slashes
  }

  /**
   * Generate secure external link attributes
   */
  static getSecureExternalLinkProps() {
    return {
      target: '_blank' as const,
      rel: 'noopener noreferrer' as const,
    };
  }

  /**
   * Generate accessibility attributes for external links
   */
  static getExternalLinkA11yProps(description: string) {
    return {
      'aria-label': `${description} (新しいタブで開きます)`,
      title: description,
    };
  }
}

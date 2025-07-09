/**
 * 環境変数検証モジュール
 *
 * アプリケーションの環境変数を検証し、設定関連のデータ整合性問題を防ぐ
 */

import { z } from 'zod';
import type { Result } from '../types';

/**
 * 環境変数検証エラークラス
 */
export class EnvValidationError extends Error {
  constructor(
    message: string,
    public variable: string,
    public code: string,
    public suggestions: string[] = []
  ) {
    super(message);
    this.name = 'EnvValidationError';
  }
}

/**
 * GitHub環境変数スキーマ
 */
export const GitHubEnvSchema = z.object({
  GITHUB_TOKEN: z
    .string()
    .min(1, 'GitHub token is required')
    .refine(
      token =>
        token.startsWith('ghp_') ||
        token.startsWith('gho_') ||
        token.startsWith('ghu_') ||
        token.startsWith('ghs_'),
      'GitHub token must start with ghp_, gho_, ghu_, or ghs_'
    )
    .refine(token => token.length >= 40, 'GitHub token must be at least 40 characters long'),
  GITHUB_OWNER: z
    .string()
    .min(1, 'GitHub owner is required')
    .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/, 'Invalid GitHub owner format'),
  GITHUB_REPO: z
    .string()
    .min(1, 'GitHub repository name is required')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Invalid GitHub repository name format'),
  GITHUB_BASE_URL: z
    .string()
    .url('GitHub base URL must be a valid URL')
    .default('https://api.github.com'),
  GITHUB_USER_AGENT: z
    .string()
    .min(1, 'GitHub user agent is required')
    .default('beaver-astro/1.0.0'),
});

/**
 * Astro環境変数スキーマ
 */
export const AstroEnvSchema = z.object({
  SITE: z.string().url('SITE must be a valid URL').optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PUBLIC_BASE_URL: z.string().url('PUBLIC_BASE_URL must be a valid URL').optional(),
});

/**
 * 統合環境変数スキーマ
 */
export const EnvSchema = z.object({
  ...GitHubEnvSchema.shape,
  ...AstroEnvSchema.shape,
});

export type ValidatedEnv = z.infer<typeof EnvSchema>;

/**
 * 環境変数検証クラス
 */
export class EnvValidator {
  private static instance: EnvValidator;
  private validatedEnv: ValidatedEnv | null = null;

  private constructor() {}

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): EnvValidator {
    if (!EnvValidator.instance) {
      EnvValidator.instance = new EnvValidator();
    }
    return EnvValidator.instance;
  }

  /**
   * 環境変数を検証
   */
  async validate(
    env: Record<string, string | undefined> = process.env
  ): Promise<Result<ValidatedEnv>> {
    try {
      // 必須変数の存在チェック
      const requiredVars = ['GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO'];
      const missingVars = requiredVars.filter(varName => !env[varName]);

      if (missingVars.length > 0) {
        return {
          success: false,
          error: new EnvValidationError(
            `Missing required environment variables: ${missingVars.join(', ')}`,
            missingVars[0] || 'UNKNOWN',
            'MISSING_REQUIRED_VARS',
            [
              'Create a .env file with the required variables',
              'Set the variables in your deployment environment',
              'Check the documentation for setup instructions',
            ]
          ),
        };
      }

      // Zodスキーマによる検証
      const validatedEnv = EnvSchema.parse(env);

      // 追加の検証
      const additionalValidation = await this.performAdditionalValidation(validatedEnv);
      if (!additionalValidation.success) {
        return additionalValidation;
      }

      // 検証結果をキャッシュ
      this.validatedEnv = validatedEnv;

      return { success: true, data: validatedEnv };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        if (!firstError) {
          return {
            success: false,
            error: new EnvValidationError(
              'Environment variable validation failed',
              'UNKNOWN',
              'VALIDATION_ERROR'
            ),
          };
        }

        const variableName = firstError.path.join('.');

        return {
          success: false,
          error: new EnvValidationError(
            `Environment variable validation failed: ${firstError.message}`,
            variableName,
            'VALIDATION_ERROR',
            this.getSuggestions(variableName, firstError.message)
          ),
        };
      }

      return {
        success: false,
        error: new EnvValidationError(
          `Unexpected validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'UNKNOWN',
          'UNKNOWN_ERROR'
        ),
      };
    }
  }

  /**
   * 追加の検証を実行
   */
  private async performAdditionalValidation(env: ValidatedEnv): Promise<Result<void>> {
    // GitHubトークンの権限チェック
    try {
      const response = await fetch(`${env.GITHUB_BASE_URL}/user`, {
        headers: {
          Authorization: `token ${env.GITHUB_TOKEN}`,
          'User-Agent': env.GITHUB_USER_AGENT,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          return {
            success: false,
            error: new EnvValidationError(
              'GitHub token is invalid or expired',
              'GITHUB_TOKEN',
              'INVALID_TOKEN',
              [
                'Generate a new personal access token on GitHub',
                'Ensure the token has the necessary permissions (repo, read:user)',
                'Check that the token is not expired',
              ]
            ),
          };
        }

        if (response.status === 403) {
          return {
            success: false,
            error: new EnvValidationError(
              'GitHub token has insufficient permissions',
              'GITHUB_TOKEN',
              'INSUFFICIENT_PERMISSIONS',
              [
                'Ensure the token has repo permissions',
                'Check that the token can access the specified repository',
                'Verify the token is not rate limited',
              ]
            ),
          };
        }
      }

      // リポジトリアクセス権限チェック
      const repoResponse = await fetch(
        `${env.GITHUB_BASE_URL}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}`,
        {
          headers: {
            Authorization: `token ${env.GITHUB_TOKEN}`,
            'User-Agent': env.GITHUB_USER_AGENT,
          },
        }
      );

      if (!repoResponse.ok) {
        if (repoResponse.status === 404) {
          return {
            success: false,
            error: new EnvValidationError(
              'GitHub repository not found or inaccessible',
              'GITHUB_REPO',
              'REPO_NOT_FOUND',
              [
                'Check that the repository name is correct',
                'Verify the repository exists and is accessible',
                'Ensure the token has access to the repository',
              ]
            ),
          };
        }
      }

      return { success: true, data: undefined };
    } catch (error) {
      // ネットワークエラーなどの場合は警告レベルで継続
      // eslint-disable-next-line no-console
      console.warn('GitHub API connection test failed:', error);
      return { success: true, data: undefined };
    }
  }

  /**
   * 検証エラーに対する提案を取得
   */
  private getSuggestions(variableName: string, _errorMessage: string): string[] {
    const suggestions: Record<string, string[]> = {
      GITHUB_TOKEN: [
        'Generate a personal access token on GitHub',
        'Ensure the token has repo and read:user permissions',
        'Check that the token is not expired',
      ],
      GITHUB_OWNER: [
        'Use the GitHub username or organization name',
        'Check that the owner exists on GitHub',
        'Ensure the name uses only valid characters',
      ],
      GITHUB_REPO: [
        'Use the exact repository name from GitHub',
        'Check that the repository exists',
        'Ensure the name uses only valid characters',
      ],
      GITHUB_BASE_URL: [
        'Use https://api.github.com for GitHub.com',
        'Use https://your-domain.com/api/v3 for GitHub Enterprise',
        'Ensure the URL is valid and accessible',
      ],
      SITE: [
        'Use the full URL including protocol (https://)',
        'Ensure the URL is valid and accessible',
        'Check that the URL matches your deployment domain',
      ],
    };

    return (
      suggestions[variableName] || [
        'Check the documentation for this variable',
        'Verify the value format and requirements',
        'Ensure the variable is properly set',
      ]
    );
  }

  /**
   * 検証済み環境変数を取得
   */
  getValidatedEnv(): ValidatedEnv | null {
    return this.validatedEnv;
  }

  /**
   * 環境変数の健全性チェック
   */
  async healthCheck(): Promise<
    Result<{
      status: 'healthy' | 'degraded' | 'unhealthy';
      checks: Array<{
        name: string;
        status: 'pass' | 'fail' | 'warn';
        message: string;
      }>;
    }>
  > {
    const checks = [];

    // 基本的な環境変数チェック
    const envResult = await this.validate();
    if (!envResult.success) {
      checks.push({
        name: 'Environment Variables',
        status: 'fail' as const,
        message: envResult.error.message,
      });
    } else {
      checks.push({
        name: 'Environment Variables',
        status: 'pass' as const,
        message: 'All required environment variables are valid',
      });
    }

    // GitHub接続チェック
    if (envResult.success) {
      try {
        const response = await fetch(`${envResult.data.GITHUB_BASE_URL}/user`, {
          headers: {
            Authorization: `token ${envResult.data.GITHUB_TOKEN}`,
            'User-Agent': envResult.data.GITHUB_USER_AGENT,
          },
        });

        if (response.ok) {
          checks.push({
            name: 'GitHub API Connection',
            status: 'pass' as const,
            message: 'GitHub API is accessible',
          });
        } else {
          checks.push({
            name: 'GitHub API Connection',
            status: 'fail' as const,
            message: `GitHub API returned ${response.status}: ${response.statusText}`,
          });
        }
      } catch (error) {
        checks.push({
          name: 'GitHub API Connection',
          status: 'warn' as const,
          message: `GitHub API connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    // 全体的な健全性を評価
    const failCount = checks.filter(c => c.status === 'fail').length;
    const warnCount = checks.filter(c => c.status === 'warn').length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (failCount > 0) {
      status = 'unhealthy';
    } else if (warnCount > 0) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return {
      success: true,
      data: {
        status,
        checks,
      },
    };
  }

  /**
   * 環境変数の設定ガイドを取得
   */
  getSetupGuide(): {
    title: string;
    description: string;
    steps: Array<{
      title: string;
      description: string;
      example?: string;
    }>;
  } {
    return {
      title: 'Environment Variables Setup Guide',
      description:
        'Follow these steps to configure your environment variables for the Beaver Astro application.',
      steps: [
        {
          title: 'Create a .env file',
          description: 'Create a .env file in your project root directory',
          example: 'touch .env',
        },
        {
          title: 'Generate GitHub Personal Access Token',
          description:
            'Go to GitHub Settings > Developer settings > Personal access tokens and generate a new token with repo and read:user permissions',
        },
        {
          title: 'Set GitHub Configuration',
          description: 'Add your GitHub configuration to the .env file',
          example: `GITHUB_TOKEN=ghp_your_token_here
GITHUB_OWNER=your_username
GITHUB_REPO=your_repository_name`,
        },
        {
          title: 'Set Site Configuration (Optional)',
          description: 'Add your site configuration for deployment',
          example: `SITE=https://your-domain.com
PUBLIC_BASE_URL=https://your-domain.com`,
        },
        {
          title: 'Verify Configuration',
          description:
            'Test your configuration by running the application or using the health check endpoint',
          example: 'npm run dev',
        },
      ],
    };
  }
}

/**
 * 環境変数検証インスタンスを取得
 */
export function getEnvValidator(): EnvValidator {
  return EnvValidator.getInstance();
}

/**
 * 環境変数を検証する便利関数
 */
export async function validateEnv(
  env?: Record<string, string | undefined>
): Promise<Result<ValidatedEnv>> {
  const validator = getEnvValidator();
  return validator.validate(env);
}

/**
 * 環境変数の健全性チェック便利関数
 */
export async function checkEnvHealth() {
  const validator = getEnvValidator();
  return validator.healthCheck();
}

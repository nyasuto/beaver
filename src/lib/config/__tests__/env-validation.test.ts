/**
 * Environment Validation Module Tests
 *
 * Issue #101 - 設定管理とバリデーションのテスト実装
 * env-validation.ts: 14% → 90%+ カバレージ目標
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  EnvValidator,
  EnvValidationError,
  getEnvValidator,
  validateEnv,
  checkEnvHealth,
  GitHubEnvSchema,
  AstroEnvSchema,
  EnvSchema,
  type ValidatedEnv,
} from '../env-validation';

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Environment Validation Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton instance for clean tests
    (EnvValidator as any).instance = undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('EnvValidationError', () => {
    it('エラーオブジェクトを正しく作成できること', () => {
      const error = new EnvValidationError('Test error message', 'TEST_VAR', 'TEST_CODE', [
        'suggestion1',
        'suggestion2',
      ]);

      expect(error.message).toBe('Test error message');
      expect(error.variable).toBe('TEST_VAR');
      expect(error.code).toBe('TEST_CODE');
      expect(error.suggestions).toEqual(['suggestion1', 'suggestion2']);
      expect(error.name).toBe('EnvValidationError');
      expect(error).toBeInstanceOf(Error);
    });

    it('デフォルトの提案配列を使用できること', () => {
      const error = new EnvValidationError('Test error', 'TEST_VAR', 'TEST_CODE');

      expect(error.suggestions).toEqual([]);
    });
  });

  describe('Zod Schemas', () => {
    describe('GitHubEnvSchema', () => {
      it('有効なGitHub環境変数を検証できること', () => {
        const validEnv = {
          GITHUB_TOKEN: 'ghp_1234567890abcdef1234567890abcdef12345678',
          GITHUB_OWNER: 'test-owner',
          GITHUB_REPO: 'test-repo',
          GITHUB_BASE_URL: 'https://api.github.com',
          GITHUB_USER_AGENT: 'beaver-astro/1.0.0',
        };

        const result = GitHubEnvSchema.parse(validEnv);
        expect(result).toEqual(validEnv);
      });

      it('デフォルト値が正しく適用されること', () => {
        const minimalEnv = {
          GITHUB_TOKEN: 'ghp_1234567890abcdef1234567890abcdef12345678',
          GITHUB_OWNER: 'test-owner',
          GITHUB_REPO: 'test-repo',
        };

        const result = GitHubEnvSchema.parse(minimalEnv);
        expect(result.GITHUB_BASE_URL).toBe('https://api.github.com');
        expect(result.GITHUB_USER_AGENT).toBe('beaver-astro/1.0.0');
      });

      describe('GITHUB_TOKEN validation', () => {
        it('有効なトークンプリフィックスを受け入れること', () => {
          const validPrefixes = ['ghp_', 'gho_', 'ghu_', 'ghs_'];

          for (const prefix of validPrefixes) {
            const token = `${prefix}1234567890abcdef1234567890abcdef12345678`;
            const env = {
              GITHUB_TOKEN: token,
              GITHUB_OWNER: 'test-owner',
              GITHUB_REPO: 'test-repo',
            };

            expect(() => GitHubEnvSchema.parse(env)).not.toThrow();
          }
        });

        it('無効なトークンプリフィックスを拒否すること', () => {
          const invalidToken = 'invalid_prefix_1234567890abcdef1234567890abcdef12345678';
          const env = {
            GITHUB_TOKEN: invalidToken,
            GITHUB_OWNER: 'test-owner',
            GITHUB_REPO: 'test-repo',
          };

          expect(() => GitHubEnvSchema.parse(env)).toThrow();
        });

        it('短すぎるトークンを拒否すること', () => {
          const shortToken = 'ghp_short';
          const env = {
            GITHUB_TOKEN: shortToken,
            GITHUB_OWNER: 'test-owner',
            GITHUB_REPO: 'test-repo',
          };

          expect(() => GitHubEnvSchema.parse(env)).toThrow();
        });

        it('空のトークンを拒否すること', () => {
          const env = {
            GITHUB_TOKEN: '',
            GITHUB_OWNER: 'test-owner',
            GITHUB_REPO: 'test-repo',
          };

          expect(() => GitHubEnvSchema.parse(env)).toThrow();
        });
      });

      describe('GITHUB_OWNER validation', () => {
        it('有効な所有者名を受け入れること', () => {
          const validOwners = ['octocat', 'github', 'microsoft', 'google-team', 'user123'];

          for (const owner of validOwners) {
            const env = {
              GITHUB_TOKEN: 'ghp_1234567890abcdef1234567890abcdef12345678',
              GITHUB_OWNER: owner,
              GITHUB_REPO: 'test-repo',
            };

            const result = GitHubEnvSchema.safeParse(env);
            expect(result.success).toBe(true);
          }
        });

        it('無効な所有者名を拒否すること', () => {
          const invalidOwners = ['', '-invalid', 'invalid-', 'invalid..name', ' space'];

          for (const owner of invalidOwners) {
            const env = {
              GITHUB_TOKEN: 'ghp_1234567890abcdef1234567890abcdef12345678',
              GITHUB_OWNER: owner,
              GITHUB_REPO: 'test-repo',
            };

            expect(() => GitHubEnvSchema.parse(env)).toThrow();
          }
        });
      });

      describe('GITHUB_REPO validation', () => {
        it('有効なリポジトリ名を受け入れること', () => {
          const validRepos = ['repo', 'my-repo', 'repo_name', 'repo.name', 'repo-123'];

          for (const repo of validRepos) {
            const env = {
              GITHUB_TOKEN: 'ghp_1234567890abcdef1234567890abcdef12345678',
              GITHUB_OWNER: 'test-owner',
              GITHUB_REPO: repo,
            };

            expect(() => GitHubEnvSchema.parse(env)).not.toThrow();
          }
        });

        it('無効なリポジトリ名を拒否すること', () => {
          const invalidRepos = ['', 'repo space', 'repo@name', 'repo#name'];

          for (const repo of invalidRepos) {
            const env = {
              GITHUB_TOKEN: 'ghp_1234567890abcdef1234567890abcdef12345678',
              GITHUB_OWNER: 'test-owner',
              GITHUB_REPO: repo,
            };

            expect(() => GitHubEnvSchema.parse(env)).toThrow();
          }
        });
      });

      describe('GITHUB_BASE_URL validation', () => {
        it('有効なURLを受け入れること', () => {
          const validUrls = [
            'https://api.github.com',
            'https://github.enterprise.com/api/v3',
            'http://localhost:3000/api',
          ];

          for (const url of validUrls) {
            const env = {
              GITHUB_TOKEN: 'ghp_1234567890abcdef1234567890abcdef12345678',
              GITHUB_OWNER: 'test-owner',
              GITHUB_REPO: 'test-repo',
              GITHUB_BASE_URL: url,
            };

            expect(() => GitHubEnvSchema.parse(env)).not.toThrow();
          }
        });

        it('無効なURLを拒否すること', () => {
          const invalidUrls = ['not-a-url', '', 'just-text', 'http://', '://invalid'];

          for (const url of invalidUrls) {
            const env = {
              GITHUB_TOKEN: 'ghp_1234567890abcdef1234567890abcdef12345678',
              GITHUB_OWNER: 'test-owner',
              GITHUB_REPO: 'test-repo',
              GITHUB_BASE_URL: url,
            };

            const result = GitHubEnvSchema.safeParse(env);
            expect(result.success).toBe(false);
          }
        });
      });
    });

    describe('AstroEnvSchema', () => {
      it('有効なAstro環境変数を検証できること', () => {
        const validEnv = {
          SITE: 'https://example.com',
          NODE_ENV: 'production' as const,
          PUBLIC_BASE_URL: 'https://cdn.example.com',
        };

        const result = AstroEnvSchema.parse(validEnv);
        expect(result).toEqual(validEnv);
      });

      it('デフォルト値が正しく適用されること', () => {
        const result = AstroEnvSchema.parse({});
        expect(result.NODE_ENV).toBe('development');
      });

      it('有効なNODE_ENV値を受け入れること', () => {
        const validEnvs = ['development', 'production', 'test'];

        for (const nodeEnv of validEnvs) {
          const env = { NODE_ENV: nodeEnv };
          expect(() => AstroEnvSchema.parse(env)).not.toThrow();
        }
      });

      it('無効なNODE_ENV値を拒否すること', () => {
        const invalidEnvs = ['staging', 'invalid', ''];

        for (const nodeEnv of invalidEnvs) {
          const env = { NODE_ENV: nodeEnv };
          expect(() => AstroEnvSchema.parse(env)).toThrow();
        }
      });

      it('オプションフィールドを正しく処理すること', () => {
        const envWithOptional = { NODE_ENV: 'development' as const };
        const result = AstroEnvSchema.parse(envWithOptional);

        expect(result.SITE).toBeUndefined();
        expect(result.PUBLIC_BASE_URL).toBeUndefined();
      });
    });

    describe('EnvSchema (統合スキーマ)', () => {
      it('GitHubとAstroの両方の環境変数を検証できること', () => {
        const validEnv = {
          GITHUB_TOKEN: 'ghp_1234567890abcdef1234567890abcdef12345678',
          GITHUB_OWNER: 'test-owner',
          GITHUB_REPO: 'test-repo',
          SITE: 'https://example.com',
          NODE_ENV: 'production' as const,
        };

        const result = EnvSchema.parse(validEnv);
        expect(result.GITHUB_TOKEN).toBe(validEnv.GITHUB_TOKEN);
        expect(result.SITE).toBe(validEnv.SITE);
        expect(result.NODE_ENV).toBe(validEnv.NODE_ENV);
      });
    });
  });

  describe('EnvValidator (Singleton Class)', () => {
    describe('Singleton Pattern', () => {
      it('同じインスタンスを返すこと', () => {
        const instance1 = EnvValidator.getInstance();
        const instance2 = EnvValidator.getInstance();

        expect(instance1).toBe(instance2);
      });

      it('getEnvValidator関数でも同じインスタンスを取得できること', () => {
        const instance1 = EnvValidator.getInstance();
        const instance2 = getEnvValidator();

        expect(instance1).toBe(instance2);
      });
    });

    describe('validate method', () => {
      let validator: EnvValidator;

      beforeEach(() => {
        validator = EnvValidator.getInstance();
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ login: 'test-user' }),
        });
      });

      it('有効な環境変数を正常に検証できること', async () => {
        const validEnv = {
          GITHUB_TOKEN: 'ghp_1234567890abcdef1234567890abcdef12345678',
          GITHUB_OWNER: 'test-owner',
          GITHUB_REPO: 'test-repo',
        };

        const result = await validator.validate(validEnv);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.GITHUB_TOKEN).toBe(validEnv.GITHUB_TOKEN);
          expect(result.data.GITHUB_OWNER).toBe(validEnv.GITHUB_OWNER);
          expect(result.data.GITHUB_REPO).toBe(validEnv.GITHUB_REPO);
        }
      });

      it('必須変数が不足している場合にエラーを返すこと', async () => {
        const incompleteEnv = {
          GITHUB_TOKEN: 'ghp_1234567890abcdef1234567890abcdef12345678',
          // GITHUB_OWNER and GITHUB_REPO are missing
        };

        const result = await validator.validate(incompleteEnv);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(EnvValidationError);
          const error = result.error as EnvValidationError;
          expect(error.code).toBe('MISSING_REQUIRED_VARS');
          expect(error.message).toContain('GITHUB_OWNER');
          expect(error.message).toContain('GITHUB_REPO');
          expect(error.suggestions).toHaveLength(3);
        }
      });

      it('不正な環境変数形式でZodエラーを処理すること', async () => {
        const invalidEnv = {
          GITHUB_TOKEN: 'invalid_token', // Wrong prefix
          GITHUB_OWNER: 'test-owner',
          GITHUB_REPO: 'test-repo',
        };

        const result = await validator.validate(invalidEnv);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(EnvValidationError);
          const error = result.error as EnvValidationError;
          expect(error.code).toBe('VALIDATION_ERROR');
          expect(error.variable).toBe('GITHUB_TOKEN');
          expect(error.suggestions.length).toBeGreaterThan(0);
        }
      });

      it('複数の検証エラーがある場合に最初のエラーを返すこと', async () => {
        const invalidEnv = {
          GITHUB_TOKEN: 'invalid', // Multiple issues: wrong prefix and too short
          GITHUB_OWNER: '', // Empty
          GITHUB_REPO: 'test-repo',
        };

        const result = await validator.validate(invalidEnv);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(EnvValidationError);
          const error = result.error as EnvValidationError;
          expect(error.code).toBe('MISSING_REQUIRED_VARS');
          expect(error.variable).toBe('GITHUB_OWNER');
        }
      });

      it('検証済み環境変数をキャッシュすること', async () => {
        const validEnv = {
          GITHUB_TOKEN: 'ghp_1234567890abcdef1234567890abcdef12345678',
          GITHUB_OWNER: 'test-owner',
          GITHUB_REPO: 'test-repo',
        };

        await validator.validate(validEnv);
        const cachedEnv = validator.getValidatedEnv();

        expect(cachedEnv).not.toBeNull();
        expect(cachedEnv?.GITHUB_TOKEN).toBe(validEnv.GITHUB_TOKEN);
      });

      it('予期しないエラーを適切に処理すること', async () => {
        // Mock an unexpected error during parsing
        const originalParse = EnvSchema.parse;
        vi.spyOn(EnvSchema, 'parse').mockImplementation(() => {
          throw new Error('Unexpected error');
        });

        const validEnv = {
          GITHUB_TOKEN: 'ghp_1234567890abcdef1234567890abcdef12345678',
          GITHUB_OWNER: 'test-owner',
          GITHUB_REPO: 'test-repo',
        };

        const result = await validator.validate(validEnv);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(EnvValidationError);
          const error = result.error as EnvValidationError;
          expect(error.code).toBe('UNKNOWN_ERROR');
          expect(error.message).toContain('Unexpected validation error');
        }

        // Restore original method
        EnvSchema.parse = originalParse;
      });
    });

    describe('performAdditionalValidation method', () => {
      let validator: EnvValidator;
      const validEnv: ValidatedEnv = {
        GITHUB_TOKEN: 'ghp_1234567890abcdef1234567890abcdef12345678',
        GITHUB_OWNER: 'test-owner',
        GITHUB_REPO: 'test-repo',
        GITHUB_BASE_URL: 'https://api.github.com',
        GITHUB_USER_AGENT: 'beaver-astro/1.0.0',
        NODE_ENV: 'development',
      };

      beforeEach(() => {
        validator = EnvValidator.getInstance();
      });

      it('有効なGitHubトークンで成功すること', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ login: 'test-user' }),
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ full_name: 'test-owner/test-repo' }),
          });

        const result = await (validator as any).performAdditionalValidation(validEnv);

        expect(result.success).toBe(true);
        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(mockFetch).toHaveBeenNthCalledWith(1, 'https://api.github.com/user', {
          headers: {
            Authorization: 'token ghp_1234567890abcdef1234567890abcdef12345678',
            'User-Agent': 'beaver-astro/1.0.0',
          },
        });
        expect(mockFetch).toHaveBeenNthCalledWith(
          2,
          'https://api.github.com/repos/test-owner/test-repo',
          {
            headers: {
              Authorization: 'token ghp_1234567890abcdef1234567890abcdef12345678',
              'User-Agent': 'beaver-astro/1.0.0',
            },
          }
        );
      });

      it('無効なトークンで認証エラーを処理すること', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        });

        const result = await (validator as any).performAdditionalValidation(validEnv);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(EnvValidationError);
          const error = result.error as EnvValidationError;
          expect(error.code).toBe('INVALID_TOKEN');
          expect(error.variable).toBe('GITHUB_TOKEN');
          expect(error.message).toContain('invalid or expired');
          expect(error.suggestions).toContain('Generate a new personal access token on GitHub');
        }
      });

      it('権限不足エラーを処理すること', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 403,
          statusText: 'Forbidden',
        });

        const result = await (validator as any).performAdditionalValidation(validEnv);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(EnvValidationError);
          const error = result.error as EnvValidationError;
          expect(error.code).toBe('INSUFFICIENT_PERMISSIONS');
          expect(error.variable).toBe('GITHUB_TOKEN');
          expect(error.message).toContain('insufficient permissions');
          expect(error.suggestions).toContain('Ensure the token has repo permissions');
        }
      });

      it('存在しないリポジトリエラーを処理すること', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ login: 'test-user' }),
          })
          .mockResolvedValueOnce({
            ok: false,
            status: 404,
            statusText: 'Not Found',
          });

        const result = await (validator as any).performAdditionalValidation(validEnv);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(EnvValidationError);
          const error = result.error as EnvValidationError;
          expect(error.code).toBe('REPO_NOT_FOUND');
          expect(error.variable).toBe('GITHUB_REPO');
          expect(error.message).toContain('not found or inaccessible');
          expect(error.suggestions).toContain('Check that the repository name is correct');
        }
      });

      it('ネットワークエラーで警告ログを出力し成功を返すこと', async () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const result = await (validator as any).performAdditionalValidation(validEnv);

        expect(result.success).toBe(true);
        expect(consoleSpy).toHaveBeenCalledWith(
          'GitHub API connection test failed:',
          expect.any(Error)
        );

        consoleSpy.mockRestore();
      });
    });

    describe('getSuggestions method', () => {
      let validator: EnvValidator;

      beforeEach(() => {
        validator = EnvValidator.getInstance();
      });

      it('GITHUB_TOKEN用の提案を返すこと', () => {
        const suggestions = (validator as any).getSuggestions('GITHUB_TOKEN', 'error');

        expect(suggestions).toContain('Generate a personal access token on GitHub');
        expect(suggestions).toContain('Ensure the token has repo and read:user permissions');
        expect(suggestions).toContain('Check that the token is not expired');
      });

      it('GITHUB_OWNER用の提案を返すこと', () => {
        const suggestions = (validator as any).getSuggestions('GITHUB_OWNER', 'error');

        expect(suggestions).toContain('Use the GitHub username or organization name');
        expect(suggestions).toContain('Check that the owner exists on GitHub');
        expect(suggestions).toContain('Ensure the name uses only valid characters');
      });

      it('GITHUB_REPO用の提案を返すこと', () => {
        const suggestions = (validator as any).getSuggestions('GITHUB_REPO', 'error');

        expect(suggestions).toContain('Use the exact repository name from GitHub');
        expect(suggestions).toContain('Check that the repository exists');
        expect(suggestions).toContain('Ensure the name uses only valid characters');
      });

      it('GITHUB_BASE_URL用の提案を返すこと', () => {
        const suggestions = (validator as any).getSuggestions('GITHUB_BASE_URL', 'error');

        expect(suggestions).toContain('Use https://api.github.com for GitHub.com');
        expect(suggestions).toContain('Use https://your-domain.com/api/v3 for GitHub Enterprise');
        expect(suggestions).toContain('Ensure the URL is valid and accessible');
      });

      it('SITE用の提案を返すこと', () => {
        const suggestions = (validator as any).getSuggestions('SITE', 'error');

        expect(suggestions).toContain('Use the full URL including protocol (https://)');
        expect(suggestions).toContain('Ensure the URL is valid and accessible');
        expect(suggestions).toContain('Check that the URL matches your deployment domain');
      });

      it('未知の変数に対してデフォルトの提案を返すこと', () => {
        const suggestions = (validator as any).getSuggestions('UNKNOWN_VAR', 'error');

        expect(suggestions).toContain('Check the documentation for this variable');
        expect(suggestions).toContain('Verify the value format and requirements');
        expect(suggestions).toContain('Ensure the variable is properly set');
      });
    });

    describe('getValidatedEnv method', () => {
      let validator: EnvValidator;

      beforeEach(() => {
        validator = EnvValidator.getInstance();
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ login: 'test-user' }),
        });
      });

      it('検証前はnullを返すこと', () => {
        const result = validator.getValidatedEnv();
        expect(result).toBeNull();
      });

      it('検証後は検証済み環境変数を返すこと', async () => {
        const validEnv = {
          GITHUB_TOKEN: 'ghp_1234567890abcdef1234567890abcdef12345678',
          GITHUB_OWNER: 'test-owner',
          GITHUB_REPO: 'test-repo',
        };

        await validator.validate(validEnv);
        const cachedEnv = validator.getValidatedEnv();

        expect(cachedEnv).not.toBeNull();
        expect(cachedEnv?.GITHUB_TOKEN).toBe(validEnv.GITHUB_TOKEN);
        expect(cachedEnv?.GITHUB_OWNER).toBe(validEnv.GITHUB_OWNER);
        expect(cachedEnv?.GITHUB_REPO).toBe(validEnv.GITHUB_REPO);
      });

      it('検証失敗後はnullのままであること', async () => {
        const invalidEnv = {
          GITHUB_TOKEN: 'invalid',
          GITHUB_OWNER: 'test-owner',
          GITHUB_REPO: 'test-repo',
        };

        await validator.validate(invalidEnv);
        const cachedEnv = validator.getValidatedEnv();

        expect(cachedEnv).toBeNull();
      });
    });
  });

  describe('Utility Functions', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ login: 'test-user' }),
      });
    });

    describe('validateEnv function', () => {
      it('EnvValidatorを使用して環境変数を検証すること', async () => {
        const validEnv = {
          GITHUB_TOKEN: 'ghp_1234567890abcdef1234567890abcdef12345678',
          GITHUB_OWNER: 'test-owner',
          GITHUB_REPO: 'test-repo',
        };

        const result = await validateEnv(validEnv);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.GITHUB_TOKEN).toBe(validEnv.GITHUB_TOKEN);
        }
      });

      it('環境変数が提供されない場合はprocess.envを使用すること', async () => {
        // This will use process.env which likely doesn't have valid values
        const result = await validateEnv();

        // Since process.env in test environment likely doesn't have valid GitHub config,
        // this should fail
        expect(result.success).toBe(false);
      });
    });

    describe('checkEnvHealth function', () => {
      it('EnvValidatorのhealthCheckメソッドを使用すること', async () => {
        // Mock successful validation and API calls
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ login: 'test-user' }),
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ full_name: 'test-owner/test-repo' }),
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ login: 'test-user' }),
          });

        // Mock process.env for health check
        const originalEnv = process.env;
        process.env = {
          ...originalEnv,
          GITHUB_TOKEN: 'ghp_1234567890abcdef1234567890abcdef12345678',
          GITHUB_OWNER: 'test-owner',
          GITHUB_REPO: 'test-repo',
        };

        const result = await checkEnvHealth();

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBeDefined();
          expect(result.data.checks).toBeInstanceOf(Array);
        }

        // Restore original environment
        process.env = originalEnv;
      });
    });
  });

  describe('healthCheck method', () => {
    let validator: EnvValidator;

    beforeEach(() => {
      validator = EnvValidator.getInstance();
    });

    it('すべてのチェックが成功した場合にhealthyステータスを返すこと', async () => {
      // Mock successful validation and API calls
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ login: 'test-user' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ full_name: 'test-owner/test-repo' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ login: 'test-user' }),
        });

      // Mock valid environment
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        GITHUB_TOKEN: 'ghp_1234567890abcdef1234567890abcdef12345678',
        GITHUB_OWNER: 'test-owner',
        GITHUB_REPO: 'test-repo',
      };

      const result = await validator.healthCheck();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('healthy');
        expect(result.data.checks).toHaveLength(2);

        const envCheck = result.data.checks.find(c => c.name === 'Environment Variables');
        expect(envCheck?.status).toBe('pass');
        expect(envCheck?.message).toBe('All required environment variables are valid');

        const apiCheck = result.data.checks.find(c => c.name === 'GitHub API Connection');
        expect(apiCheck?.status).toBe('pass');
        expect(apiCheck?.message).toBe('GitHub API is accessible');
      }

      // Restore original environment
      process.env = originalEnv;
    });

    it('環境変数検証が失敗した場合にunhealthyステータスを返すこと', async () => {
      // Mock invalid environment (missing required variables)
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        GITHUB_TOKEN: undefined,
        GITHUB_OWNER: undefined,
        GITHUB_REPO: undefined,
      };

      const result = await validator.healthCheck();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('unhealthy');
        expect(result.data.checks).toHaveLength(1);

        const envCheck = result.data.checks.find(c => c.name === 'Environment Variables');
        expect(envCheck?.status).toBe('fail');
        expect(envCheck?.message).toContain('Missing required environment variables');
      }

      // Restore original environment
      process.env = originalEnv;
    });

    it('GitHub API接続が失敗した場合にunhealthyステータスを返すこと', async () => {
      // Mock failed API call
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ login: 'test-user' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ full_name: 'test-owner/test-repo' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        });

      // Mock valid environment
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        GITHUB_TOKEN: 'ghp_1234567890abcdef1234567890abcdef12345678',
        GITHUB_OWNER: 'test-owner',
        GITHUB_REPO: 'test-repo',
      };

      const result = await validator.healthCheck();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('unhealthy');

        const apiCheck = result.data.checks.find(c => c.name === 'GitHub API Connection');
        expect(apiCheck?.status).toBe('fail');
        expect(apiCheck?.message).toContain('GitHub API returned 401');
      }

      // Restore original environment
      process.env = originalEnv;
    });

    it('GitHub API接続でネットワークエラーが発生した場合にdegradedステータスを返すこと', async () => {
      // Mock successful validation but network error for API
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ login: 'test-user' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ full_name: 'test-owner/test-repo' }),
        })
        .mockRejectedValueOnce(new Error('Network timeout'));

      // Mock valid environment
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        GITHUB_TOKEN: 'ghp_1234567890abcdef1234567890abcdef12345678',
        GITHUB_OWNER: 'test-owner',
        GITHUB_REPO: 'test-repo',
      };

      const result = await validator.healthCheck();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('degraded');

        const apiCheck = result.data.checks.find(c => c.name === 'GitHub API Connection');
        expect(apiCheck?.status).toBe('warn');
        expect(apiCheck?.message).toContain('GitHub API connection test failed');
        expect(apiCheck?.message).toContain('Network timeout');
      }

      // Restore original environment
      process.env = originalEnv;
    });

    it('複数のチェックでステータスを正しく集計すること', async () => {
      // Mock environment validation failure (no API check will be performed)
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        GITHUB_TOKEN: 'invalid_token', // Invalid format
        GITHUB_OWNER: 'test-owner',
        GITHUB_REPO: 'test-repo',
      };

      const result = await validator.healthCheck();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('unhealthy');
        expect(result.data.checks).toHaveLength(1); // Only env check due to validation failure

        const envCheck = result.data.checks.find(c => c.name === 'Environment Variables');
        expect(envCheck?.status).toBe('fail');
      }

      // Restore original environment
      process.env = originalEnv;
    });
  });

  describe('getSetupGuide method', () => {
    let validator: EnvValidator;

    beforeEach(() => {
      validator = EnvValidator.getInstance();
    });

    it('完全なセットアップガイドを返すこと', () => {
      const guide = validator.getSetupGuide();

      expect(guide.title).toBe('Environment Variables Setup Guide');
      expect(guide.description).toContain(
        'Follow these steps to configure your environment variables'
      );
      expect(guide.steps).toBeInstanceOf(Array);
      expect(guide.steps.length).toBe(5);
    });

    it('各ステップが必要な情報を含むこと', () => {
      const guide = validator.getSetupGuide();

      for (const step of guide.steps) {
        expect(step.title).toBeDefined();
        expect(typeof step.title).toBe('string');
        expect(step.title.length).toBeGreaterThan(0);

        expect(step.description).toBeDefined();
        expect(typeof step.description).toBe('string');
        expect(step.description.length).toBeGreaterThan(0);

        // Example is optional but if present should be a string
        if (step.example) {
          expect(typeof step.example).toBe('string');
        }
      }
    });

    it('.envファイル作成ステップを含むこと', () => {
      const guide = validator.getSetupGuide();

      const envFileStep = guide.steps.find(step => step.title.toLowerCase().includes('.env'));

      expect(envFileStep).toBeDefined();
      expect(envFileStep?.description).toContain('.env file');
      expect(envFileStep?.example).toBe('touch .env');
    });

    it('GitHubトークン生成ステップを含むこと', () => {
      const guide = validator.getSetupGuide();

      const tokenStep = guide.steps.find(
        step =>
          step.title.toLowerCase().includes('github') && step.title.toLowerCase().includes('token')
      );

      expect(tokenStep).toBeDefined();
      expect(tokenStep?.description).toContain('GitHub Settings');
      expect(tokenStep?.description).toContain('Personal access tokens');
      expect(tokenStep?.description).toContain('repo and read:user permissions');
    });

    it('GitHub設定ステップを含むこと', () => {
      const guide = validator.getSetupGuide();

      const configStep = guide.steps.find(
        step =>
          step.title.toLowerCase().includes('github') &&
          step.title.toLowerCase().includes('configuration')
      );

      expect(configStep).toBeDefined();
      expect(configStep?.description).toContain('.env file');
      expect(configStep?.example).toContain('GITHUB_TOKEN=');
      expect(configStep?.example).toContain('GITHUB_OWNER=');
      expect(configStep?.example).toContain('GITHUB_REPO=');
    });

    it('サイト設定（オプション）ステップを含むこと', () => {
      const guide = validator.getSetupGuide();

      const siteStep = guide.steps.find(
        step =>
          step.title.toLowerCase().includes('site') && step.title.toLowerCase().includes('optional')
      );

      expect(siteStep).toBeDefined();
      expect(siteStep?.description).toContain('deployment');
      expect(siteStep?.example).toContain('SITE=');
      expect(siteStep?.example).toContain('PUBLIC_BASE_URL=');
    });

    it('設定検証ステップを含むこと', () => {
      const guide = validator.getSetupGuide();

      const verifyStep = guide.steps.find(step => step.title.toLowerCase().includes('verify'));

      expect(verifyStep).toBeDefined();
      expect(verifyStep?.description).toContain('Test your configuration');
      expect(verifyStep?.description).toContain('health check');
      expect(verifyStep?.example).toBe('npm run dev');
    });

    it('一貫したガイド構造を持つこと', () => {
      const guide = validator.getSetupGuide();

      // ガイドの論理的な順序をテスト
      const stepTitles = guide.steps.map(step => step.title.toLowerCase());

      // .envファイル作成が最初に来ること
      expect(stepTitles[0]).toContain('.env');

      // トークン生成が設定より前に来ること
      const tokenIndex = stepTitles.findIndex(title => title.includes('token'));
      const configIndex = stepTitles.findIndex(title => title.includes('configuration'));
      expect(tokenIndex).toBeLessThan(configIndex);

      // 検証が最後に来ること
      expect(stepTitles[stepTitles.length - 1]).toContain('verify');
    });
  });
});

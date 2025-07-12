import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { fetchAndSaveGitHubData } from '../fetch-github-data.js';
import { createGitHubClient } from '../../src/lib/github/client.js';
import { GitHubIssuesService } from '../../src/lib/github/issues.js';
import { createTestClassificationEngine } from '../../src/lib/classification/engine.js';
import { z } from 'zod';

// Node.js モジュールのモック
vi.mock('fs');
vi.mock('path');

// アプリケーションモジュールのモック
vi.mock('../../src/lib/github/client.js');
vi.mock('../../src/lib/github/issues.js');
vi.mock('../../src/lib/classification/engine.js');

// 型安全なモック
const mockWriteFileSync = vi.mocked(writeFileSync);
const mockMkdirSync = vi.mocked(mkdirSync);
const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockJoin = vi.mocked(join);
const mockCreateGitHubClient = vi.mocked(createGitHubClient);
const mockGitHubIssuesService = vi.mocked(GitHubIssuesService);
const mockCreateTestClassificationEngine = vi.mocked(createTestClassificationEngine);

describe('fetch-github-data スクリプト', () => {
  const originalEnv = process.env;
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  const originalProcessExit = process.exit;

  let consoleLogSpy: ReturnType<typeof vi.fn>;
  let consoleWarnSpy: ReturnType<typeof vi.fn>;
  let consoleErrorSpy: ReturnType<typeof vi.fn>;
  let processExitSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // 環境変数をリセット
    process.env = { ...originalEnv };
    
    // コンソールメソッドをモック
    consoleLogSpy = vi.fn();
    consoleWarnSpy = vi.fn();
    consoleErrorSpy = vi.fn();
    processExitSpy = vi.fn();
    
    console.log = consoleLogSpy;
    console.warn = consoleWarnSpy;
    console.error = consoleErrorSpy;
    process.exit = processExitSpy as any;

    // デフォルトのモック設定
    mockJoin.mockImplementation((...args) => args.join('/'));
    mockExistsSync.mockReturnValue(true);
  });

  afterEach(() => {
    // 環境変数を復元
    process.env = originalEnv;
    
    // コンソールメソッドを復元
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
    process.exit = originalProcessExit;
    
    // モックをクリア
    vi.clearAllMocks();
  });

  describe('環境変数の検証', () => {
    it('必要な環境変数が設定されていない場合は警告を表示してスキップする', async () => {
      // 環境変数を未設定にする
      delete process.env.GITHUB_TOKEN;
      delete process.env.GITHUB_OWNER;
      delete process.env.GITHUB_REPO;

      await fetchAndSaveGitHubData();

      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ 環境変数が設定されていません:');
      expect(consoleLogSpy).toHaveBeenCalledWith('📋 サンプルデータを使用してビルドを継続します。');
      expect(mockCreateGitHubClient).not.toHaveBeenCalled();
    });

    it('部分的に環境変数が設定されていない場合は詳細エラーを表示する', async () => {
      // 一部の環境変数のみ設定
      process.env.GITHUB_TOKEN = 'test-token';
      delete process.env.GITHUB_OWNER;
      delete process.env.GITHUB_REPO;

      await fetchAndSaveGitHubData();

      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ 環境変数が設定されていません:');
      expect(consoleWarnSpy).toHaveBeenCalledWith('  - GITHUB_OWNER: Invalid input: expected string, received undefined');
      expect(consoleWarnSpy).toHaveBeenCalledWith('  - GITHUB_REPO: Invalid input: expected string, received undefined');
    });

    it('すべての環境変数が正しく設定されている場合は処理を続行する', async () => {
      // 環境変数を正しく設定
      process.env.GITHUB_TOKEN = 'test-token';
      process.env.GITHUB_OWNER = 'test-owner';
      process.env.GITHUB_REPO = 'test-repo';

      // GitHub クライアントのモック設定
      const mockClient = { id: 'mock-client' };
      mockCreateGitHubClient.mockReturnValue({
        success: true,
        data: mockClient,
      });

      // Issues サービスのモック設定
      const mockIssuesService = {
        getIssues: vi.fn().mockResolvedValue({
          success: true,
          data: [],
        }),
      };
      mockGitHubIssuesService.mockReturnValue(mockIssuesService as any);

      await fetchAndSaveGitHubData();

      expect(mockCreateGitHubClient).toHaveBeenCalledWith({
        token: 'test-token',
        owner: 'test-owner',
        repo: 'test-repo',
        baseUrl: 'https://api.github.com',
        userAgent: 'beaver-astro/1.0.0',
        timeout: 30000,
        rateLimitBuffer: 100,
      });
    });
  });

  describe('ディレクトリ作成', () => {
    beforeEach(() => {
      // 正常な環境変数を設定
      process.env.GITHUB_TOKEN = 'test-token';
      process.env.GITHUB_OWNER = 'test-owner';
      process.env.GITHUB_REPO = 'test-repo';
    });

    it('データディレクトリが存在しない場合は作成する', async () => {
      mockExistsSync.mockReturnValue(false);
      
      const mockClient = { id: 'mock-client' };
      mockCreateGitHubClient.mockReturnValue({
        success: true,
        data: mockClient,
      });

      const mockIssuesService = {
        getIssues: vi.fn().mockResolvedValue({
          success: true,
          data: [],
        }),
      };
      mockGitHubIssuesService.mockReturnValue(mockIssuesService as any);

      await fetchAndSaveGitHubData();

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('src/data/github'),
        { recursive: true }
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('📁 ディレクトリを作成しました:')
      );
    });

    it('データディレクトリが既存の場合は作成しない', async () => {
      mockExistsSync.mockReturnValue(true);
      
      const mockClient = { id: 'mock-client' };
      mockCreateGitHubClient.mockReturnValue({
        success: true,
        data: mockClient,
      });

      const mockIssuesService = {
        getIssues: vi.fn().mockResolvedValue({
          success: true,
          data: [],
        }),
      };
      mockGitHubIssuesService.mockReturnValue(mockIssuesService as any);

      await fetchAndSaveGitHubData();

      expect(mockMkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('GitHub API 呼び出し', () => {
    beforeEach(() => {
      // 正常な環境変数を設定
      process.env.GITHUB_TOKEN = 'test-token';
      process.env.GITHUB_OWNER = 'test-owner';
      process.env.GITHUB_REPO = 'test-repo';
    });

    it('GitHub クライアントの作成に失敗した場合はエラーを表示して終了する', async () => {
      mockCreateGitHubClient.mockReturnValue({
        success: false,
        error: new Error('認証エラー'),
      });

      await fetchAndSaveGitHubData();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ データ取得中にエラーが発生しました:',
        expect.any(Error)
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('Issues の取得に失敗した場合はエラーを表示して終了する', async () => {
      const mockClient = { id: 'mock-client' };
      mockCreateGitHubClient.mockReturnValue({
        success: true,
        data: mockClient,
      });

      const mockIssuesService = {
        getIssues: vi.fn().mockResolvedValue({
          success: false,
          error: new Error('API レート制限'),
        }),
      };
      mockGitHubIssuesService.mockReturnValue(mockIssuesService as any);

      await fetchAndSaveGitHubData();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ データ取得中にエラーが発生しました:',
        expect.any(Error)
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('Issues の取得に成功した場合は適切なパラメータで呼び出される', async () => {
      const mockClient = { id: 'mock-client' };
      mockCreateGitHubClient.mockReturnValue({
        success: true,
        data: mockClient,
      });

      const mockIssuesService = {
        getIssues: vi.fn().mockResolvedValue({
          success: true,
          data: [],
        }),
      };
      mockGitHubIssuesService.mockReturnValue(mockIssuesService as any);

      await fetchAndSaveGitHubData();

      expect(mockIssuesService.getIssues).toHaveBeenCalledWith({
        state: 'open',
        per_page: 100,
        sort: 'updated',
        direction: 'desc'
      });
    });
  });

  describe('データ保存', () => {
    const sampleIssues = [
      {
        id: 1,
        number: 1,
        title: 'Test Issue 1',
        body: 'Test body 1',
        state: 'open',
        labels: [{ name: 'bug' }, { name: 'high-priority' }],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
      {
        id: 2,
        number: 2,
        title: 'Test Issue 2',
        body: 'Test body 2',
        state: 'closed',
        labels: [{ name: 'feature' }],
        created_at: '2023-01-02T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
      },
    ];

    beforeEach(() => {
      // 正常な環境変数を設定
      process.env.GITHUB_TOKEN = 'test-token';
      process.env.GITHUB_OWNER = 'test-owner';
      process.env.GITHUB_REPO = 'test-repo';

      // GitHub API のモック設定
      const mockClient = { id: 'mock-client' };
      mockCreateGitHubClient.mockReturnValue({
        success: true,
        data: mockClient,
      });

      const mockIssuesService = {
        getIssues: vi.fn().mockResolvedValue({
          success: true,
          data: sampleIssues,
        }),
      };
      mockGitHubIssuesService.mockReturnValue(mockIssuesService as any);

      // Classification engine mock
      const mockClassificationEngine = {
        classifyIssuesBatch: vi.fn().mockResolvedValue({
          totalAnalyzed: sampleIssues.length,
          averageScore: 67,
          processingTimeMs: 12,
          cacheHitRate: 0,
          tasks: sampleIssues.map((issue, index) => ({
            issueNumber: issue.number,
            issueId: issue.id,
            title: issue.title,
            body: issue.body,
            score: 67,
            scoreBreakdown: {
              category: 40,
              priority: 27,
              recency: 0,
              custom: 0
            },
            priority: 'medium',
            category: index === 0 ? 'bug' : 'feature',
            confidence: 1,
            reasons: ['Test classification'],
            labels: issue.labels.map(l => l.name),
            state: issue.state,
            createdAt: issue.created_at,
            updatedAt: issue.updated_at,
            url: `https://github.com/test-owner/test-repo/issues/${issue.number}`,
            metadata: {
              processingTimeMs: 10,
              cacheHit: false,
              rulesApplied: 6,
              rulesMatched: 1,
              algorithmVersion: '2.0.0'
            }
          }))
        }),
      };
      mockCreateTestClassificationEngine.mockResolvedValue(mockClassificationEngine as any);

      // Mock readFileSync to return classified issues data
      const classifiedIssues = sampleIssues.map((issue, index) => ({
        ...issue,
        classification: {
          issueNumber: issue.number,
          issueId: issue.id,
          title: issue.title,
          body: issue.body,
          score: 67,
          scoreBreakdown: {
            category: 40,
            priority: 27,
            recency: 0,
            custom: 0
          },
          priority: 'medium',
          category: index === 0 ? 'bug' : 'feature',
          confidence: 1,
          reasons: ['Test classification'],
          labels: issue.labels.map(l => l.name),
          state: issue.state,
          createdAt: issue.created_at,
          updatedAt: issue.updated_at,
          url: `https://github.com/test-owner/test-repo/issues/${issue.number}`,
          metadata: {
            processingTimeMs: 10,
            cacheHit: false,
            rulesApplied: 6,
            rulesMatched: 1,
            algorithmVersion: '2.0.0'
          }
        }
      }));
      
      mockReadFileSync.mockReturnValue(JSON.stringify(classifiedIssues));
    });

    it('Issues データを正しく保存する', async () => {
      await fetchAndSaveGitHubData();

      // Check that issues.json is saved with classification data
      const issuesCall = mockWriteFileSync.mock.calls.find(call => 
        call[0].toString().includes('issues.json')
      );
      expect(issuesCall).toBeDefined();

      if (issuesCall) {
        const issuesContent = JSON.parse(issuesCall[1] as string);
        expect(Array.isArray(issuesContent)).toBe(true);
        expect(issuesContent).toHaveLength(2);
        
        // Verify that issues have classification data
        issuesContent.forEach((issue: any) => {
          expect(issue).toHaveProperty('classification');
          expect(issue.classification).toHaveProperty('category');
          expect(issue.classification).toHaveProperty('confidence');
        });
      }
    });

    it('個別 Issue ファイルを正しく保存する', async () => {
      await fetchAndSaveGitHubData();

      // Check individual issue files are saved with classification data
      const issue1Call = mockWriteFileSync.mock.calls.find(call => 
        call[0].toString().includes('1.json')
      );
      const issue2Call = mockWriteFileSync.mock.calls.find(call => 
        call[0].toString().includes('2.json')
      );
      
      expect(issue1Call).toBeDefined();
      expect(issue2Call).toBeDefined();

      if (issue1Call) {
        const issue1Content = JSON.parse(issue1Call[1] as string);
        expect(issue1Content).toHaveProperty('classification');
        expect(issue1Content.classification).toHaveProperty('category');
        expect(issue1Content.classification).toHaveProperty('confidence');
      }

      if (issue2Call) {
        const issue2Content = JSON.parse(issue2Call[1] as string);
        expect(issue2Content).toHaveProperty('classification');
        expect(issue2Content.classification).toHaveProperty('category');
        expect(issue2Content.classification).toHaveProperty('confidence');
      }
    });

    it('メタデータを正しく計算して保存する', async () => {
      await fetchAndSaveGitHubData();

      // メタデータの保存を確認
      const metadataCall = mockWriteFileSync.mock.calls.find(call => 
        call[0].toString().includes('metadata.json')
      );
      expect(metadataCall).toBeDefined();

      if (metadataCall) {
        const metadataContent = JSON.parse(metadataCall[1] as string);
        expect(metadataContent).toMatchObject({
          repository: {
            owner: 'test-owner',
            name: 'test-repo',
          },
          statistics: {
            total: 2,
            open: 2,
            closed: 0,
            labels: 3, // bug, high-priority, feature
          },
          labelCounts: {
            bug: 1,
            'high-priority': 1,
            feature: 1,
          },
        });
      }
    });

    it('成功メッセージを正しく表示する', async () => {
      await fetchAndSaveGitHubData();

      expect(consoleLogSpy).toHaveBeenCalledWith('🚀 GitHub データの取得を開始します...');
      expect(consoleLogSpy).toHaveBeenCalledWith('📥 GitHub Issues を取得中...');
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ 2 件のオープン Issue を取得しました');
      expect(consoleLogSpy).toHaveBeenCalledWith('\n🎉 GitHub データの取得と保存が完了しました!');
    });

    it('統計情報を正しく表示する', async () => {
      await fetchAndSaveGitHubData();

      expect(consoleLogSpy).toHaveBeenCalledWith('📊 統計情報:');
      expect(consoleLogSpy).toHaveBeenCalledWith('   - 総 Issue 数: 2');
      expect(consoleLogSpy).toHaveBeenCalledWith('   - オープン: 2');
      expect(consoleLogSpy).toHaveBeenCalledWith('   - クローズ: 0');
      expect(consoleLogSpy).toHaveBeenCalledWith('   - ラベル数: 3');
    });
  });

  describe('エラーハンドリング', () => {
    beforeEach(() => {
      // 正常な環境変数を設定
      process.env.GITHUB_TOKEN = 'test-token';
      process.env.GITHUB_OWNER = 'test-owner';
      process.env.GITHUB_REPO = 'test-repo';
    });

    it('ファイル保存エラーの場合は詳細を表示して終了する', async () => {
      const mockClient = { id: 'mock-client' };
      mockCreateGitHubClient.mockReturnValue({
        success: true,
        data: mockClient,
      });

      const mockIssuesService = {
        getIssues: vi.fn().mockResolvedValue({
          success: true,
          data: [],
        }),
      };
      mockGitHubIssuesService.mockReturnValue(mockIssuesService as any);

      // ファイル保存でエラーを発生させる
      mockWriteFileSync.mockImplementation(() => {
        throw new Error('ディスク容量不足');
      });

      await fetchAndSaveGitHubData();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ データ取得中にエラーが発生しました:',
        expect.any(Error)
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('予期しないエラーの場合はスタックトレースを表示する', async () => {
      const mockClient = { id: 'mock-client' };
      mockCreateGitHubClient.mockReturnValue({
        success: true,
        data: mockClient,
      });

      const mockIssuesService = {
        getIssues: vi.fn().mockResolvedValue({
          success: true,
          data: [],
        }),
      };
      mockGitHubIssuesService.mockReturnValue(mockIssuesService as any);

      // 予期しないエラーを発生させる
      const testError = new Error('予期しないエラー');
      testError.stack = 'test stack trace';
      mockWriteFileSync.mockImplementation(() => {
        throw testError;
      });

      await fetchAndSaveGitHubData();

      expect(consoleErrorSpy).toHaveBeenCalledWith('エラー詳細:', '予期しないエラー');
      expect(consoleErrorSpy).toHaveBeenCalledWith('スタックトレース:', 'test stack trace');
    });
  });
});
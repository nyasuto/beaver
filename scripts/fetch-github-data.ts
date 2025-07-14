#!/usr/bin/env tsx

import { config } from 'dotenv';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { createGitHubClient } from '../src/lib/github/client.js';
import { GitHubIssuesService } from '../src/lib/github/issues.js';
import { GitHubPullsService } from '../src/lib/github/pulls.js';
import { GitHubConfigSchema } from '../src/lib/schemas/config.js';
import { createTestClassificationEngine } from '../src/lib/classification/engine.js';
import { z } from 'zod';

// Load environment variables from .env file (GitHub Actions環境では不要)
if (process.env['CI'] !== 'true') {
  config();
}

/**
 * GitHub API からデータを取得し、静的ファイルとして保存するスクリプト
 * 
 * 使用法:
 * - npm run fetch-data
 * - tsx scripts/fetch-github-data.ts
 * 
 * 必要な環境変数:
 * - GITHUB_TOKEN: GitHub Personal Access Token
 * - GITHUB_OWNER: リポジトリのオーナー名
 * - GITHUB_REPO: リポジトリ名
 */

const EnvSchema = z.object({
  GITHUB_TOKEN: z.string().min(1, 'GITHUB_TOKEN is required'),
  GITHUB_OWNER: z.string().min(1, 'GITHUB_OWNER is required'),
  GITHUB_REPO: z.string().min(1, 'GITHUB_REPO is required'),
});

/**
 * 環境変数の検証
 */
function validateEnvironment() {
  const env = {
    GITHUB_TOKEN: process.env['GITHUB_TOKEN'],
    GITHUB_OWNER: process.env['GITHUB_OWNER'],
    GITHUB_REPO: process.env['GITHUB_REPO'],
  };

  try {
    return EnvSchema.parse(env);
  } catch (error) {
    console.warn('⚠️ 環境変数が設定されていません:');
    if (error instanceof z.ZodError) {
      error.issues.forEach((err) => {
        console.warn(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    console.warn('\nGitHub データの取得をスキップします。');
    console.warn('実際のデータを取得するには以下の環境変数を設定してください:');
    console.warn('  - GITHUB_TOKEN: GitHub Personal Access Token');
    console.warn('  - GITHUB_OWNER: リポジトリのオーナー名');
    console.warn('  - GITHUB_REPO: リポジトリ名');
    return null;
  }
}

/**
 * ディレクトリが存在しない場合は作成
 */
function ensureDirectoryExists(dirPath: string) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
    console.log(`📁 ディレクトリを作成しました: ${dirPath}`);
  }
}

/**
 * データを JSON ファイルとして保存
 */
function saveJsonFile(filePath: string, data: any, description: string) {
  try {
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`💾 ${description}を保存しました: ${filePath}`);
  } catch (error) {
    console.error(`❌ ${description}の保存に失敗しました:`, error);
    throw error;
  }
}

/**
 * GitHub API からデータを取得して静的ファイルとして保存
 */
async function fetchAndSaveGitHubData() {
  console.log('🚀 GitHub データの取得を開始します...');
  
  // 環境変数の検証
  const env = validateEnvironment();
  
  // 環境変数が設定されていない場合はスキップ
  if (!env) {
    console.log('📋 サンプルデータを使用してビルドを継続します。');
    return;
  }
  
  // GitHub 設定の作成
  const config = GitHubConfigSchema.parse({
    token: env.GITHUB_TOKEN,
    owner: env.GITHUB_OWNER,
    repo: env.GITHUB_REPO,
    baseUrl: 'https://api.github.com',
  });

  try {
    // データディレクトリの作成
    const dataDir = join(process.cwd(), 'src/data/github');
    ensureDirectoryExists(dataDir);

    // GitHub Issues の取得
    console.log('📥 GitHub Issues を取得中...');
    
    // GitHub クライアントの作成
    const clientResult = createGitHubClient(config);
    if (!clientResult.success) {
      throw new Error(`GitHub クライアントの作成に失敗: ${clientResult.error.message}`);
    }
    
    // Issues サービスの作成と実行（オープンIssueのみ）
    const issuesService = new GitHubIssuesService(clientResult.data);
    
    // GraphQL API を優先して使用（Rate Limit対策）
    console.log('🚀 GraphQL API を使用してIssue取得を最適化...');
    const optimizedIssuesResult = await issuesService.fetchIssuesOptimized(
      config.owner,
      config.repo,
      {
        state: 'open',
        per_page: 100,
        sort: 'updated',
        direction: 'desc'
      }
    );
    
    let issues;
    if (!optimizedIssuesResult.success) {
      console.warn('⚠️ 最適化されたAPI取得に失敗、標準REST APIにフォールバック...');
      
      // フォールバック: 従来のREST API
      const openIssuesResult = await issuesService.getIssues({
        state: 'open', 
        per_page: 100,
        sort: 'updated',
        direction: 'desc'
      });
      
      if (!openIssuesResult.success) {
        throw new Error(`GitHub API エラー (open issues): ${openIssuesResult.error.message}`);
      }
      
      console.log(`✅ REST API fallback: ${openIssuesResult.data.length} 件のオープン Issue を取得しました`);
      issues = openIssuesResult.data;
    } else {
      console.log(`✅ GraphQL API: ${optimizedIssuesResult.data.length} 件のオープン Issue を取得しました`);
      issues = optimizedIssuesResult.data;
    }

    // Issue分類処理を実行
    console.log('🤖 Issue分類エンジンを開始...');
    try {
      const classificationEngine = await createTestClassificationEngine();
      
      console.log(`📋 ${issues.length} 件のIssueを分類中...`);
      const batchResult = await classificationEngine.classifyIssuesBatch(issues, {
        owner: config.owner,
        repo: config.repo
      });

      console.log(`✅ Issue分類完了:`);
      console.log(`   - 分析済み: ${batchResult.totalAnalyzed} 件`);
      console.log(`   - 平均スコア: ${batchResult.averageScore.toFixed(2)}`);
      console.log(`   - 処理時間: ${batchResult.processingTimeMs}ms`);
      console.log(`   - キャッシュヒット率: ${(batchResult.cacheHitRate * 100).toFixed(1)}%`);

      // 分類結果を含むデータを保存
      const classifiedIssues = issues.map((issue, index) => ({
        ...issue,
        classification: batchResult.tasks[index]
      }));

      saveJsonFile(
        join(dataDir, 'issues.json'),
        classifiedIssues,
        'Issues データ (分類済み)'
      );

    } catch (classificationError) {
      console.warn('⚠️ Issue分類でエラーが発生しましたが、処理を続行します:', classificationError);
      
      // 分類に失敗した場合は元のデータを保存
      saveJsonFile(
        join(dataDir, 'issues.json'),
        issues,
        'Issues データ'
      );
    }

    // Pull Requests の取得
    console.log('📥 GitHub Pull Requests を取得中...');
    
    const pullsService = new GitHubPullsService(clientResult.data);
    
    // すべての状態のPull Requestを取得（open, closed, merged）
    const pullsResults = await Promise.all([
      pullsService.fetchEnhancedPullRequests(config.owner, config.repo, {
        state: 'open',
        per_page: 100,
        sort: 'updated',
        direction: 'desc'
      }),
      pullsService.fetchEnhancedPullRequests(config.owner, config.repo, {
        state: 'closed',
        per_page: 100,
        sort: 'updated', 
        direction: 'desc'
      })
    ]);

    const allPulls = [];
    for (const [index, result] of pullsResults.entries()) {
      if (!result.success) {
        console.warn(`⚠️ Pull Requests取得でエラーが発生しました (${index === 0 ? 'open' : 'closed'}):`, result.error.message);
        continue;
      }
      allPulls.push(...result.data);
    }

    console.log(`✅ ${allPulls.length} 件のPull Request を取得しました`);

    // Pull Requests データを保存
    saveJsonFile(
      join(dataDir, 'pulls.json'),
      allPulls,
      'Pull Requests データ'
    );

    // 個別 Pull Request ファイルの保存
    const pullsDir = join(dataDir, 'pulls');
    ensureDirectoryExists(pullsDir);

    for (const pr of allPulls) {
      saveJsonFile(
        join(pullsDir, `${pr.number}.json`),
        pr,
        `Pull Request #${pr.number}`
      );
    }

    // 個別 Issue ファイルの保存（分類結果を含む）
    const issuesDir = join(dataDir, 'issues');
    ensureDirectoryExists(issuesDir);

    // issues.jsonから分類済みデータを読み込み
    let classifiedIssuesData: any[];
    try {
      classifiedIssuesData = JSON.parse(readFileSync(join(dataDir, 'issues.json'), 'utf-8'));
    } catch {
      classifiedIssuesData = issues; // フォールバック
    }

    for (const issue of classifiedIssuesData) {
      saveJsonFile(
        join(issuesDir, `${issue.number}.json`),
        issue,
        `Issue #${issue.number}`
      );
    }

    // 統計情報の計算
    const openIssues = issues; // すべてオープンIssue
    const closedIssues: typeof issues = []; // 閉じたIssueは取得していない
    const labelCounts = issues.reduce((acc, issue) => {
      issue.labels.forEach(label => {
        acc[label.name] = (acc[label.name] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    // Pull Requests統計の計算
    const openPulls = allPulls.filter(pr => pr.state === 'open');
    const closedPulls = allPulls.filter(pr => pr.state === 'closed' && !pr.merged_at);
    const mergedPulls = allPulls.filter(pr => pr.merged_at);

    // メタデータの保存
    const metadata = {
      lastUpdated: new Date().toISOString(),
      repository: {
        owner: config.owner,
        name: config.repo,
      },
      statistics: {
        issues: {
          total: issues.length,
          open: openIssues.length,
          closed: closedIssues.length,
        },
        pullRequests: {
          total: allPulls.length,
          open: openPulls.length,
          closed: closedPulls.length,
          merged: mergedPulls.length,
        },
        labels: Object.keys(labelCounts).length,
      },
      labelCounts,
      lastIssue: issues.length > 0 ? issues[0] : null,
      lastPullRequest: allPulls.length > 0 ? allPulls[0] : null,
    };

    saveJsonFile(
      join(dataDir, 'metadata.json'),
      metadata,
      'メタデータ'
    );

    // 成功メッセージ
    console.log('\n🎉 GitHub データの取得と保存が完了しました!');
    console.log(`📊 統計情報:`);
    console.log(`   Issues:`);
    console.log(`     - 総数: ${metadata.statistics.issues.total}`);
    console.log(`     - オープン: ${metadata.statistics.issues.open}`);
    console.log(`     - クローズ: ${metadata.statistics.issues.closed}`);
    console.log(`   Pull Requests:`);
    console.log(`     - 総数: ${metadata.statistics.pullRequests.total}`);
    console.log(`     - オープン: ${metadata.statistics.pullRequests.open}`);
    console.log(`     - クローズ: ${metadata.statistics.pullRequests.closed}`);
    console.log(`     - マージ済み: ${metadata.statistics.pullRequests.merged}`);
    console.log(`   - ラベル数: ${metadata.statistics.labels}`);
    console.log(`   - 最終更新: ${new Date(metadata.lastUpdated).toLocaleString('ja-JP')}`);

  } catch (error) {
    console.error('❌ データ取得中にエラーが発生しました:', error);
    
    // デバッグ情報の表示
    if (error instanceof Error) {
      console.error('エラー詳細:', error.message);
      if (error.stack) {
        console.error('スタックトレース:', error.stack);
      }
    }
    
    process.exit(1);
  }
}

// スクリプトの実行
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchAndSaveGitHubData();
}

export { fetchAndSaveGitHubData };
#!/usr/bin/env tsx

import { config } from 'dotenv';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { createGitHubClient } from '../src/lib/github/client.js';
import { GitHubIssuesService } from '../src/lib/github/issues.js';
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
    
    // オープンなIssueのみを取得
    const openIssuesResult = await issuesService.getIssues({ 
      state: 'open', 
      per_page: 100,
      sort: 'updated',
      direction: 'desc'
    });
    
    if (!openIssuesResult.success) {
      throw new Error(`GitHub API エラー (open issues): ${openIssuesResult.error.message}`);
    }
    
    const issues = openIssuesResult.data;
    console.log(`✅ ${issues.length} 件のオープン Issue を取得しました`);

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

    // 統計情報の計算（オープンIssueのみなので閉じたIssueは0）
    const openIssues = issues; // すべてオープンIssue
    const closedIssues: typeof issues = []; // 閉じたIssueは取得していない
    const labelCounts = issues.reduce((acc, issue) => {
      issue.labels.forEach(label => {
        acc[label.name] = (acc[label.name] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    // メタデータの保存
    const metadata = {
      lastUpdated: new Date().toISOString(),
      repository: {
        owner: config.owner,
        name: config.repo,
      },
      statistics: {
        total: issues.length,
        open: openIssues.length,
        closed: closedIssues.length,
        labels: Object.keys(labelCounts).length,
      },
      labelCounts,
      lastIssue: issues.length > 0 ? issues[0] : null,
    };

    saveJsonFile(
      join(dataDir, 'metadata.json'),
      metadata,
      'メタデータ'
    );

    // 成功メッセージ
    console.log('\n🎉 GitHub データの取得と保存が完了しました!');
    console.log(`📊 統計情報:`);
    console.log(`   - 総 Issue 数: ${metadata.statistics.total}`);
    console.log(`   - オープン: ${metadata.statistics.open}`);
    console.log(`   - クローズ: ${metadata.statistics.closed}`);
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
/**
 * 環境変数健全性チェック API エンドポイント
 *
 * GET /api/config/env-health
 *
 * 環境変数の検証状態と健全性をチェックし、設定問題を早期発見する
 */

import type { APIRoute } from 'astro';
import { getEnvValidator, EnvValidationError } from '../../../lib/config/env-validation';

export const GET: APIRoute = async () => {
  try {
    const validator = getEnvValidator();

    // 健全性チェックを実行
    const healthResult = await validator.healthCheck();

    if (!healthResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            message: 'Health check failed',
            details: healthResult.error?.message || 'Unknown error',
          },
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const { status, checks } = healthResult.data;

    // HTTPステータスコードをマッピング
    const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;

    // 詳細な応答を生成
    const response: any = {
      success: true,
      data: {
        status,
        timestamp: new Date().toISOString(),
        checks,
        summary: {
          total: checks.length,
          passed: checks.filter(c => c.status === 'pass').length,
          failed: checks.filter(c => c.status === 'fail').length,
          warnings: checks.filter(c => c.status === 'warn').length,
        },
      },
    };

    // 開発環境でのみ詳細情報を追加
    if (import.meta.env.DEV) {
      const setupGuide = validator.getSetupGuide();
      response.data.setupGuide = setupGuide;
    }

    return new Response(JSON.stringify(response), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Environment health check error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: 'Internal server error during health check',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};

// POST エンドポイント: 環境変数の検証（開発環境のみ）
export const POST: APIRoute = async ({ request }) => {
  // 開発環境以外では405を返す
  if (!import.meta.env.DEV) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: 'Method not allowed in production',
        },
      }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  try {
    const body = await request.json();
    const validator = getEnvValidator();

    // 提供された環境変数を検証
    const validationResult = await validator.validate(body.env || {});

    if (!validationResult.success) {
      const error = validationResult.error;
      const response: any = {
        success: false,
        error: {
          message: 'Environment validation failed',
          details: error.message,
        },
      };

      if (error instanceof EnvValidationError) {
        response.error.variable = error.variable;
        response.error.code = error.code;
        response.error.suggestions = error.suggestions;
      }

      return new Response(JSON.stringify(response), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          message: 'Environment variables are valid',
          timestamp: new Date().toISOString(),
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Environment validation error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: 'Failed to validate environment variables',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};

/**
 * Quality Dashboard with Interactive Settings
 *
 * A React component that provides an interactive quality dashboard with
 * configurable settings for threshold filtering and display options.
 *
 * @module QualityDashboardWithSettings
 */

import React, { useState, useMemo } from 'react';
import QualitySettings, { useQualitySettings } from '../ui/QualitySettings.tsx';

/**
 * Module coverage data structure
 */
export interface ModuleCoverageData {
  name: string;
  coverage: number;
  lines: number;
  missedLines: number;
}

/**
 * Quality dashboard props
 */
export interface QualityDashboardWithSettingsProps {
  /** Array of module coverage data */
  modules: ModuleCoverageData[];
  /** Default attention threshold */
  defaultThreshold?: number;
  /** Default display count */
  defaultDisplayCount?: number;
  /** CSS class name */
  className?: string;
}

/**
 * Quality Dashboard with Settings Component
 *
 * Provides an interactive dashboard with configurable filtering and display options
 */
export function QualityDashboardWithSettings({
  modules,
  defaultThreshold = 80,
  defaultDisplayCount = 5,
  className = '',
}: QualityDashboardWithSettingsProps) {
  const [settings, setSettings] = useQualitySettings({
    attentionThreshold: defaultThreshold,
    displayCount: defaultDisplayCount,
  });

  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);

  // Process modules based on current settings
  const processedData = useMemo(() => {
    const modulesNeedingAttention = modules
      .filter(module => module.coverage < settings.attentionThreshold)
      .sort((a, b) => a.coverage - b.coverage)
      .slice(0, settings.displayCount);

    const healthyModules = modules
      .filter(module => module.coverage >= settings.attentionThreshold)
      .sort((a, b) => b.coverage - a.coverage)
      .slice(0, settings.displayCount);

    const qualityAnalysis = {
      excellent: modules.filter(m => m.coverage >= 90),
      good: modules.filter(m => m.coverage >= 80 && m.coverage < 90),
      warning: modules.filter(m => m.coverage >= 50 && m.coverage < 80),
      critical: modules.filter(m => m.coverage < 50),
    };

    return {
      modulesNeedingAttention,
      healthyModules,
      qualityAnalysis,
    };
  }, [modules, settings]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Settings Panel */}
      <QualitySettings
        settings={settings}
        onSettingsChange={setSettings}
        isExpanded={isSettingsExpanded}
        onToggleExpanded={setIsSettingsExpanded}
      />

      {/* Quality Analysis Dashboard */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Modules Needing Attention (Below Threshold) */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              要改善モジュール ({settings.attentionThreshold}%未満)
            </h2>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
              {processedData.modulesNeedingAttention.length}件
            </span>
          </div>

          {processedData.modulesNeedingAttention.length === 0 ? (
            <div className="p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
              <div className="text-green-600 dark:text-green-400 mb-2">
                <svg
                  className="w-12 h-12 mx-auto mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                🎉 すべてのモジュールが基準を満たしています
              </h3>
              <p className="text-green-700 dark:text-green-300">
                全モジュールが{settings.attentionThreshold}%以上のカバレッジを達成しています。
                <br />
                素晴らしい品質状態です！
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {processedData.modulesNeedingAttention.map((module, index) => (
                <div
                  key={module.name}
                  className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-red-900 dark:text-red-200">{module.name}</h3>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        カバレッジ: {module.coverage.toFixed(1)}% • 未カバー:{' '}
                        {module.missedLines.toLocaleString()}行 / {module.lines.toLocaleString()}行
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
                        優先度{index + 1}
                      </span>
                      <span className="text-2xl">⚠️</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="w-full bg-red-200 dark:bg-red-800 rounded-full h-2">
                      <div
                        className="bg-red-600 dark:bg-red-500 h-2 rounded-full"
                        style={{ width: `${module.coverage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {modules.filter(m => m.coverage < settings.attentionThreshold).length >
                settings.displayCount && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-center">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    他に
                    {modules.filter(m => m.coverage < settings.attentionThreshold).length -
                      settings.displayCount}
                    件の改善対象モジュールがあります
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Healthy Modules (Above Threshold) */}
        {settings.showHealthyModules && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                高品質モジュール ({settings.attentionThreshold}%以上)
              </h2>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                {processedData.healthyModules.length}件
              </span>
            </div>

            {processedData.healthyModules.length === 0 ? (
              <div className="p-6 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg text-center">
                <div className="text-orange-600 dark:text-orange-400 mb-2">
                  <svg
                    className="w-12 h-12 mx-auto mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-200 mb-2">
                  改善の余地があります
                </h3>
                <p className="text-orange-700 dark:text-orange-300">
                  {settings.attentionThreshold}
                  %以上のカバレッジを達成しているモジュールがありません。
                  <br />
                  テストカバレッジの向上が必要です。
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {processedData.healthyModules.map(module => (
                  <div
                    key={module.name}
                    className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-green-900 dark:text-green-200">
                          {module.name}
                        </h3>
                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                          カバレッジ: {module.coverage.toFixed(1)}% • カバー済み:{' '}
                          {(module.lines - module.missedLines).toLocaleString()}行 /{' '}
                          {module.lines.toLocaleString()}行
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                          {module.coverage >= 90 ? '🌟優秀' : '✅良好'}
                        </span>
                        <span className="text-2xl">{module.coverage >= 90 ? '🌟' : '✅'}</span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-2">
                        <div
                          className="bg-green-600 dark:bg-green-500 h-2 rounded-full"
                          style={{ width: `${module.coverage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {processedData.healthyModules.length > settings.displayCount && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
                    <p className="text-sm text-green-800 dark:text-green-300">
                      他に{processedData.healthyModules.length - settings.displayCount}
                      件の高品質モジュールがあります
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quality Statistics Overview */}
      {settings.showStatistics && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            📊 品質レベル統計
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-center">
              <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
                {processedData.qualityAnalysis.excellent.length}
              </div>
              <div className="text-sm text-emerald-600 dark:text-emerald-400">優秀 (≥90%)</div>
              <div className="text-xs text-emerald-500 dark:text-emerald-400 mt-1">🌟</div>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-800 dark:text-green-200">
                {processedData.qualityAnalysis.good.length}
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">良好 (80-89%)</div>
              <div className="text-xs text-green-500 dark:text-green-400 mt-1">✅</div>
            </div>
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">
                {processedData.qualityAnalysis.warning.length}
              </div>
              <div className="text-sm text-yellow-600 dark:text-yellow-400">要注意 (50-79%)</div>
              <div className="text-xs text-yellow-500 dark:text-yellow-400 mt-1">⚠️</div>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-800 dark:text-red-200">
                {processedData.qualityAnalysis.critical.length}
              </div>
              <div className="text-sm text-red-600 dark:text-red-400">緊急 (&lt;50%)</div>
              <div className="text-xs text-red-500 dark:text-red-400 mt-1">🚨</div>
            </div>
          </div>

          {/* Quality Insights */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">💡 品質インサイト</h3>
            <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <p>
                • <strong>閾値設定:</strong> {settings.attentionThreshold}
                %未満のモジュールを改善対象として表示
              </p>
              <p>
                • <strong>優先度:</strong> カバレッジが最も低いモジュールから優先的に表示
              </p>
              <p>
                • <strong>表示件数:</strong> 各カテゴリ最大{settings.displayCount}件まで表示
              </p>
              {processedData.modulesNeedingAttention.length > 0 && (
                <p>
                  • <strong>推奨アクション:</strong>{' '}
                  要改善モジュールにテストケースを追加してカバレッジを向上
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QualityDashboardWithSettings;

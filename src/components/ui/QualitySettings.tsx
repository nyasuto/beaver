/**
 * Quality Dashboard Settings Component
 *
 * Provides configurable settings for the quality dashboard including
 * threshold adjustment, display count, and filter options.
 *
 * @module QualitySettings
 */

import React, { useState, useEffect } from 'react';

/**
 * Quality settings configuration
 */
export interface QualitySettingsConfig {
  /** Coverage threshold for attention filtering (default: 80) */
  attentionThreshold: number;
  /** Maximum number of modules to display per category (default: 5) */
  displayCount: number;
  /** Whether to show healthy modules section (default: true) */
  showHealthyModules: boolean;
  /** Whether to show statistics overview (default: true) */
  showStatistics: boolean;
}

/**
 * Quality settings component props
 */
export interface QualitySettingsProps {
  /** Current settings configuration */
  settings: QualitySettingsConfig;
  /** Callback when settings change */
  onSettingsChange: (settings: QualitySettingsConfig) => void;
  /** CSS class name */
  className?: string;
  /** Whether settings panel is expanded */
  isExpanded?: boolean;
  /** Callback when expand/collapse is toggled */
  onToggleExpanded?: (expanded: boolean) => void;
}

/**
 * Default quality settings
 */
export const DEFAULT_QUALITY_SETTINGS: QualitySettingsConfig = {
  attentionThreshold: 80,
  displayCount: 5,
  showHealthyModules: true,
  showStatistics: true,
};

/**
 * Quality Settings Component
 *
 * Provides an interactive UI for configuring quality dashboard settings
 */
export function QualitySettings({
  settings,
  onSettingsChange,
  className = '',
  isExpanded = false,
  onToggleExpanded,
}: QualitySettingsProps) {
  const [localSettings, setLocalSettings] = useState<QualitySettingsConfig>(settings);

  // Update local settings when props change
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Handle settings change with debouncing
  const handleSettingChange = (key: keyof QualitySettingsConfig, value: number | boolean) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  // Preset threshold options
  const thresholdPresets = [
    { value: 50, label: '50% (低)', description: '基本的な品質基準' },
    { value: 70, label: '70% (中)', description: '推奨品質基準' },
    { value: 80, label: '80% (高)', description: 'デフォルト基準' },
    { value: 90, label: '90% (最高)', description: '高品質基準' },
  ];

  // Display count options
  const displayCountOptions = [3, 5, 10, 15, 20];

  return (
    <div
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm ${className}`}
    >
      {/* Settings Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <span className="text-blue-600 dark:text-blue-400 text-lg">⚙️</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              品質ダッシュボード設定
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">表示内容と閾値をカスタマイズ</p>
          </div>
        </div>

        {onToggleExpanded && (
          <button
            onClick={() => onToggleExpanded(!isExpanded)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={isExpanded ? '設定を閉じる' : '設定を開く'}
          >
            <svg
              className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Settings Content */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Attention Threshold Setting */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              改善対象の閾値
            </label>
            <div className="space-y-3">
              {/* Threshold Slider */}
              <div className="px-3">
                <input
                  type="range"
                  min="10"
                  max="95"
                  step="5"
                  value={localSettings.attentionThreshold}
                  onChange={e =>
                    handleSettingChange('attentionThreshold', parseInt(e.target.value))
                  }
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>10%</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    {localSettings.attentionThreshold}%
                  </span>
                  <span>95%</span>
                </div>
              </div>

              {/* Preset Buttons */}
              <div className="grid grid-cols-2 gap-2">
                {thresholdPresets.map(preset => (
                  <button
                    key={preset.value}
                    onClick={() => handleSettingChange('attentionThreshold', preset.value)}
                    className={`p-3 text-left border rounded-lg transition-colors ${
                      localSettings.attentionThreshold === preset.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="font-medium">{preset.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {preset.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Display Count Setting */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              表示件数
            </label>
            <div className="flex space-x-2">
              {displayCountOptions.map(count => (
                <button
                  key={count}
                  onClick={() => handleSettingChange('displayCount', count)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    localSettings.displayCount === count
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {count}件
                </button>
              ))}
            </div>
          </div>

          {/* Display Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              表示オプション
            </label>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={localSettings.showHealthyModules}
                  onChange={e => handleSettingChange('showHealthyModules', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                  高品質モジュールセクションを表示
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={localSettings.showStatistics}
                  onChange={e => handleSettingChange('showStatistics', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                  品質レベル統計を表示
                </span>
              </label>
            </div>
          </div>

          {/* Reset Button */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => onSettingsChange(DEFAULT_QUALITY_SETTINGS)}
              className="w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              デフォルト設定にリセット
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Hook for managing quality settings with localStorage persistence
 */
export function useQualitySettings(initialSettings?: Partial<QualitySettingsConfig>) {
  const [settings, setSettings] = useState<QualitySettingsConfig>(() => {
    // Try to load from localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('beaver-quality-settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          return { ...DEFAULT_QUALITY_SETTINGS, ...parsed, ...initialSettings };
        }
      } catch (error) {
        console.warn('Failed to load quality settings from localStorage:', error);
      }
    }
    return { ...DEFAULT_QUALITY_SETTINGS, ...initialSettings };
  });

  // Save to localStorage whenever settings change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('beaver-quality-settings', JSON.stringify(settings));
      } catch (error) {
        console.warn('Failed to save quality settings to localStorage:', error);
      }
    }
  }, [settings]);

  return [settings, setSettings] as const;
}

export default QualitySettings;

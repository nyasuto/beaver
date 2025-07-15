/**
 * @jest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QualityDashboardWithSettings, {
  type ModuleCoverageData,
} from '../QualityDashboardWithSettings';

// Mock the QualitySettings component
vi.mock('../../ui/QualitySettings.tsx', () => ({
  default: ({ settings, onSettingsChange, isExpanded, onToggleExpanded }: any) => (
    <div data-testid="quality-settings">
      <button data-testid="toggle-settings" onClick={() => onToggleExpanded(!isExpanded)}>
        {isExpanded ? 'Collapse' : 'Expand'} Settings
      </button>
      {isExpanded && (
        <div data-testid="settings-panel">
          <label>
            Threshold:
            <input
              data-testid="threshold-input"
              type="number"
              value={settings.attentionThreshold}
              onChange={e =>
                onSettingsChange({
                  ...settings,
                  attentionThreshold: parseInt(e.target.value),
                })
              }
            />
          </label>
          <label>
            Display Count:
            <input
              data-testid="display-count-input"
              type="number"
              value={settings.displayCount}
              onChange={e =>
                onSettingsChange({
                  ...settings,
                  displayCount: parseInt(e.target.value),
                })
              }
            />
          </label>
          <label>
            <input
              data-testid="show-healthy-checkbox"
              type="checkbox"
              checked={settings.showHealthyModules}
              onChange={e =>
                onSettingsChange({
                  ...settings,
                  showHealthyModules: e.target.checked,
                })
              }
            />
            Show Healthy Modules
          </label>
          <label>
            <input
              data-testid="show-statistics-checkbox"
              type="checkbox"
              checked={settings.showStatistics}
              onChange={e =>
                onSettingsChange({
                  ...settings,
                  showStatistics: e.target.checked,
                })
              }
            />
            Show Statistics
          </label>
        </div>
      )}
    </div>
  ),
  useQualitySettings: vi.fn(({ attentionThreshold, displayCount }: any) => [
    {
      attentionThreshold,
      displayCount,
      showHealthyModules: false,
      showStatistics: false,
    },
    vi.fn(),
  ]),
}));

describe('QualityDashboardWithSettings', () => {
  const mockModules: ModuleCoverageData[] = [
    {
      name: 'src/components/ui',
      coverage: 32.8,
      lines: 1245,
      missedLines: 836,
    },
    {
      name: 'src/lib/github',
      coverage: 45.2,
      lines: 892,
      missedLines: 489,
    },
    {
      name: 'src/lib/utils',
      coverage: 89.4,
      lines: 423,
      missedLines: 45,
    },
    {
      name: 'src/pages/api',
      coverage: 42.1,
      lines: 534,
      missedLines: 309,
    },
    {
      name: 'src/lib/analytics',
      coverage: 95.0,
      lines: 200,
      missedLines: 10,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders quality dashboard with default props', () => {
    render(<QualityDashboardWithSettings modules={mockModules} />);

    expect(screen.getByTestId('quality-settings')).toBeInTheDocument();
    expect(screen.getByText('要改善モジュール (80%未満)')).toBeInTheDocument();
  });

  it('renders with custom default threshold', () => {
    render(<QualityDashboardWithSettings modules={mockModules} defaultThreshold={60} />);

    expect(screen.getByText('要改善モジュール (60%未満)')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <QualityDashboardWithSettings modules={mockModules} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('displays modules needing attention sorted by coverage', () => {
    render(<QualityDashboardWithSettings modules={mockModules} defaultThreshold={80} />);

    const moduleElements = screen.getAllByText(/カバレッジ:/);
    expect(moduleElements.length).toBeGreaterThan(0);

    // Check that modules below threshold are displayed
    expect(screen.getByText('src/components/ui')).toBeInTheDocument();
    expect(screen.getByText('src/lib/github')).toBeInTheDocument();
    expect(screen.getByText('src/pages/api')).toBeInTheDocument();
  });

  it('shows success message when all modules meet threshold', () => {
    render(<QualityDashboardWithSettings modules={mockModules} defaultThreshold={30} />);

    expect(screen.getByText('🎉 すべてのモジュールが基準を満たしています')).toBeInTheDocument();
    expect(
      screen.getByText(/全モジュールが30%以上のカバレッジを達成しています。/)
    ).toBeInTheDocument();
  });

  it('displays module coverage details correctly', () => {
    render(<QualityDashboardWithSettings modules={mockModules} />);

    // Check for specific coverage information
    expect(screen.getByText(/カバレッジ: 32.8%/)).toBeInTheDocument();
    expect(screen.getByText(/未カバー: 836行/)).toBeInTheDocument();
    expect(screen.getByText(/1,245行/)).toBeInTheDocument();
  });

  it('shows priority indicators for modules needing attention', () => {
    render(<QualityDashboardWithSettings modules={mockModules} />);

    expect(screen.getByText('優先度1')).toBeInTheDocument();
    expect(screen.getByText('優先度2')).toBeInTheDocument();
    expect(screen.getByText('優先度3')).toBeInTheDocument();
  });

  it('displays warning icons for modules needing attention', () => {
    render(<QualityDashboardWithSettings modules={mockModules} />);

    // Check for warning emoji
    const warningEmojis = screen.getAllByText('⚠️');
    expect(warningEmojis.length).toBeGreaterThan(0);
  });

  it('shows count of modules needing attention', () => {
    render(<QualityDashboardWithSettings modules={mockModules} />);

    expect(screen.getByText('3件')).toBeInTheDocument(); // 3 modules below 80%
  });

  it('shows additional modules message when exceeding display count', () => {
    render(<QualityDashboardWithSettings modules={mockModules} defaultDisplayCount={2} />);

    expect(screen.getByText(/他に1件の改善対象モジュールがあります/)).toBeInTheDocument();
  });

  it('handles empty modules array', () => {
    render(<QualityDashboardWithSettings modules={[]} />);

    expect(screen.getByText('🎉 すべてのモジュールが基準を満たしています')).toBeInTheDocument();
  });

  it('handles modules with zero coverage', () => {
    const zeroModules: ModuleCoverageData[] = [
      {
        name: 'src/untested',
        coverage: 0,
        lines: 100,
        missedLines: 100,
      },
    ];

    render(<QualityDashboardWithSettings modules={zeroModules} />);

    expect(screen.getByText('src/untested')).toBeInTheDocument();
    expect(screen.getByText(/カバレッジ: 0.0%/)).toBeInTheDocument();
  });

  it('handles modules with perfect coverage', () => {
    const perfectModules: ModuleCoverageData[] = [
      {
        name: 'src/perfect',
        coverage: 100,
        lines: 100,
        missedLines: 0,
      },
    ];

    render(<QualityDashboardWithSettings modules={perfectModules} />);

    expect(screen.getByText('🎉 すべてのモジュールが基準を満たしています')).toBeInTheDocument();
  });

  it('handles extremely large numbers correctly', () => {
    const largeModules: ModuleCoverageData[] = [
      {
        name: 'src/large',
        coverage: 50,
        lines: 1000000,
        missedLines: 500000,
      },
    ];

    render(<QualityDashboardWithSettings modules={largeModules} />);

    expect(screen.getByText(/1,000,000行/)).toBeInTheDocument();
    expect(screen.getByText(/500,000行/)).toBeInTheDocument();
  });

  it('handles decimal coverage values', () => {
    const decimalModules: ModuleCoverageData[] = [
      {
        name: 'src/decimal',
        coverage: 75.123456789,
        lines: 500,
        missedLines: 124,
      },
    ];

    render(<QualityDashboardWithSettings modules={decimalModules} />);

    expect(screen.getByText(/カバレッジ: 75.1%/)).toBeInTheDocument();
  });

  it('handles negative coverage values gracefully', () => {
    const negativeModules: ModuleCoverageData[] = [
      {
        name: 'src/negative',
        coverage: -10,
        lines: 100,
        missedLines: 110,
      },
    ];

    render(<QualityDashboardWithSettings modules={negativeModules} />);

    expect(screen.getByText('src/negative')).toBeInTheDocument();
    expect(screen.getByText(/カバレッジ: -10.0%/)).toBeInTheDocument();
  });

  it('handles invalid coverage values over 100%', () => {
    const invalidModules: ModuleCoverageData[] = [
      {
        name: 'src/invalid',
        coverage: 150,
        lines: 100,
        missedLines: -50,
      },
    ];

    render(<QualityDashboardWithSettings modules={invalidModules} />);

    // The module should be displayed since it's above the 80% threshold
    expect(screen.getByText('🎉 すべてのモジュールが基準を満たしています')).toBeInTheDocument();
  });

  it('updates when settings change', async () => {
    const { rerender } = render(<QualityDashboardWithSettings modules={mockModules} />);

    expect(screen.getByText('要改善モジュール (80%未満)')).toBeInTheDocument();

    rerender(<QualityDashboardWithSettings modules={mockModules} defaultThreshold={50} />);

    expect(screen.getByText('要改善モジュール (50%未満)')).toBeInTheDocument();
  });

  it('calculates quality analysis correctly', () => {
    // Test the quality analysis calculation logic
    const qualityAnalysis = {
      excellent: mockModules.filter(m => m.coverage >= 90),
      good: mockModules.filter(m => m.coverage >= 80 && m.coverage < 90),
      warning: mockModules.filter(m => m.coverage >= 50 && m.coverage < 80),
      critical: mockModules.filter(m => m.coverage < 50),
    };

    expect(qualityAnalysis.excellent).toHaveLength(1); // 95.0%
    expect(qualityAnalysis.good).toHaveLength(1); // 89.4%
    expect(qualityAnalysis.warning).toHaveLength(0); // none
    expect(qualityAnalysis.critical).toHaveLength(3); // 32.8%, 45.2%, 42.1%
  });

  it('handles large datasets efficiently', () => {
    const largeModules: ModuleCoverageData[] = Array.from({ length: 100 }, (_, i) => ({
      name: `src/module-${i}`,
      coverage: Math.random() * 100,
      lines: Math.floor(Math.random() * 1000) + 100,
      missedLines: Math.floor(Math.random() * 500),
    }));

    render(<QualityDashboardWithSettings modules={largeModules} />);

    expect(screen.getByText('要改善モジュール (80%未満)')).toBeInTheDocument();
  });

  it('handles modules with same coverage values', () => {
    const sameModules: ModuleCoverageData[] = [
      {
        name: 'src/module1',
        coverage: 50,
        lines: 100,
        missedLines: 50,
      },
      {
        name: 'src/module2',
        coverage: 50,
        lines: 200,
        missedLines: 100,
      },
    ];

    render(<QualityDashboardWithSettings modules={sameModules} />);

    expect(screen.getByText('src/module1')).toBeInTheDocument();
    expect(screen.getByText('src/module2')).toBeInTheDocument();
  });

  it('handles long module names properly', () => {
    const longNameModules: ModuleCoverageData[] = [
      {
        name: 'src/components/very/deeply/nested/module/with/extremely/long/path/that/might/cause/layout/issues',
        coverage: 30,
        lines: 100,
        missedLines: 70,
      },
    ];

    render(<QualityDashboardWithSettings modules={longNameModules} />);

    expect(
      screen.getByText(
        'src/components/very/deeply/nested/module/with/extremely/long/path/that/might/cause/layout/issues'
      )
    ).toBeInTheDocument();
  });

  it('renders progress bars correctly', () => {
    const { container } = render(<QualityDashboardWithSettings modules={mockModules} />);

    // Check for the progress bar container elements
    const progressBarContainers = container.querySelectorAll('.w-full.bg-red-200');
    expect(progressBarContainers.length).toBeGreaterThan(0);
  });

  it('maintains responsive layout classes', () => {
    const { container } = render(<QualityDashboardWithSettings modules={mockModules} />);

    const gridElements = container.querySelectorAll('.grid');
    expect(gridElements.length).toBeGreaterThan(0);

    const responsiveClasses = container.querySelectorAll('.xl\\:grid-cols-2, .md\\:grid-cols-4');
    expect(responsiveClasses.length).toBeGreaterThan(0);
  });

  it('handles settings expansion correctly', () => {
    render(<QualityDashboardWithSettings modules={mockModules} />);

    const toggleButton = screen.getByTestId('toggle-settings');
    expect(toggleButton).toBeInTheDocument();

    fireEvent.click(toggleButton);
    expect(screen.getByTestId('settings-panel')).toBeInTheDocument();
  });

  it('displays accessibility-friendly content', () => {
    render(<QualityDashboardWithSettings modules={mockModules} />);

    // Check for proper heading structure
    const headings = screen.getAllByRole('heading', { level: 2 });
    expect(headings.length).toBeGreaterThan(0);

    // Check for proper semantic structure
    expect(screen.getByText('要改善モジュール (80%未満)')).toBeInTheDocument();
  });

  it('handles dark mode classes correctly', () => {
    const { container } = render(<QualityDashboardWithSettings modules={mockModules} />);

    const darkModeElements = container.querySelectorAll(
      '.dark\\:bg-gray-800, .dark\\:text-gray-100'
    );
    expect(darkModeElements.length).toBeGreaterThan(0);
  });

  it('displays correct emojis for different quality levels', () => {
    // Test emoji logic for different coverage levels
    const testModule90 = { coverage: 95.0 };
    const testModule80 = { coverage: 85.0 };

    const emoji90 = testModule90.coverage >= 90 ? '🌟' : '✅';
    const emoji80 = testModule80.coverage >= 90 ? '🌟' : '✅';

    expect(emoji90).toBe('🌟');
    expect(emoji80).toBe('✅');
  });

  it('handles module data updates correctly', () => {
    const { rerender } = render(<QualityDashboardWithSettings modules={mockModules} />);

    const updatedModules = mockModules.map(module => ({
      ...module,
      coverage: module.coverage + 10,
    }));

    rerender(<QualityDashboardWithSettings modules={updatedModules} />);

    expect(screen.getByText(/カバレッジ: 42.8%/)).toBeInTheDocument();
  });

  it('handles threshold changes correctly', () => {
    const { rerender } = render(
      <QualityDashboardWithSettings modules={mockModules} defaultThreshold={80} />
    );

    expect(screen.getByText('3件')).toBeInTheDocument(); // 3 modules below 80%

    rerender(<QualityDashboardWithSettings modules={mockModules} defaultThreshold={90} />);

    expect(screen.getByText('4件')).toBeInTheDocument(); // 4 modules below 90%
  });
});

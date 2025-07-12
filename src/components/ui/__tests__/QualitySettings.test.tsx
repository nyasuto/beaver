/**
 * @jest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QualitySettings, {
  useQualitySettings,
  DEFAULT_QUALITY_SETTINGS,
} from '../QualitySettings.tsx';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('QualitySettings', () => {
  const mockOnSettingsChange = vi.fn();
  const mockOnToggleExpanded = vi.fn();

  const defaultProps = {
    settings: DEFAULT_QUALITY_SETTINGS,
    onSettingsChange: mockOnSettingsChange,
    isExpanded: true,
    onToggleExpanded: mockOnToggleExpanded,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders settings header correctly', () => {
    render(<QualitySettings {...defaultProps} />);

    expect(screen.getByText('品質ダッシュボード設定')).toBeInTheDocument();
    expect(screen.getByText('表示内容と閾値をカスタマイズ')).toBeInTheDocument();
    expect(screen.getByLabelText('設定を閉じる')).toBeInTheDocument();
  });

  it('renders collapsed state correctly', () => {
    render(<QualitySettings {...defaultProps} isExpanded={false} />);

    expect(screen.getByText('品質ダッシュボード設定')).toBeInTheDocument();
    expect(screen.queryByText('改善対象の閾値')).not.toBeInTheDocument();
    expect(screen.getByLabelText('設定を開く')).toBeInTheDocument();
  });

  it('toggles expanded state when button is clicked', async () => {
    const user = userEvent.setup();
    render(<QualitySettings {...defaultProps} isExpanded={false} />);

    const toggleButton = screen.getByLabelText('設定を開く');
    await user.click(toggleButton);

    expect(mockOnToggleExpanded).toHaveBeenCalledWith(true);
  });

  it('renders threshold slider with correct value', () => {
    render(<QualitySettings {...defaultProps} />);

    expect(screen.getByText('改善対象の閾値')).toBeInTheDocument();

    const slider = screen.getByDisplayValue('80');
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('type', 'range');
    expect(slider).toHaveAttribute('min', '10');
    expect(slider).toHaveAttribute('max', '95');
    expect(slider).toHaveAttribute('step', '5');
  });

  it('updates threshold when slider is changed', () => {
    render(<QualitySettings {...defaultProps} />);

    const slider = screen.getByDisplayValue('80');
    fireEvent.change(slider, { target: { value: '70' } });

    expect(mockOnSettingsChange).toHaveBeenCalledWith({
      ...DEFAULT_QUALITY_SETTINGS,
      attentionThreshold: 70,
    });
  });

  it('renders threshold preset buttons', () => {
    render(<QualitySettings {...defaultProps} />);

    expect(screen.getByText('50% (低)')).toBeInTheDocument();
    expect(screen.getByText('70% (中)')).toBeInTheDocument();
    expect(screen.getByText('80% (高)')).toBeInTheDocument();
    expect(screen.getByText('90% (最高)')).toBeInTheDocument();
  });

  it('updates threshold when preset button is clicked', async () => {
    const user = userEvent.setup();
    render(<QualitySettings {...defaultProps} />);

    const preset70Button = screen.getByText('70% (中)').closest('button');
    expect(preset70Button).toBeInTheDocument();

    await user.click(preset70Button!);

    expect(mockOnSettingsChange).toHaveBeenCalledWith({
      ...DEFAULT_QUALITY_SETTINGS,
      attentionThreshold: 70,
    });
  });

  it('highlights active preset button', () => {
    const settingsWithDifferentThreshold = {
      ...DEFAULT_QUALITY_SETTINGS,
      attentionThreshold: 70,
    };

    render(<QualitySettings {...defaultProps} settings={settingsWithDifferentThreshold} />);

    const preset70Button = screen.getByText('70% (中)').closest('button');
    const preset80Button = screen.getByText('80% (高)').closest('button');

    expect(preset70Button).toHaveClass('border-blue-500', 'bg-blue-50');
    expect(preset80Button).not.toHaveClass('border-blue-500', 'bg-blue-50');
  });

  it('renders display count options', () => {
    render(<QualitySettings {...defaultProps} />);

    expect(screen.getByText('表示件数')).toBeInTheDocument();
    expect(screen.getByText('3件')).toBeInTheDocument();
    expect(screen.getByText('5件')).toBeInTheDocument();
    expect(screen.getByText('10件')).toBeInTheDocument();
    expect(screen.getByText('15件')).toBeInTheDocument();
    expect(screen.getByText('20件')).toBeInTheDocument();
  });

  it('updates display count when button is clicked', async () => {
    const user = userEvent.setup();
    render(<QualitySettings {...defaultProps} />);

    const count10Button = screen.getByText('10件');
    await user.click(count10Button);

    expect(mockOnSettingsChange).toHaveBeenCalledWith({
      ...DEFAULT_QUALITY_SETTINGS,
      displayCount: 10,
    });
  });

  it('highlights active display count button', () => {
    render(<QualitySettings {...defaultProps} />);

    const count5Button = screen.getByText('5件');
    const count10Button = screen.getByText('10件');

    expect(count5Button).toHaveClass('border-blue-500', 'bg-blue-50');
    expect(count10Button).not.toHaveClass('border-blue-500', 'bg-blue-50');
  });

  it('renders display options checkboxes', () => {
    render(<QualitySettings {...defaultProps} />);

    expect(screen.getByText('表示オプション')).toBeInTheDocument();
    expect(screen.getByText('高品質モジュールセクションを表示')).toBeInTheDocument();
    expect(screen.getByText('品質レベル統計を表示')).toBeInTheDocument();

    const healthyModulesCheckbox = screen.getByLabelText('高品質モジュールセクションを表示');
    const statisticsCheckbox = screen.getByLabelText('品質レベル統計を表示');

    expect(healthyModulesCheckbox).toBeChecked();
    expect(statisticsCheckbox).toBeChecked();
  });

  it('updates display options when checkboxes are toggled', async () => {
    const user = userEvent.setup();
    render(<QualitySettings {...defaultProps} />);

    const healthyModulesCheckbox = screen.getByLabelText('高品質モジュールセクションを表示');
    await user.click(healthyModulesCheckbox);

    expect(mockOnSettingsChange).toHaveBeenCalledWith({
      ...DEFAULT_QUALITY_SETTINGS,
      showHealthyModules: false,
    });
  });

  it('renders reset button', () => {
    render(<QualitySettings {...defaultProps} />);

    expect(screen.getByText('デフォルト設定にリセット')).toBeInTheDocument();
  });

  it('resets settings when reset button is clicked', async () => {
    const user = userEvent.setup();
    const customSettings = {
      attentionThreshold: 70,
      displayCount: 10,
      showHealthyModules: false,
      showStatistics: false,
    };

    render(<QualitySettings {...defaultProps} settings={customSettings} />);

    const resetButton = screen.getByText('デフォルト設定にリセット');
    await user.click(resetButton);

    expect(mockOnSettingsChange).toHaveBeenCalledWith(DEFAULT_QUALITY_SETTINGS);
  });

  it('applies custom className', () => {
    const customClass = 'custom-settings-class';
    const { container } = render(<QualitySettings {...defaultProps} className={customClass} />);

    expect(container.firstChild).toHaveClass(customClass);
  });

  it('works without onToggleExpanded callback', () => {
    render(
      <QualitySettings
        settings={DEFAULT_QUALITY_SETTINGS}
        onSettingsChange={mockOnSettingsChange}
        isExpanded={true}
      />
    );

    expect(screen.queryByLabelText('設定を閉じる')).not.toBeInTheDocument();
  });
});

describe('useQualitySettings', () => {
  const TestComponent = () => {
    const [settings, setSettings] = useQualitySettings();

    return (
      <div>
        <div data-testid="threshold">{settings.attentionThreshold}</div>
        <div data-testid="displayCount">{settings.displayCount}</div>
        <div data-testid="showHealthy">{settings.showHealthyModules.toString()}</div>
        <div data-testid="showStats">{settings.showStatistics.toString()}</div>
        <button
          onClick={() =>
            setSettings({
              ...settings,
              attentionThreshold: 70,
            })
          }
          data-testid="updateButton"
        >
          Update
        </button>
      </div>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('returns default settings initially', () => {
    render(<TestComponent />);

    expect(screen.getByTestId('threshold')).toHaveTextContent('80');
    expect(screen.getByTestId('displayCount')).toHaveTextContent('5');
    expect(screen.getByTestId('showHealthy')).toHaveTextContent('true');
    expect(screen.getByTestId('showStats')).toHaveTextContent('true');
  });

  it('loads settings from localStorage', () => {
    const savedSettings = {
      attentionThreshold: 70,
      displayCount: 10,
      showHealthyModules: false,
      showStatistics: false,
    };

    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedSettings));

    render(<TestComponent />);

    expect(screen.getByTestId('threshold')).toHaveTextContent('70');
    expect(screen.getByTestId('displayCount')).toHaveTextContent('10');
    expect(screen.getByTestId('showHealthy')).toHaveTextContent('false');
    expect(screen.getByTestId('showStats')).toHaveTextContent('false');
  });

  it('saves settings to localStorage when updated', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    const updateButton = screen.getByTestId('updateButton');
    await user.click(updateButton);

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'beaver-quality-settings',
        JSON.stringify({
          ...DEFAULT_QUALITY_SETTINGS,
          attentionThreshold: 70,
        })
      );
    });
  });

  it('handles localStorage errors gracefully', () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(<TestComponent />);

    expect(screen.getByTestId('threshold')).toHaveTextContent('80');
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to load quality settings from localStorage:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('handles localStorage save errors gracefully', async () => {
    const user = userEvent.setup();
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error('localStorage save error');
    });

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(<TestComponent />);

    const updateButton = screen.getByTestId('updateButton');
    await user.click(updateButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save quality settings to localStorage:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it('works with initial settings override', () => {
    const TestComponentWithInitial = () => {
      const [settings] = useQualitySettings({ attentionThreshold: 60 });
      return <div data-testid="threshold">{settings.attentionThreshold}</div>;
    };

    render(<TestComponentWithInitial />);

    expect(screen.getByTestId('threshold')).toHaveTextContent('60');
  });
});

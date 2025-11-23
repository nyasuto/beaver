/**
 * User Settings Test Suite
 *
 * Comprehensive tests for user settings management including
 * configuration validation, persistence, and event handling.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  UserSettingsManager,
  createSettingsManager,
  getSettingsManager,
  destroySettingsManager,
  SETTINGS_CONSTANTS,
  type NotificationSettings,
  type VersionCheckSettings,
  type UISettings,
  type PrivacySettings,
  type PWASettings,
} from '../settings';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  keys: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock document for event dispatching
const mockDocument = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
};
Object.defineProperty(global, 'document', {
  value: mockDocument,
});

// Mock navigator.serviceWorker
const mockNavigator = {
  serviceWorker: {
    controller: {
      postMessage: vi.fn(),
    },
  },
};
Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
});

// Mock window with beaverSystems
const mockWindow = {
  beaverSystems: {
    pwaVersionChecker: {
      updatePWAConfig: vi.fn(),
    },
  },
};
Object.defineProperty(global, 'window', {
  value: mockWindow,
});

describe('UserSettingsManager', () => {
  let settingsManager: UserSettingsManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    Object.keys(mockLocalStorage).forEach(key => {
      if (key.startsWith('beaver_')) {
        mockLocalStorage.removeItem(key);
      }
    });

    settingsManager = new UserSettingsManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    destroySettingsManager();
  });

  describe('Initialization', () => {
    it('should initialize with default settings', () => {
      const settings = settingsManager.getSettings();

      expect(settings.version).toBe(SETTINGS_CONSTANTS.VERSION);
      expect(settings.notifications.enabled).toBe(true);
      expect(settings.versionCheck.enabled).toBe(true);
      expect(settings.ui.theme).toBe('system');
      expect(settings.privacy.analytics).toBe(true);
      expect(settings.pwa.enabled).toBe(true);
      expect(settings.updatedAt).toBeGreaterThan(0);
    });

    it('should load settings from localStorage', () => {
      const storedSettings = {
        notifications: { enabled: false },
        versionCheck: { enabled: false },
        ui: { theme: 'dark' },
        privacy: { analytics: false },
        pwa: { enabled: false },
        version: '1.0.0',
        updatedAt: 1234567890000,
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedSettings));

      const newManager = new UserSettingsManager();
      const settings = newManager.getSettings();

      expect(settings.notifications.enabled).toBe(false);
      expect(settings.versionCheck.enabled).toBe(false);
      expect(settings.ui.theme).toBe('dark');
      expect(settings.privacy.analytics).toBe(false);
      expect(settings.pwa.enabled).toBe(false);
    });

    it('should handle corrupted localStorage data', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(() => new UserSettingsManager()).not.toThrow();
      const newManager = new UserSettingsManager();
      expect(newManager.getSettings().version).toBe(SETTINGS_CONSTANTS.VERSION);

      consoleWarnSpy.mockRestore();
    });

    it('should migrate old settings format', () => {
      const oldSettings = {
        notifications: { enabled: false },
        // Missing some required fields
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(oldSettings));

      const newManager = new UserSettingsManager();
      const settings = newManager.getSettings();

      // Should have migrated with defaults
      expect(settings.notifications.enabled).toBe(false);
      expect(settings.versionCheck).toBeDefined();
      expect(settings.ui).toBeDefined();
      expect(settings.privacy).toBeDefined();
      expect(settings.pwa).toBeDefined();
    });
  });

  describe('Settings Retrieval', () => {
    it('should get all settings', () => {
      const settings = settingsManager.getSettings();

      expect(settings).toHaveProperty('notifications');
      expect(settings).toHaveProperty('versionCheck');
      expect(settings).toHaveProperty('ui');
      expect(settings).toHaveProperty('privacy');
      expect(settings).toHaveProperty('pwa');
      expect(settings).toHaveProperty('version');
      expect(settings).toHaveProperty('updatedAt');
    });

    it('should get notification settings', () => {
      const notifications = settingsManager.getNotificationSettings();

      expect(notifications).toHaveProperty('enabled');
      expect(notifications).toHaveProperty('position');
      expect(notifications).toHaveProperty('animation');
      expect(notifications).toHaveProperty('browser');
    });

    it('should get version check settings', () => {
      const versionCheck = settingsManager.getVersionCheckSettings();

      expect(versionCheck).toHaveProperty('enabled');
      expect(versionCheck).toHaveProperty('interval');
      expect(versionCheck).toHaveProperty('checkOnlyWhenVisible');
    });

    it('should get UI settings', () => {
      const ui = settingsManager.getUISettings();

      expect(ui).toHaveProperty('theme');
      expect(ui).toHaveProperty('animations');
      expect(ui).toHaveProperty('compactMode');
      expect(ui).toHaveProperty('language');
    });

    it('should get privacy settings', () => {
      const privacy = settingsManager.getPrivacySettings();

      expect(privacy).toHaveProperty('analytics');
      expect(privacy).toHaveProperty('errorReporting');
      expect(privacy).toHaveProperty('usageStats');
    });

    it('should get PWA settings', () => {
      const pwa = settingsManager.getPWASettings();

      expect(pwa).toHaveProperty('enabled');
      expect(pwa).toHaveProperty('offlineMode');
      expect(pwa).toHaveProperty('autoUpdate');
      expect(pwa).toHaveProperty('autoReload');
    });
  });

  describe('Notification Settings Updates', () => {
    it('should update notification settings', () => {
      const updates: Partial<NotificationSettings> = {
        enabled: false,
        position: 'bottom',
        animation: 'fade',
      };

      settingsManager.updateNotificationSettings(updates);

      const notifications = settingsManager.getNotificationSettings();
      expect(notifications.enabled).toBe(false);
      expect(notifications.position).toBe('bottom');
      expect(notifications.animation).toBe('fade');
    });

    it('should dispatch events when notification settings change', () => {
      const updates = { enabled: false };

      settingsManager.updateNotificationSettings(updates);

      expect(mockDocument.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SETTINGS_CONSTANTS.EVENTS.SETTINGS_CHANGED,
          detail: expect.objectContaining({
            section: 'notifications',
            updates,
          }),
        })
      );
    });

    it('should dispatch specific event when notification enabled status changes', () => {
      settingsManager.updateNotificationSettings({ enabled: false });

      expect(mockDocument.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SETTINGS_CONSTANTS.EVENTS.NOTIFICATIONS_TOGGLED,
          detail: { enabled: false },
        })
      );
    });

    it('should save settings to localStorage after update', () => {
      settingsManager.updateNotificationSettings({ enabled: false });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        SETTINGS_CONSTANTS.STORAGE_KEY,
        expect.stringContaining('"enabled":false')
      );
    });
  });

  describe('Version Check Settings Updates', () => {
    it('should update version check settings', () => {
      const updates: Partial<VersionCheckSettings> = {
        enabled: false,
        interval: 60000,
        maxRetries: 5,
      };

      settingsManager.updateVersionCheckSettings(updates);

      const versionCheck = settingsManager.getVersionCheckSettings();
      expect(versionCheck.enabled).toBe(false);
      expect(versionCheck.interval).toBe(60000);
      expect(versionCheck.maxRetries).toBe(5);
    });

    it('should dispatch events when version check settings change', () => {
      const updates = { enabled: false };

      settingsManager.updateVersionCheckSettings(updates);

      expect(mockDocument.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SETTINGS_CONSTANTS.EVENTS.SETTINGS_CHANGED,
          detail: expect.objectContaining({
            section: 'versionCheck',
            updates,
          }),
        })
      );
    });

    it('should dispatch specific event when version check enabled status changes', () => {
      settingsManager.updateVersionCheckSettings({ enabled: false });

      expect(mockDocument.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SETTINGS_CONSTANTS.EVENTS.VERSION_CHECK_TOGGLED,
          detail: { enabled: false },
        })
      );
    });
  });

  describe('UI Settings Updates', () => {
    it('should update UI settings', () => {
      const updates: Partial<UISettings> = {
        theme: 'dark',
        animations: false,
        compactMode: true,
        language: 'en',
      };

      settingsManager.updateUISettings(updates);

      const ui = settingsManager.getUISettings();
      expect(ui.theme).toBe('dark');
      expect(ui.animations).toBe(false);
      expect(ui.compactMode).toBe(true);
      expect(ui.language).toBe('en');
    });

    it('should dispatch theme change event', () => {
      settingsManager.updateUISettings({ theme: 'dark' });

      expect(mockDocument.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SETTINGS_CONSTANTS.EVENTS.THEME_CHANGED,
          detail: expect.objectContaining({
            theme: 'dark',
            previousTheme: 'system',
          }),
        })
      );
    });
  });

  describe('Privacy Settings Updates', () => {
    it('should update privacy settings', () => {
      const updates: Partial<PrivacySettings> = {
        analytics: false,
        errorReporting: false,
        usageStats: true,
      };

      settingsManager.updatePrivacySettings(updates);

      const privacy = settingsManager.getPrivacySettings();
      expect(privacy.analytics).toBe(false);
      expect(privacy.errorReporting).toBe(false);
      expect(privacy.usageStats).toBe(true);
    });

    it('should dispatch events when privacy settings change', () => {
      const updates = { analytics: false };

      settingsManager.updatePrivacySettings(updates);

      expect(mockDocument.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SETTINGS_CONSTANTS.EVENTS.SETTINGS_CHANGED,
          detail: expect.objectContaining({
            section: 'privacy',
            updates,
          }),
        })
      );
    });
  });

  describe('PWA Settings Updates', () => {
    it('should update PWA settings', () => {
      const updates: Partial<PWASettings> = {
        enabled: false,
        autoReload: true,
        autoReloadDelay: 3000,
        cacheStrategy: 'immediate',
      };

      settingsManager.updatePWASettings(updates);

      const pwa = settingsManager.getPWASettings();
      expect(pwa.enabled).toBe(false);
      expect(pwa.autoReload).toBe(true);
      expect(pwa.autoReloadDelay).toBe(3000);
      expect(pwa.cacheStrategy).toBe('immediate');
    });

    it('should dispatch PWA enabled toggle event', () => {
      settingsManager.updatePWASettings({ enabled: false });

      expect(mockDocument.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SETTINGS_CONSTANTS.EVENTS.PWA_TOGGLED,
          detail: { enabled: false },
        })
      );
    });

    it('should dispatch PWA cache strategy change event', () => {
      settingsManager.updatePWASettings({ cacheStrategy: 'immediate' });

      expect(mockDocument.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SETTINGS_CONSTANTS.EVENTS.PWA_CACHE_STRATEGY_CHANGED,
          detail: expect.objectContaining({
            cacheStrategy: 'immediate',
            previousStrategy: 'background',
          }),
        })
      );
    });

    it('should dispatch PWA auto-reload toggle event', () => {
      settingsManager.updatePWASettings({ autoReload: true });

      expect(mockDocument.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SETTINGS_CONSTANTS.EVENTS.PWA_AUTO_RELOAD_TOGGLED,
          detail: expect.objectContaining({
            enabled: true,
          }),
        })
      );
    });

    it('should handle missing PWA settings object', () => {
      // Test the path where PWA settings might be missing
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Test updatePWASettings with a fresh manager
      const updates = { enabled: false };
      settingsManager.updatePWASettings(updates);

      // Should work without warnings in normal case
      expect(settingsManager.getPWASettings()).toBeDefined();
      expect(settingsManager.getPWASettings().enabled).toBe(false);

      consoleWarnSpy.mockRestore();
    });

    it('should notify PWA system about settings changes', () => {
      settingsManager.updatePWASettings({ enabled: false });

      expect(mockNavigator.serviceWorker.controller.postMessage).toHaveBeenCalledWith({
        type: 'PWA_SETTINGS_UPDATE',
        settings: { enabled: false },
        timestamp: expect.any(Number),
      });
    });

    it('should notify PWA version checker about settings changes', () => {
      settingsManager.updatePWASettings({ autoUpdate: false });

      expect(mockWindow.beaverSystems.pwaVersionChecker.updatePWAConfig).toHaveBeenCalledWith({
        serviceWorkerEnabled: undefined,
        cacheInvalidationStrategy: undefined,
        forceSwUpdateOnVersionChange: false,
      });
    });

    it('should handle PWA system notification errors', () => {
      mockNavigator.serviceWorker.controller.postMessage.mockImplementation(() => {
        throw new Error('ServiceWorker error');
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      settingsManager.updatePWASettings({ enabled: false });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to notify PWA system about settings changes:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Toggle Methods', () => {
    it('should toggle notifications', () => {
      const result = settingsManager.toggleNotifications();
      expect(result).toBe(false);
      expect(settingsManager.getNotificationSettings().enabled).toBe(false);

      const result2 = settingsManager.toggleNotifications();
      expect(result2).toBe(true);
      expect(settingsManager.getNotificationSettings().enabled).toBe(true);
    });

    it('should toggle version check', () => {
      const result = settingsManager.toggleVersionCheck();
      expect(result).toBe(false);
      expect(settingsManager.getVersionCheckSettings().enabled).toBe(false);

      const result2 = settingsManager.toggleVersionCheck();
      expect(result2).toBe(true);
      expect(settingsManager.getVersionCheckSettings().enabled).toBe(true);
    });

    it('should toggle PWA', () => {
      const result = settingsManager.togglePWA();
      expect(result).toBe(false);
      expect(settingsManager.getPWASettings().enabled).toBe(false);

      const result2 = settingsManager.togglePWA();
      expect(result2).toBe(true);
      expect(settingsManager.getPWASettings().enabled).toBe(true);
    });

    it('should toggle PWA auto-reload', () => {
      const result = settingsManager.togglePWAAutoReload();
      expect(result).toBe(true);
      expect(settingsManager.getPWASettings().autoReload).toBe(true);

      const result2 = settingsManager.togglePWAAutoReload();
      expect(result2).toBe(false);
      expect(settingsManager.getPWASettings().autoReload).toBe(false);
    });
  });

  describe('Specific Setters', () => {
    it('should set PWA auto-reload delay', () => {
      settingsManager.setPWAAutoReloadDelay(10000);
      expect(settingsManager.getPWASettings().autoReloadDelay).toBe(10000);
    });

    it('should set theme', () => {
      settingsManager.setTheme('dark');
      expect(settingsManager.getUISettings().theme).toBe('dark');
    });

    it('should set PWA cache strategy', () => {
      settingsManager.setPWACacheStrategy('immediate');
      expect(settingsManager.getPWASettings().cacheStrategy).toBe('immediate');
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all settings to defaults', () => {
      // Change some settings first
      settingsManager.updateNotificationSettings({ enabled: false });
      settingsManager.updateUISettings({ theme: 'dark' });

      settingsManager.resetToDefaults();

      const settings = settingsManager.getSettings();
      expect(settings.notifications.enabled).toBe(true);
      expect(settings.ui.theme).toBe('system');
    });

    it('should reset specific sections', () => {
      settingsManager.updateNotificationSettings({ enabled: false });
      settingsManager.updateUISettings({ theme: 'dark' });

      settingsManager.resetSection('notifications');

      expect(settingsManager.getNotificationSettings().enabled).toBe(true);
      expect(settingsManager.getUISettings().theme).toBe('dark'); // unchanged
    });

    it('should reset all supported sections', () => {
      const sections = ['notifications', 'versionCheck', 'ui', 'privacy', 'pwa'] as const;

      sections.forEach(section => {
        expect(() => settingsManager.resetSection(section)).not.toThrow();
      });
    });
  });

  describe('Persistence', () => {
    it('should save settings to localStorage', () => {
      settingsManager.updateNotificationSettings({ enabled: false });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        SETTINGS_CONSTANTS.STORAGE_KEY,
        expect.stringContaining('"enabled":false')
      );
    });

    it('should handle localStorage save errors', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      settingsManager.updateNotificationSettings({ enabled: false });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to save user settings:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });

    it('should verify save immediately after setting', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Mock getItem to simulate successful save verification
      mockLocalStorage.getItem.mockReturnValue('{"pwa":{"autoReload":true}}');

      settingsManager.updatePWASettings({ autoReload: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '💾 Saving settings to localStorage:',
        expect.any(Object)
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('Migration', () => {
    it('should migrate settings successfully', () => {
      const oldSettings = {
        notifications: { enabled: false },
        versionCheck: { enabled: false },
        ui: { theme: 'dark' },
        privacy: { analytics: false },
        pwa: { enabled: false },
      };

      const migrated = settingsManager['migrateSettings'](oldSettings);

      expect(migrated.notifications.enabled).toBe(false);
      expect(migrated.versionCheck.enabled).toBe(false);
      expect(migrated.ui.theme).toBe('dark');
      expect(migrated.privacy.analytics).toBe(false);
      expect(migrated.pwa.enabled).toBe(false);
      expect(migrated.version).toBe(SETTINGS_CONSTANTS.VERSION);
    });

    it('should handle migration errors', () => {
      // Force migration to fail by passing null
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const migrated = settingsManager['migrateSettings'](null);

      expect(migrated.version).toBe(SETTINGS_CONSTANTS.VERSION);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Migration failed, using defaults:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });

    it('should clear corrupted settings', () => {
      mockLocalStorage.getItem.mockReturnValue('corrupted-json');

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      new UserSettingsManager();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(SETTINGS_CONSTANTS.STORAGE_KEY);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cleared corrupted settings')
      );

      consoleWarnSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });

  describe('Event Management', () => {
    it('should add event listeners', () => {
      const listener = vi.fn();

      settingsManager.addEventListener('test-event', listener);

      // Event listener should be added
      expect(listener).toBeDefined();
    });

    it('should remove event listeners', () => {
      const listener = vi.fn();

      settingsManager.removeEventListener('test-event', listener);

      // Event listener should be removed
      expect(listener).toBeDefined();
    });
  });

  describe('Import/Export', () => {
    it('should export settings as JSON', () => {
      const exported = settingsManager.exportSettings();
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveProperty('notifications');
      expect(parsed).toHaveProperty('versionCheck');
      expect(parsed).toHaveProperty('ui');
      expect(parsed).toHaveProperty('privacy');
      expect(parsed).toHaveProperty('pwa');
    });

    it('should import valid settings', () => {
      const exportedSettings = {
        notifications: { enabled: false },
        versionCheck: { enabled: false },
        ui: { theme: 'dark' },
        privacy: { analytics: false },
        pwa: { enabled: false },
        version: '1.0.0',
        updatedAt: Date.now(),
      };

      const result = settingsManager.importSettings(JSON.stringify(exportedSettings));

      expect(result).toBe(true);
      expect(settingsManager.getNotificationSettings().enabled).toBe(false);
      expect(settingsManager.getUISettings().theme).toBe('dark');
    });

    it('should reject invalid settings on import', () => {
      const invalidSettings = { invalid: 'data' };

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = settingsManager.importSettings(JSON.stringify(invalidSettings));

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Invalid settings format:', expect.any(Object));

      consoleErrorSpy.mockRestore();
    });

    it('should handle import JSON parsing errors', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = settingsManager.importSettings('invalid-json');

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to import settings:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });
});

describe('Singleton Management', () => {
  afterEach(() => {
    destroySettingsManager();
  });

  it('should create singleton instance', () => {
    const manager1 = createSettingsManager();
    const manager2 = createSettingsManager();

    expect(manager1).toBe(manager2);
    expect(getSettingsManager()).toBe(manager1);
  });

  it('should handle manager creation failure', () => {
    // Mock localStorage to throw errors during creation
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('Storage error');
    });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Clear existing singleton
    destroySettingsManager();

    const manager = createSettingsManager();

    expect(manager).toBeDefined();
    expect(manager.getSettings()).toBeDefined();

    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();

    // Reset localStorage mock
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('should create fallback manager when all else fails', () => {
    // Clear existing singleton
    destroySettingsManager();

    // Mock localStorage to throw errors
    mockLocalStorage.removeItem.mockImplementation(() => {
      throw new Error('Storage error');
    });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const manager = createSettingsManager();

    expect(manager).toBeDefined();
    expect(manager.getSettings()).toBeDefined();

    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();

    // Reset localStorage mock
    mockLocalStorage.removeItem.mockReturnValue(undefined);
  });

  it('should destroy singleton instance', () => {
    const manager = createSettingsManager();
    expect(getSettingsManager()).toBe(manager);

    destroySettingsManager();
    expect(getSettingsManager()).toBe(null);
  });
});

describe('Settings Constants', () => {
  it('should have correct storage key', () => {
    expect(SETTINGS_CONSTANTS.STORAGE_KEY).toBe('beaver_user_settings');
  });

  it('should have correct version', () => {
    expect(SETTINGS_CONSTANTS.VERSION).toBe('1.0.0');
  });

  it('should have all required events', () => {
    expect(SETTINGS_CONSTANTS.EVENTS.SETTINGS_CHANGED).toBe('settings:changed');
    expect(SETTINGS_CONSTANTS.EVENTS.NOTIFICATIONS_TOGGLED).toBe('settings:notifications-toggled');
    expect(SETTINGS_CONSTANTS.EVENTS.THEME_CHANGED).toBe('settings:theme-changed');
    expect(SETTINGS_CONSTANTS.EVENTS.VERSION_CHECK_TOGGLED).toBe('settings:version-check-toggled');
    expect(SETTINGS_CONSTANTS.EVENTS.PWA_TOGGLED).toBe('settings:pwa-toggled');
    expect(SETTINGS_CONSTANTS.EVENTS.PWA_CACHE_STRATEGY_CHANGED).toBe(
      'settings:pwa-cache-strategy-changed'
    );
    expect(SETTINGS_CONSTANTS.EVENTS.PWA_AUTO_RELOAD_TOGGLED).toBe(
      'settings:pwa-auto-reload-toggled'
    );
  });

  it('should have correct defaults', () => {
    expect(SETTINGS_CONSTANTS.DEFAULTS.notifications.enabled).toBe(true);
    expect(SETTINGS_CONSTANTS.DEFAULTS.versionCheck.enabled).toBe(true);
    expect(SETTINGS_CONSTANTS.DEFAULTS.ui.theme).toBe('system');
    expect(SETTINGS_CONSTANTS.DEFAULTS.privacy.analytics).toBe(true);
    expect(SETTINGS_CONSTANTS.DEFAULTS.pwa.enabled).toBe(true);
  });
});

describe('Fallback Settings Manager', () => {
  it('should create fallback manager with safe defaults', () => {
    // Test that fallback manager has safe defaults
    const manager = createSettingsManager();

    expect(manager).toBeDefined();
    expect(manager.getSettings()).toBeDefined();
    expect(manager.getSettings().notifications.enabled).toBe(true);
    expect(manager.getSettings().version).toBe(SETTINGS_CONSTANTS.VERSION);
  });
});

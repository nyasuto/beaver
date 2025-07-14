/**
 * User Settings Management System
 *
 * Provides comprehensive user settings functionality including:
 * - Notification preferences (ON/OFF control)
 * - Theme settings
 * - Version checking preferences
 * - LocalStorage persistence
 * - Type-safe configuration management
 *
 * @module UserSettings
 */

import { z } from 'zod';

// User Settings Schema Definitions
export const NotificationSettingsSchema = z.object({
  /** Enable/disable auto-update notifications */
  enabled: z.boolean().default(true),
  /** Show notification position */
  position: z.enum(['top', 'bottom']).default('top'),
  /** Animation type for notifications */
  animation: z.enum(['slide', 'fade', 'bounce']).default('slide'),
  /** Auto-hide notifications after milliseconds (0 = never) */
  autoHide: z.number().int().min(0).default(0),
  /** Show version details in notifications */
  showVersionDetails: z.boolean().default(true),
  /** Notification sound (future feature) */
  sound: z.boolean().default(false),
  /** Browser notification settings */
  browser: z
    .object({
      /** Enable native browser notifications */
      enabled: z.boolean().default(false),
      /** Request permission automatically */
      autoRequestPermission: z.boolean().default(false),
      /** Show browser notifications only when page is hidden */
      onlyWhenHidden: z.boolean().default(true),
      /** Maximum concurrent browser notifications */
      maxConcurrent: z.number().int().min(1).max(10).default(3),
    })
    .default({
      enabled: false,
      autoRequestPermission: false,
      onlyWhenHidden: true,
      maxConcurrent: 3,
    }),
});

export const VersionCheckSettingsSchema = z.object({
  /** Enable/disable automatic version checking */
  enabled: z.boolean().default(true),
  /** Check interval in milliseconds */
  interval: z.number().int().min(5000).max(3600000).default(30000),
  /** Check only when page is visible */
  checkOnlyWhenVisible: z.boolean().default(true),
  /** Maximum retry attempts */
  maxRetries: z.number().int().min(0).max(10).default(3),
});

export const UISettingsSchema = z.object({
  /** Theme preference */
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  /** Enable animations */
  animations: z.boolean().default(true),
  /** Compact mode */
  compactMode: z.boolean().default(false),
  /** Language preference */
  language: z.enum(['en', 'ja']).default('ja'),
});

export const PrivacySettingsSchema = z.object({
  /** Analytics enabled */
  analytics: z.boolean().default(true),
  /** Error reporting */
  errorReporting: z.boolean().default(true),
  /** Usage statistics */
  usageStats: z.boolean().default(false),
});

export const PWASettingsSchema = z.object({
  /** Enable PWA functionality */
  enabled: z.boolean().default(true),
  /** Enable offline mode */
  offlineMode: z.boolean().default(true),
  /** Auto-update Service Worker */
  autoUpdate: z.boolean().default(true),
  /** Auto-reload page when version update detected */
  autoReload: z.boolean().default(false),
  /** Auto-reload delay in milliseconds */
  autoReloadDelay: z.number().int().min(0).max(30000).default(5000),
  /** Cache invalidation strategy */
  cacheStrategy: z.enum(['immediate', 'background', 'user-consent']).default('background'),
  /** Background sync enabled */
  backgroundSync: z.boolean().default(false),
  /** Push notifications enabled */
  pushNotifications: z.boolean().default(false),
  /** Service Worker debug mode */
  debugMode: z.boolean().default(false),
});

export const UserSettingsSchema = z.object({
  /** Notification preferences */
  notifications: NotificationSettingsSchema,
  /** Version checking preferences */
  versionCheck: VersionCheckSettingsSchema,
  /** UI preferences */
  ui: UISettingsSchema,
  /** Privacy preferences */
  privacy: PrivacySettingsSchema,
  /** PWA preferences */
  pwa: PWASettingsSchema,
  /** Settings version for migration */
  version: z.string().default('1.0.0'),
  /** Last updated timestamp */
  updatedAt: z.number().int().positive().default(Date.now),
});

// Infer TypeScript types
export type NotificationSettings = z.infer<typeof NotificationSettingsSchema>;
export type VersionCheckSettings = z.infer<typeof VersionCheckSettingsSchema>;
export type UISettings = z.infer<typeof UISettingsSchema>;
export type PrivacySettings = z.infer<typeof PrivacySettingsSchema>;
export type PWASettings = z.infer<typeof PWASettingsSchema>;
export type UserSettings = z.infer<typeof UserSettingsSchema>;

// Settings Constants
export const SETTINGS_CONSTANTS = {
  STORAGE_KEY: 'beaver_user_settings',
  VERSION: '1.0.0',
  EVENTS: {
    SETTINGS_CHANGED: 'settings:changed',
    NOTIFICATIONS_TOGGLED: 'settings:notifications-toggled',
    THEME_CHANGED: 'settings:theme-changed',
    VERSION_CHECK_TOGGLED: 'settings:version-check-toggled',
    PWA_TOGGLED: 'settings:pwa-toggled',
    PWA_CACHE_STRATEGY_CHANGED: 'settings:pwa-cache-strategy-changed',
    PWA_AUTO_RELOAD_TOGGLED: 'settings:pwa-auto-reload-toggled',
  } as const,
  DEFAULTS: {
    notifications: {
      enabled: true,
      position: 'top' as const,
      animation: 'slide' as const,
      autoHide: 0,
      showVersionDetails: true,
      sound: false,
      browser: {
        enabled: false,
        autoRequestPermission: false,
        onlyWhenHidden: true,
        maxConcurrent: 3,
      },
    },
    versionCheck: {
      enabled: true,
      interval: 30000,
      checkOnlyWhenVisible: true,
      maxRetries: 3,
    },
    ui: {
      theme: 'system' as const,
      animations: true,
      compactMode: false,
      language: 'ja' as const,
    },
    privacy: {
      analytics: true,
      errorReporting: true,
      usageStats: false,
    },
    pwa: {
      enabled: true,
      offlineMode: true,
      autoUpdate: true,
      autoReload: false,
      autoReloadDelay: 5000,
      cacheStrategy: 'background' as const,
      backgroundSync: false,
      pushNotifications: false,
      debugMode: false,
    },
  } as const,
} as const;

/**
 * User Settings Manager Class
 *
 * Manages user preferences with automatic persistence and event dispatching
 */
export class UserSettingsManager {
  private settings: UserSettings;
  private eventTarget: EventTarget;

  constructor() {
    this.eventTarget = new EventTarget();
    this.settings = this.loadSettings();
  }

  /**
   * Get current settings (read-only)
   */
  public getSettings(): Readonly<UserSettings> {
    return { ...this.settings };
  }

  /**
   * Get specific setting section
   */
  public getNotificationSettings(): Readonly<NotificationSettings> {
    return { ...this.settings.notifications };
  }

  public getVersionCheckSettings(): Readonly<VersionCheckSettings> {
    return { ...this.settings.versionCheck };
  }

  public getUISettings(): Readonly<UISettings> {
    return { ...this.settings.ui };
  }

  public getPrivacySettings(): Readonly<PrivacySettings> {
    return { ...this.settings.privacy };
  }

  public getPWASettings(): Readonly<PWASettings> {
    return { ...this.settings.pwa };
  }

  /**
   * Update notification settings
   */
  public updateNotificationSettings(updates: Partial<NotificationSettings>): void {
    const oldEnabled = this.settings.notifications.enabled;

    this.settings.notifications = {
      ...this.settings.notifications,
      ...updates,
    };

    this.settings.updatedAt = Date.now();
    this.saveSettings();

    this.dispatchEvent(SETTINGS_CONSTANTS.EVENTS.SETTINGS_CHANGED, {
      section: 'notifications',
      updates,
      settings: this.settings.notifications,
    });

    // Dispatch specific event if enabled status changed
    if (oldEnabled !== this.settings.notifications.enabled) {
      this.dispatchEvent(SETTINGS_CONSTANTS.EVENTS.NOTIFICATIONS_TOGGLED, {
        enabled: this.settings.notifications.enabled,
      });
    }
  }

  /**
   * Update version check settings
   */
  public updateVersionCheckSettings(updates: Partial<VersionCheckSettings>): void {
    const oldEnabled = this.settings.versionCheck.enabled;

    this.settings.versionCheck = {
      ...this.settings.versionCheck,
      ...updates,
    };

    this.settings.updatedAt = Date.now();
    this.saveSettings();

    this.dispatchEvent(SETTINGS_CONSTANTS.EVENTS.SETTINGS_CHANGED, {
      section: 'versionCheck',
      updates,
      settings: this.settings.versionCheck,
    });

    // Dispatch specific event if enabled status changed
    if (oldEnabled !== this.settings.versionCheck.enabled) {
      this.dispatchEvent(SETTINGS_CONSTANTS.EVENTS.VERSION_CHECK_TOGGLED, {
        enabled: this.settings.versionCheck.enabled,
      });
    }
  }

  /**
   * Update UI settings
   */
  public updateUISettings(updates: Partial<UISettings>): void {
    const oldTheme = this.settings.ui.theme;

    this.settings.ui = {
      ...this.settings.ui,
      ...updates,
    };

    this.settings.updatedAt = Date.now();
    this.saveSettings();

    this.dispatchEvent(SETTINGS_CONSTANTS.EVENTS.SETTINGS_CHANGED, {
      section: 'ui',
      updates,
      settings: this.settings.ui,
    });

    // Dispatch specific event if theme changed
    if (oldTheme !== this.settings.ui.theme) {
      this.dispatchEvent(SETTINGS_CONSTANTS.EVENTS.THEME_CHANGED, {
        theme: this.settings.ui.theme,
        previousTheme: oldTheme,
      });
    }
  }

  /**
   * Update privacy settings
   */
  public updatePrivacySettings(updates: Partial<PrivacySettings>): void {
    this.settings.privacy = {
      ...this.settings.privacy,
      ...updates,
    };

    this.settings.updatedAt = Date.now();
    this.saveSettings();

    this.dispatchEvent(SETTINGS_CONSTANTS.EVENTS.SETTINGS_CHANGED, {
      section: 'privacy',
      updates,
      settings: this.settings.privacy,
    });
  }

  /**
   * Update PWA settings
   */
  public updatePWASettings(updates: Partial<PWASettings>): void {
    const oldEnabled = this.settings.pwa.enabled;
    const oldCacheStrategy = this.settings.pwa.cacheStrategy;
    const oldAutoReload = this.settings.pwa.autoReload;

    if (this.settings.pwa.debugMode) {
      console.log('🔧 updatePWASettings called:', {
        updates,
        oldAutoReload,
        currentPWA: this.settings.pwa,
        updateKeys: Object.keys(updates),
        updateValues: Object.values(updates),
      });
    }

    // Ensure we have a pwa object
    if (!this.settings.pwa) {
      console.warn('⚠️ PWA settings object missing, creating default');
      this.settings.pwa = { ...SETTINGS_CONSTANTS.DEFAULTS.pwa };
    }

    if (this.settings.pwa.debugMode) {
      console.log('🔧 Before merge:', {
        existingPWA: this.settings.pwa,
        updateData: updates,
      });
    }

    this.settings.pwa = {
      ...this.settings.pwa,
      ...updates,
    };

    this.settings.updatedAt = Date.now();

    if (this.settings.pwa.debugMode) {
      console.log('🔧 PWA settings after update:', {
        newAutoReload: this.settings.pwa.autoReload,
        newAutoReloadDelay: this.settings.pwa.autoReloadDelay,
        allPWASettings: this.settings.pwa,
        settingsTimestamp: this.settings.updatedAt,
      });
    }

    this.saveSettings();

    this.dispatchEvent(SETTINGS_CONSTANTS.EVENTS.SETTINGS_CHANGED, {
      section: 'pwa',
      updates,
      settings: this.settings.pwa,
    });

    // Dispatch specific events for important changes
    if (oldEnabled !== this.settings.pwa.enabled) {
      this.dispatchEvent(SETTINGS_CONSTANTS.EVENTS.PWA_TOGGLED, {
        enabled: this.settings.pwa.enabled,
      });
    }

    if (oldCacheStrategy !== this.settings.pwa.cacheStrategy) {
      this.dispatchEvent(SETTINGS_CONSTANTS.EVENTS.PWA_CACHE_STRATEGY_CHANGED, {
        cacheStrategy: this.settings.pwa.cacheStrategy,
        previousStrategy: oldCacheStrategy,
      });
    }

    if (oldAutoReload !== this.settings.pwa.autoReload) {
      this.dispatchEvent(SETTINGS_CONSTANTS.EVENTS.PWA_AUTO_RELOAD_TOGGLED, {
        enabled: this.settings.pwa.autoReload,
        delay: this.settings.pwa.autoReloadDelay,
      });
    }

    // Notify PWA system about settings changes
    this.notifyPWASystem(updates);
  }

  /**
   * Toggle notification enabled state
   */
  public toggleNotifications(): boolean {
    const newEnabled = !this.settings.notifications.enabled;
    this.updateNotificationSettings({ enabled: newEnabled });
    return newEnabled;
  }

  /**
   * Toggle version checking enabled state
   */
  public toggleVersionCheck(): boolean {
    const newEnabled = !this.settings.versionCheck.enabled;
    this.updateVersionCheckSettings({ enabled: newEnabled });
    return newEnabled;
  }

  /**
   * Toggle PWA auto-reload enabled state
   */
  public togglePWAAutoReload(): boolean {
    const newEnabled = !this.settings.pwa.autoReload;
    this.updatePWASettings({ autoReload: newEnabled });
    return newEnabled;
  }

  /**
   * Set PWA auto-reload delay
   */
  public setPWAAutoReloadDelay(delay: number): void {
    this.updatePWASettings({ autoReloadDelay: delay });
  }

  /**
   * Set theme
   */
  public setTheme(theme: UISettings['theme']): void {
    this.updateUISettings({ theme });
  }

  /**
   * Toggle PWA enabled state
   */
  public togglePWA(): boolean {
    const newEnabled = !this.settings.pwa.enabled;
    this.updatePWASettings({ enabled: newEnabled });
    return newEnabled;
  }

  /**
   * Set PWA cache strategy
   */
  public setPWACacheStrategy(strategy: PWASettings['cacheStrategy']): void {
    this.updatePWASettings({ cacheStrategy: strategy });
  }

  /**
   * Reset all settings to defaults
   */
  public resetToDefaults(): void {
    this.settings = this.createDefaultSettings();
    this.saveSettings();

    this.dispatchEvent(SETTINGS_CONSTANTS.EVENTS.SETTINGS_CHANGED, {
      section: 'all',
      updates: this.settings,
      settings: this.settings,
    });
  }

  /**
   * Reset specific setting section
   */
  public resetSection(
    section: keyof Pick<UserSettings, 'notifications' | 'versionCheck' | 'ui' | 'privacy' | 'pwa'>
  ): void {
    switch (section) {
      case 'notifications':
        this.updateNotificationSettings(SETTINGS_CONSTANTS.DEFAULTS.notifications);
        break;
      case 'versionCheck':
        this.updateVersionCheckSettings(SETTINGS_CONSTANTS.DEFAULTS.versionCheck);
        break;
      case 'ui':
        this.updateUISettings(SETTINGS_CONSTANTS.DEFAULTS.ui);
        break;
      case 'privacy':
        this.updatePrivacySettings(SETTINGS_CONSTANTS.DEFAULTS.privacy);
        break;
      case 'pwa':
        this.updatePWASettings(SETTINGS_CONSTANTS.DEFAULTS.pwa);
        break;
    }
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): UserSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_CONSTANTS.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);

        // Try to migrate first, even if validation fails
        const migratedData = this.migrateSettings(data);
        const validationResult = UserSettingsSchema.safeParse(migratedData);

        if (validationResult.success) {
          return validationResult.data;
        } else {
          console.warn(
            'Settings validation failed after migration, clearing localStorage and using defaults:',
            validationResult.error
          );
          // Clear corrupted settings
          this.clearCorruptedSettings();
        }
      }
    } catch (error) {
      console.warn('Failed to load user settings, clearing localStorage:', error);
      // Clear corrupted settings
      this.clearCorruptedSettings();
    }

    return this.createDefaultSettings();
  }

  /**
   * Clear corrupted settings from localStorage
   */
  private clearCorruptedSettings(): void {
    try {
      localStorage.removeItem(SETTINGS_CONSTANTS.STORAGE_KEY);
      // Also clear any other potentially corrupted beaver settings
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('beaver_')) {
          localStorage.removeItem(key);
        }
      });
      console.log('🧹 Cleared corrupted settings from localStorage');
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    try {
      const settingsJson = JSON.stringify(this.settings);
      console.log('💾 Saving settings to localStorage:', {
        key: SETTINGS_CONSTANTS.STORAGE_KEY,
        autoReload: this.settings.pwa?.autoReload,
        autoReloadDelay: this.settings.pwa?.autoReloadDelay,
        fullPWASettings: this.settings.pwa,
      });
      localStorage.setItem(SETTINGS_CONSTANTS.STORAGE_KEY, settingsJson);

      // Verify save immediately
      const savedSettings = localStorage.getItem(SETTINGS_CONSTANTS.STORAGE_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        console.log('✅ Settings saved and verified:', {
          autoReloadInStorage: parsed.pwa?.autoReload,
          autoReloadDelayInStorage: parsed.pwa?.autoReloadDelay,
        });
      } else {
        console.error('❌ Settings not found in localStorage after save');
      }
    } catch (error) {
      console.warn('Failed to save user settings:', error);
    }
  }

  /**
   * Create default settings
   */
  private createDefaultSettings(): UserSettings {
    return {
      notifications: { ...SETTINGS_CONSTANTS.DEFAULTS.notifications },
      versionCheck: { ...SETTINGS_CONSTANTS.DEFAULTS.versionCheck },
      ui: { ...SETTINGS_CONSTANTS.DEFAULTS.ui },
      privacy: { ...SETTINGS_CONSTANTS.DEFAULTS.privacy },
      pwa: { ...SETTINGS_CONSTANTS.DEFAULTS.pwa },
      version: SETTINGS_CONSTANTS.VERSION,
      updatedAt: Date.now(),
    };
  }

  /**
   * Migrate settings from older versions
   */
  private migrateSettings(oldSettings: any): UserSettings {
    try {
      // Start with defaults and merge existing valid settings
      const defaults = this.createDefaultSettings();

      // Safely merge notifications settings
      const notifications = {
        ...defaults.notifications,
        ...(oldSettings.notifications || {}),
        // Ensure browser settings exist with defaults
        browser: {
          ...defaults.notifications.browser,
          ...(oldSettings.notifications?.browser || {}),
        },
      };

      // Safely merge other settings
      const versionCheck = {
        ...defaults.versionCheck,
        ...(oldSettings.versionCheck || {}),
      };

      const ui = {
        ...defaults.ui,
        ...(oldSettings.ui || {}),
      };

      const privacy = {
        ...defaults.privacy,
        ...(oldSettings.privacy || {}),
      };

      const pwa = {
        ...defaults.pwa,
        ...(oldSettings.pwa || {}),
      };

      const migrated = {
        notifications,
        versionCheck,
        ui,
        privacy,
        pwa,
        version: SETTINGS_CONSTANTS.VERSION,
        updatedAt: Date.now(),
      };

      const currentVersion = oldSettings.version || 'unknown';
      console.log(`Settings migrated from ${currentVersion} to ${SETTINGS_CONSTANTS.VERSION}`);

      return migrated;
    } catch (error) {
      console.warn('Migration failed, using defaults:', error);
      return this.createDefaultSettings();
    }
  }

  /**
   * Dispatch custom events
   */
  private dispatchEvent(type: string, detail: any): void {
    const event = new CustomEvent(type, { detail });
    this.eventTarget.dispatchEvent(event);

    // Also dispatch to global document for component listening
    if (typeof document !== 'undefined') {
      document.dispatchEvent(event);
    }
  }

  /**
   * Add event listener for settings changes
   */
  public addEventListener(type: string, listener: EventListener): void {
    this.eventTarget.addEventListener(type, listener);
  }

  /**
   * Remove event listener
   */
  public removeEventListener(type: string, listener: EventListener): void {
    this.eventTarget.removeEventListener(type, listener);
  }

  /**
   * Export settings for backup
   */
  public exportSettings(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  /**
   * Import settings from backup
   */
  public importSettings(settingsJson: string): boolean {
    try {
      const data = JSON.parse(settingsJson);
      const validationResult = UserSettingsSchema.safeParse(data);

      if (validationResult.success) {
        this.settings = validationResult.data;
        this.settings.updatedAt = Date.now();
        this.saveSettings();

        this.dispatchEvent(SETTINGS_CONSTANTS.EVENTS.SETTINGS_CHANGED, {
          section: 'all',
          updates: this.settings,
          settings: this.settings,
        });

        return true;
      } else {
        console.error('Invalid settings format:', validationResult.error);
        return false;
      }
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  }

  /**
   * Notify PWA system about settings changes
   */
  private notifyPWASystem(updates: Partial<PWASettings>): void {
    try {
      // Notify Service Worker if available
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'PWA_SETTINGS_UPDATE',
          settings: updates,
          timestamp: Date.now(),
        });
      }

      // Notify PWA version checker if available
      const windowWithPWA = window as any;
      if (windowWithPWA.beaverSystems?.pwaVersionChecker) {
        const pwaVersionChecker = windowWithPWA.beaverSystems.pwaVersionChecker;
        if (typeof pwaVersionChecker.updatePWAConfig === 'function') {
          pwaVersionChecker.updatePWAConfig({
            serviceWorkerEnabled: updates.enabled,
            cacheInvalidationStrategy: updates.cacheStrategy,
            forceSwUpdateOnVersionChange: updates.autoUpdate,
          });
        }
      }
    } catch (error) {
      console.warn('Failed to notify PWA system about settings changes:', error);
    }
  }
}

/**
 * Singleton instance management
 */
let globalSettingsManager: UserSettingsManager | null = null;

export function createSettingsManager(): UserSettingsManager {
  if (!globalSettingsManager) {
    try {
      globalSettingsManager = new UserSettingsManager();
    } catch (error) {
      console.error('Failed to create UserSettingsManager, attempting emergency reset:', error);

      // Emergency reset: clear all localStorage and try again
      try {
        if (typeof localStorage !== 'undefined') {
          const keys = Object.keys(localStorage);
          keys.forEach(key => {
            if (key.startsWith('beaver_')) {
              localStorage.removeItem(key);
            }
          });
          console.log('🚨 Emergency localStorage reset completed');
        }

        // Try creating manager again after reset
        globalSettingsManager = new UserSettingsManager();
        console.log('✅ UserSettingsManager created successfully after reset');
      } catch (emergencyError) {
        console.error('Emergency reset failed, creating minimal fallback manager:', emergencyError);

        // Create minimal fallback implementation
        globalSettingsManager = createFallbackSettingsManager();
      }
    }
  }
  return globalSettingsManager;
}

/**
 * Create fallback settings manager when all else fails
 */
function createFallbackSettingsManager(): UserSettingsManager {
  // Create a new class instance with minimal functionality
  const fallbackManager = Object.create(UserSettingsManager.prototype);

  // Initialize with safe defaults
  fallbackManager.settings = {
    notifications: {
      enabled: true,
      position: 'top',
      animation: 'slide',
      autoHide: 0,
      showVersionDetails: true,
      sound: false,
      browser: {
        enabled: false,
        autoRequestPermission: false,
        onlyWhenHidden: true,
        maxConcurrent: 3,
      },
    },
    versionCheck: {
      enabled: true,
      interval: 30000,
      checkOnlyWhenVisible: true,
      maxRetries: 3,
    },
    ui: {
      theme: 'system',
      animations: true,
      compactMode: false,
      language: 'ja',
    },
    privacy: {
      analytics: true,
      errorReporting: true,
      usageStats: false,
    },
    pwa: {
      enabled: true,
      offlineMode: true,
      autoUpdate: true,
      cacheStrategy: 'background',
      backgroundSync: false,
      pushNotifications: false,
      debugMode: false,
    },
    version: '1.0.0',
    updatedAt: Date.now(),
  };

  fallbackManager.eventTarget = new EventTarget();

  // Override methods to be safe
  fallbackManager.getSettings = function () {
    return { ...this.settings };
  };

  fallbackManager.saveSettings = function () {
    // Do nothing to avoid localStorage errors
  };

  console.log('🛡️ Fallback settings manager created');
  return fallbackManager;
}

export function getSettingsManager(): UserSettingsManager | null {
  return globalSettingsManager;
}

export function destroySettingsManager(): void {
  globalSettingsManager = null;
}

// Export default instance creation function
export default createSettingsManager;

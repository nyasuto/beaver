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

export const UserSettingsSchema = z.object({
  /** Notification preferences */
  notifications: NotificationSettingsSchema,
  /** Version checking preferences */
  versionCheck: VersionCheckSettingsSchema,
  /** UI preferences */
  ui: UISettingsSchema,
  /** Privacy preferences */
  privacy: PrivacySettingsSchema,
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
   * Set theme
   */
  public setTheme(theme: UISettings['theme']): void {
    this.updateUISettings({ theme });
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
    section: keyof Pick<UserSettings, 'notifications' | 'versionCheck' | 'ui' | 'privacy'>
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
        const validationResult = UserSettingsSchema.safeParse(data);

        if (validationResult.success) {
          // Check if settings need migration
          const settings = validationResult.data;
          if (settings.version !== SETTINGS_CONSTANTS.VERSION) {
            return this.migrateSettings(settings);
          }
          return settings;
        } else {
          console.warn('Invalid settings format, using defaults:', validationResult.error);
        }
      }
    } catch (error) {
      console.warn('Failed to load user settings:', error);
    }

    return this.createDefaultSettings();
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    try {
      localStorage.setItem(SETTINGS_CONSTANTS.STORAGE_KEY, JSON.stringify(this.settings));
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
      version: SETTINGS_CONSTANTS.VERSION,
      updatedAt: Date.now(),
    };
  }

  /**
   * Migrate settings from older versions
   */
  private migrateSettings(oldSettings: UserSettings): UserSettings {
    // For now, just update to current version and fill missing fields
    const migrated = UserSettingsSchema.parse({
      ...this.createDefaultSettings(),
      ...oldSettings,
      version: SETTINGS_CONSTANTS.VERSION,
      updatedAt: Date.now(),
    });

    console.log(`Settings migrated from ${oldSettings.version} to ${SETTINGS_CONSTANTS.VERSION}`);
    return migrated;
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
}

/**
 * Singleton instance management
 */
let globalSettingsManager: UserSettingsManager | null = null;

export function createSettingsManager(): UserSettingsManager {
  if (!globalSettingsManager) {
    globalSettingsManager = new UserSettingsManager();
  }
  return globalSettingsManager;
}

export function getSettingsManager(): UserSettingsManager | null {
  return globalSettingsManager;
}

export function destroySettingsManager(): void {
  globalSettingsManager = null;
}

// Export default instance creation function
export default createSettingsManager;

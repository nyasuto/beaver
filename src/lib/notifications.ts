/**
 * Browser Notifications Module
 *
 * Provides native browser notification functionality that integrates with
 * the existing user settings system. Supports permission management,
 * fallback handling, and seamless integration with in-page notifications.
 *
 * @module BrowserNotifications
 */

import { z } from 'zod';

// Browser notification schemas
export const BrowserNotificationOptionsSchema = z.object({
  /** Notification title */
  title: z.string().min(1),
  /** Notification body text */
  body: z.string().optional(),
  /** Notification icon URL */
  icon: z.string().optional(),
  /** Notification badge URL */
  badge: z.string().optional(),
  /** Notification tag for grouping */
  tag: z.string().optional(),
  /** Whether to require user interaction to dismiss */
  requireInteraction: z.boolean().default(false),
  /** Auto-close after milliseconds (0 = never) */
  autoClose: z.number().int().min(0).default(0),
  /** Custom data to attach to notification */
  data: z.record(z.string(), z.any()).optional(),
  /** Actions to show on notification */
  actions: z
    .array(
      z.object({
        action: z.string(),
        title: z.string(),
        icon: z.string().optional(),
      })
    )
    .optional(),
});

export const BrowserNotificationConfigSchema = z.object({
  /** Enable browser notifications */
  enabled: z.boolean().default(false),
  /** Request permission automatically */
  autoRequestPermission: z.boolean().default(false),
  /** Default icon for notifications */
  defaultIcon: z.string().optional(),
  /** Default badge for notifications */
  defaultBadge: z.string().optional(),
  /** Maximum number of concurrent notifications */
  maxConcurrent: z.number().int().min(1).max(10).default(3),
  /** Show browser notifications only when page is hidden */
  onlyWhenHidden: z.boolean().default(true),
});

export const NotificationPermissionStateSchema = z.enum(['default', 'granted', 'denied']);

// Infer TypeScript types
export type BrowserNotificationOptions = z.infer<typeof BrowserNotificationOptionsSchema>;
export type BrowserNotificationConfig = z.infer<typeof BrowserNotificationConfigSchema>;
export type NotificationPermissionState = z.infer<typeof NotificationPermissionStateSchema>;

// Constants
export const BROWSER_NOTIFICATION_CONSTANTS = {
  STORAGE_KEY: 'beaver_browser_notifications_config',
  DEFAULT_ICON: '/beaver/favicon.png',
  DEFAULT_BADGE: '/beaver/favicon.png',
  EVENTS: {
    PERMISSION_CHANGED: 'browserNotification:permission-changed',
    NOTIFICATION_SHOWN: 'browserNotification:shown',
    NOTIFICATION_CLICKED: 'browserNotification:clicked',
    NOTIFICATION_CLOSED: 'browserNotification:closed',
    NOTIFICATION_ERROR: 'browserNotification:error',
  } as const,
  FALLBACK_METHODS: {
    IN_PAGE: 'in-page',
    CONSOLE: 'console',
    NONE: 'none',
  } as const,
} as const;

/**
 * Browser Notification Manager Class
 *
 * Manages native browser notifications with permission handling,
 * fallback support, and integration with user settings.
 */
export class BrowserNotificationManager {
  private config: BrowserNotificationConfig;
  private eventTarget: EventTarget;
  private activeNotifications: Map<string, Notification> = new Map();
  private isSupported: boolean;

  constructor(config: Partial<BrowserNotificationConfig> = {}) {
    this.eventTarget = new EventTarget();
    this.isSupported = this.checkBrowserSupport();

    // Debug logging for configuration
    const mergedConfig = {
      ...this.getDefaultConfig(),
      ...config,
    };
    console.log('🔍 BrowserNotificationManager config debug:', {
      inputConfig: config,
      defaultConfig: this.getDefaultConfig(),
      mergedConfig,
    });

    try {
      this.config = BrowserNotificationConfigSchema.parse(mergedConfig);
    } catch (error) {
      console.error('❌ BrowserNotificationConfigSchema validation failed:', error);
      console.error('📊 Failed config object:', mergedConfig);
      throw error;
    }

    // Load saved configuration
    this.loadConfig();

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Check if browser supports notifications
   */
  private checkBrowserSupport(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): BrowserNotificationConfig {
    return {
      enabled: false,
      autoRequestPermission: false,
      defaultIcon: BROWSER_NOTIFICATION_CONSTANTS.DEFAULT_ICON,
      defaultBadge: BROWSER_NOTIFICATION_CONSTANTS.DEFAULT_BADGE,
      maxConcurrent: 3,
      onlyWhenHidden: true,
    };
  }

  /**
   * Load configuration from localStorage
   */
  private loadConfig(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const stored = localStorage.getItem(BROWSER_NOTIFICATION_CONSTANTS.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        const validationResult = BrowserNotificationConfigSchema.safeParse(data);
        if (validationResult.success) {
          this.config = { ...this.config, ...validationResult.data };
        }
      }
    } catch (error) {
      console.warn('Failed to load browser notification config:', error);
    }
  }

  /**
   * Save configuration to localStorage
   */
  private saveConfig(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      localStorage.setItem(BROWSER_NOTIFICATION_CONSTANTS.STORAGE_KEY, JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save browser notification config:', error);
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for permission changes
    if (this.isSupported && 'permissions' in navigator) {
      navigator.permissions
        .query({ name: 'notifications' as PermissionName })
        .then(permissionStatus => {
          permissionStatus.addEventListener('change', () => {
            this.dispatchEvent(BROWSER_NOTIFICATION_CONSTANTS.EVENTS.PERMISSION_CHANGED, {
              permission: Notification.permission,
            });
          });
        })
        .catch(() => {
          // Permissions API not fully supported, ignore
        });
    }

    // Listen for page visibility changes
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          // Close all active notifications when page becomes visible
          if (this.config.onlyWhenHidden) {
            this.closeAll();
          }
        }
      });
    }
  }

  /**
   * Get current permission state
   */
  public getPermissionState(): NotificationPermissionState {
    if (!this.isSupported) return 'denied';
    return Notification.permission as NotificationPermissionState;
  }

  /**
   * Request notification permission
   */
  public async requestPermission(): Promise<NotificationPermissionState> {
    if (!this.isSupported) {
      console.warn('Browser notifications are not supported');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      this.dispatchEvent(BROWSER_NOTIFICATION_CONSTANTS.EVENTS.PERMISSION_CHANGED, {
        permission,
      });
      return permission as NotificationPermissionState;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return 'denied';
    }
  }

  /**
   * Check if notifications can be shown
   */
  private canShowNotification(): { allowed: boolean; reason?: string } {
    if (!this.config.enabled) {
      return { allowed: false, reason: 'Browser notifications disabled in settings' };
    }

    if (!this.isSupported) {
      return { allowed: false, reason: 'Browser does not support notifications' };
    }

    if (Notification.permission !== 'granted') {
      return { allowed: false, reason: 'Notification permission not granted' };
    }

    if (this.config.onlyWhenHidden && !document.hidden) {
      return { allowed: false, reason: 'Page is visible and onlyWhenHidden is enabled' };
    }

    if (this.activeNotifications.size >= this.config.maxConcurrent) {
      return { allowed: false, reason: 'Maximum concurrent notifications reached' };
    }

    return { allowed: true };
  }

  /**
   * Show a browser notification
   */
  public async show(options: BrowserNotificationOptions): Promise<{
    success: boolean;
    notification?: Notification;
    fallback?: string;
    error?: string;
  }> {
    try {
      // Validate options
      const validatedOptions = BrowserNotificationOptionsSchema.parse(options);

      // Check if notification can be shown
      const canShow = this.canShowNotification();
      if (!canShow.allowed) {
        return this.handleFallback(validatedOptions, canShow.reason);
      }

      // Create notification options
      const notificationOptions: NotificationOptions = {
        body: validatedOptions.body,
        icon: validatedOptions.icon || this.config.defaultIcon,
        badge: validatedOptions.badge || this.config.defaultBadge,
        tag: validatedOptions.tag,
        requireInteraction: validatedOptions.requireInteraction,
        data: validatedOptions.data,
      };

      // Create and show notification
      const notification = new Notification(validatedOptions.title, notificationOptions);

      // Generate unique ID for tracking
      const notificationId = validatedOptions.tag || `notification-${Date.now()}-${Math.random()}`;

      // Store active notification
      this.activeNotifications.set(notificationId, notification);

      // Set up event handlers
      notification.addEventListener('show', () => {
        this.dispatchEvent(BROWSER_NOTIFICATION_CONSTANTS.EVENTS.NOTIFICATION_SHOWN, {
          id: notificationId,
          title: validatedOptions.title,
          options: validatedOptions,
        });
      });

      notification.addEventListener('click', () => {
        this.dispatchEvent(BROWSER_NOTIFICATION_CONSTANTS.EVENTS.NOTIFICATION_CLICKED, {
          id: notificationId,
          title: validatedOptions.title,
          data: validatedOptions.data,
        });

        // Focus window when notification is clicked
        if (typeof window !== 'undefined') {
          window.focus();
        }

        // Close notification after click
        notification.close();
      });

      notification.addEventListener('close', () => {
        this.activeNotifications.delete(notificationId);
        this.dispatchEvent(BROWSER_NOTIFICATION_CONSTANTS.EVENTS.NOTIFICATION_CLOSED, {
          id: notificationId,
          title: validatedOptions.title,
        });
      });

      notification.addEventListener('error', event => {
        this.activeNotifications.delete(notificationId);
        this.dispatchEvent(BROWSER_NOTIFICATION_CONSTANTS.EVENTS.NOTIFICATION_ERROR, {
          id: notificationId,
          title: validatedOptions.title,
          error: event,
        });
      });

      // Auto-close if configured
      if (validatedOptions.autoClose > 0) {
        setTimeout(() => {
          if (this.activeNotifications.has(notificationId)) {
            notification.close();
          }
        }, validatedOptions.autoClose);
      }

      return { success: true, notification };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to show browser notification:', error);
      return this.handleFallback(options, errorMessage);
    }
  }

  /**
   * Handle fallback when browser notification cannot be shown
   */
  private handleFallback(
    options: BrowserNotificationOptions,
    reason?: string
  ): { success: boolean; fallback: string; error?: string } {
    console.warn('Browser notification fallback triggered:', reason);

    // Try to dispatch custom event for in-page notification fallback
    if (typeof document !== 'undefined') {
      const fallbackEvent = new CustomEvent('browserNotification:fallback', {
        detail: {
          options,
          reason,
          timestamp: Date.now(),
        },
      });
      document.dispatchEvent(fallbackEvent);
      return {
        success: false,
        fallback: BROWSER_NOTIFICATION_CONSTANTS.FALLBACK_METHODS.IN_PAGE,
        error: reason,
      };
    }

    // Console fallback
    console.info(`📢 Notification: ${options.title}${options.body ? ` - ${options.body}` : ''}`);
    return {
      success: false,
      fallback: BROWSER_NOTIFICATION_CONSTANTS.FALLBACK_METHODS.CONSOLE,
      error: reason,
    };
  }

  /**
   * Close a specific notification
   */
  public close(notificationId: string): boolean {
    const notification = this.activeNotifications.get(notificationId);
    if (notification) {
      notification.close();
      return true;
    }
    return false;
  }

  /**
   * Close all active notifications
   */
  public closeAll(): number {
    const count = this.activeNotifications.size;
    this.activeNotifications.forEach(notification => notification.close());
    this.activeNotifications.clear();
    return count;
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<BrowserNotificationConfig>): void {
    this.config = BrowserNotificationConfigSchema.parse({
      ...this.config,
      ...newConfig,
    });
    this.saveConfig();

    // If notifications were disabled, close all active ones
    if (!this.config.enabled) {
      this.closeAll();
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): Readonly<BrowserNotificationConfig> {
    return { ...this.config };
  }

  /**
   * Get browser support information
   */
  public getSupportInfo(): {
    supported: boolean;
    permission: NotificationPermissionState;
    maxActions: number;
    features: {
      actions: boolean;
      badge: boolean;
      image: boolean;
      renotify: boolean;
      requireInteraction: boolean;
      silent: boolean;
      tag: boolean;
      timestamp: boolean;
    };
  } {
    if (!this.isSupported) {
      return {
        supported: false,
        permission: 'denied',
        maxActions: 0,
        features: {
          actions: false,
          badge: false,
          image: false,
          renotify: false,
          requireInteraction: false,
          silent: false,
          tag: false,
          timestamp: false,
        },
      };
    }

    // Check feature support
    const testNotification = new Notification('test', { silent: true });
    testNotification.close();

    return {
      supported: true,
      permission: this.getPermissionState(),
      maxActions: (Notification as any).maxActions || 2,
      features: {
        actions: 'actions' in Notification.prototype,
        badge: 'badge' in Notification.prototype,
        image: 'image' in Notification.prototype,
        renotify: 'renotify' in Notification.prototype,
        requireInteraction: 'requireInteraction' in Notification.prototype,
        silent: 'silent' in Notification.prototype,
        tag: 'tag' in Notification.prototype,
        timestamp: 'timestamp' in Notification.prototype,
      },
    };
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
   * Add event listener for notification events
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
   * Destroy the manager and clean up resources
   */
  public destroy(): void {
    this.closeAll();
    this.eventTarget.removeEventListener('change', () => {});
  }
}

/**
 * Utility functions for browser notifications
 */
export const BrowserNotificationUtils = {
  /**
   * Check if browser supports notifications
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  },

  /**
   * Check if notifications are currently allowed
   */
  isAllowed(): boolean {
    return BrowserNotificationUtils.isSupported() && Notification.permission === 'granted';
  },

  /**
   * Check if permission can be requested
   */
  canRequestPermission(): boolean {
    return BrowserNotificationUtils.isSupported() && Notification.permission === 'default';
  },

  /**
   * Create a simple notification
   */
  async showSimple(title: string, body?: string, icon?: string): Promise<boolean> {
    if (!BrowserNotificationUtils.isAllowed()) {
      return false;
    }

    try {
      new Notification(title, { body, icon });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Request permission with user-friendly handling
   */
  async requestPermissionGracefully(): Promise<{
    granted: boolean;
    permission: NotificationPermissionState;
    message?: string;
  }> {
    if (!BrowserNotificationUtils.isSupported()) {
      return {
        granted: false,
        permission: 'denied',
        message: 'このブラウザは通知をサポートしていません',
      };
    }

    if (Notification.permission === 'granted') {
      return {
        granted: true,
        permission: 'granted',
        message: '通知は既に許可されています',
      };
    }

    if (Notification.permission === 'denied') {
      return {
        granted: false,
        permission: 'denied',
        message: '通知がブロックされています。ブラウザの設定から許可してください',
      };
    }

    try {
      const permission = await Notification.requestPermission();
      return {
        granted: permission === 'granted',
        permission: permission as NotificationPermissionState,
        message: permission === 'granted' ? '通知が許可されました' : '通知が拒否されました',
      };
    } catch {
      return {
        granted: false,
        permission: 'denied',
        message: '通知の許可リクエストに失敗しました',
      };
    }
  },
};

/**
 * Singleton instance management
 */
let globalBrowserNotificationManager: BrowserNotificationManager | null = null;

export function createBrowserNotificationManager(
  config?: Partial<BrowserNotificationConfig>
): BrowserNotificationManager {
  if (!globalBrowserNotificationManager) {
    try {
      globalBrowserNotificationManager = new BrowserNotificationManager(config);
    } catch (error) {
      console.error('Failed to create BrowserNotificationManager, using fallback:', error);

      // Create fallback manager that does nothing but doesn't crash
      globalBrowserNotificationManager = createFallbackNotificationManager();
    }
  }
  return globalBrowserNotificationManager;
}

/**
 * Create fallback notification manager when main one fails
 */
function createFallbackNotificationManager(): BrowserNotificationManager {
  const fallbackManager = Object.create(BrowserNotificationManager.prototype);

  // Initialize with safe minimal state
  fallbackManager.isSupported = false;
  fallbackManager.config = {
    enabled: false,
    autoRequestPermission: false,
    defaultIcon: '/beaver/favicon.png',
    defaultBadge: '/beaver/favicon.png',
    maxConcurrent: 3,
    onlyWhenHidden: true,
  };
  fallbackManager.eventTarget = new EventTarget();
  fallbackManager.activeNotifications = new Map();

  // Override methods to be safe no-ops
  fallbackManager.show = async function () {
    console.warn('Fallback notification manager: show() called but disabled');
    return { success: false, fallback: 'disabled', error: 'Fallback manager' };
  };

  fallbackManager.getPermissionState = function () {
    return 'denied';
  };

  fallbackManager.requestPermission = async function () {
    return 'denied';
  };

  fallbackManager.close = function () {
    return false;
  };

  fallbackManager.closeAll = function () {
    return 0;
  };

  fallbackManager.updateConfig = function () {
    // Do nothing
  };

  fallbackManager.getConfig = function () {
    return { ...this.config };
  };

  fallbackManager.getSupportInfo = function () {
    return {
      supported: false,
      permission: 'denied',
      maxActions: 0,
      features: {
        actions: false,
        badge: false,
        image: false,
        renotify: false,
        requireInteraction: false,
        silent: false,
        tag: false,
        timestamp: false,
      },
    };
  };

  fallbackManager.addEventListener = function () {
    // Do nothing
  };

  fallbackManager.removeEventListener = function () {
    // Do nothing
  };

  fallbackManager.destroy = function () {
    // Do nothing
  };

  console.log('🛡️ Fallback notification manager created');
  return fallbackManager;
}

export function getBrowserNotificationManager(): BrowserNotificationManager | null {
  return globalBrowserNotificationManager;
}

export function destroyBrowserNotificationManager(): void {
  if (globalBrowserNotificationManager) {
    globalBrowserNotificationManager.destroy();
    globalBrowserNotificationManager = null;
  }
}

// Export default instance creation function
export default createBrowserNotificationManager;

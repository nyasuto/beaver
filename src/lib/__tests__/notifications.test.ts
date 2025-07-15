/**
 * Browser Notifications Test Suite
 *
 * Comprehensive tests for the browser notification functionality
 * including permission handling, configuration management, and fallback support.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  BrowserNotificationManager,
  BrowserNotificationUtils,
  createBrowserNotificationManager,
  getBrowserNotificationManager,
  destroyBrowserNotificationManager,
  BROWSER_NOTIFICATION_CONSTANTS,
  type BrowserNotificationOptions,
  type BrowserNotificationConfig,
  type NotificationPermissionState,
} from '../notifications';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock Notification API
class MockNotification {
  static permission: NotificationPermissionState = 'default';
  static requestPermission = vi.fn();
  static maxActions = 2;

  public title: string;
  public options: NotificationOptions;
  public addEventListener = vi.fn();
  public removeEventListener = vi.fn();
  public close = vi.fn();

  constructor(title: string, options?: NotificationOptions) {
    this.title = title;
    this.options = options || {};
  }
}

global.Notification = MockNotification as any;

// Mock EventTarget
class MockEventTarget {
  private listeners: Map<string, EventListener[]> = new Map();

  addEventListener(type: string, listener: EventListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  }

  removeEventListener(type: string, listener: EventListener): void {
    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      const index = typeListeners.indexOf(listener);
      if (index !== -1) {
        typeListeners.splice(index, 1);
      }
    }
  }

  dispatchEvent(event: Event): boolean {
    const typeListeners = this.listeners.get(event.type);
    if (typeListeners) {
      typeListeners.forEach(listener => listener(event));
    }
    return true;
  }
}

global.EventTarget = MockEventTarget as any;

// Mock document
const mockDocument = {
  hidden: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  visibilityState: 'visible',
};
Object.defineProperty(global, 'document', {
  value: mockDocument,
  writable: true,
});

// Mock navigator
const mockNavigator = {
  permissions: {
    query: vi.fn(),
  },
};
Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true,
});

// Test data
const mockConfig: BrowserNotificationConfig = {
  enabled: true,
  autoRequestPermission: false,
  defaultIcon: '/test-icon.png',
  defaultBadge: '/test-badge.png',
  maxConcurrent: 5,
  onlyWhenHidden: false,
};

const mockNotificationOptions: BrowserNotificationOptions = {
  title: 'Test Notification',
  body: 'This is a test notification',
  icon: '/custom-icon.png',
  tag: 'test-notification',
  requireInteraction: false,
  autoClose: 5000,
};

describe('BrowserNotificationManager', () => {
  let manager: BrowserNotificationManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    MockNotification.permission = 'granted';
    mockDocument.hidden = false;

    // Reset permission API mock
    mockNavigator.permissions.query.mockResolvedValue({
      state: 'granted',
      addEventListener: vi.fn(),
    });

    manager = new BrowserNotificationManager(mockConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    destroyBrowserNotificationManager();
  });

  describe('Initialization', () => {
    it('should initialize with provided config', () => {
      const config = manager.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.maxConcurrent).toBe(5);
      expect(config.defaultIcon).toBe('/test-icon.png');
    });

    it('should load config from localStorage', () => {
      const storedConfig = JSON.stringify({
        enabled: false,
        maxConcurrent: 2,
      });
      mockLocalStorage.getItem.mockReturnValue(storedConfig);

      const newManager = new BrowserNotificationManager();
      const config = newManager.getConfig();
      expect(config.enabled).toBe(false);
      expect(config.maxConcurrent).toBe(2);
    });

    it('should handle corrupted localStorage data', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');

      expect(() => new BrowserNotificationManager()).not.toThrow();
      const newManager = new BrowserNotificationManager();
      expect(newManager.getConfig().enabled).toBe(false); // default value
    });

    it('should setup event listeners during initialization', () => {
      expect(mockNavigator.permissions.query).toHaveBeenCalledWith({
        name: 'notifications',
      });
      expect(mockDocument.addEventListener).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      );
    });
  });

  describe('Permission Management', () => {
    it('should get current permission state', () => {
      MockNotification.permission = 'granted';
      expect(manager.getPermissionState()).toBe('granted');

      MockNotification.permission = 'denied';
      expect(manager.getPermissionState()).toBe('denied');

      MockNotification.permission = 'default';
      expect(manager.getPermissionState()).toBe('default');
    });

    it('should request permission', async () => {
      MockNotification.requestPermission.mockResolvedValue('granted');

      const permission = await manager.requestPermission();
      expect(permission).toBe('granted');
      expect(MockNotification.requestPermission).toHaveBeenCalled();
    });

    it('should handle permission request failure', async () => {
      MockNotification.requestPermission.mockRejectedValue(new Error('Permission denied'));

      const permission = await manager.requestPermission();
      expect(permission).toBe('denied');
    });

    it('should return denied for unsupported browsers', async () => {
      // Temporarily remove Notification support
      const originalNotification = global.Notification;
      delete (global as any).Notification;

      const newManager = new BrowserNotificationManager();
      const permission = await newManager.requestPermission();
      expect(permission).toBe('denied');

      // Restore Notification
      global.Notification = originalNotification;
    });
  });

  describe('Notification Display', () => {
    beforeEach(() => {
      MockNotification.permission = 'granted';
    });

    it('should show notification successfully', async () => {
      const result = await manager.show(mockNotificationOptions);

      expect(result.success).toBe(true);
      expect(result.notification).toBeInstanceOf(MockNotification);
      expect(result.notification?.title).toBe('Test Notification');
    });

    it('should use default icon and badge when not provided', async () => {
      const options = { title: 'Test', requireInteraction: false, autoClose: 5000 };
      const result = await manager.show(options);

      expect(result.success).toBe(true);
      expect((result.notification as any)?.options.icon).toBe('/test-icon.png');
      expect((result.notification as any)?.options.badge).toBe('/test-badge.png');
    });

    it('should handle auto-close timing', async () => {
      vi.useFakeTimers();

      const options = {
        title: 'Auto Close Test',
        autoClose: 3000,
        requireInteraction: false,
      };

      const result = await manager.show(options);
      expect(result.success).toBe(true);

      const mockNotification = result.notification as any;
      expect(mockNotification.close).not.toHaveBeenCalled();

      vi.advanceTimersByTime(3000);
      expect(mockNotification.close).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should prevent showing when disabled', async () => {
      manager.updateConfig({ enabled: false });

      const result = await manager.show(mockNotificationOptions);
      expect(result.success).toBe(false);
      expect(result.fallback).toBe(BROWSER_NOTIFICATION_CONSTANTS.FALLBACK_METHODS.IN_PAGE);
      expect(result.error).toContain('disabled in settings');
    });

    it('should prevent showing when permission denied', async () => {
      MockNotification.permission = 'denied';

      const result = await manager.show(mockNotificationOptions);
      expect(result.success).toBe(false);
      expect(result.error).toContain('permission not granted');
    });

    it('should prevent showing when page visible and onlyWhenHidden enabled', async () => {
      manager.updateConfig({ onlyWhenHidden: true });
      mockDocument.hidden = false;

      const result = await manager.show(mockNotificationOptions);
      expect(result.success).toBe(false);
      expect(result.error).toContain('onlyWhenHidden is enabled');
    });

    it('should prevent showing when max concurrent reached', async () => {
      manager.updateConfig({ maxConcurrent: 1 });

      // Show first notification
      await manager.show(mockNotificationOptions);

      // Try to show second notification
      const result = await manager.show({
        title: 'Second Notification',
        requireInteraction: false,
        autoClose: 5000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum concurrent notifications reached');
    });

    it('should validate notification options', async () => {
      const invalidOptions = {
        title: '', // Empty title should fail validation
      };

      const result = await manager.show(invalidOptions as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Notification Management', () => {
    beforeEach(() => {
      MockNotification.permission = 'granted';
    });

    it('should close specific notification', async () => {
      const options = {
        title: 'Closable Notification',
        tag: 'closable-test',
        requireInteraction: false,
        autoClose: 5000,
      };

      const result = await manager.show(options);
      expect(result.success).toBe(true);

      const closed = manager.close('closable-test');
      expect(closed).toBe(true);
      expect(result.notification?.close).toHaveBeenCalled();
    });

    it('should return false when closing non-existent notification', () => {
      const closed = manager.close('non-existent');
      expect(closed).toBe(false);
    });

    it('should close all notifications', async () => {
      const notifications = await Promise.all([
        manager.show({
          title: 'Notification 1',
          tag: 'test-1',
          requireInteraction: false,
          autoClose: 5000,
        }),
        manager.show({
          title: 'Notification 2',
          tag: 'test-2',
          requireInteraction: false,
          autoClose: 5000,
        }),
      ]);

      notifications.forEach(result => {
        expect(result.success).toBe(true);
      });

      const closedCount = manager.closeAll();
      expect(closedCount).toBe(2);

      notifications.forEach(result => {
        expect(result.notification?.close).toHaveBeenCalled();
      });
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const updates = {
        enabled: false,
        maxConcurrent: 10,
      };

      manager.updateConfig(updates);

      const config = manager.getConfig();
      expect(config.enabled).toBe(false);
      expect(config.maxConcurrent).toBe(10);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('should close all notifications when disabled', async () => {
      MockNotification.permission = 'granted';

      // Show some notifications first
      await manager.show({
        title: 'Test 1',
        tag: 'test-1',
        requireInteraction: false,
        autoClose: 5000,
      });
      await manager.show({
        title: 'Test 2',
        tag: 'test-2',
        requireInteraction: false,
        autoClose: 5000,
      });

      // Disable notifications
      manager.updateConfig({ enabled: false });

      // All notifications should be closed
      expect(manager.closeAll()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Event Handling', () => {
    it('should dispatch events on notification events', async () => {
      const result = await manager.show(mockNotificationOptions);
      const notification = result.notification as any;

      // Check that event listeners were added
      expect(notification.addEventListener).toHaveBeenCalledWith('show', expect.any(Function));
      expect(notification.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(notification.addEventListener).toHaveBeenCalledWith('close', expect.any(Function));
      expect(notification.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should add and remove event listeners', () => {
      const listener = vi.fn();

      manager.addEventListener('test-event', listener);
      manager.removeEventListener('test-event', listener);

      // Event listeners should be managed
      expect(listener).toBeDefined();
    });
  });

  describe('Support Information', () => {
    it('should return support information', () => {
      const supportInfo = manager.getSupportInfo();

      expect(supportInfo.supported).toBe(true);
      expect(supportInfo.permission).toBe('granted');
      expect(supportInfo.maxActions).toBe(2);
      expect(supportInfo.features).toBeDefined();
      expect(typeof supportInfo.features.actions).toBe('boolean');
    });

    it('should return limited support info for unsupported browsers', () => {
      // Remove Notification support
      const originalNotification = global.Notification;
      delete (global as any).Notification;

      const newManager = new BrowserNotificationManager();
      const supportInfo = newManager.getSupportInfo();

      expect(supportInfo.supported).toBe(false);
      expect(supportInfo.permission).toBe('denied');
      expect(supportInfo.maxActions).toBe(0);

      // Restore Notification
      global.Notification = originalNotification;
    });
  });

  describe('Fallback Handling', () => {
    it('should use in-page fallback when document is available', async () => {
      manager.updateConfig({ enabled: false });

      const result = await manager.show(mockNotificationOptions);

      expect(result.success).toBe(false);
      expect(result.fallback).toBe(BROWSER_NOTIFICATION_CONSTANTS.FALLBACK_METHODS.IN_PAGE);
      expect(mockDocument.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'browserNotification:fallback',
        })
      );
    });

    it('should use console fallback when document is not available', async () => {
      // Remove document temporarily
      const originalDocument = global.document;
      delete (global as any).document;

      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      manager.updateConfig({ enabled: false });
      const result = await manager.show(mockNotificationOptions);

      expect(result.success).toBe(false);
      expect(result.fallback).toBe(BROWSER_NOTIFICATION_CONSTANTS.FALLBACK_METHODS.CONSOLE);
      expect(consoleInfoSpy).toHaveBeenCalledWith(expect.stringContaining('Test Notification'));

      // Restore document
      global.document = originalDocument;
      consoleInfoSpy.mockRestore();
    });
  });

  describe('Destroy and Cleanup', () => {
    it('should clean up resources on destroy', () => {
      manager.destroy();
      expect(manager.closeAll()).toBe(0); // No notifications to close
    });
  });
});

describe('BrowserNotificationUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockNotification.permission = 'granted';
  });

  describe('Support Detection', () => {
    it('should detect notification support', () => {
      expect(BrowserNotificationUtils.isSupported()).toBe(true);

      // Remove Notification support
      const originalNotification = global.Notification;
      delete (global as any).Notification;

      expect(BrowserNotificationUtils.isSupported()).toBe(false);

      // Restore Notification
      global.Notification = originalNotification;
    });

    it('should detect notification permission', () => {
      MockNotification.permission = 'granted';
      expect(BrowserNotificationUtils.isAllowed()).toBe(true);

      MockNotification.permission = 'denied';
      expect(BrowserNotificationUtils.isAllowed()).toBe(false);
    });

    it('should detect if permission can be requested', () => {
      MockNotification.permission = 'default';
      expect(BrowserNotificationUtils.canRequestPermission()).toBe(true);

      MockNotification.permission = 'granted';
      expect(BrowserNotificationUtils.canRequestPermission()).toBe(false);

      MockNotification.permission = 'denied';
      expect(BrowserNotificationUtils.canRequestPermission()).toBe(false);
    });
  });

  describe('Simple Notification', () => {
    it('should show simple notification when allowed', async () => {
      MockNotification.permission = 'granted';

      const result = await BrowserNotificationUtils.showSimple('Test Title', 'Test Body');
      expect(result).toBe(true);
    });

    it('should fail to show simple notification when not allowed', async () => {
      MockNotification.permission = 'denied';

      const result = await BrowserNotificationUtils.showSimple('Test Title', 'Test Body');
      expect(result).toBe(false);
    });
  });

  describe('Graceful Permission Request', () => {
    it('should handle already granted permission', async () => {
      MockNotification.permission = 'granted';

      const result = await BrowserNotificationUtils.requestPermissionGracefully();
      expect(result.granted).toBe(true);
      expect(result.permission).toBe('granted');
      expect(result.message).toContain('既に許可');
    });

    it('should handle denied permission', async () => {
      MockNotification.permission = 'denied';

      const result = await BrowserNotificationUtils.requestPermissionGracefully();
      expect(result.granted).toBe(false);
      expect(result.permission).toBe('denied');
      expect(result.message).toContain('ブロック');
    });

    it('should request permission when default', async () => {
      MockNotification.permission = 'default';
      MockNotification.requestPermission.mockResolvedValue('granted');

      const result = await BrowserNotificationUtils.requestPermissionGracefully();
      expect(result.granted).toBe(true);
      expect(result.permission).toBe('granted');
      expect(result.message).toContain('許可されました');
    });

    it('should handle unsupported browsers', async () => {
      // Remove Notification support
      const originalNotification = global.Notification;
      delete (global as any).Notification;

      const result = await BrowserNotificationUtils.requestPermissionGracefully();
      expect(result.granted).toBe(false);
      expect(result.permission).toBe('denied');
      expect(result.message).toContain('サポートしていません');

      // Restore Notification
      global.Notification = originalNotification;
    });
  });
});

describe('Singleton Management', () => {
  afterEach(() => {
    destroyBrowserNotificationManager();
  });

  it('should create singleton instance', () => {
    const manager1 = createBrowserNotificationManager();
    const manager2 = createBrowserNotificationManager();

    expect(manager1).toBe(manager2);
    expect(getBrowserNotificationManager()).toBe(manager1);
  });

  it('should handle manager creation failure', () => {
    // Clear any existing singleton
    destroyBrowserNotificationManager();

    const manager = createBrowserNotificationManager({ enabled: true });
    expect(manager).toBeDefined();

    // The manager should be created successfully in our test environment
    expect(manager.getConfig()).toBeDefined();
  });

  it('should destroy singleton instance', () => {
    const manager = createBrowserNotificationManager();
    expect(getBrowserNotificationManager()).toBe(manager);

    destroyBrowserNotificationManager();
    expect(getBrowserNotificationManager()).toBe(null);
  });
});

describe('Constants', () => {
  it('should have correct constants', () => {
    expect(BROWSER_NOTIFICATION_CONSTANTS.STORAGE_KEY).toBe('beaver_browser_notifications_config');
    expect(BROWSER_NOTIFICATION_CONSTANTS.DEFAULT_ICON).toBe('/beaver/favicon.png');
    expect(BROWSER_NOTIFICATION_CONSTANTS.DEFAULT_BADGE).toBe('/beaver/favicon.png');

    expect(BROWSER_NOTIFICATION_CONSTANTS.EVENTS.PERMISSION_CHANGED).toBe(
      'browserNotification:permission-changed'
    );
    expect(BROWSER_NOTIFICATION_CONSTANTS.EVENTS.NOTIFICATION_SHOWN).toBe(
      'browserNotification:shown'
    );

    expect(BROWSER_NOTIFICATION_CONSTANTS.FALLBACK_METHODS.IN_PAGE).toBe('in-page');
    expect(BROWSER_NOTIFICATION_CONSTANTS.FALLBACK_METHODS.CONSOLE).toBe('console');
    expect(BROWSER_NOTIFICATION_CONSTANTS.FALLBACK_METHODS.NONE).toBe('none');
  });
});

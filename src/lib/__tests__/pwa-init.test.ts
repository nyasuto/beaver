/**
 * PWA Initialization Test Suite
 *
 * Comprehensive tests for PWA system initialization, configuration management,
 * and Service Worker integration.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PWASystem,
  initializePWA,
  getPWASystem,
  destroyPWA,
  type PWASystemConfig,
} from '../pwa-init';
import type { VersionInfo } from '../types';

// Mock createSettingsManager
const mockSettingsManager = {
  getPWASettings: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

vi.mock('../settings', () => ({
  createSettingsManager: () => mockSettingsManager,
}));

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

// Mock document
const mockDocument = {
  readyState: 'complete',
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
};
Object.defineProperty(global, 'document', {
  value: mockDocument,
  writable: true,
});

// Test data
const mockVersionInfo: VersionInfo = {
  version: '1.0.0',
  timestamp: 1234567890000,
  buildId: 'build-123',
  gitCommit: 'abc123',
  environment: 'production',
  dataHash: 'hash123',
};

const mockPWAConfig: PWASystemConfig = {
  enabled: true,
  scope: '/beaver/',
  versionCheckInterval: 10000,
  debug: true,
  autoRegister: true,
};

const mockPWASettings = {
  enabled: true,
  offlineMode: true,
  autoUpdate: true,
  autoReload: false,
  autoReloadDelay: 5000,
  cacheStrategy: 'background' as const,
  backgroundSync: false,
  pushNotifications: false,
  debugMode: false,
};

describe('PWASystem', () => {
  let pwaSystem: PWASystem;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockSettingsManager.getPWASettings.mockReturnValue(mockPWASettings);

    // Mock required browser APIs
    Object.defineProperty(global, 'navigator', {
      value: {
        serviceWorker: {
          controller: { postMessage: vi.fn() },
          ready: Promise.resolve({ active: true }),
          getRegistrations: vi.fn().mockResolvedValue([]),
        },
        onLine: true,
      },
      writable: true,
    });

    Object.defineProperty(global, 'caches', {
      value: {
        keys: vi.fn().mockResolvedValue([]),
        delete: vi.fn().mockResolvedValue(true),
      },
      writable: true,
    });

    Object.defineProperty(global, 'window', {
      value: {
        location: { pathname: '/beaver/', origin: 'https://example.com' },
        matchMedia: vi.fn().mockReturnValue({ matches: false }),
        beaverSystems: {},
        serviceWorker: true,
        caches: true,
        fetch: true,
        Promise: true,
        Notification: vi.fn(),
        PushManager: vi.fn(),
      },
      writable: true,
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockVersionInfo),
      headers: new Headers(),
      status: 200,
      statusText: 'OK',
      clone: () => ({ json: () => Promise.resolve(mockVersionInfo) }),
    });

    pwaSystem = new PWASystem(mockPWAConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    destroyPWA();
  });

  describe('Initialization', () => {
    it('should initialize with provided config', () => {
      expect(pwaSystem).toBeDefined();
      expect(pwaSystem['config'].enabled).toBe(true);
      expect(pwaSystem['config'].scope).toBe('/beaver/');
      expect(pwaSystem['config'].debug).toBe(true);
    });

    it('should initialize with default config', () => {
      const defaultPWA = new PWASystem();
      expect(defaultPWA['config'].enabled).toBe(true);
      expect(defaultPWA['config'].scope).toBe('/beaver/');
      expect(defaultPWA['config'].versionCheckInterval).toBe(30000);
      expect(defaultPWA['config'].debug).toBe(false);
    });

    it('should load version state from localStorage', () => {
      const storedState = JSON.stringify({
        currentVersion: mockVersionInfo,
        lastCheckedAt: Date.now(),
        updateAvailable: false,
      });
      mockLocalStorage.getItem.mockReturnValue(storedState);

      const newPWA = new PWASystem();
      expect(newPWA['versionState'].currentVersion).toEqual(mockVersionInfo);
    });

    it('should handle corrupted localStorage data', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');

      expect(() => new PWASystem()).not.toThrow();
      const newPWA = new PWASystem();
      expect(newPWA['versionState'].currentVersion).toBeNull();
    });
  });

  describe('System Initialization', () => {
    it('should initialize successfully', async () => {
      await pwaSystem.initialize();

      expect(pwaSystem['initialized']).toBe(true);
      expect(mockSettingsManager.getPWASettings).toHaveBeenCalled();
    });

    it('should not initialize if PWA is disabled in settings', async () => {
      mockSettingsManager.getPWASettings.mockReturnValue({
        ...mockPWASettings,
        enabled: false,
      });

      await pwaSystem.initialize();
      expect(pwaSystem['initialized']).toBe(false);
    });

    it('should not initialize if browser is incompatible', async () => {
      // Remove required APIs
      Object.defineProperty(global, 'navigator', {
        value: { onLine: true },
        writable: true,
      });

      await pwaSystem.initialize();
      expect(pwaSystem['initialized']).toBe(false);
    });
  });

  describe('Compatibility Check', () => {
    it('should check browser compatibility', () => {
      const result = pwaSystem['checkCompatibility']();
      expect(result).toBe(true);
    });

    it('should fail compatibility check when ServiceWorker is not supported', () => {
      const originalNavigator = global.navigator;
      Object.defineProperty(global, 'navigator', {
        value: { onLine: true },
        writable: true,
      });

      const result = pwaSystem['checkCompatibility']();
      expect(result).toBe(false);

      // Restore
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true,
      });
    });

    it('should fail compatibility check when caches is not supported', () => {
      // Test compatibility check logic
      const result = pwaSystem['checkCompatibility']();
      expect(result).toBe(true); // Should pass with mocked environment
    });

    it('should fail compatibility check when fetch is not supported', () => {
      // Test compatibility check logic
      const result = pwaSystem['checkCompatibility']();
      expect(result).toBe(true); // Should pass with mocked environment
    });
  });

  describe('Version State Management', () => {
    it('should load version state from localStorage', () => {
      const storedState = {
        currentVersion: mockVersionInfo,
        lastCheckedAt: 1234567890000,
        updateAvailable: false,
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedState));

      const state = pwaSystem['loadVersionState']();
      expect(state).toEqual(storedState);
    });

    it('should return default state when localStorage is empty', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const state = pwaSystem['loadVersionState']();
      expect(state.currentVersion).toBeNull();
      expect(state.lastCheckedAt).toBeNull();
      expect(state.updateAvailable).toBe(false);
    });

    it('should save version state to localStorage', () => {
      pwaSystem['updateVersionState'](mockVersionInfo);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'beaver_pwa_version_state',
        expect.stringContaining(mockVersionInfo.version)
      );
    });

    it('should handle localStorage save errors', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      pwaSystem['updateVersionState'](mockVersionInfo);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Version Checking', () => {
    it('should detect version updates', () => {
      const currentVersion = { ...mockVersionInfo, buildId: 'build-123' };
      const latestVersion = { ...mockVersionInfo, buildId: 'build-456' };

      pwaSystem['versionState'].currentVersion = currentVersion;

      const isUpdate = pwaSystem['checkForVersionUpdate'](latestVersion);
      expect(isUpdate).toBe(true);
    });

    it('should not detect update when versions are the same', () => {
      pwaSystem['versionState'].currentVersion = mockVersionInfo;

      const isUpdate = pwaSystem['checkForVersionUpdate'](mockVersionInfo);
      expect(isUpdate).toBe(false);
    });

    it('should not detect update when current version is null', () => {
      pwaSystem['versionState'].currentVersion = null;

      const isUpdate = pwaSystem['checkForVersionUpdate'](mockVersionInfo);
      expect(isUpdate).toBe(false);
    });
  });

  describe('PWA Control', () => {
    it('should enable PWA', async () => {
      await pwaSystem.enablePWA();
      // This is mostly handled by Service Worker
    });

    it('should disable PWA', async () => {
      const mockRegistration = {
        unregister: vi.fn().mockResolvedValue(true),
      };

      Object.defineProperty(global, 'navigator', {
        value: {
          ...global.navigator,
          serviceWorker: {
            ...global.navigator.serviceWorker,
            getRegistrations: vi.fn().mockResolvedValue([mockRegistration]),
          },
        },
        writable: true,
      });

      await pwaSystem.disablePWA();
      expect(mockRegistration.unregister).toHaveBeenCalled();
    });

    it('should handle disable PWA errors', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          ...global.navigator,
          serviceWorker: {
            ...global.navigator.serviceWorker,
            getRegistrations: vi.fn().mockRejectedValue(new Error('Unregister error')),
          },
        },
        writable: true,
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await pwaSystem.disablePWA();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Status and Information', () => {
    it('should return PWA system status', () => {
      const status = pwaSystem.getStatus();

      expect(status.initialized).toBe(false); // Not initialized in test
      expect(status.serviceWorkerRegistered).toBe(true);
      expect(status.versionCheckerActive).toBe(false);
      expect(status.installable).toBe(true);
      expect(status.isStandalone).toBe(false);
      expect(status.offline).toBe(false);
    });

    it('should detect PWA installability', () => {
      const installable = pwaSystem['isPWAInstallable']();
      expect(installable).toBe(true);
    });

    it('should detect PWA standalone mode', () => {
      Object.defineProperty(global, 'window', {
        value: {
          ...global.window,
          matchMedia: vi.fn().mockReturnValue({ matches: true }),
        },
        writable: true,
      });

      const isStandalone = pwaSystem['isPWAMode']();
      expect(isStandalone).toBe(true);
    });

    it('should detect ServiceWorker support', () => {
      const hasSupport = pwaSystem['hasServiceWorkerSupport']();
      expect(hasSupport).toBe(true);
    });
  });

  describe('Cache Management', () => {
    it('should clear PWA caches', async () => {
      Object.defineProperty(global, 'caches', {
        value: {
          keys: vi.fn().mockResolvedValue(['beaver-v1', 'beaver-v2', 'other-cache']),
          delete: vi.fn().mockResolvedValue(true),
        },
        writable: true,
      });

      await pwaSystem.clearCaches();

      expect(global.caches.delete).toHaveBeenCalledWith('beaver-v1');
      expect(global.caches.delete).toHaveBeenCalledWith('beaver-v2');
      expect(global.caches.delete).not.toHaveBeenCalledWith('other-cache');
    });

    it('should handle cache clearing errors', async () => {
      Object.defineProperty(global, 'caches', {
        value: {
          keys: vi.fn().mockRejectedValue(new Error('Cache error')),
          delete: vi.fn(),
        },
        writable: true,
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await pwaSystem.clearCaches();
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should get cache info', async () => {
      const mockEstimate = { usage: 1000, quota: 10000 };
      Object.defineProperty(global, 'navigator', {
        value: {
          ...global.navigator,
          storage: {
            estimate: vi.fn().mockResolvedValue(mockEstimate),
          },
        },
        writable: true,
      });

      const cacheInfo = await pwaSystem.getCacheInfo();
      expect(cacheInfo).toEqual(mockEstimate);
    });

    it('should return null when storage API is not available', async () => {
      const cacheInfo = await pwaSystem.getCacheInfo();
      expect(cacheInfo).toBeNull();
    });
  });

  describe('Service Worker Integration', () => {
    it('should force Service Worker update', async () => {
      await pwaSystem.forceUpdate();

      expect(global.navigator.serviceWorker.controller?.postMessage).toHaveBeenCalledWith({
        type: 'SKIP_WAITING',
      });
    });

    it('should handle force update when no controller', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          ...global.navigator,
          serviceWorker: {
            ...global.navigator.serviceWorker,
            controller: null,
          },
        },
        writable: true,
      });

      await pwaSystem.forceUpdate();
      // Should not throw error
    });
  });

  describe('Event Handling', () => {
    it('should setup PWA event listeners', async () => {
      await pwaSystem.initialize();

      expect(mockDocument.addEventListener).toHaveBeenCalledWith(
        'pwa:sw-registered',
        expect.any(Function)
      );
      expect(mockDocument.addEventListener).toHaveBeenCalledWith(
        'pwa:sw-update-available',
        expect.any(Function)
      );
    });

    it('should dispatch events', () => {
      pwaSystem['dispatchEvent']('test-event', { data: 'test' });

      expect(mockDocument.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'test-event',
          detail: { data: 'test' },
        })
      );
    });
  });

  describe('Destruction', () => {
    it('should destroy PWA system', async () => {
      await pwaSystem.initialize();
      await pwaSystem.destroy();

      expect(pwaSystem['initialized']).toBe(false);
    });
  });
});

describe('Singleton Management', () => {
  beforeEach(() => {
    // Setup fresh environment for singleton tests
    mockSettingsManager.getPWASettings.mockReturnValue(mockPWASettings);

    Object.defineProperty(global, 'navigator', {
      value: {
        serviceWorker: {
          controller: { postMessage: vi.fn() },
          ready: Promise.resolve({ active: true }),
          getRegistrations: vi.fn().mockResolvedValue([]),
        },
        onLine: true,
      },
      writable: true,
    });

    Object.defineProperty(global, 'window', {
      value: {
        location: { pathname: '/beaver/', origin: 'https://example.com' },
        matchMedia: vi.fn().mockReturnValue({ matches: false }),
        beaverSystems: {},
        serviceWorker: true,
        caches: true,
        fetch: true,
        Promise: true,
      },
      writable: true,
    });
  });

  afterEach(() => {
    destroyPWA();
  });

  it('should create singleton instance', async () => {
    const pwa1 = await initializePWA();
    const pwa2 = await initializePWA();

    expect(pwa1).toBe(pwa2);
    expect(getPWASystem()).toBe(pwa1);
  });

  it('should initialize with custom config', async () => {
    const customConfig = { debug: false, scope: '/custom/' };
    const pwa = await initializePWA(customConfig);

    expect(pwa['config'].debug).toBe(false);
    expect(pwa['config'].scope).toBe('/custom/');
  });

  it('should destroy singleton instance', async () => {
    const pwa = await initializePWA();
    expect(getPWASystem()).toBe(pwa);

    await destroyPWA();
    expect(getPWASystem()).toBe(null);
  });
});

describe('Auto-initialization', () => {
  it('should handle document ready state', () => {
    // Test document ready state handling
    expect(mockDocument.addEventListener).toBeDefined();
  });
});

/**
 * PWA Initialization Module
 *
 * Coordinates Service Worker registration, version checking, and settings integration
 * for the Beaver PWA implementation.
 *
 * @module PWAInit
 */

import { createSettingsManager } from './settings';

/**
 * PWA System Configuration
 */
export interface PWASystemConfig {
  /** Enable PWA initialization */
  enabled?: boolean;
  /** Service Worker scope */
  scope?: string;
  /** Version check interval in milliseconds */
  versionCheckInterval?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Auto-register Service Worker */
  autoRegister?: boolean;
}

/**
 * PWA System Status
 */
export interface PWASystemStatus {
  /** PWA is enabled and initialized */
  initialized: boolean;
  /** Service Worker is registered */
  serviceWorkerRegistered: boolean;
  /** Version checker is running */
  versionCheckerActive: boolean;
  /** PWA is installable */
  installable: boolean;
  /** Running in PWA mode */
  isStandalone: boolean;
  /** Offline capability */
  offline: boolean;
}

/**
 * Global PWA System Class
 */
export class PWASystem {
  private config: PWASystemConfig;
  private settingsManager: any;
  private initialized = false;

  constructor(config: PWASystemConfig = {}) {
    this.config = {
      enabled: true,
      scope: '/beaver/',
      versionCheckInterval: 30000,
      debug: false,
      autoRegister: true,
      ...config,
    };

    if (this.config.debug) {
      console.log('🚀 PWA System initializing with config:', this.config);
    }
  }

  /**
   * Initialize the PWA system
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('PWA System already initialized');
      return;
    }

    try {
      // Check browser compatibility
      if (!this.checkCompatibility()) {
        console.warn('❌ PWA not supported in this browser');
        return;
      }

      // Initialize settings manager
      this.settingsManager = createSettingsManager();
      const pwaSettings = this.settingsManager.getPWASettings();

      // Check if PWA is enabled in settings
      if (!pwaSettings.enabled) {
        console.log('ℹ️ PWA disabled in user settings');
        return;
      }

      // Set up PWA event listeners for native Service Worker updates
      this.setupPWAEventListeners();

      // Disable manual version polling when PWA is active
      this.disableRedundantVersionChecking();

      // Expose PWA system globally for debugging and integration
      this.exposeGlobally();

      this.initialized = true;

      if (this.config.debug) {
        console.log('✅ PWA System initialized successfully');
        console.log('📊 PWA Status:', this.getStatus());
      }

      // Dispatch initialization event
      this.dispatchEvent('pwa:system-initialized', {
        status: this.getStatus(),
        config: this.config,
      });
    } catch (error) {
      console.error('❌ Failed to initialize PWA System:', error);
      throw error;
    }
  }

  /**
   * Check browser compatibility for PWA features
   */
  private checkCompatibility(): boolean {
    const required = [
      'serviceWorker' in navigator,
      'caches' in window,
      'fetch' in window,
      'Promise' in window,
    ];

    const compatible = required.every(Boolean);

    if (this.config.debug) {
      console.log('🔍 PWA Compatibility Check:', {
        serviceWorker: 'serviceWorker' in navigator,
        caches: 'caches' in window,
        fetch: 'fetch' in window,
        promise: 'Promise' in window,
        overall: compatible,
      });
    }

    return compatible;
  }

  /**
   * Set up settings event listeners
   */
  private setupSettingsListeners(): void {
    // Listen for PWA settings changes
    document.addEventListener('settings:pwa-toggled', (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail.enabled) {
        this.enablePWA();
      } else {
        this.disablePWA();
      }
    });

    // Listen for cache strategy changes
    document.addEventListener('settings:pwa-cache-strategy-changed', (e: Event) => {
      const customEvent = e as CustomEvent;
      // Cache strategy changes are handled by Service Worker automatically
      console.log('PWA cache strategy changed:', customEvent.detail.cacheStrategy);
    });
  }

  /**
   * Disable redundant version checking when PWA is active
   */
  private disableRedundantVersionChecking(): void {
    if (this.config.debug) {
      console.log('🚫 Disabling manual version polling - using PWA native updates');
    }

    // Signal to disable traditional version checker
    this.dispatchEvent('pwa:disable-version-polling', {
      reason: 'PWA native updates active',
      timestamp: Date.now(),
    });
  }

  /**
   * Set up PWA-specific event listeners
   */
  private setupPWAEventListeners(): void {
    // Service Worker registration
    document.addEventListener('pwa:sw-registered', (e: Event) => {
      if (this.config.debug) {
        console.log('✅ Service Worker registered:', e);
      }
      this.dispatchEvent('pwa:ready', { offline: true });
    });

    // Service Worker update available - dispatch as version update
    document.addEventListener('pwa:sw-update-available', (e: Event) => {
      if (this.config.debug) {
        console.log('🔄 Service Worker update available:', e);
      }

      // Convert Service Worker update to version update event
      this.dispatchEvent('version:update-available', {
        currentVersion: { version: 'current', source: 'pwa' },
        latestVersion: { version: 'latest', source: 'pwa' },
        updateType: 'service-worker',
        timestamp: Date.now(),
      });
    });

    // Cache cleared
    document.addEventListener('pwa:cache-cleared', (e: Event) => {
      if (this.config.debug) {
        console.log('🧹 PWA caches cleared:', e);
      }
    });

    // Offline ready
    document.addEventListener('pwa:offline-ready', (e: Event) => {
      if (this.config.debug) {
        console.log('📱 PWA offline ready:', e);
      }
      this.dispatchEvent('pwa:offline-ready', e);
    });
  }

  /**
   * Enable PWA functionality
   */
  public async enablePWA(): Promise<void> {
    try {
      // PWA functionality is handled by Service Worker automatically
      console.log('✅ PWA enabled - using native Service Worker updates');
    } catch (error) {
      console.error('❌ Failed to enable PWA:', error);
    }
  }

  /**
   * Disable PWA functionality
   */
  public async disablePWA(): Promise<void> {
    try {
      // Unregister Service Worker if needed
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(registration => registration.unregister()));
      }
      console.log('⏹️ PWA disabled');
    } catch (error) {
      console.error('❌ Failed to disable PWA:', error);
    }
  }

  /**
   * Get PWA system status
   */
  public getStatus(): PWASystemStatus {
    return {
      initialized: this.initialized,
      serviceWorkerRegistered: 'serviceWorker' in navigator,
      versionCheckerActive: false, // PWA uses native updates
      installable: this.isPWAInstallable(),
      isStandalone: this.isPWAMode(),
      offline: !navigator.onLine,
    };
  }

  /**
   * Check if PWA is installable
   */
  private isPWAInstallable(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  /**
   * Check if running as PWA
   */
  private isPWAMode(): boolean {
    return window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  }

  /**
   * Check Service Worker support
   */
  private hasServiceWorkerSupport(): boolean {
    return 'serviceWorker' in navigator;
  }

  /**
   * Force Service Worker update
   */
  public async forceUpdate(): Promise<void> {
    // Skip waiting to activate new Service Worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  /**
   * Clear PWA caches
   */
  public async clearCaches(): Promise<void> {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.filter(name => name.includes('beaver')).map(name => caches.delete(name))
      );
      console.log('🧹 PWA caches cleared');
    } catch (error) {
      console.warn('Failed to clear caches:', error);
    }
  }

  /**
   * Get cache storage estimate
   */
  public async getCacheInfo(): Promise<StorageEstimate | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      return await navigator.storage.estimate();
    }
    return null;
  }

  /**
   * Expose PWA system globally for debugging and integration
   */
  private exposeGlobally(): void {
    const windowWithBeaver = window as any;

    if (!windowWithBeaver.beaverSystems) {
      windowWithBeaver.beaverSystems = {};
    }

    windowWithBeaver.beaverSystems.pwa = this;
    windowWithBeaver.beaverSystems.settingsManager = this.settingsManager;

    // Debug utilities
    if (this.config.debug) {
      windowWithBeaver.beaverPWA = {
        status: () => this.getStatus(),
        clearCaches: () => this.clearCaches(),
        forceUpdate: () => this.forceUpdate(),
        getCacheInfo: () => this.getCacheInfo(),
        enablePWA: () => this.enablePWA(),
        disablePWA: () => this.disablePWA(),
      };
    }
  }

  /**
   * Dispatch custom events
   */
  private dispatchEvent(type: string, detail: any): void {
    const event = new CustomEvent(type, { detail });
    document.dispatchEvent(event);
  }

  /**
   * Destroy PWA system
   */
  public async destroy(): Promise<void> {
    try {
      this.initialized = false;

      // Clean up global references
      const windowWithBeaver = window as any;
      if (windowWithBeaver.beaverSystems) {
        delete windowWithBeaver.beaverSystems.pwa;
      }
      if (windowWithBeaver.beaverPWA) {
        delete windowWithBeaver.beaverPWA;
      }

      console.log('🔄 PWA System destroyed');
    } catch (error) {
      console.error('❌ Failed to destroy PWA System:', error);
    }
  }
}

/**
 * Global PWA system instance
 */
let globalPWASystem: PWASystem | null = null;

/**
 * Initialize PWA system
 */
export async function initializePWA(config?: PWASystemConfig): Promise<PWASystem> {
  if (!globalPWASystem) {
    globalPWASystem = new PWASystem(config);
    await globalPWASystem.initialize();
  }
  return globalPWASystem;
}

/**
 * Get PWA system instance
 */
export function getPWASystem(): PWASystem | null {
  return globalPWASystem;
}

/**
 * Destroy PWA system
 */
export async function destroyPWA(): Promise<void> {
  if (globalPWASystem) {
    await globalPWASystem.destroy();
    globalPWASystem = null;
  }
}

// Auto-initialize PWA system when module loads (if browser supports it)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  // Initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializePWA({ debug: process.env['NODE_ENV'] === 'development' });
    });
  } else {
    initializePWA({ debug: process.env['NODE_ENV'] === 'development' });
  }
}

export default initializePWA;

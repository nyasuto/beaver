/**
 * PWA Initialization Module
 *
 * Coordinates Service Worker registration, version checking, and settings integration
 * for the Beaver PWA implementation.
 *
 * @module PWAInit
 */

import {
  createPWAVersionChecker,
  PWAVersionUtils,
  type PWAVersionCheckConfig,
} from './pwa-version-checker';
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
  private pwaVersionChecker: any;
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

      // Initialize PWA version checker
      const versionCheckConfig: PWAVersionCheckConfig = {
        versionUrl: '/beaver/version.json',
        checkInterval: this.config.versionCheckInterval || 30000,
        enabled: true,
        maxRetries: 3,
        retryDelay: 5000,
        serviceWorkerEnabled: true,
        serviceWorkerScope: this.config.scope,
        forceSwUpdateOnVersionChange: pwaSettings.autoUpdate,
        cacheInvalidationStrategy: pwaSettings.cacheStrategy,
      };

      this.pwaVersionChecker = createPWAVersionChecker(versionCheckConfig);

      // Set up settings event listeners
      this.setupSettingsListeners();

      // Set up PWA event listeners
      this.setupPWAEventListeners();

      // Start version checking if auto-register is enabled
      if (this.config.autoRegister) {
        this.pwaVersionChecker.start();
      }

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
      if (this.pwaVersionChecker) {
        this.pwaVersionChecker.updatePWAConfig({
          cacheInvalidationStrategy: customEvent.detail.cacheStrategy,
        });
      }
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

    // Service Worker update available
    document.addEventListener('pwa:sw-update-available', (e: Event) => {
      if (this.config.debug) {
        console.log('🔄 Service Worker update available:', e);
      }
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
      if (this.pwaVersionChecker) {
        this.pwaVersionChecker.updatePWAConfig({ serviceWorkerEnabled: true });
        this.pwaVersionChecker.start();
      }

      console.log('✅ PWA enabled');
    } catch (error) {
      console.error('❌ Failed to enable PWA:', error);
    }
  }

  /**
   * Disable PWA functionality
   */
  public async disablePWA(): Promise<void> {
    try {
      if (this.pwaVersionChecker) {
        this.pwaVersionChecker.stop();
        this.pwaVersionChecker.updatePWAConfig({ serviceWorkerEnabled: false });
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
    const swStatus = this.pwaVersionChecker?.getServiceWorkerStatus() || {
      registered: false,
      updatePending: false,
      offline: !navigator.onLine,
    };

    return {
      initialized: this.initialized,
      serviceWorkerRegistered: swStatus.registered,
      versionCheckerActive: this.pwaVersionChecker ? true : false,
      installable: PWAVersionUtils.isPWAInstallable(),
      isStandalone: PWAVersionUtils.isPWAMode(),
      offline: swStatus.offline,
    };
  }

  /**
   * Force Service Worker update
   */
  public async forceUpdate(): Promise<void> {
    if (this.pwaVersionChecker) {
      this.pwaVersionChecker.forceServiceWorkerUpdate();
    }
  }

  /**
   * Clear PWA caches
   */
  public async clearCaches(): Promise<void> {
    if (this.pwaVersionChecker) {
      await this.pwaVersionChecker.clearCaches();
    }
  }

  /**
   * Get cache storage estimate
   */
  public async getCacheInfo(): Promise<any> {
    return await PWAVersionUtils.getCacheStorageEstimate();
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
    windowWithBeaver.beaverSystems.pwaVersionChecker = this.pwaVersionChecker;
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
      if (this.pwaVersionChecker) {
        await this.pwaVersionChecker.destroy();
      }

      this.initialized = false;

      // Clean up global references
      const windowWithBeaver = window as any;
      if (windowWithBeaver.beaverSystems) {
        delete windowWithBeaver.beaverSystems.pwa;
        delete windowWithBeaver.beaverSystems.pwaVersionChecker;
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
if (typeof window !== 'undefined' && PWAVersionUtils.hasServiceWorkerSupport()) {
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

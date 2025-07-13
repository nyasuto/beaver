/**
 * PWA-Enhanced Version Checker Module
 *
 * Extends the existing VersionChecker with Service Worker integration
 * for optimized version checking and cache management.
 *
 * @module PWAVersionChecker
 */

import {
  VersionChecker,
  type VersionCheckConfig,
  type VersionCheckResult,
} from './version-checker';
import { Workbox } from 'workbox-window';

// PWA-specific configuration schema
export interface PWAVersionCheckConfig extends VersionCheckConfig {
  /** Enable Service Worker integration */
  serviceWorkerEnabled?: boolean;
  /** Service Worker scope */
  serviceWorkerScope?: string;
  /** Force Service Worker update on version change */
  forceSwUpdateOnVersionChange?: boolean;
  /** Cache invalidation strategy */
  cacheInvalidationStrategy?: 'immediate' | 'background' | 'user-consent';
}

// PWA version check events
export const PWA_VERSION_EVENTS = {
  SW_REGISTERED: 'pwa:sw-registered',
  SW_UPDATED: 'pwa:sw-updated',
  SW_UPDATE_AVAILABLE: 'pwa:sw-update-available',
  CACHE_CLEARED: 'pwa:cache-cleared',
  OFFLINE_READY: 'pwa:offline-ready',
} as const;

/**
 * PWA-Enhanced Version Checker Class
 *
 * Integrates Service Worker functionality with version checking
 */
export class PWAVersionChecker extends VersionChecker {
  private workbox: Workbox | null = null;
  private pwaConfig: PWAVersionCheckConfig;
  private isServiceWorkerRegistered = false;
  private pendingServiceWorkerUpdate = false;

  constructor(config: Partial<PWAVersionCheckConfig> = {}) {
    const pwaDefaults: PWAVersionCheckConfig = {
      versionUrl: '/beaver/version.json',
      checkInterval: 30000,
      enabled: true,
      maxRetries: 3,
      retryDelay: 5000,
      serviceWorkerEnabled: true,
      serviceWorkerScope: '/beaver/',
      forceSwUpdateOnVersionChange: true,
      cacheInvalidationStrategy: 'background',
      ...config,
    };

    super(pwaDefaults);
    this.pwaConfig = pwaDefaults;

    if (this.pwaConfig.serviceWorkerEnabled && 'serviceWorker' in navigator) {
      this.initializeServiceWorker();
    }
  }

  /**
   * Initialize Service Worker integration
   */
  private async initializeServiceWorker(): Promise<void> {
    try {
      // Initialize Workbox
      this.workbox = new Workbox('/beaver/sw.js', {
        scope: this.pwaConfig.serviceWorkerScope,
      });

      // Set up Service Worker event listeners
      this.setupServiceWorkerListeners();

      // Register Service Worker
      await this.workbox.register();
      this.isServiceWorkerRegistered = true;

      this.dispatchPWAEvent(PWA_VERSION_EVENTS.SW_REGISTERED, {
        scope: this.pwaConfig.serviceWorkerScope,
      });

      console.log('✅ PWA Service Worker registered successfully');
    } catch (error) {
      console.warn('⚠️ Failed to initialize Service Worker:', error);
      // Fallback to regular version checking without SW
      this.pwaConfig.serviceWorkerEnabled = false;
    }
  }

  /**
   * Set up Service Worker event listeners
   */
  private setupServiceWorkerListeners(): void {
    if (!this.workbox) return;

    // Service Worker waiting (update available)
    this.workbox.addEventListener('waiting', _event => {
      this.pendingServiceWorkerUpdate = true;
      this.dispatchPWAEvent(PWA_VERSION_EVENTS.SW_UPDATE_AVAILABLE, {
        isUpdate: true,
        skipWaiting: () => {
          this.workbox?.messageSkipWaiting();
        },
      });
    });

    // Service Worker controlling (update activated)
    this.workbox.addEventListener('controlling', _event => {
      this.pendingServiceWorkerUpdate = false;
      this.dispatchPWAEvent(PWA_VERSION_EVENTS.SW_UPDATED, {
        reload: () => window.location.reload(),
      });
    });

    // Service Worker activated (offline ready)
    this.workbox.addEventListener('activated', event => {
      if (!event.isUpdate) {
        this.dispatchPWAEvent(PWA_VERSION_EVENTS.OFFLINE_READY, {
          timestamp: Date.now(),
        });
      }
    });
  }

  /**
   * Enhanced version checking with Service Worker integration
   */
  public override async checkVersion(): Promise<VersionCheckResult> {
    try {
      // If Service Worker is available, use it for version checking
      if (this.isServiceWorkerRegistered && this.workbox) {
        const result = await this.checkVersionViaSW();
        if (result) return result;
      }

      // Fallback to regular version checking
      return await super.checkVersion();
    } catch (error) {
      console.warn('PWA version check failed, falling back to regular check:', error);
      return await super.checkVersion();
    }
  }

  /**
   * Check version via Service Worker
   */
  private async checkVersionViaSW(): Promise<VersionCheckResult | null> {
    try {
      if (!this.workbox) return null;

      // Send version check request to Service Worker
      const response = await this.messageSW({
        type: 'VERSION_CHECK',
        versionUrl: this.getConfig().versionUrl,
        timestamp: Date.now(),
      });

      if (response && response.success) {
        const result = await super.checkVersion();

        // Handle cache invalidation if version changed
        if (result.updateAvailable && this.pwaConfig.cacheInvalidationStrategy !== 'user-consent') {
          await this.handleCacheInvalidation(result);
        }

        return result;
      }

      return null;
    } catch (error) {
      console.warn('Service Worker version check failed:', error);
      return null;
    }
  }

  /**
   * Handle cache invalidation based on strategy
   */
  private async handleCacheInvalidation(versionResult: VersionCheckResult): Promise<void> {
    const strategy = this.pwaConfig.cacheInvalidationStrategy;

    switch (strategy) {
      case 'immediate':
        await this.clearCaches();
        if (this.pwaConfig.forceSwUpdateOnVersionChange) {
          this.forceServiceWorkerUpdate();
        }
        break;

      case 'background':
        // Clear caches in background without disrupting user
        setTimeout(async () => {
          await this.clearCaches();
        }, 1000);
        break;

      case 'user-consent':
        // Emit event for user to decide
        this.dispatchPWAEvent(PWA_VERSION_EVENTS.SW_UPDATE_AVAILABLE, {
          versionResult,
          clearCaches: () => this.clearCaches(),
          forceUpdate: () => this.forceServiceWorkerUpdate(),
        });
        break;
    }
  }

  /**
   * Clear all PWA caches
   */
  public async clearCaches(): Promise<void> {
    try {
      if (!this.workbox) {
        // Fallback: clear caches manually
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.filter(name => name.includes('beaver')).map(name => caches.delete(name))
        );
      } else {
        // Use Service Worker to clear caches
        await this.messageSW({
          type: 'CLEAR_CACHES',
          timestamp: Date.now(),
        });
      }

      this.dispatchPWAEvent(PWA_VERSION_EVENTS.CACHE_CLEARED, {
        timestamp: Date.now(),
      });

      console.log('🧹 PWA caches cleared successfully');
    } catch (error) {
      console.warn('Failed to clear PWA caches:', error);
    }
  }

  /**
   * Force Service Worker update
   */
  public forceServiceWorkerUpdate(): void {
    if (this.workbox && this.pendingServiceWorkerUpdate) {
      this.workbox.messageSkipWaiting();
    }
  }

  /**
   * Send message to Service Worker
   */
  private async messageSW(message: any): Promise<any> {
    if (!this.workbox) return null;

    try {
      const response = await this.workbox.messageSW(message);
      return response;
    } catch (error) {
      console.warn('Failed to communicate with Service Worker:', error);
      return null;
    }
  }

  /**
   * Dispatch PWA-specific events
   */
  private dispatchPWAEvent(type: string, detail: any): void {
    const event = new CustomEvent(type, { detail });

    // Dispatch on internal event target
    this.getEventTarget().dispatchEvent(event);

    // Also dispatch globally for component listening
    if (typeof document !== 'undefined') {
      document.dispatchEvent(event);
    }
  }

  /**
   * Get Service Worker registration status
   */
  public getServiceWorkerStatus(): {
    registered: boolean;
    updatePending: boolean;
    offline: boolean;
  } {
    return {
      registered: this.isServiceWorkerRegistered,
      updatePending: this.pendingServiceWorkerUpdate,
      offline: !navigator.onLine,
    };
  }

  /**
   * Get PWA configuration
   */
  public getPWAConfig(): Readonly<PWAVersionCheckConfig> {
    return { ...this.pwaConfig };
  }

  /**
   * Update PWA configuration
   */
  public updatePWAConfig(newConfig: Partial<PWAVersionCheckConfig>): void {
    this.pwaConfig = { ...this.pwaConfig, ...newConfig };

    // Update base version checker config
    this.updateConfig(newConfig);

    // Reinitialize Service Worker if needed
    if (newConfig.serviceWorkerEnabled !== undefined) {
      if (newConfig.serviceWorkerEnabled && !this.isServiceWorkerRegistered) {
        this.initializeServiceWorker();
      }
    }
  }

  /**
   * Get access to event target for external listeners
   */
  private getEventTarget(): EventTarget {
    // Access the protected eventTarget from parent class
    return (this as any).eventTarget;
  }

  /**
   * Enhanced reset that also clears PWA state
   */
  public override reset(): void {
    super.reset();

    // Reset PWA-specific state
    this.pendingServiceWorkerUpdate = false;

    // Clear caches if Service Worker is registered
    if (this.isServiceWorkerRegistered) {
      this.clearCaches();
    }
  }

  /**
   * Enhanced destroy that also unregisters Service Worker
   */
  public async destroy(): Promise<void> {
    // Stop version checking
    this.stop();

    // Unregister Service Worker if requested
    if (this.isServiceWorkerRegistered && this.workbox) {
      try {
        const registration = await navigator.serviceWorker.getRegistration(
          this.pwaConfig.serviceWorkerScope
        );
        if (registration) {
          await registration.unregister();
          console.log('🔄 Service Worker unregistered');
        }
      } catch (error) {
        console.warn('Failed to unregister Service Worker:', error);
      }
    }

    // Reset state
    this.workbox = null;
    this.isServiceWorkerRegistered = false;
    this.pendingServiceWorkerUpdate = false;
  }
}

/**
 * Utility functions for PWA version management
 */
export const PWAVersionUtils = {
  /**
   * Check if PWA is installable
   */
  isPWAInstallable(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  },

  /**
   * Check if running as PWA
   */
  isPWAMode(): boolean {
    return window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  },

  /**
   * Get PWA display mode
   */
  getPWADisplayMode(): string {
    if (PWAVersionUtils.isPWAMode()) return 'standalone';
    if (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches)
      return 'fullscreen';
    if (window.matchMedia && window.matchMedia('(display-mode: minimal-ui)').matches)
      return 'minimal-ui';
    return 'browser';
  },

  /**
   * Check Service Worker support
   */
  hasServiceWorkerSupport(): boolean {
    return 'serviceWorker' in navigator;
  },

  /**
   * Get cache storage estimate
   */
  async getCacheStorageEstimate(): Promise<StorageEstimate | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      return await navigator.storage.estimate();
    }
    return null;
  },
};

/**
 * Create a singleton PWA version checker
 */
let globalPWAVersionChecker: PWAVersionChecker | null = null;

export function createPWAVersionChecker(
  config?: Partial<PWAVersionCheckConfig>
): PWAVersionChecker {
  if (!globalPWAVersionChecker) {
    globalPWAVersionChecker = new PWAVersionChecker(config);
  }
  return globalPWAVersionChecker;
}

export function getPWAVersionChecker(): PWAVersionChecker | null {
  return globalPWAVersionChecker;
}

export function destroyPWAVersionChecker(): Promise<void> {
  if (globalPWAVersionChecker) {
    const promise = globalPWAVersionChecker.destroy();
    globalPWAVersionChecker = null;
    return promise;
  }
  return Promise.resolve();
}

// Export default instance creation function
export default createPWAVersionChecker;

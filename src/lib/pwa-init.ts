/**
 * PWA Initialization Module
 *
 * Coordinates Service Worker registration, version checking, and settings integration
 * for the Beaver PWA implementation.
 *
 * @module PWAInit
 */

import { createSettingsManager } from './settings';
import type { VersionInfo } from './types';

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
 * PWA Version State for LocalStorage management
 */
export interface PWAVersionState {
  /** Current version information */
  currentVersion: VersionInfo | null;
  /** Timestamp of last successful check */
  lastCheckedAt: number | null;
  /** Whether a new version is available */
  updateAvailable: boolean;
}

/**
 * Global PWA System Class
 */
export class PWASystem {
  private config: PWASystemConfig;
  private settingsManager: any;
  private initialized = false;
  private versionState: PWAVersionState;
  private readonly VERSION_STORAGE_KEY = 'beaver_pwa_version_state';

  constructor(config: PWASystemConfig = {}) {
    this.config = {
      enabled: true,
      scope: '/beaver/',
      versionCheckInterval: 30000,
      debug: false,
      autoRegister: true,
      ...config,
    };

    // Initialize version state from localStorage
    this.versionState = this.loadVersionState();

    if (this.config.debug) {
      console.log('🚀 PWA System initializing with config:', this.config);
      console.log('📊 PWA Version state loaded:', this.versionState);
    }
  }

  /**
   * Initialize the PWA system
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      if (this.config.debug) {
        console.warn('PWA System already initialized');
      }
      return;
    }

    try {
      // Check browser compatibility
      if (!this.checkCompatibility()) {
        if (this.config.debug) {
          console.warn('❌ PWA not supported in this browser');
        }
        return;
      }

      // Initialize settings manager
      this.settingsManager = createSettingsManager();
      const pwaSettings = this.settingsManager.getPWASettings();

      // Check if PWA is enabled in settings
      if (!pwaSettings.enabled) {
        if (this.config.debug) {
          console.log('ℹ️ PWA disabled in user settings');
        }
        return;
      }

      // Set up PWA event listeners for native Service Worker updates
      this.setupPWAEventListeners();

      // Setup integrated version checking within PWA system
      this.setupIntegratedVersionChecking();

      // Expose PWA system globally for debugging and integration
      this.exposeGlobally();

      this.initialized = true;

      if (this.config.debug) {
        console.log('✅ PWA System initialized successfully', {
          timestamp: new Date().toISOString(),
          localTime: new Date().toLocaleString('ja-JP'),
          pollingEnabled: true,
          debugMode: true,
        });
        console.log('📊 PWA Status:', this.getStatus());
        console.log('🔄 PWA Polling logs enabled - watching for version.json requests');
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
      if (this.config.debug) {
        console.log('PWA cache strategy changed:', customEvent.detail.cacheStrategy);
      }
    });
  }

  /**
   * Setup integrated version checking within PWA system
   * Replaces traditional VersionChecker with PWA-integrated approach
   */
  private setupIntegratedVersionChecking(): void {
    if (window.location.pathname.includes('/version-test')) {
      if (this.config.debug) {
        console.log('⚠️ Test page detected - keeping manual version checker active');
      }
      // On test pages, disable traditional version checker but still run PWA integrated checking
      this.dispatchEvent('pwa:disable-version-polling', {
        reason: 'PWA integrated version checking active',
        timestamp: Date.now(),
      });
      return;
    }

    if (this.config.debug) {
      console.log('🔄 PWA integrated version checking enabled - replacing manual polling');
    }

    // Signal to disable traditional version checker in favor of PWA integrated approach
    this.dispatchEvent('pwa:disable-version-polling', {
      reason: 'PWA integrated version checking active',
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

    // Set up periodic logging for PWA update checks
    if (this.config.debug) {
      this.setupPWAPollingLogs();
    }

    // Listen for version checker events and forward to PWA update system
    document.addEventListener('version:update-available', (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail.updateType !== 'service-worker') {
        if (this.config.debug) {
          console.log(
            '🔄 Version checker update detected, handling via PWA system:',
            customEvent.detail
          );
        }
        // Allow version checker updates to be processed normally
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
      // PWA functionality is handled by Service Worker automatically
      if (this.config.debug) {
        console.log('✅ PWA enabled - using native Service Worker updates');
      }
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
      if (this.config.debug) {
        console.log('⏹️ PWA disabled');
      }
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
      if (this.config.debug) {
        console.log('🧹 PWA caches cleared');
      }
    } catch (error) {
      if (this.config.debug) {
        console.warn('Failed to clear caches:', error);
      }
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
   * Set up integrated PWA version checking with update detection
   */
  private setupPWAPollingLogs(): void {
    // Monitor version.json requests for polling logs and version comparison
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const request = args[0];
      const url = typeof request === 'string' ? request : (request as Request).url;

      if (url.includes('/version.json')) {
        if (this.config.debug) {
          console.log('🔄 PWA: Polling version.json', {
            url,
            timestamp: new Date().toISOString(),
            localTime: new Date().toLocaleString('ja-JP'),
            source: 'pwa-integrated-polling',
            requestType: typeof request === 'string' ? 'string' : 'Request object',
          });
        }

        try {
          const response = await originalFetch(...args);
          if (response.ok) {
            const clonedResponse = response.clone();
            const versionData = await clonedResponse.json();

            if (this.config.debug) {
              console.log('✅ PWA: Polling response received', {
                status: response.status,
                statusText: response.statusText,
                fromCache:
                  response.headers.has('cf-cache-status') || response.headers.has('x-cache'),
                version: versionData.version,
                buildId: versionData.buildId,
                gitCommit: versionData.gitCommit,
                environment: versionData.environment,
                timestamp: new Date().toISOString(),
                localTime: new Date().toLocaleString('ja-JP'),
              });
            }

            // Perform version comparison and update detection
            const updateDetected = this.checkForVersionUpdate(versionData);
            if (updateDetected) {
              if (this.config.debug) {
                console.log('🚨 PWA: Version update detected!', {
                  currentVersion: this.versionState.currentVersion,
                  latestVersion: versionData,
                  timestamp: new Date().toISOString(),
                });
              }

              // Dispatch version update event
              this.dispatchEvent('version:update-available', {
                currentVersion: this.versionState.currentVersion,
                latestVersion: versionData,
                updateType: 'pwa-integrated',
                source: 'pwa-system',
                timestamp: Date.now(),
              });
            }

            // Update stored version state
            this.updateVersionState(versionData);
          }
          return response;
        } catch (error) {
          if (this.config.debug) {
            console.error('❌ PWA: Polling failed', {
              url,
              error: error instanceof Error ? error.message : String(error),
              timestamp: new Date().toISOString(),
            });
          }
          throw error;
        }
      }

      return originalFetch(...args);
    };

    // Log PWA polling intervals
    setInterval(() => {
      if (this.config.debug) {
        console.log('📊 PWA: Polling status check', {
          initialized: this.initialized,
          serviceWorkerActive: 'serviceWorker' in navigator && navigator.serviceWorker.controller,
          serviceWorkerReady: navigator.serviceWorker.ready !== undefined,
          timestamp: new Date().toISOString(),
          localTime: new Date().toLocaleString('ja-JP'),
          checkInterval: this.config.versionCheckInterval,
          nextCheckIn: `${this.config.versionCheckInterval || 30000}ms`,
          pwaStatus: 'monitoring',
        });
      }
    }, this.config.versionCheckInterval || 30000);
  }

  /**
   * Load version state from localStorage
   */
  private loadVersionState(): PWAVersionState {
    try {
      const stored = localStorage.getItem(this.VERSION_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        return {
          currentVersion: data.currentVersion || null,
          lastCheckedAt: data.lastCheckedAt || null,
          updateAvailable: data.updateAvailable || false,
        };
      }
    } catch (error) {
      if (this.config.debug) {
        console.warn('Failed to load PWA version state:', error);
      }
    }

    // Return default state
    return {
      currentVersion: null,
      lastCheckedAt: null,
      updateAvailable: false,
    };
  }

  /**
   * Save version state to localStorage
   */
  private saveVersionState(): void {
    try {
      localStorage.setItem(this.VERSION_STORAGE_KEY, JSON.stringify(this.versionState));
    } catch (error) {
      if (this.config.debug) {
        console.warn('Failed to save PWA version state:', error);
      }
    }
  }

  /**
   * Check if a version update is available
   */
  private checkForVersionUpdate(latest: VersionInfo): boolean {
    const current = this.versionState.currentVersion;

    // If no current version, this is the first check
    if (!current) {
      return false;
    }

    // Compare version identifiers
    const isUpdate =
      current.buildId !== latest.buildId ||
      current.gitCommit !== latest.gitCommit ||
      (current.dataHash && latest.dataHash && current.dataHash !== latest.dataHash) ||
      current.version !== latest.version;

    if (this.config.debug && isUpdate) {
      console.log('🔍 PWA: Version comparison details', {
        'buildId changed': current.buildId !== latest.buildId,
        'gitCommit changed': current.gitCommit !== latest.gitCommit,
        'dataHash changed': current.dataHash !== latest.dataHash,
        'version changed': current.version !== latest.version,
        current: current,
        latest: latest,
      });
    }

    return isUpdate;
  }

  /**
   * Update version state with new version info
   */
  private updateVersionState(latest: VersionInfo): void {
    this.versionState = {
      currentVersion: latest,
      lastCheckedAt: Date.now(),
      updateAvailable: false, // Reset after processing
    };
    this.saveVersionState();

    if (this.config.debug) {
      console.log('💾 PWA: Version state updated', this.versionState);
    }
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

    // PWA integrated version checker API
    windowWithBeaver.beaverSystems.versionChecker = {
      getState: () => ({
        currentVersion: this.versionState.currentVersion,
        lastCheckedAt: this.versionState.lastCheckedAt,
        updateAvailable: this.versionState.updateAvailable,
        source: 'pwa-integrated',
        enabled: true,
      }),
      getConfig: () => ({
        enabled: true,
        checkInterval: this.config.versionCheckInterval,
        source: 'pwa-integrated',
        debug: this.config.debug,
      }),
      checkVersion: async () => {
        try {
          const baseUrl = window.location.pathname.includes('/beaver')
            ? window.location.origin + '/beaver'
            : window.location.origin;
          const response = await fetch(`${baseUrl}/version.json?t=${Date.now()}`);
          const versionData = await response.json();

          const updateAvailable = this.checkForVersionUpdate(versionData);
          this.updateVersionState(versionData);

          return {
            success: true,
            updateAvailable,
            currentVersion: this.versionState.currentVersion,
            latestVersion: versionData,
            checkedAt: Date.now(),
            source: 'pwa-integrated-manual',
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            source: 'pwa-integrated-manual',
          };
        }
      },
    };

    // Debug utilities
    if (this.config.debug) {
      windowWithBeaver.beaverPWA = {
        status: () => this.getStatus(),
        clearCaches: () => this.clearCaches(),
        forceUpdate: () => this.forceUpdate(),
        getCacheInfo: () => this.getCacheInfo(),
        enablePWA: () => this.enablePWA(),
        disablePWA: () => this.disablePWA(),
        getVersionState: () => this.versionState,
        clearVersionState: () => {
          localStorage.removeItem(this.VERSION_STORAGE_KEY);
          this.versionState = this.loadVersionState();
          if (this.config.debug) {
            console.log('🗑️ PWA: Version state cleared');
          }
        },
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

      if (this.config.debug) {
        console.log('🔄 PWA System destroyed');
      }
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
      initializePWA({ debug: true }); // Force debug mode for polling logs
    });
  } else {
    initializePWA({ debug: true }); // Force debug mode for polling logs
  }
}

export default initializePWA;

/**
 * Version Checker Module
 *
 * Provides frontend functionality for checking version updates and managing
 * client-side version state for auto-reload feature implementation.
 *
 * @module VersionChecker
 */

import { z } from 'zod';
import { VersionInfoSchema } from './schemas';
import type { VersionInfo } from './types';

// Extended version checking types
export const VersionCheckConfigSchema = z.object({
  /** URL endpoint for version.json (can be relative or absolute) */
  versionUrl: z.string().min(1).default('/beaver/version.json'),
  /** Check interval in milliseconds (default: 30 seconds) */
  checkInterval: z.number().int().min(5000).max(3600000).default(30000),
  /** Enable/disable automatic checking */
  enabled: z.boolean().default(true),
  /** Maximum number of retry attempts on failure */
  maxRetries: z.number().int().min(0).max(10).default(3),
  /** Retry delay in milliseconds */
  retryDelay: z.number().int().min(1000).max(60000).default(5000),
});

export const VersionCheckStateSchema = z.object({
  /** Current version information */
  currentVersion: VersionInfoSchema.nullable(),
  /** Timestamp of last successful check */
  lastCheckedAt: z.number().int().positive().nullable(),
  /** Number of consecutive check failures */
  failureCount: z.number().int().min(0).default(0),
  /** Whether a new version is available */
  updateAvailable: z.boolean().default(false),
  /** Latest available version info */
  latestVersion: VersionInfoSchema.nullable(),
});

export const VersionCheckResultSchema = z.object({
  /** Whether check was successful */
  success: z.boolean(),
  /** Update availability status */
  updateAvailable: z.boolean(),
  /** Current version info */
  currentVersion: VersionInfoSchema.nullable(),
  /** Latest version info */
  latestVersion: VersionInfoSchema.nullable(),
  /** Timestamp of the check */
  checkedAt: z.number().int().positive(),
  /** Error message if check failed */
  error: z.string().optional(),
});

// Infer TypeScript types from Zod schemas
export type VersionCheckConfig = z.infer<typeof VersionCheckConfigSchema>;
export type VersionCheckState = z.infer<typeof VersionCheckStateSchema>;
export type VersionCheckResult = z.infer<typeof VersionCheckResultSchema>;

// Constants
export const VERSION_CHECKER_CONSTANTS = {
  STORAGE_KEY: 'beaver_version_state',
  DEFAULT_CONFIG: {
    versionUrl: '/beaver/version.json',
    checkInterval: 30000, // 30 seconds
    enabled: true,
    maxRetries: 3,
    retryDelay: 5000,
  } as const,
  EVENTS: {
    UPDATE_AVAILABLE: 'version:update-available',
    CHECK_STARTED: 'version:check-started',
    CHECK_COMPLETED: 'version:check-completed',
    CHECK_FAILED: 'version:check-failed',
  } as const,
} as const;

/**
 * Version Checker Class
 *
 * Manages periodic version checking and state persistence
 */
export class VersionChecker {
  private config: VersionCheckConfig;
  private state: VersionCheckState;
  private intervalId: NodeJS.Timeout | null = null;
  private eventTarget: EventTarget;

  constructor(config: Partial<VersionCheckConfig> = {}) {
    // Validate and merge config with defaults
    this.config = VersionCheckConfigSchema.parse({
      ...VERSION_CHECKER_CONSTANTS.DEFAULT_CONFIG,
      ...config,
    });

    // Initialize state
    this.state = this.loadState();
    this.eventTarget = new EventTarget();
  }

  /**
   * Start periodic version checking
   */
  public start(): void {
    if (!this.config.enabled || this.intervalId !== null) {
      return;
    }

    // Perform initial check
    this.checkVersion();

    // Set up periodic checking
    this.intervalId = setInterval(() => {
      this.checkVersion();
    }, this.config.checkInterval);
  }

  /**
   * Stop periodic version checking
   */
  public stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Manually trigger a version check
   */
  public async checkVersion(): Promise<VersionCheckResult> {
    const startTime = Date.now();

    this.dispatchEvent(VERSION_CHECKER_CONSTANTS.EVENTS.CHECK_STARTED, {
      timestamp: startTime,
    });

    try {
      const latestVersion = await this.fetchVersionInfo();
      const updateAvailable = this.isUpdateAvailable(this.state.currentVersion, latestVersion);

      // Update state
      this.state = {
        ...this.state,
        lastCheckedAt: startTime,
        failureCount: 0,
        updateAvailable,
        latestVersion,
      };

      // If this is the first check, set current version
      if (!this.state.currentVersion) {
        this.state.currentVersion = latestVersion;
        this.state.updateAvailable = false;
      }

      this.saveState();

      const result: VersionCheckResult = {
        success: true,
        updateAvailable,
        currentVersion: this.state.currentVersion,
        latestVersion,
        checkedAt: startTime,
      };

      this.dispatchEvent(VERSION_CHECKER_CONSTANTS.EVENTS.CHECK_COMPLETED, result);

      if (updateAvailable) {
        this.dispatchEvent(VERSION_CHECKER_CONSTANTS.EVENTS.UPDATE_AVAILABLE, {
          currentVersion: this.state.currentVersion,
          latestVersion,
        });
      }

      return result;
    } catch (error) {
      this.state.failureCount += 1;
      this.saveState();

      const result: VersionCheckResult = {
        success: false,
        updateAvailable: false,
        currentVersion: this.state.currentVersion,
        latestVersion: null,
        checkedAt: startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      this.dispatchEvent(VERSION_CHECKER_CONSTANTS.EVENTS.CHECK_FAILED, result);

      return result;
    }
  }

  /**
   * Fetch version information from server
   */
  private async fetchVersionInfo(): Promise<VersionInfo> {
    const response = await fetch(this.config.versionUrl, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch version info: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Validate the response data
    const validationResult = VersionInfoSchema.safeParse(data);
    if (!validationResult.success) {
      throw new Error(`Invalid version data: ${validationResult.error.message}`);
    }

    return validationResult.data;
  }

  /**
   * Check if an update is available
   */
  private isUpdateAvailable(current: VersionInfo | null, latest: VersionInfo): boolean {
    if (!current) {
      return false;
    }

    // Check if versions are different
    if (current.version !== latest.version) {
      return true;
    }

    // Check if build ID is different (for same version with different builds)
    if (current.buildId !== latest.buildId) {
      return true;
    }

    // Check if git commit is different
    if (current.gitCommit !== latest.gitCommit) {
      return true;
    }

    // Check if data hash is different (content updates)
    if (current.dataHash && latest.dataHash && current.dataHash !== latest.dataHash) {
      return true;
    }

    return false;
  }

  /**
   * Load state from localStorage
   */
  private loadState(): VersionCheckState {
    try {
      const stored = localStorage.getItem(VERSION_CHECKER_CONSTANTS.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        const validationResult = VersionCheckStateSchema.safeParse(data);
        if (validationResult.success) {
          return validationResult.data;
        }
      }
    } catch (error) {
      console.warn('Failed to load version checker state:', error);
    }

    // Return default state
    return {
      currentVersion: null,
      lastCheckedAt: null,
      failureCount: 0,
      updateAvailable: false,
      latestVersion: null,
    };
  }

  /**
   * Save state to localStorage
   */
  private saveState(): void {
    try {
      localStorage.setItem(VERSION_CHECKER_CONSTANTS.STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.warn('Failed to save version checker state:', error);
    }
  }

  /**
   * Dispatch custom events
   */
  private dispatchEvent(type: string, detail: any): void {
    this.eventTarget.dispatchEvent(new CustomEvent(type, { detail }));
  }

  /**
   * Add event listener for version checking events
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
   * Get current state (read-only)
   */
  public getState(): Readonly<VersionCheckState> {
    return { ...this.state };
  }

  /**
   * Get current configuration (read-only)
   */
  public getConfig(): Readonly<VersionCheckConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<VersionCheckConfig>): void {
    const wasRunning = this.intervalId !== null;

    if (wasRunning) {
      this.stop();
    }

    this.config = VersionCheckConfigSchema.parse({
      ...this.config,
      ...newConfig,
    });

    if (wasRunning && this.config.enabled) {
      this.start();
    }
  }

  /**
   * Mark current version as acknowledged (user has seen the update notification)
   */
  public acknowledgeUpdate(): void {
    if (this.state.latestVersion) {
      this.state.currentVersion = this.state.latestVersion;
      this.state.updateAvailable = false;
      this.saveState();
    }
  }

  /**
   * Reset version checker state
   */
  public reset(): void {
    this.state = {
      currentVersion: null,
      lastCheckedAt: null,
      failureCount: 0,
      updateAvailable: false,
      latestVersion: null,
    };
    this.saveState();
  }
}

/**
 * Utility functions for version comparison
 */
export const VersionUtils = {
  /**
   * Compare two version strings
   */
  compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    const maxLength = Math.max(v1Parts.length, v2Parts.length);

    for (let i = 0; i < maxLength; i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;

      if (v1Part < v2Part) return -1;
      if (v1Part > v2Part) return 1;
    }

    return 0;
  },

  /**
   * Check if version1 is newer than version2
   */
  isNewer(version1: string, version2: string): boolean {
    return VersionUtils.compareVersions(version1, version2) > 0;
  },

  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  },

  /**
   * Calculate time since last check
   */
  getTimeSinceCheck(lastCheckedAt: number | null): string {
    if (!lastCheckedAt) return 'Never';

    const now = Date.now();
    const diff = now - lastCheckedAt;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    if (minutes > 0) {
      return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    }
    return `${seconds} second${seconds === 1 ? '' : 's'} ago`;
  },
};

/**
 * Create a singleton instance of VersionChecker
 */
let globalVersionChecker: VersionChecker | null = null;

export function createVersionChecker(config?: Partial<VersionCheckConfig>): VersionChecker {
  if (!globalVersionChecker) {
    globalVersionChecker = new VersionChecker(config);
  }
  return globalVersionChecker;
}

export function getVersionChecker(): VersionChecker | null {
  return globalVersionChecker;
}

/**
 * Destroy the global version checker instance
 */
export function destroyVersionChecker(): void {
  if (globalVersionChecker) {
    globalVersionChecker.stop();
    globalVersionChecker = null;
  }
}

// Export default instance creation function
export default createVersionChecker;

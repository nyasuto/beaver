/**
 * Enhanced Configuration Manager
 *
 * This module provides advanced configuration management capabilities for the
 * classification system, including repository-specific configurations, dynamic
 * weight management, and configuration caching.
 *
 * @module EnhancedConfigManager
 */

// Server-side only - these will be undefined in browser
let fs: any, path: any;

try {
  // Check for Node.js environment (including test environment)
  if (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions?.node) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    path = require('path');
  }
} catch {
  // Browser environment - fs and path will remain undefined
}
import {
  type EnhancedClassificationConfig,
  type ConfigurationProfile,
  type ConfigurationUpdate,
  validateEnhancedConfig,
  validateConfigurationProfile,
  validateConfigurationUpdate,
  DEFAULT_ENHANCED_CONFIG,
} from '../schemas/classification';

/**
 * Configuration cache entry
 */
interface ConfigCacheEntry {
  config: EnhancedClassificationConfig;
  timestamp: number;
  ttl: number;
}

/**
 * Configuration source types
 */
type ConfigSource = 'file' | 'api' | 'memory' | 'fallback';

/**
 * Configuration loading result
 */
interface ConfigLoadResult {
  config: EnhancedClassificationConfig;
  source: ConfigSource;
  loadTime: number;
  fromCache: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Enhanced Configuration Manager
 */
export class EnhancedConfigManager {
  private configCache = new Map<string, ConfigCacheEntry>();
  private profileCache = new Map<string, ConfigurationProfile>();
  private readonly defaultCacheTtl = 300000; // 5 minutes in milliseconds
  private readonly configPaths: string[];

  constructor(configPaths: string[] = []) {
    this.configPaths =
      configPaths.length > 0
        ? configPaths
        : path
          ? [
              path.join(process.cwd(), 'src/data/config/default-classification.json'),
              path.join(process.cwd(), 'src/data/config/classification-rules.json'),
              path.join(process.cwd(), 'classification-config.json'),
            ]
          : [];
  }

  /**
   * Load configuration with automatic fallback and caching
   */
  async loadConfig(
    repositoryContext?: { owner: string; repo: string },
    profileId?: string
  ): Promise<ConfigLoadResult> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(repositoryContext, profileId);

    // Check cache first
    const cached = this.configCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return {
        config: cached.config,
        source: 'memory',
        loadTime: Date.now() - startTime,
        fromCache: true,
        errors: [],
        warnings: [],
      };
    }

    const result: ConfigLoadResult = {
      config: DEFAULT_ENHANCED_CONFIG,
      source: 'fallback',
      loadTime: 0,
      fromCache: false,
      errors: [],
      warnings: [],
    };

    try {
      // Load base configuration
      const baseConfig = await this.loadBaseConfig();

      // Load profile-specific configuration if specified
      if (profileId) {
        const profileConfig = await this.loadProfileConfig(profileId);
        if (profileConfig) {
          // Merge profile configuration with base configuration
          result.config = this.mergeConfigurations(baseConfig, profileConfig.config);
          result.source = 'file';
        }
      } else {
        result.config = baseConfig;
        result.source = 'file';
      }

      // Apply repository-specific overrides
      if (repositoryContext) {
        result.config = this.applyRepositoryOverrides(result.config, repositoryContext);
      }

      // Cache the result
      this.configCache.set(cacheKey, {
        config: result.config,
        timestamp: Date.now(),
        ttl: this.defaultCacheTtl,
      });
    } catch (error) {
      result.errors.push(
        `Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      result.warnings.push('Using fallback configuration');
    }

    result.loadTime = Date.now() - startTime;
    return result;
  }

  /**
   * Force load configuration from file (for testing)
   */
  public async forceLoadConfigFromFile(): Promise<EnhancedClassificationConfig> {
    try {
      // Dynamic import for test environment
      const { readFileSync } = await import('fs');
      const { join } = await import('path');

      const configPath = join(process.cwd(), 'src/data/config/default-classification.json');
      const rawConfig = readFileSync(configPath, 'utf8');
      const parsedConfig = JSON.parse(rawConfig);

      if (this.isEnhancedConfig(parsedConfig)) {
        return validateEnhancedConfig(parsedConfig);
      } else {
        return this.convertLegacyConfig(parsedConfig);
      }
    } catch (error) {
      console.warn('Force load failed:', error);
      return DEFAULT_ENHANCED_CONFIG;
    }
  }

  /**
   * Load base configuration from file
   */
  private async loadBaseConfig(): Promise<EnhancedClassificationConfig> {
    // Browser environment - return default config
    if (!fs || !path) {
      console.warn('Enhanced Config Manager: Running in browser environment, using default config');
      return DEFAULT_ENHANCED_CONFIG;
    }

    console.log('Enhanced Config Manager: Running in Node.js environment, loading config files');

    for (const configPath of this.configPaths) {
      try {
        if (fs.existsSync(configPath)) {
          const rawConfig = fs.readFileSync(configPath, 'utf8');
          const parsedConfig = JSON.parse(rawConfig);

          // Validate and enhance the configuration
          if (this.isEnhancedConfig(parsedConfig)) {
            return validateEnhancedConfig(parsedConfig);
          } else {
            // Convert legacy config to enhanced config
            return this.convertLegacyConfig(parsedConfig);
          }
        }
      } catch (error) {
        console.warn(`Failed to load config from ${configPath}:`, error);
        continue;
      }
    }

    return DEFAULT_ENHANCED_CONFIG;
  }

  /**
   * Load profile configuration
   */
  private async loadProfileConfig(profileId: string): Promise<ConfigurationProfile | null> {
    const cached = this.profileCache.get(profileId);
    if (cached) {
      return cached;
    }

    // Browser environment - return null
    if (!fs || !path) {
      return null;
    }

    const profilePath = path.join(process.cwd(), 'src/data/config/profiles', `${profileId}.json`);

    try {
      if (fs.existsSync(profilePath)) {
        const rawProfile = fs.readFileSync(profilePath, 'utf8');
        const parsedProfile = JSON.parse(rawProfile);
        const profile = validateConfigurationProfile(parsedProfile);

        this.profileCache.set(profileId, profile);
        return profile;
      }
    } catch (error) {
      console.warn(`Failed to load profile ${profileId}:`, error);
    }

    return null;
  }

  /**
   * Apply repository-specific configuration overrides
   */
  private applyRepositoryOverrides(
    config: EnhancedClassificationConfig,
    repositoryContext: { owner: string; repo: string }
  ): EnhancedClassificationConfig {
    const repoConfig = config.repositories?.find(
      repo => repo.owner === repositoryContext.owner && repo.repo === repositoryContext.repo
    );

    if (!repoConfig || !repoConfig.enabled) {
      return config;
    }

    // Apply repository-specific overrides
    // This is a simplified implementation - in practice, you'd have more sophisticated override logic
    return {
      ...config,
      metadata: {
        ...config.metadata,
        configSource: config.metadata?.configSource || 'file',
        tags: config.metadata?.tags || [],
      },
    };
  }

  /**
   * Update configuration dynamically
   */
  async updateConfiguration(
    update: ConfigurationUpdate,
    repositoryContext?: { owner: string; repo: string }
  ): Promise<{ success: boolean; errors: string[]; warnings: string[] }> {
    const result: { success: boolean; errors: string[]; warnings: string[] } = {
      success: false,
      errors: [],
      warnings: [],
    };

    try {
      validateConfigurationUpdate(update);

      const configResult = await this.loadConfig(repositoryContext);
      const updatedConfig = this.applyConfigurationUpdate(configResult.config, update);

      // Validate the updated configuration
      const validatedConfig = validateEnhancedConfig(updatedConfig);

      // Update cache
      const cacheKey = this.getCacheKey(repositoryContext);
      this.configCache.set(cacheKey, {
        config: validatedConfig,
        timestamp: Date.now(),
        ttl: this.defaultCacheTtl,
      });

      result.success = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Failed to update configuration: ${errorMessage}`);
    }

    return result;
  }

  /**
   * Apply a configuration update
   */
  private applyConfigurationUpdate(
    config: EnhancedClassificationConfig,
    update: ConfigurationUpdate
  ): EnhancedClassificationConfig {
    const updatedConfig = { ...config };

    // Simple implementation - in practice, you'd implement more sophisticated path-based updates
    const pathSegments = update.path.split('.');
    let current: any = updatedConfig;

    for (let i = 0; i < pathSegments.length - 1; i++) {
      const segment = pathSegments[i];
      if (segment && !current[segment]) {
        current[segment] = {};
      }
      if (segment) {
        current = current[segment];
      }
    }

    const lastSegment = pathSegments[pathSegments.length - 1];

    if (lastSegment) {
      switch (update.operation) {
        case 'set':
          current[lastSegment] = update.value;
          break;
        case 'merge':
          if (typeof current[lastSegment] === 'object' && typeof update.value === 'object') {
            current[lastSegment] = { ...current[lastSegment], ...update.value };
          } else {
            current[lastSegment] = update.value;
          }
          break;
        case 'append':
          if (Array.isArray(current[lastSegment])) {
            current[lastSegment].push(update.value);
          } else {
            current[lastSegment] = [update.value];
          }
          break;
        case 'remove':
          delete current[lastSegment];
          break;
      }
    }

    return updatedConfig;
  }

  /**
   * Save configuration to file
   */
  async saveConfig(
    config: EnhancedClassificationConfig,
    pathParam?: string
  ): Promise<{ success: boolean; errors: string[] }> {
    const result: { success: boolean; errors: string[] } = { success: false, errors: [] };

    // Browser environment - return error
    if (!fs || !path) {
      result.errors.push('File system operations not available in browser environment');
      return result;
    }

    const configPath = pathParam || this.configPaths[0];

    if (!configPath) {
      result.errors.push('No configuration path available');
      return result;
    }

    try {
      // Validate configuration before saving
      const validatedConfig = validateEnhancedConfig(config);

      // Ensure directory exists
      const dir = path.dirname(configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Save configuration
      fs.writeFileSync(configPath, JSON.stringify(validatedConfig, null, 2));

      // Clear cache to force reload
      this.configCache.clear();

      result.success = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Failed to save configuration: ${errorMessage}`);
    }

    return result;
  }

  /**
   * Get effective configuration for a repository
   */
  async getEffectiveConfig(
    repositoryContext: { owner: string; repo: string },
    profileId?: string
  ): Promise<EnhancedClassificationConfig> {
    const result = await this.loadConfig(repositoryContext, profileId);
    return result.config;
  }

  /**
   * Clear configuration cache
   */
  clearCache(): void {
    this.configCache.clear();
    this.profileCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    configCacheSize: number;
    profileCacheSize: number;
    configCacheHitRate: number;
  } {
    // This would need to be implemented with actual hit/miss tracking
    return {
      configCacheSize: this.configCache.size,
      profileCacheSize: this.profileCache.size,
      configCacheHitRate: 0, // Placeholder
    };
  }

  /**
   * Validate configuration
   */
  validateConfiguration(config: unknown): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const result: { valid: boolean; errors: string[]; warnings: string[] } = {
      valid: false,
      errors: [],
      warnings: [],
    };

    try {
      validateEnhancedConfig(config);
      result.valid = true;
    } catch (error) {
      if (error instanceof Error) {
        result.errors.push(error.message);
      } else {
        result.errors.push('Unknown validation error');
      }
    }

    return result;
  }

  /**
   * Helper methods
   */
  private getCacheKey(
    repositoryContext?: { owner: string; repo: string },
    profileId?: string
  ): string {
    const parts = ['config'];
    if (repositoryContext) {
      parts.push(repositoryContext.owner, repositoryContext.repo);
    }
    if (profileId) {
      parts.push(profileId);
    }
    return parts.join(':');
  }

  private isEnhancedConfig(config: any): boolean {
    return config.version && config.version.startsWith('2.') && config.repositories !== undefined;
  }

  private convertLegacyConfig(legacyConfig: any): EnhancedClassificationConfig {
    return {
      ...DEFAULT_ENHANCED_CONFIG,
      ...legacyConfig,
      version: '2.0.0',
      repositories: [],
      customRules: [],
    };
  }

  private mergeConfigurations(
    base: EnhancedClassificationConfig,
    override: EnhancedClassificationConfig
  ): EnhancedClassificationConfig {
    return {
      ...base,
      ...override,
      rules: [...(base.rules || []), ...(override.rules || [])],
      customRules: [...(base.customRules || []), ...(override.customRules || [])],
      repositories: [...(base.repositories || []), ...(override.repositories || [])],
    };
  }
}

/**
 * Default enhanced configuration manager instance
 */
export const enhancedConfigManager = new EnhancedConfigManager();

/**
 * Helper function to load configuration
 */
export async function loadEnhancedConfig(
  repositoryContext?: { owner: string; repo: string },
  profileId?: string
): Promise<EnhancedClassificationConfig> {
  const result = await enhancedConfigManager.loadConfig(repositoryContext, profileId);
  return result.config;
}

/**
 * Helper function to update configuration
 */
export async function updateEnhancedConfig(
  update: ConfigurationUpdate,
  repositoryContext?: { owner: string; repo: string }
): Promise<{ success: boolean; errors: string[]; warnings: string[] }> {
  return await enhancedConfigManager.updateConfiguration(update, repositoryContext);
}

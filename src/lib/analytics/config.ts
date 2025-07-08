/**
 * Classification Configuration Loader
 *
 * This module handles loading and parsing of classification configuration
 * from YAML files and provides typed configuration objects.
 *
 * @module ClassificationConfig
 */

import { readFileSync, statSync, accessSync, constants } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
import { ClassificationConfigSchema, type ClassificationConfig } from '../schemas/classification';

/**
 * Default configuration file path
 */
const DEFAULT_CONFIG_PATH = join(process.cwd(), 'config', 'classification-rules.yaml');

/**
 * Configuration loader class
 */
export class ConfigLoader {
  private configPath: string;
  private cachedConfig: ClassificationConfig | null = null;
  private lastModified: number = 0;

  constructor(configPath?: string) {
    this.configPath = configPath || DEFAULT_CONFIG_PATH;
  }

  /**
   * Load configuration from YAML file
   */
  loadConfig(): ClassificationConfig {
    try {
      // Check if we need to reload (file modification time)
      const stats = statSync(this.configPath);
      const currentModified = stats.mtime.getTime();

      if (this.cachedConfig && currentModified === this.lastModified) {
        return this.cachedConfig;
      }

      // Read and parse YAML file
      const yamlContent = readFileSync(this.configPath, 'utf8');
      const rawConfig = yaml.load(yamlContent) as unknown;

      // Validate configuration with Zod schema
      const config = ClassificationConfigSchema.parse(rawConfig);

      // Cache the configuration
      this.cachedConfig = config;
      this.lastModified = currentModified;

      return config;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load classification config: ${error.message}`);
      }
      throw new Error('Failed to load classification config: Unknown error');
    }
  }

  /**
   * Validate configuration without caching
   */
  validateConfig(configPath?: string): { valid: boolean; errors: string[] } {
    const path = configPath || this.configPath;
    const errors: string[] = [];

    try {
      const yamlContent = readFileSync(path, 'utf8');
      const rawConfig = yaml.load(yamlContent) as unknown;

      ClassificationConfigSchema.parse(rawConfig);

      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof Error) {
        errors.push(error.message);
      } else {
        errors.push('Unknown validation error');
      }

      return { valid: false, errors };
    }
  }

  /**
   * Get configuration file path
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Set new configuration file path
   */
  setConfigPath(path: string): void {
    this.configPath = path;
    this.cachedConfig = null; // Clear cache
    this.lastModified = 0;
  }

  /**
   * Clear cached configuration
   */
  clearCache(): void {
    this.cachedConfig = null;
    this.lastModified = 0;
  }

  /**
   * Check if configuration file exists
   */
  configExists(): boolean {
    try {
      accessSync(this.configPath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Default configuration loader instance
 */
export const defaultConfigLoader = new ConfigLoader();

/**
 * Convenience function to load configuration
 */
export function loadClassificationConfig(configPath?: string): ClassificationConfig {
  const loader = configPath ? new ConfigLoader(configPath) : defaultConfigLoader;
  return loader.loadConfig();
}

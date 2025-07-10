/**
 * Classification Configuration Loader
 *
 * Loads and validates classification rules from configuration files.
 */

import { ClassificationConfigSchema, type ClassificationConfig } from '../schemas/classification';
import classificationRulesConfig from '../../data/config/classification-rules.json';

/**
 * Load classification configuration from JSON
 */
export function loadClassificationConfig(): ClassificationConfig {
  try {
    // Parse and validate the configuration
    const config = ClassificationConfigSchema.parse(classificationRulesConfig);
    return config;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load classification configuration:', error);

    // Return a minimal fallback configuration
    return {
      version: '1.0.0',
      minConfidence: 0.3,
      maxCategories: 3,
      enableAutoClassification: true,
      enablePriorityEstimation: true,
      rules: [],
      categoryWeights: {
        bug: 1.0,
        security: 1.0,
        feature: 0.8,
        enhancement: 0.7,
        performance: 0.8,
        documentation: 0.5,
        question: 0.4,
        duplicate: 0.3,
        invalid: 0.3,
        wontfix: 0.3,
        'help-wanted': 0.6,
        'good-first-issue': 0.5,
        refactor: 0.6,
        test: 0.5,
        'ci-cd': 0.6,
        dependencies: 0.5,
      },
      priorityWeights: {
        critical: 1.0,
        high: 0.8,
        medium: 0.6,
        low: 0.4,
        backlog: 0.2,
      },
    };
  }
}

/**
 * Get classification engine with loaded configuration
 */
export function getClassificationEngine() {
  const config = loadClassificationConfig();

  // Import the engine class dynamically to avoid circular dependencies
  return import('./engine').then(module => {
    return new module.IssueClassificationEngine(config);
  });
}

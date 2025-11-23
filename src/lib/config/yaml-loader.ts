/**
 * YAML configuration loader for beaver.yml
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { DocsConfig } from '../types/docs-config.js';

/**
 * Simple YAML parser for basic beaver.yml structure
 * Note: This is a minimal implementation. For production, consider using a proper YAML library
 */
function parseSimpleYaml(content: string): any {
  const lines = content.split('\n');
  const result: any = {};
  let currentSection: any = result;
  const sectionStack: any[] = [result];
  let currentIndent = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Calculate indentation
    const indent = line.length - line.trimStart().length;

    // Handle indentation changes
    if (indent < currentIndent) {
      // Pop sections until we match the indentation
      while (sectionStack.length > 1 && indent < currentIndent) {
        sectionStack.pop();
        currentIndent -= 2; // Assuming 2-space indentation
      }
      currentSection = sectionStack[sectionStack.length - 1];
    }

    currentIndent = indent;

    if (trimmed.includes(':')) {
      const [key, ...valueParts] = trimmed.split(':');
      const value = valueParts.join(':').trim();

      if (!key) continue;

      if (value) {
        // Simple key-value pair
        currentSection[key.trim()] = parseValue(value);
      } else {
        // New section
        const keyTrimmed = key.trim();
        currentSection[keyTrimmed] = {};
        sectionStack.push(currentSection[keyTrimmed]);
        currentSection = currentSection[keyTrimmed];
        currentIndent += 2;
      }
    } else if (trimmed.startsWith('- ')) {
      // Array item
      const value = trimmed.slice(2).trim();
      if (!Array.isArray(currentSection._array)) {
        currentSection._array = [];
      }

      if (value.includes(':')) {
        // Object in array
        const obj: any = {};
        const [key, ...valueParts] = value.split(':');
        if (key) {
          obj[key.trim()] = parseValue(valueParts.join(':').trim());
          currentSection._array.push(obj);
        }
      } else {
        // Simple value in array
        currentSection._array.push(parseValue(value));
      }
    }
  }

  return cleanupArrays(result);
}

function parseValue(value: string): any {
  // Remove quotes
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  // Parse boolean
  if (value === 'true') return true;
  if (value === 'false') return false;

  // Parse number
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (/^\d+\.\d+$/.test(value)) return parseFloat(value);

  return value;
}

function cleanupArrays(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(cleanupArrays);
  }

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === '_array') {
      return (value as any[]).map(cleanupArrays);
    } else {
      result[key] = cleanupArrays(value);
    }
  }

  return result;
}

/**
 * Load and parse beaver.yml configuration
 */
export async function loadYamlConfig(
  configPath: string = 'beaver.yml',
  rootDir: string = process.cwd()
): Promise<Partial<DocsConfig> | null> {
  try {
    const fullPath = path.join(rootDir, configPath);
    const content = await fs.readFile(fullPath, 'utf-8');

    console.log(`📄 Loading configuration from ${configPath}...`);

    // Parse YAML content
    const yamlData = parseSimpleYaml(content);

    // Transform to DocsConfig structure if needed
    const config: Partial<DocsConfig> = {
      project: yamlData.project || {},
      ui: yamlData.ui || yamlData.docs?.ui || {},
      navigation: yamlData.navigation || yamlData.docs?.navigation || {},
      paths: yamlData.paths || yamlData.docs?.paths || {},
      search: yamlData.search || yamlData.docs?.search || {},
    };

    console.log('✅ YAML configuration loaded successfully');
    return config;
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      console.log(`📄 No ${configPath} found, using auto-detected configuration`);
      return null;
    }

    console.warn(`⚠️  Failed to load ${configPath}:`, error);
    return null;
  }
}

/**
 * Generate example beaver.yml for users
 */
export function generateExampleYaml(detectedConfig: DocsConfig): string {
  return `# Beaver Documentation Configuration
# This file customizes how your documentation is generated and displayed

project:
  name: "${detectedConfig.project.name}"
  ${detectedConfig.project.emoji ? `emoji: "${detectedConfig.project.emoji}"` : '# emoji: "📚"'}
  ${detectedConfig.project.description ? `description: "${detectedConfig.project.description}"` : '# description: "Project documentation"'}
  ${detectedConfig.project.githubUrl ? `github: "${detectedConfig.project.githubUrl}"` : '# github: "https://github.com/owner/repo"'}

ui:
  language: "${detectedConfig.ui?.language || 'en'}"  # en | ja
  theme: "${detectedConfig.ui?.theme || 'default'}"  # default | minimal | modern
  showReadingTime: ${detectedConfig.ui?.showReadingTime !== false}
  showWordCount: ${detectedConfig.ui?.showWordCount !== false}
  showLastModified: ${detectedConfig.ui?.showLastModified !== false}

navigation:
  showQuickLinks: ${detectedConfig.navigation?.showQuickLinks !== false}
  showSearch: ${detectedConfig.navigation?.showSearch !== false}
  
  # Custom quick links (optional)
  # quickLinks:
  #   - title: "Quick Start"
  #     href: "/docs/readme"
  #     icon: "🚀"
  #     color: "blue"
  #   - title: "API Reference"
  #     href: "/docs/api"
  #     icon: "📖"
  #     color: "green"

search:
  enabled: ${detectedConfig.search?.enabled !== false}
  placeholder: "${detectedConfig.search?.placeholder || 'Search documentation...'}"
  maxResults: ${detectedConfig.search?.maxResults || 10}

# Advanced configuration (optional)
# paths:
#   docsDir: "docs"
#   baseUrl: "/docs"
`;
}

#!/usr/bin/env node

/**
 * Version JSON Validator
 * 
 * Validates the generated version.json file against the expected schema.
 * This ensures the version information is correctly formatted and complete.
 * 
 * @module ValidateVersion
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

/**
 * Zod-like validation schema for version.json
 */
const VersionSchema = {
  validate(data) {
    const errors = [];
    
    // Check required fields
    const requiredFields = ['version', 'timestamp', 'buildId', 'gitCommit', 'environment'];
    for (const field of requiredFields) {
      if (!(field in data)) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    // Type validations
    if (typeof data.version !== 'string' || data.version.length === 0) {
      errors.push('version must be a non-empty string');
    }
    
    if (typeof data.timestamp !== 'number' || data.timestamp <= 0) {
      errors.push('timestamp must be a positive number');
    }
    
    if (typeof data.buildId !== 'string' || data.buildId.length === 0) {
      errors.push('buildId must be a non-empty string');
    }
    
    if (typeof data.gitCommit !== 'string' || data.gitCommit.length === 0) {
      errors.push('gitCommit must be a non-empty string');
    }
    
    const validEnvironments = ['development', 'production', 'staging'];
    if (!validEnvironments.includes(data.environment)) {
      errors.push(`environment must be one of: ${validEnvironments.join(', ')}`);
    }
    
    // Optional fields validation
    if ('dataHash' in data && typeof data.dataHash !== 'string') {
      errors.push('dataHash must be a string if provided');
    }
    
    return {
      success: errors.length === 0,
      errors
    };
  }
};

/**
 * Validates version.json file
 * @param {string} filePath - Path to version.json file
 * @returns {object} Validation result
 */
function validateVersionFile(filePath) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        errors: [`File not found: ${filePath}`]
      };
    }
    
    // Read and parse JSON
    const content = fs.readFileSync(filePath, 'utf8');
    let data;
    
    try {
      data = JSON.parse(content);
    } catch (parseError) {
      return {
        success: false,
        errors: [`Invalid JSON: ${parseError.message}`]
      };
    }
    
    // Validate against schema
    const validation = VersionSchema.validate(data);
    
    if (validation.success) {
      return {
        success: true,
        data,
        errors: []
      };
    }
    
    return validation;
    
  } catch (error) {
    return {
      success: false,
      errors: [`Validation error: ${error.message}`]
    };
  }
}

/**
 * Performs additional semantic validations
 * @param {object} data - Parsed version data
 * @returns {object} Validation result
 */
function performSemanticValidation(data) {
  const warnings = [];
  
  // Check timestamp is recent (within last 24 hours for production builds)
  const now = Date.now();
  const dayInMs = 24 * 60 * 60 * 1000;
  
  if (data.environment === 'production' && (now - data.timestamp) > dayInMs) {
    warnings.push('Production build timestamp is more than 24 hours old');
  }
  
  // Check git commit format
  if (data.gitCommit !== 'unknown' && !/^[a-f0-9]{7,40}$/.test(data.gitCommit)) {
    warnings.push('Git commit hash appears to be invalid format');
  }
  
  // Check version format (basic semver check)
  if (!/^\d+\.\d+\.\d+/.test(data.version)) {
    warnings.push('Version does not follow semantic versioning format');
  }
  
  // Check build ID format
  if (data.environment === 'production' && data.buildId.startsWith('local-')) {
    warnings.push('Production environment has local build ID');
  }
  
  return {
    success: true,
    warnings
  };
}

/**
 * Main validation function
 */
function main() {
  const versionFilePath = path.join(rootDir, 'public', 'version.json');
  
  console.log('🔍 Validating version.json...');
  console.log(`   File: ${versionFilePath}`);
  
  const validation = validateVersionFile(versionFilePath);
  
  if (!validation.success) {
    console.error('❌ Validation failed:');
    validation.errors.forEach(error => {
      console.error(`   • ${error}`);
    });
    process.exit(1);
  }
  
  console.log('✅ Basic validation passed');
  
  // Perform semantic validation
  const semanticValidation = performSemanticValidation(validation.data);
  
  if (semanticValidation.warnings.length > 0) {
    console.warn('⚠️  Warnings:');
    semanticValidation.warnings.forEach(warning => {
      console.warn(`   • ${warning}`);
    });
  }
  
  // Display version info
  console.log('📋 Version Information:');
  console.log(`   Version: ${validation.data.version}`);
  console.log(`   Timestamp: ${new Date(validation.data.timestamp).toISOString()}`);
  console.log(`   Build ID: ${validation.data.buildId}`);
  console.log(`   Git Commit: ${validation.data.gitCommit}`);
  console.log(`   Environment: ${validation.data.environment}`);
  if (validation.data.dataHash) {
    console.log(`   Data Hash: ${validation.data.dataHash}`);
  }
  
  console.log('✅ Validation completed successfully');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { validateVersionFile, performSemanticValidation, VersionSchema };
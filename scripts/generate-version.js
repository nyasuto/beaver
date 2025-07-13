#!/usr/bin/env node

/**
 * Version JSON Generator
 * 
 * Generates a version.json file containing build metadata for the Beaver application.
 * This file is used by the frontend to check for updates and display version information.
 * 
 * @module GenerateVersion
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

/**
 * Executes a command and returns the trimmed output
 * @param {string} command - Command to execute
 * @param {string} fallback - Fallback value if command fails
 * @returns {string} Command output or fallback
 */
function safeExec(command, fallback = 'unknown') {
  try {
    return execSync(command, { cwd: rootDir }).toString().trim();
  } catch (error) {
    console.warn(`Warning: Failed to execute "${command}": ${error.message}`);
    return fallback;
  }
}

/**
 * Calculates SHA-256 hash of critical data files
 * @returns {string} Hash of combined data files
 */
function calculateDataHash() {
  try {
    const dataFiles = [
      'src/data/github/issues.json',
      'src/data/github/metadata.json',
    ].filter(file => fs.existsSync(path.join(rootDir, file)));

    if (dataFiles.length === 0) {
      return 'no-data';
    }

    const hash = crypto.createHash('sha256');
    dataFiles.forEach(file => {
      const content = fs.readFileSync(path.join(rootDir, file), 'utf8');
      hash.update(content);
    });

    return hash.digest('hex').substring(0, 16);
  } catch (error) {
    console.warn(`Warning: Failed to calculate data hash: ${error.message}`);
    return 'hash-error';
  }
}

/**
 * Reads package.json version
 * @returns {string} Package version
 */
function getPackageVersion() {
  try {
    const packagePath = path.join(rootDir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return packageJson.version || '0.0.0';
  } catch (error) {
    console.warn(`Warning: Failed to read package.json: ${error.message}`);
    return '0.0.0';
  }
}

/**
 * Determines the current environment
 * @returns {string} Environment name
 */
function getEnvironment() {
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'production' || nodeEnv === 'staging' || nodeEnv === 'development') {
    return nodeEnv;
  }
  
  // Detect GitHub Actions
  if (process.env.GITHUB_ACTIONS === 'true') {
    return 'production';
  }
  
  return 'development';
}

/**
 * Generates version information object
 * @returns {object} Version information
 */
function generateVersionInfo() {
  const version = getPackageVersion();
  const timestamp = Date.now();
  const buildId = process.env.GITHUB_RUN_ID || `local-${timestamp}`;
  const gitCommit = safeExec('git rev-parse --short HEAD', 'unknown');
  const environment = getEnvironment();
  const dataHash = calculateDataHash();

  return {
    version,
    timestamp,
    buildId,
    gitCommit,
    environment,
    dataHash
  };
}

/**
 * Main function to generate and write version.json
 */
function main() {
  try {
    console.log('🔄 Generating version.json...');
    
    const versionInfo = generateVersionInfo();
    
    // Ensure public directory exists
    const publicDir = path.join(rootDir, 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // Write version.json
    const outputPath = path.join(publicDir, 'version.json');
    fs.writeFileSync(outputPath, JSON.stringify(versionInfo, null, 2));
    
    console.log('✅ Version.json generated successfully:');
    console.log(`   Version: ${versionInfo.version}`);
    console.log(`   Build ID: ${versionInfo.buildId}`);
    console.log(`   Git Commit: ${versionInfo.gitCommit}`);
    console.log(`   Environment: ${versionInfo.environment}`);
    console.log(`   Data Hash: ${versionInfo.dataHash}`);
    console.log(`   Output: ${outputPath}`);
    
  } catch (error) {
    console.error('❌ Failed to generate version.json:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateVersionInfo, calculateDataHash, getPackageVersion };
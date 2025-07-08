# Data Directory

This directory contains static data files and configuration used by the Beaver
Astro application.

## Structure

- `config/` - Configuration files for various features
- `content/` - Static content files (markdown, JSON, etc.)
- `fixtures/` - Test data and fixtures for development
- `seeds/` - Initial data for database seeding

## File Types

### Configuration Files

- `classification-rules.yaml` - Rules for automatic issue classification
- `category-mapping.json` - Mapping between labels and categories
- `default-settings.json` - Default application settings

### Content Files

- `help-content.md` - Help and documentation content
- `legal/` - Legal documents (privacy policy, terms of service)
- `templates/` - Email and notification templates

### Development Files

- `mock-data.json` - Mock data for development and testing
- `sample-issues.json` - Sample GitHub issues for testing
- `test-fixtures.json` - Test data fixtures

## Usage

Files in this directory are typically imported and used by:

- Configuration modules (`src/lib/config/`)
- Content management systems
- Test suites
- Development tools

## Environment-Specific Data

Some files may have environment-specific versions:

- `config.dev.json` - Development configuration
- `config.prod.json` - Production configuration
- `config.test.json` - Test configuration

## Note

This directory is part of the project's static assets and will be included in
the build output. Avoid storing sensitive information here.

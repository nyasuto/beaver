# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Beaver is a GitHub knowledge base construction tool that transforms development workflows into structured, persistent knowledge. The project converts GitHub Issues, commit logs, and development activities into organized Wiki documentation.

**Core Mission**: Transform flowing development streams into structured knowledge bases, preventing valuable insights from being lost.

## Architecture

**Simplified Single-Service Design:**
- **Backend**: Go services for GitHub API integration and high-performance processing
- **Processing**: Rule-based classification and analysis
- **Output**: GitHub Pages, Wiki platforms (configurable)

**Technology Stack:**
- Go 1.21+ for all services
- GitHub API integration
- Rule-based pattern matching and classification

## Development Phases

The project follows a simplified approach:

1. **Phase 1**: Basic Issues → Wiki conversion with CLI
2. **Phase 2**: Enhanced rule-based processing with GitHub Actions
3. **Phase 3**: Team collaboration features
4. **Phase 4**: Enterprise features and SaaS platform

## Key Commands

Since this is a new project, these commands are planned but not yet implemented:

```bash
# Project setup
beaver init    # Initialize project configuration

# Core operations
beaver build   # Process latest issues to wiki
beaver status  # Show processing status
beaver analyze # Analyze development patterns
beaver generate # Generate wiki content
beaver fetch   # Fetch GitHub data

# Installation (planned)
go install github.com/getbeaver/beaver@latest
```

## Project Structure

The project is organized as:
- `cmd/` - CLI applications
- `pkg/` - Shared Go packages
- `internal/` - Private Go packages
- `templates/` - Wiki generation templates
- `config/` - Configuration examples
- `scripts/` - Build and deployment scripts

## Development Philosophy

**Simple and Reliable:**
- Single binary deployment for easy distribution
- Rule-based processing for predictable results
- Self-documenting: Beaver documents its own development process
- Collaborative development workflow support

## Configuration

The project uses YAML configuration (beaver.yml) for:
- Project metadata
- Source configuration (GitHub integration)
- Output settings (Wiki platforms)
- Classification rules and patterns

## Target Users

1. **Primary**: Individual developers needing organized knowledge bases
2. **Secondary**: Development teams requiring shared documentation
3. **Tertiary**: Project managers and consultants creating structured reports

## Development Requirements

- GitHub Personal Access Token for API access
- Go development environment (1.21+)
- Git repository access for development pattern analysis

## Unique Characteristics

- **Simple and fast**: Single Go binary with no external dependencies
- **Rule-based intelligence**: Reliable pattern recognition without AI complexity
- **Structured output**: Generates organized Wiki documentation
- **Collaborative knowledge building**: Team-focused knowledge aggregation
- **Self-documenting**: The tool documents its own development process
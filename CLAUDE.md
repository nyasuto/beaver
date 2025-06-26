# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Beaver is an AI agent knowledge dam construction tool that transforms AI development workflows into structured, persistent knowledge. The project converts GitHub Issues, commit logs, and AI experiment records into organized Wiki documentation.

**Core Mission**: Transform flowing AI development streams into structured knowledge dams, preventing valuable insights from being lost.

## Architecture

**Multi-Service Design:**
- **Backend**: Go services for GitHub API integration and high-performance processing
- **AI Processing**: Python services using LangChain and OpenAI SDK for ML processing
- **Communication**: REST API between Go and Python services
- **Output**: GitHub Wiki, Notion, Confluence (configurable)

**Technology Stack:**
- Go 1.21+ for backend services
- Python 3.9+ for AI processing
- GitHub API integration
- OpenAI/Anthropic API integration

## Development Phases

The project follows a structured 4-phase approach:

1. **Phase 1 (4 weeks)**: Basic Issues → Wiki conversion with CLI
2. **Phase 2 (8 weeks)**: AI-enhanced processing with GitHub Actions
3. **Phase 3 (12 weeks)**: Team collaboration features
4. **Phase 4 (16+ weeks)**: Enterprise SaaS platform

## Key Commands

Since this is a new project, these commands are planned but not yet implemented:

```bash
# Project setup
beaver init    # Initialize project configuration
beaver config  # Interactive API setup

# Core operations
beaver build   # Process latest issues to wiki
beaver status  # Show processing status
beaver serve   # Display generated wiki

# Installation (planned)
go install github.com/getbeaver/beaver@latest
```

## Project Structure (Planned)

The project will be organized as:
- `cmd/` - CLI applications
- `pkg/` - Shared Go packages
- `internal/` - Private Go packages
- `services/` - Python AI processing services
- `templates/` - Wiki generation templates
- `config/` - Configuration examples

## Development Philosophy

**AI-Agent Driven Development:**
- Uses specialized AI agents for different development tasks (architect, code, test, documentation, review)
- Self-documenting: Beaver will document its own development process
- Collaborative human-AI development approach

## Configuration

The project uses YAML configuration (beaver.yml) for:
- Project metadata
- Source configuration (GitHub integration)
- Output settings (Wiki platforms)
- AI provider settings (OpenAI, Anthropic, local models)

## Target Users

1. **Primary**: Individual AI developers experimenting with AI agents
2. **Secondary**: AI development teams needing shared knowledge bases
3. **Tertiary**: AI consultants and educators creating reusable knowledge assets

## Development Requirements

- GitHub Personal Access Token for API access
- OpenAI API key or other LLM provider credentials
- Go development environment for backend services
- Python environment for AI processing services

## Unique Characteristics

- **Meta-learning**: The tool documents its own development process
- **Multi-modal knowledge extraction**: Processes Issues, commits, and AI logs
- **Structured output**: Generates organized Wiki documentation
- **AI-enhanced intelligence**: Pattern recognition and learning path generation
- **Collaborative knowledge building**: Team-focused knowledge aggregation
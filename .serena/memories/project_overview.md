# Beaver Project Overview

## Purpose
Beaver is an AI-first knowledge management system that transforms GitHub development activities into structured, persistent knowledge bases. It serves as a GitHub Action that processes Issues, commits, and AI experiment records, converting them into structured GitHub Pages documentation with code quality analysis and team collaboration features.

## Key Features
- **AI Issues Analysis**: Automatic classification, priority assignment, and sentiment analysis
- **Quality Dashboard**: Codecov integration for code quality analysis
- **Structured Wiki**: Searchable development knowledge base
- **Auto Deploy**: Automatic deployment to GitHub Pages
- **Real-time Updates**: Automatic updates when Issues change

## Tech Stack
- **Frontend**: Astro 4.0+ (static site generation + hybrid rendering)
- **Language**: TypeScript 5.0+ with strict type checking
- **Styling**: Tailwind CSS (utility-first CSS framework)
- **GitHub Integration**: Octokit for GitHub API interaction
- **Validation**: Zod schemas for all external data
- **Testing**: Vitest with Happy DOM environment
- **Build**: Astro build system with TypeScript compilation

## Repository Structure
- `src/`: Main source code
  - `components/`: UI components
  - `pages/`: Astro pages + API routes
  - `lib/`: Core business logic (GitHub API, types, schemas, utils)
  - `styles/`: Global styles
- `docs/`: Project documentation
- `scripts/`: Build and deployment scripts
- `.github/`: GitHub Actions workflows
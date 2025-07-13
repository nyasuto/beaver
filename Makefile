# Beaver Astro Project Makefile
# AI-first knowledge management system development automation

.PHONY: help install dev build preview clean test lint format type-check quality quality-fix validate analyze deploy setup git-hooks env-info pr-ready generate-version validate-version

# Default target
.DEFAULT_GOAL := help


# Help target
help: ## Show this help message
	@echo "$(CYAN)Beaver Astro Edition - Development Commands$(NC)"
	@echo "$(BLUE)============================================$(NC)"
	@echo ""
	@echo "$(YELLOW)🚀 Quick Start:$(NC)"
	@echo "  make setup    - Initial project setup"
	@echo "  make dev      - Start development server"
	@echo "  make quality  - Run all quality checks"
	@echo ""
	@echo "$(YELLOW)📋 Available Commands:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2}'

# Development Setup
setup: ## Initial project setup (install dependencies + git hooks)
	@echo "$(CYAN)🔧 Setting up Beaver Astro project...$(NC)"
	@$(MAKE) install
	@$(MAKE) git-hooks
	@echo "$(GREEN)✅ Setup complete! Run 'make dev' to start developing.$(NC)"

install: ## Install dependencies
	@echo "$(BLUE)📦 Installing dependencies...$(NC)"
	@npm install
	@echo "$(GREEN)✅ Dependencies installed successfully$(NC)"

# Development Commands
dev: ## Start development server with hot reload
	@echo "$(CYAN)🚀 Starting development server...$(NC)"
	@npm run dev

build: ## Build for production
	@echo "$(BLUE)🏗️  Building for production...$(NC)"
	@npm run build
	@echo "$(GREEN)✅ Build completed successfully$(NC)"

preview: ## Preview production build
	@echo "$(PURPLE)👀 Starting preview server...$(NC)"
	@npm run preview

clean: ## Clean build artifacts and cache
	@echo "$(YELLOW)🧹 Cleaning build artifacts...$(NC)"
	@rm -rf dist/
	@rm -rf .astro/
	@rm -rf node_modules/.cache/
	@rm -rf coverage/
	@echo "$(GREEN)✅ Cleanup completed$(NC)"

# Testing
test: ## Run tests
	@echo "$(BLUE)🧪 Running tests...$(NC)"
	@npm run test

test-watch: ## Run tests in watch mode
	@echo "$(BLUE)🧪 Running tests in watch mode...$(NC)"
	@npm run test:watch

test-coverage: ## Run tests with coverage
	@echo "$(BLUE)🧪 Running tests with coverage...$(NC)"
	@npm run test:coverage

# Version Management
generate-version: ## Generate version.json file
	@echo "$(CYAN)🔄 Generating version.json...$(NC)"
	@npm run generate-version
	@echo "$(GREEN)✅ Version.json generated successfully$(NC)"

validate-version: ## Validate version.json file
	@echo "$(BLUE)🔍 Validating version.json...$(NC)"
	@npm run validate-version
	@echo "$(GREEN)✅ Version.json validation completed$(NC)"

# Code Quality
lint: ## Run linting
	@echo "$(BLUE)🔍 Running linter...$(NC)"
	@npm run lint

lint-fix: ## Run linting with auto-fix
	@echo "$(BLUE)🔧 Running linter with auto-fix...$(NC)"
	@npm run lint:fix

format: ## Format code
	@echo "$(BLUE)💅 Formatting code...$(NC)"
	@npm run format

format-check: ## Check code formatting
	@echo "$(BLUE)💅 Checking code formatting...$(NC)"
	@npm run format:check

type-check: ## Run TypeScript type checking
	@echo "$(BLUE)🔍 Running TypeScript type checking...$(NC)"
	@npm run type-check

# Comprehensive Quality Checks
quality: ## Run all quality checks (lint + format + type-check + test)
	@echo "$(CYAN)🔍 Running comprehensive quality checks...$(NC)"
	@echo "$(BLUE)1/4 Linting...$(NC)"
	@npm run lint
	@echo "$(BLUE)2/4 Format checking...$(NC)"
	@npm run format:check
	@echo "$(BLUE)3/4 Type checking...$(NC)"
	@npm run type-check
	@echo "$(BLUE)4/4 Testing...$(NC)"
	@npm run test
	@echo "$(GREEN)✅ Quality checks completed$(NC)"

quality-fix: ## Run quality checks with auto-fix
	@echo "$(CYAN)🔧 Running quality checks with auto-fix...$(NC)"
	@npm run quality-fix

validate: ## Validate project configuration and dependencies
	@echo "$(BLUE)✅ Validating project...$(NC)"
	@npm run validate

## git-hooks: Setup git pre-commit hooks from .git-hooks folder
git-hooks:
	@echo "🔗 Git pre-commit hookを設定中..."
	@mkdir -p .git/hooks
	@if [ -f .git-hooks/pre-commit ]; then \
		cp .git-hooks/pre-commit .git/hooks/pre-commit; \
		chmod +x .git/hooks/pre-commit; \
		echo "✅ Pre-commit hook設定完了 (.git-hooks/pre-commit から)"; \
	else \
    	echo '#!/bin/sh\nmake quality' > .git/hooks/pre-commit; \
		chmod +x .git/hooks/pre-commit; \
    	echo "✅ Pre-commit hook設定完了 (フォールバック)"; \
	fi

pr-ready: ## Prepare code for pull request (quality + build)
	@echo "$(CYAN)🚀 Preparing for pull request...$(NC)"
	@$(MAKE) quality-fix
	@$(MAKE) build
	@echo "$(GREEN)✅ Ready for pull request!$(NC)"

# Analysis and Documentation
analyze: ## Analyze bundle size and performance
	@echo "$(BLUE)📊 Analyzing bundle...$(NC)"
	@npm run analyze

env-info: ## Show environment information
	@echo "$(CYAN)🔍 Environment Information$(NC)"
	@echo "$(BLUE)========================$(NC)"
	@echo "$(YELLOW)Node.js version:$(NC) $$(node --version)"
	@echo "$(YELLOW)npm version:$(NC) $$(npm --version)"
	@echo "$(YELLOW)OS:$(NC) $$(uname -s)"
	@echo "$(YELLOW)Architecture:$(NC) $$(uname -m)"
	@echo "$(YELLOW)Working directory:$(NC) $$(pwd)"
	@echo "$(YELLOW)Git branch:$(NC) $$(git branch --show-current 2>/dev/null || echo 'Not a git repository')"
	@if [ -f package.json ]; then \
		echo "$(YELLOW)Project version:$(NC) $$(node -p "require('./package.json').version")"; \
	fi

# Deployment
deploy: ## Deploy to GitHub Pages
	@echo "$(PURPLE)🚀 Deploying to GitHub Pages...$(NC)"
	@$(MAKE) build
	@npm run deploy
	@echo "$(GREEN)✅ Deployment completed$(NC)"

# Database and Content (for future use)
content-generate: ## Generate content from GitHub data
	@echo "$(BLUE)📝 Generating content from GitHub data...$(NC)"
	@echo "$(YELLOW)⚠️  Content generation not implemented yet$(NC)"

# Performance and Optimization
optimize: ## Optimize assets and performance
	@echo "$(BLUE)⚡ Optimizing assets...$(NC)"
	@$(MAKE) build
	@$(MAKE) analyze

# Docker Support (for future use)
docker-build: ## Build Docker image
	@echo "$(BLUE)🐳 Building Docker image...$(NC)"
	@echo "$(YELLOW)⚠️  Docker support not implemented yet$(NC)"

docker-run: ## Run Docker container
	@echo "$(BLUE)🐳 Running Docker container...$(NC)"
	@echo "$(YELLOW)⚠️  Docker support not implemented yet$(NC)"

# Emergency Commands
reset: ## Reset project to clean state (removes node_modules)
	@echo "$(RED)🔄 Resetting project to clean state...$(NC)"
	@echo "$(YELLOW)⚠️  This will remove node_modules and package-lock.json$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		rm -rf node_modules/ package-lock.json; \
		echo "$(GREEN)✅ Project reset completed$(NC)"; \
	else \
		echo "$(BLUE)ℹ️  Reset cancelled$(NC)"; \
	fi

# Status and Information
status: ## Show project status
	@echo "$(CYAN)📊 Project Status$(NC)"
	@echo "$(BLUE)===============$(NC)"
	@echo "$(YELLOW)Git status:$(NC)"
	@git status --porcelain 2>/dev/null || echo "Not a git repository"
	@echo ""
	@echo "$(YELLOW)Dependencies:$(NC)"
	@if [ -f package.json ]; then \
		npm list --depth=0 2>/dev/null | head -10; \
	else \
		echo "package.json not found"; \
	fi

# Quick shortcuts for common tasks
q: quality ## Quick alias for quality checks
qf: quality-fix ## Quick alias for quality-fix
d: dev ## Quick alias for dev
b: build ## Quick alias for build
t: test ## Quick alias for test
l: lint ## Quick alias for lint
f: format ## Quick alias for format
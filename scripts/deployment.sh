#!/bin/bash

# Deployment utilities for Beaver project
# Handles GitHub Pages, Wiki, and other deployment targets

set -euo pipefail

# Source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ci-common.sh
source "${SCRIPT_DIR}/ci-common.sh"

# Default configuration
DEFAULT_PAGES_BRANCH="gh-pages"
DEFAULT_PAGES_DIR="_site"
DEFAULT_THEME="minima"
DEFAULT_WIKI_BRANCH="master"

# Show usage information
usage() {
    cat << EOF
Deployment Tools for Beaver

Usage: $0 <command> [options]

Commands:
    github-pages    Deploy to GitHub Pages
    github-wiki     Deploy to GitHub Wiki
    setup-pages     Setup GitHub Pages configuration
    setup-wiki      Setup GitHub Wiki
    validate        Validate deployment configuration
    clean           Clean deployment artifacts

Options:
    --repository REPO       Repository in owner/repo format
    --pages-branch BRANCH   GitHub Pages branch (default: $DEFAULT_PAGES_BRANCH)
    --pages-dir DIR         Pages build directory (default: $DEFAULT_PAGES_DIR)
    --theme THEME           Jekyll theme (default: $DEFAULT_THEME)
    --wiki-branch BRANCH    Wiki branch (default: $DEFAULT_WIKI_BRANCH)
    --content-dir DIR       Content source directory
    --enable-search         Enable search functionality
    --custom-domain DOMAIN  Custom domain for GitHub Pages
    --dry-run              Show commands without executing
    --verbose              Enable verbose output
    --help                 Show this help

Examples:
    $0 github-pages --repository owner/repo --theme minima
    $0 github-wiki --repository owner/repo --content-dir wiki-content
    $0 setup-pages --repository owner/repo --enable-search
    $0 validate --repository owner/repo

Environment Variables:
    GITHUB_TOKEN           GitHub API token (required)
    DEPLOYMENT_REPOSITORY  Repository in owner/repo format
    PAGES_BRANCH          GitHub Pages branch
    PAGES_DIR             Pages build directory
    WIKI_BRANCH           Wiki branch
EOF
}

# Parse command line arguments
parse_args() {
    COMMAND=""
    REPOSITORY="${DEPLOYMENT_REPOSITORY:-}"
    PAGES_BRANCH="${PAGES_BRANCH:-$DEFAULT_PAGES_BRANCH}"
    PAGES_DIR="${PAGES_DIR:-$DEFAULT_PAGES_DIR}"
    THEME="$DEFAULT_THEME"
    WIKI_BRANCH="$DEFAULT_WIKI_BRANCH"
    CONTENT_DIR=""
    ENABLE_SEARCH=false
    CUSTOM_DOMAIN=""
    DRY_RUN=false
    VERBOSE=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            github-pages|github-wiki|setup-pages|setup-wiki|validate|clean)
                COMMAND="$1"
                shift
                ;;
            --repository)
                REPOSITORY="$2"
                shift 2
                ;;
            --pages-branch)
                PAGES_BRANCH="$2"
                shift 2
                ;;
            --pages-dir)
                PAGES_DIR="$2"
                shift 2
                ;;
            --theme)
                THEME="$2"
                shift 2
                ;;
            --wiki-branch)
                WIKI_BRANCH="$2"
                shift 2
                ;;
            --content-dir)
                CONTENT_DIR="$2"
                shift 2
                ;;
            --enable-search)
                ENABLE_SEARCH=true
                shift
                ;;
            --custom-domain)
                CUSTOM_DOMAIN="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                export DEBUG=true
                shift
                ;;
            --help)
                usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    if [[ -z "$COMMAND" ]]; then
        log_error "No command specified"
        usage
        exit 1
    fi
}

# Execute command with dry-run support
execute_cmd() {
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: $*"
    else
        log_debug "Executing: $*"
        "$@"
    fi
}

# Validate prerequisites
validate_prerequisites() {
    log_section "Validating Prerequisites"
    
    # Check required environment variables
    check_required_env_vars GITHUB_TOKEN || return 1
    
    # Validate repository format
    if [[ -n "$REPOSITORY" ]]; then
        validate_repository_format "$REPOSITORY" || return 1
    else
        log_error "Repository not specified"
        return 1
    fi
    
    # Check Git availability
    if ! command_exists git; then
        log_error "Git is not installed or not in PATH"
        return 1
    fi
    
    # Check curl availability for API calls
    if ! command_exists curl; then
        log_error "curl is not installed or not in PATH"
        return 1
    fi
    
    log_success "Prerequisites validation passed"
    return 0
}

# Check GitHub API connectivity
check_github_connectivity() {
    log_info "Checking GitHub API connectivity..."
    
    local api_url="https://api.github.com/repos/$REPOSITORY"
    local response
    
    if response=$(curl -s -H "Authorization: token $GITHUB_TOKEN" "$api_url"); then
        if echo "$response" | grep -q '"full_name"'; then
            log_success "GitHub API connectivity OK"
            return 0
        else
            log_error "GitHub API returned unexpected response"
            log_debug "Response: $response"
            return 1
        fi
    else
        log_error "Failed to connect to GitHub API"
        return 1
    fi
}

# Setup GitHub Pages configuration
setup_github_pages() {
    log_section "Setting up GitHub Pages"
    
    local project_root
    project_root=$(get_project_root)
    
    # Create Pages directory
    ensure_directory "$PAGES_DIR"
    
    # Create Jekyll configuration
    local jekyll_config="$PAGES_DIR/_config.yml"
    log_info "Creating Jekyll configuration: $jekyll_config"
    
    if [[ "$DRY_RUN" != "true" ]]; then
        cat > "$jekyll_config" << EOF
# Jekyll configuration for Beaver documentation
title: "Beaver Documentation"
description: "AI agent knowledge dam construction tool"
baseurl: ""
url: "https://$(echo "$REPOSITORY" | cut -d'/' -f1).github.io"

# Theme configuration
theme: $THEME
plugins:
  - jekyll-feed
  - jekyll-sitemap
  - jekyll-seo-tag

# Build settings
markdown: kramdown
highlighter: rouge
kramdown:
  input: GFM
  syntax_highlighter: rouge

# Collections
collections:
  docs:
    output: true
    permalink: /:collection/:name/

# Navigation
navigation:
  - name: Home
    url: /
  - name: Documentation
    url: /docs/
  - name: Issues
    url: /issues/
  - name: Statistics
    url: /statistics/

# Search configuration
EOF

        if [[ "$ENABLE_SEARCH" == "true" ]]; then
            cat >> "$jekyll_config" << EOF
search_enabled: true
plugins:
  - jekyll-lunr-js-search
EOF
        fi
        
        # Add custom domain if specified
        if [[ -n "$CUSTOM_DOMAIN" ]]; then
            echo "$CUSTOM_DOMAIN" > "$PAGES_DIR/CNAME"
            log_info "Created CNAME file with domain: $CUSTOM_DOMAIN"
        fi
    fi
    
    # Create basic index page
    local index_file="$PAGES_DIR/index.md"
    log_info "Creating index page: $index_file"
    
    if [[ "$DRY_RUN" != "true" ]]; then
        cat > "$index_file" << EOF
---
layout: default
title: Home
---

# Beaver Documentation

Welcome to the Beaver documentation site. This documentation is automatically generated from GitHub Issues and maintained by the Beaver AI agent.

## What is Beaver?

Beaver is an AI agent knowledge dam construction tool that transforms AI development workflows into structured, persistent knowledge.

## Features

- **Automated Documentation**: Converts GitHub Issues into organized Wiki documentation
- **AI-Enhanced Processing**: Uses AI to categorize, summarize, and enhance content
- **Multi-Platform Output**: Supports GitHub Pages, Wiki, Notion, and Confluence
- **Incremental Updates**: Efficient processing of new content

## Navigation

- [Issues Summary](/issues/) - Processed GitHub Issues
- [Statistics](/statistics/) - Project metrics and analytics
- [Documentation](/docs/) - Detailed documentation

---

*This site is automatically maintained by [Beaver](https://github.com/$REPOSITORY)*
EOF
    fi
    
    log_success "GitHub Pages setup completed"
    return 0
}

# Deploy to GitHub Pages
deploy_github_pages() {
    log_section "Deploying to GitHub Pages"
    
    local project_root
    project_root=$(get_project_root)
    
    # Validate that content exists
    if [[ ! -d "$PAGES_DIR" ]]; then
        log_error "Pages directory not found: $PAGES_DIR"
        log_info "Run setup-pages first or generate content"
        return 1
    fi
    
    # Check if there's content to deploy
    if [[ -z "$(find "$PAGES_DIR" -name "*.md" -o -name "*.html" | head -1)" ]]; then
        log_warn "No content found in $PAGES_DIR"
        return 1
    fi
    
    cd "$PAGES_DIR"
    
    # Initialize git repository if needed
    if [[ ! -d ".git" ]]; then
        log_info "Initializing git repository..."
        execute_cmd git init
        execute_cmd git remote add origin "https://x-access-token:$GITHUB_TOKEN@github.com/$REPOSITORY.git"
    fi
    
    # Configure git user
    execute_cmd git config user.name "GitHub Actions"
    execute_cmd git config user.email "actions@github.com"
    
    # Add all files
    execute_cmd git add .
    
    # Check if there are changes to commit
    if git diff --staged --quiet; then
        log_info "No changes to deploy"
        return 0
    fi
    
    # Commit changes
    local commit_message="docs: Update GitHub Pages documentation"
    if [[ -n "${GITHUB_EVENT_NAME:-}" ]]; then
        commit_message="docs: Update GitHub Pages - $GITHUB_EVENT_NAME"
    fi
    
    execute_cmd git commit -m "$commit_message"
    
    # Push to GitHub Pages branch
    if execute_cmd git push -f origin "HEAD:$PAGES_BRANCH"; then
        log_success "Successfully deployed to GitHub Pages"
        log_info "Site URL: https://$(echo "$REPOSITORY" | cut -d'/' -f1).github.io/$(echo "$REPOSITORY" | cut -d'/' -f2)"
    else
        log_error "Failed to push to GitHub Pages"
        return 1
    fi
    
    return 0
}

# Setup GitHub Wiki
setup_github_wiki() {
    log_section "Setting up GitHub Wiki"
    
    local wiki_url="https://x-access-token:$GITHUB_TOKEN@github.com/$REPOSITORY.wiki.git"
    local wiki_dir="wiki-repo"
    
    # Clean up existing wiki directory
    if [[ -d "$wiki_dir" ]]; then
        execute_cmd rm -rf "$wiki_dir"
    fi
    
    # Clone or initialize wiki
    if execute_cmd git clone "$wiki_url" "$wiki_dir" 2>/dev/null; then
        log_success "Wiki repository cloned successfully"
    else
        log_info "Wiki not initialized - creating initial structure"
        
        if [[ "$DRY_RUN" != "true" ]]; then
            mkdir -p "$wiki_dir"
            cd "$wiki_dir"
            git init
            git remote add origin "$wiki_url"
            
            # Create initial Home page
            cat > Home.md << 'EOF'
# Beaver Documentation Wiki

Welcome to the Beaver documentation wiki. This wiki is automatically maintained by the Beaver AI agent.

## Overview

This wiki serves as a structured knowledge base for the Beaver project, containing:

- **Issue Analysis**: Detailed analysis of GitHub Issues
- **Development Patterns**: Identified patterns in development workflow
- **Learning Paths**: Recommended learning sequences
- **Troubleshooting**: Common issues and solutions

## Navigation

- [Issues Summary](Issues-Summary) - Overview of all processed issues
- [Statistics](Statistics) - Project metrics and analytics
- [Learning Path](Learning-Path) - Recommended learning sequence

---

*This wiki is automatically maintained by [Beaver](https://github.com/$REPOSITORY)*
EOF
            
            git add .
            git -c user.name="GitHub Actions" -c user.email="actions@github.com" commit -m "docs: Initialize wiki"
            
            if git push -u origin "$WIKI_BRANCH" 2>/dev/null; then
                log_success "Wiki initialized successfully"
            else
                log_error "Failed to initialize wiki"
                return 1
            fi
        fi
    fi
    
    return 0
}

# Deploy to GitHub Wiki
deploy_github_wiki() {
    log_section "Deploying to GitHub Wiki"
    
    local project_root
    project_root=$(get_project_root)
    local wiki_dir="wiki-repo"
    
    # Setup wiki if it doesn't exist
    if [[ ! -d "$wiki_dir" ]]; then
        setup_github_wiki || return 1
    fi
    
    cd "$wiki_dir"
    
    # Update wiki content
    if [[ -n "$CONTENT_DIR" && -d "../$CONTENT_DIR" ]]; then
        log_info "Copying content from $CONTENT_DIR"
        
        # Copy markdown files
        find "../$CONTENT_DIR" -name "*.md" -type f | while read -r file; do
            local basename_file
            basename_file=$(basename "$file")
            local wiki_filename="${basename_file}"
            
            # Convert filename to wiki format (replace spaces with hyphens)
            wiki_filename=$(echo "$wiki_filename" | sed 's/ /-/g')
            
            if [[ "$basename_file" != "README.md" ]]; then
                execute_cmd cp "$file" "$wiki_filename"
                log_info "Copied $basename_file -> $wiki_filename"
            fi
        done
    else
        # Copy any markdown files from project root
        find "$project_root" -maxdepth 1 -name "*.md" -type f ! -name "README.md" | while read -r file; do
            local basename_file
            basename_file=$(basename "$file")
            execute_cmd cp "$file" "$basename_file"
            log_info "Copied $basename_file"
        done
    fi
    
    # Configure git user
    execute_cmd git config user.name "GitHub Actions"
    execute_cmd git config user.email "actions@github.com"
    
    # Add all changes
    execute_cmd git add .
    
    # Check if there are changes to commit
    if git diff --staged --quiet; then
        log_info "No changes to deploy to wiki"
        return 0
    fi
    
    # Commit changes
    local commit_message="docs: Update wiki documentation"
    if [[ -n "${GITHUB_EVENT_NAME:-}" ]]; then
        commit_message="docs: Update wiki - $GITHUB_EVENT_NAME"
    fi
    
    execute_cmd git commit -m "$commit_message"
    
    # Push to wiki
    if execute_cmd git push; then
        log_success "Successfully deployed to GitHub Wiki"
        log_info "Wiki URL: https://github.com/$REPOSITORY/wiki"
    else
        log_error "Failed to push to GitHub Wiki"
        return 1
    fi
    
    return 0
}

# Validate deployment configuration
validate_deployment() {
    log_section "Validating Deployment Configuration"
    
    local issues=0
    
    # Check GitHub Pages configuration
    if [[ -f "$PAGES_DIR/_config.yml" ]]; then
        log_success "GitHub Pages configuration found"
    else
        log_warn "GitHub Pages configuration not found"
        ((issues++))
    fi
    
    # Check content directories
    if [[ -n "$CONTENT_DIR" ]]; then
        if [[ -d "$CONTENT_DIR" ]]; then
            local content_count
            content_count=$(find "$CONTENT_DIR" -name "*.md" -type f | wc -l)
            log_info "Content directory contains $content_count markdown files"
        else
            log_error "Content directory not found: $CONTENT_DIR"
            ((issues++))
        fi
    fi
    
    # Check GitHub connectivity
    if ! check_github_connectivity; then
        ((issues++))
    fi
    
    if [[ $issues -eq 0 ]]; then
        log_success "Deployment validation passed"
        return 0
    else
        log_error "Deployment validation failed with $issues issues"
        return 1
    fi
}

# Clean deployment artifacts
clean_deployment() {
    log_section "Cleaning Deployment Artifacts"
    
    local project_root
    project_root=$(get_project_root)
    cd "$project_root"
    
    # Clean Pages directory
    if [[ -d "$PAGES_DIR" ]]; then
        log_info "Cleaning Pages directory: $PAGES_DIR"
        execute_cmd rm -rf "$PAGES_DIR"
    fi
    
    # Clean wiki directory
    if [[ -d "wiki-repo" ]]; then
        log_info "Cleaning wiki directory: wiki-repo"
        execute_cmd rm -rf "wiki-repo"
    fi
    
    # Clean any deployment artifacts
    execute_cmd rm -f CNAME
    
    log_success "Deployment cleanup completed"
    return 0
}

# Main execution
main() {
    parse_args "$@"
    
    # Validate prerequisites for commands that need them
    case "$COMMAND" in
        github-pages|github-wiki|setup-pages|setup-wiki|validate)
            validate_prerequisites || exit 1
            ;;
    esac
    
    # Change to project root
    cd "$(get_project_root)"
    
    case "$COMMAND" in
        github-pages)
            deploy_github_pages
            ;;
        github-wiki)
            deploy_github_wiki
            ;;
        setup-pages)
            setup_github_pages
            ;;
        setup-wiki)
            setup_github_wiki
            ;;
        validate)
            validate_deployment
            ;;
        clean)
            clean_deployment
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            usage
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"
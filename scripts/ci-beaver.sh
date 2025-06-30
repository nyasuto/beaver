#!/bin/bash

# Beaver CI/CD Automation Script
# Used by GitHub Actions and other CI/CD systems to automate Beaver operations

set -euo pipefail

# Force UTF-8 encoding for all operations
export LC_ALL=C.UTF-8
export LANG=C.UTF-8

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BEAVER_BIN="${PROJECT_ROOT}/bin/beaver"
LOG_FILE="${PROJECT_ROOT}/.beaver/ci-beaver.log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Logging functions
log_info() {
    echo "🔍 [$(date '+%Y-%m-%d %H:%M:%S')] INFO: $*" | tee -a "$LOG_FILE"
}

log_warn() {
    echo "⚠️ [$(date '+%Y-%m-%d %H:%M:%S')] WARN: $*" | tee -a "$LOG_FILE"
}

log_error() {
    echo "❌ [$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" | tee -a "$LOG_FILE"
}

log_success() {
    echo "✅ [$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $*" | tee -a "$LOG_FILE"
}

log_debug() {
    if [[ "${VERBOSE:-false}" == "true" ]]; then
        echo "🔍 [$(date '+%Y-%m-%d %H:%M:%S')] DEBUG: $*" | tee -a "$LOG_FILE"
    fi
}

log_section() {
    echo "📋 [$(date '+%Y-%m-%d %H:%M:%S')] SECTION: $*" | tee -a "$LOG_FILE"
}

# Usage information
usage() {
    cat << EOF
🦫 Beaver CI/CD Automation Script

Usage: $0 <command> [options]

Commands:
  build           Build wiki from issues (with auto-detection of incremental mode)
  incremental     Force incremental build
  full-rebuild    Force full rebuild
  github-pages    Deploy to GitHub Pages
  test-setup      Test Beaver setup and configuration
  clean           Clean up build artifacts and state
  notify          Send test notifications
  health-check    Perform comprehensive health checks

Options:
  --repository REPO    Override repository (default: auto-detect)
  --config FILE        Override config file (default: beaver.yml)
  --state-file FILE    Override state file (default: .beaver/incremental-state.json)
  --max-items N        Max items per update (default: 100)
  --theme THEME        Jekyll theme for GitHub Pages (default: minima)
  --enable-search      Enable search functionality for GitHub Pages
  --notify-success     Send notifications on success
  --notify-failure     Send notifications on failure
  --dry-run           Perform dry run without making changes
  --verbose           Enable verbose logging
  --help              Show this help message

Environment Variables:
  GITHUB_TOKEN         GitHub API token (required)
  SLACK_WEBHOOK_URL    Slack webhook URL for notifications
  TEAMS_WEBHOOK_URL    Teams webhook URL for notifications
  BEAVER_CONFIG_FILE   Path to Beaver config file
  GITHUB_REPOSITORY    Repository in owner/repo format
  GITHUB_EVENT_NAME    GitHub event that triggered this run
  CI                   Set to 'true' when running in CI

Examples:
  # Automatic mode (detects incremental vs full based on context)
  $0 build

  # Force incremental build
  $0 incremental --notify-success

  # Force full rebuild
  $0 full-rebuild --notify-failure

  # Deploy to GitHub Pages
  $0 github-pages --notify-success

  # Test setup
  $0 test-setup --verbose

  # Health check
  $0 health-check
EOF
}

# Parse command line arguments
COMMAND=""
REPOSITORY=""
CONFIG_FILE="${BEAVER_CONFIG_FILE:-beaver.yml}"
STATE_FILE=""
MAX_ITEMS=""
NOTIFY_SUCCESS=false
NOTIFY_FAILURE=false
DRY_RUN=false
VERBOSE=false
THEME=""
ENABLE_SEARCH=false

while [[ $# -gt 0 ]]; do
    case $1 in
        build|incremental|full-rebuild|github-pages|test-setup|clean|notify|health-check)
            COMMAND="$1"
            shift
            ;;
        --repository)
            REPOSITORY="$2"
            shift 2
            ;;
        --config)
            CONFIG_FILE="$2"
            shift 2
            ;;
        --state-file)
            STATE_FILE="$2"
            shift 2
            ;;
        --max-items)
            MAX_ITEMS="$2"
            shift 2
            ;;
        --theme)
            THEME="$2"
            shift 2
            ;;
        --enable-search)
            ENABLE_SEARCH=true
            shift
            ;;
        --notify-success)
            NOTIFY_SUCCESS=true
            shift
            ;;
        --notify-failure)
            NOTIFY_FAILURE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --verbose)
            VERBOSE=true
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

# Environment detection
detect_environment() {
    log_info "Detecting environment..."
    
    if [[ "${CI:-}" == "true" ]]; then
        log_info "Running in CI environment"
        
        if [[ -n "${GITHUB_ACTIONS:-}" ]]; then
            log_info "Detected GitHub Actions environment"
            export IS_GITHUB_ACTIONS=true
            
            # Auto-detect repository if not specified
            if [[ -z "$REPOSITORY" && -n "${GITHUB_REPOSITORY:-}" ]]; then
                REPOSITORY="$GITHUB_REPOSITORY"
                log_info "Auto-detected repository: $REPOSITORY"
            fi
        fi
    else
        log_info "Running in local environment"
        export IS_GITHUB_ACTIONS=false
    fi
    
    # Auto-detect repository from git if still not set
    if [[ -z "$REPOSITORY" ]]; then
        if command -v git >/dev/null 2>&1; then
            local git_remote
            git_remote=$(git remote get-url origin 2>/dev/null || echo "")
            if [[ -n "$git_remote" ]]; then
                # Extract owner/repo from git URL
                REPOSITORY=$(echo "$git_remote" | sed 's|.*github\.com[/:]||' | sed 's|\.git$||' | sed 's|/$||')
                if [[ -n "$REPOSITORY" ]]; then
                    log_info "Auto-detected repository from git: $REPOSITORY"
                fi
            fi
        fi
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Beaver binary exists
    if [[ ! -f "$BEAVER_BIN" ]]; then
        log_error "Beaver binary not found at $BEAVER_BIN"
        log_info "Please run 'make build' first"
        return 1
    fi
    
    # Test Beaver binary
    if ! "$BEAVER_BIN" version >/dev/null 2>&1; then
        log_error "Beaver binary is not executable or corrupted"
        return 1
    fi
    
    # Check GitHub token
    log_info "Checking GitHub token availability..."
    if [[ -z "${GITHUB_TOKEN:-}" ]]; then
        log_error "❌ GITHUB_TOKEN environment variable is not set"
        log_info "Please set GITHUB_TOKEN with a valid GitHub personal access token"
        log_debug "Available environment variables starting with 'GITHUB':"
        env | grep '^GITHUB' | while read -r var; do
            local var_name="${var%%=*}"
            log_debug "  $var_name=[REDACTED]"
        done
        return 1
    else
        local token_length=${#GITHUB_TOKEN}
        log_success "✅ GITHUB_TOKEN found (length: $token_length characters)"
        local token_prefix="${GITHUB_TOKEN:0:7}"
        log_debug "Token prefix: ${token_prefix}..."
    fi
    
    # Check repository
    if [[ -z "$REPOSITORY" ]]; then
        log_error "Repository not specified and could not be auto-detected"
        log_info "Please specify --repository owner/repo or set GITHUB_REPOSITORY"
        return 1
    fi
    
    # Validate repository format
    if [[ ! "$REPOSITORY" =~ ^[^/]+/[^/]+$ ]]; then
        log_error "Invalid repository format: $REPOSITORY"
        log_info "Repository should be in 'owner/repo' format"
        return 1
    fi
    
    log_success "Prerequisites check passed"
    return 0
}

# Build command flags
build_flags() {
    local flags=()
    
    case "$COMMAND" in
        incremental)
            flags+=("--incremental")
            ;;
        full-rebuild)
            flags+=("--force-rebuild")
            ;;
        build)
            # Auto-detect based on environment
            if [[ "${IS_GITHUB_ACTIONS:-false}" == "true" ]]; then
                case "${GITHUB_EVENT_NAME:-}" in
                    issues|push)
                        flags+=("--incremental")
                        log_info "Auto-detected incremental mode for $GITHUB_EVENT_NAME event"
                        ;;
                    schedule|workflow_dispatch)
                        flags+=("--force-rebuild")
                        log_info "Auto-detected full rebuild for $GITHUB_EVENT_NAME event"
                        ;;
                    *)
                        flags+=("--incremental")
                        log_info "Defaulting to incremental mode for unknown event: ${GITHUB_EVENT_NAME:-none}"
                        ;;
                esac
            else
                flags+=("--incremental")
                log_info "Defaulting to incremental mode for local execution"
            fi
            ;;
    esac
    
    # Add notification flags
    if [[ "$NOTIFY_SUCCESS" == "true" ]]; then
        flags+=("--notify-success")
    fi
    
    if [[ "$NOTIFY_FAILURE" == "true" ]]; then
        flags+=("--notify-failure")
    fi
    
    # Add state file if specified
    if [[ -n "$STATE_FILE" ]]; then
        flags+=("--state-file" "$STATE_FILE")
    fi
    
    # Add max items if specified
    if [[ -n "$MAX_ITEMS" ]]; then
        flags+=("--max-items" "$MAX_ITEMS")
    fi
    
    echo "${flags[@]}"
}

# Execute Beaver build
execute_build() {
    log_info "Executing Beaver build..."
    
    local flags
    flags=($(build_flags))
    
    log_info "Build command: $BEAVER_BIN build ${flags[*]}"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would execute: $BEAVER_BIN build ${flags[*]}"
        return 0
    fi
    
    # Execute the build
    if [[ "$VERBOSE" == "true" ]]; then
        "$BEAVER_BIN" build "${flags[@]}"
    else
        "$BEAVER_BIN" build "${flags[@]}" 2>&1 | tee -a "$LOG_FILE"
    fi
    
    local exit_code=$?
    
    if [[ $exit_code -eq 0 ]]; then
        log_success "Beaver build completed successfully"
    else
        log_error "Beaver build failed with exit code $exit_code"
        return $exit_code
    fi
    
    return 0
}

# Execute GitHub Pages deployment
execute_github_pages() {
    log_info "Executing GitHub Pages deployment..."
    
    # Use available Beaver build command to generate content
    log_info "Generating content using Beaver build command..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would execute: $BEAVER_BIN build --max-items $MAX_ITEMS"
        log_info "DRY RUN: Would setup Jekyll site structure in _site/"
        return 0
    fi
    
    # Generate wiki content first using the build command
    local build_args=("build")
    
    if [[ -n "$MAX_ITEMS" && "$MAX_ITEMS" -gt 0 ]]; then
        build_args+=("--max-items" "$MAX_ITEMS")
    fi
    
    if [[ "$VERBOSE" == "true" ]]; then
        log_info "Executing: $BEAVER_BIN ${build_args[*]}"
        "$BEAVER_BIN" "${build_args[@]}"
    else
        "$BEAVER_BIN" "${build_args[@]}" 2>&1 | tee -a "$LOG_FILE"
    fi
    
    local build_exit_code=$?
    
    if [[ $build_exit_code -ne 0 ]]; then
        log_error "Beaver build failed with exit code $build_exit_code"
        return $build_exit_code
    fi
    
    log_success "Beaver content generation completed"
    
    # Create Jekyll site structure for GitHub Pages
    log_info "Setting up Jekyll site structure for GitHub Pages..."
    
    # Log current working directory and files
    log_info "Current working directory: $(pwd)"
    log_info "Available markdown files before _site creation:"
    ls -la *.md 2>/dev/null | while read -r line; do
        log_debug "  $line"
    done
    
    # Create _site directory
    log_info "Creating _site directory..."
    mkdir -p "_site"
    if [[ -d "_site" ]]; then
        log_success "_site directory created successfully"
        log_debug "_site directory permissions: $(ls -ld _site)"
    else
        log_error "Failed to create _site directory"
        return 1
    fi
    
    # Copy generated markdown files to _site with UTF-8 conversion
    local files_copied=0
    log_info "Copying and converting markdown files to UTF-8 in _site..."
    for md_file in *.md; do
        if [[ -f "$md_file" && "$md_file" != "README.md" ]]; then
            # Cross-platform file size check
            local file_size
            if [[ "$OSTYPE" == "darwin"* ]]; then
                file_size=$(stat -f%z "$md_file" 2>/dev/null || echo 'unknown')
            else
                file_size=$(stat -c%s "$md_file" 2>/dev/null || echo 'unknown')
            fi
            log_debug "Processing file: $md_file (size: $file_size)"
            
            # Apply CLI-based UTF-8 conversion
            if convert_file_to_utf8 "$md_file" "_site/$md_file"; then
                ((files_copied++))
                log_debug "✅ Successfully converted and copied $md_file to _site/"
                # Verify the copy with cross-platform file size check
                if [[ -f "_site/$md_file" ]]; then
                    local original_size copied_size
                    if [[ "$OSTYPE" == "darwin"* ]]; then
                        original_size=$(stat -f%z "$md_file" 2>/dev/null || echo '0')
                        copied_size=$(stat -f%z "_site/$md_file" 2>/dev/null || echo '0')
                    else
                        original_size=$(stat -c%s "$md_file" 2>/dev/null || echo '0')
                        copied_size=$(stat -c%s "_site/$md_file" 2>/dev/null || echo '0')
                    fi
                    log_debug "  Original: ${original_size} bytes, Converted: ${copied_size} bytes"
                    
                    # Verify UTF-8 encoding
                    if verify_utf8_encoding "_site/$md_file"; then
                        log_debug "  ✅ UTF-8 encoding verified"
                    else
                        log_warn "  ⚠️ UTF-8 encoding verification failed for $md_file"
                    fi
                else
                    log_error "❌ File $md_file was not found in _site/ after conversion"
                fi
            else
                log_error "❌ Failed to convert and copy $md_file to _site/"
            fi
        else
            if [[ -f "$md_file" ]]; then
                log_debug "Skipping $md_file (README.md or other excluded file)"
            fi
        fi
    done
    
    log_info "Files copied to _site: $files_copied"
    
    # Create basic Jekyll structure
    log_info "Creating Jekyll configuration..."
    local jekyll_theme="${THEME:-minima}"
    local search_enabled="${ENABLE_SEARCH:-false}"
    
    log_debug "Jekyll theme parameter: '$jekyll_theme'"
    log_debug "Search enabled: '$search_enabled'"
    
    # Set appropriate remote theme based on theme parameter
    local remote_theme
    case "$jekyll_theme" in
        "minima")
            remote_theme="minima"
            log_debug "Using standard minima theme"
            ;;
        "minimal")
            remote_theme="pages-themes/minimal@v0.2.0"
            log_debug "Using GitHub Pages minimal theme"
            ;;
        *)
            remote_theme="$jekyll_theme"
            log_debug "Using custom theme: $jekyll_theme"
            ;;
    esac
    remote_theme="pages-themes/slate"

    log_info "Selected remote theme: '$remote_theme'"
    
    # Create Jekyll config with UTF-8 content
    local config_content="title: \"Beaver ナレッジベース\"
description: \"AI駆動型ナレッジベース - GitHub Issues から自動生成\"
remote_theme: $remote_theme
plugins:
  - jekyll-remote-theme
  - jekyll-feed
  - jekyll-sitemap

markdown: kramdown
highlighter: rouge

header_pages:
  - index.md
  - beaver-Home.md
  - beaver-Issues-Summary.md
  - beaver-Development-Strategy.md
  - beaver-Learning-Path.md

exclude:
  - Gemfile
  - Gemfile.lock
  - README.md
  - \"*.log\"

# GitHub Pages configuration
github:
  is_project_page: true
  repository_name: beaver
  repository_url: https://github.com/nyasuto/beaver

# Search configuration  
search_enabled: $search_enabled

# Collections and defaults
defaults:
  - scope:
      path: \"\"
      type: \"pages\"
    values:
      layout: \"default\""

    # Write config with UTF-8 encoding using Python
    if command -v python3 >/dev/null 2>&1; then
        python3 -c "
import sys
try:
    content = '''$config_content'''
    with open('_site/_config.yml', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS')
except Exception as e:
    print(f'ERROR: {e}', file=sys.stderr)
    sys.exit(1)
" >/dev/null 2>&1
    else
        # Fallback to echo with UTF-8 locale
        echo "$config_content" > "_site/_config.yml"
    fi
    
    # Verify _config.yml creation
    if [[ -f "_site/_config.yml" ]]; then
        local config_size
        if [[ "$OSTYPE" == "darwin"* ]]; then
            config_size=$(stat -f%z "_site/_config.yml" 2>/dev/null || echo '0')
        else
            config_size=$(stat -c%s "_site/_config.yml" 2>/dev/null || echo '0')
        fi
        log_success "✅ _config.yml created successfully (${config_size} bytes)"
        log_debug "_config.yml content preview:"
        head -10 "_site/_config.yml" | while read -r line; do
            log_debug "  $line"
        done
    else
        log_error "❌ Failed to create _config.yml"
        return 1
    fi
    
    # Create index.md if it doesn't exist
    log_info "Checking for index.md..."
    if [[ ! -f "_site/index.md" ]]; then
        log_info "Creating index.md with UTF-8 encoding..."
        
        # Build index content with Japanese 3-column layout
        local index_content="---
layout: default
title: ホーム
description: \"Beaver AI駆動型ナレッジベース - GitHub Issues から自動生成\"
---

<style>
.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 2rem;
  margin: 2rem 0;
}

@media (max-width: 768px) {
  .content-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}

.content-card {
  border: 1px solid #e1e4e8;
  border-radius: 8px;
  padding: 1.5rem;
  background: #f6f8fa;
}

.content-card h3 {
  margin-top: 0;
  color: #24292e;
}

.content-card ul {
  padding-left: 1rem;
}

.content-card a {
  color: #0366d6;
  text-decoration: none;
}

.content-card a:hover {
  text-decoration: underline;
}
</style>

# 🦫 Beaver ナレッジベース

> 🤖 AI駆動型ナレッジベース - GitHub Issues から自動生成

**コアミッション**: 流れるAI開発ストリームを構造化されたナレッジダムに変換し、貴重な洞察が失われることを防ぐ。

<div class=\"content-grid\">

<div class=\"content-card\">
<h3>📋 コアドキュメンテーション</h3>

"
        
        # Add links to core Beaver pages
        for md_file in _site/beaver-*.md; do
            if [[ -f "$md_file" ]]; then
                local page_name=$(basename "$md_file" .md)
                local clean_title=$(echo "$page_name" | sed 's/beaver-//' | sed 's/-/ /g')
                # Convert to Japanese titles
                case "$clean_title" in
                    "Home") clean_title="ホーム" ;;
                    "Issues Summary") clean_title="課題サマリー" ;;
                    "Learning Path") clean_title="学習パス" ;;
                    "Development Strategy") clean_title="開発戦略" ;;
                    "Troubleshooting Guide") clean_title="トラブルシューティング" ;;
                esac
                index_content+="- [$clean_title]($page_name)"$'\n'
            fi
        done
        
        index_content+="
</div>

<div class=\"content-card\">
<h3>📊 プロジェクトリソース</h3>

"
        
        # Add links to other documentation files
        for md_file in _site/*.md; do
            if [[ -f "$md_file" && "$(basename "$md_file")" != "index.md" && "$(basename "$md_file")" != beaver-*.md ]]; then
                local page_name=$(basename "$md_file" .md)
                local page_title=$(echo "$page_name" | sed 's/-/ /g')
                index_content+="- [$page_title]($page_name)"$'\n'
            fi
        done
        
        index_content+="
</div>

<div class=\"content-card\">
<h3>🔗 クイックアクセス</h3>

- [🦫 Beaver について](https://github.com/nyasuto/beaver)
- [📝 貢献ガイド](https://github.com/nyasuto/beaver/blob/main/CONTRIBUTING.md)
- [🚀 リリース](https://github.com/nyasuto/beaver/releases)
- [📞 サポート](https://github.com/nyasuto/beaver/issues)

</div>

</div>

---

*🤖 このドキュメントは Beaver によって自動生成・維持されています*"
        
        # Write index.md with UTF-8 encoding using Python
        if command -v python3 >/dev/null 2>&1; then
            python3 -c "
import sys
try:
    content = '''$index_content'''
    with open('_site/index.md', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS')
except Exception as e:
    print(f'ERROR: {e}', file=sys.stderr)
    sys.exit(1)
" >/dev/null 2>&1
            if [[ $? -eq 0 ]]; then
                log_success "✅ index.md created successfully with UTF-8 encoding"
            else
                log_warn "Python UTF-8 write failed, using fallback"
                echo "$index_content" > "_site/index.md"
            fi
        else
            # Fallback to echo
            echo "$index_content" > "_site/index.md"
            log_success "✅ index.md created successfully (fallback method)"
        fi
    else
        log_info "index.md already exists, cleaning UTF-8 content..."
        # Clean existing index.md for UTF-8 compliance
        if clean_utf8_content "_site/index.md"; then
            log_debug "✅ index.md UTF-8 content cleaned"
        else
            log_warn "⚠️ Failed to clean index.md UTF-8 content"
        fi
    fi
    
    # Verify index.md creation/existence
    if [[ -f "_site/index.md" ]]; then
        local index_size
        if [[ "$OSTYPE" == "darwin"* ]]; then
            index_size=$(stat -f%z "_site/index.md" 2>/dev/null || echo '0')
        else
            index_size=$(stat -c%s "_site/index.md" 2>/dev/null || echo '0')
        fi
        log_debug "index.md size: ${index_size} bytes"
        log_debug "index.md front matter check:"
        head -5 "_site/index.md" | while read -r line; do
            log_debug "  $line"
        done
    else
        log_error "❌ index.md not found after creation attempt"
        return 1
    fi
    
    # Final verification of Jekyll site structure
    log_info "=== Final Jekyll Site Verification ==="
    log_info "_site directory contents:"
    ls -la "_site/" | while read -r line; do
        log_debug "  $line"
    done
    
    # Check essential files
    local essential_files=("_config.yml" "index.md")
    local missing_files=0
    for file in "${essential_files[@]}"; do
        if [[ -f "_site/$file" ]]; then
            local file_size
            if [[ "$OSTYPE" == "darwin"* ]]; then
                file_size=$(stat -f%z "_site/$file" 2>/dev/null || echo '0')
            else
                file_size=$(stat -c%s "_site/$file" 2>/dev/null || echo '0')
            fi
            log_success "✅ Essential file: $file (${file_size} bytes)"
        else
            log_error "❌ Missing essential file: $file"
            ((missing_files++))
        fi
    done
    
    # Count total files
    local total_files=$(find "_site" -name "*.md" -o -name "*.yml" | wc -l | tr -d ' ')
    log_info "Total files in _site: $total_files"
    log_info "Content files copied: $files_copied"
    log_info "Missing essential files: $missing_files"
    
    if [[ $missing_files -gt 0 ]]; then
        log_error "Jekyll site structure validation failed"
        return 1
    fi
    
    log_success "✅ Jekyll site structure created with $files_copied content files"
    log_info "🚀 GitHub Pages content ready in _site/ directory"
    log_info "=== End Jekyll Site Verification ==="
    
    # Generate detailed deployment file manifest
    generate_deployment_manifest
    
    return 0
}

# Generate deployment manifest with detailed file information
generate_deployment_manifest() {
    log_section "🚀 GitHub Pages デプロイメントマニフェスト"
    
    if [[ ! -d "_site" ]]; then
        log_error "❌ _site directory not found"
        return 1
    fi
    
    # Change to _site directory for cleaner paths
    cd "_site" || {
        log_error "❌ Failed to change to _site directory"
        return 1
    }
    
    # Calculate total deployment size
    local total_size=0
    local file_count=0
    local deployment_manifest="deployment-manifest.txt"
    
    log_info "📊 デプロイ対象ファイル分析中..."
    
    # Create manifest header
    cat > "$deployment_manifest" << EOF
================================================================================
🚀 Beaver GitHub Pages デプロイメントマニフェスト
================================================================================
生成日時: $(date '+%Y-%m-%d %H:%M:%S')
リポジトリ: ${REPOSITORY:-"未設定"}
ビルドタイプ: ${UPDATE_TYPE:-"unknown"}
================================================================================

EOF
    
    # Analyze files by category
    log_info "📄 ファイルカテゴリ別分析:"
    
    # Configuration files
    log_info "  🔧 設定ファイル:"
    find . -maxdepth 1 \( -name "*.yml" -o -name "*.yaml" -o -name "*.json" \) -type f | while read -r file; do
        local file_size
        if [[ "$OSTYPE" == "darwin"* ]]; then
            file_size=$(stat -f%z "$file" 2>/dev/null || echo '0')
        else
            file_size=$(stat -c%s "$file" 2>/dev/null || echo '0')
        fi
        local human_size=$(format_bytes "$file_size")
        log_info "    📋 $(basename "$file"): ${human_size}"
        echo "  📋 $(basename "$file"): ${human_size} (${file_size} bytes)" >> "$deployment_manifest"
        ((total_size += file_size))
        ((file_count++))
    done
    
    # Content files (Beaver generated)
    log_info "  📝 Beaverコンテンツファイル:"
    find . -maxdepth 1 -name "beaver-*.md" -type f | sort | while read -r file; do
        local file_size
        if [[ "$OSTYPE" == "darwin"* ]]; then
            file_size=$(stat -f%z "$file" 2>/dev/null || echo '0')
        else
            file_size=$(stat -c%s "$file" 2>/dev/null || echo '0')
        fi
        local human_size=$(format_bytes "$file_size")
        local content_type=$(basename "$file" | sed 's/beaver-//' | sed 's/\.md$//')
        log_info "    🦫 $content_type: ${human_size}"
        echo "  🦫 $(basename "$file"): ${human_size} (${file_size} bytes)" >> "$deployment_manifest"
        ((total_size += file_size))
        ((file_count++))
    done
    
    # Documentation files
    log_info "  📚 ドキュメンテーションファイル:"
    find . -maxdepth 1 \( -name "*.md" ! -name "beaver-*.md" ! -name "index.md" \) -type f | sort | while read -r file; do
        local file_size
        if [[ "$OSTYPE" == "darwin"* ]]; then
            file_size=$(stat -f%z "$file" 2>/dev/null || echo '0')
        else
            file_size=$(stat -c%s "$file" 2>/dev/null || echo '0')
        fi
        local human_size=$(format_bytes "$file_size")
        log_info "    📖 $(basename "$file"): ${human_size}"
        echo "  📖 $(basename "$file"): ${human_size} (${file_size} bytes)" >> "$deployment_manifest"
        ((total_size += file_size))
        ((file_count++))
    done
    
    # Index file (special treatment)
    if [[ -f "index.md" ]]; then
        local index_size
        if [[ "$OSTYPE" == "darwin"* ]]; then
            index_size=$(stat -f%z "index.md" 2>/dev/null || echo '0')
        else
            index_size=$(stat -c%s "index.md" 2>/dev/null || echo '0')
        fi
        local index_human_size=$(format_bytes "$index_size")
        log_info "  🏠 インデックスページ: ${index_human_size}"
        echo "  🏠 index.md: ${index_human_size} (${index_size} bytes)" >> "$deployment_manifest"
        ((total_size += index_size))
        ((file_count++))
    fi
    
    # Calculate totals and statistics
    local total_human_size=$(format_bytes "$total_size")
    
    # Add statistics to manifest
    cat >> "$deployment_manifest" << EOF

================================================================================
📊 デプロイメント統計
================================================================================
総ファイル数: ${file_count}
総サイズ: ${total_human_size} (${total_size} bytes)
平均ファイルサイズ: $(format_bytes $((total_size / (file_count > 0 ? file_count : 1))))

================================================================================
🔍 ファイル構成詳細
================================================================================
EOF
    
    # Generate detailed file listing
    find . -type f | sort | while read -r file; do
        local file_size
        if [[ "$OSTYPE" == "darwin"* ]]; then
            file_size=$(stat -f%z "$file" 2>/dev/null || echo '0')
        else
            file_size=$(stat -c%s "$file" 2>/dev/null || echo '0')
        fi
        local human_size=$(format_bytes "$file_size")
        local file_path=$(echo "$file" | sed 's|^\./||')
        printf "%-50s %10s (%s bytes)\n" "$file_path" "$human_size" "$file_size" >> "$deployment_manifest"
    done
    
    cat >> "$deployment_manifest" << EOF

================================================================================
🚀 デプロイ準備完了
================================================================================
このマニフェストに記載されたファイルがGitHub Pagesにデプロイされます。
マニフェスト生成時刻: $(date '+%Y-%m-%d %H:%M:%S')
================================================================================
EOF
    
    # Display summary
    log_info "📊 デプロイメント統計サマリー:"
    log_info "  📦 総ファイル数: ${file_count}"
    log_info "  📏 総サイズ: ${total_human_size}"
    log_info "  📋 マニフェストファイル: deployment-manifest.txt"
    
    # Show deployment readiness check
    log_info "🔍 デプロイ準備状況チェック:"
    
    # Check essential files
    local essential_checks=0
    local essential_total=4
    
    if [[ -f "_config.yml" ]]; then
        log_info "  ✅ Jekyll設定ファイル (_config.yml)"
        ((essential_checks++))
    else
        log_error "  ❌ Jekyll設定ファイル (_config.yml) が見つかりません"
    fi
    
    if [[ -f "index.md" ]]; then
        log_info "  ✅ インデックスページ (index.md)"
        ((essential_checks++))
    else
        log_error "  ❌ インデックスページ (index.md) が見つかりません"
    fi
    
    local beaver_files=$(find . -name "beaver-*.md" | wc -l | tr -d ' ')
    if [[ $beaver_files -gt 0 ]]; then
        log_info "  ✅ Beaverコンテンツファイル (${beaver_files}件)"
        ((essential_checks++))
    else
        log_error "  ❌ Beaverコンテンツファイルが見つかりません"
    fi
    
    if [[ $total_size -gt 0 ]]; then
        log_info "  ✅ コンテンツサイズ (${total_human_size})"
        ((essential_checks++))
    else
        log_error "  ❌ コンテンツが空です"
    fi
    
    # Final readiness assessment
    if [[ $essential_checks -eq $essential_total ]]; then
        log_success "🚀 デプロイ準備完了: ${essential_checks}/${essential_total} チェック通過"
        log_info "✨ GitHub Pagesデプロイメントに進む準備ができました"
    else
        log_error "❌ デプロイ準備未完了: ${essential_checks}/${essential_total} チェック通過"
        log_error "❗ 上記のエラーを修正してからデプロイしてください"
    fi
    
    # Return to original directory
    cd .. || {
        log_error "❌ Failed to return to original directory"
        return 1
    }
    
    # Show final manifest location
    log_info "📄 詳細なデプロイマニフェスト: _site/deployment-manifest.txt"
    
    return 0
}

# Helper function to format bytes in human readable format
format_bytes() {
    local bytes=$1
    local units=("B" "KB" "MB" "GB")
    local unit=0
    local size=$bytes
    
    while [[ $size -gt 1024 && $unit -lt 3 ]]; do
        size=$((size / 1024))
        ((unit++))
    done
    
    if [[ $unit -eq 0 ]]; then
        echo "${size}${units[$unit]}"
    else
        # Use awk for decimal precision
        echo "$bytes" | awk -v unit="$unit" '
        {
            size = $1
            units[0] = "B"
            units[1] = "KB" 
            units[2] = "MB"
            units[3] = "GB"
            for(i=0; i<unit; i++) size = size / 1024
            printf "%.1f%s", size, units[unit]
        }'
    fi
}

# Test setup
test_setup() {
    log_info "Testing Beaver setup..."
    
    # Create configuration if it doesn't exist
    if [[ ! -f "beaver.yml" ]]; then
        log_info "Creating beaver.yml configuration..."
        if [[ -z "$REPOSITORY" ]]; then
            log_error "Repository not specified for configuration setup"
            return 1
        fi
        
        # Create a basic configuration file
        cat > beaver.yml << EOF
project:
  name: "Beaver Self-Documentation"
  repository: "$REPOSITORY"

sources:
  github:
    issues: true
    commits: true
    prs: true

output:
  wiki:
    platform: "github"
    templates: "default"

ai:
  provider: "openai"
  model: "gpt-4"
  features:
    summarization: true
    categorization: true
    troubleshooting: true

timezone:
  location: "Asia/Tokyo"
  format: "2006-01-02 15:04:05 JST"
EOF
        log_success "Configuration file created with repository: $REPOSITORY"
    else
        log_info "Configuration file already exists"
    fi
    
    # Test configuration
    log_info "Testing configuration..."
    if ! "$BEAVER_BIN" status >/dev/null 2>&1; then
        log_error "Configuration test failed"
        return 1
    fi
    
    # Test GitHub connection
    log_info "Testing GitHub connection..."
    if [[ -n "$REPOSITORY" ]]; then
        # Try a simple fetch to test connection
        if ! "$BEAVER_BIN" fetch issues "$REPOSITORY" --per-page 1 --format json >/dev/null 2>&1; then
            log_warn "GitHub connection test failed, but continuing..."
            # Don't fail the setup for connection issues
        else
            log_success "GitHub connection test successful"
        fi
    fi
    
    log_success "Setup test completed successfully"
    return 0
}

# Clean up
clean_up() {
    log_info "Cleaning up..."
    
    # Remove build artifacts
    if [[ -d "${PROJECT_ROOT}/.beaver" ]]; then
        if [[ "$DRY_RUN" == "true" ]]; then
            log_info "DRY RUN: Would remove .beaver directory"
        else
            rm -rf "${PROJECT_ROOT}/.beaver"
            log_info "Removed .beaver directory"
        fi
    fi
    
    # Remove generated wiki files
    find "$PROJECT_ROOT" -name "*-*.md" -type f -newer "$BEAVER_BIN" 2>/dev/null | while read -r file; do
        if [[ "$DRY_RUN" == "true" ]]; then
            log_info "DRY RUN: Would remove $file"
        else
            rm -f "$file"
            log_info "Removed $file"
        fi
    done
    
    log_success "Cleanup completed"
}

# Send test notifications
send_test_notifications() {
    log_info "Sending test notifications..."
    
    local test_message="🧪 Test notification from Beaver CI script at $(date)"
    
    # Test Slack notification
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        log_info "Testing Slack notification..."
        local slack_payload="{\"text\":\"$test_message\"}"
        
        if curl -s -X POST -H 'Content-type: application/json' \
           --data "$slack_payload" \
           "$SLACK_WEBHOOK_URL" >/dev/null; then
            log_success "Slack notification test passed"
        else
            log_error "Slack notification test failed"
        fi
    else
        log_warn "SLACK_WEBHOOK_URL not set, skipping Slack test"
    fi
    
    # Test Teams notification
    if [[ -n "${TEAMS_WEBHOOK_URL:-}" ]]; then
        log_info "Testing Teams notification..."
        local teams_payload="{\"@type\":\"MessageCard\",\"@context\":\"https://schema.org/extensions\",\"summary\":\"Test\",\"title\":\"🧪 Beaver Test\",\"text\":\"$test_message\"}"
        
        if curl -s -X POST -H 'Content-type: application/json' \
           --data "$teams_payload" \
           "$TEAMS_WEBHOOK_URL" >/dev/null; then
            log_success "Teams notification test passed"
        else
            log_error "Teams notification test failed"
        fi
    else
        log_warn "TEAMS_WEBHOOK_URL not set, skipping Teams test"
    fi
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    # Ensure environment is detected for prerequisite checks
    detect_environment
    
    local health_issues=0
    
    # Check disk space
    local disk_usage
    disk_usage=$(df "$PROJECT_ROOT" | awk 'NR==2 {print $5}' | sed 's/%//')
    if [[ $disk_usage -gt 90 ]]; then
        log_warn "Disk usage is high: ${disk_usage}%"
        ((health_issues++))
    else
        log_info "Disk usage OK: ${disk_usage}%"
    fi
    
    # Check log file size
    if [[ -f "$LOG_FILE" ]]; then
        local log_size
        log_size=$(stat -c%s "$LOG_FILE" 2>/dev/null || stat -f%z "$LOG_FILE" 2>/dev/null || echo 0)
        if [[ $log_size -gt 10485760 ]]; then  # 10MB
            log_warn "Log file is large: $(( log_size / 1024 / 1024 ))MB"
            ((health_issues++))
        fi
    fi
    
    # Check state file
    if [[ -f "${PROJECT_ROOT}/.beaver/incremental-state.json" ]]; then
        if ! python3 -m json.tool "${PROJECT_ROOT}/.beaver/incremental-state.json" >/dev/null 2>&1; then
            log_error "Incremental state file is corrupted"
            ((health_issues++))
        else
            log_info "Incremental state file OK"
        fi
    fi
    
    # Test prerequisites
    if ! check_prerequisites; then
        log_error "Prerequisites check failed"
        ((health_issues++))
    fi
    
    if [[ $health_issues -eq 0 ]]; then
        log_success "Health check passed - all systems operational"
        return 0
    else
        log_warn "Health check completed with $health_issues issues"
        return 1
    fi
}

# UTF-8 conversion functions
convert_file_to_utf8() {
    local input_file="$1"
    local output_file="$2"
    
    log_debug "Converting $input_file to UTF-8 at $output_file"
    
    # First, try to detect the current encoding
    local current_encoding="UTF-8"
    if command -v file >/dev/null 2>&1; then
        local file_info=$(file -bi "$input_file" 2>/dev/null || echo "")
        if [[ "$file_info" =~ charset=([^;]+) ]]; then
            current_encoding="${BASH_REMATCH[1]}"
            log_debug "Detected encoding: $current_encoding"
        fi
    fi
    
    # Strategy 1: Use iconv if available (most reliable)
    if command -v iconv >/dev/null 2>&1; then
        log_debug "Using iconv for UTF-8 conversion"
        if iconv -f "$current_encoding" -t UTF-8//IGNORE "$input_file" > "$output_file" 2>/dev/null; then
            log_debug "iconv conversion successful"
            return 0
        else
            log_debug "iconv conversion failed, trying fallback"
        fi
    fi
    
    # Strategy 2: Use Python (available in most CI environments)
    if command -v python3 >/dev/null 2>&1; then
        log_debug "Using Python for UTF-8 conversion"
        if python3 -c "
import sys
import codecs
try:
    with open('$input_file', 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    # Remove any null bytes and other problematic characters
    content = content.replace('\x00', '')
    # Ensure content is valid UTF-8
    content = content.encode('utf-8', errors='ignore').decode('utf-8')
    with open('$output_file', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS')
except Exception as e:
    print(f'ERROR: {e}', file=sys.stderr)
    sys.exit(1)
" 2>/dev/null | grep -q "SUCCESS"; then
            log_debug "Python UTF-8 conversion successful"
            return 0
        else
            log_debug "Python conversion failed, trying fallback"
        fi
    fi
    
    # Strategy 3: Use sed/awk as fallback (removes non-printable characters)
    log_debug "Using sed/awk fallback for UTF-8 conversion"
    if sed 's/[[:cntrl:]]//g' "$input_file" | \
       awk '{gsub(/[^\x00-\x7F]/, ""); print}' > "$output_file" 2>/dev/null; then
        log_debug "sed/awk fallback conversion successful"
        return 0
    fi
    
    # Strategy 4: Simple copy with character filtering
    log_debug "Using tr fallback for character filtering"
    if tr -cd '\11\12\15\40-\176' < "$input_file" > "$output_file" 2>/dev/null; then
        log_debug "tr fallback successful"
        return 0
    fi
    
    # Final fallback: simple copy
    log_warn "All UTF-8 conversion methods failed, performing simple copy"
    cp "$input_file" "$output_file"
    return $?
}

verify_utf8_encoding() {
    local file_path="$1"
    
    # Method 1: Use file command if available
    if command -v file >/dev/null 2>&1; then
        local file_info=$(file -bi "$file_path" 2>/dev/null || echo "")
        if [[ "$file_info" =~ charset=utf-8 ]]; then
            return 0
        fi
    fi
    
    # Method 2: Use Python to validate UTF-8
    if command -v python3 >/dev/null 2>&1; then
        if python3 -c "
import sys
try:
    with open('$file_path', 'r', encoding='utf-8', errors='strict') as f:
        f.read()
    print('VALID')
except UnicodeDecodeError:
    print('INVALID', file=sys.stderr)
    sys.exit(1)
" 2>/dev/null | grep -q "VALID"; then
            return 0
        fi
    fi
    
    # Method 3: Use iconv to validate
    if command -v iconv >/dev/null 2>&1; then
        if iconv -f UTF-8 -t UTF-8 "$file_path" >/dev/null 2>&1; then
            return 0
        fi
    fi
    
    # If all methods fail, assume it's not valid UTF-8
    return 1
}

clean_utf8_content() {
    local file_path="$1"
    
    log_debug "Cleaning UTF-8 content in $file_path"
    
    # Use Python to clean and ensure valid UTF-8
    if command -v python3 >/dev/null 2>&1; then
        python3 -c "
import sys
import re
try:
    with open('$file_path', 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Remove null bytes and other problematic control characters
    content = content.replace('\x00', '')
    content = re.sub(r'[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]', '', content)
    
    # Ensure proper line endings
    content = content.replace('\r\n', '\n').replace('\r', '\n')
    
    # Re-encode to ensure valid UTF-8
    content = content.encode('utf-8', errors='ignore').decode('utf-8')
    
    # Write back to file
    with open('$file_path', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS')
except Exception as e:
    print(f'ERROR: {e}', file=sys.stderr)
    sys.exit(1)
" 2>/dev/null | grep -q "SUCCESS"
        return $?
    fi
    
    return 1
}

# Main execution
main() {
    log_info "Starting Beaver CI script - Command: $COMMAND"
    
    # Change to project root
    cd "$PROJECT_ROOT"
    
    # Detect environment
    detect_environment
    
    # Execute command
    case "$COMMAND" in
        build|incremental|full-rebuild)
            check_prerequisites || exit 1
            execute_build || exit 1
            ;;
        github-pages)
            check_prerequisites || exit 1
            execute_github_pages || exit 1
            ;;
        test-setup)
            check_prerequisites || exit 1
            test_setup || exit 1
            ;;
        clean)
            clean_up || exit 1
            ;;
        notify)
            send_test_notifications || exit 1
            ;;
        health-check)
            health_check || exit 1
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            usage
            exit 1
            ;;
    esac
    
    log_success "Beaver CI script completed successfully"
}

# Execute main function
main "$@"
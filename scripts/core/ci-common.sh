#!/bin/bash

# Common CI/CD functions for Beaver project
# This script provides shared functionality across all CI scripts

set -euo pipefail

# Color codes for output
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export PURPLE='\033[0;35m'
export CYAN='\033[0;36m'
export NC='\033[0m' # No Color

# Logging functions with consistent formatting
log_info() {
    echo -e "${BLUE}[INFO]${NC} [$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} [$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} [$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} [$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

log_debug() {
    if [[ "${DEBUG:-false}" == "true" ]]; then
        echo -e "${PURPLE}[DEBUG]${NC} [$(date '+%Y-%m-%d %H:%M:%S')] $*"
    fi
}

# Section headers for better readability
log_section() {
    echo -e "\n${CYAN}=== $* ===${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if running in CI environment
is_ci() {
    [[ "${CI:-false}" == "true" ]]
}

# Check if running in GitHub Actions
is_github_actions() {
    [[ -n "${GITHUB_ACTIONS:-}" ]]
}

# Get the root directory of the project
get_project_root() {
    local script_dir
    script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    (cd "${script_dir}/.." && pwd)
}

# Validate repository format (owner/repo)
validate_repository_format() {
    local repo="$1"
    if [[ ! "$repo" =~ ^[^/]+/[^/]+$ ]]; then
        log_error "Invalid repository format: $repo"
        log_info "Repository should be in 'owner/repo' format"
        return 1
    fi
    return 0
}

# Check if file exists and is readable
check_file_readable() {
    local file="$1"
    if [[ ! -f "$file" ]]; then
        log_error "File not found: $file"
        return 1
    fi
    if [[ ! -r "$file" ]]; then
        log_error "File not readable: $file"
        return 1
    fi
    return 0
}

# Check if directory exists and is writable
check_directory_writable() {
    local dir="$1"
    if [[ ! -d "$dir" ]]; then
        log_error "Directory not found: $dir"
        return 1
    fi
    if [[ ! -w "$dir" ]]; then
        log_error "Directory not writable: $dir"
        return 1
    fi
    return 0
}

# Create directory if it doesn't exist
ensure_directory() {
    local dir="$1"
    if [[ ! -d "$dir" ]]; then
        log_info "Creating directory: $dir"
        mkdir -p "$dir"
    fi
}

# Check required environment variables
check_required_env_vars() {
    local missing=0
    for var in "$@"; do
        if [[ -z "${!var:-}" ]]; then
            log_error "Required environment variable not set: $var"
            ((missing++))
        fi
    done
    
    if [[ $missing -gt 0 ]]; then
        log_error "$missing required environment variable(s) missing"
        return 1
    fi
    return 0
}

# Check disk space (in percentage)
check_disk_space() {
    local path="${1:-$(get_project_root)}"
    local threshold="${2:-90}"
    
    local usage
    if command_exists df; then
        usage=$(df "$path" | awk 'NR==2 {print $5}' | sed 's/%//')
        if [[ $usage -gt $threshold ]]; then
            log_warn "Disk usage is high: ${usage}% (threshold: ${threshold}%)"
            return 1
        else
            log_debug "Disk usage OK: ${usage}%"
        fi
    else
        log_warn "df command not available, skipping disk space check"
    fi
    return 0
}

# Check if file is valid JSON
validate_json_file() {
    local file="$1"
    if ! check_file_readable "$file"; then
        return 1
    fi
    
    if command_exists python3; then
        if python3 -m json.tool "$file" >/dev/null 2>&1; then
            log_debug "JSON file is valid: $file"
            return 0
        else
            log_error "JSON file is invalid: $file"
            return 1
        fi
    elif command_exists jq; then
        if jq . "$file" >/dev/null 2>&1; then
            log_debug "JSON file is valid: $file"
            return 0
        else
            log_error "JSON file is invalid: $file"
            return 1
        fi
    else
        log_warn "Neither python3 nor jq available, skipping JSON validation for: $file"
        return 0
    fi
}

# Get file size in human readable format
get_file_size() {
    local file="$1"
    if [[ -f "$file" ]]; then
        if command_exists stat; then
            # Try GNU stat first, then BSD stat
            stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null || echo "0"
        else
            # Fallback using ls
            ls -l "$file" | awk '{print $5}'
        fi
    else
        echo "0"
    fi
}

# Format bytes to human readable
format_bytes() {
    local bytes="$1"
    if [[ $bytes -lt 1024 ]]; then
        echo "${bytes}B"
    elif [[ $bytes -lt 1048576 ]]; then
        echo "$((bytes / 1024))KB"
    elif [[ $bytes -lt 1073741824 ]]; then
        echo "$((bytes / 1048576))MB"
    else
        echo "$((bytes / 1073741824))GB"
    fi
}

# Retry a command with exponential backoff
retry_command() {
    local max_attempts="$1"
    shift
    local command=("$@")
    
    local attempt=1
    local delay=1
    
    while [[ $attempt -le $max_attempts ]]; do
        log_debug "Attempt $attempt/$max_attempts: ${command[*]}"
        
        if "${command[@]}"; then
            log_debug "Command succeeded on attempt $attempt"
            return 0
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            log_error "Command failed after $max_attempts attempts: ${command[*]}"
            return 1
        fi
        
        log_warn "Command failed (attempt $attempt/$max_attempts), retrying in ${delay}s..."
        sleep "$delay"
        
        # Exponential backoff with jitter
        delay=$((delay * 2 + (RANDOM % 3)))
        ((attempt++))
    done
}

# Cleanup function to be called on script exit
cleanup_on_exit() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        log_error "Script exited with code $exit_code"
    fi
    
    # Cleanup temporary files if any were created
    if [[ -n "${TEMP_FILES:-}" ]]; then
        log_debug "Cleaning up temporary files: $TEMP_FILES"
        rm -f "$TEMP_FILES"
    fi
}

# Set up trap for cleanup
trap cleanup_on_exit EXIT

# Check if running as root (usually not recommended for CI)
check_not_root() {
    if [[ $EUID -eq 0 ]]; then
        log_warn "Running as root is not recommended"
        if [[ "${ALLOW_ROOT:-false}" != "true" ]]; then
            log_error "Set ALLOW_ROOT=true to override this check"
            return 1
        fi
    fi
    return 0
}

# Print system information for debugging
print_system_info() {
    log_section "System Information"
    log_info "Operating System: $(uname -s)"
    log_info "Architecture: $(uname -m)"
    log_info "Kernel: $(uname -r)"
    
    if command_exists lsb_release; then
        log_info "Distribution: $(lsb_release -d | cut -f2-)"
    fi
    
    log_info "Shell: $SHELL"
    log_info "User: $(whoami)"
    log_info "Working Directory: $(pwd)"
    log_info "Project Root: $(get_project_root)"
    
    if is_ci; then
        log_info "CI Environment: true"
        if is_github_actions; then
            log_info "GitHub Actions: true"
            log_info "Runner OS: ${RUNNER_OS:-unknown}"
        fi
    else
        log_info "CI Environment: false"
    fi
}

# Export functions to make them available to scripts that source this file
export -f log_info log_success log_warn log_error log_debug log_section
export -f command_exists is_ci is_github_actions get_project_root
export -f validate_repository_format check_file_readable check_directory_writable
export -f ensure_directory check_required_env_vars check_disk_space
export -f validate_json_file get_file_size format_bytes retry_command
export -f cleanup_on_exit check_not_root print_system_info
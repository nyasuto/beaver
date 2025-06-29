#!/bin/bash

# Beaver CI/CD Automation Script
# Used by GitHub Actions and other CI/CD systems to automate Beaver operations

set -euo pipefail

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

# Usage information
usage() {
    cat << EOF
🦫 Beaver CI/CD Automation Script

Usage: $0 <command> [options]

Commands:
  build           Build wiki from issues (with auto-detection of incremental mode)
  incremental     Force incremental build
  full-rebuild    Force full rebuild
  test-setup      Test Beaver setup and configuration
  clean           Clean up build artifacts and state
  notify          Send test notifications
  health-check    Perform comprehensive health checks

Options:
  --repository REPO    Override repository (default: auto-detect)
  --config FILE        Override config file (default: beaver.yml)
  --state-file FILE    Override state file (default: .beaver/incremental-state.json)
  --max-items N        Max items per update (default: 100)
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

while [[ $# -gt 0 ]]; do
    case $1 in
        build|incremental|full-rebuild|test-setup|clean|notify|health-check)
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
    if [[ -z "${GITHUB_TOKEN:-}" ]]; then
        log_error "GITHUB_TOKEN environment variable is not set"
        log_info "Please set GITHUB_TOKEN with a valid GitHub personal access token"
        return 1
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

# Test setup
test_setup() {
    log_info "Testing Beaver setup..."
    
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
            log_error "GitHub connection test failed"
            return 1
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
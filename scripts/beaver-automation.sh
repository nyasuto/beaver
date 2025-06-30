#!/bin/bash

# Beaver automation script for self-documentation workflow
# Extracted from beaver.yml workflow inline scripts

set -euo pipefail

# Source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ci-common.sh
source "${SCRIPT_DIR}/ci-common.sh"

# Default configuration
DEFAULT_MAX_ITEMS=100
DEFAULT_THEME="minima"

# Show usage information
usage() {
    cat << EOF
Beaver Automation Script

Usage: $0 <command> [options]

Commands:
    preflight           Run pre-flight checks and determine update type
    github-pages        Generate and deploy GitHub Pages content
    github-wiki         Generate and deploy GitHub Wiki content
    cleanup             Perform self-documentation cleanup
    weekly-analysis     Run comprehensive weekly analysis
    health-check        Perform system health check

Options:
    --repository REPO       Repository in owner/repo format
    --max-items NUM        Maximum items to process (default: $DEFAULT_MAX_ITEMS)
    --theme THEME          Jekyll theme for GitHub Pages (default: $DEFAULT_THEME)
    --update-type TYPE     Update type: incremental, full (default: auto-detect)
    --enable-search        Enable search functionality
    --custom-domain DOMAIN Custom domain for GitHub Pages
    --force-rebuild        Force full rebuild regardless of conditions
    --dry-run              Show commands without executing
    --verbose              Enable verbose output
    --help                 Show this help

Examples:
    $0 preflight --repository owner/repo
    $0 github-pages --repository owner/repo --theme minima --enable-search
    $0 github-wiki --repository owner/repo
    $0 cleanup
    $0 weekly-analysis --repository owner/repo

Environment Variables:
    GITHUB_TOKEN           GitHub API token (required)
    GITHUB_REPOSITORY      Repository in owner/repo format
    GITHUB_EVENT_NAME      GitHub event that triggered this run
    GITHUB_EVENT_ACTION    GitHub event action
    UPDATE_TYPE           Update type override
EOF
}

# Parse command line arguments
parse_args() {
    COMMAND=""
    REPOSITORY="${GITHUB_REPOSITORY:-}"
    MAX_ITEMS="$DEFAULT_MAX_ITEMS"
    THEME="$DEFAULT_THEME"
    UPDATE_TYPE="${UPDATE_TYPE:-}"
    ENABLE_SEARCH=false
    CUSTOM_DOMAIN=""
    FORCE_REBUILD=false
    DRY_RUN=false
    VERBOSE=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            preflight|github-pages|github-wiki|cleanup|weekly-analysis|health-check)
                COMMAND="$1"
                shift
                ;;
            --repository)
                REPOSITORY="$2"
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
            --update-type)
                UPDATE_TYPE="$2"
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
            --force-rebuild)
                FORCE_REBUILD=true
                shift
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
    log_debug "Validating Beaver automation prerequisites"
    
    # Check GitHub token
    if [[ -z "${GITHUB_TOKEN:-}" ]]; then
        log_error "GITHUB_TOKEN not set"
        return 1
    fi
    
    # Validate repository format
    if [[ -n "$REPOSITORY" ]]; then
        validate_repository_format "$REPOSITORY" || return 1
    else
        log_error "Repository not specified"
        return 1
    fi
    
    # Check if Beaver binary exists
    local project_root
    project_root=$(get_project_root)
    local beaver_bin="$project_root/bin/beaver"
    
    if [[ ! -f "$beaver_bin" ]]; then
        log_error "Beaver binary not found at $beaver_bin"
        log_info "Run 'make build' first"
        return 1
    fi
    
    if ! "$beaver_bin" version >/dev/null 2>&1; then
        log_error "Beaver binary is not functional"
        return 1
    fi
    
    return 0
}

# Analyze trigger conditions and determine update type
run_preflight_checks() {
    log_section "Pre-flight Checks and Condition Analysis"
    
    local should_update=true
    local update_type="incremental"
    
    log_info "Event: ${GITHUB_EVENT_NAME:-unknown}"
    log_info "Action: ${GITHUB_EVENT_ACTION:-unknown}"
    
    # Check for skip patterns
    if [[ -n "${COMMIT_MESSAGE:-}" ]] && [[ "$COMMIT_MESSAGE" == *"[skip-wiki]"* ]]; then
        log_info "Skipping - commit contains [skip-wiki]"
        should_update=false
    fi
    
    # Override with force rebuild if requested
    if [[ "$FORCE_REBUILD" == "true" ]]; then
        log_info "Force rebuild requested"
        update_type="full"
    elif [[ -n "$UPDATE_TYPE" ]]; then
        log_info "Update type specified: $UPDATE_TYPE"
        update_type="$UPDATE_TYPE"
    else
        # Determine update type based on trigger
        case "${GITHUB_EVENT_NAME:-}" in
            "issues")
                case "${GITHUB_EVENT_ACTION:-}" in
                    "opened"|"edited"|"reopened"|"labeled"|"unlabeled"|"closed")
                        log_info "Issue event: ${GITHUB_EVENT_ACTION:-unknown} - incremental update"
                        update_type="incremental"
                        ;;
                    *)
                        log_warn "Unknown issue action: ${GITHUB_EVENT_ACTION:-unknown}"
                        should_update=false
                        ;;
                esac
                ;;
            "pull_request")
                if [[ "${GITHUB_EVENT_ACTION:-}" == "closed" ]] && [[ "${GITHUB_EVENT_PR_MERGED:-false}" == "true" ]]; then
                    log_info "PR merged - incremental update"
                    update_type="incremental"
                else
                    log_info "PR event but not merged - skipping"
                    should_update=false
                fi
                ;;
            "push")
                log_info "Push to main - incremental update"
                update_type="incremental"
                ;;
            "schedule")
                log_info "Scheduled run - full rebuild"
                update_type="full"
                ;;
            "workflow_dispatch")
                log_info "Manual trigger - incremental update (use --force-rebuild for full)"
                update_type="incremental"
                ;;
            *)
                log_warn "Unknown event type: ${GITHUB_EVENT_NAME:-unknown}"
                should_update=false
                ;;
        esac
    fi
    
    # Export results for subsequent steps
    export SHOULD_UPDATE="$should_update"
    export DETECTED_UPDATE_TYPE="$update_type"
    
    log_info "Should update: $should_update"
    log_info "Update type: $update_type"
    
    if [[ "$should_update" == "false" ]]; then
        return 1
    fi
    
    return 0
}

# Generate GitHub Pages content
generate_github_pages() {
    log_section "Generating GitHub Pages Content"
    
    local project_root
    project_root=$(get_project_root)
    cd "$project_root"
    
    local beaver_bin="$project_root/bin/beaver"
    local ci_script="$project_root/scripts/ci-beaver.sh"
    
    log_info "Repository: $REPOSITORY"
    log_info "Max items: $MAX_ITEMS"
    log_info "Theme: $THEME"
    log_info "Update type: ${DETECTED_UPDATE_TYPE:-incremental}"
    
    # Use ci-beaver.sh if available
    if [[ -f "$ci_script" ]]; then
        log_info "Using ci-beaver.sh for GitHub Pages generation..."
        
        chmod +x "$ci_script"
        
        local ci_args=(
            github-pages
            --repository "$REPOSITORY"
            --max-items "$MAX_ITEMS"
            --theme "$THEME"
        )
        
        if [[ "$ENABLE_SEARCH" == "true" ]]; then
            ci_args+=(--enable-search)
        fi
        
        if [[ "$VERBOSE" == "true" ]]; then
            ci_args+=(--verbose)
        fi
        
        if [[ "$DRY_RUN" == "true" ]]; then
            ci_args+=(--dry-run)
        fi
        
        if execute_cmd "$ci_script" "${ci_args[@]}"; then
            log_success "GitHub Pages content generated using ci-beaver.sh"
        else
            log_error "GitHub Pages generation failed"
            return 1
        fi
    else
        # Direct Beaver command
        log_info "Using direct Beaver command for GitHub Pages generation..."
        
        local beaver_args=(github-pages)
        
        if [[ "${DETECTED_UPDATE_TYPE:-incremental}" == "full" ]]; then
            beaver_args+=(--force-rebuild)
        else
            beaver_args+=(--incremental)
        fi
        
        beaver_args+=(--max-items "$MAX_ITEMS")
        
        if [[ "$VERBOSE" == "true" ]]; then
            beaver_args+=(--verbose)
        fi
        
        if execute_cmd "$beaver_bin" "${beaver_args[@]}"; then
            log_success "GitHub Pages content generated using direct Beaver command"
        else
            log_error "GitHub Pages generation failed"
            return 1
        fi
    fi
    
    # Setup deployment using deployment script if available
    local deployment_script="$project_root/scripts/deployment.sh"
    if [[ -f "$deployment_script" ]]; then
        log_info "Setting up GitHub Pages deployment..."
        
        chmod +x "$deployment_script"
        
        local deploy_args=(
            setup-pages
            --repository "$REPOSITORY"
            --theme "$THEME"
        )
        
        if [[ "$ENABLE_SEARCH" == "true" ]]; then
            deploy_args+=(--enable-search)
        fi
        
        if [[ -n "$CUSTOM_DOMAIN" ]]; then
            deploy_args+=(--custom-domain "$CUSTOM_DOMAIN")
        fi
        
        if [[ "$VERBOSE" == "true" ]]; then
            deploy_args+=(--verbose)
        fi
        
        if [[ "$DRY_RUN" == "true" ]]; then
            deploy_args+=(--dry-run)
        fi
        
        if execute_cmd "$deployment_script" "${deploy_args[@]}"; then
            log_success "GitHub Pages deployment setup completed"
        else
            log_warn "GitHub Pages deployment setup failed, but content was generated"
        fi
    fi
    
    return 0
}

# Generate GitHub Wiki content
generate_github_wiki() {
    log_section "Generating GitHub Wiki Content"
    
    local project_root
    project_root=$(get_project_root)
    cd "$project_root"
    
    local beaver_bin="$project_root/bin/beaver"
    local ci_script="$project_root/scripts/ci-beaver.sh"
    
    log_info "Repository: $REPOSITORY"
    log_info "Max items: $MAX_ITEMS"
    log_info "Update type: ${DETECTED_UPDATE_TYPE:-incremental}"
    
    # Use ci-beaver.sh if available
    if [[ -f "$ci_script" ]]; then
        log_info "Using ci-beaver.sh for Wiki generation..."
        
        chmod +x "$ci_script"
        
        local command_type="${DETECTED_UPDATE_TYPE:-incremental}"
        case "$command_type" in
            "full")
                command_type="full-rebuild"
                ;;
            *)
                command_type="incremental"
                ;;
        esac
        
        local ci_args=(
            "$command_type"
            --repository "$REPOSITORY"
            --max-items "$MAX_ITEMS"
        )
        
        if [[ "$VERBOSE" == "true" ]]; then
            ci_args+=(--verbose)
        fi
        
        if [[ "$DRY_RUN" == "true" ]]; then
            ci_args+=(--dry-run)
        fi
        
        if execute_cmd "$ci_script" "${ci_args[@]}"; then
            log_success "Wiki content generated using ci-beaver.sh"
        else
            log_error "Wiki generation failed"
            return 1
        fi
    else
        # Direct Beaver command
        log_info "Using direct Beaver command for Wiki generation..."
        
        local beaver_args=(build)
        
        if [[ "${DETECTED_UPDATE_TYPE:-incremental}" == "full" ]]; then
            beaver_args+=(--force-rebuild)
        else
            beaver_args+=(--incremental)
        fi
        
        beaver_args+=(--max-items "$MAX_ITEMS")
        
        if [[ "$VERBOSE" == "true" ]]; then
            beaver_args+=(--verbose)
        fi
        
        if execute_cmd "$beaver_bin" "${beaver_args[@]}"; then
            log_success "Wiki content generated using direct Beaver command"
        else
            log_error "Wiki generation failed"
            return 1
        fi
    fi
    
    # Deploy to GitHub Wiki using deployment script if available
    local deployment_script="$project_root/scripts/deployment.sh"
    if [[ -f "$deployment_script" ]]; then
        log_info "Deploying to GitHub Wiki..."
        
        chmod +x "$deployment_script"
        
        local deploy_args=(
            github-wiki
            --repository "$REPOSITORY"
        )
        
        if [[ "$VERBOSE" == "true" ]]; then
            deploy_args+=(--verbose)
        fi
        
        if [[ "$DRY_RUN" == "true" ]]; then
            deploy_args+=(--dry-run)
        fi
        
        if execute_cmd "$deployment_script" "${deploy_args[@]}"; then
            log_success "GitHub Wiki deployment completed"
        else
            log_warn "GitHub Wiki deployment failed, but content was generated"
        fi
    fi
    
    return 0
}

# Perform self-documentation cleanup
perform_cleanup() {
    log_section "Self-Documentation Cleanup"
    
    local project_root
    project_root=$(get_project_root)
    cd "$project_root"
    
    log_info "Performing self-documentation maintenance cleanup...")
    log_info "Meta-maintenance: Beaver cleaning up its own documentation artifacts")
    
    local ci_script="$project_root/scripts/ci-beaver.sh"
    
    # Use ci-beaver.sh clean if available
    if [[ -f "$ci_script" ]]; then
        log_info "Using ci-beaver.sh for cleanup..."
        
        chmod +x "$ci_script"
        
        local clean_args=(clean)
        
        if [[ "$VERBOSE" == "true" ]]; then
            clean_args+=(--verbose)
        fi
        
        if [[ "$DRY_RUN" == "true" ]]; then
            clean_args+=(--dry-run)
        fi
        
        if execute_cmd "$ci_script" "${clean_args[@]}"; then
            log_success "Cleanup completed using ci-beaver.sh"
        else
            log_error "Cleanup failed"
            return 1
        fi
    else
        # Manual cleanup
        log_info "Performing manual cleanup..."
        
        # Clean up old artifacts
        local beaver_dir="$project_root/.beaver"
        if [[ -d "$beaver_dir" ]]; then
            # Show state size before cleanup
            local state_file="$beaver_dir/incremental-state.json"
            if [[ -f "$state_file" ]]; then
                local file_size
                file_size=$(get_file_size "$state_file")
                log_info "Self-documentation state size before cleanup: $(format_bytes "$file_size")"
            fi
            
            # Clean old logs and temporary files
            find "$beaver_dir" -name "*.log" -mtime +7 -delete 2>/dev/null || true
            find "$beaver_dir" -name "*.tmp" -delete 2>/dev/null || true
            
            # Show state size after cleanup
            if [[ -f "$state_file" ]]; then
                local file_size_after
                file_size_after=$(get_file_size "$state_file")
                log_info "Self-documentation state size after cleanup: $(format_bytes "$file_size_after")"
            fi
        fi
        
        log_success "Manual cleanup completed")
    fi
    
    log_success "Self-documentation cleanup complete - Beaver maintained its own knowledge base"
    return 0
}

# Run comprehensive weekly analysis
run_weekly_analysis() {
    log_section "Weekly Self-Analysis"
    
    local project_root
    project_root=$(get_project_root)
    cd "$project_root"
    
    local beaver_bin="$project_root/bin/beaver"
    
    log_info "Meta-Analysis: Comprehensive review of Beaver's own development patterns")
    log_info "Analysis Period: Past 7 days")
    log_info "Focus: Development trends, health metrics, strategic insights")
    
    # Run comprehensive analysis with extended metrics
    if [[ -f "$beaver_bin" ]]; then
        local analysis_args=(
            build
            --comprehensive-analysis
            --week-range=7
        )
        
        if [[ "$VERBOSE" == "true" ]]; then
            analysis_args+=(--verbose)
        fi
        
        if execute_cmd "$beaver_bin" "${analysis_args[@]}"; then
            log_info "Comprehensive analysis completed")
        else
            log_warn "Comprehensive analysis failed, continuing with individual components")
        fi
        
        # Generate specific analysis components
        local wiki_args=(wiki generate)
        
        log_info "Generating weekly development insights...")
        if execute_cmd "$beaver_bin" "${wiki_args[@]}" development-strategy --force-refresh; then
            log_success "Development strategy analysis completed"
        fi
        
        log_info "Analyzing label effectiveness trends...")
        if execute_cmd "$beaver_bin" "${wiki_args[@]}" label-analysis --trend-analysis; then
            log_success "Label analysis completed"
        fi
        
        log_info "Computing velocity and health trends...")
        if execute_cmd "$beaver_bin" "${wiki_args[@]}" statistics --include-trends; then
            log_success "Statistics analysis completed"
        fi
    else
        log_error "Beaver binary not found, cannot run weekly analysis"
        return 1
    fi
    
    log_success "Weekly self-analysis complete - Comprehensive insights generated"
    return 0
}

# Perform health check
perform_health_check() {
    log_section "Beaver Automation Health Check"
    
    local project_root
    project_root=$(get_project_root)
    cd "$project_root"
    
    local issues=0
    
    # Check disk space
    if ! check_disk_space "$project_root" 90; then
        ((issues++))
    fi
    
    # Check Beaver binary
    local beaver_bin="$project_root/bin/beaver"
    if [[ -f "$beaver_bin" ]]; then
        if "$beaver_bin" status >/dev/null 2>&1; then
            log_success "Beaver binary is functional"
        else
            log_error "Beaver binary exists but is not functional"
            ((issues++))
        fi
    else
        log_error "Beaver binary not found"
        ((issues++))
    fi
    
    # Check incremental state
    local state_file="$project_root/.beaver/incremental-state.json"
    if [[ -f "$state_file" ]]; then
        if validate_json_file "$state_file"; then
            log_success "Incremental state file is valid"
        else
            log_error "Incremental state file is corrupted"
            ((issues++))
        fi
    else
        log_info "Incremental state file not found (normal for first run)"
    fi
    
    # Check log file size
    local log_file="$project_root/.beaver/ci-beaver.log"
    if [[ -f "$log_file" ]]; then
        local log_size
        log_size=$(get_file_size "$log_file")
        if [[ $log_size -gt 10485760 ]]; then  # 10MB
            log_warn "Log file is large: $(format_bytes "$log_size")"
            ((issues++))
        fi
    fi
    
    # Check GitHub connectivity using github-integration script if available
    local github_script="$project_root/scripts/github-integration.sh"
    if [[ -f "$github_script" ]]; then
        chmod +x "$github_script"
        if "$github_script" auth-test >/dev/null 2>&1; then
            log_success "GitHub connectivity OK"
        else
            log_error "GitHub connectivity failed"
            ((issues++))
        fi
    fi
    
    if [[ $issues -eq 0 ]]; then
        log_success "Health check passed - all systems operational"
        return 0
    else
        log_error "Health check completed with $issues issues"
        return 1
    fi
}

# Main execution
main() {
    parse_args "$@"
    
    # Validate prerequisites for commands that need them
    case "$COMMAND" in
        preflight|github-pages|github-wiki|weekly-analysis)
            validate_prerequisites || exit 1
            ;;
    esac
    
    # Change to project root
    cd "$(get_project_root)"
    
    case "$COMMAND" in
        preflight)
            run_preflight_checks
            ;;
        github-pages)
            # Run preflight if not already done
            if [[ -z "${DETECTED_UPDATE_TYPE:-}" ]]; then
                run_preflight_checks || exit 1
            fi
            generate_github_pages
            ;;
        github-wiki)
            # Run preflight if not already done
            if [[ -z "${DETECTED_UPDATE_TYPE:-}" ]]; then
                run_preflight_checks || exit 1
            fi
            generate_github_wiki
            ;;
        cleanup)
            perform_cleanup
            ;;
        weekly-analysis)
            run_weekly_analysis
            ;;
        health-check)
            perform_health_check
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
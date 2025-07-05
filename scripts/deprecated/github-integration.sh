#!/bin/bash

# GitHub API integration utilities for Beaver project
# Handles GitHub API interactions, authentication, and repository operations

set -euo pipefail

# Source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ci-common.sh
source "${SCRIPT_DIR}/ci-common.sh"

# GitHub API configuration
GITHUB_API_BASE="https://api.github.com"
DEFAULT_PER_PAGE=30
MAX_PER_PAGE=100

# Show usage information
usage() {
    cat << EOF
GitHub Integration Tools for Beaver

Usage: $0 <command> [options]

Commands:
    auth-test       Test GitHub authentication
    repo-info       Get repository information
    list-issues     List repository issues
    list-prs        List repository pull requests
    create-issue    Create a new issue
    update-issue    Update an existing issue
    get-commits     Get repository commits
    check-limits    Check API rate limits
    setup-webhook   Setup repository webhook
    validate-repo   Validate repository access

Options:
    --repository REPO       Repository in owner/repo format
    --token TOKEN          GitHub API token (or use GITHUB_TOKEN env var)
    --per-page NUM         Items per page (default: $DEFAULT_PER_PAGE, max: $MAX_PER_PAGE)
    --page NUM             Page number to fetch (default: 1)
    --state STATE          Issue/PR state: open, closed, all (default: open)
    --labels LABELS        Comma-separated list of labels to filter
    --since DATE           Filter items since date (ISO 8601 format)
    --sort SORT            Sort field: created, updated, comments (default: created)
    --direction DIR        Sort direction: asc, desc (default: desc)
    --format FORMAT        Output format: json, table, csv (default: table)
    --output FILE          Output file (default: stdout)
    --dry-run              Show API calls without executing
    --verbose              Enable verbose output
    --help                 Show this help

Examples:
    $0 auth-test
    $0 repo-info --repository owner/repo
    $0 list-issues --repository owner/repo --state all --format json
    $0 list-prs --repository owner/repo --since 2023-01-01
    $0 check-limits
    $0 validate-repo --repository owner/repo

Environment Variables:
    GITHUB_TOKEN           GitHub API token (required)
    GITHUB_REPOSITORY      Repository in owner/repo format
EOF
}

# Parse command line arguments
parse_args() {
    COMMAND=""
    REPOSITORY="${GITHUB_REPOSITORY:-}"
    TOKEN="${GITHUB_TOKEN:-}"
    PER_PAGE=$DEFAULT_PER_PAGE
    PAGE=1
    STATE="open"
    LABELS=""
    SINCE=""
    SORT="created"
    DIRECTION="desc"
    FORMAT="table"
    OUTPUT=""
    DRY_RUN=false
    VERBOSE=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            auth-test|repo-info|list-issues|list-prs|create-issue|update-issue|get-commits|check-limits|setup-webhook|validate-repo)
                COMMAND="$1"
                shift
                ;;
            --repository)
                REPOSITORY="$2"
                shift 2
                ;;
            --token)
                TOKEN="$2"
                shift 2
                ;;
            --per-page)
                PER_PAGE="$2"
                shift 2
                ;;
            --page)
                PAGE="$2"
                shift 2
                ;;
            --state)
                STATE="$2"
                shift 2
                ;;
            --labels)
                LABELS="$2"
                shift 2
                ;;
            --since)
                SINCE="$2"
                shift 2
                ;;
            --sort)
                SORT="$2"
                shift 2
                ;;
            --direction)
                DIRECTION="$2"
                shift 2
                ;;
            --format)
                FORMAT="$2"
                shift 2
                ;;
            --output)
                OUTPUT="$2"
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
    
    # Validate per-page parameter
    if [[ $PER_PAGE -gt $MAX_PER_PAGE ]]; then
        log_warn "per-page value $PER_PAGE exceeds maximum $MAX_PER_PAGE, using $MAX_PER_PAGE"
        PER_PAGE=$MAX_PER_PAGE
    fi
}

# Validate prerequisites
validate_prerequisites() {
    log_debug "Validating GitHub integration prerequisites"
    
    # Check GitHub token
    if [[ -z "$TOKEN" ]]; then
        log_error "GitHub token not provided"
        log_info "Set GITHUB_TOKEN environment variable or use --token option"
        return 1
    fi
    
    # Check curl availability
    if ! command_exists curl; then
        log_error "curl is not installed or not in PATH"
        return 1
    fi
    
    # Check jq availability for JSON processing
    if ! command_exists jq; then
        log_warn "jq is not available - JSON formatting will be limited"
    fi
    
    return 0
}

# Make GitHub API request
github_api_request() {
    local method="$1"
    local endpoint="$2"
    local data="${3:-}"
    
    local url="${GITHUB_API_BASE}${endpoint}"
    local curl_args=(
        -s
        -X "$method"
        -H "Authorization: token $TOKEN"
        -H "Accept: application/vnd.github.v3+json"
        -H "User-Agent: Beaver-CI/1.0"
    )
    
    if [[ -n "$data" ]]; then
        curl_args+=(-H "Content-Type: application/json" -d "$data")
    fi
    
    log_debug "API Request: $method $url"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: curl ${curl_args[*]} \"$url\""
        echo '{"message": "dry run - no actual API call made"}'
        return 0
    fi
    
    local response
    local http_code
    
    # Make the request and capture both response and HTTP status
    response=$(curl "${curl_args[@]}" -w "\n%{http_code}" "$url")
    http_code=$(echo "$response" | tail -n1)
    response=$(echo "$response" | head -n -1)
    
    log_debug "HTTP Status: $http_code"
    
    # Check for API errors
    case "$http_code" in
        200|201|204)
            echo "$response"
            return 0
            ;;
        401)
            log_error "Authentication failed - check your GitHub token"
            return 1
            ;;
        403)
            log_error "Access forbidden - check repository permissions and rate limits"
            if echo "$response" | grep -q "rate limit"; then
                log_info "You may have exceeded the GitHub API rate limit"
            fi
            return 1
            ;;
        404)
            log_error "Resource not found - check repository name and token permissions"
            return 1
            ;;
        422)
            log_error "Validation failed"
            if command_exists jq; then
                echo "$response" | jq -r '.errors[]?.message // .message // "Unknown validation error"' | while read -r msg; do
                    log_error "Validation: $msg"
                done
            fi
            return 1
            ;;
        *)
            log_error "API request failed with HTTP $http_code"
            log_debug "Response: $response"
            return 1
            ;;
    esac
}

# Format output based on requested format
format_output() {
    local data="$1"
    local output_file="${2:-}"
    
    case "$FORMAT" in
        json)
            if command_exists jq; then
                data=$(echo "$data" | jq .)
            fi
            ;;
        table)
            # Convert JSON to table format - implementation depends on command
            case "$COMMAND" in
                list-issues|list-prs)
                    if command_exists jq; then
                        data=$(echo "$data" | jq -r '
                            ["NUMBER", "TITLE", "STATE", "AUTHOR", "CREATED"] as $headers |
                            $headers, 
                            (.[] | [.number, .title[0:50], .state, .user.login, .created_at[0:10]]) |
                            @tsv' | column -t -s $'\t')
                    fi
                    ;;
                get-commits)
                    if command_exists jq; then
                        data=$(echo "$data" | jq -r '
                            ["SHA", "MESSAGE", "AUTHOR", "DATE"] as $headers |
                            $headers,
                            (.[] | [.sha[0:7], .commit.message[0:50], .commit.author.name, .commit.author.date[0:10]]) |
                            @tsv' | column -t -s $'\t')
                    fi
                    ;;
            esac
            ;;
        csv)
            if command_exists jq; then
                case "$COMMAND" in
                    list-issues|list-prs)
                        data=$(echo "$data" | jq -r '
                            ["number", "title", "state", "author", "created_at"] as $headers |
                            $headers,
                            (.[] | [.number, .title, .state, .user.login, .created_at]) |
                            @csv')
                        ;;
                    get-commits)
                        data=$(echo "$data" | jq -r '
                            ["sha", "message", "author", "date"] as $headers |
                            $headers,
                            (.[] | [.sha, .commit.message, .commit.author.name, .commit.author.date]) |
                            @csv')
                        ;;
                esac
            fi
            ;;
    esac
    
    # Output to file or stdout
    if [[ -n "$output_file" ]]; then
        echo "$data" > "$output_file"
        log_success "Output written to: $output_file"
    else
        echo "$data"
    fi
}

# Test GitHub authentication
test_authentication() {
    log_section "Testing GitHub Authentication"
    
    local response
    if response=$(github_api_request GET "/user"); then
        if command_exists jq; then
            local username
            username=$(echo "$response" | jq -r '.login')
            log_success "Authentication successful for user: $username"
            
            if [[ "$VERBOSE" == "true" ]]; then
                log_info "User details:"
                echo "$response" | jq '{login, name, email, public_repos, private_repos, plan}'
            fi
        else
            log_success "Authentication successful"
        fi
        return 0
    else
        log_error "Authentication failed"
        return 1
    fi
}

# Get repository information
get_repository_info() {
    log_section "Getting Repository Information"
    
    if [[ -z "$REPOSITORY" ]]; then
        log_error "Repository not specified"
        return 1
    fi
    
    validate_repository_format "$REPOSITORY" || return 1
    
    local response
    if response=$(github_api_request GET "/repos/$REPOSITORY"); then
        format_output "$response" "$OUTPUT"
        return 0
    else
        log_error "Failed to get repository information"
        return 1
    fi
}

# List repository issues
list_issues() {
    log_section "Listing Repository Issues"
    
    if [[ -z "$REPOSITORY" ]]; then
        log_error "Repository not specified"
        return 1
    fi
    
    validate_repository_format "$REPOSITORY" || return 1
    
    # Build query parameters
    local params="?per_page=$PER_PAGE&page=$PAGE&state=$STATE&sort=$SORT&direction=$DIRECTION"
    
    if [[ -n "$LABELS" ]]; then
        params="${params}&labels=${LABELS}"
    fi
    
    if [[ -n "$SINCE" ]]; then
        params="${params}&since=${SINCE}"
    fi
    
    local response
    if response=$(github_api_request GET "/repos/$REPOSITORY/issues$params"); then
        format_output "$response" "$OUTPUT"
        return 0
    else
        log_error "Failed to list issues"
        return 1
    fi
}

# List repository pull requests
list_pull_requests() {
    log_section "Listing Repository Pull Requests"
    
    if [[ -z "$REPOSITORY" ]]; then
        log_error "Repository not specified"
        return 1
    fi
    
    validate_repository_format "$REPOSITORY" || return 1
    
    # Build query parameters
    local params="?per_page=$PER_PAGE&page=$PAGE&state=$STATE&sort=$SORT&direction=$DIRECTION"
    
    local response
    if response=$(github_api_request GET "/repos/$REPOSITORY/pulls$params"); then
        format_output "$response" "$OUTPUT"
        return 0
    else
        log_error "Failed to list pull requests"
        return 1
    fi
}

# Get repository commits
get_commits() {
    log_section "Getting Repository Commits"
    
    if [[ -z "$REPOSITORY" ]]; then
        log_error "Repository not specified"
        return 1
    fi
    
    validate_repository_format "$REPOSITORY" || return 1
    
    # Build query parameters
    local params="?per_page=$PER_PAGE&page=$PAGE"
    
    if [[ -n "$SINCE" ]]; then
        params="${params}&since=${SINCE}"
    fi
    
    local response
    if response=$(github_api_request GET "/repos/$REPOSITORY/commits$params"); then
        format_output "$response" "$OUTPUT"
        return 0
    else
        log_error "Failed to get commits"
        return 1
    fi
}

# Check API rate limits
check_rate_limits() {
    log_section "Checking GitHub API Rate Limits"
    
    local response
    if response=$(github_api_request GET "/rate_limit"); then
        if command_exists jq; then
            echo "$response" | jq '{
                core: {
                    limit: .resources.core.limit,
                    remaining: .resources.core.remaining,
                    reset: (.resources.core.reset | strftime("%Y-%m-%d %H:%M:%S UTC"))
                },
                search: {
                    limit: .resources.search.limit,
                    remaining: .resources.search.remaining,
                    reset: (.resources.search.reset | strftime("%Y-%m-%d %H:%M:%S UTC"))
                }
            }'
        else
            echo "$response"
        fi
        return 0
    else
        log_error "Failed to check rate limits"
        return 1
    fi
}

# Validate repository access
validate_repository() {
    log_section "Validating Repository Access"
    
    if [[ -z "$REPOSITORY" ]]; then
        log_error "Repository not specified"
        return 1
    fi
    
    validate_repository_format "$REPOSITORY" || return 1
    
    local issues=0
    
    # Check repository existence and access
    log_info "Checking repository access..."
    if get_repository_info >/dev/null 2>&1; then
        log_success "Repository access OK"
    else
        log_error "Repository access failed"
        ((issues++))
    fi
    
    # Check issues access
    log_info "Checking issues access..."
    if github_api_request GET "/repos/$REPOSITORY/issues?per_page=1" >/dev/null 2>&1; then
        log_success "Issues access OK"
    else
        log_error "Issues access failed"
        ((issues++))
    fi
    
    # Check pull requests access
    log_info "Checking pull requests access..."
    if github_api_request GET "/repos/$REPOSITORY/pulls?per_page=1" >/dev/null 2>&1; then
        log_success "Pull requests access OK"
    else
        log_error "Pull requests access failed"
        ((issues++))
    fi
    
    # Check commits access
    log_info "Checking commits access..."
    if github_api_request GET "/repos/$REPOSITORY/commits?per_page=1" >/dev/null 2>&1; then
        log_success "Commits access OK"
    else
        log_error "Commits access failed"
        ((issues++))
    fi
    
    if [[ $issues -eq 0 ]]; then
        log_success "Repository validation passed"
        return 0
    else
        log_error "Repository validation failed with $issues issues"
        return 1
    fi
}

# Main execution
main() {
    parse_args "$@"
    
    # Validate prerequisites for commands that need them
    case "$COMMAND" in
        auth-test|repo-info|list-issues|list-prs|create-issue|update-issue|get-commits|check-limits|setup-webhook|validate-repo)
            validate_prerequisites || exit 1
            ;;
    esac
    
    case "$COMMAND" in
        auth-test)
            test_authentication
            ;;
        repo-info)
            get_repository_info
            ;;
        list-issues)
            list_issues
            ;;
        list-prs)
            list_pull_requests
            ;;
        get-commits)
            get_commits
            ;;
        check-limits)
            check_rate_limits
            ;;
        validate-repo)
            validate_repository
            ;;
        create-issue|update-issue|setup-webhook)
            log_error "Command '$COMMAND' not yet implemented"
            exit 1
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
#!/bin/bash

# CI quality checks for Beaver project
# Extracted from ci.yml workflow inline scripts

set -euo pipefail

# Source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ci-common.sh
source "${SCRIPT_DIR}/ci-common.sh"

# Show usage information
usage() {
    cat << EOF
CI Quality Checks for Beaver

Usage: $0 <command> [options]

Commands:
    format-check    Check Go code formatting
    lint            Run linting and security checks
    unit-tests      Run unit tests with coverage
    build-test      Test build process
    integration     Run integration tests
    performance     Run performance tests
    all             Run all quality checks

Options:
    --coverage-file FILE    Coverage output file (default: coverage.out)
    --timeout DURATION     Test timeout (default: 15m)
    --verbose              Enable verbose output
    --fail-fast            Stop on first failure
    --skip-slow            Skip slow tests
    --help                 Show this help

Examples:
    $0 all
    $0 format-check
    $0 unit-tests --coverage-file coverage.out
    $0 integration --timeout 30m

Environment Variables:
    GOPROXY                Go proxy URL
    GITHUB_TOKEN          GitHub token for integration tests
    BEAVER_TEST_REPO_OWNER Test repository owner
    BEAVER_TEST_REPO_NAME Test repository name
EOF
}

# Parse command line arguments
parse_args() {
    COMMAND=""
    COVERAGE_FILE="coverage.out"
    TIMEOUT="15m"
    VERBOSE=false
    FAIL_FAST=false
    SKIP_SLOW=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            format-check|lint|unit-tests|build-test|integration|performance|all)
                COMMAND="$1"
                shift
                ;;
            --coverage-file)
                COVERAGE_FILE="$2"
                shift 2
                ;;
            --timeout)
                TIMEOUT="$2"
                shift 2
                ;;
            --verbose)
                VERBOSE=true
                export DEBUG=true
                shift
                ;;
            --fail-fast)
                FAIL_FAST=true
                shift
                ;;
            --skip-slow)
                SKIP_SLOW=true
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

# Check Go code formatting
check_format() {
    log_section "Checking Go Code Formatting"
    
    local project_root
    project_root=$(get_project_root)
    cd "$project_root"
    
    log_info "Running gofmt check..."
    local unformatted
    unformatted=$(gofmt -l .)
    
    if [[ -n "$unformatted" ]]; then
        log_error "Unformatted files found:"
        echo "$unformatted" | while read -r file; do
            log_error "  $file"
        done
        log_info "Run 'gofmt -w .' to fix formatting"
        return 1
    fi
    
    log_success "All files are properly formatted"
    return 0
}

# Run linting and security checks
run_lint() {
    log_section "Running Linting and Security Checks"
    
    local project_root
    project_root=$(get_project_root)
    cd "$project_root"
    
    # Check if golangci-lint is available
    if ! command_exists golangci-lint; then
        log_warn "golangci-lint not found, attempting to use go vet instead"
        
        log_info "Running go vet..."
        if go vet ./...; then
            log_success "go vet passed"
        else
            log_error "go vet failed"
            return 1
        fi
    else
        log_info "Running golangci-lint..."
        local lint_args=(--timeout=5m)
        
        if [[ "$VERBOSE" == "true" ]]; then
            lint_args+=(--verbose)
        fi
        
        if golangci-lint run "${lint_args[@]}"; then
            log_success "Linting passed"
        else
            log_error "Linting failed"
            return 1
        fi
    fi
    
    # Run security vulnerability check if govulncheck is available
    if command_exists govulncheck; then
        log_info "Running vulnerability check..."
        if govulncheck ./...; then
            log_success "No vulnerabilities found"
        else
            log_error "Vulnerability check failed"
            return 1
        fi
    else
        log_warn "govulncheck not found, skipping vulnerability check"
    fi
    
    return 0
}

# Run unit tests with coverage
run_unit_tests() {
    log_section "Running Unit Tests"
    
    local project_root
    project_root=$(get_project_root)
    cd "$project_root"
    
    log_info "Running unit tests with coverage..."
    
    local test_args=(
        -v
        -race
        -coverprofile="$COVERAGE_FILE"
        -timeout="$TIMEOUT"
    )
    
    if [[ "$SKIP_SLOW" == "true" ]]; then
        test_args+=(-short)
        log_info "Skipping slow tests"
    fi
    
    # Set Go proxy for CI environments
    if [[ -n "${GOPROXY:-}" ]]; then
        export GOPROXY
        log_debug "Using GOPROXY: $GOPROXY"
    fi
    
    if go test "${test_args[@]}" ./...; then
        log_success "All unit tests passed"
        
        # Show coverage summary if coverage file exists
        if [[ -f "$COVERAGE_FILE" ]]; then
            log_info "Test coverage summary:"
            go tool cover -func="$COVERAGE_FILE" | tail -1
            
            # Generate HTML coverage report if verbose
            if [[ "$VERBOSE" == "true" ]]; then
                local html_coverage="coverage.html"
                go tool cover -html="$COVERAGE_FILE" -o "$html_coverage"
                log_info "HTML coverage report: $html_coverage"
            fi
        fi
        
        return 0
    else
        log_error "Unit tests failed"
        return 1
    fi
}

# Test build process
test_build() {
    log_section "Testing Build Process"
    
    local project_root
    project_root=$(get_project_root)
    cd "$project_root"
    
    # Use build-tools.sh script if available
    if [[ -f "${SCRIPT_DIR}/build-tools.sh" ]]; then
        log_info "Using build-tools.sh for build test..."
        if "${SCRIPT_DIR}/build-tools.sh" build --verbose; then
            log_success "Build test using build-tools.sh passed"
        else
            log_error "Build test using build-tools.sh failed"
            return 1
        fi
    else
        # Fallback to make if available
        if [[ -f "Makefile" ]]; then
            log_info "Running make build..."
            if make build; then
                log_success "Make build passed"
            else
                log_error "Make build failed"
                return 1
            fi
        else
            # Direct go build
            log_info "Running direct go build..."
            if go build -o bin/beaver ./cmd/beaver; then
                log_success "Direct go build passed"
            else
                log_error "Direct go build failed"
                return 1
            fi
        fi
    fi
    
    # Test binary if it exists
    local binary_path="bin/beaver"
    if [[ -f "$binary_path" ]]; then
        log_info "Testing binary functionality..."
        chmod +x "$binary_path"
        
        if "$binary_path" --help >/dev/null 2>&1; then
            log_success "Binary test passed"
        else
            log_warn "Binary test failed - binary may not be functional"
        fi
    else
        log_warn "Binary not found at expected location: $binary_path"
    fi
    
    return 0
}

# Run integration tests
run_integration_tests() {
    log_section "Running Integration Tests"
    
    local project_root
    project_root=$(get_project_root)
    cd "$project_root"
    
    # Check if integration test script exists
    local integration_script="${SCRIPT_DIR}/run-integration-tests.sh"
    if [[ -f "$integration_script" ]]; then
        log_info "Using integration test script..."
        
        # Make script executable
        chmod +x "$integration_script"
        
        # Check environment configuration
        if "$integration_script" --check; then
            log_info "Integration test environment is configured"
        else
            log_warn "Integration test environment not configured, skipping"
            return 0
        fi
        
        # Run quick integration tests
        local test_args=(--quick --run)
        
        if [[ "$VERBOSE" == "true" ]]; then
            test_args+=(--verbose)
        fi
        
        if "$integration_script" "${test_args[@]}"; then
            log_success "Integration tests passed"
        else
            log_error "Integration tests failed"
            return 1
        fi
    else
        # Direct integration test execution
        log_info "Running integration tests directly..."
        
        # Check if integration tests are enabled
        if [[ "${BEAVER_INTEGRATION_TESTS:-false}" != "true" ]]; then
            log_info "Integration tests not enabled (BEAVER_INTEGRATION_TESTS != true)"
            return 0
        fi
        
        # Check required environment variables
        local missing_vars=()
        for var in GITHUB_TOKEN BEAVER_TEST_REPO_OWNER BEAVER_TEST_REPO_NAME; do
            if [[ -z "${!var:-}" ]]; then
                missing_vars+=("$var")
            fi
        done
        
        if [[ ${#missing_vars[@]} -gt 0 ]]; then
            log_warn "Missing environment variables for integration tests: ${missing_vars[*]}"
            log_info "Skipping integration tests"
            return 0
        fi
        
        # Run integration tests
        local test_args=(-v -timeout="$TIMEOUT")
        
        if [[ "$SKIP_SLOW" == "true" ]]; then
            test_args+=(-short)
        fi
        
        if go test "${test_args[@]}" ./tests/integration/...; then
            log_success "Integration tests passed"
        else
            log_error "Integration tests failed"
            return 1
        fi
    fi
    
    return 0
}

# Run performance tests
run_performance_tests() {
    log_section "Running Performance Tests"
    
    local project_root
    project_root=$(get_project_root)
    cd "$project_root"
    
    if [[ "$SKIP_SLOW" == "true" ]]; then
        log_info "Skipping performance tests (--skip-slow enabled)"
        return 0
    fi
    
    # Check if integration test script exists for performance tests
    local integration_script="${SCRIPT_DIR}/run-integration-tests.sh"
    if [[ -f "$integration_script" ]]; then
        log_info "Using integration script for performance tests..."
        
        # Make script executable
        chmod +x "$integration_script"
        
        # Check environment configuration
        if ! "$integration_script" --check; then
            log_warn "Integration test environment not configured, skipping performance tests"
            return 0
        fi
        
        # Run all tests (including performance)
        local test_args=(--all --run)
        
        if [[ "$VERBOSE" == "true" ]]; then
            test_args+=(--verbose)
        fi
        
        if timeout 30m "$integration_script" "${test_args[@]}"; then
            log_success "Performance tests passed"
        else
            log_error "Performance tests failed"
            return 1
        fi
    else
        log_info "Performance test script not found, skipping performance tests"
        return 0
    fi
    
    return 0
}

# Run all quality checks
run_all_checks() {
    log_section "Running All Quality Checks"
    
    local failed_checks=()
    
    # Run checks in sequence, collecting failures
    if ! check_format; then
        failed_checks+=("format-check")
        if [[ "$FAIL_FAST" == "true" ]]; then
            log_error "Stopping on first failure: format-check"
            return 1
        fi
    fi
    
    if ! run_lint; then
        failed_checks+=("lint")
        if [[ "$FAIL_FAST" == "true" ]]; then
            log_error "Stopping on first failure: lint"
            return 1
        fi
    fi
    
    if ! run_unit_tests; then
        failed_checks+=("unit-tests")
        if [[ "$FAIL_FAST" == "true" ]]; then
            log_error "Stopping on first failure: unit-tests"
            return 1
        fi
    fi
    
    if ! test_build; then
        failed_checks+=("build-test")
        if [[ "$FAIL_FAST" == "true" ]]; then
            log_error "Stopping on first failure: build-test"
            return 1
        fi
    fi
    
    # Integration and performance tests are optional for "all"
    if ! run_integration_tests; then
        log_warn "Integration tests failed, but continuing..."
    fi
    
    # Report results
    if [[ ${#failed_checks[@]} -eq 0 ]]; then
        log_success "All quality checks passed!"
        return 0
    else
        log_error "Quality checks failed: ${failed_checks[*]}"
        return 1
    fi
}

# Main execution
main() {
    parse_args "$@"
    
    # Change to project root
    cd "$(get_project_root)"
    
    case "$COMMAND" in
        format-check)
            check_format
            ;;
        lint)
            run_lint
            ;;
        unit-tests)
            run_unit_tests
            ;;
        build-test)
            test_build
            ;;
        integration)
            run_integration_tests
            ;;
        performance)
            run_performance_tests
            ;;
        all)
            run_all_checks
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
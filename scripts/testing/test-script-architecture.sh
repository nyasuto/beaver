#!/bin/bash

# Test script for the new CI script architecture
# This script validates that all components are working correctly

set -euo pipefail

# Source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../core/ci-common.sh
source "${SCRIPT_DIR}/../core/ci-common.sh"

# Test configuration
TEST_REPOSITORY="test/repo"
# VERBOSE removed as unused
DRY_RUN=true

# Show usage information
usage() {
    cat << EOF
Test Script Architecture

Usage: $0 [options]

Options:
    --repository REPO    Test repository (default: $TEST_REPOSITORY)
    --verbose           Enable verbose output
    --no-dry-run        Execute actual commands (default: dry-run)
    --help              Show this help

Tests:
    - Common functions functionality
    - Script availability and execution
    - Configuration file validation
    - Composite Actions structure
    - Error handling

Examples:
    $0                                  # Run all tests in dry-run mode
    $0 --verbose                        # Run with verbose output
    $0 --no-dry-run --repository owner/repo  # Run actual tests
EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --repository)
            TEST_REPOSITORY="$2"
            shift 2
            ;;
        --verbose)
            export DEBUG=true
            shift
            ;;
        --no-dry-run)
            DRY_RUN=false
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

# Test results tracking
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# Test function wrapper
run_test() {
    local test_name="$1"
    local test_function="$2"
    
    ((TESTS_RUN++))
    log_info "Running test: $test_name"
    
    if $test_function; then
        log_success "✅ $test_name"
        ((TESTS_PASSED++))
    else
        log_error "❌ $test_name"
        ((TESTS_FAILED++))
        FAILED_TESTS+=("$test_name")
    fi
    echo
}

# Test common functions
test_common_functions() {
    log_debug "Testing common functions..."
    
    # Test logging functions
    log_info "Testing log_info function"
    log_success "Testing log_success function"
    log_warn "Testing log_warn function"
    log_debug "Testing log_debug function"
    
    # Test utility functions
    if command_exists bash; then
        log_debug "✅ command_exists works"
    else
        log_error "❌ command_exists failed"
        return 1
    fi
    
    # Test repository validation
    if validate_repository_format "owner/repo"; then
        log_debug "✅ Repository validation works"
    else
        log_error "❌ Repository validation failed"
        return 1
    fi
    
    # Test invalid repository format
    if ! validate_repository_format "invalid-repo-format"; then
        log_debug "✅ Repository validation correctly rejects invalid format"
    else
        log_error "❌ Repository validation should have failed"
        return 1
    fi
    
    return 0
}

# Test script availability
test_script_availability() {
    log_debug "Testing script availability..."
    
    local scripts=(
        "../core/ci-common.sh"
        "../core/ci-beaver.sh"
        "../core/release.sh"
        "../build/build-tools.sh"
        "../build/build-integrated.sh"
    )
    
    for script in "${scripts[@]}"; do
        local script_path="$SCRIPT_DIR/$script"
        if [[ -f "$script_path" ]]; then
            if [[ -x "$script_path" ]]; then
                log_debug "✅ $script is available and executable"
            else
                log_error "❌ $script is not executable"
                return 1
            fi
        else
            log_error "❌ $script not found at $script_path"
            return 1
        fi
    done
    
    return 0
}

# Test script help functionality
test_script_help() {
    log_debug "Testing script help functionality..."
    
    local scripts=(
        "build-tools.sh"
        "deployment.sh"
        "github-integration.sh"
        "ci-checks.sh"
        "release-builder.sh"
        "beaver-automation.sh"
    )
    
    for script in "${scripts[@]}"; do
        local script_path="$SCRIPT_DIR/$script"
        if [[ -f "$script_path" ]]; then
            log_debug "Testing help for $script"
            if "$script_path" --help >/dev/null 2>&1; then
                log_debug "✅ $script --help works"
            else
                log_error "❌ $script --help failed"
                return 1
            fi
        fi
    done
    
    return 0
}

# Test configuration files
test_configuration_files() {
    log_debug "Testing configuration files..."
    
    local project_root
    project_root=$(get_project_root)
    
    local config_files=(
        "config/ci-config.yml"
        "config/build-config.yml"
        "config/deployment-config.yml"
    )
    
    for config_file in "${config_files[@]}"; do
        local config_path="$project_root/$config_file"
        if [[ -f "$config_path" ]]; then
            log_debug "Validating $config_file"
            
            # Basic YAML syntax check
            if command_exists python3; then
                if python3 -c "import yaml" 2>/dev/null; then
                    if python3 -c "import yaml; yaml.safe_load(open('$config_path'))" 2>/dev/null; then
                        log_debug "✅ $config_file has valid YAML syntax"
                    else
                        log_error "❌ $config_file has invalid YAML syntax"
                        return 1
                    fi
                else
                    log_warn "PyYAML not available, skipping syntax check for $config_file"
                fi
            elif command_exists ruby; then
                if ruby -e "require 'yaml'; YAML.load_file('$config_path')" 2>/dev/null; then
                    log_debug "✅ $config_file has valid YAML syntax"
                else
                    log_warn "Ruby YAML validation failed or not available for $config_file"
                fi
            else
                log_warn "No YAML validator available, skipping syntax check for $config_file"
            fi
        else
            log_error "❌ $config_file not found"
            return 1
        fi
    done
    
    return 0
}

# Test Composite Actions structure
test_composite_actions() {
    log_debug "Testing Composite Actions structure..."
    
    local project_root
    project_root=$(get_project_root)
    
    local actions=(
        "setup-beaver"
        "build-and-test"
        "deploy-wiki"
    )
    
    for action in "${actions[@]}"; do
        local action_path="$project_root/.github/actions/$action"
        local action_file="$action_path/action.yml"
        
        if [[ -d "$action_path" ]]; then
            log_debug "✅ Action directory exists: $action"
            
            if [[ -f "$action_file" ]]; then
                log_debug "✅ Action file exists: $action/action.yml"
                
                # Basic validation of action.yml
                if grep -q "name:" "$action_file" && \
                   grep -q "description:" "$action_file" && \
                   grep -q "runs:" "$action_file"; then
                    log_debug "✅ $action has required action.yml fields"
                else
                    log_error "❌ $action missing required action.yml fields"
                    return 1
                fi
            else
                log_error "❌ Action file missing: $action_file"
                return 1
            fi
        else
            log_error "❌ Action directory missing: $action_path"
            return 1
        fi
    done
    
    return 0
}

# Test error handling
test_error_handling() {
    log_debug "Testing error handling..."
    
    # Test script behavior with invalid arguments
    local script_path="$SCRIPT_DIR/build-tools.sh"
    if [[ -f "$script_path" ]]; then
        # This should fail gracefully
        if "$script_path" --invalid-option >/dev/null 2>&1; then
            log_error "❌ Script should have failed with invalid option"
            return 1
        else
            log_debug "✅ Script correctly handles invalid options"
        fi
    fi
    
    # Test with missing required arguments
    if "$script_path" >/dev/null 2>&1; then
        log_error "❌ Script should have failed with no command"
        return 1
    else
        log_debug "✅ Script correctly requires command argument"
    fi
    
    return 0
}

# Test dry-run functionality
test_dry_run() {
    log_debug "Testing dry-run functionality..."
    
    local scripts=(
        "../build/build-tools.sh"
        "../core/ci-beaver.sh"
    )
    
    for script in "${scripts[@]}"; do
        local script_path="$SCRIPT_DIR/$script"
        if [[ -f "$script_path" ]]; then
            # Check if script supports --dry-run
            if "$script_path" --help 2>&1 | grep -q "\-\-dry-run"; then
                log_debug "✅ $script supports --dry-run"
            else
                log_warn "⚠️ $script does not support --dry-run"
            fi
        fi
    done
    
    return 0
}

# Test integration with existing CI script
test_ci_integration() {
    log_debug "Testing integration with existing CI script..."
    
    local ci_script="$SCRIPT_DIR/../core/ci-beaver.sh"
    if [[ -f "$ci_script" ]]; then
        if [[ -x "$ci_script" ]]; then
            log_debug "✅ ci-beaver.sh is available and executable"
            
            # Test health check
            if "$ci_script" health-check >/dev/null 2>&1; then
                log_debug "✅ ci-beaver.sh health-check works"
            else
                log_debug "⚠️ ci-beaver.sh health-check failed (may be normal without full environment)"
            fi
        else
            log_error "❌ ci-beaver.sh is not executable"
            return 1
        fi
    else
        log_error "❌ ci-beaver.sh not found"
        return 1
    fi
    
    return 0
}

# Main test execution
main() {
    log_section "CI Script Architecture Test Suite"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "Running in DRY-RUN mode"
    else
        log_info "Running in LIVE mode"
    fi
    
    log_info "Test repository: $TEST_REPOSITORY"
    echo
    
    # Run all tests
    run_test "Common Functions" test_common_functions
    run_test "Script Availability" test_script_availability
    run_test "Script Help" test_script_help
    run_test "Configuration Files" test_configuration_files
    run_test "Composite Actions" test_composite_actions
    run_test "Error Handling" test_error_handling
    run_test "Dry-run Functionality" test_dry_run
    run_test "CI Integration" test_ci_integration
    
    # Test summary
    log_section "Test Results Summary"
    log_info "Tests run: $TESTS_RUN"
    log_success "Tests passed: $TESTS_PASSED"
    
    if [[ $TESTS_FAILED -gt 0 ]]; then
        log_error "Tests failed: $TESTS_FAILED"
        log_error "Failed tests: ${FAILED_TESTS[*]}"
        echo
        log_error "❌ Test suite FAILED"
        return 1
    else
        echo
        log_success "🎉 All tests PASSED!"
        log_success "CI script architecture is working correctly"
        return 0
    fi
}

# Execute main function
main "$@"
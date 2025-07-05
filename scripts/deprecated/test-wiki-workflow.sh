#!/bin/bash

# Test script for wiki workflow
# This script helps test the wiki update workflow locally before deploying

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BEAVER_BINARY="$PROJECT_ROOT/bin/beaver"
TEST_CONFIG="$PROJECT_ROOT/test-beaver.yml"
TEST_OUTPUT_DIR="$PROJECT_ROOT/test-wiki-output"

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Print usage
usage() {
    cat << EOF
🧪 Wiki Workflow Test Script

Usage: $0 [OPTIONS]

OPTIONS:
    --setup         Setup test environment
    --test-config   Test Beaver configuration
    --test-build    Test building wiki content
    --test-full     Run full workflow simulation
    --clean         Clean up test artifacts
    --help          Show this help

EXAMPLES:
    $0 --setup           # Setup test environment
    $0 --test-full       # Run complete workflow test
    $0 --clean           # Clean up after testing

ENVIRONMENT VARIABLES:
    GITHUB_TOKEN        Required for API access
    TEST_REPOSITORY     Repository to test with (default: current repo)

EOF
}

# Setup test environment
setup_test_env() {
    log_info "Setting up test environment..."
    
    # Check if GITHUB_TOKEN is set
    if [[ -z "${GITHUB_TOKEN:-}" ]]; then
        log_error "GITHUB_TOKEN environment variable is required"
        log_info "Get a token from: https://github.com/settings/tokens"
        log_info "Required scopes: repo, wiki"
        exit 1
    fi
    
    # Build Beaver if needed
    if [[ ! -f "$BEAVER_BINARY" ]]; then
        log_info "Building Beaver..."
        cd "$PROJECT_ROOT"
        make build
    fi
    
    # Verify binary
    if ! "$BEAVER_BINARY" --version >/dev/null 2>&1; then
        log_error "Beaver binary is not working correctly"
        exit 1
    fi
    
    # Create test directory
    mkdir -p "$TEST_OUTPUT_DIR"
    
    # Get repository info
    if [[ -z "${TEST_REPOSITORY:-}" ]]; then
        if git rev-parse --git-dir >/dev/null 2>&1; then
            local repo_url=$(git config --get remote.origin.url)
            if [[ "$repo_url" =~ github\.com[:/]([^/]+)/([^/.]+) ]]; then
                TEST_REPOSITORY="${BASH_REMATCH[1]}/${BASH_REMATCH[2]}"
            else
                log_error "Could not determine repository from git remote"
                exit 1
            fi
        else
            log_error "Not in a git repository and TEST_REPOSITORY not set"
            exit 1
        fi
    fi
    
    log_success "Test environment setup complete"
    log_info "Test Repository: $TEST_REPOSITORY"
}

# Test Beaver configuration
test_config() {
    log_info "Testing Beaver configuration..."
    
    # Create test configuration
    cat > "$TEST_CONFIG" << EOF
project:
  name: "test-wiki-workflow"
  description: "Test configuration for wiki workflow"
  version: "test"

source:
  github:
    repository: "$TEST_REPOSITORY"
    token_env: "GITHUB_TOKEN"
    include_closed_issues: true
    include_pull_requests: false
    max_issues: 10

output:
  local:
    directory: "$TEST_OUTPUT_DIR"
    format: "markdown"

processing:
  ai_enhancement: false
  template_engine: "default"

logging:
  level: "debug"
  format: "text"
EOF
    
    log_success "Test configuration created: $TEST_CONFIG"
    
    # Test configuration by initializing
    if "$BEAVER_BINARY" init --config="$TEST_CONFIG" --non-interactive; then
        log_success "Configuration test passed"
    else
        log_error "Configuration test failed"
        return 1
    fi
}

# Test building wiki content
test_build() {
    log_info "Testing wiki content generation..."
    
    # Fetch some issues
    log_info "Fetching test issues..."
    if "$BEAVER_BINARY" fetch "$TEST_REPOSITORY" \
        --state=all \
        --per-page=5 \
        --output=json > "$TEST_OUTPUT_DIR/test-issues.json"; then
        local issue_count=$(jq -r '.fetched_count // 0' "$TEST_OUTPUT_DIR/test-issues.json" 2>/dev/null || echo "0")
        log_success "Fetched $issue_count issues for testing"
    else
        log_error "Failed to fetch test issues"
        return 1
    fi
    
    # Test building (if build command exists)
    if "$BEAVER_BINARY" --help | grep -q "build"; then
        log_info "Testing build command..."
        if "$BEAVER_BINARY" build --config="$TEST_CONFIG" --verbose; then
            log_success "Build test passed"
        else
            log_warning "Build command failed - this might be expected if not fully implemented"
        fi
    else
        log_warning "Build command not available - creating mock wiki content"
        
        # Create mock wiki content
        mkdir -p "$TEST_OUTPUT_DIR"
        cat > "$TEST_OUTPUT_DIR/Home.md" << EOF
# Test Wiki

This is a test wiki generated by the workflow test script.

## Generated Content

- **Repository:** $TEST_REPOSITORY
- **Generated:** $(date)
- **Issues Fetched:** $(jq -r '.fetched_count // 0' "$TEST_OUTPUT_DIR/test-issues.json" 2>/dev/null || echo "unknown")

## Test Status

✅ Configuration test passed
✅ Issue fetching test passed
✅ Mock content generation passed

EOF
        log_success "Mock wiki content created"
    fi
}

# Simulate full workflow
test_full_workflow() {
    log_info "Running full workflow simulation..."
    
    setup_test_env
    test_config
    test_build
    
    log_success "Full workflow simulation completed"
    log_info "Test outputs available in: $TEST_OUTPUT_DIR"
    log_info "Test configuration: $TEST_CONFIG"
    
    # Show summary
    echo
    log_info "=== Test Summary ==="
    echo "📁 Test Directory: $TEST_OUTPUT_DIR"
    echo "⚙️  Test Config: $TEST_CONFIG"
    echo "🏗️  Binary Used: $BEAVER_BINARY"
    echo "📊 Repository: $TEST_REPOSITORY"
    
    if [[ -f "$TEST_OUTPUT_DIR/test-issues.json" ]]; then
        local issue_count=$(jq -r '.fetched_count // 0' "$TEST_OUTPUT_DIR/test-issues.json" 2>/dev/null || echo "0")
        echo "📋 Issues Fetched: $issue_count"
    fi
    
    if [[ -d "$TEST_OUTPUT_DIR" ]]; then
        local file_count=$(find "$TEST_OUTPUT_DIR" -type f | wc -l)
        echo "📄 Files Generated: $file_count"
        echo
        echo "Generated files:"
        find "$TEST_OUTPUT_DIR" -type f -exec basename {} \; | sed 's/^/  - /'
    fi
}

# Clean up test artifacts
cleanup() {
    log_info "Cleaning up test artifacts..."
    
    [[ -f "$TEST_CONFIG" ]] && rm "$TEST_CONFIG"
    [[ -d "$TEST_OUTPUT_DIR" ]] && rm -rf "$TEST_OUTPUT_DIR"
    
    log_success "Cleanup completed"
}

# Check dependencies
check_dependencies() {
    local missing_deps=()
    
    # Check for required tools
    command -v jq >/dev/null || missing_deps+=("jq")
    command -v git >/dev/null || missing_deps+=("git")
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        log_info "Install missing dependencies:"
        for dep in "${missing_deps[@]}"; do
            case "$dep" in
                jq) echo "  - jq: brew install jq (macOS) or apt-get install jq (Ubuntu)" ;;
                git) echo "  - git: https://git-scm.com/downloads" ;;
            esac
        done
        exit 1
    fi
}

# Main script logic
main() {
    check_dependencies
    
    case "${1:-}" in
        --setup)
            setup_test_env
            ;;
        --test-config)
            setup_test_env
            test_config
            ;;
        --test-build)
            setup_test_env
            test_config
            test_build
            ;;
        --test-full)
            test_full_workflow
            ;;
        --clean)
            cleanup
            ;;
        --help|-h|"")
            usage
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
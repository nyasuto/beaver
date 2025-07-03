#!/bin/bash

# Beaver Integration Test Runner
# This script helps set up and run Go integration tests safely

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Help function
show_help() {
    cat << EOF
Beaver Integration Test Runner

Usage: $0 [OPTIONS]

OPTIONS:
    -h, --help              Show this help message
    -s, --setup             Setup environment for integration tests
    -r, --run               Run integration tests
    -c, --check             Check environment configuration
    -a, --all               Run all tests including performance tests
    -q, --quick             Run quick tests only (skip long-running tests)
    -v, --verbose           Enable verbose output
    --dry-run              Show what would be executed without running tests

EXAMPLES:
    $0 --setup              # Setup environment interactively
    $0 --check              # Check if environment is ready
    $0 --run                # Run Go integration tests
    $0 --quick              # Run quick Go tests only
    $0 --all --verbose      # Run all tests with verbose output

ENVIRONMENT VARIABLES:
    BEAVER_INTEGRATION_TESTS    Set to 'true' to enable integration tests
    GITHUB_TOKEN               Your GitHub Personal Access Token
    BEAVER_TEST_REPO_OWNER     GitHub username/organization
    BEAVER_TEST_REPO_NAME      Test repository name
    BEAVER_DEBUG               Set to 'true' for debug output

NOTE: This runner now focuses on Go integration tests.
EOF
}

# Check if environment is properly configured
check_environment() {
    print_status "Checking integration test environment..."
    
    local issues=0
    
    # Check required environment variables
    if [[ -z "${BEAVER_INTEGRATION_TESTS}" ]]; then
        print_error "BEAVER_INTEGRATION_TESTS not set. Run with --setup to configure."
        issues=$((issues + 1))
    elif [[ "${BEAVER_INTEGRATION_TESTS}" != "true" ]]; then
        print_warning "BEAVER_INTEGRATION_TESTS is set to '${BEAVER_INTEGRATION_TESTS}', should be 'true'"
    fi
    
    if [[ -z "${GITHUB_TOKEN}" ]]; then
        print_error "GITHUB_TOKEN not set. Please set your GitHub Personal Access Token."
        issues=$((issues + 1))
    else
        print_success "GITHUB_TOKEN is set"
    fi
    
    if [[ -z "${BEAVER_TEST_REPO_OWNER}" ]]; then
        print_error "BEAVER_TEST_REPO_OWNER not set. Please set your GitHub username."
        issues=$((issues + 1))
    else
        print_success "BEAVER_TEST_REPO_OWNER is set to '${BEAVER_TEST_REPO_OWNER}'"
    fi
    
    if [[ -z "${BEAVER_TEST_REPO_NAME}" ]]; then
        print_error "BEAVER_TEST_REPO_NAME not set. Please set your test repository name."
        issues=$((issues + 1))
    else
        print_success "BEAVER_TEST_REPO_NAME is set to '${BEAVER_TEST_REPO_NAME}'"
    fi
    
    # Check if Go is available
    if ! command -v go &> /dev/null; then
        print_error "Go is not installed or not in PATH"
        issues=$((issues + 1))
    else
        local go_version=$(go version | awk '{print $3}')
        print_success "Go is available: ${go_version}"
    fi
    
    # Check if git is available
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed or not in PATH"
        issues=$((issues + 1))
    else
        local git_version=$(git --version | awk '{print $3}')
        print_success "Git is available: ${git_version}"
    fi
    
    if [[ $issues -eq 0 ]]; then
        print_success "Environment is properly configured for integration tests!"
        return 0
    else
        print_error "Found $issues configuration issue(s). Please fix them before running tests."
        return 1
    fi
}

# Interactive setup
setup_environment() {
    print_status "Setting up integration test environment..."
    
    # Check if .env.integration exists
    if [[ -f ".env.integration" ]]; then
        print_warning ".env.integration already exists"
        read -p "Do you want to overwrite it? (y/N): " overwrite
        if [[ ! "$overwrite" =~ ^[Yy]$ ]]; then
            print_status "Skipping .env.integration creation"
        else
            rm .env.integration
        fi
    fi
    
    if [[ ! -f ".env.integration" ]]; then
        print_status "Creating .env.integration file..."
        
        # Get GitHub token
        if [[ -z "${GITHUB_TOKEN}" ]]; then
            echo
            print_status "GitHub Personal Access Token is required."
            print_status "Go to: https://github.com/settings/tokens"
            print_status "Create a token with 'repo' or 'public_repo' scope"
            echo
            read -s -p "Enter your GitHub token: " github_token
            echo
        else
            github_token="${GITHUB_TOKEN}"
            print_success "Using existing GITHUB_TOKEN"
        fi
        
        # Get repository info
        if [[ -z "${BEAVER_TEST_REPO_OWNER}" ]]; then
            read -p "Enter your GitHub username: " repo_owner
        else
            repo_owner="${BEAVER_TEST_REPO_OWNER}"
            print_success "Using existing BEAVER_TEST_REPO_OWNER: ${repo_owner}"
        fi
        
        if [[ -z "${BEAVER_TEST_REPO_NAME}" ]]; then
            echo
            print_status "Recommended: Create a dedicated test repository"
            print_status "Example: beaver-integration-test"
            read -p "Enter test repository name: " repo_name
        else
            repo_name="${BEAVER_TEST_REPO_NAME}"
            print_success "Using existing BEAVER_TEST_REPO_NAME: ${repo_name}"
        fi
        
        # Create .env.integration file
        cat > .env.integration << EOF
# Beaver Integration Test Configuration
# Generated on $(date)

# Enable integration tests
export BEAVER_INTEGRATION_TESTS=true

# GitHub authentication
export GITHUB_TOKEN="${github_token}"

# Test repository information
export BEAVER_TEST_REPO_OWNER="${repo_owner}"
export BEAVER_TEST_REPO_NAME="${repo_name}"

# Optional: Enable debug output
# export BEAVER_DEBUG=true
EOF
        
        print_success ".env.integration created successfully!"
        print_status "To load these settings, run: source .env.integration"
    fi
    
    # Load the environment
    if [[ -f ".env.integration" ]]; then
        source .env.integration
        print_success "Environment loaded from .env.integration"
    fi
    
    # Verify setup
    check_environment
}

# Run integration tests
run_tests() {
    local test_args=""
    
    print_status "Running Beaver Go integration tests..."
    
    # Check environment first
    if ! check_environment; then
        print_error "Environment check failed. Run with --setup to configure."
        exit 1
    fi
    
    # Add verbose flag if requested
    if [[ "$VERBOSE" == "true" ]]; then
        test_args="-v"
    fi
    
    local test_results=0
    
    # Check if Beaver binary exists
    if [[ ! -f "./bin/beaver" ]]; then
        print_status "Building Beaver binary..."
        if ! go build -o ./bin/beaver ./cmd/beaver; then
            print_error "Failed to build Beaver binary"
            exit 1
        fi
        print_success "Beaver binary built successfully"
    fi
    
    # Run Go integration tests
    if [[ "$DRY_RUN" == "true" ]]; then
        print_status "Dry run mode - would execute Go tests:"
        echo "go test -v -timeout=5m ./... -tags=integration"
    else
        print_status "Running Go integration tests..."
        echo
        
        # Run integration tests with timeout
        if [[ "$QUICK_TESTS" == "true" ]]; then
            print_status "Running quick Go tests..."
            if ! timeout 300 go test $test_args -timeout=3m ./pkg/... -short; then
                print_error "Quick Go tests failed!"
                test_results=1
            else
                print_success "Quick Go tests passed!"
            fi
        else
            print_status "Running full Go integration tests..."
            if ! timeout 600 go test $test_args -timeout=5m ./... -tags=integration; then
                print_error "Go integration tests failed!"
                test_results=1
            else
                print_success "Go integration tests passed!"
            fi
        fi
    fi
    
    # Report final results
    if [[ "$DRY_RUN" == "true" ]]; then
        print_success "Dry run completed successfully"
        return 0
    fi
    
    if [[ $test_results -eq 0 ]]; then
        echo
        print_success "Go integration tests passed!"
        if [[ -n "${BEAVER_TEST_REPO_OWNER}" && -n "${BEAVER_TEST_REPO_NAME}" ]]; then
            print_status "Check your GitHub Wiki at: https://github.com/${BEAVER_TEST_REPO_OWNER}/${BEAVER_TEST_REPO_NAME}/wiki"
        fi
    else
        echo
        print_error "Go integration tests failed!"
        print_status "Check the output above for error details"
        exit 1
    fi
}

# Parse command line arguments
SETUP=false
RUN=false
CHECK=false
ALL_TESTS=false
QUICK_TESTS=false
VERBOSE=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -s|--setup)
            SETUP=true
            shift
            ;;
        -r|--run)
            RUN=true
            shift
            ;;
        -c|--check)
            CHECK=true
            shift
            ;;
        -a|--all)
            ALL_TESTS=true
            shift
            ;;
        -q|--quick)
            QUICK_TESTS=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Main execution logic
main() {
    print_status "Beaver Integration Test Runner"
    echo
    
    # If no specific action is requested, show help
    if [[ "$SETUP" == "false" && "$RUN" == "false" && "$CHECK" == "false" ]]; then
        print_warning "No action specified. Use --help for usage information."
        echo
        show_help
        exit 1
    fi
    
    # Load .env.integration if it exists
    if [[ -f ".env.integration" ]]; then
        source .env.integration
        print_status "Loaded configuration from .env.integration"
    fi
    
    # Execute requested actions
    if [[ "$SETUP" == "true" ]]; then
        setup_environment
    fi
    
    if [[ "$CHECK" == "true" ]]; then
        check_environment
    fi
    
    if [[ "$RUN" == "true" ]]; then
        run_tests
    fi
}

# Run main function
main "$@"
#!/bin/bash

# Build tools and utilities for Beaver project
# Handles Go environment setup, building, and cross-platform compilation

set -euo pipefail

# Source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ci-common.sh
source "${SCRIPT_DIR}/ci-common.sh"

# Default configuration
DEFAULT_GO_VERSION="stable"
DEFAULT_BINARY_NAME="beaver"
DEFAULT_OUTPUT_DIR="bin"

# Show usage information
usage() {
    cat << EOF
Build Tools for Beaver

Usage: $0 <command> [options]

Commands:
    setup           Setup Go environment and dependencies
    build           Build Beaver binary for current platform
    cross-build     Build for multiple platforms
    test            Run Go tests
    clean           Clean build artifacts
    version         Show build version information

Options:
    --go-version VERSION    Go version to use (default: $DEFAULT_GO_VERSION)
    --binary-name NAME      Binary name (default: $DEFAULT_BINARY_NAME)
    --output-dir DIR        Output directory (default: $DEFAULT_OUTPUT_DIR)
    --ldflags FLAGS         Additional ldflags
    --platforms LIST        Comma-separated list of platforms for cross-build
    --verbose               Enable verbose output
    --dry-run              Show commands without executing
    --help                  Show this help

Examples:
    $0 setup
    $0 build --verbose
    $0 cross-build --platforms "linux/amd64,darwin/arm64"
    $0 test --verbose

Environment Variables:
    GO_VERSION              Go version (overrides --go-version)
    BINARY_NAME             Binary name (overrides --binary-name)
    OUTPUT_DIR              Output directory (overrides --output-dir)
    BUILD_LDFLAGS           Additional ldflags
    CGO_ENABLED             Enable/disable CGO (default: 0 for cross-build)
EOF
}

# Parse command line arguments
parse_args() {
    COMMAND=""
    GO_VERSION="${GO_VERSION:-$DEFAULT_GO_VERSION}"
    BINARY_NAME="${BINARY_NAME:-$DEFAULT_BINARY_NAME}"
    OUTPUT_DIR="${OUTPUT_DIR:-$DEFAULT_OUTPUT_DIR}"
    LDFLAGS="${BUILD_LDFLAGS:-}"
    PLATFORMS=""
    VERBOSE=false
    DRY_RUN=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            setup|build|cross-build|test|clean|version)
                COMMAND="$1"
                shift
                ;;
            --go-version)
                GO_VERSION="$2"
                shift 2
                ;;
            --binary-name)
                BINARY_NAME="$2"
                shift 2
                ;;
            --output-dir)
                OUTPUT_DIR="$2"
                shift 2
                ;;
            --ldflags)
                LDFLAGS="$2"
                shift 2
                ;;
            --platforms)
                PLATFORMS="$2"
                shift 2
                ;;
            --verbose)
                VERBOSE=true
                export DEBUG=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
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

# Check Go installation and version
check_go_installation() {
    log_section "Checking Go Installation"
    
    if ! command_exists go; then
        log_error "Go is not installed or not in PATH"
        log_info "Please install Go from https://golang.org/dl/"
        return 1
    fi
    
    local current_version
    current_version=$(go version | awk '{print $3}' | sed 's/go//')
    log_info "Current Go version: $current_version"
    
    # If specific version requested, check if it matches
    if [[ "$GO_VERSION" != "stable" ]]; then
        local requested_version
        requested_version=$(echo "$GO_VERSION" | sed 's/go//')
        if [[ "$current_version" != "$requested_version" ]]; then
            log_warn "Requested Go version ($requested_version) differs from current ($current_version)"
        fi
    fi
    
    return 0
}

# Setup Go environment and dependencies
setup_go_environment() {
    log_section "Setting up Go Environment"
    
    check_go_installation || return 1
    
    local project_root
    project_root=$(get_project_root)
    
    log_info "Project root: $project_root"
    log_info "GOPATH: ${GOPATH:-not set}"
    log_info "GOPROXY: ${GOPROXY:-default}"
    
    # Ensure we're in the project root
    cd "$project_root"
    
    # Check if go.mod exists
    if [[ ! -f "go.mod" ]]; then
        log_error "go.mod not found in project root"
        log_info "This doesn't appear to be a Go module"
        return 1
    fi
    
    log_info "Downloading dependencies..."
    execute_cmd go mod download
    
    log_info "Tidying go.mod..."
    execute_cmd go mod tidy
    
    # Verify dependencies
    if [[ "$VERBOSE" == "true" ]]; then
        log_info "Module dependencies:"
        go list -m all
    fi
    
    log_success "Go environment setup completed"
    return 0
}

# Build ldflags string
build_ldflags() {
    local ldflags_parts=()
    
    # Add version information
    local version
    if git rev-parse --git-dir >/dev/null 2>&1; then
        version=$(git describe --tags --always --dirty 2>/dev/null || git rev-parse --short HEAD)
    else
        version="unknown"
    fi
    ldflags_parts+=("-X main.Version=$version")
    
    # Add build timestamp
    local build_date
    build_date=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    ldflags_parts+=("-X main.BuildDate=$build_date")
    
    # Add commit hash
    if git rev-parse --git-dir >/dev/null 2>&1; then
        local commit_hash
        commit_hash=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
        ldflags_parts+=("-X main.GitCommit=$commit_hash")
    fi
    
    # Strip debug info and symbol table for smaller binaries
    ldflags_parts+=("-s" "-w")
    
    # Add custom ldflags if provided
    if [[ -n "$LDFLAGS" ]]; then
        ldflags_parts+=($LDFLAGS)
    fi
    
    echo "${ldflags_parts[*]}"
}

# Build binary for current platform
build_binary() {
    log_section "Building Beaver Binary"
    
    local project_root
    project_root=$(get_project_root)
    cd "$project_root"
    
    # Ensure output directory exists
    ensure_directory "$OUTPUT_DIR"
    
    local binary_path="$OUTPUT_DIR/$BINARY_NAME"
    local ldflags
    ldflags=$(build_ldflags)
    
    log_info "Building: $binary_path"
    log_info "LDFlags: $ldflags"
    
    local build_cmd=(
        go build
    )
    
    if [[ "$VERBOSE" == "true" ]]; then
        build_cmd+=(-v)
    fi
    
    build_cmd+=(
        -ldflags "$ldflags"
        -o "$binary_path"
        ./cmd/beaver
    )
    
    execute_cmd "${build_cmd[@]}"
    
    if [[ "$DRY_RUN" != "true" && -f "$binary_path" ]]; then
        local file_size
        file_size=$(get_file_size "$binary_path")
        log_success "Build completed: $binary_path ($(format_bytes "$file_size"))"
        
        # Make binary executable
        chmod +x "$binary_path"
        
        # Test binary
        log_info "Testing binary..."
        if "$binary_path" version >/dev/null 2>&1; then
            log_success "Binary test passed"
        else
            log_warn "Binary test failed - binary may not be functional"
        fi
    fi
    
    return 0
}

# Cross-platform build
cross_build() {
    log_section "Cross-Platform Build"
    
    local project_root
    project_root=$(get_project_root)
    cd "$project_root"
    
    # Default platforms if not specified
    if [[ -z "$PLATFORMS" ]]; then
        PLATFORMS="linux/amd64,linux/arm64,darwin/amd64,darwin/arm64,windows/amd64"
    fi
    
    log_info "Building for platforms: $PLATFORMS"
    
    # Ensure output directory exists
    ensure_directory "$OUTPUT_DIR"
    
    local ldflags
    ldflags=$(build_ldflags)
    
    # Split platforms and build each
    IFS=',' read -ra PLATFORM_ARRAY <<< "$PLATFORMS"
    for platform in "${PLATFORM_ARRAY[@]}"; do
        IFS='/' read -ra PLATFORM_PARTS <<< "$platform"
        local goos="${PLATFORM_PARTS[0]}"
        local goarch="${PLATFORM_PARTS[1]}"
        
        local binary_name="$BINARY_NAME"
        local suffix="${goos}-${goarch}"
        
        # Add .exe extension for Windows
        if [[ "$goos" == "windows" ]]; then
            binary_name="${BINARY_NAME}.exe"
            suffix="${suffix}.exe"
        fi
        
        local output_path="$OUTPUT_DIR/${BINARY_NAME}-${suffix}"
        
        log_info "Building for $goos/$goarch -> $output_path"
        
        local build_cmd=(
            env
            GOOS="$goos"
            GOARCH="$goarch"
            CGO_ENABLED=0
            go build
        )
        
        if [[ "$VERBOSE" == "true" ]]; then
            build_cmd+=(-v)
        fi
        
        build_cmd+=(
            -ldflags "$ldflags"
            -o "$output_path"
            ./cmd/beaver
        )
        
        if execute_cmd "${build_cmd[@]}"; then
            if [[ "$DRY_RUN" != "true" && -f "$output_path" ]]; then
                local file_size
                file_size=$(get_file_size "$output_path")
                log_success "Built $goos/$goarch: $(format_bytes "$file_size")"
                
                # Generate checksum for non-Windows platforms
                if [[ "$goos" != "windows" ]] && command_exists sha256sum; then
                    execute_cmd sha256sum "$output_path" > "$output_path.sha256"
                fi
            fi
        else
            log_error "Failed to build for $goos/$goarch"
        fi
    done
    
    log_success "Cross-platform build completed"
    return 0
}

# Run tests
run_tests() {
    log_section "Running Tests"
    
    local project_root
    project_root=$(get_project_root)
    cd "$project_root"
    
    local test_cmd=(go test)
    
    if [[ "$VERBOSE" == "true" ]]; then
        test_cmd+=(-v)
    fi
    
    # Add race detection
    test_cmd+=(-race)
    
    # Add coverage
    test_cmd+=(-coverprofile=coverage.out)
    
    # Test all packages
    test_cmd+=(./...)
    
    log_info "Test command: ${test_cmd[*]}"
    
    if execute_cmd "${test_cmd[@]}"; then
        log_success "All tests passed"
        
        # Show coverage if available
        if [[ "$DRY_RUN" != "true" && -f "coverage.out" ]]; then
            log_info "Test coverage:"
            go tool cover -func=coverage.out | tail -1
        fi
    else
        log_error "Tests failed"
        return 1
    fi
    
    return 0
}

# Clean build artifacts
clean_artifacts() {
    log_section "Cleaning Build Artifacts"
    
    local project_root
    project_root=$(get_project_root)
    cd "$project_root"
    
    # Clean Go build cache
    log_info "Cleaning Go build cache..."
    execute_cmd go clean -cache
    
    # Clean output directory
    if [[ -d "$OUTPUT_DIR" ]]; then
        log_info "Cleaning output directory: $OUTPUT_DIR"
        execute_cmd rm -rf "$OUTPUT_DIR"/*
    fi
    
    # Clean test artifacts
    log_info "Cleaning test artifacts..."
    execute_cmd rm -f coverage.out
    
    # Clean any generated files
    find . -name "*.test" -type f -delete 2>/dev/null || true
    
    log_success "Cleanup completed"
    return 0
}

# Show version information
show_version_info() {
    log_section "Build Version Information"
    
    local project_root
    project_root=$(get_project_root)
    cd "$project_root"
    
    # Go version
    if command_exists go; then
        log_info "Go version: $(go version)"
    fi
    
    # Git information
    if git rev-parse --git-dir >/dev/null 2>&1; then
        log_info "Git commit: $(git rev-parse HEAD)"
        log_info "Git branch: $(git branch --show-current 2>/dev/null || echo 'detached')"
        log_info "Git tag: $(git describe --tags --exact-match 2>/dev/null || echo 'none')"
        log_info "Git status: $(git status --porcelain | wc -l | tr -d ' ') uncommitted changes"
    fi
    
    # Build timestamp
    log_info "Build timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    
    return 0
}

# Main execution
main() {
    parse_args "$@"
    
    # Change to project root
    cd "$(get_project_root)"
    
    case "$COMMAND" in
        setup)
            setup_go_environment
            ;;
        build)
            setup_go_environment && build_binary
            ;;
        cross-build)
            setup_go_environment && cross_build
            ;;
        test)
            setup_go_environment && run_tests
            ;;
        clean)
            clean_artifacts
            ;;
        version)
            show_version_info
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
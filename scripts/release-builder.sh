#!/bin/bash

# Release builder script for Beaver project
# Extracted from release.yml workflow inline scripts

set -euo pipefail

# Source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ci-common.sh
source "${SCRIPT_DIR}/ci-common.sh"

# Default release configuration
DEFAULT_PLATFORMS="linux/amd64,linux/arm64,darwin/amd64,darwin/arm64,windows/amd64"
DEFAULT_OUTPUT_DIR="release-files"
DEFAULT_BINARY_NAME="beaver"

# Show usage information
usage() {
    cat << EOF
Release Builder for Beaver

Usage: $0 <command> [options]

Commands:
    cross-build     Build binaries for multiple platforms
    generate-notes  Generate release notes
    create-release  Create GitHub release
    package         Package release artifacts
    all             Run complete release process

Options:
    --version VERSION       Release version (default: auto-detect from git)
    --platforms LIST        Comma-separated platforms (default: $DEFAULT_PLATFORMS)
    --output-dir DIR        Output directory (default: $DEFAULT_OUTPUT_DIR)
    --binary-name NAME      Binary name (default: $DEFAULT_BINARY_NAME)
    --release-notes FILE    Release notes file (default: auto-generate)
    --draft                 Create draft release
    --prerelease           Mark as prerelease
    --repository REPO       Repository in owner/repo format
    --dry-run              Show commands without executing
    --verbose              Enable verbose output
    --help                 Show this help

Examples:
    $0 cross-build --platforms "linux/amd64,darwin/arm64"
    $0 generate-notes --version v1.0.0
    $0 create-release --version v1.0.0 --draft
    $0 all --version v1.0.0

Environment Variables:
    GITHUB_TOKEN           GitHub token for release creation
    RELEASE_VERSION        Release version
    GITHUB_REPOSITORY      Repository in owner/repo format
EOF
}

# Parse command line arguments
parse_args() {
    COMMAND=""
    VERSION="${RELEASE_VERSION:-}"
    PLATFORMS="$DEFAULT_PLATFORMS"
    OUTPUT_DIR="$DEFAULT_OUTPUT_DIR"
    BINARY_NAME="$DEFAULT_BINARY_NAME"
    RELEASE_NOTES_FILE=""
    DRAFT=false
    PRERELEASE=false
    REPOSITORY="${GITHUB_REPOSITORY:-}"
    DRY_RUN=false
    VERBOSE=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            cross-build|generate-notes|create-release|package|all)
                COMMAND="$1"
                shift
                ;;
            --version)
                VERSION="$2"
                shift 2
                ;;
            --platforms)
                PLATFORMS="$2"
                shift 2
                ;;
            --output-dir)
                OUTPUT_DIR="$2"
                shift 2
                ;;
            --binary-name)
                BINARY_NAME="$2"
                shift 2
                ;;
            --release-notes)
                RELEASE_NOTES_FILE="$2"
                shift 2
                ;;
            --draft)
                DRAFT=true
                shift
                ;;
            --prerelease)
                PRERELEASE=true
                shift
                ;;
            --repository)
                REPOSITORY="$2"
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

# Auto-detect version from git
detect_version() {
    if [[ -n "$VERSION" ]]; then
        log_info "Using specified version: $VERSION"
        return 0
    fi
    
    if git rev-parse --git-dir >/dev/null 2>&1; then
        # Try to get version from git tag
        local git_version
        git_version=$(git describe --tags --exact-match 2>/dev/null || echo "")
        
        if [[ -n "$git_version" ]]; then
            VERSION="$git_version"
            log_info "Auto-detected version from git tag: $VERSION"
        else
            # Use commit hash if no tag
            local commit_hash
            commit_hash=$(git rev-parse --short HEAD)
            VERSION="v0.0.0-dev-$commit_hash"
            log_warn "No git tag found, using dev version: $VERSION"
        fi
    else
        log_error "Not a git repository and no version specified"
        return 1
    fi
    
    return 0
}

# Cross-platform build
cross_platform_build() {
    log_section "Cross-Platform Build"
    
    local project_root
    project_root=$(get_project_root)
    cd "$project_root"
    
    # Detect version
    detect_version || return 1
    
    # Ensure output directory exists
    ensure_directory "$OUTPUT_DIR"
    
    log_info "Building for platforms: $PLATFORMS"
    log_info "Output directory: $OUTPUT_DIR"
    log_info "Version: $VERSION"
    
    # Use build-tools.sh if available
    if [[ -f "${SCRIPT_DIR}/build-tools.sh" ]]; then
        log_info "Using build-tools.sh for cross-platform build..."
        
        local build_args=(
            cross-build
            --platforms "$PLATFORMS"
            --output-dir "$OUTPUT_DIR"
            --binary-name "$BINARY_NAME"
            --ldflags "-X main.Version=$VERSION"
        )
        
        if [[ "$VERBOSE" == "true" ]]; then
            build_args+=(--verbose)
        fi
        
        if [[ "$DRY_RUN" == "true" ]]; then
            build_args+=(--dry-run)
        fi
        
        if "${SCRIPT_DIR}/build-tools.sh" "${build_args[@]}"; then
            log_success "Cross-platform build completed using build-tools.sh"
        else
            log_error "Cross-platform build failed"
            return 1
        fi
    else
        # Fallback to manual cross-compilation
        log_info "build-tools.sh not found, using manual cross-compilation..."
        
        # Setup dependencies
        log_info "Downloading and tidying dependencies..."
        execute_cmd go mod download
        execute_cmd go mod tidy
        
        # Build for each platform
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
            
            local build_env=(
                GOOS="$goos"
                GOARCH="$goarch"
                CGO_ENABLED=0
            )
            
            local build_cmd=(
                env "${build_env[@]}"
                go build
                -ldflags "-X main.Version=$VERSION -s -w"
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
                        log_debug "Generated checksum for $output_path"
                    fi
                fi
            else
                log_error "Failed to build for $goos/$goarch"
                return 1
            fi
        done
    fi
    
    log_success "Cross-platform build completed"
    return 0
}

# Generate release notes
generate_release_notes() {
    log_section "Generating Release Notes"
    
    local project_root
    project_root=$(get_project_root)
    cd "$project_root"
    
    # Detect version
    detect_version || return 1
    
    # Determine release notes file
    local notes_file="${RELEASE_NOTES_FILE:-release-notes.md}"
    
    log_info "Generating release notes for version: $VERSION"
    log_info "Output file: $notes_file"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would generate release notes in $notes_file"
        return 0
    fi
    
    # Get previous tag for changelog
    local previous_tag=""
    if git rev-parse --git-dir >/dev/null 2>&1; then
        previous_tag=$(git describe --tags --abbrev=0 HEAD~1 2>/dev/null || echo "")
    fi
    
    # Generate changelog
    local changelog=""
    if [[ -n "$previous_tag" ]]; then
        log_info "Generating changelog from $previous_tag to $VERSION"
        changelog=$(git log --pretty=format:"- %s" "$previous_tag..HEAD" 2>/dev/null || echo "- 初回リリース")
    else
        log_info "No previous tag found, generating initial release changelog"
        changelog=$(git log --pretty=format:"- %s" 2>/dev/null || echo "- 初回リリース")
    fi
    
    # Create release notes
    cat > "$notes_file" << EOF
## 🦫 Beaver $VERSION リリース

### 📋 変更内容
$changelog

### 📦 ダウンロード
- **Linux (x64)**: \`${BINARY_NAME}-linux-amd64\`
- **Linux (ARM64)**: \`${BINARY_NAME}-linux-arm64\`
- **macOS (x64)**: \`${BINARY_NAME}-darwin-amd64\`
- **macOS (ARM64)**: \`${BINARY_NAME}-darwin-arm64\`
- **Windows (x64)**: \`${BINARY_NAME}-windows-amd64.exe\`

### 🚀 インストール方法

#### Linux/macOS
\`\`\`bash
# ダウンロード（例：Linux x64）
curl -L -o ${BINARY_NAME} https://github.com/${REPOSITORY}/releases/download/$VERSION/${BINARY_NAME}-linux-amd64
chmod +x ${BINARY_NAME}
sudo mv ${BINARY_NAME} /usr/local/bin/
\`\`\`

#### Windows
1. \`${BINARY_NAME}-windows-amd64.exe\` をダウンロード
2. \`${BINARY_NAME}.exe\` にリネーム
3. PATHの通ったディレクトリに配置

### ✅ 動作確認
\`\`\`bash
${BINARY_NAME} --help
${BINARY_NAME} status
\`\`\`

---
🤖 Generated with [Claude Code](https://claude.ai/code)
EOF
    
    log_success "Release notes generated: $notes_file"
    
    if [[ "$VERBOSE" == "true" ]]; then
        log_info "Release notes content:"
        cat "$notes_file"
    fi
    
    return 0
}

# Package release artifacts
package_release_artifacts() {
    log_section "Packaging Release Artifacts"
    
    local project_root
    project_root=$(get_project_root)
    cd "$project_root"
    
    # Check if artifacts directory exists
    if [[ ! -d "$OUTPUT_DIR" ]]; then
        log_error "Output directory not found: $OUTPUT_DIR"
        log_info "Run cross-build first"
        return 1
    fi
    
    # List artifacts
    log_info "Release artifacts in $OUTPUT_DIR:"
    if [[ "$DRY_RUN" != "true" ]]; then
        find "$OUTPUT_DIR" -type f | while read -r file; do
            local file_size
            file_size=$(get_file_size "$file")
            log_info "  $(basename "$file"): $(format_bytes "$file_size")"
        done
    fi
    
    # Create checksums file
    local checksums_file="$OUTPUT_DIR/checksums.txt"
    if [[ "$DRY_RUN" != "true" ]]; then
        log_info "Creating checksums file: $checksums_file"
        
        cd "$OUTPUT_DIR"
        find . -name "${BINARY_NAME}-*" -type f ! -name "*.sha256" | while read -r file; do
            if command_exists sha256sum; then
                sha256sum "$file" >> checksums.txt
            fi
        done
        cd "$project_root"
        
        if [[ -f "$checksums_file" ]]; then
            log_success "Checksums file created"
        fi
    fi
    
    log_success "Release artifacts packaged"
    return 0
}

# Create GitHub release
create_github_release() {
    log_section "Creating GitHub Release"
    
    local project_root
    project_root=$(get_project_root)
    cd "$project_root"
    
    # Check prerequisites
    if [[ -z "${GITHUB_TOKEN:-}" ]]; then
        log_error "GITHUB_TOKEN not set"
        return 1
    fi
    
    if [[ -z "$REPOSITORY" ]]; then
        log_error "Repository not specified"
        return 1
    fi
    
    validate_repository_format "$REPOSITORY" || return 1
    
    # Detect version
    detect_version || return 1
    
    # Check if gh CLI is available
    if ! command_exists gh; then
        log_error "GitHub CLI (gh) not found"
        log_info "Install from: https://cli.github.com/"
        return 1
    fi
    
    # Generate release notes if not provided
    local notes_file="${RELEASE_NOTES_FILE:-release-notes.md}"
    if [[ ! -f "$notes_file" ]]; then
        log_info "Release notes file not found, generating..."
        generate_release_notes || return 1
    fi
    
    # Prepare gh release create command
    local gh_args=(
        release create
        "$VERSION"
        --title "Beaver $VERSION"
        --notes-file "$notes_file"
    )
    
    if [[ "$DRAFT" == "true" ]]; then
        gh_args+=(--draft)
        log_info "Creating draft release"
    fi
    
    if [[ "$PRERELEASE" == "true" ]]; then
        gh_args+=(--prerelease)
        log_info "Creating prerelease"
    fi
    
    # Add release artifacts if they exist
    if [[ -d "$OUTPUT_DIR" ]]; then
        local artifacts
        artifacts=$(find "$OUTPUT_DIR" -type f -name "${BINARY_NAME}-*" -o -name "checksums.txt")
        if [[ -n "$artifacts" ]]; then
            gh_args+=($artifacts)
            log_info "Adding $(echo "$artifacts" | wc -w) artifacts to release"
        fi
    fi
    
    # Create the release
    log_info "Creating GitHub release: $VERSION"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: gh ${gh_args[*]}"
    else
        if gh "${gh_args[@]}"; then
            log_success "GitHub release created successfully"
            log_info "Release URL: https://github.com/$REPOSITORY/releases/tag/$VERSION"
        else
            log_error "Failed to create GitHub release"
            return 1
        fi
    fi
    
    return 0
}

# Run complete release process
run_complete_release() {
    log_section "Running Complete Release Process"
    
    local failed_steps=()
    
    # Step 1: Cross-platform build
    if ! cross_platform_build; then
        failed_steps+=("cross-build")
        log_error "Cross-platform build failed"
        return 1
    fi
    
    # Step 2: Package artifacts
    if ! package_release_artifacts; then
        failed_steps+=("package")
        log_error "Packaging failed"
        return 1
    fi
    
    # Step 3: Generate release notes
    if ! generate_release_notes; then
        failed_steps+=("generate-notes")
        log_error "Release notes generation failed"
        return 1
    fi
    
    # Step 4: Create GitHub release
    if ! create_github_release; then
        failed_steps+=("create-release")
        log_error "GitHub release creation failed"
        return 1
    fi
    
    log_success "Complete release process finished successfully!"
    log_info "Release $VERSION is now available"
    
    return 0
}

# Main execution
main() {
    parse_args "$@"
    
    # Change to project root
    cd "$(get_project_root)"
    
    case "$COMMAND" in
        cross-build)
            cross_platform_build
            ;;
        generate-notes)
            generate_release_notes
            ;;
        create-release)
            create_github_release
            ;;
        package)
            package_release_artifacts
            ;;
        all)
            run_complete_release
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
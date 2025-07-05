#!/bin/bash

# Phase 1: Integrated Build System
# Combines Go backend data generation with Astro frontend build
# This script implements the dual build system as specified in Issue #430 Phase 1

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ASTRO_DIR="$PROJECT_ROOT/frontend/astro"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Help function
show_help() {
    cat << EOF
Phase 1 Integrated Build System - Beaver

Usage: $0 [options]

Options:
    --go-only           Build only Go backend (traditional HTML)
    --astro-only        Build only Astro frontend (requires existing data)
    --compare           Build both and compare output sizes
    --clean             Clean all build artifacts before building
    --help              Show this help message

Examples:
    $0                  # Full integrated build (default)
    $0 --go-only        # Traditional Go HTML build only
    $0 --astro-only     # Astro frontend build only
    $0 --compare        # Build both and show comparison
    $0 --clean          # Clean build
EOF
}

# Clean function
clean_build() {
    log_info "🧹 Cleaning build artifacts..."
    
    # Remove Go build outputs
    rm -rf "$PROJECT_ROOT/_site"
    rm -rf "$PROJECT_ROOT/_site-go"
    rm -rf "$PROJECT_ROOT"/*.md
    
    # Remove Astro build outputs
    rm -rf "$ASTRO_DIR/dist"
    rm -rf "$ASTRO_DIR/.astro"
    
    # Remove data files
    rm -rf "$ASTRO_DIR/src/data/beaver.json"
    
    log_success "✅ Clean completed"
}

# Check dependencies
check_dependencies() {
    log_info "🔍 Checking dependencies..."
    
    # Check Go
    if ! command -v go &> /dev/null; then
        log_error "Go is not installed"
        exit 1
    fi
    
    # Check Node.js (for Astro)
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check if Beaver binary exists
    if [ ! -f "$PROJECT_ROOT/bin/beaver" ]; then
        log_warning "Beaver binary not found, building..."
        cd "$PROJECT_ROOT"
        make build
    fi
    
    log_success "✅ Dependencies check passed"
}

# Build Go backend with traditional HTML output
build_go_traditional() {
    log_info "🐹 Building Go traditional HTML..."
    
    cd "$PROJECT_ROOT"
    
    # Run Go build without Astro export
    if ! ./bin/beaver build; then
        log_error "Go traditional build failed"
        return 1
    fi
    
    # Move output to separate directory for comparison
    if [ -d "_site" ]; then
        cp -r "_site" "_site-go"
        log_success "✅ Go traditional build completed -> _site-go/"
    else
        log_warning "No _site directory found from Go build"
    fi
}

# Generate data for Astro
generate_astro_data() {
    log_info "📊 Generating Astro data with Go backend..."
    
    cd "$PROJECT_ROOT"
    
    # Run Go build with Astro export
    if ! ./bin/beaver build --astro-export; then
        log_error "Go data generation for Astro failed"
        return 1
    fi
    
    # Check if data was generated
    if [ -f "$ASTRO_DIR/src/data/beaver.json" ]; then
        local data_size
        data_size=$(du -h "$ASTRO_DIR/src/data/beaver.json" | cut -f1)
        log_success "✅ Astro data generated -> $data_size"
    else
        log_error "Astro data file not found"
        return 1
    fi
}

# Build Astro frontend
build_astro_frontend() {
    log_info "🎨 Building Astro frontend..."
    
    cd "$ASTRO_DIR"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log_info "📦 Installing npm dependencies..."
        npm ci
    fi
    
    # Build Astro
    if ! npm run build; then
        log_error "Astro build failed"
        return 1
    fi
    
    # Check if output was created
    if [ -d "dist" ]; then
        log_success "✅ Astro build completed -> dist/"
    else
        log_error "Astro build output not found"
        return 1
    fi
}

# Compare build outputs
compare_outputs() {
    log_info "📊 Comparing build outputs..."
    
    echo ""
    echo "=== Build Output Comparison ==="
    echo ""
    
    # Go traditional output
    if [ -d "$PROJECT_ROOT/_site-go" ]; then
        local go_size
        local go_files
        go_size=$(du -sh "$PROJECT_ROOT/_site-go" | cut -f1)
        go_files=$(find "$PROJECT_ROOT/_site-go" -type f | wc -l)
        echo "🐹 Go Traditional Build:"
        echo "   Size: $go_size"
        echo "   Files: $go_files"
    else
        echo "🐹 Go Traditional Build: Not available"
    fi
    
    echo ""
    
    # Astro output
    if [ -d "$ASTRO_DIR/dist" ]; then
        local astro_size
        local astro_files
        astro_size=$(du -sh "$ASTRO_DIR/dist" | cut -f1)
        astro_files=$(find "$ASTRO_DIR/dist" -type f | wc -l)
        echo "🎨 Astro Frontend Build:"
        echo "   Size: $astro_size"
        echo "   Files: $astro_files"
    else
        echo "🎨 Astro Frontend Build: Not available"
    fi
    
    echo ""
    
    # Data file comparison
    if [ -f "$ASTRO_DIR/src/data/beaver.json" ]; then
        local data_size
        data_size=$(du -sh "$ASTRO_DIR/src/data/beaver.json" | cut -f1)
        echo "📄 Generated Data:"
        echo "   beaver.json: $data_size"
    fi
    
    echo ""
    echo "=== Performance Notes ==="
    echo "🐹 Go Build: Fast compilation, server-side rendering"
    echo "🎨 Astro Build: Static optimization, client-side hydration"
    echo "📊 Data Pipeline: Go → JSON → Astro components"
    echo ""
}

# Full integrated build
build_integrated() {
    log_info "🚀 Starting Phase 1 integrated build..."
    
    # Step 1: Generate data with Go backend
    if ! generate_astro_data; then
        log_error "Data generation failed"
        exit 1
    fi
    
    # Step 2: Build Astro frontend
    if ! build_astro_frontend; then
        log_error "Astro build failed"
        exit 1
    fi
    
    # Step 3: Ensure primary _site points to Astro output
    if [ -d "$ASTRO_DIR/dist" ]; then
        rm -rf "$PROJECT_ROOT/_site"
        cp -r "$ASTRO_DIR/dist" "$PROJECT_ROOT/_site"
        log_success "✅ Primary _site now uses Astro output"
    fi
    
    log_success "🎉 Phase 1 integrated build completed!"
    echo ""
    echo "📁 Output: $PROJECT_ROOT/_site/ (Astro-based)"
    echo "🌐 Ready for GitHub Pages deployment"
}

# Main execution
main() {
    local go_only=false
    local astro_only=false
    local compare=false
    local clean=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --go-only)
                go_only=true
                shift
                ;;
            --astro-only)
                astro_only=true
                shift
                ;;
            --compare)
                compare=true
                shift
                ;;
            --clean)
                clean=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Execute based on options
    if [ "$clean" = true ]; then
        clean_build
        exit 0
    fi
    
    check_dependencies
    
    if [ "$go_only" = true ]; then
        build_go_traditional
    elif [ "$astro_only" = true ]; then
        if [ ! -f "$ASTRO_DIR/src/data/beaver.json" ]; then
            log_warning "No data found, generating first..."
            generate_astro_data
        fi
        build_astro_frontend
    elif [ "$compare" = true ]; then
        build_go_traditional
        generate_astro_data
        build_astro_frontend
        compare_outputs
    else
        # Default: integrated build
        build_integrated
    fi
}

# Execute main function
main "$@"
# Beaver - AIエージェント知識ダム構築ツール
# Makefile for development and build automation

.PHONY: help build clean test lint fmt deps install run dev quality test-integration

# Variables
BINARY_NAME=beaver
MAIN_PATH=./cmd/beaver
BUILD_DIR=./bin
VERSION?=$(shell git describe --tags --always --dirty)
BUILD_TIME=$(shell date -u '+%Y-%m-%d %H:%M:%S UTC')
GIT_COMMIT=$(shell git rev-parse --short HEAD)
LDFLAGS=-ldflags "-X main.version=$(VERSION) -X 'main.buildTime=$(BUILD_TIME)' -X main.gitCommit=$(GIT_COMMIT)"

# Default target
.DEFAULT_GOAL := help

## help: Show this help message
help:
	@echo "🦫 Beaver - 利用可能なコマンド:"
	@echo ""
	@sed -n 's/^##//p' $(MAKEFILE_LIST) | column -t -s ':' | sed -e 's/^/ /'
	@echo ""

## deps: Download and install dependencies
deps:
	@echo "📦 依存関係をインストール中..."
	go mod download
	go mod tidy

## build: Build the binary
build: deps
	@echo "🔨 Beaverをビルド中..."
	mkdir -p $(BUILD_DIR)
	go build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME) $(MAIN_PATH)
	@echo "✅ ビルド完了: $(BUILD_DIR)/$(BINARY_NAME)"

## install: Install the binary to GOPATH/bin
install: deps
	@echo "📦 Beaverをインストール中..."
	go install $(LDFLAGS) $(MAIN_PATH)
	@echo "✅ インストール完了"

## clean: Clean build artifacts
clean:
	@echo "🧹 ビルドファイルをクリーンアップ中..."
	rm -rf $(BUILD_DIR)
	go clean

## test: Run tests
test:
	@echo "🧪 テストを実行中..."
	go test -v ./...

## test-cov: Run tests with coverage
test-cov:
	@echo "🧪 カバレッジ付きテストを実行中..."
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html
	@echo "📊 カバレッジレポート: coverage.html"

## test-integration: Run integration tests
test-integration:
	@echo "🔗 統合テストを実行中..."
	@if [ -f "./scripts/run-integration-tests.sh" ]; then \
		./scripts/run-integration-tests.sh --check && ./scripts/run-integration-tests.sh --run; \
	else \
		echo "⚠️ 統合テストスクリプトが見つかりません"; \
		echo "手動実行: go test -v ./tests/integration/..."; \
	fi

## test-integration-setup: Setup integration test environment
test-integration-setup:
	@echo "⚙️ 統合テスト環境をセットアップ中..."
	@if [ -f "./scripts/run-integration-tests.sh" ]; then \
		./scripts/run-integration-tests.sh --setup; \
	else \
		echo "⚠️ 統合テストスクリプトが見つかりません"; \
	fi

## test-integration-quick: Run quick integration tests
test-integration-quick:
	@echo "⚡ クイック統合テストを実行中..."
	@if [ -f "./scripts/run-integration-tests.sh" ]; then \
		./scripts/run-integration-tests.sh --quick --run; \
	else \
		echo "⚠️ 統合テストスクリプトが見つかりません"; \
	fi

## lint: Run golangci-lint with integrated security checks
lint:
	@echo "🔍 リント・セキュリティチェックを実行中..."
	@if command -v golangci-lint >/dev/null 2>&1; then \
		golangci-lint run --timeout 5m; \
	else \
		echo "⚠️ golangci-lint がインストールされていません"; \
		echo "インストール: go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest"; \
	fi

## fmt: Format code
fmt:
	@echo "📝 コードをフォーマット中..."
	go fmt ./...


## quality: Run all quality checks (lint includes security + format + test)
quality: fmt lint test
	@echo "✅ 品質チェック完了"

## quality-fix: Auto-fix issues where possible
quality-fix: fmt
	@echo "🔧 自動修正を実行中..."
	@if command -v golangci-lint >/dev/null 2>&1; then \
		golangci-lint run --fix --timeout 5m; \
	fi
	@echo "✅ 自動修正完了"

## run: Run the application
run: build
	@echo "🚀 Beaverを実行中..."
	$(BUILD_DIR)/$(BINARY_NAME)

## dev: Quick development cycle (build + run)
dev: build run

## env-info: Show environment information
env-info:
	@echo "🔍 環境情報:"
	@echo "Go version: $$(go version)"
	@echo "Git version: $$(git --version)"
	@echo "Current commit: $$(git rev-parse --short HEAD 2>/dev/null || echo 'N/A')"
	@echo "Build version: $(VERSION)"

## init-project: Initialize project with default config
init-project:
	@echo "🏗️ プロジェクトを初期化中..."
	@if [ ! -f beaver.yml ]; then \
		$(BUILD_DIR)/$(BINARY_NAME) init; \
	else \
		echo "⚠️ beaver.yml は既に存在します"; \
	fi

# Development helpers
.PHONY: watch
## watch: Watch for changes and rebuild (requires fswatch)
watch:
	@if command -v fswatch >/dev/null 2>&1; then \
		echo "👀 ファイル変更を監視中... (Ctrl+Cで終了)"; \
		fswatch -o . | xargs -n1 -I{} make build; \
	else \
		echo "⚠️ fswatch がインストールされていません"; \
		echo "macOS: brew install fswatch"; \
		echo "Ubuntu: apt-get install fswatch"; \
	fi

# Git hooks
.PHONY: git-hooks
## git-hooks: Setup git pre-commit hooks from .git-hooks folder
git-hooks:
	@echo "🔗 Git pre-commit hookを設定中..."
	@mkdir -p .git/hooks
	@if [ -f .git-hooks/pre-commit ]; then \
		cp .git-hooks/pre-commit .git/hooks/pre-commit; \
		chmod +x .git/hooks/pre-commit; \
		echo "✅ Pre-commit hook設定完了 (.git-hooks/pre-commit から)"; \
	else \
		echo '#!/bin/sh\nmake quality' > .git/hooks/pre-commit; \
		chmod +x .git/hooks/pre-commit; \
		echo "✅ Pre-commit hook設定完了 (フォールバック)"; \
	fi

# Release helpers
.PHONY: release-dry-run release-patch release-minor release-major
## release-dry-run: Show what would be released
release-dry-run:
	@echo "🔍 リリース予定:"
	@echo "Current version: $$(git describe --tags --always)"
	@echo "Files to be included:"
	@git ls-files

## release-patch: Create a patch release
release-patch:
	@echo "🏷️ パッチバージョンリリースを作成中..."
	@./scripts/release.sh patch

## release-minor: Create a minor release  
release-minor:
	@echo "🏷️ マイナーバージョンリリースを作成中..."
	@./scripts/release.sh minor

## release-major: Create a major release
release-major:
	@echo "🏷️ メジャーバージョンリリースを作成中..."
	@./scripts/release.sh major
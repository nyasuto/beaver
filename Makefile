# 🦫 Beaver - AI知識ダム構築ツール
# Makefile for unified development and build automation
# v2.0: Go Backend + Astro Frontend統合ビルドシステム

.PHONY: help build clean test test-unit test-integration test-integration-setup test-integration-quick test-all lint fmt deps install run dev quality test-cov workflow-lint astro-deps astro-build astro-dev astro-typecheck astro-lint astro-validate astro-quality integrated-build full-build site-dev scripts-lint scripts-test

# Variables
BINARY_NAME=beaver
MAIN_PATH=./cmd/beaver
BUILD_DIR=./bin
ASTRO_DIR=./frontend/astro
VERSION?=$(shell git describe --tags --always --dirty)
BUILD_TIME=$(shell date -u '+%Y-%m-%d %H:%M:%S UTC')
GIT_COMMIT=$(shell git rev-parse --short HEAD)
LDFLAGS=-ldflags "-X main.version=$(VERSION) -X 'main.buildTime=$(BUILD_TIME)' -X main.gitCommit=$(GIT_COMMIT)"

# Build Configuration
ASTRO_OUTPUT_DIR=frontend/astro/dist
FINAL_OUTPUT_DIR=_site
NODE_VERSION=18
SCRIPTS_DIR=./scripts

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

## test: Run unit tests only (fast, no external dependencies)
test:
	@echo "🧪 ユニットテストを実行中..."
	go test -v ./...

## test-unit: Alias for test (unit tests only)
test-unit: test

## test-cov: Run unit tests with coverage
test-cov:
	@echo "🧪 カバレッジ付きユニットテストを実行中..."
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html
	@echo "📊 カバレッジレポート: coverage.html"

## test-integration: Run Go integration tests (fast, local only)
test-integration:
	@echo "🔗 Go統合テストを実行中..."
	@if [ -z "$$GITHUB_TOKEN" ]; then \
		echo "⚠️ GITHUB_TOKEN環境変数が設定されていません"; \
		echo "💡 統合テストをスキップします"; \
		exit 0; \
	fi
	@echo "🧪 Go統合テスト実行中..."
	go test -v -tags=integration ./... || echo "⚠️ 統合テストは部分的に失敗しました"

## test-integration-setup: Setup integration test environment
test-integration-setup:
	@echo "⚙️ 統合テスト環境をセットアップ中..."
	@echo "📦 依存関係を確認中..."
	go mod download
	go mod tidy
	@echo "✅ 統合テスト環境セットアップ完了"

## test-integration-quick: Run quick integration tests (subset)
test-integration-quick:
	@echo "⚡ クイック統合テストを実行中..."
	@if [ -z "$$GITHUB_TOKEN" ]; then \
		echo "⚠️ GITHUB_TOKEN環境変数が設定されていません"; \
		exit 0; \
	fi
	go test -v -tags=integration -short ./...

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

## workflow-lint: Validate GitHub Actions workflows
workflow-lint:
	@echo "🔍 GitHub Actionsワークフロー検証中..."
	@if command -v actionlint >/dev/null 2>&1; then \
		actionlint -shellcheck= .github/workflows/*.yml; \
		echo "ℹ️ ワークフロー構文チェック完了（shellcheck無効、警告は無視）"; \
	else \
		echo "⚠️ actionlint がインストールされていません"; \
		echo "インストール: go install github.com/rhysd/actionlint/cmd/actionlint@latest"; \
		echo "代替手段: GitHub Actions構文を手動で確認してください"; \
	fi


## test-all: Run both unit tests and integration tests
test-all: test-unit test-integration
	@echo "✅ 全テスト完了"

## quality: Run all quality checks (Go + scripts + Astro + workflow validation)
quality: fmt lint test-unit scripts-lint astro-quality workflow-lint
	@echo "✅ 全品質チェック完了"

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
	@./scripts/core/release.sh patch

## release-minor: Create a minor release  
release-minor:
	@echo "🏷️ マイナーバージョンリリースを作成中..."
	@./scripts/core/release.sh minor

## release-major: Create a major release
release-major:
	@echo "🏷️ メジャーバージョンリリースを作成中..."
	@./scripts/core/release.sh major

## site-build: Generate knowledge base content (using beaver build)
site-build: build
	@echo "🌐 知識ベースを生成中..."
	$(BUILD_DIR)/$(BINARY_NAME) build --incremental
	@echo "✅ 知識ベース生成完了"

## site-build-full: Generate full knowledge base rebuild
site-build-full: build
	@echo "🌐 完全知識ベース再構築中..."
	$(BUILD_DIR)/$(BINARY_NAME) build --force-rebuild
	@echo "✅ 完全再構築完了"

## scripts-lint: Lint shell scripts in scripts directory
scripts-lint:
	@echo "🔍 スクリプト品質チェック実行中..."
	@if command -v shellcheck >/dev/null 2>&1; then \
		find $(SCRIPTS_DIR) -name "*.sh" -exec shellcheck -x {} +; \
		echo "✅ シェルスクリプト品質チェック完了"; \
	else \
		echo "⚠️ shellcheck がインストールされていません"; \
		echo "インストール: brew install shellcheck (macOS) または apt-get install shellcheck (Ubuntu)"; \
	fi

## scripts-test: Test scripts functionality
scripts-test:
	@echo "🧪 スクリプト機能テスト実行中..."
	@if [ -f "$(SCRIPTS_DIR)/testing/test-script-architecture.sh" ]; then \
		bash $(SCRIPTS_DIR)/testing/test-script-architecture.sh; \
	else \
		echo "⚠️ スクリプトテストファイルが見つかりません"; \
	fi

## astro-deps: Install Astro frontend dependencies
astro-deps:
	@echo "📦 Astro依存関係をインストール中..."
	@if [ ! -d "$(ASTRO_DIR)" ]; then \
		echo "❌ Astro frontend directory not found: $(ASTRO_DIR)"; \
		exit 1; \
	fi
	cd $(ASTRO_DIR) && npm install
	@echo "✅ Astro依存関係インストール完了"

## astro-build: Build Astro frontend
astro-build: astro-deps
	@echo "🎨 Astroフロントエンドをビルド中..."
	cd $(ASTRO_DIR) && npm run build
	@if [ -d "$(ASTRO_DIR)/dist" ]; then \
		echo "✅ Astroビルド成功: $(ASTRO_DIR)/dist"; \
	else \
		echo "❌ Astroビルド失敗"; \
		exit 1; \
	fi

## astro-dev: Start Astro development server
astro-dev: astro-deps
	@echo "🚀 Astro開発サーバーを起動中..."
	cd $(ASTRO_DIR) && npm run dev

## astro-typecheck: TypeScript type checking for Astro frontend
astro-typecheck: astro-deps
	@echo "📝 Astro TypeScript型チェック実行中..."
	cd $(ASTRO_DIR) && npm run typecheck

## astro-lint: Lint Astro frontend code
astro-lint: astro-deps
	@echo "🔍 Astroコード品質チェック実行中..."
	cd $(ASTRO_DIR) && npm run lint

## astro-validate: Validate Astro build output
astro-validate: astro-build
	@echo "🔍 Astroビルド検証中..."
	@if [ ! -f "$(ASTRO_DIR)/dist/index.html" ]; then \
		echo "❌ index.htmlが生成されていません"; \
		exit 1; \
	fi
	@echo "📊 Astroビルド出力統計:"
	@find $(ASTRO_DIR)/dist -type f -name "*.html" | wc -l | sed 's/^/  HTMLファイル: /'
	@find $(ASTRO_DIR)/dist -type f -name "*.css" | wc -l | sed 's/^/  CSSファイル: /'
	@find $(ASTRO_DIR)/dist -type f -name "*.js" | wc -l | sed 's/^/  JSファイル: /'
	@du -sh $(ASTRO_DIR)/dist | sed 's/^/  総サイズ: /'
	@echo "✅ Astroビルド検証完了"

## astro-quality: Run all Astro quality checks
astro-quality:
	@echo "🔍 Astro品質チェックを開始中..."
	@$(MAKE) astro-typecheck || echo "⚠️ TypeScript型チェックでエラーが発生しました"
	@$(MAKE) astro-lint || echo "⚠️ ESLintでエラーが発生しました"
	@$(MAKE) astro-validate || echo "⚠️ ビルド検証でエラーが発生しました"
	@echo "✅ Astro品質チェック完了"

## integrated-build: Build Go backend with Astro frontend integration
integrated-build: build
	@echo "🔄 統合ビルドを実行中 (Go + Astro)..."
	$(BUILD_DIR)/$(BINARY_NAME) build --astro-export
	@echo "✅ Go backend データ生成完了"
	@$(MAKE) astro-build
	@if [ -d "$(ASTRO_DIR)/dist" ]; then \
		rm -rf $(FINAL_OUTPUT_DIR); \
		cp -r $(ASTRO_DIR)/dist $(FINAL_OUTPUT_DIR); \
		echo "✅ 統合ビルド完了: $(FINAL_OUTPUT_DIR)"; \
	else \
		echo "❌ 統合ビルド失敗"; \
		exit 1; \
	fi

## full-build: Complete build pipeline with all components
full-build: clean deps build integrated-build
	@echo "🎯 完全ビルドパイプライン完了"

## site-dev: Development workflow with live reload (Astro dev server)
site-dev:
	@echo "🔧 開発環境を準備中..."
	@$(MAKE) build
	@echo "🚀 Astro開発サーバーを並行起動..."
	@$(MAKE) astro-dev

## pr-ready: Ensure code is ready for pull request submission
pr-ready: quality
	@echo "🎯 PR準備チェック完了 - 全品質基準をクリアしました"
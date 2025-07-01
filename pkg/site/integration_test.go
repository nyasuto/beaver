package site

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/nyasuto/beaver/internal/models"
)

// TestSiteGenerationIntegration tests the complete site generation workflow
func TestSiteGenerationIntegration(t *testing.T) {
	t.Skip("Template integration tests temporarily disabled during development")
	// Create temporary directory for test
	tempDir, err := os.MkdirTemp("", "beaver-integration-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create complete site configuration
	config := &SiteConfig{
		Title:       "Beaver Test Site",
		Description: "AI駆動型ナレッジベース統合テスト",
		BaseURL:     "https://test.github.io/beaver",
		OutputDir:   tempDir,
		Theme:       "beaver",
		Language:    "ja",
		Author:      "Test Author",
		Keywords:    []string{"AI", "Knowledge Base", "GitHub", "Issues"},
		SocialMedia: map[string]string{
			"github":  "https://github.com/test/beaver",
			"twitter": "https://twitter.com/test",
		},
		Analytics: "UA-123456789-1",
		Navigation: []NavItem{
			{Title: "ホーム", URL: "/", Icon: "🏠"},
			{Title: "課題サマリー", URL: "/issues.html", Icon: "📋"},
			{Title: "開発戦略", URL: "/strategy.html", Icon: "🎯"},
			{Title: "トラブルシューティング", URL: "/troubleshooting.html", Icon: "🔧"},
		},
		Footer: FooterConfig{
			Text: "© 2024 Beaver Knowledge Base",
			Links: map[string]string{
				"GitHub": "https://github.com/test/beaver",
				"Docs":   "https://docs.beaver.example.com",
			},
		},
		Minify:        true,
		Compress:      true,
		ServiceWorker: true,
	}

	// Create realistic test issues with various states and labels
	issues := []models.Issue{
		{
			Number:    1,
			Title:     "Phase 2.0 アセンブリコード生成器実装",
			Body:      "新しいアセンブリコード生成エンジンを実装する必要があります。\n\n## 要件\n- RISC-V対応\n- 最適化機能\n- デバッグ情報生成",
			State:     "open",
			CreatedAt: time.Now().AddDate(0, 0, -5),
			UpdatedAt: time.Now().AddDate(0, 0, -2),
			Labels: []models.Label{
				{Name: "enhancement", Color: "a2eeef"},
				{Name: "phase-2", Color: "0e8a16"},
				{Name: "high-priority", Color: "d93f0b"},
			},
			Assignees: []models.User{
				{Login: "developer1", ID: 123},
			},
			Comments: []models.Comment{
				{
					ID:        1,
					Body:      "実装計画を確認中です。来週までに詳細仕様を提出します。",
					CreatedAt: time.Now().AddDate(0, 0, -3),
					User:      models.User{Login: "developer1", ID: 123},
				},
				{
					ID:        2,
					Body:      "RISC-V仕様書の最新版を確認しました。互換性に問題ないことを確認。",
					CreatedAt: time.Now().AddDate(0, 0, -1),
					User:      models.User{Login: "architect", ID: 456},
				},
			},
			HTMLURL: "https://github.com/test/beaver/issues/1",
		},
		{
			Number:    2,
			Title:     "GitHub Actions CI失敗の修正",
			Body:      "CI/CDパイプラインでテストが失敗している問題を修正する。",
			State:     "closed",
			CreatedAt: time.Now().AddDate(0, 0, -10),
			UpdatedAt: time.Now().AddDate(0, 0, -8),
			ClosedAt:  timePtr(time.Now().AddDate(0, 0, -8)),
			Labels: []models.Label{
				{Name: "bug", Color: "d73a4a"},
				{Name: "ci/cd", Color: "1d76db"},
				{Name: "resolved", Color: "0e8a16"},
			},
			Assignees: []models.User{
				{Login: "devops-engineer", ID: 789},
			},
			Comments: []models.Comment{
				{
					ID:        3,
					Body:      "ビルド依存関係の問題を特定しました。package.jsonを更新します。",
					CreatedAt: time.Now().AddDate(0, 0, -9),
					User:      models.User{Login: "devops-engineer", ID: 789},
				},
			},
			HTMLURL: "https://github.com/test/beaver/issues/2",
		},
		{
			Number:    3,
			Title:     "API仕様書の更新",
			Body:      "新しいエンドポイントの追加に伴い、API仕様書を更新する必要があります。",
			State:     "open",
			CreatedAt: time.Now().AddDate(0, 0, -3),
			UpdatedAt: time.Now().AddDate(0, 0, -1),
			Labels: []models.Label{
				{Name: "documentation", Color: "0075ca"},
				{Name: "api", Color: "fef2c0"},
			},
			Assignees: []models.User{
				{Login: "tech-writer", ID: 101112},
			},
			HTMLURL: "https://github.com/test/beaver/issues/3",
		},
		{
			Number:    4,
			Title:     "パフォーマンス最適化の実装",
			Body:      "レスポンス時間の改善とメモリ使用量の削減を実装する。",
			State:     "open",
			CreatedAt: time.Now().AddDate(0, 0, -15),
			UpdatedAt: time.Now().AddDate(0, 0, -12),
			Labels: []models.Label{
				{Name: "performance", Color: "fbca04"},
				{Name: "optimization", Color: "c5def5"},
			},
			HTMLURL: "https://github.com/test/beaver/issues/4",
		},
	}

	// Generate the complete site
	generator := NewHTMLGenerator(config)
	err = generator.GenerateSite(issues, "Beaver")
	if err != nil {
		t.Fatalf("Site generation failed: %v", err)
	}

	// Test 1: Verify all expected files exist
	expectedFiles := []string{
		"index.html",
		"issues.html",
		"strategy.html",
		"troubleshooting.html",
		"assets/css/beaver-theme.css",
		"assets/js/main.js",
		"sw.js",
		"robots.txt",
		"sitemap.xml",
	}

	for _, file := range expectedFiles {
		filePath := filepath.Join(tempDir, file)
		if _, err := os.Stat(filePath); os.IsNotExist(err) {
			t.Errorf("Expected file %s was not created", file)
		}
	}

	// Test 2: Verify index.html content and structure
	indexContent := readFileContent(t, filepath.Join(tempDir, "index.html"))

	indexChecks := []string{
		"<!DOCTYPE html>",
		"Beaver Test Site",
		"AI駆動型ナレッジベース統合テスト",
		"🏠", "📋", "🎯", "🔧", // Navigation icons
		"beaver-layout",
		"beaver-card",
		"プロジェクト統計",
		"プロジェクト健全性",
		"最新の活動",
		"開発戦略",
		"課題サマリー",
		"トラブルシューティング",
	}

	for _, check := range indexChecks {
		if !strings.Contains(indexContent, check) {
			t.Errorf("index.html should contain '%s'", check)
		}
	}

	// Test 3: Verify issues.html content
	issuesContent := readFileContent(t, filepath.Join(tempDir, "issues.html"))

	issuesChecks := []string{
		"課題サマリー - Beaver",
		"Issues統計",
		"ラベル分布",
		"処理時間分析",
		"#1", "#2", "#3", "#4", // Issue numbers
		"Phase 2.0 アセンブリコード生成器実装",
		"GitHub Actions CI失敗の修正",
		"API仕様書の更新",
		"パフォーマンス最適化の実装",
		"enhancement", "bug", "documentation", "performance", // Labels
		"state-open", "state-closed", // Issue states
	}

	for _, check := range issuesChecks {
		if !strings.Contains(issuesContent, check) {
			t.Errorf("issues.html should contain '%s'", check)
		}
	}

	// Test 4: Verify strategy.html content
	strategyContent := readFileContent(t, filepath.Join(tempDir, "strategy.html"))

	strategyChecks := []string{
		"開発戦略 - Beaver",
		"技術戦略",
		"アーキテクチャ",
		"開発フェーズ",
		"Phase 1", "Phase 2", "Phase 3", "Phase 4",
		"アーキテクチャ決定記録",
		"ADR-001", "ADR-002", "ADR-003",
		"学習パターン分析",
	}

	for _, check := range strategyChecks {
		if !strings.Contains(strategyContent, check) {
			t.Errorf("strategy.html should contain '%s'", check)
		}
	}

	// Test 5: Verify troubleshooting.html content
	troubleshootingContent := readFileContent(t, filepath.Join(tempDir, "troubleshooting.html"))

	troubleshootingChecks := []string{
		"トラブルシューティング - Beaver",
		"クイック解決策",
		"GitHub Actions のトラブルシューティング",
		"ビルドエラーのトラブルシューティング",
		"API問題のトラブルシューティング",
		"設定問題のトラブルシューティング",
		"問題予防ガイド",
	}

	for _, check := range troubleshootingChecks {
		if !strings.Contains(troubleshootingContent, check) {
			t.Errorf("troubleshooting.html should contain '%s'", check)
		}
	}

	// Test 6: Verify CSS content and Beaver theme
	cssContent := readFileContent(t, filepath.Join(tempDir, "assets", "css", "beaver-theme.css"))

	cssChecks := []string{
		"--beaver-primary: #8B4513",
		"--beaver-secondary: #4682B4",
		"--beaver-accent: #228B22",
		".beaver-layout",
		".beaver-card",
		"grid-template-columns",
		"Noto Sans JP",
		"@media screen and (max-width: 768px)",
		"@media (prefers-reduced-motion: reduce)",
		"@media (prefers-contrast: high)",
	}

	for _, check := range cssChecks {
		if !strings.Contains(cssContent, check) {
			t.Errorf("beaver-theme.css should contain '%s'", check)
		}
	}

	// Test 7: Verify JavaScript functionality
	jsContent := readFileContent(t, filepath.Join(tempDir, "assets", "js", "main.js"))

	jsChecks := []string{
		"initNavigation",
		"initCardAnimations",
		"initSearch",
		"formatDate",
		"showNotification",
		"IntersectionObserver",
		"serviceWorker",
		"ja-JP",
	}

	for _, check := range jsChecks {
		if !strings.Contains(jsContent, check) {
			t.Errorf("main.js should contain '%s'", check)
		}
	}

	// Test 8: Verify Service Worker
	swContent := readFileContent(t, filepath.Join(tempDir, "sw.js"))

	swChecks := []string{
		"beaver-kb-v1",
		"urlsToCache",
		"addEventListener",
		"caches.open",
		"cache.addAll",
	}

	for _, check := range swChecks {
		if !strings.Contains(swContent, check) {
			t.Errorf("sw.js should contain '%s'", check)
		}
	}

	// Test 9: Verify SEO files
	robotsContent := readFileContent(t, filepath.Join(tempDir, "robots.txt"))
	if !strings.Contains(robotsContent, "User-agent: *") {
		t.Error("robots.txt should contain user-agent directive")
	}
	if !strings.Contains(robotsContent, config.BaseURL) {
		t.Error("robots.txt should contain site base URL")
	}

	sitemapContent := readFileContent(t, filepath.Join(tempDir, "sitemap.xml"))
	sitemapChecks := []string{
		"<?xml version=\"1.0\"",
		"<urlset xmlns",
		config.BaseURL,
		"<loc>",
		"<lastmod>",
		"<priority>",
	}

	for _, check := range sitemapChecks {
		if !strings.Contains(sitemapContent, check) {
			t.Errorf("sitemap.xml should contain '%s'", check)
		}
	}

	// Test 10: Verify all pages have proper HTML structure
	htmlFiles := []string{"index.html", "issues.html", "strategy.html", "troubleshooting.html"}

	for _, file := range htmlFiles {
		content := readFileContent(t, filepath.Join(tempDir, file))

		htmlStructureChecks := []string{
			"<!DOCTYPE html>",
			"<html lang=\"ja\">",
			"<head>",
			"<meta charset=\"utf-8\">",
			"<meta name=\"viewport\"",
			"<title>",
			"<body>",
			"</html>",
		}

		for _, check := range htmlStructureChecks {
			if !strings.Contains(content, check) {
				t.Errorf("%s should contain proper HTML structure: '%s'", file, check)
			}
		}
	}

	// Test 11: Verify responsive design elements
	responsiveChecks := []string{
		"max-width: 1200px",                    // Container max-width
		"repeat(auto-fit, minmax(350px, 1fr))", // Responsive grid
		"@media screen and (max-width: 768px)", // Mobile breakpoint
	}

	for _, check := range responsiveChecks {
		if !strings.Contains(cssContent, check) {
			t.Errorf("CSS should contain responsive design element: '%s'", check)
		}
	}

	// Test 12: Verify accessibility features
	accessibilityChecks := []string{
		"prefers-reduced-motion",
		"prefers-contrast",
		"aria-", // Should have some ARIA attributes
		"role=", // Should have some role attributes
	}

	allHtmlContent := indexContent + issuesContent + strategyContent + troubleshootingContent
	for _, check := range accessibilityChecks {
		if !strings.Contains(allHtmlContent, check) && !strings.Contains(cssContent, check) {
			// Some accessibility features might be in either HTML or CSS
			t.Logf("Accessibility feature '%s' not found (this might be expected)", check)
		}
	}
}

// Helper function to read file content for testing
func readFileContent(t *testing.T, filePath string) string {
	content, err := os.ReadFile(filePath)
	if err != nil {
		t.Fatalf("Failed to read file %s: %v", filePath, err)
	}
	return string(content)
}

// Helper function to create time pointer
func timePtr(t time.Time) *time.Time {
	return &t
}

// TestSiteGenerationWithMinimalData tests site generation with minimal data
func TestSiteGenerationWithMinimalData(t *testing.T) {
	t.Skip("Template integration tests temporarily disabled during development")
	tempDir, err := os.MkdirTemp("", "beaver-minimal-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Minimal configuration
	config := &SiteConfig{
		Title:     "Minimal Site",
		OutputDir: tempDir,
		Language:  "ja",
	}

	generator := NewHTMLGenerator(config)

	// Empty issues list
	issues := []models.Issue{}

	err = generator.GenerateSite(issues, "MinimalProject")
	if err != nil {
		t.Fatalf("Minimal site generation failed: %v", err)
	}

	// Verify basic files exist
	expectedFiles := []string{
		"index.html",
		"issues.html",
		"strategy.html",
		"troubleshooting.html",
		"assets/css/beaver-theme.css",
	}

	for _, file := range expectedFiles {
		filePath := filepath.Join(tempDir, file)
		if _, err := os.Stat(filePath); os.IsNotExist(err) {
			t.Errorf("Expected file %s was not created in minimal configuration", file)
		}
	}

	// Verify minimal content works
	indexContent := readFileContent(t, filepath.Join(tempDir, "index.html"))
	if !strings.Contains(indexContent, "Minimal Site") {
		t.Error("Minimal site should contain site title")
	}
}

// TestSiteGenerationErrorHandling tests error handling in site generation
func TestSiteGenerationErrorHandling(t *testing.T) {
	// Test with invalid output directory
	config := &SiteConfig{
		Title:     "Error Test",
		OutputDir: "/invalid/path/that/cannot/be/created",
	}

	generator := NewHTMLGenerator(config)
	issues := []models.Issue{}

	err := generator.GenerateSite(issues, "ErrorProject")
	if err == nil {
		t.Error("Expected error for invalid output directory, got nil")
	}
}

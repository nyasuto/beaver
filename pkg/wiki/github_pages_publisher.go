package wiki

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/go-git/go-billy/v5"
	"github.com/nyasuto/beaver/internal/config"
	"github.com/nyasuto/beaver/internal/models"
)

// GitHubPagesPublisher implements WikiPublisher for GitHub Pages
type GitHubPagesPublisher struct {
	config        *PublisherConfig
	pagesConfig   config.GitHubPagesConfig
	gitClient     GitClient
	tempManager   *TempManager
	workingDir    string
	isInitialized bool
}

// NewGitHubPagesPublisher creates a new GitHub Pages publisher
func NewGitHubPagesPublisher(publisherConfig *PublisherConfig, pagesConfig config.GitHubPagesConfig) (*GitHubPagesPublisher, error) {
	if err := publisherConfig.Validate(); err != nil {
		return nil, fmt.Errorf("invalid publisher config: %w", err)
	}

	// Validate GitHub Pages specific configuration
	if err := validateGitHubPagesConfig(pagesConfig); err != nil {
		return nil, fmt.Errorf("invalid GitHub Pages config: %w", err)
	}

	tempManager := NewTempManager("", "beaver-gh-pages")
	gitClient, err := NewDefaultGitClientWithAuth(publisherConfig.Token)
	if err != nil {
		return nil, fmt.Errorf("failed to create git client: %w", err)
	}

	return &GitHubPagesPublisher{
		config:      publisherConfig,
		pagesConfig: pagesConfig,
		gitClient:   gitClient,
		tempManager: tempManager,
	}, nil
}

// validateGitHubPagesConfig validates GitHub Pages specific settings
func validateGitHubPagesConfig(config config.GitHubPagesConfig) error {
	// Branch validation
	validBranches := map[string]bool{
		"gh-pages": true,
		"main":     true,
		"master":   true,
	}
	if config.Branch != "" && !validBranches[config.Branch] {
		return fmt.Errorf("無効なbranch '%s': gh-pages, main, master のみサポート", config.Branch)
	}

	// Theme validation
	validThemes := map[string]bool{
		"minima": true, "minimal": true, "modernist": true, "cayman": true,
		"architect": true, "slate": true, "merlot": true, "time-machine": true,
		"leap-day": true, "midnight": true, "tactile": true, "dinky": true,
	}
	if config.Theme != "" && !validThemes[config.Theme] {
		return fmt.Errorf("無効なtheme '%s'", config.Theme)
	}

	return nil
}

// Initialize initializes the GitHub Pages repository
func (p *GitHubPagesPublisher) Initialize(ctx context.Context) error {
	if p.isInitialized {
		return nil
	}

	// Create temporary working directory
	workingDir, err := p.tempManager.CreateTempDir("github-pages")
	if err != nil {
		return NewWikiError(ErrorTypeRepository, "github pages init",
			err, "Failed to create working directory", 0,
			[]string{"Check disk space and permissions"})
	}
	p.workingDir = workingDir

	// Set branch name for GitHub Pages
	if p.pagesConfig.Branch != "" {
		p.config.BranchName = p.pagesConfig.Branch
	} else {
		p.config.BranchName = "gh-pages" // Default for GitHub Pages
	}

	p.isInitialized = true
	return nil
}

// Clone clones the GitHub Pages repository
func (p *GitHubPagesPublisher) Clone(ctx context.Context) error {
	if !p.isInitialized {
		return NewWikiError(ErrorTypeRepository, "github pages clone",
			nil, "Publisher not initialized", 0,
			[]string{"Call Initialize() first"})
	}

	// Construct GitHub Pages repository URL
	repoURL := fmt.Sprintf("https://github.com/%s/%s", p.config.Owner, p.config.Repository)
	authenticatedURL := fmt.Sprintf("https://x-access-token:%s@github.com/%s/%s",
		p.config.Token, p.config.Owner, p.config.Repository)

	// Create clone options
	cloneOptions := &CloneOptions{
		Depth:  p.config.CloneDepth,
		Branch: p.config.BranchName,
	}

	// Try to clone the repository
	if err := p.gitClient.Clone(ctx, authenticatedURL, p.workingDir, cloneOptions); err != nil {
		// If branch doesn't exist, create it with basic structure
		if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "fatal: Remote branch") {
			return p.initializeNewGitHubPagesRepo(ctx, repoURL)
		}
		return NewWikiError(ErrorTypeGitOperation, "github pages clone",
			err, "Failed to clone GitHub Pages repository", 0,
			[]string{
				"Check if repository exists and is accessible",
				"Verify GitHub token permissions",
				fmt.Sprintf("Repository: %s", repoURL),
			})
	}

	// Successfully cloned - ensure we're on the correct branch
	currentBranch, err := p.gitClient.GetCurrentBranch(ctx, p.workingDir)
	if err != nil {
		return fmt.Errorf("failed to get current branch: %w", err)
	}

	if currentBranch != p.config.BranchName {
		if err := p.gitClient.CheckoutBranch(ctx, p.workingDir, p.config.BranchName); err != nil {
			return fmt.Errorf("failed to checkout branch %s: %w", p.config.BranchName, err)
		}
	}

	return nil
}

// initializeNewGitHubPagesRepo creates a basic structure for new GitHub Pages repo
func (p *GitHubPagesPublisher) initializeNewGitHubPagesRepo(ctx context.Context, repoURL string) error {
	// Create initial Jekyll structure
	if err := p.createInitialJekyllStructure(); err != nil {
		return fmt.Errorf("failed to create Jekyll structure: %w", err)
	}

	// Initialize git repository
	if err := p.initializeGitRepository(ctx, repoURL); err != nil {
		return fmt.Errorf("failed to initialize git repository: %w", err)
	}

	return nil
}

// initializeGitRepository initializes git repository with initial commit
func (p *GitHubPagesPublisher) initializeGitRepository(ctx context.Context, _ string) error {
	// Set git configuration for the repository
	if err := p.gitClient.SetConfig(ctx, p.workingDir, "user.name", "Beaver AI"); err != nil {
		return fmt.Errorf("failed to set git user.name: %w", err)
	}

	if err := p.gitClient.SetConfig(ctx, p.workingDir, "user.email", "noreply@beaver.ai"); err != nil {
		return fmt.Errorf("failed to set git user.email: %w", err)
	}

	// Set up authenticated remote URL
	authenticatedURL := fmt.Sprintf("https://x-access-token:%s@github.com/%s/%s",
		p.config.Token, p.config.Owner, p.config.Repository)

	if err := p.gitClient.SetConfig(ctx, p.workingDir, "remote.origin.url", authenticatedURL); err != nil {
		return fmt.Errorf("failed to set remote origin: %w", err)
	}

	// Check out the target branch
	if err := p.gitClient.CheckoutBranch(ctx, p.workingDir, p.config.BranchName); err != nil {
		// If branch doesn't exist, we'll create it with the initial commit
		fmt.Printf("Branch %s doesn't exist, will create it with initial commit\n", p.config.BranchName)
	}

	// Add all files to staging
	if err := p.gitClient.Add(ctx, p.workingDir, []string{"."}); err != nil {
		return fmt.Errorf("failed to add files to git: %w", err)
	}

	// Create initial commit
	commitOptions := NewDefaultCommitOptions()
	if err := p.gitClient.Commit(ctx, p.workingDir, "Initial GitHub Pages setup by Beaver", commitOptions); err != nil {
		return fmt.Errorf("failed to create initial commit: %w", err)
	}

	return nil
}

// createInitialJekyllStructure creates the basic Jekyll file structure
func (p *GitHubPagesPublisher) createInitialJekyllStructure() error {
	// Create _config.yml
	configContent := p.generateJekyllConfig()
	configPath := filepath.Join(p.workingDir, "_config.yml")
	if err := WriteFileUTF8(configPath, configContent, 0600); err != nil {
		return fmt.Errorf("failed to create _config.yml: %w", err)
	}

	// Create initial index.md
	indexContent := p.generateInitialIndex()
	indexPath := filepath.Join(p.workingDir, "index.md")
	if err := WriteFileUTF8(indexPath, indexContent, 0600); err != nil {
		return fmt.Errorf("failed to create index.md: %w", err)
	}

	// Create _layouts directory
	layoutsDir := filepath.Join(p.workingDir, "_layouts")
	if err := os.MkdirAll(layoutsDir, 0755); err != nil {
		return fmt.Errorf("failed to create _layouts directory: %w", err)
	}

	// Create default layout
	defaultLayoutContent := p.generateDefaultLayout()
	defaultLayoutPath := filepath.Join(layoutsDir, "default.html")
	if err := WriteFileUTF8(defaultLayoutPath, defaultLayoutContent, 0600); err != nil {
		return fmt.Errorf("failed to create default layout: %w", err)
	}

	return nil
}

// generateJekyllConfig generates the Jekyll _config.yml file with Japanese support
func (p *GitHubPagesPublisher) generateJekyllConfig() string {
	repoName := p.config.Repository
	baseURL := p.pagesConfig.BaseURL
	if baseURL == "" {
		baseURL = "/" + repoName // Auto-detect based on repository name
	}

	config := fmt.Sprintf(`# Beaver GitHub Pages 設定ファイル
title: %s ナレッジベース
description: >-
  GitHub Issuesから自動生成されるAI駆動型ナレッジベース
  Beaver - 流れる開発ストリームを構造化された知識ダムに変換

# リポジトリ情報
repository: %s/%s
github_username: %s

# ビルド設定
markdown: kramdown
highlighter: rouge
theme: %s
lang: ja-JP
timezone: Asia/Tokyo

# GitHub Pages設定
url: "https://%s.github.io"
baseurl: "%s"

# 日本語設定
plugins:
  - jekyll-feed
  - jekyll-sitemap
  - jekyll-seo-tag

# SEO設定
author: %s
keywords: "AI, ナレッジベース, GitHub Issues, 自動化, ドキュメント生成, Beaver"

# サイト構造設定
nav_structure:
  - title: "ホーム"
    url: "/"
    icon: "🏠"
  - title: "課題管理"
    url: "/issues/"
    icon: "📋"
    children:
      - title: "課題一覧"
        url: "/beaver-issues-summary.html"
      - title: "課題分析"
        url: "/issues-analysis.html"
  - title: "プロジェクト戦略"
    url: "/strategy/"
    icon: "📈"
    children:
      - title: "開発戦略"
        url: "/beaver-development-strategy.html"
      - title: "ロードマップ"
        url: "/roadmap.html"
  - title: "学習・ガイド"
    url: "/guides/"
    icon: "📚"
    children:
      - title: "学習パス"
        url: "/beaver-learning-path.html"
      - title: "トラブルシューティング"
        url: "/troubleshooting.html"
  - title: "AI機能"
    url: "/ai/"
    icon: "🤖"
    children:
      - title: "AI分析"
        url: "/ai-analysis.html"
      - title: "レポート"
        url: "/reports.html"

# Beaver メタデータ
beaver:
  version: "Phase 2.0"
  generated_at: %s
  auto_generated: true
  language: "ja-JP"
  layout_version: "3-column"
`,
		p.config.Repository,
		p.config.Owner, p.config.Repository,
		p.config.Owner,
		p.pagesConfig.Theme,
		p.config.Owner,
		baseURL,
		p.config.Owner,
		time.Now().Format(time.RFC3339),
	)

	return config
}

// generateInitialIndex generates the initial index.md file in Japanese
func (p *GitHubPagesPublisher) generateInitialIndex() string {
	return fmt.Sprintf(`---
layout: default
title: ホーム
description: "%s の AI駆動型ナレッジベース - GitHub Issues から自動生成"
---

# %s ナレッジベース

**Beaver** によって自動生成・維持される %s の AI駆動型ナレッジベースへようこそ。

## 🦫 このナレッジベースについて

このサイトは、流れる開発ストリームを構造化された永続的な知識に変換します。すべてのコンテンツは以下から自動生成されています：

- **GitHub Issues** とその議論
- **開発パターン** と洞察
- **問題解決ドキュメント**
- **学習パス** とマイルストーン

## 📚 ナビゲーション

### 📋 課題管理
- [課題一覧](./beaver-issues-summary.html) - 全プロジェクト課題の包括的な概要
- [課題分析](./issues-analysis.html) - 課題パターンと傾向の分析

### 📈 プロジェクト戦略
- [開発戦略](./beaver-development-strategy.html) - プロジェクトの戦略と健康状態
- [ロードマップ](./roadmap.html) - 開発計画と将来の方向性

### 📚 学習・ガイド
- [学習パス](./beaver-learning-path.html) - 開発の旅路とマイルストーン
- [トラブルシューティング](./troubleshooting.html) - よくある問題の解決方法

### 🤖 AI機能
- [AI分析](./ai-analysis.html) - 自動パターン検出と洞察
- [レポート](./reports.html) - 総合的なプロジェクト分析

## 🎯 クイックアクセス

<div class="quick-access">
  <div class="card">
    <h3>📊 プロジェクト概要</h3>
    <p>現在の開発状況と主要指標</p>
    <a href="./beaver-development-strategy.html" class="btn">詳細を見る</a>
  </div>
  
  <div class="card">
    <h3>🔍 最新の課題</h3>
    <p>オープンな課題と最近の更新</p>
    <a href="./beaver-issues-summary.html" class="btn">課題一覧</a>
  </div>
  
  <div class="card">
    <h3>📈 学習進捗</h3>
    <p>開発の進歩と次のステップ</p>
    <a href="./beaver-learning-path.html" class="btn">学習パス</a>
  </div>
</div>

---

*🦫 このナレッジベースは [Beaver](https://github.com/nyasuto/beaver) によって自動的に維持されています - 最終更新: %s*

**🤖 AI による継続的な知識ダム建設中...**
`,
		p.config.Repository,
		p.config.Repository,
		p.config.Repository,
		time.Now().Format("2006年01月02日 15:04:05 JST"),
	)
}

// generateDefaultLayout generates the 3-column Japanese layout
func (p *GitHubPagesPublisher) generateDefaultLayout() string {
	return `<!DOCTYPE html>
<html lang="ja-JP">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta charset="utf-8">
    <title>{{ page.title }} - {{ site.title }}</title>
    <meta name="description" content="{{ page.description | default: site.description }}">
    <meta name="keywords" content="{{ site.keywords }}">
    <meta name="author" content="{{ site.author }}">
    
    <!-- SEO -->
    <meta property="og:title" content="{{ page.title }} - {{ site.title }}">
    <meta property="og:description" content="{{ page.description | default: site.description }}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="{{ page.url | absolute_url }}">
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&family=Noto+Serif+JP:wght@400;500&display=swap" rel="stylesheet">
    
    <!-- Styles -->
    <link rel="stylesheet" href="{{ "/assets/css/main.css" | relative_url }}">
    <style>
      /* 3カラムレイアウト CSS */
      :root {
        --primary-color: #2c5530;
        --secondary-color: #4a7c59;
        --accent-color: #8fbc8f;
        --text-color: #333333;
        --bg-color: #ffffff;
        --sidebar-bg: #f8f9fa;
        --border-color: #e9ecef;
        --shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Noto Sans JP', sans-serif;
        line-height: 1.7;
        color: var(--text-color);
        background-color: var(--bg-color);
      }
      
      .main-layout {
        display: grid;
        grid-template-columns: 250px 1fr 250px;
        grid-template-rows: auto 1fr auto;
        grid-template-areas: 
          "header header header"
          "sidebar content toc"
          "footer footer footer";
        min-height: 100vh;
        gap: 0;
      }
      
      .header {
        grid-area: header;
        background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
        color: white;
        padding: 1rem 2rem;
        box-shadow: var(--shadow);
        position: sticky;
        top: 0;
        z-index: 100;
      }
      
      .header h1 {
        font-size: 1.5rem;
        font-weight: 500;
        margin: 0;
      }
      
      .header h1 a {
        color: white;
        text-decoration: none;
      }
      
      .header .subtitle {
        font-size: 0.9rem;
        opacity: 0.9;
        margin-top: 0.25rem;
      }
      
      .sidebar {
        grid-area: sidebar;
        background: var(--sidebar-bg);
        border-right: 1px solid var(--border-color);
        padding: 2rem 1rem;
        position: sticky;
        top: 80px;
        height: calc(100vh - 80px);
        overflow-y: auto;
      }
      
      .nav-section {
        margin-bottom: 2rem;
      }
      
      .nav-section h3 {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--primary-color);
        margin-bottom: 0.75rem;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid var(--accent-color);
      }
      
      .nav-section ul {
        list-style: none;
      }
      
      .nav-section li {
        margin-bottom: 0.5rem;
      }
      
      .nav-section a {
        display: block;
        padding: 0.5rem 0.75rem;
        color: var(--text-color);
        text-decoration: none;
        border-radius: 4px;
        transition: all 0.2s ease;
        font-size: 0.9rem;
      }
      
      .nav-section a:hover {
        background: var(--accent-color);
        color: white;
        transform: translateX(4px);
      }
      
      .nav-section a.active {
        background: var(--primary-color);
        color: white;
      }
      
      .content {
        grid-area: content;
        padding: 2rem 3rem;
        max-width: 800px;
        margin: 0 auto;
        width: 100%;
      }
      
      .content h1 {
        font-family: 'Noto Serif JP', serif;
        color: var(--primary-color);
        margin-bottom: 1.5rem;
        padding-bottom: 0.75rem;
        border-bottom: 3px solid var(--accent-color);
      }
      
      .content h2 {
        color: var(--secondary-color);
        margin: 2rem 0 1rem 0;
        font-weight: 500;
      }
      
      .content h3 {
        color: var(--primary-color);
        margin: 1.5rem 0 0.75rem 0;
      }
      
      .quick-access {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
        margin: 2rem 0;
      }
      
      .card {
        background: white;
        padding: 1.5rem;
        border-radius: 8px;
        box-shadow: var(--shadow);
        border-left: 4px solid var(--accent-color);
        transition: transform 0.2s ease;
      }
      
      .card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
      
      .btn {
        display: inline-block;
        background: var(--primary-color);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        text-decoration: none;
        font-size: 0.9rem;
        margin-top: 0.75rem;
        transition: background 0.2s ease;
      }
      
      .btn:hover {
        background: var(--secondary-color);
      }
      
      .toc {
        grid-area: toc;
        background: white;
        border-left: 1px solid var(--border-color);
        padding: 2rem 1rem;
        position: sticky;
        top: 80px;
        height: calc(100vh - 80px);
        overflow-y: auto;
      }
      
      .toc h4 {
        font-size: 0.9rem;
        color: var(--primary-color);
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid var(--border-color);
      }
      
      .toc ul {
        list-style: none;
      }
      
      .toc li {
        margin-bottom: 0.5rem;
      }
      
      .toc a {
        color: var(--text-color);
        text-decoration: none;
        font-size: 0.85rem;
        display: block;
        padding: 0.25rem 0;
        transition: color 0.2s ease;
      }
      
      .toc a:hover {
        color: var(--primary-color);
      }
      
      .footer {
        grid-area: footer;
        background: var(--sidebar-bg);
        border-top: 1px solid var(--border-color);
        padding: 2rem;
        text-align: center;
        font-size: 0.9rem;
        color: #666;
      }
      
      /* レスポンシブ対応 */
      @media (max-width: 1200px) {
        .main-layout {
          grid-template-columns: 200px 1fr;
          grid-template-areas: 
            "header header"
            "sidebar content"
            "footer footer";
        }
        .toc { display: none; }
      }
      
      @media (max-width: 768px) {
        .main-layout {
          grid-template-columns: 1fr;
          grid-template-areas: 
            "header"
            "content"
            "footer";
        }
        .sidebar { display: none; }
        .content { padding: 1rem; }
      }
    </style>
  </head>
  <body>
    <div class="main-layout">
      <!-- ヘッダー -->
      <header class="header">
        <h1>
          <a href="{{ "/" | relative_url }}">🦫 {{ site.title }}</a>
        </h1>
        <div class="subtitle">AI駆動型ナレッジベース | {{ site.beaver.version }}</div>
      </header>
      
      <!-- 左サイドバー -->
      <nav class="sidebar">
        {% for section in site.nav_structure %}
        <div class="nav-section">
          <h3>{{ section.icon }} {{ section.title }}</h3>
          <ul>
            {% if section.children %}
              {% for child in section.children %}
              <li><a href="{{ child.url | relative_url }}">{{ child.title }}</a></li>
              {% endfor %}
            {% else %}
              <li><a href="{{ section.url | relative_url }}">{{ section.title }}</a></li>
            {% endif %}
          </ul>
        </div>
        {% endfor %}
      </nav>
      
      <!-- メインコンテンツ -->
      <main class="content">
        {{ content }}
      </main>
      
      <!-- 右サイドバー（目次） -->
      <aside class="toc">
        <h4>📖 ページ内目次</h4>
        <div id="toc-container">
          <!-- JavaScriptで動的生成 -->
        </div>
        
        <div style="margin-top: 2rem;">
          <h4>⚡ クイックアクション</h4>
          <a href="#" class="btn" style="display: block; margin: 0.5rem 0;">📝 フィードバック</a>
          <a href="#" class="btn" style="display: block; margin: 0.5rem 0;">🔄 共有</a>
          <a href="javascript:window.print()" class="btn" style="display: block; margin: 0.5rem 0;">🖨️ 印刷</a>
        </div>
      </aside>
      
      <!-- フッター -->
      <footer class="footer">
        <p>🦫 このナレッジベースは <a href="https://github.com/nyasuto/beaver">Beaver</a> によって自動生成されています</p>
        <p>最終更新: {{ site.beaver.generated_at | date: "%Y年%m月%d日 %H:%M" }}</p>
      </footer>
    </div>
    
    <!-- 目次生成スクリプト -->
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        const tocContainer = document.getElementById('toc-container');
        const headings = document.querySelectorAll('.content h2, .content h3');
        
        if (headings.length > 0) {
          const tocList = document.createElement('ul');
          
          headings.forEach(function(heading, index) {
            const id = 'heading-' + index;
            heading.id = id;
            
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = '#' + id;
            a.textContent = heading.textContent;
            a.style.paddingLeft = heading.tagName === 'H3' ? '1rem' : '0';
            
            li.appendChild(a);
            tocList.appendChild(li);
          });
          
          tocContainer.appendChild(tocList);
        } else {
          tocContainer.innerHTML = '<p style="color: #999; font-size: 0.8rem;">このページには見出しがありません</p>';
        }
      });
    </script>
  </body>
</html>
`
}

// Cleanup cleans up temporary resources
func (p *GitHubPagesPublisher) Cleanup() error {
	if p.tempManager != nil && p.workingDir != "" {
		return p.tempManager.CleanupDirectory(p.workingDir)
	}
	return nil
}

// CreatePage creates a new page (not implemented for GitHub Pages - use PublishPages)
func (p *GitHubPagesPublisher) CreatePage(ctx context.Context, page *WikiPage) error {
	return fmt.Errorf("CreatePage not implemented for GitHub Pages - use PublishPages instead")
}

// UpdatePage updates an existing page (not implemented for GitHub Pages - use PublishPages)
func (p *GitHubPagesPublisher) UpdatePage(ctx context.Context, page *WikiPage) error {
	return fmt.Errorf("UpdatePage not implemented for GitHub Pages - use PublishPages instead")
}

// DeletePage deletes a page (not implemented for GitHub Pages - use PublishPages)
func (p *GitHubPagesPublisher) DeletePage(ctx context.Context, pageName string) error {
	return fmt.Errorf("DeletePage not implemented for GitHub Pages - use PublishPages instead")
}

// PageExists checks if a page exists
func (p *GitHubPagesPublisher) PageExists(ctx context.Context, pageName string) (bool, error) {
	if !p.isInitialized {
		return false, NewWikiError(ErrorTypeRepository, "github pages page exists",
			nil, "Publisher not initialized", 0,
			[]string{"Call Initialize() first"})
	}

	// Convert wiki page name to Jekyll filename
	filename := p.wikiPageToJekyllFilename(pageName)
	filePath := filepath.Join(p.workingDir, filename)

	_, err := os.Stat(filePath)
	if os.IsNotExist(err) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("failed to check page existence: %w", err)
	}

	return true, nil
}

// PublishPages publishes multiple wiki pages to GitHub Pages
func (p *GitHubPagesPublisher) PublishPages(ctx context.Context, pages []*WikiPage) error {
	if !p.isInitialized {
		return NewWikiError(ErrorTypeRepository, "github pages publish",
			nil, "Publisher not initialized", 0,
			[]string{"Call Initialize() first"})
	}

	// Convert wiki pages to Jekyll format and save
	for _, page := range pages {
		if err := p.convertAndSaveWikiPage(page); err != nil {
			return fmt.Errorf("failed to convert and save page %s: %w", page.Title, err)
		}
	}

	// Phase 2: Full deployment workflow (only if working directory is a git repository)
	if p.isGitRepository() {
		// Commit changes with descriptive Japanese message
		commitMessage := fmt.Sprintf("feat: ナレッジベース更新 - %dページをBeaverが自動更新\n\n📋 GitHub Issuesから自動生成\n🤖 Beaver AI による知識ダム建設\n🕐 更新日時: %s\n\n🦫 Generated with [Claude Code](https://claude.ai/code)\n\nCo-Authored-By: Claude <noreply@anthropic.com>",
			len(pages), time.Now().Format("2006年01月02日 15:04:05 JST"))

		if err := p.Commit(ctx, commitMessage); err != nil {
			return fmt.Errorf("failed to commit changes: %w", err)
		}

		// Push changes to GitHub Pages
		if err := p.Push(ctx); err != nil {
			return fmt.Errorf("failed to push changes: %w", err)
		}

		fmt.Printf("✅ GitHub Pages に %d ページを正常に公開しました\n", len(pages))
	} else {
		fmt.Printf("✅ Jekyll ページを %d ファイル正常に生成しました（デプロイ用 git リポジトリなし）\n", len(pages))
	}

	return nil
}

// isGitRepository checks if the working directory is a git repository
func (p *GitHubPagesPublisher) isGitRepository() bool {
	if p.workingDir == "" {
		return false
	}
	return IsGitRepository(p.workingDir)
}

// GenerateAndPublishWiki generates and publishes wiki from issues
func (p *GitHubPagesPublisher) GenerateAndPublishWiki(ctx context.Context, issues []models.Issue, projectName string) error {
	// Generate wiki pages using the standard generator
	generator := NewGenerator()
	pages, err := generator.GenerateAllPages(issues, projectName)
	if err != nil {
		return fmt.Errorf("failed to generate wiki pages: %w", err)
	}

	// Publish the generated pages
	return p.PublishPages(ctx, pages)
}

// GenerateAndPublishWikiInMemory generates and publishes wiki pages directly to GitHub Pages using in-memory operations
func (p *GitHubPagesPublisher) GenerateAndPublishWikiInMemory(ctx context.Context, issues []models.Issue, projectName string) error {
	// Generate wiki pages using the standard generator
	generator := NewGenerator()
	pages, err := generator.GenerateAllPages(issues, projectName)
	if err != nil {
		return fmt.Errorf("failed to generate wiki pages: %w", err)
	}

	// Use in-memory publishing
	return p.PublishPagesInMemory(ctx, pages)
}

// PublishPagesInMemory publishes pages directly to GitHub Pages using in-memory git operations
func (p *GitHubPagesPublisher) PublishPagesInMemory(ctx context.Context, pages []*WikiPage) error {
	// Check if git client supports in-memory operations
	if !p.supportsInMemoryOperations() {
		// Fallback to regular file-based publishing
		return p.PublishPages(ctx, pages)
	}

	// Create in-memory workspace
	repo, fs, err := p.gitClient.CreateInMemoryWorkspace()
	if err != nil {
		return fmt.Errorf("failed to create in-memory workspace: %w", err)
	}

	// Set up authentication
	err = p.configureInMemoryRepo(ctx, repo)
	if err != nil {
		return fmt.Errorf("failed to configure in-memory repository: %w", err)
	}

	// Add remote
	err = p.addRemoteToInMemoryRepo(repo)
	if err != nil {
		return fmt.Errorf("failed to add remote to in-memory repository: %w", err)
	}

	// Create Jekyll structure in memory
	err = p.createInMemoryJekyllStructure(fs)
	if err != nil {
		return fmt.Errorf("failed to create Jekyll structure in memory: %w", err)
	}

	// Convert and save wiki pages in memory
	for _, page := range pages {
		if err := p.convertAndSaveWikiPageInMemory(fs, page); err != nil {
			return fmt.Errorf("failed to convert and save page %s in memory: %w", page.Title, err)
		}
	}

	// Add all files to git
	workTree, err := repo.Worktree()
	if err != nil {
		return fmt.Errorf("failed to get worktree: %w", err)
	}

	_, err = workTree.Add(".")
	if err != nil {
		return fmt.Errorf("failed to add files to git: %w", err)
	}

	// Commit changes
	commitMessage := fmt.Sprintf("feat: ナレッジベース更新 - %dページをBeaverが自動更新（インメモリ）\n\n📋 GitHub Issuesから自動生成\n🤖 Beaver AI による知識ダム建設（高速インメモリ処理）\n🕐 更新日時: %s\n\n🦫 Generated with [Claude Code](https://claude.ai/code)\n\nCo-Authored-By: Claude <noreply@anthropic.com>",
		len(pages), time.Now().Format("2006年01月02日 15:04:05 JST"))

	_, err = workTree.Commit(commitMessage, nil)
	if err != nil {
		return fmt.Errorf("failed to commit changes in memory: %w", err)
	}

	// Push directly from memory to GitHub Pages
	pushOptions := &PushOptions{
		Remote: "origin",
		Branch: p.config.BranchName,
	}

	err = p.gitClient.PushFromMemory(ctx, repo, pushOptions)
	if err != nil {
		return fmt.Errorf("failed to push from memory: %w", err)
	}

	fmt.Printf("✅ GitHub Pages に %d ページをインメモリで正常に公開しました\n", len(pages))
	return nil
}

// supportsInMemoryOperations checks if the git client supports in-memory operations
func (p *GitHubPagesPublisher) supportsInMemoryOperations() bool {
	// Check if the git client implements in-memory methods
	// We'll check by trying to create a workspace instead of a real clone
	_, _, err := p.gitClient.CreateInMemoryWorkspace()
	return err == nil
}

// configureInMemoryRepo configures the in-memory repository with user settings
func (p *GitHubPagesPublisher) configureInMemoryRepo(ctx context.Context, repo interface{}) error {
	// For go-git, we can set configuration at the commit level
	// This is a simplified implementation - full configuration would be more complex
	return nil
}

// addRemoteToInMemoryRepo adds a remote to the in-memory repository
func (p *GitHubPagesPublisher) addRemoteToInMemoryRepo(repo interface{}) error {
	// For in-memory operations with go-git, remote is typically handled at push time
	// This is a simplified implementation
	return nil
}

// createInMemoryJekyllStructure creates the Jekyll directory structure in memory
func (p *GitHubPagesPublisher) createInMemoryJekyllStructure(fs billy.Filesystem) error {
	// Create directory structure
	dirs := []string{
		"_layouts",
		"_includes",
		"_sass",
		"assets/css",
		"assets/js",
		"assets/images",
	}

	for _, dir := range dirs {
		if err := fs.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("failed to create directory %s: %w", dir, err)
		}
	}

	// Create essential files
	return p.createInMemoryEssentialFiles(fs)
}

// createInMemoryEssentialFiles creates essential Jekyll files in memory
func (p *GitHubPagesPublisher) createInMemoryEssentialFiles(fs billy.Filesystem) error {
	// Create _config.yml
	configFile, err := fs.Create("_config.yml")
	if err != nil {
		return fmt.Errorf("failed to create _config.yml: %w", err)
	}
	defer configFile.Close()

	configContent := p.generateJekyllConfig()
	if _, err := configFile.Write([]byte(configContent)); err != nil {
		return fmt.Errorf("failed to write _config.yml: %w", err)
	}

	// Create default layout
	layoutFile, err := fs.Create("_layouts/default.html")
	if err != nil {
		return fmt.Errorf("failed to create default layout: %w", err)
	}
	defer layoutFile.Close()

	layoutContent := p.generateDefaultLayout()
	if _, err := layoutFile.Write([]byte(layoutContent)); err != nil {
		return fmt.Errorf("failed to write default layout: %w", err)
	}

	// Create index.md
	indexFile, err := fs.Create("index.md")
	if err != nil {
		return fmt.Errorf("failed to create index.md: %w", err)
	}
	defer indexFile.Close()

	indexContent := p.generateInitialIndex()
	if _, err := indexFile.Write([]byte(indexContent)); err != nil {
		return fmt.Errorf("failed to write index.md: %w", err)
	}

	return nil
}

// convertAndSaveWikiPageInMemory converts a wiki page to Jekyll format and saves it in memory
func (p *GitHubPagesPublisher) convertAndSaveWikiPageInMemory(fs billy.Filesystem, page *WikiPage) error {
	// Generate Jekyll front matter
	frontMatter := p.generateJekyllFrontMatter(page)

	// Combine front matter and content
	fullContent := frontMatter + "\n" + page.Content

	// Generate filename
	filename := p.wikiPageToJekyllFilename(page.Filename)

	// Create and write file
	file, err := fs.Create(filename)
	if err != nil {
		return fmt.Errorf("failed to create file %s: %w", filename, err)
	}
	defer file.Close()

	if _, err := file.Write([]byte(fullContent)); err != nil {
		return fmt.Errorf("failed to write file %s: %w", filename, err)
	}

	return nil
}

// convertAndSaveWikiPage converts a wiki page to Jekyll format and saves it
func (p *GitHubPagesPublisher) convertAndSaveWikiPage(page *WikiPage) error {
	// Generate Jekyll front matter
	frontMatter := p.generateJekyllFrontMatter(page)

	// Combine front matter and content
	jekyllContent := frontMatter + "\n" + page.Content

	// Determine output filename
	filename := p.wikiPageToJekyllFilename(page.Filename)
	filePath := filepath.Join(p.workingDir, filename)

	// Write the file
	if err := WriteFileUTF8(filePath, jekyllContent, 0600); err != nil {
		return fmt.Errorf("failed to write Jekyll page %s: %w", filePath, err)
	}

	return nil
}

// generateJekyllFrontMatter generates Jekyll front matter for a wiki page with Japanese metadata
func (p *GitHubPagesPublisher) generateJekyllFrontMatter(page *WikiPage) string {
	// 日本語カテゴリマッピング
	categoryMap := map[string]string{
		"issues":          "課題",
		"strategy":        "戦略",
		"learning":        "学習",
		"troubleshooting": "トラブルシューティング",
		"development":     "開発",
		"ai":              "AI機能",
	}

	japaneseCategory := page.Category
	if mapped, exists := categoryMap[strings.ToLower(page.Category)]; exists {
		japaneseCategory = mapped
	}

	frontMatter := fmt.Sprintf(`---
layout: default
title: "%s"
description: "%s"
lang: ja-JP
generated_at: %s
updated_at: %s
beaver_auto_generated: true
beaver_version: "Phase 2.0"`,
		strings.ReplaceAll(page.Title, `"`, `\"`),
		strings.ReplaceAll(page.Summary, `"`, `\"`),
		time.Now().Format("2006年01月02日 15:04:05"),
		time.Now().Format(time.RFC3339),
	)

	if japaneseCategory != "" {
		frontMatter += fmt.Sprintf(`
category: "%s"
category_en: "%s"`, japaneseCategory, page.Category)
	}

	if len(page.Tags) > 0 {
		frontMatter += "\ntags:"
		for _, tag := range page.Tags {
			// タグも可能であれば日本語化
			japaneseTag := tag
			tagMap := map[string]string{
				"bug":           "バグ",
				"feature":       "機能",
				"enhancement":   "改善",
				"documentation": "ドキュメント",
				"ai":            "AI",
				"analysis":      "分析",
				"strategy":      "戦略",
			}
			if mapped, exists := tagMap[strings.ToLower(tag)]; exists {
				japaneseTag = mapped
			}

			frontMatter += fmt.Sprintf(`
  - "%s"`, japaneseTag)
		}
	}

	// SEO と検索性向上のためのメタデータ
	frontMatter += fmt.Sprintf(`
author: "Beaver AI"
keywords: "Beaver, AI, ナレッジベース, GitHub Issues, %s"
robots: "index, follow"
og_image: "/assets/images/beaver-logo.png"`, japaneseCategory)

	frontMatter += "\n---"
	return frontMatter
}

// wikiPageToJekyllFilename converts wiki page filename to Jekyll filename
func (p *GitHubPagesPublisher) wikiPageToJekyllFilename(wikiFilename string) string {
	// Remove .md extension if present
	name := strings.TrimSuffix(wikiFilename, ".md")

	// Convert to lowercase and replace spaces with hyphens
	name = strings.ToLower(name)
	name = strings.ReplaceAll(name, " ", "-")
	name = strings.ReplaceAll(name, "_", "-")

	// Add .html extension for Jekyll
	return name + ".html"
}

// Commit commits changes to the local repository
func (p *GitHubPagesPublisher) Commit(ctx context.Context, message string) error {
	if !p.isInitialized {
		return NewWikiError(ErrorTypeRepository, "github pages commit",
			nil, "Publisher not initialized", 0,
			[]string{"Call Initialize() first"})
	}

	// Check if there are changes to commit
	status, err := p.gitClient.Status(ctx, p.workingDir)
	if err != nil {
		return fmt.Errorf("failed to get git status: %w", err)
	}

	if status.IsClean {
		fmt.Printf("📝 No changes to commit\n")
		return nil
	}

	// Add all changes to staging
	if err := p.gitClient.Add(ctx, p.workingDir, []string{"."}); err != nil {
		return fmt.Errorf("failed to add changes to git: %w", err)
	}

	// Create commit with Beaver metadata
	commitOptions := NewDefaultCommitOptions()
	if err := p.gitClient.Commit(ctx, p.workingDir, message, commitOptions); err != nil {
		return fmt.Errorf("failed to commit changes: %w", err)
	}

	fmt.Printf("📝 GitHub Pages changes committed: %s\n", message)
	return nil
}

// Push pushes changes to the remote GitHub Pages repository
func (p *GitHubPagesPublisher) Push(ctx context.Context) error {
	if !p.isInitialized {
		return NewWikiError(ErrorTypeRepository, "github pages push",
			nil, "Publisher not initialized", 0,
			[]string{"Call Initialize() first"})
	}

	// Set up push options for GitHub Pages
	pushOptions := &PushOptions{
		Remote:  "origin",
		Branch:  p.config.BranchName,
		Force:   false,
		Timeout: p.config.Timeout,
	}

	// Push changes to remote repository
	if err := p.gitClient.Push(ctx, p.workingDir, pushOptions); err != nil {
		return NewWikiError(ErrorTypeGitOperation, "github pages push",
			err, "Failed to push changes to GitHub Pages", 0,
			[]string{
				"Check GitHub token permissions",
				"Verify branch exists on remote",
				fmt.Sprintf("Branch: %s", p.config.BranchName),
				"Ensure repository allows pushes to this branch",
			})
	}

	fmt.Printf("🚀 GitHub Pages changes pushed successfully to %s branch\n", p.config.BranchName)
	return nil
}

// Pull pulls changes from the remote GitHub Pages repository
func (p *GitHubPagesPublisher) Pull(ctx context.Context) error {
	if !p.isInitialized {
		return NewWikiError(ErrorTypeRepository, "github pages pull",
			nil, "Publisher not initialized", 0,
			[]string{"Call Initialize() first"})
	}

	// Check for uncommitted changes before pulling
	status, err := p.gitClient.Status(ctx, p.workingDir)
	if err != nil {
		return fmt.Errorf("failed to get git status: %w", err)
	}

	if !status.IsClean {
		return NewWikiError(ErrorTypeGitOperation, "github pages pull",
			nil, "Working directory has uncommitted changes", 0,
			[]string{
				"Commit or stash your changes before pulling",
				"Use Commit() method to commit changes",
			})
	}

	// Pull changes from remote repository
	if err := p.gitClient.Pull(ctx, p.workingDir); err != nil {
		return NewWikiError(ErrorTypeGitOperation, "github pages pull",
			err, "Failed to pull changes from GitHub Pages", 0,
			[]string{
				"Check GitHub token permissions",
				"Verify branch exists on remote",
				fmt.Sprintf("Branch: %s", p.config.BranchName),
				"Check internet connectivity",
			})
	}

	fmt.Printf("📥 GitHub Pages changes pulled successfully from %s branch\n", p.config.BranchName)
	return nil
}

// GetStatus returns the current status of the publisher
func (p *GitHubPagesPublisher) GetStatus(ctx context.Context) (*PublisherStatus, error) {
	status := &PublisherStatus{
		IsInitialized: p.isInitialized,
		WorkingDir:    p.workingDir,
		BranchName:    p.config.BranchName,
		RepositoryURL: fmt.Sprintf("https://github.com/%s/%s", p.config.Owner, p.config.Repository),
		LastUpdate:    time.Now(),
	}

	if p.isInitialized {
		// Count pages
		if files, err := filepath.Glob(filepath.Join(p.workingDir, "*.html")); err == nil {
			status.TotalPages = len(files)
		}
	}

	return status, nil
}

// ListPages returns information about all pages
func (p *GitHubPagesPublisher) ListPages(ctx context.Context) ([]*WikiPageInfo, error) {
	if !p.isInitialized {
		return nil, NewWikiError(ErrorTypeRepository, "github pages list",
			nil, "Publisher not initialized", 0,
			[]string{"Call Initialize() first"})
	}

	var pages []*WikiPageInfo

	// Find all HTML files in working directory
	pattern := filepath.Join(p.workingDir, "*.html")
	files, err := filepath.Glob(pattern)
	if err != nil {
		return nil, fmt.Errorf("failed to list pages: %w", err)
	}

	for _, file := range files {
		info, err := os.Stat(file)
		if err != nil {
			continue
		}

		filename := filepath.Base(file)
		title := strings.TrimSuffix(filename, ".html")
		title = strings.ReplaceAll(title, "-", " ")

		// Convert to title case manually to avoid deprecated strings.Title
		words := strings.Fields(title)
		for i, word := range words {
			if len(word) > 0 {
				words[i] = strings.ToUpper(word[:1]) + strings.ToLower(word[1:])
			}
		}
		title = strings.Join(words, " ")

		pageInfo := &WikiPageInfo{
			Title:        title,
			Filename:     filename,
			Size:         info.Size(),
			LastModified: info.ModTime(),
			URL:          fmt.Sprintf("https://%s.github.io/%s/%s", p.config.Owner, p.config.Repository, filename),
		}

		pages = append(pages, pageInfo)
	}

	return pages, nil
}

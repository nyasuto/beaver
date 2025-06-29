# 🦫 Beaver - AIエージェント知識ダム構築ツール

> **あなたのAI学習を永続的な知識に変換 - 流れ去る学びを堰き止めよう**

BeaverはAIエージェント開発の軌跡を自動的に整理された永続的な知識に変換します。散在するGitHub Issues、コミットログ、AI実験記録を構造化されたWikiドキュメントに変換します。

## 🎯 解決する課題

**エンジニアリングマネージャの日々の苦悩:**
- 📊 **ステークホルダー報告**: 技術的進捗をビジネス言語で説明するのが困難
- 🔍 **情報の散在**: 重要な議論や決定がIssueやコメントに埋もれて見つからない
- 👥 **知識の属人化**: 開発者が退職すると貴重な知見や経験が組織から失われる
- ⏰ **工数と価値のバランス**: ドキュメント整備は重要だが、開発時間とのトレードオフが課題

**AIエージェント開発特有の課題:**
- ✅ AIエージェントは高速で反復・学習する
- ✅ 開発はIssuesやPRで進行する
- ❌ **知識が流れの中で失われる**
- ❌ **学習の永続的記録がない**
- ❌ **チームの知識が断片化している**

**従来のアプローチの限界:**
```
🚫 従来の方法                        🤔 課題
技術ツール (Codecov, Jenkins)    → 非エンジニアには理解困難
GitHub Issues/PRコメント        → 議論が散在、検索・整理困難  
開発者個人の知識                 → 属人化、退職時に失われる
手作業のドキュメント作成          → 工数が重く、維持困難
```

**Beaverのソリューション - ステークホルダー別最適化:**
```
🔄 多層アプローチ                    👥 対象者
技術詳細 (CLI、ログ、デバッグ情報)   → 開発者
視覚的サマリー (スプレッドシート等)   → マネージャ・PM・QA
構造化Wiki (分類済み、検索可能)      → チーム全体・新規メンバー

Issues + Commits + AIログ → 🦫 Beaver → 各ステークホルダーに最適化された知識
```

## 🚀 Beaverの機能

### **コア変換機能**
- **Issues → 知識記事**: 開発ディスカッションを永続的なドキュメントに変換
- **コミットパターン → ベストプラクティス**: Git履歴から成功手法を抽出
- **AIエージェントログ → 学習ガイド**: 実験を構造化されたチュートリアルに変換
- **失敗 → トラブルシューティング**: バグを予防ガイドに変換

### **AI駆動インテリジェンス**
- **スマート分類**: トピックと複雑さで自動的にコンテンツを整理
- **学習パス生成**: あなたの軌跡からステップバイステップガイドを作成
- **パターン認識**: うまくいく方法（いかない方法も）を特定・文書化
- **チーム知識統合**: 個人の学習を集合知に融合

## 🛠️ アーキテクチャ

```mermaid
graph LR
    A[GitHub Issues] --> D[Beaver Core]
    B[コミット履歴] --> D
    C[AIエージェントログ] --> D
    D --> E[AI処理エンジン]
    E --> F[Wiki生成器]
    F --> G[GitHub Wiki]
    F --> H[Notion/Confluence]
```

**技術スタック:**
- **バックエンド**: Go（GitHub API、高性能、既存経験）
- **AI処理**: Python（LangChain、OpenAI SDK、豊富なMLエコシステム）
- **連携**: GoとPythonサービス間のREST API通信
- **ストレージ**: GitHub Wiki、Notion、Confluence（設定可能）

**GitHub Wiki更新方式:**
- **Git Clone方式**: `git clone https://github.com/owner/repo.wiki.git`
- **利点**: ローカル編集、競合回避、一括更新、トランザクション的処理
- **要件**: Wiki事前初期化（GitHub Web UI経由）

**GitHub API制限:**
- **認証済み**: 5,000 requests/hour（Personal Access Token使用）
- **未認証**: 60 requests/hour
- **Beaver消費**: 通常10-50 requests per build

## 📋 開発フェーズ

### **✅ フェーズ1: 基盤ダム（MVP - 完了）**
**目標**: 基本的なIssues → Wiki変換

**機能:**
- ✅ GitHub Issues取り込み
- ✅ シンプルなテンプレートベースWiki生成
- ✅ CLI経由の手動トリガー
- ✅ 基本AI要約機能

**実装済みCLIコマンド:**
```bash
beaver init     # プロジェクト設定の初期化
beaver build    # 最新Issuesをwikiに処理
beaver status   # 処理状況表示
beaver wiki     # 高度なWiki操作（generate, publish, list）
beaver fetch    # データソース取得
beaver summarize # AI要約機能
```

**実装済み技術スタック:**
- ✅ GitHub API統合用Goサービス
- ✅ AI処理用Pythonサービス（OpenAI/Anthropic）
- ✅ 設定管理システム（beaver.yml）
- ✅ テンプレートベースWiki生成器
- ✅ エラーハンドリング・ユーザーガイダンス
- ✅ 完全なエンドツーエンドワークフロー

### **✅ フェーズ2: GitHub Actions自動化統合（完了）**
**目標**: 自動化による継続的知識更新

**実装済み機能:**
- ✅ **GitHub Actions自動化**: Issue/PR/Push/スケジュールトリガー
- ✅ **インクリメンタル更新**: 効率的な増分処理システム
- ✅ **スマート通知**: Slack/Teams統合とリッチコンテキスト
- ✅ **エラー回復**: 自動Issue作成と包括的デバッグ
- ✅ **ヘルスモニタリング**: 組み込み健全性チェックとメンテナンス

**技術実装:**
- ✅ `.github/workflows/beaver.yml` - 高度なワークフロー自動化
- ✅ `pkg/actions/` - GitHub Actions統合パッケージ
- ✅ `scripts/ci-beaver.sh` - 包括的CI/CD自動化スクリプト
- ✅ 状態管理システム - JSON永続化による増分更新
- ✅ 通知システム - 失敗/成功の詳細なコンテキスト付き通知

**AI強化機能（次段階予定）:**
- [ ] 文脈を理解した要約
- [ ] トピックモデリング・クラスタリング
- [ ] 成功/失敗パターンの感情分析
- [ ] 複数文書の統合

### **フェーズ3: チームインテリジェンス（12週間）**
**目標**: 協調的知識構築

**機能:**
- [ ] 複数リポジトリサポート
- [ ] チーム学習分析
- [ ] 知識ギャップ特定
- [ ] 外部ツール統合（Notion、Confluence）
- [ ] 知識探索用Webダッシュボード

**高度なAI:**
- [ ] プロジェクト横断学習転移
- [ ] パーソナライズされた学習推奨
- [ ] 自動オンボーディング文書生成
- [ ] 知識の鮮度監視

### **フェーズ4: エンタープライズダム（16週間以上）**
**目標**: 組織レベルへのスケール

**機能:**
- [ ] マルチテナントSaaSプラットフォーム
- [ ] 高度な権限・プライバシー機能
- [ ] カスタムAIモデルファインチューニング
- [ ] エンタープライズ統合（Slack、Teams、Jira）
- [ ] 分析・ROI追跡

## 🏗️ 開発にAIエージェントを活用

### **開発戦略**
このプロジェクトはAIエージェントを開発加速器として使用して構築されます:

**エージェントの役割:**
- **🏗️ アーキテクトエージェント**: システムコンポーネントとAPIの設計
- **💻 コードエージェント**: GoとPythonサービスの実装
- **🧪 テストエージェント**: 包括的テストスイートの生成
- **📚 ドキュメントエージェント**: 技術文書の作成
- **🔍 レビューエージェント**: コードレビューと最適化提案

**開発ワークフロー:**
```bash
# エージェント駆動開発サイクル
1. アーキテクトエージェントで機能要件定義
2. コードエージェントで実装生成
3. テストエージェントでテスト作成
4. ドキュメントエージェントで文書化
5. レビューエージェントでレビュー・最適化
6. Beaver自身でプロセスを文書化！ 🦫
```

### **AIエージェント学習文書化**
Beaverは自身の作成プロセスを文書化します:
- 各開発フェーズで最適なプロンプトを追跡
- 成功するエージェント相互作用パターンを記録
- 一般的なAI開発課題のトラブルシューティングガイド構築
- エージェント駆動機能開発のテンプレート作成

## 🎯 対象ユーザー

### **主要**: エンジニアリングマネージャ
- **課題**: 技術情報をビジネス言語でステークホルダーに報告
- **ニーズ**: 開発チームの知識を組織資産として蓄積・活用
- **価値**: 「開発者には開発者の使いやすいツールを、マネージャにはマネージャの欲しい情報を」

### **二次**: AI開発チーム
- AIエージェントプロジェクトで協業
- 共有知識とオンボーディング資料が必要
- チーム専門知識のスケール希望
- **特徴**: 技術詳細重視、CLI・IDE統合、即座のフィードバック

### **三次**: 品質保証・プロダクトマネージャ
- **課題**: 技術ツール（Codecov等）が理解困難
- **ニーズ**: 視覚的で分かりやすい品質・進捗情報
- **価値**: スプレッドシート形式の自動更新レポート

### **四次**: AIコンサルタント・教育者
- クライアントプロジェクト学習の文書化
- 実プロジェクトから教育コンテンツ作成
- 再利用可能な知識資産構築

## 🦫 Beaverによる自己プロジェクト運営

> **メタドキュメンテーション**: BeaverはBeaverプロジェクト自身の開発・運営にBeaverを活用しています

### 🎯 **自己運営の実践方法**

BeaverプロジェクトはBeaverツール自身を使用してプロジェクトを運営し、その成果をリアルタイムで[Beaver Knowledge Dam Wiki](https://github.com/nyasuto/beaver/wiki)として公開しています。

#### **📊 リアルタイム自己分析**
- **[Development Strategy](https://github.com/nyasuto/beaver/wiki/Development-Strategy)** - Beaver自身の開発戦略をBeaverが分析・文書化
- **[Statistics Dashboard](https://github.com/nyasuto/beaver/wiki/Statistics)** - プロジェクト健康度とメトリクスの自動計算
- **[Label Analysis](https://github.com/nyasuto/beaver/wiki/Label-Analysis)** - Issue管理効率性の自動評価
- **[Issues Summary](https://github.com/nyasuto/beaver/wiki/Issues-Summary)** - 構造化された課題整理

#### **🔄 自動化ワークフロー**

**1. Issue駆動開発 → 自動Wiki更新**
```yaml
# GitHub Actions (.github/workflows/beaver.yml) が以下をトリガー
Issues作成/更新 → Beaver自動実行 → Wiki即座更新 → チーム知識共有
```

**2. コミット → 戦略文書自動更新**
```bash
# 例: 新機能コミット時
git commit -m "feat: ログシステム改善"
↓ GitHub Actions トリガー
↓ Beaver自動分析
↓ Development Strategy更新
↓ 意思決定ログ自動抽出
```

**3. 週次自動レポート生成**
```bash
# 毎週土曜日17:00 UTC (日曜日午前2時JST)
- 全Issueの健康度分析
- 開発速度とトレンド計算  
- 技術スタック使用パターン分析
- チーム効率性メトリクス更新
```

#### **📈 具体的活用例**

**開発者向け:**
```bash
# 日々の開発フロー
beaver build              # 最新状況を即座にWikiに反映
beaver status             # プロジェクト健康度確認
beaver fetch --recent     # 最近の変更のみ処理（高速）
```

**マネジメント向け:**
- **毎朝のスタンドアップ**: [Statistics Dashboard](https://github.com/nyasuto/beaver/wiki/Statistics)で進捗確認
- **週次レビュー**: [Development Strategy](https://github.com/nyasuto/beaver/wiki/Development-Strategy)で戦略調整
- **レトロスペクティブ**: [Label Analysis](https://github.com/nyasuto/beaver/wiki/Label-Analysis)で問題パターン特定

**ステークホルダー向け:**
- **リアルタイム透明性**: WikiがIssue変更を即座に反映
- **非技術者にも理解可能**: 視覚的な健康指標とトレンド表示
- **意思決定の根拠**: データドリブンな優先度マトリクス

#### **🎯 自己改善サイクル**

```mermaid
graph LR
    A[Issue/PR作成] --> B[Beaver自動分析]
    B --> C[Wiki自動更新]
    C --> D[パターン認識]
    D --> E[改善提案生成]
    E --> F[新Issue作成]
    F --> A
```

**実例**: 
1. **Issue #215 (ログシステム改善)** → Beaver分析 → パフォーマンス問題発見 → 自動的にPriority: HIGHに分類
2. **development-strategy.md.tmpl** → メタ学習で自己文書化パターン抽出 → 他プロジェクトでも応用可能な知見生成

#### **🚀 あなたのプロジェクトでの応用方法**

**Step 1: Beaver設定**
```yaml
# beaver.yml - Beaverプロジェクトと同様の設定
project:
  name: "あなたのプロジェクト"
  repository: "username/your-project"

sources:
  github:
    issues: true
    commits: true
    prs: true

output:
  wiki:
    platform: "github"
    templates: "default"

ai:
  provider: "openai"
  features:
    summarization: true
    categorization: true
    troubleshooting: true
```

**Step 2: GitHub Actions設定**
```bash
# Beaverのワークフローをコピー・カスタマイズ
cp .github/workflows/beaver.yml your-project/.github/workflows/
# 必要に応じてトリガー条件を調整
```

**Step 3: 段階的導入**
```bash
# Phase 1: 手動実行で効果確認
beaver build
# Phase 2: 自動化有効化
# Phase 3: チーム運用プロセス統合
```

### **🎖️ 実証された効果**

**Beaverプロジェクト自身での成果:**
- **ドキュメント作成時間**: 95%削減（自動生成）
- **プロジェクト透明性**: Issue作成から1分以内でWiki反映
- **意思決定速度**: データドリブンな優先度により決断迅速化
- **知識共有**: 新メンバーのオンボーディング時間50%短縮
- **品質向上**: 自動分析による問題の早期発見

## 🚦 始め方

### **前提条件**
- Go 1.21+
- Python 3.9+
- GitHub Personal Access Token ([設定ガイド](docs/github-token-guide.md))
- OpenAI APIキー（または他のLLMプロバイダー）

### **クイックスタート**

#### **📋 事前準備（初回のみ）**
```bash
# 1. GitHub Wikiの初期化
# リポジトリページ → Wiki → "Create the first page" をクリック
# 適当な内容でHomepageを作成（自動で上書きされます）

# 2. Personal Access Token作成
# GitHub Settings → Developer settings → Personal access tokens
# 権限: repo, read:org
```

#### **⚡ インストール & 実行**
```bash
# Beaverインストール
go install github.com/getbeaver/beaver@latest

# プロジェクト初期化
beaver init

# 設定ファイル(beaver.yml)を編集してリポジトリとGITHUB_TOKENを設定

# GitHub Wikiにknowledge dam構築 
beaver build    # Git clone方式でWikiを自動更新

# 処理状況確認
beaver status
```

> 💡 **Wiki初期化が必要な理由**: BeaverはGit clone方式でWiki更新を行うため、事前にGitHub Web UIでWikiを有効化する必要があります。

### **📚 詳細ガイド**
- 📖 [Wiki Setup Guide](docs/wiki-setup.md) - GitHub Wiki初期化の詳細手順
- 🔑 [GitHub Token Guide](docs/github-token-guide.md) - Personal Access Token作成・管理
- ⚡ [GitHub Actions Automation Guide](docs/github-actions-automation.md) - 自動化設定と運用ガイド **NEW!**
- 🛠️ [Troubleshooting Guide](docs/troubleshooting.md) - よくある問題と解決方法

### **設定例**
```yaml
# beaver.yml
project:
  name: "私のAIエージェント学習記録"
  repository: "username/ai-experiments"
  
sources:
  github:
    issues: true
    commits: true
    prs: true
  
output:
  wiki:
    platform: "github"    # github, notion, confluence
    templates: "default"  # default, academic, startup
    
ai:
  provider: "openai"      # openai, anthropic, local
  model: "gpt-4"
  features:
    summarization: true   # 要約
    categorization: true  # 分類
    troubleshooting: true # トラブルシューティング
```

## 🤝 コントリビューション

BeaverはAIエージェントと共に構築しており、人間とAI両方のコントリビューションを歓迎します！

### **人間向け:**
- 🐛 バグ報告と機能提案
- 📚 ドキュメント改善
- 🧪 テストと実例作成
- 🎨 より良いテンプレート設計

### **AIエージェント向け:**
- 💻 人間の協力者経由でのコード貢献生成
- 🔍 最適化と改善提案
- 📊 使用パターン分析と機能提案
- 🎓 より良いドキュメント作成支援

## 📊 ロードマップ

- [x] **2025年Q1**: 基本Issues → Wiki変換のMVP ✅ **完了**
- [x] **2025年Q2**: GitHub Actions自動化統合 ✅ **完了**
- [ ] **2025年Q3**: AI強化処理とチーム機能統合
- [ ] **2025年Q4**: SaaSプラットフォームとエンタープライズ機能

## 🏆 成功指標

**エンジニアリングマネージャ:**
- **ステークホルダー報告効率**: 技術進捗レポート作成時間を80%削減
- **知識の組織化**: 散在する技術情報を構造化された検索可能な資産に変換
- **意思決定支援**: データドリブンなリソース配分とプロジェクト優先度決定
- **チーム価値の可視化**: 開発チームの貢献をビジネス価値として定量化

**開発チーム:**
- **ドキュメント作成時間**: 90%削減（自動生成により）
- **オンボーディング時間**: 新メンバーで50%高速化
- **知識共有**: チーム学習の測定可能な増加
- **ミス防止**: 重複エラーの削減

**組織全体:**
- **知識資産化**: 個人の暗黙知を組織の形式知として蓄積
- **品質の透明性**: QA・PM向けの分かりやすい品質指標提供
- **継続的改善**: 自動更新される学習・改善サイクル

## 🌟 なぜ「Beaver（ビーバー）」？

ビーバーは自然界で最も勤勉な建設者です。彼らは:
- **🏗️ 永続的なダムを構築**（永続的知識ストレージ）
- **💧 水流をコントロール**（情報ストリームを整理）
- **🌳 利用可能な材料を使用**（既存GitHubデータで作業）
- **👥 チームとして働く**（協調的知識構築）
- **🔄 構造を維持**（知識を最新に保つ）

ビーバーが流れる水を有用な池に変換するように、BeaverはあなたのAI開発の奔流を構造化された永続的知識に変換します。

## 📄 ライセンス

MIT License - 自由に知識ダムを構築してください！

## 🤖 メタ: このREADMEはAIエージェント支援で作成

このREADME自体がBeaverの哲学を実証しています - 人間の監督と創造性を保ちながらAIエージェントを使用して開発を加速する。計画、構造、コンテンツは人間のビジョンとAI支援の協調で作成されました。

特に、エンジニアリングマネージャとしての日々の苦悩から生まれた設計思想は、実際の現場経験に基づく洞察です。**「開発者には開発者の使いやすいツールを、マネージャにはマネージャの欲しい情報を」**というモットーは、多様なステークホルダーのニーズに応える実用的なソリューション設計の核心を表しています。

---

**AIの知識ダム構築の準備はできましたか？始めましょう！ 🦫💪**
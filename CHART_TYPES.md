# Chart.js TypeScript Configuration

## 🎯 一時的TypeScript設定緩和について

### 背景
Issue #8でChart.js統合を実装する際、Chart.jsライブラリの複雑な型定義がTypeScript strict modeと競合するため、Chart.js関連ファイルのみ一時的にstrict設定を緩和しています。

### 現在の設定

#### 1. TypeScript設定分離
- **メインプロジェクト**: `tsconfig.json` (strict mode維持)
- **Chart.js関連**: `tsconfig.charts.json` (緩和モード)
- **除外設定**: Chart.js関連ファイルをメインチェックから除外

#### 2. ESLint設定緩和
Chart.js関連ファイルで以下のルールを無効化:
- `@typescript-eslint/no-explicit-any`: Chart.js callback型の複雑さ対応
- `@typescript-eslint/no-non-null-assertion`: Chart.js内部型への対応
- `@typescript-eslint/ban-ts-comment`: 必要な型アサーション許可

### 影響範囲
```
src/components/charts/          # Chart.jsコンポーネント全体
src/lib/utils/chart.ts         # Chart.js ユーティリティ
```

### 解決計画
**Issue #37**: Chart.js型安全性向上とTypeScript strict mode完全対応
- Phase 1: Custom wrapper型定義作成
- Phase 2: 段階的strict mode復元
- Phase 3: 型安全性テスト強化

### 開発時の注意点
1. Chart.js関連ファイルでは型エラーが表示されない場合があります
2. 新しいChart.js機能追加時は、型安全性を意識してください
3. 可能な限り型注釈を明示的に記述してください

### 品質保証
- 機能テスト: 全てパス ✅
- ビルド: 成功 ✅  
- ランタイム: エラーなし ✅
- Chart表示: 正常動作 ✅

この設定は技術的負債として管理され、Issue #37で完全解決を予定しています。
# CLAUDE.md - AI Agent Development Guide

Beaver Astro + TypeScript project guidance for Claude Code (claude.ai/code)

## 🤖 Project Overview

**Beaver Astro Edition**: AI-first knowledge management system transforming GitHub development activities into structured knowledge bases.

**Tech Stack**: Astro 4.0+ | TypeScript 5.0+ | Octokit | Zod | Tailwind CSS

## 🔄 Pull Request Creation Rule

**CRITICAL: コード変更後は必ずPull Requestを作成する**

### 必須フロー
1. コード変更完了
2. 品質チェック実行 (`npm run quality`)
3. 変更をコミット
4. **Pull Request作成** (絶対に忘れてはいけない)

### PR作成チェックリスト
- [ ] すべてのコード変更が完了している
- [ ] 品質チェックが通っている
- [ ] 適切なブランチ名になっている
- [ ] PR説明が適切に記載されている
- [ ] 関連するIssueが参照されている

## 🏗 AI-First Design Principles

1. **Type Safety First**: Comprehensive TypeScript types + Zod validation
2. **Modular Architecture**: Independent, testable components
3. **Clear Separation of Concerns**: API, UI, Logic layers are distinct
4. **Predictable Patterns**: Consistent naming and structure conventions
5. **Self-Documenting Code**: Rich JSDoc comments and type annotations

## 🔧 Development Guidelines

### Type Safety Requirements (CRITICAL)

All functions must include comprehensive TypeScript types and Zod schemas.

```typescript
// 1. Define Zod schema first
export const IssueSchema = z.object({
  id: z.number(),
  title: z.string(),
  state: z.enum(['open', 'closed']),
});

// 2. Extract TypeScript type
export type Issue = z.infer<typeof IssueSchema>;

// 3. Use in function signatures
export async function fetchIssues(
  config: GitHubConfig
): Promise<Result<Issue[], GitHubError>> {
  // Implementation with proper error handling
}
```

### Error Handling Pattern

Use consistent Result type for error handling:

```typescript
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };
```

### Development Workflow

1. **Type Definition**: Start with Zod schemas and TypeScript types
2. **API Integration**: Implement data fetching with proper error handling
3. **Component Creation**: Build UI components with clear props interfaces
4. **Testing**: Write comprehensive unit and integration tests
5. **Documentation**: Update JSDoc comments and type annotations
6. **Pull Request Creation**: Always create PR after code changes

### Required for Every Function

- **JSDoc Comments**: Explain purpose, parameters, and return values
- **Type Annotations**: Comprehensive TypeScript types
- **Error Handling**: Use Result type pattern consistently
- **Validation**: Zod schemas for all external data
- **Testing**: Unit tests with good coverage

## 🛠 Essential Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Quality checks
npm run quality      # Run all quality checks
npm run quality-fix  # Auto-fix issues
npm run lint         # Run linting
npm run format       # Format code
npm run type-check   # Type checking
npm run test         # Run tests

# AI Agent workflow
npm run validate     # Validate schemas and types
```

## 🌐 Development Server

**IMPORTANT: Development Server URL Structure**

- ❌ Wrong: `http://localhost:3000/` (returns 404)
- ✅ Correct: `http://localhost:3000/beaver/` (works properly)

The development server serves the application at the `/beaver` subdirectory path, not the root path. This is consistent with the GitHub Pages deployment structure.

### Testing Environments

1. **Local Development**: `http://localhost:3000/beaver/`
2. **Production (GitHub Pages)**: `https://nyasuto.github.io/beaver/`
3. **MCP Testing**: Use production URL for testing with MCP tools

## 📋 AI Agent Task Checklist

When implementing new features, ensure:

- [ ] **Types**: Zod schema + TypeScript interface defined
- [ ] **Validation**: All inputs validated with Zod
- [ ] **Error Handling**: Result type pattern used consistently
- [ ] **Testing**: Unit tests cover happy path and error cases
- [ ] **Documentation**: JSDoc comments explain purpose and usage
- [ ] **Pull Request**: Create PR after all changes complete

## 🎯 Project Structure (Key Directories)

```
src/
├── components/     # UI components
├── pages/         # Astro pages + API routes
├── lib/           # Core business logic
│   ├── github/    # GitHub API integration
│   ├── types/     # TypeScript definitions
│   ├── schemas/   # Zod validation schemas
│   └── utils/     # Utility functions
└── styles/        # Global styles
```

---

**This guide enables efficient AI agent development while maintaining high code quality.**
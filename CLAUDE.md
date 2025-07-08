# CLAUDE.md - AI Agent Development Guide

This file provides comprehensive guidance for Claude Code (claude.ai/code) when working with the Beaver Astro + TypeScript project.

## 🤖 Project Overview

**Beaver Astro Edition** is an AI-first knowledge management system that transforms GitHub development activities into structured, persistent knowledge bases. Built with modern web technologies and designed for AI Agent development.

### Core Mission
Transform flowing development streams into structured knowledge bases, preventing valuable insights from being lost while leveraging AI agents for rapid development and maintenance.

## 🏗 Architecture Principles

### AI-First Design Philosophy
The project is designed from the ground up to be AI agent-friendly:

1. **Type Safety First**: Comprehensive TypeScript types + Zod validation
2. **Modular Architecture**: Independent, testable components
3. **Clear Separation of Concerns**: API, UI, Logic layers are distinct
4. **Predictable Patterns**: Consistent naming and structure conventions
5. **Self-Documenting Code**: Rich JSDoc comments and type annotations

## 🎯 Technology Stack

### Core Technologies
- **Astro 4.0+**: Static site generation with Islands Architecture
- **TypeScript 5.0+**: Strict type checking enabled
- **Octokit**: GitHub API integration (`@octokit/rest`, `@octokit/auth-app`)
- **Zod**: Runtime type validation and schema definition
- **Tailwind CSS**: Utility-first styling

### Supporting Libraries
- **Chart.js**: Data visualization
- **date-fns**: Date manipulation utilities
- **gray-matter**: Frontmatter parsing
- **remark/rehype**: Markdown processing
- **sharp**: Image optimization

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (Button, Card, etc.)
│   ├── charts/         # Data visualization components
│   ├── navigation/     # Navigation-related components
│   └── layouts/        # Page layout components
├── pages/              # Astro pages (file-based routing)
│   ├── index.astro     # Homepage
│   ├── issues/         # Issues-related pages
│   ├── analytics/      # Analytics dashboard
│   └── api/            # API endpoints
├── lib/                # Core business logic
│   ├── github/         # GitHub API integration
│   ├── types/          # TypeScript type definitions
│   ├── schemas/        # Zod validation schemas
│   ├── analytics/      # Data analysis logic
│   ├── config/         # Configuration management
│   └── utils/          # Utility functions
├── styles/             # Global styles and Tailwind config
└── data/               # Static data and content
```

## 🔧 Development Guidelines for AI Agents

### 1. Type Safety Requirements

**CRITICAL**: All functions must include comprehensive TypeScript types and Zod schemas.

#### Example Pattern:
```typescript
// 1. Define Zod schema first
export const IssueSchema = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string(),
  body: z.string().optional(),
  state: z.enum(['open', 'closed']),
  labels: z.array(LabelSchema),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
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

### 2. Error Handling Pattern

Use a consistent Result type for error handling:

```typescript
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// Example usage
export async function safeApiCall<T>(
  operation: () => Promise<T>
): Promise<Result<T>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}
```

### 3. Component Development Standards

#### Astro Components (.astro files)
```astro
---
// Script section - Server-side TypeScript
import type { ComponentProps } from 'astro/types';
import { IssueCard } from '../components/ui/IssueCard';
import { validateProps } from '../lib/utils/validation';

interface Props {
  title: string;
  issues: Issue[];
  className?: string;
}

const { title, issues, className = '' } = Astro.props;
const validatedProps = validateProps(Astro.props, PropsSchema);
---

<!-- Template section - HTML with Astro syntax -->
<div class={`page-container ${className}`}>
  <h1 class="text-2xl font-bold">{title}</h1>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {issues.map((issue) => (
      <IssueCard key={issue.id} issue={issue} />
    ))}
  </div>
</div>

<style>
  /* Scoped styles if needed */
  .page-container {
    @apply container mx-auto px-4 py-8;
  }
</style>
```

#### React Components (for Islands)
```typescript
import React from 'react';
import type { FC } from 'react';
import { z } from 'zod';

const ChartPropsSchema = z.object({
  data: z.array(z.number()),
  labels: z.array(z.string()),
  title: z.string(),
});

type ChartProps = z.infer<typeof ChartPropsSchema>;

/**
 * Interactive chart component for data visualization
 * This is a client-side component (Astro Island)
 */
export const InteractiveChart: FC<ChartProps> = ({ data, labels, title }) => {
  // Client-side React logic here
  return (
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      {/* Chart implementation */}
    </div>
  );
};
```

### 4. API Development Pattern

#### API Routes (src/pages/api/*)
```typescript
// src/pages/api/issues.ts
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { fetchGitHubIssues } from '../../lib/github/issues';
import { GitHubConfigSchema } from '../../lib/schemas/github';

const QuerySchema = z.object({
  owner: z.string(),
  repo: z.string(),
  state: z.enum(['open', 'closed', 'all']).default('open'),
  per_page: z.coerce.number().min(1).max(100).default(30),
});

export const GET: APIRoute = async ({ request, url }) => {
  try {
    // Parse and validate query parameters
    const params = Object.fromEntries(url.searchParams);
    const query = QuerySchema.parse(params);
    
    // Fetch data with proper error handling
    const result = await fetchGitHubIssues(query);
    
    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify(result.data),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid request parameters' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

### 5. Configuration Management

#### Main Configuration
```typescript
// config/beaver.config.ts
import { z } from 'zod';

export const BeaverConfigSchema = z.object({
  github: z.object({
    owner: z.string(),
    repo: z.string(),
    token: z.string(),
    baseUrl: z.string().url().default('https://api.github.com'),
  }),
  site: z.object({
    title: z.string(),
    description: z.string(),
    baseUrl: z.string().url(),
  }),
  analytics: z.object({
    enabled: z.boolean().default(true),
    metricsCollection: z.array(z.string()),
  }),
  ai: z.object({
    classificationRules: z.string(),
    categoryMapping: z.string(),
  }),
});

export type BeaverConfig = z.infer<typeof BeaverConfigSchema>;

export const defineConfig = (config: BeaverConfig): BeaverConfig => {
  return BeaverConfigSchema.parse(config);
};
```

### 6. Testing Requirements

#### Unit Test Pattern
```typescript
// lib/__tests__/github-api.test.ts
import { describe, it, expect, vi } from 'vitest';
import { fetchGitHubIssues } from '../github/issues';
import type { GitHubConfig } from '../types/github';

describe('GitHub API Integration', () => {
  const mockConfig: GitHubConfig = {
    owner: 'test-owner',
    repo: 'test-repo',
    token: 'test-token',
  };

  it('should fetch issues successfully', async () => {
    // Mock implementation
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { id: 1, number: 1, title: 'Test Issue', state: 'open' }
      ]),
    });
    
    global.fetch = mockFetch;
    
    const result = await fetchGitHubIssues(mockConfig);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Test Issue');
    }
  });

  it('should handle API errors gracefully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });
    
    global.fetch = mockFetch;
    
    const result = await fetchGitHubIssues(mockConfig);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('404');
    }
  });
});
```

## 🚀 Development Workflow for AI Agents

### 1. Feature Development Process

1. **Type Definition**: Start with Zod schemas and TypeScript types
2. **API Integration**: Implement data fetching with proper error handling
3. **Component Creation**: Build UI components with clear props interfaces
4. **Testing**: Write comprehensive unit and integration tests
5. **Documentation**: Update JSDoc comments and type annotations

### 2. Code Quality Standards

#### Required for Every Function:
- **JSDoc Comments**: Explain purpose, parameters, and return values
- **Type Annotations**: Comprehensive TypeScript types
- **Error Handling**: Use Result type pattern consistently
- **Validation**: Zod schemas for all external data
- **Testing**: Unit tests with good coverage

#### Example:
```typescript
/**
 * Fetches and processes GitHub issues for knowledge base generation
 * 
 * @param config - GitHub repository configuration
 * @param options - Fetching options (pagination, filtering)
 * @returns Promise resolving to processed issues or error
 * 
 * @example
 * ```typescript
 * const result = await processGitHubIssues(config, { state: 'open' });
 * if (result.success) {
 *   console.log(`Processed ${result.data.length} issues`);
 * }
 * ```
 */
export async function processGitHubIssues(
  config: GitHubConfig,
  options: IssueProcessingOptions = {}
): Promise<Result<ProcessedIssue[], GitHubError>> {
  // Implementation with comprehensive error handling
}
```

### 3. Performance Considerations

- **Static Generation**: Prefer static generation over SSR when possible
- **Island Hydration**: Only hydrate interactive components
- **Image Optimization**: Use Astro's built-in image optimization
- **Bundle Splitting**: Leverage Astro's automatic code splitting

### 4. Security Guidelines

- **Environment Variables**: All sensitive data in `.env` files
- **Input Validation**: Zod validation for all user inputs
- **API Security**: Rate limiting and proper error responses
- **Content Security**: Sanitize any user-generated content

## 🛠 Essential Commands for AI Development

### Development Commands
```bash
# Start development server with hot reload
npm run dev

# Type checking (run frequently during development)
npm run type-check

# Linting and formatting
npm run lint
npm run format

# Testing
npm run test
npm run test:watch
npm run test:coverage

# Build for production
npm run build

# Preview production build
npm run preview
```

### AI Agent Workflow Commands
```bash
# Validate all schemas and types
npm run validate

# Generate type documentation
npm run docs:types

# Check bundle size and performance
npm run analyze

# Deploy to GitHub Pages
npm run deploy
```

## 📋 AI Agent Task Checklist

When implementing new features, ensure:

- [ ] **Types**: Zod schema + TypeScript interface defined
- [ ] **Validation**: All inputs validated with Zod
- [ ] **Error Handling**: Result type pattern used consistently
- [ ] **Testing**: Unit tests cover happy path and error cases
- [ ] **Documentation**: JSDoc comments explain purpose and usage
- [ ] **Performance**: Consider static vs dynamic rendering
- [ ] **Accessibility**: Components follow WCAG guidelines
- [ ] **Mobile**: Responsive design implemented
- [ ] **SEO**: Meta tags and structured data included

## 🔍 Debugging and Troubleshooting

### Common Issues and Solutions

1. **Type Errors**: Check Zod schema alignment with TypeScript types
2. **Hydration Issues**: Ensure client-side components are properly marked
3. **Build Failures**: Verify all imports and exports are correct
4. **API Errors**: Check GitHub token permissions and rate limits

### Debug Logging Pattern
```typescript
const DEBUG = import.meta.env.DEV;

export const logger = {
  debug: (...args: any[]) => DEBUG && console.log('[DEBUG]', ...args),
  info: (...args: any[]) => console.log('[INFO]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
};
```

## 🎯 Success Metrics for AI Development

Track these metrics to ensure successful AI agent development:

- **Type Coverage**: >95% of code should be typed
- **Test Coverage**: >90% line coverage for critical paths
- **Build Performance**: <30s build time for incremental builds
- **Bundle Size**: <200KB for main bundle
- **Lighthouse Score**: >90 for performance, accessibility, SEO

## 📚 Additional Resources

### Essential Documentation
- [Astro Documentation](https://docs.astro.build/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Zod Documentation](https://zod.dev/)
- [Octokit Documentation](https://octokit.github.io/rest.js/)

### Code Examples
- Example components: `src/components/examples/`
- API route examples: `src/pages/api/examples/`
- Test examples: `src/__tests__/examples/`

---

**This guide is designed to enable efficient AI agent development while maintaining high code quality and system reliability.**
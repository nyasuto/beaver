# Repository Guidelines

## Project Structure & Module Organization
- Source: `src/` (features under `components/`, server routes in `pages/api/`, domain logic in `lib/`, data seeds/fixtures in `data/`).
- Tests: Unit tests colocated under `__tests__` folders (e.g., `src/pages/api/__tests__/…`). Integration and E2E live in `src/__tests__/integration` and `src/__tests__/e2e`.
- Assets: Static files in `public/`; build output in `dist/`.
- Config: `astro.config.mjs`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.js`, `tailwind.config.mjs`.

## Build, Test, and Development Commands
- Dev server: `npm run dev` (or `make dev`) — start Astro at `http://localhost:4321`.
- Build: `npm run build` (or `make build`) — production build to `dist/`.
- Preview: `npm run preview` — serve built site locally.
- Quality: `npm run quality` (or `make quality`) — lint, format check, type-check, unit tests.
- Tests: `npm test` (unit), `npm run test:coverage`, `npm run test:e2e` (Playwright), `npm run test:all`.
- Type check: `npm run type-check`.
- Lint/Format: `npm run lint`, `npm run lint:fix`, `npm run format`.
- Data fetch: `npm run fetch-data` — populate docs/github data used by pages.

## Coding Style & Naming Conventions
- TypeScript-first; 2-space indentation; LF line endings; Prettier enforces: single quotes, 100-char width (80 for Markdown), trailing commas where valid.
- Linting via ESLint with TypeScript, React, Astro, and a11y plugins; React hooks rules enabled.
- File naming: use `kebab-case` for `.astro` and `.tsx` components; colocate tests in `__tests__` using `*.test.ts(x)`.
- Keep UI in `components/`, API handlers in `pages/api/`, reusable logic in `lib/`.

## Testing Guidelines
- Unit tests: Vitest with `happy-dom` (see `vitest.config.ts`). Minimum global coverage: 80% (branches, lines, functions, statements).
- E2E: Playwright in `src/__tests__/e2e` with multi-browser matrix. Use `npm run test:e2e` (dev server auto-starts).
- Prefer fast unit tests for logic; add integration tests for API routes; name suites clearly (e.g., `DocsService.test.ts`).

## Commit & Pull Request Guidelines
- Conventional commits: `feat:`, `fix:`, `refactor:`, `build(deps):`, etc. Reference issues/PRs when applicable (e.g., `(#385)`).
- PRs should include: concise description, linked issues, test evidence (coverage or Playwright report), and screenshots for UI changes.
- Run `make pr-ready` before opening PR (auto-fix + build).

## Security & Configuration
- Environment: Node >= 18. Configure secrets in `.env` (see `.env.example`); never commit real tokens. For quality dashboards, set Codecov token if used.
- Git hooks: `make git-hooks` installs a pre-commit that runs quality checks.

# Development Commands

## Essential Commands

### Development Server
```bash
npm run dev          # Start development server at http://localhost:3000/beaver/
npm run start        # Alias for npm run dev
npm run preview      # Preview production build
```

**IMPORTANT**: Development server runs at `/beaver/` subdirectory, not root (`http://localhost:3000/beaver/`)

### Build Commands
```bash
npm run build        # Build for production
npm run build:full   # Fetch data + build
npm run prebuild     # Fetch GitHub data (runs automatically before build)
npm run postbuild    # Validate version (runs automatically after build)
```

### Quality Assurance (CRITICAL)
```bash
npm run quality      # Run ALL quality checks (lint + format + type-check + test)
npm run quality-fix  # Auto-fix linting and formatting issues
npm run lint         # Run ESLint
npm run lint:fix     # Auto-fix linting issues
npm run format       # Format code with Prettier
npm run format:check # Check code formatting
npm run type-check   # TypeScript type checking
```

### Testing
```bash
npm run test         # Run unit tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run test:integration # Run integration tests
npm run test:e2e     # Run end-to-end tests (Playwright)
npm run test:all     # Run all tests (unit + integration + e2e)
```

### Data Management
```bash
npm run fetch-data   # Fetch GitHub data
npm run validate     # Validate schemas and types (alias for quality)
```

### Analysis
```bash
npm run analyze      # Analyze bundle size
```

### Deployment
```bash
npm run deploy       # Build and deploy to GitHub Pages
```

## Quality Workflow
**ALWAYS run `npm run quality` before committing changes** - this ensures code passes all quality checks (linting, formatting, type checking, and tests).
# Beaver Astro Frontend

This is the Astro-based frontend for the Beaver knowledge base generator.

## Phase 0 Implementation

This is the Phase 0 implementation of the Go + Astro hybrid architecture:

- **Go backend**: Handles GitHub API integration and data processing
- **Astro frontend**: Provides modern UI with React components and Tailwind CSS
- **Static deployment**: Optimized for GitHub Pages

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Architecture

- `src/pages/` - Astro pages
- `src/layouts/` - Reusable layouts
- `src/components/` - React components
- `src/types/` - TypeScript type definitions
- `src/data/` - JSON data from Go backend

## Integration

The Go backend exports data to `src/data/beaver.json` which is then consumed by the Astro frontend for static site generation.
# Code Style and Conventions

## Type Safety Requirements (CRITICAL)
All functions must include comprehensive TypeScript types and Zod schemas.

### Pattern: Define Zod Schema First
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

## Error Handling Pattern
Use consistent Result type for error handling:
```typescript
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };
```

## Required for Every Function
- **JSDoc Comments**: Explain purpose, parameters, and return values
- **Type Annotations**: Comprehensive TypeScript types
- **Error Handling**: Use Result type pattern consistently
- **Validation**: Zod schemas for all external data
- **Testing**: Unit tests with good coverage

## TypeScript Configuration
- Strict mode enabled with additional strict settings
- `noUncheckedIndexedAccess`: true
- `noImplicitReturns`: true
- `noImplicitOverride`: true
- Path aliases configured (@/, @/components/, @/lib/, etc.)

## ESLint Rules
- TypeScript strict rules with some temporary disabled rules for Zod v4 upgrade
- React hooks rules enforced
- JSX accessibility warnings
- No console/debugger in production (except for debugging in specific components)

## Code Organization
- Modular architecture with clear separation of concerns
- API, UI, and Logic layers are distinct
- Consistent naming and structure conventions
- Self-documenting code with rich JSDoc comments

## File Structure
- Use absolute imports with path aliases
- Group related functionality in modules
- Separate concerns (API, UI, business logic)
- Test files co-located with source files in `__tests__` directories
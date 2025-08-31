# Task Completion Workflow

## CRITICAL: Git Workflow Rules

### Absolute Rules
- **NEVER commit directly to main branch**
- **NEVER merge PRs automatically** - Human must approve and merge ALL PRs
- Always create feature branches for changes
- Create Pull Requests for ALL changes, regardless of size

### Required Workflow Steps
1. **Create feature branch** from main
2. **Make changes** following code style conventions
3. **Run quality checks**: `npm run quality` (MANDATORY)
4. **Commit with conventional format**
5. **Push branch to remote**
6. **Create Pull Request** (MANDATORY after any code changes)
7. **Wait for human review and merge** (Claude MUST NOT merge)

### Branch Naming Convention
- Feature: `feat/issue-X-feature-name`
- Bug fix: `fix/issue-X-description`
- Hotfix: `hotfix/X-description`
- Docs: `docs/X-description`
- CI/CD: `ci/X-description`

## Quality Assurance Checklist
Before completing any task:
- [ ] **Types**: Zod schema + TypeScript interface defined
- [ ] **Validation**: All inputs validated with Zod
- [ ] **Error Handling**: Result type pattern used consistently
- [ ] **Testing**: Unit tests cover happy path and error cases
- [ ] **Documentation**: JSDoc comments explain purpose and usage
- [ ] **Quality Check**: `npm run quality` passes
- [ ] **Pull Request**: Create PR after all changes complete

## GitHub Operations Restrictions
### ✅ Claude Can Do:
- Create PRs using `gh pr create`
- Create releases
- Create Issues
- Create branches
- Create commits and push
- Check CI/CD status (reporting only)

### ❌ Claude MUST NEVER Do:
- Merge Pull Requests (`gh pr merge`)
- Close Issues
- Delete branches

**Reason**: These operations significantly impact project direction and quality, requiring explicit user judgment and approval.

## Development Server Notes
- Local development runs at `http://localhost:3000/beaver/` (not root)
- Production deployment at `https://nyasuto.github.io/beaver/`
- Always test with the correct URL structure
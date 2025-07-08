# Contributing to Beaver Astro Edition

Thank you for your interest in contributing to Beaver Astro Edition! This guide will help you get started with contributing to our AI-first knowledge management system.

## 🤝 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or later
- npm 8.x or later
- Git

### Development Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/beaver.git
   cd beaver
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Set up git hooks**:
   ```bash
   make git-hooks
   ```

5. **Run quality checks**:
   ```bash
   make quality
   ```

6. **Start the development server**:
   ```bash
   make dev
   ```

## 🛠️ Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feat/your-feature-name
```

Branch naming convention:
- `feat/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/updates
- `chore/` - Maintenance tasks

### 2. Make Your Changes

- Follow the existing code style
- Add tests for new functionality
- Update documentation as needed
- Ensure your changes pass all quality checks

### 3. Commit Your Changes

We use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat: add new feature description"
```

Commit types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test additions/updates
- `chore`: Maintenance tasks

### 4. Run Quality Checks

Before pushing, ensure your changes pass all checks:

```bash
make quality
```

This runs:
- ESLint (linting)
- Prettier (formatting)
- TypeScript (type checking)
- Tests (if available)

### 5. Push and Create a Pull Request

```bash
git push origin feat/your-feature-name
```

Create a pull request on GitHub with:
- Clear title and description
- Link to related issues
- Screenshots (if applicable)
- Testing instructions

## 📋 Pull Request Guidelines

### PR Title Format
Use the conventional commit format:
```
feat: add new feature description
```

### PR Description Template
```markdown
## 概要
Brief description of the changes

## 変更内容
- List of changes made
- Technical improvements
- Bug fixes or new features

## テスト
- Testing approach
- Coverage information
- How to test the changes

Closes #issue_number
```

### PR Requirements
- [ ] Code follows the project's style guidelines
- [ ] Self-review of the code has been performed
- [ ] Code has been commented, particularly in hard-to-understand areas
- [ ] Corresponding changes to documentation have been made
- [ ] Changes generate no new warnings
- [ ] Tests have been added for new functionality
- [ ] All tests pass locally
- [ ] Any dependent changes have been merged

## 🧪 Testing

### Running Tests
```bash
make test          # Run all tests
make test-watch    # Run tests in watch mode
make test-coverage # Run tests with coverage
```

### Writing Tests
- Place tests in `src/**/*.test.ts` or `src/**/*.spec.ts`
- Use descriptive test names
- Test both happy path and error cases
- Mock external dependencies

### Test Structure
```typescript
describe('Component/Function Name', () => {
  it('should do something specific', () => {
    // Test implementation
  });
  
  it('should handle error cases', () => {
    // Error handling test
  });
});
```

## 🎨 Code Style

### TypeScript Guidelines
- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use proper type annotations
- Avoid `any` type unless absolutely necessary

### Code Organization
- Keep files focused and small
- Use barrel exports (`index.ts`)
- Follow the established folder structure
- Use meaningful names for variables and functions

### Documentation
- Add JSDoc comments for public APIs
- Include usage examples in documentation
- Update README.md for significant changes
- Document complex logic with inline comments

## 🔍 Code Review Process

### For Contributors
1. Ensure your PR meets all requirements
2. Respond to feedback promptly
3. Make requested changes
4. Keep discussions focused and constructive

### For Reviewers
1. Review code for functionality, style, and security
2. Provide constructive feedback
3. Suggest improvements
4. Approve when ready

## 📚 Development Resources

### Project Structure
```
src/
├── components/     # UI components
├── pages/         # Astro pages
├── lib/           # Core logic
├── styles/        # Global styles
└── data/          # Static data
```

### Key Technologies
- **Astro**: Static site generator
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Zod**: Runtime validation
- **Vitest**: Testing framework

### Useful Commands
```bash
make help          # Show all available commands
make dev           # Start development server
make build         # Build for production
make quality       # Run quality checks
make quality-fix   # Fix quality issues
make pr-ready      # Prepare for PR
```

## 🐛 Reporting Issues

### Before Reporting
1. Check existing issues
2. Ensure you're using the latest version
3. Try to reproduce the issue

### Issue Template
```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g. macOS, Windows, Linux]
- Node.js version: [e.g. 18.17.0]
- npm version: [e.g. 9.6.7]
- Browser: [e.g. Chrome, Firefox, Safari]
```

## 🌟 Feature Requests

We welcome feature requests! Please:
1. Check if the feature already exists
2. Describe the use case
3. Explain the expected behavior
4. Consider the impact on existing functionality

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🎉 Recognition

Contributors will be recognized in:
- GitHub contributors list
- Release notes
- Special mentions for significant contributions

## 📞 Getting Help

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Email**: [hello@beaver.dev](mailto:hello@beaver.dev)

## 🔄 Continuous Integration

Our CI pipeline runs:
- Quality checks on all PRs
- Security scans
- Dependency reviews
- Automated deployments

Make sure your changes pass CI before merging.

---

Thank you for contributing to Beaver Astro Edition! 🦫
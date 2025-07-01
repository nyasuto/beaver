# Beaver Integration Tests (Python)

This directory contains integration tests for Beaver implemented in Python, completely separated from Go unit tests.

## 🎯 Purpose

These tests verify Beaver's **external behavior** and **real-world functionality**:
- CLI command execution with actual binary
- GitHub API interactions with real repositories  
- Site generation with actual output verification
- Error handling with external dependencies

## 🚀 Test Separation Philosophy

**Why Python instead of Go for integration tests?**

1. **Complete Separation**: No risk of `go test ./...` accidentally running slow integration tests
2. **External Interface Focus**: Tests the CLI as users would, without internal Go type dependencies
3. **Rich Testing Ecosystem**: pytest, requests, BeautifulSoup for comprehensive verification
4. **Flexible Verification**: HTML parsing, HTTP testing, file system verification

## 📁 Structure

```
tests/integration/python/
├── requirements.txt          # Python dependencies
├── conftest.py              # pytest configuration and fixtures
├── utils/                   # Test utilities
│   ├── __init__.py
│   ├── beaver_runner.py     # CLI execution helper
│   ├── github_verifier.py   # GitHub API verification
│   └── site_checker.py      # Generated site verification
├── test_cli_workflow.py     # CLI command testing
├── test_github_integration.py # GitHub API integration
├── test_site_generation.py  # Site generation testing
└── README.md               # This file
```

## 🔧 Setup

### Prerequisites

```bash
# 1. Build Beaver binary
make build

# 2. Install Python dependencies  
cd tests/integration/python
pip install -r requirements.txt

# 3. Set environment variables
export GITHUB_TOKEN="your_github_token"
export BEAVER_TEST_REPO_OWNER="nyasuto"    # Optional: default owner
export BEAVER_TEST_REPO_NAME="beaver"      # Optional: default repo
```

### GitHub Token Requirements

The integration tests require a GitHub Personal Access Token with:
- `repo` scope (for accessing repository data)
- `read:org` scope (for organization access if testing org repositories)

## 🧪 Running Tests

### All Integration Tests
```bash
cd tests/integration/python
python -m pytest -v
```

### By Category
```bash
# CLI workflow tests only
python -m pytest test_cli_workflow.py -v

# GitHub API integration only  
python -m pytest test_github_integration.py -v

# Site generation only
python -m pytest test_site_generation.py -v
```

### By Markers
```bash
# Quick tests (exclude slow ones)
python -m pytest -m "not slow" -v

# GitHub API tests only
python -m pytest -m github_api -v

# Slow tests only
python -m pytest -m slow -v
```

### With Coverage and Reports
```bash
# Generate HTML report
python -m pytest --html=report.html --self-contained-html

# Generate JSON report
python -m pytest --json-report --json-report-file=report.json
```

## 🏗️ Makefile Integration

These tests are integrated into the main Makefile:

```bash
# Unit tests only (fast, no external dependencies)
make test-unit

# Integration tests only (slow, requires GitHub token)
make test-integration

# All tests
make test-all
```

## 🧰 Test Utilities

### BeaverRunner
Executes Beaver CLI commands and handles:
- Binary path resolution
- Configuration file management
- Environment variable handling
- Timeout management
- Output parsing

```python
runner = BeaverRunner(beaver_binary, config_path)
success, stdout, stderr = runner.build_wiki(incremental=True)
```

### GitHubVerifier
Verifies GitHub API interactions:
- Token validation
- Repository access verification
- Rate limit management
- API response validation

```python
verifier = GitHubVerifier(github_token)
verification = verifier.verify_repository_access("owner/repo")
```

### SiteChecker
Verifies generated site content:
- HTML structure validation
- CSS asset verification
- Japanese content detection
- GitHub Pages compatibility
- Beaver-specific content verification

```python
checker = SiteChecker("_site")
report = checker.generate_verification_report()
```

## 🎯 Test Categories

### CLI Workflow Tests (`test_cli_workflow.py`)
- Binary existence and execution
- Command-line argument handling
- Configuration file processing
- Error message clarity
- Help and version commands

### GitHub Integration Tests (`test_github_integration.py`)
- GitHub API connectivity
- Repository access verification
- Issue fetching and processing
- Rate limit handling
- Error scenario testing

### Site Generation Tests (`test_site_generation.py`)
- Static site building
- HTML content verification
- CSS asset generation
- GitHub Pages compatibility
- Performance characteristics

## 🚨 Test Markers

- `@pytest.mark.slow` - Tests that take significant time
- `@pytest.mark.github_api` - Tests requiring GitHub API access
- `@pytest.mark.wiki` - Tests involving wiki operations

## 🔧 Configuration

### Environment Variables

- `GITHUB_TOKEN` - Required for GitHub API tests
- `BEAVER_TEST_REPO_OWNER` - Test repository owner (default: nyasuto)
- `BEAVER_TEST_REPO_NAME` - Test repository name (default: beaver)
- `BEAVER_INTEGRATION_TESTS` - Not needed (Python tests are independent)

### Test Repository

Tests use a configurable test repository:
- Default: `nyasuto/beaver` (the Beaver project itself)
- Must be accessible with provided GitHub token
- Should have some issues for meaningful testing

## 🔍 Debugging

### Verbose Output
```bash
python -m pytest -v -s  # -s shows print statements
```

### Failed Test Details
```bash
python -m pytest --tb=long  # Detailed tracebacks
```

### Specific Test
```bash
python -m pytest test_cli_workflow.py::TestCLIWorkflow::test_beaver_version_command -v
```

### Log Analysis
```bash
# Check generated artifacts
ls -la _site/
cat .beaver/ci-beaver.log
```

## 🚀 CI/CD Integration

These tests integrate with GitHub Actions:

```yaml
- name: Run Integration Tests
  if: env.GITHUB_TOKEN != ''
  run: |
    cd tests/integration/python
    python -m pytest -v --json-report --json-report-file=integration-results.json
```

## 🛠️ Adding New Tests

### New Test File
1. Create `test_new_feature.py`
2. Import utilities: `from utils import BeaverRunner, GitHubVerifier, SiteChecker`
3. Add appropriate markers
4. Use fixtures for setup/teardown

### New Utility
1. Add to `utils/` directory
2. Import in `utils/__init__.py`
3. Follow external interface testing pattern
4. Focus on verification, not internal implementation

## 📊 Performance Expectations

- **Quick tests** (<30s): CLI commands, basic verification
- **Medium tests** (30s-2min): GitHub API interactions, small builds
- **Slow tests** (2min+): Full site generation, large content processing

## 🤝 Contributing

When adding integration tests:

1. **Focus on external behavior** - Test what users see, not internal implementation
2. **Use appropriate markers** - Mark slow tests appropriately
3. **Handle errors gracefully** - Tests should not crash on external failures
4. **Clean up resources** - Use fixtures for file cleanup
5. **Document expectations** - Clear test names and assertions

## 📋 Troubleshooting

### Common Issues

**Tests skip with "GitHub token required"**
- Set `GITHUB_TOKEN` environment variable
- Verify token has required permissions

**Tests fail with rate limit errors**
- Wait for rate limit reset
- Use a different GitHub token
- Reduce test parallelism

**Binary not found errors**
- Run `make build` first
- Check binary path in test output

**Site generation fails**
- Check disk space
- Verify write permissions
- Check for conflicting files

### Getting Help

1. Check test output for specific error messages
2. Verify environment variable setup
3. Test GitHub connectivity manually
4. Check Beaver configuration file validity
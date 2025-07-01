"""
pytest configuration for Beaver integration tests
"""

import os
import shutil
import subprocess
import tempfile
from pathlib import Path

import pytest


def pytest_configure(config):
    """Configure pytest markers and settings"""
    config.addinivalue_line("markers", "slow: mark test as slow running")
    config.addinivalue_line("markers", "github_api: mark test as requiring GitHub API")
    config.addinivalue_line("markers", "wiki: mark test as requiring Wiki access")


def pytest_collection_modifyitems(config, items):
    """Add markers to tests based on patterns"""
    for item in items:
        # Add slow marker to tests that likely take time
        if "workflow" in item.name or "publishing" in item.name:
            item.add_marker(pytest.mark.slow)

        # Add github_api marker to tests using GitHub API
        if "github" in item.name or "api" in item.name:
            item.add_marker(pytest.mark.github_api)

        # Add wiki marker to tests involving wiki operations
        if "wiki" in item.name or "publishing" in item.name:
            item.add_marker(pytest.mark.wiki)


@pytest.fixture(scope="session")
def beaver_binary():
    """Ensure beaver binary exists and return path"""
    repo_root = Path(__file__).parent.parent.parent.parent
    binary_path = repo_root / "bin" / "beaver"

    if not binary_path.exists():
        # Try to build the binary
        result = subprocess.run(["make", "build"], cwd=repo_root, capture_output=True, text=True)
        if result.returncode != 0:
            pytest.fail(f"Failed to build beaver binary: {result.stderr}")

    if not binary_path.exists():
        pytest.fail(f"Beaver binary not found at {binary_path}")

    return str(binary_path)


@pytest.fixture(scope="session")
def github_token():
    """Get GitHub token from environment"""
    token = os.getenv("GITHUB_TOKEN")
    if not token:
        pytest.skip("GITHUB_TOKEN environment variable not set")
    return token


@pytest.fixture(scope="session")
def test_repository():
    """Get test repository configuration"""
    owner = os.getenv("BEAVER_TEST_REPO_OWNER", "nyasuto")
    name = os.getenv("BEAVER_TEST_REPO_NAME", "beaver")
    return f"{owner}/{name}"


@pytest.fixture
def temp_config_dir():
    """Create temporary directory for test configuration"""
    with tempfile.TemporaryDirectory(prefix="beaver_test_") as tmpdir:
        yield tmpdir


@pytest.fixture
def beaver_config(temp_config_dir, test_repository, github_token):
    """Create test beaver configuration"""
    config_content = f"""project:
  name: "Beaver Integration Test"
  repository: "{test_repository}"

sources:
  github:
    issues: true
    commits: true
    prs: true

output:
  targets:
    - type: "github-pages"
      config:
        theme: "minima"
        branch: "gh-pages"
        enable_search: true

ai:
  provider: "openai"
  model: "gpt-4"
  features:
    summarization: true
    categorization: true
    troubleshooting: true
"""

    config_path = Path(temp_config_dir) / "beaver.yml"
    config_path.write_text(config_content)

    # Set environment variables
    original_env = {}
    env_vars = {"BEAVER_CONFIG_FILE": str(config_path), "GITHUB_TOKEN": github_token}

    for key, value in env_vars.items():
        original_env[key] = os.getenv(key)
        os.environ[key] = value

    yield str(config_path)

    # Restore environment
    for key, original_value in original_env.items():
        if original_value is None:
            os.environ.pop(key, None)
        else:
            os.environ[key] = original_value


@pytest.fixture
def cleanup_test_files():
    """Cleanup test files after test execution"""
    test_files = []

    yield test_files

    # Cleanup files created during test
    for file_path in test_files:
        try:
            if os.path.isfile(file_path):
                os.remove(file_path)
            elif os.path.isdir(file_path):
                shutil.rmtree(file_path)
        except OSError:
            pass  # Ignore cleanup errors

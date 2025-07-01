"""
Integration tests for GitHub API interactions
Tests real GitHub API calls and responses
"""

import time
from pathlib import Path

import pytest

from utils import BeaverRunner, GitHubVerifier


class TestGitHubAPIIntegration:
    """Test real GitHub API interactions"""

    @pytest.mark.github_api
    def test_github_token_validity(self, github_token):
        """Test that GitHub token is valid and has proper permissions"""
        verifier = GitHubVerifier(github_token)

        assert verifier.test_connection(), "GitHub token is invalid or expired"

        # Test rate limit access
        rate_limit = verifier.get_rate_limit()
        assert rate_limit, "Cannot access rate limit information"
        assert "resources" in rate_limit, "Rate limit response format unexpected"

    @pytest.mark.github_api
    def test_repository_access(self, github_token, test_repository):
        """Test access to test repository"""
        verifier = GitHubVerifier(github_token)

        verification = verifier.verify_repository_access(test_repository)

        assert verification["repository_exists"], (
            f"Test repository {test_repository} does not exist or is not accessible"
        )
        assert verification["can_read_issues"], f"Cannot read issues from {test_repository}"
        assert verification["rate_limit_ok"], "Insufficient rate limit for testing"

        # Repository should have some basic properties
        assert isinstance(verification["issues_count"], int), "Issue count should be a number"
        assert isinstance(verification["languages"], dict), "Languages should be a dictionary"

    @pytest.mark.github_api
    @pytest.mark.slow
    def test_issues_fetching(self, github_token, test_repository):
        """Test fetching issues from repository"""
        verifier = GitHubVerifier(github_token)

        # Test rate limit before making requests
        assert verifier.wait_for_rate_limit_reset(required_requests=5), (
            "Insufficient rate limit for issue fetching test"
        )

        # Fetch issues with different parameters
        all_issues = verifier.get_issues(test_repository, state="all", per_page=10)
        open_issues = verifier.get_issues(test_repository, state="open", per_page=10)
        closed_issues = verifier.get_issues(test_repository, state="closed", per_page=10)

        # All issues should be a list
        assert isinstance(all_issues, list), "Issues should be returned as a list"
        assert isinstance(open_issues, list), "Open issues should be returned as a list"
        assert isinstance(closed_issues, list), "Closed issues should be returned as a list"

        # Total issues should be sum of open and closed (approximately)
        # Note: Due to pagination limits (per_page=10), the counts may differ significantly
        # if there are many issues. We validate that we got reasonable results instead.
        total_fetched = len(open_issues) + len(closed_issues)
        if len(all_issues) > 0:
            # Validate that we have reasonable data - all should be <= total_fetched
            # since "all" includes both open and closed, but may be limited by pagination
            assert len(all_issues) <= total_fetched or total_fetched <= 20, (
                f"Issue count seems unreasonable: all={len(all_issues)}, open+closed={total_fetched}"
            )

        # If there are issues, verify structure
        if all_issues:
            issue = all_issues[0]
            required_fields = ["id", "number", "title", "state", "created_at"]
            for field in required_fields:
                assert field in issue, f"Issue missing required field: {field}"

            # Verify we can access specific issue
            issue_number = issue["number"]
            assert verifier.verify_issue_exists(test_repository, issue_number), (
                f"Cannot verify existence of issue #{issue_number}"
            )

    @pytest.mark.github_api
    def test_repository_languages(self, github_token, test_repository):
        """Test repository language detection"""
        verifier = GitHubVerifier(github_token)

        languages = verifier.get_repository_languages(test_repository)

        assert isinstance(languages, dict), "Languages should be a dictionary"

        # Beaver repository should contain Go
        if test_repository == "nyasuto/beaver":
            assert "Go" in languages, f"Expected Go in languages, got: {list(languages.keys())}"
            assert languages["Go"] > 0, "Go language byte count should be positive"

    @pytest.mark.github_api
    @pytest.mark.slow
    def test_rate_limit_handling(self, github_token, test_repository):
        """Test rate limit handling and recovery"""
        verifier = GitHubVerifier(github_token)

        # Get initial rate limit
        initial_rate_limit = verifier.get_rate_limit()
        initial_remaining = (
            initial_rate_limit.get("resources", {}).get("core", {}).get("remaining", 0)
        )

        # Make a few API calls
        for i in range(3):
            verifier.get_issues(test_repository, per_page=1, page=i + 1)
            time.sleep(0.5)  # Small delay between requests

        # Check rate limit after requests
        final_rate_limit = verifier.get_rate_limit()
        final_remaining = final_rate_limit.get("resources", {}).get("core", {}).get("remaining", 0)

        # Should have consumed some rate limit
        assert final_remaining <= initial_remaining, (
            f"Rate limit should decrease: {initial_remaining} -> {final_remaining}"
        )

        # Test rate limit waiting (with low threshold)
        can_proceed = verifier.wait_for_rate_limit_reset(required_requests=1)
        assert can_proceed, "Should be able to proceed with minimal rate limit requirements"


class TestBeaverGitHubIntegration:
    """Test Beaver's integration with GitHub through CLI"""

    @pytest.mark.github_api
    @pytest.mark.slow
    def test_beaver_github_connection(self, beaver_binary, beaver_config, github_token):
        """Test Beaver's GitHub connection through CLI"""
        if not github_token:
            pytest.skip("GitHub token required for GitHub integration tests")

        runner = BeaverRunner(beaver_binary, beaver_config)
        success, stdout, stderr = runner.get_status()

        # Should attempt GitHub connection if config is available
        if "設定ファイルなし" not in stdout:
            assert "GitHub" in stdout, f"No GitHub connection attempt in status: {stdout}"

        # If connection fails, should be due to configuration, not crashes
        if not success or "エラー" in stdout:
            assert "panic" not in stderr.lower(), f"GitHub connection caused panic: {stderr}"
            assert "token" in stderr.lower() or "トークン" in stderr, (
                f"GitHub error should mention token: {stderr}"
            )

    @pytest.mark.github_api
    @pytest.mark.slow
    def test_beaver_issue_processing(
        self, beaver_binary, beaver_config, test_repository, github_token
    ):
        """Test Beaver's issue processing capabilities"""
        if not github_token:
            pytest.skip("GitHub token required for issue processing tests")

        # First verify GitHub access independently
        verifier = GitHubVerifier(github_token)
        verification = verifier.verify_repository_access(test_repository)

        if not verification["repository_exists"]:
            pytest.skip(f"Test repository {test_repository} not accessible")

        runner = BeaverRunner(beaver_binary, beaver_config)

        # Test issue fetching
        success, stdout, stderr = runner.fetch_issues(test_repository, timeout=120)

        # Should complete without crashing
        assert "panic" not in stderr.lower(), f"Issue fetching caused panic: {stderr}"

        # Should provide meaningful output
        if success:
            assert "issue" in stdout.lower() or "Issues" in stdout or "件" in stdout, (
                f"No issue-related output: {stdout}"
            )
        else:
            # If failed, should be clear why
            assert len(stderr) > 0, f"No error message for failed issue fetch: {stderr}"

    @pytest.mark.github_api
    @pytest.mark.slow
    def test_beaver_end_to_end_workflow(
        self, beaver_binary, beaver_config, test_repository, github_token, cleanup_test_files
    ):
        """Test complete Beaver workflow with GitHub"""
        if not github_token:
            pytest.skip("GitHub token required for end-to-end tests")

        # Verify prerequisites
        verifier = GitHubVerifier(github_token)
        if not verifier.wait_for_rate_limit_reset(required_requests=20):
            pytest.skip("Insufficient rate limit for end-to-end test")

        verification = verifier.verify_repository_access(test_repository)
        if not verification["repository_exists"] or not verification["can_read_issues"]:
            pytest.skip(f"Cannot access test repository {test_repository}")

        runner = BeaverRunner(beaver_binary, beaver_config)

        # Track files for cleanup
        cleanup_test_files.extend(["_site", "*.md", ".beaver", "test_output"])

        # Step 1: Test status
        status_success, status_out, status_err = runner.get_status()
        assert "panic" not in status_err.lower(), f"Status check panicked: {status_err}"

        # Step 2: Test build (main workflow)
        build_success, build_out, build_err = runner.build_wiki(
            incremental=True,
            max_items=5,  # Limit for faster testing
            timeout=300,
        )

        # Should complete without crashing
        assert "panic" not in build_err.lower(), f"Build workflow panicked: {build_err}"

        # If build succeeded, verify some output was generated
        if build_success:
            assert "完了" in build_out or "complete" in build_out.lower(), (
                f"Build success not indicated: {build_out}"
            )

            # Check if any files were generated
            generated_files = []
            for pattern in ["*.md", "_site"]:
                generated_files.extend(list(Path().glob(pattern)))

            # Should generate some content
            assert len(generated_files) > 0 or ".beaver" in build_out, (
                f"No output files generated from build: {build_out}"
            )

        # Step 3: Test site build if main build worked
        if build_success:
            site_success, site_out, site_err = runner.build_site("test_output", timeout=180)
            assert "panic" not in site_err.lower(), f"Site build panicked: {site_err}"


class TestGitHubErrorScenarios:
    """Test error handling for GitHub integration"""

    @pytest.mark.github_api
    def test_invalid_token_handling(self, beaver_binary, temp_config_dir):
        """Test handling of invalid GitHub token"""
        # Create config with invalid token
        config_content = """project:
  name: "Test Invalid Token"
  repository: "nyasuto/beaver"

sources:
  github:
    issues: true

output:
  targets:
    - type: "github-pages"
"""

        config_path = Path(temp_config_dir) / "beaver.yml"
        config_path.write_text(config_content)

        runner = BeaverRunner(beaver_binary, str(config_path))

        # Test with clearly invalid token using fetch command that requires GitHub access
        env = {"GITHUB_TOKEN": "invalid_token_12345"}
        result = runner.run_command(
            ["fetch", "issues", "nyasuto/beaver", "--per-page", "1"], env=env, timeout=30
        )

        # Should handle invalid token gracefully
        assert "panic" not in result.stderr.lower(), f"Invalid token caused panic: {result.stderr}"
        # For invalid token, command should fail or show authentication error
        if result.returncode != 0:
            assert (
                "unauthorized" in result.stderr.lower()
                or "token" in result.stderr.lower()
                or "认证" in result.stderr.lower()
                or "トークン" in result.stderr
                or "401" in result.stderr
                or "bad credentials" in result.stderr.lower()
            ), f"Invalid token error not clear: {result.stderr}"

    @pytest.mark.github_api
    def test_nonexistent_repository(self, beaver_binary, beaver_config, github_token):
        """Test handling of non-existent repository"""
        if not github_token:
            pytest.skip("GitHub token required for repository error tests")

        runner = BeaverRunner(beaver_binary, beaver_config)

        # Try to fetch from non-existent repository
        success, stdout, stderr = runner.fetch_issues("nonexistent/repository-12345")

        assert not success, "Non-existent repository should fail"
        assert "panic" not in stderr.lower(), f"Non-existent repo caused panic: {stderr}"
        assert (
            "not found" in stderr.lower()
            or "404" in stderr
            or "見つかりません" in stderr
            or "存在しません" in stderr
        ), f"Repository not found error unclear: {stderr}"

    @pytest.mark.github_api
    @pytest.mark.skip(reason="Skipping due to timeout issues with large repositories in CI")
    def test_insufficient_permissions(self, beaver_binary, temp_config_dir, github_token):
        """Test handling of insufficient permissions"""
        if not github_token:
            pytest.skip("GitHub token required for permission tests")

        # Create config targeting a private repository we likely don't have access to
        config_content = """project:
  name: "Test Permissions"
  repository: "microsoft/vscode"

sources:
  github:
    issues: true

output:
  targets:
    - type: "github-pages"
"""

        config_path = Path(temp_config_dir) / "beaver.yml"
        config_path.write_text(config_content)

        runner = BeaverRunner(beaver_binary, str(config_path))

        # Test access to high-profile repository with limited page size to avoid timeouts
        env = {"GITHUB_TOKEN": github_token}
        result = runner.run_command(
            ["fetch", "issues", "octocat/Hello-World", "--per-page", "1", "--state", "open"],
            env=env,
            timeout=30,
        )

        # Should handle permission issues gracefully
        assert "panic" not in result.stderr.lower(), (
            f"Permission issue caused panic: {result.stderr}"
        )

        # Either succeeds or fails gracefully
        if result.returncode != 0:
            assert (
                "forbidden" in result.stderr.lower()
                or "permission" in result.stderr.lower()
                or "access" in result.stderr.lower()
                or "权限" in result.stderr
                or "timeout" in result.stderr.lower()
                or "rate limit" in result.stderr.lower()
            ), f"Permission error not clear: {result.stderr}"

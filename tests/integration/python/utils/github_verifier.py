"""
Utility for verifying GitHub API interactions and results
"""

import time
from typing import Any, Optional

import requests


class GitHubVerifier:
    """Helper class for verifying GitHub API interactions"""

    def __init__(self, token: str):
        self.token = token
        self.base_url = "https://api.github.com"
        self.session = requests.Session()
        self.session.headers.update(
            {
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "Beaver-Integration-Test/1.0",
            }
        )

    def test_connection(self) -> bool:
        """
        Test GitHub API connection

        Returns:
            True if connection is successful
        """
        try:
            response = self.session.get(f"{self.base_url}/user")
            return response.status_code == 200
        except requests.RequestException:
            return False

    def get_repository_info(self, repository: str) -> Optional[dict[str, Any]]:
        """
        Get repository information

        Args:
            repository: Repository in owner/name format

        Returns:
            Repository information dict or None if not found
        """
        try:
            response = self.session.get(f"{self.base_url}/repos/{repository}")
            if response.status_code == 200:
                return response.json()
            return None
        except requests.RequestException:
            return None

    def get_issues(
        self, repository: str, state: str = "all", per_page: int = 30, page: int = 1
    ) -> list[dict[str, Any]]:
        """
        Get repository issues

        Args:
            repository: Repository in owner/name format
            state: Issue state (open, closed, all)
            per_page: Number of issues per page
            page: Page number

        Returns:
            List of issue dictionaries
        """
        try:
            params = {"state": state, "per_page": per_page, "page": page}
            response = self.session.get(f"{self.base_url}/repos/{repository}/issues", params=params)
            if response.status_code == 200:
                return response.json()
            return []
        except requests.RequestException:
            return []

    def get_rate_limit(self) -> dict[str, Any]:
        """
        Get current rate limit status

        Returns:
            Rate limit information
        """
        try:
            response = self.session.get(f"{self.base_url}/rate_limit")
            if response.status_code == 200:
                return response.json()
            return {}
        except requests.RequestException:
            return {}

    def wait_for_rate_limit_reset(self, required_requests: int = 10) -> bool:
        """
        Wait for rate limit reset if necessary

        Args:
            required_requests: Number of requests needed

        Returns:
            True if sufficient rate limit available
        """
        rate_limit = self.get_rate_limit()
        if not rate_limit:
            return True  # Assume OK if can't check

        core_limit = rate_limit.get("resources", {}).get("core", {})
        remaining = core_limit.get("remaining", 0)
        reset_time = core_limit.get("reset", 0)

        if remaining >= required_requests:
            return True

        # Wait for reset
        current_time = time.time()
        wait_time = max(0, reset_time - current_time + 5)  # Add 5 second buffer

        if wait_time > 300:  # Don't wait more than 5 minutes
            return False

        if wait_time > 0:
            time.sleep(wait_time)

        return True

    def verify_issue_exists(self, repository: str, issue_number: int) -> bool:
        """
        Verify that a specific issue exists

        Args:
            repository: Repository in owner/name format
            issue_number: Issue number to check

        Returns:
            True if issue exists
        """
        try:
            response = self.session.get(f"{self.base_url}/repos/{repository}/issues/{issue_number}")
            return response.status_code == 200
        except requests.RequestException:
            return False

    def get_repository_languages(self, repository: str) -> dict[str, int]:
        """
        Get repository programming languages

        Args:
            repository: Repository in owner/name format

        Returns:
            Dictionary of languages and their byte counts
        """
        try:
            response = self.session.get(f"{self.base_url}/repos/{repository}/languages")
            if response.status_code == 200:
                return response.json()
            return {}
        except requests.RequestException:
            return {}

    def verify_repository_access(self, repository: str) -> dict[str, Any]:
        """
        Comprehensive verification of repository access

        Args:
            repository: Repository in owner/name format

        Returns:
            Verification results dictionary
        """
        results = {
            "repository_exists": False,
            "can_read_issues": False,
            "issues_count": 0,
            "rate_limit_ok": False,
            "languages": {},
            "error": None,
        }

        try:
            # Check repository exists
            repo_info = self.get_repository_info(repository)
            if repo_info:
                results["repository_exists"] = True

            # Check issues access
            issues = self.get_issues(repository, per_page=1)
            if issues is not None:
                results["can_read_issues"] = True
                # Get total issue count from repository info
                if repo_info:
                    results["issues_count"] = repo_info.get("open_issues_count", 0)

            # Check rate limit
            rate_limit = self.get_rate_limit()
            if rate_limit:
                core_remaining = rate_limit.get("resources", {}).get("core", {}).get("remaining", 0)
                results["rate_limit_ok"] = core_remaining > 10

            # Get languages
            results["languages"] = self.get_repository_languages(repository)

        except Exception as e:
            results["error"] = str(e)

        return results

"""
Beaver Integration Test Utilities

This package provides utilities for testing Beaver's external behavior
and integration with GitHub APIs, without relying on Go's type system.
Focus is on real-world functionality and external interface verification.
"""

from .beaver_runner import BeaverRunner
from .github_verifier import GitHubVerifier  
from .site_checker import SiteChecker

__all__ = ["BeaverRunner", "GitHubVerifier", "SiteChecker"]
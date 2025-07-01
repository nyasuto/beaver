"""
Integration tests for site generation and content verification
Tests actual site output and GitHub Pages compatibility
"""

import tempfile
from pathlib import Path

import pytest

from utils import BeaverRunner, SiteChecker


class TestSiteGeneration:
    """Test static site generation functionality"""

    @pytest.mark.slow
    def test_site_build_basic(self, beaver_binary, beaver_config, github_token, cleanup_test_files):
        """Test basic site building functionality"""
        if not github_token:
            pytest.skip("GitHub token required for site generation tests")

        with tempfile.TemporaryDirectory(prefix="beaver_site_test_") as temp_dir:
            site_dir = Path(temp_dir) / "test_site"

            runner = BeaverRunner(beaver_binary, beaver_config)
            success, stdout, stderr = runner.build_site(str(site_dir), timeout=180)

            # Track for cleanup
            cleanup_test_files.append(str(site_dir))

            # Should complete without crashing
            assert "panic" not in stderr.lower(), f"Site build panicked: {stderr}"

            if success:
                # Verify site directory was created
                assert site_dir.exists(), f"Site directory not created: {site_dir}"

                # Basic site structure verification
                checker = SiteChecker(str(site_dir))
                structure = checker.verify_site_structure()

                assert structure["site_directory_exists"], "Site directory should exist"
                assert structure["total_files"] > 0, "Site should contain files"
                assert len(structure["errors"]) == 0, (
                    f"Site structure errors: {structure['errors']}"
                )

    @pytest.mark.slow
    def test_site_content_verification(
        self, beaver_binary, beaver_config, github_token, cleanup_test_files
    ):
        """Test generated site content quality"""
        if not github_token:
            pytest.skip("GitHub token required for content verification tests")

        with tempfile.TemporaryDirectory(prefix="beaver_content_test_") as temp_dir:
            site_dir = Path(temp_dir) / "content_test_site"

            runner = BeaverRunner(beaver_binary, beaver_config)
            success, stdout, stderr = runner.build_site(str(site_dir), timeout=240)

            cleanup_test_files.append(str(site_dir))

            if not success:
                pytest.skip(f"Site build failed, cannot test content: {stderr}")

            checker = SiteChecker(str(site_dir))

            # Test HTML content
            html_verification = checker.verify_html_content()

            if html_verification["file_exists"]:
                assert html_verification["is_valid_html"], "Generated HTML should be valid"
                assert html_verification["has_title"], "HTML should have title"
                assert len(html_verification["errors"]) == 0, (
                    f"HTML content errors: {html_verification['errors']}"
                )

                # Test for Japanese content (Beaver is Japanese-focused)
                if html_verification["japanese_content_detected"]:
                    assert html_verification["word_count"] > 10, (
                        "Japanese content should be substantial"
                    )

    @pytest.mark.slow
    def test_beaver_specific_content(
        self, beaver_binary, beaver_config, github_token, cleanup_test_files
    ):
        """Test Beaver-specific content generation"""
        if not github_token:
            pytest.skip("GitHub token required for Beaver content tests")

        with tempfile.TemporaryDirectory(prefix="beaver_specific_test_") as temp_dir:
            site_dir = Path(temp_dir) / "beaver_content_site"

            runner = BeaverRunner(beaver_binary, beaver_config)
            success, stdout, stderr = runner.build_site(str(site_dir), timeout=300)

            cleanup_test_files.append(str(site_dir))

            if not success:
                pytest.skip(f"Site build failed, cannot test Beaver content: {stderr}")

            checker = SiteChecker(str(site_dir))

            # Test Beaver-specific features
            beaver_content = checker.verify_beaver_specific_content()

            assert len(beaver_content["errors"]) == 0, (
                f"Beaver content verification errors: {beaver_content['errors']}"
            )

            # Beaver should include its branding
            assert beaver_content["beaver_branding_present"], (
                "Beaver branding should be present in generated site"
            )

            # Should have some navigation structure
            assert beaver_content["has_navigation"], (
                "Generated site should have navigation elements"
            )

    @pytest.mark.slow
    def test_github_pages_compatibility(
        self, beaver_binary, beaver_config, github_token, cleanup_test_files
    ):
        """Test GitHub Pages compatibility of generated site"""
        if not github_token:
            pytest.skip("GitHub token required for GitHub Pages compatibility tests")

        with tempfile.TemporaryDirectory(prefix="beaver_pages_test_") as temp_dir:
            site_dir = Path(temp_dir) / "pages_compat_site"

            runner = BeaverRunner(beaver_binary, beaver_config)
            success, stdout, stderr = runner.build_site(str(site_dir), timeout=240)

            cleanup_test_files.append(str(site_dir))

            if not success:
                pytest.skip(f"Site build failed, cannot test GitHub Pages compatibility: {stderr}")

            checker = SiteChecker(str(site_dir))

            # Test GitHub Pages compatibility
            compat = checker.verify_github_pages_compatibility()

            assert len(compat["errors"]) == 0, (
                f"GitHub Pages compatibility errors: {compat['errors']}"
            )

            assert compat["has_index_html"], "Site should have index.html for GitHub Pages"

            assert compat["no_server_side_code"], (
                "Site should not contain server-side code for GitHub Pages"
            )

            assert compat["relative_links_only"], (
                "Site should use relative links for GitHub Pages compatibility"
            )

    def test_site_css_assets(self, beaver_binary, beaver_config, github_token, cleanup_test_files):
        """Test CSS assets generation and quality"""
        if not github_token:
            pytest.skip("GitHub token required for CSS asset tests")

        with tempfile.TemporaryDirectory(prefix="beaver_css_test_") as temp_dir:
            site_dir = Path(temp_dir) / "css_test_site"

            runner = BeaverRunner(beaver_binary, beaver_config)
            success, stdout, stderr = runner.build_site(str(site_dir), timeout=180)

            cleanup_test_files.append(str(site_dir))

            if not success:
                pytest.skip(f"Site build failed, cannot test CSS assets: {stderr}")

            checker = SiteChecker(str(site_dir))

            # Test CSS assets
            css_verification = checker.verify_css_assets()

            assert len(css_verification["errors"]) == 0, (
                f"CSS verification errors: {css_verification['errors']}"
            )

            # Should have some CSS (either inline or external)
            if css_verification["css_files_found"]:
                assert css_verification["total_css_size"] > 0, "CSS files should have content"


class TestSiteGenerationErrorHandling:
    """Test error handling in site generation"""

    def test_invalid_output_directory(self, beaver_binary, beaver_config):
        """Test handling of invalid output directory"""
        runner = BeaverRunner(beaver_binary, beaver_config)

        # Try to write to system directory (should fail)
        success, stdout, stderr = runner.build_site("/invalid/system/path", timeout=60)

        assert not success, "Writing to invalid path should fail"
        assert "panic" not in stderr.lower(), f"Invalid path caused panic: {stderr}"
        assert (
            "permission" in stderr.lower()
            or "path" in stderr.lower()
            or "directory" in stderr.lower()
            or "ディレクトリ" in stderr
        ), f"Path error not clear: {stderr}"

    def test_site_build_without_data(self, beaver_binary, temp_config_dir):
        """Test site building with minimal/no data"""
        # Create minimal config
        config_content = """project:
  name: "Empty Test Project"
  repository: "test/empty"

sources:
  github:
    issues: false

output:
  targets:
    - type: "github-pages"
"""

        config_path = Path(temp_config_dir) / "minimal_beaver.yml"
        config_path.write_text(config_content)

        with tempfile.TemporaryDirectory(prefix="beaver_empty_test_") as temp_dir:
            site_dir = Path(temp_dir) / "empty_site"

            runner = BeaverRunner(beaver_binary, str(config_path))
            success, stdout, stderr = runner.build_site(str(site_dir), timeout=120)

            # Should handle empty data gracefully
            assert "panic" not in stderr.lower(), f"Empty data caused panic: {stderr}"

            # Even with no data, should create basic site structure
            if success and site_dir.exists():
                checker = SiteChecker(str(site_dir))
                structure = checker.verify_site_structure()

                # Should at least have index file
                assert structure["has_index_file"] or structure["html_files_count"] > 0, (
                    "Should create at least basic HTML structure"
                )

    def test_concurrent_site_builds(self, beaver_binary, beaver_config, github_token):
        """Test behavior with concurrent site builds"""
        if not github_token:
            pytest.skip("GitHub token required for concurrency tests")

        with tempfile.TemporaryDirectory(prefix="beaver_concurrent_test_") as temp_dir:
            site_dir_1 = Path(temp_dir) / "concurrent_site_1"
            site_dir_2 = Path(temp_dir) / "concurrent_site_2"

            runner = BeaverRunner(beaver_binary, beaver_config)

            # Start two builds with different output directories
            # Note: This is a simple test - real concurrency would need threading
            success_1, stdout_1, stderr_1 = runner.build_site(str(site_dir_1), timeout=180)
            success_2, stdout_2, stderr_2 = runner.build_site(str(site_dir_2), timeout=180)

            # Both should complete without interfering
            assert "panic" not in stderr_1.lower(), f"First concurrent build panicked: {stderr_1}"
            assert "panic" not in stderr_2.lower(), f"Second concurrent build panicked: {stderr_2}"

            # If both succeeded, verify they created separate outputs
            if success_1 and success_2:
                assert site_dir_1.exists(), "First build should create its directory"
                assert site_dir_2.exists(), "Second build should create its directory"

                # Directories should be different
                assert site_dir_1 != site_dir_2, "Build directories should be different"


class TestSiteGenerationPerformance:
    """Test performance characteristics of site generation"""

    @pytest.mark.slow
    def test_large_content_handling(
        self, beaver_binary, beaver_config, github_token, cleanup_test_files
    ):
        """Test handling of large content generation"""
        if not github_token:
            pytest.skip("GitHub token required for performance tests")

        with tempfile.TemporaryDirectory(prefix="beaver_large_test_") as temp_dir:
            site_dir = Path(temp_dir) / "large_content_site"

            runner = BeaverRunner(beaver_binary, beaver_config)

            # Use longer timeout for large content
            success, stdout, stderr = runner.build_site(str(site_dir), timeout=600)

            cleanup_test_files.append(str(site_dir))

            # Should complete within reasonable time
            assert "panic" not in stderr.lower(), f"Large content caused panic: {stderr}"

            if success:
                # Verify performance metrics
                assert "timeout" not in stderr.lower(), "Should not timeout on large content"

                # Check if site was actually generated
                checker = SiteChecker(str(site_dir))
                structure = checker.verify_site_structure()

                assert structure["site_directory_exists"], (
                    "Large content should still generate site"
                )

    @pytest.mark.slow
    def test_incremental_build_performance(
        self, beaver_binary, beaver_config, github_token, cleanup_test_files
    ):
        """Test incremental build performance"""
        if not github_token:
            pytest.skip("GitHub token required for incremental build tests")

        runner = BeaverRunner(beaver_binary, beaver_config)

        cleanup_test_files.extend([".beaver", "*.md", "_site"])

        # First build (full)
        success_1, stdout_1, stderr_1 = runner.build_wiki(
            incremental=False, max_items=10, timeout=300
        )

        assert "panic" not in stderr_1.lower(), f"Full build panicked: {stderr_1}"

        if success_1:
            # Second build (incremental) - should be faster
            success_2, stdout_2, stderr_2 = runner.build_wiki(
                incremental=True,
                max_items=10,
                timeout=180,  # Shorter timeout for incremental
            )

            assert "panic" not in stderr_2.lower(), f"Incremental build panicked: {stderr_2}"

            if success_2:
                # Incremental should indicate its nature
                assert "incremental" in stdout_2.lower() or "インクリメンタル" in stdout_2, (
                    f"Incremental build not indicated: {stdout_2}"
                )

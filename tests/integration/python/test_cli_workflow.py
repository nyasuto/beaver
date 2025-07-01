"""
Integration tests for Beaver CLI workflow
Tests actual CLI commands and their external behavior
"""
import pytest
import os
from pathlib import Path
from utils import BeaverRunner, GitHubVerifier


class TestCLIWorkflow:
    """Test CLI commands with real external dependencies"""
    
    def test_beaver_binary_exists(self, beaver_binary):
        """Verify beaver binary exists and is executable"""
        binary_path = Path(beaver_binary)
        assert binary_path.exists(), f"Beaver binary not found: {beaver_binary}"
        assert os.access(binary_path, os.X_OK), f"Beaver binary not executable: {beaver_binary}"
    
    def test_beaver_version_command(self, beaver_binary):
        """Test version command works"""
        runner = BeaverRunner(beaver_binary)
        success, stdout, stderr = runner.get_version()
        
        assert success, f"Version command failed: {stderr}"
        assert "Beaver" in stdout, f"Version output missing Beaver: {stdout}"
        assert "バージョン" in stdout or "version" in stdout.lower(), f"Version info missing: {stdout}"
    
    def test_beaver_help_command(self, beaver_binary):
        """Test help command works"""
        runner = BeaverRunner(beaver_binary)
        result = runner.run_command(["--help"])
        
        assert result.returncode == 0, f"Help command failed: {result.stderr}"
        assert "Beaver" in result.stdout, f"Help missing Beaver info: {result.stdout}"
        assert "build" in result.stdout, f"Help missing build command: {result.stdout}"
    
    @pytest.mark.github_api
    def test_status_without_config(self, beaver_binary, temp_config_dir):
        """Test status command behavior without configuration"""
        runner = BeaverRunner(beaver_binary)
        
        # Change to temp directory without config
        original_cwd = os.getcwd()
        try:
            os.chdir(temp_config_dir)
            success, stdout, stderr = runner.get_status()
            
            # Should fail gracefully without config
            assert not success, "Status should fail without config"
            assert "設定ファイルなし" in stdout or "configuration" in stderr.lower(), \
                f"Missing config error not detected: {stdout} {stderr}"
        finally:
            os.chdir(original_cwd)
    
    @pytest.mark.github_api
    def test_init_command(self, beaver_binary, temp_config_dir):
        """Test project initialization"""
        runner = BeaverRunner(beaver_binary)
        
        original_cwd = os.getcwd()
        try:
            os.chdir(temp_config_dir)
            success, stdout, stderr = runner.init_project()
            
            assert success, f"Init command failed: {stderr}"
            assert "初期化完了" in stdout or "initialization" in stdout.lower(), \
                f"Init success message missing: {stdout}"
            
            # Verify config file was created
            config_file = Path(temp_config_dir) / "beaver.yml"
            assert config_file.exists(), "Config file not created"
            
            # Verify config content
            config_content = config_file.read_text()
            assert "project:" in config_content, "Config missing project section"
            assert "sources:" in config_content, "Config missing sources section"
            
        finally:
            os.chdir(original_cwd)
    
    @pytest.mark.github_api 
    @pytest.mark.slow
    def test_status_with_config(self, beaver_binary, beaver_config, github_token):
        """Test status command with valid configuration"""
        runner = BeaverRunner(beaver_binary, beaver_config)
        success, stdout, stderr = runner.get_status()
        
        # Status might succeed or fail depending on GitHub access, but should not crash
        assert "設定ファイル" in stdout or "configuration" in stdout.lower(), \
            f"Config file status missing: {stdout}"
        
        if github_token:
            # If token available, should test GitHub connection
            assert "GitHub" in stdout, f"GitHub status missing: {stdout}"
    
    @pytest.mark.github_api
    @pytest.mark.slow  
    def test_fetch_issues_command(self, beaver_binary, beaver_config, test_repository, github_token):
        """Test fetching issues from GitHub"""
        if not github_token:
            pytest.skip("GitHub token required for API tests")
        
        runner = BeaverRunner(beaver_binary, beaver_config)
        success, stdout, stderr = runner.fetch_issues(test_repository, timeout=90)
        
        # Command should complete (success depends on repository state)
        assert "Issues" in stdout or "issue" in stdout.lower() or "エラー" in stdout, \
            f"No issues-related output: {stdout}"
        
        # Should not crash with internal errors
        assert "panic" not in stderr.lower(), f"Command panicked: {stderr}"
        assert "fatal" not in stderr.lower(), f"Fatal error occurred: {stderr}"
    
    @pytest.mark.github_api
    @pytest.mark.slow
    def test_build_command_basic(self, beaver_binary, beaver_config, github_token, cleanup_test_files):
        """Test basic build command"""
        if not github_token:
            pytest.skip("GitHub token required for build tests")
        
        runner = BeaverRunner(beaver_binary, beaver_config)
        success, stdout, stderr = runner.build_wiki(timeout=180)
        
        # Track files for cleanup
        cleanup_test_files.extend([
            "_site",
            "*.md",
            ".beaver"
        ])
        
        # Build might succeed or fail, but should handle errors gracefully
        assert "Build" in stdout or "build" in stdout.lower() or "ビルド" in stdout, \
            f"No build-related output: {stdout}"
        
        # Should not crash
        assert "panic" not in stderr.lower(), f"Build command panicked: {stderr}"
        
        # If successful, should indicate completion
        if success:
            assert "完了" in stdout or "complete" in stdout.lower(), \
                f"Build completion not indicated: {stdout}"
    
    @pytest.mark.github_api
    @pytest.mark.slow
    def test_site_build_command(self, beaver_binary, beaver_config, github_token, cleanup_test_files):
        """Test site build command"""
        if not github_token:
            pytest.skip("GitHub token required for site build tests")
        
        runner = BeaverRunner(beaver_binary, beaver_config)
        success, stdout, stderr = runner.build_site("test_site", timeout=180)
        
        # Track for cleanup
        cleanup_test_files.append("test_site")
        
        # Site build should complete without crashing
        assert "panic" not in stderr.lower(), f"Site build panicked: {stderr}"
        
        # Should produce some output
        assert len(stdout) > 0 or len(stderr) > 0, "No output from site build command"


class TestCLIErrorHandling:
    """Test CLI error handling and edge cases"""
    
    def test_invalid_command(self, beaver_binary):
        """Test behavior with invalid command"""
        runner = BeaverRunner(beaver_binary)
        result = runner.run_command(["invalid-command"])
        
        assert result.returncode != 0, "Invalid command should fail"
        assert "unknown command" in result.stderr.lower() or "コマンド" in result.stderr, \
            f"Invalid command error not clear: {result.stderr}"
    
    def test_missing_required_args(self, beaver_binary):
        """Test behavior with missing required arguments"""
        runner = BeaverRunner(beaver_binary)
        result = runner.run_command(["fetch"])
        
        assert result.returncode != 0, "Command with missing args should fail"
        # Should provide usage information
        assert len(result.stderr) > 0 or len(result.stdout) > 0, \
            "No usage information provided for missing args"
    
    @pytest.mark.github_api
    def test_invalid_repository_format(self, beaver_binary, beaver_config):
        """Test behavior with invalid repository format"""
        runner = BeaverRunner(beaver_binary, beaver_config)
        success, stdout, stderr = runner.fetch_issues("invalid-repo-format")
        
        assert not success, "Invalid repository format should fail"
        assert "repository" in stderr.lower() or "リポジトリ" in stderr, \
            f"Repository format error not clear: {stderr}"
    
    def test_command_timeout(self, beaver_binary):
        """Test command timeout behavior"""
        runner = BeaverRunner(beaver_binary)
        
        with pytest.raises(TimeoutError):
            # Use very short timeout to test timeout handling
            runner.run_command(["build"], timeout=1)
    
    @pytest.mark.github_api
    def test_network_error_handling(self, beaver_binary, temp_config_dir):
        """Test behavior when network is unavailable"""
        # Create config with invalid GitHub API endpoint
        config_content = """project:
  name: "Test Project"
  repository: "test/repo"

sources:
  github:
    issues: true

output:
  targets:
    - type: "github-pages"
"""
        config_path = Path(temp_config_dir) / "beaver.yml"
        config_path.write_text(config_content)
        
        # Set invalid token to simulate network error
        env = {"GITHUB_TOKEN": "invalid-token-test"}
        
        runner = BeaverRunner(beaver_binary, str(config_path))
        result = runner.run_command(["status"], env=env)
        
        # Should handle network errors gracefully
        assert "panic" not in result.stderr.lower(), f"Network error caused panic: {result.stderr}"
        assert len(result.stdout) > 0 or len(result.stderr) > 0, \
            "No error message for network failure"
"""
Utility for running Beaver CLI commands in integration tests
"""

import os
import subprocess
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple


class BeaverRunner:
    """Helper class for executing Beaver CLI commands"""

    def __init__(self, binary_path: str, config_path: Optional[str] = None):
        self.binary_path = binary_path
        self.config_path = config_path
        self.default_timeout = 60  # seconds

    def run_command(
        self,
        args: List[str],
        timeout: Optional[int] = None,
        env: Optional[Dict[str, str]] = None,
        capture_output: bool = True,
        check: bool = False,
    ) -> subprocess.CompletedProcess:
        """
        Run a beaver command with specified arguments

        Args:
            args: Command arguments (without 'beaver' prefix)
            timeout: Command timeout in seconds
            env: Additional environment variables
            capture_output: Whether to capture stdout/stderr
            check: Whether to raise exception on non-zero exit

        Returns:
            CompletedProcess instance
        """
        cmd = [self.binary_path] + args

        # Prepare environment
        command_env = os.environ.copy()
        if env:
            command_env.update(env)

        if self.config_path:
            command_env["BEAVER_CONFIG_FILE"] = self.config_path

        # Run command
        try:
            result = subprocess.run(
                cmd,
                timeout=timeout or self.default_timeout,
                env=command_env,
                capture_output=capture_output,
                text=True,
                check=check,
            )
            return result
        except subprocess.TimeoutExpired as e:
            raise TimeoutError(
                f"Command timed out after {timeout or self.default_timeout}s: {' '.join(cmd)}"
            ) from e

    def init_project(self, timeout: int = 30) -> Tuple[bool, str, str]:
        """
        Initialize a beaver project

        Returns:
            (success, stdout, stderr)
        """
        result = self.run_command(["init"], timeout=timeout)
        return result.returncode == 0, result.stdout, result.stderr

    def get_status(self, timeout: int = 30) -> Tuple[bool, str, str]:
        """
        Get beaver project status

        Returns:
            (success, stdout, stderr)
        """
        result = self.run_command(["status"], timeout=timeout)
        return result.returncode == 0, result.stdout, result.stderr

    def build_wiki(
        self,
        incremental: bool = False,
        force_rebuild: bool = False,
        max_items: Optional[int] = None,
        timeout: int = 120,
    ) -> Tuple[bool, str, str]:
        """
        Build wiki content

        Args:
            incremental: Use incremental build
            force_rebuild: Force complete rebuild
            max_items: Maximum items to process
            timeout: Command timeout

        Returns:
            (success, stdout, stderr)
        """
        args = ["build"]

        if incremental:
            args.append("--incremental")

        if force_rebuild:
            args.append("--force-rebuild")

        if max_items:
            args.extend(["--max-items", str(max_items)])

        result = self.run_command(args, timeout=timeout)
        return result.returncode == 0, result.stdout, result.stderr

    def fetch_issues(self, repository: str, timeout: int = 60) -> Tuple[bool, str, str]:
        """
        Fetch issues from repository

        Args:
            repository: Repository in owner/name format
            timeout: Command timeout

        Returns:
            (success, stdout, stderr)
        """
        result = self.run_command(["fetch", "issues", repository], timeout=timeout)
        return result.returncode == 0, result.stdout, result.stderr

    def classify_issues(self, repository: str, timeout: int = 90) -> Tuple[bool, str, str]:
        """
        Classify issues using AI

        Args:
            repository: Repository in owner/name format
            timeout: Command timeout

        Returns:
            (success, stdout, stderr)
        """
        result = self.run_command(["classify", "issues", repository], timeout=timeout)
        return result.returncode == 0, result.stdout, result.stderr

    def generate_wiki(self, repository: str, timeout: int = 120) -> Tuple[bool, str, str]:
        """
        Generate wiki content

        Args:
            repository: Repository in owner/name format
            timeout: Command timeout

        Returns:
            (success, stdout, stderr)
        """
        result = self.run_command(["wiki", "generate", repository], timeout=timeout)
        return result.returncode == 0, result.stdout, result.stderr

    def build_site(self, output_dir: str = "_site", timeout: int = 120) -> Tuple[bool, str, str]:
        """
        Build static site

        Args:
            output_dir: Output directory for site
            timeout: Command timeout

        Returns:
            (success, stdout, stderr)
        """
        result = self.run_command(["site", "build", "--output", output_dir], timeout=timeout)
        return result.returncode == 0, result.stdout, result.stderr

    def get_version(self) -> Tuple[bool, str, str]:
        """
        Get beaver version information

        Returns:
            (success, stdout, stderr)
        """
        result = self.run_command(["version"])
        return result.returncode == 0, result.stdout, result.stderr

    def wait_for_file(self, file_path: str, timeout: int = 30) -> bool:
        """
        Wait for a file to be created

        Args:
            file_path: Path to file to wait for
            timeout: Maximum wait time in seconds

        Returns:
            True if file exists within timeout, False otherwise
        """
        start_time = time.time()
        file_path = Path(file_path)

        while time.time() - start_time < timeout:
            if file_path.exists():
                return True
            time.sleep(0.5)

        return False

    def cleanup_output_files(self, patterns: List[str]):
        """
        Clean up output files matching patterns

        Args:
            patterns: List of file patterns to remove
        """
        for pattern in patterns:
            for file_path in Path().glob(pattern):
                try:
                    if file_path.is_file():
                        file_path.unlink()
                    elif file_path.is_dir():
                        import shutil

                        shutil.rmtree(file_path)
                except OSError:
                    pass  # Ignore cleanup errors

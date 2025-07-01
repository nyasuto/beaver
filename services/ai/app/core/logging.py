"""
Logging configuration for Beaver AI Services

Provides structured logging with proper formatting and levels.
"""

import logging
import sys

from app.core.config import get_settings


class BeaverFormatter(logging.Formatter):
    """Custom formatter for Beaver AI Services"""

    def __init__(self):
        super().__init__()

        # Color codes for terminal output
        self.colors = {
            "DEBUG": "\033[36m",  # Cyan
            "INFO": "\033[32m",  # Green
            "WARNING": "\033[33m",  # Yellow
            "ERROR": "\033[31m",  # Red
            "CRITICAL": "\033[35m",  # Magenta
            "RESET": "\033[0m",  # Reset
        }

        # Format template
        self.fmt = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"

    def format(self, record: logging.LogRecord) -> str:
        """Format log record with colors"""
        # Create formatter with timestamp
        formatter = logging.Formatter(fmt=self.fmt, datefmt="%Y-%m-%d %H:%M:%S")

        # Format the message
        formatted = formatter.format(record)

        # Add colors for terminal output
        if hasattr(sys.stdout, "isatty") and sys.stdout.isatty():
            color = self.colors.get(record.levelname, "")
            reset = self.colors["RESET"]
            formatted = f"{color}{formatted}{reset}"

        return formatted


def setup_logging() -> None:
    """Setup logging configuration"""
    settings = get_settings()

    # Get log level
    log_level = getattr(logging, settings.log_level.upper(), logging.INFO)

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(BeaverFormatter())

    # Add handler to root logger
    root_logger.addHandler(console_handler)

    # Configure specific loggers
    loggers_config = {
        "uvicorn": logging.WARNING,
        "uvicorn.error": logging.INFO,
        "uvicorn.access": logging.WARNING if settings.is_production else logging.INFO,
        "fastapi": logging.INFO,
        "httpx": logging.WARNING,
        "openai": logging.WARNING,
        "anthropic": logging.WARNING,
        "langchain": logging.WARNING,
    }

    for logger_name, level in loggers_config.items():
        logger = logging.getLogger(logger_name)
        logger.setLevel(level)

    # Log configuration
    logger = logging.getLogger(__name__)
    logger.info(f"📝 Logging configured - Level: {settings.log_level}")
    logger.info(f"🔧 Environment: {settings.environment}")


def get_logger(name: str) -> logging.Logger:
    """Get logger instance with proper configuration"""
    return logging.getLogger(name)

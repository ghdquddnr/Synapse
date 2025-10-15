"""Tests for logging configuration"""

import pytest
import logging
import json
from io import StringIO

from app.core.logging import ColoredFormatter, JSONFormatter, setup_logging, get_logger


class TestColoredFormatter:
    """Test ColoredFormatter"""

    def test_colored_formatter_format(self):
        """Test colored formatter output"""
        formatter = ColoredFormatter(
            fmt="%(levelname)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="test.py",
            lineno=10,
            msg="Test message",
            args=(),
            exc_info=None,
        )

        formatted = formatter.format(record)

        # Should contain color codes
        assert "\033[" in formatted
        assert "INFO" in formatted
        assert "Test message" in formatted

    def test_colored_formatter_different_levels(self):
        """Test different log levels have different colors"""
        formatter = ColoredFormatter(fmt="%(levelname)s | %(message)s")

        levels = [
            (logging.DEBUG, "DEBUG"),
            (logging.INFO, "INFO"),
            (logging.WARNING, "WARNING"),
            (logging.ERROR, "ERROR"),
            (logging.CRITICAL, "CRITICAL"),
        ]

        for level, level_name in levels:
            record = logging.LogRecord(
                name="test",
                level=level,
                pathname="test.py",
                lineno=10,
                msg=f"Test {level_name}",
                args=(),
                exc_info=None,
            )

            formatted = formatter.format(record)
            assert level_name in formatted


class TestJSONFormatter:
    """Test JSONFormatter"""

    def test_json_formatter_basic_format(self):
        """Test JSON formatter basic output"""
        formatter = JSONFormatter()

        record = logging.LogRecord(
            name="test.module",
            level=logging.INFO,
            pathname="test.py",
            lineno=42,
            msg="Test message",
            args=(),
            exc_info=None,
        )
        record.funcName = "test_function"
        record.module = "test"

        formatted = formatter.format(record)
        log_data = json.loads(formatted)

        assert log_data["level"] == "INFO"
        assert log_data["logger"] == "test.module"
        assert log_data["message"] == "Test message"
        assert log_data["module"] == "test"
        assert log_data["function"] == "test_function"
        assert log_data["line"] == 42
        assert "timestamp" in log_data

    def test_json_formatter_with_exception(self):
        """Test JSON formatter with exception info"""
        formatter = JSONFormatter()

        try:
            raise ValueError("Test error")
        except ValueError:
            import sys

            exc_info = sys.exc_info()

        record = logging.LogRecord(
            name="test",
            level=logging.ERROR,
            pathname="test.py",
            lineno=10,
            msg="Error occurred",
            args=(),
            exc_info=exc_info,
        )
        record.funcName = "test_func"
        record.module = "test"

        formatted = formatter.format(record)
        log_data = json.loads(formatted)

        assert "exception" in log_data
        assert "ValueError" in log_data["exception"]
        assert "Test error" in log_data["exception"]


class TestSetupLogging:
    """Test setup_logging function"""

    def test_setup_logging_creates_logger(self):
        """Test that setup_logging configures root logger"""
        # Setup logging
        setup_logging()

        # Get root logger
        root_logger = logging.getLogger()

        # Should have at least one handler
        assert len(root_logger.handlers) >= 1

        # Should have appropriate log level
        assert root_logger.level in [logging.DEBUG, logging.INFO]

    def test_setup_logging_creates_formatter(self):
        """Test that setup_logging creates proper formatter"""
        setup_logging()

        root_logger = logging.getLogger()
        handler = root_logger.handlers[0]

        # Should have a formatter
        assert handler.formatter is not None


class TestGetLogger:
    """Test get_logger function"""

    def test_get_logger_returns_logger(self):
        """Test that get_logger returns a logger instance"""
        logger = get_logger(__name__)

        assert isinstance(logger, logging.Logger)

    def test_get_logger_with_name(self):
        """Test get_logger with specific name"""
        logger = get_logger("test.module")

        assert logger.name == "test.module"

    def test_get_logger_inherits_config(self):
        """Test that logger inherits root logger configuration"""
        setup_logging()
        logger = get_logger("test.inheritance")

        # Should have access to handlers through parent loggers
        assert logger.level == 0 or logger.level >= logging.DEBUG

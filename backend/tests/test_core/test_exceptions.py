"""Tests for custom exceptions"""

import pytest
from fastapi import status

from app.core.exceptions import (
    SynapseException,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    ValidationError,
    RateLimitError,
    DatabaseError,
    ExternalServiceError,
    SyncError,
)


class TestSynapseException:
    """Test base SynapseException"""

    def test_base_exception_creation(self):
        """Test creating base exception"""
        exc = SynapseException("Test error", status_code=500, details={"key": "value"})

        assert exc.message == "Test error"
        assert exc.status_code == 500
        assert exc.details == {"key": "value"}
        assert str(exc) == "Test error"

    def test_base_exception_default_values(self):
        """Test base exception with default values"""
        exc = SynapseException("Test error")

        assert exc.message == "Test error"
        assert exc.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert exc.details == {}


class TestAuthenticationError:
    """Test AuthenticationError"""

    def test_authentication_error_creation(self):
        """Test creating authentication error"""
        exc = AuthenticationError("Invalid credentials")

        assert exc.message == "Invalid credentials"
        assert exc.status_code == status.HTTP_401_UNAUTHORIZED
        assert exc.details == {}

    def test_authentication_error_with_details(self):
        """Test authentication error with details"""
        details = {"reason": "token_expired"}
        exc = AuthenticationError("Token expired", details=details)

        assert exc.message == "Token expired"
        assert exc.details == details

    def test_authentication_error_default_message(self):
        """Test authentication error with default message"""
        exc = AuthenticationError()

        assert exc.message == "Authentication failed"
        assert exc.status_code == status.HTTP_401_UNAUTHORIZED


class TestAuthorizationError:
    """Test AuthorizationError"""

    def test_authorization_error_creation(self):
        """Test creating authorization error"""
        exc = AuthorizationError("Access denied")

        assert exc.message == "Access denied"
        assert exc.status_code == status.HTTP_403_FORBIDDEN

    def test_authorization_error_default_message(self):
        """Test authorization error with default message"""
        exc = AuthorizationError()

        assert exc.message == "Insufficient permissions"


class TestNotFoundError:
    """Test NotFoundError"""

    def test_not_found_error_creation(self):
        """Test creating not found error"""
        exc = NotFoundError("Note")

        assert exc.message == "Note not found"
        assert exc.status_code == status.HTTP_404_NOT_FOUND

    def test_not_found_error_default_resource(self):
        """Test not found error with default resource"""
        exc = NotFoundError()

        assert exc.message == "Resource not found"

    def test_not_found_error_with_details(self):
        """Test not found error with details"""
        details = {"note_id": "12345"}
        exc = NotFoundError("Note", details=details)

        assert exc.details == details


class TestConflictError:
    """Test ConflictError"""

    def test_conflict_error_creation(self):
        """Test creating conflict error"""
        exc = ConflictError("Email already exists")

        assert exc.message == "Email already exists"
        assert exc.status_code == status.HTTP_409_CONFLICT

    def test_conflict_error_default_message(self):
        """Test conflict error with default message"""
        exc = ConflictError()

        assert exc.message == "Resource conflict"


class TestValidationError:
    """Test ValidationError"""

    def test_validation_error_creation(self):
        """Test creating validation error"""
        exc = ValidationError("Invalid email format")

        assert exc.message == "Invalid email format"
        assert exc.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_validation_error_with_details(self):
        """Test validation error with field details"""
        details = {"field": "email", "error": "invalid_format"}
        exc = ValidationError("Invalid email format", details=details)

        assert exc.details == details


class TestRateLimitError:
    """Test RateLimitError"""

    def test_rate_limit_error_creation(self):
        """Test creating rate limit error"""
        exc = RateLimitError("Too many requests", retry_after=60)

        assert exc.message == "Too many requests"
        assert exc.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert exc.details["retry_after"] == 60

    def test_rate_limit_error_default_message(self):
        """Test rate limit error with default message"""
        exc = RateLimitError()

        assert exc.message == "Rate limit exceeded"

    def test_rate_limit_error_without_retry_after(self):
        """Test rate limit error without retry_after"""
        exc = RateLimitError()

        assert exc.details == {}


class TestDatabaseError:
    """Test DatabaseError"""

    def test_database_error_creation(self):
        """Test creating database error"""
        exc = DatabaseError("Connection failed")

        assert exc.message == "Connection failed"
        assert exc.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    def test_database_error_default_message(self):
        """Test database error with default message"""
        exc = DatabaseError()

        assert exc.message == "Database operation failed"


class TestExternalServiceError:
    """Test ExternalServiceError"""

    def test_external_service_error_creation(self):
        """Test creating external service error"""
        exc = ExternalServiceError("Redis", "Connection timeout")

        assert exc.message == "Redis: Connection timeout"
        assert exc.status_code == status.HTTP_503_SERVICE_UNAVAILABLE

    def test_external_service_error_with_details(self):
        """Test external service error with details"""
        details = {"timeout": 5000}
        exc = ExternalServiceError("AI Model", "Timeout", details=details)

        assert "AI Model" in exc.message
        assert exc.details == details


class TestSyncError:
    """Test SyncError"""

    def test_sync_error_creation(self):
        """Test creating sync error"""
        exc = SyncError("Conflict resolution failed")

        assert exc.message == "Conflict resolution failed"
        assert exc.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    def test_sync_error_default_message(self):
        """Test sync error with default message"""
        exc = SyncError()

        assert exc.message == "Sync operation failed"

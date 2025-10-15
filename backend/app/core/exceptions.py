"""Custom exceptions for Synapse API"""

from typing import Any, Optional
from fastapi import HTTPException, status


class SynapseException(Exception):
    """Base exception for all Synapse-specific errors"""

    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[dict[str, Any]] = None,
    ):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class AuthenticationError(SynapseException):
    """Raised when authentication fails"""

    def __init__(self, message: str = "Authentication failed", details: Optional[dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details,
        )


class AuthorizationError(SynapseException):
    """Raised when user lacks permission for requested resource"""

    def __init__(self, message: str = "Insufficient permissions", details: Optional[dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            details=details,
        )


class NotFoundError(SynapseException):
    """Raised when requested resource is not found"""

    def __init__(self, resource: str = "Resource", details: Optional[dict[str, Any]] = None):
        super().__init__(
            message=f"{resource} not found",
            status_code=status.HTTP_404_NOT_FOUND,
            details=details,
        )


class ConflictError(SynapseException):
    """Raised when there's a conflict with existing resource"""

    def __init__(self, message: str = "Resource conflict", details: Optional[dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            details=details,
        )


class ValidationError(SynapseException):
    """Raised when input validation fails"""

    def __init__(self, message: str = "Validation failed", details: Optional[dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
        )


class RateLimitError(SynapseException):
    """Raised when rate limit is exceeded"""

    def __init__(self, message: str = "Rate limit exceeded", retry_after: Optional[int] = None):
        details = {"retry_after": retry_after} if retry_after else {}
        super().__init__(
            message=message,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            details=details,
        )


class DatabaseError(SynapseException):
    """Raised when database operation fails"""

    def __init__(self, message: str = "Database operation failed", details: Optional[dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details,
        )


class ExternalServiceError(SynapseException):
    """Raised when external service (AI, Redis, etc.) fails"""

    def __init__(self, service: str, message: str = "Service unavailable", details: Optional[dict[str, Any]] = None):
        super().__init__(
            message=f"{service}: {message}",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details=details,
        )


class SyncError(SynapseException):
    """Raised when sync operation fails"""

    def __init__(self, message: str = "Sync operation failed", details: Optional[dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details,
        )

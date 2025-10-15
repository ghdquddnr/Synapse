"""Core utilities package (security, dependencies, logging, exceptions)"""

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_token,
    get_token_expiration,
)

from app.core.deps import (
    get_db,
    get_current_user,
    get_current_active_user,
    get_optional_current_user,
)

from app.core.logging import (
    setup_logging,
    get_logger,
)

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

from app.core.middleware import (
    RequestLoggingMiddleware,
    PerformanceMonitoringMiddleware,
)

__all__ = [
    # Security
    "hash_password",
    "verify_password",
    "create_access_token",
    "create_refresh_token",
    "verify_token",
    "get_token_expiration",
    # Dependencies
    "get_db",
    "get_current_user",
    "get_current_active_user",
    "get_optional_current_user",
    # Logging
    "setup_logging",
    "get_logger",
    # Exceptions
    "SynapseException",
    "AuthenticationError",
    "AuthorizationError",
    "NotFoundError",
    "ConflictError",
    "ValidationError",
    "RateLimitError",
    "DatabaseError",
    "ExternalServiceError",
    "SyncError",
    # Middleware
    "RequestLoggingMiddleware",
    "PerformanceMonitoringMiddleware",
]

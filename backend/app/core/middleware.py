"""Middleware for request/response logging and error handling"""

import time
import uuid
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.logging import get_logger

logger = get_logger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all HTTP requests and responses"""

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Log incoming request and outgoing response.

        Args:
            request: FastAPI request object
            call_next: Next middleware/endpoint

        Returns:
            Response: HTTP response
        """
        # Generate request ID for tracing
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        # Record start time
        start_time = time.time()

        # Log request
        logger.info(
            f"Request started",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "query_params": str(request.query_params),
                "client_ip": request.client.host if request.client else None,
            },
        )

        # Process request
        try:
            response = await call_next(request)
        except Exception as e:
            # Log unhandled exceptions
            duration = time.time() - start_time
            logger.error(
                f"Request failed with unhandled exception",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "duration_ms": round(duration * 1000, 2),
                    "exception": str(e),
                },
                exc_info=True,
            )
            raise

        # Calculate duration
        duration = time.time() - start_time

        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id

        # Log response
        logger.info(
            f"Request completed",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": round(duration * 1000, 2),
            },
        )

        return response


class PerformanceMonitoringMiddleware(BaseHTTPMiddleware):
    """Middleware to monitor and log slow requests"""

    def __init__(self, app: ASGIApp, slow_request_threshold_ms: float = 1000.0):
        """
        Initialize performance monitoring.

        Args:
            app: ASGI application
            slow_request_threshold_ms: Threshold in milliseconds for slow request warning
        """
        super().__init__(app)
        self.slow_request_threshold_ms = slow_request_threshold_ms

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Monitor request performance and log slow requests.

        Args:
            request: FastAPI request object
            call_next: Next middleware/endpoint

        Returns:
            Response: HTTP response
        """
        start_time = time.time()
        response = await call_next(request)
        duration = time.time() - start_time
        duration_ms = duration * 1000

        # Warn on slow requests
        if duration_ms > self.slow_request_threshold_ms:
            logger.warning(
                f"Slow request detected",
                extra={
                    "request_id": getattr(request.state, "request_id", None),
                    "method": request.method,
                    "path": request.url.path,
                    "duration_ms": round(duration_ms, 2),
                    "threshold_ms": self.slow_request_threshold_ms,
                },
            )

        # Add performance header
        response.headers["X-Response-Time"] = f"{round(duration_ms, 2)}ms"

        return response

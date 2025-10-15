"""Tests for API error handling and middleware"""

import pytest
from fastapi import FastAPI, HTTPException, Depends
from fastapi.testclient import TestClient

from app.core.exceptions import (
    AuthenticationError,
    NotFoundError,
    ValidationError,
    DatabaseError,
)
from app.core.middleware import RequestLoggingMiddleware, PerformanceMonitoringMiddleware


@pytest.fixture
def test_app():
    """Create a test FastAPI app with error handlers"""
    from fastapi import Request
    from fastapi.responses import JSONResponse
    from fastapi.exceptions import RequestValidationError
    from sqlalchemy.exc import SQLAlchemyError
    from app.core.exceptions import SynapseException

    app = FastAPI()

    # Add middlewares
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(PerformanceMonitoringMiddleware, slow_request_threshold_ms=100.0)

    # Exception handlers
    @app.exception_handler(SynapseException)
    async def synapse_exception_handler(request: Request, exc: SynapseException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "message": exc.message,
                    "type": exc.__class__.__name__,
                    "details": exc.details,
                }
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "message": "Validation failed",
                    "type": "RequestValidationError",
                    "details": exc.errors(),
                }
            },
        )

    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "message": "Database operation failed",
                    "type": "DatabaseError",
                    "details": {},
                }
            },
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "message": str(exc),
                    "type": "InternalServerError",
                    "details": {},
                }
            },
        )

    # Test endpoints
    @app.get("/health")
    async def health():
        return {"status": "ok"}

    @app.get("/error/authentication")
    async def error_authentication():
        raise AuthenticationError("Invalid token")

    @app.get("/error/not-found")
    async def error_not_found():
        raise NotFoundError("Note")

    @app.get("/error/validation")
    async def error_validation():
        raise ValidationError("Invalid input", details={"field": "email"})

    @app.get("/error/database")
    async def error_database():
        raise DatabaseError("Connection failed")

    @app.get("/error/generic")
    async def error_generic():
        raise Exception("Something went wrong")

    @app.get("/slow")
    async def slow_endpoint():
        import time

        time.sleep(0.15)  # 150ms - should trigger slow request warning
        return {"status": "completed"}

    return app


@pytest.fixture
def client(test_app):
    """Create test client"""
    return TestClient(test_app)


class TestMiddleware:
    """Test middleware functionality"""

    def test_request_logging_middleware_adds_headers(self, client):
        """Test that request logging middleware adds X-Request-ID header"""
        response = client.get("/health")

        assert response.status_code == 200
        assert "X-Request-ID" in response.headers
        assert "X-Response-Time" in response.headers

    def test_performance_monitoring_adds_response_time(self, client):
        """Test that performance monitoring adds response time header"""
        response = client.get("/health")

        assert "X-Response-Time" in response.headers
        assert "ms" in response.headers["X-Response-Time"]

    def test_slow_request_detection(self, client):
        """Test that slow requests are detected (log check would be in integration tests)"""
        response = client.get("/slow")

        assert response.status_code == 200
        assert "X-Response-Time" in response.headers
        # Response time should be > 100ms
        response_time_str = response.headers["X-Response-Time"].replace("ms", "")
        response_time = float(response_time_str)
        assert response_time > 100.0


class TestExceptionHandlers:
    """Test exception handlers"""

    def test_authentication_error_handler(self, client):
        """Test AuthenticationError is handled correctly"""
        response = client.get("/error/authentication")

        assert response.status_code == 401
        data = response.json()
        assert data["error"]["message"] == "Invalid token"
        assert data["error"]["type"] == "AuthenticationError"

    def test_not_found_error_handler(self, client):
        """Test NotFoundError is handled correctly"""
        response = client.get("/error/not-found")

        assert response.status_code == 404
        data = response.json()
        assert data["error"]["message"] == "Note not found"
        assert data["error"]["type"] == "NotFoundError"

    def test_validation_error_handler(self, client):
        """Test ValidationError is handled correctly"""
        response = client.get("/error/validation")

        assert response.status_code == 422
        data = response.json()
        assert data["error"]["message"] == "Invalid input"
        assert data["error"]["type"] == "ValidationError"
        assert data["error"]["details"]["field"] == "email"

    def test_database_error_handler(self, client):
        """Test DatabaseError is handled correctly"""
        response = client.get("/error/database")

        assert response.status_code == 500
        data = response.json()
        assert data["error"]["message"] == "Connection failed"
        assert data["error"]["type"] == "DatabaseError"

    def test_generic_error_handler(self, client):
        """Test generic Exception is handled correctly"""
        response = client.get("/error/generic")

        assert response.status_code == 500
        data = response.json()
        assert data["error"]["message"] == "Something went wrong"
        assert data["error"]["type"] == "InternalServerError"

    def test_404_not_found_route(self, client):
        """Test non-existent route returns 404"""
        response = client.get("/non-existent-route")

        assert response.status_code == 404


class TestErrorResponseFormat:
    """Test error response format consistency"""

    def test_error_response_has_standard_format(self, client):
        """Test all errors follow standard format"""
        response = client.get("/error/authentication")

        data = response.json()
        assert "error" in data
        assert "message" in data["error"]
        assert "type" in data["error"]
        assert "details" in data["error"]

    def test_error_details_are_included(self, client):
        """Test error details are included when provided"""
        response = client.get("/error/validation")

        data = response.json()
        assert data["error"]["details"] is not None
        assert "field" in data["error"]["details"]

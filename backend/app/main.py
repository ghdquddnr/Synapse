"""FastAPI application entry point"""

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from sqlalchemy.exc import SQLAlchemyError

from app.config import settings
from app.database import check_db_connection
from app.core.logging import setup_logging, get_logger
from app.core.exceptions import SynapseException
from app.core.middleware import RequestLoggingMiddleware, PerformanceMonitoringMiddleware

# Setup logging
setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info(f"Starting Synapse API v{settings.VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")

    # Check database connection
    if check_db_connection():
        logger.info("Database connection successful")
    else:
        logger.error("Database connection failed")

    yield

    # Shutdown
    logger.info("Shutting down Synapse API")


app = FastAPI(
    title="Synapse API",
    description="Intelligent note-taking app with AI-powered recommendations",
    version=settings.VERSION,
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom middlewares
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(PerformanceMonitoringMiddleware, slow_request_threshold_ms=1000.0)


# Exception Handlers
@app.exception_handler(SynapseException)
async def synapse_exception_handler(request: Request, exc: SynapseException):
    """Handle custom Synapse exceptions"""
    logger.error(
        f"SynapseException: {exc.message}",
        extra={
            "request_id": getattr(request.state, "request_id", None),
            "path": request.url.path,
            "status_code": exc.status_code,
            "details": exc.details,
        },
    )

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
    """Handle Pydantic validation errors"""
    logger.warning(
        f"Validation error",
        extra={
            "request_id": getattr(request.state, "request_id", None),
            "path": request.url.path,
            "errors": exc.errors(),
        },
    )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
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
    """Handle SQLAlchemy database errors"""
    logger.error(
        f"Database error: {str(exc)}",
        extra={
            "request_id": getattr(request.state, "request_id", None),
            "path": request.url.path,
        },
        exc_info=True,
    )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
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
    """Handle all other unhandled exceptions"""
    logger.critical(
        f"Unhandled exception: {str(exc)}",
        extra={
            "request_id": getattr(request.state, "request_id", None),
            "path": request.url.path,
        },
        exc_info=True,
    )

    # Don't expose internal error details in production
    error_message = str(exc) if settings.DEBUG else "Internal server error"

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "message": error_message,
                "type": "InternalServerError",
                "details": {},
            }
        },
    )


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "Synapse API",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }


@app.get("/health")
async def health_check():
    """Detailed health check endpoint"""
    db_status = "connected" if check_db_connection() else "disconnected"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "redis": "connected",  # TODO: Add actual Redis health check
    }


# Register API routers
from app.api import auth, recommend, reports

app.include_router(auth.router)
app.include_router(recommend.router)
app.include_router(reports.router)

# TODO: Register remaining routers
# from app.api import sync
# app.include_router(sync.router, prefix="/sync", tags=["sync"])

"""FastAPI application entry point"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import check_db_connection


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print(f"Starting Synapse API v{settings.VERSION}")
    print(f"Environment: {settings.ENVIRONMENT}")
    yield
    # Shutdown
    print("Shutting down Synapse API")


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


# TODO: Register API routers
# from app.api import auth, sync, recommend, reports
# app.include_router(auth.router, prefix="/auth", tags=["auth"])
# app.include_router(sync.router, prefix="/sync", tags=["sync"])
# app.include_router(recommend.router, prefix="/recommend", tags=["recommend"])
# app.include_router(reports.router, prefix="/reports", tags=["reports"])

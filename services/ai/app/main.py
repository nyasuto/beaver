"""
Beaver AI Services - FastAPI Application

Main entry point for the AI processing API server.
Provides endpoints for summarization, classification, and other AI-powered features.
"""

import logging
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
import uvicorn

from app.core.config import get_settings
from app.core.logging import setup_logging
from app.routers import health, summarization, classification


# Setup logging
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("🚀 Beaver AI Services starting up...")
    settings = get_settings()
    
    # Startup tasks
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"API Version: {settings.api_version}")
    
    yield
    
    # Shutdown tasks
    logger.info("🛑 Beaver AI Services shutting down...")


def create_app() -> FastAPI:
    """Create and configure FastAPI application"""
    settings = get_settings()
    
    app = FastAPI(
        title="🦫 Beaver AI Services",
        description="AI processing services for knowledge dam construction",
        version=settings.api_version,
        docs_url="/docs" if settings.environment != "production" else None,
        redoc_url="/redoc" if settings.environment != "production" else None,
        lifespan=lifespan,
    )
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include routers
    app.include_router(health.router, prefix="/api/v1/health", tags=["health"])
    app.include_router(summarization.router, prefix="/api/v1/summarize", tags=["ai"])
    app.include_router(classification.router, prefix="/api/v1/classify", tags=["ai"])
    
    @app.get("/", include_in_schema=False)
    async def root():
        """Redirect root to docs"""
        return RedirectResponse(url="/docs")
    
    @app.get("/api", include_in_schema=False)
    async def api_root():
        """API root endpoint"""
        return {
            "message": "🦫 Beaver AI Services API",
            "version": settings.api_version,
            "docs": "/docs",
            "health": "/api/v1/health",
        }
    
    return app


# Create app instance
app = create_app()


def main():
    """Main entry point for running the server"""
    settings = get_settings()
    
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.environment == "development",
        log_level=settings.log_level.lower(),
        access_log=True,
    )


if __name__ == "__main__":
    main()
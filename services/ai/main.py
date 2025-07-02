"""
AI Classification Service - FastAPI Application

GitHub Issues自動分類用のPython AIサービス
"""

import logging
import time
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Optional

import structlog
import uvicorn
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import get_settings
from models.classification import (
    BatchClassificationRequest,
    BatchClassificationResponse,
    BatchSummary,
    ClassificationRequest,
    ClassificationResponse,
    HealthResponse,
)
from services.classifier import ClassificationService

# Configure structured logging
structlog.configure(
    processors=[structlog.processors.TimeStamper(fmt="iso"), structlog.dev.ConsoleRenderer()],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Global classification service instance
classification_service: Optional[ClassificationService] = None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager"""
    global classification_service

    # Startup
    logger.info("Starting AI Classification Service...")
    settings = get_settings()

    try:
        classification_service = ClassificationService(settings)
        await classification_service.initialize()
        logger.info("Classification service initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize classification service: {e}")
        raise

    yield

    # Shutdown
    logger.info("Shutting down AI Classification Service...")
    if classification_service:
        await classification_service.cleanup()


def create_app() -> FastAPI:
    """Create FastAPI application"""
    settings = get_settings()

    app = FastAPI(
        title="AI Classification Service",
        description="GitHub Issues自動分類用のPython AIサービス",
        version="1.0.0",
        lifespan=lifespan,
        debug=settings.debug,
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # 本番では制限する
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    return app


# Create FastAPI app
app = create_app()


def get_classification_service() -> ClassificationService:
    """Dependency injection for classification service"""
    if classification_service is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Classification service not initialized",
        )
    return classification_service


@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check endpoint"""
    try:
        service = get_classification_service()
        is_healthy = await service.health_check()

        return HealthResponse(
            status="healthy" if is_healthy else "unhealthy",
            model_loaded=service.is_model_loaded(),
            api_accessible=service.is_api_accessible(),
            memory_usage_mb=service.get_memory_usage(),
            uptime_seconds=int(time.time() - service.start_time),
            version="1.0.0",
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return HealthResponse(
            status="unhealthy", model_loaded=False, api_accessible=False, version="1.0.0"
        )


@app.post("/classify", response_model=ClassificationResponse)
async def classify_issue(
    request: ClassificationRequest,
    service: ClassificationService = Depends(get_classification_service),
) -> ClassificationResponse:
    """Classify a single GitHub Issue"""
    start_time = time.time()

    try:
        logger.info(f"Classifying issue {request.issue.id}: {request.issue.title}")

        result = await service.classify_issue(request.issue, request.config)

        processing_time = int((time.time() - start_time) * 1000)

        response = ClassificationResponse(
            category=result.category,
            confidence=result.confidence,
            reasoning=result.reasoning,
            suggested_tags=result.suggested_tags,
            processing_time_ms=processing_time,
            model_used=result.model_used,
            timestamp=datetime.now(),
        )

        logger.info(
            "Classification completed",
            issue_id=request.issue.id,
            category=result.category,
            confidence=result.confidence,
            processing_time_ms=processing_time,
        )

        return response

    except Exception as e:
        logger.error(f"Classification failed for issue {request.issue.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Classification failed: {str(e)}",
        )


@app.post("/batch-classify", response_model=BatchClassificationResponse)
async def batch_classify_issues(
    request: BatchClassificationRequest,
    service: ClassificationService = Depends(get_classification_service),
) -> BatchClassificationResponse:
    """Classify multiple GitHub Issues in batch"""
    start_time = time.time()

    try:
        logger.info(f"Starting batch classification for {len(request.issues)} issues")

        results = await service.batch_classify_issues(
            request.issues, request.config, parallel=request.parallel_processing
        )

        processing_time = int((time.time() - start_time) * 1000)

        # Calculate summary statistics
        successful = len([r for r in results if r is not None])
        failed = len(results) - successful
        avg_confidence = sum(r.confidence for r in results if r is not None) / max(successful, 1)

        summary = BatchSummary(
            total_processed=len(request.issues),
            successful=successful,
            failed=failed,
            average_confidence=avg_confidence,
            processing_time_ms=processing_time,
        )

        response = BatchClassificationResponse(
            results=results,
            summary=summary,
            timestamp=datetime.now(),
        )

        logger.info(
            "Batch classification completed",
            total=len(request.issues),
            successful=successful,
            failed=failed,
            avg_confidence=avg_confidence,
            processing_time_ms=processing_time,
        )

        return response

    except Exception as e:
        logger.error(f"Batch classification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch classification failed: {str(e)}",
        )


@app.exception_handler(Exception)
async def global_exception_handler(request: Any, exc: Exception) -> JSONResponse:
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )

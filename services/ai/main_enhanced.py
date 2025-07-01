"""
Enhanced AI Classification Service - FastAPI Application

拡張トピックモデル統合版のFastAPI アプリケーション
- Few-shot学習対応
- 分類精度評価
- 性能最適化
"""

import logging
import time
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Optional

import structlog
import uvicorn
from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from config import get_settings
from evaluation.accuracy_evaluator import AccuracyEvaluator, create_accuracy_evaluator
from models.classification import (
    BatchClassificationRequest,
    Issue,
)
from services.enhanced_classifier import EnhancedClassificationService

# Configure structured logging
structlog.configure(
    processors=[structlog.processors.TimeStamper(fmt="iso"), structlog.dev.ConsoleRenderer()],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Global service instances
enhanced_classification_service: EnhancedClassificationService = None
accuracy_evaluator: AccuracyEvaluator = None


# Enhanced API Models
class EnhancedClassificationRequest(BaseModel):
    """拡張分類リクエスト"""

    issue: Issue
    config: Optional[dict] = None
    use_few_shot: bool = True
    language_hint: Optional[str] = None


class EvaluationRequest(BaseModel):
    """評価リクエスト"""

    run_full_evaluation: bool = True
    include_trends: bool = True


class PerformanceResponse(BaseModel):
    """性能レスポンス"""

    status: str
    total_classifications: int
    average_response_time_ms: float
    average_confidence: float
    high_confidence_ratio: float
    target_response_time_met: float
    timestamp: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global enhanced_classification_service, accuracy_evaluator

    # Startup
    logger.info("Starting Enhanced AI Classification Service...")
    settings = get_settings()

    try:
        # 拡張分類サービス初期化
        enhanced_classification_service = EnhancedClassificationService(settings)
        await enhanced_classification_service.initialize()

        # 精度評価システム初期化
        accuracy_evaluator = create_accuracy_evaluator(enhanced_classification_service)
        accuracy_evaluator.create_benchmark_test_cases()

        logger.info("Enhanced Classification Service initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize enhanced services: {e}")
        raise

    yield

    # Shutdown
    logger.info("Shutting down Enhanced AI Classification Service...")
    if enhanced_classification_service:
        await enhanced_classification_service.cleanup()


def create_app() -> FastAPI:
    """Create Enhanced FastAPI application"""
    settings = get_settings()

    app = FastAPI(
        title="Enhanced AI Classification Service",
        description="GitHub Issues自動分類用の拡張Python AIサービス（トピックモデル統合）",
        version="2.0.0",
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


# Create Enhanced FastAPI app
app = create_app()


def get_enhanced_classification_service() -> EnhancedClassificationService:
    """Enhanced classification service dependency"""
    if enhanced_classification_service is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Enhanced classification service not initialized",
        )
    return enhanced_classification_service


def get_accuracy_evaluator() -> AccuracyEvaluator:
    """Accuracy evaluator dependency"""
    if accuracy_evaluator is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Accuracy evaluator not initialized",
        )
    return accuracy_evaluator


# Enhanced API Endpoints


@app.get("/health/enhanced", response_model=dict)
async def enhanced_health_check() -> dict[str, Any]:
    """拡張ヘルスチェック"""
    try:
        service = get_enhanced_classification_service()
        health_status = await service.health_check_enhanced()

        if health_status.get("status") == "healthy":
            return JSONResponse(content=health_status, status_code=200)
        else:
            return JSONResponse(content=health_status, status_code=503)

    except Exception as e:
        logger.error(f"Enhanced health check failed: {e}")
        return JSONResponse(
            content={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
            },
            status_code=503,
        )


@app.post("/classify/enhanced", response_model=dict)
async def classify_issue_enhanced(
    request: EnhancedClassificationRequest,
    service: EnhancedClassificationService = Depends(get_enhanced_classification_service),
) -> dict[str, Any]:
    """拡張Issue分類（Few-shot学習対応）"""
    start_time = time.time()

    try:
        logger.info(
            f"Enhanced classification request for issue {request.issue.id}",
            use_few_shot=request.use_few_shot,
            language_hint=request.language_hint,
        )

        result = await service.classify_issue_enhanced(
            request.issue,
            config=None,  # TODO: config conversion
            use_few_shot=request.use_few_shot,
        )

        processing_time = int((time.time() - start_time) * 1000)

        response = {
            "issue_id": result.issue_id,
            "category": result.category,
            "confidence": result.confidence,
            "reasoning": result.reasoning,
            "suggested_tags": result.suggested_tags,
            "processing_time_ms": processing_time,
            "enhanced_features": {
                "few_shot_enabled": request.use_few_shot,
                "topic_model_version": "2.0.0",
                "optimization_level": "high",
            },
            "timestamp": datetime.now().isoformat(),
        }

        logger.info(
            "Enhanced classification completed",
            issue_id=request.issue.id,
            category=result.category,
            confidence=result.confidence,
            processing_time_ms=processing_time,
        )

        return response

    except Exception as e:
        logger.error(f"Enhanced classification failed for issue {request.issue.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Enhanced classification failed: {str(e)}",
        )


@app.post("/classify/batch-enhanced", response_model=dict)
async def batch_classify_issues_enhanced(
    request: BatchClassificationRequest,
    use_few_shot: bool = Query(default=True, description="Few-shot学習を使用するか"),
    service: EnhancedClassificationService = Depends(get_enhanced_classification_service),
) -> dict[str, Any]:
    """拡張バッチIssue分類"""
    start_time = time.time()

    try:
        logger.info(
            f"Enhanced batch classification request for {len(request.issues)} issues",
            use_few_shot=use_few_shot,
            parallel_processing=request.parallel_processing,
        )

        results = await service.batch_classify_issues_enhanced(
            request.issues,
            config=request.config,
            parallel=request.parallel_processing,
            use_few_shot=use_few_shot,
        )

        processing_time = int((time.time() - start_time) * 1000)

        # サマリ統計の計算
        successful_results = [r for r in results if r is not None]
        failed_count = len(results) - len(successful_results)

        avg_confidence = (
            sum(r.confidence for r in successful_results) / len(successful_results)
            if successful_results
            else 0.0
        )
        high_confidence_count = len([r for r in successful_results if r.confidence >= 0.8])

        response = {
            "results": [
                {
                    "issue_id": r.issue_id,
                    "category": r.category,
                    "confidence": r.confidence,
                    "reasoning": r.reasoning,
                    "suggested_tags": r.suggested_tags,
                    "processing_time_ms": r.processing_time_ms,
                }
                if r
                else None
                for r in results
            ],
            "summary": {
                "total_issues": len(request.issues),
                "successful_classifications": len(successful_results),
                "failed_classifications": failed_count,
                "average_confidence": round(avg_confidence, 3),
                "high_confidence_count": high_confidence_count,
                "high_confidence_ratio": round(high_confidence_count / len(successful_results), 3)
                if successful_results
                else 0.0,
                "batch_processing_time_ms": processing_time,
                "average_per_issue_ms": processing_time // max(len(request.issues), 1),
            },
            "enhanced_features": {
                "few_shot_enabled": use_few_shot,
                "topic_model_version": "2.0.0",
                "parallel_processing": request.parallel_processing,
            },
            "timestamp": datetime.now().isoformat(),
        }

        logger.info(
            "Enhanced batch classification completed",
            total_issues=len(request.issues),
            successful=len(successful_results),
            failed=failed_count,
            avg_confidence=avg_confidence,
            processing_time_ms=processing_time,
        )

        return response

    except Exception as e:
        logger.error(f"Enhanced batch classification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Enhanced batch classification failed: {str(e)}",
        )


@app.get("/performance", response_model=PerformanceResponse)
async def get_performance_metrics(
    service: EnhancedClassificationService = Depends(get_enhanced_classification_service),
) -> PerformanceResponse:
    """性能メトリクスの取得"""
    try:
        performance_summary = service.get_performance_summary()

        if performance_summary.get("status") == "no_data":
            return PerformanceResponse(
                status="no_data",
                total_classifications=0,
                average_response_time_ms=0.0,
                average_confidence=0.0,
                high_confidence_ratio=0.0,
                target_response_time_met=0.0,
                timestamp=datetime.now().isoformat(),
            )

        return PerformanceResponse(
            status="ok",
            total_classifications=performance_summary["total_classifications"],
            average_response_time_ms=performance_summary["average_response_time_ms"],
            average_confidence=performance_summary["average_confidence"],
            high_confidence_ratio=performance_summary["high_confidence_ratio"],
            target_response_time_met=performance_summary["target_response_time_met"],
            timestamp=performance_summary["last_updated"],
        )

    except Exception as e:
        logger.error(f"Failed to get performance metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get performance metrics: {str(e)}",
        )


@app.post("/evaluation/run", response_model=dict)
async def run_accuracy_evaluation(
    request: EvaluationRequest, evaluator: AccuracyEvaluator = Depends(get_accuracy_evaluator)
) -> dict[str, Any]:
    """分類精度評価の実行"""
    try:
        logger.info("Starting accuracy evaluation", full_evaluation=request.run_full_evaluation)

        if request.run_full_evaluation:
            metrics = await evaluator.run_comprehensive_evaluation()

            response = {
                "evaluation_completed": True,
                "metrics": {
                    "accuracy": metrics.accuracy,
                    "average_f1_score": metrics.average_f1_score,
                    "precision_per_category": metrics.precision_per_category,
                    "recall_per_category": metrics.recall_per_category,
                    "f1_score_per_category": metrics.f1_score_per_category,
                    "average_response_time_ms": metrics.average_response_time_ms,
                    "total_classified": metrics.total_classified,
                },
                "targets_met": {
                    "accuracy_target": metrics.accuracy >= 0.80,
                    "f1_target": metrics.average_f1_score >= 0.75,
                    "response_time_target": metrics.average_response_time_ms <= 3000,
                },
                "timestamp": metrics.timestamp.isoformat(),
            }

            if request.include_trends:
                trends = evaluator.get_evaluation_trends()
                response["trends"] = trends

            return response
        else:
            # 軽量評価
            return {
                "evaluation_completed": False,
                "message": "Light evaluation not implemented yet",
                "timestamp": datetime.now().isoformat(),
            }

    except Exception as e:
        logger.error(f"Accuracy evaluation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Accuracy evaluation failed: {str(e)}",
        )


@app.get("/evaluation/trends", response_model=dict)
async def get_evaluation_trends(
    evaluator: AccuracyEvaluator = Depends(get_accuracy_evaluator),
) -> dict[str, Any]:
    """評価傾向の取得"""
    try:
        trends = evaluator.get_evaluation_trends()
        return trends

    except Exception as e:
        logger.error(f"Failed to get evaluation trends: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get evaluation trends: {str(e)}",
        )


@app.get("/categories/enhanced", response_model=dict)
async def get_enhanced_categories() -> dict[str, Any]:
    """拡張カテゴリ情報の取得"""
    try:
        service = get_enhanced_classification_service()
        categories = service.topic_model.enhanced_categories

        enhanced_info = {}
        for cat_id, cat_info in categories.items():
            enhanced_info[cat_id] = {
                "name_ja": cat_info["name_ja"],
                "name_en": cat_info["name_en"],
                "description_ja": cat_info["description_ja"],
                "description_en": cat_info["description_en"],
                "keywords_ja": cat_info["keywords_ja"],
                "keywords_en": cat_info["keywords_en"],
                "indicators": cat_info["indicators"],
            }

        return {
            "categories": enhanced_info,
            "total_categories": len(enhanced_info),
            "supported_languages": ["ja", "en"],
            "few_shot_examples": len(service.topic_model.few_shot_examples),
            "version": "2.0.0",
        }

    except Exception as e:
        logger.error(f"Failed to get enhanced categories: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get enhanced categories: {str(e)}",
        )


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception in enhanced service: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error in enhanced service"},
    )


if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run(
        "main_enhanced:app",
        host=settings.host,
        port=settings.port + 1,  # 8001で起動
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )

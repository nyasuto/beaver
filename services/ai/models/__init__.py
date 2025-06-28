"""
Data models for AI Classification Service
"""

from .classification import (
    ClassificationRequest,
    ClassificationResponse,
    BatchClassificationRequest,
    BatchClassificationResponse,
    HealthResponse,
    Issue,
    ClassificationConfig,
    ClassificationResult,
    BatchSummary
)

__all__ = [
    "ClassificationRequest",
    "ClassificationResponse", 
    "BatchClassificationRequest",
    "BatchClassificationResponse",
    "HealthResponse",
    "Issue",
    "ClassificationConfig",
    "ClassificationResult",
    "BatchSummary"
]
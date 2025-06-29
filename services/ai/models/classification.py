"""
Pydantic models for classification requests and responses
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class Issue(BaseModel):
    """GitHub Issue data model"""
    id: int
    title: str
    body: str
    labels: List[str] = Field(default_factory=list)
    state: Optional[str] = "open"
    created_at: Optional[datetime] = None
    repository: Optional[str] = None


class ClassificationConfig(BaseModel):
    """Classification configuration"""
    confidence_threshold: float = Field(default=0.7, ge=0.0, le=1.0)
    model: str = Field(default="gpt-3.5-turbo")
    temperature: float = Field(default=0.1, ge=0.0, le=2.0)
    max_tokens: int = Field(default=500, ge=50, le=2000)


class ClassificationRequest(BaseModel):
    """Single issue classification request"""
    issue: Issue
    config: Optional[ClassificationConfig] = None


class ClassificationResult(BaseModel):
    """Classification result for a single issue"""
    issue_id: int
    category: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    reasoning: str
    suggested_tags: List[str] = Field(default_factory=list)
    processing_time_ms: int = 0
    model_used: str = "unknown"


class ClassificationResponse(BaseModel):
    """Single issue classification response"""
    category: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    reasoning: str
    suggested_tags: List[str] = Field(default_factory=list)
    processing_time_ms: int
    model_used: str
    timestamp: datetime = Field(default_factory=datetime.now)


class BatchClassificationRequest(BaseModel):
    """Batch classification request"""
    issues: List[Issue]
    config: Optional[ClassificationConfig] = None
    parallel_processing: bool = True


class BatchSummary(BaseModel):
    """Batch processing summary"""
    total_processed: int
    successful: int
    failed: int
    average_confidence: float
    processing_time_ms: int


class BatchClassificationResponse(BaseModel):
    """Batch classification response"""
    results: List[ClassificationResult]
    summary: BatchSummary
    timestamp: datetime = Field(default_factory=datetime.now)


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    model_loaded: bool
    api_accessible: bool
    memory_usage_mb: Optional[float] = None
    uptime_seconds: Optional[int] = None
    version: str = "1.0.0"
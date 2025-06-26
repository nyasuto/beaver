"""
Pydantic schemas for Beaver AI Services

Defines request/response models for all API endpoints.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from enum import Enum

from pydantic import BaseModel, Field, validator


class AIProvider(str, Enum):
    """Supported AI providers"""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"


class IssueComment(BaseModel):
    """Issue comment data"""
    id: int
    body: str
    user: str
    created_at: datetime


class IssueData(BaseModel):
    """GitHub issue data for processing"""
    id: int
    number: int
    title: str
    body: str
    state: str
    labels: List[str] = []
    comments: List[IssueComment] = []
    created_at: datetime
    updated_at: datetime
    user: str
    
    @validator('body', 'title')
    def validate_content_length(cls, v):
        if len(v) > 50000:  # Match MAX_CONTENT_LENGTH from config
            raise ValueError('Content too long for processing')
        return v


class SummarizationRequest(BaseModel):
    """Request for issue summarization"""
    issue: IssueData
    provider: Optional[AIProvider] = AIProvider.OPENAI
    model: Optional[str] = None
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None
    include_comments: bool = True
    language: str = Field(default="ja", description="Output language (ja, en)")


class SummarizationResponse(BaseModel):
    """Response from summarization"""
    summary: str
    key_points: List[str]
    category: Optional[str] = None
    complexity: str = Field(description="low, medium, high")
    processing_time: float = Field(description="Processing time in seconds")
    provider_used: AIProvider
    model_used: str
    token_usage: Optional[Dict[str, int]] = None


class ClassificationRequest(BaseModel):
    """Request for content classification"""
    content: str
    provider: Optional[AIProvider] = AIProvider.OPENAI
    model: Optional[str] = None
    categories: Optional[List[str]] = None  # Custom categories
    
    @validator('content')
    def validate_content_length(cls, v):
        if len(v) > 50000:
            raise ValueError('Content too long for processing')
        return v


class ClassificationResponse(BaseModel):
    """Response from classification"""
    primary_category: str
    confidence: float = Field(ge=0.0, le=1.0)
    all_categories: Dict[str, float] = Field(description="All categories with confidence scores")
    tags: List[str] = []
    processing_time: float
    provider_used: AIProvider
    model_used: str


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    timestamp: datetime
    version: str
    environment: str
    ai_providers: Dict[str, bool] = Field(description="Available AI providers")
    features: Dict[str, bool] = Field(description="Enabled features")


class ErrorResponse(BaseModel):
    """Error response model"""
    error: str
    detail: Optional[str] = None
    error_code: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)


class BatchSummarizationRequest(BaseModel):
    """Request for batch summarization of multiple issues"""
    issues: List[IssueData]
    provider: Optional[AIProvider] = AIProvider.OPENAI
    model: Optional[str] = None
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None
    include_comments: bool = True
    language: str = Field(default="ja", description="Output language (ja, en)")
    
    @validator('issues')
    def validate_batch_size(cls, v):
        if len(v) > 50:  # Reasonable batch limit
            raise ValueError('Batch size too large (max 50 issues)')
        return v


class BatchSummarizationResponse(BaseModel):
    """Response from batch summarization"""
    results: List[SummarizationResponse]
    total_processed: int
    total_failed: int
    processing_time: float
    failed_issues: List[Dict[str, Any]] = Field(description="Issues that failed processing")


class TroubleshootingRequest(BaseModel):
    """Request for troubleshooting guide generation"""
    issue: IssueData
    provider: Optional[AIProvider] = AIProvider.OPENAI
    model: Optional[str] = None
    include_prevention: bool = True
    language: str = Field(default="ja", description="Output language (ja, en)")


class TroubleshootingResponse(BaseModel):
    """Response from troubleshooting generation"""
    problem_summary: str
    symptoms: List[str]
    root_cause: str
    solution_steps: List[str]
    prevention_tips: List[str] = []
    difficulty_level: str = Field(description="beginner, intermediate, advanced")
    estimated_time: str = Field(description="Estimated time to resolve")
    processing_time: float
    provider_used: AIProvider
    model_used: str
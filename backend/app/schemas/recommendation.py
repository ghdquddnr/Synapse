"""Recommendation schemas"""

from datetime import datetime
from typing import List
from pydantic import BaseModel, Field


class RecommendedNote(BaseModel):
    """Single recommended note with score and reason"""

    note_id: str = Field(..., description="Note ID (UUID)")
    body_preview: str = Field(..., description="Note content preview (first 100 chars)")
    score: float = Field(..., ge=0.0, le=1.0, description="Recommendation score (0-1)")
    reason: str = Field(..., description="Human-readable explanation for recommendation")
    created_at: datetime = Field(..., description="Note creation timestamp")
    common_keywords: List[str] = Field(
        default_factory=list, description="Keywords shared with target note"
    )


class RecommendationResult(BaseModel):
    """Recommendations result with metadata"""

    note_id: str = Field(..., description="Target note ID")
    recommendations: List[RecommendedNote] = Field(
        default_factory=list, description="List of recommended notes"
    )
    total_candidates: int = Field(..., description="Total candidates processed")
    processing_time_ms: int = Field(..., description="Processing time in milliseconds")


class RecommendationsResponse(BaseModel):
    """Recommendations API response (wrapper)"""

    target_note_id: str = Field(..., description="Target note ID")
    recommendations: List[RecommendedNote] = Field(
        ..., description="List of recommended notes"
    )
    total_count: int = Field(..., description="Total number of recommendations")
    requested_k: int = Field(..., description="Number of recommendations requested")

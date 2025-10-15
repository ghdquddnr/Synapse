"""Weekly report schemas"""

from datetime import date
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class KeywordCount(BaseModel):
    """Keyword with count"""

    name: str = Field(..., description="Keyword name")
    count: int = Field(..., ge=1, description="Number of occurrences")


class ClusterSummary(BaseModel):
    """Summary of a note cluster"""

    cluster_id: int = Field(..., ge=0, description="Cluster ID")
    size: int = Field(..., ge=1, description="Number of notes in cluster")
    representative_sentence: str = Field(
        ..., description="Representative sentence from cluster centroid"
    )
    top_keywords: List[str] = Field(
        ..., max_items=5, description="Top 5 keywords in this cluster"
    )
    note_ids: List[str] = Field(..., description="List of note IDs in this cluster")


class PotentialConnection(BaseModel):
    """Potential connection between notes"""

    from_note_id: str = Field(..., description="Source note ID")
    to_note_id: str = Field(..., description="Target note ID")
    similarity_score: float = Field(
        ..., ge=0.0, le=1.0, description="Similarity score (0-1)"
    )
    reason: str = Field(..., description="Reason for suggesting connection")


class WeeklyReportData(BaseModel):
    """Weekly report data structure (stored as JSONB)"""

    total_notes: int = Field(..., ge=0, description="Total notes created this week")
    total_keywords: int = Field(..., ge=0, description="Total unique keywords extracted")
    clusters: List[ClusterSummary] = Field(..., description="Note clusters")
    top_keywords: List[KeywordCount] = Field(
        ..., max_items=10, description="Top 10 keywords overall"
    )
    new_keywords: List[str] = Field(
        ..., description="Keywords that appeared for the first time"
    )
    recurring_keywords: List[str] = Field(
        ..., description="Keywords that appeared in previous weeks"
    )
    potential_connections: List[PotentialConnection] = Field(
        ..., description="Suggested connections between notes"
    )


class WeeklyReportResponse(BaseModel):
    """Weekly report API response"""

    id: int = Field(..., description="Report ID")
    user_id: str = Field(..., description="User ID")
    week_key: str = Field(
        ..., pattern=r"^\d{4}-W\d{2}$", description="ISO 8601 week key (YYYY-Www)"
    )
    summary: str = Field(..., description="Human-readable summary text")
    data: WeeklyReportData = Field(..., description="Detailed report data")
    created_at: date = Field(..., description="Report creation date")

    class Config:
        from_attributes = True  # Enable ORM mode for SQLAlchemy models


class WeeklyReportRequest(BaseModel):
    """Weekly report generation request"""

    week_key: Optional[str] = Field(
        None,
        pattern=r"^\d{4}-W\d{2}$",
        description="ISO 8601 week key (YYYY-Www). If not provided, uses current week.",
    )

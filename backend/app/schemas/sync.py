"""Sync protocol schemas"""

from datetime import datetime
from typing import List, Optional, Literal, Any, Dict
from pydantic import BaseModel, Field


class ChangeLogEntry(BaseModel):
    """Change log entry schema"""

    id: int = Field(..., description="Change log entry ID")
    entity_type: Literal["note", "relation", "reflection", "keyword"] = Field(
        ..., description="Type of entity changed"
    )
    entity_id: str = Field(..., description="Entity ID (UUID)")
    operation: Literal["insert", "update", "delete"] = Field(
        ..., description="Operation type"
    )
    payload: Dict[str, Any] = Field(..., description="Entity data as JSON")
    created_at: datetime = Field(..., description="Change creation timestamp")
    synced_at: Optional[datetime] = Field(None, description="Sync completion timestamp")
    retry_count: int = Field(default=0, description="Number of retry attempts")
    last_error: Optional[str] = Field(None, description="Last error message")


class SyncPushRequest(BaseModel):
    """Push sync request schema"""

    device_id: str = Field(..., description="Device ID (UUID)")
    changes: List[ChangeLogEntry] = Field(
        ..., min_items=1, max_items=100, description="Batch of changes (max 100)"
    )


class SyncPushItemResult(BaseModel):
    """Result for a single push item"""

    entity_id: str = Field(..., description="Entity ID that was processed")
    success: bool = Field(..., description="Whether processing succeeded")
    error: Optional[str] = Field(None, description="Error message if failed")


class SyncPushResponse(BaseModel):
    """Push sync response schema"""

    success_count: int = Field(..., description="Number of successfully synced items")
    failure_count: int = Field(..., description="Number of failed items")
    results: List[SyncPushItemResult] = Field(..., description="Per-item results")
    new_checkpoint: str = Field(..., description="New checkpoint for next sync")


class Delta(BaseModel):
    """Sync delta (change) schema"""

    entity_type: Literal["note", "relation", "reflection", "keyword", "note_keyword"] = (
        Field(..., description="Type of entity")
    )
    entity_id: str = Field(..., description="Entity ID (UUID)")
    operation: Literal["upsert", "delete"] = Field(..., description="Operation type")
    data: Optional[Dict[str, Any]] = Field(
        None, description="Entity data (null for delete)"
    )
    updated_at: datetime = Field(..., description="Entity update timestamp")
    server_timestamp: datetime = Field(
        ..., description="Server-side timestamp for conflict resolution"
    )


class SyncPullRequest(BaseModel):
    """Pull sync request schema"""

    device_id: str = Field(..., description="Device ID (UUID)")
    checkpoint: Optional[str] = Field(None, description="Last checkpoint (null for initial sync)")


class SyncPullResponse(BaseModel):
    """Pull sync response schema"""

    has_more: bool = Field(..., description="Whether more changes exist")
    changes: List[Delta] = Field(..., description="List of deltas to apply")
    new_checkpoint: str = Field(..., description="New checkpoint for next sync")
    total_changes: int = Field(..., description="Total number of changes in this response")

"""Pydantic schemas package"""

# Authentication schemas
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    RefreshRequest,
    RegisterRequest,
    UserResponse,
)

# Sync protocol schemas
from app.schemas.sync import (
    ChangeLogEntry,
    SyncPushRequest,
    SyncPushItemResult,
    SyncPushResponse,
    Delta,
    SyncPullRequest,
    SyncPullResponse,
)

# Recommendation schemas
from app.schemas.recommendation import (
    RecommendedNote,
    RecommendationResult,
    RecommendationsResponse,
)

# Report schemas
from app.schemas.report import (
    KeywordCount,
    ClusterSummary,
    PotentialConnection,
    WeeklyReportData,
    WeeklyReportResponse,
    WeeklyReportRequest,
)

__all__ = [
    # Auth
    "LoginRequest",
    "TokenResponse",
    "RefreshRequest",
    "RegisterRequest",
    "UserResponse",
    # Sync
    "ChangeLogEntry",
    "SyncPushRequest",
    "SyncPushItemResult",
    "SyncPushResponse",
    "Delta",
    "SyncPullRequest",
    "SyncPullResponse",
    # Recommendation
    "RecommendedNote",
    "RecommendationResult",
    "RecommendationsResponse",
    # Report
    "KeywordCount",
    "ClusterSummary",
    "PotentialConnection",
    "WeeklyReportData",
    "WeeklyReportResponse",
    "WeeklyReportRequest",
]

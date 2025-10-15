"""
Recommendation API endpoints.

Provides AI-powered note recommendations based on semantic similarity.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..core.deps import get_current_user, get_db
from ..core.exceptions import NotFoundError
from ..core.logging import get_logger
from ..models.user import User
from ..schemas.recommendation import RecommendationResult, RecommendationsResponse
from ..services.recommendation import get_recommendation_service

logger = get_logger(__name__)

router = APIRouter(prefix="/recommend", tags=["recommendations"])


@router.get("/{note_id}", response_model=RecommendationResult)
async def get_note_recommendations(
    note_id: str,
    k: int = Query(default=10, ge=1, le=50, description="Number of recommendations"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RecommendationResult:
    """
    Get AI-powered recommendations for a specific note.

    Returns related notes based on:
    - Semantic similarity (embedding cosine similarity)
    - Keyword overlap (Jaccard similarity)
    - Temporal proximity (recent notes preferred)

    Args:
        note_id: ID of the target note
        k: Number of recommendations to return (1-50, default 10)
        current_user: Authenticated user (from JWT)
        db: Database session

    Returns:
        RecommendationResult with top-k recommended notes

    Raises:
        HTTPException 404: Note not found or user doesn't have access
        HTTPException 500: Internal server error during recommendation
    """
    logger.info(f"User {current_user.id} requested recommendations for note {note_id}, k={k}")

    try:
        # Get recommendation service
        service = get_recommendation_service()

        # Generate recommendations
        result = service.get_recommendations(
            db=db,
            note_id=note_id,
            user_id=current_user.id,
            k=k,
        )

        logger.info(
            f"Generated {len(result.recommendations)} recommendations for note {note_id} "
            f"({result.total_candidates} candidates, {result.processing_time_ms}ms)"
        )

        return result

    except ValueError as e:
        # Note not found or access denied
        logger.warning(f"Note {note_id} not found for user {current_user.id}: {e}")
        raise HTTPException(status_code=404, detail=str(e))

    except Exception as e:
        # Unexpected error
        logger.error(
            f"Error generating recommendations for note {note_id}: {e}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to generate recommendations. Please try again later.",
        )

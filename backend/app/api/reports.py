"""
Weekly report API endpoints.

Provides AI-generated weekly insights from notes.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..core.deps import get_current_user, get_db
from ..core.logging import get_logger
from ..models.user import User
from ..models.weekly_report import WeeklyReport
from ..schemas.report import WeeklyReportResponse
from ..services.report import get_report_service

logger = get_logger(__name__)

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/weekly", response_model=WeeklyReportResponse)
async def get_weekly_report(
    week: str = Query(
        ...,
        description="Week key in YYYY-WW format (e.g., 2024-01)",
        regex=r"^\d{4}-\d{2}$",
    ),
    regenerate: bool = Query(
        default=False,
        description="Force regenerate report even if cached",
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WeeklyReportResponse:
    """
    Get or generate weekly insight report.

    Returns AI-generated insights for a specific week including:
    - Note clustering by semantic similarity
    - Top keywords and trending topics
    - New keywords (compared to previous week)
    - Potential connections between notes

    Args:
        week: Week identifier in YYYY-WW format (e.g., "2024-01")
        regenerate: Force regenerate even if cached report exists
        current_user: Authenticated user (from JWT)
        db: Database session

    Returns:
        WeeklyReportResponse with insights and metadata

    Raises:
        HTTPException 400: Invalid week format
        HTTPException 404: No notes found for the week
        HTTPException 500: Internal server error during generation
    """
    logger.info(
        f"User {current_user.id} requested weekly report for week {week}, "
        f"regenerate={regenerate}"
    )

    try:
        # Check if report exists and is not being regenerated
        if not regenerate:
            existing_report = (
                db.query(WeeklyReport)
                .filter(
                    WeeklyReport.user_id == current_user.id,
                    WeeklyReport.week_key == week,
                )
                .first()
            )

            if existing_report:
                logger.info(f"Returning cached report for week {week}")
                return WeeklyReportResponse(
                    week_key=existing_report.week_key,
                    report=existing_report.data,
                    processing_time_ms=0,  # Cached, no processing time
                )

        # Generate new report
        logger.info(f"Generating new report for week {week}")
        service = get_report_service()

        report = service.generate_weekly_report(
            db=db,
            user_id=current_user.id,
            week_key=week,
        )

        logger.info(
            f"Generated weekly report for week {week}: "
            f"{report.report.total_notes} notes, "
            f"{len(report.report.clusters)} clusters, "
            f"{report.processing_time_ms}ms"
        )

        return report

    except ValueError as e:
        # Invalid week format or no notes found
        error_msg = str(e)
        logger.warning(f"Bad request for weekly report: {error_msg}")

        if "Invalid week key format" in error_msg:
            raise HTTPException(status_code=400, detail=error_msg)
        elif "No notes found" in error_msg:
            raise HTTPException(status_code=404, detail=error_msg)
        else:
            raise HTTPException(status_code=400, detail=error_msg)

    except Exception as e:
        # Unexpected error
        logger.error(
            f"Error generating weekly report for week {week}: {e}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to generate weekly report. Please try again later.",
        )

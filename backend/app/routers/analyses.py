from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.analysis import Analysis
from app.models.user import User
from app.schemas.analysis import AnalysisListResponse, AnalysisResponse
from app.services.storage_service import create_presigned_download_url

router = APIRouter(prefix="/analyses", tags=["analyses"])


def _enrich_analysis(analysis: Analysis) -> dict:
    """Add presigned video URL to analysis for client consumption."""
    data = {
        "id": analysis.id,
        "user_id": analysis.user_id,
        "shot_type": analysis.shot_type,
        "status": analysis.status,
        "overall_score": analysis.overall_score,
        "video_s3_key": analysis.video_s3_key,
        "thumbnail_s3_key": analysis.thumbnail_s3_key,
        "video_duration_seconds": analysis.video_duration_seconds,
        "biomechanics_result": analysis.biomechanics_result,
        "coaching_feedback": analysis.coaching_feedback,
        "error_message": analysis.error_message,
        "created_at": analysis.created_at,
        "processing_completed_at": analysis.processing_completed_at,
        # Client-side playback URLs (1h expiry)
        "video_url": create_presigned_download_url(analysis.video_s3_key, expires_in=3600),
        "thumbnail_url": (
            create_presigned_download_url(analysis.thumbnail_s3_key, expires_in=3600)
            if analysis.thumbnail_s3_key else None
        ),
    }
    return data


@router.get("", response_model=AnalysisListResponse)
async def list_analyses(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    shot_type: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Analysis).where(Analysis.user_id == user.id)

    if shot_type:
        query = query.where(Analysis.shot_type == shot_type)

    # Total count
    from sqlalchemy import func
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar_one()

    # Paginated results
    query = query.order_by(desc(Analysis.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    analyses = result.scalars().all()

    return AnalysisListResponse(
        analyses=[AnalysisResponse.model_validate(_enrich_analysis(a)) for a in analyses],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(
    analysis_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Analysis).where(Analysis.id == analysis_id, Analysis.user_id == user.id)
    )
    analysis = result.scalar_one_or_none()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    return AnalysisResponse.model_validate(_enrich_analysis(analysis))


@router.delete("/{analysis_id}", status_code=204)
async def delete_analysis(
    analysis_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Analysis).where(Analysis.id == analysis_id, Analysis.user_id == user.id)
    )
    analysis = result.scalar_one_or_none()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    # Clean up S3 objects
    from app.services.storage_service import delete_object
    delete_object(analysis.video_s3_key)
    if analysis.thumbnail_s3_key:
        delete_object(analysis.thumbnail_s3_key)
    if analysis.pose_data_s3_key:
        delete_object(analysis.pose_data_s3_key)

    await db.delete(analysis)
    await db.commit()

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.dependencies import check_analysis_limit, get_current_user
from app.models.analysis import Analysis, ShotType
from app.models.user import User
from app.schemas.upload import ConfirmUploadRequest, ConfirmUploadResponse, PresignedUrlRequest, PresignedUrlResponse
from app.services import storage_service

settings = get_settings()
router = APIRouter(prefix="/upload", tags=["upload"])

ALLOWED_SHOT_TYPES = {
    ShotType.THIRD_SHOT_DROP,
    ShotType.DINK,
    ShotType.SERVE,
    ShotType.VOLLEY,
    ShotType.RETURN,
    ShotType.FULL_RALLY,
}


@router.post("/presigned-url", response_model=PresignedUrlResponse)
async def get_presigned_url(
    body: PresignedUrlRequest,
    user: User = Depends(check_analysis_limit),  # Enforce usage limit BEFORE generating URL
):
    """
    Generate a presigned S3 PUT URL for direct client upload.
    Also validates file size and shot type before committing the upload slot.
    """
    if body.file_size_bytes > settings.pipeline_max_video_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Video exceeds maximum size of {settings.pipeline_max_video_bytes // 1_000_000}MB",
        )

    if body.shot_type not in ALLOWED_SHOT_TYPES:
        raise HTTPException(status_code=400, detail=f"Unknown shot type: {body.shot_type}")

    s3_key = storage_service.generate_upload_key(user.id, body.filename)
    upload_url = storage_service.create_presigned_upload_url(
        s3_key=s3_key,
        content_type=body.content_type,
        expires_in=900,  # 15 minutes
    )

    return PresignedUrlResponse(
        upload_url=upload_url,
        s3_key=s3_key,
        expires_in_seconds=900,
    )


@router.post("/confirm", response_model=ConfirmUploadResponse, status_code=status.HTTP_201_CREATED)
async def confirm_upload(
    body: ConfirmUploadRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Called after the client successfully uploads to S3.
    Creates the Analysis record and dispatches the processing task.
    """
    if body.shot_type not in ALLOWED_SHOT_TYPES:
        raise HTTPException(status_code=400, detail=f"Unknown shot type: {body.shot_type}")

    analysis = Analysis(
        id=str(uuid.uuid4()),
        user_id=user.id,
        video_s3_key=body.s3_key,
        shot_type=body.shot_type,
        status="pending",
    )
    db.add(analysis)
    await db.commit()

    # Dispatch async Celery task
    from app.pipeline.tasks import process_video_analysis
    process_video_analysis.apply_async(
        args=[analysis.id],
        queue="video_analysis",
    )

    return ConfirmUploadResponse(analysis_id=analysis.id, status="pending")

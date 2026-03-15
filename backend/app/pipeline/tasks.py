"""
Celery tasks for the video analysis pipeline.

This module is the single entry point for all async video processing.
It orchestrates the pipeline steps and updates the Analysis record's status
at each stage so the mobile app can show granular progress.
"""
from __future__ import annotations

import json
import logging
import tempfile
from datetime import UTC, datetime
from pathlib import Path

from celery import Celery
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.pipeline.biomechanics import compute_biomechanics
from app.pipeline.claude_coach import generate_feedback
from app.pipeline.paddle_detector import run_paddle_detection
from app.pipeline.phase_segmentor import segment_phases
from app.pipeline.pose_estimator import pose_frames_to_dict, run_pose_estimation
from app.pipeline.video_utils import extract_frames, extract_thumbnail, get_video_metadata

settings = get_settings()
logger = logging.getLogger(__name__)

celery_app = Celery(
    "dropshot",
    broker=settings.redis_url,
    backend=settings.redis_url,
)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_routes={"app.pipeline.tasks.*": {"queue": "video_analysis"}},
    worker_prefetch_multiplier=1,  # Process one job at a time per worker (GPU contention)
)


def _get_sync_db():
    """Synchronous SQLAlchemy session for Celery workers."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    # Use sync driver for Celery (not async)
    sync_url = settings.database_url.replace("+asyncpg", "+psycopg2")
    engine = create_engine(sync_url, pool_pre_ping=True)
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()


def _update_status(db: Session, analysis_id: str, status: str, error: str | None = None) -> None:
    from app.models.analysis import Analysis
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if analysis:
        analysis.status = status
        if error:
            analysis.error_message = error
        if status == "complete":
            analysis.processing_completed_at = datetime.now(UTC).isoformat()
        db.commit()


@celery_app.task(bind=True, max_retries=2, default_retry_delay=30)
def process_video_analysis(self, analysis_id: str) -> dict:
    """
    Main pipeline task. Orchestrates all analysis steps.

    Status transitions:
    pending → downloading → pose_estimation → paddle_detection →
    phase_segmentation → biomechanics → generating_feedback → complete
    """
    from app.models.analysis import Analysis
    from app.services import storage_service, notification_service

    db = _get_sync_db()

    try:
        # ── Load analysis record ──────────────────────────────────────────────
        analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
        if not analysis:
            logger.error("Analysis %s not found", analysis_id)
            return {"error": "analysis_not_found"}

        user = analysis.user
        shot_type = analysis.shot_type
        s3_key = analysis.video_s3_key
        skill_level = user.skill_level if user else None

        # ── Step 1: Download video ────────────────────────────────────────────
        _update_status(db, analysis_id, "downloading")
        logger.info("[%s] Downloading video from S3: %s", analysis_id, s3_key)

        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            video_path = tmp_path / "video.mp4"
            thumb_path = tmp_path / "thumbnail.jpg"

            storage_service.download_to_temp(s3_key, video_path)

            metadata = get_video_metadata(video_path)
            analysis.video_duration_seconds = metadata["duration_seconds"]
            analysis.video_fps = metadata["fps"]
            db.commit()

            # Extract thumbnail
            extract_thumbnail(video_path, thumb_path)
            thumb_key = storage_service.generate_thumbnail_key(s3_key)
            storage_service.upload_file(thumb_path, thumb_key, "image/jpeg")
            analysis.thumbnail_s3_key = thumb_key
            db.commit()

            # ── Step 2: Pose estimation ───────────────────────────────────────
            _update_status(db, analysis_id, "pose_estimation")
            logger.info("[%s] Running pose estimation", analysis_id)

            frames = extract_frames(video_path, target_fps=settings.pipeline_target_fps)
            if not frames:
                raise ValueError("No frames extracted from video")

            pose_frames = run_pose_estimation(frames)

            # Store pose data in S3 for potential later use / debugging
            pose_key = storage_service.generate_pose_data_key(s3_key)
            pose_json = json.dumps(pose_frames_to_dict(pose_frames)).encode()
            storage_service.upload_bytes(pose_json, pose_key, "application/json")
            analysis.pose_data_s3_key = pose_key
            db.commit()

            # ── Step 3: Paddle detection ──────────────────────────────────────
            _update_status(db, analysis_id, "paddle_detection")
            logger.info("[%s] Running paddle detection", analysis_id)

            # Extract right wrist positions as fallback for heuristic
            from app.pipeline.pose_estimator import get_landmark, JOINT_INDEX
            wrist_positions = []
            for pf in pose_frames:
                lm = get_landmark(pf, "right_wrist")
                wrist_positions.append((lm.x if lm.visibility > 0.3 else 0.0,
                                        lm.y if lm.visibility > 0.3 else 0.0))

            paddle_detections = run_paddle_detection(frames, wrist_positions)

            # ── Step 4: Phase segmentation ────────────────────────────────────
            _update_status(db, analysis_id, "phase_segmentation")
            logger.info("[%s] Segmenting shot phases", analysis_id)

            seg = segment_phases(pose_frames, paddle_detections, fps=metadata["fps"])

            # ── Step 5: Biomechanical analysis ────────────────────────────────
            _update_status(db, analysis_id, "biomechanics")
            logger.info("[%s] Computing biomechanics", analysis_id)

            bio = compute_biomechanics(pose_frames, paddle_detections, seg,
                                       shot_type=shot_type, fps=metadata["fps"])

            # Serialize biomechanics result
            bio_dict = {
                "shot_type": bio.shot_type,
                "total_frames_analyzed": bio.total_frames_analyzed,
                "dominant_side": bio.dominant_side,
                "phases": bio.phases,
                "joint_angles": bio.joint_angles,
                "weight_transfer": bio.weight_transfer,
                "swing_metrics": bio.swing_metrics,
                "paddle_contact": bio.paddle_contact,
                "knee_bend_at_contact_degrees": bio.knee_bend_at_contact_degrees,
                "hip_rotation_degrees": bio.hip_rotation_degrees,
                "contact_point_x": bio.contact_point_x,
                "overall_quality_score": bio.overall_quality_score,
            }

            analysis.biomechanics_result = bio_dict
            db.commit()

            # ── Step 6: Claude coaching feedback ─────────────────────────────
            _update_status(db, analysis_id, "generating_feedback")
            logger.info("[%s] Generating Claude coaching feedback", analysis_id)

            feedback = generate_feedback(bio, skill_level=skill_level)

            analysis.coaching_feedback = feedback
            analysis.overall_score = feedback.get("overall_score", bio.overall_quality_score)
            analysis.status = "complete"
            analysis.processing_completed_at = datetime.now(UTC).isoformat()
            db.commit()

            logger.info("[%s] Pipeline complete. Score: %d", analysis_id, analysis.overall_score)

            # ── Notify user ───────────────────────────────────────────────────
            if user and user.expo_push_token:
                notification_service.send_analysis_complete(
                    user.expo_push_token, analysis_id, analysis.overall_score or 0
                )

            return {"analysis_id": analysis_id, "score": analysis.overall_score, "status": "complete"}

    except Exception as exc:
        logger.exception("[%s] Pipeline failed: %s", analysis_id, exc)
        _update_status(db, analysis_id, "failed", error_message=str(exc))

        # Notify failure
        try:
            from app.models.analysis import Analysis as AnalysisModel
            analysis = db.query(AnalysisModel).filter(AnalysisModel.id == analysis_id).first()
            if analysis and analysis.user and analysis.user.expo_push_token:
                from app.services import notification_service
                notification_service.send_analysis_failed(
                    analysis.user.expo_push_token, analysis_id
                )
        except Exception:
            pass

        db.close()
        raise self.retry(exc=exc)

    finally:
        db.close()

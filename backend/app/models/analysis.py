from typing import Any

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, gen_uuid


class AnalysisStatus:
    PENDING = "pending"
    DOWNLOADING = "downloading"
    POSE_ESTIMATION = "pose_estimation"
    PADDLE_DETECTION = "paddle_detection"
    PHASE_SEGMENTATION = "phase_segmentation"
    BIOMECHANICS = "biomechanics"
    GENERATING_FEEDBACK = "generating_feedback"
    COMPLETE = "complete"
    FAILED = "failed"


class ShotType:
    THIRD_SHOT_DROP = "third_shot_drop"
    DINK = "dink"
    SERVE = "serve"
    VOLLEY = "volley"
    RETURN = "return"
    FULL_RALLY = "full_rally"


class Analysis(Base, TimestampMixin):
    __tablename__ = "analyses"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Video storage
    video_s3_key: Mapped[str] = mapped_column(String(500), nullable=False)
    video_duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    video_fps: Mapped[float | None] = mapped_column(Float, nullable=True)
    thumbnail_s3_key: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Analysis config
    shot_type: Mapped[str] = mapped_column(String(50), nullable=False, default=ShotType.THIRD_SHOT_DROP)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default=AnalysisStatus.PENDING, index=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Results — stored as JSONB for flexible schema evolution
    pose_data_s3_key: Mapped[str | None] = mapped_column(String(500), nullable=True)  # Large — stored in S3
    biomechanics_result: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    coaching_feedback: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)

    # Top-level score for quick sorting/display (0–100)
    overall_score: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Processing metadata
    processing_started_at: Mapped[str | None] = mapped_column(String(50), nullable=True)
    processing_completed_at: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="analyses")  # type: ignore[name-defined]

    def __repr__(self) -> str:
        return f"<Analysis id={self.id} status={self.status} shot={self.shot_type}>"

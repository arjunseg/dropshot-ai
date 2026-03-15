from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ── Biomechanics data structures ─────────────────────────────────────────────

class JointAngle(BaseModel):
    name: str
    value_degrees: float
    ideal_min: float
    ideal_max: float
    deviation: float  # positive = above ideal max, negative = below ideal min
    phase: str  # which shot phase this was measured in


class WeightTransfer(BaseModel):
    direction: str  # "forward", "backward", "lateral_left", "lateral_right"
    magnitude: float  # 0.0 – 1.0 normalized


class SwingMetrics(BaseModel):
    backswing_duration_ms: float
    forward_swing_duration_ms: float
    contact_frame: int
    follow_through_duration_ms: float
    swing_arc_degrees: float


class PaddleContact(BaseModel):
    contact_point_x: float  # normalized 0–1 (horizontal position relative to body center)
    contact_point_y: float  # normalized 0–1 (vertical position relative to hip)
    paddle_face_angle_degrees: float  # 0 = perpendicular to ground, positive = open
    wrist_firmness_score: float  # 0–1, derived from wrist angle stability around contact


class BiomechanicsResult(BaseModel):
    shot_type: str
    total_frames_analyzed: int
    phases: dict[str, dict[str, int]]  # phase_name -> {start_frame, end_frame}
    joint_angles: list[JointAngle]
    weight_transfer: WeightTransfer
    swing_metrics: SwingMetrics
    paddle_contact: PaddleContact
    knee_bend_at_contact_degrees: float
    hip_rotation_degrees: float


# ── Coaching feedback structures ──────────────────────────────────────────────

class Improvement(BaseModel):
    priority: int  # 1 = most important
    title: str
    explanation: str
    drill: str
    affected_metric: str  # which biomechanics metric this addresses


class CoachingFeedback(BaseModel):
    overall_score: int = Field(ge=0, le=100)
    one_line_summary: str
    strengths: list[str]  # 2 things the player did well
    improvements: list[Improvement]  # 3 prioritized fixes
    raw_response: str  # Full Claude response for debugging


# ── API schemas ───────────────────────────────────────────────────────────────

class AnalysisCreate(BaseModel):
    video_s3_key: str
    shot_type: str = "third_shot_drop"


class AnalysisResponse(BaseModel):
    id: str
    user_id: str
    shot_type: str
    status: str
    overall_score: int | None
    video_s3_key: str
    thumbnail_s3_key: str | None
    video_duration_seconds: float | None
    biomechanics_result: dict[str, Any] | None
    coaching_feedback: dict[str, Any] | None
    error_message: str | None
    created_at: datetime
    processing_completed_at: str | None

    model_config = {"from_attributes": True}


class AnalysisListResponse(BaseModel):
    analyses: list[AnalysisResponse]
    total: int
    page: int
    page_size: int

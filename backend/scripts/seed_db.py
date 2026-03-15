"""
Seed the database with a demo user and sample analyses for local development.
Run: python -m scripts.seed_db
"""
import asyncio
import json
import uuid
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings
from app.models.analysis import Analysis, AnalysisStatus, ShotType
from app.models.subscription import Plan, Subscription, SubscriptionStatus
from app.models.user import User
from app.services.auth_service import hash_password

settings = get_settings()

SAMPLE_FEEDBACK = {
    "overall_score": 62,
    "one_line_summary": "Solid contact timing but your paddle face is too closed — drops are flying flat instead of arcing.",
    "strengths": [
        "Good forward weight transfer — you're stepping into the shot correctly",
        "Compact backswing with minimal excess motion",
    ],
    "improvements": [
        {
            "priority": 1,
            "title": "Open your paddle face 15° more",
            "explanation": "Your paddle face measured 8° closed at contact (ideal: 5–25° open). This is why your drops are sailing long — a closed face eliminates the upward arc that lands the ball softly in the kitchen. Think 'loft, not power.'",
            "drill": "Shadow drill: practice slow-motion third shot drops, pausing at contact position to check face angle in a mirror or phone camera.",
            "affected_metric": "paddle_face_angle",
        },
        {
            "priority": 2,
            "title": "Lower your contact point 4–6 inches",
            "explanation": "You're contacting the ball at hip level (measured: 132° knee angle) instead of with bent knees (ideal: 110–145°). Higher contact forces your arm to muscle the ball up rather than using natural arc geometry. Lower = easier.",
            "drill": "Kitchen line drop drill: hit 20 drops with your back knee almost touching the ground at contact. Exaggerate the knee bend until it becomes muscle memory.",
            "affected_metric": "knee_at_contact",
        },
        {
            "priority": 3,
            "title": "Contact the ball 6 inches further forward",
            "explanation": "Your contact point x-position measured -0.03 (slightly behind hip center). Contact further in front lets you see the ball longer and use a longer lever arm. Out front = better touch control.",
            "drill": "Place a cone or towel 6 inches in front of your usual contact zone. Practice making contact directly above it.",
            "affected_metric": "contact_point_x",
        },
    ],
    "raw_response": "seed_data",
}

SAMPLE_BIOMECHANICS = {
    "shot_type": "third_shot_drop",
    "total_frames_analyzed": 87,
    "dominant_side": "right",
    "phases": {
        "preparation": {"start_frame": 0, "end_frame": 18},
        "backswing": {"start_frame": 19, "end_frame": 31},
        "forward_swing": {"start_frame": 32, "end_frame": 41},
        "contact": {"start_frame": 42, "end_frame": 44},
        "follow_through": {"start_frame": 45, "end_frame": 62},
        "recovery": {"start_frame": 63, "end_frame": 86},
    },
    "joint_angles": [
        {"name": "elbow_at_contact", "value_degrees": 152.3, "ideal_min": 140, "ideal_max": 165, "deviation": 0.0, "phase": "contact"},
        {"name": "shoulder_at_contact", "value_degrees": 34.7, "ideal_min": 20, "ideal_max": 50, "deviation": 0.0, "phase": "contact"},
        {"name": "knee_at_contact", "value_degrees": 132.1, "ideal_min": 110, "ideal_max": 145, "deviation": 0.0, "phase": "contact"},
        {"name": "hip_forward_tilt", "value_degrees": 18.4, "ideal_min": 10, "ideal_max": 30, "deviation": 0.0, "phase": "contact"},
        {"name": "paddle_face_angle", "value_degrees": -8.2, "ideal_min": 5, "ideal_max": 25, "deviation": -13.2, "phase": "contact"},
    ],
    "weight_transfer": {"direction": "forward", "magnitude": 0.71},
    "swing_metrics": {
        "backswing_duration_ms": 433.3,
        "forward_swing_duration_ms": 300.0,
        "contact_frame": 42,
        "follow_through_duration_ms": 600.0,
        "swing_arc_degrees": 0.0,
    },
    "paddle_contact": {
        "contact_point_x": -0.03,
        "contact_point_y": 0.12,
        "paddle_face_angle_degrees": -8.2,
        "wrist_firmness_score": 0.78,
    },
    "knee_bend_at_contact_degrees": 132.1,
    "hip_rotation_degrees": 22.5,
    "contact_point_x": -0.03,
    "overall_quality_score": 62,
}


async def seed():
    engine = create_async_engine(settings.database_url)
    SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with SessionLocal() as db:
        # Create demo user
        user = User(
            id=str(uuid.uuid4()),
            email="demo@dropshot.app",
            hashed_password=hash_password("demo1234"),
            full_name="Demo Player",
            skill_level=3.5,
        )
        db.add(user)
        await db.flush()

        # Free subscription
        sub = Subscription(user_id=user.id, plan=Plan.FREE, status=SubscriptionStatus.ACTIVE)
        db.add(sub)

        # 3 sample analyses
        for i, score in enumerate([62, 71, 78]):
            analysis = Analysis(
                id=str(uuid.uuid4()),
                user_id=user.id,
                video_s3_key=f"videos/{user.id}/sample_{i}.mp4",
                shot_type=ShotType.THIRD_SHOT_DROP,
                status=AnalysisStatus.COMPLETE,
                overall_score=score,
                biomechanics_result=SAMPLE_BIOMECHANICS,
                coaching_feedback={**SAMPLE_FEEDBACK, "overall_score": score},
                video_duration_seconds=4.2,
                video_fps=30.0,
                processing_completed_at=datetime.utcnow().isoformat(),
            )
            db.add(analysis)

        await db.commit()
        print(f"Seeded: demo@dropshot.app / demo1234 (user_id: {user.id})")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())

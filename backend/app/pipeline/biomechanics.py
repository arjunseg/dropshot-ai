"""
Biomechanical analysis engine.

Computes joint angles, weight transfer, swing timing, and paddle contact metrics
from pose frames and phase segmentation. This module contains the sport-science
logic that distinguishes DropShot AI from generic pose apps.

All ideal angle ranges derived from coaching standards and pro player motion capture.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass

import numpy as np

from app.pipeline.paddle_detector import PaddleDetection
from app.pipeline.phase_segmentor import PhaseSegmentation, ShotPhase
from app.pipeline.pose_estimator import PoseFrame, get_landmark

logger = logging.getLogger(__name__)


# ── Ideal angle benchmarks (third shot drop) ─────────────────────────────────
# These are derived from PPR-certified coaching standards and pro player analysis.

IDEAL_RANGES: dict[str, dict[str, dict[str, float]]] = {
    "third_shot_drop": {
        "elbow_at_contact": {"min": 140, "max": 165},       # Nearly extended (not locked)
        "shoulder_at_contact": {"min": 20, "max": 50},       # Forward / slightly elevated
        "knee_at_contact": {"min": 110, "max": 145},         # Bent (not standing upright)
        "hip_forward_tilt": {"min": 10, "max": 30},          # Slight forward lean
        "wrist_firmness_score": {"min": 0.65, "max": 1.0},   # Stable wrist (no flip)
        "paddle_face_angle": {"min": 5, "max": 25},          # Open face (loft)
        "backswing_duration_ms": {"min": 100, "max": 350},   # Compact
        "swing_arc_degrees": {"min": 30, "max": 70},         # Controlled arc
    },
    "dink": {
        "elbow_at_contact": {"min": 130, "max": 160},
        "shoulder_at_contact": {"min": 10, "max": 40},
        "knee_at_contact": {"min": 105, "max": 140},
        "hip_forward_tilt": {"min": 5, "max": 25},
        "wrist_firmness_score": {"min": 0.7, "max": 1.0},
        "paddle_face_angle": {"min": 0, "max": 15},
        "backswing_duration_ms": {"min": 50, "max": 200},
        "swing_arc_degrees": {"min": 15, "max": 45},
    },
    "serve": {
        "elbow_at_contact": {"min": 145, "max": 175},
        "shoulder_at_contact": {"min": 15, "max": 55},
        "knee_at_contact": {"min": 120, "max": 160},
        "hip_forward_tilt": {"min": 15, "max": 40},
        "wrist_firmness_score": {"min": 0.6, "max": 1.0},
        "paddle_face_angle": {"min": -5, "max": 15},
        "backswing_duration_ms": {"min": 200, "max": 600},
        "swing_arc_degrees": {"min": 40, "max": 90},
    },
}


@dataclass
class BiomechanicsOutput:
    shot_type: str
    total_frames_analyzed: int
    dominant_side: str
    phases: dict[str, dict[str, int]]
    joint_angles: list[dict]
    weight_transfer: dict
    swing_metrics: dict
    paddle_contact: dict
    knee_bend_at_contact_degrees: float
    hip_rotation_degrees: float
    contact_point_x: float  # normalized: 0=hip, 1=fully extended forward
    overall_quality_score: int  # 0–100 rough pre-LLM score


# ── Vector math helpers ───────────────────────────────────────────────────────

def _angle_between(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    """Angle at point B formed by vectors BA and BC, in degrees."""
    ba = a - b
    bc = c - b
    cos_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-9)
    cos_angle = np.clip(cos_angle, -1.0, 1.0)
    return float(np.degrees(np.arccos(cos_angle)))


def _lm_to_vec(lm) -> np.ndarray:
    return np.array([lm.x, lm.y])


def _lm_to_vec3(lm) -> np.ndarray:
    return np.array([lm.x, lm.y, lm.z])


# ── Joint angle computations ──────────────────────────────────────────────────

def _compute_elbow_angle(pose_frame: PoseFrame, side: str) -> float:
    shoulder = _lm_to_vec(get_landmark(pose_frame, f"{side}_shoulder"))
    elbow = _lm_to_vec(get_landmark(pose_frame, f"{side}_elbow"))
    wrist = _lm_to_vec(get_landmark(pose_frame, f"{side}_wrist"))
    return _angle_between(shoulder, elbow, wrist)


def _compute_shoulder_elevation(pose_frame: PoseFrame, side: str) -> float:
    """Shoulder elevation angle (how high the arm is raised relative to torso)."""
    hip = _lm_to_vec(get_landmark(pose_frame, f"{side}_hip"))
    shoulder = _lm_to_vec(get_landmark(pose_frame, f"{side}_shoulder"))
    elbow = _lm_to_vec(get_landmark(pose_frame, f"{side}_elbow"))
    return _angle_between(hip, shoulder, elbow)


def _compute_knee_angle(pose_frame: PoseFrame, side: str) -> float:
    hip = _lm_to_vec(get_landmark(pose_frame, f"{side}_hip"))
    knee = _lm_to_vec(get_landmark(pose_frame, f"{side}_knee"))
    ankle = _lm_to_vec(get_landmark(pose_frame, f"{side}_ankle"))
    return _angle_between(hip, knee, ankle)


def _compute_hip_forward_tilt(pose_frame: PoseFrame) -> float:
    """
    Forward trunk lean: angle between vertical and the spine (hip→shoulder line).
    0 = upright, positive = leaning forward.
    """
    l_hip = _lm_to_vec(get_landmark(pose_frame, "left_hip"))
    r_hip = _lm_to_vec(get_landmark(pose_frame, "right_hip"))
    l_sh = _lm_to_vec(get_landmark(pose_frame, "left_shoulder"))
    r_sh = _lm_to_vec(get_landmark(pose_frame, "right_shoulder"))

    hip_center = (l_hip + r_hip) / 2
    sh_center = (l_sh + r_sh) / 2

    spine = sh_center - hip_center
    vertical = np.array([0, -1])  # y increases downward in image coords
    cos_a = np.dot(spine, vertical) / (np.linalg.norm(spine) + 1e-9)
    return float(np.degrees(np.arccos(np.clip(cos_a, -1, 1))))


def _compute_hip_rotation(pose_frames: list[PoseFrame], backswing_end: int, forward_end: int) -> float:
    """
    Hip rotation from backswing to forward swing.
    Measured as change in the angle of the hip line relative to horizontal.
    """
    def hip_angle(pf: PoseFrame) -> float:
        l_hip = _lm_to_vec(get_landmark(pf, "left_hip"))
        r_hip = _lm_to_vec(get_landmark(pf, "right_hip"))
        diff = r_hip - l_hip
        return float(np.degrees(np.arctan2(diff[1], diff[0])))

    if backswing_end >= len(pose_frames) or forward_end >= len(pose_frames):
        return 0.0

    angle_start = hip_angle(pose_frames[backswing_end])
    angle_end = hip_angle(pose_frames[min(forward_end, len(pose_frames) - 1)])
    return abs(angle_end - angle_start)


# ── Weight transfer ───────────────────────────────────────────────────────────

def _compute_weight_transfer(pose_frames: list[PoseFrame], seg: PhaseSegmentation) -> dict:
    """
    Approximate weight transfer using center of mass proxy (avg of hip midpoint).
    Compare COM position at backswing end vs contact frame.
    """
    def hip_center_x(pf: PoseFrame) -> float:
        l = get_landmark(pf, "left_hip")
        r = get_landmark(pf, "right_hip")
        return (l.x + r.x) / 2

    bs_end = seg.phases.get(ShotPhase.BACKSWING.value, (0, 0))[1]
    contact = seg.contact_frame

    if bs_end >= len(pose_frames) or contact >= len(pose_frames):
        return {"direction": "unknown", "magnitude": 0.0}

    x_bs = hip_center_x(pose_frames[bs_end])
    x_contact = hip_center_x(pose_frames[contact])
    delta = x_contact - x_bs

    # In image coords: if dominant side is right, forward = decreasing x (left = toward net)
    magnitude = min(1.0, abs(delta) * 5)  # Scale to 0–1

    if abs(delta) < 0.01:
        direction = "minimal"
    elif seg.dominant_side == "right":
        direction = "forward" if delta < 0 else "backward"
    else:
        direction = "forward" if delta > 0 else "backward"

    return {"direction": direction, "magnitude": round(magnitude, 3)}


# ── Paddle contact metrics ────────────────────────────────────────────────────

def _compute_paddle_contact(
    pose_frames: list[PoseFrame],
    paddle_detections: list[PaddleDetection | None],
    seg: PhaseSegmentation,
    fps: float,
) -> dict:
    contact_idx = seg.contact_frame
    dominant = seg.dominant_side

    # Wrist firmness: std of wrist y-position in ±5 frames around contact (lower = firmer)
    wrist_window = [
        get_landmark(pose_frames[i], f"{dominant}_wrist").y
        for i in range(max(0, contact_idx - 5), min(len(pose_frames), contact_idx + 5))
    ]
    wrist_std = float(np.std(wrist_window)) if wrist_window else 0.1
    firmness_score = max(0.0, min(1.0, 1.0 - wrist_std * 20))

    # Paddle angle at contact
    paddle_angle = 0.0
    if contact_idx < len(paddle_detections) and paddle_detections[contact_idx]:
        paddle_angle = paddle_detections[contact_idx].estimated_angle_degrees

    # Contact point relative to body
    # Compare wrist x to hip center x
    wrist_lm = get_landmark(pose_frames[contact_idx], f"{dominant}_wrist")
    l_hip = get_landmark(pose_frames[contact_idx], "left_hip")
    r_hip = get_landmark(pose_frames[contact_idx], "right_hip")
    hip_center_x = (l_hip.x + r_hip.x) / 2
    hip_center_y = (l_hip.y + r_hip.y) / 2

    # Positive = wrist is in front of hip (good for third shot drop)
    contact_point_x = hip_center_x - wrist_lm.x  # image x increases right
    contact_point_y = hip_center_y - wrist_lm.y

    return {
        "contact_point_x": round(float(contact_point_x), 4),
        "contact_point_y": round(float(contact_point_y), 4),
        "paddle_face_angle_degrees": round(float(paddle_angle), 2),
        "wrist_firmness_score": round(firmness_score, 3),
    }


# ── Swing timing ──────────────────────────────────────────────────────────────

def _compute_swing_metrics(seg: PhaseSegmentation, fps: float) -> dict:
    def phase_duration_ms(phase: str) -> float:
        if phase not in seg.phases:
            return 0.0
        start, end = seg.phases[phase]
        return (end - start) / fps * 1000

    bs_dur = phase_duration_ms(ShotPhase.BACKSWING.value)
    fw_dur = phase_duration_ms(ShotPhase.FORWARD_SWING.value)
    ft_dur = phase_duration_ms(ShotPhase.FOLLOW_THROUGH.value)

    # Swing arc: approximate from wrist trajectory during forward swing
    return {
        "backswing_duration_ms": round(bs_dur, 1),
        "forward_swing_duration_ms": round(fw_dur, 1),
        "contact_frame": seg.contact_frame,
        "follow_through_duration_ms": round(ft_dur, 1),
        "swing_arc_degrees": 0.0,  # Placeholder — computed from paddle detector if available
    }


# ── Deviation scoring ─────────────────────────────────────────────────────────

def _compute_deviation(value: float, ideal: dict[str, float]) -> float:
    if value < ideal["min"]:
        return round(value - ideal["min"], 2)  # negative = below min
    if value > ideal["max"]:
        return round(value - ideal["max"], 2)  # positive = above max
    return 0.0


def _build_joint_angles(
    measured: dict[str, float],
    shot_type: str,
    contact_frame_phase: str,
) -> list[dict]:
    ideals = IDEAL_RANGES.get(shot_type, IDEAL_RANGES["third_shot_drop"])
    result = []
    for metric, value in measured.items():
        if metric not in ideals:
            continue
        ideal = ideals[metric]
        result.append({
            "name": metric,
            "value_degrees": round(value, 2),
            "ideal_min": ideal["min"],
            "ideal_max": ideal["max"],
            "deviation": _compute_deviation(value, ideal),
            "phase": contact_frame_phase,
        })
    return result


# ── Overall quality score ─────────────────────────────────────────────────────

def _rough_quality_score(joint_angles: list[dict]) -> int:
    """
    Pre-LLM quality signal: % of metrics within ideal range, weighted.
    Claude will override this with a more nuanced score.
    """
    if not joint_angles:
        return 50
    in_range = sum(1 for j in joint_angles if j["deviation"] == 0.0)
    return int((in_range / len(joint_angles)) * 100)


# ── Main entry point ──────────────────────────────────────────────────────────

def compute_biomechanics(
    pose_frames: list[PoseFrame],
    paddle_detections: list[PaddleDetection | None],
    seg: PhaseSegmentation,
    shot_type: str = "third_shot_drop",
    fps: float = 30.0,
) -> BiomechanicsOutput:
    dominant = seg.dominant_side
    contact_idx = seg.contact_frame
    n = len(pose_frames)

    if contact_idx >= n:
        contact_idx = n - 1

    contact_pf = pose_frames[contact_idx]

    # ── Measure key angles at contact ─────────────────────────────────────────
    elbow_angle = _compute_elbow_angle(contact_pf, dominant)
    shoulder_elev = _compute_shoulder_elevation(contact_pf, dominant)
    knee_angle = _compute_knee_angle(contact_pf, dominant)
    hip_tilt = _compute_hip_forward_tilt(contact_pf)

    paddle_contact = _compute_paddle_contact(pose_frames, paddle_detections, seg, fps)
    swing_metrics = _compute_swing_metrics(seg, fps)

    bs_end = seg.phases.get(ShotPhase.BACKSWING.value, (0, 0))[1]
    fw_end = seg.phases.get(ShotPhase.FORWARD_SWING.value, (0, 0))[1]
    hip_rotation = _compute_hip_rotation(pose_frames, bs_end, fw_end)

    weight_transfer = _compute_weight_transfer(pose_frames, seg)

    # Aggregate measured metrics
    measured = {
        "elbow_at_contact": elbow_angle,
        "shoulder_at_contact": shoulder_elev,
        "knee_at_contact": knee_angle,
        "hip_forward_tilt": hip_tilt,
        "wrist_firmness_score": paddle_contact["wrist_firmness_score"] * 100,  # Scale to degrees-like range
        "paddle_face_angle": paddle_contact["paddle_face_angle_degrees"],
        "backswing_duration_ms": swing_metrics["backswing_duration_ms"],
        "swing_arc_degrees": swing_metrics["swing_arc_degrees"],
    }

    joint_angles = _build_joint_angles(measured, shot_type, ShotPhase.CONTACT.value)
    quality_score = _rough_quality_score(joint_angles)

    # Build phases dict in serializable format
    phases_dict = {
        phase: {"start_frame": bounds[0], "end_frame": bounds[1]}
        for phase, bounds in seg.phases.items()
    }

    logger.info(
        "Biomechanics: elbow=%.1f° knee=%.1f° paddle_angle=%.1f° quality=%d",
        elbow_angle, knee_angle, paddle_contact["paddle_face_angle_degrees"], quality_score,
    )

    return BiomechanicsOutput(
        shot_type=shot_type,
        total_frames_analyzed=n,
        dominant_side=dominant,
        phases=phases_dict,
        joint_angles=joint_angles,
        weight_transfer=weight_transfer,
        swing_metrics=swing_metrics,
        paddle_contact=paddle_contact,
        knee_bend_at_contact_degrees=round(knee_angle, 2),
        hip_rotation_degrees=round(hip_rotation, 2),
        contact_point_x=round(float(paddle_contact["contact_point_x"]), 4),
        overall_quality_score=quality_score,
    )

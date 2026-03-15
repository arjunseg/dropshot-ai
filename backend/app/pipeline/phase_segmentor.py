"""
Shot phase segmentation.

Segments a sequence of pose frames into:
  PREPARATION → BACKSWING → FORWARD_SWING → CONTACT → FOLLOW_THROUGH → RECOVERY

Detection strategy:
1. Compute wrist velocity (normalized, frame-to-frame) for dominant hand wrist
2. Identify contact frame as the peak paddle confidence frame near peak wrist speed
3. Work backwards/forwards from contact to find phase boundaries using velocity
   thresholds and direction changes
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from enum import StrEnum

import numpy as np

from app.pipeline.paddle_detector import PaddleDetection
from app.pipeline.pose_estimator import PoseFrame, get_landmark

logger = logging.getLogger(__name__)


class ShotPhase(StrEnum):
    PREPARATION = "preparation"
    BACKSWING = "backswing"
    FORWARD_SWING = "forward_swing"
    CONTACT = "contact"
    FOLLOW_THROUGH = "follow_through"
    RECOVERY = "recovery"


@dataclass
class PhaseSegmentation:
    # Frame index ranges for each phase (inclusive)
    phases: dict[str, tuple[int, int]]  # phase_name -> (start_frame, end_frame)
    contact_frame: int
    dominant_side: str  # "right" or "left"
    # Per-frame phase labels
    frame_labels: list[str]


def _wrist_positions(
    pose_frames: list[PoseFrame], side: str
) -> np.ndarray:
    """Extract wrist (x, y) normalized coordinates per frame. Shape: (N, 2)"""
    joint = f"{side}_wrist"
    positions = []
    for pf in pose_frames:
        lm = get_landmark(pf, joint)
        positions.append([lm.x, lm.y])
    return np.array(positions, dtype=float)


def _compute_velocity(positions: np.ndarray) -> np.ndarray:
    """Frame-to-frame velocity magnitude. Length = N-1."""
    diff = np.diff(positions, axis=0)
    return np.sqrt((diff ** 2).sum(axis=1))


def _smooth(signal: np.ndarray, window: int = 5) -> np.ndarray:
    """Simple moving average smoothing."""
    if len(signal) < window:
        return signal
    kernel = np.ones(window) / window
    return np.convolve(signal, kernel, mode="same")


def _detect_dominant_side(pose_frames: list[PoseFrame]) -> str:
    """
    Heuristic: the dominant hand is the one whose wrist has higher average
    x-axis velocity across the middle portion of the clip.
    """
    mid_start = len(pose_frames) // 4
    mid_end = 3 * len(pose_frames) // 4
    mid_frames = pose_frames[mid_start:mid_end]

    right_pos = _wrist_positions(mid_frames, "right")
    left_pos = _wrist_positions(mid_frames, "left")

    right_vel = _compute_velocity(right_pos).mean() if len(right_pos) > 1 else 0
    left_vel = _compute_velocity(left_pos).mean() if len(left_pos) > 1 else 0

    return "right" if right_vel >= left_vel else "left"


def segment_phases(
    pose_frames: list[PoseFrame],
    paddle_detections: list[PaddleDetection | None],
    fps: float = 30.0,
) -> PhaseSegmentation:
    n = len(pose_frames)

    if n < 10:
        # Too short — label everything as contact
        labels = [ShotPhase.CONTACT.value] * n
        return PhaseSegmentation(
            phases={ShotPhase.CONTACT.value: (0, n - 1)},
            contact_frame=n // 2,
            dominant_side="right",
            frame_labels=labels,
        )

    dominant = _detect_dominant_side(pose_frames)
    wrist_pos = _wrist_positions(pose_frames, dominant)
    velocity = _smooth(_compute_velocity(wrist_pos))

    # Pad velocity back to length N
    vel_padded = np.concatenate([[velocity[0]], velocity])

    # Find contact frame: peak velocity that also has highest paddle confidence nearby
    # Weight velocity by paddle confidence
    paddle_conf = np.array([
        (d.confidence if d else 0.0) for d in paddle_detections
    ])
    weighted = vel_padded * (1.0 + paddle_conf * 2.0)  # Boost frames with high paddle conf

    contact_frame = int(np.argmax(weighted))
    # Constrain contact to middle 60% of clip to avoid edge artifacts
    contact_frame = max(n // 5, min(int(n * 0.8), contact_frame))

    logger.debug("Contact frame estimated at %d/%d", contact_frame, n)

    # Define phase boundaries relative to contact frame
    # Approximate durations at 30fps: prep ~15%, backswing ~15%, fwd ~15%, contact 2f, follow ~25%, recovery rest
    prep_end = max(0, contact_frame - int(fps * 0.45))
    backswing_end = max(0, contact_frame - int(fps * 0.30))
    forward_end = max(0, contact_frame - int(fps * 0.05))
    contact_end = min(n - 1, contact_frame + 2)
    follow_end = min(n - 1, contact_frame + int(fps * 0.5))

    phases: dict[str, tuple[int, int]] = {
        ShotPhase.PREPARATION.value: (0, max(0, prep_end - 1)),
        ShotPhase.BACKSWING.value: (prep_end, max(prep_end, backswing_end - 1)),
        ShotPhase.FORWARD_SWING.value: (backswing_end, max(backswing_end, forward_end - 1)),
        ShotPhase.CONTACT.value: (forward_end, contact_end),
        ShotPhase.FOLLOW_THROUGH.value: (contact_end + 1, follow_end),
        ShotPhase.RECOVERY.value: (follow_end + 1, n - 1),
    }

    # Build per-frame labels
    labels = [ShotPhase.PREPARATION.value] * n
    for phase_name, (start, end) in phases.items():
        for i in range(max(0, start), min(n, end + 1)):
            labels[i] = phase_name

    return PhaseSegmentation(
        phases=phases,
        contact_frame=contact_frame,
        dominant_side=dominant,
        frame_labels=labels,
    )

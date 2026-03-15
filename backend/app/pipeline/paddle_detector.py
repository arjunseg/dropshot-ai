"""
YOLOv8 paddle detection.

In production this uses a custom-trained YOLOv8n model fine-tuned on pickleball
paddle images. For development / environments without the model file, it falls
back to a heuristic estimator based on wrist position.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


@dataclass
class PaddleDetection:
    frame_index: int
    x1: float  # normalized 0–1
    y1: float
    x2: float
    y2: float
    confidence: float
    center_x: float
    center_y: float
    # Estimated paddle face angle (0=perpendicular to ground, +90=face up, -90=face down)
    estimated_angle_degrees: float


def _heuristic_from_wrist(
    frame_index: int,
    wrist_x: float,
    wrist_y: float,
) -> PaddleDetection:
    """
    Fallback: estimate paddle position from wrist location.
    Assumes paddle extends ~5% of frame width beyond the wrist in the dominant hand direction.
    Angle is not available in fallback mode.
    """
    offset = 0.05
    return PaddleDetection(
        frame_index=frame_index,
        x1=wrist_x - offset,
        y1=wrist_y - offset,
        x2=wrist_x + offset,
        y2=wrist_y + offset,
        confidence=0.3,  # Low confidence — heuristic only
        center_x=wrist_x,
        center_y=wrist_y,
        estimated_angle_degrees=0.0,
    )


def run_paddle_detection(
    frames: list[np.ndarray],
    wrist_positions: list[tuple[float, float]] | None = None,
) -> list[PaddleDetection | None]:
    """
    Detect paddle in each frame.

    Args:
        frames: BGR frames from video
        wrist_positions: Optional list of (x, y) normalized wrist coords per frame,
                         used as fallback if YOLO model is unavailable.

    Returns:
        List of PaddleDetection or None if not detected.
    """
    model_path = Path(settings.paddle_model_path)

    if model_path.exists():
        return _run_yolo_detection(frames, model_path)
    else:
        logger.warning(
            "Paddle model not found at %s — using wrist-position heuristic fallback",
            model_path,
        )
        return _run_heuristic_detection(frames, wrist_positions)


def _run_yolo_detection(
    frames: list[np.ndarray],
    model_path: Path,
) -> list[PaddleDetection | None]:
    """Run actual YOLOv8 inference."""
    from ultralytics import YOLO

    model = YOLO(str(model_path))
    threshold = settings.paddle_confidence_threshold
    detections: list[PaddleDetection | None] = []

    for idx, frame in enumerate(frames):
        h, w = frame.shape[:2]
        results = model(frame, verbose=False)

        best: PaddleDetection | None = None
        best_conf = threshold

        for r in results:
            for box in r.boxes:
                conf = float(box.conf[0])
                if conf < best_conf:
                    continue
                x1, y1, x2, y2 = [float(v) for v in box.xyxy[0]]
                cx = (x1 + x2) / 2 / w
                cy = (y1 + y2) / 2 / h
                # Estimate paddle angle from bounding box aspect and orientation
                box_w = x2 - x1
                box_h = y2 - y1
                angle = np.degrees(np.arctan2(box_h, box_w)) - 45
                best = PaddleDetection(
                    frame_index=idx,
                    x1=x1 / w, y1=y1 / h, x2=x2 / w, y2=y2 / h,
                    confidence=conf,
                    center_x=cx,
                    center_y=cy,
                    estimated_angle_degrees=float(angle),
                )
                best_conf = conf

        detections.append(best)

    detected_count = sum(1 for d in detections if d is not None)
    logger.info("Paddle detection: %d/%d frames", detected_count, len(frames))
    return detections


def _run_heuristic_detection(
    frames: list[np.ndarray],
    wrist_positions: list[tuple[float, float]] | None,
) -> list[PaddleDetection | None]:
    detections: list[PaddleDetection | None] = []
    for idx, _ in enumerate(frames):
        if wrist_positions and idx < len(wrist_positions):
            wx, wy = wrist_positions[idx]
            if wx > 0 and wy > 0:
                detections.append(_heuristic_from_wrist(idx, wx, wy))
                continue
        detections.append(None)
    return detections

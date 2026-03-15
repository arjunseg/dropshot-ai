"""
OpenCV helpers for frame extraction and video metadata.
"""
from __future__ import annotations

import logging
from pathlib import Path

import cv2
import numpy as np

logger = logging.getLogger(__name__)


def get_video_metadata(video_path: Path) -> dict:
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration_seconds = total_frames / fps if fps > 0 else 0

    cap.release()
    return {
        "fps": fps,
        "total_frames": total_frames,
        "width": width,
        "height": height,
        "duration_seconds": duration_seconds,
    }


def extract_frames(
    video_path: Path,
    target_fps: int = 30,
    max_frames: int = 1800,  # 60 seconds at 30 fps
) -> list[np.ndarray]:
    """
    Extract frames from video at target_fps, returning as list of BGR numpy arrays.
    Will downsample if source FPS > target_fps.
    """
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {video_path}")

    source_fps = cap.get(cv2.CAP_PROP_FPS)
    frame_interval = max(1, round(source_fps / target_fps))

    frames: list[np.ndarray] = []
    frame_idx = 0

    while len(frames) < max_frames:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % frame_interval == 0:
            frames.append(frame)
        frame_idx += 1

    cap.release()
    logger.info("Extracted %d frames from %s (source %.1f fps, target %d fps)",
                len(frames), video_path.name, source_fps, target_fps)
    return frames


def extract_thumbnail(video_path: Path, output_path: Path, timestamp_seconds: float = 1.0) -> None:
    """Extract a single frame as JPEG thumbnail."""
    cap = cv2.VideoCapture(str(video_path))
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_num = int(timestamp_seconds * fps)
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
    ret, frame = cap.read()
    cap.release()

    if ret:
        # Resize to standard thumbnail dimensions
        thumb = cv2.resize(frame, (480, 270))
        cv2.imwrite(str(output_path), thumb, [cv2.IMWRITE_JPEG_QUALITY, 85])
    else:
        logger.warning("Could not extract thumbnail from %s at t=%.1fs", video_path, timestamp_seconds)


def draw_skeleton_frame(
    frame: np.ndarray,
    landmarks: list[dict],  # [{x, y, z, visibility}]
    connections: list[tuple[int, int]],
    color: tuple[int, int, int] = (0, 255, 100),
    thickness: int = 2,
) -> np.ndarray:
    """Draw pose skeleton on a frame for debug visualization."""
    h, w = frame.shape[:2]
    out = frame.copy()

    # Draw connections
    for start_idx, end_idx in connections:
        if start_idx >= len(landmarks) or end_idx >= len(landmarks):
            continue
        lm_start = landmarks[start_idx]
        lm_end = landmarks[end_idx]
        if lm_start["visibility"] < 0.5 or lm_end["visibility"] < 0.5:
            continue
        pt1 = (int(lm_start["x"] * w), int(lm_start["y"] * h))
        pt2 = (int(lm_end["x"] * w), int(lm_end["y"] * h))
        cv2.line(out, pt1, pt2, color, thickness)

    # Draw joints
    for lm in landmarks:
        if lm["visibility"] < 0.5:
            continue
        pt = (int(lm["x"] * w), int(lm["y"] * h))
        cv2.circle(out, pt, 4, (255, 255, 255), -1)
        cv2.circle(out, pt, 4, color, 1)

    return out

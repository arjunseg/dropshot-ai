"""
MediaPipe Pose: extracts 33 body landmarks per frame.
Returns normalized [0,1] coordinates per joint.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass

import mediapipe as mp
import numpy as np

logger = logging.getLogger(__name__)

# MediaPipe joint indices (subset we care about)
JOINT_INDEX = {
    "nose": 0,
    "left_shoulder": 11,
    "right_shoulder": 12,
    "left_elbow": 13,
    "right_elbow": 14,
    "left_wrist": 15,
    "right_wrist": 16,
    "left_hip": 23,
    "right_hip": 24,
    "left_knee": 25,
    "right_knee": 26,
    "left_ankle": 27,
    "right_ankle": 28,
}

# Skeleton connections for visualization
POSE_CONNECTIONS = [
    (11, 12),  # shoulders
    (11, 13), (13, 15),  # left arm
    (12, 14), (14, 16),  # right arm
    (11, 23), (12, 24),  # torso sides
    (23, 24),  # hips
    (23, 25), (25, 27),  # left leg
    (24, 26), (26, 28),  # right leg
]


@dataclass
class PoseLandmark:
    x: float  # normalized 0–1 (horizontal)
    y: float  # normalized 0–1 (vertical, 0=top)
    z: float  # depth relative to hip (negative = closer to camera)
    visibility: float  # 0–1 confidence


@dataclass
class PoseFrame:
    frame_index: int
    landmarks: list[PoseLandmark]  # 33 landmarks


def run_pose_estimation(frames: list[np.ndarray]) -> list[PoseFrame]:
    """
    Run MediaPipe Pose on a list of BGR frames.
    Returns PoseFrame per input frame (with None landmarks if detection failed).
    """
    mp_pose = mp.solutions.pose  # type: ignore[attr-defined]

    pose_frames: list[PoseFrame] = []

    with mp_pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        enable_segmentation=False,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ) as pose:
        for idx, frame in enumerate(frames):
            # MediaPipe expects RGB
            rgb = frame[:, :, ::-1]
            results = pose.process(rgb)

            if results.pose_landmarks:
                landmarks = [
                    PoseLandmark(
                        x=lm.x,
                        y=lm.y,
                        z=lm.z,
                        visibility=lm.visibility,
                    )
                    for lm in results.pose_landmarks.landmark
                ]
            else:
                # No detection — fill with zero-visibility landmarks
                landmarks = [PoseLandmark(0.0, 0.0, 0.0, 0.0)] * 33

            pose_frames.append(PoseFrame(frame_index=idx, landmarks=landmarks))

    detected = sum(1 for pf in pose_frames if pf.landmarks[0].visibility > 0.1)
    logger.info("Pose estimation: %d/%d frames with detections", detected, len(frames))
    return pose_frames


def get_landmark(pose_frame: PoseFrame, joint_name: str) -> PoseLandmark:
    idx = JOINT_INDEX[joint_name]
    return pose_frame.landmarks[idx]


def pose_frames_to_dict(pose_frames: list[PoseFrame]) -> list[dict]:
    """Serialize pose frames for JSON storage in S3."""
    return [
        {
            "frame_index": pf.frame_index,
            "landmarks": [
                {"x": lm.x, "y": lm.y, "z": lm.z, "visibility": lm.visibility}
                for lm in pf.landmarks
            ],
        }
        for pf in pose_frames
    ]

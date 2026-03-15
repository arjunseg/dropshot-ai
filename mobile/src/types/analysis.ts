export type AnalysisStatus =
  | "pending"
  | "downloading"
  | "pose_estimation"
  | "paddle_detection"
  | "phase_segmentation"
  | "biomechanics"
  | "generating_feedback"
  | "complete"
  | "failed";

export type ShotType =
  | "third_shot_drop"
  | "dink"
  | "serve"
  | "volley"
  | "return"
  | "full_rally";

export interface JointAngle {
  name: string;
  value_degrees: number;
  ideal_min: number;
  ideal_max: number;
  deviation: number;
  phase: string;
}

export interface BiomechanicsResult {
  shot_type: ShotType;
  total_frames_analyzed: number;
  dominant_side: "left" | "right";
  phases: Record<string, { start_frame: number; end_frame: number }>;
  joint_angles: JointAngle[];
  weight_transfer: { direction: string; magnitude: number };
  swing_metrics: {
    backswing_duration_ms: number;
    forward_swing_duration_ms: number;
    contact_frame: number;
    follow_through_duration_ms: number;
    swing_arc_degrees: number;
  };
  paddle_contact: {
    contact_point_x: number;
    contact_point_y: number;
    paddle_face_angle_degrees: number;
    wrist_firmness_score: number;
  };
  knee_bend_at_contact_degrees: number;
  hip_rotation_degrees: number;
  contact_point_x: number;
  overall_quality_score: number;
}

export interface Improvement {
  priority: number;
  title: string;
  explanation: string;
  drill: string;
  affected_metric: string;
}

export interface CoachingFeedback {
  overall_score: number;
  one_line_summary: string;
  strengths: string[];
  improvements: Improvement[];
  raw_response: string;
}

export interface Analysis {
  id: string;
  user_id: string;
  shot_type: ShotType;
  status: AnalysisStatus;
  overall_score: number | null;
  video_s3_key: string;
  video_url: string;
  thumbnail_s3_key: string | null;
  thumbnail_url: string | null;
  video_duration_seconds: number | null;
  biomechanics_result: BiomechanicsResult | null;
  coaching_feedback: CoachingFeedback | null;
  error_message: string | null;
  created_at: string;
  processing_completed_at: string | null;
}

export const PROCESSING_STATUSES: AnalysisStatus[] = [
  "pending",
  "downloading",
  "pose_estimation",
  "paddle_detection",
  "phase_segmentation",
  "biomechanics",
  "generating_feedback",
];

export const STATUS_LABELS: Record<AnalysisStatus, string> = {
  pending: "Preparing...",
  downloading: "Loading video...",
  pose_estimation: "Tracking your body...",
  paddle_detection: "Finding your paddle...",
  phase_segmentation: "Breaking down the shot...",
  biomechanics: "Analyzing mechanics...",
  generating_feedback: "Writing coaching tips...",
  complete: "Complete",
  failed: "Failed",
};

export const STATUS_PROGRESS: Record<AnalysisStatus, number> = {
  pending: 0.05,
  downloading: 0.15,
  pose_estimation: 0.3,
  paddle_detection: 0.5,
  phase_segmentation: 0.65,
  biomechanics: 0.8,
  generating_feedback: 0.92,
  complete: 1.0,
  failed: 0,
};

export const SHOT_TYPE_LABELS: Record<ShotType, string> = {
  third_shot_drop: "Third Shot Drop",
  dink: "Dink",
  serve: "Serve",
  volley: "Volley",
  return: "Return",
  full_rally: "Full Rally",
};

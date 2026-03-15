export const IDEAL_ANGLE_RANGES = {
  third_shot_drop: {
    elbow_at_contact: { min: 140, max: 165, label: "Elbow Angle" },
    shoulder_at_contact: { min: 20, max: 50, label: "Shoulder Elevation" },
    knee_at_contact: { min: 110, max: 145, label: "Knee Bend" },
    hip_forward_tilt: { min: 10, max: 30, label: "Trunk Lean" },
    paddle_face_angle: { min: 5, max: 25, label: "Paddle Face Angle" },
    backswing_duration_ms: { min: 100, max: 350, label: "Backswing Duration" },
  },
};

export const SHOT_PHASES = [
  "preparation",
  "backswing",
  "forward_swing",
  "contact",
  "follow_through",
  "recovery",
] as const;

export const JOINT_METRIC_DESCRIPTIONS: Record<string, string> = {
  elbow_at_contact: "How extended your arm is at the moment of contact",
  shoulder_at_contact: "How elevated your paddle arm shoulder is",
  knee_at_contact: "How bent your knees are at contact — lower is better",
  hip_forward_tilt: "How much you're leaning your torso forward",
  paddle_face_angle: "Openness of paddle face — open face creates arc trajectory",
  wrist_firmness_score: "Stability of your wrist at contact — reduces mis-hits",
  backswing_duration_ms: "How long your backswing takes — compact is better",
  swing_arc_degrees: "Total arc your paddle travels through the swing",
};

export const FREE_TIER_MONTHLY_LIMIT = 3;

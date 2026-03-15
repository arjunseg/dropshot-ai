"""
Claude-powered coaching feedback generator.

Takes the structured biomechanics output and produces actionable coaching advice
in a JSON schema that the mobile app renders directly into UI components.
"""
from __future__ import annotations

import json
import logging

import anthropic

from app.config import get_settings
from app.pipeline.biomechanics import BiomechanicsOutput

settings = get_settings()
logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an elite pickleball coach with 15+ years of experience,
PPR (Professional Pickleball Registry) certified, who has trained players from 2.5 to 5.5 DUPR.

You receive structured biomechanical data about a player's shot and produce specific,
prioritized coaching feedback. Your tone is encouraging but honest — like a good coach
who respects the player's intelligence. You never pad feedback with generic advice.

CRITICAL: You must respond with ONLY valid JSON matching this exact schema:
{
  "overall_score": <integer 0-100>,
  "one_line_summary": <string: one sentence summary of the shot>,
  "strengths": [<string>, <string>],
  "improvements": [
    {
      "priority": 1,
      "title": <string: short fix title, max 8 words>,
      "explanation": <string: 2-3 sentences explaining what's wrong and WHY it matters>,
      "drill": <string: one specific drill to fix it>,
      "affected_metric": <string: metric name from input>
    },
    ... up to 3 improvements
  ]
}

Scoring guide:
- 85-100: Near-pro mechanics. Small refinements only.
- 70-84: Solid technique with 1-2 fixable issues.
- 55-69: Average player. Key mechanics need work.
- 40-54: Multiple issues. Fundamentals need attention.
- 0-39: Significant form problems. Go back to basics.

For third_shot_drop analysis, weight these metrics highest:
1. Paddle face angle (open face = arc trajectory = drops into kitchen)
2. Contact point (out in front = leverages core, not arm)
3. Knee bend (low contact = natural arc upward)
4. Wrist firmness (no flip = consistent touch)

Always reference specific measured values in your explanation (e.g., "your elbow was at 132°
when it should be 140-165°") so players understand the precision of the analysis."""


SHOT_TYPE_CONTEXT = {
    "third_shot_drop": "a third shot drop — the most critical transition shot in pickleball, designed to arc over the net and land softly in the kitchen (non-volley zone), forcing opponents back from the NVZ line",
    "dink": "a dink — a soft, controlled shot from the NVZ line intended to land in the opponent's kitchen",
    "serve": "a pickleball serve — must be hit underhand below waist with an upward arc",
    "volley": "a volley — a punch shot taken out of the air before the ball bounces, requiring a compact stroke",
    "return": "a return of serve — deep return designed to give time to advance to the kitchen line",
}


def generate_feedback(bio: BiomechanicsOutput, skill_level: float | None = None) -> dict:
    """
    Call Claude API with biomechanics data and return parsed coaching feedback.
    Falls back to a structured default if Claude is unavailable.
    """
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    shot_context = SHOT_TYPE_CONTEXT.get(bio.shot_type, bio.shot_type)
    skill_str = f"{skill_level:.1f}" if skill_level else "unknown"

    # Build the metrics summary for Claude
    metrics_lines = []
    for ja in bio.joint_angles:
        dev_str = ""
        if ja["deviation"] > 0:
            dev_str = f" [+{ja['deviation']:.1f} ABOVE ideal max of {ja['ideal_max']}°]"
        elif ja["deviation"] < 0:
            dev_str = f" [{ja['deviation']:.1f} BELOW ideal min of {ja['ideal_min']}°]"
        else:
            dev_str = " [WITHIN ideal range ✓]"
        metrics_lines.append(
            f"  - {ja['name']}: {ja['value_degrees']:.1f}° (ideal: {ja['ideal_min']}–{ja['ideal_max']}°){dev_str}"
        )

    user_message = f"""Player DUPR skill level: {skill_str}
Shot type: {bio.shot_type} — {shot_context}
Dominant side: {bio.dominant_side}
Frames analyzed: {bio.total_frames_analyzed}

== BIOMECHANICAL METRICS AT CONTACT ==
{chr(10).join(metrics_lines)}

== TIMING ==
  - Backswing duration: {bio.swing_metrics.get('backswing_duration_ms', 0):.0f}ms (ideal: 100–350ms)
  - Forward swing duration: {bio.swing_metrics.get('forward_swing_duration_ms', 0):.0f}ms
  - Follow-through duration: {bio.swing_metrics.get('follow_through_duration_ms', 0):.0f}ms

== BODY MECHANICS ==
  - Knee bend at contact: {bio.knee_bend_at_contact_degrees:.1f}° (ideal: 110–145°)
  - Hip rotation through swing: {bio.hip_rotation_degrees:.1f}°
  - Forward trunk lean: see hip_forward_tilt above

== CONTACT POINT ==
  - Contact relative to hip center: x={bio.contact_point_x:.3f}
    (positive = in front of body, good; negative = beside/behind hip, bad)

== WEIGHT TRANSFER ==
  - Direction: {bio.weight_transfer.get('direction', 'unknown')}
  - Magnitude: {bio.weight_transfer.get('magnitude', 0):.2f} (0=no transfer, 1=full transfer)

Pre-analysis quality estimate: {bio.overall_quality_score}/100 (override with your expert judgment)

Provide your coaching feedback JSON now:"""

    logger.info("Calling Claude API for coaching feedback (shot: %s)", bio.shot_type)

    try:
        message = client.messages.create(
            model=settings.claude_model,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )

        raw_text = message.content[0].text.strip()

        # Strip markdown code fences if present
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
        raw_text = raw_text.strip()

        feedback = json.loads(raw_text)
        feedback["raw_response"] = raw_text
        logger.info("Claude feedback generated: score=%d", feedback.get("overall_score", 0))
        return feedback

    except json.JSONDecodeError as e:
        logger.error("Claude returned non-JSON response: %s", e)
        return _fallback_feedback(bio)
    except Exception as e:
        logger.error("Claude API call failed: %s", e)
        return _fallback_feedback(bio)


def _fallback_feedback(bio: BiomechanicsOutput) -> dict:
    """Structured fallback used when Claude is unavailable."""
    issues = [ja for ja in bio.joint_angles if ja["deviation"] != 0.0]
    issues.sort(key=lambda x: abs(x["deviation"]), reverse=True)

    improvements = []
    for i, issue in enumerate(issues[:3]):
        improvements.append({
            "priority": i + 1,
            "title": f"Adjust {issue['name'].replace('_', ' ')}",
            "explanation": (
                f"Your {issue['name'].replace('_', ' ')} measured {issue['value_degrees']:.1f}°, "
                f"outside the ideal range of {issue['ideal_min']}–{issue['ideal_max']}°. "
                f"This deviation of {issue['deviation']:+.1f}° affects shot quality."
            ),
            "drill": "Work with a coach to isolate and correct this movement pattern.",
            "affected_metric": issue["name"],
        })

    return {
        "overall_score": bio.overall_quality_score,
        "one_line_summary": f"Your {bio.shot_type.replace('_', ' ')} scored {bio.overall_quality_score}/100 with {len(issues)} metrics outside ideal range.",
        "strengths": [
            "Video analysis successfully processed",
            "Motion data captured for all key phases",
        ],
        "improvements": improvements or [{
            "priority": 1,
            "title": "Great mechanics overall",
            "explanation": "All measured metrics are within ideal ranges.",
            "drill": "Maintain this form and focus on consistency.",
            "affected_metric": "overall",
        }],
        "raw_response": "fallback",
    }

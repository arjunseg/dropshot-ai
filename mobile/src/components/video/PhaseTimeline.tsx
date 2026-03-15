import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";
import { radius, spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

interface Phase {
  name: string;
  startFrame: number;
  endFrame: number;
}

interface Props {
  phases: Phase[];
  totalFrames: number;
  currentFrame?: number;
  contactFrame?: number;
}

const PHASE_COLORS: Record<string, string> = {
  preparation: "#4A5270",
  backswing: "#1565C0",
  forward_swing: "#0288D1",
  contact: "#00C853",
  follow_through: "#FFD600",
  recovery: "#4A5270",
};

const PHASE_LABELS: Record<string, string> = {
  preparation: "Prep",
  backswing: "Backswing",
  forward_swing: "Forward",
  contact: "Contact",
  follow_through: "Follow",
  recovery: "Recovery",
};

export function PhaseTimeline({ phases, totalFrames, currentFrame, contactFrame }: Props) {
  if (!phases.length) return null;

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        {phases.map((phase) => {
          const width = ((phase.endFrame - phase.startFrame) / totalFrames) * 100;
          const color = PHASE_COLORS[phase.name] ?? colors.surface;
          const isContact = phase.name === "contact";

          return (
            <View
              key={phase.name}
              style={[
                styles.segment,
                {
                  width: `${width}%`,
                  backgroundColor: color,
                  borderWidth: isContact ? 1 : 0,
                  borderColor: colors.courtGreen,
                },
              ]}
            />
          );
        })}

        {/* Current position indicator */}
        {currentFrame !== undefined && (
          <View
            style={[
              styles.cursor,
              { left: `${(currentFrame / totalFrames) * 100}%` },
            ]}
          />
        )}
      </View>

      {/* Phase labels */}
      <View style={styles.labels}>
        {phases.map((phase) => {
          const width = ((phase.endFrame - phase.startFrame) / totalFrames) * 100;
          if (width < 8) return null; // Skip labels for tiny phases
          return (
            <View key={phase.name} style={{ width: `${width}%`, alignItems: "center" }}>
              <Text style={[typography.caption, { color: PHASE_COLORS[phase.name] ?? colors.textMuted }]}>
                {PHASE_LABELS[phase.name] ?? phase.name}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  track: {
    flexDirection: "row",
    height: 8,
    borderRadius: radius.full,
    overflow: "visible",
    backgroundColor: colors.surface,
  },
  segment: {
    height: "100%",
  },
  cursor: {
    position: "absolute",
    top: -4,
    width: 2,
    height: 16,
    backgroundColor: "#fff",
    borderRadius: 1,
  },
  labels: {
    flexDirection: "row",
  },
});

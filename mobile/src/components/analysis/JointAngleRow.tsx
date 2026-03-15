import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { colors, getScoreColor } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { JointAngle } from "@/types/analysis";
import { JOINT_METRIC_DESCRIPTIONS } from "@/utils/constants";
import { formatAngle, formatDeviation } from "@/utils/formatters";

interface Props {
  angle: JointAngle;
}

export function JointAngleRow({ angle }: Props) {
  const isIdeal = angle.deviation === 0;
  const deviationColor = isIdeal
    ? colors.scoreExcellent
    : angle.deviation > 0
      ? colors.scorePoor
      : colors.warning;

  // Progress bar: how far into the ideal range the value is (0=at min, 1=at max)
  const rangeWidth = angle.ideal_max - angle.ideal_min;
  const progress = rangeWidth > 0
    ? Math.max(0, Math.min(1, (angle.value_degrees - angle.ideal_min) / rangeWidth))
    : 0.5;

  const label = angle.name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const description = JOINT_METRIC_DESCRIPTIONS[angle.name];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[typography.label, { color: colors.textPrimary }]}>{label}</Text>
        <View style={styles.values}>
          <Text style={[typography.statSM, { color: isIdeal ? colors.scoreExcellent : deviationColor }]}>
            {formatAngle(angle.value_degrees)}
          </Text>
          <Text style={[typography.caption, { color: deviationColor, marginLeft: spacing.xs }]}>
            {formatDeviation(angle.deviation)}
          </Text>
        </View>
      </View>

      {description && (
        <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs }]}>
          {description}
        </Text>
      )}

      <View style={styles.barRow}>
        <Text style={[typography.caption, { color: colors.textMuted, width: 36 }]}>
          {angle.ideal_min}°
        </Text>
        <View style={{ flex: 1, marginHorizontal: spacing.xs }}>
          <ProgressBar
            progress={isIdeal ? progress : Math.max(0.05, Math.min(0.95, progress))}
            color={isIdeal ? colors.courtGreen : deviationColor}
            height={4}
          />
        </View>
        <Text style={[typography.caption, { color: colors.textMuted, width: 36, textAlign: "right" }]}>
          {angle.ideal_max}°
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  values: {
    flexDirection: "row",
    alignItems: "center",
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});

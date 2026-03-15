import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Card } from "@/components/ui/Card";
import { colors } from "@/theme/colors";
import { radius, spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { CoachingFeedback, Improvement } from "@/types/analysis";

interface Props {
  feedback: CoachingFeedback;
}

function ImprovementItem({ item }: { item: Improvement }) {
  const [expanded, setExpanded] = useState(false);

  const priorityColors = [colors.error, colors.paddleOrange, colors.warning];
  const priorityColor = priorityColors[item.priority - 1] ?? colors.textSecondary;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => setExpanded(!expanded)}
      style={styles.improvementItem}
    >
      <View style={styles.improvementHeader}>
        <View style={[styles.priorityBadge, { backgroundColor: priorityColor + "22" }]}>
          <Text style={[typography.caption, { color: priorityColor }]}>#{item.priority}</Text>
        </View>
        <Text style={[typography.h3, { color: colors.textPrimary, flex: 1, marginLeft: spacing.sm }]}>
          {item.title}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 18 }}>{expanded ? "−" : "+"}</Text>
      </View>

      {expanded && (
        <View style={styles.improvementBody}>
          <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.md }]}>
            {item.explanation}
          </Text>
          <View style={styles.drillBox}>
            <Text style={[typography.label, { color: colors.courtGreen, marginBottom: 4 }]}>
              DRILL
            </Text>
            <Text style={[typography.body, { color: colors.textPrimary }]}>{item.drill}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function FeedbackCard({ feedback }: Props) {
  return (
    <View>
      {/* Summary */}
      <Card style={styles.summaryCard}>
        <Text style={[typography.bodyLG, { color: colors.textPrimary, fontStyle: "italic" }]}>
          "{feedback.one_line_summary}"
        </Text>
      </Card>

      {/* Strengths */}
      <Text style={[typography.h3, styles.sectionTitle]}>What You're Doing Well</Text>
      <Card style={{ marginBottom: spacing.lg }}>
        {feedback.strengths.map((s, i) => (
          <View key={i} style={styles.strengthRow}>
            <Text style={{ color: colors.courtGreen, fontSize: 16 }}>✓</Text>
            <Text style={[typography.body, { color: colors.textPrimary, flex: 1, marginLeft: spacing.sm }]}>
              {s}
            </Text>
          </View>
        ))}
      </Card>

      {/* Improvements */}
      <Text style={[typography.h3, styles.sectionTitle]}>Priority Fixes</Text>
      <Card>
        {feedback.improvements.map((imp) => (
          <ImprovementItem key={imp.priority} item={imp} />
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    marginBottom: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.courtGreen,
  },
  sectionTitle: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontSize: 12,
  },
  strengthRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  improvementItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  improvementHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    minWidth: 32,
    alignItems: "center",
  },
  improvementBody: {
    marginTop: spacing.md,
  },
  drillBox: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.courtGreen,
  },
});

import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useAnalysis } from "@/hooks/useAnalysis";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { STATUS_LABELS, STATUS_PROGRESS } from "@/types/analysis";

export default function Processing() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: analysis } = useAnalysis(id ?? "");

  useEffect(() => {
    if (!analysis) return;
    if (analysis.status === "complete") {
      router.replace(`/analysis/${id}`);
    } else if (analysis.status === "failed") {
      router.replace("/(tabs)/home");
    }
  }, [analysis?.status, id]);

  const status = analysis?.status ?? "pending";
  const progress = STATUS_PROGRESS[status] ?? 0.05;
  const label = STATUS_LABELS[status] ?? "Processing...";
  const shotType = analysis?.shot_type ?? "shot";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={colors.courtGreen} />

        <Text style={[typography.h2, styles.title]}>
          Analyzing your{"\n"}
          <Text style={{ color: colors.courtGreen }}>
            {shotType.replace(/_/g, " ")}
          </Text>
        </Text>

        <Text style={[typography.bodyLG, styles.subtitle]}>{label}</Text>

        <View style={styles.progressContainer}>
          <ProgressBar progress={progress} height={8} />
          <Text style={[typography.caption, styles.progressLabel]}>
            {Math.round(progress * 100)}%
          </Text>
        </View>

        {/* Steps */}
        <View style={styles.steps}>
          {[
            { key: "pose_estimation", label: "Body tracking", icon: "🦾" },
            { key: "paddle_detection", label: "Paddle detection", icon: "🏓" },
            { key: "biomechanics", label: "Mechanics analysis", icon: "📐" },
            { key: "generating_feedback", label: "AI coaching tips", icon: "🧠" },
          ].map((step) => {
            const stepProgress = STATUS_PROGRESS[step.key as any] ?? 0;
            const isDone = progress > stepProgress + 0.1;
            const isActive = Math.abs(progress - stepProgress) < 0.15;

            return (
              <View key={step.key} style={styles.stepRow}>
                <Text style={{ fontSize: 20, opacity: isDone ? 1 : isActive ? 1 : 0.3 }}>
                  {isDone ? "✅" : step.icon}
                </Text>
                <Text
                  style={[
                    typography.body,
                    {
                      color: isDone
                        ? colors.textPrimary
                        : isActive
                          ? colors.courtGreen
                          : colors.textMuted,
                      marginLeft: spacing.md,
                    },
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={[typography.caption, styles.hint]}>
          You'll get a notification when your analysis is ready.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  title: { color: colors.textPrimary, textAlign: "center" },
  subtitle: { color: colors.textSecondary, textAlign: "center" },
  progressContainer: { width: "100%", gap: spacing.xs },
  progressLabel: { color: colors.textMuted, alignSelf: "flex-end" },
  steps: { width: "100%", gap: spacing.sm },
  stepRow: { flexDirection: "row", alignItems: "center" },
  hint: { color: colors.textMuted, textAlign: "center" },
});

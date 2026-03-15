import { router } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ScoreGauge } from "@/components/analysis/ScoreGauge";
import { useAnalysisList } from "@/hooks/useAnalysis";
import { useUsageStats } from "@/hooks/useSubscription";
import { useAuthStore } from "@/store/authStore";
import { colors, getScoreColor } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { Analysis } from "@/types/analysis";
import { formatRelativeDate, formatShotType } from "@/utils/formatters";

function AnalysisListItem({ analysis }: { analysis: Analysis }) {
  const score = analysis.overall_score ?? 0;
  const isComplete = analysis.status === "complete";

  return (
    <Pressable
      onPress={() =>
        router.push(
          isComplete ? `/analysis/${analysis.id}` : `/analysis/processing?id=${analysis.id}`,
        )
      }
    >
      <Card style={styles.analysisCard}>
        {/* Score indicator */}
        <View style={[styles.scoreBar, { backgroundColor: getScoreColor(score) }]} />

        <View style={{ flex: 1 }}>
          <View style={styles.cardHeader}>
            <Text style={[typography.label, { color: colors.textPrimary }]}>
              {formatShotType(analysis.shot_type)}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {formatRelativeDate(analysis.created_at)}
            </Text>
          </View>

          {isComplete ? (
            <>
              <Text style={[typography.bodySM, { color: colors.textSecondary, marginTop: 4 }]}>
                {analysis.coaching_feedback?.one_line_summary ?? "Analysis complete"}
              </Text>
              <View style={styles.cardFooter}>
                <Text style={[typography.stat, { color: getScoreColor(score) }]}>{score}</Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>/100</Text>
              </View>
            </>
          ) : (
            <View style={{ marginTop: spacing.sm }}>
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>
                {analysis.status === "failed" ? "Analysis failed" : "Processing..."}
              </Text>
              {analysis.status !== "failed" && (
                <ProgressBar
                  progress={0.5}
                  color={colors.courtGreen}
                  height={3}
                  animated
                />
              )}
            </View>
          )}
        </View>
      </Card>
    </Pressable>
  );
}

export default function Home() {
  const { user } = useAuthStore();
  const { data: analysesData, isLoading } = useAnalysisList();
  const { data: usage } = useUsageStats();

  const analyses = analysesData?.analyses ?? [];

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <FlatList
        data={analyses}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => <AnalysisListItem analysis={item} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            {/* Greeting */}
            <Text style={[typography.h2, styles.greeting]}>
              Hey, {user?.full_name?.split(" ")[0] ?? "Player"} 👋
            </Text>

            {/* Usage card */}
            {usage && !usage.is_pro && (
              <Card style={styles.usageCard}>
                <View style={styles.usageHeader}>
                  <Text style={[typography.label, { color: colors.textPrimary }]}>
                    Free analyses this month
                  </Text>
                  <Pressable onPress={() => router.push("/subscription/paywall")}>
                    <Text style={[typography.caption, { color: colors.courtGreen }]}>
                      Upgrade →
                    </Text>
                  </Pressable>
                </View>
                <ProgressBar
                  progress={usage.analyses_this_month / usage.monthly_limit}
                  color={
                    usage.remaining === 0 ? colors.error : colors.courtGreen
                  }
                  height={6}
                  style={{ marginVertical: spacing.sm }}
                />
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {usage.analyses_this_month} / {usage.monthly_limit} used
                  {usage.remaining === 0
                    ? " — Upgrade for unlimited"
                    : ` — ${usage.remaining} remaining`}
                </Text>
              </Card>
            )}

            {/* Section header */}
            {analyses.length > 0 && (
              <Text style={[typography.label, styles.sectionLabel]}>RECENT ANALYSES</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={colors.courtGreen} style={{ marginTop: spacing.xxl }} />
          ) : (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 48 }}>🏓</Text>
              <Text style={[typography.h3, { color: colors.textPrimary, marginTop: spacing.md }]}>
                No analyses yet
              </Text>
              <Text style={[typography.body, { color: colors.textSecondary, textAlign: "center", marginTop: spacing.sm }]}>
                Record or upload a shot to get your first coaching feedback.
              </Text>
              <Pressable
                style={styles.emptyButton}
                onPress={() => router.push("/(tabs)/upload")}
              >
                <Text style={[typography.label, { color: colors.bg }]}>Analyze Your First Shot</Text>
              </Pressable>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  greeting: { color: colors.textPrimary, marginTop: spacing.lg, marginBottom: spacing.md },
  usageCard: { marginBottom: spacing.lg },
  usageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  analysisCard: {
    flexDirection: "row",
    marginBottom: spacing.sm,
    overflow: "hidden",
    padding: 0,
  },
  scoreBar: { width: 4, borderRadius: 0 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    paddingBottom: 4,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: 2,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.courtGreen,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 100,
  },
});

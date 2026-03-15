import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "@/components/ui/Card";
import { ScoreGauge } from "@/components/analysis/ScoreGauge";
import { useAnalysisList } from "@/hooks/useAnalysis";
import { colors, getScoreColor } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { Analysis } from "@/types/analysis";
import { formatDate, formatShotType } from "@/utils/formatters";

function computeStats(analyses: Analysis[]) {
  const complete = analyses.filter((a) => a.status === "complete" && a.overall_score !== null);
  if (!complete.length) return null;

  const scores = complete.map((a) => a.overall_score!);
  const avg = scores.reduce((s, n) => s + n, 0) / scores.length;
  const best = Math.max(...scores);
  const latest = scores[0];
  const trend = scores.length >= 2 ? latest - scores[1] : 0;

  // Score over time for sparkline
  const history = complete
    .slice(0, 10)
    .reverse()
    .map((a) => ({ date: a.created_at, score: a.overall_score! }));

  return { avg: Math.round(avg), best, latest, trend, history, total: complete.length };
}

export default function Progress() {
  const { data, isLoading } = useAnalysisList(1);
  const analyses = data?.analyses ?? [];
  const stats = computeStats(analyses);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[typography.h2, styles.title]}>Your Progress</Text>

        {isLoading && <ActivityIndicator color={colors.courtGreen} />}

        {!isLoading && !stats && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>📈</Text>
            <Text style={[typography.h3, { color: colors.textPrimary, marginTop: spacing.md }]}>
              No data yet
            </Text>
            <Text style={[typography.body, { color: colors.textSecondary, textAlign: "center" }]}>
              Complete your first analysis to start tracking improvement.
            </Text>
          </View>
        )}

        {stats && (
          <>
            {/* Summary stat cards */}
            <View style={styles.statGrid}>
              {[
                { label: "Latest Score", value: stats.latest, color: getScoreColor(stats.latest) },
                { label: "Best Score", value: stats.best, color: getScoreColor(stats.best) },
                { label: "Average", value: stats.avg, color: getScoreColor(stats.avg) },
                {
                  label: "Trend",
                  value: stats.trend >= 0 ? `+${stats.trend}` : `${stats.trend}`,
                  color: stats.trend >= 0 ? colors.courtGreen : colors.error,
                  isString: true,
                },
              ].map((s) => (
                <Card key={s.label} style={styles.statCard}>
                  <Text style={[typography.statLG, { color: s.color }]}>
                    {s.isString ? s.value : s.value}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    {s.label}
                  </Text>
                </Card>
              ))}
            </View>

            {/* Score history */}
            <Text style={[typography.label, styles.sectionLabel]}>SCORE HISTORY</Text>
            <Card>
              {/* Simple score history list — Victory Native chart integration here in v2 */}
              {stats.history.map((h, i) => (
                <View key={i} style={styles.historyRow}>
                  <Text style={[typography.bodySM, { color: colors.textSecondary, flex: 1 }]}>
                    {formatDate(h.date)}
                  </Text>
                  <View style={styles.historyBar}>
                    <View
                      style={[
                        styles.historyBarFill,
                        {
                          width: `${h.score}%`,
                          backgroundColor: getScoreColor(h.score),
                        },
                      ]}
                    />
                  </View>
                  <Text style={[typography.label, { color: getScoreColor(h.score), width: 36, textAlign: "right" }]}>
                    {h.score}
                  </Text>
                </View>
              ))}
            </Card>

            <Text style={[typography.caption, styles.hint]}>
              {stats.total} completed {stats.total === 1 ? "analysis" : "analyses"} total.
              Keep filming your shots to track improvement over time.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, gap: spacing.lg },
  title: { color: colors.textPrimary },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  statCard: { flex: 1, minWidth: "45%", alignItems: "center", padding: spacing.md },
  sectionLabel: { color: colors.textMuted, fontSize: 11, letterSpacing: 1.5 },
  historyRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm },
  historyBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.bg,
    borderRadius: 3,
    overflow: "hidden",
    marginHorizontal: spacing.sm,
  },
  historyBarFill: { height: "100%", borderRadius: 3 },
  empty: { alignItems: "center", paddingTop: spacing.xxxl, gap: spacing.sm },
  hint: { color: colors.textMuted, textAlign: "center" },
});

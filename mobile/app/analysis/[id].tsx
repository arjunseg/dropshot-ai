import { useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Video, ResizeMode } from "expo-av";
import { ScoreGauge } from "@/components/analysis/ScoreGauge";
import { FeedbackCard } from "@/components/analysis/FeedbackCard";
import { JointAngleRow } from "@/components/analysis/JointAngleRow";
import { PhaseTimeline } from "@/components/video/PhaseTimeline";
import { PoseOverlay } from "@/components/video/PoseOverlay";
import { useAnalysis } from "@/hooks/useAnalysis";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { formatShotType } from "@/utils/formatters";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const VIDEO_HEIGHT = SCREEN_WIDTH * (9 / 16);

type Tab = "coaching" | "mechanics" | "video";

export default function AnalysisResult() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: analysis, isLoading } = useAnalysis(id ?? "");
  const [activeTab, setActiveTab] = useState<Tab>("coaching");
  const [showOverlay, setShowOverlay] = useState(true);
  const videoRef = useRef(null);

  if (isLoading || !analysis) {
    return (
      <SafeAreaView style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.courtGreen} />
      </SafeAreaView>
    );
  }

  const bio = analysis.biomechanics_result;
  const feedback = analysis.coaching_feedback;
  const score = analysis.overall_score ?? 0;

  // Build phase array for timeline
  const phases = bio
    ? Object.entries(bio.phases).map(([name, bounds]) => ({
        name,
        startFrame: bounds.start_frame,
        endFrame: bounds.end_frame,
      }))
    : [];

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView stickyHeaderIndices={[1]}>
        {/* Video player */}
        <View style={styles.videoContainer}>
          <Video
            ref={videoRef}
            source={{ uri: analysis.video_url }}
            style={{ width: SCREEN_WIDTH, height: VIDEO_HEIGHT }}
            resizeMode={ResizeMode.COVER}
            isLooping
            shouldPlay
            isMuted
          />
          {/* Pose overlay toggle */}
          <TouchableOpacity
            style={styles.overlayToggle}
            onPress={() => setShowOverlay(!showOverlay)}
          >
            <Text style={[typography.caption, { color: showOverlay ? colors.courtGreen : colors.textSecondary }]}>
              {showOverlay ? "Skeleton ON" : "Skeleton OFF"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Phase timeline */}
        {bio && phases.length > 0 && (
          <View style={styles.timeline}>
            <PhaseTimeline
              phases={phases}
              totalFrames={bio.total_frames_analyzed}
              contactFrame={bio.swing_metrics.contact_frame}
            />
          </View>
        )}

        {/* Score + summary bar — sticky */}
        <View style={styles.scoreSummary}>
          <ScoreGauge score={score} size={80} />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={[typography.h3, { color: colors.textPrimary }]}>
              {formatShotType(analysis.shot_type)}
            </Text>
            <Text style={[typography.bodySM, { color: colors.textSecondary, marginTop: 4 }]}>
              {feedback?.one_line_summary?.slice(0, 80) ?? ""}
            </Text>
          </View>
        </View>

        {/* Tab bar */}
        <View style={styles.tabs}>
          {(["coaching", "mechanics", "video"] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  typography.label,
                  {
                    color: activeTab === tab ? colors.courtGreen : colors.textMuted,
                    textTransform: "capitalize",
                  },
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        <View style={styles.tabContent}>
          {activeTab === "coaching" && feedback && <FeedbackCard feedback={feedback} />}

          {activeTab === "mechanics" && bio && (
            <View>
              <Text style={[typography.label, styles.mechLabel]}>JOINT ANGLES AT CONTACT</Text>
              {bio.joint_angles.map((angle) => (
                <JointAngleRow key={angle.name} angle={angle} />
              ))}

              <Text style={[typography.label, styles.mechLabel]}>SWING TIMING</Text>
              <View style={styles.timingGrid}>
                {[
                  { label: "Backswing", value: `${bio.swing_metrics.backswing_duration_ms.toFixed(0)}ms` },
                  { label: "Forward", value: `${bio.swing_metrics.forward_swing_duration_ms.toFixed(0)}ms` },
                  { label: "Follow-through", value: `${bio.swing_metrics.follow_through_duration_ms.toFixed(0)}ms` },
                  { label: "Hip rotation", value: `${bio.hip_rotation_degrees.toFixed(1)}°` },
                ].map((m) => (
                  <View key={m.label} style={styles.timingItem}>
                    <Text style={[typography.stat, { color: colors.textPrimary }]}>{m.value}</Text>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>{m.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {activeTab === "video" && (
            <View style={styles.videoTab}>
              <Text style={[typography.body, { color: colors.textSecondary }]}>
                Frame-by-frame review coming in v2 — we're building a scrubber with
                per-frame skeleton overlay and side-by-side pro comparison.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  videoContainer: {
    width: SCREEN_WIDTH,
    height: VIDEO_HEIGHT,
    backgroundColor: "#000",
  },
  overlayToggle: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: "#000000AA",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timeline: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scoreSummary: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: colors.courtGreen,
  },
  tabContent: {
    padding: spacing.lg,
  },
  mechLabel: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 1.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  timingGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  timingItem: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  videoTab: {
    padding: spacing.md,
  },
});

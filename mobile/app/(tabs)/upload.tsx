import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useUpload } from "@/hooks/useUpload";
import { colors } from "@/theme/colors";
import { radius, spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { ShotType, SHOT_TYPE_LABELS } from "@/types/analysis";

const SHOT_TYPES: ShotType[] = ["third_shot_drop", "dink", "serve", "volley", "return"];

const SHOT_DESCRIPTIONS: Record<ShotType, string> = {
  third_shot_drop: "The most important shot. Arc the ball into the kitchen.",
  dink: "Soft shot from the NVZ line. Consistency over power.",
  serve: "Underhand serve below the waist.",
  volley: "Punch shot taken out of the air.",
  return: "Deep return to give time to advance.",
  full_rally: "Full point analysis — court positioning and shot selection.",
};

export default function Upload() {
  const { uploadVideo } = useUpload();
  const [selectedShot, setSelectedShot] = useState<ShotType>("third_shot_drop");
  const [uploading, setUploading] = useState(false);

  async function pickVideo() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow access to your photo library.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
      videoMaxDuration: 120,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    await startUpload(asset.uri, asset.fileName ?? "video.mp4", asset.fileSize ?? 0);
  }

  async function recordVideo() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow camera access.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 30,
      quality: 1,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    await startUpload(asset.uri, asset.fileName ?? "video.mp4", asset.fileSize ?? 0);
  }

  async function startUpload(uri: string, filename: string, fileSize: number) {
    setUploading(true);
    try {
      const analysisId = await uploadVideo(
        uri,
        filename,
        "video/mp4",
        fileSize,
        selectedShot,
      );
      router.push(`/analysis/processing?id=${analysisId}`);
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      if (typeof detail === "object" && detail?.upgrade_required) {
        router.push("/subscription/paywall");
      } else {
        Alert.alert(
          "Upload failed",
          typeof detail === "string" ? detail : error.message ?? "Something went wrong.",
        );
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[typography.h2, styles.heading]}>What shot are you analyzing?</Text>

        {/* Shot type selector */}
        <View style={styles.shotGrid}>
          {SHOT_TYPES.map((shot) => (
            <TouchableOpacity
              key={shot}
              style={[styles.shotChip, selectedShot === shot && styles.shotChipSelected]}
              onPress={() => setSelectedShot(shot)}
            >
              <Text
                style={[
                  typography.label,
                  {
                    color: selectedShot === shot ? colors.bg : colors.textPrimary,
                    fontSize: 13,
                  },
                ]}
              >
                {SHOT_TYPE_LABELS[shot]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Selected shot description */}
        <Card style={styles.descCard}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            {SHOT_DESCRIPTIONS[selectedShot]}
          </Text>
        </Card>

        {/* Filming tips */}
        <Text style={[typography.label, styles.sectionLabel]}>FILMING TIPS</Text>
        <Card>
          {[
            "Film from the side — face-on or 45° angle works best",
            "Your full body should be in frame",
            "5–15 second clip (just the shot, not the whole point)",
            "Good lighting — avoid backlit shots",
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={{ color: colors.courtGreen }}>•</Text>
              <Text style={[typography.bodySM, { color: colors.textSecondary, flex: 1, marginLeft: spacing.sm }]}>
                {tip}
              </Text>
            </View>
          ))}
        </Card>

        {/* Action buttons */}
        <View style={styles.actions}>
          <Button
            label="Record Now"
            size="lg"
            fullWidth
            loading={uploading}
            onPress={recordVideo}
            style={styles.recordButton}
          />
          <Button
            label="Upload from Library"
            variant="secondary"
            size="lg"
            fullWidth
            disabled={uploading}
            onPress={pickVideo}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, gap: spacing.lg },
  heading: { color: colors.textPrimary },
  shotGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  shotChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  shotChipSelected: {
    backgroundColor: colors.courtGreen,
    borderColor: colors.courtGreen,
  },
  descCard: { borderLeftWidth: 3, borderLeftColor: colors.courtGreen },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: -spacing.sm,
  },
  tipRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.sm },
  actions: { gap: spacing.md, paddingBottom: spacing.xl },
  recordButton: {},
});

import { router } from "expo-router";
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { createPortalSession } from "@/api/subscription";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { formatDate } from "@/utils/formatters";

function SettingsRow({ label, value, onPress }: { label: string; value?: string; onPress?: () => void }) {
  return (
    <TouchableOpacity
      style={styles.settingsRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={[typography.body, { color: colors.textPrimary }]}>{label}</Text>
      {value ? (
        <Text style={[typography.body, { color: colors.textSecondary }]}>{value}</Text>
      ) : onPress ? (
        <Text style={{ color: colors.textSecondary }}>›</Text>
      ) : null}
    </TouchableOpacity>
  );
}

export default function Profile() {
  const { user, logout } = useAuth();
  const { data: sub } = useSubscription();

  async function handleManageSub() {
    try {
      const { portal_url } = await createPortalSession("dropshot://");
      await Linking.openURL(portal_url);
    } catch {
      Alert.alert("Error", "Could not open billing portal. Please try again.");
    }
  }

  async function handleLogout() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/welcome");
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Avatar / name */}
        <View style={styles.avatar}>
          <View style={styles.avatarCircle}>
            <Text style={{ fontSize: 32 }}>
              {user?.full_name?.[0]?.toUpperCase() ?? "?"}
            </Text>
          </View>
          <Text style={[typography.h2, { color: colors.textPrimary, marginTop: spacing.md }]}>
            {user?.full_name}
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>{user?.email}</Text>
          {user?.skill_level && (
            <View style={styles.skillBadge}>
              <Text style={[typography.caption, { color: colors.courtGreen }]}>
                {user.skill_level.toFixed(1)} DUPR
              </Text>
            </View>
          )}
        </View>

        {/* Subscription */}
        <Text style={[typography.label, styles.sectionLabel]}>SUBSCRIPTION</Text>
        <Card>
          {sub?.is_pro ? (
            <>
              <View style={styles.proBanner}>
                <Text style={[typography.h3, { color: colors.proGold }]}>⚡ Pro Plan</Text>
                <Text style={[typography.caption, { color: colors.proGold + "99" }]}>
                  Unlimited analyses
                </Text>
              </View>
              {sub.current_period_end && (
                <SettingsRow
                  label="Renews"
                  value={formatDate(sub.current_period_end)}
                />
              )}
              <SettingsRow label="Manage billing" onPress={handleManageSub} />
            </>
          ) : (
            <>
              <SettingsRow label="Plan" value="Free (3/month)" />
              <Button
                label="Upgrade to Pro — $9.99/month"
                variant="pro"
                fullWidth
                style={{ marginTop: spacing.md }}
                onPress={() => router.push("/subscription/paywall")}
              />
            </>
          )}
        </Card>

        {/* Account settings */}
        <Text style={[typography.label, styles.sectionLabel]}>ACCOUNT</Text>
        <Card>
          <SettingsRow label="Email" value={user?.email} />
          <SettingsRow label="Skill level" value={user?.skill_level ? `${user.skill_level} DUPR` : "Not set"} />
        </Card>

        {/* About */}
        <Text style={[typography.label, styles.sectionLabel]}>ABOUT</Text>
        <Card>
          <SettingsRow label="Version" value="1.0.0" />
          <SettingsRow
            label="Privacy Policy"
            onPress={() => Linking.openURL("https://dropshot.app/privacy")}
          />
          <SettingsRow
            label="Terms of Service"
            onPress={() => Linking.openURL("https://dropshot.app/terms")}
          />
        </Card>

        <Button
          label="Sign Out"
          variant="ghost"
          fullWidth
          onPress={handleLogout}
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, gap: spacing.lg },
  avatar: { alignItems: "center", paddingVertical: spacing.lg },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.courtGreen + "33",
    borderWidth: 2,
    borderColor: colors.courtGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  skillBadge: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 100,
    backgroundColor: colors.courtGreen + "22",
    borderWidth: 1,
    borderColor: colors.courtGreen + "44",
  },
  proBanner: {
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
  sectionLabel: { color: colors.textMuted, fontSize: 11, letterSpacing: 1.5 },
  settingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});

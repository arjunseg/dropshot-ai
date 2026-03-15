import { router } from "expo-router";
import { StyleSheet, Text, View, Dimensions, ImageBackground } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

const { height } = Dimensions.get("window");

export default function Welcome() {
  return (
    <SafeAreaView style={styles.container}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.badge}>
          <Text style={[typography.caption, { color: colors.courtGreen, letterSpacing: 1.5 }]}>
            AI PICKLEBALL COACH
          </Text>
        </View>

        <Text style={[typography.displayLG, styles.headline]}>
          Fix your{"\n"}third shot{"\n"}
          <Text style={{ color: colors.courtGreen }}>today.</Text>
        </Text>

        <Text style={[typography.bodyLG, styles.subheadline]}>
          Film your shot. Get instant, specific coaching from AI trained on pro mechanics.
          Better than waiting for a clinic.
        </Text>
      </View>

      {/* Social proof */}
      <View style={styles.stats}>
        {[
          { value: "48M+", label: "Pickleball players" },
          { value: "<60s", label: "Analysis time" },
          { value: "$9.99", label: "vs $80/hr lesson" },
        ].map((stat) => (
          <View key={stat.label} style={styles.stat}>
            <Text style={[typography.statLG, { color: colors.textPrimary }]}>{stat.value}</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* CTAs */}
      <View style={styles.ctas}>
        <Button
          label="Get Started Free"
          size="lg"
          fullWidth
          onPress={() => router.push("/(auth)/register")}
        />
        <Button
          label="Sign In"
          variant="ghost"
          size="lg"
          fullWidth
          style={{ marginTop: spacing.sm }}
          onPress={() => router.push("/(auth)/login")}
        />
        <Text style={[typography.caption, styles.disclaimer]}>
          3 free analyses/month. No credit card required.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
    justifyContent: "space-between",
    paddingBottom: spacing.xl,
  },
  hero: {
    paddingTop: height * 0.08,
  },
  badge: {
    backgroundColor: colors.courtGreen + "20",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 100,
    alignSelf: "flex-start",
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.courtGreen + "40",
  },
  headline: {
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  subheadline: {
    color: colors.textSecondary,
    lineHeight: 26,
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: spacing.xl,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  stat: {
    alignItems: "center",
    gap: 4,
  },
  ctas: {},
  disclaimer: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.md,
  },
});

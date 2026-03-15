import { router } from "expo-router";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createCheckoutSession } from "@/api/subscription";
import { colors } from "@/theme/colors";
import { radius, spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

const PRO_PRICE_ID = process.env.EXPO_PUBLIC_STRIPE_PRO_PRICE_ID ?? "";

const PRO_FEATURES = [
  { icon: "∞", label: "Unlimited analyses", sub: "No monthly limits, ever" },
  { icon: "🏓", label: "All shot types", sub: "Dink, serve, volley, return, rally" },
  { icon: "📐", label: "Full mechanics breakdown", sub: "Every joint angle, every phase" },
  { icon: "📈", label: "Progress tracking", sub: "See your improvement over time" },
  { icon: "🔗", label: "Share & export", sub: "Send analysis to your coach" },
  { icon: "🧠", label: "Drill library", sub: "Targeted drills for every fix" },
];

export default function Paywall() {
  async function handleCheckout(annual: boolean) {
    try {
      const { checkout_url } = await createCheckoutSession(
        annual ? (process.env.EXPO_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID ?? PRO_PRICE_ID) : PRO_PRICE_ID,
        "dropshot://subscription/success",
        "dropshot://subscription/cancel",
      );
      await Linking.openURL(checkout_url);
    } catch {
      // handle error
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={[typography.displayLG, { color: colors.textPrimary }]}>
            Upgrade to{" "}
            <Text style={{ color: colors.courtGreen }}>Pro</Text>
          </Text>
          <Text style={[typography.bodyLG, { color: colors.textSecondary, marginTop: spacing.sm }]}>
            One private lesson costs $60–100. Pro costs less per month.
          </Text>
        </View>

        {/* Feature list */}
        <Card elevated>
          {PRO_FEATURES.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <Text style={{ fontSize: 24, width: 36 }}>{f.icon}</Text>
              <View>
                <Text style={[typography.label, { color: colors.textPrimary }]}>{f.label}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>{f.sub}</Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Pricing options */}
        <View style={styles.pricingRow}>
          {/* Monthly */}
          <Card style={styles.pricingCard}>
            <Text style={[typography.label, { color: colors.textSecondary }]}>MONTHLY</Text>
            <Text style={[typography.displayLG, { color: colors.textPrimary, fontSize: 36 }]}>
              $9.99
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>per month</Text>
            <Button
              label="Start Monthly"
              variant="secondary"
              fullWidth
              style={{ marginTop: spacing.md }}
              onPress={() => handleCheckout(false)}
            />
          </Card>

          {/* Annual */}
          <Card style={[styles.pricingCard, styles.pricingCardBest]} elevated>
            <View style={styles.bestBadge}>
              <Text style={[typography.caption, { color: colors.bg }]}>BEST VALUE</Text>
            </View>
            <Text style={[typography.label, { color: colors.courtGreen }]}>ANNUAL</Text>
            <Text style={[typography.displayLG, { color: colors.textPrimary, fontSize: 36 }]}>
              $79.99
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              $6.67/month — 2 months free
            </Text>
            <Button
              label="Start Annual"
              fullWidth
              style={{ marginTop: spacing.md }}
              onPress={() => handleCheckout(true)}
            />
          </Card>
        </View>

        <Button label="Maybe later" variant="ghost" fullWidth onPress={() => router.back()} />

        <Text style={[typography.caption, styles.legal]}>
          Cancel anytime. Billed via the App Store. By subscribing you agree to our Terms of Service.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, gap: spacing.lg },
  hero: { alignItems: "center", textAlign: "center" },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pricingRow: { flexDirection: "row", gap: spacing.md },
  pricingCard: { flex: 1, alignItems: "center" },
  pricingCardBest: { borderColor: colors.courtGreen },
  bestBadge: {
    backgroundColor: colors.courtGreen,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  legal: { color: colors.textMuted, textAlign: "center" },
});

import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { colors } from "@/theme/colors";
import { radius, spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { validateEmail, validatePassword } from "@/utils/validation";

const SKILL_LEVELS = [
  { label: "2.0–2.5", value: 2.25, desc: "Beginner" },
  { label: "3.0–3.5", value: 3.25, desc: "Intermediate" },
  { label: "4.0–4.5", value: 4.25, desc: "Advanced" },
  { label: "5.0+", value: 5.0, desc: "Tournament" },
];

export default function Register() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [skillLevel, setSkillLevel] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!name || !email || !password) {
      Alert.alert("Missing fields", "Please fill in all required fields.");
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      Alert.alert("Weak password", pwCheck.message);
      return;
    }

    setLoading(true);
    try {
      await register(email.trim().toLowerCase(), password, name.trim(), skillLevel ?? undefined);
      router.replace("/(tabs)/home");
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      const message = typeof detail === "string" ? detail : "Registration failed. Please try again.";
      Alert.alert("Registration failed", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[typography.h1, styles.title]}>Create account</Text>
          <Text style={[typography.body, styles.subtitle]}>
            Start with 3 free analyses per month.
          </Text>

          <View style={styles.fields}>
            <TextInput
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Password (8+ characters)"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <Text style={[typography.label, styles.skillLabel]}>Your skill level (optional)</Text>
          <View style={styles.skillGrid}>
            {SKILL_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.value}
                style={[
                  styles.skillChip,
                  skillLevel === level.value && styles.skillChipSelected,
                ]}
                onPress={() => setSkillLevel(skillLevel === level.value ? null : level.value)}
              >
                <Text
                  style={[
                    typography.label,
                    {
                      color:
                        skillLevel === level.value ? colors.bg : colors.textPrimary,
                      fontSize: 13,
                    },
                  ]}
                >
                  {level.label}
                </Text>
                <Text
                  style={[
                    typography.caption,
                    {
                      color:
                        skillLevel === level.value ? colors.bg + "CC" : colors.textSecondary,
                    },
                  ]}
                >
                  {level.desc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Button
            label="Create Free Account"
            loading={loading}
            fullWidth
            size="lg"
            onPress={handleRegister}
            style={{ marginTop: spacing.lg }}
          />

          <View style={styles.footer}>
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              Already have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
              <Text style={[typography.body, { color: colors.courtGreen }]}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.lg,
  },
  title: { color: colors.textPrimary },
  subtitle: { color: colors.textSecondary, marginTop: -spacing.sm },
  fields: { gap: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: colors.textPrimary,
    fontSize: 16,
  },
  skillLabel: {
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontSize: 12,
  },
  skillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: -spacing.sm,
  },
  skillChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    minWidth: "45%",
    flex: 1,
  },
  skillChipSelected: {
    backgroundColor: colors.courtGreen,
    borderColor: colors.courtGreen,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
  },
});

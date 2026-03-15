import React from "react";
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";
import { colors } from "@/theme/colors";
import { radius, spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "pro";

interface Props extends PressableProps {
  label: string;
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
}

const variantStyles: Record<Variant, { container: ViewStyle; text: { color: string } }> = {
  primary: {
    container: { backgroundColor: colors.courtGreen },
    text: { color: "#000" },
  },
  secondary: {
    container: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
    text: { color: colors.textPrimary },
  },
  ghost: {
    container: { backgroundColor: "transparent" },
    text: { color: colors.courtGreen },
  },
  danger: {
    container: { backgroundColor: colors.error },
    text: { color: "#fff" },
  },
  pro: {
    container: { backgroundColor: colors.proPurple },
    text: { color: "#fff" },
  },
};

const sizeStyles = {
  sm: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.sm },
  md: { paddingVertical: 14, paddingHorizontal: spacing.lg, borderRadius: radius.md },
  lg: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: radius.md },
};

export function Button({
  label,
  variant = "primary",
  loading = false,
  fullWidth = false,
  size = "md",
  style,
  disabled,
  ...rest
}: Props) {
  const vs = variantStyles[variant];
  const ss = sizeStyles[size];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        vs.container,
        ss,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && styles.pressed,
        style as ViewStyle,
      ]}
      disabled={isDisabled}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={vs.text.color} size="small" />
      ) : (
        <Text style={[typography.label, { fontSize: size === "lg" ? 16 : 14 }, vs.text]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  fullWidth: { width: "100%" },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.82 },
});

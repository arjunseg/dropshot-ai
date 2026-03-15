import React from "react";
import { StyleSheet, View, ViewProps, ViewStyle } from "react-native";
import { colors } from "@/theme/colors";
import { radius, spacing } from "@/theme/spacing";

interface Props extends ViewProps {
  elevated?: boolean;
  padding?: keyof typeof spacing;
}

export function Card({ elevated = false, padding = "md", style, children, ...rest }: Props) {
  return (
    <View
      style={[
        styles.base,
        elevated ? styles.elevated : styles.surface,
        { padding: spacing[padding] },
        style as ViewStyle,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  surface: {
    backgroundColor: colors.surface,
  },
  elevated: {
    backgroundColor: colors.surfaceElevated,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});

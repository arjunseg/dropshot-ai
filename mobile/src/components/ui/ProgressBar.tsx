import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle } from "react-native";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/spacing";

interface Props {
  progress: number; // 0–1
  color?: string;
  height?: number;
  style?: ViewStyle;
  animated?: boolean;
}

export function ProgressBar({
  progress,
  color = colors.courtGreen,
  height = 6,
  style,
  animated = true,
}: Props) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.spring(anim, {
        toValue: Math.max(0, Math.min(1, progress)),
        useNativeDriver: false,
        tension: 40,
        friction: 8,
      }).start();
    } else {
      anim.setValue(progress);
    }
  }, [progress, animated, anim]);

  const widthPct = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={[styles.track, { height }, style]}>
      <Animated.View style={[styles.fill, { backgroundColor: color, width: widthPct, height }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  fill: {
    borderRadius: radius.full,
  },
});

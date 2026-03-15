import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { getScoreColor } from "@/theme/colors";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

interface Props {
  score: number;
  size?: number;
  showLabel?: boolean;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function ScoreGauge({ score, size = 140, showLabel = true }: Props) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const scoreColor = getScoreColor(score);

  const animatedScore = useRef(new Animated.Value(0)).current;
  const animatedDash = useRef(new Animated.Value(circumference)).current;

  useEffect(() => {
    const targetDash = circumference - (score / 100) * circumference;
    Animated.parallel([
      Animated.timing(animatedScore, {
        toValue: score,
        duration: 1000,
        useNativeDriver: false,
      }),
      Animated.spring(animatedDash, {
        toValue: targetDash,
        tension: 30,
        friction: 8,
        useNativeDriver: false,
      }),
    ]).start();
  }, [score]);

  const scoreText = animatedScore.interpolate({
    inputRange: [0, 100],
    outputRange: ["0", "100"],
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {/* Track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.surface}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Filled arc */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={scoreColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={animatedDash}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <View style={styles.center}>
        <Animated.Text style={[typography.displayLG, { color: scoreColor, fontSize: size * 0.32 }]}>
          {scoreText.interpolate({ inputRange: [0, 100], outputRange: ["0", score.toString()] })}
        </Animated.Text>
        {showLabel && (
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
            /100
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
});

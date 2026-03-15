import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";

interface Landmark {
  x: number; // normalized 0–1
  y: number;
  visibility: number;
}

interface Props {
  landmarks: Landmark[];
  width: number;
  height: number;
  color?: string;
  visible?: boolean;
}

// Key skeleton connections to draw
const CONNECTIONS: [number, number][] = [
  [11, 12], // shoulders
  [11, 13], [13, 15], // left arm
  [12, 14], [14, 16], // right arm
  [11, 23], [12, 24], // torso
  [23, 24], // hips
  [23, 25], [25, 27], // left leg
  [24, 26], [26, 28], // right leg
];

const JOINT_INDICES = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

export function PoseOverlay({ landmarks, width, height, color = "#00C853", visible = true }: Props) {
  if (!visible || !landmarks || landmarks.length < 29) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
      <Svg width={width} height={height}>
        {/* Draw skeleton connections */}
        {CONNECTIONS.map(([a, b]) => {
          const lmA = landmarks[a];
          const lmB = landmarks[b];
          if (!lmA || !lmB || lmA.visibility < 0.4 || lmB.visibility < 0.4) return null;
          return (
            <Line
              key={`${a}-${b}`}
              x1={lmA.x * width}
              y1={lmA.y * height}
              x2={lmB.x * width}
              y2={lmB.y * height}
              stroke={color}
              strokeWidth={2}
              strokeOpacity={0.85}
            />
          );
        })}

        {/* Draw joints */}
        {JOINT_INDICES.map((idx) => {
          const lm = landmarks[idx];
          if (!lm || lm.visibility < 0.4) return null;
          return (
            <Circle
              key={idx}
              cx={lm.x * width}
              cy={lm.y * height}
              r={5}
              fill="#fff"
              fillOpacity={0.9}
              stroke={color}
              strokeWidth={2}
            />
          );
        })}
      </Svg>
    </View>
  );
}

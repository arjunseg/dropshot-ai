import { TextStyle } from "react-native";

export const typography: Record<string, TextStyle> = {
  // Display — used for large scores and hero numbers
  displayXL: { fontSize: 72, fontWeight: "800", letterSpacing: -2 },
  displayLG: { fontSize: 48, fontWeight: "800", letterSpacing: -1 },

  // Headings
  h1: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: "700", letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: "600" },

  // Body
  bodyLG: { fontSize: 17, fontWeight: "400", lineHeight: 26 },
  body: { fontSize: 15, fontWeight: "400", lineHeight: 22 },
  bodySM: { fontSize: 13, fontWeight: "400", lineHeight: 19 },

  // Labels / captions
  label: { fontSize: 13, fontWeight: "600", letterSpacing: 0.3 },
  caption: { fontSize: 11, fontWeight: "500", letterSpacing: 0.2 },

  // Numbers / stats
  statLG: { fontSize: 32, fontWeight: "700", fontVariant: ["tabular-nums"] },
  stat: { fontSize: 20, fontWeight: "600", fontVariant: ["tabular-nums"] },
  statSM: { fontSize: 15, fontWeight: "600", fontVariant: ["tabular-nums"] },
};

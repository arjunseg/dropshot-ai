export const colors = {
  // Brand
  courtGreen: "#00C853",      // Primary CTA, active states
  paddleOrange: "#FF6D00",    // Accents, warnings
  kitchenBlue: "#1565C0",     // Secondary accent

  // Background
  bg: "#0A0E1A",              // Dark navy background
  surface: "#141927",         // Card surfaces
  surfaceElevated: "#1E2438", // Elevated cards, modals

  // Text
  textPrimary: "#F0F4FF",
  textSecondary: "#8B95B0",
  textMuted: "#4A5270",

  // Score colors
  scoreExcellent: "#00C853",  // 85–100
  scoreGood: "#64DD17",       // 70–84
  scoreFair: "#FFD600",       // 55–69
  scorePoor: "#FF6D00",       // 40–54
  scoreBad: "#F44336",        // 0–39

  // Semantic
  success: "#00C853",
  warning: "#FFD600",
  error: "#F44336",
  info: "#40C4FF",

  // Pro tier
  proGold: "#FFD700",
  proPurple: "#7C4DFF",

  // Borders
  border: "#252D42",
  borderLight: "#2E3650",
};

export function getScoreColor(score: number): string {
  if (score >= 85) return colors.scoreExcellent;
  if (score >= 70) return colors.scoreGood;
  if (score >= 55) return colors.scoreFair;
  if (score >= 40) return colors.scorePoor;
  return colors.scoreBad;
}

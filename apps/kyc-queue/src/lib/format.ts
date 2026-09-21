import type { SeverityLevel } from "@repo/ui";

export function riskLevel(score: number): SeverityLevel {
  if (score > 75) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export const RISK_LABELS = {
  high: "High",
  medium: "Medium",
  low: "Low",
} as const;

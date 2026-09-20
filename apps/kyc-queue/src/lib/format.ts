import type { StatusTone } from "@repo/ui";
import type { AppStatus } from "@repo/rbac";

export const STATUS_TONES: Record<AppStatus, StatusTone> = {
  PENDING: "yellow",
  FLAGGED: "purple",
  APPROVED: "green",
  REJECTED: "red",
};

/** Tone for any stored state string; unknown values fall back to slate. */
export function statusTone(status: string): StatusTone {
  return STATUS_TONES[status as AppStatus] ?? "slate";
}

export function riskLevel(score: number): "high" | "medium" | "low" {
  if (score > 75) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export const RISK_TONES = {
  high: "red",
  medium: "yellow",
  low: "green",
} as const satisfies Record<string, StatusTone>;

export const RISK_LABELS = {
  high: "High",
  medium: "Medium",
  low: "Low",
} as const;

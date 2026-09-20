import type { AppStatus } from "./rbac";

export const STATUS_STYLES: Record<AppStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 ring-yellow-300",
  FLAGGED: "bg-purple-100 text-purple-800 ring-purple-300",
  APPROVED: "bg-green-100 text-green-800 ring-green-300",
  REJECTED: "bg-red-100 text-red-800 ring-red-300",
};

export function riskLevel(score: number): "high" | "medium" | "low" {
  if (score > 75) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export const RISK_STYLES = {
  high: "bg-red-100 text-red-800 ring-red-300",
  medium: "bg-yellow-100 text-yellow-800 ring-yellow-300",
  low: "bg-green-100 text-green-800 ring-green-300",
} as const;

export const RISK_LABELS = {
  high: "High",
  medium: "Medium",
  low: "Low",
} as const;

import type { ReactNode } from "react";
import type { AppStatus } from "@repo/rbac";
import type { FlagEnvironment, FlagState } from "@repo/rbac/flags";

/**
 * Color tokens — defined once here and reused by every internal tool, per the
 * Internal Tooling Architectural Standards.
 *
 * Two independent axes are kept visually separate:
 * - Categorical state (StatusBadge): a small colored dot + text label on a
 *   neutral low-chroma pill. The dot identifies the value; the pill never
 *   fills with the hue, so state cannot be mistaken for severity.
 * - Severity/magnitude (SeverityBadge, SEVERITY_STYLES): the only place the
 *   green → amber → red traffic-light ramp appears.
 */

/** Categorical hues. Each maps to a dot color only — never a filled pill. */
export type StatusTone =
  | "amber"
  | "purple"
  | "green"
  | "red"
  | "blue"
  | "slate"
  | "gray";

/**
 * Dot fills. Emerald/rose (rather than pure green/red) keep green vs red
 * distinguishable for common color-vision deficiencies; every badge also
 * carries a text label so hue is never the only signal.
 */
export const STATUS_DOT_STYLES: Record<StatusTone, string> = {
  amber: "bg-amber-500",
  purple: "bg-purple-500",
  green: "bg-emerald-600",
  red: "bg-rose-600",
  blue: "bg-blue-500",
  slate: "bg-slate-500",
  gray: "bg-gray-400",
};

/** Neutral low-chroma pill shared by every status badge. */
export const STATUS_BADGE_STYLE =
  "bg-slate-100 text-slate-700 ring-slate-200";

/** kyc-queue application statuses. */
export const APP_STATUS_TONES: Record<AppStatus, StatusTone> = {
  PENDING: "amber",
  FLAGGED: "purple",
  APPROVED: "green",
  REJECTED: "red",
};

/** feature-flag-admin flag states. */
export const FLAG_STATE_TONES: Record<FlagState, StatusTone> = {
  enabled: "green",
  disabled: "gray",
  archived: "slate",
};

/** feature-flag-admin environments (dot encodes blast radius). */
export const FLAG_ENV_TONES: Record<FlagEnvironment, StatusTone> = {
  prod: "red",
  staging: "amber",
  dev: "green",
};

/** Tone for a kyc-queue status string; unknown values fall back to slate. */
export function appStatusTone(status: string): StatusTone {
  return APP_STATUS_TONES[status as AppStatus] ?? "slate";
}

export function flagStateTone(state: string): StatusTone {
  return FLAG_STATE_TONES[state as FlagState] ?? "slate";
}

export function flagEnvTone(env: string): StatusTone {
  return FLAG_ENV_TONES[env as FlagEnvironment] ?? "slate";
}

/**
 * Tone for flag audit-log snapshots ("enabled@50%", "proposed:disabled@0%").
 * Proposals render purple.
 */
export function flagAuditStateTone(snapshot: string): StatusTone {
  if (snapshot.startsWith("proposed:")) return "purple";
  return flagStateTone(snapshot.split("@")[0]);
}

interface Props {
  tone: StatusTone;
  children: ReactNode;
  className?: string;
}

export function StatusBadge({ tone, children, className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_BADGE_STYLE} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_STYLES[tone]}`}
      />
      {children}
    </span>
  );
}

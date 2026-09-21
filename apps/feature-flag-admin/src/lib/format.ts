import type { StatusTone } from "@repo/ui";
import type { FlagEnvironment, FlagState } from "@repo/rbac/flags";

/** state badge: enabled=green, disabled=gray, archived=slate */
export const FLAG_STATE_TONES: Record<FlagState, StatusTone> = {
  enabled: "green",
  disabled: "gray",
  archived: "slate",
};

/** environment badge: prod=red, staging=amber, dev=green (blast radius) */
export const FLAG_ENV_TONES: Record<FlagEnvironment, StatusTone> = {
  prod: "red",
  staging: "yellow",
  dev: "green",
};

export function flagStateTone(state: string): StatusTone {
  return FLAG_STATE_TONES[state as FlagState] ?? "slate";
}

export function flagEnvTone(env: string): StatusTone {
  return FLAG_ENV_TONES[env as FlagEnvironment] ?? "slate";
}

/**
 * Tone for audit-log state snapshots ("enabled@50%", "proposed:disabled@0%").
 * Proposals render purple.
 */
export function auditStateTone(snapshot: string): StatusTone {
  if (snapshot.startsWith("proposed:")) return "purple";
  return flagStateTone(snapshot.split("@")[0]);
}

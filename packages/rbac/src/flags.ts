import { Role } from "./index";

/**
 * Feature-flag RBAC policy (feature-flag-admin).
 *
 * Environment is the risk boundary: prod mutations are Checker-only and
 * always require a reason; dev/staging mutations are low-risk and open to
 * both roles. archive is admin-only everywhere. Standard users on
 * prod flags are read-only but may file a proposal (Maker) for an admin to
 * apply.
 */
export type FlagEnvironment = "dev" | "staging" | "prod";
export type FlagState = "enabled" | "disabled" | "archived";
export type FlagAction =
  | "toggle"
  | "set_rollout"
  | "archive"
  | "propose";

export const FLAG_ACTIONS: FlagAction[] = [
  "toggle",
  "set_rollout",
  "archive",
];

/** prod is the high-risk boundary (Checker territory). */
export function isHighRiskEnv(env: FlagEnvironment): boolean {
  return env === "prod";
}

export function canPerformFlag(
  role: Role,
  env: FlagEnvironment,
  state: FlagState,
  action: FlagAction
): boolean {
  switch (action) {
    case "toggle":
      // archived is terminal — nothing to toggle
      if (state === "archived") return false;
      return isHighRiskEnv(env) ? role === Role.ADMIN : true;
    case "set_rollout":
      if (state === "archived") return false;
      return isHighRiskEnv(env) ? role === Role.ADMIN : true;
    case "archive":
      return role === Role.ADMIN && state !== "archived";
    case "propose":
      // Makers propose only where they cannot apply: prod, non-archived.
      return (
        role === Role.STANDARD && isHighRiskEnv(env) && state !== "archived"
      );
  }
}

/**
 * Every applied prod mutation requires a non-empty reason, as does
 * archive in any environment. Low-risk dev/staging changes are
 * audited but need no justification; proposals carry an optional note.
 */
export function flagReasonRequired(
  env: FlagEnvironment,
  action: FlagAction
): boolean {
  if (action === "archive") return true;
  if (action === "toggle" || action === "set_rollout") {
    return isHighRiskEnv(env);
  }
  return false;
}

export function allowedFlagActions(
  role: Role,
  env: FlagEnvironment,
  state: FlagState
): FlagAction[] {
  return [...FLAG_ACTIONS, "propose" as FlagAction].filter((a) =>
    canPerformFlag(role, env, state, a)
  );
}

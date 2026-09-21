import type { FeatureFlag, PrismaClient } from "@repo/db";
import { withAudit, normalizeReason } from "@repo/audit";
import type { Role } from "@repo/rbac";
import {
  canPerformFlag,
  flagReasonRequired,
  isHighRiskEnv,
  type FlagAction,
  type FlagEnvironment,
  type FlagState,
} from "@repo/rbac/flags";

export class FlagError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "FlagError";
  }
}

const RESOURCE_TYPE = "FeatureFlag";
const MUTATIONS: FlagAction[] = ["toggle", "set_rollout", "archive"];

/** Compact "state@rollout%" snapshot stored in AuditLog state columns. */
export function flagSnapshot(
  flag: Pick<FeatureFlag, "state" | "rolloutPercentage">
): string {
  return `${flag.state}@${flag.rolloutPercentage}%`;
}

export interface FlagMutationInput {
  flagId: string;
  action: FlagAction;
  rolloutPercentage?: number;
  reason?: string;
  actorRole: Role;
  actorEmail: string;
}

export interface FlagProposalInput {
  flagId: string;
  action: "toggle" | "set_rollout";
  rolloutPercentage?: number;
  note?: string;
  actorRole: Role;
  actorEmail: string;
}

function assertRollout(v: number | undefined): number {
  if (v === undefined || !Number.isInteger(v) || v < 0 || v > 100) {
    throw new FlagError("rolloutPercentage must be an integer between 0 and 100");
  }
  return v;
}

async function loadFlag(db: PrismaClient, flagId: string) {
  const flag = await db.featureFlag.findUnique({ where: { id: flagId } });
  if (!flag) throw new FlagError("Flag not found", 404);
  return flag;
}

/**
 * Applies a flag mutation: validates the RBAC matrix + reason requirements,
 * then writes the state change and its AuditLog row atomically via withAudit().
 */
export async function applyFlagMutation(
  db: PrismaClient,
  input: FlagMutationInput
) {
  const { flagId, action, actorRole, actorEmail } = input;
  const reason = normalizeReason(input.reason);

  if (!MUTATIONS.includes(action)) {
    throw new FlagError(`Unknown action: ${action}`);
  }

  const flag = await loadFlag(db, flagId);
  const env = flag.environment as FlagEnvironment;
  const state = flag.state as FlagState;
  const previousState = flagSnapshot(flag);

  if (!canPerformFlag(actorRole, env, state, action)) {
    throw new FlagError(
      `Role '${actorRole}' cannot perform '${action}' on a ${env} flag`,
      403
    );
  }
  if (flagReasonRequired(env, action) && !reason) {
    throw new FlagError(
      isHighRiskEnv(env)
        ? "A reason is required for every prod mutation"
        : `A reason is required to ${action} a flag`,
      400
    );
  }

  switch (action) {
    case "toggle": {
      const newState: FlagState = state === "enabled" ? "disabled" : "enabled";
      return withAudit(
        db,
        {
          resourceType: RESOURCE_TYPE,
          resourceId: flagId,
          actorEmail,
          actorRole,
          previousState,
          newState: `${newState}@${flag.rolloutPercentage}%`,
          reason,
        },
        (tx) =>
          tx.featureFlag.update({
            where: { id: flagId },
            data: { state: newState },
          })
      );
    }
    case "set_rollout": {
      const rollout = assertRollout(input.rolloutPercentage);
      return withAudit(
        db,
        {
          resourceType: RESOURCE_TYPE,
          resourceId: flagId,
          actorEmail,
          actorRole,
          previousState,
          newState: `${state}@${rollout}%`,
          reason,
        },
        (tx) =>
          tx.featureFlag.update({
            where: { id: flagId },
            data: { rolloutPercentage: rollout },
          })
      );
    }
    case "archive":
      return withAudit(
        db,
        {
          resourceType: RESOURCE_TYPE,
          resourceId: flagId,
          actorEmail,
          actorRole,
          previousState,
          newState: `archived@${flag.rolloutPercentage}%`,
          reason,
        },
        (tx) =>
          tx.featureFlag.update({
            where: { id: flagId },
            data: { state: "archived" },
          })
      );
  }
}

/**
 * Maker path for prod flags: a standard user records a proposed change for an
 * admin to review and apply. Writes an AuditLog row only — the flag itself is
 * never mutated, so no transaction is needed.
 */
export async function proposeFlagChange(
  db: PrismaClient,
  input: FlagProposalInput
) {
  const { flagId, action, actorRole, actorEmail } = input;
  const note = normalizeReason(input.note);

  if (action !== "toggle" && action !== "set_rollout") {
    throw new FlagError(`Cannot propose '${action}'`);
  }

  const flag = await loadFlag(db, flagId);
  const env = flag.environment as FlagEnvironment;
  const state = flag.state as FlagState;

  if (!canPerformFlag(actorRole, env, state, "propose")) {
    throw new FlagError(
      `Role '${actorRole}' cannot propose changes on a ${env} flag`,
      403
    );
  }

  let proposed: string;
  if (action === "toggle") {
    const target: FlagState = state === "enabled" ? "disabled" : "enabled";
    proposed = `${target}@${flag.rolloutPercentage}%`;
  } else {
    proposed = `${state}@${assertRollout(input.rolloutPercentage)}%`;
  }

  await db.auditLog.create({
    data: {
      resourceType: RESOURCE_TYPE,
      resourceId: flagId,
      actorEmail,
      actorRole,
      previousState: flagSnapshot(flag),
      newState: `proposed:${proposed}`,
      reason: note,
    },
  });

  return flag;
}

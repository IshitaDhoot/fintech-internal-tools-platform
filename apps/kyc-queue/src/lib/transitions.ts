import type { PrismaClient } from "@repo/db";
import { withAudit, normalizeReason } from "@repo/audit";
import {
  ACTION_TO_STATUS,
  canPerform,
  reasonRequired,
  type Action,
  type AppStatus,
  type Role,
} from "@repo/rbac";

export class TransitionError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "TransitionError";
  }
}

export interface TransitionInput {
  applicationId: string;
  action: Action;
  reason?: string;
  actorRole: Role;
  actorEmail: string;
}

/**
 * Validates the RBAC matrix + reason requirements, then applies the status
 * change and appends an immutable AuditLog row atomically via withAudit().
 */
export async function applyTransition(db: PrismaClient, input: TransitionInput) {
  const { applicationId, action, actorRole, actorEmail } = input;
  const reason = normalizeReason(input.reason);

  if (!Object.prototype.hasOwnProperty.call(ACTION_TO_STATUS, action)) {
    throw new TransitionError(`Unknown action: ${action}`);
  }

  const app = await db.userApplication.findUnique({ where: { id: applicationId } });
  if (!app) throw new TransitionError("Application not found", 404);

  const status = app.status as AppStatus;
  const newStatus = ACTION_TO_STATUS[action];

  if (!canPerform(actorRole, status, action)) {
    throw new TransitionError(
      `Role '${actorRole}' cannot perform '${action}' on a ${status} application`,
      403
    );
  }

  if (reasonRequired(actorRole, status, action) && !reason) {
    throw new TransitionError(
      `A reason is required to ${action} a ${status} application`,
      400
    );
  }

  return withAudit(
    db,
    {
      resourceType: "UserApplication",
      resourceId: applicationId,
      actorEmail,
      actorRole,
      previousState: status,
      newState: newStatus,
      reason,
    },
    (tx) =>
      tx.userApplication.update({
        where: { id: applicationId },
        data: { status: newStatus },
      })
  );
}

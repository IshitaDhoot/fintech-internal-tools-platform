import type { PrismaClient, Prisma } from "@prisma/client";
import {
  ACTION_TO_STATUS,
  canPerform,
  reasonRequired,
  type Action,
  type AppStatus,
  type Role,
} from "./rbac";

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

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Validates the RBAC matrix + reason requirements, then applies the status
 * change and appends an immutable AuditLog row in a single transaction.
 */
export async function applyTransition(db: PrismaClient, input: TransitionInput) {
  const { applicationId, action, actorRole, actorEmail } = input;
  const reason = input.reason?.trim() || undefined;

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

  return db.$transaction(async (tx: Db) => {
    const updated = await tx.userApplication.update({
      where: { id: applicationId },
      data: { status: newStatus },
    });
    await tx.auditLog.create({
      data: {
        resourceType: "UserApplication",
        resourceId: applicationId,
        actorEmail,
        actorRole,
        previousState: status,
        newState: newStatus,
        reason: reason ?? null,
      },
    });
    return updated;
  });
}

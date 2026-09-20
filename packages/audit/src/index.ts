import type { Prisma, PrismaClient } from "@repo/db";

/**
 * One auditable state mutation: the resource fields recorded on the AuditLog
 * row plus the mutation itself, executed atomically.
 */
export interface AuditEvent {
  resourceType: string;
  resourceId: string;
  actorEmail: string;
  actorRole: string;
  previousState: string;
  newState: string;
  reason?: string | null;
}

/**
 * Runs `mutate` and the AuditLog insert in a single Prisma $transaction.
 * If the audit insert fails, the state change rolls back — and vice versa.
 */
export async function withAudit<T>(
  db: PrismaClient,
  event: AuditEvent,
  mutate: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return db.$transaction(async (tx) => {
    const result = await mutate(tx);
    await tx.auditLog.create({
      data: {
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        actorEmail: event.actorEmail,
        actorRole: event.actorRole,
        previousState: event.previousState,
        newState: event.newState,
        reason: event.reason ?? null,
      },
    });
    return result;
  });
}

/** Trims a free-text justification; returns null when it is empty/whitespace. */
export function normalizeReason(reason: string | null | undefined): string | null {
  const trimmed = reason?.trim();
  return trimmed ? trimmed : null;
}

export class MissingReasonError extends Error {
  readonly statusCode = 400;

  constructor(message = "A reason is required for this action") {
    super(message);
    this.name = "MissingReasonError";
  }
}

/**
 * Server-side enforcement: high-risk mutations (reject, override, delete,
 * resolve) MUST carry a non-empty reason. Returns the normalized reason.
 */
export function requireReason(
  reason: string | null | undefined,
  message?: string
): string {
  const normalized = normalizeReason(reason);
  if (!normalized) throw new MissingReasonError(message);
  return normalized;
}

export type Role = "standard" | "admin";
export type AppStatus = "PENDING" | "FLAGGED" | "APPROVED" | "REJECTED";
export type Action = "approve" | "reject" | "flag";

export const ROLES: Record<
  Role,
  { label: string; email: string }
> = {
  standard: { label: "Standard User", email: "standard.user@fintech.internal" },
  admin: { label: "Admin User", email: "admin@fintech.internal" },
};

export const ACTION_TO_STATUS: Record<Action, AppStatus> = {
  approve: "APPROVED",
  reject: "REJECTED",
  flag: "FLAGGED",
};

export function isTerminal(status: AppStatus): boolean {
  return status === "APPROVED" || status === "REJECTED";
}

/**
 * RBAC matrix:
 * - PENDING:  standard -> approve/reject/flag; admin -> approve/reject (no flag)
 * - FLAGGED:  standard -> none (requires admin); admin -> approve/reject
 * - APPROVED/REJECTED (terminal): standard -> read-only;
 *   admin -> may override to the opposite terminal state only
 */
export function canPerform(role: Role, status: AppStatus, action: Action): boolean {
  if (status === "PENDING") {
    if (role === "standard") return true;
    return action === "approve" || action === "reject";
  }
  if (status === "FLAGGED") {
    return role === "admin" && (action === "approve" || action === "reject");
  }
  // terminal states: admin may flip to the opposite terminal state
  if (role !== "admin") return false;
  const target = ACTION_TO_STATUS[action];
  return isTerminal(target) && target !== status;
}

/**
 * Reason requirements:
 * - reject and flag always require a reason
 * - admin resolving a FLAGGED record always requires a note
 * - admin overriding a terminal state always requires a note
 * - standard user approving a PENDING record does not require a note
 */
export function reasonRequired(role: Role, status: AppStatus, action: Action): boolean {
  if (action === "reject" || action === "flag") return true;
  if (status === "FLAGGED") return true;
  if (isTerminal(status)) return true;
  return false;
}

export function allowedActions(role: Role, status: AppStatus): Action[] {
  return (["approve", "reject", "flag"] as Action[]).filter((a) =>
    canPerform(role, status, a)
  );
}

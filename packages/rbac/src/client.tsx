"use client";

import { useState, type ReactNode } from "react";
import { parseRole, Role, canPerform, type Action, type AppStatus } from "./index";

export const ROLE_COOKIE = "kyc-role";

function readRoleCookie(cookieName: string): Role {
  if (typeof document === "undefined") return Role.STANDARD;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${cookieName}=`));
  return parseRole(match?.split("=")[1]);
}

/**
 * Reads the current actor role from the shared role cookie. This is the single
 * read path for the dev role switcher; in production the role comes from the
 * SSO provider's claims and this hook is swapped at the provider boundary.
 */
export function useRole(cookieName: string = ROLE_COOKIE): Role {
  const [role] = useState<Role>(() => readRoleCookie(cookieName));
  return role;
}

interface CanProps {
  role: Role;
  /** Roles allowed to see the children. */
  allow: Role[];
  /** Optional permission check against a resource status/action pair. */
  status?: AppStatus;
  action?: Action;
  fallback?: ReactNode;
  children: ReactNode;
}

/** Role gate for UI affordances; the API still re-checks permissions itself. */
export function Can({ role, allow, status, action, fallback = null, children }: CanProps) {
  const roleOk = allow.includes(role);
  const actionOk =
    status !== undefined && action !== undefined
      ? canPerform(role, status, action)
      : true;
  return <>{roleOk && actionOk ? children : fallback}</>;
}

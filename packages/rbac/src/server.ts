import { cookies } from "next/headers";
import { parseRole, ROLES, type Role } from "./index";

export const ROLE_COOKIE = "kyc-role";

/** Server-side role resolution — the API re-checks this on every request. */
export function getRole(cookieName: string = ROLE_COOKIE): Role {
  return parseRole(cookies().get(cookieName)?.value);
}

export function getActorEmail(role: Role): string {
  return ROLES[role].email;
}

import { cookies } from "next/headers";
import type { Role } from "./rbac";
import { ROLES } from "./rbac";

export function getRole(): Role {
  const value = cookies().get("kyc-role")?.value;
  return value === "admin" ? "admin" : "standard";
}

export function getActorEmail(role: Role): string {
  return ROLES[role].email;
}

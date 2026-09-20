"use client";

import { useRouter } from "next/navigation";
import { UserCog } from "lucide-react";
import { ROLES, Role } from "@repo/rbac";
import { ROLE_COOKIE } from "@repo/rbac/client";

/**
 * Dev-only role switcher — a STAND-IN for auth. In production the role comes
 * from the SSO provider's claims; useRole()/getRole() are the single read path
 * so the provider stays swappable.
 */
export function RoleSwitcher({
  role,
  cookieName = ROLE_COOKIE,
}: {
  role: Role;
  cookieName?: string;
}) {
  const router = useRouter();

  function select(next: Role) {
    if (next === role) return;
    document.cookie = `${cookieName}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <UserCog className="h-4 w-4 text-slate-500" />
      <span className="text-xs text-slate-500">Acting as</span>
      <div className="flex overflow-hidden rounded-md border border-slate-300 text-sm">
        {(Object.keys(ROLES) as Role[]).map((r) => (
          <button
            key={r}
            onClick={() => select(r)}
            className={`px-3 py-1.5 ${
              r === role
                ? "bg-indigo-600 font-medium text-white"
                : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {ROLES[r].label}
          </button>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { ROLES, type Role } from "@/lib/rbac";
import { UserCog } from "lucide-react";

function setRoleCookie(role: Role) {
  document.cookie = `kyc-role=${role}; path=/; max-age=31536000; samesite=lax`;
}

export function RoleSwitcher({ role }: { role: Role }) {
  const router = useRouter();

  function select(next: Role) {
    if (next === role) return;
    setRoleCookie(next);
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

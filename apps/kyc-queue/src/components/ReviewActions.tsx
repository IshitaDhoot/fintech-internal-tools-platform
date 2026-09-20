"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, Flag } from "lucide-react";
import { reasonRequired, type Action, type AppStatus, type Role } from "@/lib/rbac";

const ACTION_META: Record<
  Action,
  { label: string; icon: typeof CheckCircle2; classes: string }
> = {
  approve: {
    label: "Approve",
    icon: CheckCircle2,
    classes: "bg-green-600 text-white hover:bg-green-700",
  },
  reject: {
    label: "Reject",
    icon: Ban,
    classes: "bg-red-600 text-white hover:bg-red-700",
  },
  flag: {
    label: "Flag for escalation",
    icon: Flag,
    classes: "bg-purple-600 text-white hover:bg-purple-700",
  },
};

const ALL_ACTIONS: Action[] = ["approve", "reject", "flag"];

interface Props {
  applicationId: string;
  status: AppStatus;
  role: Role;
  actions: Action[];
  onComplete?: () => void;
}

export function ReviewActions({ applicationId, status, role, actions, onComplete }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<Action | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const needsReason = pending ? reasonRequired(role, status, pending) : false;
  // Flagged records lock out standard users: show the buttons disabled
  // rather than hiding them, per the RBAC matrix.
  const lockedOut = status === "FLAGGED" && role === "standard";

  async function submit() {
    if (!pending) return;
    if (needsReason && !reason.trim()) {
      setError("A reason is required for this action.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/applications/${applicationId}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: pending, reason: reason.trim() || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? `Request failed (${res.status})`);
      return;
    }
    setPending(null);
    setReason("");
    router.refresh();
    onComplete?.();
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Review Actions
      </h2>

      {actions.length === 0 && !lockedOut ? (
        <p className="text-sm text-slate-500">
          No actions available for your role on this application.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {(lockedOut ? ALL_ACTIONS : actions).map((a) => {
            const meta = ACTION_META[a];
            const Icon = meta.icon;
            return (
              <button
                key={a}
                disabled={lockedOut}
                onClick={() => {
                  setPending(a);
                  setReason("");
                  setError(null);
                }}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${meta.classes} disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <Icon className="h-4 w-4" /> {meta.label}
              </button>
            );
          })}
        </div>
      )}
      {lockedOut && (
        <p className="mt-2 text-sm text-slate-500">
          This application is escalated and awaiting an admin decision. Actions
          are disabled for standard users.
        </p>
      )}

      {pending && (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-sm font-medium">
            Confirm {ACTION_META[pending].label}
            {needsReason && <span className="text-red-600"> — reason required</span>}
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder={
              needsReason
                ? "Required: explain the reason for this decision"
                : "Optional note"
            }
            className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          <div className="mt-2 flex gap-2">
            <button
              onClick={submit}
              disabled={busy}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {busy ? "Submitting…" : "Confirm"}
            </button>
            <button
              onClick={() => setPending(null)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

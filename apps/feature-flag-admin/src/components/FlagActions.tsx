"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Gauge,
  Lock,
  Power,
  Send,
} from "lucide-react";
import { Role } from "@repo/rbac";
import {
  flagReasonRequired,
  isHighRiskEnv,
  type FlagAction,
  type FlagEnvironment,
  type FlagState,
} from "@repo/rbac/flags";
import type { Role as RoleType } from "@repo/rbac";

interface Pending {
  action: FlagAction;
  propose?: boolean;
}

interface Props {
  flagId: string;
  environment: FlagEnvironment;
  state: FlagState;
  rolloutPercentage: number;
  role: RoleType;
  actions: FlagAction[];
  onComplete?: () => void;
}

const BTN =
  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium";

export function FlagActions({
  flagId,
  environment,
  state,
  rolloutPercentage,
  role,
  actions,
  onComplete,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<Pending | null>(null);
  const [rollout, setRollout] = useState(rolloutPercentage);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const prod = isHighRiskEnv(environment);
  const lockedOut = prod && role === Role.STANDARD && state !== "archived";
  const canPropose = actions.includes("propose");
  const needsReason = pending
    ? !pending.propose && flagReasonRequired(environment, pending.action)
    : false;
  const wantsRollout = pending?.action === "set_rollout";

  async function submit() {
    if (!pending) return;
    if (needsReason && !reason.trim()) {
      setError("A reason is required for this action.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(
      `/api/flags/${flagId}/${pending.propose ? "propose" : "mutate"}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: pending.action,
          rolloutPercentage: wantsRollout ? rollout : undefined,
          [pending.propose ? "note" : "reason"]: reason.trim() || undefined,
        }),
      }
    );
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

  function actionButton(
    action: FlagAction,
    label: string,
    Icon: typeof Power,
    classes: string,
    opts: { disabled?: boolean; propose?: boolean } = {}
  ) {
    return (
      <button
        key={`${opts.propose ? "propose-" : ""}${action}`}
        disabled={opts.disabled}
        onClick={() => {
          setPending({ action, propose: opts.propose });
          setRollout(rolloutPercentage);
          setReason("");
          setError(null);
        }}
        className={`${BTN} ${classes} disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <Icon className="h-4 w-4" /> {label}
      </button>
    );
  }

  const toggleLabel = state === "enabled" ? "Disable" : "Enable";
  const toggleClasses =
    state === "enabled"
      ? "bg-red-600 text-white hover:bg-red-700"
      : "bg-green-600 text-white hover:bg-green-700";

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Flag Actions
      </h2>

      {actions.length === 0 && !lockedOut ? (
        <p className="text-sm text-slate-500">
          No actions available for your role on this flag.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {/* Mutations */}
          {(lockedOut || actions.includes("toggle")) &&
            actionButton("toggle", toggleLabel, Power, toggleClasses, {
              disabled: lockedOut,
            })}
          {(lockedOut || actions.includes("set_rollout")) &&
            actionButton(
              "set_rollout",
              "Set rollout",
              Gauge,
              "bg-indigo-600 text-white hover:bg-indigo-700",
              { disabled: lockedOut }
            )}
          {actions.includes("archive") &&
            actionButton(
              "archive",
              "Archive",
              Archive,
              "bg-slate-600 text-white hover:bg-slate-700"
            )}
          {lockedOut && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-purple-600 px-2.5 py-1 text-xs font-semibold text-white">
              <Lock className="h-3.5 w-3.5" /> Requires Admin
            </span>
          )}
        </div>
      )}

      {lockedOut && canPropose && (
        <div className="mt-3 rounded-md border border-purple-200 bg-purple-50 p-3">
          <p className="mb-2 text-xs font-medium text-purple-800">
            Prod flags are read-only for standard users. Propose a change for an
            admin to review and apply:
          </p>
          <div className="flex flex-wrap gap-2">
            {actionButton(
              "toggle",
              `Propose ${toggleLabel.toLowerCase()}`,
              Send,
              "bg-purple-600 text-white hover:bg-purple-700",
              { propose: true }
            )}
            {actionButton(
              "set_rollout",
              "Propose rollout",
              Send,
              "bg-purple-600 text-white hover:bg-purple-700",
              { propose: true }
            )}
          </div>
        </div>
      )}

      {pending && (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-sm font-medium">
            {pending.propose ? "Propose" : "Confirm"}{" "}
            {pending.action === "toggle"
              ? toggleLabel.toLowerCase()
              : pending.action === "set_rollout"
                ? "rollout change"
                : pending.action}
            {needsReason && (
              <span className="text-red-600"> — reason required</span>
            )}
          </p>
          {wantsRollout && (
            <div className="mb-2 flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                value={rollout}
                onChange={(e) => setRollout(Number(e.target.value))}
                className="w-24 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              />
              <span className="text-sm text-slate-500">% rollout</span>
            </div>
          )}
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder={
              needsReason
                ? "Required: justify this production change"
                : pending.propose
                  ? "Optional: context for the reviewer"
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
              {busy ? "Submitting…" : pending.propose ? "Submit proposal" : "Confirm"}
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

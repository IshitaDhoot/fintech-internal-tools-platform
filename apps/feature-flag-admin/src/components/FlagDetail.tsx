"use client";

import { Lock } from "lucide-react";
import { flagEnvTone, flagStateTone, StatusBadge } from "@repo/ui";
import { Role } from "@repo/rbac";
import {
  isHighRiskEnv,
  type FlagAction,
  type FlagEnvironment,
  type FlagState,
} from "@repo/rbac/flags";
import { FlagActions } from "@/components/FlagActions";
import { RolloutMeter } from "@/components/RolloutMeter";
import { AuditTrail, type AuditEntryData } from "@/components/AuditTrail";

export interface FlagDetailData {
  id: string;
  key: string;
  description: string;
  environment: FlagEnvironment;
  state: FlagState;
  rolloutPercentage: number;
  ownerEmail: string;
  updatedAt: string;
}

export type { AuditEntryData };

interface Props {
  flag: FlagDetailData;
  auditLogs: AuditEntryData[];
  role: Role;
  actions: FlagAction[];
  onMutationComplete?: () => void;
}

export function FlagDetail({
  flag,
  auditLogs,
  role,
  actions,
  onMutationComplete,
}: Props) {
  const prod = isHighRiskEnv(flag.environment);
  const readOnly = prod && role === Role.STANDARD && flag.state !== "archived";

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-xl font-semibold">{flag.key}</h1>
        <StatusBadge tone={flagStateTone(flag.state)}>{flag.state}</StatusBadge>
        <StatusBadge tone={flagEnvTone(flag.environment)}>
          {flag.environment}
        </StatusBadge>
        {readOnly && (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-purple-600 px-2.5 py-1 text-xs font-semibold text-white">
            <Lock className="h-3.5 w-3.5" /> Requires Admin
          </span>
        )}
        {flag.state === "archived" && (
          <span className="rounded-md bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600">
            Archived — read only
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Flag Metadata
          </h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div className="col-span-2">
              <dt className="text-slate-500">Description</dt>
              <dd className="font-medium">{flag.description}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Environment</dt>
              <dd className="font-medium">{flag.environment}</dd>
            </div>
            <div>
              <dt className="text-slate-500">State</dt>
              <dd className="font-medium">{flag.state}</dd>
            </div>
            <div className="col-span-2">
              <dt className="mb-1 text-slate-500">Rollout</dt>
              <dd>
                <RolloutMeter
                  value={flag.rolloutPercentage}
                  muted={flag.state !== "enabled"}
                />
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Owner</dt>
              <dd className="font-medium">{flag.ownerEmail}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Last updated</dt>
              <dd className="font-medium">
                {new Date(flag.updatedAt).toLocaleString()}
              </dd>
            </div>
          </dl>
        </section>

        <div className="space-y-6">
          <FlagActions
            flagId={flag.id}
            environment={flag.environment}
            state={flag.state}
            rolloutPercentage={flag.rolloutPercentage}
            role={role}
            actions={actions}
            onComplete={onMutationComplete}
          />
          <AuditTrail entries={auditLogs} />
        </div>
      </div>
    </div>
  );
}

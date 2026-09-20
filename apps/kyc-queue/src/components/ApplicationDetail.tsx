"use client";

import { FileWarning } from "lucide-react";
import { StatusBadge } from "@repo/ui";
import { Can } from "@repo/rbac/client";
import { isTerminal, Role, type Action, type AppStatus } from "@repo/rbac";
import { RISK_LABELS, RISK_TONES, riskLevel, statusTone } from "@/lib/format";
import { ReviewActions } from "@/components/ReviewActions";
import { DocumentPanel } from "@/components/DocumentPanel";
import { AuditTrail } from "@/components/AuditTrail";

export interface ApplicationDetailData {
  id: string;
  fullName: string;
  email: string;
  riskScore: number;
  status: AppStatus;
  ssnLast4: string;
  submittedAt: string;
  dateOfBirth: string;
  address: string;
  idDocument: string;
}

export interface AuditEntryData {
  id: string;
  actorEmail: string;
  actorRole: string;
  previousState: string;
  newState: string;
  reason: string | null;
  timestamp: string;
}

interface Props {
  app: ApplicationDetailData;
  auditLogs: AuditEntryData[];
  role: Role;
  actions: Action[];
  onTransitionComplete?: () => void;
}

export function ApplicationDetail({
  app,
  auditLogs,
  role,
  actions,
  onTransitionComplete,
}: Props) {
  const status = app.status;
  const risk = riskLevel(app.riskScore);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">{app.fullName}</h1>
        <StatusBadge tone={statusTone(status)}>{status}</StatusBadge>
        <StatusBadge tone={RISK_TONES[risk]}>
          Risk {app.riskScore} · {RISK_LABELS[risk]}
        </StatusBadge>
        {status === "FLAGGED" && role === Role.STANDARD && (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-purple-600 px-2.5 py-1 text-xs font-semibold text-white">
            <FileWarning className="h-3.5 w-3.5" /> Requires Admin Review
          </span>
        )}
        {isTerminal(status) && (
          <span className="rounded-md bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600">
            Terminal state
            <Can role={role} allow={[Role.ADMIN]} fallback=" — read only">
              {" — admin override available"}
            </Can>
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Applicant Metadata
            </h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Full name</dt>
                <dd className="font-medium">{app.fullName}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Email</dt>
                <dd className="font-medium">{app.email}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Date of birth</dt>
                <dd className="font-medium">{app.dateOfBirth}</dd>
              </div>
              <div>
                <dt className="text-slate-500">SSN (last 4)</dt>
                <dd className="font-medium">•••-{app.ssnLast4}</dd>
              </div>
              <div>
                <dt className="text-slate-500">ID document</dt>
                <dd className="font-medium">{app.idDocument}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Submitted</dt>
                <dd className="font-medium">
                  {new Date(app.submittedAt).toLocaleString()}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-slate-500">Address</dt>
                <dd className="font-medium">{app.address}</dd>
              </div>
            </dl>
          </section>

          <DocumentPanel
            fullName={app.fullName}
            dateOfBirth={app.dateOfBirth}
            address={app.address}
            ssnLast4={app.ssnLast4}
            idDocument={app.idDocument}
          />
        </div>

        <div className="space-y-6">
          <ReviewActions
            applicationId={app.id}
            status={status}
            role={role}
            actions={actions}
            onComplete={onTransitionComplete}
          />
          <AuditTrail entries={auditLogs} />
        </div>
      </div>
    </div>
  );
}

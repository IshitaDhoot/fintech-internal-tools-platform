"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  ApplicationDetail,
  type ApplicationDetailData,
  type AuditEntryData,
} from "@/components/ApplicationDetail";
import type { Action, Role } from "@/lib/rbac";

interface DetailResponse {
  application: ApplicationDetailData;
  auditLogs: AuditEntryData[];
  role: Role;
  actions: Action[];
}

interface Props {
  applicationId: string;
  onClose: () => void;
}

export function ApplicationDetailModal({ applicationId, onClose }: Props) {
  const [data, setData] = useState<DetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    fetch(`/api/applications/${applicationId}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        return res.json();
      })
      .then((d: DetailResponse) => {
        if (!cancelled) setData(d);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [applicationId, version]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const refetch = useCallback(() => setVersion((v) => v + 1), []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-slate-100 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Application Review
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <p className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</p>
        )}
        {!error && !data && (
          <p className="p-8 text-center text-sm text-slate-500">Loading…</p>
        )}
        {data && (
          <ApplicationDetail
            app={data.application}
            auditLogs={data.auditLogs}
            role={data.role}
            actions={data.actions}
            onTransitionComplete={refetch}
          />
        )}
      </div>
    </div>
  );
}

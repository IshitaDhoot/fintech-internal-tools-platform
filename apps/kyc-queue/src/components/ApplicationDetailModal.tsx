"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@repo/ui";
import {
  ApplicationDetail,
  type ApplicationDetailData,
  type AuditEntryData,
} from "@/components/ApplicationDetail";
import type { Action, Role } from "@repo/rbac";

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

  const refetch = useCallback(() => setVersion((v) => v + 1), []);

  return (
    <Modal title="Application Review" onClose={onClose} className="max-w-5xl">
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
    </Modal>
  );
}

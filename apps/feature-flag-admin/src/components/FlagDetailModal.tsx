"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@repo/ui";
import { FlagDetail, type FlagDetailData, type AuditEntryData } from "@/components/FlagDetail";
import type { Role } from "@repo/rbac";
import type { FlagAction } from "@repo/rbac/flags";

interface DetailResponse {
  flag: FlagDetailData;
  auditLogs: AuditEntryData[];
  role: Role;
  actions: FlagAction[];
}

interface Props {
  flagId: string;
  onClose: () => void;
}

export function FlagDetailModal({ flagId, onClose }: Props) {
  const [data, setData] = useState<DetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    fetch(`/api/flags/${flagId}`)
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
  }, [flagId, version]);

  const refetch = useCallback(() => setVersion((v) => v + 1), []);

  return (
    <Modal title="Feature Flag Detail" onClose={onClose} className="max-w-5xl">
      {error && (
        <p className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</p>
      )}
      {!error && !data && (
        <p className="p-8 text-center text-sm text-slate-500">Loading…</p>
      )}
      {data && (
        <FlagDetail
          flag={data.flag}
          auditLogs={data.auditLogs}
          role={data.role}
          actions={data.actions}
          onMutationComplete={refetch}
        />
      )}
    </Modal>
  );
}

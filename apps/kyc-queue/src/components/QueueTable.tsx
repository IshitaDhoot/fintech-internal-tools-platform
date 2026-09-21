"use client";

import { useState } from "react";
import { appStatusTone, DataTable, SeverityBadge, StatusBadge } from "@repo/ui";
import type { DataTableColumn, DataTableFilter } from "@repo/ui";
import type { AppStatus } from "@repo/rbac";
import { RISK_LABELS, riskLevel } from "@/lib/format";
import { ApplicationDetailModal } from "@/components/ApplicationDetailModal";

export interface QueueRow {
  id: string;
  fullName: string;
  email: string;
  riskScore: number;
  status: AppStatus;
  submittedAt: string;
}

const STATUS_OPTIONS: AppStatus[] = ["PENDING", "FLAGGED", "APPROVED", "REJECTED"];

const STATUS_FILTER: DataTableFilter<QueueRow> = {
  key: "status",
  allLabel: "All statuses",
  options: STATUS_OPTIONS,
  value: (r) => r.status,
};

export function QueueTable({ rows }: { rows: QueueRow[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const columns: DataTableColumn<QueueRow>[] = [
    {
      key: "fullName",
      header: "Applicant",
      csvHeader: "Full Name",
      sortable: true,
      firstSortDirection: "asc",
      sortValue: (r) => r.fullName,
      csvValue: (r) => r.fullName,
      cell: (r) => (
        <button
          onClick={() => setSelectedId(r.id)}
          className="font-medium text-indigo-700 hover:underline"
        >
          {r.fullName}
        </button>
      ),
    },
    {
      key: "email",
      header: "Email",
      csvHeader: "Email",
      csvValue: (r) => r.email,
      cellClassName: "px-4 py-3 text-slate-600",
      cell: (r) => r.email,
    },
    {
      key: "riskScore",
      header: "Risk Score",
      csvHeader: "Risk Score",
      sortable: true,
      firstSortDirection: "desc",
      sortValue: (r) => r.riskScore,
      csvValue: (r) => String(r.riskScore),
      cell: (r) => {
        const risk = riskLevel(r.riskScore);
        return (
          <SeverityBadge level={risk}>
            {r.riskScore} · {RISK_LABELS[risk]}
          </SeverityBadge>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      csvHeader: "Status",
      csvValue: (r) => r.status,
      cell: (r) => (
        <StatusBadge tone={appStatusTone(r.status)}>{r.status}</StatusBadge>
      ),
    },
    {
      key: "submittedAt",
      header: "Submitted",
      csvHeader: "Submitted At",
      sortable: true,
      firstSortDirection: "desc",
      sortValue: (r) => r.submittedAt,
      csvValue: (r) => r.submittedAt,
      cellClassName: "px-4 py-3 text-slate-600",
      cell: (r) => new Date(r.submittedAt).toLocaleDateString(),
    },
  ];

  return (
    <>
      <DataTable
        rows={rows}
        columns={columns}
        getRowKey={(r) => r.id}
        searchPlaceholder="Search name or email"
        searchText={(r) => `${r.fullName} ${r.email}`}
        filters={[STATUS_FILTER]}
        defaultSort={{ key: "submittedAt", direction: "desc" }}
        csvFilename={`kyc-queue-${new Date().toISOString().slice(0, 10)}.csv`}
        emptyMessage="No applications match the current filters."
      />
      {selectedId && (
        <ApplicationDetailModal
          applicationId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
}

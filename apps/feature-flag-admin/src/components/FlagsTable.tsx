"use client";

import { useState } from "react";
import { DataTable, StatusBadge } from "@repo/ui";
import type { DataTableColumn, DataTableFilter } from "@repo/ui";
import type { FlagEnvironment, FlagState } from "@repo/rbac/flags";
import { flagEnvTone, flagStateTone } from "@/lib/format";
import { RolloutMeter } from "@/components/RolloutMeter";
import { FlagDetailModal } from "@/components/FlagDetailModal";

export interface FlagRow {
  id: string;
  key: string;
  description: string;
  environment: FlagEnvironment;
  state: FlagState;
  rolloutPercentage: number;
  ownerEmail: string;
  updatedAt: string;
}

const ENV_FILTER: DataTableFilter<FlagRow> = {
  key: "environment",
  allLabel: "All environments",
  options: ["dev", "staging", "prod"],
  value: (r) => r.environment,
};

const STATE_FILTER: DataTableFilter<FlagRow> = {
  key: "state",
  allLabel: "All states",
  options: ["enabled", "disabled", "archived"],
  value: (r) => r.state,
};

export function FlagsTable({ rows }: { rows: FlagRow[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const columns: DataTableColumn<FlagRow>[] = [
    {
      key: "key",
      header: "Flag Key",
      csvHeader: "Key",
      sortable: true,
      firstSortDirection: "asc",
      sortValue: (r) => r.key,
      csvValue: (r) => r.key,
      cell: (r) => (
        <button
          onClick={() => setSelectedId(r.id)}
          className="font-medium text-indigo-700 hover:underline"
        >
          {r.key}
        </button>
      ),
    },
    {
      key: "description",
      header: "Description",
      csvHeader: "Description",
      csvValue: (r) => r.description,
      cellClassName: "px-4 py-3 text-slate-600 max-w-xs truncate",
      cell: (r) => r.description,
    },
    {
      key: "environment",
      header: "Environment",
      csvHeader: "Environment",
      sortable: true,
      sortValue: (r) => r.environment,
      csvValue: (r) => r.environment,
      cell: (r) => (
        <StatusBadge tone={flagEnvTone(r.environment)}>{r.environment}</StatusBadge>
      ),
    },
    {
      key: "state",
      header: "State",
      csvHeader: "State",
      sortable: true,
      sortValue: (r) => r.state,
      csvValue: (r) => r.state,
      cell: (r) => <StatusBadge tone={flagStateTone(r.state)}>{r.state}</StatusBadge>,
    },
    {
      key: "rolloutPercentage",
      header: "Rollout",
      csvHeader: "Rollout %",
      sortable: true,
      firstSortDirection: "desc",
      sortValue: (r) => r.rolloutPercentage,
      csvValue: (r) => String(r.rolloutPercentage),
      cell: (r) => <RolloutMeter value={r.rolloutPercentage} />,
    },
    {
      key: "ownerEmail",
      header: "Owner",
      csvHeader: "Owner Email",
      csvValue: (r) => r.ownerEmail,
      cellClassName: "px-4 py-3 text-slate-600",
      cell: (r) => r.ownerEmail,
    },
    {
      key: "updatedAt",
      header: "Updated",
      csvHeader: "Updated At",
      sortable: true,
      firstSortDirection: "desc",
      sortValue: (r) => r.updatedAt,
      csvValue: (r) => r.updatedAt,
      cellClassName: "px-4 py-3 text-slate-600",
      cell: (r) => new Date(r.updatedAt).toLocaleDateString(),
    },
  ];

  return (
    <>
      <DataTable
        rows={rows}
        columns={columns}
        getRowKey={(r) => r.id}
        searchPlaceholder="Search key, description or owner"
        searchText={(r) => `${r.key} ${r.description} ${r.ownerEmail}`}
        filters={[ENV_FILTER, STATE_FILTER]}
        defaultSort={{ key: "updatedAt", direction: "desc" }}
        csvFilename={`feature-flags-${new Date().toISOString().slice(0, 10)}.csv`}
        emptyMessage="No flags match the current filters."
      />
      {selectedId && (
        <FlagDetailModal flagId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </>
  );
}

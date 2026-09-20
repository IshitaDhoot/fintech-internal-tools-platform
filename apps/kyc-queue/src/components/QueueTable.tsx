"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  Search,
} from "lucide-react";
import {
  RISK_LABELS,
  RISK_STYLES,
  STATUS_STYLES,
  riskLevel,
} from "@/lib/format";
import { ApplicationDetailModal } from "@/components/ApplicationDetailModal";
import type { AppStatus } from "@/lib/rbac";

export interface QueueRow {
  id: string;
  fullName: string;
  email: string;
  riskScore: number;
  status: AppStatus;
  submittedAt: string;
}

type SortKey = "fullName" | "riskScore" | "submittedAt";
type SortDir = "asc" | "desc";

const STATUS_OPTIONS: Array<AppStatus | "ALL"> = [
  "ALL",
  "PENDING",
  "FLAGGED",
  "APPROVED",
  "REJECTED",
];

function toCsv(rows: QueueRow[]): string {
  const header = ["ID", "Full Name", "Email", "Risk Score", "Status", "Submitted At"];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [r.id, r.fullName, r.email, String(r.riskScore), r.status, r.submittedAt]
      .map(escape)
      .join(",")
  );
  return [header.map(escape).join(","), ...lines].join("\n");
}

export function QueueTable({ rows }: { rows: QueueRow[] }) {
  const [status, setStatus] = useState<AppStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("submittedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = rows.filter(
      (r) =>
        (status === "ALL" || r.status === status) &&
        (!q ||
          r.fullName.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q))
    );
    out.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "fullName") cmp = a.fullName.localeCompare(b.fullName);
      else if (sortKey === "riskScore") cmp = a.riskScore - b.riskScore;
      else cmp = a.submittedAt.localeCompare(b.submittedAt);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return out;
  }, [rows, status, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "fullName" ? "asc" : "desc");
    }
  }

  function exportCsv() {
    const blob = new Blob([toCsv(filtered)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kyc-queue-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey !== k ? (
      <ArrowUpDown className="ml-1 inline h-3.5 w-3.5 text-slate-400" />
    ) : sortDir === "asc" ? (
      <ArrowUp className="ml-1 inline h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="ml-1 inline h-3.5 w-3.5" />
    );

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email"
            className="w-64 rounded-md border border-slate-300 py-1.5 pl-8 pr-3 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as AppStatus | "ALL")}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === "ALL" ? "All statuses" : s}
            </option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {filtered.length} of {rows.length} shown
          </span>
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Export to CSV
          </button>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">
              <button onClick={() => toggleSort("fullName")} className="font-medium">
                Applicant <SortIcon k="fullName" />
              </button>
            </th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">
              <button onClick={() => toggleSort("riskScore")} className="font-medium">
                Risk Score <SortIcon k="riskScore" />
              </button>
            </th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">
              <button onClick={() => toggleSort("submittedAt")} className="font-medium">
                Submitted <SortIcon k="submittedAt" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => {
            const risk = riskLevel(r.riskScore);
            return (
              <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <button
                    onClick={() => setSelectedId(r.id)}
                    className="font-medium text-indigo-700 hover:underline"
                  >
                    {r.fullName}
                  </button>
                </td>
                <td className="px-4 py-3 text-slate-600">{r.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${RISK_STYLES[risk]}`}
                  >
                    {r.riskScore} · {RISK_LABELS[risk]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[r.status]}`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {new Date(r.submittedAt).toLocaleDateString()}
                </td>
              </tr>
            );
          })}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                No applications match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {selectedId && (
        <ApplicationDetailModal
          applicationId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

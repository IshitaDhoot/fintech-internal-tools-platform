"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
} from "lucide-react";

export interface DataTableColumn<T> {
  key: string;
  /** Header cell content. */
  header: ReactNode;
  /** Plain-text header used in the CSV export. */
  csvHeader: string;
  cell: (row: T) => ReactNode;
  cellClassName?: string;
  /** Plain-text value used in the CSV export. */
  csvValue: (row: T) => string;
  sortable?: boolean;
  /** Comparable value used when sorting this column. */
  sortValue?: (row: T) => string | number;
  /** Direction applied the first time this column is sorted (default "asc"). */
  firstSortDirection?: "asc" | "desc";
}

export interface DataTableFilter<T> {
  key: string;
  allLabel: string;
  options: string[];
  value: (row: T) => string;
}

interface Props<T> {
  rows: T[];
  columns: DataTableColumn<T>[];
  getRowKey: (row: T) => string;
  /** Global search box: matched against the concatenated searchText. */
  searchPlaceholder?: string;
  searchText?: (row: T) => string;
  filters?: DataTableFilter<T>[];
  defaultSort?: { key: string; direction?: "asc" | "desc" };
  csvFilename: string;
  emptyMessage?: ReactNode;
  /** Rows per page; pagination chrome only appears when a page is needed. */
  pageSize?: number;
}

function escapeCsv(v: string) {
  return `"${v.replace(/"/g, '""')}"`;
}

export function DataTable<T>({
  rows,
  columns,
  getRowKey,
  searchPlaceholder = "Search",
  searchText,
  filters = [],
  defaultSort,
  csvFilename,
  emptyMessage = "No rows match the current filters.",
  pageSize = 20,
}: Props<T>) {
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | undefined>(defaultSort?.key);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(
    defaultSort?.direction ?? "asc"
  );
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = rows.filter(
      (r) =>
        filters.every((f) => {
          const v = filterValues[f.key];
          return !v || v === "ALL" || f.value(r) === v;
        }) &&
        (!q || (searchText ? searchText(r).toLowerCase().includes(q) : true))
    );
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      const sv = col?.sortValue;
      if (sv) {
        out.sort((a, b) => {
          const va = sv(a);
          const vb = sv(b);
          const cmp =
            typeof va === "number" && typeof vb === "number"
              ? va - vb
              : String(va).localeCompare(String(vb));
          return sortDir === "asc" ? cmp : -cmp;
        });
      }
    }
    return out;
  }, [rows, filters, filterValues, search, columns, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const paged =
    filtered.length > pageSize
      ? filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
      : filtered;

  function toggleSort(key: string) {
    const col = columns.find((c) => c.key === key);
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(col?.firstSortDirection ?? "asc");
    }
  }

  function exportCsv() {
    const csv = [
      columns.map((c) => escapeCsv(c.csvHeader)).join(","),
      ...filtered.map((r) =>
        columns.map((c) => escapeCsv(c.csvValue(r))).join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = csvFilename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const SortIcon = ({ k }: { k: string }) =>
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
        {searchText && (
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder={searchPlaceholder}
              className="w-64 rounded-md border border-slate-300 py-1.5 pl-8 pr-3 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
        )}
        {filters.map((f) => (
          <select
            key={f.key}
            value={filterValues[f.key] ?? "ALL"}
            onChange={(e) => {
              setFilterValues((v) => ({ ...v, [f.key]: e.target.value }));
              setPage(0);
            }}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            {["ALL", ...f.options].map((s) => (
              <option key={s} value={s}>
                {s === "ALL" ? f.allLabel : s}
              </option>
            ))}
          </select>
        ))}
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
            {columns.map((c) => (
              <th key={c.key} className="px-4 py-3">
                {c.sortable && c.sortValue ? (
                  <button onClick={() => toggleSort(c.key)} className="font-medium">
                    {c.header} <SortIcon k={c.key} />
                  </button>
                ) : (
                  c.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paged.map((r) => (
            <tr
              key={getRowKey(r)}
              className="border-b border-slate-100 hover:bg-slate-50"
            >
              {columns.map((c) => (
                <td key={c.key} className={c.cellClassName ?? "px-4 py-3"}>
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-slate-500"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {filtered.length > pageSize && (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
          <span>
            Page {currentPage + 1} of {pageCount}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 0}
              aria-label="Previous page"
              className="rounded-md border border-slate-300 p-1.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage >= pageCount - 1}
              aria-label="Next page"
              className="rounded-md border border-slate-300 p-1.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

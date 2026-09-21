import { History } from "lucide-react";
import { appStatusTone, StatusBadge } from "@repo/ui";

interface Entry {
  id: string;
  actorEmail: string;
  actorRole: string;
  previousState: string;
  newState: string;
  reason: string | null;
  timestamp: string;
}

export function AuditTrail({ entries }: { entries: Entry[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500">
        <History className="h-4 w-4" /> Audit Trail
      </h2>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-500">No audit entries yet.</p>
      ) : (
        <ol className="relative space-y-4 border-l border-slate-200 pl-4">
          {entries.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-indigo-500 ring-4 ring-white" />
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <StatusBadge tone={appStatusTone(e.previousState)} className="px-2">
                  {e.previousState}
                </StatusBadge>
                <span className="text-slate-400">→</span>
                <StatusBadge tone={appStatusTone(e.newState)} className="px-2">
                  {e.newState}
                </StatusBadge>
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                {e.actorEmail} ({e.actorRole}) ·{" "}
                {new Date(e.timestamp).toLocaleString()}
              </div>
              {e.reason && (
                <div className="mt-1 rounded bg-slate-50 px-2 py-1 text-xs text-slate-700">
                  “{e.reason}”
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

import type { ReactNode } from "react";

/**
 * Status/risk color tokens — defined once here and reused by every internal
 * tool, per the Internal Tooling Architectural Standards.
 */
export type StatusTone = "yellow" | "purple" | "green" | "red" | "slate" | "gray";

export const STATUS_TONE_STYLES: Record<StatusTone, string> = {
  yellow: "bg-yellow-100 text-yellow-800 ring-yellow-300",
  purple: "bg-purple-100 text-purple-800 ring-purple-300",
  green: "bg-green-100 text-green-800 ring-green-300",
  red: "bg-red-100 text-red-800 ring-red-300",
  slate: "bg-slate-100 text-slate-600 ring-slate-300",
  gray: "bg-gray-100 text-gray-600 ring-gray-300",
};

interface Props {
  tone: StatusTone;
  children: ReactNode;
  className?: string;
}

export function StatusBadge({ tone, children, className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_TONE_STYLES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

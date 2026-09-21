import type { ReactNode } from "react";

/**
 * Severity/magnitude ramp — the only place the traffic-light palette is used.
 * A filled tinted chip on a green → amber → red scale (e.g. a 0–100 risk
 * score). Never use this for categorical state; that is StatusBadge's job.
 */
export type SeverityLevel = "low" | "medium" | "high";

export const SEVERITY_STYLES: Record<SeverityLevel, string> = {
  low: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  medium: "bg-amber-100 text-amber-900 ring-amber-300",
  high: "bg-red-100 text-red-800 ring-red-300",
};

interface Props {
  level: SeverityLevel;
  children: ReactNode;
  className?: string;
}

export function SeverityBadge({ level, children, className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${SEVERITY_STYLES[level]} ${className}`}
    >
      {children}
    </span>
  );
}

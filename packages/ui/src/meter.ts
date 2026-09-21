/**
 * Meter tokens — neutral magnitude indicators (e.g. rollout percentage).
 * Deliberately separate from both status dot tones and the severity ramp:
 * a meter must never read as "on/healthy" or "at risk". The fill is a single
 * brand gray-blue; `fillMuted`/`labelMuted` apply when the underlying entity
 * is off/inactive (e.g. a disabled or archived flag).
 */
export const METER_STYLES = {
  track: "bg-slate-200",
  fill: "bg-slate-500",
  fillMuted: "bg-slate-300",
  label: "text-slate-600",
  labelMuted: "text-slate-400",
} as const;

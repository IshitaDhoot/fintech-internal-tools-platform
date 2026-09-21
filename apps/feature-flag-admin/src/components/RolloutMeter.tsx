import { METER_STYLES } from "@repo/ui";

/**
 * Rollout percentage rendered as a progress meter. The fill is the shared
 * neutral meter token — magnitude only, never a status hue. Pass `muted`
 * when the flag is disabled or archived so the meter can't read as "on".
 */
export function RolloutMeter({
  value,
  muted = false,
}: {
  value: number;
  muted?: boolean;
}) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-2 w-24 overflow-hidden rounded-full ${METER_STYLES.track}`}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full ${muted ? METER_STYLES.fillMuted : METER_STYLES.fill}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={`w-8 text-xs ${muted ? METER_STYLES.labelMuted : METER_STYLES.label}`}
      >
        {pct}%
      </span>
    </div>
  );
}

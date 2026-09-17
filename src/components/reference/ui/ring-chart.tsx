export interface RingSegment {
  label: string;
  value: number;
  /** Real CSS color value — same "reuse the pastel-foreground tokens" convention as TimeseriesChart. */
  color: string;
}

/**
 * Generic donut/ring — one or more proportional segments around a circle, inline SVG (same
 * "no charting library" convention as the line charts). Used for both a single-segment ring
 * against an implied whole (e.g. converted sales against total clicks) and a multi-segment
 * breakdown that fully accounts for the whole itself (e.g. pending/billed/paid earnings).
 *
 * `total` is optional and defaults to the segments' own sum — right for a breakdown where the
 * segments together ARE the whole. Pass it explicitly when they're not: a single "Converted"
 * segment against `total={clicksTotal}` draws just that colored arc over the plain pale base
 * track for "the rest", rather than the old approach of drawing a second, full-strength
 * "remaining" segment — which at 0% converted painted the entire ring solid black and read as
 * broken, not as "nothing here yet".
 */
export function RingChart({
  segments,
  total: totalProp,
  centerValue,
  centerLabel,
  size = 140,
  thickness = 18,
}: {
  segments: RingSegment[];
  total?: number;
  centerValue?: string;
  centerLabel?: string;
  size?: number;
  thickness?: number;
}) {
  const total = totalProp ?? segments.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let drawn = 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={thickness} opacity={0.15} />
        {total > 0 &&
          segments
            .filter((s) => s.value > 0)
            .map((s) => {
              const length = (s.value / total) * circumference;
              const dashoffset = -drawn;
              drawn += length;
              return (
                <circle
                  key={s.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={thickness}
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={dashoffset}
                />
              );
            })}
      </svg>
      {(centerValue || centerLabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {centerValue && <span className="font-[family-name:var(--font-heading)] text-lg font-semibold text-foreground">{centerValue}</span>}
          {centerLabel && <span className="text-xs text-muted-foreground">{centerLabel}</span>}
        </div>
      )}
    </div>
  );
}

/** Color-dot + label + value rows, meant to sit beside a RingChart using the same segments. */
export function RingLegend({ segments, format }: { segments: RingSegment[]; format: (value: number) => string }) {
  return (
    <ul className="space-y-2">
      {segments.map((s) => (
        <li key={s.label} className="flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
          <span className="text-muted-foreground">{s.label}</span>
          <span className="ml-auto font-medium text-foreground">{format(s.value)}</span>
        </li>
      ))}
    </ul>
  );
}

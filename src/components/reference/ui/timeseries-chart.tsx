"use client";

import { useState } from "react";

export interface TimeseriesSeries<K extends string = string> {
  key: K;
  label: string;
  /** A real CSS color value, not a Tailwind class — reuses the pastel-foreground tokens
   *  (globals.css) as line strokes, so lines stay theme-aware (dark in light mode, light in
   *  dark mode) for free, matching the pastel KPI cards above without inventing new tokens. */
  color: string;
  /** How to render this series' value in the hover tooltip — defaults to a plain number, pass
   *  this for anything in cents/percent/etc. so the tooltip doesn't show raw cent counts. */
  format?: (value: number) => string;
}

/**
 * Generic multi-line inline-SVG chart — same "no charting library for one chart" pattern as
 * sales-line-chart.tsx, generalized to N series sharing one axis. Hover reveals a tooltip (date +
 * every series' value at that point) via one invisible full-height hit-rect per data index rather
 * than pixel-tracking the cursor — index-based hit targets are simpler and don't need a
 * ResizeObserver to convert screen coordinates into the SVG's viewBox space. The tooltip itself is
 * positioned by percentage of the viewBox width, so it stays correctly placed regardless of how
 * wide the SVG is actually rendered.
 *
 * Generic over `T` (rather than `Record<string, number | string>`) on purpose: a concrete
 * interface like RealMerchantTimeseriesPoint has no index signature, so it isn't assignable to a
 * `Record<...>`-typed prop even though every field it needs is present — this sidesteps that.
 */
export function TimeseriesChart<T extends { date: string }>({ data, series }: { data: T[]; series: TimeseriesSeries<Exclude<keyof T, "date"> & string>[] }) {
  const width = 640;
  const height = 220;
  const padding = { top: 12, right: 12, bottom: 24, left: 12 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const allValues = series.flatMap((s) => data.map((d) => Number(d[s.key]) || 0));
  const max = Math.max(1, ...allValues);
  const stepX = data.length > 1 ? innerWidth / (data.length - 1) : 0;
  const hasAnyData = allValues.some((v) => v > 0);

  function xFor(i: number) {
    return padding.left + i * stepX;
  }
  function yFor(value: number) {
    return padding.top + innerHeight - (value / max) * innerHeight;
  }
  function pathFor(key: Exclude<keyof T, "date"> & string) {
    return data.map((d, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(Number(d[key]) || 0)}`).join(" ");
  }

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  const hoverXPercent = hoverIndex !== null ? (xFor(hoverIndex) / width) * 100 : null;

  return (
    <div className="w-full">
      <div className="mb-3 flex flex-wrap items-center gap-4">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
            {s.label}
          </span>
        ))}
      </div>
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[220px] w-full min-w-[480px]"
          role="img"
          aria-label="Trend over time"
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Dashed baseline grid — minimal, matches sales-line-chart.tsx's own "no decorative elements" rule. */}
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <line
              key={f}
              x1={padding.left}
              y1={padding.top + innerHeight * (1 - f)}
              x2={width - padding.right}
              y2={padding.top + innerHeight * (1 - f)}
              stroke="var(--border)"
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.4}
            />
          ))}

          {hasAnyData &&
            series.map((s) => <path key={s.key} d={pathFor(s.key)} fill="none" stroke={s.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />)}

          {hoverIndex !== null && (
            <>
              <line x1={xFor(hoverIndex)} y1={padding.top} x2={xFor(hoverIndex)} y2={padding.top + innerHeight} stroke="var(--border)" strokeWidth={1} />
              {hasAnyData &&
                series.map((s) => (
                  <circle key={s.key} cx={xFor(hoverIndex)} cy={yFor(Number(data[hoverIndex][s.key]) || 0)} r={3.5} fill={s.color} stroke="var(--card)" strokeWidth={1.5} />
                ))}
            </>
          )}

          {data
            .map((d, i) => ({ d, i }))
            .filter(({ i }) => i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2))
            .map(({ d, i }) => (
              <text key={i} x={xFor(i)} y={height - 6} fontSize={10} fill="var(--muted-foreground-2)" textAnchor="middle">
                {d.date}
              </text>
            ))}

          {/* Invisible per-index hit targets, drawn last so they sit on top and catch the hover
              regardless of where the lines/grid happen to render underneath them. */}
          {data.map((_, i) => {
            const slotWidth = stepX || innerWidth;
            const x = Math.max(padding.left, xFor(i) - slotWidth / 2);
            return (
              <rect
                key={i}
                x={x}
                y={padding.top}
                width={slotWidth}
                height={innerHeight}
                fill="transparent"
                onMouseEnter={() => setHoverIndex(i)}
              />
            );
          })}
        </svg>

        {hovered && hoverXPercent !== null && (
          <div
            className="pointer-events-none absolute top-2 z-10 min-w-max -translate-x-1/2 rounded-[var(--radius-sm)] border-2 border-border bg-card px-3 py-2 text-xs shadow-brutal-sm"
            style={{ left: `${Math.min(88, Math.max(12, hoverXPercent))}%` }}
          >
            <p className="mb-1 font-medium text-foreground">{hovered.date}</p>
            {series.map((s) => {
              const value = Number(hovered[s.key]) || 0;
              return (
                <p key={s.key} className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
                  {s.label}: <span className="font-medium text-foreground">{s.format ? s.format(value) : value}</span>
                </p>
              );
            })}
          </div>
        )}
      </div>
      {!hasAnyData && <p className="mt-1 text-center text-xs text-muted-foreground-2">No activity in this period yet.</p>}
    </div>
  );
}

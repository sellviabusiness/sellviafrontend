"use client";

/**
 * Plain inline-SVG line chart — no charting library added for one chart (matches this codebase's
 * "no new architecture invented" pattern). Real data in, real path out: points are the actual
 * per-day sale totals from lib/merchant/store.ts's getDailySalesSeries, not a smoothed/faked curve.
 */
export function SalesLineChart({ data }: { data: { label: string; value: number }[] }) {
  const width = 560;
  const height = 200;
  const padding = { top: 12, right: 12, bottom: 24, left: 12 };
  const max = Math.max(1, ...data.map((d) => d.value)); // 1 floor avoids a divide-by-zero flatline

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const stepX = data.length > 1 ? innerWidth / (data.length - 1) : 0;

  const points = data.map((d, i) => {
    const x = padding.left + i * stepX;
    const y = padding.top + innerHeight - (d.value / max) * innerHeight;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? 0} ${padding.top + innerHeight} L ${points[0]?.x ?? 0} ${padding.top + innerHeight} Z`;

  const hasAnySales = data.some((d) => d.value > 0);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[200px] w-full min-w-[420px]" role="img" aria-label="Sales over time">
        {/* Baseline grid — one line, kept minimal per the design system's "no decorative elements". */}
        <line x1={padding.left} y1={padding.top + innerHeight} x2={width - padding.right} y2={padding.top + innerHeight} stroke="var(--color-border)" strokeWidth={1} />

        {hasAnySales && (
          <>
            <path d={areaPath} fill="var(--color-accent)" fillOpacity={0.08} stroke="none" />
            <path d={linePath} fill="none" stroke="var(--color-accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            {points.map((p) => (
              <circle key={p.label} cx={p.x} cy={p.y} r={2.5} fill="var(--color-accent)" />
            ))}
          </>
        )}

        {points
          .filter((_, i) => i === 0 || i === points.length - 1 || i === Math.floor(points.length / 2))
          .map((p) => (
            <text key={p.label} x={p.x} y={height - 6} fontSize={10} fill="var(--color-muted-foreground-2)" textAnchor="middle">
              {p.label}
            </text>
          ))}
      </svg>
      {!hasAnySales && <p className="mt-1 text-center text-xs text-muted-foreground-2">No sales in this period yet.</p>}
    </div>
  );
}

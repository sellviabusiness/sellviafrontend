// My interpretation of "the zeroed-metrics device" motif referenced in the
// task — unverified against the Design System doc (unreachable: private
// submodule, no bypass secret). A calm device frame with its metric rows
// all reading zero, monochrome outline, one small lime dot (accent used
// sparingly, per the design-tokens task). Swap this file out once the real
// asset/spec is readable — every consumer goes through EmptyState's
// `illustration` prop, so nothing else needs to change.
export function ZeroedMetricsIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 96 72"
      width="96"
      height="72"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect x="4" y="4" width="88" height="64" rx="10" className="stroke-border" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="2" className="fill-primary" />
      <g className="stroke-border" strokeWidth="1.5" strokeLinecap="round">
        <line x1="14" y1="30" x2="52" y2="30" />
        <line x1="14" y1="42" x2="52" y2="42" />
        <line x1="14" y1="54" x2="52" y2="54" />
      </g>
      <g className="fill-muted-foreground text-[9px]">
        <text x="82" y="33" textAnchor="end">0</text>
        <text x="82" y="45" textAnchor="end">0</text>
        <text x="82" y="57" textAnchor="end">0</text>
      </g>
    </svg>
  )
}

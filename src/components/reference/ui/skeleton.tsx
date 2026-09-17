import { cn } from "@/lib/utils";

/**
 * Base pulsing block, matching this design system's own tokens (border-2/radius/bg-foreground-5)
 * rather than the unrelated shadcn-scaffold `components/ui/skeleton.tsx` (kept as-is — that one
 * backs `app/loading.tsx`'s route-transition fallback, a different concern from these per-view
 * "still fetching" states). `aria-hidden` — the composed skeletons below carry the one
 * `role="status"`/live-region announcement for their whole group; a bare `<Skeleton>` used
 * standalone should get its own if it's the only loading signal on the page.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-[var(--radius-sm)] bg-foreground/10", className)} />;
}

/** KPI-row shape — label line + big value line inside a real card outline, instead of one flat
 *  pulsing rectangle. Matches StatCard's own layout so the swap-in doesn't jump. */
export function SkeletonStatGrid({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("grid grid-cols-2 gap-4 lg:grid-cols-5", className)}>
      <span className="sr-only">Loading…</span>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-[var(--radius-md)] border-2 border-border bg-card p-5">
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-6 w-1/2" />
        </div>
      ))}
    </div>
  );
}

/** Thumbnail-card-list shape — matches the offer/application/sale "image + two text lines" row
 *  pattern used across every real-mode list this session, instead of one flat pulsing rectangle. */
export function SkeletonRows({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("space-y-3", className)}>
      <span className="sr-only">Loading…</span>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-[var(--radius-md)] border-2 border-border bg-card p-5">
          <Skeleton className="h-14 w-14 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Plain table-row shape — for screens that render an actual `<table>` rather than a card list. */
export function SkeletonTableRows({ count = 5, columns = 4, className }: { count?: number; columns?: number; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("overflow-hidden rounded-[var(--radius-md)] border-2 border-border", className)}>
      <span className="sr-only">Loading…</span>
      {Array.from({ length: count }).map((_, row) => (
        <div key={row} className="flex items-center gap-6 border-b-2 border-border p-4 last:border-0">
          {Array.from({ length: columns }).map((_, col) => (
            <Skeleton key={col} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** One detail-page card — header line + a couple of body lines. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("space-y-3 rounded-[var(--radius-md)] border-2 border-border bg-card p-6", className)}>
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

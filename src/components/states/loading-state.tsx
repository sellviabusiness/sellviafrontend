import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * role="status" + aria-live="polite" + sr-only text: the skeleton bars
 * themselves are purely visual (aria-hidden), so without this a screen
 * reader user gets no "loading" announcement at all — WCAG 4.1.3 (Status
 * Messages) territory, same reasoning as the error/AI-assist live regions.
 */
export function SkeletonRows({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex flex-col gap-2", className)}>
      <span className="sr-only">Loading…</span>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} aria-hidden="true" className="h-4 w-full" />
      ))}
    </div>
  )
}

/** One card-shaped skeleton — grid/card loading. See SkeletonRows for the live-region reasoning. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col gap-3 rounded-xl border border-border p-4", className)}
    >
      <span className="sr-only">Loading…</span>
      <Skeleton aria-hidden="true" className="h-4 w-1/3" />
      <Skeleton aria-hidden="true" className="h-3 w-full" />
      <Skeleton aria-hidden="true" className="h-3 w-2/3" />
    </div>
  )
}

/**
 * Wrap real content in this once it replaces a skeleton, so the swap fades
 * rather than pops — restrained-animation rule (globals.css): 150ms, fade
 * only, no scale/bounce. Reuses tw-animate-css's animate-in/fade-in, same
 * utilities already used for dialog/dropdown/select entrances. Respects
 * prefers-reduced-motion globally (globals.css), no extra work needed here.
 */
export function FadeIn({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("animate-in fade-in duration-150", className)}>{children}</div>
}

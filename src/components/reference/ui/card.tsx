import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Content card, neo-brutalist pass (2026-09-10): 2px border + hard offset shadow instead of a
 *  thin hairline with no shadow — the single biggest lever for the new look, since nearly every
 *  surface in the app (StatCard, EmptyState, ConfirmDialog, ...) is built on this one component. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border-2 border-border bg-card p-8 shadow-brutal-sm",
        className,
      )}
      {...props}
    />
  );
}

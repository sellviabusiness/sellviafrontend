import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Status indicator, distinct from Badge (badge.tsx) — always a dot + label, one
// fixed color per state. Same tint-bg/full-strength-text/thin-border pattern as
// --destructive elsewhere (button.tsx, badge.tsx): never a solid fill.
const statusBadgeVariants = cva(
  "inline-flex h-5 w-fit shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      status: {
        neutral: "border-border bg-muted text-muted-foreground",
        info: "border-info/20 bg-info/10 text-info",
        success: "border-success/20 bg-success/10 text-success",
        warning: "border-warning/20 bg-warning/10 text-warning",
        error: "border-destructive/20 bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: {
      status: "neutral",
    },
  }
)

function StatusBadge({
  className,
  status = "neutral",
  pulse = false,
  children,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof statusBadgeVariants> & {
    /** Subtle pulse for an in-progress/live state. Stripped for prefers-reduced-motion (globals.css). */
    pulse?: boolean
  }) {
  return (
    <span
      data-slot="status-badge"
      data-status={status}
      className={cn(statusBadgeVariants({ status }), className)}
      {...props}
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full bg-current",
          pulse && "animate-pulse"
        )}
        aria-hidden="true"
      />
      {children}
    </span>
  )
}

export { StatusBadge, statusBadgeVariants }

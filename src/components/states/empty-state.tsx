import type { ReactNode } from "react"

import { ZeroedMetricsIllustration } from "./zeroed-metrics-illustration"

/**
 * Calm empty state — no illustration override needed for the common case
 * ("no offers yet", "no sales yet", "nothing here"): it echoes the
 * zeroed-metrics device motif by default. Pass `illustration={null}` to omit
 * entirely, or a different node for a section that genuinely needs its own.
 */
export function EmptyState({
  title,
  description,
  action,
  illustration,
}: {
  title: string
  description?: string
  action?: ReactNode
  illustration?: ReactNode | null
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      {illustration === null ? null : (illustration ?? <ZeroedMetricsIllustration />)}
      <div className="flex flex-col gap-1">
        <p className="font-heading text-sm font-medium text-foreground">{title}</p>
        {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

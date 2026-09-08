import type { ReactNode } from "react"
import { OctagonXIcon } from "lucide-react"

/**
 * Calm, specific, actionable error panel — never a raw stack trace, never
 * the bare phrase "something went wrong". `title` should already be
 * user-safe copy (ApiErrorState below supplies it from ApiError.uiMessage);
 * this component never touches error.message/stack itself. `code`, if
 * given, is a machine reference shown small/muted — enough to mention to
 * support without exposing internals.
 */
export function ErrorState({
  title,
  description,
  code,
  action,
}: {
  title: string
  description?: string
  code?: string
  action?: ReactNode
}) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-12 text-center">
      <OctagonXIcon className="size-6 text-destructive" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="font-heading text-sm font-medium text-foreground">{title}</p>
        {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
      {code && <p className="text-xs text-muted-foreground">Reference: {code}</p>}
    </div>
  )
}

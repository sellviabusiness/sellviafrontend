"use client"

import { ApiError } from "@/lib/api/errors"
import { Button } from "@/components/ui/button"
import { ErrorState } from "./error-state"

/**
 * The primary error-rendering path for expected API failures: catch the
 * ApiError where the fetch happens (Server Component/Action) and render
 * this — its uiMessage/code are already the actionable copy computed in
 * lib/api/errors.ts (status-band fallback, or a real per-code override once
 * API-CONTRACT-SHEET is readable). Not for unexpected render exceptions —
 * see app/error.tsx for that (last resort, generic by necessity: Next
 * redacts thrown Server Component error messages in production, so there's
 * no real copy to show there anyway).
 */
export function ApiErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const apiError = error instanceof ApiError ? error : null

  return (
    <ErrorState
      title={apiError?.uiMessage ?? "This didn't load."}
      code={apiError?.code}
      action={
        onRetry && (
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        )
      }
    />
  )
}

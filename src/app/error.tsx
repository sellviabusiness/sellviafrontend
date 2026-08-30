"use client"

import { OctagonXIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

// Last-resort fallback for an uncaught render exception in this segment —
// not the path for expected API failures (catch those at the call site,
// render ApiErrorState with the real uiMessage instead). This can't show
// real error copy even if it wanted to: this Next version redacts
// error.message for exceptions thrown in Server Components once in
// production, forwarding only error.digest to match server logs (see
// node_modules/next/dist/docs/.../file-conventions/error.md). `retry`, not
// `reset`, is this version's primary recovery prop — same doc.
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  return (
    <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
      <OctagonXIcon className="size-6 text-destructive" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="font-heading text-sm font-medium text-foreground">This page hit a snag</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Try again — if it keeps happening, mention the reference below.
        </p>
      </div>
      <Button onClick={() => retry()}>Try again</Button>
      {error.digest && <p className="text-xs text-muted-foreground">Reference: {error.digest}</p>}
    </div>
  )
}

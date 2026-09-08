"use client"

import { useState, useTransition } from "react"
import { SparklesIcon, Loader2Icon } from "lucide-react"

import { ApiError } from "@/lib/api/errors"
import { draftCopyAction } from "@/lib/ai/actions"
import type { CopyAssistContext } from "@/lib/ai/types"
import { Button } from "@/components/ui/button"

/**
 * "Draft with AI" trigger for a text field — calls the copy-assist action,
 * hands the result to `onDraft` (caller decides how to insert it: replace,
 * append, show as a suggestion to accept). Always labeled: AI output isn't
 * presented as if a person wrote it.
 */
export function CopyAssistButton({
  context,
  onDraft,
}: {
  context: CopyAssistContext
  onDraft: (text: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      try {
        const text = await draftCopyAction(context)
        onDraft(text)
      } catch (err) {
        setError(err instanceof ApiError ? err.uiMessage : "Couldn't draft that right now.")
      }
    })
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
        {isPending ? (
          <Loader2Icon className="animate-spin" aria-hidden="true" />
        ) : (
          <SparklesIcon aria-hidden="true" />
        )}
        Draft with AI
      </Button>
      {isPending && (
        <span role="status" aria-live="polite" className="sr-only">
          Drafting…
        </span>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <p className="text-xs text-muted-foreground">AI-drafted — review before using.</p>
    </div>
  )
}
